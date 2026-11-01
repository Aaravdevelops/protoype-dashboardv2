// modules/cinehd.js — CineHD availability helper
export const CINEHD_BASE = "https://cinehd.cc";

function enc(s) {
  return encodeURIComponent(s);
}

export function cinehdOpen(q) {
  try { window.open(CINEHD_BASE + "/search?q=" + enc(q || ""), "_blank", "noopener"); } catch (e) {}
}

export async function cinehdCheck(q) {
  const needle = String(q || "").trim().toLowerCase();
  if (!needle) return false;
  try {
    const res = await fetch(CINEHD_BASE + "/api/movies?search=" + enc(needle));
    if (!res || !res.ok) return false;
    const j = await res.json();
    const list = (j && (j.movies || j.results || j.data)) || [];
    if (!Array.isArray(list)) return false;
    for (let i = 0; i < list.length; i++) {
      const m = list[i] || {};
      const t = String(m.title || m.name || "").toLowerCase();
      if (t && (t === needle || t.indexOf(needle) > -1 || needle.indexOf(t) > -1)) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

export default { CINEHD_BASE, cinehdOpen, cinehdCheck };