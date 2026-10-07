// Shared helpers for the hub team's scenes (hub, select, results). Owned by: hub team.
import { PALETTE, SKILLS, HEROES, PERKS } from '../core/theme.js';
import * as Sprites from '../art/sprites.js';

export const TAU = Math.PI * 2;
export const MONO = '13px ui-monospace, Menlo, Consolas, monospace';
export const BOLD = (px) => `bold ${px}px "Trebuchet MS", system-ui, sans-serif`;

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}

/** "10:00 AM" from an hour-of-day number. */
export function fmtHour(h) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}

export const ROLE = {
  aaron: { title: 'The Programmer', line: 'Karate kid turned coder. Hits hard, debugs bugs.' },
  victoria: { title: 'The Fixer', line: 'Fixes anything. Stuns gadgets, controls the crowd.' },
};

/** Favored-hero bonus, shown on select. Action applies it from ROOMS[roomId].favored. */
export const FAVORED_BONUS = '+15% damage';

/** Draw a hero photo bust (transparent cutout) with its bottom-center at (cx, by), height h. */
export function drawBustImg(ctx, game, hero, cx, by, h, o = {}) {
  if (typeof Sprites.drawBust === 'function') {
    try {
      return Sprites.drawBust(ctx, game, hero, o.expr ?? 'smile', cx, by, h,
        { t: o.t ?? game.time, exprT: o.exprT, dim: o.dim, alpha: o.alpha, enter: o.enter, side: o.side, fade: o.fade });
    } catch { /* fall back to the raw image below */ }
  }
  const key = HEROES[hero]?.busts?.[o.expr ?? 'smile'] ?? `bust.${hero}.smile`;
  const img = game.assets?.image?.(key);
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (img) {
    const w = (img.width / img.height) * h;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 24; }
    ctx.drawImage(img, cx - w / 2, by - h, w, h);
  } else {
    // fallback: soft silhouette in hero colors
    const look = HEROES[hero]?.look ?? {};
    ctx.fillStyle = look.jacket ?? look.shirt ?? '#888';
    ctx.beginPath(); ctx.ellipse(cx, by, h * 0.36, h * 0.3, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = look.skin ?? '#f2c7a5';
    ctx.beginPath(); ctx.arc(cx, by - h * 0.55, h * 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = look.hair ?? '#c99a5b';
    ctx.beginPath(); ctx.arc(cx, by - h * 0.6, h * 0.21, Math.PI, TAU); ctx.fill();
  }
  ctx.restore();
}

const HERO_TINT = { aaron: PALETTE.sun, victoria: PALETTE.denim };
// Simple vector glyphs per skill, used until art ships drawSkillIcon.
const GLYPH = {
  kick: 'foot', wrench: 'wrench', debug: 'bug', unplug: 'plug', bread_toss: 'bread', hot_pan: 'pan',
  plate_shield_a: 'plate', plate_shield_v: 'plate', karate_sweep: 'swirl', throw_pillow: 'pillow',
  tap_card: 'card', bouncy_ball: 'ball', sock_sling: 'sock', crochet_net: 'net', mop_spin: 'swirl',
  wrench_throw: 'wrench', drumline: 'drum', garden_hose: 'drop', pull_aggro: 'shield', boundaries: 'ring',
};

/** Skill icon centered at (x, y). Uses art's drawSkillIcon when shipped. */
export function skillIcon(ctx, id, x, y, size, o = {}) {
  if (typeof Sprites.drawSkillIcon === 'function') {
    try { Sprites.drawSkillIcon(ctx, id, x, y, size, o); return; } catch { /* fall back */ }
  }
  const sk = SKILLS[id];
  const tint = HERO_TINT[sk?.hero] ?? PALETTE.mint;
  const r = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, r);
  g.addColorStop(0, '#fff6e5'); g.addColorStop(0.25, tint); g.addColorStop(1, sk?.slot === 'ultimate' ? '#7a3fa8' : '#2a3356');
  ctx.fillStyle = g; rr(ctx, -r, -r, size, size, r * 0.35); ctx.fill();
  ctx.strokeStyle = sk?.slot === 'ultimate' ? '#e7b8ff' : 'rgba(255,246,229,0.7)'; ctx.lineWidth = 2;
  rr(ctx, -r, -r, size, size, r * 0.35); ctx.stroke();
  ctx.scale(r / 16, r / 16);
  ctx.strokeStyle = PALETTE.ink; ctx.fillStyle = PALETTE.paper; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  drawGlyph(ctx, GLYPH[id] ?? 'star');
  ctx.restore();
}

