// v2 skill + enemy projectiles and ground zones (Housewarming). Owned by: art.
// Names match what src/action spawns (shot.kind / zone.kind). Returns true when handled.
import { PALETTE } from '../core/theme.js';
import { rrect, rgba, hash2 } from './util.js';

const TAU = Math.PI * 2;
const INK = PALETTE.ink;
const TERM = '#7dff9b';

function ground(ctx, r, h = 8) { ctx.fillStyle = 'rgba(16,19,31,0.18)'; ctx.beginPath(); ctx.ellipse(0, r + h, r * 0.85, r * 0.3, 0, 0, TAU); ctx.fill(); }
function trail(ctx, ang, r, col, n = 3) {
  for (let i = n; i >= 1; i--) {
    ctx.fillStyle = rgba(col, 0.16 * (n + 1 - i));
    ctx.beginPath(); ctx.arc(-Math.cos(ang) * r * i * 0.9, -Math.sin(ang) * r * i * 0.9, r * (1 - i * 0.18), 0, TAU); ctx.fill();
  }
}
function lines(ctx, ang, r, col = 'rgba(255,246,229,0.7)') {
  ctx.save(); ctx.rotate(ang); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (const dy of [-r * 0.5, 0, r * 0.5]) { ctx.beginPath(); ctx.moveTo(-r * 1.4, dy); ctx.lineTo(-r * 2.6 - Math.abs(dy) * 0.4, dy); ctx.stroke(); }
  ctx.restore();
}

