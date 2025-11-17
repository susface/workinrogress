/**
 * Quick Launch Overlay Module
 * Fuzzy search popup activated by Ctrl+P for instant game launching
 */

class QuickLaunch {
    constructor() {
        this.overlay = null;
        this.input = null;
        this.results = null;
        this.games = [];
        this.filteredGames = [];
        this.selectedIndex = 0;
        this.isOpen = false;
        this.platformFilter = 'all';
        this.sortBy = 'relevance'; // 'relevance', 'playtime', 'alphabetical'
        this.keydownHandler = null; // Store handler reference for cleanup
    }

    /**
     * Initialize the quick launch overlay
     */
    init(games) {
        this.games = games || [];
        this.createOverlay();
        this.setupKeyboardShortcuts();
    }

    /**
     * Update games list
     */
    updateGames(games) {
        this.games = games || [];
    }

    /**
     * Create the overlay DOM structure
     */
    createOverlay() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'quick-launch-overlay';
        this.overlay.className = 'quick-launch-overlay';
        this.overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        // Create search container
        const container = document.createElement('div');
        container.className = 'quick-launch-container';
        container.style.cssText = `
            position: absolute;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            width: 600px;
            max-width: 90%;
            background: #1a1a1a;
            border-radius: 12px;
            box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
            overflow: hidden;
        `;

        // Create header with search input
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px;
            background: #252525;
            border-bottom: 2px solid #4fc3f7;
        `;

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.placeholder = 'Type to search games... (fuzzy search enabled)';
        this.input.style.cssText = `
            width: 100%;
            padding: 12px;
            font-size: 16px;
            background: #333;
            border: none;
            border-radius: 6px;
            color: #fff;
            outline: none;
        `;

        header.appendChild(this.input);

        // Create filter row
        const filterRow = document.createElement('div');
        filterRow.style.cssText = `
            padding: 12px 20px 0 20px;
            display: flex;
            gap: 10px;
            background: #252525;
        `;

        const platformSelect = document.createElement('select');
        platformSelect.id = 'quick-launch-platform-filter';
        platformSelect.style.cssText = `
            padding: 6px 10px;
            background: #333;
            border: 1px solid #444;
            border-radius: 4px;
            color: #fff;
            font-size: 12px;
            flex: 1;
        `;
        platformSelect.innerHTML = `
            <option value="all">All Platforms</option>
            <option value="steam">Steam</option>
            <option value="epic">Epic Games</option>
            <option value="xbox">Xbox/Game Pass</option>
        `;
        platformSelect.addEventListener('change', (e) => {
            this.platformFilter = e.target.value;
            this.handleSearch();
        });

        const sortSelect = document.createElement('select');
        sortSelect.id = 'quick-launch-sort';
        sortSelect.style.cssText = `
            padding: 6px 10px;
            background: #333;
            border: 1px solid #444;
            border-radius: 4px;
            color: #fff;
            font-size: 12px;
            flex: 1;
        `;
        sortSelect.innerHTML = `
            <option value="relevance">Sort: Relevance</option>
            <option value="playtime">Sort: Playtime</option>
            <option value="alphabetical">Sort: A-Z</option>
        `;
        sortSelect.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.handleSearch();
        });

        filterRow.appendChild(platformSelect);
        filterRow.appendChild(sortSelect);

        // Create results container
        this.results = document.createElement('div');
        this.results.className = 'quick-launch-results';
        this.results.style.cssText = `
            max-height: 400px;
            overflow-y: auto;
            padding: 8px;
        `;

        // Create footer with hints
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 12px 20px;
            background: #252525;
            border-top: 1px solid #333;
            font-size: 12px;
            color: #888;
            display: flex;
            justify-content: space-between;
        `;
        footer.innerHTML = `
            <span>↑↓ Navigate | Enter Launch | Esc Close</span>
            <span>Ctrl+P Quick Launch</span>
        `;

