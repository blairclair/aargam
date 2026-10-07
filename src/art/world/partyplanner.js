// PartyPlanner.exe — final boss: a giant koi made of glowing code. Owned by: art-world.
// Contract: see enemies.js. Origin = the water point under the koi (wake/ripples are drawn there);
// the body floats above it in a 3/4-flattened frame and heads toward P.ang.
// Phases: 1 clean green code · 2 glitch (RGB split, error glyphs, cracked window) · 3 corrupted
// blue-screen/magenta, fragmenting segments, ERROR/FATAL, lightning.
import { TAU, INK, PALETTE, rgba, clamp01, lerp, ease, alertMark } from './kit.js';

const CY = -70;        // body centre height above the water point
const SQ = 0.74;       // 3/4 flattening of the top-down koi
const LEN = 130;       // half length (nose at +LEN, tail root at -LEN)
const N = 28;          // spine samples
const GLYPHS = '{}();=>01[]<>/*+-&|$#_:.%';
const ERR_GLYPHS = '!x#?';
const LOGS = ['> init() ... ok', '> make_snacks() ... ok', '> set_table() ... ok', '> clean_up() ... ok',
  '> fold_laundry() ... ok', '> fix_everything() ... ??', '> decorate() ... ok', '> main() ... RUNNING'];
const LOGS3 = ['SEGFAULT 0x00C0FFEE', 'core dumped', 'party.exe not responding', 'stack overflow'];

const GREEN = '#7fd8a6', GLOW = '#3dff9a', MINT_W = '#e8fff2', AMBER = '#ffb35c';
const MAG = '#ff3d7f', CYAN = '#4ff3ff', BSOD = '#0a2a9e';

