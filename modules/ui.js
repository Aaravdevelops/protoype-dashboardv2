// modules/ui.js — rendering for Dashboard V2
import * as storage from "./storage.js";
import { IMG } from "./tmdb.js";
import { cinehdCheck } from "./cinehd.js";

const I = {
  arrow: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H8M17 7v9"/></svg>',
  play: '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.3v13.4L19 12z"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  star: '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
  pin: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
  x: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>',
};

export const REGION = "in";

export function $(s) { return document.querySelector(s); }
export function $$(s) { return document.querySelectorAll(s); }
export function esc(s) {
  s = String(s == null ? "" : s);
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function enc(s) { return encodeURIComponent(s); }
export function vals(o) { const r = []; for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r.push(o[k]); return r; }
export function up(el, attr) {
  while (el && el !== document) {
    if (el.getAttribute && el.getAttribute(attr) !== null) return el;
    el = el.parentNode;
  }
  return null;
}
export function setOn(el, on) {
  if (!el || !el.classList) return;
  if (on) el.classList.add("on"); else el.classList.remove("on");
}
export function kill(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
export function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  const box = $("#toasts"); if (box) box.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => kill(t), 350); }, 3600);
}
export function ago(ts) {
  if (!ts) return "";
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

/* ---------- movie cards ---------- */
export function mvSkeletons(n) {
  const out = [];
  for (let i = 0; i < n; i++)
    out.push('<div class="card skel" style="--d:' + (i * 45) + 'ms"><div class="poster"></div>'
      + '<div class="bar" style="width:80%"></div><div class="bar" style="width:50%"></div></div>');
  const g = $("#mv-grid"); if (g) g.innerHTML = out.join("");
}

export function mvRender(items, q, avlMap) {
  const g = $("#mv-grid"); if (!g) return;
  if (!items || !items.length) {
    g.innerHTML = '<div class="empty"><h3>Nothing in the vault</h3>'
      + '<p>TMDB has no match for "' + esc(q) + '" — the doors in the dossier rail can still hunt it down.</p></div>';
    return;
  }
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const title = it.title || it.name || "Untitled";
    const year = (it.release_date || it.first_air_date || "").slice(0, 4);
    const poster = IMG(it.poster_path, "w342");
    out.push('<article class="card" style="--d:' + (i * 45) + 'ms" data-id="' + it.id + '" data-mt="' + (it.media_type || "movie") + '" tabindex="0" role="button" aria-label="' + esc(title) + '">'
      + '<div class="poster">' + (poster ? '<img src="' + poster + '" alt="" loading="lazy">' : '<div class="noimg">NO ARTWORK</div>')
      + (avlMap && avlMap[title] ? '<span class="avlb">AVL</span>' : '')
      + '<span class="badge">' + I.star + (it.vote_average || 0).toFixed(1) + '</span>'
      + '<span class="type">' + (it.media_type === "tv" ? "SERIES" : "FILM") + '</span></div>'
      + '<h3>' + esc(title) + '</h3><p>' + (year || "TBA") + '</p></article>');
  }
  g.innerHTML = out.join("");
}

export function railHTML(title, year) {
  const cards = [
    ["Where to stream — legal", "https://www.justwatch.com/" + REGION + "/search?q=" + enc(title), "justwatch.com/" + REGION + " — every legal platform"],
    ["Reviews & criticism", "https://www.google.com/search?q=" + enc('"' + title + '" ' + (year || "") + " (review OR analysis OR criticism)"), '"' + esc(title) + '" ' + (year || "") + " (review OR analysis OR criticism)"],
    ["Reddit threads", "https://www.google.com/search?q=" + enc('site:reddit.com "' + title + '"'), 'site:reddit.com "' + esc(title) + '"'],
    ["Free / public domain", "https://archive.org/search?query=" + enc('"' + title + '"'), 'archive.org — "' + esc(title) + '"'],
    ["Video & trailers", "https://www.youtube.com/results?search_query=" + enc(title + (year ? " " + year : "")), "youtube — " + esc(title)],
    ["Stream on CineHD", "https://cinehd.cc/search?q=" + enc(title), "cinehd.cc — " + esc(title) + " in HD"],
  ];
  const out = [];
  for (let i = 0; i < cards.length; i++)
    out.push('<a class="dork" href="' + cards[i][1] + '" target="_blank" rel="noopener">'
      + '<span class="dl">' + cards[i][0] + ' ' + I.arrow + '</span><span class="dq">' + cards[i][2] + '</span></a>');
  return '<div class="rail">' + out.join("") + '</div>';
}

