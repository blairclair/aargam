// Shared art helpers: offscreen caches, color mixing, seeded noise. Owned by: presentation.

/** Create an offscreen canvas (OffscreenCanvas is avoided for broad drawImage support). */
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

const caches = new Map();
/** Memoize an offscreen drawing by key. build(ctx, canvas) draws into a fresh canvas of w x h. */
export function cached(key, w, h, build) {
  let c = caches.get(key);
  if (!c) {
    c = makeCanvas(w, h);
    build(c.getContext('2d'), c);
    caches.set(key, c);
    if (caches.size > 600) caches.delete(caches.keys().next().value); // crude LRU-ish cap
  }
  return c;
}
export function clearArtCache(prefix = '') {
  for (const k of [...caches.keys()]) if (k.startsWith(prefix)) caches.delete(k);
}

/** Deterministic 0..1 hash of integers. */
export function hash2(x, y, s = 0) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (s | 0) * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h ^= h >>> 16;
  return ((h >>> 0) % 100000) / 100000;
}

/** mulberry32 seeded RNG. */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parse(c) {
  if (c[0] === '#') {
    const n = c.length === 4 ? c.slice(1).split('').map((d) => d + d).join('') : c.slice(1, 7);
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  }
  const m = c.match(/[\d.]+/g);
  return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}
/** Linear blend between two hex colors, k=0 -> a, k=1 -> b. Returns rgb() string. */
export function mix(a, b, k) {
  const A = parse(a), B = parse(b);
  const r = A.map((v, i) => Math.round(v + (B[i] - v) * k));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
}
export function shade(c, k) { return k >= 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }
export function rgba(c, a) { const [r, g, b] = parse(c); return `rgba(${r},${g},${b},${a})`; }

/** Rounded rect path helper (works where ctx.roundRect is missing). */
export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Soft ground shadow ellipse. */
export function shadow(ctx, rx, ry, a = 0.25) {
  ctx.fillStyle = `rgba(16,19,31,${a})`;
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

/** Normalize a facing value: radians (canonical). Returns {dir: ±1 horizontal, ang}. */
export function facingOf(f) {
  const ang = typeof f === 'number' && isFinite(f) ? f : 0;
  const c = Math.cos(ang);
  return { ang, dir: c < -0.01 ? -1 : 1 };
}
