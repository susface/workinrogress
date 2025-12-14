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
        const coverFlowSettings = new CoverFlowSettings();
        const coverFlowTextures = new CoverFlowTextures();
        const coverFlowUIUtils = new CoverFlowUIUtils();
        const coverFlowNavigation = new CoverFlowNavigation();
        const coverFlowUI = new CoverFlowUI();

        // Enhancement modules
        const coverFlowEnhancements = new CoverFlowEnhancements();
        const soundEffects = new SoundEffects();
        const backgroundMusic = new BackgroundMusic();
        const touchGestures = new TouchGestures();
        const platformAnimations = new PlatformAnimations();
        const sessionInsights = new SessionInsights();
        const youtubeIntegration = new YouTubeIntegration();
        const soundtrackPlayer = new SoundtrackPlayer();
        const videoPlayer = new VideoPlayer();
        const vrMode = new VRMode();
        const vrGameFilter = new VRGameFilter();
        const updateNotifications = new UpdateNotifications();
        const portableMode = new PortableMode();
        const modManager = new UnifiedModManager();

        // Store module instances for direct access
        this._modules = {
            sessionInsights,
            modManager,
            youtubeIntegration,
            videoPlayer,
            vrMode,
            vrGameFilter
        };

        // Apply core mixin modules (copies properties and binds methods)
        this.applyModule(coverFlowSettings);
        this.applyModule(coverFlowTextures);
        this.applyModule(coverFlowUIUtils);
        this.applyModule(coverFlowNavigation);
        this.applyModule(coverFlowUI);

        // Copy enhancement module properties
        Object.assign(this, coverFlowEnhancements);
        Object.assign(this, soundEffects);
        Object.assign(this, backgroundMusic);
        Object.assign(this, touchGestures);
        Object.assign(this, platformAnimations);
        Object.assign(this, sessionInsights);
        Object.assign(this, youtubeIntegration);
        Object.assign(this, soundtrackPlayer);
        Object.assign(this, videoPlayer);
        Object.assign(this, vrMode);
        Object.assign(this, vrGameFilter);
        Object.assign(this, updateNotifications);
        Object.assign(this, portableMode);
        Object.assign(this, modManager);

        // Bind module methods for dropdown menu items
        this.toggleInsights = sessionInsights.toggleInsights.bind(sessionInsights);
        this.showModManager = modManager.showModManager.bind(modManager);

        // Bind module initialization methods
        this.initializeSessionInsights = sessionInsights.initializeSessionInsights.bind(sessionInsights);
        this.initializeModManager = modManager.initializeModManager.bind(modManager);
        this.initializeYouTubeAPI = youtubeIntegration.initializeYouTubeAPI.bind(youtubeIntegration);
        this.initializeVideoPlayer = videoPlayer.initializeVideoPlayer.bind(videoPlayer);
        this.initializeSoundtrackPlayer = soundtrackPlayer.initializeSoundtrackPlayer.bind(soundtrackPlayer);

        // Bind soundtrack player methods
        this.loadGameSoundtrack = soundtrackPlayer.loadGameSoundtrack.bind(soundtrackPlayer);
        this.loadYouTubeSoundtrack = soundtrackPlayer.loadYouTubeSoundtrack.bind(soundtrackPlayer);

        // Bind background music methods
        this.initializeBackgroundMusic = backgroundMusic.initializeBackgroundMusic.bind(backgroundMusic);
        this.loadCustomBackgroundMusic = backgroundMusic.loadCustomBackgroundMusic.bind(backgroundMusic);
        this.resetBackgroundMusicToDefault = backgroundMusic.resetBackgroundMusicToDefault.bind(backgroundMusic);
        this.setBackgroundMusicVolume = backgroundMusic.setBackgroundMusicVolume.bind(backgroundMusic);
        this.toggleBackgroundMusic = backgroundMusic.toggleBackgroundMusic.bind(backgroundMusic);
        this.showFileInputDialog = backgroundMusic.showFileInputDialog.bind(backgroundMusic);
        this.setBackgroundMusicFile = backgroundMusic.setBackgroundMusicFile.bind(backgroundMusic);

        // Bind main class methods that are called from module code
        this.loadGames = this.loadGames.bind(this);
        this.reloadGamesFromServer = this.reloadGamesFromServer.bind(this);
        this.launchGame = this.launchGame.bind(this);
        this.openMediaFile = this.openMediaFile.bind(this);
        this.navigateTo = this.navigateTo.bind(this);
        this.navigate = this.navigate.bind(this);
        this.filterAlbums = this.filterAlbums.bind(this);
        this.createCovers = this.createCovers.bind(this);
        this.createThumbnails = this.createThumbnails.bind(this);
        this.clearScene = this.clearScene.bind(this);
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
        this.animationFrameId = null;

        // Event listener storage for cleanup
        this.eventListeners = [];

        // Track base Y position for floating animation
        this.centerCoverBaseY = 0;

        // Track active intervals for cleanup
        this.sessionIntervals = {};

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
        window.logger?.info('COVERFLOW', `Running in ${this.isElectron ? 'Electron' : 'Browser'} mode`);

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
            backgroundColor: '#1a1a2e',
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
            // Visualizer
            visualizerMode: 'bars', // 'bars' or 'trippy'
            // Error logging
            errorLogging: false
        };

        // Error logging system
        this.errorLog = [];

        this.loadSettings();
        this.setupErrorLogging();
        this.detectGPU();
        this.init();
        this.addEventListeners();
        this.initGamepadSupport();
        this.initControllerCursor();
        this.animate();

        // Initialize data asynchronously, then create UI
        this.initAlbumData().then(() => {
            // UI is created by initAlbumData after games load
            // createCovers(), createThumbnails(), updateInfo() are called in reloadGamesFromServer()/loadGamesFromJSON()
            this.hideLoadingScreen();
        }).catch(error => {
            window.logger?.error('COVERFLOW', 'Failed to initialize album data:', error);
            this.hideLoadingScreen();
        });
    }

    /**
     * Apply a module as a mixin, binding methods to this instance.
     * This ensures prototype methods are copied and bound correctly.
     * @param {Object} moduleInstance - The module instance to mix in
     */
    applyModule(moduleInstance) {
        // Copy instance properties
        Object.assign(this, moduleInstance);

        // Copy prototype methods
        let proto = Object.getPrototypeOf(moduleInstance);
        // Traverse prototype chain up to Object.prototype
        while (proto && proto !== Object.prototype) {
            Object.getOwnPropertyNames(proto).forEach(name => {
                if (name !== 'constructor') {
                    const desc = Object.getOwnPropertyDescriptor(proto, name);
                    // Only copy functions
                    if (desc && typeof desc.value === 'function') {
                        // Bind to this instance (the CoverFlow instance)
                        // This allows methods to access CoverFlow state (this.settings, this.covers, etc)
                        this[name] = desc.value.bind(this);
                    }
                }
            });
            proto = Object.getPrototypeOf(proto);
        }
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
            window.logger?.debug('COVERFLOW', 'App paths initialized:', this.appPaths);
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

    applyCustomCovers(games) {
        // Load custom covers from localStorage
        try {
            const savedCovers = localStorage.getItem('custom-cover-art');
            if (!savedCovers) return;

            const customCovers = JSON.parse(savedCovers);
            let appliedCount = 0;

            games.forEach(game => {
                const gameKey = game.id || game.title || game.name;
                if (customCovers[gameKey]) {
                    game.image = customCovers[gameKey];
                    appliedCount++;
                }
            });

            if (appliedCount > 0) {
                console.log(`[COVERFLOW] Applied ${appliedCount} custom cover(s)`);
            }
        } catch (error) {
            console.error('[COVERFLOW] Failed to apply custom covers:', error);
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

        window.logger?.debug('COVERFLOW', 'Error logging enabled');
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
                window.logger?.error('COVERFLOW', 'Failed to write error to file:', err);
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

    async initAlbumData() {
        // Start with empty array - no hardcoded examples
        this.allAlbums = [];
        this.filteredAlbums = [];
        const totalAlbumsEl = document.getElementById('total-albums');
        if (totalAlbumsEl) {
            totalAlbumsEl.textContent = this.filteredAlbums.length;
        }

        // Load games from database (Electron) or JSON file (browser)
        if (this.isElectron) {
            // In Electron mode, load from database which has correct paths
            await this.reloadGamesFromServer();

            // Load saved media folders
            await this.loadSavedMediaFolders();
        } else {
            // In browser mode, load from JSON file
            await this.loadGamesFromJSON();
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
                    appId: game.app_id || game.package_name,
                    has_vr_support: Boolean(game.has_vr_support),
                    id: game.id
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
            window.logger?.error('COVERFLOW', 'Error loading games:', error);
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

        // Initialize Visual Effects Manager
        if (window.VisualEffectsManager) {
            try {
                this.visualEffectsManager = new VisualEffectsManager(
                    this.scene,
                    this.camera,
                    this.renderer,
                    this
                );
                this.visualEffectsManager.init(); // Initialize all effects
                window.visualEffectsManager = this.visualEffectsManager; // Make globally accessible
                console.log('[COVERFLOW] Visual Effects Manager initialized');
            } catch (error) {
                console.error('[COVERFLOW] Failed to initialize Visual Effects Manager:', error);
                // Continue initialization even if visual effects fail
                this.visualEffectsManager = null;
            }
        }

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
        const resizeHandler = () => this.onWindowResize();
        this.addTrackedEventListener(window, 'resize', resizeHandler);

        // Pause rendering when tab is hidden to save resources
        const visibilityHandler = () => {
            if (document.hidden) {
                this.pauseAnimation();
                console.log('[COVERFLOW] Tab hidden - animation paused');
            } else {
                this.resumeAnimation();
                console.log('[COVERFLOW] Tab visible - animation resumed');
            }
        };
        this.addTrackedEventListener(document, 'visibilitychange', visibilityHandler);

        // Add beforeunload listener to clean up resources
        window.addEventListener('beforeunload', () => {
            if (typeof this.destroy === 'function') {
                this.destroy();
            }
        });

        // Initialize enhancement modules
        if (typeof this.initializeSoundEffects === 'function') {
            this.initializeSoundEffects();
        }
        if (typeof this.initializeBackgroundMusic === 'function') {
            this.initializeBackgroundMusic();
        }
        if (typeof this.initializeTouchGestures === 'function') {
            this.initializeTouchGestures();
        }
        if (typeof this.initializePlatformAnimations === 'function') {
            this.initializePlatformAnimations();
        }
        if (typeof this.initializeSessionInsights === 'function') {
            this.initializeSessionInsights();
        }
        if (typeof this.initializeSoundtrackPlayer === 'function') {
            this.initializeSoundtrackPlayer();
        }
        if (typeof this.initializeVideoPlayer === 'function') {
            this.initializeVideoPlayer();
        }
        if (typeof this.initializeVRMode === 'function') {
            this.initializeVRMode().catch(err => {
                window.logger?.error('COVERFLOW', 'Error initializing VR mode:', err);
            });
        }
        if (typeof this.initializeVRGameFilter === 'function') {
            this.initializeVRGameFilter();
        }
        if (typeof this.initializeUpdateNotifications === 'function') {
            this.initializeUpdateNotifications();
        }
        if (typeof this.initializePortableMode === 'function') {
            // Portable mode is async, but we don't need to await it
            // It will update UI when ready
            this.initializePortableMode().catch(err => {
                window.logger?.error('COVERFLOW', 'Error initializing portable mode:', err);
            });
        }
        if (typeof this.initializeModManager === 'function') {
            this.initializeModManager();
        }
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
                            // Dispose old texture if it exists to prevent memory leak
                            if (material.map && material.map !== texture) {
                                material.map.dispose();
                            }
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
                                // Dispose old texture if it exists
                                if (material.map && material.map !== errorTexture) {
                                    material.map.dispose();
                                }
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
                            // Dispose old texture if it exists
                            if (material.map && material.map !== errorTexture) {
                                material.map.dispose();
                            }
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
                this.settings.bloomIntensity * 0.5, // Reduced strength
                0.8,  // Radius - controls bloom spread
                0.95  // Threshold - higher = only bright things glow (0-1), prevents blurriness
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

        // Depth of Field effect (Bokeh)
        if (typeof THREE.BokehPass !== 'undefined') {
            try {
                this.bokehPass = new THREE.BokehPass(
                    this.scene,
                    this.camera,
                    {
                        focus: this.settings.dofFocus,
                        aperture: this.settings.dofAperture,
                        maxblur: 0.01
                    }
                );
                this.bokehPass.enabled = this.settings.depthOfField;
                this.composer.addPass(this.bokehPass);
                console.log('[COVERFLOW] Depth of Field effect initialized');
            } catch (error) {
                console.warn('Depth of Field effect not available:', error.message);
                this.bokehPass = null;
                this.settings.depthOfField = false;
            }
        }
    }

    createCovers() {
        const coverWidth = 2;
        const coverHeight = 2;

        // Create shared geometries and materials once - reused by all covers for memory efficiency
        const sharedGeometry = new THREE.PlaneGeometry(coverWidth, coverHeight);
        const sharedBorderGeometry = new THREE.EdgesGeometry(sharedGeometry);
        const sharedBorderMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 1
        });

        this.filteredAlbums.forEach((album, index) => {
            const coverGroup = new THREE.Group();

            const geometry = sharedGeometry;

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
            } else if (album.type === 'image' && album.image) {
                // For image type, ensure path is properly formatted
                const imageSrc = this.getImageSrc(album.image);

                // Create material with placeholder texture first
                material = new THREE.MeshPhongMaterial({
                    color: 0xffffff, // White color to avoid tinting the texture
                    side: THREE.DoubleSide,
                    shininess: 80
                });

                // Load texture with improved error handling
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
            } else if (album.type === 'game' && album.image) {
                // For games, image is already formatted via getImageSrc during load
                const imageSrc = album.image;

                // Create material with placeholder texture first
                material = new THREE.MeshPhongMaterial({
                    color: 0xffffff, // White color to avoid tinting the texture
                    side: THREE.DoubleSide,
                    shininess: 80
                });

                // Load texture with improved error handling
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

            // Border (using shared geometry and material for efficiency)
            const border = new THREE.LineSegments(sharedBorderGeometry, sharedBorderMaterial);
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

        let isStillAnimating = false;
        const threshold = 0.001; // Distance threshold to consider animation complete

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
                parent.position.set(targetX, targetY, targetZ);
                parent.rotation.y = targetRotY;
                parent.scale.set(targetScale, targetScale, 1);
            } else {
                // Check if position needs updating
                const deltaX = targetX - parent.position.x;
                const deltaY = targetY - parent.position.y;
                const deltaZ = targetZ - parent.position.z;
                const deltaRot = targetRotY - parent.rotation.y;
                const deltaScale = targetScale - parent.scale.x;

                // Only update if deltas are above threshold
                if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold ||
                    Math.abs(deltaZ) > threshold || Math.abs(deltaRot) > threshold ||
                    Math.abs(deltaScale) > threshold) {

                    isStillAnimating = true;

                    parent.position.x += deltaX * speed;
                    parent.position.y += deltaY * speed;
                    parent.position.z += deltaZ * speed;
                    parent.rotation.y += deltaRot * speed;

                    const newScale = parent.scale.x + deltaScale * speed;
                    parent.scale.set(newScale, newScale, 1);
                }
            }

            // Calculate and set opacity (only if changed)
            const targetOpacity = 1 - Math.min(Math.abs(diff) * 0.12, 0.6);
            if (cover.material && Math.abs(cover.material.opacity - targetOpacity) > 0.01) {
                cover.material.opacity = targetOpacity;
                cover.material.transparent = true;
            }

            // Update reflection
            const reflection = parent.children && parent.children[1];
            if (reflection && reflection.userData && reflection.userData.isReflection) {
                reflection.visible = this.settings.showReflections;
                const reflectionOpacity = targetOpacity * 0.3;
                if (reflection.material && Math.abs(reflection.material.opacity - reflectionOpacity) > 0.01) {
                    reflection.material.opacity = reflectionOpacity;
                }
            }
        });

        return isStillAnimating;
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

        try {
            // Update modal title and details based on type
            const titleEl = document.getElementById('info-modal-title');
            if (titleEl) titleEl.textContent = item.title;

            if (isGame) {
                // For games, show platform and developer
                const artistEl = document.getElementById('info-modal-artist');
                const yearEl = document.getElementById('info-modal-year');
                const genreEl = document.getElementById('info-modal-genre');

                if (artistEl) artistEl.textContent = item.developer || 'Unknown';
                if (yearEl) yearEl.textContent = item.year || '-';
                if (genreEl) genreEl.textContent = item.genre || '-';

                // Update labels
                const artistLabel = artistEl?.previousElementSibling;
                const genreLabel = genreEl?.previousElementSibling;
                if (artistLabel) artistLabel.textContent = 'Developer:';
                if (genreLabel) genreLabel.textContent = 'Genre:';
            } else if (isImage) {
                // For images, show category and tags
                const artistEl = document.getElementById('info-modal-artist');
                const yearEl = document.getElementById('info-modal-year');
                const genreEl = document.getElementById('info-modal-genre');

                if (artistEl) artistEl.textContent = item.category || 'Image';
                if (yearEl) yearEl.textContent = item.year || '-';
                if (genreEl) genreEl.textContent = item.tags || '-';

                // Update labels
                const genreLabel = genreEl?.previousElementSibling;
                if (genreLabel) genreLabel.textContent = 'Tags:';
            } else {
                // For albums, show artist and genre
                const artistEl = document.getElementById('info-modal-artist');
                const yearEl = document.getElementById('info-modal-year');
                const genreEl = document.getElementById('info-modal-genre');

                if (artistEl) artistEl.textContent = item.artist;
                if (yearEl) yearEl.textContent = item.year;
                if (genreEl) genreEl.textContent = item.genre;

                // Update labels
                const artistLabel = artistEl?.previousElementSibling;
                const genreLabel = genreEl?.previousElementSibling;
                if (artistLabel) artistLabel.textContent = 'Artist:';
                if (genreLabel) genreLabel.textContent = 'Genre:';
            }

            // Safe color conversion
            const colorHex = typeof item.color === 'number' && !isNaN(item.color)
                ? '#' + item.color.toString(16).padStart(6, '0').toUpperCase()
                : '#808080';
            const colorEl = document.getElementById('info-modal-color');
            const descEl = document.getElementById('info-description-text');
            if (colorEl) colorEl.textContent = colorHex;
            if (descEl) descEl.textContent = item.description || 'No description available.';

            // Handle media (image or video)
            const coverContainer = document.getElementById('info-cover-container');
            const videoContainer = document.getElementById('info-video-container');
            const video = document.getElementById('info-video');

            if (!coverContainer || !videoContainer || !video) {
                console.warn('[COVERFLOW] Info modal elements not found');
                return;
            }

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
        } catch (error) {
            console.error('[COVERFLOW] Error in showInfoModal:', error);
            this.showToast('Error displaying info modal', 'error');
        }
    }

    // Launch a game using its launch command
    launchGame(game) {
        if (!game.launchCommand) {
            this.showToast('No launch command available for this game', 'error');
            return;
        }

        console.log('Launching game:', game.title, 'with command:', game.launchCommand);

        // Append custom launch options if they exist
        let finalLaunchCommand = game.launchCommand;
        if (game.custom_launch_options && game.custom_launch_options.trim()) {
            // For Steam URLs, append options after the app ID
            if (finalLaunchCommand.startsWith('steam://')) {
                finalLaunchCommand += `//${game.custom_launch_options}`;
            } else {
                finalLaunchCommand += ` ${game.custom_launch_options}`;
            }
            console.log('Using custom launch options:', game.custom_launch_options);
        }

        // Play launch animations and sound effects
        if (typeof this.playPlatformLaunchAnimation === 'function') {
            this.playPlatformLaunchAnimation(game, this.targetIndex);
        }
        if (typeof this.playLaunchSound === 'function') {
            this.playLaunchSound();
        }

        // Record activity in gaming heatmap (estimate initial session time)
        if (window.gamingHeatmapManager && game.id) {
            // Record an initial 1 minute immediately to show activity
            window.gamingHeatmapManager.recordActivity(game.id, 1, false);
            console.log('[HEATMAP] Recorded game launch activity for:', game.title);
            console.log('[HEATMAP] Game ID:', game.id);
            console.log('[HEATMAP] Current activity data:', window.gamingHeatmapManager.activityData);
        } else {
            console.warn('[HEATMAP] Could not record activity - manager:', !!window.gamingHeatmapManager, 'gameId:', game.id);
        }

        if (this.isElectron) {
            // Use Electron shell API
            window.electronAPI.launchGame(finalLaunchCommand, game.id).then(result => {
                if (result.success) {
                    this.showToast(`Launching ${game.title}...`, 'success');
                    // Delay session tracking to account for anti-cheat loaders
                    // Default 30 second delay to allow anti-cheat/launcher processes to start first
                    const sessionDelay = game.sessionTrackingDelay || 30000; // milliseconds
                    console.log(`[SESSION] Will start tracking for ${game.title} in ${sessionDelay/1000} seconds`);

                    // Store timeout ID so it can be cleared if needed
                    const timeoutId = setTimeout(() => {
                        this.trackGameSession(game);
                        // Clear timeout ID after execution
                        if (this.sessionTrackingTimeouts) {
                            delete this.sessionTrackingTimeouts[game.id];
                        }
                    }, sessionDelay);

                    // Track timeout IDs for cleanup
                    if (!this.sessionTrackingTimeouts) {
                        this.sessionTrackingTimeouts = {};
                    }
                    this.sessionTrackingTimeouts[game.id] = timeoutId;
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
                // Delay session tracking for browser mode too
                const sessionDelay = game.sessionTrackingDelay || 30000; // milliseconds
                console.log(`[SESSION] Will start tracking for ${game.title} in ${sessionDelay/1000} seconds`);

                // Store timeout ID so it can be cleared if needed
                const timeoutId = setTimeout(() => {
                    this.trackGameSession(game);
                    // Clear timeout ID after execution
                    if (this.sessionTrackingTimeouts) {
                        delete this.sessionTrackingTimeouts[game.id];
                    }
                }, sessionDelay);

                // Track timeout IDs for cleanup
                if (!this.sessionTrackingTimeouts) {
                    this.sessionTrackingTimeouts = {};
                }
                this.sessionTrackingTimeouts[game.id] = timeoutId;
            } else {
                this.showToast('Game launching is platform-specific. Please use your game launcher.', 'info');
                console.log('Platform:', game.platform);
                console.log('Launch command:', game.launchCommand);
            }
        }
    }

    // Open media file - uses built-in player for videos
    openMediaFile(item) {
        let filePath = null;

        // Get the file path based on media type
        if (item.type === 'image' && item.image) {
            filePath = item.image;
        } else if (item.type === 'video' && item.video) {
            filePath = item.video;
        } else if (item.type === 'music' && item.audio) {
            filePath = item.audio;
        }

        if (!filePath) {
            this.showToast('No file path available', 'error');
            return;
        }

        console.log('Opening media file:', item.title, 'at path:', filePath);

        // Use built-in video player for videos
        if (item.type === 'video' && this._modules && this._modules.videoPlayer) {
            this._modules.videoPlayer.playLocalVideo(filePath, item.title);
            this.showToast(`Playing ${item.title}`, 'success');
            return;
        }

        // For images and audio, use system default app
        if (this.isElectron) {
            // Use Electron shell API to open in default app
            window.electronAPI.openMediaFile(filePath).then(result => {
                if (result && result.success) {
                    this.showToast(`Opening ${item.title}...`, 'success');
                } else {
                    this.showToast('Failed to open file', 'error');
                }
            }).catch(error => {
                console.error('Error opening media file:', error);
                this.showToast('Error opening file', 'error');
            });
        } else {
            // Browser mode - try to open file URL
            if (filePath.startsWith('http')) {
                window.open(filePath, '_blank');
                this.showToast(`Opening ${item.title}...`, 'success');
            } else {
                this.showToast('File opening is only available in desktop mode', 'info');
            }
        }
    }

    /**
     * Track game session for heatmap integration
     */
    trackGameSession(game) {
        if (!game || !game.id) return;

        // Store session start time
        const sessionKey = `game-session-${game.id}`;
        const sessionData = {
            gameId: game.id,
            gameTitle: game.title,
            startTime: Date.now()
        };

        sessionStorage.setItem(sessionKey, JSON.stringify(sessionData));
        console.log('[SESSION] Started tracking session for:', game.title);

        // Set up periodic updates every 5 minutes to keep heatmap current
        const updateInterval = setInterval(() => {
            const savedSession = sessionStorage.getItem(sessionKey);
            if (!savedSession) {
                if (this.sessionIntervals[game.id]) {
                    clearInterval(this.sessionIntervals[game.id]);
                    delete this.sessionIntervals[game.id];
                }
                return;
            }

            const session = JSON.parse(savedSession);
            const elapsedMinutes = Math.floor((Date.now() - session.startTime) / 60000);

            if (elapsedMinutes > 0 && window.gamingHeatmapManager) {
                // Update heatmap with elapsed time (replace mode to avoid duplicates)
                window.gamingHeatmapManager.recordActivity(session.gameId, elapsedMinutes, true);
                console.log(`[SESSION] Updated heatmap: ${elapsedMinutes} minutes for ${game.title}`);
            }
        }, 5 * 60 * 1000); // Every 5 minutes

        // Store interval ID in memory for proper cleanup
        this.sessionIntervals[game.id] = updateInterval;
        console.log('[SESSION] Registered interval for game:', game.id);

        // Clean up on page unload
        const cleanupHandler = () => {
            this.endGameSessionTracking(game.id);
        };

        const visibilityCleanupHandler = () => {
            if (document.hidden) {
                cleanupHandler();
            }
        };

        this.addTrackedEventListener(window, 'beforeunload', cleanupHandler);
        this.addTrackedEventListener(document, 'visibilitychange', visibilityCleanupHandler);
    }

    /**
     * End game session tracking and finalize heatmap data
     */
    endGameSessionTracking(gameId) {
        const sessionKey = `game-session-${gameId}`;
        const savedSession = sessionStorage.getItem(sessionKey);

        // Clear any pending session tracking timeout
        if (this.sessionTrackingTimeouts && this.sessionTrackingTimeouts[gameId]) {
            clearTimeout(this.sessionTrackingTimeouts[gameId]);
            delete this.sessionTrackingTimeouts[gameId];
            console.log('[SESSION] Cleared pending session tracking timeout for game:', gameId);
        }

        if (!savedSession) return;

        try {
            const session = JSON.parse(savedSession);
            const elapsedMinutes = Math.floor((Date.now() - session.startTime) / 60000);

            // Record final playtime in heatmap
            if (elapsedMinutes > 0 && window.gamingHeatmapManager) {
                window.gamingHeatmapManager.recordActivity(gameId, elapsedMinutes, true);
                console.log(`[SESSION] Finalized heatmap: ${elapsedMinutes} minutes for ${session.gameTitle}`);
            }

            // Clean up interval
            if (this.sessionIntervals[gameId]) {
                clearInterval(this.sessionIntervals[gameId]);
                delete this.sessionIntervals[gameId];
                console.log('[SESSION] Cleared interval for game:', gameId);
            }
            sessionStorage.removeItem(sessionKey);

            console.log('[SESSION] Ended tracking for:', session.gameTitle);
        } catch (error) {
            console.error('[SESSION] Error ending session tracking:', error);
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
                window.logger?.error('COVERFLOW', 'Error getting games count:', error);
                const gameCountEl = document.getElementById('game-count-info');
                if (gameCountEl) {
                    gameCountEl.innerHTML =
                        `<span style="color: #f44336;">✗ Error loading game count</span>`;
                }
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
        // Show the enhanced scanning overlay
        const overlay = document.getElementById('scanning-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }

        if (this.isElectron) {
            // Electron mode - use IPC
            const result = await window.electronAPI.startScan();
            if (result.success) {
                this.showToast('Game scan started...', 'info');
                document.getElementById('scan-progress-group').style.display = 'block';
                document.getElementById('scan-games-btn').disabled = true;
            } else {
                this.showToast(result.error || 'Failed to start scan', 'error');
                // Hide overlay if failed immediately
                if (overlay) overlay.classList.add('hidden');
            }
            return;
        }

        // Browser mode - existing code
        if (!this.serverAvailable) {
            this.showToast('Game scanner server is not running. Please start the server first.', 'error');
            if (overlay) overlay.classList.add('hidden');
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
                if (overlay) overlay.classList.add('hidden');
            }
        } catch (error) {
            console.error('Scan start error:', error);
            this.showToast('Failed to start game scan', 'error');
            if (overlay) overlay.classList.add('hidden');
        }
    }

    // Poll scan status
    async pollScanStatus() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
        }

        const overlay = document.getElementById('scanning-overlay');
        const overlayText = overlay ? overlay.querySelector('h2') : null;
        const overlayProgress = document.getElementById('scan-progress-bar-overlay');

        this.scanInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.serverURL}/api/scan/status`);
                if (response.ok) {
                    const status = await response.json();

                    // Update UI
                    const statusText = document.getElementById('scan-status-text');
                    const progressBar = document.getElementById('scan-progress-bar');

                    if (statusText) statusText.textContent = status.message;
                    if (progressBar) progressBar.style.width = status.progress + '%';

                    // Update overlay text
                    if (overlayText) overlayText.textContent = status.message || 'Scanning...';
                    if (overlayProgress) overlayProgress.textContent = `${Math.round(status.progress)}%`;

                    // Check if scan is complete
                    if (!status.scanning) {
                        clearInterval(this.scanInterval);
                        this.scanInterval = null;

                        // Hide progress UI after 2 seconds
                        setTimeout(() => {
                            document.getElementById('scan-progress-group').style.display = 'none';
                            document.getElementById('scan-games-btn').disabled = false;
                            if (overlay) overlay.classList.add('hidden');
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
                if (overlay) overlay.classList.add('hidden');
            }
        }, 1000); // Poll every second
    }

    // Handle scan progress updates from Electron
    updateScanProgress(status) {
        if (!this.isElectron) return;

        const statusText = document.getElementById('scan-status-text');
        const progressBar = document.getElementById('scan-progress-bar');

        const overlay = document.getElementById('scanning-overlay');
        const overlayText = overlay ? overlay.querySelector('h2') : null;
        const overlayProgress = document.getElementById('scan-progress-bar-overlay');

        if (statusText) statusText.textContent = status.message;
        if (progressBar) progressBar.style.width = status.progress + '%';

        // Update overlay
        if (overlayText) overlayText.textContent = status.message || 'Scanning...';
        if (overlayProgress) overlayProgress.textContent = `${Math.round(status.progress)}%`;
    }

    // Handle scan completion from Electron
    async handleScanComplete(status) {
        if (!this.isElectron) return;

        const overlay = document.getElementById('scanning-overlay');

        setTimeout(() => {
            document.getElementById('scan-progress-group').style.display = 'none';
            document.getElementById('scan-games-btn').disabled = false;
            if (overlay) overlay.classList.add('hidden');
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

                // Always remove existing games first
                this.allAlbums = this.allAlbums.filter(item => item.type !== 'game');
                this.filteredAlbums = this.filteredAlbums.filter(item => item.type !== 'game');

                if (games.length === 0) {
                    // Still need to update UI when games are cleared
                    document.getElementById('total-albums').textContent = this.filteredAlbums.length;
                    this.clearScene();
                    this.currentIndex = Math.min(this.currentIndex, Math.max(0, this.filteredAlbums.length - 1));
                    this.targetIndex = this.currentIndex;
                    this.createCovers();
                    this.createThumbnails();
                    this.updateInfo();
                    this.showToast('No games found. Run a scan first.', 'info');
                    return;
                }

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
                        id: game.id, // Store database ID for favorites, etc.
                        is_favorite: Boolean(game.is_favorite),
                        is_hidden: Boolean(game.is_hidden),
                        has_vr_support: Boolean(game.has_vr_support),
                        has_workshop_support: Boolean(game.has_workshop_support),
                        workshop_id: game.workshop_id,
                        engine: game.engine,
                        total_play_time: game.total_play_time || 0,
                        launch_count: game.launch_count || 0,
                        last_played: game.last_played,
                        user_rating: game.user_rating || 0
                    };
                });

                // Apply custom covers if they exist
                this.applyCustomCovers(convertedGames);

                // Merge
                this.allAlbums = [...this.allAlbums, ...convertedGames];
                this.filteredAlbums = [...this.allAlbums];
                document.getElementById('total-albums').textContent = this.filteredAlbums.length;

                // Clear scene and recreate UI to prevent icon mismatch
                this.clearScene();
                this.currentIndex = Math.min(this.currentIndex, this.filteredAlbums.length - 1);
                this.targetIndex = this.currentIndex;
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

                // Always remove existing games first
                this.allAlbums = this.allAlbums.filter(item => item.type !== 'game');
                this.filteredAlbums = this.filteredAlbums.filter(item => item.type !== 'game');

                if (games.length === 0) {
                    // Still need to update UI when games are cleared
                    document.getElementById('total-albums').textContent = this.filteredAlbums.length;
                    this.clearScene();
                    this.currentIndex = Math.min(this.currentIndex, Math.max(0, this.filteredAlbums.length - 1));
                    this.targetIndex = this.currentIndex;
                    this.createCovers();
                    this.createThumbnails();
                    this.updateInfo();
                    this.showToast('No games found. Run a scan first.', 'info');
                    return;
                }

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

                // Apply custom covers if they exist
                this.applyCustomCovers(convertedGames);

                // Merge with existing albums/images
                this.allAlbums = [...this.allAlbums, ...convertedGames];
                this.filteredAlbums = [...this.allAlbums];
                document.getElementById('total-albums').textContent = this.filteredAlbums.length;

                // Clear scene and recreate UI to prevent icon mismatch
                this.clearScene();
                this.currentIndex = Math.min(this.currentIndex, this.filteredAlbums.length - 1);
                this.targetIndex = this.currentIndex;
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
        const mousemoveHandler = (e) => {
            if (this.gamepadIndex === -1) {
                this.cursorX = e.clientX;
                this.cursorY = e.clientY;
            }
        };
        this.addTrackedEventListener(document, 'mousemove', mousemoveHandler);
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

        // Update VR UI overlay if visual effects manager is available
        if (this.visualEffects && typeof this.visualEffects.updateVRUI === 'function') {
            const title = item.title || 'Unknown';
            const subtitle = isGame ? (item.developer || 'Unknown Developer') :
                            isImage ? (item.category || 'Image') :
                            (item.artist || 'Unknown Artist');
            this.visualEffects.updateVRUI(title, subtitle, item);
        }
    }

    /**
     * Get currently selected game/item
     */
    getCurrentGame() {
        return this.filteredAlbums[this.currentIndex];
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
                if (item.title && item.title.toLowerCase().includes(lowerQuery)) return true;

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
                has_vr_support: Boolean(game.has_vr_support),
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
        try {
            // Track already-disposed resources to prevent double-disposal
            const disposedGeometries = new Set();
            const disposedTextures = new Set();

            this.covers.forEach(cover => {
                if (cover.parent) {
                    // Dispose of all children in the cover group
                    cover.parent.traverse((child) => {
                        if (child.isMesh || child.isLineSegments) {
                            // Dispose geometry (only once per unique geometry)
                            if (child.geometry && !disposedGeometries.has(child.geometry.uuid)) {
                                child.geometry.dispose();
                                disposedGeometries.add(child.geometry.uuid);
                            }

                            // Dispose material(s)
                            if (child.material) {
                                const materials = Array.isArray(child.material) ? child.material : [child.material];

                                materials.forEach(mat => {
                                    // Dispose textures (only once per unique texture)
                                    const textureProps = ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap', 'aoMap', 'emissiveMap', 'metalnessMap', 'roughnessMap'];

                                    textureProps.forEach(prop => {
                                        if (mat[prop] && !disposedTextures.has(mat[prop].uuid)) {
                                            mat[prop].dispose();
                                            disposedTextures.add(mat[prop].uuid);
                                        }
                                    });

                                    mat.dispose();
                                });
                            }
                        }
                    });

                    // Remove from scene
                    this.scene.remove(cover.parent);
                }
            });

            this.covers = [];
            this.reflections = [];

            console.log('[COVERFLOW] Scene cleared - disposed', disposedGeometries.size, 'geometries and', disposedTextures.size, 'textures');
        } catch (error) {
            console.error('[COVERFLOW] Error during clearScene:', error);
            // Still clear the arrays even if disposal fails
            this.covers = [];
            this.reflections = [];
        }
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
            // Apply reduced strength to prevent blurriness
            this.bloomPass.strength = value * 0.5;
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

    /**
     * Helper method to add and track event listeners for cleanup
     */
    addTrackedEventListener(element, event, handler, options) {
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
    }

    /**
     * Cleanup all resources and event listeners
     */
    destroy() {
        console.log('[COVERFLOW] Destroying and cleaning up resources...');

        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Clear intervals
        if (this.autoRotateInterval) clearInterval(this.autoRotateInterval);
        if (this.scanInterval) clearInterval(this.scanInterval);
        if (this.checkInterval) clearInterval(this.checkInterval);
        if (this.recentLaunchedInterval) clearInterval(this.recentLaunchedInterval);
        if (this.trackUpdateInterval) clearInterval(this.trackUpdateInterval);

        // Clear all session tracking timeouts and intervals
        if (this.sessionTrackingTimeouts) {
            Object.values(this.sessionTrackingTimeouts).forEach(clearTimeout);
        }
        if (this.sessionIntervals) {
            Object.values(this.sessionIntervals).forEach(clearInterval);
        }

        // Remove all tracked event listeners
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.eventListeners = [];

        // Dispose visual effects manager
        if (this.visualEffectsManager && typeof this.visualEffectsManager.dispose === 'function') {
            this.visualEffectsManager.dispose();
        }

        // Cleanup modules safely
        if (this._modules) {
            Object.values(this._modules).forEach(module => {
                if (module && typeof module.cleanup === 'function') {
                    module.cleanup();
                } else if (module && typeof module.destroy === 'function') {
                    module.destroy();
                }
            });
        }

        // Call specific cleanup methods on modules if they exist
        if (typeof this.cleanupUpdateNotifications === 'function') this.cleanupUpdateNotifications();

        // Clear the 3D scene
        this.clearScene();

        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }

        console.log('[COVERFLOW] Cleanup complete');
    }

    addEventListeners() {
        // Keyboard controls
        const keydownHandler = (e) => {
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
        };
        this.addTrackedEventListener(document, 'keydown', keydownHandler);

        // Mouse wheel with variable speed
        const wheelHandler = (e) => {
            e.preventDefault();

            // Calculate scroll amount based on deltaY and speed setting
            const scrollAmount = Math.abs(e.deltaY) * this.settings.scrollSpeed * 0.01;
            const direction = e.deltaY > 0 ? 1 : -1;
            const steps = Math.max(1, Math.floor(scrollAmount));

            // Navigate multiple steps for faster scrolling
            this.navigate(direction * steps);
        };
        this.addTrackedEventListener(this.container, 'wheel', wheelHandler, { passive: false });

        // Mouse click on covers
        const clickHandler = (e) => {
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
        };
        this.addTrackedEventListener(this.container, 'click', clickHandler);

        // Double-click to launch game or open media file
        const dblclickHandler = (e) => {
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
                    if (item) {
                        if (item.type === 'game') {
                            this.launchGame(item);
                        } else if (item.type === 'image' || item.type === 'video' || item.type === 'music') {
                            // Open media file in default Windows app
                            this.openMediaFile(item);
                        }
                    }
                }
            }
        };
        this.addTrackedEventListener(this.container, 'dblclick', dblclickHandler);

        // Touch support
        let touchStartX = 0;
        const touchstartHandler = (e) => {
            touchStartX = e.touches[0].clientX;
        };
        this.addTrackedEventListener(this.container, 'touchstart', touchstartHandler, { passive: false });

        const touchendHandler = (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > 50) {
                this.navigate(diff > 0 ? 1 : -1);
            }
        };
        this.addTrackedEventListener(this.container, 'touchend', touchendHandler, { passive: false });

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
        document.getElementById('fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());

        // Dropdown menu toggle
        const moreBtn = document.getElementById('more-btn');
        const moreDropdown = document.getElementById('more-dropdown');
        if (moreBtn && moreDropdown) {
            moreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = moreDropdown.style.display === 'block';
                moreDropdown.style.display = isVisible ? 'none' : 'block';
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.dropdown-container')) {
                    moreDropdown.style.display = 'none';
                }
            });
        }

        // Dropdown menu items
        const modsBtnMenu = document.getElementById('mods-btn-menu');
        if (modsBtnMenu && typeof this.showModManager === 'function') {
            modsBtnMenu.addEventListener('click', () => {
                // Show mod manager with current game if one is selected
                const currentGame = this.filteredAlbums[this.currentIndex];
                if (currentGame && currentGame.type === 'game') {
                    this.showModManager(currentGame);
                } else {
                    // Open mod manager panel anyway, showing empty state
                    const panel = document.getElementById('unified-mod-manager');
                    if (panel) {
                        panel.style.display = 'block';
                        panel.classList.add('active');
                    }
                }
                moreDropdown.style.display = 'none';
            });
        }

        const soundtrackBtnMenu = document.getElementById('soundtrack-btn-menu');
        if (soundtrackBtnMenu && typeof this.loadGameSoundtrack === 'function') {
            soundtrackBtnMenu.addEventListener('click', () => {
                const currentGame = this.filteredAlbums[this.currentIndex];
                if (currentGame && currentGame.type === 'game') {
                    this.loadGameSoundtrack(currentGame);
                } else {
                    this.showToast('Please select a game first', 'info');
                }
                moreDropdown.style.display = 'none';
            });
        }

        const youtubeSoundtrackBtnMenu = document.getElementById('youtube-soundtrack-btn-menu');
        if (youtubeSoundtrackBtnMenu && typeof this.loadYouTubeSoundtrack === 'function') {
            youtubeSoundtrackBtnMenu.addEventListener('click', () => {
                const currentGame = this.filteredAlbums[this.currentIndex];
                if (currentGame && currentGame.type === 'game') {
                    this.loadYouTubeSoundtrack(currentGame);
                } else {
                    this.showToast('Please select a game first', 'info');
                }
                moreDropdown.style.display = 'none';
            });
        }

        const videoPlayerBtnMenu = document.getElementById('video-player-btn-menu');
        if (videoPlayerBtnMenu && this._modules && this._modules.videoPlayer) {
            videoPlayerBtnMenu.addEventListener('click', () => {
                this._modules.videoPlayer.showPlayer();
                moreDropdown.style.display = 'none';
            });
        }

        const insightsBtnMenu = document.getElementById('insights-btn-menu');
        if (insightsBtnMenu && typeof this.toggleInsights === 'function') {
            insightsBtnMenu.addEventListener('click', () => {
                this.toggleInsights();
                moreDropdown.style.display = 'none';
            });
        }

        const shortcutsBtnMenu = document.getElementById('shortcuts-btn-menu');
        if (shortcutsBtnMenu) {
            shortcutsBtnMenu.addEventListener('click', () => {
                this.openModal('shortcuts-modal');
                moreDropdown.style.display = 'none';
            });
        }

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

        try {
            this.setupSettingsControls();
        } catch (e) {
            console.error('[COVERFLOW] Error setting up settings controls:', e);
        }

        // Ensure server status is checked even if settings setup fails
        try {
            this.checkServerStatus();
        } catch (e) {
            console.error('[COVERFLOW] Error checking server status in addEventListeners:', e);
        }
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
                console.log('[COVERFLOW] Clear game data button clicked');
                if (confirm('⚠️ This will delete all scanned game data!\n\nYou will need to scan for games again.\n\nAre you sure?')) {
                    console.log('[COVERFLOW] User confirmed clear game data');
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
        } else {
            console.warn('[COVERFLOW] clear-game-data-btn not found');
        }

        // Logging controls
        const logLevelSelect = document.getElementById('log-level-select');
        if (logLevelSelect) {
            // Load current log level
            logLevelSelect.value = window.logger?.getLogLevelName() || 'INFO';

            logLevelSelect.addEventListener('change', (e) => {
                window.logger?.setLogLevel(e.target.value);
                this.showToast(`Log level set to ${e.target.value}`, 'info');
            });
        }

        const disableVRLogs = document.getElementById('disable-vr-logs');
        if (disableVRLogs) {
            disableVRLogs.addEventListener('change', (e) => {
                if (e.target.checked) {
                    window.logger?.disableModule('VR');
                    window.logger?.disableModule('VR_FILTER');
                } else {
                    window.logger?.enableModule('VR');
                    window.logger?.enableModule('VR_FILTER');
                }
                this.showToast(`VR logs ${e.target.checked ? 'disabled' : 'enabled'}`, 'info');
            });
        }

        const disableModManagerLogs = document.getElementById('disable-mod-manager-logs');
        if (disableModManagerLogs) {
            disableModManagerLogs.addEventListener('change', (e) => {
                if (e.target.checked) {
                    window.logger?.disableModule('MOD_MANAGER');
                } else {
                    window.logger?.enableModule('MOD_MANAGER');
                }
                this.showToast(`Mod Manager logs ${e.target.checked ? 'disabled' : 'enabled'}`, 'info');
            });
        }

        const disableVideoLogs = document.getElementById('disable-video-logs');
        if (disableVideoLogs) {
            disableVideoLogs.addEventListener('change', (e) => {
                if (e.target.checked) {
                    window.logger?.disableModule('VIDEO');
                } else {
                    window.logger?.enableModule('VIDEO');
                }
                this.showToast(`Video Player logs ${e.target.checked ? 'disabled' : 'enabled'}`, 'info');
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
        const scanGamesBtn = document.getElementById('scan-games-btn');
        if (scanGamesBtn) {
            scanGamesBtn.addEventListener('click', () => {
                console.log('[COVERFLOW] Scan games button clicked');
                this.startGameScan();
            });
        } else {
            console.warn('[COVERFLOW] scan-games-btn not found');
        }

        const reloadGamesBtn = document.getElementById('reload-games-btn');
        if (reloadGamesBtn) {
            reloadGamesBtn.addEventListener('click', () => {
                console.log('[COVERFLOW] Reload games button clicked');
                this.reloadGamesFromServer();
            });
        } else {
            console.warn('[COVERFLOW] reload-games-btn not found');
        }

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

    async loadSavedMediaFolders() {
        if (!this.isElectron) {
            return;
        }

        try {
            // Load all saved media folders
            const result = await window.electronAPI.loadAllMediaFolders();

            if (!result.success) {
                console.error('Failed to load media folders:', result.error);
                return;
            }

            if (result.count === 0) {
                console.log('No saved media folders found');
                return;
            }

            // Add media to library
            this.allAlbums = [...this.allAlbums, ...result.media];
            this.filteredAlbums = [...this.allAlbums];
            document.getElementById('total-albums').textContent = this.filteredAlbums.length;

            // Recreate UI
            this.createCovers();
            this.createThumbnails();
            this.updateInfo();

            console.log(`Loaded ${result.count} media files from ${result.foldersScanned} folders`);
        } catch (error) {
            console.error('Error loading saved media folders:', error);
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
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        // Update FPS counter
        this.updateFPS();

        // Poll gamepad input
        this.pollGamepad();

        // Update controller cursor
        this.updateControllerCursor();

        // Update cover positions (returns true if still animating)
        const isAnimating = this.updateCoverPositions(false);

        // Floating animation for center cover - use fixed base Y position
        const centerCover = this.covers[this.currentIndex];
        if (centerCover && centerCover.parent) {
            // Update base Y when current index changes or on first run
            if (this.lastFloatingIndex !== this.currentIndex) {
                this.centerCoverBaseY = isAnimating ? 0 : centerCover.parent.position.y;
                this.lastFloatingIndex = this.currentIndex;
            }
            // Apply floating offset from fixed base (increased intensity from 0.03 to 0.08)
            centerCover.parent.position.y = this.centerCoverBaseY + Math.sin(Date.now() * 0.001) * 0.08;
        }

        // Update visual effects
        if (this.visualEffectsManager) {
            this.visualEffectsManager.update(this.covers);
            // Always update 3D effects to handle animations and cleanup/toggling visibility
            this.visualEffectsManager.update3DEffects(this.covers, this.currentIndex);
        }

        // Render with post-processing if enabled, otherwise normal render
        // Prioritize Stereo 3D rendering if enabled
        if (this.visualEffectsManager &&
            (this.visualEffectsManager.settings.stereo3DEnabled || this.visualEffectsManager.settings.vrModeEnabled)) {
            this.visualEffectsManager.renderStereo();
        } else if (this.composer && (this.settings.bloomEffect || this.settings.ssaoEffect)) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    pauseAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    resumeAnimation() {
        if (!this.animationFrameId) {
            this.animate();
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
        window.coverflow = new CoverFlow();
        console.log('[COVERFLOW] Instance assigned to window.coverflow');
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
