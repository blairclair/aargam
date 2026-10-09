// Office gross-out: bug-gut splats, flying shell bits, wounded drips, and the oozing floor slime.
// Owned by: art-world. Cartoon goo (family audience): bright, glossy, silly. Never blood.
// All draws are floor-space at (x, y) = ground point; the caller has applied the camera.
import { TAU, rng, rgba, mix, shade, rrect, clamp01 } from './kit.js';

/** Goo palettes per bug type (goo = body colour, deep = rim/shadow, hi = wet highlight). */
export const GOO_COLORS = {
  // Syntax Beetle: a "code" bug, so mint/teal guts
  beetle: { goo: '#58e0b4', deep: '#16806a', hi: '#dcfff2', shell: '#2a3358', shellHi: '#5468a0', leg: '#141728' },
  // Packet Moth: sickly yellow-green
  moth: { goo: '#c9dc45', deep: '#76911a', hi: '#fbffd0', shell: '#ecdfc2', shellHi: '#fff8e6', leg: '#5a4630' },
  // Cable Spider: dark motor-oil ooze with a toxic green sheen
  cable_spider: { goo: '#2e3b30', deep: '#0e140f', hi: '#a6e38f', shell: '#383a46', shellHi: '#62667a', leg: '#2b2b33' },
};
const GOO_DEF = GOO_COLORS.beetle;

/** Smooth closed blob through `n` radial points (radii from rs[]), squashed to floor perspective. */
function blobPath(c, x, y, rs, sy = 0.6, rot = 0) {
  const n = rs.length, pts = [];
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; pts.push([x + Math.cos(a) * rs[i], y + Math.sin(a) * rs[i] * sy]); }
  c.beginPath();
  const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
  c.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  c.closePath();
}

/** A jointed bug leg (for debris + the twitch on a fresh splat). */
function leg(c, len, bend, col, w = 1.6) {
  c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = w;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(len * 0.5, -bend); c.lineTo(len, 0); c.stroke();
  c.fillStyle = col; c.beginPath(); c.arc(len * 0.5, -bend, w * 0.6, 0, TAU); c.fill();
}

/** Frayed cable end: insulation, then copper strands splaying out. */
function frayedCable(c, x, y, ang, len, t, spark) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.lineCap = 'round';
  c.strokeStyle = '#121219'; c.lineWidth = 3.4;
  c.beginPath(); c.moveTo(-len, 2); c.quadraticCurveTo(-len * 0.5, -4, 0, 0); c.stroke();
  c.strokeStyle = '#d9534f'; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(-len, 2); c.quadraticCurveTo(-len * 0.5, -4, 0, 0); c.stroke();
  c.strokeStyle = '#e6a34a'; c.lineWidth = 0.8;
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(3, i * 1.2, 6 + Math.abs(i), i * 2.6); c.stroke(); }
  if (spark > 0) {
    c.strokeStyle = rgba('#fff27a', spark); c.lineWidth = 1.2;
    const j = Math.sin(t * 70) * 2;
    c.beginPath(); c.moveTo(6, 0); c.lineTo(10, -3 + j); c.lineTo(9, 1); c.lineTo(14, -1 - j); c.stroke();
  }
  c.restore();
}

/**
 * Persistent floor splat where a bug burst.
 * o: { type, seed, r (size), age (s since death), ang (splatter direction, radians), alpha }
 */
