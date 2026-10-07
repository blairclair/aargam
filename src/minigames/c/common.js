// Shared helpers for games-c minigames (Bug Hunt, Bunny Roundup). Owned by: games-c.
import { PALETTE } from '../../core/theme.js';

const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/** Perks may arrive as an array (flow) or a comma string (deep link). */
export function perkList(p) {
  if (Array.isArray(p?.perks)) return p.perks;
  if (typeof p?.perks === 'string') return p.perks.split(',').filter(Boolean);
  return [];
}
/** Time multiplier from perks: only 'playlist' counts (+20%). */
export const timeMul = (p) => (perkList(p).includes('playlist') ? 1.2 : 1);

/** Hero photo bust that reacts (bounce on good, shake on bad, sparkle on cheer). Never alters the face. */
export class Bust {
  constructor(hero) { this.hero = hero === 'victoria' ? 'victoria' : 'aaron'; this.bounce = 0; this.shake = 0; this.cheer = 0; this.t = 0; }
  react(kind) {
    if (kind === 'good') this.bounce = 1;
    else if (kind === 'bad') this.shake = 1;
    else if (kind === 'cheer') { this.cheer = 1; this.bounce = 1; }
  }
  update(dt) {
    this.t += dt;
    this.bounce = Math.max(0, this.bounce - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 2.5);
    this.cheer = Math.max(0, this.cheer - dt * 0.6);
  }
  /** Draws with bottom-left at (x, yBottom), height h. */
  render(ctx, game, x, yBottom, h) {
    const img = game.assets.image(`bust.${this.hero}.smile`);
    const breathe = Math.sin(this.t * 2) * 1.5;
    const by = -Math.sin(this.bounce * Math.PI) * 18;
    const sx = Math.sin(this.t * 45) * this.shake * 6;
    const lean = Math.sin(this.t * 45) * this.shake * 0.03;
    ctx.save();
    if (img) {
      const w = (img.width / img.height) * h;
      ctx.translate(x + w / 2 + sx, yBottom + by + breathe);
      ctx.rotate(lean);
      ctx.drawImage(img, -w / 2, -h, w, h);
      if (this.shake > 0.3) drawSweat(ctx, w * 0.32, -h * 0.78, this.shake);
      if (this.cheer > 0) drawSparkles(ctx, 0, -h * 0.7, w * 0.6, this.t, this.cheer);
    } else {
      // fallback: warm silhouette
      ctx.translate(x + h * 0.4 + sx, yBottom + by);
      ctx.fillStyle = this.hero === 'victoria' ? PALETTE.denim : PALETTE.tee;
      ctx.beginPath(); ctx.ellipse(0, 0, h * 0.4, h * 0.3, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#f2c7a5'; ctx.beginPath(); ctx.arc(0, -h * 0.5, h * 0.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

function drawSweat(ctx, x, y, k) {
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.5);
  ctx.fillStyle = '#9fd8ff'; ctx.strokeStyle = '#3a7bb0'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.quadraticCurveTo(x + 8, y + 2, x, y + 6); ctx.quadraticCurveTo(x - 8, y + 2, x, y - 12); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawSparkles(ctx, x, y, spread, t, k) {
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); ctx.fillStyle = PALETTE.sun;
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + t * 0.7, px = x + Math.cos(a) * spread * 0.6, py = y + Math.sin(a * 1.7) * spread * 0.4;
    const s = 4 + 3 * Math.sin(t * 6 + i);
    star(ctx, px, py, s);
  }
  ctx.restore();
}
export function star(ctx, x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x + s * 0.4, y); ctx.lineTo(x, y + s * 1.6); ctx.lineTo(x - s * 0.4, y); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - s * 1.6, y); ctx.lineTo(x, y + s * 0.4); ctx.lineTo(x + s * 1.6, y); ctx.lineTo(x, y - s * 0.4); ctx.closePath(); ctx.fill();
}

/** Cartoon white-glove pointer; fingertip at (x, y). press 0..1 squashes it. */
export function drawHand(ctx, x, y, press = 0, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(-0.45);
  const s = 1 - press * 0.12;
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 2.5;
  // finger
  rr(ctx, -5, 0, 10, 26, 5); ctx.fill(); ctx.stroke();
  // palm + folded fingers
  rr(ctx, -10, 20, 26, 26, 9); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, 26); ctx.lineTo(5, 34); ctx.moveTo(11, 27); ctx.lineTo(11, 34); ctx.stroke();
  // cuff
  ctx.fillStyle = PALETTE.sun; rr(ctx, -9, 44, 24, 8, 3); ctx.fill(); ctx.stroke();
  ctx.restore();
  if (press > 0.5) {
    ctx.save(); ctx.globalAlpha *= alpha * (press - 0.5) * 2;
    ctx.strokeStyle = PALETTE.sun; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 14 + (1 - press) * 20, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

/** Pulsing highlight ring around a target. */
export function drawPulseRing(ctx, x, y, r, t, color = PALETTE.sun) {
  const k = (t * 1.6) % 1;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.globalAlpha = 0.9;
  ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 20;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1 - k;
  ctx.beginPath(); ctx.arc(x, y, r + k * 22, 0, TAU); ctx.stroke();
  ctx.restore();
}

/** Bouncing arrow pointing down at (x, y). */
export function drawArrowDown(ctx, x, y, t, color = PALETTE.sun) {
  const b = Math.abs(Math.sin(t * 5)) * 8;
  ctx.save();
  ctx.translate(x, y - b);
  ctx.fillStyle = color; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -30); ctx.lineTo(8, -30); ctx.lineTo(8, -14); ctx.lineTo(18, -14); ctx.lineTo(0, 0); ctx.lineTo(-18, -14); ctx.lineTo(-8, -14); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

/** Simple big green check badge. */
export function drawCheck(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = PALETTE.mintDeep; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - r * 0.45, y + r * 0.02); ctx.lineTo(x - r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.5, y - r * 0.35); ctx.stroke();
  ctx.restore();
}

export const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return `${(s / 60) | 0}:${String(s % 60).padStart(2, '0')}`; };
