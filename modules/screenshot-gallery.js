/**
 * Screenshot Gallery
 * Organize, view, and manage game screenshots
 */

class ScreenshotGallery {
    constructor() {
        this.screenshots = new Map(); // gameId -> array of screenshots
        this.activeModals = []; // Track active modals for cleanup
        this.fileReaders = []; // Track FileReaders for cleanup
        this.loadFromStorage();
    }

    /**
     * Cleanup method to prevent memory leaks
     */
    destroy() {
        // Remove all active modals
        this.activeModals.forEach(modal => {
            if (modal && modal.parentNode) {
                modal.remove();
            }
        });
        this.activeModals = [];

        // Abort any ongoing FileReader operations
        this.fileReaders.forEach(reader => {
            if (reader && reader.readyState === FileReader.LOADING) {
                reader.abort();
            }
        });
        this.fileReaders = [];

        // Clear screenshots from memory (optional - depends on use case)
        // this.screenshots.clear();
    }

    /**
     * Load screenshots from localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('game-screenshots');
            if (saved) {
                const data = JSON.parse(saved);
                Object.entries(data).forEach(([gameId, screenshots]) => {
                    this.screenshots.set(parseInt(gameId, 10), screenshots);
                });
                console.log(`[SCREENSHOTS] Loaded ${this.getTotalCount()} screenshots`);
            }
        } catch (error) {
            console.error('[SCREENSHOTS] Error loading:', error);
        }
    }

    /**
     * Save screenshots to localStorage
     */
    saveToStorage() {
        try {
            const data = {};
            this.screenshots.forEach((screenshots, gameId) => {
                data[gameId] = screenshots;
            });
            localStorage.setItem('game-screenshots', JSON.stringify(data));
        } catch (error) {
            console.error('[SCREENSHOTS] Error saving:', error);
        }
    }

    /**
     * Add screenshot
     */
    addScreenshot(gameId, gameTitle, screenshotUrl, description = '') {
        const screenshot = {
            id: Date.now(),
            gameId: gameId,
            gameTitle: gameTitle,
            url: screenshotUrl,
            description: description,
            timestamp: new Date().toISOString(),
            tags: [],
            favorite: false
        };

        if (!this.screenshots.has(gameId)) {
            this.screenshots.set(gameId, []);
        }

        this.screenshots.get(gameId).unshift(screenshot); // Add to beginning
        this.saveToStorage();

        console.log(`[SCREENSHOTS] Added screenshot for ${gameTitle}`);
        return screenshot;
    }

    /**
     * Remove screenshot
     */
    removeScreenshot(gameId, screenshotId) {
        if (!this.screenshots.has(gameId)) return false;

        const screenshots = this.screenshots.get(gameId);
        const index = screenshots.findIndex(s => s.id === screenshotId);

        if (index !== -1) {
            screenshots.splice(index, 1);
            this.saveToStorage();
            return true;
        }

        return false;
    }

    /**
     * Update screenshot
     */
    updateScreenshot(gameId, screenshotId, updates) {
        if (!this.screenshots.has(gameId)) return false;

        const screenshots = this.screenshots.get(gameId);
        const screenshot = screenshots.find(s => s.id === screenshotId);

        if (screenshot) {
            Object.assign(screenshot, updates);
            this.saveToStorage();
            return true;
        }

        return false;
    }

    /**
     * Toggle favorite
     */
    toggleFavorite(gameId, screenshotId) {
        if (!this.screenshots.has(gameId)) return false;

        const screenshots = this.screenshots.get(gameId);
        const screenshot = screenshots.find(s => s.id === screenshotId);

        if (screenshot) {
            screenshot.favorite = !screenshot.favorite;
            this.saveToStorage();
            return screenshot.favorite;
        }

        return false;
    }

    /**
     * Get all screenshots for a game
     */
    getGameScreenshots(gameId) {
        return this.screenshots.get(gameId) || [];
    }

