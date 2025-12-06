/**
 * Background Music Module - Redesigned for Reliability
 * Plays continuous background music with user-customizable audio files
 * Features: Simple file loading, looping, volume control, and now-playing display
 */

class BackgroundMusic {
    constructor() {
        this.audio = null;
        this.enabled = true;
        this.volume = 0.3;
        this.currentTrackPath = null;
        this.currentTrackName = '';
        this.defaultTrackPath = 'Pinolino s Great Grand Adventure in the Tower OST In Da Crib Secret Select World 6_CBR_320k.mp3';
        this.nowPlayingElement = null;
        this.initialized = false;
        this.currentBlobUrl = null; // Track blob URL for cleanup

        // Store event listener references for cleanup
        this.eventListeners = {
            error: null,
            canplay: null,
            playing: null,
            pause: null
        };

        // Initialize settings with defaults
        if (!this.settings) {
            this.settings = this.loadDefaultSettings();
        }
    }

    /**
     * Load default settings
     */
    loadDefaultSettings() {
        const defaultSettings = {
            backgroundMusicEnabled: true,
            backgroundMusicVolume: 0.3,
            backgroundMusicPath: this.defaultTrackPath
        };

        try {
            const saved = localStorage.getItem('background-music-settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.error('[BACKGROUND_MUSIC] Failed to load settings:', error);
            return defaultSettings;
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        if (!this.settings) return;

        try {
            const settingsToSave = {
                backgroundMusicEnabled: this.settings.backgroundMusicEnabled,
                backgroundMusicVolume: this.settings.backgroundMusicVolume,
                backgroundMusicPath: this.settings.backgroundMusicPath
            };
            localStorage.setItem('background-music-settings', JSON.stringify(settingsToSave));
            console.log('[BACKGROUND_MUSIC] Settings saved');
        } catch (error) {
            console.error('[BACKGROUND_MUSIC] Failed to save settings:', error);
        }
    }

    /**
     * Initialize background music
     */
    initializeBackgroundMusic() {
        try {
            // Prevent duplicate initialization
            if (this.initialized) {
                console.log('[BACKGROUND_MUSIC] Already initialized, skipping');
                return;
            }

            console.log('[BACKGROUND_MUSIC] Initializing...');

            // Load settings
            if (!this.settings) {
                this.settings = this.loadDefaultSettings();
            }

            this.enabled = this.settings.backgroundMusicEnabled !== false;
            this.volume = this.settings.backgroundMusicVolume || 0.3;
            this.currentTrackPath = this.settings.backgroundMusicPath || this.defaultTrackPath;

            console.log('[BACKGROUND_MUSIC] Settings loaded:', {
                enabled: this.enabled,
                volume: this.volume,
                trackPath: this.currentTrackPath
            });

            // Create audio element
            this.audio = new Audio();
            this.audio.loop = true;
            this.audio.volume = this.volume;
            this.audio.preload = 'auto';

            // Make audio element globally accessible for visualizer
            window.backgroundMusicAudio = this.audio;

            // Create and store event listeners for proper cleanup
            this.eventListeners.error = (e) => {
                console.error('[BACKGROUND_MUSIC] Audio error:', e);
                this.updateNowPlaying('Music file not found');
            };

            this.eventListeners.canplay = () => {
                console.log('[BACKGROUND_MUSIC] Audio ready');
            };

            this.eventListeners.playing = () => {
                console.log('[BACKGROUND_MUSIC] Playback started');
                this.updateNowPlaying(this.currentTrackName || 'Background Music');
            };

            this.eventListeners.pause = () => {
                console.log('[BACKGROUND_MUSIC] Playback paused');
                this.updateNowPlaying('');
            };

            // Attach event listeners
            this.audio.addEventListener('error', this.eventListeners.error);
            this.audio.addEventListener('canplay', this.eventListeners.canplay);
            this.audio.addEventListener('playing', this.eventListeners.playing);
            this.audio.addEventListener('pause', this.eventListeners.pause);

            // Create now-playing display
            this.createNowPlayingDisplay();

            // Load the track
            if (this.currentTrackPath) {
                this.loadTrack(this.currentTrackPath);
            }

            // Auto-start if enabled (after user interaction)
            if (this.enabled) {
                console.log('[BACKGROUND_MUSIC] Will auto-start on first user interaction');
                const tryAutoplay = () => {
                    if (this.enabled && this.audio) {
                        this.play();
                    }
                };

                document.addEventListener('click', tryAutoplay, { once: true });
                document.addEventListener('keydown', tryAutoplay, { once: true });
            }

            // Pause music when window is minimized or hidden
            this.handleVisibilityChange = () => {
                if (document.hidden || document.visibilityState === 'hidden') {
                    console.log('[BACKGROUND_MUSIC] Window hidden/minimized, pausing music');
                    if (this.audio && !this.audio.paused) {
                        this.wasPlayingBeforeHide = true;
                        this.pause();
                    }
                } else {
                    console.log('[BACKGROUND_MUSIC] Window visible, resuming music');
                    if (this.audio && this.wasPlayingBeforeHide && this.enabled) {
                        this.play();
                        this.wasPlayingBeforeHide = false;
                    }
                }
            };

            document.addEventListener('visibilitychange', this.handleVisibilityChange);

            this.initialized = true;
            console.log('[BACKGROUND_MUSIC] Initialized successfully');
        } catch (error) {
            console.error('[BACKGROUND_MUSIC] Initialization failed:', error);
        }
    }

    /**
     * Create now-playing display at bottom of screen
     */
    createNowPlayingDisplay() {
        // Check if already exists
        if (document.getElementById('now-playing-display')) {
            this.nowPlayingElement = document.getElementById('now-playing-display');
            return;
        }

        const nowPlaying = document.createElement('div');
        nowPlaying.id = 'now-playing-display';
        nowPlaying.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            color: rgba(128, 128, 128, 0.8);
            font-size: 12px;
            font-family: Arial, sans-serif;
            z-index: 999;
            pointer-events: none;
            text-align: right;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            padding: 5px 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 15px;
            backdrop-filter: blur(5px);
        `;
        nowPlaying.textContent = '';

        document.body.appendChild(nowPlaying);
        this.nowPlayingElement = nowPlaying;
        console.log('[BACKGROUND_MUSIC] Now-playing display created');
    }

    /**
     * Update now-playing display
     */
    updateNowPlaying(trackName) {
        if (!this.nowPlayingElement) {
            this.createNowPlayingDisplay();
        }

        if (trackName && trackName.trim()) {
            this.nowPlayingElement.textContent = `♫ Now Playing: ${trackName}`;
            this.nowPlayingElement.style.opacity = '1';
        } else {
            this.nowPlayingElement.style.opacity = '0';
        }
    }

    /**
     * Load a track
     */
    loadTrack(filePath) {
        if (!this.audio) {
            console.warn('[BACKGROUND_MUSIC] Audio element not initialized');
            return;
        }

        try {
            // Extract filename for display
            const fileName = filePath.split(/[\\/]/).pop();
            this.currentTrackName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension

            // Set the source
            let audioSrc = filePath;

            // Handle file:// protocol
            if (!filePath.startsWith('http') && !filePath.startsWith('blob:')) {
                if (filePath.match(/^[a-zA-Z]:/)) {
                    // Windows path
                    audioSrc = `file:///${filePath.replace(/\\/g, '/')}`;
                } else if (filePath.startsWith('/')) {
                    // Unix/Mac path
                    audioSrc = `file://${filePath}`;
                }
            }

            this.audio.src = audioSrc;
            console.log('[BACKGROUND_MUSIC] Track loaded:', audioSrc);

            // Update current track path in settings
            this.currentTrackPath = filePath;
            this.settings.backgroundMusicPath = filePath;
            this.saveSettings();

        } catch (error) {
            console.error('[BACKGROUND_MUSIC] Failed to load track:', error);
            this.updateNowPlaying('Failed to load music');
        }
    }

    /**
     * Play background music
     */
    play() {
        if (!this.audio || !this.enabled) return;

        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('[BACKGROUND_MUSIC] Playing');
                })
                .catch(error => {
                    console.warn('[BACKGROUND_MUSIC] Playback prevented:', error.message);
                });
        }
    }

    /**
     * Pause background music
     */
    pause() {
        if (!this.audio) return;
        this.audio.pause();
        console.log('[BACKGROUND_MUSIC] Paused');
    }

    /**
     * Stop background music
     */
    stop() {
        if (!this.audio) return;
        this.audio.pause();
        this.audio.currentTime = 0;
        console.log('[BACKGROUND_MUSIC] Stopped');
    }

    /**
     * Toggle background music on/off
     */
    toggleBackgroundMusic() {
        this.enabled = !this.enabled;
        this.settings.backgroundMusicEnabled = this.enabled;
        this.saveSettings();

        if (this.enabled) {
            this.play();
            this.showToastMessage('Background music enabled', 'success');
        } else {
            this.pause();
            this.updateNowPlaying('');
            this.showToastMessage('Background music disabled', 'info');
        }

        // Update UI toggle if it exists
        const toggle = document.getElementById('background-music-toggle');
        if (toggle) {
            toggle.checked = this.enabled;
        }
    }

    /**
     * Set background music volume
     */
    setBackgroundMusicVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.settings.backgroundMusicVolume = this.volume;
        this.saveSettings();

        if (this.audio) {
            this.audio.volume = this.volume;
        }

        console.log('[BACKGROUND_MUSIC] Volume set to:', this.volume);
    }

    /**
     * Load a custom background music file
     */
    async loadCustomBackgroundMusic() {
        // In Electron mode, use file dialog
        if (window.electronAPI && typeof window.electronAPI.selectBackgroundMusic === 'function') {
            try {
                const result = await window.electronAPI.selectBackgroundMusic();
                if (result.success && result.filePath) {
                    this.setBackgroundMusicFile(result.filePath);
                    this.showToastMessage('Background music file loaded', 'success');
                } else if (result.canceled) {
                    console.log('[BACKGROUND_MUSIC] File selection canceled');
                } else {
                    this.showToastMessage(result.error || 'Failed to select file', 'error');
                }
            } catch (error) {
                console.error('[BACKGROUND_MUSIC] Failed to select file:', error);
                this.showToastMessage('Failed to select background music file', 'error');
            }
        } else {
            // Fallback for non-Electron mode - use file input
            this.showFileInputDialog();
        }
    }

    /**
     * Show file input dialog (fallback for non-Electron mode)
     */
    showFileInputDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                // Revoke previous blob URL to prevent memory leak
                if (this.currentBlobUrl) {
                    URL.revokeObjectURL(this.currentBlobUrl);
                    this.currentBlobUrl = null;
                }

                const url = URL.createObjectURL(file);
                this.currentBlobUrl = url; // Track for cleanup
                this.setBackgroundMusicFile(url);
                this.currentTrackName = file.name.replace(/\.[^/.]+$/, '');
                this.showToastMessage('Background music file loaded', 'success');
            }
        };
        input.click();
    }

    /**
     * Set the background music file path
     */
    setBackgroundMusicFile(filePath) {
        this.stop();
        this.loadTrack(filePath);

        if (this.enabled) {
            // Small delay to ensure track is loaded
            setTimeout(() => this.play(), 100);
        }

        console.log('[BACKGROUND_MUSIC] File set to:', filePath);
    }

    /**
     * Reset to default background music
     */
    resetBackgroundMusicToDefault() {
        this.setBackgroundMusicFile(this.defaultTrackPath);
        this.showToastMessage('Reset to default background music', 'info');
    }

    /**
     * Cleanup on destroy
     */
    cleanup() {
        // Remove event listeners to prevent memory leaks
        if (this.audio) {
            if (this.eventListeners.error) {
                this.audio.removeEventListener('error', this.eventListeners.error);
            }
            if (this.eventListeners.canplay) {
                this.audio.removeEventListener('canplay', this.eventListeners.canplay);
            }
            if (this.eventListeners.playing) {
                this.audio.removeEventListener('playing', this.eventListeners.playing);
            }
            if (this.eventListeners.pause) {
                this.audio.removeEventListener('pause', this.eventListeners.pause);
            }

            this.audio.pause();
            this.audio.src = '';
            this.audio = null;
        }

        // Remove visibility change listener
        if (this.handleVisibilityChange) {
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
            this.handleVisibilityChange = null;
        }

        // Clear event listener references
        this.eventListeners = {
            error: null,
            canplay: null,
            playing: null,
            pause: null
        };

        // Revoke blob URL to prevent memory leak
        if (this.currentBlobUrl) {
            URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = null;
        }

        // Remove now-playing display element
        if (this.nowPlayingElement && this.nowPlayingElement.parentNode) {
            this.nowPlayingElement.parentNode.removeChild(this.nowPlayingElement);
            this.nowPlayingElement = null;
        }

        // Clear global reference
        if (window.backgroundMusicAudio === this.audio) {
            window.backgroundMusicAudio = null;
        }

        this.initialized = false;
        console.log('[BACKGROUND_MUSIC] Cleaned up');
    }

    /**
     * Show toast notification
     */
    showToastMessage(message, type = 'info') {
        if (typeof this.showToast === 'function') {
            this.showToast(message, type);
        } else if (window.coverflow && typeof window.coverflow.showToast === 'function') {
            window.coverflow.showToast(message, type);
        } else {
            console.log(`[BACKGROUND_MUSIC] ${type.toUpperCase()}: ${message}`);
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackgroundMusic;
}
