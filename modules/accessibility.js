/**
 * Accessibility Features Module
 * Screen reader support, high contrast mode, large text, colorblind modes
 */

class AccessibilityFeatures {
    constructor() {
        this.settings = this.loadSettings();
        this.announcer = null;

        window.logger?.debug('ACCESSIBILITY', 'Accessibility features initialized');
    }

    /**
     * Initialize accessibility features
     */
    initialize() {
        console.log('[ACCESSIBILITY] Initializing accessibility features...');

        // Create screen reader announcer
        this.createAnnouncer();

        // Apply saved settings
        this.applySettings();

        // Add accessibility toolbar
        this.addAccessibilityToolbar();

        // Add ARIA labels
        this.enhanceARIA();

        // Add skip to content link
        this.addSkipLink();

        console.log('[ACCESSIBILITY] ✓ Accessibility features initialized');
    }

    /**
     * Create screen reader announcer element
     */
    createAnnouncer() {
        this.announcer = document.createElement('div');
        this.announcer.id = 'sr-announcer';
        this.announcer.setAttribute('role', 'status');
        this.announcer.setAttribute('aria-live', 'polite');
        this.announcer.setAttribute('aria-atomic', 'true');
        this.announcer.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(this.announcer);
    }

    /**
     * Announce message to screen readers
     */
    announce(message, priority = 'polite') {
        if (!this.announcer) return;

        this.announcer.setAttribute('aria-live', priority);
        this.announcer.textContent = '';

        setTimeout(() => {
            this.announcer.textContent = message;
        }, 100);

        window.logger?.debug('ACCESSIBILITY', 'Announced:', message);
    }

