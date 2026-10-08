// Enemy painters: office, kitchen, dining, living, playroom. Owned by: art-world.
// Contract: see enemies.js. Origin = feet point. Each painter gets (c, P).
import { TAU, INK, PALETTE, shade, rgba, mix, rrect, shadow, eyes, googly, sparkle, telegraph, alertMark, clamp01, lerp, ease, WOOD, CREAM } from './kit.js';

// ---------------------------------------------------------------- shared helpers
/** Attack wind-up 0..1 (first 70% of progress). */
const windOf = (P) => (P.anim === 'attack' ? clamp01(P.prog / 0.7) : 0);
/** Attack release 0..1 (last 30% of progress). */
const relOf = (P) => (P.anim === 'attack' && P.prog > 0.7 ? clamp01((P.prog - 0.7) / 0.3) : 0);
/** Hurt intensity 1 -> 0 as it recovers. */
const hurtOf = (P) => (P.anim === 'hurt' ? 1 - P.prog : 0);
const moving = (P) => P.anim === 'move';
/** Wind-up jitter so the telegraph reads even in a still frame. */
const shake = (P, amt) => { const w = windOf(P); return w > 0 && P.prog < 0.7 ? Math.sin(P.t * 70 + P.seed * 9) * amt * w : 0; };

function outline(c, color, w = 1) { c.strokeStyle = color; c.lineWidth = w; c.stroke(); }

/** Dizzy spiral eyes for hurt frames. */
function dizzyEyes(c, x, y, sep, r, t) {
  c.strokeStyle = INK; c.lineWidth = Math.max(0.8, r * 0.35); c.lineCap = 'round';
  for (const ex of [x - sep, x + sep]) {
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, y, r, 0, TAU); c.fill();
    c.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = i * 0.75 + t * 12, d = (i / 14) * r * 0.85;
      const px = ex + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.stroke();
  }
}
/** Face helper: angry eyes normally, dizzy when hurt. */
function face(c, P, x, y, sep, r, o = {}) {
  if (hurtOf(P) > 0.15) dizzyEyes(c, x, y, sep, r, P.t);
  else eyes(c, x, y, sep, r, o.look ?? 0.6, o.tilt ?? -(r * 0.5 + windOf(P) * r * 0.4), o);
}
function mouth(c, x, y, w, open) {
  c.fillStyle = INK;
  if (open > 0.15) { c.beginPath(); c.ellipse(x, y, w * 0.6, w * 0.35 + open * w * 0.5, 0, 0, TAU); c.fill(); c.fillStyle = '#d9606e'; c.beginPath(); c.ellipse(x, y + open * w * 0.3, w * 0.35, w * 0.2, 0, 0, TAU); c.fill(); }
  else { c.strokeStyle = INK; c.lineWidth = Math.max(0.9, w * 0.22); c.lineCap = 'round'; c.beginPath(); c.moveTo(x - w * 0.5, y + w * 0.1); c.quadraticCurveTo(x, y - w * 0.25, x + w * 0.5, y + w * 0.1); c.stroke(); }
}
function puff(c, x, y, r, a, color = '#ffffff') {
  c.fillStyle = rgba(color, a);
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.arc(x + r * 0.8, y + r * 0.2, r * 0.75, 0, TAU); c.arc(x - r * 0.7, y + r * 0.3, r * 0.65, 0, TAU); c.fill();
}
/** Little electric zigzag between two points. */
function zap(c, x1, y1, x2, y2, t, color = '#fff27a', w = 1.4) {
  c.strokeStyle = color; c.lineWidth = w; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x1, y1);
  const n = 5;
  for (let i = 1; i < n; i++) {
    const k = i / n, j = Math.sin(t * 90 + i * 7.3) * 3.2;
    c.lineTo(lerp(x1, x2, k) + j * (y2 - y1 === 0 ? 0 : 1) * 0.6, lerp(y1, y2, k) + j);
  }
  c.lineTo(x2, y2); c.stroke();
}

// ================================================================ OFFICE
// ---- Syntax Beetle: glossy navy shell split into two wing cases, mint `{ }` + circuit traces,
// pronotum plate, clubbed antennae, jointed tripod-gait legs. Wing cases crack open on wind-up.
/** Two-segment jointed leg from hip (hx,hy) via knee to foot; small claw at the tip. */
function jointLeg(c, hx, hy, kx, ky, fx, fy, col, w0) {
  c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
  c.lineWidth = w0; c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke();
  c.lineWidth = w0 * 0.7; c.beginPath(); c.moveTo(kx, ky); c.lineTo(fx, fy); c.stroke();
  c.lineWidth = w0 * 0.45; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + 1.4, fy + 0.4); c.stroke();
  c.fillStyle = col; c.beginPath(); c.arc(kx, ky, w0 * 0.62, 0, TAU); c.fill();
}
function beetle(c, P) {
  const w = windOf(P), r = relOf(P), h = hurtOf(P);
  const mv = moving(P) || r > 0;
  const lunge = r > 0 ? Math.sin(r * Math.PI) * 7 : 0;
  const LEG = '#141728';
  shadow(c, 14, 4, 0.25);
  c.save();
  c.translate(shake(P, 1.2), 0);
  c.scale(P.dir, 1);
  c.translate(lunge - w * 2, 0);
  const rear = w * 0.25 - h * 0.2; // rears up during wind-up
  // legs (3 per side), alternating tripod gait; far side first (drawn behind the shell)
  for (const side of [-1, 1]) {
    if (side > 0) continue;
    for (let i = 0; i < 3; i++) {
      const ph = P.t * (mv ? 22 : 3) + i * 2.1 + (i % 2 ? Math.PI : 0);
      const sw = Math.sin(ph) * (mv ? 3 : 0.6), lift = mv ? Math.max(0, Math.cos(ph)) * 1.5 : 0;
      const lx = -6 + i * 6;
      jointLeg(c, lx, -10, lx + (i - 1) * 3 + sw * 0.5, -17, lx + (i - 1) * 5 + sw, -14 - lift, '#0f1220', 1.5);
    }
  }
  for (let i = 0; i < 3; i++) {
    const ph = P.t * (mv ? 22 : 3) + i * 2.1 + (i % 2 ? 0 : Math.PI);
    const sw = Math.sin(ph) * (mv ? 3 : 0.6), lift = mv ? Math.max(0, Math.cos(ph)) * 1.8 : 0;
    const lx = -6 + i * 6;
    jointLeg(c, lx, -6, lx + (i - 1) * 3.5 + sw * 0.5 - 1, -3, lx + (i - 1) * 6 + sw, -lift, LEG, 1.8);
  }
  c.save();
  c.translate(0, -9);
  c.rotate(-rear);
  // hind wings flicker out from under the cases on wind-up / release
  const open = Math.max(w * 0.9, r > 0 ? 1 - r : 0);
  if (open > 0.15) {
    const fl = 0.6 + Math.abs(Math.sin(P.t * 48)) * 0.4;
    c.fillStyle = rgba('#d9f2ff', 0.45 * open);
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(-11, s * 5 * fl, 9 * open, 3.2, s * (0.5 + open * 0.3), 0, TAU); c.fill(); }
  }
  // body shell (two wing cases, rear tips part on wind-up)
  const g = c.createRadialGradient(-3, -5, 1, 0, 0, 14);
  g.addColorStop(0, '#5468a0'); g.addColorStop(0.5, '#2a3358'); g.addColorStop(1, '#141930');
  c.fillStyle = g;
  c.beginPath(); c.ellipse(-1, 0, 12, 8.5, 0, 0, TAU); c.fill(); outline(c, '#0a0d1a', 1.1);
  // rim highlight along the top edge
  c.strokeStyle = 'rgba(170,200,255,0.55)'; c.lineWidth = 0.9;
  c.beginPath(); c.ellipse(-1, 0, 10.8, 7.3, 0, Math.PI * 1.08, Math.PI * 1.75); c.stroke();
  // pronotum plate (segment behind the head)
  c.fillStyle = '#232a4c';
  c.beginPath(); c.moveTo(3.6, -7.6); c.quadraticCurveTo(12, -6, 11.5, 0); c.quadraticCurveTo(12, 6, 3.6, 7.6); c.quadraticCurveTo(6.2, 0, 3.6, -7.6); c.fill();
  c.strokeStyle = '#0a0d1a'; c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(3.6, -7.7); c.quadraticCurveTo(6.2, 0, 3.6, 7.7); c.stroke();
  c.fillStyle = 'rgba(170,200,255,0.3)'; c.beginPath(); c.ellipse(7.5, -4.2, 2, 0.8, 0.3, 0, TAU); c.fill();
  // wing-case seam (centre line), parts into a V at the rear on wind-up
  c.strokeStyle = '#0a0d1a'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(4.6, 0); c.lineTo(-6, 0);
  c.lineTo(-12.6, -open * 2.2); c.moveTo(-6, 0); c.lineTo(-12.6, open * 2.2); c.stroke();
  c.strokeStyle = 'rgba(140,170,240,0.35)'; c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(4.4, -0.9); c.lineTo(-11.5, -0.9); c.stroke();
  // circuit traces + solder pads on the cases (mint, glow on wind-up)
  const trace = mix('#3f8f7a', '#c9ffe0', w);
  c.strokeStyle = trace; c.lineWidth = 0.7; c.fillStyle = trace;
  for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(2.6, s * 3.4); c.lineTo(0.5, s * 5.6); c.lineTo(-7, s * 6.2); c.lineTo(-10.2, s * 3.6); c.stroke();
    for (const [px, py] of [[2.6, s * 3.4], [-10.2, s * 3.6], [-3.4, s * 6]]) { c.beginPath(); c.arc(px, py, 0.7, 0, TAU); c.fill(); }
  }
  // shell spots
  c.fillStyle = 'rgba(150,180,255,0.28)';
  for (const [sx, sy, sr] of [[-9, -3.2, 1.1], [-6.5, 5.6, 0.9], [2.5, -6, 0.8], [3, 5.8, 0.9]]) { c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill(); }
  // { } markings straddling the seam (glow on wind-up)
  c.save();
  c.font = 'bold 11px Menlo, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = mix(PALETTE.mint, '#eaffef', w);
  if (w > 0) { c.shadowColor = PALETTE.mint; c.shadowBlur = 6 * w; }
  c.fillText('{', -7.2, 0.4); c.fillText('}', 0.6, 0.4);
  c.restore();
  // gloss
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-4, -5.6, 3.6, 1.2, -0.15, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(1.2, -6.2, 0.8, 0, TAU); c.fill();
  // head
  c.fillStyle = '#1d2240'; c.beginPath(); c.ellipse(14, 0.5, 5, 4.8, 0, 0, TAU); c.fill(); outline(c, '#0a0d1a', 1);
  c.fillStyle = 'rgba(170,200,255,0.35)'; c.beginPath(); c.ellipse(13, -2.6, 2.4, 0.8, -0.2, 0, TAU); c.fill();
  // antennae: elbowed, clubbed tips, twitch
  const tw = Math.sin(P.t * (mv ? 14 : 4) + P.seed * 5) * 1.2 + w * 1.5;
  c.strokeStyle = LEG; c.lineWidth = 0.9; c.lineCap = 'round';
  for (const [ax, k] of [[14.5, 0], [16.5, 1]]) {
    const ex = ax + 4 + k, ey = -9 - tw * (k ? 0.6 : 1);
    c.beginPath(); c.moveTo(ax, -3.5); c.lineTo(ax + 2, -7.5 - tw * 0.3); c.lineTo(ex, ey); c.stroke();
    c.fillStyle = LEG; c.beginPath(); c.ellipse(ex + 0.6, ey - 0.4, 1.5, 1, -0.5, 0, TAU); c.fill();
  }
  // pincers (open on wind-up)
  c.strokeStyle = LEG; c.lineWidth = 1.8;
  const op = 0.3 + w * 0.6 - r * 0.5;
  c.beginPath(); c.moveTo(17.5, -2); c.quadraticCurveTo(21.5, -3 - op * 4, 22.5, -1 - op * 2); c.stroke();
  c.beginPath(); c.moveTo(17.5, 3); c.quadraticCurveTo(21.5, 4 + op * 4, 22.5, 2 + op * 2); c.stroke();
  // face (brows angled in = cross, not worried)
  face(c, P, 15, -0.5, 2.3, 1.8, { look: 0.8, tilt: 1.1 + w });
  c.restore();
  c.restore();
  if (w > 0 && P.prog < 0.7) alertMark(c, 0, -30, w);
}

