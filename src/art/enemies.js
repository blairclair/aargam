// The Sorbet Syndicate + friendly NPCs. Owned by: presentation.
import { PALETTE } from '../core/theme.js';
import { shade, rrect, shadow, facingOf, rgba, hash2, mix as shadeMix } from './util.js';
import { withFlash } from './heroes.js';

const TAU = Math.PI * 2;
const ICE = PALETTE.ice, FROST = PALETTE.frost, DEEP = PALETTE.frostDeep, INK = PALETTE.ink;
const WAFER = '#d9a35e', WAFER_D = '#a8743a';

function brows(c, lx, rx, y, w, tilt) {
  c.strokeStyle = INK; c.lineWidth = Math.max(1.2, w * 0.3); c.lineCap = 'round';
  c.beginPath(); c.moveTo(lx - w, y - tilt); c.lineTo(lx + w, y + tilt); c.stroke();
  c.beginPath(); c.moveTo(rx + w, y - tilt); c.lineTo(rx - w, y + tilt); c.stroke();
}
function eyesPair(c, x, y, sep, r, look, tilt) {
  for (const ex of [x - sep, x + sep]) {
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, y, r, r * 1.15, 0, 0, TAU); c.fill();
    c.fillStyle = INK; c.beginPath(); c.arc(ex + look * r * 0.35, y + r * 0.2, r * 0.55, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + look * r * 0.35 - r * 0.2, y - r * 0.1, r * 0.2, 0, TAU); c.fill();
  }
  brows(c, x - sep, x + sep, y - r * 1.35, r * 0.9, tilt);
}
function sparkle(c, x, y, s, a = 1) {
  c.fillStyle = `rgba(255,255,255,${a})`;
  c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.3, y); c.lineTo(x, y + s); c.lineTo(x - s * 0.3, y); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x - s, y); c.lineTo(x, y + s * 0.3); c.lineTo(x + s, y); c.lineTo(x, y - s * 0.3); c.closePath(); c.fill();
}

// ---------------- Frostling ----------------
function frostling(c, P) {
  const hopT = (P.t * 2.2 + P.seed) % 1;
  const air = P.anim === 'idle' ? Math.abs(Math.sin(P.t * 3)) * 1.5 : Math.sin(hopT * Math.PI) * 9;
  const land = P.anim === 'idle' ? 0 : Math.max(0, 1 - hopT * 6) + Math.max(0, (hopT - 0.9) * 10);
  const sq = 1 + land * 0.18, st = 1 - land * 0.16;
  shadow(c, 10 - air * 0.4, 3.5 - air * 0.12, 0.25);
  c.save();
  c.translate(0, -air);
  c.scale(sq, st);
  const r = 10;
  // body
  const g = c.createRadialGradient(-3, -r - 4, 1, 0, -r, r * 1.3);
  g.addColorStop(0, ICE); g.addColorStop(0.6, FROST); g.addColorStop(1, DEEP);
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-r, 0);
  c.bezierCurveTo(-r * 1.25, -r * 1.2, -r * 0.6, -r * 2.1, 0, -r * 2.0);
  c.bezierCurveTo(r * 0.6, -r * 2.1, r * 1.25, -r * 1.2, r, 0);
  c.quadraticCurveTo(0, r * 0.25, -r, 0);
  c.fill();
  c.strokeStyle = shade(DEEP, -0.2); c.lineWidth = 1.2; c.stroke();
  // icy spikes
  c.fillStyle = ICE;
  for (const [sx, h] of [[-4, 5], [0.5, 7], [5, 4.5]]) {
    c.beginPath(); c.moveTo(sx - 2.2, -r * 1.9 + Math.abs(sx) * 0.15); c.lineTo(sx, -r * 1.9 - h); c.lineTo(sx + 2.2, -r * 1.9 + Math.abs(sx) * 0.15); c.closePath(); c.fill();
  }
  // face
  c.save(); c.scale(P.dir, 1);
  eyesPair(c, 2, -r * 1.05, 3.6, 2.4, 0.6, -0.9);
  c.strokeStyle = INK; c.lineWidth = 1.1;
  c.beginPath(); c.arc(3, -r * 0.55, 2, 0.2, Math.PI - 0.2); c.stroke();
  c.fillStyle = 'rgba(255,120,150,0.35)'; c.beginPath(); c.arc(-3, -r * 0.65, 1.6, 0, TAU); c.arc(8, -r * 0.65, 1.6, 0, TAU); c.fill();
  c.restore();
  sparkle(c, -4.5, -r * 1.45, 1.8, 0.8);
  c.restore();
}

