// Enemy painters: primary bedroom, guest bedroom, backyard, pond minions. Owned by: art-world.
// Contract: see enemies.js. Origin = feet / ground point.
import { TAU, INK, PALETTE, shade, rgba, mix, rrect, shadow, eyes, googly, sparkle, telegraph, alertMark, clamp01, lerp, ease } from './kit.js';

// ---------------------------------------------------------------- shared bits
/** Wind-up (0..1 over prog 0..0.7) and release (0..1 over 0.7..1) for attack anims. */
function phases(P) {
  if (P.anim !== 'attack') return { wind: 0, rel: 0 };
  return { wind: clamp01(P.prog / 0.7), rel: P.prog > 0.7 ? clamp01((P.prog - 0.7) / 0.3) : 0 };
}
/** Dizzy "x" eyes for hurt. */
function dizzy(c, x, y, sep, r) {
  c.strokeStyle = INK; c.lineWidth = Math.max(1, r * 0.45); c.lineCap = 'round';
  for (const ex of [x - sep, x + sep]) {
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, y, r, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(ex - r * 0.6, y - r * 0.6); c.lineTo(ex + r * 0.6, y + r * 0.6);
    c.moveTo(ex + r * 0.6, y - r * 0.6); c.lineTo(ex - r * 0.6, y + r * 0.6); c.stroke();
  }
}
/** Little orbiting stars over a hurt enemy. */
function stars(c, x, y, rad, t) {
  for (let i = 0; i < 3; i++) {
    const a = t * 6 + (i * TAU) / 3;
    sparkle(c, x + Math.cos(a) * rad, y + Math.sin(a) * rad * 0.35, 2.2, 0.9, PALETTE.sun);
  }
}
function ripple(c, rx, ry, t, color = '#cfeaff', n = 2, speed = 0.8) {
  c.lineWidth = 1.2;
  for (let i = 0; i < n; i++) {
    const k = (t * speed + i / n) % 1;
    c.strokeStyle = rgba(color, 0.7 * (1 - k));
    c.beginPath(); c.ellipse(0, 0, rx * (0.5 + k * 0.8), ry * (0.5 + k * 0.8), 0, 0, TAU); c.stroke();
  }
}
const isHurt = (P) => P.anim === 'hurt';

// ================================================================ PRIMARY BEDROOM
// ---- Lint Sprite: fuzzy lint ball, swarm jitter ----
function lint(c, P) {
  const { wind, rel } = phases(P);
  const jx = Math.sin(P.t * 7.3 + P.seed * 20) * 2 + Math.sin(P.t * 13.1 + P.seed * 7) * 1;
  const jy = Math.cos(P.t * 6.1 + P.seed * 11) * 2;
  const fly = -15 + jy - (P.anim === 'idle' ? Math.sin(P.t * 2) * 1.5 : 0);
  shadow(c, 7, 2.5, 0.2);
  c.save();
  c.translate(jx + (rel ? P.dir * rel * 8 : 0), fly);
  if (wind) c.translate(Math.sin(P.t * 50) * wind * 1.2, 0);
  const r = 8 * (1 + wind * 0.3);
  if (rel) c.scale(1 + rel * 0.3, 1 - rel * 0.2);
  // fuzz
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + Math.sin(P.t * 3 + i) * 0.15;
    const d = r * (0.85 + ((i * 37) % 7) / 20);
    c.fillStyle = i % 3 ? '#bdb5c9' : '#d8d2e0';
    c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, 2.4, 0, TAU); c.fill();
  }
  const g = c.createRadialGradient(-2, -3, 1, 0, 0, r);
  g.addColorStop(0, '#f1edf5'); g.addColorStop(1, '#a89fb6');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  // stray threads
  c.strokeStyle = '#ff8fb1'; c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(-r, 2); c.quadraticCurveTo(-r - 4, 6 + Math.sin(P.t * 5) * 2, -r - 2, 9); c.stroke();
  c.strokeStyle = '#7fb0e0';
  c.beginPath(); c.moveTo(r - 1, -4); c.quadraticCurveTo(r + 5, -7, r + 3, -11 + Math.sin(P.t * 4) * 2); c.stroke();
  // face
  c.save(); c.scale(P.dir, 1);
  if (isHurt(P)) dizzy(c, 1.5, -1, 3, 1.8);
  else eyes(c, 1.5, -1, 3, 1.8, 0.6, wind ? -1.2 : -0.6);
  c.strokeStyle = INK; c.lineWidth = 1;
  c.beginPath();
  if (wind || rel) c.arc(2, 3.5, 1.6, 0, TAU); else { c.moveTo(0, 3.5); c.lineTo(3.5, 3); }
  c.stroke();
  c.restore();
  if (wind) alertMark(c, 0, -r - 8, wind);
  c.restore();
  if (isHurt(P)) stars(c, 0, fly - 12, 8, P.t);
}

// ---- Hanger Hawk: wire coat hanger bird ----
function hanger(c, P) {
  const { wind, rel } = phases(P);
  const swoop = P.anim === 'move' ? Math.sin(P.t * 3 + P.seed * 5) * 4 : 0;
  let alt = -30 + swoop + Math.sin(P.t * 2.5) * 1.5;
  if (wind) alt -= wind * 8;
  if (rel) alt += rel * 22;
  shadow(c, 10 - (-alt - 20) * 0.1, 3, 0.18);
  c.save();
  c.translate(rel ? P.dir * rel * 10 : 0, alt);
  if (wind) c.translate(Math.sin(P.t * 45) * wind, 0);
  c.scale(P.dir, 1);
  if (rel) c.rotate(rel * 0.6);
  else if (wind) c.rotate(-wind * 0.3);
  const flapSpd = P.anim === 'idle' ? 7 : 12;
  const flap = rel ? 4 : Math.sin(P.t * flapSpd + P.seed * 3) * 6;
  const WIRE = '#d7dce4', WIRE_D = '#7c8593';
  const neck = [2, -6], L = [-15, 3 - flap], R = [15, 3 - flap * 0.8];
  // little shirt sleeve caught on the bar (personality)
  c.fillStyle = '#ff8fb1';
  c.beginPath(); c.moveTo(-6, 4 - flap * 0.4); c.lineTo(2, 4 - flap * 0.3); c.lineTo(0, 11); c.lineTo(-7, 10); c.closePath(); c.fill();
  const wire = (w, col) => {
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(...neck); c.lineTo(...L); c.quadraticCurveTo(0, 6 - flap * 0.4, R[0], R[1]); c.lineTo(...neck); c.stroke();
    // twisted neck + hook (head)
    c.beginPath(); c.moveTo(...neck); c.lineTo(3, -11);
    c.arc(7, -13, 4, Math.PI * 0.9, Math.PI * 2.25, false);
    c.stroke();
  };
  wire(3.6, WIRE_D); wire(2, WIRE);
  // beak tip (hook end)
  c.fillStyle = PALETTE.sunDeep;
  c.beginPath(); c.moveTo(10.5, -10.5); c.lineTo(14 + (wind ? 2 : 0), -9); c.lineTo(10, -8); c.closePath(); c.fill();
  // eye on the hook
  if (isHurt(P)) dizzy(c, 7, -14, 0, 1.8);
  else {
    c.fillStyle = '#fff'; c.beginPath(); c.arc(7, -14, 2, 0, TAU); c.fill();
    c.fillStyle = INK; c.beginPath(); c.arc(7.6, -13.8, 1.2, 0, TAU); c.fill();
    c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.moveTo(4.5, -17.5 - (wind ? 0.6 : 0)); c.lineTo(9, -16); c.stroke();
  }
  // motion streaks on dive
  if (rel) {
    c.strokeStyle = rgba('#ffffff', 0.6 * (1 - rel * 0.5)); c.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-18 - i * 3, -6 + i * 5); c.lineTo(-28 - i * 3, -10 + i * 5); c.stroke(); }
  }
  c.restore();
  if (wind) alertMark(c, 0, alt - 24, wind);
  if (isHurt(P)) stars(c, 0, alt - 20, 9, P.t);
}

