// Enhanced CoverFlow with Controller Support and GPU Rendering
class CoverFlow {
    constructor() {
        this.container = document.getElementById('coverflow-container');
        this.currentIndex = 0;
        this.targetIndex = 0;
        this.covers = [];
        this.reflections = [];
        this.allAlbums = [];
        this.filteredAlbums = [];
        this.isAnimating = false;
        this.autoRotateInterval = null;

        // Gamepad/Controller support
        this.gamepad = null;
        this.gamepadIndex = -1;
        this.lastGamepadState = {};
        this.analogDeadzone = 0.2;
        this.analogCooldown = 0;

        // GPU and rendering features
        this.gpuInfo = null;
        this.composer = null;
        this.bloomPass = null;
        this.ssaoPass = null;

        // Performance monitoring
        this.fps = 60;
        this.fpsFrames = [];
        this.fpsLastTime = performance.now();

        // Settings with defaults
        this.settings = {
            animationSpeed: 0.1,
            coverSpacing: 2.5,
            sideAngle: Math.PI / 3,
            showReflections: true,
            autoRotate: false,
            // Hardware rendering settings
            hardwareRendering: false,
            glassEffect: false,
            bloomEffect: false,
            ssaoEffect: false,
            bloomIntensity: 1.5,
            // Controller settings
            controllerSensitivity: 5,
            controllerVibration: true,
            // Performance
            showFpsCounter: false
        };

        this.loadSettings();
        this.initAlbumData();
        this.detectGPU();
        this.init();
        this.createCovers();
        this.createThumbnails();
        this.addEventListeners();
        this.initGamepadSupport();
        this.animate();
        this.updateInfo();
        this.hideLoadingScreen();
    }

