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


class EpicScanner:
    """Scanner for Epic Games Launcher games"""

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
            for manifest_file in self.manifests_path.glob('*.item'):
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
                    if metadata.get('icon_url'):
                        icon_path = self._download_epic_image(metadata['icon_url'], display_name, 'icon')
                        game_info['icon_path'] = icon_path

                    if metadata.get('boxart_url'):
                        boxart_path = self._download_epic_image(metadata['boxart_url'], display_name, 'boxart')
                        game_info['boxart_path'] = boxart_path
                else:
                    game_info['icon_path'] = None
                    game_info['boxart_path'] = None

                games.append(game_info)

        # Method 2: Fallback to LauncherInstalled.dat
        if not games:
            installed_data = self._get_launcher_installed_data()
            for install in installed_data:
                app_name = install.get('AppName', '')
                display_name = install.get('InstallLocation', '').split(os.sep)[-1]

                game_info = {
                    'platform': 'epic',
                    'app_name': app_name,
                    'title': display_name or app_name,
                    'install_directory': install.get('InstallLocation', ''),
                    'launch_command': f"com.epicgames.launcher://apps/{app_name}?action=launch&silent=true",
                    'namespace': install.get('NamespaceId', ''),
                    'icon_path': None,
                    'boxart_path': None,
                    'description': ''
                }

                games.append(game_info)

        return games
