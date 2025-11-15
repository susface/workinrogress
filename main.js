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
            size_on_disk, last_updated, genres, metadata, updated_at
        ) VALUES (
            @platform, @title, @app_id, @package_name, @install_directory,
            @launch_command, @description, @short_description, @long_description,
            @developer, @publisher, @release_date, @icon_path, @boxart_path,
            @size_on_disk, @last_updated, @genres, @metadata, datetime('now')
        )
    `);

    const insertMany = db.transaction((games) => {
        for (const game of games) {
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
                size_on_disk: game.size_on_disk || 0,
                last_updated: game.last_updated || 0,
                genres: JSON.stringify(game.genres || []),
                metadata: JSON.stringify({})
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

// Launch game with session tracking
ipcMain.handle('launch-game', async (event, launchCommand, gameId) => {
    try {
        // Start game session if gameId provided
        if (gameId) {
            const db = initDatabase();
            const stmt = db.prepare(`
                INSERT INTO game_sessions (game_id, start_time)
                VALUES (?, CURRENT_TIMESTAMP)
            `);
            const result = stmt.run(gameId);
            const sessionId = result.lastInsertId;

            // Update launch count and last played
            db.prepare(`
                UPDATE games
                SET launch_count = launch_count + 1,
                    last_played = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(gameId);

            db.close();

            // Store active session
            activeGameSessions.set(gameId, sessionId);
        }

        await shell.openExternal(launchCommand);
        return { success: true };
    } catch (error) {
        console.error('Error launching game:', error);
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

        const db = initDatabase();

        // Update session end time and calculate duration
        db.prepare(`
            UPDATE game_sessions
            SET end_time = CURRENT_TIMESTAMP,
                duration = (julianday(CURRENT_TIMESTAMP) - julianday(start_time)) * 86400
            WHERE id = ?
        `).run(sessionId);

        // Get duration and update total play time
        const session = db.prepare('SELECT game_id, duration FROM game_sessions WHERE id = ?').get(sessionId);

        if (session && session.duration) {
            db.prepare(`
                UPDATE games
                SET total_play_time = total_play_time + ?
                WHERE id = ?
            `).run(Math.floor(session.duration), gameId);
        }

        db.close();
        activeGameSessions.delete(gameId);

        return { success: true };
    } catch (error) {
        console.error('Error ending game session:', error);
        return { success: false, error: error.message };
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

console.log('CoverFlow Game Launcher - Electron app starting...');
// Redacted sensitive paths for security
if (isDev) {
    console.log('Development mode - Game data path:', gameDataPath);
    console.log('Development mode - Database path:', dbPath);
}
