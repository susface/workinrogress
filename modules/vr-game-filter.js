/**
 * VR Game Filtering Module
 * Detects and filters VR-compatible games
 */

class VRGameFilter {
    constructor() {
        this.vrGames = new Set();
        this.vrFilterEnabled = false;
    }

    /**
     * Initialize VR game filtering
     */
    initializeVRGameFilter() {
        window.logger?.debug('VR_FILTER', 'VR game filter initialized');
    }

    /**
     * Detect if a game supports VR
     */
    detectVRSupport(game) {
        if (!game) return false;

        // Check has_vr_support field from database
        if (game.has_vr_support) {
            return true;
        }

        // Check game title for VR keywords
        const vrKeywords = [
            'vr',
            'virtual reality',
            'oculus',
            'steamvr',
            'htc vive',
            'valve index',
            'quest',
            'psvr',
            'playstation vr',
            'meta quest'
        ];

        const title = (game.title || '').toLowerCase();
        const description = (game.description || '').toLowerCase();

        for (const keyword of vrKeywords) {
            if (title.includes(keyword) || description.includes(keyword)) {
                return true;
            }
        }

        // Check Steam app manifest for VR support
        if (game.platform === 'Steam' && game.install_dir) {
            // This would need to be checked via Electron API
            // For now, just mark games with VR in metadata
            return false;
        }

        return false;
    }

    /**
     * Scan all games and detect VR support
     */
    scanGamesForVR(games) {
        if (!games || !Array.isArray(games)) return;

        this.vrGames.clear();

        games.forEach((game, index) => {
            if (this.detectVRSupport(game)) {
                this.vrGames.add(index);
                window.logger?.trace('VR_FILTER', 'VR game detected:', game.title);
            }
        });

        window.logger?.info('VR_FILTER', 'Found', this.vrGames.size, 'VR games');
    }

    /**
     * Filter games to show only VR games
     */
    filterVRGames(games) {
        if (!this.vrFilterEnabled) {
            return games;
        }

        return games.filter((game, index) => {
            return this.vrGames.has(index) || this.detectVRSupport(game);
        });
    }

    /**
     * Toggle VR filter
     */
    toggleVRFilter() {
        this.vrFilterEnabled = !this.vrFilterEnabled;

        if (window.coverflow && typeof window.coverflow.filterAlbums === 'function') {
            window.coverflow.filterAlbums();
        }

        const status = this.vrFilterEnabled ? 'enabled' : 'disabled';
        this.showToast(`VR filter ${status}`, 'info');

        return this.vrFilterEnabled;
    }

    /**
     * Add VR badge to game info
     */
    addVRBadge(gameElement, game) {
        if (!this.detectVRSupport(game)) return;

        const badge = document.createElement('span');
        badge.className = 'vr-badge';
        badge.innerHTML = '🥽 VR';
        badge.title = 'VR Compatible';

        gameElement.appendChild(badge);
    }

    /**
     * Update Steam library to detect VR games
     */
    async updateSteamVRGames() {
        if (!window.electronAPI || typeof window.electronAPI.detectSteamVRGames !== 'function') {
            window.logger?.debug('VR_FILTER', 'Steam VR detection requires Electron mode');
            return;
        }

        try {
            const result = await window.electronAPI.detectSteamVRGames();
            if (result.success && result.vrGames) {
                result.vrGames.forEach(gameId => {
                    // Update database to mark game as VR-compatible
                    this.markGameAsVR(gameId);
                });
                this.showToast(`Detected ${result.vrGames.length} VR games`, 'success');
            }
        } catch (error) {
            window.logger?.error('VR_FILTER', 'Failed to detect Steam VR games:', error);
        }
    }

    /**
     * Mark game as VR-compatible in database
     */
    async markGameAsVR(gameId) {
        if (!window.electronAPI || typeof window.electronAPI.setGameVRSupport !== 'function') {
            return;
        }

        try {
            await window.electronAPI.setGameVRSupport(gameId, true);
        } catch (error) {
            window.logger?.error('VR_FILTER', 'Failed to mark game as VR:', error);
        }
    }

    /**
     * Create VR filter toggle button
     */
    createVRFilterButton() {
        const existingBtn = document.getElementById('vr-filter-btn');
        if (existingBtn) return;

        const button = document.createElement('button');
        button.id = 'vr-filter-btn';
        button.className = 'filter-btn';
        button.innerHTML = '🥽 VR Games';
        button.title = 'Show VR Games Only';

        button.addEventListener('click', () => {
            const enabled = this.toggleVRFilter();
            button.classList.toggle('active', enabled);
        });

        // Add to filter area
        const filterArea = document.querySelector('.filter-buttons');
        if (filterArea) {
            filterArea.appendChild(button);
        }
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