// ---- Packet Moth: fuzzy moth with veined, scalloped envelope-pattern wings, feathery antennae.
function moth(c, P) {
  const w = windOf(P), r = relOf(P), h = hurtOf(P);
  const bx = Math.sin(P.t * 4.3 + P.seed * 7) * 3 + Math.sin(P.t * 9.1) * 1.2;
  const by = -24 + Math.sin(P.t * 3.1 + P.seed * 5) * 4 + Math.cos(P.t * 7.7) * 1.5 + r * 10 + h * 4;
  shadow(c, 8, 2.5, 0.18);
  c.save();
  c.translate(bx + shake(P, 1), by);
  c.scale(P.dir, 1);
  c.rotate(r * 0.5 + Math.sin(P.t * 6) * 0.06 - h * 0.4);
  const flap = w > 0 && P.prog < 0.7 ? 1 + w * 0.25 : 0.35 + Math.abs(Math.sin(P.t * (h ? 10 : 26) + P.seed * 3)) * 0.65;
  const wingCol = mix('#ecdfc2', PALETTE.mint, w * 0.6);
  const edge = '#7d6a4a', vein = rgba('#8d7a5a', 0.75);
  for (const side of [-1, 1]) {
    c.save(); c.scale(1, side * flap);
    // hind wing with eye-spot
    c.fillStyle = shade(wingCol, -0.12);
    c.beginPath(); c.ellipse(-4, 6, 6, 7, 0.5, 0, TAU); c.fill(); outline(c, edge, 0.8);
    c.fillStyle = rgba('#7d6a4a', 0.5); c.beginPath(); c.arc(-6, 8, 1.8, 0, TAU); c.fill();
    c.fillStyle = '#f7efdc'; c.beginPath(); c.arc(-6.3, 7.6, 0.7, 0, TAU); c.fill();
    c.strokeStyle = vein; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(-1, 1); c.lineTo(-8, 9); c.moveTo(-1, 1); c.lineTo(-4, 12); c.stroke();
    // fore wing: scalloped trailing edge
    c.fillStyle = wingCol;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-4, 16, 2, 15.5);
    c.quadraticCurveTo(3.5, 17, 5, 15); c.quadraticCurveTo(7, 16, 8, 13.5); c.quadraticCurveTo(10.5, 13, 10, 10);
    c.quadraticCurveTo(11, 6, 2, 0); c.closePath(); c.fill(); outline(c, edge, 0.9);
    // wing veins fanning from the root
    c.strokeStyle = vein; c.lineWidth = 0.55;
    c.beginPath();
    for (const [vx, vy] of [[-1.5, 14.5], [3, 15.5], [7, 14], [9.6, 10]]) { c.moveTo(0.6, 0.8); c.quadraticCurveTo(vx * 0.35 + 1, vy * 0.5, vx, vy); }
    c.moveTo(1.5, 4); c.quadraticCurveTo(5, 5.5, 8.5, 5.5);
    c.stroke();
    // dusty margin band
    c.fillStyle = rgba('#8d7a5a', 0.22);
    c.beginPath(); c.ellipse(5, 14.2, 5.5, 1.6, -0.15, 0, TAU); c.fill();
    // envelope on the wing
    c.fillStyle = '#fff'; c.fillRect(1.5, 7, 6.5, 4.6);
    c.strokeStyle = w > 0 ? PALETTE.mintDeep : '#a8483a'; c.lineWidth = 0.8;
    c.strokeRect(1.5, 7, 6.5, 4.6); c.beginPath(); c.moveTo(1.5, 7); c.lineTo(4.75, 9.6); c.lineTo(8, 7); c.stroke();
    c.restore();
  }
  // fuzzy body: abdomen segments + fluffy thorax collar
  c.fillStyle = '#d8c7a0';
  c.beginPath(); c.ellipse(-1, 0, 7.5, 3.6, 0, 0, TAU); c.fill(); outline(c, '#8d7a5a', 0.8);
  c.strokeStyle = '#b29d70'; c.lineWidth = 0.8;
  for (let i = -6; i <= 0; i += 2) { c.beginPath(); c.moveTo(i, -3); c.quadraticCurveTo(i + 0.8, 0, i, 3); c.stroke(); }
  // fuzz tufts around thorax + body edge
  c.strokeStyle = '#f4ead2'; c.lineWidth = 0.7; c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU, rr = 3.6 + (i % 2) * 0.5;
    const fx = 3.2 + Math.cos(a) * rr, fy = Math.sin(a) * rr;
    c.moveTo(3.2 + Math.cos(a) * 2.4, Math.sin(a) * 2.4); c.lineTo(fx + Math.cos(a) * 1.4, fy + Math.sin(a) * 1.4);
  }
  for (let i = -7; i <= -1; i += 1.5) { c.moveTo(i, 3.2); c.lineTo(i - 0.6, 4.6); c.moveTo(i, -3.2); c.lineTo(i - 0.6, -4.6); }
  c.stroke();
  c.fillStyle = '#efe3c4'; c.beginPath(); c.arc(3.2, 0, 3.2, 0, TAU); c.fill();
  // head
  c.fillStyle = '#efe2c2'; c.beginPath(); c.arc(7.5, -0.5, 4, 0, TAU); c.fill(); outline(c, '#8d7a5a', 0.8);
  // feathery (bipectinate) antennae
  const twitch = Math.sin(P.t * 7 + P.seed * 4) * 0.8 + w * 1.2;
  c.strokeStyle = '#5a4630'; c.lineWidth = 0.9;
  const ants = [[8.5, -4, 10.5, -11 - twitch, 15, -11.5 - twitch], [9.5, -3.5, 13.5, -8 - twitch * 0.6, 17, -7 - twitch * 0.6]];
  for (const [x0, y0, cx, cy, x1, y1] of ants) {
    c.lineWidth = 0.9; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke();
    c.lineWidth = 0.45; c.beginPath();
    for (let k = 0.2; k <= 0.95; k += 0.12) {
      const ix = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * cx + k * k * x1;
      const iy = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * cy + k * k * y1;
      const L = 2.2 * (1 - Math.abs(k - 0.55));
      c.moveTo(ix, iy); c.lineTo(ix - L * 0.5, iy - L);
      c.moveTo(ix, iy); c.lineTo(ix + L * 0.6, iy + L * 0.5 - 0.4);
    }
    c.stroke();
  }
  face(c, P, 8.5, -1, 1.7, 1.25, { look: 0.9, tilt: 0.8 + w * 0.6 });
  c.restore();
  if (w > 0) {
    // data-packet glow on wind-up
    c.fillStyle = rgba(PALETTE.mint, 0.25 * w);
    c.beginPath(); c.arc(bx, by, 14 + w * 4, 0, TAU); c.fill();
    if (P.prog < 0.7) alertMark(c, bx, by - 18, w);
  }
}

