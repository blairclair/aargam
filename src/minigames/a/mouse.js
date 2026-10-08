// The Loaf Thief: an overlarge, cute-gross house mouse. Owned by: games-a.
// Drawn in local units (about 100 tall when upright), origin = feet, facing right. Style follows
// src/art/world/foes_house.js: soft gradients, outlines in a darker shade of the fill, ink eyes.
//   drawMouse(ctx, x, y, { scale, t, pose, loaf, loafColor, loafW, look, panic })
//     pose: 'run' | 'stand' | 'grab' | 'hug' | 'throw' | 'dive' | 'dizzy' | 'taunt' | 'peek'
//     loaf: true draws the stolen loaf in its arms (loafW units wide, default 50); look: pupil direction; panic: sweat + tiny pupils
//   drawStolenLoaf(ctx, x, y, w, color) — the loaf on its own (also used by the chase when it flies)
import { PALETTE } from '../../core/theme.js';

const TAU = Math.PI * 2;
const INK = PALETTE.ink;
const FUR = '#9a8b86', FUR_SH = '#6f625f', FUR_DK = '#4f4443', BELLY = '#e3d6c8';
const PINK = '#f2a7a8', PINK_DK = '#c96f74', TOOTH = '#f4e6b0';

/** Small helper: an outlined filled path. */
function fillOut(c, fill, stroke, w = 1.6) { c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = w; c.lineJoin = 'round'; c.stroke(); }

/** The loaf (batard with an ear), base-centre at (x, y), width w. */
export function drawStolenLoaf(c, x, y, w, color = '#d99a48') {
  const h = w * 0.5;
  c.save(); c.translate(x, y);
  c.beginPath();
  c.moveTo(-w / 2, 0);
  c.bezierCurveTo(-w / 2, -h * 1.1, w / 2, -h * 1.1, w / 2, 0);
  c.quadraticCurveTo(0, h * 0.18, -w / 2, 0);
  c.closePath();
  const g = c.createLinearGradient(0, -h, 0, 0);
  g.addColorStop(0, '#f6cf8a'); g.addColorStop(0.55, color); g.addColorStop(1, '#8a4f22');
  fillOut(c, g, '#6b3a1a', Math.max(1, w * 0.035));
  c.save(); c.clip();
  c.strokeStyle = '#f9e3b6'; c.lineWidth = w * 0.09; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-w * 0.3, -h * 0.55); c.quadraticCurveTo(0, -h * 0.95, w * 0.32, -h * 0.6); c.stroke();
  c.restore();
  c.fillStyle = 'rgba(255,250,240,0.6)';
  for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(-w * 0.3 + i * w * 0.12, -h * 0.35 - Math.sin(i * 2) * h * 0.15, w * 0.018, 0, TAU); c.fill(); }
  c.restore();
}

