/**
 * Search Enhancements Module
 * Advanced search with fuzzy matching, filters, and voice search
 */

class SearchEnhancements {
    constructor() {
        this.recentSearches = this.loadRecentSearches();
        this.searchHistory = [];
        this.maxRecentSearches = 10;
        this.voiceRecognition = null;
        this.isVoiceActive = false;

        window.logger?.debug('SEARCH', 'Search enhancements initialized');
    }

    /**
     * Initialize search enhancements
     */
    initialize() {
        console.log('[SEARCH] Initializing search enhancements...');

        // Initialize fuzzy search
        this.initializeFuzzySearch();

        // Add advanced search UI
        this.addAdvancedSearchUI();

        // Initialize voice search if supported
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.initializeVoiceSearch();
        }

        console.log('[SEARCH] ✓ Search enhancements initialized');
    }

    /**
     * Initialize fuzzy search
     */
    initializeFuzzySearch() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;

        // Replace the existing search functionality with fuzzy search
        searchInput.addEventListener('input', (e) => {
            this.performFuzzySearch(e.target.value);
        });

        // Add recent searches dropdown
        searchInput.addEventListener('focus', () => {
            this.showRecentSearches();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideRecentSearches();
            }
        });
    }

    /**
     * Perform fuzzy search
     */
    performFuzzySearch(query) {
        if (!query || query.length < 2) {
            // Show all games if query is too short
            if (typeof this.applyFilters === 'function') {
                this.applyFilters();
            }
            return;
        }

        // Get all albums - check if they exist
        if (!this.albums || !Array.isArray(this.albums)) {
            console.warn('No albums available for search');
            return;
        }

        const allAlbums = this.albums;

        // Perform fuzzy matching
        const results = allAlbums.filter(album => {
            const score = this.fuzzyMatch(query.toLowerCase(), album.title.toLowerCase());
            album.searchScore = score;
            return score > 0.3; // Threshold for matching
        });

        // Sort by relevance score
        results.sort((a, b) => b.searchScore - a.searchScore);

        // Update filtered albums
        this.filteredAlbums = results;
        this.currentIndex = 0;

        // Update display
        if (typeof this.updateCoverflow === 'function') {
            this.updateCoverflow();
        }

        // Add to search history
        if (query.length >= 3) {
            this.addToSearchHistory(query);
        }

        window.logger?.debug('SEARCH', `Fuzzy search for "${query}" found ${results.length} results`);
    }

    /**
     * Fuzzy match algorithm
     * Returns a score between 0 and 1 indicating match quality
     */
    fuzzyMatch(query, text) {
        // Exact match
        if (text === query) return 1.0;

        // Contains match
        if (text.includes(query)) return 0.9;

        // Character-by-character fuzzy matching
        let score = 0;
        let queryIndex = 0;
        let textIndex = 0;
        let consecutiveMatches = 0;

        while (queryIndex < query.length && textIndex < text.length) {
            if (query[queryIndex] === text[textIndex]) {
                score += 1 + (consecutiveMatches * 0.5); // Bonus for consecutive matches
                consecutiveMatches++;
                queryIndex++;
            } else {
                consecutiveMatches = 0;
            }
            textIndex++;
        }

        // Normalize score
        const maxScore = query.length + (query.length * 0.5);
        score = score / maxScore;

        // Bonus for word boundary matches
        const words = text.split(/\s+/);
        for (const word of words) {
            if (word.startsWith(query)) {
                score += 0.2;
                break;
            }
        }

        // Bonus for initials match (e.g., "gta" matches "Grand Theft Auto")
        const initials = words.map(w => w[0]).join('');
        if (initials.includes(query)) {
            score += 0.3;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Show recent searches dropdown
     */
    showRecentSearches() {
        if (this.recentSearches.length === 0) return;

        // Remove existing dropdown
        this.hideRecentSearches();

        const searchContainer = document.querySelector('.search-container') || document.getElementById('search-input').parentElement;
        const dropdown = document.createElement('div');
        dropdown.className = 'recent-searches-dropdown';
        dropdown.innerHTML = `
            <div class="dropdown-header">
                <span>Recent Searches</span>
                <button onclick="window.coverflow.clearRecentSearches()" class="clear-btn">Clear</button>
            </div>
            <div class="dropdown-list">
                ${this.recentSearches.map((search, index) => `
                    <div class="dropdown-item" onclick="window.coverflow.selectRecentSearch('${search.replace(/'/g, "\\'")}')">
                        <span>🔍 ${search}</span>
                        <button onclick="event.stopPropagation(); window.coverflow.removeRecentSearch(${index})" class="remove-btn">✕</button>
                    </div>
                `).join('')}
            </div>
        `;

        searchContainer.appendChild(dropdown);
    }

    /**
     * Hide recent searches dropdown
     */
    hideRecentSearches() {
        const dropdown = document.querySelector('.recent-searches-dropdown');
        if (dropdown) dropdown.remove();
    }

    /**
     * Add to search history
     */
    addToSearchHistory(query) {
        // Remove duplicates
        this.recentSearches = this.recentSearches.filter(s => s !== query);

        // Add to beginning
        this.recentSearches.unshift(query);

        // Limit size
        if (this.recentSearches.length > this.maxRecentSearches) {
            this.recentSearches = this.recentSearches.slice(0, this.maxRecentSearches);
        }

        // Save to localStorage
        this.saveRecentSearches();
    }

    /**
     * Select recent search
     */
    selectRecentSearch(search) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = search;
            this.performFuzzySearch(search);
            this.hideRecentSearches();
        }
    }

    /**
     * Remove recent search
     */
    removeRecentSearch(index) {
        this.recentSearches.splice(index, 1);
        this.saveRecentSearches();
        this.showRecentSearches();
    }

    /**
     * Clear recent searches
     */
    clearRecentSearches() {
        this.recentSearches = [];
        this.saveRecentSearches();
        this.hideRecentSearches();
    }

    /**
     * Load recent searches from localStorage
     */
    loadRecentSearches() {
        try {
            const saved = localStorage.getItem('recentSearches');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading recent searches:', error);
            return [];
        }
    }

    /**
     * Save recent searches to localStorage
     */
    saveRecentSearches() {
        try {
            localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
        } catch (error) {
            console.error('Error saving recent searches:', error);
        }
    }

    /**
     * Add advanced search UI
     */
    addAdvancedSearchUI() {
        const searchContainer = document.querySelector('.search-container') || document.getElementById('search-input')?.parentElement;
        if (!searchContainer) return;

        // Add filter button
        const filterBtn = document.createElement('button');
        filterBtn.className = 'search-filter-btn';
        filterBtn.innerHTML = '🔍 Filters';
        filterBtn.onclick = () => this.showAdvancedFilters();
        searchContainer.appendChild(filterBtn);

        // Add voice search button if supported
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const voiceBtn = document.createElement('button');
            voiceBtn.className = 'voice-search-btn';
            voiceBtn.id = 'voice-search-btn';
            voiceBtn.innerHTML = '🎤';
            voiceBtn.onclick = () => this.toggleVoiceSearch();
            searchContainer.appendChild(voiceBtn);
        }
    }

    /**
     * Show advanced filters panel
     */
    showAdvancedFilters() {
        const modal = document.getElementById('info-modal');
        if (!modal) return;

        // Check if albums exist
        if (!this.albums || !Array.isArray(this.albums)) {
            console.warn('No albums available for filtering');
            return;
        }

        // Get unique platforms and genres
        const platforms = [...new Set(this.albums.map(a => a.platform))];
        const allGenres = new Set();
        this.albums.forEach(a => {
            if (a.genres && Array.isArray(a.genres)) {
                a.genres.forEach(g => allGenres.add(g));
            }
        });
        const genres = [...allGenres].sort();

        modal.innerHTML = `
            <div class="advanced-filters-panel">
                <div class="modal-header">
                    <h2>🔍 Advanced Search Filters</h2>
                    <button class="close-btn" onclick="document.getElementById('info-modal').style.display = 'none'">✕</button>
                </div>

                <div class="filters-content">
                    <div class="filter-group">
                        <h3>Platform</h3>
                        <div class="filter-options">
                            ${platforms.map(p => `
                                <label class="filter-checkbox">
                                    <input type="checkbox" value="${p}" data-filter="platform" ${this.isFilterActive('platform', p) ? 'checked' : ''}>
                                    <span>${p.charAt(0).toUpperCase() + p.slice(1)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="filter-group">
                        <h3>Genre</h3>
                        <div class="filter-options scrollable">
                            ${genres.map(g => `
                                <label class="filter-checkbox">
                                    <input type="checkbox" value="${g}" data-filter="genre" ${this.isFilterActive('genre', g) ? 'checked' : ''}>
                                    <span>${g}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="filter-group">
                        <h3>Status</h3>
                        <div class="filter-options">
                            <label class="filter-checkbox">
                                <input type="checkbox" value="favorites" data-filter="status" ${this.isFilterActive('status', 'favorites') ? 'checked' : ''}>
                                <span>⭐ Favorites Only</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="played" data-filter="status" ${this.isFilterActive('status', 'played') ? 'checked' : ''}>
                                <span>🎮 Played</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="unplayed" data-filter="status" ${this.isFilterActive('status', 'unplayed') ? 'checked' : ''}>
                                <span>📦 Unplayed</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="vr" data-filter="status" ${this.isFilterActive('status', 'vr') ? 'checked' : ''}>
                                <span>🥽 VR Games</span>
                            </label>
                        </div>
                    </div>

                    <div class="filter-group">
                        <h3>Sort By</h3>
                        <select id="sort-by" class="filter-select">
                            <option value="title">Title (A-Z)</option>
                            <option value="title-desc">Title (Z-A)</option>
                            <option value="playtime">Most Played</option>
                            <option value="playtime-asc">Least Played</option>
                            <option value="recent">Recently Played</option>
                            <option value="added">Recently Added</option>
                            <option value="rating">Highest Rated</option>
                        </select>
                    </div>
                </div>

                <div class="modal-footer">
                    <button onclick="window.coverflow.resetFilters()" class="secondary-btn">Reset All</button>
                    <button onclick="window.coverflow.applyAdvancedFilters()" class="primary-btn">Apply Filters</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        // Add change listeners
        const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                this.updateFilterState(cb.dataset.filter, cb.value, cb.checked);
            });
        });
    }

    /**
     * Check if filter is active
     */
    isFilterActive(type, value) {
        if (!this.activeFilters) this.activeFilters = {};
        if (!this.activeFilters[type]) return false;
        return this.activeFilters[type].includes(value);
    }

    /**
     * Update filter state
     */
    updateFilterState(type, value, checked) {
        if (!this.activeFilters) this.activeFilters = {};
        if (!this.activeFilters[type]) this.activeFilters[type] = [];

        if (checked) {
            if (!this.activeFilters[type].includes(value)) {
                this.activeFilters[type].push(value);
            }
        } else {
            this.activeFilters[type] = this.activeFilters[type].filter(v => v !== value);
        }
    }

    /**
     * Apply advanced filters
     */
    applyAdvancedFilters() {
        if (!this.albums || !Array.isArray(this.albums)) {
            console.warn('No albums available for filtering');
            return;
        }

        let filtered = [...this.albums];

        // Apply platform filters
        if (this.activeFilters?.platform && this.activeFilters.platform.length > 0) {
            filtered = filtered.filter(a => this.activeFilters.platform.includes(a.platform));
        }

        // Apply genre filters
        if (this.activeFilters?.genre && this.activeFilters.genre.length > 0) {
            filtered = filtered.filter(a => {
                if (!a.genres || !Array.isArray(a.genres)) return false;
                return a.genres.some(g => this.activeFilters.genre.includes(g));
            });
        }

        // Apply status filters
        if (this.activeFilters?.status && this.activeFilters.status.length > 0) {
            this.activeFilters.status.forEach(status => {
                if (status === 'favorites') {
                    filtered = filtered.filter(a => a.is_favorite);
                } else if (status === 'played') {
                    filtered = filtered.filter(a => a.total_play_time > 0);
                } else if (status === 'unplayed') {
                    filtered = filtered.filter(a => !a.total_play_time || a.total_play_time === 0);
                } else if (status === 'vr') {
                    filtered = filtered.filter(a => a.has_vr_support);
                }
            });
        }

        // Apply sorting
        const sortBy = document.getElementById('sort-by')?.value || 'title';
        this.sortGames(filtered, sortBy);

        // Update display
        this.filteredAlbums = filtered;
        this.currentIndex = 0;

        if (typeof this.updateCoverflow === 'function') {
            this.updateCoverflow();
        }

        // Close modal
        document.getElementById('info-modal').style.display = 'none';

        // Show toast
        if (typeof this.showToast === 'function') {
            this.showToast(`Filtered to ${filtered.length} games`, 'success');
        }

        window.logger?.debug('SEARCH', `Advanced filters applied: ${filtered.length} results`);
    }

    /**
     * Sort games
     */
    sortGames(games, sortBy) {
        switch (sortBy) {
            case 'title':
                games.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'title-desc':
                games.sort((a, b) => b.title.localeCompare(a.title));
                break;
            case 'playtime':
                games.sort((a, b) => (b.total_play_time || 0) - (a.total_play_time || 0));
                break;
            case 'playtime-asc':
                games.sort((a, b) => (a.total_play_time || 0) - (b.total_play_time || 0));
                break;
            case 'recent':
                games.sort((a, b) => {
                    const aTime = a.last_played ? new Date(a.last_played).getTime() : 0;
                    const bTime = b.last_played ? new Date(b.last_played).getTime() : 0;
                    return bTime - aTime;
                });
                break;
            case 'added':
                games.sort((a, b) => {
                    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return bTime - aTime;
                });
                break;
            case 'rating':
                games.sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0));
                break;
        }
    }

    /**
     * Reset all filters
     */
    resetFilters() {
        this.activeFilters = {};
        this.filteredAlbums = [...this.albums];
        this.currentIndex = 0;

        if (typeof this.updateCoverflow === 'function') {
            this.updateCoverflow();
        }

        document.getElementById('info-modal').style.display = 'none';

        if (typeof this.showToast === 'function') {
            this.showToast('Filters reset', 'info');
        }
    }

    /**
     * Initialize voice search
     */
    initializeVoiceSearch() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.voiceRecognition = new SpeechRecognition();

        this.voiceRecognition.continuous = false;
        this.voiceRecognition.interimResults = false;
        this.voiceRecognition.lang = 'en-US';

        this.voiceRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('[VOICE] Recognized:', transcript);

            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = transcript;
                this.performFuzzySearch(transcript);
            }

            if (typeof this.showToast === 'function') {
                this.showToast(`Voice search: "${transcript}"`, 'success');
            }

            this.isVoiceActive = false;
            this.updateVoiceButton();
        };

        this.voiceRecognition.onerror = (event) => {
            console.error('[VOICE] Error:', event.error);
            this.isVoiceActive = false;
            this.updateVoiceButton();

            if (typeof this.showToast === 'function') {
                this.showToast('Voice search error', 'error');
            }
        };

        this.voiceRecognition.onend = () => {
            this.isVoiceActive = false;
            this.updateVoiceButton();
        };

        console.log('[VOICE] Voice search initialized');
    }

    /**
     * Toggle voice search
     */
    toggleVoiceSearch() {
        if (!this.voiceRecognition) return;

        if (this.isVoiceActive) {
            this.voiceRecognition.stop();
            this.isVoiceActive = false;
        } else {
            this.voiceRecognition.start();
            this.isVoiceActive = true;

            if (typeof this.showToast === 'function') {
                this.showToast('Listening...', 'info');
            }
        }

        this.updateVoiceButton();
    }

    /**
     * Update voice button appearance
     */
    updateVoiceButton() {
        const btn = document.getElementById('voice-search-btn');
        if (!btn) return;

        if (this.isVoiceActive) {
            btn.classList.add('active');
            btn.innerHTML = '🔴';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '🎤';
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchEnhancements;
}