// ---- Sock Monster (boss) ----
const SOCKS = [
  ['#ece6da', '#d9534f', '#d9534f'], // red stripes
  ['#2f3f6e', '#f2c26b', '#f2c26b'], // navy + gold
  ['#7fd8a6', '#3fa874', '#fff6e5'], // mint
  ['#ff8fb1', '#fff6e5', '#c94f7a'], // pink
  ['#8d95a3', '#5b7fa6', '#5b7fa6'], // grey/denim
  ['#f29f2e', '#5a3a2a', '#5a3a2a'], // orange/brown
];
function sockTube(c, x0, y0, cx, cy, x1, y1, w, pal) {
  const path = () => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); };
  c.lineCap = 'round';
  path(); c.strokeStyle = shade(pal[0], -0.45); c.lineWidth = w + 2; c.stroke();
  path(); c.strokeStyle = pal[0]; c.lineWidth = w; c.stroke();
  c.setLineDash([w * 0.42, w * 0.5]); c.lineCap = 'butt';
  path(); c.strokeStyle = pal[1]; c.lineWidth = w * 0.8; c.stroke();
  c.setLineDash([]);
  // toe cap
  c.fillStyle = pal[2]; c.strokeStyle = shade(pal[2], -0.45); c.lineWidth = 1;
  c.beginPath(); c.arc(x1, y1, w * 0.62, 0, TAU); c.fill(); c.stroke();
}
function sockLoop(c, x, y, rx, ry, rot, w, pal) {
  const path = () => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); };
  path(); c.strokeStyle = shade(pal[0], -0.45); c.lineWidth = w + 2; c.stroke();
  path(); c.strokeStyle = pal[0]; c.lineWidth = w; c.stroke();
  c.setLineDash([w * 0.4, w * 0.55]);
  path(); c.strokeStyle = pal[1]; c.lineWidth = w * 0.8; c.stroke();
  c.setLineDash([]);
}
function sock_monster(c, P) {
  const { wind, rel } = phases(P);
  const ph = P.phase, angry = ph >= 2, rage = ph >= 3;
  const walk = P.anim === 'move';
  const bob = walk ? Math.abs(Math.sin(P.t * 5)) * -4 : Math.sin(P.t * 2) * 1.5;
  const cy = -50 + bob;
  const shake = wind ? Math.sin(P.t * 40) * 2.2 * wind : rage ? Math.sin(P.t * 30) * 0.8 : 0;
  shadow(c, 58, 14, 0.28);
  if (wind) telegraph(c, 85, 26, wind);
  // lost sock on the floor when badly hurt
  if (P.hpFrac < 0.5) {
    c.save(); c.translate(-62, 4); c.rotate(-0.3);
    sockTube(c, -10, 0, 0, -6, 10, 0, 7, SOCKS[5]);
    c.restore();
  }
  c.save();
  c.translate(shake, 0);
  // ---- leg tentacles (on the floor) ----
  const nLegs = P.hpFrac < 0.5 ? 4 : 6;
  const legAngles = [0.15, 0.55, 1.0, 2.1, 2.6, 3.0].slice(0, nLegs);
  legAngles.forEach((a0, i) => {
    const a = a0 + Math.sin(P.t * (walk ? 6 : 2.5) + i * 1.7) * 0.18;
    const front = Math.cos(a) * P.dir > 0.2;
    let L = 62 + (i % 2) * 8;
    if (wind && front) L *= 1 - wind * 0.35;
    if (rel && front) L *= 1 + rel * 0.5;
    const bx = Math.cos(a) * 26, by = cy + 18;
    const tx = Math.cos(a) * L, ty = Math.sin(a) * 6 - 2 + Math.sin(P.t * 5 + i) * 2;
    sockTube(c, bx, by, (bx + tx) * 0.6, by + 10 - Math.abs(Math.sin(P.t * 4 + i)) * 6, tx, ty, 9, SOCKS[i % SOCKS.length]);
  });
  // ---- body knot ----
  const g = c.createRadialGradient(-8, cy - 10, 4, 0, cy, 42);
  g.addColorStop(0, rage ? '#7a3550' : '#6b5a7a'); g.addColorStop(1, rage ? '#3a1530' : '#3a2f4a');
  c.fillStyle = g; c.beginPath(); c.ellipse(0, cy, 40, 34, 0, 0, TAU); c.fill();
  const loops = [
    [-14, cy - 12, 20, 14, 0.4, 0], [14, cy - 8, 22, 13, -0.5, 1], [0, cy + 12, 28, 12, 0.1, 2],
    [-20, cy + 6, 14, 18, 1.2, 3], [20, cy + 10, 15, 16, -1.1, 4], [2, cy - 22, 18, 9, 0.05, 5],
  ];
  loops.forEach(([x, y, rx, ry, r, k], i) => {
    const wob = Math.sin(P.t * 3 + i) * (angry ? 2 : 1);
    sockLoop(c, x, y + wob, rx, ry, r + Math.sin(P.t * 1.5 + i) * 0.05, 9, SOCKS[k]);
  });
  // toes poking out of the knot
  for (const [x, y, k] of [[-34, cy - 14, 1], [34, cy - 20, 3], [-6, cy - 34, 2]]) {
    c.fillStyle = SOCKS[k][2]; c.beginPath(); c.arc(x, y + Math.sin(P.t * 4 + x) * 1.5, 5.5, 0, TAU); c.fill();
    c.strokeStyle = shade(SOCKS[k][2], -0.45); c.lineWidth = 1; c.stroke();
  }
  // ---- arm tentacles (raised, they grab) ----
  for (const side of [-1, 1]) {
    const towards = side === P.dir;
    let tx = side * 62, ty = cy - 30 + Math.sin(P.t * 3 + side) * 6;
    if (wind && towards) { tx = side * (44 - wind * 8); ty = cy - 46 - wind * 10; }
    if (rel && towards) { tx = side * (60 + rel * 30); ty = cy + rel * 10; }
    sockTube(c, side * 30, cy - 6, side * 50, cy - 50, tx, ty, 10, SOCKS[side > 0 ? 0 : 2]);
    if (rel && towards) { // grabbing toe-claw sparkle
      sparkle(c, tx + side * 6, ty - 4, 4 * rel, 0.9, PALETTE.sun);
    }
  }
  // ---- loose yarn threads in later phases ----
  if (angry) {
    c.strokeStyle = rage ? '#ff5d8a' : '#ff8fb1'; c.lineWidth = 1.2;
    for (let i = 0; i < (rage ? 6 : 3); i++) {
      const x = -30 + i * 12;
      c.beginPath(); c.moveTo(x, cy + 24);
      c.bezierCurveTo(x + 6, cy + 34, x - 6, cy + 40 + Math.sin(P.t * 4 + i) * 3, x + 3 + Math.sin(P.t * 3 + i) * 4, cy + 46); c.stroke();
    }
  }
  // ---- face ----
  const ex = P.dir * 4;
  if (isHurt(P)) dizzy(c, ex, cy - 12, 13, 8);
  else {
    googly(c, ex - 13, cy - 12, 11, P.t, 0.2);
    googly(c, ex + 13, cy - 9, 8, P.t * 1.3, 0.7);
    if (rage) { // bloodshot rim
      c.strokeStyle = rgba(PALETTE.danger, 0.8); c.lineWidth = 1.5;
      c.beginPath(); c.arc(ex - 13, cy - 12, 11, 0, TAU); c.stroke();
      c.beginPath(); c.arc(ex + 13, cy - 9, 8, 0, TAU); c.stroke();
    }
    if (angry || wind) {
      c.strokeStyle = INK; c.lineWidth = 3.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(ex - 24, cy - 27); c.lineTo(ex - 6, cy - 21); c.stroke();
      c.beginPath(); c.moveTo(ex + 22, cy - 22); c.lineTo(ex + 7, cy - 18); c.stroke();
    }
  }
  // mouth
  const open = 4 + (wind ? wind * 6 : 0) + (rel ? 8 : 0) + (rage ? 3 : 0);
  c.fillStyle = '#2a0f1f'; c.beginPath(); c.ellipse(ex, cy + 8, 11, open, 0, 0, TAU); c.fill();
  c.fillStyle = '#fff6e5';
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(ex + i * 4 - 1.8, cy + 8 - open + 0.5); c.lineTo(ex + i * 4, cy + 8 - open + 4); c.lineTo(ex + i * 4 + 1.8, cy + 8 - open + 0.5); c.fill(); }
  c.restore();
  if (rage) { // steam puffs of fury
    for (let i = 0; i < 2; i++) {
      const k = (P.t * 0.9 + i * 0.5) % 1;
      c.fillStyle = rgba('#ffffff', 0.5 * (1 - k));
      c.beginPath(); c.arc((i ? 26 : -30) + Math.sin(k * 6) * 3, cy - 36 - k * 26, 5 + k * 6, 0, TAU); c.fill();
    }
  }
  if (wind) alertMark(c, 0, cy - 52, wind);
  if (isHurt(P)) stars(c, 0, cy - 46, 22, P.t);
}