// ------------------------------------------------------------------ projectiles
const PROJ = {
  baguette(ctx, o, t, ang, mv) {
    ground(ctx, 10, 10); if (mv) lines(ctx, ang, 8);
    ctx.rotate(mv ? ang + Math.sin(t * 14) * 0.25 : t * 6);
    ctx.fillStyle = '#c98a3e'; rrect(ctx, -17, -5.5, 34, 11, 5.5); ctx.fill();
    ctx.fillStyle = '#e0aa5c'; rrect(ctx, -16, -5, 32, 8, 4); ctx.fill();
    ctx.strokeStyle = '#f6dfae'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let i = -1.5; i <= 1.5; i++) { ctx.beginPath(); ctx.moveTo(i * 8 - 2.5, -3); ctx.lineTo(i * 8 + 2.5, 2); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(90,58,42,0.6)'; ctx.lineWidth = 1; rrect(ctx, -17, -5.5, 34, 11, 5.5); ctx.stroke();
  },
  pillow(ctx, o, t, ang, mv) {
    ground(ctx, 10, 10); if (mv) lines(ctx, ang, 9);
    ctx.rotate(t * 5);
    const p = 1 + Math.sin(t * 18) * 0.05;
    ctx.scale(p, 2 - p);
    ctx.fillStyle = '#c9a0dc';
    ctx.beginPath(); ctx.moveTo(-11, -9); ctx.quadraticCurveTo(0, -6, 11, -9); ctx.quadraticCurveTo(8, 0, 11, 9); ctx.quadraticCurveTo(0, 6, -11, 9); ctx.quadraticCurveTo(-8, 0, -11, -9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9b74b4'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = PALETTE.paper; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(-4, -4, 4, 2, -0.4, 0, TAU); ctx.fill();
  },
  ball(ctx, o, t, ang, mv) {
    const r = o.r ?? 8;
    const hop = Math.abs(Math.sin(t * 9)) * 8;
    ctx.fillStyle = 'rgba(16,19,31,0.2)'; ctx.beginPath(); ctx.ellipse(0, r + 6, r * (0.9 - hop * 0.03), r * 0.3, 0, 0, TAU); ctx.fill();
    ctx.translate(0, -hop);
    if (mv) trail(ctx, ang, r * 0.8, PALETTE.danger);
    ctx.rotate(t * 10);
    ctx.fillStyle = PALETTE.danger; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = PALETTE.sun; ctx.lineWidth = r * 0.3; ctx.beginPath(); ctx.arc(0, 0, r * 0.85, -0.6, 1.0); ctx.stroke();
    ctx.rotate(-t * 10);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.4, r * 0.25, 0, TAU); ctx.fill();
  },
  sock(ctx, o, t, ang, mv) {
    ground(ctx, 8, 10);
    const enemy = o.team === 'enemy';
    if (mv) trail(ctx, ang, 5, enemy ? '#ff8fb1' : PALETTE.frost);
    ctx.rotate(t * 9);
    ctx.fillStyle = enemy ? '#ff8fb1' : PALETTE.paper;
    ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(1, -8); ctx.lineTo(1, 1); ctx.quadraticCurveTo(9, 1, 9, 6); ctx.quadraticCurveTo(9, 9, 4, 9); ctx.lineTo(-2, 9); ctx.quadraticCurveTo(-6, 7, -6, 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = enemy ? PALETTE.paper : '#5aa4e6'; ctx.fillRect(-5.5, -7.5, 6, 2.6);
  },
  yarn(ctx, o, t, ang, mv) {
    ground(ctx, 9, 10);
    if (mv) { // thread trailing behind
      ctx.strokeStyle = '#ff8fb1'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, 0);
      for (let i = 1; i < 8; i++) ctx.lineTo(-Math.cos(ang) * i * 5 + Math.sin(t * 10 + i) * 2, -Math.sin(ang) * i * 5 + Math.cos(t * 10 + i) * 2);
      ctx.stroke();
    }
    ctx.rotate(t * 7);
    ctx.fillStyle = '#ff8fb1'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#e2557a'; ctx.lineWidth = 1.1;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.5, i * 0.8, 0, TAU); ctx.stroke(); }
  },
  wrench(ctx, o, t, ang, mv) {
    ground(ctx, 9, 10);
    ctx.save(); ctx.rotate(t * 16);
    ctx.strokeStyle = 'rgba(255,246,229,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 15, 0.4, 2.2); ctx.stroke();
    ctx.fillStyle = '#b8c0cf'; rrect(ctx, -12, -2.6, 20, 5.2, 2.4); ctx.fill();
    ctx.fillStyle = '#c0473f'; rrect(ctx, -12, -3, 8, 6, 2.6); ctx.fill();
    ctx.fillStyle = '#b8c0cf'; ctx.beginPath(); ctx.arc(10, 0, 6, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(18, -3.5); ctx.lineTo(18, 3.5); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#6f788a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(10, 0, 6, 0.5, TAU - 0.5); ctx.stroke();
    ctx.restore();
  },
  toast(ctx, o, t, ang, mv) {
    ground(ctx, 8, 10); if (mv) lines(ctx, ang, 7);
    ctx.rotate(t * 8);
    ctx.fillStyle = '#b8743a'; ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(-8, -4); ctx.quadraticCurveTo(-9, -10, -3, -10); ctx.lineTo(3, -10); ctx.quadraticCurveTo(9, -10, 8, -4); ctx.lineTo(8, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8b56a'; ctx.fillRect(-5.5, -6, 11, 12);
    ctx.fillStyle = 'rgba(90,58,42,0.5)'; ctx.fillRect(-3, -2, 2, 2); ctx.fillRect(1.5, 1.5, 2, 2);
  },
  web(ctx, o, t) {
    ctx.rotate(t * 4);
    ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke(); }
    ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * TAU / 8; ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); } ctx.stroke();
  },
  ember(ctx, o, t, ang, mv) {
    const r = o.r ?? 8;
    if (mv) trail(ctx, ang, r * 0.8, PALETTE.sunDeep, 4);
    const f = 1 + Math.sin(t * 30) * 0.12;
    ctx.fillStyle = '#3a2a22'; ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, TAU); ctx.fill();
    ctx.fillStyle = PALETTE.sunDeep; ctx.beginPath(); ctx.arc(0, 0, r * 0.75 * f, 0, TAU); ctx.fill();
    ctx.fillStyle = PALETTE.sun; ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.15, r * 0.4 * f, 0, TAU); ctx.fill();
  },
  code(ctx, o, t, ang, mv) {
    const g = o.glyph ?? '{};01<>/='[Math.floor(hash2(Math.floor(t * 8), 1, 3) * 8)];
    if (mv) trail(ctx, ang, 7, TERM);
    ctx.fillStyle = 'rgba(6,16,11,0.85)'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
    ctx.strokeStyle = TERM; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.shadowColor = TERM; ctx.shadowBlur = 8;
    ctx.fillStyle = TERM; ctx.font = 'bold 13px "SF Mono", Menlo, Consolas, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(g, 0, 1);
    ctx.shadowBlur = 0;
  },
  plate(ctx, o, t, ang, mv) {
    ground(ctx, 10, 12); if (mv) lines(ctx, ang, 9);
    ctx.scale(1, 0.55); ctx.rotate(t * 14);
    ctx.fillStyle = '#f6f3ea'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#e98aa8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#c8c0ae'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke();
  },
  steam(ctx, o, t) {
    const r = o.r ?? 10;
    for (let i = 0; i < 3; i++) {
      const a = t * 3 + i * 2.1;
      ctx.fillStyle = `rgba(255,255,255,${0.7 - i * 0.15})`;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * (0.7 - i * 0.12), 0, TAU); ctx.fill();
    }
  },
  dough(ctx, o, t, ang, mv) {
    const r = o.r ?? 7;
    ground(ctx, r, 8);
    const w = 1 + Math.sin(t * 16) * 0.1;
    ctx.scale(w, 2 - w);
    ctx.fillStyle = '#f3dcae'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.35, r * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d9b47a'; ctx.beginPath(); ctx.arc(r * 0.3, r * 0.2, r * 0.18, 0, TAU); ctx.fill();
  },
  card(ctx, o, t, ang, mv) {
    if (mv) trail(ctx, ang, 6, PALETTE.sky);
    ctx.rotate(t * 10);
    ctx.fillStyle = PALETTE.paper; rrect(ctx, -6, -8.5, 12, 17, 2); ctx.fill();
    ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = PALETTE.sky; rrect(ctx, -4, -6, 8, 6.5, 1); ctx.fill();
  },
  lint(ctx, o, t) {
    ctx.fillStyle = '#c3c0d0';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * 1.6 + t * 6) * 3, Math.sin(i * 1.6 + t * 6) * 3, 3.2, 0, TAU); ctx.fill(); }
  },
  drop(ctx, o, t, ang, mv) { // water droplet (hose spray / leak)
    const r = o.r ?? 4;
    ctx.rotate(mv ? ang + Math.PI / 2 : 0);
    ctx.fillStyle = 'rgba(159,216,255,0.9)'; ctx.beginPath(); ctx.moveTo(0, -r * 1.8); ctx.quadraticCurveTo(r, 0, 0, r); ctx.quadraticCurveTo(-r, 0, 0, -r * 1.8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.1, r * 0.25, 0, TAU); ctx.fill();
  },
};
PROJ.bouncy_ball = PROJ.ball;
PROJ.throw_pillow = PROJ.pillow;
PROJ.bread = PROJ.baguette;
PROJ.water = PROJ.drop;
export const PROJECTILE_KINDS_V2 = Object.keys(PROJ);

