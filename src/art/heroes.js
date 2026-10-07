// Hero chibis + photo portraits. Owned by: presentation.
// Big-head mode: the real photo face is the head (circular crop, never distorted/recolored/mirrored).
import { HEROES, PALETTE } from '../core/theme.js';
import { cached, makeCanvas, shade, rrect, shadow, facingOf, rgba } from './util.js';
import { drawCutoutHead } from './busts.js';

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
function drawVictoriaHairBack(c, L, hy, r, sway = 0, len = 1.05) {
  c.fillStyle = L.hairDark;
  hairMass(c, hy, r, r * len, 1.08, sway, 0);
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

function shoe(c, x, y, color, sole, lace) {
  c.fillStyle = sole; rrect(c, x - 3.2, y - 2.2, 8.6, 3.2, 1.5); c.fill();
  c.fillStyle = color; rrect(c, x - 3, y - 4.8, 7.8, 3.8, 2); c.fill();
  if (lace) { c.fillStyle = lace; c.fillRect(x + 0.5, y - 4.4, 2.6, 0.9); }
}

// v2 outfits, matched to the full-body photos (assets/cutouts/*_full.png).
const LOOK = {
  aaron: { // tall + lean: heather-grey tee (faint stripes, a nod to his striped tee), dark shorts, white sneakers, fitness watch
    tee: '#a9adb5', teeDark: '#878c96', teeStripe: 'rgba(255,255,255,0.22)', shorts: '#2b2f3a', shortsDark: '#1f222b',
    skin: '#efc3a0', skinDark: '#d9a786', shoe: '#eef0f2', sole: '#9aa0aa', lace: '#c9ced6', watch: '#3b2f4a', tall: 12, head: 42,
  },
  victoria: { // light-wash denim jacket over a navy knit, mid-wash jeans with rolled cuffs, white sneakers
    jacket: '#8fa8c6', jacketDark: '#6b84a6', jacketLight: '#b6c8dd', stitch: '#d9b26a',
    shirt: '#1f2540', shirtLight: '#2c3456', jeans: '#6f90c0', jeansDark: '#5a79a8', cuff: '#9fb7d8',
    skin: '#f3cdb2', skinDark: '#dcae92', hair: '#a27a52', hairDark: '#8e6743', hairLight: '#c9a77c',
    shoe: '#f6f5f0', sole: '#d6d2c8', lace: '#d9dde3', tall: 2, head: 41,
  },
};

/** Legs, drawn in the un-lifted frame: hips at -15 - tall, feet on the ground. kick: { e 0..1, a local angle } */
function drawLegs(c, L, P, id, kick) {
  const HIP = -15 - L.tall;
  const pairs = [[-3.2, P.legB, P.liftB, true], [3.2, P.legA, P.liftA, false]];
  for (const [hx, sw, lift, back] of pairs) {
    let fx = hx + sw, fy = -2 - lift;
    const hipX = hx * 0.85, hipY = HIP;
    let kx = hx + sw * 0.55, ky = hipY + (fy - hipY) * 0.52 - lift * 0.4;
    if (kick && !back) {
      const len = (fy - hipY) * 1.08;
      const tx = hipX + Math.cos(kick.a) * len, ty = hipY + Math.sin(kick.a) * len;
      fx += (tx - fx) * kick.e; fy += (ty - fy) * kick.e;
      const mx = (hipX + fx) / 2, my = (hipY + fy) / 2;
      const nx = -(fy - hipY), ny = fx - hipX, nl = Math.hypot(nx, ny) || 1;
      const bend = (1 - kick.e) * 5 + 1;
      kx = mx + (nx / nl) * -bend; ky = my + (ny / nl) * -bend;
    }
    if (id === 'aaron') {
      limb(c, kx, ky, fx, fy, 3.8, back ? L.skinDark : L.skin);
      limb(c, hipX, hipY, kx + (kx - hipX) * 0.15, ky + (ky - hipY) * 0.15, 6.6, back ? L.shortsDark : L.shorts);
    } else {
      limb(c, kx, ky, fx, fy, 4.8, back ? L.jeansDark : L.jeans);
      limb(c, hipX, hipY, kx, ky, 5.4, back ? L.jeansDark : L.jeans);
      // rolled cuff
      const dx = fx - kx, dy = fy - ky, d = Math.hypot(dx, dy) || 1;
      limb(c, fx - dx / d * 3.2, fy - dy / d * 3.2, fx - dx / d * 1.4, fy - dy / d * 1.4, 5.6, back ? L.jeansDark : L.cuff);
    }
    if (kick && !back && kick.e > 0.05) {
      c.save(); c.translate(fx, fy + 2); c.rotate(kick.a * kick.e * 0.6); shoe(c, 0, 0, L.shoe, L.sole, L.lace); c.restore();
    } else shoe(c, fx, fy + 2, back ? shadeLook(L.shoe) : L.shoe, L.sole, L.lace);
  }
}
function shadeLook(col) { return shade(col, -0.1); }

function drawAaronTorso(c, L) {
  // lean heather tee
  c.fillStyle = L.tee; rrect(c, -7.8, -33, 15.6, 20, 5); c.fill();
  c.save(); rrect(c, -7.8, -33, 15.6, 20, 5); c.clip();
  c.fillStyle = L.teeStripe;
  for (let y = -30; y < -14; y += 3.6) c.fillRect(-9, y, 18, 1);
  c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(-7.8, -33, 3.5, 20);
  c.fillStyle = 'rgba(0,0,0,0.10)'; c.fillRect(4.5, -33, 3.3, 20);
  c.restore();
  // crew neck
  c.strokeStyle = L.teeDark; c.lineWidth = 1.2;
  c.beginPath(); c.arc(0, -33.5, 3.6, 0.2, Math.PI - 0.2); c.stroke();
  // shorts waist
  c.fillStyle = L.shorts; rrect(c, -7.6, -15.5, 15.2, 4.2, 2); c.fill();
}

function drawVictoriaTorso(c, L) {
  // navy knit underneath (ribbed hint)
  c.fillStyle = L.shirt; rrect(c, -7.5, -33, 15, 19, 4); c.fill();
  c.strokeStyle = L.shirtLight; c.lineWidth = 0.6;
  for (let x = -1.5; x <= 2.5; x += 1.6) { c.beginPath(); c.moveTo(x, -30); c.lineTo(x, -16); c.stroke(); }
  // jeans waist
  c.fillStyle = L.jeans; rrect(c, -7.5, -16, 15, 4, 2); c.fill();
  // light-wash denim jacket: two front panels, open in the middle, a little boxy (oversized like the photo)
  c.fillStyle = L.jacket;
  c.beginPath();
  c.moveTo(-9.5, -31); c.quadraticCurveTo(-10, -34.5, -5, -34.5); c.lineTo(-1.6, -26); c.lineTo(-2.2, -13); c.lineTo(-9.8, -13.5); c.closePath(); c.fill();
  c.beginPath();
  c.moveTo(9.5, -31); c.quadraticCurveTo(10, -34.5, 5, -34.5); c.lineTo(2.6, -26); c.lineTo(3.2, -13); c.lineTo(9.8, -13.5); c.closePath(); c.fill();
  // faded wash highlights
  c.fillStyle = 'rgba(255,255,255,0.16)';
  c.beginPath(); c.ellipse(-6, -22, 2.2, 5, 0.1, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(6.5, -22, 2, 5, -0.1, 0, TAU); c.fill();
  // collar
  c.fillStyle = L.jacketLight;
  c.beginPath(); c.moveTo(-5, -34.5); c.lineTo(-1.6, -26); c.lineTo(-6.5, -29.5); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(5, -34.5); c.lineTo(2.6, -26); c.lineTo(7.5, -29.5); c.closePath(); c.fill();
  // seams, chest pocket flaps (with gold stitching), waistband, buttons
  c.strokeStyle = L.jacketDark; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(-9.3, -16.5); c.lineTo(-2.3, -16.5); c.moveTo(3, -16.5); c.lineTo(9.3, -16.5); c.stroke();
  c.fillStyle = L.jacketDark; c.fillRect(-8, -25.5, 4.4, 2.2); c.fillRect(4.1, -25.5, 4.4, 2.2);
  c.fillStyle = L.stitch; c.fillRect(-6.2, -24.9, 0.9, 0.9); c.fillRect(6, -24.9, 0.9, 0.9);
  c.fillStyle = L.jacketDark; c.beginPath(); c.arc(-2.4, -20, 0.7, 0, TAU); c.arc(-2.6, -15, 0.7, 0, TAU); c.fill();
}

/** Arm from shoulder (sx, sy): ang 0 = straight down, + = forward. Returns hand [x, y]. */
function drawArm(c, id, L, sx, sy, ang, len, back) {
  const ex = sx + Math.sin(ang) * len, ey = sy + Math.cos(ang) * len;
  if (id === 'aaron') {
    const mx = sx + Math.sin(ang) * len * 0.4, my = sy + Math.cos(ang) * len * 0.4;
    limb(c, mx, my, ex, ey, 3.3, back ? L.skinDark : L.skin);
    limb(c, sx, sy, mx, my, 5.4, back ? L.teeDark : L.tee);
    if (back) { // fitness watch
      const wx = sx + Math.sin(ang) * len * 0.82, wy = sy + Math.cos(ang) * len * 0.82;
      limb(c, wx - Math.sin(ang) * 0.6, wy - Math.cos(ang) * 0.6, wx + Math.sin(ang) * 0.6, wy + Math.cos(ang) * 0.6, 3.9, L.watch);
    }
    c.fillStyle = back ? L.skinDark : L.skin; c.beginPath(); c.arc(ex, ey, 1.9, 0, TAU); c.fill();
  } else {
    limb(c, sx, sy, ex, ey, 4.8, back ? L.jacketDark : L.jacket);
    const cx = sx + Math.sin(ang) * len * 0.86, cy = sy + Math.cos(ang) * len * 0.86;
    limb(c, cx, cy, ex - Math.sin(ang) * 0.2, ey - Math.cos(ang) * 0.2, 5, back ? shade(L.jacketDark, -0.1) : L.jacketLight);
    c.fillStyle = back ? L.skinDark : L.skin;
    c.beginPath(); c.arc(ex + Math.sin(ang) * 0.8, ey + Math.cos(ang) * 0.8, 1.9, 0, TAU); c.fill();
  }
  return [ex, ey];
}

// ---------- held items (o.hold) — drawn from the hand outward along `a` (radians, local frame)
export const HOLD_KINDS = ['wrench', 'pan', 'baguette', 'mop', 'hose', 'drumsticks', 'plate', 'pillow', 'card', 'sock', 'yarn', 'ball', 'laptop'];
function drawHeld(c, kind, x, y, a, t = 0) {
  c.save(); c.translate(x, y); c.rotate(a);
  switch (kind) {
    case 'wrench': {
      limb(c, -2, 0, 11, 0, 2.6, '#9aa3b5');
      limb(c, -2, 0, 3, 0, 3.2, '#c0473f'); // red grip
      c.fillStyle = '#b8c0cf'; c.beginPath(); c.arc(13, 0, 3.6, 0, TAU); c.fill();
      c.fillStyle = 'rgba(0,0,0,0)'; c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.moveTo(13, 0); c.lineTo(18, -2); c.lineTo(18, 2); c.closePath(); c.fill();
      c.globalCompositeOperation = 'source-over';
      c.strokeStyle = '#6f788a'; c.lineWidth = 0.8; c.beginPath(); c.arc(13, 0, 3.6, 0.5, TAU - 0.5); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(4, -1, 6, 0.7);
      break;
    }
    case 'pan': {
      limb(c, -1, 0, 7, 0, 2.4, '#3a2a22');
      c.fillStyle = '#2a2c33'; c.beginPath(); c.ellipse(13, 0, 6.5, 6, 0, 0, TAU); c.fill();
      c.fillStyle = '#4a4e5a'; c.beginPath(); c.ellipse(13, 0, 4.8, 4.4, 0, 0, TAU); c.fill();
      c.fillStyle = `rgba(255,140,60,${0.5 + 0.3 * Math.sin(t * 20)})`; c.beginPath(); c.ellipse(13, 0, 3, 2.6, 0, 0, TAU); c.fill();
      break;
    }
    case 'baguette': {
      c.fillStyle = '#d99a4e'; rrect(c, -3, -2.6, 20, 5.2, 2.6); c.fill();
      c.strokeStyle = '#f3d29a'; c.lineWidth = 1;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(i * 4.5, -1.8); c.lineTo(i * 4.5 + 2.5, 1.8); c.stroke(); }
      break;
    }
    case 'mop': {
      limb(c, -6, 0, 20, 0, 1.8, '#b98a5c');
      c.fillStyle = '#e8e2d0';
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.ellipse(22, i * 1.4, 4, 1.1, 0.2 * i, 0, TAU); c.fill(); }
      break;
    }
    case 'hose': {
      c.strokeStyle = '#3f9a52'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-8, 8, -14, 6); c.stroke();
      limb(c, -1, 0, 8, 0, 3.4, '#f2c94a');
      limb(c, 8, 0, 11, 0, 2.4, '#7a7f8c');
      break;
    }
    case 'drumsticks': {
      limb(c, -2, -1, 14, -3, 1.6, '#e6c79a'); limb(c, -2, 1, 13, 4, 1.6, '#d9b47a');
      c.fillStyle = '#f3e3c3'; c.beginPath(); c.arc(14, -3, 1.4, 0, TAU); c.arc(13, 4, 1.4, 0, TAU); c.fill();
      break;
    }
    case 'plate': {
      c.fillStyle = '#f6f3ea'; c.strokeStyle = '#c8c0ae'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(6, 0, 3, 9, 0, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = '#e98aa8'; c.beginPath(); c.ellipse(6, 0, 2, 6.5, 0, 0, TAU); c.stroke();
      break;
    }
    case 'pillow': {
      c.fillStyle = '#c9a0dc'; rrect(c, 1, -6, 13, 12, 4); c.fill();
      c.strokeStyle = '#a77fc0'; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#fff6e5'; c.beginPath(); c.arc(7.5, 0, 1.4, 0, TAU); c.fill();
      break;
    }
    case 'card': {
      c.rotate(-0.3);
      c.fillStyle = '#fff6e5'; rrect(c, 1, -6, 9, 12, 1.5); c.fill();
      c.strokeStyle = '#5a3a2a'; c.lineWidth = 0.8; c.stroke();
      c.fillStyle = '#5aa4e6'; rrect(c, 2.5, -4.5, 6, 5, 1); c.fill();
      c.fillStyle = '#5a3a2a'; c.fillRect(2.5, 2, 6, 0.8); c.fillRect(2.5, 3.6, 4, 0.8);
      break;
    }
    case 'sock': {
      c.fillStyle = '#ff8fb1'; c.beginPath(); c.moveTo(1, -2.5); c.lineTo(10, -2.5); c.lineTo(10, 3); c.quadraticCurveTo(14, 3, 14, 6); c.lineTo(7, 6); c.lineTo(1, 2.5); c.closePath(); c.fill();
      c.fillStyle = '#fff6e5'; c.fillRect(1, -2.5, 2.5, 5);
      break;
    }
    case 'yarn': {
      limb(c, 0, 0, 12, -2, 1.3, '#ffc94a'); // crochet hook
      c.fillStyle = '#ff8fb1'; c.beginPath(); c.arc(4, 5, 4, 0, TAU); c.fill();
      c.strokeStyle = '#e2557a'; c.lineWidth = 0.7; for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(4, 5, 3, 0.4 + i, 2 + i); c.stroke(); }
      break;
    }
    case 'ball': {
      c.fillStyle = '#ff5d5d'; c.beginPath(); c.arc(5, 0, 4.5, 0, TAU); c.fill();
      c.strokeStyle = '#ffc94a'; c.lineWidth = 1.4; c.beginPath(); c.arc(5, 0, 4.5, -0.6, 0.9); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(3.5, -1.6, 1.2, 0, TAU); c.fill();
      break;
    }
    case 'laptop': {
      c.rotate(-a); // keep it level
      c.fillStyle = '#5a5f6e'; rrect(c, -2, -8, 14, 9, 1.5); c.fill();
      c.fillStyle = '#7dff9b'; c.fillRect(-0.5, -6.6, 11, 6);
      c.fillStyle = '#10131f'; for (let i = 0; i < 3; i++) c.fillRect(0.6, -5.6 + i * 1.8, 3 + ((i * 5) % 6), 0.8);
      c.fillStyle = '#8a8f9c'; rrect(c, -3, 1, 16, 2, 1); c.fill();
      break;
    }
    default: break;
  }
  c.restore();
}

