const { app, BrowserWindow, ipcMain, dialog, shell, Notification, Tray, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');

// Constants
const WINDOW_CONFIG = {
    WIDTH: 1400,
    HEIGHT: 900,
    MIN_WIDTH: 1000,
    MIN_HEIGHT: 700
};

const SCAN_PROGRESS = {
    STEAM: 0.33,
    EPIC: 0.66,
    XBOX: 0.90,
    COMPLETE: 100
};

const TASKBAR_PROGRESS = {
    INDETERMINATE: 2,
    CLEAR: -1
};

// Windows-specific features flag
const isWindows = process.platform === 'win32';

// Debug mode flag - check for -debug or --debug command line argument
// Usage: app.exe -debug (or app.exe --debug)
// This will open the Developer Tools console for debugging
const isDebugMode = process.argv.includes('-debug') || process.argv.includes('--debug');

let mainWindow;
let tray = null;
let scanningProcess = null;
let scanStatus = {
    scanning: false,
    progress: 0,
    total_games: 0,
    current_platform: null,
    message: 'Ready to scan',
    error: null
};

// Track active timeouts and intervals for cleanup
let activeTimeouts = new Set();
let activeIntervals = new Set();
let windowEventListenersAttached = false; // Prevent duplicate event listeners
let sessionCleanupInterval = null; // Periodic cleanup check for orphaned sessions

// Portable mode support
const portableFlagPath = path.join(__dirname, 'portable.txt');
const isPortableMode = fs.existsSync(portableFlagPath);

// Helper functions to track timeouts and intervals for proper cleanup
function safeSetTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
        activeTimeouts.delete(timeoutId);
        callback();
    }, delay);
    activeTimeouts.add(timeoutId);
    return timeoutId;
}

function safeClearTimeout(timeoutId) {
    clearTimeout(timeoutId);
    activeTimeouts.delete(timeoutId);
}

function safeSetInterval(callback, delay) {
    const intervalId = setInterval(callback, delay);
    activeIntervals.add(intervalId);
    return intervalId;
}

function safeClearInterval(intervalId) {
    clearInterval(intervalId);
    activeIntervals.delete(intervalId);
}

function cleanupAllTimers() {
    console.log(`[CLEANUP] Clearing ${activeTimeouts.size} timeouts and ${activeIntervals.size} intervals`);
    activeTimeouts.forEach(id => clearTimeout(id));
    activeIntervals.forEach(id => clearInterval(id));
    activeTimeouts.clear();
    activeIntervals.clear();
}

// Paths
const isDev = !app.isPackaged;
const appPath = isDev ? __dirname : process.resourcesPath;

// Use portable mode paths if enabled (store in app directory)
const gameDataPath = isPortableMode
    ? path.join(appPath, 'game_data')
    : path.join(app.getPath('userData'), 'game_data');

const dbPath = path.join(gameDataPath, 'games.db');
const iconsPath = path.join(gameDataPath, 'icons');
const boxartPath = path.join(gameDataPath, 'boxart');

console.log('[PORTABLE] Portable mode:', isPortableMode ? 'ENABLED' : 'DISABLED');
if (isPortableMode) {
    console.log('[PORTABLE] Data path:', gameDataPath);
}

