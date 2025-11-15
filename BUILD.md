# Building CoverFlow Game Launcher

Complete guide to compile and package the CoverFlow Game Launcher into a distributable executable.

---

## 📋 Prerequisites

### Required Software

1. **Node.js** (v20.x LTS recommended)
   - Download: https://nodejs.org/

2. **Python** (3.7 or higher)
   - Download: https://www.python.org/downloads/
   - Required for the game scanning backend

3. **Visual Studio Build Tools** (Windows only)
   - Required for native module compilation
   - Download: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   - Select "Desktop development with C++" workload

---

## 🎨 Step 1: Create Icons (REQUIRED!)

Before building, you **must** create the app icons. You have three options:

### Option A: Use Browser-Based Generator (Easiest!)

1. Open `generate_icons.html` in your web browser
2. Click "Download All Icons" button
3. Save all PNG files to the project root directory
4. Convert `icon_512.png` to `icon.ico`:
   - Visit https://convertico.com/
   - Upload `icon_512.png`
   - Download as `icon.ico`
5. Place `icon.ico` in project root

### Option B: Use Python Script

```bash
# Install Pillow
pip install pillow

# Run icon generator
python create_icons.py

# Convert icon_512.png to icon.ico (use online tool or ImageMagick)
```

### Option C: Use Your Own Icons

Create these files in the project root:
- `icon.png` - 256x256 PNG (Linux/tray icon)
- `icon.ico` - Multi-size ICO (Windows executable icon)
- `icon.icns` - Multi-size ICNS (macOS app icon, if building for Mac)
- `placeholder.png` - 512x512 PNG (fallback game cover)

**IMPORTANT**: The build will fail if `icon.ico` (Windows) is missing!

---

## 🔨 Step 2: Install Dependencies

```bash
# Install all Node.js dependencies
npm install

# Install Python dependencies for game scanner
cd gameinfodownload-main
pip install -r requirements.txt
cd ..
```

---

## 🚀 Step 3: Build the Application

### Windows (NSIS Installer)

```bash
npm run build:win
```

**Output**: `dist/CoverFlow Game Launcher Setup X.X.X.exe`

This creates a Windows installer (.exe) that:
- Installs the app to Program Files
- Creates desktop shortcut
- Adds to Start Menu
- Includes uninstaller

### macOS (DMG)

```bash
npm run build:mac
```

**Output**: `dist/CoverFlow Game Launcher-X.X.X.dmg`

**Note**: Requires `icon.icns` file. Convert `icon_512.png` on macOS:
```bash
sips -s format icns icon_512.png --out icon.icns
```

### Linux (AppImage)

```bash
npm run build:linux
```

**Output**: `dist/CoverFlow Game Launcher-X.X.X.AppImage`

Self-contained executable that runs on most Linux distributions.

### Build for All Platforms

```bash
npm run build
```

Builds for current platform by default.

---

## 📦 Build Output

After building, check the `dist/` folder:

```
dist/
├── CoverFlow Game Launcher Setup 1.0.0.exe  (Windows installer)
├── win-unpacked/                             (Unpacked Windows files)
│   └── CoverFlow Game Launcher.exe          (Portable exe - doesn't need install)
└── builder-effective-config.yaml             (Build configuration used)
```

### Portable vs Installer

- **Installer** (`Setup.exe`): Recommended for distribution, includes auto-updates
- **Portable** (`win-unpacked/`): Run directly without installation, good for testing

---

## 🧪 Testing the Build

### Before Distribution

1. **Test the installer**:
   ```bash
   # Run the installer
   dist/CoverFlow Game Launcher Setup 1.0.0.exe
   ```

2. **Install and run** the app

3. **Test all features**:
   - Scan for games
   - Switch between CoverFlow/Grid/List views
   - Toggle favorites
   - Apply filters
   - Launch a game