function swoosh(c, x, y, r, a0, a1, k, col = PALETTE.sun) {
  if (k <= 0.02) return;
  c.save(); c.lineCap = 'round';
  c.strokeStyle = rgba(PALETTE.paper, 0.55 * k); c.lineWidth = 6;
  c.beginPath(); c.arc(x, y, r, Math.min(a0, a1), Math.max(a0, a1)); c.stroke();
  c.strokeStyle = rgba(col, 0.75 * k); c.lineWidth = 2;
  c.beginPath(); c.arc(x, y, r + 2, Math.min(a0, a1), Math.max(a0, a1)); c.stroke();
  c.restore();
}

/** Wrench peeking out of Victoria's back pocket (idle/walk). */
function pocketWrench(c) {
  c.save(); c.translate(-6.5, -15); c.rotate(-2.2);
  limb(c, 0, 0, 8, 0, 2, '#9aa3b5');
  c.fillStyle = '#b8c0cf'; c.beginPath(); c.arc(9, 0, 2.6, 0, TAU); c.fill();
  c.restore();
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

/** Fallback head (round face crop + drawn hair) when the cutout isn't loaded. */
function fallbackHead(ctx, game, hid, L, hx, chinY, t, sway, o) {
  const r = 17, hy = chinY - r + 2;
  if (hid === 'victoria') { ctx.save(); ctx.translate(hx, 0); drawVictoriaHairOver(ctx, L, hy, r, sway); ctx.restore(); }
  drawPortrait(ctx, game, hid, hx, hy, r, { border: hid === 'victoria' ? 0 : 1.4, borderColor: 'rgba(16,19,31,0.65)', tight: true, grey: o.grey });
  ctx.save(); ctx.translate(hx, 0);
  if (hid === 'victoria') drawVictoriaHairFront(ctx, L, hy, r, t, sway); else drawAaronHair(ctx, hy, r);
  ctx.restore();
}

/**
 * Draw a hero. See sprites.js JSDoc for options. v2 extras:
 *   o.hold: HOLD_KINDS item in the front hand (attack becomes an overhand swing with it)
 *   o.kick: force (true) / suppress (false) Aaron's kick on 'attack' (default: kick when no o.hold)
 *   o.shieldKind: 'denim' (default) | 'plate'
 */
/** Global in-world hero size multiplier (faces need to read at room scale). Multiplies o.scale; o.rawScale skips it. */
export const HERO_SCALE = 1.2;
export function drawHeroImpl(ctx, game, id, x, y, o = {}) {
  const L = LOOK[id] ?? LOOK.aaron;
  const hid = LOOK[id] ? id : 'aaron';
  const s = (o.scale ?? 1) * (o.rawScale ? 1 : HERO_SCALE);
  const anim = o.anim ?? 'idle';
  const t = o.t ?? game?.time ?? 0;
  const loopDur = anim === 'attack' ? 0.4 : 0.35;
  const prog = Math.max(0, Math.min(1, o.progress ?? ((t / loopDur) % 1)));
  const { ang, dir } = facingOf(o.facing);
  const P = pose(anim, t, prog);
  const tall = L.tall;
  const hold = o.hold ?? (hid === 'victoria' && anim === 'attack' ? 'wrench' : null);
  const kicking = anim === 'attack' && hid === 'aaron' && (o.kick ?? !o.hold);
  const local = dir === 1 ? ang : Math.PI - ang; // aim in the mirrored local frame
  let kick = null;
  if (kicking) {
    const e = prog < 0.3 ? Math.sin((prog / 0.3) * Math.PI / 2) : Math.max(0, 1 - (prog - 0.3) / 0.7);
    let a = Math.atan2(Math.sin(local), Math.cos(local));
    a = Math.max(-1.0, Math.min(0.55, a));
    kick = { e, a };
    P.lean = -0.16 * e; P.armA = -1.1 * e; P.armB = 1.0 * e; P.legA = 0; P.bob = -1.5 * e;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;

  shadow(ctx, anim === 'down' ? 22 : 13, anim === 'down' ? 6 : 4.5, 0.28);

  const headH = L.head;
  if (anim === 'down') {
    ctx.save();
    ctx.translate(-dir * 4, -4);
    ctx.rotate(-dir * Math.PI / 2 * 0.92);
    drawBody(ctx);
    ctx.restore();
    const nx = -dir * (34 + tall * 0.9), ny = -8;
    if (!drawCutoutHead(ctx, game, hid, nx, ny, headH * 0.92, { rot: -dir * 1.45, grey: true })) {
      drawPortrait(ctx, game, hid, -dir * 28, -9, 13, { grey: true, border: 1.2, borderColor: 'rgba(16,19,31,0.5)', tight: true });
    }
    for (let i = 0; i < 3; i++) {
      const a = t * 3 + i * TAU / 3;
      sparkleStar(ctx, nx - dir * 16 + Math.cos(a) * 12, ny - 14 + Math.sin(a) * 3, 3, PALETTE.sun);
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
    const sh = [-6.5, -30.5], shF = [6, -30.5];
    let backAng = P.armB, frontAng = P.armA;
    let swing = null;
    if (anim === 'attack' && hold) {
      // overhand swing: wind up behind the head then release toward the aim
      const k = prog < 0.35 ? prog / 0.35 : 1;
      const wind = Math.PI * 0.95;
      const release = Math.PI / 2 - local;
      frontAng = prog < 0.35 ? wind * k : wind + (release + TAU * (release < wind ? 1 : 0) - wind) * Math.min(1, (prog - 0.35) / 0.3);
      if (frontAng > Math.PI * 1.9) frontAng -= TAU;
      swing = { k: Math.sin(prog * Math.PI), release };
    }
    // back arm (Victoria's rests near her hip)
    c.save(); c.translate(0, -tall);
    drawArm(c, hid, L, sh[0], sh[1], backAng + (hid === 'victoria' ? 0.25 : 0), 10.5, true);
    c.restore();
    drawLegs(c, L, P, hid, kick);
    if (kick && kick.e > 0.1) {
      // kick swoosh around the hip
      const hx = 3.2 * 0.85, hy = -15 - tall;
      swoosh(c, hx, hy, 17, kick.a - 1.4 * kick.e, kick.a + 0.15, Math.sin(Math.min(1, prog / 0.45) * Math.PI));
    }
    c.translate(0, -tall);
    if (hid === 'victoria' && !hold) pocketWrench(c);
    if (hid === 'aaron') drawAaronTorso(c, L); else drawVictoriaTorso(c, L);
    // front arm (+ held item)
    if (swing) {
      const arc0 = Math.PI / 2 - Math.PI * 0.95, arc1 = Math.PI / 2 - frontAng;
      swoosh(c, shF[0], shF[1], 26, arc1, arc0 + 0.3, swing.k * (prog > 0.3 ? 1 : 0));
    }
    const [hx, hy] = drawArm(c, hid, L, shF[0], shF[1], frontAng + (anim === 'attack' ? 0 : 0.1), 11, false);
    if (hold) {
      const ia = anim === 'attack' ? Math.atan2(Math.cos(frontAng), Math.sin(frontAng)) : Math.PI / 2 - 0.9 - frontAng * 0.6 + (anim === 'dash' ? -0.6 : 0);
      drawHeld(c, hold, hx, hy, ia, t);
    }
    c.restore();
  }

  // head placement (the cutout is drawn unmirrored so the face is never flipped)
  const chinY = -29 - tall + P.bob + (anim === 'dash' ? 1 : 0) + (kick ? -1.5 * kick.e : 0);
  const headX = Math.sin(P.lean) * 30 * dir;
  const sway = anim === 'walk' ? Math.sin(t * 11) * 1.3 - dir * 0.8 : anim === 'dash' ? -dir * 2.5 : Math.sin(t * 2.4) * 0.5;

  // Victoria's long hair continues behind the body below the photo crop
  if (hid === 'victoria') {
    ctx.save(); ctx.translate(headX, 0);
    withFlash(ctx, 80, 100, 40, -chinY + 60, o.flash, (c) => drawVictoriaHairBack(c, L, chinY - 12, 12.5, sway, 1.5));
    ctx.restore();
  }

  withFlash(ctx, 140, 100, 70, 90, o.flash, drawBody);

  const tilt = anim === 'walk' ? Math.sin(t * 11) * 0.03 : anim === 'hurt' ? -0.12 * (1 - prog) * dir : kick ? -0.08 * kick.e * dir : 0;
  let drew = false;
  withFlash(ctx, 90, 90, 45, -chinY + 80, o.flash, (c) => {
    drew = drawCutoutHead(c, game, hid, headX, chinY, headH, { rot: tilt });
    if (!drew) fallbackHead(c, game, hid, L, headX, chinY, t, sway, {});
  });
  if (o.flash > 0 && !drew) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, o.flash) * 0.35})`;
    ctx.beginPath(); ctx.arc(headX, chinY - 15, 17, 0, TAU); ctx.fill();
  }
  if (anim === 'hurt') {
    for (let i = 0; i < 3; i++) {
      const a = t * 6 + i * TAU / 3;
      sparkleStar(ctx, headX + Math.cos(a) * 20, chinY - headH - 2 + Math.sin(a) * 4, 3.2, PALETTE.sun);
    }
  }

  if (o.shield > 0) {
    if (o.shieldKind === 'plate') drawPlateShield(ctx, ang, -26 - tall, o.shield, t);
    else drawDenimShield(ctx, ang, -26 - tall, o.shield, t);
  }
  ctx.restore();
}

function sparkleStar(c, x, y, s, col) {
  c.fillStyle = col;
  c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill();
}

/** Plate Shield: a big dinner plate held out along `ang` (Plate Shield skill). */
export function drawPlateShield(ctx, ang, cy, k, t) {
  ctx.save();
  ctx.translate(0, cy);
  ctx.rotate(ang);
  ctx.globalAlpha *= Math.min(1, k * 1.5);
  ctx.translate(20, 0);
  ctx.fillStyle = '#f6f3ea'; ctx.strokeStyle = '#c8c0ae'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 6, 19, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#e98aa8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 4, 14, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 12)})`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(1, 0, 8.5, 22, 0, -0.9, 0.9); ctx.stroke();
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
