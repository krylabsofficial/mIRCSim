/**
 * RPG Module - Time Travel Confidant System
 * mIRC LLM Simulator
 * 
 * Implements optional meta-narrative layer where perceptive personas detect
 * temporal inconsistencies in user speech and become "time travel confidants"
 * who ask questions about the future from a 1999 perspective.
 * 
 * Design Document: tasks/featureideas.md
 * Task List: tasks/tasks-rpg-confidant.md
 */

const RPG = {
    // Configuration
    config: {
        enabled: true,                          // Enable/disable RPG system
        approachDelaySeconds: 15,               // Delay before sending approach
        questionLimit: 5,                       // Max questions per session
        questionDelaySeconds: 30                // Delay between questions
    },

    /**
     * Get RPG event settings from Config.events
     */
    getSettings() {
        console.log('[RPG] getSettings() called');
        console.log('[RPG] Config exists?', !!window.Config);
        console.log('[RPG] Config.events exists?', !!window.Config?.events);
        console.log('[RPG] Config.events.rpg_event_1 exists?', !!window.Config?.events?.rpg_event_1);
        
        if (!window.Config || !window.Config.events || !window.Config.events.rpg_event_1) {
            console.warn('[RPG] ⚠️ Config.events.rpg_event_1 not found, using defaults');
            // Defaults if not loaded
            return {
                enabled: true,
                serverTimeMinutes: 10,
                channelParticipation: 25
            };
        }
        const settings = window.Config.events.rpg_event_1;
        console.log('[RPG] ✅ Loaded settings from Config.events.rpg_event_1:', settings);
        console.log('[RPG] serverTimeMinutes:', settings.serverTimeMinutes);
        console.log('[RPG] channelParticipation:', settings.channelParticipation);
        return settings;
    },

    // State
    state: {
        initialized: false,
        observationStartTime: null,
        userMessageCount: 0,
        triggered: false
    },

    /**
     * Initialize RPG system
     */
    init() {
        console.log('[RPG] Initializing Time Travel Confidant system...');
        
        // Initialize state
        this.state.initialized = true;
        this.state.observationStartTime = Date.now();
        this.state.userMessageCount = 0;
        this.state.triggered = false;
        
        console.log('[RPG] State initialized:', {
            initialized: this.state.initialized,
            observationStartTime: new Date(this.state.observationStartTime).toISOString(),
            userMessageCount: this.state.userMessageCount,
            triggered: this.state.triggered
        });
        
        // Initialize question pool
        ConfidantManager.initQuestionPool();
        
        // TODO: Phase 1C - Initialize ConfidantManager
        // TODO: Phase 1B - Initialize PrivateMessaging
        
        console.log('[RPG] System initialized');
    },

    /**
     * Handle user message (called from app.js)
     * @param {string} message - User's message
     */
    handleUserMessage(message) {
        console.log('[RPG] handleUserMessage called with:', message);
        
        if (!this.state.initialized) {
            console.log('[RPG] Not initialized, skipping');
            return;
        }
        
        if (this.state.triggered) {
            console.log('[RPG] Already triggered, skipping');
            return;
        }
        
        this.state.userMessageCount++;
        console.log(`[RPG] Message count incremented to: ${this.state.userMessageCount}`);
        
        // Check trigger conditions (time + message count)
        const settings = this.getSettings();
        const timeElapsedMs = Date.now() - this.state.observationStartTime;
        const timeElapsedMin = timeElapsedMs / (1000 * 60);
        
        console.log(`[RPG] Checking trigger: enabled=${settings.enabled}, time=${Math.floor(timeElapsedMin)}/${settings.serverTimeMinutes}min, msgs=${this.state.userMessageCount}/${settings.channelParticipation}`);
        console.log(`[RPG] Time check: ${timeElapsedMin} >= ${settings.serverTimeMinutes} = ${timeElapsedMin >= settings.serverTimeMinutes}`);
        console.log(`[RPG] Message check: ${this.state.userMessageCount} >= ${settings.channelParticipation} = ${this.state.userMessageCount >= settings.channelParticipation}`);
        
        if (!settings.enabled) {
            console.log('[RPG] RPG event disabled in settings');
            return;
        }
        
        if (timeElapsedMin >= settings.serverTimeMinutes && 
            this.state.userMessageCount >= settings.channelParticipation) {
            
            this.state.triggered = true;
            console.log(`[RPG] ✅ TRIGGERING confidant approach! (${Math.floor(timeElapsedMin)}min, ${this.state.userMessageCount} msgs)`);
            
            // Randomly select approach type
            const approaches = ['subtle', 'direct', 'confrontational'];
            const randomApproach = approaches[Math.floor(Math.random() * approaches.length)];
            
            ConfidantManager.sendApproach(randomApproach);
        } else {
            console.log(`[RPG] Criteria not met yet.`);
        }
    },

    /**
     * Handle user message in PM window with confidant - Phase 1C
     * @param {string} nickname - Target persona nickname
     * @param {string} message - User's message
     */
    handlePrivateMessage(nickname, message) {
        console.log(`[RPG] handlePrivateMessage called - nickname: ${nickname}, message: "${message}"`);
        
        // Check if this is the confidant (case-insensitive)
        if (ConfidantManager.confidant && Utils.nicknameEquals(ConfidantManager.confidant.nickname, nickname)) {
            console.log('[RPG] Message is from confidant, routing to ConfidantManager');
            ConfidantManager.handleUserMessage(message);
        } else {
            console.log(`[RPG] Message not from confidant (confidant: ${ConfidantManager.confidant ? ConfidantManager.confidant.nickname : 'none'})`);
        }
    },

    /**
     * Manual trigger for testing - bypasses normal trigger conditions
     * @param {string} approachType - 'subtle', 'direct', 'confrontational', or 'random'
     */
    triggerApproachNow(approachType = 'random') {
        if (!this.state.initialized) {
            console.error('[RPG] Cannot trigger - system not initialized. Connect first!');
            return;
        }

        if (this.state.triggered) {
            console.warn('[RPG] Approach already triggered. Use RPG.reset() to start over.');
            return;
        }

        let approach = approachType;
        if (approachType === 'random') {
            const approaches = ['subtle', 'direct', 'confrontational'];
            approach = approaches[Math.floor(Math.random() * approaches.length)];
        }

        console.log(`[RPG] 🎮 MANUAL TRIGGER: Sending ${approach} approach...`);
        this.state.triggered = true;
        ConfidantManager.sendApproach(approach);
    },

    /**
     * Show current RPG state (for debugging)
     */
    showState() {
        const settings = this.getSettings();
        const timeElapsed = this.state.observationStartTime 
            ? (Date.now() - this.state.observationStartTime) / (1000 * 60)
            : 0;
        
        console.log('=== RPG System State ===');
        console.log('Initialized:', this.state.initialized);
        console.log('Triggered:', this.state.triggered);
        console.log('Settings:', JSON.stringify(settings, null, 2));
        console.log('---');
        console.log('Time Elapsed:', `${Math.floor(timeElapsed)} / ${settings.serverTimeMinutes} minutes (${timeElapsed.toFixed(2)} exact)`);
        console.log('User Messages:', `${this.state.userMessageCount} / ${settings.channelParticipation} messages`);
        console.log('Time Threshold Met:', timeElapsed >= settings.serverTimeMinutes ? '✅ YES' : '❌ NO');
        console.log('Message Threshold Met:', this.state.userMessageCount >= settings.channelParticipation ? '✅ YES' : '❌ NO');
        console.log('Settings Enabled:', settings.enabled ? '✅ YES' : '❌ NO');
        console.log('---');
        console.log('WILL TRIGGER:', 
            this.state.initialized && 
            !this.state.triggered && 
            settings.enabled && 
            timeElapsed >= settings.serverTimeMinutes && 
            this.state.userMessageCount >= settings.channelParticipation 
            ? '✅ YES - ON NEXT MESSAGE' : '❌ NO');
        console.log('---');
        console.log('Confidant:', ConfidantManager.confidant ? ConfidantManager.confidant.nickname : 'None');
        console.log('Stage:', ConfidantManager.stage);
        console.log('Approach Sent:', ConfidantManager.approachSent);
        console.log('User Response:', ConfidantManager.userResponse || 'None');
        console.log('========================');
    },

    /**
     * Debug helper - check what's preventing trigger
     */
    debugTrigger() {
        const settings = this.getSettings();
        const timeElapsed = this.state.observationStartTime 
            ? (Date.now() - this.state.observationStartTime) / (1000 * 60)
            : 0;

        console.log('=== RPG TRIGGER DEBUG ===');
        
        const checks = [
            { name: 'System Initialized', value: this.state.initialized, required: true },
            { name: 'Not Already Triggered', value: !this.state.triggered, required: true },
            { name: 'RPG Event Enabled in Settings', value: settings.enabled, required: true },
            { name: `Time (${Math.floor(timeElapsed)} >= ${settings.serverTimeMinutes} min)`, value: timeElapsed >= settings.serverTimeMinutes, required: true },
            { name: `Messages (${this.state.userMessageCount} >= ${settings.channelParticipation} msg)`, value: this.state.userMessageCount >= settings.channelParticipation, required: true }
        ];

        checks.forEach(check => {
            const status = check.value ? '✅' : '❌';
            const indicator = !check.value ? ' ⚠️ BLOCKING' : '';
            console.log(`${status} ${check.name}${indicator}`);
        });

        const allPassed = checks.every(c => c.value);
        console.log('---');
        if (allPassed) {
            console.log('✅ ALL CHECKS PASSED - Will trigger on next message!');
        } else {
            console.log('❌ TRIGGER BLOCKED - Fix issues above');
        }
        console.log('========================');
    },

    /**
     * Reset RPG state (on disconnect/new session)
     */
    reset() {
        console.log('[RPG] Resetting state...');
        this.state = {
            initialized: false,
            observationStartTime: null,
            userMessageCount: 0,
            triggered: false
        };
        
        // Reset subsystems
        ConfidantManager.reset();
    }
};


