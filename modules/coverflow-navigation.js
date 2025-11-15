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
            const diff = index - this.currentIndex;
            let targetX, targetZ, targetRotationY, targetScale;

            if (diff === 0) {
                // Center cover
                targetX = 0;
                targetZ = 0;
                targetRotationY = 0;
                targetScale = 1;
            } else if (diff < 0) {
                // Left side covers
                targetX = diff * spacing - sideOffset;
                targetZ = Math.abs(diff) * depthOffset;
                targetRotationY = sideAngle;
                targetScale = 0.8;
            } else {
                // Right side covers
                targetX = diff * spacing + sideOffset;
                targetZ = Math.abs(diff) * depthOffset;
                targetRotationY = -sideAngle;
                targetScale = 0.8;
            }

            // Smooth animation or immediate positioning
            if (immediate) {
                cover.parent.position.x = targetX;
                cover.parent.position.z = targetZ;
                cover.parent.rotation.y = targetRotationY;
                cover.parent.scale.setScalar(targetScale);
            } else {
                // Lerp for smooth transitions
                cover.parent.position.x += (targetX - cover.parent.position.x) * speed;
                cover.parent.position.z += (targetZ - cover.parent.position.z) * speed;
                cover.parent.rotation.y += (targetRotationY - cover.parent.rotation.y) * speed;

                const currentScale = cover.parent.scale.x;
                const newScale = currentScale + (targetScale - currentScale) * speed;
                cover.parent.scale.setScalar(newScale);
            }
        });
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoverFlowNavigation;
}