// ================================================================ GUEST BEDROOM
// ---- Rubber Duck ----
function rubber_duck(c, P) {
  const { wind, rel } = phases(P);
  const walk = P.anim === 'move';
  const bob = Math.sin(P.t * (walk ? 10 : 3) + P.seed * 6) * (walk ? 1.6 : 1);
  const tilt = walk ? Math.sin(P.t * 10 + P.seed * 6) * 0.12 : 0;
  ripple(c, 14, 4.5, P.t + P.seed, '#cfeaff', 2, walk ? 1.4 : 0.7);
  shadow(c, 11, 3.5, 0.18);
  c.save();
  c.translate(rel ? P.dir * rel * 6 : 0, bob - 1);
  if (wind) { c.translate(Math.sin(P.t * 45) * wind, 0); c.scale(1 + wind * 0.08, 1 - wind * 0.1); }
  c.rotate(tilt);
  c.scale(P.dir, 1);
  const Y = '#ffd23f', YD = '#e0a91a', OR = '#ff8a2a';
  // body
  c.fillStyle = YD; c.beginPath(); c.ellipse(0, -7, 13, 8, 0, 0, TAU); c.fill();
  c.fillStyle = Y; c.beginPath(); c.ellipse(-0.5, -8, 12, 7, 0, 0, TAU); c.fill();
  // tail flick
  c.fillStyle = Y; c.beginPath(); c.moveTo(-10, -10); c.lineTo(-16, -15); c.lineTo(-11, -6); c.closePath(); c.fill();
  // wing
  c.fillStyle = YD; c.beginPath(); c.ellipse(-2, -8, 6, 3.5, 0.2 + (walk ? Math.sin(P.t * 12) * 0.2 : 0), 0, TAU); c.fill();
  // head
  c.fillStyle = YD; c.beginPath(); c.arc(6, -18, 7.5, 0, TAU); c.fill();
  c.fillStyle = Y; c.beginPath(); c.arc(5.5, -18.5, 7, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(3, -22, 2.5, 1.5, -0.5, 0, TAU); c.fill();
  // beak (opens on squeak)
  const open = rel ? 3.5 * (1 - rel * 0.5) : wind ? wind * 1.5 : 0;
  c.fillStyle = OR;
  c.beginPath(); c.moveTo(11, -18 - open * 0.3); c.quadraticCurveTo(17, -18.5 - open, 17, -17 - open); c.lineTo(11, -16.5); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(11, -16); c.quadraticCurveTo(17, -15.5 + open, 16, -14.5 + open); c.lineTo(11, -15); c.closePath(); c.fill();
  // eye
  if (isHurt(P)) dizzy(c, 7, -20, 0, 2);
  else {
    c.fillStyle = INK; c.beginPath(); c.arc(7.5, -20, 1.7, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(7, -20.6, 0.6, 0, TAU); c.fill();
    c.strokeStyle = INK; c.lineWidth = 1.3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(5, -23.5); c.lineTo(10, -22); c.stroke();
  }
  // squeak lines
  if (rel) {
    c.strokeStyle = rgba('#ffffff', 1 - rel * 0.6); c.lineWidth = 1.4;
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(19, -17 + i * 4); c.lineTo(24 + rel * 3, -17 + i * 6); c.stroke(); }
  }
  c.restore();
  if (wind) alertMark(c, 0, -34, wind);
  if (isHurt(P)) stars(c, 2, -30, 8, P.t);
}

// ---- Pipe Snake ----
function pipe_snake(c, P) {
  const { wind, rel } = phases(P);
  const walk = P.anim === 'move';
  const sp = walk ? 7 : 2;
  shadow(c, 22, 4.5, 0.22);
  c.save();
  if (wind) c.translate(Math.sin(P.t * 45) * wind * 1.2, 0);
  c.scale(P.dir, 1);
  const CU = '#c8763e', CU_D = '#7e4320', CU_L = '#f0b07a', CHR = '#d9dee6';
  // body segments trail behind (negative x), drawn tail-first
  const rear = rel ? 0 : wind * 4;
  const N = 5;
  for (let i = N - 1; i >= 0; i--) {
    const x = -i * 5.6 - 1 + rear;
    const y = -5 + Math.sin(P.t * sp - i * 0.9) * 2.5;
    const r = 5.2 - i * 0.35;
    c.fillStyle = CU_D; rrect(c, x - r, y - r - 1, r * 2 + 1, r * 2 + 1, r * 0.6); c.fill();
    c.fillStyle = CU; rrect(c, x - r, y - r - 1.5, r * 2, r * 2, r * 0.6); c.fill();
    c.fillStyle = CU_L; c.fillRect(x - r + 1.5, y - r - 0.5, r * 2 - 3, 1.4);
    // chrome flange ring
    c.fillStyle = CHR; c.fillRect(x + r - 1.5, y - r - 1.5, 1.8, r * 2);
  }
  // tail: open drip end
  c.fillStyle = '#4f8fb3'; c.beginPath(); c.arc(-N * 5.6 + 2, -4 + Math.sin(P.t * sp - N) * 2.5, 1.6, 0, TAU); c.fill();
  // neck rises into an elbow head
  const lift = (wind ? 6 * wind : 0) + (rel ? 6 - rel * 4 : 0) + (P.anim === 'idle' ? Math.sin(P.t * 2) : 0);
  const hx = 8 + (rel ? rel * 5 : 0), hy = -14 - lift;
  c.strokeStyle = CU_D; c.lineWidth = 10; c.lineCap = 'round';
  c.beginPath(); c.moveTo(1, -6); c.quadraticCurveTo(5, -8, hx - 2, hy + 2); c.stroke();
  c.strokeStyle = CU; c.lineWidth = 8;
  c.beginPath(); c.moveTo(1, -6.5); c.quadraticCurveTo(5, -8.5, hx - 2, hy + 1.5); c.stroke();
  // head block (elbow joint)
  c.fillStyle = CU_D; rrect(c, hx - 7, hy - 7, 15, 13, 4); c.fill();
  c.fillStyle = CU; rrect(c, hx - 7, hy - 8, 14, 12, 4); c.fill();
  c.fillStyle = CU_L; c.fillRect(hx - 5, hy - 7, 10, 1.6);
  // mouth / pipe opening
  const open = rel ? 3.5 : wind ? wind * 1.5 : 1;
  c.fillStyle = CHR; rrect(c, hx + 5, hy - 5 - open * 0.3, 4, 8 + open * 0.6, 1.5); c.fill();
  c.fillStyle = '#1a2a3a'; c.beginPath(); c.ellipse(hx + 8.5, hy - 1, 1.5, 2 + open * 0.5, 0, 0, TAU); c.fill();
  // valve-wheel eyes (red wheels with spokes)
  const eye = (x, y, r) => {
    if (isHurt(P)) { dizzy(c, x, y, 0, r * 0.8); return; }
    c.strokeStyle = '#c0392b'; c.lineWidth = 1.6;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    const spin = P.t * (wind ? 12 : 2);
    c.lineWidth = 1;
    for (let k = 0; k < 3; k++) { const a = spin + (k * TAU) / 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke(); }
    c.fillStyle = INK; c.beginPath(); c.arc(x, y, 1, 0, TAU); c.fill();
  };
  eye(hx - 2, hy - 9, 3);
  eye(hx + 4, hy - 9.5, 2.6);
  // drips while winding up
  if (wind) {
    c.fillStyle = rgba('#7fc4ff', 0.9);
    const k = (P.t * 3) % 1;
    c.beginPath(); c.arc(hx + 9, hy + 3 + k * 10, 1.4, 0, TAU); c.fill();
  }
  // water spray
  if (rel) {
    for (let i = 0; i < 9; i++) {
      const a = -0.5 + (i / 8) * 0.9;
      const d = 6 + rel * 22 + (i % 3) * 3;
      c.fillStyle = rgba(i % 2 ? '#bfe9ff' : '#6fb7e8', 0.95 - rel * 0.4);
      c.beginPath(); c.arc(hx + 10 + Math.cos(a) * d, hy - 1 + Math.sin(a) * d * 0.8, 1.6 + (i % 3) * 0.6, 0, TAU); c.fill();
    }
  }
  c.restore();
  if (wind) alertMark(c, 0, hy - 18, wind);
  if (isHurt(P)) stars(c, 0, -30, 9, P.t);
}

// ---- Leak (hazard): ceiling drip + puddle ----
function drip(c, P) {
  const atk = P.anim === 'attack';
  const { wind, rel } = phases(P);
  const grow = atk ? 1 + wind * 0.25 + rel * 0.15 : 1;
  // puddle
  c.save(); c.scale(grow, grow);
  c.fillStyle = 'rgba(16,40,70,0.25)'; c.beginPath(); c.ellipse(0, 1, 17, 6.5, 0, 0, TAU); c.fill();
  const g = c.createLinearGradient(0, -6, 0, 6);
  g.addColorStop(0, '#9fd6ff'); g.addColorStop(1, '#4f8fb3');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-15, 0);
  c.bezierCurveTo(-15, -6, -5, -7, 2, -5.5); c.bezierCurveTo(10, -7, 16, -4, 15, 0);
  c.bezierCurveTo(16, 5, 6, 6, 0, 5); c.bezierCurveTo(-8, 6.5, -16, 4, -15, 0);
  c.fill();
  c.strokeStyle = 'rgba(30,70,110,0.6)'; c.lineWidth = 1; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.65)'; c.beginPath(); c.ellipse(-6, -2.5, 4, 1.2, -0.1, 0, TAU); c.fill();
  // subtle face
  if (isHurt(P)) dizzy(c, 1, -0.5, 3.5, 1.3);
  else {
    c.fillStyle = 'rgba(16,30,60,0.75)';
    c.beginPath(); c.arc(-2.5, -0.5, 1, 0, TAU); c.arc(4, -0.5, 1, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(16,30,60,0.7)'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(-1, 2.2); c.quadraticCurveTo(0, 1.4, 1, 2.2); c.quadraticCurveTo(2, 3, 3, 2.2); c.stroke();
  }
  c.restore();
  // expanding rings (always; faster + red-tinged warning when a drop is about to land)
  ripple(c, 16 * grow, 5.5 * grow, P.t + P.seed, wind > 0.5 ? '#ffb0b0' : '#dff3ff', 2, 0.9);
  if (atk && wind) telegraph(c, 18, 7, wind, PALETTE.lake);
  // the falling droplet
  let dy, sz;
  if (atk) { dy = lerp(-54, -2, ease(P.prog)); sz = 3.2 + P.prog; }
  else { const k = (P.t * 0.5 + P.seed) % 1; dy = -54 + (k > 0.8 ? (k - 0.8) * 5 * 52 : 0); sz = 1.5 + Math.min(k, 0.8) * 2.5; }
  if (!(atk && rel > 0.6)) {
    c.fillStyle = 'rgba(16,40,70,0.25)'; c.beginPath(); c.ellipse(0, 0, sz * 0.8, sz * 0.3, 0, 0, TAU); c.fill();
    c.fillStyle = '#7fc4ff';
    c.beginPath(); c.moveTo(0, dy - sz * 2.2); c.quadraticCurveTo(sz * 1.2, dy - sz * 0.2, 0, dy + sz * 0.8);
    c.quadraticCurveTo(-sz * 1.2, dy - sz * 0.2, 0, dy - sz * 2.2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(-sz * 0.3, dy - sz * 0.3, sz * 0.3, 0, TAU); c.fill();
  }
  // ceiling stain the drop hangs from
  c.fillStyle = 'rgba(90,70,40,0.35)'; c.beginPath(); c.ellipse(0, -56, 7, 2.2, 0, 0, TAU); c.fill();
  // splash on landing
  if (atk && rel > 0.4) {
    const k = (rel - 0.4) / 0.6;
    c.fillStyle = rgba('#bfe9ff', 1 - k);
    for (let i = 0; i < 6; i++) { const a = Math.PI + (i / 5) * Math.PI; c.beginPath(); c.arc(Math.cos(a) * (4 + k * 14), -2 + Math.sin(a) * (3 + k * 10), 1.5, 0, TAU); c.fill(); }
  }
}

// ================================================================ BACKYARD
// ---- Garden Gnome ----
function gnome(c, P) {
  const { wind, rel } = phases(P);
  const walk = P.anim === 'move';
  const ph = P.t * 9 + P.seed * 6;
  const step = walk ? Math.sin(ph) : 0;
  const bob = walk ? -Math.abs(Math.sin(ph)) * 1.6 : Math.sin(P.t * 2.5) * 0.4;
  shadow(c, 10, 3.5, 0.25);
  c.save();
  if (wind) c.translate(Math.sin(P.t * 40) * wind * 0.8, 0);
  c.scale(P.dir, 1);
  // boots
  c.fillStyle = '#5a3a2a';
  rrect(c, -6 + step * 2.5, -4, 6, 4, 1.8); c.fill();
  rrect(c, 1 - step * 2.5, -4, 6, 4, 1.8); c.fill();
  c.save(); c.translate(0, bob);
  // tunic
  c.fillStyle = '#3f6ea8'; rrect(c, -7, -16, 14, 13, 4); c.fill();
  c.fillStyle = '#2e5486'; c.fillRect(-7, -6, 14, 2); // belt
  c.fillStyle = PALETTE.sun; c.fillRect(-1.5, -6.3, 3, 2.6);
  // shovel arm (raised on wind-up, chop on release)
  const armA = rel ? lerp(-2.2, 0.6, rel) : wind ? lerp(0.3, -2.2, ease(wind)) : 0.3 + step * 0.3;
  c.save(); c.translate(5, -13); c.rotate(armA);
  c.strokeStyle = '#8a5a3a'; c.lineWidth = 1.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 11); c.stroke();
  c.fillStyle = '#aab4bf'; c.beginPath(); c.moveTo(-2.5, 10); c.lineTo(2.5, 10); c.lineTo(1.5, 15); c.lineTo(-1.5, 15); c.closePath(); c.fill();
  c.fillStyle = '#f2c7a5'; c.beginPath(); c.arc(0, 1.5, 2, 0, TAU); c.fill();
  c.restore();
  // face
  c.fillStyle = '#f2c7a5'; c.beginPath(); c.arc(1, -20, 5.5, 0, TAU); c.fill();
  // beard
  c.fillStyle = '#f4f1ea';
  c.beginPath(); c.moveTo(-5, -20); c.quadraticCurveTo(-5, -8, 1, -7); c.quadraticCurveTo(7, -8, 7, -20); c.quadraticCurveTo(1, -16, -5, -20); c.fill();
  c.strokeStyle = 'rgba(160,150,140,0.6)'; c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(-1, -15); c.lineTo(-1, -9); c.moveTo(3, -15); c.lineTo(3, -9); c.stroke();
  // nose
  c.fillStyle = '#ff9a8a'; c.beginPath(); c.arc(3, -19, 2, 0, TAU); c.fill();
  // eyes + angry brows
  if (isHurt(P)) dizzy(c, 1.5, -22, 2.4, 1.4);
  else {
    c.fillStyle = INK; c.beginPath(); c.arc(-0.5, -22, 1, 0, TAU); c.arc(4, -22, 1, 0, TAU); c.fill();
    c.strokeStyle = INK; c.lineWidth = 1.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-2.5, -25); c.lineTo(1, -23.4); c.moveTo(6, -25); c.lineTo(2.8, -23.4); c.stroke();
  }
  // pointy red hat (flops with step)
  c.fillStyle = '#b8322a';
  c.beginPath(); c.moveTo(-6.5, -23); c.quadraticCurveTo(-2, -38, -6 + step * 1.5 - (wind ? 2 : 0), -42); c.quadraticCurveTo(4, -34, 8, -23); c.closePath(); c.fill();
  c.fillStyle = '#d9473c'; c.beginPath(); c.moveTo(-3, -24); c.quadraticCurveTo(-1, -34, -5 + step * 1.5, -40); c.quadraticCurveTo(0, -32, 2, -24); c.fill();
  c.fillStyle = '#8f2620'; rrect(c, -7, -25, 15, 3, 1.5); c.fill();
  c.restore();
  c.restore();
  if (wind) alertMark(c, 0, -50, wind);
  if (isHurt(P)) stars(c, 0, -44, 9, P.t);
}

