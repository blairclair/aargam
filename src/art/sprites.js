// ART CONTRACT — Owned by: art/ui/audio team. Signatures are FROZEN (supervisor approval to change);
// internals are a placeholder for the art team to replace.
// Coordinates: (x, y) is the entity's FEET / ground point in world or screen space; the caller
// has already applied any camera transform.
import { drawHeroImpl, drawPortrait as drawPortraitImpl, drawDenimShield } from './heroes.js';
import { drawEnemyImpl, drawNPCImpl, ENEMY_KINDS } from './enemies.js';
import { drawGroundImpl, warmGround, groundKind } from './ground.js';
import { drawPropImpl, drawProjectileImpl } from './props.js';
export { drawDenimShield, warmGround, groundKind, ENEMY_KINDS };
export { PROP_KINDS, ZONE_KINDS, PICKUP_KINDS, drawZone, drawPickup, drawWeather, drawFrostOverlay } from './props.js';

/**
 * Draw a hero. Heroes are "big-head" chibis: the photo portrait is the head.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../core/engine.js').Game} game  (for assets/time)
 * @param {'aaron'|'victoria'} id
 * @param {number} x @param {number} y
 * @param {{facing?: number, anim?: 'idle'|'walk'|'attack'|'dash'|'hurt'|'down', t?: number, flash?: number, scale?: number, alpha?: number}} [o]
 */
export function drawHero(ctx, game, id, x, y, o = {}) { drawHeroImpl(ctx, game, id, x, y, o); }

/**
 * Draw an enemy from the Sorbet Syndicate (ids in theme.ENEMIES).
 * @param {{facing?: number, t?: number, flash?: number, hpFrac?: number, scale?: number}} [o]
 */
export function drawEnemy(ctx, game, type, x, y, o = {}) { drawEnemyImpl(ctx, game, type, x, y, o); }

/** Circular photo portrait centered at (x, y) with radius r. Used by HUD, dialog, sprites. */
export function drawPortrait(ctx, game, id, x, y, r, o = {}) { drawPortraitImpl(ctx, game, id, x, y, r, o); }

/** Fill the visible area of a region's ground. (camX, camY) is the top-left world coord visible. */
export function drawGround(ctx, game, region, camX, camY, w, h, o = {}) { drawGroundImpl(ctx, game, region, camX, camY, w, h, o); }

/**
 * Friendly NPC. kind: 'townsfolk'. o: { seed?, region?, frozen?: bool|0..1 (1 = in ice block),
 * freed?: 0..1 (happy jump/wave after thaw), anim?: 'idle'|'wave', facing?, t?, flash?, scale?, alpha? }
 */
export function drawNPC(ctx, game, kind, x, y, o = {}) { drawNPCImpl(ctx, game, kind, x, y, o); }

/**
 * Draw a prop/obstacle. kinds: 'tree','rock','table','umbrella','lamp','bollard','flowerbox',
 * 'door','icewall','iceblock','cart','pavilion','pine','bench','barrel'.
 * (x, y) = base point. Props are drawn y-sorted by the caller along with entities.
 */
export function drawProp(ctx, game, kind, x, y, o = {}) { drawPropImpl(ctx, game, kind, x, y, o); }

/**
 * Projectile. kinds: 'mintscoop','slush','icicle','shout' (+ 'snowball','shockwave').
 * o: { r?, angle? (radians) or vx?/vy? (adds a trail + orients icicles), t?, life? 0..1 (rings fade), alpha? }
 * 'shout'/'shockwave' are expanding rings: pass r = current radius.
 */
export function drawProjectile(ctx, game, kind, x, y, o = {}) { drawProjectileImpl(ctx, game, kind, x, y, o); }
