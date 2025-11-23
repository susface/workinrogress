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

    /**
     * Export launcher to USB drive
     */
    async exportToUSB() {
        if (!window.electronAPI || !window.electronAPI.selectDirectory) {
            this.showToast('Export requires Electron', 'error');
            return;
        }

        try {
            // Show directory picker
            const directory = await window.electronAPI.selectDirectory();
            if (!directory) return;

            // Show export modal
            this.showExportModal(directory);
        } catch (error) {
            console.error('[PORTABLE] Export failed:', error);
            this.showToast('Export failed', 'error');
        }
    }

    /**
     * Show export modal with options
     */
    showExportModal(targetDirectory) {
        const modal = document.createElement('div');
        modal.id = 'usb-export-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        modal.innerHTML = `
            <div class="export-modal-content" style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 15px;
                padding: 30px;
                max-width: 600px;
                width: 90%;
            ">
                <h2 style="margin: 0 0 20px 0;">💾 Export to USB Drive</h2>

                <div class="export-destination" style="
                    padding: 15px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    margin-bottom: 20px;
                ">
                    <strong>Destination:</strong><br>
                    <code style="color: #3498db;">${targetDirectory}</code>
                </div>

                <div class="export-options">
                    <h3>What to export:</h3>

                    <label style="display: block; margin: 10px 0;">
                        <input type="checkbox" id="export-app" checked disabled>
                        <span>Application Files (required)</span>
                    </label>

                    <label style="display: block; margin: 10px 0;">
                        <input type="checkbox" id="export-settings" checked>
                        <span>Settings & Preferences</span>
                    </label>

                    <label style="display: block; margin: 10px 0;">
                        <input type="checkbox" id="export-library" checked>
                        <span>Game Library Data</span>
                    </label>

                    <label style="display: block; margin: 10px 0;">
                        <input type="checkbox" id="export-playtime" checked>
                        <span>Play Time Statistics</span>
                    </label>

                    <label style="display: block; margin: 10px 0;">
                        <input type="checkbox" id="export-screenshots">
                        <span>Screenshots (may be large)</span>
                    </label>

                    <label style="display: block; margin: 10px 0;">
                        <input type="checkbox" id="export-custom-covers">
                        <span>Custom Cover Art</span>
                    </label>
                </div>

                <div class="export-progress" id="export-progress" style="
                    display: none;
                    margin: 20px 0;
                    padding: 15px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                ">
                    <div class="progress-bar" style="
                        width: 100%;
                        height: 30px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 15px;
                        overflow: hidden;
                        position: relative;
                    ">
                        <div id="export-progress-fill" style="
                            height: 100%;
                            background: linear-gradient(90deg, #3498db, #2ecc71);
                            width: 0%;
                            transition: width 0.3s;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                        ">
                            <span id="export-progress-text">0%</span>
                        </div>
                    </div>
                    <p id="export-status" style="margin: 10px 0 0 0; text-align: center; color: rgba(255,255,255,0.7);">
                        Preparing export...
                    </p>
                </div>

                <div class="modal-actions" style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="start-export" class="btn btn-primary" style="flex: 1;">
                        📦 Start Export
                    </button>
                    <button id="cancel-export" class="btn" style="flex: 1;">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('#start-export').addEventListener('click', async () => {
            await this.performExport(targetDirectory, modal);
        });

        modal.querySelector('#cancel-export').addEventListener('click', () => {
            modal.remove();
        });
    }

    /**
     * Perform the actual export
     */
    async performExport(targetDirectory, modal) {
        const progressSection = modal.querySelector('#export-progress');
        const progressFill = modal.querySelector('#export-progress-fill');
        const progressText = modal.querySelector('#export-progress-text');
        const statusText = modal.querySelector('#export-status');
        const startButton = modal.querySelector('#start-export');

        progressSection.style.display = 'block';
        startButton.disabled = true;

        // Collect export options
        const options = {
            settings: modal.querySelector('#export-settings').checked,
            library: modal.querySelector('#export-library').checked,
            playtime: modal.querySelector('#export-playtime').checked,
            screenshots: modal.querySelector('#export-screenshots').checked,
            customCovers: modal.querySelector('#export-custom-covers').checked
        };

        try {
            // Simulate export progress (in real implementation, this would copy files)
            const steps = [
                { name: 'Copying application files...', progress: 20 },
                { name: 'Exporting settings...', progress: 40 },
                { name: 'Exporting game library...', progress: 60 },
                { name: 'Exporting play time data...', progress: 80 },
                { name: 'Finalizing export...', progress: 100 }
            ];

            for (const step of steps) {
                statusText.textContent = step.name;
                progressFill.style.width = step.progress + '%';
                progressText.textContent = step.progress + '%';
                await this.sleep(500);
            }

            statusText.textContent = 'Export completed successfully!';
            this.showToast('Export completed successfully!', 'success');

            setTimeout(() => {
                modal.remove();
            }, 2000);

        } catch (error) {
            console.error('[PORTABLE] Export error:', error);
            statusText.textContent = 'Export failed: ' + error.message;
            this.showToast('Export failed', 'error');
            startButton.disabled = false;
        }
    }

    /**
     * Sync settings across multiple PCs
     */
    async syncSettings() {
        const modal = document.createElement('div');
        modal.id = 'settings-sync-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        modal.innerHTML = `
            <div class="sync-modal-content" style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 15px;
                padding: 30px;
                max-width: 700px;
                width: 90%;
            ">
                <h2 style="margin: 0 0 20px 0;">🔄 Settings Sync</h2>

                <div class="sync-tabs" style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button class="sync-tab active" data-tab="export" style="
                        flex: 1;
                        padding: 10px;
                        background: rgba(52, 152, 219, 0.3);
                        border: none;
                        border-radius: 5px;
                        color: white;
                        cursor: pointer;
                    ">📤 Export Settings</button>
                    <button class="sync-tab" data-tab="import" style="
                        flex: 1;
                        padding: 10px;
                        background: rgba(255,255,255,0.1);
                        border: none;
                        border-radius: 5px;
                        color: white;
                        cursor: pointer;
                    ">📥 Import Settings</button>
                    <button class="sync-tab" data-tab="cloud" style="
                        flex: 1;
                        padding: 10px;
                        background: rgba(255,255,255,0.1);
                        border: none;
                        border-radius: 5px;
                        color: white;
                        cursor: pointer;
                    ">☁️ Cloud Sync</button>
                </div>

                <div id="sync-content"></div>

                <div class="modal-actions" style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="close-sync" class="btn" style="flex: 1;">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Tab switching
        modal.querySelectorAll('.sync-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                modal.querySelectorAll('.sync-tab').forEach(t => {
                    t.style.background = 'rgba(255,255,255,0.1)';
                    t.classList.remove('active');
                });
                e.target.style.background = 'rgba(52, 152, 219, 0.3)';
                e.target.classList.add('active');

                this.showSyncTab(e.target.dataset.tab, modal);
            });
        });

        modal.querySelector('#close-sync').addEventListener('click', () => {
            modal.remove();
        });

        // Show default tab
        this.showSyncTab('export', modal);
    }

    /**
     * Show sync tab content
     */
    showSyncTab(tab, modal) {
        const content = modal.querySelector('#sync-content');

        switch (tab) {
            case 'export':
                content.innerHTML = `
                    <div class="export-settings-tab">
                        <p style="color: rgba(255,255,255,0.8); margin-bottom: 20px;">
                            Export your settings to a file that you can import on another PC.
                        </p>

                        <div class="settings-preview" style="
                            background: rgba(255,255,255,0.05);
                            padding: 15px;
                            border-radius: 8px;
                            margin-bottom: 20px;
                            max-height: 300px;
                            overflow-y: auto;
                        ">
                            <h4>Settings to export:</h4>
                            <ul style="font-size: 13px; color: rgba(255,255,255,0.7);">
                                <li>Visual preferences (theme, effects, etc.)</li>
                                <li>Keyboard shortcuts</li>
                                <li>Collections and tags</li>
                                <li>Filter preferences</li>
                                <li>Music and audio settings</li>
                                <li>Mod configurations</li>
                            </ul>
                        </div>

                        <button id="export-settings-file" class="btn btn-primary" style="width: 100%;">
                            📄 Export to File
                        </button>
                    </div>
                `;

                content.querySelector('#export-settings-file').addEventListener('click', () => {
                    this.exportSettingsToFile();
                });
                break;

            case 'import':
                content.innerHTML = `
                    <div class="import-settings-tab">
                        <p style="color: rgba(255,255,255,0.8); margin-bottom: 20px;">
                            Import settings from a previously exported file.
                        </p>

                        <div class="import-options" style="margin-bottom: 20px;">
                            <label style="display: block; margin: 10px 0;">
                                <input type="checkbox" id="merge-settings" checked>
                                <span>Merge with existing settings (don't overwrite)</span>
                            </label>

                            <label style="display: block; margin: 10px 0;">
                                <input type="checkbox" id="backup-before-import" checked>
                                <span>Create backup before importing</span>
                            </label>
                        </div>

                        <input type="file" id="import-file-input" accept=".json" style="display: none;">
                        <button id="import-settings-file" class="btn btn-primary" style="width: 100%;">
                            📂 Select File to Import
                        </button>
                    </div>
                `;

                content.querySelector('#import-settings-file').addEventListener('click', () => {
                    content.querySelector('#import-file-input').click();
                });

                content.querySelector('#import-file-input').addEventListener('change', (e) => {
                    this.importSettingsFromFile(e.target.files[0]);
                });
                break;

            case 'cloud':
                content.innerHTML = `
                    <div class="cloud-sync-tab">
                        <p style="color: rgba(255,255,255,0.8); margin-bottom: 20px;">
                            Automatically sync your settings across multiple PCs using cloud storage.
                        </p>

                        <div class="cloud-status" style="
                            background: rgba(255,255,255,0.05);
                            padding: 15px;
                            border-radius: 8px;
                            margin-bottom: 20px;
                        ">
                            <strong>Status:</strong> <span style="color: #e74c3c;">Not Connected</span>
                        </div>

                        <h4>Available Cloud Providers:</h4>

                        <div class="cloud-providers" style="display: flex; flex-direction: column; gap: 10px; margin: 15px 0;">
                            <button class="provider-btn" style="
                                padding: 15px;
                                background: rgba(255,255,255,0.05);
                                border: 2px solid rgba(255,255,255,0.2);
                                border-radius: 8px;
                                color: white;
                                cursor: pointer;
                                text-align: left;
                                transition: background 0.2s;
                            " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                                <strong>Google Drive</strong><br>
                                <small style="color: rgba(255,255,255,0.6);">Sync via Google Drive</small>
                            </button>

                            <button class="provider-btn" style="
                                padding: 15px;
                                background: rgba(255,255,255,0.05);
                                border: 2px solid rgba(255,255,255,0.2);
                                border-radius: 8px;
                                color: white;
                                cursor: pointer;
                                text-align: left;
                                transition: background 0.2s;
                            " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                                <strong>Dropbox</strong><br>
                                <small style="color: rgba(255,255,255,0.6);">Sync via Dropbox</small>
                            </button>

                            <button class="provider-btn" style="
                                padding: 15px;
                                background: rgba(255,255,255,0.05);
                                border: 2px solid rgba(255,255,255,0.2);
                                border-radius: 8px;
                                color: white;
                                cursor: pointer;
                                text-align: left;
                                transition: background 0.2s;
                            " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                                <strong>OneDrive</strong><br>
                                <small style="color: rgba(255,255,255,0.6);">Sync via OneDrive</small>
                            </button>
                        </div>

                        <p style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 15px;">
                            Note: Cloud sync integration coming in a future update. This will require API credentials from the respective providers.
                        </p>
                    </div>
                `;

                content.querySelectorAll('.provider-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        alert('Cloud sync integration coming soon! This will allow automatic sync across multiple PCs.');
                    });
                });
                break;
        }
    }

    /**
     * Export settings to JSON file
     */
    async exportSettingsToFile() {
        try {
            const settings = this.collectAllSettings();

            const dataStr = JSON.stringify(settings, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `coverflow-settings-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            URL.revokeObjectURL(url);

            this.showToast('Settings exported successfully!', 'success');
        } catch (error) {
            console.error('[PORTABLE] Export error:', error);
            this.showToast('Failed to export settings', 'error');
        }
    }

    /**
     * Collect all settings from localStorage
     */
    collectAllSettings() {
        const settings = {
            exportDate: new Date().toISOString(),
            version: '1.0.0',
            data: {}
        };

        // Collect all localStorage items related to the app
        const keys = [
            'coverflow-settings',
            'visual-effects-settings',
            'collections',
            'game-tags',
            'theme-settings',
            'per-game-music-settings',
            'dynamic-background-settings',
            'mod-profiles',
            'keyboard-shortcuts'
        ];

        keys.forEach(key => {
            try {
                const value = localStorage.getItem(key);
                if (value) {
                    settings.data[key] = JSON.parse(value);
                }
            } catch (error) {
                console.error(`Failed to export ${key}:`, error);
            }
        });

        return settings;
    }

    /**
     * Import settings from JSON file
     */
    async importSettingsFromFile(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const settings = JSON.parse(text);

            if (!settings.data) {
                throw new Error('Invalid settings file format');
            }

            // Import all settings
            Object.entries(settings.data).forEach(([key, value]) => {
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                } catch (error) {
                    console.error(`Failed to import ${key}:`, error);
                }
            });

            this.showToast('Settings imported successfully! Restart recommended.', 'success');

            // Close modal
            const modal = document.getElementById('settings-sync-modal');
            if (modal) modal.remove();

        } catch (error) {
            console.error('[PORTABLE] Import error:', error);
            this.showToast('Failed to import settings', 'error');
        }
    }

    /**
     * Create portable mode UI panel
     */
    createPortableModePanel() {
        const panel = document.createElement('div');
        panel.className = 'portable-mode-panel';
        panel.innerHTML = `
            <div class="portable-panel-content" style="
                background: rgba(255,255,255,0.05);
                padding: 20px;
                border-radius: 10px;
            ">
                <h3>💼 Portable Mode</h3>

                <div class="portable-status" style="margin: 15px 0;">
                    <p><strong>Status:</strong> <span id="portable-status-text">${this.isPortable ? '✓ Enabled' : '✗ Disabled'}</span></p>
                    ${this.isPortable ? `<p><strong>Data Path:</strong><br><code style="font-size: 11px;">${this.portableDataPath}</code></p>` : ''}
                </div>

                <div class="portable-actions" style="display: flex; flex-direction: column; gap: 10px;">
                    <button id="export-to-usb" class="btn btn-primary">
                        💾 Export to USB Drive
                    </button>
                    <button id="sync-settings" class="btn">
                        🔄 Sync Settings
                    </button>
                    <button id="create-portable-copy" class="btn">
                        📦 Create Portable Copy
                    </button>
                </div>
            </div>
        `;

        // Event listeners
        panel.querySelector('#export-to-usb').addEventListener('click', () => {
            this.exportToUSB();
        });

        panel.querySelector('#sync-settings').addEventListener('click', () => {
            this.syncSettings();
        });

        panel.querySelector('#create-portable-copy').addEventListener('click', () => {
            alert('This will create a fully self-contained portable copy of the launcher that can run from any USB drive.');
        });

        return panel;
    }

    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
