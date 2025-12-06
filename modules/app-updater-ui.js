/**
 * App Updater UI Module
 * Handles checking for and displaying application update notifications
 */

class AppUpdaterUI {
    constructor() {
        this.updateInfo = null;
        this.isDownloading = false;
        this.downloadProgress = 0;
        this.updateCheckButton = null;
    }

    /**
     * Initialize app updater UI
     */
    initializeAppUpdater() {
        if (!window.electronAPI) {
            console.log('[APP-UPDATE] App updater requires Electron mode');
            return;
        }

        // Create update check button in settings
        this.createUpdateCheckButton();

        // Listen for update events from main process
        this.setupUpdateListeners();

        console.log('[APP-UPDATE] App updater UI initialized');
    }

    /**
     * Create update check button in settings
     */
    createUpdateCheckButton() {
        // We'll add a button in the settings panel for manual update checks
        // This will be integrated into the settings UI
        console.log('[APP-UPDATE] Update check button ready');
    }

    /**
     * Setup update event listeners
     */
    setupUpdateListeners() {
        // Listen for update checking event
        window.electronAPI.onUpdateChecking(() => {
            console.log('[APP-UPDATE] Checking for updates...');
            this.showUpdateCheckingToast();
        });

        // Listen for update available event
        window.electronAPI.onUpdateAvailable((info) => {
            console.log('[APP-UPDATE] Update available:', info.version);
            this.updateInfo = info;
            this.showUpdateAvailableDialog(info);
        });

        // Listen for update not available event
        window.electronAPI.onUpdateNotAvailable((info) => {
            console.log('[APP-UPDATE] No updates available. Current version:', info.version);
            this.showUpdateNotAvailableToast(info.version);
        });

        // Listen for update error event
        window.electronAPI.onUpdateError((error) => {
            console.error('[APP-UPDATE] Update error:', error);
            this.showUpdateErrorToast(error.message);
        });

        // Listen for download progress event
        window.electronAPI.onUpdateDownloadProgress((progress) => {
            console.log(`[APP-UPDATE] Download progress: ${progress.percent.toFixed(2)}%`);
            this.downloadProgress = progress.percent;
            this.updateDownloadProgress(progress);
        });

        // Listen for update downloaded event
        window.electronAPI.onUpdateDownloaded((info) => {
            console.log('[APP-UPDATE] Update downloaded:', info.version);
            this.isDownloading = false;
            this.showUpdateReadyDialog(info);
        });
    }

    /**
     * Manually check for updates
     */
    async checkForUpdates() {
        if (!window.electronAPI) {
            console.log('[APP-UPDATE] Update checking requires Electron mode');
            return;
        }

        try {
            const result = await window.electronAPI.checkForAppUpdates();

            if (result.error) {
                this.showUpdateErrorToast(result.error);
            } else if (result.message) {
                // Development mode message
                this.showInfoToast(result.message);
            }
        } catch (error) {
            console.error('[APP-UPDATE] Failed to check for updates:', error);
            this.showUpdateErrorToast('Failed to check for updates');
        }
    }

    /**
     * Download the available update
     */
    async downloadUpdate() {
        if (!window.electronAPI || this.isDownloading) return;

        try {
            this.isDownloading = true;
            const result = await window.electronAPI.downloadAppUpdate();

            if (!result.success) {
                this.isDownloading = false;
                this.showUpdateErrorToast(result.error || result.message);
            }
        } catch (error) {
            this.isDownloading = false;
            console.error('[APP-UPDATE] Failed to download update:', error);
            this.showUpdateErrorToast('Failed to download update');
        }
    }

    /**
     * Install the downloaded update
     */
    async installUpdate() {
        if (!window.electronAPI) return;

        try {
            await window.electronAPI.installAppUpdate();
            // App will quit and install
        } catch (error) {
            console.error('[APP-UPDATE] Failed to install update:', error);
            this.showUpdateErrorToast('Failed to install update');
        }
    }

    /**
     * Show update checking toast
     */
    showUpdateCheckingToast() {
        if (window.showToast) {
            window.showToast('Checking for application updates...', 'info', 3000);
        }
    }

    /**
     * Show update not available toast
     */
    showUpdateNotAvailableToast(version) {
        if (window.showToast) {
            window.showToast(`You're running the latest version (${version})`, 'success', 4000);
        }
    }

    /**
     * Show update error toast
     */
    showUpdateErrorToast(message) {
        if (window.showToast) {
            window.showToast(`Update error: ${message}`, 'error', 5000);
        }
    }

    /**
     * Show info toast
     */
    showInfoToast(message) {
        if (window.showToast) {
            window.showToast(message, 'info', 4000);
        }
    }

