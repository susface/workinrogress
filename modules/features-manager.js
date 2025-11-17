/**
 * Features Manager
 * Initializes and manages all new features: Collections, Themes, Stats, Quick Launch
 */

class FeaturesManager {
    constructor() {
        this.quickLaunch = null;
        this.currentTheme = null;
        this.collections = [];
        this.recentGames = []; // Store recent games for safe event handling
        this.gameTags = null;
        this.recentLaunchedInterval = null; // Store interval ID for cleanup
        this.libraryExport = null;
        this.backlogManager = null;
        this.screenshotGallery = null;
        this.visualEffects = null;
    }

    /**
     * Escape HTML to prevent XSS attacks
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Initialize all features
     */
    async init(coverflowInstance) {
        this.coverflow = coverflowInstance;

        // Initialize Quick Launch
        if (window.QuickLaunch) {
            this.quickLaunch = new QuickLaunch();
            this.quickLaunch.init(this.coverflow.filteredAlbums || []);
        }

        // Initialize Game Tags
        if (window.GameTags) {
            this.gameTags = new GameTags();
            window.gameTags = this.gameTags; // Make globally accessible
        }

        // Initialize Library Export
        if (window.LibraryExport) {
            this.libraryExport = new LibraryExport();
            window.libraryExport = this.libraryExport; // Make globally accessible
        }

        // Initialize Backlog Manager
        if (window.BacklogManager) {
            this.backlogManager = new BacklogManager();
            window.backlogManager = this.backlogManager; // Make globally accessible
        }

        // Initialize Screenshot Gallery
        if (window.ScreenshotGallery) {
            this.screenshotGallery = new ScreenshotGallery();
            window.screenshotGallery = this.screenshotGallery; // Make globally accessible
        }

        // Load and apply theme
        await this.loadTheme();

        // Load collections
        await this.loadCollections();

        // Setup UI components
        this.setupCollectionsUI();
        this.setupThemeSwitcher();
        this.setupStatsButton();
        this.setupTagsButton();
        this.setupLibraryBackupButton();
        this.setupBacklogButton();
        this.setupScreenshotGalleryButton();
        this.setupVisualEffectsButton();
        this.setupRecentlyLaunched();
    }

    /**
     * Update games list in Quick Launch
     */
    updateQuickLaunchGames(games) {
        if (this.quickLaunch) {
            this.quickLaunch.updateGames(games);
            console.log(`[FEATURES] Updated Quick Launch with ${games.length} games`);
        }
    }

    /**
     * Refresh all features with new game data
     */
    refreshAllFeatures(games) {
        this.updateQuickLaunchGames(games);
        this.updateRecentlyLaunched();
        console.log('[FEATURES] Refreshed all features');
    }

    /**
     * Load and apply active theme
     */
    async loadTheme() {
        if (!window.electronAPI) return;

        try {
            const result = await window.electronAPI.getActiveTheme();
            if (result.success && result.theme) {
                this.applyTheme(result.theme);
            }
        } catch (error) {
            console.error('[THEME] Error loading theme:', error);
        }
    }

    /**
     * Apply theme colors
     */
    applyTheme(theme) {
        try {
            const colors = JSON.parse(theme.colors);
            const root = document.documentElement;

            root.style.setProperty('--primary-color', colors.primary || '#4fc3f7');
            root.style.setProperty('--secondary-color', colors.secondary || '#81c784');
            root.style.setProperty('--background-color', colors.background || '#000000');
            root.style.setProperty('--text-color', colors.text || '#ffffff');

            // Apply background if specified
            if (theme.background) {
                document.body.style.backgroundImage = `url(${theme.background})`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
            } else if (colors.background) {
                document.body.style.backgroundImage = 'none';
                document.body.style.backgroundColor = colors.background;
            }

            this.currentTheme = theme;
            console.log(`[THEME] Applied: ${theme.name}`);
        } catch (error) {
            console.error('[THEME] Error applying theme:', error);
        }
    }

