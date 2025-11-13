# 🚀 Quick Start - Desktop App

Your CoverFlow app is now a standalone desktop application!

## Install & Run (5 minutes)

### Step 1: Install Node.js Dependencies

```bash
npm install
```

This downloads Electron and dependencies (~200MB).

### Step 2: Run the App

```bash
npm start
```

That's it! The app will:
- ✅ Open in a native window
- ✅ Auto-detect your games
- ✅ Work completely offline
- ✅ Store data locally

## What Changed?

### Before (Web Version):
1. Install Python + Flask
2. Run `python server.py`
3. Keep server running
4. Open browser
5. Navigate to localhost

### After (Desktop App):
1. `npm start`
2. Done!

## Features

✅ **No Browser** - Native desktop window
✅ **No Server** - Everything runs locally
✅ **Auto-Scan** - Games detected automatically
✅ **Local Storage** - SQLite database
✅ **Dual Mode** - Still works in browser too!

## Testing

### Test Desktop Mode:
```bash
npm start
```

Look for console message: `Running in Electron mode`

### Test Browser Mode:
```bash
# Terminal 1: Start Flask server
cd gameinfodownload-main
python server.py

# Terminal 2: Open browser
# Navigate to index.html
```

Look for console message: `Running in Browser mode`

## Build Executable

### Windows Installer:
```bash
npm run build:win
```
Creates: `dist/CoverFlow Game Launcher Setup.exe`

### Mac DMG:
```bash
npm run build:mac
```
Creates: `dist/CoverFlow Game Launcher.dmg`

### Linux AppImage:
```bash
npm run build:linux
```
Creates: `dist/CoverFlow-Game-Launcher.AppImage`

## Data Location

Your games are stored in:

**Windows:**
```
%APPDATA%\coverflow-game-launcher\game_data\
```

**macOS:**
```
~/Library/Application Support/coverflow-game-launcher/game_data/
```

**Linux:**
```
~/.config/coverflow-game-launcher/game_data/
```

## Troubleshooting

### "electron: command not found"
```bash
npm install
```

### "Python not found"
Make sure Python is in your PATH:
```bash
python --version  # or python3 --version
```

### Games not scanning
1. Check Python dependencies:
```bash
cd gameinfodownload-main
pip install -r requirements.txt
```

2. Check console (Ctrl+Shift+I in app) for errors

### Build errors
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development

### Enable DevTools:
The app opens DevTools automatically in development mode.

### Disable DevTools:
Edit `main.js` line ~80 and comment out:
```javascript
// mainWindow.webContents.openDevTools();
```

### Change Window Size:
Edit `main.js` line ~58:
```javascript
width: 1400,  // Change these
height: 900,
```

## Next Steps

1. **Add your own albums/images** - Edit default data in `coverflow.js`
2. **Customize colors** - Edit `style.css`
3. **Add app icon** - Create `icon.ico` (Windows) or `icon.icns` (Mac)
4. **Share the app** - Build and distribute the executable!

## Support

- Desktop app docs: [ELECTRON_README.md](ELECTRON_README.md)
- Game integration: [GAMES_INTEGRATION.md](GAMES_INTEGRATION.md)
- Main README: [README.md](README.md)

---

**Enjoy your standalone CoverFlow game launcher! 🎮✨**
