/**
 * hashhackers - Built from src/hashhackers/
 * Generated: 2026-05-03T01:20:12.696Z
 */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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

// src/hashhackers/index.js
var hashhackers_exports = {};
__export(hashhackers_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(hashhackers_exports);
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    if (mediaType !== "movie")
      return [];
    try {
      const tmdbRes = yield fetch(`https://tmdb.vidsrc.wtf/tmdb/3/movie/${tmdbId}`);
      if (!tmdbRes.ok)
        return [];
      const tmdbData = yield tmdbRes.json();
      const title = tmdbData.title;
      const year = tmdbData.release_date ? tmdbData.release_date.split("-")[0] : "";
      const query = encodeURIComponent(`${title} ${year}`.trim());
      const tokenRes = yield fetch(`https://your-va-player-app.vercel.app/api/token`);
      const tokenData = yield tokenRes.json();
      const token = tokenData.token;
      if (!token)
        return [];
      const searchRes = yield fetch(`https://tga-hd.api.hashhackers.com/mix_media_files/search?q=${query}&page=1`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Origin": "https://bollywood.eu.org",
          "Referer": "https://bollywood.eu.org/"
        }
      });
      const searchData = yield searchRes.json();
      const files = searchData.files || [];
      if (files.length === 0)
        return [];
      const topFiles = files.slice(0, 5);
      const streams = [];
      yield Promise.all(topFiles.map((file) => __async(this, null, function* () {
        try {
          const linkRes = yield fetch(`https://tga-hd.api.hashhackers.com/genLink?type=mix_media&id=${file.id}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Origin": "https://bollywood.eu.org",
              "Referer": "https://bollywood.eu.org/"
            }
          });
          const linkData = yield linkRes.json();
          if (linkData.success && linkData.url) {
            let quality = "Auto";
            const fileNameLower = file.file_name.toLowerCase();
            if (fileNameLower.includes("2160p") || fileNameLower.includes("4k"))
              quality = "4K";
            else if (fileNameLower.includes("1080p"))
              quality = "1080p";
            else if (fileNameLower.includes("720p"))
              quality = "720p";
            streams.push({
              name: "Hashhackers",
              title: file.file_name.substring(0, 35) + "...",
              // Clean UI
              url: linkData.url,
              quality
            });
          }
        } catch (e) {
          console.error("Link Gen Error for ID", file.id, e);
        }
      })));
      return streams;
    } catch (error) {
      console.error("Hashhackers Error:", error);
      return [];
    }
  });
}