/* ---------- dossier overlay ---------- */
export function ovOpen(html) {
  const overlay = $("#overlay");
  if (!overlay) return;
  overlay.hidden = false;
  overlay.innerHTML = '<button class="ov-close" aria-label="Close">' + I.close + '</button>' + html;
  overlay.scrollTop = 0;
  document.body.style.overflow = "hidden";
  const btn = overlay.querySelector(".ov-close");
  if (btn) btn.addEventListener("click", closeOv);
}

export function closeOv() {
  const overlay = $("#overlay");
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true; overlay.innerHTML = "";
  document.body.style.overflow = "";
}

export function pickTrailer(list) {
  const y = [];
  for (let i = 0; i < list.length; i++) if (list[i].site === "YouTube") y.push(list[i]);
  if (!y.length) return null;
  let pick = null;
  for (let k = 0; k < y.length; k++) if (y[k].type === "Trailer" && y[k].official) { pick = y[k]; break; }
  if (!pick) for (let k = 0; k < y.length; k++) if (y[k].type === "Trailer") { pick = y[k]; break; }
  if (!pick) for (let k = 0; k < y.length; k++) if (y[k].type === "Teaser") { pick = y[k]; break; }
  return pick || y[0];
}

export function renderDetail(d, mt, avl) {
  const isTv = mt === "tv";
  try {
    let hm = storage.getMovieHistory();
    hm = hm.filter((x) => !(x && String(x.id) === String(d.id) && x.mt === mt));
    hm.unshift({ id: d.id, mt, title: (d.title || d.name || "Untitled"), ts: Date.now() });
    storage.addMovieHistory({ id: d.id, mt, title: (d.title || d.name || "Untitled") });
  } catch (e) {}
  const title = d.title || d.name || "Untitled";
  const year = (d.release_date || d.first_air_date || "").slice(0, 4);
  const ep = (d.episode_run_time && d.episode_run_time.length) ? d.episode_run_time[0] : 0;
  const runtime = isTv ? (ep ? ep + " MIN/EP" : "") : (d.runtime ? d.runtime + " MIN" : "");
  const bd = IMG(d.backdrop_path, "w1280") || IMG(d.poster_path, "w780");
  const cast = (d.credits && d.credits.cast) ? d.credits.cast.slice(0, 8) : [];
  const vid = pickTrailer((d.videos && d.videos.results) ? d.videos.results : []);

  const meta = [];
  if (year) meta.push('<span class="mchip">' + year + '</span>');
  if (runtime) meta.push('<span class="mchip">' + runtime + '</span>');
  meta.push('<span class="mchip hot">' + I.star + ' ' + (d.vote_average || 0).toFixed(1) + ' <i>/10</i></span>');
  meta.push('<span class="mchip">' + (d.vote_count || 0).toLocaleString() + ' VOTES</span>');
  if (avl) meta.push('<span class="mchip hot">AVL</span>');
  const gens = (d.genres || []).slice(0, 3);
  for (let g = 0; g < gens.length; g++) meta.push('<span class="mchip">' + esc(gens[g].name.toUpperCase()) + '</span>');

  let castHTML = "";
  if (cast.length) {
    castHTML = '<div class="cast">';
    for (let i = 0; i < cast.length; i++) {
      const p = cast[i];
      const ws = (p.name || "?").split(" "), initials = "";
      let init = "";
      for (let w = 0; w < Math.min(2, ws.length); w++) init += ws[w].charAt(0);
      castHTML += '<div class="person">'
        + (p.profile_path ? '<img src="' + IMG(p.profile_path, "w185") + '" alt="" loading="lazy">'
                          : '<div class="avatar">' + esc(init.toUpperCase()) + '</div>')
        + '<div class="nm">' + esc(p.name) + '</div><div class="role">' + esc(p.character || "") + '</div></div>';
    }
    castHTML += '</div>';
  } else castHTML = '<p class="ov-p dim">Cast not on file.</p>';

  const pinned = storage.getPins().some((p) => p.type === "movie" && String(p.id) === String(d.id));
  ovOpen(
    '<div class="ov-bd">' + (bd ? '<img src="' + bd + '" alt="">' : '') + '</div>'
    + '<div class="wrap">'
    + '<div class="ov-head">'
    + '<span class="ov-kick">' + (isTv ? "SERIES" : "FILM") + '</span>'
    + '<h1 class="ov-title">' + esc(title) + '</h1>'
    + (d.tagline ? '<p class="tagline">"' + esc(d.tagline) + '"</p>' : '')
    + '<div class="ov-meta">' + meta.join("") + '</div>'
    + '<div class="ov-actions"><button class="pinbtn btn-ghost ' + (pinned ? "on" : "") + '">'
    + I.pin + ' ' + (pinned ? "PINNED" : "PIN TO DOCK") + '</button></div>'
    + '</div>'
    + '<div class="ov-cols"><div>'
    + '<h3 class="ov-h">SYNOPSIS</h3>'
    + '<p class="ov-p">' + esc(d.overview || "No synopsis on file.") + '</p>'
    + '<h3 class="ov-h">CAST</h3>' + castHTML
    + '</div><div>'
    + '<h3 class="ov-h">PLAY — TRAILER</h3>'
    + (vid
      ? '<div class="player" data-yt="' + vid.key + '"><img src="https://i.ytimg.com/vi/' + vid.key + '/hqdefault.jpg" alt="">'
        + '<button class="playbtn" aria-label="Play trailer">' + I.play + '</button></div>'
      : '<p class="ov-p dim">No trailer on TMDB.</p>')
    + '<div id="wikiSlot"><h3 class="ov-h">WIKIPEDIA</h3><p class="ov-p dim">Searching…</p></div>'
    + '<div id="archSlot" hidden></div>'
    + '</div></div>'
    + '<div><h3 class="ov-h">WATCH / DEEP SEARCH</h3>' + railHTML(title, year) + '</div>'
    + '<p class="ov-credit">DATA: TMDB · TEXT: WIKIPEDIA (CC BY-SA) · PUBLIC-DOMAIN PRINTS: INTERNET ARCHIVE · AVAILABILITY: JUSTWATCH</p>'
    + '</div>');

  const overlay = $("#overlay");
  const pinBtn = overlay ? overlay.querySelector(".pinbtn") : null;
  if (pinBtn) pinBtn.addEventListener("click", function () {
    // toggle pin via storage
    const pins = storage.getPins();
    let found = -1;
    for (let i = 0; i < pins.length; i++) if (pins[i].type === "movie" && String(pins[i].id) === String(d.id)) { found = i; break; }
    if (found > -1) { pins.splice(found, 1); storage.setPins(pins); toast("Removed from dock"); }
    else {
      pins.unshift({ type: "movie", id: d.id, mt, title, year, pp: d.poster_path });
      storage.setPins(pins); toast("Pinned to the dock");
    }
    const b = overlay.querySelector(".pinbtn");
    const isPinned = storage.getPins().some((p) => p.type === "movie" && String(p.id) === String(d.id));
    if (b) { b.innerHTML = I.pin + " " + (isPinned ? "PINNED" : "PIN TO DOCK"); setOn(b, isPinned); }
  });
  const pl = overlay ? overlay.querySelector(".player[data-yt]") : null;
  if (pl) pl.addEventListener("click", function () {
    this.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + this.getAttribute("data-yt") + '?autoplay=1&rel=0" '
      + 'title="Trailer" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
  });
  dossierWiki(title, year, isTv);
  if (!isTv && +year && +year < 1930) fetchArchive(title);
}

