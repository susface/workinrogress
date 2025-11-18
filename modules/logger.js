/**
 * Logger Module
 * Provides configurable logging with levels and module-based filtering
 */

class Logger {
    constructor() {
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };

        // Default log level (INFO = show errors, warnings, and info)
        this.currentLevel = this.logLevels.INFO;

        // Module-specific log levels (can override global level)
        this.moduleLogLevels = {};

        // Disabled modules (completely silent)
        this.disabledModules = new Set();

        // Load settings from localStorage
        this.loadSettings();
    }

    /**
     * Load logging settings from localStorage
     */
    loadSettings() {
        try {
            const settings = localStorage.getItem('loggerSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                this.currentLevel = parsed.currentLevel ?? this.logLevels.INFO;
                this.moduleLogLevels = parsed.moduleLogLevels || {};
                this.disabledModules = new Set(parsed.disabledModules || []);
            }
        } catch (error) {
            console.error('[LOGGER] Failed to load settings:', error);
        }
    }

    /**
     * Save logging settings to localStorage
     */
    saveSettings() {
        try {
            const settings = {
                currentLevel: this.currentLevel,
                moduleLogLevels: this.moduleLogLevels,
                disabledModules: Array.from(this.disabledModules)
            };
            localStorage.setItem('loggerSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('[LOGGER] Failed to save settings:', error);
        }
    }

    /**
     * Set global log level
     */
    setLogLevel(level) {
        if (typeof level === 'string') {
            level = this.logLevels[level.toUpperCase()] ?? this.logLevels.INFO;
        }
        this.currentLevel = level;
        this.saveSettings();
    }

    /**
     * Set log level for specific module
     */
    setModuleLogLevel(moduleName, level) {
        if (typeof level === 'string') {
            level = this.logLevels[level.toUpperCase()] ?? this.logLevels.INFO;
        }
        this.moduleLogLevels[moduleName] = level;
        this.saveSettings();
    }

    /**
     * Disable logging for specific module
     */
    disableModule(moduleName) {
        this.disabledModules.add(moduleName);
        this.saveSettings();
    }

    /**
     * Enable logging for specific module
     */
    enableModule(moduleName) {
        this.disabledModules.delete(moduleName);
        this.saveSettings();
    }

    /**
     * Check if log should be shown
     */
    shouldLog(moduleName, level) {
        // Check if module is disabled
        if (this.disabledModules.has(moduleName)) {
            return false;
        }

        // Get effective log level (module-specific or global)
        const effectiveLevel = this.moduleLogLevels[moduleName] ?? this.currentLevel;

        // Compare with message level
        return level <= effectiveLevel;
    }

    /**
     * Format log message with module name and timestamp
     */
    formatMessage(moduleName, level, args) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const levelName = Object.keys(this.logLevels).find(
            key => this.logLevels[key] === level
        ) || 'INFO';

        return [`[${timestamp}] [${moduleName}] [${levelName}]`, ...args];
    }

    /**
     * Log error message
     */
    error(moduleName, ...args) {
        if (this.shouldLog(moduleName, this.logLevels.ERROR)) {
            console.error(...this.formatMessage(moduleName, this.logLevels.ERROR, args));
        }
    }

    /**
     * Log warning message
     */
    warn(moduleName, ...args) {
        if (this.shouldLog(moduleName, this.logLevels.WARN)) {
            console.warn(...this.formatMessage(moduleName, this.logLevels.WARN, args));
        }
    }

    /**
     * Log info message
     */
    info(moduleName, ...args) {
        if (this.shouldLog(moduleName, this.logLevels.INFO)) {
            console.log(...this.formatMessage(moduleName, this.logLevels.INFO, args));
        }
    }

    /**
     * Log debug message
     */
    debug(moduleName, ...args) {
        if (this.shouldLog(moduleName, this.logLevels.DEBUG)) {
            console.log(...this.formatMessage(moduleName, this.logLevels.DEBUG, args));
        }
    }

    /**
     * Log trace message (most verbose)
     */
    trace(moduleName, ...args) {
        if (this.shouldLog(moduleName, this.logLevels.TRACE)) {
            console.log(...this.formatMessage(moduleName, this.logLevels.TRACE, args));
        }
    }

    /**
     * Get current log level name
     */
    getLogLevelName() {
        return Object.keys(this.logLevels).find(
            key => this.logLevels[key] === this.currentLevel
        ) || 'INFO';
    }

    /**
     * Get all module names that have custom log levels
     */
    getConfiguredModules() {
        return {
            moduleLogLevels: this.moduleLogLevels,
            disabledModules: Array.from(this.disabledModules)
        };
    }

    /**
     * Reset to default settings
     */
    resetSettings() {
        this.currentLevel = this.logLevels.INFO;
        this.moduleLogLevels = {};
        this.disabledModules.clear();
        this.saveSettings();
    }
}

// Create global logger instance
window.logger = window.logger || new Logger();
