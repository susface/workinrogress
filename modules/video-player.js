/**
 * Video Player Module
 * Plays local video files and YouTube videos in a built-in player
 */

class VideoPlayer {
    constructor() {
        this.player = null;
        this.currentVideo = null;
        this.isYouTube = false;
        this.youtubePlayer = null;
        this.playlist = [];
        this.currentIndex = 0;
    }

    /**
     * Initialize video player
     */
    initializeVideoPlayer() {
        this.createPlayerUI();
        window.logger?.debug('VIDEO', 'Video player initialized');
    }

    /**
     * Create player UI
     */
    createPlayerUI() {
        const existingPlayer = document.getElementById('video-player');
        if (existingPlayer) return;

        const player = document.createElement('div');
        player.id = 'video-player';
        player.className = 'video-player';
        player.innerHTML = `
            <div class="video-player-header">
                <div class="video-player-info">
                    <div class="video-title">No video playing</div>
                    <div class="video-source">Select a video to play</div>
                </div>
                <button class="video-player-minimize-btn">_</button>
                <button class="video-player-close-btn">×</button>
            </div>
            <div class="video-player-body">
                <div class="video-container">
                    <video id="local-video-element" controls style="display: none;">
                        Your browser does not support the video tag.
                    </video>
                    <div id="youtube-video-container" style="display: none;"></div>
                    <div class="video-placeholder">
                        <div class="placeholder-icon">🎬</div>
                        <div class="placeholder-text">No video loaded</div>
                    </div>
                </div>
                <div class="video-controls">
                    <button class="video-control-btn prev-video-btn" title="Previous">⏮</button>
                    <button class="video-control-btn next-video-btn" title="Next">⏭</button>
                    <button class="video-control-btn fullscreen-video-btn" title="Fullscreen">⛶</button>
                    <button class="video-control-btn open-external-btn" title="Open in Browser">🔗</button>
                </div>
                <div class="video-playlist">
                    <div class="playlist-header">
                        <span>Playlist (0 videos)</span>
                        <button class="clear-video-playlist-btn">Clear</button>
                    </div>
                    <div class="video-playlist-items"></div>
                </div>
            </div>
        `;

        document.body.appendChild(player);
        this.setupPlayerControls();
    }

