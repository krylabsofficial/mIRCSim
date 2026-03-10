/**
 * Configuration Manager - mIRC LLM Simulator
 * Manages application configuration, personas, channels, and events
 */

const Config = {
    // Application state
    state: {
        serverAddress: 'http://localhost:5000',
        nickname: 'User',
        currentChannel: '#general',
        isDemo: false,
        isConnected: false,
        rememberSettings: true
    },

    // Loaded configurations
    personas: {},
    channels: {},
    events: {},
    themes: {},
    lurkers: [],  // Non-AI usernames for channel population
    currentTheme: 'classic',

    // Storage keys
    STORAGE_KEYS: {
        SERVER: 'mirc_server',
        NICKNAME: 'mirc_nickname',
        REMEMBER: 'mirc_remember',
        WINDOWS: 'mirc_windows',
        ACTIVE_WINDOW: 'mirc_active_window',
        THEME: 'mirc_theme'
    },

    /**
     * Initialize configuration - load from localStorage and INI files
     */
    async init() {
        // Load from localStorage
        this.loadFromStorage();

        // Check URL parameters for demo mode
        const urlParams = Utils.getUrlParams();
        if (urlParams.demo === 'true') {
            this.state.isDemo = true;
        }

        // Load INI configurations
        await this.loadConfigurations();
    },

    /**
     * Load settings from localStorage
     */
    loadFromStorage() {
        if (Utils.retrieve(this.STORAGE_KEYS.REMEMBER, true)) {
            const savedServer = Utils.retrieve(this.STORAGE_KEYS.SERVER);
            const savedNickname = Utils.retrieve(this.STORAGE_KEYS.NICKNAME);

            if (savedServer) {
                this.state.serverAddress = savedServer;
            }
            if (savedNickname && Utils.isValidNickname(savedNickname)) {
                this.state.nickname = savedNickname;
            }
        }
        
        // Load saved theme
        const savedTheme = Utils.retrieve(this.STORAGE_KEYS.THEME);
        if (savedTheme) {
            this.currentTheme = savedTheme;
        }
    },

    /**
     * Save settings to localStorage
     */
    saveToStorage() {
        if (this.state.rememberSettings) {
            Utils.store(this.STORAGE_KEYS.SERVER, this.state.serverAddress);
            Utils.store(this.STORAGE_KEYS.NICKNAME, this.state.nickname);
            Utils.store(this.STORAGE_KEYS.REMEMBER, true);
        } else {
            Utils.remove(this.STORAGE_KEYS.SERVER);
            Utils.remove(this.STORAGE_KEYS.NICKNAME);
            Utils.remove(this.STORAGE_KEYS.REMEMBER);
        }
    },

    /**
     * Load all INI configuration files
     */
    async loadConfigurations() {
        try {
            // Load in parallel
            const [personas, channels, events, themes] = await Promise.all([
                IniParser.loadPersonas(),
                IniParser.loadChannels(),
                IniParser.loadEvents(),
                IniParser.loadThemes()
            ]);

            // Extract lurkers from personas (if present)
            this.lurkers = personas.lurkers?.names || [];
            
            // Remove lurkers section from personas object
            delete personas.lurkers;
            
            this.personas = personas;
            this.channels = channels;
            this.events = events;
            this.themes = themes;

            console.log('Configurations loaded:', {
                personas: Object.keys(personas).length,
                channels: Object.keys(channels).length,
                events: Object.keys(events).length,
                themes: Object.keys(themes).length,
                lurkers: this.lurkers.length
            });
            
            // Apply saved event settings from localStorage (must happen AFTER events are loaded)
            if (window.EventSettingsUI && typeof window.EventSettingsUI.applySettings === 'function') {
                console.log('[Config] Applying saved event settings from localStorage...');
                window.EventSettingsUI.applySettings();
            } else {
                console.warn('[Config] EventSettingsUI not available yet, saved event settings will not be applied');
            }
            
            // Apply saved theme
            this.applyTheme(this.currentTheme);
            
            // Update theme button tooltip if UI is available
            if (window.UI && window.UI.updateThemeButtonTooltip) {
                const themeName = this.themes[this.currentTheme]?.name || this.currentTheme;
                window.UI.updateThemeButtonTooltip(themeName);
            }
        } catch (error) {
            console.error('Error loading configurations:', error);
        }
    },

    /**
     * Get persona by nickname
     * @param {string} nickname - Persona nickname
     * @returns {Object|null} Persona configuration
     */
    getPersona(nickname) {
        // Case-insensitive persona lookup
        if (!nickname) return null;
        
        // Try exact match first (fast path)
        if (this.personas[nickname]) {
            return this.personas[nickname];
        }
        
        // Fall back to case-insensitive search
        const lowerNick = nickname.toLowerCase();
        for (const [key, persona] of Object.entries(this.personas)) {
            if (key.toLowerCase() === lowerNick) {
                return persona;
            }
        }
        
        return null;
    },

    /**
     * Get all personas for a channel
     * @param {string} channelName - Channel name
     * @returns {Array} Array of persona objects
     */
    getChannelPersonas(channelName) {
        const channel = this.getChannel(channelName);
        if (!channel || !channel.personas) return [];

        const personaList = Array.isArray(channel.personas) 
            ? channel.personas 
            : channel.personas.split(',').map(p => p.trim());

        return personaList
            .map(nick => this.getPersona(nick))
            .filter(p => p !== null);
    },

    /**
     * Get channel by name
     * @param {string} channelName - Channel name (with or without #)
     * @returns {Object|null} Channel configuration
     */
    getChannel(channelName) {
        // Normalize channel name
        const normalized = channelName.startsWith('#') 
            ? channelName.substring(1) 
            : channelName;

        return this.channels[normalized] || null;
    },

    /**
     * Get all channel names
     * @returns {Array} Array of channel names (with #)
     */
    getChannelList() {
        return Object.keys(this.channels).map(key => 
            this.channels[key].name || `#${key}`
        );
    },

    /**
     * Get event configuration
     * @param {string} eventType - Event type
     * @returns {Object|null} Event configuration
     */
    getEvent(eventType) {
        return this.events[eventType] || null;
    },

    /**
     * Update server address
     * @param {string} address - New server address
     */
    setServer(address) {
        this.state.serverAddress = address;
        this.saveToStorage();
    },

    /**
     * Update nickname
     * @param {string} nickname - New nickname
     * @returns {boolean} True if successful
     */
    setNickname(nickname) {
        if (Utils.isValidNickname(nickname)) {
            this.state.nickname = nickname;
            this.saveToStorage();
            return true;
        }
        return false;
    },

    /**
     * Update current channel
     * @param {string} channel - Channel name
     */
    setChannel(channel) {
        this.state.currentChannel = channel;
    },

    /**
     * Set demo mode
     * @param {boolean} isDemo - Demo mode status
     */
    setDemoMode(isDemo) {
        this.state.isDemo = isDemo;
    },

    /**
     * Set connection status
     * @param {boolean} isConnected - Connection status
     */
    setConnected(isConnected) {
        this.state.isConnected = isConnected;
    },

    /**
     * Save window state to localStorage
     * @param {Array<string>} windows - Array of open window names
     * @param {string} activeWindow - Currently active window
     */
    saveWindowState(windows, activeWindow) {
        try {
            Utils.store(this.STORAGE_KEYS.WINDOWS, JSON.stringify(windows));
            Utils.store(this.STORAGE_KEYS.ACTIVE_WINDOW, activeWindow);
        } catch (error) {
            console.error('Error saving window state:', error);
        }
    },

    /**
     * Load window state from localStorage
     * @returns {Object} Object with windows array and activeWindow
     */
    loadWindowState() {
        try {
            const windowsData = Utils.retrieve(this.STORAGE_KEYS.WINDOWS);
            const activeWindow = Utils.retrieve(this.STORAGE_KEYS.ACTIVE_WINDOW);
            
            return {
                windows: windowsData ? JSON.parse(windowsData) : ['Status'],
                activeWindow: activeWindow || 'Status'
            };
        } catch (error) {
            console.error('Error loading window state:', error);
            return {
                windows: ['Status'],
                activeWindow: 'Status'
            };
        }
    },

    /**
     * Apply a theme by name
     * @param {string} themeName - Name of the theme to apply
     */
    applyTheme(themeName) {
        // Use default theme if themes haven't loaded yet
        if (!this.themes || Object.keys(this.themes).length === 0) {
            console.log('No themes loaded yet, skipping theme application');
            return;
        }
        
        const theme = this.themes[themeName];
        if (!theme) {
            console.warn(`Theme "${themeName}" not found, trying classic`);
            // Try classic theme as fallback
            if (this.themes['classic']) {
                themeName = 'classic';
            } else {
                console.warn('Classic theme not found either, skipping');
                return;
            }
        }

        console.log(`Applying theme: ${this.themes[themeName].name || themeName}`);
        
        const selectedTheme = this.themes[themeName];
        
        // Apply CSS custom properties for dynamic theming
        const root = document.documentElement;
        root.style.setProperty('--chrome-bg', selectedTheme.chrome_bg);
        root.style.setProperty('--message-bg', selectedTheme.message_bg);
        root.style.setProperty('--message-fg', selectedTheme.message_fg);
        root.style.setProperty('--input-bg', selectedTheme.input_bg);
        root.style.setProperty('--input-fg', selectedTheme.input_fg);
        root.style.setProperty('--join-color', selectedTheme.join_color);
        root.style.setProperty('--quit-color', selectedTheme.quit_color);
        root.style.setProperty('--action-color', selectedTheme.action_color);
        root.style.setProperty('--mode-color', selectedTheme.mode_color);
        root.style.setProperty('--part-color', selectedTheme.part_color);
        root.style.setProperty('--system-color', selectedTheme.system_color);
        root.style.setProperty('--error-color', selectedTheme.error_color);
        
        // Directly apply theme colors to elements for live updates
        this.applyThemeToElements(selectedTheme);
        
        this.currentTheme = themeName;
    },

    /**
     * Apply theme colors directly to DOM elements
     * @param {Object} theme - Theme configuration
     */
    applyThemeToElements(theme) {
        // Chrome elements (menus, toolbars, status bar, etc.)
        const chromeElements = [
            '.main-container',
            '.menu-bar',
            '.toolbar',
            '.switchbar',
            '.mdi-container',
            '.status-bar',
            '.modal-content',
            '.dialog-body',
            '.dialog-footer',
            '.tab-bar',
            '.btn'
        ];
        
        chromeElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.backgroundColor = theme.chrome_bg;
            });
        });
        
        // Windows
        const windows = document.querySelectorAll('.mdi-window');
        windows.forEach(win => {
            win.style.backgroundColor = theme.chrome_bg;
        });
        
        // Message areas
        const messageAreas = document.querySelectorAll('.message-area');
        messageAreas.forEach(area => {
            area.style.backgroundColor = theme.message_bg;
            area.style.color = theme.message_fg;
        });
        
        // Normal message text (ensure it inherits theme color, not hardcoded black)
        const normalMessages = document.querySelectorAll('.message.normal, .message.message');
        normalMessages.forEach(msg => {
            msg.style.color = theme.message_fg;
        });
        
        const normalMessageTexts = document.querySelectorAll('.message.normal .message-text, .message.message .message-text');
        normalMessageTexts.forEach(text => {
            text.style.color = theme.message_fg;
        });
        
        // Input boxes
        const inputs = document.querySelectorAll('.window-input');
        inputs.forEach(input => {
            input.style.backgroundColor = theme.input_bg;
            input.style.color = theme.input_fg;
        });
    },

    /**
     * Set theme and save to localStorage
     * @param {string} themeName - Name of the theme to set
     */
    setTheme(themeName) {
        this.applyTheme(themeName);
        Utils.store(this.STORAGE_KEYS.THEME, themeName);
    },

    /**
     * Cycle to next theme
     * @returns {string} - Name of the new theme
     */
    cycleTheme() {
        const themeNames = ['classic', 'dark', 'matrix', 'hacker'];
        const currentIndex = themeNames.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themeNames.length;
        const nextTheme = themeNames[nextIndex];
        
        this.setTheme(nextTheme);
        
        // Return theme display name
        return this.themes[nextTheme]?.name || nextTheme;
    }
};

// Make available globally
window.Config = Config;
