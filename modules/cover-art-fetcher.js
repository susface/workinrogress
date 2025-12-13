// Cover Art Fetcher Module
// Automatically fetch missing cover art from SteamGridDB and IGDB

class CoverArtFetcher {
    constructor() {
        this.steamGridDBApiKey = localStorage.getItem('steamgriddb-api-key') || '';
        this.igdbClientId = localStorage.getItem('igdb-client-id') || '';
        this.igdbAccessToken = localStorage.getItem('igdb-access-token') || '';
        this.cache = new Map();
        this.fetchQueue = [];
        this.isProcessingQueue = false;
        this.activeModal = null;
    }

    // Initialize the fetcher
    init() {
        console.log('[COVER_FETCHER] Cover Art Fetcher initialized');
        this.loadCache();
    }

    // Load cached results from localStorage
    loadCache() {
        try {
            const cached = localStorage.getItem('cover-art-cache');
            if (cached) {
                const data = JSON.parse(cached);
                this.cache = new Map(Object.entries(data));
                console.log(`[COVER_FETCHER] Loaded ${this.cache.size} cached entries`);
            }
        } catch (error) {
            console.error('[COVER_FETCHER] Failed to load cache:', error);
        }
    }

    // Save cache to localStorage
    saveCache() {
        try {
            const data = Object.fromEntries(this.cache);
            localStorage.setItem('cover-art-cache', JSON.stringify(data));
        } catch (error) {
            console.error('[COVER_FETCHER] Failed to save cache:', error);
        }
    }

    // Set API keys
    setApiKeys(steamGridDBKey, igdbClientId, igdbToken) {
        if (steamGridDBKey) {
            this.steamGridDBApiKey = steamGridDBKey;
            localStorage.setItem('steamgriddb-api-key', steamGridDBKey);
        }
        if (igdbClientId) {
            this.igdbClientId = igdbClientId;
            localStorage.setItem('igdb-client-id', igdbClientId);
        }
        if (igdbToken) {
            this.igdbAccessToken = igdbToken;
            localStorage.setItem('igdb-access-token', igdbToken);
        }
        console.log('[COVER_FETCHER] API keys updated');
    }

    // Search SteamGridDB for cover art
    async searchSteamGridDB(gameName, gameId = null) {
        if (!this.steamGridDBApiKey) {
            console.warn('[COVER_FETCHER] SteamGridDB API key not set');
            return { success: false, error: 'API key not configured' };
        }

        try {
            // First, search for the game
            let searchUrl;
            if (gameId && !isNaN(gameId)) {
                // Direct Steam App ID lookup
                searchUrl = `https://www.steamgriddb.com/api/v2/games/steam/${gameId}`;
            } else {
                // Search by name
                searchUrl = `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(gameName)}`;
            }

            const searchResponse = await fetch(searchUrl, {
                headers: {
                    'Authorization': `Bearer ${this.steamGridDBApiKey}`
                }
            });

            if (!searchResponse.ok) {
                throw new Error(`Search failed: ${searchResponse.status}`);
            }

            const searchData = await searchResponse.json();

            if (!searchData.success || !searchData.data || searchData.data.length === 0) {
                return { success: false, error: 'Game not found' };
            }

            // Get the first matching game's ID
            const sgdbGameId = Array.isArray(searchData.data) ? searchData.data[0].id : searchData.data.id;

            // Now fetch grids (cover art) for this game
            const gridsResponse = await fetch(`https://www.steamgriddb.com/api/v2/grids/game/${sgdbGameId}?dimensions=600x900,342x482&types=static,animated`, {
                headers: {
                    'Authorization': `Bearer ${this.steamGridDBApiKey}`
                }
            });

            if (!gridsResponse.ok) {
                throw new Error(`Grids fetch failed: ${gridsResponse.status}`);
            }

            const gridsData = await gridsResponse.json();

            if (!gridsData.success || !gridsData.data || gridsData.data.length === 0) {
                // Try heroes as fallback
                const heroesResponse = await fetch(`https://www.steamgriddb.com/api/v2/heroes/game/${sgdbGameId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.steamGridDBApiKey}`
                    }
                });

                if (heroesResponse.ok) {
                    const heroesData = await heroesResponse.json();
                    if (heroesData.success && heroesData.data && heroesData.data.length > 0) {
                        return {
                            success: true,
                            source: 'SteamGridDB',
                            type: 'hero',
                            results: heroesData.data.map(hero => ({
                                id: hero.id,
                                url: hero.url,
                                thumb: hero.thumb,
                                width: hero.width,
                                height: hero.height,
                                author: hero.author?.name || 'Unknown',
                                style: hero.style,
                                score: hero.score
                            }))
                        };
                    }
                }

                return { success: false, error: 'No cover art found' };
            }

