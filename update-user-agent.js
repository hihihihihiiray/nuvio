#!/usr/bin/env node

// User-Agent Update Script for Nuvio Providers
// Usage: node update-user-agent.js "your-new-user-agent-string"

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    reset: '\x1b[0m'
};

function log(message, color = '') {
    console.log(color + message + colors.reset);
}

// Get new User-Agent from command line
const newUserAgent = process.argv[2];

if (!newUserAgent) {
    log('Error: No User-Agent provided', colors.red);
    log('Usage: node update-user-agent.js "Mozilla/5.0 ..."');
    process.exit(1);
}

const providersDir = './providers';

// Check if providers directory exists
if (!fs.existsSync(providersDir)) {
    log('Error: providers directory not found', colors.red);
    log('Make sure you run this script from the root of your scrapers directory');
    process.exit(1);
}

log('=== User-Agent Update Script ===', colors.green);
log('New User-Agent: ' + newUserAgent, colors.yellow);
console.log('');

let modifiedCount = 0;

// Read all .js files in providers directory
const files = fs.readdirSync(providersDir).filter(f => f.endsWith('.js'));

files.forEach(filename => {
    const filepath = path.join(providersDir, filename);
    let content = fs.readFileSync(filepath, 'utf8');
    
    // Check if file contains User-Agent
    if (content.includes('User-Agent') || content.includes('user-agent') || content.includes('USER_AGENT')) {
        log(`Processing: ${filename}`, colors.yellow);
        
        
        // Replace User-Agent patterns
        const patterns = [
            // Pattern 1: 'User-Agent': 'Mozilla...'
            /'User-Agent':\s*'[^']*'/g,
            // Pattern 2: "User-Agent": "Mozilla..."
            /"User-Agent":\s*"[^"]*"/g,
            // Pattern 3: 'user-agent': 'Mozilla...'
            /'user-agent':\s*'[^']*'/g,
            // Pattern 4: "user-agent": "Mozilla..."
            /"user-agent":\s*"[^"]*"/g,
            // Pattern 5: USER_AGENT = 'Mozilla...'
            /USER_AGENT\s*=\s*'[^']*'/g,
            // Pattern 6: USER_AGENT = "Mozilla..."
            /USER_AGENT\s*=\s*"[^"]*"/g,
            // Pattern 7: const USER_AGENT = "Mozilla..."
            /const\s+USER_AGENT\s*=\s*"[^"]*"/g,
            // Pattern 8: var USER_AGENT = "Mozilla..."
            /var\s+USER_AGENT\s*=\s*"[^"]*"/g
        ];
        
        const replacements = [
            `'User-Agent': '${newUserAgent}'`,
            `"User-Agent": "${newUserAgent}"`,
            `'user-agent': '${newUserAgent}'`,
            `"user-agent": "${newUserAgent}"`,
            `USER_AGENT = '${newUserAgent}'`,
            `USER_AGENT = "${newUserAgent}"`,
            `const USER_AGENT = "${newUserAgent}"`,
            `var USER_AGENT = "${newUserAgent}"`
        ];
        
        patterns.forEach((pattern, index) => {
            content = content.replace(pattern, replacements[index]);
        });
        
        // Write updated content
        fs.writeFileSync(filepath, content);
        
        modifiedCount++;
        log('  ✓ Updated', colors.green);
    } else {
        log(`Skipping: ${filename} (no User-Agent found)`);
    }
});

console.log('');
log('=== Complete ===', colors.green);
log(`Modified ${modifiedCount} file(s)`);
console.log('');
log('Backups created with .backup extension', colors.yellow);
log('To restore: mv providers/file.js.backup providers/file.js', colors.yellow);
log('To remove backups: rm providers/*.backup', colors.yellow);