export function dossierWiki(title, year, isTv) {
  const slot = $("#overlay") ? $("#overlay").querySelector("#wikiSlot") : null;
  if (!slot) return;
  const q = (title + " " + (year || "") + " " + (isTv ? "TV series" : "film")).trim();
  const p = "action=query&format=json&origin=*&generator=search&gsrlimit=3&gsrsearch=" + enc(q)
    + "&prop=extracts&exintro=1&explaintext=1";
  fetch("https://en.wikipedia.org/w/api.php?" + p).then((r) => r.json()).then((j) => {
    const pages = (j && j.query && j.query.pages) ? vals(j.query.pages) : [];
    let page = null;
    for (let i = 0; i < pages.length; i++) if (pages[i].extract && pages[i].extract.indexOf("may refer to") === -1) { page = pages[i]; break; }
    if (!page) for (let i = 0; i < pages.length; i++) if (pages[i].extract) { page = pages[i]; break; }
    if (!page || !page.extract) throw new Error("none");
    slot.innerHTML = '<h3 class="ov-h">WIKIPEDIA</h3><div class="wikicard"><p>'
      + esc(page.extract.slice(0, 420)) + (page.extract.length > 420 ? "…" : "") + '</p>'
      + '<a class="wlink" target="_blank" rel="noopener" href="https://en.wikipedia.org/wiki/'
      + enc(page.title.replace(/ /g, "_")) + '">READ FULL ARTICLE ' + I.arrow + '</a>'
      + '<span class="wcredit">TEXT © WIKIPEDIA CONTRIBUTORS — CC BY-SA</span></div>';
  }).catch(() => {
    slot.innerHTML = '<h3 class="ov-h">WIKIPEDIA</h3><p class="ov-p dim">No encyclopedia entry matched.</p>';
  });
}