// Ensure directories exist
function ensureDirectories() {
    [gameDataPath, iconsPath, boxartPath].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// Initialize database
function initDatabase() {
    ensureDirectories();
    const db = new Database(dbPath);

    db.exec(`
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT NOT NULL,
            title TEXT NOT NULL,
            app_id TEXT,
            package_name TEXT,
            install_directory TEXT,
            launch_command TEXT,
            description TEXT,
            short_description TEXT,
            long_description TEXT,
            developer TEXT,
            publisher TEXT,
            release_date TEXT,
            icon_path TEXT,
            boxart_path TEXT,
            exe_icon_path TEXT,
            header_path TEXT,
            size_on_disk INTEGER,
            last_updated INTEGER,
            genres TEXT,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_favorite INTEGER DEFAULT 0,
            is_hidden INTEGER DEFAULT 0,
            launch_count INTEGER DEFAULT 0,
            last_played TIMESTAMP,
            total_play_time INTEGER DEFAULT 0,
            user_rating INTEGER,
            user_notes TEXT,
            has_workshop_support INTEGER DEFAULT 0,
            workshop_id TEXT,
            engine TEXT,
            UNIQUE(platform, title)
        )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_platform ON games(platform)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_title ON games(title)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_last_played ON games(last_played)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_is_favorite ON games(is_favorite)');
    // Index for optimized duplicate detection
    db.exec('CREATE INDEX IF NOT EXISTS idx_title_normalized ON games(LOWER(TRIM(title)))');

    // Add thunderstore_community column if it doesn't exist (migration)
    try {
        db.exec('ALTER TABLE games ADD COLUMN thunderstore_community TEXT');
    } catch (e) {
        // Column already exists, ignore error
    }

    // Create game sessions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS game_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
            duration INTEGER,
            FOREIGN KEY (game_id) REFERENCES games(id)
        )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id)');

    // Create game collections table
    db.exec(`
        CREATE TABLE IF NOT EXISTS game_collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            color TEXT DEFAULT '#4fc3f7',
            icon TEXT DEFAULT '📁',
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create collection_games junction table
    db.exec(`
        CREATE TABLE IF NOT EXISTS collection_games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_id INTEGER NOT NULL,
            game_id INTEGER NOT NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (collection_id) REFERENCES game_collections(id) ON DELETE CASCADE,
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
            UNIQUE(collection_id, game_id)
        )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_collection_games_collection ON collection_games(collection_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_collection_games_game ON collection_games(game_id)');

    // Create custom covers table
    db.exec(`
        CREATE TABLE IF NOT EXISTS custom_covers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL UNIQUE,
            cover_type TEXT DEFAULT 'grid',
            cover_url TEXT,
            source TEXT DEFAULT 'user_upload',
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
        )
    `);

    // Create playtime goals table
    db.exec(`
        CREATE TABLE IF NOT EXISTS playtime_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER,
            goal_type TEXT NOT NULL,
            target_value INTEGER NOT NULL,
            current_value INTEGER DEFAULT 0,
            start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_date TIMESTAMP,
            completed INTEGER DEFAULT 0,
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
        )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_playtime_goals_game ON playtime_goals(game_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_playtime_goals_type ON playtime_goals(goal_type)');

    // Create themes table
    db.exec(`
        CREATE TABLE IF NOT EXISTS themes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            colors TEXT NOT NULL,
            background TEXT,
            is_active INTEGER DEFAULT 0,
            is_builtin INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Insert default themes if not exists
    const defaultThemes = [
        { name: 'Dark (Default)', colors: JSON.stringify({ primary: '#4fc3f7', secondary: '#81c784', background: '#000000', text: '#ffffff' }), isBuiltin: 1 },
        { name: 'Blue Steel', colors: JSON.stringify({ primary: '#2196F3', secondary: '#64B5F6', background: '#0D1B2A', text: '#E0E1DD' }), isBuiltin: 1 },
        { name: 'Purple Haze', colors: JSON.stringify({ primary: '#9C27B0', secondary: '#BA68C8', background: '#1A0033', text: '#F0E6FF' }), isBuiltin: 1 },
        { name: 'Green Machine', colors: JSON.stringify({ primary: '#4CAF50', secondary: '#81C784', background: '#0A1F0A', text: '#E8F5E9' }), isBuiltin: 1 },
        { name: 'Sunset Orange', colors: JSON.stringify({ primary: '#FF6B35', secondary: '#FFA500', background: '#1A0A00', text: '#FFF8F0' }), isBuiltin: 1 },
        { name: 'Cyberpunk', colors: JSON.stringify({ primary: '#FF00FF', secondary: '#00FFFF', background: '#0A0014', text: '#FFFFFF' }), isBuiltin: 1 }
    ];

    defaultThemes.forEach((theme, index) => {
        try {
            db.prepare(`
                INSERT OR IGNORE INTO themes (name, colors, is_builtin, is_active)
                VALUES (?, ?, ?, ?)
            `).run(theme.name, theme.colors, theme.isBuiltin, index === 0 ? 1 : 0);
        } catch (e) { /* Theme already exists */ }
    });

    // Create media folders table
    db.exec(`
        CREATE TABLE IF NOT EXISTS media_folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_path TEXT NOT NULL UNIQUE,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_scanned TIMESTAMP
        )
    `);

    // Migrate existing database (add new columns if they don't exist)
    try {
        db.exec('ALTER TABLE games ADD COLUMN is_favorite INTEGER DEFAULT 0');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN is_hidden INTEGER DEFAULT 0');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN launch_count INTEGER DEFAULT 0');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN last_played TIMESTAMP');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN total_play_time INTEGER DEFAULT 0');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN user_rating INTEGER');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN user_notes TEXT');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN has_vr_support INTEGER DEFAULT 0');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN dlc_count INTEGER DEFAULT 0');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN has_dlc INTEGER DEFAULT 0');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN last_update_check TIMESTAMP');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN update_available INTEGER DEFAULT 0');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN custom_launch_options TEXT');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN has_workshop_support INTEGER DEFAULT 0');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN workshop_id TEXT');
    } catch (e) { /* Column already exists */ }
    try {
        db.exec('ALTER TABLE games ADD COLUMN engine TEXT');
    } catch (e) { /* Column already exists */ }

    return db;
}

function createWindow() {
    if (isDebugMode) {
        console.log('='.repeat(60));
        console.log('[DEBUG] Debug mode ENABLED');
        console.log('[DEBUG] Command line arguments:', process.argv);
        console.log('[DEBUG] App path:', app.getAppPath());
        console.log('[DEBUG] User data path:', app.getPath('userData'));
        console.log('[DEBUG] Platform:', process.platform);
        console.log('[DEBUG] Electron version:', process.versions.electron);
        console.log('[DEBUG] Node version:', process.versions.node);
        console.log('[DEBUG] Chrome version:', process.versions.chrome);
        console.log('='.repeat(60));
    }

    mainWindow = new BrowserWindow({
        width: WINDOW_CONFIG.WIDTH,
        height: WINDOW_CONFIG.HEIGHT,
        minWidth: WINDOW_CONFIG.MIN_WIDTH,
        minHeight: WINDOW_CONFIG.MIN_HEIGHT,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true
        },
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        show: false,
        autoHideMenuBar: true,
        fullscreenable: true,
        hasShadow: true
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        // Open DevTools if in debug mode
        if (isDebugMode) {
            console.log('[DEBUG] Opening Developer Tools...');
            mainWindow.webContents.openDevTools();
        }
    });

    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
        windowEventListenersAttached = false; // Reset flag for next window
        if (scanningProcess) {
            scanningProcess.kill();
        }
    });
}

function createTray() {
    // Create system tray icon (Windows)
    if (isWindows) {
        const iconPath = path.join(__dirname, 'icon.png');

        // Check if icon exists before creating tray
        if (!fs.existsSync(iconPath)) {
            console.log('Tray icon not found at:', iconPath);
            console.log('Skipping system tray creation. Add icon.png to enable tray icon.');
            return;
        }

        try {
            tray = new Tray(iconPath);

            const contextMenu = Menu.buildFromTemplate([
                {
                    label: 'Show CoverFlow Launcher',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.show();
                            mainWindow.focus();
                        }
                    }
                },
                {
                    label: 'Scan for Games',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.show();
                            mainWindow.focus();
                            mainWindow.webContents.send('open-settings');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    click: () => {
                        app.isQuitting = true;
                        app.quit();
                    }
                }
            ]);

            tray.setToolTip('CoverFlow Game Launcher');
            tray.setContextMenu(contextMenu);

            tray.on('click', () => {
                if (mainWindow) {
                    if (mainWindow.isVisible()) {
                        mainWindow.hide();
                    } else {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                }
            });

            // Set up minimize to tray behavior (only if tray was successfully created and listeners not already attached)
            if (mainWindow && !windowEventListenersAttached) {
                mainWindow.on('minimize', (event) => {
                    event.preventDefault();
                    mainWindow.hide();
                });

                mainWindow.on('close', (event) => {
                    if (!app.isQuitting) {
                        event.preventDefault();
                        mainWindow.hide();
                        return false;
                    }
                });

                windowEventListenersAttached = true;
            }
        } catch (error) {
            console.error('Failed to create system tray:', error);
        }
    }
}

// Auto-updater configuration
function setupAutoUpdater() {
    // Configure auto-updater
    autoUpdater.autoDownload = false; // Don't auto-download, let user decide
    autoUpdater.autoInstallOnAppQuit = true; // Install when app quits

    // Disable in development mode
    if (isDev) {
        autoUpdater.updateConfigPath = null;
        console.log('[AUTO-UPDATE] Disabled in development mode');
        return;
    }

    // Log events for debugging
    autoUpdater.logger = require('electron-log');
    autoUpdater.logger.transports.file.level = 'debug'; // Changed to debug for more info
    autoUpdater.logger.transports.console.level = 'debug';

    // Log file location
    console.log('[AUTO-UPDATE] Log file location:', autoUpdater.logger.transports.file.getFile().path);

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
        console.log('[AUTO-UPDATE] Checking for updates...');
        if (mainWindow) {
            mainWindow.webContents.send('update-checking');
        }
    });

    autoUpdater.on('update-available', (info) => {
        console.log('[AUTO-UPDATE] Update available:', JSON.stringify(info, null, 2));
        if (mainWindow) {
            mainWindow.webContents.send('update-available', {
                version: info.version,
                releaseNotes: info.releaseNotes,
                releaseDate: info.releaseDate,
                files: info.files
            });
        }
    });

    autoUpdater.on('update-not-available', (info) => {
        console.log('[AUTO-UPDATE] Update not available. Current version:', info.version);
        if (mainWindow) {
            mainWindow.webContents.send('update-not-available', {
                version: info.version
            });
        }
    });

    autoUpdater.on('error', (err) => {
        console.error('[AUTO-UPDATE] Error:', err);
        console.error('[AUTO-UPDATE] Error stack:', err.stack);
        if (mainWindow) {
            mainWindow.webContents.send('update-error', {
                message: err.message,
                stack: err.stack
            });
        }
    });

    autoUpdater.on('download-progress', (progressObj) => {
        const logMessage = `[AUTO-UPDATE] Download progress: ${progressObj.percent.toFixed(2)}% - ` +
            `Speed: ${(progressObj.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s - ` +
            `Downloaded: ${(progressObj.transferred / 1024 / 1024).toFixed(2)} MB / ${(progressObj.total / 1024 / 1024).toFixed(2)} MB`;
        console.log(logMessage);

        if (mainWindow) {
            mainWindow.webContents.send('update-download-progress', {
                percent: progressObj.percent,
                bytesPerSecond: progressObj.bytesPerSecond,
                transferred: progressObj.transferred,
                total: progressObj.total
            });
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('[AUTO-UPDATE] Update downloaded:', info.version);
        if (mainWindow) {
            mainWindow.webContents.send('update-downloaded', {
                version: info.version
            });
        }
    });

    // Additional events for debugging
    autoUpdater.on('before-download', (info) => {
        console.log('[AUTO-UPDATE] Before download event:', JSON.stringify(info, null, 2));
    });

    // Check for updates on app startup (after a delay)
    safeSetTimeout(() => {
        console.log('[AUTO-UPDATE] Checking for updates on startup...');
        autoUpdater.checkForUpdates().catch(err => {
            console.error('[AUTO-UPDATE] Failed to check for updates:', err);
        });
    }, 5000); // Wait 5 seconds after app starts
}

app.whenReady().then(() => {
    if (isDebugMode) {
        console.log('[DEBUG] App ready - initializing...');
    }

    ensureDirectories();

    if (isDebugMode) {
        console.log('[DEBUG] Directories ensured');
    }

    createWindow();
    createTray();
    setupAutoUpdater();

    if (isDebugMode) {
        console.log('[DEBUG] Window and tray created');
    }

    // Initialize process tracker for accurate playtime monitoring
    // Wait a bit for the window to be ready
    safeSetTimeout(() => {
        if (isDebugMode) {
            console.log('[DEBUG] Initializing process tracker...');
        }
        initProcessTracker();

        // Start periodic session cleanup monitor
        startSessionCleanupMonitor();
    }, 2000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers

// Window controls for frameless window
ipcMain.on('minimize-window', () => {
    console.log('[WINDOW-CONTROLS] Minimize IPC received');
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.on('maximize-window', () => {
    console.log('[WINDOW-CONTROLS] Maximize IPC received');
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            console.log('[WINDOW-CONTROLS] Unmaximizing window');
            mainWindow.unmaximize();
        } else {
            console.log('[WINDOW-CONTROLS] Maximizing window');
            mainWindow.maximize();
        }
    }
});

ipcMain.on('close-window', () => {
    console.log('[WINDOW-CONTROLS] Close IPC received');
    if (mainWindow) {
        mainWindow.close();
    }
});

ipcMain.on('toggle-fullscreen', () => {
    console.log('[WINDOW-CONTROLS] Fullscreen IPC received');
    if (mainWindow) {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
});

// Auto-updater IPC handlers
ipcMain.handle('check-for-app-updates', async () => {
    try {
        if (isDev) {
            return { available: false, message: 'Auto-update disabled in development mode' };
        }
        const result = await autoUpdater.checkForUpdates();
        return {
            available: result && result.updateInfo,
            updateInfo: result ? result.updateInfo : null
        };
    } catch (error) {
        console.error('[AUTO-UPDATE] Error checking for updates:', error);
        return { available: false, error: error.message };
    }
});

ipcMain.handle('download-app-update', async () => {
    try {
        if (isDev) {
            return { success: false, message: 'Auto-update disabled in development mode' };
        }

        console.log('[AUTO-UPDATE] Starting download...');
        console.log('[AUTO-UPDATE] Update info available:', autoUpdater.updateInfo ? 'Yes' : 'No');

        if (autoUpdater.updateInfo) {
            console.log('[AUTO-UPDATE] Update info:', JSON.stringify(autoUpdater.updateInfo, null, 2));
        }

        const result = await autoUpdater.downloadUpdate();
        console.log('[AUTO-UPDATE] Download initiated, result:', result);

        return { success: true, downloadPath: result };
    } catch (error) {
        console.error('[AUTO-UPDATE] Error downloading update:', error);
        console.error('[AUTO-UPDATE] Error stack:', error.stack);
        return { success: false, error: error.message, stack: error.stack };
    }
});

ipcMain.handle('install-app-update', async () => {
    try {
        if (isDev) {
            return { success: false, message: 'Auto-update disabled in development mode' };
        }
        // This will quit the app and install the update
        autoUpdater.quitAndInstall(false, true);
        return { success: true };
    } catch (error) {
        console.error('[AUTO-UPDATE] Error installing update:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-app-version', async () => {
    return app.getVersion();
});

// Get all games from database
ipcMain.handle('get-games', async () => {
    try {
        const db = initDatabase();
        const games = db.prepare('SELECT * FROM games ORDER BY platform, title').all();
        db.close();

        // Parse JSON fields and fix image paths
        const parsedGames = games.map(game => {
            const parsed = { ...game };

            // Convert SQLite boolean integers to JavaScript booleans
            parsed.is_favorite = Boolean(game.is_favorite);
            parsed.is_hidden = Boolean(game.is_hidden);
            parsed.has_vr_support = Boolean(game.has_vr_support);

            if (game.genres) {
                try {
                    parsed.genres = JSON.parse(game.genres);
                } catch (e) {
                    parsed.genres = [];
                }
            }
            if (game.metadata) {
                try {
                    const meta = JSON.parse(game.metadata);
                    Object.assign(parsed, meta);
                } catch (e) {
                    console.error('Error parsing game metadata:', e.message);
                }
            }

            // Convert relative image paths to absolute paths
            if (parsed.icon_path && !parsed.icon_path.startsWith('http')) {
                // Remove leading 'game_data/' if present to avoid duplication
                let iconPath = parsed.icon_path.replace(/^game_data[\/\\]/, '');
                parsed.icon_path = path.join(gameDataPath, iconPath).replace(/\\/g, '/');
            }
            if (parsed.boxart_path && !parsed.boxart_path.startsWith('http')) {
                // Remove leading 'game_data/' if present to avoid duplication
                let boxartPath = parsed.boxart_path.replace(/^game_data[\/\\]/, '');
                parsed.boxart_path = path.join(gameDataPath, boxartPath).replace(/\\/g, '/');
            }
            if (parsed.exe_icon_path && !parsed.exe_icon_path.startsWith('http')) {
                // Remove leading 'game_data/' if present to avoid duplication
                let exeIconPath = parsed.exe_icon_path.replace(/^game_data[\/\\]/, '');
                parsed.exe_icon_path = path.join(gameDataPath, exeIconPath).replace(/\\/g, '/');
            }
            if (parsed.header_path && !parsed.header_path.startsWith('http')) {
                // Remove leading 'game_data/' if present to avoid duplication
                let headerPath = parsed.header_path.replace(/^game_data[\/\\]/, '');
                parsed.header_path = path.join(gameDataPath, headerPath).replace(/\\/g, '/');
            }

            return parsed;
        });

        return {
            success: true,
            games: parsedGames,
            total_games: parsedGames.length
        };
    } catch (error) {
        console.error('Error getting games:', error);
        return {
            success: false,
            error: error.message,
            games: []
        };
    }
});

// Get games count
ipcMain.handle('get-games-count', async () => {
    try {
        const db = initDatabase();
        const total = db.prepare('SELECT COUNT(*) as count FROM games').get().count;
        const platforms = db.prepare(`
            SELECT platform, COUNT(*) as count
            FROM games
            GROUP BY platform
        `).all();
        db.close();

        const platformCounts = {};
        platforms.forEach(p => {
            platformCounts[p.platform] = p.count;
        });

        return {
            success: true,
            total,
            platforms: platformCounts
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            total: 0,
            platforms: {}
        };
    }
});

// Start game scan
ipcMain.handle('start-scan', async () => {
    if (scanStatus.scanning) {
        return { success: false, error: 'Scan already in progress' };
    }

    scanStatus = {
        scanning: true,
        progress: 0,
        total_games: 0,
        current_platform: null,
        message: 'Starting scan...',
        error: null
    };

    // Set taskbar progress to indeterminate (Windows)
    if (isWindows && mainWindow) {
        mainWindow.setProgressBar(TASKBAR_PROGRESS.INDETERMINATE);
    }

    // Find Python executable
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const scannerPath = path.join(appPath, 'gameinfodownload-main', 'game_scanner.py');

    // Check if scanner file exists
    if (!fs.existsSync(scannerPath)) {
        const error = 'Game scanner not found. Please ensure gameinfodownload-main directory exists.';
        scanStatus.scanning = false;
        scanStatus.error = error;
        return { success: false, error };
    }

    return new Promise((resolve) => {
        try {
            scanningProcess = spawn(pythonCmd, [scannerPath], {
                cwd: path.join(appPath, 'gameinfodownload-main'),
                env: {
                    ...process.env,
                    GAME_DATA_DIR: gameDataPath
                }
            });
        } catch (error) {
            scanStatus.scanning = false;
            scanStatus.error = 'Failed to start Python: ' + error.message;
            resolve({ success: false, error: scanStatus.error });
            return;
        }

        scanningProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('Scanner:', output);

            // Parse output for progress updates
            if (output.includes('Scanning')) {
                if (output.includes('STEAM')) {
                    scanStatus.current_platform = 'steam';
                    scanStatus.progress = SCAN_PROGRESS.STEAM;
                } else if (output.includes('EPIC')) {
                    scanStatus.current_platform = 'epic';
                    scanStatus.progress = SCAN_PROGRESS.EPIC;
                } else if (output.includes('XBOX')) {
                    scanStatus.current_platform = 'xbox';
                    scanStatus.progress = SCAN_PROGRESS.XBOX;
                }

                // Update taskbar progress (Windows)
                if (isWindows && mainWindow) {
                    mainWindow.setProgressBar(scanStatus.progress);
                }

                scanStatus.message = output.trim();
                mainWindow?.webContents.send('scan-progress', scanStatus);
            }
        });

        scanningProcess.stderr.on('data', (data) => {
            console.error('Scanner error:', data.toString());
        });

        scanningProcess.on('error', (error) => {
            console.error('Failed to start scanner:', error);
            scanStatus.scanning = false;
            scanStatus.error = `Failed to start Python. Make sure Python is installed and in PATH. Error: ${error.message}`;
            mainWindow?.webContents.send('scan-complete', scanStatus);
            scanningProcess = null;
        });

        scanningProcess.on('close', (code) => {
            scanStatus.scanning = false;
            scanStatus.progress = SCAN_PROGRESS.COMPLETE;

            // Clear taskbar progress (Windows)
            if (isWindows && mainWindow) {
                mainWindow.setProgressBar(TASKBAR_PROGRESS.CLEAR);
            }

            if (code === 0) {
                // Load games into database
                loadGamesFromJSON().then(count => {
                    scanStatus.total_games = count;
                    scanStatus.message = `Scan complete! Found ${count} games`;
                    mainWindow?.webContents.send('scan-complete', scanStatus);

                    // Windows notification
                    if (isWindows && Notification.isSupported()) {
                        const iconPath = path.join(__dirname, 'icon.png');
                        const notificationOptions = {
                            title: 'Game Scan Complete',
                            body: `Found ${count} games across all platforms`
                        };
                        // Only add icon if it exists
                        if (fs.existsSync(iconPath)) {
                            notificationOptions.icon = iconPath;
                        }
                        const notification = new Notification(notificationOptions);
                        notification.show();
                    }

                    // Flash taskbar to get attention (Windows)
                    if (isWindows && mainWindow && !mainWindow.isFocused()) {
                        mainWindow.flashFrame(true);
                        mainWindow.once('focus', () => {
                            mainWindow.flashFrame(false);
                        });
                    }
                }).catch(error => {
                    console.error('Error loading games from JSON:', error);
                    scanStatus.error = `Failed to load games: ${error.message}`;
                    mainWindow?.webContents.send('scan-complete', scanStatus);
                });
            } else {
                scanStatus.error = `Scanner exited with code ${code}`;
                scanStatus.message = 'Scan failed';

                // Windows error notification
                if (isWindows && Notification.isSupported()) {
                    const iconPath = path.join(__dirname, 'icon.png');
                    const notificationOptions = {
                        title: 'Game Scan Failed',
                        body: scanStatus.error
                    };
                    // Only add icon if it exists
                    if (fs.existsSync(iconPath)) {
                        notificationOptions.icon = iconPath;
                    }
                    const notification = new Notification(notificationOptions);
                    notification.show();
                }
                mainWindow?.webContents.send('scan-complete', scanStatus);
            }

            scanningProcess = null;
        });

        // Return immediately with success - scan runs in background
        resolve({ success: true, message: 'Scan started' });
    });
});

// Get scan status
ipcMain.handle('get-scan-status', async () => {
    return scanStatus;
});

// Load games from JSON into database
async function loadGamesFromJSON() {
    const jsonPath = path.join(gameDataPath, 'games_export.json');

    if (!fs.existsSync(jsonPath)) {
        console.log('No games export file found');
        return 0;
    }

    try {
        const fileContent = await fs.promises.readFile(jsonPath, 'utf8');
        const data = JSON.parse(fileContent);
        const games = data.games || [];

        if (!Array.isArray(games)) {
            console.error('Invalid games data format: expected array');
            return 0;
        }

    const db = initDatabase();
    const insert = db.prepare(`
        INSERT OR REPLACE INTO games (
            platform, title, app_id, package_name, install_directory,
            launch_command, description, short_description, long_description,
            developer, publisher, release_date, icon_path, boxart_path,
            exe_icon_path, header_path,
            size_on_disk, last_updated, genres, metadata, has_vr_support,
            has_workshop_support, workshop_id, engine, updated_at
        ) VALUES (
            @platform, @title, @app_id, @package_name, @install_directory,
            @launch_command, @description, @short_description, @long_description,
            @developer, @publisher, @release_date, @icon_path, @boxart_path,
            @exe_icon_path, @header_path,
            @size_on_disk, @last_updated, @genres, @metadata, @has_vr_support,
            @has_workshop_support, @workshop_id, @engine, datetime('now')
        )
    `);

    const insertMany = db.transaction((games) => {
        for (const game of games) {
            const exeIconPath = game.exe_icon_path || '';
            const headerPath = game.header_path || '';

            // Log exe icon extraction status
            if (exeIconPath) {
                console.log(`[EXE_ICON] [OK] Found exe icon for "${game.title}": ${exeIconPath}`);
            } else {
                console.log(`[EXE_ICON] [NOT FOUND] No exe icon for "${game.title}"`);
            }

            insert.run({
                platform: game.platform || '',
                title: game.title || '',
                app_id: game.app_id || '',
                package_name: game.package_name || '',
                install_directory: game.install_directory || '',
                launch_command: game.launch_command || '',
                description: game.description || '',
                short_description: game.short_description || '',
                long_description: game.long_description || '',
                developer: game.developer || '',
                publisher: game.publisher || '',
                release_date: game.release_date || '',
                icon_path: game.icon_path || '',
                boxart_path: game.boxart_path || '',
                exe_icon_path: exeIconPath,
                header_path: headerPath,
                size_on_disk: game.size_on_disk || 0,
                last_updated: game.last_updated || 0,
                genres: JSON.stringify(game.genres || []),
                metadata: JSON.stringify({}),
                has_vr_support: game.has_vr_support || 0,
                has_workshop_support: game.has_workshop_support || 0,
                workshop_id: game.workshop_id || null,
                engine: game.engine || null
            });
        }
    });

        insertMany(games);
        db.close();

        return games.length;
    } catch (error) {
        console.error('Error loading games from JSON:', error);
        return 0;
    }
}

// Get image path (for serving local images)
ipcMain.handle('get-image-path', async (event, relativePath) => {
    // Prevent path traversal attacks
    const normalizedPath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(gameDataPath, normalizedPath);

    // Ensure the resolved path is still within gameDataPath
    const resolvedPath = path.resolve(fullPath);
    const resolvedGameDataPath = path.resolve(gameDataPath);

    if (!resolvedPath.startsWith(resolvedGameDataPath)) {
        console.error('Path traversal attempt detected:', relativePath);
        return null;
    }

    if (fs.existsSync(fullPath)) {
        return fullPath;
    }
    return null;
});

// Get app data path (for image loading in renderer)
ipcMain.handle('get-app-path', async () => {
    return {
        appPath: appPath,
        gameDataPath: gameDataPath,
        userDataPath: app.getPath('userData')
    };
});

// Track active game sessions
let activeGameSessions = new Map(); // gameId -> sessionId

// Process tracker for accurate playtime monitoring
let processTrackerService = null;
let processTrackerReady = false;

/**
 * Initialize the process tracker service
 */
function initProcessTracker() {
    if (processTrackerService) {
        console.log('[PROCESS_TRACKER] Already initialized');
        return;
    }

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const trackerPath = path.join(appPath, 'gameinfodownload-main', 'launchers', 'process_tracker_service.py');

    // Check if tracker file exists
    if (!fs.existsSync(trackerPath)) {
        console.error('[PROCESS_TRACKER] Service file not found:', trackerPath);
        return;
    }

    try {
        processTrackerService = spawn(pythonCmd, [trackerPath], {
            cwd: path.join(appPath, 'gameinfodownload-main', 'launchers'),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        console.log('[PROCESS_TRACKER] Service started');

        // Handle stdout (JSON responses and notifications)
        processTrackerService.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (!line.trim()) return;

                try {
                    const message = JSON.parse(line.trim());

                    if (message.type === 'notification') {
                        handleProcessTrackerNotification(message);
                    } else if (message.success !== undefined) {
                        // This is a response to a command
                        // For now, just log it
                        if (message.data && message.data.message === 'ready') {
                            processTrackerReady = true;
                            console.log('[PROCESS_TRACKER] Service ready');
                        }
                    }
                } catch (e) {
                    console.error('[PROCESS_TRACKER] Failed to parse message:', line, e);
                }
            });
        });

        // Handle stderr (logs)
        processTrackerService.stderr.on('data', (data) => {
            console.log('[PROCESS_TRACKER]', data.toString().trim());
        });

        // Handle process exit
        processTrackerService.on('error', (error) => {
            console.error('[PROCESS_TRACKER] Failed to start:', error);
            processTrackerService = null;
            processTrackerReady = false;
        });

        processTrackerService.on('close', (code) => {
            console.log(`[PROCESS_TRACKER] Service exited with code ${code}`);
            processTrackerService = null;
            processTrackerReady = false;
        });

    } catch (error) {
        console.error('[PROCESS_TRACKER] Error starting service:', error);
        processTrackerService = null;
        processTrackerReady = false;
    }
}

/**
 * Send command to process tracker service
 */
function sendProcessTrackerCommand(command, params = {}) {
    return new Promise((resolve, reject) => {
        if (!processTrackerService || !processTrackerReady) {
            reject(new Error('Process tracker not ready'));
            return;
        }

        // Check if stdin is still writable
        if (!processTrackerService.stdin ||
            processTrackerService.stdin.destroyed ||
            !processTrackerService.stdin.writable) {
            reject(new Error('Process tracker stdin not writable'));
            return;
        }

        const commandObj = {
            command,
            params,
            timestamp: Date.now()
        };

        try {
            processTrackerService.stdin.write(JSON.stringify(commandObj) + '\n');
            // For simplicity, resolve immediately
            // In production, you'd want to track request IDs and wait for responses
            resolve({ success: true });
        } catch (error) {
            // Handle EPIPE and other write errors gracefully
            console.error('[PROCESS_TRACKER] Error writing command:', error.code || error.message);
            reject(error);
        }
    });
}

/**
 * Handle notifications from process tracker
 */
function handleProcessTrackerNotification(message) {
    console.log('[PROCESS_TRACKER] Notification:', message.event, message.data);

    if (message.event === 'process_ended') {
        const { session_id, runtime } = message.data;

        // Find the game ID for this session
        let gameId = null;
        for (const [gId, sId] of activeGameSessions.entries()) {
            if (sId === session_id) {
                gameId = gId;
                break;
            }
        }

        // RESTORE WINDOW ON GAME CLOSE
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
        }

        if (gameId) {
            console.log(`[PROCESS_TRACKER] Game ${gameId} process ended, runtime: ${runtime}s`);

            // Update the database with accurate runtime
            try {
                const db = initDatabase();

                // Update session with accurate duration
                db.prepare(`
                    UPDATE game_sessions
                    SET end_time = CURRENT_TIMESTAMP,
                        duration = ?
                    WHERE id = ?
                `).run(runtime, session_id);

                // Update total play time
                db.prepare(`
                    UPDATE games
                    SET total_play_time = total_play_time + ?
                    WHERE id = ?
                `).run(runtime, gameId);

                db.close();

                // Remove from active sessions
                activeGameSessions.delete(gameId);

                console.log(`[PROCESS_TRACKER] Updated playtime for game ${gameId}: +${runtime}s`);
            } catch (error) {
                console.error('[PROCESS_TRACKER] Error updating playtime:', error);
            }
        }
    }
}

/**
 * Shutdown process tracker service
 */
function shutdownProcessTracker() {
    if (processTrackerService) {
        console.log('[PROCESS_TRACKER] Shutting down...');

        // Set ready flag to false BEFORE attempting shutdown to prevent new commands
        const wasReady = processTrackerReady;
        processTrackerReady = false;

        try {
            // Only try to send shutdown command if the process was ready and stdin is writable
            if (wasReady &&
                processTrackerService.stdin &&
                !processTrackerService.stdin.destroyed &&
                processTrackerService.stdin.writable) {

                const commandObj = {
                    command: 'shutdown',
                    params: {},
                    timestamp: Date.now()
                };

                processTrackerService.stdin.write(JSON.stringify(commandObj) + '\n', (err) => {
                    if (err) {
                        console.log('[PROCESS_TRACKER] Shutdown command write failed (process may already be closed):', err.code || err.message);
                    }
                });
            }

            // Kill the process after a short delay to allow graceful shutdown
            safeSetTimeout(() => {
                if (processTrackerService && !processTrackerService.killed) {
                    console.log('[PROCESS_TRACKER] Force killing process');
                    processTrackerService.kill();
                }
            }, 1000);
        } catch (error) {
            console.log('[PROCESS_TRACKER] Error during shutdown (expected if already closed):', error.code || error.message);
            // Force kill if anything goes wrong
            if (processTrackerService && !processTrackerService.killed) {
                processTrackerService.kill();
            }
        }
    }
}

// Internal helper to end a game session
function endGameSessionInternal(gameId, sessionId) {
    try {
        const db = initDatabase();

        // Update session end time and calculate duration
        db.prepare(`
            UPDATE game_sessions
            SET end_time = CURRENT_TIMESTAMP,
                duration = (julianday(CURRENT_TIMESTAMP) - julianday(start_time)) * 86400
            WHERE id = ?
        `).run(sessionId);

        // Get duration and update total play time
        const session = db.prepare('SELECT duration FROM game_sessions WHERE id = ?').get(sessionId);

        if (session && session.duration) {
            db.prepare(`
                UPDATE games
                SET total_play_time = total_play_time + ?
                WHERE id = ?
            `).run(Math.floor(session.duration), gameId);
            console.log(`[PLAYTIME] Ended session ${sessionId}, duration: ${Math.floor(session.duration)}s`);
        }

        db.close();
        activeGameSessions.delete(gameId);
        return true;
    } catch (error) {
        console.error(`[PLAYTIME] Error ending session ${sessionId}:`, error);
        return false;
    }
}

// End all active sessions (called on app close)
function endAllActiveSessions() {
    console.log(`[PLAYTIME] Ending ${activeGameSessions.size} active session(s)`);
    for (const [gameId, sessionId] of activeGameSessions.entries()) {
        endGameSessionInternal(gameId, sessionId);
    }
}

/**
 * Periodic cleanup check for orphaned sessions
 * This runs every hour to verify all tracked sessions are still valid
 * Provides a safety net in case process tracker misses a game close
 */
function checkOrphanedSessions() {
    if (activeGameSessions.size === 0) {
        return; // No sessions to check
    }

    console.log(`[PLAYTIME] Checking ${activeGameSessions.size} active session(s) for orphans...`);

    try {
        const db = initDatabase();
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;

        for (const [gameId, sessionId] of activeGameSessions.entries()) {
            // Get session start time from database
            const session = db.prepare(`
                SELECT start_time FROM game_sessions
                WHERE id = ? AND end_time IS NULL
            `).get(sessionId);

            if (!session) {
                // Session doesn't exist or already ended - clean up
                console.log(`[PLAYTIME] Orphaned session detected for game ${gameId}, cleaning up`);
                activeGameSessions.delete(gameId);
                continue;
            }

            // If session has been running for more than 12 hours, log a warning
            // but don't auto-end (some games can genuinely run that long)
            const sessionStart = new Date(session.start_time).getTime();
            const duration = now - sessionStart;

            if (duration > 12 * ONE_HOUR) {
                console.warn(`[PLAYTIME] Long-running session detected: ${Math.floor(duration / ONE_HOUR)} hours for game ${gameId}`);
                console.warn(`[PLAYTIME] Session will continue tracking. Close the game to end the session.`);
            }
        }

        db.close();
    } catch (error) {
        console.error('[PLAYTIME] Error during orphaned session check:', error);
    }
}

/**
 * Start periodic session cleanup checks
 */
function startSessionCleanupMonitor() {
    if (sessionCleanupInterval) {
        return; // Already running
    }

    // Check every hour for orphaned sessions
    sessionCleanupInterval = safeSetInterval(() => {
        checkOrphanedSessions();
    }, 60 * 60 * 1000); // Every 60 minutes

    console.log('[PLAYTIME] Session cleanup monitor started (checks every 60 minutes)');
}

/**
 * Stop periodic session cleanup checks
 */
function stopSessionCleanupMonitor() {
    if (sessionCleanupInterval) {
        safeClearInterval(sessionCleanupInterval);
        sessionCleanupInterval = null;
        console.log('[PLAYTIME] Session cleanup monitor stopped');
    }
}

// Launch game with session tracking
ipcMain.handle('launch-game', async (event, launchCommand, gameId) => {
    try {
        // Start game session if gameId provided
        if (gameId) {
            // MINIMIZE WINDOW ON GAME LAUNCH
            if (mainWindow) {
                mainWindow.minimize();
            }

            const db = initDatabase();

            // Check if there's already an active session for this game
            if (activeGameSessions.has(gameId)) {
                console.log(`[PLAYTIME] Game ${gameId} already has an active session, ending it first`);
                // End the previous session before starting a new one
                const oldSessionId = activeGameSessions.get(gameId);

                // Stop process tracking for old session
                if (processTrackerReady) {
                    try {
                        await sendProcessTrackerCommand('stop_tracking', { session_id: oldSessionId });
                    } catch (e) {
                        console.error('[PROCESS_TRACKER] Error stopping old session:', e);
                    }
                }

                db.prepare(`
                    UPDATE game_sessions
                    SET end_time = CURRENT_TIMESTAMP,
                        duration = (julianday(CURRENT_TIMESTAMP) - julianday(start_time)) * 86400
                    WHERE id = ?
                `).run(oldSessionId);

                const oldSession = db.prepare('SELECT duration FROM game_sessions WHERE id = ?').get(oldSessionId);
                if (oldSession && oldSession.duration) {
                    db.prepare(`
                        UPDATE games
                        SET total_play_time = total_play_time + ?
                        WHERE id = ?
                    `).run(Math.floor(oldSession.duration), gameId);
                }
            }

            // Get game details for process tracking
            const game = db.prepare('SELECT title, install_directory FROM games WHERE id = ?').get(gameId);

            const stmt = db.prepare(`
                INSERT INTO game_sessions (game_id, start_time)
                VALUES (?, CURRENT_TIMESTAMP)
            `);
            const result = stmt.run(gameId);
            const sessionId = Number(result.lastInsertRowid);

            // Update launch count and last played
            db.prepare(`
                UPDATE games
                SET launch_count = launch_count + 1,
                    last_played = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(gameId);

            db.close();

            // Store active session with timestamp
            activeGameSessions.set(gameId, sessionId);
            console.log(`[PLAYTIME] Started session ${sessionId} for game ${gameId}`);

            // Start process tracking if available
            if (processTrackerReady && game) {
                // Determine delay based on game type
                // Unreal Engine games with anticheat need more time for the preloader to finish
                const gameTitleLower = game.title.toLowerCase();
                const isUnrealGame = ['fortnite', 'valorant', 'dead by daylight', 'arc raiders', 'the finals', 'escape from tarkov']
                    .some(unrealGame => gameTitleLower.includes(unrealGame));

                const trackingDelay = isUnrealGame ? 60000 : 3000; // 60 seconds for Unreal, 3 seconds for others

                console.log(`[PROCESS_TRACKER] Waiting ${trackingDelay / 1000} seconds before tracking ${game.title}${isUnrealGame ? ' (Unreal Engine game with anticheat)' : ''}`);

                // Wait for the game to launch (longer for Unreal Engine games)
                safeSetTimeout(async () => {
                    try {
                        // Filter out common utility exes (defined outside block for scope)
                        const skipExes = [
                            'createdump.exe', 'unins000.exe', 'uninstall.exe', 'setup.exe',
                            'updater.exe', 'launcher.exe', 'crash_reporter.exe', 'crashhandler.exe',
                            'epicgameslauncher.exe', 'epicwebhelper.exe'
                        ];

                        // Known anti-cheat and launcher executables that spawn the actual game
                        const antiCheatLaunchers = [
                            'easyanticheat.exe',
                            'battleye.exe',
                            'beclient.exe',
                            'ricochetanticheat.exe',
                            'vanguard.exe',
                            'faceit.exe',
                            'nprotect.exe'
                        ];

                        // Known game executable patterns for specific games
                        // Format: 'game name': ['actual_game.exe', 'launcher.exe']
                        const knownGameExes = {
                            'fortnite': ['FortniteClient-Win64-Shipping.exe', 'FortniteLauncher.exe', 'FortniteClient-Win64-Shipping_EAC_EOS.exe'],
                            'apex legends': ['r5apex.exe'],
                            'valorant': ['VALORANT-Win64-Shipping.exe', 'VALORANT.exe'],
                            'call of duty': ['cod.exe', 'modernwarfare.exe', 'blackops.exe'],
                            'overwatch': ['Overwatch.exe'],
                            'league of legends': ['League of Legends.exe'],
                            'arc raiders': ['PioneerGame.exe', 'ArcRaiders.exe'],
                            'the finals': ['Discovery.exe'],
                            'rainbow six siege': ['RainbowSix.exe', 'R6S.exe'],
                            'escape from tarkov': ['EscapeFromTarkov.exe'],
                            'hunt showdown': ['HuntGame.exe'],
                            'dead by daylight': ['DeadByDaylight-Win64-Shipping.exe']
                        };

                        // Games that use Unreal Engine and have anticheat preloaders
                        // These need a longer delay before tracking starts
                        const unrealEngineGames = [
                            'fortnite', 'valorant', 'dead by daylight', 'arc raiders',
                            'the finals', 'escape from tarkov'
                        ];

                        // Try to find exe path in install directory
                        let exePath = '';
                        if (game.install_directory && fs.existsSync(game.install_directory)) {

                            // Helper function to recursively find exe files
                            const findExeFiles = (dir, depth = 0, maxDepth = 3) => {
                                if (depth > maxDepth || !fs.existsSync(dir)) return [];

                                const results = [];
                                try {
                                    const entries = fs.readdirSync(dir, { withFileTypes: true });

                                    for (const entry of entries) {
                                        const fullPath = path.join(dir, entry.name);

                                        if (entry.isDirectory()) {
                                            // Recurse into subdirectories
                                            results.push(...findExeFiles(fullPath, depth + 1, maxDepth));
                                        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
                                            const stats = fs.statSync(fullPath);
                                            results.push({
                                                name: entry.name,
                                                path: fullPath,
                                                size: stats.size
                                            });
                                        }
                                    }
                                } catch (error) {
                                    // Skip directories we can't read
                                    console.log(`[PROCESS_TRACKER] Error reading directory ${dir}:`, error.message);
                                }

                                return results;
                            };

                            // Look for known game executables first
                            const gameTitleLower = game.title.toLowerCase();
                            for (const [gameName, exeNames] of Object.entries(knownGameExes)) {
                                if (gameTitleLower.includes(gameName)) {
                                    console.log(`[PROCESS_TRACKER] Detected ${gameName}, looking for known executables`);
                                    for (const exeName of exeNames) {
                                        const allExeFiles = findExeFiles(game.install_directory);
                                        const matchingExe = allExeFiles.find(f => f.name.toLowerCase() === exeName.toLowerCase());
                                        if (matchingExe) {
                                            exePath = matchingExe.path;
                                            console.log(`[PROCESS_TRACKER] Found known executable: ${exePath}`);
                                            break;
                                        }
                                    }
                                    if (exePath) break;
                                }
                            }

                            // If no known executable found, search recursively
                            if (!exePath) {
                                console.log(`[PROCESS_TRACKER] Searching for executable in ${game.install_directory}`);
                                const allExeFiles = findExeFiles(game.install_directory);

                                // Filter out utility exes
                                const gameExeFiles = allExeFiles.filter(f =>
                                    !skipExes.includes(f.name.toLowerCase())
                                );

                                if (gameExeFiles.length > 0) {
                                    // Prefer the largest exe (games are usually larger than utilities)
                                    gameExeFiles.sort((a, b) => b.size - a.size);
                                    exePath = gameExeFiles[0].path;
                                    console.log(`[PROCESS_TRACKER] Found executable by size: ${exePath}`);
                                }
                            }
                        }

                        if (exePath) {
                            console.log(`[PROCESS_TRACKER] Starting tracking for ${game.title} at ${exePath}`);

                            // Extract exe name for process tracking
                            const exeName = path.basename(exePath);

                            // Check if this is likely an anti-cheat launcher
                            const isAntiCheat = antiCheatLaunchers.includes(exeName.toLowerCase());

                            // For known games, also try to track by process name
                            // This helps when anti-cheat launchers spawn the actual game
                            const trackingOptions = {
                                session_id: sessionId,
                                exe_path: exePath,
                                game_name: game.title,
                                track_children: true // Enable child process tracking
                            };

                            // If we know the actual game exe names, add them for tracking
                            const gameTitleLower = game.title.toLowerCase();
                            for (const [gameName, exeNames] of Object.entries(knownGameExes)) {
                                if (gameTitleLower.includes(gameName)) {
                                    // Add all possible exe names for this game
                                    trackingOptions.process_names = exeNames.map(name => name.toLowerCase());
                                    console.log(`[PROCESS_TRACKER] Will also track processes: ${exeNames.join(', ')}`);
                                    break;
                                }
                            }

                            // If it's an anti-cheat launcher, give it more time to spawn the game
                            if (isAntiCheat) {
                                console.log(`[PROCESS_TRACKER] Detected anti-cheat launcher, will monitor for child processes`);
                            }

                            await sendProcessTrackerCommand('start_tracking', trackingOptions);
                        } else {
                            // Even if we couldn't find the exe path, try tracking by process name
                            // This is useful for games launched through stores/launchers
                            const gameTitleLower = game.title.toLowerCase();
                            let processNames = null;

                            for (const [gameName, exeNames] of Object.entries(knownGameExes)) {
                                if (gameTitleLower.includes(gameName)) {
                                    processNames = exeNames.map(name => name.toLowerCase());
                                    break;
                                }
                            }

                            if (processNames && processNames.length > 0) {
                                console.log(`[PROCESS_TRACKER] Could not find exe path, but will track by process names: ${processNames.join(', ')}`);
                                await sendProcessTrackerCommand('start_tracking', {
                                    session_id: sessionId,
                                    game_name: game.title,
                                    process_names: processNames,
                                    track_children: true
                                });
                            } else {
                                console.log(`[PROCESS_TRACKER] Could not find exe for ${game.title}, tracking disabled`);
                            }
                        }
                    } catch (error) {
                        console.error('[PROCESS_TRACKER] Error starting tracking:', error);
                    }
                }, trackingDelay); // Wait based on game type (3s normal, 60s for Unreal Engine)
            }

            // Note: No auto-end timeout - tracking continues until game process ends or app closes
        }

        await shell.openExternal(launchCommand);
        return { success: true, sessionId: activeGameSessions.get(gameId) };
    } catch (error) {
        console.error('Error launching game:', error);
        return { success: false, error: error.message };
    }
});

// Open media file in default Windows app
ipcMain.handle('open-media-file', async (event, filePath) => {
    try {
        console.log(`[MEDIA] Opening file: ${filePath}`);

        // Validate file exists
        if (!fs.existsSync(filePath)) {
            console.error(`[MEDIA] File not found: ${filePath}`);
            return { success: false, error: 'File not found' };
        }

        // Use shell.openPath to open with default app
        const result = await shell.openPath(filePath);

        if (result) {
            // result is an error string if there was an error, empty string if success
            console.error(`[MEDIA] Error opening file: ${result}`);
            return { success: false, error: result };
        }

        console.log(`[MEDIA] Successfully opened: ${filePath}`);
        return { success: true };
    } catch (error) {
        console.error('[MEDIA] Error opening media file:', error);
        return { success: false, error: error.message };
    }
});

// End game session
ipcMain.handle('end-game-session', async (event, gameId) => {
    try {
        const sessionId = activeGameSessions.get(gameId);
        if (!sessionId) {
            return { success: false, error: 'No active session found' };
        }

        const result = endGameSessionInternal(gameId, sessionId);
        return { success: result };
    } catch (error) {
        console.error('Error ending game session:', error);
        return { success: false, error: error.message };
    }
});

// Get active game sessions
ipcMain.handle('get-active-sessions', async () => {
    try {
        const sessions = [];
        const db = initDatabase();

        for (const [gameId, sessionId] of activeGameSessions.entries()) {
            const game = db.prepare('SELECT title FROM games WHERE id = ?').get(gameId);
            const session = db.prepare('SELECT start_time FROM game_sessions WHERE id = ?').get(sessionId);

            if (game && session) {
                const duration = Math.floor((Date.now() - new Date(session.start_time).getTime()) / 1000);
                sessions.push({
                    gameId,
                    sessionId,
                    title: game.title,
                    startTime: session.start_time,
                    currentDuration: duration
                });
            }
        }

        db.close();
        return { success: true, sessions };
    } catch (error) {
        console.error('Error getting active sessions:', error);
        return { success: false, error: error.message, sessions: [] };
    }
});

// Get play time stats
ipcMain.handle('get-play-time', async (event, gameId) => {
    try {
        const db = initDatabase();
        const stats = db.prepare(`
            SELECT
                total_play_time,
                launch_count,
                last_played,
                (SELECT COUNT(*) FROM game_sessions WHERE game_id = ?) as session_count
            FROM games
            WHERE id = ?
        `).get(gameId, gameId);
        db.close();

        if (stats) {
            return {
                success: true,
                stats: {
                    total_play_time: stats.total_play_time || 0,
                    launch_count: stats.launch_count || 0,
                    last_played: stats.last_played,
                    session_count: stats.session_count || 0,
                    average_session_time: stats.total_play_time / Math.max(stats.session_count, 1)
                }
            };
        }
        return { success: false, error: 'Game not found' };
    } catch (error) {
        console.error('Error getting play time:', error);
        return { success: false, error: error.message };
    }
});

// Toggle favorite
ipcMain.handle('toggle-favorite', async (event, gameId) => {
    const db = initDatabase();
    try {
        const game = db.prepare('SELECT is_favorite FROM games WHERE id = ?').get(gameId);

        if (game) {
            const newStatus = game.is_favorite ? 0 : 1;
            db.prepare('UPDATE games SET is_favorite = ? WHERE id = ?').run(newStatus, gameId);
            return { success: true, is_favorite: Boolean(newStatus) };
        }

        return { success: false, error: 'Game not found' };
    } catch (error) {
        console.error('Error toggling favorite:', error);
        return { success: false, error: error.message };
    } finally {
        db.close();
    }
});

// Toggle hidden
ipcMain.handle('toggle-hidden', async (event, gameId) => {
    const db = initDatabase();
    try {
        const game = db.prepare('SELECT is_hidden FROM games WHERE id = ?').get(gameId);

        if (game) {
            const newStatus = game.is_hidden ? 0 : 1;
            db.prepare('UPDATE games SET is_hidden = ? WHERE id = ?').run(newStatus, gameId);
            return { success: true, is_hidden: Boolean(newStatus) };
        }

        return { success: false, error: 'Game not found' };
    } catch (error) {
        console.error('Error toggling hidden:', error);
        return { success: false, error: error.message };
    } finally {
        db.close();
    }
});

// Set rating
ipcMain.handle('set-rating', async (event, gameId, rating) => {
    // Validate rating before opening DB
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return { success: false, error: 'Rating must be a number between 1 and 5' };
    }

    const db = initDatabase();
    try {
        db.prepare('UPDATE games SET user_rating = ? WHERE id = ?').run(Math.floor(rating), gameId);
        return { success: true };
    } catch (error) {
        console.error('Error setting rating:', error);
        return { success: false, error: error.message };
    } finally {
        db.close();
    }
});

