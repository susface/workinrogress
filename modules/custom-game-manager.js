/**
 * Custom Game Manager Module
 * Allows users to manually add custom games and applications to the library
 */

class CustomGameManager {
    constructor() {
        this.customGameDialog = null;
    }

    /**
     * Initialize custom game manager
     */
    initialize() {
        console.log('[CUSTOM-GAMES] Custom game manager initialized');
        this.createCustomGameButton();
    }

    /**
     * Create "Add Custom Game" button in settings
     */
    createCustomGameButton() {
        // Find the game library section
        const scanBtnParent = document.getElementById('scan-games-btn')?.parentElement?.parentElement;
        if (!scanBtnParent) {
            console.warn('[CUSTOM-GAMES] Could not find scan button parent');
            return;
        }

        // Check if button already exists
        if (document.getElementById('add-custom-game-btn')) return;

        const customGameGroup = document.createElement('div');
        customGameGroup.className = 'setting-group';
        customGameGroup.innerHTML = `
            <button id="add-custom-game-btn" class="btn" style="background: linear-gradient(135deg, #667eea, #764ba2);">
                ➕ Add Custom Game/Application
            </button>
            <small class="setting-info">Manually add any game or application to your library</small>
        `;

        // Insert after scan button group
        scanBtnParent.after(customGameGroup);

        // Add event listener
        document.getElementById('add-custom-game-btn').addEventListener('click', () => {
            this.showAddCustomGameDialog();
        });
    }

    /**
     * Show dialog to add custom game
     */
    showAddCustomGameDialog(gameData = null) {
        const isEdit = gameData !== null;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay custom-game-modal';
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>${isEdit ? 'Edit' : 'Add'} Custom Game/Application</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <form id="custom-game-form">
                        <div class="form-section">
                            <h3>Basic Information</h3>

                            <div class="form-group">
                                <label for="custom-game-title">Title *</label>
                                <input type="text" id="custom-game-title" required
                                    placeholder="Enter game or application name"
                                    value="${gameData?.title || ''}">
                            </div>

                            <div class="form-group">
                                <label for="custom-game-exe">Executable Path *</label>
                                <div style="display: flex; gap: 10px;">
                                    <input type="text" id="custom-game-exe" required
                                        placeholder="Path to .exe, .lnk, or application"
                                        value="${gameData?.launch_command || ''}"
                                        style="flex: 1;">
                                    <button type="button" id="browse-exe-btn" class="btn-secondary">Browse</button>
                                </div>
                                <small>The executable file to launch</small>
                            </div>

                            <div class="form-group">
                                <label for="custom-game-platform">Platform</label>
                                <select id="custom-game-platform">
                                    <option value="custom" ${!gameData?.platform || gameData?.platform === 'custom' ? 'selected' : ''}>Custom</option>
                                    <option value="steam" ${gameData?.platform === 'steam' ? 'selected' : ''}>Steam</option>
                                    <option value="epic" ${gameData?.platform === 'epic' ? 'selected' : ''}>Epic Games</option>
                                    <option value="xbox" ${gameData?.platform === 'xbox' ? 'selected' : ''}>Xbox/Game Pass</option>
                                    <option value="gog" ${gameData?.platform === 'gog' ? 'selected' : ''}>GOG</option>
                                    <option value="origin" ${gameData?.platform === 'origin' ? 'selected' : ''}>Origin/EA</option>
                                    <option value="ubisoft" ${gameData?.platform === 'ubisoft' ? 'selected' : ''}>Ubisoft</option>
                                    <option value="battlenet" ${gameData?.platform === 'battlenet' ? 'selected' : ''}>Battle.net</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-section">
                            <h3>Additional Details (Optional)</h3>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="custom-game-developer">Developer</label>
                                    <input type="text" id="custom-game-developer"
                                        placeholder="Developer name"
                                        value="${gameData?.developer || ''}">
                                </div>

                                <div class="form-group">
                                    <label for="custom-game-publisher">Publisher</label>
                                    <input type="text" id="custom-game-publisher"
                                        placeholder="Publisher name"
                                        value="${gameData?.publisher || ''}">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="custom-game-year">Release Year</label>
                                    <input type="number" id="custom-game-year"
                                        placeholder="YYYY"
                                        min="1970" max="${new Date().getFullYear()}"
                                        value="${gameData?.release_date ? new Date(gameData.release_date).getFullYear() : ''}">
                                </div>

                                <div class="form-group">
                                    <label for="custom-game-genres">Genres (comma separated)</label>
                                    <input type="text" id="custom-game-genres"
                                        placeholder="Action, RPG, Strategy"
                                        value="${gameData?.genres ? (Array.isArray(gameData.genres) ? gameData.genres.join(', ') : gameData.genres) : ''}">
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="custom-game-description">Description</label>
                                <textarea id="custom-game-description"
                                    placeholder="Brief description of the game/application"
                                    rows="3">${gameData?.description || ''}</textarea>
                            </div>
                        </div>

                        <div class="form-section">
                            <h3>Cover Art</h3>

                            <div class="form-group">
                                <label for="custom-game-cover-url">Cover Art URL</label>
                                <input type="url" id="custom-game-cover-url"
                                    placeholder="https://example.com/cover.jpg"
                                    value="${gameData?.boxart_url || ''}">
                                <small>Or leave blank to use the Cover Art Editor after adding</small>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="button" id="save-custom-game-btn" class="btn-primary">${isEdit ? 'Update' : 'Add'} Game</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.customGameDialog = modal;

        // Setup event listeners
        this.setupDialogEventListeners(gameData);
    }