function eye(c, x, y, r, o) {
  if (o.dizzy) {
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.strokeStyle = INK; c.lineWidth = r * 0.3; c.beginPath();
    for (let i = 0; i <= 16; i++) { const a = i * 0.8 + o.t * 12, d = (i / 16) * r * 0.85; const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
    c.stroke(); return;
  }
  if (o.glee) { c.strokeStyle = INK; c.lineWidth = r * 0.45; c.lineCap = 'round'; c.beginPath(); c.arc(x, y + r * 0.3, r * 0.8, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); return; }
  // big glossy beady eye (cute), slightly bloodshot rim (gross)
  c.fillStyle = '#fff4f0'; c.beginPath(); c.ellipse(x, y, r * 1.05, r * 1.2, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(200,70,80,0.55)'; c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(x - r, y + r * 0.2); c.lineTo(x - r * 0.5, y + r * 0.1); c.moveTo(x - r * 0.9, y + r * 0.6); c.lineTo(x - r * 0.45, y + r * 0.4); c.stroke();
  const px = x + (o.look ?? 0.4) * r * 0.3;
  c.fillStyle = INK; c.beginPath(); c.ellipse(px, y + r * 0.1, r * (o.panic ? 0.45 : 0.78), r * (o.panic ? 0.5 : 0.9), 0, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(px - r * 0.28, y - r * 0.3, r * 0.3, 0, TAU); c.fill();
  c.beginPath(); c.arc(px + r * 0.25, y + r * 0.35, r * 0.12, 0, TAU); c.fill();
  c.strokeStyle = FUR_DK; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, r * 1.05, r * 1.2, 0, 0, TAU); c.stroke();
}

/**
 * Draw the mouse. (x, y) = feet. o: { scale=2, t, pose='run', loaf=true, loafColor, loafW=50, look (1 forward, -1 back), panic }
 */
export function drawMouse(c, x, y, o = {}) {
  const s = o.scale ?? 2, t = o.t ?? 0, pose = o.pose ?? 'run';
  const run = pose === 'run';
  const ph = t * 16;
  const bob = run ? -Math.abs(Math.sin(ph)) * 5 : pose === 'hug' ? -Math.abs(Math.sin(t * 9)) * 3 : 0;
  const lean = run ? 0.22 : pose === 'dive' ? 1.2 : pose === 'grab' ? 0.18 : pose === 'throw' ? -0.1 : 0;
  const dizzy = pose === 'dizzy';
  c.save();
  c.translate(x, y); c.scale(s, s);
  // shadow
  c.fillStyle = 'rgba(16,19,31,0.28)'; c.beginPath(); c.ellipse(0, 0, pose === 'dive' ? 46 : 32, 6, 0, 0, TAU); c.fill();
  if (pose === 'peek') { drawPeek(c, t, o); c.restore(); return; }
  if (dizzy) { c.translate(0, -2); }
  c.translate(0, bob);

  // ---- tail (long, pink, scaly rings: the gross part)
  const tw = Math.sin(t * (run ? 14 : 4)) * (run ? 10 : 5);
  c.save();
  c.strokeStyle = PINK_DK; c.lineCap = 'round'; c.lineWidth = 5.5;
  c.beginPath(); c.moveTo(-22, -26); c.bezierCurveTo(-48, -20 + tw, -66, -46 - tw, -92, -30 + tw * 1.2); c.stroke();
  c.strokeStyle = PINK; c.lineWidth = 3.6; c.stroke();
  c.strokeStyle = 'rgba(150,70,80,0.5)'; c.lineWidth = 0.8;
  for (let i = 1; i < 7; i++) {
    const k = i / 7, bx = lerpB(-22, -48, -66, -92, k), by = lerpB(-26, -20 + tw, -46 - tw, -30 + tw * 1.2, k);
    c.beginPath(); c.moveTo(bx - 1.5, by - 2); c.lineTo(bx + 1.5, by + 2); c.stroke();
  }
  c.restore();

  c.save();
  c.rotate(lean * (pose === 'dive' ? 1 : 1));
  if (pose === 'dive') c.translate(10, 18);

  // ---- back leg + foot
  const legSw = run ? Math.sin(ph) : 0;
  const foot = (fx, fy, lift, back) => {
    c.save(); c.translate(fx, fy - lift);
    c.beginPath(); c.ellipse(4, -1, 12, 4.5, 0.05, 0, TAU);
    fillOut(c, back ? PINK_DK : PINK, PINK_DK, 1.2);
    for (let k = 0; k < 3; k++) { c.fillStyle = INK; c.beginPath(); c.arc(14 + k * 0.5, -3 + k * 2, 0.9, 0, TAU); c.fill(); } // grubby claws
    c.restore();
  };
  const legs = (side) => {
    const sw = side * legSw;
    const lift = run ? Math.max(0, side * Math.cos(ph)) * 7 : 0;
    const fx = -6 + sw * 14, fy = 0;
    c.strokeStyle = side < 0 ? FUR_DK : FUR_SH; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-6, -24); c.quadraticCurveTo(-10 + sw * 6, -12, fx, fy - 3 - lift); c.stroke();
    foot(fx - 3, fy, lift, side < 0);
  };
  if (pose !== 'dive' && !dizzy) legs(-1);

  // ---- body (pear, scruffy)
  c.beginPath();
  c.moveTo(-6, -8);
  c.bezierCurveTo(-34, -10, -36, -56, -12, -70);
  c.bezierCurveTo(4, -80, 22, -70, 24, -52);
  c.bezierCurveTo(26, -30, 18, -8, -6, -8);
  c.closePath();
  const bg = c.createRadialGradient(-8, -58, 4, -4, -38, 46);
  bg.addColorStop(0, '#b8aaa4'); bg.addColorStop(0.6, FUR); bg.addColorStop(1, FUR_SH);
  fillOut(c, bg, FUR_DK, 1.8);
  // belly patch
  c.beginPath(); c.ellipse(8, -36, 11, 20, -0.15, 0, TAU); c.fillStyle = BELLY; c.fill();
  // scraggly fur tufts on the back
  c.strokeStyle = FUR_DK; c.lineWidth = 1.3; c.lineCap = 'round';
  for (const [tx, ty, a] of [[-30, -40, 3.6], [-31, -30, 3.3], [-26, -56, 3.9], [-18, -66, 4.2]]) {
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + Math.cos(a) * 6, ty + Math.sin(a) * 6); c.stroke();
  }
  // grease spot + crumbs stuck in fur (cute-gross)
  c.fillStyle = 'rgba(80,60,40,0.3)'; c.beginPath(); c.ellipse(-16, -30, 5, 3, 0.4, 0, TAU); c.fill();
  c.fillStyle = '#e0b268';
  for (const [cx, cy] of [[2, -20], [12, -26], [-20, -22], [5, -48]]) { c.beginPath(); c.arc(cx, cy, 1.4, 0, TAU); c.fill(); }

  if (pose !== 'dive' && !dizzy) legs(1);
  if (dizzy) { // sat down: legs splayed forward
    c.strokeStyle = FUR_SH; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-2, -16); c.lineTo(18, -6); c.stroke(); foot(16, 0, 0, false);
  }

  // ---- loaf + arms
  const loafY = pose === 'grab' ? -60 : -44, loafX = pose === 'grab' ? 30 : 16;
  const arm = (ax, ay, hx, hy, back) => {
    c.strokeStyle = back ? FUR_SH : FUR; c.lineWidth = 6.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo((ax + hx) / 2 + 4, (ay + hy) / 2 + 6, hx, hy); c.stroke();
    c.strokeStyle = FUR_DK; c.lineWidth = 1; c.stroke();
    c.fillStyle = PINK; c.beginPath(); c.arc(hx, hy, 3.6, 0, TAU); c.fill(); c.strokeStyle = PINK_DK; c.lineWidth = 1; c.stroke();
  };
  if (pose === 'throw') {
    arm(8, -60, -18 + Math.sin(t * 20) * 4, -86, true);
  } else if (o.loaf !== false && pose !== 'dive') arm(4, -60, loafX - 18, loafY - 6, true);
  if (o.loaf !== false) {
    c.save();
    if (pose === 'dive') c.translate(26, -30);
    else c.translate(loafX, loafY + (run ? Math.sin(ph) * 1.5 : 0));
    c.rotate(pose === 'hug' ? Math.sin(t * 9) * 0.06 : -0.08);
    drawStolenLoaf(c, 0, 8 + ((o.loafW ?? 50) - 50) * 0.2, o.loafW ?? 50, o.loafColor);
    c.restore();
  }
  if (o.loaf !== false && pose !== 'dive') arm(10, -58, loafX + 12, loafY - 2, false);
  else if (pose === 'throw' || pose === 'taunt') arm(10, -58, 22, -46, false);

  // ---- head (big, snouty)
  const hx = pose === 'grab' ? 18 : 12, hy = pose === 'grab' ? -86 : -82;
  c.save(); c.translate(hx, hy);
  const look = o.look ?? 1;
  c.rotate((run ? Math.sin(ph) * 0.04 : 0) + (dizzy ? Math.sin(t * 5) * 0.15 : 0));
  // back ear
  c.beginPath(); c.ellipse(-16, -16, 13, 15, -0.4, 0, TAU); fillOut(c, FUR_SH, FUR_DK, 1.5);
  c.beginPath(); c.ellipse(-16, -15, 8, 10, -0.4, 0, TAU); c.fillStyle = PINK_DK; c.fill();
  // skull + snout
  c.beginPath();
  c.moveTo(-18, 6);
  c.bezierCurveTo(-24, -14, -6, -24, 6, -20);
  c.bezierCurveTo(18, -16, 30, -6, 38, 2);
  c.bezierCurveTo(40, 6, 36, 10, 30, 10);
  c.bezierCurveTo(16, 16, -8, 18, -18, 6);
  c.closePath();
  const hg = c.createRadialGradient(0, -12, 3, 6, -2, 34);
  hg.addColorStop(0, '#bfb1ab'); hg.addColorStop(0.7, FUR); hg.addColorStop(1, FUR_SH);
  fillOut(c, hg, FUR_DK, 1.8);
  // cheek fluff
  c.beginPath(); c.ellipse(4, 6, 10, 7, 0, 0, TAU); c.fillStyle = BELLY; c.fill();
  // nose (pink, shiny, slightly wet)
  c.beginPath(); c.ellipse(38, 1, 4.5, 3.8, 0, 0, TAU); fillOut(c, '#f07f8c', PINK_DK, 1);
  c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(37, -0.5, 1.3, 0, TAU); c.fill();
  // buck teeth (one chipped)
  c.beginPath(); c.rect(26, 9, 4, 6); c.rect(30.5, 9, 4, 5); fillOut(c, TOOTH, '#a8925a', 0.9);
  // mouth
  c.strokeStyle = FUR_DK; c.lineWidth = 1.3;
  if (pose === 'taunt') { c.fillStyle = '#e46a7c'; c.beginPath(); c.ellipse(28, 14, 4, 6 + Math.sin(t * 25) * 1.5, 0.3, 0, TAU); c.fill(); c.stroke(); }
  else { c.beginPath(); c.moveTo(18, 9); c.quadraticCurveTo(24, 12, 30, 9); c.stroke(); }
  // drool drip (gross)
  if (!dizzy) { const d = (t * 0.9) % 1; c.fillStyle = 'rgba(210,235,255,0.85)'; c.beginPath(); c.ellipse(32, 16 + d * 5, 1.4, 2 + d * 2, 0, 0, TAU); c.fill(); }
  // whiskers with crumbs
  c.strokeStyle = 'rgba(40,30,30,0.7)'; c.lineWidth = 0.8;
  for (let k = -1; k <= 1; k++) {
    const wv = Math.sin(t * 9 + k) * 1.5;
    c.beginPath(); c.moveTo(32, 4 + k * 2); c.quadraticCurveTo(46, 0 + k * 5 + wv, 56, -2 + k * 8 + wv); c.stroke();
  }
  c.fillStyle = '#e0b268'; c.beginPath(); c.arc(48, 1, 1.3, 0, TAU); c.arc(52, 7, 1.1, 0, TAU); c.fill();
  // eye
  eye(c, 14, -6, 6.2, { t, dizzy, glee: pose === 'hug' || pose === 'taunt', panic: o.panic, look: look * 0.6 });
  // brow
  if (!dizzy && pose !== 'hug') { c.strokeStyle = FUR_DK; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(6, -16 + (o.panic ? -3 : 0)); c.lineTo(20, -14 - (o.panic ? 4 : -1)); c.stroke(); }
  // front ear
  c.beginPath(); c.ellipse(-4, -22, 14, 16, -0.15, 0, TAU); fillOut(c, FUR, FUR_DK, 1.6);
  c.beginPath(); c.ellipse(-3, -21, 9, 11, -0.15, 0, TAU); c.fillStyle = PINK; c.fill();
  c.strokeStyle = 'rgba(201,111,116,0.6)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-6, -28); c.lineTo(-3, -16); c.stroke(); // ear vein
  // sweat when panicking
  if (o.panic) { c.fillStyle = '#9fd8ff'; c.beginPath(); c.moveTo(-14, -2); c.quadraticCurveTo(-19, 6, -14, 8); c.quadraticCurveTo(-9, 6, -14, -2); c.fill(); }
  c.restore();

  if (pose === 'taunt') { // thumb-to-nose, fingers waggling (drawn over the head)
    const wg = Math.sin(t * 22) * 2;
    arm(14, -64, hx + 46, hy + 2 + wg, false);
    c.fillStyle = PINK; c.strokeStyle = PINK_DK; c.lineWidth = 1;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(hx + 52 + i * 5, hy - 3 + wg - i * 3 + Math.sin(t * 30 + i) * 2, 2.2, 4, 0.6, 0, TAU); c.fill(); c.stroke(); }
  }
  c.restore(); // lean
  // dizzy stars
  if (dizzy) { c.fillStyle = PALETTE.sun; for (let i = 0; i < 3; i++) { const a = t * 4 + i * TAU / 3; starP(c, 14 + Math.cos(a) * 22, -112 + Math.sin(a) * 6, 4); } }
  // a flea hopping off it
  if (!dizzy && pose !== 'dive') { const f = (t * 1.3) % 1; c.fillStyle = INK; c.beginPath(); c.arc(-24 - f * 18, -70 - Math.sin(f * Math.PI) * 18, 0.9, 0, TAU); c.fill(); }
  c.restore();
}

