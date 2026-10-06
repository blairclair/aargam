// Action-specific overlays (telegraphs, rings, zones, pickups, water, snow). Owned by: action team.
// Characters/props come from src/art/sprites.js; these are gameplay readability layers.
import { PALETTE } from '../core/theme.js';

export function drawWater(ctx, water, t, frost = 0) {
  if (!water.length) return;
  ctx.save();
  ctx.fillStyle = '#e9dcb0';
  for (const w of water) { ctx.beginPath(); ctx.arc(w.x, w.y, w.r + 8, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = PALETTE.lake;
  for (const w of water) { ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = frost > 0.3 ? 'rgba(232,248,255,0.35)' : 'rgba(255,255,255,0.18)';
  for (const w of water) {
    for (let i = 0; i < 3; i++) {
      const y = w.y - w.r * 0.4 + i * w.r * 0.35;
      const x = w.x + Math.sin(t * 0.8 + i * 2 + w.x) * w.r * 0.25;
      ctx.fillRect(x - w.r * 0.25, y, w.r * 0.5, 2);
    }
  }
  if (frost > 0) {
    ctx.fillStyle = `rgba(232,248,255,${frost * 0.45})`;
    for (const w of water) { ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

export function drawTelegraph(ctx, tg) {
  const k = Math.min(1, tg.t / tg.dur);
  ctx.save();
  ctx.fillStyle = `rgba(111,183,232,${0.12 + 0.18 * k})`;
  ctx.strokeStyle = `rgba(255,93,93,${0.35 + 0.5 * k})`;
  ctx.lineWidth = 2;
  if (tg.kind === 'circle') {
    ctx.beginPath(); ctx.ellipse(tg.x, tg.y, tg.r, tg.r * 0.7, 0, 0, Math.PI * 2);
    if (!tg.ring) ctx.fill();
    ctx.stroke();
    ctx.fillStyle = `rgba(255,93,93,${0.15 + 0.2 * k})`;
    ctx.beginPath(); ctx.ellipse(tg.x, tg.y, tg.r * k, tg.r * 0.7 * k, 0, 0, Math.PI * 2); ctx.fill();
  } else if (tg.kind === 'cone') {
    ctx.beginPath();
    ctx.moveTo(tg.x, tg.y);
    ctx.arc(tg.x, tg.y, tg.r, tg.ang - tg.arc / 2, tg.ang + tg.arc / 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(255,93,93,${0.2 * k})`;
    ctx.beginPath(); ctx.moveTo(tg.x, tg.y); ctx.arc(tg.x, tg.y, tg.r * k, tg.ang - tg.arc / 2, tg.ang + tg.arc / 2); ctx.closePath(); ctx.fill();
  } else if (tg.kind === 'line') {
    ctx.translate(tg.x, tg.y); ctx.rotate(tg.ang);
    ctx.fillRect(0, -tg.width / 2, tg.len, tg.width);
    ctx.fillStyle = `rgba(255,93,93,${0.25 * k})`;
    ctx.fillRect(0, -tg.width / 2, tg.len * k, tg.width);
  }
  ctx.restore();
}

export function drawWave(ctx, w) {
  const a = 1 - w.r / w.maxR;
  ctx.save();
  ctx.strokeStyle = w.color;
  ctx.globalAlpha = Math.max(0, a);
  ctx.lineWidth = w.team === 'enemy' ? 10 : 6;
  ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function drawZone(ctx, z) {
  const fade = Math.min(1, (z.dur - z.t) * 2, z.t * 4);
  ctx.save();
  ctx.globalAlpha = fade;
  const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
  g.addColorStop(0, 'rgba(255,201,74,0.35)');
  g.addColorStop(0.7, 'rgba(140,255,158,0.22)');
  g.addColorStop(1, 'rgba(140,255,158,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(140,255,158,0.6)'; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -z.t * 20; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.75, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  // little flowers
  const cols = [PALETTE.sun, PALETTE.sunDeep, '#ff9ec7', PALETTE.paper];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39 + z.seed, rr = z.r * (0.3 + ((i * 37) % 60) / 100);
    const fx = z.x + Math.cos(a) * rr, fy = z.y + Math.sin(a) * rr * 0.75;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath(); ctx.arc(fx, fy, 3 + Math.sin(z.t * 4 + i) * 0.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawPickup(ctx, p, t) {
  const bob = p.z + Math.sin(t * 5 + p.x) * 2 + 4;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  const y = p.y - bob;
  if (p.kind === 'sunshine') {
    ctx.fillStyle = 'rgba(255,201,74,0.35)';
    ctx.beginPath(); ctx.arc(p.x, y - 6, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath(); ctx.arc(p.x, y - 6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.sunDeep; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + t;
      ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 8, y - 6 + Math.sin(a) * 8); ctx.lineTo(p.x + Math.cos(a) * 11, y - 6 + Math.sin(a) * 11); ctx.stroke();
    }
  } else {
    // a tiny mint-chip cone
    ctx.fillStyle = '#d9a35b';
    ctx.beginPath(); ctx.moveTo(p.x - 5, y - 6); ctx.lineTo(p.x + 5, y - 6); ctx.lineTo(p.x, y + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PALETTE.mint;
    ctx.beginPath(); ctx.arc(p.x, y - 9, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.choc;
    ctx.fillRect(p.x - 3, y - 11, 2, 2); ctx.fillRect(p.x + 1, y - 8, 2, 2); ctx.fillRect(p.x + 2, y - 13, 1.5, 1.5);
  }
  ctx.restore();
}

/** Placeholder townsperson until art ships drawNPC. */
export function drawNpcPlaceholder(ctx, x, y, seed = 0, t = 0, alpha = 1, frozen = false) {
  const shirts = [PALETTE.brick, PALETTE.pine, PALETTE.sunDeep, PALETTE.denim, '#9b6ab8'];
  const hairs = ['#3b2a20', '#c99a5b', '#7a4a2a', '#222', '#d9b47a'];
  const bob = frozen ? 0 : Math.abs(Math.sin(t * 12)) * 3;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(x, y - bob);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(0, bob, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a3f55'; ctx.fillRect(-5, -12, 10, 12);
  ctx.fillStyle = shirts[seed % shirts.length]; ctx.fillRect(-7, -24, 14, 13);
  ctx.fillStyle = '#f2c7a5';
  ctx.beginPath(); ctx.arc(0, -31, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hairs[(seed >> 2) % hairs.length];
  ctx.beginPath(); ctx.arc(0, -33, 7, Math.PI, 0); ctx.fill();
  if (!frozen) { // waving arm
    ctx.strokeStyle = '#f2c7a5'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(6, -22); ctx.lineTo(12, -34 + Math.sin(t * 14) * 4); ctx.stroke();
  }
  if (frozen) { ctx.fillStyle = 'rgba(191,233,255,0.5)'; ctx.fillRect(-8, -39, 16, 39); }
  ctx.restore();
}

export function makeSnow(n) {
  return Array.from({ length: n }, () => ({ x: Math.random() * 960, y: Math.random() * 540, vx: -20 + Math.random() * 50, vy: 30 + Math.random() * 50, r: 1 + Math.random() * 2 }));
}
export function drawSnow(ctx, snow) {
  ctx.save();
  ctx.fillStyle = 'rgba(232,248,255,0.12)';
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (const s of snow) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

export function drawShieldArc(ctx, h, t) {
  ctx.save();
  ctx.strokeStyle = PALETTE.denim; ctx.lineWidth = 6; ctx.globalAlpha = 0.75 + Math.sin(t * 20) * 0.15;
  ctx.beginPath(); ctx.arc(h.x, h.y - 18, 30, h.facing - 0.9, h.facing + 0.9); ctx.stroke();
  ctx.strokeStyle = PALETTE.ice; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(h.x, h.y - 18, 33, h.facing - 0.9, h.facing + 0.9); ctx.stroke();
  ctx.restore();
}

export function drawSweepArc(ctx, h, k) {
  const t = h.tune;
  ctx.save();
  ctx.globalAlpha = 0.55 * (1 - k);
  ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 8;
  const a0 = h.facing - t.sweepArc / 2, a1 = a0 + t.sweepArc * Math.min(1, k * 1.6);
  ctx.beginPath(); ctx.arc(h.x, h.y - 14, t.sweepRange * 0.85, a0, a1); ctx.stroke();
  ctx.restore();
}
