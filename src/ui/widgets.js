// UI CONTRACT — Owned by: art/ui/audio team. Signatures FROZEN (panel, text, button, bar).
// Shared immediate-mode widgets so every screen looks like the same game.
// Extra exports (optional to use): wrapText, ring, chip, keycap, drawScoopIcon, drawSunIcon, uiTime.
import { PALETTE, FONT } from '../core/theme.js';
import { playSfx } from '../audio/sfx.js';

const TAU = Math.PI * 2;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

const STYLES = {
  dark: { top: 'rgba(36,43,70,0.94)', bot: 'rgba(16,19,31,0.94)', stroke: PALETTE.sun, inner: 'rgba(255,246,229,0.10)' },
  paper: { top: '#fffaf0', bot: '#f6e7c8', stroke: PALETTE.sunDeep, inner: 'rgba(255,255,255,0.6)' },
  ice: { top: 'rgba(60,96,140,0.94)', bot: 'rgba(27,34,56,0.94)', stroke: PALETTE.frost, inner: 'rgba(232,248,255,0.18)' },
  mint: { top: 'rgba(40,96,72,0.94)', bot: 'rgba(16,40,31,0.94)', stroke: PALETTE.mint, inner: 'rgba(232,255,240,0.15)' },
};

/**
 * Rounded panel. o: { fill?, stroke?, radius?, style?: 'dark'|'paper'|'ice'|'mint', shadow?: bool (default true),
 *   lineWidth?, alpha? }
 */
export function panel(ctx, x, y, w, h, o = {}) {
  const st = STYLES[o.style] ?? STYLES.dark;
  const r = o.radius ?? 12;
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.shadow !== false) {
    ctx.fillStyle = 'rgba(8,10,18,0.35)';
    rr(ctx, x + 2, y + 4, w, h, r); ctx.fill();
  }
  if (o.fill) ctx.fillStyle = o.fill;
  else { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, st.top); g.addColorStop(1, st.bot); ctx.fillStyle = g; }
  rr(ctx, x, y, w, h, r); ctx.fill();
  // inner highlight
  ctx.strokeStyle = st.inner; ctx.lineWidth = 1;
  rr(ctx, x + 3, y + 3, w - 6, h - 6, Math.max(2, r - 3)); ctx.stroke();
  ctx.strokeStyle = o.stroke ?? st.stroke; ctx.lineWidth = o.lineWidth ?? 2;
  rr(ctx, x, y, w, h, r); ctx.stroke();
  ctx.restore();
}

/**
 * Text with sane defaults. align: 'left'|'center'|'right'.
 * o: { font?, color?, align?, baseline?, shadow?: false, outline?: color (thick stroke behind), maxWidth?, alpha? }
 */
export function text(ctx, str, x, y, o = {}) {
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.font = o.font ?? FONT.ui;
  ctx.fillStyle = o.color ?? PALETTE.paper;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = o.baseline ?? 'alphabetic';
  const s = String(str ?? '');
  if (o.outline) {
    ctx.lineJoin = 'round'; ctx.strokeStyle = o.outline; ctx.lineWidth = o.outlineWidth ?? 4;
    ctx.strokeText(s, x, y, o.maxWidth);
  }
  if (o.shadow !== false && !o.outline) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowOffsetY = 2; ctx.shadowBlur = 2; }
  if (o.maxWidth) ctx.fillText(s, x, y, o.maxWidth); else ctx.fillText(s, x, y);
  ctx.restore();
}

/** Word-wrap str to lines no wider than maxW for the given font. Returns string[]. */
export function wrapText(ctx, str, maxW, font = FONT.ui) {
  ctx.save(); ctx.font = font;
  const out = [];
  for (const para of String(str ?? '').split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; } else line = test;
    }
    out.push(line);
  }
  ctx.restore();
  return out;
}

// hover animation memory for immediate-mode buttons
const hoverAnim = new Map();
export function uiTime() { return performance.now() / 1000; }

/**
 * Immediate-mode button. Returns true on the frame it is clicked.
 * Pattern: in update: if (button(null, game, ...)) doThing();  in render: button(ctx, game, ...)
 * (ctx null = hit-test only, no drawing)
 * o: { disabled?, font?, primary?: bool (gold call-to-action), style?: 'dark'|'ice'|'mint', hotkey?: string (shown as a keycap),
 *      selected?: bool (keyboard focus ring), sub?: string (small second line) }
 */
