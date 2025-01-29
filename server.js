require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const NOTEPADS_FILE = path.join(DATA_DIR, 'notepads.json');
const PIN = process.env.DUMBPAD_PIN;
const COOKIE_NAME = process.env.COOKIE_NAME;
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Brute force protection
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

// Reset attempts for an IP
function resetAttempts(ip) {
    loginAttempts.delete(ip);
}

// Check if an IP is locked out
function isLockedOut(ip) {
    const attempts = loginAttempts.get(ip);
    if (!attempts) return false;
    
    if (attempts.count >= MAX_ATTEMPTS) {
        const timeElapsed = Date.now() - attempts.lastAttempt;
        if (timeElapsed < LOCKOUT_TIME) {
            return true;
        }
        resetAttempts(ip);
    }
    return false;
}

// Record an attempt for an IP
function recordAttempt(ip) {
    const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    attempts.count += 1;
    attempts.lastAttempt = Date.now();
    loginAttempts.set(ip, attempts);
}

// Cleanup old lockouts periodically
setInterval(() => {
    const now = Date.now();
    for (const [ip, attempts] of loginAttempts.entries()) {
        if (now - attempts.lastAttempt >= LOCKOUT_TIME) {
            loginAttempts.delete(ip);
        }
    }
}, 60000); // Clean up every minute

// Validate PIN format
function isValidPin(pin) {
    return typeof pin === 'string' && /^\d{4,10}$/.test(pin);
}

// Constant-time string comparison to prevent timing attacks
function secureCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }
    
    // Use Node's built-in constant-time comparison
    try {
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch (err) {
        return false;
    }
}

app.use(cors({
    credentials: true,
    origin: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public', {
    index: false
}));

// Main app route with PIN check
app.get('/', (req, res) => {
    const pin = process.env.DUMBPAD_PIN;
    
    // Skip PIN if not configured
    if (!pin || !isValidPin(pin)) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }

    // Check PIN cookie
    const authCookie = req.cookies[COOKIE_NAME];
    if (!authCookie || !secureCompare(authCookie, pin)) {
        return res.redirect('/login');
    }

    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login page route
app.get('/login', (req, res) => {
    // If no PIN is required or user is already authenticated, redirect to main app
    const pin = process.env.DUMBPAD_PIN;
    if (!pin || !isValidPin(pin) || (req.cookies[COOKIE_NAME] && secureCompare(req.cookies[COOKIE_NAME], pin))) {
        return res.redirect('/');
    }
    
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Pin verification endpoint
app.post('/api/verify-pin', (req, res) => {
    const { pin } = req.body;
    
    // If no PIN is set in env, always return success
    if (!PIN) {
        return res.json({ success: true });
    }

    const ip = req.ip;
    
    // Check if IP is locked out
    if (isLockedOut(ip)) {
        const attempts = loginAttempts.get(ip);
        const timeLeft = Math.ceil((LOCKOUT_TIME - (Date.now() - attempts.lastAttempt)) / 1000 / 60);
        return res.status(429).json({ 
            error: `Too many attempts. Please try again in ${timeLeft} minutes.`
        });
    }

    // Validate PIN format
    if (!isValidPin(pin)) {
        recordAttempt(ip);
        return res.status(400).json({ success: false, error: 'Invalid PIN format' });
    }

    // Verify the PIN using constant-time comparison
    if (pin && secureCompare(pin, PIN)) {
        // Reset attempts on successful login
        resetAttempts(ip);

        // Set secure HTTP-only cookie
        res.cookie(COOKIE_NAME, pin, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: COOKIE_MAX_AGE
        });
        res.json({ success: true });
    } else {
        // Record failed attempt
        recordAttempt(ip);
        
        const attempts = loginAttempts.get(ip);
        const attemptsLeft = MAX_ATTEMPTS - attempts.count;
        
        res.status(401).json({ 
            success: false, 
            error: 'Invalid PIN',
            attemptsLeft: Math.max(0, attemptsLeft)
        });
    }
});

// Check if PIN is required
app.get('/api/pin-required', (req, res) => {
    res.json({ 
        required: !!PIN && isValidPin(PIN),
        length: PIN ? PIN.length : 0
    });
});

// Pin protection middleware
const requirePin = (req, res, next) => {
    if (!PIN || !isValidPin(PIN)) {
        return next();
    }

    const authCookie = req.cookies[COOKIE_NAME];
    if (!authCookie || !secureCompare(authCookie, PIN)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Apply pin protection to all /api routes except pin verification
app.use('/api', (req, res, next) => {
    if (req.path === '/verify-pin' || req.path === '/pin-required') {
        return next();
    }
    requirePin(req, res, next);
});

// Ensure data directory exists
async function ensureDataDir() {
    try {
        // Create data directory if it doesn't exist
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        // Create notepads.json if it doesn't exist
        try {
            await fs.access(NOTEPADS_FILE);
            // If file exists, validate its structure
            const content = await fs.readFile(NOTEPADS_FILE, 'utf8');
            try {
                const data = JSON.parse(content);
                if (!data.notepads || !Array.isArray(data.notepads)) {
                    throw new Error('Invalid notepads structure');
                }
            } catch (err) {
                console.error('Invalid notepads.json, recreating:', err);
                await fs.writeFile(NOTEPADS_FILE, JSON.stringify({
                    notepads: [{ id: 'default', name: 'Default Notepad' }]
                }, null, 2));
            }
        } catch (err) {
            // File doesn't exist or can't be accessed, create it
            console.log('Creating new notepads.json');
            await fs.writeFile(NOTEPADS_FILE, JSON.stringify({
                notepads: [{ id: 'default', name: 'Default Notepad' }]
            }, null, 2));
        }

        // Ensure default notepad file exists
        const defaultNotePath = path.join(DATA_DIR, 'default.txt');
        try {
            await fs.access(defaultNotePath);
        } catch {
            await fs.writeFile(defaultNotePath, '');
        }
    } catch (err) {
        console.error('Error initializing data directory:', err);
        throw err;
    }
}

// Get list of notepads
app.get('/api/notepads', async (req, res) => {
    try {
        await ensureDataDir();
        const data = await fs.readFile(NOTEPADS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Error reading notepads list' });
    }
});

// Create new notepad
app.post('/api/notepads', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(NOTEPADS_FILE, 'utf8'));
        const id = Date.now().toString();
        const newNotepad = {
            id,
            name: `Notepad ${data.notepads.length + 1}`
        };
        data.notepads.push(newNotepad);
        await fs.writeFile(NOTEPADS_FILE, JSON.stringify(data));
        await fs.writeFile(path.join(DATA_DIR, `${id}.txt`), '');
        res.json(newNotepad);
    } catch (err) {
        res.status(500).json({ error: 'Error creating new notepad' });
    }
});

// Rename notepad
app.put('/api/notepads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const data = JSON.parse(await fs.readFile(NOTEPADS_FILE, 'utf8'));
        const notepad = data.notepads.find(n => n.id === id);
        if (!notepad) {
            return res.status(404).json({ error: 'Notepad not found' });
        }
        notepad.name = name;
        await fs.writeFile(NOTEPADS_FILE, JSON.stringify(data));
        res.json(notepad);
    } catch (err) {
        res.status(500).json({ error: 'Error renaming notepad' });
    }
});