export function fetchArchive(title) {
  const slot = $("#overlay") ? $("#overlay").querySelector("#archSlot") : null;
  if (!slot) return;
  const url = "https://archive.org/advancedsearch.php?q=" + enc('title:("' + title + '") AND mediatype:(movies)')
    + "&fl%5B%5D=identifier&fl%5B%5D=title&rows=3&output=json";
  fetch(url).then((r) => r.json()).then((j) => {
    const docs = (j.response && j.response.docs) ? j.response.docs : [];
    if (!docs.length) return;
    slot.hidden = false;
    slot.innerHTML = '<h3 class="ov-h">PLAY — FULL FILM, PUBLIC DOMAIN</h3>'
      + '<div class="player"><iframe src="https://archive.org/embed/' + enc(docs[0].identifier)
      + '" title="' + esc(docs[0].title || title) + '" allowfullscreen loading="lazy"></iframe></div>'
      + '<span class="wcredit">SERVED BY THE INTERNET ARCHIVE — ' + esc(docs[0].title || "") + '</span>';
  }).catch(() => {});
}

/* ---------- wiki panel ---------- */
export function wkCardHTML(p, lang, i) {
  const t = p.title || "—", ex = p.extract || "No extract available.";
  const thumb = (p.thumbnail && p.thumbnail.source) ? p.thumbnail.source : "";
  const pinned = storage.getPins().some((x) => x.type === "wiki" && x.title === t);
  return '<article class="wkcard" style="--d:' + (i * 55) + 'ms">'
    + (thumb ? '<img src="' + esc(thumb) + '" alt="" loading="lazy">'
             : '<div class="wkph">' + esc((t.charAt(0) || "?").toUpperCase()) + '</div>')
    + '<div><h3>' + esc(t) + '</h3>'
    + '<p>' + esc(ex.slice(0, 340)) + (ex.length > 340 ? "…" : "") + '</p>'
    + '<div class="wk-actions">'
    + '<a class="wlink" target="_blank" rel="noopener" href="https://' + lang + '.wikipedia.org/wiki/'
    + enc(t.replace(/ /g, "_")) + '">READ FULL ARTICLE ' + I.arrow + '</a>'
    + '<button class="btn-ghost ' + (pinned ? "on" : "") + '" data-wt="' + esc(t) + '" data-wl="' + lang + '">'
    + I.pin + ' ' + (pinned ? "PINNED" : "PIN") + '</button>'
    + '</div></div></article>';
}

