"""
Windows Icon Extractor
Extracts icons from Windows executables using Win32 API
"""
import os
import sys
from pathlib import Path
from typing import Optional
from PIL import Image
import io


def extract_icon_from_exe(exe_path: str, output_path: str, size: int = 256) -> Optional[str]:
    """
    Extract icon from Windows executable and save as image

    Args:
        exe_path: Path to the executable file
        output_path: Path to save the extracted icon
        size: Desired icon size (default 256x256)

    Returns:
        Path to the saved icon, or None if extraction failed
    """
    if sys.platform != 'win32':
        return None

    if not os.path.exists(exe_path):
        return None

    try:
        import win32api
        import win32con
        import win32ui
        import win32gui

        # Extract icon handle from exe
        ico_x = win32api.GetSystemMetrics(win32con.SM_CXICON)
        ico_y = win32api.GetSystemMetrics(win32con.SM_CYICON)

        # Try to extract large icon first
        large, small = win32gui.ExtractIconEx(exe_path, 0)

        if not large and not small:
            return None

        # Prefer large icon, fallback to small
        hicon = large[0] if large else small[0]

        # Create a device context
        hdc = win32ui.CreateDCFromHandle(win32gui.GetDC(0))
        hbmp = win32ui.CreateBitmap()
        hbmp.CreateCompatibleBitmap(hdc, ico_x, ico_y)
        hdc_bitmap = hdc.CreateCompatibleDC()

        hdc_bitmap.SelectObject(hbmp)
        hdc_bitmap.DrawIcon((0, 0), hicon)

        # Convert to PIL Image
        bmpstr = hbmp.GetBitmapBits(True)
        img = Image.frombuffer(
            'RGB',
            (ico_x, ico_y),
            bmpstr, 'raw', 'BGRX', 0, 1
        )

        # Resize if needed
        if size != ico_x or size != ico_y:
            img = img.resize((size, size), Image.Resampling.LANCZOS)

        # Save as PNG
        img.save(output_path, 'PNG')

        # Cleanup - Destroy all icon handles (ExtractIconEx returns copies)
        # Don't try to destroy the same handle twice
        try:
            if large:
                for icon in large:
                    try:
                        win32gui.DestroyIcon(icon)
                    except Exception as e:
                        print(f"Warning: Failed to destroy large icon handle: {e}")
            if small:
                for icon in small:
                    try:
                        win32gui.DestroyIcon(icon)
                    except Exception as e:
                        print(f"Warning: Failed to destroy small icon handle: {e}")
        except Exception as e:
            print(f"Warning: Icon cleanup failed (image already saved): {e}")

        return output_path

    except ImportError:
        # pywin32 not installed
        return None
    except Exception as e:
        print(f"Error extracting icon from {exe_path}: {e}")
        return None


