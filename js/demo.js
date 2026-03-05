/**
 * Demo Mode - mIRC LLM Simulator
 * Provides pre-scripted responses for testing without LLM connection
 */

const DemoMode = {
    // Demo responses loaded from JSON
    responses: {},
    
    // Track conversation state
    messageCount: 0,
    lastSpeaker: null,

    /**
     * Initialize demo mode - load demo responses
     */
    async init() {
        try {
            const response = await fetch('demo_responses.json');
            if (!response.ok) {
                throw new Error('Failed to load demo responses');
            }
            this.responses = await response.json();
            console.log('Demo responses loaded:', Object.keys(this.responses).length, 'personas');
        } catch (error) {
            console.error('Error loading demo responses:', error);
            this.responses = this.getDefaultResponses();
        }
    },

    /**
     * Get response from a persona
     * @param {string} personaNick - Persona nickname
     * @param {string} userMessage - User's message
     * @param {string} context - Context type (greeting, response, reaction, idle)
     * @returns {string} Response text
     */
    getResponse(personaNick, userMessage = '', context = 'response') {
        const persona = this.responses[personaNick];
        if (!persona) {
            return this.getGenericResponse(personaNick);
        }

        let pool = [];

        // Select response pool based on context
        if (context === 'greeting' && persona.greetings) {
            pool = persona.greetings;
        } else if (context === 'idle' && persona.idle) {
            pool = persona.idle;
        } else if (context === 'reaction' && persona.reactions) {
            pool = persona.reactions;
        } else if (persona.responses) {
            pool = persona.responses;
        }

        // Fallback to generic if pool is empty
        if (pool.length === 0) {
            return this.getGenericResponse(personaNick);
        }

        // Select response based on message content if available
        if (userMessage && context === 'response') {
            const lowerMsg = userMessage.toLowerCase();
            
            // Simple keyword matching
            if (lowerMsg.includes('hack') || lowerMsg.includes('code')) {
                const techResponses = pool.filter(r => 
                    r.toLowerCase().includes('hack') || 
                    r.toLowerCase().includes('code') ||
                    r.toLowerCase().includes('system')
                );
                if (techResponses.length > 0) {
                    return Utils.randomChoice(techResponses);
                }
            }

            if (lowerMsg.includes('hi') || lowerMsg.includes('hello') || lowerMsg.includes('hey')) {
                if (persona.greetings && persona.greetings.length > 0) {
                    return Utils.randomChoice(persona.greetings);
                }
            }
        }

        return Utils.randomChoice(pool);
    },

    /**
     * Get generic fallback response
     * @param {string} personaNick - Persona nickname
     * @returns {string} Generic response
     */
    getGenericResponse(personaNick) {
        const generic = [
            "interesting...",
            "yeah",
            "uh huh",
            "right",
            "gotcha",
            "makes sense",
            "*nods*",
            "cool",
            "k"
        ];
        return Utils.randomChoice(generic);
    },

    /**
     * Simulate persona generating a response
     * @param {string} personaNick - Persona nickname
     * @param {string} userMessage - User's message
     * @param {string} channelName - Current channel
     * @returns {Promise<string>} Response text with simulated delay
     */
    async simulateResponse(personaNick, userMessage, channelName) {
        // Simulate "typing" delay
        const delay = Utils.randomInt(800, 2500);
        await Utils.sleep(delay);

        this.messageCount++;

        // Determine context
        let context = 'response';
        if (this.messageCount === 1 || !this.lastSpeaker) {
            context = 'greeting';
        } else if (Math.random() < 0.15) {
            context = 'idle';
        } else if (this.lastSpeaker !== personaNick && Math.random() < 0.3) {
            context = 'reaction';
        }

        this.lastSpeaker = personaNick;

        return this.getResponse(personaNick, userMessage, context);
    },

    /**
     * Get random persona to respond
     * @param {Array} availablePersonas - Array of persona nicknames
     * @param {string} excludeNick - Nickname to exclude
     * @returns {string} Selected persona nickname
     */
    selectRespondingPersona(availablePersonas, excludeNick = null) {
        let candidates = availablePersonas.filter(nick => 
            nick !== excludeNick && nick !== this.lastSpeaker
        );

        // If all filtered out, use all except exclude
        if (candidates.length === 0) {
            candidates = availablePersonas.filter(nick => nick !== excludeNick);
        }

        // If still empty, use all
        if (candidates.length === 0) {
            candidates = availablePersonas;
        }

        return Utils.randomChoice(candidates);
    },

    /**
     * Simulate idle chatter
     * @param {Array} personas - Array of persona objects
     * @returns {Object} {nick, message} object
     */
    async simulateIdleChatter(personas) {
        if (!personas || personas.length === 0) return null;

        const persona = Utils.randomChoice(personas);
        const message = this.getResponse(persona.nickname, '', 'idle');

        // Simulate delay
        await Utils.sleep(Utils.randomInt(3000, 8000));

        return {
            nick: persona.nickname,
            message: message
        };
    },

    /**
     * Get default demo responses if JSON loading fails
     * @returns {Object} Default demo responses
     */
    getDefaultResponses() {
        return {
            'ZeroCool': {
                greetings: ["yo", "what's up", "hey"],
                responses: ["lol", "yeah right", "whatever", "cool"],
                reactions: ["heh", "*smirks*", "nice"],
                idle: ["anyone here?", "so quiet", "boring"]
            },
            'AcidBurn': {
                greetings: ["hi", "hello", "hey there"],
                responses: ["seriously?", "that's what you think", "sure"],
                reactions: ["*rolls eyes*", "oh please", "typical"],
                idle: ["where is everyone?", "..."]
            }
        };
    },

    /**
     * Reset demo state
     */
    reset() {
        this.messageCount = 0;
        this.lastSpeaker = null;
    }
};

// Make available globally
window.DemoMode = DemoMode;
