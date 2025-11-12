# CoverFlow Interface

A modern web-based recreation of the classic CoverFlow interface from Mac OS X and iPod Touch, built with Three.js.

## Features

- **3D Carousel Effect**: Authentic CoverFlow experience with angled side covers and a prominent center cover
- **Smooth Animations**: Fluid transitions between album covers
- **Multiple Input Methods**:
  - ⌨️ Keyboard: Use arrow keys (← →) to navigate
  - 🖱️ Mouse: Click on any cover to select it, or use mouse wheel to scroll
  - 📱 Touch: Swipe left/right on mobile devices
- **Responsive Design**: Adapts to different screen sizes
- **Modern Web Technologies**: Built with HTML5, CSS3, and Three.js

## How to Run

1. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, or Edge)
2. That's it! No build process or dependencies to install.

### Running with a Local Server (Recommended)

For the best experience, run with a local server:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if you have http-server installed)
npx http-server
```

Then open `http://localhost:8000` in your browser.

## Controls

- **Arrow Left/Right**: Navigate between covers
- **Mouse Wheel**: Scroll through covers
- **Click**: Select a specific cover
- **Touch Swipe**: Navigate on mobile devices (left/right)

## Customization

### Adding Your Own Album Covers

Edit the `createAlbumData()` method in `coverflow.js`:

```javascript
createAlbumData() {
    return [
        {
            title: 'Your Album Title',
            artist: 'Artist Name',
            color: 0xFF6B6B, // Hex color for placeholder
            // or add: image: 'path/to/image.jpg'
        },
        // Add more albums...
    ];
}
```

### Using Real Images

To load actual images instead of colored placeholders, modify the material creation in the `createCovers()` method to use `THREE.TextureLoader`.

## Technology Stack

- **Three.js**: 3D graphics library for WebGL
- **Vanilla JavaScript**: No framework dependencies
- **Modern CSS**: Flexbox layout with backdrop filters

## Browser Compatibility

Works on all modern browsers that support WebGL:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## License

MIT License - Feel free to use and modify as you wish!
