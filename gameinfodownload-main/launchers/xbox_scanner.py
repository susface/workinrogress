"""
Xbox Store/Game Pass Scanner
Detects and extracts information about installed Xbox/Microsoft Store games
"""
import os
import re
import json
import subprocess
import requests
from pathlib import Path
from typing import List, Dict, Optional
import platform
import xml.etree.ElementTree as ET

try:
    from .icon_extractor import extract_game_icon
    ICON_EXTRACTOR_AVAILABLE = True
except ImportError:
    ICON_EXTRACTOR_AVAILABLE = False


class XboxScanner:
    """Scanner for Xbox Store and Game Pass games"""

    def __init__(self, icons_dir: Path, boxart_dir: Path):
        """
        Initialize Xbox/Microsoft Store scanner

        Args:
            icons_dir: Directory to save game icons
            boxart_dir: Directory to save box art
        """
        self.icons_dir = icons_dir
        self.boxart_dir = boxart_dir
        self.is_windows = platform.system() == 'Windows'

    def _get_uwp_apps_powershell(self) -> List[Dict]:
        """Get UWP apps using PowerShell (Windows only)"""
        if not self.is_windows:
            return []

        apps = []

        try:
            # PowerShell command to get installed packages
            ps_command = """
            Get-AppxPackage | Where-Object { $_.IsFramework -eq $false -and $_.SignatureKind -eq 'Store' } |
            Select-Object Name, PackageFullName, InstallLocation, Publisher, PublisherId |
            ConvertTo-Json
            """

            result = subprocess.run(
                ['powershell', '-Command', ps_command],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0 and result.stdout:
                data = json.loads(result.stdout)

                # Handle single result (not a list)
                if isinstance(data, dict):
                    data = [data]

                # Filter for games (common game publishers and patterns)
                game_patterns = [
                    'Microsoft.Xbox',
                    'Microsoft.Game',
                    '.Game',
                    'Studios',
                    'Games'
                ]

                for app in data:
                    name = app.get('Name', '')
                    package_name = app.get('PackageFullName', '')

                    # Basic filtering for game-like packages
                    if any(pattern in name or pattern in package_name for pattern in game_patterns):
                        apps.append(app)

        except Exception as e:
            print(f"Error getting UWP apps: {e}")

        return apps

    def _get_app_manifest_info(self, install_location: str) -> Dict:
        """Extract information from AppxManifest.xml"""
        info = {
            'display_name': '',
            'description': '',
            'publisher': '',
            'logo_path': ''
        }

        if not install_location:
            return info

        manifest_path = Path(install_location) / 'AppxManifest.xml'

        if not manifest_path.exists():
            return info

        try:
            tree = ET.parse(manifest_path)
            root = tree.getroot()

            # Define namespaces
            ns = {
                'default': 'http://schemas.microsoft.com/appx/manifest/foundation/windows10',
                'uap': 'http://schemas.microsoft.com/appx/manifest/uap/windows10',
                'mp': 'http://schemas.microsoft.com/appx/2014/phone/manifest'
            }

            # Try different namespace variations
            ns_variants = [
                {'default': 'http://schemas.microsoft.com/appx/manifest/foundation/windows10'},
                {'default': 'http://schemas.microsoft.com/appx/2010/manifest'},
                {}
            ]

            for namespace in ns_variants:
                try:
                    # Get Properties
                    properties = root.find('.//default:Properties', namespace) or root.find('.//Properties')
                    if properties is not None:
                        display_name = properties.find('.//default:DisplayName', namespace) or properties.find('.//DisplayName')
                        description = properties.find('.//default:Description', namespace) or properties.find('.//Description')
                        publisher = properties.find('.//default:PublisherDisplayName', namespace) or properties.find('.//PublisherDisplayName')
                        logo = properties.find('.//default:Logo', namespace) or properties.find('.//Logo')

                        if display_name is not None:
                            info['display_name'] = display_name.text or ''
                        if description is not None:
                            info['description'] = description.text or ''
                        if publisher is not None:
                            info['publisher'] = publisher.text or ''
                        if logo is not None:
                            logo_path = Path(install_location) / logo.text
                            if logo_path.exists():
                                info['logo_path'] = str(logo_path)

                        break
                except Exception as e:
                    # Continue trying other namespace variants
                    continue

        except Exception as e:
            print(f"Error parsing manifest: {e}")

        return info

    def _get_xbox_metadata(self, package_name: str, product_id: str = None) -> Dict:
        """Fetch metadata from Xbox/Microsoft Store"""
        metadata = {
            'description': '',
            'rating': '',
            'release_date': '',
            'developer': '',
            'publisher': '',
            'genres': [],
            'images': []
        }

        # Note: Microsoft Store API requires authentication for most endpoints
        # This is a simplified version that may not work for all games
        # A more robust solution would require OAuth and official API access

        try:
            # Try to extract product ID from package name
            if not product_id:
                # Product IDs are often in the package name
                match = re.search(r'([A-Z0-9]{12})', package_name)
                if match:
                    product_id = match.group(1)

            if product_id:
                # Microsoft Store catalog API (public, limited info)
                url = f"https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds={product_id}&market=US&languages=en-us"

                headers = {
                    'MS-CV': '0',
                    'Content-Type': 'application/json'
                }

                response = requests.get(url, headers=headers, timeout=10)

                if response.status_code == 200:
                    data = response.json()
                    products = data.get('Products', [])

                    if products:
                        product = products[0]

                        # Extract metadata
                        props = product.get('LocalizedProperties', [{}])[0]
                        desc = props.get('ShortDescription', '') or props.get('ProductDescription', '')
                        # Remove HTML tags
                        desc = re.sub(r'<[^>]+>', '', desc)
                        # Clean up extra whitespace
                        desc = ' '.join(desc.split())
                        # Limit to 300 characters for cleaner display
                        if len(desc) > 300:
                            desc = desc[:297] + '...'

                        metadata['description'] = desc
                        metadata['publisher'] = props.get('PublisherName', '')
                        metadata['developer'] = props.get('DeveloperName', '')

                        # Extract images
                        images = props.get('Images', [])
                        for img in images:
                            if img.get('ImagePurpose') in ['BoxArt', 'Poster', 'Logo']:
                                metadata['images'].append({
                                    'type': img.get('ImagePurpose'),
                                    'url': img.get('Uri', '')
                                })

        except Exception as e:
            print(f"Error fetching Xbox metadata: {e}")

        return metadata

    def _download_xbox_image(self, image_url: str, app_name: str, image_type: str) -> Optional[str]:
        """Download image from Microsoft CDN"""
        if not image_url:
            return None

        try:
            # Add width/height parameters if needed
            if '?' not in image_url:
                image_url += '?w=400&h=600'

            response = requests.get(image_url, timeout=10)
            if response.status_code == 200:
                # Sanitize filename
                safe_name = re.sub(r'[<>:"/\\|?*]', '_', app_name)

                if image_type == 'icon':
                    filename = f"xbox_{safe_name}_icon.jpg"
                    save_path = self.icons_dir / filename
                    relative_path = f"game_data/icons/{filename}"
                else:
                    filename = f"xbox_{safe_name}_boxart.jpg"
                    save_path = self.boxart_dir / filename
                    relative_path = f"game_data/boxart/{filename}"

                with open(save_path, 'wb') as f:
                    f.write(response.content)

                # Return relative path for URL construction
                return relative_path

        except Exception as e:
            print(f"Error downloading {image_type}: {e}")

        return None

    def _copy_local_icon(self, logo_path: str, app_name: str) -> Optional[str]:
        """Copy local UWP app icon"""
        if not logo_path or not Path(logo_path).exists():
            return None

        try:
            safe_name = re.sub(r'[<>:"/\\|?*]', '_', app_name)
            filename = f"xbox_{safe_name}_icon.png"
            dest_path = self.icons_dir / filename

            import shutil
            shutil.copy2(logo_path, dest_path)

            # Return relative path for URL construction
            return f"game_data/icons/{filename}"

        except Exception as e:
            print(f"Error copying icon: {e}")

        return None

    def scan_games(self) -> List[Dict]:
        """
        Scan for installed Xbox/Microsoft Store games

        Returns:
            List of dictionaries containing game information
        """
        if not self.is_windows:
            print("Xbox/Microsoft Store scanning is only available on Windows")
            return []

        games = []
        uwp_apps = self._get_uwp_apps_powershell()

        for app in uwp_apps:
            name = app.get('Name', '')
            package_name = app.get('PackageFullName', '')
            install_location = app.get('InstallLocation', '')

            if not name:
                continue

            # Get manifest info
            manifest_info = self._get_app_manifest_info(install_location)
            display_name = manifest_info.get('display_name') or name

            game_info = {
                'platform': 'xbox',
                'package_name': package_name,
                'title': display_name,
                'install_directory': install_location,
                'launch_command': f"shell:AppsFolder\\{package_name}!App",
                'publisher': manifest_info.get('publisher', ''),
                'description': manifest_info.get('description', '')
            }

            # Get online metadata
            print(f"  Fetching metadata for: {display_name}")
            metadata = self._get_xbox_metadata(package_name)

            # Merge metadata (prefer online data)
            if metadata.get('description'):
                game_info['description'] = metadata['description']
            if metadata.get('publisher'):
                game_info['publisher'] = metadata['publisher']

            game_info['developer'] = metadata.get('developer', '')
            game_info['genres'] = metadata.get('genres', [])

            # Handle images
            print(f"  Downloading assets for: {display_name}")
            icon_path = None
            boxart_path = None

            # Try to download from online metadata
            for image in metadata.get('images', []):
                img_url = image.get('url', '')
                img_type = image.get('type', '')

                if img_type == 'Logo' and not icon_path:
                    icon_path = self._download_xbox_image(img_url, display_name, 'icon')
                elif img_type in ['BoxArt', 'Poster'] and not boxart_path:
                    boxart_path = self._download_xbox_image(img_url, display_name, 'boxart')

            # Fallback to local logo
            if not icon_path and manifest_info.get('logo_path'):
                icon_path = self._copy_local_icon(manifest_info['logo_path'], display_name)

            # Fallback to Windows icon extraction if all else fails
            if not icon_path and not boxart_path and ICON_EXTRACTOR_AVAILABLE:
                install_dir = game_info.get('install_directory', '')
                if install_dir and os.path.exists(install_dir):
                    print(f"  Extracting icon from executable for: {display_name}")
                    safe_name = re.sub(r'[<>:"/\\|?*]', '_', display_name)
                    exe_icon_filename = f"xbox_{safe_name}_exe.png"
                    exe_icon_path = self.icons_dir / exe_icon_filename

                    extracted_path = extract_game_icon(install_dir, display_name, str(exe_icon_path))
                    if extracted_path:
                        icon_path = f"game_data/icons/{exe_icon_filename}"
                        boxart_path = icon_path
                        print(f"  ✓ Extracted icon from game executable")

            game_info['icon_path'] = icon_path
            game_info['boxart_path'] = boxart_path

            games.append(game_info)

        return games
