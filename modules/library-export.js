/**
 * Library Export/Import Module
 * Allows users to backup and restore their entire game library with metadata
 */

class LibraryExport {
    constructor() {
        this.version = '1.0';
    }

    /**
     * Export entire library to JSON
     */
    async exportLibrary() {
        if (!window.electronAPI) {
            throw new Error('Export only available in Electron mode');
        }

        try {
            // Get all games
            const gamesResult = await window.electronAPI.getGames();
            if (!gamesResult.success) {
                throw new Error('Failed to fetch games');
            }

            // Get all favorites
            const favoritesResult = await window.electronAPI.getFavorites();

            // Get all collections
            const collectionsResult = await window.electronAPI.getCollections();

            // Get tags if available
            let tags = null;
            if (window.gameTags) {
                tags = window.gameTags.exportToJSON();
            }

            // Get playtime stats
            const statsResult = await window.electronAPI.getPlaytimeStats('year');

            const exportData = {
                version: this.version,
                exportDate: new Date().toISOString(),
                platform: window.electronAPI.platform,
                totalGames: gamesResult.games.length,
                games: gamesResult.games.map(game => ({
                    // Core data
                    id: game.id,
                    platform: game.platform,
                    title: game.title,
                    app_id: game.app_id,
                    package_name: game.package_name,

                    // User data
                    is_favorite: game.is_favorite,
                    is_hidden: game.is_hidden,
                    launch_count: game.launch_count,
                    last_played: game.last_played,
                    total_play_time: game.total_play_time,
                    user_rating: game.user_rating,
                    user_notes: game.user_notes,

                    // Metadata
                    developer: game.developer,
                    publisher: game.publisher,
                    release_date: game.release_date,
                    description: game.description,
                    genres: game.genres
                })),
                collections: collectionsResult.success ? collectionsResult.collections : [],
                tags: tags ? JSON.parse(tags) : null,
                stats: statsResult.success ? {
                    totalPlaytime: statsResult.stats.totalPlaytime,
                    totalGames: statsResult.stats.totalGames,
                    exportedAt: new Date().toISOString()
                } : null
            };

            return exportData;
        } catch (error) {
            console.error('[EXPORT] Error:', error);
            throw error;
        }
    }

    /**
     * Import library from JSON
     * Merges with existing data (doesn't replace)
     */
    async importLibrary(importData) {
        if (!window.electronAPI) {
            throw new Error('Import only available in Electron mode');
        }

        try {
            // Validate import data
            if (!importData.version || !importData.games) {
                throw new Error('Invalid library export format');
            }

            console.log(`[IMPORT] Starting import of ${importData.games.length} games...`);

            // Import tags first if available
            if (importData.tags && window.gameTags) {
                try {
                    window.gameTags.importFromJSON(JSON.stringify(importData.tags));
                    console.log('[IMPORT] Tags imported');
                } catch (error) {
                    console.error('[IMPORT] Tags import failed:', error);
                }
            }

            // Import collections
            if (importData.collections) {
                for (const collection of importData.collections) {
                    try {
                        await window.electronAPI.createCollection(
                            collection.name,
                            collection.description,
                            collection.color,
                            collection.icon
                        );
                    } catch (error) {
                        console.warn(`[IMPORT] Collection "${collection.name}" might already exist`);
                    }
                }
                console.log('[IMPORT] Collections imported');
            }

            // NOTE: Game import is read-only for user data (favorites, notes, etc.)
            // Actual game scanning must be done through the scanner
            // We can only restore user preferences for games that already exist

            const importedCount = {
                favorites: 0,
                ratings: 0,
                notes: 0
            };

            // Get current games to match by title/platform
            const currentGamesResult = await window.electronAPI.getGames();
            const currentGames = new Map();

            if (currentGamesResult.success) {
                currentGamesResult.games.forEach(game => {
                    const key = `${game.platform}:${game.title}`;
                    currentGames.set(key, game);
                });
            }

            // Restore user data for matching games
            for (const importedGame of importData.games) {
                const key = `${importedGame.platform}:${importedGame.title}`;
                const currentGame = currentGames.get(key);

                if (currentGame) {
                    try {
                        // Restore favorite status
                        if (importedGame.is_favorite && !currentGame.is_favorite) {
                            await window.electronAPI.toggleFavorite(currentGame.id);
                            importedCount.favorites++;
                        }

                        // Restore hidden status
                        if (importedGame.is_hidden && !currentGame.is_hidden) {
                            await window.electronAPI.toggleHidden(currentGame.id);
                        }

                        // Restore rating
                        if (importedGame.user_rating) {
                            await window.electronAPI.setRating(currentGame.id, importedGame.user_rating);
                            importedCount.ratings++;
                        }

                        // Restore notes
                        if (importedGame.user_notes) {
                            await window.electronAPI.setNotes(currentGame.id, importedGame.user_notes);
                            importedCount.notes++;
                        }
                    } catch (error) {
                        console.error(`[IMPORT] Error importing data for ${importedGame.title}:`, error);
                    }
                }
            }

            console.log('[IMPORT] Import complete', importedCount);
            return {
                success: true,
                gamesProcessed: importData.games.length,
                gamesMatched: currentGames.size,
                imported: importedCount
            };
        } catch (error) {
            console.error('[IMPORT] Error:', error);
            throw error;
        }
    }

