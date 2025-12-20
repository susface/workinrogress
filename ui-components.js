/**
 * UI Components for CoverFlow Game Launcher
 * Enhanced UI features including view modes, filters, stats, and duplicate manager
 */

class UIComponents {
    constructor() {
        this.currentView = 'coverflow'; // coverflow, grid, list
        // Configurable server URL - try to detect from environment or use default
        this.serverURL = this.detectServerURL();
        this.filterState = {
            platform: null,
            genre: null,
            search_query: null,
            favorites_only: false,
            show_hidden: false,
            vr_only: false,
            sort_by: 'title',
            sort_order: 'ASC'
        };
        // AbortController for cleaning up event listeners
        this.gridViewAbortController = null;
        this.listViewAbortController = null;
        this.duplicateListAbortController = null;
        this.mainAbortController = new AbortController();

        // Store IntersectionObservers for cleanup
        this._imageObservers = [];

        // App paths for Electron mode
        this.appPaths = null;
        this.isElectron = typeof window.electronAPI !== 'undefined';
        if (this.isElectron) {
            this.initializeAppPaths();
        }

        // View switching state
        this.isSwitchingView = false;
        this.lastViewSwitch = 0;

        // Track event listeners for cleanup
        this.eventListeners = [];

        this.init();
    }

    // Cleanup method to prevent memory leaks
    destroy() {
        // Clean up IntersectionObservers
        this._cleanupImageObservers();

        // Abort all AbortControllers
        if (this.gridViewAbortController) {
            this.gridViewAbortController.abort();
        }
        if (this.listViewAbortController) {
            this.listViewAbortController.abort();
        }
        if (this.duplicateListAbortController) {
            this.duplicateListAbortController.abort();
        }
        if (this.mainAbortController) {
            this.mainAbortController.abort();
        }

        // Remove any DOM elements created by this component
        const viewModeSwitcher = document.getElementById('view-mode-switcher');
        if (viewModeSwitcher) viewModeSwitcher.remove();

        const filterPanel = document.getElementById('filter-panel');
        if (filterPanel) filterPanel.remove();

        const statsDashboard = document.getElementById('stats-dashboard');
        if (statsDashboard) statsDashboard.remove();

        const duplicateManager = document.getElementById('duplicate-manager');
        if (duplicateManager) duplicateManager.remove();

        const gridView = document.getElementById('grid-view');
        if (gridView) gridView.remove();

        const listView = document.getElementById('list-view');
        if (listView) listView.remove();
    }

    // Initialize app paths for Electron mode
    async initializeAppPaths() {
        if (window.electronAPI && window.electronAPI.getAppPath) {
            this.appPaths = await window.electronAPI.getAppPath();
            console.log('UI Components - App paths initialized:', this.appPaths);
        }
    }

    // Detect server URL from environment or config
    detectServerURL() {
        // Check if there's a global config
        if (window.GAME_SCANNER_CONFIG && window.GAME_SCANNER_CONFIG.serverURL) {
            return window.GAME_SCANNER_CONFIG.serverURL;
        }
        // Check localStorage for saved server URL
        const savedURL = localStorage.getItem('game-scanner-server-url');
        if (savedURL) {
            return savedURL;
        }
        // Default to localhost
        return 'http://localhost:5000';
    }

    // Get the correct image source based on environment (Electron vs Browser)
    getImageSrc(imagePath, fallback = 'placeholder.png') {
        if (!imagePath) return fallback;

        // In Electron mode, convert to absolute file:// URLs
        if (this.isElectron) {
            // Check if already an absolute path with protocol
            if (imagePath.startsWith('http') || imagePath.startsWith('file://')) {
                return imagePath;
            }

            // Check if it's an absolute path (Windows: C:/ or Unix: /)
            if (imagePath.includes(':/') || imagePath.startsWith('/')) {
                // Convert to file:// URL
                const fileUrl = 'file:///' + imagePath.replace(/\\/g, '/');
                return fileUrl;
            }

            // It's a relative path - shouldn't happen but handle gracefully
            return imagePath;
        }

        // In browser mode, use Flask server URL
        return `${this.serverURL}/${imagePath}`;
    }