// ---- Cable Spider: charcoal body, braided cable legs with ferrite-bead knees ending in plugs,
// vented power-brick abdomen, sparks on attack.
function cable_spider(c, P) {
  const w = windOf(P), r = relOf(P), h = hurtOf(P);
  const mv = moving(P);
  const rise = w * 4 - r * 2 + (mv ? Math.abs(Math.sin(P.t * 10)) * 1.5 : Math.sin(P.t * 2) * 0.6);
  shadow(c, 18, 5, 0.27);
  if (w > 0 && P.prog < 0.7) telegraph(c, 22, 8, w, '#ffd84a');
  c.save();
  c.translate(shake(P, 1.3), 0);
  c.scale(P.dir, 1);
  const by = -12 - rise;
  // 8 cable legs (4 per side): hip -> knee (ferrite bead) -> foot (plug). Far side first, dimmer.
  const cables = ['#2b2b33', '#e8e2d2', '#2b2b33', '#d9534f'];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const ph = P.t * (mv ? 16 : 2.5) + i * 1.6 + (side > 0 ? Math.PI : 0);
      const sw = Math.sin(ph) * (mv ? 3 : 0.8), lift = mv ? Math.max(0, Math.cos(ph)) * 1.6 : 0;
      const ax = -6 + i * 4, ay = by + 2;
      const fx = ax + (i - 1.5) * 8 + sw, fy = (side > 0 ? 1 : -4) - lift;
      const kx = ax + (i - 1.5) * 6.5 + sw * 0.5, ky = by - 5 - (side < 0 ? 2 : 0) - Math.abs(i - 1.5) * 0.8;
      const col = side < 0 ? shade(cables[i], -0.25) : cables[i];
      // cable: dark sheath outline, colour core, braided tick texture
      c.lineCap = 'round'; c.lineJoin = 'round';
      const path = () => { c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(lerp(ax, kx, 0.4), ky - 1.5, kx, ky); c.quadraticCurveTo(lerp(kx, fx, 0.7), lerp(ky, fy, 0.3), fx, fy - 3); };
      path(); c.strokeStyle = '#121219'; c.lineWidth = 2.6; c.stroke();
      path(); c.strokeStyle = col; c.lineWidth = 1.7; c.stroke();
      c.setLineDash([0.8, 1.6]); c.lineDashOffset = mv ? -P.t * 10 : 0;
      path(); c.strokeStyle = rgba(cables[i] === '#e8e2d2' ? '#9a948a' : '#ffffff', 0.35); c.lineWidth = 1.7; c.stroke();
      c.setLineDash([]);
      // ferrite bead at the knee
      c.save(); c.translate(kx, ky); c.rotate(Math.atan2(fy - ky, fx - kx) * 0.5);
      c.fillStyle = side < 0 ? '#2a2c34' : '#3a3d48'; rrect(c, -2.2, -1.6, 4.4, 3.2, 1.2); c.fill(); outline(c, '#111218', 0.6);
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-1.6, -1.2, 3.2, 0.6);
      c.restore();
      // plug
      c.fillStyle = side < 0 ? '#a9acb4' : '#c9ccd4'; rrect(c, fx - 1.8, fy - 3.4, 3.6, 3.4, 0.8); c.fill(); outline(c, '#6b7080', 0.5);
      c.fillStyle = '#e6c25a'; c.fillRect(fx - 1.3, fy, 0.8, 1.7); c.fillRect(fx + 0.5, fy, 0.8, 1.7);
    }
  }
  // abdomen + body drawn over the legs
  const g = c.createRadialGradient(-7, by - 5, 1, -4, by, 12);
  g.addColorStop(0, '#62667a'); g.addColorStop(1, '#202129');
  c.fillStyle = g;
  c.beginPath(); c.ellipse(-5, by, 10, 8, 0, 0, TAU); c.fill(); outline(c, '#0f1015', 1);
  c.strokeStyle = 'rgba(200,210,235,0.35)'; c.lineWidth = 0.8;
  c.beginPath(); c.ellipse(-5, by, 8.8, 6.8, 0, Math.PI * 1.1, Math.PI * 1.7); c.stroke();
  // power-brick stripe with vent slits + status LED
  c.fillStyle = '#383a46'; rrect(c, -12, by - 2.4, 11, 4.8, 1.5); c.fill(); outline(c, '#15161c', 0.6);
  c.strokeStyle = '#1b1c23'; c.lineWidth = 0.7;
  for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(-10.5 + k * 1.8, by - 1.3); c.lineTo(-10.5 + k * 1.8, by + 1.3); c.stroke(); }
  c.fillStyle = w > 0 ? '#ffe46a' : PALETTE.mint; c.beginPath(); c.arc(-2.6, by, 1.1, 0, TAU); c.fill();
  // spinneret cable trailing behind
  c.strokeStyle = '#2b2b33'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-14.5, by + 1); c.quadraticCurveTo(-19, by + 4 + Math.sin(P.t * 3) * 1.5, -20, by + 9); c.stroke();
  c.fillStyle = '#c9ccd4'; rrect(c, -21.4, by + 8.5, 2.8, 2.6, 0.6); c.fill();
  // head
  c.fillStyle = '#2d2f39'; c.beginPath(); c.ellipse(6, by + 1, 6.5, 5.5, 0, 0, TAU); c.fill(); outline(c, '#111218', 1);
  c.fillStyle = 'rgba(200,210,235,0.3)'; c.beginPath(); c.ellipse(5, by - 2.6, 3, 0.9, -0.2, 0, TAU); c.fill();
  // LED cluster (extra eyes)
  for (const [ex, ey] of [[3.5, by - 2.5], [10.5, by - 2], [5, by - 3.6], [9, by - 3.4]]) { c.fillStyle = rgba(PALETTE.danger, 0.9); c.beginPath(); c.arc(ex, ey, 0.8, 0, TAU); c.fill(); }
  face(c, P, 7.5, by + 1.2, 2.3, 1.8, { look: 0.8, tilt: 1.1 + w * 0.8 });
  c.fillStyle = '#c9ccd4'; c.fillRect(11, by + 4, 1, 2.2); c.fillRect(13, by + 4, 1, 2.2); // fangs (prongs)
  // electricity
  if (w > 0.2 || r > 0) {
    const k = r > 0 ? 1 - r * 0.5 : w;
    zap(c, 10, by + 5, 18, by - 6 + Math.sin(P.t * 40) * 3, P.t, '#fff27a', 1 + k);
    zap(c, 6, by - 4, 2, by - 15, P.t + 0.3, '#bfe9ff', 0.9 + k * 0.6);
    if (r > 0) { c.fillStyle = rgba('#fff27a', 0.55 * (1 - r)); c.beginPath(); c.arc(16, by, 6 + r * 12, 0, TAU); c.fill(); }
    sparkle(c, 18, by - 6, 2.5 * k, 0.9, '#fff9c4');
  }
  c.restore();
  if (h > 0.3) sparkle(c, 0, -26, 2.5, h, '#fff27a');
  if (w > 0 && P.prog < 0.7) alertMark(c, 0, -34, w);
}

// ================================================================ KITCHEN
// ---- Dough Blob: mischievous sourdough boule: scored top, flour dust, crusty base, air bubbles.
// Stretches tall on wind-up (gluten strands across the pinching waist), splats on release.
function dough_blob(c, P) {
  const w = windOf(P), r = relOf(P), h = hurtOf(P);
  const small = !!P.o?.small;
  const s = small ? 0.62 : 1;
  const mv = moving(P);
  const hop = mv ? (P.t * 2.4 + P.seed) % 1 : 0;
  const air = mv ? Math.sin(hop * Math.PI) * 5 : 0;
  const land = mv ? Math.max(0, 1 - hop * 5) : 0;
  let sx = 1 + Math.sin(P.t * 5 + P.seed * 6) * 0.05 + land * 0.2 + h * 0.28 + r * 0.45;
  let sy = 1 - Math.sin(P.t * 5 + P.seed * 6) * 0.05 - land * 0.18 - h * 0.3 - r * 0.4;
  sy += w * 0.45; sx -= w * 0.2;
  c.save(); c.scale(s, s);
  shadow(c, 15 * sx, 4.5, 0.25);
  if (w > 0 && P.prog < 0.7) telegraph(c, 20, 7, w, '#f2c26b');
  c.save();
  c.translate(shake(P, 1), -air);
  c.scale(sx, sy);
  const R = 13;
  const base = '#f3dfb4', crust = '#d9b47a', deep = '#b98b4e', bake = '#c48a4c';
  // body outline (wobbly)
  const pts = 18;
  const body = () => {
    c.beginPath();
    for (let i = 0; i <= pts; i++) {
      const a = Math.PI + (i / pts) * Math.PI;
      const wob = 1 + Math.sin(a * 3 + P.t * 4 + P.seed * 9) * 0.05;
      const x = Math.cos(a) * R * 1.1 * wob, y = -R * 0.95 + Math.sin(a) * R * wob;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.bezierCurveTo(R * 1.25, -R * 0.2, R * 0.9, 1, 0, 1);
    c.bezierCurveTo(-R * 0.9, 1, -R * 1.25, -R * 0.2, -R * 1.1, -R * 0.95);
    c.closePath();
  };
  body();
  const g = c.createRadialGradient(-4, -R * 1.4, 2, 0, -R * 0.7, R * 1.6);
  g.addColorStop(0, '#fff6e2'); g.addColorStop(0.6, base); g.addColorStop(1, crust);
  c.fillStyle = g; c.fill();
  c.save(); body(); c.clip();
  // crusty, baked base with blisters
  const cg = c.createLinearGradient(0, -7, 0, 1);
  cg.addColorStop(0, rgba(bake, 0)); cg.addColorStop(0.45, rgba(bake, 0.75)); cg.addColorStop(1, shade(bake, -0.2));
  c.fillStyle = cg; c.fillRect(-R * 1.4, -7, R * 2.8, 9);
  c.fillStyle = rgba('#8a5a2e', 0.45);
  for (const [bx, by] of [[-9, -2.2], [-4, -1.2], [2, -1.6], [7.5, -2.4], [10.5, -4]]) { c.beginPath(); c.arc(bx, by, 0.7, 0, TAU); c.fill(); }
  // flour patches + speckles
  c.fillStyle = 'rgba(255,255,255,0.72)';
  c.beginPath(); c.ellipse(-6, -R * 1.62, 5.5, 2, -0.25, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(8.5, -R * 1.3, 2.8, 1.5, 0.5, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(-11, -R * 0.75, 1.6, 2.6, 0.2, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [fx, fy] of [[-2, -22], [3, -23.5], [-9.5, -17], [10, -14], [5.5, -19.5], [-12, -12], [0, -20.5]]) { c.beginPath(); c.arc(fx, fy, 0.55, 0, TAU); c.fill(); }
  c.restore();
  body(); outline(c, deep, 1.1);
  // bread score: a curved slash across the top that gapes open on wind-up (shows the crumb)
  const gape = 1.2 + w * 1.8 + h * 0.6;
  c.fillStyle = '#fffaf0';
  c.beginPath(); c.moveTo(-8.5, -19.2); c.quadraticCurveTo(-1, -26 - gape, 8.5, -20.5);
  c.quadraticCurveTo(-0.5, -23.2 + gape * 0.3, -8.5, -19.2); c.fill();
  c.strokeStyle = deep; c.lineWidth = 0.9; c.stroke();
  c.strokeStyle = rgba(bake, 0.9); c.lineWidth = 1.4; // the baked "ear" lip
  c.beginPath(); c.moveTo(-7.5, -19.8); c.quadraticCurveTo(-1, -26.6 - gape, 8, -21.2); c.stroke();
  c.fillStyle = rgba(deep, 0.35);
  for (const [px, py] of [[-3, -22.6], [1.5, -22.9], [5, -21.8]]) { c.beginPath(); c.arc(px, py, 0.55, 0, TAU); c.fill(); }
  // waist pinch + gluten strands (about to split)
  if (w > 0.3) {
    const k = (w - 0.3) / 0.7, yw = -R * 0.95;
    c.strokeStyle = rgba(deep, k * 0.9); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-R * 1.05, yw); c.quadraticCurveTo(0, yw + 2.5, R * 1.05, yw); c.stroke();
    c.strokeStyle = rgba('#fff4dc', 0.9 * k); c.lineWidth = 0.7;
    for (const x of [-10, -6, -1.5, 3, 7.5, 10.5]) {
      c.beginPath(); c.moveTo(x, yw - 2.2 - k); c.quadraticCurveTo(x + Math.sin(P.t * 9 + x) * 0.8, yw + 1, x + 0.4, yw + 2.4 + k); c.stroke();
    }
  }
  // bubbles
  for (const [bx, by, br] of [[-6, -7, 1.8], [5, -5, 1.3], [9, -13, 1.4], [-3, -15, 1.1], [-10, -10, 1]]) {
    c.fillStyle = rgba(deep, 0.35); c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(bx - br * 0.3, by - br * 0.3, br * 0.35, 0, TAU); c.fill();
  }
  c.restore();
  // face (not scaled with stretch so eyes stay round): sly half-lidded eyes + smirk
  c.save();
  c.translate(shake(P, 1), -air - R * 0.95 * sy + 1);
  c.scale(P.dir, 1);
  const ex = 2, ey = -1, sep = 3.6, er = 2.4;
  face(c, P, ex, ey, sep, er, { look: 0.7, tilt: 1.3 + w * 0.8 });
  if (hurtOf(P) <= 0.15) {
    // heavy lids, slanting down toward the middle: scheming, not scared
    const lid = 0.25 + (1 - w) * 0.25;
    for (const sgn of [-1, 1]) {
      const cx = ex + sgn * sep;
      c.save();
      c.beginPath(); c.ellipse(cx, ey, er + 0.2, er * 1.15 + 0.2, 0, 0, TAU); c.clip();
      const yo = ey - er * 1.15 + er * 2.3 * lid, yi = yo + er * 0.7;
      c.fillStyle = shade(base, -0.06);
      c.beginPath(); c.moveTo(cx - sgn * er * 1.3, ey - er * 2); c.lineTo(cx - sgn * er * 1.3, yi * 1 - 0.0); c.lineTo(cx + sgn * er * 1.3, yo); c.lineTo(cx + sgn * er * 1.3, ey - er * 2); c.closePath(); c.fill();
      c.strokeStyle = INK; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(cx - sgn * er * 1.3, yi); c.lineTo(cx + sgn * er * 1.3, yo); c.stroke();
      c.restore();
    }
  }
  if (h > 0.15) mouth(c, 3, 5, 3.6, 0.2);
  else if (r > 0 || w > 0.55) mouth(c, 3, 5, 4, r > 0 ? 0.9 : (w - 0.55) * 1.4);
  else {
    // lopsided grin with a tooth
    c.strokeStyle = INK; c.lineWidth = 1.1; c.lineCap = 'round';
    c.fillStyle = INK;
    c.beginPath(); c.moveTo(-2, 4); c.quadraticCurveTo(3, 8.6, 8.4, 2.2); c.quadraticCurveTo(3.4, 5.4, -2, 4); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(4.4, 4.9); c.lineTo(6.4, 4.1); c.lineTo(5.6, 5.9); c.closePath(); c.fill();
    c.fillStyle = '#d9606e'; c.beginPath(); c.arc(2.2, 5.9, 1, 0, Math.PI); c.fill();
  }
  c.fillStyle = 'rgba(232,120,110,0.35)'; c.beginPath(); c.arc(-4, 3, 1.8, 0, TAU); c.arc(9, 3, 1.8, 0, TAU); c.fill();
  c.restore();
  // splat droplets on release, still tethered by stretchy gluten strands
  if (r > 0) {
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i / 4) * Math.PI;
      const dx = Math.cos(a) * (14 + r * 12), dy = -6 + Math.sin(a) * (6 + r * 8);
      c.strokeStyle = rgba(crust, 0.8 * (1 - r)); c.lineWidth = 1.2 * (1 - r) + 0.3;
      c.beginPath(); c.moveTo(Math.cos(a) * 11, -6 + Math.sin(a) * 5); c.quadraticCurveTo((dx + Math.cos(a) * 11) / 2, (dy - 6 + Math.sin(a) * 5) / 2 + 2, dx, dy); c.stroke();
      c.fillStyle = rgba(base, 1 - r); c.beginPath(); c.arc(dx, dy, 2, 0, TAU); c.fill();
    }
  }
  if (w > 0 && P.prog < 0.7) alertMark(c, 0, -R * 2 * sy - 8, w);
  c.restore();
}

