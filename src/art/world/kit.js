// Shared drawing kit for art-world (rooms, furniture, enemies). Owned by: art-world.
// Re-exports the stable round-1 helpers from ../util.js and adds our own flash/eyes/etc.
import { makeCanvas, cached, hash2, rng, mix, shade, rgba, rrect, shadow, facingOf } from '../util.js';
import { PALETTE } from '../../core/theme.js';

export { makeCanvas, cached, hash2, rng, mix, shade, rgba, rrect, shadow, facingOf, PALETTE };

export const TAU = Math.PI * 2;
export const INK = PALETTE.ink;
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = (k) => k * k * (3 - 2 * k);

// Warm house woods + fabrics (shared by rooms and furniture so they read as one house).
export const WOOD = { light: '#d4a373', mid: '#b5835a', dark: '#8a5a3a', deep: '#5e3b25', oak: '#c99a64', walnut: '#7a4e32' };
export const CREAM = '#fff3dc';
export const LAMP = '#ffd98a';

let scratch = null;
/**
 * Draw fn into a scratch canvas and composite with a white flash (hit feedback).
 * w,h = local box size; (ox, oy) = where the local origin sits inside the box.
 */
export function withFlash(ctx, w, h, ox, oy, flash, fn) {
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

/** Cute-but-cross eyes: white sclera, ink pupil looking `look` (-1..1), angry brows tilted by `tilt`. */
export function eyes(c, x, y, sep, r, look = 0.5, tilt = -1, o = {}) {
  for (const ex of [x - sep, x + sep]) {
    c.fillStyle = o.white ?? '#fff'; c.beginPath(); c.ellipse(ex, y, r, r * 1.15, 0, 0, TAU); c.fill();
    c.fillStyle = o.pupil ?? INK; c.beginPath(); c.arc(ex + look * r * 0.35, y + r * 0.15, r * 0.58, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + look * r * 0.35 - r * 0.22, y - r * 0.12, r * 0.22, 0, TAU); c.fill();
  }
  if (tilt) {
    c.strokeStyle = o.brow ?? INK; c.lineWidth = Math.max(1, r * 0.55); c.lineCap = 'round';
    const by = y - r * 1.4, bw = r * 0.95;
    c.beginPath(); c.moveTo(x - sep - bw, by - tilt); c.lineTo(x - sep + bw, by + tilt); c.stroke();
    c.beginPath(); c.moveTo(x + sep + bw, by - tilt); c.lineTo(x + sep - bw, by + tilt); c.stroke();
  }
}

/** Googly eye (white disc, pupil that lags/wobbles). */
export function googly(c, x, y, r, t, seed = 0) {
  c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.strokeStyle = INK; c.lineWidth = Math.max(0.8, r * 0.12); c.stroke();
  const a = t * 5 + seed * 9, d = r * 0.38;
  c.fillStyle = INK; c.beginPath(); c.arc(x + Math.cos(a) * d * 0.6, y + d * 0.5 + Math.sin(a * 1.3) * d * 0.4, r * 0.5, 0, TAU); c.fill();
}

/** Small 4-point sparkle. */
export function sparkle(c, x, y, s, a = 1, color = '#fff') {
  c.fillStyle = color; const ga = c.globalAlpha; c.globalAlpha = ga * a;
  c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.3, y); c.lineTo(x, y + s); c.lineTo(x - s * 0.3, y); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x - s, y); c.lineTo(x, y + s * 0.3); c.lineTo(x + s, y); c.lineTo(x, y - s * 0.3); c.closePath(); c.fill();
  c.globalAlpha = ga;
}

/** Wind-up telegraph ring on the ground: grows + reddens with k (0..1). */
export function telegraph(c, rx, ry, k, color = PALETTE.danger) {
  if (!(k > 0)) return;
  c.save();
  c.strokeStyle = rgba(color, 0.25 + 0.6 * k); c.lineWidth = 1.5 + k * 1.5;
  c.setLineDash([4, 3]);
  c.beginPath(); c.ellipse(0, 0, rx * (0.6 + 0.4 * k), ry * (0.6 + 0.4 * k), 0, 0, TAU); c.stroke();
  c.setLineDash([]);
  c.fillStyle = rgba(color, 0.12 * k); c.fill();
  c.restore();
}

/** "!" alert bubble used for readable attack wind-ups. */
export function alertMark(c, x, y, k) {
  if (!(k > 0.05)) return;
  c.save(); c.translate(x, y); const s = 0.7 + 0.3 * Math.min(1, k * 2); c.scale(s, s);
  c.fillStyle = PALETTE.danger; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.fillRect(-1.1, -4, 2.2, 5); c.fillRect(-1.1, 2.2, 2.2, 1.8);
  c.restore();
}
