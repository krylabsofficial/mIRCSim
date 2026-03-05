/**
 * Topic Generator - mIRC LLM Simulator
 * Derives channel topics from channel names for dynamic channel generation
 */

const TopicGenerator = {
    // Keyword-to-topic mappings
    topicMappings: {
        // Programming & Technology
        'python': 'Python programming, scripting, data science discussion',
        'javascript': 'JavaScript, Node.js, web development',
        'java': 'Java programming, JVM languages, enterprise dev',
        'cpp': 'C++ programming, systems development',
        'csharp': 'C# programming, .NET framework discussion',
        'golang': 'Go programming, cloud native development',
        'rust': 'Rust programming, systems safety',
        'ruby': 'Ruby programming, Rails development',
        'php': 'PHP development, web backends',
        'code': 'General programming and coding discussion',
        'dev': 'Software development, best practices',
        'programming': 'General programming topics and languages',
        'webdev': 'Web development, frontend and backend',
        'linux': 'Linux systems, distributions, administration',
        'unix': 'Unix systems and philosophy',
        'windows': 'Windows OS, administration, development',
        'macos': 'macOS, iOS, Apple development',
        'android': 'Android development and apps',
        'ios': 'iOS development and apps',
        'mobile': 'Mobile development, cross-platform',
        
        // Security & Hacking
        'hacking': 'Ethical hacking, penetration testing',
        'hackers': 'Elite h4x0rs only - security discussion',
        'security': 'Information security, cybersecurity',
        'infosec': 'Information security professionals',
        'netsec': 'Network security, firewalls, IDS/IPS',
        'appsec': 'Application security, secure coding',
        'pentest': 'Penetration testing, red team ops',
        'redteam': 'Red team operations and tactics',
        'blueteam': 'Blue team defense and monitoring',
        'ctf': 'Capture the flag competitions',
        'exploit': 'Exploit development and research',
        '0day': 'Zero-day exploits and vulnerability research',
        'malware': 'Malware analysis and reverse engineering',
        'crypto': 'Cryptography and encryption',
        'forensics': 'Digital forensics and incident response',
        
        // Networking & Infrastructure
        'networking': 'Network engineering and protocols',
        'sysadmin': 'System administration and DevOps',
        'devops': 'DevOps practices, CI/CD, automation',
        'cloud': 'Cloud computing, AWS, Azure, GCP',
        'aws': 'Amazon Web Services discussion',
        'azure': 'Microsoft Azure cloud platform',
        'gcp': 'Google Cloud Platform',
        'docker': 'Docker containers and containerization',
        'kubernetes': 'Kubernetes orchestration',
        'servers': 'Server management and hosting',
        'database': 'Database design and administration',
        'sql': 'SQL databases and queries',
        'nosql': 'NoSQL databases, MongoDB, Redis',
        
        // Gaming
        'gaming': 'Video games, gaming culture',
        'games': 'Game discussion, recommendations',
        'retro': 'Retro gaming, classic consoles',
        'pcgaming': 'PC gaming, hardware, mods',
        'console': 'Console gaming, PlayStation, Xbox',
        'nintendo': 'Nintendo games and systems',
        'steam': 'Steam platform, game deals',
        'esports': 'Competitive gaming, esports',
        'minecraft': 'Minecraft building and servers',
        'gta': 'Grand Theft Auto series',
        'fps': 'First-person shooters',
        'mmo': 'MMO games, guilds, raids',
        
        // General Interest
        'general': 'General discussion and friendly chat',
        'random': 'Random topics, off-topic discussion',
        'offtopic': 'Off-topic conversations, random chat',
        'chat': 'General chat and conversation',
        'lounge': 'Casual hangout and discussion',
        'watercooler': 'Water cooler talk, casual chat',
        'social': 'Social chat and networking',
        
        // Technology & Hardware
        'hardware': 'Computer hardware, builds, reviews',
        'tech': 'Technology news and discussion',
        'gadgets': 'Latest gadgets and devices',
        'apple': 'Apple products and ecosystem',
        'android': 'Android devices and customization',
        'pc': 'PC building, hardware, peripherals',
        'laptop': 'Laptop recommendations and support',
        
        // Internet Culture
        'memes': 'Internet memes and humor',
        'reddit': 'Reddit discussion and links',
        'twitter': 'Twitter/X discussion',
        'youtube': 'YouTube content and creators',
        'twitch': 'Twitch streaming and streamers',
        'anime': 'Anime discussion and recommendations',
        'manga': 'Manga reading and discussion',
        'music': 'Music discussion, sharing, recommendations',
        'movies': 'Movie discussion and recommendations',
        'tv': 'TV shows and series discussion',
        'books': 'Book discussion and recommendations',
        
        // Science & Education
        'science': 'Science discussion and research',
        'math': 'Mathematics and problem solving',
        'physics': 'Physics discussion and theories',
        'chemistry': 'Chemistry and molecular science',
        'biology': 'Biology and life sciences',
        'space': 'Space exploration, astronomy',
        'ai': 'Artificial intelligence and machine learning',
        'ml': 'Machine learning and data science',
        'datascience': 'Data science and analytics',
        
        // Cryptocurrency & Finance
        'bitcoin': 'Bitcoin discussion and trading',
        'ethereum': 'Ethereum and smart contracts',
        'blockchain': 'Blockchain technology',
        'stocks': 'Stock market and investing',
        'trading': 'Trading strategies and markets',
        'finance': 'Personal finance and investing',
        
        // Misc
        'help': 'Tech support and help channel',
        'support': 'Support and troubleshooting',
        'news': 'News and current events',
        'politics': 'Political discussion (civil)',
        'debate': 'Debates and discussions',
        'philosophy': 'Philosophy and deep thoughts',
        'art': 'Art, design, and creativity',
        'photography': 'Photography and cameras',
        'cooking': 'Cooking, recipes, food',
        'fitness': 'Fitness, health, workouts',
        'sports': 'Sports discussion and scores'
    },

    /**
     * Generate a topic for a channel based on its name
     * @param {string} channelName - Channel name (with or without #)
     * @returns {string} Channel topic
     */
    generateTopic(channelName) {
        // Remove # if present
        const cleanName = channelName.replace('#', '').toLowerCase();
        
        // Check for exact match
        if (this.topicMappings[cleanName]) {
            return this.topicMappings[cleanName];
        }
        
        // Check for partial matches (keyword in channel name)
        for (const [keyword, topic] of Object.entries(this.topicMappings)) {
            if (cleanName.includes(keyword) || keyword.includes(cleanName)) {
                return topic;
            }
        }
        
        // Generate generic topic based on channel name
        return this.generateGenericTopic(cleanName);
    },

    /**
     * Generate a generic topic when no mapping exists
     * @param {string} cleanName - Channel name without #
     * @returns {string} Generic topic
     */
    generateGenericTopic(cleanName) {
        const templates = [
            `Discussion about ${cleanName}`,
            `${cleanName} enthusiasts and discussion`,
            `Talk about ${cleanName} and related topics`,
            `${cleanName} - chat and discussion`,
            `General ${cleanName} channel`,
            `Welcome to #${cleanName}!`,
            `${cleanName} community chat`
        ];
        
        return Utils.randomChoice(templates);
    },

    /**
     * Get a theme/style hint for LLM prompts based on channel
     * @param {string} channelName - Channel name
     * @returns {string} Theme hint for LLM
     */
    getThemeHint(channelName) {
        const cleanName = channelName.replace('#', '').toLowerCase();
        
        // Security/Hacking channels
        if (cleanName.match(/hack|security|exploit|0day|pentest|ctf/)) {
            return 'Technical security discussion, use hacker lingo, be edgy but knowledgeable';
        }
        
        // Programming channels
        if (cleanName.match(/python|java|code|dev|programming|rust|golang/)) {
            return 'Technical programming discussion, share code snippets, discuss best practices';
        }
        
        // Gaming channels
        if (cleanName.match(/gaming|game|fps|mmo|steam|nintendo/)) {
            return 'Gaming culture, share game experiences, discuss strategies and metas';
        }
        
        // Crypto/Finance
        if (cleanName.match(/bitcoin|crypto|trading|stocks|finance/)) {
            return 'Financial discussion, market analysis, investment talk';
        }
        
        // Random/Social
        if (cleanName.match(/random|offtopic|chat|social|lounge/)) {
            return 'Casual conversation, anything goes, be friendly and fun';
        }
        
        // Default
        return `Discussion about ${cleanName}, stay on topic, be respectful`;
    }
};

// Make available globally
window.TopicGenerator = TopicGenerator;
