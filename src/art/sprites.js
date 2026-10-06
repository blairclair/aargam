// ART CONTRACT — Owned by: art/ui/audio team. Signatures are FROZEN (supervisor approval to change);
// internals are a placeholder for the art team to replace.
// Coordinates: (x, y) is the entity's FEET / ground point in world or screen space; the caller
// has already applied any camera transform.
import { HEROES, PALETTE } from '../core/theme.js';

/**
 * Draw a hero. Heroes are "big-head" chibis: the photo portrait is the head.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../core/engine.js').Game} game  (for assets/time)
 * @param {'aaron'|'victoria'} id
 * @param {number} x @param {number} y
 * @param {{facing?: number, anim?: 'idle'|'walk'|'attack'|'dash'|'hurt'|'down', t?: number, flash?: number, scale?: number, alpha?: number}} [o]
 */
export function drawHero(ctx, game, id, x, y, o = {}) {
  const h = HEROES[id];
  const s = o.scale ?? 1;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = h.look.pants; ctx.fillRect(-8, -16, 16, 16);
  ctx.fillStyle = h.look.jacket ?? h.look.shirt; ctx.fillRect(-10, -32, 20, 18);
  drawPortrait(ctx, game, id, 0, -46, 16);
  if (o.flash > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-20, -64, 40, 64); }
  ctx.restore();
}

/**
 * Draw an enemy from the Sorbet Syndicate (ids in theme.ENEMIES).
 * @param {{facing?: number, t?: number, flash?: number, hpFrac?: number, scale?: number}} [o]
 */
export function drawEnemy(ctx, game, type, x, y, o = {}) {
  const r = { frostling: 10, brainfreezer: 12, popsicle_knight: 14, slush_golem: 24, baron_brrr: 34 }[type] ?? 12;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = o.flash > 0 ? '#fff' : PALETTE.frost;
  ctx.strokeStyle = PALETTE.frostDeep; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, -r, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/** Circular photo portrait centered at (x, y) with radius r. Used by HUD, dialog, sprites. */
export function drawPortrait(ctx, game, id, x, y, r, o = {}) {
  const img = game.assets.image(HEROES[id].portrait);
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath();
  ctx.fillStyle = HEROES[id].look.skin; ctx.fill();
  if (img) { ctx.clip(); ctx.drawImage(img, x - r, y - r, r * 2, r * 2); }
  ctx.restore();
  ctx.save();
  ctx.lineWidth = o.border ?? 2; ctx.strokeStyle = o.borderColor ?? PALETTE.ink;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** Fill the visible area of a region's ground. (camX, camY) is the top-left world coord visible. */
export function drawGround(ctx, game, region, camX, camY, w, h) {
  const colors = { lakeside: '#d8c79a', oldcity: '#b8675a', summit: '#7aa36b' };
  ctx.fillStyle = colors[region] ?? '#888';
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draw a prop/obstacle. kinds: 'tree','rock','table','umbrella','lamp','bollard','flowerbox',
 * 'door','icewall','iceblock','cart','pavilion','pine','bench','barrel'.
 * (x, y) = base point. Props are drawn y-sorted by the caller along with entities.
 */
export function drawProp(ctx, game, kind, x, y, o = {}) {
  ctx.save();
  ctx.fillStyle = kind === 'iceblock' || kind === 'icewall' ? PALETTE.ice : '#555';
  ctx.fillRect(x - 12, y - 24, 24, 24);
  ctx.restore();
}

/** Projectile (scoop, slush ball, etc). kinds: 'mintscoop','slush','icicle','shout'. */
export function drawProjectile(ctx, game, kind, x, y, o = {}) {
  ctx.fillStyle = kind === 'mintscoop' ? PALETTE.mint : PALETTE.frost;
  ctx.beginPath(); ctx.arc(x, y, o.r ?? 6, 0, Math.PI * 2); ctx.fill();
}
