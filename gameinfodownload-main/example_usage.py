"""
Example usage of the Game Scanner library

This demonstrates how to use the scanner programmatically
"""
from game_scanner import GameScanner


def main():
    print("Game Scanner Example")
    print("=" * 60)

    # Initialize the scanner
    print("\n1. Initializing scanner...")
    scanner = GameScanner(data_dir="example_data")

    # Scan for all games (commented out to avoid long scan)
    # print("\n2. Scanning for games...")
    # games = scanner.scan_all_games()

    # Example: Scan only Steam games
    print("\n2. Scanning Steam games only...")
    steam_games = scanner.scanners['steam'].scan_games()
    print(f"Found {len(steam_games)} Steam games")

    # Save to database
    for game in steam_games:
        scanner.db.save_game(game)

    # Get statistics
    print("\n3. Library statistics:")
    stats = scanner.db.get_statistics()
    print(f"   Total games: {stats['total_games']}")
    print(f"   Total size: {stats['total_size_gb']} GB")
    print(f"   Games per platform:")
    for platform, count in stats['platforms'].items():
        print(f"      {platform}: {count}")

    # Search for a game
    print("\n4. Searching for games with 'Portal' in the title...")
    results = scanner.db.search_games("Portal")
    for game in results:
        print(f"   - {game['title']} ({game['platform']})")

    # Export to JSON
    print("\n5. Exporting to JSON...")
    export_path = scanner.export_to_json("example_export.json")
    print(f"   Exported to: {export_path}")

    # Example: Get game details
    all_games = scanner.db.get_all_games()
    if all_games:
        game = all_games[0]
        print(f"\n6. Example game details:")
        print(f"   Title: {game['title']}")
        print(f"   Platform: {game['platform']}")
        print(f"   Install Dir: {game.get('install_directory', 'N/A')}")
        print(f"   Launch: {game.get('launch_command', 'N/A')}")
        if game.get('icon_path'):
            print(f"   Icon: {game['icon_path']}")
        if game.get('boxart_path'):
            print(f"   Box Art: {game['boxart_path']}")

    print("\n" + "=" * 60)
    print("Example complete!")


if __name__ == "__main__":
    main()
