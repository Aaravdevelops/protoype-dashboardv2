// app.js — entry point for Dashboard V2
import * as storage from "./modules/storage.js";
import * as tmdb from "./modules/tmdb.js";
import * as ui from "./modules/ui.js";
import { initMotion } from "./modules/motion.js";
import * as cinehd from "./modules/cinehd.js";

const $ = ui.$;
const $$ = ui.$$;
const esc = ui.esc;
const enc = ui.enc;
const vals = ui.vals;
const up = ui.up;
const setOn = ui.setOn;
const kill = ui.kill;
const toast = ui.toast;
const ago = ui.ago;
const I = ui.I;

const TMDB_KEY = tmdb.TMDB_KEY;
const IMG = tmdb.IMG;

const ENGINES = [
  { id: "g", n: "Google", c: "WEB", u: (q) => "https://www.google.com/search?q=" + enc(q) },
  { id: "b", n: "Bing", c: "WEB", u: (q) => "https://www.bing.com/search?q=" + enc(q) },
  { id: "ddg", n: "DuckDuckGo", c: "PRIVACY", u: (q) => "https://duckduckgo.com/?q=" + enc(q) },
  { id: "sp", n: "Startpage", c: "PRIVACY", u: (q) => "https://www.startpage.com/sp/search?query=" + enc(q) },
  { id: "br", n: "Brave", c: "PRIVACY", u: (q) => "https://search.brave.com/search?q=" + enc(q) },
  { id: "yt", n: "YouTube", c: "VIDEO", u: (q) => "https://www.youtube.com/results?search_query=" + enc(q) },
  { id: "gi", n: "Images", c: "IMAGES", u: (q) => "https://www.google.com/search?tbm=isch&q=" + enc(q) },
  { id: "gn", n: "News EN", c: "NEWS", u: (q) => "https://news.google.com/search?q=" + enc(q) + "&hl=en-IN&gl=IN&ceid=IN:en" },
  { id: "gnh", n: "News हिंदी", c: "NEWS", u: (q) => "https://news.google.com/search?q=" + enc(q) + "&hl=hi-IN&gl=IN&ceid=IN:hi" },
  { id: "wk", n: "Wikipedia EN", c: "REF", u: (q) => "https://en.wikipedia.org/w/index.php?search=" + enc(q) },
  { id: "wkh", n: "Wikipedia हिं", c: "REF", u: (q) => "https://hi.wikipedia.org/w/index.php?search=" + enc(q) },
  { id: "sch", n: "Scholar", c: "ACADEMIC", u: (q) => "https://scholar.google.com/scholar?q=" + enc(q) },
  { id: "pdf", n: "PDF Hunter", c: "ACADEMIC", u: (q) => "https://www.google.com/search?q=" + enc('"' + q + '" filetype:pdf'), dk: (q) => '"' + q + '" filetype:pdf' },
  { id: "arc", n: "Archive.org", c: "ARCHIVE", u: (q) => "https://archive.org/search?query=" + enc(q) },
  { id: "gut", n: "Gutenberg", c: "ARCHIVE", u: (q) => "https://www.gutenberg.org/ebooks/search/?query=" + enc(q) },
  { id: "ol", n: "Open Library", c: "ARCHIVE", u: (q) => "https://openlibrary.org/search?q=" + enc(q) },
  { id: "gh", n: "GitHub", c: "CODE", u: (q) => "https://github.com/search?q=" + enc(q) },
  { id: "so", n: "Stack Overflow", c: "CODE", u: (q) => "https://stackoverflow.com/search?q=" + enc(q) },
  { id: "map", n: "Maps", c: "GEO", u: (q) => "https://www.google.com/maps/search/" + enc(q) },
  { id: "jw", n: "JustWatch", c: "STREAM", u: (q) => "https://www.justwatch.com/in/search?q=" + enc(q) },
  { id: "imdb", n: "IMDb", c: "STREAM", u: (q) => "https://www.imdb.com/find/?q=" + enc(q) },
  { id: "lb", n: "Letterboxd", c: "STREAM", u: (q) => "https://letterboxd.com/search/" + enc(q) + "/" },
  { id: "gcode", n: "Dev Dork", c: "CODE", u: (q) => "https://www.google.com/search?q=" + enc(q + " site:stackoverflow.com"), dk: (q) => q + " site:stackoverflow.com" },
  { id: "ch", n: "CineHD", c: "STREAM", u: (q) => "https://cinehd.cc/search?q=" + enc(q) },
];

