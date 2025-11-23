// Game Mod Browser Module
// Browse and manage mods from Nexus Mods and Steam Workshop

class ModBrowserManager {
    constructor() {
        this.currentGame = null;
        this.installedMods = this.loadInstalledMods();
        this.modProfiles = this.loadModProfiles();
        this.apiKeys = this.loadAPIKeys();
        this.activeModal = null; // Track active modal for cleanup
    }

    loadInstalledMods() {
        try {
            const saved = localStorage.getItem('installed-mods');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load installed mods:', error);
            return {};
        }
    }

    saveInstalledMods() {
        try {
            localStorage.setItem('installed-mods', JSON.stringify(this.installedMods));
        } catch (error) {
            console.error('Failed to save installed mods:', error);
        }
    }

    loadModProfiles() {
        try {
            const saved = localStorage.getItem('mod-profiles');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load mod profiles:', error);
            return {};
        }
    }

    saveModProfiles() {
        try {
            localStorage.setItem('mod-profiles', JSON.stringify(this.modProfiles));
        } catch (error) {
            console.error('Failed to save mod profiles:', error);
        }
    }

    loadAPIKeys() {
        try {
            const saved = localStorage.getItem('mod-api-keys');
            return saved ? JSON.parse(saved) : { nexusMods: '', steamWorkshop: '' };
        } catch (error) {
            return { nexusMods: '', steamWorkshop: '' };
        }
    }

    saveAPIKeys() {
        try {
            localStorage.setItem('mod-api-keys', JSON.stringify(this.apiKeys));
        } catch (error) {
            console.error('Failed to save API keys:', error);
        }
    }

    // Open mod browser for a game
    openModBrowser(game) {
        this.currentGame = game;
        this.showModBrowserModal();
    }

    showModBrowserModal() {
        // Close existing modal if any
        if (this.activeModal) {
            this.closeModBrowser();
        }

        const modal = document.createElement('div');
        modal.id = 'mod-browser-modal';
        modal.className = 'modal-overlay';
        this.activeModal = modal;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: auto;
        `;

        modal.innerHTML = `
            <div class="mod-browser-container" style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 15px;
                padding: 25px;
                max-width: 1400px;
                width: 95%;
                max-height: 95vh;
                overflow: auto;
                box-shadow: 0 10px 50px rgba(0,0,0,0.5);
            ">
                <div class="mod-browser-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 15px;">
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        🔧 Mod Browser - ${this.currentGame.name}
                    </h2>
                    <button id="close-mod-browser" class="btn" style="font-size: 24px; padding: 5px 15px;">✕</button>
                </div>

                <div class="mod-browser-tabs" style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button class="mod-tab active" data-tab="browse" style="padding: 10px 20px; background: rgba(52, 152, 219, 0.3); border: none; border-radius: 5px; color: white; cursor: pointer;">
                        🔍 Browse Mods
                    </button>
                    <button class="mod-tab" data-tab="installed" style="padding: 10px 20px; background: rgba(255,255,255,0.1); border: none; border-radius: 5px; color: white; cursor: pointer;">
                        📦 Installed Mods
                    </button>
                    <button class="mod-tab" data-tab="profiles" style="padding: 10px 20px; background: rgba(255,255,255,0.1); border: none; border-radius: 5px; color: white; cursor: pointer;">
                        💾 Profiles
                    </button>
                    <button class="mod-tab" data-tab="settings" style="padding: 10px 20px; background: rgba(255,255,255,0.1); border: none; border-radius: 5px; color: white; cursor: pointer;">
                        ⚙️ Settings
                    </button>
                </div>

                <div id="mod-content-area"></div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup event listeners
        modal.querySelector('#close-mod-browser').addEventListener('click', () => {
            this.closeModBrowser();
        });

        // Tab switching
        modal.querySelectorAll('.mod-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                modal.querySelectorAll('.mod-tab').forEach(t => {
                    t.style.background = 'rgba(255,255,255,0.1)';
                    t.classList.remove('active');
                });
                e.target.style.background = 'rgba(52, 152, 219, 0.3)';
                e.target.classList.add('active');