// Get notes for a specific notepad
app.get('/api/notes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const notePath = path.join(DATA_DIR, `${id}.txt`);
        const notes = await fs.readFile(notePath, 'utf8').catch(() => '');
        res.json({ content: notes });
    } catch (err) {
        res.status(500).json({ error: 'Error reading notes' });
    }
});

// Save notes for a specific notepad
app.post('/api/notes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await ensureDataDir();
        await fs.writeFile(path.join(DATA_DIR, `${id}.txt`), req.body.content);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error saving notes' });
    }
});

// Delete notepad
app.delete('/api/notepads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Attempting to delete notepad with id: ${id}`);
        
        // Don't allow deletion of default notepad
        if (id === 'default') {
            console.log('Attempted to delete default notepad');
            return res.status(400).json({ error: 'Cannot delete default notepad' });
        }

        const data = JSON.parse(await fs.readFile(NOTEPADS_FILE, 'utf8'));
        console.log('Current notepads:', data.notepads);
        
        const notepadIndex = data.notepads.findIndex(n => n.id === id);
        
        if (notepadIndex === -1) {
            console.log(`Notepad with id ${id} not found`);
            return res.status(404).json({ error: 'Notepad not found' });
        }

        // Remove from notepads list
        const removedNotepad = data.notepads.splice(notepadIndex, 1)[0];
        console.log(`Removed notepad:`, removedNotepad);
        
        // Save updated notepads list
        await fs.writeFile(NOTEPADS_FILE, JSON.stringify(data, null, 2));
        console.log('Updated notepads list saved');

        // Delete the notepad file
        const notePath = path.join(DATA_DIR, `${id}.txt`);
        try {
            await fs.access(notePath);
            await fs.unlink(notePath);
            console.log(`Deleted notepad file: ${notePath}`);
        } catch (err) {
            console.error(`Error accessing or deleting notepad file: ${notePath}`, err);
            // Continue even if file deletion fails
        }

        res.json({ success: true, message: 'Notepad deleted successfully' });
    } catch (err) {
        console.error('Error in delete notepad endpoint:', err);
        res.status(500).json({ error: 'Error deleting notepad' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
