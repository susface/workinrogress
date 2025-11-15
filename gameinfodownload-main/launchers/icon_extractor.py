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
                    except:
                        pass  # Handle already destroyed
            if small:
                for icon in small:
                    try:
                        win32gui.DestroyIcon(icon)
                    except:
                        pass  # Handle already destroyed
        except:
            pass  # Cleanup failed, but we already saved the image

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

    Args:
        install_dir: Game installation directory
        game_name: Name of the game

    Returns:
        Path to the main executable, or None if not found
    """
    if not os.path.exists(install_dir):
        return None

    install_path = Path(install_dir)

    # Common executable patterns
    patterns = [
        f"{game_name}.exe",
        f"{game_name.replace(' ', '')}.exe",
        f"{game_name.replace(' ', '_')}.exe",
        f"{game_name.replace(':', '')}.exe",
    ]

    # Try exact matches first
    for pattern in patterns:
        exe_path = install_path / pattern
        if exe_path.exists():
            return str(exe_path)

    # Look for any .exe in root directory
    exe_files = list(install_path.glob("*.exe"))

    # Filter out common non-game executables
    exclude_names = [
        'unins', 'uninstall', 'setup', 'launcher', 'updater',
        'crashreporter', 'support', 'config', 'redist'
    ]

    exe_files = [
        exe for exe in exe_files
        if not any(exclude in exe.stem.lower() for exclude in exclude_names)
    ]

    # If only one exe found, use it
    if len(exe_files) == 1:
        return str(exe_files[0])

    # Look in common subdirectories
    common_dirs = ['bin', 'Binaries', 'Game', 'Win64', 'x64']
    for subdir in common_dirs:
        subdir_path = install_path / subdir
        if subdir_path.exists():
            exe_files = list(subdir_path.glob("*.exe"))
            exe_files = [
                exe for exe in exe_files
                if not any(exclude in exe.stem.lower() for exclude in exclude_names)
            ]
            if exe_files:
                # Return the first non-excluded exe
                return str(exe_files[0])

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
