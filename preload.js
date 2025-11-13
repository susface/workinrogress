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
    onScanProgress: (callback) => ipcRenderer.on('scan-progress', (event, status) => callback(status)),
    onScanComplete: (callback) => ipcRenderer.on('scan-complete', (event, status) => callback(status)),

    // Images
    getImagePath: (relativePath) => ipcRenderer.invoke('get-image-path', relativePath),

    // Game launching
    launchGame: (launchCommand) => ipcRenderer.invoke('launch-game', launchCommand),

    // Error logging
    logError: (errorData) => ipcRenderer.invoke('log-error', errorData),
    getErrorLog: () => ipcRenderer.invoke('get-error-log'),
    clearErrorLog: () => ipcRenderer.invoke('clear-error-log'),

    // Platform info
    platform: process.platform,
    isElectron: true
});

console.log('Preload script loaded - Electron API exposed');
