# CoverFlow Interface - Enhanced Edition

A feature-rich web-based recreation of the classic CoverFlow interface from Mac OS X and iPod Touch, built with Three.js and modern web technologies.

## Features

### Core Experience
- **Authentic 3D Carousel**: Angled side covers with depth, prominent center display, and smooth animations
- **Reflection Effects**: Classic mirror reflections below each album cover (can be toggled)
- **16 Sample Albums**: Pre-loaded with diverse genres and colorful placeholders
- **Enhanced Lighting**: Multiple light sources for realistic 3D appearance

### Navigation
- **Keyboard Controls**:
  - `←` `→` Arrow keys: Navigate left/right
  - `Home`: Jump to first album
  - `End`: Jump to last album
  - `Space`: Random album
  - `F`: Toggle fullscreen
  - `?`: Show keyboard shortcuts
  - `Esc`: Close modals/Exit fullscreen
  - `1-9`: Jump to position (10%, 20%, ... 90%)
- **Mouse Controls**:
  - Click any cover to select it
  - Mouse wheel to scroll through albums
- **Touch Support**: Swipe left/right on mobile devices
- **Thumbnail Navigation**: Bottom bar with clickable thumbnails
- **🎮 Controller/Gamepad Support** (NEW!):
  - Full Xbox, PlayStation, and generic gamepad support
  - D-Pad & Analog stick navigation
  - Face buttons (A/Cross, B/Circle, Y/Triangle)
  - Shoulder buttons (LB/RB, L1/R1) for fast navigation
  - Triggers (LT/RT, L2/R2) to jump to start/end
  - Haptic feedback/vibration support
  - Auto-detection with visual status indicator
  - Adjustable sensitivity (1-10)

### Search & Filter
- **Real-time Search**: Filter albums by title, artist, or genre
- **Instant Results**: Search as you type with 300ms debounce
- **Clear Button**: Quick reset of search results

### Customization (Settings Panel)
- **Animation Speed**: Adjust transition speed (1-20)
- **Cover Spacing**: Control distance between covers (1.5-4.0)
- **Side Angle**: Adjust rotation angle (30-90 degrees)
- **Reflection Toggle**: Show/hide reflections
- **Auto-Rotate**: Automatically cycle through albums every 5 seconds
- **Persistent Settings**: All preferences saved to localStorage
- **Reset to Defaults**: One-click restore of original settings

###🎨 GPU/Hardware Rendering (NEW!)
- **GPU Detection**: Automatic detection and display of graphics card info
- **Hardware Acceleration**: Toggle GPU-accelerated rendering
- **Glass Refraction Effect**: Realistic glass-like materials with:
  - Physical-based rendering (PBR) using MeshPhysicalMaterial
  - Transmission and thickness properties
  - Clearcoat and roughness simulation
  - True refraction and light transmission
- **Bloom Glow Effect**: Soft, ethereal glow around covers
  - Adjustable intensity (0-3.0)
  - UnrealBloomPass post-processing
  - Emissive properties on materials
- **SSAO (Screen Space Ambient Occlusion)**: Enhanced depth and shadows
  - Realistic contact shadows
  - Improved depth perception
  - Adjustable kernel radius
- **Advanced Lighting**: 4-point lighting setup with rim lights
- **Tone Mapping**: ACES Filmic tone mapping for cinematic look
- **High-Quality Shadows**: 2048x2048 shadow maps with PCF soft shadows

### Data Management
- **JSON Import**: Load your own album collections from JSON files
- **Image Support**: Use actual images instead of colored placeholders
- **Dynamic Loading**: Smooth loading screen with spinner

### User Interface
- **Top Bar**: Search, settings, shortcuts, and fullscreen controls
- **Info Panel**: Displays title, artist, year, genre, and position counter
- **Thumbnail Strip**: Visual navigation with auto-scrolling active indicator
- **Modal Dialogs**: Professional settings and keyboard shortcuts panels
- **Responsive Design**: Adapts to different screen sizes and devices

### Performance
- **Optimized Rendering**: High-performance WebGL with capped pixel ratio
- **Shadow Mapping**: Soft shadows for depth perception
- **Smooth Animations**: Eased transitions using lerp interpolation
- **Memory Efficient**: Proper scene cleanup when filtering/reloading

## Installation & Usage

### Quick Start
1. Open `index.html` in a modern web browser
2. No build process or dependencies needed!

### Recommended: Local Server
For best performance and to avoid CORS issues when loading images:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Customization Guide

### Loading Custom Albums from JSON

1. Click the **Settings** button (⚙️)
2. Click **"Load Albums from JSON"**
3. Select your JSON file

**JSON Format:**
```json
{
  "albums": [
    {
      "title": "Album Title",
      "artist": "Artist Name",
      "year": "2024",
      "genre": "Genre",
      "color": 16711680,
      "image": "path/to/image.jpg"
    }
  ]
}
```

**Notes:**
- `color`: Hex color as decimal (e.g., 0xFF0000 = 16711680 for red)
  - Use: `parseInt('FF0000', 16)` to convert
- `image`: Optional. If provided, overrides color
- See `albums-example.json` for a template

### Adding Images

To use actual album cover images:

```json
{
  "title": "Dark Side of the Moon",
  "artist": "Pink Floyd",
  "year": "1973",
  "genre": "Progressive Rock",
  "image": "images/dark-side.jpg"
}
```

Place images in an `images/` folder or use URLs.

### Editing Default Albums

Edit the `initAlbumData()` method in `coverflow.js` (line 45):

