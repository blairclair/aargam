// ART-WORLD public API: room interiors, furniture, v2 enemies. Owned by: art-world.
// Wired into the game by the art team's src/art/sprites.js facade. See docs/teams/art-world.md.
// STUB (v0): signatures are final; real art lands in follow-up ships. Consumers must handle
// `false` returns (draw their own fallback) and empty kind lists.
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

/** Footprint per furniture kind: { w, h } in world px (filled in as furniture ships). */
export const FURNITURE_SIZE = {};
export const FURNITURE_KINDS = [];

/** Draw furniture at base point (x, y). Returns false for unknown kinds (all kinds, for now). */
export function drawFurniture(ctx, game, kind, x, y, o = {}) { return false; }

// Enemies: drawWorldEnemy(ctx, game, type, x, y, {facing, t, flash, anim, progress, phase, hpFrac, scale, seed, alpha, hpBar})
export { WORLD_ENEMY_KINDS, drawWorldEnemy } from './enemies.js';