export async function wikiSearch(q, lang) {
  q = (q || "").trim(); if (!q) return;
  storage.rememberRecent(q, "WIKIPEDIA");
  const resEl = $("#wk-res");
  if (resEl) resEl.innerHTML = '<div class="ov-loading" style="min-height:280px">SEARCHING</div>';
  const p = "action=query&format=json&origin=*&generator=search&gsrlimit=8&gsrsearch=" + enc(q)
    + "&prop=extracts%7Cpageimages&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=240";
  try {
    const r = await fetch("https://" + lang + ".wikipedia.org/w/api.php?" + p);
    const j = await r.json();
    const pages = (j && j.query && j.query.pages) ? vals(j.query.pages) : [];
    pages.sort((a, b) => (a.index || 0) - (b.index || 0));
    if (!pages.length) {
      if (resEl) resEl.innerHTML = '<div class="empty"><h3>Nothing found</h3><p>Try another spelling, or switch the language toggle.</p></div>';
      return;
    }
    const out = [];
    for (let i = 0; i < pages.length; i++) out.push(wkCardHTML(pages[i], lang, i));
    out.push('<span class="wcredit">TEXT © WIKIPEDIA CONTRIBUTORS — CC BY-SA</span>');
    if (resEl) resEl.innerHTML = out.join("");
  } catch (e) {
    toast("Wikipedia unreachable — check the connection");
  }
}

/* ---------- study ---------- */
const NCERT = {
  1: ["English", "Hindi", "Mathematics"], 2: ["English", "Hindi", "Mathematics"],
  3: ["English", "Hindi", "Mathematics", "EVS"], 4: ["English", "Hindi", "Mathematics", "EVS"],
  5: ["English", "Hindi", "Mathematics", "EVS"],
  6: ["Science", "Mathematics", "History", "Geography", "Civics", "English", "Hindi", "Sanskrit"],
  7: ["Science", "Mathematics", "History", "Geography", "Civics", "English", "Hindi", "Sanskrit"],
  8: ["Science", "Mathematics", "History", "Geography", "Civics", "English", "Hindi", "Sanskrit"],
  9: ["Science", "Mathematics", "History", "Geography", "Civics", "Economics", "English", "Hindi", "Sanskrit"],
  10: ["Science", "Mathematics", "History", "Geography", "Civics", "Economics", "English", "Hindi", "Sanskrit"],
  11: ["Physics", "Chemistry", "Biology", "Mathematics", "History", "Geography", "Political Science", "Economics", "English", "Hindi"],
  12: ["Physics", "Chemistry", "Biology", "Mathematics", "History", "Geography", "Political Science", "Economics", "English", "Hindi"],
};
export const study = { c: null, sub: null, lang: "en" };
try {
  const savedS = storage.getStudyPrefs();
  if (savedS && typeof savedS === "object") {
    study.c = savedS.c || null;
    study.sub = savedS.sub || null;
    study.lang = savedS.lang || "en";
  }
} catch (e) {}

