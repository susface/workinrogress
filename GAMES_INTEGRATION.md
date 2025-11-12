# Game Integration Guide

This guide explains how to integrate your installed games with the CoverFlow interface.

## Overview

The CoverFlow application can now display and launch your games from Steam, Epic Games, and Xbox alongside your music albums and images. You can scan for games directly from the CoverFlow interface!

## Quick Start

### Option 1: Scan Games from Interface (Recommended)

1. **Install dependencies:**
   ```bash
   cd gameinfodownload-main
   pip install -r requirements.txt
   ```

2. **Start the game scanner server:**
   ```bash
   python server.py
   ```

   You should see:
   ```
   ============================================================
   CoverFlow Game Scanner Server
   ============================================================

   Server starting on http://localhost:5000
   ...
   ```

3. **Open CoverFlow:**
   - Open `index.html` in your browser
   - Open Settings (⚙️ button or press 'S')
   - Scroll to "🎮 Game Library" section
   - Check that server shows "✓ Connected"
   - Click "Scan for Games"
   - Wait for the scan to complete (progress bar shows status)
   - Games will automatically load into the interface!

### Option 2: Using Example Data (Testing)

An example games file is included at `gameinfodownload-main/game_data/games_export.json` with sample games. The CoverFlow app will automatically load this file when you open `index.html` (without server).

### Option 3: Manual Command Line Scan

1. **Install dependencies:**
   ```bash
   cd gameinfodownload-main
   pip install -r requirements.txt
   ```

2. **Run the game scanner:**
   ```bash
   python game_scanner.py
   ```

   This will:
   - Scan for Steam, Epic, and Xbox games on your system
   - Download game metadata, icons, and box art
   - Save everything to `game_data/games_export.json`

3. **Open CoverFlow:**
   Simply open `index.html` in your browser. The app will automatically load your games from `gameinfodownload-main/game_data/games_export.json`.

## How It Works

### Game Scanner

The game scanner (located in `gameinfodownload-main/`) searches your computer for:
- **Steam games** - Reads Steam library folders and fetches metadata from Steam API
- **Epic Games** - Scans Epic Games Launcher manifests
- **Xbox/Game Pass** - Detects UWP apps (Windows only)

All data is exported to `game_data/games_export.json` in the following format:

```json
{
  "export_date": "2024-11-12T...",
  "total_games": 50,
  "games": [
    {
      "platform": "steam",
      "title": "Portal 2",
      "app_id": "620",
      "launch_command": "steam://rungameid/620",
      "description": "...",
      "developer": "Valve",
      "publisher": "Valve",
      "release_date": "2011-04-18",
      "icon_path": "game_data/icons/steam_620.jpg",
      "boxart_path": "game_data/boxart/steam_620.jpg",
      "genres": ["Puzzle", "Action", "Adventure"]
    }
  ]
}
```

### Game Scanner Server

The server (`server.py`) provides a REST API that allows the CoverFlow interface to:
- **Trigger scans** - Start game scans from the web interface
- **Monitor progress** - Real-time progress updates during scanning
- **Load games** - Fetch scanned game data via HTTP
- **Serve images** - Provide game boxart and icons to the interface

**API Endpoints:**
- `POST /api/scan/start` - Start a game scan
- `GET /api/scan/status` - Get current scan progress
- `GET /api/games` - Get all games
- `GET /api/games/count` - Get game counts by platform
- `GET /health` - Server health check

The server runs locally on port 5000 and uses Flask with CORS enabled for local development.

### CoverFlow Integration

The CoverFlow app (`coverflow.js`) can work in two modes:

**With Server (Recommended):**
1. Checks if server is running on startup
2. Shows server status in settings
3. Allows triggering scans from the interface
4. Polls for scan progress and updates UI
5. Loads games directly from server via API
6. Serves game images through the server

**Without Server (Static Mode):**
1. Loads games from `gameinfodownload-main/game_data/games_export.json`
2. Uses local file paths for images
3. Manual scanning via command line required

## Launching Games

