const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Simple VDF parser for Steam appmanifest files
 * Handles basic key-value pairs and nested objects with curly braces
 */
function parseVdf(content) {
    const result = {};
    const lines = content.split('\n');
    const stack = [result];
    let currentKey = null;

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('//')) continue;

        if (line === '{') {
            const newObj = {};
            if (currentKey) {
                stack[stack.length - 1][currentKey] = newObj;
                stack.push(newObj);
                currentKey = null;
            }
        } else if (line === '}') {
            stack.pop();
        } else {
            // Match "key" "value" or "key"
            const match = line.match(/"([^"]+)"\s*(?:"([^"]*)")?/);
            if (match) {
                const key = match[1];
                const value = match[2];

                if (value !== undefined) {
                    stack[stack.length - 1][key] = value;
                } else {
                    currentKey = key;
                }
            }
        }
    }
    return result;
}

/**
 * Game Update Checker Module
 * Checks for game updates on Steam, Epic, and Xbox platforms
 */
class GameUpdater {
    constructor() {
        this.updateCache = new Map(); // gameId -> { available, timestamp, version }
    }

    /**
     * Check for updates for a list of games
     * @param {Array} games - List of game objects from the database
     * @returns {Promise<Array>} - List of games with available updates
     */
    async checkForUpdates(games) {
        const updates = [];
        console.log(`[UPDATE_CHECK] Checking for updates for ${games.length} games...`);

        // Group games by platform to batch requests if needed
        const steamGames = games.filter(g => g.platform === 'steam');
        const epicGames = games.filter(g => g.platform === 'epic');
        const xboxGames = games.filter(g => g.platform === 'xbox');

        // Check Steam games
        for (const game of steamGames) {
            try {
                const update = await this.checkSteamUpdate(game);
                if (update) updates.push(update);
            } catch (e) {
                console.error(`[UPDATE_CHECK] Error checking Steam update for ${game.title}:`, e);
            }
        }

        // Check Epic games
        for (const game of epicGames) {
            try {
                const update = await this.checkEpicUpdate(game);
                if (update) updates.push(update);
            } catch (e) {
                console.error(`[UPDATE_CHECK] Error checking Epic update for ${game.title}:`, e);
            }
        }

        // Check Xbox games
        for (const game of xboxGames) {
            try {
                const update = await this.checkXboxUpdate(game);
                if (update) updates.push(update);
            } catch (e) {
                console.error(`[UPDATE_CHECK] Error checking Xbox update for ${game.title}:`, e);
            }
        }

        return updates;
    }

    /**
     * Check for Steam game updates
     * Relies on the local appmanifest file's StateFlags
     * StateFlags & 4 (k_EAppStateUpdateRequired) indicates an update is available/required
     */
    async checkSteamUpdate(game) {
        if (!game.install_directory || !game.app_id) return null;

        try {
            // Steam appmanifest is usually in the parent directory of the installation
            // install_directory usually points to steamapps/common/GameName
            // We need steamapps/appmanifest_{appid}.acf
            const commonDir = path.dirname(game.install_directory); // steamapps/common
            const steamappsDir = path.dirname(commonDir); // steamapps
            const manifestPath = path.join(steamappsDir, `appmanifest_${game.app_id}.acf`);

            if (fs.existsSync(manifestPath)) {
                const content = await fs.promises.readFile(manifestPath, 'utf8');
                const manifest = parseVdf(content);
                const appState = manifest.AppState || manifest;

                if (appState) {
                    const stateFlags = parseInt(appState.StateFlags || '0', 10);
                    // 4 = UpdateRequired, 8 = UpdatePending
                    if ((stateFlags & 4) !== 0 || (stateFlags & 8) !== 0) {
                        return {
                            id: game.id,
                            title: game.title,
                            platform: 'steam',
                            update_available: true,
                            current_version: appState.buildid || 'Unknown',
                            new_version: 'New Build Available'
                        };
                    }

                    // Optional: Check public Steam API for latest build ID?
                    // Without an API key or specific endpoint, it's unreliable.
                    // However, we can use https://api.steamcmd.net/v1/info/{appid} if we want.
                    // For now, local manifest check is the most "production-ready" without external deps.
                }
            }
        } catch (e) {
            console.error(`[UPDATE_CHECK] Failed to read Steam manifest for ${game.title}:`, e);
        }
        return null;
    }

    /**
     * Check for Epic game updates
     * Epic games usually update automatically, but we can check the manifest
     * for version info and potentially query an API.
     */
    async checkEpicUpdate(game) {
        // Epic scanning logic in epic_scanner.py parses manifests.
        // We can try to find the manifest for this game.
        // For simplicity, we assume Epic Launcher handles updates well.
        // But if we want to "detect" it, we can look for .item files in Manifests folder
        // if we can locate it.

        // Since we don't store the manifest path in DB, we'll try to guess or use the API
        // If we have 'namespace' and 'catalog_item_id' (which epic_scanner.py saves in DB metadata?),
        // we could query Epic API.

        // Let's check metadata
        let metadata = {};
        try {
            if (game.metadata) {
                metadata = JSON.parse(game.metadata);
            }
        } catch (e) {}

        const namespace = metadata.namespace || game.package_name; // package_name might hold app_name
        const itemId = metadata.catalog_item_id;

        if (namespace && itemId) {
            try {
                // Try to fetch latest version info
                // Note: Epic API catalogOffer doesn't easily expose a simple version string to compare against.
                // We fetch it here as a placeholder for when we can map it to local version.
                // Currently, we just log it for debugging and assume no update if we can't be sure.
                await this.fetchEpicLatestVersion(namespace, itemId);

                // TODO: Implement version comparison if Epic exposes build version or if we can read local Manifests more reliably.
                // For now, we return null to assume no update is available rather than false positive.
            } catch (e) {
                // Ignore network errors
            }
        }
        return null;
    }

    /**
     * Check for Xbox game updates
     * Microsoft Store handles updates.
     */
    async checkXboxUpdate(game) {
        // Checking for Xbox updates programmatically without Store context is difficult.
        // We return null as safe default.
        return null;
    }

    /**
     * Fetch latest version from Epic API
     */
    fetchEpicLatestVersion(namespace, itemId) {
        return new Promise((resolve, reject) => {
            const query = `
            query catalogQuery($namespace: String!, $itemId: String!) {
                Catalog {
                    catalogOffer(namespace: $namespace, id: $itemId) {
                        releaseDate
                        expiryDate
                    }
                }
            }`;

            const requestData = JSON.stringify({
                query,
                variables: { namespace, itemId }
            });

            const req = https.request('https://graphql.epicgames.com/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': requestData.length
                },
                timeout: 5000
            }, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Status ${res.statusCode}`));
                    return;
                }
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.write(requestData);
            req.end();
        });
    }
}

module.exports = new GameUpdater();
