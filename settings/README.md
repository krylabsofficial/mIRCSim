# Configuration Files Guide

This directory contains INI configuration files for the mIRC Simulator. All files use standard INI format with `[sections]` and `key = value` pairs.

## 📋 File Overview

| File | Purpose | Required | Editable |
|------|---------|----------|----------|
| `README.md` | This configuration guide | ℹ️ Docs | Read-only |
| `personas.ini` | AI character definitions + lurker pool | ✅ Yes | ✏️ Customize freely |
| `themes.ini` | Color theme definitions | ✅ Yes | ✏️ Add custom themes |

**Event Configuration:** Events are now managed through the **Event Settings UI** (⚙️ button in toolbar) with preset system (Chaotic/Normal/Chill/Custom). Lurker names are loaded from the `[lurkers]` section in `personas.ini`.

**Channel Configuration:** Channels are **dynamically generated** - join ANY channel with `/join #channelname`. No configuration file needed!

**Note:** All `.ini` files are committed to git as working defaults. You can modify them directly - no need for `.example` templates.

---

## 🎭 personas.ini

Defines AI-powered characters that respond in IRC channels.

### Format

```ini
[PersonaNickname]
nickname = PersonaNickname
style = Personality description and response style
```

### Fields

- **`[SectionName]`** - Unique identifier (typically matches nickname)
- **`nickname`** - Display name in IRC (shown with `<brackets>`)
- **`style`** - Personality prompt for LLM (how persona talks, acts, responds)

### Example

```ini
[ZeroCool]
nickname = ZeroCool
style = Cocky teenage hacker from 1995, uses 1337speak, brief responses (5-15 words)

[AcidBurn]
nickname = AcidBurn
style = Strong female hacker, confident and sharp-tongued, feminist edge, brief responses

[Neo]
nickname = Neo
style = Philosophical hacker questioning reality, references The Matrix, brief responses
```

### Style Guidelines

1. **Keep it concise** - The LLM sees this as a system prompt
2. **Specify brevity** - Add "brief responses (5-15 words)" to prevent long outputs
3. **Define personality** - Include era, attitude, speech patterns
4. **Add constraints** - IRC etiquette, topic focus, vocabulary style

### Response Behavior

- **Random Selection:** Each channel gets 2-4 randomly selected active personas
- **Topic Awareness:** Personas receive channel topic as context
- **Direct Mentions:** Fuzzy matching on nicknames (e.g., "hey zero" → ZeroCool)
- **Butt-in Chance:** 15% probability of responding when another persona is mentioned
- **Multi-line Handling:** Long responses automatically split into separate messages

### Current Personas (23)

1. ZeroCool - Cocky teenage hacker (1995)
2. AcidBurn - Strong female hacker
3. LordNikon - Photographic memory, quiet observer
4. CrashOverride - Arrogant elite hacker
5. PhantomPhreak - Phone phreak master
6. ThePlague - Corporate villain, condescending
7. razor - Old-school BBS scene veteran
8. h4x0r - Script kiddie wannabe
9. Neo - Philosophical Matrix hacker
10. Trinity - Skilled Matrix operative
11. Morpheus - Wise mentor figure
12. MrRobot - Paranoid genius activist
13. Darlene - Impulsive younger sibling
14. Whiterose - Patient strategist
15. Tyrell - Corporate tech executive
16. Angela - Conflicted ethical hacker
17. BitKid - Young prodigy
18. ByteBandit - Cryptocurrency enthusiast
19. RootAccess - AI-obsessed researcher
20. ScriptNinja - Automation expert
21. PacketSurfer - Network specialist
22. SilentGh0st - Lurker with rare insights
23. ByteSmith - Retro hardware hacker

### [lurkers] Section

This file also contains a **`[lurkers]`** section at the end with a comma-separated list of 180+ background user names:

```ini
[lurkers]
names = BackgroundUser1,BackgroundUser2,BackgroundUser3,...
```

**Purpose:**
- Populate channels with realistic user counts
- Used in join/quit/part/mode/netsplit events
- Never send chat messages (silent presence)
- NOT AI personas (just names for background activity)

**Event Configuration:** Event timing and behavior is controlled via the **Event Settings UI** (🎛️ button in toolbar), which offers presets (Chaotic/Normal/Chill/Custom) instead of manual INI editing.

### Deprecated Fields

- **`color`** - No longer used (theme system controls nickname colors)

---

## 🎨 themes.ini

Defines color schemes for the IRC interface.

### Format

```ini
[themename]
chrome_bg = #hexcolor
chrome_fg = #hexcolor
message_bg = #hexcolor
message_fg = #hexcolor
join = #hexcolor
quit = #hexcolor
part = #hexcolor
action = #hexcolor
mode = #hexcolor
error = #hexcolor
system = #hexcolor
```

