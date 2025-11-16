@echo off
REM Download THREE.js libraries for offline use
REM This script downloads all required THREE.js dependencies so the app works without internet

echo Downloading THREE.js libraries...
echo ==================================

REM Create libs directory structure
if not exist libs mkdir libs
if not exist libs\postprocessing mkdir libs\postprocessing
if not exist libs\shaders mkdir libs\shaders

REM Download main THREE.js library
echo Downloading three.min.js...
curl -sL "https://unpkg.com/three@0.128.0/build/three.min.js" -o libs/three.min.js

REM Download post-processing effects
echo Downloading post-processing effects...
curl -sL "https://unpkg.com/three@0.128.0/examples/js/postprocessing/EffectComposer.js" -o libs/postprocessing/EffectComposer.js
curl -sL "https://unpkg.com/three@0.128.0/examples/js/postprocessing/RenderPass.js" -o libs/postprocessing/RenderPass.js
curl -sL "https://unpkg.com/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js" -o libs/postprocessing/UnrealBloomPass.js
curl -sL "https://unpkg.com/three@0.128.0/examples/js/postprocessing/SSAOPass.js" -o libs/postprocessing/SSAOPass.js
curl -sL "https://unpkg.com/three@0.128.0/examples/js/postprocessing/ShaderPass.js" -o libs/postprocessing/ShaderPass.js

REM Download shaders
echo Downloading shaders...
curl -sL "https://unpkg.com/three@0.128.0/examples/js/shaders/SSAOShader.js" -o libs/shaders/SSAOShader.js
curl -sL "https://unpkg.com/three@0.128.0/examples/js/shaders/CopyShader.js" -o libs/shaders/CopyShader.js
curl -sL "https://unpkg.com/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js" -o libs/shaders/LuminosityHighPassShader.js

echo.
echo Done! Now update index.html to use local libs instead of CDN.
echo See the README for instructions.
pause
