const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const NOTEPADS_FILE = path.join(DATA_DIR, 'notepads.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        // Create notepads.json if it doesn't exist
        try {
            await fs.access(NOTEPADS_FILE);
        } catch {
            await fs.writeFile(NOTEPADS_FILE, JSON.stringify({
                notepads: [{ id: 'default', name: 'Default Notepad' }]
            }));
        }
    } catch (err) {
        console.error('Error creating data directory:', err);
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