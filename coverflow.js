/**
 * Enhanced CoverFlow with Controller Support, GPU Rendering, and Modular Architecture
 *
 * MODULAR ARCHITECTURE:
 * This class uses Object.assign to mix in functionality from separate modules:
 * - modules/coverflow-settings.js: Settings management (load, save, export, import, toggles)
 * - modules/coverflow-textures.js: Texture loading with fallback chain (getImageSrc, loadTextureWithFallback)
 * - modules/coverflow-ui-utils.js: UI utilities (showToast, openModal, toggleFullscreen)
 * - modules/coverflow-navigation.js: Navigation logic (navigateTo, navigate, updateCoverPositions)
 * - modules/coverflow-ui.js: UI updates (createThumbnails, updateThumbnails, updateInfo, onWindowResize)
 *
 * MODULE METHODS OVERRIDE ANY DUPLICATE METHODS IN THIS FILE
 * Note: Some legacy duplicate method implementations may still exist in this file
 * but are effectively unused as the module versions take precedence.
 */
class CoverFlow {
    constructor() {
        // ==================== MODULE INTEGRATION ====================
        // Mix in modular functionality from separate files
        // These modules override any duplicate methods defined later in this file
        Object.assign(this, new CoverFlowSettings());
        Object.assign(this, new CoverFlowTextures());
        Object.assign(this, new CoverFlowUIUtils());
        Object.assign(this, new CoverFlowNavigation());
        Object.assign(this, new CoverFlowUI());
        // ============================================================

        this.container = document.getElementById('coverflow-container');
        this.currentIndex = 0;
        this.targetIndex = 0;
        this.covers = [];
        this.reflections = [];
        this.allAlbums = [];
        this.filteredAlbums = [];
        this.isAnimating = false;
        this.autoRotateInterval = null;

        // Gamepad/Controller support - SIMPLIFIED
        this.gamepadIndex = -1;
        this.gamepadButtons = {};
        this.analogCooldown = 0;
        this.deadzone = 0.2;

        // GPU and rendering features
        this.gpuInfo = null;
        this.composer = null;
        this.bloomPass = null;
        this.ssaoPass = null;

        // Performance monitoring
        this.fps = 60;
        this.fpsFrames = [];
        this.fpsLastTime = performance.now();

        // Controller cursor
        this.controllerCursor = null;
        this.cursorX = window.innerWidth / 2;
        this.cursorY = window.innerHeight / 2;

        // Detect if running in Electron or browser
        this.isElectron = typeof window.electronAPI !== 'undefined';
        console.log(`Running in ${this.isElectron ? 'Electron' : 'Browser'} mode`);

        // Game scanner server (for browser mode) - configurable
        this.serverURL = this.detectServerURL();
        this.serverAvailable = false;
        this.scanInterval = null;

        // App paths for Electron mode
        this.appPaths = null;
        if (this.isElectron) {
            this.initializeAppPaths();
        }

        // Setup Electron IPC listeners if in Electron mode
        if (this.isElectron) {
            window.electronAPI.onScanProgress((status) => {
                this.updateScanProgress(status);
            });
            window.electronAPI.onScanComplete((status) => {
                this.handleScanComplete(status);
            });
        }

        // Settings with defaults
        this.settings = {
            animationSpeed: 0.1,
            coverSpacing: 2.5,
            sideAngle: Math.PI / 3,
            showReflections: true,
            autoRotate: false,
            // Appearance
            backgroundColor: '#000000',
            // Hardware rendering settings
            hardwareRendering: false,
            glassEffect: false,
            bloomEffect: false,
            ssaoEffect: false,
            bloomIntensity: 1.5,
            // Controller settings
            controllerSensitivity: 5,
            controllerVibration: true,
            // Scroll settings
            scrollSpeed: 1.0,
            // Performance
            showFpsCounter: false,
            // Error logging
            errorLogging: false
        };

        // Error logging system
        this.errorLog = [];

        this.loadSettings();
        this.setupErrorLogging();
        this.initAlbumData();
        this.detectGPU();
        this.init();
        this.createCovers();
        this.createThumbnails();
        this.addEventListeners();
        this.initGamepadSupport();
        this.initControllerCursor();
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

    detectServerURL() {
        // Check if there's a global config
        if (window.GAME_SCANNER_CONFIG && window.GAME_SCANNER_CONFIG.serverURL) {
            return window.GAME_SCANNER_CONFIG.serverURL;
        }
        // Check localStorage for saved server URL
        const savedURL = localStorage.getItem('game-scanner-server-url');
        if (savedURL) {
            return savedURL;
        }
        // Default to localhost
        return 'http://localhost:5000';
    }

    // Initialize app paths for Electron mode
    async initializeAppPaths() {
        if (window.electronAPI && window.electronAPI.getAppPath) {
            this.appPaths = await window.electronAPI.getAppPath();
            console.log('App paths initialized:', this.appPaths);
        }
    }

    // Get the correct image source based on environment (Electron vs Browser)
    getImageSrc(imagePath, fallback = null) {
        if (!imagePath) return fallback;

        // In Electron mode, convert to absolute file:// URLs
        if (this.isElectron) {
            // Check if already an absolute path with protocol
            if (imagePath.startsWith('http') || imagePath.startsWith('file://')) {
                return imagePath;
            }

            // Check if it's an absolute path (Windows: C:/ or Unix: /)
            if (imagePath.includes(':/') || (imagePath.startsWith('/') && !imagePath.startsWith('//'))) {
                // Convert to file:// URL with proper encoding
                const normalizedPath = imagePath.replace(/\\/g, '/');

                // Split path and encode each segment (but not the drive letter and slashes)
                const pathParts = normalizedPath.split('/');
                const encodedParts = pathParts.map((part, index) => {
                    // Don't encode empty parts or drive letter (e.g., "C:")
                    if (part === '' || (index === 0 && part.includes(':'))) {
                        return part;
                    }
                    return encodeURIComponent(part);
                });

                const encodedPath = encodedParts.join('/');
                const fileUrl = 'file:///' + encodedPath;
                return fileUrl;
            }

            // It's a relative path - this shouldn't happen but handle it gracefully
            // Just return as-is and let Electron handle it relative to the HTML file
            return imagePath;
        }

        // In browser mode, use Flask server URL
        return `${this.serverURL}/${imagePath}`;
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

    setupErrorLogging() {
        if (!this.settings.errorLogging) return;

        // Global error handler
        window.addEventListener('error', (event) => {
            this.logError({
                type: 'UNCAUGHT_ERROR',
                message: event.message,
                stack: event.error?.stack,
                context: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                type: 'UNHANDLED_REJECTION',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack,
                context: {
                    promise: 'Promise rejection'
                }
            });
        });

        console.log('Error logging enabled');
    }

    logError(errorData) {
        if (!this.settings.errorLogging) return;

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            ...errorData
        };

        // Store in memory
        this.errorLog.push(logEntry);
        if (this.errorLog.length > 100) {
            this.errorLog.shift(); // Keep last 100 errors
        }

        // Log to console
        console.error('[ERROR LOG]', logEntry);

        // In Electron mode, write to file
        if (this.isElectron && window.electronAPI) {
            window.electronAPI.logError(errorData).catch(err => {
                console.error('Failed to write error to file:', err);
            });
        }
    }

    async viewErrorLog() {
        if (this.isElectron && window.electronAPI) {
            try {
                const result = await window.electronAPI.getErrorLog();
                if (result.success) {
                    // Create modal to display log
                    const modal = document.createElement('div');
                    modal.className = 'modal active';
                    modal.innerHTML = `
                        <div class="modal-content" style="max-width: 800px;">
                            <div class="modal-header">
                                <h3>Error Log</h3>
                                <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                            </div>
                            <div class="modal-body">
                                <pre style="background: #1a1a1a; color: #00ff00; padding: 15px; border-radius: 5px; max-height: 500px; overflow-y: auto; font-family: monospace; font-size: 12px; white-space: pre-wrap;">${result.content}</pre>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);
                }
            } catch (error) {
                this.showToast('Failed to load error log', 'error');
            }
        } else {
            // Browser mode - show in-memory log
            const logText = this.errorLog.map(entry =>
                `[${entry.timestamp}] ${entry.type}: ${entry.message}\n${entry.stack || ''}\n---`
            ).join('\n\n');

            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3>Error Log (In-Memory)</h3>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <pre style="background: #1a1a1a; color: #00ff00; padding: 15px; border-radius: 5px; max-height: 500px; overflow-y: auto; font-family: monospace; font-size: 12px; white-space: pre-wrap;">${logText || 'No errors logged yet.'}</pre>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
    }

    async clearErrorLog() {
        if (this.isElectron && window.electronAPI) {
            try {
                const result = await window.electronAPI.clearErrorLog();
                if (result.success) {
                    this.errorLog = [];
                    this.showToast('Error log cleared', 'success');
                }
            } catch (error) {
                this.showToast('Failed to clear error log', 'error');
            }
        } else {
            this.errorLog = [];
            this.showToast('Error log cleared', 'success');
        }
    }

    initAlbumData() {
        // Start with empty array - no hardcoded examples
        this.allAlbums = [];
        this.filteredAlbums = [];
        document.getElementById('total-albums').textContent = this.filteredAlbums.length;

        // Load games from database (Electron) or JSON file (browser)
        if (this.isElectron) {
            // In Electron mode, load from database which has correct paths
            this.reloadGamesFromServer();
        } else {
            // In browser mode, load from JSON file
            this.loadGamesFromJSON();
        }
    }

    async loadGamesFromJSON(filepath = 'gameinfodownload-main/game_data/games_export.json') {
        try {
            const response = await fetch(filepath);
            if (!response.ok) {
                console.log('No games file found, showing empty library');
                this.showToast('No games found. Scan for games in Settings to get started!', 'info');
                return;
            }

            const data = await response.json();
            const games = data.games || [];

            console.log(`Loading ${games.length} games from ${filepath}`);

            // Convert game scanner format to CoverFlow format
            const convertedGames = games.map(game => {
                // Platform color mapping
                const platformColors = {
                    'steam': 0x1B2838,
                    'epic': 0x313131,
                    'xbox': 0x107C10
                };

                // Safe date parsing
                let year = '-';
                if (game.release_date) {
                    const date = new Date(game.release_date);
                    if (!isNaN(date.getTime())) {
                        year = date.getFullYear().toString();
                    }
                }

                // Prioritize header art for coverflow, then boxart, then icon
                const imagePath = game.header_path || game.boxart_path || game.icon_path;

                return {
                    type: 'game',
                    title: game.title,
                    platform: game.platform,
                    developer: game.developer || 'Unknown',
                    publisher: game.publisher || 'Unknown',
                    year: year,
                    genre: Array.isArray(game.genres) ? game.genres.join(', ') : game.genres || '-',
                    description: game.description || game.short_description || game.long_description || 'No description available.',
                    color: platformColors[game.platform] || 0x808080,
                    image: this.getImageSrc(imagePath), // Process path for coverflow display
                    icon_path: game.icon_path, // Store icon for fallback
                    boxart_path: game.boxart_path, // Store boxart separately
                    exe_icon_path: game.exe_icon_path, // Store exe icon for fallback
                    header_path: game.header_path, // Store header art
                    launchCommand: game.launch_command,
                    installDir: game.install_directory,
                    appId: game.app_id || game.package_name
                };
            });

            // Merge with existing albums/images
            this.allAlbums = [...this.allAlbums, ...convertedGames];
            this.filteredAlbums = [...this.allAlbums];
            document.getElementById('total-albums').textContent = this.filteredAlbums.length;

            // Recreate UI to include new games
            this.createCovers();
            this.createThumbnails();
            this.updateInfo();

            this.showToast(`Loaded ${convertedGames.length} games!`, 'success');
        } catch (error) {
            console.error('Error loading games:', error);
            this.showToast('Failed to load games file', 'error');
        }
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();

        // Set background color from settings
        const bgColor = new THREE.Color(this.settings.backgroundColor);
        this.scene.background = bgColor;

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
            alpha: false,
            powerPreference: 'high-performance',
            stencil: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    createErrorPlaceholder(title = 'Image Not Found') {
        /**
         * Create a placeholder texture for failed image loads
         * Provides visual feedback to users
         */
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Gradient background (dark red)
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#4a1a1a');
        gradient.addColorStop(1, '#2a0a0a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        // Error icon (exclamation mark in triangle)
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.9)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(256, 150);
        ctx.lineTo(350, 300);
        ctx.lineTo(162, 300);
        ctx.closePath();
        ctx.stroke();

        // Exclamation mark
        ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
        ctx.fillRect(246, 180, 20, 80);
        ctx.fillRect(246, 275, 20, 20);

        // Error text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, 256, 350);
        ctx.font = '16px Arial';
        ctx.fillText('Click to retry loading', 256, 380);

        return new THREE.CanvasTexture(canvas);
    }

    loadTextureWithFallback(imageSrc, album, material) {
        /**
         * Load texture with automatic fallback chain and error handling
         * Fallback order: primary image -> boxart -> icon -> exe_icon -> error placeholder
         * Returns a promise that resolves with the texture or error placeholder
         */
        return new Promise((resolve) => {
            const loader = new THREE.TextureLoader();
            console.log(`[TEXTURE] Loading texture for "${album.title}" from: ${imageSrc}`);

            const tryLoad = (src, nextFallback) => {
                loader.load(
                    src,
                    (texture) => {
                        // Success
                        console.log(`[TEXTURE] ✓ Successfully loaded texture for "${album.title}"`);
                        if (material) {
                            material.map = texture;
                            material.needsUpdate = true;
                        }
                        resolve(texture);
                    },
                    undefined, // onProgress
                    (error) => {
                        // Load failed, try next fallback
                        console.warn(`[TEXTURE] ✗ Failed to load texture for "${album.title}" from: ${src}`);
                        if (nextFallback) {
                            nextFallback();
                        } else {
                            // No more fallbacks - use error placeholder
                            console.warn(`[TEXTURE] Using error placeholder for "${album.title}"`);
                            const errorTexture = this.createErrorPlaceholder(album.title || 'Image Not Found');
                            if (material) {
                                material.map = errorTexture;
                                material.needsUpdate = true;
                            }
                            resolve(errorTexture);
                        }
                    }
                );
            };

            // Build fallback chain for games
            if (album.type === 'game') {
                // Try exe_icon as final fallback before error placeholder
                const tryExeIcon = () => {
                    const exeIconPath = this.getImageSrc(album.exe_icon_path);
                    if (album.exe_icon_path && exeIconPath !== imageSrc) {
                        console.log(`[TEXTURE] Trying exe_icon fallback for "${album.title}": ${exeIconPath}`);
                        tryLoad(exeIconPath, null);
                    } else {
                        console.log(`[TEXTURE] No exe_icon available for "${album.title}"`);
                        // No exe icon - use error placeholder
                        const errorTexture = this.createErrorPlaceholder(album.title || 'Image Not Found');
                        if (material) {
                            material.map = errorTexture;
                            material.needsUpdate = true;
                        }
                        resolve(errorTexture);
                    }
                };

                // Try icon as second-to-last fallback
                const tryIcon = () => {
                    const iconPath = this.getImageSrc(album.icon_path);
                    if (album.icon_path && iconPath !== imageSrc) {
                        console.log(`[TEXTURE] Trying icon fallback for "${album.title}": ${iconPath}`);
                        tryLoad(iconPath, tryExeIcon);
                    } else {
                        console.log(`[TEXTURE] No icon fallback available for "${album.title}" (same as primary or null)`);
                        tryExeIcon();
                    }
                };

                // Try boxart as middle fallback
                const tryBoxart = () => {
                    const boxartPath = this.getImageSrc(album.boxart_path);
                    if (album.boxart_path && boxartPath !== imageSrc) {
                        console.log(`[TEXTURE] Trying boxart fallback for "${album.title}": ${boxartPath}`);
                        tryLoad(boxartPath, tryIcon);
                    } else {
                        console.log(`[TEXTURE] No boxart fallback available for "${album.title}" (same as primary or null)`);
                        tryIcon();
                    }
                };

                // Start with primary image
                tryLoad(imageSrc, tryBoxart);
            } else {
                // For non-game items, just try primary and error placeholder
                tryLoad(imageSrc, null);
            }
        });
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
            try {
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
            } catch (error) {
                console.warn('SSAO effect not available:', error.message);
                this.ssaoPass = null;
                this.settings.ssaoEffect = false;
                // Disable SSAO checkbox if it exists
                const ssaoCheckbox = document.getElementById('ssao-effect');
                if (ssaoCheckbox) {
                    ssaoCheckbox.checked = false;
                    ssaoCheckbox.disabled = true;
                    const parent = ssaoCheckbox.closest('.setting-group');
                    if (parent) {
                        const info = parent.querySelector('.setting-info');
                        if (info) info.textContent = 'Not available (missing dependencies)';
                    }
                }
            }
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
                    envMapIntensity: 1.5,
                    clearcoat: 1.0,
                    clearcoatRoughness: 0.1,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.95,
                    ior: 1.5 // Index of refraction for glass-like appearance
                });
            } else if (album.image) {
                // album.image is already properly formatted by getImageSrc()
                const imageSrc = album.image;

                // Create material with placeholder texture first
                material = new THREE.MeshPhongMaterial({
                    color: 0xffffff, // White color to avoid tinting the texture
                    side: THREE.DoubleSide,
                    shininess: 80
                });

                // Load texture with improved error handling
                // Store the index to access the cover later
                const currentIndex = index;
                this.loadTextureWithFallback(imageSrc, album, material).then((texture) => {
                    // Texture is already applied to material by loadTextureWithFallback
                    // Now update the reflection if it exists
                    if (this.covers[currentIndex] && this.covers[currentIndex].userData.reflection) {
                        const reflectionMesh = this.covers[currentIndex].userData.reflection;
                        if (reflectionMesh.material) {
                            reflectionMesh.material.map = texture;
                            reflectionMesh.material.needsUpdate = true;
                        }
                    }
                });
            } else if (album.video) {
                // Video placeholder with play icon
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');

                // Gradient background
                const gradient = ctx.createLinearGradient(0, 0, 0, 512);
                gradient.addColorStop(0, '#8B4789');
                gradient.addColorStop(1, '#5A2D58');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 512, 512);

                // Play icon
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.moveTo(180, 150);
                ctx.lineTo(180, 362);
                ctx.lineTo(350, 256);
                ctx.closePath();
                ctx.fill();

                // "VIDEO" text
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = 'bold 36px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('VIDEO', 256, 420);

                const texture = new THREE.CanvasTexture(canvas);
                material = new THREE.MeshPhongMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                    shininess: 80
                });
            } else if (album.audio || album.type === 'music') {
                // Music/Audio placeholder with music note icon
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');

                // Gradient background
                const gradient = ctx.createLinearGradient(0, 0, 0, 512);
                gradient.addColorStop(0, '#FF6347');
                gradient.addColorStop(1, '#DC143C');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 512, 512);

                // Music note icon
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                // Note stem
                ctx.fillRect(300, 150, 20, 180);
                // Note head
                ctx.ellipse(290, 330, 35, 25, -0.3, 0, Math.PI * 2);
                ctx.fill();

                // "MUSIC" text
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = 'bold 36px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('MUSIC', 256, 420);

                const texture = new THREE.CanvasTexture(canvas);
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

            // Border
            const borderGeometry = new THREE.EdgesGeometry(geometry);
            const borderMaterial = new THREE.LineBasicMaterial({
                color: 0xffffff,
                linewidth: 1
            });
            const border = new THREE.LineSegments(borderGeometry, borderMaterial);
            cover.add(border);

            coverGroup.add(cover);

            // Reflection - create AFTER cover is added to ensure proper material reference
            const reflectionMaterial = material.clone();
            reflectionMaterial.opacity = 0.3;
            reflectionMaterial.transparent = true;

            const reflection = new THREE.Mesh(geometry, reflectionMaterial);
            reflection.position.y = -coverHeight - 0.1; // Position below with small gap
            reflection.scale.y = -0.6; // Flip vertically for mirror effect
            reflection.userData = { isReflection: true };

            // Ensure reflection visibility matches settings
            reflection.visible = this.settings.showReflections;

            coverGroup.add(reflection);
            this.reflections.push(reflection);

            // Store references for texture updates - store both cover and reflection materials
            cover.userData = {
                index,
                album,
                isCover: true,
                reflectionMaterial,
                reflection  // Store direct reference to reflection mesh
            };

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
            if (cover.material) {
                cover.material.opacity = opacity;
                cover.material.transparent = true;
            }

            const reflection = parent.children && parent.children[1];
            if (reflection && reflection.userData && reflection.userData.isReflection) {
                reflection.visible = this.settings.showReflections;
                if (reflection.material) {
                    reflection.material.opacity = opacity * 0.3;
                }
            }
        });
    }

    // Controller/Gamepad Support
    // COMPLETELY REWRITTEN GAMEPAD SYSTEM - SIMPLE AND RELIABLE
    initGamepadSupport() {
        console.log('🎮 Initializing gamepad support...');

        // Just check for gamepads every frame in pollGamepad()
        // No events needed - events are unreliable
        this.findGamepad();
    }

    findGamepad() {
        if (!navigator.getGamepads) return;

        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                this.gamepadIndex = i;
                console.log('✓ Found gamepad:', gamepads[i].id, 'at index', i);

                // Update UI
                const statusEl = document.getElementById('controller-status');
                const nameEl = document.getElementById('controller-name');
                if (statusEl) statusEl.classList.add('connected');
                if (nameEl) nameEl.textContent = gamepads[i].id.substring(0, 30);

                return true;
            }
        }
        return false;
    }

    pollGamepad() {
        if (!navigator.getGamepads) return;

        // If no gamepad connected, try to find one
        if (this.gamepadIndex === -1) {
            this.findGamepad();
            return;
        }

        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.gamepadIndex];

        // If gamepad gone, reset
        if (!gamepad) {
            this.gamepadIndex = -1;
            const statusEl = document.getElementById('controller-status');
            const nameEl = document.getElementById('controller-name');
            if (statusEl) statusEl.classList.remove('connected');
            if (nameEl) nameEl.textContent = 'No Controller';
            this.gamepadButtons = {};
            return;
        }

        const sensitivity = this.settings.controllerSensitivity / 5;

        // ANALOG STICK - Left stick X-axis
        if (this.analogCooldown <= 0) {
            const axisX = gamepad.axes[0] || 0;
            if (Math.abs(axisX) > this.deadzone) {
                if (axisX < -this.deadzone) {
                    this.navigate(-1);
                    this.analogCooldown = 0.3 / sensitivity;
                } else if (axisX > this.deadzone) {
                    this.navigate(1);
                    this.analogCooldown = 0.3 / sensitivity;
                }
            }
        } else {
            this.analogCooldown -= 0.016;
        }

        // BUTTONS - Simple press detection
        const pressed = (btn) => btn && btn.pressed;
        const wasPressed = (id) => this.gamepadButtons[id];
        const justPressed = (btn, id) => pressed(btn) && !wasPressed(id);

        // D-Pad Left/Right
        if (justPressed(gamepad.buttons[14], 14)) this.navigate(-1);
        if (justPressed(gamepad.buttons[15], 15)) this.navigate(1);

        // Shoulder buttons
        if (justPressed(gamepad.buttons[4], 4)) this.navigate(-1);
        if (justPressed(gamepad.buttons[5], 5)) this.navigate(1);

        // Triggers
        if (gamepad.buttons[6] && gamepad.buttons[6].value > 0.5 && !wasPressed(6)) {
            this.navigateToFirst();
            this.gamepadButtons[6] = true;
        } else if (!gamepad.buttons[6] || gamepad.buttons[6].value <= 0.5) {
            this.gamepadButtons[6] = false;
        }

        if (gamepad.buttons[7] && gamepad.buttons[7].value > 0.5 && !wasPressed(7)) {
            this.navigateToLast();
            this.gamepadButtons[7] = true;
        } else if (!gamepad.buttons[7] || gamepad.buttons[7].value <= 0.5) {
            this.gamepadButtons[7] = false;
        }

        // Face buttons
        if (justPressed(gamepad.buttons[0], 0)) {
            // A button - click element under controller cursor
            this.clickElementUnderCursor();
        }
        if (justPressed(gamepad.buttons[1], 1)) {
            // B button - close modals
            this.closeAllModals();
        }
        if (justPressed(gamepad.buttons[2], 2)) {
            // X button - show info
            this.showInfoModal();
        }
        if (justPressed(gamepad.buttons[3], 3)) {
            // Y button - random
            this.navigateRandom();
        }

        // Start/Select
        if (justPressed(gamepad.buttons[9], 9)) {
            this.openModal('settings-modal');
        }
        if (justPressed(gamepad.buttons[8], 8)) {
            this.toggleFullscreen();
        }

        // Update button states
        for (let i = 0; i < gamepad.buttons.length; i++) {
            this.gamepadButtons[i] = pressed(gamepad.buttons[i]);
        }
    }

    vibrateController(duration, intensity) {
        // Vibration removed - was causing issues
    }

    // Show info modal for current album/image
    showInfoModal() {
        const item = this.filteredAlbums[this.currentIndex];
        if (!item) return;

        const isImage = item.type === 'image';
        const isGame = item.type === 'game';

        // Update modal title and details based on type
        document.getElementById('info-modal-title').textContent = item.title;

        if (isGame) {
            // For games, show platform and developer
            document.getElementById('info-modal-artist').textContent = item.developer || 'Unknown';
            document.getElementById('info-modal-year').textContent = item.year || '-';
            document.getElementById('info-modal-genre').textContent = item.genre || '-';
            // Update labels
            const artistLabel = document.querySelector('#info-modal-artist').previousElementSibling;
            const genreLabel = document.querySelector('#info-modal-genre').previousElementSibling;
            artistLabel.textContent = 'Developer:';
            genreLabel.textContent = 'Genre:';
        } else if (isImage) {
            // For images, show category and tags
            document.getElementById('info-modal-artist').textContent = item.category || 'Image';
            document.getElementById('info-modal-year').textContent = item.year || '-';
            document.getElementById('info-modal-genre').textContent = item.tags || '-';
            // Update labels
            const genreLabel = document.querySelector('#info-modal-genre').previousElementSibling;
            genreLabel.textContent = 'Tags:';
        } else {
            // For albums, show artist and genre
            document.getElementById('info-modal-artist').textContent = item.artist;
            document.getElementById('info-modal-year').textContent = item.year;
            document.getElementById('info-modal-genre').textContent = item.genre;
            // Update labels
            const artistLabel = document.querySelector('#info-modal-artist').previousElementSibling;
            const genreLabel = document.querySelector('#info-modal-genre').previousElementSibling;
            artistLabel.textContent = 'Artist:';
            genreLabel.textContent = 'Genre:';
        }

        // Safe color conversion
        const colorHex = typeof item.color === 'number' && !isNaN(item.color)
            ? '#' + item.color.toString(16).padStart(6, '0').toUpperCase()
            : '#808080';
        document.getElementById('info-modal-color').textContent = colorHex;
        document.getElementById('info-description-text').textContent = item.description || 'No description available.';

        // Handle media (image or video)
        const coverContainer = document.getElementById('info-cover-container');
        const videoContainer = document.getElementById('info-video-container');
        const video = document.getElementById('info-video');

        // Clear previous content
        coverContainer.innerHTML = '';
        videoContainer.style.display = 'none';
        video.src = '';

        if (item.video) {
            // Show video
            video.src = item.video;
            videoContainer.style.display = 'block';
        } else if (item.image) {
            // Show image
            const imgWrapper = document.createElement('div');
            imgWrapper.style.display = 'flex';
            imgWrapper.style.flexDirection = 'column';
            imgWrapper.style.gap = '10px';
            imgWrapper.style.width = '100%';
            imgWrapper.style.height = '100%';

            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.title;
            img.style.cursor = 'pointer';
            img.style.flex = '1';
            img.style.objectFit = 'cover';
            img.style.width = '100%';
            img.style.borderRadius = '5px';

            // Fallback to icon if boxart fails to load (for games)
            img.addEventListener('error', () => {
                if (item.type === 'game' && item.icon_path && img.src !== item.icon_path) {
                    console.log('Boxart failed in modal, trying icon:', item.icon_path);
                    img.src = item.icon_path;
                }
            });

            // Click to view full size in new tab
            img.addEventListener('click', () => {
                window.open(item.image, '_blank');
            });

            imgWrapper.appendChild(img);

            // Add click hint for images
            if (isImage) {
                const hint = document.createElement('div');
                hint.style.textAlign = 'center';
                hint.style.fontSize = '12px';
                hint.style.color = '#888';
                hint.style.padding = '5px';
                hint.style.width = '100%';
                hint.textContent = '(Click image to view full size)';
                imgWrapper.appendChild(hint);
            }

            coverContainer.appendChild(imgWrapper);
        } else {
            // Show colored placeholder
            const placeholder = document.createElement('div');
            placeholder.style.width = '100%';
            placeholder.style.height = '100%';
            const bgColor = typeof item.color === 'number' && !isNaN(item.color)
                ? '#' + item.color.toString(16).padStart(6, '0')
                : '#808080';
            placeholder.style.background = bgColor;
            placeholder.style.display = 'flex';
            placeholder.style.alignItems = 'center';
            placeholder.style.justifyContent = 'center';
            placeholder.style.fontSize = '48px';
            placeholder.style.color = 'rgba(255,255,255,0.5)';
            placeholder.textContent = isGame ? '🎮' : (isImage ? '🖼️' : '♪');
            coverContainer.appendChild(placeholder);
        }

        // Add launch button for games
        const launchBtn = document.getElementById('launch-game-btn');
        if (launchBtn) {
            if (isGame && item.launchCommand) {
                launchBtn.style.display = 'block';
                launchBtn.onclick = () => this.launchGame(item);
            } else {
                launchBtn.style.display = 'none';
            }
        }

        this.openModal('info-modal');
        this.vibrateController(100, 0.2);
    }

    // Launch a game using its launch command
    launchGame(game) {
        if (!game.launchCommand) {
            this.showToast('No launch command available for this game', 'error');
            return;
        }

        console.log('Launching game:', game.title, 'with command:', game.launchCommand);

        if (this.isElectron) {
            // Use Electron shell API
            window.electronAPI.launchGame(game.launchCommand).then(result => {
                if (result.success) {
                    this.showToast(`Launching ${game.title}...`, 'success');
                } else {
                    this.showToast('Failed to launch game', 'error');
                }
            });
        } else {
            // Browser mode - try URL protocols
            if (game.launchCommand.startsWith('steam://') ||
                game.launchCommand.startsWith('com.epicgames.launcher://') ||
                game.launchCommand.startsWith('xbox://')) {
                window.location.href = game.launchCommand;
                this.showToast(`Launching ${game.title}...`, 'success');
            } else {
                this.showToast('Game launching is platform-specific. Please use your game launcher.', 'info');
                console.log('Platform:', game.platform);
                console.log('Launch command:', game.launchCommand);
            }
        }
    }

    // Check if game scanner server is running
    async checkServerStatus() {
        if (this.isElectron) {
            // In Electron mode, always available
            this.serverAvailable = true;
            try {
                const count = await window.electronAPI.getGamesCount();
                if (count && count.success) {
                    document.getElementById('game-count-info').innerHTML =
                        `<span style="color: #4CAF50;">✓ Desktop Mode</span> - ${count.total} games found`;
                }
            } catch (error) {
                console.error('Error getting games count:', error);
                document.getElementById('game-count-info').innerHTML =
                    `<span style="color: #f44336;">✗ Error loading game count</span>`;
            }
            return;
        }

        // Browser mode - check Flask server
        try {
            const response = await fetch(`${this.serverURL}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                this.serverAvailable = true;
                document.getElementById('server-status').textContent = '✓ Connected';
                document.getElementById('server-status').style.color = '#4CAF50';

                // Get game count
                const countResponse = await fetch(`${this.serverURL}/api/games/count`);
                if (countResponse.ok) {
                    const data = await countResponse.json();
                    const statusText = `${data.total} games found`;
                    document.getElementById('game-count-info').innerHTML =
                        `<span style="color: #4CAF50;">✓ Connected</span> - ${statusText}`;
                }
            } else {
                throw new Error('Server not responding');
            }
        } catch (error) {
            this.serverAvailable = false;
            document.getElementById('server-status').textContent = '✗ Not running';
            document.getElementById('server-status').style.color = '#f44336';
            document.getElementById('game-count-info').innerHTML =
                `<span style="color: #f44336;">✗ Server not running</span> - <a href="#" onclick="window.open('GAMES_INTEGRATION.md'); return false;" style="color: #667eea;">Setup Guide</a>`;
        }
    }

    // Start game scan
    async startGameScan() {
        if (this.isElectron) {
            // Electron mode - use IPC
            const result = await window.electronAPI.startScan();
            if (result.success) {
                this.showToast('Game scan started...', 'info');
                document.getElementById('scan-progress-group').style.display = 'block';
                document.getElementById('scan-games-btn').disabled = true;
            } else {
                this.showToast(result.error || 'Failed to start scan', 'error');
            }
            return;
        }

        // Browser mode - existing code
        if (!this.serverAvailable) {
            this.showToast('Game scanner server is not running. Please start the server first.', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.serverURL}/api/scan/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                this.showToast('Game scan started...', 'info');

                // Show progress UI
                document.getElementById('scan-progress-group').style.display = 'block';
                document.getElementById('scan-games-btn').disabled = true;

                // Start polling for status
                this.pollScanStatus();
            } else {
                const error = await response.json();
                this.showToast(error.error || 'Failed to start scan', 'error');
            }
        } catch (error) {
            console.error('Scan start error:', error);
            this.showToast('Failed to start game scan', 'error');
        }
    }

    // Poll scan status
    async pollScanStatus() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
        }

