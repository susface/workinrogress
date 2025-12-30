/**
 * Core Utilities Module
 * Provides shared utilities for logging, debouncing, configuration, and security
 */

// ==================== CONFIGURATION ====================

/**
 * Application configuration
 * Centralizes hardcoded values for easier management
 */
const AppConfig = {
    // Server configuration
    server: {
        defaultUrl: 'http://localhost:5000',
        timeout: 10000, // 10 seconds
        retryAttempts: 3,
        retryDelay: 1000 // 1 second
    },

    // Debug settings
    debug: {
        enabled: false, // Set to true for development
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        showTimestamps: true
    },

    // Performance settings
    performance: {
        debounceDelay: 150,
        throttleDelay: 100,
        searchDebounceDelay: 300
    },

    // UI settings
    ui: {
        toastDuration: 3000,
        animationDuration: 300,
        loadingTimeout: 30000
    }
};

// Allow runtime configuration override
if (typeof window !== 'undefined') {
    window.AppConfig = AppConfig;

    // Check for debug mode in localStorage
    try {
        const debugEnabled = localStorage.getItem('debugMode');
        if (debugEnabled === 'true') {
            AppConfig.debug.enabled = true;
        }
    } catch (e) {
        // localStorage not available
    }
}

// ==================== LOGGING SYSTEM ====================

/**
 * Logger class for consistent, controllable logging
 */
class Logger {
    constructor(module = 'APP') {
        this.module = module;
        this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
    }

    /**
     * Get current log level threshold
     */
    getLogLevel() {
        return this.levels[AppConfig.debug.logLevel] || 1;
    }

    /**
     * Format log message with optional timestamp
     */
    format(level, message) {
        const prefix = `[${this.module}]`;
        if (AppConfig.debug.showTimestamps) {
            const time = new Date().toISOString().substr(11, 12);
            return `${time} ${prefix} ${message}`;
        }
        return `${prefix} ${message}`;
    }

    /**
     * Debug level logging (only in debug mode)
     */
    debug(...args) {
        if (AppConfig.debug.enabled && this.getLogLevel() <= 0) {
            console.log(this.format('DEBUG', args[0]), ...args.slice(1));
        }
    }

    /**
     * Info level logging
     */
    info(...args) {
        if (AppConfig.debug.enabled && this.getLogLevel() <= 1) {
            console.log(this.format('INFO', args[0]), ...args.slice(1));
        }
    }

    /**
     * Warning level logging (always shown in debug mode)
     */
    warn(...args) {
        if (AppConfig.debug.enabled && this.getLogLevel() <= 2) {
            console.warn(this.format('WARN', args[0]), ...args.slice(1));
        }
    }

    /**
     * Error level logging (always shown)
     */
    error(...args) {
        // Errors are always logged
        console.error(this.format('ERROR', args[0]), ...args.slice(1));
    }

    /**
     * Create a child logger with a sub-module name
     */
    child(subModule) {
        return new Logger(`${this.module}:${subModule}`);
    }
}

// Create default logger instance
const logger = new Logger();

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.Logger = Logger;
    window.logger = logger;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Debounce function - delays execution until after wait period of inactivity
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute on leading edge
 * @returns {Function} Debounced function
 */
function debounce(func, wait = AppConfig.performance.debounceDelay, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const context = this;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

/**
 * Throttle function - limits execution to once per wait period
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, wait = AppConfig.performance.throttleDelay) {
    let inThrottle = false;
    let lastArgs = null;
    let lastContext = null;

    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    func.apply(lastContext, lastArgs);
                    lastArgs = null;
                    lastContext = null;
                }
            }, wait);
        } else {
            lastArgs = args;
            lastContext = this;
        }
    };
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML insertion
 */
function escapeHtml(text) {
    if (text == null) return '';
    const str = String(text);
    const htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    return str.replace(/[&<>"'`=/]/g, char => htmlEntities[char]);
}

/**
 * Safe parseInt with validation
 * @param {*} value - Value to parse
 * @param {number} defaultValue - Default if parsing fails
 * @param {number} radix - Numeric base (default 10)
 * @returns {number} Parsed integer or default
 */
function safeParseInt(value, defaultValue = 0, radix = 10) {
    if (value == null || value === '') return defaultValue;
    const parsed = parseInt(value, radix);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safe parseFloat with validation
 * @param {*} value - Value to parse
 * @param {number} defaultValue - Default if parsing fails
 * @returns {number} Parsed float or default
 */
function safeParseFloat(value, defaultValue = 0) {
    if (value == null || value === '') return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Clamp a number between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Format time in seconds to human readable string
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted size string
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Generate a unique ID
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique ID
 */
function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
}

/**
 * Safely get nested object property
 * @param {object} obj - Object to traverse
 * @param {string} path - Dot-separated path
 * @param {*} defaultValue - Default if not found
 * @returns {*} Value at path or default
 */
function getNestedValue(obj, path, defaultValue = undefined) {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
        if (result == null || typeof result !== 'object') {
            return defaultValue;
        }
        result = result[key];
    }
    return result !== undefined ? result : defaultValue;
}

// ==================== STORAGE UTILITIES ====================

/**
 * Safe localStorage wrapper with JSON support
 */
const Storage = {
    /**
     * Get item from localStorage with JSON parsing
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return defaultValue;
            return JSON.parse(item);
        } catch (e) {
            logger.warn(`Failed to get storage key "${key}":`, e);
            return defaultValue;
        }
    },

    /**
     * Set item in localStorage with JSON stringification
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            logger.error(`Failed to set storage key "${key}":`, e);
            return false;
        }
    },

    /**
     * Remove item from localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            logger.warn(`Failed to remove storage key "${key}":`, e);
            return false;
        }
    },

    /**
     * Check if key exists in localStorage
     */
    has(key) {
        try {
            return localStorage.getItem(key) !== null;
        } catch (e) {
            return false;
        }
    }
};

// Attach to window
if (typeof window !== 'undefined') {
    window.Storage = Storage;
}

// ==================== EXPORT ====================

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppConfig,
        Logger,
        logger,
        debounce,
        throttle,
        escapeHtml,
        safeParseInt,
        safeParseFloat,
        clamp,
        formatTime,
        formatBytes,
        generateId,
        deepClone,
        getNestedValue,
        Storage
    };
}

// Also attach individual functions to window for easy access
if (typeof window !== 'undefined') {
    window.debounce = debounce;
    window.throttle = throttle;
    window.escapeHtml = escapeHtml;
    window.safeParseInt = safeParseInt;
    window.safeParseFloat = safeParseFloat;
    window.clamp = clamp;
    window.formatTime = formatTime;
    window.formatBytes = formatBytes;
    window.generateId = generateId;
    window.deepClone = deepClone;
    window.getNestedValue = getNestedValue;
}