const INTERNALS = [
  { k: "movies", n: "MOVIE VAULT" }, { k: "wiki", n: "WIKIPEDIA" }, { k: "study", n: "NCERT RAIL" },
  { k: "news", n: "NEWS DESK" }, { k: "translate", n: "TRANSLATOR" },
];
const INTNAME = { movies: "MOVIE VAULT", wiki: "WIKIPEDIA", study: "NCERT RAIL", news: "NEWS DESK", translate: "TRANSLATOR" };
const CATCOLOR = { WEB: "#7ab8ff", PRIVACY: "#7dffab", VIDEO: "#ff7a9e", IMAGES: "#e6b34d", NEWS: "#ffd166", REF: "#c9a0ff", ACADEMIC: "#7ad7ff", ARCHIVE: "#d8d0c2", CODE: "#8affd6", GEO: "#ff9d7a", STREAM: "#ff5a2e" };

const state = { tab: "command", action: null };

function findEng(id) {
  for (let i = 0; i < ENGINES.length; i++) if (ENGINES[i].id === id) return ENGINES[i];
  return ENGINES[0];
}
function dorkOf(E, q) { return E.dk ? E.dk(q) : q; }

function detectIntent(q) {
  try {
    const s = " " + q.toLowerCase() + " ";
    if (/\b(ncert|cbse|class\s?\d{1,2}|chapter|exercise|syllabus|sample\s?paper|previous\s?year|board\s?exam|worksheet)\b/.test(s)) return "study";
    if (/\b(pdf|ebook|e-book|textbook|slides|presentation|filetype)\b/.test(s)) return "pdf";
    if (/\b(movie|film|cinema|series|trailer|imdb|webseries|web\s?series|cast\s?of|director\s?of)\b/.test(s)) return "movie";
    if (/\b(video|tutorial|lecture|how\s?to|watch)\b/.test(s)) return "video";
    if (/\b(image|images|photo|photos|picture|pic|pics|wallpaper|logo|poster)\b/.test(s)) return "image";
    if (/\b(news|headline|headlines|breaking|latest)\b/.test(s)) return "news";
    if (/\b(translate|translation|meaning\s?of|in\s?hindi|in\s?english)\b/.test(s)) return "translate";
    if (/^(who|what|when|where|why|which|whom)\b/.test(q.trim()) || /\b(wikipedia|definition|defined|encyclopedia|history\s?of)\b/.test(s)) return "wiki";
    if (/\b(near\s?me|map|maps|directions|route|location|address\s?of)\b/.test(s)) return "map";
    if (/\b(code|github|stack\s?overflow|error|bug|python|javascript|react|api|regex)\b/.test(s)) return "code";
    return "web";
  } catch (e) { return "web"; }
}
const INTENTS = {
  study: { chip: "NCERT / STUDY", int: "study", why: "syllabus signals detected" },
  pdf: { chip: "PDF HUNT", eng: "pdf", why: "document signals — filetype dork armed" },
  movie: { chip: "CINEMA", int: "movies", why: "film signals — live dossier engine" },
  video: { chip: "VIDEO", eng: "yt", why: "tutorial signals — video vertical first" },
  image: { chip: "IMAGE", eng: "gi", why: "visual signals — image vertical first" },
  news: { chip: "NEWS", int: "news", why: "freshness signals — live news desk" },
  translate: { chip: "TRANSLATE", int: "translate", why: "language signals — inline translator" },
  wiki: { chip: "ENCYCLOPEDIA", int: "wiki", why: "definitional question — read inline" },
  map: { chip: "PLACE", eng: "map", why: "location signals — maps first" },
  code: { chip: "CODE", eng: "gcode", why: "dev signals — stack overflow dork armed" },
  web: { chip: "GENERAL WEB", eng: "g", why: "no special signals — full web sweep" },
};

