/**
 * Keyboard Navigation Module
 * Full keyboard navigation and custom hotkeys system
 */

class KeyboardNavigation {
    constructor() {
        this.hotkeys = {};
        this.defaultHotkeys = {
            // Navigation
            'ArrowLeft': () => this.navigate(-1),
            'ArrowRight': () => this.navigate(1),
            'Home': () => this.navigate(-9999),
            'End': () => this.navigate(9999),
            'PageUp': () => this.navigate(-10),
            'PageDown': () => this.navigate(10),

            // Actions
            'Enter': () => this.launchCurrentGame(),
            'Space': () => this.showGameInfo(),
            'f': () => this.toggleFullscreen(),
            'F11': () => this.toggleFullscreen(),
            's': () => this.openSettings(),
            'h': () => this.showHelpModal(),
            '/': () => this.focusSearch(),
            'Escape': () => this.closeModal(),

            // Rating
            '1': () => this.setRating(1),
            '2': () => this.setRating(2),
            '3': () => this.setRating(3),
            '4': () => this.setRating(4),
            '5': () => this.setRating(5),

            // Quick Actions
            'q': () => this.openQuickActions(),
            'a': () => this.showAnalytics(),
            'c': () => this.openCollections(),
            'b': () => this.openBacklog(),
            't': () => this.openTags(),

            // View Modes
            'v': () => this.cycleViewMode(),
            'r': () => this.randomGame(),

            // Favorites
            'F': () => this.toggleFavorite(),
            'H': () => this.toggleHidden(),

            // Media
            'F12': () => this.takeScreenshot()
        };

        this.modifierKeys = {
            ctrl: false,
            shift: false,
            alt: false,
            meta: false
        };

        this.quickActionsVisible = false;
        this.customHotkeys = this.loadCustomHotkeys();

        window.logger?.debug('KEYBOARD', 'Keyboard navigation initialized');
    }

    /**
     * Initialize keyboard navigation
     */
    initialize() {
        console.log('[KEYBOARD] Initializing keyboard navigation...');

        // Load custom hotkeys
        this.hotkeys = { ...this.defaultHotkeys, ...this.customHotkeys };

        // Add event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Prevent default browser shortcuts
        this.preventDefaultShortcuts();

        // Add visual keyboard navigation hints
        this.addNavigationHints();

        console.log('[KEYBOARD] ✓ Keyboard navigation initialized');
        console.log('[KEYBOARD] Press "H" for keyboard shortcuts help');
    }

    /**
     * Handle key down events
     */
    handleKeyDown(event) {
        // Update modifier keys state
        this.modifierKeys.ctrl = event.ctrlKey;
        this.modifierKeys.shift = event.shiftKey;
        this.modifierKeys.alt = event.altKey;
        this.modifierKeys.meta = event.metaKey;

        // Don't intercept if user is typing in input field
        if (this.isTyping()) {
            // Allow Escape to unfocus
            if (event.key === 'Escape') {
                document.activeElement.blur();
                event.preventDefault();
            }
            return;
        }

        // Build hotkey string
        const hotkeyString = this.buildHotkeyString(event);

        // Check if hotkey exists
        if (this.hotkeys[hotkeyString]) {
            event.preventDefault();
            this.hotkeys[hotkeyString]();
            window.logger?.debug('KEYBOARD', 'Hotkey triggered:', hotkeyString);
        } else if (this.hotkeys[event.key]) {
            event.preventDefault();
            this.hotkeys[event.key]();
            window.logger?.debug('KEYBOARD', 'Key triggered:', event.key);
        }
    }

    /**
     * Handle key up events
     */
    handleKeyUp(event) {
        // Update modifier keys state
        this.modifierKeys.ctrl = event.ctrlKey;
        this.modifierKeys.shift = event.shiftKey;
        this.modifierKeys.alt = event.altKey;
        this.modifierKeys.meta = event.metaKey;
    }

    /**
     * Build hotkey string from event
     */
    buildHotkeyString(event) {
        const parts = [];
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.shiftKey) parts.push('Shift');
        if (event.altKey) parts.push('Alt');
        if (event.metaKey) parts.push('Meta');

        // Add the key (convert to lowercase for letters)
        const key = event.key.length === 1 ? event.key : event.key;
        parts.push(key);

