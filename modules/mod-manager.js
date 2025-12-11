/**
 * Mod Manager Module
 * Manages game modifications (mods) - detect, enable/disable, manage load order
 */

class ModManager {
    constructor() {
        this.mods = [];
        this.currentGame = null;
        this.isVisible = false;
    }

    /**
     * Initialize mod manager
     */
    initializeModManager() {
        // Create mod manager UI
        this.createModManagerUI();

        window.logger?.debug('MOD_MANAGER', 'Mod manager initialized');
    }

    /**
     * Create mod manager UI
     */
    createModManagerUI() {
        const existing = document.getElementById('mod-manager');
        if (existing) return;

        const manager = document.createElement('div');
        manager.id = 'mod-manager';
        manager.className = 'mod-manager modal';
        manager.innerHTML = `
            <div class="modal-content mod-manager-content">
                <div class="modal-header">
                    <h3>🔧 Mod Manager</h3>
                    <button class="close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="mod-manager-header">
                        <div class="current-game-info">
                            <span class="game-title">No game selected</span>
                            <span class="mod-count">0 mods installed</span>
                        </div>
                        <div class="mod-actions">
                            <button id="scan-mods-btn" class="btn">Scan for Mods</button>
                            <button id="refresh-mods-btn" class="btn">🔄 Refresh</button>
                        </div>
                    </div>

                    <div class="mod-filters">
                        <button class="filter-btn active" data-filter="all">All Mods</button>
                        <button class="filter-btn" data-filter="enabled">Enabled</button>
                        <button class="filter-btn" data-filter="disabled">Disabled</button>
                        <button class="filter-btn" data-filter="conflicts">Conflicts</button>
                    </div>

                    <div id="mod-list" class="mod-list">
                        <div class="empty-state">Select a game to manage mods</div>
                    </div>

                    <div class="mod-manager-footer">
                        <button id="apply-mods-btn" class="btn primary">Apply Changes</button>
                        <button id="open-mod-folder-btn" class="btn">Open Mod Folder</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(manager);

        // Event listeners
        this.setupModManagerEvents();
    }

    /**
     * Setup event listeners
     */
    setupModManagerEvents() {
        const manager = document.getElementById('mod-manager');
        if (!manager) return;

        // Close button
        manager.querySelector('.close-btn').addEventListener('click', () => {
            this.closeModManager();
        });

        // Click outside to close
        manager.addEventListener('click', (e) => {
            if (e.target === manager) {
                this.closeModManager();
            }
        });

        // Scan for mods
        document.getElementById('scan-mods-btn').addEventListener('click', () => {
            this.scanForMods();
        });

        // Refresh mods
        document.getElementById('refresh-mods-btn').addEventListener('click', () => {
            this.refreshMods();
        });

        // Filter buttons
        manager.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                manager.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterMods(e.target.dataset.filter);
            });
        });

        // Apply changes
        document.getElementById('apply-mods-btn').addEventListener('click', () => {
            this.applyModChanges();
        });

        // Open mod folder
        document.getElementById('open-mod-folder-btn').addEventListener('click', () => {
            this.openModFolder();
        });
    }

    /**
     * Show mod manager for a specific game
     */
    showModManager(game) {
        // Show the modal even if no game is selected
        const manager = document.getElementById('mod-manager');
        if (!manager) {
            console.error('[MOD_MANAGER] Mod manager UI not found');
            return;
        }

        this.currentGame = game || null;
        this.isVisible = true;

        // Show modal
        manager.style.display = 'block';

        // Update UI
        const gameTitle = document.querySelector('.mod-manager .game-title');
        if (gameTitle) {
            if (!game) {
                gameTitle.textContent = 'No game selected';
            } else {
                let titleText = game.title;

                // Add badges for mod support
                if (game.has_workshop_support) {
                    titleText += ' 🛠️ Workshop';
                }
                if (game.engine === 'Unity') {
                    titleText += ' 🎮 Unity';
                }
                if (game.engine === 'Unreal') {
                    titleText += ' 🎮 Unreal';
                }

                gameTitle.textContent = titleText;
            }
        }

        // Update mod count
        const modCount = document.querySelector('.mod-manager .mod-count');
        if (modCount && game) {
            modCount.textContent = '0 mods installed';
        } else if (modCount) {
            modCount.textContent = 'Select a game to view mods';
        }

        // Load mods for this game only if game is selected
        if (game && game.id) {
            // Show loading indicator immediately
            const modList = document.getElementById('mod-list');
            if (modList) {
                modList.innerHTML = `
                    <div class="loading-state" style="text-align: center; padding: 40px;">
                        <div class="spinner" style="
                            border: 4px solid rgba(255,255,255,0.1);
                            border-top: 4px solid #4fc3f7;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
                            animation: spin 1s linear infinite;
                            margin: 0 auto 20px;
                        "></div>
                        <p style="color: #aaa;">Loading mods...</p>
                    </div>
                `;
            }
            // Load mods asynchronously
            this.loadModsForGame(game.id);
        } else {
            // Show empty state
            const modList = document.getElementById('mod-list');
            if (modList) {
                modList.innerHTML = '<div class="empty-state">Select a game from the library to manage its mods</div>';
            }
        }

        // Show modal using display style (already set above)
        manager.classList.add('active');
    }

    /**
     * Close mod manager
     */
    closeModManager() {
        this.isVisible = false;
        const manager = document.getElementById('mod-manager');
        if (manager) {
            manager.classList.remove('active');
            manager.style.display = 'none';
        }
    }

    /**
     * Load mods for a game
     */
    async loadModsForGame(gameId) {
        if (!window.electronAPI || !window.electronAPI.getGameMods) {
            this.showToast('Mod manager requires Electron mode', 'info');
            this.mods = [];
            this.renderModList();
            return;
        }

        try {
            const result = await window.electronAPI.getGameMods(gameId);
            if (result.success && result.mods) {
                this.mods = result.mods;
                this.modSupport = result.modSupport || {};
                this.renderModList();
                this.updateModCount();
                this.updateModSupportInfo();
            }
        } catch (error) {
            window.logger?.error('MOD_MANAGER', 'Failed to load mods:', error);
            this.showToast('Failed to load mods', 'error');
        }
    }

    /**
     * Update mod support info
     */
    updateModSupportInfo() {
        const headerEl = document.querySelector('.mod-manager-header');
        if (!headerEl || !this.modSupport) return;

        // Remove existing info if present
        let infoEl = headerEl.querySelector('.mod-support-info');
        if (!infoEl) {
            infoEl = document.createElement('div');
            infoEl.className = 'mod-support-info';
            headerEl.insertBefore(infoEl, headerEl.firstChild);
        }

        let infoHtml = '<div class="support-badges">';

        if (this.modSupport.hasWorkshop) {
            infoHtml += '<span class="badge workshop">Steam Workshop Supported</span>';
        }

        if (this.modSupport.isUnity) {
            infoHtml += '<span class="badge unity">Unity Engine - Thunderstore Compatible</span>';
            infoHtml += '<button id="browse-thunderstore-btn" class="btn">Browse Thunderstore</button>';
            infoHtml += '<button id="install-bepinex-btn" class="btn" style="background: #4caf50;">Install BepInEx</button>';
            infoHtml += '<button id="install-melonloader-btn" class="btn" style="background: #2196f3;">Install MelonLoader</button>';
        }

        if (this.modSupport.engine) {
            infoHtml += `<span class="badge engine">${this.modSupport.engine} Engine</span>`;
        }

        infoHtml += '</div>';
        infoEl.innerHTML = infoHtml;

        // Add event listener for Thunderstore browser
        const thunderstoreBtn = document.getElementById('browse-thunderstore-btn');
        if (thunderstoreBtn) {
            thunderstoreBtn.addEventListener('click', () => {
                this.browseThunderstore();
            });
        }

        // Add event listeners for BepInEx and MelonLoader installers
        const bepinexBtn = document.getElementById('install-bepinex-btn');
        if (bepinexBtn) {
            bepinexBtn.addEventListener('click', () => {
                this.installBepInEx();
            });
        }

        const melonloaderBtn = document.getElementById('install-melonloader-btn');
        if (melonloaderBtn) {
            melonloaderBtn.addEventListener('click', () => {
                this.installMelonLoader();
            });
        }
    }

    /**
     * Browse Thunderstore for mods
     */
    async browseThunderstore() {
        if (!this.currentGame || !window.electronAPI) return;

        this.showToast('Searching Thunderstore...', 'info');

        try {
            const result = await window.electronAPI.searchThunderstoreMods(this.currentGame.id);
            if (result.success && result.mods) {
                this.showThunderstoreResults(result.mods);
            } else {
                this.showToast('No mods found on Thunderstore', 'info');
            }
        } catch (error) {
            window.logger?.error('MOD_MANAGER', 'Failed to search Thunderstore:', error);
            this.showToast('Failed to search Thunderstore', 'error');
        }
    }

    /**
     * Show Thunderstore search results
     */
    showThunderstoreResults(mods) {
        this.showToast(`Found ${mods.length} mods on Thunderstore!`, 'success');

        // Initialize pagination
        this.currentPage = 1;
        this.itemsPerPage = 100;

        // Create Thunderstore browser modal
        this.createThunderstoreBrowser(mods);
    }

    /**
     * Create Thunderstore browser modal
     */
    createThunderstoreBrowser(mods) {
        // Remove existing browser if present
        let browser = document.getElementById('thunderstore-browser');
        if (browser) {
            browser.remove();
        }

        browser = document.createElement('div');
        browser.id = 'thunderstore-browser';
        browser.className = 'thunderstore-browser modal active';
        browser.innerHTML = `
            <div class="modal-content thunderstore-content">
                <div class="modal-header">
                    <h3>🌩️ Thunderstore Mod Browser</h3>
                    <span class="mod-count-badge">${mods.length} packages found</span>
                    <button class="close-thunderstore-btn close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="thunderstore-tabs">
                        <button class="tab-btn active" data-tab="all">All (${mods.length})</button>
                        <button class="tab-btn" data-tab="mods">Mods (${mods.filter(m => !m.isModpack).length})</button>
                        <button class="tab-btn" data-tab="modpacks">Modpacks (${mods.filter(m => m.isModpack).length})</button>
                    </div>
                    <div class="thunderstore-header">
                        <input type="text" id="thunderstore-search" class="search-input" placeholder="Search mods...">
                        <select id="thunderstore-sort" class="sort-select">
                            <option value="downloads">Most Downloaded</option>
                            <option value="rating">Highest Rated</option>
                            <option value="name">Name (A-Z)</option>
                            <option value="recent">Recently Updated</option>
                        </select>
                    </div>
                    <div id="thunderstore-mod-list" class="thunderstore-mod-list">
                        ${this.renderThunderstoreMods(mods)}
                    </div>
                    <div id="thunderstore-pagination" class="pagination-controls">
                        <!-- Pagination will be rendered here -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(browser);

        // Event listeners
        browser.querySelector('.close-thunderstore-btn').addEventListener('click', () => {
            browser.classList.remove('active');
            setTimeout(() => browser.remove(), 300);
        });

        // Click outside to close
        browser.addEventListener('click', (e) => {
            if (e.target === browser) {
                browser.classList.remove('active');
                setTimeout(() => browser.remove(), 300);
            }
        });

        // Tab switching
        browser.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                browser.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterByTab(mods, e.target.dataset.tab);
            });
        });

        // Search functionality
        const searchInput = document.getElementById('thunderstore-search');
        searchInput.addEventListener('input', (e) => {
            this.filterThunderstoreMods(mods, e.target.value);
        });

        // Sort functionality
        const sortSelect = document.getElementById('thunderstore-sort');
        sortSelect.addEventListener('change', (e) => {
            this.sortThunderstoreMods(mods, e.target.value);
        });

        // Store mods for filtering/sorting
        this.thunderstoreMods = mods;
        this.currentTab = 'all';

        // Render pagination controls
        this.renderPagination(mods);

        // Attach install handlers
        this.attachInstallHandlers();
    }

    /**
     * Filter by tab (all/mods/modpacks)
     */
    filterByTab(mods, tab) {
        this.currentTab = tab;

        // Filter mods based on tab
        let filteredMods;
        switch (tab) {
            case 'all':
                filteredMods = mods;
                break;
            case 'mods':
                filteredMods = mods.filter(m => !m.isModpack);
                break;
            case 'modpacks':
                filteredMods = mods.filter(m => m.isModpack);
                break;
            default:
                filteredMods = mods;
        }

        // Reset to page 1 when changing tabs
        this.currentPage = 1;

        // Store filtered mods
        this.currentFilteredMods = filteredMods;

        // Re-render list
        const container = document.getElementById('thunderstore-mod-list');
        if (container) {
            container.innerHTML = this.renderThunderstoreMods(filteredMods);
            this.attachInstallHandlers();
        }

        // Update pagination
        this.renderPagination(filteredMods);
    }

    /**
     * Simple markdown to HTML converter
     */
    markdownToHtml(markdown) {
        if (!markdown) return 'No description available';

        let html = markdown
            // Headers
            .replace(/^### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^## (.*$)/gim, '<h3>$1</h3>')
            .replace(/^# (.*$)/gim, '<h2>$1</h2>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\_\_(.*?)\_\_/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\_(.*?)\_/g, '<em>$1</em>')
            // Links
            .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            // Line breaks
            .replace(/\n/g, '<br>');

        return html;
    }

    /**
     * Render Thunderstore mods
     */
    renderThunderstoreMods(mods) {
        if (!mods || mods.length === 0) {
            return '<div class="empty-state">No mods found for this game</div>';
        }

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedMods = mods.slice(startIndex, endIndex);

        return paginatedMods.map(mod => `
            <div class="thunderstore-mod-card" data-mod-name="${this.escapeHtml(mod.name.toLowerCase())}" data-is-modpack="${mod.isModpack}">
                <div class="mod-icon">
                    ${(mod.iconUrl && this.isSafeUrl(mod.iconUrl)) ? `<img src="${this.escapeHtml(mod.iconUrl)}" alt="${this.escapeHtml(mod.name)}" onerror="this.parentElement.innerHTML='📦'">` : '📦'}
                </div>
                <div class="mod-info-section">
                    <div class="mod-title-row">
                        <h4 class="mod-name">${this.escapeHtml(mod.name)}</h4>
                        <span class="mod-version">v${this.escapeHtml(mod.version)}</span>
                        ${mod.isModpack ? '<span class="modpack-badge">📦 Modpack</span>' : ''}
                        ${mod.isPinned ? '<span class="pinned-badge">📌 Pinned</span>' : ''}
                    </div>
                    <div class="mod-author">by ${this.escapeHtml(mod.owner)}</div>
                    <div class="mod-description">${this.markdownToHtml(mod.description)}</div>
                    <div class="mod-stats">
                        <span class="stat">⬇️ ${this.formatNumber(mod.downloads)} downloads</span>
                        ${mod.rating ? `<span class="stat">⭐ ${mod.rating.toFixed(1)}</span>` : ''}
                        ${mod.isDeprecated ? '<span class="deprecated-badge">⚠️ Deprecated</span>' : ''}
                    </div>
                </div>
                <div class="mod-actions-section">
                    <button class="install-mod-btn btn primary" data-mod='${JSON.stringify(mod).replace(/'/g, "&#39;")}'>
                        Install
                    </button>
                    ${(mod.websiteUrl && this.isSafeUrl(mod.websiteUrl)) ? `<a href="${this.escapeHtml(mod.websiteUrl)}" class="view-mod-btn btn" target="_blank" rel="noopener noreferrer">View Page</a>` : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * Render pagination controls
     */
    renderPagination(mods) {
        const totalPages = Math.ceil(mods.length / this.itemsPerPage);
        const paginationContainer = document.getElementById('thunderstore-pagination');

        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';

        // Calculate page range to display (show 7 page numbers max)
        let startPage = Math.max(1, this.currentPage - 3);
        let endPage = Math.min(totalPages, startPage + 6);

        // Adjust if we're near the end
        if (endPage - startPage < 6) {
            startPage = Math.max(1, endPage - 6);
        }

        let paginationHTML = `
            <div class="pagination-info">
                Showing ${((this.currentPage - 1) * this.itemsPerPage) + 1}-${Math.min(this.currentPage * this.itemsPerPage, mods.length)} of ${mods.length} mods
            </div>
            <div class="pagination-buttons">
                <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" data-page="1" ${this.currentPage === 1 ? 'disabled' : ''}>
                    ⏮ First
                </button>
                <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>
                    ◀ Prev
                </button>
        `;

        // Add page number buttons
        if (startPage > 1) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-btn page-number ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }

        paginationHTML += `
                <button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" data-page="${this.currentPage + 1}" ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Next ▶
                </button>
                <button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" data-page="${totalPages}" ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Last ⏭
                </button>
            </div>
        `;

        paginationContainer.innerHTML = paginationHTML;

        // Attach click handlers to pagination buttons
        paginationContainer.querySelectorAll('.page-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.goToPage(page, mods);
                }
            });
        });
    }

    /**
     * Go to specific page
     */
    goToPage(page, mods) {
        this.currentPage = page;

        // Re-render mod list
        const container = document.getElementById('thunderstore-mod-list');
        if (container) {
            container.innerHTML = this.renderThunderstoreMods(mods);
            container.scrollTop = 0; // Scroll to top
        }

        // Re-render pagination
        this.renderPagination(mods);

        // Re-attach install handlers
        this.attachInstallHandlers();
    }

    /**
     * Filter Thunderstore mods
     */
    filterThunderstoreMods(mods, searchTerm) {
        const cards = document.querySelectorAll('.thunderstore-mod-card');
        const term = searchTerm.toLowerCase();

        cards.forEach(card => {
            const modName = card.dataset.modName;
            const modDescription = card.querySelector('.mod-description').textContent.toLowerCase();
            const modAuthor = card.querySelector('.mod-author').textContent.toLowerCase();

            if (modName.includes(term) || modDescription.includes(term) || modAuthor.includes(term)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    /**
     * Sort Thunderstore mods
     */
    sortThunderstoreMods(mods, sortBy) {
        let sortedMods = [...mods];

        switch (sortBy) {
            case 'downloads':
                sortedMods.sort((a, b) => b.downloads - a.downloads);
                break;
            case 'rating':
                sortedMods.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'name':
                sortedMods.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'recent':
                // Assuming version field indicates recent updates
                sortedMods.sort((a, b) => b.version.localeCompare(a.version));
                break;
        }

        // Reset to page 1 when sorting
        this.currentPage = 1;

        // Update the stored mods array
        this.thunderstoreMods = sortedMods;

        // Re-render the list
        const container = document.getElementById('thunderstore-mod-list');
        if (container) {
            container.innerHTML = this.renderThunderstoreMods(sortedMods);
            this.attachInstallHandlers();
        }

        // Update pagination
        this.renderPagination(sortedMods);
    }

    /**
     * Attach install button handlers
     */
    attachInstallHandlers() {
        document.querySelectorAll('.install-mod-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                try {
                    const modData = JSON.parse(e.target.dataset.mod.replace(/&#39;/g, "'"));
                    await this.installThunderstoreMod(modData, e.target);
                } catch (error) {
                    window.logger?.error('MOD_MANAGER', 'Error parsing mod data:', error);
                    this.showToast('Failed to install mod: Invalid mod data', 'error');
                }
            });
        });
    }

    /**
     * Install a Thunderstore mod
     */
    async installThunderstoreMod(modData, buttonElement) {
        if (!this.currentGame || !window.electronAPI) return;

        const btn = buttonElement;
        if (!btn) {
            window.logger?.error('MOD_MANAGER', 'Install button element not found');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Installing...';

        this.showToast(`Installing ${modData.name}...`, 'info');

        try {
            const result = await window.electronAPI.installThunderstoreMod(this.currentGame.id, modData);
            if (result.success) {
                this.showToast(`${modData.name} installed successfully!`, 'success');
                btn.textContent = '✓ Installed';
                btn.classList.add('installed');

                // Refresh mod list
                setTimeout(() => {
                    this.loadModsForGame(this.currentGame.id);
                }, 1000);
            } else {
                this.showToast(`Failed to install: ${result.error}`, 'error');
                btn.disabled = false;
                btn.textContent = 'Install';
            }
        } catch (error) {
            window.logger?.error('MOD_MANAGER', 'Failed to install mod:', error);
            this.showToast('Failed to install mod', 'error');
            btn.disabled = false;
            btn.textContent = 'Install';
        }
    }

    /**
     * Install BepInEx for Unity games
     */
    async installBepInEx() {
        if (!this.currentGame) {
            this.showToast('No game selected', 'error');
            return;
        }

        if (!window.electronAPI || !window.electronAPI.installBepInEx) {
            // Fallback: Open BepInEx download page
            window.open('https://github.com/BepInEx/BepInEx/releases/latest', '_blank');
            this.showToast('Please download BepInEx manually and extract to game folder', 'info');
            return;
        }

        this.showToast('Downloading and installing BepInEx...', 'info');

        try {
            const result = await window.electronAPI.installBepInEx(this.currentGame.id);
            if (result.success) {
                this.showToast('BepInEx installed successfully!', 'success');
                // Refresh mod list
                this.loadModsForGame(this.currentGame.id);
            } else {
                this.showToast(`Failed to install BepInEx: ${result.error}`, 'error');
            }
        } catch (error) {
            window.logger?.error('MOD_MANAGER', 'Failed to install BepInEx:', error);
            this.showToast('Failed to install BepInEx. Opening download page...', 'error');
            window.open('https://github.com/BepInEx/BepInEx/releases/latest', '_blank');
        }
    }

    /**
     * Install MelonLoader for Unity games
     */
    async installMelonLoader() {
        if (!this.currentGame) {
            this.showToast('No game selected', 'error');
            return;
        }

        if (!window.electronAPI || !window.electronAPI.installMelonLoader) {
            // Fallback: Open MelonLoader download page
            window.open('https://github.com/LavaGang/MelonLoader/releases/latest', '_blank');
            this.showToast('Please download MelonLoader manually and run the installer', 'info');
            return;
        }

        this.showToast('Downloading and installing MelonLoader...', 'info');

        try {
            const result = await window.electronAPI.installMelonLoader(this.currentGame.id);
            if (result.success) {
                this.showToast('MelonLoader installed successfully!', 'success');
                // Refresh mod list
                this.loadModsForGame(this.currentGame.id);
            } else {
                this.showToast(`Failed to install MelonLoader: ${result.error}`, 'error');
            }
        } catch (error) {
            window.logger?.error('MOD_MANAGER', 'Failed to install MelonLoader:', error);
            this.showToast('Failed to install MelonLoader. Opening download page...', 'error');
            window.open('https://github.com/LavaGang/MelonLoader/releases/latest', '_blank');
        }
    }

    /**
     * Format number with K/M suffixes
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Render mod list
     */
    renderModList() {
        const container = document.getElementById('mod-list');
        if (!container) return;

        if (this.mods.length === 0) {
            container.innerHTML = '<div class="empty-state">No mods found</div>';
            return;
        }

        container.innerHTML = this.mods.map((mod, index) => `
            <div class="mod-item ${mod.enabled ? 'enabled' : 'disabled'} ${mod.hasConflict ? 'conflict' : ''}" data-mod-id="${mod.id}">
                <div class="mod-drag-handle">⋮⋮</div>
                <div class="mod-checkbox">
                    <input type="checkbox" ${mod.enabled ? 'checked' : ''} data-index="${index}">
                </div>
                <div class="mod-info">
                    <div class="mod-name">${this.escapeHtml(mod.name)}</div>
                    <div class="mod-details">
                        <span class="mod-version">v${this.escapeHtml(mod.version || '1.0')}</span>
                        <span class="mod-author">${this.escapeHtml(mod.author || 'Unknown')}</span>
                        ${mod.hasConflict ? '<span class="conflict-badge">⚠️ Conflict</span>' : ''}
                    </div>
                    ${mod.description ? `<div class="mod-description">${this.escapeHtml(mod.description)}</div>` : ''}
                </div>
                <div class="mod-actions">
                    <button class="mod-config-btn" data-index="${index}" title="Configure">⚙️</button>
                    <button class="mod-info-btn" data-index="${index}" title="Info">ℹ️</button>
                    <button class="mod-delete-btn" data-index="${index}" title="Delete">🗑️</button>
                </div>
            </div>
        `).join('');

        // Add event listeners to checkboxes and buttons
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index, 10);
                this.mods[index].enabled = e.target.checked;
                this.updateModItem(index);
            });
        });

        container.querySelectorAll('.mod-config-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index, 10);
                this.configureMod(this.mods[index]);
            });
        });

        container.querySelectorAll('.mod-info-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index, 10);
                this.showModInfo(this.mods[index]);
            });
        });

        container.querySelectorAll('.mod-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index, 10);
                this.deleteMod(this.mods[index], index);
            });
        });

        // Make mod list sortable (drag and drop for load order)
        this.makeModListSortable(container);
    }

    /**
     * Update a single mod item
     */
    updateModItem(index) {
        const item = document.querySelector(`.mod-item[data-mod-id="${this.mods[index].id}"]`);
        if (item) {
            item.classList.toggle('enabled', this.mods[index].enabled);
            item.classList.toggle('disabled', !this.mods[index].enabled);
        }
    }

    /**
     * Update mod count display
     */
    updateModCount() {
        const countEl = document.querySelector('.mod-manager .mod-count');
        if (countEl) {
            const enabled = this.mods.filter(m => m.enabled).length;
            countEl.textContent = `${this.mods.length} mods (${enabled} enabled)`;
        }
    }

    /**
     * Filter mods
     */
    filterMods(filter) {
        const items = document.querySelectorAll('.mod-item');

        items.forEach(item => {
            let show = true;

            switch (filter) {
                case 'enabled':
                    show = item.classList.contains('enabled');
                    break;
                case 'disabled':
                    show = item.classList.contains('disabled');
                    break;
                case 'conflicts':
                    show = item.classList.contains('conflict');
                    break;
                case 'all':
                default:
                    show = true;
            }

            item.style.display = show ? 'flex' : 'none';
        });
    }

    /**
     * Scan for new mods
     */
    async scanForMods() {
        if (!this.currentGame) return;

        this.showToast('Scanning for mods...', 'info');

        if (!window.electronAPI || !window.electronAPI.scanGameMods) {
            this.showToast('Mod scanning requires Electron mode', 'info');
            return;
        }

        try {
            const result = await window.electronAPI.scanGameMods(this.currentGame.id);
            if (result.success) {
                this.showToast(`Found ${result.newMods || 0} new mods`, 'success');
                this.loadModsForGame(this.currentGame.id);
            }
        } catch (error) {
            window.logger?.error('MOD_MANAGER', 'Failed to scan mods:', error);
            this.showToast('Failed to scan for mods', 'error');
        }
    }

    /**
     * Refresh mods
     */
    refreshMods() {
        if (this.currentGame) {
            this.loadModsForGame(this.currentGame.id);
        }
    }

    /**
     * Apply mod changes
     */
    async applyModChanges() {
        if (!this.currentGame || !window.electronAPI) return;

        this.showToast('Applying mod changes...', 'info');

        try {
            const result = await window.electronAPI.applyModChanges(this.currentGame.id, this.mods);
            if (result.success) {
                this.showToast('Mod changes applied successfully!', 'success');
            } else {
                this.showToast('Failed to apply mod changes', 'error');
            }
        } catch (error) {
            window.logger?.error('MOD_MANAGER', 'Failed to apply changes:', error);
            this.showToast('Error applying mod changes', 'error');
        }
    }

    /**
     * Open mod folder
     */
    async openModFolder() {
        if (!this.currentGame || !window.electronAPI) return;

        try {
            await window.electronAPI.openModFolder(this.currentGame.id);
        } catch (error) {
            window.logger?.error('MOD_MANAGER', 'Failed to open mod folder:', error);
        }
    }

    /**
     * Configure a mod
     */
    async configureMod(mod) {
        if (!window.electronAPI) return;

        this.showToast(`Opening configuration for ${mod.name}...`, 'info');

        try {
            const result = await window.electronAPI.getModConfig(mod);
            if (result.success) {
                this.createModConfigUI(mod, result.content, result.configPath);
            } else {
                this.showToast(`Could not find config for ${mod.name}`, 'info');
                // Optional: ask user if they want to create one or open folder
            }
        } catch (error) {
            window.logger?.error('MOD_MANAGER', 'Failed to get mod config:', error);
            this.showToast('Failed to load mod configuration', 'error');
        }
    }

    /**
     * Create mod configuration UI
     */
    createModConfigUI(mod, content, configPath) {
        let configModal = document.getElementById('mod-config-modal');
        if (configModal) {
            configModal.remove();
        }

        configModal = document.createElement('div');
        configModal.id = 'mod-config-modal';
        configModal.className = 'mod-config-modal modal active';

        configModal.innerHTML = `
            <div class="modal-content mod-config-content" style="width: 800px; max-width: 90vw;">
                <div class="modal-header">
                    <h3>⚙️ Configure ${this.escapeHtml(mod.name)}</h3>
                    <div class="config-path" style="font-size: 0.8em; color: #aaa; margin-left: 10px;">${this.escapeHtml(configPath)}</div>
                    <button class="close-config-btn close-btn">×</button>
                </div>
                <div class="modal-body" style="padding: 0;">
                    <textarea id="mod-config-editor" style="width: 100%; height: 500px; background: #1e1e1e; color: #d4d4d4; font-family: monospace; border: none; padding: 10px; resize: none; outline: none;">${this.escapeHtml(content)}</textarea>
                </div>
                <div class="modal-footer" style="padding: 15px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn close-config-btn">Cancel</button>
                    <button id="save-mod-config-btn" class="btn primary">Save Configuration</button>
                </div>
            </div>
        `;

        document.body.appendChild(configModal);

        // Event listeners
        const closeBtns = configModal.querySelectorAll('.close-config-btn');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                configModal.classList.remove('active');
                setTimeout(() => configModal.remove(), 300);
            });
        });

        // Click outside
        configModal.addEventListener('click', (e) => {
            if (e.target === configModal) {
                configModal.classList.remove('active');
                setTimeout(() => configModal.remove(), 300);
            }
        });

        // Save button
        const saveBtn = document.getElementById('save-mod-config-btn');
        saveBtn.addEventListener('click', async () => {
            const newContent = document.getElementById('mod-config-editor').value;
            await this.saveModConfig(configPath, newContent);
            configModal.classList.remove('active');
            setTimeout(() => configModal.remove(), 300);
        });
    }

    /**
     * Save mod configuration
     */
    async saveModConfig(configPath, content) {
        if (!window.electronAPI) return;

        this.showToast('Saving configuration...', 'info');

        try {
            const result = await window.electronAPI.saveModConfig(configPath, content);
            if (result.success) {
                this.showToast('Configuration saved successfully', 'success');
            } else {
                this.showToast(`Failed to save: ${result.error}`, 'error');
            }
        } catch (error) {
            window.logger?.error('MOD_MANAGER', 'Failed to save mod config:', error);
            this.showToast('Failed to save configuration', 'error');
        }
    }

    /**
     * Show mod info
     */
    showModInfo(mod) {
        const info = `
Name: ${mod.name}
Version: ${mod.version || '1.0'}
Author: ${mod.author || 'Unknown'}
Description: ${mod.description || 'No description available'}
        `.trim();

        alert(info);
        // TODO: Create better info modal
    }

    /**
     * Delete a mod
     */
    async deleteMod(mod, index) {
        if (!confirm(`Delete mod "${mod.name}"? This cannot be undone.`)) {
            return;
        }

        if (!window.electronAPI) return;

        try {
            const result = await window.electronAPI.deleteMod(this.currentGame.id, mod.id);
            if (result.success) {
                this.mods.splice(index, 1);
                this.renderModList();
                this.updateModCount();
                this.showToast('Mod deleted', 'success');
            }
        } catch (error) {
            window.logger?.error('MOD_MANAGER', 'Failed to delete mod:', error);
            this.showToast('Failed to delete mod', 'error');
        }
    }

    /**
     * Make mod list sortable for load order
     */
    makeModListSortable(container) {
        // Simple drag and drop implementation
        let draggedItem = null;

        container.querySelectorAll('.mod-item').forEach((item, index) => {
            item.draggable = true;

            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                draggedItem = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                if (draggedItem && draggedItem !== item) {
                    const rect = item.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;

                    if (e.clientY < midpoint) {
                        item.parentNode.insertBefore(draggedItem, item);
                    } else {
                        item.parentNode.insertBefore(draggedItem, item.nextSibling);
                    }
                }
            });
        });

        // Update mod order after drag
        container.addEventListener('drop', () => {
            this.updateModLoadOrder();
        });
    }

    /**
     * Update mod load order based on DOM order
     */
    updateModLoadOrder() {
        const items = document.querySelectorAll('.mod-item');
        const newOrder = [];

        items.forEach((item, index) => {
            const modId = item.dataset.modId;
            const mod = this.mods.find(m => String(m.id) === String(modId));
            if (mod) {
                mod.loadOrder = index;
                newOrder.push(mod);
            }
        });

        this.mods = newOrder;
        this.showToast('Load order updated', 'info');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (window.coverflow && typeof window.coverflow.showToast === 'function') {
            window.coverflow.showToast(message, type);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Validate URL to prevent javascript: and data: URLs
     */
    isSafeUrl(url) {
        if (!url || typeof url !== 'string') return false;
        const urlLower = url.trim().toLowerCase();
        return urlLower.startsWith('http://') || urlLower.startsWith('https://');
    }
}
