/**
 * Unified Mod Manager
 * Combines features from both mod-browser.js and mod-manager.js
 * Features:
 * - Tabbed UI (Browse, Installed, Profiles, Settings)
 * - Thunderstore integration with pagination
 * - Steam Workshop support
 * - Nexus Mods integration
 * - Drag-and-drop load order
 * - Enable/disable mods
 * - Conflict detection
 * - BepInEx/MelonLoader auto-installers
 */

class UnifiedModManager {
    constructor() {
        this.mods = [];
        this.currentGame = null;
        this.isVisible = false;
        this.currentTab = 'browse';

        // API keys for mod sources
        this.apiKeys = {
            nexusMods: localStorage.getItem('nexusModsApiKey') || '',
            steamWorkshop: localStorage.getItem('steamWorkshopApiKey') || ''
        };

        // Mod profiles
        this.profiles = JSON.parse(localStorage.getItem('modProfiles') || '[]');
        this.activeProfile = localStorage.getItem('activeModProfile') || null;

        // Thunderstore state
        this.thunderstoreMods = [];
        this.currentPage = 1;
        this.itemsPerPage = 100;
        this.currentFilteredMods = [];
        this.currentTabFilter = 'all';

        // Mod support info
        this.modSupport = {};

        // Track if event listeners are already attached
        this.eventListenersAttached = false;
    }

    /**
     * Initialize unified mod manager
     */
    initializeModManager() {
        this.createModManagerUI();
        window.logger?.debug('UNIFIED_MOD_MANAGER', 'Unified mod manager initialized');
    }

