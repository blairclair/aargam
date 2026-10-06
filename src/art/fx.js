// FX CONTRACT — Owned by: art/ui/audio team. Signatures FROZEN (burst, floatText, addShake, shakeOffset, update, render).
// Usage (action scene): const fx = new Fx(); fx.burst(x,y,'#fff'); fx.update(dt); fx.render(ctx);
// Render inside the same camera transform as the world.
// Extras (optional): sparkle, snowPuff, splat, thaw, ringPulse, confetti, swapPuff, hitStop; floatText opts { size, big, drift }.
import { PALETTE } from '../core/theme.js';

const TAU = Math.PI * 2;
const MAX_PARTS = 700;
const ICY = new Set([PALETTE.frost, PALETTE.ice, PALETTE.frostDeep, '#fff', '#ffffff']);

export class Fx {
  constructor() { this.parts = []; this.texts = []; this.rings = []; this.shake = 0; this.trauma = 0; this.t = 0; this.freeze = 0; }

  _p(o) { if (this.parts.length < MAX_PARTS) this.parts.push(o); }

  /** Particle burst. Icy colors become snowflakes; everything gets a few star sparkles. */
  burst(x, y, color = '#fff', count = 10, speed = 120) {
    const icy = ICY.has(color);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU, v = speed * (0.35 + Math.random() * 0.65);
      const life = 0.35 + Math.random() * 0.35;
      const shape = icy ? (Math.random() < 0.5 ? 'flake' : 'dot') : (Math.random() < 0.15 ? 'star' : 'dot');
      this._p({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.25, g: icy ? 120 : 260, drag: 3, life, max: life, color, size: 1.6 + Math.random() * 2.6, shape, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10 });
    }
  }
  /** Twinkly star sparkles (pickups, thaw, level-up). */
  sparkle(x, y, color = PALETTE.sun, count = 8, radius = 18) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU, d = Math.random() * radius;
      const life = 0.4 + Math.random() * 0.5;
      this._p({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: 0, vy: -20 - Math.random() * 20, g: 0, drag: 1, life, max: life, color, size: 3 + Math.random() * 3, shape: 'star', rot: 0, vr: 0, delay: Math.random() * 0.2 });
    }
  }
  /** Soft rolling snow puff (dash start, landing, enemy hop, swap). */
  snowPuff(x, y, count = 10, color = PALETTE.ice) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU, v = 30 + Math.random() * 60;
      const life = 0.45 + Math.random() * 0.35;
      this._p({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.4 - 10, g: -20, drag: 4, life, max: life, color, size: 4 + Math.random() * 5, shape: 'puff', grow: 8, rot: 0, vr: 0 });
    }
  }
  /** Scoop splat: gooey drops + a ground splotch (mint scoop hits, scoop pickups). */
  splat(x, y, color = PALETTE.mint, count = 10) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU, v = 60 + Math.random() * 120;
      const life = 0.4 + Math.random() * 0.3;
      this._p({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, g: 420, drag: 1.5, life, max: life, color, size: 2 + Math.random() * 3, shape: 'drop', rot: 0, vr: 0 });
    }
    this._p({ x, y: y + 4, vx: 0, vy: 0, g: 0, drag: 0, life: 0.9, max: 0.9, color, size: 10, shape: 'splotch', rot: Math.random() * TAU, vr: 0, under: true });
    if (color === PALETTE.mint) for (let i = 0; i < 4; i++) { const a = Math.random() * TAU; this._p({ x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 90, g: 420, drag: 1, life: 0.6, max: 0.6, color: PALETTE.choc, size: 2.2, shape: 'chip', rot: Math.random() * TAU, vr: 8 }); }
  }
  /** Big warm thaw celebration: sun ring, sparkles, petals. */
  thaw(x, y, radius = 60) {
    this.ringPulse(x, y, PALETTE.sun, radius * 1.6, 0.7);
    this.sparkle(x, y - 10, PALETTE.sun, 14, radius * 0.6);
    const cols = ['#e98aa8', PALETTE.sun, PALETTE.paper, PALETTE.mint, PALETTE.sunDeep];
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * TAU, v = 60 + Math.random() * 120;
      const life = 0.8 + Math.random() * 0.6;
      this._p({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 60, drag: 2.2, life, max: life, color: cols[i % cols.length], size: 3 + Math.random() * 2, shape: 'petal', rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8 });
    }
  }
  /** Expanding ring (shout, ground pound, swap). */
  ringPulse(x, y, color = PALETTE.paper, radius = 60, life = 0.45, width = 4) {
    this.rings.push({ x, y, color, r: radius, life, max: life, width });
  }
  /** Confetti shower (victory). */
  confetti(x, y, count = 40) {
    const cols = [PALETTE.sun, PALETTE.mint, '#e98aa8', PALETTE.sky, PALETTE.paper, PALETTE.sunDeep];
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, v = 160 + Math.random() * 220;
      const life = 1.2 + Math.random() * 0.8;
      this._p({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 260, drag: 1.6, life, max: life, color: cols[i % cols.length], size: 3 + Math.random() * 2, shape: 'confetti', rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 16 });
    }
  }
  /** Tag-team swap puff (call at the hero's feet). */
  swapPuff(x, y, color = PALETTE.sun) {
    this.snowPuff(x, y, 12, PALETTE.paper);
    this.ringPulse(x, y - 20, color, 44, 0.35, 3);
    this.sparkle(x, y - 30, color, 6, 20);
  }
  /** Brief freeze-frame feel: render-time shake bump (update() keeps running). */
  hitStop(strength = 4) { this.addShake(strength); }

  /** Floating text (damage numbers, "+3 scoops"). o: { size?, big?, drift? } */
  floatText(x, y, text, color = '#fff', o = {}) {
    const str = String(text);
    const numeric = /^[-+]?\d+$/.test(str);
    const size = o.size ?? (o.big ? 26 : numeric ? 16 : 14);
    this.texts.push({ x: x + (numeric ? (Math.random() - 0.5) * 8 : 0), y, text: str, color, life: numeric ? 0.8 : 1.15, max: numeric ? 0.8 : 1.15, size, vx: o.drift ?? (numeric ? (Math.random() - 0.5) * 30 : 0), vy: numeric ? -70 : -38 });
    if (this.texts.length > 60) this.texts.shift();
  }
  /** Screen shake amount in px; read fx.shakeOffset() when building the camera transform. */
  addShake(px) { this.shake = Math.max(this.shake, px); this.trauma = Math.min(1, this.trauma + px / 16); }
  shakeOffset() {
    const s = this.shake;
    if (s <= 0.05) return { x: 0, y: 0 };
    // smooth-ish noise rather than pure jitter
    const t = this.t * 38;
    return { x: (Math.sin(t * 1.3) * 0.6 + Math.sin(t * 2.7 + 1.1) * 0.4) * s * 0.6, y: (Math.sin(t * 1.7 + 2.3) * 0.6 + Math.sin(t * 3.1) * 0.4) * s * 0.6 };
  }
  update(dt) {
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt * Math.max(18, this.shake * 6));
    this.trauma = Math.max(0, this.trauma - dt * 1.5);
    for (const p of this.parts) {
      if (p.delay > 0) { p.delay -= dt; continue; }
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k; p.vy = p.vy * k + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= dt;
      if (p.grow) p.size += p.grow * dt;
    }
    for (const t of this.texts) { t.x += t.vx * dt; t.y += t.vy * dt; t.vy *= Math.max(0, 1 - 2.2 * dt); t.vx *= Math.max(0, 1 - 3 * dt); t.life -= dt; }
    for (const r of this.rings) r.life -= dt;
    this.parts = this.parts.filter((p) => p.life > 0);
    this.texts = this.texts.filter((t) => t.life > 0);
    this.rings = this.rings.filter((r) => r.life > 0);
  }
  render(ctx) {
    ctx.save();
    // ground-level splotches first
    for (const p of this.parts) if (p.under) {
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.5) * 0.6;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 1.3, p.size * 0.5, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 5; i++) { const a = p.rot + i * 1.3; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * p.size * 1.4, p.y + Math.sin(a) * p.size * 0.55, 2, 0, TAU); ctx.fill(); }
    }
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = r.color; ctx.lineWidth = r.width * (1 - k) + 1;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * (0.2 + 0.8 * easeOut(k)), r.r * 0.6 * (0.2 + 0.8 * easeOut(k)), 0, 0, TAU); ctx.stroke();
    }
    for (const p of this.parts) {
      if (p.under || p.delay > 0) continue;
      const f = p.life / p.max;
      ctx.globalAlpha = Math.min(1, f * 2);
      ctx.fillStyle = p.color;
      const s = p.shape === 'puff' ? p.size : p.size * (0.5 + 0.5 * f);
      switch (p.shape) {
        case 'star': {
          const tw = s * (0.6 + 0.4 * Math.sin((1 - f) * 18));
          ctx.beginPath(); ctx.moveTo(p.x, p.y - tw * 1.6); ctx.lineTo(p.x + tw * 0.35, p.y); ctx.lineTo(p.x, p.y + tw * 1.6); ctx.lineTo(p.x - tw * 0.35, p.y); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(p.x - tw * 1.6, p.y); ctx.lineTo(p.x, p.y + tw * 0.35); ctx.lineTo(p.x + tw * 1.6, p.y); ctx.lineTo(p.x, p.y - tw * 0.35); ctx.closePath(); ctx.fill();
          break;
        }
        case 'flake': {
          ctx.strokeStyle = p.color; ctx.lineWidth = 1.1;
          ctx.beginPath();
          for (let i = 0; i < 3; i++) { const a = p.rot + i * Math.PI / 3; ctx.moveTo(p.x - Math.cos(a) * s * 1.3, p.y - Math.sin(a) * s * 1.3); ctx.lineTo(p.x + Math.cos(a) * s * 1.3, p.y + Math.sin(a) * s * 1.3); }
          ctx.stroke();
          break;
        }
        case 'puff': {
          ctx.globalAlpha = f * 0.7;
          ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill();
          break;
        }
        case 'drop': {
          ctx.beginPath(); ctx.ellipse(p.x, p.y, s * 0.8, s * 1.15, Math.atan2(p.vy, p.vx) + Math.PI / 2, 0, TAU); ctx.fill();
          break;
        }
        case 'chip': case 'confetti': {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          if (p.shape === 'confetti') ctx.scale(1, Math.abs(Math.sin(p.rot * 1.7)) + 0.2);
          ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
          ctx.restore();
          break;
        }
        case 'petal': {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.5, 0, 0, TAU); ctx.fill();
          ctx.restore();
          break;
        }
        default: {
          ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill();
        }
      }
    }
    // floating text with a pop
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const t of this.texts) {
      const age = t.max - t.life;
      const pop = age < 0.12 ? 0.4 + (age / 0.12) * 0.9 : age < 0.22 ? 1.3 - ((age - 0.12) / 0.1) * 0.3 : 1;
      ctx.globalAlpha = Math.min(1, t.life * 3);
      ctx.font = `bold ${Math.round(t.size * pop)}px "Trebuchet MS", system-ui, sans-serif`;
      ctx.strokeStyle = 'rgba(16,19,31,0.85)'; ctx.lineWidth = 4;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }
}
function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
