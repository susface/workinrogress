/**
 * UI Components for CoverFlow Game Launcher
 * Enhanced UI features including view modes, filters, stats, and duplicate manager
 */

class UIComponents {
    constructor() {
        this.currentView = 'coverflow'; // coverflow, grid, list
        this.serverURL = 'http://localhost:5000'; // Flask server URL for loading images
        this.filterState = {
            platform: null,
            genre: null,
            search: '',
            favoritesOnly: false,
            showHidden: false,
            sortBy: 'title',
            sortOrder: 'ASC'
        };
        this.init();
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

        // Add to controls area
        const controls = document.querySelector('.controls') || document.body;
        controls.insertBefore(switcher, controls.firstChild);
    }

    switchView(viewMode) {
        this.currentView = viewMode;

        // Update button states
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewMode);
        });

        // Hide/show appropriate containers
        const coverflowContainer = document.querySelector('#canvas-container');
        const gridContainer = document.querySelector('#grid-view');
        const listContainer = document.querySelector('#list-view');

        if (coverflowContainer) coverflowContainer.style.display = viewMode === 'coverflow' ? 'block' : 'none';
        if (gridContainer) gridContainer.style.display = viewMode === 'grid' ? 'block' : 'none';
        if (listContainer) listContainer.style.display = viewMode === 'list' ? 'block' : 'none';

        // Trigger view-specific rendering
        this.renderView(viewMode);
    }

    async renderView(viewMode) {
        if (!window.electronAPI) return;

        // Get games based on filter state
        const result = await window.electronAPI.filterGames(this.filterState);
        if (!result.success) return;

        const games = result.games;

        switch (viewMode) {
            case 'grid':
                this.renderGridView(games);
                break;
            case 'list':
                this.renderListView(games);
                break;
            case 'coverflow':
                // CoverFlow is handled by existing coverflow.js
                break;
        }
    }

    renderGridView(games) {
        let container = document.querySelector('#grid-view');
        if (!container) {
            container = document.createElement('div');
            container.id = 'grid-view';
            container.className = 'grid-view-container';
            document.body.appendChild(container);
        }

        container.innerHTML = games.map(game => {
            const imagePath = game.boxart_path || game.icon_path;
            const imageSrc = imagePath ? `${this.serverURL}/${imagePath}` : 'placeholder.png';
            return `
            <div class="grid-item" data-game-id="${game.id}">
                <div class="grid-item-image">
                    <img src="${imageSrc}"
                         alt="${game.title}"
                         onerror="this.src='placeholder.png'"/>
                    ${game.is_favorite ? '<div class="favorite-badge">⭐</div>' : ''}
                </div>
                <div class="grid-item-info">
                    <h3>${game.title}</h3>
                    <p class="platform-badge ${game.platform}">${game.platform.toUpperCase()}</p>
                    ${game.total_play_time ? `<p class="play-time">${this.formatPlayTime(game.total_play_time)}</p>` : ''}
                </div>
                <div class="grid-item-actions">
                    <button class="btn-play" onclick="launchGame(${game.id}, '${game.launch_command}')">Play</button>
                    <button class="btn-favorite" onclick="toggleFavorite(${game.id})">
                        ${game.is_favorite ? '★' : '☆'}
                    </button>
                </div>
            </div>
            `;
        }).join('');
    }

    renderListView(games) {
        let container = document.querySelector('#list-view');
        if (!container) {
            container = document.createElement('div');
            container.id = 'list-view';
            container.className = 'list-view-container';
            document.body.appendChild(container);
        }

        container.innerHTML = `
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
                        const imageSrc = imagePath ? `${this.serverURL}/${imagePath}` : 'placeholder.png';
                        return `
                        <tr data-game-id="${game.id}">
                            <td><img src="${imageSrc}" width="40" height="40" onerror="this.src='placeholder.png'"/></td>
                            <td>
                                <strong>${game.title}</strong>
                                ${game.is_favorite ? ' ⭐' : ''}
                            </td>
                            <td><span class="platform-badge ${game.platform}">${game.platform.toUpperCase()}</span></td>
                            <td>${this.formatPlayTime(game.total_play_time || 0)}</td>
                            <td>${game.last_played ? new Date(game.last_played).toLocaleDateString() : 'Never'}</td>
                            <td>${this.renderStars(game.user_rating || 0)}</td>
                            <td>
                                <button class="btn-play" onclick="launchGame(${game.id}, '${game.launch_command}')">Play</button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
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
                const imageSrc = imagePath ? `${this.serverURL}/${imagePath}` : 'placeholder.png';
                return `
                <div class="stat-item">
                    <span class="rank">#${index + 1}</span>
                    <img src="${imageSrc}" width="30" height="30" onerror="this.src='placeholder.png'"/>
                    <span class="game-title">${game.title}</span>
                    <span class="game-stat">${this.formatPlayTime(game.total_play_time)}</span>
                </div>
                `;
            }).join('');

            // Recently played list
            const recentlyPlayedList = document.getElementById('recently-played-list');
            recentlyPlayedList.innerHTML = recentlyPlayed.games.map(game => {
                const imagePath = game.icon_path || game.boxart_path;
                const imageSrc = imagePath ? `${this.serverURL}/${imagePath}` : 'placeholder.png';
                return `
                <div class="stat-item">
                    <img src="${imageSrc}" width="30" height="30" onerror="this.src='placeholder.png'"/>
                    <span class="game-title">${game.title}</span>
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
        manager.id = 'duplicate-manager';
        manager.className = 'duplicate-manager';
        manager.style.display = 'none';
        manager.innerHTML = `
            <div class="duplicate-header">
                <h2>🔍 Duplicate Game Manager</h2>
                <button class="close-btn" onclick="document.getElementById('duplicate-manager').style.display='none'">×</button>
            </div>
            <div class="duplicate-content">
                <p class="duplicate-description">
                    Found games that exist on multiple platforms. Choose which version to keep visible.
                </p>
                <div id="duplicate-list"></div>
            </div>
        `;

        document.body.appendChild(manager);

        // Add duplicate button to controls
        const duplicateBtn = document.createElement('button');
        duplicateBtn.className = 'duplicate-btn';
        duplicateBtn.innerHTML = '🔍 Duplicates';
        duplicateBtn.onclick = () => this.showDuplicateManager();

        const controls = document.querySelector('.controls');
        if (controls) controls.appendChild(duplicateBtn);
    }

    async showDuplicateManager() {
        const manager = document.getElementById('duplicate-manager');
        manager.style.display = 'block';
        await this.loadDuplicates();
    }

    async loadDuplicates() {
        if (!window.electronAPI) return;

        try {
            const result = await window.electronAPI.findDuplicates();
            const duplicates = result.duplicates || [];

            const list = document.getElementById('duplicate-list');

            if (duplicates.length === 0) {
                list.innerHTML = '<p class="no-duplicates">✨ No duplicate games found! Your library is clean.</p>';
                return;
            }

            list.innerHTML = duplicates.map(dup => `
                <div class="duplicate-group">
                    <h3>${dup.title} <span class="duplicate-count">(${dup.count} versions)</span></h3>
                    <div class="duplicate-platforms">
                        ${dup.platforms.map((platform, index) => `
                            <div class="duplicate-platform">
                                <span class="platform-badge ${platform}">${platform.toUpperCase()}</span>
                                <button class="btn-hide-duplicate" onclick="hideDuplicate(${dup.game_ids[index]})">
                                    Hide This Version
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');

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
        // View mode switcher
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Filter toggle
        const filterToggle = document.getElementById('filter-toggle-btn');
        const filterPanel = document.getElementById('filter-panel');
        if (filterToggle) {
            filterToggle.addEventListener('click', () => {
                filterPanel.classList.toggle('collapsed');
            });
        }

        // Apply filters
        document.getElementById('apply-filters')?.addEventListener('click', async () => {
            this.filterState = {
                platform: document.getElementById('filter-platform').value || null,
                genre: document.getElementById('filter-genre').value || null,
                search_query: document.getElementById('filter-search').value || null,
                favoritesOnly: document.getElementById('filter-favorites').checked,
                showHidden: document.getElementById('filter-hidden').checked,
                sortBy: document.getElementById('filter-sort').value,
                sortOrder: document.getElementById('filter-order').value
            };

            await this.renderView(this.currentView);
        });

        // Reset filters
        document.getElementById('reset-filters')?.addEventListener('click', () => {
            this.filterState = {
                platform: null,
                genre: null,
                search: '',
                favoritesOnly: false,
                showHidden: false,
                sortBy: 'title',
                sortOrder: 'ASC'
            };

            document.getElementById('filter-platform').value = '';
            document.getElementById('filter-genre').value = '';
            document.getElementById('filter-search').value = '';
            document.getElementById('filter-favorites').checked = false;
            document.getElementById('filter-hidden').checked = false;
            document.getElementById('filter-sort').value = 'title';
            document.getElementById('filter-order').value = 'ASC';
        });
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
document.addEventListener('DOMContentLoaded', () => {
    window.uiComponents = new UIComponents();
});