export function preselectStudy(q) {
  const m = String(q || "").match(/class\s*(\d{1,2})/i);
  if (m && NCERT[+m[1]]) {
    study.c = +m[1];
    const low = String(q).toLowerCase();
    const subs = NCERT[study.c];
    for (let i = 0; i < subs.length; i++) {
      if (low.indexOf(subs[i].toLowerCase()) > -1) { study.sub = subs[i]; break; }
    }
    renderStudy();
  }
}

export function renderStudy() {
  const keys = Object.keys(NCERT);
  let out = ['<span class="rlabel">CLASS</span>'];
  for (let i = 0; i < keys.length; i++)
    out.push('<button class="pchip ' + (+keys[i] === study.c ? "on" : "") + '" data-c="' + keys[i] + '">' + keys[i] + '</button>');
  const classesEl = $("#st-classes");
  if (classesEl) classesEl.innerHTML = out.join("");

  if (!study.c) {
    const subsEl = $("#st-subjects");
    if (subsEl) subsEl.innerHTML = '<span class="rlabel" style="opacity:.6">PICK A CLASS FIRST</span>';
    const actionsEl = $("#st-actions");
    if (actionsEl) actionsEl.innerHTML = '<div class="empty"><h3>The rail is cold</h3><p>Pick a class, then a subject — every door dorks itself for exactly that book.</p></div>';
    return;
  }
  const subs = NCERT[study.c];
  out = ['<span class="rlabel">SUBJECT</span>'];
  for (let i = 0; i < subs.length; i++)
    out.push('<button class="pchip ' + (subs[i] === study.sub ? "on" : "") + '" data-s="' + esc(subs[i]) + '">' + esc(subs[i]) + '</button>');
  const subsEl = $("#st-subjects");
  if (subsEl) subsEl.innerHTML = out.join("");

  if (!study.sub) {
    const actionsEl = $("#st-actions");
    if (actionsEl) actionsEl.innerHTML = '<div class="empty"><h3>One more pick</h3><p>Choose a subject to arm the doors.</p></div>';
    return;
  }
  const hi = study.lang === "hi" ? " in hindi" : "";
  const gq = (q) => "https://www.google.com/search?q=" + enc(q);
  const A = [
    ["Textbook PDF", "ncert class " + study.c + " " + study.sub + " textbook pdf" + hi, gq],
    ["Solutions", "ncert class " + study.c + " " + study.sub + " solutions pdf" + hi, gq],
    ["Sample papers", "cbse class " + study.c + " " + study.sub + " sample paper with solution pdf" + hi, gq],
    ["Previous year papers", "cbse class " + study.c + " " + study.sub + " previous year question paper pdf" + hi, gq],
    ["Chapter notes", "class " + study.c + " " + study.sub + " notes chapter wise pdf" + hi, gq],
    ["Archive.org copies", "", () => "https://archive.org/search?query=" + enc("ncert class " + study.c + " " + study.sub)],
    ["Video lessons", "class " + study.c + " " + study.sub + " ncert full chapter" + hi, (q) => "https://www.youtube.com/results?search_query=" + enc(q)],
    ["Official NCERT page", "", () => "https://ncert.nic.in/textbook.php"],
  ];
  out = [];
  for (let i = 0; i < A.length; i++) {
    const href = A[i][2](A[i][1] || "");
    out.push('<a class="action" style="--d:' + (i * 40) + 'ms" target="_blank" rel="noopener" href="' + href + '">'
      + '<b>' + A[i][0] + '</b><code>' + esc(A[i][1] || href) + '</code></a>');
  }
  const actionsEl = $("#st-actions");
  if (actionsEl) actionsEl.innerHTML = out.join("");
  storage.setStudyPrefs({ c: study.c, sub: study.sub, lang: study.lang });
}

/* ---------- news ---------- */
export let newsLang = "en";
export function setNewsLang(v) { newsLang = v; }

export function newsHl() { return newsLang === "hi" ? "hl=hi-IN&gl=IN&ceid=IN:hi" : "hl=en-IN&gl=IN&ceid=IN:en"; }

