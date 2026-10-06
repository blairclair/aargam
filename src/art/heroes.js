// Hero chibis + photo portraits. Owned by: presentation.
// Big-head mode: the real photo face is the head (circular crop, never distorted/recolored/mirrored).
import { HEROES, PALETTE } from '../core/theme.js';
import { cached, makeCanvas, shade, rrect, shadow, facingOf, rgba } from './util.js';

const TAU = Math.PI * 2;

// ---------- portraits ----------
/** Circular crop of a portrait image cached at a fixed resolution bucket. */
function portraitCanvas(game, id, px, tight) {
  const key = tight ? (HEROES[id]?.face ?? HEROES[id]?.portrait) : HEROES[id]?.portrait;
  let img = game?.assets?.image?.(key);
  if (!img && tight) { img = game?.assets?.image?.(HEROES[id]?.portrait); tight = false; }
  if (!img || !img.complete || !img.naturalWidth) return null;
  return cached(`portrait:${id}:${px}:${tight ? 't' : 'w'}`, px, px, (c) => {
    c.imageSmoothingQuality = 'high';
    c.beginPath(); c.arc(px / 2, px / 2, px / 2, 0, TAU); c.clip();
    // centre-crop the square (images are square already, but be safe)
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    c.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, px, px);
  });
}

/**
 * Circular photo portrait centered at (x, y), radius r.
 * o: { border?: px, borderColor?, ring?: color (outer glow ring), ringWidth?, alpha?, grey?: bool (knocked-out dim),
 *      tight?: bool (use the face-only crop; in-world heads) }
 */
