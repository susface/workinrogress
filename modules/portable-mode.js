/**
 * Portable Mode Module
 * Enables running the application from external drives with all data stored locally
 */

class PortableMode {
    constructor() {
        this.isPortable = false;
        this.portableDataPath = null;
    }

    /**
     * Initialize portable mode
     */
    async initializePortableMode() {
        // Check if portable mode is enabled
        await this.checkPortableMode();

        // Add UI toggle in settings
        this.addPortableModeToggle();

        console.log('[PORTABLE] Portable mode initialized:', this.isPortable ? 'ENABLED' : 'DISABLED');
    }

    /**
     * Check if portable mode is enabled
     */
    async checkPortableMode() {
        if (!window.electronAPI || !window.electronAPI.isPortableMode) {
            return false;
        }

        try {
            const result = await window.electronAPI.isPortableMode();
            this.isPortable = result.isPortable;
            this.portableDataPath = result.dataPath;

            if (this.isPortable) {
                console.log('[PORTABLE] Running in portable mode');
                console.log('[PORTABLE] Data path:', this.portableDataPath);
            }

            return this.isPortable;
        } catch (error) {
            console.error('[PORTABLE] Failed to check portable mode:', error);
            return false;
        }
    }

    /**
     * Add portable mode toggle to settings
     */
    addPortableModeToggle() {
        // Find the settings modal
        const settingsModal = document.getElementById('settings-modal');
        if (!settingsModal) return;

        // Check if toggle already exists
        if (document.getElementById('portable-mode-toggle')) return;

        // Find Performance & Data section
        const performanceSection = Array.from(settingsModal.querySelectorAll('.setting-section-title'))
            .find(el => el.textContent.includes('Performance & Data'));

        if (!performanceSection) return;

        // Create portable mode toggle
        const toggleGroup = document.createElement('div');
        toggleGroup.className = 'setting-group';
        toggleGroup.innerHTML = `
            <label>
                <input type="checkbox" id="portable-mode-toggle">
                Portable Mode
            </label>
            <small class="setting-info">Store all data in application directory (restart required)</small>
        `;

        // Insert after performance section title
        performanceSection.parentNode.insertBefore(toggleGroup, performanceSection.nextSibling);

        // Set initial state
        const toggle = document.getElementById('portable-mode-toggle');
        if (toggle) {
            toggle.checked = this.isPortable;

            toggle.addEventListener('change', async () => {
                await this.togglePortableMode(toggle.checked);
            });
        }
    }

    /**
     * Toggle portable mode on/off
     */
    async togglePortableMode(enable) {
        if (!window.electronAPI || !window.electronAPI.setPortableMode) {
            this.showToast('Portable mode requires Electron', 'error');
            return;
        }

        try {
            const result = await window.electronAPI.setPortableMode(enable);

            if (result.success) {
                this.isPortable = enable;

                const message = enable
                    ? 'Portable mode enabled. Restart required to take effect.'
                    : 'Portable mode disabled. Restart required to take effect.';

                this.showToast(message, 'success');

                // Show restart prompt
                this.showRestartPrompt();
            } else {
                this.showToast('Failed to toggle portable mode', 'error');
                // Revert checkbox
                const toggle = document.getElementById('portable-mode-toggle');
                if (toggle) toggle.checked = !enable;
            }
        } catch (error) {
            console.error('[PORTABLE] Failed to toggle portable mode:', error);
            this.showToast('Error toggling portable mode', 'error');

            // Revert checkbox
            const toggle = document.getElementById('portable-mode-toggle');
            if (toggle) toggle.checked = !enable;
        }
    }

    /**
     * Show restart prompt
     */
    showRestartPrompt() {
        const existingPrompt = document.getElementById('restart-prompt');
        if (existingPrompt) return;

        const prompt = document.createElement('div');
        prompt.id = 'restart-prompt';
        prompt.className = 'restart-prompt';
        prompt.innerHTML = `
            <div class="restart-prompt-content">
                <div class="restart-icon">🔄</div>
                <div class="restart-message">
                    <strong>Restart Required</strong>
                    <p>Application needs to restart for portable mode changes to take effect</p>
                </div>
                <div class="restart-actions">
                    <button id="restart-now-btn" class="btn primary">Restart Now</button>
                    <button id="restart-later-btn" class="btn">Later</button>
                </div>
            </div>
        `;

        document.body.appendChild(prompt);

        // Event listeners
        document.getElementById('restart-now-btn').addEventListener('click', () => {
            this.restartApplication();
        });

        document.getElementById('restart-later-btn').addEventListener('click', () => {
            prompt.remove();
        });

        // Auto-show animation
        setTimeout(() => {
            prompt.classList.add('visible');
        }, 100);
    }

    /**
     * Restart the application
     */
    async restartApplication() {
        if (!window.electronAPI || !window.electronAPI.restartApp) {
            this.showToast('Restart not available', 'error');
            return;
        }

        try {
            await window.electronAPI.restartApp();
        } catch (error) {
            console.error('[PORTABLE] Failed to restart:', error);
            this.showToast('Failed to restart application', 'error');
        }
    }

    /**
     * Get portable data path
     */
    getDataPath() {
        return this.isPortable ? this.portableDataPath : null;
    }

    /**
     * Check if running in portable mode
     */
    getIsPortable() {
        return this.isPortable;
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
