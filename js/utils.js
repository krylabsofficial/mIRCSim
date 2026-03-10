/**
 * Utility Functions - mIRC LLM Simulator
 * Common helper functions used throughout the application
 */

const Utils = {
    /**
     * Format timestamp for message display
     * @param {Date} date - Date object
     * @returns {string} Formatted time [HH:MM:SS]
     */
    formatTimestamp(date = new Date()) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `[${hours}:${minutes}:${seconds}]`;
    },

    /**
     * Sanitize HTML to prevent XSS
     * @param {string} str - Input string
     * @returns {string} Sanitized string
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Generate consistent color for a nickname
     * @param {string} nickname - User nickname
     * @returns {string} Hex color code
     */
    getNicknameColor(nickname) {
        // Classic mIRC-style colors (excluding too dark or too light colors)
        const ircColors = [
            '#0000FF', // Blue
            '#00FF00', // Green
            '#FF0000', // Red
            '#8B4513', // Brown
            '#800080', // Purple
            '#FF6600', // Orange
            '#00FFFF', // Cyan
            '#4169E1', // Royal Blue
            '#FF69B4', // Pink
            '#008080', // Teal
            '#9370DB', // Medium Purple
            '#DC143C', // Crimson
            '#FF8C00', // Dark Orange
            '#00CED1', // Dark Turquoise
            '#FFD700', // Gold
            '#32CD32'  // Lime Green
        ];

        // Generate hash from nickname
        let hash = 0;
        for (let i = 0; i < nickname.length; i++) {
            hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash; // Convert to 32-bit integer
        }

        // Use hash to select color
        const index = Math.abs(hash) % ircColors.length;
        return ircColors[index];
    },

    /**
     * Parse IRC color codes and format text
     * @param {string} text - Text with potential IRC color codes
     * @returns {string} HTML formatted text
     */
    parseIrcColors(text) {
        // Simple implementation - can be expanded for full mIRC color support
        let formatted = this.escapeHtml(text);
        
        // Make URLs clickable
        formatted = this.linkifyUrls(formatted);
        
        // Bold: \x02
        formatted = formatted.replace(/\x02([^\x02]*)\x02/g, '<strong>$1</strong>');
        
        // Italic: \x1D
        formatted = formatted.replace(/\x1D([^\x1D]*)\x1D/g, '<em>$1</em>');
        
        // Underline: \x1F
        formatted = formatted.replace(/\x1F([^\x1F]*)\x1F/g, '<u>$1</u>');
        
        return formatted;
    },

    /**
     * Detect URLs and make them clickable links
     * @param {string} text - Text with potential URLs
     * @returns {string} HTML with clickable links
     */
    linkifyUrls(text) {
        const urlPattern = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
        return text.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    },

    /**
     * Highlight nickname mentions in text
     * @param {string} text - Message text
     * @param {string} nickname - User's nickname to highlight
     * @returns {string} HTML with highlighted mentions
     */
    highlightMentions(text, nickname) {
        if (!nickname) return text;
        
        // Match nickname as a whole word (case-insensitive)
        const pattern = new RegExp(`\\b(${this.escapeRegex(nickname)})\\b`, 'gi');
        return text.replace(pattern, '<span class="mention-highlight">$1</span>');
    },

    /**
     * Escape special regex characters
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    /**
     * Generate random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Get random element from array
     * @param {Array} arr - Array to pick from
     * @returns {*} Random element
     */
    randomChoice(arr) {
        if (!arr || arr.length === 0) return null;
        return arr[this.randomInt(0, arr.length - 1)];
    },

    /**
     * Validate IRC nickname
     * @param {string} nick - Nickname to validate
     * @returns {boolean} True if valid
     */
    isValidNickname(nick) {
        if (!nick || nick.length === 0 || nick.length > 16) return false;
        // IRC nicknames: letters, numbers, - _ [ ] { } \ | `
        return /^[a-zA-Z][a-zA-Z0-9\-_\[\]{}\\|`]*$/.test(nick);
    },

    /**
     * Validate channel name
     * @param {string} channel - Channel name to validate
     * @returns {boolean} True if valid
     */
    isValidChannel(channel) {
        if (!channel || channel.length === 0) return false;
        // IRC channels start with # or &
        return /^[#&][^\s,]+$/.test(channel);
    },

    /**
     * Parse URL parameters
     * @returns {Object} Key-value pairs of URL parameters
     */
    getUrlParams() {
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams) {
            params[key] = value;
        }
        return params;
    },

    /**
     * Scroll element to bottom
     * @param {HTMLElement} element - Element to scroll
     */
    scrollToBottom(element) {
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    },

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Milliseconds to wait
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Store data in localStorage
     * @param {string} key - Storage key
     * @param {*} value - Value to store (will be JSON stringified)
     */
    store(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('Failed to store data:', e);
        }
    },

    /**
     * Retrieve data from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if key not found
     * @returns {*} Stored value or default
     */
    retrieve(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('Failed to retrieve data:', e);
            return defaultValue;
        }
    },

    /**
     * Remove data from localStorage
     * @param {string} key - Storage key
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('Failed to remove data:', e);
        }
    },

    /**
     * Generate unique ID
     * @returns {string} Unique identifier
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Delay execution
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Compare two nicknames (case-insensitive, per IRC spec)
     * @param {string} nick1 - First nickname
     * @param {string} nick2 - Second nickname
     * @returns {boolean} True if nicknames match
     */
    nicknameEquals(nick1, nick2) {
        if (!nick1 || !nick2) return false;
        return nick1.toLowerCase() === nick2.toLowerCase();
    },

    /**
     * Find user in user list by nickname (case-insensitive)
     * @param {Array} users - Array of user objects with .nick property
     * @param {string} nickname - Nickname to find
     * @returns {Object|undefined} User object if found
     */
    findUserByNick(users, nickname) {
        if (!users || !nickname) return undefined;
        return users.find(u => this.nicknameEquals(u.nick, nickname));
    },

    /**
     * Get canonical nickname (preserve original case from user list)
     * @param {Array} users - Array of user objects with .nick property
     * @param {string} nickname - Nickname to canonicalize
     * @returns {string} Canonical nickname if found, otherwise original
     */
    getCanonicalNick(users, nickname) {
        const user = this.findUserByNick(users, nickname);
        return user ? user.nick : nickname;
    }
};

// Make available globally
window.Utils = Utils;
