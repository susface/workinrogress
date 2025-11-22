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

        // Event listeners
        this.audio.addEventListener('error', (e) => {
            console.error('[BACKGROUND_MUSIC] Audio playback error:', e);
            this.showToast('Failed to load background music', 'error');
        });

        this.audio.addEventListener('canplay', () => {
            console.log('[BACKGROUND_MUSIC] Audio loaded and ready to play');
        });

        // Auto-start if enabled
        if (this.enabled) {
            this.loadAndPlay();
        }

        console.log('[BACKGROUND_MUSIC] Background music initialized');
    }

    /**
     * Load and play the current track
     */
    loadAndPlay() {
        if (!this.audio || !this.currentTrackPath) return;

        try {
            // Convert path to appropriate format
            if (this.currentTrackPath.startsWith('http')) {
                this.audio.src = this.currentTrackPath;
            } else {
                // For Electron mode, use file:// protocol
                // For local files in the app directory, use relative path
                const normalizedPath = this.currentTrackPath.replace(/\\/g, '/');
                this.audio.src = normalizedPath;
            }

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
            this.showToast('Failed to load background music', 'error');
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
                    this.showToast('Failed to play background music', 'error');
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
            this.play();
            this.showToast('Background music enabled', 'success');
        } else {
            this.pause();
            this.showToast('Background music disabled', 'info');
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
                    this.showToast('Background music file loaded', 'success');
                } else if (result.canceled) {
                    console.log('[BACKGROUND_MUSIC] File selection canceled');
                } else {
                    this.showToast(result.error || 'Failed to select file', 'error');
                }
            } catch (error) {
                console.error('[BACKGROUND_MUSIC] Failed to select file:', error);
                this.showToast('Failed to select background music file', 'error');
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
                this.showToast('Background music file loaded', 'success');
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
    resetToDefault() {
        this.setBackgroundMusicFile(this.defaultTrackPath);
        this.showToast('Reset to default background music', 'info');
    }

    /**
     * Cleanup on destroy
     */
    cleanup() {
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
            this.audio = null;
        }
        console.log('[BACKGROUND_MUSIC] Cleaned up');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (window.coverflow && typeof window.coverflow.showToast === 'function') {
            window.coverflow.showToast(message, type);
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackgroundMusic;
}
