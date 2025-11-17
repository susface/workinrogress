/**
 * Sound Effects Module
 * Adds audio feedback for navigation and interactions
 */

class SoundEffects {
    constructor() {
        this.sounds = {};
        this.audioContext = null;
        this.enabled = true;
        this.volume = 0.3;
    }

    /**
     * Initialize sound effects
     */
    initializeSoundEffects() {
        console.log('[SOUND] Initializing sound effects...');

        // Check settings
        if (this.settings.soundEffects === undefined) {
            this.settings.soundEffects = true;
        }
        this.enabled = this.settings.soundEffects;

        // Create audio context for procedural sounds
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('[SOUND] AudioContext created');
        } catch (e) {
            console.warn('[SOUND] Web Audio API not supported');
            return;
        }

        console.log('[SOUND] Sound effects initialized');
    }

    /**
     * Play navigation whoosh sound
     */
    playNavigateSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Create oscillator for whoosh effect
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Whoosh: sweep from high to low
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

        // Volume envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        // Connect and play
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    /**
     * Play selection/click sound
     */
    playSelectSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Create click sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

        gain.gain.setValueAtTime(this.volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Play launch sound (game starting)
     */
    playLaunchSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Power-up sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    }

    /**
     * Play platform-specific sound
     */
    playPlatformSound(platform) {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Different frequencies for different platforms
        const platformFrequencies = {
            'steam': 600,
            'epic': 700,
            'xbox': 500
        };

        const freq = platformFrequencies[platform?.toLowerCase()] || 650;

        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(this.volume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    /**
     * Play error sound
     */
    playErrorSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(300, now + 0.1);

        gain.gain.setValueAtTime(this.volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    /**
     * Play success sound
     */
    playSuccessSound() {
        if (!this.enabled || !this.audioContext) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Ascending arpeggio
        const frequencies = [523.25, 659.25, 783.99]; // C, E, G
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(this.volume * 0.2, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.2);
        });
    }

    /**
     * Toggle sound effects on/off
     */
    toggleSoundEffects() {
        this.enabled = !this.enabled;
        this.settings.soundEffects = this.enabled;
        this.saveSettings();

        if (this.enabled) {
            this.playSuccessSound();
            this.showToast('Sound effects enabled', 'success');
        } else {
            this.showToast('Sound effects disabled', 'info');
        }
    }

    /**
     * Set volume
     */
    setSoundVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.settings.soundVolume = this.volume;
        this.saveSettings();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundEffects;
}
