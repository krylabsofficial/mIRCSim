/**
 * IRC Commands - mIRC LLM Simulator  
 * Handles IRC command parsing and execution
 */

const IRCCommands = {
    /**
     * Parse and execute IRC command
     * @param {string} input - User input (with or without / prefix)
     * @returns {Object} {success, message, handled}
     */
    execute(input) {
        // Check if it's a command
        if (!input.startsWith('/')) {
            return { success: true, message: null, handled: false };
        }

        // Parse command and arguments
        const parts = input.substring(1).trim().split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        // Execute command
        switch (command) {
            case 'join':
                return this.cmdJoin(args);
            case 'part':
            case 'leave':
                return this.cmdPart(args);
            case 'nick':
                return this.cmdNick(args);
            case 'me':
                return this.cmdMe(args);
            case 'msg':
            case 'query':
                return this.cmdMsg(args);
            case 'whois':
                return this.cmdWhois(args);
            case 'list':
                return this.cmdList(args);
            case 'topic':
                return this.cmdTopic(args);
            case 'kick':
                return this.cmdKick(args);
            case 'mode':
                return this.cmdMode(args);
            case 'op':
                return this.cmdOp(args);
            case 'deop':
                return this.cmdDeop(args);
            case 'voice':
                return this.cmdVoice(args);
            case 'clear':
                return this.cmdClear(args);
            case 'server':
                return this.cmdServer(args);
            case 'quit':
                return this.cmdQuit(args);
            case 'help':
                return this.cmdHelp(args);
            case 'rpg':
                return this.cmdRpg(args);
            case 'rpg-chat':
                return this.cmdRpgChat(args);
            default:
                return {
                    success: false,
                    message: `Unknown command: /${command}. Type /help for available commands.`,
                    handled: true
                };
        }
    },

    /**
     * /join - Join a channel (or multiple comma-separated channels)
     * @param {Array} args - Command arguments
     */
    cmdJoin(args) {
        if (args.length === 0) {
            return {
                success: false,
                message: 'Usage: /join #channel or /join #chan1,#chan2,#chan3',
                handled: true
            };
        }

        // Join all args into one string in case channels were space-separated after commas
        const channelString = args.join(' ');
        
        // Split by commas to support multi-join
        const channelList = channelString.split(',').map(ch => ch.trim()).filter(ch => ch.length > 0);

        // Process each channel
        for (let channel of channelList) {
            // Add # prefix if not present
            if (!channel.startsWith('#')) {
                channel = '#' + channel;
            }

            // Validate channel name
            if (!Utils.isValidChannel(channel)) {
                UI.addErrorMessage(`Invalid channel name: ${channel}`, 'Status');
                continue; // Skip invalid channels but process the rest
            }

            // Let App handle the actual join
            window.App.joinChannel(channel);
        }

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /part - Leave current channel
     * @param {Array} args - Command arguments
     */
    cmdPart(args) {
        const currentWindow = window.UI.activeWindow;
        
        if (currentWindow === 'Status') {
            return {
                success: false,
                message: 'Cannot part Status window',
                handled: true
            };
        }

        UI.addMessage({
            type: 'part',
            text: `* ${Config.state.nickname} has left ${currentWindow}`,
            timestamp: new Date()
        }, currentWindow);
        
        // Close the channel window
        setTimeout(() => {
            UI.closeWindow(currentWindow);
        }, 500);

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /nick - Change nickname
     * @param {Array} args - Command arguments
     */
    cmdNick(args) {
        if (args.length === 0) {
            return {
                success: false,
                message: 'Usage: /nick newnickname',
                handled: true
            };
        }

        const newNick = args[0];

        if (!Utils.isValidNickname(newNick)) {
            return {
                success: false,
                message: `Invalid nickname: ${newNick}`,
                handled: true
            };
        }

        const oldNick = Config.state.nickname;
        Config.setNickname(newNick);
        UI.updateNickname(newNick);
        UI.addSystemMessage(`You are now known as ${newNick}`, 'Status');

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /me - Action message
     * @param {Array} args - Command arguments
     */
    cmdMe(args) {
        if (args.length === 0) {
            return {
                success: false,
                message: 'Usage: /me action',
                handled: true
            };
        }

        const currentWindow = window.UI.activeWindow;
        
        if (currentWindow === 'Status') {
            return {
                success: false,
                message: 'Cannot send action in Status window',
                handled: true
            };
        }

        const action = args.join(' ');
        UI.addMessage({
            type: 'action',
            text: `* ${Config.state.nickname} ${action}`,
            timestamp: new Date()
        }, currentWindow);

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /msg - Send private message to a user (opens query window)
     * @param {Array} args - Command arguments
     */
    cmdMsg(args) {
        if (args.length < 2) {
            UI.addErrorMessage('Usage: /msg nickname message', 'Status');
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        const target = args[0];
        const message = args.slice(1).join(' ');

        // Send private message (creates query window)
        // Note: UI.sendPrivateMessage will handle case-insensitive window matching
        UI.sendPrivateMessage(target, message, true);

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /whois - Show user information
     * @param {Array} args - Command arguments
     */
    cmdWhois(args) {
        if (args.length === 0) {
            UI.addErrorMessage('Usage: /whois nickname', 'Status');
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        const nick = args[0];
        const currentChannel = Config.state.currentChannel;
        
        // Check if it's you (case-insensitive)
        if (Utils.nicknameEquals(nick, Config.state.nickname)) {
            UI.addSystemMessage(`[WHOIS] ${Config.state.nickname}`, 'Status');
            UI.addSystemMessage(`  Nickname: ${nick}`, 'Status');
            if (currentChannel && currentChannel !== 'Status') {
                UI.addSystemMessage(`  Channel: ${currentChannel}`, 'Status');
            }
            UI.addSystemMessage(`  [You]`, 'Status');
            return { success: true, message: null, handled: true };
        }
        
        // Check if it's an AI persona (now case-insensitive)
        const persona = Config.getPersona(nick);
        if (persona) {
            // Find which channel(s) the persona is in
            let channels = [];
            if (window.App.state.channelUsers) {
                for (const [chan, users] of Object.entries(window.App.state.channelUsers)) {
                    if (Utils.findUserByNick(users, persona.nickname)) {
                        channels.push(chan);
                    }
                }
            }
            
            UI.addSystemMessage(`[WHOIS] ${nick}`, 'Status');
            UI.addSystemMessage(`  Nickname: ${persona.nickname}`, 'Status');
            UI.addSystemMessage(`  Style: ${persona.style}`, 'Status');
            if (channels.length > 0) {
                UI.addSystemMessage(`  Channels: ${channels.join(', ')}`, 'Status');
            }
            UI.addSystemMessage(`  [AI Persona]`, 'Status');
            return { success: true, message: null, handled: true };
        }
        
        // Check if user is in current channel (lurker) - case-insensitive
        let inChannel = false;
        let foundUser = null;
        if (currentChannel && currentChannel !== 'Status' && window.App.state.channelUsers[currentChannel]) {
            foundUser = Utils.findUserByNick(window.App.state.channelUsers[currentChannel], nick);
            inChannel = !!foundUser;
        }
        
        if (inChannel) {
            UI.addSystemMessage(`[WHOIS] ${foundUser.nick}`, 'Status');
            UI.addSystemMessage(`  Nickname: ${foundUser.nick}`, 'Status');
            UI.addSystemMessage(`  Channel: ${currentChannel}`, 'Status');
            UI.addSystemMessage(`  [Lurker]`, 'Status');
        } else {
            UI.addSystemMessage(`[WHOIS] No such nickname: ${nick}`, 'Status');
        }

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /list - List suggested/popular channels
     * @param {Array} args - Command arguments
     */
    cmdList(args) {
        // Suggest popular channels (any channel can be joined)
        const suggestedChannels = [
            '#general',
            '#hackers',
            '#0day',
            '#python',
            '#javascript',
            '#linux',
            '#gaming',
            '#random',
            '#offtopic',
            '#security',
            '#crypto',
            '#music'
        ];

        UI.addSystemMessage(`[POPULAR CHANNELS - You can join any channel!]`, 'Status');
        for (const channelName of suggestedChannels) {
            const topic = TopicGenerator.generateTopic(channelName);
            UI.addSystemMessage(`  ${channelName} - ${topic}`, 'Status');
        }
        UI.addSystemMessage(`  Tip: Use /join #channelname to join any channel`, 'Status');

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /topic - View or change channel topic
     * @param {Array} args - Command arguments
     */
    cmdTopic(args) {
        const currentWindow = window.UI.activeWindow;
        
        if (currentWindow === 'Status') {
            return {
                success: false,
                message: 'Cannot set topic in Status window',
                handled: true
            };
        }

        // If no args, show current topic
        if (args.length === 0) {
            const topic = TopicGenerator.generateTopic(currentWindow);
            UI.addSystemMessage(`Topic for ${currentWindow}: ${topic}`, currentWindow);
            return {
                success: true,
                message: null,
                handled: true
            };
        }

        // Check if user is op
        const users = window.App.state.channelUsers[currentWindow] || [];
        const currentUser = users.find(u => u.nick === Config.state.nickname);
        
        if (!currentUser || currentUser.mode !== 'operator') {
            UI.addErrorMessage('You must be a channel operator to change the topic', currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        // Set new topic
        const newTopic = args.join(' ');
        UI.addSystemMessage(`${Config.state.nickname} has changed the topic to: ${newTopic}`, currentWindow);
        
        // Update window title
        const userCount = users.length;
        UI.updateChannelTitle(currentWindow, userCount, newTopic);

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /kick - Kick user from channel (op-only)
     * @param {Array} args - Command arguments
     */
    cmdKick(args) {
        const currentWindow = window.UI.activeWindow;
        
        if (currentWindow === 'Status') {
            return {
                success: false,
                message: 'Cannot kick from Status window',
                handled: true
            };
        }

        if (args.length === 0) {
            UI.addErrorMessage('Usage: /kick nickname [reason]', currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        // Check if user is op
        const users = window.App.state.channelUsers[currentWindow] || [];
        const currentUser = users.find(u => u.nick === Config.state.nickname);
        
        if (!currentUser || currentUser.mode !== 'operator') {
            UI.addErrorMessage('You must be a channel operator to kick users', currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        const targetNick = args[0];
        const reason = args.length > 1 ? args.slice(1).join(' ') : Config.state.nickname;

        // Check if target exists (case-insensitive)
        const targetUser = Utils.findUserByNick(users, targetNick);
        if (!targetUser) {
            UI.addErrorMessage(`No such user: ${targetNick}`, currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        // Cannot kick yourself (case-insensitive)
        if (Utils.nicknameEquals(targetUser.nick, Config.state.nickname)) {
            UI.addErrorMessage('You cannot kick yourself', currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        // Show kick message
        UI.addMessage({
            type: 'part',
            text: `* ${targetNick} was kicked by ${Config.state.nickname} (${reason})`,
            timestamp: new Date()
        }, currentWindow);

        // Remove user from list
        const newUsers = users.filter(u => u.nick !== targetNick);
        window.App.state.channelUsers[currentWindow] = newUsers;
        UI.renderUserList(newUsers, Config.state.nickname, currentWindow);

        // Update user count in title
        const topic = TopicGenerator.generateTopic(currentWindow);
        UI.updateChannelTitle(currentWindow, newUsers.length, topic);

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /mode - Change user modes
     * @param {Array} args - Command arguments
     */
    cmdMode(args) {
        const currentWindow = window.UI.activeWindow;
        
        if (currentWindow === 'Status') {
            return {
                success: false,
                message: 'Cannot change modes in Status window',
                handled: true
            };
        }

        if (args.length < 2) {
            UI.addErrorMessage('Usage: /mode nickname +/-o|v', currentWindow);
            UI.addSystemMessage('  +o = give operator status', currentWindow);
            UI.addSystemMessage('  -o = remove operator status', currentWindow);
            UI.addSystemMessage('  +v = give voice', currentWindow);
            UI.addSystemMessage('  -v = remove voice', currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        // Check if user is op
        const users = window.App.state.channelUsers[currentWindow] || [];
        const currentUser = users.find(u => u.nick === Config.state.nickname);
        
        if (!currentUser || currentUser.mode !== 'operator') {
            UI.addErrorMessage('You must be a channel operator to change modes', currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        const targetNick = args[0];
        const modeChange = args[1];

        // Parse mode change
        const adding = modeChange.startsWith('+');
        const mode = modeChange.slice(1);

        if (!['o', 'v'].includes(mode)) {
            UI.addErrorMessage('Invalid mode. Use +o, -o, +v, or -v', currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        // Find target user
        const targetIndex = users.findIndex(u => u.nick === targetNick);
        if (targetIndex === -1) {
            UI.addErrorMessage(`No such user: ${targetNick}`, currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        // Apply mode change
        const newMode = adding ? (mode === 'o' ? 'operator' : 'voice') : null;
        users[targetIndex].mode = newMode;

        // Show mode change message
        const modeText = adding ? `+${mode}` : `-${mode}`;
        UI.addMessage({
            type: 'mode',
            text: `* ${Config.state.nickname} sets mode: ${modeText} ${targetNick}`,
            timestamp: new Date()
        }, currentWindow);

        // Re-render user list
        UI.renderUserList(users, Config.state.nickname, currentWindow);

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /op - Give operator status to a user
     * @param {Array} args - Command arguments
     */
    cmdOp(args) {
        const currentWindow = window.UI.activeWindow;
        
        if (currentWindow === 'Status') {
            return {
                success: false,
                message: 'Cannot op users in Status window',
                handled: true
            };
        }

        if (args.length === 0) {
            UI.addErrorMessage('Usage: /op nickname', currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        // Check if user is op
        const users = window.App.state.channelUsers[currentWindow] || [];
        const currentUser = users.find(u => u.nick === Config.state.nickname);
        
        if (!currentUser || currentUser.mode !== 'operator') {
            UI.addErrorMessage('You must be a channel operator to op users', currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        const targetNick = args[0];

        // Find target user
        const targetIndex = users.findIndex(u => u.nick === targetNick);
        if (targetIndex === -1) {
            UI.addErrorMessage(`No such user: ${targetNick}`, currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        // Apply operator mode
        users[targetIndex].mode = 'operator';

        // Show mode change message
        UI.addMessage({
            type: 'mode',
            text: `* ${Config.state.nickname} sets mode: +o ${targetNick}`,
            timestamp: new Date()
        }, currentWindow);

        // Re-render user list
        UI.renderUserList(users, Config.state.nickname, currentWindow);

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /deop - Remove operator status from a user
     * @param {Array} args - Command arguments
     */
    cmdDeop(args) {
        const currentWindow = window.UI.activeWindow;
        
        if (currentWindow === 'Status') {
            return {
                success: false,
                message: 'Cannot deop users in Status window',
                handled: true
            };
        }

        if (args.length === 0) {
            UI.addErrorMessage('Usage: /deop nickname', currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        // Check if user is op
        const users = window.App.state.channelUsers[currentWindow] || [];
        const currentUser = users.find(u => u.nick === Config.state.nickname);
        
        if (!currentUser || currentUser.mode !== 'operator') {
            UI.addErrorMessage('You must be a channel operator to deop users', currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        const targetNick = args[0];

        // Find target user
        const targetIndex = users.findIndex(u => u.nick === targetNick);
        if (targetIndex === -1) {
            UI.addErrorMessage(`No such user: ${targetNick}`, currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        // Remove operator mode
        users[targetIndex].mode = null;

        // Show mode change message
        UI.addMessage({
            type: 'mode',
            text: `* ${Config.state.nickname} sets mode: -o ${targetNick}`,
            timestamp: new Date()
        }, currentWindow);

        // Re-render user list
        UI.renderUserList(users, Config.state.nickname, currentWindow);

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /voice - Give voice status to a user
     * @param {Array} args - Command arguments
     */
    cmdVoice(args) {
        const currentWindow = window.UI.activeWindow;
        
        if (currentWindow === 'Status') {
            return {
                success: false,
                message: 'Cannot voice users in Status window',
                handled: true
            };
        }

        if (args.length === 0) {
            UI.addErrorMessage('Usage: /voice nickname', currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        // Check if user is op
        const users = window.App.state.channelUsers[currentWindow] || [];
        const currentUser = users.find(u => u.nick === Config.state.nickname);
        
        if (!currentUser || currentUser.mode !== 'operator') {
            UI.addErrorMessage('You must be a channel operator to voice users', currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        const targetNick = args[0];

        // Find target user
        const targetIndex = users.findIndex(u => u.nick === targetNick);
        if (targetIndex === -1) {
            UI.addErrorMessage(`No such user: ${targetNick}`, currentWindow);
            return {
                success: false,
                message: null,
                handled: true
            };
        }

        // Apply voice mode (only if not already an operator)
        if (users[targetIndex].mode !== 'operator') {
            users[targetIndex].mode = 'voice';
        }

        // Show mode change message
        UI.addMessage({
            type: 'mode',
            text: `* ${Config.state.nickname} sets mode: +v ${targetNick}`,
            timestamp: new Date()
        }, currentWindow);

        // Re-render user list
        UI.renderUserList(users, Config.state.nickname, currentWindow);

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /clear - Clear the current window's chat
     * @param {Array} args - Command arguments
     */
    cmdClear(args) {
        const currentWindow = window.UI.activeWindow;
        
        // Clear the chat output for current window
        UI.clearChat(currentWindow);

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /server - Change server address
     * @param {Array} args - Command arguments
     */
    cmdServer(args) {
        if (args.length === 0) {
            UI.addSystemMessage(`Current server: ${Config.state.serverAddress}`, 'Status');
            return {
                success: true,
                message: null,
                handled: true
            };
        }

        const newServer = args[0];
        Config.setServer(newServer);
        UI.updateServerInfo(newServer);
        UI.addSystemMessage(`Server changed to: ${newServer}`, 'Status');
        UI.addSystemMessage(`Use /quit and reconnect to apply changes`, 'Status');

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /quit - Disconnect
     * @param {Array} args - Command arguments
     */
    cmdQuit(args) {
        const quitMsg = args.length > 0 ? args.join(' ') : 'Leaving';
        
        UI.addSystemMessage(`Disconnecting... (${quitMsg})`, 'Status');
        
        // Reload the page to show connection dialog again
        setTimeout(() => {
            location.reload();
        }, 1000);

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /rpg - Manually trigger confidant RPG approach (debug command)
     * @param {Array} args - Command arguments (optional: slip count)
     */
    cmdRpg(args) {
        if (!window.RPG) {
            return {
                success: false,
                message: 'RPG system not available',
                handled: true
            };
        }

        // Get slip count from args or default to 4
        const slipCount = args.length > 0 ? parseInt(args[0]) : 4;

        if (isNaN(slipCount) || slipCount < 1) {
            return {
                success: false,
                message: 'Usage: /rpg [slipcount] - Default is 4 slips (3=subtle, 4=direct, 5+=confrontational)',
                handled: true
            };
        }

        UI.addSystemMessage(`[RPG] Manually triggering confidant approach (${slipCount} slips)`, 'Status');
        
        // Trigger the approach
        try {
            RPG.triggerApproachNow(slipCount);
            UI.addSystemMessage(`[RPG] Approach triggered successfully`, 'Status');
        } catch (error) {
            console.error('[RPG Command] Error:', error);
            return {
                success: false,
                message: `RPG trigger failed: ${error.message}`,
                handled: true
            };
        }

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /rpg-chat - Manually trigger free chat mode (for testing)
     * @param {Array} args - Command arguments
     */
    cmdRpgChat(args) {
        if (!window.ConfidantManager) {
            return {
                success: false,
                message: 'RPG system not available',
                handled: true
            };
        }

        UI.addSystemMessage(`[RPG] Manually triggering free chat mode`, 'Status');
        
        try {
            ConfidantManager.startFreeChat();
            UI.addSystemMessage(`[RPG] Free chat mode started`, 'Status');
        } catch (error) {
            console.error('[RPG Command] Error:', error);
            return {
                success: false,
                message: `Free chat trigger failed: ${error.message}`,
                handled: true
            };
        }

        return {
            success: true,
            message: null,
            handled: true
        };
    },

    /**
     * /help - Show available commands
     * @param {Array} args - Command arguments
     */
    cmdHelp(args) {
        UI.addSystemMessage(`[AVAILABLE COMMANDS]`, 'Status');
        UI.addSystemMessage(`  /join #channel - Join a channel`, 'Status');
        UI.addSystemMessage(`  /part - Leave current channel`, 'Status');
        UI.addSystemMessage(`  /nick newnick - Change your nickname`, 'Status');
        UI.addSystemMessage(`  /me action - Send an action message`, 'Status');
        UI.addSystemMessage(`  /msg nick message - Send private message`, 'Status');
        UI.addSystemMessage(`  /whois nick - Show user information`, 'Status');
        UI.addSystemMessage(`  /list - List available channels`, 'Status');
        UI.addSystemMessage(`  /topic [new topic] - View/change channel topic (op only)`, 'Status');
        UI.addSystemMessage(`  /kick nick [reason] - Kick user from channel (op only)`, 'Status');
        UI.addSystemMessage(`  /mode nick +/-o|v - Change user modes (op only)`, 'Status');
        UI.addSystemMessage(`  /op nick - Give operator status (op only)`, 'Status');
        UI.addSystemMessage(`  /deop nick - Remove operator status (op only)`, 'Status');
        UI.addSystemMessage(`  /voice nick - Give voice status (op only)`, 'Status');
        UI.addSystemMessage(`  /clear - Clear current window`, 'Status');
        UI.addSystemMessage(`  !op - Request ops from ChanServ`, 'Status');
        UI.addSystemMessage(`  /server [url] - View/change server address`, 'Status');
        UI.addSystemMessage(`  /quit [message] - Disconnect`, 'Status');
        UI.addSystemMessage(`  /rpg [slips] - Trigger RPG confidant approach (debug)`, 'Status');
        UI.addSystemMessage(`  /rpg-chat - Trigger RPG free chat mode (debug)`, 'Status');
        UI.addSystemMessage(`  /help - Show this help`, 'Status');

        return {
            success: true,
            message: null,
            handled: true
        };
    }
};

// Make available globally
window.IRCCommands = IRCCommands;
