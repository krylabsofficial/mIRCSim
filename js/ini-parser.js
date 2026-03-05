/**
 * INI Parser - mIRC LLM Simulator
 * Parses INI format configuration files (personas.ini, channels.ini, events.ini)
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
     * @param {string} filePath - Path to channels.ini
     * @returns {Promise<Object>} Parsed channels configuration
     */
    async loadChannels(filePath = 'settings/channels.ini') {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                // Try .example file if main file not found
                const exampleResponse = await fetch(filePath + '.example');
                if (!exampleResponse.ok) {
                    throw new Error('Channels file not found');
                }
                const content = await exampleResponse.text();
                return this.parse(content);
            }
            const content = await response.text();
            return this.parse(content);
        } catch (error) {
            console.error('Error loading channels:', error);
            return this.getDefaultChannels();
        }
    },

    /**
     * Load and parse events.ini file
     * @param {string} filePath - Path to events.ini
     * @returns {Promise<Object>} Parsed events configuration
     */
    async loadEvents(filePath = 'settings/events.ini') {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                // Try .example file if main file not found
                const exampleResponse = await fetch(filePath + '.example');
                if (!exampleResponse.ok) {
                    throw new Error('Events file not found');
                }
                const content = await exampleResponse.text();
                return this.parse(content);
            }
            const content = await response.text();
            return this.parse(content);
        } catch (error) {
            console.error('Error loading events:', error);
            return this.getDefaultEvents();
        }
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
     * @returns {Object} Default events configuration
     */
    getDefaultEvents() {
        return {
            'netsplit': { enabled: true, frequency: 900 },
            'quit': { enabled: true, frequency: 600 },
            'join': { enabled: true, frequency: 300 }
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