/** Only the head + paws poking out of a baseboard hole (origin = hole bottom-centre). */
function drawPeek(c, t, o) {
  c.save();
  c.translate(0, -6);
  c.beginPath(); c.ellipse(0, 0, 20, 14, 0, Math.PI, 0); c.fillStyle = FUR; c.fill(); c.strokeStyle = FUR_DK; c.lineWidth = 1.5; c.stroke();
  c.beginPath(); c.ellipse(-14, -14, 9, 10, -0.3, 0, TAU); fillOut(c, FUR, FUR_DK, 1.4);
  c.beginPath(); c.ellipse(14, -14, 9, 10, 0.3, 0, TAU); fillOut(c, FUR, FUR_DK, 1.4);
  c.fillStyle = PINK; c.beginPath(); c.ellipse(-14, -13, 5, 6, -0.3, 0, TAU); c.ellipse(14, -13, 5, 6, 0.3, 0, TAU); c.fill();
  eye(c, -6, -4, 3.6, { t, look: 0.2 }); eye(c, 6, -4, 3.6, { t, look: 0.2 });
  c.restore();
}

function starP(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  c.closePath(); c.fill();
}
function lerpB(a, b, cc, d, k) { const u = 1 - k; return u * u * u * a + 3 * u * u * k * b + 3 * u * k * k * cc + k * k * k * d; }
