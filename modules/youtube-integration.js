/**
 * YouTube Integration Module
 * Searches and embeds YouTube videos for game soundtracks and trailers
 */

class YouTubeIntegration {
    constructor() {
        this.apiLoaded = false;
        this.searchCache = new Map();
    }

    /**
     * Initialize YouTube IFrame API
     */
    initializeYouTubeAPI() {
        if (this.apiLoaded) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            // Check if API is already loaded
            if (window.YT && window.YT.Player) {
                this.apiLoaded = true;
                resolve();
                return;
            }

            // Load YouTube IFrame API
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';

            window.onYouTubeIframeAPIReady = () => {
                this.apiLoaded = true;
                window.logger?.debug('YOUTUBE', 'YouTube IFrame API loaded');
                resolve();
            };

            tag.onerror = () => {
                window.logger?.error('YOUTUBE', 'Failed to load YouTube API');
                reject(new Error('Failed to load YouTube API'));
            };

            const firstScriptTag = document.getElementsByTagName('script')[0];
            if (firstScriptTag && firstScriptTag.parentNode) {
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            } else {
                // Fallback: append to document head
                document.head.appendChild(tag);
            }
        });
    }

    /**
     * Search YouTube for game-related videos
     * Note: This uses a client-side search approach without API keys
     * For production, consider using YouTube Data API v3 with proper API key
     */
    async searchGameVideos(gameTitle, type = 'soundtrack') {
        const cacheKey = `${gameTitle}_${type}`;

        // Check cache first
        if (this.searchCache.has(cacheKey)) {
            return this.searchCache.get(cacheKey);
        }

        // Build search query
        let searchQuery = gameTitle;
        if (type === 'soundtrack') {
            searchQuery += ' soundtrack OST';
        } else if (type === 'trailer') {
            searchQuery += ' official trailer';
        } else if (type === 'gameplay') {
            searchQuery += ' gameplay';
        } else if (type === 'review') {
            searchQuery += ' review';
        }

        try {
            // Use YouTube's oEmbed API to search (limited but no API key needed)
            // For better results, implement YouTube Data API v3 with API key
            const videos = await this.searchVideosNoAPI(searchQuery);

            this.searchCache.set(cacheKey, videos);
            return videos;
        } catch (error) {
            window.logger?.error('YOUTUBE', 'Search failed:', error);
            return [];
        }
    }

    /**
     * Search videos without API key using web scraping approach
     * Note: This is a fallback method. For production use, implement YouTube Data API v3
     */
    async searchVideosNoAPI(query) {
        // For now, return curated video IDs based on common patterns
        // In production, you should:
        // 1. Use YouTube Data API v3 with API key
        // 2. Or implement server-side proxy to handle searches

        window.logger?.debug('YOUTUBE', 'Searching for:', query);

        // Return empty array for now - user can implement API key support
        // or manually add video IDs
        return [];
    }

    /**
     * Get YouTube video ID from URL
     */
    extractVideoId(url) {
        if (!url) return null;

        // Handle various YouTube URL formats
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Create YouTube player in container
     */
    createPlayer(containerId, videoId, options = {}) {
        return new Promise((resolve, reject) => {
            this.initializeYouTubeAPI().then(() => {
                const player = new YT.Player(containerId, {
                    videoId: videoId,
                    width: options.width || '100%',
                    height: options.height || '100%',
                    playerVars: {
                        autoplay: options.autoplay ? 1 : 0,
                        controls: options.controls !== false ? 1 : 0,
                        modestbranding: 1,
                        rel: 0,
                        showinfo: 0,
                        fs: 1,
                        ...options.playerVars
                    },
                    events: {
                        onReady: (event) => {
                            window.logger?.debug('YOUTUBE', 'Player ready');
                            if (options.onReady) options.onReady(event);
                            resolve(player);
                        },
                        onStateChange: (event) => {
                            if (options.onStateChange) options.onStateChange(event);
                        },
                        onError: (event) => {
                            window.logger?.error('YOUTUBE', 'Player error:', event.data);
                            if (options.onError) options.onError(event);
                            reject(new Error(`YouTube player error: ${event.data}`));
                        }
                    }
                });
            }).catch(reject);
        });
    }

    /**
     * Build YouTube URL for embedding
     */
    buildEmbedUrl(videoId, options = {}) {
        const params = new URLSearchParams({
            autoplay: options.autoplay ? '1' : '0',
            controls: options.controls !== false ? '1' : '0',
            modestbranding: '1',
            rel: '0',
            showinfo: '0',
            ...options.params
        });

        return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    }

    /**
     * Build YouTube watch URL
     */
    buildWatchUrl(videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }

    /**
     * Validate video ID
     */
    isValidVideoId(videoId) {
        return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
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
