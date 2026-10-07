// Skill icons (theme.SKILLS ids). Owned by: art. Badge + glyph, cached per size.
import { SKILLS, PALETTE } from '../core/theme.js';
import { cached, rrect, rgba, shade } from './util.js';

const TAU = Math.PI * 2;
const INK = PALETTE.ink;
const HERO_COL = { aaron: PALETTE.sun, victoria: PALETTE.mint };

function line(c, pts, w, col) {
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
}
function circ(c, x, y, r, fill, stroke, lw = 1.4) {
  c.beginPath(); c.arc(x, y, r, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
function outlined(c, fill, lw = 1.6) { c.fillStyle = fill; c.fill(); c.strokeStyle = INK; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); }

// Glyphs drawn in a 32x32 box centred on (0,0).
const G = {
  kick(c) { // white sneaker + motion lines
    line(c, [[-13, -6], [-7, -6]], 2, PALETTE.paper); line(c, [[-14, -1], [-6, -1]], 2, PALETTE.paper); line(c, [[-12, 4], [-7, 4]], 2, PALETTE.paper);
    c.beginPath(); c.moveTo(-5, -8); c.lineTo(2, -8); c.quadraticCurveTo(4, -2, 9, -1); c.quadraticCurveTo(13, 0, 13, 4); c.lineTo(13, 6); c.lineTo(-5, 6); c.closePath();
    outlined(c, '#f4f4f0');
    c.fillStyle = '#9aa0aa'; c.fillRect(-5, 4, 18, 2.2);
    line(c, [[-1, -5], [2, -3]], 1.2, '#9aa0aa'); line(c, [[0, -2], [3, 0]], 1.2, '#9aa0aa');
  },
  wrench(c) {
    c.save(); c.rotate(-0.8);
    rrect(c, -2.4, -4, 4.8, 18, 2.2); outlined(c, '#b8c0cf');
    rrect(c, -2.6, 6, 5.2, 8, 2.2); outlined(c, '#c0473f');
    c.beginPath(); c.arc(0, -8, 6.5, 0, TAU); outlined(c, '#b8c0cf');
    c.fillStyle = HERO_COL.victoria; c.beginPath(); c.moveTo(-2.6, -15); c.lineTo(2.6, -15); c.lineTo(2, -8); c.lineTo(-2, -8); c.closePath(); c.fill();
    c.restore();
  },
  debug(c) { // magnifying glass over a bug
    c.fillStyle = '#7dff9b'; c.beginPath(); c.ellipse(-3, -2, 5, 6, 0, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.3; c.stroke();
    line(c, [[-3, -8], [-3, 4]], 1, INK);
    for (const s of [-1, 1]) { line(c, [[-3 + s * 5, -4], [-3 + s * 8, -6]], 1.2, INK); line(c, [[-3 + s * 5, 0], [-3 + s * 8, 1]], 1.2, INK); }
    circ(c, -3, -2, 9.5, 'rgba(232,248,255,0.35)', INK, 2.2);
    line(c, [[4, 5], [11, 12]], 4, '#5a3a2a'); line(c, [[4, 5], [11, 12]], 1.5, '#8a5a3a');
  },
  unplug(c) { // plug with a zap break
    rrect(c, -12, -5, 10, 10, 2.5); outlined(c, '#e6e8ec');
    line(c, [[-12, 0], [-15, 0]], 3, INK);
    line(c, [[-2, -2.5], [2, -2.5]], 2, '#9aa0aa'); line(c, [[-2, 2.5], [2, 2.5]], 2, '#9aa0aa');
    c.beginPath(); c.moveTo(6, -11); c.lineTo(2, -1); c.lineTo(6, -1); c.lineTo(3, 10); c.lineTo(11, -3); c.lineTo(7, -3); c.lineTo(10, -11); c.closePath();
    outlined(c, PALETTE.sun, 1.3);
  },
  bread_toss(c) {
    c.save(); c.rotate(-0.6);
    rrect(c, -13, -4.5, 26, 9, 4.5); outlined(c, '#d99a4e');
    for (let i = -2; i <= 2; i++) line(c, [[i * 5 - 1.5, -2.5], [i * 5 + 1.5, 2.5]], 1.4, '#f3d29a');
    c.restore();
    line(c, [[-14, 8], [-9, 10]], 1.6, PALETTE.paper); line(c, [[-13, 12], [-8, 13]], 1.6, PALETTE.paper);
  },
  hot_pan(c) {
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 5 - 3, -4); c.quadraticCurveTo(i * 5 - 4, -10, i * 5, -14 + Math.abs(i) * 2); c.quadraticCurveTo(i * 5 + 4, -9, i * 5 + 3, -4); c.closePath(); outlined(c, i ? PALETTE.sunDeep : PALETTE.danger, 1.1); }
    c.beginPath(); c.ellipse(0, 2, 11, 7, 0, 0, TAU); outlined(c, '#2a2c33');
    c.fillStyle = '#4a4e5a'; c.beginPath(); c.ellipse(0, 1.5, 8, 4.8, 0, 0, TAU); c.fill();
    rrect(c, 9, 0, 7, 3.4, 1.6); outlined(c, '#5a3a2a', 1.2);
  },
  plate_shield(c) {
    c.beginPath(); c.arc(0, 0, 12, 0, TAU); outlined(c, '#f6f3ea', 1.8);
    circ(c, 0, 0, 8.5, null, '#e98aa8', 1.8);
    circ(c, 0, 0, 5, null, 'rgba(200,192,174,0.8)', 1);
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 10.2, -2.4, -1.5); c.stroke();
  },
  karate_sweep(c) {
    c.strokeStyle = PALETTE.paper; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, 11, 0.3, 5.2); c.stroke();
    c.fillStyle = PALETTE.paper; c.beginPath(); c.moveTo(11, 3); c.lineTo(13, -3); c.lineTo(6, -1); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(1, 1, 5.5, 3.6, -0.4, 0, TAU); outlined(c, '#f4f4f0', 1.3);
    c.fillStyle = '#9aa0aa'; c.fillRect(-4, 2.6, 9, 1.4);
  },
  throw_pillow(c) {
    c.beginPath(); c.moveTo(-11, -9); c.quadraticCurveTo(0, -6, 11, -9); c.quadraticCurveTo(8, 0, 11, 9); c.quadraticCurveTo(0, 6, -11, 9); c.quadraticCurveTo(-8, 0, -11, -9); c.closePath();
    outlined(c, '#c9a0dc');
    circ(c, 0, 0, 2, PALETTE.paper, INK, 1);
    line(c, [[-14, -12], [-9, -12]], 1.6, PALETTE.paper); line(c, [[12, 12], [7, 12]], 1.6, PALETTE.paper);
  },
  tap_card(c) {
    c.save(); c.rotate(0.25);
    rrect(c, -8, -12, 16, 23, 2.5); outlined(c, '#fff6e5');
    c.fillStyle = PALETTE.sky; rrect(c, -5.5, -9, 11, 9, 1.5); c.fill();
    c.fillStyle = PALETTE.sun; c.beginPath(); c.arc(0, -4.5, 2.6, 0, TAU); c.fill();
    c.fillStyle = '#5a3a2a'; c.fillRect(-5.5, 3, 11, 1.2); c.fillRect(-5.5, 6, 7, 1.2);
    c.restore();
    line(c, [[11, -13], [13, -9]], 1.6, PALETTE.sun); line(c, [[14, -5], [10, -5]], 1.6, PALETTE.sun);
  },
  bouncy_ball(c) {
    c.setLineDash([2, 3]); c.strokeStyle = PALETTE.paper; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-13, 10); c.quadraticCurveTo(-9, -6, -4, 8); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.arc(5, -1, 8, 0, TAU); outlined(c, PALETTE.danger);
    c.strokeStyle = PALETTE.sun; c.lineWidth = 2; c.beginPath(); c.arc(5, -1, 8, -0.7, 1.0); c.stroke();
    circ(c, 2.5, -4, 2, 'rgba(255,255,255,0.75)');
  },
  sock_sling(c) {
    c.beginPath(); c.moveTo(-6, -12); c.lineTo(3, -12); c.lineTo(3, 2); c.quadraticCurveTo(12, 2, 12, 8); c.quadraticCurveTo(12, 12, 6, 12); c.lineTo(-2, 12); c.quadraticCurveTo(-6, 10, -6, 4); c.closePath();
    outlined(c, '#ff8fb1');
    c.fillStyle = PALETTE.paper; c.fillRect(-5.2, -11.2, 7.4, 4);
    c.fillStyle = '#e2557a'; c.fillRect(-5.2, -4, 7.4, 1.6);
    c.fillStyle = PALETTE.frost; c.beginPath(); c.arc(-11, 6, 1.6, 0, TAU); c.arc(-12, 0, 1.2, 0, TAU); c.fill();
  },
  crochet_net(c) {
    c.strokeStyle = '#ff8fb1'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.stroke();
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 5, -Math.sqrt(144 - 25 * i * i)); c.lineTo(i * 5, Math.sqrt(144 - 25 * i * i)); c.stroke(); c.beginPath(); c.moveTo(-Math.sqrt(144 - 25 * i * i), i * 5); c.lineTo(Math.sqrt(144 - 25 * i * i), i * 5); c.stroke(); }
    line(c, [[6, 13], [14, 3]], 2.2, PALETTE.sun);
    circ(c, 14, 3, 1.6, PALETTE.sun);
  },
  mop_spin(c) {
    c.strokeStyle = PALETTE.lake; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); for (let a = 0; a < TAU * 1.6; a += 0.2) { const r = 3 + a * 1.1; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.75); } c.stroke();
    line(c, [[-10, -12], [6, 6]], 2.6, '#b98a5c');
    c.fillStyle = '#e8e2d0'; for (let i = -3; i <= 3; i++) { c.beginPath(); c.ellipse(8 + i * 0.6, 9 + i * 0.6, 4.5, 1.4, 0.8 + i * 0.12, 0, TAU); c.fill(); }
  },
  wrench_throw(c) {
    c.setLineDash([3, 3]); c.strokeStyle = PALETTE.paper; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(0, 2, 13, 8, 0, Math.PI * 0.9, Math.PI * 2.4); c.stroke(); c.setLineDash([]);
    c.save(); c.scale(0.72, 0.72); c.translate(-2, -4); G.wrench(c); c.restore();
  },
  drumline(c) {
    c.beginPath(); c.ellipse(0, -3, 11, 4, 0, 0, TAU); outlined(c, '#f6f3ea', 1.4);
    c.beginPath(); c.moveTo(-11, -3); c.lineTo(-11, 7); c.ellipse(0, 7, 11, 4, 0, Math.PI, 0, true); c.lineTo(11, -3); c.ellipse(0, -3, 11, 4, 0, 0, Math.PI); c.closePath();
    outlined(c, '#4b2a7a', 1.4); // Ravens purple
    line(c, [[-9, 0], [-4, 9], [1, 0], [6, 9], [10, 1]], 1.2, PALETTE.sun);
    line(c, [[-4, -7], [-12, -14]], 1.8, '#e6c79a'); line(c, [[4, -7], [12, -14]], 1.8, '#e6c79a');
  },
  garden_hose(c) {
    c.fillStyle = PALETTE.frost;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(3 + i * 2.5, -4 - i * 2 + (i % 2), 1.6 + i * 0.3, 0, TAU); c.fill(); }
    line(c, [[-12, 10], [-6, 6], [-2, 2]], 3.2, '#3f9a52');
    c.save(); c.translate(-2, 2); c.rotate(-0.7);
    rrect(c, 0, -3, 9, 6, 2); outlined(c, PALETTE.sun, 1.3);
    rrect(c, 9, -2, 3, 4, 1); outlined(c, '#7a7f8c', 1);
    c.restore();
  },
  pull_aggro(c) { // shield + inward arrows (tank taunt)
    for (let i = 0; i < 4; i++) {
      c.save(); c.rotate(i * TAU / 4 + Math.PI / 4);
      line(c, [[0, -15], [0, -10]], 2, PALETTE.danger);
      c.fillStyle = PALETTE.danger; c.beginPath(); c.moveTo(-3, -11); c.lineTo(3, -11); c.lineTo(0, -7.5); c.closePath(); c.fill();
      c.restore();
    }
    c.beginPath(); c.moveTo(0, -9); c.lineTo(7, -6); c.quadraticCurveTo(7, 5, 0, 9); c.quadraticCurveTo(-7, 5, -7, -6); c.closePath();
    outlined(c, PALETTE.sun);
    c.fillStyle = PALETTE.ink; c.font = 'bold 9px "Trebuchet MS", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 0, 0);
  },
  boundaries(c) { // ring + raised hand
    c.strokeStyle = PALETTE.mint; c.lineWidth = 2.4; c.setLineDash([4, 2.5]);
    c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.stroke(); c.setLineDash([]);
    c.beginPath();
    c.moveTo(-5, 8); c.lineTo(-5, -2);
    for (let f = 0; f < 4; f++) { const fx = -4.5 + f * 3; c.lineTo(fx, -8 + Math.abs(f - 1.5) * 1.2); c.lineTo(fx + 2.4, -8 + Math.abs(f - 1.5) * 1.2); c.lineTo(fx + 2.6, -2); }
    c.lineTo(7, -2); c.lineTo(10, -4); c.lineTo(11, -2); c.lineTo(6, 4); c.lineTo(5, 8); c.closePath();
    outlined(c, '#f3cdb2', 1.3);
  },
  _unknown(c) { c.fillStyle = PALETTE.paper; c.font = 'bold 16px "Trebuchet MS", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, 1); },
};
G.plate_shield_a = G.plate_shield;
G.plate_shield_v = G.plate_shield;