// Set notes
ipcMain.handle('set-notes', async (event, gameId, notes) => {
    // Validate notes before opening DB
    if (notes !== null && notes !== undefined && typeof notes !== 'string') {
        return { success: false, error: 'Notes must be a string' };
    }

    // Limit notes length to prevent database bloat
    const MAX_NOTES_LENGTH = 5000;
    const validatedNotes = notes ? notes.substring(0, MAX_NOTES_LENGTH) : '';

    const db = initDatabase();
    try {
        db.prepare('UPDATE games SET user_notes = ? WHERE id = ?').run(validatedNotes, gameId);
        return { success: true };
    } catch (error) {
        console.error('Error setting notes:', error);
        return { success: false, error: error.message };
    } finally {
        db.close();
    }
});

// Set custom launch options
ipcMain.handle('set-custom-launch-options', async (event, gameId, options) => {
    // Validate launch options before opening DB
    if (options !== null && options !== undefined && typeof options !== 'string') {
        return { success: false, error: 'Launch options must be a string' };
    }

    // Limit options length
    const MAX_OPTIONS_LENGTH = 500;
    const validatedOptions = options ? options.substring(0, MAX_OPTIONS_LENGTH) : '';

    const db = initDatabase();
    try {
        db.prepare('UPDATE games SET custom_launch_options = ? WHERE id = ?').run(validatedOptions, gameId);
        return { success: true };
    } catch (error) {
        console.error('Error setting custom launch options:', error);
        return { success: false, error: error.message };
    } finally {
        db.close();
    }
});

