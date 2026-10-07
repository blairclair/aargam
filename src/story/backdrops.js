// Cutscene + title backdrops. Owned by: story team.
// Uses art's drawRoom(ctx, game, roomId, camX, camY, w, h, o) when it exists; otherwise draws simple,
// cozy, procedural sets per room so every cutscene has a sense of place.
import * as Sprites from '../art/sprites.js';
import { ROOMS, PALETTE } from '../core/theme.js';

const TAU = Math.PI * 2;

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function rand(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Draw a backdrop for `key` (room id | 'house' | 'dusk' | 'party'). Never throws. */
export function drawBackdrop(ctx, game, key, t = 0, W = 960, H = 540) {
  ctx.save();
  try {
    if (ROOMS[key] && typeof Sprites.drawRoom === 'function') {
      // art's interior, framed on the room's center
      Sprites.drawRoom(ctx, game, key, 0, 0, W, H, { t, cutscene: true });
    } else if (key === 'house') house(ctx, W, H, t, false);
    else if (key === 'dusk' || key === 'party') house(ctx, W, H, t, true, key === 'party');
    else if (key === 'backyard') backyard(ctx, W, H, t);
    else if (key === 'pond') pond(ctx, W, H, t);
    else if (ROOMS[key]) interior(ctx, W, H, t, key);
    else { ctx.fillStyle = PALETTE.night; ctx.fillRect(0, 0, W, H); }
  } catch (e) {
    ctx.restore(); ctx.save();
    ctx.fillStyle = PALETTE.night; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

// ------------------------------------------------------------ interiors
const WALLS = {
  office: ['#3b4a5e', '#2c394b'], kitchen: ['#f0dcb4', '#d9c093'], living: ['#7b6a8f', '#5e4f72'],
  dining: ['#a86a74', '#87505a'], playroom: ['#6c9bc9', '#4f7eae'], primary: ['#d6a3b4', '#b98597'],
  guest: ['#7fa9bf', '#5f8aa1'],
};

function interior(ctx, W, H, t, id) {
  const [wTop, wBot] = WALLS[id] ?? ['#8b7b6a', '#6d5f51'];
  const floorY = Math.round(H * 0.62);
  // wall
  let g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, wTop); g.addColorStop(1, wBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, floorY);
  // wainscot + trim
  ctx.fillStyle = 'rgba(255,246,229,0.10)'; ctx.fillRect(0, floorY - 70, W, 70);
  ctx.fillStyle = 'rgba(255,246,229,0.35)'; ctx.fillRect(0, floorY - 72, W, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, floorY - 6, W, 6);
  // window with daylight
  window_(ctx, W / 2 - 70, 60, 140, 120, t);
  // wood floor
  g = ctx.createLinearGradient(0, floorY, 0, H);
  g.addColorStop(0, '#a86f43'); g.addColorStop(1, '#6e4426');
  ctx.fillStyle = g; ctx.fillRect(0, floorY, W, H - floorY);
  ctx.strokeStyle = 'rgba(40,20,8,0.25)'; ctx.lineWidth = 1.5;
  for (let y = floorY + 16, k = 0; y < H; y += 18 + k * 2, k++) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // rug
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(W / 2, floorY + 95, 250, 48, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = mix(ROOMS[id].accent, '#5a3a2a', 0.45); ctx.beginPath(); ctx.ellipse(W / 2, floorY + 90, 240, 44, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,246,229,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(W / 2, floorY + 90, 220, 36, 0, 0, TAU); ctx.stroke();
  // room set dressing (kept to the middle third so busts don't cover it)
  const f = SETS[id]; if (f) f(ctx, W, H, floorY, t);
  // weird-accent glow + warm lamp
  glow(ctx, W / 2, floorY - 40, 360, ROOMS[id].accent, 0.18 + 0.05 * Math.sin(t * 2));
  glow(ctx, 120, 120, 220, '#ffd58a', 0.18);
  vignette(ctx, W, H);
}

function window_(ctx, x, y, w, h, t, night = false) {
  ctx.fillStyle = '#5a3a2a'; rr(ctx, x - 8, y - 8, w + 16, h + 16, 6); ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  if (night) { g.addColorStop(0, '#1b2238'); g.addColorStop(1, '#4b3b6a'); } else { g.addColorStop(0, '#9fd3f5'); g.addColorStop(1, '#e8f6ff'); }
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  if (!night) { const cx = x + ((t * 8) % (w + 60)) - 30; ctx.beginPath(); ctx.arc(cx, y + 34, 12, 0, TAU); ctx.arc(cx + 14, y + 30, 15, 0, TAU); ctx.arc(cx + 30, y + 36, 11, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x + w / 2 - 3, y, 6, h); ctx.fillRect(x, y + h / 2 - 3, w, 6);
  ctx.fillStyle = '#f6e7c8'; ctx.fillRect(x - 14, y + h + 6, w + 28, 8);
}

const SETS = {
  office(ctx, W, H, fy, t) {
    // desk
    ctx.fillStyle = '#6e4a2e'; rr(ctx, W / 2 - 160, fy - 20, 320, 22, 4); ctx.fill();
    ctx.fillRect(W / 2 - 150, fy, 12, 70); ctx.fillRect(W / 2 + 138, fy, 12, 70);
    // monitor with scrolling code
    ctx.fillStyle = '#1a1f2b'; rr(ctx, W / 2 - 80, fy - 128, 160, 100, 6); ctx.fill();
    ctx.fillStyle = '#0d1a14'; ctx.fillRect(W / 2 - 72, fy - 120, 144, 84);
    const r = rand(7);
    for (let i = 0; i < 9; i++) {
      const y = fy - 114 + ((i * 10 + t * 14) % 84);
      ctx.fillStyle = i % 3 ? 'rgba(127,216,166,0.8)' : 'rgba(255,201,74,0.8)';
      ctx.fillRect(W / 2 - 66 + r() * 20, y, 30 + r() * 80, 3);
    }
    ctx.fillStyle = '#2a2f3d'; ctx.fillRect(W / 2 - 8, fy - 28, 16, 10);
    // escaping bugs
    for (let i = 0; i < 6; i++) {
      const a = t * 1.3 + i * 1.7, bx = W / 2 + Math.cos(a) * (120 + i * 12), by = fy + 50 + Math.sin(a * 1.4) * 22;
      bug(ctx, bx, by, a);
    }
  },
  kitchen(ctx, W, H, fy) {
    ctx.fillStyle = '#f6e7c8'; ctx.fillRect(W / 2 - 220, 40, 440, 50);
    ctx.strokeStyle = 'rgba(90,58,42,0.4)'; for (let i = 0; i < 5; i++) ctx.strokeRect(W / 2 - 220 + i * 88, 40, 88, 50);
    ctx.fillStyle = '#e8d6b0'; ctx.fillRect(W / 2 - 220, fy - 70, 440, 70);
    ctx.fillStyle = '#7a5a40'; ctx.fillRect(W / 2 - 226, fy - 76, 452, 10);
    ctx.fillStyle = '#3a3f4d'; rr(ctx, W / 2 - 40, fy - 66, 80, 62, 4); ctx.fill();
    ctx.fillStyle = '#ffb35a'; ctx.globalAlpha = 0.6; ctx.fillRect(W / 2 - 30, fy - 50, 60, 30); ctx.globalAlpha = 1;
    // jar with bubbling starter
    ctx.fillStyle = 'rgba(232,248,255,0.6)'; rr(ctx, W / 2 + 120, fy - 130, 50, 56, 8); ctx.fill();
    ctx.fillStyle = '#f2e2b8'; ctx.beginPath(); ctx.ellipse(W / 2 + 145, fy - 132, 34, 22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a3a2a'; ctx.beginPath(); ctx.arc(W / 2 + 136, fy - 136, 3, 0, TAU); ctx.arc(W / 2 + 154, fy - 136, 3, 0, TAU); ctx.fill();
    // loaf on counter
    ctx.fillStyle = '#c98a4a'; ctx.beginPath(); ctx.ellipse(W / 2 - 140, fy - 86, 34, 14, 0, Math.PI, 0); ctx.fill();
  },
  living(ctx, W, H, fy, t) {
    ctx.fillStyle = '#4d6b7a'; rr(ctx, W / 2 - 150, fy - 70, 300, 70, 16); ctx.fill();
    ctx.fillStyle = '#5c7d8c'; rr(ctx, W / 2 - 140, fy - 104, 280, 50, 14); ctx.fill();
    ctx.fillStyle = '#e8b4c8'; rr(ctx, W / 2 - 110, fy - 92, 50, 36, 8); ctx.fill();
    // roomba tank
    const rx = W / 2 + Math.sin(t * 0.8) * 120;
    ctx.fillStyle = '#2a2f3d'; ctx.beginPath(); ctx.ellipse(rx, fy + 60, 46, 16, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a4152'; ctx.beginPath(); ctx.ellipse(rx, fy + 52, 40, 13, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff5d5d'; ctx.beginPath(); ctx.arc(rx, fy + 48, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a4152'; ctx.fillRect(rx, fy + 44, 36, 6);
    // bunnies
    for (let i = 0; i < 4; i++) bunny(ctx, W / 2 - 120 + i * 80, fy + 110 - Math.abs(Math.sin(t * 4 + i)) * 12);
  },
  dining(ctx, W, H, fy, t) {
    ctx.fillStyle = '#7a4e2e'; rr(ctx, W / 2 - 170, fy - 10, 340, 22, 6); ctx.fill();
    ctx.fillRect(W / 2 - 150, fy + 10, 12, 60); ctx.fillRect(W / 2 + 138, fy + 10, 12, 60);
    ctx.fillStyle = '#fff6e5'; ctx.fillRect(W / 2 - 170, fy - 14, 340, 6);
    for (let i = 0; i < 4; i++) {
      const a = t * 1.5 + i * 1.6, px = W / 2 + Math.cos(a) * 150, py = fy - 120 + Math.sin(a * 2) * 30;
      ctx.fillStyle = '#fff6e5'; ctx.beginPath(); ctx.ellipse(px, py, 20, 7, Math.sin(a) * 0.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#e98aa8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, 13, 4, Math.sin(a) * 0.4, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(W / 2 - 220, fy - 60, 10, 110); ctx.fillRect(W / 2 - 250, fy - 4, 40, 10);
    ctx.fillRect(W / 2 + 210, fy - 60, 10, 110); ctx.fillRect(W / 2 + 210, fy - 4, 40, 10);
  },
  playroom(ctx, W, H, fy, t) {
    ctx.fillStyle = '#8a5a3a'; ctx.fillRect(W / 2 - 200, fy - 190, 16, 190); ctx.fillRect(W / 2 + 184, fy - 190, 16, 190);
    const cols = ['#ff8fb1', '#ffc94a', '#7fd8a6', '#5aa4e6', '#c9a0dc'];
    for (let s = 0; s < 3; s++) {
      ctx.fillStyle = '#8a5a3a'; ctx.fillRect(W / 2 - 200, fy - 190 + s * 60, 400, 8);
      for (let b = 0; b < 6; b++) { ctx.fillStyle = cols[(s * 6 + b) % 5]; ctx.fillRect(W / 2 - 180 + b * 60, fy - 176 + s * 60, 50, 20); }
    }
    for (let i = 0; i < 5; i++) {
      const x = W / 2 - 160 + i * 80 + ((t * 30) % 80), y = fy + 70;
      ctx.fillStyle = '#fff6e5'; rr(ctx, x - 12, y - 34, 24, 34, 3); ctx.fill();
      ctx.fillStyle = i % 2 ? '#a8483a' : '#10131f'; ctx.font = 'bold 14px serif'; ctx.textAlign = 'center'; ctx.fillText(i % 2 ? '♥' : '♠', x, y - 12);
    }
  },
  primary(ctx, W, H, fy) {
    ctx.fillStyle = '#6e4a2e'; rr(ctx, W / 2 - 170, fy - 110, 340, 60, 10); ctx.fill();
    ctx.fillStyle = '#f6e7c8'; rr(ctx, W / 2 - 180, fy - 56, 360, 70, 10); ctx.fill();
    // crochet blanket granny squares
    const c = ['#ff8fb1', '#ffc94a', '#7fd8a6', '#c9a0dc'];
    for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = c[(i + j) % 4]; ctx.fillRect(W / 2 - 170 + i * 38, fy - 40 + j * 26, 34, 22);
    }
    ctx.fillStyle = '#4a2f2a'; ctx.beginPath(); ctx.moveTo(W / 2 + 40, fy - 40); ctx.lineTo(W / 2 + 70, fy + 8); ctx.lineTo(W / 2 + 54, fy - 8); ctx.closePath(); ctx.fill();
    // sock pile
    for (let i = 0; i < 7; i++) { ctx.fillStyle = c[i % 4]; rr(ctx, W / 2 - 60 + i * 18, fy + 70 - (i % 3) * 8, 26, 10, 5); ctx.fill(); }
  },
  guest(ctx, W, H, fy, t) {
    ctx.fillStyle = '#e8f8ff'; rr(ctx, W / 2 - 150, fy - 50, 300, 70, 30); ctx.fill();
    ctx.fillStyle = '#9fd3f5'; ctx.fillRect(W / 2 - 134, fy - 46, 268, 16);
    ctx.strokeStyle = '#8d95a3'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(W / 2 + 230, 0); ctx.lineTo(W / 2 + 230, fy - 120); ctx.lineTo(W / 2 + 120, fy - 120); ctx.lineTo(W / 2 + 120, fy - 60); ctx.stroke();
    for (let i = 0; i < 5; i++) { // drips
      const x = W / 2 - 200 + i * 100, y = ((t * 160 + i * 70) % (fy + 40));
      ctx.fillStyle = '#9fd3f5'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.moveTo(x - 4, y); ctx.lineTo(x, y - 9); ctx.lineTo(x + 4, y); ctx.fill();
    }
    // flood water + ducks
    ctx.fillStyle = 'rgba(79,143,179,0.45)'; ctx.fillRect(0, fy + 70 + Math.sin(t * 2) * 3, W, H);
    for (let i = 0; i < 6; i++) duck(ctx, W / 2 - 220 + i * 90 + Math.sin(t + i) * 8, fy + 70 + Math.sin(t * 2 + i) * 3);
  },
};

function bug(ctx, x, y, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = '#10131f'; ctx.lineWidth = 1.5;
  for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-6, k * 4); ctx.lineTo(6, k * 4 + 2); ctx.stroke(); }
  ctx.fillStyle = '#3fa874'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#10131f'; ctx.beginPath(); ctx.arc(6, 0, 3, 0, TAU); ctx.fill();
  ctx.restore();
}
function bunny(ctx, x, y) {
  ctx.fillStyle = '#d9d2c5';
  ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.arc(x + 10, y - 8, 8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 8, y - 22, 3, 9, -0.2, 0, TAU); ctx.ellipse(x + 14, y - 21, 3, 9, 0.2, 0, TAU); ctx.fill();
  ctx.fillStyle = '#10131f'; ctx.beginPath(); ctx.arc(x + 13, y - 9, 1.6, 0, TAU); ctx.fill();
}
function duck(ctx, x, y) {
  ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(x, y, 13, 8, 0, 0, TAU); ctx.arc(x + 9, y - 9, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f29f2e'; ctx.beginPath(); ctx.moveTo(x + 15, y - 10); ctx.lineTo(x + 22, y - 8); ctx.lineTo(x + 15, y - 6); ctx.fill();
  ctx.fillStyle = '#10131f'; ctx.beginPath(); ctx.arc(x + 11, y - 11, 1.5, 0, TAU); ctx.fill();
}

// ------------------------------------------------------------ exteriors
function sky(ctx, W, H, night) {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.7);
  if (night) { g.addColorStop(0, '#1b2238'); g.addColorStop(0.6, '#5b3f6e'); g.addColorStop(1, '#f29f6e'); }
  else { g.addColorStop(0, '#5aa4e6'); g.addColorStop(1, '#cfe9f7'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (night) { const r = rand(3); ctx.fillStyle = 'rgba(255,246,229,0.8)'; for (let i = 0; i < 40; i++) ctx.fillRect(r() * W, r() * H * 0.4, 1.5, 1.5); }
}

/** The house exterior. night = dusk + lit windows; party = guests' cars, music notes. Also used by the title. */
export function house(ctx, W, H, t, night, party = false) {
  sky(ctx, W, H, night);
  const gy = H * 0.72;
  // trees
  ctx.fillStyle = night ? '#24402e' : '#3f7a4a';
  for (const [x, r] of [[90, 70], [170, 50], [820, 80], [900, 56]]) { ctx.beginPath(); ctx.arc(x, gy - r, r, 0, TAU); ctx.fill(); }
  // lawn
  ctx.fillStyle = night ? '#2e5236' : '#6fae5a'; ctx.fillRect(0, gy, W, H - gy);
  // house body
  const hx = W / 2 - 190, hw = 380, hy = gy - 200;
  ctx.fillStyle = night ? '#8a6a5a' : '#e9d3b0'; ctx.fillRect(hx, hy, hw, 200);
  ctx.fillStyle = night ? '#4a2f2a' : '#a8483a';
  ctx.beginPath(); ctx.moveTo(hx - 30, hy + 4); ctx.lineTo(W / 2, hy - 110); ctx.lineTo(hx + hw + 30, hy + 4); ctx.closePath(); ctx.fill();
  // chimney
  ctx.fillRect(hx + hw - 90, hy - 90, 30, 60);
  // windows
  const lit = night ? '#ffd58a' : '#9fd3f5';
  for (const [x, y] of [[hx + 40, hy + 40], [hx + hw - 110, hy + 40], [hx + 40, hy + 120], [hx + hw - 110, hy + 120], [W / 2 - 35, hy - 50]]) {
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x - 5, y - 5, 80, 60);
    ctx.fillStyle = lit; ctx.fillRect(x, y, 70, 50);
    if (night) glow(ctx, x + 35, y + 25, 70, '#ffd58a', 0.35);
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x + 33, y, 4, 50); ctx.fillRect(x, y + 23, 70, 4);
  }
  // door
  ctx.fillStyle = '#5a3a2a'; rr(ctx, W / 2 - 30, gy - 92, 60, 92, 6); ctx.fill();
  ctx.fillStyle = PALETTE.sun; ctx.beginPath(); ctx.arc(W / 2 + 18, gy - 46, 4, 0, TAU); ctx.fill();
  // path
  ctx.fillStyle = night ? '#6e5a4a' : '#d9c5a0';
  ctx.beginPath(); ctx.moveTo(W / 2 - 30, gy); ctx.lineTo(W / 2 + 30, gy); ctx.lineTo(W / 2 + 70, H); ctx.lineTo(W / 2 - 70, H); ctx.closePath(); ctx.fill();
  if (night) partyLights(ctx, hx - 30, hy + 4, hx + hw + 30, hy + 4, t, 14);
  if (party) {
    for (let i = 0; i < 6; i++) {
      const x = W / 2 - 160 + i * 64 + Math.sin(t + i) * 6, y = hy - 30 - ((t * 30 + i * 40) % 140);
      ctx.fillStyle = `rgba(255,201,74,${0.9 - ((t * 30 + i * 40) % 140) / 160})`;
      ctx.font = 'bold 20px serif'; ctx.textAlign = 'center'; ctx.fillText(i % 2 ? '♪' : '♫', x, y);
    }
  }
  vignette(ctx, W, H);
}

/** A string of warm bulbs sagging between two points. Exported for the title screen. */
export function partyLights(ctx, x1, y1, x2, y2, t, n = 12) {
  const cols = ['#ffc94a', '#ff8fb1', '#7fd8a6', '#5aa4e6', '#f29f2e'];
  ctx.strokeStyle = 'rgba(16,19,31,0.7)'; ctx.lineWidth = 1.5;
  const pt = (k) => { const u = k / n; return [x1 + (x2 - x1) * u, y1 + (y2 - y1) * u + Math.sin(u * Math.PI) * 26]; };
  ctx.beginPath(); for (let k = 0; k <= n; k++) { const [x, y] = pt(k); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  for (let k = 1; k < n; k++) {
    const [x, y] = pt(k);
    const on = 0.65 + 0.35 * Math.sin(t * 3 + k * 1.3);
    glow(ctx, x, y + 6, 18, cols[k % 5], 0.45 * on);
    ctx.fillStyle = cols[k % 5]; ctx.globalAlpha = on; ctx.beginPath(); ctx.arc(x, y + 6, 4.5, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
}

function backyard(ctx, W, H, t) {
  sky(ctx, W, H, false);
  const gy = H * 0.6;
  ctx.fillStyle = '#c99a5b'; for (let x = 0; x < W; x += 34) { ctx.fillRect(x, gy - 90, 26, 90); }
  ctx.fillStyle = '#4f8a3f'; ctx.fillRect(0, gy, W, H - gy);
  // jungle vines over the fence
  ctx.strokeStyle = '#2f6a35'; ctx.lineWidth = 6;
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 130, gy - 90); ctx.quadraticCurveTo(i * 130 + 40, gy - 40 + Math.sin(t + i) * 10, i * 130 + 20, gy + 10); ctx.stroke(); }
  partyLights(ctx, 140, 70, 820, 70, t, 16);
  // grill dragon
  const gx = W / 2 + 150, gyy = gy + 40;
  ctx.fillStyle = '#2a2f3d'; ctx.beginPath(); ctx.ellipse(gx, gyy, 40, 26, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(gx - 40, gyy, 80, 8);
  ctx.fillRect(gx - 30, gyy + 8, 6, 40); ctx.fillRect(gx + 24, gyy + 8, 6, 40);
  ctx.fillStyle = '#ff5d5d'; ctx.beginPath(); ctx.arc(gx - 16, gyy - 14, 4, 0, TAU); ctx.arc(gx + 4, gyy - 14, 4, 0, TAU); ctx.fill();
  glow(ctx, gx - 60, gyy - 10, 40 + Math.sin(t * 6) * 6, '#f29f2e', 0.5);
  // gnomes
  for (let i = 0; i < 5; i++) gnome(ctx, W / 2 - 230 + i * 50, gy + 80 + (i % 2) * 6 - Math.abs(Math.sin(t * 4 + i)) * 4);
  vignette(ctx, W, H);
}
function gnome(ctx, x, y) {
  ctx.fillStyle = '#5b7fa6'; rr(ctx, x - 10, y - 20, 20, 22, 6); ctx.fill();
  ctx.fillStyle = '#f4cdb0'; ctx.beginPath(); ctx.arc(x, y - 24, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff6e5'; ctx.beginPath(); ctx.moveTo(x - 7, y - 22); ctx.lineTo(x + 7, y - 22); ctx.lineTo(x, y - 8); ctx.fill();
  ctx.fillStyle = '#a8483a'; ctx.beginPath(); ctx.moveTo(x - 9, y - 27); ctx.lineTo(x + 9, y - 27); ctx.lineTo(x + 2, y - 50); ctx.fill();
}

function pond(ctx, W, H, t) {
  sky(ctx, W, H, true);
  const gy = H * 0.55;
  ctx.fillStyle = '#24402e'; ctx.fillRect(0, gy, W, H - gy);
  partyLights(ctx, 60, 60, 900, 60, t, 18);
  // pond
  ctx.fillStyle = '#1b3a4f'; ctx.beginPath(); ctx.ellipse(W / 2, gy + 110, 330, 90, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(111,183,232,0.5)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const r = ((t * 30 + i * 40) % 120); ctx.globalAlpha = 1 - r / 120; ctx.beginPath(); ctx.ellipse(W / 2, gy + 110, r * 2.4, r * 0.6, 0, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // the code koi (made of glowing glyphs)
  const kx = W / 2 + Math.sin(t * 0.7) * 80, ky = gy + 100 + Math.sin(t * 1.3) * 8;
  glow(ctx, kx, ky, 140, '#7fd8a6', 0.35);
  ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
  const glyphs = '{}();=><01fn';
  for (let i = 0; i < 26; i++) {
    const u = i / 25, bx = kx - 110 + u * 220, by = ky + Math.sin(u * Math.PI * 2 + t * 4) * 8 * (1 - u);
    const thick = Math.sin(u * Math.PI) * 22 + 4;
    for (let j = -1; j <= 1; j++) {
      ctx.fillStyle = j ? 'rgba(127,216,166,0.75)' : 'rgba(255,201,74,0.9)';
      ctx.fillText(glyphs[(i * 3 + j + 1 + Math.floor(t * 6)) % glyphs.length], bx, by + j * thick * 0.5);
    }
  }
  ctx.fillStyle = '#ff5d5d'; ctx.beginPath(); ctx.arc(kx + 96, ky - 4, 4, 0, TAU); ctx.fill();
  vignette(ctx, W, H);
}

// ------------------------------------------------------------ helpers
function glow(ctx, x, y, r, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(col, a)); g.addColorStop(1, hexA(col, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function vignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(16,19,31,0)'); g.addColorStop(1, 'rgba(16,19,31,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function hexA(hex, a) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
function mix(a, b, k) {
  const p = (c) => { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
}
export { glow, hexA };
