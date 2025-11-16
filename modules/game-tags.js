/**
 * Game Tags Module
 * Allows users to create custom tags and organize games
 */

class GameTags {
    constructor() {
        this.tags = new Map(); // tag name -> {color, games: Set()}
        this.gameTags = new Map(); // gameId -> Set(tag names)
        this.loadTagsFromStorage();
    }

    /**
     * Load tags from localStorage
     */
    loadTagsFromStorage() {
        try {
            const saved = localStorage.getItem('game-tags');
            if (saved) {
                const data = JSON.parse(saved);

                // Restore tags Map
                if (data.tags) {
                    Object.entries(data.tags).forEach(([name, tagData]) => {
                        this.tags.set(name, {
                            color: tagData.color,
                            games: new Set(tagData.games || [])
                        });
                    });
                }

                // Restore gameTags Map
                if (data.gameTags) {
                    Object.entries(data.gameTags).forEach(([gameId, tags]) => {
                        this.gameTags.set(parseInt(gameId), new Set(tags || []));
                    });
                }

                console.log(`[TAGS] Loaded ${this.tags.size} tags from storage`);
            }
        } catch (error) {
            console.error('[TAGS] Error loading from storage:', error);
        }
    }

    /**
     * Save tags to localStorage
     */
    saveTagsToStorage() {
        try {
            const data = {
                tags: {},
                gameTags: {}
            };

            // Convert tags Map to object
            this.tags.forEach((tagData, name) => {
                data.tags[name] = {
                    color: tagData.color,
                    games: Array.from(tagData.games)
                };
            });

            // Convert gameTags Map to object
            this.gameTags.forEach((tags, gameId) => {
                data.gameTags[gameId] = Array.from(tags);
            });

            localStorage.setItem('game-tags', JSON.stringify(data));
            console.log('[TAGS] Saved to storage');
        } catch (error) {
            console.error('[TAGS] Error saving to storage:', error);
        }
    }

    /**
     * Create a new tag
     */
    createTag(name, color = '#4fc3f7') {
        if (!name || typeof name !== 'string') {
            throw new Error('Tag name must be a non-empty string');
        }

        const tagName = name.trim();
        if (tagName.length === 0) {
            throw new Error('Tag name cannot be empty');
        }

        if (this.tags.has(tagName)) {
            throw new Error(`Tag "${tagName}" already exists`);
        }

        this.tags.set(tagName, {
            color: color,
            games: new Set()
        });

        this.saveTagsToStorage();
        console.log(`[TAGS] Created tag: ${tagName}`);
        return true;
    }

    /**
     * Delete a tag
     */
    deleteTag(name) {
        if (!this.tags.has(name)) {
            return false;
        }

        // Remove tag from all games
        this.gameTags.forEach((tags) => {
            tags.delete(name);
        });

        this.tags.delete(name);
        this.saveTagsToStorage();
        console.log(`[TAGS] Deleted tag: ${name}`);
        return true;
    }

    /**
     * Add tag to game
     */
    addTagToGame(gameId, tagName) {
        if (!this.tags.has(tagName)) {
            throw new Error(`Tag "${tagName}" does not exist`);
        }

        if (!this.gameTags.has(gameId)) {
            this.gameTags.set(gameId, new Set());
        }

        this.gameTags.get(gameId).add(tagName);
        this.tags.get(tagName).games.add(gameId);
        this.saveTagsToStorage();

        console.log(`[TAGS] Added "${tagName}" to game ${gameId}`);
        return true;
    }

    /**
     * Remove tag from game
     */
    removeTagFromGame(gameId, tagName) {
        if (this.gameTags.has(gameId)) {
            this.gameTags.get(gameId).delete(tagName);
        }

        if (this.tags.has(tagName)) {
            this.tags.get(tagName).games.delete(gameId);
        }

        this.saveTagsToStorage();
        console.log(`[TAGS] Removed "${tagName}" from game ${gameId}`);
        return true;
    }

    /**
     * Get all tags for a game
     */
    getGameTags(gameId) {
        if (!this.gameTags.has(gameId)) {
            return [];
        }
        return Array.from(this.gameTags.get(gameId));
    }

