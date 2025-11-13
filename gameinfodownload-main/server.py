"""
Flask server for CoverFlow game scanner integration
Provides REST API endpoints for the web interface to trigger game scans
"""
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import threading
import json
import os
from pathlib import Path
from game_scanner import GameScanner

app = Flask(__name__)
# Enable CORS only for localhost to prevent security issues
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:*", "http://127.0.0.1:*"]}})

# Global state for scan progress
scan_state = {
    'scanning': False,
    'progress': 0,
    'total_games': 0,
    'current_platform': None,
    'message': 'Ready to scan',
    'error': None
}

scanner = None
data_dir = Path(__file__).parent / 'game_data'


def run_scan():
    """Run the game scanner in a background thread"""
    global scan_state, scanner

    try:
        scan_state['scanning'] = True
        scan_state['error'] = None
        scan_state['message'] = 'Initializing scanner...'

        # Initialize scanner
        scanner = GameScanner(data_dir=str(data_dir))
        scan_state['message'] = 'Scanning for games...'

        # Scan each platform
        platforms = ['steam', 'epic', 'xbox']
        all_games = {}

        for i, platform in enumerate(platforms):
            scan_state['current_platform'] = platform
            scan_state['progress'] = int((i / len(platforms)) * 100)
            scan_state['message'] = f'Scanning {platform.title()} games...'

            try:
                if platform in scanner.scanners:
                    games = scanner.scanners[platform].scan_games()
                    all_games[platform] = games

                    # Save games to database
                    for game in games:
                        scanner.db.save_game(game)

                    scan_state['total_games'] += len(games)
                    scan_state['message'] = f'Found {len(games)} {platform.title()} games'
            except Exception as e:
                print(f"Error scanning {platform}: {e}")
                scan_state['message'] = f'Error scanning {platform}: {str(e)}'

        # Export to JSON
        scan_state['progress'] = 90
        scan_state['message'] = 'Exporting game data...'
        scanner.export_to_json('games_export.json')

        # Complete
        scan_state['progress'] = 100
        scan_state['scanning'] = False
        scan_state['message'] = f'Scan complete! Found {scan_state["total_games"]} games'
        scan_state['current_platform'] = None

    except Exception as e:
        scan_state['scanning'] = False
        scan_state['error'] = str(e)
        scan_state['message'] = f'Scan failed: {str(e)}'
        print(f"Scan error: {e}")


@app.route('/api/scan/start', methods=['POST'])
def start_scan():
    """Start a game scan"""
    global scan_state

    if scan_state['scanning']:
        return jsonify({'error': 'Scan already in progress'}), 400

    # Reset state
    scan_state = {
        'scanning': True,
        'progress': 0,
        'total_games': 0,
        'current_platform': None,
        'message': 'Starting scan...',
        'error': None
    }

    # Run scan in background thread
    thread = threading.Thread(target=run_scan)
    thread.daemon = True
    thread.start()

    return jsonify({'success': True, 'message': 'Scan started'})


@app.route('/api/scan/status', methods=['GET'])
def scan_status():
    """Get current scan status"""
    return jsonify(scan_state)


@app.route('/api/games', methods=['GET'])
def get_games():
    """Get all games from the database"""
    try:
        json_path = data_dir / 'games_export.json'

        if not json_path.exists():
            return jsonify({'games': [], 'total_games': 0, 'message': 'No games found. Run a scan first.'})

        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/games/count', methods=['GET'])
def games_count():
    """Get count of games by platform"""
    try:
        json_path = data_dir / 'games_export.json'

        if not json_path.exists():
            return jsonify({'total': 0, 'platforms': {}})

        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        games = data.get('games', [])
        platforms = {}

        for game in games:
            platform = game.get('platform', 'unknown')
            platforms[platform] = platforms.get(platform, 0) + 1

        return jsonify({
            'total': len(games),
            'platforms': platforms
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/game_data/<path:filename>')
def serve_game_data(filename):
    """Serve game data files (images, JSON, etc.)"""
    return send_from_directory(data_dir, filename)


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'CoverFlow Game Scanner Server'})


# Play time tracking endpoints