// ---- Toaster Turret: chrome toaster, slots glow red on wind-up, toast pops on release.
function toaster(c, P) {
  const w = windOf(P), r = relOf(P), h = hurtOf(P);
  shadow(c, 16, 5, 0.27);
  if (w > 0 && P.prog < 0.7) telegraph(c, 20, 7, w);
  c.save();
  c.translate(shake(P, 1.4), (P.anim === 'idle' ? Math.sin(P.t * 3) * 0.5 : 0) + r * 1.5);
  c.scale(P.dir, 1);
  const W = 30, H = 20, D = 9; // front face W x H, top depth D
  const x0 = -W / 2, y0 = -H - 2;
  // toast (behind front face, rises out of slots)
  const pop = r > 0 ? Math.sin(Math.min(1, r * 1.4) * Math.PI * 0.5) * 12 : w * 2;
  const slotY = y0 - D / 2;
  const toastUp = (dx) => {
    const top = slotY - 4 - pop;
    c.fillStyle = '#e1a95f'; rrect(c, dx - 4.5, top, 9, slotY - top + 1, 3); c.fill(); outline(c, '#9a6230', 0.9);
    c.fillStyle = '#f7dca6'; rrect(c, dx - 3, top + 1.5, 6, Math.max(1, slotY - top - 2), 2); c.fill();
  };
  // top face
  c.fillStyle = '#e6eaf0';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + 4, y0 - D); c.lineTo(x0 + W + 4, y0 - D); c.lineTo(x0 + W, y0); c.closePath(); c.fill(); outline(c, '#7d8796', 1);
  // slots
  for (const sx of [-6, 6]) {
    const glow = w * (0.6 + 0.4 * Math.sin(P.t * 30));
    c.fillStyle = mix('#2a2d36', '#ff4a2a', glow);
    rrect(c, sx - 5 + 2, y0 - D / 2 - 1.5, 10, 3, 1.5); c.fill();
    if (glow > 0.2) { c.fillStyle = rgba('#ff9a4a', glow * 0.4); c.beginPath(); c.ellipse(sx + 2, y0 - D / 2, 8, 4, 0, 0, TAU); c.fill(); }
  }
  if (pop > 3) { toastUp(-4); toastUp(8); }
  // front face (chrome gradient)
  const g = c.createLinearGradient(x0, y0, x0, y0 + H);
  g.addColorStop(0, '#f4f7fb'); g.addColorStop(0.45, '#b9c2cf'); g.addColorStop(0.55, '#d8dee8'); g.addColorStop(1, '#8a94a4');
  c.fillStyle = g; rrect(c, x0, y0, W, H, 4); c.fill(); outline(c, '#6b7484', 1);
  // side face
  c.fillStyle = '#9aa3b2';
  c.beginPath(); c.moveTo(x0 + W, y0 + 2); c.lineTo(x0 + W + 4, y0 - D + 2); c.lineTo(x0 + W + 4, y0 + H - D + 1); c.lineTo(x0 + W, y0 + H - 1); c.closePath(); c.fill();
  // lever + dial
  c.fillStyle = '#2b2f3a'; rrect(c, x0 + W + 1, y0 + 4 + (r > 0 ? 6 : w * 4), 5, 3, 1); c.fill();
  c.fillStyle = '#2b2f3a'; c.beginPath(); c.arc(x0 + 5, y0 + H - 5, 2.4, 0, TAU); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x0 + 5, y0 + H - 5); c.lineTo(x0 + 5 + Math.cos(P.t * 2) * 2, y0 + H - 5 + Math.sin(P.t * 2) * 2); c.stroke();
  // reflection streak
  c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(x0 + 3, y0 + 2, 1.6, H - 6);
  // face
  face(c, P, 2, y0 + 8, 5, 2.6, { look: 0.7, tilt: -1.4 - w });
  mouth(c, 3, y0 + 14.5, 4.5, r > 0 ? 0.8 : 0);
  // feet
  c.fillStyle = '#2b2f3a'; c.fillRect(x0 + 3, -3, 5, 3); c.fillRect(x0 + W - 8, -3, 5, 3);
  c.restore();
  if (h > 0.3) puff(c, 6, -30, 3, h * 0.6, '#555');
  if (w > 0 && P.prog < 0.7) alertMark(c, 0, -44, w);
}

