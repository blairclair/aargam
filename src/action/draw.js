// Action drawing: gameplay overlays + simple fallbacks for anything art hasn't shipped yet
// (room interiors, furniture kinds, v2 enemies, v2 projectiles). Owned by: action team.
import { PALETTE } from '../core/theme.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- room fallback
const FLOORS = {
  wood: { base: '#b98a5e', line: '#a3764d', wall: '#efe2c8', trim: '#8a6a4a' },
  tile: { base: '#e8e2d6', line: '#cfc6b6', wall: '#dfeee9', trim: '#9aa8a3' },
  carpet: { base: '#c7b3c9', line: '#b9a4bb', wall: '#f3e1e8', trim: '#9b7f9d' },
  grass: { base: '#7aa35a', line: '#6c944f', wall: '#a77b52', trim: '#7a5536' },
};

/** Floor + back wall + side walls. Called in WORLD space (after camera translate). */
export function drawRoomFallback(ctx, A, accent, t) {
  const F = FLOORS[A.floor] ?? FLOORS.wood;
  ctx.save();
  ctx.fillStyle = PALETTE.ink; ctx.fillRect(-400, -400, A.w + 800, A.h + 800);
  ctx.fillStyle = F.base; ctx.fillRect(0, A.wallH - 20, A.w, A.h - A.wallH + 20);
  ctx.strokeStyle = F.line; ctx.lineWidth = 2;
  if (A.floor === 'wood') {
    for (let y = A.wallH; y < A.h; y += 28) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(A.w, y); ctx.stroke();
      for (let x = ((y / 28) % 2) * 90; x < A.w; x += 180) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 28); ctx.stroke(); }
    }
  } else if (A.floor === 'tile') {
    for (let y = A.wallH; y < A.h; y += 56) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(A.w, y); ctx.stroke(); }
    for (let x = 0; x < A.w; x += 56) { ctx.beginPath(); ctx.moveTo(x, A.wallH); ctx.lineTo(x, A.h); ctx.stroke(); }
  } else if (A.floor === 'carpet') {
    ctx.fillStyle = F.line;
    for (let y = A.wallH + 10; y < A.h; y += 22) for (let x = (y % 44 ? 0 : 11); x < A.w; x += 22) ctx.fillRect(x, y, 2, 2);
  } else {
    ctx.fillStyle = F.line;
    for (let i = 0; i < 400; i++) { const x = (i * 197) % A.w, y = A.wallH + ((i * 131) % (A.h - A.wallH)); ctx.fillRect(x, y, 2, 6); }
  }
  // back wall
  if (A.outdoor) {
    // wooden fence
    ctx.fillStyle = '#9ec7e6'; ctx.fillRect(0, -400, A.w, A.wallH + 380);
    ctx.fillStyle = F.wall;
    for (let x = 0; x < A.w; x += 34) { ctx.fillRect(x + 2, A.wallH - 90, 30, 92); ctx.beginPath(); ctx.moveTo(x + 2, A.wallH - 90); ctx.lineTo(x + 17, A.wallH - 102); ctx.lineTo(x + 32, A.wallH - 90); ctx.fill(); }
    ctx.fillStyle = F.trim; ctx.fillRect(0, A.wallH - 70, A.w, 8); ctx.fillRect(0, A.wallH - 30, A.w, 8);
  } else {
    ctx.fillStyle = F.wall; ctx.fillRect(0, -400, A.w, A.wallH + 380);
    // wallpaper stripes in the room accent
    ctx.globalAlpha = 0.18; ctx.fillStyle = accent;
    for (let x = 0; x < A.w; x += 48) ctx.fillRect(x, -400, 18, A.wallH + 380);
    ctx.globalAlpha = 1;
    ctx.fillStyle = F.trim; ctx.fillRect(0, A.wallH - 22, A.w, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, A.wallH - 8, A.w, 8);
    // a window with warm light
    for (const wx of [A.w * 0.22, A.w * 0.78]) {
      ctx.fillStyle = F.trim; ctx.fillRect(wx - 46, 22, 92, 70);
      ctx.fillStyle = '#9ec7e6'; ctx.fillRect(wx - 40, 28, 80, 58);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(wx - 40, 28, 80, 10);
      ctx.fillStyle = F.trim; ctx.fillRect(wx - 2, 28, 4, 58); ctx.fillRect(wx - 40, 55, 80, 3);
    }
  }
  // side walls
  ctx.fillStyle = A.outdoor ? '#5f8a45' : F.trim;
  ctx.fillRect(0, A.wallH - 22, 22, A.h); ctx.fillRect(A.w - 22, A.wallH - 22, 22, A.h);
  ctx.fillRect(0, A.h - 14, A.w, 14);
  ctx.restore();
}

