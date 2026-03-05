/**
 * Username Generator - mIRC LLM Simulator
 * Generates authentic IRC-style usernames for lurker users
 */

const UsernameGenerator = {
    // Pool of username components
    prefixes: [
        'Dark', 'Neo', 'Cyber', 'Shadow', 'Frost', 'Silent', 'Rogue', 'Ghost',
        'Binary', 'Digital', 'Electric', 'Neon', 'Void', 'Quantum', 'Pixel',
        'Techno', 'Chrome', 'Stealth', 'Matrix', 'Crypto', 'Hyper', 'Ultra'
    ],

    suffixes: [
        'Wolf', 'Dragon', 'Phoenix', 'Hawk', 'Viper', 'Reaper', 'Blade',
        'Storm', 'Fire', 'Ice', 'Knight', 'Raven', 'Serpent', 'Tiger',
        'Fox', 'Bear', 'Lion', 'Eagle', 'Shark', 'Falcon'
    ],

    words: [
        'byte', 'hack', 'code', 'root', 'shell', 'script', 'node', 'core',
        'link', 'sync', 'flux', 'pulse', 'wave', 'ray', 'beam', 'spark',
        'shift', 'drift', 'glitch', 'crash', 'burn', 'blaze', 'frost', 'chill'
    ],

    // Pre-generated authentic IRC usernames (90s/2000s style)
    staticNames: [
        'FragMaster', 'l33tH4x0r', 'SysAdmin', 'NetRunner', 'PacketSniffer',
        'ScriptKiddie', 'ByteMe', 'BitHead', 'CodeMonkey', 'SQLNinja',
        'BufferOverflow', 'StackTrace', 'NullPointer', 'SegFault', 'KernelPanic',
        'RootKit', 'BackDoor', 'FireWall', 'ProxyServer', 'DNSmasq',
        'PingFlood', 'SYNFlood', 'DDoSer', 'BotNet', 'WormHole',
        'TrojanHorse', 'VirusTotal', 'MalwareHunter', 'SpyWare', 'AdWare',
        'CookieMonster', 'SessionHijack', 'ManInTheMiddle', 'BruteForce', 'DictAttack',
        'RainbowTable', 'HashCrack', 'CipherText', 'PlainText', 'EncryptThis',
        'DecryptThat', 'KeyLogger', 'ScreenGrab', 'PacketDump', 'WireShark',
        'TCPdump', 'NetStat', 'IfConfig', 'IPtables', 'SSHtunnel',
        'VPNgate', 'TORnode', 'OnionRouter', 'DarkWeb', 'DeepNet',
        'ClearNet', 'AnonOps', 'lulzsec', 'AntiSec', 'WikiLeaks',
        'Snowden', 'Manning', 'Assange', 'SwedishPirate', 'ThePirateBay',
        'TorrentFreak', 'MegaUpload', 'RapidShare', 'FileFactory', 'MediaFire',
        'DropBox', 'CloudFlare', 'AWS_User', 'GCP_Admin', 'Azure_Dev',
        'Docker_Whale', 'Kubernetes', 'Jenkins_CI', 'GitHubber', 'GitLab_Runner',
        'StackOverflow', 'RedditLurker', 'HackerNews', '4chanAnon', 'SlashDotter',
        'DiggnNation', 'StumbleUpon', 'DeliciousUser', 'Fark_Reader', 'MetaFilter',
        'SomethingAwful', 'BASHorg', 'QuoteDB', 'IRCQuotes', 'FMLreader',
        'Dilbert_Fan', 'XKCD_Addict', 'WebComic', 'MemeGenerator', 'LOLcats',
        'RickRoller', 'AllYourBase', 'OverNineThousand', 'Longcat', 'Tacgnol',
        'LazerKitty', 'NyanCat', 'BadgerBadger', 'PeanutButter', 'CharlieUnicorn',
        'LimeWire', 'Napster', 'Kazaa', 'BearShare', 'Morpheus',
        'eMule', 'uTorrent', 'BitTorrent', 'Transmission', 'Deluge',
        'WinRAR', 'SevenZip', 'WinZip', 'PKZIP', 'GZip',
        'TarBall', 'DebPackage', 'RPMforge', 'YumUpdate', 'AptGet',
        'Pacman_User', 'Portage', 'Gentoo_User', 'Arch_BTW', 'Ubuntu_Noob',
        'Debian_Stable', 'Fedora_Hat', 'RedHat_Cert', 'CentOS_Admin', 'AlpineLinux',
        'BSD_Daemon', 'FreeBSD', 'OpenBSD', 'NetBSD', 'DragonflyBSD',
        'Solaris_Sun', 'HPUX_Admin', 'AIX_User', 'IRIX_SGI', 'NeXTSTEP',
        'BeOS', 'OS2_Warp', 'AmigaOS', 'AtariST', 'Commodore64',
        'AppleII', 'TRS80', 'ZXSpectrum', 'VIC20', 'PET2001',
        'PDP11', 'VAX_VMS', 'Mainframe', 'AS400', 'COBOL_Dev',
        'FORTRAN_Coder', 'Assembly_Asm', 'MachineCode', 'HexEditor', 'BinaryNinja',
        'IDA_Pro', 'GDB_User', 'Valgrind', 'Strace', 'Ltrace',
        'OllyDbg', 'WinDbg', 'x64dbg', 'Immunity', 'GHidra',
        'Radare2', 'Frida_Hook', 'DynamoRIO', 'Pin_Tool', 'QEMU_Emu',
        'Bochs_VM', 'VirtualBox', 'VMware_User', 'Parallels', 'Hyper_V',
        'ProxMox', 'XenServer', 'KVM_Host', 'ESXi_Admin', 'vSphere',
        'CloudInit', 'Terraform', 'Ansible', 'Puppet', 'Chef_Recipe',
        'SaltStack', 'CFEngine', 'Vagrant', 'Packer', 'Consul',
        'Nomad', 'Vault_Secret', 'Boundary', 'Waypoint', 'Sentinel'
    ],

    // Track used usernames to avoid duplicates in same session
    usedNames: new Set(),

    /**
     * Generate a random IRC-style username
     * @returns {string} Random username
     */
    generate() {
        const methods = [
            () => this.generatePrefixSuffix(),
            () => this.generateWordNumber(),
            () => this.generateStatic(),
            () => this.generateLeet(),
            () => this.generateCompound()
        ];

        // Try up to 20 times to get a unique name
        for (let i = 0; i < 20; i++) {
            const method = Utils.randomChoice(methods);
            const name = method.call(this);
            
            if (!this.usedNames.has(name)) {
                this.usedNames.add(name);
                return name;
            }
        }

        // Fallback: add random number to ensure uniqueness
        const baseName = this.generateStatic();
        const uniqueName = baseName + Utils.randomInt(100, 9999);
        this.usedNames.add(uniqueName);
        return uniqueName;
    },

    /**
     * Generate prefix + suffix combination
     */
    generatePrefixSuffix() {
        const prefix = Utils.randomChoice(this.prefixes);
        const suffix = Utils.randomChoice(this.suffixes);
        
        // Randomly add number
        if (Math.random() < 0.3) {
            return prefix + suffix + Utils.randomInt(1, 99);
        }
        
        return prefix + suffix;
    },

    /**
     * Generate word + number combination
     */
    generateWordNumber() {
        const word = Utils.randomChoice(this.words);
        const num = Utils.randomInt(1, 9999);
        
        // Capitalize randomly
        const capitalized = Math.random() < 0.5 
            ? word.charAt(0).toUpperCase() + word.slice(1)
            : word;
        
        return capitalized + num;
    },

    /**
     * Generate from static name pool
     */
    generateStatic() {
        return Utils.randomChoice(this.staticNames);
    },

    /**
     * Generate l33t speak variations
     */
    generateLeet() {
        const words = ['hacker', 'coder', 'elite', 'master', 'admin', 'root', 'user', 'guest'];
        let word = Utils.randomChoice(words);
        
        // Apply l33t transformations
        word = word.replace(/e/g, Math.random() < 0.5 ? '3' : 'e');
        word = word.replace(/a/g, Math.random() < 0.5 ? '4' : 'a');
        word = word.replace(/o/g, Math.random() < 0.5 ? '0' : 'o');
        word = word.replace(/i/g, Math.random() < 0.5 ? '1' : 'i');
        word = word.replace(/s/g, Math.random() < 0.5 ? '5' : 's');
        word = word.replace(/t/g, Math.random() < 0.5 ? '7' : 't');
        
        // Add random suffix
        const suffixes = ['_', 'x', 'z', 'r'];
        if (Math.random() < 0.4) {
            word += Utils.randomChoice(suffixes);
        }
        
        return word;
    },

    /**
     * Generate compound word combinations
     */
    generateCompound() {
        const word1 = Utils.randomChoice(this.words);
        const word2 = Utils.randomChoice(this.words);
        
        // Capitalize each word
        const cap1 = word1.charAt(0).toUpperCase() + word1.slice(1);
        const cap2 = word2.charAt(0).toUpperCase() + word2.slice(1);
        
        return cap1 + cap2;
    },

    /**
     * Generate a batch of unique usernames
     * @param {number} count - Number of usernames to generate
     * @returns {Array<string>} Array of unique usernames
     */
    generateBatch(count) {
        const names = [];
        for (let i = 0; i < count; i++) {
            names.push(this.generate());
        }
        return names;
    },

    /**
     * Reset the used names tracker (for new channel)
     */
    reset() {
        this.usedNames.clear();
    }
};

// Make available globally
window.UsernameGenerator = UsernameGenerator;
