/**
 * INI Parser - mIRC LLM Simulator
 * Parses INI format configuration files (personas.ini, themes.ini)
 * Note: channels.ini and events.ini are no longer used (dynamic channels + Event Settings UI)
 */

const IniParser = {
    /**
     * Parse INI file content into JavaScript object
     * @param {string} content - Raw INI file content
     * @returns {Object} Parsed configuration object
     */
    parse(content) {
        const result = {};
        let currentSection = null;

        const lines = content.split('\n');

        for (let line of lines) {
            // Remove comments and trim whitespace
            line = line.split(';')[0].trim();
            
            // Skip empty lines
            if (!line) continue;

            // Check for section header [SectionName]
            const sectionMatch = line.match(/^\[(.+)\]$/);
            if (sectionMatch) {
                currentSection = sectionMatch[1].trim();
                result[currentSection] = {};
                continue;
            }

            // Parse key=value pairs
            const keyValueMatch = line.match(/^([^=]+)=(.*)$/);
            if (keyValueMatch && currentSection) {
                const key = keyValueMatch[1].trim();
                const value = keyValueMatch[2].trim();
                result[currentSection][key] = this.parseValue(value);
            }
        }

        return result;
    },

    /**
     * Parse value and convert to appropriate type
     * @param {string} value - Raw value string
     * @returns {*} Parsed value (string, number, boolean, or array)
     */
    parseValue(value) {
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        // Check for boolean
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;

        // Check for number
        if (!isNaN(value) && value !== '') {
            return parseFloat(value);
        }

        // Check for comma-separated list
        if (value.includes(',')) {
            return value.split(',').map(v => v.trim());
        }

        return value;
    },

    /**
     * Load and parse personas.ini file
     * @param {string} filePath - Path to personas.ini
     * @returns {Promise<Object>} Parsed personas configuration
     */
    async loadPersonas(filePath = 'settings/personas.ini') {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                // Try .example file if main file not found
                const exampleResponse = await fetch(filePath + '.example');
                if (!exampleResponse.ok) {
                    throw new Error('Personas file not found');
                }
                const content = await exampleResponse.text();
                return this.parse(content);
            }
            const content = await response.text();
            return this.parse(content);
        } catch (error) {
            console.error('Error loading personas:', error);
            return this.getDefaultPersonas();
        }
    },

    /**
     * Load and parse channels.ini file
     * NOTE: Channels are dynamically managed. Always returns defaults.
     * @param {string} filePath - Path to channels.ini (unused)
     * @returns {Promise<Object>} Parsed channels configuration
     */
    async loadChannels(filePath = 'settings/channels.ini') {
        // Channels are fully dynamic - just return defaults without file access
        return this.getDefaultChannels();
    },

    /**
     * Load and parse events.ini file
     * NOTE: Events are configured via Event Settings UI. Always returns defaults.
     * @param {string} filePath - Path to events.ini (unused)
     * @returns {Promise<Object>} Parsed events configuration
     */
    async loadEvents(filePath = 'settings/events.ini') {
        // Events are managed by Event Settings UI - just return defaults without file access
        return this.getDefaultEvents();
    },

    /**
     * Get default personas if file loading fails
     * @returns {Object} Default personas configuration
     */
    getDefaultPersonas() {
        return {
            'ZeroCool': {
                nickname: 'ZeroCool',
                style: 'Cocky hacker from the 90s, uses 1337speak occasionally, brief responses',
                color: '#00FF00'
            },
            'AcidBurn': {
                nickname: 'AcidBurn',
                style: 'Sarcastic female hacker, witty and sharp, challenges others',
                color: '#FF00FF'
            },
            'LordNikon': {
                nickname: 'LordNikon',
                style: 'Quiet genius, photographic memory, speaks in technical terms',
                color: '#00FFFF'
            }
        };
    },

    /**
     * Get default channels if file loading fails
     * @returns {Object} Default channels configuration
     */
    getDefaultChannels() {
        return {
            'general': {
                name: '#general',
                topic: 'Welcome to the mIRC LLM Simulator!',
                theme: 'General welcoming discussion, friendly banter',
                personas: ['ZeroCool', 'AcidBurn', 'LordNikon']
            },
            'hackers': {
                name: '#hackers',
                topic: 'Elite h4x0rs only',
                theme: 'Technical hacking discussion, security topics',
                personas: ['ZeroCool', 'AcidBurn', 'LordNikon']
            }
        };
    },

    /**
     * Get default events if file loading fails
     * Returns "Normal" preset settings (event presets now defined in event-settings-ui.js)
     * @returns {Object} Default events configuration
     */
    getDefaultEvents() {
        return {
            'join': { enabled: true, frequency: 45, description: 'Lurker joins channel' },
            'part': { enabled: true, frequency: 60, description: 'Lurker leaves channel' },
            'quit': { enabled: true, frequency: 90, description: 'User disconnects from server' },
            'topic_change': { enabled: false, frequency: 180, description: 'Persona changes channel topic' },
            'kick': { enabled: false, frequency: 240, description: 'Persona kicks another user' },
            'mode': { enabled: true, frequency: 120, description: 'Operator changes user modes (+o, +v, etc)' },
            'netsplit': { enabled: true, frequency: 300, description: 'Network split event (5-15 users disconnect)' },
            'kline': { enabled: false, frequency: 600, description: 'Server ban announcement' },
            'idle_chatter': { enabled: true, frequency: 20, description: 'Active personas send random messages' },
            'rpg_event_1': { enabled: true, serverTimeMinutes: 10, channelParticipation: 25, description: 'Time Travel Confidant RPG trigger' }
        };
    },

    /**
     * Load themes from themes.ini file
     * @returns {Promise<Object>} Themes configuration object
     */
    async loadThemes() {
        try {
            const response = await fetch('settings/themes.ini');
            const content = await response.text();
            const themes = this.parse(content);
            console.log('Themes loaded:', themes);
            return themes;
        } catch (error) {
            console.warn('Failed to load themes.ini, using default classic theme:', error);
            return this.getDefaultThemes();
        }
    },

    /**
     * Get default theme if file loading fails
     * @returns {Object} Default classic theme
     */
    getDefaultThemes() {
        return {
            'classic': {
                name: 'Classic mIRC',
                chrome_bg: '#c0c0c0',
                message_bg: '#ffffff',
                message_fg: '#000000',
                input_bg: '#ffffff',
                input_fg: '#000000',
                join_color: '#009900',
                quit_color: '#000066',
                action_color: '#663399',
                mode_color: '#009900',
                part_color: '#8b4513',
                system_color: '#008000',
                error_color: '#ff0000'
            }
        };    }
};

// Make available globally
window.IniParser = IniParser;