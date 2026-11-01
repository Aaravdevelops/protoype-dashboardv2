// modules/storage.js — localStorage persistence for Dashboard V2
// All access is guarded so SSR / missing-storage environments never throw.

const KEYS = {
  recent: "dih_recent",
  pins: "dih_pins",
  mhist: "dih_mhist",
  engines: "dih_engines",
  study: "dih_study",
};

const LIMITS = {
  recent: 24,
  mhist: 24,
};

function safeStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch (e) {}
  return null;
}

export function getStore(key, fallback = null) {
  const ls = safeStorage();
  if (!ls) return fallback;
  try {
    const raw = ls.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function setStore(key, value) {
  const ls = safeStorage();
  if (!ls) return false;
  try {
    ls.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------- recent searches ---------- */
export function getRecentSearches() {
  const v = getStore(KEYS.recent, []);
  return Array.isArray(v) ? v : [];
}

export function setRecentSearches(list) {
  return setStore(KEYS.recent, Array.isArray(list) ? list.slice(0, LIMITS.recent) : []);
}

export function rememberRecent(q, tag) {
  if (!q) return getRecentSearches();
  const recent = getRecentSearches().filter((x) => !(x && x.q === q && x.tag === tag));
  recent.unshift({ q, tag, ts: Date.now() });
  const trimmed = recent.slice(0, LIMITS.recent);
  setStore(KEYS.recent, trimmed);
  return trimmed;
}

export function clearRecentSearches() {
  return setStore(KEYS.recent, []);
}

/* ---------- pins ---------- */
export function getPins() {
  const v = getStore(KEYS.pins, []);
  return Array.isArray(v) ? v : [];
}

export function setPins(pins) {
  return setStore(KEYS.pins, Array.isArray(pins) ? pins : []);
}

export function togglePin(pin) {
  // returns { pins, added }
  const pins = getPins();
  let found = -1;
  for (let i = 0; i < pins.length; i++) {
    const p = pins[i];
    if (p && pin && p.type === pin.type && String(p.id || p.title) === String(pin.id || pin.title)) {
      found = i; break;
    }
  }
  if (found > -1) {
    pins.splice(found, 1);
    setPins(pins);
    return { pins, added: false };
  }
  pins.unshift(pin);
  setPins(pins);
  return { pins, added: true };
}

/* ---------- movie-open history ---------- */
export function getMovieHistory() {
  const v = getStore(KEYS.mhist, []);
  return Array.isArray(v) ? v : [];
}

export function addMovieHistory(entry) {
  if (!entry) return getMovieHistory();
  const hist = getMovieHistory().filter((x) => !(x && String(x.id) === String(entry.id) && x.mt === entry.mt));
  hist.unshift({ id: entry.id, mt: entry.mt, title: entry.title || "Untitled", ts: Date.now() });
  const trimmed = hist.slice(0, LIMITS.mhist);
  setStore(KEYS.mhist, trimmed);
  return trimmed;
}

export function clearMovieHistory() {
  return setStore(KEYS.mhist, []);
}

/* ---------- engines ---------- */
export function getEngines() {
  const v = getStore(KEYS.engines, []);
  return Array.isArray(v) ? v : [];
}

export function setEngines(engines) {
  return setStore(KEYS.engines, Array.isArray(engines) ? engines : []);
}

/* ---------- study prefs ---------- */
export function getStudyPrefs() {
  const v = getStore(KEYS.study, {});
  return v && typeof v === "object" ? v : {};
}

export function setStudyPrefs(prefs) {
  return setStore(KEYS.study, prefs && typeof prefs === "object" ? prefs : {});
}

/* ---------- aliases for legacy inline names ---------- */
export const getCustom = getEngines;
export const setCustom = setEngines;
export const getMhist = getMovieHistory;
export const remember = rememberRecent;
export const getPinsAlias = getPins;

// default export bundle
export default {
  getStore, setStore,
  getRecentSearches, setRecentSearches, rememberRecent, clearRecentSearches,
  getPins, setPins, togglePin,
  getMovieHistory, addMovieHistory, clearMovieHistory,
  getEngines, setEngines,
  getStudyPrefs, setStudyPrefs,
  getCustom, setCustom, getMhist, remember,
};