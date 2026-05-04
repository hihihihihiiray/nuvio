// 4KHDHub Scraper for Nuvio Local Scrapers
// React Native compatible version

"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/4khdhub/constants.js
var BASE_URL = "https://4khdhub.click";
var TMDB_API_KEY = "1c29a5198ee1854bd5eb45dbe8d17d92";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";
var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";

// src/4khdhub/utils.js
var domainCache = { url: BASE_URL, ts: 0 };
function fetchLatestDomain() {
  return __async(this, null, function* () {
    const now = Date.now();
    if (now - domainCache.ts < 36e5) return domainCache.url;
    try {
      const response = yield fetch(DOMAINS_URL);
      const data = yield response.json();
      if (data && data["4khdhub"]) {
        domainCache.url = data["4khdhub"];
        domainCache.ts = now;
      }
    } catch (e) {}
    return domainCache.url;
  });
}

// src/4khdhub/http.js
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    try {
      console.log("[4KHDHub] Fetching: " + url);
      const response = yield fetch(url, {
        headers: __spreadValues({
          "User-Agent": USER_AGENT
        }, options.headers)
      });
      console.log("[4KHDHub] Response status: " + response.status + " for " + url);
      if (!response.ok) {
        console.log("[4KHDHub] Response not OK, returning null");
        return null;
      }
      const text = yield response.text();
      console.log("[4KHDHub] Response text length: " + (text ? text.length : 0));
      return text;
    } catch (err) {
      console.log("[4KHDHub] Request failed for " + url + ": " + err.message);
      return null;
    }
  });
}

// src/4khdhub/tmdb.js
function getTmdbDetails(tmdbId, type) {
  return __async(this, null, function* () {
    const isSeries = type === "series" || type === "tv";
    const endpoint = isSeries ? "tv" : "movie";
    const url = "https://api.themoviedb.org/3/" + endpoint + "/" + tmdbId + "?api_key=" + TMDB_API_KEY;
    console.log("[4KHDHub] Fetching TMDB details from: " + url);
    try {
      const response = yield fetch(url);
      const data = yield response.json();
      if (isSeries) {
        return {
          title: data.name,
          year: data.first_air_date ? parseInt(data.first_air_date.split("-")[0]) : 0
        };
      } else {
        return {
          title: data.title,
          year: data.release_date ? parseInt(data.release_date.split("-")[0]) : 0
        };
      }
    } catch (error) {
      console.log("[4KHDHub] TMDB request failed: " + error.message);
      return null;
    }
  });
}