            return {
                success: true,
                source: 'SteamGridDB',
                type: 'grid',
                results: gridsData.data.map(grid => ({
                    id: grid.id,
                    url: grid.url,
                    thumb: grid.thumb,
                    width: grid.width,
                    height: grid.height,
                    author: grid.author?.name || 'Unknown',
                    style: grid.style,
                    score: grid.score
                }))
            };

        } catch (error) {
            console.error('[COVER_FETCHER] SteamGridDB error:', error);
            return { success: false, error: error.message };
        }
    }

    // Search using free proxy service (no API key needed)
    async searchFreeCovers(gameName) {
        try {
            // Use Steam's public store API for cover art (no auth needed)
            const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&cc=us&l=en`;

            const response = await fetch(searchUrl);
            if (!response.ok) {
                throw new Error(`Steam search failed: ${response.status}`);
            }

            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                return { success: false, error: 'No games found on Steam' };
            }

            // Get cover art URLs from Steam CDN
            const results = data.items.slice(0, 10).map(item => ({
                id: item.id,
                name: item.name,
                url: `https://steamcdn-a.akamaihd.net/steam/apps/${item.id}/library_600x900_2x.jpg`,
                thumb: `https://steamcdn-a.akamaihd.net/steam/apps/${item.id}/capsule_231x87.jpg`,
                headerUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${item.id}/header.jpg`,
                source: 'Steam CDN'
            }));

            return {
                success: true,
                source: 'Steam CDN',
                type: 'grid',
                results
            };

        } catch (error) {
            console.error('[COVER_FETCHER] Free covers search error:', error);
            return { success: false, error: error.message };
        }
    }

    // Show cover art search modal
    showSearchModal(game) {
        if (this.activeModal) {
            this.closeModal();
        }

        const modal = document.createElement('div');
        modal.id = 'cover-fetcher-modal';
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
            overflow: auto;
        `;

        modal.innerHTML = `
            <div class="cover-fetcher-container" style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 15px;
                padding: 25px;
                max-width: 900px;
                width: 95%;
                max-height: 90vh;
                overflow: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            ">
                <div class="cover-fetcher-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #4fc3f7;">
                        <span style="margin-right: 10px;">🖼️</span>
                        Cover Art Fetcher
                    </h2>
                    <button id="close-fetcher" class="btn" style="font-size: 20px; padding: 5px 12px; background: rgba(255,255,255,0.1);">×</button>
                </div>

                <div class="fetcher-search" style="margin-bottom: 20px;">
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <input type="text" id="cover-search-input" value="${this.escapeHtml(game?.title || game?.name || '')}"
                            placeholder="Enter game name to search..."
                            style="flex: 1; padding: 12px 15px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; font-size: 16px;">
                        <button id="search-covers-btn" class="btn" style="padding: 12px 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">
                            🔍 Search
                        </button>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button id="search-steam-btn" class="source-btn" style="padding: 8px 15px; background: rgba(102, 192, 244, 0.2); border: 1px solid #66c0f4; border-radius: 5px; color: #66c0f4; cursor: pointer;">
                            Steam CDN (Free)
                        </button>
                        <button id="search-steamgriddb-btn" class="source-btn" style="padding: 8px 15px; background: rgba(255, 153, 0, 0.2); border: 1px solid #ff9900; border-radius: 5px; color: #ff9900; cursor: pointer;">
                            SteamGridDB
                        </button>
                        <button id="configure-api-btn" class="source-btn" style="padding: 8px 15px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 5px; color: rgba(255,255,255,0.7); cursor: pointer;">
                            ⚙️ API Settings
                        </button>
                    </div>
                </div>

                <div id="api-settings-panel" style="display: none; margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 10px;">
                    <h4 style="margin: 0 0 15px 0; color: #81c784;">API Configuration</h4>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">SteamGridDB API Key:</label>
                        <input type="text" id="steamgriddb-key-input" value="${this.steamGridDBApiKey}"
                            placeholder="Get free key from steamgriddb.com"
                            style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; color: white;">
                        <small style="color: rgba(255,255,255,0.5);">
                            <a href="https://www.steamgriddb.com/profile/preferences/api" target="_blank" style="color: #4fc3f7;">Get your free API key here</a>
                        </small>
                    </div>
                    <button id="save-api-keys-btn" class="btn" style="padding: 8px 20px; background: #4CAF50; border: none; border-radius: 5px; color: white; cursor: pointer;">
                        Save API Keys
                    </button>
                </div>

                <div id="cover-results" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; max-height: 500px; overflow-y: auto; padding: 10px 5px;">
                    <div class="placeholder" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                        <p style="font-size: 18px; margin-bottom: 10px;">Search for cover art above</p>
                        <p style="font-size: 14px;">Results will appear here</p>
                    </div>
                </div>

                <div id="fetcher-status" style="margin-top: 15px; padding: 10px; text-align: center; color: rgba(255,255,255,0.7); font-size: 14px;">
                    Ready to search
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.activeModal = modal;
        this.currentGame = game;

        // Setup event listeners
        this.setupModalEvents(modal, game);

        // Auto-search if game name is provided
        if (game?.title || game?.name) {
            setTimeout(() => {
                document.getElementById('search-steam-btn').click();
            }, 300);
        }
    }

    setupModalEvents(modal, game) {
        // Close button
        modal.querySelector('#close-fetcher').addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Search buttons
        modal.querySelector('#search-covers-btn').addEventListener('click', () => {
            const query = modal.querySelector('#cover-search-input').value;
            this.performSearch(query, 'steam');
        });

        modal.querySelector('#search-steam-btn').addEventListener('click', () => {
            const query = modal.querySelector('#cover-search-input').value;
            this.performSearch(query, 'steam');
        });

        modal.querySelector('#search-steamgriddb-btn').addEventListener('click', () => {
            const query = modal.querySelector('#cover-search-input').value;
            this.performSearch(query, 'steamgriddb');
        });

        // API settings toggle
        modal.querySelector('#configure-api-btn').addEventListener('click', () => {
            const panel = modal.querySelector('#api-settings-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        // Save API keys
        modal.querySelector('#save-api-keys-btn').addEventListener('click', () => {
            const steamGridDBKey = modal.querySelector('#steamgriddb-key-input').value;
            this.setApiKeys(steamGridDBKey);
            this.showStatus('API keys saved!', 'success');
        });

        // Enter key to search
        modal.querySelector('#cover-search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = modal.querySelector('#cover-search-input').value;
                this.performSearch(query, 'steam');
            }
        });
    }

    async performSearch(query, source = 'steam') {
        if (!query.trim()) {
            this.showStatus('Please enter a game name', 'error');
            return;
        }

        this.showStatus(`Searching ${source === 'steam' ? 'Steam CDN' : 'SteamGridDB'}...`, 'loading');

        let results;
        if (source === 'steamgriddb') {
            results = await this.searchSteamGridDB(query, this.currentGame?.app_id);
        } else {
            results = await this.searchFreeCovers(query);
        }

        this.displayResults(results);
    }

    displayResults(results) {
        const container = document.getElementById('cover-results');
        if (!container) return;

        if (!results.success) {
            container.innerHTML = `
                <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ff6b6b;">
                    <p style="font-size: 18px; margin-bottom: 10px;">❌ ${this.escapeHtml(results.error)}</p>
                    <p style="font-size: 14px; color: rgba(255,255,255,0.5);">Try a different search term or source</p>
                </div>
            `;
            this.showStatus('No results found', 'error');
            return;
        }

        container.innerHTML = results.results.map((cover, index) => `
            <div class="cover-result" data-index="${index}" style="
                cursor: pointer;
                border-radius: 8px;
                overflow: hidden;
                transition: transform 0.2s, box-shadow 0.2s;
                background: rgba(0,0,0,0.3);
                border: 2px solid transparent;
            ">
                <img src="${cover.thumb || cover.url}" alt="Cover ${index + 1}"
                    style="width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block;"
                    loading="lazy"
                    onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 150%22><rect fill=%22%23333%22 width=%22100%22 height=%22150%22/><text x=%2250%22 y=%2275%22 text-anchor=%22middle%22 fill=%22%23666%22>No Image</text></svg>'">
                <div style="padding: 8px; font-size: 12px;">
                    <div style="color: rgba(255,255,255,0.7);">${cover.author ? 'By ' + this.escapeHtml(cover.author) : cover.name ? this.escapeHtml(cover.name) : 'Steam'}</div>
                    ${cover.width ? `<div style="color: rgba(255,255,255,0.4);">${cover.width}×${cover.height}</div>` : ''}
                </div>
            </div>
        `).join('');

        // Store results for click handling
        this.currentResults = results.results;

        // Add click handlers
        container.querySelectorAll('.cover-result').forEach((el, index) => {
            el.addEventListener('click', () => {
                this.selectCover(results.results[index]);
            });

            el.addEventListener('mouseenter', () => {
                el.style.transform = 'scale(1.05)';
                el.style.boxShadow = '0 10px 30px rgba(79, 195, 247, 0.3)';
                el.style.borderColor = '#4fc3f7';
            });

            el.addEventListener('mouseleave', () => {
                el.style.transform = 'scale(1)';
                el.style.boxShadow = 'none';
                el.style.borderColor = 'transparent';
            });
        });

        this.showStatus(`Found ${results.results.length} covers from ${results.source}`, 'success');
    }

    async selectCover(cover) {
        if (!this.currentGame) {
            this.showStatus('No game selected', 'error');
            return;
        }

        this.showStatus('Applying cover art...', 'loading');

        try {
            // Get the full-size URL
            const coverUrl = cover.url;

            // Save to the game
            if (window.electronAPI && window.electronAPI.setCustomCover) {
                const result = await window.electronAPI.setCustomCover(
                    this.currentGame.id,
                    coverUrl,
                    'grid',
                    cover.source || 'SteamGridDB'
                );

                if (result.success) {
                    this.showStatus('Cover art applied successfully!', 'success');

                    // Update the game's cover in memory
                    this.currentGame.boxart_path = coverUrl;
                    this.currentGame.image = coverUrl;

                    // Refresh coverflow if available
                    if (window.coverflow && typeof window.coverflow.createCovers === 'function') {
                        // Update the game in allAlbums
                        const games = window.coverflow.allAlbums || [];
                        const gameIndex = games.findIndex(g => g.id === this.currentGame.id);
                        if (gameIndex !== -1) {
                            games[gameIndex].boxart_path = coverUrl;
                            games[gameIndex].image = coverUrl;
                        }
                        window.coverflow.createCovers();
                    }

                    // Cache the result
                    this.cache.set(this.currentGame.id.toString(), {
                        url: coverUrl,
                        fetchedAt: Date.now()
                    });
                    this.saveCache();

                    // Close modal after a delay
                    setTimeout(() => {
                        this.closeModal();
                    }, 1000);
                } else {
                    throw new Error(result.error || 'Failed to save cover');
                }
            } else {
                // Fallback for non-Electron environment
                // Save to localStorage custom covers
                const customCovers = JSON.parse(localStorage.getItem('custom-cover-art') || '{}');
                customCovers[this.currentGame.id] = coverUrl;
                localStorage.setItem('custom-cover-art', JSON.stringify(customCovers));

                this.currentGame.image = coverUrl;

                if (window.coverflow) {
                    const games = window.coverflow.allAlbums || [];
                    const gameIndex = games.findIndex(g => g.id === this.currentGame.id);
                    if (gameIndex !== -1) {
                        games[gameIndex].image = coverUrl;
                    }
                    if (typeof window.coverflow.createCovers === 'function') {
                        window.coverflow.createCovers();
                    }
                }

                this.showStatus('Cover art applied!', 'success');
                setTimeout(() => {
                    this.closeModal();
                }, 1000);
            }

        } catch (error) {
            console.error('[COVER_FETCHER] Failed to apply cover:', error);
            this.showStatus(`Failed: ${error.message}`, 'error');
        }
    }

    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('fetcher-status');
        if (!statusEl) return;

        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            loading: '#4fc3f7',
            info: 'rgba(255,255,255,0.7)'
        };

        statusEl.style.color = colors[type] || colors.info;
        statusEl.innerHTML = type === 'loading'
            ? `<span class="spinner-small"></span> ${message}`
            : message;
    }

    closeModal() {
        if (this.activeModal) {
            this.activeModal.remove();
            this.activeModal = null;
        }
        this.currentGame = null;
        this.currentResults = null;
    }

    // Batch fetch missing covers
    async fetchMissingCovers(games) {
        const gamesWithoutCovers = games.filter(game => {
            return !game.boxart_path && !game.image && !this.cache.has(game.id?.toString());
        });

        if (gamesWithoutCovers.length === 0) {
            console.log('[COVER_FETCHER] All games have covers');
            return { processed: 0, success: 0, failed: 0 };
        }

        console.log(`[COVER_FETCHER] Fetching covers for ${gamesWithoutCovers.length} games`);

        let success = 0;
        let failed = 0;

        for (const game of gamesWithoutCovers) {
            try {
                const results = await this.searchFreeCovers(game.title || game.name);

                if (results.success && results.results.length > 0) {
                    // Use the first result
                    const cover = results.results[0];

                    // Cache it
                    this.cache.set(game.id.toString(), {
                        url: cover.url,
                        fetchedAt: Date.now()
                    });

                    game.image = cover.url;
                    success++;
                } else {
                    failed++;
                }

                // Rate limiting - wait between requests
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`[COVER_FETCHER] Failed for ${game.title}:`, error);
                failed++;
            }
        }

        this.saveCache();

        return {
            processed: gamesWithoutCovers.length,
            success,
            failed
        };
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Cleanup
    destroy() {
        this.closeModal();
        this.cache.clear();
    }
}

// Initialize globally
if (typeof window !== 'undefined') {
    window.coverArtFetcher = new CoverArtFetcher();
    window.coverArtFetcher.init();
}
