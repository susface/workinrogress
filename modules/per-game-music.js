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

        // Common soundtrack folder patterns
        this.soundtrackPaths = [
            'Soundtrack',
            'Music',
            'Audio/Music',
            'OST',
            'bgm'
        ];
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
                await this.playYouTubeOST(game.name);
            }
        }
    }

    // Crossfade to new audio
    async playAudioFile(filePath) {
        const newAudio = new Audio(filePath);
        newAudio.volume = 0;
        newAudio.loop = false;

        // Handle end of track
        newAudio.addEventListener('ended', () => {
            this.playNextTrack();
        });

        try {
            await newAudio.play();

            if (this.currentAudio) {
                await this.crossfade(this.currentAudio, newAudio);
            } else {
                // Fade in
                await this.fadeIn(newAudio);
            }

            this.currentAudio = newAudio;
        } catch (error) {
            console.error('Failed to play audio:', error);
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
        const currentGame = window.coverflowManager?.getCurrentGame();
        if (!currentGame) return;

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
        // This would require YouTube API integration
        // For now, just log the intent
        console.log(`Would search YouTube for: ${gameName} OST`);

        // In a full implementation:
        // 1. Search YouTube for "{gameName} soundtrack" or "{gameName} OST"
        // 2. Get top results
        // 3. Use YouTube Player API to play in background
    }

    // Stop current music
    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.src = '';
            this.currentAudio = null;
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
        const currentGame = window.coverflowManager?.getCurrentGame();
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

        // Update track info periodically
        setInterval(() => this.updateTrackDisplay(container), 1000);

        return container;
    }

    playPreviousTrack() {
        const currentGame = window.coverflowManager?.getCurrentGame();
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
                this.currentAudio.play();
            } else {
                this.currentAudio.pause();
            }
        }
    }

    updateTrackDisplay(container) {
        const info = this.getCurrentTrackInfo();

        if (info) {
            container.querySelector('#pgm-track-name').textContent = info.trackName;
            container.querySelector('#pgm-game-name').textContent = info.gameName;
            container.querySelector('#pgm-track-number').textContent = `${info.trackNumber} / ${info.totalTracks}`;
        } else {
            container.querySelector('#pgm-track-name').textContent = 'None';
            container.querySelector('#pgm-game-name').textContent = '-';
            container.querySelector('#pgm-track-number').textContent = '-';
        }
    }

    async scanAllGames() {
        if (!window.coverflowManager) return;

        const games = window.coverflowManager.games || [];
        let foundCount = 0;

        for (const game of games) {
            const found = await this.registerGameMusic(game.id, game);
            if (found) foundCount++;
        }

        alert(`Scanned ${games.length} games. Found soundtracks in ${foundCount} games.`);
    }
}

// Initialize and export
if (typeof window !== 'undefined') {
    window.perGameMusicManager = new PerGameMusicManager();
}