// ---------------- Brain Freezer ----------------
function brainfreezer(c, P) {
  const fy = -24 + Math.sin(P.t * 2.6 + P.seed * 6) * 3;
  shadow(c, 9, 3, 0.2);
  c.save();
  c.translate(0, fy);
  c.rotate(Math.sin(P.t * 1.8 + P.seed) * 0.08);
  const atk = P.anim === 'attack' ? Math.sin(P.prog * Math.PI) : 0;
  // little frost wisps trailing below
  for (let i = 0; i < 3; i++) {
    const k = ((P.t * 1.5 + i / 3) % 1);
    c.fillStyle = rgba(FROST, 0.5 * (1 - k));
    c.beginPath(); c.arc(Math.sin(i * 2 + P.t * 3) * 2, 16 + k * 10, 1.5 + k * 2, 0, TAU); c.fill();
  }
  // waffle cone (point down)
  c.fillStyle = WAFER;
  c.beginPath(); c.moveTo(-9, -2); c.lineTo(9, -2); c.lineTo(0, 18); c.closePath(); c.fill();
  c.save(); c.clip();
  c.strokeStyle = WAFER_D; c.lineWidth = 1;
  for (let i = -20; i < 20; i += 4.5) {
    c.beginPath(); c.moveTo(i, -2); c.lineTo(i + 20, 18); c.stroke();
    c.beginPath(); c.moveTo(i, -2); c.lineTo(i - 20, 18); c.stroke();
  }
  c.restore();
  // blue sorbet scoop (the brain)
  const sr = 11 * (1 + atk * 0.12);
  const g = c.createRadialGradient(-3, -9, 1, 0, -6, sr);
  g.addColorStop(0, ICE); g.addColorStop(0.55, FROST); g.addColorStop(1, DEEP);
  c.fillStyle = g;
  c.beginPath(); c.arc(0, -6, sr, Math.PI, 0);
  // drippy rim
  for (let i = 0; i <= 6; i++) { const x = sr - (i * sr * 2) / 6; c.quadraticCurveTo(x + sr / 6, -1 + (i % 2) * 3, x, -1); }
  c.closePath(); c.fill();
  // brain squiggles
  c.strokeStyle = rgba(DEEP, 0.7); c.lineWidth = 1;
  c.beginPath(); c.moveTo(-6, -12); c.quadraticCurveTo(-3, -15, 0, -12); c.quadraticCurveTo(3, -9, 6, -12); c.stroke();
  // face (on the scoop)
  c.save(); c.scale(P.dir, 1);
  eyesPair(c, 1.5, -6, 3.4, 2.2, 0.7, -1.1);
  c.fillStyle = INK;
  if (atk > 0.1) { c.beginPath(); c.ellipse(2, -1.5, 2, 1.5 + atk * 1.5, 0, 0, TAU); c.fill(); }
  else { c.lineWidth = 1; c.strokeStyle = INK; c.beginPath(); c.moveTo(-0.5, -1.8); c.lineTo(4.5, -2.3); c.stroke(); }
  c.restore();
  sparkle(c, -5, -12, 1.6, 0.9);
  c.restore();
}