```javascript
initAlbumData() {
    const albums = [
        {
            title: 'Your Album',
            artist: 'Your Artist',
            year: '2024',
            genre: 'Your Genre',
            color: 0xFF6B6B
        },
        // Add more albums...
    ];
    // ...
}
```

## Keyboard Shortcuts Reference

| Key | Action |
|-----|--------|
| `←` `→` | Navigate left/right |
| `Home` | Go to first album |
| `End` | Go to last album |
| `Space` | Random album |
| `F` | Toggle fullscreen |
| `?` | Show shortcuts |
| `Esc` | Close modals/Exit fullscreen |
| `1-9` | Jump to 10%-90% position |

## Technology Stack

- **Three.js r128**: 3D graphics and WebGL rendering
- **Vanilla JavaScript**: No framework dependencies
- **Modern CSS3**:
  - Flexbox layout
  - Backdrop filters for glassmorphism
  - CSS animations
  - Custom scrollbars
  - Responsive media queries
- **HTML5 Canvas**: Thumbnail generation
- **LocalStorage API**: Settings persistence

## Browser Compatibility

Works on all modern browsers with WebGL support:
- ✅ Chrome/Edge 90+ (recommended)
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Requirements:**
- WebGL support
- ES6+ JavaScript
- CSS backdrop-filter support (optional, degrades gracefully)

## File Structure

```
coverflow/
├── index.html           # Main HTML structure with post-processing scripts
├── style.css            # All styles and animations
├── coverflow.js         # Core CoverFlow logic (1088 lines)
├── albums-example.json  # Sample JSON template
└── README.md           # This file
```

## Controller Support

### Connecting a Controller
1. Connect your Xbox, PlayStation, or compatible USB/Bluetooth gamepad
2. The controller status indicator in the top bar will turn green
3. Controller name will be displayed
4. You'll feel a welcome vibration (if enabled)

### Controller Mapping
- **D-Pad/Left Stick**: Navigate left/right through albums
- **A Button/Cross (✕)**: Confirm selection
- **B Button/Circle (○)**: Close modals/Go back
- **Y Button/Triangle (△)**: Random album
- **LB/RB or L1/R1**: Fast navigation (shoulder buttons)
- **LT/RT or L2/R2**: Jump to first/last album (triggers)
- **Start/Options**: Open settings
- **Select/Share**: Toggle fullscreen

### Controller Settings
- **Sensitivity**: Adjust how responsive the analog stick is (1-10)
- **Vibration**: Toggle haptic feedback on/off

## Performance Tips

1. **Use appropriate image sizes**: 512x512px or 1024x1024px recommended
2. **Limit album count**: 50-100 albums for smooth performance
3. **Optimize images**: Use compressed JPG/PNG files
4. **Reduce animation speed**: Lower values = better performance on slower devices
5. **Disable reflections**: Turn off in settings if performance is an issue
6. **GPU Effects**: Bloom and SSAO are GPU-intensive - disable on slower hardware
7. **Glass Effect**: Most demanding feature - requires good GPU

## Features Comparison

| Feature | Basic Version | Enhanced V1 | Enhanced V2 (Current) |
|---------|--------------|-------------|----------------------|
| 3D Carousel | ✅ | ✅ | ✅ |
| Reflections | ❌ | ✅ | ✅ |
| Search/Filter | ❌ | ✅ | ✅ |
| Thumbnail Nav | ❌ | ✅ | ✅ |
| Settings Panel | ❌ | ✅ | ✅ (Expanded) |
| Fullscreen | ❌ | ✅ | ✅ |
| JSON Import | ❌ | ✅ | ✅ |
| Auto-Rotate | ❌ | ✅ | ✅ |
| Keyboard Shortcuts | Basic | 15+ | 15+ |
| **Controller Support** | ❌ | ❌ | **✅** |
| **GPU Detection** | ❌ | ❌ | **✅** |
| **Glass Refraction** | ❌ | ❌ | **✅** |
| **Bloom Effect** | ❌ | ❌ | **✅** |
| **SSAO** | ❌ | ❌ | **✅** |
| **Haptic Feedback** | ❌ | ❌ | **✅** |
| Albums | 12 | 16 | 16 |
| Loading Screen | ❌ | ✅ | ✅ |
| Persistent Settings | ❌ | ✅ | ✅ |
| Lines of Code | ~269 | ~680 | ~1088 |

## Advanced Customization

### Changing Camera Position

Edit `coverflow.js` line 82:
```javascript
this.camera.position.set(0, 0.5, 9); // x, y, z
```

### Adjusting Lighting

Edit `coverflow.js` lines 99-109 to modify light intensity and position.

### Custom Easing Functions

The animation speed can be adjusted in real-time via settings, but for custom easing curves, modify the `updateCoverPositions()` method (line 179).

## Troubleshooting

**Issue: Images not loading**
- Use a local server (CORS restriction)
- Check image paths are correct
- Verify images are accessible

**Issue: Slow performance**
- Reduce number of albums
- Disable reflections in settings
- Lower animation speed
- Use smaller images

**Issue: Thumbnails not showing**
- Check browser console for errors
- Verify albums have valid color values
- Try refreshing the page

**Issue: Settings not saving**
- Check if localStorage is enabled in browser
- Clear browser cache and try again

## Contributing

Feel free to fork and customize! Some ideas for enhancements:
- Audio playback integration
- More animation presets
- Grid view mode
- Export/import settings
- Theme customization
- Playlist support
- Album statistics

## License

MIT License - Free to use and modify as you wish!

## Credits

Inspired by the classic Apple CoverFlow interface designed by Jonathan del Strother and integrated into iTunes, iPod, and Mac OS X by Apple Inc.

Built with Three.js - https://threejs.org
