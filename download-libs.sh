#!/bin/bash
# Download THREE.js libraries for offline use
# This script downloads all required THREE.js dependencies so the app works without internet

echo "Downloading THREE.js libraries..."
echo "=================================="

# Create libs directory structure
mkdir -p libs/postprocessing
mkdir -p libs/shaders

# Download main THREE.js library
echo "Downloading three.min.js..."
curl -sL "https://unpkg.com/three@0.128.0/build/three.min.js" -o libs/three.min.js

# Download post-processing effects
echo "Downloading post-processing effects..."
curl -sL "https://unpkg.com/three@0.128.0/examples/js/postprocessing/EffectComposer.js" -o libs/postprocessing/EffectComposer.js
curl -sL "https://unpkg.com/three@0.128.0/examples/js/postprocessing/RenderPass.js" -o libs/postprocessing/RenderPass.js
curl -sL "https://unpkg.com/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js" -o libs/postprocessing/UnrealBloomPass.js
curl -sL "https://unpkg.com/three@0.128.0/examples/js/postprocessing/SSAOPass.js" -o libs/postprocessing/SSAOPass.js
curl -sL "https://unpkg.com/three@0.128.0/examples/js/postprocessing/ShaderPass.js" -o libs/postprocessing/ShaderPass.js

# Download shaders
echo "Downloading shaders..."
curl -sL "https://unpkg.com/three@0.128.0/examples/js/shaders/SSAOShader.js" -o libs/shaders/SSAOShader.js
curl -sL "https://unpkg.com/three@0.128.0/examples/js/shaders/CopyShader.js" -o libs/shaders/CopyShader.js
curl -sL "https://unpkg.com/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js" -o libs/shaders/LuminosityHighPassShader.js

# Verify downloads
echo ""
echo "Verifying downloads..."
echo "=================================="

check_file() {
    if [ -f "$1" ] && [ -s "$1" ]; then
        SIZE=$(du -h "$1" | cut -f1)
        echo "✓ $1 ($SIZE)"
    else
        echo "✗ $1 (FAILED)"
    fi
}

check_file "libs/three.min.js"
check_file "libs/postprocessing/EffectComposer.js"
check_file "libs/postprocessing/RenderPass.js"
check_file "libs/postprocessing/UnrealBloomPass.js"
check_file "libs/postprocessing/SSAOPass.js"
check_file "libs/postprocessing/ShaderPass.js"
check_file "libs/shaders/SSAOShader.js"
check_file "libs/shaders/CopyShader.js"
check_file "libs/shaders/LuminosityHighPassShader.js"

echo ""
echo "Done! Now update index.html to use local libs instead of CDN."
echo "See index.html.offline for an example."
