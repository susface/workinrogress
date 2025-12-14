/**
 * Visual Effects Manager
 * Manages all visual effects: particles, shaders, animations, interactions
 * All effects are toggleable for performance
 */

class VisualEffectsManager {
    constructor(scene, camera, renderer, coverflowInstance) {
        // Validate THREE.js is available
        if (typeof THREE === 'undefined') {
            console.error('[VISUAL_FX] THREE.js is not loaded! Visual effects will not work.');
            throw new Error('THREE.js is required for Visual Effects Manager');
        }

        if (!scene || !camera || !renderer) {
            console.error('[VISUAL_FX] Invalid scene, camera, or renderer provided');
            throw new Error('Valid scene, camera, and renderer are required');
        }

        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.coverflow = coverflowInstance;

        // Effect systems
        this.particleSystem = null;
        this.parallaxLayers = [];
        this.shaderMaterials = [];
        this.interactionEffects = [];
        this.idleAnimations = [];
        this.coversCache = []; // Cache covers for cleanup

        // Mouse/cursor tracking
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseVelocityX = 0;
        this.mouseVelocityY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Event handlers (store references for cleanup)
        this.mouseMoveHandler = null;
        this.clickHandler = null;

        // Settings with defaults (all OFF for performance)
        this.settings = {
            // Particle systems
            particlesEnabled: false,
            particlePreset: 'stars', // 'stars', 'snow', 'fireflies', 'confetti', 'magic'
            particleCount: 1000,

            // Parallax backgrounds
            parallaxEnabled: false,
            parallaxLayers: 3,
            parallaxSpeed: 0.5,

            // Advanced lighting
            advancedLightingEnabled: false,
            rimLightingEnabled: false,
            godRaysEnabled: false,
            colorBleedEnabled: false,

            // Holographic UI
            holographicUIEnabled: false,
            scanlineEffect: false,
            glitchEffect: false,

            // 3D Transitions
            transitionsEnabled: true,
            transitionType: 'slide', // 'slide', 'flip', 'cube', 'portal', 'morph'

            // Audio visualizer integration
            audioReactiveEnabled: false,

            // Mouse/Controller effects
            mouseEffectsEnabled: false,
            rippleOnClick: false,
            magneticCovers: false,
            magneticIntensity: 50, // 0-100
            tiltWithMouse: false,
            tiltIntensity: 30, // 0-100

            // Reflective surfaces
            enhancedReflectionsEnabled: false,
            reflectionOpacity: 30, // 0-100

            // Loading/Idle animations
            loadingAnimationsEnabled: true,
            idleAnimationsEnabled: false,
            idleFloating: false,
            idleBreathing: false,
            floatingIntensity: 50, // 0-100

            // Screen effects
            screenShakeEnabled: false,
            shakeIntensity: 30, // 0-100
            motionBlurEnabled: false,

            // Micro-interactions
            smoothTransitionsEnabled: true,

            // UI Appearance
            frostedGlassUI: false,
            glassOpacity: 50, // 0-100, controls transparency level
            hoverEffectsEnabled: true,

            // Gesture trails
            gestureTrailsEnabled: false,
            trailLength: 20,

            // Status indicators
            statusIndicatorsEnabled: true,
            glowingBadges: true,

            // WebGL Shaders
            customShadersEnabled: false,
            shaderPreset: 'none', // 'none', 'kaleidoscope', 'pixelate', 'edge', 'vaporwave'

            // VR/3D Mode
            vrModeEnabled: false,
            stereo3DEnabled: false,
            stereoSeparation: 0.064, // Eye separation in meters (default 64mm)
            convergence: 1.0, // Focal distance multiplier

            // WebXR VR Settings
            webXREnabled: false,
            vrControllerSupport: true,
            vrHandTracking: false,
            vrTeleportation: true,
            vrUIOverlay: true,
            vrControllerVibration: true
        };

        this.loadSettings();
        this.init();
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('visual-effects-settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
                console.log('[VISUAL_FX] Settings loaded from localStorage');
            }
        } catch (error) {
            console.error('[VISUAL_FX] Error loading settings from localStorage:', error);
            console.log('[VISUAL_FX] Using default settings');
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('visual-effects-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('[VISUAL_FX] Error saving settings to localStorage:', error);
        }
    }

    /**
     * Initialize effects based on settings
     */
    init() {
        try {
            // Setup mouse tracking
            this.setupMouseTracking();

            // Initialize enabled effects with error handling
            if (this.settings.particlesEnabled) {
                try {
                    this.initParticleSystem();
                } catch (error) {
                    console.error('[VISUAL_FX] Failed to initialize particle system:', error);
                }
            }

            if (this.settings.parallaxEnabled) {
                try {
                    this.initParallaxBackground();
                } catch (error) {
                    console.error('[VISUAL_FX] Failed to initialize parallax background:', error);
                }
            }

            if (this.settings.holographicUIEnabled) {
                try {
                    this.initHolographicUI();
                } catch (error) {
                    console.error('[VISUAL_FX] Failed to initialize holographic UI:', error);
                }
            }

            if (this.settings.gestureTrailsEnabled) {
                try {
                    this.initGestureTrails();
                } catch (error) {
                    console.error('[VISUAL_FX] Failed to initialize gesture trails:', error);
                }
            }

            if (this.settings.advancedLightingEnabled) {
                try {
                    this.initAdvancedLighting();
                } catch (error) {
                    console.error('[VISUAL_FX] Failed to initialize advanced lighting:', error);
                }
            }

            if (this.settings.customShadersEnabled) {
                try {
                    this.initCustomShader();
                } catch (error) {
                    console.error('[VISUAL_FX] Failed to initialize custom shader:', error);
                }
            }

            if (this.settings.vrModeEnabled || this.settings.stereo3DEnabled || this.settings.webXREnabled) {
                try {
                    this.initVRMode();
                } catch (error) {
                    console.error('[VISUAL_FX] Failed to initialize VR mode:', error);
                }
            }

            if (this.settings.audioReactiveEnabled) {
                try {
                    this.initAudioVisualizer();
                } catch (error) {
                    console.error('[VISUAL_FX] Failed to initialize audio visualizer:', error);
                }
            }

            if (this.settings.enhancedReflectionsEnabled) {
                try {
                    this.initEnhancedReflections();
                } catch (error) {
                    console.error('[VISUAL_FX] Failed to initialize enhanced reflections:', error);
                }
            }

            // Apply frosted glass UI if enabled
            if (this.settings.frostedGlassUI) {
                try {
                    document.body.classList.add('frosted-glass-mode');
                    // Make THREE.js scene background transparent
                    if (this.scene) {
                        this.scene.background = null;
                    }
                    // Make renderer transparent
                    if (this.renderer) {
                        this.renderer.setClearColor(0x000000, 0);
                    }
                    // Hide window controls in transparent mode
                    const windowControls = document.getElementById('window-controls');
                    if (windowControls && window.electronAPI) {
                        windowControls.classList.add('hidden');
                    }
                    // Apply saved opacity
                    this.applyGlassOpacity(this.settings.glassOpacity || 50);
                    console.log('[VISUAL_FX] Frosted glass UI applied on init');
                } catch (error) {
                    console.error('[VISUAL_FX] Failed to apply frosted glass UI:', error);
                }
            }

            console.log('[VISUAL_FX] Initialized with settings:', this.settings);
        } catch (error) {
            console.error('[VISUAL_FX] Critical error during initialization:', error);
        }
    }

    /**
     * Setup mouse tracking for effects
     */
    setupMouseTracking() {
        this.mouseMoveHandler = (e) => {
            const prevX = this.mouseX;
            const prevY = this.mouseY;

            this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

            this.mouseVelocityX = this.mouseX - prevX;
            this.mouseVelocityY = this.mouseY - prevY;

            this.lastMouseX = prevX;
            this.lastMouseY = prevY;
        };

        this.clickHandler = (e) => {
            if (this.settings.rippleOnClick) {
                this.createRipple(e.clientX, e.clientY);
            }

            if (this.settings.screenShakeEnabled) {
                this.screenShake(0.02, 200);
            }
        };

        document.addEventListener('mousemove', this.mouseMoveHandler);
        document.addEventListener('click', this.clickHandler);
    }

    // ==================== PARTICLE SYSTEMS ====================

    /**
     * Initialize particle system
     */
    initParticleSystem() {
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            // Properly dispose of old particle system to prevent memory leak
            if (this.particleSystem.geometry) {
                this.particleSystem.geometry.dispose();
            }
            if (this.particleSystem.material) {
                if (Array.isArray(this.particleSystem.material)) {
                    this.particleSystem.material.forEach(m => m.dispose());
                } else {
                    this.particleSystem.material.dispose();
                }
            }
        }

        const particles = this.createParticles(this.settings.particlePreset);
        this.particleSystem = particles;
        this.scene.add(particles);

