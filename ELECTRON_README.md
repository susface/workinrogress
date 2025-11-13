# CoverFlow Game Launcher - Desktop Application

A standalone desktop application version of the CoverFlow Game Launcher. No browser required!

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- Electron (desktop app framework)
- electron-builder (for creating executables)
- better-sqlite3 (local database)

### 2. Install Python Dependencies

The game scanner requires Python:

```bash
cd gameinfodownload-main
pip install -r requirements.txt
cd ..
```

### 3. Run the App

```bash
npm start
```

The application will:
- Open in a native window
- Automatically scan for games on first run
- Store all data locally in your user folder

## Features

### Out-of-the-Box Experience
- **No setup required** - Just run and go
- **No browser needed** - Native desktop application
- **Local storage** - All data stored in app folder
- **Automatic scanning** - Finds Steam, Epic, and Xbox games

### How It Works

1. **Launch**: Double-click the app or run `npm start`
2. **Auto-scan**: App scans for games automatically on first run
3. **Browse**: Use the 3D carousel to browse your games
4. **Launch**: Double-click any game to play!

## Building Executables

### Windows
```bash
npm run build:win
```
Creates: `dist/CoverFlow Game Launcher Setup.exe`

### macOS
```bash
npm run build:mac
```
Creates: `dist/CoverFlow Game Launcher.dmg`

### Linux
```bash
npm run build:linux
```
Creates: `dist/CoverFlow-Game-Launcher.AppImage`

## Data Storage

All game data is stored in:
- **Windows**: `%APPDATA%/coverflow-game-launcher/game_data/`
- **macOS**: `~/Library/Application Support/coverflow-game-launcher/game_data/`
- **Linux**: `~/.config/coverflow-game-launcher/game_data/`

Contains:
- `games.db` - SQLite database with game info
- `icons/` - Game icons
- `boxart/` - Game cover art
- `games_export.json` - JSON export

## Development

### Project Structure

```
/
├── main.js           # Electron main process (app logic)
├── preload.js        # Secure IPC bridge
├── index.html        # UI (unchanged from web version)
├── coverflow.js      # 3D interface logic
├── style.css         # Styling
├── package.json      # Node.js project config
└── gameinfodownload-main/  # Python game scanner
```

### How It Works

1. **Electron Main Process** (`main.js`):
   - Creates the application window
   - Manages game scanning via Python subprocess
   - Handles local SQLite database
   - Provides IPC handlers for renderer

2. **Preload Script** (`preload.js`):
   - Secure bridge between main and renderer
   - Exposes only necessary APIs

3. **Renderer Process** (`index.html` + `coverflow.js`):
   - Same 3D interface as web version
   - Detects Electron mode automatically
   - Uses IPC instead of HTTP when in Electron

### Dual Mode Support

The app works in two modes:

**Electron Mode** (when running as desktop app):
- Uses IPC for game data
- Direct file system access
- No Flask server needed

**Browser Mode** (when opening index.html in browser):
- Uses HTTP to Flask server
- Server must be running
- Same as before

## Troubleshooting

### Python Not Found
Make sure Python is in your PATH:
- Windows: Add Python to PATH during installation
- macOS/Linux: Should be pre-installed

### Games Not Scanning
1. Check Python is installed: `python --version`
2. Check dependencies: `pip list` (should show requests, vdf)
3. Check console output in DevTools (Ctrl+Shift+I)

### Build Errors
1. Clean and reinstall: `rm -rf node_modules && npm install`
2. Update electron-builder: `npm install electron-builder@latest --save-dev`

## Comparison: Desktop vs Web

| Feature | Desktop App | Web Version |
|---------|------------|-------------|
| Setup | Just run | Need Python server |
| Browser | Not needed | Required |
| Data storage | Local SQLite | Server-side or file |
| Game scanning | Built-in | Via server API |
| Performance | Native speed | Browser limits |
| Distribution | Single .exe | Need server setup |

## Why Electron?

- **Familiar web technologies** - Same HTML/CSS/JS code
- **Cross-platform** - One codebase, runs on Windows/Mac/Linux
- **Native feel** - Real desktop app, not a browser tab
- **Simple distribution** - Single executable file
- **Local storage** - No server infrastructure needed

## Next Steps

1. **Add auto-update** - Electron has built-in update support
2. **Add tray icon** - Minimize to system tray
3. **Add shortcuts** - Global keyboard shortcuts
4. **Bundle Python** - Include Python runtime in build
5. **Add themes** - Customizable color schemes

## License

MIT - Free to use and modify
