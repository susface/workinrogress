/**
 * CoverFlow Enhancements Module
 * Adds zoom on selection, infinite loop, and dynamic background color
 */

class CoverFlowEnhancements {
    constructor() {
        this.backgroundTransition = {
            current: null,
            target: null,
            progress: 0
        };
    }

    /**
     * Enhanced updateCoverPositions with zoom on selection
     */
    updateCoverPositionsWithZoom(immediate = false) {
        const spacing = this.settings.coverSpacing;
        const sideAngle = this.settings.sideAngle;
        const sideOffset = 1.5;
        const depthOffset = 1.5;
        const speed = this.settings.animationSpeed;

        let isStillAnimating = false;
        const threshold = 0.001;

        this.covers.forEach((cover, index) => {
            const distanceFromCenter = index - this.targetIndex;

            // Calculate target position
            let targetX, targetZ, targetRotationY, targetScale, targetOpacity;

            if (distanceFromCenter === 0) {
                // Center cover - zoomed and highlighted
                targetX = 0;
                targetZ = 0;
                targetRotationY = 0;
                targetScale = this.settings.zoomOnSelect ? 1.3 : 1.0; // Zoom effect (if enabled)
                targetOpacity = 1.0;
            } else {
                // Side covers
                const side = distanceFromCenter > 0 ? 1 : -1;
                const absDistance = Math.abs(distanceFromCenter);

                targetX = side * (sideOffset + (absDistance - 1) * spacing);
                targetZ = -depthOffset * absDistance;
                targetRotationY = side * sideAngle;
                targetScale = 1.0 - (absDistance * 0.1); // Smaller as distance increases
                targetOpacity = Math.max(0.3, 1.0 - (absDistance * 0.2));
            }

            // Smooth transition or immediate
            if (immediate) {
                cover.position.set(targetX, this.centerCoverBaseY, targetZ);
                cover.rotation.y = targetRotationY;
                cover.scale.set(targetScale, targetScale, targetScale);
                cover.material.opacity = targetOpacity;

                // Update reflection
                const reflection = this.reflections[index];
                if (reflection) {
                    reflection.position.set(targetX, -this.centerCoverBaseY - 0.1, targetZ);
                    reflection.rotation.y = targetRotationY;
                    reflection.scale.set(targetScale, targetScale, targetScale);
                    reflection.material.opacity = targetOpacity * 0.3;
                }
            } else {
                // Smooth lerp
                const lerpFactor = speed;

                cover.position.x += (targetX - cover.position.x) * lerpFactor;
                cover.position.z += (targetZ - cover.position.z) * lerpFactor;
                cover.rotation.y += (targetRotationY - cover.rotation.y) * lerpFactor;

                // Smooth scale transition
                const currentScale = cover.scale.x;
                const newScale = currentScale + (targetScale - currentScale) * lerpFactor;
                cover.scale.set(newScale, newScale, newScale);

                // Smooth opacity
                cover.material.opacity += (targetOpacity - cover.material.opacity) * lerpFactor;

                // Update reflection
                const reflection = this.reflections[index];
                if (reflection) {
                    reflection.position.x = cover.position.x;
                    reflection.position.z = cover.position.z;
                    reflection.rotation.y = cover.rotation.y;
                    reflection.scale.copy(cover.scale);
                    reflection.material.opacity = cover.material.opacity * 0.3;
                }

                // Check if still animating
                if (
                    Math.abs(cover.position.x - targetX) > threshold ||
                    Math.abs(cover.position.z - targetZ) > threshold ||
                    Math.abs(cover.rotation.y - targetRotationY) > threshold ||
                    Math.abs(currentScale - targetScale) > threshold
                ) {
                    isStillAnimating = true;
                }
            }
        });

        this.isAnimating = isStillAnimating;
    }

