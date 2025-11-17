/**
 * Update Notifications Module
 * Checks for and displays game update notifications
 */

class UpdateNotifications {
    constructor() {
        this.updateBadge = null;
        this.pendingUpdates = [];
        this.checkInterval = null;
    }

    /**
     * Initialize update notifications
     */
    initializeUpdateNotifications() {
        // Create update badge in UI
        this.createUpdateBadge();

        // Check for updates on startup
        this.checkForUpdates();

        // Auto-check every 6 hours
        this.checkInterval = setInterval(() => {
            this.checkForUpdates();
        }, 6 * 60 * 60 * 1000);

        console.log('[UPDATES] Update notifications initialized');
    }

    /**
     * Create update badge UI
     */
    createUpdateBadge() {
        const topControls = document.getElementById('top-controls');
        if (!topControls) return;

        // Check if badge already exists
        if (document.getElementById('update-badge')) return;

        const badge = document.createElement('div');
        badge.id = 'update-badge';
        badge.className = 'update-badge hidden';
        badge.innerHTML = `
            <span class="update-icon">🔔</span>
            <span class="update-count">0</span>
        `;
        badge.title = 'Game updates available';
        badge.addEventListener('click', () => this.showUpdatesPanel());

        topControls.insertBefore(badge, topControls.firstChild);
        this.updateBadge = badge;
    }

    /**
     * Check for game updates
     */
    async checkForUpdates() {
        if (!window.electronAPI) {
            console.log('[UPDATES] Update checking requires Electron mode');
            return;
        }

        try {
            const result = await window.electronAPI.checkGameUpdates();
            if (result.success && result.updates) {
                this.pendingUpdates = result.updates;
                this.updateBadgeCount();

                if (this.pendingUpdates.length > 0) {
                    this.showUpdateToast();
                }
            }
        } catch (error) {
            console.error('[UPDATES] Failed to check for updates:', error);
        }
    }

    /**
     * Update badge count
     */
    updateBadgeCount() {
        if (!this.updateBadge) return;

        const count = this.pendingUpdates.length;
        const countEl = this.updateBadge.querySelector('.update-count');

        if (count > 0) {
            this.updateBadge.classList.remove('hidden');
            countEl.textContent = count > 99 ? '99+' : count;
        } else {
            this.updateBadge.classList.add('hidden');
        }
    }

    /**
     * Show update toast notification
     */
    showUpdateToast() {
        const count = this.pendingUpdates.length;
        if (count === 0) return;

        const message = count === 1
            ? `1 game update available`
            : `${count} game updates available`;

        if (typeof this.showToast === 'function') {
            this.showToast(message, 'info');
        } else if (window.coverflow && typeof window.coverflow.showToast === 'function') {
            window.coverflow.showToast(message, 'info');
        }
    }

    /**
     * Show updates panel
     */
    showUpdatesPanel() {
        if (this.pendingUpdates.length === 0) {
            this.showToast('No updates available', 'info');
            return;
        }

        // Create or show updates modal
        this.createUpdatesModal();
        this.renderUpdatesList();

        const modal = document.getElementById('updates-modal');
        if (modal) {
            modal.classList.add('visible');
        }
    }

    /**
     * Create updates modal
     */
    createUpdatesModal() {
        const existing = document.getElementById('updates-modal');
        if (existing) return;

        const modal = document.createElement('div');
        modal.id = 'updates-modal';
        modal.className = 'updates-modal modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔔 Game Updates Available</h3>
                    <button class="close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div id="updates-list" class="updates-list">
                        <div class="loading">Loading updates...</div>
                    </div>
                    <div class="updates-actions">
                        <button id="update-all-btn" class="btn primary">Update All</button>
                        <button id="dismiss-updates-btn" class="btn">Dismiss</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.close-btn').addEventListener('click', () => {
            this.closeUpdatesModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeUpdatesModal();
            }
        });

        document.getElementById('update-all-btn').addEventListener('click', () => {
            this.updateAllGames();
        });

        document.getElementById('dismiss-updates-btn').addEventListener('click', () => {
            this.closeUpdatesModal();
        });
    }

    /**
     * Render updates list
     */
    renderUpdatesList() {
        const container = document.getElementById('updates-list');
        if (!container) return;

        if (this.pendingUpdates.length === 0) {
            container.innerHTML = '<div class="empty-state">No updates available</div>';
            return;
        }

        container.innerHTML = this.pendingUpdates.map((update, index) => `
            <div class="update-item">
                <div class="update-game-info">
                    <div class="update-game-title">${update.title}</div>
                    <div class="update-platform">${update.platform || 'Unknown'}</div>
                </div>
                <div class="update-details">
                    <div class="update-version">
                        ${update.currentVersion || 'Unknown'} → ${update.newVersion || 'Latest'}
                    </div>
                    <div class="update-size">${this.formatSize(update.downloadSize)}</div>
                </div>
                <button class="update-game-btn" data-index="${index}">
                    Update
                </button>
            </div>
        `).join('');

        // Add click handlers to individual update buttons
        container.querySelectorAll('.update-game-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.updateGame(this.pendingUpdates[index]);
            });
        });
    }

    /**
     * Update a single game
     */
    async updateGame(update) {
        if (!window.electronAPI) return;

        try {
            this.showToast(`Updating ${update.title}...`, 'info');

            const result = await window.electronAPI.updateGame(update.gameId);
            if (result.success) {
                this.showToast(`${update.title} updated successfully!`, 'success');

                // Remove from pending updates
                this.pendingUpdates = this.pendingUpdates.filter(u => u.gameId !== update.gameId);
                this.updateBadgeCount();
                this.renderUpdatesList();

                if (this.pendingUpdates.length === 0) {
                    this.closeUpdatesModal();
                }
            } else {
                this.showToast(`Failed to update ${update.title}`, 'error');
            }
        } catch (error) {
            console.error('[UPDATES] Failed to update game:', error);
            this.showToast(`Error updating ${update.title}`, 'error');
        }
    }

    /**
     * Update all games
     */
    async updateAllGames() {
        if (this.pendingUpdates.length === 0) return;

        this.showToast(`Updating ${this.pendingUpdates.length} games...`, 'info');

        for (const update of this.pendingUpdates) {
            await this.updateGame(update);
        }
    }

    /**
     * Close updates modal
     */
    closeUpdatesModal() {
        const modal = document.getElementById('updates-modal');
        if (modal) {
            modal.classList.remove('visible');
        }
    }

    /**
     * Format file size
     */
    formatSize(bytes) {
        if (!bytes || bytes === 0) return 'Unknown';

        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
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