    /**
     * Create mod manager UI with tabs
     */
    createModManagerUI() {
        const existing = document.getElementById('unified-mod-manager');
        if (existing) return;

        const manager = document.createElement('div');
        manager.id = 'unified-mod-manager';
        manager.className = 'unified-mod-manager modal';
        manager.innerHTML = `
            <div class="modal-content unified-mod-manager-content">
                <div class="modal-header">
                    <div class="header-left">
                        <h3>🔧 Mod Manager</h3>
                        <span class="current-game-name">No game selected</span>
                    </div>
                    <button class="close-btn">×</button>
                </div>

                <!-- Tab Navigation -->
                <div class="mod-tabs">
                    <button class="tab-btn active" data-tab="browse">
                        <span class="tab-icon">🔍</span>
                        <span class="tab-label">Browse</span>
                    </button>
                    <button class="tab-btn" data-tab="installed">
                        <span class="tab-icon">📦</span>
                        <span class="tab-label">Installed</span>
                        <span class="tab-badge" id="installed-count">0</span>
                    </button>
                    <button class="tab-btn" data-tab="profiles">
                        <span class="tab-icon">📋</span>
                        <span class="tab-label">Profiles</span>
                    </button>
                    <button class="tab-btn" data-tab="settings">
                        <span class="tab-icon">⚙️</span>
                        <span class="tab-label">Settings</span>
                    </button>
                </div>

                <div class="modal-body">
                    <!-- Browse Tab -->
                    <div class="tab-content active" data-tab-content="browse">
                        <div class="mod-support-info" id="mod-support-info"></div>

                        <div class="browse-sources">
                            <button class="source-btn" id="browse-thunderstore">
                                <span class="source-icon">🌩️</span>
                                <span class="source-name">Thunderstore</span>
                                <small>Unity/Unreal mods</small>
                            </button>
                            <button class="source-btn" id="browse-workshop">
                                <span class="source-icon">🛠️</span>
                                <span class="source-name">Steam Workshop</span>
                                <small>Steam games</small>
                            </button>
                            <button class="source-btn" id="browse-nexus">
                                <span class="source-icon">🔗</span>
                                <span class="source-name">Nexus Mods</span>
                                <small>All games</small>
                            </button>
                        </div>

                        <div id="browse-results" class="browse-results" style="display: none;">
                            <div class="browse-header">
                                <input type="text" id="browse-search" class="search-input" placeholder="Search mods...">
                                <select id="browse-sort" class="sort-select">
                                    <option value="downloads">Most Downloaded</option>
                                    <option value="rating">Highest Rated</option>
                                    <option value="name">Name (A-Z)</option>
                                    <option value="recent">Recently Updated</option>
                                </select>
                                <div class="browse-filter-tabs">
                                    <button class="filter-tab-btn active" data-filter="all">All</button>
                                    <button class="filter-tab-btn" data-filter="mods">Mods</button>
                                    <button class="filter-tab-btn" data-filter="modpacks">Modpacks</button>
                                </div>
                            </div>
                            <div id="browse-mod-list" class="browse-mod-list"></div>
                            <div id="browse-pagination" class="pagination-controls"></div>
                        </div>
                    </div>

                    <!-- Installed Tab -->
                    <div class="tab-content" data-tab-content="installed">
                        <div class="installed-header">
                            <div class="installed-info">
                                <span id="mod-count-display">0 mods installed</span>
                            </div>
                            <div class="installed-actions">
                                <button id="scan-mods-btn" class="btn">Scan for Mods</button>
                                <button id="refresh-mods-btn" class="btn">🔄 Refresh</button>
                                <button id="open-mod-folder-btn" class="btn">📁 Open Folder</button>
                            </div>
                        </div>

                        <div class="mod-filters">
                            <button class="filter-btn active" data-filter="all">All Mods</button>
                            <button class="filter-btn" data-filter="enabled">Enabled</button>
                            <button class="filter-btn" data-filter="disabled">Disabled</button>
                            <button class="filter-btn" data-filter="conflicts">Conflicts</button>
                        </div>

                        <div id="installed-mod-list" class="installed-mod-list">
                            <div class="empty-state">Select a game to manage mods</div>
                        </div>

                        <div class="installed-footer">
                            <button id="apply-mods-btn" class="btn primary">Apply Changes</button>
                            <small class="info-text">Drag mods to change load order</small>
                        </div>
                    </div>

                    <!-- Profiles Tab -->
                    <div class="tab-content" data-tab-content="profiles">
                        <div class="profiles-header">
                            <h4>Mod Profiles</h4>
                            <button id="create-profile-btn" class="btn primary">+ Create Profile</button>
                        </div>
                        <div id="profiles-list" class="profiles-list">
                            <div class="empty-state">No mod profiles created yet</div>
                        </div>
                    </div>

                    <!-- Settings Tab -->
                    <div class="tab-content" data-tab-content="settings">
                        <div class="settings-section">
                            <h4>API Keys</h4>

                            <div class="setting-group">
                                <label for="nexus-api-key">Nexus Mods API Key</label>
                                <div class="api-key-input-group">
                                    <input type="password" id="nexus-api-key" class="api-key-input" placeholder="Enter your Nexus Mods API key">
                                    <button id="test-nexus-btn" class="btn">Test</button>
                                </div>
                                <small>Get your API key from <a href="https://www.nexusmods.com/users/myaccount?tab=api" target="_blank">Nexus Mods</a></small>
                            </div>

                            <div class="setting-group">
                                <label for="steam-api-key">Steam API Key (Optional)</label>
                                <div class="api-key-input-group">
                                    <input type="password" id="steam-api-key" class="api-key-input" placeholder="Enter your Steam API key">
                                    <button id="test-steam-btn" class="btn">Test</button>
                                </div>
                                <small>Get your API key from <a href="https://steamcommunity.com/dev/apikey" target="_blank">Steam</a></small>
                            </div>
                        </div>

                        <div class="settings-section">
                            <h4>Mod Installation</h4>

                            <div class="setting-group">
                                <label>
                                    <input type="checkbox" id="auto-enable-mods">
                                    Automatically enable mods after installation
                                </label>
                            </div>

                            <div class="setting-group">
                                <label>
                                    <input type="checkbox" id="check-conflicts">
                                    Check for mod conflicts
                                </label>
                            </div>
                        </div>

                        <div class="settings-section">
                            <button id="save-settings-btn" class="btn primary">Save Settings</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(manager);
        this.setupEventListeners();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Prevent duplicate event listeners
        if (this.eventListenersAttached) {
            console.log('[UNIFIED_MOD_MANAGER] Event listeners already attached, skipping');
            return;
        }

        const manager = document.getElementById('unified-mod-manager');
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

        // Tab switching
        manager.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Browse source buttons
        document.getElementById('browse-thunderstore')?.addEventListener('click', () => {
            this.browseThunderstore();
        });
        document.getElementById('browse-workshop')?.addEventListener('click', () => {
            this.browseWorkshop();
        });
        document.getElementById('browse-nexus')?.addEventListener('click', () => {
            this.browseNexus();
        });

        // Installed tab actions
        document.getElementById('scan-mods-btn')?.addEventListener('click', () => {
            this.scanForMods();
        });
        document.getElementById('refresh-mods-btn')?.addEventListener('click', () => {
            this.refreshMods();
        });
        document.getElementById('open-mod-folder-btn')?.addEventListener('click', () => {
            this.openModFolder();
        });
        document.getElementById('apply-mods-btn')?.addEventListener('click', () => {
            this.applyModChanges();
        });

        // Installed filters
        manager.querySelectorAll('.mod-filters .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                manager.querySelectorAll('.mod-filters .filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterInstalledMods(e.target.dataset.filter);
            });
        });

        // Profile actions
        document.getElementById('create-profile-btn')?.addEventListener('click', () => {
            this.createProfile();
        });

        // Settings actions
        document.getElementById('test-nexus-btn')?.addEventListener('click', () => {
            this.testNexusAPI();
        });
        document.getElementById('test-steam-btn')?.addEventListener('click', () => {
            this.testSteamAPI();
        });
        document.getElementById('save-settings-btn')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // Mark as attached
        this.eventListenersAttached = true;
        console.log('[UNIFIED_MOD_MANAGER] Event listeners attached');
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        const manager = document.getElementById('unified-mod-manager');
        if (!manager) return;

        // Update tab buttons
        manager.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        manager.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tabContent === tabName);
        });

        this.currentTab = tabName;

        // Load data for specific tabs
        if (tabName === 'installed' && this.currentGame) {
            this.loadModsForGame(this.currentGame.id);
        } else if (tabName === 'profiles') {
            this.renderProfiles();
        } else if (tabName === 'settings') {
            this.loadSettings();
        }
    }

    /**
     * Show mod manager for a game
     */
    showModManager(game) {
        const manager = document.getElementById('unified-mod-manager');
        if (!manager) {
            console.error('[UNIFIED_MOD_MANAGER] UI not found');
            return;
        }

        this.currentGame = game || null;
        this.isVisible = true;

        // Use classList to trigger the flex display from CSS
        manager.classList.add('active');

        // Update game name
        const gameName = manager.querySelector('.current-game-name');
        if (gameName) {
            gameName.textContent = game ? game.title : 'No game selected';
        }

        // Update mod support info
        if (game && game.id) {
            this.detectModSupport(game);
            this.updateModSupportInfo();
        }

        // Switch to browse tab by default
        this.switchTab('browse');
    }

    /**
     * Close mod manager
     */
    closeModManager() {
        this.isVisible = false;
        const manager = document.getElementById('unified-mod-manager');
        if (manager) {
            manager.classList.remove('active');
            // Don't set inline display:none, let CSS handle it
        }
    }

    /**
     * Detect mod support for current game
     */
    async detectModSupport(game) {
        this.modSupport = {
            hasWorkshop: game.has_workshop_support || false,
            isUnity: game.engine === 'Unity',
            isUnreal: game.engine === 'Unreal',
            engine: game.engine || 'Unknown',
            gameId: game.id,
            installPath: game.install_path
        };

        // Check status if it's a Unity game
        if (this.modSupport.isUnity && window.electronAPI && window.electronAPI.checkModLoaderStatus) {
            try {
                const bepInExStatus = await window.electronAPI.checkModLoaderStatus(game.id, 'bepinex');
                this.modSupport.bepInExInstalled = bepInExStatus.success && bepInExStatus.isInstalled;
                this.modSupport.bepInExMessage = bepInExStatus.message;

                const melonStatus = await window.electronAPI.checkModLoaderStatus(game.id, 'melonloader');
                this.modSupport.melonLoaderInstalled = melonStatus.success && melonStatus.isInstalled;
                this.modSupport.melonLoaderMessage = melonStatus.message;
            } catch (e) {
                console.error('Failed to check mod loader status:', e);
            }
        }
    }

    /**
     * Update mod support info display
     */
    async updateModSupportInfo() {
        const infoEl = document.getElementById('mod-support-info');
        if (!infoEl || !this.modSupport) return;

        // Ensure status is up to date (this might be redundant if detectModSupport was just called, but safe)
        if (this.modSupport.isUnity && window.electronAPI && window.electronAPI.checkModLoaderStatus) {
             try {
                const bepInExStatus = await window.electronAPI.checkModLoaderStatus(this.currentGame.id, 'bepinex');
                this.modSupport.bepInExInstalled = bepInExStatus.success && bepInExStatus.isInstalled;

                const melonStatus = await window.electronAPI.checkModLoaderStatus(this.currentGame.id, 'melonloader');
                this.modSupport.melonLoaderInstalled = melonStatus.success && melonStatus.isInstalled;
            } catch (e) { console.error(e); }
        }

        let infoHtml = '<div class="support-badges">';

        if (this.modSupport.hasWorkshop) {
            infoHtml += '<span class="badge workshop">🛠️ Steam Workshop</span>';
        }

        if (this.modSupport.isUnity) {
            infoHtml += '<span class="badge unity">🎮 Unity - Thunderstore Compatible</span>';

            // BepInEx Button
            const bepBtnText = this.modSupport.bepInExInstalled ? '✓ BepInEx Installed' : 'Install BepInEx';
            const bepBtnStyle = this.modSupport.bepInExInstalled ? 'background: #2e7d32;' : 'background: #4caf50;';
            const bepBtnTitle = this.modSupport.bepInExInstalled ? 'Re-install/Update BepInEx' : 'Install BepInEx';
            infoHtml += `<button id="install-bepinex-btn" class="btn installer-btn" style="${bepBtnStyle} margin-left: 10px;" title="${bepBtnTitle}">${bepBtnText}</button>`;

            // MelonLoader Button
            const melonBtnText = this.modSupport.melonLoaderInstalled ? '✓ MelonLoader Installed' : 'Install MelonLoader';
            const melonBtnStyle = this.modSupport.melonLoaderInstalled ? 'background: #1565c0;' : 'background: #2196f3;';
            const melonBtnTitle = this.modSupport.melonLoaderInstalled ? 'Re-install/Update MelonLoader' : 'Install MelonLoader';
            infoHtml += `<button id="install-melonloader-btn" class="btn installer-btn" style="${melonBtnStyle} margin-left: 5px;" title="${melonBtnTitle}">${melonBtnText}</button>`;
        }

        if (this.modSupport.isUnreal) {
            infoHtml += '<span class="badge unreal">🎮 Unreal Engine</span>';
        }

        if (this.modSupport.engine && !this.modSupport.isUnity && !this.modSupport.isUnreal) {
            infoHtml += `<span class="badge engine">${this.modSupport.engine} Engine</span>`;
        }

        infoHtml += '</div>';
        infoEl.innerHTML = infoHtml;

        // Add installer button listeners
        document.getElementById('install-bepinex-btn')?.addEventListener('click', () => {
            this.installBepInEx();
        });
        document.getElementById('install-melonloader-btn')?.addEventListener('click', () => {
            this.installMelonLoader();
        });
    }

    /**
     * Browse Thunderstore mods
     */
    async browseThunderstore() {
        if (!this.currentGame) {
            this.showToast('Please select a game first', 'warning');
            return;
        }

        if (!window.electronAPI) {
            this.showToast('Thunderstore browsing requires Electron mode', 'info');
            return;
        }

        // Show loading state
        const resultsContainer = document.getElementById('browse-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = `
                <div class="loading-state">
                    <div class="spinner" style="
                        border: 4px solid rgba(255,255,255,0.1);
                        border-top: 4px solid #4fc3f7;
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    "></div>
                    <p>Searching Thunderstore...</p>
                </div>
            `;
        }

        this.showToast('Searching Thunderstore...', 'info');

        try {
            const result = await window.electronAPI.searchThunderstoreMods(this.currentGame.id);
            if (result.success && result.mods) {
                this.showBrowseResults(result.mods, 'thunderstore');
            } else {
                if (resultsContainer) {
                    resultsContainer.innerHTML = '<div class="empty-state">No mods found on Thunderstore for this game</div>';
                }
                this.showToast('No mods found on Thunderstore', 'info');
            }
        } catch (error) {
            window.logger?.error('UNIFIED_MOD_MANAGER', 'Failed to search Thunderstore:', error);
            if (resultsContainer) {
                resultsContainer.innerHTML = '<div class="empty-state">Failed to search Thunderstore. Please try again.</div>';
            }
            this.showToast('Failed to search Thunderstore', 'error');
        }
    }

    /**
     * Browse Steam Workshop
     */
    async browseWorkshop() {
        if (!this.currentGame) {
            this.showToast('Please select a game first', 'warning');
            return;
        }

        if (!this.modSupport.hasWorkshop) {
            this.showToast('This game does not support Steam Workshop', 'info');
            return;
        }

        this.showToast('Steam Workshop browsing coming soon', 'info');
        // TODO: Implement Steam Workshop API integration
    }

    /**
     * Browse Nexus Mods
     */
    async browseNexus() {
        if (!this.currentGame) {
            this.showToast('Please select a game first', 'warning');
            return;
        }

        if (!this.apiKeys.nexusMods) {
            this.showToast('Please set your Nexus Mods API key in Settings', 'warning');
            this.switchTab('settings');
            return;
        }

        if (!window.electronAPI) {
            this.showToast('Nexus browsing requires Electron mode', 'info');
            return;
        }

        // Show loading state
        const resultsContainer = document.getElementById('browse-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = `
                <div class="loading-state">
                    <div class="spinner" style="
                        border: 4px solid rgba(255,255,255,0.1);
                        border-top: 4px solid #da8b2d;
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    "></div>
                    <p>Searching Nexus Mods...</p>
                </div>
            `;
        }

        this.showToast('Searching Nexus Mods...', 'info');

        try {
            const result = await window.electronAPI.searchNexusMods(this.currentGame.id, this.apiKeys.nexusMods);

            if (result.success && result.mods) {
                this.showBrowseResults(result.mods, 'nexus');
            } else {
                if (resultsContainer) {
                    let errorMessage = result.error || 'No mods found';
                    if (errorMessage.includes('not found') || errorMessage.includes('domain')) {
                         errorMessage += `<br><br>
                         <div style="margin-top: 10px;">
                             <input type="text" id="manual-nexus-domain" placeholder="Enter game domain (e.g. 'skyrim')" style="padding: 5px; color: black;">
                             <button id="set-nexus-domain-btn" class="btn" style="margin-left: 5px;">Set Domain</button>
                         </div>`;
                    }
                    resultsContainer.innerHTML = `<div class="empty-state">${errorMessage}</div>`;

                    // Attach handler for manual domain entry
                    setTimeout(() => {
                        document.getElementById('set-nexus-domain-btn')?.addEventListener('click', async () => {
                            const domain = document.getElementById('manual-nexus-domain').value;
                            if (domain) {
                                await window.electronAPI.setNexusGameDomain(this.currentGame.id, domain);
                                this.browseNexus(); // Retry
                            }
                        });
                    }, 0);
                }
                this.showToast(result.error || 'Failed to fetch Nexus Mods', 'error');
            }
        } catch (error) {
            window.logger?.error('UNIFIED_MOD_MANAGER', 'Failed to search Nexus Mods:', error);
            if (resultsContainer) {
                resultsContainer.innerHTML = '<div class="empty-state">Failed to search Nexus Mods. Please try again.</div>';
            }
            this.showToast('Failed to search Nexus Mods', 'error');
        }
    }

    /**
     * Show browse results
     */
    showBrowseResults(mods, source) {
        this.thunderstoreMods = mods;
        this.currentPage = 1;
        this.currentFilteredMods = mods;

        const resultsContainer = document.getElementById('browse-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            // Rebuild the results structure (in case it was replaced by loading state)
            resultsContainer.innerHTML = `
                <div class="browse-header">
                    <input type="text" id="browse-search" class="search-input" placeholder="Search mods...">
                    <select id="browse-sort" class="sort-select">
                        <option value="downloads">Most Downloaded</option>
                        <option value="rating">Highest Rated</option>
                        <option value="name">Name (A-Z)</option>
                        <option value="recent">Recently Updated</option>
                    </select>
                    <div class="browse-filter-tabs">
                        <button class="filter-tab-btn active" data-filter="all">All</button>
                        <button class="filter-tab-btn" data-filter="mods">Mods</button>
                        <button class="filter-tab-btn" data-filter="modpacks">Modpacks</button>
                    </div>
                </div>
                <div id="browse-mod-list" class="browse-mod-list"></div>
                <div id="browse-pagination" class="pagination-controls"></div>
            `;
        }

        this.renderBrowseMods(mods);
        this.setupBrowseEventListeners();
        this.renderPagination(mods);

        this.showToast(`Found ${mods.length} mods!`, 'success');
    }

    /**
     * Setup browse event listeners
     */
    setupBrowseEventListeners() {
        // Search
        const searchInput = document.getElementById('browse-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterBrowseMods(e.target.value);
            });
        }

        // Sort
        const sortSelect = document.getElementById('browse-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBrowseMods(e.target.value);
            });
        }

        // Filter tabs
        document.querySelectorAll('.browse-filter-tabs .filter-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.browse-filter-tabs .filter-tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterByTab(this.thunderstoreMods, e.target.dataset.filter);
            });
        });
    }

    /**
     * Filter by tab (all/mods/modpacks)
     */
    filterByTab(mods, tab) {
        this.currentTabFilter = tab;
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

        this.currentPage = 1;
        this.currentFilteredMods = filteredMods;
        this.renderBrowseMods(filteredMods);
        this.renderPagination(filteredMods);
    }

    /**
     * Filter browse mods by search term
     */
    filterBrowseMods(searchTerm) {
        const cards = document.querySelectorAll('.browse-mod-card');
        const term = searchTerm.toLowerCase();

        cards.forEach(card => {
            const modName = card.dataset.modName || '';
            const modDescription = card.querySelector('.mod-description')?.textContent.toLowerCase() || '';
            const modAuthor = card.querySelector('.mod-author')?.textContent.toLowerCase() || '';

            if (modName.includes(term) || modDescription.includes(term) || modAuthor.includes(term)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    /**
     * Sort browse mods
     */
    sortBrowseMods(sortBy) {
        let sortedMods = [...this.currentFilteredMods];

        switch (sortBy) {
            case 'downloads':
                sortedMods.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
                break;
            case 'rating':
                sortedMods.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'name':
                sortedMods.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'recent':
                sortedMods.sort((a, b) => (b.version || '').localeCompare(a.version || ''));
                break;
        }

        this.currentPage = 1;
        this.currentFilteredMods = sortedMods;
        this.renderBrowseMods(sortedMods);
        this.renderPagination(sortedMods);
    }

    /**
     * Render browse mods
     */
    renderBrowseMods(mods) {
        const container = document.getElementById('browse-mod-list');
        if (!container) return;

        if (!mods || mods.length === 0) {
            container.innerHTML = '<div class="empty-state">No mods found</div>';
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedMods = mods.slice(startIndex, endIndex);

        container.innerHTML = paginatedMods.map((mod, index) => {
            const descriptionHtml = this.markdownToHtml(mod.description);
            const plainTextDesc = mod.description || '';
            const maxLength = 150;
            const needsReadMore = plainTextDesc.length > maxLength;
            const truncatedPlain = plainTextDesc.substring(0, maxLength) + '...';
            const cardId = `mod-card-${this.currentPage}-${index}`;

            return `
            <div class="browse-mod-card" data-mod-name="${this.escapeHtml(mod.name.toLowerCase())}" data-is-modpack="${mod.isModpack || false}" data-card-id="${cardId}">
                <div class="mod-icon">
                    ${(mod.iconUrl && this.isSafeUrl(mod.iconUrl)) ? `<img src="${this.escapeHtml(mod.iconUrl)}" alt="${this.escapeHtml(mod.name)}" onerror="this.parentElement.innerHTML='📦'">` : '📦'}
                </div>
                <div class="mod-info-section">
                    <div class="mod-title-row">
                        <h4 class="mod-name">${this.escapeHtml(mod.name)}</h4>
                        <span class="mod-version">v${this.escapeHtml(mod.version || '1.0')}</span>
                        ${mod.isModpack ? '<span class="modpack-badge">📦 Modpack</span>' : ''}
                        ${mod.isPinned ? '<span class="pinned-badge">📌 Pinned</span>' : ''}
                    </div>
                    <div class="mod-author">by ${this.escapeHtml(mod.owner || mod.author || 'Unknown')}</div>
                    <div class="mod-description" id="${cardId}-desc">
                        <span class="desc-text">${needsReadMore ? this.escapeHtml(truncatedPlain) : descriptionHtml}</span>
                        ${needsReadMore ? `
                            <button class="read-more-btn" data-card-id="${cardId}" data-full-html="${descriptionHtml.replace(/"/g, '&quot;')}" data-short-text="${this.escapeHtml(truncatedPlain).replace(/"/g, '&quot;')}">Read More</button>
                        ` : ''}
                    </div>
                    <div class="mod-stats">
                        <span class="stat">⬇️ ${this.formatNumber(mod.downloads || 0)}</span>
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
        `;
        }).join('');

        // Attach install handlers
        this.attachInstallHandlers();
        // Attach Read More handlers
        this.attachReadMoreHandlers();
    }

    /**
     * Render pagination
     */
    renderPagination(mods) {
        const totalPages = Math.ceil(mods.length / this.itemsPerPage);
        const paginationContainer = document.getElementById('browse-pagination');

        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';

        let startPage = Math.max(1, this.currentPage - 3);
        let endPage = Math.min(totalPages, startPage + 6);

        if (endPage - startPage < 6) {
            startPage = Math.max(1, endPage - 6);
        }

        let paginationHTML = `
            <div class="pagination-info">
                Showing ${((this.currentPage - 1) * this.itemsPerPage) + 1}-${Math.min(this.currentPage * this.itemsPerPage, mods.length)} of ${mods.length}
            </div>
            <div class="pagination-buttons">
                <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" data-page="1" ${this.currentPage === 1 ? 'disabled' : ''}>⏮ First</button>
                <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>◀ Prev</button>
        `;

        if (startPage > 1) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-btn page-number ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>
            `;
        }

