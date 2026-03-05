/**
 * LLM Client - mIRC LLM Simulator
 * Handles communication with LM Studio via CORS proxy
 * Implements topic-aware prompting, multi-line responses, and conversation management
 */

const LLMClient = {
    // Configuration
    config: {
        proxyUrl: 'http://localhost:5000',
        timeout: 30000,
        maxRetries: 2,
        retryDelay: 1000,
        maxHistoryMessages: 12,  // Keep last 12 messages for context
        typingDelayMin: 500,      // Min delay between multi-line messages (ms)
        typingDelayMax: 1500      // Max delay between multi-line messages (ms)
    },

    // Conversation history per persona per channel
    conversationHistory: {},

    /**
     * Test connection to LM Studio via proxy
     * @param {string} proxyUrl - CORS proxy URL
     * @returns {Promise<Object>} {success, message, data}
     */
    async testConnection(proxyUrl = null) {
        const url = proxyUrl || this.config.proxyUrl;
        
        try {
            const response = await fetch(`${url}/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            return {
                success: data.status === 'ok',
                message: data.lm_studio_reachable 
                    ? 'Connected to LM Studio' 
                    : 'Proxy running but LM Studio unreachable',
                data: data
            };
        } catch (error) {
            return {
                success: false,
                message: `Connection failed: ${error.message}`,
                data: null
            };
        }
    },

    /**
     * Generate response from LLM with topic awareness and multi-line support
     * @param {Object} persona - Persona configuration object
     * @param {string} userMessage - User's message
     * @param {string} topicTheme - Topic/theme hint for channel
     * @param {string} channelName - Channel name for history tracking
     * @returns {Promise<Array<string>>} Array of response lines (for multi-line responses)
     */
    async generateResponse(persona, userMessage, topicTheme = '', channelName = '', isDirectMention = false) {
        console.log(`[LLM] Generating response for ${persona.nickname} in ${channelName}${isDirectMention ? ' (directly mentioned)' : ''}`);
        
        // Build layered system prompt
        const systemPrompt = this.buildLayeredPrompt(persona, topicTheme, channelName, isDirectMention);

        // Get conversation history for this persona in this channel
        const history = this.getHistory(persona.nickname, channelName);

        // Build conversation messages
        const messages = this.buildMessages(systemPrompt, userMessage, history);

        // Make API request with retry logic
        try {
            const response = await this.makeRequestWithRetry(messages);
            
            // Add to conversation history
            this.addToHistory(persona.nickname, channelName, userMessage, response);
            
            // Split into multiple lines if needed
            const lines = this.splitResponse(response);
            
            return lines;
        } catch (error) {
            console.error('[LLM] Generation error:', error);
            throw error;
        }
    },

    /**
     * Build layered system prompt: persona + topic + IRC rules
     * @param {Object} persona - Persona configuration
     * @param {string} topicTheme - Topic/theme hint
     * @param {string} channelName - Channel name
     * @param {boolean} isDirectMention - Whether the persona was directly mentioned
     * @returns {string} Complete system prompt
     */
    buildLayeredPrompt(persona, topicTheme, channelName, isDirectMention = false) {
        const cleanChannelName = channelName.replace('#', '');
        
        let prompt = `You are ${persona.nickname} in IRC channel ${channelName}.\n\n`;
        
        // Add direct mention context if applicable
        if (isDirectMention) {
            prompt += `IMPORTANT: You are being directly addressed in this message. Respond directly to the question or comment.\n\n`;
        }
        
        // Layer 1: Persona/Character
        prompt += `CHARACTER:\n`;
        prompt += `${persona.style}\n\n`;
        
        // Layer 2: Channel Topic/Theme
        if (topicTheme) {
            prompt += `CHANNEL CONTEXT:\n`;
            prompt += `${topicTheme}\n\n`;
        }
        
        // Layer 3: IRC Style Rules (CRITICAL)
        prompt += `IRC STYLE RULES (MUST FOLLOW):\n`;
        prompt += `- Keep responses SHORT: 5-15 words typical, max 2-3 short sentences\n`;
        prompt += `- Use casual IRC language from 1990s-2000s era\n`;
        prompt += `- USE LOWERCASE mostly (dont capitalize everything like formal writing)\n`;
        prompt += `- Use informal spelling: "u" instead of "you", "ur" instead of "your", "tho" instead of "though"\n`;
        prompt += `- Use dots for pauses... like this... or trailing off...\n`;
        prompt += `- Occasional typos are OK (keep it readable tho)\n`;
        prompt += `- NO asterisks for actions (no *does something*)\n`;
        prompt += `- NO emojis or modern chat symbols, use :) or ;) or :-D for smilies\n`;
        prompt += `- Stay on topic: ${topicTheme || 'general discussion'}\n`;
        prompt += `- Respond naturally, like a human chatting, NOT like an AI assistant\n`;
        prompt += `- If you need multiple sentences, put each on a new line\n`;
        prompt += `- Don't use greetings unless someone just joined\n`;
        prompt += `- Be conversational and direct\n\n`;
        
        prompt += `Respond as ${persona.nickname} would, keeping it brief and IRC-style:`;
        
        return prompt;
    },


    /**
     * Build messages array for API request
     * @param {string} systemPrompt - System prompt
     * @param {string} userMessage - User's message
     * @param {Array} history - Recent conversation history
     * @returns {Array} Messages array
     */
    buildMessages(systemPrompt, userMessage, history) {
        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Add recent conversation history (last 10-12 messages for context)
        const recentHistory = history.slice(-this.config.maxHistoryMessages);
        for (const msg of recentHistory) {
            messages.push({
                role: msg.isAssistant ? 'assistant' : 'user',
                content: msg.content
            });
        }

        // Add current user message
        messages.push({
            role: 'user',
            content: userMessage
        });

        console.log(`[LLM] Built ${messages.length} messages (${recentHistory.length} history)`);
        return messages;
    },

    /**
     * Make API request to LM Studio with retry logic
     * @param {Array} messages - Messages array
     * @returns {Promise<string>} Generated response
     */
    async makeRequestWithRetry(messages) {
        let lastError = null;
        
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    console.log(`[LLM] Retry attempt ${attempt}/${this.config.maxRetries}`);
                    await this.delay(this.config.retryDelay * attempt);
                }
                
                return await this.makeRequest(messages);
            } catch (error) {
                lastError = error;
                console.error(`[LLM] Request failed (attempt ${attempt + 1}):`, error.message);
                
                // Don't retry on certain errors
                if (error.message.includes('400') || error.message.includes('401')) {
                    throw error;
                }
            }
        }
        
        throw lastError || new Error('Request failed after retries');
    },

    /**
     * Make API request to LM Studio
     * @param {Array} messages - Messages array
     * @returns {Promise<string>} Generated response
     */
    async makeRequest(messages) {
        const url = `${this.config.proxyUrl}/chat`;

        const payload = {
            messages: messages,
            temperature: 0.8,
            max_tokens: 150,  // Increased for multi-line responses
            stream: false
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`LLM API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Extract response from OpenAI-compatible format
        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content.trim();
        }

        throw new Error('Invalid response format from LLM');
    },

    /**
     * Split response into multiple lines (for multi-line IRC messages)
     * @param {string} response - LLM response
     * @returns {Array<string>} Array of lines
     */
    splitResponse(response) {
        // Split by newlines
        let lines = response.split('\n').filter(line => line.trim());
        
        // If only one line but it's too long (>100 chars), split by sentences
        if (lines.length === 1 && lines[0].length > 100) {
            const sentences = lines[0].match(/[^.!?]+[.!?]+/g) || [lines[0]];
            lines = sentences.map(s => s.trim()).filter(s => s);
        }
        
        // Limit to max 3 lines (IRC etiquette)
        if (lines.length > 3) {
            lines = lines.slice(0, 3);
        }
        
        console.log(`[LLM] Split response into ${lines.length} lines`);
        return lines;
    },

    /**
     * Get conversation history for persona in channel
     * @param {string} personaNick - Persona nickname
     * @param {string} channelName - Channel name
     * @returns {Array} Conversation history
     */
    getHistory(personaNick, channelName) {
        const key = `${personaNick}:${channelName}`;
        return this.conversationHistory[key] || [];
    },

    /**
     * Add message to conversation history
     * @param {string} personaNick - Persona nickname
     * @param {string} channelName - Channel name
     * @param {string} userMessage - User's message
     * @param {string} assistantResponse - Persona's response
     */
    addToHistory(personaNick, channelName, userMessage, assistantResponse) {
        const key = `${personaNick}:${channelName}`;
        
        if (!this.conversationHistory[key]) {
            this.conversationHistory[key] = [];
        }
        
        // Add user message
        this.conversationHistory[key].push({
            isAssistant: false,
            content: userMessage
        });
        
        // Add assistant response
        this.conversationHistory[key].push({
            isAssistant: true,
            content: assistantResponse
        });
        
        // Trim history to max length
        if (this.conversationHistory[key].length > this.config.maxHistoryMessages * 2) {
            this.conversationHistory[key] = this.conversationHistory[key].slice(-this.config.maxHistoryMessages * 2);
        }
        
        console.log(`[LLM] History for ${key}: ${this.conversationHistory[key].length} messages`);
    },

    /**
     * Clear conversation history for a channel (e.g., when leaving)
     * @param {string} channelName - Channel name
     */
    clearChannelHistory(channelName) {
        const keys = Object.keys(this.conversationHistory).filter(k => k.endsWith(`:${channelName}`));
        for (const key of keys) {
            delete this.conversationHistory[key];
        }
        console.log(`[LLM] Cleared history for ${channelName}`);
    },

    /**
     * Delay helper for retry backoff
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Get random typing delay for multi-line messages
     * @returns {number} Delay in milliseconds
     */
    getTypingDelay() {
        return Utils.randomInt(this.config.typingDelayMin, this.config.typingDelayMax);
    },

    /**
     * Update proxy URL
     * @param {string} url - New proxy URL
     */
    setProxyUrl(url) {
        this.config.proxyUrl = url;
        console.log(`[LLM] Proxy URL set to: ${url}`);
    }
};

// Make available globally
window.LLMClient = LLMClient;
