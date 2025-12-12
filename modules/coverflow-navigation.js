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

}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoverFlowNavigation;
}
