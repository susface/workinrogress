// Per-Game Music Integration Module
// Manages game-specific soundtracks with auto-detection and crossfading

class PerGameMusicManager {
    constructor() {
        this.currentAudio = null;
        this.nextAudio = null;
        this.musicLibrary = new Map(); // gameId -> music files
        this.settings = this.loadSettings();
        this.isEnabled = true;
        this.crossfadeDuration = 2000; // 2 seconds
        this.volume = 0.5;
        this.isCrossfading = false;
        this.ytPlayer = null;
        this.ytPlayerReady = false;
        this.spotifyPlayer = null;
        this.spotifyReady = false;
        this.spotifyDeviceId = null;
        this.spotifyAccessToken = null;
        this.trackUpdateInterval = null;
        this.audioEventListeners = new Map(); // Track event listeners for cleanup

        // Common soundtrack folder patterns
        this.soundtrackPaths = [
            'Soundtrack',
            'Music',
            'Audio/Music',
            'OST',
            'bgm'
        ];

        // Initialize YouTube API when ready (only if enabled)
        if (this.settings.youtubeIntegration) {
            this.initYouTubeAPI();
        }

        // Initialize Spotify Web Playback SDK (only if enabled)
        if (this.settings.spotifyIntegration) {
            this.initSpotifySDK();
        }
    }

    initYouTubeAPI() {
        // Check if YouTube IFrame API is loaded
        if (typeof YT !== 'undefined' && YT.Player) {
            this.createYouTubePlayer();
        } else {
            // Wait for API to load
            window.onYouTubeIframeAPIReady = () => {
                this.createYouTubePlayer();
            };
        }
    }

    createYouTubePlayer() {
        try {
            // Create a hidden div for the player
            let playerDiv = document.getElementById('yt-music-player');
            if (!playerDiv) {
                playerDiv = document.createElement('div');
                playerDiv.id = 'yt-music-player';
                playerDiv.style.display = 'none';
                document.body.appendChild(playerDiv);
            }

            this.ytPlayer = new YT.Player('yt-music-player', {
                height: '0',
                width: '0',
                events: {
                    'onReady': () => {
                        this.ytPlayerReady = true;
                        console.log('[PER-GAME-MUSIC] YouTube player ready');
                    },
                    'onStateChange': (event) => {
                        if (event.data === YT.PlayerState.ENDED) {
                            this.playNextTrack();
                        }
                    }
                }
            });
        } catch (error) {
            console.error('[PER-GAME-MUSIC] Failed to create YouTube player:', error);
        }
    }

