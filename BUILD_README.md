# Build and Installer Guide

## Issue: Coverflow Fails to Initialize on Other Computers

When building the installer and installing on another computer, the coverflow may fail to initialize. This is caused by missing files in the build package.

### Root Causes Identified

1. **Missing `modules/` directory** - ✅ FIXED
   - The `modules/` folder contains critical files like:
     - visual-effects.js
     - coverflow-settings.js
     - coverflow-ui.js
     - And all other modular components

2. **THREE.js loaded from CDN** - ⚠️ REQUIRES ACTION
   - The app loads THREE.js from `https://unpkg.com/three@0.128.0/`
   - Without internet connection, THREE.js fails to load
   - This causes coverflow initialization to fail

### Fixes Applied

#### 1. Updated package.json Build Configuration

The following files are now included in the build:

```json
"files": [
  "main.js",
  "preload.js",
  "index.html",
  "style.css",
  "coverflow.js",
  "ui-components.js",
  "ui-components.css",
  "SimplexNoise.js",
  "albums-example.json",
  "placeholder.png",
  "icon.png",
  "icon_512.png",
  "modules/**/*.js",        // ← ADDED: All coverflow modules
  "!modules/**/*.md",       // ← Exclude documentation
  "libs/**/*",              // ← ADDED: For local THREE.js libraries
  "gameinfodownload-main/**/*",
  ...
]
```

### How to Build for Offline Use (Recommended)

To ensure the app works without internet connection, download THREE.js libraries locally:

#### On Linux/Mac:

```bash
./download-libs.sh
```

#### On Windows:

```batch
download-libs.bat
```

#### Or manually download:

Create the following directory structure and download each file:

```
libs/
  ├── three.min.js
  ├── postprocessing/
  │   ├── EffectComposer.js
  │   ├── RenderPass.js
  │   ├── UnrealBloomPass.js
  │   ├── SSAOPass.js
  │   └── ShaderPass.js
  └── shaders/
      ├── SSAOShader.js
      ├── CopyShader.js
      └── LuminosityHighPassShader.js
```

Download from:
- https://unpkg.com/three@0.128.0/build/three.min.js
- https://unpkg.com/three@0.128.0/examples/js/postprocessing/[filename]
- https://unpkg.com/three@0.128.0/examples/js/shaders/[filename]

#### Then update index.html:

Replace the CDN script tags (lines 443-454) with local paths:

```html
<!-- Three.js library -->
<script src="libs/three.min.js"></script>

<!-- Post-processing dependencies -->
<script src="SimplexNoise.js"></script>

<!-- Post-processing effects -->
<script src="libs/postprocessing/EffectComposer.js"></script>
<script src="libs/postprocessing/RenderPass.js"></script>
<script src="libs/postprocessing/UnrealBloomPass.js"></script>
<script src="libs/shaders/SSAOShader.js"></script>
<script src="libs/postprocessing/SSAOPass.js"></script>
<script src="libs/postprocessing/ShaderPass.js"></script>
<script src="libs/shaders/CopyShader.js"></script>
<script src="libs/shaders/LuminosityHighPassShader.js"></script>
```

### Building the Installer

Once you've downloaded the libraries (or if you're okay with requiring internet):

#### Windows:
```bash
npm run build:win
```

#### macOS:
```bash
npm run build:mac
```

#### Linux:
```bash
npm run build:linux
```

The installer will be created in the `dist/` directory.

### Verification

After building, the installer should include:

- ✅ All modules/ JavaScript files
- ✅ All libs/ files (if downloaded)
- ✅ All game info download scripts
- ✅ Icons and assets
- ✅ Main application files

### Testing the Installer

1. Build the installer on your development machine
2. Copy the installer to a test machine (or VM)
3. **Disconnect from internet** (to test offline functionality)
4. Install and run the application
5. Check browser console for any "THREE is not defined" errors

### Troubleshooting

**Error: "THREE is not defined"**
- THREE.js is not loaded
- Either download libraries locally OR ensure internet connection

**Error: "Cannot find module 'visual-effects'"**
- The modules/ folder is missing from build
- Verify package.json includes "modules/**/*.js"
- Rebuild the installer

**Error: "Coverflow failed to initialize"**
- Check Developer Tools console (Ctrl+Shift+I)
- Look for specific error messages
- Verify all script tags in index.html load successfully

### Development vs Production

**Development (current setup):**
- Uses CDN for THREE.js (requires internet on first run)
- Faster builds, smaller file size
- Works fine for development

**Production (recommended):**
- Use local THREE.js libraries
- Fully offline capable
- Larger bundle size (~2-3 MB additional)
- Better user experience

### Summary

The critical bug (missing modules/) has been **FIXED** in package.json. The app will now build with all required modules.

For **best results**, download the THREE.js libraries locally using the provided scripts before building the installer. This ensures the app works completely offline.
