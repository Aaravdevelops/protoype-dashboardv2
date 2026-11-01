// cinehd.js — best-effort CineHD availability helpers for the dashboard.
// Client-side only. No secrets. All network calls are wrapped in try/catch
// and degrade to `false` (never throw, never produce false positives).

export const CINEHD_BASE = "https://cinehd.vc";

const CANDIDATE_ENDPOINTS = (title) => [
  `${CINEHD_BASE}/api/movies?search=${enc(title)}`,
  `${CINEHD_BASE}/api/search?q=${enc(title)}`,
  `${CINEHD_BASE}/api/movie?search=${enc(title)}`,
  `${CINEHD_BASE}/search?q=${enc(title)}`
];

function enc(value) {
  try { return encodeURIComponent(String(value ?? "")); }
  catch (e) { return ""; }
}

function norm(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function itemTitle(item) {
  if (!item || typeof item !== "object") return "";
  return item.title || item.name || item.original_title || item.originalTitle ||
    item.movie_title || item.show_title || "";
}

function itemYear(item) {
  if (!item || typeof item !== "object") return "";
  const raw = item.release_date || item.first_air_date || item.releaseDate ||
    item.release_year || item.year || item.first_aired || "";
  const s = String(raw ?? "").trim();
  const m = s.match(/(\d{4})/);
  return m ? m[1] : "";
}

function escapeRegex(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectItems(data, out, depth) {
  if (depth > 5 || data == null) return;
  if (Array.isArray(data)) {
    for (const entry of data) collectItems(entry, out, depth + 1);
    return;
  }
  if (typeof data === "object") {
    if (itemTitle(data)) out.push(data);
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        collectItems(data[key], out, depth + 1);
      }
    }
  }
}

function titleMatches(candidate, title) {
  const a = norm(candidate);
  const b = norm(title);
  if (!a || !b) return false;
  if (a === b) return true;
  // Allow only near-exact matches to avoid false positives.
  if (a.includes(b) && b.length >= 4 && (a.length - b.length) <= 8) return true;
  if (b.includes(a) && a.length >= 4 && (b.length - a.length) <= 8) return true;
  return false;
}

function hasJsonMatch(data, title, year) {
  const items = [];
  collectItems(data, items, 0);
  const targetYear = String(year ?? "").trim().slice(0, 4);
  for (const item of items) {
    const candidate = itemTitle(item);
    if (!titleMatches(candidate, title)) continue;
    const iy = itemYear(item);
    if (targetYear && iy && iy !== targetYear) continue;
    return true;
  }
  return false;
}

function hasHtmlMatch(text, title) {
  if (typeof text !== "string" || !text) return false;
  const t = String(title ?? "").trim();
  if (!t) return false;
  // Conservative: only trust the title when it appears as a JSON string value
  // for a "title"/"name" field inside the (possibly server-rendered) HTML.
  const patterns = [
    new RegExp(`"title"\\s*:\\s*"${escapeRegex(t)}"`, "i"),
    new RegExp(`"name"\\s*:\\s*"${escapeRegex(t)}"`, "i"),
    new RegExp(`'title'\\s*:\\s*'${escapeRegex(t)}'`, "i"),
    new RegExp(`'name'\\s*:\\s*'${escapeRegex(t)}'`, "i")
  ];
  return patterns.some((re) => re.test(text));
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...(options || {}), signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function cinehdOpen(q) {
  const url = `${CINEHD_BASE}/search?q=${enc(q || "")}`;
  try {
    if (typeof window !== "undefined" && typeof window.open === "function") {
      window.open(url, "_blank", "noopener");
    }
  } catch (e) {
    // Deep-link failure is non-fatal.
  }
}

export function cinehdCheck(title, year) {
  const t = String(title ?? "").trim();
  if (!t) return Promise.resolve(false);
  const needle = t.toLowerCase();

  const run = async () => {
    const urls = CANDIDATE_ENDPOINTS(needle);
    for (const url of urls) {
      try {
        const res = await fetchWithTimeout(url, {
          method: "GET",
          headers: { Accept: "application/json, text/html;q=0.9" }
        }, 6000);
        if (!res || !res.ok) continue;

        const contentType = (res.headers && typeof res.headers.get === "function")
          ? (res.headers.get("content-type") || "")
          : "";

        // JSON endpoints.
        if (contentType.toLowerCase().includes("json")) {
          let data = null;
          try { data = await res.json(); } catch (e) { data = null; }
          if (data && hasJsonMatch(data, t, year)) return true;
          continue;
        }

        // Text/HTML endpoints (conservative match).
        let text = "";
        try { text = await res.text(); } catch (e) { text = ""; }
        try {
          let data = null;
          try { data = JSON.parse(text); } catch (e) { data = null; }
          if (data && hasJsonMatch(data, t, year)) return true;
        } catch (e) { /* ignore */ }
        if (hasHtmlMatch(text, t)) return true;
      } catch (e) {
        // Try next endpoint.
      }
    }
    return false;
  };

  return run().catch(() => false);
}

export async function cinehdMatch(tmdbItems) {
  const result = {};
  if (!Array.isArray(tmdbItems)) return result;

  const unique = [];
  const seen = new Set();
  for (const item of tmdbItems) {
    const title = item && (item.title || item.name);
    if (!title || seen.has(title)) continue;
    seen.add(title);
    const year = item && (item.release_date || item.first_air_date);
    unique.push({ title: String(title), year: year ? String(year).slice(0, 4) : "" });
  }

  const checks = await Promise.all(unique.map(async (entry) => {
    try {
      const ok = await cinehdCheck(entry.title, entry.year);
      return { title: entry.title, ok: !!ok };
    } catch (e) {
      return { title: entry.title, ok: false };
    }
  }));

  for (const entry of checks) result[entry.title] = entry.ok;
  return result;
}

export default {
  CINEHD_BASE,
  cinehdOpen,
  cinehdCheck,
  cinehdMatch
};
