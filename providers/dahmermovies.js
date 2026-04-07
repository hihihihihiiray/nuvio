// Dahmer Movies Scraper (Optimized संस्करण)

console.log('[DahmerMovies] Initializing optimized scraper');

// Constants
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const DAHMER_MOVIES_API = 'https://a.111477.xyz';
const TIMEOUT = 15000; // slightly reduced

const MAX_LINKS = 6;
const CONCURRENCY = 3;

// Cache
const tmdbCache = new Map();

// ---------------------- REQUEST ----------------------
function makeRequest(url, options = {}) {
    return fetch(url, {
        timeout: TIMEOUT,
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': '*/*',
            ...options.headers
        },
        ...options
    }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
    });
}

// ---------------------- UTIL ----------------------
function getEpisodeSlug(season, episode) {
    if (!season && !episode) return ['', ''];
    return [
        season < 10 ? `0${season}` : `${season}`,
        episode < 10 ? `0${episode}` : `${episode}`
    ];
}

function getQuality(str) {
    const m = str?.match(/(\d{3,4})p/i);
    return m ? parseInt(m[1]) : 0;
}

function getQualityLabel(str) {
    const base = str.match(/(\d{3,4})p/i)?.[0] || 'Unknown';
    const lower = str.toLowerCase();

    const tags = [];
    if (lower.includes('dv')) tags.push('DV');
    if (lower.includes('hdr')) tags.push('HDR');
    if (lower.includes('remux')) tags.push('REMUX');

    return tags.length ? `${base} | ${tags.join(' | ')}` : base;
}

function formatSize(size) {
    if (!size) return null;
    if (/\d+\s*(GB|MB)/i.test(size)) return size;

    const bytes = parseInt(size);
    if (isNaN(bytes)) return size;

    const units = ['B','KB','MB','GB','TB'];
    const i = Math.floor(Math.log(bytes)/Math.log(1024));
    return (bytes/Math.pow(1024,i)).toFixed(2) + ' ' + units[i];
}

// ---------------------- PARSER ----------------------
function parseLinks(html) {
    const links = [];
    const regex = /<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let m;

    while ((m = regex.exec(html))) {
        const href = m[1];
        const text = m[2].trim();
        if (!text || text === '../') continue;

        links.push({ href, text, size: null });
    }

    return links;
}

// ---------------------- RESOLVER ----------------------
async function resolveFinalUrl(url, retries = 0) {
    if (!url.includes('111477.xyz')) return url; // skip resolving if already direct

    try {
        const res = await fetch(url, {
            method: 'HEAD',
            redirect: 'manual'
        });

        if (res.status === 429 && retries < 2) {
            await new Promise(r => setTimeout(r, 1000 * (retries + 1)));
            return resolveFinalUrl(url, retries + 1);
        }

        if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get('location');
            if (loc) return resolveFinalUrl(loc, retries);
        }

        return url.includes('111477.xyz') ? null : url;

    } catch {
        return null;
    }
}

// ---------------------- SINGLE PROCESS ----------------------
async function processSinglePath(path, baseUrl) {
    try {
        const fullUrl = path.href.startsWith('http')
            ? path.href
            : baseUrl + path.href;

        const finalUrl = await resolveFinalUrl(fullUrl);
        if (!finalUrl) return null;

        return {
            name: "DahmerMovies",
            title: path.text,
            url: finalUrl,
            quality: getQualityLabel(path.text),
            size: formatSize(path.size),
            type: "direct",
            provider: "dahmermovies",
            filename: path.text
        };

    } catch {
        return null;
    }
}

// ---------------------- CONCURRENCY CORE ----------------------
async function processWithConcurrency(paths, baseUrl) {
    const results = [];
    let index = 0;
    let stop = false;

    async function worker() {
        while (index < paths.length && !stop) {
            const i = index++;
            const res = await processSinglePath(paths[i], baseUrl);

            if (res) {
                results.push(res);

                // 🔥 Early exit if strong results found
                if (
                    results.some(r => r.quality.includes('2160p')) &&
                    results.length >= 2
                ) {
                    stop = true;
                    break;
                }
            }
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    return results;
}

// ---------------------- MAIN SCRAPER ----------------------
async function invokeDahmerMovies(title, year, season = null, episode = null) {

    const url = season === null
        ? `${DAHMER_MOVIES_API}/movies/${encodeURIComponent(title + ' (' + year + ')')}/`
        : `${DAHMER_MOVIES_API}/tvs/${encodeURIComponent(title)}/Season ${season}/`;

    const html = await makeRequest(url).then(r => r.text());
    let paths = parseLinks(html);

    // Filter
    if (season === null) {
        paths = paths.filter(p => /(1080p|2160p)/i.test(p.text));
    } else {
        const [s, e] = getEpisodeSlug(season, episode);
        const re = new RegExp(`S${s}E${e}`, 'i');
        paths = paths.filter(p => re.test(p.text));
    }

    paths = paths.slice(0, MAX_LINKS);

    const results = await processWithConcurrency(paths, url);

    // Sort by quality
    return results.sort((a, b) =>
        getQuality(b.filename) - getQuality(a.filename)
    );
}

// ---------------------- ENTRY ----------------------
async function getStreams(tmdbId, mediaType = 'movie', season, episode) {

    if (tmdbCache.has(tmdbId)) {
        return tmdbCache.get(tmdbId);
    }

    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;

    const data = await makeRequest(tmdbUrl).then(r => r.json());

    const title = mediaType === 'tv' ? data.name : data.title;
    const year = (mediaType === 'tv'
        ? data.first_air_date
        : data.release_date)?.slice(0, 4);

    const results = await invokeDahmerMovies(
        title,
        parseInt(year),
        season,
        episode
    );

    tmdbCache.set(tmdbId, results);
    return results;
}

// Export
if (typeof module !== 'undefined') {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
