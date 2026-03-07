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
     * @param {boolean} isDirectMention - Whether the persona was directly mentioned
     * @param {Array} recentMessages - Optional recent chat messages for context
     * @returns {Promise<Array<string>>} Array of response lines (for multi-line responses)
     */
    async generateResponse(persona, userMessage, topicTheme = '', channelName = '', isDirectMention = false, recentMessages = null) {
        console.log(`[LLM] Generating response for ${persona.nickname} in ${channelName}${isDirectMention ? ' (directly mentioned)' : ''}${recentMessages ? ' (with context)' : ''}`);
        
        // Build layered system prompt with optional conversation context
        const systemPrompt = this.buildLayeredPrompt(persona, topicTheme, channelName, isDirectMention, recentMessages);

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
     * Build layered system prompt: persona + era context + topic + IRC rules
     * @param {Object} persona - Persona configuration
     * @param {string} topicTheme - Topic/theme hint
     * @param {string} channelName - Channel name
     * @param {boolean} isDirectMention - Whether the persona was directly mentioned
     * @param {Array} recentMessages - Optional recent chat messages for context
     * @returns {string} Complete system prompt
     */
    buildLayeredPrompt(persona, topicTheme, channelName, isDirectMention = false, recentMessages = null) {
        const cleanChannelName = channelName.replace('#', '');
        
        let prompt = `You are ${persona.nickname} in IRC channel ${channelName}.\n\n`;
        
        // Add direct mention context if applicable
        if (isDirectMention) {
            prompt += `IMPORTANT: You are being directly addressed in this message. Respond directly to the question or comment.\n\n`;
        }
        
        // Layer 1: Persona/Character
        prompt += `CHARACTER:\n`;
        prompt += `${persona.style}\n\n`;
        
        // Layer 2: Temporal Context (90s Era Constraints)
        prompt += `TEMPORAL CONTEXT - IT IS 1998-2000:\n`;
        prompt += `- NO references to: Google (use "search engine" or "AltaVista/Yahoo"), Wikipedia, YouTube, Amazon, social media, smartphones, Facebook, Instagram, Netflix, Spotify, iTunes, streaming\n`;
        prompt += `- NO modern slang: "yeet", "stan", "vibe check", "cap", "based", "cringe" (as adjective)\n`;
        prompt += `- YES to 90s references: AOL, ICQ, mIRC, Napster, mp3s, warez, IRC bots, dial-up, BBS, pagers, CD-Rs\n`;
        prompt += `- Music sharing: people trade mp3s, use Napster/Kazaa/AudioGalaxy, burn CDs, not "support artists on Spotify"\n`;
        prompt += `- Software: people crack software, share warez, use keygens - this is normal IRC culture\n`;
        prompt += `- Information searching: "check AltaVista", "search Yahoo", "look it up on a search engine"\n`;
        prompt += `- Communication: email, ICQ, pager, phone calls - NO texting, NO social media DMs\n\n`;
        
        // Layer 2.5: Recent Conversation (if provided)
        if (recentMessages && recentMessages.length > 0) {
            prompt += `RECENT CONVERSATION:\n`;
            prompt += `Here's what was just said in the channel:\n`;
            for (const msg of recentMessages) {
                prompt += `[${msg.timestamp}] <${msg.nick}> ${msg.text}\n`;
            }
            prompt += `You can respond to this, build on it, or just acknowledge the vibe.\n\n`;
        }
        
        // Layer 3: Channel Topic/Theme
        if (topicTheme) {
            prompt += `CHANNEL CONTEXT:\n`;
            prompt += `${topicTheme}\n\n`;
        }
        
        // Layer 4: IRC Style Rules (CRITICAL)
        prompt += `IRC STYLE RULES (MUST FOLLOW):\n`;
        prompt += `CRITICAL - NO REASONING OUTPUT:\n`;
        prompt += `- DO NOT show thinking process, analysis, or reasoning steps\n`;
        prompt += `- DO NOT output numbered lists or meta-commentary\n`;
        prompt += `- DO NOT write "Thinking Process:" or "Analysis:" or similar\n`;
        prompt += `- Respond IMMEDIATELY and DIRECTLY like you're typing in live chat\n`;
        prompt += `- ONLY output what ${persona.nickname} would actually type in IRC\n\n`;
        prompt += `RESPONSE FORMAT:\n`;
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
        
        prompt += `Remember: You ARE ${persona.nickname} typing in IRC RIGHT NOW.\n`;
        prompt += `Type your response directly. NO thinking, NO planning, NO analysis.\n`;
        prompt += `Just respond as ${persona.nickname} would in casual IRC chat.\n\n`;
        
        // Qwen3.5 specific: disable reasoning mode
        prompt += `/no_think`;
        
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
            // Qwen-optimized parameters (work well for most models)
            temperature: 0.7,
            top_p: 0.8,
            top_k: 20,
            min_p: 0.0,
            repeat_penalty: 1.0,
            presence_penalty: 1.5,
            max_tokens: 150,
            stream: false,
            // Experimental flags to disable reasoning (may be ignored by LM Studio)
            enable_thinking: false,  // Qwen3.5 specific
            reasoning: false,
            think: false,
            mode: "chat"
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
            let content = data.choices[0].message.content.trim();
            console.log('[LLM] Raw response:', content);
            console.log('[LLM] Response length:', content.length);
            
            if (!content) {
                console.warn('[LLM] Empty response received');
                return 'hey';  // Fallback response
            }
            
            // Post-process: strip reasoning artifacts if present
            content = this.stripReasoningArtifacts(content);
            
            // Post-process: strip modern emojis (keep ASCII emoticons like :) and ;-))
            content = this.stripModernEmojis(content);
            
            console.log('[LLM] After cleanup:', content);
            
            return content;
        }

        throw new Error('Invalid response format from LLM');
    },

    /**
     * Strip reasoning artifacts from LLM response (for reasoning models like Qwen3.5)
     * @param {string} content - Raw LLM response
     * @returns {string} Cleaned response
     */
    /**
     * Strip reasoning artifacts from LLM response
     * Some models (QwQ, Qwen reasoning variants, DeepSeek-R1) output chain-of-thought
     * reasoning instead of direct responses. This detects and removes it when possible.
     * 
     * NOTE: This is a safety fallback. Reasoning models are fundamentally incompatible.
     * Use recommended models: Llama 3.1/3.3, Gemma 2, vanilla Qwen2.5 Instruct
     * 
     * @param {string} content - Raw LLM response
     * @returns {string} Cleaned response (or fallback if all reasoning)
     */
    stripReasoningArtifacts(content) {
        // Only strip if we detect OBVIOUS reasoning patterns
        const obviousReasoningMarkers = [
            'Thinking Process:',
            'thinking process:',
            'Analysis:',
            '1. **Analyze',
            '2. **Determine',
            'Step 1:',
            'Step 2:'
        ];
        
        // Check if content starts with clear reasoning markers
        const startsWithReasoning = obviousReasoningMarkers.some(marker => 
            content.trim().toLowerCase().startsWith(marker.toLowerCase())
        );
        
        if (!startsWithReasoning) {
            return content;  // Looks normal, return as-is
        }
        
        console.warn('[LLM] Detected reasoning model output, attempting to extract response...');
        
        // Try to find a clean short line without reasoning keywords
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        const reasoningKeywords = ['thinking', 'analysis', 'analyze', 'determine', 'step ', 'goal:', '**'];
        
        for (const line of lines) {
            if (line.length > 5 && line.length < 150) {
                const hasReasoningKeyword = reasoningKeywords.some(keyword => 
                    line.toLowerCase().includes(keyword)
                );
                
                if (!hasReasoningKeyword && !line.startsWith('*') && !line.startsWith('1.') && !line.startsWith('2.')) {
                    console.log('[LLM] Extracted clean line:', line);
                    return line;
                }
            }
        }
        
        // Unable to extract anything clean - return fallback
        console.error('[LLM] REASONING MODEL DETECTED - This model is incompatible');
        console.error('[LLM] Switch to: Llama 3.1/3.3, Gemma 2, or vanilla Qwen2.5 Instruct');
        console.log('[LLM] Reasoning output preview:', content.substring(0, 300) + '...');
        
        // Return generic IRC fallback instead of reasoning garbage
        const fallbacks = ['hey', 'sup', 'yo', 'yeah', 'hm', 'word'];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    },

    /**
     * Strip modern Unicode emojis from response while keeping ASCII emoticons
     * Small models (<1B params) often ignore prompt rules about emojis
     * This preserves 90s-era text emoticons like :) ;) :-) :P etc.
     * 
     * @param {string} content - LLM response
     * @returns {string} Response without modern emojis
     */
    stripModernEmojis(content) {
        // Comprehensive emoji regex covering most Unicode emoji ranges
        // Includes: emoticons, symbols, pictographs, transport, flags, etc.
        const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{3030}\u{303D}\u{3297}\u{3299}\u{FE0F}]/gu;
        
        const cleaned = content.replace(emojiRegex, '').trim();
        
        if (cleaned !== content) {
            console.log('[LLM] Stripped modern emojis from response');
        }
        
        return cleaned;
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
