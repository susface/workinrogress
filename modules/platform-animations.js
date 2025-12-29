/**
 * Platform-Specific Animations Module
 * Adds visual effects based on game platform (Steam, Epic, Xbox)
 */

class PlatformAnimations {
    constructor() {
        this.particleSystems = [];
        this.platformEffects = {};
        // Track animation frame IDs for cleanup
        this._animationFrameIds = [];
        this._disposed = false;
    }

    /**
     * Cleanup platform animations
     */
    dispose() {
        this._disposed = true;

        // Cancel all pending animation frames
        this._animationFrameIds.forEach(id => {
            if (id) cancelAnimationFrame(id);
        });
        this._animationFrameIds = [];

        // Clean up particle systems
        this.particleSystems.forEach(ps => {
            if (ps && this.scene) {
                this.scene.remove(ps);
                if (ps.geometry) ps.geometry.dispose();
                if (ps.material) ps.material.dispose();
            }
        });
        this.particleSystems = [];

        console.log('[PLATFORM] Disposed platform animations');
    }

    /**
     * Initialize platform animations
     */
    initializePlatformAnimations() {
        try {
            console.log('[PLATFORM] Initializing platform-specific animations...');

            // Validate required dependencies
            if (!this.settings) {
                console.error('[PLATFORM] Settings object not found! Cannot initialize.');
                return;
            }

            if (!this.scene) {
                console.error('[PLATFORM] Scene object not found! Cannot initialize.');
                return;
            }

            if (typeof THREE === 'undefined') {
                console.error('[PLATFORM] THREE.js not loaded! Cannot initialize platform animations.');
                return;
            }

            if (this.settings.platformAnimations === undefined) {
                this.settings.platformAnimations = true;
            }

            console.log('[PLATFORM] Platform animations initialized successfully:', {
                enabled: this.settings.platformAnimations,
                sceneAvailable: !!this.scene,
                threeJsAvailable: typeof THREE !== 'undefined'
            });
        } catch (error) {
            console.error('[PLATFORM] Failed to initialize platform animations:', error);
        }
    }

    /**
     * Create particle system for platform
     */
    createPlatformParticles(platform, cover) {
        if (!this.settings.platformAnimations) return;
        if (!this.scene) return;

        const platformConfigs = {
            'steam': {
                color: 0x66C0F4,
                particleCount: 200,
                speed: 2.0,
                life: 2.0,
                shape: 'steam' // Steam cloud effect
            },
            'epic': {
                color: 0x0078F2,
                particleCount: 150,
                speed: 3.0,
                life: 1.5,
                shape: 'spark' // Lightning sparks
            },
            'xbox': {
                color: 0x107C10,
                particleCount: 180,
                speed: 2.5,
                life: 1.8,
                shape: 'orb' // Green orbs
            }
        };

        const config = platformConfigs[platform?.toLowerCase()] || {
            color: 0xFFFFFF,
            particleCount: 100,
            speed: 2.0,
            life: 1.5,
            shape: 'default'
        };

        // Create particle geometry
        const particles = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];
        const lifetimes = [];

        for (let i = 0; i < config.particleCount; i++) {
            // Start at cover position with some randomness
            positions.push(
                cover.position.x + (Math.random() - 0.5) * 2,
                cover.position.y + (Math.random() - 0.5) * 2,
                cover.position.z + (Math.random() - 0.5) * 0.5
            );

            // Random velocities
            velocities.push(
                (Math.random() - 0.5) * config.speed,
                Math.random() * config.speed + 1,
                (Math.random() - 0.5) * config.speed
            );

            // Random lifetimes
            lifetimes.push(Math.random() * config.life);
        }

        particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        particles.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
        particles.setAttribute('lifetime', new THREE.Float32BufferAttribute(lifetimes, 1));