        this.scanInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.serverURL}/api/scan/status`);
                if (response.ok) {
                    const status = await response.json();

                    // Update UI
                    const statusText = document.getElementById('scan-status-text');
                    const progressBar = document.getElementById('scan-progress-bar');

                    statusText.textContent = status.message;
                    progressBar.style.width = status.progress + '%';

                    // Check if scan is complete
                    if (!status.scanning) {
                        clearInterval(this.scanInterval);
                        this.scanInterval = null;

                        // Hide progress UI after 2 seconds
                        setTimeout(() => {
                            document.getElementById('scan-progress-group').style.display = 'none';
                            document.getElementById('scan-games-btn').disabled = false;
                        }, 2000);

                        if (status.error) {
                            this.showToast(`Scan failed: ${status.error}`, 'error');
                        } else {
                            this.showToast(status.message, 'success');
                            // Reload games automatically
                            await this.reloadGamesFromServer();
                        }

                        // Update server status
                        this.checkServerStatus();
                    }
                }
            } catch (error) {
                console.error('Poll error:', error);
                clearInterval(this.scanInterval);
                this.scanInterval = null;
                document.getElementById('scan-progress-group').style.display = 'none';
                document.getElementById('scan-games-btn').disabled = false;
            }
        }, 1000); // Poll every second
    }

    // Handle scan progress updates from Electron
    updateScanProgress(status) {
        if (!this.isElectron) return;

        const statusText = document.getElementById('scan-status-text');
        const progressBar = document.getElementById('scan-progress-bar');

        if (statusText) statusText.textContent = status.message;
        if (progressBar) progressBar.style.width = status.progress + '%';
    }

    // Handle scan completion from Electron
    async handleScanComplete(status) {
        if (!this.isElectron) return;

        setTimeout(() => {
            document.getElementById('scan-progress-group').style.display = 'none';
            document.getElementById('scan-games-btn').disabled = false;
        }, 2000);

        if (status.error) {
            this.showToast(`Scan failed: ${status.error}`, 'error');
        } else {
            this.showToast(status.message, 'success');
            await this.reloadGamesFromServer();
        }

        this.checkServerStatus();
    }

    // Reload games from server
    // Alias for reloadGamesFromServer (for compatibility)
    async loadGames() {
        return this.reloadGamesFromServer();
    }

    async reloadGamesFromServer() {
        if (this.isElectron) {
            // Electron mode - use IPC
            try {
                const result = await window.electronAPI.getGames();
                if (!result.success) {
                    this.showToast('Failed to load games', 'error');
                    return;
                }

                const games = result.games || [];
                if (games.length === 0) {
                    this.showToast('No games found. Run a scan first.', 'info');
                    return;
                }

                // Remove existing games
                this.allAlbums = this.allAlbums.filter(item => item.type !== 'game');
                this.filteredAlbums = this.filteredAlbums.filter(item => item.type !== 'game');

                // Convert games
                const platformColors = {
                    'steam': 0x1B2838,
                    'epic': 0x313131,
                    'xbox': 0x107C10
                };

                const convertedGames = games.map(game => {
                    // Safe date parsing
                    let year = '-';
                    if (game.release_date) {
                        const date = new Date(game.release_date);
                        if (!isNaN(date.getTime())) {
                            year = date.getFullYear().toString();
                        }
                    }

                    return {
                        type: 'game',
                        title: game.title,
                        platform: game.platform,
                        developer: game.developer || 'Unknown',
                        publisher: game.publisher || 'Unknown',
                        year: year,
                        genre: Array.isArray(game.genres) ? game.genres.join(', ') : game.genres || '-',
                        description: game.description || game.short_description || game.long_description || 'No description available.',
                        color: platformColors[game.platform] || 0x808080,
                        // Use header (horizontal) art for coverflow, fallback to boxart
                        image: this.getImageSrc(game.header_path || game.boxart_path || game.icon_path),
                        // Store all image paths for fallback chain
                        icon_path: game.icon_path,
                        boxart_path: game.boxart_path,
                        exe_icon_path: game.exe_icon_path,
                        header_path: game.header_path,
                        launchCommand: game.launch_command,
                        installDir: game.install_directory,
                        appId: game.app_id || game.package_name,
                        id: game.id // Store database ID for favorites, etc.
                    };
                });

                // Merge
                this.allAlbums = [...this.allAlbums, ...convertedGames];
                this.filteredAlbums = [...this.allAlbums];
                document.getElementById('total-albums').textContent = this.filteredAlbums.length;

                // Recreate UI
                this.createCovers();
                this.createThumbnails();
                this.updateInfo();

                this.showToast(`Loaded ${convertedGames.length} games!`, 'success');
            } catch (error) {
                console.error('Reload games error:', error);
                this.showToast('Failed to load games', 'error');
            }
            return;
        }

        // Browser mode - existing code
        if (!this.serverAvailable) {
            this.showToast('Server not available', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.serverURL}/api/games`);
            if (response.ok) {
                const data = await response.json();
                const games = data.games || [];

                if (games.length === 0) {
                    this.showToast('No games found. Run a scan first.', 'info');
                    return;
                }

                // Remove existing games from the list
                this.allAlbums = this.allAlbums.filter(item => item.type !== 'game');
                this.filteredAlbums = this.filteredAlbums.filter(item => item.type !== 'game');

                // Convert and add games
                const platformColors = {
                    'steam': 0x1B2838,
                    'epic': 0x313131,
                    'xbox': 0x107C10
                };

                const convertedGames = games.map(game => {
                    // Safe date parsing
                    let year = '-';
                    if (game.release_date) {
                        const date = new Date(game.release_date);
                        if (!isNaN(date.getTime())) {
                            year = date.getFullYear().toString();
                        }
                    }

                    return {
                        type: 'game',
                        id: game.id,  // Include ID for favorites/tracking
                        title: game.title,
                        platform: game.platform,
                        developer: game.developer || 'Unknown',
                        publisher: game.publisher || 'Unknown',
                        year: year,
                        genre: Array.isArray(game.genres) ? game.genres.join(', ') : game.genres || '-',
                        description: game.description || game.short_description || game.long_description || 'No description available.',
                        color: platformColors[game.platform] || 0x808080,
                        image: this.getImageSrc(game.boxart_path || game.icon_path),
                        icon_path: game.icon_path,  // Include icon path for thumbnails
                        boxart_path: game.boxart_path,  // Include boxart path
                        launch_command: game.launch_command,
                        launchCommand: game.launch_command,  // Keep both for compatibility
                        installDir: game.install_directory,
                        appId: game.app_id || game.package_name,
                        is_favorite: Boolean(game.is_favorite),  // Explicitly convert to boolean
                        is_hidden: Boolean(game.is_hidden),  // Explicitly convert to boolean
                        total_play_time: game.total_play_time || 0,
                        launch_count: game.launch_count || 0,
                        last_played: game.last_played,
                        user_rating: game.user_rating || 0
                    };
                });

                // Merge with existing albums/images
                this.allAlbums = [...this.allAlbums, ...convertedGames];
                this.filteredAlbums = [...this.allAlbums];
                document.getElementById('total-albums').textContent = this.filteredAlbums.length;

                // Recreate UI
                this.createCovers();
                this.createThumbnails();
                this.updateInfo();

                this.showToast(`Loaded ${convertedGames.length} games from server!`, 'success');
            } else {
                this.showToast('Failed to load games from server', 'error');
            }
        } catch (error) {
            console.error('Reload games error:', error);
            this.showToast('Failed to connect to server', 'error');
        }
    }

    // Initialize controller cursor
    initControllerCursor() {
        this.controllerCursor = document.getElementById('controller-cursor');

        // Update cursor position when gamepad is active
        document.addEventListener('mousemove', (e) => {
            if (this.gamepadIndex === -1) {
                this.cursorX = e.clientX;
                this.cursorY = e.clientY;
            }
        });
    }

    // Update controller cursor position
    updateControllerCursor() {
        if (!this.controllerCursor || this.gamepadIndex === -1) {
            if (this.controllerCursor) {
                this.controllerCursor.style.display = 'none';
            }
            return;
        }

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gamepad = gamepads[this.gamepadIndex];

        if (!gamepad || gamepad.connected === false) return;

        // Show cursor when controller is active
        this.controllerCursor.style.display = 'block';

        // Use right stick for cursor movement (axes 2 and 3)
        const axisX = gamepad.axes[2] || 0;
        const axisY = gamepad.axes[3] || 0;

        const deadzone = 0.15;
        const speed = 8;

        if (Math.abs(axisX) > deadzone || Math.abs(axisY) > deadzone) {
            this.cursorX += axisX * speed;
            this.cursorY += axisY * speed;

            // Keep cursor in bounds
            this.cursorX = Math.max(0, Math.min(window.innerWidth, this.cursorX));
            this.cursorY = Math.max(0, Math.min(window.innerHeight, this.cursorY));
        }

        // Update cursor DOM position
        this.controllerCursor.style.left = (this.cursorX - 20) + 'px';
        this.controllerCursor.style.top = (this.cursorY - 20) + 'px';

        // Highlight element under cursor
        this.highlightElementUnderCursor();
    }

    highlightElementUnderCursor() {
        // Remove previous highlight
        const previousHighlight = document.querySelector('.controller-highlight');
        if (previousHighlight) {
            previousHighlight.classList.remove('controller-highlight');
        }

        // Find element under cursor
        const element = document.elementFromPoint(this.cursorX, this.cursorY);
        if (!element) return;

        // Find clickable element (button, link, or clickable parent)
        let clickable = element;
        while (clickable && clickable !== document.body) {
            const tag = clickable.tagName.toLowerCase();
            if (tag === 'button' || tag === 'a' || clickable.onclick || clickable.classList.contains('clickable')) {
                clickable.classList.add('controller-highlight');
                return;
            }
            clickable = clickable.parentElement;
        }
    }

    clickElementUnderCursor() {
        const element = document.elementFromPoint(this.cursorX, this.cursorY);
        if (!element) return;

        // Find clickable element
        let clickable = element;
        while (clickable && clickable !== document.body) {
            const tag = clickable.tagName.toLowerCase();
            if (tag === 'button' || tag === 'a' || clickable.onclick) {
                clickable.click();
                console.log('🎮 Controller clicked:', clickable);

                // Visual feedback
                clickable.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    clickable.style.transform = '';
                }, 100);

                return;
            }
            clickable = clickable.parentElement;
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
        const item = this.filteredAlbums[this.currentIndex];

        // Handle empty library
        if (!item) {
            document.getElementById('album-title').textContent = 'No Items';
            document.getElementById('album-artist').textContent = 'Library is empty';
            document.getElementById('album-year').textContent = '';
            document.getElementById('album-genre').textContent = '';
            document.getElementById('current-position').textContent = '0';
            return;
        }

        const isImage = item.type === 'image';
        const isGame = item.type === 'game';

        document.getElementById('album-title').textContent = item.title;

        if (isImage) {
            // For images, show category instead of artist
            document.getElementById('album-artist').textContent = item.category || 'Image';
            document.getElementById('album-year').textContent = item.year || '-';
            document.getElementById('album-genre').textContent = item.tags || '-';
        } else if (isGame) {
            // For games, show developer
            document.getElementById('album-artist').textContent = item.developer || 'Unknown';
            document.getElementById('album-year').textContent = item.year || '-';
            document.getElementById('album-genre').textContent = item.genre || '-';

            // Show play button for games
            const playBtn = document.getElementById('play-btn');
            if (playBtn) {
                playBtn.style.display = 'block';
                playBtn.onclick = () => {
                    if (window.electronAPI && item.id && item.launch_command) {
                        window.electronAPI.launchGame(item.launch_command, item.id);
                    }
                };
            }
        } else {
            // For albums, show artist and genre
            document.getElementById('album-artist').textContent = item.artist || 'Unknown';
            document.getElementById('album-year').textContent = item.year || '-';
            document.getElementById('album-genre').textContent = item.genre || '-';

            // Hide play button for albums/images
            const playBtn = document.getElementById('play-btn');
            if (playBtn) playBtn.style.display = 'none';
        }

        // Update favorite button for games
        const favoriteBtn = document.getElementById('favorite-btn');
        if (favoriteBtn && isGame) {
            favoriteBtn.textContent = item.is_favorite ? '★' : '☆';
            favoriteBtn.classList.toggle('active', item.is_favorite);
            favoriteBtn.onclick = async () => {
                if (window.electronAPI && item.id) {
                    await window.electronAPI.toggleFavorite(item.id);
                    // Refresh games to get updated state
                    await this.loadGames();
                }
            };
        }

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

            // For games, prioritize exe icon for thumbnails
            if (album.type === 'game' && (album.exe_icon_path || album.icon_path)) {
                console.log(`[THUMBNAIL] Loading thumbnail for "${album.title}"`);
                console.log(`[THUMBNAIL]   exe_icon_path: ${album.exe_icon_path || 'null'}`);
                console.log(`[THUMBNAIL]   icon_path: ${album.icon_path || 'null'}`);
                console.log(`[THUMBNAIL]   boxart_path: ${album.boxart_path || 'null'}`);

                const img = new Image();
                img.crossOrigin = 'anonymous';

                // Draw colored background first as fallback
                const thumbColor = typeof album.color === 'number' && !isNaN(album.color)
                    ? '#' + album.color.toString(16).padStart(6, '0')
                    : '#808080';
                ctx.fillStyle = thumbColor;
                ctx.fillRect(0, 0, 60, 60);

                let primaryPath = album.exe_icon_path || album.icon_path;
                let fallbackPath = album.exe_icon_path ? album.icon_path : null;

                const primarySrc = this.getImageSrc(primaryPath, 'placeholder.png');
                console.log(`[THUMBNAIL]   Primary source: ${primarySrc}`);

                img.onload = () => {
                    console.log(`[THUMBNAIL] ✓ Successfully loaded thumbnail for "${album.title}"`);
                    // Clear and draw the icon
                    ctx.clearRect(0, 0, 60, 60);
                    ctx.drawImage(img, 0, 0, 60, 60);
                };

                img.onerror = (error) => {
                    console.warn(`[THUMBNAIL] ✗ Failed to load primary thumbnail for "${album.title}":`, error);
                    // Try fallback path if available
                    if (fallbackPath) {
                        const fallbackSrc = this.getImageSrc(fallbackPath, 'placeholder.png');
                        console.log(`[THUMBNAIL]   Trying fallback: ${fallbackSrc}`);

                        const fallbackImg = new Image();
                        fallbackImg.crossOrigin = 'anonymous';
                        fallbackImg.onload = () => {
                            console.log(`[THUMBNAIL] ✓ Loaded fallback thumbnail for "${album.title}"`);
                            ctx.clearRect(0, 0, 60, 60);
                            ctx.drawImage(fallbackImg, 0, 0, 60, 60);
                        };
                        fallbackImg.onerror = (fallbackError) => {
                            console.warn(`[THUMBNAIL] ✗ Fallback also failed for "${album.title}":`, fallbackError);
                            // Keep the colored background if all images fail
                            const gradient = ctx.createLinearGradient(0, 0, 60, 60);
                            gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
                            gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
                            ctx.fillStyle = gradient;
                            ctx.fillRect(0, 0, 60, 60);
                        };
                        fallbackImg.src = fallbackSrc;
                    } else {
                        console.warn(`[THUMBNAIL] No fallback available for "${album.title}"`);
                        // Keep the colored background if image fails to load
                        const gradient = ctx.createLinearGradient(0, 0, 60, 60);
                        gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
                        gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
                        ctx.fillStyle = gradient;
                        ctx.fillRect(0, 0, 60, 60);
                    }
                };

                // Load from appropriate source based on environment
                img.src = primarySrc;
            } else if (album.type === 'image' && album.image) {
                // For images, try to load the actual image as thumbnail
                const img = new Image();
                img.crossOrigin = 'anonymous';

                // Draw colored background first as fallback
                ctx.fillStyle = '#4682B4';
                ctx.fillRect(0, 0, 60, 60);

                img.onload = () => {
                    ctx.clearRect(0, 0, 60, 60);
                    ctx.drawImage(img, 0, 0, 60, 60);
                };

                img.onerror = () => {
                    const gradient = ctx.createLinearGradient(0, 0, 60, 60);
                    gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
                    gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, 60, 60);
                };

                img.src = this.getImageSrc(album.image, 'placeholder.png');
            } else if (album.type === 'video') {
                // Video thumbnail with play icon
                const gradient = ctx.createLinearGradient(0, 0, 0, 60);
                gradient.addColorStop(0, '#8B4789');
                gradient.addColorStop(1, '#5A2D58');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 60, 60);

                // Small play icon
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.moveTo(20, 18);
                ctx.lineTo(20, 42);
                ctx.lineTo(40, 30);
                ctx.closePath();
                ctx.fill();
            } else if (album.type === 'music' || album.audio) {
                // Music thumbnail with note icon
                const gradient = ctx.createLinearGradient(0, 0, 0, 60);
                gradient.addColorStop(0, '#FF6347');
                gradient.addColorStop(1, '#DC143C');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 60, 60);

                // Small music note
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.fillRect(35, 20, 3, 20);
                ctx.ellipse(33, 40, 4, 3, -0.3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // For other types, use colored box
                const thumbColor = typeof album.color === 'number' && !isNaN(album.color)
                    ? '#' + album.color.toString(16).padStart(6, '0')
                    : '#808080';
                ctx.fillStyle = thumbColor;
                ctx.fillRect(0, 0, 60, 60);

                const gradient = ctx.createLinearGradient(0, 0, 60, 60);
                gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
                gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 60, 60);
            }

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

    handleSearch() {
        const searchInput = document.getElementById('search-input');
        this.filterAlbums(searchInput.value);
    }

    filterAlbums(query) {
        const lowerQuery = query.toLowerCase().trim();

        if (!lowerQuery) {
            this.filteredAlbums = [...this.allAlbums];
        } else {
            this.filteredAlbums = this.allAlbums.filter(item => {
                // Search in title (common to all)
                if (item.title.toLowerCase().includes(lowerQuery)) return true;

                // For albums, search in artist and genre
                if (item.type === 'album' || !item.type) {
                    if (item.artist && item.artist.toLowerCase().includes(lowerQuery)) return true;
                    if (item.genre && item.genre.toLowerCase().includes(lowerQuery)) return true;
                }

                // For images, search in category and tags
                if (item.type === 'image') {
                    if (item.category && item.category.toLowerCase().includes(lowerQuery)) return true;
                    if (item.tags && item.tags.toLowerCase().includes(lowerQuery)) return true;
                }

                // For games, search in platform, developer, publisher, description, and genres
                if (item.type === 'game') {
                    if (item.platform && item.platform.toLowerCase().includes(lowerQuery)) return true;
                    if (item.developer && item.developer.toLowerCase().includes(lowerQuery)) return true;
                    if (item.publisher && item.publisher.toLowerCase().includes(lowerQuery)) return true;
                    if (item.description && item.description.toLowerCase().includes(lowerQuery)) return true;
                    if (item.short_description && item.short_description.toLowerCase().includes(lowerQuery)) return true;
                    if (item.genres) {
                        // genres might be an array or a string
                        const genresStr = Array.isArray(item.genres) ? item.genres.join(' ') : item.genres;
                        if (genresStr.toLowerCase().includes(lowerQuery)) return true;
                    }
                }

                return false;
            });
        }

        this.clearScene();
        this.currentIndex = 0;
        this.targetIndex = 0;
        this.createCovers();
        this.createThumbnails();
        this.updateInfo();
        document.getElementById('total-albums').textContent = this.filteredAlbums.length;
    }

    // Apply advanced filters from filter panel (platform, genre, favorites, etc.)
    applyAdvancedFilters(filteredGames) {
        // Convert filtered games to album format
        const platformColors = {
            'steam': 0x1B2838,
            'epic': 0x313131,
            'xbox': 0x107C10
        };

        const gameAlbums = filteredGames.map(game => {
            const year = game.release_date ? game.release_date.split('-')[0] : 'Unknown';
            return {
                type: 'game',
                id: game.id,
                title: game.title,
                platform: game.platform,
                developer: game.developer || 'Unknown',
                publisher: game.publisher || 'Unknown',
                year: year,
                genre: Array.isArray(game.genres) ? game.genres.join(', ') : game.genres || '-',
                description: game.description || game.short_description || game.long_description || 'No description available.',
                color: platformColors[game.platform] || 0x808080,
                // Use header (horizontal) art for coverflow, fallback to boxart
                image: this.getImageSrc(game.header_path || game.boxart_path || game.icon_path),
                // For thumbnails, use exe icon extracted from game executable
                icon_path: game.exe_icon_path || game.icon_path || game.boxart_path,
                boxart_path: game.boxart_path,
                header_path: game.header_path,
                launch_command: game.launch_command,
                launchCommand: game.launch_command,
                installDir: game.install_directory,
                appId: game.app_id || game.package_name,
                is_favorite: Boolean(game.is_favorite),
                is_hidden: Boolean(game.is_hidden),
                total_play_time: game.total_play_time || 0,
                launch_count: game.launch_count || 0,
                last_played: game.last_played,
                user_rating: game.user_rating || 0
            };
        });

        // Replace games in allAlbums with filtered games, keep non-game items
        const nonGameAlbums = this.allAlbums.filter(item => item.type !== 'game');
        this.allAlbums = [...nonGameAlbums, ...gameAlbums];
        this.filteredAlbums = [...this.allAlbums];

        // Refresh the UI
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

    updateBackgroundColor(color) {
        this.settings.backgroundColor = color;

        if (this.scene) {
            this.scene.background = new THREE.Color(color);
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
                case 'i':
                case 'I':
                    this.showInfoModal();
                    break;
                case 'f':
                case 'F':
                    this.toggleFullscreen();
                    break;
                case '?':
                    this.openModal('shortcuts-modal');
                    break;
                case 'Enter':
                    // Launch current game with Enter key
                    e.preventDefault();
                    const currentItem = this.filteredAlbums[this.currentIndex];
                    if (currentItem && currentItem.type === 'game' && currentItem.launch_command) {
                        this.launchGame(currentItem);
                    }
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

        // Mouse wheel with variable speed
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();

            // Calculate scroll amount based on deltaY and speed setting
            const scrollAmount = Math.abs(e.deltaY) * this.settings.scrollSpeed * 0.01;
            const direction = e.deltaY > 0 ? 1 : -1;
            const steps = Math.max(1, Math.floor(scrollAmount));

            // Navigate multiple steps for faster scrolling
            this.navigate(direction * steps);
        }, { passive: false });

        // Mouse click on covers
        this.container.addEventListener('click', (e) => {
            const rect = this.container.getBoundingClientRect();
            const mouse = new THREE.Vector2();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);

            const intersects = raycaster.intersectObjects(this.covers);
            if (intersects.length > 0) {
                const clickedCover = intersects[0].object;
                if (clickedCover.userData.isCover) {
                    // If clicking the current center cover, show info modal
                    if (clickedCover.userData.index === this.currentIndex) {
                        this.showInfoModal();
                    } else {
                        // Otherwise navigate to that cover
                        this.navigateTo(clickedCover.userData.index);
                    }
                }
            }
        });

        // Double-click to launch game
        this.container.addEventListener('dblclick', (e) => {
            const rect = this.container.getBoundingClientRect();
            const mouse = new THREE.Vector2();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);

            const intersects = raycaster.intersectObjects(this.covers);
            if (intersects.length > 0) {
                const clickedCover = intersects[0].object;
                if (clickedCover.userData.isCover && clickedCover.userData.index === this.currentIndex) {
                    // Double-click on current cover
                    const item = this.filteredAlbums[this.currentIndex];
                    if (item && item.type === 'game') {
                        this.launchGame(item);
                    }
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
        const backgroundColorPicker = document.getElementById('background-color');

        speedSlider.value = this.settings.animationSpeed * 100;
        spacingSlider.value = this.settings.coverSpacing * 10;
        angleSlider.value = (this.settings.sideAngle * 180 / Math.PI);
        reflectionToggle.checked = this.settings.showReflections;
        autoRotateToggle.checked = this.settings.autoRotate;
        backgroundColorPicker.value = this.settings.backgroundColor;

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

        backgroundColorPicker.addEventListener('input', (e) => {
            this.updateBackgroundColor(e.target.value);
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

        // Scroll speed setting
        const scrollSpeedSlider = document.getElementById('scroll-speed');
        scrollSpeedSlider.value = this.settings.scrollSpeed;
        document.getElementById('scroll-speed-value').textContent = `${this.settings.scrollSpeed.toFixed(1)}x`;

        scrollSpeedSlider.addEventListener('input', (e) => {
            this.settings.scrollSpeed = parseFloat(e.target.value);
            document.getElementById('scroll-speed-value').textContent = `${e.target.value}x`;
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

        // Error logging toggle
        const errorLoggingToggle = document.getElementById('error-logging-toggle');
        errorLoggingToggle.checked = this.settings.errorLogging;

        errorLoggingToggle.addEventListener('change', (e) => {
            this.settings.errorLogging = e.target.checked;
            this.saveSettings();

            // Show/hide log buttons
            const logGroup = document.getElementById('view-error-log-group');
            if (logGroup) {
                logGroup.style.display = e.target.checked ? 'block' : 'none';
            }

            if (e.target.checked) {
                this.setupErrorLogging();
                this.showToast('Error logging enabled - errors will be saved to file', 'info');
            } else {
                this.showToast('Error logging disabled', 'info');
            }
        });

        // Initialize log buttons visibility
        const logGroup = document.getElementById('view-error-log-group');
        if (logGroup) {
            logGroup.style.display = this.settings.errorLogging ? 'block' : 'none';
        }

        // View error log button
        const viewLogBtn = document.getElementById('view-error-log-btn');
        if (viewLogBtn) {
            viewLogBtn.addEventListener('click', () => {
                this.viewErrorLog();
            });
        }

        // Clear error log button
        const clearLogBtn = document.getElementById('clear-error-log-btn');
        if (clearLogBtn) {
            clearLogBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear the error log?')) {
                    this.clearErrorLog();
                }
            });
        }

        // Clear game data button
        const clearGameDataBtn = document.getElementById('clear-game-data-btn');
        if (clearGameDataBtn) {
            clearGameDataBtn.addEventListener('click', async () => {
                if (confirm('⚠️ This will delete all scanned game data!\n\nYou will need to scan for games again.\n\nAre you sure?')) {
                    const result = await window.electronAPI.clearGameData();
                    if (result.success) {
                        alert('✓ Game data cleared successfully!\n\nClick "Scan for Games" to find games again.');
                        // Reload to show empty library
                        await this.loadGames();
                    } else {
                        alert('❌ Failed to clear game data: ' + (result.error || 'Unknown error'));
                    }
                }
            });
        }

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
                showFpsCounter: false,
                errorLogging: false
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

        // Game scanner buttons
        document.getElementById('scan-games-btn').addEventListener('click', () => {
            this.startGameScan();
        });

        document.getElementById('reload-games-btn').addEventListener('click', () => {
            this.reloadGamesFromServer();
        });

        // Reload interface button
        document.getElementById('reload-interface-btn').addEventListener('click', () => {
            location.reload();
        });

        // Media folder button
        const mediaFolderBtn = document.getElementById('add-media-folder-btn');
        if (mediaFolderBtn) {
            mediaFolderBtn.addEventListener('click', () => {
                this.selectAndScanMediaFolder();
            });
        }

        // Check server status on load
        this.checkServerStatus();
    }

    async selectAndScanMediaFolder() {
        if (!this.isElectron) {
            this.showToast('Folder selection is only available in desktop mode', 'warning');
            return;
        }

        try {
            // Open folder picker
            const selectResult = await window.electronAPI.selectMediaFolder();

            if (selectResult.canceled) {
                return;
            }

            if (!selectResult.success) {
                this.showToast('Failed to select folder', 'error');
                return;
            }

            this.showToast('Scanning folder for media...', 'info');

            // Scan the selected folder
            const scanResult = await window.electronAPI.scanMediaFolder(selectResult.folderPath);

            if (!scanResult.success) {
                this.showToast(`Failed to scan folder: ${scanResult.error}`, 'error');
                return;
            }

            if (scanResult.count === 0) {
                this.showToast('No media files found in selected folder', 'warning');
                return;
            }

            // Add media to library
            this.allAlbums = [...this.allAlbums, ...scanResult.media];
            this.filteredAlbums = [...this.allAlbums];
            document.getElementById('total-albums').textContent = this.filteredAlbums.length;

            // Recreate UI
            this.createCovers();
            this.createThumbnails();
            this.updateInfo();

            // Update status
            const folderInfo = document.getElementById('media-folder-info');
            if (folderInfo) {
                folderInfo.textContent = `Added ${scanResult.count} files from ${scanResult.folderPath}`;
                folderInfo.style.color = '#4CAF50';
            }

            this.showToast(`Added ${scanResult.count} media files!`, 'success');
        } catch (error) {
            console.error('Error selecting media folder:', error);
            this.showToast('Failed to add media folder', 'error');
        }
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

        // Update controller cursor
        this.updateControllerCursor();

        // Update cover positions
        this.updateCoverPositions(false);

        // Floating animation for center cover
        const centerCover = this.covers[this.currentIndex];
        if (centerCover && centerCover.parent) {
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
    // Check if Three.js loaded successfully
    if (typeof THREE === 'undefined') {
        document.getElementById('loading-screen').innerHTML = `
            <div style="color: #ff4444; padding: 20px; text-align: center;">
                <h2>❌ Failed to Load Three.js</h2>
                <p>The 3D library (Three.js) failed to load from CDN.</p>
                <p style="margin-top: 20px;"><strong>Possible solutions:</strong></p>
                <ul style="list-style: none; padding: 0; margin-top: 10px;">
                    <li>• Check your internet connection</li>
                    <li>• Check if your firewall/antivirus is blocking CDN requests</li>
                    <li>• Try using a different browser</li>
                    <li>• Open browser console (F12) for more details</li>
                </ul>
            </div>
        `;
        console.error('Three.js failed to load. Check CDN availability.');
        return;
    }

    try {
        new CoverFlow();
    } catch (error) {
        document.getElementById('loading-screen').innerHTML = `
            <div style="color: #ff4444; padding: 20px; text-align: center;">
                <h2>❌ Initialization Error</h2>
                <p>Failed to initialize CoverFlow: ${error.message}</p>
                <p style="margin-top: 20px;">Check browser console (F12) for details.</p>
            </div>
        `;
        console.error('CoverFlow initialization error:', error);
    }
});
