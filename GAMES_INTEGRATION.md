# Game Integration Guide

This guide explains how to integrate your installed games with the CoverFlow interface.

## Overview

The CoverFlow application can now display and launch your games from Steam, Epic Games, and Xbox alongside your music albums and images. This is achieved using the Game Scanner tool included in this repository.

## Quick Start

### Option 1: Using Example Data (Testing)

An example games file is included at `gameinfodownload-main/game_data/games_export.json` with sample games. The CoverFlow app will automatically load this file when you open `index.html`.

### Option 2: Scan Your Real Games

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

### CoverFlow Integration

The CoverFlow app (`coverflow.js`) automatically:
1. Loads games from `gameinfodownload-main/game_data/games_export.json`
2. Converts game data to the CoverFlow format
3. Displays games in the carousel alongside albums and images
4. Shows game metadata in the info modal (Developer, Publisher, Genres, etc.)
5. Provides a "Launch Game" button that uses platform-specific launch commands

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
