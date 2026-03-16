/**
 * Event Settings UI
 * Manages the event settings modal for configuring IRC event timers
 */

(function() {
    'use strict';

    const EventSettingsUI = {
        modal: null,
        globalEventsList: null,
        channelEventsList: null,
        settingsCache: {},
        initialized: false,

        // Event classifications (must match event-simulator.js)
        globalEvents: ['quit', 'netsplit', 'kline'],
        channelEvents: ['join', 'part', 'topic_change', 'kick', 'mode', 'idle_chatter'],

        // Slider ranges for each event type (seconds, except RPG which uses minutes/messages)
        sliderRanges: {
            'join': { min: 10, max: 180 },
            'part': { min: 15, max: 300 },
            'quit': { min: 30, max: 300 },
            'topic_change': { min: 60, max: 600 },
            'kick': { min: 60, max: 900 },
            'mode': { min: 30, max: 600 },
            'netsplit': { min: 120, max: 900 },
            'kline': { min: 300, max: 1800 },
            'idle_chatter': { min: 5, max: 120 }
        },

        // Activity presets
        presets: {
            'chaotic': {
                name: 'Chaotic',
                description: 'Fast-paced, high activity',
                settings: {
                    'join': { enabled: true, frequency: 15 },
                    'part': { enabled: true, frequency: 20 },
                    'quit': { enabled: true, frequency: 30 },
                    'topic_change': { enabled: true, frequency: 60 },
                    'kick': { enabled: true, frequency: 90 },
                    'mode': { enabled: true, frequency: 40 },
                    'netsplit': { enabled: true, frequency: 120 },
                    'kline': { enabled: true, frequency: 300 },
                    'idle_chatter': { enabled: true, frequency: 10 }
                }
            },
            'normal': {
                name: 'Normal',
                description: 'Balanced activity',
                settings: {
                    'join': { enabled: true, frequency: 45 },
                    'part': { enabled: true, frequency: 60 },
                    'quit': { enabled: true, frequency: 90 },
                    'topic_change': { enabled: false, frequency: 180 },
                    'kick': { enabled: false, frequency: 240 },
                    'mode': { enabled: true, frequency: 120 },
                    'netsplit': { enabled: true, frequency: 300 },
                    'kline': { enabled: false, frequency: 600 },
                    'idle_chatter': { enabled: true, frequency: 20 }
                }
            },
            'chill': {
                name: 'Chill',
                description: 'Relaxed, minimal activity',
                settings: {
                    'join': { enabled: true, frequency: 90 },
                    'part': { enabled: true, frequency: 120 },
                    'quit': { enabled: true, frequency: 180 },
                    'topic_change': { enabled: false, frequency: 300 },
                    'kick': { enabled: false, frequency: 600 },
                    'mode': { enabled: false, frequency: 180 },
                    'netsplit': { enabled: false, frequency: 600 },
                    'kline': { enabled: false, frequency: 900 },
                    'idle_chatter': { enabled: true, frequency: 60 }
                }
            }
        },

        currentPreset: 'normal',

        /**
         * Initialize the event settings UI
         */
        init: function() {
            // Prevent multiple initializations
            if (this.initialized) {
                return;
            }

            // Wait for Config to be ready
            if (!window.Config || !window.Config.events) {
                console.warn('Config not ready, retrying EventSettingsUI initialization...');
                setTimeout(() => this.init(), 200);
                return;
            }

            this.modal = document.getElementById('event-settings-modal');
            this.globalEventsList = document.getElementById('global-events-list');
            this.channelEventsList = document.getElementById('channel-events-list');

            console.log('EventSettingsUI - Modal found:', !!this.modal);
            console.log('EventSettingsUI - Lists found:', !!this.globalEventsList, !!this.channelEventsList);

            if (!this.modal) {
                console.error('Event settings modal not found in DOM');
                return;
            }

            // Force modal hidden on init
            this.modal.style.display = 'none';
            this.modal.classList.remove('show');

            // Load saved settings from localStorage
            this.loadSettings();

            // Wire up button handlers
            const btnSettings = document.getElementById('btn-event-settings');
            const btnClose = document.getElementById('close-settings-modal');
            const btnMinimize = document.getElementById('minimize-settings-modal');
            const btnCancel = document.getElementById('cancel-event-settings');
            const btnSave = document.getElementById('save-event-settings');

            console.log('Gear button found:', !!btnSettings);
            console.log('Gear button element:', btnSettings);
            
            if (btnSettings) {
                console.log('Attaching click listener to gear button');
                btnSettings.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Gear button clicked!');
                    this.show();
                });
                console.log('Click listener attached');
            } else {
                console.error('btn-event-settings not found!');
            }
            if (btnClose) btnClose.addEventListener('click', () => this.hide());
            if (btnMinimize) btnMinimize.addEventListener('click', () => this.hide());
            if (btnCancel) btnCancel.addEventListener('click', () => this.hide());
            if (btnSave) btnSave.addEventListener('click', () => this.save());

            // Wire up preset selector
            const presetSelector = document.getElementById('preset-selector');
            if (presetSelector) {
                presetSelector.addEventListener('change', (e) => {
                    this.onPresetChange(e.target.value);
                });
            }

            // Setup drag functionality
            this.setupDrag();

            // Close modal on background click
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            });

            // Escape key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                    this.hide();
                }
            });

            this.initialized = true;
            console.log('EventSettingsUI initialized');
        },

        /**
         * Show the modal and populate event lists
         */
        show: function() {
            console.log('Opening event settings modal');
            console.log('this.modal:', this.modal);
            
            if (!this.modal) {
                console.error('Modal element not found!');
                return;
            }
            
            console.log('About to populate event lists...');
            try {
                this.populateEventLists();
                console.log('Event lists populated successfully');
            } catch (e) {
                console.error('Error populating event lists:', e);
            }
            
            // Update preset dropdown to show current preset
            const dropdown = document.getElementById('preset-selector');
            if (dropdown) {
                dropdown.value = this.currentPreset;
                console.log('[EventSettings] Preset dropdown set to:', this.currentPreset);
            }
            
            // Force critical styles inline to bypass any CSS caching issues
            this.modal.style.position = 'fixed';
            this.modal.style.zIndex = '9999';
            this.modal.style.left = '0';
            this.modal.style.top = '0';
            this.modal.style.width = '100%';
            this.modal.style.height = '100%';
            this.modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            this.modal.style.alignItems = 'center';
            this.modal.style.justifyContent = 'center';
            this.modal.style.display = 'flex';
            this.modal.classList.add('show');
            
            // Force styles on modal content box too
            const modalContent = this.modal.querySelector('.event-modal-content');
            if (modalContent) {
                modalContent.style.backgroundColor = '#c0c0c0';
                modalContent.style.border = '2px outset #ffffff';
                modalContent.style.boxShadow = '4px 4px 0px rgba(0, 0, 0, 0.5)';
                modalContent.style.width = '315px';
                modalContent.style.maxWidth = '90%';
                modalContent.style.maxHeight = '85vh';
                modalContent.style.display = 'flex';
                modalContent.style.flexDirection = 'column';
                modalContent.style.position = 'absolute';
                modalContent.style.zIndex = '10000';
                // Reset position to center when showing
                modalContent.style.top = '50%';
                modalContent.style.left = '50%';
                modalContent.style.transform = 'translate(-50%, -50%)';
            }
            
            // Force styles on modal header (using window classes now, so minimal overrides needed)
            const modalHeader = this.modal.querySelector('.window-titlebar');
            if (modalHeader) {
                // Just ensure it's not trying to move the window
                modalHeader.style.cursor = 'move';
            }
            
            // Force styles on modal body
            const modalBody = this.modal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.style.padding = '12px 16px';
                modalBody.style.overflowY = 'auto';
                modalBody.style.flex = '1';
                modalBody.style.backgroundColor = '#c0c0c0';
            }
            
            // Force styles on section headers
            const sectionHeaders = this.modal.querySelectorAll('.event-section h3');
            sectionHeaders.forEach(header => {
                header.style.fontSize = '12px';
                header.style.fontWeight = 'bold';
                header.style.marginBottom = '8px';
                header.style.padding = '0';
                header.style.background = 'transparent';
                header.style.color = '#000000';
                header.style.border = 'none';
                header.style.fontFamily = "'MS Sans Serif', 'Tahoma', sans-serif";
            });
            
            // Force styles on modal footer
            const modalFooter = this.modal.querySelector('.modal-footer');
            if (modalFooter) {
                modalFooter.style.padding = '10px 12px';
                modalFooter.style.backgroundColor = '#c0c0c0';
                modalFooter.style.borderTop = '2px groove #ffffff';
                modalFooter.style.display = 'flex';
                modalFooter.style.justifyContent = 'center';
                modalFooter.style.gap = '8px';
            }

            console.log('Modal classes after show:', this.modal.className);
            console.log('Modal computed display:', window.getComputedStyle(this.modal).display);
            console.log('Modal position:', window.getComputedStyle(this.modal).position);
            console.log('Modal z-index:', window.getComputedStyle(this.modal).zIndex);
            console.log('Modal width/height:', window.getComputedStyle(this.modal).width, window.getComputedStyle(this.modal).height);
        },

        /**
         * Hide the modal
         */
        hide: function() {
            console.log('Closing event settings modal');
            this.modal.style.display = 'none';
            this.modal.classList.remove('show');
        },

        /**
         * Setup drag functionality for the modal
         */
        setupDrag: function() {
            const modalContent = this.modal.querySelector('.event-modal-content');
            const modalHeader = this.modal.querySelector('.window-titlebar');
            
            if (!modalContent || !modalHeader) {
                console.log('Drag setup - modalContent:', !!modalContent, 'modalHeader:', !!modalHeader);
                return;
            }

            let isDragging = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;

            modalHeader.addEventListener('mousedown', (e) => {
                // Don't drag if clicking on buttons
                if (e.target.tagName === 'BUTTON') return;

                isDragging = true;
                const rect = modalContent.getBoundingClientRect();
                initialX = e.clientX - rect.left;
                initialY = e.clientY - rect.top;
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                modalContent.style.left = currentX + 'px';
                modalContent.style.top = currentY + 'px';
                modalContent.style.transform = 'none';
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
        },

        /**
         * Apply a preset to the UI and cache
         * @param {string} presetName - Name of preset (chaotic, normal, chill)
         */
        applyPreset: function(presetName) {
            if (!this.presets[presetName]) {
                console.error('Unknown preset:', presetName);
                return;
            }

            const preset = this.presets[presetName];
            console.log(`[EventSettings] Applying preset: ${preset.name}`);

            // Update settingsCache
            this.settingsCache = JSON.parse(JSON.stringify(preset.settings));
            
            // Update UI elements for time-based events
            [...this.globalEvents, ...this.channelEvents].forEach(eventType => {
                const settings = preset.settings[eventType];
                if (!settings) return;

                const checkbox = document.getElementById(`event-${eventType}-enabled`);
                const slider = document.getElementById(`event-${eventType}-frequency`);
                const label = document.getElementById(`event-${eventType}-label`);

                if (checkbox) checkbox.checked = settings.enabled;
                if (slider) {
                    slider.value = settings.frequency;
                    slider.disabled = !settings.enabled;
                }
                if (label) label.textContent = `Every ${settings.frequency}s`;
            });

            this.currentPreset = presetName;
            
            // Update dropdown
            const dropdown = document.getElementById('preset-selector');
            if (dropdown) dropdown.value = presetName;
        },

        /**
         * Detect which preset matches current settings (if any)
         * @returns {string} Preset name or 'custom'
         */
        detectCurrentPreset: function() {
            // Check each preset
            for (const [presetName, preset] of Object.entries(this.presets)) {
                let matches = true;
                
                for (const [eventType, settings] of Object.entries(preset.settings)) {
                    const cached = this.settingsCache[eventType];
                    if (!cached || cached.enabled !== settings.enabled) {
                        matches = false;
                        break;
                    }
                    
                    // Check time-based events
                    if (settings.frequency !== undefined) {
                        if (cached.frequency !== settings.frequency) {
                            matches = false;
                            break;
                        }
                    }
                    
                    // Check RPG events
                    if (settings.serverTimeMinutes !== undefined) {
                        if (cached.serverTimeMinutes !== settings.serverTimeMinutes ||
                            cached.channelParticipation !== settings.channelParticipation) {
                            matches = false;
                            break;
                        }
                    }
                }
                
                if (matches) return presetName;
            }
            
            return 'custom';
        },

        /**
         * Handle preset dropdown change
         */
        onPresetChange: function(presetName) {
            console.log('[EventSettings] Preset changed to:', presetName);
            
            if (presetName === 'custom') {
                // Custom selected - do nothing, user will adjust manually
                return;
            }
            
            this.applyPreset(presetName);
        },

        /**
         * Handle individual setting change (auto-switch to Custom)
         */
        onSettingChange: function() {
            // Update settingsCache from UI for time-based events
            [...this.globalEvents, ...this.channelEvents].forEach(eventType => {
                const checkbox = document.getElementById(`event-${eventType}-enabled`);
                const slider = document.getElementById(`event-${eventType}-frequency`);

                if (checkbox && slider && this.settingsCache) {
                    if (!this.settingsCache[eventType]) {
                        this.settingsCache[eventType] = {};
                    }
                    this.settingsCache[eventType].enabled = checkbox.checked;
                    this.settingsCache[eventType].frequency = parseInt(slider.value, 10);
                }
            });

            // Detect if settings still match a preset
            const detected = this.detectCurrentPreset();
            this.currentPreset = detected;
            
            // Update dropdown to show Custom if no match
            const dropdown = document.getElementById('preset-selector');
            if (dropdown) {
                dropdown.value = detected;
            }
        },

        /**
         * Load settings from localStorage
         */
        loadSettings: function() {
            const saved = localStorage.getItem('mirc_event_settings');
            const savedPreset = localStorage.getItem('mirc_event_preset');
            
            console.log('[EventSettings] Loading settings from localStorage...');
            console.log('[EventSettings] Saved settings:', saved);
            
            if (saved) {
                try {
                    this.settingsCache = JSON.parse(saved);
                    console.log('[EventSettings] Parsed settingsCache:', this.settingsCache);
                    console.log('[EventSettings] RPG settings in cache:', this.settingsCache.rpg_event_1);
                    // Note: applySettings() will be called by Config.loadConfigurations() after defaults are loaded
                } catch (e) {
                    console.error('Failed to parse saved event settings:', e);
                }
            } else {
                console.log('[EventSettings] No saved settings, using Normal preset as default');
                // No saved settings, use Normal preset as default
                this.applyPreset('normal');
            }

            // Load saved preset name (or detect from settings)
            if (savedPreset) {
                this.currentPreset = savedPreset;
            } else {
                this.currentPreset = this.detectCurrentPreset();
            }
            
            console.log('[EventSettings] loadSettings() complete. Current preset:', this.currentPreset);
        },

        /**
         * Apply cached settings to Config.events
         */
        applySettings: function() {
            console.log('[EventSettings] applySettings() called');
            console.log('[EventSettings] settingsCache content:', JSON.stringify(this.settingsCache, null, 2));
            
            if (!window.Config || !window.Config.events) {
                console.warn('[EventSettings] Config.events not available yet');
                return;
            }
            
            console.log('[EventSettings] Config.events BEFORE applying:', JSON.stringify(window.Config.events, null, 2));

            for (const eventType in this.settingsCache) {
                const settings = this.settingsCache[eventType];
                console.log(`[EventSettings] Processing ${eventType}:`, settings);
                
                // Create event entry if it doesn't exist yet
                if (!window.Config.events[eventType]) {
                    console.log(`[EventSettings] Creating Config.events.${eventType} entry`);
                    window.Config.events[eventType] = {};
                }
                
                // Apply enabled state
                window.Config.events[eventType].enabled = settings.enabled;
                
                // Apply frequency (for time-based events)
                if (settings.frequency !== undefined) {
                    window.Config.events[eventType].frequency = settings.frequency;
                }
                
                // Apply RPG-specific settings
                if (settings.serverTimeMinutes !== undefined) {
                    window.Config.events[eventType].serverTimeMinutes = settings.serverTimeMinutes;
                    console.log(`[EventSettings] ✅ Applied serverTimeMinutes=${settings.serverTimeMinutes} to ${eventType}`);
                }
                if (settings.channelParticipation !== undefined) {
                    window.Config.events[eventType].channelParticipation = settings.channelParticipation;
                    console.log(`[EventSettings] ✅ Applied channelParticipation=${settings.channelParticipation} to ${eventType}`);
                }
            }
            
            console.log('[EventSettings] Config.events AFTER applying:', JSON.stringify(window.Config.events, null, 2));
            console.log('[EventSettings] Config.events.rpg_event_1 final state:', window.Config.events.rpg_event_1);
        },

        /**
         * Save settings to localStorage and update runtime config
         */
        save: function() {
            // Update settingsCache from UI
            this.settingsCache = {};

            [...this.globalEvents, ...this.channelEvents].forEach(eventType => {
                const checkbox = document.getElementById(`event-${eventType}-enabled`);
                const slider = document.getElementById(`event-${eventType}-frequency`);

                if (checkbox && slider) {
                    this.settingsCache[eventType] = {
                        enabled: checkbox.checked,
                        frequency: parseInt(slider.value, 10)
                    };
                }
            });

            // Save to localStorage
            localStorage.setItem('mirc_event_settings', JSON.stringify(this.settingsCache));
            
            // Detect and save current preset
            this.currentPreset = this.detectCurrentPreset();
            localStorage.setItem('mirc_event_preset', this.currentPreset);
            console.log('[EventSettings] Saved preset:', this.currentPreset);

            // Apply to runtime config
            this.applySettings();

            // Restart timers with new settings
            if (window.EventSimulator) {
                // Stop all timers
                window.EventSimulator.stopAllEvents();
                
                // Restart global events
                window.EventSimulator.startAllEvents();

                // Restart channel events for all open channels
                if (window.App && window.App.state && window.App.state.channelUsers) {
                    const channels = Object.keys(window.App.state.channelUsers).filter(ch => ch !== 'Status');
                    console.log(`[EventSettings] Restarting channel events for ${channels.length} channels:`, channels);
                    for (const channel of channels) {
                        window.EventSimulator.stopChannelEvents(channel);
                        window.EventSimulator.startChannelEvents(channel);
                    }
                }
            }

            this.hide();
        },

        /**
         * Populate the event lists with controls
         */
        populateEventLists: function() {
            if (!window.Config || !window.Config.events) {
                console.error('Config.events not loaded');
                return;
            }

            // Clear existing lists
            this.globalEventsList.innerHTML = '';
            this.channelEventsList.innerHTML = '';

            // Populate global events
            this.globalEvents.forEach(eventType => {
                const eventConfig = window.Config.events[eventType];
                if (eventConfig) {
                    this.globalEventsList.appendChild(this.createEventControl(eventType, eventConfig));
                }
            });

            // Populate channel events
            this.channelEvents.forEach(eventType => {
                const eventConfig = window.Config.events[eventType];
                if (eventConfig) {
                    this.channelEventsList.appendChild(this.createEventControl(eventType, eventConfig));
                }
            });

        },

        /**
         * Create a control element for an event
         */
        createEventControl: function(eventType, eventConfig) {
            const container = document.createElement('div');
            container.className = 'event-item';
            
            // Force inline styles to bypass cache
            container.style.backgroundColor = 'transparent';
            container.style.border = 'none';
            container.style.padding = '0 0 8px 0';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '4px';

            // Get slider range for this event type
            const range = this.sliderRanges[eventType] || { min: 10, max: 300 };

            // Capitalize event type for display
            const displayName = eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

            // Get current values (from cache if available, otherwise from config)
            const cached = this.settingsCache[eventType];
            const enabled = cached ? cached.enabled : eventConfig.enabled;
            const frequency = cached ? cached.frequency : eventConfig.frequency;

            container.innerHTML = `
                <div class="event-item-header" style="display: flex; align-items: center; gap: 6px; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 6px; flex: 0;">
                        <input type="checkbox" 
                               id="event-${eventType}-enabled" 
                               class="event-checkbox" 
                               style="width: 13px; height: 13px; cursor: pointer; margin: 0;"
                               ${enabled ? 'checked' : ''}>
                        <label for="event-${eventType}-enabled" 
                               style="font-weight: normal; font-size: 11px; cursor: pointer; font-family: 'Consolas', 'Courier New', monospace; white-space: nowrap;">
                            ${displayName}
                        </label>
                    </div>
                    <label class="event-slider-label" 
                           id="event-${eventType}-label"
                           style="font-size: 11px; color: #000000; font-family: 'Consolas', 'Courier New', monospace; text-align: right; white-space: nowrap;">
                        Every ${frequency}s
                    </label>
                </div>
                <div class="event-slider-container" style="display: flex; flex-direction: column; gap: 3px; padding-left: 0;">
                    <input type="range" 
                           id="event-${eventType}-frequency" 
                           class="event-slider" 
                           min="${range.min}" 
                           max="${range.max}" 
                           value="${frequency}"
                           ${enabled ? '' : 'disabled'}>
                </div>
            `;

            // Wire up checkbox to enable/disable slider
            const checkbox = container.querySelector(`#event-${eventType}-enabled`);
            const slider = container.querySelector(`#event-${eventType}-frequency`);
            const label = container.querySelector(`#event-${eventType}-label`);

            checkbox.addEventListener('change', () => {
                slider.disabled = !checkbox.checked;
                this.onSettingChange();
            });

            slider.addEventListener('input', () => {
                const value = parseInt(slider.value, 10);
                label.textContent = `Every ${value}s`;
                this.onSettingChange();
            });

            return container;
        },

        /**
         * Format frequency as human-readable rate
         */
        formatFrequency: function(seconds) {
            if (seconds < 60) {
                return `~${Math.floor(60 / seconds)}/min`;
            } else if (seconds < 3600) {
                const minutes = Math.floor(seconds / 60);
                return `~${Math.floor(60 / seconds)}/min (every ${minutes}m)`;
            } else {
                const hours = Math.floor(seconds / 3600);
                return `~${Math.floor(3600 / seconds)}/hour (every ${hours}h)`;
            }
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => EventSettingsUI.init());
    } else {
        EventSettingsUI.init();
    }

    // Expose to window for external access
    window.EventSettingsUI = EventSettingsUI;
})();
