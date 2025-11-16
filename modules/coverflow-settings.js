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
        return savedSettings ? JSON.parse(savedSettings) : this.getDefaultSettings();
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
            scrollSpeed: 1.0
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
            spacingSlider.value = this.settings.coverSpacing;
            spacingValue.textContent = this.settings.coverSpacing;

            spacingSlider.addEventListener('input', (e) => {
                this.settings.coverSpacing = parseFloat(e.target.value);
                spacingValue.textContent = e.target.value;
                this.updateCoverPositions();
                this.saveSettings();
            });
        }

        // Side angle slider
        const angleSlider = document.getElementById('side-angle');
        const angleValue = document.getElementById('angle-value');
        if (angleSlider && angleValue) {
            angleSlider.value = this.settings.sideAngle;
            angleValue.textContent = (this.settings.sideAngle * (180 / Math.PI)).toFixed(0) + '°';

            angleSlider.addEventListener('input', (e) => {
                this.settings.sideAngle = parseFloat(e.target.value);
                angleValue.textContent = (parseFloat(e.target.value) * (180 / Math.PI)).toFixed(0) + '°';
                this.updateCoverPositions();
                this.saveSettings();
            });
        }

        // Animation speed slider
        const speedSlider = document.getElementById('animation-speed');
        const speedValue = document.getElementById('speed-value');
        if (speedSlider && speedValue) {
            speedSlider.value = this.settings.animationSpeed;
            speedValue.textContent = this.settings.animationSpeed + 'x';

            speedSlider.addEventListener('input', (e) => {
                this.settings.animationSpeed = parseFloat(e.target.value);
                speedValue.textContent = e.target.value + 'x';
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
        const glassToggle = document.getElementById('glass-toggle');
        if (glassToggle) {
            glassToggle.checked = this.settings.glassEffect;

            glassToggle.addEventListener('change', () => {
                this.toggleGlassEffect();
            });
        }

        // Show reflections toggle
        const reflectionsToggle = document.getElementById('reflections-toggle');
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
        const bloomToggle = document.getElementById('bloom-toggle');
        if (bloomToggle) {
            bloomToggle.checked = this.settings.bloomEffect;

            bloomToggle.addEventListener('change', () => {
                this.toggleBloomEffect();
            });
        }

        // Bloom intensity slider
        const bloomIntensitySlider = document.getElementById('bloom-intensity');
        const bloomIntensityValue = document.getElementById('bloom-intensity-value');
        if (bloomIntensitySlider && bloomIntensityValue) {
            bloomIntensitySlider.value = this.settings.bloomIntensity;
            bloomIntensityValue.textContent = this.settings.bloomIntensity;

            bloomIntensitySlider.addEventListener('input', (e) => {
                this.updateBloomIntensity(e.target.value);
                bloomIntensityValue.textContent = e.target.value;
            });
        }

        // SSAO effect toggle
        const ssaoToggle = document.getElementById('ssao-toggle');
        if (ssaoToggle) {
            ssaoToggle.checked = this.settings.ssaoEffect;

            ssaoToggle.addEventListener('change', () => {
                this.toggleSSAOEffect();
            });
        }

        // Hardware rendering toggle
        const hwToggle = document.getElementById('hardware-rendering-toggle');
        if (hwToggle) {
            hwToggle.checked = this.settings.hardwareRendering;

            hwToggle.addEventListener('change', () => {
                this.toggleHardwareRendering();
            });
        }

        // Auto-rotate toggle
        const autoRotateToggle = document.getElementById('auto-rotate-toggle');
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

            errorLoggingToggle.addEventListener('change', () => {
                this.settings.errorLogging = !this.settings.errorLogging;
                this.saveSettings();
                this.showToast(
                    this.settings.errorLogging ? 'Error logging enabled' : 'Error logging disabled',
                    'info'
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
                const reader = new FileReader();

                reader.onload = (event) => {
                    this.importSettings(event.target.result);
                };

                reader.readAsText(file);
            };

            input.click();
        });
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoverFlowSettings;
}