export function renderNews() {
  const q = ($("#nw-q") && $("#nw-q").value.trim()) || "";
  const TOPICS = ["Top stories", "India", "World", "Business", "Technology", "Sports", "Entertainment", "Science", "Health", "Education"];
  let out = ['<span class="rlabel">' + (newsLang === "hi" ? "HINDI" : "FRONT") + '</span>'];
  for (let i = 0; i < TOPICS.length; i++)
    out.push('<button class="chip" data-nt="' + esc(TOPICS[i]) + '">' + esc(TOPICS[i]) + '</button>');
  const topicsEl = $("#nw-topics");
  if (topicsEl) topicsEl.innerHTML = out.join("");

  const list = [
    ["Google News", (x) => "https://news.google.com/search?q=" + enc(x) + "&" + newsHl()],
    ["Google News — other lang", (x) => newsLang === "hi"
      ? "https://news.google.com/search?q=" + enc(x) + "&hl=en-IN&gl=IN&ceid=IN:en"
      : "https://news.google.com/search?q=" + enc(x) + "&hl=hi-IN&gl=IN&ceid=IN:hi"],
    ["Bing News", (x) => "https://www.bing.com/news/search?q=" + enc(x)],
    ["BBC News", (x) => "https://www.bbc.com/search?q=" + enc(x)],
    ["DuckDuckGo News", (x) => "https://duckduckgo.com/?q=" + enc(x) + "&iar=news&ia=news"],
  ];
  const cards = [];
  for (let i = 0; i < list.length; i++)
    cards.push('<div class="ecard" data-ne="' + i + '" role="button" tabindex="0">'
      + '<span class="ec-top"><b>' + list[i][0] + '</b><i>NEWS</i></span>'
      + '<code>' + esc(q || "type a topic above") + '</code></div>');
  const engEl = $("#nw-engines");
  if (engEl) engEl.innerHTML = cards.join("");
  const els = $$("#nw-engines .ecard");
  for (let i = 0; i < els.length; i++) {
    (function (idx) {
      els[idx].addEventListener("click", function () {
        window.open(list[idx][1]((($("#nw-q") && $("#nw-q").value.trim()) || "top stories")), "_blank", "noopener");
      });
    })(i);
  }
}

export async function loadHN(q) {
  const box = $("#nw-hn"); if (!box) return;
  const url = q
    ? "https://hn.algolia.com/api/v1/search?query=" + enc(q) + "&hitsPerPage=6"
    : "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=8";
  try {
    const r = await fetch(url);
    const j = await r.json();
    const hits = (j.hits || []).filter((h) => h.title);
    const out = ['<div class="rlabel" style="display:block;margin:28px 0 10px">TECH PULSE — HACKER NEWS</div><div class="hn">'];
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      out.push('<a class="hnitem" href="' + esc(h.url || ("https://news.ycombinator.com/item?id=" + h.objectID)) + '" target="_blank" rel="noopener">'
        + '<b>' + esc(h.title) + '</b><span>' + (h.points || "?") + ' PTS · ' + (h.num_comments || 0)
        + ' COMMENTS · ' + ago((h.created_at_i || 0) * 1000) + '</span></a>');
    }
    out.push('</div>');
    box.innerHTML = out.join("");
  } catch (e) {
    box.innerHTML = "";
  }
}

/* ---------- engines ---------- */
export let enQuery = "";
export function setEnQuery(v) { enQuery = v; }

export function renderEngines() {
  const q = enQuery.trim();
  const cust = storage.getEngines();
  const out = [];
  for (let i = 0; i < cust.length; i++)
    out.push('<div class="ecard" data-cu="' + i + '" role="button" tabindex="0">'
      + '<span class="ec-top"><b>' + esc(cust[i].n) + '</b>'
      + '<button class="del" data-di="' + i + '" aria-label="Remove engine">' + I.x + '</button></span>'
      + '<code>' + esc(q ? cust[i].t.split("{q}").join(q) : cust[i].t) + '</code></div>');
  // built-in engines list is owned by app.js (ENGINES). ui renders placeholder? We'll let app append.
  const grid = $("#en-grid");
  if (grid) grid.innerHTML = out.join("");
  return out;
}

