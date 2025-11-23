// Dynamic Background Module
// Extracts dominant colors from cover art and creates dynamic backgrounds

class DynamicBackgroundManager {
    constructor() {
        this.settings = this.loadSettings();
        this.currentBackground = null;
        this.colorCache = new Map(); // gameId -> colors
        this.transitionDuration = 1000; // 1 second
    }

    loadSettings() {
        const defaultSettings = {
            enabled: true,
            mode: 'gradient', // gradient, radial, animated, particles
            intensity: 0.5,
            blur: 20,
            transitionSpeed: 1000,
            useGenreEffects: true,
            particleCount: 50
        };

        try {
            const saved = localStorage.getItem('dynamic-background-settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.error('Failed to load dynamic background settings:', error);
            return defaultSettings;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('dynamic-background-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save dynamic background settings:', error);
        }
    }

    // Extract dominant colors from image
    async extractColors(imageUrl, numColors = 5) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Resize for faster processing
                    const maxSize = 200;
                    const scale = Math.min(maxSize / img.width, maxSize / img.height);
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    const colors = this.quantizeColors(imageData, numColors);
                    resolve(colors);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    // Simple color quantization using median cut algorithm
    quantizeColors(imageData, numColors) {
        const pixels = [];

        // Sample pixels (skip some for performance)
        for (let i = 0; i < imageData.data.length; i += 4 * 5) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];

            // Skip transparent and very dark pixels
            if (a > 125 && (r + g + b) > 30) {
                pixels.push([r, g, b]);
            }
        }

        if (pixels.length === 0) {
            return ['#000000'];
        }

        // Simple color clustering
        const buckets = this.medianCut(pixels, numColors);

