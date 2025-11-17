/**
 * Touch Gestures Module
 * Adds touch and swipe support for tablets and touch screens
 */

class TouchGestures {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.isTouching = false;
        this.touchStartTime = 0;
        this.minSwipeDistance = 50;
        this.maxSwipeTime = 300;
        this.pinchDistance = 0;
    }

    /**
     * Initialize touch gesture support
     */
    initializeTouchGestures() {
        console.log('[TOUCH] Initializing touch gestures...');

        const container = this.container || document.getElementById('coverflow-container');
        if (!container) {
            console.warn('[TOUCH] Container not found');
            return;
        }

        // Touch start
        container.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e);
        }, { passive: false });

        // Touch move
        container.addEventListener('touchmove', (e) => {
            this.handleTouchMove(e);
        }, { passive: false });

        // Touch end
        container.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e);
        }, { passive: false });

        console.log('[TOUCH] Touch gestures initialized');
        console.log('[TOUCH] - Swipe left/right: Navigate');
        console.log('[TOUCH] - Tap: Select/Play');
        console.log('[TOUCH] - Two-finger pinch: Zoom (future)');
    }

    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            // Single touch
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.touchStartTime = Date.now();
            this.isTouching = true;
        } else if (e.touches.length === 2) {
            // Two-finger pinch
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this.pinchDistance = Math.sqrt(dx * dx + dy * dy);
        }
    }

    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        if (!this.isTouching) return;

        // Prevent default scrolling
        e.preventDefault();

        if (e.touches.length === 1) {
            this.touchEndX = e.touches[0].clientX;
            this.touchEndY = e.touches[0].clientY;
        }
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        if (!this.isTouching) return;

        const touchDuration = Date.now() - this.touchStartTime;
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Check if it's a swipe
        if (absDeltaX > this.minSwipeDistance && absDeltaX > absDeltaY) {
            // Horizontal swipe
            if (touchDuration < this.maxSwipeTime) {
                if (deltaX > 0) {
                    // Swipe right - go to previous
                    console.log('[TOUCH] Swipe right detected');
                    this.navigate(-1);
                } else {
                    // Swipe left - go to next
                    console.log('[TOUCH] Swipe left detected');
                    this.navigate(1);
                }
            }
        } else if (absDeltaX < 10 && absDeltaY < 10 && touchDuration < 300) {
            // Tap detected
            console.log('[TOUCH] Tap detected');
            this.handleTap(this.touchStartX, this.touchStartY);
        }

        // Reset
        this.isTouching = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
    }

    /**
     * Handle tap event
     */
    handleTap(x, y) {
        // Check if tapped on the center cover (play button area)
        const centerArea = {
            left: window.innerWidth / 2 - 150,
            right: window.innerWidth / 2 + 150,
            top: window.innerHeight / 2 - 200,
            bottom: window.innerHeight / 2 + 200
        };

        if (x >= centerArea.left && x <= centerArea.right &&
            y >= centerArea.top && y <= centerArea.bottom) {
            // Tapped on center - trigger play/launch
            const currentAlbum = this.filteredAlbums[this.currentIndex];
            if (currentAlbum && currentAlbum.type === 'game') {
                console.log('[TOUCH] Launching game:', currentAlbum.title);
                this.launchGame(currentAlbum);
            } else if (currentAlbum) {
                console.log('[TOUCH] Opening media:', currentAlbum.title);
                this.openMediaFile(currentAlbum);
            }
        }
    }

    /**
     * Enable/disable touch gestures
     */
    toggleTouchGestures() {
        this.settings.touchGestures = !this.settings.touchGestures;
        this.saveSettings();

        if (this.settings.touchGestures) {
            this.initializeTouchGestures();
            this.showToast('Touch gestures enabled', 'success');
        } else {
            this.showToast('Touch gestures disabled (reload to fully disable)', 'info');
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TouchGestures;
}