// ---- Jungle Vine: rooted tangle with a flytrap head ----
function vine(c, P) {
  const { wind, rel } = phases(P);
  const sway = Math.sin(P.t * 2 + P.seed * 5) * 3;
  // dirt mound
  c.fillStyle = 'rgba(16,19,31,0.25)'; c.beginPath(); c.ellipse(0, 0, 17, 5.5, 0, 0, TAU); c.fill();
  c.fillStyle = '#6e4a2c'; c.beginPath(); c.ellipse(0, -1, 14, 5, 0, 0, TAU); c.fill();
  c.fillStyle = '#8a5f3a'; c.beginPath(); c.ellipse(-2, -2, 9, 2.6, 0, 0, TAU); c.fill();
  if (wind) telegraph(c, 26, 9, wind);
  c.save(); c.scale(P.dir, 1);
  const G = '#3f8a3e', GD = '#285c2a', GL = '#7cc26a';
  // side tendrils
  for (const [bx, a, len] of [[-8, -2.4, 14], [9, -0.6, 12], [-3, -3.0, 10]]) {
    const w = Math.sin(P.t * 3 + bx) * 0.3;
    c.strokeStyle = GD; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx, -2);
    c.quadraticCurveTo(bx + Math.cos(a + w) * len * 0.6, -6 + Math.sin(a + w) * len * 0.6, bx + Math.cos(a + w) * len, -3 + Math.sin(a + w) * len * 0.5);
    c.stroke();
  }
  // main stalk: pulled back on wind-up, lashing forward on release
  const lean = rel ? lerp(-0.6, 0.9, ease(rel)) : wind ? -0.6 * ease(wind) : 0.05 * Math.sin(P.t * 2);
  const H = 30 + (wind ? wind * 4 : 0);
  const hx = Math.sin(lean) * H + sway * 0.4, hy = -Math.cos(lean) * H - 2;
  const mx = sway - Math.sin(lean) * 6, my = -H * 0.5;
  c.strokeStyle = GD; c.lineWidth = 5.5;
  c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(mx, my, hx, hy); c.stroke();
  c.strokeStyle = G; c.lineWidth = 3.5;
  c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(mx, my, hx, hy); c.stroke();
  // spiral wrap
  c.strokeStyle = GL; c.lineWidth = 1;
  c.beginPath(); c.moveTo(-1, -6); c.quadraticCurveTo(mx + 3, my, hx - 2, hy + 6); c.stroke();
  // leaves
  const leaf = (x, y, a, s) => {
    c.save(); c.translate(x, y); c.rotate(a + Math.sin(P.t * 3 + x) * 0.15);
    c.fillStyle = G; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 0.6, -s * 0.5, s, 0); c.quadraticCurveTo(s * 0.6, s * 0.5, 0, 0); c.fill();
    c.strokeStyle = GD; c.lineWidth = 0.7; c.beginPath(); c.moveTo(0, 0); c.lineTo(s * 0.9, 0); c.stroke();
    c.restore();
  };
  leaf(mx * 0.5, my * 0.6, -2.6, 9); leaf(mx * 0.7 + 1, my * 1.1, -0.4, 8); leaf(mx * 0.3, my * 0.3, 0.3, 7);
  // flytrap head
  c.save(); c.translate(hx, hy); c.rotate(lean * 0.8);
  const jaw = rel ? (rel < 0.5 ? 0.9 : lerp(0.9, 0.05, (rel - 0.5) * 2)) : wind ? 0.3 + wind * 0.6 : 0.35 + Math.sin(P.t * 3) * 0.1;
  const half = (sgn) => {
    c.save(); c.rotate(-sgn * jaw * 0.8);
    c.fillStyle = sgn > 0 ? '#c94f4f' : '#a83c3c';
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(6, -sgn * 8, 13, -sgn * 1.5); c.quadraticCurveTo(7, sgn * 0.5, 0, 0); c.fill();
    c.fillStyle = G;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(6, -sgn * 9, 13.5, -sgn * 2); c.quadraticCurveTo(7, -sgn * 6, 0, -sgn * 1); c.fill();
    c.fillStyle = '#fff6e5';
    for (let i = 0; i < 4; i++) { const x = 4 + i * 2.6; c.beginPath(); c.moveTo(x, -sgn * 1); c.lineTo(x + 0.8, sgn * 1.8); c.lineTo(x + 1.6, -sgn * 1); c.fill(); }
    c.restore();
  };
  half(1); half(-1);
  // eye bumps on top jaw
  c.save(); c.rotate(-jaw * 0.8);
  if (isHurt(P)) dizzy(c, 6, -7, 2.4, 1.5);
  else eyes(c, 6, -7, 2.4, 1.5, 0.6, -0.8);
  c.restore();
  c.restore();
  c.restore();
  if (wind) alertMark(c, 0, -46, wind);
  if (isHurt(P)) stars(c, 0, -44, 9, P.t);
}

