/**
 * CoverFlow Settings Module
 * Handles settings management, import/export, and visual effect toggles
 */

class CoverFlowSettings {
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const savedSettings = localStorage.getItem('coverflowSettings');
        const loadedSettings = savedSettings ? JSON.parse(savedSettings) : {};

        // Merge loaded settings with current settings (preserves defaults for new settings)
        Object.assign(this.settings, loadedSettings);

        console.log('[SETTINGS] Loaded settings:', this.settings);
    }

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            coverSpacing: 3.5,
            sideAngle: Math.PI / 6,
            animationSpeed: 0.8,
            autoRotate: false,
            autoRotateSpeed: 0.01,
            backgroundColor: '#1a1a2e',
            glassEffect: true,
            bloomEffect: false,
            bloomIntensity: 1.0,
            ssaoEffect: false,
            hardwareRendering: true,
            showReflections: true,
            fpsCounter: false,
            errorLogging: true,
            scrollSpeed: 1.0,
            vrMode: false,
            // Enhancement features
            soundEffects: true,
            touchGestures: true,
            platformAnimations: true,
            dynamicBackground: true,
            infiniteLoop: true,
            zoomOnSelect: true,
            depthOfField: false,
            dofFocus: 9.0,
            dofAperture: 0.025,
            // UI Effects
            frostedGlassUI: false,
            // Background music
            backgroundMusicEnabled: true,
            backgroundMusicVolume: 0.3,
            backgroundMusicPath: 'Pinolino s Great Grand Adventure in the Tower OST In Da Crib Secret Select World 6_CBR_320k.mp3'
        };
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('coverflowSettings', JSON.stringify(this.settings));
    }

    /**
     * Export settings as JSON
     */
    exportSettings() {
        const settingsJSON = JSON.stringify(this.settings, null, 2);
        const blob = new Blob([settingsJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'coverflow-settings.json';
        a.click();

        URL.revokeObjectURL(url);
        this.showToast('Settings exported successfully!', 'success');
    }

    /**
     * Import settings from JSON data
     */
    importSettings(jsonData) {
        try {
            const importedSettings = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

            // Merge with current settings (keep defaults for missing keys)
            this.settings = { ...this.settings, ...importedSettings };

            // Save to localStorage
            this.saveSettings();

            // Apply visual settings
            this.updateBackgroundColor(this.settings.backgroundColor);

            if (this.settings.bloomEffect) {
                this.toggleBloomEffect();
            }

            this.showToast('Settings imported successfully!', 'success');

            // Reload page to apply all settings
            setTimeout(() => location.reload(), 1000);

        } catch (error) {
            console.error('Error importing settings:', error);
            this.showToast('Failed to import settings', 'error');
        }
    }

    /**
     * Toggle auto-rotate feature
     */
    toggleAutoRotate() {
        this.settings.autoRotate = !this.settings.autoRotate;

        if (this.settings.autoRotate) {
            this.showToast('Auto-rotate enabled', 'success');
        } else {
            this.showToast('Auto-rotate disabled', 'info');
        }

        this.saveSettings();
    }

    /**
     * Toggle hardware rendering
     */
    toggleHardwareRendering() {
        this.settings.hardwareRendering = !this.settings.hardwareRendering;

        if (this.settings.hardwareRendering) {
            this.showToast('Hardware rendering enabled (reload required)', 'success');
        } else {
            this.showToast('Hardware rendering disabled (reload required)', 'info');
        }

        this.saveSettings();
    }

    /**
     * Toggle glass effect
     */
    toggleGlassEffect() {
        this.settings.glassEffect = !this.settings.glassEffect;
        this.saveSettings();

        // Recreate covers with new material
        this.createCovers();

        this.showToast(
            this.settings.glassEffect ? 'Glass effect enabled' : 'Glass effect disabled',
            'success'
        );
    }

    /**
     * Toggle bloom effect
     */
    toggleBloomEffect() {
        this.settings.bloomEffect = !this.settings.bloomEffect;
        this.saveSettings();

        this.showToast(
            this.settings.bloomEffect ? 'Bloom effect enabled (reload required)' : 'Bloom effect disabled (reload required)',
            'success'
        );
    }

    /**
     * Toggle SSAO effect
     */
    toggleSSAOEffect() {
        this.settings.ssaoEffect = !this.settings.ssaoEffect;
        this.saveSettings();

        this.showToast(
            this.settings.ssaoEffect ? 'SSAO enabled (reload required)' : 'SSAO disabled (reload required)',
            'success'
        );
    }

    /**
     * Toggle Depth of Field effect
     */
    toggleDepthOfField() {
        this.settings.depthOfField = !this.settings.depthOfField;
        this.saveSettings();

        if (this.bokehPass) {
            this.bokehPass.enabled = this.settings.depthOfField;
        }

        this.showToast(
            this.settings.depthOfField ? 'Depth of Field enabled' : 'Depth of Field disabled',
            'success'
        );
    }

    /**
     * Toggle Frosted Glass UI effect
     */
    toggleFrostedGlassUI() {
        this.settings.frostedGlassUI = !this.settings.frostedGlassUI;
        this.saveSettings();

        // Get window controls element
        const windowControls = document.getElementById('window-controls');

        // Apply or remove the frosted glass class from body
        if (this.settings.frostedGlassUI) {
            document.body.classList.add('frosted-glass-mode');
            // Make THREE.js scene background transparent
            if (this.scene) {
                this.scene.background = null;
            }
            // Also make renderer transparent
            if (this.renderer) {
                this.renderer.setClearColor(0x000000, 0); // Transparent
            }
            // Hide window controls in transparent mode
            if (windowControls && window.electronAPI) {
                windowControls.classList.add('hidden');
            }
        } else {
            document.body.classList.remove('frosted-glass-mode');
            // Restore background color
            if (this.scene) {
                this.scene.background = new THREE.Color(this.settings.backgroundColor);
            }
            // Restore renderer opaque
            if (this.renderer) {
                this.renderer.setClearColor(this.settings.backgroundColor, 1);
            }
            // Show window controls in normal mode
            if (windowControls && window.electronAPI) {
                windowControls.classList.remove('hidden');
            }
        }

        this.showToast(
            this.settings.frostedGlassUI ? 'Frosted Glass UI enabled' : 'Frosted Glass UI disabled',
            'success'
        );
    }

    /**
     * Toggle VR/Stereo 3D mode
     */
    toggleVRMode() {
        this.settings.vrMode = !this.settings.vrMode;
        this.saveSettings();

        // Toggle the visual effects VR mode if available
        if (window.visualEffectsManager) {
            window.visualEffectsManager.toggleEffect('stereo3DEnabled', this.settings.vrMode);
        }

        this.showToast(
            this.settings.vrMode ? 'VR mode enabled' : 'VR mode disabled',
            'success'
        );
    }

    /**
     * Update bloom intensity
     */
    updateBloomIntensity(value) {
        this.settings.bloomIntensity = parseFloat(value);
        this.saveSettings();
    }

    /**
     * Update background color
     */
    updateBackgroundColor(color) {
        this.settings.backgroundColor = color;
        if (this.scene) {
            this.scene.background = new THREE.Color(color);
        }
        this.saveSettings();
    }

    /**
     * Setup settings panel controls
     */
    setupSettingsControls() {
        // Cover spacing slider
        const spacingSlider = document.getElementById('cover-spacing');
        const spacingValue = document.getElementById('spacing-value');
        if (spacingSlider && spacingValue) {
            spacingSlider.value = this.settings.coverSpacing * 10;
            spacingValue.textContent = this.settings.coverSpacing;

            spacingSlider.addEventListener('input', (e) => {
                this.settings.coverSpacing = parseFloat(e.target.value) / 10;
                spacingValue.textContent = (e.target.value / 10).toFixed(1);
                this.updateCoverPositions();
                this.saveSettings();
            });
        }

        // Side angle slider
        const angleSlider = document.getElementById('side-angle');
        const angleValue = document.getElementById('angle-value');
        if (angleSlider && angleValue) {
            angleSlider.value = (this.settings.sideAngle * 180 / Math.PI);
            angleValue.textContent = (this.settings.sideAngle * (180 / Math.PI)).toFixed(0) + '°';

            angleSlider.addEventListener('input', (e) => {
                this.settings.sideAngle = parseFloat(e.target.value) * (Math.PI / 180);
                angleValue.textContent = parseFloat(e.target.value).toFixed(0) + '°';
                this.updateCoverPositions();
                this.saveSettings();
            });
        }

        // Animation speed slider
        const speedSlider = document.getElementById('animation-speed');
        const speedValue = document.getElementById('speed-value');
        if (speedSlider && speedValue) {
            speedSlider.value = this.settings.animationSpeed * 10;
            speedValue.textContent = (this.settings.animationSpeed * 10).toFixed(0);

            speedSlider.addEventListener('input', (e) => {
                this.settings.animationSpeed = parseFloat(e.target.value) / 10;
                speedValue.textContent = e.target.value;
                this.saveSettings();
            });
        }

        // Scroll speed slider
        const scrollSpeedSlider = document.getElementById('scroll-speed');
        const scrollSpeedValue = document.getElementById('scroll-speed-value');
        if (scrollSpeedSlider && scrollSpeedValue) {
            scrollSpeedSlider.value = this.settings.scrollSpeed;
            scrollSpeedValue.textContent = this.settings.scrollSpeed + 'x';

            scrollSpeedSlider.addEventListener('input', (e) => {
                this.settings.scrollSpeed = parseFloat(e.target.value);
                scrollSpeedValue.textContent = e.target.value + 'x';
                this.saveSettings();
            });
        }

        // Background color picker
        const bgColorPicker = document.getElementById('bg-color');
        if (bgColorPicker) {
            bgColorPicker.value = this.settings.backgroundColor;

            bgColorPicker.addEventListener('input', (e) => {
                this.updateBackgroundColor(e.target.value);
            });
        }

        // Glass effect toggle
        const glassToggle = document.getElementById('glass-effect');
        if (glassToggle) {
            glassToggle.checked = this.settings.glassEffect;

            glassToggle.addEventListener('change', () => {
                this.toggleGlassEffect();
            });
        }

        // Show reflections toggle
        const reflectionsToggle = document.getElementById('reflection-toggle');
        if (reflectionsToggle) {
            reflectionsToggle.checked = this.settings.showReflections;

            reflectionsToggle.addEventListener('change', () => {
                this.settings.showReflections = !this.settings.showReflections;
                this.reflections.forEach(ref => {
                    ref.visible = this.settings.showReflections;
                });
                this.saveSettings();
            });
        }

        // Bloom effect toggle
        const bloomToggle = document.getElementById('bloom-effect');
        if (bloomToggle) {
            bloomToggle.checked = this.settings.bloomEffect;

            bloomToggle.addEventListener('change', () => {
                this.toggleBloomEffect();
            });
        }

        // Bloom intensity slider
        const bloomIntensitySlider = document.getElementById('bloom-intensity');
        const bloomIntensityValue = document.getElementById('bloom-value');
        if (bloomIntensitySlider && bloomIntensityValue) {
            bloomIntensitySlider.value = this.settings.bloomIntensity * 10;
            bloomIntensityValue.textContent = this.settings.bloomIntensity;

            bloomIntensitySlider.addEventListener('input', (e) => {
                this.updateBloomIntensity(e.target.value / 10);
                bloomIntensityValue.textContent = (e.target.value / 10).toFixed(1);
            });
        }

        // SSAO effect toggle
        const ssaoToggle = document.getElementById('ssao-effect');
        if (ssaoToggle) {
            ssaoToggle.checked = this.settings.ssaoEffect;

            ssaoToggle.addEventListener('change', () => {
                this.toggleSSAOEffect();
            });
        }

        // Depth of Field toggle
        const dofToggle = document.getElementById('depth-of-field-toggle');
        if (dofToggle) {
            dofToggle.checked = this.settings.depthOfField;

            dofToggle.addEventListener('change', () => {
                this.toggleDepthOfField();
            });
        }

        // VR mode toggle
        const vrToggle = document.getElementById('vr-mode-toggle');
        if (vrToggle) {
            vrToggle.checked = this.settings.vrMode;

            vrToggle.addEventListener('change', () => {
                this.toggleVRMode();
            });
        }

        // Hardware rendering toggle
        const hwToggle = document.getElementById('hardware-rendering');
        if (hwToggle) {
            hwToggle.checked = this.settings.hardwareRendering;

            hwToggle.addEventListener('change', () => {
                this.toggleHardwareRendering();
            });
        }

        // Auto-rotate toggle
        const autoRotateToggle = document.getElementById('auto-rotate');
        if (autoRotateToggle) {
            autoRotateToggle.checked = this.settings.autoRotate;

            autoRotateToggle.addEventListener('change', () => {
                this.toggleAutoRotate();
            });
        }

        // FPS counter toggle
        const fpsToggle = document.getElementById('fps-counter-toggle');
        if (fpsToggle) {
            fpsToggle.checked = this.settings.fpsCounter;

            fpsToggle.addEventListener('change', () => {
                this.settings.fpsCounter = !this.settings.fpsCounter;
                const fpsCounter = document.getElementById('fps-counter');
                if (fpsCounter) {
                    fpsCounter.style.display = this.settings.fpsCounter ? 'block' : 'none';
                }
                this.saveSettings();
            });
        }

        // Visualizer mode selector
        const visualizerMode = document.getElementById('visualizer-mode');
        if (visualizerMode) {
            visualizerMode.value = this.settings.visualizerMode || 'bars';

            visualizerMode.addEventListener('change', () => {
                this.settings.visualizerMode = visualizerMode.value;
                this.saveSettings();
                this.showToast(`Visualizer mode set to ${visualizerMode.value}`, 'success');
            });
        }

        // Error logging toggle
        const errorLoggingToggle = document.getElementById('error-logging-toggle');
        if (errorLoggingToggle) {
            errorLoggingToggle.checked = this.settings.errorLogging;

            // Show/hide view error log button based on error logging setting
            const logGroup = document.getElementById('view-error-log-group');
            if (logGroup) {
                logGroup.style.display = this.settings.errorLogging ? 'block' : 'none';
            }

            errorLoggingToggle.addEventListener('change', () => {
                this.settings.errorLogging = !this.settings.errorLogging;
                this.saveSettings();
                this.showToast(
                    this.settings.errorLogging ? 'Error logging enabled' : 'Error logging disabled',
                    'info'
                );

                // Toggle view log button visibility
                if (logGroup) {
                    logGroup.style.display = this.settings.errorLogging ? 'block' : 'none';
                }
            });
        }

        // View error log button handler
        const viewLogBtn = document.getElementById('view-error-log-btn');
        if (viewLogBtn) {
            viewLogBtn.addEventListener('click', () => {
                this.viewErrorLog();
            });
        }

        // Enhancement feature toggles
        const soundEffectsToggle = document.getElementById('sound-effects-toggle');
        if (soundEffectsToggle) {
            soundEffectsToggle.checked = this.settings.soundEffects;
            soundEffectsToggle.addEventListener('change', () => {
                this.toggleSoundEffects();
            });
        }

        // Background music controls
        const backgroundMusicToggle = document.getElementById('background-music-toggle');
        if (backgroundMusicToggle) {
            // Load initial state from BackgroundMusic module's settings
            try {
                const bgMusicSettings = localStorage.getItem('background-music-settings');
                if (bgMusicSettings) {
                    const parsed = JSON.parse(bgMusicSettings);
                    backgroundMusicToggle.checked = parsed.backgroundMusicEnabled !== false;
                } else {
                    backgroundMusicToggle.checked = this.settings.backgroundMusicEnabled !== false;
                }
            } catch (e) {
                backgroundMusicToggle.checked = this.settings.backgroundMusicEnabled !== false;
            }

            backgroundMusicToggle.addEventListener('change', () => {
                console.log('[SETTINGS] Background music toggle changed to:', backgroundMusicToggle.checked);

                // The toggleBackgroundMusic method handles everything including saving settings
                if (this.toggleBackgroundMusic && typeof this.toggleBackgroundMusic === 'function') {
                    console.log('[SETTINGS] Calling toggleBackgroundMusic method');
                    this.toggleBackgroundMusic();
                } else {
                    console.warn('[SETTINGS] toggleBackgroundMusic method not available');
                }
            });
        }

        const backgroundMusicVolume = document.getElementById('background-music-volume');
        const bgMusicVolumeValue = document.getElementById('bg-music-volume-value');
        if (backgroundMusicVolume && bgMusicVolumeValue) {
            // Load actual volume from BackgroundMusic module's settings
            let currentVolume = 0.3; // default

            // Try to get from BackgroundMusic module if it exists
            try {
                const bgMusicSettings = localStorage.getItem('background-music-settings');
                if (bgMusicSettings) {
                    const parsed = JSON.parse(bgMusicSettings);
                    if (parsed.backgroundMusicVolume !== undefined) {
                        currentVolume = parsed.backgroundMusicVolume;
                    }
                }
            } catch (e) {
                console.warn('[SETTINGS] Could not load background music volume:', e);
            }

            // Also check if the module is already loaded and has the volume set
            if (this.volume !== undefined) {
                currentVolume = this.volume;
            }

            backgroundMusicVolume.value = currentVolume * 100;
            bgMusicVolumeValue.textContent = Math.round(currentVolume * 100) + '%';

            backgroundMusicVolume.addEventListener('input', (e) => {
                const volume = parseFloat(e.target.value) / 100;
                bgMusicVolumeValue.textContent = e.target.value + '%';

                console.log('[SETTINGS] Background music volume changed to:', volume);

                // The setBackgroundMusicVolume method handles saving settings
                if (this.setBackgroundMusicVolume && typeof this.setBackgroundMusicVolume === 'function') {
                    console.log('[SETTINGS] Calling setBackgroundMusicVolume method');
                    this.setBackgroundMusicVolume(volume);
                } else {
                    console.warn('[SETTINGS] setBackgroundMusicVolume method not available');
                }
            });
        }

        const selectBgMusicBtn = document.getElementById('select-bg-music-btn');
        if (selectBgMusicBtn) {
            // Function to display currently selected file
            const displayCurrentFile = () => {
                const fileDisplay = document.getElementById('current-music-file-display');
                if (fileDisplay) {
                    try {
                        const bgMusicSettings = localStorage.getItem('background-music-settings');
                        if (bgMusicSettings) {
                            const settings = JSON.parse(bgMusicSettings);
                            if (settings.backgroundMusicPath) {
                                const fileName = settings.backgroundMusicPath.split(/[\\/]/).pop();
                                fileDisplay.textContent = `Selected: ${fileName}`;
                                console.log('[SETTINGS] Current music file:', fileName);
                            } else {
                                fileDisplay.textContent = 'No file selected';
                            }
                        } else {
                            fileDisplay.textContent = 'No file selected';
                        }
                    } catch (e) {
                        console.error('[SETTINGS] Error displaying current file:', e);
                        fileDisplay.textContent = 'Error loading file info';
                    }
                }
            };

            // Display current file on load
            displayCurrentFile();

            selectBgMusicBtn.addEventListener('click', async () => {
                console.log('[SETTINGS] Select background music clicked');
                console.log('[SETTINGS] loadCustomBackgroundMusic available?', typeof this.loadCustomBackgroundMusic);

                // Use the background music module's loadCustomBackgroundMusic method
                if (this.loadCustomBackgroundMusic && typeof this.loadCustomBackgroundMusic === 'function') {
                    console.log('[SETTINGS] Calling loadCustomBackgroundMusic method');
                    try {
                        await this.loadCustomBackgroundMusic();
                        // Wait a bit and then update the display
                        setTimeout(displayCurrentFile, 500);
                    } catch (error) {
                        console.error('[SETTINGS] Error loading custom music:', error);
                        this.showToast('Failed to load custom music', 'error');
                    }
                } else {
                    console.warn('[SETTINGS] loadCustomBackgroundMusic method not available');
                    this.showToast('Background music selection not available', 'error');
                }
            });
        }

        const resetBgMusicBtn = document.getElementById('reset-bg-music-btn');
        if (resetBgMusicBtn) {
            resetBgMusicBtn.addEventListener('click', () => {
                console.log('[SETTINGS] Reset background music clicked');
                console.log('[SETTINGS] resetBackgroundMusicToDefault available?', typeof this.resetBackgroundMusicToDefault);

                if (this.resetBackgroundMusicToDefault && typeof this.resetBackgroundMusicToDefault === 'function') {
                    console.log('[SETTINGS] Calling resetBackgroundMusicToDefault method');
                    try {
                        this.resetBackgroundMusicToDefault();
                        // Update the display after resetting
                        if (selectBgMusicBtn) {
                            const displayCurrentFile = () => {
                                const fileDisplay = document.getElementById('current-music-file-display');
                                if (fileDisplay) {
                                    try {
                                        const bgMusicSettings = localStorage.getItem('background-music-settings');
                                        if (bgMusicSettings) {
                                            const settings = JSON.parse(bgMusicSettings);
                                            if (settings.backgroundMusicPath) {
                                                const fileName = settings.backgroundMusicPath.split(/[\\/]/).pop();
                                                fileDisplay.textContent = `Selected: ${fileName}`;
                                            } else {
                                                fileDisplay.textContent = 'No file selected';
                                            }
                                        } else {
                                            fileDisplay.textContent = 'No file selected';
                                        }
                                    } catch (e) {
                                        fileDisplay.textContent = 'Error loading file info';
                                    }
                                }
                            };
                            setTimeout(displayCurrentFile, 500);
                        }
                    } catch (error) {
                        console.error('[SETTINGS] Error resetting background music:', error);
                        this.showToast('Failed to reset music', 'error');
                    }
                } else {
                    console.warn('[SETTINGS] resetBackgroundMusicToDefault method not available');
                    this.showToast('Reset not available', 'error');
                }
            });
        }

        const touchGesturesToggle = document.getElementById('touch-gestures-toggle');
        if (touchGesturesToggle) {
            touchGesturesToggle.checked = this.settings.touchGestures;
            touchGesturesToggle.addEventListener('change', () => {
                this.toggleTouchGestures();
            });
        }

        const platformAnimationsToggle = document.getElementById('platform-animations-toggle');
        if (platformAnimationsToggle) {
            platformAnimationsToggle.checked = this.settings.platformAnimations;
            platformAnimationsToggle.addEventListener('change', () => {
                this.togglePlatformAnimations();
            });
        }

        const dynamicBackgroundToggle = document.getElementById('dynamic-background-toggle');
        if (dynamicBackgroundToggle) {
            dynamicBackgroundToggle.checked = this.settings.dynamicBackground;
            dynamicBackgroundToggle.addEventListener('change', () => {
                this.settings.dynamicBackground = !this.settings.dynamicBackground;
                this.saveSettings();
                this.showToast(
                    this.settings.dynamicBackground ? 'Dynamic background enabled' : 'Dynamic background disabled',
                    'success'
                );
            });
        }

        const infiniteLoopToggle = document.getElementById('infinite-loop-toggle');
        if (infiniteLoopToggle) {
            infiniteLoopToggle.checked = this.settings.infiniteLoop;
            infiniteLoopToggle.addEventListener('change', () => {
                this.settings.infiniteLoop = !this.settings.infiniteLoop;
                this.saveSettings();
                this.showToast(
                    this.settings.infiniteLoop ? 'Infinite loop enabled' : 'Infinite loop disabled',
                    'success'
                );
            });
        }

        const zoomOnSelectToggle = document.getElementById('zoom-on-select-toggle');
        if (zoomOnSelectToggle) {
            zoomOnSelectToggle.checked = this.settings.zoomOnSelect;
            zoomOnSelectToggle.addEventListener('change', () => {
                this.settings.zoomOnSelect = !this.settings.zoomOnSelect;
                this.saveSettings();
                this.showToast(
                    this.settings.zoomOnSelect ? 'Zoom on selection enabled' : 'Zoom on selection disabled',
                    'success'
                );
            });
        }

        // Export/Import settings buttons
        document.getElementById('export-settings-btn').addEventListener('click', () => {
            this.exportSettings();
        });

        document.getElementById('import-settings-btn').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();

                    reader.onload = (event) => {
                        this.importSettings(event.target.result);
                        // Clean up
                        reader.onload = null;
                    };

                    reader.readAsText(file);
                }
                // Clean up input element
                input.onchange = null;
            };

            input.click();
        });

        // Reload interface button
        const reloadInterfaceBtn = document.getElementById('reload-interface-btn');
        if (reloadInterfaceBtn) {
            reloadInterfaceBtn.addEventListener('click', () => {
                location.reload();
            });
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoverFlowSettings;
}