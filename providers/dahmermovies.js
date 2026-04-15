// Dahmer Movies Scraper - Unified Path & Playback Fix
// Fixes: Double /movies/ error, Peaky Blinders (2025), Zootopia 2, Send Help

console.log('[DahmerMovies] Initializing Scraper');

const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const DAHMER_MOVIES_API = 'https://a.111477.xyz';

async function makeRequest(url) {
    return fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
    });
}

function parseLinks(html) {
    const links = [];
    const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];
        const text = match[2].trim();
        if (!text || href === '../' || href.includes('?C=')) continue;
        links.push({ text, href });
    }
    return links;
}

async function invokeDahmerMovies(title, year, season = null, episode = null) {
    const pathType = season === null ? 'movies' : 'tvs';
    const cleanTitle = title.replace(/:/g, '');
    
    // Variations: Try "Title (Year)" first as it is the most successful
    const variations = [`${cleanTitle} (${year})`, cleanTitle];

    let html = '';
    let finalBaseUrl = '';

    for (let i = 0; i < variations.length; i++) {
        const folder = variations[i];
        const safeFolder = folder.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
        let tryUrl = `${DAHMER_MOVIES_API}/${pathType}/${safeFolder}/`;
        
        if (season !== null) {
            const s = season < 10 ? '0' + season : season;
            tryUrl += `Season%20${s}/`;
        }

        try {
            const res = await makeRequest(tryUrl);
            const text = await res.text();
            if (text && text.includes('<a')) {
                html = text;
                finalBaseUrl = tryUrl;
                break; 
            }
        } catch (e) { continue; }
    }

    if (!html) return [];

    const paths = parseLinks(html);
    const filtered = (season !== null) 
        ? paths.filter(p => {
            const s = season < 10 ? `0${season}` : `${season}`;
            const e = episode < 10 ? `0${episode}` : `${episode}`;
            return new RegExp(`(S${s}E${e}|${season}x${e}|[\\s\\.\\-_]${e}[\\s\\.\\-_]|^${e}\\s)`, 'i').test(p.text);
          })
        : paths.filter(p => /\.(mkv|mp4|avi)$/i.test(p.href));

    return filtered.map(path => {
        // SMART PATH JOINER: Prevents the /movies/movies/ error
        let finalUrl;
        if (path.href.startsWith('/')) {
            // If path is "/movies/file.mkv", join with domain only
            finalUrl = DAHMER_MOVIES_API + path.href;
        } else if (path.href.startsWith('http')) {
            finalUrl = path.href;
        } else {
            // If path is just "file.mkv", join with the full folder URL
            finalUrl = finalBaseUrl + path.href;
        }
        
        // Final cleanup for player (fixes ( ) and spaces)
        const playerUrl = decodeURIComponent(finalUrl)
            .replace(/ /g, '%20')
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29');

        const t = path.text.toLowerCase();
        let q = 'HD';
        if (t.includes('2160') || t.includes('4k')) q = '2160p';
        else if (t.includes('1080')) q = '1080p';
        else if (t.includes('720')) q = '720p';

        return {
            name: "DahmerMovies",
            title: `DahmerMovies ${path.text}`,
            url: playerUrl,
            quality: q,
            provider: "dahmermovies",
            filename: path.text
        };
    });
}

async function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    try {
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
        const res = await makeRequest(tmdbUrl);
        const data = await res.json();
        const title = mediaType === 'tv' ? data.name : data.title;
        const year = (mediaType === 'tv' ? data.first_air_date : data.release_date)?.substring(0, 4);
        return await invokeDahmerMovies(title, year ? parseInt(year) : null, seasonNum, episodeNum);
    } catch (e) { return []; }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams }; } 
else { global.getStreams = getStreams; }
