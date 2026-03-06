/**
 * Event Simulator - mIRC LLM Simulator
 * Simulates random IRC events (joins, parts, netsplits, etc.)
 */

const EventSimulator = {
    // Active timers (global events)
    timers: {},
    
    // Per-channel timers
    channelTimers: {},

    // Event configuration
    events: {},

    // Event types classification
    globalEvents: ['quit', 'netsplit', 'kline'],
    channelEvents: ['join', 'part', 'topic_change', 'kick', 'mode', 'idle_chatter'],

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
            if (typeof config !== 'object' || !config.enabled || !config.frequency) continue;
            
            // Only start global events here
            if (this.globalEvents.includes(eventType)) {
                this.startEvent(eventType, config.frequency);
                startedCount++;
                console.log(`[EventSim] Started '${eventType}' global event (freq: ${config.frequency}s)`);
            }
        }
        console.log(`[EventSim] Started ${startedCount} global event timers`);
        console.log(`[EventSim] Channel events will start per-channel when channels are joined`);
    },

    /**
     * Start all channel events for a specific channel
     * @param {string} channel - Channel name
     */
    startChannelEvents(channel) {
        if (!this.channelTimers[channel]) {
            this.channelTimers[channel] = {};
        }

        let startedCount = 0;
        for (const [eventType, config] of Object.entries(this.events)) {
            if (typeof config !== 'object' || !config.enabled || !config.frequency) continue;
            
            // Only start channel events
            if (this.channelEvents.includes(eventType)) {
                this.startChannelEvent(channel, eventType, config.frequency);
                startedCount++;
            }
        }
        console.log(`[EventSim] Started ${startedCount} channel events for ${channel}`);
    },

    /**
     * Start a specific channel event
     * @param {string} channel - Channel name
     * @param {string} eventType - Event type
     * @param {number} frequency - Frequency in seconds
     */
    startChannelEvent(channel, eventType, frequency) {
        // Ensure channel timer storage exists
        if (!this.channelTimers[channel]) {
            this.channelTimers[channel] = {};
        }

        // Clear existing timer if any
        if (this.channelTimers[channel][eventType]) {
            clearInterval(this.channelTimers[channel][eventType]);
        }

        // Skip chance varies by event type
        const skipChance = eventType === 'idle_chatter' ? 0.6 : 0.5;

        // Set up recurring timer
        this.channelTimers[channel][eventType] = setInterval(() => {
            // Random skip chance (makes events feel more natural)
            if (Math.random() > skipChance) return;
            
            this.triggerChannelEvent(eventType, channel);
        }, frequency * 1000);

        console.log(`[EventSim] Timer started for '${eventType}' in ${channel} (every ${frequency}s)`);
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
        // Stop global events
        for (const eventType of Object.keys(this.timers)) {
            this.stopEvent(eventType);
        }
        // Stop all channel events
        for (const channel of Object.keys(this.channelTimers)) {
            this.stopChannelEvents(channel);
        }
    },

    /**
     * Stop all events for a specific channel
     * @param {string} channel - Channel name
     */
    stopChannelEvents(channel) {
        if (!this.channelTimers[channel]) return;

        for (const eventType of Object.keys(this.channelTimers[channel])) {
            clearInterval(this.channelTimers[channel][eventType]);
        }
        delete this.channelTimers[channel];
        console.log(`[EventSim] Stopped all events for ${channel}`);
    },

    /**
     * Trigger a specific global event
     * @param {string} eventType - Event type
     */
    triggerEvent(eventType) {
        console.log(`[EventSim] Trigger attempt (global): ${eventType}`);
        
        // Random chance to skip (makes events feel more natural)
        const skipChance = 0.5; // 50% chance to trigger
        if (Math.random() > skipChance) {
            console.log(`[EventSim] ${eventType} skipped (random)`);
            return;
        }

        console.log(`[EventSim] Executing ${eventType}...`);

        switch (eventType) {
            case 'quit':
                this.simulateQuit();
                break;
            case 'netsplit':
                this.simulateNetsplit();
                break;
            case 'kline':
                this.simulateKline();
                break;
        }
    },

    /**
     * Trigger a specific channel event
     * @param {string} eventType - Event type
     * @param {string} channel - Channel name
     */
    triggerChannelEvent(eventType, channel) {
        console.log(`[EventSim] Executing ${eventType} in ${channel}...`);

        switch (eventType) {
            case 'join':
                this.simulateJoin(channel);
                break;
            case 'part':
                this.simulatePart(channel);
                break;
            case 'topic_change':
                this.simulateTopicChange(channel);
                break;
            case 'kick':
                this.simulateKick(channel);
                break;
            case 'mode':
                this.simulateModeChange(channel);
                break;
            case 'idle_chatter':
                this.simulateIdleChatter(channel);
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
     * Simulate user join (channel-based)
     * @param {string} targetChannel - Target channel
     */
    simulateJoin(targetChannel) {
        if (!targetChannel) {
            console.log(`[EventSim] simulateJoin aborted - no target channel`);
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
     * Simulate user part (channel-based)
     * @param {string} targetChannel - Target channel
     */
    simulatePart(targetChannel) {
        if (!targetChannel) {
            console.log(`[EventSim] simulatePart aborted - no target channel`);
            return;
        }

        // Get lurker names from config
        const lurkerNames = window.App.state.lurkers && window.App.state.lurkers[targetChannel];
        console.log(`[EventSim] simulatePart - ${targetChannel} lurkerNames:`, lurkerNames ? lurkerNames.length : 0);
        
        if (!lurkerNames || lurkerNames.length === 0) {
            console.log(`[EventSim] simulatePart aborted - no lurker names`);
            return;
        }

        const nick = Utils.randomChoice(lurkerNames);
        const partMessages = [
            'later',
            'gotta go',
            'brb',
            'see ya',
            'cya',
            ''  // No message
        ];

        const partMsg = Utils.randomChoice(partMessages);
        const partText = partMsg ? ` (${partMsg})` : '';

        console.log(`[EventSim] ${nick} parting from ${targetChannel}`);

        UI.addMessage({
            type: 'part',
            text: `* ${nick} has left ${targetChannel}${partText}`,
            timestamp: new Date()
        }, targetChannel);
    },

    /**
     * Simulate user quit (GLOBAL - affects ALL channels where user is present)
     */
    simulateQuit() {
        // Get ALL channels
        const channels = this.getRandomChannel() ? Object.keys(window.App.state.channelUsers).filter(ch => ch !== 'Status') : [];
        if (channels.length === 0) {
            console.log(`[EventSim] simulateQuit aborted - no channels`);
            return;
        }

        // Pick a random lurker from a random channel
        const randomChannel = Utils.randomChoice(channels);
        const lurkerNames = window.App.state.lurkers && window.App.state.lurkers[randomChannel];
        
        if (!lurkerNames || lurkerNames.length === 0) {
            console.log(`[EventSim] simulateQuit aborted - no lurker names`);
            return;
        }

        const nick = Utils.randomChoice(lurkerNames);
        const quitMessages = [
            'Ping timeout',
            'Read error: Connection reset by peer',
            'Client Quit',
            'Connection reset by peer',
            'Remote host closed the connection'
        ];

        const quitMsg = Utils.randomChoice(quitMessages);

        // Find ALL channels where this lurker is present
        const channelsWithLurker = [];
        for (const channel of channels) {
            const channelLurkers = window.App.state.lurkers && window.App.state.lurkers[channel];
            if (channelLurkers && channelLurkers.includes(nick)) {
                channelsWithLurker.push(channel);
            }
        }

        if (channelsWithLurker.length === 0) {
            console.log(`[EventSim] ${nick} not found in any channel lurkers`);
            return;
        }

        console.log(`[EventSim] ${nick} quitting from ${channelsWithLurker.length} channels: ${channelsWithLurker.join(', ')}`);

        // Show quit message ONLY in channels where lurker is present
        for (const channel of channelsWithLurker) {
            UI.addMessage({
                type: 'quit',
                text: `* ${nick} has quit IRC (${quitMsg})`,
                timestamp: new Date()
            }, channel);
        }
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
    simulateTopicChange(targetChannel) {
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
     * @param {string} targetChannel - Target channel
     */
    simulateKick(targetChannel) {
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
    simulateModeChange(targetChannel) {
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

        // Pick a random lurker who's actually in the channel
        const channelLurkers = channelUsers.filter(u => 
            lurkerNames.includes(u.nick) && u.nick !== window.Config.state.nickname
        );
        
        if (channelLurkers.length === 0) return;
        
        const targetUser = Utils.randomChoice(channelLurkers);
        const nick = targetUser.nick;
        
        // Choose appropriate mode based on current user state
        let mode;
        if (targetUser.mode === 'operator') {
            // Operator can only be deopped or given voice (no-op)
            mode = Math.random() < 0.3 ? '-o' : '+v';
        } else if (targetUser.mode === 'voice') {
            // Voiced user can be opped, devoiced
            mode = Utils.randomChoice(['+o', '-v']);
        } else {
            // Regular user can be opped or voiced
            mode = Utils.randomChoice(['+o', '+v']);
        }

        // Apply the mode change to the user
        const userIndex = channelUsers.findIndex(u => u.nick === nick);
        if (userIndex !== -1) {
            if (mode === '+o') {
                channelUsers[userIndex].mode = 'operator';
            } else if (mode === '-o') {
                channelUsers[userIndex].mode = null;
            } else if (mode === '+v') {
                // Only set voice if not already an operator
                if (channelUsers[userIndex].mode !== 'operator') {
                    channelUsers[userIndex].mode = 'voice';
                }
            } else if (mode === '-v') {
                // Only remove voice if not an operator
                if (channelUsers[userIndex].mode === 'voice') {
                    channelUsers[userIndex].mode = null;
                }
            }
            
            // Re-render user list to show updated modes
            UI.renderUserList(channelUsers, window.Config.state.nickname, targetChannel);
        }

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
    async simulateIdleChatter(targetChannel) {
        // Use provided channel instead of picking random
        if (!targetChannel) {
            console.log('[EventSim] simulateIdleChatter: no target channel');
            return;
        }

        const activePersonas = window.App.state.activePersonas && window.App.state.activePersonas[targetChannel];
        if (!activePersonas || activePersonas.length === 0) {
            console.log(`[EventSim] simulateIdleChatter: no active personas in ${targetChannel}`);
            return;
        }

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
