// Canvas art for Drumline (backyard field, gnomes, string lights, marching snare). Owned by: games-d.
import { PALETTE } from '../../core/theme.js';
import { RAVENS } from './common.js';

const TAU = Math.PI * 2;
let bgCache = null;

/** Dusk backyard as a marching field. Drawn once into an offscreen canvas (w x h). */
export function drawBackyard(ctx, w, h) {
  if (!bgCache || bgCache.width !== w) {
    bgCache = document.createElement('canvas'); bgCache.width = w; bgCache.height = h;
    const c = bgCache.getContext('2d');
    const sky = c.createLinearGradient(0, 0, 0, 240);
    sky.addColorStop(0, '#2b2350'); sky.addColorStop(0.55, '#8a4f7a'); sky.addColorStop(1, '#f2a65a');
    c.fillStyle = sky; c.fillRect(0, 0, w, 260);
    // sun setting
    c.fillStyle = 'rgba(255,201,74,0.85)'; c.beginPath(); c.arc(140, 232, 46, 0, TAU); c.fill();
    // distant trees
    c.fillStyle = '#2d4a3a';
    for (let i = 0; i < 18; i++) { const x = i * 58 - 10, r = 34 + ((i * 37) % 19); c.beginPath(); c.arc(x, 236 - (i % 3) * 6, r, 0, TAU); c.fill(); }
    // fence
    c.fillStyle = '#c9a77a';
    c.fillRect(0, 222, w, 8); c.fillRect(0, 246, w, 6);
    for (let x = 4; x < w; x += 22) { c.beginPath(); c.moveTo(x, 262); c.lineTo(x, 214); c.lineTo(x + 8, 206); c.lineTo(x + 16, 214); c.lineTo(x + 16, 262); c.fill(); }
    c.fillStyle = 'rgba(90,58,42,0.35)';
    for (let x = 4; x < w; x += 22) c.fillRect(x + 12, 214, 4, 48);
    // lawn
    const g = c.createLinearGradient(0, 258, 0, h);
    g.addColorStop(0, '#4f8a4a'); g.addColorStop(1, '#2f6a3a');
    c.fillStyle = g; c.fillRect(0, 258, w, h - 258);
    // mowed stripes + yard lines (marching field nod)
    for (let i = 0; i < 9; i++) {
      const y0 = 258 + Math.pow(i / 9, 1.4) * (h - 258), y1 = 258 + Math.pow((i + 1) / 9, 1.4) * (h - 258);
      if (i % 2) { c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(0, y0, w, y1 - y0); }
      c.strokeStyle = 'rgba(255,246,229,0.35)'; c.lineWidth = 1 + i * 0.25;
      c.beginPath(); c.moveTo(0, y1); c.lineTo(w, y1); c.stroke();
    }
    // flower beds and a hedge corner
    for (let i = 0; i < 26; i++) {
      const x = (i * 97) % w, y = 268 + ((i * 53) % 18);
      c.fillStyle = ['#e98aa8', PALETTE.sun, PALETTE.paper, '#c9a0dc'][i % 4];
      c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill();
    }
  }
  ctx.drawImage(bgCache, 0, 0);
}

/** A string of party lights between (x0,y0) and (x1,y1). lit 0..1 = fraction of bulbs on. */
export function drawLights(ctx, x0, y0, x1, y1, lit, t, n = 18, sag = 34) {
  ctx.save();
  ctx.strokeStyle = '#1f1a26'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); ctx.stroke();
  const cols = [PALETTE.sun, '#e98aa8', PALETTE.mint, RAVENS.purpleLite, PALETTE.sky];
  const on = Math.round(lit * n);
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n;
    const x = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * ((x0 + x1) / 2) + k * k * x1;
    const y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * ((y0 + y1) / 2 + sag * 2) + k * k * y1;
    const col = cols[i % cols.length];
    if (i < on) {
      const tw = 0.75 + 0.25 * Math.sin(t * 4 + i * 1.7);
      ctx.globalAlpha = 0.35 * tw; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y + 6, 11, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = i < on ? col : '#3a3540';
    ctx.beginPath(); ctx.ellipse(x, y + 6, 3.6, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a2530'; ctx.fillRect(x - 2, y, 4, 3);
  }
  ctx.restore();
}

/**
 * Garden gnome with feet at (x, y). o: { s scale, band 0..1 (marching uniform blend), step -1..1 leg phase,
 *   angry bool, face ±1, hue variant 0..3, hop px }
 */