export function drawGooSplat(ctx, game, x, y, o = {}) {
  const C = GOO_COLORS[o.type] ?? GOO_DEF;
  const R = rng(((o.seed ?? 1) * 9301 + 49297) | 0);
  const r = o.r ?? 18, age = o.age ?? 99, ang = o.ang ?? 0;
  const wet = clamp01(1 - age / 10); // glossy when fresh, settles into a matte stain
  const spider = o.type === 'cable_spider';
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  // splatter streaks + droplets flung along the kill direction
  const ca = Math.cos(ang), sa = Math.sin(ang);
  ctx.fillStyle = mix(C.goo, C.deep, 0.25 + 0.35 * (1 - wet));
  for (let i = 0; i < 7; i++) {
    const spread = (R() - 0.5) * 1.6, d = r * (0.8 + R() * 1.1);
    const a = ang + spread, dx = Math.cos(a) * d, dy = Math.sin(a) * d * 0.6;
    const s = 1.2 + R() * 2.6;
    ctx.beginPath(); ctx.ellipse(x + dx, y + dy, s * 1.5, s * 0.8, a, 0, TAU); ctx.fill();
    if (i < 3) { // tapered streak back toward the centre
      ctx.beginPath(); ctx.moveTo(x + dx * 0.45 - sa * s * 0.6, y + dy * 0.45 + ca * s * 0.4);
      ctx.lineTo(x + dx, y + dy); ctx.lineTo(x + dx * 0.45 + sa * s * 0.6, y + dy * 0.45 - ca * s * 0.4); ctx.fill();
    }
  }
  for (let i = 0; i < 5; i++) { const a = R() * TAU, d = r * (1 + R() * 0.7); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 0.8 + R() * 1.6, 0, TAU); ctx.fill(); }
  // main puddle
  const rs = []; for (let i = 0; i < 9; i++) rs.push(r * (0.65 + R() * 0.45));
  const rot = R() * TAU;
  ctx.fillStyle = rgba(C.deep, 0.85);
  blobPath(ctx, x, y + 1, rs.map((v) => v + 1.5), 0.6, rot); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.15, 1, x, y, r);
  g.addColorStop(0, mix(C.goo, C.hi, 0.25 * wet)); g.addColorStop(0.7, C.goo); g.addColorStop(1, mix(C.goo, C.deep, 0.5));
  ctx.fillStyle = g;
  ctx.globalAlpha *= 0.75 + 0.25 * wet;
  blobPath(ctx, x, y, rs, 0.6, rot); ctx.fill();
  // lumpy chunks in the goo
  ctx.fillStyle = rgba(C.deep, 0.55);
  for (let i = 0; i < 4; i++) { const a = R() * TAU, d = R() * r * 0.5; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 1.8 + R() * 2, 1.2 + R(), R() * 3, 0, TAU); ctx.fill(); }
  if (spider) {
    // rainbow oil sheen + a frayed cable stub lying in the ooze
    ctx.globalAlpha = (o.alpha ?? 1) * 0.35;
    ctx.strokeStyle = '#7fd8e6'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(x - r * 0.15, y - r * 0.05, r * 0.45, r * 0.18, 0.2, 0.3, 2.6); ctx.stroke();
    ctx.strokeStyle = '#d98ae6';
    ctx.beginPath(); ctx.ellipse(x - r * 0.1, y, r * 0.55, r * 0.22, 0.2, 0.5, 2.4); ctx.stroke();
    ctx.globalAlpha = o.alpha ?? 1;
    frayedCable(ctx, x + r * 0.35, y + r * 0.05, -0.4 + R() * 0.8, r * 0.9, game?.time ?? 0, clamp01(1.5 - age) * (Math.sin((game?.time ?? 0) * 30) > 0 ? 1 : 0.3));
  }
  // wet gloss
  if (wet > 0) {
    ctx.globalAlpha = (o.alpha ?? 1) * 0.7 * wet;
    ctx.fillStyle = C.hi;
    ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.16, r * 0.28, r * 0.08, -0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.18, y - r * 0.2, 1.3, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = o.alpha ?? 1;
  // a leg still twitching on a fresh splat
  if (age < 1.3 && (o.seed ?? 0) % 3 !== 0) {
    const k = 1 - age / 1.3, tw = Math.sin(age * 38) * 0.35 * k + Math.sin(age * 61) * 0.15 * k;
    ctx.save(); ctx.translate(x + r * 0.55 * Math.cos(rot), y + r * 0.3 * Math.sin(rot)); ctx.rotate(rot + tw);
    leg(ctx, 9, 3 + tw * 6, C.leg, 1.5);
    ctx.restore();
  }
  ctx.restore();
}