        // Particle material
        const particleMaterial = new THREE.PointsMaterial({
            color: config.color,
            size: 0.1,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const particleSystem = new THREE.Points(particles, particleMaterial);
        this.scene.add(particleSystem);

        // Animate particles
        this.animatePlatformParticles(particleSystem, config);
    }

    /**
     * Animate platform particles
     */
    animatePlatformParticles(particleSystem, config) {
        const startTime = Date.now();
        const duration = config.life * 1000;

        const animate = () => {
            if (this._disposed) return; // Stop if disposed

            const elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                // Remove particle system
                this.scene.remove(particleSystem);
                particleSystem.geometry.dispose();
                particleSystem.material.dispose();
                return;
            }

            const positions = particleSystem.geometry.attributes.position.array;
            const velocities = particleSystem.geometry.attributes.velocity.array;
            const lifetimes = particleSystem.geometry.attributes.lifetime.array;

            for (let i = 0; i < positions.length; i += 3) {
                // Update position based on velocity
                positions[i] += velocities[i] * 0.016;
                positions[i + 1] += velocities[i + 1] * 0.016;
                positions[i + 2] += velocities[i + 2] * 0.016;

                // Apply gravity
                velocities[i + 1] -= 0.01;
            }

            particleSystem.geometry.attributes.position.needsUpdate = true;

            // Fade out
            const progress = elapsed / duration;
            particleSystem.material.opacity = 0.8 * (1 - progress);

            const rafId = requestAnimationFrame(animate);
            this._animationFrameIds.push(rafId);
        };

        animate();
    }

    /**
     * Add platform glow effect to cover
     */
    addPlatformGlow(cover, platform) {
        if (!this.settings.platformAnimations) return;

        const glowColors = {
            'steam': 0x66C0F4,
            'epic': 0x0078F2,
            'xbox': 0x107C10
        };

        const color = glowColors[platform?.toLowerCase()] || 0xFFFFFF;

        // Create glow sprite
        const spriteMaterial = new THREE.SpriteMaterial({
            color: color,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(3, 3, 1);
        sprite.position.copy(cover.position);
        this.scene.add(sprite);

        // Pulse animation
        let time = 0;
        const animate = () => {
            if (this._disposed) return; // Stop if disposed

            time += 0.05;

            if (time > Math.PI * 2) {
                this.scene.remove(sprite);
                // Properly dispose of material to prevent memory leak
                sprite.material.dispose();
                return;
            }

            sprite.material.opacity = Math.sin(time) * 0.3;
            sprite.scale.set(3 + Math.sin(time) * 0.5, 3 + Math.sin(time) * 0.5, 1);

            const rafId = requestAnimationFrame(animate);
            this._animationFrameIds.push(rafId);
        };

        animate();
    }

    /**
     * Play platform-specific launch animation
     */
    playPlatformLaunchAnimation(album, coverIndex) {
        try {
            if (!this.settings || !this.settings.platformAnimations) {
                console.log('[PLATFORM] Platform animations are disabled');
                return;
            }

            if (!album || !album.platform) {
                console.log('[PLATFORM] No platform information available');
                return;
            }

            if (!this.covers || !this.covers[coverIndex]) {
                console.error('[PLATFORM] Cover not found at index', coverIndex);
                return;
            }

            if (!this.scene) {
                console.error('[PLATFORM] Scene not available');
                return;
            }

            if (typeof THREE === 'undefined') {
                console.error('[PLATFORM] THREE.js not available');
                return;
            }

            const cover = this.covers[coverIndex];
            console.log(`[PLATFORM] Playing ${album.platform} launch animation for cover at index ${coverIndex}`);

            // Create particles
            this.createPlatformParticles(album.platform, cover);

            // Add glow effect
            this.addPlatformGlow(cover, album.platform);

            // Platform-specific extra effects
            switch (album.platform.toLowerCase()) {
                case 'steam':
                    this.playSteamAnimation(cover);
                    break;
                case 'epic':
                    this.playEpicAnimation(cover);
                    break;
                case 'xbox':
                    this.playXboxAnimation(cover);
                    break;
                default:
                    console.log(`[PLATFORM] No specific animation for platform: ${album.platform}`);
            }
        } catch (error) {
            console.error('[PLATFORM] Error playing platform launch animation:', error);
        }
    }

    /**
     * Steam-specific animation (steam clouds)
     */
    playSteamAnimation(cover) {
        // Rising steam effect
        console.log('[PLATFORM] Steam cloud effect');
    }

    /**
     * Epic-specific animation (lightning)
     */
    playEpicAnimation(cover) {
        // Lightning flash effect
        console.log('[PLATFORM] Epic lightning effect');
    }

    /**
     * Xbox-specific animation (green aura)
     */
    playXboxAnimation(cover) {
        // Expanding green circle
        console.log('[PLATFORM] Xbox aura effect');
    }

    /**
     * Toggle platform animations
     */
    togglePlatformAnimations() {
        this.settings.platformAnimations = !this.settings.platformAnimations;
        this.saveSettings();

        if (this.settings.platformAnimations) {
            this.showToast('Platform animations enabled', 'success');
        } else {
            this.showToast('Platform animations disabled', 'info');
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlatformAnimations;
}