// ---------------- Popsicle Knight ----------------
function popsicle_knight(c, P) {
  const walk = P.anim === 'move' || P.anim === 'walk';
  const p = P.t * 9;
  const step = walk ? Math.sin(p) : 0;
  shadow(c, 12, 4, 0.25);
  const bob = walk ? -Math.abs(Math.sin(p)) * 1.5 : Math.sin(P.t * 2.5) * 0.6;
  // facing: shield sits on the facing side; drawn in front if facing has a "down" component
  const fa = P.ang;
  const shX = Math.cos(fa) * 13, shY = Math.sin(fa) * 5;
  const shieldFront = Math.sin(fa) > -0.35;
  const drawShield = () => {
    c.save();
    c.translate(shX, -20 + bob + shY);
    const w = 10 + Math.abs(Math.sin(fa)) * 5, h = 22;
    c.fillStyle = WAFER; rrect(c, -w / 2, -h / 2, w, h, 3); c.fill();
    c.strokeStyle = WAFER_D; c.lineWidth = 1;
    c.save(); rrect(c, -w / 2, -h / 2, w, h, 3); c.clip();
    for (let gx = -w / 2 + 3; gx < w / 2; gx += 3.5) { c.beginPath(); c.moveTo(gx, -h / 2); c.lineTo(gx, h / 2); c.stroke(); }
    for (let gy = -h / 2 + 3; gy < h / 2; gy += 3.5) { c.beginPath(); c.moveTo(-w / 2, gy); c.lineTo(w / 2, gy); c.stroke(); }
    c.restore();
    c.strokeStyle = shade(WAFER_D, -0.25); c.lineWidth = 1.5; rrect(c, -w / 2, -h / 2, w, h, 3); c.stroke();
    c.fillStyle = rgba(ICE, 0.7); c.fillRect(-w / 2 + 1.5, -h / 2 + 1.5, 2, h - 3);
    c.restore();
  };
  if (!shieldFront) drawShield();
  // stick legs
  c.strokeStyle = '#d9b78a'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-3, -9 + bob); c.lineTo(-3 + step * 3, -1 - Math.max(0, step) * 2); c.stroke();
  c.beginPath(); c.moveTo(3, -9 + bob); c.lineTo(3 - step * 3, -1 - Math.max(0, -step) * 2); c.stroke();
  c.fillStyle = shade('#d9b78a', -0.3);
  c.fillRect(-5.5 + step * 3, -2 - Math.max(0, step) * 2, 5, 2); c.fillRect(0.5 - step * 3, -2 - Math.max(0, -step) * 2, 5, 2);
  // popsicle body: two-tone (blue raspberry over ice) with a bite taken out
  c.save();
  c.translate(0, bob);
  const bw = 16, bh = 30, top = -38;
  c.save();
  rrect(c, -bw / 2, top, bw, bh, 7); c.clip();
  c.fillStyle = DEEP; c.fillRect(-bw / 2, top, bw, bh);
  c.fillStyle = FROST; c.fillRect(-bw / 2, top + bh * 0.55, bw, bh);
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-bw / 2 + 2, top + 3, 3, bh - 6);
  // bite (punch out with ground-ish color is wrong; use destination-out)
  c.globalCompositeOperation = 'destination-out';
  c.beginPath(); c.arc(bw / 2 * -P.dir, top + 3, 3.4, 0, TAU); c.arc(bw / 2 * -P.dir + P.dir * 3.5, top + 0.5, 3, 0, TAU); c.fill();
  c.restore();
  c.strokeStyle = shade(DEEP, -0.3); c.lineWidth = 1.2; rrect(c, -bw / 2, top, bw, bh, 7); c.stroke();
  // helmet visor
  c.fillStyle = shade(DEEP, -0.45);
  rrect(c, -6, top + 8, 12, 6, 2); c.fill();
  c.fillStyle = PALETTE.danger;
  c.fillRect(-4 + P.dir * 1.5, top + 10, 2.5, 2); c.fillRect(1.5 + P.dir * 1.5, top + 10, 2.5, 2);
  // plume of frost
  c.fillStyle = ICE;
  c.beginPath(); c.moveTo(-2, top + 1); c.quadraticCurveTo(-P.dir * 8, top - 8, -P.dir * 10, top - 2); c.quadraticCurveTo(-P.dir * 4, top - 3, 2, top + 1); c.fill();
  // icicle sword in the off hand
  const atk = P.anim === 'attack' ? Math.sin(P.prog * Math.PI) : 0;
  c.save();
  c.translate(-Math.cos(fa) * 10, -20);
  c.rotate(-Math.PI / 2 + fa * 0 + (P.dir > 0 ? -0.5 : 0.5) + atk * 1.6 * P.dir);
  c.fillStyle = ICE; c.strokeStyle = DEEP; c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, -2); c.lineTo(16, 0); c.lineTo(0, 2); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#d9b78a'; c.fillRect(-4, -1.5, 5, 3);
  c.restore();
  c.restore();
  if (shieldFront) drawShield();
}