    /**
     * Get all screenshots
     */
    getAllScreenshots() {
        const all = [];
        this.screenshots.forEach(screenshots => {
            all.push(...screenshots);
        });
        return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Get recent screenshots
     */
    getRecentScreenshots(limit = 20) {
        return this.getAllScreenshots().slice(0, limit);
    }

    /**
     * Get favorite screenshots
     */
    getFavoriteScreenshots() {
        return this.getAllScreenshots().filter(s => s.favorite);
    }

    /**
     * Get total screenshot count
     */
    getTotalCount() {
        let count = 0;
        this.screenshots.forEach(screenshots => {
            count += screenshots.length;
        });
        return count;
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const total = this.getTotalCount();
        const favorites = this.getFavoriteScreenshots().length;
        const gamesWithScreenshots = this.screenshots.size;

        // Get most screenshot game
        let mostScreenshotGame = null;
        let maxScreenshots = 0;

        this.screenshots.forEach((screenshots, gameId) => {
            if (screenshots.length > maxScreenshots) {
                maxScreenshots = screenshots.length;
                mostScreenshotGame = screenshots[0]?.gameTitle || 'Unknown';
            }
        });

        return {
            total,
            favorites,
            gamesWithScreenshots,
            mostScreenshotGame,
            mostScreenshotCount: maxScreenshots
        };
    }

    /**
     * Scan common screenshot folders (Electron only)
     */
    async scanScreenshotFolders() {
        if (!window.electronAPI) {
            throw new Error('Screenshot scanning only available in Electron mode');
        }

        // This would require new IPC handlers in main.js
        // For now, return placeholder
        return {
            success: false,
            message: 'Screenshot scanning requires additional Electron IPC handlers'
        };
    }

    /**
     * Show screenshot gallery UI
     */
    showGalleryUI(filterGameId = null) {
        const stats = this.getStatistics();

        const modal = document.createElement('div');
        modal.className = 'screenshot-gallery-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow-y: auto;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div style="background: #1a1a1a; padding: 30px; border-radius: 12px; max-width: 1200px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <h2 style="margin: 0 0 20px 0; color: #4fc3f7;">📸 Screenshot Gallery</h2>

                <!-- Statistics -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">
                    <div style="background: #2a2a2a; padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; color: #4fc3f7; font-weight: bold;">${stats.total}</div>
                        <div style="color: #888; font-size: 12px; margin-top: 4px;">Total Screenshots</div>
                    </div>
                    <div style="background: #2a2a2a; padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; color: #ff6b6b; font-weight: bold;">${stats.favorites}</div>
                        <div style="color: #888; font-size: 12px; margin-top: 4px;">Favorites</div>
                    </div>
                    <div style="background: #2a2a2a; padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; color: #81c784; font-weight: bold;">${stats.gamesWithScreenshots}</div>
                        <div style="color: #888; font-size: 12px; margin-top: 4px;">Games</div>
                    </div>
                    ${stats.mostScreenshotGame ? `
                    <div style="background: #2a2a2a; padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 14px; color: #ffb74d; font-weight: bold; margin-bottom: 4px;">${this.escapeHtml(stats.mostScreenshotGame)}</div>
                        <div style="color: #888; font-size: 12px;">Most Screenshots (${stats.mostScreenshotCount})</div>
                    </div>
                    ` : ''}
                </div>

                <!-- Filter Buttons -->
                <div style="display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
                    <button class="screenshot-filter" data-filter="all" style="
                        padding: 8px 16px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border: none;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: bold;
                    ">All Screenshots</button>
                    <button class="screenshot-filter" data-filter="favorites" style="
                        padding: 8px 16px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-size: 13px;
                    ">❤️ Favorites (${stats.favorites})</button>
                    <button class="screenshot-filter" data-filter="recent" style="
                        padding: 8px 16px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-size: 13px;
                    ">🕒 Recent</button>
                </div>

                <!-- Screenshot Grid -->
                <div id="screenshot-grid" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 16px;
                    margin-bottom: 20px;
                    max-height: 500px;
                    overflow-y: auto;
                ">
                    <!-- Populated by JS -->
                </div>

                <!-- Actions -->
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button id="add-screenshot-btn" style="
                        flex: 1;
                        padding: 12px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border: none;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-weight: bold;
                    ">➕ Add Screenshot URL</button>
                    <button id="upload-screenshot-btn" style="
                        flex: 1;
                        padding: 12px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                    ">📁 Upload Screenshot</button>
                    <input type="file" id="upload-screenshot-input" accept="image/*" multiple style="display: none;">
                </div>

                <button id="close-gallery-modal" style="
                    width: 100%;
                    padding: 12px;
                    background: #4fc3f7;
                    border: none;
                    border-radius: 6px;
                    color: #000;
                    cursor: pointer;
                    font-weight: bold;
                ">Close</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Track modal for cleanup
        this.activeModals.push(modal);

        // Render initial grid
        this.renderScreenshotGrid(modal, 'all', filterGameId);

        // Filter buttons
        modal.querySelectorAll('.screenshot-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.screenshot-filter').forEach(b => {
                    b.style.background = '#2a2a2a';
                    b.style.border = '1px solid #444';
                });
                btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                btn.style.border = 'none';

                this.renderScreenshotGrid(modal, btn.getAttribute('data-filter'), filterGameId);
            });
        });

        // Add screenshot URL
        modal.querySelector('#add-screenshot-btn').addEventListener('click', () => {
            this.showAddScreenshotDialog(modal);
        });

        // Upload screenshot
        modal.querySelector('#upload-screenshot-btn').addEventListener('click', () => {
            modal.querySelector('#upload-screenshot-input').click();
        });

        modal.querySelector('#upload-screenshot-input').addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleScreenshotUpload(files, modal);
        });

        // Close
        modal.querySelector('#close-gallery-modal').addEventListener('click', () => {
            modal.remove();
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Render screenshot grid
     */
    renderScreenshotGrid(modal, filter, filterGameId = null) {
        const container = modal.querySelector('#screenshot-grid');

        let screenshots;
        if (filter === 'favorites') {
            screenshots = this.getFavoriteScreenshots();
        } else if (filter === 'recent') {
            screenshots = this.getRecentScreenshots();
        } else if (filterGameId) {
            screenshots = this.getGameScreenshots(filterGameId);
        } else {
            screenshots = this.getAllScreenshots();
        }

        if (screenshots.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #666; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 12px;">📸</div>
                    <p style="font-size: 16px;">No screenshots yet</p>
                    <p style="font-size: 13px; color: #555;">Add screenshots to build your gallery!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = screenshots.map(screenshot => `
            <div class="screenshot-card" data-screenshot-id="${screenshot.id}" data-game-id="${screenshot.gameId}" style="
                background: #2a2a2a;
                border-radius: 8px;
                overflow: hidden;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                position: relative;
            ">
                <div style="
                    width: 100%;
                    height: 200px;
                    background-image: url('${screenshot.url}');
                    background-size: cover;
                    background-position: center;
                    position: relative;
                ">
                    ${screenshot.favorite ? `
                        <div style="
                            position: absolute;
                            top: 8px;
                            right: 8px;
                            background: rgba(255, 107, 107, 0.9);
                            padding: 6px 10px;
                            border-radius: 12px;
                            font-size: 14px;
                        ">❤️</div>
                    ` : ''}
                </div>
                <div style="padding: 12px;">
                    <h4 style="margin: 0 0 6px 0; color: #fff; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${this.escapeHtml(screenshot.gameTitle)}
                    </h4>
                    <p style="margin: 0 0 8px 0; color: #888; font-size: 11px;">
                        ${new Date(screenshot.timestamp).toLocaleDateString()}
                    </p>
                    ${screenshot.description ? `
                        <p style="margin: 0; color: #aaa; font-size: 12px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${this.escapeHtml(screenshot.description)}
                        </p>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.screenshot-card').forEach(card => {
            const screenshotId = parseInt(card.getAttribute('data-screenshot-id'), 10);
            const gameId = parseInt(card.getAttribute('data-game-id'), 10);

            card.addEventListener('click', () => {
                const screenshot = this.getGameScreenshots(gameId).find(s => s.id === screenshotId);
                if (screenshot) {
                    this.showScreenshotViewer(screenshot, modal);
                }
            });

            // Hover effect
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px)';
                card.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.5)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            });
        });
    }

    /**
     * Show screenshot viewer
     */
    showScreenshotViewer(screenshot, parentModal) {
        const viewer = document.createElement('div');
        viewer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.98);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
        `;

        viewer.innerHTML = `
            <div style="max-width: 1400px; width: 100%; max-height: 100%; overflow-y: auto; display: flex; gap: 20px; flex-direction: column; align-items: center;">
                <!-- Image -->
                <img src="${screenshot.url}" style="
                    max-width: 100%;
                    max-height: 70vh;
                    border-radius: 12px;
                    box-shadow: 0 10px 50px rgba(0, 0, 0, 0.8);
                ">

                <!-- Info Panel -->
                <div style="background: #1a1a1a; padding: 25px; border-radius: 12px; width: 100%; max-width: 600px;">
                    <h3 style="margin: 0 0 12px 0; color: #4fc3f7;">${this.escapeHtml(screenshot.gameTitle)}</h3>
                    <p style="margin: 0 0 15px 0; color: #888; font-size: 13px;">
                        ${new Date(screenshot.timestamp).toLocaleString()}
                    </p>
                    ${screenshot.description ? `
                        <p style="margin: 0 0 15px 0; color: #ccc; font-size: 14px; line-height: 1.6;">
                            ${this.escapeHtml(screenshot.description)}
                        </p>
                    ` : ''}

                    <div style="display: flex; gap: 10px;">
                        <button id="toggle-favorite-screenshot" style="
                            flex: 1;
                            padding: 10px;
                            background: ${screenshot.favorite ? '#ff6b6b' : '#2a2a2a'};
                            border: 1px solid #444;
                            border-radius: 6px;
                            color: #fff;
                            cursor: pointer;
                        ">${screenshot.favorite ? '❤️ Unfavorite' : '🤍 Favorite'}</button>
                        <button id="delete-screenshot" style="
                            flex: 1;
                            padding: 10px;
                            background: #e74c3c;
                            border: none;
                            border-radius: 6px;
                            color: #fff;
                            cursor: pointer;
                        ">🗑️ Delete</button>
                    </div>
                </div>

                <button id="close-viewer" style="
                    padding: 12px 30px;
                    background: #4fc3f7;
                    border: none;
                    border-radius: 6px;
                    color: #000;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 14px;
                ">Close</button>
            </div>
        `;

        document.body.appendChild(viewer);

        // Toggle favorite
        viewer.querySelector('#toggle-favorite-screenshot').addEventListener('click', () => {
            this.toggleFavorite(screenshot.gameId, screenshot.id);
            viewer.remove();
            parentModal.remove();
            this.showGalleryUI();

            if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                window.coverflow.showToast(screenshot.favorite ? 'Added to favorites!' : 'Removed from favorites', 'success');
            }
        });

        // Delete
        viewer.querySelector('#delete-screenshot').addEventListener('click', () => {
            if (confirm('Delete this screenshot?')) {
                this.removeScreenshot(screenshot.gameId, screenshot.id);
                viewer.remove();
                parentModal.remove();
                this.showGalleryUI();

                if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                    window.coverflow.showToast('Screenshot deleted', 'success');
                }
            }
        });

        // Close
        viewer.querySelector('#close-viewer').addEventListener('click', () => {
            viewer.remove();
        });

        // Click anywhere to close
        viewer.addEventListener('click', (e) => {
            if (e.target === viewer) {
                viewer.remove();
            }
        });
    }

    /**
     * Show add screenshot dialog
     */
    showAddScreenshotDialog(parentModal) {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1a1a;
            padding: 25px;
            border-radius: 12px;
            z-index: 10000;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
        `;

        dialog.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #4fc3f7;">Add Screenshot</h3>

            <label style="display: block; color: #aaa; font-size: 13px; margin-bottom: 5px;">Image URL:</label>
            <input type="url" id="screenshot-url" placeholder="https://..." style="
                width: 100%;
                padding: 10px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                color: #fff;
                margin-bottom: 15px;
            ">

            <label style="display: block; color: #aaa; font-size: 13px; margin-bottom: 5px;">Game Name:</label>
            <input type="text" id="screenshot-game" placeholder="Game title..." style="
                width: 100%;
                padding: 10px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                color: #fff;
                margin-bottom: 15px;
            ">

            <label style="display: block; color: #aaa; font-size: 13px; margin-bottom: 5px;">Description (optional):</label>
            <textarea id="screenshot-description" placeholder="Epic moment..." style="
                width: 100%;
                padding: 10px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                color: #fff;
                min-height: 60px;
                margin-bottom: 15px;
                resize: vertical;
            "></textarea>

            <div style="display: flex; gap: 10px;">
                <button id="save-screenshot" style="
                    flex: 1;
                    padding: 12px;
                    background: #667eea;
                    border: none;
                    border-radius: 6px;
                    color: #fff;
                    cursor: pointer;
                    font-weight: bold;
                ">Add</button>
                <button id="cancel-screenshot" style="
                    flex: 1;
                    padding: 12px;
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 6px;
                    color: #fff;
                    cursor: pointer;
                ">Cancel</button>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('#save-screenshot').addEventListener('click', () => {
            const url = dialog.querySelector('#screenshot-url').value.trim();
            const gameName = dialog.querySelector('#screenshot-game').value.trim();
            const description = dialog.querySelector('#screenshot-description').value.trim();

            if (url && gameName) {
                const fakeGameId = Date.now(); // For demo purposes
                this.addScreenshot(fakeGameId, gameName, url, description);

                dialog.remove();
                parentModal.remove();
                this.showGalleryUI();

                if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                    window.coverflow.showToast('Screenshot added!', 'success');
                }
            } else {
                alert('Please fill in URL and game name');
            }
        });

        dialog.querySelector('#cancel-screenshot').addEventListener('click', () => {
            dialog.remove();
        });
    }

    /**
     * Handle screenshot file upload
     */
    handleScreenshotUpload(files, parentModal) {
        if (files.length === 0) return;

        // Convert files to data URLs
        const readers = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();

                // Track FileReader for cleanup
                this.fileReaders.push(reader);

                reader.onload = (e) => {
                    // Remove from tracking once complete
                    const index = this.fileReaders.indexOf(reader);
                    if (index > -1) {
                        this.fileReaders.splice(index, 1);
                    }
                    resolve({ url: e.target.result, file });
                };

                reader.onerror = () => {
                    // Remove from tracking on error
                    const index = this.fileReaders.indexOf(reader);
                    if (index > -1) {
                        this.fileReaders.splice(index, 1);
                    }
                };

                reader.readAsDataURL(file);
            });
        });

        Promise.all(readers).then(results => {
            // For simplicity, add all with generic game name
            // In real app, would prompt for game selection
            const gameName = prompt('Enter game name for these screenshots:') || 'Unknown Game';
            const fakeGameId = Date.now();

            results.forEach((result, index) => {
                setTimeout(() => {
                    this.addScreenshot(fakeGameId + index, gameName, result.url, `Uploaded ${result.file.name}`);
                }, index * 10);
            });

            parentModal.remove();
            this.showGalleryUI();

            if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                window.coverflow.showToast(`Added ${results.length} screenshot(s)!`, 'success');
            }
        });
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.ScreenshotGallery = ScreenshotGallery;
}
