// Region ground: world-anchored, cached in 512px chunks. Owned by: presentation.
import { PALETTE } from '../core/theme.js';
import { makeCanvas, cached, rgba } from './util.js';

const CH = 512;
const TAU = Math.PI * 2;

// ---- fast integer hash + value noise ----
function ih(x, y, s) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = ih(xi, yi, s), b = ih(xi + 1, yi, s), c = ih(xi, yi + 1, s), d = ih(xi + 1, yi + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function fbm(x, y, s = 0) { return vnoise(x, y, s) * 0.65 + vnoise(x * 2.3, y * 2.3, s + 7) * 0.35; }

// what's under a world point (used for decoration placement; also exported for action if useful)
export function groundKind(region, wx, wy) {
  if (region === 'lakeside') return fbm(wx / 210, wy / 210, 11) > 0.57 ? 'grass' : 'sand';
  if (region === 'summit') return fbm(wx / 170, wy / 170, 23) > 0.63 ? 'rock' : 'grass';
  return 'brick';
}

const chunkCache = new Map();
function getChunk(region, cx, cy) {
  const key = `${region}:${cx}:${cy}`;
  let c = chunkCache.get(key);
  if (c) { chunkCache.delete(key); chunkCache.set(key, c); return c; }
  c = makeCanvas(CH, CH);
  const g = c.getContext('2d');
  const X0 = cx * CH, Y0 = cy * CH;
  if (region === 'oldcity') buildBrick(g, X0, Y0);
  else buildNatural(g, region, X0, Y0);
  decorate(g, region, X0, Y0);
  chunkCache.set(key, c);
  if (chunkCache.size > 48) chunkCache.delete(chunkCache.keys().next().value);
  return c;
}

function buildNatural(g, region, X0, Y0) {
  const img = g.createImageData(CH, CH);
  const d = img.data;
  const lake = region === 'lakeside';
  // colors
  const SAND = [218, 200, 152], SAND2 = [201, 180, 130];
  const GR = lake ? [128, 168, 92] : [104, 166, 86];
  const GR2 = lake ? [104, 146, 76] : [80, 140, 70];
  const ROCK = [146, 154, 156], ROCK2 = [118, 126, 132];
  const sc = lake ? 210 : 170, seed = lake ? 11 : 23, th = lake ? 0.57 : 0.63;
  let i = 0;
  for (let py = 0; py < CH; py++) {
    const wy = Y0 + py;
    for (let px = 0; px < CH; px++, i += 4) {
      const wx = X0 + px;
      const n = fbm(wx / sc, wy / sc, seed);
      const fine = ih(wx, wy, 3);
      const clump = vnoise(wx / 9, wy / 9, 5);
      let r, gg, b;
      if (lake) {
        if (n > th) {
          const k = clump * 0.7 + fine * 0.3;
          r = GR2[0] + (GR[0] - GR2[0]) * k; gg = GR2[1] + (GR[1] - GR2[1]) * k; b = GR2[2] + (GR[2] - GR2[2]) * k;
          if (n < th + 0.012) { r *= 0.82; gg *= 0.86; b *= 0.82; } // soft edge line
        } else {
          const k = vnoise(wx / 40, wy / 40, 9) * 0.6 + fine * 0.4;
          r = SAND2[0] + (SAND[0] - SAND2[0]) * k; gg = SAND2[1] + (SAND[1] - SAND2[1]) * k; b = SAND2[2] + (SAND[2] - SAND2[2]) * k;
          if (fine > 0.985) { r -= 30; gg -= 30; b -= 30; }
          if (n > th - 0.03) { r -= 8; gg -= 6; b -= 10; } // damp border
        }
      } else {
        if (n > th) {
          const k = vnoise(wx / 14, wy / 14, 4) * 0.6 + fine * 0.4;
          r = ROCK2[0] + (ROCK[0] - ROCK2[0]) * k; gg = ROCK2[1] + (ROCK[1] - ROCK2[1]) * k; b = ROCK2[2] + (ROCK[2] - ROCK2[2]) * k;
          if (n < th + 0.015) { r *= 0.78; gg *= 0.8; b *= 0.82; }
          if (vnoise(wx / 4, wy / 30, 8) > 0.82) { r -= 18; gg -= 18; b -= 16; } // strata cracks
        } else {
          const k = clump * 0.7 + fine * 0.3;
          r = GR2[0] + (GR[0] - GR2[0]) * k; gg = GR2[1] + (GR[1] - GR2[1]) * k; b = GR2[2] + (GR[2] - GR2[2]) * k;
        }
      }
      d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
}

function buildBrick(g, X0, Y0) {
  const W = 8; // brick is 2W x W, herringbone lattice (W,W) & (2W,-2W)
  g.fillStyle = '#7a3a30'; // mortar
  g.fillRect(0, 0, CH, CH);
  // enumerate lattice origins o = k*(W,W) + j*(2W,-2W) covering the chunk (+margin)
  // x = W(k+2j), y = W(k-2j) -> k = (x/W + y/W)/2, j = (x/W - y/W)/4
  const x0 = X0 / W - 4, x1 = (X0 + CH) / W + 4, y0 = Y0 / W - 4, y1 = (Y0 + CH) / W + 4;
  const kMin = Math.floor((x0 + y0) / 2) - 2, kMax = Math.ceil((x1 + y1) / 2) + 2;
  const jMin = Math.floor((x0 - y1) / 4) - 2, jMax = Math.ceil((x1 - y0) / 4) + 2;
  const base = [168, 72, 58];
  for (let k = kMin; k <= kMax; k++) {
    for (let j = jMin; j <= jMax; j++) {
      const ox = W * (k + 2 * j) - X0, oy = W * (k - 2 * j) - Y0;
      if (ox < -3 * W || oy < -3 * W || ox > CH + W || oy > CH + W) continue;
      for (let v = 0; v < 2; v++) {
        const h = ih(k * 2 + v, j, 41);
        const h2 = ih(k, j * 2 + v, 42);
        let m = 0.82 + h * 0.3;
        let r = base[0] * m, gg = base[1] * m, b = base[2] * m;
        if (h2 > 0.93) { r *= 0.8; gg *= 0.78; b *= 0.8; }      // dark worn brick
        else if (h2 < 0.05) { r = r * 0.9 + 20; gg = gg * 0.9 + 14; b = b * 0.9 + 10; } // pale brick
        g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`;
        const [bx, by, bw, bh] = v === 0 ? [ox, oy, 2 * W, W] : [ox, oy + W, W, 2 * W];
        g.fillRect(bx + 0.6, by + 0.6, bw - 1.2, bh - 1.2);
        g.fillStyle = 'rgba(255,220,200,0.12)';
        g.fillRect(bx + 0.6, by + 0.6, bw - 1.2, 1.2);
        g.fillStyle = 'rgba(40,10,10,0.14)';
        g.fillRect(bx + 0.6, by + bh - 1.8, bw - 1.2, 1.2);
      }
    }
  }
  // large-scale grime/wear variation so tiling never reads as a grid
  const img = g.getImageData(0, 0, CH, CH), d = img.data;
  for (let py = 0, i = 0; py < CH; py++) for (let px = 0; px < CH; px++, i += 4) {
    const n = fbm((X0 + px) / 160, (Y0 + py) / 160, 61);
    const m = 0.9 + n * 0.18;
    d[i] *= m; d[i + 1] *= m; d[i + 2] *= m;
  }
  g.putImageData(img, 0, 0);
}

// ---- decorations (placed by world-cell hash so they cross chunk borders seamlessly) ----
const CELL = 40;
function decorate(g, region, X0, Y0) {
  const c0 = Math.floor(X0 / CELL) - 1, c1 = Math.floor((X0 + CH) / CELL) + 1;
  const r0 = Math.floor(Y0 / CELL) - 1, r1 = Math.floor((Y0 + CH) / CELL) + 1;
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    const h = ih(cx, cy, 101);
    if (h > 0.55) continue;
    const wx = cx * CELL + ih(cx, cy, 102) * CELL, wy = cy * CELL + ih(cx, cy, 103) * CELL;
    const x = wx - X0, y = wy - Y0;
    const kind = groundKind(region, wx, wy);
    const v = ih(cx, cy, 104);
    g.save(); g.translate(x, y);
    if (kind === 'grass') {
      if (v < 0.55) tuft(g, region === 'summit' ? '#5f9a4f' : '#6f9650', region === 'summit' ? '#8cc56e' : '#9cba6a');
      else if (v < 0.75) flowers(g, v);
      else if (v < 0.85) pebble(g, '#8d8a80');
      else clover(g);
    } else if (kind === 'sand') {
      if (v < 0.35) pebble(g, '#b8a37a');
      else if (v < 0.5) shell(g);
      else if (v < 0.58) footprints(g, v);
      else if (v < 0.75) { g.fillStyle = 'rgba(120,100,60,0.18)'; g.beginPath(); g.ellipse(0, 0, 9, 3, v * 6, 0, TAU); g.fill(); }
    } else if (kind === 'rock') {
      if (v < 0.5) pebble(g, '#7d8588');
      else if (v < 0.7) lichen(g);
    } else if (kind === 'brick') {
      if (v < 0.22) leaf(g, v);
      else if (v < 0.28) { g.fillStyle = 'rgba(80,120,60,0.45)'; g.fillRect(-4, -0.5, 8, 1.2); } // moss in mortar
      else if (v < 0.31) manhole(g);
    }
    g.restore();
  }
}
function tuft(g, dark, light) {
  g.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    g.strokeStyle = i % 2 ? dark : light; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(i * 1.6, 0); g.quadraticCurveTo(i * 2.2, -4, i * 3, -6 - (2 - Math.abs(i)) * 1.5); g.stroke();
  }
}
function flowers(g, v) {
  const cols = ['#fff6e5', '#ffc94a', '#e98aa8', '#b9a3ff'];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 5 + Math.sin(v * 50 + i) * 2, y = Math.cos(v * 40 + i) * 3;
    g.strokeStyle = '#4f8a45'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x, y); g.stroke();
    g.fillStyle = cols[(Math.floor(v * 97) + i) % cols.length];
    for (let p = 0; p < 5; p++) { const a = p * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6, 1.2, 0, TAU); g.fill(); }
    g.fillStyle = '#f29f2e'; g.beginPath(); g.arc(x, y, 0.9, 0, TAU); g.fill();
  }
}
function clover(g) { g.fillStyle = '#5f8f48'; for (const [x, y] of [[-2, 0], [2, 0], [0, -2]]) { g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fill(); } }
function pebble(g, col) {
  g.fillStyle = 'rgba(16,19,31,0.18)'; g.beginPath(); g.ellipse(0.5, 1.2, 3.6, 1.8, 0, 0, TAU); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, 3.2, 2.2, 0.3, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(-1, -0.8, 1.2, 0.7, 0.3, 0, TAU); g.fill();
}
function shell(g) {
  g.fillStyle = '#f4e3cf'; g.beginPath(); g.arc(0, 0, 3, Math.PI, 0); g.closePath(); g.fill();
  g.strokeStyle = '#c9a98a'; g.lineWidth = 0.6;
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(i * 1.3, -2.6); g.stroke(); }
}
function footprints(g, v) {
  g.fillStyle = 'rgba(120,96,60,0.25)';
  const a = v * 40;
  for (let i = 0; i < 3; i++) {
    const x = Math.cos(a) * i * 9 + (i % 2 ? 2 : -2) * Math.sin(a), y = Math.sin(a) * i * 9;
    g.beginPath(); g.ellipse(x, y, 1.8, 3, a + Math.PI / 2, 0, TAU); g.fill();
  }
}
function lichen(g) { g.fillStyle = 'rgba(200,190,90,0.5)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(i * 2 - 3, Math.sin(i) * 2, 1.5, 0, TAU); g.fill(); } }
function leaf(g, v) {
  const cols = ['#d9822b', '#c4532e', '#e8b04a', '#a8483a'];
  g.rotate(v * 30);
  g.fillStyle = cols[Math.floor(v * 400) % cols.length];
  g.beginPath(); g.moveTo(-4, 0); g.quadraticCurveTo(0, -3.5, 4, 0); g.quadraticCurveTo(0, 3.5, -4, 0); g.fill();
  g.strokeStyle = 'rgba(90,40,20,0.5)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-4, 0); g.lineTo(4, 0); g.stroke();
}
function manhole(g) {
  g.fillStyle = '#4a4f57'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
  g.strokeStyle = '#2f3339'; g.lineWidth = 1;
  for (let r = 3; r < 9; r += 3) { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
}

// ---- frost overlay tile (seamless 256) ----
function frostTile() {
  return cached('ground:frosttile', 256, 256, (g) => {
    const wrap = (fn) => { for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
    for (let i = 0; i < 14; i++) {
      const x = ih(i, 1, 201) * 256, y = ih(i, 2, 201) * 256, rx = 20 + ih(i, 3, 201) * 40, ry = rx * 0.45;
      wrap(() => {
        const gr = g.createRadialGradient(x, y, 1, x, y, rx);
        gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.7, 'rgba(232,248,255,0.45)'); gr.addColorStop(1, 'rgba(232,248,255,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
      });
    }
    for (let i = 0; i < 40; i++) {
      const x = ih(i, 4, 202) * 256, y = ih(i, 5, 202) * 256, s = 1.5 + ih(i, 6, 202) * 2.5;
      wrap(() => {
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 0.8;
        g.beginPath();
        for (let a = 0; a < 3; a++) { const an = a * Math.PI / 3; g.moveTo(x - Math.cos(an) * s, y - Math.sin(an) * s); g.lineTo(x + Math.cos(an) * s, y + Math.sin(an) * s); }
        g.stroke();
      });
    }
  });
}

/**
 * Fill the visible area of a region's ground. (camX,camY) = top-left visible world coord.
 * o.frost 0..1 adds a frozen tint + snow drifts (world-anchored).
 */
export function drawGroundImpl(ctx, game, region, camX, camY, w, h, o = {}) {
  const reg = region === 'oldcity' || region === 'summit' ? region : 'lakeside';
  const cx0 = Math.floor(camX / CH), cy0 = Math.floor(camY / CH);
  const cx1 = Math.floor((camX + w - 1) / CH), cy1 = Math.floor((camY + h - 1) / CH);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    // round to whole pixels to avoid seams between chunks
    ctx.drawImage(getChunk(reg, cx, cy), Math.round(cx * CH - camX), Math.round(cy * CH - camY));
  }
  ctx.imageSmoothingEnabled = true;
  const f = Math.max(0, Math.min(1, o.frost ?? 0));
  if (f > 0) {
    ctx.fillStyle = rgba(PALETTE.frost, 0.3 * f);
    ctx.fillRect(0, 0, w, h);
    const ft = frostTile();
    ctx.globalAlpha = Math.min(1, f * 1.1);
    const tx0 = Math.floor(camX / 256), ty0 = Math.floor(camY / 256);
    for (let ty = ty0; ty * 256 < camY + h; ty++) for (let tx = tx0; tx * 256 < camX + w; tx++) {
      ctx.drawImage(ft, Math.round(tx * 256 - camX), Math.round(ty * 256 - camY));
    }
  }
  ctx.restore();
}

/** Pre-build ground chunks around a world rect (call in enter() to avoid first-frame hitches). */
export function warmGround(region, x, y, w, h) {
  for (let cy = Math.floor(y / CH); cy <= Math.floor((y + h) / CH); cy++)
    for (let cx = Math.floor(x / CH); cx <= Math.floor((x + w) / CH); cx++) getChunk(region, cx, cy);
}