export function drawPortrait(ctx, game, id, x, y, r, o = {}) {
  const h = HEROES[id];
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.ring) {
    ctx.fillStyle = o.ring;
    ctx.beginPath(); ctx.arc(x, y, r + (o.ringWidth ?? 4), 0, TAU); ctx.fill();
  }
  // effective on-screen size picks the cache bucket
  const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0 };
  const scr = r * 2 * Math.hypot(m.a, m.b);
  const px = scr <= 40 ? 48 : scr <= 100 ? 128 : 256;
  const pc = h ? portraitCanvas(game, id, px, !!o.tight) : null;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = h?.look.skin ?? PALETTE.paper; ctx.fill();
  if (pc) ctx.drawImage(pc, x - r, y - r, r * 2, r * 2);
  if (o.grey) { ctx.fillStyle = 'rgba(27,34,56,0.55)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  if ((o.border ?? 2) > 0) {
    ctx.lineWidth = o.border ?? 2; ctx.strokeStyle = o.borderColor ?? PALETTE.ink;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

// ---------- scratch canvas for hit flash ----------
let scratch = null;
/** Render fn into an offscreen buffer (origin at ox,oy in a w*h box), tint white by flash, blit. */
function withFlash(ctx, w, h, ox, oy, flash, fn) {
  if (!(flash > 0)) { fn(ctx); return; }
  const m = ctx.getTransform();
  const k = Math.min(4, Math.max(1, Math.hypot(m.a, m.b)));
  const W = Math.ceil(w * k), H = Math.ceil(h * k);
  if (!scratch || scratch.width < W || scratch.height < H) scratch = makeCanvas(Math.max(W, scratch?.width ?? 0), Math.max(H, scratch?.height ?? 0));
  const s = scratch.getContext('2d');
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalAlpha = 1; s.globalCompositeOperation = 'source-over';
  s.clearRect(0, 0, W, H);
  s.setTransform(k, 0, 0, k, ox * k, oy * k);
  fn(s);
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'source-atop';
  s.fillStyle = `rgba(255,255,255,${Math.min(1, flash) * 0.85})`;
  s.fillRect(0, 0, W, H);
  s.globalCompositeOperation = 'source-over';
  ctx.drawImage(scratch, 0, 0, W, H, -ox, -oy, w, h);
}
export { withFlash };

// ---------- body parts ----------
function limb(c, x1, y1, x2, y2, w, color) {
  c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
}
function shoe(c, x, y, color, sole) {
  c.fillStyle = sole; rrect(c, x - 3, y - 2.5, 8, 3.5, 1.5); c.fill();
  c.fillStyle = color; rrect(c, x - 3, y - 4.5, 7.5, 3.5, 2); c.fill();
}

const LOOK = {
  aaron: {
    tee: PALETTE.tee, teeStripe: shade(PALETTE.tee, -0.12), shorts: HEROES.aaron.look.pants,
    skin: HEROES.aaron.look.skin, shoe: '#e6e8ec', sole: '#454b58', tall: 3,
  },
  victoria: {
    jacket: PALETTE.denim, jacketDark: shade(PALETTE.denim, -0.25), jacketLight: shade(PALETTE.denim, 0.25),
    shirt: HEROES.victoria.look.shirt, jeans: shade(HEROES.victoria.look.pants, 0.32), jeansDark: shade(HEROES.victoria.look.pants, 0.12),
    skin: HEROES.victoria.look.skin, hair: HEROES.victoria.look.hair, hairDark: shade(HEROES.victoria.look.hair, -0.22),
    hairLight: shade(HEROES.victoria.look.hair, 0.25), shoe: PALETTE.paper, sole: '#cfc6b4', tall: 0,
  },
};

/** Compute a pose from anim state. */
function pose(anim, t, prog) {
  const P = { bob: 0, lean: 0, legA: 0, legB: 0, liftA: 0, liftB: 0, armA: 0, armB: 0, squash: 1, spin: 0 };
  if (anim === 'walk') {
    const p = t * 11;
    P.legA = Math.sin(p) * 4; P.legB = -P.legA;
    P.liftA = Math.max(0, -Math.cos(p)) * 2.2; P.liftB = Math.max(0, Math.cos(p)) * 2.2;
    P.armA = -Math.sin(p) * 0.6; P.armB = -P.armA;
    P.bob = -Math.abs(Math.sin(p)) * 2.2;
    P.lean = 0.06;
  } else if (anim === 'dash') {
    P.lean = 0.35; P.legA = 6; P.legB = -6; P.liftB = 3; P.armA = -1.2; P.armB = -1.0; P.bob = -2;
  } else if (anim === 'hurt') {
    const k = 1 - prog;
    P.lean = -0.28 * k + Math.sin(t * 40) * 0.05 * k; P.armA = -1.8 * k; P.armB = 1.6 * k; P.squash = 1 - 0.08 * k;
  } else if (anim === 'down') {
    P.spin = 1;
  } else if (anim === 'attack') {
    P.lean = 0.12 * Math.sin(prog * Math.PI); P.legA = 2.5; P.legB = -2;
  } else {
    P.bob = Math.sin(t * 3.2) * 0.9; P.armA = Math.sin(t * 3.2) * 0.06; P.armB = -P.armA;
  }
  return P;
}

function drawLegs(c, L, P, id) {
  const hipY = -15;
  const pairs = [[-3.5, P.legB, P.liftB, 0.85], [3.5, P.legA, P.liftA, 1]];
  for (const [hx, sw, lift, k] of pairs) {
    const fx = hx + sw, fy = -2 - lift;
    if (id === 'aaron') {
      limb(c, hx, hipY, hx + sw * 0.6, -8 - lift * 0.5, 6, k < 1 ? shade(L.shorts, -0.15) : L.shorts);
      limb(c, hx + sw * 0.6, -8 - lift * 0.5, fx, fy, 3.6, k < 1 ? shade(L.skin, -0.1) : L.skin);
    } else {
      limb(c, hx, hipY, fx, fy, 5, k < 1 ? L.jeansDark : L.jeans);
    }
    shoe(c, fx, fy + 2, L.shoe, L.sole);
  }
}

function drawAaronTorso(c, L) {
  // grey striped tee
  c.fillStyle = L.tee; rrect(c, -8.5, -33, 17, 20, 5); c.fill();
  c.save(); rrect(c, -8.5, -33, 17, 20, 5); c.clip();
  c.fillStyle = L.teeStripe;
  for (let y = -29; y < -13; y += 4.5) c.fillRect(-9, y, 18, 1.4);
  c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(-8.5, -33, 4, 20);
  c.restore();
  // belt line / shorts top
  c.fillStyle = L.shorts; rrect(c, -8, -15.5, 16, 4, 2); c.fill();
}

function drawVictoriaTorso(c, L) {
  // dark sweater underneath
  c.fillStyle = L.shirt; rrect(c, -7.5, -33, 15, 19, 4); c.fill();
  // jeans top
  c.fillStyle = L.jeans; rrect(c, -7.5, -16, 15, 4, 2); c.fill();
  // denim jacket: two front panels, open in the middle
  c.fillStyle = L.jacket;
  c.beginPath();
  c.moveTo(-9, -31); c.quadraticCurveTo(-9.5, -34, -5, -34); c.lineTo(-1.5, -26); c.lineTo(-2.2, -14); c.lineTo(-9, -14.5); c.closePath(); c.fill();
  c.beginPath();
  c.moveTo(9, -31); c.quadraticCurveTo(9.5, -34, 5, -34); c.lineTo(2.5, -26); c.lineTo(3.2, -14); c.lineTo(9, -14.5); c.closePath(); c.fill();
  // collar lapels
  c.fillStyle = L.jacketLight;
  c.beginPath(); c.moveTo(-5, -34); c.lineTo(-1.5, -26); c.lineTo(-6, -29); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(5, -34); c.lineTo(2.5, -26); c.lineTo(7, -29); c.closePath(); c.fill();
  // seams, pocket flaps, waistband, buttons
  c.strokeStyle = L.jacketDark; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(-8.5, -17); c.lineTo(-2.4, -17); c.moveTo(3, -17); c.lineTo(8.5, -17); c.stroke();
  c.fillStyle = L.jacketDark; c.fillRect(-7.5, -25, 4, 2); c.fillRect(4, -25, 4, 2);
  c.fillStyle = '#e6c27a'; c.fillRect(-5.8, -24.6, 0.9, 0.9); c.fillRect(5.8, -24.6, 0.9, 0.9);
}

function drawArm(c, id, L, sx, sy, ang, len, back) {
  const ex = sx + Math.sin(ang) * len, ey = sy + Math.cos(ang) * len;
  const sleeve = id === 'aaron' ? (back ? shade(L.tee, -0.18) : L.tee) : (back ? L.jacketDark : L.jacket);
  if (id === 'aaron') {
    const mx = sx + Math.sin(ang) * len * 0.42, my = sy + Math.cos(ang) * len * 0.42;
    limb(c, sx, sy, mx, my, 5.2, sleeve);
    limb(c, mx, my, ex, ey, 3.4, back ? shade(L.skin, -0.12) : L.skin);
  } else {
    limb(c, sx, sy, ex, ey, 4.6, sleeve);
    c.fillStyle = back ? shade(L.skin, -0.12) : L.skin;
    c.beginPath(); c.arc(ex, ey, 1.9, 0, TAU); c.fill();
  }
  return [ex, ey];
}

function drawPole(c, hx, hy, ang, len = 30) {
  // hiking pole: aluminium shaft, cork grip, strap, little basket near the tip
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const tx = hx + dx * len, ty = hy + dy * len;
  const bx = hx - dx * 4, by = hy - dy * 4;
  limb(c, bx, by, tx, ty, 2.2, '#9aa3b5');
  limb(c, bx, by, bx + dx * 2, by + dy * 2, 2.2, '#c4a07a');
  limb(c, hx - dx * 3, hy - dy * 3, hx + dx * 5, hy + dy * 5, 3.2, '#5a3a2a');
  c.strokeStyle = PALETTE.sunDeep; c.lineWidth = 1;
  c.beginPath(); c.arc(bx - dx * 1.5, by - dy * 1.5, 2, 0, TAU); c.stroke();
  c.strokeStyle = PALETTE.ink; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(tx - dx * 5 - dy * 2.5, ty - dy * 5 + dx * 2.5); c.lineTo(tx - dx * 5 + dy * 2.5, ty - dy * 5 - dx * 2.5); c.stroke();
}

function drawScoopInHand(c, x, y, r = 3.2) {
  c.fillStyle = '#d9a35e'; c.beginPath(); c.moveTo(x - r * 0.8, y); c.lineTo(x + r * 0.8, y); c.lineTo(x, y + r * 1.8); c.closePath(); c.fill();
  c.fillStyle = PALETTE.mint; c.beginPath(); c.arc(x, y - 0.4, r, 0, TAU); c.fill();
  c.fillStyle = PALETTE.choc; c.fillRect(x - 1.2, y - 1.6, 1, 1); c.fillRect(x + 0.8, y - 0.4, 1, 1);
}

// Victoria's long wavy honey-blond hair: smooth wavy silhouettes (no beads, no hard edges).
// Builds one side's outer edge as a list of points from temple to tip.
function hairEdge(s, hy, r, len, out, sway, phase = 0) {
  const pts = [];
  const n = 7;
  for (let k = 0; k <= n; k++) {
    const f = k / n;
    const y = hy - r * 0.55 + f * (r * 1.0 + len);
    const widen = Math.sin(Math.min(1, f * 1.6) * Math.PI / 2) * 4;
    const wave = Math.sin(f * 9 + phase) * 2.2 * f;
    pts.push([s * (r * out + widen + wave) + sway * f * 2.5, y]);
  }
  return pts;
}
function smoothThrough(c, pts) {
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], [nx, ny] = pts[i + 1];
    c.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  const last = pts[pts.length - 1];
  c.lineTo(last[0], last[1]);
}
function hairMass(c, hy, r, len, out, sway, phase) {
  const R = hairEdge(1, hy, r, len, out, sway, phase), Lf = hairEdge(-1, hy, r, len, out, sway, phase + 1.3);
  c.beginPath();
  c.moveTo(Lf[0][0], Lf[0][1]);
  c.arc(0, hy - 1, r * out * 1.02, Math.PI * 1.12, Math.PI * 1.88); // crown
  c.lineTo(R[0][0], R[0][1]);
  smoothThrough(c, R);
  // scalloped wavy ends
  const tipR = R[R.length - 1], tipL = Lf[Lf.length - 1];
  const yb = Math.max(tipR[1], tipL[1]);
  c.quadraticCurveTo(tipR[0] * 0.75, yb + 4, tipR[0] * 0.5, yb - 1);
  c.quadraticCurveTo(0, yb - 6, tipL[0] * 0.5, yb - 1);
  c.quadraticCurveTo(tipL[0] * 0.75, yb + 4, tipL[0], tipL[1]);
  const back = Lf.slice().reverse();
  smoothThrough(c, back);
  c.closePath();
  c.fill();
}
/** Dark underlayer: crown + long wavy hair down to mid-torso (drawn BEHIND the body). */
function drawVictoriaHairBack(c, L, hy, r, sway = 0) {
  c.fillStyle = L.hairDark;
  hairMass(c, hy, r, r * 1.05, 1.08, sway, 0);
  c.strokeStyle = shade(L.hairDark, -0.3); c.lineWidth = 1; c.stroke();
}
/** Mid layer: lighter lengths falling over the shoulders (over the body, under the face). */
function drawVictoriaHairOver(c, L, hy, r, sway = 0) {
  c.fillStyle = L.hair;
  hairMass(c, hy, r, r * 0.8, 0.98, sway, 0.6);
  c.strokeStyle = L.hairLight; c.lineWidth = 1.1; c.lineCap = 'round';
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * r * 1.02, hy - r * 0.1);
    c.bezierCurveTo(s * r * 1.3, hy + r * 0.4, s * r * 0.95, hy + r * 0.8, s * r * 1.2 + sway * 2, hy + r * 1.35);
    c.stroke();
    c.strokeStyle = L.hairDark; c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(s * r * 1.15, hy + r * 0.2);
    c.bezierCurveTo(s * r * 1.35, hy + r * 0.6, s * r * 1.1, hy + r * 1.0, s * r * 1.3 + sway * 2, hy + r * 1.5);
    c.stroke();
    c.strokeStyle = L.hairLight; c.lineWidth = 1.1;
  }
}
/** Top layer: two soft locks framing the face + crown volume with a side part (over the rim only). */
function drawVictoriaHairFront(c, L, hy, r, t, sway = 0) {
  const sw = Math.sin(t * 2.4) * 0.5 + sway * 0.5;
  for (const s of [-1, 1]) {
    c.fillStyle = L.hair;
    c.beginPath();
    c.moveTo(s * r * 0.55, hy - r * 0.85);
    c.bezierCurveTo(s * r * 1.0, hy - r * 0.55, s * r * 0.82, hy + r * 0.1, s * (r * 0.95 + sw), hy + r * 0.6);
    c.bezierCurveTo(s * r * 1.02, hy + r * 0.9, s * r * 0.9, hy + r * 1.15, s * (r * 1.05 + sw), hy + r * 1.35);
    c.bezierCurveTo(s * r * 1.35, hy + r * 1.0, s * r * 1.22, hy + r * 0.45, s * r * 1.22, hy);
    c.bezierCurveTo(s * r * 1.22, hy - r * 0.6, s * r * 0.95, hy - r * 0.95, s * r * 0.55, hy - r * 0.85);
    c.fill();
    c.strokeStyle = L.hairLight; c.lineWidth = 0.9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(s * r * 1.08, hy - r * 0.45); c.bezierCurveTo(s * r * 1.15, hy, s * r * 0.98, hy + r * 0.5, s * r * 1.12, hy + r * 1.05); c.stroke();
  }
  // crown with a soft side part
  c.fillStyle = L.hair;
  c.beginPath();
  c.arc(0, hy, r * 1.1, Math.PI * 1.08, Math.PI * 1.92);
  c.bezierCurveTo(r * 0.7, hy - r * 0.7, r * 0.35, hy - r * 0.86, r * 0.15, hy - r * 0.9);
  c.quadraticCurveTo(-r * 0.4, hy - r * 0.84, -r * 1.0, hy - r * 0.3);
  c.closePath(); c.fill();
  c.strokeStyle = L.hairLight; c.lineWidth = 1.1; c.lineCap = 'round';
  c.beginPath(); c.moveTo(r * 0.12, hy - r * 1.05); c.quadraticCurveTo(-r * 0.5, hy - r * 0.98, -r * 0.92, hy - r * 0.42); c.stroke();
  c.beginPath(); c.moveTo(r * 0.22, hy - r * 1.04); c.quadraticCurveTo(r * 0.7, hy - r * 0.92, r * 0.98, hy - r * 0.48); c.stroke();
  c.strokeStyle = L.hairDark; c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(r * 0.16, hy - r * 1.08); c.lineTo(r * 0.14, hy - r * 0.9); c.stroke();
}
/** Aaron: short swept strawberry-blond hair peeking over the rim. */
function drawAaronHair(c, hy, r) {
  const hair = HEROES.aaron.look.hair, light = shade(hair, 0.3), dark = shade(hair, -0.15);
  c.fillStyle = dark;
  c.beginPath(); c.arc(0, hy, r + 1.5, Math.PI * 1.1, Math.PI * 1.9); c.arc(0, hy, r - 2, Math.PI * 1.9, Math.PI * 1.1, true); c.closePath(); c.fill();
  // swept-up quiff: a few soft rounded flicks leaning the same way
  const tufts = [[-0.84, 2.5], [-0.72, 3.8], [-0.6, 4.6], [-0.48, 4.4], [-0.36, 3.4], [-0.24, 2.2]];
  for (const [f, h] of tufts) {
    const a = f * Math.PI;
    const bx = Math.cos(a - 0.1) * (r - 1.5), by = hy + Math.sin(a - 0.1) * (r - 1.5);
    const nx = Math.cos(a + 0.16) * (r - 1.5), ny = hy + Math.sin(a + 0.16) * (r - 1.5);
    const tx = Math.cos(a + 0.12) * (r + h), ty = hy + Math.sin(a + 0.12) * (r + h);
    c.fillStyle = hair;
    c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(Math.cos(a - 0.05) * (r + h * 0.9), hy + Math.sin(a - 0.05) * (r + h * 0.9), tx, ty); c.quadraticCurveTo(nx + (tx - nx) * 0.3, ny + (ty - ny) * 0.3, nx, ny); c.closePath(); c.fill();
  }
  c.strokeStyle = light; c.lineWidth = 0.9; c.lineCap = 'round';
  c.beginPath(); c.arc(0, hy, r + 1.8, Math.PI * 1.3, Math.PI * 1.62); c.stroke();
}

