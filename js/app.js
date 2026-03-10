/**
 * Main Application - mIRC LLM Simulator
 * Orchestrates all modules and handles application flow
 */

const App = {
    // Application state
    state: {
        initialized: false,
        connected: false,
        currentChannel: null,
        channelUsers: {},
        conversationHistory: []
    },

    /**
     * Initialize application
     */
    async init() {
        console.log('Initializing mIRC LLM Simulator...');

        // Initialize UI
        UI.init();

        // Initialize configuration
        await Config.init();

        // Initialize demo mode
        await DemoMode.init();

        // Set up connection dialog handlers
        this.setupConnectionHandlers();

        // Show connection dialog
        UI.showConnectionDialog();

        this.state.initialized = true;
        console.log('Application initialized');
    },

    /**
     * Set up connection dialog event handlers
     */
    setupConnectionHandlers() {
        // Connect button
        UI.elements.connectButton.addEventListener('click', async () => {
            await this.handleConnect();
        });

        // Demo mode button
        UI.elements.demoButton.addEventListener('click', () => {
            this.handleDemoMode();
        });

        // Disconnect button
        UI.elements.disconnectButton.addEventListener('click', () => {
            this.handleDisconnect();
        });

        // Enter key in inputs
        UI.elements.serverInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') await this.handleConnect();
        });

        UI.elements.nicknameInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') await this.handleConnect();
        });
    },

    /**
     * Handle connection attempt
     */
    async handleConnect() {
        const server = UI.elements.serverInput.value.trim();
        const nickname = UI.elements.nicknameInput.value.trim();
        const remember = UI.elements.rememberCheckbox.checked;

        // Validate inputs
        if (!server) {
            UI.showConnectionError('Please enter a server address');
            return;
        }

        if (!nickname) {
            UI.showConnectionError('Please enter a nickname');
            return;
        }

        if (!Utils.isValidNickname(nickname)) {
            UI.showConnectionError('Invalid nickname. Use letters, numbers, and basic symbols only.');
            return;
        }

        // Update config
        Config.setServer(server);
        Config.setNickname(nickname);
        Config.state.rememberSettings = remember;
        Config.saveToStorage();

        // Update LLM client
        LLMClient.setProxyUrl(server);

        // Test connection
        UI.hideConnectionStatus();
        UI.elements.connectButton.disabled = true;
        UI.elements.connectButton.textContent = 'Connecting...';

        const result = await LLMClient.testConnection(server);

        UI.elements.connectButton.disabled = false;
        UI.elements.connectButton.textContent = 'Connect';

        if (result.success) {
            UI.showConnectionSuccess(result.message);
            Config.setDemoMode(false);
            Config.setConnected(true);
            
            // Short delay then start
            await Utils.sleep(500);
            this.startSession();
        } else {
            UI.showConnectionError(result.message);
            
            // Offer demo mode as fallback
            setTimeout(() => {
                UI.showConnectionError(result.message + ' - Click "Skip & Use Demo Mode" to continue without LLM');
            }, 100);
        }
    },

    /**
     * Handle demo mode activation
     */
    handleDemoMode() {
        const nickname = UI.elements.nicknameInput.value.trim() || 'DemoUser';
        
        if (!Utils.isValidNickname(nickname)) {
            UI.showConnectionError('Please enter a valid nickname');
            return;
        }

        Config.setNickname(nickname);
        Config.setDemoMode(true);
        Config.setConnected(true);

        DemoMode.reset();

        this.startSession();
    },

    /**
     * Handle disconnect
     */
    handleDisconnect() {
        console.log('Disconnecting...');

        // Stop event simulator
        if (EventSimulator && EventSimulator.stopAllEvents) {
            EventSimulator.stopAllEvents();
        }

        // Stop RPG status updates
        if (UI && UI.stopRPGStatusUpdates) {
            UI.stopRPGStatusUpdates();
        }

        // Clear all windows except Status
        const workspace = UI.elements.mdiWorkspace;
        const windows = workspace.querySelectorAll('.mdi-window');
        windows.forEach(win => {
            if (win.dataset.window !== 'Status') {
                win.remove();
            }
        });

        // Clear switchbar buttons except Status
        const switchbar = UI.elements.switchbar;
        const buttons = switchbar.querySelectorAll('.switch-btn');
        buttons.forEach(btn => {
            if (btn.dataset.window !== 'Status') {
                btn.remove();
            }
        });

        // Reset message history
        UI.messageHistory = { 'Status': UI.messageHistory['Status'] || [] };

        // Reset state
        this.state.connected = false;
        this.state.currentChannel = null;
        this.state.channelUsers = {};
        this.state.conversationHistory = [];

        // Reset config
        Config.setConnected(false);

        // Hide demo banner
        UI.hideDemoBanner();

        // Show connection dialog
        UI.showConnectionDialog();

        console.log('Disconnected');
    },

    /**
     * Start IRC session
     */
    startSession() {
        console.log('Starting session...', {
            demo: Config.state.isDemo,
            nickname: Config.state.nickname
        });

        // Update UI
        UI.showMainInterface();
        UI.updateNickname(Config.state.nickname);
        UI.updateServerInfo(Config.state.serverAddress);

        // Set status
        if (Config.state.isDemo) {
            UI.updateStatus('demo', 'DEMO MODE');
            UI.showDemoBanner();
        } else {
            UI.updateStatus('connected', 'Connected');
            UI.hideDemoBanner();
        }

        // Render channel list
        const channels = Config.getChannelList();
        UI.renderChannelList(channels, null);

        // Show welcome message in Status window
        UI.addSystemMessage('==================================================', 'Status');
        UI.addSystemMessage('Welcome to mIRC LLM Simulator!', 'Status');
        UI.addSystemMessage(`You are connected as: ${Config.state.nickname}`, 'Status');
        if (Config.state.isDemo) {
            UI.addSystemMessage('*** DEMO MODE - Using pre-scripted responses ***', 'Status');
        }
        UI.addSystemMessage('==================================================', 'Status');
        
        // Show MOTD (Message of the Day)
        UI.addSystemMessage('', 'Status');
        UI.addSystemMessage('- Message of the Day -', 'Status');
        UI.addSystemMessage('  ____  ____  ____   ____ ', 'Status');
        UI.addSystemMessage(' ||m ||||I ||||R ||| C ||', 'Status');
        UI.addSystemMessage(' ||__||||__||||__||||__||', 'Status');
        UI.addSystemMessage(' |/__\\||/__\\||/__\\||/__\\|', 'Status');
        UI.addSystemMessage('', 'Status');
        UI.addSystemMessage('Classic IRC experience with AI-powered personas', 'Status');
        UI.addSystemMessage('', 'Status');
        UI.addSystemMessage('Server Features:', 'Status');
        UI.addSystemMessage('  • Dynamic channel generation - join ANY channel', 'Status');
        UI.addSystemMessage('  • AI personas respond contextually to conversations', 'Status');
        UI.addSystemMessage('  • Authentic IRC commands and user modes', 'Status');
        UI.addSystemMessage('  • Classic mIRC MDI interface', 'Status');
        UI.addSystemMessage('', 'Status');
        UI.addSystemMessage('Commands:', 'Status');
        UI.addSystemMessage('  /help     - Show available commands', 'Status');
        UI.addSystemMessage('  /list     - List popular channels', 'Status');
        UI.addSystemMessage('  /join #ch - Join any channel', 'Status');
        UI.addSystemMessage('  !op       - Request operator status', 'Status');
        UI.addSystemMessage('', 'Status');
        UI.addSystemMessage('Have fun and enjoy the nostalgic vibes!', 'Status');
        UI.addSystemMessage('==================================================', 'Status');

        // Start event simulator for channel activity
        console.log('[STARTUP] Initializing EventSimulator...');
        EventSimulator.init();

        // Initialize event settings UI
        console.log('[STARTUP] Initializing EventSettingsUI...');
        if (window.EventSettingsUI) {
            EventSettingsUI.init();
        }

        // Initialize RPG system (Time Travel Confidant)
        console.log('[STARTUP] Initializing RPG System...');
        if (window.RPG) {
            RPG.init();
        }

        this.state.connected = true;
    },

    /**
     * Join a channel
     * @param {string} channelName - Channel to join
     */
    joinChannel(channelName) {
        // Normalize channel name
        if (!channelName.startsWith('#')) {
            channelName = '#' + channelName;
        }

        // Check if already in channel
        if (this.state.channelUsers[channelName]) {
            UI.createOrSwitchWindow(channelName, true);
            UI.addSystemMessage(`You are already in ${channelName}`, 'Status');
            return;
        }

        // Create or switch to channel window
        UI.createOrSwitchWindow(channelName, true);

        // Update state (both App and Config need to track current channel)
        this.state.currentChannel = channelName;
        Config.setChannel(channelName);

        // Generate topic dynamically
        const topic = TopicGenerator.generateTopic(channelName);
        const themeHint = TopicGenerator.getThemeHint(channelName);
        
        // Update UI (topic is now per-channel, stored in window if needed)
        UI.updateTopic(topic);

        // Show join message in channel window
        UI.addMessage({
            type: 'join',
            text: `* Now talking in ${channelName}`,
            timestamp: new Date()
        }, channelName);

        UI.addMessage({
            type: 'system',
            text: `* Topic is '${topic}'`,
            timestamp: new Date()
        }, channelName);

        // ===== DYNAMIC USER POPULATION =====
        
        // Get all available personas
        const allPersonas = Object.values(Config.personas || {});
        console.log(`[JOIN] Available personas:`, allPersonas.map(p => p.nickname));
        
        // Randomly select 2-4 active personas for this channel
        const personaCount = Utils.randomInt(2, 4);
        const activePersonas = [];
        const shuffledPersonas = [...allPersonas].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(personaCount, shuffledPersonas.length); i++) {
            activePersonas.push(shuffledPersonas[i]);
        }
        
        console.log(`[JOIN] Selected ${activePersonas.length} active personas:`, activePersonas.map(p => p.nickname));
        
        // Store active personas for this channel (for LLM responses)
        if (!this.state.activePersonas) {
            this.state.activePersonas = {};
        }
        this.state.activePersonas[channelName] = activePersonas;
        
        // Generate total user count (40-50 users)
        const totalUsers = Utils.randomInt(40, 50);
        
        // Calculate lurker count (total - user - active personas)
        const lurkerCount = totalUsers - 1 - activePersonas.length;
        
        // Generate lurker usernames from personas.ini lurker pool if available
        let lurkerNames = [];
        if (Config.lurkers && Config.lurkers.length > 0) {
            // Lurkers are already parsed as an array by INI parser
            const validPool = Config.lurkers.filter(name => name && name.length > 0);
            
            // Shuffle and select random lurkers from pool
            const shuffled = [...validPool].sort(() => Math.random() - 0.5);
            lurkerNames = shuffled.slice(0, lurkerCount);
            
            console.log(`[JOIN] Using ${lurkerNames.length} lurkers from personas.ini pool (${validPool.length} total)`);
        } else {
            // Fallback to UsernameGenerator
            UsernameGenerator.reset();
            lurkerNames = UsernameGenerator.generateBatch(lurkerCount);
            console.log(`[JOIN] Using ${lurkerNames.length} generated lurker names`);
        }
        
        console.log(`[JOIN] Channel population: ${totalUsers} total (1 user + ${activePersonas.length} personas + ${lurkerCount} lurkers)`);
        
        // Build complete user list
        const users = [];
        
        // Add current user (always regular user initially)
        users.push({ nick: Config.state.nickname, mode: null });
        
        // Add active personas
        for (const persona of activePersonas) {
            users.push({
                nick: persona.nickname,
                mode: null,
                isPersona: true
            });
        }
        
        // Add lurkers
        for (const lurkerName of lurkerNames) {
            users.push({
                nick: lurkerName,
                mode: null,
                isLurker: true
            });
        }
        
        // ===== MODE ASSIGNMENT =====
        
        // Assign operator modes (4-5 ops, ~8-10%)
        const opCount = Utils.randomInt(4, 5);
        const shuffledUsers = [...users].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < opCount && i < shuffledUsers.length; i++) {
            shuffledUsers[i].mode = 'operator';
        }
        
        // Assign voice modes (6-15 voiced, ~12-30%)
        const voiceCount = Utils.randomInt(6, 15);
        const regularUsers = shuffledUsers.filter(u => u.mode !== 'operator');
        
        for (let i = 0; i < voiceCount && i < regularUsers.length; i++) {
            regularUsers[i].mode = 'voice';
        }
        
        console.log(`[JOIN] Mode distribution: ${opCount} ops, ${voiceCount} voiced, ${users.length - opCount - voiceCount} regular`);
        
        // Store user list
        this.state.channelUsers[channelName] = users;
        
        // Check if main user got operator status, show ChanServ message
        const mainUser = users.find(u => u.nick === Config.state.nickname);
        if (mainUser && mainUser.mode === 'operator') {
            UI.addMessage({
                type: 'mode',
                text: `* ChanServ sets mode: +o ${Config.state.nickname}`,
                timestamp: new Date()
            }, channelName);
        }
        
        // Store lurker names for event simulation
        if (!this.state.lurkers) {
            this.state.lurkers = {};
        }
        this.state.lurkers[channelName] = lurkerNames;
        console.log(`[JOIN] Stored ${lurkerNames.length} lurker names for event simulation:`, lurkerNames.slice(0, 5));
        
        // Render user list (use setTimeout to ensure DOM is updated)
        setTimeout(() => {
            console.log(`[JOIN] Rendering ${users.length} users for ${channelName}`);
            UI.renderUserList(users, Config.state.nickname, channelName);
            
            // Update window title with IRC format: "#channel [usercount] [+nt]: Topic"
            UI.updateChannelTitle(channelName, users.length, topic);
        }, 100);

        // Show join messages for active personas only
        for (const persona of activePersonas) {
            UI.addMessage({
                type: 'join',
                text: `* ${persona.nickname} has joined ${channelName}`,
                timestamp: new Date()
            }, channelName);
        }

        // In demo mode, send a greeting from one of the active personas
        if (Config.state.isDemo && activePersonas.length > 0) {
            setTimeout(() => {
                this.generateDemoGreeting(activePersonas, channelName);
            }, Utils.randomInt(1000, 2000));
        }

        // Start per-channel events
        if (window.EventSimulator) {
            EventSimulator.startChannelEvents(channelName);
        }

        // Trigger LLM topic upgrade (hybrid approach: show keyword topic first, upgrade later)
        this.upgradeTopic(channelName, topic, users);
    },

    /**
     * Upgrade channel topic from keyword to LLM-generated (hybrid approach)
     * Simulates an operator changing the topic after join
     * @param {string} channelName - Channel name
     * @param {string} keywordTopic - Initial keyword-based topic  
     * @param {Array} users - Channel user list
     */
    async upgradeTopic(channelName, keywordTopic, users) {
        // Wait 500-1500ms before "changing" topic (feels natural)
        const delay = Utils.randomInt(500, 1500);
        
        setTimeout(async () => {
            try {
                // Generate LLM topic (or get from cache)
                const llmTopic = await TopicGenerator.generateLLMTopic(channelName, keywordTopic);
                
                // If same as keyword topic, skip (LLM failed or returned fallback)
                if (llmTopic === keywordTopic) {
                    console.log(`[TopicUpgrade] LLM topic same as keyword, skipping for ${channelName}`);
                    return;
                }

                // Pick random operator to "set" the topic
                const ops = users.filter(u => u.mode === '@');
                let opName;
                
                if (ops.length > 0) {
                    opName = Utils.randomChoice(ops).nickname;
                } else {
                    // No ops yet, use ChanServ
                    opName = 'ChanServ';
                }

                console.log(`[TopicUpgrade] ${opName} changing topic in ${channelName}`);

                // Show topic change message
                UI.addMessage({
                    type: 'topic',
                    text: `* ${opName} changes topic to "${llmTopic}"`,
                    timestamp: new Date()
                }, channelName);

                // Update window title
                UI.updateChannelTitle(channelName, users.length, llmTopic);

                // Update topic in UI
                UI.updateTopic(llmTopic);

            } catch (error) {
                console.error('[TopicUpgrade] Failed:', error);
            }
        }, delay);
    },

    /**
     * Leave a channel (cleanup state when window is closed)
     * @param {string} channelName - Channel to leave
     */
    leaveChannel(channelName) {
        console.log(`[APP] Leaving channel: ${channelName}`);
        
        // Clean up channel state
        delete this.state.channelUsers[channelName];
        
        // Clean up active personas for this channel
        if (this.state.activePersonas) {
            delete this.state.activePersonas[channelName];
        }
        
        // Clean up lurker list for this channel
        if (this.state.lurkers) {
            delete this.state.lurkers[channelName];
        }
        
        // Update current channel if this was the active one
        if (this.state.currentChannel === channelName) {
            this.state.currentChannel = null;
        }

        // Stop per-channel events
        if (window.EventSimulator) {
            EventSimulator.stopChannelEvents(channelName);
        }
    },

    /**
     * Generate demo greeting from random persona
     * @param {Array} personas - Available personas
     * @param {string} channelName - Channel name
     */
    async generateDemoGreeting(personas, channelName) {
        const persona = Utils.randomChoice(personas);
        const greeting = await DemoMode.simulateResponse(
            persona.nickname,
            '',
            channelName
        );

        UI.addMessage({
            type: 'normal',
            nick: persona.nickname,
            text: greeting,
            color: persona.color,
            timestamp: new Date()
        }, channelName);
    },

    /**
     * Detect if a message mentions a specific persona (supports shortened names)
     * @param {string} message - The user's message
     * @param {Array} personas - Active personas in the channel
     * @returns {Object|null} - The mentioned persona or null
     */
    detectMentionedPersona(message, personas) {
        const lowerMessage = message.toLowerCase();
        
        for (const persona of personas) {
            const nick = persona.nickname.toLowerCase();
            
            // Remove common non-alphanumeric characters for matching
            const cleanNick = nick.replace(/[^a-z0-9]/g, '');
            const cleanMessage = lowerMessage.replace(/[^a-z0-9\s]/g, '');
            
            // Check for exact nickname match (case-insensitive)
            const exactPattern = new RegExp(`\\b${nick}\\b`, 'i');
            if (exactPattern.test(lowerMessage)) {
                return persona;
            }
            
            // Check for shortened nickname (first 3-4 chars minimum)
            if (cleanNick.length >= 4) {
                // Try matching first 3-5 characters
                for (let len = 3; len <= Math.min(5, cleanNick.length); len++) {
                    const shortNick = cleanNick.substring(0, len);
                    const shortPattern = new RegExp(`\\b${shortNick}\\b`, 'i');
                    if (shortPattern.test(cleanMessage)) {
                        return persona;
                    }
                }
            }
        }
        
        return null;
    },

    /**
     * Get recent chat messages from a channel for conversation context
     * @param {string} channelName - Channel name
     * @param {number} count - Number of recent messages to retrieve (default: 2)
     * @param {string} excludeNick - Exclude messages from this nickname (to avoid self-reply)
     * @returns {Array} Array of recent message objects {nick, text, timestamp}
     */
    getRecentMessages(channelName, count = 2, excludeNick = null) {
        if (!this.state.channelMessages) {
            return [];
        }
        
        const channelMessages = this.state.channelMessages[channelName];
        if (!channelMessages || channelMessages.length === 0) {
            return [];
        }

        // Filter to only chat messages (exclude system events like joins, parts, topics)
        const chatMessages = channelMessages.filter(msg => {
            // Only include actual chat messages (type: 'message' or 'normal')
            if (msg.type !== 'message' && msg.type !== 'normal') {
                return false;
            }
            
            // Exclude messages from the specified nickname
            if (excludeNick && msg.nick === excludeNick) {
                return false;
            }
            
            // Exclude user's own messages
            if (msg.nick === Config.state.nickname) {
                return false;
            }
            
            return true;
        });

        // Get the last N messages
        const recentMessages = chatMessages.slice(-count);

        // Format for LLM consumption
        return recentMessages.map(msg => ({
            nick: msg.nick,
            text: msg.text,
            timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            }) : '00:00'
        }));
    },

    /**
     * Handle user message
     * @param {string} message - User's message
     */
    async handleUserMessage(message) {        // Check for !op or !Op command (ChanServ op request)
        if (message.toLowerCase() === '!op') {
            const currentWindow = UI.activeWindow;
            
            // Can only use !op in channels
            if (currentWindow === 'Status') {
                UI.addErrorMessage('Cannot request ops in Status window', 'Status');
                return;
            }

            // Get current user
            const users = this.state.channelUsers[currentWindow] || [];
            const currentUser = users.find(u => u.nick === Config.state.nickname);
            
            if (!currentUser) {
                UI.addErrorMessage('You are not in this channel', currentWindow);
                return;
            }

            // Give the user ops
            currentUser.mode = 'operator';

            // Show ChanServ mode change message
            UI.addMessage({
                type: 'mode',
                text: `* ChanServ sets mode: +o ${Config.state.nickname}`,
                timestamp: new Date()
            }, currentWindow);

            // Re-render user list
            UI.renderUserList(users, Config.state.nickname, currentWindow);
            return;
        }
        // Check if it's a command
        const cmdResult = IRCCommands.execute(message);
        
        if (cmdResult.handled) {
            // Show error message if command failed
            if (!cmdResult.success && cmdResult.message) {
                UI.addErrorMessage(cmdResult.message, 'Status');
            }
            // Show success message if command succeeded and returned a message
            else if (cmdResult.success && cmdResult.message) {
                UI.addSystemMessage(cmdResult.message, UI.activeWindow !== 'Status' ? UI.activeWindow : 'Status');
            }
            return;
        }

        // Can only chat in channels, not in Status window
        if (UI.activeWindow === 'Status') {
            UI.addErrorMessage('Cannot send messages in Status window. Join a channel with /join #channel', 'Status');
            return;
        }

        const currentChannel = UI.activeWindow;

        // Display user's message
        UI.addMessage({
            type: 'normal',
            nick: Config.state.nickname,
            text: message,
            color: '#000080',
            timestamp: new Date()
        }, currentChannel);

        // Store in conversation history
        this.state.conversationHistory.push({
            nick: Config.state.nickname,
            text: message,
            timestamp: new Date()
        });

        // Trim history to last 20 messages
        if (this.state.conversationHistory.length > 20) {
            this.state.conversationHistory = this.state.conversationHistory.slice(-20);
        }

        // Check for temporal slips (RPG System)
        if (window.RPG) {
            RPG.handleUserMessage(message, currentChannel);
        }

        // Get active personas for current channel (from dynamic channel generation)
        const personas = this.state.activePersonas && this.state.activePersonas[currentChannel]
            ? this.state.activePersonas[currentChannel]
            : [];
        
        console.log(`[APP] Active personas in ${currentChannel}:`, personas.map(p => p.nickname));
        
        if (personas.length === 0) {
            console.log(`[APP] No active personas in ${currentChannel}`);
            return; // No one to respond
        }

        // Detect if user mentioned a specific persona
        const mentionedPersona = this.detectMentionedPersona(message, personas);
        
        if (mentionedPersona) {
            console.log(`[APP] Detected mention of ${mentionedPersona.nickname}`);
            
            // Mentioned persona responds first
            await this.generatePersonaResponse(mentionedPersona, message, currentChannel, true);
            
            // 15% chance for others to butt in
            const buttInChance = 0.15;
            const otherPersonas = personas.filter(p => p.nickname !== mentionedPersona.nickname);
            
            for (const persona of otherPersonas) {
                if (Math.random() < buttInChance) {
                    console.log(`[APP] ${persona.nickname} butting in...`);
                    await Utils.sleep(Utils.randomInt(1500, 3000));
                    await this.generatePersonaResponse(persona, message, currentChannel, false);
                }
            }
            
            return;
        }

        // Generate response(s) - normal behavior when no mention detected
        const respondCount = Math.random() < 0.7 ? 1 : 2; // 70% chance of 1 response, 30% chance of 2

        for (let i = 0; i < respondCount; i++) {
            // Select responding persona
            const persona = i === 0 
                ? Utils.randomChoice(personas)
                : personas[Math.min(i, personas.length - 1)];

            // Add slight delay between responses
            if (i > 0) {
                await Utils.sleep(Utils.randomInt(1000, 2000));
            }

            // Generate response
            await this.generatePersonaResponse(persona, message, currentChannel);
        }
    },

    /**
     * Generate response from a persona
     * @param {Object} persona - Persona object
     * @param {string} userMessage - User's message
     * @param {string} channelName - Channel name
     * @param {boolean} isDirectMention - Whether the persona was directly mentioned
     */
    async generatePersonaResponse(persona, userMessage, channelName, isDirectMention = false) {
        try {
            let responseLines = [];

            if (Config.state.isDemo) {
                // Use demo mode (returns single string)
                const response = await DemoMode.simulateResponse(
                    persona.nickname,
                    userMessage,
                    channelName
                );
                responseLines = [response];
            } else {
                // Use LLM with topic-aware theme (returns array of lines)
                const theme = TopicGenerator.getThemeHint(channelName);

                // Get recent conversation context (exclude this persona to avoid self-reply)
                const messageCount = Math.random() < 0.5 ? 1 : 2;
                const recentMessages = this.getRecentMessages(channelName, messageCount, persona.nickname);

                responseLines = await LLMClient.generateResponse(
                    persona,
                    userMessage,
                    theme,
                    channelName,
                    isDirectMention,
                    recentMessages.length > 0 ? recentMessages : null
                );
            }

            // Display response lines with typing delay between them
            for (let i = 0; i < responseLines.length; i++) {
                // Add typing delay before subsequent lines
                if (i > 0) {
                    await Utils.sleep(LLMClient.getTypingDelay());
                }

                // Display each line as a separate message
                UI.addMessage({
                    type: 'normal',
                    nick: persona.nickname,
                    text: responseLines[i],
                    color: persona.color,
                    timestamp: new Date()
                }, channelName);
            }

            // Store full response in history (if we still need this for demo mode)
            if (this.state.conversationHistory) {
                this.state.conversationHistory.push({
                    nick: persona.nickname,
                    text: responseLines.join(' '),
                    timestamp: new Date()
                });
                
                // Trim history to prevent memory bloat
                if (this.state.conversationHistory.length > 50) {
                    this.state.conversationHistory = this.state.conversationHistory.slice(-50);
                }
            }

        } catch (error) {
            console.error('[APP] Error generating response:', error);
            
            // Fallback to demo mode on error
            if (!Config.state.isDemo) {
                UI.addSystemMessage('LLM connection lost - falling back to demo mode', 'Status');
                Config.setDemoMode(true);
                UI.updateStatus('demo', 'DEMO MODE (Fallback)');
                UI.showDemoBanner();

                // Retry with demo mode
                const response = await DemoMode.simulateResponse(
                    persona.nickname,
                    userMessage,
                    channelName
                );

                UI.addMessage({
                    type: 'normal',
                    nick: persona.nickname,
                    text: response,
                    color: persona.color,
                    timestamp: new Date()
                }, channelName);

                this.state.conversationHistory.push({
                    nick: persona.nickname,
                    text: response,
                    timestamp: new Date()
                });
            }
        }
    },

    /**
     * Show whois information
     * @param {string} nickname - Nickname to query
     */
    showWhois(nickname) {
        IRCCommands.execute(`/whois ${nickname}`);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make available globally
window.App = App;