export function button(ctx, game, label, x, y, w, h, o = {}) {
  const m = game.input.mouse;
  const hover = m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
  if (ctx) {
    const key = `${label}|${x | 0}|${y | 0}`;
    const now = uiTime();
    const prev = hoverAnim.get(key) ?? { a: 0, t: now };
    const dt = Math.min(0.05, Math.max(0, now - prev.t));
    let a = prev.a;
    a += ((hover && !o.disabled) || o.selected ? 1 : -1) * dt * 10;
    a = Math.max(0, Math.min(1, a));
    hoverAnim.set(key, { a, t: now });
    if (hoverAnim.size > 200) hoverAnim.delete(hoverAnim.keys().next().value);
    const press = hover && m.down && !o.disabled ? 1 : 0;
    const lift = a * 2 - press * 2;
    ctx.save();
    const r = Math.min(14, h / 2);
    // shadow
    ctx.fillStyle = 'rgba(8,10,18,0.4)'; rr(ctx, x + 1, y + 4, w, h, r); ctx.fill();
    let top, bot, stroke, color;
    if (o.disabled) { top = 'rgba(60,64,80,0.9)'; bot = 'rgba(40,44,58,0.9)'; stroke = '#6a6f80'; color = '#9a9fae'; }
    else if (o.primary) { top = mixHex(PALETTE.sun, '#fff3c4', a * 0.5); bot = PALETTE.sunDeep; stroke = '#fff3c4'; color = PALETTE.ink; }
    else {
      const st = STYLES[o.style] ?? STYLES.dark;
      top = a > 0 ? mixHex('#2a3356', '#c97a22', a) : st.top; bot = a > 0 ? mixHex('#141828', '#8a4a12', a) : st.bot;
      stroke = st.stroke; color = PALETTE.paper;
    }
    const yy = y - lift;
    const g = ctx.createLinearGradient(0, yy, 0, yy + h); g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; rr(ctx, x, yy, w, h, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, x + 3, yy + 2, w - 6, h * 0.42, Math.max(2, r - 3)); ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2 + a * 0.5; rr(ctx, x, yy, w, h, r); ctx.stroke();
    if (o.selected) { ctx.strokeStyle = 'rgba(255,246,229,0.8)'; ctx.setLineDash([4, 3]); rr(ctx, x - 4, yy - 4, w + 8, h + 8, r + 3); ctx.stroke(); ctx.setLineDash([]); }
    const cy = yy + h / 2 + 1 - (o.sub ? 7 : 0);
    text(ctx, label, x + w / 2, cy, { align: 'center', baseline: 'middle', color, font: o.font ?? (o.primary ? 'bold 17px "Trebuchet MS", system-ui, sans-serif' : FONT.ui), shadow: !o.primary, maxWidth: w - 16 });
    if (o.sub) text(ctx, o.sub, x + w / 2, cy + 16, { align: 'center', baseline: 'middle', color: o.primary ? PALETTE.choc : 'rgba(255,246,229,0.7)', font: FONT.small, shadow: false, maxWidth: w - 12 });
    if (o.hotkey) keycap(ctx, o.hotkey, x + w - 14, yy + h / 2, { small: true });
    ctx.restore();
  }
  const clicked = !ctx && !o.disabled && hover && m.pressed;
  if (clicked) playSfx('click');
  return clicked;
}

