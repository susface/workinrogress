const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Game data
    getGames: () => ipcRenderer.invoke('get-games'),
    getGamesCount: () => ipcRenderer.invoke('get-games-count'),

    // Scanning
    startScan: () => ipcRenderer.invoke('start-scan'),
    getScanStatus: () => ipcRenderer.invoke('get-scan-status'),
    onScanProgress: (callback) => {
        const listener = (event, status) => callback(status);
        ipcRenderer.on('scan-progress', listener);
        // Return cleanup function
        return () => ipcRenderer.removeListener('scan-progress', listener);
    },
    onScanComplete: (callback) => {
        const listener = (event, status) => callback(status);
        ipcRenderer.on('scan-complete', listener);
        // Return cleanup function
        return () => ipcRenderer.removeListener('scan-complete', listener);
    },

    // Images
    getImagePath: (relativePath) => ipcRenderer.invoke('get-image-path', relativePath),

    // Game launching and session tracking
    launchGame: (launchCommand, gameId) => ipcRenderer.invoke('launch-game', launchCommand, gameId),
    endGameSession: (gameId) => ipcRenderer.invoke('end-game-session', gameId),
    getPlayTime: (gameId) => ipcRenderer.invoke('get-play-time', gameId),
    getActiveSessions: () => ipcRenderer.invoke('get-active-sessions'),

    // Media file opening
    openMediaFile: (filePath) => ipcRenderer.invoke('open-media-file', filePath),

    // Favorites and hidden
    toggleFavorite: (gameId) => ipcRenderer.invoke('toggle-favorite', gameId),
    toggleHidden: (gameId) => ipcRenderer.invoke('toggle-hidden', gameId),
    getFavorites: () => ipcRenderer.invoke('get-favorites'),

    // Ratings and notes
    setRating: (gameId, rating) => ipcRenderer.invoke('set-rating', gameId, rating),
    setNotes: (gameId, notes) => ipcRenderer.invoke('set-notes', gameId, notes),
    setCustomLaunchOptions: (gameId, options) => ipcRenderer.invoke('set-custom-launch-options', gameId, options),

    // Special lists
    getRecentlyPlayed: (limit) => ipcRenderer.invoke('get-recently-played', limit),
    getMostPlayed: (limit) => ipcRenderer.invoke('get-most-played', limit),
    getRecentlyAdded: (limit) => ipcRenderer.invoke('get-recently-added', limit),
    findDuplicates: () => ipcRenderer.invoke('find-duplicates'),

    // Advanced filtering
    filterGames: (filters) => ipcRenderer.invoke('filter-games', filters),

    // Error logging
    logError: (errorData) => ipcRenderer.invoke('log-error', errorData),
    getErrorLog: () => ipcRenderer.invoke('get-error-log'),
    clearErrorLog: () => ipcRenderer.invoke('clear-error-log'),

    // Game data management
    clearGameData: () => ipcRenderer.invoke('clear-game-data'),

    // Media folder selection
    selectMediaFolder: () => ipcRenderer.invoke('select-media-folder'),
    scanMediaFolder: (folderPath) => ipcRenderer.invoke('scan-media-folder', folderPath),
    getMediaFolders: () => ipcRenderer.invoke('get-media-folders'),
    loadAllMediaFolders: () => ipcRenderer.invoke('load-all-media-folders'),

    // Platform info
    platform: process.platform,
    isElectron: true,

    // App paths
    getAppPath: () => ipcRenderer.invoke('get-app-path'),

    // Collections
    getCollections: () => ipcRenderer.invoke('get-collections'),
    createCollection: (name, description, color, icon) => ipcRenderer.invoke('create-collection', name, description, color, icon),
    addToCollection: (collectionId, gameId) => ipcRenderer.invoke('add-to-collection', collectionId, gameId),
    removeFromCollection: (collectionId, gameId) => ipcRenderer.invoke('remove-from-collection', collectionId, gameId),
    getCollectionGames: (collectionId) => ipcRenderer.invoke('get-collection-games', collectionId),
    deleteCollection: (collectionId) => ipcRenderer.invoke('delete-collection', collectionId),

    // Custom covers
    setCustomCover: (gameId, coverUrl, coverType, source) => ipcRenderer.invoke('set-custom-cover', gameId, coverUrl, coverType, source),
    getCustomCover: (gameId) => ipcRenderer.invoke('get-custom-cover', gameId),
    removeCustomCover: (gameId) => ipcRenderer.invoke('remove-custom-cover', gameId),

    // Playtime goals
    createGoal: (goalType, targetValue, gameId, endDate) => ipcRenderer.invoke('create-goal', goalType, targetValue, gameId, endDate),
    getGoals: () => ipcRenderer.invoke('get-goals'),
    updateGoalProgress: (goalId, currentValue, completed) => ipcRenderer.invoke('update-goal-progress', goalId, currentValue, completed),
    deleteGoal: (goalId) => ipcRenderer.invoke('delete-goal', goalId),

    // Themes
    getThemes: () => ipcRenderer.invoke('get-themes'),
    getActiveTheme: () => ipcRenderer.invoke('get-active-theme'),
    activateTheme: (themeId) => ipcRenderer.invoke('activate-theme', themeId),
    createTheme: (name, colors, background) => ipcRenderer.invoke('create-theme', name, colors, background),
    deleteTheme: (themeId) => ipcRenderer.invoke('delete-theme', themeId),

    // Statistics
    getPlaytimeStats: (period) => ipcRenderer.invoke('get-playtime-stats', period),

    // Soundtrack
    scanGameSoundtrack: (gameId) => ipcRenderer.invoke('scan-game-soundtrack', gameId),

    // Updates
    checkGameUpdates: () => ipcRenderer.invoke('check-game-updates'),
    updateGame: (gameId) => ipcRenderer.invoke('update-game', gameId),

    // Portable mode
    isPortableMode: () => ipcRenderer.invoke('is-portable-mode'),
    setPortableMode: (enable) => ipcRenderer.invoke('set-portable-mode', enable),
    restartApp: () => ipcRenderer.invoke('restart-app'),

    // Mod Manager
    getGameMods: (gameId) => ipcRenderer.invoke('get-game-mods', gameId),
    scanGameMods: (gameId) => ipcRenderer.invoke('scan-game-mods', gameId),
    applyModChanges: (gameId, mods) => ipcRenderer.invoke('apply-mod-changes', gameId, mods),
    openModFolder: (gameId) => ipcRenderer.invoke('open-mod-folder', gameId),
    deleteMod: (gameId, modId) => ipcRenderer.invoke('delete-mod', gameId, modId),

    // Thunderstore API
    searchThunderstoreMods: (gameName) => ipcRenderer.invoke('search-thunderstore-mods', gameName),
    installThunderstoreMod: (gameId, modPackage) => ipcRenderer.invoke('install-thunderstore-mod', gameId, modPackage)
});

console.log('Preload script loaded - Electron API exposed');