    /**
     * Infinite loop navigation
     */
    navigateWithLoop(direction) {
        if (this.isAnimating) return;

        let newIndex = this.targetIndex + direction;

        // Infinite loop - wrap around (if enabled)
        if (this.settings.infiniteLoop) {
            if (newIndex < 0) {
                newIndex = this.filteredAlbums.length - 1;
            } else if (newIndex >= this.filteredAlbums.length) {
                newIndex = 0;
            }
        } else {
            // Clamp to bounds if infinite loop is disabled
            if (newIndex < 0) {
                newIndex = 0;
            } else if (newIndex >= this.filteredAlbums.length) {
                newIndex = this.filteredAlbums.length - 1;
            }
        }

        // Play navigation sound effect
        if (typeof this.playNavigateSound === 'function') {
            this.playNavigateSound();
        }

        this.navigateTo(newIndex);
        this.updateDynamicBackground();
    }

    /**
     * Update background color based on current cover
     */
    updateDynamicBackground() {
        if (!this.settings.dynamicBackground) return;
        if (!this.filteredAlbums[this.targetIndex]) return;

        const currentAlbum = this.filteredAlbums[this.targetIndex];

        // Platform-specific color schemes
        const platformColors = {
            'steam': new THREE.Color(0x1B2838),
            'epic': new THREE.Color(0x2A2A2A),
            'xbox': new THREE.Color(0x107C10),
            'music': new THREE.Color(0x1DB954), // Spotify green
            'video': new THREE.Color(0xE50914), // Netflix red
            'image': new THREE.Color(0x833AB4)  // Instagram purple
        };

        // Get target color
        let targetColor;
        if (currentAlbum.platform && platformColors[currentAlbum.platform.toLowerCase()]) {
            targetColor = platformColors[currentAlbum.platform.toLowerCase()];
        } else if (currentAlbum.color) {
            targetColor = new THREE.Color(currentAlbum.color);
        } else {
            targetColor = new THREE.Color(this.settings.backgroundColor);
        }

        // Smooth transition
        this.backgroundTransition.target = targetColor;
        this.animateBackgroundTransition();
    }

    /**
     * Animate background color transition
     */
    animateBackgroundTransition() {
        if (!this.backgroundTransition.target) return;

        const animate = () => {
            if (!this.backgroundTransition.target) return;

            // Increment progress
            this.backgroundTransition.progress += 0.02;

            if (this.backgroundTransition.progress >= 1) {
                this.scene.background = this.backgroundTransition.target.clone();
                this.backgroundTransition.current = this.backgroundTransition.target;
                this.backgroundTransition.target = null;
                this.backgroundTransition.progress = 0;
                return;
            }

            // Lerp between current and target
            if (!this.backgroundTransition.current) {
                this.backgroundTransition.current = new THREE.Color(this.scene.background);
            }

            const newColor = this.backgroundTransition.current.clone().lerp(
                this.backgroundTransition.target,
                this.backgroundTransition.progress
            );
            this.scene.background = newColor;

            requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Enable/disable dynamic background
     */
    toggleDynamicBackground() {
        this.settings.dynamicBackground = !this.settings.dynamicBackground;
        this.saveSettings();

        if (this.settings.dynamicBackground) {
            this.updateDynamicBackground();
            this.showToast('Dynamic background enabled', 'success');
        } else {
            this.scene.background = new THREE.Color(this.settings.backgroundColor);
            this.showToast('Dynamic background disabled', 'info');
        }
    }

    /**
     * Initialize enhancements
     */
    initializeEnhancements() {
        console.log('[ENHANCEMENTS] Initializing coverflow enhancements...');

        // Add dynamic background to settings if not present
        if (this.settings.dynamicBackground === undefined) {
            this.settings.dynamicBackground = true;
        }

        // Override updateCoverPositions to use enhanced version
        this.updateCoverPositions = this.updateCoverPositionsWithZoom.bind(this);

        // Override navigate to use loop version
        this.navigate = this.navigateWithLoop.bind(this);

        console.log('[ENHANCEMENTS] Coverflow enhancements initialized');
        console.log('[ENHANCEMENTS] - Zoom on selection: ENABLED');
        console.log('[ENHANCEMENTS] - Infinite loop: ENABLED');
        console.log('[ENHANCEMENTS] - Dynamic background:', this.settings.dynamicBackground ? 'ENABLED' : 'DISABLED');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoverFlowEnhancements;
}