    /**
     * Get all games with a specific tag
     */
    getGamesWithTag(tagName) {
        if (!this.tags.has(tagName)) {
            return [];
        }
        return Array.from(this.tags.get(tagName).games);
    }

    /**
     * Get all tags
     */
    getAllTags() {
        const tags = [];
        this.tags.forEach((tagData, name) => {
            tags.push({
                name: name,
                color: tagData.color,
                gameCount: tagData.games.size
            });
        });
        return tags;
    }

    /**
     * Update tag color
     */
    updateTagColor(tagName, newColor) {
        if (!this.tags.has(tagName)) {
            throw new Error(`Tag "${tagName}" does not exist`);
        }

        this.tags.get(tagName).color = newColor;
        this.saveTagsToStorage();
        return true;
    }

    /**
     * Rename tag
     */
    renameTag(oldName, newName) {
        if (!this.tags.has(oldName)) {
            throw new Error(`Tag "${oldName}" does not exist`);
        }

        if (this.tags.has(newName)) {
            throw new Error(`Tag "${newName}" already exists`);
        }

        const tagData = this.tags.get(oldName);
        this.tags.delete(oldName);
        this.tags.set(newName, tagData);

        // Update references in gameTags
        this.gameTags.forEach((tags) => {
            if (tags.has(oldName)) {
                tags.delete(oldName);
                tags.add(newName);
            }
        });

        this.saveTagsToStorage();
        console.log(`[TAGS] Renamed "${oldName}" to "${newName}"`);
        return true;
    }

    /**
     * Filter games by tags
     */
    filterGamesByTags(gameIds, tagNames) {
        if (!tagNames || tagNames.length === 0) {
            return gameIds;
        }

        return gameIds.filter(gameId => {
            const gameTags = this.getGameTags(gameId);
            return tagNames.some(tag => gameTags.includes(tag));
        });
    }

    /**
     * Export tags to JSON
     */
    exportToJSON() {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            tags: {}
        };

        this.tags.forEach((tagData, name) => {
            data.tags[name] = {
                color: tagData.color,
                games: Array.from(tagData.games)
            };
        });

