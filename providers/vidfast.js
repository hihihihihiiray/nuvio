// VidFast Scraper for Nuvio Local Scrapers
// React Native compatible version

console.log('[VidFast] Initializing VidFast scraper');

// Constants
const TMDB_API_KEY = "1c29a5198ee1854bd5eb45dbe8d17d92";
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const VIDFAST_BASE = 'https://vidfast.pro';
const ENCRYPT_API = 'https://enc-dec.app/api/enc-vidfast';

// Get TMDB details
function getTMDBDetails(tmdbId, mediaType) {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    
    return fetch(url).then(function(response) {
        return response.json();
    }).then(function(data) {
        const isTv = mediaType === 'tv';
        return {
            title: isTv ? data.name : data.title,
            year: (isTv ? data.first_air_date : data.release_date)?.substring(0, 4) || '',
            mediaType: isTv ? 'tv' : 'movie'
        };
    });
}

// Main scraping function - matches working version exactly
async function scrapeVidFast(tmdbId, mediaInfo, seasonNum, episodeNum) {
    // Build page URL
    const pageUrl = mediaInfo.mediaType === 'tv'
        ? `${VIDFAST_BASE}/tv/${tmdbId}/${seasonNum}/${episodeNum}`
        : `${VIDFAST_BASE}/movie/${tmdbId}`;

    // Headers with dynamic referer (CRITICAL - must be page URL)
    const headers = {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
        'Referer': pageUrl,
        'X-Requested-With': 'XMLHttpRequest'
    };

    // Step 1: Fetch page
    const pageResponse = await fetch(pageUrl, { headers });
    const pageText = await pageResponse.text();

    // Step 2: Extract encrypted text with fallback patterns
    let match = pageText.match(/\\"en\\":\\"([^"]+)\\"/) ||
        pageText.match(/"en":"([^"]+)"/) ||
        pageText.match(/'en':'([^']+)'/) ||
        pageText.match(/["']en["']:\s*["']([^"']+)["']/);

    if (!match) {
        console.log('[VidFast] Could not extract data from page');
        return [];
    }
    const rawData = match[1];

    // Step 3: Get servers and stream URLs
    const apiResponse = await fetch(`${ENCRYPT_API}?text=${encodeURIComponent(rawData)}`);
    const apiData = await apiResponse.json();

    if (apiData.status !== 200 || !apiData.result) {
        console.log('[VidFast] enc-vidfast API failed');
        return [];
    }

    const apiServers = apiData.result.servers;
    const streamBase = apiData.result.stream;

    // Step 4: Fetch servers list
    const serversResponse = await fetch(apiServers, { headers });
    const serverList = await serversResponse.json();

    if (!serverList || !Array.isArray(serverList) || serverList.length === 0) {
        console.log('[VidFast] No servers available');
        return [];
    }

    console.log(`[VidFast] Found ${serverList.length} server(s)`);

    // Step 5: Fetch streams from each server
    const streams = [];

    for (let i = 0; i < serverList.length; i++) {
        const serverObj = serverList[i];
        const server = serverObj.data;
        const serverName = serverObj.name || `Server ${i + 1}`;
        const apiStream = `${streamBase}/${server}`;

        try {
            const streamResponse = await fetch(apiStream, { headers });

            if (!streamResponse.ok) {
                continue;
            }

            const streamText = await streamResponse.text();
            let data;

            try {
                data = JSON.parse(streamText);
            } catch (e) {
                continue;
            }

            if (!data.url) {
                continue;
            }

            // Determine quality from URL
            let quality = 'Unknown';
            if (data.url.includes('.m3u8')) quality = 'Adaptive';
            else {
                const qualityMatch = data.url.match(/(\d{3,4})[pP]/);
                if (qualityMatch) quality = `${qualityMatch[1]}p`;
            }

            streams.push({
                name: `VidFast ${serverName} - ${quality}`,
                title: `${mediaInfo.title} (${mediaInfo.year})`,
                url: data.url,
                quality: quality,
                headers: {
                    'User-Agent': headers['User-Agent'],
                    'Origin': 'https://vidfast.pro',
                    'Referer': pageUrl
                },
                provider: 'vidfast'
            });
        } catch (error) {
            // Server failed, continue to next
            continue;
        }
    }

    // Deduplicate by URL
    const uniqueStreams = [];
    const seenUrls = new Set();

    streams.forEach(function(stream) {
        if (!seenUrls.has(stream.url)) {
            seenUrls.add(stream.url);
            uniqueStreams.push(stream);
        }
    });

    // Sort by quality
    uniqueStreams.sort(function(a, b) {
        const qualityOrder = {
            'Adaptive': 4000,
            '2160p': 2160,
            '1440p': 1440,
            '1080p': 1080,
            '720p': 720,
            '480p': 480,
            '360p': 360,
            'Unknown': 0
        };
        return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
    });

    console.log(`[VidFast] Returning ${uniqueStreams.length} stream(s)`);
    return uniqueStreams;
}

// Main function
function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    console.log(`[VidFast] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}${seasonNum ? `, S${seasonNum}E${episodeNum}` : ''}`);

    return getTMDBDetails(tmdbId, mediaType).then(function(mediaInfo) {
        if (!mediaInfo) {
            console.log('[VidFast] Failed to get TMDB details');
            return [];
        }

        console.log(`[VidFast] Title: "${mediaInfo.title}" (${mediaInfo.year})`);

        return scrapeVidFast(tmdbId, mediaInfo, seasonNum, episodeNum);
    }).catch(function(error) {
        console.error(`[VidFast] Error: ${error.message}`);
        return [];
    });
}

// Export the main function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
