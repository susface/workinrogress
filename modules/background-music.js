/**
 * Background Music Module
 * Plays continuous background music with user-customizable audio files
 */

class BackgroundMusic {
    constructor() {
        this.audio = null;
        this.enabled = true;
        this.volume = 0.3;
        this.currentTrackPath = null;
        this.defaultTrackPath = 'Pinolino s Great Grand Adventure in the Tower OST In Da Crib Secret Select World 6_CBR_320k.mp3';
        this.errorHandler = null;
        this.canPlayHandler = null;
    }

    /**
     * Initialize background music
     */
    initializeBackgroundMusic() {
        console.log('[BACKGROUND_MUSIC] Initializing background music...');

        // Check settings
        if (this.settings.backgroundMusicEnabled === undefined) {
            this.settings.backgroundMusicEnabled = true;
        }
        if (this.settings.backgroundMusicVolume === undefined) {
            this.settings.backgroundMusicVolume = 0.3;
        }
        if (this.settings.backgroundMusicPath === undefined) {
            this.settings.backgroundMusicPath = this.defaultTrackPath;
        }

        this.enabled = this.settings.backgroundMusicEnabled;
        this.volume = this.settings.backgroundMusicVolume;
        this.currentTrackPath = this.settings.backgroundMusicPath;

        // Create audio element
        this.audio = new Audio();
        this.audio.loop = true;
        this.audio.volume = this.volume;

        // Event listeners - store handlers for cleanup
        this.errorHandler = (e) => {
            console.error('[BACKGROUND_MUSIC] Audio playback error:', e);
            this.showToastMessage('Failed to load background music', 'error');
        };
        this.canPlayHandler = () => {
            console.log('[BACKGROUND_MUSIC] Audio loaded and ready to play');
        };

        this.audio.addEventListener('error', this.errorHandler);
        this.audio.addEventListener('canplay', this.canPlayHandler);

        // Auto-start if enabled
        if (this.enabled) {
            this.loadAndPlay();
        }

        // Add cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        console.log('[BACKGROUND_MUSIC] Background music initialized');
    }

    /**
     * Load and play the current track
     */
    loadAndPlay() {
        if (!this.audio || !this.currentTrackPath) return;

        try {
            // Convert path to appropriate format
            if (this.currentTrackPath.startsWith('http') || this.currentTrackPath.startsWith('blob:')) {
                // URL or blob URL - use as-is
                this.audio.src = this.currentTrackPath;
            } else if (this.currentTrackPath.startsWith('file://')) {
                // Already a file:// URL
                this.audio.src = this.currentTrackPath;
            } else if (this.currentTrackPath.match(/^[a-zA-Z]:/)) {
                // Windows absolute path (e.g., C:\path\to\file.mp3)
                const normalizedPath = this.currentTrackPath.replace(/\\/g, '/');
                this.audio.src = `file:///${normalizedPath}`;
            } else if (this.currentTrackPath.startsWith('/')) {
                // Unix/Mac absolute path
                this.audio.src = `file://${this.currentTrackPath}`;
            } else {
                // Relative path - use as-is
                this.audio.src = this.currentTrackPath;
            }

            console.log('[BACKGROUND_MUSIC] Loading audio from:', this.audio.src);

            // Play with user gesture handling
            const playPromise = this.audio.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('[BACKGROUND_MUSIC] Playback started successfully');
                    })
                    .catch(error => {
                        console.warn('[BACKGROUND_MUSIC] Autoplay prevented:', error);
                        // Don't show toast here as autoplay prevention is expected
                    });
            }
        } catch (error) {
            console.error('[BACKGROUND_MUSIC] Failed to load track:', error);
            this.showToastMessage('Failed to load background music', 'error');
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
                    console.log('[BACKGROUND_MUSIC] Music playing');
                })
                .catch(error => {
                    console.error('[BACKGROUND_MUSIC] Playback failed:', error);
                    this.showToastMessage('Failed to play background music', 'error');
                });
        }
    }

    /**
     * Pause background music
     */
    pause() {
        if (!this.audio) return;
        this.audio.pause();
        console.log('[BACKGROUND_MUSIC] Music paused');
    }

    /**
     * Stop background music
     */
    stop() {
        if (!this.audio) return;
        this.audio.pause();
        this.audio.currentTime = 0;
        console.log('[BACKGROUND_MUSIC] Music stopped');
    }

    /**
     * Toggle background music on/off
     */
    toggleBackgroundMusic() {
        this.enabled = !this.enabled;
        this.settings.backgroundMusicEnabled = this.enabled;
        this.saveSettings();

        if (this.enabled) {
            // Use loadAndPlay to ensure music is loaded and playing
            this.loadAndPlay();
            this.showToastMessage('Background music enabled', 'success');
        } else {
            this.pause();
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
                // Create object URL for the file
                const url = URL.createObjectURL(file);
                this.setBackgroundMusicFile(url);
                this.showToastMessage('Background music file loaded', 'success');
            }
        };
        input.click();
    }

    /**
     * Set the background music file path
     */
    setBackgroundMusicFile(filePath) {
        this.currentTrackPath = filePath;
        this.settings.backgroundMusicPath = filePath;
        this.saveSettings();

        // Stop current playback
        this.stop();

        // Load and play new track if enabled
        if (this.enabled) {
            this.loadAndPlay();
        }

        console.log('[BACKGROUND_MUSIC] Background music file set to:', filePath);
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
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
            // Remove event listeners
            if (this.errorHandler) {
                this.audio.removeEventListener('error', this.errorHandler);
            }
            if (this.canPlayHandler) {
                this.audio.removeEventListener('canplay', this.canPlayHandler);
            }
            this.audio = null;
        }
        this.errorHandler = null;
        this.canPlayHandler = null;
        console.log('[BACKGROUND_MUSIC] Cleaned up');
    }

    /**
     * Show toast notification (internal method to avoid conflicts)
     */
    showToastMessage(message, type = 'info') {
        // Use the mixed-in showToast from CoverFlowUIUtils if available
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