// ---- Grill Dragon (boss): kettle grill with wings ----
function grill_dragon(c, P) {
  const { wind, rel } = phases(P);
  const ph = P.phase, heat = ph >= 3 ? 1 : ph >= 2 ? 0.6 : 0.3;
  const walk = P.anim === 'move';
  const bob = walk ? -Math.abs(Math.sin(P.t * 6)) * 3 : Math.sin(P.t * 2) * 1;
  const cy = -58 + bob;
  const R = 32;
  const shake = wind ? Math.sin(P.t * 45) * 2 * wind : 0;
  // ground glow + shadow
  shadow(c, 46, 12, 0.3);
  const gg = c.createRadialGradient(0, 0, 2, 0, 0, 44);
  gg.addColorStop(0, rgba('#ff8a2a', 0.35 + heat * 0.3)); gg.addColorStop(1, rgba('#ff8a2a', 0));
  c.fillStyle = gg; c.beginPath(); c.ellipse(0, 0, 44, 13, 0, 0, TAU); c.fill();
  if (wind) telegraph(c, 70, 22, wind);
  c.save();
  c.translate(shake, 0);
  // falling ash under the grate
  for (let i = 0; i < 3; i++) {
    const k = (P.t * 1.3 + i / 3) % 1;
    c.fillStyle = rgba('#ffb35c', 0.8 * (1 - k));
    c.beginPath(); c.arc(-8 + i * 8, cy + R * 0.9 + k * (-cy - R * 0.9), 1.4, 0, TAU); c.fill();
  }
  c.scale(P.dir, 1);
  // ---- tail (behind) ----
  c.strokeStyle = '#2b2d33'; c.lineWidth = 6; c.lineCap = 'round';
  const tw = Math.sin(P.t * 3) * 6;
  c.beginPath(); c.moveTo(-R * 0.7, cy + 10); c.quadraticCurveTo(-R - 18, cy + 18 + tw, -R - 30, cy + 2 - tw); c.stroke();
  c.fillStyle = '#8a2f2f'; c.beginPath(); c.moveTo(-R - 30, cy - 6 - tw); c.lineTo(-R - 38, cy + 2 - tw); c.lineTo(-R - 30, cy + 10 - tw); c.lineTo(-R - 26, cy + 2 - tw); c.closePath(); c.fill();
  // ---- wings (behind body) ----
  const flapK = walk ? 9 : wind ? 14 : 4;
  const flap = Math.sin(P.t * flapK + P.seed * 3);
  for (const side of [-1, 1]) {
    c.save(); c.translate(side * 14, cy - 14); c.scale(side, 1);
    c.rotate(-0.3 - flap * 0.35 - (wind ? 0.3 : 0));
    const span = 50;
    c.fillStyle = side > 0 ? '#9a3434' : '#7a2a2a';
    c.beginPath(); c.moveTo(0, 0);
    c.lineTo(span * 0.55, -span * 0.55); c.lineTo(span, -span * 0.35);
    c.quadraticCurveTo(span * 0.85, -span * 0.12, span * 0.92, span * 0.05);
    c.quadraticCurveTo(span * 0.65, -span * 0.02, span * 0.62, span * 0.18);
    c.quadraticCurveTo(span * 0.4, span * 0.08, span * 0.3, span * 0.3);
    c.quadraticCurveTo(span * 0.18, span * 0.1, 0, span * 0.12);
    c.closePath(); c.fill();
    c.strokeStyle = '#3a1818'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(span * 0.55, -span * 0.55); c.lineTo(span, -span * 0.35);
    c.moveTo(span * 0.55, -span * 0.55); c.lineTo(span * 0.92, span * 0.05);
    c.moveTo(span * 0.55, -span * 0.55); c.lineTo(span * 0.62, span * 0.18);
    c.moveTo(span * 0.55, -span * 0.55); c.lineTo(span * 0.3, span * 0.3); c.stroke();
    c.restore();
  }
  // ---- legs + wheels ----
  const step = walk ? Math.sin(P.t * 6) * 3 : 0;
  c.strokeStyle = '#3a3d45'; c.lineWidth = 3.5;
  for (const [lx, fx, s] of [[-18, -26, 1], [18, 26, -1], [2, 4, 0]]) {
    c.beginPath(); c.moveTo(lx * 0.8, cy + R * 0.7); c.lineTo(fx + step * s, -4); c.stroke();
    c.fillStyle = '#1b1d22'; c.beginPath(); c.arc(fx + step * s, -3, 3.5, 0, TAU); c.fill();
    c.fillStyle = '#8a8f99'; c.beginPath(); c.arc(fx + step * s, -3, 1.3, 0, TAU); c.fill();
  }
  // ash catcher tray between legs
  c.strokeStyle = '#5a5e68'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, cy + R + 10, 18, 4, 0, 0, TAU); c.stroke();
  // ---- bowl (lower half sphere) ----
  const bowl = c.createRadialGradient(-10, cy + 4, 4, 0, cy, R + 4);
  bowl.addColorStop(0, ph >= 3 ? '#6a2a24' : '#4a4e58'); bowl.addColorStop(1, ph >= 3 ? '#2a1010' : '#17191e');
  c.fillStyle = bowl; c.beginPath(); c.arc(0, cy, R, 0, Math.PI); c.closePath(); c.fill();
  // vents glowing
  for (const vx of [-14, 0, 14]) {
    c.fillStyle = rgba('#ff8a2a', 0.5 + heat * 0.5 * (0.7 + 0.3 * Math.sin(P.t * 8 + vx)));
    rrect(c, vx - 3, cy + R * 0.55, 6, 3, 1.5); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.15)'; c.beginPath(); c.ellipse(-14, cy + 10, 6, 3, -0.4, 0, TAU); c.fill();
  // rim + grate with coals (visible as lid opens)
  const lidOpen = rel ? 0.95 : wind ? 0.15 + 0.7 * ease(wind) : 0.12 + (ph >= 2 ? 0.08 : 0) + Math.sin(P.t * 2) * 0.03;
  c.fillStyle = '#26282f'; c.beginPath(); c.ellipse(0, cy, R, 9, 0, 0, TAU); c.fill();
  const coal = c.createRadialGradient(0, cy, 2, 0, cy, R - 2);
  coal.addColorStop(0, ph >= 3 ? '#fff4c2' : '#ffd36b'); coal.addColorStop(0.5, '#ff7a1a'); coal.addColorStop(1, '#8a1f0a');
  c.fillStyle = coal; c.beginPath(); c.ellipse(0, cy, R - 4, 6.5, 0, 0, TAU); c.fill();
  c.strokeStyle = '#3a3d45'; c.lineWidth = 1;
  for (let gx = -R + 8; gx < R - 6; gx += 6) { c.beginPath(); c.moveTo(gx, cy - 5); c.lineTo(gx, cy + 5); c.stroke(); }
  // lower teeth on the bowl rim (front)
  c.fillStyle = '#efe6d2';
  for (let i = 0; i < 4; i++) { const tx = R * 0.25 + i * 5; c.beginPath(); c.moveTo(tx, cy + 4); c.lineTo(tx + 2, cy - 2); c.lineTo(tx + 4, cy + 4); c.fill(); }
  // ---- lid (dome) hinged at the back ----
  c.save();
  c.translate(-R, cy);
  c.rotate(-lidOpen * 0.9);
  c.translate(R, 0);
  const lid = c.createRadialGradient(-10, -18, 3, 0, -6, R + 6);
  lid.addColorStop(0, ph >= 3 ? '#7a3a30' : '#555a66'); lid.addColorStop(1, ph >= 3 ? '#2a1010' : '#18191f');
  c.fillStyle = lid; c.beginPath(); c.arc(0, 0, R, Math.PI, 0); c.ellipse(0, 0, R, 8, 0, 0, Math.PI, false); c.fill();
  c.strokeStyle = '#0d0e12'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, R, Math.PI, 0); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(-12, -20, 8, 4, -0.5, 0, TAU); c.fill();
  // upper teeth
  c.fillStyle = '#efe6d2';
  for (let i = 0; i < 4; i++) { const tx = R * 0.25 + i * 5; c.beginPath(); c.moveTo(tx, 1); c.lineTo(tx + 2, 7); c.lineTo(tx + 4, 1); c.fill(); }
  // horns
  c.fillStyle = '#efe6d2';
  for (const hx of [-10, 6]) { c.beginPath(); c.moveTo(hx - 4, -R + 6); c.quadraticCurveTo(hx - 6, -R - 10, hx - 10, -R - 14); c.quadraticCurveTo(hx + 1, -R - 6, hx + 4, -R + 5); c.closePath(); c.fill(); }
  // vent knob
  c.fillStyle = '#8a8f99'; rrect(c, -3, -R - 4, 6, 5, 2); c.fill();
  // eyes: glowing slits
  if (isHurt(P)) {
    c.strokeStyle = '#ffd36b'; c.lineWidth = 2;
    for (const ex of [10, 22]) { c.beginPath(); c.moveTo(ex - 3, -14); c.lineTo(ex + 3, -8); c.moveTo(ex + 3, -14); c.lineTo(ex - 3, -8); c.stroke(); }
  } else {
    for (const ex of [10, 22]) {
      c.fillStyle = rgba('#ff8a2a', 0.35); c.beginPath(); c.arc(ex, -11, 6, 0, TAU); c.fill();
      c.fillStyle = ph >= 3 ? '#fff4c2' : '#ffd36b'; c.beginPath(); c.ellipse(ex, -11, 3.6, 2.4, 0, 0, TAU); c.fill();
      c.fillStyle = INK; c.fillRect(ex - 0.7, -13.2, 1.4, 4.4);
    }
    c.strokeStyle = INK; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(5, -18); c.lineTo(14, -15); c.moveTo(27, -18); c.lineTo(19, -15); c.stroke();
  }
  c.restore();
  // flames licking from the seam in higher phases
  if (ph >= 2 && !rel) {
    for (let i = 0; i < (ph >= 3 ? 5 : 3); i++) {
      const fx = -R * 0.6 + i * (R * 1.2 / 4), k = (P.t * 2.2 + i * 0.37) % 1;
      flame(c, fx, cy - 2 - lidOpen * 6, 4 + (1 - k) * 4, 7 + (1 - k) * 8, ph >= 3, 1 - k * 0.6);
    }
  }
  // smoke from vent
  for (let i = 0; i < 3; i++) {
    const k = (P.t * 0.7 + i / 3 + P.seed) % 1;
    c.fillStyle = rgba(ph >= 3 ? '#4a4a4a' : '#bfbfbf', 0.45 * (1 - k));
    c.beginPath(); c.arc(-6 + Math.sin(k * 5 + i) * 5 - k * 10, cy - R - 8 - k * 30, 4 + k * 7, 0, TAU); c.fill();
  }
  // ---- breath ----
  if (wind) {
    const glow = c.createRadialGradient(R + 6, cy - 6, 1, R + 6, cy - 6, 10 + wind * 14);
    glow.addColorStop(0, rgba('#fff4c2', 0.9 * wind)); glow.addColorStop(1, rgba('#ff7a1a', 0));
    c.fillStyle = glow; c.beginPath(); c.arc(R + 6, cy - 6, 10 + wind * 14, 0, TAU); c.fill();
  }
  if (rel) {
    const len = 40 + rel * 50 + heat * 20;
    const fg = c.createLinearGradient(R, 0, R + len, 0);
    fg.addColorStop(0, '#fff4c2'); fg.addColorStop(0.35, '#ffb02e'); fg.addColorStop(0.75, '#ff5a1a'); fg.addColorStop(1, 'rgba(160,30,10,0)');
    c.fillStyle = fg;
    c.beginPath(); c.moveTo(R - 2, cy - 8);
    c.quadraticCurveTo(R + len * 0.5, cy - 8 - len * 0.35 - Math.sin(P.t * 30) * 3, R + len, cy - 14);
    c.quadraticCurveTo(R + len * 0.9, cy + 6, R + len, cy + 20);
    c.quadraticCurveTo(R + len * 0.5, cy + 6 + len * 0.3, R - 2, cy + 2);
    c.closePath(); c.fill();
    // charcoal chunks
    for (let i = 0; i < 6; i++) {
      const d = R + ((P.t * 120 + i * 17) % len), yy = cy - 4 + Math.sin(i * 2.3 + P.t * 9) * len * 0.15;
      c.fillStyle = '#1b1b1f'; c.beginPath(); c.arc(d, yy, 2.6, 0, TAU); c.fill();
      c.fillStyle = '#ff7a1a'; c.beginPath(); c.arc(d + 0.6, yy - 0.6, 1.1, 0, TAU); c.fill();
    }
  }
  c.restore();
  // phase 3 embers swirling around
  if (ph >= 3) {
    for (let i = 0; i < 6; i++) {
      const a = P.t * 1.6 + i * 1.05, k = (P.t * 0.8 + i / 6) % 1;
      c.fillStyle = rgba('#ffb35c', 1 - k);
      c.beginPath(); c.arc(Math.cos(a) * 52, cy - 10 + Math.sin(a) * 18 - k * 30, 1.6, 0, TAU); c.fill();
    }
  }
  if (wind) alertMark(c, 0, cy - R - 26, wind);
  if (isHurt(P)) stars(c, 0, cy - R - 16, 22, P.t);
}
function flame(c, x, y, w, h, white, a = 1) {
  c.save(); c.globalAlpha *= a;
  c.fillStyle = white ? '#fff4c2' : '#ffb02e';
  c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w * 0.6, y - h * 0.6, x, y - h); c.quadraticCurveTo(x + w * 0.6, y - h * 0.6, x + w, y); c.closePath(); c.fill();
  c.fillStyle = white ? '#ffffff' : '#ff6a1a';
  c.beginPath(); c.moveTo(x - w * 0.45, y); c.quadraticCurveTo(x, y - h * 0.7, x + w * 0.45, y); c.closePath(); c.fill();
  c.restore();
}

