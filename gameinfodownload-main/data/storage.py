"""
Database storage for game information
Uses SQLite for persistent storage of game data
"""
import sqlite3
import json
from typing import Dict, List, Optional
from datetime import datetime


class GameDatabase:
    """SQLite database for storing game information"""

    def __init__(self, db_path: str):
        """
        Initialize the database

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self._create_tables()

    def _create_tables(self):
        """Create database tables if they don't exist"""
        cursor = self.conn.cursor()

        # Main games table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform TEXT NOT NULL,
                title TEXT NOT NULL,
                app_id TEXT,
                package_name TEXT,
                install_directory TEXT,
                launch_command TEXT,
                description TEXT,
                short_description TEXT,
                long_description TEXT,
                developer TEXT,
                publisher TEXT,
                release_date TEXT,
                icon_path TEXT,
                boxart_path TEXT,
                size_on_disk INTEGER,
                last_updated INTEGER,
                genres TEXT,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(platform, title)
            )
        ''')

        # Index for faster lookups
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_platform ON games(platform)
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_title ON games(title)
        ''')

        self.conn.commit()

    def save_game(self, game_data: Dict) -> int:
        """
        Save or update game information

        Args:
            game_data: Dictionary containing game information

        Returns:
            The ID of the saved game
        """
        cursor = self.conn.cursor()

        # Convert lists to JSON strings
        genres = json.dumps(game_data.get('genres', []))

        # Store additional metadata as JSON
        metadata_fields = {}
        for key, value in game_data.items():
            if key not in ['platform', 'title', 'app_id', 'package_name', 'install_directory',
                          'launch_command', 'description', 'short_description', 'long_description',
                          'developer', 'publisher', 'release_date', 'icon_path', 'boxart_path',
                          'size_on_disk', 'last_updated', 'genres']:
                metadata_fields[key] = value

        metadata = json.dumps(metadata_fields)

        # Prepare data
        data = {
            'platform': game_data.get('platform', ''),
            'title': game_data.get('title', ''),
            'app_id': game_data.get('app_id', ''),
            'package_name': game_data.get('package_name', ''),
            'install_directory': game_data.get('install_directory', ''),
            'launch_command': game_data.get('launch_command', ''),
            'description': game_data.get('description', ''),
            'short_description': game_data.get('short_description', ''),
            'long_description': game_data.get('long_description', ''),
            'developer': game_data.get('developer', ''),
            'publisher': game_data.get('publisher', ''),
            'release_date': game_data.get('release_date', ''),
            'icon_path': game_data.get('icon_path', ''),
            'boxart_path': game_data.get('boxart_path', ''),
            'size_on_disk': game_data.get('size_on_disk', 0),
            'last_updated': game_data.get('last_updated', 0),
            'genres': genres,
            'metadata': metadata
        }

        # Insert or replace
        cursor.execute('''
            INSERT OR REPLACE INTO games (
                platform, title, app_id, package_name, install_directory,
                launch_command, description, short_description, long_description,
                developer, publisher, release_date, icon_path, boxart_path,
                size_on_disk, last_updated, genres, metadata, updated_at
            ) VALUES (
                :platform, :title, :app_id, :package_name, :install_directory,
                :launch_command, :description, :short_description, :long_description,
                :developer, :publisher, :release_date, :icon_path, :boxart_path,
                :size_on_disk, :last_updated, :genres, :metadata, CURRENT_TIMESTAMP
            )
        ''', data)

        self.conn.commit()
        return cursor.lastrowid

    def get_game_by_id(self, game_id: int) -> Optional[Dict]:
        """Get a game by its database ID"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM games WHERE id = ?', (game_id,))
        row = cursor.fetchone()

        if row:
            return self._row_to_dict(row)
        return None

    def get_game_by_title(self, title: str) -> Optional[Dict]:
        """Get a game by its title"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM games WHERE title LIKE ?', (f'%{title}%',))
        row = cursor.fetchone()

        if row:
            return self._row_to_dict(row)
        return None

    def get_games_by_platform(self, platform: str) -> List[Dict]:
        """Get all games from a specific platform"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM games WHERE platform = ? ORDER BY title', (platform,))
        rows = cursor.fetchall()

        return [self._row_to_dict(row) for row in rows]

    def get_all_games(self) -> List[Dict]:
        """Get all games from the database"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM games ORDER BY platform, title')
        rows = cursor.fetchall()

        return [self._row_to_dict(row) for row in rows]

    def search_games(self, query: str) -> List[Dict]:
        """Search games by title or description"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT * FROM games
            WHERE title LIKE ? OR description LIKE ?
            ORDER BY title
        ''', (f'%{query}%', f'%{query}%'))
        rows = cursor.fetchall()

        return [self._row_to_dict(row) for row in rows]

    def delete_game(self, game_id: int) -> bool:
        """Delete a game from the database"""
        cursor = self.conn.cursor()
        cursor.execute('DELETE FROM games WHERE id = ?', (game_id,))
        self.conn.commit()
        return cursor.rowcount > 0

    def get_statistics(self) -> Dict:
        """Get statistics about the game library"""
        cursor = self.conn.cursor()

        # Total games
        cursor.execute('SELECT COUNT(*) as total FROM games')
        total = cursor.fetchone()['total']

        # Games per platform
        cursor.execute('''
            SELECT platform, COUNT(*) as count
            FROM games
            GROUP BY platform
        ''')
        platforms = {row['platform']: row['count'] for row in cursor.fetchall()}

        # Total size
        cursor.execute('SELECT SUM(size_on_disk) as total_size FROM games')
        total_size = cursor.fetchone()['total_size'] or 0

        return {
            'total_games': total,
            'platforms': platforms,
            'total_size_bytes': total_size,
            'total_size_gb': round(total_size / (1024**3), 2)
        }

    def _row_to_dict(self, row: sqlite3.Row) -> Dict:
        """Convert a database row to a dictionary"""
        game = dict(row)

        # Parse JSON fields
        if game.get('genres'):
            try:
                game['genres'] = json.loads(game['genres'])
            except:
                game['genres'] = []

        if game.get('metadata'):
            try:
                metadata = json.loads(game['metadata'])
                game.update(metadata)
            except:
                pass

        return game

    def close(self):
        """Close the database connection"""
        self.conn.close()

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()
