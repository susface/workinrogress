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
     * NOTE: This is a placeholder - the main CoverFlow class has the full implementation
     * This module version is NOT used because it's a prototype method and Object.assign
     * doesn't copy prototype methods. The main class implementation is used instead.
     * @param {boolean} immediate - Skip animation if true
     */
    updateCoverPositions(immediate = false) {
        // Placeholder - main class implementation is used
        console.warn('Module updateCoverPositions called - this should not happen');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoverFlowNavigation;
}
