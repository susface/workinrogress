# Icons and Images Setup Guide

## Required Files

Your CoverFlow Game Launcher needs these icon files:

### App Icons (Place in Root Directory)

| File | Platform | Required? | Purpose |
|------|----------|-----------|---------|
| `icon.png` | Linux | **Yes** | System tray icon, notifications, Linux builds |
| `icon.ico` | Windows | Optional | Windows executable icon (for builds) |
| `icon.icns` | macOS | Optional | macOS app icon (for builds) |
| `placeholder.png` | All | **Yes** | Fallback image for games without cover art |

### Game Assets (Auto-generated)

These folders are created automatically when you scan for games:
- `%APPDATA%\coverflow-game-launcher\game_data\boxart\` - Game cover art
- `%APPDATA%\coverflow-game-launcher\game_data\icons\` - Game icons

**You don't need to create these manually** - the scanners will download them!

---

## Setup Options

### Option 1: Use Python Script (Recommended)

1. **Install Pillow** (if not already installed):
   ```bash
   pip install pillow
   ```

2. **Run the icon creator script**:
   ```bash
   python create_icons.py
   ```

3. **Done!** All required icons will be created automatically.

**macOS users**: Convert the generated `icon_512.png` to `.icns`:
```bash
# On macOS
png2icns icon.icns icon_512.png
```

---

### Option 2: Download/Create Manually

#### Quick Method - Use Emoji Screenshot
1. Open Windows Character Map or Emoji Picker (Win + .)
2. Find the 🎮 (game controller) emoji
3. Screenshot it and save as `icon.png` (256x256)
4. Copy and rename to `placeholder.png`

#### Recommended Method - Use Free Icon Tools

1. **Visit a free icon generator**:
   - [Favicon.io](https://favicon.io/favicon-generator/) - Text or emoji to icon
   - [Icons8](https://icons8.com/icon/set/game/all) - Free game controller icons
   - [Flaticon](https://www.flaticon.com/search?word=game%20controller) - Free icons

2. **Download these icons**:
   - Choose a **game controller** or **coverflow** style icon
   - Download as PNG (512x512 or larger)

3. **Create required files**:

   **For icon.png** (256x256):
   - Resize to 256x256 pixels
   - Save as `icon.png` in the project root

   **For placeholder.png** (512x512):
   - Resize to 512x512 pixels
   - Make it more muted/grayscale
   - Save as `placeholder.png` in the project root

   **For icon.ico** (Windows - optional):
   - Use [ConvertICO](https://convertico.com/) or [ICOConvert](https://icoconvert.com/)
   - Upload your `icon.png`
   - Download as `icon.ico`

---

### Option 3: Use ImageMagick (Advanced)

If you have [ImageMagick](https://imagemagick.org/) installed:

```bash
# Create a simple purple gradient icon with text
magick -size 512x512 radial-gradient:"#667eea-#764ba2" \
       -gravity center -pointsize 200 -fill white -annotate +0+0 "🎮" \
       icon_512.png

# Resize for different uses
magick icon_512.png -resize 256x256 icon.png
magick icon_512.png -resize 512x512 placeholder.png

# Create .ico (Windows)
magick icon_512.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

---

## Recommended Icon Specifications

### App Icon (`icon.png`, `icon.ico`, `icon.icns`)

**Style Guidelines**:
- Theme: Gaming, coverflow, 3D carousel
- Colors: Purple gradient (#667eea to #764ba2) to match the app theme
- Symbol: Game controller (🎮), carousel, or "CF" letters
- Background: Solid or gradient (not transparent for system tray)

**Technical Specs**:
- Format: PNG, ICO, ICNS
- Size: 256x256 minimum (512x512 recommended)
- Color: RGB or RGBA
- Quality: High resolution for crisp display

### Placeholder (`placeholder.png`)

**Style Guidelines**:
- Theme: Subtle, muted, clearly a placeholder
- Colors: Dark gray/neutral tones
- Symbol: Game controller emoji or "No Cover" text
- Background: Solid dark gray

**Technical Specs**:
- Format: PNG or JPG
- Size: 512x512 pixels
- Color: RGB
- Purpose: Shows when game cover art is missing

---

## Verification

After creating icons, verify they exist:

```bash
# Windows Command Prompt
dir icon.png icon.ico placeholder.png

# PowerShell or Git Bash
ls icon.png icon.ico placeholder.png
```

You should see:
```
icon.png
icon.ico (optional, for builds)
placeholder.png
```

---

## Troubleshooting

### "Tray icon not found" Error
**Problem**: App can't find `icon.png`
**Solution**:
1. Ensure `icon.png` exists in the project root directory
2. Restart the application
3. The error won't affect functionality, just disables system tray

### Missing Game Cover Art
**Problem**: Games show placeholder image
**Solution**:
1. This is normal! Cover art is downloaded during game scanning
2. Run the game scanner: Click "Scan for Games" in the app
3. The scanner will automatically download boxart from Steam/Epic/Xbox APIs
4. If scanning fails, check your internet connection

### App Won't Build
**Problem**: `electron-builder` fails due to missing icons
**Solution**:
1. Create `icon.ico` (Windows) or `icon.icns` (macOS)
2. Or remove the icon lines from `package.json` build config

---

## Quick Start (TL;DR)

**Easiest setup** (30 seconds):

```bash
# Install Pillow
pip install pillow

# Run the creator
python create_icons.py

# Start the app
npm start
```

Done! 🎮