4. **Check file locations**:
   - App data: `%APPDATA%\coverflow-game-launcher\`
   - Game database: `%APPDATA%\coverflow-game-launcher\game_data\games.db`

---

## ⚙️ Build Configuration

### Customizing the Build

Edit `package.json` to customize:

```json
{
  "build": {
    "appId": "com.coverflow.gamelauncher",
    "productName": "CoverFlow Game Launcher",
    "win": {
      "target": ["nsis"],  // or "portable", "zip"
      "icon": "icon.ico"
    }
  }
}
```

### Change App Version

Edit `package.json`:
```json
{
  "version": "1.0.0"  // Update version here
}
```

Version appears in:
- Installer filename
- About dialog
- Windows properties

---

## 🐛 Troubleshooting

### Error: "Icon file not found"

**Problem**: Missing `icon.ico`, `icon.png`, or `icon.icns`

**Solution**:
1. Follow Step 1 to create icons
2. Ensure files are in project root directory
3. Run build again

### Error: "better-sqlite3 build failed"

**Problem**: Native module compilation failed

**Solution**:
```bash
# Rebuild native modules for Electron
npm run postinstall

# Or manually
npm rebuild better-sqlite3 --runtime=electron --target=28.0.0 --dist-url=https://electronjs.org/headers
```

### Error: "Cannot find module 'ui-components.js'"

**Problem**: Build files list is incomplete (should be fixed now)

**Solution**: Already fixed in latest package.json

### Build is Very Large (>200MB)

**Expected**: Electron apps are typically 150-250MB due to:
- Chromium rendering engine (~100MB)
- Node.js runtime (~30MB)
- Your app code and dependencies

**To reduce size**:
- Use `"asar": true` in build config (already enabled)
- Remove unused dependencies
- Use electron-builder's compression options

### Python Backend Not Working in Build

**Problem**: Python not found or scanner errors

**Solution**:
1. **Include Python with build** (advanced):
   - Use PyInstaller to package Python backend
   - Include as extraResource

2. **Require Python installation** (simpler):
   - Add to installer requirements
   - Check for Python in app startup
   - Show error if not found

**Current approach**: App assumes Python is installed on user's system

---

## 📝 Build Checklist

Before releasing to users:

- [ ] Icons created (`icon.ico`, `icon.png`, `placeholder.png`)
- [ ] Version number updated in `package.json`
- [ ] All features tested in development mode (`npm start`)
- [ ] Build completed without errors
- [ ] Installer tested on clean Windows install
- [ ] Python 3.7+ requirement documented
- [ ] README updated with installation instructions
- [ ] License file included
- [ ] Changelog updated

---

## 🚀 Distribution

### Sharing the Installer

1. **Upload the installer**:
   - `dist/CoverFlow Game Launcher Setup 1.0.0.exe`

2. **Provide system requirements**:
   - Windows 10/11 (64-bit)
   - Python 3.7 or higher
   - 4GB RAM minimum
   - 500MB disk space

3. **Include instructions**:
   - Install Python if not already installed
   - Run the installer
   - First launch: Click "Scan for Games"

### GitHub Releases (Recommended)

```bash
# Create a release on GitHub
# Upload: CoverFlow Game Launcher Setup 1.0.0.exe
# Add release notes
```

---

## 🔄 Auto-Updates (Optional)

To enable auto-updates, configure in `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "coverflow-game-launcher"
    }
  }
}
```

Requires GitHub releases and additional code in `main.js`.

---

## 📚 Additional Resources

- **electron-builder docs**: https://www.electron.build/
- **Electron docs**: https://www.electronjs.org/docs/latest/
- **Icon generators**:
  - https://convertico.com/ (PNG to ICO)
  - https://cloudconvert.com/ (format conversion)
- **Code signing** (for production): https://www.electron.build/code-signing

---

## 💡 Quick Start (TL;DR)

```bash
# 1. Create icons
# Open generate_icons.html in browser → Download icons
# Convert icon_512.png to icon.ico at https://convertico.com/

# 2. Install dependencies
npm install

# 3. Build
npm run build:win

# 4. Test
dist/CoverFlow Game Launcher Setup 1.0.0.exe

# Done! 🎉
```

---

## 🆘 Need Help?

If you encounter issues:
1. Check the [Troubleshooting](#-troubleshooting) section above
2. Verify all prerequisites are installed
3. Ensure icons exist in project root
4. Check `npm run start` works before building
5. Review build errors in console output

Happy building! 🚀