export function drawGnome(ctx, x, y, o = {}) {
  const s = o.s ?? 1, band = o.band ?? 0, step = o.step ?? 0, face = o.face ?? 1;
  const hats = ['#d8463a', '#c23b5a', '#e0663a', '#b8343a'];
  ctx.save();
  ctx.translate(x, y - (o.hop ?? 0)); ctx.scale(s * face, s);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 4, 0, 0, TAU); ctx.fill();
  // legs (marching step)
  const la = Math.max(0, step) * 5, lb = Math.max(0, -step) * 5;
  ctx.fillStyle = '#3a2a1f';
  ctx.fillRect(-7, -9 - la, 6, 9); ctx.fillRect(1, -9 - lb, 6, 9);
  ctx.fillStyle = '#2a1d15';
  ctx.fillRect(-8, -3 - la, 8, 3); ctx.fillRect(1, -3 - lb, 8, 3);
  // body: blue tunic -> purple band jacket with gold sash
  ctx.fillStyle = band > 0.5 ? RAVENS.purple : '#3f6fa8';
  ctx.beginPath(); ctx.moveTo(-11, -8); ctx.lineTo(11, -8); ctx.lineTo(8, -26); ctx.lineTo(-8, -26); ctx.closePath(); ctx.fill();
  if (band > 0.5) {
    ctx.strokeStyle = RAVENS.gold; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-8, -25); ctx.lineTo(8, -10); ctx.stroke();
    ctx.fillStyle = RAVENS.gold; ctx.fillRect(-10, -12, 20, 2);
  }
  // belt
  ctx.fillStyle = '#2a1d15'; ctx.fillRect(-10, -13, 20, 3);
  // beard
  ctx.fillStyle = '#f4efe6';
  ctx.beginPath(); ctx.moveTo(-8, -30); ctx.quadraticCurveTo(0, -12, 8, -30); ctx.closePath(); ctx.fill();
  // face
  ctx.fillStyle = '#f2c7a5'; ctx.beginPath(); ctx.arc(0, -32, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e8907a'; ctx.beginPath(); ctx.arc(1.5, -30.5, 2.4, 0, TAU); ctx.fill(); // nose
  ctx.fillStyle = PALETTE.ink;
  if (o.angry) {
    ctx.fillRect(-4, -35, 2, 2); ctx.fillRect(3, -35, 2, 2);
    ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-5, -38); ctx.lineTo(-1, -36.5); ctx.moveTo(6, -38); ctx.lineTo(2, -36.5); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(-2.5, -34, 1.1, 0, TAU); ctx.arc(3.5, -34, 1.1, 0, TAU); ctx.fill();
  }
  // hat: pointy red cap -> purple shako with gold plume
  if (band > 0.5) {
    ctx.fillStyle = RAVENS.black; ctx.fillRect(-7, -50, 14, 13);
    ctx.fillStyle = RAVENS.gold; ctx.fillRect(-7, -40, 14, 2.5); ctx.fillRect(-1.5, -48, 3, 5);
    ctx.fillStyle = RAVENS.purpleLite;
    ctx.beginPath(); ctx.ellipse(0, -55, 3.2, 7, 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = PALETTE.paper; ctx.beginPath(); ctx.ellipse(0.6, -58, 1.5, 3.5, 0.15, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = hats[(o.hue ?? 0) % 4];
    ctx.beginPath(); ctx.moveTo(-8, -36); ctx.quadraticCurveTo(-2, -50, 6 + Math.sin((o.t ?? 0) * 6) * 2, -60); ctx.lineTo(8, -36); ctx.closePath(); ctx.fill();
  }
  // arms: rampaging = shaking fist with a tiny rake; band = tiny drum + sticks
  if (band > 0.5) {
    ctx.fillStyle = PALETTE.paper; ctx.strokeStyle = RAVENS.gold; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, -10, 8, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = RAVENS.purple; ctx.fillRect(-8, -10, 16, 6); ctx.strokeRect(-8, -10, 16, 6);
    ctx.strokeStyle = '#d9b48a'; ctx.lineWidth = 1.6;
    const sa = Math.max(0, step) * 0.7, sb = Math.max(0, -step) * 0.7;
    ctx.beginPath(); ctx.moveTo(-6, -18); ctx.lineTo(-3 - sa * 4, -10 - sa * 10);
    ctx.moveTo(6, -18); ctx.lineTo(3 + sb * 4, -10 - sb * 10); ctx.stroke();
  } else {
    ctx.strokeStyle = '#3f6fa8'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    const shake = o.angry ? Math.sin((o.t ?? 0) * 22) * 3 : 0;
    ctx.beginPath(); ctx.moveTo(8, -22); ctx.lineTo(15, -30 + shake); ctx.stroke();
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(15, -18 + shake); ctx.lineTo(15, -44 + shake); ctx.stroke();
    ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(15 + i * 2, -44 + shake); ctx.lineTo(15 + i * 2, -48 + shake); } ctx.stroke();
  }
  ctx.restore();
}

/** Marching snare carried at (x,y) (center of the drum head). hit 0..1 recent-hit flash. */
export function drawSnare(ctx, x, y, s = 1, hit = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = RAVENS.purple; ctx.fillRect(-22, 0, 44, 18);
  ctx.strokeStyle = RAVENS.gold; ctx.lineWidth = 2;
  for (let i = -22; i < 22; i += 8) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 8, 18); ctx.stroke(); }
  ctx.fillStyle = RAVENS.gold; ctx.fillRect(-23, -2, 46, 4); ctx.fillRect(-23, 16, 46, 4);
  ctx.fillStyle = hit > 0 ? `rgba(255,246,229,${0.8 + 0.2 * hit})` : '#efe6d2';
  ctx.beginPath(); ctx.ellipse(0, -1, 22, 6, 0, 0, TAU); ctx.fill();
  if (hit > 0) { ctx.strokeStyle = `rgba(255,217,106,${hit})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -1, 22 + 8 * (1 - hit), 6 + 3 * (1 - hit), 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
}

/** Drum-head note gem centered at (x,y). */
export function drawNoteGem(ctx, x, y, color, rim, w = 56, alpha = 1, glow = 0) {
  ctx.save(); ctx.globalAlpha = alpha;
  if (glow > 0) { ctx.fillStyle = `rgba(255,217,106,${0.35 * glow})`; ctx.beginPath(); ctx.ellipse(x, y, w * 0.62, 18, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 4, w / 2, 11, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rim; ctx.beginPath(); ctx.ellipse(x, y, w / 2, 12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y - 1.5, w / 2 - 4, 8.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(x - w * 0.12, y - 4, w * 0.16, 2.6, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