    // Helper to escape HTML to prevent XSS
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    init() {
        this.createViewModeSwitcher();
        this.createFilterPanel();
        this.createStatsDashboard();
        this.createDuplicateManager();
        this.attachEventListeners();
    }

    // ============================================
    // VIEW MODE SWITCHER
    // ============================================
    createViewModeSwitcher() {
        const switcher = document.createElement('div');
        switcher.id = 'view-mode-switcher';
        switcher.innerHTML = `
            <div class="view-mode-buttons">
                <button class="view-mode-btn active" data-view="coverflow" title="CoverFlow View">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M3 6h4v12H3zM10 3h4v18h-4zM17 6h4v12h-4z"/>
                    </svg>
                    <span>CoverFlow</span>
                </button>
                <button class="view-mode-btn" data-view="grid" title="Grid View">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="3" width="7" height="7"/>
                        <rect x="14" y="3" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/>
                    </svg>
                    <span>Grid</span>
                </button>
                <button class="view-mode-btn" data-view="list" title="List View">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="8" y1="6" x2="21" y2="6"/>
                        <line x1="8" y1="12" x2="21" y2="12"/>
                        <line x1="8" y1="18" x2="21" y2="18"/>
                        <line x1="3" y1="6" x2="3.01" y2="6"/>
                        <line x1="3" y1="12" x2="3.01" y2="12"/>
                        <line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                    <span>List</span>
                </button>
            </div>
        `;

        // Add to body
        document.body.appendChild(switcher);
    }