        return JSON.stringify(data, null, 2);
    }

    /**
     * Import tags from JSON
     */
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            if (!data.tags) {
                throw new Error('Invalid tags JSON format');
            }

            // Merge imported tags
            Object.entries(data.tags).forEach(([name, tagData]) => {
                if (!this.tags.has(name)) {
                    this.tags.set(name, {
                        color: tagData.color,
                        games: new Set(tagData.games || [])
                    });
                } else {
                    // Merge games into existing tag
                    const existingTag = this.tags.get(name);
                    (tagData.games || []).forEach(gameId => {
                        existingTag.games.add(gameId);
                    });
                }
            });

            // Update gameTags Map
            this.tags.forEach((tagData, tagName) => {
                tagData.games.forEach(gameId => {
                    if (!this.gameTags.has(gameId)) {
                        this.gameTags.set(gameId, new Set());
                    }
                    this.gameTags.get(gameId).add(tagName);
                });
            });

            this.saveTagsToStorage();
            console.log('[TAGS] Imported tags successfully');
            return true;
        } catch (error) {
            console.error('[TAGS] Import error:', error);
            throw error;
        }
    }

    /**
     * Show tags management UI
     */
    showTagsUI() {
        const modal = document.createElement('div');
        modal.className = 'tags-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const allTags = this.getAllTags();

        modal.innerHTML = `
            <div style="background: #1a1a1a; padding: 30px; border-radius: 12px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h2 style="margin: 0 0 20px 0; color: #4fc3f7;">Manage Tags</h2>

                <div style="margin-bottom: 20px; display: flex; gap: 10px;">
                    <input type="text" id="new-tag-name" placeholder="New tag name..." style="
                        flex: 1;
                        padding: 10px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 6px;
                        color: #fff;
                        outline: none;
                    ">
                    <input type="color" id="new-tag-color" value="#4fc3f7" style="
                        width: 50px;
                        height: 40px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                    ">
                    <button id="create-tag-btn" style="
                        padding: 10px 20px;
                        background: #4fc3f7;
                        border: none;
                        border-radius: 6px;
                        color: #000;
                        cursor: pointer;
                        font-weight: bold;
                    ">Create Tag</button>
                </div>

                <div id="tags-list" style="margin-bottom: 20px;">
                    ${allTags.length === 0 ?
                        '<p style="color: #666; text-align: center; padding: 20px;">No tags created yet</p>' :
                        allTags.map(tag => `
                            <div class="tag-item" style="
                                display: flex;
                                align-items: center;
                                padding: 12px;
                                margin: 8px 0;
                                background: #2a2a2a;
                                border-radius: 6px;
                                gap: 12px;
                            ">
                                <div style="
                                    width: 30px;
                                    height: 30px;
                                    background: ${tag.color};
                                    border-radius: 50%;
                                "></div>
                                <div style="flex: 1;">
                                    <div style="color: #fff; font-weight: bold;">${this.escapeHtml(tag.name)}</div>
                                    <div style="color: #888; font-size: 12px;">${tag.gameCount} game${tag.gameCount !== 1 ? 's' : ''}</div>
                                </div>
                                <button class="delete-tag-btn" data-tag="${this.escapeHtml(tag.name)}" style="
                                    padding: 6px 12px;
                                    background: #e74c3c;
                                    border: none;
                                    border-radius: 4px;
                                    color: #fff;
                                    cursor: pointer;
                                    font-size: 12px;
                                ">Delete</button>
                            </div>
                        `).join('')
                    }
                </div>

                <div style="display: flex; gap: 10px;">
                    <button id="export-tags-btn" style="
                        flex: 1;
                        padding: 10px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                    ">Export Tags</button>
                    <button id="import-tags-btn" style="
                        flex: 1;
                        padding: 10px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                    ">Import Tags</button>
                    <input type="file" id="import-tags-input" accept=".json" style="display: none;">
                </div>

                <button id="close-tags-modal" style="
                    width: 100%;
                    margin-top: 20px;
                    padding: 10px;
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

        // Event listeners
        modal.querySelector('#create-tag-btn').addEventListener('click', () => {
            const nameInput = modal.querySelector('#new-tag-name');
            const colorInput = modal.querySelector('#new-tag-color');

            try {
                this.createTag(nameInput.value, colorInput.value);
                nameInput.value = '';
                modal.remove();
                this.showTagsUI(); // Refresh
                if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                    window.coverflow.showToast('Tag created successfully', 'success');
                }
            } catch (error) {
                if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                    window.coverflow.showToast(error.message, 'error');
                } else {
                    alert(error.message);
                }
            }
        });

        modal.querySelectorAll('.delete-tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tagName = btn.getAttribute('data-tag');
                if (confirm(`Delete tag "${tagName}"?`)) {
                    this.deleteTag(tagName);
                    modal.remove();
                    this.showTagsUI(); // Refresh
                    if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                        window.coverflow.showToast('Tag deleted', 'success');
                    }
                }
            });
        });

        modal.querySelector('#export-tags-btn').addEventListener('click', () => {
            const json = this.exportToJSON();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `game-tags-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                window.coverflow.showToast('Tags exported', 'success');
            }
        });

        modal.querySelector('#import-tags-btn').addEventListener('click', () => {
            modal.querySelector('#import-tags-input').click();
        });

        modal.querySelector('#import-tags-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        this.importFromJSON(event.target.result);
                        modal.remove();
                        this.showTagsUI(); // Refresh
                        if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                            window.coverflow.showToast('Tags imported successfully', 'success');
                        }
                    } catch (error) {
                        if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                            window.coverflow.showToast(`Import failed: ${error.message}`, 'error');
                        } else {
                            alert(`Import failed: ${error.message}`);
                        }
                    }
                };
                reader.readAsText(file);
            }
        });

        modal.querySelector('#close-tags-modal').addEventListener('click', () => {
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
     * Escape HTML to prevent XSS
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
    window.GameTags = GameTags;
}
