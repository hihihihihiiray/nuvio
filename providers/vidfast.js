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

    // Headers matching browser but without Accept-Encoding (Node handles that)
    const headers = {
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Origin': 'https://vidfast.pro',
        'Referer': pageUrl,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15',
        'X-Requested-With': 'XMLHttpRequest'
    };

    // Step 1: Fetch page
    const pageResponse = await fetch(pageUrl, { headers });
    
    if (!pageResponse.ok) {
        console.log(`[VidFast] Page fetch failed: HTTP ${pageResponse.status}: ${pageResponse.statusText}`);
        console.log(`[VidFast] Response headers:`, Object.fromEntries(pageResponse.headers.entries()));
        const errorText = await pageResponse.text();
        console.log(`[VidFast] Error response (first 500 chars):`, errorText.substring(0, 500));
        return [];
    }
    
    const pageText = await pageResponse.text();
    
    console.log(`[VidFast] Page text length: ${pageText.length}`);
    console.log(`[VidFast] Page sample (first 1000 chars):`);
    console.log(pageText.substring(0, 1000));

    // Step 2: Extract data - Next.js apps store it in script tags
    let rawData = null;
    
    // Pattern 1: Look for __NEXT_DATA__ script tag
    const nextDataMatch = pageText.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (nextDataMatch) {
        try {
            const jsonData = JSON.parse(nextDataMatch[1]);
            console.log('[VidFast] Found __NEXT_DATA__, structure:', Object.keys(jsonData));
            // Try to find the encrypted text in the props
            const propsStr = JSON.stringify(jsonData);
            const dataMatch = propsStr.match(/"en":"([^"]+)"/);
            if (dataMatch) rawData = dataMatch[1];
        } catch (e) {
            console.log('[VidFast] Failed to parse __NEXT_DATA__:', e.message);
        }
    }
    
    // Pattern 2: Look for inline data variables
    if (!rawData) {
        const patterns = [
            /"en":"([^"]+)"/,
            /'en':'([^']+)'/,
            /\\"en\\":\\"([^"]+)\\"/,
            /data\s*=\s*"([^"]+)"/,
            /encryptedData\s*=\s*"([^"]+)"/
        ];
        
        for (const pattern of patterns) {
            const match = pageText.match(pattern);
            if (match) {
                rawData = match[1];
                console.log(`[VidFast] Found data with pattern: ${pattern}`);
                break;
            }
        }
    }

    if (!rawData) {
        console.log('[VidFast] Could not extract data from page');
        console.log('[VidFast] Checking for common patterns:');
        console.log('  - Has __NEXT_DATA__:', pageText.includes('__NEXT_DATA__'));
        console.log('  - Has "en":', pageText.includes('"en"'));
        console.log('  - Has script tags:', (pageText.match(/<script/g) || []).length);
        return [];
    }
    
    console.log(`[VidFast] Extracted data length: ${rawData.length}`);
    console.log(`[VidFast] Data sample: ${rawData.substring(0, 100)}...`);

    // Step 3: Get servers and stream URLs
    const apiUrl = `${ENCRYPT_API}?text=${encodeURIComponent(rawData)}&version=1`;
    console.log(`[VidFast] Calling enc-vidfast API...`);
    console.log(`[VidFast] API URL: ${apiUrl.substring(0, 100)}...`);
    
    const apiResponse = await fetch(apiUrl);
    console.log(`[VidFast] API response status: ${apiResponse.status}`);
    
    if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.log(`[VidFast] API error response: ${errorText}`);
        return [];
    }
    
    const apiData = await apiResponse.json();
    console.log(`[VidFast] API response:`, apiData);

    if (apiData.status !== 200 || !apiData.result) {
        console.log('[VidFast] enc-vidfast API failed');
        console.log('[VidFast] API status:', apiData.status);
        console.log('[VidFast] API message:', apiData.message || 'No message');
        return [];
    }

    const apiServers = apiData.result.servers;
    const streamBase = apiData.result.stream;
    const token = apiData.result.token;
    
    console.log(`[VidFast] Got servers URL, stream URL, and token`);
    console.log(`[VidFast] Token: ${token ? token.substring(0, 20) + '...' : 'none'}`);

    // Update headers with token if provided
    if (token) {
        headers['X-CSRF-Token'] = token;
    }

    // Step 4: Fetch servers list
    const serversResponse = await fetch(apiServers, { 
        method: 'POST',
        headers 
    });
    const serversEncrypted = await serversResponse.text();
    console.log(`[VidFast] Got encrypted servers response (${serversEncrypted.length} chars)`);
    
    // Decrypt the servers list
    const decryptResponse = await fetch('https://enc-dec.app/api/dec-vidfast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: serversEncrypted, version: '1' })
    });
    const decryptData = await decryptResponse.json();
    const serverList = decryptData.result;
    
    console.log(`[VidFast] Decrypted servers:`, serverList);

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
            const streamResponse = await fetch(apiStream, { 
                method: 'POST',
                headers 
            });

            if (!streamResponse.ok) {
                continue;
            }

            const streamEncrypted = await streamResponse.text();
            
            // Decrypt the stream data
            const streamDecryptResponse = await fetch('https://enc-dec.app/api/dec-vidfast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: streamEncrypted, version: '1' })
            });
            const streamDecryptData = await streamDecryptResponse.json();
            const data = streamDecryptData.result;

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
