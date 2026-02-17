# KidneyQuest - Development POC

A browser-based side-scrolling runner game starring the CeRKiD zebra mascot.

## Project Structure

```
KidneyQuest/
├── index.html                # Entry point
├── css/
│   └── style.css             # Page layout
├── js/
│   ├── main.js               # Entry point
│   ├── config.js             # Constants (gravity, speeds, types)
│   ├── game.js               # Game loop & state
│   ├── player.js             # Zebra character logic
│   ├── input.js              # Keyboard/Touch handler
│   ├── obstacle.js           # Obstacle manager
│   ├── collectible.js        # Gene collectibles
│   ├── score.js              # Score tracking
│   ├── background.js         # Parallax background
│   ├── collision.js          # Collision utility
│   └── renderer.js           # Canvas drawing
├── assets/
│   └── sprites/              # Game sprites
└── generate_zebra.py         # Utility to generate placeholder sprite
```

## How to Run Locally

Since this project uses ES Modules (`import/export`), you cannot simply open `index.html` file directly in the browser due to CORS security policies. You must serve it via a local web server.

### Option 1: Python (Recommended)

If you have Python installed:

1. Open a terminal in the project folder.
2. Run:
   ```bash
   python -m http.server 8080
   ```
3. Open your browser to:
   [http://localhost:8080/index.html](http://localhost:8080/index.html)

### Option 2: Node.js (http-server)

If you have Node.js installed:

1. Install `http-server` globally (once):
   ```bash
   npm install -g http-server
   ```
2. Run in the project folder:
   ```bash
   http-server .
   ```
3. Open the URL shown in the terminal.

### Option 3: VS Code (Live Server)

If you use VS Code:

1. Install the "Live Server" extension.
2. Right-click `index.html` and select "Open with Live Server".

## Controls

- **Space Bar** or **Arrow Up**: Jump / Start Game
- **Touch (Mobile)**: Jump

## Development

- **Tunable Constants**: Check `js/config.js` to adjust gravity, speed, jump height, etc.
- **Assets**: Sprites are loaded in `js/player.js` and other entity files.

## Credits

Developed for the AI-Teachathon workshop.