function speedLines(c, t, n = 4) {
  c.strokeStyle = 'rgba(255,246,229,0.75)'; c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const y = -8 - i * 10 + Math.sin(t * 30 + i) * 1.5;
    const l = 10 + ((i * 7 + Math.floor(t * 30)) % 9);
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-14 - l, y); c.lineTo(-14, y); c.stroke();
  }
}

/**
 * Draw a hero. See sprites.js JSDoc for options.
 */
export function drawHeroImpl(ctx, game, id, x, y, o = {}) {
  const L = LOOK[id] ?? LOOK.aaron;
  const hid = LOOK[id] ? id : 'aaron';
  const s = o.scale ?? 1;
  const anim = o.anim ?? 'idle';
  const t = o.t ?? game?.time ?? 0;
  const loopDur = anim === 'attack' ? 0.4 : 0.35;
  const prog = Math.max(0, Math.min(1, o.progress ?? ((t / loopDur) % 1)));
  const { ang, dir } = facingOf(o.facing);
  const P = pose(anim, t, prog);
  const tall = L.tall; // Aaron is a touch taller
  const headR = 17;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;

  // ground shadow
  shadow(ctx, anim === 'down' ? 22 : 13, anim === 'down' ? 6 : 4.5, 0.28);

  if (anim === 'down') {
    // flat on the ground, swirling snowflakes for "dizzy"
    ctx.save();
    ctx.translate(-dir * 4, -4);
    ctx.rotate(-dir * Math.PI / 2 * 0.92);
    drawBody(ctx);
    ctx.restore();
    const hx = -dir * 28, hy = -9;
    if (hid === 'victoria') { ctx.save(); ctx.translate(hx, hy); ctx.rotate(-dir * 1.45); drawVictoriaHairBack(ctx, L, 0, 13); ctx.restore(); }
    drawPortrait(ctx, game, hid, hx, hy, 13, { grey: true, border: 1.2, borderColor: 'rgba(16,19,31,0.5)', tight: true });
    if (hid === 'aaron') { ctx.save(); ctx.translate(hx, hy); ctx.rotate(-dir * 1.45); drawAaronHair(ctx, 0, 13); ctx.restore(); }
    if (hid === 'victoria') { ctx.save(); ctx.translate(hx, hy); ctx.rotate(-dir * 1.45); drawVictoriaHairFront(ctx, L, 0, 13, t); ctx.restore(); }
    for (let i = 0; i < 3; i++) {
      const a = t * 3 + i * TAU / 3;
      ctx.fillStyle = PALETTE.ice;
      ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('*', hx + Math.cos(a) * 12, hy - 16 + Math.sin(a) * 3);
    }
    ctx.restore();
    return;
  }

  if (anim === 'dash') { ctx.save(); ctx.scale(dir, 1); speedLines(ctx, t); ctx.restore(); }

  function drawBody(c) {
    c.save();
    c.scale(dir, 1);
    c.translate(0, P.bob);
    c.rotate(P.lean);
    c.scale(1, P.squash);
    c.translate(0, -tall);
    const sh = [-6.5, -30.5], shF = [6, -30.5];
    // back arm
    let backAng = P.armB, frontAng = P.armA;
    let frontLen = 11;
    let poleAng = Math.PI / 2 - 0.25; // pole planted forward/down
    let attackLocal = null;
    if (anim === 'attack') {
      const local = dir === 1 ? ang : Math.PI - ang;
      attackLocal = local;
      if (hid === 'aaron') {
        const sweep = -1.5 + prog * 3.0;
        poleAng = local + sweep;
        frontAng = Math.PI / 2 - poleAng; // arm points along the pole
        frontLen = 10;
      } else {
        // overhand fling: wind up behind the head then release toward the aim
        const k = prog < 0.35 ? prog / 0.35 : 1;
        const wind = Math.PI * 0.95;
        const release = Math.PI / 2 - local;
        frontAng = prog < 0.35 ? wind * k : wind + (release + TAU * (release < wind ? 1 : 0) - wind) * Math.min(1, (prog - 0.35) / 0.3);
        if (frontAng > Math.PI * 1.9) frontAng -= TAU;
      }
    }
    // Aaron's back hand holds nothing; Victoria's back hand on hip
    drawArm(c, hid, L, sh[0], sh[1], backAng + (hid === 'victoria' ? 0.25 : 0), 10.5, true);
    if (hid === 'aaron' && anim !== 'attack') {
      // pole behind the body when idle/walking (held in the back hand, swinging with the stride)
    }
    drawLegs(c, L, P, hid);
    if (hid === 'aaron') drawAaronTorso(c, L); else drawVictoriaTorso(c, L);

    // front arm (+ pole / scoop)
    if (hid === 'aaron') {
      if (anim === 'attack') {
        const hx = shF[0] + Math.cos(poleAng) * 9, hy = shF[1] + Math.sin(poleAng) * 9;
        // swoosh arc
        c.save();
        c.strokeStyle = rgba(PALETTE.paper, 0.55 * Math.sin(prog * Math.PI));
        c.lineWidth = 6; c.lineCap = 'round';
        c.beginPath(); c.arc(shF[0], shF[1], 34, attackLocal - 1.5, poleAng, false); c.stroke();
        c.strokeStyle = rgba(PALETTE.sun, 0.7 * Math.sin(prog * Math.PI));
        c.lineWidth = 2;
        c.beginPath(); c.arc(shF[0], shF[1], 36, attackLocal - 1.5, poleAng, false); c.stroke();
        c.restore();
        limb(c, shF[0], shF[1], hx, hy, 5, L.tee);
        drawPole(c, hx, hy, poleAng, 30);
      } else {
        const a = frontAng;
        const [hx, hy] = drawArm(c, hid, L, shF[0], shF[1], a + 0.15, 10.5, false);
        const pa = Math.PI / 2 - 0.35 - a * 0.6 + (anim === 'dash' ? -0.9 : 0);
        drawPole(c, hx, hy, pa, 26);
      }
    } else {
      const [hx, hy] = drawArm(c, hid, L, shF[0], shF[1], frontAng + (anim === 'attack' ? 0 : 0.1), frontLen, false);
      if (anim === 'attack' && prog < 0.6) drawScoopInHand(c, hx, hy - 2);
    }
    c.restore();
  }

  // head placement (hair/portrait are drawn unmirrored so the face is never flipped)
  const headY = -46 - tall + P.bob + (anim === 'dash' ? 1 : 0);
  const headX = Math.sin(P.lean) * 30 * dir;
  const sway = anim === 'walk' ? Math.sin(t * 11) * 1.3 - dir * 0.8 : anim === 'dash' ? -dir * 2.5 : Math.sin(t * 2.4) * 0.5;

  // Victoria's dark hair underlayer goes BEHIND the body
  if (hid === 'victoria') {
    ctx.save(); ctx.translate(headX, 0);
    withFlash(ctx, 80, 90, 40, -headY + 35, o.flash, (c) => drawVictoriaHairBack(c, L, headY, headR, sway));
    ctx.restore();
  }

  // body (flash-tinted via scratch buffer)
  withFlash(ctx, 120, 90, 60, 80, o.flash, drawBody);

  if (hid === 'victoria') {
    ctx.save(); ctx.translate(headX, 0);
    withFlash(ctx, 80, 90, 40, -headY + 35, o.flash, (c) => drawVictoriaHairOver(c, L, headY, headR, sway));
    ctx.restore();
  }
  const ring = o.flash > 0 ? `rgba(255,255,255,${Math.min(1, o.flash)})` : null;
  drawPortrait(ctx, game, hid, headX, headY, headR, { border: hid === 'victoria' ? 0 : 1.4, borderColor: 'rgba(16,19,31,0.65)', ring, ringWidth: 3, tight: true });
  ctx.save(); ctx.translate(headX, 0);
  if (hid === 'victoria') drawVictoriaHairFront(ctx, L, headY, headR, t, sway);
  else drawAaronHair(ctx, headY, headR);
  ctx.restore();
  if (o.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, o.flash) * 0.35})`;
    ctx.beginPath(); ctx.arc(headX, headY, headR, 0, TAU); ctx.fill();
  }
  if (anim === 'hurt') {
    ctx.fillStyle = PALETTE.ice; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const a = t * 6 + i * TAU / 3;
      ctx.fillText('*', headX + Math.cos(a) * 18, headY - headR - 2 + Math.sin(a) * 4);
    }
  }

  // Denim Shield (optional o.shield 0..1)
  if (o.shield > 0) drawDenimShield(ctx, ang, -26, o.shield, t);
  ctx.restore();
}

/** Victoria's Denim Shield: a denim-patch kite shield arc in front of her along `ang`. */
export function drawDenimShield(ctx, ang, cy, k, t) {
  ctx.save();
  ctx.translate(0, cy);
  ctx.rotate(ang);
  ctx.globalAlpha *= Math.min(1, k * 1.5);
  const R = 24;
  ctx.fillStyle = rgba(PALETTE.denim, 0.85);
  ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, R, -0.9, 0.9); ctx.arc(0, 0, R - 7, 0.9, -0.9, true); ctx.closePath(); ctx.fill(); ctx.stroke();
  // orange contrast stitching
  ctx.setLineDash([2, 2]); ctx.strokeStyle = '#e6a24a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, R - 3.5, -0.8, 0.8); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = `rgba(232,248,255,${0.5 + 0.5 * Math.sin(t * 12)})`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, R + 3, -0.7, 0.7); ctx.stroke();
  ctx.restore();
}