function groupedRows(q, stagger) {
  const order = ["WEB", "PRIVACY", "VIDEO", "IMAGES", "NEWS", "REF", "ACADEMIC", "ARCHIVE", "CODE", "GEO", "STREAM"];
  const byCat = {}, rows = [];
  let n = 0;
  for (let i = 0; i < ENGINES.length; i++) {
    const c = ENGINES[i].c;
    if (!byCat[c]) byCat[c] = [];
    byCat[c].push(ENGINES[i]);
  }
  function dly() { return stagger ? ' style="--d:' + Math.min(n++ * 16, 420) + 'ms"' : ""; }
  const cust = storage.getEngines();
  if (cust.length) {
    rows.push('<div class="dd-cat">YOUR ENGINES — FIRST IN LINE</div>');
    for (let k2 = 0; k2 < cust.length; k2++)
      rows.push('<button class="ddrow"' + dly() + ' data-cu="' + k2 + '" title="' + esc(cust[k2].t.split("{q}").join(q)) + '"><span class="dot" style="background:#f2ece0"></span>' + esc(cust[k2].n) + '<i>CUSTOM</i></button>');
  }
  rows.push('<div class="dd-cat">INTERNAL — RUNS ON THE BOARD</div>');
  for (let i = 0; i < INTERNALS.length; i++)
    rows.push('<button class="ddrow int"' + dly() + ' data-int="' + INTERNALS[i].k + '"><span class="dot" style="background:#ff5a2e"></span>' + INTERNALS[i].n + '<i>INTERNAL</i></button>');
  for (let o = 0; o < order.length; o++) {
    if (!byCat[order[o]] || !byCat[order[o]].length) continue;
    rows.push('<div class="dd-cat">' + order[o] + '</div>');
    const list = byCat[order[o]];
    for (let m = 0; m < list.length; m++)
      rows.push('<button class="ddrow"' + dly() + ' data-eng="' + list[m].id + '" title="' + esc(dorkOf(list[m], q)) + '"><span class="dot" style="background:' + (CATCOLOR[list[m].c] || "#a79c8a") + '"></span>' + esc(list[m].n) + '<i>' + list[m].c + '</i></button>');
  }
  return rows.join("");
}

function renderDD(stagger) {
  const q = $("#q").value.trim();
  const ddRec = $("#dd-rec"), ddList = $("#dd-list"), ddRecent = $("#dd-recent"), ddDiv = $("#dd-div");
  state.action = null;
  if (!q) {
    if (ddRec) { ddRec.hidden = true; ddRec.innerHTML = ""; }
    if (ddList) { ddList.hidden = true; ddList.innerHTML = ""; }
    if (ddDiv) ddDiv.hidden = true;
    const recents = storage.getRecentSearches().slice(0, 6);
    if (recents.length && ddRecent) {
      const out = ['<div class="dd-cat">RECENT</div>'];
      for (let r = 0; r < recents.length; r++)
        out.push('<button class="ddrow"' + (stagger ? ' style="--d:' + (r * 30) + 'ms"' : '') + ' data-rq="' + esc(recents[r].q) + '"><span class="dot" style="background:#a79c8a"></span>' + esc(recents[r].q) + '<i>' + ago(recents[r].ts) + '</i></button>');
      ddRecent.hidden = false;
      ddRecent.innerHTML = '<div class="dd-list' + (stagger ? '' : ' static') + '">' + out.join("") + '</div>';
      return true;
    }
    if (ddRecent) { ddRecent.hidden = true; ddRecent.innerHTML = ""; }
    return false;
  }
  if (ddRecent) { ddRecent.hidden = true; ddRecent.innerHTML = ""; }
  if (ddRec) ddRec.hidden = false;
  if (ddDiv) ddDiv.hidden = false;
  if (ddList) { ddList.hidden = false; ddList.className = "dd-list" + (stagger ? "" : " static"); }
  const key = detectIntent(q), def = INTENTS[key]; let html;
  if (def.int) {
    state.action = { int: def.int };
    const h = '<div class="dd-recwrap"><div class="dd-recin">'
      + '<div class="ddrectop"><span class="ichip">' + def.chip + '</span><span class="ddwhy">' + def.why + '</span></div>'
      + '<div class="ddrecname">' + INTNAME[def.int] + '</div>'
      + '<div class="dddork">' + esc(q) + '</div>'
      + '<div class="ddrecbtns"><button class="bgo" data-exec>GO ' + I.arrow + '</button>'
      + '<span class="ddenter">OR PRESS ENTER</span></div>'
      + '</div></div>';
    if (ddRec) ddRec.innerHTML = h;
  } else {
    const E = findEng(def.eng), dq = dorkOf(E, q);
    state.action = { url: E.u(q), name: E.n };
    const h = '<div class="dd-recwrap"><div class="dd-recin">'
      + '<div class="ddrectop"><span class="ichip">' + def.chip + '</span><span class="ddwhy">' + def.why + '</span></div>'
      + '<div class="ddrecname">' + esc(E.n) + '</div>'
      + '<div class="dddork">' + esc(dq) + '</div>'
      + '<div class="ddrecbtns"><button class="bgo" data-exec>GO ' + I.arrow + '</button>'
      + '<span class="ddenter">OR PRESS ENTER</span></div>'
      + '</div></div>';
    if (ddRec) ddRec.innerHTML = h;
  }
  if (ddList) ddList.innerHTML = groupedRows(q, stagger);
  return true;
}

