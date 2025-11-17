# CoverFlow Game Launcher - Installation Guide

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 10/11 (64-bit), macOS 10.13+, or Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for application + additional space for game data
- **Graphics**: DirectX 11 compatible GPU or OpenGL 3.3+ support

### Required Dependencies
- **Python 3.7 or higher** (required for game scanning features)
  - Download from: https://www.python.org/downloads/
  - **IMPORTANT**: During Python installation, make sure to check "Add Python to PATH"

## Installation

### Windows

1. Download the latest `CoverFlow-Game-Launcher-Setup.exe` installer
2. **Install Python first** (if not already installed):
   - Go to https://www.python.org/downloads/
   - Download Python 3.11 or later
   - Run the installer
   - **✓ CHECK "Add Python to PATH"** during installation
   - Complete the installation

3. Run `CoverFlow-Game-Launcher-Setup.exe`
4. Follow the installation wizard
5. The installer will check for Python and warn if not found
6. Choose your installation directory
7. Launch the application from the Start Menu or Desktop shortcut

### macOS

1. Download the latest `CoverFlow-Game-Launcher.dmg`
2. **Install Python first** (if not already installed):
   - macOS usually has Python pre-installed
   - To verify, open Terminal and run: `python3 --version`
   - If not found, download from https://www.python.org/downloads/

3. Open the DMG file
4. Drag CoverFlow Game Launcher to Applications
5. Launch from Applications folder

### Linux

1. **Install Python first** (if not already installed):
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install python3 python3-pip

   # Fedora
   sudo dnf install python3 python3-pip

   # Arch
   sudo pacman -S python python-pip
   ```

2. Download the latest `CoverFlow-Game-Launcher.AppImage`
3. Make it executable:
   ```bash
   chmod +x CoverFlow-Game-Launcher.AppImage
   ```
4. Run the AppImage:
   ```bash
   ./CoverFlow-Game-Launcher.AppImage
   ```

## Portable Mode

You can run CoverFlow Game Launcher in portable mode from a USB drive:

1. Extract the application to your USB drive
2. Create an empty file named `portable.txt` in the application directory
3. All settings and data will be stored in the application folder
4. No installation required!

## Troubleshooting

### Game Scanning Not Working
**Problem**: "Python not found" error when scanning for games

**Solution**:
1. Install Python from https://www.python.org/downloads/
2. Make sure "Add Python to PATH" was checked during installation
3. Restart your computer
4. Restart CoverFlow Game Launcher

### Application Won't Start
**Problem**: Application closes immediately or shows error

**Solution**:
1. Make sure you have a compatible graphics card
2. Update your graphics drivers
3. Try running as administrator (Windows)
4. Check the error log in Settings

### Games Not Detected
**Problem**: Steam/Epic/Xbox games not showing up

**Solution**:
1. Make sure Python is installed and in PATH
2. Verify games are installed in default locations:
   - Steam: `C:\Program Files (x86)\Steam`
   - Epic: `C:\Program Files\Epic Games`
   - Xbox: `C:\Program Files\WindowsApps`
3. Try running a manual scan from Settings

## First Launch

1. Launch CoverFlow Game Launcher
2. Go to Settings (gear icon)
3. Click "Scan for Games"
4. Wait for the scan to complete
5. Your games will appear in the 3D coverflow interface!

## Additional Dependencies (Installed Automatically)

The application includes all necessary dependencies:
- Electron runtime
- Three.js library
- Better-SQLite3 for database
- Game scanner Python scripts

## Support

For issues, bug reports, or feature requests:
- Check the error log in Settings > View Error Log
- Report issues on GitHub: [Your Repository URL]

## License

MIT License - See LICENSE file for details
