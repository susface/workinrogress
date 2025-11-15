"""
Epic Games Launcher Scanner
Detects and extracts information about installed Epic Games
"""
import json
import os
import re
import requests
from pathlib import Path
from typing import List, Dict, Optional
import platform

try:
    from .icon_extractor import extract_game_icon
    ICON_EXTRACTOR_AVAILABLE = True
except ImportError:
    ICON_EXTRACTOR_AVAILABLE = False


class EpicScanner:
    """Scanner for Epic Games Launcher games"""

    # Metadata enrichment for popular games
    GAME_METADATA_ENRICHMENT = {
        'Fortnite': {
            'developer': 'Epic Games',
            'publisher': 'Epic Games',
            'release_date': '2017-07-25',
            'genres': ['Battle Royale', 'Third-Person Shooter', 'Survival'],
            'description': 'Fortnite is a free-to-play battle royale game where 100 players fight to be the last one standing. Features building mechanics, frequent content updates, and crossover events with popular franchises.',
            'short_description': 'Free-to-play battle royale with building mechanics and 100-player matches'
        },
        'Rocket League': {
            'developer': 'Psyonix',
            'publisher': 'Epic Games',
            'release_date': '2015-07-07',
            'genres': ['Sports', 'Racing', 'Multiplayer'],
            'description': 'Rocket League is a high-powered hybrid of arcade-style soccer and vehicular mayhem with easy-to-understand controls and fluid, physics-driven competition.',
            'short_description': 'Vehicular soccer with arcade-style gameplay'
        },
        'Fall Guys': {
            'developer': 'Mediatonic',
            'publisher': 'Epic Games',
            'release_date': '2020-08-04',
            'genres': ['Party', 'Battle Royale', 'Platformer'],
            'description': 'Fall Guys is a massively multiplayer party game with up to 60 players online in a free-for-all struggle through round after round of escalating chaos.',
            'short_description': 'Massively multiplayer party game with obstacle courses'
        }
    }

    # Common Epic Games Launcher paths by platform
    EPIC_PATHS = {
        'Windows': [
            Path(os.environ.get('PROGRAMDATA', 'C:\\ProgramData')) / 'Epic' / 'EpicGamesLauncher' / 'Data' / 'Manifests',
            Path(os.environ.get('PROGRAMDATA', 'C:\\ProgramData')) / 'Epic' / 'UnrealEngineLauncher' / 'LauncherInstalled.dat'
        ],
        'Linux': [
            Path.home() / '.config' / 'Epic' / 'EpicGamesLauncher' / 'Data' / 'Manifests'
        ],
        'Darwin': [  # macOS
            Path.home() / 'Library' / 'Application Support' / 'Epic' / 'EpicGamesLauncher' / 'Data' / 'Manifests'
        ]
    }

    def __init__(self, icons_dir: Path, boxart_dir: Path):
        """
        Initialize Epic Games scanner

        Args:
            icons_dir: Directory to save game icons
            boxart_dir: Directory to save box art
        """
        self.icons_dir = icons_dir
        self.boxart_dir = boxart_dir
        self.manifests_path = self._find_manifests_directory()

    def _find_manifests_directory(self) -> Optional[Path]:
        """Find Epic Games manifests directory"""
        system = platform.system()
        paths = self.EPIC_PATHS.get(system, [])

        for path in paths:
            if path.exists() and path.is_dir():
                # Check if it's the manifests directory
                if path.name == 'Manifests':
                    return path

        return None

    def _enrich_game_metadata(self, game_info: Dict) -> None:
        """
        Enrich game metadata with additional information for well-known games

        Args:
            game_info: Dictionary containing game information (modified in-place)
        """
        title = game_info.get('title', '')

        # Check if this is a known game that needs metadata enrichment
        for known_game, enrichment in self.GAME_METADATA_ENRICHMENT.items():
            if known_game.lower() in title.lower():
                print(f"  ✓ Enriching metadata for {known_game}")
                # Only add fields if they don't already exist or are empty
                for key, value in enrichment.items():
                    if not game_info.get(key):
                        game_info[key] = value
                break

    def _parse_manifest(self, manifest_path: Path) -> Optional[Dict]:
        """Parse an Epic Games manifest file"""
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data
        except Exception as e:
            print(f"Error parsing {manifest_path}: {e}")
            return None

    def _get_launcher_installed_data(self) -> List[Dict]:
        """Get installed games from LauncherInstalled.dat (alternative method)"""
        system = platform.system()
        games = []

        if system == 'Windows':
            launcher_data_path = Path(os.environ.get('PROGRAMDATA', 'C:\\ProgramData')) / 'Epic' / 'UnrealEngineLauncher' / 'LauncherInstalled.dat'

            if launcher_data_path.exists():
                try:
                    with open(launcher_data_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)

                    installations = data.get('InstallationList', [])
                    for install in installations:
                        if install.get('AppName'):
                            games.append(install)

                except Exception as e:
                    print(f"Error reading LauncherInstalled.dat: {e}")

        return games

    def _download_epic_image(self, image_url: str, app_name: str, image_type: str) -> Optional[str]:
        """Download image from Epic Games CDN"""
        if not image_url:
            return None

        try:
            response = requests.get(image_url, timeout=10)
            if response.status_code == 200:
                # Sanitize filename
                safe_name = re.sub(r'[<>:"/\\|?*]', '_', app_name)

                if image_type == 'icon':
                    filename = f"epic_{safe_name}_icon.jpg"
                    save_path = self.icons_dir / filename
                    relative_path = f"game_data/icons/{filename}"
                else:
                    filename = f"epic_{safe_name}_boxart.jpg"
                    save_path = self.boxart_dir / filename
                    relative_path = f"game_data/boxart/{filename}"

                with open(save_path, 'wb') as f:
                    f.write(response.content)

                # Return relative path for URL construction
                return relative_path

        except Exception as e:
            print(f"Error downloading {image_type} for {app_name}: {e}")

        return None

    def _get_epic_metadata(self, namespace: str, catalog_item_id: str, app_name: str) -> Dict:
        """Fetch metadata from Epic Games API"""
        metadata = {
            'description': '',
            'long_description': '',
            'developer': '',
            'publisher': '',
            'release_date': '',
            'genres': [],
            'icon_url': '',
            'boxart_url': ''
        }

        try:
            # Epic Games GraphQL API endpoint
            url = "https://graphql.epicgames.com/graphql"

            query = """
            query catalogQuery($namespace: String!, $itemId: String!) {
                Catalog {
                    catalogOffer(namespace: $namespace, id: $itemId) {
                        title
                        description
                        longDescription
                        keyImages {
                            type
                            url
                        }
                        seller {
                            name
                        }
                        developer
                        publisherDisplayName
                        releaseDate
                        tags {
                            name
                        }
                    }
                }
            }
            """

            variables = {
                "namespace": namespace,
                "itemId": catalog_item_id
            }

            headers = {
                "Content-Type": "application/json"
            }

            response = requests.post(
                url,
                json={"query": query, "variables": variables},
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                offer = data.get('data', {}).get('Catalog', {}).get('catalogOffer', {})

                if offer:
                    # Prefer shorter description, clean HTML tags
                    desc = offer.get('description', '') or offer.get('longDescription', '')
                    # Remove HTML tags
                    desc = re.sub(r'<[^>]+>', '', desc)
                    # Clean up extra whitespace
                    desc = ' '.join(desc.split())
                    # Limit to 300 characters for cleaner display
                    if len(desc) > 300:
                        desc = desc[:297] + '...'

                    metadata['description'] = desc
                    metadata['long_description'] = offer.get('longDescription', '')
                    metadata['developer'] = offer.get('developer', '')
                    metadata['publisher'] = offer.get('publisherDisplayName', '')
                    metadata['release_date'] = offer.get('releaseDate', '')

                    # Extract genres from tags
                    tags = offer.get('tags', [])
                    metadata['genres'] = [tag.get('name', '') for tag in tags if tag.get('name')]

                    # Extract images
                    key_images = offer.get('keyImages', [])
                    for image in key_images:
                        img_type = image.get('type', '')
                        img_url = image.get('url', '')

                        if img_type == 'DieselGameBoxTall' or img_type == 'DieselGameBox':
                            metadata['boxart_url'] = img_url
                        elif img_type == 'DieselGameBoxLogo' or img_type == 'Thumbnail':
                            metadata['icon_url'] = img_url

        except Exception as e:
            print(f"Error fetching Epic metadata: {e}")

        return metadata

    def scan_games(self) -> List[Dict]:
        """
        Scan for installed Epic Games

        Returns:
            List of dictionaries containing game information
        """
        games = []

        # Method 1: Scan manifest files
        if self.manifests_path:
            print(f"  Found Epic Games manifests directory: {self.manifests_path}")
            manifest_files = list(self.manifests_path.glob('*.item'))
            print(f"  Found {len(manifest_files)} manifest files")

            for manifest_file in manifest_files:
                manifest = self._parse_manifest(manifest_file)

                if not manifest:
                    continue

                app_name = manifest.get('AppName', '')
                display_name = manifest.get('DisplayName', '')
                install_location = manifest.get('InstallLocation', '')
                catalog_namespace = manifest.get('CatalogNamespace', '')
                catalog_item_id = manifest.get('CatalogItemId', '')
                launch_executable = manifest.get('LaunchExecutable', '')

                if not app_name:
                    continue

                game_info = {
                    'platform': 'epic',
                    'app_name': app_name,
                    'title': display_name or app_name,
                    'install_directory': install_location,
                    'launch_command': f"com.epicgames.launcher://apps/{app_name}?action=launch&silent=true",
                    'launch_executable': launch_executable,
                    'namespace': catalog_namespace,
                    'catalog_item_id': catalog_item_id
                }

                # Get metadata
                print(f"  Fetching metadata for: {display_name}")
                if catalog_namespace and catalog_item_id:
                    metadata = self._get_epic_metadata(catalog_namespace, catalog_item_id, app_name)
                    game_info.update(metadata)

                    # Download images
                    print(f"  Downloading assets for: {display_name}")
                    icon_path = None
                    boxart_path = None

                    if metadata.get('icon_url'):
                        icon_path = self._download_epic_image(metadata['icon_url'], display_name, 'icon')

                    if metadata.get('boxart_url'):
                        boxart_path = self._download_epic_image(metadata['boxart_url'], display_name, 'boxart')

                    # Fallback to Windows icon extraction if downloads failed
                    if not icon_path and not boxart_path and ICON_EXTRACTOR_AVAILABLE:
                        if install_location and os.path.exists(install_location):
                            print(f"  Extracting icon from executable for: {display_name}")
                            safe_name = re.sub(r'[<>:"/\\|?*]', '_', display_name)
                            exe_icon_filename = f"epic_{safe_name}_exe.png"
                            exe_icon_path = self.icons_dir / exe_icon_filename

                            extracted_path = extract_game_icon(install_location, display_name, str(exe_icon_path))
                            if extracted_path:
                                icon_path = f"game_data/icons/{exe_icon_filename}"
                                boxart_path = icon_path
                                print(f"  ✓ Extracted icon from game executable")

                    game_info['icon_path'] = icon_path
                    game_info['boxart_path'] = boxart_path
                else:
                    game_info['icon_path'] = None
                    game_info['boxart_path'] = None

                    # Try Windows icon extraction even if metadata not available
                    if ICON_EXTRACTOR_AVAILABLE and install_location and os.path.exists(install_location):
                        print(f"  Extracting icon from executable for: {display_name}")
                        safe_name = re.sub(r'[<>:"/\\|?*]', '_', display_name)
                        exe_icon_filename = f"epic_{safe_name}_exe.png"
                        exe_icon_path = self.icons_dir / exe_icon_filename

                        extracted_path = extract_game_icon(install_location, display_name, str(exe_icon_path))
                        if extracted_path:
                            game_info['icon_path'] = f"game_data/icons/{exe_icon_filename}"
                            game_info['boxart_path'] = game_info['icon_path']
                            print(f"  ✓ Extracted icon from game executable")

                # Enrich metadata for well-known games
                self._enrich_game_metadata(game_info)

                games.append(game_info)

        # Method 2: Fallback to LauncherInstalled.dat
        if not games:
            if not self.manifests_path:
                print("  Epic Games manifests directory not found. Trying LauncherInstalled.dat...")
            else:
                print("  No games found in manifests. Trying LauncherInstalled.dat...")
            installed_data = self._get_launcher_installed_data()
            for install in installed_data:
                app_name = install.get('AppName', '')
                display_name = install.get('InstallLocation', '').split(os.sep)[-1]

                install_dir = install.get('InstallLocation', '')

                game_info = {
                    'platform': 'epic',
                    'app_name': app_name,
                    'title': display_name or app_name,
                    'install_directory': install_dir,
                    'launch_command': f"com.epicgames.launcher://apps/{app_name}?action=launch&silent=true",
                    'namespace': install.get('NamespaceId', ''),
                    'icon_path': None,
                    'boxart_path': None,
                    'description': ''
                }

                # Try Windows icon extraction
                if ICON_EXTRACTOR_AVAILABLE and install_dir and os.path.exists(install_dir):
                    print(f"  Extracting icon from executable for: {display_name or app_name}")
                    safe_name = re.sub(r'[<>:"/\\|?*]', '_', display_name or app_name)
                    exe_icon_filename = f"epic_{safe_name}_exe.png"
                    exe_icon_path = self.icons_dir / exe_icon_filename

                    extracted_path = extract_game_icon(install_dir, display_name or app_name, str(exe_icon_path))
                    if extracted_path:
                        game_info['icon_path'] = f"game_data/icons/{exe_icon_filename}"
                        game_info['boxart_path'] = game_info['icon_path']
                        print(f"  ✓ Extracted icon from game executable")

                # Enrich metadata for well-known games
                self._enrich_game_metadata(game_info)

                games.append(game_info)

        return games