export const SKILL_ICON_IDS = Object.keys(SKILLS ?? {}).filter((k) => G[k]);

/**
 * Skill icon: round badge (hero-colored rim, gold double rim for ultimates) with a glyph. Centered on (x, y).
 * size = diameter in px.
 * o: { badge?: false (glyph only), locked?: bool (dark + padlock), dim?: bool (on cooldown: desaturated),
 *      ready?: bool (pulse glow, for a charged ultimate), alpha?, t? }
 */
export function drawSkillIcon(ctx, skillId, x, y, size, o = {}) {
  const sk = SKILLS?.[skillId];
  const col = HERO_COL[sk?.hero] ?? PALETTE.sun;
  const ult = sk?.slot === 'ultimate';
  const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0 };
  const px = Math.ceil(size * Math.hypot(m.a, m.b));
  const B = px <= 32 ? 32 : px <= 48 ? 48 : px <= 72 ? 72 : 128;
  const badge = o.badge !== false;
  const c = cached(`skill:${skillId}:${B}:${badge}`, B + 8, B + 8, (g) => {
    g.translate((B + 8) / 2, (B + 8) / 2);
    const k = B / 40;
    g.scale(k, k);
    if (badge) {
      const gr = g.createRadialGradient(-6, -8, 2, 0, 0, 20);
      gr.addColorStop(0, shade(col, -0.35)); gr.addColorStop(1, shade(col, -0.7));
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 19, 0, TAU); g.fill();
      g.strokeStyle = col; g.lineWidth = 2.4; g.stroke();
      if (ult) { g.strokeStyle = PALETTE.sun; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 16.5, 0, TAU); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.ellipse(0, -9, 13, 6, 0, 0, TAU); g.fill();
    }
    g.save(); g.scale(0.92, 0.92);
    (G[skillId] ?? G._unknown)(g);
    g.restore();
  });
  const t = o.t ?? performance.now() / 1000;
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  const s = size / B;
  if (o.ready) {
    const p = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.fillStyle = rgba(PALETTE.sun, 0.25 + 0.25 * p);
    ctx.beginPath(); ctx.arc(x, y, size * (0.56 + 0.06 * p), 0, TAU); ctx.fill();
  }
  if (o.dim || o.locked) ctx.filter = o.locked ? 'grayscale(1) brightness(0.45)' : 'saturate(0.35) brightness(0.7)';
  ctx.drawImage(c, x - (B + 8) * s / 2, y - (B + 8) * s / 2, (B + 8) * s, (B + 8) * s);
  ctx.filter = 'none';
  if (o.locked) {
    const u = size / 40;
    ctx.fillStyle = PALETTE.paper; ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 2.2 * u;
    ctx.beginPath(); ctx.arc(x, y - 2 * u, 4.5 * u, Math.PI, 0); ctx.stroke();
    rrect(ctx, x - 6.5 * u, y - 2 * u, 13 * u, 10 * u, 2 * u); ctx.fill();
  }
  ctx.restore();
}
