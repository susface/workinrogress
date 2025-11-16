/**
 * CoverFlow UI Module
 * Handles thumbnails, info panel, and UI updates
 */

class CoverFlowUI {
    /**
     * Update info panel with current album/game details
     */
    updateInfo() {
        if (this.filteredAlbums.length === 0) return;

        const album = this.filteredAlbums[this.currentIndex];

        // Update title
        const titleEl = document.getElementById('album-title');
        if (titleEl) titleEl.textContent = album.title || 'Unknown';

        // Update artist/platform
        const artistEl = document.getElementById('album-artist');
        if (artistEl) {
            if (album.type === 'game') {
                artistEl.textContent = album.developer || 'Unknown Developer';
            } else {
                artistEl.textContent = album.artist || 'Unknown Artist';
            }
        }

        // Update year
        const yearEl = document.getElementById('album-year');
        if (yearEl) yearEl.textContent = album.year || '-';

        // Update genre
        const genreEl = document.getElementById('album-genre');
        if (genreEl) genreEl.textContent = album.genre || '-';

        // Update description
        const descEl = document.getElementById('album-description');
        if (descEl) descEl.textContent = album.description || album.short_description || 'No description available.';

        // Display playtime for games
        const playtimeEl = document.getElementById('playtime-display');
        if (playtimeEl && album.type === 'game') {
            if (album.total_play_time && album.total_play_time > 0) {
                const hours = Math.floor(album.total_play_time / 3600);
                const minutes = Math.floor((album.total_play_time % 3600) / 60);
                playtimeEl.textContent = hours > 0
                    ? `${hours}h ${minutes}m played`
                    : `${minutes}m played`;
                playtimeEl.style.display = 'block';
            } else {
                playtimeEl.textContent = 'Not played yet';
                playtimeEl.style.display = 'block';
            }
        } else if (playtimeEl) {
            playtimeEl.style.display = 'none';
        }

        // Display last played for games
        const lastPlayedEl = document.getElementById('last-played-display');
        if (lastPlayedEl && album.type === 'game' && album.last_played) {
            const lastPlayedDate = new Date(album.last_played);
            const now = new Date();
            const diffTime = Math.abs(now - lastPlayedDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            let displayText;
            if (diffDays === 0) {
                displayText = 'Played today';
            } else if (diffDays === 1) {
                displayText = 'Played yesterday';
            } else if (diffDays < 7) {
                displayText = `Played ${diffDays} days ago`;
            } else {
                displayText = `Last played: ${lastPlayedDate.toLocaleDateString()}`;
            }

            lastPlayedEl.textContent = displayText;
            lastPlayedEl.style.display = 'block';
        } else if (lastPlayedEl) {
            lastPlayedEl.style.display = 'none';
        }

        // Update developer/publisher for games
        const developerEl = document.getElementById('game-developer');
        const publisherEl = document.getElementById('game-publisher');

        if (album.type === 'game') {
            if (developerEl) {
                developerEl.parentElement.style.display = 'block';
                developerEl.textContent = album.developer || 'Unknown';
            }
            if (publisherEl) {
                publisherEl.parentElement.style.display = 'block';
                publisherEl.textContent = album.publisher || 'Unknown';
            }
        } else {
            if (developerEl) developerEl.parentElement.style.display = 'none';
            if (publisherEl) publisherEl.parentElement.style.display = 'none';
        }

        // Show/hide and setup play button for games AND audio files
        const playBtn = document.getElementById('play-btn');
        if (playBtn && album.type === 'game') {
            playBtn.style.display = 'block';
            playBtn.innerHTML = '▶ Play Game';
            // Set up click handler for launching game
            playBtn.onclick = async () => {
                if (window.electronAPI && album.id && album.launch_command) {
                    console.log(`[PLAY] Launching game: ${album.title}`);

                    // Show loading state
                    const originalText = playBtn.innerHTML;
                    playBtn.innerHTML = '⏳';
                    playBtn.disabled = true;

                    try {
                        const result = await window.electronAPI.launchGame(album.launch_command, album.id);

                        if (result.success) {
                            this.showToast(`Launched ${album.title}`, 'success');
                            // Change to checkmark briefly
                            playBtn.innerHTML = '✓';
                            setTimeout(() => {
                                playBtn.innerHTML = originalText;
                                playBtn.disabled = false;
                            }, 1500);
                        } else {
                            this.showToast(`Failed to launch: ${result.error || 'Unknown error'}`, 'error');
                            playBtn.innerHTML = originalText;
                            playBtn.disabled = false;
                        }
                    } catch (error) {
                        console.error('[PLAY] Launch error:', error);
                        this.showToast(`Error launching game: ${error.message}`, 'error');
                        playBtn.innerHTML = originalText;
                        playBtn.disabled = false;
                    }
                }
            };
        } else if (playBtn && album.type === 'music') {
            playBtn.style.display = 'block';
            // Update button text based on current playback state
            const isPlaying = this.audioPlayer && !this.audioPlayer.paused && this.currentAudioFile === album.audio;
            playBtn.innerHTML = isPlaying ? '⏸ Pause Music' : '▶ Play Music';

            // Set up click handler for playing audio
            playBtn.onclick = () => {
                this.toggleAudioPlayback(album);
            };
        } else if (playBtn) {
            playBtn.style.display = 'none';
            playBtn.onclick = null; // Clear handler
        }

        // Update favorite button for games
        const favoriteBtn = document.getElementById('favorite-btn');
        if (favoriteBtn && album.type === 'game') {
            favoriteBtn.textContent = album.is_favorite ? '★' : '☆';
            favoriteBtn.classList.toggle('active', album.is_favorite);
            favoriteBtn.onclick = async () => {
                if (window.electronAPI && album.id) {
                    await window.electronAPI.toggleFavorite(album.id);
                    // Refresh games to get updated state
                    await this.loadGames();
                }
            };
        }

        // Update position counter
        const positionEl = document.getElementById('current-position');
        if (positionEl) {
            positionEl.textContent = this.currentIndex + 1;
        }
    }

    /**
     * Create a fallback thumbnail with file type label
     */
    createFileTypeThumbnail(ctx, album, width = 60, height = 60) {
        // Color schemes for different file types
        const typeColors = {
            'game': { bg: '#1B2838', text: '#FFFFFF' },
            'mp3': { bg: '#FF6B6B', text: '#FFFFFF' },
            'wav': { bg: '#FF6B6B', text: '#FFFFFF' },
            'flac': { bg: '#FF6B6B', text: '#FFFFFF' },
            'ogg': { bg: '#FF6B6B', text: '#FFFFFF' },
            'midi': { bg: '#FF6B6B', text: '#FFFFFF' },
            'm4a': { bg: '#FF6B6B', text: '#FFFFFF' },
            'jpg': { bg: '#4ECDC4', text: '#FFFFFF' },
            'jpeg': { bg: '#4ECDC4', text: '#FFFFFF' },
            'png': { bg: '#4ECDC4', text: '#FFFFFF' },
            'gif': { bg: '#4ECDC4', text: '#FFFFFF' },
            'bmp': { bg: '#4ECDC4', text: '#FFFFFF' },
            'webp': { bg: '#4ECDC4', text: '#FFFFFF' },
            'mp4': { bg: '#9B59B6', text: '#FFFFFF' },
            'avi': { bg: '#9B59B6', text: '#FFFFFF' },
            'mkv': { bg: '#9B59B6', text: '#FFFFFF' },
            'mov': { bg: '#9B59B6', text: '#FFFFFF' },
            'wmv': { bg: '#9B59B6', text: '#FFFFFF' },
            'flv': { bg: '#9B59B6', text: '#FFFFFF' },
            'webm': { bg: '#9B59B6', text: '#FFFFFF' }
        };

        // Determine file type and extension
        let fileType = 'FILE';
        let bgColor = '#808080';
        let textColor = '#FFFFFF';

        if (album.type === 'game') {
            fileType = 'GAME';
            const colors = typeColors['game'];
            bgColor = colors.bg;
            textColor = colors.text;
        } else if (album.type === 'music' && album.audio) {
            const ext = album.audio.split('.').pop().toLowerCase();
            fileType = ext.toUpperCase();
            const colors = typeColors[ext] || { bg: '#FF6B6B', text: '#FFFFFF' };
            bgColor = colors.bg;
            textColor = colors.text;
        } else if (album.type === 'image' && album.image) {
            const ext = album.image.split('.').pop().toLowerCase();
            fileType = ext.toUpperCase();
            const colors = typeColors[ext] || { bg: '#4ECDC4', text: '#FFFFFF' };
            bgColor = colors.bg;
            textColor = colors.text;
        } else if (album.type === 'video' && album.video) {
            const ext = album.video.split('.').pop().toLowerCase();
            fileType = ext.toUpperCase();
            const colors = typeColors[ext] || { bg: '#9B59B6', text: '#FFFFFF' };
            bgColor = colors.bg;
            textColor = colors.text;
        }

        // Draw background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        // Draw file type text
        ctx.fillStyle = textColor;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Truncate text if too long
        if (fileType.length > 6) {
            fileType = fileType.substring(0, 6);
        }

        ctx.fillText(fileType, width / 2, height / 2);
    }

    /**
     * Create thumbnails for bottom navigation bar
     */
    createThumbnails() {
        const container = document.getElementById('thumbnail-container');
        if (!container) return;

        container.innerHTML = '';

        this.filteredAlbums.forEach((album, index) => {
            const thumb = document.createElement('canvas');
            thumb.className = 'thumbnail';
            thumb.width = 60;
            thumb.height = 60;
            thumb.dataset.index = index; // Store index in dataset for debugging

            const ctx = thumb.getContext('2d');

            // Create wrapper for thumbnail + play button
            const thumbWrapper = document.createElement('div');
            thumbWrapper.className = 'thumbnail-wrapper';
            thumbWrapper.style.position = 'relative';
            thumbWrapper.style.display = 'inline-block';
            thumbWrapper.dataset.index = index; // Store index for click handler

            // Click handler for thumbnail - navigate to item
            // IMPORTANT: Capture index in closure by using dataset
            thumb.addEventListener('click', (e) => {
                // Only navigate if not clicking play button
                if (!e.target.closest('.thumbnail-play-btn')) {
                    const targetIndex = parseInt(e.target.dataset.index);
                    this.navigateTo(targetIndex);
                }
            });

            thumbWrapper.appendChild(thumb);

            // For games, prioritize exe icon for thumbnails
            if (album.type === 'game' && (album.exe_icon_path || album.icon_path)) {
                console.log(`[THUMBNAIL] Loading thumbnail for "${album.title}"`);
                console.log(`[THUMBNAIL]   exe_icon_path: ${album.exe_icon_path || 'null'}`);
                console.log(`[THUMBNAIL]   icon_path: ${album.icon_path || 'null'}`);
                console.log(`[THUMBNAIL]   boxart_path: ${album.boxart_path || 'null'}`);

                const img = new Image();
                img.crossOrigin = 'anonymous';

                // Draw colored background first as fallback
                const thumbColor = typeof album.color === 'number' && !isNaN(album.color)
                    ? '#' + album.color.toString(16).padStart(6, '0')
                    : '#808080';
                ctx.fillStyle = thumbColor;
                ctx.fillRect(0, 0, 60, 60);

                let primaryPath = album.exe_icon_path || album.icon_path;
                let fallbackPath = album.exe_icon_path ? album.icon_path : null;

                const primarySrc = this.getImageSrc(primaryPath, 'placeholder.png');
                console.log(`[THUMBNAIL]   Primary source: ${primarySrc}`);

                img.onload = () => {
                    console.log(`[THUMBNAIL] ✓ Successfully loaded thumbnail for "${album.title}"`);
                    // Only draw if this canvas is still in the DOM
                    if (thumb.isConnected) {
                        ctx.clearRect(0, 0, 60, 60);
                        ctx.drawImage(img, 0, 0, 60, 60);
                    }
                };

                img.onerror = (error) => {
                    console.warn(`[THUMBNAIL] ✗ Failed to load primary thumbnail for "${album.title}":`, error);
                    if (fallbackPath) {
                        const fallbackSrc = this.getImageSrc(fallbackPath, 'placeholder.png');
                        console.log(`[THUMBNAIL]   Trying fallback: ${fallbackSrc}`);

                        const fallbackImg = new Image();
                        fallbackImg.crossOrigin = 'anonymous';
                        fallbackImg.onload = () => {
                            console.log(`[THUMBNAIL] ✓ Loaded fallback thumbnail for "${album.title}"`);
                            if (thumb.isConnected) {
                                ctx.clearRect(0, 0, 60, 60);
                                ctx.drawImage(fallbackImg, 0, 0, 60, 60);
                            }
                        };
                        fallbackImg.onerror = (fallbackError) => {
                            console.warn(`[THUMBNAIL] ✗ Fallback also failed for "${album.title}":`, fallbackError);
                            if (thumb.isConnected) {
                                ctx.clearRect(0, 0, 60, 60);
                                this.createFileTypeThumbnail(ctx, album, 60, 60);
                            }
                        };
                        fallbackImg.src = fallbackSrc;
                    } else {
                        console.warn(`[THUMBNAIL] No fallback available for "${album.title}"`);
                        if (thumb.isConnected) {
                            ctx.clearRect(0, 0, 60, 60);
                            this.createFileTypeThumbnail(ctx, album, 60, 60);
                        }
                    }
                };

                img.src = primarySrc;
            } else if (album.type === 'image' && album.image) {
                // For images, try to load the actual image as thumbnail
                const img = new Image();
                img.crossOrigin = 'anonymous';

                ctx.fillStyle = '#4682B4';
                ctx.fillRect(0, 0, 60, 60);

                img.onload = () => {
                    if (thumb.isConnected) {
                        ctx.clearRect(0, 0, 60, 60);
                        ctx.drawImage(img, 0, 0, 60, 60);
                    }
                };

                img.onerror = () => {
                    if (thumb.isConnected) {
                        ctx.clearRect(0, 0, 60, 60);
                        this.createFileTypeThumbnail(ctx, album, 60, 60);
                    }
                };

                img.src = this.getImageSrc(album.image, 'placeholder.png');
            } else if (album.type === 'video' || album.type === 'music') {
                // Video and music thumbnails - show file type
                this.createFileTypeThumbnail(ctx, album, 60, 60);
            } else {
                // Default colored thumbnail
                const thumbColor = typeof album.color === 'number' && !isNaN(album.color)
                    ? '#' + album.color.toString(16).padStart(6, '0')
                    : '#808080';

                const gradient = ctx.createLinearGradient(0, 0, 0, 60);
                gradient.addColorStop(0, thumbColor);
                gradient.addColorStop(1, '#000000');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 60, 60);
            }

            // Add play button overlay for games
            if (album.type === 'game' && album.launch_command) {
                const playBtn = document.createElement('button');
                playBtn.className = 'thumbnail-play-btn';
                playBtn.innerHTML = '▶';
                playBtn.title = `Play ${album.title}`;
                playBtn.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.8);
                    cursor: pointer;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.2s, background 0.2s;
                    padding-left: 2px;
                    z-index: 10;
                `;

                // Show on hover
                thumbWrapper.addEventListener('mouseenter', () => {
                    playBtn.style.opacity = '1';
                });
                thumbWrapper.addEventListener('mouseleave', () => {
                    playBtn.style.opacity = '0';
                });

                // Hover effect for button
                playBtn.addEventListener('mouseenter', () => {
                    playBtn.style.background = 'rgba(0, 0, 0, 0.9)';
                    playBtn.style.borderColor = 'white';
                });
                playBtn.addEventListener('mouseleave', () => {
                    playBtn.style.background = 'rgba(0, 0, 0, 0.7)';
                    playBtn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                });

                // Click handler - launch game directly
                playBtn.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent thumbnail navigation
                    if (window.electronAPI && album.id && album.launch_command) {
                        const originalHTML = playBtn.innerHTML;
                        playBtn.innerHTML = '⏳';
                        playBtn.disabled = true;

                        try {
                            const result = await window.electronAPI.launchGame(album.launch_command, album.id);

                            if (result.success) {
                                playBtn.innerHTML = '✓';
                                this.showToast(`Launched ${album.title}`, 'success');
                                setTimeout(() => {
                                    playBtn.innerHTML = originalHTML;
                                    playBtn.disabled = false;
                                }, 1500);
                            } else {
                                this.showToast(`Failed to launch: ${result.error || 'Unknown error'}`, 'error');
                                playBtn.innerHTML = originalHTML;
                                playBtn.disabled = false;
                            }
                        } catch (error) {
                            console.error('[THUMBNAIL_PLAY] Launch error:', error);
                            this.showToast(`Error: ${error.message}`, 'error');
                            playBtn.innerHTML = originalHTML;
                            playBtn.disabled = false;
                        }
                    }
                });

                thumbWrapper.appendChild(playBtn);
            }

            container.appendChild(thumbWrapper);
        });

        this.updateThumbnails();
    }

    /**
     * Update thumbnail highlighting
     */
    updateThumbnails() {
        const thumbnails = document.querySelectorAll('.thumbnail');
        thumbnails.forEach((thumb, index) => {
            if (index === this.currentIndex) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });

        // Scroll thumbnail container to keep current item visible
        const container = document.getElementById('thumbnail-container');
        if (container && thumbnails[this.currentIndex]) {
            const thumbnail = thumbnails[this.currentIndex];
            const scrollLeft = thumbnail.offsetLeft - (container.clientWidth / 2) + (thumbnail.clientWidth / 2);
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }

    /**
     * Update FPS counter
     */
    updateFPS() {
        this.frames++;
        const currentTime = performance.now();

        if (currentTime >= this.lastTime + 1000) {
            const fps = Math.round((this.frames * 1000) / (currentTime - this.lastTime));

            const fpsCounter = document.getElementById('fps-counter');
            if (fpsCounter && this.settings.fpsCounter) {
                fpsCounter.textContent = `FPS: ${fps}`;
            }

            this.frames = 0;
            this.lastTime = currentTime;
        }
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        if (!this.camera || !this.renderer || !this.container) return;

        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

        if (this.composer) {
            this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
        }
    }

    /**
     * Toggle audio playback for music files
     */
    toggleAudioPlayback(album) {
        if (!album || !album.audio) {
            this.showToast('No audio file available', 'error');
            return;
        }

        // Initialize audio player if needed
        if (!this.audioPlayer) {
            this.audioPlayer = new Audio();
            this.currentAudioFile = null;

            // Add event listeners for playback events
            this.audioPlayer.addEventListener('ended', () => {
                this.showToast('Playback finished', 'info');
                this.updateInfo(); // Update button state
            });

            this.audioPlayer.addEventListener('error', (e) => {
                console.error('[AUDIO] Playback error:', e);
                this.showToast('Error playing audio file', 'error');
            });
        }

        // If playing a different file, stop it and start the new one
        if (this.currentAudioFile !== album.audio) {
            this.audioPlayer.pause();
            this.audioPlayer.src = album.audio;
            this.currentAudioFile = album.audio;

            this.audioPlayer.play().then(() => {
                this.showToast(`Playing: ${album.title}`, 'success');
                this.updateInfo(); // Update button to show pause
            }).catch(error => {
                console.error('[AUDIO] Play error:', error);
                this.showToast('Failed to play audio', 'error');
            });
        } else {
            // Same file - toggle play/pause
            if (this.audioPlayer.paused) {
                this.audioPlayer.play().then(() => {
                    this.showToast(`Playing: ${album.title}`, 'success');
                    this.updateInfo(); // Update button to show pause
                }).catch(error => {
                    console.error('[AUDIO] Play error:', error);
                    this.showToast('Failed to play audio', 'error');
                });
            } else {
                this.audioPlayer.pause();
                this.showToast('Playback paused', 'info');
                this.updateInfo(); // Update button to show play
            }
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoverFlowUI;
}