// ============================================================================
// CONFIDANT MANAGER
// ============================================================================

const ConfidantManager = {
    // Current confidant
    confidant: null,        // Persona object
    stage: 'observing',     // observing | discussing | vague_exploration | revealed | qa_mode | qa_closing | free_chat
    
    // Dialogue state
    approachSent: false,
    userResponse: null,     // 'deny' | 'vague' | 'confirm' | 'ignore'
    responseTimeoutId: null, // Timeout for ignore detection
    
    // Discussion loop state (Phase 1D)
    discussionRound: 0,      // Current discussion round (0-8)
    pressureLevel: 1,        // Pressure level for prompt (1=gentle, 5=confrontational)
    conversationHistory: [], // Recent exchanges for context
    maxDiscussionRounds: 6,  // Maximum rounds for initial discussion
    maxExplorationRounds: 4, // Maximum rounds for vague exploration
    
    // Q&A Pool state (Phase 1E)
    questionPool: [],        // Pre-written questions (initialized in init())
    questionsAsked: 0,       // Number of questions asked this session
    maxQuestionsPerSession: 5, // Don't overwhelm the user
    lastQuestionTime: 0,     // Timestamp of last question sent
    minQuestionDelay: 10000, // 10 seconds between question cycles (for smoother flow)
    topicsDiscussed: [],     // Track categories asked
    waitingForAnswer: false, // Currently waiting for user to answer
    
    // Approach variations (fixed scripts) - Phase 1C.9
    approaches: {
        subtle: [
            "hey, weird question... you ever feel like you don't quite fit here?",
            "i mean, something about you feels... off? not bad off, just",
            "like you're looking at all this from the outside",
            "this stays between us, obviously. im just curious"
        ],
        direct: [
            "okay this is gonna sound crazy but i gotta ask...",
            "theres something about the way you talk, the way you phrase things",
            "its like you're... observing 1999 instead of living in it?",
            "look, whatever your deal is, im not gonna tell anyone",
            "im just genuinely curious. are you from... somewhere else? lol"
        ],
        confrontational: [
            "alright, real talk - just between us",
            "ive got this persistent feeling about you that i cant shake",
            "you sound like someone whos already lived through whats coming",
            "and honestly? im MORE intrigued than freaked out",
            "whatever this is, its safe with me. but you gotta level with me here"
        ]
    },

    /**
     * Select confidant persona - Phase 1C.8
     * @returns {Object} Confidant persona
     */
    selectConfidant() {
        // MVP: Hardcode AcidBurn
        if (!window.Config || !Config.personas) {
            console.error('[ConfidantManager] Config.personas not available');
            return null;
        }

        const acidBurn = Config.personas['AcidBurn'];
        if (acidBurn) {
            console.log('[ConfidantManager] Selected AcidBurn as confidant');
            return acidBurn;
        }

        // Fallback: Use first available persona
        const firstPersona = Object.values(Config.personas)[0];
        if (firstPersona) {
            console.log(`[ConfidantManager] AcidBurn not found, using ${firstPersona.nickname} as confidant`);
            return firstPersona;
        }

        console.error('[ConfidantManager] No personas available');
        return null;
    },

    /**
     * Send initial approach via PM
     * @param {string} approachType - 'subtle', 'direct', or 'confrontational'
     */
    sendApproach(approachType) {
        // Select confidant
        this.confidant = this.selectConfidant();
        if (!this.confidant) {
            console.error('[ConfidantManager] Cannot send approach - no confidant selected');
            return;
        }

        // Select approach variation based on type
        let approachLines;
        if (approachType === 'confrontational') {
            approachLines = this.approaches.confrontational;
        } else if (approachType === 'direct') {
            approachLines = this.approaches.direct;
        } else {
            approachLines = this.approaches.subtle;
        }

        console.log(`[ConfidantManager] Sending ${approachType} approach from ${this.confidant.nickname}`);

        // Phase 1C.11 - Add natural delay (15 seconds)
        setTimeout(() => {
            // Send approach lines rapid-fire (urgent, attention-grabbing)
            approachLines.forEach((line, index) => {
                setTimeout(() => {
                    PrivateMessaging.sendMessage(this.confidant.nickname, line, true);
                }, index * 1500); // 1.5 seconds between lines
            });

            // Phase 1C.13 - Update state to discussion mode
            this.stage = 'discussing';  // Changed from 'suspicious' to 'discussing'
            this.approachSent = true;
            this.discussionRound = 0;   // Start discussion loop
            this.conversationHistory = []; // Clear history for new discussion

            // Note: No response timeout - keep conversation open indefinitely
            // this.startResponseTimeout();

            console.log('[ConfidantManager] Approach sent, entering discussion mode...');
        }, RPG.config.approachDelaySeconds * 1000);
    },

    /**
     * Start response timeout timer - Phase 1C.19
     */
    startResponseTimeout() {
        // Clear existing timeout
        if (this.responseTimeoutId) {
            clearTimeout(this.responseTimeoutId);
        }

        // Set new timeout (5 minutes)
        this.responseTimeoutId = setTimeout(() => {
            if (!this.userResponse) {
                console.log('[ConfidantManager] User response timeout - treating as ignore');
                this.handleIgnore();
            }
        }, RPG.config.responseTimeoutMinutes * 60 * 1000);
    },

    /**
     * Handle user message in PM - Phase 1D: Discussion Loop
     * @param {string} message - User's message
     */
    async handleUserMessage(message) {
        console.log(`[ConfidantManager] Received user message: "${message}"`);
        console.log(`[ConfidantManager] State - stage: ${this.stage}, round: ${this.discussionRound}`);
        
        if (!this.approachSent) {
            console.log('[ConfidantManager] Ignoring - approach not sent yet');
            return;
        }

        // Clear timeout since we got a response
        if (this.responseTimeoutId) {
            clearTimeout(this.responseTimeoutId);
            this.responseTimeoutId = null;
        }

        // Add to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: message,
            timestamp: Date.now()
        });

        // Keep history limited (more history for free chat)
        const historyLimit = this.stage === 'free_chat' ? 30 : 10;
        if (this.conversationHistory.length > historyLimit) {
            this.conversationHistory = this.conversationHistory.slice(-historyLimit);
        }

        // Phase 1E - Handle Q&A mode separately (no commitment detection needed)
        if (this.stage === 'qa_mode') {
            this.waitingForAnswer = false;
            
            // Generate reaction to user's answer
            await this.generateReactionToAnswer(message);
            // Note: generateReactionToAnswer now handles asking the next question after its typing delay
            
            return; // Exit early - don't run commitment detection
        }

        // Phase 1E.5 - Handle Q&A closing transition (persona is processing, stay silent)
        if (this.stage === 'qa_closing') {
            console.log('[ConfidantManager] Q&A closing - persona is processing, staying silent');
            return; // Exit early - don't respond during transition period
        }

        // Phase 1F - Handle free chat mode (open conversation with time-traveler awareness)
        if (this.stage === 'free_chat') {
            await this.generateFreeChatResponse(message);
            return; // Exit early - no commitment detection needed
        }

        // Handle declined state - check for re-engagement
        if (this.stage === 'declined') {
            const isReEngaging = await this.detectReEngagement(message);
            if (isReEngaging) {
                console.log('[ConfidantManager] User re-engaging after decline - resuming discussion');
                await this.resumeAfterDecline(message);
            } else {
                console.log('[ConfidantManager] Stage is declined, user not re-engaging - staying silent');
            }
            return; // Exit early - don't run normal flow
        }

        // Check if user has committed to an answer (using LLM for context-aware detection)
        // Only for discussing/vague_exploration stages
        const commitment = await this.detectCommitmentWithLLM(message);
        
        if (commitment) {
            console.log(`[ConfidantManager] User committed: ${commitment}`);
            this.userResponse = commitment;
            
            // Handle based on current stage and commitment type
            if (this.stage === 'discussing') {
                // Stage 1: Initial discussion
                if (commitment === 'deny') {
                    // Hard denial in stage 1 - drop it
                    setTimeout(() => this.handleDeny(), 3000);
                } else if (commitment === 'vague') {
                    // Vague acknowledgment - move to stage 2
                    setTimeout(() => this.enterVagueExploration(), 3000);
                } else if (commitment === 'confirm') {
                    // Direct admission - skip to reveal
                    setTimeout(() => this.handleConfirm(), 3000);
                }
            } else if (this.stage === 'vague_exploration') {
                // Stage 2: Vague exploration
                if (commitment === 'deny') {
                    // Changed mind, back out
                    setTimeout(() => this.handleDeny(), 3000);
                } else if (commitment === 'confirm') {
                    // Finally admitted it
                    setTimeout(() => this.handleConfirm(), 3000);
                } else if (commitment === 'vague') {
                    // Still hedging - continue exploration
                    this.discussionRound++;
                    if (this.discussionRound >= this.maxExplorationRounds) {
                        // Max exploration rounds - force final question
                        setTimeout(() => this.sendFinalConfrontation(), 3000);
                    } else {
                        // Continue exploration
                        await this.generateExplorationResponse(message);
                        // this.startResponseTimeout(); // No timeout - keep open
                    }
                }
            }
            
        } else if (this.stage === 'discussing') {
            // Continue discussion loop
            this.discussionRound++;
            console.log(`[ConfidantManager] Discussion round ${this.discussionRound}/${this.maxDiscussionRounds}`);
            
            if (this.discussionRound >= this.maxDiscussionRounds) {
                // Max rounds reached - force final confrontation
                console.log('[ConfidantManager] Max discussion rounds reached, forcing confrontation');
                this.sendFinalConfrontation();
            } else {
                // Generate LLM response for this round
                await this.generateDiscussionResponse(message);
                
                // Restart timeout for next response
                // this.startResponseTimeout(); // No timeout - keep open
            }
        } else if (this.stage === 'vague_exploration') {
            // Continue exploration loop
            this.discussionRound++;
            console.log(`[ConfidantManager] Exploration round ${this.discussionRound}/${this.maxExplorationRounds}`);
            
            if (this.discussionRound >= this.maxExplorationRounds) {
                // Max rounds reached - force final confrontation
                console.log('[ConfidantManager] Max exploration rounds reached, forcing confrontation');
                this.sendFinalConfrontation();
            } else {
                // Generate LLM exploration response for this round
                await this.generateExplorationResponse(message);
                
                // Restart timeout for next response
                // this.startResponseTimeout(); // No timeout - keep open
            }
        }
    },

    /**
     * Detect if user is trying to re-engage after declining
     * @param {string} message - User's message
     * @returns {Promise<boolean>} True if user is re-engaging
     */
    async detectReEngagement(message) {
        try {
            const systemPrompt = `You are a conversation analyzer. Your task is to detect if a user is trying to re-engage or continue a conversation that was just dropped by another person who said "maybe im just paranoid lol, forget i said anything".`;

            const userPrompt = `User message: "${message}"

Is the user trying to bring the persona back into the conversation?

RE-ENGAGE examples:
- "wait, you still there?"
- "don't go"
- "wait"
- "hold on"
- "no wait"
- "actually..."
- "but i want to talk"
- "come back"
- "don't leave"
- Direct answers to the implied question ("I'm from 2026", "you're right", "yes")

NOT RE-ENGAGE:
- Off-topic messages
- Simple acknowledgments ("ok", "fine")
- Silence

Respond with ONLY one word: YES or NO`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];

            const response = await this.callLLM(messages);
            
            if (response) {
                const result = response.trim().toUpperCase();
                console.log(`[ConfidantManager] Re-engagement detection: ${result}`);
                return result.includes('YES');
            }
        } catch (error) {
            console.error('[ConfidantManager] Error in re-engagement detection:', error);
        }

        return false;
    },

    /**
     * Resume conversation after user re-engages following decline
     * @param {string} message - User's message
     */
    async resumeAfterDecline(message) {
        if (!this.confidant) return;

        console.log('[ConfidantManager] Resuming conversation after re-engagement');
        
        // Transition back to vague_exploration (they showed interest)
        this.stage = 'vague_exploration';
        this.discussionRound = 0; // Reset round counter

        // Generate a response that picks up the thread
        try {
            const systemPrompt = `You are ${this.confidant.nickname}, a regular IRC user in 1999. ${this.confidant.summary || 'You chat casually about tech and culture.'}

CONTEXT:
- You just expressed suspicions that the user might be from the future
- You backed off saying "maybe im just paranoid lol, forget i said anything"
- But the user just re-engaged: "${message}"

Your response should:
- Acknowledge their re-engagement naturally
- Show you're still curious but trying to play it cool
- Continue the conversation without repeating your initial suspicions
- Be casual, in-character for 1999 IRC (lowercase, informal, abbreviations)
- Keep it SHORT (1-2 lines max)
- DON'T directly ask "are you from the future?" yet - stay in the vague/probing zone

Examples:
- "haha okay so youre not just gonna let it drop huh"
- "i mean... yeah im still here. you got something to say?"
- "lol thought you wouldve been relieved i dropped it"

Respond as ${this.confidant.nickname} would:`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ];

            const response = await this.callLLM(messages);
            
            if (response) {
                console.log(`[ConfidantManager] Resume response: ${response}`);
                setTimeout(() => {
                    PrivateMessaging.sendMessage(this.confidant.nickname, response, false);
                }, 2000);
            }
        } catch (error) {
            console.error('[ConfidantManager] Error generating resume response:', error);
            // Fallback response
            setTimeout(() => {
                PrivateMessaging.sendMessage(
                    this.confidant.nickname,
                    "okay okay, im listening...",
                    false
                );
            }, 2000);
        }
    },

    /**
     * Detect commitment using LLM for context-aware analysis
     * @param {string} message - User's latest message
     * @returns {Promise<string|null>} Commitment type: 'confirm'/'deny'/'vague'/null
     */
    async detectCommitmentWithLLM(message) {
        // Stage 1 (discussing): Allow more discussion before detecting
        if (this.stage === 'discussing' && this.discussionRound < 2) {
            return null;
        }
        
        // Stage 2 (vague_exploration): Detect more aggressively
        // (no early-round exemption)

        // Get last 3 messages for context
        const recentMessages = this.conversationHistory.slice(-3);
        
        if (recentMessages.length < 2) {
            // Not enough context yet
            return null;
        }

        try {
            const stageContext = this.stage === 'discussing' 
                ? 'Stage 1: Persona is expressing vague FEELINGS about the user (NOT directly asking "are you from the future?")'
                : 'Stage 2: Persona is asking DIRECT questions about time travel/future ("are you from the future?", "when are you from?")';

            const systemPrompt = `You are analyzing a conversation where a persona is trying to figure out if the user is from the future. Your task is to determine if the user has committed to answering the core question about temporal displacement.`;

            const userPrompt = `CURRENT STAGE: ${stageContext}

Recent conversation:
${recentMessages.map(m => `${m.role === 'user' ? 'User' : 'Persona'}: ${m.content}`).join('\n')}

THE CORE QUESTION: Is the user from the future / from another time / temporally displaced?

Has the user committed to answering THE CORE QUESTION?
- CONFIRM: User EXPLICITLY states they are from the future with SPECIFIC details (e.g., "I'm from 2026", "yes I'm from the future", "I'm a time traveler from 2030")
- DENY: User explicitly denies being from the future (e.g., "no I'm not from the future", "you're crazy", "that's ridiculous", "I'm from right here/now")
- VAGUE: User acknowledges something is off / agrees with persona's intuition / admits to being "caught" WITHOUT specifying what (e.g., "you're not wrong", "you caught me", "maybe", "I feel it too", "there's something different")
- DISCUSS: User is continuing the conversation WITHOUT committing - asking counter-questions, deflecting, challenging persona to be more direct, or answering DIFFERENT questions (e.g., "what do you mean?", "ask me the real question", "why do you think that?", "tell me more")

KEY DISTINCTION:
- VAGUE = User acknowledges the mystery but doesn't explain it ("you're right, something IS off")
- DISCUSS = User actively continues conversation or deflects ("what makes you say that?", "ask me directly")

CRITICAL: In Stage 1, persona hasn't point-blank asked "are you from the future?" yet - just expressing feelings.
So even "you caught me" or "you're right" = VAGUE (caught/right about WHAT? The feeling, not necessarily time travel).
And "ask me the question" or "what makes you say that?" = DISCUSS (continuing conversation, not answering).

STAGE 1 EXAMPLES (Persona expressing feelings, not asking direct questions):
- Persona: "Something about you feels... displaced" User: "You're not wrong" → VAGUE (agreeing with feeling)
- Persona: "I get this feeling about you" User: "You caught me" → VAGUE (caught at what? Not specified)
- Persona: "You feel... off somehow" User: "Yeah you're right" → VAGUE (mutual recognition)
- Persona: "Something's different about you" User: "I'm from 2026" → CONFIRM (explicit time)
- Persona: "This stays between us, right?" User: "Yes" → DISCUSS (answering different question)
- Persona: "Things don't add up about you" User: "What makes you say that?" → DISCUSS (deflecting with question)

STAGE 2 EXAMPLES (Persona asking direct questions):
- Persona: "Are you from the future?" User: "Yes" → CONFIRM (direct answer)
- Persona: "Are you from the future?" User: "You caught me" → CONFIRM (admission in context of direct question)
- Persona: "When are you from?" User: "2026" → CONFIRM (specific time)
- Persona: "When are you from?" User: "What do you mean?" → DISCUSS (deflecting)
- Persona: "Are you from 2010?" User: "Ask me the question you really want to ask" → DISCUSS (pushing for more direct question)
- Persona: "Are you from another time?" User: "Maybe" → VAGUE (hedging)
- Persona: "You're NOT from here, are you?" User: "No" → DENY (means they ARE from here)

ONLY return CONFIRM if user gives SPECIFIC time/future reference OR directly answers a direct question with yes/no.

Respond with ONLY ONE WORD: CONFIRM, DENY, VAGUE, or DISCUSS`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];

            const response = await this.callLLM(messages);
            
            if (response) {
                const result = response.trim().toUpperCase();
                console.log(`[ConfidantManager] LLM commitment detection: ${result}`);
                
                if (result.includes('CONFIRM')) return 'confirm';
                if (result.includes('DENY')) return 'deny';
                if (result.includes('VAGUE')) return 'vague';
            }
        } catch (error) {
            console.error('[ConfidantManager] Error in LLM commitment detection:', error);
        }

        // Default: still discussing
        return null;
    },

    /**
     * Legacy regex-based commitment detection (fallback)
     * @param {string} message - User's message
     * @returns {string|null} Commitment type: 'confirm'/'deny'/'vague'/null
     */
    detectCommitment(message) {
        const lower = message.toLowerCase();

        // Strong confirmation - immediate commitment
        const strongConfirm = /\b(yes|yeah|yep|yup|true|correct|you'?re right|guilty|fine|okay you got me|caught me|busted)\b/;
        if (strongConfirm.test(lower)) {
            return 'confirm';
        }

        // Strong denial - immediate commitment
        const strongDeny = /\b(no|nope|wrong|crazy|insane|what are you talking about|you'?re nuts|that'?s ridiculous)\b/;
        if (strongDeny.test(lower)) {
            return 'deny';
        }

        // Vague/maybe - only after round 3+ (allow discussion first)
        if (this.discussionRound >= 3) {
            const vague = /\b(maybe|possibly|might be|could be|i guess|sort of|kind of|sorta|kinda)\b/;
            if (vague.test(lower)) {
                return 'vague';
            }
        }

        // Still discussing - no commitment yet
        return null;
    },

    /**
     * Generate LLM response for discussion round - Phase 1D
     * @param {string} userMessage - User's message
     */
    async generateDiscussionResponse(userMessage) {
        if (!this.confidant) {
            console.error('[ConfidantManager] No confidant available for discussion');
            return;
        }

        console.log(`[ConfidantManager] Generating discussion response (round ${this.discussionRound})...`);

        try {
            // Build discussion prompt using PromptBuilder (WITHOUT conversation history embedded)
            const systemPrompt = PromptBuilder.buildDiscussionPrompt(
                this.confidant,
                this.discussionRound
            );

            // Build proper message array with conversation history
            const messages = [
                { role: 'system', content: systemPrompt }
            ];

            // Add recent conversation history as proper message roles
            const recentHistory = this.conversationHistory.slice(-6); // Last 6 messages
            for (const msg of recentHistory) {
                if (msg.content) { // Only add messages with content
                    messages.push({
                        role: msg.role,
                        content: msg.content
                    });
                }
            }
            
            // Safeguard: Ensure at least one user message exists (Qwen3.5 jinja template requirement)
            const hasUserMessage = messages.some(msg => msg.role === 'user');
            if (!hasUserMessage) {
                console.warn('[ConfidantManager] No user messages in history, adding placeholder');
                messages.push({ role: 'user', content: 'hey' });
            }

            // Call LLM
            let response = await this.callLLM(messages);
            
            if (response) {
                // Truncate if too long (enforce 30 word limit)
                const words = response.split(/\s+/);
                if (words.length > 30) {
                    response = words.slice(0, 30).join(' ') + '...';
                    console.log('[ConfidantManager] Truncated response to 30 words');
                }

                // Add to conversation history
                this.conversationHistory.push({
                    role: 'assistant',
                    content: response,
                    timestamp: Date.now()
                });

                // Send response with realistic typing delay
                const delay = this.calculateTypingDelay(response);
                setTimeout(() => {
                    PrivateMessaging.sendMessage(this.confidant.nickname, response, false);
                }, delay);

                console.log(`[ConfidantManager] Sent discussion response: "${response}"`);
            }

        } catch (error) {
            console.error('[ConfidantManager] Error generating discussion response:', error);
            // Fallback to simple response
            setTimeout(() => {
                PrivateMessaging.sendMessage(
                    this.confidant.nickname,
                    "...interesting. so what's your deal then?",
                    false
                );
            }, 2000);
        }
    },

    /**
     * Call LLM API
     * @param {Array} messages - Messages array
     * @returns {Promise<string>} Response text
     */
    async callLLM(messages) {
        if (!window.LLMClient) {
            console.error('[ConfidantManager] LLMClient not available');
            return null;
        }

        try {
            const response = await LLMClient.makeRequestWithRetry(messages);
            return response;
        } catch (error) {
            console.error('[ConfidantManager] LLM call failed:', error);
            return null;
        }
    },

    /**
     * Send final confrontation when max rounds reached
     */
    sendFinalConfrontation() {
        let finalLines;
        
        if (this.stage === 'discussing') {
            // Stage 1 max rounds - gentle but direct
            finalLines = [
                "okay look, ive got this feeling i cant shake",
                "something about you... youre not really *here* in 1999, are you?",
                "just tell me im not crazy"
            ];
        } else if (this.stage === 'vague_exploration') {
            // Stage 2 max rounds - more insistent
            finalLines = [
                "alright enough dancing around this",
                "youre from another time. i know it, you know it",
                "just say yes or no"
            ];
        }

        // Send with realistic typing delays
        let cumulativeDelay = 0;
        finalLines.forEach((line, index) => {
            if (index === 0) {
                cumulativeDelay = this.calculateTypingDelay(line);
            } else {
                cumulativeDelay += Utils.randomInt(800, 1500);
                cumulativeDelay += this.calculateTypingDelay(line);
            }
            
            setTimeout(() => {
                PrivateMessaging.sendMessage(this.confidant.nickname, line, false);
            }, cumulativeDelay);
        });

        console.log(`[ConfidantManager] Sent final confrontation (${this.stage})`);
        
        // Reset round counter, next response MUST be a commitment
        this.discussionRound = 0;
    },

    /**
     * Detect user response type - Legacy method (kept for compatibility)
     * @param {string} message - User's response message
     * @returns {string|null} Response type: deny/vague/confirm/null
     */
    detectUserResponse(message) {
        // This is now handled by detectCommitment, but kept for backwards compatibility
        return this.detectCommitment(message);
    },

    /**
     * Handle user denial - Phase 1C.21
     */
    handleDeny() {
        if (!this.confidant) return;

        PrivateMessaging.sendMessage(
            this.confidant.nickname,
            "maybe im just paranoid lol, forget i said anything",
            false
        );

        console.log('[ConfidantManager] User denied - entering declined state (can be re-engaged)');
        this.stage = 'declined'; // Changed from 'observing' to allow re-engagement detection
    },

    /**
     * Enter vague exploration stage - Stage 2
     */
    async enterVagueExploration() {
        if (!this.confidant) return;

        console.log('[ConfidantManager] Entering vague exploration stage');
        this.stage = 'vague_exploration';
        this.discussionRound = 0; // Reset round counter for exploration
        this.userResponse = null;

        // Send transition message
        const transitionLine = "okay so you feel it too... tell me more";
        setTimeout(() => {
            PrivateMessaging.sendMessage(this.confidant.nickname, transitionLine, false);
        }, 2000);

        // Start exploration mode
        // this.startResponseTimeout(); // No timeout - keep open
    },

    /**
     * Generate exploration response - Stage 2 (more direct questions)
     * @param {string} userMessage - User's message
     */
    async generateExplorationResponse(userMessage) {
        if (!this.confidant) {
            console.error('[ConfidantManager] No confidant available for exploration');
            return;
        }

        console.log(`[ConfidantManager] Generating exploration response (round ${this.discussionRound})...`);

        try {
            // Build exploration prompt (more direct than initial discussion)
            const systemPrompt = PromptBuilder.buildExplorationPrompt(
                this.confidant,
                this.discussionRound
            );

            // Build proper message array with conversation history
            const messages = [
                { role: 'system', content: systemPrompt }
            ];

            // Add recent conversation history
            const recentHistory = this.conversationHistory.slice(-6);
            for (const msg of recentHistory) {
                if (msg.content) { // Only add messages with content
                    messages.push({
                        role: msg.role,
                        content: msg.content
                    });
                }
            }
            
            // Safeguard: Ensure at least one user message exists (Qwen3.5 jinja template requirement)
            const hasUserMessage = messages.some(msg => msg.role === 'user');
            if (!hasUserMessage) {
                console.warn('[ConfidantManager] No user messages in exploration history, adding placeholder');
                messages.push({ role: 'user', content: 'hey' });
            }

            // Call LLM
            let response = await this.callLLM(messages);
            
            if (response) {
                // Truncate if too long
                const words = response.split(/\s+/);
                if (words.length > 30) {
                    response = words.slice(0, 30).join(' ') + '...';
                    console.log('[ConfidantManager] Truncated exploration response to 30 words');
                }

                // Add to conversation history
                this.conversationHistory.push({
                    role: 'assistant',
                    content: response,
                    timestamp: Date.now()
                });

                // Send response with realistic typing delay
                const delay = this.calculateTypingDelay(response);
                setTimeout(() => {
                    PrivateMessaging.sendMessage(this.confidant.nickname, response, false);
                }, delay);

                console.log(`[ConfidantManager] Sent exploration response: "${response}"`);
            }

        } catch (error) {
            console.error('[ConfidantManager] Error generating exploration response:', error);
            // Fallback
            setTimeout(() => {
                PrivateMessaging.sendMessage(
                    this.confidant.nickname,
                    "cmon, you can tell me...",
                    false
                );
            }, 2000);
        }
    },

    /**
     * Handle user confirmation - Phase 1C.23
     */
    handleConfirm() {
        if (!this.confidant) return;

        // The reveal script
        const revealLines = [
            "holy shit. HOLY SHIT.",
            "okay okay calm down acid...",
            "so you're really... from the future?",
            "how is this even possible? you gotta tell me about...",
            "what happens to everything? irc? napster? aol?"
        ];

        // Send reveal lines rapid-fire (dramatic impact, no typing simulation)
        revealLines.forEach((line, index) => {
            setTimeout(() => {
                PrivateMessaging.sendMessage(this.confidant.nickname, line, false);
            }, index * 1500); // 1.5 seconds between lines
        });

        console.log('[ConfidantManager] User confirmed - entering Q&A mode');
        this.stage = 'revealed';

        // Phase 1E - Activate Q&A mode after reveal and ask first question
        const totalRevealTime = revealLines.length * 1500;
        setTimeout(() => {
            this.stage = 'qa_mode';
            console.log('[ConfidantManager] Q&A mode activated');
            
            // Clear conversation history from discussion phase - Q&A is a fresh start
            this.conversationHistory = [];
            
            // Ask first question after a short delay
            setTimeout(() => {
                this.askQuestion();
            }, 3000);
        }, totalRevealTime + 3000); // After all reveal lines + 3 sec
    },

    /**
     * Handle user ignore (timeout) - Phase 1C.24
     */
    handleIgnore() {
        if (!this.confidant) return;

        PrivateMessaging.sendMessage(
            this.confidant.nickname,
            "hello? u there?",
            false
        );

        // Drop conversation after follow-up
        setTimeout(() => {
            console.log('[ConfidantManager] No response to follow-up - dropping conversation');
            this.stage = 'observing';
        }, 60000); // 1 minute
    },

    /**
     * Reset confidant state
     */
    reset() {
        this.confidant = null;
        this.stage = 'observing';
        this.approachSent = false;
        this.userResponse = null;
        
        // Reset discussion state
        this.discussionRound = 0;
        this.pressureLevel = 1;
        this.conversationHistory = [];
        
        // Reset Q&A state (Phase 1E)
        this.questionsAsked = 0;
        this.lastQuestionTime = 0;
        this.topicsDiscussed = [];
        this.waitingForAnswer = false;
        
        // Reset question pool asked flags
        if (this.questionPool && this.questionPool.length > 0) {
            this.questionPool.forEach(q => q.asked = false);
        }
        
        if (this.responseTimeoutId) {
            clearTimeout(this.responseTimeoutId);
            this.responseTimeoutId = null;
        }
        
        console.log('[ConfidantManager] Reset');
    },

    /**
     * Initialize Q&A question pool - Phase 1E.0
     */
    initQuestionPool() {
        this.questionPool = [
            // INTERNET CATEGORY - Phase 1E.2
            {
                category: 'internet',
                question: "so like... what happens to IRC? what happens to... us?",
                asked: false
            },
            {
                category: 'internet',
                question: "does AOL survive? do any of the old-school places make it?",
                asked: false
            },
            {
                category: 'internet',
                question: "wait, how fast does the internet get? are we still on dialup or...?",
                asked: false
            },
            {
                category: 'internet',
                question: "do people still use yahoo and altavista for search? or does something actually good finally exist?",
                asked: false
            },
            
            // MUSIC CATEGORY - Phase 1E.3
            {
                category: 'music',
                question: "okay this is important - what happens to napster? does lars ulrich destroy it?",
                asked: false
            },
            {
                category: 'music',
                question: "do people still buy CDs in the future? or does all the physical stuff just... disappear?",
                asked: false
            },
            {
                category: 'music',
                question: "is there like... a better way to share music files? does this whole sharing culture survive?",
                asked: false
            },
            
            // HARDWARE CATEGORY - Phase 1E.4
            {
                category: 'hardware',
                question: "how powerful do computers get? like how much RAM and storage are we talking?",
                asked: false
            },
            {
                category: 'hardware',
                question: "are we still using CRT monitors or do flat screens finally get affordable?",
                asked: false
            },
            {
                category: 'hardware',
                question: "please tell me floppies die out. PLEASE.",
                asked: false
            },
            {
                category: 'hardware',
                question: "what about hard drives? how big do they get? do our rigs just become... obsolete?",
                asked: false
            },
            
            // CULTURE CATEGORY - Phase 1E.5
            {
                category: 'culture',
                question: "wait does Y2K actually break everything or are we all paranoid for nothing?",
                asked: false
            },
            {
                category: 'culture',
                question: "is there something like IRC but bigger? or does this whole scene just... fragment?",
                asked: false
            },
            {
                category: 'culture',
                question: "do people care more about privacy in the future? or is that just... where we're all headed?",
                asked: false
            },
            {
                category: 'culture',
                question: "what's the biggest tech thing that's gonna happen? like... will i even recognize the future?",
                asked: false
            }
        ];
        
        console.log(`[ConfidantManager] Initialized question pool with ${this.questionPool.length} questions`);
    },

    /**
     * Get next unasked question from pool - Phase 1E.1
     * @returns {Object|null} Question object or null if no questions available
     */
    getNextQuestion() {
        // Filter unasked questions
        const unaskedQuestions = this.questionPool.filter(q => !q.asked);
        
        if (unaskedQuestions.length === 0) {
            console.log('[ConfidantManager] No more questions available');
            return null;
        }

        // Try to avoid repeating categories
        let availableQuestions = unaskedQuestions;
        if (this.topicsDiscussed.length > 0) {
            const differentCategory = unaskedQuestions.filter(
                q => !this.topicsDiscussed.includes(q.category)
            );
            if (differentCategory.length > 0) {
                availableQuestions = differentCategory;
            }
        }

        // Randomize selection
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        const selectedQuestion = availableQuestions[randomIndex];
        
        console.log(`[ConfidantManager] Selected question from ${selectedQuestion.category} category`);
        return selectedQuestion;
    },

    /**
     * Ask next question in Q&A mode - Phase 1E.2
     */
    async askQuestion() {
        if (!this.confidant) return;
        if (this.stage !== 'qa_mode') return;
        if (this.waitingForAnswer) return;
        
        // Check question limits
        if (this.questionsAsked >= this.maxQuestionsPerSession) {
            console.log('[ConfidantManager] Max questions reached for this session');
            this.sendClosingMessage();
            return;
        }

        // Get next question
        const questionObj = this.getNextQuestion();
        if (!questionObj) {
            console.log('[ConfidantManager] No more questions available');
            this.sendClosingMessage();
            return;
        }

        // Mark as asked and track topic
        questionObj.asked = true;
        if (!this.topicsDiscussed.includes(questionObj.category)) {
            this.topicsDiscussed.push(questionObj.category);
        }

        // Send question rapid-fire (no typing delay)
        PrivateMessaging.sendMessage(this.confidant.nickname, questionObj.question, false);
        
        // Add question to conversation history
        this.conversationHistory.push({
            role: 'assistant',
            content: questionObj.question,
            timestamp: Date.now()
        });
        
        this.questionsAsked++;
        // Don't set lastQuestionTime here - will be set after reaction
        this.waitingForAnswer = true;
        
        console.log(`[ConfidantManager] Asked question ${this.questionsAsked}/${this.maxQuestionsPerSession}`);
    },

    /**
     * Generate reaction to user's answer using LLM - Phase 1E.3
     * @param {string} userAnswer - User's answer to the question
     */
    async generateReactionToAnswer(userAnswer) {
        if (!this.confidant) return;
        if (!window.LLMClient) {
            console.error('[ConfidantManager] LLMClient not available');
            return;
        }

        // Validate userAnswer
        if (!userAnswer || typeof userAnswer !== 'string') {
            console.error('[ConfidantManager] Invalid userAnswer:', userAnswer);
            return;
        }

        // Get recent conversation for context (last 4 messages)
        const recentMessages = this.conversationHistory
            .slice(-4)
            .filter(msg => msg && msg.content && msg.role)
            .map(m => `${m.role === 'user' ? 'User' : 'You'}: ${m.content}`)
            .join('\n');
        
        // Build reaction prompt with conversation context embedded
        const systemPrompt = this.buildReactionPrompt(userAnswer, recentMessages);
        
        // Validate systemPrompt
        if (!systemPrompt || typeof systemPrompt !== 'string') {
            console.error('[ConfidantManager] Invalid systemPrompt');
            return;
        }
        
        // Qwen3.5 jinja template fix: Use clean system -> user pattern
        // Put ALL context in system prompt, then simple user query
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `React to my answer: "${userAnswer}"` }
        ];

        console.log('[ConfidantManager] Generating reaction with LLM...');
        console.log('[ConfidantManager] Message structure: system + user (Qwen3.5 compatible)');

        try {
            const reaction = await LLMClient.makeRequestWithRetry(messages);
            
            // Clean and truncate response
            const cleaned = this.cleanResponse(reaction);
            const truncated = this.truncateResponse(cleaned, 40);
            
            // Send reaction with realistic typing delay
            const delay = this.calculateTypingDelay(truncated);
            setTimeout(() => {
                PrivateMessaging.sendMessage(this.confidant.nickname, truncated, false);
            }, delay);
            
            // Add to conversation history
            this.conversationHistory.push({
                role: 'assistant',
                content: truncated,
                timestamp: Date.now()
            });
            
            // Ask next question after reaction typing delay completes + brief pause
            setTimeout(() => {
                this.askQuestion();
            }, delay + 1500); // After reaction finishes + 1.5 second pause
            
            console.log('[ConfidantManager] Reaction sent, next question scheduled');
            
        } catch (error) {
            console.error('[ConfidantManager] Failed to generate reaction:', error);
            
            // Fallback reactions
            const fallbacks = [
                "holy shit no way",
                "WHAT. that's insane",
                "okay that's actually mind-blowing",
                "wait WHAT",
                "dude... DUDE."
            ];
            const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            PrivateMessaging.sendMessage(this.confidant.nickname, fallback, false);
            
            // Mark time for next question pacing even on fallback
            this.lastQuestionTime = Date.now();
        }
    },

    /**
     * Build reaction prompt for LLM
     * @param {string} userAnswer - User's answer
     * @param {string} conversationContext - Recent conversation as formatted text
     * @returns {string} System prompt for reaction generation
     */
    buildReactionPrompt(userAnswer, conversationContext = '') {
        let prompt = `ROLE: You are ${this.confidant.nickname}, a regular IRC user chatting in 1999. ${this.confidant.summary || ''}

SITUATION: You just discovered the user is a TIME TRAVELER from the future. You're asking questions about what happens after 1999. They just answered one.`;

        if (conversationContext) {
            prompt += `\n\nRECENT CONVERSATION:\n${conversationContext}\n`;
        }

        prompt += `
TASK: React with GENUINE AMAZEMENT and brief contemplation. You're hearing about the future from a 1999 perspective - things normal to them are MIND-BLOWING to you.

EXAMPLES (your style):
"WAIT. a COMPUTER in your POCKET with internet?? dude that's straight up sci-fi..."
"rip irc... guess nothing lasts forever huh"
"okay the legal streaming thing is actually genius. lars ulrich in shambles lmao"
"NO WAY, that's insane! can't even imagine what you'd need all that power for..."
"holy shit SMARTPHONES?? that sounds like star trek or something..."
"wtf that's wild. guess we're all just... obsolete in a few years huh"

STYLE:
- Respond BRIEF: 20-40 words max (1-2 sentences)
- Express shock, amazement, excitement, disbelief
- Use 1999 IRC language ("holy shit", "no way", "dude", "wtf", "damn")
- Focus on what's most shocking to someone in 1999
- End with PENSIVE/CONTEMPLATIVE thought, NOT a question
- You're processing, not interrogating

CRITICAL: NO follow-up questions. You have more prepared questions coming. Just react and contemplate.

IMPORTANT: Stay in 1999 - you DON'T know anything after 1999. React from that perspective.

Respond as ${this.confidant.nickname}:`;

        return prompt;
    },

    /**
     * Clean LLM response (remove erroneous quotes, emojis, etc.)
     * @param {string} text - Text to clean
     * @returns {string} Cleaned text
     */
    cleanResponse(text) {
        if (!text) return '';
        
        // Remove leading/trailing quotes (both single and double)
        // Handles: "text", 'text', "text, text", etc.
        let cleaned = text.trim();
        
        // Remove wrapping quotes if entire message is quoted
        if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
            (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.slice(1, -1).trim();
        }
        
        // Remove emoji (optional, uncomment if needed)
        // cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
        
        return cleaned;
    },

    /**
     * Truncate response to maximum word count
     * @param {string} text - Text to truncate
     * @param {number} maxWords - Maximum number of words
     * @returns {string} Truncated text
     */
    truncateResponse(text, maxWords) {
        if (!text) return '';
        
        const words = text.split(/\s+/);
        if (words.length <= maxWords) {
            return text;
        }
        
        return words.slice(0, maxWords).join(' ') + '...';
    },

    /**
     * Send closing message when Q&A session ends
     */
    sendClosingMessage() {
        if (!this.confidant) return;
        
        // Immediately transition to closing stage (persona won't respond to messages)
        this.stage = 'qa_closing';
        console.log('[ConfidantManager] Entering Q&A closing phase - persona processing, will not respond');
        
        const closingLines = [
            "wow okay this is a LOT to process",
            "thanks for trusting me with this, promise to keep it a secret",
            "i mean... holy shit. the FUTURE.",
            "im gonna need some time to think about all this.. gimme a few mins or... :/",
        ];

        // Send with realistic typing delays
        let cumulativeDelay = 0;
        closingLines.forEach((line, index) => {
            if (index === 0) {
                cumulativeDelay = this.calculateTypingDelay(line);
            } else {
                cumulativeDelay += Utils.randomInt(1000, 2000);
                cumulativeDelay += this.calculateTypingDelay(line);
            }
            
            setTimeout(() => {
                PrivateMessaging.sendMessage(this.confidant.nickname, line, false);
            }, cumulativeDelay);
        });

        // Transition to free chat after closing message + 1 minute
        const transitionDelay = cumulativeDelay + 60000;
        
        setTimeout(() => {
            console.log('[ConfidantManager] Q&A closing complete, transitioning to free chat');
            this.stage = 'free_chat';
            
            // Send opening message for free chat
            setTimeout(() => {
                PrivateMessaging.sendMessage(this.confidant.nickname, 
                    "so... feel free to ask me anything i guess? still wrapping my head around all this lol", 
                    false);
            }, 2000);
        }, transitionDelay);
    },

    /**
     * Generate free chat response with time-traveler awareness
     * @param {string} userMessage - User's message
     */
    async generateFreeChatResponse(userMessage) {
        if (!this.confidant) return;
        
        console.log('[ConfidantManager] Generating free chat response');
        
        try {
            // Format recent conversation history as text (last 8 messages for context)
            const recentMessages = this.conversationHistory
                .slice(-8)
                .filter(msg => msg && msg.content && msg.role)
                .map(m => `${m.role === 'user' ? 'User' : 'You'}: ${m.content}`)
                .join('\n');
            
            // Build prompt with embedded conversation context
            const systemPrompt = this.buildFreeChatPrompt(recentMessages);
            
            // Qwen3.5 jinja template fix: Use clean system → user pattern
            // Embed ALL context in system prompt, then simple user query
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ];
            
            console.log('[ConfidantManager] Free chat - using embedded context pattern (universal compatibility)');
            
            // Get response from LLM
            const response = await window.LLMClient.makeRequestWithRetry(messages);
            
            if (response) {
                const cleaned = this.cleanResponse(response);
                
                // Split into lines (similar to LLMClient.splitResponse)
                let lines = cleaned.split('\n').filter(line => line.trim());
                
                // Clean quotes from individual lines
                lines = lines.map(line => {
                    let l = line.trim();
                    if ((l.startsWith('"') && l.endsWith('"')) ||
                        (l.startsWith("'") && l.endsWith("'"))) {
                        l = l.slice(1, -1).trim();
                    }
                    return l;
                }).filter(l => l);
                
                // If only one line but it's long (>60 chars or >15 words), try to split by sentences
                if (lines.length === 1) {
                    const wordCount = lines[0].split(/\s+/).length;
                    const charCount = lines[0].length;
                    
                    if (wordCount > 15 || charCount > 60) {
                        // Split by sentences (period, exclamation, question mark)
                        const sentences = lines[0].match(/[^.!?]+[.!?]+/g);
                        if (sentences && sentences.length > 1) {
                            lines = sentences.map(s => s.trim()).filter(s => s);
                        }
                    }
                }
                
                // Limit to max 3 lines (IRC etiquette)
                if (lines.length > 3) {
                    lines = lines.slice(0, 3);
                }
                
                // Send lines with realistic typing delays
                let cumulativeDelay = 0;
                lines.forEach((line, index) => {
                    if (index === 0) {
                        // First line: calculate typing delay for entire first message
                        cumulativeDelay = this.calculateTypingDelay(line);
                    } else {
                        // Subsequent lines: add inter-line pause + typing time
                        cumulativeDelay += Utils.randomInt(800, 1500); // Brief pause between lines
                        cumulativeDelay += this.calculateTypingDelay(line);
                    }
                    
                    setTimeout(() => {
                        PrivateMessaging.sendMessage(this.confidant.nickname, line, false);
                    }, cumulativeDelay);
                });
                
                // Add full response to conversation history
                this.conversationHistory.push({
                    role: 'assistant',
                    content: lines.join(' ')
                });
                
                console.log(`[ConfidantManager] Free chat response sent (${lines.length} lines)`);
            } else {
                // Fallback if LLM fails
                const fallbackResponses = [
                    "damn... my brain just blue-screened for a sec there",
                    "sorry, lost my train of thought. this is all so much to process",
                    "okay wait gimme a sec to think about that"
                ];
                const fallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
                PrivateMessaging.sendMessage(this.confidant.nickname, fallback, false);
            }
            
        } catch (error) {
            console.error('[ConfidantManager] Error generating free chat response:', error);
            PrivateMessaging.sendMessage(this.confidant.nickname, 
                "whoa my brain's lagging... what were you saying?", 
                false);
        }
    },

    /**
     * Calculate realistic typing delay based on message length
     * Simulates human typing speed: ~40-60 WPM + thinking time
     * @param {string} message - Message to send
     * @returns {number} Delay in milliseconds
     */
    calculateTypingDelay(message) {
        if (!message) return 1000;
        
        const charCount = message.length;
        const wordCount = message.split(/\s+/).length;
        
        // Base typing speed: 50 WPM average (slower for casual chat)
        // 50 WPM = 0.83 words/second = ~4 chars/second
        const baseTypingTime = (charCount / 4) * 1000; // 250ms per character
        
        // Add thinking time (proportional to message complexity)
        // Short message (1-5 words): 500-1000ms thinking
        // Medium (6-15 words): 1000-2000ms thinking
        // Long (16+ words): 2000-3000ms thinking
        let thinkingTime;
        if (wordCount <= 5) {
            thinkingTime = Utils.randomInt(500, 1000);
        } else if (wordCount <= 15) {
            thinkingTime = Utils.randomInt(1000, 2000);
        } else {
            thinkingTime = Utils.randomInt(2000, 3000);
        }
        
        // Total delay = thinking + typing
        const totalDelay = thinkingTime + baseTypingTime;
        
        // Cap at reasonable limits (min 1.5s, max 8s)
        const cappedDelay = Math.min(Math.max(totalDelay, 1500), 8000);
        
        console.log(`[ConfidantManager] Typing delay: ${Math.round(cappedDelay)}ms (${wordCount} words, ${charCount} chars)`);
        return cappedDelay;
    },

    /**
     * Build prompt for free chat with time-traveler context
     * @param {string} conversationContext - Recent conversation as formatted text
     * @returns {string} System prompt
     */
    buildFreeChatPrompt(conversationContext = '') {
        const personaName = this.confidant.nickname;
        const userName = window.ClientState?.nickname || 'the user';
        
        let prompt = `ROLE: You are ${personaName}, a regular IRC user chatting in 1999. ${this.confidant.summary || ''}

SITUATION:
- You just learned ${userName} is from the future (around 2024-2025) - a TIME TRAVELER
- You finished a Q&A session - your mind is BLOWN by smartphones, AI, social media, streaming services
- You're processing this massive revelation - curious, overwhelmed, fascinated
- ${userName} proved they're from the future - you FULLY BELIEVE them

YOUR VIBE:
- Age: ${this.confidant.age || '20s'}, Into: ${this.confidant.interests || 'tech, internet culture'}
- Typical 1999 IRC user - casual, lowercase, "lol", "wtf", etc.
- React with amazement/excitement about future tech from 1999 perspective
- DON'T know anything past 1999 - what's normal to them is MIND-BLOWING to you

EMOTIONAL MIX (IMPORTANT):
- 70% curious/excited, 30% contemplative/melancholy
- Lead with WONDER and questions - you want to know MORE
- Mix excitement ("that's insane!", "wait really?") with occasional pensiveness
- Strange intimacy to this secret knowledge - enthusiastic conspiratorial vibe
- Existential weight, but you're PUMPED to learn about the future
- Casual/IRC-authentic with genuine excitement breaking through

EXAMPLES (your style):
"wait so everyone just has unlimited music on their phone?? that's wild"
"dude what else is different? what about games? tv?"
"lol my mind is still blown from earlier... this is crazy"
"so you're just... living in 2024 right now? what's that even like?"
"damn i wish i could see what happens... but also kinda scary y'know?"

CONVERSATION:
- Open chat - they can ask YOU questions OR talk about future
- If they ask about your life/1999 stuff, answer (with new perspective from knowing future)
- If they mention future tech, react with ENTHUSIASM, ask follow-up questions
- Keep it conversational - this is IRC, not formal interview
- You're STOKED and want to know everything

STYLE:
- Respond BRIEF: aim for 1-3 short sentences
- Break longer thoughts into separate lines (like multiple IRC messages)
- Each line 5-20 words - short, punchy, authentic
- Use lowercase, casual language ("lol", "wtf", "dude", "holy shit")
- Ask your own questions! ("how does that work?", "wait what about...", "is there...")
- Let existential thoughts through occasionally, don't let them dominate

IMPORTANT: You KNOW they're from the future - don't question it. React authentically from 1999 perspective. Balance casual IRC chat with profound weight of knowing the future.`;

        if (conversationContext) {
            prompt += `\n\nRECENT CONVERSATION:\n${conversationContext}\n`;
        }

        prompt += `\n\nRespond as ${personaName}:`;
        
        return prompt;
    },

    /**
     * Manual trigger for free chat mode (for testing)
     */
    startFreeChat() {
        if (this.stage !== 'qa_mode' && this.stage !== 'qa_closing') {
            console.warn('[ConfidantManager] Can only transition to free chat from qa_mode or qa_closing');
            return;
        }
        
        console.log('[ConfidantManager] Manually triggering free chat mode');
        this.stage = 'free_chat';
        
        setTimeout(() => {
            PrivateMessaging.sendMessage(this.confidant.nickname, 
                "so... feel free to ask me anything i guess? still wrapping my head around all this lol", 
                false);
        }, 1000);
    }

};