function openDD() {
  const dd = $("#dd");
  if (dd && dd.hidden) { dd.hidden = false; $("#cmdbar").classList.add("open"); }
}
function closeDD() {
  const dd = $("#dd");
  if (dd) dd.hidden = true;
  const cmdbar = $("#cmdbar");
  if (cmdbar) cmdbar.classList.remove("open");
}
function execCmd() {
  const a = state.action, q = $("#q").value.trim();
  if (!a || !q) { toast("Type something first"); return; }
  closeDD();
  if (a.int) { storage.rememberRecent(q, INTNAME[a.int]); goTab(a.int, q); }
  else { storage.rememberRecent(q, a.name); window.open(a.url, "_blank", "noopener"); }
}

const PH_SAMPLES = ["metropolis movie", "ncert class 10 science pdf", "what is a black hole", "ai news today", "translate good morning to hindi", "qutub minar on the map"];
let phIdx = 0, phChar = 0, phDel = false;
function phTick() {
  const el = $("#q");
  if (!el) return;
  if (el.value || document.activeElement === el) { setTimeout(phTick, 1400); return; }
  const s = PH_SAMPLES[phIdx];
  if (!phDel) {
    phChar++;
    if (phChar >= s.length) { phDel = true; el.placeholder = s; setTimeout(phTick, 1700); return; }
  } else {
    phChar--;
    if (phChar <= 0) { phDel = false; phIdx = (phIdx + 1) % PH_SAMPLES.length; el.placeholder = ""; setTimeout(phTick, 380); return; }
  }
  el.placeholder = s.slice(0, phChar) + "\u258F";
  setTimeout(phTick, phDel ? 24 : 55);
}

function moveInd() {
  const btns = $$(".tabbtn"), ind = $("#tab-ind");
  let on = null;
  for (let i = 0; i < btns.length; i++) if (btns[i].classList.contains("on")) { on = btns[i]; break; }
  if (!on || !ind) return;
  ind.style.left = on.offsetLeft + "px";
  ind.style.width = on.offsetWidth + "px";
  ind.style.opacity = "1";
}

const FOCUSMAP = { command: "#q", movies: "#mv-q", wiki: "#wk-q", news: "#nw-q", engines: "#en-q", translate: "#tr-in" };
const booted = { movies: false, news: false };

export function showTab(id) {
  const ps = $$(".panel"), bs = $$(".tabbtn");
  for (let i = 0; i < ps.length; i++) setOn(ps[i], ps[i].id === "panel-" + id);
  for (let i = 0; i < bs.length; i++) setOn(bs[i], bs[i].getAttribute("data-tab") === id);
  state.tab = id;
  moveInd();
  if (id === "movies" && !booted.movies) { booted.movies = true; loadTrending(); }
  if (id === "news" && !booted.news) { booted.news = true; ui.renderNews(); loadHN($("#nw-q").value.trim()); }
  if (id === "engines") renderEngines();
  if (id === "dock") ui.renderDock();
  if (id === "study") ui.renderStudy();
}

export function goTab(tab, q) {
  showTab(tab);
  if (q == null) return;
  if (tab === "movies") { $("#mv-q").value = q; mvSearch(q); }
  else if (tab === "wiki") { $("#wk-q").value = q; ui.wikiSearch(q, wikiLang); }
  else if (tab === "news") { $("#nw-q").value = q; ui.renderNews(); loadHN(q); }
  else if (tab === "translate") { $("#tr-in").value = q; $("#tr-count").textContent = q.length + " CHARS"; }
  else if (tab === "study") ui.preselectStudy(q);
}

let wikiLang = "en";
let newsLang = "en";
// keep ui newsLang in sync
ui.setNewsLang(newsLang);

function mvSkeletons(n) { ui.mvSkeletons(n); }
function mvRender(items, q, avlMap) { ui.mvRender(items, q, avlMap); }

let mvToken = 0;
async function mvSearch(q) {
  q = (q || "").trim(); if (!q) return;
  storage.rememberRecent(q, "MOVIE VAULT");
  const token = ++mvToken;
  const goBtn = $("#mv-go");
  if (goBtn) goBtn.classList.add("loading");
  mvSkeletons(8);
  try {
    const r = await tmdb.searchMulti(q);
    if (token !== mvToken) return;
    const items = (r.results || []).filter((x) => x.media_type === "movie" || x.media_type === "tv");
    const seen = {}, titles = [];
    items.forEach((it) => { const t = it.title || it.name; if (t && !seen[t]) { seen[t] = 1; titles.push(t); } });
    const res = await Promise.all(titles.map((t) => cinehd.cinehdCheck(t).then((ok) => ({ t, ok }))));
    if (token !== mvToken) return;
    const avl = {};
    res.forEach((x) => { if (x.ok) avl[x.t] = true; });
    mvRender(items, q, avl);
  } catch (err) {
    if (token === mvToken) { const g = $("#mv-grid"); if (g) g.innerHTML = ""; toast(err.message); }
  } finally {
    if (token === mvToken && goBtn) goBtn.classList.remove("loading");
  }
}

