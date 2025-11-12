"""
Main Game Scanner Application
Searches for games from Steam, Epic Games Launcher, and Xbox Store
"""
import json
import os
from pathlib import Path
from typing import Dict, List
from datetime import datetime

from launchers.steam_scanner import SteamScanner
from launchers.epic_scanner import EpicScanner
from launchers.xbox_scanner import XboxScanner
from data.storage import GameDatabase


class GameScanner:
    """Main class to orchestrate game scanning from multiple platforms"""

    def __init__(self, data_dir: str = "game_data"):
        """
        Initialize the game scanner

        Args:
            data_dir: Directory to store game data, icons, and box art
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

        # Create subdirectories for organized storage
        self.icons_dir = self.data_dir / "icons"
        self.boxart_dir = self.data_dir / "boxart"
        self.icons_dir.mkdir(exist_ok=True)
        self.boxart_dir.mkdir(exist_ok=True)

        # Initialize database
        self.db = GameDatabase(str(self.data_dir / "games.db"))

        # Initialize scanners
        self.scanners = {
            'steam': SteamScanner(self.icons_dir, self.boxart_dir),
            'epic': EpicScanner(self.icons_dir, self.boxart_dir),
            'xbox': XboxScanner(self.icons_dir, self.boxart_dir)
        }

    def scan_all_games(self) -> Dict[str, List[Dict]]:
        """
        Scan all game launchers and collect game information

        Returns:
            Dictionary with launcher names as keys and lists of game data as values
        """
        all_games = {}

        print("Starting game scan...")
        print("=" * 60)

        for platform, scanner in self.scanners.items():
            print(f"\nScanning {platform.upper()} games...")
            try:
                games = scanner.scan_games()
                all_games[platform] = games
                print(f"Found {len(games)} {platform.upper()} games")

                # Save each game to database
                for game in games:
                    self.db.save_game(game)

            except Exception as e:
                print(f"Error scanning {platform}: {e}")
                all_games[platform] = []

        print("\n" + "=" * 60)
        total = sum(len(games) for games in all_games.values())
        print(f"Total games found: {total}")

        return all_games

    def export_to_json(self, filename: str = "games_export.json"):
        """Export all games to a JSON file"""
        export_path = self.data_dir / filename
        games = self.db.get_all_games()

        export_data = {
            'export_date': datetime.now().isoformat(),
            'total_games': len(games),
            'games': games
        }

        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)

        print(f"\nExported {len(games)} games to {export_path}")
        return export_path

    def get_game_by_title(self, title: str) -> Dict:
        """Search for a game by title"""
        return self.db.get_game_by_title(title)

    def get_games_by_platform(self, platform: str) -> List[Dict]:
        """Get all games from a specific platform"""
        return self.db.get_games_by_platform(platform)

    def launch_game(self, game_id: int):
        """Launch a game by its database ID"""
        game = self.db.get_game_by_id(game_id)
        if not game:
            print(f"Game with ID {game_id} not found")
            return

        launch_cmd = game.get('launch_command')
        if not launch_cmd:
            print(f"No launch command found for {game.get('title')}")
            return

        print(f"Launching {game.get('title')}...")
        try:
            if game['platform'] == 'steam':
                os.system(launch_cmd)
            elif game['platform'] == 'epic':
                os.system(launch_cmd)
            elif game['platform'] == 'xbox':
                os.system(launch_cmd)
        except Exception as e:
            print(f"Error launching game: {e}")


def main():
    """Main entry point for the application"""
    scanner = GameScanner()

    print("=" * 60)
    print("Game Scanner - Multi-Platform Game Detector")
    print("=" * 60)

    # Scan for all games
    games = scanner.scan_all_games()

    # Export to JSON
    scanner.export_to_json()

    print("\n" + "=" * 60)
    print("Scan complete! Game data has been saved.")
    print(f"Data directory: {scanner.data_dir.absolute()}")
    print("=" * 60)


if __name__ == "__main__":
    main()