    /**
     * Show update available dialog
     */
    showUpdateAvailableDialog(info) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog app-update-dialog">
                <div class="modal-header">
                    <h2>Update Available</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="update-info">
                        <p class="update-version">Version ${info.version} is now available!</p>
                        ${info.releaseNotes ? `
                            <div class="release-notes">
                                <h3>What's New:</h3>
                                <div class="release-notes-content">${this.formatReleaseNotes(info.releaseNotes)}</div>
                            </div>
                        ` : ''}
                        ${info.releaseDate ? `<p class="release-date">Released: ${new Date(info.releaseDate).toLocaleDateString()}</p>` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Later</button>
                    <button class="btn-primary" onclick="appUpdaterUI.downloadAndClose(this)">Download Update</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Download update and close dialog
     */
    downloadAndClose(button) {
        const modal = button.closest('.modal-overlay');
        if (modal) modal.remove();

        this.downloadUpdate();
        this.showDownloadProgressDialog();
    }

    /**
     * Show download progress dialog
     */
    showDownloadProgressDialog() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay update-progress-modal';
        modal.innerHTML = `
            <div class="modal-dialog app-update-dialog">
                <div class="modal-header">
                    <h2>Downloading Update</h2>
                </div>
                <div class="modal-body">
                    <div class="update-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <p class="progress-text">0% complete</p>
                        <p class="progress-details"></p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Update download progress in dialog
     */
    updateDownloadProgress(progress) {
        const modal = document.querySelector('.update-progress-modal');
        if (!modal) return;

        const progressFill = modal.querySelector('.progress-fill');
        const progressText = modal.querySelector('.progress-text');
        const progressDetails = modal.querySelector('.progress-details');

        if (progressFill) {
            progressFill.style.width = `${progress.percent}%`;
        }

        if (progressText) {
            progressText.textContent = `${progress.percent.toFixed(1)}% complete`;
        }

        if (progressDetails && progress.bytesPerSecond) {
            const speedMB = (progress.bytesPerSecond / 1024 / 1024).toFixed(2);
            const downloadedMB = (progress.transferred / 1024 / 1024).toFixed(2);
            const totalMB = (progress.total / 1024 / 1024).toFixed(2);
            progressDetails.textContent = `${downloadedMB} MB / ${totalMB} MB (${speedMB} MB/s)`;
        }
    }

    /**
     * Show update ready dialog
     */
    showUpdateReadyDialog(info) {
        // Remove progress modal if it exists
        const progressModal = document.querySelector('.update-progress-modal');
        if (progressModal) progressModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog app-update-dialog">
                <div class="modal-header">
                    <h2>Update Ready</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="update-info">
                        <p class="update-success">Update version ${info.version} has been downloaded successfully!</p>
                        <p>The update will be installed when you restart the application.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Restart Later</button>
                    <button class="btn-primary" onclick="appUpdaterUI.installUpdate()">Restart Now</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Format release notes for display
     */
    formatReleaseNotes(notes) {
        if (typeof notes === 'string') {
            // Convert markdown-style lists to HTML
            return notes
                .split('\n')
                .map(line => {
                    line = line.trim();
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                        return `<li>${line.substring(2)}</li>`;
                    }
                    if (line.startsWith('## ')) {
                        return `<h4>${line.substring(3)}</h4>`;
                    }
                    if (line) {
                        return `<p>${line}</p>`;
                    }
                    return '';
                })
                .join('');
        }
        return notes;
    }

    /**
     * Add manual update check to settings
     */
    addToSettings() {
        // This will be called when settings panel is available
        // Add a section for app updates in the settings
        const settingsContainer = document.querySelector('.coverflow-settings');
        if (!settingsContainer) return;

        const updateSection = document.createElement('div');
        updateSection.className = 'settings-section';
        updateSection.innerHTML = `
            <h3>Application Updates</h3>
            <div class="setting-item">
                <label>Check for Updates</label>
                <button class="btn-primary" onclick="appUpdaterUI.checkForUpdates()">Check Now</button>
            </div>
            <div class="setting-item">
                <label>Current Version</label>
                <span id="app-version">Loading...</span>
            </div>
        `;

        // Insert at the top of settings
        settingsContainer.insertBefore(updateSection, settingsContainer.firstChild);

        // Load and display current version
        this.displayCurrentVersion();
    }

    /**
     * Display current app version
     */
    async displayCurrentVersion() {
        if (!window.electronAPI) return;

        try {
            const version = await window.electronAPI.getAppVersion();
            const versionEl = document.getElementById('app-version');
            if (versionEl) {
                versionEl.textContent = `v${version}`;
            }
        } catch (error) {
            console.error('[APP-UPDATE] Failed to get app version:', error);
        }
    }
}

// Create global instance
const appUpdaterUI = new AppUpdaterUI();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        appUpdaterUI.initializeAppUpdater();
    });
} else {
    appUpdaterUI.initializeAppUpdater();
}