function loadTrending() {
  mvSkeletons(10);
  tmdb.trendingMovies().then((r) => {
    const items = (r.results || []).slice(0, 14);
    mvRender(items, "");
    const chips = [];
    for (let i = 0; i < Math.min(5, items.length); i++)
      chips.push('<button class="chip" data-s="' + esc(items[i].title || "") + '">' + esc(items[i].title || "") + '</button>');
    const chipsEl = $("#mv-chips");
    if (chipsEl) chipsEl.innerHTML = chips.join("");
  }).catch((err) => { const g = $("#mv-grid"); if (g) g.innerHTML = ""; toast(err.message); });
}

function openDetail(id, mt) {
  ui.ovOpen('<div class="ov-loading">PULLING DOSSIER</div>');
  tmdb.getDetail(id, mt).then((d) => {
    return cinehd.cinehdCheck(d.title || d.name || "").then((ok) => ui.renderDetail(d, mt, ok));
  }).catch((err) => { ui.closeOv(); toast(err.message); });
}

function renderEngines() {
  const q = (ui.enQuery || "").trim ? (ui.enQuery || "").trim() : "";
  // use local enQuery state
  const cust = storage.getEngines();
  const out = [];
  for (let i = 0; i < cust.length; i++)
    out.push('<div class="ecard" data-cu="' + i + '" role="button" tabindex="0">'
      + '<span class="ec-top"><b>' + esc(cust[i].n) + '</b>'
      + '<button class="del" data-di="' + i + '" aria-label="Remove engine">' + I.x + '</button></span>'
      + '<code>' + esc(q ? cust[i].t.split("{q}").join(q) : cust[i].t) + '</code></div>');
  for (let i = 0; i < ENGINES.length; i++) {
    const E = ENGINES[i];
    out.push('<div class="ecard" data-eng="' + E.id + '" role="button" tabindex="0">'
      + '<span class="ec-top"><b>' + esc(E.n) + '</b><i>' + E.c + '</i></span>'
      + '<code>' + esc(q ? dorkOf(E, q) : "{q}") + '</code></div>');
  }
  const grid = $("#en-grid");
  if (grid) grid.innerHTML = out.join("");
}

let enQuery = "";
// sync with ui.enQuery
if (typeof window !== "undefined") {
  try { Object.defineProperty(window, "__enQuery", { get: () => enQuery, set: (v) => { enQuery = v; } }); } catch (e) {}
}

function loadHN(q) { return ui.loadHN(q); }

