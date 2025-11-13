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

    // Favorites and hidden
    toggleFavorite: (gameId) => ipcRenderer.invoke('toggle-favorite', gameId),
    toggleHidden: (gameId) => ipcRenderer.invoke('toggle-hidden', gameId),
    getFavorites: () => ipcRenderer.invoke('get-favorites'),

    // Ratings and notes
    setRating: (gameId, rating) => ipcRenderer.invoke('set-rating', gameId, rating),
    setNotes: (gameId, notes) => ipcRenderer.invoke('set-notes', gameId, notes),

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

    // Media folder selection
    selectMediaFolder: () => ipcRenderer.invoke('select-media-folder'),
    scanMediaFolder: (folderPath) => ipcRenderer.invoke('scan-media-folder', folderPath),

    // Platform info
    platform: process.platform,
    isElectron: true
});

console.log('Preload script loaded - Electron API exposed');