        console.log(`[VISUAL_FX] Particle system initialized: ${this.settings.particlePreset}`);
    }

    /**
     * Create particle system based on preset
     */
    createParticles(preset) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const velocities = [];
        const colors = [];

        const count = this.settings.particleCount;

        for (let i = 0; i < count; i++) {
            // Random positions
            vertices.push(
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 50
            );

            // Random velocities based on preset
            switch (preset) {
                case 'snow':
                    velocities.push(
                        (Math.random() - 0.5) * 0.02,
                        -Math.random() * 0.05,
                        (Math.random() - 0.5) * 0.02
                    );
                    colors.push(1, 1, 1);
                    break;

                case 'fireflies':
                    velocities.push(
                        (Math.random() - 0.5) * 0.03,
                        (Math.random() - 0.5) * 0.03,
                        (Math.random() - 0.5) * 0.03
                    );
                    colors.push(1, 0.8, 0.2);
                    break;

                case 'confetti':
                    velocities.push(
                        (Math.random() - 0.5) * 0.1,
                        Math.random() * 0.1,
                        (Math.random() - 0.5) * 0.1
                    );
                    colors.push(Math.random(), Math.random(), Math.random());
                    break;

                case 'magic':
                    velocities.push(
                        Math.sin(i) * 0.02,
                        Math.cos(i) * 0.02,
                        (Math.random() - 0.5) * 0.01
                    );
                    const hue = (i / count) * 360;
                    const rgb = this.hslToRgb(hue, 100, 70);
                    colors.push(rgb.r, rgb.g, rgb.b);
                    break;

                case 'stars':
                default:
                    velocities.push(0, 0, 0);
                    const brightness = 0.5 + Math.random() * 0.5;
                    colors.push(brightness, brightness, brightness);
                    break;
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: preset === 'confetti' ? 0.15 : 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const particles = new THREE.Points(geometry, material);
        particles.userData.preset = preset;

        return particles;
    }

    /**
     * Update particles animation
     */
    updateParticles() {
        if (!this.particleSystem) return;

        const positions = this.particleSystem.geometry.attributes.position.array;
        const velocities = this.particleSystem.geometry.attributes.velocity.array;
        const preset = this.particleSystem.userData.preset;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i];
            positions[i + 1] += velocities[i + 1];
            positions[i + 2] += velocities[i + 2];

            // Boundary checks and respawn
            if (preset === 'snow' && positions[i + 1] < -25) {
                positions[i + 1] = 25;
                positions[i] = (Math.random() - 0.5) * 50;
            } else if (Math.abs(positions[i]) > 25 || Math.abs(positions[i + 1]) > 25) {
                positions[i] = (Math.random() - 0.5) * 50;
                positions[i + 1] = (Math.random() - 0.5) * 50;
                positions[i + 2] = (Math.random() - 0.5) * 50;
            }
        }

        this.particleSystem.geometry.attributes.position.needsUpdate = true;

        // Rotate slowly for ambiance
        this.particleSystem.rotation.y += 0.0001;
    }

    // ==================== PARALLAX BACKGROUND ====================

    /**
     * Initialize parallax background layers
     */
    initParallaxBackground() {
        this.clearParallaxLayers();

        const layerCount = this.settings.parallaxLayers;

        for (let i = 0; i < layerCount; i++) {
            const depth = (i + 1) * 10;
            const layer = this.createParallaxLayer(depth, i);
            this.parallaxLayers.push(layer);
            this.scene.add(layer);
        }

        console.log(`[VISUAL_FX] Parallax background initialized with ${layerCount} layers`);
    }

    /**
     * Create a single parallax layer
     */
    createParallaxLayer(depth, index) {
        const geometry = new THREE.PlaneGeometry(100, 100);

        // Create gradient or pattern
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Create nebula-like gradient
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        const hue = (index * 60) % 360;
        gradient.addColorStop(0, `hsla(${hue}, 70%, 50%, 0.1)`);
        gradient.addColorStop(0.5, `hsla(${hue + 30}, 60%, 40%, 0.05)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        // Add stars
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
            ctx.fillRect(
                Math.random() * 512,
                Math.random() * 512,
                Math.random() * 2,
                Math.random() * 2
            );
        }

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.3,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = -depth;
        mesh.userData.depth = depth;
        mesh.userData.baseZ = -depth;

        return mesh;
    }

    /**
     * Update parallax effect
     */
    updateParallax() {
        if (!this.settings.parallaxEnabled) return;

        this.parallaxLayers.forEach((layer, index) => {
            const speed = this.settings.parallaxSpeed * (index + 1) * 0.1;

            // Mouse parallax
            layer.position.x = this.mouseX * speed * 2;
            layer.position.y = this.mouseY * speed * 2;

            // Slow drift
            layer.rotation.z += 0.0001 * (index + 1);
        });
    }

    /**
     * Clear parallax layers
     */
    clearParallaxLayers() {
        this.parallaxLayers.forEach(layer => {
            this.scene.remove(layer);
            // Properly dispose of geometry, material, and texture to prevent memory leak
            if (layer.geometry) layer.geometry.dispose();
            if (layer.material) {
                if (layer.material.map) layer.material.map.dispose();
                layer.material.dispose();
            }
        });
        this.parallaxLayers = [];
    }

    // ==================== HOLOGRAPHIC UI ====================

    /**
     * Initialize holographic UI effects
     */
    initHolographicUI() {
        // Add scanlines overlay
        if (this.settings.scanlineEffect) {
            this.addScanlinesOverlay();
        }

        // Add holographic shader to UI elements
        this.applyHolographicShader();

        console.log('[VISUAL_FX] Holographic UI initialized');
    }

    /**
     * Add scanlines overlay
     */
    addScanlinesOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'scanlines-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
            background: repeating-linear-gradient(
                0deg,
                rgba(0, 255, 255, 0.03) 0px,
                transparent 1px,
                transparent 2px,
                rgba(0, 255, 255, 0.03) 3px
            );
            animation: scanline-move 10s linear infinite;
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes scanline-move {
                0% { transform: translateY(0); }
                100% { transform: translateY(10px); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(overlay);
    }

    /**
     * Apply holographic shader effect
     */
    applyHolographicShader() {
        // Add CSS class for holographic effect
        const style = document.createElement('style');
        style.id = 'holographic-style';
        style.textContent = `
            .holographic {
                position: relative;
                overflow: hidden;
            }
            .holographic::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: linear-gradient(
                    45deg,
                    transparent 30%,
                    rgba(0, 255, 255, 0.1) 50%,
                    transparent 70%
                );
                animation: holographic-sweep 3s linear infinite;
            }
            @keyframes holographic-sweep {
                0% { transform: translateX(-100%) translateY(-100%); }
                100% { transform: translateX(100%) translateY(100%); }
            }
        `;
        document.head.appendChild(style);

        // Apply to UI elements
        document.querySelectorAll('.modal-content, #info-panel').forEach(el => {
            el.classList.add('holographic');
        });
    }

    // ==================== INTERACTION EFFECTS ====================

    /**
     * Create ripple effect on click
     */
    createRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid rgba(79, 195, 247, 0.8);
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 9999;
            animation: ripple-expand 0.6s ease-out forwards;
        `;

        const style = document.createElement('style');
        if (!document.getElementById('ripple-animation')) {
            style.id = 'ripple-animation';
            style.textContent = `
                @keyframes ripple-expand {
                    to {
                        width: 200px;
                        height: 200px;
                        opacity: 0;
                        border-width: 1px;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }

    /**
     * Screen shake effect
     */
    screenShake(intensity = 0.02, duration = 300) {
        const originalPosition = {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
        };

        const startTime = Date.now();

        const shake = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                const progress = elapsed / duration;
                const currentIntensity = intensity * (1 - progress);

                this.camera.position.x = originalPosition.x + (Math.random() - 0.5) * currentIntensity;
                this.camera.position.y = originalPosition.y + (Math.random() - 0.5) * currentIntensity;

                requestAnimationFrame(shake);
            } else {
                this.camera.position.set(originalPosition.x, originalPosition.y, originalPosition.z);
            }
        };

        shake();
    }

    // ==================== GESTURE TRAILS ====================

    /**
     * Initialize gesture trails
     */
    initGestureTrails() {
        this.trailPoints = [];
        this.trailGeometry = new THREE.BufferGeometry();

        const positions = new Float32Array(this.settings.trailLength * 3);
        this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0x4fc3f7,
            opacity: 0.6,
            transparent: true,
            linewidth: 2
        });

        this.trailLine = new THREE.Line(this.trailGeometry, material);
        this.scene.add(this.trailLine);

        console.log('[VISUAL_FX] Gesture trails initialized');
    }

    /**
     * Update gesture trails
     */
    updateGestureTrails() {
        if (!this.settings.gestureTrailsEnabled || !this.trailLine) return;

        // Add current mouse position
        this.trailPoints.unshift({ x: this.mouseX * 10, y: this.mouseY * 10, z: 0 });

        // Limit trail length
        if (this.trailPoints.length > this.settings.trailLength) {
            this.trailPoints.pop();
        }

        // Update geometry
        const positions = this.trailGeometry.attributes.position.array;
        for (let i = 0; i < this.trailPoints.length; i++) {
            positions[i * 3] = this.trailPoints[i].x;
            positions[i * 3 + 1] = this.trailPoints[i].y;
            positions[i * 3 + 2] = this.trailPoints[i].z;
        }

        this.trailGeometry.attributes.position.needsUpdate = true;
    }

    // ==================== IDLE ANIMATIONS ====================

    /**
     * Update idle animations
     */
    updateIdleAnimations(covers) {
        if (!this.settings.idleAnimationsEnabled) return;
        if (!covers || covers.length === 0) return;

        const time = Date.now() * 0.001;

        covers.forEach((cover, index) => {
            if (!cover) return;

            if (this.settings.idleFloating) {
                cover.position.y += Math.sin(time + index) * 0.001;
            }

            if (this.settings.idleBreathing) {
                const breathe = 1 + Math.sin(time * 0.5 + index) * 0.02;
                cover.scale.set(breathe, breathe, breathe);
            }
        });
    }

    // ==================== ADVANCED LIGHTING ====================

    /**
     * Initialize advanced lighting effects
     */
    initAdvancedLighting() {
        // Rim lighting
        if (this.settings.rimLightingEnabled) {
            const rimLight = new THREE.DirectionalLight(0x4fc3f7, 0.5);
            rimLight.position.set(10, 10, 10);
            this.rimLight = rimLight;
            this.scene.add(rimLight);
        }

        // God rays (volumetric light)
        if (this.settings.godRaysEnabled) {
            this.createGodRays();
        }

        // Ambient color bleed
        if (this.settings.colorBleedEnabled) {
            const colorLight1 = new THREE.PointLight(0xff3366, 0.3, 50);
            colorLight1.position.set(-10, 5, 0);
            this.colorLight1 = colorLight1;
            this.scene.add(colorLight1);

            const colorLight2 = new THREE.PointLight(0x3366ff, 0.3, 50);
            colorLight2.position.set(10, 5, 0);
            this.colorLight2 = colorLight2;
            this.scene.add(colorLight2);
        }

        console.log('[VISUAL_FX] Advanced lighting initialized');
    }

    /**
     * Create god rays effect
     */
    createGodRays() {
        const geometry = new THREE.PlaneGeometry(50, 50);
        const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec2 vUv;
                void main() {
                    vec2 center = vec2(0.5, 0.5);
                    float dist = distance(vUv, center);
                    float rays = sin(atan(vUv.y - center.y, vUv.x - center.x) * 8.0 + time) * 0.5 + 0.5;
                    float intensity = (1.0 - dist) * rays * 0.1;
                    gl_FragColor = vec4(1.0, 0.9, 0.7, intensity);
                }
            `
        });

        this.godRaysMesh = new THREE.Mesh(geometry, material);
        this.godRaysMesh.position.z = -20;
        this.scene.add(this.godRaysMesh);
    }

    /**
     * Update advanced lighting
     */
    updateAdvancedLighting() {
        if (!this.settings.advancedLightingEnabled) return;

        const time = Date.now() * 0.001;

        // Animate god rays
        if (this.godRaysMesh) {
            this.godRaysMesh.material.uniforms.time.value = time;
            this.godRaysMesh.rotation.z = time * 0.1;
        }

        // Animate color bleed lights
        if (this.colorLight1 && this.colorLight2) {
            this.colorLight1.position.x = Math.sin(time * 0.5) * 15;
            this.colorLight2.position.x = Math.cos(time * 0.5) * 15;
        }
    }

    // ==================== WEBGL SHADERS GALLERY ====================

    /**
     * Initialize custom shader effect
     */
    initCustomShader() {
        if (!this.settings.customShadersEnabled || this.settings.shaderPreset === 'none') return;

        // Create full-screen shader plane
        const geometry = new THREE.PlaneGeometry(2, 2);
        let material;

        switch (this.settings.shaderPreset) {
            case 'kaleidoscope':
                material = this.createKaleidoscopeShader();
                break;
            case 'pixelate':
                material = this.createPixelateShader();
                break;
            case 'edge':
                material = this.createEdgeDetectionShader();
                break;
            case 'vaporwave':
                material = this.createVaporwaveShader();
                break;
            default:
                return;
        }

        this.shaderMesh = new THREE.Mesh(geometry, material);
        this.shaderMesh.position.z = -5;
        this.scene.add(this.shaderMesh);

        console.log(`[VISUAL_FX] Custom shader initialized: ${this.settings.shaderPreset}`);
    }

    /**
     * Create kaleidoscope shader
     */
    createKaleidoscopeShader() {
        return new THREE.ShaderMaterial({
            transparent: true,
            uniforms: {
                time: { value: 0 },
                segments: { value: 6.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float segments;
                varying vec2 vUv;

                void main() {
                    vec2 center = vec2(0.5, 0.5);
                    vec2 pos = vUv - center;

                    float angle = atan(pos.y, pos.x);
                    float radius = length(pos);

                    angle = mod(angle, 3.14159 * 2.0 / segments);

                    vec2 kaleidoPos = vec2(cos(angle), sin(angle)) * radius + center;

                    vec3 color = vec3(
                        sin(kaleidoPos.x * 10.0 + time) * 0.5 + 0.5,
                        sin(kaleidoPos.y * 10.0 + time * 1.3) * 0.5 + 0.5,
                        sin((kaleidoPos.x + kaleidoPos.y) * 5.0 + time * 1.7) * 0.5 + 0.5
                    );

                    gl_FragColor = vec4(color * 0.3, 0.3);
                }
            `
        });
    }

    /**
     * Create pixelate shader
     */
    createPixelateShader() {
        return new THREE.ShaderMaterial({
            transparent: true,
            uniforms: {
                time: { value: 0 },
                pixelSize: { value: 0.02 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float pixelSize;
                varying vec2 vUv;

                void main() {
                    vec2 pixelated = floor(vUv / pixelSize) * pixelSize;

                    vec3 color = vec3(
                        sin(pixelated.x * 20.0 + time) * 0.5 + 0.5,
                        cos(pixelated.y * 20.0 + time) * 0.5 + 0.5,
                        sin(time) * 0.5 + 0.5
                    );

                    gl_FragColor = vec4(color * 0.2, 0.2);
                }
            `
        });
    }

    /**
     * Create edge detection shader
     */
    createEdgeDetectionShader() {
        return new THREE.ShaderMaterial({
            transparent: true,
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec2 vUv;

                void main() {
                    vec2 center = vec2(0.5, 0.5);
                    float dist = distance(vUv, center);

                    float edge = smoothstep(0.3, 0.31, dist) - smoothstep(0.49, 0.5, dist);
                    edge += smoothstep(0.15, 0.16, dist) - smoothstep(0.29, 0.3, dist);

                    vec3 color = vec3(0.3, 0.8, 1.0) * edge;

                    gl_FragColor = vec4(color, edge * 0.5);
                }
            `
        });
    }

    /**
     * Create vaporwave aesthetic shader
     */
    createVaporwaveShader() {
        return new THREE.ShaderMaterial({
            transparent: true,
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec2 vUv;

                void main() {
                    vec2 uv = vUv;

                    // Grid effect
                    float gridX = smoothstep(0.48, 0.5, fract(uv.x * 20.0));
                    float gridY = smoothstep(0.48, 0.5, fract(uv.y * 20.0 + time * 0.5));
                    float grid = max(gridX, gridY);

                    // Gradient
                    vec3 color1 = vec3(1.0, 0.3, 0.8); // Pink
                    vec3 color2 = vec3(0.3, 0.8, 1.0); // Cyan
                    vec3 gradient = mix(color1, color2, uv.y);

                    vec3 finalColor = gradient * grid;

                    gl_FragColor = vec4(finalColor * 0.3, 0.3);
                }
            `
        });
    }

    /**
     * Update shader effects
     */
    updateCustomShader() {
        if (!this.shaderMesh) return;

        const time = Date.now() * 0.001;
        this.shaderMesh.material.uniforms.time.value = time;
    }

    // ==================== VR/3D MODE ====================

    /**
     * Initialize VR/3D stereoscopic mode
     */
    initVRMode() {
        if (!this.settings.vrModeEnabled && !this.settings.stereo3DEnabled && !this.settings.webXREnabled) return;

        // Create second camera for right eye (for stereo 3D)
        this.rightCamera = this.camera.clone();
        this.eyeSeparation = 0.064; // Average human eye separation in meters

        // Initialize WebXR VR support
        if (this.settings.webXREnabled) {
            this.initWebXR();
        }

        console.log('[VISUAL_FX] VR/3D mode initialized');
    }

    /**
     * Initialize WebXR for Steam VR and other VR headsets
     */
    async initWebXR() {
        try {
            // Check if WebXR is supported
            if (!navigator.xr) {
                console.warn('[VISUAL_FX] WebXR not supported in this browser');
                return;
            }

            // Check if VR is supported
            const isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
            if (!isVRSupported) {
                console.warn('[VISUAL_FX] VR not supported on this device');
                return;
            }

            // Enable XR on the renderer
            this.renderer.xr.enabled = true;

            // VR Session state
            this.vrSession = null;
            this.vrControllers = [];
            this.vrControllerGrips = [];
            this.vrRaySpaces = [];

            // Create VR button
            this.createVRButton();

            // Initialize VR controllers
            if (this.settings.vrControllerSupport) {
                this.initVRControllers();
            }

            // Initialize VR UI overlay
            if (this.settings.vrUIOverlay) {
                this.initVRUIOverlay();
            }

            console.log('[VISUAL_FX] WebXR initialized successfully - Steam VR compatible');
        } catch (error) {
            console.error('[VISUAL_FX] Error initializing WebXR:', error);
        }
    }

    /**
     * Create VR button to enter VR mode
     */
    createVRButton() {
        const button = document.createElement('button');
        button.id = 'vr-button';
        button.textContent = 'Enter VR';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
        });

        button.addEventListener('click', async () => {
            if (!this.vrSession) {
                await this.enterVR();
            } else {
                await this.exitVR();
            }
        });

        document.body.appendChild(button);
        this.vrButton = button;
    }

    /**
     * Enter VR mode
     */
    async enterVR() {
        try {
            const sessionInit = {
                optionalFeatures: [
                    'local-floor',
                    'bounded-floor',
                    'hand-tracking',
                    'layers'
                ]
            };

            this.vrSession = await navigator.xr.requestSession('immersive-vr', sessionInit);

            // Set up the session
            await this.renderer.xr.setSession(this.vrSession);

            // Update button
            this.vrButton.textContent = 'Exit VR';
            this.vrButton.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';

            // Handle session end
            this.vrSession.addEventListener('end', () => {
                this.onVRSessionEnded();
            });

            // Set up VR controllers
            if (this.settings.vrControllerSupport) {
                this.setupVRControllers();
            }

            // Set up hand tracking if available
            if (this.settings.vrHandTracking) {
                this.setupHandTracking();
            }

            console.log('[VISUAL_FX] Entered VR mode');
        } catch (error) {
            console.error('[VISUAL_FX] Failed to enter VR:', error);
            alert('Failed to enter VR mode. Make sure your VR headset is connected and Steam VR is running.');
        }
    }

    /**
     * Exit VR mode
     */
    async exitVR() {
        if (this.vrSession) {
            await this.vrSession.end();
        }
    }

    /**
     * Handle VR session ended
     */
    onVRSessionEnded() {
        this.vrSession = null;

        // Update button
        if (this.vrButton) {
            this.vrButton.textContent = 'Enter VR';
            this.vrButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }

        console.log('[VISUAL_FX] Exited VR mode');
    }

    /**
     * Initialize VR controllers
     */
    initVRControllers() {
        // Controller 0 (left hand)
        const controller0 = this.renderer.xr.getController(0);
        controller0.addEventListener('selectstart', () => this.onVRSelect(0, true));
        controller0.addEventListener('selectend', () => this.onVRSelect(0, false));
        controller0.addEventListener('squeezestart', () => this.onVRSqueeze(0, true));
        controller0.addEventListener('squeezeend', () => this.onVRSqueeze(0, false));
        this.scene.add(controller0);
        this.vrControllers[0] = controller0;

        // Controller 1 (right hand)
        const controller1 = this.renderer.xr.getController(1);
        controller1.addEventListener('selectstart', () => this.onVRSelect(1, true));
        controller1.addEventListener('selectend', () => this.onVRSelect(1, false));
        controller1.addEventListener('squeezestart', () => this.onVRSqueeze(1, true));
        controller1.addEventListener('squeezeend', () => this.onVRSqueeze(1, false));
        this.scene.add(controller1);
        this.vrControllers[1] = controller1;

        // Controller grips (for showing controller models)
        const controllerGrip0 = this.renderer.xr.getControllerGrip(0);
        this.scene.add(controllerGrip0);
        this.vrControllerGrips[0] = controllerGrip0;

        const controllerGrip1 = this.renderer.xr.getControllerGrip(1);
        this.scene.add(controllerGrip1);
        this.vrControllerGrips[1] = controllerGrip1;

        // Add visual ray casters for controllers
        this.addControllerRays();

        console.log('[VISUAL_FX] VR controllers initialized');
    }

    /**
     * Add visual rays to controllers
     */
    addControllerRays() {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);

        const material = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            linewidth: 2,
            transparent: true,
            opacity: 0.7
        });

        for (let i = 0; i < 2; i++) {
            const line = new THREE.Line(geometry, material);
            line.name = 'ray';
            line.scale.z = 5; // Ray length
            this.vrControllers[i].add(line);
        }
    }

    /**
     * Setup VR controllers after session started
     */
    setupVRControllers() {
        // Controllers are already initialized in initVRControllers
        // This method can be used for session-specific setup
        console.log('[VISUAL_FX] VR controllers set up for session');
    }

    /**
     * Setup hand tracking
     */
    setupHandTracking() {
        // Hand tracking requires XRHand feature
        if (this.vrSession && this.vrSession.inputSources) {
            this.vrSession.addEventListener('inputsourceschange', (event) => {
                event.added.forEach((inputSource) => {
                    if (inputSource.hand) {
                        console.log('[VISUAL_FX] Hand tracking available');
                        // Create hand visualization
                        this.createHandModel(inputSource);
                    }
                });
            });
        }
    }

    /**
     * Create hand model for hand tracking
     */
    createHandModel(inputSource) {
        // Create simple sphere visualization for hand joints
        const handGroup = new THREE.Group();

        // Add sphere for each joint
        const geometry = new THREE.SphereGeometry(0.01, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

        for (let i = 0; i < 25; i++) { // XRHand has 25 joints
            const sphere = new THREE.Mesh(geometry, material);
            handGroup.add(sphere);
        }

        this.scene.add(handGroup);
        console.log('[VISUAL_FX] Hand model created');
    }

    /**
     * Handle VR controller select (trigger)
     */
    onVRSelect(controllerIndex, pressed) {
        if (pressed) {
            console.log(`[VISUAL_FX] Controller ${controllerIndex} trigger pressed`);

            // Navigate through covers
            if (controllerIndex === 1) { // Right controller = next
                if (this.coverflow && typeof this.coverflow.nextCover === 'function') {
                    this.coverflow.nextCover();
                }
            } else { // Left controller = previous
                if (this.coverflow && typeof this.coverflow.prevCover === 'function') {
                    this.coverflow.prevCover();
                }
            }

            // Vibrate controller
            if (this.settings.vrControllerVibration) {
                this.vibrateController(controllerIndex, 0.3, 100);
            }
        }
    }

    /**
     * Handle VR controller squeeze (grip)
     */
    onVRSqueeze(controllerIndex, pressed) {
        if (pressed) {
            console.log(`[VISUAL_FX] Controller ${controllerIndex} grip pressed`);

            // Launch game on grip
            if (this.coverflow && typeof this.coverflow.launchSelectedGame === 'function') {
                this.coverflow.launchSelectedGame();

                // Strong vibration for launch
                if (this.settings.vrControllerVibration) {
                    this.vibrateController(controllerIndex, 0.7, 200);
                }
            }
        }
    }

    /**
     * Vibrate VR controller
     */
    vibrateController(controllerIndex, intensity, duration) {
        if (this.vrSession && this.vrSession.inputSources[controllerIndex]) {
            const inputSource = this.vrSession.inputSources[controllerIndex];
            if (inputSource.gamepad && inputSource.gamepad.hapticActuators && inputSource.gamepad.hapticActuators[0]) {
                inputSource.gamepad.hapticActuators[0].pulse(intensity, duration);
            }
        }
    }

    /**
     * Initialize VR UI overlay
     */
    initVRUIOverlay() {
        // Create a canvas for UI
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const context = canvas.getContext('2d');

        // Draw UI
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = 'white';
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.fillText('VR Mode Active', canvas.width / 2, 100);

        context.font = '32px Arial';
        context.fillText('Right Trigger: Next Cover', canvas.width / 2, 200);
        context.fillText('Left Trigger: Previous Cover', canvas.width / 2, 250);
        context.fillText('Grip Button: Launch Game', canvas.width / 2, 300);
        context.fillText('Menu Button: Exit VR', canvas.width / 2, 350);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);

        // Create UI plane
        const geometry = new THREE.PlaneGeometry(2, 1);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        this.vrUIPanel = new THREE.Mesh(geometry, material);
        this.vrUIPanel.position.set(0, 1.6, -2); // Position in front of user
        this.scene.add(this.vrUIPanel);

        // Make it face the camera
        this.vrUIPanel.lookAt(this.camera.position);

        console.log('[VISUAL_FX] VR UI overlay created');
    }

    /**
     * Update VR UI overlay with current game info (Enhanced)
     */
    updateVRUI(albumTitle, albumArtist, gameData = null) {
        if (!this.vrUIPanel) return;

        const canvas = document.createElement('canvas');
        canvas.width = 1536;  // Higher resolution for better VR readability
        canvas.height = 768;
        const context = canvas.getContext('2d');

        // Draw background with gradient
        const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
        gradient.addColorStop(1, 'rgba(20, 20, 40, 0.95)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Draw border
        context.strokeStyle = '#4fc3f7';
        context.lineWidth = 4;
        context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // Draw game cover image if available
        let coverImageLoaded = false;
        if (gameData && gameData.image) {
            try {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    // Draw cover on left side
                    const coverWidth = 200;
                    const coverHeight = 300;
                    const coverX = 50;
                    const coverY = (canvas.height - coverHeight) / 2;
                    context.drawImage(img, coverX, coverY, coverWidth, coverHeight);

                    // Re-update texture with image
                    const texture = new THREE.CanvasTexture(canvas);
                    this.vrUIPanel.material.map = texture;
                    this.vrUIPanel.material.needsUpdate = true;
                };
                img.src = gameData.image;
            } catch (error) {
                console.warn('[VR] Failed to load game cover:', error);
            }
        }

        // Draw game title (centered, or offset if cover loaded)
        const textStartX = canvas.width / 2;
        context.fillStyle = 'white';
        context.font = 'bold 72px Arial';
        context.textAlign = 'center';
        context.shadowColor = 'rgba(0, 0, 0, 0.8)';
        context.shadowBlur = 10;

        // Truncate long titles
        let displayTitle = albumTitle || 'No Game Selected';
        if (displayTitle.length > 30) {
            displayTitle = displayTitle.substring(0, 27) + '...';
        }
        context.fillText(displayTitle, textStartX, 120);

        // Draw platform/artist
        context.font = '40px Arial';
        context.fillStyle = '#4fc3f7';
        context.fillText(albumArtist || '', textStartX, 180);

        // Draw additional game details if available
        if (gameData) {
            let detailsY = 250;

            // Genre
            if (gameData.genre) {
                context.font = '32px Arial';
                context.fillStyle = '#aaa';
                context.fillText(`Genre: ${gameData.genre}`, textStartX, detailsY);
                detailsY += 50;
            }

            // Rating
            if (gameData.rating) {
                const stars = '⭐'.repeat(Math.floor(gameData.rating));
                context.fillText(`Rating: ${stars} ${gameData.rating}/5`, textStartX, detailsY);
                detailsY += 50;
            }

            // Playtime
            if (gameData.total_play_time || gameData.playtime) {
                const hours = Math.floor((gameData.total_play_time || gameData.playtime) / 60);
                context.fillText(`Playtime: ${hours}h`, textStartX, detailsY);
                detailsY += 50;
            }

            // VR Badge
            if (gameData.has_vr_support) {
                context.font = 'bold 36px Arial';
                context.fillStyle = '#00ff00';
                context.fillText('🥽 VR COMPATIBLE', textStartX, detailsY);
            }
        }

        // Draw enhanced controls
        context.font = '28px Arial';
        context.fillStyle = '#888';
        context.textAlign = 'center';
        const controlsY = canvas.height - 100;
        context.fillText('LEFT TRIGGER: ◀ Previous', canvas.width * 0.25, controlsY);
        context.fillText('RIGHT TRIGGER: Next ▶', canvas.width * 0.5, controlsY);
        context.fillText('GRIP: Launch 🚀', canvas.width * 0.75, controlsY);

        context.fillText('MENU: Exit VR | A/X: Select', canvas.width * 0.5, controlsY + 40);

        // Reset shadow
        context.shadowBlur = 0;

        // Update texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;  // Better filtering for VR
        texture.magFilter = THREE.LinearFilter;
        this.vrUIPanel.material.map = texture;
        this.vrUIPanel.material.needsUpdate = true;
    }

    /**
     * Render stereo 3D view
     */
    renderStereo() {
        if (!this.settings.stereo3DEnabled || !this.rightCamera) return;

        const originalCameraX = this.camera.position.x;

        // Render left eye
        this.camera.position.x = originalCameraX - this.eyeSeparation / 2;
        this.renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
        this.renderer.render(this.scene, this.camera);

        // Render right eye
        this.rightCamera.position.copy(this.camera.position);
        this.rightCamera.position.x = originalCameraX + this.eyeSeparation / 2;
        this.rightCamera.rotation.copy(this.camera.rotation);
        this.renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
        this.renderer.render(this.scene, this.rightCamera);

        // Reset
        this.camera.position.x = originalCameraX;
        this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    }

    // ==================== AUDIO VISUALIZER ====================

    /**
     * Initialize audio visualizer
     */
    initAudioVisualizer() {
        if (!this.settings.audioReactiveEnabled) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);

        console.log('[VISUAL_FX] Audio visualizer initialized');
    }

    /**
     * Connect audio source
     */
    connectAudioSource(audioElement) {
        if (!this.audioContext) return;

        const source = this.audioContext.createMediaElementSource(audioElement);
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
    }

    /**
     * Update effects based on audio
     */
    updateAudioReactive() {
        if (!this.settings.audioReactiveEnabled || !this.analyser) return;

        this.analyser.getByteFrequencyData(this.audioDataArray);

        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < this.audioDataArray.length; i++) {
            sum += this.audioDataArray[i];
        }
        const average = sum / this.audioDataArray.length;
        const normalizedAmplitude = average / 255;

        // React particle system to audio
        if (this.particleSystem) {
            this.particleSystem.scale.setScalar(1 + normalizedAmplitude * 0.3);
        }

        // React lights to bass
        const bass = this.audioDataArray[0] / 255;
        if (this.colorLight1) {
            this.colorLight1.intensity = 0.3 + bass * 0.7;
        }
        if (this.colorLight2) {
            this.colorLight2.intensity = 0.3 + bass * 0.7;
        }
    }

    // ==================== MOUSE INTERACTION EFFECTS ====================

    /**
     * Update magnetic covers effect
     */
    updateMagneticCovers(covers) {
        if (!this.settings.magneticCovers) return;
        if (!covers || covers.length === 0) return;

        covers.forEach(cover => {
            if (!cover) return;

            try {
                const coverPos = new THREE.Vector3();
                cover.getWorldPosition(coverPos);

                // Project to screen space
                coverPos.project(this.camera);

                // Calculate distance to mouse
                const dx = this.mouseX - coverPos.x;
                const dy = this.mouseY - coverPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Apply magnetic force
                if (distance < 0.5) {
                    const force = (0.5 - distance) * 0.1;
                    cover.position.x += dx * force;
                    cover.position.y += dy * force;
                }
            } catch (error) {
                // Skip this cover if there's an error
                return;
            }
        });
    }

    /**
     * Update tilt with mouse effect
     */
    updateTiltWithMouse(covers) {
        if (!this.settings.tiltWithMouse) return;
        if (!covers || covers.length === 0) return;

        covers.forEach(cover => {
            if (!cover) return;

            cover.rotation.y = this.mouseX * 0.3;
            cover.rotation.x = this.mouseY * 0.3;
        });
    }

    // ==================== LOADING ANIMATIONS ====================

    /**
     * Show loading animation
     */
    showLoadingAnimation(preset = 'spinner') {
        if (!this.settings.loadingAnimationsEnabled) return;

        const loader = document.createElement('div');
        loader.id = 'visual-fx-loader';
        loader.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
        `;

        switch (preset) {
            case 'spinner':
                loader.innerHTML = '<div class="spinner"></div>';
                this.addSpinnerStyle();
                break;
            case 'pulse':
                loader.innerHTML = '<div class="pulse"></div>';
                this.addPulseStyle();
                break;
            case 'dots':
                loader.innerHTML = '<div class="dots"><span></span><span></span><span></span></div>';
                this.addDotsStyle();
                break;
        }

        document.body.appendChild(loader);
    }

    /**
     * Hide loading animation
     */
    hideLoadingAnimation() {
        document.getElementById('visual-fx-loader')?.remove();
    }

    addSpinnerStyle() {
        if (document.getElementById('spinner-style')) return;

        const style = document.createElement('style');
        style.id = 'spinner-style';
        style.textContent = `
            .spinner {
                width: 50px;
                height: 50px;
                border: 5px solid rgba(79, 195, 247, 0.3);
                border-top-color: #4fc3f7;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    addPulseStyle() {
        if (document.getElementById('pulse-style')) return;

        const style = document.createElement('style');
        style.id = 'pulse-style';
        style.textContent = `
            .pulse {
                width: 50px;
                height: 50px;
                background: #4fc3f7;
                border-radius: 50%;
                animation: pulse 1.5s ease-in-out infinite;
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.5); opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
    }

    addDotsStyle() {
        if (document.getElementById('dots-style')) return;

        const style = document.createElement('style');
        style.id = 'dots-style';
        style.textContent = `
            .dots {
                display: flex;
                gap: 10px;
            }
            .dots span {
                width: 15px;
                height: 15px;
                background: #4fc3f7;
                border-radius: 50%;
                animation: bounce 1.4s ease-in-out infinite;
            }
            .dots span:nth-child(1) { animation-delay: 0s; }
            .dots span:nth-child(2) { animation-delay: 0.2s; }
            .dots span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes bounce {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    // ==================== 3D TRANSITIONS ====================

    /**
     * Transition between covers with 3D effect
     */
    transitionCovers(fromCover, toCover, type = null) {
        if (!this.settings.transitionsEnabled) return;
        if (!fromCover || !toCover) return;

        const transitionType = type || this.settings.transitionType;

        switch (transitionType) {
            case 'flip':
                this.flipTransition(fromCover, toCover);
                break;
            case 'cube':
                this.cubeTransition(fromCover, toCover);
                break;
            case 'portal':
                this.portalTransition(fromCover, toCover);
                break;
            case 'morph':
                this.morphTransition(fromCover, toCover);
                break;
            case 'slide':
            default:
                // Default slide is handled by coverflow
                break;
        }
    }

    /**
     * Flip transition effect
     */
    flipTransition(fromCover, toCover) {
        const duration = 500;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            fromCover.rotation.y = progress * Math.PI;

            if (progress < 0.5) {
                fromCover.visible = true;
                toCover.visible = false;
            } else {
                fromCover.visible = false;
                toCover.visible = true;
                toCover.rotation.y = (progress - 0.5) * Math.PI * 2;
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                fromCover.rotation.y = 0;
                toCover.rotation.y = 0;
            }
        };

        animate();
    }

    /**
     * Cube transition effect
     */
    cubeTransition(fromCover, toCover) {
        const duration = 600;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const angle = progress * Math.PI / 2;

            fromCover.rotation.y = angle;
            fromCover.position.z = -Math.sin(angle) * 2;

            toCover.rotation.y = angle - Math.PI / 2;
            toCover.position.z = -Math.sin(angle - Math.PI / 2) * 2;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                fromCover.rotation.y = 0;
                toCover.rotation.y = 0;
                fromCover.position.z = 0;
                toCover.position.z = 0;
            }
        };

        animate();
    }

    /**
     * Portal transition effect
     */
    portalTransition(fromCover, toCover) {
        const duration = 700;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            if (progress < 0.5) {
                const scale = Math.max(0.01, 1 - (progress * 2)); // Prevent scale from going to 0
                fromCover.scale.setScalar(scale);
                fromCover.rotation.z = progress * Math.PI * 4;
                toCover.visible = false;
            } else {
                fromCover.visible = false;
                const scale = Math.max(0.01, (progress - 0.5) * 2); // Prevent scale from going to 0
                toCover.scale.setScalar(scale);
                toCover.rotation.z = -(1 - progress) * Math.PI * 4;
                toCover.visible = true;
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Reset both covers
                fromCover.visible = true;
                toCover.visible = true;
                fromCover.scale.setScalar(1);
                toCover.scale.setScalar(1);
                fromCover.rotation.z = 0;
                toCover.rotation.z = 0;
            }
        };

        animate();
    }

    /**
     * Morph transition effect
     */
    morphTransition(fromCover, toCover) {
        const duration = 500;
        const startTime = Date.now();

        // Ensure materials are transparent
        if (fromCover.material) {
            fromCover.material.transparent = true;
        }
        if (toCover.material) {
            toCover.material.transparent = true;
        }

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease in-out
            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            // Safely update opacity
            if (fromCover.material && fromCover.material.opacity !== undefined) {
                fromCover.material.opacity = 1 - easeProgress;
            }
            if (toCover.material && toCover.material.opacity !== undefined) {
                toCover.material.opacity = easeProgress;
            }

            fromCover.position.y = easeProgress * 2;
            toCover.position.y = -(1 - easeProgress) * 2;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Reset
                if (fromCover.material && fromCover.material.opacity !== undefined) {
                    fromCover.material.opacity = 1;
                }
                if (toCover.material && toCover.material.opacity !== undefined) {
                    toCover.material.opacity = 1;
                }
                fromCover.position.y = 0;
                toCover.position.y = 0;
            }
        };

        animate();
    }

    // ==================== ENHANCED REFLECTIONS ====================

    /**
     * Initialize enhanced reflections
     */
    initEnhancedReflections() {
        // Create reflection plane
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        this.reflectionPlane = new THREE.Mesh(geometry, material);
        this.reflectionPlane.rotation.x = -Math.PI / 2;
        this.reflectionPlane.position.y = -3;
        this.scene.add(this.reflectionPlane);

        console.log('[VISUAL_FX] Enhanced reflections initialized');
    }

    /**
     * Clear all reflection meshes
     */
    clearReflections(covers) {
        if (!covers) return;

        covers.forEach(cover => {
            if (cover && cover.userData && cover.userData.reflection) {
                this.scene.remove(cover.userData.reflection);
                cover.userData.reflection = null;
            }
        });
    }

    /**
     * Update enhanced reflections
     */
    updateEnhancedReflections(covers) {
        if (!this.reflectionPlane) return;
        if (!covers || covers.length === 0) return;

        // Create mirrored covers effect
        covers.forEach((cover, index) => {
            if (!cover || !cover.material) return;

            if (!cover.userData.reflection) {
                try {
                    const reflection = cover.clone();
                    reflection.scale.y = -1;
                    reflection.position.y = -6;

                    // Safely clone material
                    if (cover.material.clone) {
                        reflection.material = cover.material.clone();
                        reflection.material.opacity = 0.3;
                        reflection.material.transparent = true;
                    } else {
                        // Fallback: create new basic material
                        reflection.material = new THREE.MeshBasicMaterial({
                            color: 0xffffff,
                            opacity: 0.3,
                            transparent: true
                        });
                    }

                    cover.userData.reflection = reflection;
                    this.scene.add(reflection);
                } catch (error) {
                    console.warn('[VISUAL_FX] Failed to create reflection for cover:', error);
                    return;
                }
            }

            // Update reflection position to match cover
            if (cover.userData.reflection) {
                const reflection = cover.userData.reflection;
                reflection.position.x = cover.position.x;
                reflection.position.z = cover.position.z;
                reflection.rotation.y = cover.rotation.y;
            }
        });
    }

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * HSL to RGB conversion
     */
    hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return { r: f(0), g: f(8), b: f(4) };
    }

    /**
     * Main update loop - call this in animation frame
     */
    update(covers = []) {
        try {
            // Cache covers for cleanup operations
            if (covers && covers.length > 0) {
                this.coversCache = covers;
            }

            if (this.settings.particlesEnabled) {
                try {
                    this.updateParticles();
                } catch (error) {
                    console.error('[VISUAL_FX] Error updating particles:', error);
                }
            }

            if (this.settings.parallaxEnabled) {
                try {
                    this.updateParallax();
                } catch (error) {
                    console.error('[VISUAL_FX] Error updating parallax:', error);
                }
            }

            if (this.settings.gestureTrailsEnabled) {
                try {
                    this.updateGestureTrails();
                } catch (error) {
                    console.error('[VISUAL_FX] Error updating gesture trails:', error);
                }
            }

            if (this.settings.idleAnimationsEnabled) {
                try {
                    this.updateIdleAnimations(covers);
                } catch (error) {
                    console.error('[VISUAL_FX] Error updating idle animations:', error);
                }
            }

            if (this.settings.advancedLightingEnabled) {
                try {
                    this.updateAdvancedLighting();
                } catch (error) {
                    console.error('[VISUAL_FX] Error updating advanced lighting:', error);
                }
            }

            if (this.settings.customShadersEnabled) {
                try {
                    this.updateCustomShader();
                } catch (error) {
                    console.error('[VISUAL_FX] Error updating custom shader:', error);
                }
            }

            if (this.settings.audioReactiveEnabled) {
                try {
                    this.updateAudioReactive();
                } catch (error) {
                    console.error('[VISUAL_FX] Error updating audio reactive:', error);
                }
            }

            if (this.settings.magneticCovers) {
                try {
                    this.updateMagneticCovers(covers);
                } catch (error) {
                    console.error('[VISUAL_FX] Error updating magnetic covers:', error);
                }
            }

            if (this.settings.tiltWithMouse) {
                try {
                    this.updateTiltWithMouse(covers);
                } catch (error) {
                    console.error('[VISUAL_FX] Error updating tilt with mouse:', error);
                }
            }

            if (this.settings.enhancedReflectionsEnabled) {
                try {
                    this.updateEnhancedReflections(covers);
                } catch (error) {
                    console.error('[VISUAL_FX] Error updating enhanced reflections:', error);
                }
            }
        } catch (error) {
            console.error('[VISUAL_FX] Critical error in update loop:', error);
        }
    }

    /**
     * Toggle effect on/off
     */
    toggleEffect(effectName, enabled) {
        try {
            this.settings[effectName] = enabled;
            this.saveSettings();

            // Reinitialize effect if needed
            switch (effectName) {
            case 'particlesEnabled':
                if (enabled) {
                    this.initParticleSystem();
                } else if (this.particleSystem) {
                    this.scene.remove(this.particleSystem);
                    this.particleSystem = null;
                }
                break;

            case 'parallaxEnabled':
                if (enabled) {
                    this.initParallaxBackground();
                } else {
                    this.clearParallaxLayers();
                }
                break;

            case 'holographicUIEnabled':
                if (enabled) {
                    this.initHolographicUI();
                } else {
                    document.getElementById('scanlines-overlay')?.remove();
                    document.getElementById('holographic-style')?.remove();
                }
                break;

            case 'gestureTrailsEnabled':
                if (enabled) {
                    this.initGestureTrails();
                } else if (this.trailLine) {
                    this.scene.remove(this.trailLine);
                    this.trailLine = null;
                }
                break;

            case 'advancedLightingEnabled':
                if (enabled) {
                    this.initAdvancedLighting();
                } else {
                    if (this.rimLight) this.scene.remove(this.rimLight);
                    if (this.godRaysMesh) this.scene.remove(this.godRaysMesh);
                    if (this.colorLight1) this.scene.remove(this.colorLight1);
                    if (this.colorLight2) this.scene.remove(this.colorLight2);
                }
                break;

            case 'customShadersEnabled':
                if (enabled) {
                    this.initCustomShader();
                } else if (this.shaderMesh) {
                    this.scene.remove(this.shaderMesh);
                    this.shaderMesh = null;
                }
                break;

            case 'vrModeEnabled':
            case 'stereo3DEnabled':
            case 'webXREnabled':
                if (enabled) {
                    this.initVRMode();
                }
                break;

            case 'vrControllerSupport':
            case 'vrControllerVibration':
            case 'vrUIOverlay':
            case 'vrHandTracking':
                // These settings are applied when VR session starts
                // Just save the setting
                break;

            case 'audioReactiveEnabled':
                if (enabled) {
                    this.initAudioVisualizer();
                }
                break;

            case 'enhancedReflectionsEnabled':
                if (enabled) {
                    this.initEnhancedReflections();
                } else {
                    // Clean up reflection meshes
                    this.clearReflections(this.coversCache);
                    // Remove reflection plane
                    if (this.reflectionPlane) {
                        this.scene.remove(this.reflectionPlane);
                        this.reflectionPlane = null;
                    }
                }
                break;

            case 'frostedGlassUI':
                // Get window controls element
                const windowControls = document.getElementById('window-controls');

                // Apply or remove the frosted glass class from body
                if (enabled) {
                    document.body.classList.add('frosted-glass-mode');
                    // Make THREE.js scene background transparent
                    if (this.scene) {
                        this.scene.background = null;
                    }
                    // Make renderer transparent
                    if (this.renderer) {
                        this.renderer.setClearColor(0x000000, 0); // Transparent
                    }
                    // Apply saved opacity
                    this.applyGlassOpacity(this.settings.glassOpacity || 50);
                    // Hide window controls in transparent mode
                    if (windowControls && window.electronAPI) {
                        windowControls.classList.add('hidden');
                    }
                } else {
                    document.body.classList.remove('frosted-glass-mode');
                    // Restore background color from coverflow settings
                    const bgColor = (this.coverflow && this.coverflow.settings && this.coverflow.settings.backgroundColor)
                        ? this.coverflow.settings.backgroundColor
                        : '#1a1a2e';
                    if (this.scene) {
                        this.scene.background = new THREE.Color(bgColor);
                    }
                    // Restore renderer opaque
                    if (this.renderer) {
                        this.renderer.setClearColor(bgColor, 1);
                    }
                    // Remove dynamic opacity styles
                    document.getElementById('dynamic-glass-opacity')?.remove();
                    // Show window controls in normal mode
                    if (windowControls && window.electronAPI) {
                        windowControls.classList.remove('hidden');
                    }
                }
                // Also update the coverflow settings if available
                if (this.coverflow && typeof this.coverflow.settings !== 'undefined') {
                    this.coverflow.settings.frostedGlassUI = enabled;
                    if (typeof this.coverflow.saveSettings === 'function') {
                        this.coverflow.saveSettings();
                    }
                }
                break;
            }

            console.log(`[VISUAL_FX] ${effectName} = ${enabled}`);
        } catch (error) {
            console.error(`[VISUAL_FX] Error toggling effect ${effectName}:`, error);
            // Revert setting on error
            this.settings[effectName] = !enabled;
            this.saveSettings();
        }
    }

    /**
     * Update setting value
     */
    updateSetting(settingName, value) {
        try {
            this.settings[settingName] = value;
            this.saveSettings();

            // Reinit if needed
            if (settingName === 'particlePreset' && this.settings.particlesEnabled) {
                this.initParticleSystem();
            }

            // Reinit shader when preset changes
            if (settingName === 'shaderPreset' && this.settings.customShadersEnabled) {
                // Remove old shader first
                if (this.shaderMesh) {
                    this.scene.remove(this.shaderMesh);
                    this.shaderMesh = null;
                }
                // Initialize new shader
                this.initCustomShader();
            }

            console.log(`[VISUAL_FX] ${settingName} = ${value}`);
        } catch (error) {
            console.error(`[VISUAL_FX] Error updating setting ${settingName}:`, error);
        }
    }

    /**
     * Apply glass opacity dynamically
     */
    applyGlassOpacity(opacity) {
        try {
            // Convert 0-100 range to opacity multiplier
            const multiplier = opacity / 100;

            // Update CSS custom property for dynamic opacity
            document.documentElement.style.setProperty('--glass-opacity', multiplier.toString());

            // Apply to all frosted glass elements
            if (document.body.classList.contains('frosted-glass-mode')) {
                // Scale from very transparent (0.01-0.02) to moderately transparent (0.2-0.4)
                const baseOpacity = 0.01 + (multiplier * 0.19); // Range: 0.01 to 0.20
                const strongOpacity = 0.05 + (multiplier * 0.35); // Range: 0.05 to 0.40

                // Update inline styles for immediate effect
                const style = document.createElement('style');
                style.id = 'dynamic-glass-opacity';

                // Remove old style if exists
                document.getElementById('dynamic-glass-opacity')?.remove();

                style.textContent = `
                    body.frosted-glass-mode #top-bar {
                        background: rgba(0, 0, 0, ${baseOpacity * 0.8}) !important;
                    }
                    body.frosted-glass-mode .settings-panel,
                    body.frosted-glass-mode #settings-panel {
                        background: rgba(0, 0, 0, ${strongOpacity * 0.6}) !important;
                    }
                    body.frosted-glass-mode .modal-content {
                        background: rgba(20, 20, 30, ${strongOpacity}) !important;
                    }
                    body.frosted-glass-mode .btn {
                        background: rgba(255, 255, 255, ${baseOpacity * 0.8}) !important;
                    }
                    body.frosted-glass-mode #album-info {
                        background: rgba(0, 0, 0, ${baseOpacity}) !important;
                    }
                    body.frosted-glass-mode #thumbnail-container {
                        background: rgba(0, 0, 0, ${baseOpacity * 0.8}) !important;
                    }
                    body.frosted-glass-mode .thumbnail {
                        background: rgba(255, 255, 255, ${baseOpacity * 0.3}) !important;
                    }
                    body.frosted-glass-mode .toast {
                        background: rgba(0, 0, 0, ${strongOpacity * 0.6}) !important;
                    }
                    body.frosted-glass-mode #controls {
                        background: rgba(0, 0, 0, ${baseOpacity * 0.8}) !important;
                    }
                    body.frosted-glass-mode .context-menu,
                    body.frosted-glass-mode .dropdown-menu {
                        background: rgba(20, 20, 30, ${strongOpacity}) !important;
                    }
                    body.frosted-glass-mode input[type='text'],
                    body.frosted-glass-mode input[type='number'],
                    body.frosted-glass-mode input[type='color'],
                    body.frosted-glass-mode textarea {
                        background: rgba(255, 255, 255, ${baseOpacity * 0.3}) !important;
                    }
                    body.frosted-glass-mode .sidebar,
                    body.frosted-glass-mode .panel {
                        background: rgba(0, 0, 0, ${baseOpacity}) !important;
                    }
                    body.frosted-glass-mode .modal-overlay {
                        background: rgba(0, 0, 0, ${multiplier * 0.15}) !important;
                    }
                `;

                document.head.appendChild(style);
                console.log(`[VISUAL_FX] Glass opacity updated to ${opacity}%`);
            }
        } catch (error) {
            console.error('[VISUAL_FX] Error applying glass opacity:', error);
        }
    }

    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Cleanup
     */
    dispose() {
        try {
            // Particles - dispose geometry and material
            if (this.particleSystem) {
                this.scene.remove(this.particleSystem);
                if (this.particleSystem.geometry) {
                    this.particleSystem.geometry.dispose();
                }
                if (this.particleSystem.material) {
                    if (Array.isArray(this.particleSystem.material)) {
                        this.particleSystem.material.forEach(m => m.dispose());
                    } else {
                        this.particleSystem.material.dispose();
                    }
                }
                this.particleSystem = null;
            }

            // Parallax
            this.clearParallaxLayers();

            // Trails - dispose geometry and material
            if (this.trailLine) {
                this.scene.remove(this.trailLine);
                if (this.trailLine.geometry) this.trailLine.geometry.dispose();
                if (this.trailLine.material) this.trailLine.material.dispose();
                this.trailLine = null;
            }

            // Lighting - dispose all light objects
            if (this.rimLight) {
                this.scene.remove(this.rimLight);
                this.rimLight = null;
            }
            if (this.godRaysMesh) {
                this.scene.remove(this.godRaysMesh);
                if (this.godRaysMesh.geometry) this.godRaysMesh.geometry.dispose();
                if (this.godRaysMesh.material) this.godRaysMesh.material.dispose();
                this.godRaysMesh = null;
            }
            if (this.colorLight1) {
                this.scene.remove(this.colorLight1);
                this.colorLight1 = null;
            }
            if (this.colorLight2) {
                this.scene.remove(this.colorLight2);
                this.colorLight2 = null;
            }

            // Shaders - dispose geometry and material
            if (this.shaderMesh) {
                this.scene.remove(this.shaderMesh);
                if (this.shaderMesh.geometry) this.shaderMesh.geometry.dispose();
                if (this.shaderMesh.material) {
                    if (this.shaderMesh.material.uniforms) {
                        // Dispose shader textures
                        Object.values(this.shaderMesh.material.uniforms).forEach(uniform => {
                            if (uniform.value && uniform.value.dispose) {
                                uniform.value.dispose();
                            }
                        });
                    }
                    this.shaderMesh.material.dispose();
                }
                this.shaderMesh = null;
            }

            // Reflections
            this.clearReflections(this.coversCache);
            if (this.reflectionPlane) {
                this.scene.remove(this.reflectionPlane);
                if (this.reflectionPlane.geometry) this.reflectionPlane.geometry.dispose();
                if (this.reflectionPlane.material) {
                    if (this.reflectionPlane.material.map) this.reflectionPlane.material.map.dispose();
                    this.reflectionPlane.material.dispose();
                }
                this.reflectionPlane = null;
            }

            // Dispose all shader materials
            this.shaderMaterials.forEach(material => {
                if (material && material.dispose) {
                    material.dispose();
                }
            });
            this.shaderMaterials = [];

            // Holographic UI
            document.getElementById('scanlines-overlay')?.remove();
            document.getElementById('holographic-style')?.remove();

            // Frosted glass dynamic opacity styles
            document.getElementById('dynamic-glass-opacity')?.remove();

            // Loading animations
            document.getElementById('visual-fx-loader')?.remove();

            // Event listeners
            if (this.mouseMoveHandler) {
                document.removeEventListener('mousemove', this.mouseMoveHandler);
                this.mouseMoveHandler = null;
            }
            if (this.clickHandler) {
                document.removeEventListener('click', this.clickHandler);
                this.clickHandler = null;
            }

            console.log('[VISUAL_FX] Disposed all resources');
        } catch (error) {
            console.error('[VISUAL_FX] Error during disposal:', error);
        }
    }

    /**
     * Create settings UI panel
     */
    showSettingsUI() {
        try {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.style.display = 'flex';

            // Calculate responsive dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let maxWidth = '900px';
            let maxHeight = '85vh';

            if (viewportWidth <= 480) {
                maxWidth = '100%';
                maxHeight = '95vh';
            } else if (viewportWidth <= 768) {
                maxWidth = '95%';
                maxHeight = '90vh';
            }

            modal.innerHTML = `
                <div class="modal-content" id="vfx-modal-content" style="max-width: ${maxWidth}; max-height: ${maxHeight}; overflow-y: auto; width: 100%;">
                    <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                    <h2 style="text-align: center; margin-bottom: 20px;">✨ Visual Effects Settings</h2>
                    <div id="visual-effects-settings" style="display: grid; gap: 20px;">
                        ${this.createSettingsHTML()}
                    </div>
                    <div style="margin-top: 20px; text-align: center;">
                        <button class="primary-button" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            this.attachSettingsListeners();

            // Handle window resize while modal is open
            const resizeHandler = () => {
                const modalContent = document.getElementById('vfx-modal-content');
                if (modalContent) {
                    const vw = window.innerWidth;
                    if (vw <= 480) {
                        modalContent.style.maxWidth = '100%';
                        modalContent.style.maxHeight = '95vh';
                    } else if (vw <= 768) {
                        modalContent.style.maxWidth = '95%';
                        modalContent.style.maxHeight = '90vh';
                    } else {
                        modalContent.style.maxWidth = '900px';
                        modalContent.style.maxHeight = '85vh';
                    }
                }
            };

            window.addEventListener('resize', resizeHandler);

            // Clean up resize listener when modal is closed (any method)
            const cleanup = () => {
                window.removeEventListener('resize', resizeHandler);
                console.log('[VISUAL_FX] Modal closed, resize listener removed');
            };

            // Remove on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cleanup();
                    modal.remove();
                }
            });

            // Also setup cleanup for close buttons
            const closeButtons = modal.querySelectorAll('.close, .primary-button');
            closeButtons.forEach(btn => {
                const originalOnClick = btn.onclick;
                btn.onclick = function(e) {
                    cleanup();
                    if (originalOnClick) originalOnClick.call(this, e);
                };
            });

            console.log('[VISUAL_FX] Settings UI opened (viewport:', viewportWidth, 'x', viewportHeight, ')');
        } catch (error) {
            console.error('[VISUAL_FX] Error showing settings UI:', error);
            alert('Error opening Visual Effects settings. Check console for details.');
        }
    }

    /**
     * Create settings HTML
     */
    createSettingsHTML() {
        return `
            <div class="settings-section">
                <h3>Particle Systems</h3>
                <label>
                    <input type="checkbox" id="particlesEnabled" ${this.settings.particlesEnabled ? 'checked' : ''}>
                    Enable Particles
                </label>
                <select id="particlePreset" ${!this.settings.particlesEnabled ? 'disabled' : ''}>
                    <option value="stars" ${this.settings.particlePreset === 'stars' ? 'selected' : ''}>Stars</option>
                    <option value="snow" ${this.settings.particlePreset === 'snow' ? 'selected' : ''}>Snow</option>
                    <option value="fireflies" ${this.settings.particlePreset === 'fireflies' ? 'selected' : ''}>Fireflies</option>
                    <option value="confetti" ${this.settings.particlePreset === 'confetti' ? 'selected' : ''}>Confetti</option>
                    <option value="magic" ${this.settings.particlePreset === 'magic' ? 'selected' : ''}>Magic</option>
                </select>
            </div>

            <div class="settings-section">
                <h3>Background Effects</h3>
                <label>
                    <input type="checkbox" id="parallaxEnabled" ${this.settings.parallaxEnabled ? 'checked' : ''}>
                    Parallax Background
                </label>
            </div>

            <div class="settings-section">
                <h3>Lighting Effects</h3>
                <label>
                    <input type="checkbox" id="advancedLightingEnabled" ${this.settings.advancedLightingEnabled ? 'checked' : ''}>
                    Advanced Lighting
                </label>
                <label>
                    <input type="checkbox" id="rimLightingEnabled" ${this.settings.rimLightingEnabled ? 'checked' : ''}>
                    Rim Lighting
                </label>
                <label>
                    <input type="checkbox" id="godRaysEnabled" ${this.settings.godRaysEnabled ? 'checked' : ''}>
                    God Rays
                </label>
                <label>
                    <input type="checkbox" id="colorBleedEnabled" ${this.settings.colorBleedEnabled ? 'checked' : ''}>
                    Color Bleed
                </label>
            </div>

            <div class="settings-section">
                <h3>Holographic UI</h3>
                <label>
                    <input type="checkbox" id="holographicUIEnabled" ${this.settings.holographicUIEnabled ? 'checked' : ''}>
                    Holographic Effects
                </label>
                <label>
                    <input type="checkbox" id="scanlineEffect" ${this.settings.scanlineEffect ? 'checked' : ''}>
                    Scanlines
                </label>
            </div>

            <div class="settings-section">
                <h3>WebGL Shaders</h3>
                <label>
                    <input type="checkbox" id="customShadersEnabled" ${this.settings.customShadersEnabled ? 'checked' : ''}>
                    Enable Custom Shaders
                </label>
                <select id="shaderPreset" ${!this.settings.customShadersEnabled ? 'disabled' : ''}>
                    <option value="none" ${this.settings.shaderPreset === 'none' ? 'selected' : ''}>None</option>
                    <option value="kaleidoscope" ${this.settings.shaderPreset === 'kaleidoscope' ? 'selected' : ''}>Kaleidoscope</option>
                    <option value="pixelate" ${this.settings.shaderPreset === 'pixelate' ? 'selected' : ''}>Pixelate</option>
                    <option value="edge" ${this.settings.shaderPreset === 'edge' ? 'selected' : ''}>Edge Detection</option>
                    <option value="vaporwave" ${this.settings.shaderPreset === 'vaporwave' ? 'selected' : ''}>Vaporwave</option>
                </select>
            </div>

            <div class="settings-section">
                <h3>Interaction Effects</h3>
                <label>
                    <input type="checkbox" id="mouseEffectsEnabled" ${this.settings.mouseEffectsEnabled ? 'checked' : ''}>
                    Mouse Effects
                </label>
                <label>
                    <input type="checkbox" id="rippleOnClick" ${this.settings.rippleOnClick ? 'checked' : ''}>
                    Ripple on Click
                </label>
                <label>
                    <input type="checkbox" id="magneticCovers" ${this.settings.magneticCovers ? 'checked' : ''}>
                    Magnetic Covers
                </label>
                <div style="margin-left: 20px; ${!this.settings.magneticCovers ? 'opacity: 0.5; pointer-events: none;' : ''}">
                    <label style="font-size: 0.9em; display: flex; justify-content: space-between; align-items: center;">
                        <span>Magnetic Intensity:</span>
                        <span id="magneticIntensityValue">${this.settings.magneticIntensity}%</span>
                    </label>
                    <input type="range" id="magneticIntensity" min="0" max="100" value="${this.settings.magneticIntensity}" style="width: 100%;">
                </div>
                <label>
                    <input type="checkbox" id="tiltWithMouse" ${this.settings.tiltWithMouse ? 'checked' : ''}>
                    Tilt with Mouse
                </label>
                <div style="margin-left: 20px; ${!this.settings.tiltWithMouse ? 'opacity: 0.5; pointer-events: none;' : ''}">
                    <label style="font-size: 0.9em; display: flex; justify-content: space-between; align-items: center;">
                        <span>Tilt Intensity:</span>
                        <span id="tiltIntensityValue">${this.settings.tiltIntensity}%</span>
                    </label>
                    <input type="range" id="tiltIntensity" min="0" max="100" value="${this.settings.tiltIntensity}" style="width: 100%;">
                </div>
                <label>
                    <input type="checkbox" id="gestureTrailsEnabled" ${this.settings.gestureTrailsEnabled ? 'checked' : ''}>
                    Gesture Trails
                </label>
            </div>

            <div class="settings-section">
                <h3>Animations</h3>
                <label>
                    <input type="checkbox" id="idleAnimationsEnabled" ${this.settings.idleAnimationsEnabled ? 'checked' : ''}>
                    Idle Animations
                </label>
                <label>
                    <input type="checkbox" id="idleFloating" ${this.settings.idleFloating ? 'checked' : ''}>
                    Floating Effect
                </label>
                <div style="margin-left: 20px; ${!this.settings.idleFloating ? 'opacity: 0.5; pointer-events: none;' : ''}">
                    <label style="font-size: 0.9em; display: flex; justify-content: space-between; align-items: center;">
                        <span>Float Intensity:</span>
                        <span id="floatingIntensityValue">${this.settings.floatingIntensity}%</span>
                    </label>
                    <input type="range" id="floatingIntensity" min="0" max="100" value="${this.settings.floatingIntensity}" style="width: 100%;">
                </div>
                <label>
                    <input type="checkbox" id="idleBreathing" ${this.settings.idleBreathing ? 'checked' : ''}>
                    Breathing Effect
                </label>
                <label>
                    <input type="checkbox" id="screenShakeEnabled" ${this.settings.screenShakeEnabled ? 'checked' : ''}>
                    Screen Shake
                </label>
                <div style="margin-left: 20px; ${!this.settings.screenShakeEnabled ? 'opacity: 0.5; pointer-events: none;' : ''}">
                    <label style="font-size: 0.9em; display: flex; justify-content: space-between; align-items: center;">
                        <span>Shake Intensity:</span>
                        <span id="shakeIntensityValue">${this.settings.shakeIntensity}%</span>
                    </label>
                    <input type="range" id="shakeIntensity" min="0" max="100" value="${this.settings.shakeIntensity}" style="width: 100%;">
                </div>
            </div>

            <div class="settings-section">
                <h3>3D Effects</h3>
                <label>
                    <input type="checkbox" id="enhancedReflectionsEnabled" ${this.settings.enhancedReflectionsEnabled ? 'checked' : ''}>
                    Enhanced Reflections
                </label>
                <div style="margin-left: 20px; ${!this.settings.enhancedReflectionsEnabled ? 'opacity: 0.5; pointer-events: none;' : ''}">
                    <label style="font-size: 0.9em; display: flex; justify-content: space-between; align-items: center;">
                        <span>Reflection Opacity:</span>
                        <span id="reflectionOpacityValue">${this.settings.reflectionOpacity}%</span>
                    </label>
                    <input type="range" id="reflectionOpacity" min="0" max="100" value="${this.settings.reflectionOpacity}" style="width: 100%;">
                </div>
                <label style="margin-top: 10px;">Transition Effect:</label>
                <select id="transitionType">
                    <option value="slide" ${this.settings.transitionType === 'slide' ? 'selected' : ''}>Slide</option>
                    <option value="flip" ${this.settings.transitionType === 'flip' ? 'selected' : ''}>Flip</option>
                    <option value="cube" ${this.settings.transitionType === 'cube' ? 'selected' : ''}>Cube</option>
                    <option value="portal" ${this.settings.transitionType === 'portal' ? 'selected' : ''}>Portal</option>
                    <option value="morph" ${this.settings.transitionType === 'morph' ? 'selected' : ''}>Morph</option>
                </select>
            </div>

            <div class="settings-section">
                <h3>Audio Reactive</h3>
                <label>
                    <input type="checkbox" id="audioReactiveEnabled" ${this.settings.audioReactiveEnabled ? 'checked' : ''}>
                    Audio Visualizer
                </label>
            </div>

            <div class="settings-section">
                <h3>VR/3D Stereoscopic Mode</h3>
                <label>
                    <input type="checkbox" id="stereo3DEnabled" ${this.settings.stereo3DEnabled ? 'checked' : ''}>
                    Enable Stereoscopic 3D (SBS)
                </label>
                <div style="margin-left: 20px; ${!this.settings.stereo3DEnabled ? 'opacity: 0.5; pointer-events: none;' : ''}">
                    <label style="font-size: 0.9em; display: flex; justify-content: space-between; align-items: center;">
                        <span>Eye Separation:</span>
                        <span id="stereoSeparationValue">${Math.round(this.settings.stereoSeparation * 1000)}mm</span>
                    </label>
                    <input type="range" id="stereoSeparation" min="40" max="100" value="${this.settings.stereoSeparation * 1000}" style="width: 100%;">
                    <label style="font-size: 0.9em; display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                        <span>Convergence:</span>
                        <span id="convergenceValue">${this.settings.convergence.toFixed(2)}</span>
                    </label>
                    <input type="range" id="convergence" min="0.5" max="2.0" step="0.1" value="${this.settings.convergence}" style="width: 100%;">
                </div>
                <small style="display: block; margin-top: 8px; font-size: 0.85em; opacity: 0.7;">
                    ℹ️ Use with 3D Monitors (Side-by-Side), VR headsets, or stereoscopic displays.
                </small>
            </div>

            <div class="settings-section">
                <h3>🥽 WebXR VR Mode (Steam VR Compatible)</h3>
                <label>
                    <input type="checkbox" id="webXREnabled" ${this.settings.webXREnabled ? 'checked' : ''}>
                    Enable WebXR VR Support
                </label>
                <small style="display: block; margin-top: 8px; font-size: 0.85em; opacity: 0.7;">
                    ✨ Full immersive VR support for Steam VR, Oculus, Vive, and other WebXR-compatible headsets
                </small>

                <div style="margin-left: 20px; margin-top: 15px; ${!this.settings.webXREnabled ? 'opacity: 0.5; pointer-events: none;' : ''}">
                    <label>
                        <input type="checkbox" id="vrControllerSupport" ${this.settings.vrControllerSupport ? 'checked' : ''}>
                        VR Controller Support
                    </label>
                    <small style="display: block; margin-left: 24px; font-size: 0.8em; opacity: 0.7;">
                        Navigate with VR controllers (trigger to navigate, grip to launch)
                    </small>

                    <label style="margin-top: 10px;">
                        <input type="checkbox" id="vrControllerVibration" ${this.settings.vrControllerVibration ? 'checked' : ''}>
                        Controller Haptic Feedback
                    </label>

                    <label style="margin-top: 10px;">
                        <input type="checkbox" id="vrUIOverlay" ${this.settings.vrUIOverlay ? 'checked' : ''}>
                        VR UI Overlay
                    </label>
                    <small style="display: block; margin-left: 24px; font-size: 0.8em; opacity: 0.7;">
                        Display game info and controls in VR space
                    </small>

                    <label style="margin-top: 10px;">
                        <input type="checkbox" id="vrHandTracking" ${this.settings.vrHandTracking ? 'checked' : ''}>
                        Hand Tracking (Experimental)
                    </label>
                    <small style="display: block; margin-left: 24px; font-size: 0.8em; opacity: 0.7;">
                        Track hand positions (if supported by your headset)
                    </small>
                </div>

                <div style="margin-top: 15px; padding: 12px; background: rgba(102, 126, 234, 0.1); border-left: 3px solid #667eea; border-radius: 4px;">
                    <strong style="font-size: 0.9em;">🎮 VR Controls:</strong>
                    <ul style="margin: 8px 0 0 20px; font-size: 0.85em; line-height: 1.6;">
                        <li><strong>Left Trigger:</strong> Previous Game</li>
                        <li><strong>Right Trigger:</strong> Next Game</li>
                        <li><strong>Grip Button:</strong> Launch Game</li>
                        <li><strong>Menu Button:</strong> Exit VR</li>
                    </ul>
                </div>

                <div style="margin-top: 10px; padding: 10px; background: rgba(76, 175, 80, 0.1); border-left: 3px solid #4caf50; border-radius: 4px;">
                    <small style="font-size: 0.85em;">
                        ✅ <strong>Supported Headsets:</strong> Steam VR (Valve Index, HTC Vive), Meta Quest (with Link/Air Link), Windows Mixed Reality, and any WebXR-compatible VR device
                    </small>
                </div>
            </div>

            <div class="settings-section">
                <h3>🪟 UI Appearance</h3>
                <label>
                    <input type="checkbox" id="frostedGlassUI" ${this.settings.frostedGlassUI ? 'checked' : ''}>
                    Frosted Glass UI
                </label>
                <small style="display: block; margin-top: 8px; font-size: 0.85em; opacity: 0.7;">
                    ✨ Transparent, frosted glass appearance for menus and backgrounds - see your desktop through the UI
                </small>

                <div style="margin-top: 15px;">
                    <label style="display: flex; justify-content: space-between; align-items: center;">
                        <span>Glass Opacity:</span>
                        <span id="glass-opacity-value">${this.settings.glassOpacity}%</span>
                    </label>
                    <input type="range" id="glass-opacity-slider" min="0" max="100" value="${this.settings.glassOpacity}"
                           style="width: 100%; margin-top: 5px;">
                    <small style="display: block; margin-top: 5px; font-size: 0.85em; opacity: 0.7;">
                        Adjust transparency: 0% = fully transparent, 100% = more opaque
                    </small>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to settings
     */
    attachSettingsListeners() {
        try {
            // Checkboxes
            document.querySelectorAll('#visual-effects-settings input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    try {
                        this.toggleEffect(e.target.id, e.target.checked);
                    } catch (error) {
                        console.error(`[VISUAL_FX] Error toggling effect ${e.target.id}:`, error);
                    }
                });
            });

            // Dropdowns
            document.getElementById('particlePreset')?.addEventListener('change', (e) => {
                try {
                    this.updateSetting('particlePreset', e.target.value);
                } catch (error) {
                    console.error('[VISUAL_FX] Error updating particle preset:', error);
                }
            });

            document.getElementById('shaderPreset')?.addEventListener('change', (e) => {
                try {
                    this.updateSetting('shaderPreset', e.target.value);
                } catch (error) {
                    console.error('[VISUAL_FX] Error updating shader preset:', error);
                }
            });

            document.getElementById('transitionType')?.addEventListener('change', (e) => {
                try {
                    this.updateSetting('transitionType', e.target.value);
                } catch (error) {
                    console.error('[VISUAL_FX] Error updating transition type:', error);
                }
            });

            // Enable/disable dependent controls
            document.getElementById('particlesEnabled')?.addEventListener('change', (e) => {
                const presetSelect = document.getElementById('particlePreset');
                if (presetSelect) presetSelect.disabled = !e.target.checked;
            });

            document.getElementById('customShadersEnabled')?.addEventListener('change', (e) => {
                const shaderSelect = document.getElementById('shaderPreset');
                if (shaderSelect) shaderSelect.disabled = !e.target.checked;
            });

            // Enable/disable WebXR VR sub-options
            document.getElementById('webXREnabled')?.addEventListener('change', (e) => {
                const vrControllerSupport = document.getElementById('vrControllerSupport');
                if (vrControllerSupport) {
                    const container = vrControllerSupport.closest('div[style*="margin-left"]');
                    if (container) {
                        if (e.target.checked) {
                            container.style.opacity = '1';
                            container.style.pointerEvents = 'auto';
                        } else {
                            container.style.opacity = '0.5';
                            container.style.pointerEvents = 'none';
                        }
                    }
                }
            });

            // Enable/disable slider containers based on their parent checkboxes
            const toggleSliderContainer = (checkboxId, sliderId) => {
                const checkbox = document.getElementById(checkboxId);
                const slider = document.getElementById(sliderId);
                if (checkbox && slider) {
                    const container = slider.closest('div[style*="margin-left"]');
                    checkbox.addEventListener('change', (e) => {
                        if (container) {
                            if (e.target.checked) {
                                container.style.opacity = '1';
                                container.style.pointerEvents = 'auto';
                            } else {
                                container.style.opacity = '0.5';
                                container.style.pointerEvents = 'none';
                            }
                        }
                    });
                }
            };

            toggleSliderContainer('magneticCovers', 'magneticIntensity');
            toggleSliderContainer('tiltWithMouse', 'tiltIntensity');
            toggleSliderContainer('idleFloating', 'floatingIntensity');
            toggleSliderContainer('screenShakeEnabled', 'shakeIntensity');
            toggleSliderContainer('enhancedReflectionsEnabled', 'reflectionOpacity');
            toggleSliderContainer('stereo3DEnabled', 'stereoSeparation');

            // Intensity sliders with debounced save
            const sliders = [
                { id: 'magneticIntensity', valueId: 'magneticIntensityValue', suffix: '%' },
                { id: 'tiltIntensity', valueId: 'tiltIntensityValue', suffix: '%' },
                { id: 'floatingIntensity', valueId: 'floatingIntensityValue', suffix: '%' },
                { id: 'shakeIntensity', valueId: 'shakeIntensityValue', suffix: '%' },
                { id: 'reflectionOpacity', valueId: 'reflectionOpacityValue', suffix: '%' },
                { id: 'stereoSeparation', valueId: 'stereoSeparationValue', suffix: 'mm', scale: 1 },
                { id: 'convergence', valueId: 'convergenceValue', suffix: '', scale: 1, decimals: 2 },
                { id: 'glass-opacity-slider', valueId: 'glass-opacity-value', suffix: '%', setting: 'glassOpacity' }
            ];

            // Debounced save function to prevent excessive localStorage writes
            let saveTimeout;
            const debouncedSave = () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => this.saveSettings(), 500);
            };

            sliders.forEach(slider => {
                const element = document.getElementById(slider.id);
                const valueDisplay = document.getElementById(slider.valueId);

                if (element) {
                    element.addEventListener('input', (e) => {
                        try {
                            const value = parseFloat(e.target.value);
                            const displayValue = slider.id === 'stereoSeparation' ?
                                Math.round(value) :
                                (slider.decimals ? value.toFixed(slider.decimals) : Math.round(value));

                            // Update display
                            if (valueDisplay) {
                                valueDisplay.textContent = `${displayValue}${slider.suffix}`;
                            }

                            // Update setting in memory
                            const settingValue = slider.id === 'stereoSeparation' ? value / 1000 : value;
                            const settingName = slider.setting || slider.id;
                            this.settings[settingName] = settingValue;

                            // Apply glass opacity dynamically
                            if (settingName === 'glassOpacity') {
                                this.applyGlassOpacity(value);
                            }

                            // Debounced save to localStorage
                            debouncedSave();
                        } catch (error) {
                            console.error(`[VISUAL_FX] Error updating ${slider.id}:`, error);
                        }
                    });
                }
            });

            console.log('[VISUAL_FX] Settings listeners attached');
        } catch (error) {
            console.error('[VISUAL_FX] Error attaching settings listeners:', error);
        }
    }
}

// CSS for settings sections
const style = document.createElement('style');
style.textContent = `
    .settings-section {
        background: rgba(255, 255, 255, 0.05);
        padding: 15px;
        border-radius: 8px;
        border: 1px solid rgba(79, 195, 247, 0.3);
    }

    .settings-section h3 {
        margin: 0 0 10px 0;
        color: #4fc3f7;
        font-size: 16px;
    }

    .settings-section label {
        display: block;
        margin: 8px 0;
        cursor: pointer;
    }

    .settings-section input[type="checkbox"] {
        margin-right: 8px;
    }

    .settings-section select {
        width: 100%;
        margin-top: 8px;
        padding: 5px;
        background: rgba(0, 0, 0, 0.3);
        color: white;
        border: 1px solid rgba(79, 195, 247, 0.3);
        border-radius: 4px;
    }

    .settings-section select:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

// Export for global use
if (typeof window !== 'undefined') {
    window.VisualEffectsManager = VisualEffectsManager;
}