    /**
     * Show export/import UI
     */
    showExportImportUI() {
        const modal = document.createElement('div');
        modal.className = 'export-import-modal';
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

        modal.innerHTML = `
            <div style="background: #1a1a1a; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%;">
                <h2 style="margin: 0 0 20px 0; color: #4fc3f7;">Library Backup & Restore</h2>

                <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 12px 0; color: #81c784; font-size: 16px;">📤 Export Library</h3>
                    <p style="color: #aaa; font-size: 14px; margin: 0 0 16px 0;">
                        Backup your entire game library including:
                    </p>
                    <ul style="color: #888; font-size: 13px; margin: 0 0 16px 0; padding-left: 20px;">
                        <li>Game metadata and info</li>
                        <li>Favorites and hidden games</li>
                        <li>Play time and statistics</li>
                        <li>User ratings and notes</li>
                        <li>Collections and tags</li>
                    </ul>
                    <button id="export-library-btn" style="
                        width: 100%;
                        padding: 12px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border: none;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 14px;
                    ">Export Library to JSON</button>
                </div>

                <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 12px 0; color: #ff6b6b; font-size: 16px;">📥 Import Library</h3>
                    <p style="color: #aaa; font-size: 14px; margin: 0 0 16px 0;">
                        Restore library backup. This will:
                    </p>
                    <ul style="color: #888; font-size: 13px; margin: 0 0 16px 0; padding-left: 20px;">
                        <li>Restore user data for matching games</li>
                        <li>Import collections and tags</li>
                        <li>Merge with existing data (safe)</li>
                        <li>⚠️ Requires games to be scanned first</li>
                    </ul>
                    <button id="import-library-btn" style="
                        width: 100%;
                        padding: 12px;
                        background: #e74c3c;
                        border: none;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 14px;
                    ">Import Library from JSON</button>
                    <input type="file" id="import-library-input" accept=".json" style="display: none;">
                </div>

                <button id="close-export-import-modal" style="
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

        // Export button
        modal.querySelector('#export-library-btn').addEventListener('click', async () => {
            try {
                const exportButton = modal.querySelector('#export-library-btn');
                exportButton.textContent = 'Exporting...';
                exportButton.disabled = true;

                const data = await this.exportLibrary();
                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `game-library-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);

                if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                    window.coverflow.showToast(`Exported ${data.totalGames} games successfully!`, 'success');
                }

                exportButton.textContent = 'Export Library to JSON';
                exportButton.disabled = false;
            } catch (error) {
                console.error('[EXPORT] Error:', error);
                if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                    window.coverflow.showToast(`Export failed: ${error.message}`, 'error');
                } else {
                    alert(`Export failed: ${error.message}`);
                }
                modal.querySelector('#export-library-btn').disabled = false;
            }
        });

        // Import button
        modal.querySelector('#import-library-btn').addEventListener('click', () => {
            modal.querySelector('#import-library-input').click();
        });

        modal.querySelector('#import-library-input').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const importButton = modal.querySelector('#import-library-btn');
                    importButton.textContent = 'Importing...';
                    importButton.disabled = true;

                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        try {
                            const importData = JSON.parse(event.target.result);
                            const result = await this.importLibrary(importData);

                            if (result.success) {
                                if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                                    window.coverflow.showToast(
                                        `Import complete! Restored ${result.imported.favorites} favorites, ${result.imported.ratings} ratings, ${result.imported.notes} notes`,
                                        'success'
                                    );
                                }

                                // Reload the coverflow to show updated data
                                if (window.coverflow && typeof window.coverflow.reloadGamesFromServer === 'function') {
                                    await window.coverflow.reloadGamesFromServer();
                                }
                            }

                            importButton.textContent = 'Import Library from JSON';
                            importButton.disabled = false;
                            modal.remove();
                        } catch (error) {
                            console.error('[IMPORT] Error:', error);
                            if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                                window.coverflow.showToast(`Import failed: ${error.message}`, 'error');
                            } else {
                                alert(`Import failed: ${error.message}`);
                            }
                            importButton.textContent = 'Import Library from JSON';
                            importButton.disabled = false;
                        }
                    };
                    reader.readAsText(file);
                } catch (error) {
                    console.error('[IMPORT] File read error:', error);
                    modal.querySelector('#import-library-btn').disabled = false;
                }
            }
        });

        modal.querySelector('#close-export-import-modal').addEventListener('click', () => {
            modal.remove();
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.LibraryExport = LibraryExport;
}