/** Horizontal bar (HP, cooldown, progress). frac 0..1. Optional 9th arg o: { ghost?: 0..1 (trailing damage), radius?, border? } */
export function bar(ctx, x, y, w, h, frac, color = PALETTE.heal, back = 'rgba(0,0,0,0.5)', o = {}) {
  const f = Math.max(0, Math.min(1, frac || 0));
  const r = o.radius ?? Math.min(h / 2, 6);
  ctx.save();
  ctx.fillStyle = back; rr(ctx, x, y, w, h, r); ctx.fill();
  if (o.ghost != null && o.ghost > f) {
    ctx.fillStyle = 'rgba(255,246,229,0.75)';
    rr(ctx, x, y, w * Math.min(1, o.ghost), h, r); ctx.fill();
  }
  if (f > 0) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, mixHex(color, '#ffffff', 0.3)); g.addColorStop(0.55, color); g.addColorStop(1, mixHex(color, '#000000', 0.2));
    ctx.fillStyle = g; rr(ctx, x, y, Math.max(r * 2 * Math.min(1, f * 6), w * f), h, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + r, y + 1, Math.max(0, w * f - r * 2), Math.max(1, h * 0.25));
  }
  if (o.border !== false) { ctx.strokeStyle = 'rgba(16,19,31,0.85)'; ctx.lineWidth = 1.5; rr(ctx, x, y, w, h, r); ctx.stroke(); }
  ctx.restore();
}

/** Circular cooldown ring/pie. remaining 0..1 (1 = just used). Draws a ready glow at 0. */
export function ring(ctx, x, y, r, remaining, o = {}) {
  const rem = Math.max(0, Math.min(1, remaining || 0));
  ctx.save();
  ctx.fillStyle = o.back ?? 'rgba(16,19,31,0.75)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  if (rem > 0) {
    ctx.fillStyle = 'rgba(8,10,18,0.6)';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * rem); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = o.color ?? PALETTE.sun; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r - 1.5, -Math.PI / 2 + TAU * rem, -Math.PI / 2 + TAU); ctx.stroke();
  } else {
    const p = 0.5 + 0.5 * Math.sin(uiTime() * 5);
    ctx.strokeStyle = o.color ?? PALETTE.sun; ctx.lineWidth = 2.5 + p;
    ctx.beginPath(); ctx.arc(x, y, r - 1, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

/** Small rounded label chip (e.g. "x3", "NEW"). */
export function chip(ctx, str, x, y, o = {}) {
  ctx.save();
  ctx.font = o.font ?? 'bold 12px "Trebuchet MS", sans-serif';
  const w = ctx.measureText(str).width + 12, h = 18;
  const xx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  ctx.fillStyle = o.fill ?? PALETTE.sun; rr(ctx, xx, y - h / 2, w, h, 9); ctx.fill();
  ctx.fillStyle = o.color ?? PALETTE.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(str, xx + w / 2, y + 1);
  ctx.restore();
  return w;
}

/** Keyboard keycap glyph centered at (x, y). */
export function keycap(ctx, str, x, y, o = {}) {
  ctx.save();
  ctx.font = o.small ? 'bold 10px "Trebuchet MS", sans-serif' : 'bold 12px "Trebuchet MS", sans-serif';
  const w = Math.max(o.small ? 16 : 20, ctx.measureText(str).width + 8), h = o.small ? 16 : 20;
  ctx.fillStyle = '#c9c2b2'; rr(ctx, x - w / 2, y - h / 2 + 2, w, h, 4); ctx.fill();
  ctx.fillStyle = PALETTE.paper; rr(ctx, x - w / 2, y - h / 2, w, h - 1, 4); ctx.fill();
  ctx.fillStyle = PALETTE.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
  ctx.restore();
  return w;
}

/** Tiny mint-chip scoop icon (currency). */
export function drawScoopIcon(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#d9a35e'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.lineTo(0, 12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#a8743a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-3, 1); ctx.lineTo(2, 9); ctx.moveTo(3, 1); ctx.lineTo(-2, 9); ctx.stroke();
  ctx.fillStyle = PALETTE.mint; ctx.beginPath(); ctx.arc(0, -3, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = PALETTE.choc; ctx.fillRect(-3, -6, 1.8, 1.8); ctx.fillRect(2, -4, 1.8, 1.8); ctx.fillRect(-1, -1, 1.8, 1.8);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-2.5, -6, 1.8, 0, TAU); ctx.fill();
  ctx.restore();
}
/** Tiny sun icon (sunshine resource). */
export function drawSunIcon(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = PALETTE.sunDeep;
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.25) * 6, Math.sin(a - 0.25) * 6); ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(Math.cos(a + 0.25) * 6, Math.sin(a + 0.25) * 6); ctx.fill(); }
  ctx.fillStyle = PALETTE.sun; ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, TAU); ctx.fill();
  ctx.restore();
}

function mixHex(a, b, k) {
  const p = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
}
