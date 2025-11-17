"""
Steam Game Scanner
Detects and extracts information about installed Steam games
"""
import os
import re
import vdf
import requests
import shutil
from pathlib import Path
from typing import List, Dict, Optional
import platform

try:
    from .icon_extractor import extract_game_icon
    ICON_EXTRACTOR_AVAILABLE = True
except ImportError:
    ICON_EXTRACTOR_AVAILABLE = False


class SteamScanner:
    """Scanner for Steam games"""

    # Common Steam installation paths by platform
    STEAM_PATHS = {
        'Windows': [
            Path(os.environ.get('PROGRAMFILES(X86)', 'C:\\Program Files (x86)')) / 'Steam',
            Path(os.environ.get('PROGRAMFILES', 'C:\\Program Files')) / 'Steam',
            Path.home() / 'AppData' / 'Local' / 'Programs' / 'Steam'
        ],
        'Linux': [
            Path.home() / '.steam' / 'steam',
            Path.home() / '.local' / 'share' / 'Steam',
            Path('/usr/share/steam'),
            Path('/usr/local/share/steam')
        ],
        'Darwin': [  # macOS
            Path.home() / 'Library' / 'Application Support' / 'Steam'
        ]
    }

    def __init__(self, icons_dir: Path, boxart_dir: Path):
        """
        Initialize Steam scanner

        Args:
            icons_dir: Directory to save game icons
            boxart_dir: Directory to save box art
        """
        self.icons_dir = icons_dir
        self.boxart_dir = boxart_dir
        self.steam_path = self._find_steam_installation()
        self.library_folders = []

        if self.steam_path:
            self.library_folders = self._find_library_folders()

    def _find_steam_installation(self) -> Optional[Path]:
        """Find Steam installation directory"""
        system = platform.system()
        paths = self.STEAM_PATHS.get(system, [])

        for path in paths:
            if path.exists():
                # Verify it's actually Steam by checking for steamapps
                if (path / 'steamapps').exists():
                    return path

        return None

    def _find_library_folders(self) -> List[Path]:
        """Find all Steam library folders"""
        if not self.steam_path:
            return []

        library_folders = [self.steam_path]

        # Parse libraryfolders.vdf to find additional library locations
        vdf_path = self.steam_path / 'steamapps' / 'libraryfolders.vdf'

        if vdf_path.exists():
            try:
                with open(vdf_path, 'r', encoding='utf-8') as f:
                    data = vdf.load(f)

                # Parse library folders
                if 'libraryfolders' in data:
                    for key, value in data['libraryfolders'].items():
                        if isinstance(value, dict) and 'path' in value:
                            lib_path = Path(value['path'])
                            if lib_path.exists():
                                library_folders.append(lib_path)

            except Exception as e:
                print(f"Error parsing libraryfolders.vdf: {e}")

        return library_folders

    def _parse_acf_file(self, acf_path: Path) -> Optional[Dict]:
        """Parse a Steam .acf file to extract game information"""
        try:
            with open(acf_path, 'r', encoding='utf-8') as f:
                data = vdf.load(f)

            app_state = data.get('AppState', {})
            return app_state

        except Exception as e:
            print(f"Error parsing {acf_path}: {e}")
            return None

    def _get_game_metadata(self, app_id: str) -> Dict:
        """Fetch game metadata from Steam API"""
        metadata = {
            'description': '',
            'short_description': '',
            'developers': [],
            'publishers': [],
            'release_date': '',
            'genres': [],
            'has_vr_support': 0
        }

        try:
            # Steam Store API - Force English language
            url = f"https://store.steampowered.com/api/appdetails?appids={app_id}&cc=us&l=english"
            response = requests.get(url, timeout=10)

            if response.status_code == 200:
                data = response.json()
                if data.get(app_id, {}).get('success'):
                    game_data = data[app_id]['data']

                    # Use short_description as primary, clean HTML tags
                    short_desc = game_data.get('short_description', '')
                    # Remove HTML tags
                    short_desc = re.sub(r'<[^>]+>', '', short_desc)
                    # Clean up extra whitespace
                    short_desc = ' '.join(short_desc.split())
                    # Limit to 300 characters for cleaner display
                    if len(short_desc) > 300:
                        short_desc = short_desc[:297] + '...'

                    metadata['description'] = short_desc
                    metadata['short_description'] = short_desc
                    metadata['developers'] = game_data.get('developers', [])
                    metadata['publishers'] = game_data.get('publishers', [])

                    release = game_data.get('release_date', {})
                    metadata['release_date'] = release.get('date', '')

                    genres = game_data.get('genres', [])
                    metadata['genres'] = [g.get('description', '') for g in genres]

                    # Check for VR support
                    # Steam API provides categories that include VR-related info
                    categories = game_data.get('categories', [])
                    vr_categories = [28, 29, 30, 31]  # VR Supported, VR Only, VR - Tracked Motion Controllers, VR - Gamepad
                    has_vr = any(cat.get('id') in vr_categories for cat in categories)

                    # Also check platforms for vr_support field
                    platforms = game_data.get('platforms', {})
                    vr_support_info = game_data.get('vr_support', {})

                    # Mark as VR if any VR-related data is present
                    if has_vr or vr_support_info or platforms.get('vr_support'):
                        metadata['has_vr_support'] = 1

        except Exception as e:
            print(f"Error fetching metadata for app {app_id}: {e}")

        return metadata

    def _download_icon(self, app_id: str, game_name: str) -> Optional[str]:
        """Download game icon"""
        try:
            # Steam icon URL format
            icon_url = f"https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/{app_id}/icon.jpg"

            response = requests.get(icon_url, timeout=10)
            if response.status_code == 200:
                # Sanitize filename
                safe_name = re.sub(r'[<>:"/\\|?*]', '_', game_name)
                filename = f"steam_{app_id}_{safe_name}.jpg"
                icon_path = self.icons_dir / filename

                with open(icon_path, 'wb') as f:
                    f.write(response.content)

                # Return relative path for URL construction
                return f"game_data/icons/{filename}"

        except Exception as e:
            print(f"Error downloading icon for {game_name}: {e}")

        return None

    def _download_boxart(self, app_id: str, game_name: str) -> Optional[str]:
        """Download game box art (library card image for vertical display in grid mode)"""
        try:
            # Library card image (600x900 - vertical format, for grid view)
            boxart_url = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/library_600x900.jpg"

            response = requests.get(boxart_url, timeout=10)
            if response.status_code == 200:
                # Sanitize filename
                safe_name = re.sub(r'[<>:"/\\|?*]', '_', game_name)
                filename = f"steam_{app_id}_{safe_name}_card.jpg"
                boxart_path = self.boxart_dir / filename

                with open(boxart_path, 'wb') as f:
                    f.write(response.content)

                # Return relative path for URL construction
                return f"game_data/boxart/{filename}"

        except Exception as e:
            print(f"Error downloading box art for {game_name}: {e}")

        return None

    def _download_header(self, app_id: str, game_name: str) -> Optional[str]:
        """Download game header image (horizontal format for coverflow mode)"""
        try:
            # Header image (460x215 - horizontal format, for coverflow)
            header_url = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg"

            response = requests.get(header_url, timeout=10)
            if response.status_code == 200:
                # Sanitize filename
                safe_name = re.sub(r'[<>:"/\\|?*]', '_', game_name)
                filename = f"steam_{app_id}_{safe_name}_header.jpg"
                header_path = self.boxart_dir / filename

                with open(header_path, 'wb') as f:
                    f.write(response.content)

                # Return relative path for URL construction
                return f"game_data/boxart/{filename}"

        except Exception as e:
            print(f"Error downloading header for {game_name}: {e}")

        return None

    def scan_games(self) -> List[Dict]:
        """
        Scan for installed Steam games

        Returns:
            List of dictionaries containing game information
        """
        if not self.steam_path:
            print("Steam installation not found")
            return []

        games = []

        for library_path in self.library_folders:
            steamapps_path = library_path / 'steamapps'

            if not steamapps_path.exists():
                continue

            # Find all .acf files
            for acf_file in steamapps_path.glob('appmanifest_*.acf'):
                app_state = self._parse_acf_file(acf_file)

                if not app_state:
                    continue

                app_id = app_state.get('appid', '')
                name = app_state.get('name', '')
                install_dir = app_state.get('installdir', '')

                if not app_id or not name:
                    continue

                # Build game information
                game_info = {
                    'platform': 'steam',
                    'app_id': app_id,
                    'title': name,
                    'install_directory': str(steamapps_path / 'common' / install_dir),
                    'launch_command': f"steam://rungameid/{app_id}",
                    'size_on_disk': app_state.get('SizeOnDisk', 0),
                    'last_updated': app_state.get('LastUpdated', 0)
                }

                # Get metadata
                print(f"  Fetching metadata for: {name}")
                metadata = self._get_game_metadata(app_id)
                game_info.update(metadata)

                # Convert lists to strings for database storage
                if 'developers' in game_info and isinstance(game_info['developers'], list):
                    game_info['developer'] = ', '.join(game_info['developers']) if game_info['developers'] else ''
                    del game_info['developers']

                if 'publishers' in game_info and isinstance(game_info['publishers'], list):
                    game_info['publisher'] = ', '.join(game_info['publishers']) if game_info['publishers'] else ''
                    del game_info['publishers']

                # Download all art assets
                print(f"  Downloading assets for: {name}")
                icon_path = self._download_icon(app_id, name)  # Steam icon (small, for backwards compat)
                boxart_path = self._download_boxart(app_id, name)  # Vertical card art (for grid mode)
                header_path = self._download_header(app_id, name)  # Horizontal header (for coverflow)

                # Always extract executable icon for thumbnails (if available)
                exe_icon_path = None
                if ICON_EXTRACTOR_AVAILABLE:
                    install_dir = game_info.get('install_directory', '')
                    if install_dir and os.path.exists(install_dir):
                        print(f"  Extracting icon from executable for: {name}")
                        # Sanitize filename
                        safe_name = re.sub(r'[<>:"/\\|?*]', '_', name)
                        exe_icon_filename = f"steam_{app_id}_{safe_name}_exe.png"
                        exe_icon_file_path = self.icons_dir / exe_icon_filename

                        extracted_path = extract_game_icon(install_dir, name, str(exe_icon_file_path))
                        if extracted_path:
                            exe_icon_path = f"game_data/icons/{exe_icon_filename}"
                            print(f"  [OK] Extracted icon from game executable")

                # Store all image paths
                game_info['icon_path'] = icon_path
                game_info['boxart_path'] = boxart_path
                game_info['header_path'] = header_path
                game_info['exe_icon_path'] = exe_icon_path

                games.append(game_info)

        return games
