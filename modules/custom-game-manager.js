/**
 * Custom Game Manager Module
 * Allows users to manually add custom games and applications to the library
 */

class CustomGameManager {
    constructor() {
        this.customGameDialog = null;
        this.eventListeners = []; // Track event listeners for cleanup
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
        const addBtn = document.getElementById('add-custom-game-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showAddCustomGameDialog();
            });
        }
    }

    /**
     * Sanitize HTML to prevent XSS attacks
     */
    sanitizeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Show dialog to add custom game
     */
    showAddCustomGameDialog(gameData = null) {
        // Clean up any existing dialog first
        this.closeDialog();

        const isEdit = gameData !== null;

        // Sanitize all user inputs to prevent XSS
        const safeTitle = this.sanitizeHTML(gameData?.title || '');
        const safeLaunchCmd = this.sanitizeHTML(gameData?.launch_command || '');
        const safeDeveloper = this.sanitizeHTML(gameData?.developer || '');
        const safePublisher = this.sanitizeHTML(gameData?.publisher || '');
        const safeDescription = this.sanitizeHTML(gameData?.description || '');
        const safeBoxartUrl = this.sanitizeHTML(gameData?.boxart_url || '');
        const safeGenres = gameData?.genres ?
            (Array.isArray(gameData.genres) ? gameData.genres.map(g => this.sanitizeHTML(g)).join(', ') : this.sanitizeHTML(gameData.genres)) : '';

        const modal = document.createElement('div');
        modal.className = 'modal-overlay custom-game-modal';
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>${isEdit ? 'Edit' : 'Add'} Custom Game/Application</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <form id="custom-game-form">
                        <div class="form-section">
                            <h3>Basic Information</h3>

                            <div class="form-group">
                                <label for="custom-game-title">Title *</label>
                                <input type="text" id="custom-game-title" required
                                    placeholder="Enter game or application name"
                                    maxlength="200"
                                    value="${safeTitle}">
                            </div>

                            <div class="form-group">
                                <label for="custom-game-exe">Executable Path *</label>
                                <div style="display: flex; gap: 10px;">
                                    <input type="text" id="custom-game-exe" required
                                        placeholder="Path to .exe, .lnk, or application"
                                        value="${safeLaunchCmd}"
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
                                        maxlength="100"
                                        value="${safeDeveloper}">
                                </div>

                                <div class="form-group">
                                    <label for="custom-game-publisher">Publisher</label>
                                    <input type="text" id="custom-game-publisher"
                                        placeholder="Publisher name"
                                        maxlength="100"
                                        value="${safePublisher}">
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
                                        maxlength="200"
                                        value="${safeGenres}">
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="custom-game-description">Description</label>
                                <textarea id="custom-game-description"
                                    placeholder="Brief description of the game/application"
                                    maxlength="1000"
                                    rows="3">${safeDescription}</textarea>
                            </div>
                        </div>

                        <div class="form-section">
                            <h3>Cover Art</h3>

                            <div class="form-group">
                                <label for="custom-game-cover-url">Cover Art URL</label>
                                <input type="url" id="custom-game-cover-url"
                                    placeholder="https://example.com/cover.jpg"
                                    value="${safeBoxartUrl}">
                                <small>Or leave blank to use the Cover Art Editor after adding</small>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" id="cancel-custom-game-btn">Cancel</button>
                    <button type="button" id="save-custom-game-btn" class="btn-primary">${isEdit ? 'Update' : 'Add'} Game</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.customGameDialog = modal;

        // Setup event listeners with cleanup tracking
        this.setupDialogEventListeners(gameData);
    }

    /**
     * Setup event listeners for the dialog
     */
    setupDialogEventListeners(gameData) {
        if (!this.customGameDialog) return;

        // Clear any previous listeners
        this.cleanupEventListeners();

        // Close button
        const closeBtn = this.customGameDialog.querySelector('.modal-close');
        if (closeBtn) {
            const closeHandler = () => this.closeDialog();
            closeBtn.addEventListener('click', closeHandler);
            this.eventListeners.push({ element: closeBtn, event: 'click', handler: closeHandler });
        }

        // Cancel button
        const cancelBtn = this.customGameDialog.querySelector('#cancel-custom-game-btn');
        if (cancelBtn) {
            const cancelHandler = () => this.closeDialog();
            cancelBtn.addEventListener('click', cancelHandler);
            this.eventListeners.push({ element: cancelBtn, event: 'click', handler: cancelHandler });
        }

        // Browse button
        const browseBtn = this.customGameDialog.querySelector('#browse-exe-btn');
        if (browseBtn && window.electronAPI) {
            const browseHandler = async () => {
                try {
                    const result = await window.electronAPI.selectCustomGameExecutable();
                    if (result.success && result.path) {
                        const exeInput = document.getElementById('custom-game-exe');
                        if (exeInput) {
                            exeInput.value = result.path;
                        }
                    }
                } catch (error) {
                    console.error('[CUSTOM-GAMES] Error selecting executable:', error);
                    window.showToast?.('Failed to select executable', 'error');
                }
            };
            browseBtn.addEventListener('click', browseHandler);
            this.eventListeners.push({ element: browseBtn, event: 'click', handler: browseHandler });
        } else if (browseBtn) {
            browseBtn.style.display = 'none'; // Hide if not in Electron
        }

        // Save button
        const saveBtn = this.customGameDialog.querySelector('#save-custom-game-btn');
        if (saveBtn) {
            const saveHandler = () => this.saveCustomGame(gameData);
            saveBtn.addEventListener('click', saveHandler);
            this.eventListeners.push({ element: saveBtn, event: 'click', handler: saveHandler });
        }

        // Form submission
        const form = this.customGameDialog.querySelector('#custom-game-form');
        if (form) {
            const submitHandler = (e) => {
                e.preventDefault();
                this.saveCustomGame(gameData);
            };
            form.addEventListener('submit', submitHandler);
            this.eventListeners.push({ element: form, event: 'submit', handler: submitHandler });
        }

        // Close on overlay click
        const overlayHandler = (e) => {
            if (e.target === this.customGameDialog) {
                this.closeDialog();
            }
        };
        this.customGameDialog.addEventListener('click', overlayHandler);
        this.eventListeners.push({ element: this.customGameDialog, event: 'click', handler: overlayHandler });

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeDialog();
            }
        };
        document.addEventListener('keydown', escapeHandler);
        this.eventListeners.push({ element: document, event: 'keydown', handler: escapeHandler });
    }

    /**
     * Clean up event listeners to prevent memory leaks
     */
    cleanupEventListeners() {
        for (const listener of this.eventListeners) {
            if (listener.element && listener.event && listener.handler) {
                listener.element.removeEventListener(listener.event, listener.handler);
            }
        }
        this.eventListeners = [];
    }

    /**
     * Close and cleanup dialog
     */
    closeDialog() {
        this.cleanupEventListeners();
        if (this.customGameDialog) {
            this.customGameDialog.remove();
            this.customGameDialog = null;
        }
    }

    /**
     * Extract directory from path (cross-platform)
     */
    getDirectoryFromPath(filePath) {
        if (!filePath) return null;

        // Handle both Windows and Unix path separators
        const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        if (lastSlash === -1) return null;

        return filePath.substring(0, lastSlash);
    }

    /**
     * Validate URL format
     */
    isValidUrl(string) {
        if (!string) return true; // Empty is valid (optional field)
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Save custom game to database
     */
    async saveCustomGame(existingGame) {
        // Get form elements
        const titleInput = document.getElementById('custom-game-title');
        const exeInput = document.getElementById('custom-game-exe');
        const platformInput = document.getElementById('custom-game-platform');
        const developerInput = document.getElementById('custom-game-developer');
        const publisherInput = document.getElementById('custom-game-publisher');
        const yearInput = document.getElementById('custom-game-year');
        const genresInput = document.getElementById('custom-game-genres');
        const descriptionInput = document.getElementById('custom-game-description');
        const coverUrlInput = document.getElementById('custom-game-cover-url');

        // Check if dialog was closed
        if (!titleInput || !exeInput) {
            console.warn('[CUSTOM-GAMES] Dialog elements not found, possibly closed');
            return;
        }

        const title = titleInput.value.trim();
        const exePath = exeInput.value.trim();
        const platform = platformInput?.value || 'custom';
        const developer = developerInput?.value.trim() || '';
        const publisher = publisherInput?.value.trim() || '';
        const year = yearInput?.value || '';
        const genresText = genresInput?.value.trim() || '';
        const description = descriptionInput?.value.trim() || '';
        const coverUrl = coverUrlInput?.value.trim() || '';

        // Validation
        if (!title) {
            window.showToast?.('Please enter a title', 'error');
            titleInput.focus();
            return;
        }

        if (title.length > 200) {
            window.showToast?.('Title is too long (max 200 characters)', 'error');
            return;
        }

        if (!exePath) {
            window.showToast?.('Please enter an executable path', 'error');
            exeInput.focus();
            return;
        }

        if (coverUrl && !this.isValidUrl(coverUrl)) {
            window.showToast?.('Please enter a valid URL for cover art', 'error');
            coverUrlInput.focus();
            return;
        }

        if (year && (year < 1970 || year > new Date().getFullYear())) {
            window.showToast?.('Please enter a valid release year', 'error');
            yearInput.focus();
            return;
        }

        // Parse and validate genres
        const genres = genresText ? genresText.split(',').map(g => g.trim()).filter(g => g).slice(0, 20) : [];

        // Build game data
        const gameData = {
            title: title,
            platform: platform,
            launch_command: exePath,
            install_dir: this.getDirectoryFromPath(exePath),
            developer: developer || 'Unknown',
            publisher: publisher || 'Unknown',
            release_date: year ? `${year}-01-01` : null,
            genres: genres,
            description: description.substring(0, 1000), // Limit description length
            boxart_url: coverUrl || null,
            is_custom: true,
            app_id: existingGame?.app_id || `custom_${Date.now()}`
        };

        if (!window.electronAPI) {
            window.showToast?.('This feature requires the Electron version of the application', 'error');
            return;
        }

        try {
            const result = await window.electronAPI.addCustomGame(gameData);

            if (result.success) {
                window.showToast?.(`Custom game "${title}" ${existingGame ? 'updated' : 'added'} successfully!`, 'success');

                // Close dialog
                this.closeDialog();

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
                            if (window.coverArtEditor && window.coverArtEditor.showCoverEditor) {
                                window.coverArtEditor.showCoverEditor();
                            }
                        }, 500);
                    }
                }
            } else {
                window.showToast?.('Failed to add custom game: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('[CUSTOM-GAMES] Error saving custom game:', error);
            window.showToast?.('An error occurred while saving the custom game', 'error');
        }
    }

    /**
     * Cleanup on page unload
     */
    destroy() {
        this.cleanupEventListeners();
        this.closeDialog();
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    customGameManager.destroy();
});
