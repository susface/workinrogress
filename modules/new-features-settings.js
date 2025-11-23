// New Features Settings Panel
// Provides toggle controls for all new 2025 features

class NewFeaturesSettings {
    constructor() {
        this.settings = this.loadSettings();
        this.initialized = false;
    }

    loadSettings() {
        const defaultSettings = {
            perGameMusic: true,
            gamingHeatmap: true,
            dynamicBackground: true,
            coverArtEditor: true,
            modBrowser: true,
            portableMode: true
        };

        try {
            const saved = localStorage.getItem('new-features-settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.error('[NEW-FEATURES] Failed to load settings:', error);
            return defaultSettings;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('new-features-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('[NEW-FEATURES] Failed to save settings:', error);
        }
    }

    init() {
        if (this.initialized) return;

        console.log('[NEW-FEATURES] Initializing new features settings...');

        // Add settings button to "More Options" menu
        this.addMenuButton();

        // Initialize managers based on settings
        this.initializeFeatures();

        this.initialized = true;
    }

    addMenuButton() {
        const moreDropdown = document.getElementById('more-dropdown');
        if (!moreDropdown) {
            console.warn('[NEW-FEATURES] More dropdown not found, will retry later');
            return;
        }

        // Check if button already exists
        if (document.getElementById('new-features-btn-menu')) {
            return;
        }

        const button = document.createElement('button');
        button.id = 'new-features-btn-menu';
        button.className = 'dropdown-item';
        button.innerHTML = '✨ New Features';
        button.addEventListener('click', () => {
            this.showSettingsPanel();
        });

        moreDropdown.appendChild(button);
    }

    initializeFeatures() {
        // Per-Game Music
        if (this.settings.perGameMusic && window.perGameMusicManager) {
            console.log('[NEW-FEATURES] Per-game music enabled');
        }

        // Gaming Heatmap
        if (this.settings.gamingHeatmap && window.gamingHeatmapManager) {
            console.log('[NEW-FEATURES] Gaming heatmap enabled');
        }

        // Dynamic Background
        if (this.settings.dynamicBackground && window.dynamicBackgroundManager) {
            console.log('[NEW-FEATURES] Dynamic background enabled');

            // Hook into coverflow game selection change
            const coverflowObj = window.coverflow || window.coverflowManager;
            if (coverflowObj) {
                const originalUpdateInfo = coverflowObj.updateInfo;
                if (originalUpdateInfo) {
                    coverflowObj.updateInfo = function() {
                        originalUpdateInfo.call(this);

                        // Apply dynamic background when game changes
                        if (window.newFeaturesSettings?.settings.dynamicBackground) {
                            const currentGame = this.getCurrentGame?.();
                            if (currentGame && window.dynamicBackgroundManager) {
                                window.dynamicBackgroundManager.applyBackground(currentGame);
                            }
                        }
                    };
                }
            }
        }

        // Cover Art Editor
        if (this.settings.coverArtEditor && window.coverArtEditor) {
            console.log('[NEW-FEATURES] Cover art editor enabled');
        }

        // Mod Browser
        if (this.settings.modBrowser && window.modBrowserManager) {
            console.log('[NEW-FEATURES] Mod browser enabled');
        }

        // Portable Mode (always available)
        if (window.portableMode) {
            console.log('[NEW-FEATURES] Portable mode enhancements available');
        }
    }

    showSettingsPanel() {
        const modal = document.createElement('div');
        modal.id = 'new-features-settings-modal';
        modal.className = 'modal-overlay';
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
            animation: fadeIn 0.2s;
        `;

        modal.innerHTML = `
            <div class="new-features-panel" style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 15px;
                padding: 30px;
                max-width: 900px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 50px rgba(0,0,0,0.5);
            ">
                <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 15px;">
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        ✨ New Features (2025)
                    </h2>
                    <button id="close-new-features" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 28px;
                        cursor: pointer;
                        padding: 0;
                        width: 32px;
                        height: 32px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 5px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='none'">×</button>
                </div>

                <p style="color: rgba(255,255,255,0.8); margin-bottom: 25px;">
                    Enable or disable new features added in 2025. Click on each feature to configure its settings.
                </p>

                <div class="features-grid" style="display: grid; gap: 20px;">
                    ${this.renderFeatureCard('perGameMusic', {
                        icon: '🎵',
                        title: 'Per-Game Music',
                        description: 'Play game-specific soundtracks with auto-detection and crossfading',
                        available: !!window.perGameMusicManager
                    })}

                    ${this.renderFeatureCard('gamingHeatmap', {
                        icon: '🗓️',
                        title: 'Gaming Heatmap',
                        description: 'Visualize your gaming activity with a GitHub-style contribution graph',
                        available: !!window.gamingHeatmapManager
                    })}

                    ${this.renderFeatureCard('dynamicBackground', {
                        icon: '🎨',
                        title: 'Dynamic Backgrounds',
                        description: 'Extract colors from cover art and create beautiful animated backgrounds',
                        available: !!window.dynamicBackgroundManager
                    })}

                    ${this.renderFeatureCard('coverArtEditor', {
                        icon: '🖼️',
                        title: 'Cover Art Editor',
                        description: 'Create and customize game cover art with built-in editor',
                        available: !!window.coverArtEditor
                    })}

                    ${this.renderFeatureCard('modBrowser', {
                        icon: '🔧',
                        title: 'Mod Browser',
                        description: 'Browse, install, and manage mods from Nexus Mods and Steam Workshop',
                        available: !!window.modBrowserManager
                    })}

                    ${this.renderFeatureCard('portableMode', {
                        icon: '💾',
                        title: 'Portable Mode Enhancements',
                        description: 'USB export, settings sync, and cloud integration',
                        available: !!window.portableMode
                    })}
                </div>

                <div class="quick-access" style="margin-top: 30px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 10px;">
                    <h3 style="margin: 0 0 15px 0;">Quick Access</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                        <button id="open-heatmap" class="btn btn-primary" ${!this.settings.gamingHeatmap || !window.gamingHeatmapManager ? 'disabled' : ''}>
                            🗓️ View Heatmap
                        </button>
                        <button id="open-cover-editor" class="btn btn-primary" ${!this.settings.coverArtEditor || !window.coverArtEditor ? 'disabled' : ''}>
                            🖼️ Edit Cover Art
                        </button>
                        <button id="open-mod-browser" class="btn btn-primary" ${!this.settings.modBrowser || !window.modBrowserManager ? 'disabled' : ''}>
                            🔧 Browse Mods
                        </button>
                        <button id="open-portable-tools" class="btn btn-primary" ${!window.portableMode ? 'disabled' : ''}>
                            💾 Portable Tools
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('#close-new-features').addEventListener('click', () => {
            modal.remove();
        });

        // Feature toggle event listeners
        modal.querySelectorAll('.feature-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const feature = e.target.dataset.feature;
                this.toggleFeature(feature, e.target.checked);
            });
        });

