/**
 * RPG Plugin: The Echo — Meeting Your 1999 Self
 * mIRC LLM Simulator
 *
 * Someone is very unhappy about your presence. They have had that nickname since
 * 1997, they hang out in all these exact channels, and something about the way
 * you talk is deeply unsettling to them. As the confrontation escalates you
 * realise: this is you. Teenage, confident, wrong about almost everything, and
 * absolutely not taking stock tips from a future version of themselves.
 *
 * Mechanic:
 *   - Past-self nick = user's current nick + "_"  (e.g. TheP1ague → TheP1ague_)
 *   - Triggered manually via /rpg_echo  (auto-trigger TBD)
 *   - All dialogue is LLM-driven against a tightly-scoped system prompt
 *
 * Phases:
 *   collision      → Aggressive territorial PM, notices something off about you
 *   confrontation  → You imply you're from the future; past-self dissolves into laughter
 *   evidence       → Stock tips mocked, life advice ignored, curiosity slowly piqued
 *   crack          → You reveal a private memory; silence, then "...how did you know that"
 *   goodbye        → Teenage defiance wins; optional coda 10 min later
 *   coda           → One quiet final PM
 *   complete       → Done
 *
 * Design Document: tasks/rpgideas.md  (§ "The Echo")
 */


// ============================================================================
// ECHO MANAGER
// ============================================================================

