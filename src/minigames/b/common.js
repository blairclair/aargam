// Shared helpers for the games-b minigames (primary, guest, backyard, pond). Owned by: games-b.
import { PALETTE, ROOMS } from '../../core/theme.js';
import { finishMinigame } from '../../core/flow.js';
import { text, keycap } from '../../ui/widgets.js';
// story's bark(roomId, event) from src/story/lines.js is wired in once it lands on main.
const storyBark = () => null;

const TAU = Math.PI * 2;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const easeOut = (k) => 1 - Math.pow(1 - clamp01(k), 3);
export const easeOutBack = (k) => { k = clamp01(k); const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

/** Normalized params: { roomId, hero, attempt, perks, ease (0..2 extra help), timeMul }. */
export function normParams(p, roomId) {
  const attempt = Math.max(1, Number(p?.attempt) || 1);
  const perks = Array.isArray(p?.perks) ? p.perks : [];
  const hero = p?.hero === 'victoria' ? 'victoria' : 'aaron';
  const ease = Math.min(2, attempt - 1);
  const playlist = perks.includes('playlist');
  return { ...p, roomId: p?.roomId ?? roomId, hero, attempt, perks, ease, playlist, timeMul: (playlist ? 1.2 : 1) * (1 + 0.2 * ease) };
}

/** Calls finishMinigame exactly once. */
export function finishOnce(self, success, score) {
  if (self._finished) return;
  self._finished = true;
  finishMinigame(self.game, { roomId: self.p.roomId, success: !!success, score: clamp01(score), attempt: self.p.attempt });
}

/** Story reaction line for (roomId, event), or null. */
export function bark(roomId, event) {
  try {
    const r = storyBark(roomId, event);
    if (!r) return null;
    if (typeof r === 'string') return r;
    return r.text ?? r.line ?? null;
  } catch { return null; }
}

/** Was any "start/advance" input given this frame (Enter/Space/click)? */
export function anyGo(input) { return input.pressed('confirm') || input.mouse.pressed; }

// ---------------------------------------------------------------- hero bust
/** Photo-cutout bust that reacts: 'happy' (bounce), 'oops' (shake), 'wow' (pop + sparkle), 'worried' (sweat). */
export class Bust {
  constructor(game, hero) {
    this.game = game; this.hero = hero; this.t = 0;
    this.kind = null; this.kt = 0; this.tense = 0; this.bubble = null;
  }
  react(kind) { this.kind = kind; this.kt = 0; }
  say(str, dur = 2.6) { if (str) this.bubble = { str, t: 0, dur }; }
  update(dt) {
    this.t += dt; this.kt += dt;
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.dur) this.bubble = null; }
  }
  /** Draw bottom-anchored at (x, y) with height h. flip=false always (never mirror faces). */
  draw(ctx, x, y, h = 170) {
    const img = this.game.assets?.image?.(`bust.${this.hero}.smile`);
    const k = this.kt;
    let dx = 0, dy = Math.sin(this.t * 2.2) * 2, sc = 1, rot = 0;
    if (this.kind === 'happy' && k < 0.6) dy -= Math.abs(Math.sin(k * 10)) * 14 * (1 - k / 0.6);
    if (this.kind === 'oops' && k < 0.5) dx += Math.sin(k * 60) * 7 * (1 - k / 0.5);
    if (this.kind === 'wow' && k < 0.7) { sc = 1 + 0.12 * Math.sin(Math.min(1, k / 0.35) * Math.PI); rot = Math.sin(k * 14) * 0.05 * (1 - k / 0.7); }
    if (this.tense > 0) dx += Math.sin(this.t * 40) * 1.5 * this.tense;
    ctx.save();
    ctx.translate(x + dx, y + dy);
    ctx.rotate(rot); ctx.scale(sc, sc);
    // warm glow behind
    const gl = ctx.createRadialGradient(0, -h * 0.45, 4, 0, -h * 0.45, h * 0.62);
    gl.addColorStop(0, this.kind === 'oops' && k < 0.5 ? 'rgba(255,93,93,0.35)' : 'rgba(255,201,74,0.35)');
    gl.addColorStop(1, 'rgba(255,201,74,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -h * 0.45, h * 0.62, 0, TAU); ctx.fill();
    if (img) {
      const w = h * img.width / img.height;
      ctx.drawImage(img, -w / 2, -h, w, h);
    } else {
      ctx.fillStyle = this.hero === 'victoria' ? PALETTE.denim : PALETTE.tee;
      ctx.beginPath(); ctx.ellipse(0, -h * 0.12, h * 0.34, h * 0.16, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f2c7a5'; ctx.beginPath(); ctx.arc(0, -h * 0.55, h * 0.22, 0, TAU); ctx.fill();
      text(ctx, this.hero === 'victoria' ? 'V' : 'A', 0, -h * 0.5, { align: 'center', font: 'bold 28px "Trebuchet MS", sans-serif', color: PALETTE.choc });
    }
    // sweat drop when worried / tense
    if ((this.kind === 'worried' && k < 1.2) || this.tense > 0.6) {
      const sy = -h * 0.8 + ((this.t * 40) % 20);
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath(); ctx.moveTo(h * 0.26, sy - 8); ctx.quadraticCurveTo(h * 0.26 + 6, sy + 2, h * 0.26, sy + 4); ctx.quadraticCurveTo(h * 0.26 - 6, sy + 2, h * 0.26, sy - 8); ctx.fill();
    }
    // sparkles when wow/happy
    if ((this.kind === 'wow' || this.kind === 'happy') && k < 0.9) {
      ctx.fillStyle = PALETTE.sun;
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + this.t * 2, r = h * 0.42 + Math.sin(this.t * 6 + i) * 6;
        star4(ctx, Math.cos(a) * r, -h * 0.55 + Math.sin(a) * r * 0.8, 5 * (1 - k / 0.9));
      }
    }
    ctx.restore();
    if (this.bubble) speech(ctx, this.bubble.str, x + h * 0.32, y - h * 0.95, clamp01(this.bubble.t * 6) * clamp01((this.bubble.dur - this.bubble.t) * 4));
  }
}