    detectGPU() {
        const gl = document.createElement('canvas').getContext('webgl2') ||
                   document.createElement('canvas').getContext('webgl');

        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                this.gpuInfo = {
                    vendor: vendor,
                    renderer: renderer,
                    webgl2: !!document.createElement('canvas').getContext('webgl2')
                };

                // Update GPU info display
                setTimeout(() => {
                    const gpuInfoEl = document.getElementById('gpu-info');
                    if (gpuInfoEl) {
                        gpuInfoEl.textContent = `${renderer}`;
                    }
                }, 100);
            }
        }
    }

    loadSettings() {
        const saved = localStorage.getItem('coverflow-settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('coverflow-settings', JSON.stringify(this.settings));
    }

    initAlbumData() {
        const albums = [
            { title: 'Midnight Dreams', artist: 'Luna Eclipse', year: '2023', genre: 'Electronic', color: 0xFF6B6B },
            { title: 'Ocean Waves', artist: 'Aqua Marina', year: '2022', genre: 'Ambient', color: 0x4ECDC4 },
            { title: 'Urban Lights', artist: 'City Sounds', year: '2023', genre: 'Hip Hop', color: 0x45B7D1 },
            { title: 'Sunset Boulevard', artist: 'Golden Hour', year: '2021', genre: 'Jazz', color: 0xFFA07A },
            { title: 'Forest Whispers', artist: 'Nature\'s Voice', year: '2022', genre: 'Classical', color: 0x98D8C8 },
            { title: 'Electric Storm', artist: 'Thunder Bay', year: '2023', genre: 'Rock', color: 0xF7DC6F },
            { title: 'Neon Nights', artist: 'Synthwave Collective', year: '2022', genre: 'Synthwave', color: 0xBB8FCE },
            { title: 'Mountain Peak', artist: 'Summit Sounds', year: '2021', genre: 'Folk', color: 0x85C1E2 },
            { title: 'Desert Rose', artist: 'Sahara Ensemble', year: '2023', genre: 'World', color: 0xF8B195 },
            { title: 'Cosmic Journey', artist: 'Space Travelers', year: '2022', genre: 'Psychedelic', color: 0xC06C84 },
            { title: 'Velvet Dreams', artist: 'Midnight Lounge', year: '2021', genre: 'Lounge', color: 0x6C5B7B },
            { title: 'Winter Solstice', artist: 'Arctic Symphony', year: '2023', genre: 'Orchestral', color: 0x355C7D },
            { title: 'Tokyo Nights', artist: 'J-Wave', year: '2022', genre: 'J-Pop', color: 0xFF69B4 },
            { title: 'Latin Fire', artist: 'Salsa Kings', year: '2023', genre: 'Latin', color: 0xFF4500 },
            { title: 'Deep Blue', artist: 'Ocean Jazz Quartet', year: '2021', genre: 'Jazz', color: 0x191970 },
            { title: 'Retro Wave', artist: '80s Revival', year: '2022', genre: 'Synthpop', color: 0xFF1493 }
        ];

        this.allAlbums = albums;
        this.filteredAlbums = [...albums];
        document.getElementById('total-albums').textContent = this.filteredAlbums.length;
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0.5, 9);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup with GPU optimizations
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            stencil: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // Enhanced lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(5, 5, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(0, 2, -5);
        this.scene.add(rimLight);

        // Initialize post-processing if available
        this.initPostProcessing();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    initPostProcessing() {
        if (typeof THREE.EffectComposer === 'undefined') {
            console.warn('Post-processing not available');
            return;
        }

        this.composer = new THREE.EffectComposer(this.renderer);
        this.renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        // Bloom effect
        if (typeof THREE.UnrealBloomPass !== 'undefined') {
            this.bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
                this.settings.bloomIntensity,
                0.4,
                0.85
            );
            this.bloomPass.enabled = this.settings.bloomEffect;
            this.composer.addPass(this.bloomPass);
        }

        // SSAO effect
        if (typeof THREE.SSAOPass !== 'undefined') {
            this.ssaoPass = new THREE.SSAOPass(
                this.scene,
                this.camera,
                this.container.clientWidth,
                this.container.clientHeight
            );
            this.ssaoPass.kernelRadius = 16;
            this.ssaoPass.minDistance = 0.005;
            this.ssaoPass.maxDistance = 0.1;
            this.ssaoPass.enabled = this.settings.ssaoEffect;
            this.composer.addPass(this.ssaoPass);
        }
    }

    createCovers() {
        const coverWidth = 2;
        const coverHeight = 2;

        this.filteredAlbums.forEach((album, index) => {
            const coverGroup = new THREE.Group();

            const geometry = new THREE.PlaneGeometry(coverWidth, coverHeight);

            // Material selection based on settings
            let material;
            if (this.settings.glassEffect && this.settings.hardwareRendering) {
                // Glass material with refraction
                material = new THREE.MeshPhysicalMaterial({
                    color: album.color,
                    metalness: 0.1,
                    roughness: 0.1,
                    transmission: 0.9,
                    thickness: 0.5,
                    envMapIntensity: 1.5,
                    clearcoat: 1.0,
                    clearcoatRoughness: 0.1,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.95
                });
            } else if (album.image) {
                const texture = new THREE.TextureLoader().load(album.image);
                material = new THREE.MeshPhongMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                    shininess: 80
                });
            } else {
                material = new THREE.MeshPhongMaterial({
                    color: album.color,
                    side: THREE.DoubleSide,
                    shininess: 80,
                    emissive: album.color,
                    emissiveIntensity: this.settings.bloomEffect ? 0.2 : 0
                });
            }

            const cover = new THREE.Mesh(geometry, material);
            cover.castShadow = true;
            cover.receiveShadow = true;
            cover.userData = { index, album, isCover: true };

            // Border
            const borderGeometry = new THREE.EdgesGeometry(geometry);
            const borderMaterial = new THREE.LineBasicMaterial({
                color: 0xffffff,
                linewidth: 1
            });
            const border = new THREE.LineSegments(borderGeometry, borderMaterial);
            cover.add(border);

            coverGroup.add(cover);

            // Reflection
            const reflectionMaterial = material.clone();
            reflectionMaterial.opacity = 0.3;
            reflectionMaterial.transparent = true;

            const reflection = new THREE.Mesh(geometry, reflectionMaterial);
            reflection.position.y = -coverHeight;
            reflection.rotation.x = Math.PI;
            reflection.scale.y = -0.6;
            reflection.userData = { isReflection: true };

            coverGroup.add(reflection);
            this.reflections.push(reflection);

            this.scene.add(coverGroup);
            this.covers.push(coverGroup.children[0]);
        });

        this.updateCoverPositions(true);
    }

    updateCoverPositions(immediate = false) {
        const spacing = this.settings.coverSpacing;
        const sideAngle = this.settings.sideAngle;
        const sideOffset = 1.5;
        const depthOffset = 1.5;
        const speed = this.settings.animationSpeed;

        this.covers.forEach((cover, index) => {
            const diff = index - this.targetIndex;
            const parent = cover.parent;

            let targetX, targetZ, targetRotY, targetScale, targetY;

            if (diff === 0) {
                targetX = 0;
                targetY = 0;
                targetZ = 0;
                targetRotY = 0;
                targetScale = 1.3;
            } else if (diff < 0) {
                targetX = diff * spacing - sideOffset;
                targetY = -0.2 - Math.abs(diff) * 0.05;
                targetZ = -depthOffset - Math.abs(diff) * 0.4;
                targetRotY = sideAngle;
                targetScale = Math.max(0.7, 1 - Math.abs(diff) * 0.1);
            } else {
                targetX = diff * spacing + sideOffset;
                targetY = -0.2 - Math.abs(diff) * 0.05;
                targetZ = -depthOffset - Math.abs(diff) * 0.4;
                targetRotY = -sideAngle;
                targetScale = Math.max(0.7, 1 - Math.abs(diff) * 0.1);
            }

            if (immediate) {
                parent.position.x = targetX;
                parent.position.y = targetY;
                parent.position.z = targetZ;
                parent.rotation.y = targetRotY;
                parent.scale.set(targetScale, targetScale, 1);
            } else {
                parent.position.x += (targetX - parent.position.x) * speed;
                parent.position.y += (targetY - parent.position.y) * speed;
                parent.position.z += (targetZ - parent.position.z) * speed;
                parent.rotation.y += (targetRotY - parent.rotation.y) * speed;

                const currentScale = parent.scale.x;
                const newScale = currentScale + (targetScale - currentScale) * speed;
                parent.scale.set(newScale, newScale, 1);
            }

            const opacity = 1 - Math.min(Math.abs(diff) * 0.12, 0.6);
            cover.material.opacity = opacity;
            cover.material.transparent = true;

            const reflection = parent.children[1];
            if (reflection && reflection.userData.isReflection) {
                reflection.visible = this.settings.showReflections;
                reflection.material.opacity = opacity * 0.3;
            }
        });
    }

    // Controller/Gamepad Support
    initGamepadSupport() {
        window.addEventListener('gamepadconnected', (e) => {
            this.onGamepadConnected(e.gamepad);
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            this.onGamepadDisconnected();
        });

        // Check for already connected gamepads
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                this.onGamepadConnected(gamepads[i]);
                break;
            }
        }
    }

    onGamepadConnected(gamepad) {
        this.gamepad = gamepad;
        this.gamepadIndex = gamepad.index;

        const statusEl = document.getElementById('controller-status');
        const nameEl = document.getElementById('controller-name');

        statusEl.classList.add('connected');
        nameEl.textContent = gamepad.id.substring(0, 30);

        console.log('Gamepad connected:', gamepad.id);

        // Vibration feedback
        if (this.settings.controllerVibration && gamepad.vibrationActuator) {
            gamepad.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration: 200,
                weakMagnitude: 0.3,
                strongMagnitude: 0.3
            });
        }
    }

    onGamepadDisconnected() {
        this.gamepad = null;
        this.gamepadIndex = -1;

        const statusEl = document.getElementById('controller-status');
        const nameEl = document.getElementById('controller-name');

        statusEl.classList.remove('connected');
        nameEl.textContent = 'No Controller';

        console.log('Gamepad disconnected');
    }

    pollGamepad() {
        if (this.gamepadIndex === -1) return;

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gamepad = gamepads[this.gamepadIndex];

        if (!gamepad) {
            this.onGamepadDisconnected();
            return;
        }

        const sensitivity = this.settings.controllerSensitivity / 5;

        // Analog stick navigation (left stick X-axis)
        if (this.analogCooldown <= 0) {
            const axisX = gamepad.axes[0];
            if (Math.abs(axisX) > this.analogDeadzone) {
                if (axisX < -this.analogDeadzone) {
                    this.navigate(-1);
                    this.vibrateController(50, 0.1);
                    this.analogCooldown = 0.3 / sensitivity;
                } else if (axisX > this.analogDeadzone) {
                    this.navigate(1);
                    this.vibrateController(50, 0.1);
                    this.analogCooldown = 0.3 / sensitivity;
                }
            }
        } else {
            this.analogCooldown -= 0.016;
        }

        // D-Pad
        if (gamepad.buttons[14] && gamepad.buttons[14].pressed && !this.lastGamepadState.dpadLeft) {
            this.navigate(-1);
            this.vibrateController(50, 0.2);
        }
        if (gamepad.buttons[15] && gamepad.buttons[15].pressed && !this.lastGamepadState.dpadRight) {
            this.navigate(1);
            this.vibrateController(50, 0.2);
        }

        // Shoulder buttons (fast navigation)
        if (gamepad.buttons[4] && gamepad.buttons[4].pressed && !this.lastGamepadState.lb) {
            this.navigate(-1);
            this.vibrateController(80, 0.3);
        }
        if (gamepad.buttons[5] && gamepad.buttons[5].pressed && !this.lastGamepadState.rb) {
            this.navigate(1);
            this.vibrateController(80, 0.3);
        }

        // Triggers (jump to start/end)
        if (gamepad.buttons[6] && gamepad.buttons[6].value > 0.5 && !this.lastGamepadState.lt) {
            this.navigateToFirst();
            this.vibrateController(150, 0.4);
        }
        if (gamepad.buttons[7] && gamepad.buttons[7].value > 0.5 && !this.lastGamepadState.rt) {
            this.navigateToLast();
            this.vibrateController(150, 0.4);
        }

        // Face buttons
        if (gamepad.buttons[0] && gamepad.buttons[0].pressed && !this.lastGamepadState.a) {
            // A/Cross - Confirm (currently just vibrate)
            this.vibrateController(100, 0.2);
        }
        if (gamepad.buttons[1] && gamepad.buttons[1].pressed && !this.lastGamepadState.b) {
            // B/Circle - Back/Close modals
            this.closeAllModals();
            this.vibrateController(100, 0.2);
        }
        if (gamepad.buttons[3] && gamepad.buttons[3].pressed && !this.lastGamepadState.y) {
            // Y/Triangle - Random
            this.navigateRandom();
            this.vibrateController(150, 0.3);
        }

        // Start button - Settings
        if (gamepad.buttons[9] && gamepad.buttons[9].pressed && !this.lastGamepadState.start) {
            this.openModal('settings-modal');
            this.vibrateController(100, 0.2);
        }

        // Select button - Fullscreen
        if (gamepad.buttons[8] && gamepad.buttons[8].pressed && !this.lastGamepadState.select) {
            this.toggleFullscreen();
            this.vibrateController(100, 0.2);
        }

        // Store state for next frame
        this.lastGamepadState = {
            dpadLeft: gamepad.buttons[14] && gamepad.buttons[14].pressed,
            dpadRight: gamepad.buttons[15] && gamepad.buttons[15].pressed,
            lb: gamepad.buttons[4] && gamepad.buttons[4].pressed,
            rb: gamepad.buttons[5] && gamepad.buttons[5].pressed,
            lt: gamepad.buttons[6] && gamepad.buttons[6].value > 0.5,
            rt: gamepad.buttons[7] && gamepad.buttons[7].value > 0.5,
            a: gamepad.buttons[0] && gamepad.buttons[0].pressed,
            b: gamepad.buttons[1] && gamepad.buttons[1].pressed,
            y: gamepad.buttons[3] && gamepad.buttons[3].pressed,
            start: gamepad.buttons[9] && gamepad.buttons[9].pressed,
            select: gamepad.buttons[8] && gamepad.buttons[8].pressed
        };
    }

    vibrateController(duration, intensity) {
        if (!this.settings.controllerVibration) return;

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gamepad = gamepads[this.gamepadIndex];

        if (gamepad && gamepad.vibrationActuator) {
            gamepad.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration: duration,
                weakMagnitude: intensity,
                strongMagnitude: intensity
            });
        }
    }

    navigate(direction) {
        if (this.isAnimating) return;

        const newIndex = this.targetIndex + direction;
        if (newIndex < 0 || newIndex >= this.filteredAlbums.length) return;

        this.targetIndex = newIndex;
        this.isAnimating = true;
        this.currentIndex = this.targetIndex;
        this.updateInfo();
        this.updateThumbnails();

        setTimeout(() => {
            this.isAnimating = false;
        }, 300);
    }

    navigateTo(index) {
        if (this.isAnimating || index === this.currentIndex || index < 0 || index >= this.filteredAlbums.length) return;

        this.targetIndex = index;
        this.isAnimating = true;
        this.currentIndex = this.targetIndex;
        this.updateInfo();
        this.updateThumbnails();

        setTimeout(() => {
            this.isAnimating = false;
        }, 300);
    }

    navigateToFirst() {
        this.navigateTo(0);
    }

    navigateToLast() {
        this.navigateTo(this.filteredAlbums.length - 1);
    }

    navigateRandom() {
        const randomIndex = Math.floor(Math.random() * this.filteredAlbums.length);
        this.navigateTo(randomIndex);
    }

    updateInfo() {
        const album = this.filteredAlbums[this.currentIndex];
        document.getElementById('album-title').textContent = album.title;
        document.getElementById('album-artist').textContent = album.artist;
        document.getElementById('album-year').textContent = album.year;
        document.getElementById('album-genre').textContent = album.genre;
        document.getElementById('current-position').textContent = this.currentIndex + 1;
    }

    createThumbnails() {
        const container = document.getElementById('thumbnail-container');
        container.innerHTML = '';

        this.filteredAlbums.forEach((album, index) => {
            const thumb = document.createElement('canvas');
            thumb.className = 'thumbnail';
            thumb.width = 60;
            thumb.height = 60;

            const ctx = thumb.getContext('2d');
            ctx.fillStyle = '#' + album.color.toString(16).padStart(6, '0');
            ctx.fillRect(0, 0, 60, 60);

            const gradient = ctx.createLinearGradient(0, 0, 60, 60);
            gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 60, 60);

            thumb.addEventListener('click', () => this.navigateTo(index));
            container.appendChild(thumb);
        });

        this.updateThumbnails();
    }

    updateThumbnails() {
        const thumbs = document.querySelectorAll('.thumbnail');
        thumbs.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === this.currentIndex);
        });

        const activeThumb = thumbs[this.currentIndex];
        if (activeThumb) {
            activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        document.getElementById('thumb-prev').disabled = this.currentIndex === 0;
        document.getElementById('thumb-next').disabled = this.currentIndex === this.filteredAlbums.length - 1;
    }

    filterAlbums(query) {
        const lowerQuery = query.toLowerCase().trim();

        if (!lowerQuery) {
            this.filteredAlbums = [...this.allAlbums];
        } else {
            this.filteredAlbums = this.allAlbums.filter(album =>
                album.title.toLowerCase().includes(lowerQuery) ||
                album.artist.toLowerCase().includes(lowerQuery) ||
                album.genre.toLowerCase().includes(lowerQuery)
            );
        }

        this.clearScene();
        this.currentIndex = 0;
        this.targetIndex = 0;
        this.createCovers();
        this.createThumbnails();
        this.updateInfo();
        document.getElementById('total-albums').textContent = this.filteredAlbums.length;
    }

    clearScene() {
        this.covers.forEach(cover => {
            if (cover.parent) {
                this.scene.remove(cover.parent);
            }
        });
        this.covers = [];
        this.reflections = [];
    }

    loadFromJSON(jsonData) {
        try {
            this.allAlbums = jsonData.albums || jsonData;
            this.filteredAlbums = [...this.allAlbums];
            this.clearScene();
            this.currentIndex = 0;
            this.targetIndex = 0;
            this.createCovers();
            this.createThumbnails();
            this.updateInfo();
            document.getElementById('total-albums').textContent = this.filteredAlbums.length;
        } catch (error) {
            console.error('Error loading JSON:', error);
            alert('Failed to load albums from JSON file.');
        }
    }

    toggleAutoRotate() {
        this.settings.autoRotate = !this.settings.autoRotate;

        if (this.settings.autoRotate) {
            this.autoRotateInterval = setInterval(() => {
                const nextIndex = (this.currentIndex + 1) % this.filteredAlbums.length;
                this.navigateTo(nextIndex);
            }, 5000);
        } else {
            if (this.autoRotateInterval) {
                clearInterval(this.autoRotateInterval);
                this.autoRotateInterval = null;
            }
        }

        this.saveSettings();
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    toggleHardwareRendering() {
        this.settings.hardwareRendering = !this.settings.hardwareRendering;

        // Rebuild covers with new materials
        this.clearScene();
        this.createCovers();
        this.createThumbnails();
        this.updateInfo();

        this.saveSettings();
    }

    toggleGlassEffect() {
        this.settings.glassEffect = !this.settings.glassEffect;

        // Rebuild covers with new materials
        this.clearScene();
        this.createCovers();
        this.createThumbnails();
        this.updateInfo();

        this.saveSettings();
    }

    toggleBloomEffect() {
        this.settings.bloomEffect = !this.settings.bloomEffect;

        if (this.bloomPass) {
            this.bloomPass.enabled = this.settings.bloomEffect;
        }

        this.saveSettings();
    }

    toggleSSAOEffect() {
        this.settings.ssaoEffect = !this.settings.ssaoEffect;

        if (this.ssaoPass) {
            this.ssaoPass.enabled = this.settings.ssaoEffect;
        }

        this.saveSettings();
    }

    updateBloomIntensity(value) {
        this.settings.bloomIntensity = value;

        if (this.bloomPass) {
            this.bloomPass.strength = value;
        }

        this.saveSettings();
    }

    addEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            switch(e.key) {
                case 'ArrowLeft':
                    this.navigate(-1);
                    break;
                case 'ArrowRight':
                    this.navigate(1);
                    break;
                case 'Home':
                    this.navigateToFirst();
                    break;
                case 'End':
                    this.navigateToLast();
                    break;
                case ' ':
                    e.preventDefault();
                    this.navigateRandom();
                    break;
                case 'f':
                case 'F':
                    this.toggleFullscreen();
                    break;
                case '?':
                    this.openModal('shortcuts-modal');
                    break;
                case 'Escape':
                    this.closeAllModals();
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
                default:
                    if (e.key >= '1' && e.key <= '9') {
                        const percent = parseInt(e.key) / 10;
                        const targetIndex = Math.floor((this.filteredAlbums.length - 1) * percent);
                        this.navigateTo(targetIndex);
                    }
            }
        });

        // Mouse wheel
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const direction = e.deltaY > 0 ? 1 : -1;
            this.navigate(direction);
        }, { passive: false });

        // Mouse click on covers
        this.container.addEventListener('click', (e) => {
            const mouse = new THREE.Vector2();
            const rect = this.container.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);

            const intersects = raycaster.intersectObjects(this.covers);
            if (intersects.length > 0) {
                const clickedCover = intersects[0].object;
                if (clickedCover.userData.isCover) {
                    this.navigateTo(clickedCover.userData.index);
                }
            }
        });

        // Touch support
        let touchStartX = 0;
        this.container.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });

        this.container.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > 50) {
                this.navigate(diff > 0 ? 1 : -1);
            }
        });

        // Search functionality
        const searchInput = document.getElementById('search-input');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterAlbums(e.target.value);
            }, 300);
        });

        document.getElementById('clear-search').addEventListener('click', () => {
            searchInput.value = '';
            this.filterAlbums('');
        });

        // Thumbnail navigation
        document.getElementById('thumb-prev').addEventListener('click', () => this.navigate(-1));
        document.getElementById('thumb-next').addEventListener('click', () => this.navigate(1));

        // Top bar buttons
        document.getElementById('settings-btn').addEventListener('click', () => this.openModal('settings-modal'));
        document.getElementById('shortcuts-btn').addEventListener('click', () => this.openModal('shortcuts-modal'));
        document.getElementById('fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());

        // Modal close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });

        this.setupSettingsControls();
    }

    setupSettingsControls() {
        // Basic settings
        const speedSlider = document.getElementById('animation-speed');
        const spacingSlider = document.getElementById('cover-spacing');
        const angleSlider = document.getElementById('side-angle');
        const reflectionToggle = document.getElementById('reflection-toggle');
        const autoRotateToggle = document.getElementById('auto-rotate');

        speedSlider.value = this.settings.animationSpeed * 100;
        spacingSlider.value = this.settings.coverSpacing * 10;
        angleSlider.value = (this.settings.sideAngle * 180 / Math.PI);
        reflectionToggle.checked = this.settings.showReflections;
        autoRotateToggle.checked = this.settings.autoRotate;

        speedSlider.addEventListener('input', (e) => {
            this.settings.animationSpeed = e.target.value / 100;
            document.getElementById('speed-value').textContent = e.target.value;
            this.saveSettings();
        });

        spacingSlider.addEventListener('input', (e) => {
            this.settings.coverSpacing = e.target.value / 10;
            document.getElementById('spacing-value').textContent = (e.target.value / 10).toFixed(1);
            this.saveSettings();
        });

        angleSlider.addEventListener('input', (e) => {
            this.settings.sideAngle = (e.target.value * Math.PI / 180);
            document.getElementById('angle-value').textContent = e.target.value + '°';
            this.saveSettings();
        });

        reflectionToggle.addEventListener('change', (e) => {
            this.settings.showReflections = e.target.checked;
            this.saveSettings();
        });

        autoRotateToggle.addEventListener('change', (e) => {
            if (e.target.checked !== this.settings.autoRotate) {
                this.toggleAutoRotate();
            }
        });

        // Hardware rendering settings
        const hardwareToggle = document.getElementById('hardware-rendering');
        const glassToggle = document.getElementById('glass-effect');
        const bloomToggle = document.getElementById('bloom-effect');
        const ssaoToggle = document.getElementById('ssao-effect');
        const bloomIntensity = document.getElementById('bloom-intensity');

        hardwareToggle.checked = this.settings.hardwareRendering;
        glassToggle.checked = this.settings.glassEffect;
        bloomToggle.checked = this.settings.bloomEffect;
        ssaoToggle.checked = this.settings.ssaoEffect;
        bloomIntensity.value = this.settings.bloomIntensity * 10;

        hardwareToggle.addEventListener('change', (e) => {
            this.toggleHardwareRendering();
        });

        glassToggle.addEventListener('change', (e) => {
            this.toggleGlassEffect();
        });

        bloomToggle.addEventListener('change', (e) => {
            this.toggleBloomEffect();
        });

        ssaoToggle.addEventListener('change', (e) => {
            this.toggleSSAOEffect();
        });

        bloomIntensity.addEventListener('input', (e) => {
            const value = e.target.value / 10;
            this.updateBloomIntensity(value);
            document.getElementById('bloom-value').textContent = value.toFixed(1);
        });

        // Controller settings
        const sensitivitySlider = document.getElementById('controller-sensitivity');
        const vibrationToggle = document.getElementById('controller-vibration');

        sensitivitySlider.value = this.settings.controllerSensitivity;
        vibrationToggle.checked = this.settings.controllerVibration;

        sensitivitySlider.addEventListener('input', (e) => {
            this.settings.controllerSensitivity = parseInt(e.target.value);
            document.getElementById('sensitivity-value').textContent = e.target.value;
            this.saveSettings();
        });

        vibrationToggle.addEventListener('change', (e) => {
            this.settings.controllerVibration = e.target.checked;
            this.saveSettings();
        });

        // FPS counter toggle
        const fpsToggle = document.getElementById('fps-counter-toggle');
        fpsToggle.checked = this.settings.showFpsCounter;

        fpsToggle.addEventListener('change', (e) => {
            this.settings.showFpsCounter = e.target.checked;
            document.getElementById('fps-counter').style.display = e.target.checked ? 'block' : 'none';
            this.saveSettings();
            this.showToast(`FPS counter ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
        });

        // Settings export/import
        document.getElementById('export-settings-btn').addEventListener('click', () => {
            this.exportSettings();
        });

        document.getElementById('import-settings-btn').addEventListener('click', () => {
            document.getElementById('settings-file-input').click();
        });

        document.getElementById('settings-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const jsonData = JSON.parse(event.target.result);
                        this.importSettings(jsonData);
                        this.closeAllModals();
                    } catch (error) {
                        this.showToast('Invalid settings file format', 'error');
                    }
                };
                reader.readAsText(file);
            }
        });

        // Reset settings
        document.getElementById('reset-settings').addEventListener('click', () => {
            this.settings = {
                animationSpeed: 0.1,
                coverSpacing: 2.5,
                sideAngle: Math.PI / 3,
                showReflections: true,
                autoRotate: false,
                hardwareRendering: false,
                glassEffect: false,
                bloomEffect: false,
                ssaoEffect: false,
                bloomIntensity: 1.5,
                controllerSensitivity: 5,
                controllerVibration: true,
                showFpsCounter: false
            };
            this.saveSettings();
            this.setupSettingsControls();
            if (this.autoRotateInterval) {
                clearInterval(this.autoRotateInterval);
                this.autoRotateInterval = null;
            }
            // Rebuild scene
            this.clearScene();
            this.createCovers();
            this.createThumbnails();
            this.updateInfo();
            document.getElementById('fps-counter').style.display = 'none';
            this.showToast('Settings reset to defaults', 'info');
        });

        // JSON file loading
        document.getElementById('load-json-btn').addEventListener('click', () => {
            document.getElementById('json-file-input').click();
        });

        document.getElementById('json-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const jsonData = JSON.parse(event.target.result);
                        this.loadFromJSON(jsonData);
                        this.showToast(`Loaded ${this.filteredAlbums.length} albums successfully!`, 'success');
                        this.closeAllModals();
                    } catch (error) {
                        this.showToast('Invalid JSON file format', 'error');
                    }
                };
                reader.readAsText(file);
            }
        });
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

        if (this.composer) {
            this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
        }
    }

    hideLoadingScreen() {
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
        }, 500);
    }

    // Toast notification system
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Settings export/import
    exportSettings() {
        const data = {
            version: '2.0',
            settings: this.settings,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coverflow-settings-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Settings exported successfully!', 'success');
    }

    importSettings(jsonData) {
        try {
            if (jsonData.version && jsonData.settings) {
                this.settings = { ...this.settings, ...jsonData.settings };
                this.saveSettings();

                // Apply settings
                this.setupSettingsControls();

                // Rebuild if necessary
                if (jsonData.settings.glassEffect !== undefined ||
                    jsonData.settings.hardwareRendering !== undefined) {
                    this.clearScene();
                    this.createCovers();
                    this.createThumbnails();
                    this.updateInfo();
                }

                // Update post-processing
                if (this.bloomPass) {
                    this.bloomPass.enabled = this.settings.bloomEffect;
                    this.bloomPass.strength = this.settings.bloomIntensity;
                }
                if (this.ssaoPass) {
                    this.ssaoPass.enabled = this.settings.ssaoEffect;
                }

                // Update FPS counter
                document.getElementById('fps-counter').style.display =
                    this.settings.showFpsCounter ? 'block' : 'none';

                this.showToast('Settings imported successfully!', 'success');
            } else {
                throw new Error('Invalid settings format');
            }
        } catch (error) {
            this.showToast('Failed to import settings', 'error');
            console.error('Import error:', error);
        }
    }

    // FPS tracking
    updateFPS() {
        const now = performance.now();
        const delta = now - this.fpsLastTime;

        if (delta > 0) {
            const currentFps = 1000 / delta;
            this.fpsFrames.push(currentFps);

            if (this.fpsFrames.length > 60) {
                this.fpsFrames.shift();
            }

            // Calculate average FPS
            const avgFps = this.fpsFrames.reduce((a, b) => a + b, 0) / this.fpsFrames.length;
            this.fps = Math.round(avgFps);

            // Update display
            if (this.settings.showFpsCounter) {
                document.getElementById('fps-value').textContent = this.fps;

                // Color code based on FPS
                const fpsElement = document.getElementById('fps-counter');
                if (this.fps >= 55) {
                    fpsElement.style.color = '#00ff00';
                } else if (this.fps >= 30) {
                    fpsElement.style.color = '#ffff00';
                } else {
                    fpsElement.style.color = '#ff0000';
                }
            }
        }

        this.fpsLastTime = now;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update FPS counter
        this.updateFPS();

        // Poll gamepad input
        this.pollGamepad();

        // Update cover positions
        this.updateCoverPositions(false);

        // Floating animation for center cover
        const centerCover = this.covers[this.currentIndex];
        if (centerCover) {
            const baseY = centerCover.parent.position.y;
            centerCover.parent.position.y = baseY + Math.sin(Date.now() * 0.001) * 0.03;
        }

        // Render with post-processing if enabled, otherwise normal render
        if (this.composer && (this.settings.bloomEffect || this.settings.ssaoEffect)) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    new CoverFlow();
});