function drawGlyph(ctx, g) {
  const P = PALETTE;
  const fs = (c) => { ctx.fillStyle = c; ctx.fill(); ctx.stroke(); };
  ctx.beginPath();
  switch (g) {
    case 'foot': ctx.ellipse(0, 2, 6, 9, -0.3, 0, TAU); fs(P.paper); ctx.beginPath(); ctx.arc(-5, -8, 2, 0, TAU); ctx.arc(-1, -10, 2, 0, TAU); fs(P.paper); break;
    case 'wrench': ctx.moveTo(-8, 8); ctx.lineTo(4, -4); ctx.lineWidth = 4; ctx.stroke(); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(6, -6, 5, 0.6, TAU - 0.6); ctx.stroke(); break;
    case 'bug': ctx.ellipse(0, 2, 6, 8, 0, 0, TAU); fs(P.mint); ctx.beginPath(); ctx.arc(0, -8, 3.5, 0, TAU); fs(P.mint);
      for (const s of [-1, 1]) for (const yy of [-2, 3, 8]) { ctx.beginPath(); ctx.moveTo(s * 6, yy); ctx.lineTo(s * 11, yy - 3); ctx.stroke(); } break;
    case 'plug': ctx.rect(-6, -3, 12, 10); fs(P.paper); ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(-3, -10); ctx.moveTo(3, -3); ctx.lineTo(3, -10); ctx.moveTo(0, 7); ctx.quadraticCurveTo(0, 13, 8, 12); ctx.stroke(); break;
    case 'bread': ctx.ellipse(0, 0, 12, 5, -0.5, 0, TAU); fs('#e0a95e'); ctx.beginPath(); ctx.moveTo(-5, 1); ctx.lineTo(-2, -4); ctx.moveTo(0, 3); ctx.lineTo(3, -2); ctx.stroke(); break;
    case 'pan': ctx.arc(-2, 2, 8, 0, TAU); fs('#3a3f4a'); ctx.beginPath(); ctx.moveTo(5, -4); ctx.lineTo(12, -11); ctx.lineWidth = 4; ctx.stroke(); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-5, -9); ctx.quadraticCurveTo(-2, -13, -4, -16); ctx.strokeStyle = P.sunDeep; ctx.stroke(); break;
    case 'plate': ctx.arc(0, 0, 11, 0, TAU); fs(P.paper); ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.stroke(); break;
    case 'swirl': ctx.arc(0, 0, 9, 0, Math.PI * 1.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 4, Math.PI, Math.PI * 2.5); ctx.stroke(); break;
    case 'pillow': rr(ctx, -10, -7, 20, 14, 5); fs('#c9a0dc'); break;
    case 'card': rr(ctx, -7, -10, 14, 20, 2); fs(P.paper); ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); fs(P.danger); break;
    case 'ball': ctx.arc(0, 0, 9, 0, TAU); fs(P.danger); ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(0, 6, 9, 0); ctx.stroke(); break;
    case 'sock': ctx.moveTo(-3, -11); ctx.lineTo(3, -11); ctx.lineTo(3, 3); ctx.quadraticCurveTo(10, 4, 9, 9); ctx.lineTo(-3, 9); ctx.closePath(); fs('#ff8fb1'); break;
    case 'net': for (let i = -8; i <= 8; i += 5.3) { ctx.moveTo(i, -9); ctx.lineTo(i, 9); ctx.moveTo(-9, i); ctx.lineTo(9, i); } ctx.stroke(); break;
    case 'drum': ctx.ellipse(0, -4, 10, 4, 0, 0, TAU); fs(P.paper); ctx.beginPath(); ctx.rect(-10, -4, 20, 12); ctx.fillStyle = '#6b3fa0'; ctx.fill(); ctx.stroke(); break;
    case 'drop': ctx.moveTo(0, -11); ctx.quadraticCurveTo(9, 2, 0, 9); ctx.quadraticCurveTo(-9, 2, 0, -11); fs(P.sky); break;
    case 'shield': ctx.moveTo(0, -11); ctx.lineTo(9, -6); ctx.quadraticCurveTo(8, 6, 0, 11); ctx.quadraticCurveTo(-8, 6, -9, -6); ctx.closePath(); fs(P.sun); break;
    case 'ring': ctx.arc(0, 0, 10, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = '#e7b8ff'; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); fs(P.paper); break;
    default: star(ctx, 0, 0, 10, P.sun);
  }
}

/** Five-point star. */
export function star(ctx, x, y, r, fill = PALETTE.sun, o = {}) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = o.stroke ?? 'rgba(90,58,42,0.8)'; ctx.lineWidth = o.lineWidth ?? 1.5; ctx.stroke();
  ctx.restore();
}

/** Tiny self-contained particle system (sparkles / confetti) for hub screens. */
export class Sparks {
  constructor() { this.p = []; }
  burst(x, y, colors, n = 24, speed = 160, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = speed * (0.3 + Math.random() * 0.7);
      const life = 0.6 + Math.random() * 0.7;
      this.p.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, g: o.g ?? 220, life, max: life,
        c: colors[i % colors.length], s: 2 + Math.random() * 3, star: Math.random() < (o.stars ?? 0.3), rot: Math.random() * TAU });
    }
  }
  update(dt) {
    for (const q of this.p) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; q.vx *= 1 - dt * 1.5; q.rot += dt * 4; }
    this.p = this.p.filter((q) => q.life > 0);
  }
  render(ctx) {
    for (const q of this.p) {
      const a = Math.min(1, q.life / q.max * 1.5);
      ctx.save(); ctx.globalAlpha = a;
      if (q.star) star(ctx, q.x, q.y, q.s * 1.6, q.c, { stroke: 'rgba(0,0,0,0)' });
      else { ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.c; ctx.fillRect(-q.s, -q.s / 2, q.s * 2, q.s); }
      ctx.restore();
    }
  }
}

export const PERK_LIST = Object.values(PERKS ?? {});
export const owns = (state, id) => (state.purchases ?? []).includes(id);

/** Buy a Party Touch. Stat perks write state.party directly (action reads party; never re-applies). */
export function buyPerk(state, id) {
  const pk = PERKS[id];
  if (!pk || owns(state, id) || state.partyPoints < pk.cost) return false;
  state.partyPoints -= pk.cost;
  state.purchases.push(id);
  for (const hero of Object.keys(state.party ?? {})) {
    const p = state.party[hero];
    if (id === 'good_coffee') p.speed = Math.round(p.speed * 1.1);
    if (id === 'snack_table') p.maxHp += 20;
    if (id === 'house_shoes') p.damage = Math.round(p.damage * 1.1 * 10) / 10;
  }
  return true;
}
