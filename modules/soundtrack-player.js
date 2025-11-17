/**
 * Game Soundtrack Player Module
 * Plays game soundtracks and music files
 */

class SoundtrackPlayer {
    constructor() {
        this.audio = null;
        this.currentTrack = null;
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.volume = 0.7;
        this.repeat = false;
        this.shuffle = false;
    }

    /**
     * Initialize soundtrack player
     */
    initializeSoundtrackPlayer() {
        // Create audio element
        this.audio = new Audio();
        this.audio.volume = this.volume;

        // Event listeners
        this.audio.addEventListener('ended', () => this.onTrackEnded());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.onTrackLoaded());

        // Create player UI
        this.createPlayerUI();

        console.log('[SOUNDTRACK] Soundtrack player initialized');
    }

    /**
     * Create player UI
     */
    createPlayerUI() {
        const existingPlayer = document.getElementById('soundtrack-player');
        if (existingPlayer) return;

        const player = document.createElement('div');
        player.id = 'soundtrack-player';
        player.className = 'soundtrack-player';
        player.innerHTML = `
            <div class="player-header">
                <div class="player-info">
                    <div class="track-title">No track playing</div>
                    <div class="track-game">Select a game soundtrack</div>
                </div>
                <button class="player-minimize-btn">_</button>
                <button class="player-close-btn">×</button>
            </div>
            <div class="player-body">
                <div class="player-progress">
                    <div class="progress-time current-time">0:00</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar"></div>
                        <input type="range" class="progress-slider" min="0" max="100" value="0">
                    </div>
                    <div class="progress-time total-time">0:00</div>
                </div>
                <div class="player-controls">
                    <button class="control-btn shuffle-btn" title="Shuffle">
                        <span>🔀</span>
                    </button>
                    <button class="control-btn prev-btn" title="Previous">
                        <span>⏮</span>
                    </button>
                    <button class="control-btn play-pause-btn" title="Play">
                        <span class="play-icon">▶️</span>
                        <span class="pause-icon" style="display: none;">⏸</span>
                    </button>
                    <button class="control-btn next-btn" title="Next">
                        <span>⏭</span>
                    </button>
                    <button class="control-btn repeat-btn" title="Repeat">
                        <span>🔁</span>
                    </button>
                </div>
                <div class="player-volume">
                    <span class="volume-icon">🔊</span>
                    <input type="range" class="volume-slider" min="0" max="100" value="70">
                </div>
                <div class="player-playlist">
                    <div class="playlist-header">
                        <span>Playlist (0 tracks)</span>
                        <button class="clear-playlist-btn">Clear</button>
                    </div>
                    <div class="playlist-items"></div>
                </div>
            </div>
        `;

        document.body.appendChild(player);

        // Event listeners
        this.setupPlayerControls();
    }

    /**
     * Setup player control event listeners
     */
    setupPlayerControls() {
        const player = document.getElementById('soundtrack-player');
        if (!player) return;

        // Play/Pause
        player.querySelector('.play-pause-btn').addEventListener('click', () => {
            this.togglePlayPause();
        });

        // Previous track
        player.querySelector('.prev-btn').addEventListener('click', () => {
            this.previousTrack();
        });

        // Next track
        player.querySelector('.next-btn').addEventListener('click', () => {
            this.nextTrack();
        });

        // Shuffle
        player.querySelector('.shuffle-btn').addEventListener('click', () => {
            this.toggleShuffle();
        });

        // Repeat
        player.querySelector('.repeat-btn').addEventListener('click', () => {
            this.toggleRepeat();
        });

        // Volume slider
        player.querySelector('.volume-slider').addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });

        // Progress slider
        player.querySelector('.progress-slider').addEventListener('input', (e) => {
            this.seek(e.target.value / 100);
        });

        // Minimize
        player.querySelector('.player-minimize-btn').addEventListener('click', () => {
            this.minimizePlayer();
        });

        // Close
        player.querySelector('.player-close-btn').addEventListener('click', () => {
            this.closePlayer();
        });

        // Clear playlist
        player.querySelector('.clear-playlist-btn').addEventListener('click', () => {
            this.clearPlaylist();
        });
    }

    /**
     * Load game soundtrack
     */
    loadGameSoundtrack(game) {
        if (!game || !game.id) return;

        // In Electron mode, scan for music files in game directory
        if (window.electronAPI && typeof window.electronAPI.scanGameSoundtrack === 'function') {
            window.electronAPI.scanGameSoundtrack(game.id).then(result => {
                if (result.success && result.tracks && result.tracks.length > 0) {
                    this.playlist = result.tracks.map(track => ({
                        path: track.path,
                        title: track.title || track.filename,
                        game: game.title,
                        duration: track.duration || 0
                    }));
                    this.currentIndex = 0;
                    this.updatePlaylistUI();
                    this.showPlayer();
                    this.playTrack(0);
                } else {
                    this.showToast('No soundtrack files found for this game', 'info');
                }
            });
        } else {
            this.showToast('Soundtrack player requires Electron mode', 'info');
        }
    }

    /**
     * Play a specific track
     */
    playTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;

        this.currentIndex = index;
        this.currentTrack = this.playlist[index];

        // Load track
        if (this.currentTrack.path.startsWith('http')) {
            this.audio.src = this.currentTrack.path;
        } else {
            // Convert file path to file:// URL for Electron
            this.audio.src = `file://${this.currentTrack.path}`;
        }

        this.audio.play().catch(error => {
            console.error('[SOUNDTRACK] Playback failed:', error);
            this.isPlaying = false;
            this.updatePlayerUI();
        });
        this.isPlaying = true;
        this.updatePlayerUI();
        this.highlightCurrentTrack();
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (!this.currentTrack) {
            if (this.playlist.length > 0) {
                this.playTrack(0);
            }
            return;
        }

        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
        } else {
            this.audio.play().catch(error => {
                console.error('[SOUNDTRACK] Playback failed:', error);
                this.isPlaying = false;
                this.updatePlayerUI();
            });
            this.isPlaying = true;
        }

        this.updatePlayerUI();
    }

    /**
     * Previous track
     */
    previousTrack() {
        if (this.playlist.length === 0) return;

        let newIndex = this.currentIndex - 1;
        if (newIndex < 0) {
            newIndex = this.playlist.length - 1;
        }

        this.playTrack(newIndex);
    }

    /**
     * Next track
     */
    nextTrack() {
        if (this.playlist.length === 0) return;

        let newIndex;
        if (this.shuffle) {
            newIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            newIndex = this.currentIndex + 1;
            if (newIndex >= this.playlist.length) {
                newIndex = 0;
            }
        }

        this.playTrack(newIndex);
    }

    /**
     * Handle track ended
     */
    onTrackEnded() {
        if (this.repeat) {
            this.audio.currentTime = 0;
            this.audio.play().catch(error => {
                console.error('[SOUNDTRACK] Repeat playback failed:', error);
            });
        } else {
            this.nextTrack();
        }
    }

    /**
     * Update progress bar
     */
    updateProgress() {
        if (!this.audio || !this.audio.duration) return;

        const player = document.getElementById('soundtrack-player');
        if (!player) return;

        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        const percentage = (currentTime / duration) * 100;

        player.querySelector('.progress-bar').style.width = `${percentage}%`;
        player.querySelector('.progress-slider').value = percentage;
        player.querySelector('.current-time').textContent = this.formatTime(currentTime);
    }

    /**
     * On track loaded
     */
    onTrackLoaded() {
        const player = document.getElementById('soundtrack-player');
        if (!player || !this.audio.duration) return;

        player.querySelector('.total-time').textContent = this.formatTime(this.audio.duration);
    }

    /**
     * Seek to position
     */
    seek(percentage) {
        if (!this.audio || !this.audio.duration) return;

        this.audio.currentTime = this.audio.duration * percentage;
    }

    /**
     * Set volume
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.audio) {
            this.audio.volume = this.volume;
        }
    }

    /**
     * Toggle shuffle
     */
    toggleShuffle() {
        this.shuffle = !this.shuffle;
        const btn = document.querySelector('.shuffle-btn');
        if (btn) {
            btn.classList.toggle('active', this.shuffle);
        }
    }

    /**
     * Toggle repeat
     */
    toggleRepeat() {
        this.repeat = !this.repeat;
        const btn = document.querySelector('.repeat-btn');
        if (btn) {
            btn.classList.toggle('active', this.repeat);
        }
    }

    /**
     * Clear playlist
     */
    clearPlaylist() {
        this.playlist = [];
        this.currentIndex = 0;
        this.currentTrack = null;
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
        }
        this.isPlaying = false;
        this.updatePlaylistUI();
        this.updatePlayerUI();
    }

    /**
     * Update player UI
     */
    updatePlayerUI() {
        const player = document.getElementById('soundtrack-player');
        if (!player) return;

        if (this.currentTrack) {
            player.querySelector('.track-title').textContent = this.currentTrack.title;
            player.querySelector('.track-game').textContent = this.currentTrack.game || 'Unknown Game';
        }

        const playIcon = player.querySelector('.play-icon');
        const pauseIcon = player.querySelector('.pause-icon');
        if (this.isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'inline';
        } else {
            playIcon.style.display = 'inline';
            pauseIcon.style.display = 'none';
        }
    }

    /**
     * Update playlist UI
     */
    updatePlaylistUI() {
        const player = document.getElementById('soundtrack-player');
        if (!player) return;

        const container = player.querySelector('.playlist-items');
        const header = player.querySelector('.playlist-header span');

        header.textContent = `Playlist (${this.playlist.length} tracks)`;

        if (this.playlist.length === 0) {
            container.innerHTML = '<div class="empty-playlist">No tracks in playlist</div>';
            return;
        }

        container.innerHTML = this.playlist.map((track, index) => `
            <div class="playlist-item" data-index="${index}">
                <div class="track-number">${index + 1}</div>
                <div class="track-info">
                    <div class="track-name">${track.title}</div>
                </div>
                <div class="track-duration">${this.formatTime(track.duration)}</div>
            </div>
        `).join('');

        // Add click handlers to playlist items
        container.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.playTrack(index);
            });
        });

        this.highlightCurrentTrack();
    }

    /**
     * Highlight current track in playlist
     */
    highlightCurrentTrack() {
        const container = document.querySelector('.playlist-items');
        if (!container) return;

        container.querySelectorAll('.playlist-item').forEach((item, index) => {
            item.classList.toggle('active', index === this.currentIndex);
        });
    }

    /**
     * Format time in seconds to MM:SS
     */
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Show player
     */
    showPlayer() {
        const player = document.getElementById('soundtrack-player');
        if (player) {
            player.classList.add('visible');
        }
    }

    /**
     * Close player
     */
    closePlayer() {
        const player = document.getElementById('soundtrack-player');
        if (player) {
            player.classList.remove('visible');
        }

        if (this.audio) {
            this.audio.pause();
        }
        this.isPlaying = false;
    }

    /**
     * Minimize player
     */
    minimizePlayer() {
        const player = document.getElementById('soundtrack-player');
        if (player) {
            player.classList.toggle('minimized');
        }
    }

    /**
     * Cleanup on destroy
     */
    cleanup() {
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
            // Event listeners will be removed when audio element is disposed
            this.audio = null;
        }
        this.playlist = [];
        this.currentTrack = null;
        this.isPlaying = false;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (window.coverflow && typeof window.coverflow.showToast === 'function') {
            window.coverflow.showToast(message, type);
        }
    }
}
