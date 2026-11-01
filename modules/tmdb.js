// modules/tmdb.js — TMDB API wrapper for Dashboard V2
export const TMDB_KEY = "1b4a3488bf0324cff60023d82be16c00";
const BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/";

export function IMG(path, size = "w342") {
  return path ? IMG_BASE + size + path : "";
}

function isJwt(key) {
  return typeof key === "string" && key.indexOf("ey") === 0;
}

export async function tmdb(path, params = {}) {
  const key = String(TMDB_KEY || "").trim();
  let url = BASE + path;
  const parts = [];
  if (!isJwt(key)) parts.push("api_key=" + encodeURIComponent(key));
  Object.keys(params || {}).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null) {
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
    }
  });
  if (parts.length) url += (url.indexOf("?") > -1 ? "&" : "?") + parts.join("&");
  const opts = isJwt(key) ? { headers: { Authorization: "Bearer " + key } } : {};
  let res;
  try {
    res = await fetch(url, opts);
  } catch (e) {
    throw new Error("Network error reaching TMDB");
  }
  if (!res || !res.ok) {
    const status = res ? res.status : 0;
    throw new Error(status === 401 ? "TMDB rejected the key" : "TMDB error (" + status + ")");
  }
  try {
    return await res.json();
  } catch (e) {
    throw new Error("TMDB returned invalid JSON");
  }
}

export async function searchMulti(query) {
  return tmdb("/search/multi", { query, include_adult: "false" });
}

export async function trendingMovies(timeWindow = "week") {
  return tmdb("/trending/movie/" + timeWindow);
}

export async function getDetail(id, mediaType = "movie") {
  return tmdb("/" + mediaType + "/" + id, { append_to_response: "credits,videos" });
}

export default { TMDB_KEY, IMG, tmdb, searchMulti, trendingMovies, getDetail };