// ================================================================ POND minion
// ---- Code Fish: a little fish made of glowing glyphs, leaps from the water ----
const FISH_GLYPHS = ['{', '}', '0', '1', ';', '<', '>', '='];
function code_fish(c, P) {
  const { wind, rel } = phases(P);
  let k, air;
  if (P.anim === 'attack') { k = rel; air = rel ? Math.sin(rel * Math.PI) * 30 : 0; }
  else if (P.anim === 'move') { k = (P.t * 1.3 + P.seed) % 1; air = Math.sin(k * Math.PI) * 20; }
  else { k = 0; air = 0; }
  const submerged = air < 2;
  // water: ripple ring + dark body under the surface
  ripple(c, 13, 4.5, P.t + P.seed, '#bfe9ff', 2, 0.9);
  if (wind) {
    telegraph(c, 16, 6, wind, '#7fd8a6');
    c.fillStyle = rgba('#0c2a1e', 0.5); c.beginPath(); c.ellipse(Math.sin(P.t * 9) * wind * 2, 0, 9, 3.5, 0, 0, TAU); c.fill();
  }
  // splash at take-off / landing
  if (P.anim !== 'idle' && (k < 0.15 || k > 0.85) && air > 0.1) {
    const s = k < 0.5 ? k / 0.15 : (1 - k) / 0.15;
    c.fillStyle = rgba('#dff3ff', 0.9 * (1 - s * 0.5));
    for (let i = 0; i < 5; i++) { const a = Math.PI + (i / 4) * Math.PI; c.beginPath(); c.arc(Math.cos(a) * (6 + (1 - s) * 6), Math.sin(a) * (3 + (1 - s) * 6), 1.4, 0, TAU); c.fill(); }
  }
  if (submerged && P.anim !== 'idle' && !wind) return;
  c.save();
  c.translate(0, -air - (P.anim === 'idle' ? 3 + Math.sin(P.t * 3) : 4));
  c.scale(P.dir, 1);
  if (air > 0.5) c.rotate((k - 0.5) * 1.6);
  if (P.anim === 'idle' || wind) { // swimming at the surface: clip to above-water half
    c.beginPath(); c.rect(-20, -20, 40, 22); c.clip();
  }
  // body
  c.fillStyle = 'rgba(12,42,30,0.75)';
  c.beginPath(); c.ellipse(0, 0, 10, 5.5, 0, 0, TAU); c.fill();
  const flick = Math.sin(P.t * 14) * 2;
  c.beginPath(); c.moveTo(-8, 0); c.lineTo(-15, -5 + flick); c.lineTo(-13, 0); c.lineTo(-15, 5 + flick); c.closePath(); c.fill();
  c.strokeStyle = '#7fd8a6'; c.lineWidth = 1.2;
  c.beginPath(); c.ellipse(0, 0, 10, 5.5, 0, 0, TAU); c.stroke();
  c.beginPath(); c.moveTo(-8, 0); c.lineTo(-15, -5 + flick); c.lineTo(-13, 0); c.lineTo(-15, 5 + flick); c.closePath(); c.stroke();
  // glyph scales
  c.font = 'bold 5px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let i = 0; i < 6; i++) {
    const gx = -6 + (i % 3) * 4.5, gy = i < 3 ? -1.8 : 1.8;
    c.fillStyle = (Math.floor(P.t * 6 + i) % 4 === 0) ? '#e8fff2' : '#7fd8a6';
    c.fillText(FISH_GLYPHS[(i + Math.floor(P.t * 3 + P.seed * 10)) % FISH_GLYPHS.length], gx, gy);
  }
  // dorsal fin
  c.fillStyle = '#3fa874'; c.beginPath(); c.moveTo(-3, -5); c.lineTo(2, -9); c.lineTo(4, -5); c.closePath(); c.fill();
  // eye
  if (isHurt(P)) dizzy(c, 6, -1, 0, 1.6);
  else {
    c.fillStyle = '#e8fff2'; c.beginPath(); c.arc(6, -1, 1.8, 0, TAU); c.fill();
    c.fillStyle = INK; c.fillRect(6, -2.2, 1, 2.4);
    c.strokeStyle = INK; c.lineWidth = 0.9; c.beginPath(); c.moveTo(4, -3.8); c.lineTo(8, -2.8); c.stroke();
  }
  c.restore();
  if (wind) alertMark(c, 0, -18, wind);
  if (isHurt(P)) stars(c, 0, -20, 8, P.t);
}

export const PAINTERS = {
  lint: [40, 48, lint],
  hanger: [56, 66, hanger],
  sock_monster: [200, 150, sock_monster],
  rubber_duck: [52, 48, rubber_duck],
  pipe_snake: [72, 56, pipe_snake],
  drip: [44, 74, drip],
  gnome: [40, 60, gnome],
  vine: [64, 64, vine],
  grill_dragon: [210, 170, grill_dragon],
  code_fish: [48, 66, code_fish],
};
