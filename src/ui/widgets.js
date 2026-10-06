// UI CONTRACT — Owned by: art/ui/audio team. Signatures FROZEN; internals placeholder.
// Shared immediate-mode widgets so every screen looks like the same game.
import { PALETTE, FONT } from '../core/theme.js';
import { playSfx } from '../audio/sfx.js';

/** Rounded panel. */
export function panel(ctx, x, y, w, h, o = {}) {
  ctx.save();
  ctx.fillStyle = o.fill ?? 'rgba(16,19,31,0.85)';
  ctx.strokeStyle = o.stroke ?? PALETTE.sun;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, o.radius ?? 10); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/** Text with sane defaults. align: 'left'|'center'|'right'. */
export function text(ctx, str, x, y, o = {}) {
  ctx.save();
  ctx.font = o.font ?? FONT.ui;
  ctx.fillStyle = o.color ?? PALETTE.paper;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = o.baseline ?? 'alphabetic';
  if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowOffsetY = 2; }
  ctx.fillText(str, x, y);
  ctx.restore();
}

/**
 * Immediate-mode button. Returns true on the frame it is clicked.
 * Call from render() is fine for drawing, but call from update() to get the click reliably:
 * pattern: in update: if (button(null, game, ...)) doThing();  in render: button(ctx, game, ...)
 * (ctx null = hit-test only, no drawing)
 */
export function button(ctx, game, label, x, y, w, h, o = {}) {
  const m = game.input.mouse;
  const hover = m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
  if (ctx) {
    panel(ctx, x, y, w, h, { fill: o.disabled ? '#333a' : hover ? PALETTE.sunDeep : 'rgba(16,19,31,0.85)', stroke: o.disabled ? '#666' : PALETTE.sun });
    text(ctx, label, x + w / 2, y + h / 2 + 1, { align: 'center', baseline: 'middle', color: o.disabled ? '#999' : PALETTE.paper, font: o.font });
  }
  const clicked = !ctx && !o.disabled && hover && m.pressed;
  if (clicked) playSfx('click');
  return clicked;
}

/** Horizontal bar (HP, cooldown, progress). frac 0..1 */
export function bar(ctx, x, y, w, h, frac, color = PALETTE.heal, back = 'rgba(0,0,0,0.5)') {
  ctx.fillStyle = back; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}
