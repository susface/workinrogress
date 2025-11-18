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
            manager.classList.add('visible');
        }
    }

    /**
     * Close mod manager
     */
    closeModManager() {
        this.isVisible = false;
        const manager = document.getElementById('mod-manager');
        if (manager) {
            manager.classList.remove('visible');
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
            const result = await window.electronAPI.searchThunderstoreMods(this.currentGame.title);
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
        // TODO: Create a modal to show Thunderstore mods
        // For now, just show a count
        this.showToast(`Found ${mods.length} mods on Thunderstore!`, 'success');
        console.log('[MOD_MANAGER] Thunderstore mods:', mods);
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