def find_game_executable(install_dir: str, game_name: str) -> Optional[str]:
    """
    Find the main game executable in the installation directory
    Uses comprehensive search patterns to find executables in various directory structures

    Args:
        install_dir: Game installation directory
        game_name: Name of the game

    Returns:
        Path to the main executable, or None if not found
    """
    if not os.path.exists(install_dir):
        print(f"[ICON_EXTRACT] Install directory does not exist: {install_dir}")
        return None

    # Skip soundtracks and DLC that don't have executables
    soundtrack_keywords = ['soundtrack', 'ost', 'original sound', 'music', 'score']
    if any(keyword in game_name.lower() for keyword in soundtrack_keywords):
        print(f"[ICON_EXTRACT] Skipping soundtrack/music: {game_name}")
        return None

    # Skip common redistributables and middleware
    skip_keywords = ['redistributables', 'common redistributables', 'steamvr', 'vcredist',
                     'directx', 'dotnet', '_commonredist']
    if any(keyword in game_name.lower() for keyword in skip_keywords):
        print(f"[ICON_EXTRACT] Skipping redistributable: {game_name}")
        return None

    install_path = Path(install_dir)
    print(f"[ICON_EXTRACT] Searching for executable in: {install_dir}")
    print(f"[ICON_EXTRACT] Game name: {game_name}")

    # Generate common executable name patterns
    patterns = [
        f"{game_name}.exe",
        f"{game_name.replace(' ', '')}.exe",
        f"{game_name.replace(' ', '_')}.exe",
        f"{game_name.replace(' ', '-')}.exe",
        f"{game_name.replace(':', '')}.exe",
        f"{game_name.replace(':', '').replace(' ', '')}.exe",
        # Common abbreviations
        f"{''.join(word[0] for word in game_name.split())}.exe",  # Acronym
    ]

    # Try exact matches first in root directory
    print(f"[ICON_EXTRACT] Trying exact pattern matches in root...")
    for pattern in patterns:
        exe_path = install_path / pattern
        if exe_path.exists():
            print(f"[ICON_EXTRACT] [OK] Found exe via pattern match: {exe_path.name}")
            return str(exe_path)

    # Common subdirectories where games store executables (in priority order)
    common_subdirs = [
        'bin', 'Binaries', 'Game', 'Win64', 'x64', 'x86', 'Bin64', 'Bin',
        'Binaries/Win64', 'Binaries/Win32', 'Binaries/x64',
        '_windows', 'game/bin', 'Release',
        # Epic Games specific
        'FortniteGame/Binaries/Win64',  # Fortnite
        'Astro/Binaries/Win64',  # Some Epic games
        # Common indie game patterns
        'data', 'game', 'content'
    ]

    # Executables to exclude (not the main game)
    exclude_names = [
        'unins', 'uninstall', 'setup', 'launcher', 'updater', 'update',
        'crashreporter', 'crash', 'support', 'config', 'settings',
        'redist', 'install', 'activation', 'easyanticheat', 'battleye',
        'uplay', 'origin', 'epicgameslauncher', 'steam', 'ubisoft',
        'dx', 'vcredist', 'physx', 'redistributable', 'dotnet',
        'directx', '_be', '_eac'  # Anti-cheat
    ]

    # First, try looking in common subdirectories
    print(f"[ICON_EXTRACT] Searching in common subdirectories...")
    for subdir in common_subdirs:
        subdir_path = install_path / subdir
        if subdir_path.exists() and subdir_path.is_dir():
            print(f"[ICON_EXTRACT]   Checking: {subdir}")
            exe_files = list(subdir_path.glob("*.exe"))
            exe_files = [
                exe for exe in exe_files
                if not any(exclude in exe.stem.lower() for exclude in exclude_names)
            ]

            if exe_files:
                # Prefer the largest exe (usually the main game)
                exe_files.sort(key=lambda x: x.stat().st_size, reverse=True)
                print(f"[ICON_EXTRACT] [OK] Found exe in {subdir}: {exe_files[0].name}")
                return str(exe_files[0])

    # Look for any .exe in root directory (if we haven't checked yet)
    print(f"[ICON_EXTRACT] Searching root directory for any exe...")
    exe_files = list(install_path.glob("*.exe"))
    exe_files = [
        exe for exe in exe_files
        if not any(exclude in exe.stem.lower() for exclude in exclude_names)
    ]

    if exe_files:
        # Prefer the largest exe
        exe_files.sort(key=lambda x: x.stat().st_size, reverse=True)
        print(f"[ICON_EXTRACT] [OK] Found exe in root: {exe_files[0].name}")
        return str(exe_files[0])

    # Last resort: recursive search (max depth 3 to avoid going too deep)
    print(f"[ICON_EXTRACT] Performing recursive search (depth 3)...")
    all_exes = []

    def search_recursive(path: Path, depth: int = 0, max_depth: int = 3):
        if depth > max_depth:
            return

        try:
            for item in path.iterdir():
                if item.is_file() and item.suffix.lower() == '.exe':
                    # Skip excluded names
                    if not any(exclude in item.stem.lower() for exclude in exclude_names):
                        all_exes.append(item)
                elif item.is_dir():
                    # Skip some common non-game directories
                    skip_dirs = ['_commonredist', 'redist', '__installer', 'support', 'docs', 'manual']
                    if not any(skip in item.name.lower() for skip in skip_dirs):
                        search_recursive(item, depth + 1, max_depth)
        except (PermissionError, OSError):
            pass  # Skip directories we can't access

    search_recursive(install_path)

    if all_exes:
        # Prefer the largest executable (usually the main game)
        all_exes.sort(key=lambda x: x.stat().st_size, reverse=True)
        print(f"[ICON_EXTRACT] [OK] Found exe via recursive search: {all_exes[0]}")
        return str(all_exes[0])

    print(f"[ICON_EXTRACT] [NOT FOUND] No executable found for: {game_name}")
    return None


def extract_game_icon(install_dir: str, game_name: str, output_path: str) -> Optional[str]:
    """
    Find and extract icon from game executable

    Args:
        install_dir: Game installation directory
        game_name: Name of the game
        output_path: Path to save the extracted icon

    Returns:
        Path to the saved icon, or None if extraction failed
    """
    exe_path = find_game_executable(install_dir, game_name)

    if not exe_path:
        return None

    return extract_icon_from_exe(exe_path, output_path)