        if (endPage < totalPages) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }

        paginationHTML += `
                <button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" data-page="${this.currentPage + 1}" ${this.currentPage === totalPages ? 'disabled' : ''}>Next ▶</button>
                <button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" data-page="${totalPages}" ${this.currentPage === totalPages ? 'disabled' : ''}>Last ⏭</button>
            </div>
        `;

        paginationContainer.innerHTML = paginationHTML;

        // Attach pagination handlers
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
     * Go to page
     */
    goToPage(page, mods) {
        this.currentPage = page;
        this.renderBrowseMods(mods);
        this.renderPagination(mods);

        const container = document.getElementById('browse-mod-list');
        if (container) {
            container.scrollTop = 0;
        }
    }

    /**
     * Attach install handlers
     */
    attachInstallHandlers() {
        document.querySelectorAll('.install-mod-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                try {
                    const modData = JSON.parse(e.target.dataset.mod.replace(/&#39;/g, "'"));
                    await this.installMod(modData, e.target);
                } catch (error) {
                    window.logger?.error('UNIFIED_MOD_MANAGER', 'Error parsing mod data:', error);
                    this.showToast('Failed to install mod: Invalid mod data', 'error');
                }
            });
        });
    }

    /**
     * Attach Read More handlers
     */
    attachReadMoreHandlers() {
        document.querySelectorAll('.read-more-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.target;
                const cardId = button.dataset.cardId;
                const descContainer = document.getElementById(`${cardId}-desc`);
                const descText = descContainer.querySelector('.desc-text');
                const isExpanded = button.textContent === 'Read Less';

                if (isExpanded) {
                    // Collapse - show truncated plain text
                    const shortText = button.dataset.shortText.replace(/&quot;/g, '"');
                    descText.textContent = shortText;
                    button.textContent = 'Read More';
                } else {
                    // Expand - show full HTML description
                    const fullHtml = button.dataset.fullHtml.replace(/&quot;/g, '"');
                    descText.innerHTML = fullHtml;
                    button.textContent = 'Read Less';
                }
            });
        });
    }

    /**
     * Install a mod
     */
    async installMod(modData, buttonElement) {
        if (!this.currentGame || !window.electronAPI) return;

        // Check for dependencies (BepInEx/MelonLoader) for Unity games
        if (this.modSupport.isUnity) {
            const modNameLower = modData.name.toLowerCase();
            const modDescLower = (modData.description || '').toLowerCase();
            const categories = (modData.categories || []).map(c => c.toLowerCase());

            // Check if it's explicitly MelonLoader
            const isMelonMod = modNameLower.includes('melon') ||
                               modDescLower.includes('melonloader') ||
                               categories.some(c => c.includes('melon'));

            // It's a BepInEx mod if it's not a loader itself AND (it's not Melon or it explicitly says BepInEx)
            // Default to BepInEx for Thunderstore if ambiguous, as it's the standard there
            const isBepInExMod = !modNameLower.includes('bepinex') && !modNameLower.includes('melonloader') && !isMelonMod;

            if (isMelonMod && !modNameLower.includes('melonloader')) {
                // Check MelonLoader status
                let melonStatus = { isInstalled: false };
                try {
                    melonStatus = await window.electronAPI.checkModLoaderStatus(this.currentGame.id, 'melonloader');
                } catch (e) { console.error(e); }

                if (!melonStatus.isInstalled) {
                    if (confirm('This mod likely requires MelonLoader, but it is not correctly installed. Install MelonLoader first?')) {
                        this.showToast('Installing MelonLoader first...', 'info');
                        const result = await this.installMelonLoader(true); // Assuming we add internalCall support to installMelonLoader too
                        if (!result && result !== undefined) { // installMelonLoader might not return boolean yet if not updated
                             // If it doesn't return anything (void), we assume it started.
                             // But ideally we should update installMelonLoader to return success like installBepInEx
                        }
                    }
                }
            } else if (isBepInExMod) {
                // Check BepInEx status
                let bepStatus = { isInstalled: false };
                try {
                    bepStatus = await window.electronAPI.checkModLoaderStatus(this.currentGame.id, 'bepinex');
                } catch (e) { console.error(e); }

                if (!bepStatus.isInstalled) {
                    if (confirm('This mod likely requires BepInEx, but it is not correctly installed (missing core files or proxy). Install BepInEx first?')) {
                        // Install BepInEx
                        this.showToast('Installing BepInEx first...', 'info');
                        const bepResult = await this.installBepInEx(true); // true = internal call
                        if (!bepResult) {
                            this.showToast('BepInEx installation failed, aborting mod install', 'error');
                            return;
                        }
                    } else {
                        // User declined
                        this.showToast('Proceeding without verified BepInEx...', 'warning');
                    }
                }
            }
        }

        const btn = buttonElement;
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Installing...';
        }

        this.showToast(`Installing ${modData.name}...`, 'info');

        try {
            const result = await window.electronAPI.installThunderstoreMod(this.currentGame.id, modData);
            if (result.success) {
                this.showToast(`${modData.name} installed successfully!`, 'success');
                if (btn) {
                    btn.textContent = '✓ Installed';
                    btn.classList.add('installed');
                }

                // Refresh installed mods
                setTimeout(() => {
                    this.loadModsForGame(this.currentGame.id);
                }, 1000);
            } else {
                this.showToast(`Failed to install: ${result.error}`, 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Install';
                }
            }
        } catch (error) {
            window.logger?.error('UNIFIED_MOD_MANAGER', 'Failed to install mod:', error);
            this.showToast('Failed to install mod', 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Install';
            }
        }
    }

    /**
     * Load installed mods for game
     */
    async loadModsForGame(gameId) {
        if (!window.electronAPI || !window.electronAPI.getGameMods) {
            this.showToast('Mod manager requires Electron mode', 'info');
            this.mods = [];
            this.renderInstalledMods();
            return;
        }

        try {
            const result = await window.electronAPI.getGameMods(gameId);
            if (result.success && result.mods) {
                this.mods = result.mods;
                this.modSupport = result.modSupport || this.modSupport;
                this.renderInstalledMods();
                this.updateInstalledCount();
            }
        } catch (error) {
            window.logger?.error('UNIFIED_MOD_MANAGER', 'Failed to load mods:', error);
            this.showToast('Failed to load mods', 'error');
        }
    }

    /**
     * Render installed mods list
     */
    renderInstalledMods() {
        const container = document.getElementById('installed-mod-list');
        if (!container) return;

        if (this.mods.length === 0) {
            container.innerHTML = '<div class="empty-state">No mods installed</div>';
            return;
        }

        container.innerHTML = this.mods.map((mod, index) => `
            <div class="installed-mod-item ${mod.enabled ? 'enabled' : 'disabled'} ${mod.hasConflict ? 'conflict' : ''}" data-mod-id="${mod.id}" draggable="true">
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
                    <button class="mod-info-btn" data-index="${index}" title="Info">ℹ️</button>
                    <button class="mod-delete-btn" data-index="${index}" title="Delete">🗑️</button>
                </div>
            </div>
        `).join('');

        // Event listeners for checkboxes
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index, 10);
                this.mods[index].enabled = e.target.checked;
                this.updateInstalledModItem(index);
            });
        });

        // Info buttons
        container.querySelectorAll('.mod-info-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index, 10);
                this.showModInfo(this.mods[index]);
            });
        });

        // Delete buttons
        container.querySelectorAll('.mod-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index, 10);
                this.deleteMod(this.mods[index], index);
            });
        });

        // Drag and drop for load order
        this.makeModListSortable(container);
    }

    /**
     * Update installed mod item
     */
    updateInstalledModItem(index) {
        const item = document.querySelector(`.installed-mod-item[data-mod-id="${this.mods[index].id}"]`);
        if (item) {
            item.classList.toggle('enabled', this.mods[index].enabled);
            item.classList.toggle('disabled', !this.mods[index].enabled);
        }
        this.updateInstalledCount();
    }

    /**
     * Update installed count badge
     */
    updateInstalledCount() {
        const badge = document.getElementById('installed-count');
        const display = document.getElementById('mod-count-display');

        const total = this.mods.length;
        const enabled = this.mods.filter(m => m.enabled).length;

        if (badge) {
            badge.textContent = total;
        }
        if (display) {
            display.textContent = `${total} mods (${enabled} enabled)`;
        }
    }

    /**
     * Filter installed mods
     */
    filterInstalledMods(filter) {
        const items = document.querySelectorAll('.installed-mod-item');

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
     * Make mod list sortable (drag and drop)
     */
    makeModListSortable(container) {
        let draggedItem = null;

        container.querySelectorAll('.installed-mod-item').forEach(item => {
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

        container.addEventListener('drop', () => {
            this.updateModLoadOrder();
        });
    }

    /**
     * Update mod load order
     */
    updateModLoadOrder() {
        const items = document.querySelectorAll('.installed-mod-item');
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
    }

    /**
     * Delete mod
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
                this.renderInstalledMods();
                this.updateInstalledCount();
                this.showToast('Mod deleted', 'success');
            }
        } catch (error) {
            window.logger?.error('UNIFIED_MOD_MANAGER', 'Failed to delete mod:', error);
            this.showToast('Failed to delete mod', 'error');
        }
    }

    /**
     * Scan for mods
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
            window.logger?.error('UNIFIED_MOD_MANAGER', 'Failed to scan mods:', error);
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
            window.logger?.error('UNIFIED_MOD_MANAGER', 'Failed to apply changes:', error);
            this.showToast('Error applying mod changes', 'error');
        }
    }

    /**
     * Open mod folder
     */
    async openModFolder() {
        if (!this.currentGame) {
            this.showToast('No game selected', 'error');
            return;
        }

        if (!window.electronAPI || !window.electronAPI.openModFolder) {
            this.showToast('Mod folder opening requires Electron mode', 'info');
            return;
        }

        try {
            const result = await window.electronAPI.openModFolder(this.currentGame.id);
            if (result.success) {
                this.showToast('Opening mod folder...', 'success');
            } else {
                this.showToast(`Failed to open mod folder: ${result.error}`, 'error');
            }
        } catch (error) {
            window.logger?.error('UNIFIED_MOD_MANAGER', 'Failed to open mod folder:', error);
            this.showToast(`Failed to open mod folder: ${error.message}`, 'error');
        }
    }

    /**
     * Install BepInEx
     * @param {boolean} internalCall - If true, returns success status instead of updating UI extensively
     */
    async installBepInEx(internalCall = false) {
        if (!this.currentGame) {
            this.showToast('No game selected', 'error');
            return false;
        }

        if (!window.electronAPI || !window.electronAPI.installBepInEx) {
            window.open('https://github.com/BepInEx/BepInEx/releases/latest', '_blank');
            this.showToast('Please download BepInEx manually and extract to game folder', 'info');
            return false;
        }

        // Disable button and show loading
        const btn = document.getElementById('install-bepinex-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Installing...';
            btn.style.opacity = '0.6';
        }

        this.showToast('Downloading BepInEx from GitHub...', 'info');

        try {
            const result = await window.electronAPI.installBepInEx(this.currentGame.id);
            if (result.success) {
                this.showToast('BepInEx installed successfully!', 'success');

                if (!internalCall) {
                    this.loadModsForGame(this.currentGame.id);
                    // Update UI status
                    if (this.modSupport.isUnity) {
                        this.modSupport.bepInExInstalled = true;
                        this.updateModSupportInfo();
                    }
                }
                return true;
            } else {
                this.showToast(`Failed to install BepInEx: ${result.error}`, 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Install BepInEx';
                    btn.style.opacity = '1';
                }
                return false;
            }
        } catch (error) {
            window.logger?.error('UNIFIED_MOD_MANAGER', 'Failed to install BepInEx:', error);
            this.showToast(`Failed to install BepInEx: ${error.message}`, 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Install BepInEx';
                btn.style.opacity = '1';
            }
            return false;
        }
    }

    /**
     * Install MelonLoader
     */
    async installMelonLoader() {
        if (!this.currentGame) {
            this.showToast('No game selected', 'error');
            return;
        }

        if (!window.electronAPI || !window.electronAPI.installMelonLoader) {
            window.open('https://github.com/LavaGang/MelonLoader/releases/latest', '_blank');
            this.showToast('Please download MelonLoader manually and extract to game folder', 'info');
            return;
        }

        // Disable button and show loading
        const btn = document.getElementById('install-melonloader-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Installing...';
            btn.style.opacity = '0.6';
        }

        this.showToast('Downloading MelonLoader from GitHub...', 'info');

        try {
            const result = await window.electronAPI.installMelonLoader(this.currentGame.id);
            if (result.success) {
                this.showToast('MelonLoader installed successfully!', 'success');

                this.loadModsForGame(this.currentGame.id);
                // Update UI status
                if (this.modSupport.isUnity) {
                    this.modSupport.melonLoaderInstalled = true;
                    this.updateModSupportInfo();
                }
            } else {
                this.showToast(`Failed to install MelonLoader: ${result.error}`, 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Install MelonLoader';
                    btn.style.opacity = '1';
                }
            }
        } catch (error) {
            window.logger?.error('UNIFIED_MOD_MANAGER', 'Failed to install MelonLoader:', error);
            this.showToast(`Failed to install MelonLoader: ${error.message}`, 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Install MelonLoader';
                btn.style.opacity = '1';
            }
        }
    }

    /**
     * Create mod profile
     */
    createProfile() {
        const name = prompt('Enter profile name:');
        if (!name) return;

        const profile = {
            id: Date.now(),
            name: name,
            gameId: this.currentGame?.id,
            mods: [...this.mods],
            createdAt: new Date().toISOString()
        };

        this.profiles.push(profile);
        this.saveProfiles();
        this.renderProfiles();
        this.showToast(`Profile "${name}" created`, 'success');
    }

    /**
     * Render profiles
     */
    renderProfiles() {
        const container = document.getElementById('profiles-list');
        if (!container) return;

        if (this.profiles.length === 0) {
            container.innerHTML = '<div class="empty-state">No mod profiles created yet</div>';
            return;
        }

        container.innerHTML = this.profiles.map(profile => `
            <div class="profile-card ${this.activeProfile === profile.id ? 'active' : ''}">
                <div class="profile-info">
                    <h4>${this.escapeHtml(profile.name)}</h4>
                    <small>${profile.mods.length} mods</small>
                </div>
                <div class="profile-actions">
                    <button class="btn load-profile-btn" data-profile-id="${profile.id}">Load</button>
                    <button class="btn delete-profile-btn" data-profile-id="${profile.id}">Delete</button>
                </div>
            </div>
        `).join('');

        // Event listeners
        container.querySelectorAll('.load-profile-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const profileId = parseInt(e.target.dataset.profileId);
                this.loadProfile(profileId);
            });
        });

        container.querySelectorAll('.delete-profile-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const profileId = parseInt(e.target.dataset.profileId);
                this.deleteProfile(profileId);
            });
        });
    }

    /**
     * Load profile
     */
    loadProfile(profileId) {
        const profile = this.profiles.find(p => p.id === profileId);
        if (!profile) return;

        this.mods = [...profile.mods];
        this.activeProfile = profileId;
        this.renderInstalledMods();
        this.showToast(`Profile "${profile.name}" loaded`, 'success');
    }

    /**
     * Delete profile
     */
    deleteProfile(profileId) {
        const profile = this.profiles.find(p => p.id === profileId);
        if (!profile) return;

        if (!confirm(`Delete profile "${profile.name}"?`)) return;

        this.profiles = this.profiles.filter(p => p.id !== profileId);
        this.saveProfiles();
        this.renderProfiles();
        this.showToast(`Profile "${profile.name}" deleted`, 'success');
    }

    /**
     * Save profiles
     */
    saveProfiles() {
        localStorage.setItem('modProfiles', JSON.stringify(this.profiles));
        if (this.activeProfile) {
            localStorage.setItem('activeModProfile', this.activeProfile);
        }
    }

    /**
     * Load settings
     */
    loadSettings() {
        const nexusKey = document.getElementById('nexus-api-key');
        const steamKey = document.getElementById('steam-api-key');
        const autoEnable = document.getElementById('auto-enable-mods');
        const checkConflicts = document.getElementById('check-conflicts');

        if (nexusKey) nexusKey.value = this.apiKeys.nexusMods;
        if (steamKey) steamKey.value = this.apiKeys.steamWorkshop;
        if (autoEnable) autoEnable.checked = localStorage.getItem('autoEnableMods') === 'true';
        if (checkConflicts) checkConflicts.checked = localStorage.getItem('checkConflicts') === 'true';
    }

    /**
     * Save settings
     */
    saveSettings() {
        const nexusKey = document.getElementById('nexus-api-key')?.value || '';
        const steamKey = document.getElementById('steam-api-key')?.value || '';
        const autoEnable = document.getElementById('auto-enable-mods')?.checked || false;
        const checkConflicts = document.getElementById('check-conflicts')?.checked || false;

        this.apiKeys.nexusMods = nexusKey;
        this.apiKeys.steamWorkshop = steamKey;

        localStorage.setItem('nexusModsApiKey', nexusKey);
        localStorage.setItem('steamWorkshopApiKey', steamKey);
        localStorage.setItem('autoEnableMods', autoEnable);
        localStorage.setItem('checkConflicts', checkConflicts);

        this.showToast('Settings saved', 'success');
    }

    /**
     * Test Nexus Mods API
     */
    async testNexusAPI() {
        const apiKey = document.getElementById('nexus-api-key')?.value;
        if (!apiKey) {
            this.showToast('Please enter an API key first', 'warning');
            return;
        }

        try {
            const response = await fetch('https://api.nexusmods.com/v1/users/validate.json', {
                method: 'GET',
                headers: {
                    'apikey': apiKey,
                    'accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showToast(`API connection successful! Connected as: ${data.name}`, 'success');
            } else {
                this.showToast('API connection failed. Check your API key.', 'error');
            }
        } catch (error) {
            window.logger?.error('UNIFIED_MOD_MANAGER', 'Nexus API test failed:', error);
            this.showToast('Failed to test API connection', 'error');
        }
    }

    /**
     * Test Steam API
     */
    async testSteamAPI() {
        this.showToast('Steam API testing coming soon', 'info');
    }

    /**
     * Helper: Markdown to HTML
     */
    markdownToHtml(markdown) {
        if (!markdown) return 'No description available';

        let html = markdown
            .replace(/^### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^## (.*$)/gim, '<h3>$1</h3>')
            .replace(/^# (.*$)/gim, '<h2>$1</h2>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\_\_(.*?)\_\_/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\_(.*?)\_/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\n/g, '<br>');

        return html;
    }

    /**
     * Helper: Format number
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
     * Helper: Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Helper: Validate URL
     */
    isSafeUrl(url) {
        if (!url || typeof url !== 'string') return false;
        const urlLower = url.trim().toLowerCase();
        return urlLower.startsWith('http://') || urlLower.startsWith('https://') || urlLower.startsWith('file://');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (window.coverflow && typeof window.coverflow.showToast === 'function') {
            window.coverflow.showToast(message, type);
        } else {
            console.log(`[UNIFIED_MOD_MANAGER] ${type.toUpperCase()}: ${message}`);
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedModManager;
}
