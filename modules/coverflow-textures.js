/**
 * CoverFlow Textures Module
 * Handles texture loading, image path resolution, and error placeholders
 */

class CoverFlowTextures {
    constructor() {
        // Initialize properties for Electron vs Browser detection
        this.isElectron = typeof window !== 'undefined' && window.electronAPI;
        this.appPaths = (typeof window !== 'undefined' && window.appPaths) || null;
        this.serverURL = (typeof window !== 'undefined' && window.serverURL) || null;
    }

    /**
     * Get image source path with proper handling for Electron vs Browser
     * @param {string} imagePath - Relative or absolute image path
     * @param {string} fallback - Fallback image path if primary fails
     * @returns {string} Properly formatted image URL
     */
    getImageSrc(imagePath, fallback = null) {
        if (!imagePath) {
            return fallback || 'placeholder.png';
        }

        // Handle already formatted URLs
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('file://') || imagePath.startsWith('data:')) {
            return imagePath;
        }

        // Electron mode - use file:// protocol with app paths
        if (this.isElectron && this.appPaths) {
            const gameDataPath = this.appPaths.gameDataPath;
            let fullPath;

            // Remove 'game_data/' prefix if present to avoid duplication
            const cleanPath = imagePath.replace(/^game_data[\/\\]/, '');

            // Handle absolute paths (Windows paths like C:\...)
            if (cleanPath.match(/^[A-Za-z]:[\/\\]/)) {
                fullPath = cleanPath;
            } else {
                // Relative path - combine with gameDataPath
                fullPath = gameDataPath + '/' + cleanPath.replace(/\\/g, '/');
            }

            // Convert to file:// URL
            // On Windows, path needs proper formatting
            const fileUrl = 'file:///' + fullPath.replace(/\\/g, '/').replace(/^\/+/, '');
            return fileUrl;
        }

        // Browser mode - use relative URL or server URL
        if (imagePath.startsWith('game_data/')) {
            return this.serverURL ? `${this.serverURL}/${imagePath}` : imagePath;
        }

        return imagePath;
    }

    /**
     * Create error placeholder texture with game title
     * @param {string} title - Title to display on placeholder
     * @returns {THREE.CanvasTexture} Error placeholder texture
     */
    createErrorPlaceholder(title = 'Image Not Found') {
        // Check if THREE.js is loaded
        if (typeof THREE === 'undefined') {
            console.error('[TEXTURE] THREE.js not loaded');
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Dark gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#2d3436');
        gradient.addColorStop(1, '#000000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        // Error icon (exclamation mark in circle)
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(256, 200, 50, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(246, 160, 20, 50);
        ctx.beginPath();
        ctx.arc(256, 230, 8, 0, Math.PI * 2);
        ctx.fill();

        // Title text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Image Not Found', 256, 300);

        // Game title (wrapped if too long)
        ctx.font = '18px Arial';
        ctx.fillStyle = '#95a5a6';

        const maxWidth = 480;
        const words = title.split(' ');
        let line = '';
        let y = 340;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, 256, y);
                line = words[n] + ' ';
                y += 25;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, 256, y);

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Load texture with automatic fallback chain and error handling
     * @param {string} imageSrc - Primary image source
     * @param {object} album - Album/game object with fallback paths
     * @param {THREE.Material} material - Material to apply texture to
     * @returns {Promise<THREE.Texture>} Loaded texture or error placeholder
     */
    loadTextureWithFallback(imageSrc, album, material) {
        /**
         * Fallback order: primary image -> boxart -> icon -> exe_icon -> error placeholder
         */
        // Validate album object
        if (!album) {
            console.error('[TEXTURE] Invalid album object');
            return Promise.resolve(this.createErrorPlaceholder('Invalid Album'));
        }

        // Check if THREE.js is loaded
        if (typeof THREE === 'undefined') {
            console.error('[TEXTURE] THREE.js not loaded');
            return Promise.reject(new Error('THREE.js not loaded'));
        }

        return new Promise((resolve) => {
            const loader = new THREE.TextureLoader();
            console.log(`[TEXTURE] Loading texture for "${album.title || 'Unknown'}" from: ${imageSrc}`);

            const tryLoad = (src, nextFallback) => {
                loader.load(
                    src,
                    (texture) => {
                        // Success
                        console.log(`[TEXTURE] ✓ Successfully loaded texture for "${album.title}"`);
                        if (material) {
                            material.map = texture;
                            material.needsUpdate = true;
                        }
                        resolve(texture);
                    },
                    undefined, // onProgress
                    (error) => {
                        // Load failed, try next fallback
                        console.warn(`[TEXTURE] ✗ Failed to load texture for "${album.title}" from: ${src}`);
                        if (nextFallback) {
                            nextFallback();
                        } else {
                            // No more fallbacks - use error placeholder
                            console.warn(`[TEXTURE] Using error placeholder for "${album.title}"`);
                            const errorTexture = this.createErrorPlaceholder(album.title || 'Image Not Found');
                            if (material) {
                                material.map = errorTexture;
                                material.needsUpdate = true;
                            }
                            resolve(errorTexture);
                        }
                    }
                );
            };

            // Build fallback chain for games
            if (album.type === 'game') {
                // Try exe_icon as final fallback before error placeholder
                const tryExeIcon = () => {
                    const exeIconPath = this.getImageSrc(album.exe_icon_path);
                    if (album.exe_icon_path && exeIconPath !== imageSrc) {
                        console.log(`[TEXTURE] Trying exe_icon fallback for "${album.title}": ${exeIconPath}`);
                        tryLoad(exeIconPath, null);
                    } else {
                        console.log(`[TEXTURE] No exe_icon available for "${album.title}"`);
                        // No exe icon - use error placeholder
                        const errorTexture = this.createErrorPlaceholder(album.title || 'Image Not Found');
                        if (material) {
                            material.map = errorTexture;
                            material.needsUpdate = true;
                        }
                        resolve(errorTexture);
                    }
                };

                // Try icon as second-to-last fallback
                const tryIcon = () => {
                    const iconPath = this.getImageSrc(album.icon_path);
                    if (album.icon_path && iconPath !== imageSrc) {
                        console.log(`[TEXTURE] Trying icon fallback for "${album.title}": ${iconPath}`);
                        tryLoad(iconPath, tryExeIcon);
                    } else {
                        console.log(`[TEXTURE] No icon fallback available for "${album.title}" (same as primary or null)`);
                        tryExeIcon();
                    }
                };

                // Try boxart as middle fallback
                const tryBoxart = () => {
                    const boxartPath = this.getImageSrc(album.boxart_path);
                    if (album.boxart_path && boxartPath !== imageSrc) {
                        console.log(`[TEXTURE] Trying boxart fallback for "${album.title}": ${boxartPath}`);
                        tryLoad(boxartPath, tryIcon);
                    } else {
                        console.log(`[TEXTURE] No boxart fallback available for "${album.title}" (same as primary or null)`);
                        tryIcon();
                    }
                };

                // Start with primary image
                tryLoad(imageSrc, tryBoxart);
            } else {
                // For non-game items, just try primary and error placeholder
                tryLoad(imageSrc, null);
            }
        });
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoverFlowTextures;
}