// Get favorites
ipcMain.handle('get-favorites', async () => {
    try {
        const db = initDatabase();
        const games = db.prepare('SELECT * FROM games WHERE is_favorite = 1 ORDER BY title').all();
        db.close();

        // Convert SQLite boolean integers to JavaScript booleans
        const parsedGames = games.map(game => ({
            ...game,
            is_favorite: Boolean(game.is_favorite),
            is_hidden: Boolean(game.is_hidden)
        }));

        return { success: true, games: parsedGames };
    } catch (error) {
        console.error('Error getting favorites:', error);
        return { success: false, error: error.message };
    }
});

// Get recently played
ipcMain.handle('get-recently-played', async (event, limit = 10) => {
    try {
        const db = initDatabase();
        const games = db.prepare(`
            SELECT * FROM games
            WHERE last_played IS NOT NULL AND is_hidden = 0
            ORDER BY last_played DESC
            LIMIT ?
        `).all(limit);
        db.close();

        // Convert SQLite boolean integers to JavaScript booleans
        const parsedGames = games.map(game => ({
            ...game,
            is_favorite: Boolean(game.is_favorite),
            is_hidden: Boolean(game.is_hidden)
        }));

        return { success: true, games: parsedGames };
    } catch (error) {
        console.error('Error getting recently played:', error);
        return { success: false, error: error.message };
    }
});

// Get most played
ipcMain.handle('get-most-played', async (event, limit = 10) => {
    try {
        const db = initDatabase();
        const games = db.prepare(`
            SELECT * FROM games
            WHERE total_play_time > 0 AND is_hidden = 0
            ORDER BY total_play_time DESC
            LIMIT ?
        `).all(limit);
        db.close();

        // Convert SQLite boolean integers to JavaScript booleans
        const parsedGames = games.map(game => ({
            ...game,
            is_favorite: Boolean(game.is_favorite),
            is_hidden: Boolean(game.is_hidden)
        }));

        return { success: true, games: parsedGames };
    } catch (error) {
        console.error('Error getting most played:', error);
        return { success: false, error: error.message };
    }
});

// Get recently added
ipcMain.handle('get-recently-added', async (event, limit = 10) => {
    try {
        const db = initDatabase();
        const games = db.prepare(`
            SELECT * FROM games
            WHERE is_hidden = 0
            ORDER BY created_at DESC
            LIMIT ?
        `).all(limit);
        db.close();

        // Convert SQLite boolean integers to JavaScript booleans
        const parsedGames = games.map(game => ({
            ...game,
            is_favorite: Boolean(game.is_favorite),
            is_hidden: Boolean(game.is_hidden)
        }));

        return { success: true, games: parsedGames };
    } catch (error) {
        console.error('Error getting recently added:', error);
        return { success: false, error: error.message };
    }
});