// ---------------- Slush Golem ----------------
function slush_golem(c, P) {
  const atk = P.anim === 'attack' ? P.prog : -1;
  const raise = atk >= 0 ? (atk < 0.6 ? atk / 0.6 : 1 - (atk - 0.6) / 0.4) : 0;
  const slam = atk >= 0.6 ? 1 - (atk - 0.6) / 0.4 : 0;
  const walk = P.anim === 'move' || P.anim === 'walk';
  const bob = walk ? -Math.abs(Math.sin(P.t * 4)) * 2.5 : Math.sin(P.t * 1.6) * 1;
  shadow(c, 26, 7, 0.3);
  c.save();
  c.translate(0, bob);
  c.scale(1 + slam * 0.08, 1 - slam * 0.08);
  // legs
  c.fillStyle = shade(FROST, -0.12);
  rrect(c, -18, -16, 13, 16, 5); c.fill(); rrect(c, 5, -16, 13, 16, 5); c.fill();
  // arms (behind body when raised)
  const armY = -36 - raise * 22;
  const drawArm = (s) => {
    c.fillStyle = shade(FROST, -0.05);
    c.beginPath(); c.ellipse(s * 26, armY, 9, 13, s * (0.3 - raise * 0.6), 0, TAU); c.fill();
    c.fillStyle = ICE; c.beginPath(); c.arc(s * 26, armY + 10 - raise * 20, 7, 0, TAU); c.fill();
  };
  if (raise > 0.3) { drawArm(-1); drawArm(1); }
  // body: lumpy slush mound
  const g = c.createLinearGradient(0, -62, 0, -10);
  g.addColorStop(0, ICE); g.addColorStop(0.5, FROST); g.addColorStop(1, DEEP);
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-24, -12);
  c.bezierCurveTo(-32, -30, -26, -52, -12, -58);
  c.bezierCurveTo(-6, -66, 8, -66, 13, -58);
  c.bezierCurveTo(28, -52, 32, -30, 24, -12);
  c.quadraticCurveTo(0, -6, -24, -12);
  c.fill();
  c.strokeStyle = shade(DEEP, -0.25); c.lineWidth = 1.5; c.stroke();
  // slush chunks + syrup streaks
  c.fillStyle = rgba(ICE, 0.8);
  for (let i = 0; i < 9; i++) {
    const a = hash2(i, 3) * TAU, d = 6 + hash2(i, 7) * 14;
    c.beginPath(); c.arc(Math.cos(a) * d, -34 + Math.sin(a) * d * 0.8, 2 + hash2(i, 9) * 2.5, 0, TAU); c.fill();
  }
  c.strokeStyle = rgba('#7a8fd8', 0.55); c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-10, -56); c.quadraticCurveTo(-14, -44, -10, -34); c.stroke();
  c.beginPath(); c.moveTo(12, -54); c.quadraticCurveTo(15, -46, 11, -40); c.stroke();
  // face
  c.save(); c.scale(P.dir, 1);
  c.fillStyle = shade(DEEP, -0.5);
  c.beginPath(); c.ellipse(-3, -42, 4, 5, 0, 0, TAU); c.ellipse(10, -42, 4, 5, 0, 0, TAU); c.fill();
  c.fillStyle = '#dff6ff';
  c.beginPath(); c.arc(-2, -43, 1.8, 0, TAU); c.arc(11, -43, 1.8, 0, TAU); c.fill();
  brows(c, -3, 10, -49, 4.5, -2);
  c.fillStyle = shade(DEEP, -0.5);
  c.beginPath(); c.ellipse(4, -30, 7, 2.5 + raise * 3, 0, 0, TAU); c.fill();
  c.restore();
  if (raise <= 0.3) { drawArm(-1); drawArm(1); }
  c.restore();
  if (slam > 0.5) {
    c.strokeStyle = rgba(ICE, slam); c.lineWidth = 3;
    c.beginPath(); c.ellipse(0, 0, 40 * (1.5 - slam), 12 * (1.5 - slam), 0, 0, TAU); c.stroke();
  }
}

