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
     * Smart auto-tagging based on game metadata
     */
    smartAutoTag(games) {
        let taggedCount = 0;

        games.forEach(game => {
            const autoTags = this.generateAutoTags(game);

            autoTags.forEach(tagName => {
                // Create tag if it doesn't exist
                if (!this.tags.has(tagName)) {
                    try {
                        this.createTag(tagName, this.getTagColorForType(tagName));
                    } catch (e) {
                        // Tag might already exist from concurrent operation
                    }
                }

                // Add tag to game
                try {
                    if (!this.gameTags.has(game.id)) {
                        this.gameTags.set(game.id, new Set());
                    }

                    if (!this.gameTags.get(game.id).has(tagName)) {
                        this.addTagToGame(game.id, tagName);
                        taggedCount++;
                    }
                } catch (e) {
                    console.error(`[AUTO_TAG] Error tagging ${game.title}:`, e);
                }
            });
        });

        console.log(`[AUTO_TAG] Auto-tagged ${taggedCount} games`);
        return taggedCount;
    }

    /**
     * Generate automatic tags for a game based on metadata
     */
    generateAutoTags(game) {
        const tags = [];

        // Platform tags
        if (game.platform) {
            tags.push(game.platform.toUpperCase());
        }

        // Genre-based tags
        if (game.genres) {
            const genres = Array.isArray(game.genres) ? game.genres :
                          typeof game.genres === 'string' ? game.genres.split(',').map(g => g.trim()) : [];

            genres.forEach(genre => {
                if (genre) {
                    tags.push(genre);
                }
            });
        }

        // Publisher/Developer tags for well-known studios
        const famousStudios = [
            'Valve', 'Bethesda', 'Rockstar', 'EA', 'Ubisoft', 'Activision',
            'Blizzard', 'Nintendo', 'Sony', 'Microsoft', 'Square Enix',
            'CD Projekt', 'FromSoftware', 'Capcom', 'Konami', 'SEGA'
        ];

        famousStudios.forEach(studio => {
            if (game.developer?.toLowerCase().includes(studio.toLowerCase()) ||
                game.publisher?.toLowerCase().includes(studio.toLowerCase())) {
                tags.push(studio);
            }
        });

        // Playtime-based tags
        if (game.total_play_time > 0) {
            const hours = game.total_play_time / 3600;

            if (hours >= 100) {
                tags.push('100+ Hours');
            } else if (hours >= 50) {
                tags.push('50+ Hours');
            } else if (hours >= 10) {
                tags.push('10+ Hours');
            }

            // Recently played
            if (game.last_played) {
                const lastPlayed = new Date(game.last_played);
                const daysSince = (Date.now() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24);

                if (daysSince <= 7) {
                    tags.push('Recently Played');
                }
            }
        }

        // Title-based pattern matching
        const title = game.title.toLowerCase();

        // Multiplayer indicators
        if (title.includes('multiplayer') || title.includes('online') ||
            title.includes('co-op') || title.includes('versus')) {
            tags.push('Multiplayer');
        }

        // Series detection
        const seriesPatterns = [
            { pattern: /call of duty/i, tag: 'Call of Duty' },
            { pattern: /assassin'?s creed/i, tag: "Assassin's Creed" },
            { pattern: /grand theft auto|gta/i, tag: 'GTA Series' },
            { pattern: /elder scrolls/i, tag: 'Elder Scrolls' },
            { pattern: /fallout/i, tag: 'Fallout' },
            { pattern: /far cry/i, tag: 'Far Cry' },
            { pattern: /battlefield/i, tag: 'Battlefield' },
            { pattern: /tomb raider/i, tag: 'Tomb Raider' },
            { pattern: /dark souls|elden ring|bloodborne/i, tag: 'Soulslike' },
            { pattern: /witcher/i, tag: 'The Witcher' },
            { pattern: /halo/i, tag: 'Halo' },
            { pattern: /pokemon|pokémon/i, tag: 'Pokemon' }
        ];

        seriesPatterns.forEach(({ pattern, tag }) => {
            if (pattern.test(title)) {
                tags.push(tag);
            }
        });

        // Year-based tags (if release date available)
        if (game.release_date) {
            const year = new Date(game.release_date).getFullYear();
            const currentYear = new Date().getFullYear();

            if (year >= currentYear - 1) {
                tags.push('New Release');
            } else if (year >= 2020) {
                tags.push('Modern');
            } else if (year >= 2010) {
                tags.push('Classic');
            } else if (year < 2010) {
                tags.push('Retro');
            }
        }

        // Installation size tags
        if (game.size_on_disk) {
            const gb = game.size_on_disk / (1024 * 1024 * 1024);

            if (gb >= 100) {
                tags.push('Large Game (100GB+)');
            } else if (gb <= 5) {
                tags.push('Small Game (<5GB)');
            }
        }

        return [...new Set(tags)]; // Remove duplicates
    }

    /**
     * Get appropriate color for auto-generated tag type
     */
    getTagColorForType(tagName) {
        const colorMap = {
            // Platforms
            'STEAM': '#1B2838',
            'EPIC': '#313131',
            'XBOX': '#107C10',

            // Playtime
            'Recently Played': '#4fc3f7',
            '10+ Hours': '#81c784',
            '50+ Hours': '#ffb74d',
            '100+ Hours': '#e57373',

            // Era
            'New Release': '#ff6b6b',
            'Modern': '#4ecdc4',
            'Classic': '#95a5a6',
            'Retro': '#9b59b6',

            // Types
            'Multiplayer': '#3498db',
            'Soulslike': '#2c3e50',

            // Studios
            'Valve': '#171a21',
            'Bethesda': '#d4af37',
            'Rockstar': '#fcaf17',
            'CD Projekt': '#cd2a2a',
            'FromSoftware': '#1a1a1a',

            // Default
            'default': '#4fc3f7'
        };

        return colorMap[tagName] || colorMap['default'];
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

                <div style="margin-bottom: 12px;">
                    <button id="auto-tag-btn" style="
                        width: 100%;
                        padding: 12px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border: none;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-weight: bold;
                    ">🤖 Smart Auto-Tag All Games</button>
                    <small style="display: block; color: #888; margin-top: 4px; font-size: 11px;">
                        Automatically tag games by platform, genre, playtime, series, and more
                    </small>
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
        modal.querySelector('#auto-tag-btn').addEventListener('click', async () => {
            const autoTagBtn = modal.querySelector('#auto-tag-btn');
            autoTagBtn.textContent = '🤖 Auto-tagging...';
            autoTagBtn.disabled = true;

            try {
                // Get all games
                let games = [];
                if (window.coverflow && window.coverflow.allAlbums) {
                    games = window.coverflow.allAlbums.filter(g => g.type === 'game');
                } else if (window.electronAPI) {
                    const result = await window.electronAPI.getGames();
                    if (result.success) {
                        games = result.games;
                    }
                }

                if (games.length === 0) {
                    throw new Error('No games found to tag');
                }

                const taggedCount = this.smartAutoTag(games);

                modal.remove();
                this.showTagsUI(); // Refresh

                if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                    window.coverflow.showToast(`Auto-tagged ${taggedCount} games!`, 'success');
                } else {
                    alert(`Auto-tagged ${taggedCount} games!`);
                }
            } catch (error) {
                console.error('[AUTO_TAG] Error:', error);
                if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                    window.coverflow.showToast(`Auto-tag failed: ${error.message}`, 'error');
                } else {
                    alert(`Auto-tag failed: ${error.message}`);
                }
                autoTagBtn.textContent = '🤖 Smart Auto-Tag All Games';
                autoTagBtn.disabled = false;
            }
        });

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
