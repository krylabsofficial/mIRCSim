# mIRC-Style LLM Chat Simulator

A fully local, retro IRC-style web application where you chat with AI-powered personas in classic IRC channels. Experience the nostalgia of 1998 EFnet while experimenting with LLM-powered multi-character conversations.

![mIRC Simulator](https://img.shields.io/badge/status-in_development-yellow) ![License](https://img.shields.io/badge/license-MIT-blue)

## 🎯 Features

### Core Experience
- ✨ **Authentic retro IRC UI** - Looks like mIRC from the late 90s with MDI windows
- 🤖 **AI-powered personas** - 23 unique AI characters with distinct personalities
- 💬 **Real IRC commands** - `/join`, `/nick`, `/me`, `/whois`, `/mode`, and more
- 🎭 **Demo mode** - Try it instantly without any setup
- 🔒 **100% local** - Runs entirely on your machine via LM Studio
- ⚡ **Zero build tools** - Pure HTML/CSS/JavaScript, just open and run
- 🎨 **Configurable** - Customize personas, themes, and events via INI files

### Advanced Features
- 🎯 **Direct mentions** - Tag personas by name with fuzzy matching ("hey zero" → ZeroCool)
- 🌈 **Theme system** - 4 color themes (Classic, Dark, Matrix, Hacker) console-accessible
- 👥 **Dynamic channels** - Join ANY channel, auto-populated with 40-50 users
- 🎲 **Event simulation** - Realistic IRC events (joins, parts, quits, mode changes, netsplits)
- 💾 **State persistence** - Window positions and settings saved to localStorage
- 🎪 **Auto-scroll** - Always stay at the newest messages across all channels
- ⚡ **Performance optimized** - 500 message limit per channel with auto-cleanup

## 🚀 Quick Start

### Option 1: Demo Mode (Instant - No Setup)

Try the simulator immediately without installing anything:

1. Open `index.html?demo=true` in your browser
2. Click "Skip & Use Demo Mode"
3. Start chatting!

*Demo mode uses pre-scripted responses - great for testing the UI.*

### Option 2: Full AI Experience

**Prerequisites:**
- [LM Studio](https://lmstudio.ai/) installed with a model loaded
- Python 3.8+ (for CORS proxy)
- Modern web browser

**Setup Steps:**

1. **Start LM Studio**
   ```
   - Load your preferred model (Llama, Mistral, etc.)
   - Enable local server (OpenAI-compatible endpoints)
   - Default port 1234 works automatically - no configuration needed!
   ```

2. **Install Python dependencies** (one-time)
   ```bash
   pip install flask flask-cors requests
   ```

3. **Start both servers** (Windows)
   ```bash
   start_servers.bat
   ```
   This launches:
   - HTTP server on port 1337 (serves the app)
   - CORS proxy on port 5000 (auto-connects to LM Studio on localhost:1234)
   - Opens http://localhost:1337 in your browser
   
   **Zero configuration required for default LM Studio setup!**

   **Manual alternative:**
   ```bash
   # Terminal 1
   python -m http.server 1337
   
   # Terminal 2
   python cors_proxy.py
   ```

4. **Connect**
   ```
   - Enter server: http://localhost:5000
   - Choose your nickname
   - Click "Connect"
   ```

5. **Start chatting!** 🎉

### Advanced: Custom LM Studio Configuration

**Default behavior:** `start_servers.bat` and `cors_proxy.py` automatically connect to LM Studio on `http://localhost:1234` - no configuration needed!

**Custom configurations** (for non-standard setups):

If your LM Studio runs on a different port or machine, you have three options:

```bash
# Option 1: Command-line argument
python cors_proxy.py --lm-studio http://192.168.1.100:8080

# Option 2: Environment variable (Windows)
set LM_STUDIO_URL=http://10.5.0.2:1234
python cors_proxy.py

# Option 3: Environment variable (Linux/Mac)
export LM_STUDIO_URL=http://10.5.0.2:1234
python cors_proxy.py

# Custom proxy port (if 5000 is already in use)
python cors_proxy.py --port 8000
```

**When to use custom configuration:**
- ✅ LM Studio on non-standard port (not 1234)
- ✅ LM Studio on different machine/server
- ✅ Multiple LM Studio instances
- ❌ Not needed for default LM Studio setup

## 📁 Project Structure

```
mIRCSim/
├── .gitignore              # Git exclusions (tasks/, reference/, cache files)
├── index.html              # Main application entry point
├── start_servers.bat       # Windows script to start HTTP + CORS proxy
├── cors_proxy.py           # Python CORS proxy for LM Studio (port 5000)
├── test_llm_connection.py  # Test LLM connectivity script
├── demo_responses.json     # Pre-scripted responses for demo mode
│
├── css/
│   └── styles.css          # Retro mIRC styling (1112 lines)
│
├── js/                     # Core application modules
│   ├── app.js              # Main orchestration, channel management (706 lines)
│   ├── ui.js               # MDI windows, message rendering (873 lines)
│   ├── config.js           # Configuration, theme system (394 lines)
│   ├── llm-client.js       # LM Studio API integration (353 lines)
│   ├── irc-commands.js     # IRC command handlers (378 lines)
│   ├── event-simulator.js  # Event simulation engine (517 lines)
│   ├── demo.js             # Demo mode logic (149 lines)
│   ├── ini-parser.js       # INI file parser (148 lines)
│   ├── username-generator.js # IRC username generation (98 lines)
│   ├── topic-generator.js  # Channel topic derivation (113 lines)
│   └── utils.js            # Utilities, helpers (274 lines)
│
└── settings/               # Configuration files (INI format)
    ├── README.md           # Detailed configuration guide
    ├── personas.ini        # 23 AI personas (customize here)
    ├── themes.ini          # 4 color themes (classic, dark, matrix, hacker)
    └── events.ini          # Event simulation config (intervals, lurker names)
```

**Total Lines of Code:** ~5,000 (JavaScript, CSS, HTML)  
**Configuration:** All settings use INI format (see [settings/README.md](settings/README.md))

## ⚙️ Configuration

### Personas (settings/personas.ini)

The system loads AI personas from `settings/personas.ini`. Each persona has a unique personality and conversational style.

**Format:**
```ini
[ZeroCool]
nickname = ZeroCool
style = Cocky teenage hacker from 1995, uses 1337speak, brief responses (5-15 words)

[AcidBurn]
nickname = AcidBurn
style = Strong female hacker, confident and sharp-tongued, feminist edge
```

**Available Personas (23 total):**
ZeroCool, AcidBurn, LordNikon, CrashOverride, PhantomPhreak, ThePlague, razor, h4x0r, Neo, Trinity, Morpheus, MrRobot, Darlene, Whiterose, Tyrell, Angela, BitKid, ByteBandit, RootAccess, ScriptNinja, PacketSurfer, SilentGh0st, ByteSmith

**How It Works:**
- Each channel randomly selects 2-4 active personas
- Active personas respond via LLM with topic awareness
- Same personas can appear in multiple channels
- Personas respond when directly mentioned (e.g., "hey zero, what's up?")
- 15% chance of butt-in responses when other personas are mentioned

**Note:** `color` property is deprecated - nickname colors now controlled by theme system.

### Themes (settings/themes.ini)

The app supports 4 color themes loaded from `settings/themes.ini`:

**Available Themes:**
1. **Classic** - Authentic mIRC look (gray chrome, white messages, black text)
2. **Dark** - Modern dark mode (charcoal chrome, dark messages, light gray text)
3. **Matrix** - Green-on-black hacker aesthetic
4. **Hacker** - GitHub dark theme inspired

**Format:**
```ini
[classic]
chrome_bg = #c0c0c0
chrome_fg = #000000
message_bg = #ffffff
message_fg = #000000
join = #009900
quit = #000066
part = #8b4513
action = #663399
```

**Switching Themes:**
Open browser console (F12) and type:
```javascript
Config.setTheme('dark')     // Switch to dark theme
Config.setTheme('matrix')   // Switch to matrix theme
Config.setTheme('hacker')   // Switch to hacker theme
Config.setTheme('classic')  // Back to classic
```

Themes persist in localStorage and apply on reload.

### Events (settings/events.ini)

Event simulation controls background IRC activity (joins, parts, netsplits, etc.).

**Format:**
```ini
[lurkers]
names = Alice,Bob,Charlie,David,Emma,Frank,Grace,Henry,Iris,Jack,...

[events]
join_interval_min = 15000
join_interval_max = 45000
quit_interval_min = 30000
quit_interval_max = 90000
part_interval_min = 25000
part_interval_max = 75000
mode_interval_min = 60000
mode_interval_max = 180000
netsplit_interval_min = 300000
netsplit_interval_max = 900000
```

**Event Types:**
- **Joins:** New users join channels (green color)
- **Parts:** Users leave channels (brown color)
- **Quits:** Users disconnect from server (dark blue color)
- **Mode changes:** Operators grant/revoke +o/+v (green color, ops only)
- **Netsplits:** Server disconnections with delayed rejoins (brown color)

**Permissions:**
Only operators (@) or ChanServ can perform mode changes - regular users can't grant ops/voice.

### Channels  

Channels are generated **dynamically** - join ANY channel with `/join #channelname`. No configuration needed!

**Auto-Population:**
- 40-50 total users per channel
- 4-5 operators (@)
- 6-15 voiced users (+)
- 2-4 active AI personas
- Remaining users are lurkers (background activity only)

**Auto-Topics:**
Topics are derived from channel names:
- `#python` → "Python development and programming"
- `#gaming` → "Video games and gaming culture"
- `#0day` → "Zero-day exploits and security research"

**ChanServ Messages:**
If the main user receives operator status (@) when joining, ChanServ sends a welcome message.

## 🎮 IRC Commands

### Channel Commands
- `/join #channel` - Join a channel (auto-creates if doesn't exist)
- `/part [#channel] [message]` - Leave current or specified channel
- `/list` - Show all currently joined channels
- `/topic [text]` - View or set channel topic (ops only)
- `/names` - List all users in current channel

### User Commands
- `/nick newnick` - Change your nickname
- `/whois nick` - Show user information (mode, status)
- `/away [message]` - Set or clear away status
- `/quit [message]` - Disconnect from server

### Communication
- `/me action` - Send an action message (e.g., `/me laughs` → *YourNick laughs*)
- `/msg nick message` - Send private message to user
- `/notice nick message` - Send notice to user

### IRC Operator Commands
- `/mode user +o` - Grant operator status (ops only)
- `/mode user +v` - Grant voice status (ops only)
- `/mode user -o` - Remove operator status (ops only)
- `/mode user -v` - Remove voice status (ops only)
- `/kick nick [reason]` - Kick user from channel (ops only)

### Server Commands
- `/server url` - Change LM Studio server address
- `/connect` - Reconnect to server
- `/disconnect` - Disconnect from server

### Utility
- `/help [command]` - Show help for all or specific command
- `/clear` - Clear current window's message history

**Tips:**
- Direct mentions work with shortened names: "hey zero" finds ZeroCool
- Minimum 3-5 character nicknames for fuzzy matching
- Use TAB to cycle through windows (planned feature)

## 🐛 Troubleshooting

### Connection Issues

**"Cannot connect to server"**
- ✅ Ensure LM Studio is running with a model loaded
- ✅ Ensure Python CORS proxy is running: `python cors_proxy.py`
- ✅ Check server address is `http://localhost:5000` (NOT http://localhost:1234)
- ✅ Try demo mode as fallback: open `index.html?demo=true`

**"CORS error" in browser console**
- ✅ Don't connect directly to LM Studio (port 1234) 
- ✅ Always use the Python proxy (port 5000)
- ✅ Verify proxy is running: check terminal for "Running on http://0.0.0.0:5000"
- ✅ Restart the proxy if needed: `Ctrl+C`, then `python cors_proxy.py`

**"Connection refused" or "Network error"**
- ✅ LM Studio might not have server enabled - check "Local Server" tab
- ✅ Firewall might be blocking port 5000
- ✅ If LM Studio is on non-standard port: `python cors_proxy.py --lm-studio http://localhost:8080`
- ✅ If port 5000 is in use: `python cors_proxy.py --port 8000` (update app to connect to 8000)

### AI Response Issues

**No AI responses / personas don't talk**
- ✅ Check `settings/personas.ini` exists and is valid INI format
- ✅ Verify personas are loaded: check browser console (F12) for "Loaded X personas"
- ✅ Try mentioning a persona directly: "hey zerocool, are you there?"
- ✅ Ensure you're in a channel with active personas (2-4 assigned per channel)
- ✅ Check LM Studio has a model loaded and server is responding

**Slow AI responses (10+ seconds)**
- ✅ Your LM Studio model might be too large for your hardware
- ✅ Try smaller/faster models: Phi-3-mini, Llama-3.2-3B, Mistral-7B
- ✅ Reduce context window in LM Studio settings
- ✅ Check CPU/GPU usage - model might be swapping to RAM

**AI responses are too long or off-topic**
- ✅ Persona prompts enforce 5-15 word responses
- ✅ Multi-line responses are split automatically
- ✅ If still too long, adjust model temperature in LM Studio (try 0.7-0.9)
- ✅ Some models ignore length instructions - try different model

**Personas repeat themselves or give identical responses**
- ✅ Increase temperature in LM Studio (0.8-1.0)
- ✅ Enable "Add Generation Prompt" in LM Studio
- ✅ Different models have different creativity - try Mistral or Mixtral

### UI & Display Issues

**Colors look wrong / ugly**
- ✅ Try different theme: Open console (F12), type `Config.setTheme('dark')`
- ✅ Available themes: 'classic', 'dark', 'matrix', 'hacker'
- ✅ Check `settings/themes.ini` exists and has valid colors
- ✅ Hard refresh browser: `Ctrl+F5` or `Ctrl+Shift+R`

**Messages not showing or disappearing**
- ✅ 500 message limit per channel - old messages auto-delete
- ✅ Check if you're on the correct window (click switchbar button)
- ✅ Try `/clear` to reset channel and refresh

**Windows won't move/resize or overlap weirdly**
- ✅ Click and drag title bar to move
- ✅ Drag bottom-right corner to resize
- ✅ Clear localStorage to reset positions: open console, type `localStorage.clear()`, reload page
- ✅ Known issue: windows can sometimes stack - click switchbar to bring to front

**Auto-scroll not working**
- ✅ This should auto-scroll ALL windows - if not, report as bug
- ✅ Try scrolling manually to bottom, then send new message
- ✅ Check browser console for JavaScript errors

### Event/Channel Issues

**Channel appears empty after rejoining**
- ✅ This was a bug - should be fixed (leaveChannel cleanup)
- ✅ If still happening: close ALL windows for that channel and rejoin
- ✅ Check browser console for errors

**Regular users giving ops/voice (mode changes)**
- ✅ Fixed - only operators (@) or ChanServ can do mode changes
- ✅ If still seeing, refresh browser hard (`Ctrl+F5`)

**No lurker events (joins/parts/quits)**
- ✅ Check `settings/events.ini` exists with [lurkers] section
- ✅ Events interval is random - wait 15-90 seconds
- ✅ Events distribute across ALL open channels, not just current

**Netsplits never happen**
- ✅ Netsplits are rare by design (5-15 minute intervals)
- ✅ Check `settings/events.ini` for netsplit_interval settings
- ✅ Netsplits only happen if multiple users are present

### Configuration Issues

**personas.ini not loading**
- ✅ Check file is in `settings/` folder
- ✅ Verify INI format: `[SectionName]` then `key = value` pairs
- ✅ Browser console (F12) shows "Loaded X personas" on startup
- ✅ Ensure no leading spaces before `[SectionName]`

**themes.ini not found**
- ✅ Check file exists: `settings/themes.ini`
- ✅ Copy from `settings/themes.ini.example` if missing
- ✅ Verify INI format with sections like `[classic]`, `[dark]`

**events.ini not working**
- ✅ Ensure file is at `settings/events.ini`
- ✅ Check [lurkers] section has `names = Alice,Bob,Charlie,...`
- ✅ Check [events] section has interval settings

### Browser-Specific Issues

**File:// protocol issues (opening index.html directly)**
- ❌ Don't use file:// - always use HTTP server
- ✅ Use `python -m http.server 1337` and visit `http://localhost:1337`
- ✅ Or use `start_servers.bat` script (includes HTTP + proxy)

**Caching problems (old code running)**
- ✅ Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- ✅ Clear browser cache: Settings → Privacy → Clear browsing data
- ✅ Open in Incognito/Private mode for clean test
- ✅ Close all tabs and restart browser

**Browser compatibility**
- ✅ Tested on Chrome, Firefox, Edge (modern versions)
- ⚠️ Safari might have issues with CSS custom properties
- ⚠️ IE11 NOT supported (use modern browser)

### Still Having Issues?

1. **Check browser console** (F12) for error messages
2. **Try demo mode** to rule out LLM connection issues
3. **Test LLM connection** separately: `python test_llm_connection.py`
4. **Clear everything** and start fresh:
   ```javascript
   // In browser console (F12)
   localStorage.clear();
   location.reload();
   ```
5. **Check GitHub Issues** for known bugs or file a new issue

## 🛠️ Development

No build tools required! Just edit the HTML/CSS/JS files directly.

**To contribute:**
1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Test in both demo and LLM modes
5. Submit a pull request

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Inspired by classic mIRC and EFnet IRC networks
- Built for experimentation with local LLMs via LM Studio
- Retro UI design inspired by 1990s IRC clients

## 🔗 Links

- [GitHub Repository](https://github.com/krylabsofficial/mIRCvibes)
- [LM Studio](https://lmstudio.ai/)
- [PRD Document](tasks/prd-mirc-llm-simulator.md)

---

**Made with ❤️ for IRC nostalgia and LLM experimentation**