// ---------------- Baron von Brrr ----------------
function baron_brrr(c, P) {
  const phase = P.phase ?? (P.hpFrac < 0.34 ? 3 : P.hpFrac < 0.67 ? 2 : 1);
  const walk = P.anim === 'move' || P.anim === 'walk';
  const bob = walk ? -Math.abs(Math.sin(P.t * 5)) * 2 : Math.sin(P.t * 1.8) * 1.2;
  const atk = P.anim === 'attack' ? Math.sin(P.prog * Math.PI) : 0;
  shadow(c, 34, 9, 0.32);
  // frost aura
  const aura = 0.18 + 0.08 * Math.sin(P.t * 3) + (phase - 1) * 0.08;
  const ag = c.createRadialGradient(0, -50, 10, 0, -50, 70);
  ag.addColorStop(0, rgba(FROST, aura)); ag.addColorStop(1, rgba(FROST, 0));
  c.fillStyle = ag; c.beginPath(); c.arc(0, -50, 70, 0, TAU); c.fill();

  c.save();
  c.translate(0, bob);
  c.scale(P.dir, 1);
  // cape
  c.fillStyle = phase === 3 ? '#3a2a6a' : '#2a3a7a';
  c.beginPath(); c.moveTo(-16, -66); c.quadraticCurveTo(-36, -30, -30 + Math.sin(P.t * 3) * 3, -4); c.lineTo(24, -4); c.quadraticCurveTo(30, -34, 16, -66); c.closePath(); c.fill();
  c.fillStyle = PALETTE.danger; c.globalAlpha *= 0.35;
  c.beginPath(); c.moveTo(-14, -64); c.quadraticCurveTo(-30, -30, -26, -6); c.lineTo(-20, -6); c.quadraticCurveTo(-24, -34, -10, -64); c.fill();
  c.globalAlpha /= 0.35;
  // boots
  c.fillStyle = INK;
  rrect(c, -13, -10, 10, 10, 3); c.fill(); rrect(c, 3, -10, 10, 10, 3); c.fill();
  // coat (aristocrat tailcoat in icy navy w/ frost trim)
  c.fillStyle = '#34488f';
  rrect(c, -17, -64, 34, 56, 12); c.fill();
  c.fillStyle = ICE;
  c.beginPath(); c.moveTo(-4, -64); c.lineTo(4, -64); c.lineTo(6, -12); c.lineTo(-6, -12); c.closePath(); c.fill(); // shirt front
  c.fillStyle = FROST; rrect(c, -17, -14, 34, 6, 3); c.fill(); // fur trim
  // gold buttons, sash, medal
  c.fillStyle = PALETTE.sun;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-8, -54 + i * 10, 1.6, 0, TAU); c.arc(8, -54 + i * 10, 1.6, 0, TAU); c.fill(); }
  c.strokeStyle = PALETTE.danger; c.lineWidth = 4;
  c.beginPath(); c.moveTo(-15, -60); c.lineTo(14, -22); c.stroke();
  c.fillStyle = PALETTE.sun; c.beginPath(); c.arc(-6, -46, 3.5, 0, TAU); c.fill();
  c.fillStyle = PALETTE.sunDeep; c.beginPath(); c.arc(-6, -46, 1.8, 0, TAU); c.fill();
  // bow tie
  c.fillStyle = PALETTE.danger;
  c.beginPath(); c.moveTo(0, -62); c.lineTo(-6, -65); c.lineTo(-6, -59); c.closePath(); c.moveTo(0, -62); c.lineTo(6, -65); c.lineTo(6, -59); c.closePath(); c.fill();
  // head: giant frosty sorbet scoop
  const hy = -80;
  const g = c.createRadialGradient(-6, hy - 6, 2, 0, hy, 20);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, ICE); g.addColorStop(1, FROST);
  c.fillStyle = g;
  c.beginPath(); c.arc(0, hy, 18, 0, TAU); c.fill();
  c.strokeStyle = DEEP; c.lineWidth = 1.5; c.stroke();
  // rim drip ring
  c.fillStyle = FROST;
  c.beginPath(); c.moveTo(-18, hy + 4);
  for (let i = 0; i <= 8; i++) { const x = -18 + i * 4.5; c.quadraticCurveTo(x - 2.25, hy + 10 + (i % 2) * 4, x, hy + 6); }
  c.lineTo(18, hy + 4); c.closePath(); c.fill();
  // eyes: one with monocle
  c.fillStyle = phase === 3 ? PALETTE.danger : INK;
  c.beginPath(); c.arc(-4, hy - 3, 2, 0, TAU); c.arc(8, hy - 3, 2.6, 0, TAU); c.fill();
  c.strokeStyle = PALETTE.sun; c.lineWidth = 1.8;
  c.beginPath(); c.arc(8, hy - 3, 5.5, 0, TAU); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(7, hy - 5, 2, 0, TAU); c.fill();
  c.strokeStyle = PALETTE.sun; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(12, hy); c.quadraticCurveTo(16, hy + 14, 10, hy + 20); c.stroke();
  // haughty brows
  brows(c, -4, 8, hy - 9, 3.5, phase === 1 ? 1.5 : -1.8);
  // magnificent curly mustache
  c.fillStyle = shade(DEEP, -0.3);
  c.beginPath();
  c.moveTo(2, hy + 4);
  c.bezierCurveTo(-4, hy + 1, -10, hy + 8, -14, hy + 2);
  c.bezierCurveTo(-12, hy + 7, -8, hy + 9, -2, hy + 7);
  c.bezierCurveTo(1, hy + 6, 3, hy + 6, 6, hy + 7);
  c.bezierCurveTo(12, hy + 9, 16, hy + 7, 18, hy + 2);
  c.bezierCurveTo(14, hy + 8, 8, hy + 1, 2, hy + 4);
  c.fill();
  if (atk > 0.2) { c.fillStyle = INK; c.beginPath(); c.ellipse(2, hy + 11, 4, 2 + atk * 2, 0, 0, TAU); c.fill(); }
  // top hat
  c.fillStyle = PALETTE.night;
  rrect(c, -16, hy - 20, 32, 4, 2); c.fill();
  rrect(c, -10, hy - 40, 20, 22, 2); c.fill();
  c.fillStyle = DEEP; c.fillRect(-10, hy - 25, 20, 4);
  sparkle(c, 6, hy - 34, 2.5, 0.7 + 0.3 * Math.sin(P.t * 5));
  // cracks by phase
  if (phase >= 2) {
    c.strokeStyle = rgba(DEEP, 0.9); c.lineWidth = 1;
    c.beginPath(); c.moveTo(-14, hy - 8); c.lineTo(-9, hy - 3); c.lineTo(-12, hy + 2); c.stroke();
  }
  if (phase >= 3) {
    c.beginPath(); c.moveTo(12, hy - 14); c.lineTo(9, hy - 9); c.lineTo(14, hy - 6); c.stroke();
    // melting drips
    c.fillStyle = FROST;
    for (let i = 0; i < 3; i++) { const k = (P.t * 0.8 + i * 0.33) % 1; c.beginPath(); c.ellipse(-10 + i * 9, hy + 12 + k * 14, 1.5, 2.5, 0, 0, TAU); c.fill(); }
  }
  // scepter: gold staff topped with an ice-cream scoop (the stolen goods!)
  const sa = -0.25 - atk * 1.4;
  c.save();
  c.translate(30, -36);
  c.rotate(sa);
  c.strokeStyle = PALETTE.sunDeep; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, 30); c.lineTo(0, -32); c.stroke();
  c.strokeStyle = PALETTE.sun; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-0.6, 28); c.lineTo(-0.6, -30); c.stroke();
  // scoop bowl
  c.fillStyle = '#c9ced8';
  c.beginPath(); c.arc(0, -36, 7, 0, Math.PI); c.closePath(); c.fill();
  c.fillStyle = phase === 3 ? PALETTE.mint : '#ffb3c8';
  c.beginPath(); c.arc(0, -37, 6.5, Math.PI, 0); c.fill();
  c.fillStyle = PALETTE.choc; c.fillRect(-3, -40, 1.5, 1.5); c.fillRect(2, -38, 1.5, 1.5);
  c.restore();
  // gloved hand
  c.fillStyle = "#ffffff"; c.beginPath(); c.arc(30, -36, 4, 0, TAU); c.fill();
  c.restore();
}