    /**
     * Load collections
     */
    async loadCollections() {
        if (!window.electronAPI) return;

        try {
            const result = await window.electronAPI.getCollections();
            if (result.success) {
                this.collections = result.collections || [];
            }
        } catch (error) {
            console.error('[COLLECTIONS] Error loading:', error);
        }
    }

    /**
     * Setup collections sidebar UI
     */
    setupCollectionsUI() {
        // Add collections button to settings if not exists
        const settingsPanel = document.querySelector('.settings-panel');
        if (!settingsPanel || document.getElementById('collections-btn')) return;

        const collectionsBtn = document.createElement('button');
        collectionsBtn.id = 'collections-btn';
        collectionsBtn.className = 'setting-btn';
        collectionsBtn.innerHTML = '📁 Collections';
        collectionsBtn.onclick = () => this.showCollectionsModal();

        settingsPanel.insertBefore(collectionsBtn, settingsPanel.firstChild);
    }

    /**
     * Setup theme switcher UI
     */
    setupThemeSwitcher() {
        console.log('[FEATURES] Setting up theme switcher...');
        const themeBtn = document.getElementById('themes-btn');
        console.log('[FEATURES] Themes button element:', themeBtn);

        if (!themeBtn) {
            console.warn('[FEATURES] Themes button not found in top bar');
            return;
        }

        themeBtn.addEventListener('click', () => {
            console.log('[FEATURES] Themes button clicked');
            this.showThemesModal();
        });

        console.log('[FEATURES] Theme switcher initialized');
    }

    /**
     * Setup stats button
     */
    setupStatsButton() {
        const settingsPanel = document.querySelector('.settings-panel');
        if (!settingsPanel || document.getElementById('stats-btn')) return;

        const statsBtn = document.createElement('button');
        statsBtn.id = 'stats-btn';
        statsBtn.className = 'setting-btn';
        statsBtn.innerHTML = '📊 Statistics';
        statsBtn.onclick = () => this.showStatsModal();

        settingsPanel.insertBefore(statsBtn, settingsPanel.firstChild);
    }

    /**
     * Setup tags button
     */
    setupTagsButton() {
        // Find the setting group for game library
        const gameLibrarySection = document.querySelector('.setting-section-title');
        if (!gameLibrarySection || document.getElementById('tags-btn-inline')) return;

        // Add button after the game library section
        const tagsGroup = document.createElement('div');
        tagsGroup.className = 'setting-group';
        tagsGroup.innerHTML = `
            <button id="tags-btn-inline" class="btn">🏷️ Manage Tags</button>
            <small class="setting-info">Create custom tags to organize your games</small>
        `;

        // Insert after the media library divider
        const mediaSection = Array.from(document.querySelectorAll('.setting-section-title'))
            .find(el => el.textContent.includes('Media Library'));

        if (mediaSection && mediaSection.previousElementSibling) {
            mediaSection.previousElementSibling.after(tagsGroup);

            document.getElementById('tags-btn-inline').addEventListener('click', () => {
                if (this.gameTags) {
                    this.gameTags.showTagsUI();
                }
            });
        }
    }

    /**
     * Setup library backup button
     */
    setupLibraryBackupButton() {
        const gameLibrarySection = Array.from(document.querySelectorAll('.setting-section-title'))
            .find(el => el.textContent.includes('Game Library'));

        if (!gameLibrarySection || document.getElementById('library-backup-btn')) return;

        const backupGroup = document.createElement('div');
        backupGroup.className = 'setting-group';
        backupGroup.innerHTML = `
            <button id="library-backup-btn" class="btn">💾 Backup & Restore Library</button>
            <small class="setting-info">Export/import your game library with all metadata</small>
        `;

        // Add after clear game data button
        const clearDataBtn = document.getElementById('clear-game-data-btn');
        if (clearDataBtn && clearDataBtn.parentElement) {
            clearDataBtn.parentElement.after(backupGroup);

            document.getElementById('library-backup-btn').addEventListener('click', () => {
                if (this.libraryExport) {
                    this.libraryExport.showExportImportUI();
                }
            });
        }
    }

