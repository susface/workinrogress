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

        console.log('[MOD_MANAGER] Mod manager initialized');
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
        if (!game) {
            this.showToast('No game selected', 'error');
            return;
        }

        this.currentGame = game;
        this.isVisible = true;

        // Update UI
        const gameTitle = document.querySelector('.mod-manager .game-title');
        if (gameTitle) {
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

        // Load mods for this game
        this.loadModsForGame(game.id);

        // Show modal
        const manager = document.getElementById('mod-manager');
        if (manager) {
            manager.classList.add('active');
        }
    }

    /**
     * Close mod manager
     */
    closeModManager() {
        this.isVisible = false;
        const manager = document.getElementById('mod-manager');
        if (manager) {
            manager.classList.remove('active');
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
            console.error('[MOD_MANAGER] Failed to load mods:', error);
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
            console.error('[MOD_MANAGER] Failed to search Thunderstore:', error);
            this.showToast('Failed to search Thunderstore', 'error');
        }
    }

    /**
     * Show Thunderstore search results
     */
    showThunderstoreResults(mods) {
        this.showToast(`Found ${mods.length} mods on Thunderstore!`, 'success');

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

        // Attach install handlers
        this.attachInstallHandlers();
    }

    /**
     * Filter by tab (all/mods/modpacks)
     */
    filterByTab(mods, tab) {
        this.currentTab = tab;
        const cards = document.querySelectorAll('.thunderstore-mod-card');

        cards.forEach(card => {
            const isModpack = card.dataset.isModpack === 'true';

            let show = false;
            switch (tab) {
                case 'all':
                    show = true;
                    break;
                case 'mods':
                    show = !isModpack;
                    break;
                case 'modpacks':
                    show = isModpack;
                    break;
            }

            card.style.display = show ? 'flex' : 'none';
        });
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

        return mods.map(mod => `
            <div class="thunderstore-mod-card" data-mod-name="${mod.name.toLowerCase()}" data-is-modpack="${mod.isModpack}">
                <div class="mod-icon">
                    ${mod.iconUrl ? `<img src="${mod.iconUrl}" alt="${mod.name}" onerror="this.parentElement.innerHTML='📦'">` : '📦'}
                </div>
                <div class="mod-info-section">
                    <div class="mod-title-row">
                        <h4 class="mod-name">${mod.name}</h4>
                        <span class="mod-version">v${mod.version}</span>
                        ${mod.isModpack ? '<span class="modpack-badge">📦 Modpack</span>' : ''}
                        ${mod.isPinned ? '<span class="pinned-badge">📌 Pinned</span>' : ''}
                    </div>
                    <div class="mod-author">by ${mod.owner}</div>
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
                    ${mod.websiteUrl ? `<a href="${mod.websiteUrl}" class="view-mod-btn btn" target="_blank">View Page</a>` : ''}
                </div>
            </div>
        `).join('');
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

        // Re-render the list
        const container = document.getElementById('thunderstore-mod-list');
        if (container) {
            container.innerHTML = this.renderThunderstoreMods(sortedMods);
            this.attachInstallHandlers();
        }
    }

    /**
     * Attach install button handlers
     */
    attachInstallHandlers() {
        document.querySelectorAll('.install-mod-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const modData = JSON.parse(e.target.dataset.mod.replace(/&#39;/g, "'"));
                await this.installThunderstoreMod(modData);
            });
        });
    }

    /**
     * Install a Thunderstore mod
     */
    async installThunderstoreMod(modData) {
        if (!this.currentGame || !window.electronAPI) return;

        const btn = event.target;
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
            console.error('[MOD_MANAGER] Failed to install mod:', error);
            this.showToast('Failed to install mod', 'error');
            btn.disabled = false;
            btn.textContent = 'Install';
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
                    <div class="mod-name">${mod.name}</div>
                    <div class="mod-details">
                        <span class="mod-version">v${mod.version || '1.0'}</span>
                        <span class="mod-author">${mod.author || 'Unknown'}</span>
                        ${mod.hasConflict ? '<span class="conflict-badge">⚠️ Conflict</span>' : ''}
                    </div>
                    ${mod.description ? `<div class="mod-description">${mod.description}</div>` : ''}
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
            console.error('[MOD_MANAGER] Failed to scan mods:', error);
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
            console.error('[MOD_MANAGER] Failed to apply changes:', error);
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
            console.error('[MOD_MANAGER] Failed to open mod folder:', error);
        }
    }

    /**
     * Configure a mod
     */
    configureMod(mod) {
        this.showToast(`Configure ${mod.name} (coming soon)`, 'info');
        // TODO: Open mod configuration panel
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
            console.error('[MOD_MANAGER] Failed to delete mod:', error);
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
}
