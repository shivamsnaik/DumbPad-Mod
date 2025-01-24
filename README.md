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
- Optional PIN protection
- File-based storage
- Data persistence across updates

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable      | Description                | Default | Required |
|--------------|----------------------------|---------|----------|
| PORT         | Server port                | 3000    | No       |
| DUMBPAD_PIN | 4-digit PIN for protection | None    | No       |

## Running Locally

1. Install dependencies:
```bash
npm install
```

2. Set up environment:
```bash
cp .env.example .env
# Edit .env as needed
```

3. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Running with Docker

1. Build the Docker image:
```bash
docker build -t dumbpad .
```

2. Run the container:
```bash
# Without PIN protection
docker run -p 3000:3000 -v $(pwd)/data:/app/data dumbpad

# With PIN protection
docker run -p 3000:3000 -v $(pwd)/data:/app/data -e DUMBPAD_PIN=1234 dumbpad
```

The application will be available at `http://localhost:3000`

## Data Persistence

Your notes are stored in the `data` directory, which is:
- Excluded from version control (via `.gitignore`)
- Preserved when updating the application
- Mounted as a volume when running with Docker

When updating the application (via git pull or otherwise), your notes will remain intact as they are stored separately from the application code.

## Usage

- Just start typing! Your notes will be automatically saved.
- Use the theme toggle in the top-right corner to switch between light and dark mode.
- Press `Ctrl+S` (or `Cmd+S` on Mac) to force save.
- The save status will be shown at the bottom of the screen.
- If PIN protection is enabled, you'll need to enter the PIN to access the app.

## Technical Details

- Backend: Node.js with Express
- Frontend: Vanilla JavaScript
- Storage: File-based storage in `data` directory (git-ignored)
- Styling: Modern CSS with CSS variables for theming 