    /**
     * Setup player control event listeners
     */
    setupPlayerControls() {
        const player = document.getElementById('video-player');
        if (!player) return;

        // Minimize
        player.querySelector('.video-player-minimize-btn').addEventListener('click', () => {
            this.minimizePlayer();
        });

        // Close
        player.querySelector('.video-player-close-btn').addEventListener('click', () => {
            this.closePlayer();
        });

        // Previous video
        player.querySelector('.prev-video-btn').addEventListener('click', () => {
            this.previousVideo();
        });

        // Next video
        player.querySelector('.next-video-btn').addEventListener('click', () => {
            this.nextVideo();
        });

        // Fullscreen
        player.querySelector('.fullscreen-video-btn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Open in browser
        player.querySelector('.open-external-btn').addEventListener('click', () => {
            this.openInBrowser();
        });

        // Clear playlist
        player.querySelector('.clear-video-playlist-btn').addEventListener('click', () => {
            this.clearPlaylist();
        });
    }

    /**
     * Play a local video file
     */
    playLocalVideo(filePath, title = null) {
        this.isYouTube = false;
        this.currentVideo = {
            type: 'local',
            path: filePath,
            title: title || filePath.split('/').pop()
        };

        const videoElement = document.getElementById('local-video-element');
        const youtubeContainer = document.getElementById('youtube-video-container');
        const placeholder = document.querySelector('.video-placeholder');

        // Check if video element exists first
        if (!videoElement) {
            window.logger?.error('VIDEO', 'Video element not found');
            this.showToast('Video player not initialized', 'error');
            return;
        }

        // Hide YouTube player
        if (this.youtubePlayer) {
            this.youtubePlayer.stopVideo();
            if (youtubeContainer) {
                youtubeContainer.style.display = 'none';
            }
        }

        // Show local video player
        videoElement.style.display = 'block';
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Normalize path for file:// protocol
        const normalizedPath = filePath.replace(/\\/g, '/');
        videoElement.src = `file:///${normalizedPath}`;

        videoElement.play().catch(error => {
            window.logger?.error('VIDEO', 'Playback failed:', error);
            this.showToast('Failed to play video', 'error');
        });

        this.updatePlayerUI();
        this.showPlayer();
    }

    /**
     * Play a YouTube video
     */
    async playYouTubeVideo(videoId, title = null) {
        this.isYouTube = true;
        this.currentVideo = {
            type: 'youtube',
            videoId: videoId,
            title: title || 'YouTube Video'
        };

        const videoElement = document.getElementById('local-video-element');
        const youtubeContainer = document.getElementById('youtube-video-container');
        const placeholder = document.querySelector('.video-placeholder');

        if (!youtubeContainer) {
            window.logger?.error('VIDEO', 'YouTube container not found');
            this.showToast('Video player not initialized', 'error');
            return;
        }

        // Hide local video player
        if (videoElement) {
            videoElement.pause();
            videoElement.src = '';
            videoElement.style.display = 'none';
        }
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Show YouTube player
        youtubeContainer.style.display = 'block';
        youtubeContainer.innerHTML = '<div id="youtube-player-iframe"></div>';

        try {
            // Get YouTube integration instance
            const youtube = window.coverflow && window.coverflow.youtubeIntegration
                ? window.coverflow.youtubeIntegration
                : new YouTubeIntegration();

            this.youtubePlayer = await youtube.createPlayer('youtube-player-iframe', videoId, {
                autoplay: true,
                controls: true,
                width: '100%',
                height: '100%'
            });

            this.updatePlayerUI();
            this.showPlayer();
        } catch (error) {
            window.logger?.error('VIDEO', 'Failed to load YouTube video:', error);
            this.showToast('Failed to load YouTube video', 'error');
        }
    }

    /**
     * Add video to playlist
     */
    addToPlaylist(video) {
        this.playlist.push(video);
        this.updatePlaylistUI();
    }

    /**
     * Load playlist of videos
     */
    loadPlaylist(videos) {
        this.playlist = videos;
        this.currentIndex = 0;
        this.updatePlaylistUI();

        if (videos.length > 0) {
            this.playVideo(0);
        }
    }

    /**
     * Play video at index
     */
    playVideo(index) {
        if (index < 0 || index >= this.playlist.length) return;

        this.currentIndex = index;
        const video = this.playlist[index];

        if (video.type === 'youtube') {
            this.playYouTubeVideo(video.videoId, video.title);
        } else {
            this.playLocalVideo(video.path, video.title);
        }

        this.highlightCurrentVideo();
    }

    /**
     * Previous video
     */
    previousVideo() {
        if (this.playlist.length === 0) return;

        let newIndex = this.currentIndex - 1;
        if (newIndex < 0) {
            newIndex = this.playlist.length - 1;
        }

        this.playVideo(newIndex);
    }

    /**
     * Next video
     */
    nextVideo() {
        if (this.playlist.length === 0) return;

        let newIndex = this.currentIndex + 1;
        if (newIndex >= this.playlist.length) {
            newIndex = 0;
        }

        this.playVideo(newIndex);
    }

    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        const container = document.querySelector('.video-container');
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                window.logger?.error('VIDEO', 'Fullscreen failed:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * Open current video in external browser
     */
    openInBrowser() {
        if (!this.currentVideo) {
            this.showToast('No video playing', 'info');
            return;
        }

        if (this.currentVideo.type === 'youtube') {
            const url = `https://www.youtube.com/watch?v=${this.currentVideo.videoId}`;
            window.open(url, '_blank');
        } else {
            this.showToast('Local videos cannot be opened in browser', 'info');
        }
    }

    /**
     * Clear playlist
     */
    clearPlaylist() {
        this.playlist = [];
        this.currentIndex = 0;
        this.updatePlaylistUI();
    }

    /**
     * Update player UI
     */
    updatePlayerUI() {
        const player = document.getElementById('video-player');
        if (!player) return;

        if (this.currentVideo) {
            player.querySelector('.video-title').textContent = this.currentVideo.title;
            player.querySelector('.video-source').textContent =
                this.currentVideo.type === 'youtube' ? 'YouTube' : 'Local File';
        }
    }

    /**
     * Update playlist UI
     */
    updatePlaylistUI() {
        const player = document.getElementById('video-player');
        if (!player) return;

        const container = player.querySelector('.video-playlist-items');
        const header = player.querySelector('.playlist-header span');

        header.textContent = `Playlist (${this.playlist.length} videos)`;

        if (this.playlist.length === 0) {
            container.innerHTML = '<div class="empty-playlist">No videos in playlist</div>';
            return;
        }

        container.innerHTML = this.playlist.map((video, index) => `
            <div class="video-playlist-item" data-index="${index}">
                <div class="video-number">${index + 1}</div>
                <div class="video-info">
                    <div class="video-name">${this.escapeHtml(video.title)}</div>
                    <div class="video-type">${video.type === 'youtube' ? '🎬 YouTube' : '📁 Local'}</div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.video-playlist-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index, 10);
                this.playVideo(index);
            });
        });

        this.highlightCurrentVideo();
    }

    /**
     * Highlight current video in playlist
     */
    highlightCurrentVideo() {
        const container = document.querySelector('.video-playlist-items');
        if (!container) return;

        container.querySelectorAll('.video-playlist-item').forEach((item, index) => {
            item.classList.toggle('active', index === this.currentIndex);
        });
    }

    /**
     * Show player
     */
    showPlayer() {
        const player = document.getElementById('video-player');
        if (player) {
            player.classList.add('visible');
        }
    }

    /**
     * Close player
     */
    closePlayer() {
        const player = document.getElementById('video-player');
        if (player) {
            player.classList.remove('visible');
        }

        // Stop playback
        const videoElement = document.getElementById('local-video-element');
        if (videoElement) {
            videoElement.pause();
            videoElement.src = '';
        }

        if (this.youtubePlayer) {
            this.youtubePlayer.stopVideo();
        }
    }

    /**
     * Minimize player
     */
    minimizePlayer() {
        const player = document.getElementById('video-player');
        if (player) {
            player.classList.toggle('minimized');
        }
    }

    /**
     * Cleanup
     */
    cleanup() {
        const videoElement = document.getElementById('local-video-element');
        if (videoElement) {
            videoElement.pause();
            videoElement.src = '';
        }

        if (this.youtubePlayer) {
            this.youtubePlayer.destroy();
            this.youtubePlayer = null;
        }

        this.playlist = [];
        this.currentVideo = null;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
