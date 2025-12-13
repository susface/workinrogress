// Offline Mode Module
// Detect network status and provide full offline functionality

class OfflineModeManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.offlineCache = new Map();
        this.pendingSync = [];
        this.listeners = [];
        this.statusIndicator = null;
        this.lastOnlineCheck = null;
        this.checkInterval = null;

        // Bind handlers for proper event listener cleanup
        this._boundHandleOnline = this.handleOnline.bind(this);
        this._boundHandleOffline = this.handleOffline.bind(this);
    }

    // Initialize offline mode
    init() {
        console.log('[OFFLINE_MODE] Initializing offline mode manager');

        // Setup network event listeners using bound handlers for proper cleanup
        window.addEventListener('online', this._boundHandleOnline);
        window.addEventListener('offline', this._boundHandleOffline);

        // Create status indicator
        this.createStatusIndicator();

        // Load cached data
        this.loadCache();

        // Initial status check
        this.checkNetworkStatus();

        // Periodic network check (every 30 seconds)
        this.checkInterval = setInterval(() => this.checkNetworkStatus(), 30000);

        console.log(`[OFFLINE_MODE] Current status: ${this.isOnline ? 'Online' : 'Offline'}`);
    }

    // Create network status indicator
    createStatusIndicator() {
        // Remove existing indicator if present
        const existing = document.getElementById('offline-status-indicator');
        if (existing) existing.remove();

        const indicator = document.createElement('div');
        indicator.id = 'offline-status-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 9999;
            transition: all 0.3s ease;
            opacity: 0;
            transform: translateY(20px);
            pointer-events: none;
        `;

        document.body.appendChild(indicator);
        this.statusIndicator = indicator;

        // Only show when offline
        this.updateStatusIndicator();
    }

    // Update the status indicator
    updateStatusIndicator() {
        if (!this.statusIndicator) return;

        if (this.isOnline) {
            // Hide when online (briefly show "Back Online" message)
            this.statusIndicator.style.opacity = '0';
            this.statusIndicator.style.transform = 'translateY(20px)';
        } else {
            // Show when offline
            this.statusIndicator.innerHTML = `
                <span style="width: 10px; height: 10px; background: #ff9800; border-radius: 50%; animation: pulse 1.5s infinite;"></span>
                <span>Offline Mode</span>
            `;
            this.statusIndicator.style.background = 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';
            this.statusIndicator.style.color = 'white';
            this.statusIndicator.style.boxShadow = '0 4px 15px rgba(255, 152, 0, 0.4)';
            this.statusIndicator.style.opacity = '1';
            this.statusIndicator.style.transform = 'translateY(0)';
        }
    }

    // Handle going online
    handleOnline() {
        console.log('[OFFLINE_MODE] Network connection restored');
        this.isOnline = true;

        // Show brief "Back Online" notification
        this.showNotification('Back Online', 'success');

        // Sync pending changes
        this.syncPendingChanges();

        // Update indicator
        this.updateStatusIndicator();

        // Notify listeners
        this.notifyListeners('online');
    }

    // Handle going offline
    handleOffline() {
        console.log('[OFFLINE_MODE] Network connection lost');
        this.isOnline = false;

        // Show offline notification
        this.showNotification('You are offline. Changes will sync when back online.', 'warning');

        // Update indicator
        this.updateStatusIndicator();

        // Notify listeners
        this.notifyListeners('offline');
    }

    // Check network status (more reliable than just navigator.onLine)
    async checkNetworkStatus() {
        try {
            // Try to fetch a small resource
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('https://www.google.com/favicon.ico', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-store',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!this.isOnline) {
                this.handleOnline();
            }
            this.lastOnlineCheck = Date.now();

        } catch (error) {
            // Network request failed, we're offline
            if (this.isOnline) {
                this.handleOffline();
            }
        }
    }

    // Load cached data from localStorage
    loadCache() {
        try {
            // Load offline cache
            const cached = localStorage.getItem('offline-cache');
            if (cached) {
                const data = JSON.parse(cached);
                this.offlineCache = new Map(Object.entries(data));
                console.log(`[OFFLINE_MODE] Loaded ${this.offlineCache.size} cached items`);
            }

            // Load pending sync items
            const pending = localStorage.getItem('offline-pending-sync');
            if (pending) {
                this.pendingSync = JSON.parse(pending);
                console.log(`[OFFLINE_MODE] Loaded ${this.pendingSync.length} pending sync items`);
            }
        } catch (error) {
            console.error('[OFFLINE_MODE] Failed to load cache:', error);
        }
    }

    // Save cache to localStorage
    saveCache() {
        try {
            const data = Object.fromEntries(this.offlineCache);
            localStorage.setItem('offline-cache', JSON.stringify(data));
            localStorage.setItem('offline-pending-sync', JSON.stringify(this.pendingSync));
        } catch (error) {
            console.error('[OFFLINE_MODE] Failed to save cache:', error);
        }
    }

    // Cache data for offline use
    cacheData(key, data, ttl = 86400000) { // Default TTL: 24 hours
        this.offlineCache.set(key, {
            data,
            cachedAt: Date.now(),
            expiresAt: Date.now() + ttl
        });
        this.saveCache();
    }

    // Get cached data
    getCachedData(key) {
        const cached = this.offlineCache.get(key);
        if (!cached) return null;

        // Check if expired
        if (Date.now() > cached.expiresAt) {
            this.offlineCache.delete(key);
            this.saveCache();
            return null;
        }

        return cached.data;
    }

    // Queue an action for sync when online
    queueForSync(action) {
        this.pendingSync.push({
            ...action,
            queuedAt: Date.now()
        });
        this.saveCache();
        console.log(`[OFFLINE_MODE] Queued action for sync: ${action.type}`);
    }

    // Sync pending changes when back online
    async syncPendingChanges() {
        if (this.pendingSync.length === 0) return;

        console.log(`[OFFLINE_MODE] Syncing ${this.pendingSync.length} pending changes`);

        const toSync = [...this.pendingSync];
        this.pendingSync = [];
        this.saveCache();

        let synced = 0;
        let failed = 0;

        for (const action of toSync) {
            try {
                await this.processSyncAction(action);
                synced++;
            } catch (error) {
                console.error(`[OFFLINE_MODE] Failed to sync action:`, error);
                // Re-queue failed actions
                this.pendingSync.push(action);
                failed++;
            }
        }

        this.saveCache();

        if (synced > 0) {
            this.showNotification(`Synced ${synced} pending changes`, 'success');
        }
        if (failed > 0) {
            this.showNotification(`${failed} changes failed to sync`, 'error');
        }
    }

    // Process a sync action
    async processSyncAction(action) {
        switch (action.type) {
            case 'favorite':
                if (window.electronAPI) {
                    await window.electronAPI.toggleFavorite(action.gameId);
                }
                break;
            case 'rating':
                if (window.electronAPI) {
                    await window.electronAPI.setRating(action.gameId, action.rating);
                }
                break;
            case 'notes':
                if (window.electronAPI) {
                    await window.electronAPI.setNotes(action.gameId, action.notes);
                }
                break;
            default:
                console.warn(`[OFFLINE_MODE] Unknown sync action type: ${action.type}`);
        }
    }

    // Cache game data for offline access
    cacheGameData(games) {
        console.log(`[OFFLINE_MODE] Caching ${games.length} games for offline access`);

        // Store game data
        this.cacheData('games', games, 7 * 24 * 60 * 60 * 1000); // 7 days TTL

        // Store individual game data
        games.forEach(game => {
            this.cacheData(`game_${game.id}`, game);
        });

        console.log('[OFFLINE_MODE] Game data cached successfully');
    }

    // Get cached games when offline
    getCachedGames() {
        return this.getCachedData('games') || [];
    }

    // Cache cover art for offline access
    async cacheCoverArt(url, gameId) {
        if (!url || !gameId) return;

        try {
            // Convert URL to data URL for offline storage
            const response = await fetch(url);
            const blob = await response.blob();

            const reader = new FileReader();
            reader.onloadend = () => {
                this.cacheData(`cover_${gameId}`, reader.result);
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.warn(`[OFFLINE_MODE] Failed to cache cover for game ${gameId}:`, error);
        }
    }

    // Get cached cover art
    getCachedCover(gameId) {
        return this.getCachedData(`cover_${gameId}`);
    }

    // Add listener for network status changes
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    // Notify all listeners
    notifyListeners(status) {
        this.listeners.forEach(callback => {
            try {
                callback(status, this.isOnline);
            } catch (error) {
                console.error('[OFFLINE_MODE] Listener error:', error);
            }
        });
    }

    // Show notification
    showNotification(message, type = 'info') {
        const coverflowObj = window.coverflow || window.coverflowManager;
        if (coverflowObj && typeof coverflowObj.showToast === 'function') {
            coverflowObj.showToast(message, type);
        } else {
            console.log(`[OFFLINE_MODE] ${type}: ${message}`);
        }
    }

    // Wrapper for fetch that works offline
    async offlineFetch(url, options = {}) {
        const cacheKey = `fetch_${url}`;

        // Try to fetch if online
        if (this.isOnline) {
            try {
                const response = await fetch(url, options);
                const data = await response.json();

                // Cache the response
                this.cacheData(cacheKey, data);

                return { success: true, data, fromCache: false };
            } catch (error) {
                console.warn(`[OFFLINE_MODE] Fetch failed, trying cache: ${error.message}`);
            }
        }

        // Try to get from cache
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            return { success: true, data: cached, fromCache: true };
        }

        return { success: false, error: 'No network and no cached data available' };
    }

    // Check if specific functionality is available offline
    isFeatureAvailable(feature) {
        const offlineFeatures = [
            'browse_games',
            'view_stats',
            'manage_favorites',
            'manage_ratings',
            'manage_notes',
            'launch_games',
            'view_settings'
        ];

        const onlineOnlyFeatures = [
            'fetch_covers',
            'mod_browser',
            'youtube_music',
            'update_check',
            'sync_cloud'
        ];

        if (this.isOnline) return true;

        return offlineFeatures.includes(feature);
    }

    // Get offline status info
    getStatus() {
        return {
            isOnline: this.isOnline,
            cachedGamesCount: this.offlineCache.has('games')
                ? (this.getCachedData('games') || []).length
                : 0,
            pendingSyncCount: this.pendingSync.length,
            lastOnlineCheck: this.lastOnlineCheck,
            cacheSize: this.offlineCache.size
        };
    }

    // Clear all cached data
    clearCache() {
        this.offlineCache.clear();
        this.pendingSync = [];
        this.saveCache();
        console.log('[OFFLINE_MODE] Cache cleared');
    }

    // Cleanup
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        // Remove event listeners using bound handlers
        window.removeEventListener('online', this._boundHandleOnline);
        window.removeEventListener('offline', this._boundHandleOffline);

        if (this.statusIndicator) {
            this.statusIndicator.remove();
            this.statusIndicator = null;
        }

        // Clear all references
        this.listeners = [];
        this.offlineCache.clear();
        this.pendingSync = [];

        console.log('[OFFLINE_MODE] Offline mode manager destroyed');
    }
}

// Add CSS for pulse animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
`;
document.head.appendChild(style);

// Initialize globally
if (typeof window !== 'undefined') {
    window.offlineModeManager = new OfflineModeManager();

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.offlineModeManager.init();
        });
    } else {
        window.offlineModeManager.init();
    }
}