/* ---------- dock ---------- */
export function renderDock() {
  const pins = storage.getPins();
  const recents = storage.getRecentSearches();
  let out = [];
  if (pins.length) {
    for (let i = 0; i < pins.length; i++) {
      const p = pins[i];
      if (p.type === "movie") {
        out.push('<div class="tile m" role="button" tabindex="0" data-mid="' + p.id + '" data-mt="' + p.mt + '">'
          + (p.pp ? '<img src="' + IMG(p.pp, "w185") + '" alt="" loading="lazy">' : '<div class="wkph" style="width:58px;height:86px">M</div>')
          + '<div><i class="tbadge">MOVIE</i><b>' + esc(p.title) + '</b><span>' + esc(p.year || "") + ' · tap for dossier</span></div>'
          + '<button class="unpin" data-unpin="' + i + '" aria-label="Unpin">' + I.x + '</button></div>');
      } else {
        out.push('<div class="tile" role="button" tabindex="0" data-wt="' + esc(p.title) + '" data-wl="' + p.lang + '">'
          + '<i class="tbadge">' + (p.lang === "hi" ? "WIKI HI" : "WIKI EN") + '</i><b>' + esc(p.title) + '</b><span>tap to open inline</span>'
          + '<button class="unpin" data-unpin="' + i + '" aria-label="Unpin">' + I.x + '</button></div>');
      }
    }
  } else {
    out.push('<div class="empty"><h3>Nothing pinned</h3><p>Open a movie dossier or a wiki card and hit PIN.</p></div>');
  }
  const pinsEl = $("#dock-pins");
  if (pinsEl) pinsEl.innerHTML = out.join("");

  out = [];
  if (recents.length) {
    for (let i = 0; i < recents.length; i++)
      out.push('<div class="tile" role="button" tabindex="0" data-rq="' + esc(recents[i].q) + '">'
        + '<i class="tbadge">' + esc(recents[i].tag || "SEARCH") + '</i><b>' + esc(recents[i].q) + '</b><span>' + ago(recents[i].ts) + '</span></div>');
  } else {
    out.push('<div class="empty"><h3>No history yet</h3><p>Every search you run lands here.</p></div>');
  }
  const recEl = $("#dock-recent");
  if (recEl) recEl.innerHTML = out.join("");

  const hist = storage.getMovieHistory();
  const hout = [];
  for (let i = 0; i < hist.length; i++) {
    const hm = hist[i];
    hout.push('<div class="tile" role="button" tabindex="0" data-hmid="' + hm.id + '" data-hmt="' + (hm.mt || "movie") + '">'
      + '<i class="tbadge">OPENED</i><b>' + esc(hm.title) + '</b><span>' + esc(hm.mt || "movie") + ' · ' + ago(hm.ts) + '</span></div>');
  }
  if (!hout.length) hout.push('<div class="empty"><h3>No history yet</h3><p>Movie dossiers you open will land here.</p></div>');
  const histEl = $("#dock-hist");
  if (histEl) histEl.innerHTML = hout.join("");
}

export default {
  $, $$, esc, enc, vals, up, setOn, kill, toast, ago, I,
  mvSkeletons, mvRender, railHTML,
  ovOpen, closeOv, pickTrailer, renderDetail, dossierWiki, fetchArchive,
  wkCardHTML, wikiSearch,
  NCERT, study, preselectStudy, renderStudy,
  newsLang, setNewsLang, newsHl, renderNews, loadHN,
  enQuery, setEnQuery, renderEngines,
  renderDock,
};