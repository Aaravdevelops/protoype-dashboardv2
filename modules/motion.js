/* Dashboard V2 — motion system (GSAP + ScrollTrigger + SplitText, Lenis, Motion).
   CDN ESM with graceful fallback to CSS-only animations. */
const CDN = {
  gsap: 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js',
  scrollTrigger: 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/ScrollTrigger.js',
  splitText: 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/SplitText.js',
  lenis: 'https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.mjs',
  motion: 'https://cdn.jsdelivr.net/npm/motion@11.11.13/dist/es/motion/lib/index.mjs'
};

let libsCache = null;
let libsPromise = null;
let motionState = {
  initialized: false,
  reduced: false,
  gsap: null,
  ScrollTrigger: null,
  SplitText: null,
  Lenis: null,
  motion: null,
  lenis: null
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function respectsReducedMotion() {
  if (!isBrowser() || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
}

async function loadLibs(force) {
  if (libsCache && !force) return libsCache;
  if (libsPromise && !force) return libsPromise;

  libsPromise = (async () => {
    const out = { gsap: null, ScrollTrigger: null, SplitText: null, Lenis: null, motion: null };

    async function tryImport(url, assign) {
      try {
        const mod = await import(/* @vite-ignore */ url);
        assign(mod);
      } catch (e) {
        console.warn('[motion] failed to load', url, e && e.message ? e.message : e);
      }
    }

    await tryImport(CDN.gsap, (m) => {
      out.gsap = (m && (m.gsap || m.default || m)) || null;
    });
    await tryImport(CDN.scrollTrigger, (m) => {
      out.ScrollTrigger = (m && (m.ScrollTrigger || m.default || m)) || null;
    });
    await tryImport(CDN.splitText, (m) => {
      out.SplitText = (m && (m.SplitText || m.default || m)) || null;
    });
    await tryImport(CDN.lenis, (m) => {
      out.Lenis = (m && (m.default || m.Lenis || m)) || null;
    });
    await tryImport(CDN.motion, (m) => {
      out.motion = m || null;
    });

    if (out.gsap && out.ScrollTrigger) {
      try { out.gsap.registerPlugin(out.ScrollTrigger); } catch (e) {}
    }
    if (out.gsap && out.SplitText) {
      try { out.gsap.registerPlugin(out.SplitText); } catch (e) {}
    }

    libsCache = out;
    motionState.gsap = out.gsap;
    motionState.ScrollTrigger = out.ScrollTrigger;
    motionState.SplitText = out.SplitText;
    motionState.Lenis = out.Lenis;
    motionState.motion = out.motion;

    // Allow retry only if everything failed.
    if (!out.gsap && !out.Lenis && !out.motion) libsPromise = null;
    return out;
  })();

  return libsPromise;
}

function resolveEl(el) {
  if (!el) return null;
  if (typeof el === 'string') {
    try { return document.querySelector(el); } catch (e) { return null; }
  }
  if (el && el.nodeType === 1) return el;
  return null;
}

function toArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (x instanceof NodeList || x instanceof HTMLCollection) return Array.from(x);
  return [x];
}

function injectStyleOnce(className, css) {
  if (!isBrowser()) return;
  const id = 'motion-injected-' + className;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

export async function initMotion(options) {
  options = options || {};
  if (!isBrowser()) return motionState;
  if (motionState.initialized) return motionState;

  const reduced = respectsReducedMotion();
  motionState.reduced = reduced;

  try {
    const libs = await loadLibs();
    const gsap = libs && libs.gsap;

    if (gsap) {
      try {
        gsap.defaults({
          ease: options.ease || 'power3.out',
          duration: options.duration != null ? options.duration : 0.6
        });
      } catch (e) {}
      if (libs.ScrollTrigger) {
        try { gsap.registerPlugin(libs.ScrollTrigger); } catch (e) {}
      }
      if (libs.SplitText) {
        try { gsap.registerPlugin(libs.SplitText); } catch (e) {}
      }
    }

    if (!reduced && libs && libs.Lenis) {
      try {
        const Lenis = libs.Lenis;
        const lenis = new Lenis(Object.assign({ smoothWheel: true, lerp: 0.1 }, options.lenis || {}));
        motionState.lenis = lenis;

        if (gsap && libs.ScrollTrigger) {
          lenis.on('scroll', libs.ScrollTrigger.update);
          gsap.ticker.add((time) => { try { lenis.raf(time * 1000); } catch (e) {} });
          gsap.ticker.lagSmoothing(0);
        } else {
          const raf = (t) => { try { lenis.raf(t); } catch (e) {} requestAnimationFrame(raf); };
          requestAnimationFrame(raf);
        }
      } catch (e) {
        console.warn('[motion] Lenis init failed, CSS-only scroll', e && e.message ? e.message : e);
        motionState.lenis = null;
      }
    }

    try {
      document.documentElement.classList.add('motion-ready');
      if (reduced) document.documentElement.classList.add('reduced-motion');
    } catch (e) {}
  } catch (e) {
    console.warn('[motion] init failed, falling back to CSS-only', e && e.message ? e.message : e);
  }

  motionState.initialized = true;
  return motionState;
}

export async function heroReveal(el, options) {
  options = options || {};
  const target = resolveEl(el);
  if (!target) return null;

  if (respectsReducedMotion()) {
    target.style.opacity = '1';
    target.style.transform = 'none';
    target.classList.add('motion-revealed');
    return null;
  }

  const libs = await loadLibs().catch(() => ({}));
  const gsap = libs && libs.gsap;
  const SplitText = libs && libs.SplitText;

  if (!gsap) {
    target.classList.add('motion-hero-reveal');
    injectStyleOnce('hero-reveal', '.motion-hero-reveal{animation:fadeUp .7s cubic-bezier(.22,1,.36,1) both;}');
    return null;
  }

  let splitter = null;
  try {
    if (SplitText) {
      splitter = new SplitText(target, Object.assign({ type: options.type || 'chars,words' }, options.splitOptions || {}));
    }
  } catch (e) {
    splitter = null;
  }

  const targets = (splitter && (splitter.chars || splitter.words)) || [target];

  try {
    const tl = gsap.timeline({ defaults: { ease: options.ease || 'power4.out' } });
    tl.from(targets, {
      yPercent: options.yPercent != null ? options.yPercent : 120,
      rotateX: options.rotateX != null ? options.rotateX : -90,
      opacity: 0,
      stagger: options.stagger != null ? options.stagger : 0.03,
      duration: options.duration != null ? options.duration : 0.9,
      delay: options.delay != null ? options.delay : 0,
      transformOrigin: '50% 100%'
    });
    try { target.__motionSplit = splitter; } catch (e) {}
    return tl;
  } catch (e) {
    try {
      return gsap.from(target, {
        opacity: 0,
        y: options.y != null ? options.y : 24,
        duration: options.duration != null ? options.duration : 0.7,
        delay: options.delay != null ? options.delay : 0
      });
    } catch (err) {
      return null;
    }
  }
}

export async function staggerIn(container, selector, delay) {
  delay = (delay == null) ? 0 : delay;
  const root = resolveEl(container) || (typeof container === 'string' ? null : null);
  const base = root || (isBrowser() ? document : null);
  let elements = [];
  try {
    if (selector && base) elements = Array.from(base.querySelectorAll(selector));
  } catch (e) {}
  if (!elements.length && container && container.nodeType === 1) elements = [container];

  if (respectsReducedMotion()) {
    elements.forEach((el) => {
      try { el.style.opacity = '1'; el.style.transform = 'none'; } catch (e) {}
    });
    return null;
  }

  const libs = await loadLibs().catch(() => ({}));
  const gsap = libs && libs.gsap;

  if (!gsap) {
    elements.forEach((el, i) => {
      try {
        el.classList.add('motion-stagger-in');
        el.style.animationDelay = ((delay || 0) * 1000 + i * 70) + 'ms';
      } catch (e) {}
    });
    injectStyleOnce('stagger-in', '.motion-stagger-in{animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both;}');
    return null;
  }

  try {
    return gsap.from(elements, {
      opacity: 0,
      y: 18,
      duration: 0.55,
      stagger: 0.07,
      delay: delay || 0,
      ease: 'power3.out',
      clearProps: 'all'
    });
  } catch (e) {
    return null;
  }
}

export async function tabTransition(fromPanel, toPanel, options) {
  options = options || {};
  const from = resolveEl(fromPanel);
  const to = resolveEl(toPanel);
  if (!from || !to || from === to) return null;

  if (respectsReducedMotion()) {
    try { from.style.display = 'none'; from.classList.remove('on'); } catch (e) {}
    try { to.style.display = 'block'; to.classList.add('on'); to.style.opacity = '1'; to.style.transform = 'none'; } catch (e) {}
    return null;
  }

  const libs = await loadLibs().catch(() => ({}));
  const gsap = libs && libs.gsap;

  if (!gsap) {
    try { from.classList.add('motion-panel-out'); to.classList.add('motion-panel-in'); } catch (e) {}
    setTimeout(() => {
      try { from.style.display = 'none'; from.classList.remove('on'); } catch (e) {}
      try { to.style.display = 'block'; to.classList.add('on'); } catch (e) {}
    }, 220);
    injectStyleOnce('panel-fallback', '.motion-panel-out{animation:panelOut .22s ease forwards;}.motion-panel-in{animation:panelIn .32s ease both;}@keyframes panelOut{to{opacity:0;transform:translateY(-8px)}}');
    return null;
  }

  try {
    to.style.display = 'block';
    to.classList.add('on');
    gsap.set(to, { opacity: 0, y: 12 });
    const tl = gsap.timeline();
    tl.to(from, {
      opacity: 0,
      y: -8,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        try { from.style.display = 'none'; from.classList.remove('on'); } catch (e) {}
      }
    }).fromTo(to, { opacity: 0, y: 12 }, {
      opacity: 1,
      y: 0,
      duration: 0.35,
      ease: 'power3.out',
      clearProps: 'transform,opacity'
    }, '-=0.06');
    return tl;
  } catch (e) {
    try { from.style.display = 'none'; to.style.display = 'block'; } catch (err) {}
    return null;
  }
}

export function cardHover(el) {
  const target = resolveEl(el);
  if (!target || respectsReducedMotion()) return null;
  if (target.dataset && target.dataset.motionHover === '1') return null;
  if (target.dataset) target.dataset.motionHover = '1';

  target.classList.add('motion-card-hover');

  let cleanup = () => {};
  loadLibs().then((libs) => {
    const gsap = libs && libs.gsap;
    if (!gsap) return;

    const onEnter = () => {
      try { gsap.to(target, { y: -6, scale: 1.015, duration: 0.3, ease: 'power2.out' }); } catch (e) {}
    };
    const onLeave = () => {
      try { gsap.to(target, { y: 0, scale: 1, rotationX: 0, rotationY: 0, duration: 0.35, ease: 'power3.out' }); } catch (e) {}
    };
    const onMove = (ev) => {
      try {
        const r = target.getBoundingClientRect();
        const x = (ev.clientX - r.left) / Math.max(1, r.width) - 0.5;
        const y = (ev.clientY - r.top) / Math.max(1, r.height) - 0.5;
        gsap.to(target, { rotationY: x * 7, rotationX: -y * 7, duration: 0.25, ease: 'power2.out', transformPerspective: 900 });
      } catch (e) {}
    };

    target.addEventListener('mouseenter', onEnter);
    target.addEventListener('mouseleave', onLeave);
    target.addEventListener('mousemove', onMove);

    cleanup = () => {
      try { target.removeEventListener('mouseenter', onEnter); } catch (e) {}
      try { target.removeEventListener('mouseleave', onLeave); } catch (e) {}
      try { target.removeEventListener('mousemove', onMove); } catch (e) {}
      try { delete target.dataset.motionHover; } catch (e) {}
    };
    try { target.__motionHoverCleanup = cleanup; } catch (e) {}
  }).catch(() => {});

  return () => { try { cleanup(); } catch (e) {} };
}

export function ripple(el, ev) {
  const target = resolveEl(el);
  if (!target || respectsReducedMotion()) return null;

  try {
    const cs = getComputedStyle(target);
    if (cs.position === 'static') target.style.position = 'relative';
    if (cs.overflow !== 'hidden') target.style.overflow = 'hidden';
  } catch (e) {}

  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = ev && typeof ev.clientX === 'number' ? ev.clientX - rect.left : rect.width / 2;
  const y = ev && typeof ev.clientY === 'number' ? ev.clientY - rect.top : rect.height / 2;

  const rip = document.createElement('span');
  rip.className = 'rip motion-ripple';
  rip.style.position = 'absolute';
  rip.style.borderRadius = '50%';
  rip.style.pointerEvents = 'none';
  rip.style.width = size + 'px';
  rip.style.height = size + 'px';
  rip.style.left = (x - size / 2) + 'px';
  rip.style.top = (y - size / 2) + 'px';
  rip.style.background = 'rgba(255,90,46,.28)';
  rip.style.transform = 'scale(0)';
  rip.style.opacity = '1';

  try { target.appendChild(rip); } catch (e) { return null; }

  loadLibs().then((libs) => {
    const gsap = libs && libs.gsap;
    const motion = libs && libs.motion;
    if (gsap) {
      try {
        gsap.fromTo(rip, { scale: 0, opacity: 0.35 }, {
          scale: 1,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
          onComplete: () => { try { rip.remove(); } catch (e) {} }
        });
        return;
      } catch (e) {}
    }
    if (motion && typeof motion.animate === 'function') {
      try {
        motion.animate(rip, { scale: [0, 1], opacity: [0.35, 0] }, { duration: 0.6 })
          .then(() => { try { rip.remove(); } catch (e) {} })
          .catch(() => { try { rip.remove(); } catch (e) {} });
        return;
      } catch (e) {}
    }
    rip.classList.add('motion-rip-css');
    setTimeout(() => { try { rip.remove(); } catch (e) {} }, 620);
  }).catch(() => {
    setTimeout(() => { try { rip.remove(); } catch (e) {} }, 620);
  });

  return rip;
}

function parseNumber(target) {
  if (typeof target === 'number') return target;
  const m = String(target == null ? '' : target).match(/-?[\d,]+\.?\d*/);
  return m ? parseFloat(m[0].replace(/,/g, '')) : 0;
}

function formatCount(value, target) {
  const t = String(target == null ? '' : target);
  const m = t.match(/\.(\d+)/);
  const decimals = m ? m[1].length : 0;
  let num = Number(value).toFixed(decimals);
  if (/,/.test(t)) {
    try { num = Number(num).toLocaleString(); } catch (e) {}
  }
  const prefix = (t.match(/^[^\d-]+/) || [''])[0];
  const suffix = (t.match(/[^\d]+$/) || [''])[0];
  return prefix + num + suffix;
}

export async function countUp(el, target, options) {
  options = options || {};
  const targetEl = resolveEl(el);
  if (!targetEl) return null;

  const finalText = (typeof target === 'number') ? String(target) : String(target);

  if (respectsReducedMotion()) {
    try { targetEl.textContent = finalText; } catch (e) {}
    return null;
  }

  const libs = await loadLibs().catch(() => ({}));
  const gsap = libs && libs.gsap;
  const from = options.from != null ? options.from : 0;
  const to = parseNumber(target);
  const duration = options.duration != null ? options.duration : 1.2;
  const formatter = typeof options.formatter === 'function' ? options.formatter : (v) => formatCount(v, target);

  if (gsap) {
    try {
      const obj = { val: from };
      return gsap.to(obj, {
        val: to,
        duration: duration,
        ease: options.ease || 'power2.out',
        onUpdate: () => {
          try { targetEl.textContent = formatter(obj.val); } catch (e) {}
        },
        onComplete: () => {
          try { targetEl.textContent = finalText; } catch (e) {}
        }
      });
    } catch (e) {}
  }

  // RAF fallback
  try {
    const startTs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const total = duration * 1000;
    const tick = (now) => {
      const p = Math.min(Math.max((now - startTs) / total, 0), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      try { targetEl.textContent = formatter(from + (to - from) * eased); } catch (e) {}
      if (p < 1) requestAnimationFrame(tick);
      else try { targetEl.textContent = finalText; } catch (e) {}
    };
    requestAnimationFrame(tick);
  } catch (e) {
    try { targetEl.textContent = finalText; } catch (err) {}
  }
  return null;
}

export function destroyMotion() {
  try {
    if (motionState.lenis && typeof motionState.lenis.destroy === 'function') motionState.lenis.destroy();
  } catch (e) {}
  motionState.lenis = null;
  motionState.initialized = false;
  return true;
}

export default {
  initMotion,
  heroReveal,
  staggerIn,
  tabTransition,
  cardHover,
  ripple,
  countUp,
  respectsReducedMotion,
  destroyMotion,
  loadLibs
};