    /**
     * Setup backlog manager button
     */
    setupBacklogButton() {
        const gameLibrarySection = Array.from(document.querySelectorAll('.setting-section-title'))
            .find(el => el.textContent.includes('Game Library'));

        if (!gameLibrarySection || document.getElementById('backlog-btn')) return;

        const backlogGroup = document.createElement('div');
        backlogGroup.className = 'setting-group';
        backlogGroup.innerHTML = `
            <button id="backlog-btn" class="btn">📚 Game Backlog Manager</button>
            <small class="setting-info">Track games you want to play, completion status, and more</small>
        `;

        // Add after library backup button
        const libraryBackupBtn = document.getElementById('library-backup-btn');
        if (libraryBackupBtn && libraryBackupBtn.parentElement) {
            libraryBackupBtn.parentElement.after(backlogGroup);

            document.getElementById('backlog-btn').addEventListener('click', () => {
                if (this.backlogManager) {
                    this.backlogManager.showBacklogUI();
                }
            });
        }
    }

    /**
     * Setup screenshot gallery button
     */
    setupScreenshotGalleryButton() {
        const mediaLibrarySection = Array.from(document.querySelectorAll('.setting-section-title'))
            .find(el => el.textContent.includes('Media Library'));

        if (!mediaLibrarySection || document.getElementById('screenshot-gallery-btn')) return;

        const galleryGroup = document.createElement('div');
        galleryGroup.className = 'setting-group';
        galleryGroup.innerHTML = `
            <button id="screenshot-gallery-btn" class="btn">📸 Screenshot Gallery</button>
            <small class="setting-info">View and organize your game screenshots</small>
        `;

        // Add after media library section
        if (mediaLibrarySection.parentElement) {
            // Find the last setting-group in media library section
            const lastMediaGroup = Array.from(mediaLibrarySection.parentElement.querySelectorAll('.setting-group')).pop();
            if (lastMediaGroup) {
                lastMediaGroup.after(galleryGroup);
            } else {
                mediaLibrarySection.after(galleryGroup);
            }

            document.getElementById('screenshot-gallery-btn').addEventListener('click', () => {
                if (this.screenshotGallery) {
                    this.screenshotGallery.showGalleryUI();
                }
            });
        }
    }

    /**
     * Setup Visual Effects button in top bar
     */
    setupVisualEffectsButton() {
        console.log('[FEATURES] Setting up visual effects button...');
        const vfxBtn = document.getElementById('visual-effects-btn');
        console.log('[FEATURES] Visual Effects button element:', vfxBtn);

        if (!vfxBtn) {
            console.warn('[FEATURES] Visual Effects button not found in top bar');
            return;
        }

        vfxBtn.addEventListener('click', () => {
            console.log('[FEATURES] Visual Effects button clicked');
            if (window.visualEffectsManager) {
                window.visualEffectsManager.showSettingsUI();
            } else {
                alert('Visual Effects are initializing. Please wait a moment and try again.');
            }
        });

        console.log('[FEATURES] Visual Effects button initialized');
    }

