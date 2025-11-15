/**
 * CoverFlow Navigation Module
 * Handles navigation between albums/games and position updates
 */

class CoverFlowNavigation {
    /**
     * Navigate to a specific index
     * @param {number} index - Target index
     */
    navigateTo(index) {
        if (index < 0 || index >= this.filteredAlbums.length) return;

        this.currentIndex = index;
        this.updateCoverPositions();
        this.updateInfo();
        this.updateThumbnails();

        // Update current position counter
        document.getElementById('current-position').textContent = this.currentIndex + 1;
    }

    /**
     * Navigate in a direction (left/right)
     * @param {string} direction - 'left' or 'right'
     */
    navigate(direction) {
        let newIndex = this.currentIndex;

        if (direction === 'left') {
            newIndex = Math.max(0, this.currentIndex - 1);
        } else if (direction === 'right') {
            newIndex = Math.min(this.filteredAlbums.length - 1, this.currentIndex + 1);
        }

        if (newIndex !== this.currentIndex) {
            this.navigateTo(newIndex);
        }
    }

    /**
     * Navigate to first item
     */
    navigateToFirst() {
        this.navigateTo(0);
    }

    /**
     * Navigate to last item
     */
    navigateToLast() {
        this.navigateTo(this.filteredAlbums.length - 1);
    }

    /**
     * Navigate to a random item
     */
    navigateRandom() {
        const randomIndex = Math.floor(Math.random() * this.filteredAlbums.length);
        this.navigateTo(randomIndex);
    }

    /**
     * Update cover positions with smooth animation
     * @param {boolean} immediate - Skip animation if true
     */
    updateCoverPositions(immediate = false) {
        const spacing = this.settings.coverSpacing;
        const sideAngle = this.settings.sideAngle;
        const sideOffset = 1.5;
        const depthOffset = 1.5;
        const speed = this.settings.animationSpeed;

        this.covers.forEach((cover, index) => {
            const diff = index - this.targetIndex;
            const parent = cover.parent;

            let targetX, targetZ, targetRotY, targetScale, targetY;

            if (diff === 0) {
                // Center cover
                targetX = 0;
                targetY = 0;
                targetZ = 0;
                targetRotY = 0;
                targetScale = 1.3;
            } else if (diff < 0) {
                // Left side covers
                targetX = diff * spacing - sideOffset;
                targetY = -0.2 - Math.abs(diff) * 0.05;
                targetZ = -depthOffset - Math.abs(diff) * 0.4;
                targetRotY = sideAngle;
                targetScale = Math.max(0.7, 1 - Math.abs(diff) * 0.1);
            } else {
                // Right side covers
                targetX = diff * spacing + sideOffset;
                targetY = -0.2 - Math.abs(diff) * 0.05;
                targetZ = -depthOffset - Math.abs(diff) * 0.4;
                targetRotY = -sideAngle;
                targetScale = Math.max(0.7, 1 - Math.abs(diff) * 0.1);
            }

            // Smooth animation or immediate positioning
            if (immediate) {
                parent.position.x = targetX;
                parent.position.y = targetY;
                parent.position.z = targetZ;
                parent.rotation.y = targetRotY;
                parent.scale.set(targetScale, targetScale, 1);
            } else {
                // Lerp for smooth transitions
                parent.position.x += (targetX - parent.position.x) * speed;
                parent.position.y += (targetY - parent.position.y) * speed;
                parent.position.z += (targetZ - parent.position.z) * speed;
                parent.rotation.y += (targetRotY - parent.rotation.y) * speed;

                const currentScale = parent.scale.x;
                const newScale = currentScale + (targetScale - currentScale) * speed;
                parent.scale.set(newScale, newScale, 1);
            }

            // Handle opacity
            const opacity = 1 - Math.min(Math.abs(diff) * 0.12, 0.6);
            if (cover.material) {
                cover.material.opacity = opacity;
                cover.material.transparent = true;
            }

            // Handle reflection visibility and opacity
            const reflection = parent.children && parent.children[1];
            if (reflection && reflection.userData && reflection.userData.isReflection) {
                reflection.visible = this.settings.showReflections;
                if (reflection.material) {
                    reflection.material.opacity = opacity * 0.3;
                }
            }
        });
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoverFlowNavigation;
}
