/**
 * Single-file Movie/Series Scraper and Streaming Extractor
 * Target: https://a.111477.xyz
 * 
 * Features:
 * - Search for movies and series across multiple categories
 * - Extract direct playable streaming links (MP4, MKV)
 * - Handle both movies and series (seasons/episodes)
 * - Built-in rate-limiting handling (429 errors)
 * - Modular design in a single file
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://a.111477.xyz';

// Axios instance with custom headers to mimic a real browser
const client = axios.create({
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
});

/**
 * Utility: Sleep for a given amount of time
 * Used to avoid triggering rate limits (HTTP 429)
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Utility: Clean and format title for comparison
 */
function cleanTitle(title) {
    return title.toLowerCase().replace(/[^\w\s]/gi, '').trim();
}

/**
 * Utility: Calculate title similarity
 * Currently uses a simple inclusion check for speed and reliability on this specific site
 */
function similarity(query, target) {
    const q = cleanTitle(query);
    const t = cleanTitle(target);
    if (t.includes(q) || q.includes(t)) return 1.0;
    return 0;
}

/**
 * Core: Scrape a directory listing from the target site
 * Handles parsing the table-based index and manages retries on rate limits
 */
async function getDirectoryListing(url, retry = true) {
    try {
        // Essential delay to prevent 429 errors from the server
        await sleep(2500); 
        
        const response = await client.get(url);
        const $ = cheerio.load(response.data);
        const items = [];

        // The site uses a standard Apache-style index table
        $('table tr').each((i, el) => {
            const nameCell = $(el).find('td').eq(1);
            const link = nameCell.find('a').attr('href');
            const name = nameCell.find('a').text().trim();
            
            // Skip navigation links and empty entries
            if (link && name && !name.includes('Parent Directory') && name !== '../') {
                const isDir = link.endsWith('/');
                items.push({
                    name,
                    url: link.startsWith('http') ? link : new URL(link, url).toString(),
                    type: isDir ? 'directory' : 'file'
                });
            }
        });

        return items;
    } catch (error) {
        if (retry && error.response && error.response.status === 429) {
            console.warn(`Rate limited on ${url}, waiting 5s before retry...`);
            await sleep(5000);
            return getDirectoryListing(url, false);
        }
        return [];
    }
}

/**
 * Feature A: Search Function
 * Scrapes main categories and finds the best matching movie or series
 * @param {string} query - The movie or series title to search for
 * @returns {Promise<Object|null>} - Found content metadata or null
 */
async function search(query) {
    const categories = [
        { name: 'movies', url: `${BASE_URL}/movies/` },
        { name: 'series', url: `${BASE_URL}/tvs/` },
        { name: 'kdrama', url: `${BASE_URL}/kdrama/` },
        { name: 'asiandrama', url: `${BASE_URL}/asiandrama/` }
    ];

    let bestMatch = null;

    // Search sequentially to respect server limits
    for (const cat of categories) {
        const items = await getDirectoryListing(cat.url);
        for (const item of items) {
            if (similarity(query, item.name) > 0.8) {
                bestMatch = {
                    ...item,
                    category: cat.name
                };
                break;
            }
        }
        if (bestMatch) break;
    }

    if (!bestMatch) return null;

    return {
        title: bestMatch.name.replace(/\/$/, ''),
        type: bestMatch.category === 'movies' ? 'movie' : 'series',
        contentId: bestMatch.url
    };
}

/**
 * Utility: Extract quality and audio info from filename
 */
function parseFileInfo(file) {
    const name = file.name;
    let quality = 'Unknown';
    if (name.includes('2160p') || name.includes('4K')) quality = '2160p';
    else if (name.includes('1080p')) quality = '1080p';
    else if (name.includes('720p')) quality = '720p';
    else if (name.includes('480p')) quality = '480p';

    let audio = 'English'; // Default for this source
    if (name.toLowerCase().includes('hindi')) audio = 'Hindi';
    
    return {
        quality,
        url: file.url,
        audio,
        name: name
    };
}

/**
 * Feature B & C: Stream Extraction and Processing
 * Navigates content directories to find direct playable links
 * @param {string} contentId - The URL of the content directory
 * @returns {Promise<Object|null>} - Structured JSON with stream links
 */
async function getStreams(contentId) {
    const items = await getDirectoryListing(contentId);
    if (!items.length) return null;

    // Identify if it's a series (has season folders) or a movie (has video files)
    const seasonDirs = items.filter(i => i.type === 'directory' && 
        (i.name.toLowerCase().includes('season') || i.name.toLowerCase().includes('specials')));
    
    const videoFiles = items.filter(i => i.type === 'file' && 
        /\.(mkv|mp4|avi|m4v)$/i.test(i.name));

    const result = {
        title: decodeURIComponent(contentId.split('/').filter(Boolean).pop()),
        type: seasonDirs.length > 0 ? 'series' : 'movie',
        streams: []
    };

    if (result.type === 'movie') {
        // Process movie files directly
        result.streams = videoFiles.map(parseFileInfo);
    } else {
        // Process series: Iterate through each season folder
        const seasonData = [];
        for (const season of seasonDirs) {
            const episodes = await getDirectoryListing(season.url);
            const videoEpisodes = episodes.filter(e => e.type === 'file' && 
                /\.(mkv|mp4|avi|m4v)$/i.test(e.name));
            
            const mapped = videoEpisodes.map(ep => ({
                season: season.name.replace(/\/$/, ''),
                ...parseFileInfo(ep)
            }));
            seasonData.push(...mapped);
        }
        result.streams = seasonData;
    }

    return result;
}

/**
 * CLI Entry Point
 * Allows running the script from terminal: node scraper.js "Movie Name"
 */
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: node scraper.js "Title"');
        process.exit(0);
    }

    const query = args.join(' ');

    try {
        const searchResult = await search(query);

        if (!searchResult) {
            console.log(JSON.stringify(null));
            return;
        }

        const finalData = await getStreams(searchResult.contentId);
        console.log(JSON.stringify(finalData, null, 2));
    } catch (err) {
        console.error('An error occurred:', err.message);
        process.exit(1);
    }
}

// Export for module usage and handle CLI execution
if (require.main === module) {
    main();
}

module.exports = { search, getStreams };