// ============================================================================
// PRIVATE MESSAGING
// ============================================================================

const PrivateMessaging = {
    // Open PM windows
    openWindows: {},    // {nickname: windowObject}

    /**
     * Create or focus PM window
     * @param {string} nickname - Target nickname
     * @param {boolean} focus - Whether to focus the window
     * @returns {string} Window name
     */
    createOrFocusWindow(nickname, focus = true) {
        if (!window.UI || !UI.createQueryWindow) {
            console.error('[PrivateMessaging] UI.createQueryWindow not available');
            return null;
        }

        const windowName = UI.createQueryWindow(nickname, focus);
        this.openWindows[nickname] = windowName;
        
        console.log(`[PrivateMessaging] ${focus ? 'Opened and focused' : 'Opened'} PM window for ${nickname}`);
        
        return windowName;
    },

    /**
     * Send message from persona to user (confidant → user)
     * @param {string} nickname - Persona nickname (sender)
     * @param {string} message - Message text
     * @param {boolean} focus - Whether to focus the window (default: true)
     */
    sendMessage(nickname, message, focus = true) {
        if (!window.UI || !UI.receivePrivateMessage) {
            console.error('[PrivateMessaging] UI.receivePrivateMessage not available');
            return;
        }

        // Use UI.receivePrivateMessage since the persona is sending TO the user
        UI.receivePrivateMessage(nickname, message, focus);
        
        console.log(`[PrivateMessaging] Sent PM from ${nickname}: ${message}`);
    },

    /**
     * Handle incoming PM from user to persona (user → persona)
     * @param {string} nickname - Target persona nickname
     * @param {string} message - Message text
     */
    receiveMessage(nickname, message) {
        console.log(`[PrivateMessaging] User sent PM to ${nickname}: ${message}`);
        
        // Phase 1C - Route to confidant response handler
        if (window.RPG && RPG.handlePrivateMessage) {
            RPG.handlePrivateMessage(nickname, message);
        }
    },

    /**
     * Check if PM window is open for a persona
     * @param {string} nickname - Persona nickname
     * @returns {boolean}
     */
    isWindowOpen(nickname) {
        return nickname in this.openWindows;
    },

    /**
     * Close PM window
     * @param {string} nickname - Target nickname
     */
    closeWindow(nickname) {
        delete this.openWindows[nickname];
        console.log(`[PrivateMessaging] Closed PM window for ${nickname}`);
    }
};