// Find duplicates
ipcMain.handle('find-duplicates', async () => {
    try {
        const db = initDatabase();
        const duplicates = db.prepare(`
            SELECT title, COUNT(*) as count, GROUP_CONCAT(platform) as platforms, GROUP_CONCAT(id) as game_ids
            FROM games
            GROUP BY LOWER(TRIM(title))
            HAVING count > 1
            ORDER BY count DESC, title
        `).all();

        const result = duplicates.map(row => ({
            title: row.title,
            count: row.count,
            platforms: row.platforms ? row.platforms.split(',') : [],
            game_ids: row.game_ids ? row.game_ids.split(',').map(id => parseInt(id)) : []
        }));

        db.close();
        return { success: true, duplicates: result };
    } catch (error) {
        console.error('Error finding duplicates:', error);
        return { success: false, error: error.message };
    }
});

// Advanced filter
ipcMain.handle('filter-games', async (event, filters) => {
    try {
        const db = initDatabase();
        let query = 'SELECT * FROM games WHERE 1=1';
        const params = [];

        if (!filters.show_hidden) {
            query += ' AND is_hidden = 0';
        }

        if (filters.favorites_only) {
            query += ' AND is_favorite = 1';
        }

        if (filters.platform) {
            query += ' AND platform = ?';
            params.push(filters.platform);
        }

        if (filters.search_query) {
            query += ' AND (title LIKE ? OR description LIKE ? OR developer LIKE ?)';
            const searchPattern = `%${filters.search_query}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (filters.genre) {
            query += ' AND genres LIKE ?';
            params.push(`%${filters.genre}%`);
        }

        if (filters.vr_only) {
            query += ' AND has_vr_support = 1';
        }

        // Add sorting - use whitelist mapping to prevent SQL injection
        const sortFieldsMap = {
            'title': 'title',
            'last_played': 'last_played',
            'total_play_time': 'total_play_time',
            'launch_count': 'launch_count',
            'created_at': 'created_at',
            'release_date': 'release_date'
        };
        const sortBy = sortFieldsMap[filters.sort_by] || 'title';
        const sortOrder = filters.sort_order === 'DESC' ? 'DESC' : 'ASC';

        // Handle NULL values for date/time fields
        if (['last_played', 'release_date'].includes(sortBy)) {
            query += ' ORDER BY ' + sortBy + ' IS NULL, ' + sortBy + ' ' + sortOrder;
        } else {
            query += ' ORDER BY ' + sortBy + ' ' + sortOrder;
        }

        const games = db.prepare(query).all(...params);
        db.close();

        // Parse JSON fields and fix image paths (same as get-games)
        const parsedGames = games.map(game => {
            const parsed = { ...game };

            // Convert SQLite boolean integers to JavaScript booleans
            parsed.is_favorite = Boolean(game.is_favorite);
            parsed.is_hidden = Boolean(game.is_hidden);
            parsed.has_vr_support = Boolean(game.has_vr_support);

            // Parse JSON fields
            if (game.genres) {
                try {
                    parsed.genres = JSON.parse(game.genres);
                } catch (e) {
                    parsed.genres = [];
                }
            }

            // Fix image paths - convert relative to absolute
            if (parsed.icon_path && !parsed.icon_path.startsWith('http')) {
                // Remove leading 'game_data/' if present to avoid duplication
                let iconPath = parsed.icon_path.replace(/^game_data[\/\\]/, '');
                parsed.icon_path = path.join(gameDataPath, iconPath).replace(/\\/g, '/');
            }
            if (parsed.boxart_path && !parsed.boxart_path.startsWith('http')) {
                // Remove leading 'game_data/' if present to avoid duplication
                let boxartPath = parsed.boxart_path.replace(/^game_data[\/\\]/, '');
                parsed.boxart_path = path.join(gameDataPath, boxartPath).replace(/\\/g, '/');
            }
            if (parsed.exe_icon_path && !parsed.exe_icon_path.startsWith('http')) {
                // Remove leading 'game_data/' if present to avoid duplication
                let exeIconPath = parsed.exe_icon_path.replace(/^game_data[\/\\]/, '');
                parsed.exe_icon_path = path.join(gameDataPath, exeIconPath).replace(/\\/g, '/');
            }
            if (parsed.header_path && !parsed.header_path.startsWith('http')) {
                // Remove leading 'game_data/' if present to avoid duplication
                let headerPath = parsed.header_path.replace(/^game_data[\/\\]/, '');
                parsed.header_path = path.join(gameDataPath, headerPath).replace(/\\/g, '/');
            }

            return parsed;
        });

        return { success: true, games: parsedGames };
    } catch (error) {
        console.error('Error filtering games:', error);
        return { success: false, error: error.message };
    }
});

// Error logging
const errorLogPath = path.join(gameDataPath, 'error.log');

ipcMain.handle('log-error', async (event, errorData) => {
    try {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${errorData.type || 'ERROR'}: ${errorData.message}\n`;
        const stackTrace = errorData.stack ? `Stack: ${errorData.stack}\n` : '';
        const context = errorData.context ? `Context: ${JSON.stringify(errorData.context)}\n` : '';
        const fullEntry = logEntry + stackTrace + context + '---\n';

        await fs.promises.appendFile(errorLogPath, fullEntry, 'utf8');
        return { success: true };
    } catch (error) {
        console.error('Failed to write error log:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-error-log', async () => {
    try {
        if (fs.existsSync(errorLogPath)) {
            const content = await fs.promises.readFile(errorLogPath, 'utf8');
            return { success: true, content };
        }
        return { success: true, content: 'No errors logged yet.' };
    } catch (error) {
        console.error('Failed to read error log:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('clear-error-log', async () => {
    try {
        if (fs.existsSync(errorLogPath)) {
            fs.unlinkSync(errorLogPath);
        }
        return { success: true };
    } catch (error) {
        console.error('Failed to clear error log:', error);
        return { success: false, error: error.message };
    }
});

// Clear game data
ipcMain.handle('clear-game-data', async () => {
    try {
        // Delete database file
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }

        // Reinitialize database (creates new empty database)
        const db = initDatabase();
        db.close();

        return { success: true };
    } catch (error) {
        console.error('Failed to clear game data:', error);
        return { success: false, error: error.message };
    }
});

// Custom game management
ipcMain.handle('select-custom-game-executable', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Game Executable',
            properties: ['openFile'],
            filters: [
                { name: 'Executables', extensions: ['exe', 'lnk', 'bat', 'cmd'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, canceled: true };
        }

        return {
            success: true,
            path: result.filePaths[0]
        };
    } catch (error) {
        console.error('Error selecting executable:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('add-custom-game', async (event, gameData) => {
    try {
        // Input validation
        if (!gameData || typeof gameData !== 'object') {
            return { success: false, error: 'Invalid game data' };
        }

        // Validate required fields
        if (!gameData.title || typeof gameData.title !== 'string' || gameData.title.trim().length === 0) {
            return { success: false, error: 'Title is required' };
        }

        if (!gameData.launch_command || typeof gameData.launch_command !== 'string' || gameData.launch_command.trim().length === 0) {
            return { success: false, error: 'Executable path is required' };
        }

        if (!gameData.app_id || typeof gameData.app_id !== 'string') {
            return { success: false, error: 'Invalid app_id' };
        }

        // Sanitize and validate input lengths
        const title = gameData.title.trim().substring(0, 200);
        const platform = (gameData.platform || 'custom').substring(0, 50);
        const launch_command = gameData.launch_command.trim();
        const install_dir = gameData.install_dir ? String(gameData.install_dir).substring(0, 500) : null;
        const developer = gameData.developer ? String(gameData.developer).substring(0, 100) : 'Unknown';
        const publisher = gameData.publisher ? String(gameData.publisher).substring(0, 100) : 'Unknown';
        const description = gameData.description ? String(gameData.description).substring(0, 1000) : null;
        const boxart_url = gameData.boxart_url ? String(gameData.boxart_url).substring(0, 500) : null;

        // Validate release date format if provided
        let release_date = null;
        if (gameData.release_date) {
            const dateStr = String(gameData.release_date);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return { success: false, error: 'Invalid release date format (expected YYYY-MM-DD)' };
            }
            release_date = dateStr;
        }

        // Validate and sanitize genres array
        let genres = [];
        if (gameData.genres) {
            if (Array.isArray(gameData.genres)) {
                genres = gameData.genres
                    .filter(g => typeof g === 'string')
                    .map(g => g.trim().substring(0, 50))
                    .filter(g => g.length > 0)
                    .slice(0, 20); // Limit to 20 genres
            } else {
                return { success: false, error: 'Genres must be an array' };
            }
        }

        const db = initDatabase();

        try {
            // Check if game with same app_id already exists
            const existing = db.prepare('SELECT id FROM games WHERE app_id = ?').get(gameData.app_id);

            if (existing) {
                // Update existing game
                const updateStmt = db.prepare(`
                    UPDATE games SET
                        title = ?,
                        platform = ?,
                        launch_command = ?,
                        install_dir = ?,
                        developer = ?,
                        publisher = ?,
                        release_date = ?,
                        genres = ?,
                        description = ?,
                        boxart_url = ?,
                        metadata = ?
                    WHERE app_id = ?
                `);

                updateStmt.run(
                    title,
                    platform,
                    launch_command,
                    install_dir,
                    developer,
                    publisher,
                    release_date,
                    JSON.stringify(genres),
                    description,
                    boxart_url,
                    JSON.stringify({ is_custom: true }),
                    gameData.app_id
                );
            } else {
                // Insert new game
                const insertStmt = db.prepare(`
                    INSERT INTO games (
                        app_id, title, platform, launch_command, install_dir,
                        developer, publisher, release_date, genres,
                        description, boxart_url, metadata, added_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                insertStmt.run(
                    gameData.app_id,
                    title,
                    platform,
                    launch_command,
                    install_dir,
                    developer,
                    publisher,
                    release_date,
                    JSON.stringify(genres),
                    description,
                    boxart_url,
                    JSON.stringify({ is_custom: true }),
                    new Date().toISOString()
                );
            }

            return {
                success: true,
                message: existing ? 'Custom game updated successfully' : 'Custom game added successfully'
            };
        } finally {
            // Ensure database is always closed, even if an error occurs
            db.close();
        }
    } catch (error) {
        console.error('Error adding custom game:', error);
        return { success: false, error: error.message };
    }
});

// Media folder selection
ipcMain.handle('select-media-folder', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Select Media Folder',
            message: 'Choose a folder containing images, music, or videos'
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        return { success: true, folderPath: result.filePaths[0] };
    } catch (error) {
        console.error('Error selecting folder:', error);
        return { success: false, error: error.message };
    }
});

// Background music file selection
ipcMain.handle('select-background-music', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            title: 'Select Background Music',
            message: 'Choose an audio file for background music',
            filters: [
                { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        return { success: true, filePath: result.filePaths[0] };
    } catch (error) {
        console.error('Error selecting background music:', error);
        return { success: false, error: error.message };
    }
});

// Scan media folder for images/videos/music
ipcMain.handle('scan-media-folder', async (event, folderPath) => {
    try {
        // Validate folder path to prevent directory traversal
        const normalizedPath = path.resolve(folderPath);
        if (!fs.existsSync(normalizedPath) || !fs.statSync(normalizedPath).isDirectory()) {
            return { success: false, error: 'Invalid folder path' };
        }

        const media = [];
        const supportedImages = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        const supportedVideos = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
        const supportedAudio = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac'];

        function scanDirectory(dir) {
            const items = fs.readdirSync(dir);

            for (const item of items) {
                const fullPath = path.join(dir, item);

                // Additional security check to ensure path is within the selected folder
                if (!fullPath.startsWith(normalizedPath)) {
                    console.warn('Skipping path outside selected folder:', fullPath);
                    continue;
                }

                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    scanDirectory(fullPath);
                } else if (stat.isFile()) {
                    const ext = path.extname(item).toLowerCase();

                    if (supportedImages.includes(ext)) {
                        media.push({
                            type: 'image',
                            title: path.basename(item, ext),
                            image: fullPath.replace(/\\/g, '/'),
                            category: 'User Media',
                            year: new Date(stat.mtime).getFullYear().toString(),
                            tags: path.dirname(fullPath).split(path.sep).pop(),
                            color: 0x4682B4
                        });
                    } else if (supportedVideos.includes(ext)) {
                        media.push({
                            type: 'video',
                            title: path.basename(item, ext),
                            video: fullPath.replace(/\\/g, '/'),
                            category: 'User Media',
                            year: new Date(stat.mtime).getFullYear().toString(),
                            tags: path.dirname(fullPath).split(path.sep).pop(),
                            color: 0x8B4789
                        });
                    } else if (supportedAudio.includes(ext)) {
                        media.push({
                            type: 'music',
                            title: path.basename(item, ext),
                            audio: fullPath.replace(/\\/g, '/'),
                            category: 'User Media',
                            year: new Date(stat.mtime).getFullYear().toString(),
                            tags: path.dirname(fullPath).split(path.sep).pop(),
                            color: 0xFF6347
                        });
                    }
                }
            }
        }

        scanDirectory(normalizedPath);

        // Save folder path to database
        try {
            const db = initDatabase();
            db.prepare(`
                INSERT OR REPLACE INTO media_folders (folder_path, last_scanned)
                VALUES (?, CURRENT_TIMESTAMP)
            `).run(normalizedPath);
            db.close();
        } catch (dbError) {
            console.error('Error saving media folder to database:', dbError);
        }

        return {
            success: true,
            media,
            count: media.length,
            folderPath: normalizedPath
        };
    } catch (error) {
        console.error('Error scanning media folder:', error);
        return { success: false, error: error.message };
    }
});

// Get all saved media folders
ipcMain.handle('get-media-folders', async () => {
    try {
        const db = initDatabase();
        const folders = db.prepare('SELECT * FROM media_folders ORDER BY added_at').all();
        db.close();
        return { success: true, folders };
    } catch (error) {
        console.error('Error getting media folders:', error);
        return { success: false, error: error.message, folders: [] };
    }
});

// Load media from all saved folders
ipcMain.handle('load-all-media-folders', async () => {
    try {
        const db = initDatabase();
        const folders = db.prepare('SELECT folder_path FROM media_folders').all();
        db.close();

        let allMedia = [];
        let totalCount = 0;
        let successCount = 0;

        for (const folder of folders) {
            try {
                // Check if folder still exists
                if (!fs.existsSync(folder.folder_path)) {
                    console.warn(`Skipping non-existent folder: ${folder.folder_path}`);
                    continue;
                }

                // Scan the folder (reuse the scanning logic)
                const scanResult = await scanMediaFolderSync(folder.folder_path);
                if (scanResult.success) {
                    allMedia = [...allMedia, ...scanResult.media];
                    totalCount += scanResult.count;
                    successCount++;
                }
            } catch (error) {
                console.error(`Error loading folder ${folder.folder_path}:`, error);
            }
        }

        return {
            success: true,
            media: allMedia,
            count: totalCount,
            foldersScanned: successCount,
            totalFolders: folders.length
        };
    } catch (error) {
        console.error('Error loading media folders:', error);
        return { success: false, error: error.message, media: [] };
    }
});

// Helper function to scan a folder synchronously (extracted from scan-media-folder handler)
function scanMediaFolderSync(folderPath) {
    try {
        const normalizedPath = path.resolve(folderPath);
        if (!fs.existsSync(normalizedPath) || !fs.statSync(normalizedPath).isDirectory()) {
            return { success: false, error: 'Invalid folder path', media: [], count: 0 };
        }

        const media = [];
        const supportedImages = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        const supportedVideos = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
        const supportedAudio = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac'];

        function scanDirectory(dir) {
            const items = fs.readdirSync(dir);

            for (const item of items) {
                const fullPath = path.join(dir, item);

                if (!fullPath.startsWith(normalizedPath)) {
                    continue;
                }

                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    scanDirectory(fullPath);
                } else if (stat.isFile()) {
                    const ext = path.extname(item).toLowerCase();

                    if (supportedImages.includes(ext)) {
                        media.push({
                            type: 'image',
                            title: path.basename(item, ext),
                            image: fullPath.replace(/\\/g, '/'),
                            category: 'User Media',
                            year: new Date(stat.mtime).getFullYear().toString(),
                            tags: path.dirname(fullPath).split(path.sep).pop(),
                            color: 0x4682B4
                        });
                    } else if (supportedVideos.includes(ext)) {
                        media.push({
                            type: 'video',
                            title: path.basename(item, ext),
                            video: fullPath.replace(/\\/g, '/'),
                            category: 'User Media',
                            year: new Date(stat.mtime).getFullYear().toString(),
                            tags: path.dirname(fullPath).split(path.sep).pop(),
                            color: 0x8B4789
                        });
                    } else if (supportedAudio.includes(ext)) {
                        media.push({
                            type: 'music',
                            title: path.basename(item, ext),
                            audio: fullPath.replace(/\\/g, '/'),
                            category: 'User Media',
                            year: new Date(stat.mtime).getFullYear().toString(),
                            tags: path.dirname(fullPath).split(path.sep).pop(),
                            color: 0xFF6347
                        });
                    }
                }
            }
        }

        scanDirectory(normalizedPath);

        return {
            success: true,
            media,
            count: media.length
        };
    } catch (error) {
        console.error('Error in scanMediaFolderSync:', error);
        return { success: false, error: error.message, media: [], count: 0 };
    }
}

// ============================================
// COLLECTIONS API
// ============================================

// Get all collections
ipcMain.handle('get-collections', async () => {
    try {
        const db = initDatabase();
        const collections = db.prepare(`
            SELECT c.*, COUNT(cg.game_id) as game_count
            FROM game_collections c
            LEFT JOIN collection_games cg ON c.id = cg.collection_id
            GROUP BY c.id
            ORDER BY c.sort_order, c.name
        `).all();
        db.close();
        return { success: true, collections };
    } catch (error) {
        console.error('Error getting collections:', error);
        return { success: false, error: error.message, collections: [] };
    }
});

// Create collection
ipcMain.handle('create-collection', async (event, name, description, color, icon) => {
    try {
        const db = initDatabase();
        const result = db.prepare(`
            INSERT INTO game_collections (name, description, color, icon)
            VALUES (?, ?, ?, ?)
        `).run(name, description, color || '#4fc3f7', icon || '📁');
        db.close();
        return { success: true, collectionId: result.lastInsertRowid };
    } catch (error) {
        console.error('Error creating collection:', error);
        return { success: false, error: error.message };
    }
});

// Add game to collection
ipcMain.handle('add-to-collection', async (event, collectionId, gameId) => {
    try {
        const db = initDatabase();
        db.prepare(`
            INSERT OR IGNORE INTO collection_games (collection_id, game_id)
            VALUES (?, ?)
        `).run(collectionId, gameId);
        db.close();
        return { success: true };
    } catch (error) {
        console.error('Error adding to collection:', error);
        return { success: false, error: error.message };
    }
});

// Remove game from collection
ipcMain.handle('remove-from-collection', async (event, collectionId, gameId) => {
    try {
        const db = initDatabase();
        db.prepare(`
            DELETE FROM collection_games
            WHERE collection_id = ? AND game_id = ?
        `).run(collectionId, gameId);
        db.close();
        return { success: true };
    } catch (error) {
        console.error('Error removing from collection:', error);
        return { success: false, error: error.message };
    }
});

// Get games in collection
ipcMain.handle('get-collection-games', async (event, collectionId) => {
    try {
        const db = initDatabase();
        const games = db.prepare(`
            SELECT g.* FROM games g
            INNER JOIN collection_games cg ON g.id = cg.game_id
            WHERE cg.collection_id = ?
            ORDER BY cg.sort_order, g.title
        `).all(collectionId);
        db.close();
        return { success: true, games };
    } catch (error) {
        console.error('Error getting collection games:', error);
        return { success: false, error: error.message, games: [] };
    }
});

// Delete collection
ipcMain.handle('delete-collection', async (event, collectionId) => {
    try {
        const db = initDatabase();
        db.prepare('DELETE FROM game_collections WHERE id = ?').run(collectionId);
        db.close();
        return { success: true };
    } catch (error) {
        console.error('Error deleting collection:', error);
        return { success: false, error: error.message };
    }
});

// ============================================
// CUSTOM COVERS API
// ============================================

// Set custom cover for game
ipcMain.handle('set-custom-cover', async (event, gameId, coverUrl, coverType, source) => {
    try {
        const db = initDatabase();
        db.prepare(`
            INSERT OR REPLACE INTO custom_covers (game_id, cover_url, cover_type, source)
            VALUES (?, ?, ?, ?)
        `).run(gameId, coverUrl, coverType || 'grid', source || 'user_upload');
        db.close();
        return { success: true };
    } catch (error) {
        console.error('Error setting custom cover:', error);
        return { success: false, error: error.message };
    }
});

// Get custom cover for game
ipcMain.handle('get-custom-cover', async (event, gameId) => {
    try {
        const db = initDatabase();
        const cover = db.prepare('SELECT * FROM custom_covers WHERE game_id = ?').get(gameId);
        db.close();
        return { success: true, cover };
    } catch (error) {
        console.error('Error getting custom cover:', error);
        return { success: false, error: error.message, cover: null };
    }
});

// Remove custom cover
ipcMain.handle('remove-custom-cover', async (event, gameId) => {
    try {
        const db = initDatabase();
        db.prepare('DELETE FROM custom_covers WHERE game_id = ?').run(gameId);
        db.close();
        return { success: true };
    } catch (error) {
        console.error('Error removing custom cover:', error);
        return { success: false, error: error.message };
    }
});

// ============================================
// PLAYTIME GOALS API
// ============================================

// Create goal
ipcMain.handle('create-goal', async (event, goalType, targetValue, gameId, endDate) => {
    try {
        const db = initDatabase();
        const result = db.prepare(`
            INSERT INTO playtime_goals (goal_type, target_value, game_id, end_date)
            VALUES (?, ?, ?, ?)
        `).run(goalType, targetValue, gameId || null, endDate || null);
        db.close();
        return { success: true, goalId: result.lastInsertRowid };
    } catch (error) {
        console.error('Error creating goal:', error);
        return { success: false, error: error.message };
    }
});

// Get all goals
ipcMain.handle('get-goals', async () => {
    try {
        const db = initDatabase();
        const goals = db.prepare(`
            SELECT pg.*, g.title as game_title
            FROM playtime_goals pg
            LEFT JOIN games g ON pg.game_id = g.id
            ORDER BY pg.completed, pg.end_date
        `).all();
        db.close();
        return { success: true, goals };
    } catch (error) {
        console.error('Error getting goals:', error);
        return { success: false, error: error.message, goals: [] };
    }
});

// Update goal progress
ipcMain.handle('update-goal-progress', async (event, goalId, currentValue, completed) => {
    try {
        const db = initDatabase();
        db.prepare(`
            UPDATE playtime_goals
            SET current_value = ?, completed = ?
            WHERE id = ?
        `).run(currentValue, completed ? 1 : 0, goalId);
        db.close();
        return { success: true };
    } catch (error) {
        console.error('Error updating goal:', error);
        return { success: false, error: error.message };
    }
});

// Delete goal
ipcMain.handle('delete-goal', async (event, goalId) => {
    try {
        const db = initDatabase();
        db.prepare('DELETE FROM playtime_goals WHERE id = ?').run(goalId);
        db.close();
        return { success: true };
    } catch (error) {
        console.error('Error deleting goal:', error);
        return { success: false, error: error.message };
    }
});

// ============================================
// THEMES API
// ============================================

// Get all themes
ipcMain.handle('get-themes', async () => {
    try {
        const db = initDatabase();
        const themes = db.prepare('SELECT * FROM themes ORDER BY is_builtin DESC, name').all();
        db.close();
        return { success: true, themes };
    } catch (error) {
        console.error('Error getting themes:', error);
        return { success: false, error: error.message, themes: [] };
    }
});

// Get active theme
ipcMain.handle('get-active-theme', async () => {
    try {
        const db = initDatabase();
        const theme = db.prepare('SELECT * FROM themes WHERE is_active = 1').get();
        db.close();
        return { success: true, theme };
    } catch (error) {
        console.error('Error getting active theme:', error);
        return { success: false, error: error.message, theme: null };
    }
});

// Activate theme
ipcMain.handle('activate-theme', async (event, themeId) => {
    try {
        const db = initDatabase();
        db.prepare('UPDATE themes SET is_active = 0').run();
        db.prepare('UPDATE themes SET is_active = 1 WHERE id = ?').run(themeId);
        db.close();
        return { success: true };
    } catch (error) {
        console.error('Error activating theme:', error);
        return { success: false, error: error.message };
    }
});

// Create custom theme
ipcMain.handle('create-theme', async (event, name, colors, background) => {
    try {
        const db = initDatabase();
        const result = db.prepare(`
            INSERT INTO themes (name, colors, background, is_builtin)
            VALUES (?, ?, ?, 0)
        `).run(name, colors, background || null);
        db.close();
        return { success: true, themeId: result.lastInsertRowid };
    } catch (error) {
        console.error('Error creating theme:', error);
        return { success: false, error: error.message };
    }
});

// Delete custom theme
ipcMain.handle('delete-theme', async (event, themeId) => {
    try {
        const db = initDatabase();
        // Don't delete builtin themes
        db.prepare('DELETE FROM themes WHERE id = ? AND is_builtin = 0').run(themeId);
        db.close();
        return { success: true };
    } catch (error) {
        console.error('Error deleting theme:', error);
        return { success: false, error: error.message };
    }
});

// ============================================
// STATISTICS API
// ============================================

// Get playtime statistics
ipcMain.handle('get-playtime-stats', async (event, period = 'week') => {
    try {
        const db = initDatabase();

        // Calculate date range
        let daysAgo = 7;
        if (period === 'month') daysAgo = 30;
        if (period === 'year') daysAgo = 365;

        const stats = {
            totalPlaytime: 0,
            totalGames: 0,
            mostPlayed: [],
            recentSessions: [],
            dailyPlaytime: []
        };

        // Total playtime
        const total = db.prepare('SELECT SUM(total_play_time) as total FROM games').get();
        stats.totalPlaytime = total.total || 0;

        // Total games played
        const played = db.prepare('SELECT COUNT(*) as count FROM games WHERE total_play_time > 0').get();
        stats.totalGames = played.count || 0;

        // Most played games
        stats.mostPlayed = db.prepare(`
            SELECT id, title, total_play_time, launch_count, platform
            FROM games
            WHERE total_play_time > 0
            ORDER BY total_play_time DESC
            LIMIT 10
        `).all();

        // Recent sessions
        stats.recentSessions = db.prepare(`
            SELECT gs.*, g.title, g.platform
            FROM game_sessions gs
            INNER JOIN games g ON gs.game_id = g.id
            WHERE gs.end_time IS NOT NULL
            AND datetime(gs.start_time) >= datetime('now', '-${daysAgo} days')
            ORDER BY gs.start_time DESC
            LIMIT 50
        `).all();

        // Daily playtime for period
        stats.dailyPlaytime = db.prepare(`
            SELECT
                DATE(start_time) as date,
                SUM(duration) as total_seconds,
                COUNT(*) as session_count
            FROM game_sessions
            WHERE end_time IS NOT NULL
            AND datetime(start_time) >= datetime('now', '-${daysAgo} days')
            GROUP BY DATE(start_time)
            ORDER BY date DESC
        `).all();

        db.close();
        return { success: true, stats };
    } catch (error) {
        console.error('Error getting playtime stats:', error);
        return { success: false, error: error.message, stats: null };
    }
});

// Get all playtime sessions for heatmap import
ipcMain.handle('get-playtime-sessions', async (event) => {
    try {
        const db = initDatabase();
        const sessions = db.prepare(`
            SELECT game_id, start_time, duration
            FROM game_sessions
            WHERE end_time IS NOT NULL
            AND duration IS NOT NULL
            AND duration > 0
            ORDER BY start_time DESC
        `).all();

        db.close();
        return { success: true, sessions };
    } catch (error) {
        console.error('Error getting playtime sessions:', error);
        return { success: false, error: error.message, sessions: [] };
    }
});

// Scan game soundtrack files
ipcMain.handle('scan-game-soundtrack', async (event, gameId) => {
    const db = initDatabase();
    try {
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);

        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        if (!game.install_dir || !fs.existsSync(game.install_dir)) {
            return { success: false, error: 'Game installation directory not found' };
        }

        const tracks = [];
        const audioExtensions = ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.wma', '.aac'];
        const musicFolders = ['music', 'soundtrack', 'audio', 'sound', 'bgm', 'ost', 'songs'];

        // Helper function to scan directory recursively (max depth 3)
        const scanDirectory = (dir, depth = 0) => {
            if (depth > 3 || !fs.existsSync(dir)) return;

            try {
                const items = fs.readdirSync(dir);

                for (const item of items) {
                    const fullPath = path.join(dir, item);

                    try {
                        const stat = fs.statSync(fullPath);

                        if (stat.isDirectory()) {
                            scanDirectory(fullPath, depth + 1);
                        } else if (stat.isFile()) {
                            const ext = path.extname(item).toLowerCase();
                            if (audioExtensions.includes(ext)) {
                                const filename = path.basename(item, ext);
                                tracks.push({
                                    path: fullPath,
                                    title: filename.replace(/_/g, ' ').replace(/-/g, ' '),
                                    filename: item,
                                    duration: 0 // Would need audio library to get actual duration
                                });
                            }
                        }
                    } catch (err) {
                        // Skip files/folders we can't access
                        continue;
                    }
                }
            } catch (err) {
                // Skip directories we can't read
                return;
            }
        };

        // First, check if there are dedicated music folders
        let foundMusicFolder = false;
        try {
            const rootItems = fs.readdirSync(game.install_dir);
            for (const item of rootItems) {
                const itemLower = item.toLowerCase();
                if (musicFolders.some(folder => itemLower.includes(folder))) {
                    const fullPath = path.join(game.install_dir, item);
                    try {
                        const stat = fs.statSync(fullPath);
                        if (stat.isDirectory()) {
                            scanDirectory(fullPath, 0);
                            foundMusicFolder = true;
                        }
                    } catch (err) {
                        continue;
                    }
                }
            }
        } catch (err) {
            return { success: false, error: 'Cannot read game directory' };
        }

        // If no dedicated music folder found, scan root directory (max depth 2)
        if (!foundMusicFolder) {
            scanDirectory(game.install_dir, 0);
        }

        // Limit to 500 tracks to prevent performance issues
        if (tracks.length > 500) {
            tracks.length = 500;
        }

        console.log(`[SOUNDTRACK] Found ${tracks.length} audio files for ${game.title}`);
        return { success: true, tracks };
    } catch (error) {
        console.error('[SOUNDTRACK] Error scanning game soundtrack:', error);
        return { success: false, error: error.message };
    } finally {
        db.close();
    }
});

// Check for game updates
ipcMain.handle('check-game-updates', async () => {
    try {
        const db = initDatabase();
        const games = db.prepare('SELECT * FROM games').all();

        // Update last check time
        const now = new Date().toISOString();
        db.prepare('UPDATE games SET last_update_check = ?').run(now);

        db.close();

        // TODO: Implement actual update checking logic
        // This would query each platform's API (Steam, Epic, Xbox) for available updates
        // For now, return empty array
        const updates = [];

        return { success: true, updates };
    } catch (error) {
        console.error('Error checking game updates:', error);
        return { success: false, error: error.message };
    }
});

// Update a game
ipcMain.handle('update-game', async (event, gameId) => {
    try {
        const db = initDatabase();
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);

        if (!game) {
            db.close();
            return { success: false, error: 'Game not found' };
        }

        // TODO: Implement actual game update logic
        // This would trigger the platform's update mechanism (Steam, Epic, Xbox)
        // For now, just mark as updated
        db.prepare('UPDATE games SET update_available = 0 WHERE id = ?').run(gameId);

        db.close();

        return { success: true };
    } catch (error) {
        console.error('Error updating game:', error);
        return { success: false, error: error.message };
    }
});

// Check if portable mode is enabled
ipcMain.handle('is-portable-mode', async () => {
    return {
        isPortable: isPortableMode,
        dataPath: gameDataPath
    };
});

// Set portable mode (create or remove portable.txt flag)
ipcMain.handle('set-portable-mode', async (event, enable) => {
    try {
        if (enable) {
            // Create portable.txt flag file
            fs.writeFileSync(portableFlagPath, 'This file enables portable mode');
            console.log('[PORTABLE] Portable mode enabled');
        } else {
            // Remove portable.txt flag file
            if (fs.existsSync(portableFlagPath)) {
                fs.unlinkSync(portableFlagPath);
                console.log('[PORTABLE] Portable mode disabled');
            }
        }

        return { success: true };
    } catch (error) {
        console.error('[PORTABLE] Failed to set portable mode:', error);
        return { success: false, error: error.message };
    }
});

// Restart application
ipcMain.handle('restart-app', async () => {
    app.relaunch();
    app.quit();
});

// ============================================
// MOD MANAGER API
// ============================================

// Helper functions for mod scanning
async function getWorkshopPath(appId) {
    // Try to find Steam Workshop folder for the game
    const system = process.platform;
    let steamPath;

    if (system === 'win32') {
        const programFiles = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
        steamPath = path.join(programFiles, 'Steam');
    } else if (system === 'darwin') {
        steamPath = path.join(require('os').homedir(), 'Library', 'Application Support', 'Steam');
    } else {
        // Linux
        steamPath = path.join(require('os').homedir(), '.steam', 'steam');
    }

    const workshopPath = path.join(steamPath, 'steamapps', 'workshop', 'content', appId);
    return workshopPath;
}

async function scanWorkshopMods(workshopPath, appId) {
    const mods = [];

    try {
        if (!fs.existsSync(workshopPath)) {
            return mods;
        }

        const modFolders = fs.readdirSync(workshopPath);

        for (const folder of modFolders) {
            const modPath = path.join(workshopPath, folder);
            const stats = fs.statSync(modPath);

            if (stats.isDirectory()) {
                // Try to read mod info from various sources
                const modInfo = {
                    id: folder,
                    name: `Workshop Mod ${folder}`,
                    version: '1.0',
                    author: 'Unknown',
                    description: 'Steam Workshop mod',
                    enabled: true, // Assume enabled by default
                    source: 'steam_workshop',
                    path: modPath
                };

                // Try to find mod name from common config files
                const possibleInfoFiles = ['mod.info', 'modinfo.txt', 'description.txt'];
                for (const infoFile of possibleInfoFiles) {
                    const infoPath = path.join(modPath, infoFile);
                    if (fs.existsSync(infoPath)) {
                        try {
                            const content = fs.readFileSync(infoPath, 'utf8');
                            // Try to parse mod name
                            const nameMatch = content.match(/name\s*[:=]\s*["']?([^"'\n]+)["']?/i);
                            if (nameMatch) {
                                modInfo.name = nameMatch[1].trim();
                            }
                        } catch (e) {
                            // Ignore parsing errors
                        }
                        break;
                    }
                }

                mods.push(modInfo);
            }
        }
    } catch (error) {
        console.error('Error scanning Workshop mods:', error);
    }

    return mods;
}

async function scanUnityMods(installDir, gameTitle) {
    const mods = [];

    if (!installDir || !fs.existsSync(installDir)) {
        return mods;
    }

    try {
        // Check for BepInEx
        const bepInExPath = path.join(installDir, 'BepInEx', 'plugins');
        if (fs.existsSync(bepInExPath)) {
            const plugins = fs.readdirSync(bepInExPath);

            for (const plugin of plugins) {
                const pluginPath = path.join(bepInExPath, plugin);
                const stats = fs.statSync(pluginPath);

                if (stats.isDirectory() || plugin.endsWith('.dll')) {
                    mods.push({
                        id: plugin,
                        name: plugin.replace(/\.dll$/i, ''),
                        version: '1.0',
                        author: 'Unknown',
                        description: 'BepInEx plugin',
                        enabled: true,
                        source: 'bepinex',
                        path: pluginPath,
                        thunderstoreCompatible: true
                    });
                }
            }
        }

        // Check for MelonLoader
        const melonLoaderPath = path.join(installDir, 'Mods');
        if (fs.existsSync(melonLoaderPath)) {
            const mods_ml = fs.readdirSync(melonLoaderPath);

            for (const mod of mods_ml) {
                const modPath = path.join(melonLoaderPath, mod);
                const stats = fs.statSync(modPath);

                if (stats.isDirectory() || mod.endsWith('.dll')) {
                    mods.push({
                        id: mod,
                        name: mod.replace(/\.dll$/i, ''),
                        version: '1.0',
                        author: 'Unknown',
                        description: 'MelonLoader mod',
                        enabled: true,
                        source: 'melonloader',
                        path: modPath,
                        thunderstoreCompatible: true
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error scanning Unity mods:', error);
    }

    return mods;
}

async function scanGenericMods(installDir) {
    const mods = [];

    if (!installDir || !fs.existsSync(installDir)) {
        return mods;
    }

    try {
        // Check common mod folder locations
        const modFolders = ['mods', 'Mods', 'data/mods', 'Data/Mods'];

        for (const folder of modFolders) {
            const modPath = path.join(installDir, folder);
            if (fs.existsSync(modPath)) {
                const items = fs.readdirSync(modPath);

                for (const item of items) {
                    const itemPath = path.join(modPath, item);
                    const stats = fs.statSync(itemPath);

                    if (stats.isDirectory() || item.match(/\.(zip|rar|7z|pak|ba2)$/i)) {
                        mods.push({
                            id: item,
                            name: item,
                            version: '1.0',
                            author: 'Unknown',
                            description: 'Generic mod',
                            enabled: true,
                            source: 'generic',
                            path: itemPath
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error scanning generic mods:', error);
    }

    return mods;
}

// Get mods for a game
ipcMain.handle('get-game-mods', async (event, gameId) => {
    try {
        const db = initDatabase();
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        db.close();

        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        const mods = [];

        // Check if game has Steam Workshop support
        if (game.has_workshop_support && game.workshop_id) {
            // For Steam Workshop games, scan the workshop folder
            const workshopPath = await getWorkshopPath(game.app_id);
            if (workshopPath && fs.existsSync(workshopPath)) {
                const workshopMods = await scanWorkshopMods(workshopPath, game.app_id);
                mods.push(...workshopMods);
            }
        }

        // Check if game is Unity-based (potential Thunderstore support)
        if (game.engine === 'Unity') {
            // Scan for BepInEx/MelonLoader mods
            const unityMods = await scanUnityMods(game.install_directory, game.title);
            mods.push(...unityMods);
        }

        // Check for generic mod folders
        const genericMods = await scanGenericMods(game.install_directory);
        mods.push(...genericMods);

        return { success: true, mods, modSupport: {
            hasWorkshop: Boolean(game.has_workshop_support),
            isUnity: game.engine === 'Unity',
            engine: game.engine
        }};
    } catch (error) {
        console.error('Error getting game mods:', error);
        return { success: false, error: error.message };
    }
});

// Scan for new mods
ipcMain.handle('scan-game-mods', async (event, gameId) => {
    try {
        // TODO: Implement mod scanning logic
        // Would detect new mod files in the game's mod directory
        const newMods = 0;

        return { success: true, newMods };
    } catch (error) {
        console.error('Error scanning game mods:', error);
        return { success: false, error: error.message };
    }
});

// Apply mod changes (enable/disable, load order)
ipcMain.handle('apply-mod-changes', async (event, gameId, mods) => {
    try {
        // TODO: Implement mod configuration logic
        // Would write mod configuration files (load order, enabled mods)
        // Common files: mods.txt, loadorder.txt, plugins.txt
        return { success: true };
    } catch (error) {
        console.error('Error applying mod changes:', error);
        return { success: false, error: error.message };
    }
});

// Open mod folder
ipcMain.handle('open-mod-folder', async (event, gameId) => {
    try {
        const db = initDatabase();
        let game;
        try {
            game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        } finally {
            db.close();
        }

        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        if (!game.install_directory || !fs.existsSync(game.install_directory)) {
            return { success: false, error: 'Game installation directory not found' };
        }

        // Try common mod folder locations
        const modFolderPaths = [
            path.join(game.install_directory, 'BepInEx', 'plugins'), // BepInEx mods
            path.join(game.install_directory, 'Mods'), // Generic Mods folder
            path.join(game.install_directory, 'mods'), // Lowercase mods
            path.join(game.install_directory, 'MelonLoader', 'Mods'), // MelonLoader
            game.install_directory // Fallback to game directory
        ];

        // Find the first existing mod folder
        let modFolderToOpen = game.install_directory;
        for (const modPath of modFolderPaths) {
            if (fs.existsSync(modPath)) {
                modFolderToOpen = modPath;
                break;
            }
        }

        // Open the folder
        const { shell } = require('electron');
        await shell.openPath(modFolderToOpen);

        return { success: true, path: modFolderToOpen };
    } catch (error) {
        console.error('Error opening mod folder:', error);
        return { success: false, error: error.message };
    }
});

// Delete a mod
ipcMain.handle('delete-mod', async (event, gameId, modId) => {
    try {
        // TODO: Implement mod deletion logic
        // Would delete mod files from the game's mod directory
        return { success: true };
    } catch (error) {
        console.error('Error deleting mod:', error);
        return { success: false, error: error.message };
    }
});

// ============================================
// THUNDERSTORE API
// ============================================

// Search for mods on Thunderstore
ipcMain.handle('search-thunderstore-mods', async (event, gameId) => {
    try {
        const https = require('https');

        // Look up game to get title and thunderstore_community
        const db = initDatabase();
        let game;
        try {
            game = db.prepare('SELECT title, thunderstore_community FROM games WHERE id = ?').get(gameId);
        } finally {
            db.close();
        }

        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        // Use thunderstore_community if set, otherwise try to normalize title
        // Thunderstore community slugs are lowercase with hyphens (e.g., "lethal-company", "peak")
        let communitySlug = game.thunderstore_community;

        // Handle null/undefined/empty/"null" string cases
        // Add typeof check for extra safety
        if (!communitySlug || typeof communitySlug !== 'string' || communitySlug === 'null' || communitySlug.trim() === '') {
            // Common game mappings for Thunderstore
            const commonMappings = {
                'risk of rain 2': 'riskofrain2',
                'riskofrain2': 'riskofrain2',
                'ror2': 'riskofrain2',
                'lethal company': 'lethal-company',
                'content warning': 'content-warning',
                'valheim': 'valheim',
                'outward': 'outward',
                'h3vr': 'h3vr',
                'boneworks': 'boneworks',
                'risk of rain returns': 'risk-of-rain-returns',
                'sons of the forest': 'sons-of-the-forest',
                'cult of the lamb': 'cult-of-the-lamb',
                'subnautica': 'subnautica',
                'below zero': 'below-zero',
                'dyson sphere program': 'dyson-sphere-program',
                'titanfall 2': 'northstar',
                'northstar': 'northstar',
                'core keeper': 'core-keeper',
                'raft': 'raft',
                'gtfo': 'gtfo',
                'rounds': 'rounds',
                'timberborn': 'timberborn',
                'totally accurate battle simulator': 'totally-accurate-battle-simulator',
                'tabs': 'totally-accurate-battle-simulator',
                'across the obelisk': 'across-the-obelisk',
                'trombone champ': 'trombone-champ'
            };

            const titleLower = game.title.toLowerCase().trim();

            // Check common mappings first
            if (commonMappings[titleLower]) {
                communitySlug = commonMappings[titleLower];
            } else {
                // Auto-generate from title: "Lethal Company" → "lethal-company"
                communitySlug = game.title.toLowerCase()
                    .replace(/\s+/g, '-')      // Replace spaces with hyphens
                    .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric except hyphens
                    .replace(/-+/g, '-')       // Collapse multiple hyphens
                    .replace(/^-|-$/g, '');    // Remove leading/trailing hyphens
            }
        }

        // Validate that we have a valid slug
        if (!communitySlug || typeof communitySlug !== 'string' || communitySlug.trim() === '') {
            console.error(`[THUNDERSTORE] Could not generate valid community slug from title: "${game.title}"`);
            return {
                success: false,
                error: `Could not determine Thunderstore community for "${game.title}". Please set it manually via console: await window.electronAPI.setThunderstoreCommunity(${gameId}, 'community-name')`
            };
        }

        console.log(`[THUNDERSTORE] Game lookup: title="${game.title}", thunderstore_community="${game.thunderstore_community}", using slug="${communitySlug}"`);

        // Packages to exclude from verbose logging (mod managers, etc.)
        const LOG_EXCLUDE_PACKAGES = ['r2modman', 'thunderstore-cli'];

        // Use community-specific API endpoint
        const apiUrl = `https://thunderstore.io/c/${communitySlug}/api/v1/package/`;
        console.log(`[THUNDERSTORE] API URL: ${apiUrl}`);

        // Make HTTPS request
        const response = await new Promise((resolve, reject) => {
            const request = https.get(apiUrl, { timeout: 10000 }, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        // Even if status is not 200, still try to parse JSON for error messages
                        const parsedData = data ? JSON.parse(data) : null;
                        resolve({
                            status: res.statusCode,
                            data: parsedData
                        });
                    } catch (e) {
                        console.error('[THUNDERSTORE] Failed to parse JSON response:', e.message);
                        reject(new Error(`Invalid JSON response from Thunderstore API: ${e.message}`));
                    }
                });
            });

            request.on('error', (err) => {
                console.error('[THUNDERSTORE] HTTP request error:', err.message);
                reject(new Error(`Network error: ${err.message}`));
            });

            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Request timed out after 10 seconds'));
            });
        });

        if (response.status === 200 && response.data) {
            // Validate that response.data is an array
            if (!Array.isArray(response.data)) {
                console.error('[THUNDERSTORE] API returned non-array data:', typeof response.data);
                return {
                    success: false,
                    error: 'Invalid response format from Thunderstore API'
                };
            }

            console.log(`[THUNDERSTORE] Fetched ${response.data.length} packages for community "${communitySlug}"`);

            // Debug: Log first non-excluded package
            if (response.data.length > 0) {
                const samplePackage = response.data.find(pkg =>
                    pkg && pkg.name && pkg.full_name &&
                    !LOG_EXCLUDE_PACKAGES.some(excluded =>
                        pkg.name?.toLowerCase()?.includes(excluded.toLowerCase()) ||
                        pkg.full_name?.toLowerCase()?.includes(excluded.toLowerCase())
                    )
                );
                if (samplePackage) {
                    console.log('[THUNDERSTORE] Sample package:', samplePackage.full_name);
                }
            }

            // No filtering needed - the API already returns only packages for this community!
            const packages = response.data;

            // Show a few example packages (excluding r2modman)
            const examplePackages = packages
                .slice(0, 5)
                .filter(pkg =>
                    pkg && pkg.full_name &&
                    !LOG_EXCLUDE_PACKAGES.some(excluded =>
                        pkg.name?.toLowerCase()?.includes(excluded.toLowerCase()) ||
                        pkg.full_name?.toLowerCase()?.includes(excluded.toLowerCase())
                    )
                );
            if (examplePackages.length > 0) {
                console.log(`[THUNDERSTORE] Sample packages:`, examplePackages.map(p => p.full_name));
            }

            // Map packages to our format, filtering out any invalid entries
            const validPackages = packages
                .filter(pkg => pkg && pkg.name && pkg.full_name && pkg.owner)
                .map(pkg => ({
                    name: pkg.name,
                    fullName: pkg.full_name,
                    owner: pkg.owner,
                    packageUrl: pkg.package_url || '',
                    description: pkg.description || '',
                    version: pkg.versions && pkg.versions.length > 0 ? pkg.versions[0].version_number : '1.0.0',
                    downloads: pkg.versions && pkg.versions.length > 0 ? pkg.versions[0].downloads : 0,
                    rating: pkg.rating_score || 0,
                    isDeprecated: pkg.is_deprecated || false,
                    isPinned: pkg.is_pinned || false,
                    categories: pkg.categories || [],
                    iconUrl: pkg.versions && pkg.versions.length > 0 ? pkg.versions[0].icon : null,
                    websiteUrl: pkg.website_url || '',
                    dateCreated: pkg.date_created || '',
                    dateUpdated: pkg.date_updated || '',
                    // Detect if it's a modpack (usually has "pack" in categories or name)
                    isModpack: (pkg.categories && pkg.categories.some(cat =>
                        cat.toLowerCase().includes('modpack') ||
                        cat.toLowerCase().includes('pack')
                    )) || pkg.name.toLowerCase().includes('pack')
                }));

            return {
                success: true,
                mods: validPackages
            };
        }

        // Handle non-200 status codes
        if (response.status === 404) {
            console.error(`[THUNDERSTORE] Community "${communitySlug}" not found (404)`);
            return {
                success: false,
                error: `Community "${communitySlug}" not found on Thunderstore. Try setting the correct community name via console: await window.electronAPI.setThunderstoreCommunity(gameId, 'community-name')`
            };
        }

        return { success: false, error: `Failed to fetch from Thunderstore (HTTP ${response.status})` };
    } catch (error) {
        console.error('[THUNDERSTORE] Error searching Thunderstore:', error);
        return { success: false, error: error.message };
    }
});

// Set the Thunderstore community name for a game
ipcMain.handle('set-thunderstore-community', async (event, gameId, communityName) => {
    const db = initDatabase();
    try {
        // Validate game exists
        const game = db.prepare('SELECT id FROM games WHERE id = ?').get(gameId);
        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        // Update thunderstore_community field
        // Normalize: trim, lowercase, treat empty/null/"null" as null
        let normalizedCommunity = null;
        if (communityName && typeof communityName === 'string') {
            const trimmed = communityName.trim().toLowerCase();
            if (trimmed && trimmed !== 'null') {
                normalizedCommunity = trimmed;
            }
        }

        db.prepare('UPDATE games SET thunderstore_community = ? WHERE id = ?').run(normalizedCommunity, gameId);

        console.log(`[THUNDERSTORE] Set community for game ${gameId} to: ${normalizedCommunity}`);
        return { success: true };
    } catch (error) {
        console.error('[THUNDERSTORE] Error setting Thunderstore community:', error);
        return { success: false, error: error.message };
    } finally {
        db.close();
    }
});

// Install a mod from Thunderstore
ipcMain.handle('install-thunderstore-mod', async (event, gameId, modPackage) => {
    try {
        // Validate modPackage
        if (!modPackage || !modPackage.packageUrl || !modPackage.name || !modPackage.fullName) {
            return { success: false, error: 'Invalid mod package data' };
        }

        const db = initDatabase();
        let game;
        try {
            game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        } finally {
            db.close();
        }

        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        if (!game.install_directory || !fs.existsSync(game.install_directory)) {
            return { success: false, error: 'Game installation directory not found' };
        }

        const https = require('https');
        const AdmZip = require('adm-zip');

        // Get the latest version download URL
        const packageUrl = modPackage.packageUrl;
        const response = await new Promise((resolve, reject) => {
            const request = https.get(packageUrl, { timeout: 10000 }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const parsedData = data ? JSON.parse(data) : null;
                        resolve({ status: res.statusCode, data: parsedData });
                    } catch (e) {
                        reject(new Error(`Invalid JSON response: ${e.message}`));
                    }
                });
            });

            request.on('error', (err) => {
                reject(new Error(`Network error: ${err.message}`));
            });

            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Request timed out'));
            });
        });

        if (response.status !== 200) {
            return { success: false, error: `Failed to fetch mod info (HTTP ${response.status})` };
        }

        if (!response.data || !response.data.latest || !response.data.latest.download_url) {
            return { success: false, error: 'Could not find mod download URL in response' };
        }

        const downloadUrl = response.data.latest.download_url;

        // Download the mod
        const modResponse = await new Promise((resolve, reject) => {
            const request = https.get(downloadUrl, { timeout: 30000 }, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    resolve({ status: res.statusCode, data: Buffer.concat(chunks) });
                });
            });

            request.on('error', (err) => {
                reject(new Error(`Download error: ${err.message}`));
            });

            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Download timed out'));
            });
        });

        if (modResponse.status !== 200) {
            return { success: false, error: `Failed to download mod (HTTP ${modResponse.status})` };
        }

        // Determine installation path based on mod loader
        let installPath;
        const bepInExPath = path.join(game.install_directory, 'BepInEx', 'plugins');
        const melonLoaderPath = path.join(game.install_directory, 'Mods');

        if (fs.existsSync(bepInExPath)) {
            installPath = bepInExPath;
        } else if (fs.existsSync(melonLoaderPath)) {
            installPath = melonLoaderPath;
        } else {
            // Create BepInEx plugins folder by default
            installPath = bepInExPath;
            fs.mkdirSync(installPath, { recursive: true });
        }

        // Extract the mod
        const zip = new AdmZip(modResponse.data);
        const modFolderName = modPackage.fullName.replace(/\//g, '-');
        const extractPath = path.join(installPath, modFolderName);

        zip.extractAllTo(extractPath, true);

        return {
            success: true,
            message: `Mod ${modPackage.name} installed successfully to ${extractPath}`
        };
    } catch (error) {
        console.error('Error installing Thunderstore mod:', error);
        return { success: false, error: error.message };
    }
});