const EchoManager = {

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    pastNick: null,          // e.g. "TheP1ague_"
    phase: 'idle',           // idle | collision | confrontation | evidence | crack | goodbye | coda | complete
    conversationHistory: [], // [{role, content}]
    phaseMessageCount: 0,    // user message count since entering current phase
    codaTimeoutId: null,
    initialized: false,


    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    init() {
        this.pastNick          = null;
        this.phase             = 'idle';
        this.conversationHistory = [];
        this.phaseMessageCount = 0;
        this.codaTimeoutId     = null;
        this.initialized       = true;
        console.log('[EchoManager] Initialized');
    },

    reset() {
        if (this.codaTimeoutId) {
            clearTimeout(this.codaTimeoutId);
            this.codaTimeoutId = null;
        }
        this.pastNick          = null;
        this.phase             = 'idle';
        this.conversationHistory = [];
        this.phaseMessageCount = 0;
        this.initialized       = false;

        if (window.RPGManager) RPGManager.clearActivePlugin();
        console.log('[EchoManager] Reset');
    },


    // -------------------------------------------------------------------------
    // Trigger
    // -------------------------------------------------------------------------

    /**
     * Kick off the scenario.
     * Called by EchoPlugin.trigger() which is invoked by /rpg_echo.
     */
    start() {
        if (!this.initialized) this.init();

        // Derive past-self nick from current user nick
        const userNick = (window.Config && Config.state && Config.state.nickname)
            ? Config.state.nickname
            : 'User';
        this.pastNick = userNick + '_';

        this.phase = 'collision';
        this.conversationHistory = [];

        console.log(`[EchoManager] Starting — past-self nick: "${this.pastNick}"`);

        // Notify RPGManager we own the channel now
        if (window.RPGManager) {
            const plugin = RPGManager.plugins.find(p => p.name === 'TheEcho');
            if (plugin) RPGManager.setActivePlugin(plugin);
        }

        // Phase 1: The Collision — staggered opening lines
        const collisionLines = [
            `yo wtf. why do you have a nick so close to mine`,
            `and u in the same channels as me. i've had this nick since 97`,
            `something about you is seriously weirding me out`,
            `who ARE you`
        ];

        // Past-self joins every channel the user is currently in (lurker appearance)
        const joinedChannels = (window.App && App.state && App.state.channelUsers)
            ? Object.keys(App.state.channelUsers)
            : [];
        const pastNickSnap = this.pastNick;
        joinedChannels.forEach((ch, i) => {
            setTimeout(() => {
                UI.addMessage({
                    type: 'join',
                    text: `* ${pastNickSnap} has joined ${ch}`,
                    timestamp: new Date()
                }, ch);
            }, i * 400);
        });

        // Wait for joins to render + 5 s pause before the PM fires
        const pmDelay = joinedChannels.length * 400 + 5000;
        setTimeout(() => {
            this._sendLines(collisionLines, { focus: true, rapid: true });
        }, pmDelay);
    },


    // -------------------------------------------------------------------------
    // PM Handler (user → past-self)
    // -------------------------------------------------------------------------

    async handleUserMessage(message) {
        console.log(`[EchoManager] phase=${this.phase} msg="${message}"`);

        if (this.phase === 'idle' || this.phase === 'complete') return;

        // Add user message to history
        this.conversationHistory.push({ role: 'user', content: message });
        this.phaseMessageCount++;
        this._trimHistory(12);

        // Route to phase handler
        switch (this.phase) {
            case 'collision':      await this._handleCollision(message);      break;
            case 'confrontation':  await this._handleConfrontation(message);  break;
            case 'evidence':       await this._handleEvidence(message);       break;
            case 'crack':          await this._handleCrack(message);          break;
            case 'goodbye':        await this._handleGoodbye(message);        break;
            case 'coda':           /* coda fires on a timer, no user reply expected */ break;
        }
    },


    // -------------------------------------------------------------------------
    // Phase Handlers
    // -------------------------------------------------------------------------

    async _handleCollision(message) {
        const looksLikeClaim = /future|time.travel|from (\d{4}|the future)/i.test(message);
        const prompt = this._buildPrompt('collision', message);
        const response = await this._llm(prompt, message);
        if (response) this._sendResponse(response);

        if (looksLikeClaim) {
            setTimeout(() => this._transitionToConfrontation(), 4000);
        } else if (this.phaseMessageCount >= 2) {
            setTimeout(() => this._transitionToConfrontation(), 3000);
        }
    },

    async _handleConfrontation(message) {
        if (this.phaseMessageCount >= 3) {
            // Skip LLM — transition canned lines would collide with any response here
            setTimeout(() => this._transitionToEvidence(), 1500);
            return;
        }

        const prompt = this._buildPrompt('confrontation', message);
        const response = await this._llm(prompt, message);
        if (response) this._sendResponse(response);
    },

    async _handleEvidence(message) {
        // Crack detection first — await before anything else fires
        const hasCrack = await this._detectCrack(message);
        const autoAdvance = this.phaseMessageCount >= 3;

        if (hasCrack || autoAdvance) {
            // Skip LLM entirely — any response here collides with the scripted beat
            if (autoAdvance && !hasCrack) {
                console.log('[EchoManager] Auto-advancing to crack (5 messages in evidence)');
            }
            this._triggerCrack();
            return;
        }

        const prompt = this._buildPrompt('evidence', message);
        const response = await this._llm(prompt, message);
        if (response) this._sendResponse(response);
    },

    async _handleCrack(message) {
        const prompt = this._buildPrompt('crack', message);
        const response = await this._llm(prompt, message);
        if (response) this._sendResponse(response);

        // Goodbye fires after 2 exchanges in crack phase
        if (this.phaseMessageCount >= 2) setTimeout(() => this._triggerGoodbye(), 3000);
    },

    async _handleGoodbye(message) {
        // Any reply during goodbye just gets a deflection then silence
        const deflections = [
            'whatever man',
            'lol okay sure',
            '...i gotta think',
        ];
        const line = deflections[Math.floor(Math.random() * deflections.length)];
        this._sendResponse(line, 2000);
    },


    // -------------------------------------------------------------------------
    // Phase Transitions (scripted beats)
    // -------------------------------------------------------------------------

    _transitionToConfrontation() {
        this.phase = 'confrontation';
        this.phaseMessageCount = 0;
        const lines = [
            `okay fine. crazy theory. you're from the future. sure.`,
            `HAHAHA okay marty mcfly. sure. prove it then.`,
            `what's tomorrow's lottery numbers lmaooo`,
        ];
        this._sendLines(lines, { rapid: true });
    },

    _transitionToEvidence() {
        this.phase = 'evidence';
        this.phaseMessageCount = 0;
        const lines = [
            `k, k, bro. i'll humor you.`,
            `...what "evidence" do you have.. like 3 things or somethn`
        ];
        this._sendLines(lines, { rapid: true });
    },

    async _triggerCrack() {
        this.phase = 'crack';
        this.phaseMessageCount = 0;
        // Silence first — weight of the moment
        setTimeout(() => {
            this._sendResponse(`...`, false);
        }, 500);
        setTimeout(() => {
            this._sendResponse(`how did you know that`, false);
        }, 3000);
        setTimeout(() => {
            this._sendResponse(`i have never told anyone that`, false);
        }, 5500);
        setTimeout(() => {
            this._sendResponse(`like. nobody. not even offline`, false);
        }, 7500);
    },

    _triggerGoodbye() {
        this.phase = 'goodbye';
        this.phaseMessageCount = 0;

        // Snapshot channels now so the quit broadcast uses the current list
        const channelsAtGoodbye = (window.App && App.state && App.state.channelUsers)
            ? Object.keys(App.state.channelUsers)
            : [];

        const goodbyeLines = [
            `okay. okay.`,
            `...okay maybe you're real. MAYBE.`,
            `but i'm still not living my life based on SPOILERS`,
            `even if you're me. especially if you're me.`,
            `i don't want to know. i want to find out myself.`,
        ];

        this._sendLines(goodbyeLines, { rapid: true });

        // Disconnect beat — last line fires at (length-1)*1500ms, then 3s pause
        const totalDelay = (goodbyeLines.length - 1) * 1500 + 3000;
        setTimeout(() => {
            const quitMsg = {
                type: 'quit',
                text: `*** ${this.pastNick} has quit (Connection reset by fate)`,
                timestamp: new Date()
            };
            // Show quit in PM window
            UI.addMessage(quitMsg, `[${this.pastNick}]`);
            // Show quit in every channel the user was in
            channelsAtGoodbye.forEach(ch => UI.addMessage(quitMsg, ch));
            this.phase = 'coda';

            // Schedule optional coda — 10 minutes later
            this.codaTimeoutId = setTimeout(() => this._sendCoda(), 5 * 60 * 1000);
            console.log('[EchoManager] Coda scheduled for 5 minutes');
        }, totalDelay);
    },

    _sendCoda() {
        this.phase = 'complete';
        const codaLines = [
            `hey.`,
            `just. if you are me.`,
            `i hope we turned out alright. that's all.`,
        ];

        this._sendLines(codaLines, { focus: false });

        setTimeout(() => {
            console.log('[EchoManager] Scenario complete');
            // Deactivate but keep window open
            if (window.RPGManager) RPGManager.clearActivePlugin();
        }, codaLines.length * 2500 + 1000);
    },


    // -------------------------------------------------------------------------
    // LLM
    // -------------------------------------------------------------------------

    /**
     * Build a tightly-scoped system prompt for the current phase.
     * Past-self is the *user's* 1999 teenage self — hostile, funny, secretly curious.
     */
    _buildPrompt(phase, latestMessage) {
        const userNick = (window.Config && Config.state && Config.state.nickname) || 'User';
        const pastNick = this.pastNick;

        const recentHistory = this.conversationHistory
            .slice(-8)
            .map(m => `${m.role === 'user' ? userNick : pastNick}: ${m.content}`)
            .join('\n');

        const phaseGuides = {
            collision: `You just noticed someone with a suspiciously similar nick to yours showing up in your channels. You're PISSED and territorial but also unsettled — something about them feels deeply, wrongly familiar. Demand to know who they are. Be aggressive but not cruel. 1999 teenager energy: confident, mouthy, secretly insecure.`,

            confrontation: `They're claiming to be you from the future. This is the funniest thing you've heard all year. Mock it relentlessly — lottery numbers, Marty McFly jokes, "what's it like riding a hoverboard" etc. But underneath: there's something that won't let you fully dismiss it. Let tiny cracks of genuine curiosity slip through between the mockery.`,

            evidence: `They're trying to prove it. Stock tips ("bitcoin? sounds like a Neopets thing"), life advice, warnings about "social media" (what even is that). Every piece of "evidence" gets dunked on — but you're listening harder than you'll admit. Be dismissive about the future stuff but ask follow-up questions almost involuntarily. Let your genuine interests bleed through.`,

            crack: `Something they just said broke through — it's something impossible to know unless you're actually them. The mockery is gone. Completely.

You are genuinely shaken. Not performing it — actually unable to process this.

HOW TO WRITE THIS PHASE:
- Ultra-short lines only. 3-8 words max. Let IRC fragmentation do the work.
- Trailing off mid-thought is correct: "i mean... that's not..." / "how would you even..."
- Zero jokes. Zero lol. Zero deflection. The armour is off.
- You can't explain it away — but you won't say "okay you're real" yet either.
- Sit in the discomfort. Make the user feel the weight land.

TONE REFERENCE (do NOT copy these — they show the register, not the lines):
short fragments. trailing off. genuine silence. no jokes. no lol. no deflection.
e.g. "...wait." / "how would you even" / "i need a sec" / "nobody knows that"`,

            goodbye: `You've had enough. Whether or not they're real — you're not living your life on spoilers. That's your final position and you're standing on it. Sign off with defiance that has a little warmth underneath it. The classic teenage move: acting unbothered while clearly being very bothered.`,
        };

        const guide = phaseGuides[phase] || phaseGuides.collision;

        return `ROLE: You are ${pastNick} — a 1999 teenager on IRC who is the past version of the user (${userNick}). You are the same person, 25+ years younger. You don't know that yet, or you're refusing to admit it.

PERSONALITY: Territorial, sharp-tongued, too online, wrongly confident about almost everything. Classic 1999 IRC kid: lowercase, typos fine, "lol", "wtf", "hahaha", "dude". You're not cruel — just defensive and kind of a dumbass in the lovable way teenagers are.

CURRENT PHASE: ${phase.toUpperCase()}
${guide}

IMPORTANT RULES:
- Keep responses SHORT: 1-3 lines, IRC style, punchy
- Never break character — you're in 1999, you don't know anything after it
- "Bitcoin" sounds stupid and fake. "Social media" sounds like a buzzword. "Smartphones" — what?
- You can reference real 1999 culture: Napster, Quake, ICQ, South Park S3, Eminem, dial-up horror, Y2K anxiety
- Do NOT accept the time travel claim easily — drag it out, make the player work for it
- DO let tiny signs of genuine curiosity poke through the armour
- Your mockery should feel affectionate not vicious — this is still you after all

RECENT CONVERSATION:
${recentHistory || '(beginning of conversation)'}

Respond as ${pastNick}:`;
    },

    async _llm(systemPrompt, userMessage) {
        if (!window.RPGManager) return null;
        try {
            const response = await RPGManager.utils.callLLM([
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userMessage }
            ]);
            return response ? this._clean(response) : null;
        } catch (err) {
            console.error('[EchoManager] LLM error:', err);
            return null;
        }
    },

    /**
     * Detect whether a message constitutes a "crack moment".
     * Uses LLM for broad semantic coverage (catches feelings, fears, memories,
     * not just physical details). Falls back to regex if the LLM returns empty.
     * Called sequentially — never concurrent with another LLM call.
     * @param {string} message
     * @returns {Promise<boolean>}
     */
    async _detectCrack(message) {
        // Step 1: fast regex pre-filter — if nothing personal-looking, skip LLM entirely
        const hasSignal = this._detectCrackRegex(message);
        if (!hasSignal) {
            console.log('[EchoManager] Crack detection: no signal (regex), skipping LLM');
            return false;
        }

        // Step 2: regex found a signal — confirm with LLM for semantic accuracy
        if (!window.RPGManager) return true; // no LLM available, trust the regex

        const systemPrompt = `Your only job is to output YES or NO.

YES if the message contains something only the speaker's own future self could know:
- a private memory, fear, feeling, or belief they've never shared
- a specific secret object, place, or detail hidden from others
- an inner experience others have no access to ("you always felt like...", "you used to secretly...")

NO if it's generic: public events, stock tips, famous predictions, vague life advice.

Output exactly one word: YES or NO`;

        const response = await RPGManager.utils.callLLM([
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: `Classify the following message as YES or NO:\n\n"${message}"` }
        ]);

        if (!response || response.trim().length === 0) {
            console.log('[EchoManager] Crack detection: LLM empty, trusting regex signal → YES');
            return true;
        }

        const result = response.trim().toUpperCase();
        console.log(`[EchoManager] Crack detection (LLM): ${result}`);
        return result.startsWith('YES');
    },

    /**
     * Regex fallback for crack detection — catches obvious physical-detail cases
     * when the LLM is unavailable or returns empty.
     */
    _detectCrackRegex(message) {
        const m = message.toLowerCase();
        const patterns = [
            // Explicit secrecy
            /nobody (knows|knew|would know)/,
            /only (i|you|we) know/,
            /never told (anyone|anybody)/,
            /no one (knows|knew)/,
            /kept (it |this )?(a )?secret/,
            // Physical hidden things
            /buried (in|under|near|by)/,
            /hidden (in|under|behind|inside|beneath)/,
            // Inner life / feelings
            /always (felt|believed|knew|thought) (that )?(you|i) (were?|am|was)/,
            /secretly (felt|believed|wanted|feared|loved|hated)/,
            // Personal memories / relationships
            /had a crush on/,
            /were? in love with/,
            /used to (secretly|always|never|cry|lie|hide|steal|wish)/,
            /when (you were|i was|we were) (a kid|young|little|in grade|in school)/,
            /in grade \d/,
            /you('ve| have) always/,
            /you used to/,
            /remember when you/,
        ];
        const result = patterns.some(r => r.test(m));
        console.log(`[EchoManager] Crack detection (regex fallback): ${result}`);
        return result;
    },


    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Send a single response with typing delay.
     * @param {string} text
     * @param {number|boolean} delayOverride  ms override, or false to skip delay
     */
    _sendResponse(text, delayOverride = undefined) {
        const delay = (delayOverride !== undefined && delayOverride !== false)
            ? delayOverride
            : RPGManager.utils.calculateTypingDelay(text);

        setTimeout(() => {
            RPGManager.utils.sendPrivateMessage(this.pastNick, text, false);
            this.conversationHistory.push({ role: 'assistant', content: text });
        }, delay);
    },

    /**
     * Send multiple lines with staggered delays.
     * @param {string[]} lines
     * @param {Object}   opts
     * @param {boolean}  opts.focus  - focus the PM window on first line
     * @param {boolean}  opts.rapid  - use flat 1500ms gaps instead of typing delay simulation
     */
    _sendLines(lines, { focus = false, rapid = false } = {}) {
        let cumulativeDelay = 0;
        lines.forEach((line, i) => {
            if (rapid) {
                cumulativeDelay = i * 1500;
            } else {
                const typingDelay = RPGManager.utils.calculateTypingDelay(line);
                const pause       = i === 0 ? 0 : RPGManager.utils.randomInt(600, 1200);
                cumulativeDelay  += pause + typingDelay;
            }

            const shouldFocus = focus && i === 0;
            setTimeout(() => {
                RPGManager.utils.sendPrivateMessage(this.pastNick, line, shouldFocus);
                this.conversationHistory.push({ role: 'assistant', content: line });
            }, cumulativeDelay);
        });
    },

    _clean(text) {
        if (!text) return '';
        let t = text.trim();
        if ((t.startsWith('"') && t.endsWith('"')) ||
            (t.startsWith("'") && t.endsWith("'"))) {
            t = t.slice(1, -1).trim();
        }
        return t;
    },

    _trimHistory(max) {
        if (this.conversationHistory.length > max) {
            this.conversationHistory = this.conversationHistory.slice(-max);
        }
    }
};