    loadSettings() {
        const defaultSettings = {
            enabled: true,
            volume: 0.5,
            crossfadeDuration: 2000,
            autoPlay: true,
            youtubeIntegration: false,
            spotifyIntegration: false,
            musicFolders: []
        };

        try {
            const saved = localStorage.getItem('per-game-music-settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.error('Failed to load per-game music settings:', error);
            return defaultSettings;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('per-game-music-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save per-game music settings:', error);
        }
    }

    // Scan for game soundtracks in common locations
    async scanGameSoundtracks(game) {
        if (!game.installPath) return [];

        const soundtracks = [];

        for (const subPath of this.soundtrackPaths) {
            try {
                const musicPath = `${game.installPath}/${subPath}`;
                const files = await this.scanMusicFolder(musicPath);
                if (files.length > 0) {
                    soundtracks.push(...files);
                }
            } catch (error) {
                // Folder doesn't exist, continue
            }
        }

        return soundtracks;
    }

    async scanMusicFolder(folderPath) {
        // In Electron, use IPC to scan folder
        if (window.electronAPI && window.electronAPI.scanMusicFolder) {
            try {
                return await window.electronAPI.scanMusicFolder(folderPath);
            } catch (error) {
                console.error('Failed to scan music folder:', error);
                return [];
            }
        }
        return [];
    }

    // Register game music
    async registerGameMusic(gameId, game) {
        const soundtracks = await this.scanGameSoundtracks(game);

        if (soundtracks.length > 0) {
            this.musicLibrary.set(gameId, {
                files: soundtracks,
                currentIndex: 0,
                shuffle: false
            });

            console.log(`Found ${soundtracks.length} soundtrack files for ${game.name}`);
        }

        return soundtracks.length > 0;
    }

    // Play music for specific game
    async playGameMusic(gameId, game) {
        if (!this.settings.enabled || !this.settings.autoPlay) return;

        // Check if we have local soundtracks
        let musicData = this.musicLibrary.get(gameId);

        if (!musicData) {
            // Try to scan for soundtracks
            const found = await this.registerGameMusic(gameId, game);
            musicData = this.musicLibrary.get(gameId);
        }

        if (musicData && musicData.files.length > 0) {
            // Play local soundtrack
            const musicFile = musicData.files[musicData.currentIndex];
            await this.playAudioFile(musicFile);
        } else {
            // Fallback to YouTube/Spotify if enabled
            if (this.settings.youtubeIntegration) {
                await this.playYouTubeOST(game.title || game.name);
            }
        }
    }

    // Crossfade to new audio
    async playAudioFile(filePath) {
        // FIXED: Handle spaces in local paths
        const encodedPath = filePath.startsWith('http') ? filePath : `file:///${encodeURI(filePath.replace(/\\/g, '/'))}`;
        const newAudio = new Audio(encodedPath);
        
        newAudio.volume = 0;
        newAudio.loop = false;

        // Handle end of track
        const endedHandler = () => {
            this.playNextTrack();
        };
        newAudio.addEventListener('ended', endedHandler);

        // Track listener for cleanup
        this.audioEventListeners.set(newAudio, { ended: endedHandler });

        try {
            const playPromise = newAudio.play();
            if (playPromise !== undefined) {
                await playPromise;
            }

            if (this.currentAudio) {
                await this.crossfade(this.currentAudio, newAudio);
            } else {
                // Fade in
                await this.fadeIn(newAudio);
            }

            this.currentAudio = newAudio;
        } catch (error) {
            console.error('[PER-GAME-MUSIC] Failed to play audio:', error);
            // Clean up failed audio
            this.disposeAudio(newAudio);
        }
    }

    // Crossfade between two audio elements
    async crossfade(oldAudio, newAudio) {
        if (this.isCrossfading) return;
        this.isCrossfading = true;

        const steps = 50;
        const stepDuration = this.settings.crossfadeDuration / steps;

        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;

            if (oldAudio) {
                oldAudio.volume = (1 - progress) * this.settings.volume;
            }
            if (newAudio) {
                newAudio.volume = progress * this.settings.volume;
            }

            await this.sleep(stepDuration);
        }

        if (oldAudio) {
            oldAudio.pause();
            oldAudio.src = '';
        }

        this.isCrossfading = false;
    }

