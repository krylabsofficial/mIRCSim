/**
 * RPG Settings UI
 * Manages the RPG settings modal for configuring individual RPG scenarios.
 *
 * Each scenario has its own settings panel, shown via a dropdown selector.
 * Settings are saved to localStorage and applied to Config.events.
 *
 * Scenarios:
 *   - Time Travel Confidant  → Config.events.rpg_event_1
 *   - The Echo               → Config.events.rpg_echo
 */

(function () {
    'use strict';

    const RPGSettingsUI = {

        modal: null,
        indicatorInterval: null,
        initialized: false,

        // Defaults for each scenario
        defaults: {
            time_travel: {
                enabled: true,
                serverTimeMinutes: 10,
                channelParticipation: 25
            },
            the_echo: {
                enabled: true,
                serverTimeMinutes: 5,
                channelsJoined: 3
            }
        },

        // Current in-memory settings (loaded from localStorage on init)
        settings: {},

        // -------------------------------------------------------------------------
        // Init
        // -------------------------------------------------------------------------

        init: function () {
            if (this.initialized) return;

            // Wait for Config
            if (!window.Config || !window.Config.events) {
                setTimeout(() => this.init(), 200);
                return;
            }

            this.modal = document.getElementById('rpg-settings-modal');
            if (!this.modal) {
                console.error('[RPGSettingsUI] Modal element not found');
                return;
            }

            this.modal.style.display = 'none';
            this.modal.classList.remove('show');

            this.loadSettings();

            // Toolbar button
            const btnOpen = document.getElementById('btn-rpg-settings');
            if (btnOpen) {
                btnOpen.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.show();
                });
            }

            // Modal controls
            const btnClose    = document.getElementById('close-rpg-modal');
            const btnMinimize = document.getElementById('minimize-rpg-modal');
            const btnSave     = document.getElementById('save-rpg-settings');
            const btnCancel   = document.getElementById('cancel-rpg-settings');

            if (btnClose)    btnClose.addEventListener('click',    () => this.hide());
            if (btnMinimize) btnMinimize.addEventListener('click', () => this.hide());
            if (btnSave)     btnSave.addEventListener('click',     () => this.save());
            if (btnCancel)   btnCancel.addEventListener('click',   () => this.hide());

            // Scenario dropdown
            const scenarioSelect = document.getElementById('rpg-scenario-selector');
            if (scenarioSelect) {
                scenarioSelect.addEventListener('change', (e) => {
                    this.showPanel(e.target.value);
                    this.updateStatusButton();
                });
            }

            // Action bar buttons
            const btnForceTrigger = document.getElementById('rpg-force-trigger-btn');
            const btnSetComplete  = document.getElementById('rpg-set-complete-btn');
            const btnReset        = document.getElementById('rpg-reset-btn');

            if (btnForceTrigger) btnForceTrigger.addEventListener('click', () => this.handleForceTrigger());
            if (btnSetComplete)  btnSetComplete.addEventListener('click',  () => this.handleSetComplete());
            if (btnReset)        btnReset.addEventListener('click',        () => this.handleReset());

            // Close on background click / Escape
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.hide();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal.classList.contains('show')) this.hide();
            });

            this.setupDrag();
            this.wireSliders();
            this.initialized = true;
            console.log('[RPGSettingsUI] Initialized');
        },

        // -------------------------------------------------------------------------
        // Show / Hide
        // -------------------------------------------------------------------------

        show: function () {
            if (!this.modal) return;

            // Populate UI from current settings
            this.populateAll();

            // Force critical styles inline (same pattern as EventSettingsUI)
            this.modal.style.position        = 'fixed';
            this.modal.style.zIndex          = '9999';
            this.modal.style.left            = '0';
            this.modal.style.top             = '0';
            this.modal.style.width           = '100%';
            this.modal.style.height          = '100%';
            this.modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            this.modal.style.alignItems      = 'center';
            this.modal.style.justifyContent  = 'center';
            this.modal.style.display         = 'flex';
            this.modal.classList.add('show');

            const content = this.modal.querySelector('.event-modal-content');
            if (content) {
                content.style.backgroundColor = '#c0c0c0';
                content.style.border          = '2px outset #ffffff';
                content.style.boxShadow       = '4px 4px 0px rgba(0, 0, 0, 0.5)';
                content.style.width           = '315px';
                content.style.maxWidth        = '90%';
                content.style.maxHeight       = '85vh';
                content.style.display         = 'flex';
                content.style.flexDirection   = 'column';
                content.style.position        = 'absolute';
                content.style.zIndex          = '10000';
                content.style.top             = '50%';
                content.style.left            = '50%';
                content.style.transform       = 'translate(-50%, -50%)';
            }

            const header = this.modal.querySelector('.window-titlebar');
            if (header) header.style.cursor = 'move';

            const body = this.modal.querySelector('.modal-body');
            if (body) {
                body.style.padding         = '12px 16px';
                body.style.overflowY       = 'auto';
                body.style.flex            = '1';
                body.style.backgroundColor = '#c0c0c0';
            }

            const sectionHeaders = this.modal.querySelectorAll('.event-section h3');
            sectionHeaders.forEach(h => {
                h.style.fontSize    = '12px';
                h.style.fontWeight  = 'bold';
                h.style.marginBottom = '8px';
                h.style.padding     = '0';
                h.style.background  = 'transparent';
                h.style.color       = '#000000';
                h.style.border      = 'none';
                h.style.fontFamily  = "'MS Sans Serif', 'Tahoma', sans-serif";
            });

            const footer = this.modal.querySelector('.modal-footer');
            if (footer) {
                footer.style.padding         = '10px 12px';
                footer.style.backgroundColor = '#c0c0c0';
                footer.style.borderTop       = '2px groove #ffffff';
                footer.style.display         = 'flex';
                footer.style.justifyContent  = 'center';
                footer.style.gap             = '8px';
            }

            // Kick off indicator refresh
            this.updateIndicators();
            if (this.indicatorInterval) clearInterval(this.indicatorInterval);
            this.indicatorInterval = setInterval(() => this.updateIndicators(), 1000);
        },

        hide: function () {
            if (!this.modal) return;
            this.modal.style.display = 'none';
            this.modal.classList.remove('show');
            if (this.indicatorInterval) {
                clearInterval(this.indicatorInterval);
                this.indicatorInterval = null;
            }
        },

        // -------------------------------------------------------------------------
        // Panel switching
        // -------------------------------------------------------------------------

        showPanel: function (scenario) {
            document.querySelectorAll('.rpg-scenario-panel').forEach(p => {
                p.style.display = 'none';
            });
            const panel = document.getElementById(`rpg-panel-${scenario}`);
            if (panel) panel.style.display = 'block';
        },

        // -------------------------------------------------------------------------
        // Populate UI from settings
        // -------------------------------------------------------------------------

        populateAll: function () {
            this.populateTimeTravel();
            this.populateEcho();

            // Show the currently selected panel
            const sel = document.getElementById('rpg-scenario-selector');
            this.showPanel(sel ? sel.value : 'time_travel');
        },

        populateTimeTravel: function () {
            const s = this.settings.time_travel || this.defaults.time_travel;

            const checkbox             = document.getElementById('tt-enabled');
            const timeSlider           = document.getElementById('tt-servertime');
            const timeLabel            = document.getElementById('tt-servertime-label');
            const participationSlider  = document.getElementById('tt-participation');
            const participationLabel   = document.getElementById('tt-participation-label');

            if (checkbox)            checkbox.checked          = s.enabled;
            if (timeSlider)          timeSlider.value          = s.serverTimeMinutes;
            if (timeLabel)           timeLabel.textContent     = `${s.serverTimeMinutes} min`;
            if (participationSlider) participationSlider.value = s.channelParticipation;
            if (participationLabel)  participationLabel.textContent = `${s.channelParticipation} msg`;

            const disabled = !s.enabled;
            if (timeSlider)          timeSlider.disabled          = disabled;
            if (participationSlider) participationSlider.disabled = disabled;
        },

        populateEcho: function () {
            const s = this.settings.the_echo || this.defaults.the_echo;

            const checkbox       = document.getElementById('echo-enabled');
            const timeSlider     = document.getElementById('echo-servertime');
            const timeLabel      = document.getElementById('echo-servertime-label');
            const chanSlider     = document.getElementById('echo-channels');
            const chanLabel      = document.getElementById('echo-channels-label');

            if (checkbox)    checkbox.checked       = s.enabled;
            if (timeSlider)  timeSlider.value       = s.serverTimeMinutes;
            if (timeLabel)   timeLabel.textContent  = `${s.serverTimeMinutes} min`;
            if (chanSlider)  chanSlider.value       = s.channelsJoined;
            if (chanLabel)   chanLabel.textContent  = `${s.channelsJoined}`;

            const disabled = !s.enabled;
            if (timeSlider)  timeSlider.disabled  = disabled;
            if (chanSlider)  chanSlider.disabled  = disabled;
        },

        // -------------------------------------------------------------------------
        // Save
        // -------------------------------------------------------------------------

        save: function () {
            // Read Time Travel settings from UI
            const ttEnabled       = document.getElementById('tt-enabled');
            const ttTime          = document.getElementById('tt-servertime');
            const ttParticipation = document.getElementById('tt-participation');

            this.settings.time_travel = {
                enabled:              ttEnabled       ? ttEnabled.checked                     : this.defaults.time_travel.enabled,
                serverTimeMinutes:    ttTime          ? parseInt(ttTime.value, 10)            : this.defaults.time_travel.serverTimeMinutes,
                channelParticipation: ttParticipation ? parseInt(ttParticipation.value, 10)   : this.defaults.time_travel.channelParticipation
            };

            // Read The Echo settings from UI
            const echoEnabled = document.getElementById('echo-enabled');
            const echoTime    = document.getElementById('echo-servertime');
            const echoChans   = document.getElementById('echo-channels');

            this.settings.the_echo = {
                enabled:           echoEnabled ? echoEnabled.checked              : this.defaults.the_echo.enabled,
                serverTimeMinutes: echoTime    ? parseInt(echoTime.value, 10)     : this.defaults.the_echo.serverTimeMinutes,
                channelsJoined:    echoChans   ? parseInt(echoChans.value, 10)    : this.defaults.the_echo.channelsJoined
            };

            // Persist
            localStorage.setItem('mirc_rpg_settings', JSON.stringify(this.settings));

            // Apply to Config.events
            this.applyToConfig();

            this.hide();
            console.log('[RPGSettingsUI] Settings saved:', this.settings);
        },

        // -------------------------------------------------------------------------
        // Load
        // -------------------------------------------------------------------------

        loadSettings: function () {
            const saved = localStorage.getItem('mirc_rpg_settings');
            if (saved) {
                try {
                    this.settings = JSON.parse(saved);
                } catch (e) {
                    console.error('[RPGSettingsUI] Failed to parse saved settings:', e);
                    this.settings = JSON.parse(JSON.stringify(this.defaults));
                }
            } else {
                this.settings = JSON.parse(JSON.stringify(this.defaults));
            }
            this.applyToConfig();
        },

        // -------------------------------------------------------------------------
        // Apply to Config.events
        // -------------------------------------------------------------------------

        applyToConfig: function () {
            if (!window.Config || !window.Config.events) return;

            // Time Travel Confidant → rpg_event_1 (backward compat key)
            const tt = this.settings.time_travel || this.defaults.time_travel;
            if (!window.Config.events.rpg_event_1) window.Config.events.rpg_event_1 = {};
            window.Config.events.rpg_event_1.enabled              = tt.enabled;
            window.Config.events.rpg_event_1.serverTimeMinutes    = tt.serverTimeMinutes;
            window.Config.events.rpg_event_1.channelParticipation = tt.channelParticipation;

            // The Echo → rpg_echo
            const echo = this.settings.the_echo || this.defaults.the_echo;
            if (!window.Config.events.rpg_echo) window.Config.events.rpg_echo = {};
            window.Config.events.rpg_echo.enabled           = echo.enabled;
            window.Config.events.rpg_echo.serverTimeMinutes = echo.serverTimeMinutes;
            window.Config.events.rpg_echo.channelsJoined    = echo.channelsJoined;

            console.log('[RPGSettingsUI] Applied to Config.events');
        },

        // -------------------------------------------------------------------------
        // Status indicators (live progress dots)
        // -------------------------------------------------------------------------

        updateIndicators: function () {
            this.updateTimeTravelIndicators();
            this.updateEchoIndicators();
            this.updateStatusButton();
        },

        updateTimeTravelIndicators: function () {
            if (!window.RPG || !window.RPG.state) return;

            const timeInd  = document.getElementById('tt-time-indicator');
            const partInd  = document.getElementById('tt-participation-indicator');
            const timeSlider    = document.getElementById('tt-servertime');
            const partSlider    = document.getElementById('tt-participation');
            if (!timeInd || !partInd || !timeSlider || !partSlider) return;

            const reqMinutes  = parseInt(timeSlider.value, 10);
            const reqMessages = parseInt(partSlider.value, 10);

            const rpgState = window.RPG.state;
            let curMinutes = 0;
            if (rpgState.observationStartTime) {
                curMinutes = (Date.now() - rpgState.observationStartTime) / 60000;
            }
            const curMessages = rpgState.userMessageCount || 0;

            const setDot = (el, met, cur, req, unit) => {
                el.style.backgroundColor = met ? '#00ff00' : '#ff0000';
                el.title = met
                    ? `Criteria met (${Math.floor(cur)}/${req} ${unit})`
                    : `Not yet (${Math.floor(cur)}/${req} ${unit})`;
            };

            setDot(timeInd, curMinutes >= reqMinutes,   curMinutes,  reqMinutes,  'min');
            setDot(partInd, curMessages >= reqMessages, curMessages, reqMessages, 'msg');
        },

        updateEchoIndicators: function () {
            // Echo trigger not yet auto-wired — indicators show placeholder state
            const timeInd = document.getElementById('echo-time-indicator');
            const chanInd = document.getElementById('echo-channels-indicator');
            if (!timeInd || !chanInd) return;

            // If EchoManager is active, show green; otherwise neutral gray
            const active = window.EchoManager && EchoManager.phase !== 'idle' && EchoManager.phase !== 'complete';
            timeInd.style.backgroundColor = active ? '#00ff00' : '#808080';
            chanInd.style.backgroundColor = active ? '#00ff00' : '#808080';
            timeInd.title = active ? 'Scenario active' : 'Awaiting trigger';
            chanInd.title = active ? 'Scenario active' : 'Awaiting trigger';
        },

        // -------------------------------------------------------------------------
        // Status button (live state display)
        // -------------------------------------------------------------------------

        updateStatusButton: function () {
            const btn = document.getElementById('rpg-status-btn');
            if (!btn) return;
            const status = this.getScenarioStatus(this.getSelectedScenario());
            btn.textContent = status;
            const colors = {
                'Enabled':  '#000080',
                'Disabled': '#666666',
                'Active':   '#006600',
                'Complete': '#660066'
            };
            btn.style.color = colors[status] || '#000000';
        },

        getSelectedScenario: function () {
            const sel = document.getElementById('rpg-scenario-selector');
            return sel ? sel.value : 'time_travel';
        },

        getScenarioStatus: function (scenario) {
            if (scenario === 'time_travel') {
                const s = this.settings.time_travel || this.defaults.time_travel;
                if (!s.enabled) return 'Disabled';
                if (!window.RPG || !RPG.state || !RPG.state.triggered) return 'Enabled';
                if (window.ConfidantManager && ConfidantManager.stage === 'free_chat') return 'Complete';
                return 'Active';
            }
            if (scenario === 'the_echo') {
                const s = this.settings.the_echo || this.defaults.the_echo;
                if (!s.enabled) return 'Disabled';
                if (!window.EchoManager) return 'Enabled';
                if (EchoManager.phase === 'complete') return 'Complete';
                if (EchoManager.phase !== 'idle') return 'Active';
                return 'Enabled';
            }
            return 'Enabled';
        },

        // -------------------------------------------------------------------------
        // Action bar handlers
        // -------------------------------------------------------------------------

        handleForceTrigger: function () {
            const scenario = this.getSelectedScenario();
            if (scenario === 'time_travel') {
                if (!window.RPG) return;
                // init() if the session hasn't started yet (user not connected)
                if (!RPG.state.initialized) RPG.init();
                TimeTravelPlugin.triggerApproachNow();
            } else if (scenario === 'the_echo') {
                if (window.EchoPlugin) EchoPlugin.trigger();
            }
        },

        handleSetComplete: function () {
            const scenario = this.getSelectedScenario();
            if (scenario === 'time_travel') {
                if (!window.RPG || !window.ConfidantManager || !window.PrivateMessaging) return;
                // Ensure a confidant is selected
                if (!ConfidantManager.confidant) {
                    ConfidantManager.confidant = ConfidantManager.selectConfidant();
                }
                if (!ConfidantManager.confidant) return;
                // Mark triggered + skip directly to free_chat
                if (!RPG.state.initialized) RPG.init();
                RPG.state.triggered = true;
                // Register active plugin so PM routing works
                if (window.RPGManager) {
                    const plugin = RPGManager.plugins.find(p => p.name === 'TimeTravelConfidant');
                    if (plugin) RPGManager.setActivePlugin(plugin);
                }
                ConfidantManager.stage = 'free_chat';
                // Fire the post-quest opening message
                setTimeout(() => {
                    PrivateMessaging.sendMessage(
                        ConfidantManager.confidant.nickname,
                        "so... feel free to ask me anything i guess? still wrapping my head around all this lol",
                        false
                    );
                }, 500);
            } else if (scenario === 'the_echo') {
                if (!window.EchoManager) return;
                // Ensure EchoManager is initialised and has a pastNick so coda can fire
                if (!EchoManager.initialized) EchoManager.init();
                if (!EchoManager.pastNick) {
                    const userNick = (window.Config && Config.state && Config.state.nickname) || 'User';
                    EchoManager.pastNick = userNick + '_';
                }
                // Jump straight to the final coda message
                EchoManager._sendCoda();
            }
        },

        handleReset: function () {
            const scenario = this.getSelectedScenario();
            if (scenario === 'time_travel') {
                if (window.TimeTravelPlugin) TimeTravelPlugin.reset();
            } else if (scenario === 'the_echo') {
                if (window.EchoManager) EchoManager.reset();
            }
        },

        // -------------------------------------------------------------------------
        // Wire live slider labels
        // -------------------------------------------------------------------------

        wireSliders: function () {
            const wire = (sliderId, labelId, suffix, enabledId) => {
                const slider  = document.getElementById(sliderId);
                const label   = document.getElementById(labelId);
                const checkbox = enabledId ? document.getElementById(enabledId) : null;
                if (!slider || !label) return;

                slider.addEventListener('input', () => {
                    label.textContent = `${slider.value}${suffix}`;
                });
                if (checkbox) {
                    checkbox.addEventListener('change', () => {
                        slider.disabled = !checkbox.checked;
                        const pairSlider = slider.id.startsWith('tt-')
                            ? (slider.id === 'tt-servertime' ? document.getElementById('tt-participation') : document.getElementById('tt-servertime'))
                            : (slider.id === 'echo-servertime' ? document.getElementById('echo-channels') : document.getElementById('echo-servertime'));
                        if (pairSlider) pairSlider.disabled = !checkbox.checked;
                    });
                }
            };

            wire('tt-servertime',    'tt-servertime-label',     ' min', 'tt-enabled');
            wire('tt-participation', 'tt-participation-label',  ' msg', null);
            wire('echo-servertime',  'echo-servertime-label',   ' min', 'echo-enabled');
            wire('echo-channels',    'echo-channels-label',     '',     null);
        },

        // -------------------------------------------------------------------------
        // Drag
        // -------------------------------------------------------------------------

        setupDrag: function () {
            const content = this.modal.querySelector('.event-modal-content');
            const header  = this.modal.querySelector('.window-titlebar');
            if (!content || !header) return;

            let dragging = false, startX, startY;

            header.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                dragging = true;
                const r = content.getBoundingClientRect();
                startX = e.clientX - r.left;
                startY = e.clientY - r.top;
            });
            document.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                e.preventDefault();
                content.style.left      = (e.clientX - startX) + 'px';
                content.style.top       = (e.clientY - startY) + 'px';
                content.style.transform = 'none';
            });
            document.addEventListener('mouseup', () => { dragging = false; });
        }
    };

    // ---------------------------------------------------------------------------------
    // Boot
    // ---------------------------------------------------------------------------------

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => RPGSettingsUI.init());
    } else {
        RPGSettingsUI.init();
    }

    window.RPGSettingsUI = RPGSettingsUI;

})();
