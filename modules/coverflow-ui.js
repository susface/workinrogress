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

        // Show/hide and setup play button for games
        const playBtn = document.getElementById('play-btn');
        if (playBtn && album.type === 'game') {
            playBtn.style.display = 'block';
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

            const ctx = thumb.getContext('2d');

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
                    ctx.clearRect(0, 0, 60, 60);
                    ctx.drawImage(img, 0, 0, 60, 60);
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
                            ctx.clearRect(0, 0, 60, 60);
                            ctx.drawImage(fallbackImg, 0, 0, 60, 60);
                        };
                        fallbackImg.onerror = (fallbackError) => {
                            console.warn(`[THUMBNAIL] ✗ Fallback also failed for "${album.title}":`, fallbackError);
                            const gradient = ctx.createLinearGradient(0, 0, 60, 60);
                            gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
                            gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
                            ctx.fillStyle = gradient;
                            ctx.fillRect(0, 0, 60, 60);
                        };
                        fallbackImg.src = fallbackSrc;
                    } else {
                        console.warn(`[THUMBNAIL] No fallback available for "${album.title}"`);
                        const gradient = ctx.createLinearGradient(0, 0, 60, 60);
                        gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
                        gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
                        ctx.fillStyle = gradient;
                        ctx.fillRect(0, 0, 60, 60);
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
                    ctx.clearRect(0, 0, 60, 60);
                    ctx.drawImage(img, 0, 0, 60, 60);
                };

                img.onerror = () => {
                    const gradient = ctx.createLinearGradient(0, 0, 60, 60);
                    gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
                    gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, 60, 60);
                };

                img.src = this.getImageSrc(album.image, 'placeholder.png');
            } else if (album.type === 'video') {
                // Video thumbnail
                const gradient = ctx.createLinearGradient(0, 0, 0, 60);
                gradient.addColorStop(0, '#8B4789');
                gradient.addColorStop(1, '#5A2D58');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 60, 60);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.moveTo(20, 15);
                ctx.lineTo(20, 45);
                ctx.lineTo(45, 30);
                ctx.closePath();
                ctx.fill();
            } else if (album.type === 'music' || album.audio) {
                // Music thumbnail
                const gradient = ctx.createLinearGradient(0, 0, 0, 60);
                gradient.addColorStop(0, '#FF6347');
                gradient.addColorStop(1, '#DC143C');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 60, 60);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.fillRect(35, 15, 3, 25);
                ctx.ellipse(33, 40, 5, 4, -0.3, 0, Math.PI * 2);
                ctx.fill();
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

            // Create wrapper for thumbnail + play button
            const thumbWrapper = document.createElement('div');
            thumbWrapper.className = 'thumbnail-wrapper';
            thumbWrapper.style.position = 'relative';
            thumbWrapper.style.display = 'inline-block';

            // Click handler for thumbnail - navigate to item
            thumb.addEventListener('click', (e) => {
                // Only navigate if not clicking play button
                if (!e.target.closest('.thumbnail-play-btn')) {
                    this.navigateTo(index);
                }
            });

            thumbWrapper.appendChild(thumb);

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
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoverFlowUI;
}