/** Tiny ooze drop (wounded bugs leave a trail of these; fresh hits spurt one). o: { type, seed, alpha, r } */
export function drawGooDrip(ctx, game, x, y, o = {}) {
  const C = GOO_COLORS[o.type] ?? GOO_DEF;
  const r = o.r ?? 2.6, s = ((o.seed ?? 0) % 7) / 7;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.fillStyle = rgba(C.deep, 0.8); ctx.beginPath(); ctx.ellipse(x, y + 0.6, r * 1.15, r * 0.7, s, 0, TAU); ctx.fill();
  ctx.fillStyle = C.goo; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, s, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 1.3, y + r * 0.4, r * 0.35, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba(C.hi, 0.7); ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.3, 0, TAU); ctx.fill();
  ctx.restore();
}

/**
 * A chunk flung off a bursting bug: shell shard, leg, wing scrap or plug.
 * o: { type, piece: 'shell'|'leg'|'wing'|'plug', rot, z (height above floor), seed, alpha }
 */
export function drawGooPiece(ctx, game, x, y, o = {}) {
  const C = GOO_COLORS[o.type] ?? GOO_DEF;
  const z = o.z ?? 0, seed = o.seed ?? 0;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  if (z > 0.5) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, 4, 1.6, 0, 0, TAU); ctx.fill(); }
  ctx.translate(x, y - z - 2);
  ctx.rotate(o.rot ?? 0);
  switch (o.piece) {
    case 'leg': leg(ctx, 10, 3 + (seed % 3), C.leg, 1.7); break;
    case 'wing': {
      ctx.fillStyle = rgba(C.shell, 0.9); ctx.strokeStyle = '#7d6a4a'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-2, -7, 5, -4); ctx.lineTo(3, -1); ctx.lineTo(6, 1); ctx.quadraticCurveTo(0, 4, -5, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = rgba(C.goo, 0.8); ctx.beginPath(); ctx.arc(-3.6, 0.2, 1.2, 0, TAU); ctx.fill();
      break;
    }
    case 'plug': {
      ctx.fillStyle = '#c9ccd4'; rrect(ctx, -2.5, -2.5, 5, 5, 1); ctx.fill();
      ctx.fillStyle = '#e6c25a'; ctx.fillRect(-1.8, 2.5, 1, 2.4); ctx.fillRect(0.8, 2.5, 1, 2.4);
      ctx.strokeStyle = '#2b2b33'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.quadraticCurveTo(2, -7, -2, -10); ctx.stroke();
      break;
    }
    default: { // shell shard: jagged glossy fragment with a smear of goo on the broken edge
      const g = ctx.createLinearGradient(-5, -4, 5, 4);
      g.addColorStop(0, C.shellHi); g.addColorStop(1, C.shell);
      ctx.fillStyle = g; ctx.strokeStyle = shade(C.shell, -0.5); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-6, -1); ctx.quadraticCurveTo(-2, -6, 5, -3); ctx.lineTo(3, -1); ctx.lineTo(6, 1); ctx.lineTo(1, 2); ctx.lineTo(-2, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.goo; ctx.beginPath(); ctx.ellipse(2, 1.6, 3, 1.3, 0.3, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-2, -3, 2, 0.7, -0.4, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Wounded look for bug painters (call in the painter's local space, over the body).
 * Cracks across the shell + a goo drop that swells and falls. k = 0..1 how badly hurt.
 */
export function drawWounds(c, type, cx, cy, rx, ry, k, t, seed = 0) {
  const C = GOO_COLORS[type] ?? GOO_DEF;
  const R = rng(((seed * 1000) | 0) + 77);
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  // cracks: dark zigzags with a pale broken edge, oozing at the start
  const n = 1 + Math.round(k * 2);
  for (let i = 0; i < n; i++) {
    const a = -1.2 + R() * 1.6 + i * 1.3;
    let px = cx + Math.cos(a) * rx * 0.15, py = cy + Math.sin(a) * ry * 0.15;
    const pts = [[px, py]];
    for (let s = 1; s <= 4; s++) {
      const d = s / 4;
      pts.push([cx + Math.cos(a + (s % 2 ? 0.35 : -0.3)) * rx * (0.2 + 0.75 * d), cy + Math.sin(a + (s % 2 ? 0.35 : -0.3)) * ry * (0.2 + 0.75 * d)]);
    }
    c.strokeStyle = rgba(C.hi, 0.6); c.lineWidth = 1.6;
    c.beginPath(); pts.forEach(([x, y], j) => (j ? c.lineTo(x + 0.4, y + 0.4) : c.moveTo(x + 0.4, y + 0.4))); c.stroke();
    c.strokeStyle = '#05060c'; c.lineWidth = 0.9;
    c.beginPath(); pts.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    c.fillStyle = C.goo;
    c.beginPath(); c.ellipse(pts[1][0], pts[1][1], 1.6, 1, a, 0, TAU); c.fill();
  }
  // goo bead oozing from the underside: swells, stretches, drops (loop ~1.1s)
  const ph = (t * 0.9 + seed * 3) % 1;
  const bx = cx - rx * 0.3, by = cy + ry * 0.85;
  const swell = clamp01(ph / 0.75), fall = clamp01((ph - 0.75) / 0.25);
  c.fillStyle = C.goo;
  c.beginPath(); c.ellipse(bx, by, 1.6 + swell * 0.6, 1, 0, 0, TAU); c.fill();
  if (fall <= 0) {
    c.beginPath(); c.moveTo(bx - 1.2, by); c.quadraticCurveTo(bx - 1.4, by + 2 + swell * 3, bx, by + 2.4 + swell * 3.6); c.quadraticCurveTo(bx + 1.4, by + 2 + swell * 3, bx + 1.2, by); c.fill();
  } else {
    c.beginPath(); c.arc(bx, by + 6 + fall * 9, 1.2 * (1 - fall * 0.4), 0, TAU); c.fill();
  }
  c.fillStyle = rgba(C.hi, 0.6); c.beginPath(); c.arc(bx - 0.5, by + 1 + swell, 0.5, 0, TAU); c.fill();
  c.restore();
}

/** Small goo spurt sprite (on hit). o: { type, k 0..1 (life), ang } */
export function drawGooSpurt(ctx, game, x, y, o = {}) {
  const C = GOO_COLORS[o.type] ?? GOO_DEF;
  const k = clamp01(o.k ?? 0), a = o.ang ?? 0;
  ctx.save();
  ctx.globalAlpha *= 1 - k;
  ctx.fillStyle = C.goo;
  for (let i = -1; i <= 1; i++) {
    const aa = a + i * 0.45, d = 4 + k * 16;
    ctx.beginPath(); ctx.ellipse(x + Math.cos(aa) * d, y + Math.sin(aa) * d - k * 4 + k * k * 10, 2.4 - k, 1.6, aa, 0, TAU); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(x, y, 3.5 * (1 - k * 0.6), 0, TAU); ctx.fill();
  ctx.restore();
}

const GLYPHS = ['{', '}', ';', '0', '1', '//', '()', '=>', '[]', '!='];

/**
 * Oozing floor slime (office, second half). Glossy translucent green that wobbles, bubbles and pops,
 * with faint code glyphs drifting inside.
 * o: { t (scene time), age (s since spawn), seed, warn 0..1 (bubbling telegraph progress; 1 = done),
 *      grow 0..1 (spread), life 0..1 (1 = fresh, 0 = dried up) }
 */
export function drawSlime(ctx, game, x, y, r, o = {}) {
  const t = o.t ?? 0, seed = o.seed ?? 1;
  const warn = o.warn ?? 1, grow = o.grow ?? 1, life = o.life ?? 1;
  const R = rng(((seed * 7919) | 0) + 13);
  const n = 11, base = [], ph = [];
  for (let i = 0; i < n; i++) { base.push(0.8 + R() * 0.3); ph.push(R() * TAU); }
  ctx.save();
  if (warn < 1) {
    // telegraph: a dark wet stain swelling at the spot, bubbles boiling up through the floorboards,
    // and a faint dashed ring at the size it will spread to.
    const k = warn;
    ctx.globalAlpha = 0.45 + 0.4 * k;
    ctx.strokeStyle = '#7dff6a'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 20;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = 'rgba(30,70,25,0.6)';
    blobPath(ctx, x, y, base.map((b) => b * r * (0.15 + 0.3 * k)), 0.6); ctx.fill();
    for (let i = 0; i < 9; i++) {
      const bp = (t * (1.6 + (i % 3) * 0.5) + i * 0.37 + seed) % 1;
      const a = i * 2.4 + seed, d = r * (0.1 + 0.4 * k) * ((i * 0.37) % 1);
      const bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d * 0.6 - bp * 6;
      const br = (2 + (i % 3) * 1.4) * (0.5 + k) * (1 - bp * 0.3);
      ctx.globalAlpha = 0.9 * (1 - Math.max(0, bp - 0.8) * 5);
      ctx.fillStyle = '#8cf26a'; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(bx - br * 0.35, by - br * 0.35, br * 0.3, 0, TAU); ctx.fill();
    }
    ctx.restore();
    return;
  }
  const size = r * (0.25 + 0.75 * easeOut(grow)) * (0.7 + 0.3 * life);
  const wob = (i, amp) => base[i] * size * (1 + Math.sin(t * 1.3 + ph[i]) * amp + Math.sin(t * 2.1 + ph[i] * 2) * amp * 0.5);
  const fresh = clamp01(life * 1.6);
  const goo = mix('#9aa04a', '#62e04a', fresh), deep = mix('#4c5524', '#137a2a', fresh);
  const outer = base.map((_, i) => wob(i, 0.06));
  ctx.globalAlpha = clamp01(life * 3);
  // wet sheen on the boards around it
  ctx.fillStyle = 'rgba(140,255,110,0.13)';
  blobPath(ctx, x, y + 1, outer.map((v) => v * 1.18 + 4), 0.6); ctx.fill();
  // satellite droplets + drool tendrils (reach out further while it spreads)
  ctx.fillStyle = rgba(goo, 0.75);
  for (let i = 0; i < 6; i++) {
    const a = ph[i] * 3 + 0.4, d = size * (1.06 + 0.12 * Math.sin(t * 1.7 + i) + 0.3 * (1 - grow)), rr = 2 + (i % 3) * 1.4;
    ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, rr * 1.3, rr * 0.8, a, 0, TAU); ctx.fill();
  }
  // thick dark rim (gives it a body), then a translucent glossy fill the floor shows through
  ctx.fillStyle = rgba(deep, 0.8);
  blobPath(ctx, x, y + 2.5, outer.map((v) => v + 2.5), 0.6); ctx.fill();
  const g = ctx.createRadialGradient(x - size * 0.3, y - size * 0.25, size * 0.05, x, y, size * 1.05);
  g.addColorStop(0, rgba(mix('#d8ffb0', '#c8c890', 1 - fresh), 0.62));
  g.addColorStop(0.5, rgba(goo, 0.5));
  g.addColorStop(0.85, rgba(goo, 0.62));
  g.addColorStop(1, rgba(deep, 0.85));
  ctx.fillStyle = g;
  blobPath(ctx, x, y, outer, 0.6); ctx.fill();
  // darker murky core swirl + suspended gunk
  ctx.fillStyle = rgba(deep, 0.28);
  blobPath(ctx, x + size * 0.1, y + size * 0.06, base.map((_, i) => wob((i + 3) % n, 0.12) * 0.5), 0.6); ctx.fill();
  ctx.fillStyle = rgba(deep, 0.45);
  for (let i = 0; i < 5; i++) { const a = ph[i + 2] + t * 0.18, d = size * 0.5 * base[i]; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.55, 1.2 + (i % 2), 0, TAU); ctx.fill(); }
  // glossy rim: bright edge line along the top-left, like a thick gel lip
  ctx.strokeStyle = `rgba(225,255,200,${0.8 * fresh})`; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(x, y - 1, outer[0] * 0.86, outer[0] * 0.5, 0, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  ctx.strokeStyle = `rgba(225,255,200,${0.45 * fresh})`; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(x, y, size * 0.9, size * 0.54, 0, Math.PI * 0.15, Math.PI * 0.45); ctx.stroke();
  // faint code glyphs drifting inside (laptop bugs became real; so did their slime)
  ctx.font = 'bold 11px Menlo, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 4; i++) {
    const a = ph[i + 3] + t * 0.25 * (i % 2 ? 1 : -1), d = size * 0.5 * base[i];
    ctx.fillStyle = `rgba(10,70,30,${0.5 * fresh})`;
    ctx.fillText(GLYPHS[(seed + i * 3) % GLYPHS.length], x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5);
  }
  // bubbles: rise, swell, pop (ring + specks)
  for (let i = 0; i < 8; i++) {
    const per = 1.3 + (i % 3) * 0.55, cyc = (t + ph[i] * 0.5) / per, bp = cyc % 1, k = Math.floor(cyc);
    const a = ph[(i + 5) % n] * 2 + k * 1.7, d = size * 0.7 * ((i * 0.31 + k * 0.17) % 1);
    const bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d * 0.6;
    const big = 2.4 + (i % 3) * 1.8;
    if (bp < 0.82) {
      const br = big * (0.35 + bp) * fresh;
      ctx.fillStyle = 'rgba(170,255,140,0.55)'; ctx.beginPath(); ctx.arc(bx, by - br * 0.4, br, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(15,95,35,0.65)'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(bx - br * 0.35, by - br * 0.8, br * 0.3, 0, TAU); ctx.fill();
    } else {
      const pk = (bp - 0.82) / 0.18, br = big * 1.17 * fresh;
      ctx.strokeStyle = `rgba(225,255,205,${0.8 * (1 - pk)})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(bx, by, br + pk * 6, (br + pk * 6) * 0.55, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(160,255,130,${0.9 * (1 - pk)})`;
      for (let s2 = 0; s2 < 5; s2++) { const sa = s2 * 1.3 + i; ctx.beginPath(); ctx.arc(bx + Math.cos(sa) * (br + pk * 8), by + Math.sin(sa) * (br + pk * 8) * 0.55 - pk * 5, 1.1, 0, TAU); ctx.fill(); }
    }
  }
  // specular shine that slides with the wobble
  ctx.fillStyle = `rgba(255,255,255,${0.8 * fresh})`;
  ctx.beginPath(); ctx.ellipse(x - size * 0.32 + Math.sin(t * 1.1 + seed) * 2, y - size * 0.2, size * 0.24, size * 0.06, -0.12, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + size * 0.3, y + size * 0.08, size * 0.1, size * 0.035, 0.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x - size * 0.02, y - size * 0.28, 1.8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x + size * 0.12, y - size * 0.24, 1.1, 0, TAU); ctx.fill();
  // drying: cracked crust specks at the edge
  if (life < 0.5) {
    ctx.strokeStyle = `rgba(70,80,30,${(0.5 - life) * 1.2})`; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) { const a = ph[i] * 2, d = size * 0.8; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6); ctx.lineTo(x + Math.cos(a + 0.2) * d * 0.7, y + Math.sin(a + 0.2) * d * 0.42); ctx.stroke(); }
  }
  ctx.restore();
}
const easeOut = (k) => 1 - (1 - clamp01(k)) ** 3;