        // Configure button event listeners
        modal.querySelectorAll('.configure-feature').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const feature = e.target.dataset.feature;
                this.configureFeature(feature);
            });
        });

        // Quick access buttons
        modal.querySelector('#open-heatmap')?.addEventListener('click', () => {
            if (window.gamingHeatmapManager) {
                modal.remove();
                this.showHeatmapModal();
            }
        });

        modal.querySelector('#open-cover-editor')?.addEventListener('click', () => {
            if (window.coverArtEditor) {
                const coverflowObj = window.coverflow || window.coverflowManager;
                const currentGame = coverflowObj?.getCurrentGame?.();
                if (currentGame) {
                    modal.remove();
                    window.coverArtEditor.openEditor(currentGame);
                } else {
                    alert('Please select a game first.');
                }
            }
        });

        modal.querySelector('#open-mod-browser')?.addEventListener('click', () => {
            if (window.modBrowserManager) {
                const coverflowObj = window.coverflow || window.coverflowManager;
                const currentGame = coverflowObj?.getCurrentGame?.();
                if (currentGame) {
                    modal.remove();
                    window.modBrowserManager.openModBrowser(currentGame);
                } else {
                    alert('Please select a game first.');
                }
            }
        });

        modal.querySelector('#open-portable-tools')?.addEventListener('click', () => {
            if (window.portableMode) {
                modal.remove();
                window.portableMode.syncSettings();
            }
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    renderFeatureCard(featureKey, { icon, title, description, available }) {
        const enabled = this.settings[featureKey];
        const status = available ? (enabled ? 'Enabled' : 'Disabled') : 'Not Available';
        const statusColor = available ? (enabled ? '#2ecc71' : '#95a5a6') : '#e74c3c';

        return `
            <div class="feature-card" style="
                padding: 20px;
                background: rgba(255,255,255,0.05);
                border-radius: 10px;
                border: 2px solid ${enabled && available ? 'rgba(46, 204, 113, 0.5)' : 'rgba(255,255,255,0.1)'};
                transition: all 0.3s;
            " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                <div style="display: flex; align-items: start; gap: 15px;">
                    <div style="font-size: 36px;">${icon}</div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                            <h3 style="margin: 0; font-size: 18px;">${title}</h3>
                            <label class="toggle-switch" style="position: relative; display: inline-block; width: 50px; height: 24px;">
                                <input type="checkbox" class="feature-toggle" data-feature="${featureKey}" ${enabled ? 'checked' : ''} ${!available ? 'disabled' : ''} style="opacity: 0; width: 0; height: 0;">
                                <span style="
                                    position: absolute;
                                    cursor: pointer;
                                    top: 0;
                                    left: 0;
                                    right: 0;
                                    bottom: 0;
                                    background-color: ${enabled && available ? '#2ecc71' : '#ccc'};
                                    transition: 0.4s;
                                    border-radius: 24px;
                                    ${!available ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                                ">
                                    <span style="
                                        position: absolute;
                                        content: '';
                                        height: 18px;
                                        width: 18px;
                                        left: ${enabled ? '29px' : '3px'};
                                        bottom: 3px;
                                        background-color: white;
                                        transition: 0.4s;
                                        border-radius: 50%;
                                    "></span>
                                </span>
                            </label>
                        </div>
                        <p style="margin: 0 0 15px 0; font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.5;">
                            ${description}
                        </p>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="font-size: 12px; color: ${statusColor};">● ${status}</span>
                            <button class="configure-feature" data-feature="${featureKey}" style="
                                padding: 6px 12px;
                                background: rgba(52, 152, 219, 0.2);
                                border: 1px solid rgba(52, 152, 219, 0.5);
                                color: #3498db;
                                border-radius: 5px;
                                font-size: 12px;
                                cursor: pointer;
                                transition: all 0.2s;
                                ${!available ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                            " ${!available ? 'disabled' : ''} onmouseover="if(!this.disabled) this.style.background='rgba(52, 152, 219, 0.3)'" onmouseout="this.style.background='rgba(52, 152, 219, 0.2)'">
                                ⚙️ Configure
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    toggleFeature(feature, enabled) {
        this.settings[feature] = enabled;
        this.saveSettings();

        console.log(`[NEW-FEATURES] ${feature} ${enabled ? 'enabled' : 'disabled'}`);

        // Show toast notification
        if (window.coverflow && window.coverflow.showToast) {
            window.coverflow.showToast(
                `${this.getFeatureName(feature)} ${enabled ? 'enabled' : 'disabled'}`,
                'success'
            );
        }

        // Re-initialize if needed
        if (enabled) {
            this.initializeFeatures();
        }
    }

    configureFeature(feature) {
        console.log(`[NEW-FEATURES] Configure ${feature}`);

        // Close current modal
        const currentModal = document.getElementById('new-features-settings-modal');
        if (currentModal) {
            currentModal.remove();
        }

        // Open feature-specific settings
        switch (feature) {
            case 'perGameMusic':
                if (window.perGameMusicManager) {
                    const settingsUI = window.perGameMusicManager.createSettingsUI();
                    this.showSettingsModal('Per-Game Music Settings', settingsUI);
                }
                break;

            case 'gamingHeatmap':
                this.showHeatmapModal();
                break;

            case 'dynamicBackground':
                if (window.dynamicBackgroundManager) {
                    const settingsUI = window.dynamicBackgroundManager.createSettingsUI();
                    this.showSettingsModal('Dynamic Background Settings', settingsUI);
                }
                break;

            case 'coverArtEditor':
                if (window.coverArtEditor) {
                    const coverflowObj = window.coverflow || window.coverflowManager;
                    const currentGame = coverflowObj?.getCurrentGame?.();
                    if (currentGame) {
                        window.coverArtEditor.openEditor(currentGame);
                    } else {
                        alert('Please select a game first to use the cover art editor.');
                    }
                }
                break;

            case 'modBrowser':
                if (window.modBrowserManager) {
                    const coverflowObj = window.coverflow || window.coverflowManager;
                    const currentGame = coverflowObj?.getCurrentGame?.();
                    if (currentGame) {
                        window.modBrowserManager.openModBrowser(currentGame);
                    } else {
                        alert('Please select a game first to browse mods.');
                    }
                }
                break;

            case 'portableMode':
                if (window.portableMode) {
                    const panel = window.portableMode.createPortableModePanel();
                    this.showSettingsModal('Portable Mode', panel);
                }
                break;
        }
    }

    showSettingsModal(title, contentElement) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 15px;
            padding: 30px;
            max-width: 800px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        `;

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">${title}</h2>
                <button id="close-settings-modal" style="background: none; border: none; color: white; font-size: 28px; cursor: pointer;">×</button>
            </div>
        `;

        container.appendChild(contentElement);
        modal.appendChild(container);
        document.body.appendChild(modal);

        modal.querySelector('#close-settings-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showHeatmapModal() {
        if (!window.gamingHeatmapManager) return;

        const heatmapUI = window.gamingHeatmapManager.createHeatmapUI();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 15px;
            padding: 30px;
            max-width: 1200px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
        `;

        container.innerHTML = `
            <button id="close-heatmap" style="
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                color: white;
                font-size: 28px;
                cursor: pointer;
                z-index: 1;
            ">×</button>
        `;

        container.appendChild(heatmapUI);
        modal.appendChild(container);
        document.body.appendChild(modal);

        container.querySelector('#close-heatmap').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    getFeatureName(featureKey) {
        const names = {
            perGameMusic: 'Per-Game Music',
            gamingHeatmap: 'Gaming Heatmap',
            dynamicBackground: 'Dynamic Backgrounds',
            coverArtEditor: 'Cover Art Editor',
            modBrowser: 'Mod Browser',
            portableMode: 'Portable Mode'
        };
        return names[featureKey] || featureKey;
    }

    // Cleanup method to prevent memory leaks
    destroy() {
        console.log('[NEW-FEATURES] Destroying new features settings...');

        // Destroy all feature managers
        if (window.perGameMusicManager && typeof window.perGameMusicManager.destroy === 'function') {
            window.perGameMusicManager.destroy();
        }

        if (window.gamingHeatmapManager && typeof window.gamingHeatmapManager.destroy === 'function') {
            window.gamingHeatmapManager.destroy();
        }

        if (window.dynamicBackgroundManager && typeof window.dynamicBackgroundManager.destroy === 'function') {
            window.dynamicBackgroundManager.destroy();
        }

        if (window.coverArtEditor && typeof window.coverArtEditor.destroy === 'function') {
            window.coverArtEditor.destroy();
        }

        if (window.modBrowserManager && typeof window.modBrowserManager.destroy === 'function') {
            window.modBrowserManager.destroy();
        }

        // Remove menu button
        const menuButton = document.getElementById('new-features-btn-menu');
        if (menuButton && menuButton.parentNode) {
            menuButton.parentNode.removeChild(menuButton);
        }

        this.initialized = false;
    }
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.newFeaturesSettings = new NewFeaturesSettings();

    // Initialize after DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                window.newFeaturesSettings.init();
            }, 1500);
        });
    } else {
        setTimeout(() => {
            window.newFeaturesSettings.init();
        }, 1500);
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (window.newFeaturesSettings) {
            window.newFeaturesSettings.destroy();
        }
    });
}