        return parts.join('+');
    }

    /**
     * Check if user is typing in an input field
     */
    isTyping() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true'
        );
    }

    /**
     * Prevent default browser shortcuts
     */
    preventDefaultShortcuts() {
        // Prevent F11 fullscreen (we'll handle it ourselves)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F11') {
                e.preventDefault();
            }
        });
    }

    /**
     * Add visual navigation hints
     */
    addNavigationHints() {
        // Add keyboard navigation indicator
        const indicator = document.createElement('div');
        indicator.id = 'keyboard-nav-indicator';
        indicator.innerHTML = '⌨️ Keyboard Navigation Active (Press H for help)';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            opacity: 0.7;
            transition: opacity 0.3s ease;
            pointer-events: none;
        `;
        document.body.appendChild(indicator);

        // Hide after 5 seconds
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }, 5000);
    }

    /**
     * Navigate through games
     */
    navigate(direction) {
        if (typeof this.navigateCovers === 'function') {
            if (direction === -9999) {
                this.currentIndex = 0;
                this.updateCoverflow();
            } else if (direction === 9999) {
                this.currentIndex = this.filteredAlbums.length - 1;
                this.updateCoverflow();
            } else {
                this.navigateCovers(direction);
            }
        }
    }

    /**
     * Launch current game
     */
    launchCurrentGame() {
        const currentAlbum = this.filteredAlbums?.[this.currentIndex];
        if (currentAlbum && typeof this.launchGame === 'function') {
            this.launchGame(currentAlbum);
        }
    }

    /**
     * Show game info modal
     */
    showGameInfo() {
        const currentAlbum = this.filteredAlbums?.[this.currentIndex];
        if (currentAlbum && typeof this.showInfoModal === 'function') {
            this.showInfoModal(currentAlbum);
        }
    }

    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * Open settings
     */
    openSettings() {
        const settingsBtn = document.querySelector('[onclick*="showSettingsPanel"]');
        if (settingsBtn) settingsBtn.click();
    }

    /**
     * Show help modal with keyboard shortcuts
     */
    showHelpModal() {
        const modal = document.getElementById('info-modal');
        if (!modal) return;

        modal.innerHTML = `
            <div class="keyboard-help-modal">
                <div class="modal-header">
                    <h2>⌨️ Keyboard Shortcuts</h2>
                    <button class="close-btn" onclick="document.getElementById('info-modal').style.display = 'none'">✕</button>
                </div>

                <div class="shortcuts-grid">
                    <div class="shortcut-section">
                        <h3>🎮 Navigation</h3>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <kbd>←</kbd><kbd>→</kbd>
                                <span>Navigate games</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Home</kbd>
                                <span>First game</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>End</kbd>
                                <span>Last game</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>PgUp</kbd><kbd>PgDn</kbd>
                                <span>Jump 10 games</span>
                            </div>
                        </div>
                    </div>

                    <div class="shortcut-section">
                        <h3>🚀 Actions</h3>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <kbd>Enter</kbd>
                                <span>Launch game</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Space</kbd>
                                <span>Show info</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>F</kbd>
                                <span>Toggle favorite</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>H</kbd>
                                <span>Toggle hidden</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>R</kbd>
                                <span>Random game</span>
                            </div>
                        </div>
                    </div>

                    <div class="shortcut-section">
                        <h3>⭐ Rating</h3>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <kbd>1</kbd>-<kbd>5</kbd>
                                <span>Set rating (1-5 stars)</span>
                            </div>
                        </div>
                    </div>

                    <div class="shortcut-section">
                        <h3>🔍 Search & Views</h3>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <kbd>/</kbd>
                                <span>Focus search</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>V</kbd>
                                <span>Cycle view mode</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Esc</kbd>
                                <span>Close modal/unfocus</span>
                            </div>
                        </div>
                    </div>

                    <div class="shortcut-section">
                        <h3>📊 Quick Access</h3>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <kbd>Q</kbd>
                                <span>Quick actions menu</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>A</kbd>
                                <span>Analytics dashboard</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>C</kbd>
                                <span>Collections</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>B</kbd>
                                <span>Backlog manager</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>T</kbd>
                                <span>Tags manager</span>
                            </div>
                        </div>
                    </div>

                    <div class="shortcut-section">
                        <h3>⚙️ System</h3>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <kbd>S</kbd>
                                <span>Settings</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>F</kbd> or <kbd>F11</kbd>
                                <span>Fullscreen</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>F12</kbd>
                                <span>Screenshot</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button onclick="document.getElementById('keyboard-settings-modal').style.display='flex'" class="primary-btn">
                        Customize Shortcuts
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    /**
     * Focus search input
     */
    focusSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('info-modal');
        if (modal && modal.style.display !== 'none') {
            modal.style.display = 'none';
        }
    }

    /**
     * Set rating for current game
     */
    async setRating(rating) {
        const currentAlbum = this.filteredAlbums?.[this.currentIndex];
        if (!currentAlbum) return;

        try {
            await window.electronAPI.setRating(currentAlbum.id, rating);
            currentAlbum.user_rating = rating;

            // Show toast
            if (typeof this.showToast === 'function') {
                this.showToast(`Rated "${currentAlbum.title}" ${rating} star${rating > 1 ? 's' : ''}`, 'success');
            }

            window.logger?.debug('KEYBOARD', `Rated ${currentAlbum.title} with ${rating} stars`);
        } catch (error) {
            console.error('Error setting rating:', error);
        }
    }

    /**
     * Open quick actions menu
     */
    openQuickActions() {
        if (this.quickActionsVisible) {
            this.hideQuickActions();
            return;
        }

        const menu = document.createElement('div');
        menu.id = 'quick-actions-menu';
        menu.className = 'quick-actions-menu';
        menu.innerHTML = `
            <div class="quick-actions-header">
                <h3>⚡ Quick Actions</h3>
                <button onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
            <div class="quick-actions-list">
                <button onclick="this.closest('.quick-actions-menu').remove(); if(window.coverflow.showAnalytics) window.coverflow.showAnalytics();">
                    📊 Analytics Dashboard
                </button>
                <button onclick="this.closest('.quick-actions-menu').remove(); if(window.coverflow.showCollections) window.coverflow.showCollections();">
                    📁 Collections
                </button>
                <button onclick="this.closest('.quick-actions-menu').remove(); if(window.coverflow.showBacklogManager) window.coverflow.showBacklogManager();">
                    📚 Backlog Manager
                </button>
                <button onclick="this.closest('.quick-actions-menu').remove(); if(window.coverflow.showScreenshotGallery) window.coverflow.showScreenshotGallery();">
                    📸 Screenshot Gallery
                </button>
                <button onclick="this.closest('.quick-actions-menu').remove(); if(window.coverflow.randomGame) window.coverflow.randomGame();">
                    🎲 Random Game
                </button>
                <button onclick="this.closest('.quick-actions-menu').remove(); if(window.coverflow.showRecentlyPlayed) window.coverflow.showRecentlyPlayed();">
                    🕒 Recently Played
                </button>
            </div>
        `;

        document.body.appendChild(menu);
        this.quickActionsVisible = true;

        // Auto-close when clicking outside
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    this.quickActionsVisible = false;
                }
            }, { once: true });
        }, 100);
    }

    /**
     * Hide quick actions
     */
    hideQuickActions() {
        const menu = document.getElementById('quick-actions-menu');
        if (menu) {
            menu.remove();
            this.quickActionsVisible = false;
        }
    }

    /**
     * Show analytics dashboard
     */
    showAnalytics() {
        if (typeof this.showAnalyticsDashboard === 'function') {
            this.showAnalyticsDashboard();
        }
    }

    /**
     * Open collections
     */
    openCollections() {
        const collectionsBtn = document.querySelector('[onclick*="showCollections"]');
        if (collectionsBtn) collectionsBtn.click();
    }

    /**
     * Open backlog manager
     */
    openBacklog() {
        const backlogBtn = document.querySelector('[onclick*="showBacklogManager"]');
        if (backlogBtn) backlogBtn.click();
    }

    /**
     * Open tags manager
     */
    openTags() {
        const tagsBtn = document.querySelector('[onclick*="showTagsManager"]');
        if (tagsBtn) tagsBtn.click();
    }

    /**
     * Cycle through view modes
     */
    cycleViewMode() {
        // This would cycle through: coverflow -> grid -> list
        if (typeof this.cycleView === 'function') {
            this.cycleView();
        }
    }

    /**
     * Select random game
     */
    randomGame() {
        if (typeof this.selectRandomGame === 'function') {
            this.selectRandomGame();
        }
    }

    /**
     * Toggle favorite status
     */
    async toggleFavorite() {
        const currentAlbum = this.filteredAlbums?.[this.currentIndex];
        if (!currentAlbum) return;

        try {
            const result = await window.electronAPI.toggleFavorite(currentAlbum.id);
            currentAlbum.is_favorite = result ? 1 : 0;

            if (typeof this.showToast === 'function') {
                this.showToast(
                    result ? `Added "${currentAlbum.title}" to favorites` : `Removed "${currentAlbum.title}" from favorites`,
                    'success'
                );
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    }

    /**
     * Toggle hidden status
     */
    async toggleHidden() {
        const currentAlbum = this.filteredAlbums?.[this.currentIndex];
        if (!currentAlbum) return;

        try {
            const result = await window.electronAPI.toggleHidden(currentAlbum.id);
            currentAlbum.is_hidden = result ? 1 : 0;

            if (typeof this.showToast === 'function') {
                this.showToast(
                    result ? `Hid "${currentAlbum.title}"` : `Unhid "${currentAlbum.title}"`,
                    'success'
                );
            }

            // Reload filtered albums
            if (typeof this.applyFilters === 'function') {
                this.applyFilters();
            }
        } catch (error) {
            console.error('Error toggling hidden:', error);
        }
    }

    /**
     * Take screenshot
     */
    takeScreenshot() {
        if (typeof this.captureScreenshot === 'function') {
            this.captureScreenshot();
        }
    }

    /**
     * Load custom hotkeys from storage
     */
    loadCustomHotkeys() {
        try {
            const saved = localStorage.getItem('customHotkeys');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading custom hotkeys:', error);
            return {};
        }
    }

    /**
     * Save custom hotkey
     */
    saveCustomHotkey(hotkey, action) {
        this.customHotkeys[hotkey] = action;
        this.hotkeys[hotkey] = action;
        localStorage.setItem('customHotkeys', JSON.stringify(this.customHotkeys));
    }

    /**
     * Reset to default hotkeys
     */
    resetHotkeys() {
        this.customHotkeys = {};
        this.hotkeys = { ...this.defaultHotkeys };
        localStorage.removeItem('customHotkeys');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardNavigation;
}