        container.appendChild(header);
        container.appendChild(filterRow);
        container.appendChild(this.results);
        container.appendChild(footer);
        this.overlay.appendChild(container);
        document.body.appendChild(this.overlay);

        // Setup event listeners
        this.input.addEventListener('input', () => this.handleSearch());
        this.input.addEventListener('keydown', (e) => this.handleKeyNavigation(e));

        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        this.keydownHandler = (e) => {
            // Ctrl+P or Cmd+P to open
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                this.toggle();
            }
            // Escape to close
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.keydownHandler);
    }

    /**
     * Fuzzy search algorithm
     */
    fuzzySearch(query, text) {
        if (!query) return { score: 0, matches: [] };

        query = query.toLowerCase();
        text = text.toLowerCase();

        let score = 0;
        let queryIndex = 0;
        let matches = [];

        for (let i = 0; i < text.length && queryIndex < query.length; i++) {
            if (text[i] === query[queryIndex]) {
                matches.push(i);
                // Higher score for consecutive matches
                if (queryIndex > 0 && matches[queryIndex - 1] === i - 1) {
                    score += 10;
                } else {
                    score += 5;
                }
                queryIndex++;
            }
        }

        // Bonus for matching all characters
        if (queryIndex === query.length) {
            score += 50;
            // Bonus for exact match
            if (text.includes(query)) {
                score += 100;
            }
            // Bonus for starts with
            if (text.startsWith(query)) {
                score += 150;
            }
        } else {
            score = 0; // Didn't match all characters
        }

        return { score, matches };
    }

    /**
     * Handle search input
     */
    handleSearch() {
        const query = this.input.value.trim();
        let games = [...this.games];

        // Apply platform filter
        if (this.platformFilter !== 'all') {
            games = games.filter(game =>
                (game.platform || '').toLowerCase() === this.platformFilter.toLowerCase()
            );
        }

        if (!query) {
            // Show filtered games
            this.filteredGames = games;
        } else {
            // Fuzzy search on filtered games
            const results = games.map(game => {
                const titleMatch = this.fuzzySearch(query, game.title);
                const platformMatch = this.fuzzySearch(query, game.platform || '');
                const developerMatch = this.fuzzySearch(query, game.developer || '');
                const score = Math.max(
                    titleMatch.score,
                    platformMatch.score * 0.3,
                    developerMatch.score * 0.2
                );

                return { game, score, matches: titleMatch.matches };
            })
            .filter(r => r.score > 0);

            this.filteredGames = results.map(r => r.game);
        }

        // Apply sorting
        this.applySorting();

        // Limit to 20 results
        this.filteredGames = this.filteredGames.slice(0, 20);

        this.selectedIndex = 0;
        this.renderResults();
    }

    /**
     * Apply sorting to filtered games
     */
    applySorting() {
        switch (this.sortBy) {
            case 'playtime':
                this.filteredGames.sort((a, b) =>
                    (b.total_play_time || 0) - (a.total_play_time || 0)
                );
                break;
            case 'alphabetical':
                this.filteredGames.sort((a, b) =>
                    (a.title || '').localeCompare(b.title || '')
                );
                break;
            case 'relevance':
            default:
                // Already sorted by search relevance if there's a query
                // Otherwise sort by playtime
                if (!this.input.value.trim()) {
                    this.filteredGames.sort((a, b) =>
                        (b.total_play_time || 0) - (a.total_play_time || 0)
                    );
                }
                break;
        }
    }

    /**
     * Render search results
     */
    renderResults() {
        this.results.innerHTML = '';

        if (this.filteredGames.length === 0) {
            this.results.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #666;">
                    No games found
                </div>
            `;
            return;
        }

        this.filteredGames.forEach((game, index) => {
            const item = document.createElement('div');
            item.className = 'quick-launch-item';
            item.style.cssText = `
                padding: 12px 16px;
                margin: 4px 0;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
                display: flex;
                align-items: center;
                gap: 12px;
                background: ${index === this.selectedIndex ? '#2a2a2a' : 'transparent'};
                border-left: 3px solid ${index === this.selectedIndex ? '#4fc3f7' : 'transparent'};
            `;

            // Platform badge
            const platformBadge = document.createElement('span');
            platformBadge.textContent = (game.platform || 'PC').toUpperCase();
            platformBadge.style.cssText = `
                padding: 4px 8px;
                font-size: 10px;
                border-radius: 4px;
                background: #4fc3f7;
                color: #000;
                font-weight: bold;
                min-width: 50px;
                text-align: center;
            `;

            // Title
            const title = document.createElement('div');
            title.style.cssText = `
                flex: 1;
                color: #fff;
                font-size: 14px;
            `;
            title.textContent = game.title;

            // Playtime
            if (game.total_play_time > 0) {
                const hours = Math.floor(game.total_play_time / 3600);
                const minutes = Math.floor((game.total_play_time % 3600) / 60);
                const playtime = document.createElement('span');
                playtime.textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                playtime.style.cssText = `
                    color: #81c784;
                    font-size: 12px;
                    min-width: 60px;
                    text-align: right;
                `;
                item.appendChild(platformBadge);
                item.appendChild(title);
                item.appendChild(playtime);
            } else {
                item.appendChild(platformBadge);
                item.appendChild(title);
            }

            // Click handler
            item.addEventListener('click', () => this.launchGame(game));

            // Hover handler
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.renderResults();
            });

            this.results.appendChild(item);
        });
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyNavigation(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredGames.length - 1);
                this.renderResults();
                this.scrollToSelected();
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.renderResults();
                this.scrollToSelected();
                break;

            case 'Enter':
                e.preventDefault();
                if (this.filteredGames[this.selectedIndex]) {
                    this.launchGame(this.filteredGames[this.selectedIndex]);
                }
                break;

            case 'Escape':
                e.preventDefault();
                this.close();
                break;
        }
    }

    /**
     * Scroll to selected item
     */
    scrollToSelected() {
        const items = this.results.querySelectorAll('.quick-launch-item');
        const selectedItem = items[this.selectedIndex];
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    /**
     * Launch selected game
     */
    async launchGame(game) {
        if (!window.electronAPI || !game.launch_command) return;

        try {
            console.log(`[QUICK_LAUNCH] Launching ${game.title}`);
            await window.electronAPI.launchGame(game.launch_command, game.id);
            this.close();

            // Show success toast if available
            if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                window.coverflow.showToast(`Launched ${game.title}`, 'success');
            }
        } catch (error) {
            console.error('[QUICK_LAUNCH] Error:', error);
            if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                window.coverflow.showToast(`Failed to launch: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Open overlay
     */
    open() {
        if (this.isOpen) return;

        this.overlay.style.display = 'block';
        this.isOpen = true;
        this.input.value = '';

        // Reset filters
        const platformSelect = document.getElementById('quick-launch-platform-filter');
        const sortSelect = document.getElementById('quick-launch-sort');
        if (platformSelect) platformSelect.value = 'all';
        if (sortSelect) sortSelect.value = 'relevance';
        this.platformFilter = 'all';
        this.sortBy = 'relevance';

        this.handleSearch(); // Show recent/popular games
        this.input.focus();

        // Add animation
        this.overlay.style.opacity = '0';
        setTimeout(() => {
            this.overlay.style.transition = 'opacity 0.2s';
            this.overlay.style.opacity = '1';
        }, 10);
    }

    /**
     * Close overlay
     */
    close() {
        if (!this.isOpen) return;

        this.overlay.style.opacity = '0';
        setTimeout(() => {
            this.overlay.style.display = 'none';
            this.isOpen = false;
        }, 200);
    }

    /**
     * Toggle overlay
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Cleanup event listeners
     */
    cleanup() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
    }
}

// Export for use in main app
if (typeof window !== 'undefined') {
    window.QuickLaunch = QuickLaunch;
}