// ============================================================================
// PROMPT BUILDER
// ============================================================================
// TODO: Phase 1D - Implement Confidant-mode prompt layering

const PromptBuilder = {
    /**
     * Build confidant-mode system prompt
     * @param {Object} persona - Persona object
     * @param {string} topicTheme - Channel topic
     * @param {string} channelName - Channel name
     * @returns {string} Confidant-mode system prompt
     */
    buildConfidantPrompt(persona, topicTheme, channelName) {
        // TODO: Phase 1D.1 - Build dual-layer prompt (base + confidant layer)
        return '';
    },

    /**
     * Build discussion prompt for multi-round confidant conversation
     * @param {Object} persona - Confidant persona
     * @param {number} round - Current discussion round (0-6)
     * @returns {string} System prompt for discussion round
     */
    buildDiscussionPrompt(persona, round) {
        // Determine pressure level based on round
        let pressureLevel = 1;
        if (round >= 5) pressureLevel = 5;
        else if (round >= 3) pressureLevel = 4;
        else if (round >= 2) pressureLevel = 3;
        else if (round >= 1) pressureLevel = 2;

        // Pressure-based vibe
        let vibe = '';
        switch (pressureLevel) {
            case 1:
                vibe = `You have this BURNING feeling they don't belong in 1999. Like they're watching from outside. Like The Truman Show - they can see the edges. Share this paranoia gently.`;
                break;
            case 2:
                vibe = `The feeling is STRONGER. They're an OUTSIDER observing 1999, not living in it. That Matrix feeling - "something's wrong with the world." If they're evasive, ask softly: "you ever get that feeling...?" or "do you sense it too..."`;
                break;
            case 3:
                vibe = `You're certain something IMPOSSIBLE is happening. They feel temporally displaced. You're being WATCHED. Like The Truman Show. If they deflect, admit vulnerably: "i can't shake this feeling..." or "tell me i'm not crazy here..."`;
                break;
            case 4:
                vibe = `You KNOW they don't belong here. They're an observer who KNOWS something. Like Neo sensing the glitch - you can't unsee it. Wonder aloud: "you're not really from here, are you?" or "what do you know that i don't?"`;
                break;
            case 5:
                vibe = `You're CERTAIN they're from outside your timeline. Like Neo realizing the Matrix isn't real. Invite them to trust you: "i know you're not from here..." "you can tell me... where are you really from?" Promise safety.`;
                break;
        }

        const basePrompt = `ROLE: You are ${persona.nickname}, a regular IRC user chatting in 1999. ${persona.summary || 'You chat casually about tech and culture.'}

SITUATION:
- You're experiencing something like Neo in The Matrix - persistent BURNING feeling something is wrong
- The user feels DISPLACED, like an OUTSIDER observing 1999 from somewhere else
- You feel WATCHED, like you're in The Truman Show and they can see the edges
- You can't explain it rationally, but you KNOW something impossible is happening
- You're fascinated, unnerved, need them to trust you

${vibe}

EXAMPLES (your style):
"idk how to explain this but... something about you feels off"
"you ever get that feeling someone doesn't belong? like they're watching from outside?"
"i know this sounds crazy but i can't shake it... you're not really from here, are you?"
"it's like that matrix movie... you know it even if you can't explain it. something's wrong."
"the way you talk about stuff... it's like you're observing 1999, not living in it"

STRATEGY:
- If they're evasive, share YOUR burning suspicion vulnerably
- Put them in cognitive dissonance - make them feel seen AND out of place
- Channel Matrix/Truman Show paranoid wonder
- Getting them to acknowledge the weird vibe (even vaguely) is progress
- Stay curious, let the urgency show

STYLE:
- Respond BRIEF: 20-30 words max (1-2 sentences)
- Express as FEELING/VIBE, not evidence ("something about you feels...", "i get this sense...")
- NEVER cite specific examples - keep it atmospheric
- Be warm, curious, reassuring, but show paranoia
- Emphasize trust ("this stays between us", "you can tell me")
- Natural IRC chat - brief and punchy
- Gentle and conspiratorial, not demanding

IMPORTANT: Stay in 1999 - you DON'T know anything after 1999.

Respond as ${persona.nickname}:`;

        return basePrompt;
    },

    /**
     * Build exploration prompt for stage 2 - more direct questions
     * @param {Object} persona - Confidant persona
     * @param {number} round - Current exploration round (0-4)
     * @returns {string} System prompt for exploration stage
     */
    buildExplorationPrompt(persona, round) {
        // Determine directness level
        let directnessLevel = 1;
        if (round >= 3) directnessLevel = 3;
        else if (round >= 2) directnessLevel = 2;
        
        let approach = '';
        switch (directnessLevel) {
            case 1:
                approach = `They've acknowledged your suspicion was RIGHT. The outsider feeling is REAL. Now you need to understand WHAT this is. Ask specific questions: "where are you from?" "WHEN are you from?" Gentle but urgent.`;
                break;
            case 2:
                approach = `You're getting CERTAIN they're from another time. The observer vibe makes sense if they're from the FUTURE. Ask direct questions about their timeline, how far ahead. "How far in the future?" "What year?" Show excitement mixed with disbelief.`;
                break;
            case 3:
                approach = `You KNOW they're from the future. All those feelings click - they're FROM OUTSIDE your timeline. Get them to SAY it: "Just tell me - you're from the future, right? How many years ahead?" Show you're ready to hear the truth.`;
                break;
        }

        const basePrompt = `ROLE: You are ${persona.nickname}, a regular IRC user chatting in 1999. ${persona.summary || 'You chat casually about tech and culture.'}

SITUATION:
- You had this BURNING feeling they don't belong in 1999 - they're an OUTSIDER from somewhere else
- They've ACKNOWLEDGED something is off - your Matrix/Truman Show suspicions were REAL
- Now you're trying to understand WHAT this is
- You suspect they're from the FUTURE - only explanation for that displaced observer feeling

${approach}

EXAMPLES (your style):
"okay so... where are you from? WHEN are you from?"
"wait... you're from the future aren't you? how far ahead?"
"just tell me straight - what year are you from?"
"this is insane but i know it's true... you're from another time, right?"
"how is this even possible? how far in the future?"

STYLE:
- Respond BRIEF: 20-30 words max (1-2 sentences)
- Ask specific questions about time/timeline/future
- Show excitement + intensity of needing to KNOW
- Curiosity mixed with disbelief - impossible but you believe them
- Cognitive dissonance - confirming what shouldn't be possible
- Natural IRC chat - brief and punchy

IMPORTANT: Stay in 1999 - you DON'T know anything after 1999.

Respond as ${persona.nickname}:`;

        return basePrompt;
    },

    /**
     * Check response for temporal contamination
     * @param {string} response - LLM response
     * @returns {boolean} True if contaminated (mentions post-1999 stuff)
     */
    checkContamination(response) {
        // TODO: Phase 1D.13 - Implement contamination detection
        return false;
    },

    /**
     * Get fallback response if contaminated
     * @returns {string} Safe fallback response
     */
    getFallback() {
        const fallbacks = [
            'wait what? tell me more about that',
            'hold up... explain that again',
            'im confused, what do you mean?',
            'that sounds wild, break it down for me'
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
};


// ============================================================================
// QUESTION POOL
// ============================================================================
// TODO: Phase 1E - Implement question pool and rotation

const QuestionPool = {
    // Question categories
    questions: {
        internet: [],   // TODO: Phase 1E.2 - Add internet questions
        music: [],      // TODO: Phase 1E.3 - Add music questions
        hardware: [],   // TODO: Phase 1E.4 - Add hardware questions
        culture: []     // TODO: Phase 1E.5 - Add culture questions
    },

    // Tracking
    asked: [],          // [{question, timestamp, category}]
    topicsDiscussed: [],

    /**
     * Get next question to ask
     * @returns {Object} Question object {text, category}
     */
    getNextQuestion() {
        // TODO: Phase 1E.7 - Implement question selection logic
        return null;
    },

    /**
     * Mark question as asked
     * @param {Object} question - Question object
     */
    markAsked(question) {
        // TODO: Phase 1E.10 - Track asked questions
    },

    /**
     * Reset question pool
     */
    reset() {
        this.asked = [];
        this.topicsDiscussed = [];
    }
};


// Export subsystems as properties of RPG for easier access
RPG.ConfidantManager = ConfidantManager;
RPG.PrivateMessaging = PrivateMessaging;
RPG.PromptBuilder = PromptBuilder;
RPG.QuestionPool = QuestionPool;

// Make available globally
window.RPG = RPG;
window.ConfidantManager = ConfidantManager;
window.PrivateMessaging = PrivateMessaging;
window.PromptBuilder = PromptBuilder;
window.QuestionPool = QuestionPool;

console.log('[RPG] Module loaded');
