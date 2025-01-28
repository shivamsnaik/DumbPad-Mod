# DumbPad

A stupid simple, no auth (unless you want it!), modern notepad application with auto-save functionality and dark mode support.

![image](https://github.com/user-attachments/assets/c6a00aac-f841-48a8-b8d3-c3d5378fc7d9)

![image](https://github.com/user-attachments/assets/6553f4e9-8764-4fb7-87b5-be872391df8c)

## Features

- Simple, clean interface
- Auto-saving
- Dark mode support
- Responsive design
- Docker support
- Optional PIN protection (4-10 digits)
- File-based storage
- Data persistence across updates

## Quick Start

### Using Docker (Recommended)

```bash
# Pull the latest image
docker pull dumbwareio/dumbpad:latest

# Run without PIN protection
docker run -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  dumbwareio/dumbpad

# Run with PIN protection
docker run -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  -e DUMBPAD_PIN=1234 \
  dumbwareio/dumbpad
```

### Running Locally

1. Clone the repository:
```bash
git clone https://github.com/dumbwareio/dumbpad.git
cd dumbpad
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment:
```bash
cp .env.example .env
# Edit .env as needed
```

4. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable      | Description                | Default | Required |
|--------------|----------------------------|---------|----------|
| PORT         | Server port                | 3000    | No       |
| DUMBPAD_PIN  | 4-10 digit PIN protection  | None    | No       |

## Security Features

### PIN Protection
- Optional 4-10 digit PIN
- Brute force protection:
  - 5 attempts maximum
  - 15-minute lockout after failed attempts
  - IP-based tracking
  - Constant-time comparison
  - Secure cookie storage

### Data Security
- File-based storage in `data` directory
- Data directory excluded from version control
- Secure volume mounting in Docker

## Building from Source

1. Clone and build:
```bash
git clone https://github.com/dumbwareio/dumbpad.git
cd dumbpad
docker build -t dumbwareio/dumbpad:latest .
```

2. Run your local build:
```bash
docker run -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  dumbwareio/dumbpad:latest
```

## Data Persistence

Your notes are stored in the `data` directory, which is:
- Excluded from version control (via `.gitignore`)
- Preserved when updating the application
- Mounted as a volume when running with Docker

To ensure your notes persist across updates:

1. If running locally:
   ```bash
   # First time setup
   mkdir -p data
   touch data/.gitkeep

   # When updating
   git stash        # Stash any local changes
   git pull        # Pull latest changes
   git stash pop   # Restore local changes
   ```

2. If running with Docker:
   ```bash
   # First time setup
   mkdir -p data
   
   # Running with proper volume mount
   docker run -p 3000:3000 \
     -v "$(pwd)/data:/app/data" \
     dumbwareio/dumbpad:latest

   # When updating
   docker pull dumbwareio/dumbpad:latest
   # Then run again with the same volume mount
   ```

⚠️ Important: Never delete the `data` directory when updating! This is where all your notes are stored.

## Usage

- Just start typing! Your notes will be automatically saved.
- Use the theme toggle in the top-right corner to switch between light and dark mode.
- Press `Ctrl+S` (or `Cmd+S` on Mac) to force save.
- Auto-saves every 10 seconds while typing.
- Create multiple notepads with the + button.
- Download notepads as .txt files.
- If PIN protection is enabled, you'll need to enter the PIN to access the app.

## Technical Details

- Backend: Node.js with Express
- Frontend: Vanilla JavaScript
- Storage: File-based storage in `data` directory
- Styling: Modern CSS with CSS variables for theming
- Security: Constant-time PIN comparison, brute force protection

## Links

- GitHub: [github.com/dumbwareio/dumbpad](https://github.com/dumbwareio/dumbpad)
- Docker Hub: [hub.docker.com/r/dumbwareio/dumbpad](https://hub.docker.com/r/dumbwareio/dumbpad)

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request