// ---------------------------------------------------------------- furniture fallback
const LOOK = {
  desk: ['#a87a4f', '#8a5f3a'], office_chair: ['#3a3f55', '#2b2f3a'], bookshelf: ['#8a5f3a', '#6e4a2c'], server_rack: ['#3a3f55', '#23263a'],
  counter: ['#f4efe6', '#c9a77a'], island: ['#f4efe6', '#9a7350'], oven: ['#cfd5dd', '#5a5f6e'], fridge: ['#eef2f5', '#c8d0dc'],
  sofa: ['#8f7bb5', '#6f5c94'], armchair: ['#8f7bb5', '#6f5c94'], coffee_table: ['#a87a4f', '#8a5f3a'], tv_stand: ['#5a3a2a', '#3e2a1f'],
  dining_table: ['#b07d52', '#8a5f3a'], sideboard: ['#8a5f3a', '#6e4a2c'], toy_box: ['#ff8f5a', '#d9653a'], play_table: ['#5aa4e6', '#3f80bd'],
  bed: ['#fff6e5', '#c9a0dc'], dresser: ['#a87a4f', '#8a5f3a'], nightstand: ['#a87a4f', '#8a5f3a'], guest_bed: ['#e8f0f5', '#4f8fb3'],
  bathtub: ['#fbfbfb', '#d9dde3'], sink: ['#fbfbfb', '#c8d0dc'], grill: ['#3a3a44', '#23232b'], hedge: ['#4f8a4a', '#3f7a3a'],
  rug: ['#c46a5a', '#c46a5a'],
};

/** Box furniture: footprint (w × d) at front-center (x,y), height h. */
function box(ctx, x, y, w, d, h, top, front) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x - w / 2 + 4, y - 4, w, 8);
  ctx.fillStyle = front; ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = top; ctx.fillRect(x - w / 2, y - h - d * 0.6, w, d * 0.6);
  ctx.strokeStyle = 'rgba(16,19,31,0.35)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(x - w / 2, y - h - d * 0.6, w, h + d * 0.6);
}

