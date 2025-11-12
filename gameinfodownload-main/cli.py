"""
Command-line interface for the Game Scanner
"""
import argparse
import os
import sys
from pathlib import Path
from game_scanner import GameScanner


def cmd_scan(args):
    """Scan for games"""
    scanner = GameScanner(args.data_dir)

    if args.platform:
        print(f"Scanning {args.platform} games only...")
        if args.platform in scanner.scanners:
            games = scanner.scanners[args.platform].scan_games()
            for game in games:
                scanner.db.save_game(game)
            print(f"Found {len(games)} {args.platform} games")
        else:
            print(f"Unknown platform: {args.platform}")
            print("Available platforms: steam, epic, xbox")
            return
    else:
        scanner.scan_all_games()

    if args.export:
        scanner.export_to_json(args.export)


def cmd_list(args):
    """List games"""
    scanner = GameScanner(args.data_dir)

    if args.platform:
        games = scanner.get_games_by_platform(args.platform)
        print(f"\n{args.platform.upper()} Games ({len(games)}):")
    else:
        games = scanner.db.get_all_games()
        print(f"\nAll Games ({len(games)}):")

    print("=" * 80)

    for game in games:
        print(f"\nID: {game['id']}")
        print(f"Title: {game['title']}")
        print(f"Platform: {game['platform']}")
        if game.get('developer'):
            print(f"Developer: {game['developer']}")
        if game.get('install_directory'):
            print(f"Location: {game['install_directory']}")
        if game.get('description'):
            desc = game['description'][:100] + "..." if len(game['description']) > 100 else game['description']
            print(f"Description: {desc}")


def cmd_search(args):
    """Search for games"""
    scanner = GameScanner(args.data_dir)
    games = scanner.db.search_games(args.query)

    print(f"\nSearch results for '{args.query}' ({len(games)}):")
    print("=" * 80)

    for game in games:
        print(f"\nID: {game['id']}")
        print(f"Title: {game['title']}")
        print(f"Platform: {game['platform']}")
        if game.get('developer'):
            print(f"Developer: {game['developer']}")


def cmd_info(args):
    """Show detailed game information"""
    scanner = GameScanner(args.data_dir)

    if args.id:
        game = scanner.db.get_game_by_id(args.id)
    else:
        game = scanner.get_game_by_title(args.title)

    if not game:
        print("Game not found")
        return

    print("\n" + "=" * 80)
    print(f"Game Information")
    print("=" * 80)
    print(f"ID: {game['id']}")
    print(f"Title: {game['title']}")
    print(f"Platform: {game['platform']}")

    if game.get('app_id'):
        print(f"App ID: {game['app_id']}")
    if game.get('package_name'):
        print(f"Package: {game['package_name']}")

    print(f"\nInstall Directory: {game.get('install_directory', 'N/A')}")
    print(f"Launch Command: {game.get('launch_command', 'N/A')}")

    if game.get('developer'):
        print(f"\nDeveloper: {game['developer']}")
    if game.get('publisher'):
        print(f"Publisher: {game['publisher']}")
    if game.get('release_date'):
        print(f"Release Date: {game['release_date']}")

    if game.get('genres'):
        print(f"Genres: {', '.join(game['genres'])}")

    if game.get('description'):
        print(f"\nDescription:")
        print(game['description'])

    if game.get('icon_path'):
        print(f"\nIcon: {game['icon_path']}")
    if game.get('boxart_path'):
        print(f"Box Art: {game['boxart_path']}")

    if game.get('size_on_disk'):
        size_gb = game['size_on_disk'] / (1024**3)
        print(f"\nSize on Disk: {size_gb:.2f} GB")


def cmd_launch(args):
    """Launch a game"""
    scanner = GameScanner(args.data_dir)

    if args.id:
        scanner.launch_game(args.id)
    else:
        game = scanner.get_game_by_title(args.title)
        if game:
            scanner.launch_game(game['id'])
        else:
            print("Game not found")


def cmd_stats(args):
    """Show library statistics"""
    scanner = GameScanner(args.data_dir)
    stats = scanner.db.get_statistics()

    print("\n" + "=" * 80)
    print("Game Library Statistics")
    print("=" * 80)
    print(f"\nTotal Games: {stats['total_games']}")
    print(f"Total Size: {stats['total_size_gb']} GB")

    print("\nGames per Platform:")
    for platform, count in stats['platforms'].items():
        print(f"  {platform.upper()}: {count}")


def cmd_export(args):
    """Export game data"""
    scanner = GameScanner(args.data_dir)
    output_file = args.output or "games_export.json"
    scanner.export_to_json(output_file)
    print(f"Exported to: {output_file}")


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Game Scanner - Find and manage games from multiple launchers',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        '--data-dir',
        default='game_data',
        help='Directory to store game data (default: game_data)'
    )

    subparsers = parser.add_subparsers(dest='command', help='Commands')

    # Scan command
    scan_parser = subparsers.add_parser('scan', help='Scan for installed games')
    scan_parser.add_argument(
        '--platform',
        choices=['steam', 'epic', 'xbox'],
        help='Scan only a specific platform'
    )
    scan_parser.add_argument(
        '--export',
        help='Export results to JSON file'
    )
    scan_parser.set_defaults(func=cmd_scan)

    # List command
    list_parser = subparsers.add_parser('list', help='List all games')
    list_parser.add_argument(
        '--platform',
        choices=['steam', 'epic', 'xbox'],
        help='Filter by platform'
    )
    list_parser.set_defaults(func=cmd_list)

    # Search command
    search_parser = subparsers.add_parser('search', help='Search for games')
    search_parser.add_argument('query', help='Search query')
    search_parser.set_defaults(func=cmd_search)

    # Info command
    info_parser = subparsers.add_parser('info', help='Show detailed game information')
    info_group = info_parser.add_mutually_exclusive_group(required=True)
    info_group.add_argument('--id', type=int, help='Game database ID')
    info_group.add_argument('--title', help='Game title')
    info_parser.set_defaults(func=cmd_info)

    # Launch command
    launch_parser = subparsers.add_parser('launch', help='Launch a game')
    launch_group = launch_parser.add_mutually_exclusive_group(required=True)
    launch_group.add_argument('--id', type=int, help='Game database ID')
    launch_group.add_argument('--title', help='Game title')
    launch_parser.set_defaults(func=cmd_launch)

    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Show library statistics')
    stats_parser.set_defaults(func=cmd_stats)

    # Export command
    export_parser = subparsers.add_parser('export', help='Export game data to JSON')
    export_parser.add_argument(
        '--output',
        help='Output file name (default: games_export.json)'
    )
    export_parser.set_defaults(func=cmd_export)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # Execute command
    args.func(args)


if __name__ == '__main__':
    main()
