/**
 * UI Manager - mIRC LLM Simulator
 * Handles all UI rendering and updates
 */

const UI = {
    // DOM element references
    elements: {},

    // Message history per window
    messageHistory: {},

    // Active window
    activeWindow: 'Status',

    /**
     * Initialize UI - cache DOM elements and set up event listeners
     */
    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.initializeStatusWindow();
        
        // Make toolbar icons bigger
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.style.fontSize = '18px';
        });
    },

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.elements = {
            // Connection dialog
            connectionDialog: document.getElementById('connection-dialog'),
            serverInput: document.getElementById('server-address'),
            nicknameInput: document.getElementById('nickname'),
            rememberCheckbox: document.getElementById('remember-settings'),
            connectButton: document.getElementById('btn-connect'),
            demoButton: document.getElementById('btn-demo-mode'),
            connectionStatus: document.getElementById('connection-status'),

            // Main interface
            mainContainer: document.getElementById('main-container'),
            demoBanner: document.getElementById('demo-banner'),

            // Status bar
            statusIcon: document.getElementById('status-icon'),
            statusText: document.getElementById('status-text'),
            currentServer: document.getElementById('current-server'),
            currentNickname: document.getElementById('current-nickname'),

            // MDI interface
            mdiContainer: document.getElementById('mdi-container'),
            mdiWorkspace: document.querySelector('.mdi-workspace'),
            switchbar: document.getElementById('switchbar'),

            // Toolbar buttons
            disconnectButton: document.getElementById('btn-disconnect'),

            // Status display
            currentWindowDisplay: document.getElementById('current-window'),
            userCount: document.getElementById('user-count'),
            modeIndicator: document.getElementById('mode-indicator')
        };
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Delegate event for window inputs (since they're created dynamically)
        document.addEventListener('keypress', (e) => {
            if (e.target.classList.contains('window-input') && e.key === 'Enter') {
                const message = e.target.value.trim();
                if (message) {
                    window.App.handleUserMessage(message);
                    e.target.value = '';
                }
            }
        });

        // Delegate event for window dragging
        document.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-titlebar')) {
                const titlebar = e.target.closest('.window-titlebar');
                const mdiWindow = titlebar.closest('.mdi-window');
                if (mdiWindow) {
                    this.startWindowDrag(mdiWindow, e);
                }
            }
        });

        // Delegate event for window resizing
        document.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('window-resize-handle')) {
                const mdiWindow = e.target.closest('.mdi-window');
                if (mdiWindow) {
                    this.startWindowResize(mdiWindow, e);
                }
            }
        });

        // Delegate event for window activation
        document.addEventListener('mousedown', (e) => {
            const mdiWindow = e.target.closest('.mdi-window');
            if (mdiWindow) {
                this.activateWindow(mdiWindow.dataset.window);
            }
        });

        // Delegate event for window controls
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-btn')) {
                const mdiWindow = e.target.closest('.mdi-window');
                if (mdiWindow && mdiWindow.dataset.window !== 'Status') {
                    this.closeWindow(mdiWindow.dataset.window);
                }
            } else if (e.target.classList.contains('minimize-btn')) {
                const mdiWindow = e.target.closest('.mdi-window');
                if (mdiWindow) {
                    this.minimizeWindow(mdiWindow.dataset.window);
                }
            } else if (e.target.classList.contains('maximize-btn')) {
                const mdiWindow = e.target.closest('.mdi-window');
                if (mdiWindow) {
                    this.maximizeWindow(mdiWindow.dataset.window);
                }
            }
        });

        // Delegate event for switchbar buttons
        document.addEventListener('click', (e) => {
            const switchBtn = e.target.closest('.switch-btn');
            if (switchBtn) {
                const windowName = switchBtn.dataset.window;
                const win = document.getElementById(`window-${windowName}`);
                if (win) {
                    if (win.classList.contains('minimized')) {
                        win.classList.remove('minimized');
                    }
                    this.activateWindow(windowName);
                }
            }
        });

        // Theme toggle button
        const themeBtn = document.getElementById('btn-theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const themeName = Config.cycleTheme();
                this.updateThemeButtonTooltip(themeName);
                console.log(`[UI] Switched to theme: ${themeName}`);
            });
        }

        // Window management buttons
        const minimizeAllBtn = document.getElementById('btn-minimize-all');
        const cascadeBtn = document.getElementById('btn-cascade');
        const tileBtn = document.getElementById('btn-tile');
        
        if (minimizeAllBtn) {
            minimizeAllBtn.addEventListener('click', () => {
                this.minimizeAllWindows();
            });
        }
        
        if (cascadeBtn) {
            cascadeBtn.addEventListener('click', () => {
                this.cascadeWindows();
            });
        }
        
        if (tileBtn) {
            tileBtn.addEventListener('click', () => {
                this.tileWindows();
            });
        }
    },

    /**
     * Update theme button tooltip
     * @param {string} themeName - Display name of the theme
     */
    updateThemeButtonTooltip(themeName) {
        const themeBtn = document.getElementById('btn-theme-toggle');
        if (themeBtn) {
            themeBtn.title = `Theme: ${themeName}`;
        }
    },

    /**
     * Initialize Status window
     */
    initializeStatusWindow() {
        this.messageHistory['Status'] = [];
        this.activeWindow = 'Status';
        this.nextZIndex = 101; // Start z-index for windows
        this.windowStates = {}; // Track window states (position, size, minimized, maximized)
    },

    /**
     * Start dragging a window
     * @param {HTMLElement} mdiWindow - The window element
     * @param {MouseEvent} e - Mouse event
     */
    startWindowDrag(mdiWindow, e) {
        e.preventDefault();
        this.activateWindow(mdiWindow.dataset.window);

        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = mdiWindow.offsetLeft;
        const startTop = mdiWindow.offsetTop;

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            mdiWindow.style.left = `${startLeft + deltaX}px`;
            mdiWindow.style.top = `${startTop + deltaY}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    },

    /**
     * Start resizing a window
     * @param {HTMLElement} mdiWindow - The window element
     * @param {MouseEvent} e - Mouse event
     */
    startWindowResize(mdiWindow, e) {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = mdiWindow.offsetWidth;
        const startHeight = mdiWindow.offsetHeight;

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            const newWidth = Math.max(300, startWidth + deltaX);
            const newHeight = Math.max(200, startHeight + deltaY);
            mdiWindow.style.width = `${newWidth}px`;
            mdiWindow.style.height = `${newHeight}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    },

    /**
     * Activate a window (bring to front)
     * @param {string} windowName - Window name
     */
    activateWindow(windowName) {
        const mdiWindow = document.getElementById(`window-${windowName}`);
        if (!mdiWindow) return;

        // Remove active class from all windows
        document.querySelectorAll('.mdi-window').forEach(win => {
            win.classList.remove('active');
        });

        // Add active class to this window
        mdiWindow.classList.add('active');
        mdiWindow.style.zIndex = this.nextZIndex++;

        // Update switchbar
        document.querySelectorAll('.switch-btn').forEach(btn => {
            if (btn.dataset.window === windowName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.activeWindow = windowName;
        this.updateCurrentWindow(windowName);
        
        // Update Config to track current channel for event simulator
        Config.setChannel(windowName);

        // Focus the input in this window
        const input = mdiWindow.querySelector('.window-input');
        if (input) input.focus();
    },

    /**
     * Cascade all windows (staggered layout starting with Status)
     */
    cascadeWindows() {
        // Get all non-minimized windows
        const windows = Array.from(document.querySelectorAll('.mdi-window'));
        
        if (windows.length === 0) return;

        // Sort windows: Status first, then others
        windows.sort((a, b) => {
            const aName = a.dataset.window;
            const bName = b.dataset.window;
            if (aName === 'Status') return -1;
            if (bName === 'Status') return 1;
            return 0;
        });

        // Cascade parameters
        const startX = 0;
        const startY = 0;
        const offsetX = 25;
        const offsetY = 25;
        const defaultWidth = 500;
        const defaultHeight = 400;

        // Position each window
        windows.forEach((win, index) => {
            // Restore if maximized
            win.classList.remove('maximized');
            
            // Calculate position
            const x = startX + (index * offsetX);
            const y = startY + (index * offsetY);
            
            // Apply position and size
            win.style.left = x + 'px';
            win.style.top = y + 'px';
            win.style.width = defaultWidth + 'px';
            win.style.height = defaultHeight + 'px';
            win.style.transform = 'none';
        });

        // Activate the last window in cascade (brings it to front)
        if (windows.length > 0) {
            this.activateWindow(windows[windows.length - 1].dataset.window);
        }
    },

    /**
     * Tile all non-minimized windows (grid layout)
     */
    tileWindows() {
        // Get all non-minimized windows
        const windows = Array.from(document.querySelectorAll('.mdi-window:not(.minimized)'));
        
        if (windows.length === 0) return;

        // Get workspace dimensions (mdi-workspace)
        const workspace = document.querySelector('.mdi-workspace');
        if (!workspace) return;

        const workspaceRect = workspace.getBoundingClientRect();
        const workspaceWidth = workspaceRect.width;
        const workspaceHeight = workspaceRect.height;

        // Calculate grid dimensions
        const count = windows.length;
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);

        // Calculate window size with padding
        const padding = 0;
        const windowWidth = (workspaceWidth / cols) - (padding * 2);
        const windowHeight = (workspaceHeight / rows) - (padding * 2);

        // Position each window
        windows.forEach((win, index) => {
            // Restore if maximized
            win.classList.remove('maximized');
            
            // Calculate grid position
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            const x = padding + (col * (windowWidth + padding * 2));
            const y = padding + (row * (windowHeight + padding * 2));
            
            // Apply position and size
            win.style.left = x + 'px';
            win.style.top = y + 'px';
            win.style.width = windowWidth + 'px';
            win.style.height = windowHeight + 'px';
            win.style.transform = 'none';
        });
    },

    /**
     * Minimize a window
     * @param {string} windowName - Window name
     */
    minimizeWindow(windowName) {
        const mdiWindow = document.getElementById(`window-${windowName}`);
        if (mdiWindow) {
            mdiWindow.classList.add('minimized');
            // Switch to another window if this was active
            if (this.activeWindow === windowName) {
                const otherWindow = document.querySelector('.mdi-window:not(.minimized)');
                if (otherWindow) {
                    this.activateWindow(otherWindow.dataset.window);
                }
            }
        }
    },

    /**
     * Minimize all windows except Status
     */
    minimizeAllWindows() {
        const windows = document.querySelectorAll('.mdi-window');
        let hasNonStatusWindow = false;
        
        windows.forEach(win => {
            const windowName = win.dataset.window;
            // Don't minimize Status window
            if (windowName !== 'Status') {
                win.classList.add('minimized');
                hasNonStatusWindow = true;
            }
        });
        
        // If we minimized any windows, make Status active
        if (hasNonStatusWindow) {
            this.activateWindow('Status');
        }
    },

    /**
     * Cascade all windows (staggered layout starting with Status)
     */
    cascadeWindows() {
        // Get all windows (including minimized for now, we'll restore them)
        const windows = Array.from(document.querySelectorAll('.mdi-window'));
        
        if (windows.length === 0) return;

        // Sort windows: Status first, then others
        windows.sort((a, b) => {
            const aName = a.dataset.window;
            const bName = b.dataset.window;
            if (aName === 'Status') return -1;
            if (bName === 'Status') return 1;
            return 0;
        });

        // Cascade parameters
        const startX = 0;
        const startY = 0;
        const offsetX = 25;
        const offsetY = 25;
        const defaultWidth = 500;
        const defaultHeight = 400;

        // Position each window
        windows.forEach((win, index) => {
            // Restore if minimized or maximized
            win.classList.remove('minimized', 'maximized');
            
            // Calculate position
            const x = startX + (index * offsetX);
            const y = startY + (index * offsetY);
            
            // Apply position and size
            win.style.left = x + 'px';
            win.style.top = y + 'px';
            win.style.width = defaultWidth + 'px';
            win.style.height = defaultHeight + 'px';
            win.style.transform = 'none';
        });

        // Activate the last window in cascade (brings it to front)
        if (windows.length > 0) {
            this.activateWindow(windows[windows.length - 1].dataset.window);
        }
    },

    /**
     * Tile all non-minimized windows (grid layout)
     */
    tileWindows() {
        // Get all non-minimized windows
        const windows = Array.from(document.querySelectorAll('.mdi-window:not(.minimized)'));
        
        if (windows.length === 0) return;

        // Get workspace dimensions (mdi-workspace)
        const workspace = document.querySelector('.mdi-workspace');
        if (!workspace) return;

        const workspaceRect = workspace.getBoundingClientRect();
        const workspaceWidth = workspaceRect.width;
        const workspaceHeight = workspaceRect.height;

        // Calculate grid dimensions
        const count = windows.length;
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);

        // Calculate window size with padding
        const padding = 0;
        const windowWidth = (workspaceWidth / cols) - (padding * 2);
        const windowHeight = (workspaceHeight / rows) - (padding * 2);

        // Position each window
        windows.forEach((win, index) => {
            // Restore if maximized
            win.classList.remove('maximized');
            
            // Calculate grid position
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            const x = padding + (col * (windowWidth + padding * 2));
            const y = padding + (row * (windowHeight + padding * 2));
            
            // Apply position and size
            win.style.left = x + 'px';
            win.style.top = y + 'px';
            win.style.width = windowWidth + 'px';
            win.style.height = windowHeight + 'px';
            win.style.transform = 'none';
        });
    },

    /**
     * Maximize/restore a window
     * @param {string} windowName - Window name
     */
    maximizeWindow(windowName) {
        const mdiWindow = document.getElementById(`window-${windowName}`);
        if (!mdiWindow) return;

        if (!mdiWindow.classList.contains('maximized')) {
            // Save current state
            mdiWindow.dataset.restoreTop = mdiWindow.style.top;
            mdiWindow.dataset.restoreLeft = mdiWindow.style.left;
            mdiWindow.dataset.restoreWidth = mdiWindow.style.width;
            mdiWindow.dataset.restoreHeight = mdiWindow.style.height;

            // Maximize
            mdiWindow.style.top = '0';
            mdiWindow.style.left = '0';
            mdiWindow.style.width = '100%';
            mdiWindow.style.height = '100%';
            mdiWindow.classList.add('maximized');
        } else {
            // Restore
            mdiWindow.style.top = mdiWindow.dataset.restoreTop || '20px';
            mdiWindow.style.left = mdiWindow.dataset.restoreLeft || '20px';
            mdiWindow.style.width = mdiWindow.dataset.restoreWidth || '500px';
            mdiWindow.style.height = mdiWindow.dataset.restoreHeight || '350px';
            mdiWindow.classList.remove('maximized');
        }
    },

    /**
     * Create or switch to a window
     * @param {string} windowName - Window name (Status or #channel)
     * @param {boolean} switchTo - Whether to switch to this window
     */
    createOrSwitchWindow(windowName, switchTo = true) {
        // Check if window already exists
        const existingWindow = document.getElementById(`window-${windowName}`);
        
        if (existingWindow) {
            if (switchTo) {
                existingWindow.classList.remove('minimized');
                this.activateWindow(windowName);
            }
            return;
        }

        // Create new MDI window
        const mdiWindow = document.createElement('div');
        mdiWindow.className = 'mdi-window';
        mdiWindow.id = `window-${windowName}`;
        mdiWindow.dataset.window = windowName;

        // Calculate position (cascade new windows)
        const existingWindows = document.querySelectorAll('.mdi-window').length;
        const offsetX = 40 + (existingWindows * 30);
        const offsetY = 40 + (existingWindows * 30);
        mdiWindow.style.top = `${offsetY}px`;
        mdiWindow.style.left = `${offsetX}px`;
        mdiWindow.style.width = '500px';
        mdiWindow.style.height = '350px';

        // Create titlebar
        const titlebar = document.createElement('div');
        titlebar.className = 'window-titlebar';
        
        const icon = document.createElement('span');
        icon.className = 'window-icon';
        icon.textContent = windowName === 'Status' ? '📊' : '💬';
        titlebar.appendChild(icon);

        const title = document.createElement('span');
        title.className = 'window-title';
        title.textContent = windowName;
        title.style.whiteSpace = 'nowrap';
        title.style.overflow = 'hidden';
        title.style.textOverflow = 'ellipsis';
        title.style.minWidth = '0';
        titlebar.appendChild(title);

        // Window controls
        const controls = document.createElement('div');
        controls.className = 'window-controls';

        const minimizeBtn = document.createElement('button');
        minimizeBtn.className = 'window-btn minimize-btn';
        minimizeBtn.title = 'Minimize';
        minimizeBtn.textContent = '_';
        controls.appendChild(minimizeBtn);

        const maximizeBtn = document.createElement('button');
        maximizeBtn.className = 'window-btn maximize-btn';
        maximizeBtn.title = 'Maximize';
        maximizeBtn.textContent = '□';
        controls.appendChild(maximizeBtn);

        if (windowName !== 'Status') {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'window-btn close-btn';
            closeBtn.title = 'Close';
            closeBtn.textContent = '×';
            controls.appendChild(closeBtn);
        }

        titlebar.appendChild(controls);
        mdiWindow.appendChild(titlebar);

        // Window content
        const content = document.createElement('div');
        content.className = 'window-content';

        // Main area (messages + input)
        const mainArea = document.createElement('div');
        mainArea.className = 'window-main';

        const messageArea = document.createElement('div');
        messageArea.className = 'message-area';
        messageArea.id = `messages-${windowName.replace('#', '')}`;
        mainArea.appendChild(messageArea);

        const inputArea = document.createElement('div');
        inputArea.className = 'input-area';
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'message-input window-input';
        input.placeholder = windowName === 'Status' ? 'Type /help for commands...' : 'Type a message...';
        input.autocomplete = 'off';
        input.dataset.window = windowName;
        inputArea.appendChild(input);
        mainArea.appendChild(inputArea);

        content.appendChild(mainArea);

        // User list (only for channel windows, not Status)
        if (windowName !== 'Status' && windowName.startsWith('#')) {
            const userListPanel = document.createElement('div');
            userListPanel.className = 'window-userlist';

            const userListHeader = document.createElement('div');
            userListHeader.className = 'window-userlist-header';
            userListHeader.textContent = 'Users';
            userListPanel.appendChild(userListHeader);

            const userListContent = document.createElement('div');
            userListContent.className = 'window-userlist-content';
            userListContent.id = `userlist-${windowName.replace('#', '')}`;
            console.log(`[WINDOW] Created user list element with ID: userlist-${windowName.replace('#', '')}`);
            userListPanel.appendChild(userListContent);

            content.appendChild(userListPanel);
        }

        mdiWindow.appendChild(content);

        // Resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'window-resize-handle';
        mdiWindow.appendChild(resizeHandle);

        // Add to workspace
        this.elements.mdiWorkspace.appendChild(mdiWindow);

        // Create switchbar button
        const switchBtn = document.createElement('button');
        switchBtn.className = 'switch-btn';
        switchBtn.dataset.window = windowName;

        const switchIcon = document.createElement('span');
        switchIcon.className = 'switch-icon';
        switchIcon.textContent = windowName === 'Status' ? '📊' : '💬';
        switchBtn.appendChild(switchIcon);

        const switchLabel = document.createElement('span');
        switchLabel.className = 'switch-label';
        switchLabel.textContent = windowName;
        switchBtn.appendChild(switchLabel);

        this.elements.switchbar.appendChild(switchBtn);

        // Initialize message history for this window
        this.messageHistory[windowName] = [];

        if (switchTo) {
            this.activateWindow(windowName);
        }
    },

    /**
     * Switch to a specific window
     * @param {string} windowName - Window name
     */
    switchToWindow(windowName) {
        this.activateWindow(windowName);
    },

    /**
     * Close a window
     * @param {string} windowName - Window name
     */
    closeWindow(windowName) {
        if (windowName === 'Status') return; // Can't close Status

        // Remove MDI window
        const mdiWindow = document.getElementById(`window-${windowName}`);
        if (mdiWindow) mdiWindow.remove();

        // Remove switchbar button
        const switchBtn = this.elements.switchbar.querySelector(`[data-window="${windowName}"]`);
        if (switchBtn) switchBtn.remove();

        // Clear message history
        delete this.messageHistory[windowName];

        // Clean up channel state in App if it's a channel window
        if (windowName.startsWith('#') && window.App) {
            window.App.leaveChannel(windowName);
        }

        // Switch to Status if this was active window
        if (this.activeWindow === windowName) {
            this.activateWindow('Status');
        }
        
        // Save window state to localStorage
        this.saveCurrentWindowState();
    },

    /**
     * Show connection dialog
     */
    showConnectionDialog() {
        this.elements.connectionDialog.classList.remove('hidden');
        this.elements.mainContainer.classList.add('hidden');
        
        // Pre-fill from config
        this.elements.serverInput.value = Config.state.serverAddress;
        this.elements.nicknameInput.value = Config.state.nickname;
        this.elements.rememberCheckbox.checked = Config.state.rememberSettings;
        
        // Focus nickname input
        this.elements.nicknameInput.focus();
        this.elements.nicknameInput.select();
    },

    /**
     * Hide connection dialog and show main interface
     */
    showMainInterface() {
        this.elements.connectionDialog.classList.add('hidden');
        this.elements.mainContainer.classList.remove('hidden');
        
        // Ensure Status window exists and is active
        const statusWindow = document.getElementById('window-Status');
        if (statusWindow) {
            const input = statusWindow.querySelector('.window-input');
            if (input) input.focus();
        }
    },

    /**
     * Show demo mode banner
     */
    showDemoBanner() {
        this.elements.demoBanner.classList.remove('hidden');
    },

    /**
     * Hide demo mode banner
     */
    hideDemoBanner() {
        this.elements.demoBanner.classList.add('hidden');
    },

    /**
     * Show connection error message
     * @param {string} message - Error message
     */
    showConnectionError(message) {
        if (this.elements.connectionStatus) {
            this.elements.connectionStatus.textContent = message;
            this.elements.connectionStatus.className = 'connection-status error';
        }
    },

    /**
     * Show connection success message
     * @param {string} message - Success message
     */
    showConnectionSuccess(message) {
        if (this.elements.connectionStatus) {
            this.elements.connectionStatus.textContent = message;
            this.elements.connectionStatus.className = 'connection-status success';
        }
    },

    /**
     * Hide connection status message
     */
    hideConnectionStatus() {
        if (this.elements.connectionStatus) {
            this.elements.connectionStatus.textContent = '';
            this.elements.connectionStatus.className = 'connection-status';
        }
    },

    /**
     * Update connection status display
     * @param {string} status - Status type (connected, disconnected, demo, etc.)
     * @param {string} text - Status text
     */
    updateStatus(status, text) {
        if (this.elements.statusIcon && this.elements.statusText) {
            this.elements.statusIcon.className = `status-icon ${status}`;
            this.elements.statusText.textContent = text;
        }
    },

    /**
     * Add message to display (multi-window version)
     * @param {Object} message - Message object {type, nick, text, timestamp, color}
     * @param {string} windowName - Window to add message to (defaults to active window)
     */
    addMessage(message, windowName = null) {
        const targetWindow = windowName || this.activeWindow;
        
        // Ensure window exists
        if (!this.messageHistory[targetWindow]) {
            this.createOrSwitchWindow(targetWindow, false);
        }

        const messageArea = document.querySelector(`#messages-${targetWindow.replace('#', '')}`);
        if (!messageArea) return;

        const msgElement = document.createElement('div');
        msgElement.className = `message ${message.type || 'normal'}`;
        
        const timestamp = Utils.formatTimestamp(message.timestamp || new Date());
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'message-timestamp';
        timestampSpan.textContent = timestamp;
        timestampSpan.style.fontWeight = 'bold';
        msgElement.appendChild(timestampSpan);
        
        // Add nickname for normal chat messages only (not for events or actions)
        const eventTypes = ['system', 'join', 'part', 'quit', 'mode', 'action', 'kick', 'netsplit'];
        if (message.nick && !eventTypes.includes(message.type)) {
            const nickSpan = document.createElement('span');
            nickSpan.className = 'message-nick';
            nickSpan.textContent = `<${message.nick}>`;
            nickSpan.style.fontWeight = 'bold';
            // Use theme's message foreground color for consistent nickname display
            const root = document.documentElement;
            const messageFgColor = getComputedStyle(root).getPropertyValue('--message-fg').trim() || '#000000';
            nickSpan.style.color = messageFgColor;
            msgElement.appendChild(nickSpan);
        }
        
        // Add message text
        const textSpan = document.createElement('span');
        textSpan.className = 'message-text';
        textSpan.style.fontWeight = 'bold';  // Force bold for all messages
        
        // Get colors from CSS custom properties (set by theme)
        const root = document.documentElement;
        const colorMap = {
            'join': getComputedStyle(root).getPropertyValue('--join-color').trim() || '#009900',
            'mode': getComputedStyle(root).getPropertyValue('--mode-color').trim() || '#009900',
            'quit': getComputedStyle(root).getPropertyValue('--quit-color').trim() || '#000066',
            'part': getComputedStyle(root).getPropertyValue('--part-color').trim() || '#8b4513',
            'action': getComputedStyle(root).getPropertyValue('--action-color').trim() || '#663399',
            'system': getComputedStyle(root).getPropertyValue('--system-color').trim() || '#008000',
            'error': getComputedStyle(root).getPropertyValue('--error-color').trim() || '#ff0000',
            'notice': '#ff8c00'     // Orange (not themed yet)
        };
        
        if (colorMap[message.type]) {
            textSpan.style.color = colorMap[message.type];
        } else if (message.type === 'normal' || message.type === 'message' || !message.type) {
            // Normal chat messages use theme's message foreground color
            const messageFgColor = getComputedStyle(root).getPropertyValue('--message-fg').trim() || '#000000';
            textSpan.style.color = messageFgColor;
        }
        
        // Parse colors, linkify URLs, and highlight mentions
        let processedText = Utils.parseIrcColors(message.text);
        // Only highlight mentions in normal chat messages, not in events/actions
        if (message.type === 'normal' || message.type === 'message' || !message.type) {
            processedText = Utils.highlightMentions(processedText, Config.state.nickname);
        }
        textSpan.innerHTML = processedText;
        msgElement.appendChild(textSpan);
        
        messageArea.appendChild(msgElement);
        
        // Store in history
        this.messageHistory[targetWindow].push(message);
        
        // Trim message history and DOM to prevent memory bloat (keep last 500 messages)
        const maxMessages = 500;
        if (this.messageHistory[targetWindow].length > maxMessages) {
            this.messageHistory[targetWindow] = this.messageHistory[targetWindow].slice(-maxMessages);
            
            // Also trim DOM children to match
            const children = messageArea.children;
            const excessCount = children.length - maxMessages;
            if (excessCount > 0) {
                for (let i = 0; i < excessCount; i++) {
                    messageArea.removeChild(children[0]);
                }
            }
        }
        
        // Auto-scroll to bottom for ALL windows (not just active window)
        // This ensures background channels stay scrolled to bottom
        Utils.scrollToBottom(messageArea);
    },

    /**
     * Add system message
     * @param {string} text - Message text
     * @param {string} windowName - Window name (defaults to Status)
     */
    addSystemMessage(text, windowName = 'Status') {
        this.addMessage({
            type: 'system',
            text: text,
            timestamp: new Date()
        }, windowName);
    },

    /**
     * Clear messages from a window
     * @param {string} windowName - Window name
     */
    clearMessages(windowName = null) {
        const targetWindow = windowName || this.activeWindow;
        const messageArea = document.querySelector(`#messages-${targetWindow.replace('#', '')}`);
        if (messageArea) {
            messageArea.innerHTML = '';
        }
        this.messageHistory[targetWindow] = [];
    },

    /**
     * Clear chat (alias for clearMessages for /clear command)
     * @param {string} windowName - Window name
     */
    clearChat(windowName = null) {
        this.clearMessages(windowName);
    },

    /**
     * Update channel topic
     * @param {string} topic - Topic text
     */
    updateTopic(topic) {
        // No-op - we don't have a global topic bar in MDI mode
        // Topic could be shown in window titlebar if needed
    },

    /**
     * Update channel window title with IRC format
     * @param {string} channelName - Channel name (e.g., "#hackers")
     * @param {number} userCount - Number of users in channel
     * @param {string} topic - Channel topic
     */
    updateChannelTitle(channelName, userCount, topic) {
        const window = document.querySelector(`.mdi-window[data-window="${channelName}"]`);
        if (!window) return;

        const titleElement = window.querySelector('.window-title');
        if (!titleElement) return;

        // Classic mIRC format: "#hackers [23] [+nt]: Channel Topic"
        // +nt = standard channel modes (n=no external messages, t=only ops can set topic)
        titleElement.textContent = `${channelName} [${userCount}] [+nt]: ${topic}`;
    },

    /**
     * Update current window display
     * @param {string} windowName - Window name
     */
    updateCurrentWindow(windowName) {
        this.elements.currentWindowDisplay.textContent = windowName;
    },

    /**
     * Update nickname display in status bar
     * @param {string} nickname - New nickname
     */
    updateNickname(nickname) {
        if (this.elements.currentNickname) {
            this.elements.currentNickname.textContent = nickname;
        }
    },

    /**
     * Update server info display in status bar
     * @param {string} server - Server address
     */
    updateServerInfo(server) {
        if (this.elements.currentServer) {
            this.elements.currentServer.textContent = server;
        }
    },

    /**
     * Render channel list (deprecated - we use switchbar now)
     * @param {Array} channels - List of channel objects
     * @param {string} activeChannel - Currently active channel
     */
    renderChannelList(channels, activeChannel) {
        // No-op - we don't have a global channel list anymore
        // Channels appear as switchbar buttons when joined
    },

    /**
     * Render user list for a specific channel window
     * @param {Array} users - Array of user objects {nick, mode}
     * @param {string} currentNick - Current user's nickname
     * @param {string} windowName - Channel window name
     */
    renderUserList(users, currentNick, windowName) {
        // Normalize the window name for the ID
        const normalizedName = windowName.replace('#', '');
        const userListElement = document.getElementById(`userlist-${normalizedName}`);
        
        if (!userListElement) {
            console.log(`User list element not found for: userlist-${normalizedName}`);
            return; // No user list for this window (e.g., Status)
        }
        
        console.log(`Rendering ${users.length} users for ${windowName} in element userlist-${normalizedName}`);
        userListElement.innerHTML = '';
        
        // Sort users: operators first, then voiced, then regular, all alphabetical within each tier
        const sortedUsers = [...users].sort((a, b) => {
            // Assign priority: operator=0, voice=1, regular=2
            const getPriority = (user) => {
                if (user.mode === 'operator') return 0;
                if (user.mode === 'voice') return 1;
                return 2;
            };
            
            const priorityA = getPriority(a);
            const priorityB = getPriority(b);
            
            // Sort by priority first
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            
            // Within same tier, sort alphabetically (case-insensitive)
            return a.nick.toLowerCase().localeCompare(b.nick.toLowerCase());
        });
        
        for (const user of sortedUsers) {
            const item = document.createElement('div');
            item.className = 'user-item';
            
            // Add prefix for operators/voice
            let prefix = '';
            if (user.mode === 'operator') {
                prefix = '@';
                item.classList.add('operator');
            } else if (user.mode === 'voice') {
                prefix = '+';
                item.classList.add('voice');
            }
            
            item.textContent = prefix + user.nick;
            
            if (user.nick === currentNick) {
                item.classList.add('self');
            }
            
            // Click for /whois
            item.addEventListener('click', () => {
                window.App.showWhois(user.nick);
            });
            
            userListElement.appendChild(item);
        }
        
        // Update user count in status bar
        this.elements.userCount.textContent = `${users.length} users`;
    },

    /**
     * Save current window state to localStorage
     */
    saveCurrentWindowState() {
        const windows = Object.keys(this.messageHistory);
        Config.saveWindowState(windows, this.activeWindow);
    }
};

// Make available globally
window.UI = UI;