    /**
     * Add accessibility toolbar
     */
    addAccessibilityToolbar() {
        const toolbar = document.createElement('div');
        toolbar.id = 'accessibility-toolbar';
        toolbar.className = 'accessibility-toolbar';
        toolbar.innerHTML = `
            <button class="toolbar-toggle" onclick="this.parentElement.classList.toggle('expanded')" aria-label="Toggle accessibility toolbar">
                ♿
            </button>
            <div class="toolbar-content">
                <h3>Accessibility Options</h3>
                <div class="toolbar-options">
                    <button onclick="window.coverflow.toggleHighContrast()" class="toolbar-btn ${this.settings.highContrast ? 'active' : ''}" aria-label="Toggle high contrast mode">
                        🌓 High Contrast
                    </button>
                    <button onclick="window.coverflow.toggleLargeText()" class="toolbar-btn ${this.settings.largeText ? 'active' : ''}" aria-label="Toggle large text mode">
                        🔤 Large Text
                    </button>
                    <button onclick="window.coverflow.cycleColorblindMode()" class="toolbar-btn ${this.settings.colorblindMode !== 'none' ? 'active' : ''}" aria-label="Cycle colorblind modes">
                        🎨 Colorblind: ${this.settings.colorblindMode}
                    </button>
                    <button onclick="window.coverflow.toggleReducedMotion()" class="toolbar-btn ${this.settings.reducedMotion ? 'active' : ''}" aria-label="Toggle reduced motion">
                        🎬 ${this.settings.reducedMotion ? 'Animations Off' : 'Animations On'}
                    </button>
                    <button onclick="window.coverflow.toggleScreenReader()" class="toolbar-btn ${this.settings.screenReader ? 'active' : ''}" aria-label="Toggle screen reader enhancements">
                        📢 Screen Reader
                    </button>
                    <button onclick="window.coverflow.increaseFontSize()" class="toolbar-btn" aria-label="Increase font size">
                        A+ Larger
                    </button>
                    <button onclick="window.coverflow.decreaseFontSize()" class="toolbar-btn" aria-label="Decrease font size">
                        A- Smaller
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(toolbar);
    }

    /**
     * Add skip to content link
     */
    addSkipLink() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-to-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.setAttribute('tabindex', '0');

        // Add main content landmark if it doesn't exist
        const mainContent = document.getElementById('main-content') || document.querySelector('main');
        if (!mainContent) {
            const coverflowContainer = document.getElementById('coverflow-container');
            if (coverflowContainer) {
                coverflowContainer.id = 'main-content';
                coverflowContainer.setAttribute('role', 'main');
            }
        }

        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * Enhance ARIA labels and roles
     */
    enhanceARIA() {
        // Add ARIA roles and labels to key elements
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.setAttribute('aria-label', 'Search games');
            searchInput.setAttribute('role', 'searchbox');
        }

        // Add landmarks
        const nav = document.querySelector('nav');
        if (nav && !nav.getAttribute('role')) {
            nav.setAttribute('role', 'navigation');
            nav.setAttribute('aria-label', 'Main navigation');
        }

        // Make modals accessible
        const modal = document.getElementById('info-modal');
        if (modal) {
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
        }
    }

    /**
     * Toggle high contrast mode
     */
    toggleHighContrast() {
        this.settings.highContrast = !this.settings.highContrast;
        this.saveSettings();

        if (this.settings.highContrast) {
            document.body.classList.add('high-contrast');
            this.announce('High contrast mode enabled');
        } else {
            document.body.classList.remove('high-contrast');
            this.announce('High contrast mode disabled');
        }

        this.updateToolbar();

        window.logger?.debug('ACCESSIBILITY', 'High contrast:', this.settings.highContrast);
    }

    /**
     * Toggle large text mode
     */
    toggleLargeText() {
        this.settings.largeText = !this.settings.largeText;
        this.saveSettings();

        if (this.settings.largeText) {
            document.body.classList.add('large-text');
            this.announce('Large text mode enabled');
        } else {
            document.body.classList.remove('large-text');
            this.announce('Large text mode disabled');
        }

        this.updateToolbar();

        window.logger?.debug('ACCESSIBILITY', 'Large text:', this.settings.largeText);
    }

    /**
     * Cycle colorblind modes
     */
    cycleColorblindMode() {
        const modes = ['none', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];
        const currentIndex = modes.indexOf(this.settings.colorblindMode || 'none');
        const nextIndex = (currentIndex + 1) % modes.length;
        this.settings.colorblindMode = modes[nextIndex];
        this.saveSettings();

        // Remove all colorblind classes
        modes.forEach(mode => {
            document.body.classList.remove(`colorblind-${mode}`);
        });

        // Add new class
        if (this.settings.colorblindMode !== 'none') {
            document.body.classList.add(`colorblind-${this.settings.colorblindMode}`);
            this.announce(`Colorblind mode: ${this.settings.colorblindMode}`);
        } else {
            this.announce('Colorblind mode disabled');
        }

        this.updateToolbar();

        window.logger?.debug('ACCESSIBILITY', 'Colorblind mode:', this.settings.colorblindMode);
    }

    /**
     * Toggle reduced motion
     */
    toggleReducedMotion() {
        this.settings.reducedMotion = !this.settings.reducedMotion;
        this.saveSettings();

        if (this.settings.reducedMotion) {
            document.body.classList.add('reduce-motion');
            this.announce('Reduced motion enabled - animations disabled');
        } else {
            document.body.classList.remove('reduce-motion');
            this.announce('Animations enabled');
        }

        this.updateToolbar();

        window.logger?.debug('ACCESSIBILITY', 'Reduced motion:', this.settings.reducedMotion);
    }

    /**
     * Toggle screen reader enhancements
     */
    toggleScreenReader() {
        this.settings.screenReader = !this.settings.screenReader;
        this.saveSettings();

        if (this.settings.screenReader) {
            this.enableScreenReaderMode();
            this.announce('Screen reader mode enabled - additional descriptions added');
        } else {
            this.disableScreenReaderMode();
            this.announce('Screen reader mode disabled');
        }

        this.updateToolbar();

        window.logger?.debug('ACCESSIBILITY', 'Screen reader mode:', this.settings.screenReader);
    }

    /**
     * Enable screen reader mode
     */
    enableScreenReaderMode() {
        document.body.classList.add('screen-reader-mode');

        // Add more detailed ARIA labels
        this.enhanceGameDescriptions();
    }

    /**
     * Disable screen reader mode
     */
    disableScreenReaderMode() {
        document.body.classList.remove('screen-reader-mode');
    }

    /**
     * Enhance game descriptions for screen readers
     */
    enhanceGameDescriptions() {
        // This will be called when games are displayed
        // to add detailed ARIA descriptions
    }

    /**
     * Increase font size
     */
    increaseFontSize() {
        this.settings.fontSize = Math.min((this.settings.fontSize || 100) + 10, 200);
        this.saveSettings();
        this.applyFontSize();

        this.announce(`Font size increased to ${this.settings.fontSize}%`);

        window.logger?.debug('ACCESSIBILITY', 'Font size:', this.settings.fontSize);
    }

    /**
     * Decrease font size
     */
    decreaseFontSize() {
        this.settings.fontSize = Math.max((this.settings.fontSize || 100) - 10, 80);
        this.saveSettings();
        this.applyFontSize();

        this.announce(`Font size decreased to ${this.settings.fontSize}%`);

        window.logger?.debug('ACCESSIBILITY', 'Font size:', this.settings.fontSize);
    }

    /**
     * Apply font size
     */
    applyFontSize() {
        document.documentElement.style.fontSize = `${this.settings.fontSize || 100}%`;
    }

    /**
     * Apply all settings
     */
    applySettings() {
        if (this.settings.highContrast) {
            document.body.classList.add('high-contrast');
        }

        if (this.settings.largeText) {
            document.body.classList.add('large-text');
        }

        if (this.settings.colorblindMode && this.settings.colorblindMode !== 'none') {
            document.body.classList.add(`colorblind-${this.settings.colorblindMode}`);
        }

        if (this.settings.reducedMotion) {
            document.body.classList.add('reduce-motion');
        }

        if (this.settings.screenReader) {
            this.enableScreenReaderMode();
        }

        this.applyFontSize();
    }

    /**
     * Update toolbar buttons
     */
    updateToolbar() {
        const toolbar = document.getElementById('accessibility-toolbar');
        if (!toolbar) return;

        // Update button states
        const buttons = toolbar.querySelectorAll('.toolbar-btn');
        buttons.forEach(btn => {
            if (btn.textContent.includes('High Contrast')) {
                btn.classList.toggle('active', this.settings.highContrast);
            } else if (btn.textContent.includes('Large Text')) {
                btn.classList.toggle('active', this.settings.largeText);
            } else if (btn.textContent.includes('Colorblind')) {
                btn.classList.toggle('active', this.settings.colorblindMode !== 'none');
                btn.innerHTML = `🎨 Colorblind: ${this.settings.colorblindMode}`;
            } else if (btn.textContent.includes('Animations')) {
                btn.classList.toggle('active', this.settings.reducedMotion);
                btn.innerHTML = `🎬 ${this.settings.reducedMotion ? 'Animations Off' : 'Animations On'}`;
            } else if (btn.textContent.includes('Screen Reader')) {
                btn.classList.toggle('active', this.settings.screenReader);
            }
        });
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('accessibilitySettings');
            return saved ? JSON.parse(saved) : {
                highContrast: false,
                largeText: false,
                colorblindMode: 'none',
                reducedMotion: false,
                screenReader: false,
                fontSize: 100
            };
        } catch (error) {
            console.error('Error loading accessibility settings:', error);
            return {
                highContrast: false,
                largeText: false,
                colorblindMode: 'none',
                reducedMotion: false,
                screenReader: false,
                fontSize: 100
            };
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('accessibilitySettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Error saving accessibility settings:', error);
        }
    }

    /**
     * Reset all accessibility settings
     */
    resetSettings() {
        this.settings = {
            highContrast: false,
            largeText: false,
            colorblindMode: 'none',
            reducedMotion: false,
            screenReader: false,
            fontSize: 100
        };

        this.saveSettings();
        this.applySettings();
        this.updateToolbar();

        this.announce('All accessibility settings reset to defaults');
    }

    /**
     * Get accessibility status
     */
    getStatus() {
        return {
            ...this.settings,
            isEnabled: Object.values(this.settings).some(v => v === true || (typeof v === 'string' && v !== 'none') || v !== 100)
        };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityFeatures;
}