// Install BepInEx for Unity games
ipcMain.handle('install-bepinex', async (event, gameId) => {
    try {
        const db = initDatabase();
        let game;
        try {
            game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        } finally {
            db.close();
        }

        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        if (!game.install_directory || !fs.existsSync(game.install_directory)) {
            return { success: false, error: 'Game installation directory not found' };
        }

        // Check if already installed
        const bepInExPath = path.join(game.install_directory, 'BepInEx');
        if (fs.existsSync(bepInExPath)) {
            return { success: true, message: 'BepInEx is already installed', alreadyInstalled: true };
        }

        const https = require('https');
        const AdmZip = require('adm-zip');

        // Get latest BepInEx release
        const options = {
            hostname: 'api.github.com',
            path: '/repos/BepInEx/BepInEx/releases/latest',
            headers: { 'User-Agent': 'CoverFlow-Game-Launcher' }
        };

        const release = await new Promise((resolve, reject) => {
            const req = https.get(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse GitHub API response'));
                    }
                });
            });
            req.on('error', reject);
        });

        // Find the x64 Windows version (exclude Linux, Unix, Mac)
        const asset = release.assets.find(a =>
            a.name.includes('x64') &&
            a.name.endsWith('.zip') &&
            !a.name.toLowerCase().includes('linux') &&
            !a.name.toLowerCase().includes('unix') &&
            !a.name.toLowerCase().includes('macos') &&
            !a.name.toLowerCase().includes('osx')
        );
        if (!asset) {
            return { success: false, error: 'Could not find BepInEx Windows x64 download' };
        }

        console.log('[BEPINEX] Selected asset:', asset.name);

        // Download BepInEx (handle redirects)
        const downloadResponse = await new Promise((resolve, reject) => {
            const followRedirect = (url) => {
                const urlModule = url.startsWith('https:') ? https : require('http');
                const req = urlModule.get(url, { timeout: 60000 }, (res) => {
                    // Handle redirects
                    if (res.statusCode === 302 || res.statusCode === 301) {
                        console.log('[BEPINEX] Following redirect to:', res.headers.location);
                        followRedirect(res.headers.location);
                        return;
                    }

                    if (res.statusCode !== 200) {
                        reject(new Error(`Download failed with status ${res.statusCode}`));
                        return;
                    }

                    const chunks = [];
                    res.on('data', (chunk) => chunks.push(chunk));
                    res.on('end', () => resolve(Buffer.concat(chunks)));
                });
                req.on('error', reject);
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Download timed out'));
                });
            };
            followRedirect(asset.browser_download_url);
        });

        // Extract BepInEx
        const zip = new AdmZip(downloadResponse);
        zip.extractAllTo(game.install_directory, true);

        return {
            success: true,
            message: `BepInEx ${release.tag_name} installed successfully`
        };
    } catch (error) {
        console.error('[BEPINEX] Installation error:', error);
        return { success: false, error: error.message };
    }
});

