const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');

let mainWindow;
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
            UNIQUE(platform, title)
        )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_platform ON games(platform)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_title ON games(title)');

    return db;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
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

app.whenReady().then(() => {
    ensureDirectories();
    createWindow();

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

        // Parse JSON fields
        const parsedGames = games.map(game => {
            const parsed = { ...game };
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
                if (output.includes('STEAM')) scanStatus.current_platform = 'steam';
                else if (output.includes('EPIC')) scanStatus.current_platform = 'epic';
                else if (output.includes('XBOX')) scanStatus.current_platform = 'xbox';

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
            resolve({ success: false, error: scanStatus.error });
            scanningProcess = null;
        });

        scanningProcess.on('close', (code) => {
            scanStatus.scanning = false;
            scanStatus.progress = 100;

            if (code === 0) {
                // Load games into database
                loadGamesFromJSON().then(count => {
                    scanStatus.total_games = count;
                    scanStatus.message = `Scan complete! Found ${count} games`;
                    mainWindow?.webContents.send('scan-complete', scanStatus);
                    resolve({ success: true, message: scanStatus.message });
                });
            } else {
                scanStatus.error = `Scanner exited with code ${code}`;
                scanStatus.message = 'Scan failed';
                mainWindow?.webContents.send('scan-complete', scanStatus);
                resolve({ success: false, error: scanStatus.error });
            }

            scanningProcess = null;
        });

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
        const fileContent = fs.readFileSync(jsonPath, 'utf8');
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

// Launch game
ipcMain.handle('launch-game', async (event, launchCommand) => {
    try {
        const { shell } = require('electron');
        await shell.openExternal(launchCommand);
        return { success: true };
    } catch (error) {
        console.error('Error launching game:', error);
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

        fs.appendFileSync(errorLogPath, fullEntry, 'utf8');
        return { success: true };
    } catch (error) {
        console.error('Failed to write error log:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-error-log', async () => {
    try {
        if (fs.existsSync(errorLogPath)) {
            const content = fs.readFileSync(errorLogPath, 'utf8');
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

console.log('CoverFlow Game Launcher - Electron app starting...');
console.log('Game data path:', gameDataPath);
console.log('Database path:', dbPath);
console.log('Error log path:', errorLogPath);