### Fields

- **`[themename]`** - Theme identifier (lowercase, used in console commands)
- **`chrome_bg`** - Background for menus, toolbars, dialogs, buttons
- **`chrome_fg`** - Foreground (text) for chrome elements
- **`message_bg`** - Chat message window background
- **`message_fg`** - Chat message text color (nicknames, normal text)
- **`join`** - Color for join/mode messages
- **`quit`** - Color for quit messages
- **`part`** - Color for part messages
- **`action`** - Color for `/me` actions
- **`mode`** - Color for mode changes (same as join)
- **`error`** - Color for error messages
- **`system`** - Color for system messages

### Available Themes

#### Classic (default)
Authentic mIRC look from the 1990s.
```ini
[classic]
chrome_bg = #c0c0c0    # Gray chrome
chrome_fg = #000000    # Black text
message_bg = #ffffff   # White messages
message_fg = #000000   # Black text
join = #009900         # Green
quit = #000066         # Dark blue
part = #8b4513         # Brown
action = #663399       # Purple
```

#### Dark
Modern dark mode for comfortable viewing.
```ini
[dark]
chrome_bg = #2b2b2b    # Dark gray
chrome_fg = #d4d4d4    # Light gray text
message_bg = #1e1e1e   # Darker gray
message_fg = #d4d4d4   # Light text
join = #4ec9b0         # Cyan
quit = #569cd6         # Blue
part = #ce9178         # Orange
action = #c586c0       # Purple
```

#### Matrix
Green-on-black hacker aesthetic.
```ini
[matrix]
chrome_bg = #000000    # Black
chrome_fg = #00ff00    # Bright green
message_bg = #000000   # Black
message_fg = #00ff00   # Green text
join = #00ff00         # Green
quit = #008000         # Dark green
part = #ffff00         # Yellow
action = #00ff00       # Green
```

#### Hacker
GitHub dark theme inspired.
```ini
[hacker]
chrome_bg = #0a0e14    # Very dark blue-gray
chrome_fg = #f0f6fc    # Off-white
message_bg = #0d1117   # Dark gray-blue
message_fg = #f0f6fc   # Light text
join = #3fb950         # Green
quit = #1f6feb         # Blue
part = #d29922         # Gold
action = #bc8cff       # Purple
```

### Switching Themes

**Console Method (current):**
```javascript
// Open browser console (F12) and type:
Config.setTheme('dark')
Config.setTheme('matrix')
Config.setTheme('hacker')
Config.setTheme('classic')
```

**UI Button (planned):**
Theme toggle button currently hidden - console-only access until color application perfected.

### Theme Persistence

Themes are saved to `localStorage` with key `mirc_theme` and persist across browser sessions.

---

## 🔧 Troubleshooting

### INI Format Issues

**Symptoms:**
- "Loaded 0 personas" in console
- "Loaded 0 lurker names" in console
- Themes not applying

**Common Mistakes:**
```ini
# ❌ WRONG - Leading spaces before section
  [ZeroCool]

# ✅ CORRECT
[ZeroCool]

# ❌ WRONG - Missing space around =
nickname=ZeroCool

# ✅ CORRECT
nickname = ZeroCool

# ❌ WRONG - Comments mid-line
nickname = ZeroCool # hacker

# ✅ CORRECT - Comments on own line
# This is ZeroCool, the main hacker
nickname = ZeroCool
```

### Validation

Check browser console (F12) on page load:
```
✅ Loaded 24 personas from personas.ini
✅ Loaded 180+ lurker names from personas.ini [lurkers] section
✅ Loaded 4 themes from themes.ini
✅ Applied theme: classic
```

### File Paths

All config files must be in `settings/` directory relative to `index.html`:
```
mIRCSim/
├── index.html
└── settings/
    ├── personas.ini  ← Here (includes [lurkers] section)
    └── themes.ini    ← Here
```

### Testing Changes

1. Edit config file
2. Save changes
3. Hard refresh browser: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
4. Check console for "Loaded X items" messages
5. Test functionality (e.g., `/join #test` to see new persona)

---

## 📚 References

- **INI Format Specification:** [Wikipedia - INI file](https://en.wikipedia.org/wiki/INI_file)
- **Color Codes:** [HTML Color Picker](https://htmlcolorcodes.com/)
- **IRC Event Reference:** [RFC 1459](https://tools.ietf.org/html/rfc1459)

---

**Questions or Issues?** Check the main [README.md](../README.md) troubleshooting section or open a GitHub issue.
