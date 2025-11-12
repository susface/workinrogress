# Game Scanner - Multi-Platform Game Detector

A comprehensive Python application that searches your computer for games from **Steam**, **Epic Games Launcher**, and **Xbox Store/Game Pass**, then collects and stores detailed information about each game including:

- Game title and description
- Box art and icons
- Launch shortcuts
- Install location
- Developer and publisher information
- Release date and genres
- File size

All data is stored in a SQLite database for quick access and can be exported to JSON.

## Features

### Supported Platforms
- **Steam** - Scans Steam library folders and fetches metadata from Steam API
- **Epic Games Launcher** - Reads manifest files and fetches data from Epic Games API
- **Xbox Store/Game Pass** - Detects UWP apps and Microsoft Store games (Windows only)

### Capabilities
- **Automatic Detection** - Finds game installations across all supported platforms
- **Metadata Collection** - Downloads game descriptions, box art, and icons
- **Database Storage** - Stores all game information in SQLite for persistence
- **Launch Integration** - Creates shortcuts to launch games directly
- **Search & Filter** - Search games by title, filter by platform
- **Export** - Export your entire game library to JSON
- **Statistics** - View library statistics and storage usage

## Installation

### Prerequisites
- Python 3.7 or higher
- Windows, Linux, or macOS
- At least one game launcher installed (Steam, Epic Games, or Xbox)

### Setup

1. **Clone or download this repository**

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Run the scanner:**
```bash
# Simple scan with main script
python game_scanner.py

# Or use the CLI for more options
python cli.py scan
```

## Usage

### Quick Start

**Scan all games:**
```bash
python game_scanner.py
```

This will:
1. Search for Steam, Epic, and Xbox games
2. Download metadata, icons, and box art
3. Store everything in `game_data/` directory
4. Export to `game_data/games_export.json`

### CLI Commands

The CLI provides more control over the scanner:

**Scan for games:**
```bash
# Scan all platforms
python cli.py scan

# Scan only Steam games
python cli.py scan --platform steam

# Scan and export immediately
python cli.py scan --export my_games.json
```

**List games:**
```bash
# List all games
python cli.py list

# List only Epic games
python cli.py list --platform epic
```

**Search for games:**
```bash
python cli.py search "Half-Life"
```

**View game details:**
```bash
# By database ID
python cli.py info --id 5

# By title
python cli.py info --title "Portal 2"
```

**Launch a game:**
```bash
# By database ID
python cli.py launch --id 5

# By title
python cli.py launch --title "Portal 2"
```

**View statistics:**
```bash
python cli.py stats
```

**Export to JSON:**
```bash
python cli.py export --output my_library.json
```

## Data Storage

All data is stored in the `game_data/` directory (customizable):

```
game_data/
├── games.db              # SQLite database with all game info
├── icons/               # Game icons
│   ├── steam_*.jpg
│   ├── epic_*.jpg
│   └── xbox_*.png
├── boxart/              # Game box art
│   ├── steam_*.jpg
│   ├── epic_*.jpg
│   └── xbox_*.jpg
└── games_export.json    # JSON export
```

### Database Schema

The SQLite database stores:
- Platform (steam/epic/xbox)
- Title and descriptions
- Developer and publisher
- Install directory and launch command
- Paths to downloaded icons and box art
- Release date and genres
- File sizes and metadata
- Timestamps

## How It Works

### Steam Scanner
1. Locates Steam installation directory
2. Finds all library folders from `libraryfolders.vdf`
3. Parses `.acf` manifest files for each game
4. Fetches metadata from Steam Store API
5. Downloads icons and header images from Steam CDN

### Epic Games Scanner
1. Finds Epic Games Launcher manifest directory
2. Parses `.item` manifest files (JSON format)
3. Fetches metadata from Epic Games GraphQL API
4. Downloads box art and logos from Epic CDN

### Xbox Store Scanner
1. Uses PowerShell to query installed UWP apps (Windows only)
2. Filters for game-related packages
3. Parses `AppxManifest.xml` files
4. Attempts to fetch metadata from Microsoft Store API
5. Copies local app icons or downloads from Microsoft CDN

## Platform-Specific Notes

### Windows
- Full support for all three platforms
- Xbox/Game Pass scanning requires Windows 10/11
- PowerShell must be available for Xbox detection

### Linux
- Steam: Fully supported
- Epic Games: Supported if Epic is installed via Heroic Games Launcher or Lutris
- Xbox: Not available

### macOS
- Steam: Fully supported
- Epic Games: Supported
- Xbox: Not available

## API Usage

### As a Python Library

You can also use the scanner programmatically:

```python
from game_scanner import GameScanner

# Initialize scanner
scanner = GameScanner(data_dir="my_games")

# Scan all platforms
all_games = scanner.scan_all_games()

# Get games from specific platform
steam_games = scanner.get_games_by_platform('steam')

# Search for a game
game = scanner.get_game_by_title('Cyberpunk')

# Launch a game
scanner.launch_game(game['id'])

# Export to JSON
scanner.export_to_json('my_export.json')

# Get statistics
stats = scanner.db.get_statistics()
print(f"Total games: {stats['total_games']}")
```

## Troubleshooting

### Steam games not found
- Ensure Steam is installed in a standard location
- Check that Steam library folders are properly configured
- Verify `.acf` files exist in `steamapps/` directories

### Epic games not found
- Ensure Epic Games Launcher is installed
- Check that manifest files exist in `%PROGRAMDATA%\Epic\EpicGamesLauncher\Data\Manifests` (Windows)
- Verify you have games installed through Epic

### Xbox games not found (Windows)
- Ensure you're running on Windows 10/11
- Verify PowerShell is available
- Check that games are installed through Microsoft Store
- Some games may not be detected due to UWP restrictions

### Network errors
- The scanner requires internet access to fetch metadata
- If downloads fail, the game will still be saved but without online metadata
- Check firewall settings if requests are being blocked

## License

This project is open source and available for personal use.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## Disclaimer

This tool is for personal use only. It respects game launcher installations and does not modify any game files. All metadata is fetched from public APIs where available.