// wiring
function wire() {
  $("#tabs").addEventListener("click", (ev) => {
    const b = up(ev.target, "data-tab");
    if (b) showTab(b.getAttribute("data-tab"));
  });
  $("#brandhome").addEventListener("click", (ev) => { ev.preventDefault(); showTab("command"); });

  const qEl = $("#q");
  qEl.addEventListener("input", () => {
    const wasOpen = !$("#dd").hidden;
    if (renderDD(!wasOpen)) openDD(); else closeDD();
  });
  qEl.addEventListener("focus", () => {
    const wasOpen = !$("#dd").hidden;
    if (renderDD(!wasOpen)) openDD();
  });
  qEl.addEventListener("keydown", (ev) => { if (ev.key === "Enter") execCmd(); });
  $("#go").addEventListener("click", execCmd);
  $("#dd").addEventListener("mousedown", (ev) => { ev.preventDefault(); });
  $("#dd").addEventListener("click", (ev) => {
    if (up(ev.target, "data-exec")) { execCmd(); return; }
    const rq = up(ev.target, "data-rq");
    if (rq) { $("#q").value = rq.getAttribute("data-rq"); renderDD(false); openDD(); return; }
    const qv = $("#q").value.trim();
    const di = up(ev.target, "data-int");
    if (di) { storage.rememberRecent(qv, INTNAME[di.getAttribute("data-int")]); closeDD(); goTab(di.getAttribute("data-int"), qv); return; }
    const de = up(ev.target, "data-eng");
    if (de) {
      const E = findEng(de.getAttribute("data-eng"));
      if (qv) { storage.rememberRecent(qv, E.n); closeDD(); window.open(E.u(qv), "_blank", "noopener"); }
      return;
    }
    const dc = up(ev.target, "data-cu");
    if (dc) {
      const cust = storage.getEngines(), c2 = cust[+dc.getAttribute("data-cu")];
      if (c2 && qv) { storage.rememberRecent(qv, c2.n); closeDD(); window.open(c2.t.split("{q}").join(enc(qv)), "_blank", "noopener"); }
    }
  });
  document.addEventListener("click", (ev) => {
    if ($("#dd").hidden) return;
    if (!up(ev.target, "data-searchcol")) closeDD();
  });

  $("#mv-go").addEventListener("click", () => mvSearch($("#mv-q").value));
  $("#mv-q").addEventListener("keydown", (ev) => { if (ev.key === "Enter") mvSearch($("#mv-q").value); });
  $("#mv-chips").addEventListener("click", (ev) => {
    const c = up(ev.target, "data-s");
    if (c) { $("#mv-q").value = c.getAttribute("data-s"); mvSearch(c.getAttribute("data-s")); }
  });
  $("#mv-grid").addEventListener("click", (ev) => {
    const c = up(ev.target, "data-id");
    if (c) openDetail(c.getAttribute("data-id"), c.getAttribute("data-mt"));
  });
  $("#mv-grid").addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter") return;
    const c = up(ev.target, "data-id");
    if (c) openDetail(c.getAttribute("data-id"), c.getAttribute("data-mt"));
  });

  $("#wk-lang").addEventListener("click", (ev) => {
    const b = up(ev.target, "data-wl"); if (!b) return;
    wikiLang = b.getAttribute("data-wl");
    ui.setNewsLang; // noop placeholder
    const all = $$("#wk-lang button");
    for (let i = 0; i < all.length; i++) setOn(all[i], all[i] === b);
    const qv = $("#wk-q").value.trim();
    if (qv) ui.wikiSearch(qv, wikiLang);
  });
  $("#wk-go").addEventListener("click", () => ui.wikiSearch($("#wk-q").value, wikiLang));
  $("#wk-q").addEventListener("keydown", (ev) => { if (ev.key === "Enter") ui.wikiSearch($("#wk-q").value, wikiLang); });
  $("#wk-res").addEventListener("click", (ev) => {
    const b = up(ev.target, "data-wt");
    if (b) {
      const title = b.getAttribute("data-wt"), lang = b.getAttribute("data-wl");
      // toggle wiki pin
      const pins = storage.getPins();
      let found = -1;
      for (let i = 0; i < pins.length; i++) if (pins[i].type === "wiki" && pins[i].title === title) { found = i; break; }
      if (found > -1) { pins.splice(found, 1); storage.setPins(pins); toast("Removed from dock"); }
      else { pins.unshift({ type: "wiki", title, lang }); storage.setPins(pins); toast("Pinned to the dock"); }
      b.innerHTML = I.pin + " " + (storage.getPins().some((p) => p.type === "wiki" && p.title === title) ? "PINNED" : "PIN");
      setOn(b, storage.getPins().some((p) => p.type === "wiki" && p.title === title));
    }
  });

  const stl = $$("#st-lang button");
  for (let s = 0; s < stl.length; s++) setOn(stl[s], stl[s].getAttribute("data-sl") === ui.study.lang);
  $("#st-lang").addEventListener("click", (ev) => {
    const b = up(ev.target, "data-sl"); if (!b) return;
    ui.study.lang = b.getAttribute("data-sl");
    const all = $$("#st-lang button");
    for (let i = 0; i < all.length; i++) setOn(all[i], all[i] === b);
    ui.renderStudy();
  });
  $("#st-classes").addEventListener("click", (ev) => {
    const b = up(ev.target, "data-c"); if (!b) return;
    ui.study.c = +b.getAttribute("data-c");
    if (!ui.NCERT[ui.study.c] || ui.NCERT[ui.study.c].indexOf(ui.study.sub) === -1) ui.study.sub = null;
    ui.renderStudy();
  });
  $("#st-subjects").addEventListener("click", (ev) => {
    const b = up(ev.target, "data-s"); if (!b) return;
    ui.study.sub = b.getAttribute("data-s"); ui.renderStudy();
  });

  $("#nw-lang").addEventListener("click", (ev) => {
    const b = up(ev.target, "data-nl"); if (!b) return;
    newsLang = b.getAttribute("data-nl");
    ui.setNewsLang(newsLang);
    const all = $$("#nw-lang button");
    for (let i = 0; i < all.length; i++) setOn(all[i], all[i] === b);
    ui.renderNews();
  });
  $("#nw-go").addEventListener("click", () => {
    const qv = $("#nw-q").value.trim();
    if (qv) { storage.rememberRecent(qv, "NEWS DESK"); loadHN(qv); }
    ui.renderNews();
  });
  $("#nw-q").addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter") return;
    const qv = $("#nw-q").value.trim();
    if (qv) { storage.rememberRecent(qv, "NEWS DESK"); loadHN(qv); }
    ui.renderNews();
  });
  $("#nw-topics").addEventListener("click", (ev) => {
    const t = up(ev.target, "data-nt");
    if (t) window.open("https://news.google.com/search?q=" + enc(t.getAttribute("data-nt")) + "&" + ui.newsHl(), "_blank", "noopener");
  });

  const opts = [];
  const LANGS = [["en", "English"], ["hi", "Hindi"], ["bn", "Bengali"], ["mr", "Marathi"], ["ta", "Tamil"], ["te", "Telugu"], ["gu", "Gujarati"], ["kn", "Kannada"], ["ml", "Malayalam"], ["pa", "Punjabi"], ["ur", "Urdu"], ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["it", "Italian"], ["pt", "Portuguese"], ["ru", "Russian"], ["ar", "Arabic"], ["zh-CN", "Chinese"], ["ja", "Japanese"], ["ko", "Korean"]];
  for (let l = 0; l < LANGS.length; l++) opts.push('<option value="' + LANGS[l][0] + '">' + LANGS[l][1] + '</option>');
  $("#tr-from").innerHTML = opts.join("");
  $("#tr-to").innerHTML = opts.join("");
  $("#tr-from").value = "en"; $("#tr-to").value = "hi";
  $("#tr-swap").addEventListener("click", () => {
    const f = $("#tr-from").value; $("#tr-from").value = $("#tr-to").value; $("#tr-to").value = f;
  });
  $("#tr-in").addEventListener("input", function () {
    $("#tr-count").textContent = this.value.length + " CHARS · AUTO-CHUNKED EVERY 450";
  });
  // translator run (inline logic)
  function chunkText(t, max) {
    const parts = t.match(/[^.!?\u0964\n]+[.!?\u0964]*\s*/g) || [t];
    const out = []; let cur = "";
    for (let i = 0; i < parts.length; i++) {
      const s = parts[i];
      if (s.length > max) {
        if (cur) { out.push(cur); cur = ""; }
        for (let j = 0; j < s.length; j += max) out.push(s.slice(j, j + max));
        continue;
      }
      if (cur.length + s.length > max) { out.push(cur); cur = s; } else cur += s;
    }
    if (cur) out.push(cur);
    return out.map((x) => x.trim()).filter(Boolean);
  }
  function trChunk(text, from, to) {
    const u = "https://api.mymemory.translated.net/get?q=" + enc(text) + "&langpair=" + enc(from) + "%7C" + enc(to);
    return fetch(u).then((r) => r.json()).then((j) => {
      const t = (j && j.responseData && j.responseData.translatedText) || null;
      if (typeof t !== "string") throw new Error("Translation service returned nothing");
      if (/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID (SOURCE|TARGET)/i.test(t))
        throw new Error("Free translation quota or length limit hit — retry later or shorten");
      return t;
    });
  }
  function trRun() {
    const src = $("#tr-in").value.trim();
    if (!src) { toast("Type something to translate"); return; }
    const from = $("#tr-from").value, to = $("#tr-to").value;
    if (from === to) { toast("Pick two different languages"); return; }
    const btn = $("#tr-go"), out = $("#tr-out");
    btn.classList.add("loading"); btn.disabled = true;
    out.classList.remove("empty"); out.textContent = "…";
    const chunks = chunkText(src, 450), done = [];
    function step(i) {
      if (i >= chunks.length) {
        out.textContent = done.join(" ");
        storage.rememberRecent(src.slice(0, 60), "TRANSLATE");
        btn.classList.remove("loading"); btn.disabled = false;
        return;
      }
      trChunk(chunks[i], from, to).then((t) => {
        done.push(t); step(i + 1);
      }).catch((err) => {
        out.textContent = ""; out.classList.add("empty");
        toast(err.message);
        btn.classList.remove("loading"); btn.disabled = false;
      });
    }
    step(0);
  }
  $("#tr-go").addEventListener("click", trRun);
  $("#tr-in").addEventListener("keydown", (ev) => { if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) trRun(); });
  $("#tr-copy").addEventListener("click", () => {
    const t = $("#tr-out").textContent;
    if (!t || $("#tr-out").classList.contains("empty")) { toast("Nothing to copy yet"); return; }
    function ok() { toast("Copied"); }
    function legacy() {
      const ta = document.createElement("textarea");
      ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { toast("Copy blocked by the browser"); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, legacy);
    else legacy();
  });
  $("#tr-speak").addEventListener("click", () => {
    const t = $("#tr-out").textContent;
    if (!t || $("#tr-out").classList.contains("empty")) { toast("Translate something first"); return; }
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { toast("Speech not supported here"); return; }
    const u = new SpeechSynthesisUtterance(t.slice(0, 600));
    u.lang = $("#tr-to").value;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  });

  $("#en-q").addEventListener("input", function () {
    enQuery = this.value;
    ui.setEnQuery(enQuery);
    renderEngines();
  });
  ui.setEnQuery(enQuery);
  $("#en-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const n = $("#en-name").value.trim(), t = $("#en-url").value.trim();
    if (!n || t.indexOf("{q}") === -1 || !/^https?:\/\//.test(t)) {
      toast("Needs a name + full URL containing {q} — e.g. https://kagi.com/search?q={q}");
      return;
    }
    const cust = storage.getEngines(); cust.push({ n, t });
    storage.setEngines(cust);
    $("#en-name").value = ""; $("#en-url").value = "";
    renderEngines(); toast("Engine added");
  });
  $("#en-grid").addEventListener("click", (ev) => {
    const del = up(ev.target, "data-di");
    if (del) {
      const cust = storage.getEngines(); cust.splice(+del.getAttribute("data-di"), 1);
      storage.setEngines(cust);
      renderEngines(); toast("Engine removed");
      return;
    }
    const qv = enQuery.trim();
    const c = up(ev.target, "data-eng");
    if (c) { const E = findEng(c.getAttribute("data-eng")); if (qv) window.open(E.u(qv), "_blank", "noopener"); return; }
    const cu = up(ev.target, "data-cu");
    if (cu) {
      const cust2 = storage.getEngines(), item = cust2[+cu.getAttribute("data-cu")];
      if (item && qv) window.open(item.t.split("{q}").join(enc(qv)), "_blank", "noopener");
    }
  });

  $("#dock-clear").addEventListener("click", () => {
    storage.setStore("dih_recent", []); ui.renderDock(); toast("History cleared");
  });
  $("#dock-pins").addEventListener("click", (ev) => {
    const un = up(ev.target, "data-unpin");
    if (un) {
      ev.stopPropagation();
      const pins = storage.getPins(); pins.splice(+un.getAttribute("data-unpin"), 1);
      storage.setPins(pins); ui.renderDock(); toast("Unpinned");
      return;
    }
    const t = up(ev.target, "data-mid") || up(ev.target, "data-wt");
    if (!t) return;
    if (t.hasAttribute("data-mid")) openDetail(t.getAttribute("data-mid"), t.getAttribute("data-mt"));
    else { showTab("wiki"); $("#wk-q").value = t.getAttribute("data-wt"); ui.wikiSearch(t.getAttribute("data-wt"), t.getAttribute("data-wl")); }
  });
  $("#dock-recent").addEventListener("click", (ev) => {
    const t = up(ev.target, "data-rq"); if (!t) return;
    showTab("command");
    $("#q").value = t.getAttribute("data-rq");
    renderDD(true); openDD();
    $("#q").focus();
  });
  $("#dock-hist").addEventListener("click", (ev) => {
    const t = up(ev.target, "data-hmid"); if (!t) return;
    openDetail(t.getAttribute("data-hmid"), t.getAttribute("data-hmt"));
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      if (!$("#overlay").hidden) { ui.closeOv(); return; }
      if (!$("#dd").hidden) { closeDD(); return; }
      if (state.tab === "command" && $("#q").value) { $("#q").value = ""; renderDD(false); closeDD(); }
    }
    if (ev.key === "/" && $("#overlay").hidden) {
      const a = document.activeElement;
      if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT")) return;
      ev.preventDefault();
      const sel = FOCUSMAP[state.tab];
      if (sel) $(sel).focus();
    }
  });
}

function init() {
  ui.overlay = $("#overlay"); // not needed
  const overlay = $("#overlay");
  window.__overlay = overlay;
  // ensure ui.closeOv references #overlay dynamically (it does)
  initMotion();
  wire();
  ui.renderStudy();
  phTick();
  moveInd();
  addEventListener("resize", moveInd);
  addEventListener("load", moveInd);
  setTimeout(moveInd, 600);
  if (!window.fetch) toast("This browser is too old for live data — doors still work");
  try { $("#q").focus(); } catch (e) {}
}

if (typeof window !== "undefined") {
  window.showTab = showTab;
  try { init(); } catch (err) { toast("Boot error: " + err.message); }
  window.addEventListener("error", (ev) => { toast("Error: " + (ev.message || "unknown")); });
}