function star4(ctx, x, y, s) {
  if (s <= 0) return;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x + s * 0.4, y); ctx.lineTo(x, y + s * 1.6); ctx.lineTo(x - s * 0.4, y); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - s * 1.6, y); ctx.lineTo(x, y + s * 0.4); ctx.lineTo(x + s * 1.6, y); ctx.lineTo(x, y - s * 0.4); ctx.closePath(); ctx.fill();
}
export { star4 };

function speech(ctx, str, x, y, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  const w = Math.min(260, ctx.measureText(str).width + 20), h = 30;
  ctx.fillStyle = PALETTE.paper; ctx.strokeStyle = PALETTE.choc; ctx.lineWidth = 2;
  rrect(ctx, x, y - h, w, h, 12); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 14, y - 1); ctx.lineTo(x + 6, y + 10); ctx.lineTo(x + 26, y - 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PALETTE.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(str, x + 10, y - h / 2 + 1, w - 20);
  ctx.restore();
}

export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}

// ---------------------------------------------------------------- teaching widgets
/**
 * One short pulsing instruction pill. Parts may include keycaps: prompt(ctx, ['Press', {key:'D'}, 'on the beat'], ...)
 * or just a string.
 */
export function prompt(ctx, parts, x, y, t, o = {}) {
  const arr = typeof parts === 'string' ? [parts] : parts;
  ctx.save();
  ctx.font = o.font ?? 'bold 20px "Trebuchet MS", sans-serif';
  const widths = arr.map((p) => typeof p === 'string' ? ctx.measureText(p).width : 24);
  const gap = 8;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (arr.length - 1);
  const pulse = 1 + Math.sin(t * 5) * 0.025;
  const w = total + 36, h = 42;
  ctx.translate(x, y); ctx.scale(pulse, pulse);
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.fillStyle = 'rgba(16,19,31,0.82)';
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = o.color ?? PALETTE.sun; ctx.lineWidth = 2.5;
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.stroke();
  let cx = -total / 2;
  arr.forEach((p, i) => {
    if (typeof p === 'string') {
      ctx.fillStyle = o.textColor ?? PALETTE.paper; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(p, cx, 1);
    } else keycap(ctx, p.key, cx + 12, 0);
    cx += widths[i] + gap;
  });
  ctx.restore();
}