        return buckets.map(bucket => {
            const avg = this.averageColor(bucket);
            return this.rgbToHex(avg[0], avg[1], avg[2]);
        });
    }

    medianCut(pixels, depth) {
        if (depth === 0 || pixels.length === 0) {
            return [pixels];
        }

        // Find the channel with the greatest range
        const ranges = [0, 1, 2].map(channel => {
            const values = pixels.map(p => p[channel]);
            return Math.max(...values) - Math.min(...values);
        });

        const splitChannel = ranges.indexOf(Math.max(...ranges));

        // Sort by that channel
        pixels.sort((a, b) => a[splitChannel] - b[splitChannel]);

        // Split in half
        const mid = Math.floor(pixels.length / 2);
        const left = pixels.slice(0, mid);
        const right = pixels.slice(mid);

        return [
            ...this.medianCut(left, depth - 1),
            ...this.medianCut(right, depth - 1)
        ];
    }

    averageColor(pixels) {
        const sum = pixels.reduce((acc, pixel) => {
            return [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]];
        }, [0, 0, 0]);

        return sum.map(val => Math.round(val / pixels.length));
    }

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // Apply background for a game
    async applyBackground(game) {
        if (!this.settings.enabled) return;

        // Check cache first
        let colors = this.colorCache.get(game.id);

        if (!colors && game.image) {
            try {
                colors = await this.extractColors(game.image);
                this.colorCache.set(game.id, colors);
            } catch (error) {
                console.error('Failed to extract colors:', error);
                colors = ['#1a1a2e', '#16213e', '#0f3460'];
            }
        }

        if (!colors) {
            colors = ['#1a1a2e', '#16213e', '#0f3460'];
        }

        // Apply background based on mode
        switch (this.settings.mode) {
            case 'gradient':
                this.applyGradient(colors);
                break;
            case 'radial':
                this.applyRadialGradient(colors);
                break;
            case 'animated':
                this.applyAnimatedGradient(colors);
                break;
            case 'particles':
                this.applyParticleBackground(colors);
                break;
        }

        // Apply genre-specific effects
        if (this.settings.useGenreEffects && game.genre) {
            this.applyGenreEffect(game.genre);
        }
    }

    applyGradient(colors) {
        const bg = this.getOrCreateBackground();

        // Create gradient from multiple colors
        const gradient = colors.length >= 2
            ? `linear-gradient(135deg, ${colors.join(', ')})`
            : colors[0];

        bg.style.background = gradient;
        bg.style.opacity = this.settings.intensity;
        bg.style.filter = `blur(${this.settings.blur}px)`;
    }

    applyRadialGradient(colors) {
        const bg = this.getOrCreateBackground();

        const gradient = colors.length >= 2
            ? `radial-gradient(circle at 50% 50%, ${colors.join(', ')})`
            : `radial-gradient(circle, ${colors[0]}, #000)`;

        bg.style.background = gradient;
        bg.style.opacity = this.settings.intensity;
        bg.style.filter = `blur(${this.settings.blur}px)`;
    }

    applyAnimatedGradient(colors) {
        const bg = this.getOrCreateBackground();

        // Create animated gradient
        const gradient = `linear-gradient(-45deg, ${colors.join(', ')})`;
        bg.style.background = gradient;
        bg.style.backgroundSize = '400% 400%';
        bg.style.opacity = this.settings.intensity;
        bg.style.filter = `blur(${this.settings.blur}px)`;

        // Add animation
        if (!document.getElementById('gradient-animation-style')) {
            const style = document.createElement('style');
            style.id = 'gradient-animation-style';
            style.textContent = `
                @keyframes gradient-shift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .dynamic-bg.animated {
                    animation: gradient-shift 15s ease infinite;
                }
            `;
            document.head.appendChild(style);
        }

        bg.classList.add('animated');
    }

    applyParticleBackground(colors) {
        const bg = this.getOrCreateBackground();
        bg.innerHTML = ''; // Clear previous particles

        // Create particle system
        for (let i = 0; i < this.settings.particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'bg-particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 2}px;
                height: ${Math.random() * 4 + 2}px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                opacity: ${Math.random() * 0.5 + 0.2};
                animation: float ${Math.random() * 10 + 10}s infinite ease-in-out;
                animation-delay: ${Math.random() * 5}s;
            `;
            bg.appendChild(particle);
        }

        // Add animation
        if (!document.getElementById('particle-float-style')) {
            const style = document.createElement('style');
            style.id = 'particle-float-style';
            style.textContent = `
                @keyframes float {
                    0%, 100% {
                        transform: translate(0, 0);
                    }
                    25% {
                        transform: translate(20px, -20px);
                    }
                    50% {
                        transform: translate(-20px, 20px);
                    }
                    75% {
                        transform: translate(20px, 20px);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        bg.style.filter = `blur(${this.settings.blur}px)`;
        bg.style.opacity = this.settings.intensity;
    }

    applyGenreEffect(genre) {
        const bg = this.getOrCreateBackground();
        const genreLower = genre.toLowerCase();

        // Add genre-specific overlays
        if (genreLower.includes('horror')) {
            bg.style.animation = 'flicker 0.5s infinite';
        } else if (genreLower.includes('action')) {
            bg.style.filter += ' contrast(1.2) saturate(1.3)';
        } else if (genreLower.includes('rpg')) {
            bg.style.filter += ' sepia(0.2)';
        } else if (genreLower.includes('racing')) {
            bg.style.filter += ' saturate(1.5) contrast(1.1)';
        }
    }

    getOrCreateBackground() {
        let bg = document.getElementById('dynamic-background');

        if (!bg) {
            bg = document.createElement('div');
            bg.id = 'dynamic-background';
            bg.className = 'dynamic-bg';
            bg.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: -1;
                transition: all ${this.settings.transitionSpeed}ms ease;
                pointer-events: none;
            `;

            document.body.insertBefore(bg, document.body.firstChild);
        }

        return bg;
    }

    // Clear background
    clear() {
        const bg = document.getElementById('dynamic-background');
        if (bg) {
            bg.style.opacity = 0;
            setTimeout(() => {
                bg.style.background = '';
                bg.innerHTML = '';
            }, this.settings.transitionSpeed);
        }
    }

    // Create settings UI
    createSettingsUI() {
        const container = document.createElement('div');
        container.className = 'dynamic-bg-settings';
        container.innerHTML = `
            <div class="settings-section">
                <h3>🎨 Dynamic Backgrounds</h3>

                <label class="setting-item">
                    <input type="checkbox" id="dynbg-enabled" ${this.settings.enabled ? 'checked' : ''}>
                    <span>Enable dynamic backgrounds</span>
                </label>

                <label class="setting-item">
                    <span>Background Mode:</span>
                    <select id="dynbg-mode" style="padding: 5px;">
                        <option value="gradient" ${this.settings.mode === 'gradient' ? 'selected' : ''}>Gradient</option>
                        <option value="radial" ${this.settings.mode === 'radial' ? 'selected' : ''}>Radial</option>
                        <option value="animated" ${this.settings.mode === 'animated' ? 'selected' : ''}>Animated</option>
                        <option value="particles" ${this.settings.mode === 'particles' ? 'selected' : ''}>Particles</option>
                    </select>
                </label>

                <label class="setting-item">
                    <span>Intensity: <span id="dynbg-intensity-value">${Math.round(this.settings.intensity * 100)}%</span></span>
                    <input type="range" id="dynbg-intensity" min="0" max="100" value="${this.settings.intensity * 100}">
                </label>

                <label class="setting-item">
                    <span>Blur: <span id="dynbg-blur-value">${this.settings.blur}px</span></span>
                    <input type="range" id="dynbg-blur" min="0" max="50" value="${this.settings.blur}">
                </label>

                <label class="setting-item">
                    <span>Transition Speed: <span id="dynbg-speed-value">${this.settings.transitionSpeed}ms</span></span>
                    <input type="range" id="dynbg-speed" min="100" max="3000" step="100" value="${this.settings.transitionSpeed}">
                </label>

                <label class="setting-item">
                    <input type="checkbox" id="dynbg-genre-effects" ${this.settings.useGenreEffects ? 'checked' : ''}>
                    <span>Apply genre-specific effects</span>
                </label>

                <div class="setting-item" id="particle-settings" style="display: ${this.settings.mode === 'particles' ? 'block' : 'none'};">
                    <label>
                        <span>Particle Count: <span id="dynbg-particles-value">${this.settings.particleCount}</span></span>
                        <input type="range" id="dynbg-particles" min="10" max="200" value="${this.settings.particleCount}">
                    </label>
                </div>

                <div class="preview-box" style="
                    width: 100%;
                    height: 100px;
                    margin-top: 15px;
                    border-radius: 5px;
                    position: relative;
                    overflow: hidden;
                    border: 2px solid #444;
                " id="bg-preview">
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-shadow: 0 0 10px black;">
                        Preview
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        container.querySelector('#dynbg-enabled').addEventListener('change', (e) => {
            this.settings.enabled = e.target.checked;
            this.saveSettings();
            if (!e.target.checked) {
                this.clear();
            }
        });

        container.querySelector('#dynbg-mode').addEventListener('change', (e) => {
            this.settings.mode = e.target.value;
            this.saveSettings();

            // Show/hide particle settings
            const particleSettings = container.querySelector('#particle-settings');
            particleSettings.style.display = e.target.value === 'particles' ? 'block' : 'none';

            this.updatePreview(container);
        });

        container.querySelector('#dynbg-intensity').addEventListener('input', (e) => {
            this.settings.intensity = e.target.value / 100;
            container.querySelector('#dynbg-intensity-value').textContent = `${e.target.value}%`;
            this.saveSettings();
            this.updatePreview(container);
        });

        container.querySelector('#dynbg-blur').addEventListener('input', (e) => {
            this.settings.blur = parseInt(e.target.value);
            container.querySelector('#dynbg-blur-value').textContent = `${e.target.value}px`;
            this.saveSettings();
            this.updatePreview(container);
        });

        container.querySelector('#dynbg-speed').addEventListener('input', (e) => {
            this.settings.transitionSpeed = parseInt(e.target.value);
            container.querySelector('#dynbg-speed-value').textContent = `${e.target.value}ms`;
            this.saveSettings();
        });

        container.querySelector('#dynbg-genre-effects').addEventListener('change', (e) => {
            this.settings.useGenreEffects = e.target.checked;
            this.saveSettings();
        });

        container.querySelector('#dynbg-particles').addEventListener('input', (e) => {
            this.settings.particleCount = parseInt(e.target.value);
            container.querySelector('#dynbg-particles-value').textContent = e.target.value;
            this.saveSettings();
            this.updatePreview(container);
        });

        // Initial preview
        this.updatePreview(container);

        return container;
    }

    updatePreview(container) {
        const preview = container.querySelector('#bg-preview');
        const colors = ['#e74c3c', '#3498db', '#9b59b6', '#f39c12'];

        // Clear preview
        preview.style.background = '';
        preview.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-shadow: 0 0 10px black;">Preview</div>';

        // Apply preview style
        switch (this.settings.mode) {
            case 'gradient':
                preview.style.background = `linear-gradient(135deg, ${colors.join(', ')})`;
                break;
            case 'radial':
                preview.style.background = `radial-gradient(circle, ${colors.join(', ')})`;
                break;
            case 'animated':
                preview.style.background = `linear-gradient(-45deg, ${colors.join(', ')})`;
                preview.style.backgroundSize = '400% 400%';
                preview.style.animation = 'gradient-shift 5s ease infinite';
                break;
            case 'particles':
                for (let i = 0; i < Math.min(this.settings.particleCount, 50); i++) {
                    const particle = document.createElement('div');
                    particle.style.cssText = `
                        position: absolute;
                        width: ${Math.random() * 3 + 1}px;
                        height: ${Math.random() * 3 + 1}px;
                        background: ${colors[Math.floor(Math.random() * colors.length)]};
                        border-radius: 50%;
                        left: ${Math.random() * 100}%;
                        top: ${Math.random() * 100}%;
                        opacity: ${Math.random() * 0.5 + 0.2};
                    `;
                    preview.appendChild(particle);
                }
                break;
        }

        preview.style.opacity = this.settings.intensity;
        preview.style.filter = `blur(${Math.min(this.settings.blur, 10)}px)`;
    }
}

// Initialize
if (typeof window !== 'undefined') {
    window.dynamicBackgroundManager = new DynamicBackgroundManager();
}