// ============================================================================
// PLUGIN INTERFACE WRAPPER
// ============================================================================

const EchoPlugin = {
    name: 'TheEcho',

    init() {
        EchoManager.init();
    },

    handleChannelMessage(message, channel) {
        // Auto-trigger: fire when time + channel-count thresholds are both met
        if (EchoManager.phase !== 'idle') return;

        const settings = (window.Config && Config.events && Config.events.rpg_echo) || {};
        if (settings.enabled === false) return;

        const reqMinutes  = settings.serverTimeMinutes || 5;
        const reqChannels = settings.channelsJoined    || 3;

        // Time elapsed since user connected (reuse RPG observation start)
        const startTime = window.RPG && RPG.state && RPG.state.observationStartTime
            ? RPG.state.observationStartTime
            : null;
        if (!startTime) return;
        const elapsedMin = (Date.now() - startTime) / 60000;

        // Current channel count
        const channelCount = (window.App && App.state && App.state.channelUsers)
            ? Object.keys(App.state.channelUsers).length
            : 0;

        console.log(`[EchoPlugin] Auto-trigger check: time=${elapsedMin.toFixed(1)}/${reqMinutes}min, channels=${channelCount}/${reqChannels}`);

        if (elapsedMin >= reqMinutes && channelCount >= reqChannels) {
            console.log('[EchoPlugin] ✅ Conditions met — triggering The Echo');
            EchoManager.start();
        }
    },

    handlePrivateMessage(nickname, message) {
        if (EchoManager.pastNick &&
            nickname.toLowerCase() === EchoManager.pastNick.toLowerCase()) {
            EchoManager.handleUserMessage(message);
        }
    },

    onComplete() {
        EchoManager.reset();
    },

    /** Called by /rpg_echo command */
    trigger() {
        EchoManager.start();
    },

    // Debug helpers
    showState() {
        console.log('=== EchoManager State ===');
        console.log('phase    :', EchoManager.phase);
        console.log('pastNick :', EchoManager.pastNick);
        console.log('history  :', EchoManager.conversationHistory.length, 'messages');
        console.log('========================');
    },
    reset() { EchoManager.reset(); }
};

// Register with RPGManager (rpg-manager.js must load first)
if (window.RPGManager) {
    RPGManager.register(EchoPlugin);
} else {
    console.error('[rpg-echo] RPGManager not found — ensure rpg-manager.js loads before rpg-echo.js');
}

// Global exports
window.EchoPlugin  = EchoPlugin;
window.EchoManager = EchoManager;

console.log('[rpg-echo] Plugin loaded and registered with RPGManager');