// ---- Screaming Kettle: polka-dot enamel teapot-kettle with a flower decal, cane-wrapped handle,
// open spout with a whistle flap. Idles with a lazy steam curl; reddens, rattles and screams a steam cone.
function kettle(c, P) {
  const w = windOf(P), r = relOf(P), h = hurtOf(P);
  const mv = moving(P);
  const wob = mv ? Math.sin(P.t * 10) * 0.08 : 0;
  shadow(c, 15, 4.5, 0.27);
  if (w > 0 && P.prog < 0.7) telegraph(c, 20, 7, w);
  c.save();
  c.translate(shake(P, 1.5), mv ? -Math.abs(Math.sin(P.t * 10)) * 2 : 0);
  c.rotate(wob - h * 0.2 * P.dir);
  c.scale(P.dir, 1);
  const body = mix('#5fb3a8', '#e04a3a', Math.max(w * 0.85, r));
  const dark = shade(body, -0.3), enamel = '#fff6e5';
  // spout (pointing forward) with an open, rimmed mouth
  c.fillStyle = body;
  c.beginPath(); c.moveTo(9, -10); c.quadraticCurveTo(17, -11, 20, -20); c.lineTo(23, -19); c.quadraticCurveTo(20, -7, 10, -5); c.closePath(); c.fill(); outline(c, dark, 1);
  c.strokeStyle = rgba('#ffffff', 0.35); c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(12, -9.6); c.quadraticCurveTo(17, -11.5, 19.6, -18); c.stroke();
  c.fillStyle = enamel; c.beginPath(); c.ellipse(21.5, -19.6, 2.6, 1.5, -0.45, 0, TAU); c.fill(); outline(c, dark, 0.8);
  c.fillStyle = '#2b2f3a'; c.beginPath(); c.ellipse(21.6, -19.7, 1.5, 0.75, -0.45, 0, TAU); c.fill();
  // whistle flap: hinged on the spout, lifts as pressure builds
  c.save(); c.translate(19.6, -21); c.rotate(-0.45 - Math.min(1, w * 1.3 + r) * 0.9 - (w > 0.5 ? Math.abs(Math.sin(P.t * 45)) * 0.25 : 0));
  c.fillStyle = '#d8dee8'; rrect(c, 0, -1, 4.6, 1.8, 0.8); c.fill(); outline(c, '#6b7484', 0.6);
  c.restore();
  // body
  const bodyPath = () => { c.beginPath(); c.moveTo(-13, -2); c.bezierCurveTo(-16, -14, -9, -24, 0, -24); c.bezierCurveTo(9, -24, 16, -14, 13, -2); c.quadraticCurveTo(0, 1, -13, -2); };
  const g = c.createRadialGradient(-5, -18, 2, 0, -12, 17);
  g.addColorStop(0, shade(body, 0.4)); g.addColorStop(0.6, body); g.addColorStop(1, dark);
  c.fillStyle = g; bodyPath(); c.fill();
  c.save(); bodyPath(); c.clip();
  // polka dots (skip where the face sits)
  c.fillStyle = rgba(enamel, 0.8);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      const dx = -14 + col * 4.6 + (row % 2) * 2.3, dy = -21 + row * 4.4;
      if (dx > -5 && dx < 8 && dy > -19 && dy < -2) continue;
      c.beginPath(); c.arc(dx, dy, 0.95, 0, TAU); c.fill();
    }
  }
  // rim bands: shoulder band under the lid + base band
  c.strokeStyle = enamel; c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(0, -20.8, 11, 2.6, 0, 0.05, Math.PI - 0.05); c.stroke();
  c.fillStyle = dark; c.beginPath(); c.moveTo(-15, -4.2); c.quadraticCurveTo(0, -1.2, 15, -4.2); c.lineTo(15, 2); c.lineTo(-15, 2); c.fill();
  c.strokeStyle = enamel; c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(-15, -4.4); c.quadraticCurveTo(0, -1.4, 15, -4.4); c.stroke();
  c.restore();
  bodyPath(); outline(c, dark, 1.1);
  // flower decal on the back cheek
  c.save(); c.translate(-8.6, -10.5); c.rotate(-0.25);
  c.fillStyle = '#5c9a4f';
  c.beginPath(); c.ellipse(-2.6, 2.6, 2.2, 1, 0.7, 0, TAU); c.ellipse(2.4, 2.8, 2, 0.9, -0.6, 0, TAU); c.fill();
  c.fillStyle = '#ff8fb1';
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; c.beginPath(); c.ellipse(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 1.5, 1.05, a, 0, TAU); c.fill(); }
  c.strokeStyle = rgba('#b8476b', 0.7); c.lineWidth = 0.4;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; c.beginPath(); c.ellipse(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 1.5, 1.05, a, 0, TAU); c.stroke(); }
  c.fillStyle = '#ffd34a'; c.beginPath(); c.arc(0, 0, 1.1, 0, TAU); c.fill();
  c.restore();
  // glaze highlight
  c.fillStyle = rgba('#ffffff', 0.45); c.beginPath(); c.ellipse(-7, -16.5, 1.8, 4.2, 0.35, 0, TAU); c.fill();
  c.fillStyle = rgba('#ffffff', 0.6); c.beginPath(); c.arc(-4.6, -20.4, 0.8, 0, TAU); c.fill();
  // lid + knob (rattles)
  const rat = w > 0 ? Math.abs(Math.sin(P.t * 50)) * 2 * w : 0;
  c.fillStyle = shade(body, -0.1); c.beginPath(); c.ellipse(0, -23.5 - rat, 8, 2.6, 0, 0, TAU); c.fill(); outline(c, dark, 0.9);
  c.strokeStyle = rgba(enamel, 0.7); c.lineWidth = 0.6; c.beginPath(); c.ellipse(0, -23.7 - rat, 5.2, 1.5, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  c.fillStyle = '#2b2f3a'; c.beginPath(); c.ellipse(0, -25 - rat, 1.2, 0.8, 0, 0, TAU); c.fill();
  c.fillStyle = '#2b2f3a'; c.beginPath(); c.arc(0, -26.8 - rat, 2.1, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.arc(-0.7, -27.6 - rat, 0.75, 0, TAU); c.fill();
  // cane-wrapped handle on metal posts
  c.fillStyle = '#4a4f5c';
  rrect(c, -10.2, -23.4, 2.6, 3.2, 0.8); c.fill(); rrect(c, 6.8, -23.4, 2.6, 3.2, 0.8); c.fill();
  const hp = (k) => [(1 - k) * (1 - k) * -9 + 2 * (1 - k) * k * -1 + k * k * 8, (1 - k) * (1 - k) * -22.5 + 2 * (1 - k) * k * -37 + k * k * -22.5];
  c.lineCap = 'round';
  c.strokeStyle = '#7a4e32'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-9, -22.5); c.quadraticCurveTo(-1, -37, 8, -22.5); c.stroke();
  c.strokeStyle = '#d4a373'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-9, -22.5); c.quadraticCurveTo(-1, -37, 8, -22.5); c.stroke();
  c.strokeStyle = '#8a5a3a'; c.lineWidth = 0.7;
  for (let k = 0.1; k < 0.95; k += 0.075) {
    const [x0, y0] = hp(k), [x1, y1] = hp(k + 0.02);
    const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
    c.beginPath(); c.moveTo(x0 - (nx / L) * 1.3 - 0.4, y0 - (ny / L) * 1.3); c.lineTo(x0 + (nx / L) * 1.3 + 0.4, y0 + (ny / L) * 1.3); c.stroke();
  }
  c.strokeStyle = 'rgba(255,240,215,0.6)'; c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(-6.5, -27); c.quadraticCurveTo(-1, -33.6, 4, -28.4); c.stroke();
  // face
  face(c, P, 1, -13, 4, 2.5, { look: 0.6, tilt: 1.1 + w * 1.2 });
  mouth(c, 2, -6.5, 4.5, r > 0 ? 1 : w * 0.6);
  c.fillStyle = 'rgba(232,120,110,0.4)'; c.beginPath(); c.arc(-4.6, -9, 1.6, 0, TAU); c.arc(8.2, -9, 1.6, 0, TAU); c.fill();
  c.restore();
  // lazy steam curl from the spout while calm
  if (w === 0 && r === 0) {
    c.save(); c.scale(P.dir, 1);
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const k = (P.t * 0.6 + i * 0.5 + P.seed) % 1;
      c.globalAlpha *= 1;
      c.lineWidth = 1.6 - k * 0.8;
      c.strokeStyle = `rgba(255,255,255,${(0.6 * Math.sin(k * Math.PI)).toFixed(3)})`;
      c.beginPath();
      for (let j = 0; j <= 8; j++) {
        const q = j / 8, yy = -22 - k * 10 - q * 9;
        const xx = 22 + Math.sin(q * 5 + P.t * 3 + i * 2) * (1.5 + q * 1.5) + q * 1.5;
        if (j === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
      }
      c.stroke();
    }
    c.restore();
  }
  // steam puffs from lid during wind-up
  if (w > 0) {
    for (let i = 0; i < 3; i++) {
      const k = (P.t * 2 + i / 3) % 1;
      puff(c, Math.sin(i * 3 + P.t * 4) * 3, -30 - k * 14, 2 + k * 3, (0.7 - k * 0.7) * w);
    }
  }
  // steam cone on release (screams)
  if (r > 0 || (P.anim === 'attack' && P.prog > 0.68)) {
    const k = Math.max(r, 0.05);
    c.save(); c.scale(P.dir, 1); c.translate(22, -20);
    const len = 14 + k * 30;
    const cg = c.createLinearGradient(0, 0, len, 0);
    cg.addColorStop(0, 'rgba(255,255,255,0.85)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = cg;
    c.beginPath(); c.moveTo(0, -1.5); c.lineTo(len, -6 - k * 8); c.lineTo(len, 6 + k * 8); c.lineTo(0, 1.5); c.closePath(); c.fill();
    for (let i = 0; i < 4; i++) puff(c, 6 + i * len / 4, Math.sin(P.t * 20 + i) * 2, 2 + i * 1.3, 0.6 * (1 - i / 5));
    // "scream" lines
    c.strokeStyle = rgba(PALETTE.danger, 0.8); c.lineWidth = 1.2;
    for (const a of [-0.9, -0.5]) { c.beginPath(); c.moveTo(Math.cos(a) * 4, -6 + Math.sin(a) * 4); c.lineTo(Math.cos(a) * 9, -6 + Math.sin(a) * 9); c.stroke(); }
    c.restore();
  }
  if (h > 0.3) puff(c, 0, -34, 3, 0.5 * h);
  if (w > 0 && P.prog < 0.7) alertMark(c, 0, -46, w);
}

// ================================================================ DINING
// ---- Flying Plate: spinning dinner plate with a face on the rim, motion blur.
function flying_plate(c, P) {
  const w = windOf(P), r = relOf(P), h = hurtOf(P);
  const mv = moving(P) || r > 0;
  const fy = -18 + Math.sin(P.t * 3 + P.seed * 6) * 2.5 - w * 4;
  shadow(c, 11, 3, 0.18);
  c.save();
  c.translate(shake(P, 1), fy);
  const tilt = (w > 0 ? Math.sin(P.t * 18) * 0.25 * w : 0) + (mv ? -0.12 * P.dir : 0) + h * 0.5 * Math.sin(P.t * 30);
  c.rotate(tilt);
  // motion blur ghosts
  if (mv) {
    for (let i = 3; i >= 1; i--) {
      c.fillStyle = `rgba(255,255,255,${0.12 * (4 - i) / 3 + (r > 0 ? 0.08 : 0)})`;
      c.beginPath(); c.ellipse(-P.dir * i * (5 + r * 4), 0, 14, 6.5, 0, 0, TAU); c.fill();
    }
  }
  // underside rim (thickness)
  c.fillStyle = '#c9cfd8'; c.beginPath(); c.ellipse(0, 2, 14, 6.5, 0, 0, TAU); c.fill();
  // plate top
  c.fillStyle = '#fbfaf6'; c.beginPath(); c.ellipse(0, 0, 14, 6.5, 0, 0, TAU); c.fill(); outline(c, '#9aa3b2', 1);
  // blue rim pattern, spinning
  c.strokeStyle = PALETTE.denim; c.lineWidth = 1.2;
  c.beginPath(); c.ellipse(0, 0, 11.5, 5.2, 0, 0, TAU); c.stroke();
  const spin = P.t * (mv ? 16 : 5) + w * 20;
  c.fillStyle = PALETTE.denim;
  for (let i = 0; i < 8; i++) { const a = spin + (i / 8) * TAU; c.beginPath(); c.arc(Math.cos(a) * 12.8, Math.sin(a) * 5.9, 0.9, 0, TAU); c.fill(); }
  // well
  c.fillStyle = '#efece4'; c.beginPath(); c.ellipse(0, 0, 7, 3, 0, 0, TAU); c.fill();
  // glint
  sparkle(c, -6 + Math.sin(spin) * 2, -2.5, 2 + w * 2, 0.9);
  // face on the front rim
  c.save(); c.scale(P.dir, 1);
  face(c, P, 2, 3.2, 3.6, 1.8, { look: 0.8, tilt: -0.9 - w });
  c.restore();
  c.restore();
  if (w > 0 && P.prog < 0.7) alertMark(c, 0, fy - 16, w);
}

