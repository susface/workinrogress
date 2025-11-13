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
        self.conn = None
        self._connect()
        self._create_tables()

    def _connect(self):
        """Establish database connection"""
        if self.conn is None:
            self.conn = sqlite3.connect(self.db_path)
            self.conn.row_factory = sqlite3.Row

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
                is_favorite INTEGER DEFAULT 0,
                is_hidden INTEGER DEFAULT 0,
                launch_count INTEGER DEFAULT 0,
                last_played TIMESTAMP,
                total_play_time INTEGER DEFAULT 0,
                user_rating INTEGER,
                user_notes TEXT,
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

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_last_played ON games(last_played)
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_is_favorite ON games(is_favorite)
        ''')

        # Create game sessions table for detailed play time tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                duration INTEGER,
                FOREIGN KEY (game_id) REFERENCES games(id)
            )
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id)
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
            except (json.JSONDecodeError, TypeError, ValueError) as e:
                print(f"Warning: Failed to parse genres JSON: {e}")
                game['genres'] = []

        if game.get('metadata'):
            try:
                metadata = json.loads(game['metadata'])
                game.update(metadata)
            except (json.JSONDecodeError, TypeError, ValueError) as e:
                print(f"Warning: Failed to parse metadata JSON: {e}")

        return game

    def close(self):
        """Close the database connection"""
        if self.conn is not None:
            try:
                self.conn.close()
            except Exception as e:
                print(f"Warning: Error closing database connection: {e}")
            finally:
                self.conn = None

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()
        return False  # Don't suppress exceptions

    def __del__(self):
        """Destructor to ensure connection is closed"""
        self.close()

    # Play time tracking methods

    def start_game_session(self, game_id: int) -> int:
        """Start a new game session"""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO game_sessions (game_id, start_time)
            VALUES (?, CURRENT_TIMESTAMP)
        ''', (game_id,))

        # Update launch count and last played
        cursor.execute('''
            UPDATE games
            SET launch_count = launch_count + 1,
                last_played = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (game_id,))

        self.conn.commit()
        return cursor.lastrowid

    def end_game_session(self, session_id: int):
        """End a game session and calculate duration"""
        cursor = self.conn.cursor()
        cursor.execute('''
            UPDATE game_sessions
            SET end_time = CURRENT_TIMESTAMP,
                duration = (julianday(CURRENT_TIMESTAMP) - julianday(start_time)) * 86400
            WHERE id = ?
        ''', (session_id,))

        # Get the duration and game_id
        cursor.execute('''
            SELECT game_id, duration FROM game_sessions WHERE id = ?
        ''', (session_id,))
        result = cursor.fetchone()

        if result:
            game_id = result['game_id']
            duration = result['duration']

            # Update total play time
            cursor.execute('''
                UPDATE games
                SET total_play_time = total_play_time + ?
                WHERE id = ?
            ''', (int(duration), game_id))

        self.conn.commit()

    def get_play_time(self, game_id: int) -> Dict:
        """Get play time statistics for a game"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT
                total_play_time,
                launch_count,
                last_played,
                (SELECT COUNT(*) FROM game_sessions WHERE game_id = ?) as session_count
            FROM games
            WHERE id = ?
        ''', (game_id, game_id))

        result = cursor.fetchone()
        if result:
            return {
                'total_play_time': result['total_play_time'],
                'launch_count': result['launch_count'],
                'last_played': result['last_played'],
                'session_count': result['session_count'],
                'average_session_time': result['total_play_time'] / max(result['session_count'], 1)
            }
        return {}

    # Favorites and hidden games methods

    def toggle_favorite(self, game_id: int) -> bool:
        """Toggle favorite status of a game"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT is_favorite FROM games WHERE id = ?', (game_id,))
        result = cursor.fetchone()

        if result:
            new_status = 0 if result['is_favorite'] else 1
            cursor.execute('UPDATE games SET is_favorite = ? WHERE id = ?', (new_status, game_id))
            self.conn.commit()
            return bool(new_status)
        return False

    def set_favorite(self, game_id: int, is_favorite: bool):
        """Set favorite status of a game"""
        cursor = self.conn.cursor()
        cursor.execute('UPDATE games SET is_favorite = ? WHERE id = ?', (1 if is_favorite else 0, game_id))
        self.conn.commit()

    def toggle_hidden(self, game_id: int) -> bool:
        """Toggle hidden status of a game"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT is_hidden FROM games WHERE id = ?', (game_id,))
        result = cursor.fetchone()

        if result:
            new_status = 0 if result['is_hidden'] else 1
            cursor.execute('UPDATE games SET is_hidden = ? WHERE id = ?', (new_status, game_id))
            self.conn.commit()
            return bool(new_status)
        return False

    def set_hidden(self, game_id: int, is_hidden: bool):
        """Set hidden status of a game"""
        cursor = self.conn.cursor()
        cursor.execute('UPDATE games SET is_hidden = ? WHERE id = ?', (1 if is_hidden else 0, game_id))
        self.conn.commit()

    def get_favorites(self) -> List[Dict]:
        """Get all favorite games"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM games WHERE is_favorite = 1 ORDER BY title')
        rows = cursor.fetchall()
        return [self._row_to_dict(row) for row in rows]

    def get_hidden_games(self) -> List[Dict]:
        """Get all hidden games"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM games WHERE is_hidden = 1 ORDER BY title')
        rows = cursor.fetchall()
        return [self._row_to_dict(row) for row in rows]

    # User ratings and notes

    def set_rating(self, game_id: int, rating: int):
        """Set user rating for a game (1-5 stars)"""
        cursor = self.conn.cursor()
        cursor.execute('UPDATE games SET user_rating = ? WHERE id = ?', (rating, game_id))
        self.conn.commit()

    def set_notes(self, game_id: int, notes: str):
        """Set user notes for a game"""
        cursor = self.conn.cursor()
        cursor.execute('UPDATE games SET user_notes = ? WHERE id = ?', (notes, game_id))
        self.conn.commit()

    # Recently played and sorting methods

    def get_recently_played(self, limit: int = 10) -> List[Dict]:
        """Get recently played games"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT * FROM games
            WHERE last_played IS NOT NULL AND is_hidden = 0
            ORDER BY last_played DESC
            LIMIT ?
        ''', (limit,))
        rows = cursor.fetchall()
        return [self._row_to_dict(row) for row in rows]

    def get_most_played(self, limit: int = 10) -> List[Dict]:
        """Get most played games by total play time"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT * FROM games
            WHERE total_play_time > 0 AND is_hidden = 0
            ORDER BY total_play_time DESC
            LIMIT ?
        ''', (limit,))
        rows = cursor.fetchall()
        return [self._row_to_dict(row) for row in rows]

    def get_recently_added(self, limit: int = 10) -> List[Dict]:
        """Get recently added games"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT * FROM games
            WHERE is_hidden = 0
            ORDER BY created_at DESC
            LIMIT ?
        ''', (limit,))
        rows = cursor.fetchall()
        return [self._row_to_dict(row) for row in rows]

    # Duplicate detection

    def find_duplicates(self) -> List[Dict]:
        """Find duplicate games across platforms"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT title, COUNT(*) as count, GROUP_CONCAT(platform) as platforms, GROUP_CONCAT(id) as game_ids
            FROM games
            GROUP BY LOWER(TRIM(title))
            HAVING count > 1
            ORDER BY count DESC, title
        ''')

        rows = cursor.fetchall()
        duplicates = []

        for row in rows:
            duplicates.append({
                'title': row['title'],
                'count': row['count'],
                'platforms': row['platforms'].split(',') if row['platforms'] else [],
                'game_ids': [int(x) for x in row['game_ids'].split(',') if x]
            })

        return duplicates

    # Advanced filtering

    def filter_games(self,
                      platform: Optional[str] = None,
                      genre: Optional[str] = None,
                      search_query: Optional[str] = None,
                      show_hidden: bool = False,
                      favorites_only: bool = False,
                      sort_by: str = 'title',
                      sort_order: str = 'ASC') -> List[Dict]:
        """Advanced game filtering"""
        cursor = self.conn.cursor()

        query = 'SELECT * FROM games WHERE 1=1'
        params = []

        if not show_hidden:
            query += ' AND is_hidden = 0'

        if favorites_only:
            query += ' AND is_favorite = 1'

        if platform:
            query += ' AND platform = ?'
            params.append(platform)

        if search_query:
            query += ' AND (title LIKE ? OR description LIKE ? OR developer LIKE ?)'
            search_pattern = f'%{search_query}%'
            params.extend([search_pattern, search_pattern, search_pattern])

        if genre:
            query += ' AND genres LIKE ?'
            params.append(f'%{genre}%')

        # Add sorting
        valid_sort_fields = ['title', 'last_played', 'total_play_time', 'launch_count', 'created_at', 'release_date']
        if sort_by in valid_sort_fields:
            sort_order = 'ASC' if sort_order.upper() == 'ASC' else 'DESC'
            # Handle NULL values in sorting
            if sort_by in ['last_played', 'release_date']:
                query += f' ORDER BY {sort_by} IS NULL, {sort_by} {sort_order}'
            else:
                query += f' ORDER BY {sort_by} {sort_order}'
        else:
            query += ' ORDER BY title ASC'

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [self._row_to_dict(row) for row in rows]