    /**
     * Setup event listeners for the dialog
     */
    setupDialogEventListeners(gameData) {
        // Browse button
        const browseBtn = document.getElementById('browse-exe-btn');
        if (browseBtn && window.electronAPI) {
            browseBtn.addEventListener('click', async () => {
                const result = await window.electronAPI.selectCustomGameExecutable();
                if (result.success && result.path) {
                    document.getElementById('custom-game-exe').value = result.path;
                }
            });
        } else if (browseBtn) {
            browseBtn.style.display = 'none'; // Hide if not in Electron
        }

        // Save button
        const saveBtn = document.getElementById('save-custom-game-btn');
        saveBtn.addEventListener('click', () => {
            this.saveCustomGame(gameData);
        });

        // Form submission
        const form = document.getElementById('custom-game-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCustomGame(gameData);
        });
    }

    /**
     * Save custom game to database
     */
    async saveCustomGame(existingGame) {
        const title = document.getElementById('custom-game-title').value.trim();
        const exePath = document.getElementById('custom-game-exe').value.trim();
        const platform = document.getElementById('custom-game-platform').value;
        const developer = document.getElementById('custom-game-developer').value.trim();
        const publisher = document.getElementById('custom-game-publisher').value.trim();
        const year = document.getElementById('custom-game-year').value;
        const genresText = document.getElementById('custom-game-genres').value.trim();
        const description = document.getElementById('custom-game-description').value.trim();
        const coverUrl = document.getElementById('custom-game-cover-url').value.trim();

        // Validation
        if (!title) {
            alert('Please enter a title');
            return;
        }

        if (!exePath) {
            alert('Please enter an executable path');
            return;
        }

        // Parse genres
        const genres = genresText ? genresText.split(',').map(g => g.trim()).filter(g => g) : [];

        // Build game data
        const gameData = {
            title: title,
            platform: platform,
            launch_command: exePath,
            install_dir: exePath.substring(0, exePath.lastIndexOf('\\')),
            developer: developer || 'Unknown',
            publisher: publisher || 'Unknown',
            release_date: year ? `${year}-01-01` : null,
            genres: genres,
            description: description,
            boxart_url: coverUrl || null,
            is_custom: true, // Mark as custom game
            app_id: existingGame?.app_id || `custom_${Date.now()}`
        };

        if (!window.electronAPI) {
            alert('This feature requires the Electron version of the application');
            return;
        }

        try {
            const result = await window.electronAPI.addCustomGame(gameData);

            if (result.success) {
                window.showToast?.(`Custom game "${title}" ${existingGame ? 'updated' : 'added'} successfully!`, 'success');

                // Close dialog
                this.customGameDialog?.remove();

                // Reload games
                if (window.coverflow) {
                    await window.coverflow.loadGames();
                }

                // Show cover art editor prompt if no cover URL provided
                if (!coverUrl && window.coverArtEditor) {
                    const useEditor = confirm(`Would you like to set cover art for "${title}" now?`);
                    if (useEditor) {
                        // Wait a moment for the game to be added to the view
                        setTimeout(() => {
                            window.coverArtEditor.showCoverEditor();
                        }, 500);
                    }
                }
            } else {
                alert('Failed to add custom game: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('[CUSTOM-GAMES] Error saving custom game:', error);
            alert('An error occurred while saving the custom game');
        }
    }
}

// Create global instance
const customGameManager = new CustomGameManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        customGameManager.initialize();
    });
} else {
    customGameManager.initialize();
}
