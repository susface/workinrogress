/**
 * VR Mode Module
 * Comprehensive WebXR support for VR headsets with enhanced game browsing,
 * theater mode, and immersive 3D experiences
 */

class VRMode {
    constructor() {
        this.vrSupported = false;
        this.vrSession = null;
        this.vrReferenceSpace = null;
        this.vrEnabled = false;
        this.controllers = [];
        this.gameCovers3D = [];
        this.vrTheaterMode = false;
        this.vrTheaterScreen = null;
        this.carouselRadius = 3;
        this.currentGameIndex = 0;
        this.handModels = [];
    }

    /**
     * Initialize VR mode
     */
    async initializeVRMode() {
        // Check WebXR support
        if ('xr' in navigator) {
            this.vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
            window.logger?.debug('VR', 'WebXR VR support:', this.vrSupported);

            if (this.vrSupported) {
                this.createEnterVRButton();
            }
        } else {
            window.logger?.info('VR', 'WebXR not supported in this browser');
        }
    }

    /**
     * Create "Enter VR" button
     */
    createEnterVRButton() {
        const existingBtn = document.getElementById('enter-vr-btn');
        if (existingBtn) return;

        const button = document.createElement('button');
        button.id = 'enter-vr-btn';
        button.className = 'vr-enter-btn';
        button.innerHTML = '🥽 Enter VR';
        button.title = 'Enter Virtual Reality Mode';

        button.addEventListener('click', () => {
            if (!this.vrEnabled) {
                this.enterVR();
            } else {
                this.exitVR();
            }
        });

        // Add to controls area
        const controls = document.querySelector('.controls');
        if (controls) {
            controls.appendChild(button);
        }
    }

    /**
     * Enter VR mode
     */
    async enterVR() {
        if (!this.vrSupported) {
            this.showToast('VR not supported on this device', 'error');
            return;
        }

        try {
            // Get visual effects scene (THREE.js)
            const visualEffects = window.coverflow && window.coverflow.visualEffects;
            if (!visualEffects || !visualEffects.scene || !visualEffects.renderer) {
                this.showToast('3D scene not initialized. Enable Visual Effects first.', 'error');
                return;
            }

            // Request VR session
            this.vrSession = await navigator.xr.requestSession('immersive-vr', {
                optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
            });

            window.logger?.info('VR', 'VR session started');

            // Set up XR rendering
            await visualEffects.renderer.xr.setSession(this.vrSession);
            visualEffects.renderer.xr.enabled = true;

            // Get reference space
            this.vrReferenceSpace = await this.vrSession.requestReferenceSpace('local-floor');

            // Set up VR controllers
            this.setupVRControllers(visualEffects.scene);

            // Create 3D game carousel in VR space
            this.create3DCarousel(visualEffects.scene);

            // Update button
            const btn = document.getElementById('enter-vr-btn');
            if (btn) {
                btn.innerHTML = '🥽 Exit VR';
            }

            this.vrEnabled = true;

            // Handle session end
            this.vrSession.addEventListener('end', () => {
                this.onVRSessionEnded();
            });

            this.showToast('Entered VR Mode', 'success');

        } catch (error) {
            window.logger?.error('VR', 'Failed to enter VR:', error);
            this.showToast('Failed to enter VR: ' + error.message, 'error');
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
        this.vrEnabled = false;
        this.vrSession = null;

        // Update button
        const btn = document.getElementById('enter-vr-btn');
        if (btn) {
            btn.innerHTML = '🥽 Enter VR';
        }

        // Clean up 3D carousel
        this.cleanup3DCarousel();

        window.logger?.debug('VR', 'VR session ended');
        this.showToast('Exited VR Mode', 'info');
    }

    /**
     * Setup VR controllers
     */
    setupVRControllers(scene) {
        // Get controller models
        const visualEffects = window.coverflow.visualEffects;
        if (!visualEffects || !visualEffects.renderer) return;

        const renderer = visualEffects.renderer;

        // Controller 0 (left hand)
        const controller0 = renderer.xr.getController(0);
        controller0.addEventListener('selectstart', () => this.onControllerSelect(0, true));
        controller0.addEventListener('selectend', () => this.onControllerSelect(0, false));
        scene.add(controller0);
        this.controllers[0] = controller0;

        // Controller 1 (right hand)
        const controller1 = renderer.xr.getController(1);
        controller1.addEventListener('selectstart', () => this.onControllerSelect(1, true));
        controller1.addEventListener('selectend', () => this.onControllerSelect(1, false));
        scene.add(controller1);
        this.controllers[1] = controller1;

        // Add controller grips (for hand models)
        const controllerGrip0 = renderer.xr.getControllerGrip(0);
        const controllerGrip1 = renderer.xr.getControllerGrip(1);
        scene.add(controllerGrip0);
        scene.add(controllerGrip1);

        // Add visual ray for pointing
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        const material = new THREE.LineBasicMaterial({ color: 0x4fc3f7 });

        const line0 = new THREE.Line(geometry, material);
        const line1 = new THREE.Line(geometry, material);
        controller0.add(line0);
        controller1.add(line1);

        window.logger?.debug('VR', 'VR controllers setup complete');
    }

    /**
     * Handle controller select (trigger)
     */
    onControllerSelect(controllerIndex, pressed) {
        if (!pressed) return;

        window.logger?.trace('VR', 'Controller', controllerIndex, 'trigger pressed');

        // Left controller (0) = previous game
        if (controllerIndex === 0) {
            this.previousGame();
        }
        // Right controller (1) = next game
        else if (controllerIndex === 1) {
            this.nextGame();
        }
    }

    /**
     * Create 3D carousel in VR space
     */
    create3DCarousel(scene) {
        // Get current game list from coverflow
        const games = window.coverflow && window.coverflow.filteredAlbums;
        if (!games || games.length === 0) {
            window.logger?.warn('VR', 'No games to display in carousel');
            return;
        }

        window.logger?.debug('VR', 'Creating 3D carousel with', games.length, 'games');

        this.gameCovers3D = [];

        // Create covers in a circle around the user
        const angleStep = (Math.PI * 2) / Math.min(games.length, 12); // Max 12 visible at once

        games.slice(0, 12).forEach((game, index) => {
            const angle = angleStep * index;
            const x = Math.sin(angle) * this.carouselRadius;
            const z = Math.cos(angle) * this.carouselRadius - this.carouselRadius;
            const y = 1.5; // Eye level

            // Create game cover plane
            const geometry = new THREE.PlaneGeometry(0.8, 1.2);

            // Load game cover texture
            let texture;
            if (game.image) {
                texture = new THREE.TextureLoader().load(game.image);
            } else {
                // Create placeholder
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 768;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#2a2a2a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#4fc3f7';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(game.title || 'Game', canvas.width / 2, canvas.height / 2);
                texture = new THREE.CanvasTexture(canvas);
            }

            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide
            });

            const cover = new THREE.Mesh(geometry, material);
            cover.position.set(x, y, z);
            cover.lookAt(0, y, 0); // Face the user
            cover.userData = { gameIndex: index, game: game };

            scene.add(cover);
            this.gameCovers3D.push(cover);
        });

