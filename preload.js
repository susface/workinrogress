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

    // Game launching
    launchGame: (launchCommand) => ipcRenderer.invoke('launch-game', launchCommand),

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
