/**
 * Event Simulator - mIRC LLM Simulator
 * Simulates random IRC events (joins, parts, netsplits, etc.)
 */

const EventSimulator = {
    // Active timers
    timers: {},

    // Event configuration
    events: {},

    /**
     * Initialize event simulator
     */
    init() {
        this.events = Config.events;
        console.log('[EventSim] Loaded events config:', this.events);
        this.startAllEvents();
    },

    /**
     * Start all enabled events
     */
    startAllEvents() {
        let startedCount = 0;
        for (const [eventType, config] of Object.entries(this.events)) {
            // Skip non-event sections (like lurker_names)
            if (typeof config === 'object' && config.enabled && config.frequency) {
                this.startEvent(eventType, config.frequency);
                startedCount++;
                console.log(`[EventSim] Started '${eventType}' event (freq: ${config.frequency}s)`);
            }
        }
        console.log(`[EventSim] Started ${startedCount} event timers`);
    },

    /**
     * Start a specific event timer
     * @param {string} eventType - Event type
     * @param {number} frequency - Frequency in seconds
     */
    startEvent(eventType, frequency) {
        // Clear existing timer if any
        this.stopEvent(eventType);

        // Set up recurring timer
        this.timers[eventType] = setInterval(() => {
            this.triggerEvent(eventType);
        }, frequency * 1000);
        
        console.log(`[EventSim] Timer started for '${eventType}' (every ${frequency}s)`);
    },

    /**
     * Stop a specific event
     * @param {string} eventType - Event type
     */
    stopEvent(eventType) {
        if (this.timers[eventType]) {
            clearInterval(this.timers[eventType]);
            delete this.timers[eventType];
        }
    },

    /**
     * Stop all events
     */
    stopAllEvents() {
        for (const eventType of Object.keys(this.timers)) {
            this.stopEvent(eventType);
        }
    },

    /**
     * Trigger a specific event
     * @param {string} eventType - Event type
     */
    triggerEvent(eventType) {
        console.log(`[EventSim] Trigger attempt: ${eventType}`);
        
        // Random chance to skip (makes events feel more natural)
        // Higher skipChance = more likely to trigger
        const skipChance = eventType === 'idle_chatter' ? 0.6 : 0.5;
        if (Math.random() > skipChance) {
            console.log(`[EventSim] ${eventType} skipped (random)`);
            return;
        }

        console.log(`[EventSim] Executing ${eventType}...`);

        switch (eventType) {
            case 'join':
                this.simulateJoin();
                break;
            case 'part':
            case 'quit':
                this.simulateQuit();
                break;
            case 'netsplit':
                this.simulateNetsplit();
                break;
            case 'topic_change':
                this.simulateTopicChange();
                break;
            case 'kick':
                this.simulateKick();
                break;
            case 'mode':
                this.simulateModeChange();
                break;
            case 'kline':
                this.simulateKline();
                break;
            case 'idle_chatter':
                this.simulateIdleChatter();
                break;
        }
    },

    /**
     * Get a random joined channel (excluding Status)
     * @returns {string|null} Random channel name or null if none available
     */
    getRandomChannel() {
        if (!window.App || !window.App.state.channelUsers) return null;
        
        const channels = Object.keys(window.App.state.channelUsers).filter(ch => ch !== 'Status');
        if (channels.length === 0) return null;
        
        return Utils.randomChoice(channels);
    },

    /**
     * Simulate user join
     */
    simulateJoin() {
        // Pick a random channel from all joined channels
        const targetChannel = this.getRandomChannel();
        if (!targetChannel) {
            console.log(`[EventSim] simulateJoin aborted - no valid channels`);
            return;
        }

        // Get lurker names from config
        const lurkerNames = window.App.state.lurkers && window.App.state.lurkers[targetChannel];
        console.log(`[EventSim] simulateJoin - ${targetChannel} lurkerNames:`, lurkerNames ? lurkerNames.length : 0);
        
        if (!lurkerNames  || lurkerNames.length === 0) {
            console.log(`[EventSim] simulateJoin aborted - no lurker names`);
            return;
        }

        const nick = Utils.randomChoice(lurkerNames);

        console.log(`[EventSim] ${nick} joining ${targetChannel}`);
        
        UI.addMessage({
            type: 'join',
            text: `* ${nick} has joined ${targetChannel}`,
            timestamp: new Date()
        }, targetChannel);
    },

    /**
     * Simulate user quit/part
     */
    simulateQuit() {
        // Pick a random channel from all joined channels
        const targetChannel = this.getRandomChannel();
        if (!targetChannel) {
            console.log(`[EventSim] simulateQuit aborted - no valid channels`);
            return;
        }

        // Get lurker names from config
        const lurkerNames = window.App.state.lurkers && window.App.state.lurkers[targetChannel];
        console.log(`[EventSim] simulateQuit - ${targetChannel} lurkerNames:`, lurkerNames ? lurkerNames.length : 0);
        
        if (!lurkerNames || lurkerNames.length === 0) {
            console.log(`[EventSim] simulateQuit aborted - no lurker names`);
            return;
        }

        const nick = Utils.randomChoice(lurkerNames);
        const quitMessages = [
            'Ping timeout',
            'Read error: Connection reset by peer',
            'Client Quit',
            'later',
            'gotta go',
            'brb'
        ];

        const quitMsg = Utils.randomChoice(quitMessages);

        console.log(`[EventSim] ${nick} quitting from ${targetChannel}`);

        UI.addMessage({
            type: 'quit',
            text: `* ${nick} has quit IRC (${quitMsg})`,
            timestamp: new Date()
        }, targetChannel);
    },

    /**
     * Simulate netsplit
     */
    simulateNetsplit() {
        const servers = [
            'irc.efnet.org',
            'irc.prison.net',
            'irc.servercentral.net',
            'irc.blessed.net'
        ];

        const server1 = Utils.randomChoice(servers);
        let server2 = Utils.randomChoice(servers);
        while (server2 === server1) {
            server2 = Utils.randomChoice(servers);
        }

        // Show in Status window
        UI.addMessage({
            type: 'system',
            text: `!!! Netsplit detected: ${server1} <-> ${server2}`,
            timestamp: new Date()
        }, 'Status');

        // Pick a random channel
        const targetChannel = this.getRandomChannel();
        if (!targetChannel) return;

        // Get lurker names
        const lurkerNames = window.App.state.lurkers && window.App.state.lurkers[targetChannel];
        if (!lurkerNames || lurkerNames.length === 0) return;

        // Simulate multiple users splitting
        const splitCount = Math.min(Utils.randomInt(1, 3), lurkerNames.length);
        const splitUsers = [];

        for (let i = 0; i < splitCount; i++) {
            const nick = lurkerNames[i];
            splitUsers.push(nick);
            UI.addMessage({
                type: 'quit',
                text: `* ${nick} has quit IRC (${server1} ${server2})`,
                timestamp: new Date()
            }, targetChannel);
        }

        // Schedule reconnection after 30-120 seconds
        const rejoinDelay = Utils.randomInt(30000, 120000);
        setTimeout(() => {
            this.netsplitRejoin(targetChannel, splitUsers);
        }, rejoinDelay);
    },

    /**
     * Rejoin users after netsplit heals
     * @param {string} channelName - Channel name
     * @param {Array} users - Users to rejoin
     */
    netsplitRejoin(channelName, users) {
        // Check if channel still exists in joined channels
        if (!window.App.state.channelUsers[channelName]) return;

        for (const nick of users) {
            UI.addMessage({
                type: 'join',
                text: `* ${nick} has joined ${channelName}`,
                timestamp: new Date()
            }, channelName);
        }
    },

    /**
     * Simulate topic change
     */
    simulateTopicChange() {
        const targetChannel = this.getRandomChannel();
        if (!targetChannel) return;

        const activePersonas = window.App.state.activePersonas && window.App.state.activePersonas[targetChannel];
        if (!activePersonas || activePersonas.length === 0) return;

        const persona = Utils.randomChoice(activePersonas);
        const topic = TopicGenerator.generateTopic(targetChannel);

        UI.addMessage({
            type: 'system',
            text: `* ${persona.nickname} has changed the topic to: ${topic}`,
            timestamp: new Date()
        }, targetChannel);

        // Update window title
        const users = window.App.state.channelUsers[targetChannel];
        if (users) {
            UI.updateChannelTitle(targetChannel, users.length, topic);
        }
    },

    /**
     * Simulate kick
     */
    simulateKick() {
        const targetChannel = this.getRandomChannel();
        if (!targetChannel) return;

        const activePersonas = window.App.state.activePersonas && window.App.state.activePersonas[targetChannel];
        const lurkerNames = window.App.state.lurkers && window.App.state.lurkers[targetChannel];
        
        if (!activePersonas || activePersonas.length === 0) return;
        if (!lurkerNames || lurkerNames.length === 0) return;

        const kicker = Utils.randomChoice(activePersonas);
        const kicked = Utils.randomChoice(lurkerNames);
        const reasons = [
            'flooding',
            'abuse',
            'requested',
            'no reason',
            'bye',
            'timeout'
        ];

        const reason = Utils.randomChoice(reasons);

        UI.addMessage({
            type: 'part',
            text: `* ${kicked} was kicked by ${kicker.nickname} (${reason})`,
            timestamp: new Date()
        }, targetChannel);
    },

    /**
     * Simulate mode change
     */
    simulateModeChange() {
        const targetChannel = this.getRandomChannel();
        if (!targetChannel) return;

        const activePersonas = window.App.state.activePersonas && window.App.state.activePersonas[targetChannel];
        const lurkerNames = window.App.state.lurkers && window.App.state.lurkers[targetChannel];
        
        if (!activePersonas || activePersonas.length === 0) return;
        if (!lurkerNames || lurkerNames.length === 0) return;

        // Get channel user list to find operators
        const channelUsers = window.App.state.channelUsers && window.App.state.channelUsers[targetChannel];
        if (!channelUsers || channelUsers.length === 0) return;

        // Find all operators in the channel
        const operators = channelUsers.filter(u => u.mode === 'operator');
        
        // If we have operators, pick a random one; otherwise use ChanServ
        let moderator;
        if (operators.length > 0) {
            const randomOp = Utils.randomChoice(operators);
            moderator = randomOp.nick;
        } else {
            moderator = 'ChanServ';
        }

        const nick = Utils.randomChoice(lurkerNames);
        const modes = ['+o', '+v', '-v'];
        const mode = Utils.randomChoice(modes);

        UI.addMessage({
            type: 'mode',
            text: `* ${moderator} sets mode: ${mode} ${nick}`,
            timestamp: new Date()
        }, targetChannel);
    },

    /**
     * Simulate K-line (ban)
     */
    simulateKline() {
        const targetChannel = this.getRandomChannel();
        if (!targetChannel) return;

        const lurkerNames = window.App.state.lurkers && window.App.state.lurkers[targetChannel];
        if (!lurkerNames || lurkerNames.length === 0) return;

        const nick = Utils.randomChoice(lurkerNames);

        UI.addMessage({
            type: 'system',
            text: `*** K-Line added for *@${this.generateHost()} (Banned)`,
            timestamp: new Date()
        }, 'Status');

        UI.addMessage({
            type: 'quit',
            text: `* ${nick} has quit IRC (K-Lined)`,
            timestamp: new Date()
        }, targetChannel);
    },

    /**
     * Simulate idle chatter from active personas
     */
    async simulateIdleChatter() {
        // Pick a random channel from all joined channels
        const targetChannel = this.getRandomChannel();
        if (!targetChannel) return;

        const activePersonas = window.App.state.activePersonas && window.App.state.activePersonas[targetChannel];
        if (!activePersonas || activePersonas.length === 0) return;

        // Pick a random active persona
        const persona = Utils.randomChoice(activePersonas);

        // Generate idle message based on mode (demo or LLM)
        if (Config.state.isDemo) {
            // Demo mode: use predefined idle messages
            const idleMessages = [
                'anyone here?',
                'sup',
                'lol',
                'brb',
                'back',
                'nice',
                'lmao',
                'true',
                'facts',
                'agreed',
                'same',
                'yep',
                '*yawn*',
                'coffee time',
                'interesting...',
                'hmm',
                'wtf',
                'omg',
                'yeah',
                'nah'
            ];
            
            const message = Utils.randomChoice(idleMessages);
            
            UI.addMessage({
                type: 'message',
                nick: persona.nickname,
                text: message,
                color: persona.color || '#000000',
                timestamp: new Date()
            }, targetChannel);
        } else {
            // LLM mode: generate context-aware idle chatter
            try {
                const topic = TopicGenerator.getThemeHint(targetChannel);
                
                // Create a simple idle chatter prompt (no user message)
                const idlePrompt = `Say something brief and casual about ${topic}. Keep it very short (5-10 words). Just idle chatter, no questions.`;
                
                const responseLines = await LLMClient.generateResponse(
                    persona,
                    idlePrompt,
                    topic,
                    targetChannel
                );
                
                if (responseLines && responseLines.length > 0) {
                    // Display response lines with typing delay between them
                    for (let i = 0; i < responseLines.length; i++) {
                        setTimeout(() => {
                            UI.addMessage({
                                type: 'message',
                                nick: persona.nickname,
                                text: responseLines[i],
                                color: persona.color || '#000000',
                                timestamp: new Date()
                            }, targetChannel);
                        }, i * Utils.randomInt(500, 1500));
                    }
                }
            } catch (error) {
                // Silently fail for idle chatter (don't spam console in demo mode)
                console.log('[IDLE CHATTER] Error (using demo mode):', error.message);
                
                // Fallback to demo mode message on LLM error
                const idleMessages = ['hmm', 'interesting', 'yeah', 'lol', 'nice'];
                const message = Utils.randomChoice(idleMessages);
                
                UI.addMessage({
                    type: 'message',
                    nick: persona.nickname,
                    text: message,
                    color: persona.color || '#000000',
                    timestamp: new Date()
                }, targetChannel);
            }
        }
    },

    /**
     * Generate random hostmask
     * @param {string} nick - Nickname
     * @returns {string} Hostmask
     */
    generateHostmask(nick) {
        const user = nick.toLowerCase();
        const host = this.generateHost();
        return `${user}@${host}`;
    },

    /**
     * Generate random hostname
     * @returns {string} Hostname
     */
    generateHost() {
        const domains = [
            'isp.com',
            'cable.net',
            'dsl.provider.org',
            'university.edu',
            'company.com'
        ];

        const num = Utils.randomInt(1, 255);
        const domain = Utils.randomChoice(domains);

        return `user-${num}.${domain}`;
    }
};

// Make available globally
window.EventSimulator = EventSimulator;