When you view a game's details (press X/Square on controller or click the info button), you'll see a "🎮 Launch Game" button. Clicking this will:

- **Steam games**: Opens the game via `steam://rungameid/APPID`
- **Epic games**: Opens via Epic Games Launcher protocol
- **Xbox games**: Opens via Xbox app protocol

**Note**: Your game launcher (Steam, Epic, Xbox) must be running for games to launch properly.

## Customizing Game Data Path

By default, CoverFlow looks for games at `gameinfodownload-main/game_data/games_export.json`. To use a different path, edit `coverflow.js`:

```javascript
// In the initAlbumData() method, change the path:
this.loadGamesFromJSON('path/to/your/games.json');
```

## Game Display

Games are displayed with:
- Platform-specific colors (Steam: dark blue, Epic: dark gray, Xbox: green)
- Game controller icon (🎮) as placeholder if no box art is available
- Developer, Publisher, and Genre information in the info modal
- Launch button for quick game launching

## Troubleshooting

### Games not loading

1. Check browser console (F12) for error messages
2. Verify `games_export.json` exists at the expected path
3. Make sure the JSON file is valid (use a JSON validator)
4. Check that the web server can access the file (if using a local server)

### Games not launching

1. Ensure the game launcher (Steam/Epic/Xbox) is installed and running
2. Verify the game is actually installed
3. Check browser console for launch command details
4. Some browsers may block protocol links - check your browser's security settings

### No game metadata or images

1. Run the game scanner while connected to the internet
2. Check the `game_data/icons/` and `game_data/boxart/` directories
3. Re-run the scanner if metadata is missing: `python game_scanner.py`

### Server not connecting

1. **Check if server is running:**
   - Look for the server window/terminal
   - Should show "Server starting on http://localhost:5000"

2. **Verify dependencies are installed:**
   ```bash
   cd gameinfodownload-main
   pip install -r requirements.txt
   ```

3. **Port 5000 already in use:**
   - Close other applications using port 5000
   - Or edit `server.py` and change the port number
   - Also update `this.serverURL` in `coverflow.js` to match

4. **CORS errors in browser console:**
   - Make sure Flask-CORS is installed: `pip install flask-cors`
   - Check that CORS is enabled in `server.py`

5. **Firewall blocking connection:**
   - Allow Python through your firewall
   - Server only listens on localhost (no external access)

### Scan button doesn't work

1. Server must be running first (see above)
2. Check that server status shows "✓ Connected" in settings
3. Look at browser console (F12) for error messages
4. Try clicking "Reload Games" to test server connection

## CLI Commands

The game scanner provides several useful commands:

```bash
# Scan all games
python cli.py scan

# Scan only Steam games
python cli.py scan --platform steam

# List all games
python cli.py list

# Search for a game
python cli.py search "Portal"

# View game details
python cli.py info --title "Portal 2"

# Export to custom location
python cli.py export --output my_games.json
```

## Platform Support

- **Windows**: Full support for Steam, Epic, and Xbox
- **Linux**: Steam and Epic (via Heroic/Lutris)
- **macOS**: Steam and Epic

## Integration with Your Workflow

### Automatic Updates

To keep your game library up to date, you can:

1. Run the scanner periodically:
   ```bash
   python game_scanner.py
   ```

2. Or set up a scheduled task/cron job to run it automatically

### Custom Game Metadata

You can manually edit `games_export.json` to:
- Add custom descriptions
- Modify game titles
- Change display colors
- Add custom box art paths

## Technical Details

### Data Flow

```
Game Scanner → games_export.json → CoverFlow App → Display & Launch
```

### Launch Command Protocols

- Steam: `steam://rungameid/{APP_ID}`
- Epic: `com.epicgames.launcher://apps/{APP_NAME}?action=launch`
- Xbox: `xbox://launchgame/?productId={PRODUCT_ID}`

## Support

For issues with:
- **Game Scanner**: See `gameinfodownload-main/README.md`
- **CoverFlow App**: Check the main README.md
- **Integration**: Create an issue on the repository