// ---- Bull Chair: dining chair with horns; paws the floor, huffs, then charges.
function chair(c, P) {
  const w = windOf(P), r = relOf(P), h = hurtOf(P);
  const mv = moving(P) || r > 0;
  const lean = r > 0 ? 0.28 : -w * 0.12 + h * -0.2;
  const gallop = mv ? P.t * (r > 0 ? 26 : 14) : 0;
  shadow(c, 18, 5, 0.27);
  if (w > 0 && P.prog < 0.7) {
    // charge lane telegraph along facing direction
    c.save(); c.rotate(P.ang);
    c.fillStyle = rgba(PALETTE.danger, 0.1 + 0.15 * w);
    c.fillRect(8, -7, 30 + w * 40, 14);
    c.strokeStyle = rgba(PALETTE.danger, 0.4 + 0.4 * w); c.setLineDash([4, 3]); c.lineWidth = 1.2;
    c.strokeRect(8, -7, 30 + w * 40, 14); c.setLineDash([]);
    c.restore();
  }
  c.save();
  c.translate(shake(P, 0.8), mv ? -Math.abs(Math.sin(gallop)) * 2 : 0);
  c.scale(P.dir, 1);
  c.rotate(lean);
  const wood = '#a8693e', woodD = '#6e4223', woodL = '#c98a56';
  // back legs (rear)
  const legSw = (i) => (mv ? Math.sin(gallop + i * Math.PI) * 3 : 0);
  c.strokeStyle = woodD; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-10, -12); c.lineTo(-11 + legSw(0), 0); c.moveTo(-5, -13); c.lineTo(-5 + legSw(1), -2); c.stroke();
  // front legs; one scrapes the ground during wind-up
  const scrape = w > 0 && P.prog < 0.7 ? Math.sin(P.t * 16) * 5 : 0;
  c.beginPath(); c.moveTo(8, -12); c.lineTo(9 + legSw(1) + scrape, 0); c.moveTo(4, -13); c.lineTo(4 + legSw(0), -2); c.stroke();
  // seat (3/4 view)
  c.fillStyle = woodL;
  c.beginPath(); c.moveTo(-13, -13); c.lineTo(-9, -19); c.lineTo(13, -19); c.lineTo(10, -13); c.closePath(); c.fill(); outline(c, woodD, 1);
  // cushion (dining accent pink)
  c.fillStyle = '#e98aa8'; c.beginPath(); c.moveTo(-10, -14.5); c.lineTo(-7.5, -18); c.lineTo(10.5, -18); c.lineTo(8, -14.5); c.closePath(); c.fill();
  c.fillStyle = wood; c.fillRect(-13, -13, 23, 3); outline(c, woodD, 0.8);
  // backrest = the bull's head (forward side)
  c.fillStyle = wood;
  rrect(c, 7, -40, 9, 26, 3); c.fill(); outline(c, woodD, 1);
  c.fillStyle = woodL; rrect(c, 6, -42, 11, 6, 2.5); c.fill(); outline(c, woodD, 1);
  c.strokeStyle = woodD; c.lineWidth = 1; c.beginPath(); c.moveTo(9.5, -34); c.lineTo(9.5, -17); c.moveTo(13.5, -34); c.lineTo(13.5, -17); c.stroke();
  // horns
  c.fillStyle = CREAM;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(11.5 + s * 4, -40);
    c.quadraticCurveTo(11.5 + s * 12, -42, 11.5 + s * 11 + 3, -51 - w * 2);
    c.quadraticCurveTo(11.5 + s * 8, -44, 11.5 + s * 2, -38);
    c.closePath(); c.fill(); outline(c, '#b8a27a', 0.8);
  }
  // face on backrest
  face(c, P, 12, -30, 2.4, 1.9, { look: 0.9, tilt: -1.3 - w });
  // nostrils + ring
  c.fillStyle = INK; c.beginPath(); c.arc(10.5, -23, 0.8, 0, TAU); c.arc(13.5, -23, 0.8, 0, TAU); c.fill();
  c.strokeStyle = '#e6c25a'; c.lineWidth = 1; c.beginPath(); c.arc(12, -21, 1.8, 0, Math.PI); c.stroke();
  c.restore();
  // steam huffs from nostrils
  if (w > 0 || r > 0) {
    const k = (P.t * 3) % 1;
    c.save(); c.scale(P.dir, 1);
    puff(c, 18 + k * 8, -22 + k * 2, 1.5 + k * 3, (1 - k) * 0.8 * Math.max(w, 0.5));
    c.restore();
  }
  // dust kicked up during wind-up / charge
  if ((w > 0 && P.prog < 0.7) || r > 0) {
    c.save(); c.scale(P.dir, 1);
    for (let i = 0; i < 3; i++) { const k = (P.t * 4 + i / 3) % 1; puff(c, -8 - k * 14, -2 - k * 4, 2 + k * 2, (1 - k) * 0.5, '#d8c7a0'); }
    c.restore();
  }
  if (r > 0) { c.save(); c.scale(P.dir, 1); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.4; for (const y of [-34, -24, -14]) { c.beginPath(); c.moveTo(-18, y); c.lineTo(-28 - r * 6, y); c.stroke(); } c.restore(); }
  if (w > 0 && P.prog < 0.7) alertMark(c, 0, -58, w);
}

// ================================================================ LIVING
// ---- Dust Bunny: fluffy grey dust-ball bunny, hops leaving dust puffs.
function dust_bunny(c, P) {
  const w = windOf(P), r = relOf(P), h = hurtOf(P);
  const mv = moving(P);
  const hopT = (P.t * 3 + P.seed) % 1;
  const air = mv ? Math.sin(hopT * Math.PI) * 8 : r > 0 ? Math.sin(r * Math.PI) * 12 : Math.abs(Math.sin(P.t * 2)) * 0.8;
  const land = mv ? Math.max(0, 1 - hopT * 6) + Math.max(0, (hopT - 0.88) * 8) : 0;
  const crouch = w > 0 && P.prog < 0.7 ? w : 0;
  shadow(c, 11 - air * 0.3, 3.4, 0.22);
  if (crouch) telegraph(c, 16, 6, w);
  // landing dust puffs
  if (mv && hopT < 0.25) { const k = hopT / 0.25; puff(c, -P.dir * 9 - k * 4 * P.dir, -2 - k * 3, 2 + k * 2, 0.5 * (1 - k), '#bdb6ac'); }
  c.save();
  c.translate(shake(P, 1) + (r > 0 ? P.dir * r * 6 : 0), -air);
  c.scale(1 + land * 0.15 + crouch * 0.18 + h * 0.15, 1 - land * 0.15 - crouch * 0.2 - h * 0.15);
  c.scale(P.dir, 1);
  const fur = '#a9a39b', furL = '#d2ccc3', furD = '#77716a';
  // ears (perk up / flatten)
  const earA = crouch ? 0.9 : h ? 1.1 : 0.25 + Math.sin(P.t * 4 + P.seed) * 0.1;
  for (const [ex, s] of [[-1, -1], [4, 1]]) {
    c.save(); c.translate(ex, -17); c.rotate(-earA * (s < 0 ? 1.2 : 0.7) * 0.6 + s * 0.15);
    c.fillStyle = fur; c.beginPath(); c.ellipse(0, -7, 3, 8, 0, 0, TAU); c.fill(); outline(c, furD, 0.8);
    c.fillStyle = '#e8b6b0'; c.beginPath(); c.ellipse(0, -7, 1.3, 5.5, 0, 0, TAU); c.fill();
    c.restore();
  }
  // fluffy body: cluster of puffs
  const R = 10;
  c.fillStyle = furD;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + P.seed; c.beginPath(); c.arc(Math.cos(a) * R * 0.8, -R + Math.sin(a) * R * 0.75, 4, 0, TAU); c.fill(); }
  c.fillStyle = fur; c.beginPath(); c.ellipse(0, -R, R, R * 0.9, 0, 0, TAU); c.fill();
  c.fillStyle = furL;
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + P.seed * 3 + P.t * 0.5; c.beginPath(); c.arc(Math.cos(a) * 5 - 1, -R - 2 + Math.sin(a) * 4, 2.2, 0, TAU); c.fill(); }
  // stray fibers
  c.strokeStyle = furD; c.lineWidth = 0.7;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; c.beginPath(); c.moveTo(Math.cos(a) * R, -R + Math.sin(a) * R * 0.9); c.lineTo(Math.cos(a) * (R + 3), -R + Math.sin(a) * (R + 3) * 0.9); c.stroke(); }
  // tail puff
  c.fillStyle = furL; c.beginPath(); c.arc(-R + 1, -6, 3, 0, TAU); c.fill();
  // face
  face(c, P, 3, -11, 3, 2, { look: 0.8, tilt: -1 - w });
  c.fillStyle = '#e88a9a'; c.beginPath(); c.arc(6, -7.5, 1, 0, TAU); c.fill();
  c.restore();
  if (h > 0.2) { for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + P.t * 3; puff(c, Math.cos(a) * (12 + (1 - h) * 8), -10 + Math.sin(a) * 6, 2, h * 0.6, '#bdb6ac'); } }
  if (crouch) alertMark(c, 0, -38, w);
}

