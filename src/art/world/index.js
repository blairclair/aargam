// ART-WORLD public API: room interiors, furniture, v2 enemies. Owned by: art-world.
// Wired into the game by the art team's src/art/sprites.js facade. See docs/teams/art-world.md.
// Consumers must handle `false` returns (draw their own fallback) and check ROOM_KINDS.
import { ROOMS } from '../../core/theme.js';

/**
 * Fill the visible area of a room (floor + walls) in world space.
 * @param {CanvasRenderingContext2D} ctx  camera already applied (world coords)
 * @param {*} game
 * @param {string} roomId  theme.ROOM_IDS
 * @param {number} camX @param {number} camY  top-left world coordinate visible
 * @param {number} w @param {number} h  visible size
 * @param {{weird?: number, t?: number, arenaW?: number, arenaH?: number}} [o]
 */
export function drawRoom(ctx, game, roomId, camX, camY, w, h, o = {}) {
  ctx.fillStyle = '#2a2230';
  ctx.fillRect(camX, camY, w, h);
  const aw = o.arenaW ?? w, ah = o.arenaH ?? h;
  ctx.fillStyle = '#b98a5c';
  ctx.fillRect(0, 0, aw, ah);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = ROOMS[roomId]?.accent ?? '#c9a27a';
  ctx.fillRect(0, 0, aw, ah);
  ctx.restore();
}

// Furniture: drawFurniture(ctx, game, kind, x, y, {t, weird, seed, room, flip, lit, alpha, scale}) -> boolean
// (x, y) = FRONT-CENTRE ground point; footprint [x-w/2, x+w/2] x [y-h, y]; FURNITURE_SIZE[kind] = {w, h (floor depth), vh (visual height), solid?}.
export { FURNITURE_KINDS, FURNITURE_SIZE, FURNITURE_ALIASES, drawFurniture } from './furniture.js';

/** Room ids drawRoom renders for real (others: placeholder fill; use your own fallback). */
export const ROOM_KINDS = [];
/** Height of the back-wall face drawn above y = 0 (not playable). */
export const WALL_H = 120;
/** Per-room geometry for collision/AI. pond: central water ellipse {cx, cy, rx, ry} (world px). */
export function roomGeometry(roomId, arenaW, arenaH) {
  if (roomId === 'pond') return { wallH: WALL_H, water: { cx: arenaW / 2, cy: arenaH * 0.5, rx: arenaW * 0.34, ry: arenaH * 0.3 } };
  return { wallH: WALL_H };
}

// Enemies: drawWorldEnemy(ctx, game, type, x, y, {facing, t, flash, anim, progress, phase, hpFrac, scale, seed, alpha, hpBar})
export { WORLD_ENEMY_KINDS, drawWorldEnemy } from './enemies.js';