const DRAW = { frostling, brainfreezer, popsicle_knight, slush_golem, baron_brrr };
/** Enemy type ids drawEnemy actually draws (anything else falls back to the frostling). */
export const ENEMY_KINDS = Object.keys(DRAW);
const BOX = { frostling: [50, 50], brainfreezer: [50, 70], popsicle_knight: [70, 70], slush_golem: [120, 100], baron_brrr: [160, 150] };

export function drawEnemyImpl(ctx, game, type, x, y, o = {}) {
  const fn = DRAW[type] ?? frostling;
  const [bw, bh] = BOX[type] ?? BOX.frostling;
  const { ang, dir } = facingOf(o.facing);
  const t = o.t ?? game?.time ?? 0;
  const P = {
    t, ang, dir, anim: o.anim ?? 'move', hpFrac: o.hpFrac ?? 1, phase: o.phase,
    prog: Math.max(0, Math.min(1, o.progress ?? ((t * 1.5) % 1))),
    seed: o.seed ?? ((x * 0.013 + y * 0.007) % 1 + 1) % 1,
  };
  ctx.save();
  ctx.translate(x, y);
  const s = o.scale ?? 1;
  ctx.scale(s, s);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  const hurt = P.anim === 'hurt' ? 1 - P.prog : 0;
  if (hurt) ctx.translate(Math.sin(t * 60) * 1.5 * hurt, 0);
  withFlash(ctx, bw, bh, bw / 2, bh - 8, o.flash, (c) => fn(c, P));
  // tiny HP pip bar for regular enemies (boss uses the HUD boss bar)
  if (o.hpFrac != null && o.hpFrac < 1 && o.hpFrac > 0 && type !== 'baron_brrr' && o.hpBar !== false) {
    const w = Math.min(40, bw * 0.55), yy = -bh + 14;
    ctx.fillStyle = 'rgba(16,19,31,0.6)'; rrect(ctx, -w / 2 - 1, yy - 1, w + 2, 5, 2); ctx.fill();
    ctx.fillStyle = o.hpFrac > 0.35 ? PALETTE.frostDeep : PALETTE.danger;
    rrect(ctx, -w / 2, yy, w * o.hpFrac, 3, 1.5); ctx.fill();
  }
  ctx.restore();
}

// ---------------- Townsfolk NPCs ----------------
const NPC_SHIRTS = [PALETTE.sun, PALETTE.mint, PALETTE.brick, PALETTE.lake, '#e98aa8', PALETTE.sunDeep, PALETTE.pine];
const NPC_HAIR = ['#3a2a1f', '#6b4423', '#c99a5b', '#e8d29a', '#8a8f99', '#a8483a', '#1b1b22'];
const NPC_SKIN = ['#f2c7a5', '#e0ac85', '#c68a62', '#8d5b3e', '#f4d7c0'];
const NPC_HATS = { lakeside: ['bucket', 'cap', 'none', 'sunhat'], oldcity: ['tricorn', 'beret', 'none', 'cap'], summit: ['beanie', 'cap', 'none', 'bucket'] };