        window.logger?.debug('VR', '3D carousel created');
    }

    /**
     * Cleanup 3D carousel
     */
    cleanup3DCarousel() {
        if (!this.gameCovers3D || this.gameCovers3D.length === 0) return;

        const visualEffects = window.coverflow && window.coverflow.visualEffects;
        if (!visualEffects || !visualEffects.scene) return;

        this.gameCovers3D.forEach(cover => {
            visualEffects.scene.remove(cover);
            if (cover.geometry) cover.geometry.dispose();
            if (cover.material) {
                if (cover.material.map) cover.material.map.dispose();
                cover.material.dispose();
            }
        });

        this.gameCovers3D = [];
    }

    /**
     * Navigate to previous game in VR
     */
    previousGame() {
        if (window.coverflow && typeof window.coverflow.navigate === 'function') {
            window.coverflow.navigate(-1);
            this.showToast('Previous Game', 'info');
        }
    }

    /**
     * Navigate to next game in VR
     */
    nextGame() {
        if (window.coverflow && typeof window.coverflow.navigate === 'function') {
            window.coverflow.navigate(1);
            this.showToast('Next Game', 'info');
        }
    }

    /**
     * Enter VR Theater Mode
     */
    enterTheaterMode(videoElement, isYouTube = false) {
        if (!this.vrEnabled) {
            this.showToast('Enter VR mode first', 'info');
            return;
        }

        const visualEffects = window.coverflow && window.coverflow.visualEffects;
        if (!visualEffects || !visualEffects.scene) return;

        window.logger?.info('VR', 'Entering theater mode');

        // Create giant screen in VR
        const screenWidth = 8;
        const screenHeight = 4.5;
        const geometry = new THREE.PlaneGeometry(screenWidth, screenHeight);

        // Create video texture
        let texture;
        if (isYouTube) {
            // For YouTube, we need to use the iframe element
            const iframe = document.getElementById('youtube-player-iframe');
            if (iframe) {
                texture = new THREE.VideoTexture(iframe);
            }
        } else {
            // Local video element
            texture = new THREE.VideoTexture(videoElement);
        }

        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });

        this.vrTheaterScreen = new THREE.Mesh(geometry, material);
        this.vrTheaterScreen.position.set(0, 1.6, -5); // In front of user

        visualEffects.scene.add(this.vrTheaterScreen);

        this.vrTheaterMode = true;
        this.showToast('Theater Mode Active', 'success');
    }

    /**
     * Exit VR Theater Mode
     */
    exitTheaterMode() {
        if (!this.vrTheaterScreen) return;

        const visualEffects = window.coverflow && window.coverflow.visualEffects;
        if (visualEffects && visualEffects.scene) {
            visualEffects.scene.remove(this.vrTheaterScreen);
        }

        if (this.vrTheaterScreen.geometry) this.vrTheaterScreen.geometry.dispose();
        if (this.vrTheaterScreen.material) {
            if (this.vrTheaterScreen.material.map) this.vrTheaterScreen.material.map.dispose();
            this.vrTheaterScreen.material.dispose();
        }

        this.vrTheaterScreen = null;
        this.vrTheaterMode = false;

        this.showToast('Theater Mode Exited', 'info');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (window.coverflow && typeof window.coverflow.showToast === 'function') {
            window.coverflow.showToast(message, type);
        }
    }

    /**
     * Cleanup VR mode
     */
    cleanup() {
        if (this.vrEnabled) {
            this.exitVR();
        }
        this.cleanup3DCarousel();
        if (this.vrTheaterMode) {
            this.exitTheaterMode();
        }
    }
}