export function drawFurnitureFallback(ctx, p, t, game) {
  const [top, front] = LOOK[p.kind] ?? ['#b98a5e', '#8a6a4a'];
  const { x, y } = p;
  ctx.save();
  switch (p.kind) {
    case 'rug': {
      ctx.fillStyle = top; ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.ellipse(x, y - p.d / 2, p.w / 2, p.d / 2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.ellipse(x, y - p.d / 2, p.w / 2 - 12, p.d / 2 - 10, 0, 0, TAU); ctx.stroke();
      break;
    }
    case 'plant': case 'tree': {
      const big = p.kind === 'tree';
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, big ? 30 : 16, big ? 9 : 5, 0, 0, TAU); ctx.fill();
      if (!big) { ctx.fillStyle = '#c46a3a'; ctx.fillRect(x - 11, y - 18, 22, 18); }
      else { ctx.fillStyle = '#6e4a2c'; ctx.fillRect(x - 7, y - 40, 14, 40); }
      ctx.fillStyle = big ? '#3f7a4a' : '#4f9a5a';
      const s = big ? 34 : 16, cy = y - (big ? 70 : 32);
      for (let i = 0; i < 5; i++) { const a = i * 1.26 + Math.sin(t + x) * 0.05; ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.5, cy + Math.sin(a) * s * 0.4, s * 0.6, 0, TAU); ctx.fill(); }
      break;
    }
    case 'light_post': {
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x, y, 12, 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a3a44'; ctx.fillRect(x - 3, y - 80, 6, 80);
      const lit = p.done ? 1 : p.lit ?? 0;
      ctx.fillStyle = lit >= 1 ? PALETTE.sun : '#6a6a74';
      if (lit >= 1) { ctx.globalAlpha = 0.35 + Math.sin(t * 4) * 0.1; ctx.beginPath(); ctx.arc(x, y - 84, 26, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.beginPath(); ctx.arc(x, y - 84, 9, 0, TAU); ctx.fill();
      // a string of bulbs filling up
      const n = 7;
      for (let i = 0; i < n; i++) {
        const on = i / n < lit;
        ctx.fillStyle = on ? ['#ffc94a', '#ff8fb1', '#7fd8a6', '#5aa4e6'][i % 4] : '#55555f';
        ctx.beginPath(); ctx.arc(x - 30 + i * 10, y - 64 + Math.sin(i / (n - 1) * Math.PI) * 8, 3, 0, TAU); ctx.fill();
      }
      break;
    }
    case 'patio_table': case 'rock': case 'block_tower': case 'laundry_basket': case 'starter_jar': case 'reeds': {
      const r = p.r;
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x, y, r + 4, (r + 4) * 0.35, 0, 0, TAU); ctx.fill();
      if (p.kind === 'rock') { ctx.fillStyle = '#8a8f99'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.5, r, r * 0.7, 0, 0, TAU); ctx.fill(); }
      else if (p.kind === 'reeds') { ctx.strokeStyle = '#4f7a3a'; ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 5, y); ctx.lineTo(x + i * 7 + Math.sin(t * 2 + i) * 3, y - 30 - Math.abs(i) * 3); ctx.stroke(); } }
      else if (p.kind === 'patio_table') { ctx.fillStyle = '#6e7a84'; ctx.fillRect(x - 3, y - 28, 6, 28); ctx.fillStyle = '#e8e2d6'; ctx.beginPath(); ctx.ellipse(x, y - 30, r, r * 0.45, 0, 0, TAU); ctx.fill(); }
      else if (p.kind === 'block_tower') { const c = ['#ff5d5d', '#ffc94a', '#5aa4e6', '#7fd8a6']; for (let i = 0; i < 4; i++) { ctx.fillStyle = c[i]; ctx.fillRect(x - 14 + (i % 2) * 4, y - 12 - i * 12, 24, 12); } }
      else if (p.kind === 'laundry_basket') { ctx.fillStyle = '#d9c39a'; ctx.fillRect(x - r, y - 24, r * 2, 24); ctx.fillStyle = '#ff8fb1'; ctx.beginPath(); ctx.arc(x - 6, y - 26, 8, 0, TAU); ctx.arc(x + 7, y - 28, 7, 0, TAU); ctx.fill(); }
      else { // starter jar: a bubbling sourdough starter
        ctx.fillStyle = 'rgba(220,235,240,0.85)'; ctx.fillRect(x - 18, y - 46, 36, 46);
        ctx.fillStyle = '#f3dcae'; const bub = Math.sin(t * 3) * 3; ctx.fillRect(x - 16, y - 30 - bub, 32, 30 + bub);
        ctx.beginPath(); ctx.arc(x, y - 30 - bub, 16, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x - 20, y - 50, 40, 6);
      }
      break;
    }
    case 'lily_pad': ctx.fillStyle = '#5f9a4a'; ctx.beginPath(); ctx.ellipse(x, y, 18, 8, 0, 0.3, TAU - 0.3); ctx.lineTo(x, y); ctx.fill(); break;
    default: {
      const w = p.w ?? 40, d = p.d ?? 30, h = p.h ?? 30;
      box(ctx, x, y, w, d, h, top, front);
      // a few identifying details
      if (p.kind === 'desk' && p.laptop) {
        ctx.fillStyle = '#2b2f3a'; ctx.fillRect(x - 22, y - h - d * 0.6 - 26, 44, 28);
        ctx.fillStyle = Math.sin(t * 9) > 0.6 ? PALETTE.danger : PALETTE.mint; ctx.fillRect(x - 19, y - h - d * 0.6 - 23, 38, 22);
        ctx.fillStyle = '#c8d0dc'; ctx.fillRect(x - 26, y - h - d * 0.6 + 1, 52, 5);
      } else if (p.kind === 'oven') {
        ctx.fillStyle = '#2b2f3a'; ctx.fillRect(x - 24, y - h + 12, 48, 26);
        ctx.fillStyle = 'rgba(255,140,60,0.6)'; ctx.fillRect(x - 20, y - h + 16, 40, 18);
      } else if (p.kind === 'fridge') { ctx.fillStyle = '#8a95a3'; ctx.fillRect(x + 22, y - h + 18, 4, 30); ctx.fillRect(x + 22, y - h + 60, 4, 30); }
      else if (p.kind === 'tv_stand') { ctx.fillStyle = '#10131f'; ctx.fillRect(x - 60, y - h - 70, 120, 66); ctx.fillStyle = '#2b3550'; ctx.fillRect(x - 55, y - h - 65, 110, 56); }
      else if (p.kind === 'bookshelf') { const c = ['#a8483a', '#4f8fb3', '#ffc94a', '#7fd8a6', '#c9a0dc']; for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) { ctx.fillStyle = c[(i + r) % 5]; ctx.fillRect(x - w / 2 + 6 + i * (w - 12) / 8, y - h + 8 + r * 32, (w - 12) / 8 - 2, 26); } }
      else if (p.kind === 'server_rack') { for (let i = 0; i < 6; i++) { ctx.fillStyle = (Math.sin(t * 5 + i * 2) > 0) ? PALETTE.mint : PALETTE.danger; ctx.fillRect(x - 20, y - h + 10 + i * 14, 4, 4); } }
      else if (p.kind === 'sofa' || p.kind === 'armchair') { ctx.fillStyle = front; ctx.fillRect(x - w / 2, y - h - d * 0.6 - 18, w, 22); }
      else if (p.kind === 'bed' || p.kind === 'guest_bed') { ctx.fillStyle = '#fff'; ctx.fillRect(x - w / 2 + 10, y - h - d * 0.6 + 4, w - 20, 18); ctx.fillStyle = front; ctx.fillRect(x - w / 2, y - h - d * 0.6 + 30, w, d * 0.6 - 30); }
      else if (p.kind === 'grill') { ctx.fillStyle = '#ff6a3a'; ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.3; ctx.fillRect(x - 36, y - h - d * 0.6 + 4, 72, 6); }
      else if (p.kind === 'bathtub') { ctx.fillStyle = '#9ec7e6'; ctx.fillRect(x - w / 2 + 10, y - h - d * 0.6 + 6, w - 20, d * 0.6 - 4); }
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- enemy fallback
function eyes(c, x, y, s = 3, col = PALETTE.ink) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x - s, y, s, 0, TAU); c.arc(x + s, y, s, 0, TAU); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(x - s + 1, y, s * 0.5, 0, TAU); c.arc(x + s + 1, y, s * 0.5, 0, TAU); c.fill(); }

