const { app, BrowserWindow, ipcMain, dialog, shell, Notification, Tray, Menu } = require('electron');
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

// Paths
const isDev = !app.isPackaged;
const appPath = isDev ? __dirname : process.resourcesPath;
const gameDataPath = path.join(app.getPath('userData'), 'game_data');
const dbPath = path.join(gameDataPath, 'games.db');
const iconsPath = path.join(gameDataPath, 'icons');
const boxartPath = path.join(gameDataPath, 'boxart');

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
            UNIQUE(platform, title)
        )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_platform ON games(platform)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_title ON games(title)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_last_played ON games(last_played)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_is_favorite ON games(is_favorite)');
    // Index for optimized duplicate detection
    db.exec('CREATE INDEX IF NOT EXISTS idx_title_normalized ON games(LOWER(TRIM(title)))');

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

    return db;
}

function createWindow() {
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
        backgroundColor: '#000000',
        show: false,
        autoHideMenuBar: true
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
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

            // Set up minimize to tray behavior (only if tray was successfully created)
            if (mainWindow) {
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
            }
        } catch (error) {
            console.error('Failed to create system tray:', error);
        }
    }
}

app.whenReady().then(() => {
    ensureDirectories();
    createWindow();
    createTray();

    // Initialize process tracker for accurate playtime monitoring
    // Wait a bit for the window to be ready
    setTimeout(() => {
        initProcessTracker();
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
                } catch (e) {}
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
            size_on_disk, last_updated, genres, metadata, has_vr_support, updated_at
        ) VALUES (
            @platform, @title, @app_id, @package_name, @install_directory,
            @launch_command, @description, @short_description, @long_description,
            @developer, @publisher, @release_date, @icon_path, @boxart_path,
            @exe_icon_path, @header_path,
            @size_on_disk, @last_updated, @genres, @metadata, @has_vr_support, datetime('now')
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
                has_vr_support: game.has_vr_support || 0
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
            setTimeout(() => {
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

// Launch game with session tracking
ipcMain.handle('launch-game', async (event, launchCommand, gameId) => {
    try {
        // Start game session if gameId provided
        if (gameId) {
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
                // Wait a bit for the game to launch
                setTimeout(async () => {
                    try {
                        // Try to find exe path in install directory
                        let exePath = '';
                        if (game.install_directory && fs.existsSync(game.install_directory)) {
                            // Look for .exe files in the install directory
                            const files = fs.readdirSync(game.install_directory);

                            // Filter out common utility exes
                            const skipExes = [
                                'createdump.exe', 'unins000.exe', 'uninstall.exe', 'setup.exe',
                                'updater.exe', 'launcher.exe', 'crash_reporter.exe', 'crashhandler.exe'
                            ];

                            const exeFiles = files
                                .filter(f => f.toLowerCase().endsWith('.exe'))
                                .filter(f => !skipExes.includes(f.toLowerCase()))
                                .map(f => {
                                    const fullPath = path.join(game.install_directory, f);
                                    const stats = fs.statSync(fullPath);
                                    return {
                                        name: f,
                                        path: fullPath,
                                        size: stats.size
                                    };
                                });

                            if (exeFiles.length > 0) {
                                // Prefer the largest exe (games are usually larger than utilities)
                                exeFiles.sort((a, b) => b.size - a.size);
                                exePath = exeFiles[0].path;
                            }
                        }

                        if (exePath) {
                            console.log(`[PROCESS_TRACKER] Starting tracking for ${game.title} at ${exePath}`);
                            await sendProcessTrackerCommand('start_tracking', {
                                session_id: sessionId,
                                exe_path: exePath,
                                game_name: game.title
                            });
                        } else {
                            console.log(`[PROCESS_TRACKER] Could not find exe for ${game.title}, tracking disabled`);
                        }
                    } catch (error) {
                        console.error('[PROCESS_TRACKER] Error starting tracking:', error);
                    }
                }, 3000); // Wait 3 seconds for game to launch
            }

            // Set up auto-end after 4 hours (safety timeout)
            setTimeout(() => {
                if (activeGameSessions.has(gameId) && activeGameSessions.get(gameId) === sessionId) {
                    console.log(`[PLAYTIME] Auto-ending session ${sessionId} after 4 hours`);
                    endGameSessionInternal(gameId, sessionId);
                }
            }, 4 * 60 * 60 * 1000); // 4 hours
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
    try {
        const db = initDatabase();
        const game = db.prepare('SELECT is_favorite FROM games WHERE id = ?').get(gameId);

        if (game) {
            const newStatus = game.is_favorite ? 0 : 1;
            db.prepare('UPDATE games SET is_favorite = ? WHERE id = ?').run(newStatus, gameId);
            db.close();
            return { success: true, is_favorite: Boolean(newStatus) };
        }

        db.close();
        return { success: false, error: 'Game not found' };
    } catch (error) {
        console.error('Error toggling favorite:', error);
        return { success: false, error: error.message };
    }
});

// Toggle hidden
ipcMain.handle('toggle-hidden', async (event, gameId) => {
    try {
        const db = initDatabase();
        const game = db.prepare('SELECT is_hidden FROM games WHERE id = ?').get(gameId);

        if (game) {
            const newStatus = game.is_hidden ? 0 : 1;
            db.prepare('UPDATE games SET is_hidden = ? WHERE id = ?').run(newStatus, gameId);
            db.close();
            return { success: true, is_hidden: Boolean(newStatus) };
        }

        db.close();
        return { success: false, error: 'Game not found' };
    } catch (error) {
        console.error('Error toggling hidden:', error);
        return { success: false, error: error.message };
    }
});

// Set rating
ipcMain.handle('set-rating', async (event, gameId, rating) => {
    try {
        // Validate rating
        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return { success: false, error: 'Rating must be a number between 1 and 5' };
        }

        const db = initDatabase();
        db.prepare('UPDATE games SET user_rating = ? WHERE id = ?').run(Math.floor(rating), gameId);
        db.close();
        return { success: true };
    } catch (error) {
        console.error('Error setting rating:', error);
        return { success: false, error: error.message };
    }
});

// Set notes
ipcMain.handle('set-notes', async (event, gameId, notes) => {
    try {
        // Validate notes
        if (notes !== null && notes !== undefined && typeof notes !== 'string') {
            return { success: false, error: 'Notes must be a string' };
        }

        // Limit notes length to prevent database bloat
        const MAX_NOTES_LENGTH = 5000;
        const validatedNotes = notes ? notes.substring(0, MAX_NOTES_LENGTH) : '';

        const db = initDatabase();
        db.prepare('UPDATE games SET user_notes = ? WHERE id = ?').run(validatedNotes, gameId);
        db.close();
        return { success: true };
    } catch (error) {
        console.error('Error setting notes:', error);
        return { success: false, error: error.message };
    }
});

// Set custom launch options
ipcMain.handle('set-custom-launch-options', async (event, gameId, options) => {
    try {
        // Validate launch options
        if (options !== null && options !== undefined && typeof options !== 'string') {
            return { success: false, error: 'Launch options must be a string' };
        }

        // Limit options length
        const MAX_OPTIONS_LENGTH = 500;
        const validatedOptions = options ? options.substring(0, MAX_OPTIONS_LENGTH) : '';

        const db = initDatabase();
        db.prepare('UPDATE games SET custom_launch_options = ? WHERE id = ?').run(validatedOptions, gameId);
        db.close();
        return { success: true };
    } catch (error) {
        console.error('Error setting custom launch options:', error);
        return { success: false, error: error.message };
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

console.log('CoverFlow Game Launcher - Electron app starting...');
// Redacted sensitive paths for security
if (isDev) {
    console.log('Development mode - Game data path:', gameDataPath);
    console.log('Development mode - Database path:', dbPath);
}

// App lifecycle handlers for playtime tracking
app.on('before-quit', () => {
    console.log('[PLAYTIME] App closing, ending all active sessions');
    endAllActiveSessions();
    shutdownProcessTracker();
});

app.on('will-quit', () => {
    console.log('[PLAYTIME] App quitting');
    endAllActiveSessions();
    shutdownProcessTracker();
});

// Handle window close
app.on('window-all-closed', () => {
    endAllActiveSessions();
    shutdownProcessTracker();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