function hat(c, kind, color, y) {
  c.fillStyle = color;
  if (kind === 'cap') { c.beginPath(); c.arc(0, y + 1, 7, Math.PI, 0); c.fill(); c.fillRect(0, y - 0.5, 10, 2.5); }
  else if (kind === 'bucket') { c.beginPath(); c.arc(0, y + 1, 6.5, Math.PI, 0); c.fill(); c.fillRect(-9, y, 18, 2.5); }
  else if (kind === 'sunhat') { c.beginPath(); c.ellipse(0, y + 1, 12, 3, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(0, y, 6, Math.PI, 0); c.fill(); c.fillStyle = PALETTE.danger; c.fillRect(-6, y - 1.5, 12, 1.5); }
  else if (kind === 'tricorn') { c.beginPath(); c.moveTo(-11, y + 1); c.quadraticCurveTo(0, y - 12, 11, y + 1); c.quadraticCurveTo(0, y - 3, -11, y + 1); c.fill(); }
  else if (kind === 'beret') { c.beginPath(); c.ellipse(1, y - 1, 8, 4, -0.15, 0, TAU); c.fill(); }
  else if (kind === 'beanie') { c.beginPath(); c.arc(0, y + 1, 7, Math.PI, 0); c.fill(); c.fillStyle = PALETTE.paper; c.beginPath(); c.arc(0, y - 7, 2.2, 0, TAU); c.fill(); c.fillRect(-7, y, 14, 2); }
}

function townsfolk(c, P, look) {
  const freed = P.freed; // 0..1 happy anim after thaw
  const jump = freed > 0 ? Math.abs(Math.sin(freed * Math.PI * 3)) * 8 * (1 - freed * 0.3) : 0;
  const wave = freed > 0 || P.anim === 'wave' ? Math.sin(P.t * 14) * 0.5 : 0;
  const bob = P.frozenK > 0 ? 0 : Math.sin(P.t * 3 + P.seed * 6) * 0.8;
  shadow(c, 10, 3.5, 0.25);
  c.save();
  c.translate(0, -jump + bob);
  c.scale(P.dir, 1);
  // legs
  c.strokeStyle = look.pants; c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-3, -12); c.lineTo(-3, -2); c.moveTo(3, -12); c.lineTo(3, -2); c.stroke();
  c.fillStyle = INK; c.fillRect(-5.5, -2.5, 5, 2.5); c.fillRect(1.5, -2.5, 5, 2.5);
  // body
  c.fillStyle = look.shirt; rrect(c, -7, -26, 14, 16, 5); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(-7, -26, 3, 16);
  // arms
  c.strokeStyle = look.shirt; c.lineWidth = 3.6;
  c.beginPath(); c.moveTo(-6, -23); c.lineTo(-8, -14); c.stroke();
  const ra = freed > 0 || P.anim === 'wave' ? -2.4 + wave : 0.25;
  c.beginPath(); c.moveTo(6, -23); c.lineTo(6 + Math.sin(-ra) * -9, -23 + Math.cos(ra) * 9); c.stroke();
  c.fillStyle = look.skin;
  c.beginPath(); c.arc(-8, -13, 1.8, 0, TAU); c.arc(6 + Math.sin(-ra) * -10, -23 + Math.cos(ra) * 10, 1.9, 0, TAU); c.fill();
  // head
  const hy = -34;
  c.fillStyle = look.hair; c.beginPath(); c.arc(0, hy, 8.5, 0, TAU); c.fill();
  c.fillStyle = look.skin; c.beginPath(); c.arc(1, hy + 1, 7.5, 0, TAU); c.fill();
  c.fillStyle = look.hair; c.beginPath(); c.arc(0, hy - 2, 8, Math.PI * 1.05, Math.PI * 1.95); c.fill();
  // face
  c.fillStyle = INK;
  if (P.frozenK > 0.5) { c.fillRect(2, hy, 2, 1); c.fillRect(6, hy, 2, 1); c.fillRect(3, hy + 4, 4, 1); }
  else {
    c.beginPath(); c.arc(3, hy + 0.5, 1.1, 0, TAU); c.arc(7, hy + 0.5, 1.1, 0, TAU); c.fill();
    c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.arc(5, hy + 3, 2.2, 0.2, Math.PI - 0.2); c.stroke();
    c.fillStyle = 'rgba(255,120,150,0.35)'; c.beginPath(); c.arc(1, hy + 3, 1.3, 0, TAU); c.arc(9, hy + 3, 1.3, 0, TAU); c.fill();
  }
  if (look.hat !== 'none') hat(c, look.hat, look.hatColor, hy - 6);
  c.restore();
}

