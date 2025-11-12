// ADD THIS TO COVERFLOW.JS CONSTRUCTOR (after line 39):

        // Detect if running in Electron or browser
        this.isElectron = typeof window.electronAPI !== 'undefined';
        console.log(`Running in ${this.isElectron ? 'Electron' : 'Browser'} mode`);

        // Setup Electron IPC listeners if in Electron mode
        if (this.isElectron) {
            window.electronAPI.onScanProgress((status) => {
                this.updateScanProgress(status);
            });
            window.electronAPI.onScanComplete((status) => {
                this.handleScanComplete(status);
            });
        }


// REPLACE checkServerStatus() method (around line 737):

    async checkServerStatus() {
        if (this.isElectron) {
            // In Electron mode, always available
            this.serverAvailable = true;
            const count = await window.electronAPI.getGamesCount();
            if (count.success) {
                document.getElementById('game-count-info').innerHTML =
                    `<span style="color: #4CAF50;">✓ Desktop Mode</span> - ${count.total} games found`;
            }
            return;
        }

        // Browser mode - check Flask server
        try {
            const response = await fetch(`${this.serverURL}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                this.serverAvailable = true;
                document.getElementById('server-status').textContent = '✓ Connected';
                document.getElementById('server-status').style.color = '#4CAF50';

                const countResponse = await fetch(`${this.serverURL}/api/games/count`);
                if (countResponse.ok) {
                    const data = await countResponse.json();
                    const statusText = `${data.total} games found`;
                    document.getElementById('game-count-info').innerHTML =
                        `<span style="color: #4CAF50;">✓ Connected</span> - ${statusText}`;
                }
            } else {
                throw new Error('Server not responding');
            }
        } catch (error) {
            this.serverAvailable = false;
            document.getElementById('server-status').textContent = '✗ Not running';
            document.getElementById('server-status').style.color = '#f44336';
            document.getElementById('game-count-info').innerHTML =
                `<span style="color: #f44336;">✗ Server not running</span> - <a href="#" onclick="window.open('GAMES_INTEGRATION.md'); return false;" style="color: #667eea;">Setup Guide</a>`;
        }
    }


// REPLACE startGameScan() method (around line 770):

    async startGameScan() {
        if (this.isElectron) {
            // Electron mode - use IPC
            const result = await window.electronAPI.startScan();
            if (result.success) {
                this.showToast('Game scan started...', 'info');
                document.getElementById('scan-progress-group').style.display = 'block';
                document.getElementById('scan-games-btn').disabled = true;
            } else {
                this.showToast(result.error || 'Failed to start scan', 'error');
            }
            return;
        }

        // Browser mode - existing code
        if (!this.serverAvailable) {
            this.showToast('Game scanner server is not running. Please start the server first.', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.serverURL}/api/scan/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                this.showToast('Game scan started...', 'info');
                document.getElementById('scan-progress-group').style.display = 'block';
                document.getElementById('scan-games-btn').disabled = true;
                this.pollScanStatus();
            } else {
                const error = await response.json();
                this.showToast(error.error || 'Failed to start scan', 'error');
            }
        } catch (error) {
            console.error('Scan start error:', error);
            this.showToast('Failed to start game scan', 'error');
        }
    }


// ADD NEW METHODS (after startGameScan):

    // Handle scan progress updates from Electron
    updateScanProgress(status) {
        if (!this.isElectron) return;

        const statusText = document.getElementById('scan-status-text');
        const progressBar = document.getElementById('scan-progress-bar');

        if (statusText) statusText.textContent = status.message;
        if (progressBar) progressBar.style.width = status.progress + '%';
    }

    // Handle scan completion from Electron
    async handleScanComplete(status) {
        if (!this.isElectron) return;

        setTimeout(() => {
            document.getElementById('scan-progress-group').style.display = 'none';
            document.getElementById('scan-games-btn').disabled = false;
        }, 2000);

        if (status.error) {
            this.showToast(`Scan failed: ${status.error}`, 'error');
        } else {
            this.showToast(status.message, 'success');
            await this.reloadGamesFromServer();
        }

        this.checkServerStatus();
    }


// REPLACE reloadGamesFromServer() method (around line 855):

    async reloadGamesFromServer() {
        if (this.isElectron) {
            // Electron mode - use IPC
            try {
                const result = await window.electronAPI.getGames();
                if (!result.success) {
                    this.showToast('Failed to load games', 'error');
                    return;
                }

                const games = result.games || [];
                if (games.length === 0) {
                    this.showToast('No games found. Run a scan first.', 'info');
                    return;
                }

                // Remove existing games
                this.allAlbums = this.allAlbums.filter(item => item.type !== 'game');
                this.filteredAlbums = this.filteredAlbums.filter(item => item.type !== 'game');

                // Convert games
                const platformColors = {
                    'steam': 0x1B2838,
                    'epic': 0x313131,
                    'xbox': 0x107C10
                };

                const convertedGames = games.map(game => ({
                    type: 'game',
                    title: game.title,
                    platform: game.platform,
                    developer: game.developer || 'Unknown',
                    publisher: game.publisher || 'Unknown',
                    year: game.release_date ? new Date(game.release_date).getFullYear().toString() : '-',
                    genre: Array.isArray(game.genres) ? game.genres.join(', ') : game.genres || '-',
                    description: game.description || game.short_description || game.long_description || 'No description available.',
                    color: platformColors[game.platform] || 0x808080,
                    image: game.boxart_path || game.icon_path,
                    launchCommand: game.launch_command,
                    installDir: game.install_directory,
                    appId: game.app_id || game.package_name
                }));

                // Merge
                this.allAlbums = [...this.allAlbums, ...convertedGames];
                this.filteredAlbums = [...this.allAlbums];
                document.getElementById('total-albums').textContent = this.filteredAlbums.length;

                // Recreate UI
                this.createCovers();
                this.createThumbnails();
                this.updateInfo();

                this.showToast(`Loaded ${convertedGames.length} games!`, 'success');
            } catch (error) {
                console.error('Reload games error:', error);
                this.showToast('Failed to load games', 'error');
            }
            return;
        }

        // Browser mode - existing code
        if (!this.serverAvailable) {
            this.showToast('Server not available', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.serverURL}/api/games`);
            if (response.ok) {
                const data = await response.json();
                const games = data.games || [];

                if (games.length === 0) {
                    this.showToast('No games found. Run a scan first.', 'info');
                    return;
                }

                // Remove existing games from the list
                this.allAlbums = this.allAlbums.filter(item => item.type !== 'game');
                this.filteredAlbums = this.filteredAlbums.filter(item => item.type !== 'game');

                // Convert and add games
                const platformColors = {
                    'steam': 0x1B2838,
                    'epic': 0x313131,
                    'xbox': 0x107C10
                };

                const convertedGames = games.map(game => ({
                    type: 'game',
                    title: game.title,
                    platform: game.platform,
                    developer: game.developer || 'Unknown',
                    publisher: game.publisher || 'Unknown',
                    year: game.release_date ? new Date(game.release_date).getFullYear().toString() : '-',
                    genre: Array.isArray(game.genres) ? game.genres.join(', ') : game.genres || '-',
                    description: game.description || game.short_description || game.long_description || 'No description available.',
                    color: platformColors[game.platform] || 0x808080,
                    image: game.boxart_path ? `${this.serverURL}/${game.boxart_path}` : (game.icon_path ? `${this.serverURL}/${game.icon_path}` : null),
                    launchCommand: game.launch_command,
                    installDir: game.install_directory,
                    appId: game.app_id || game.package_name
                }));

                // Merge with existing albums/images
                this.allAlbums = [...this.allAlbums, ...convertedGames];
                this.filteredAlbums = [...this.allAlbums];
                document.getElementById('total-albums').textContent = this.filteredAlbums.length;

                // Recreate UI
                this.createCovers();
                this.createThumbnails();
                this.updateInfo();

                this.showToast(`Loaded ${convertedGames.length} games from server!`, 'success');
            } else {
                this.showToast('Failed to load games from server', 'error');
            }
        } catch (error) {
            console.error('Reload games error:', error);
            this.showToast('Failed to connect to server', 'error');
        }
    }


// REPLACE launchGame() method (around line 715):

    launchGame(game) {
        if (!game.launchCommand) {
            this.showToast('No launch command available for this game', 'error');
            return;
        }

        console.log('Launching game:', game.title, 'with command:', game.launchCommand);

        if (this.isElectron) {
            // Use Electron shell API
            window.electronAPI.launchGame(game.launchCommand).then(result => {
                if (result.success) {
                    this.showToast(`Launching ${game.title}...`, 'success');
                } else {
                    this.showToast('Failed to launch game', 'error');
                }
            });
        } else {
            // Browser mode - try URL protocols
            if (game.launchCommand.startsWith('steam://') ||
                game.launchCommand.startsWith('com.epicgames.launcher://') ||
                game.launchCommand.startsWith('xbox://')) {
                window.location.href = game.launchCommand;
                this.showToast(`Launching ${game.title}...`, 'success');
            } else {
                this.showToast('Game launching is platform-specific. Please use your game launcher.', 'info');
                console.log('Platform:', game.platform);
                console.log('Launch command:', game.launchCommand);
            }
        }
    }