    /**
     * Setup recently launched sidebar
     */
    setupRecentlyLaunched() {
        // Check if sidebar already exists
        if (document.getElementById('recently-launched-sidebar')) return;

        const sidebar = document.createElement('div');
        sidebar.id = 'recently-launched-sidebar';
        sidebar.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 250px;
            background: rgba(26, 26, 26, 0.95);
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            z-index: 100;
            transition: all 0.3s ease;
        `;

        sidebar.innerHTML = `
            <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #4fc3f7;">Recently Launched</h3>
            <div id="recent-games-list" style="max-height: 300px; overflow-y: auto;"></div>
        `;

        document.body.appendChild(sidebar);
        this.updateRecentlyLaunched();

        // Update every 30 seconds (only when tab is visible to save resources)
        this.recentLaunchedInterval = setInterval(() => {
            if (!document.hidden) {
                this.updateRecentlyLaunched();
            }
        }, 30000);

        // Watch for search input focus to move sidebar down
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('focus', () => {
                sidebar.style.top = '140px'; // Move down when search is active
            });
            searchInput.addEventListener('blur', () => {
                // Only move back up if search is empty
                if (!searchInput.value.trim()) {
                    sidebar.style.top = '80px';
                }
            });

            // Also watch for typing
            searchInput.addEventListener('input', () => {
                if (searchInput.value.trim()) {
                    sidebar.style.top = '140px';
                } else {
                    sidebar.style.top = '80px';
                }
            });
        }

        // Dynamic viewport repositioning
        const repositionSidebar = () => {
            const rect = sidebar.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const sidebarWidth = rect.width;

            // Handle very small screens first
            if (viewportWidth < 480) {
                sidebar.style.display = 'none';
                return;
            } else {
                sidebar.style.display = 'block';
            }

            // Check if sidebar is outside viewport horizontally
            // Determine current side based on which positioning property is set
            const isOnRight = sidebar.style.right && sidebar.style.right !== 'auto';
            const fitsOnRight = viewportWidth >= sidebarWidth + 40; // sidebar width + margins

            if (isOnRight && rect.right > viewportWidth) {
                // Move to left side if doesn't fit on right
                sidebar.style.right = 'auto';
                sidebar.style.left = '20px';
                console.log('[FEATURES] Sidebar repositioned to left (viewport width:', viewportWidth, 'px)');
            } else if (!isOnRight && fitsOnRight && rect.left > 40) {
                // Move back to right if there's now room and we're on the left
                sidebar.style.left = 'auto';
                sidebar.style.right = '20px';
                console.log('[FEATURES] Sidebar repositioned back to right');
            } else if (!isOnRight && rect.left < 0) {
                // If on left and going off screen, adjust position
                sidebar.style.left = '10px';
                console.log('[FEATURES] Sidebar adjusted to stay visible on left');
            }

            // Check vertical position
            if (rect.bottom > viewportHeight) {
                // Move up if going off bottom
                const newTop = viewportHeight - rect.height - 20;
                sidebar.style.top = `${Math.max(80, newTop)}px`;
                console.log('[FEATURES] Sidebar repositioned vertically (viewport height:', viewportHeight, 'px)');
            }
        };

        // Check on resize and scroll - throttled to prevent performance issues
        let resizeTimeout;
        const throttledReposition = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(repositionSidebar, 100);
        };

        window.addEventListener('resize', throttledReposition);
        window.addEventListener('scroll', throttledReposition);

        // Initial check
        setTimeout(repositionSidebar, 100);
    }

    /**
     * Update recently launched list
     */
    async updateRecentlyLaunched() {
        if (!window.electronAPI) return;

        try {
            const result = await window.electronAPI.getRecentlyPlayed(5);
            if (!result.success || !result.games) return;

            const container = document.getElementById('recent-games-list');
            if (!container) return;

            if (result.games.length === 0) {
                container.innerHTML = '<p style="color: #666; font-size: 12px; text-align: center;">No recent games</p>';
                return;
            }

            container.innerHTML = result.games.map((game, index) => `
                <div class="recent-game-item" data-game-index="${index}" style="
                    padding: 8px;
                    margin: 4px 0;
                    background: #2a2a2a;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background 0.2s;
                ">
                    <div style="font-size: 12px; color: #fff; font-weight: bold; margin-bottom: 2px;">${this.escapeHtml(game.title)}</div>
                    <div style="font-size: 10px; color: #888;">${this.escapeHtml(game.platform || 'PC')} • ${this.formatPlayTime(game.total_play_time || 0)}</div>
                </div>
            `).join('');

            // Store games data for event handlers (prevents XSS)
            this.recentGames = result.games;

            // Add click and hover effects with proper event listeners
            container.querySelectorAll('.recent-game-item').forEach((item, index) => {
                item.addEventListener('click', () => {
                    const game = this.recentGames[index];
                    if (game) {
                        this.launchGame(game.id, game.launch_command, game.title);
                    }
                });
                item.addEventListener('mouseenter', () => item.style.background = '#3a3a3a');
                item.addEventListener('mouseleave', () => item.style.background = '#2a2a2a');
            });
        } catch (error) {
            console.error('[RECENT] Error updating:', error);
        }
    }

    /**
     * Format playtime
     */
    formatPlayTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    /**
     * Launch game from recently played
     */
    async launchGame(gameId, launchCommand, title) {
        if (!window.electronAPI) {
            console.error('[RECENT] Electron API not available');
            return;
        }

        if (!launchCommand) {
            if (this.coverflow && typeof this.coverflow.showToast === 'function') {
                this.coverflow.showToast('Game has no launch command configured', 'error');
            }
            return;
        }

        if (!gameId) {
            console.error('[RECENT] Invalid game ID');
            return;
        }

        try {
            await window.electronAPI.launchGame(launchCommand, gameId);
            if (this.coverflow && typeof this.coverflow.showToast === 'function') {
                this.coverflow.showToast(`Launched ${this.escapeHtml(title)}`, 'success');
            }
            // Update recently launched list after successful launch
            setTimeout(() => this.updateRecentlyLaunched(), 1000);
        } catch (error) {
            console.error('[RECENT] Launch error:', error);
            if (this.coverflow && typeof this.coverflow.showToast === 'function') {
                this.coverflow.showToast(`Failed to launch: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Show collections modal
     */
    async showCollectionsModal() {
        // Implementation in next phase - basic modal for now
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        modal.innerHTML = `
            <div style="background: #1a1a1a; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%;">
                <h2 style="margin: 0 0 20px 0; color: #4fc3f7;">Game Collections</h2>
                <p style="color: #ccc;">Collections feature allows you to organize games into custom categories.</p>
                <p style="color: #888; font-size: 14px; margin: 20px 0;">Full UI coming soon! Database and APIs are ready.</p>
                <button onclick="this.closest('div').parentElement.remove()" style="
                    padding: 10px 20px;
                    background: #4fc3f7;
                    border: none;
                    border-radius: 6px;
                    color: #000;
                    cursor: pointer;
                    font-weight: bold;
                ">Close</button>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * Show themes modal
     */
    async showThemesModal() {
        if (!window.electronAPI) return;

        try {
            const result = await window.electronAPI.getThemes();
            if (!result.success) return;

            const themes = result.themes || [];

            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="background: #1a1a1a; padding: 30px; border-radius: 12px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <h2 style="margin: 0 0 20px 0; color: #4fc3f7;">Themes</h2>
                    <div id="themes-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
                        ${themes.map(theme => {
                            const colors = JSON.parse(theme.colors);
                            return `
                                <div class="theme-card" onclick="window.featuresManager.activateTheme(${theme.id})" style="
                                    padding: 16px;
                                    background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
                                    border-radius: 8px;
                                    cursor: pointer;
                                    border: 3px solid ${theme.is_active ? '#fff' : 'transparent'};
                                    transition: transform 0.2s;
                                ">
                                    <h3 style="margin: 0 0 8px 0; color: #fff; font-size: 14px;">${theme.name}</h3>
                                    <div style="display: flex; gap: 4px; margin-top: 8px;">
                                        <div style="width: 20px; height: 20px; background: ${colors.primary}; border-radius: 50%;"></div>
                                        <div style="width: 20px; height: 20px; background: ${colors.secondary}; border-radius: 50%;"></div>
                                        <div style="width: 20px; height: 20px; background: ${colors.background}; border-radius: 50%; border: 1px solid #666;"></div>
                                    </div>
                                    ${theme.is_active ? '<div style="margin-top: 8px; color: #fff; font-size: 11px;">✓ Active</div>' : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <button onclick="this.closest('div').parentElement.remove()" style="
                        padding: 10px 20px;
                        background: #4fc3f7;
                        border: none;
                        border-radius: 6px;
                        color: #000;
                        cursor: pointer;
                        font-weight: bold;
                    ">Close</button>
                </div>
            `;

            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            // Add hover effects
            modal.querySelectorAll('.theme-card').forEach(card => {
                card.addEventListener('mouseenter', () => card.style.transform = 'scale(1.05)');
                card.addEventListener('mouseleave', () => card.style.transform = 'scale(1)');
            });
        } catch (error) {
            console.error('[THEMES] Error showing modal:', error);
        }
    }

    /**
     * Activate theme
     */
    async activateTheme(themeId) {
        if (!window.electronAPI) return;

        try {
            await window.electronAPI.activateTheme(themeId);
            await this.loadTheme();

            if (this.coverflow && typeof this.coverflow.showToast === 'function') {
                this.coverflow.showToast('Theme activated', 'success');
            }

            // Close modal and reopen to show updated state
            const modal = document.querySelector('div[style*="z-index: 9999"]');
            if (modal) {
                modal.remove();
                setTimeout(() => this.showThemesModal(), 300);
            }
        } catch (error) {
            console.error('[THEMES] Error activating:', error);
        }
    }

    /**
     * Show stats modal
     */
    async showStatsModal() {
        if (!window.electronAPI) return;

        try {
            const result = await window.electronAPI.getPlaytimeStats('week');
            if (!result.success || !result.stats) return;

            const stats = result.stats;
            const totalHours = Math.floor(stats.totalPlaytime / 3600);
            const totalMinutes = Math.floor((stats.totalPlaytime % 3600) / 60);

            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="background: #1a1a1a; padding: 30px; border-radius: 12px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <h2 style="margin: 0 0 20px 0; color: #4fc3f7;">Playtime Statistics</h2>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 30px;">
                        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 32px; color: #4fc3f7; font-weight: bold;">${totalHours}h ${totalMinutes}m</div>
                            <div style="color: #888; font-size: 12px; margin-top: 4px;">Total Playtime</div>
                        </div>
                        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 32px; color: #81c784; font-weight: bold;">${stats.totalGames}</div>
                            <div style="color: #888; font-size: 12px; margin-top: 4px;">Games Played</div>
                        </div>
                        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 32px; color: #ff6b6b; font-weight: bold;">${stats.recentSessions.length}</div>
                            <div style="color: #888; font-size: 12px; margin-top: 4px;">Sessions (7 days)</div>
                        </div>
                    </div>

                    <h3 style="color: #4fc3f7; margin: 20px 0 10px 0;">Most Played Games</h3>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${stats.mostPlayed.slice(0, 10).map((game, index) => {
                            const hours = Math.floor(game.total_play_time / 3600);
                            const minutes = Math.floor((game.total_play_time % 3600) / 60);
                            return `
                                <div style="
                                    padding: 12px;
                                    margin: 4px 0;
                                    background: #2a2a2a;
                                    border-radius: 6px;
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                ">
                                    <div>
                                        <span style="color: #666; font-size: 12px; margin-right: 8px;">#${index + 1}</span>
                                        <span style="color: #fff; font-size: 14px;">${game.title}</span>
                                        <span style="color: #888; font-size: 12px; margin-left: 8px;">${game.platform || 'PC'}</span>
                                    </div>
                                    <div style="color: #4fc3f7; font-weight: bold;">${hours}h ${minutes}m</div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <button onclick="this.closest('div').parentElement.remove()" style="
                        padding: 10px 20px;
                        background: #4fc3f7;
                        border: none;
                        border-radius: 6px;
                        color: #000;
                        cursor: pointer;
                        font-weight: bold;
                        margin-top: 20px;
                    ">Close</button>
                </div>
            `;

            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        } catch (error) {
            console.error('[STATS] Error showing modal:', error);
        }
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.FeaturesManager = FeaturesManager;
}