// Install MelonLoader for Unity games
ipcMain.handle('install-melonloader', async (event, gameId) => {
    try {
        const db = initDatabase();
        let game;
        try {
            game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        } finally {
            db.close();
        }

        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        if (!game.install_directory || !fs.existsSync(game.install_directory)) {
            return { success: false, error: 'Game installation directory not found' };
        }

        // Check if already installed
        const melonLoaderPath = path.join(game.install_directory, 'MelonLoader');
        if (fs.existsSync(melonLoaderPath)) {
            return { success: true, message: 'MelonLoader is already installed', alreadyInstalled: true };
        }

        const https = require('https');
        const AdmZip = require('adm-zip');

        // Get latest MelonLoader release
        const options = {
            hostname: 'api.github.com',
            path: '/repos/LavaGang/MelonLoader/releases/latest',
            headers: { 'User-Agent': 'CoverFlow-Game-Launcher' }
        };

        const release = await new Promise((resolve, reject) => {
            const req = https.get(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse GitHub API response'));
                    }
                });
            });
            req.on('error', reject);
        });

        // Find the x64 Windows version (exclude Linux, Unix, Mac)
        const asset = release.assets.find(a =>
            a.name.includes('x64') &&
            a.name.endsWith('.zip') &&
            !a.name.toLowerCase().includes('linux') &&
            !a.name.toLowerCase().includes('unix') &&
            !a.name.toLowerCase().includes('macos') &&
            !a.name.toLowerCase().includes('osx')
        );
        if (!asset) {
            return { success: false, error: 'Could not find MelonLoader Windows x64 download' };
        }

        console.log('[MELONLOADER] Selected asset:', asset.name);

        // Download MelonLoader (handle redirects)
        const downloadResponse = await new Promise((resolve, reject) => {
            const followRedirect = (url) => {
                const urlModule = url.startsWith('https:') ? https : require('http');
                const req = urlModule.get(url, { timeout: 60000 }, (res) => {
                    // Handle redirects
                    if (res.statusCode === 302 || res.statusCode === 301) {
                        console.log('[MELONLOADER] Following redirect to:', res.headers.location);
                        followRedirect(res.headers.location);
                        return;
                    }

                    if (res.statusCode !== 200) {
                        reject(new Error(`Download failed with status ${res.statusCode}`));
                        return;
                    }

                    const chunks = [];
                    res.on('data', (chunk) => chunks.push(chunk));
                    res.on('end', () => resolve(Buffer.concat(chunks)));
                });
                req.on('error', reject);
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Download timed out'));
                });
            };
            followRedirect(asset.browser_download_url);
        });

        // Extract MelonLoader
        const zip = new AdmZip(downloadResponse);
        zip.extractAllTo(game.install_directory, true);

        return {
            success: true,
            message: `MelonLoader ${release.tag_name} installed successfully`
        };
    } catch (error) {
        console.error('[MELONLOADER] Installation error:', error);
        return { success: false, error: error.message };
    }
});

console.log('CoverFlow Game Launcher - Electron app starting...');
// Redacted sensitive paths for security
if (isDev) {
    console.log('Development mode - Game data path:', gameDataPath);
    console.log('Development mode - Database path:', dbPath);
}

// App lifecycle handlers for playtime tracking
app.on('before-quit', () => {
    console.log('[PLAYTIME] App closing, ending all active sessions');
    stopSessionCleanupMonitor();
    endAllActiveSessions();
    shutdownProcessTracker();
    cleanupAllTimers();
});

app.on('will-quit', () => {
    console.log('[PLAYTIME] App quitting');
    stopSessionCleanupMonitor();
    endAllActiveSessions();
    shutdownProcessTracker();
    cleanupAllTimers();
});

// Handle window close
app.on('window-all-closed', () => {
    stopSessionCleanupMonitor();
    endAllActiveSessions();
    shutdownProcessTracker();
    cleanupAllTimers();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});