/** o: { r?, angle? | vx?/vy?, t?, alpha?, team?, glyph? (code) } */
export function drawSkillProjectile(ctx, game, kind, x, y, o = {}) {
  const fn = PROJ[kind];
  if (!fn) return false;
  const t = o.t ?? game?.time ?? 0;
  const mv = o.vx != null || o.vy != null || o.angle != null;
  const ang = o.angle ?? (mv ? Math.atan2(o.vy ?? 0, o.vx ?? 0) : 0);
  ctx.save();
  ctx.translate(x, y);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.scale) ctx.scale(o.scale, o.scale);
  fn(ctx, o, t, ang, mv);
  ctx.restore();
  return true;
}

// ------------------------------------------------------------------ zones (ground decals / area effects)
const ZONE = {
  fire(ctx, r, o, t) { // charcoal embers on the ground (Grill Dragon)
    ctx.scale(1, 0.6);
    const gr = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
    gr.addColorStop(0, 'rgba(255,201,74,0.55)'); gr.addColorStop(0.6, 'rgba(242,120,46,0.35)'); gr.addColorStop(1, 'rgba(242,120,46,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.scale(1, 1 / 0.6);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, d = r * 0.55 * ((i * 0.37) % 1);
      const fx = Math.cos(a) * d, fy = Math.sin(a) * d * 0.6, h = 6 + 5 * Math.sin(t * 12 + i * 1.7);
      ctx.fillStyle = PALETTE.sunDeep; ctx.beginPath(); ctx.moveTo(fx - 3.5, fy); ctx.quadraticCurveTo(fx - 3, fy - h * 0.6, fx, fy - h); ctx.quadraticCurveTo(fx + 3, fy - h * 0.6, fx + 3.5, fy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PALETTE.sun; ctx.beginPath(); ctx.moveTo(fx - 1.6, fy); ctx.quadraticCurveTo(fx, fy - h * 0.6, fx + 1.6, fy); ctx.closePath(); ctx.fill();
    }
  },
  net(ctx, r, o, t) { // Crochet Net: pink yarn mesh
    ctx.scale(1, 0.6);
    ctx.fillStyle = 'rgba(255,143,177,0.14)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    ctx.strokeStyle = 'rgba(255,143,177,0.85)'; ctx.lineWidth = 2.2;
    const s = Math.max(10, r / 4);
    for (let k = -r; k <= r; k += s) {
      ctx.beginPath(); for (let u = -r; u <= r; u += 4) ctx.lineTo(k + Math.sin(u * 0.3 + t * 2) * 1.2, u); ctx.stroke();
      ctx.beginPath(); for (let u = -r; u <= r; u += 4) ctx.lineTo(u, k + Math.sin(u * 0.3 + t * 2) * 1.2); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#e2557a'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 10;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  },
  puddle(ctx, r, o, t) { // Leak puddle
    ctx.scale(1, 0.55);
    ctx.fillStyle = 'rgba(70,160,220,0.6)';
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) { const a = i * TAU / 16, rr = r * (0.85 + 0.15 * Math.sin(i * 2.7 + (o.seed ?? 0))); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(191,233,255,0.7)'; ctx.lineWidth = 1.5;
    const k = (t * 0.8) % 1;
    ctx.globalAlpha *= 1 - k; ctx.beginPath(); ctx.arc(0, 0, r * 0.7 * k, 0, TAU); ctx.stroke(); ctx.globalAlpha /= Math.max(0.01, 1 - k);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.25, r * 0.25, r * 0.08, -0.3, 0, TAU); ctx.fill();
  },
  web(ctx, r, o) { // Cable Spider web (slows)
    ctx.scale(1, 0.6);
    ctx.strokeStyle = 'rgba(232,236,245,0.75)'; ctx.lineWidth = 1.3;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
    for (let k = 1; k <= 4; k++) { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * TAU / 8; ctx.lineTo(Math.cos(a) * r * k / 4, Math.sin(a) * r * k / 4); } ctx.stroke(); }
  },
  boundaries(ctx, r, o, t) { // Victoria's ultimate: a ring nothing hostile can cross
    ctx.scale(1, 0.6);
    const gr = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
    gr.addColorStop(0, 'rgba(127,216,166,0)'); gr.addColorStop(1, 'rgba(127,216,166,0.28)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = PALETTE.mint; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.arc(0, 0, r - 7, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // little stitched "fence" posts
    ctx.fillStyle = PALETTE.mintDeep;
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 3.5, 0, TAU); ctx.fill(); }
    ctx.scale(1, 1 / 0.6);
    // rising wall shimmer
    ctx.strokeStyle = rgba(PALETTE.mint, 0.25 + 0.15 * Math.sin(t * 4)); ctx.lineWidth = 2;
    for (let i = 0; i < 24; i++) { const a = i * TAU / 24, h = 18 + 6 * Math.sin(t * 3 + i); const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - h); ctx.stroke(); }
  },
  drumwave(ctx, r, o, t) { // Drumline shockwave ring (o.life 0..1, o.onBeat bool = gold)
    const life = Math.max(0, Math.min(1, o.life ?? 0.6));
    const col = o.onBeat ? PALETTE.sun : '#9b7bd6';
    ctx.scale(1, 0.6);
    ctx.globalAlpha *= Math.min(1, life * 1.6);
    ctx.strokeStyle = col; ctx.lineWidth = 4 + life * 8; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,246,229,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, TAU); ctx.stroke();
    ctx.scale(1, 1 / 0.6);
    ctx.fillStyle = col; ctx.font = `bold ${Math.round(12 + r * 0.05)}px "Trebuchet MS", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + r * 0.01; ctx.fillText('♪', Math.cos(a) * r * 1.05, Math.sin(a) * r * 0.63 - 6); }
  },
  hose(ctx, r, o, t) { // Garden Hose stream: o.angle, r = length, o.width
    const ang = o.angle ?? 0, w = o.width ?? 18;
    ctx.rotate(ang);
    const gr = ctx.createLinearGradient(0, 0, r, 0);
    gr.addColorStop(0, 'rgba(159,216,255,0.9)'); gr.addColorStop(1, 'rgba(159,216,255,0.15)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(0, -w * 0.25); ctx.lineTo(r, -w * 0.7); ctx.lineTo(r, w * 0.7); ctx.lineTo(0, w * 0.25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 14; i++) { const k = ((t * 3 + i / 14) % 1); ctx.beginPath(); ctx.arc(k * r, Math.sin(i * 3.1 + t * 20) * w * 0.25 * (0.4 + k), 1.4 + k * 1.6, 0, TAU); ctx.fill(); }
  },
  laser(ctx, r, o, t) { // PartyPlanner code laser: o.angle, r = length, o.width
    const ang = o.angle ?? 0, w = o.width ?? 30;
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(125,255,155,0.25)'; ctx.fillRect(0, -w / 2, r, w);
    ctx.fillStyle = 'rgba(200,255,215,0.9)'; ctx.fillRect(0, -w * 0.15, r, w * 0.3);
    ctx.fillStyle = TERM; ctx.font = 'bold 11px "SF Mono", Menlo, monospace'; ctx.textBaseline = 'middle';
    for (let x = ((t * 200) % 22); x < r; x += 22) ctx.fillText(((x / 22) | 0) % 2 ? '1' : '0', x, -w * 0.35);
  },
  steam(ctx, r, o, t) { // Kettle steam cone: o.angle, r = length, o.arc (half-angle)
    const ang = o.angle ?? 0, arc = o.arc ?? 0.45;
    ctx.rotate(ang);
    for (let i = 0; i < 10; i++) {
      const k = ((t * 1.6 + i / 10) % 1);
      const a = (hash2(i, 2, 5) - 0.5) * 2 * arc;
      ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * k, Math.sin(a) * r * k, 5 + k * 16, 0, TAU); ctx.fill();
    }
  },
  aggro(ctx, r, o, t) { // Pull Aggro aura around Aaron
    ctx.scale(1, 0.6);
    const p = (t * 1.2) % 1;
    ctx.strokeStyle = rgba(PALETTE.danger, 0.7 * (1 - p)); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r * (1 - p * 0.6), 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(PALETTE.sun, 0.9); ctx.lineWidth = 2.5; ctx.setLineDash([5, 6]); ctx.lineDashOffset = t * 20;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  },
  sizzle(ctx, r, o, t) { // Hot Pan arc: o.angle, o.arc (half-angle)
    const ang = o.angle ?? 0, arc = o.arc ?? 1.0, life = o.life ?? 1;
    ctx.rotate(ang); ctx.globalAlpha *= life;
    const gr = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
    gr.addColorStop(0, 'rgba(255,201,74,0)'); gr.addColorStop(0.8, 'rgba(242,159,46,0.5)'); gr.addColorStop(1, 'rgba(255,93,93,0.15)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, -arc, arc); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = PALETTE.sun; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, -arc, arc); ctx.stroke();
  },
  mop(ctx, r, o, t) { // Mop Spin swirl
    ctx.scale(1, 0.6);
    ctx.strokeStyle = 'rgba(159,216,255,0.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, r * (0.5 + k * 0.22), t * 9 + k * 2, t * 9 + k * 2 + 2.2); ctx.stroke(); }
  },
  mark(ctx, r, o, t) { // Debug mark (on an enemy's feet)
    ctx.scale(1, 0.6);
    ctx.strokeStyle = TERM; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.lineDashOffset = t * 15;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = TERM;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t; ctx.fillRect(Math.cos(a) * r - 2, Math.sin(a) * r - 2, 4, 4); }
  },
};
ZONE.crochet_net = ZONE.net; ZONE.leak = ZONE.puddle; ZONE.ring = ZONE.boundaries; ZONE.shockwave_drum = ZONE.drumwave;
export const ZONE_KINDS_V2 = Object.keys(ZONE);

/** v2 zone. (x, y) centre, r radius (or length for hose/laser/steam/sizzle). o: { t?, life? 0..1, alpha?, angle?, width?, arc?, onBeat?, seed? } */
export function drawSkillZone(ctx, game, kind, x, y, r, o = {}) {
  const fn = ZONE[kind];
  if (!fn) return false;
  const t = o.t ?? game?.time ?? 0;
  ctx.save();
  ctx.translate(x, y);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.life != null && kind !== 'drumwave' && kind !== 'sizzle') ctx.globalAlpha *= Math.min(1, o.life * 3);
  fn(ctx, r, o, t);
  ctx.restore();
  return true;
}