    // Fade in audio
    async fadeIn(audio) {
        const steps = 50;
        const stepDuration = this.settings.crossfadeDuration / steps;

        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            audio.volume = progress * this.settings.volume;
            await this.sleep(stepDuration);
        }
    }

    // Play next track in playlist
    playNextTrack() {
        const currentGame = window.coverflow?.getCurrentGame?.() || window.coverflowManager?.getCurrentGame?.();
        if (!currentGame) {
            console.warn('[PER-GAME-MUSIC] No current game found for playNextTrack');
            return;
        }

        const musicData = this.musicLibrary.get(currentGame.id);
        if (!musicData || musicData.files.length === 0) return;

        // Move to next track
        if (musicData.shuffle) {
            musicData.currentIndex = Math.floor(Math.random() * musicData.files.length);
        } else {
            musicData.currentIndex = (musicData.currentIndex + 1) % musicData.files.length;
        }

        const nextFile = musicData.files[musicData.currentIndex];
        this.playAudioFile(nextFile);
    }

    // YouTube OST integration
    async playYouTubeOST(gameName) {
        if (!this.settings.youtubeIntegration) {
            console.log('[PER-GAME-MUSIC] YouTube integration disabled');
            return;
        }

        if (!this.ytPlayerReady || !this.ytPlayer) {
            console.warn('[PER-GAME-MUSIC] YouTube player not ready');
            return;
        }

        try {
            console.log(`[PER-GAME-MUSIC] Searching YouTube for: ${gameName} soundtrack OST`);
            
            // FIXED: Connected search logic to playback logic
            if (this.settings.youtubeAPIKey) {
                const videoId = await this.searchYouTubeForOST(gameName);
                if (videoId) {
                    this.playYouTubeVideo(videoId);
                } else {
                    console.warn(`[PER-GAME-MUSIC] No soundtrack found on YouTube for ${gameName}`);
                }
            } else {
                console.log('[PER-GAME-MUSIC] YouTube search requires YouTube Data API key');
            }

        } catch (error) {
            console.error('[PER-GAME-MUSIC] YouTube playback error:', error);
        }
    }

    // Search YouTube for game OST
    async searchYouTubeForOST(gameName) {
        // This requires YouTube Data API v3 key
        const apiKey = this.settings.youtubeAPIKey;

        if (!apiKey) {
            throw new Error('YouTube API key not configured');
        }

        const searchQuery = encodeURIComponent(`${gameName} soundtrack OST`);
        const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchQuery}&type=video&maxResults=1&key=${apiKey}`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const videoId = data.items[0].id.videoId;
                return videoId;
            }

            return null;
        } catch (error) {
            console.error('[PER-GAME-MUSIC] YouTube search error:', error);
            return null;
        }
    }

    // Load and play YouTube video
    playYouTubeVideo(videoId) {
        if (!this.ytPlayerReady || !this.ytPlayer) {
            console.warn('[PER-GAME-MUSIC] YouTube player not ready');
            return;
        }

        try {
            // Stop current local audio
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio.src = '';
                this.currentAudio = null;
            }

            // Load and play YouTube video
            this.ytPlayer.loadVideoById({
                videoId: videoId,
                startSeconds: 0
            });

            // Set volume
            this.ytPlayer.setVolume(this.settings.volume * 100);

            console.log(`[PER-GAME-MUSIC] Playing YouTube video: ${videoId}`);
        } catch (error) {
            console.error('[PER-GAME-MUSIC] YouTube playback error:', error);
        }
    }

    // Stop YouTube playback
    stopYouTubePlayback() {
        if (this.ytPlayer && this.ytPlayerReady) {
            try {
                this.ytPlayer.stopVideo();
            } catch (error) {
                console.error('[PER-GAME-MUSIC] Failed to stop YouTube:', error);
            }
        }
    }

    // Initialize Spotify Web Playback SDK
    initSpotifySDK() {
        window.onSpotifyWebPlaybackSDKReady = () => {
            console.log('[PER-GAME-MUSIC] Spotify SDK loaded');
        };

        // Check if SDK is already loaded
        if (typeof Spotify !== 'undefined') {
            console.log('[PER-GAME-MUSIC] Spotify SDK already available');
        }
    }

    // Initialize Spotify Player with access token
    async initializeSpotifyPlayer(accessToken) {
        if (!accessToken) {
            console.error('[PER-GAME-MUSIC] No Spotify access token provided');
            return false;
        }

        this.spotifyAccessToken = accessToken;

        if (typeof Spotify === 'undefined' || !Spotify.Player) {
            console.error('[PER-GAME-MUSIC] Spotify SDK not loaded');
            return false;
        }

        try {
            this.spotifyPlayer = new Spotify.Player({
                name: 'CoverFlow Game Launcher',
                getOAuthToken: cb => { cb(accessToken); },
                volume: this.settings.volume
            });

            // Error handling
            this.spotifyPlayer.addListener('initialization_error', ({ message }) => {
                console.error('[PER-GAME-MUSIC] Spotify init error:', message);
            });

            this.spotifyPlayer.addListener('authentication_error', ({ message }) => {
                console.error('[PER-GAME-MUSIC] Spotify auth error:', message);
                this.spotifyReady = false;
            });

            this.spotifyPlayer.addListener('account_error', ({ message }) => {
                console.error('[PER-GAME-MUSIC] Spotify account error:', message);
            });

            this.spotifyPlayer.addListener('playback_error', ({ message }) => {
                console.error('[PER-GAME-MUSIC] Spotify playback error:', message);
            });

            // Playback status updates
            this.spotifyPlayer.addListener('player_state_changed', state => {
                if (!state) return;

                console.log('[PER-GAME-MUSIC] Spotify state:', state);

                // Check if track ended
                if (state.paused && state.position === 0 && state.duration > 0) {
                    this.playNextTrack();
                }
            });

            // Ready
            this.spotifyPlayer.addListener('ready', ({ device_id }) => {
                console.log('[PER-GAME-MUSIC] Spotify player ready! Device ID:', device_id);
                this.spotifyDeviceId = device_id;
                this.spotifyReady = true;
            });

            // Not Ready
            this.spotifyPlayer.addListener('not_ready', ({ device_id }) => {
                console.log('[PER-GAME-MUSIC] Spotify device has gone offline:', device_id);
                this.spotifyReady = false;
            });

            // Connect to the player
            const connected = await this.spotifyPlayer.connect();

            if (connected) {
                console.log('[PER-GAME-MUSIC] Spotify connected successfully');
                return true;
            } else {
                console.error('[PER-GAME-MUSIC] Spotify connection failed');
                return false;
            }
        } catch (error) {
            console.error('[PER-GAME-MUSIC] Failed to initialize Spotify player:', error);
            return false;
        }
    }

    // Search Spotify for game OST
    async searchSpotifyForOST(gameName) {
        if (!this.spotifyAccessToken) {
            console.error('[PER-GAME-MUSIC] No Spotify access token');
            return null;
        }

        const searchQuery = encodeURIComponent(`${gameName} soundtrack`);
        // FIXED: Use correct Spotify API URL
        const apiUrl = `https://api.spotify.com/v1/search?q=${searchQuery}&type=track,album&limit=5`;

        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.spotifyAccessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Spotify API error: ${response.status}`);
            }

            const data = await response.json();

            // Return tracks or albums
            if (data.tracks && data.tracks.items.length > 0) {
                return data.tracks.items;
            } else if (data.albums && data.albums.items.length > 0) {
                return data.albums.items;
            }

            return null;
        } catch (error) {
            console.error('[PER-GAME-MUSIC] Spotify search error:', error);
            return null;
        }
    }

    // Play track on Spotify
    async playSpotifyTrack(trackUri) {
        if (!this.spotifyReady || !this.spotifyDeviceId) {
            console.warn('[PER-GAME-MUSIC] Spotify player not ready');
            return false;
        }

        try {
            // Stop local audio
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio.src = '';
                this.currentAudio = null;
            }

            // Stop YouTube
            this.stopYouTubePlayback();

            // Play on Spotify
            // FIXED: Use correct Spotify API URL
            const playUrl = `https://api.spotify.com/v1/me/player/play?device_id=${this.spotifyDeviceId}`;

            const response = await fetch(playUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.spotifyAccessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uris: [trackUri]
                })
            });

            if (response.ok || response.status === 204) {
                console.log('[PER-GAME-MUSIC] Playing Spotify track:', trackUri);
                return true;
            } else {
                console.error('[PER-GAME-MUSIC] Spotify play failed:', response.status);
                return false;
            }
        } catch (error) {
            console.error('[PER-GAME-MUSIC] Failed to play Spotify track:', error);
            return false;
        }
    }

    // Stop Spotify playback
    stopSpotifyPlayback() {
        if (this.spotifyPlayer && this.spotifyReady) {
            try {
                this.spotifyPlayer.pause();
            } catch (error) {
                console.error('[PER-GAME-MUSIC] Failed to stop Spotify:', error);
            }
        }
    }

    // Get Spotify OAuth URL for user authentication
    getSpotifyAuthURL() {
        const clientId = this.settings.spotifyClientId || '';
        const redirectUri = encodeURIComponent(window.location.origin + '/spotify-callback');
        const scopes = encodeURIComponent('streaming user-read-email user-read-private user-modify-playback-state');
        // FIXED: Use correct Spotify Auth URL
        return `https://accounts.spotify.com/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&response_type=token`;
    }

    // Stop current music
    stop() {
        if (this.currentAudio) {
            this.disposeAudio(this.currentAudio);
            this.currentAudio = null;
        }

        // Also stop YouTube if playing
        this.stopYouTubePlayback();

        // Also stop Spotify if playing
        this.stopSpotifyPlayback();
    }

    // Properly dispose of audio element
    disposeAudio(audio) {
        if (!audio) return;

        try {
            audio.pause();
            audio.src = '';

            // Remove tracked event listeners
            const listeners = this.audioEventListeners.get(audio);
            if (listeners) {
                if (listeners.ended) {
                    audio.removeEventListener('ended', listeners.ended);
                }
                this.audioEventListeners.delete(audio);
            }

            // Force garbage collection by removing all references
            audio.load();
        } catch (error) {
            console.error('[PER-GAME-MUSIC] Error disposing audio:', error);
        }
    }

    // Set volume
    setVolume(volume) {
        this.settings.volume = Math.max(0, Math.min(1, volume));
        if (this.currentAudio) {
            this.currentAudio.volume = this.settings.volume;
        }
        this.saveSettings();
    }

    // Toggle shuffle for current game
    toggleShuffle(gameId) {
        const musicData = this.musicLibrary.get(gameId);
        if (musicData) {
            musicData.shuffle = !musicData.shuffle;
        }
    }

    // Get current playing info
    getCurrentTrackInfo() {
        const currentGame = window.coverflow?.getCurrentGame?.() || window.coverflowManager?.getCurrentGame?.();
        if (!currentGame) return null;

        const musicData = this.musicLibrary.get(currentGame.id);
        if (!musicData || musicData.files.length === 0) return null;

        const currentFile = musicData.files[musicData.currentIndex];
        return {
            gameName: currentGame.name,
            trackName: this.getTrackNameFromPath(currentFile),
            trackNumber: musicData.currentIndex + 1,
            totalTracks: musicData.files.length,
            isPlaying: this.currentAudio && !this.currentAudio.paused,
            currentTime: this.currentAudio?.currentTime || 0,
            duration: this.currentAudio?.duration || 0
        };
    }

    getTrackNameFromPath(filePath) {
        const fileName = filePath.split('/').pop().split('\\').pop();
        return fileName.replace(/\.[^/.]+$/, ''); // Remove extension
    }

    // Utility sleep function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Create settings UI
    createSettingsUI() {
        const container = document.createElement('div');
        container.className = 'per-game-music-settings';
        container.innerHTML = `
            <div class="settings-section">
                <h3>🎵 Per-Game Music</h3>

                <label class="setting-item">
                    <input type="checkbox" id="pgm-enabled" ${this.settings.enabled ? 'checked' : ''}>
                    <span>Enable per-game music</span>
                </label>

                <label class="setting-item">
                    <input type="checkbox" id="pgm-autoplay" ${this.settings.autoPlay ? 'checked' : ''}>
                    <span>Auto-play when browsing games</span>
                </label>

                <label class="setting-item">
                    <span>Volume: <span id="pgm-volume-value">${Math.round(this.settings.volume * 100)}%</span></span>
                    <input type="range" id="pgm-volume" min="0" max="100" value="${this.settings.volume * 100}">
                </label>

                <label class="setting-item">
                    <span>Crossfade Duration: <span id="pgm-crossfade-value">${this.settings.crossfadeDuration}ms</span></span>
                    <input type="range" id="pgm-crossfade" min="500" max="5000" step="100" value="${this.settings.crossfadeDuration}">
                </label>

                <div class="setting-item">
                    <button id="pgm-scan-all" class="btn btn-primary">Scan All Games for Music</button>
                </div>

                <div class="current-track-info" id="pgm-current-track" style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px;">
                    <p><strong>Currently Playing:</strong> <span id="pgm-track-name">None</span></p>
                    <p><strong>Game:</strong> <span id="pgm-game-name">-</span></p>
                    <p><strong>Track:</strong> <span id="pgm-track-number">-</span></p>
                    <div class="playback-controls">
                        <button id="pgm-prev" class="btn">⏮ Previous</button>
                        <button id="pgm-play-pause" class="btn">⏯ Play/Pause</button>
                        <button id="pgm-next" class="btn">⏭ Next</button>
                        <button id="pgm-shuffle" class="btn">🔀 Shuffle</button>
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        container.querySelector('#pgm-enabled').addEventListener('change', (e) => {
            this.settings.enabled = e.target.checked;
            this.saveSettings();
            if (!e.target.checked) {
                this.stop();
            }
        });

        container.querySelector('#pgm-autoplay').addEventListener('change', (e) => {
            this.settings.autoPlay = e.target.checked;
            this.saveSettings();
        });

        container.querySelector('#pgm-volume').addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.setVolume(volume);
            container.querySelector('#pgm-volume-value').textContent = `${e.target.value}%`;
        });

        container.querySelector('#pgm-crossfade').addEventListener('input', (e) => {
            this.settings.crossfadeDuration = parseInt(e.target.value);
            this.saveSettings();
            container.querySelector('#pgm-crossfade-value').textContent = `${e.target.value}ms`;
        });

        container.querySelector('#pgm-scan-all').addEventListener('click', async () => {
            await this.scanAllGames();
        });

        // Playback controls
        container.querySelector('#pgm-prev').addEventListener('click', () => {
            this.playPreviousTrack();
        });

        container.querySelector('#pgm-play-pause').addEventListener('click', () => {
            this.togglePlayPause();
        });

        container.querySelector('#pgm-next').addEventListener('click', () => {
            this.playNextTrack();
        });

        container.querySelector('#pgm-shuffle').addEventListener('click', () => {
            const currentGame = window.coverflowManager?.getCurrentGame();
            if (currentGame) {
                this.toggleShuffle(currentGame.id);
            }
        });

        // Update track info periodically - store interval ID for cleanup
        if (this.trackUpdateInterval) {
            clearInterval(this.trackUpdateInterval);
        }
        this.trackUpdateInterval = setInterval(() => this.updateTrackDisplay(container), 1000);

        return container;
    }

    playPreviousTrack() {
        const currentGame = window.coverflow?.getCurrentGame?.() || window.coverflowManager?.getCurrentGame?.();
        if (!currentGame) return;

        const musicData = this.musicLibrary.get(currentGame.id);
        if (!musicData || musicData.files.length === 0) return;

        musicData.currentIndex = (musicData.currentIndex - 1 + musicData.files.length) % musicData.files.length;
        const prevFile = musicData.files[musicData.currentIndex];
        this.playAudioFile(prevFile);
    }

    togglePlayPause() {
        if (this.currentAudio) {
            if (this.currentAudio.paused) {
                const playPromise = this.currentAudio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error('[PER-GAME-MUSIC] Play failed:', error);
                    });
                }
            } else {
                this.currentAudio.pause();
            }
        } else if (this.ytPlayer && this.ytPlayerReady) {
            try {
                // Handle YouTube playback
                const state = this.ytPlayer.getPlayerState();
                if (state === YT.PlayerState.PLAYING) {
                    this.ytPlayer.pauseVideo();
                } else if (state === YT.PlayerState.PAUSED) {
                    this.ytPlayer.playVideo();
                }
            } catch (error) {
                console.error('[PER-GAME-MUSIC] YouTube control error:', error);
            }
        }
    }

    updateTrackDisplay(container) {
        if (!container) return;

        const trackNameElem = container.querySelector('#pgm-track-name');
        const gameNameElem = container.querySelector('#pgm-game-name');
        const trackNumberElem = container.querySelector('#pgm-track-number');

        if (!trackNameElem || !gameNameElem || !trackNumberElem) return;

        const info = this.getCurrentTrackInfo();

        if (info) {
            trackNameElem.textContent = info.trackName;
            gameNameElem.textContent = info.gameName;
            trackNumberElem.textContent = `${info.trackNumber} / ${info.totalTracks}`;
        } else {
            trackNameElem.textContent = 'None';
            gameNameElem.textContent = '-';
            trackNumberElem.textContent = '-';
        }
    }

    async scanAllGames() {
        const games = window.coverflow?.games || window.coverflowManager?.games || [];
        if (games.length === 0) {
            alert('No games found to scan.');
            return;
        }

        let foundCount = 0;

        for (const game of games) {
            const found = await this.registerGameMusic(game.id, game);
            if (found) foundCount++;
        }

        alert(`Scanned ${games.length} games. Found soundtracks in ${foundCount} games.`);
    }

    // Cleanup method to prevent memory leaks
    destroy() {
        console.log('[PER-GAME-MUSIC] Destroying music manager...');

        // Clear interval
        if (this.trackUpdateInterval) {
            clearInterval(this.trackUpdateInterval);
            this.trackUpdateInterval = null;
        }

        // Stop and dispose all audio
        this.stop();

        // Disconnect Spotify
        if (this.spotifyPlayer) {
            try {
                this.spotifyPlayer.disconnect();
            } catch (error) {
                console.error('[PER-GAME-MUSIC] Error disconnecting Spotify:', error);
            }
            this.spotifyPlayer = null;
        }

        // Destroy YouTube player
        if (this.ytPlayer) {
            try {
                this.ytPlayer.destroy();
            } catch (error) {
                console.error('[PER-GAME-MUSIC] Error destroying YouTube player:', error);
            }
            this.ytPlayer = null;
        }

        // Clear all event listeners
        this.audioEventListeners.clear();

        // Clear music library
        this.musicLibrary.clear();
    }
}

// Initialize and export
if (typeof window !== 'undefined') {
    window.perGameMusicManager = new PerGameMusicManager();
}