// ---- Roomba Tank (mini-boss): robot vacuum with a mini turret, LED eyes, bumper, spinning brushes.
function roomba(c, P) {
  const w = windOf(P), r = relOf(P), h = hurtOf(P);
  const mv = moving(P);
  const ph = P.phase;
  const RX = 44, RY = 30, TH = 9;
  const ca = Math.cos(P.ang), sa = Math.sin(P.ang);
  // suction swirl (wind-up)
  if (w > 0 && P.prog < 0.7) {
    c.save();
    for (let i = 0; i < 3; i++) {
      const k = 1 - ((P.t * 1.5 + i / 3) % 1);
      c.strokeStyle = rgba('#8a5aa8', 0.75 * w * (1 - k * 0.5)); c.lineWidth = 2.6;
      c.beginPath(); c.ellipse(0, -4, RX * (0.9 + k * 0.9), RY * (0.9 + k * 0.9), 0, P.t * 4 + i, P.t * 4 + i + 3.6); c.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const a = P.t * 3 + i, k = (P.t * 2 + i / 6) % 1, d = (1 - k) * RX * 1.6;
      c.fillStyle = rgba('#a9a39b', 0.7 * w); c.beginPath(); c.arc(Math.cos(a) * d, -4 + Math.sin(a) * d * 0.7, 2, 0, TAU); c.fill();
    }
    c.restore();
  }
  shadow(c, RX + 3, RY * 0.55 + 3, 0.3);
  c.save();
  c.translate(shake(P, 1.5) + (h ? Math.sin(P.t * 50) * 2 * h : 0), r > 0 ? 0 : 0);
  // side brushes (front corners, spinning)
  const spin = P.t * (mv ? 20 : 4);
  for (const s of [-1, 1]) {
    const bx = ca * RX * 0.75 - sa * s * RX * 0.55, by = -4 + sa * RY * 0.75 + ca * s * RY * 0.55;
    c.strokeStyle = '#3a3c48'; c.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { const a = spin * s + (i / 3) * TAU; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(a) * 9, by + Math.sin(a) * 6); c.stroke(); }
  }
  // body side band
  c.fillStyle = '#2b2d36';
  c.beginPath(); c.ellipse(0, -4, RX, RY, 0, 0, Math.PI); c.lineTo(-RX, -4 - TH); c.ellipse(0, -4 - TH, RX, RY, 0, Math.PI, 0, true); c.closePath(); c.fill();
  // tread marks on the band (moving)
  c.fillStyle = '#4a4d5a';
  for (let i = 0; i < 12; i++) {
    const a = ((i / 12) * Math.PI + (mv ? P.t * 3 : 0)) % Math.PI;
    const x = Math.cos(a) * RX * 0.98, y = -4 + Math.sin(a) * RY * 0.98;
    c.fillRect(x - 1.5, y - TH + 1, 3, TH - 2);
  }
  // bumper (front arc, toward facing)
  c.strokeStyle = '#555a68'; c.lineWidth = 4;
  c.beginPath(); c.ellipse(0, -4 - TH / 2, RX + 1, RY + 1, 0, P.ang - 0.9, P.ang + 0.9); c.stroke();
  // top face
  const tg = c.createRadialGradient(-RX * 0.3, -4 - TH - RY * 0.4, 4, 0, -4 - TH, RX);
  tg.addColorStop(0, '#6a6e7c'); tg.addColorStop(0.7, '#41444f'); tg.addColorStop(1, '#2e3039');
  c.fillStyle = tg; c.beginPath(); c.ellipse(0, -4 - TH, RX, RY, 0, 0, TAU); c.fill(); outline(c, '#1b1c22', 1.2);
  c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, -4 - TH, RX * 0.78, RY * 0.78, 0, 0, TAU); c.stroke();
  // camo-ish "tank" plates
  c.fillStyle = 'rgba(201,160,220,0.18)';
  c.beginPath(); c.ellipse(-RX * 0.4, -4 - TH + RY * 0.3, 8, 4, 0.4, 0, TAU); c.ellipse(RX * 0.45, -4 - TH - RY * 0.35, 7, 3.5, -0.3, 0, TAU); c.fill();
  // LED eyes on the front edge of the top face
  const angry = ph >= 2 || w > 0;
  const led = ph >= 3 ? '#ff3a3a' : ph === 2 ? '#ff8a3a' : w > 0 ? '#ffd84a' : '#7fd8ff';
  const ex = ca * RX * 0.62, ey = -4 - TH + sa * RY * 0.62;
  const px = -sa * 7, py = ca * 5;
  if (h > 0.3) {
    c.strokeStyle = led; c.lineWidth = 1.6;
    for (const s of [-1, 1]) { const x = ex + px * s, y = ey + py * s; c.beginPath(); c.moveTo(x - 2.5, y - 2); c.lineTo(x + 2.5, y + 2); c.moveTo(x + 2.5, y - 2); c.lineTo(x - 2.5, y + 2); c.stroke(); }
  } else {
    for (const s of [-1, 1]) {
      const x = ex + px * s, y = ey + py * s;
      c.fillStyle = rgba(led, 0.35); c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
      c.fillStyle = led; c.beginPath(); c.ellipse(x, y, 3, angry ? 1.6 : 2.4, s * (angry ? 0.5 : 0) * Math.sign(ca || 1), 0, TAU); c.fill();
    }
  }
  // turret (tiny, rotates to aim)
  const recoil = r > 0 ? Math.sin(r * Math.PI) * 3 : 0;
  c.save();
  c.translate(0, -4 - TH - 4);
  c.fillStyle = '#5b5f6c'; c.beginPath(); c.ellipse(0, 0, 12, 8, 0, 0, TAU); c.fill(); outline(c, '#1b1c22', 1);
  c.fillStyle = '#6f7482'; c.beginPath(); c.ellipse(0, -3, 10, 6.5, 0, 0, TAU); c.fill(); outline(c, '#1b1c22', 1);
  c.save(); c.rotate(P.ang); c.scale(1, 0.75);
  c.fillStyle = '#3a3c48'; rrect(c, 2 - recoil, -2.8 - 3, 20, 5.6, 2); c.fill(); outline(c, '#1b1c22', 1);
  c.fillStyle = '#2b2d36'; c.fillRect(19 - recoil, -3.6 - 3, 4, 7.2);
  // charging glow at muzzle
  if (w > 0 && P.prog < 0.7) { c.fillStyle = rgba('#ffd84a', 0.4 + 0.5 * w); c.beginPath(); c.arc(24, -3, 2 + w * 3, 0, TAU); c.fill(); }
  // muzzle flash
  if (r > 0 && r < 0.7) {
    const k = 1 - r / 0.7;
    c.fillStyle = rgba('#ffe46a', k); c.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, d = i % 2 ? 4 : 10 * k + 4; c.lineTo(26 + Math.cos(a) * d, -3 + Math.sin(a) * d); }
    c.closePath(); c.fill();
    c.fillStyle = rgba('#fff', k); c.beginPath(); c.arc(26, -3, 3, 0, TAU); c.fill();
  }
  c.restore();
  // hatch + antenna
  c.fillStyle = '#4a4d5a'; c.beginPath(); c.arc(-2, -4, 3.5, 0, TAU); c.fill();
  c.strokeStyle = '#2b2d36'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-7, -4); c.lineTo(-9, -16); c.stroke();
  c.fillStyle = led; c.beginPath(); c.arc(-9, -16.5, 1.8 + (Math.sin(P.t * 8) > 0 ? 0.6 : 0), 0, TAU); c.fill();
  c.restore();
  c.restore();
  // phase sparks
  if (ph >= 2) {
    for (let i = 0; i < ph; i++) {
      const a = P.t * 3 + i * 2.2;
      if (Math.sin(P.t * 13 + i * 5) > 0.3) {
        const x = Math.cos(a) * RX * 0.8, y = -4 - TH + Math.sin(a) * RY * 0.8;
        zap(c, x, y, x + Math.cos(a * 3) * 8, y - 8, P.t + i, ph >= 3 ? '#ff9a6a' : '#fff27a', 1.1);
        sparkle(c, x, y - 4, 2.5, 0.9, '#fff9c4');
      }
    }
  }
  // smoke when damaged
  if (P.hpFrac < 0.6) {
    const n = P.hpFrac < 0.3 ? 4 : 2;
    for (let i = 0; i < n; i++) {
      const k = (P.t * 0.8 + i / n) % 1;
      puff(c, 12 - k * 6 + Math.sin(k * 6 + i) * 3, -26 - k * 28, 3 + k * 5, (1 - k) * 0.45, P.hpFrac < 0.3 ? '#3a3a40' : '#77716a');
    }
  }
  if (w > 0 && P.prog < 0.7) alertMark(c, 0, -60, w);
}

// ================================================================ PLAYROOM
const SUITS = [['♠', INK], ['♥', '#d9343f'], ['♦', '#d9343f'], ['♣', INK]];
// ---- Card Soldier: a playing card with tiny legs and a spear, marching.
function card_soldier(c, P) {
  const w = windOf(P), r = relOf(P), h = hurtOf(P);
  const mv = moving(P);
  const [suit, sc] = SUITS[Math.floor(P.seed * 4) % 4];
  const step = mv ? P.t * 10 : 0;
  shadow(c, 11, 3.5, 0.24);
  if (w > 0 && P.prog < 0.7) telegraph(c, 16, 6, w);
  c.save();
  c.translate(shake(P, 0.8), mv ? -Math.abs(Math.sin(step)) * 1.5 : 0);
  c.scale(P.dir, 1);
  c.rotate(h * -0.3 + (r > 0 ? 0.1 : -w * 0.06));
  // legs (marching high-step)
  c.strokeStyle = INK; c.lineWidth = 1.6; c.lineCap = 'round';
  const l1 = mv ? Math.max(0, Math.sin(step)) * 4 : 0, l2 = mv ? Math.max(0, -Math.sin(step)) * 4 : 0;
  c.beginPath(); c.moveTo(-3, -6); c.lineTo(-3 + l1 * 0.4, -l1); c.moveTo(3, -6); c.lineTo(3 + l2 * 0.4, -l2); c.stroke();
  c.fillStyle = INK; c.fillRect(-4.5 + l1 * 0.4, -1.5 - l1, 3.5, 1.6); c.fillRect(1.5 + l2 * 0.4, -1.5 - l2, 3.5, 1.6);
  // spear arm: back on wind-up, thrust on release
  const thrust = r > 0 ? Math.sin(Math.min(1, r * 1.6) * Math.PI * 0.5) * 10 : -w * 6;
  const spX = 10 + thrust, spY = -13 - (w > 0 && !r ? w * 3 : 0);
  c.strokeStyle = '#8a5a3a'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(spX - 16, spY + 2); c.lineTo(spX + 6, spY - 1); c.stroke();
  c.fillStyle = '#c9ccd4'; c.beginPath(); c.moveTo(spX + 5, spY - 3.5); c.lineTo(spX + 12, spY - 1.5); c.lineTo(spX + 5, spY + 1.5); c.closePath(); c.fill(); outline(c, '#7d8796', 0.7);
  if (w > 0.4 && !r) sparkle(c, spX + 10, spY - 2, 2.2, w, '#fff');
  // card body
  c.fillStyle = '#fbfaf6'; rrect(c, -9, -33, 18, 27, 2.5); c.fill(); outline(c, '#9aa3b2', 1);
  c.strokeStyle = sc; c.lineWidth = 0.7; rrect(c, -7.5, -31.5, 15, 24, 1.5); c.stroke();
  // corner indices
  c.fillStyle = sc; c.font = 'bold 5px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(suit, -5.5, -28.5); c.fillText(suit, 5.5, -9.5);
  // big suit as a belly
  c.font = '9px sans-serif'; c.fillText(suit, 0, -13);
  // hand holding spear
  c.fillStyle = '#fbfaf6'; c.beginPath(); c.arc(spX - 0.5, spY + 0.6, 1.8, 0, TAU); c.fill(); outline(c, INK, 0.6);
  // face
  face(c, P, 1, -23.5, 3, 2, { look: 0.8, tilt: -1 - w });
  mouth(c, 1.5, -18.8, 3, r > 0 ? 0.6 : 0);
  c.restore();
  if (w > 0 && P.prog < 0.7) alertMark(c, 0, -42, w);
}