function iceBlock(c, k, t, seed) {
  // ice cube encasing the NPC; k = 1 fully frozen .. 0 gone (cracks + shrink while thawing)
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= Math.min(1, k * 1.4);
  const w = 30, h = 50;
  c.fillStyle = rgba(FROST, 0.55);
  rrect(c, -w / 2, -h + 2, w, h, 5); c.fill();
  c.strokeStyle = rgba(ICE, 0.95); c.lineWidth = 2; c.stroke();
  c.fillStyle = rgba(ICE, 0.65);
  c.beginPath(); c.moveTo(-w / 2 + 4, -h + 6); c.lineTo(-w / 2 + 9, -h + 6); c.lineTo(-w / 2 + 4, -h + 24); c.closePath(); c.fill();
  c.fillStyle = rgba(ICE, 0.8); c.fillRect(-w / 2, -h + 2, w, 5);
  sparkle(c, w / 2 - 5, -h + 10, 3, 0.6 + 0.4 * Math.sin(t * 4 + seed * 9));
  if (k < 1) {
    c.strokeStyle = rgba(DEEP, 0.9); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-3, -h + 2); c.lineTo(2, -h + 16); c.lineTo(-4, -h + 26); c.lineTo(3, -h + 38);
    c.moveTo(2, -h + 16); c.lineTo(10, -h + 22); c.stroke();
  }
  c.restore();
}

export function drawNPCImpl(ctx, game, kind, x, y, o = {}) {
  const t = o.t ?? game?.time ?? 0;
  const seed = o.seed ?? 1;
  const r = (k) => hash2(seed * 31 + k, seed * 7 + k * 13, 77);
  const region = o.region ?? ['lakeside', 'oldcity', 'summit'][Math.floor(r(1) * 3)];
  const hats = NPC_HATS[region] ?? NPC_HATS.lakeside;
  const look = {
    shirt: NPC_SHIRTS[Math.floor(r(2) * NPC_SHIRTS.length)],
    hair: NPC_HAIR[Math.floor(r(3) * NPC_HAIR.length)],
    skin: NPC_SKIN[Math.floor(r(4) * NPC_SKIN.length)],
    pants: ['#2b2f3a', PALETTE.denim, '#6b5a45', '#4a6b94'][Math.floor(r(5) * 4)],
    hat: hats[Math.floor(r(6) * hats.length)],
    hatColor: [PALETTE.brickDark, PALETTE.pine, PALETTE.sunDeep, PALETTE.lake, PALETTE.night][Math.floor(r(7) * 5)],
  };
  // frozen: true/1 = encased; 0..1 = thawing; false/0 = free. o.freed (0..1) drives the happy jump.
  const fz = o.frozen === true ? 1 : o.frozen === false || o.frozen == null ? 0 : Math.max(0, Math.min(1, o.frozen));
  const { dir } = facingOf(o.facing);
  const P = { t, seed, dir, frozenK: fz, freed: o.freed ?? (fz > 0 && fz < 1 ? 0 : 0), anim: o.anim ?? 'idle' };
  ctx.save();
  ctx.translate(x, y);
  const s = o.scale ?? 1; ctx.scale(s, s);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  withFlash(ctx, 60, 70, 30, 62, o.flash, (c) => {
    if (fz > 0) {
      // bluish tint on a frozen person
      townsfolk(c, P, { ...look, shirt: shadeTowardIce(look.shirt, fz), skin: shadeTowardIce(look.skin, fz * 0.6), hair: shadeTowardIce(look.hair, fz * 0.6), pants: shadeTowardIce(look.pants, fz), hatColor: shadeTowardIce(look.hatColor, fz) });
    } else townsfolk(c, P, look);
    iceBlock(c, fz, t, seed);
  });
  // tiny celebration hearts when freed
  if (P.freed > 0 && P.freed < 1) {
    ctx.fillStyle = rgba(PALETTE.danger, 1 - P.freed);
    for (let i = 0; i < 3; i++) heart(ctx, -10 + i * 10, -52 - P.freed * 20 - i * 3, 3);
  }
  ctx.restore();
}
function shadeTowardIce(c, k) { return k <= 0 ? c : (k >= 1 ? mixIce(c, 0.6) : mixIce(c, 0.6 * k)); }
function mixIce(c, k) { return shadeMix(c, FROST, k); }
function heart(c, x, y, s) {
  c.beginPath(); c.moveTo(x, y + s);
  c.bezierCurveTo(x - s * 2, y - s * 0.5, x - s, y - s * 2, x, y - s * 0.6);
  c.bezierCurveTo(x + s, y - s * 2, x + s * 2, y - s * 0.5, x, y + s);
  c.fill();
}