@app.route('/api/games/<int:game_id>/playtime', methods=['GET'])
def get_play_time(game_id):
    """Get play time stats for a game"""
    try:
        if scanner and scanner.db:
            stats = scanner.db.get_play_time(game_id)
            return jsonify({'success': True, 'stats': stats})
        return jsonify({'error': 'Scanner not initialized'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/games/<int:game_id>/session/start', methods=['POST'])
def start_session(game_id):
    """Start a game session"""
    try:
        if scanner and scanner.db:
            session_id = scanner.db.start_game_session(game_id)
            return jsonify({'success': True, 'session_id': session_id})
        return jsonify({'error': 'Scanner not initialized'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/games/session/<int:session_id>/end', methods=['POST'])
def end_session(session_id):
    """End a game session"""
    try:
        if scanner and scanner.db:
            scanner.db.end_game_session(session_id)
            return jsonify({'success': True})
        return jsonify({'error': 'Scanner not initialized'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Favorites and hidden endpoints

@app.route('/api/games/<int:game_id>/favorite', methods=['POST'])
def toggle_favorite(game_id):
    """Toggle favorite status"""
    try:
        if scanner and scanner.db:
            is_favorite = scanner.db.toggle_favorite(game_id)
            return jsonify({'success': True, 'is_favorite': is_favorite})
        return jsonify({'error': 'Scanner not initialized'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/games/<int:game_id>/hidden', methods=['POST'])
def toggle_hidden(game_id):
    """Toggle hidden status"""
    try:
        if scanner and scanner.db:
            is_hidden = scanner.db.toggle_hidden(game_id)
            return jsonify({'success': True, 'is_hidden': is_hidden})
        return jsonify({'error': 'Scanner not initialized'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/games/favorites', methods=['GET'])
def get_favorites():
    """Get all favorite games"""
    try:
        if scanner and scanner.db:
            favorites = scanner.db.get_favorites()
            return jsonify({'success': True, 'games': favorites})
        return jsonify({'error': 'Scanner not initialized'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Rating and notes endpoints

@app.route('/api/games/<int:game_id>/rating', methods=['POST'])
def set_rating(game_id):
    """Set game rating"""
    try:
        data = request.get_json()
        rating = data.get('rating')

        if not rating or rating < 1 or rating > 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400

        if scanner and scanner.db:
            scanner.db.set_rating(game_id, rating)
            return jsonify({'success': True})
        return jsonify({'error': 'Scanner not initialized'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/games/<int:game_id>/notes', methods=['POST'])
def set_notes(game_id):
    """Set game notes"""
    try:
        data = request.get_json()
        notes = data.get('notes', '')

        if scanner and scanner.db:
            scanner.db.set_notes(game_id, notes)
            return jsonify({'success': True})
        return jsonify({'error': 'Scanner not initialized'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Special lists endpoints

@app.route('/api/games/recently-played', methods=['GET'])
def get_recently_played():
    """Get recently played games"""
    try:
        limit = request.args.get('limit', 10, type=int)
        if scanner and scanner.db:
            games = scanner.db.get_recently_played(limit)
            return jsonify({'success': True, 'games': games})
        return jsonify({'error': 'Scanner not initialized'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/games/most-played', methods=['GET'])
def get_most_played():
    """Get most played games"""
    try:
        limit = request.args.get('limit', 10, type=int)
        if scanner and scanner.db:
            games = scanner.db.get_most_played(limit)
            return jsonify({'success': True, 'games': games})
        return jsonify({'error': 'Scanner not initialized'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/games/recently-added', methods=['GET'])
def get_recently_added():
    """Get recently added games"""
    try:
        limit = request.args.get('limit', 10, type=int)
        if scanner and scanner.db:
            games = scanner.db.get_recently_added(limit)
            return jsonify({'success': True, 'games': games})
        return jsonify({'error': 'Scanner not initialized'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/games/duplicates', methods=['GET'])
def find_duplicates():
    """Find duplicate games"""
    try:
        if scanner and scanner.db:
            duplicates = scanner.db.find_duplicates()
            return jsonify({'success': True, 'duplicates': duplicates})
        return jsonify({'error': 'Scanner not initialized'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Advanced filtering endpoint

@app.route('/api/games/filter', methods=['POST'])
def filter_games():
    """Advanced game filtering"""
    try:
        filters = request.get_json()

        if scanner and scanner.db:
            games = scanner.db.filter_games(
                platform=filters.get('platform'),
                genre=filters.get('genre'),
                search_query=filters.get('search_query'),
                show_hidden=filters.get('show_hidden', False),
                favorites_only=filters.get('favorites_only', False),
                sort_by=filters.get('sort_by', 'title'),
                sort_order=filters.get('sort_order', 'ASC')
            )
            return jsonify({'success': True, 'games': games})
        return jsonify({'error': 'Scanner not initialized'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Create data directory if it doesn't exist
    data_dir.mkdir(exist_ok=True)

    print("=" * 60)
    print("CoverFlow Game Scanner Server")
    print("=" * 60)
    print("\nServer starting on http://localhost:5000")
    print("\nAPI Endpoints:")
    print("  POST   /api/scan/start    - Start a game scan")
    print("  GET    /api/scan/status   - Get scan progress")
    print("  GET    /api/games         - Get all games")
    print("  GET    /api/games/count   - Get game counts")
    print("  GET    /health            - Health check")
    print("\nPress Ctrl+C to stop the server")
    print("=" * 60)
    print()

    app.run(host='localhost', port=5000, debug=False)
