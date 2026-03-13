/**
 * RPG Manager - Plugin System Core
 * mIRC LLM Simulator
 *
 * Manages RPG scenario plugins. Each plugin registers itself and the manager
 * routes messages to whichever plugin is currently active.
 *
 * Only ONE plugin is active at a time (mutual exclusion by default).
 *
 * App.js hooks (3 total, set once):
 *   RPGManager.init()
 *   RPGManager.handleChannelMessage(message, channel)
 *   RPGManager.handlePrivateMessage(nickname, message)   ← called from PrivateMessaging
 *
 * Plugin contract:
 *   {
 *     name:                    string,     // Required
 *     init():                  void,       // Required – called at startup
 *     handleChannelMessage(msg, channel):  // Required – observe channel msgs / self-trigger
 *     handlePrivateMessage(nick, msg):     // Optional – PM routing
 *     onComplete():            void        // Optional – cleanup / deactivation
 *   }
 *
 * Plugins activate themselves by calling RPGManager.setActivePlugin(this).
 * Plugins deactivate by calling RPGManager.clearActivePlugin().
 */

const RPGManager = {

    // =========================================================================
    // Registry & State
    // =========================================================================

    /** @type {Array<Object>} Registered plugins (in priority order) */
    plugins: [],

    /** @type {Object|null} The currently active (triggered) plugin */
    activePlugin: null,

    /** Whether the manager has been initialized */
    initialized: false,


    // =========================================================================
    // Plugin Registry
    // =========================================================================

    /**
     * Register a plugin.
     * Plugins should call this at the bottom of their own file.
     * @param {Object} plugin - Plugin object implementing the plugin contract
     */
    register(plugin) {
        if (!plugin.name || typeof plugin.handleChannelMessage !== 'function') {
            console.error('[RPGManager] Plugin registration failed — missing required fields:', plugin);
            return;
        }
        this.plugins.push(plugin);
        console.log(`[RPGManager] ✅ Registered plugin: "${plugin.name}" (${this.plugins.length} total)`);
    },


    // =========================================================================
    // Lifecycle
    // =========================================================================

    /**
     * Initialize all registered plugins.
     * Called once from app.js on IRC connect.
     */
    init() {
        if (this.plugins.length === 0) {
            console.warn('[RPGManager] init() called but no plugins registered');
            return;
        }

        console.log(`[RPGManager] Initializing ${this.plugins.length} plugin(s)...`);

        this.activePlugin = null;
        this.initialized = true;

        this.plugins.forEach(plugin => {
            try {
                plugin.init();
                console.log(`[RPGManager]   ✓ ${plugin.name}`);
            } catch (err) {
                console.error(`[RPGManager]   ✗ ${plugin.name} init() threw:`, err);
            }
        });

        console.log('[RPGManager] All plugins initialized');
    },


    // =========================================================================
    // Message Routing
    // =========================================================================

    /**
     * Route a channel message.
     * If a plugin is active it receives the message exclusively.
     * Otherwise all idle plugins receive the message so they can check their
     * own trigger conditions (and call setActivePlugin when ready).
     *
     * Called from app.js handleUserMessage.
     * @param {string} message   - The user's message text
     * @param {string} channel   - The current channel name
     */
    handleChannelMessage(message, channel) {
        if (!this.initialized) return;

        if (this.activePlugin) {
            // Active plugin gets the message exclusively
            try {
                this.activePlugin.handleChannelMessage(message, channel);
            } catch (err) {
                console.error(`[RPGManager] ${this.activePlugin.name} handleChannelMessage threw:`, err);
            }
            return;
        }

        // No active plugin — let each idle plugin observe the message
        // (They decide internally when to call setActivePlugin)
        for (const plugin of this.plugins) {
            try {
                plugin.handleChannelMessage(message, channel);
            } catch (err) {
                console.error(`[RPGManager] ${plugin.name} handleChannelMessage threw:`, err);
            }
            // If one just activated itself, stop checking others
            if (this.activePlugin) break;
        }
    },

    /**
     * Route a private message (user → persona).
     * Only the active plugin handles PMs.
     *
     * Called from PrivateMessaging.receiveMessage inside each plugin file.
     * @param {string} nickname  - Target persona nickname
     * @param {string} message   - Message text
     */
    handlePrivateMessage(nickname, message) {
        if (!this.initialized) return;

        if (this.activePlugin && typeof this.activePlugin.handlePrivateMessage === 'function') {
            try {
                this.activePlugin.handlePrivateMessage(nickname, message);
            } catch (err) {
                console.error(`[RPGManager] ${this.activePlugin.name} handlePrivateMessage threw:`, err);
            }
        } else {
            console.log(`[RPGManager] PM to "${nickname}" ignored — no active plugin with PM handler`);
        }
    },


    // =========================================================================
    // Activation Control (called BY plugins, not by app code)
    // =========================================================================

    /**
     * Make a plugin the active (exclusive) plugin.
     * Call this from inside the plugin when its scenario triggers.
     * @param {Object} plugin
     */
    setActivePlugin(plugin) {
        if (this.activePlugin && this.activePlugin !== plugin) {
            console.warn(`[RPGManager] "${plugin.name}" tried to activate but "${this.activePlugin.name}" is already active`);
            return false;
        }
        this.activePlugin = plugin;
        console.log(`[RPGManager] 🎮 Active plugin set: "${plugin.name}"`);
        return true;
    },

    /**
     * Deactivate the current plugin (scenario complete / reset).
     * Plugins call this from their onComplete() or reset().
     */
    clearActivePlugin() {
        if (this.activePlugin) {
            console.log(`[RPGManager] 🏁 Plugin deactivated: "${this.activePlugin.name}"`);
        }
        this.activePlugin = null;
    },


    // =========================================================================
    // Shared Utilities
    // (Thin wrappers so plugins don't couple directly to LLMClient / UI / Utils)
    // =========================================================================

    utils: {

        /**
         * Make an LLM request via LLMClient.
         * @param {Array} messages  - OpenAI-format messages array
         * @returns {Promise<string|null>}
         */
        async callLLM(messages) {
            if (!window.LLMClient) {
                console.error('[RPGManager.utils] LLMClient not available');
                return null;
            }
            try {
                return await LLMClient.makeRequestWithRetry(messages);
            } catch (err) {
                console.error('[RPGManager.utils] LLM call failed:', err);
                return null;
            }
        },

        /**
         * Send a PM from a persona to the user (persona → user direction).
         * Opens/focuses the query window automatically.
         * @param {string} nickname  - The persona sending the PM
         * @param {string} message   - Message text
         * @param {boolean} focus    - Whether to focus the PM window
         */
        sendPrivateMessage(nickname, message, focus = true) {
            if (!window.UI || typeof UI.receivePrivateMessage !== 'function') {
                console.error('[RPGManager.utils] UI.receivePrivateMessage not available');
                return;
            }
            UI.receivePrivateMessage(nickname, message, focus);
        },

        /**
         * Calculate a realistic typing delay for a persona message.
         * Simulates ~50 WPM + variable thinking time.
         * @param {string} message
         * @returns {number} Delay in milliseconds
         */
        calculateTypingDelay(message) {
            if (!message) return 1000;
            const charCount = message.length;
            const wordCount = message.split(/\s+/).length;

            // ~4 chars/second typing
            const baseTypingTime = (charCount / 4) * 1000;

            let thinkingTime;
            if (wordCount <= 5)        thinkingTime = RPGManager.utils.randomInt(500, 1000);
            else if (wordCount <= 15)  thinkingTime = RPGManager.utils.randomInt(1000, 2000);
            else                       thinkingTime = RPGManager.utils.randomInt(2000, 3000);

            // Cap: min 1.5s, max 8s
            return Math.min(Math.max(thinkingTime + baseTypingTime, 1500), 8000);
        },

        /**
         * Random integer between min and max (inclusive).
         * Falls back to built-in if Utils isn't loaded yet.
         * @param {number} min
         * @param {number} max
         * @returns {number}
         */
        randomInt(min, max) {
            if (window.Utils && typeof Utils.randomInt === 'function') {
                return Utils.randomInt(min, max);
            }
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    },


    // =========================================================================
    // Debug Helpers
    // =========================================================================

    /**
     * Print current manager state to console.
     */
    showState() {
        console.log('=== RPGManager State ===');
        console.log('Initialized :', this.initialized);
        console.log('Plugins     :', this.plugins.map(p => p.name).join(', ') || '(none)');
        console.log('Active      :', this.activePlugin ? this.activePlugin.name : '(none)');
        console.log('========================');
    },

    /**
     * List all registered plugins.
     */
    listPlugins() {
        if (this.plugins.length === 0) {
            console.log('[RPGManager] No plugins registered');
            return;
        }
        this.plugins.forEach((p, i) => {
            const active = this.activePlugin === p ? ' ← ACTIVE' : '';
            console.log(`  [${i}] ${p.name}${active}`);
        });
    }

};

// Expose globally
window.RPGManager = RPGManager;

console.log('[RPGManager] Module loaded');