function width(s) { // plump koi profile: narrow peduncle, wide shoulders, round head
  if (s <= 0.6) return 7 + 39 * ease(s / 0.6);
  if (s <= 0.86) return 46 - 6 * ((s - 0.6) / 0.26);
  const k = (s - 0.86) / 0.14;
  return 40 * Math.sqrt(Math.max(0, 1 - k * k));
}
/** cheap deterministic hash 0..1 */
function h1(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function partyplanner(c, P) {
  const ph = P.phase;
  const g2 = ph >= 2, g3 = ph >= 3;
  const atk = P.anim === 'attack';
  const wind = atk ? clamp01(P.prog / 0.7) : 0;
  const rel = atk && P.prog > 0.7 ? clamp01((P.prog - 0.7) / 0.3) : 0;
  const hurt = P.anim === 'hurt';
  const spd = (P.anim === 'move' ? 4.2 : 2.2) * (g2 ? 1.6 : 1) * (g3 ? 1.25 : 1);
  const amp = (P.anim === 'move' ? 16 : 10) * (wind ? 1 - wind * 0.6 : 1);
  const t = P.t;
  const ca = Math.cos(P.ang), sa = Math.sin(P.ang);
  const M = (x, y) => [x * ca - y * sa, CY + (x * sa + y * ca) * SQ];
  const glitchTick = Math.floor(t * 12);

  // ---- spine + outline (koi frame: heading +x) ----
  const sp = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const x = lerp(-LEN, LEN, s) - (wind ? wind * 10 : 0) + (rel ? rel * 14 : 0);
    const y = Math.sin(s * 4.2 - t * spd) * amp * Math.pow(1 - s, 1.5);
    sp.push([x, y, s]);
  }
  const L = [], R = [], NRM = [];
  for (let i = 0; i <= N; i++) {
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(N, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    const w = width(sp[i][2]) * (g3 ? 1 + 0.06 * Math.sin(t * 9 + i) : 1);
    NRM.push([nx, ny, w]);
    L.push([sp[i][0] + nx * w, sp[i][1] + ny * w]);
    R.push([sp[i][0] - nx * w, sp[i][1] - ny * w]);
  }
  const at = (s, v) => { // point on body at spine param s, lateral -1..1
    const f = s * N, i = Math.min(N - 1, Math.floor(f)), k = f - i;
    const x = lerp(sp[i][0], sp[i + 1][0], k), y = lerp(sp[i][1], sp[i + 1][1], k);
    const n = NRM[i];
    return [x + n[0] * n[2] * v, y + n[1] * n[2] * v];
  };

  // ---- water: shadow + wake + ripples at the origin ----
  c.fillStyle = 'rgba(6,30,40,0.22)';
  c.beginPath(); c.ellipse(0, 0, 120, 30, 0, 0, TAU); c.fill();
  c.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const k = (t * (P.anim === 'move' ? 0.9 : 0.5) + i / 3) % 1;
    c.strokeStyle = rgba(g3 ? '#ff9ad0' : '#cff7ff', 0.55 * (1 - k));
    c.beginPath(); c.ellipse(0, 0, 70 + k * 90, 18 + k * 24, 0, 0, TAU); c.stroke();
  }
  // glowing code reflection
  c.fillStyle = rgba(g3 ? MAG : GLOW, 0.07 + (wind ? wind * 0.15 : 0));
  c.beginPath(); c.ellipse(0, 0, 90, 20, 0, 0, TAU); c.fill();

  // ---- attack telegraph (along heading, drawn under the body) ----
  if (wind > 0) {
    const [nx0, ny0] = M(LEN + 6, 0), [nx1, ny1] = M(LEN + 380, 0);
    c.save();
    c.strokeStyle = rgba(g3 ? MAG : PALETTE.danger, 0.3 + 0.6 * wind);
    c.lineWidth = 2 + wind * 10; c.setLineDash([10, 8]); c.lineDashOffset = -t * 60;
    c.beginPath(); c.moveTo(nx0, ny0); c.lineTo(nx1, ny1); c.stroke();
    c.setLineDash([]);
    c.restore();
  }

  c.save();
  c.translate(0, CY); c.scale(1, SQ); c.rotate(P.ang);

  // ---- tail fin ----
  const tb = sp[0], tsway = Math.sin(t * spd * 1.1) * 0.5;
  for (const side of [-1, 1]) {
    const a = Math.PI + side * (0.62 + 0.12 * Math.sin(t * spd + side)) + tsway * 0.5;
    const tip = [tb[0] + Math.cos(a) * 78, tb[1] + Math.sin(a) * 78];
    const mid = [tb[0] + Math.cos(Math.PI + tsway * 0.4) * 34, tb[1] + Math.sin(Math.PI + tsway * 0.4) * 34];
    c.fillStyle = g3 ? rgba(BSOD, 0.6) : 'rgba(10,46,32,0.55)';
    c.beginPath(); c.moveTo(tb[0], tb[1]);
    c.quadraticCurveTo(tb[0] + Math.cos(a + side * 0.25) * 52, tb[1] + Math.sin(a + side * 0.25) * 52, tip[0], tip[1]);
    c.quadraticCurveTo((tip[0] + mid[0]) / 2 - 6, (tip[1] + mid[1]) / 2, mid[0], mid[1]);
    c.closePath(); c.fill();
    c.strokeStyle = g3 ? MAG : GREEN; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = rgba(g3 ? '#ffffff' : GREEN, 0.45); c.lineWidth = 1;
    for (let k = 1; k < 5; k++) {
      const q = k / 5, ex = lerp(mid[0], tip[0], q), ey = lerp(mid[1], tip[1], q);
      c.beginPath(); c.moveTo(tb[0], tb[1]); c.lineTo(ex, ey); c.stroke();
    }
  }
  // ---- fins (pectoral big, pelvic small) ----
  const fin = (s, size, phase) => {
    for (const side of [-1, 1]) {
      const [bx, by] = at(s, side * 0.9);
      const n = NRM[Math.round(s * N)];
      const out = Math.atan2(n[1] * side, n[0] * side);
      const flap = Math.sin(t * spd * 1.3 + phase + (side > 0 ? 0 : 1.2)) * 0.35;
      const a0 = out - side * 0.9 + flap * side;
      c.fillStyle = g3 ? rgba(BSOD, 0.55) : 'rgba(10,46,32,0.5)';
      c.beginPath(); c.moveTo(bx, by);
      c.arc(bx, by, size, Math.min(a0, a0 + side * 1.1), Math.max(a0, a0 + side * 1.1));
      c.closePath(); c.fill();
      c.strokeStyle = g3 ? MAG : GREEN; c.lineWidth = 1.4; c.stroke();
      c.strokeStyle = rgba(GREEN, 0.4); c.lineWidth = 1;
      for (let k = 1; k < 4; k++) { const aa = a0 + side * 1.1 * (k / 4); c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(aa) * size, by + Math.sin(aa) * size); c.stroke(); }
    }
  };
  fin(0.4, 22, 1.5);
  fin(0.72, 40, 0);

  // ---- body ----
  const outline = () => {
    c.beginPath(); c.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i <= N; i++) c.lineTo(L[i][0], L[i][1]);
    for (let i = N; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
    c.closePath();
  };
  if (g2) { // RGB-split ghosts
    const jx = (h1(glitchTick) - 0.5) * 6, jy = (h1(glitchTick + 9) - 0.5) * 4;
    c.lineWidth = 2.5;
    c.save(); c.translate(4 + jx, -2 + jy); outline(); c.strokeStyle = rgba('#ff3030', 0.6); c.stroke(); c.restore();
    c.save(); c.translate(-4 - jx, 2 - jy); outline(); c.strokeStyle = rgba(CYAN, 0.6); c.stroke(); c.restore();
  }
  if (!g3) {
    const bg = c.createLinearGradient(-LEN, 0, LEN, 0);
    bg.addColorStop(0, 'rgba(6,26,18,0.85)'); bg.addColorStop(0.7, 'rgba(10,46,32,0.92)'); bg.addColorStop(1, 'rgba(14,60,40,0.95)');
    c.fillStyle = bg; outline(); c.fill();
    c.save(); c.shadowColor = GLOW; c.shadowBlur = 14;
    c.strokeStyle = GREEN; c.lineWidth = 2.4; outline(); c.stroke();
    c.restore();
  } else {
    // fragmented slices drifting apart
    for (let i = 0; i < N; i++) {
      const drift = 2 + 5 * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7));
      const n = NRM[i], ox = n[0] * Math.sin(i * 2.1 + t * 2) * drift + (i % 2 ? 1.5 : -1.5), oy = n[1] * Math.sin(i * 2.1 + t * 2) * drift;
      c.save(); c.translate(ox, oy);
      c.beginPath(); c.moveTo(L[i][0], L[i][1]); c.lineTo(L[i + 1][0], L[i + 1][1]); c.lineTo(R[i + 1][0], R[i + 1][1]); c.lineTo(R[i][0], R[i][1]); c.closePath();
      c.fillStyle = i % 3 === 0 ? '#0d35c4' : BSOD; c.fill();
      c.strokeStyle = MAG; c.lineWidth = 1.3; c.stroke();
      c.restore();
    }
  }
  // dorsal ridge (dashed code line)
  c.strokeStyle = rgba(g3 ? '#ffffff' : MINT_W, 0.7); c.lineWidth = 1.6;
  c.setLineDash([5, 4]); c.lineDashOffset = t * 30;
  c.beginPath();
  for (let i = Math.round(N * 0.18); i <= Math.round(N * 0.82); i++) { const p = sp[i]; if (i === Math.round(N * 0.18)) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); }
  c.stroke(); c.setLineDash([]);

  // mouth
  const nose = sp[N];
  const open = rel ? 9 : wind ? 2 + wind * 7 : 1.5;
  c.fillStyle = g3 ? '#200010' : '#02100a';
  c.beginPath(); c.ellipse(nose[0] - 3, nose[1], 4 + open * 0.4, open, 0, 0, TAU); c.fill();
  c.strokeStyle = g3 ? MAG : GREEN; c.lineWidth = 1.2; c.stroke();
  // charging orb
  if (wind > 0 && !rel) {
    const r = 6 + wind * 16, ox = nose[0] + 10 + r * 0.6;
    const og = c.createRadialGradient(ox, nose[1], 1, ox, nose[1], r * 1.6);
    og.addColorStop(0, '#ffffff'); og.addColorStop(0.35, g3 ? MAG : GLOW); og.addColorStop(1, rgba(g3 ? MAG : GLOW, 0));
    c.fillStyle = og; c.beginPath(); c.arc(ox, nose[1], r * 1.6, 0, TAU); c.fill();
    c.strokeStyle = rgba('#ffffff', 0.8); c.lineWidth = 1;
    for (let k = 0; k < 6; k++) { // particles sucked in
      const a = k * 1.05 + t * 5, d = r * 2.4 * (1 - ((t * 2 + k / 6) % 1));
      c.beginPath(); c.arc(ox + Math.cos(a) * d, nose[1] + Math.sin(a) * d, 1.2, 0, TAU); c.stroke();
    }
  }
  // release: code beam
  if (rel) {
    const len = 360 * Math.min(1, rel * 2.5), wdt = 14 * (1 - rel * 0.5) + 4;
    const bg = c.createLinearGradient(nose[0], 0, nose[0] + len, 0);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.2, g3 ? MAG : GLOW); bg.addColorStop(1, rgba(g3 ? MAG : GLOW, 0.1));
    c.fillStyle = rgba(g3 ? MAG : GLOW, 0.3); c.fillRect(nose[0], nose[1] - wdt * 1.8, len, wdt * 3.6);
    c.fillStyle = bg; c.fillRect(nose[0], nose[1] - wdt / 2, len, wdt);
  }
  c.restore(); // end koi frame

  // ---- screen-aligned text layers (glyph scales, eyes, logs) ----
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = 'bold 11px "Courier New", monospace';
  let gi = 0;
  for (let s = 0.07; s < 0.9; s += 0.042) {
    const w = width(s), rows = Math.max(1, Math.round((w * 2) / 11));
    for (let r = 0; r < rows; r++) {
      const v = rows === 1 ? 0 : -0.78 + (1.56 * r) / (rows - 1);
      const [kx, ky] = at(s, v);
      const [x, y] = M(kx, ky);
      gi++;
      const stream = Math.floor(t * 5 - s * 20 + r * 3); // characters flow from head to tail
      let ch = GLYPHS[(((stream + gi * 7) % GLYPHS.length) + GLYPHS.length) % GLYPHS.length];
      let col;
      const patch = Math.sin(s * 13 + v * 4.5 + 1.3) > 0.55; // koi patches
      if (g3) {
        col = h1(gi + glitchTick) > 0.8 ? '#ffffff' : h1(gi * 3) > 0.5 ? MAG : '#ff5d5d';
        if (h1(gi + glitchTick * 0.5) > 0.85) ch = ERR_GLYPHS[gi % ERR_GLYPHS.length];
      } else {
        col = patch ? (h1(gi) > 0.35 ? AMBER : '#ffd98a') : (h1(gi + Math.floor(t * 3)) > 0.88 ? MINT_W : GREEN);
        if (g2 && h1(gi + glitchTick) > 0.86) { ch = ERR_GLYPHS[gi % ERR_GLYPHS.length]; col = '#ff4a4a'; }
      }
      c.fillStyle = col;
      c.fillText(ch, x + (g2 && h1(gi + glitchTick * 2) > 0.93 ? 4 : 0), y);
    }
  }
  // whiskers / barbels trailing log lines
  const logs = g3 ? LOGS3 : LOGS;
  const li = Math.floor(t * 0.6);
  c.font = 'bold 8px "Courier New", monospace';
  for (const side of [-1, 1]) {
    const line = logs[(li + (side > 0 ? 0 : 3)) % logs.length];
    c.strokeStyle = rgba(g3 ? MAG : GREEN, 0.55); c.lineWidth = 1.4; c.beginPath();
    for (let k = 0; k <= 10; k++) {
      const q = k / 10, sway = Math.sin(t * 2.4 - q * 4 + side) * 10 * q;
      const [x, y] = M(LEN - 4 - q * 40 + (rel ? rel * 14 : 0), side * (14 + q * 18) + sway * 0.3);
      if (k) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.stroke();
    for (let k = 0; k < line.length; k++) {
      const q = k / line.length;
      const sway = Math.sin(t * 2.4 - q * 4 + side) * 10 * q;
      const kx = LEN + 2 - q * 118, ky = side * (30 + q * 46) + sway;
      const [x, y] = M(kx + (rel ? rel * 14 : 0), ky);
      c.fillStyle = rgba(g3 ? '#ffc2e0' : MINT_W, 1 - q * 0.55);
      c.fillText(line[k], x, y);
    }
  }
  // eyes: dark lens with a blinking cursor pupil
  for (const side of [-1, 1]) {
    const [kx, ky] = at(0.87, side * 0.55);
    const [x, y] = M(kx, ky);
    const r = 10;
    c.fillStyle = g3 ? '#1a0010' : '#02140c';
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.strokeStyle = g3 ? MAG : GREEN; c.lineWidth = 2; c.stroke();
    if (hurt) {
      c.font = 'bold 12px "Courier New", monospace'; c.fillStyle = g3 ? MAG : GREEN; c.fillText('X', x, y + 0.5);
    } else {
      const on = Math.floor(t * 2.5) % 2 === 0 || wind > 0;
      c.fillStyle = wind > 0 || g3 ? '#ff4a6a' : MINT_W;
      if (on) c.fillRect(x - 1.8 + Math.cos(P.ang) * 2, y - 5, 3.6, 9);
      else c.fillRect(x - 3 + Math.cos(P.ang) * 2, y + 3, 6, 1.8);
    }
  }
  // angry brows over the eyes (screen aligned, above the head)
  {
    const [hx, hy] = M(at(0.87, 0)[0], at(0.87, 0)[1]);
    const [lx, ly] = M(...at(0.87, -0.55)), [rx, ry] = M(...at(0.87, 0.55));
    c.strokeStyle = g3 ? MAG : GREEN; c.lineWidth = 2.6; c.lineCap = 'round';
    const tilt = 3 + (wind ? 2 : 0) + (g2 ? 1.5 : 0);
    for (const [ex, ey] of [[lx, ly], [rx, ry]]) {
      const towardCentre = Math.sign(hx - ex) || 1;
      c.beginPath(); c.moveTo(ex - towardCentre * 8, ey - 13 - tilt); c.lineTo(ex + towardCentre * 6, ey - 12 + tilt * 0.4); c.stroke();
    }
    // ---- phase 2+: cracked app window around the head ----
    if (g2) {
      const ww = 150, wh = 86, wx = hx - ww / 2 + (h1(glitchTick) - 0.5) * 3, wy = hy - wh / 2 - 6;
      c.strokeStyle = rgba(g3 ? MAG : '#cfd8e0', 0.85); c.lineWidth = 1.5;
      c.strokeRect(wx, wy, ww, wh);
      c.fillStyle = rgba(g3 ? '#5a0a30' : '#2a3a48', 0.85); c.fillRect(wx, wy - 12, ww, 12);
      c.font = 'bold 7px "Courier New", monospace'; c.textAlign = 'left';
      c.fillStyle = '#fff6e5'; c.fillText(g3 ? 'PartyPlanner.exe - FATAL' : 'PartyPlanner.exe (Not Responding)', wx + 3, wy - 6);
      c.fillStyle = PALETTE.danger; c.fillRect(wx + ww - 11, wy - 11, 10, 10);
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('x', wx + ww - 6, wy - 6);
      // cracks
      c.strokeStyle = rgba('#ffffff', 0.75); c.lineWidth = 1;
      c.beginPath();
      c.moveTo(wx + ww, wy + 10); c.lineTo(wx + ww - 14, wy + 18); c.lineTo(wx + ww - 10, wy + 30); c.lineTo(wx + ww - 24, wy + 40);
      c.moveTo(wx + ww - 14, wy + 18); c.lineTo(wx + ww - 28, wy + 14);
      c.moveTo(wx, wy + wh - 8); c.lineTo(wx + 12, wy + wh - 18); c.lineTo(wx + 22, wy + wh - 14);
      c.stroke();
    }
    if (g3) { // sad blue-screen face + floating ERROR / FATAL
      c.font = 'bold 16px "Courier New", monospace'; c.textAlign = 'center';
      c.fillStyle = '#ffffff'; c.fillText(':(', hx, hy - 58);
      const words = ['ERROR', 'FATAL', 'ERROR', '0xDEAD'];
      c.font = 'bold 11px "Courier New", monospace';
      words.forEach((wd, i) => {
        const a = t * 0.7 + i * (TAU / words.length);
        const flick = h1(i + glitchTick) > 0.2;
        if (!flick) return;
        c.fillStyle = i % 2 ? MAG : '#ff5d5d';
        c.fillText(wd, Math.cos(a) * 150, CY + Math.sin(a) * 70);
      });
    }
  }
  // ---- phase 3: lightning arcs ----
  if (g3) {
    const seed = Math.floor(t * 10);
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (let b = 0; b < 3; b++) {
      if (h1(seed * 3 + b) < 0.35) continue;
      const s0 = 0.15 + h1(seed + b * 7) * 0.7, side = h1(seed * 5 + b) > 0.5 ? 1 : -1;
      let [x, y] = M(...at(s0, side));
      const dirA = Math.atan2(y - CY, x) + (h1(seed + b) - 0.5);
      const pts = [[x, y]];
      for (let k = 0; k < 5; k++) { x += Math.cos(dirA) * 14 + (h1(seed + b * 11 + k) - 0.5) * 16; y += Math.sin(dirA) * 9 + (h1(seed + b * 13 + k) - 0.5) * 12; pts.push([x, y]); }
      for (const [col, lw] of [[rgba(MAG, 0.6), 5], ['#ffffff', 1.6]]) {
        c.strokeStyle = col; c.lineWidth = lw;
        c.beginPath(); c.moveTo(...pts[0]); for (const p of pts.slice(1)) c.lineTo(...p); c.stroke();
      }
    }
    c.restore();
  }
  if (wind > 0) { const [x, y] = M(LEN, 0); alertMark(c, x, y - 34, wind); }
}

// Box: [w, h, painter]. The koi floats ~70px above its water point; at headings straight
// down the nose dips a little below y = +8, so the hit-flash may clip it for a frame.
export const PAINTERS = {
  partyplanner: [400, 300, partyplanner, { below: 60 }],
};