                this.showTab(e.target.dataset.tab, modal);
            });
        });

        // Show default tab
        this.showTab('browse', modal);
    }

    showTab(tabName, modal) {
        const contentArea = modal.querySelector('#mod-content-area');

        switch (tabName) {
            case 'browse':
                this.renderBrowseTab(contentArea);
                break;
            case 'installed':
                this.renderInstalledTab(contentArea);
                break;
            case 'profiles':
                this.renderProfilesTab(contentArea);
                break;
            case 'settings':
                this.renderSettingsTab(contentArea);
                break;
        }
    }

    renderBrowseTab(container) {
        container.innerHTML = `
            <div class="browse-tab">
                <div class="search-bar" style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <input type="text" id="mod-search" placeholder="Search mods..." style="
                        flex: 1;
                        padding: 12px;
                        border: 2px solid rgba(255,255,255,0.2);
                        border-radius: 5px;
                        background: rgba(255,255,255,0.05);
                        color: white;
                        font-size: 14px;
                    ">
                    <select id="mod-source" style="
                        padding: 12px;
                        border: 2px solid rgba(255,255,255,0.2);
                        border-radius: 5px;
                        background: rgba(255,255,255,0.05);
                        color: white;
                    ">
                        <option value="all">All Sources</option>
                        <option value="nexus">Nexus Mods</option>
                        <option value="workshop">Steam Workshop</option>
                        <option value="moddb">ModDB</option>
                    </select>
                    <button id="search-mods-btn" class="btn btn-primary">Search</button>
                </div>

                <div class="mod-filters" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                    <button class="filter-btn" data-filter="popular">⭐ Popular</button>
                    <button class="filter-btn" data-filter="recent">🆕 Recent</button>
                    <button class="filter-btn" data-filter="trending">📈 Trending</button>
                    <button class="filter-btn" data-filter="endorsed">👍 Most Endorsed</button>
                </div>

                <div id="mod-results" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 20px;
                    margin-top: 20px;
                ">
                    ${this.renderPlaceholderMods()}
                </div>
            </div>
        `;

        // Event listeners
        container.querySelector('#search-mods-btn').addEventListener('click', () => {
            this.searchMods(container);
        });

        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyFilter(e.target.dataset.filter, container);
            });
        });
    }

    renderPlaceholderMods() {
        // Placeholder mods (in real implementation, these would be fetched from APIs)
        const placeholders = [
            {
                name: 'HD Texture Pack',
                author: 'ModAuthor123',
                downloads: 125000,
                rating: 4.8,
                thumbnail: 'https://via.placeholder.com/300x150',
                description: 'High-resolution texture overhaul'
            },
            {
                name: 'Gameplay Overhaul',
                author: 'ProModder',
                downloads: 85000,
                rating: 4.6,
                thumbnail: 'https://via.placeholder.com/300x150',
                description: 'Complete gameplay mechanics rework'
            },
            {
                name: 'Quality of Life Improvements',
                author: 'QoLMaster',
                downloads: 210000,
                rating: 4.9,
                thumbnail: 'https://via.placeholder.com/300x150',
                description: 'Essential UI and gameplay improvements'
            }
        ];

        return placeholders.map(mod => this.renderModCard(mod)).join('');
    }

    renderModCard(mod) {
        return `
            <div class="mod-card" style="
                background: rgba(255,255,255,0.05);
                border-radius: 10px;
                overflow: hidden;
                transition: transform 0.2s, box-shadow 0.2s;
                cursor: pointer;
                border: 2px solid rgba(255,255,255,0.1);
            " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 30px rgba(0,0,0,0.3)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                <div class="mod-thumbnail" style="
                    width: 100%;
                    height: 150px;
                    background: url('${mod.thumbnail}') center/cover;
                    background-color: rgba(255,255,255,0.1);
                "></div>
                <div class="mod-info" style="padding: 15px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 16px;">${mod.name}</h3>
                    <p style="margin: 0 0 10px 0; font-size: 12px; color: rgba(255,255,255,0.7);">
                        by ${mod.author}
                    </p>
                    <p style="margin: 0 0 10px 0; font-size: 13px; color: rgba(255,255,255,0.8);">
                        ${mod.description}
                    </p>
                    <div class="mod-stats" style="display: flex; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,0.6);">
                        <span>📥 ${this.formatNumber(mod.downloads)}</span>
                        <span>⭐ ${mod.rating}/5</span>
                    </div>
                    <button class="btn btn-primary" style="width: 100%; margin-top: 10px;" onclick="window.modBrowserManager.installMod('${mod.name}')">
                        Install Mod
                    </button>
                </div>
            </div>
        `;
    }

    renderInstalledTab(container) {
        const gameId = this.currentGame.id;
        const installedMods = this.installedMods[gameId] || [];

        container.innerHTML = `
            <div class="installed-tab">
                <div class="installed-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>${installedMods.length} Installed Mods</h3>
                    <div style="display: flex; gap: 10px;">
                        <button id="enable-all-mods" class="btn">✓ Enable All</button>
                        <button id="disable-all-mods" class="btn">✗ Disable All</button>
                        <button id="check-updates" class="btn btn-primary">🔄 Check Updates</button>
                    </div>
                </div>

                <div id="installed-mods-list" style="display: flex; flex-direction: column; gap: 10px;">
                    ${installedMods.length > 0 ? installedMods.map(mod => this.renderInstalledMod(mod)).join('') : '<p style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No mods installed yet</p>'}
                </div>
            </div>
        `;

        // Event listeners
        container.querySelector('#enable-all-mods')?.addEventListener('click', () => {
            this.toggleAllMods(gameId, true);
            this.renderInstalledTab(container);
        });

        container.querySelector('#disable-all-mods')?.addEventListener('click', () => {
            this.toggleAllMods(gameId, false);
            this.renderInstalledTab(container);
        });

        container.querySelector('#check-updates')?.addEventListener('click', () => {
            this.checkModUpdates(gameId);
        });
    }

    renderInstalledMod(mod) {
        return `
            <div class="installed-mod" style="
                display: flex;
                align-items: center;
                padding: 15px;
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                border: 2px solid ${mod.enabled ? 'rgba(46, 204, 113, 0.5)' : 'rgba(255,255,255,0.1)'};
            ">
                <input type="checkbox" ${mod.enabled ? 'checked' : ''} onchange="window.modBrowserManager.toggleMod('${mod.id}')" style="margin-right: 15px; width: 20px; height: 20px;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 5px 0;">${mod.name}</h4>
                    <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.6);">
                        v${mod.version} • ${mod.author} • ${mod.size}
                    </p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn" onclick="window.modBrowserManager.configureMod('${mod.id}')">⚙️ Configure</button>
                    <button class="btn" onclick="window.modBrowserManager.uninstallMod('${mod.id}')">🗑️ Uninstall</button>
                </div>
            </div>
        `;
    }

    renderProfilesTab(container) {
        const gameId = this.currentGame.id;
        const profiles = this.modProfiles[gameId] || [];

        container.innerHTML = `
            <div class="profiles-tab">
                <div class="profiles-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>Mod Profiles</h3>
                    <button id="create-profile" class="btn btn-primary">+ Create New Profile</button>
                </div>

                <p style="color: rgba(255,255,255,0.7); margin-bottom: 20px;">
                    Profiles let you save different mod configurations and switch between them easily.
                </p>

                <div id="profiles-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
                    ${profiles.length > 0 ? profiles.map(profile => this.renderProfile(profile)).join('') : '<p style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No profiles created yet</p>'}
                </div>
            </div>
        `;

        container.querySelector('#create-profile')?.addEventListener('click', () => {
            this.createNewProfile(gameId, container);
        });
    }

    renderProfile(profile) {
        return `
            <div class="profile-card" style="
                padding: 20px;
                background: rgba(255,255,255,0.05);
                border-radius: 10px;
                border: 2px solid ${profile.active ? 'rgba(52, 152, 219, 0.8)' : 'rgba(255,255,255,0.1)'};
                position: relative;
            ">
                ${profile.active ? '<div style="position: absolute; top: 10px; right: 10px; background: rgba(52, 152, 219, 1); padding: 3px 8px; border-radius: 3px; font-size: 11px;">ACTIVE</div>' : ''}
                <h4 style="margin: 0 0 10px 0;">${profile.name}</h4>
                <p style="margin: 0 0 15px 0; font-size: 12px; color: rgba(255,255,255,0.6);">
                    ${profile.modCount} mods
                </p>
                <div style="display: flex; gap: 5px; flex-direction: column;">
                    <button class="btn btn-primary" style="width: 100%;" onclick="window.modBrowserManager.activateProfile('${profile.id}')">
                        ${profile.active ? '✓ Active' : 'Activate'}
                    </button>
                    <button class="btn" style="width: 100%;" onclick="window.modBrowserManager.deleteProfile('${profile.id}')">Delete</button>
                </div>
            </div>
        `;
    }

    renderSettingsTab(container) {
        container.innerHTML = `
            <div class="settings-tab">
                <h3>Mod Browser Settings</h3>

                <div class="settings-section" style="margin-top: 20px;">
                    <h4>🔑 API Keys</h4>
                    <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin-bottom: 15px;">
                        Enter your API keys to enable full mod browsing features.
                    </p>

                    <label style="display: block; margin-bottom: 15px;">
                        <strong>Nexus Mods API Key:</strong>
                        <input type="password" id="nexus-api-key" value="${this.apiKeys.nexusMods}" placeholder="Enter Nexus Mods API key" style="
                            width: 100%;
                            padding: 10px;
                            margin-top: 5px;
                            background: rgba(255,255,255,0.05);
                            border: 2px solid rgba(255,255,255,0.2);
                            border-radius: 5px;
                            color: white;
                        ">
                        <a href="https://www.nexusmods.com/users/myaccount?tab=api" target="_blank" style="font-size: 12px; color: #3498db;">Get API Key</a>
                    </label>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button id="save-api-keys" class="btn btn-primary">💾 Save API Keys</button>
                        <button id="test-connection" class="btn">🔌 Test Connection</button>
                    </div>
                </div>

                <div class="settings-section" style="margin-top: 30px;">
                    <h4>⚙️ General Settings</h4>

                    <label style="display: block; margin-top: 15px;">
                        <input type="checkbox" id="auto-check-updates">
                        <span>Automatically check for mod updates</span>
                    </label>

                    <label style="display: block; margin-top: 10px;">
                        <input type="checkbox" id="conflict-detection">
                        <span>Enable mod conflict detection</span>
                    </label>

                    <label style="display: block; margin-top: 10px;">
                        <input type="checkbox" id="backup-before-install">
                        <span>Create backup before installing mods</span>
                    </label>
                </div>
            </div>
        `;

        // Event listeners
        container.querySelector('#save-api-keys').addEventListener('click', () => {
            this.apiKeys.nexusMods = container.querySelector('#nexus-api-key').value;
            this.saveAPIKeys();
            alert('API keys saved!');
        });

        container.querySelector('#test-connection').addEventListener('click', () => {
            this.testAPIConnection();
        });
    }

    // Mod operations
    async searchMods(container) {
        const query = container.querySelector('#mod-search').value;
        const source = container.querySelector('#mod-source').value;

        console.log(`Searching for mods: ${query} from ${source}`);
        alert(`Search functionality requires API integration. In a full implementation, this would search ${source} for "${query}"`);

        // In a real implementation, this would make API calls to Nexus Mods/Steam Workshop
    }

    applyFilter(filter, container) {
        console.log(`Applying filter: ${filter}`);
        alert(`Filter functionality would fetch ${filter} mods from the mod sources.`);
    }

    async installMod(modName) {
        console.log(`Installing mod: ${modName}`);

        const gameId = this.currentGame.id;

        if (!this.installedMods[gameId]) {
            this.installedMods[gameId] = [];
        }

        // Add mod to installed list
        this.installedMods[gameId].push({
            id: `mod_${Date.now()}`,
            name: modName,
            version: '1.0.0',
            author: 'ModAuthor',
            size: '25 MB',
            enabled: true,
            installDate: new Date().toISOString()
        });

        this.saveInstalledMods();
        alert(`${modName} has been installed! Switch to the "Installed Mods" tab to manage it.`);
    }

    toggleMod(modId) {
        const gameId = this.currentGame.id;
        const mod = this.installedMods[gameId]?.find(m => m.id === modId);

        if (mod) {
            mod.enabled = !mod.enabled;
            this.saveInstalledMods();
        }
    }

    toggleAllMods(gameId, enabled) {
        if (this.installedMods[gameId]) {
            this.installedMods[gameId].forEach(mod => {
                mod.enabled = enabled;
            });
            this.saveInstalledMods();
        }
    }

    uninstallMod(modId) {
        if (confirm('Are you sure you want to uninstall this mod?')) {
            const gameId = this.currentGame.id;
            this.installedMods[gameId] = this.installedMods[gameId].filter(m => m.id !== modId);
            this.saveInstalledMods();

            // Refresh the view
            const modal = document.getElementById('mod-browser-modal');
            if (modal) {
                this.showTab('installed', modal);
            }
        }
    }

    configureMod(modId) {
        alert('Mod configuration interface would open here. This allows you to adjust mod settings and options.');
    }

    checkModUpdates(gameId) {
        alert('Checking for mod updates... In a full implementation, this would query mod sources for newer versions.');
    }

    createNewProfile(gameId, container) {
        const name = prompt('Enter profile name:');
        if (!name) return;

        if (!this.modProfiles[gameId]) {
            this.modProfiles[gameId] = [];
        }

        this.modProfiles[gameId].push({
            id: `profile_${Date.now()}`,
            name,
            modCount: this.installedMods[gameId]?.length || 0,
            active: false,
            mods: [...(this.installedMods[gameId] || [])]
        });

        this.saveModProfiles();
        this.renderProfilesTab(container);
    }

    activateProfile(profileId) {
        const gameId = this.currentGame.id;
        const profiles = this.modProfiles[gameId] || [];

        profiles.forEach(p => {
            p.active = p.id === profileId;
        });

        const activeProfile = profiles.find(p => p.id === profileId);
        if (activeProfile) {
            this.installedMods[gameId] = [...activeProfile.mods];
            this.saveInstalledMods();
        }

        this.saveModProfiles();

        // Refresh view
        const modal = document.getElementById('mod-browser-modal');
        if (modal) {
            this.showTab('profiles', modal);
        }
    }

    deleteProfile(profileId) {
        if (confirm('Delete this profile?')) {
            const gameId = this.currentGame.id;
            this.modProfiles[gameId] = this.modProfiles[gameId].filter(p => p.id !== profileId);
            this.saveModProfiles();

            // Refresh view
            const modal = document.getElementById('mod-browser-modal');
            if (modal) {
                this.showTab('profiles', modal);
            }
        }
    }

    async testAPIConnection() {
        if (!this.apiKeys.nexusMods) {
            alert('Please enter a Nexus Mods API key first.');
            return;
        }

        alert('Testing API connection... In a full implementation, this would verify your API key is valid.');
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // Close mod browser
    closeModBrowser() {
        if (this.activeModal) {
            this.activeModal.remove();
            this.activeModal = null;
        }
    }

    // Cleanup method to prevent memory leaks
    destroy() {
        console.log('[MOD-BROWSER] Destroying mod browser...');

        // Close any open modal
        this.closeModBrowser();

        // Clear current game reference
        this.currentGame = null;
    }
}

// Initialize
if (typeof window !== 'undefined') {
    window.modBrowserManager = new ModBrowserManager();
}