    switchView(viewMode) {
        // Prevent rapid switching or double-clicks
        const now = Date.now();
        if (this.isSwitchingView || (now - this.lastViewSwitch < 300)) {
            console.log('View switch in progress or too soon, ignoring...');
            return;
        }

        // Already in this view
        if (this.currentView === viewMode) {
            console.log('Already in', viewMode, 'view');
            return;
        }

        this.isSwitchingView = true;
        this.lastViewSwitch = now;
        this.currentView = viewMode;

        try {
            // Update button states
            document.querySelectorAll('.view-mode-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === viewMode);
            });

            // Get or create containers
            const coverflowContainer = document.querySelector('#coverflow-container') || document.querySelector('#canvas-container');
            let gridContainer = document.querySelector('#grid-view');
            let listContainer = document.querySelector('#list-view');

            // Create containers if they don't exist
            if (!gridContainer && viewMode === 'grid') {
                gridContainer = document.createElement('div');
                gridContainer.id = 'grid-view';
                gridContainer.style.display = 'none';
                document.body.appendChild(gridContainer);
            }

            if (!listContainer && viewMode === 'list') {
                listContainer = document.createElement('div');
                listContainer.id = 'list-view';
                listContainer.style.display = 'none';
                document.body.appendChild(listContainer);
            }

            // Hide coverflow UI elements (info panel, thumbnails, controls)
            const infoPanel = document.querySelector('#info-panel');
            const thumbnailNav = document.querySelector('#thumbnail-nav');
            const controls = document.querySelector('#controls');
            const topBar = document.querySelector('#top-bar');

            if (viewMode === 'coverflow') {
                // Show coverflow, hide grid/list
                if (coverflowContainer) coverflowContainer.style.display = 'block';
                if (infoPanel) infoPanel.style.display = 'flex';
                if (thumbnailNav) thumbnailNav.style.display = 'flex';
                if (controls) controls.style.display = 'block';
                if (topBar) topBar.style.display = 'flex';
                if (gridContainer) gridContainer.style.display = 'none';
                if (listContainer) listContainer.style.display = 'none';
            } else {
                // Hide coverflow UI, show selected view
                if (coverflowContainer) coverflowContainer.style.display = 'none';
                if (infoPanel) infoPanel.style.display = 'none';
                if (thumbnailNav) thumbnailNav.style.display = 'none';
                if (controls) controls.style.display = 'none';
                if (topBar) topBar.style.display = 'none';
                if (gridContainer) gridContainer.style.display = viewMode === 'grid' ? 'block' : 'none';
                if (listContainer) listContainer.style.display = viewMode === 'list' ? 'block' : 'none';
            }

            // Trigger view-specific rendering
            if (viewMode !== 'coverflow') {
                this.renderView(viewMode);
            }
        } finally {
            // Reset switching flag after a short delay
            setTimeout(() => {
                this.isSwitchingView = false;
            }, 100);
        }
    }

    async renderView(viewMode) {
        if (!window.electronAPI) return;

        // Get games based on filter state
        const result = await window.electronAPI.filterGames(this.filterState);
        if (!result.success) return;

        // Convert SQLite integers to booleans
        const games = result.games.map(game => ({
            ...game,
            is_favorite: Boolean(game.is_favorite),
            is_hidden: Boolean(game.is_hidden)
        }));

        switch (viewMode) {
            case 'grid':
                this.renderGridView(games);
                break;
            case 'list':
                this.renderListView(games);
                break;
            case 'coverflow':
                // Apply advanced filters to CoverFlow
                if (window.coverFlow) {
                    window.coverFlow.applyAdvancedFilters(games);
                }
                break;
        }
    }

    renderGridView(games) {
        // Clean up previous event listeners
        if (this.gridViewAbortController) {
            this.gridViewAbortController.abort();
        }
        this.gridViewAbortController = new AbortController();

        let wrapper = document.querySelector('#grid-view');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'grid-view';
            document.body.appendChild(wrapper);
        }

        // PERFORMANCE: Use lazy loading for images and DocumentFragment for DOM operations
        const gridHtml = games.map(game => {
            const imagePath = game.boxart_path || game.icon_path;
            const imageSrc = this.getImageSrc(imagePath);
            const safeTitle = this.escapeHtml(game.title);
            const safePlatform = this.escapeHtml(game.platform);
            return `
            <div class="grid-item" data-game-id="${game.id}">
                <div class="grid-item-image">
                    <img src="placeholder.png"
                         data-src="${imageSrc}"
                         alt="${safeTitle}"
                         loading="lazy"
                         onerror="this.src='placeholder.png'"/>
                    ${game.update_available ? '<div class="update-badge">UPDATE</div>' : ''}
                    ${game.is_favorite ? '<div class="favorite-badge">⭐</div>' : ''}
                    ${game.has_vr_support ? '<div class="vr-badge">VR</div>' : ''}
                    ${game.has_dlc ? `<div class="dlc-badge">DLC ${game.dlc_count || ''}</div>` : ''}
                </div>
                <div class="grid-item-info">
                    <h3>${safeTitle}</h3>
                    <p class="platform-badge ${safePlatform}">${safePlatform.toUpperCase()}</p>
                    ${game.total_play_time ? `<p class="play-time">${this.formatPlayTime(game.total_play_time)}</p>` : ''}
                </div>
                <div class="grid-item-actions">
                    <button class="btn-play" data-game-id="${game.id}">Play</button>
                    <button class="btn-favorite" data-game-id="${game.id}">
                        ${game.is_favorite ? '★' : '☆'}
                    </button>
                </div>
            </div>
            `;
        }).join('');

        wrapper.innerHTML = `<div class="grid-view-container">${gridHtml}</div>`;

        // PERFORMANCE: Use IntersectionObserver for lazy loading images
        this._setupLazyLoading(wrapper);

        // Add event listeners for play and favorite buttons
        this.attachGridListEventListeners(wrapper, games, this.gridViewAbortController.signal);
    }

    // PERFORMANCE: Lazy load images as they come into view
    _setupLazyLoading(container) {
        // Clean up any previous observers to prevent memory leaks
        this._cleanupImageObservers();

        if (!('IntersectionObserver' in window)) {
            // Fallback: load all images immediately if IntersectionObserver not supported
            container.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
            });
            return;
        }

        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        delete img.dataset.src;
                    }
                    imageObserver.unobserve(img);
                }
            });
        }, { rootMargin: '50px' });

        // Store observer for cleanup
        this._imageObservers.push(imageObserver);

        container.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // Cleanup IntersectionObservers to prevent memory leaks
    _cleanupImageObservers() {
        if (this._imageObservers) {
            this._imageObservers.forEach(observer => {
                observer.disconnect();
            });
            this._imageObservers = [];
        }
    }

    renderListView(games) {
        // Clean up previous event listeners
        if (this.listViewAbortController) {
            this.listViewAbortController.abort();
        }
        this.listViewAbortController = new AbortController();

        let wrapper = document.querySelector('#list-view');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'list-view';
            document.body.appendChild(wrapper);
        }

        // PERFORMANCE: Use lazy loading for images
        const tableHtml = `
            <table class="list-table">
                <thead>
                    <tr>
                        <th>Cover</th>
                        <th>Title</th>
                        <th>Platform</th>
                        <th>Play Time</th>
                        <th>Last Played</th>
                        <th>Rating</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${games.map(game => {
                        const imagePath = game.icon_path || game.boxart_path;
                        const imageSrc = this.getImageSrc(imagePath);
                        const safeTitle = this.escapeHtml(game.title);
                        const safePlatform = this.escapeHtml(game.platform);
                        return `
                        <tr data-game-id="${game.id}">
                            <td><img src="placeholder.png" data-src="${imageSrc}" width="40" height="40" loading="lazy" onerror="this.src='placeholder.png'"/></td>
                            <td>
                                <strong>${safeTitle}</strong>
                                ${game.is_favorite ? ' ⭐' : ''}
                                ${game.has_vr_support ? ' <span class="vr-badge-inline">VR</span>' : ''}
                            </td>
                            <td><span class="platform-badge ${safePlatform}">${safePlatform.toUpperCase()}</span></td>
                            <td>${this.formatPlayTime(game.total_play_time || 0)}</td>
                            <td>${game.last_played ? new Date(game.last_played).toLocaleDateString() : 'Never'}</td>
                            <td>${this.renderStars(game.user_rating || 0)}</td>
                            <td>
                                <button class="btn-play" data-game-id="${game.id}">Play</button>
                                <button class="btn-favorite" data-game-id="${game.id}">
                                    ${game.is_favorite ? '★' : '☆'}
                                </button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        wrapper.innerHTML = `<div class="list-view-container">${tableHtml}</div>`;

        // PERFORMANCE: Use IntersectionObserver for lazy loading images
        this._setupLazyLoading(wrapper);

        // Add event listeners for play and favorite buttons
        this.attachGridListEventListeners(wrapper, games, this.listViewAbortController.signal);
    }

    attachGridListEventListeners(wrapper, games, signal) {
        // Create a map for quick lookup
        const gameMap = new Map(games.map(g => [g.id, g]));

        // Event delegation for play buttons with AbortController signal
        wrapper.addEventListener('click', async (e) => {
            const playBtn = e.target.closest('.btn-play');
            if (playBtn) {
                const gameId = parseInt(playBtn.dataset.gameId);
                const game = gameMap.get(gameId);
                if (game && game.launch_command) {
                    await launchGame(gameId, game.launch_command);
                }
                return;
            }

            // Event delegation for favorite buttons
            const favBtn = e.target.closest('.btn-favorite');
            if (favBtn) {
                const gameId = parseInt(favBtn.dataset.gameId);
                await toggleFavorite(gameId);
            }
        }, { signal });

        // Setup keyboard navigation for grid/list views
        this.setupGridListKeyboardNav(wrapper, games, signal);
    }

    setupGridListKeyboardNav(wrapper, games, signal) {
        let selectedIndex = 0;

        const keyHandler = (e) => {
            // Only handle if grid or list view is active
            if (this.currentView !== 'grid' && this.currentView !== 'list') return;

            const items = wrapper.querySelectorAll('.grid-item, .list-row');
            if (items.length === 0) return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    if (this.currentView === 'grid') {
                        // Move up one row (assume 4-5 items per row)
                        const itemsPerRow = Math.floor(wrapper.offsetWidth / 250) || 4;
                        selectedIndex = Math.max(0, selectedIndex - itemsPerRow);
                    } else {
                        selectedIndex = Math.max(0, selectedIndex - 1);
                    }
                    this.highlightGridListItem(items, selectedIndex);
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    if (this.currentView === 'grid') {
                        const itemsPerRow = Math.floor(wrapper.offsetWidth / 250) || 4;
                        selectedIndex = Math.min(items.length - 1, selectedIndex + itemsPerRow);
                    } else {
                        selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
                    }
                    this.highlightGridListItem(items, selectedIndex);
                    break;

                case 'ArrowLeft':
                    if (this.currentView === 'grid') {
                        e.preventDefault();
                        selectedIndex = Math.max(0, selectedIndex - 1);
                        this.highlightGridListItem(items, selectedIndex);
                    }
                    break;

                case 'ArrowRight':
                    if (this.currentView === 'grid') {
                        e.preventDefault();
                        selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
                        this.highlightGridListItem(items, selectedIndex);
                    }
                    break;

                case 'Enter':
                    e.preventDefault();
                    const gameId = parseInt(items[selectedIndex]?.dataset?.gameId);
                    const game = games.find(g => g.id === gameId);
                    if (game && game.launch_command) {
                        launchGame(gameId, game.launch_command);
                    }
                    break;
            }
        };

        document.addEventListener('keydown', keyHandler, { signal });
    }

    highlightGridListItem(items, index) {
        items.forEach((item, i) => {
            if (i === index) {
                item.style.outline = '3px solid #4fc3f7';
                item.style.outlineOffset = '2px';
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.style.outline = 'none';
            }
        });
    }

    // ============================================
    // FILTER PANEL
    // ============================================
    createFilterPanel() {
        const panel = document.createElement('div');
        panel.id = 'filter-panel';
        panel.className = 'filter-panel collapsed';
        panel.innerHTML = `
            <button class="filter-toggle" id="filter-toggle-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                Filters
            </button>
            <div class="filter-content">
                <h3>Filter & Sort</h3>

                <div class="filter-group">
                    <label>Platform</label>
                    <select id="filter-platform">
                        <option value="">All Platforms</option>
                        <option value="steam">Steam</option>
                        <option value="epic">Epic Games</option>
                        <option value="xbox">Xbox/Game Pass</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label>Search</label>
                    <input type="text" id="filter-search" placeholder="Search games..."/>
                </div>

                <div class="filter-group">
                    <label>Genre</label>
                    <input type="text" id="filter-genre" placeholder="e.g., Action, RPG"/>
                </div>

                <div class="filter-group">
                    <label>Sort By</label>
                    <select id="filter-sort">
                        <option value="title">Title</option>
                        <option value="last_played">Last Played</option>
                        <option value="total_play_time">Play Time</option>
                        <option value="launch_count">Most Launched</option>
                        <option value="created_at">Recently Added</option>
                        <option value="release_date">Release Date</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label>Order</label>
                    <select id="filter-order">
                        <option value="ASC">Ascending</option>
                        <option value="DESC">Descending</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="filter-favorites"/>
                        <span>Favorites Only</span>
                    </label>
                </div>

                <div class="filter-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="filter-hidden"/>
                        <span>Show Hidden</span>
                    </label>
                </div>

                <div class="filter-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="filter-vr"/>
                        <span>VR Only</span>
                    </label>
                </div>

                <div class="filter-actions">
                    <button class="btn-apply" id="apply-filters">Apply Filters</button>
                    <button class="btn-reset" id="reset-filters">Reset</button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
    }

    // ============================================
    // STATISTICS DASHBOARD
    // ============================================
    createStatsDashboard() {
        const dashboard = document.createElement('div');
        dashboard.id = 'stats-dashboard';
        dashboard.className = 'stats-dashboard';
        dashboard.style.display = 'none';
        dashboard.innerHTML = `
            <div class="stats-header">
                <h2>📊 Gaming Statistics</h2>
                <button class="close-btn" onclick="document.getElementById('stats-dashboard').style.display='none'">×</button>
            </div>
            <div class="stats-content">
                <div class="stats-overview">
                    <div class="stat-card">
                        <h3 id="total-games-stat">0</h3>
                        <p>Total Games</p>
                    </div>
                    <div class="stat-card">
                        <h3 id="total-playtime-stat">0h</h3>
                        <p>Total Play Time</p>
                    </div>
                    <div class="stat-card">
                        <h3 id="total-sessions-stat">0</h3>
                        <p>Gaming Sessions</p>
                    </div>
                    <div class="stat-card">
                        <h3 id="favorites-stat">0</h3>
                        <p>Favorites</p>
                    </div>
                </div>

                <div class="stats-section">
                    <h3>🏆 Most Played Games</h3>
                    <div id="most-played-list" class="stat-list"></div>
                </div>

                <div class="stats-section">
                    <h3>🕐 Recently Played</h3>
                    <div id="recently-played-list" class="stat-list"></div>
                </div>

                <div class="stats-section">
                    <h3>📦 Platform Breakdown</h3>
                    <div id="platform-chart" class="platform-chart"></div>
                </div>
            </div>
        `;

        document.body.appendChild(dashboard);

        // Add stats button to controls
        const statsBtn = document.createElement('button');
        statsBtn.className = 'stats-btn';
        statsBtn.innerHTML = '📊 Stats';
        statsBtn.onclick = () => this.showStatsDashboard();

        const controls = document.querySelector('.controls');
        if (controls) controls.appendChild(statsBtn);
    }

    async showStatsDashboard() {
        const dashboard = document.getElementById('stats-dashboard');
        dashboard.style.display = 'block';
        await this.loadStatistics();
    }

    async loadStatistics() {
        if (!window.electronAPI) return;

        try {
            const [gamesCount, mostPlayed, recentlyPlayed, favorites] = await Promise.all([
                window.electronAPI.getGamesCount(),
                window.electronAPI.getMostPlayed(5),
                window.electronAPI.getRecentlyPlayed(5),
                window.electronAPI.getFavorites()
            ]);

            // Update overview stats
            document.getElementById('total-games-stat').textContent = gamesCount.total || 0;
            document.getElementById('favorites-stat').textContent = favorites.games?.length || 0;

            // Calculate total play time
            const allGames = await window.electronAPI.getGames();
            const totalPlayTime = allGames.games.reduce((sum, game) => sum + (game.total_play_time || 0), 0);
            const totalSessions = allGames.games.reduce((sum, game) => sum + (game.launch_count || 0), 0);

            document.getElementById('total-playtime-stat').textContent = this.formatPlayTime(totalPlayTime);
            document.getElementById('total-sessions-stat').textContent = totalSessions;

            // Most played list
            const mostPlayedList = document.getElementById('most-played-list');
            mostPlayedList.innerHTML = mostPlayed.games.map((game, index) => {
                const imagePath = game.icon_path || game.boxart_path;
                const imageSrc = this.getImageSrc(imagePath);
                const safeTitle = this.escapeHtml(game.title);
                return `
                <div class="stat-item">
                    <span class="rank">#${index + 1}</span>
                    <img src="${imageSrc}" width="30" height="30" onerror="this.src='placeholder.png'"/>
                    <span class="game-title">${safeTitle}</span>
                    <span class="game-stat">${this.formatPlayTime(game.total_play_time)}</span>
                </div>
                `;
            }).join('');

            // Recently played list
            const recentlyPlayedList = document.getElementById('recently-played-list');
            recentlyPlayedList.innerHTML = recentlyPlayed.games.map(game => {
                const imagePath = game.icon_path || game.boxart_path;
                const imageSrc = this.getImageSrc(imagePath);
                const safeTitle = this.escapeHtml(game.title);
                return `
                <div class="stat-item">
                    <img src="${imageSrc}" width="30" height="30" onerror="this.src='placeholder.png'"/>
                    <span class="game-title">${safeTitle}</span>
                    <span class="game-stat">${new Date(game.last_played).toLocaleDateString()}</span>
                </div>
                `;
            }).join('');

            // Platform chart
            const platformChart = document.getElementById('platform-chart');
            const platforms = gamesCount.platforms || {};
            platformChart.innerHTML = Object.entries(platforms).map(([platform, count]) => `
                <div class="platform-bar">
                    <span class="platform-name">${platform.toUpperCase()}</span>
                    <div class="bar-container">
                        <div class="bar" style="width: ${(count / gamesCount.total * 100)}%"></div>
                    </div>
                    <span class="platform-count">${count}</span>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    // ============================================
    // DUPLICATE GAME MANAGER
    // ============================================
    createDuplicateManager() {
        const manager = document.createElement('div');
        manager.id = 'duplicate-game-manager';
        manager.className = 'duplicate-manager'; // Use a more generic class for styling
        manager.style.display = 'none';
        manager.innerHTML = `
            <div class="duplicate-header">
                <h2>🔍 Duplicate Game Manager</h2>
                <button class="close-btn">×</button>
            </div>
            <div class="duplicate-content">
                <p class="duplicate-description">
                    Found games that exist on multiple platforms. Choose which version to keep visible or hide.
                </p>
                <div id="duplicate-list" class="duplicate-list"></div>
            </div>
        `;

        document.body.appendChild(manager);

        // Add event listener to the close button of the duplicate manager panel
        const closeBtn = manager.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                manager.style.display = 'none';
            });
        }

        // Add "Manage Duplicates" button to the settings modal's Game Library section
        const reloadGamesBtn = document.getElementById('reload-games-btn');
        if (reloadGamesBtn && reloadGamesBtn.parentElement) {
            const duplicateBtnGroup = document.createElement('div');
            duplicateBtnGroup.className = 'setting-group';
            duplicateBtnGroup.innerHTML = `
                <button id="manage-duplicates-btn" class="btn">Manage Duplicates</button>
                <small class="setting-info">Find and manage duplicate games across different platforms.</small>
            `;
            reloadGamesBtn.parentElement.after(duplicateBtnGroup);

            // Add listener for the newly created button
            const manageDuplicatesBtn = document.getElementById('manage-duplicates-btn');
            if (manageDuplicatesBtn) {
                manageDuplicatesBtn.addEventListener('click', () => {
                    // Hide settings modal, then show the manager
                    const settingsModal = document.getElementById('settings-modal');
                    if (settingsModal) {
                        settingsModal.style.display = 'none';
                    }
                    this.showDuplicateManager();
                });
            }
        }
    }

    async showDuplicateManager() {
        const manager = document.getElementById('duplicate-game-manager');
        if (manager) {
            manager.style.display = 'block';
            await this.loadDuplicates();
        }
    }

    async loadDuplicates() {
        if (!window.electronAPI) return;

        try {
            const result = await window.electronAPI.findDuplicates();
            const duplicates = result.duplicates || [];

            // Clean up previous event listeners
            if (this.duplicateListAbortController) {
                this.duplicateListAbortController.abort();
            }
            this.duplicateListAbortController = new AbortController();

            let list = document.getElementById('duplicate-list');

            if (duplicates.length === 0) {
                list.innerHTML = '<p class="no-duplicates">✨ No duplicate games found! Your library is clean.</p>';
                return;
            }

            list.innerHTML = duplicates.map(dup => {
                const safeTitle = this.escapeHtml(dup.title);
                return `
                <div class="duplicate-group">
                    <h3>${safeTitle} <span class="duplicate-count">(${dup.count} versions)</span></h3>
                    <div class="duplicate-platforms">
                        ${dup.platforms.map((platform, index) => {
                            const safePlatform = this.escapeHtml(platform);
                            return `
                            <div class="duplicate-platform">
                                <span class="platform-badge ${safePlatform}">${safePlatform.toUpperCase()}</span>
                                <button class="btn-hide-duplicate" data-game-id="${dup.game_ids[index]}">
                                    Hide This Version
                                </button>
                            </div>
                        `;
                        }).join('')}
                    </div>
                </div>
                `;
            }).join('');

            // Add event delegation for hide buttons with AbortController signal
            list.addEventListener('click', async (e) => {
                const hideBtn = e.target.closest('.btn-hide-duplicate');
                if (hideBtn) {
                    const gameId = parseInt(hideBtn.dataset.gameId);
                    await hideDuplicate(gameId);
                }
            }, { signal: this.duplicateListAbortController.signal });

        } catch (error) {
            console.error('Error loading duplicates:', error);
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================
    formatPlayTime(seconds) {
        if (!seconds || seconds === 0) return '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    renderStars(rating) {
        if (!rating) return '—';
        const filled = '★'.repeat(rating);
        const empty = '☆'.repeat(5 - rating);
        return filled + empty;
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    attachEventListeners() {
        const signal = this.mainAbortController.signal;

        // View mode switcher
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            }, { signal });
        });

        // Filter toggle
        const filterToggle = document.getElementById('filter-toggle-btn');
        const filterPanel = document.getElementById('filter-panel');
        if (filterToggle) {
            filterToggle.addEventListener('click', () => {
                filterPanel.classList.toggle('collapsed');
            }, { signal });
        }

        // Apply filters
        const applyFiltersBtn = document.getElementById('apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', async () => {
                this.filterState = {
                    platform: document.getElementById('filter-platform').value || null,
                    genre: document.getElementById('filter-genre').value || null,
                    search_query: document.getElementById('filter-search').value || null,
                    favorites_only: document.getElementById('filter-favorites').checked,
                    show_hidden: document.getElementById('filter-hidden').checked,
                    vr_only: document.getElementById('filter-vr').checked,
                    sort_by: document.getElementById('filter-sort').value,
                    sort_order: document.getElementById('filter-order').value
                };

                await this.renderView(this.currentView);
            }, { signal });
        }

        // Reset filters
        const resetFiltersBtn = document.getElementById('reset-filters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', async () => {
                this.filterState = {
                    platform: null,
                    genre: null,
                    search_query: null,
                    favorites_only: false,
                    show_hidden: false,
                    vr_only: false,
                    sort_by: 'title',
                    sort_order: 'ASC'
                };

                document.getElementById('filter-platform').value = '';
                document.getElementById('filter-genre').value = '';
                document.getElementById('filter-search').value = '';
                document.getElementById('filter-favorites').checked = false;
                document.getElementById('filter-hidden').checked = false;
                document.getElementById('filter-vr').checked = false;
                document.getElementById('filter-sort').value = 'title';
                document.getElementById('filter-order').value = 'ASC';

                await this.renderView(this.currentView);
            }, { signal });
        }

        // Clear game data
        const clearGameDataBtn = document.getElementById('clear-game-data-btn');
        if (clearGameDataBtn) {
            clearGameDataBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete all game data? This action cannot be undone.')) {
                    await window.electronAPI.clearGameData();
                    // Refresh the view to show the empty library
                    await this.renderView(this.currentView);
                }
            }, { signal });
        }
    }
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================
async function launchGame(gameId, launchCommand) {
    if (!window.electronAPI) return;
    await window.electronAPI.launchGame(launchCommand, gameId);
}

async function toggleFavorite(gameId) {
    if (!window.electronAPI) return;
    await window.electronAPI.toggleFavorite(gameId);
    // Refresh view
    if (window.uiComponents) {
        await window.uiComponents.renderView(window.uiComponents.currentView);
    }
}

async function hideDuplicate(gameId) {
    if (!window.electronAPI) return;
    await window.electronAPI.toggleHidden(gameId);
    // Refresh duplicate list
    if (window.uiComponents) {
        await window.uiComponents.loadDuplicates();
    }
}

// Initialize on page load
function initUIComponents() {
    if (!window.uiComponents) {
        window.uiComponents = new UIComponents();
        // Add a cleanup function to be called on page unload
        window.addEventListener('beforeunload', () => {
            if (window.uiComponents && typeof window.uiComponents.destroy === 'function') {
                window.uiComponents.destroy();
            }
        });
    }
}

// Handle both cases: DOM already loaded or still loading
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUIComponents);
} else {
    // DOM is already loaded, initialize immediately
    initUIComponents();
}