/** Ghost pointing hand (tutorial cursor). press 0..1 squashes it. */
export function drawHand(ctx, x, y, press = 0, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(1 - press * 0.12, 1 - press * 0.12);
  if (press > 0) {
    ctx.strokeStyle = `rgba(255,201,74,${0.9 * press})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 10 + (1 - press) * 16, 0, TAU); ctx.stroke();
  }
  ctx.fillStyle = PALETTE.paper; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(5, 0); ctx.lineTo(5, 14); // index finger
  ctx.lineTo(10, 12); ctx.lineTo(15, 14); ctx.lineTo(20, 16); ctx.lineTo(24, 20);
  ctx.lineTo(23, 34); ctx.lineTo(16, 42); ctx.lineTo(4, 42); ctx.lineTo(-6, 30); ctx.lineTo(-9, 22);
  ctx.lineTo(-5, 19); ctx.lineTo(-1, 24); ctx.lineTo(-1, 3); ctx.closePath();
  ctx.translate(-2, 0);
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

/** Cozy room backdrop: warm gradient tinted by the room accent, soft bokeh lamps, vignette. */
export function backdrop(ctx, game, roomId, t, o = {}) {
  const W = game.width, H = game.height;
  const acc = ROOMS[roomId]?.accent ?? PALETTE.sun;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, o.top ?? '#2a2238');
  g.addColorStop(1, o.bottom ?? '#3a2a2a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const x = ((i * 137 + t * (6 + i)) % (W + 160)) - 80;
    const y = 60 + ((i * 89) % (H - 120)) + Math.sin(t * 0.6 + i) * 10;
    const r = 30 + (i * 23) % 50;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, hexA(i % 2 ? acc : PALETTE.sun, 0.10)); rg.addColorStop(1, hexA(acc, 0));
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
  vignette(ctx, W, H, o.vignette ?? 0.55);
}

export function vignette(ctx, W, H, a = 0.5, color = '0,0,0') {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.7);
  v.addColorStop(0, `rgba(${color},0)`); v.addColorStop(1, `rgba(${color},${a})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

export function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Big centered banner text that pops in. k = seconds since shown. */
export function banner(ctx, str, x, y, k, o = {}) {
  const s = k < 0.25 ? easeOutBack(k / 0.25) : 1;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  text(ctx, str, 0, 0, { align: 'center', baseline: 'middle', font: o.font ?? 'bold 46px "Trebuchet MS", sans-serif', color: o.color ?? PALETTE.sun, outline: o.outline ?? PALETTE.ink, outlineWidth: 8 });
  if (o.sub) text(ctx, o.sub, 0, 44, { align: 'center', baseline: 'middle', font: 'bold 18px "Trebuchet MS", sans-serif', color: PALETTE.paper, outline: PALETTE.ink, outlineWidth: 5 });
  ctx.restore();
}

/** Small top-left title chip: "Guest Bedroom · Pipe Fixer". */
export function titleChip(ctx, roomId) {
  const r = ROOMS[roomId];
  if (!r) return;
  ctx.save();
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  const s = `${r.name} · ${r.minigame}`;
  const w = ctx.measureText(s).width + 26;
  ctx.fillStyle = 'rgba(16,19,31,0.7)'; rrect(ctx, 14, 12, w, 28, 14); ctx.fill();
  ctx.fillStyle = r.accent; ctx.beginPath(); ctx.arc(28, 26, 5, 0, TAU); ctx.fill();
  ctx.fillStyle = PALETTE.paper; ctx.textBaseline = 'middle'; ctx.fillText(s, 40, 27);
  ctx.restore();
}