// src/4khdhub/utils.js
function atob(input) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = String(input).replace(/=+$/, "");
  if (str.length % 4 === 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  let output = "";
  for (let bc = 0, bs, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}
function rot13Cipher(str) {
  return str.replace(/[a-zA-Z]/g, function(c) {
    return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
  });
}
function levenshteinDistance(s, t) {
  if (s === t)
    return 0;
  const n = s.length;
  const m = t.length;
  if (n === 0)
    return m;
  if (m === 0)
    return n;
  const d = [];
  for (let i = 0; i <= n; i++) {
    d[i] = [];
    d[i][0] = i;
  }
  for (let j = 0; j <= m; j++) {
    d[0][j] = j;
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = s.charAt(i - 1) === t.charAt(j - 1) ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[n][m];
}
function parseBytes(val) {
  if (typeof val === "number")
    return val;
  if (!val)
    return 0;
  const match = val.match(/^([0-9.]+)\s*([a-zA-Z]+)$/);
  if (!match)
    return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  let multiplier = 1;
  if (unit.indexOf("k") === 0)
    multiplier = 1024;
  else if (unit.indexOf("m") === 0)
    multiplier = 1024 * 1024;
  else if (unit.indexOf("g") === 0)
    multiplier = 1024 * 1024 * 1024;
  else if (unit.indexOf("t") === 0)
    multiplier = 1024 * 1024 * 1024 * 1024;
  return num * multiplier;
}
function formatBytes(val) {
  if (val === 0)
    return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  let i = Math.floor(Math.log(val) / Math.log(k));
  if (i < 0)
    i = 0;
  return parseFloat((val / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// src/4khdhub/search.js
var cheerio = require("cheerio-without-node-native");
function fetchPageUrl(name, year, isSeries) {
  return __async(this, null, function* () {
    const domain = yield fetchLatestDomain();
    const searchQuery = name + (year ? " " + year : "");
    const searchUrl = domain + "/?s=" + encodeURIComponent(searchQuery);
    console.log("[4KHDHub] Search Request URL: " + searchUrl);
    const html = yield fetchText(searchUrl);
    if (!html) {
      console.log("[4KHDHub] Search failed: No HTML response");
      return null;
    }
    const $ = cheerio.load(html);
    const targetType = isSeries ? "Series" : "Movies";
    console.log("[4KHDHub] Parsing search results for type: " + targetType);
    const candidates = $("a.movie-card").map((_, el) => {
      const cardText = $(el).text();
      const cardTitle = $(el).find("h3").text().trim() || ($(el).attr("aria-label") || "").replace(/\s+details$/i, "").trim();
      const yearText = $(el).find("p").text().trim();
      const movieCardYear = parseInt((yearText.match(/(\d{4})/) || [0])[0], 10) || 0;
      const isSeriesCard = /\bSeries\b/i.test(cardText);
      if (isSeries && !isSeriesCard) return null;
      if (!isSeries && isSeriesCard) return null;
      const yearDistance = movieCardYear === 0 || !year ? 0 : Math.abs(movieCardYear - year);
      if (movieCardYear !== 0 && year && yearDistance > 1) {
        console.log("[4KHDHub] Skip: Year mismatch (" + movieCardYear + " vs " + year + ") - " + cardTitle);
        return null;
      }
      const cleanedTitle = cardTitle.replace(/\[.*?]/g, "").trim();
      const distance = levenshteinDistance(cleanedTitle.toLowerCase(), name.toLowerCase());
      const titleMatch = cleanedTitle.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(cleanedTitle.toLowerCase()) || distance < 6;
      console.log("[4KHDHub] Checking: \"" + cleanedTitle + "\" (Dist: " + distance + ") vs \"" + name + "\"");
      if (!titleMatch) return null;
      let href = $(el).attr("href");
      if (href && !href.startsWith("http")) {
        href = domain + (href.startsWith("/") ? "" : "/") + href;
      }
      return { href, distance, yearDistance, title: cleanedTitle };
    }).get().filter((candidate) => candidate && candidate.href);
    if (candidates.length === 0) {
      console.log("[4KHDHub] No matching cards found after filtering");
      return null;
    }
    const matchingCards = candidates.sort((a, b) => a.distance - b.distance || a.yearDistance - b.yearDistance);
    console.log("[4KHDHub] Found " + matchingCards.length + " matching cards, best match: " + matchingCards[0].title);
    return matchingCards[0].href;
  });
}

// src/4khdhub/extractor.js
var cheerio2 = require("cheerio-without-node-native");
function resolveRedirectUrl(redirectUrl) {
  return __async(this, null, function* () {
    if (!redirectUrl) {
      console.log("[4KHDHub] No redirect URL provided");
      return null;
    }
    
    const redirectHtml = yield fetchText(redirectUrl);
    if (!redirectHtml) {
      console.log("[4KHDHub] Failed to fetch redirect HTML");
      return redirectUrl; // Return the original URL as fallback
    }
    
    try {
      // Try multiple patterns for extracting the encoded data
      const patterns = [
        /'o','(.*?)'/,
        /['"]o['"],\s*['"]([^'"]+)['"]/,
        /'o'\s*:\s*'([^']+)'/,
        /window\.atob\(['"]([^'"]+)['"]\)/,
        /var\s+o\s*=\s*['"]([^'"]+)['"]/
      ];
      
      let redirectDataMatch = null;
      for (const pattern of patterns) {
        redirectDataMatch = redirectHtml.match(pattern);
        if (redirectDataMatch) {
          console.log("[4KHDHub] Matched pattern: " + pattern);
          break;
        }
      }
      
      if (!redirectDataMatch || !redirectDataMatch[1]) {
        console.log("[4KHDHub] No redirect data pattern matched, trying direct URL extraction");
        const directPatterns = [
          /window\.location\.href\s*=\s*['"]([^'"]+)['";]/,
          /window\.location\.replace\(['"]([^'"]+)['"]\)/,
          /window\.location\s*=\s*['"]([^'"]+)['"];/,
          /location\.href\s*=\s*['"]([^'"]+)['"];/
        ];
        for (const pattern of directPatterns) {
          const scriptMatch = redirectHtml.match(pattern);
          if (scriptMatch && scriptMatch[1]) {
            return scriptMatch[1];
          }
        }
        return redirectUrl;
      }
      
      const step1 = atob(redirectDataMatch[1]);
      const step2 = atob(step1);
      const step3 = rot13Cipher(step2);
      const step4 = atob(step3);
      const redirectData = JSON.parse(step4);
      
      if (redirectData && redirectData.o) {
        const finalUrl = atob(redirectData.o);
        console.log("[4KHDHub] Successfully resolved redirect URL");
        return finalUrl;
      }
      
      console.log("[4KHDHub] No 'o' property in redirect data");
      return redirectUrl;
    } catch (e) {
      console.log("[4KHDHub] Error resolving redirect: " + e.message);
      return redirectUrl;
    }
  });
}
function extractSourceResults($, el) {
  return __async(this, null, function* () {
    const localHtml = $(el).html();
    if (!localHtml) {
      console.log("[4KHDHub] Warning: No HTML found for element");
      return null;
    }
    
    const sizeMatch = localHtml.match(/([\d.]+ ?[GM]B)/);
    const heightMatch = localHtml.match(/\d{3,}p/);
    const title = $(el).find(".file-title, .episode-file-title, .file-name, span").text().trim();
    
    let height = heightMatch ? parseInt(heightMatch[0]) : 0;
    if (height === 0 && (title.includes("4K") || title.includes("4k") || localHtml.includes("4K") || localHtml.includes("4k"))) {
      height = 2160;
    }
    
    const meta = {
      bytes: sizeMatch ? parseBytes(sizeMatch[1]) : 0,
      height,
      title: title || "Download"
    };
    
    console.log("[4KHDHub] Extracting from element with meta: " + JSON.stringify(meta));
    
    // Try to find HubCloud link
    let hubCloudLink = $(el).find("a").filter((_, a) => {
      const text = $(a).text();
      return text.includes("HubCloud") || text.includes("hubcloud");
    }).attr("href");
    
    if (hubCloudLink) {
      console.log("[4KHDHub] Found HubCloud link: " + hubCloudLink);
      const resolved = yield resolveRedirectUrl(hubCloudLink);
      if (resolved) {
        return { url: resolved, meta };
      }
    }
    
    // Try to find HubDrive link
    let hubDriveLink = $(el).find("a").filter((_, a) => {
      const text = $(a).text();
      return text.includes("HubDrive") || text.includes("hubdrive");
    }).attr("href");
    
    if (hubDriveLink) {
      console.log("[4KHDHub] Found HubDrive link: " + hubDriveLink);
      // Return the HubDrive URL directly - extractHubCloud will handle it
      return { url: hubDriveLink, meta };
    }
    
    // Fallback: try any link with common hosting services
    const fallbackLink = $(el).find("a[href]").filter((_, a) => {
      const href = $(a).attr("href");
      return href && (href.includes("hubcloud") || href.includes("hubdrive") || href.includes("pixeldrain"));
    }).attr("href");
    
    if (fallbackLink) {
      console.log("[4KHDHub] Using fallback link: " + fallbackLink);
      return { url: fallbackLink, meta };
    }
    
    console.log("[4KHDHub] No viable links found in element");
    return null;
  });
}
function extractHubCloud(url, baseMeta) {
  return __async(this, null, function* () {
    if (!url) {
      console.log("[4KHDHub] No URL provided");
      return [];
    }
    
    console.log("[4KHDHub] EXTRACTING FROM: " + url);
    
    // Special handling for HubDrive URLs
    if (url.includes("hubdrive.space")) {
      console.log("[4KHDHub] Handling HubDrive URL");
      const hubDriveHtml = yield fetchText(url, { headers: { Referer: url } });
      console.log("[4KHDHub] HubDrive HTML length:", hubDriveHtml ? hubDriveHtml.length : "null");
      if (hubDriveHtml) {
        console.log("[4KHDHub] HubDrive HTML preview:", hubDriveHtml.substring(0, 500));
        const $ = cheerio2.load(hubDriveHtml);
        // Look for the redirect button/link
        const redirectLink = $(".btn.btn-primary.btn-user.btn-success1.m-1, .btn-success, a[href*='hubcloud'], a[href*='download']").attr("href");
        console.log("[4KHDHub] Found redirect link selector result:", redirectLink ? redirectLink : "null");
        if (redirectLink) {
          console.log("[4KHDHub] Found redirect link: " + redirectLink);
          // If it's a relative URL, make it absolute
          const fullRedirectUrl = redirectLink.startsWith("http") ? redirectLink : "https://hubdrive.space" + redirectLink;
          // Recursively extract from the redirect URL
          return yield extractHubCloud(fullRedirectUrl, baseMeta);
        } else {
          console.log("[4KHDHub] No redirect link found, logging all links on page:");
          $("a").each((_, el) => {
            const href = $(el).attr("href");
            const text = $(el).text().trim();
            const classes = $(el).attr("class") || "";
            console.log("[4KHDHub] Link: '" + text + "' -> '" + href + "' (class: '" + classes + "')");
          });
          console.log("[4KHDHub] Trying alternative selectors");
          // Try some alternative selectors
          const altSelectors = [
            "a[href*='hubcloud']",
            "a[href*='download']", 
            ".btn",
            "a"
          ];
          for (const selector of altSelectors) {
            const link = $(selector).first().attr("href");
            if (link && (link.includes("hubcloud") || link.includes("download"))) {
              console.log("[4KHDHub] Found alternative link with selector '" + selector + "': " + link);
              return yield extractHubCloud(link.startsWith("http") ? link : "https://hubdrive.space" + link, baseMeta);
            }
          }
        }
      }
      return [];
    }
    
    const html = yield fetchText(url, { headers: { Referer: url } });
    if (!html) {
      console.log("[4KHDHub] Failed to fetch page");
      return [];
    }
    
    const $ = cheerio2.load(html);
    const results = [];
    
    const sizeText = $("#size, #file-size, span[id*='size']").text();
    const titleText = $("title").text().trim();
    
    const currentMeta = __spreadProps(__spreadValues({}, baseMeta), {
      bytes: parseBytes(sizeText) || baseMeta.bytes,
      title: titleText || baseMeta.title
    });
    
    console.log("[4KHDHub] Meta: " + JSON.stringify(currentMeta));
    
    // Find all download links - be more aggressive
    console.log("[4KHDHub] Looking for download links...");
    $("a").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      
      if (!href) return;
      
      console.log("[4KHDHub] Checking link: " + text + " -> " + href);
      
      // Any link that looks like a download link
      if (text.toLowerCase().includes("download") || 
          text.toLowerCase().includes("link") || 
          text.toLowerCase().includes("get") ||
          text.includes("FSL") || 
          text.includes("PixelServer") ||
          href.includes("pixeldrain") ||
          href.includes("drive.google.com") ||
          href.includes("mega.nz") ||
          href.includes("mediafire") ||
          href.includes("cdn") ||
          href.includes("stream")) {
        console.log("[4KHDHub] Found potential download link: " + text);
        results.push({
          source: text.includes("FSL") ? "FSL" : text.includes("PixelServer") ? "PixelServer" : "Direct",
          url: href,
          meta: currentMeta
        });
      }
    });
    
    // If still no links, try any external link
    if (results.length === 0) {
      console.log("[4KHDHub] No specific links found, trying all external links");
      $("a[href^='http']").each((_, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim();
        if (href && !href.includes("hubdrive.space") && !href.includes("hubcloud.foo")) {
          console.log("[4KHDHub] Found external link: " + text + " -> " + href);
          results.push({
            source: "Direct",
            url: href,
            meta: currentMeta
          });
        }
      });
    }
    
    console.log("[4KHDHub] Extracted " + results.length + " links");
    return results;
  });
}

// src/4khdhub/index.js
var cheerio3 = require("cheerio-without-node-native");
function getStreams(tmdbId, type, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log("[4KHDHub] Starting extraction for TMDB ID: " + tmdbId + ", Type: " + type + ", Season: " + season + ", Episode: " + episode);
      
      const tmdbDetails = yield getTmdbDetails(tmdbId, type);
      if (!tmdbDetails) {
        console.log("[4KHDHub] Failed to get TMDB details");
        return [];
      }
      
      const { title, year } = tmdbDetails;
      console.log("[4KHDHub] Search: " + title + " (" + year + ")");
      
      const isSeries = type === "series" || type === "tv";
      const pageUrl = yield fetchPageUrl(title, year, isSeries);
      if (!pageUrl) {
        console.log("[4KHDHub] Page not found");
        return [];
      }
      
      console.log("[4KHDHub] Found page: " + pageUrl);
      
      const html = yield fetchText(pageUrl);
      if (!html) {
        console.log("[4KHDHub] Failed to fetch page HTML");
        return [];
      }
      
      const $ = cheerio3.load(html);
      const itemsToProcess = [];
      
      if (isSeries && season && episode) {
        const seasonStr = "S" + String(season).padStart(2, "0");
        const episodePadded = String(episode).padStart(2, "0");
        const episodeCode = "S" + seasonStr.slice(1) + "E" + episodePadded;
        const seasonPattern = new RegExp("\\b(?:S0?" + season + "|Season[-_ ]?" + season + ")\\b", "i");
        const episodePattern = new RegExp("\\b(?:" + episodeCode + "|Episode[-_ ]?" + episodePadded + "|E" + episodePadded + ")\\b", "i");
        
        console.log("[4KHDHub] Looking for season " + seasonStr + ", episode " + episodePadded);
        
        $(".season-item.episode-item, .episode-item, .season-item").each((_, el) => {
          const headerText = $(el).find(".episode-title, .episode-info, .episode-header, .episode-number").text();
          if (!seasonPattern.test(headerText)) {
            return;
          }
          const downloadItems = $(el).find(".episode-download-item, .download-item, .file-item, [class*='download'], [class*='file']").filter((_2, item) => {
            const titleText = $(item).find(".episode-file-title, .file-title, .episode-title").text() || $(item).text();
            return episodePattern.test(titleText);
          });
          downloadItems.each((_2, item) => {
            itemsToProcess.push(item);
          });
        });

        if (itemsToProcess.length === 0) {
          const fallbackItems = $(".episode-download-item, .download-item, .file-item, [class*='download'], [class*='file']").filter((_2, item) => {
            const titleText = $(item).find(".episode-file-title, .file-title, .episode-title").text() || $(item).text();
            return episodePattern.test(titleText);
          });
          fallbackItems.each((_2, item) => {
            itemsToProcess.push(item);
          });
        }
      } else {
        console.log("[4KHDHub] Looking for movie download items");
        
        // Try multiple selectors for download items
        $(".download-item, .episode-download-item, .file-item, .movie-file, [class*='download'], [class*='file']").each((_, el) => {
          const hasLink = $(el).find("a[href]").length > 0;
          if (hasLink) {
            itemsToProcess.push(el);
          }
        });
      }
      
      console.log("[4KHDHub] Processing " + itemsToProcess.length + " items");
      
      if (itemsToProcess.length === 0) {
        console.log("[4KHDHub] No download items found on page");
        return [];
      }
      
      const streamPromises = itemsToProcess.map((item) => __async(this, null, function* () {
        try {
          const sourceResult = yield extractSourceResults($, item);
          if (sourceResult && sourceResult.url) {
            console.log("[4KHDHub] Extracting from: " + sourceResult.url);
            const extractedLinks = yield extractHubCloud(sourceResult.url, sourceResult.meta);
            return extractedLinks.map((link) => {
              const quality = sourceResult.meta.height ? sourceResult.meta.height + "p" : "Unknown";
              const size = formatBytes(link.meta.bytes || 0);
              
              // Stream name: 4KHDHub - {source} {quality}
              const streamName = "4KHDHub - " + link.source + (quality !== "Unknown" ? " " + quality : "");
              
              // Stream title: Just quality on first line, size on second
              const streamTitle = quality + (size ? "\n" + size : "");
              
              return {
                name: streamName,
                title: streamTitle,
                url: link.url,
                quality: quality,
                size: size || undefined, // Standalone size property
                behaviorHints: {
                  bingeGroup: "4khdhub-" + link.source
                }
              };
            });
          }
          return [];
        } catch (err) {
          console.log("[4KHDHub] Item processing error: " + err.message);
          return [];
        }
      }));
      
      const results = yield Promise.all(streamPromises);
      const flattened = results.reduce((acc, val) => acc.concat(val), []);
      console.log("[4KHDHub] Found " + flattened.length + " total streams");
      return flattened;
    } catch (err) {
      console.log("[4KHDHub] Fatal error: " + err.message);
      return [];
    }
  });
}
module.exports = { getStreams };