// ---- Pawn: hopping chess pawn with an angry face.
function pawn(c, P) {
  const w = windOf(P), r = relOf(P), h = hurtOf(P);
  const mv = moving(P);
  const ivory = P.seed > 0.5;
  const base = ivory ? '#f1e6cf' : '#3a3046', dark = ivory ? '#b8a27a' : '#1d1826', light = ivory ? '#ffffff' : '#6a5c80';
  const hopT = (P.t * 1.8 + P.seed) % 1;
  const air = mv ? Math.sin(hopT * Math.PI) * 10 : r > 0 ? Math.sin(r * Math.PI) * 18 : 0;
  const land = mv ? Math.max(0, 1 - hopT * 5) : r > 0.9 ? 1 : 0;
  const crouch = w > 0 && P.prog < 0.7 ? w : 0;
  shadow(c, 12 - air * 0.25, 4 - air * 0.08, 0.25);
  if (crouch) telegraph(c, 22, 9, w);
  c.save();
  c.translate(shake(P, 1), -air);
  c.scale(1 + land * 0.18 + crouch * 0.15 + h * 0.12, 1 - land * 0.18 - crouch * 0.2 - h * 0.12);
  c.rotate(h * 0.25 * Math.sin(P.t * 20));
  c.scale(P.dir, 1);
  const g = c.createLinearGradient(-10, 0, 10, 0);
  g.addColorStop(0, shade(base, -0.15)); g.addColorStop(0.35, light); g.addColorStop(0.6, base); g.addColorStop(1, dark);
  c.fillStyle = g;
  // base
  c.beginPath(); c.ellipse(0, -3, 11, 4, 0, 0, TAU); c.fill(); outline(c, dark, 1);
  c.fillRect(-11, -6, 22, 3);
  c.beginPath(); c.ellipse(0, -6, 11, 3.6, 0, 0, TAU); c.fill(); outline(c, dark, 1);
  // body cone
  c.beginPath(); c.moveTo(-8, -7); c.quadraticCurveTo(-3, -14, -4, -21); c.lineTo(4, -21); c.quadraticCurveTo(3, -14, 8, -7); c.closePath(); c.fill(); outline(c, dark, 1);
  // collar
  c.beginPath(); c.ellipse(0, -21, 6.5, 2.2, 0, 0, TAU); c.fill(); outline(c, dark, 1);
  // head
  c.beginPath(); c.arc(0, -28, 7, 0, TAU); c.fill(); outline(c, dark, 1);
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-3, -31, 1.8, 2.6, -0.4, 0, TAU); c.fill();
  face(c, P, 1.5, -28.5, 2.6, 1.9, { look: 0.7, tilt: -1.2 - w, white: ivory ? '#fff' : '#f1e6cf' });
  mouth(c, 2, -24.5, 3, r > 0 ? 0.5 : 0);
  c.restore();
  if (r > 0.85) { c.strokeStyle = rgba(PALETTE.sun, 1 - (r - 0.85) * 6); c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 14 + (r - 0.85) * 60, 5 + (r - 0.85) * 20, 0, 0, TAU); c.stroke(); }
  if (crouch) alertMark(c, 0, -44, w);
}

// ---- Jack-in-the-Box: crank box; shakes during wind-up, springs a clown head at prog>0.7.
function jack_box(c, P) {
  const w = windOf(P), r = relOf(P), h = hurtOf(P);
  const open = r > 0 ? ease(Math.min(1, r * 2.5)) : 0;
  shadow(c, 18, 5, 0.27);
  if (w > 0 && P.prog < 0.7) telegraph(c, 30, 11, w);
  c.save();
  c.translate(shake(P, 2), (P.anim === 'idle' || P.anim === 'move') ? Math.sin(P.t * 2) * 0.4 : 0);
  c.scale(P.dir, 1);
  const S = 26, D = 10; // front face size, top depth
  const x0 = -S / 2, y0 = -S - 2;
  // front face
  c.fillStyle = '#d9343f'; rrect(c, x0, y0, S, S, 2); c.fill(); outline(c, '#7a1a20', 1);
  c.fillStyle = '#ffc94a';
  c.beginPath(); c.moveTo(x0 + S / 2, y0 + 4); c.lineTo(x0 + S - 4, y0 + S / 2); c.lineTo(x0 + S / 2, y0 + S - 4); c.lineTo(x0 + 4, y0 + S / 2); c.closePath(); c.fill();
  c.fillStyle = PALETTE.sky; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('?', x0 + S / 2, y0 + S / 2 + 0.5);
  // side face
  c.fillStyle = '#3f7fc4';
  c.beginPath(); c.moveTo(x0 + S, y0); c.lineTo(x0 + S + 6, y0 - D); c.lineTo(x0 + S + 6, y0 + S - D); c.lineTo(x0 + S, y0 + S); c.closePath(); c.fill(); outline(c, '#1f4a7a', 1);
  c.fillStyle = '#7fd8a6'; c.beginPath(); c.arc(x0 + S + 3, y0 + S / 2 - D / 2, 2.4, 0, TAU); c.fill();
  // crank on the side
  const ca = P.t * (w > 0 ? 18 : 3);
  const cx = x0 + S + 6, cy = y0 + S / 2 - D / 2;
  c.strokeStyle = '#c9ccd4'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + 3, cy + Math.sin(ca) * 4); c.stroke();
  c.fillStyle = '#e6c25a'; c.beginPath(); c.arc(cx + 3, cy + Math.sin(ca) * 4, 1.6, 0, TAU); c.fill();
  // top face (box interior when open)
  c.fillStyle = open > 0 ? '#2b2232' : '#ffc94a';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + 6, y0 - D); c.lineTo(x0 + S + 6, y0 - D); c.lineTo(x0 + S, y0); c.closePath(); c.fill(); outline(c, '#7a1a20', 1);
  // spring + clown head
  if (open > 0) {
    // lid flipped open on its back hinge
    c.fillStyle = '#ffd96a';
    c.beginPath(); c.moveTo(x0 + 6, y0 - D); c.lineTo(x0 + S + 6, y0 - D); c.lineTo(x0 + S + 8, y0 - D - 13 * open); c.lineTo(x0 + 8, y0 - D - 13 * open); c.closePath(); c.fill(); outline(c, '#7a1a20', 1);
    const up = open * 26 * (h > 0 ? 0.4 : 1);
    const boing = r > 0 ? Math.sin(r * 18) * (1 - r) * 3 : 0;
    const hx = x0 + S / 2 + 3, hb = y0 - D / 2;
    c.strokeStyle = '#c9ccd4'; c.lineWidth = 1.6;
    c.beginPath();
    for (let i = 0; i <= 10; i++) { const k = i / 10; c.lineTo(hx + (i % 2 ? 3.5 : -3.5), hb - k * up); }
    c.stroke();
    const hy = hb - up - 7 + boing;
    // ruff
    c.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; c.beginPath(); c.arc(hx + Math.cos(a) * 6, hy + 6 + Math.sin(a) * 2, 2.6, 0, TAU); c.fill(); }
    // head
    c.fillStyle = '#fbe3cf'; c.beginPath(); c.arc(hx, hy, 7, 0, TAU); c.fill(); outline(c, '#b8a27a', 1);
    // hat
    c.fillStyle = PALETTE.sky; c.beginPath(); c.moveTo(hx - 6, hy - 4); c.lineTo(hx + 2, hy - 17); c.lineTo(hx + 6, hy - 4); c.closePath(); c.fill();
    c.fillStyle = '#ffc94a'; c.beginPath(); c.arc(hx + 2, hy - 17, 2, 0, TAU); c.fill();
    // hair tufts
    c.fillStyle = '#ff7a3a'; c.beginPath(); c.arc(hx - 7, hy, 2.6, 0, TAU); c.arc(hx + 7, hy, 2.6, 0, TAU); c.fill();
    if (h > 0.2) dizzyEyes(c, hx + 1, hy - 1, 2.6, 1.8, P.t);
    else eyes(c, hx + 1, hy - 1, 2.6, 1.9, 0.6, -1.3);
    c.fillStyle = '#d9343f'; c.beginPath(); c.arc(hx + 1.5, hy + 2, 1.6, 0, TAU); c.fill();
    c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.arc(hx + 1, hy + 3, 3, 0.1, Math.PI - 0.1); c.stroke();
  } else {
    // closed lid with a rattle gap during wind-up
    const lift = w > 0 ? Math.abs(Math.sin(P.t * 40)) * 2.5 * w : h > 0 ? 3 * h : 0;
    c.fillStyle = '#ffd96a';
    c.beginPath(); c.moveTo(x0 - 1, y0 - lift); c.lineTo(x0 + 5, y0 - D - 1 - lift); c.lineTo(x0 + S + 7, y0 - D - 1 - lift); c.lineTo(x0 + S + 1, y0 - lift); c.closePath(); c.fill(); outline(c, '#7a1a20', 1);
    if (lift > 0.5) { c.fillStyle = 'rgba(16,19,31,0.6)'; c.fillRect(x0, y0 - lift, S, lift); }
    // peeking eyes in the gap
    if (h > 0.2) for (let i = 0; i < 3; i++) { const a = P.t * 6 + i * 2.1; sparkle(c, Math.cos(a) * 12 + 3, y0 - D - 8 + Math.sin(a) * 3, 2.4, h, '#ffe46a'); }
    if (w > 0.3) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x0 + S / 2 - 1, y0 - lift / 2, 1.2, 0, TAU); c.arc(x0 + S / 2 + 4, y0 - lift / 2, 1.2, 0, TAU); c.fill(); }
  }
  c.restore();
  if (w > 0 && P.prog < 0.7) alertMark(c, 0, -50, w);
}

// box sizes: [boxW, boxH] covering x∈[-W/2, W/2], y∈[-(H-8), 8]
export const PAINTERS = {
  beetle: [56, 48, beetle, { drawScale: 1.45 }],
  moth: [56, 58, moth, { drawScale: 1.4 }],
  cable_spider: [64, 52, cable_spider, { drawScale: 1.3 }],
  dough_blob: [60, 60, dough_blob, { drawScale: 1.4 }],
  toaster: [52, 68, toaster],
  kettle: [130, 64, kettle, { drawScale: 1.35 }],
  flying_plate: [64, 56, flying_plate],
  chair: [96, 76, chair],
  dust_bunny: [52, 56, dust_bunny],
  roomba: [140, 96, roomba],
  card_soldier: [64, 58, card_soldier],
  pawn: [52, 60, pawn],
  jack_box: [64, 108, jack_box, { barY: -64 }],
};