export function drawEnemyFallback(ctx, type, x, y, o, e) {
  const s = o.scale ?? 1, t = o.t ?? 0, col = e?.color ?? '#999';
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, (e?.z ?? 0), 14, 5, 0, 0, TAU); ctx.fill();
  const hurt = o.anim === 'hurt', atk = o.anim === 'attack';
  ctx.fillStyle = o.flash > 0 ? '#fff' : col;
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 2;
  const blob = (rx, ry, cy) => { ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, TAU); ctx.fill(); ctx.stroke(); };
  switch (type) {
    case 'beetle': blob(12, 9, -9); ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, -1); ctx.stroke(); eyes(ctx, 0, -14, 2.4); ctx.fillStyle = PALETTE.ink; ctx.font = 'bold 9px monospace'; ctx.fillText(';', -8, -5); break;
    case 'moth': { const f = Math.sin(t * 30) * 0.6; ctx.fillStyle = '#c9d4ff'; for (const sd of [-1, 1]) { ctx.save(); ctx.scale(sd, 1); ctx.rotate(f); ctx.beginPath(); ctx.ellipse(10, -16, 10, 7, 0.4, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); } ctx.fillStyle = '#7f88b0'; blob(5, 9, -14); eyes(ctx, 0, -18, 2); break; }
    case 'cable_spider': blob(14, 10, -12); for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 8, -10); ctx.lineTo(sd * (18 + i * 2), -16 + i * 6 + Math.sin(t * 10 + i) * 2); ctx.lineTo(sd * (20 + i * 2), -2); ctx.stroke(); } eyes(ctx, 0, -14, 3, PALETTE.danger); break;
    case 'dough_blob': { const sq = 1 + Math.sin(t * 6) * 0.08; ctx.fillStyle = o.flash > 0 ? '#fff' : '#f3dcae'; blob(17 * sq, 13 / sq, -13); eyes(ctx, 0, -16, 3); break; }
    case 'toaster': ctx.fillRect(-15, -32, 30, 30); ctx.strokeRect(-15, -32, 30, 30); ctx.fillStyle = '#d8a25a'; ctx.fillRect(-10, -38 - (atk ? 6 : 0), 8, 10); ctx.fillRect(2, -38 - (atk ? 6 : 0), 8, 10); eyes(ctx, 0, -18, 3); break;
    case 'kettle': blob(15, 14, -16); ctx.beginPath(); ctx.moveTo(12, -18); ctx.lineTo(24, -26); ctx.stroke(); ctx.fillStyle = '#333'; ctx.fillRect(-6, -34, 12, 5); eyes(ctx, 0, -18, 3); break;
    case 'flying_plate': ctx.save(); ctx.translate(0, -14); ctx.rotate(t * 12); ctx.fillStyle = '#fff6e5'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 13, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#e98aa8'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.stroke(); ctx.restore(); break;
    case 'chair': ctx.fillRect(-13, -22, 26, 6); ctx.fillRect(-13, -42, 5, 22); ctx.fillRect(8, -42, 5, 22); ctx.fillRect(-13, -44, 26, 6); ctx.fillRect(-12, -16, 4, 16); ctx.fillRect(8, -16, 4, 16); eyes(ctx, 0, -34, 3, atk ? PALETTE.danger : PALETTE.ink); break;
    case 'dust_bunny': ctx.fillStyle = '#b7aebf'; blob(10, 8, -8); ctx.beginPath(); ctx.ellipse(-4, -20, 3, 7, -0.2, 0, TAU); ctx.ellipse(4, -20, 3, 7, 0.2, 0, TAU); ctx.fill(); eyes(ctx, 0, -10, 2); break;
    case 'card_soldier': ctx.fillStyle = '#fff'; ctx.fillRect(-11, -38, 22, 30); ctx.strokeRect(-11, -38, 22, 30); ctx.fillStyle = (e?.seed ?? 0) % 2 ? PALETTE.danger : PALETTE.ink; ctx.font = 'bold 14px serif'; ctx.fillText((e?.seed ?? 0) % 2 ? '♥' : '♠', -6, -18); ctx.fillStyle = PALETTE.ink; ctx.fillRect(-6, -8, 3, 8); ctx.fillRect(3, -8, 3, 8); ctx.strokeStyle = '#999'; ctx.beginPath(); ctx.moveTo(11, -30); ctx.lineTo(18, -44); ctx.stroke(); break;
    case 'pawn': ctx.fillStyle = '#f3efe6'; ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.lineTo(7, -20); ctx.lineTo(-7, -20); ctx.closePath(); ctx.fill(); ctx.stroke(); blob(8, 8, -27); eyes(ctx, 0, -27, 2.4); break;
    case 'jack_box': ctx.fillStyle = '#5aa4e6'; ctx.fillRect(-16, -28, 32, 28); ctx.strokeRect(-16, -28, 32, 28); ctx.fillStyle = PALETTE.sun; ctx.font = 'bold 14px sans-serif'; ctx.fillText('?', -4, -9);
      if (e && e.state !== 'closed') { const up = e.state === 'wind' ? 10 : 34 + Math.sin(t * 12) * 5; ctx.strokeStyle = '#999'; ctx.beginPath(); for (let i = 0; i < 6; i++) ctx.lineTo((i % 2 ? 6 : -6), -28 - i * up / 6); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -32 - up, 10, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = PALETTE.danger; ctx.beginPath(); ctx.arc(0, -30 - up, 3, 0, TAU); ctx.fill(); eyes(ctx, 0, -36 - up, 2.4); }
      break;
    case 'lint': ctx.fillStyle = '#b9b6c8'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * 1.3 + t * 3) * 4, -9 + Math.sin(i * 1.3 + t * 3) * 4, 5, 0, TAU); ctx.fill(); } eyes(ctx, 0, -10, 1.8); break;
    case 'hanger': ctx.strokeStyle = '#d8dce4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, -14); ctx.lineTo(0, -26); ctx.lineTo(16, -14); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -30, 4, Math.PI, TAU * 0.9); ctx.stroke(); eyes(ctx, 0, -18, 2, atk ? PALETTE.danger : PALETTE.ink); break;
    case 'rubber_duck': ctx.fillStyle = '#ffd23f'; blob(11, 9, -9); blob(7, 7, -20); ctx.fillStyle = '#ff8a3d'; ctx.fillRect(5, -21, 7, 3); eyes(ctx, 0, -22, 1.8); break;
    case 'pipe_snake': ctx.strokeStyle = '#7e8a97'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i < 5; i++) ctx.lineTo(-20 + i * 9, -8 + Math.sin(t * 8 + i) * 5); ctx.stroke(); ctx.fillStyle = '#7e8a97'; ctx.beginPath(); ctx.arc(18, -10, 8, 0, TAU); ctx.fill(); eyes(ctx, 18, -12, 2, PALETTE.danger); break;
    case 'gnome': ctx.fillStyle = '#5a7fd6'; blob(10, 10, -10); ctx.fillStyle = '#f2c7a5'; ctx.beginPath(); ctx.arc(0, -24, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(6, -22); ctx.lineTo(0, -12); ctx.fill(); ctx.fillStyle = PALETTE.danger; ctx.beginPath(); ctx.moveTo(-8, -26); ctx.lineTo(8, -26); ctx.lineTo(0, -44); ctx.closePath(); ctx.fill(); if (e?.frozenLook) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-12, -44, 24, 44); } break;
    case 'vine': { ctx.strokeStyle = '#3f7a4a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 8, 0); ctx.quadraticCurveTo(i * 14 + Math.sin(t * 3 + i) * 8, -20, i * 6 + Math.sin(t * 2 + i) * 10, -38 - (atk ? 10 : 0)); ctx.stroke(); } ctx.fillStyle = '#5fa85a'; ctx.beginPath(); ctx.arc(0, -40, 7, 0, TAU); ctx.fill(); eyes(ctx, 0, -40, 2); break; }
    case 'code_fish': ctx.fillStyle = '#6fb7e8'; ctx.beginPath(); ctx.ellipse(0, -12, 15, 8, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-14, -12); ctx.lineTo(-24, -20); ctx.lineTo(-24, -4); ctx.closePath(); ctx.fill(); ctx.fillStyle = PALETTE.ink; ctx.font = 'bold 9px monospace'; ctx.fillText('01', -6, -9); eyes(ctx, 8, -14, 2); break;
    case 'roomba': { ctx.fillStyle = o.flash > 0 ? '#fff' : '#4a4f63'; ctx.beginPath(); ctx.ellipse(0, -14, 38, 24, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#6a7083'; ctx.beginPath(); ctx.ellipse(0, -22, 26, 14, 0, 0, TAU); ctx.fill(); ctx.fillStyle = atk ? PALETTE.danger : PALETTE.mint; ctx.beginPath(); ctx.arc(0, -24, 5 + Math.sin(t * 8) * 1.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#2b2f3a'; ctx.fillRect(-30, -8, 60, 6); eyes(ctx, Math.cos(o.facing ?? 0) * 16, -16, 4, PALETTE.danger); break; }
    case 'sock_monster': { const c = ['#ff8fb1', '#fff6e5', '#5aa4e6', '#ffc94a', '#7fd8a6']; for (let i = 0; i < 9; i++) { const a = i * 0.7 + (atk ? t * 6 : t); ctx.fillStyle = o.flash > 0 ? '#fff' : c[i % 5]; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 20, -46 + Math.sin(a) * 26, 14, 9, a, 0, TAU); ctx.fill(); ctx.stroke(); } eyes(ctx, 0, -58, 6, PALETTE.danger); ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(0, -42, 9, 0, Math.PI); ctx.fill(); break; }
    case 'grill_dragon': { ctx.fillStyle = o.flash > 0 ? '#fff' : '#3a3a44'; ctx.fillRect(-32, -56, 64, 40); ctx.strokeRect(-32, -56, 64, 40); ctx.fillStyle = '#23232b'; ctx.fillRect(-26, -16, 6, 16); ctx.fillRect(20, -16, 6, 16); ctx.fillStyle = '#ff6a3a'; ctx.globalAlpha *= 0.7 + Math.sin(t * 8) * 0.3; ctx.fillRect(-28, -60, 56, 6); ctx.globalAlpha = o.alpha ?? 1; ctx.fillStyle = '#3a3a44'; ctx.beginPath(); ctx.moveTo(20, -56); ctx.lineTo(44, -80); ctx.lineTo(50, -64); ctx.lineTo(34, -48); ctx.fill(); ctx.stroke(); eyes(ctx, 42, -70, 3, PALETTE.danger); ctx.fillStyle = '#5a5a66'; ctx.beginPath(); ctx.moveTo(-10, -60); ctx.lineTo(0, -78); ctx.lineTo(10, -60); ctx.fill(); break; }
    case 'partyplanner': {
      const z = e?.z ?? 26, sw = Math.sin(t * 3) * 0.2;
      ctx.translate(0, -z - 40); ctx.rotate(sw * 0.3);
      ctx.fillStyle = o.flash > 0 ? '#fff' : (o.phase === 3 ? '#ff5d5d' : o.phase === 2 ? '#ffc94a' : '#7fd8a6');
      ctx.globalAlpha *= 0.85;
      ctx.beginPath(); ctx.ellipse(0, 0, 54, 30, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(-84, -26 + sw * 30); ctx.lineTo(-84, 26 + sw * 30); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = o.alpha ?? 1;
      ctx.fillStyle = PALETTE.ink; ctx.font = 'bold 11px monospace';
      ['{ party', ' .exe }', '01101'].forEach((l, i) => ctx.fillText(l, -30, -8 + i * 11));
      eyes(ctx, 34, -8, 5, PALETTE.danger);
      break;
    }
    default: blob(12, 12, -12); eyes(ctx, 0, -14, 3);
  }
  if (hurt) { ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff'; ctx.fillRect(-16, -40, 32, 40); }
  ctx.restore();
  // small hp bar for regular enemies
  if (o.hpFrac != null && o.hpFrac < 1 && o.hpFrac > 0) {
    const w = 30, yy = y - (e?.h ?? 30) - 12 - (e?.z ?? 0);
    ctx.fillStyle = 'rgba(16,19,31,0.6)'; ctx.fillRect(x - w / 2 - 1, yy - 1, w + 2, 5);
    ctx.fillStyle = o.hpFrac > 0.35 ? PALETTE.heal : PALETTE.danger; ctx.fillRect(x - w / 2, yy, w * o.hpFrac, 3);
  }
}

/** Debug mark: a pulsing green bracket over the enemy. */
export function drawMark(ctx, e, t) {
  const y = e.y - e.h - 20 - (e.z || 0), k = 1 + Math.sin(t * 10) * 0.1;
  ctx.save(); ctx.translate(e.x, y); ctx.scale(k, k);
  ctx.fillStyle = PALETTE.mint; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 3; ctx.strokeText('{ ! }', 0, 0); ctx.fillText('{ ! }', 0, 0);
  ctx.restore();
}

// ---------------------------------------------------------------- projectiles fallback
export function drawShotFallback(ctx, s, t) {
  ctx.save();
  ctx.translate(s.x, s.y - (s.z || 0));
  ctx.rotate(s.spin ? s.t * s.spin : Math.atan2(s.vy, s.vx));
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1.5;
  switch (s.kind) {
    case 'baguette': ctx.fillStyle = '#e0b46a'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 5, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#b07d3a'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 8 - 2, -3); ctx.lineTo(i * 8 + 2, 3); ctx.stroke(); } break;
    case 'pillow': ctx.fillStyle = '#c9a0dc'; ctx.fillRect(-11, -8, 22, 16); ctx.strokeRect(-11, -8, 22, 16); break;
    case 'ball': ctx.fillStyle = '#ff5d8f'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 5, 0.3, 1.6); ctx.stroke(); break;
    case 'sock': ctx.fillStyle = s.team === 'enemy' ? '#ff8fb1' : '#fff6e5'; ctx.fillRect(-8, -4, 12, 8); ctx.fillRect(0, -4, 6, 12); ctx.strokeRect(-8, -4, 12, 8); break;
    case 'yarn': ctx.fillStyle = '#ff8fb1'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 5, 0, 4); ctx.stroke(); break;
    case 'wrench': ctx.fillStyle = '#c8d0dc'; ctx.fillRect(-12, -2.5, 20, 5); ctx.beginPath(); ctx.arc(10, 0, 6, 0.6, TAU - 0.6); ctx.fill(); ctx.stroke(); break;
    case 'toast': ctx.fillStyle = '#d8a25a'; ctx.fillRect(-8, -8, 16, 16); ctx.fillStyle = '#f3dcae'; ctx.fillRect(-5, -5, 10, 10); break;
    case 'web': ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke(); } break;
    case 'ember': ctx.fillStyle = PALETTE.sunDeep; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill(); ctx.fillStyle = PALETTE.sun; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill(); break;
    case 'code': ctx.rotate(-Math.atan2(s.vy, s.vx)); ctx.fillStyle = 'rgba(16,19,31,0.7)'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill(); ctx.fillStyle = PALETTE.mint; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.glyph ?? '{', 0, 0); break;
    default: ctx.fillStyle = s.reflected ? PALETTE.mint : (s.color ?? PALETTE.paper); ctx.beginPath(); ctx.arc(0, 0, s.r, 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- overlays
export function drawTelegraph(ctx, tg) {
  const k = Math.min(1, tg.t / tg.dur);
  ctx.save();
  ctx.fillStyle = `rgba(255,93,93,${0.1 + 0.14 * k})`;
  ctx.strokeStyle = tg.color ?? `rgba(255,93,93,${0.45 + 0.5 * k})`;
  ctx.lineWidth = 2.5;
  if (tg.kind === 'circle') {
    ctx.beginPath(); ctx.ellipse(tg.x, tg.y, tg.r, tg.r * 0.7, 0, 0, TAU);
    if (!tg.ring) ctx.fill();
    ctx.stroke();
    ctx.fillStyle = `rgba(255,93,93,${0.18 + 0.2 * k})`;
    ctx.beginPath(); ctx.ellipse(tg.x, tg.y, tg.r * k, tg.r * 0.7 * k, 0, 0, TAU); ctx.fill();
  } else if (tg.kind === 'cone') {
    ctx.beginPath(); ctx.moveTo(tg.x, tg.y); ctx.arc(tg.x, tg.y, tg.r, tg.ang - tg.arc / 2, tg.ang + tg.arc / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(255,93,93,${0.22 * k})`;
    ctx.beginPath(); ctx.moveTo(tg.x, tg.y); ctx.arc(tg.x, tg.y, tg.r * k, tg.ang - tg.arc / 2, tg.ang + tg.arc / 2); ctx.closePath(); ctx.fill();
  } else if (tg.kind === 'line') {
    ctx.translate(tg.x, tg.y); ctx.rotate(tg.ang);
    ctx.fillRect(0, -tg.width / 2, tg.len, tg.width);
    ctx.strokeRect(0, -tg.width / 2, tg.len, tg.width);
    ctx.fillStyle = `rgba(255,93,93,${0.28 * k})`;
    ctx.fillRect(0, -tg.width / 2, tg.len * k, tg.width);
  }
  ctx.restore();
}

export function drawWave(ctx, w) {
  const a = 1 - w.r / w.maxR;
  ctx.save();
  ctx.strokeStyle = w.color; ctx.globalAlpha = Math.max(0, a);
  ctx.lineWidth = w.team === 'enemy' ? 10 : 7;
  ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.7, 0, 0, TAU); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.7, 0, 0, TAU); ctx.stroke();
  ctx.restore();
}

export function drawZone(ctx, z, t) {
  const fade = Math.min(1, (z.dur - z.t) * 2, z.t * 5);
  const r = z.r * Math.min(1, z.t * 5);
  ctx.save();
  ctx.globalAlpha = fade;
  if (z.kind === 'puddle') { ctx.fillStyle = 'rgba(79,143,179,0.55)'; ctx.beginPath(); ctx.ellipse(z.x, z.y, r, r * 0.6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(232,248,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(z.x, z.y, r * (0.5 + 0.3 * Math.sin(t * 3 + z.x)), r * 0.3, 0, 0, TAU); ctx.stroke(); }
  else if (z.kind === 'web') { ctx.strokeStyle = 'rgba(255,246,229,0.75)'; ctx.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r * 0.6); ctx.stroke(); } for (const k of [0.35, 0.7, 1]) { ctx.beginPath(); ctx.ellipse(z.x, z.y, r * k, r * 0.6 * k, 0, 0, TAU); ctx.stroke(); } }
  else if (z.kind === 'fire') { const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, r); g.addColorStop(0, 'rgba(255,201,74,0.7)'); g.addColorStop(1, 'rgba(255,93,58,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(z.x, z.y, r, r * 0.6, 0, 0, TAU); ctx.fill(); }
  else if (z.kind === 'net') { ctx.strokeStyle = '#ff8fb1'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(z.x, z.y, r, r * 0.65, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.5; ctx.save(); ctx.beginPath(); ctx.ellipse(z.x, z.y, r, r * 0.65, 0, 0, TAU); ctx.clip(); for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(z.x + i * 16 - r, z.y - r); ctx.lineTo(z.x + i * 16 + r, z.y + r); ctx.moveTo(z.x + i * 16 + r, z.y - r); ctx.lineTo(z.x + i * 16 - r, z.y + r); ctx.stroke(); } ctx.restore(); }
  ctx.restore();
}

export function drawBoundary(ctx, b, t) {
  const fade = Math.min(1, (b.dur - b.t) * 2, b.t * 6);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = 'rgba(127,216,166,0.12)';
  ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r * 0.7, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = PALETTE.mint; ctx.lineWidth = 5; ctx.setLineDash([14, 8]); ctx.lineDashOffset = -t * 40;
  ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r * 0.7, 0, 0, TAU); ctx.stroke();
  ctx.setLineDash([]); ctx.lineWidth = 2; ctx.strokeStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r + 4, b.r * 0.7 + 3, 0, 0, TAU); ctx.stroke();
  ctx.restore();
}

export function drawLaser(ctx, l, t) {
  ctx.save();
  ctx.translate(l.x, l.y); ctx.rotate(l.ang);
  ctx.fillStyle = 'rgba(127,216,166,0.35)'; ctx.fillRect(0, -16, l.len, 32);
  ctx.fillStyle = PALETTE.mint; ctx.fillRect(0, -6, l.len, 12);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, -2, l.len, 4);
  ctx.fillStyle = PALETTE.ink; ctx.font = 'bold 12px monospace';
  for (let x = (t * 300) % 60; x < l.len; x += 60) ctx.fillText('0101', x, 4);
  ctx.restore();
}

export function drawHose(ctx, v, t) {
  ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.ang);
  ctx.strokeStyle = 'rgba(111,183,232,0.8)'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(10, 0); for (let x = 10; x < v.len; x += 12) ctx.lineTo(x, Math.sin(x * 0.08 - t * 30) * (x / v.len) * 8); ctx.stroke();
  ctx.strokeStyle = '#e8f8ff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}

/** Short-lived skill visuals pushed to L.vfx. */
export function drawVfx(ctx, v) {
  const k = Math.min(1, v.t / v.dur);
  ctx.save();
  switch (v.kind) {
    case 'swoosh': {
      ctx.globalAlpha = 0.65 * (1 - k);
      ctx.strokeStyle = v.color; ctx.lineWidth = v.thick ?? 8; ctx.lineCap = 'round';
      const a0 = v.ang - v.arc / 2, a1 = a0 + v.arc * Math.min(1, k * 1.8);
      ctx.beginPath(); ctx.arc(v.x, v.y, v.r, a0, a1); ctx.stroke();
      break;
    }
    case 'spin': ctx.globalAlpha = 0.6 * (1 - k); ctx.strokeStyle = v.color; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(v.x, v.y, v.r * (0.5 + 0.5 * k), v.r * 0.6 * (0.5 + 0.5 * k), 0, k * 6, k * 6 + 4.5); ctx.stroke(); break;
    case 'ring': ctx.globalAlpha = 1 - k; ctx.strokeStyle = v.color; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(v.x, v.y, v.r * k, v.r * 0.7 * k, 0, 0, TAU); ctx.stroke(); break;
    case 'scan': {
      ctx.globalAlpha = 0.8 * (1 - k); ctx.strokeStyle = v.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(v.x, v.y, v.r * k, v.r * 0.7 * k, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = v.color; ctx.font = 'bold 12px monospace';
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.fillText(i % 2 ? '0' : '1', v.x + Math.cos(a) * v.r * k, v.y + Math.sin(a) * v.r * 0.7 * k); }
      break;
    }
    case 'zap': {
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = v.color; ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(255,201,74,0.18)';
      ctx.beginPath(); ctx.moveTo(v.x, v.y); ctx.arc(v.x, v.y, v.r, v.ang - v.arc / 2, v.ang + v.arc / 2); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 4; i++) {
        const a = v.ang + (i / 3 - 0.5) * v.arc;
        ctx.beginPath(); ctx.moveTo(v.x, v.y);
        for (let s = 1; s <= 6; s++) { const r = v.r * s / 6, j = (Math.random() - 0.5) * 16; ctx.lineTo(v.x + Math.cos(a) * r - Math.sin(a) * j, v.y + Math.sin(a) * r + Math.cos(a) * j); }
        ctx.stroke();
      }
      break;
    }
    case 'bolt': { ctx.globalAlpha = 1 - k; ctx.strokeStyle = v.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(v.x, v.y - 200); for (let s = 1; s <= 6; s++) ctx.lineTo(v.x + (Math.random() - 0.5) * 24, v.y - 200 + s * 200 / 6); ctx.stroke(); break; }
    case 'card': {
      const up = k * 30;
      ctx.globalAlpha = Math.min(1, (1 - k) * 3);
      ctx.translate(v.x, v.y - up); ctx.rotate(Math.sin(k * 6) * 0.1);
      ctx.fillStyle = '#1b2238'; ctx.fillRect(-22, -30, 44, 60);
      ctx.fillStyle = v.card === 'bolt' ? PALETTE.danger : v.card === 'growth' ? PALETTE.pine : PALETTE.paper; ctx.fillRect(-18, -26, 36, 52);
      ctx.fillStyle = v.card === 'salve' ? PALETTE.danger : '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(v.card === 'bolt' ? '⚡' : v.card === 'growth' ? '▲' : '+', 0, 0);
      break;
    }
  }
  ctx.restore();
}

/** Heart pickup fallback. */
export function drawHeart(ctx, p, t) {
  const y = p.y - p.z - 8 - Math.sin(t * 5 + p.seed) * 2;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 2.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = PALETTE.danger; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(p.x, y + 6); ctx.bezierCurveTo(p.x - 12, y - 4, p.x - 6, y - 12, p.x, y - 5); ctx.bezierCurveTo(p.x + 6, y - 12, p.x + 12, y - 4, p.x, y + 6); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/** Drumline beat ring under the hero (shrinks onto the beat). */
export function drawBeatRing(ctx, h, phase) {
  const r = 18 + (1 - phase) * 30;
  const on = phase < 0.14 || phase > 0.9;
  ctx.save();
  ctx.strokeStyle = on ? PALETTE.sun : 'rgba(155,106,184,0.7)'; ctx.lineWidth = on ? 4 : 2;
  ctx.beginPath(); ctx.ellipse(h.x, h.y, r, r * 0.45, 0, 0, TAU); ctx.stroke();
  ctx.restore();
}
