// ART CONTRACT — Owned by: art/ui/audio team. Signatures are FROZEN (supervisor approval to change);
// internals are a placeholder for the art team to replace.
// Coordinates: (x, y) is the entity's FEET / ground point in world or screen space; the caller
// has already applied any camera transform.
import { drawHeroImpl, drawPortrait as drawPortraitImpl, drawDenimShield, drawPlateShield, HERO_SCALE, HOLD_KINDS } from './heroes.js';
export { drawPlateShield, HERO_SCALE, HOLD_KINDS };
import { drawEnemyImpl, drawNPCImpl, ENEMY_KINDS as LEGACY_ENEMY_KINDS } from './enemies.js';
import { drawGroundImpl, warmGround, groundKind } from './ground.js';
import { drawPropImpl, drawProjectileImpl, PROP_KINDS as LEGACY_PROP_KINDS, ZONE_KINDS as LEGACY_ZONE_KINDS, drawZone as drawZoneLegacy } from './props.js';
import { drawSkillProjectile, drawSkillZone, PROJECTILE_KINDS_V2, ZONE_KINDS_V2 } from './skillfx.js';
import { drawWorldEnemy, drawFurniture, WORLD_ENEMY_KINDS, FURNITURE_KINDS } from './world/index.js';
export { drawDenimShield, warmGround, groundKind };
// Room interiors + furniture sizes come from art-world (src/art/world); re-exported here so everyone imports one module.
export { drawRoom, drawWater, drawStringLights, ROOM_KINDS, FURNITURE_KINDS, FURNITURE_SIZE, FURNITURE_ALIASES, WALL_H, roomGeometry } from './world/index.js';
// Office goo (bug splats, flung bits, floor slime) from art-world; options documented in src/art/world/index.js.
export { drawGooSplat, drawGooPiece, drawGooDrip, drawGooSpurt, drawSlime, GOO_COLORS } from './world/index.js';

/** Enemy type ids drawEnemy really draws (v2 roster from art-world + legacy). Anything else falls back. */
export const ENEMY_KINDS = [...new Set([...(WORLD_ENEMY_KINDS ?? []), ...LEGACY_ENEMY_KINDS])];
/** Prop kinds drawProp really draws (furniture from art-world + legacy outdoor props). */
export const PROP_KINDS = [...new Set([...(FURNITURE_KINDS ?? []), ...LEGACY_PROP_KINDS])];
import { drawBust as drawBustImpl } from './busts.js';
export { BUST_EXPRS, bustKey, drawCutoutHead } from './busts.js';
/** drawSkillIcon(ctx, skillId, x, y, size, o): round badge + glyph for every theme.SKILLS id. See docs/teams/art.md. */
export { drawSkillIcon, SKILL_ICON_IDS } from './icons.js';

/**
 * Big photo-cutout bust (real face + hair, no circle) for cutscenes, dialog, select.
 * (x, y) = bottom-centre; h = height. expr: 'smile'|'neutral'|'happy'|'surprised'|'annoyed'|'determined'
 * (+ 'worried','sheepish','sad','thinking'). See docs/teams/art.md for options.
 * Returns { faceX, faceY, top } screen coords.
 */
export function drawBust(ctx, game, hero, expr, x, y, h, o = {}) { return drawBustImpl(ctx, game, hero, expr, x, y, h, o); }
export { PICKUP_KINDS, drawPickup, drawWeather, drawFrostOverlay } from './props.js';

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
export function drawEnemy(ctx, game, type, x, y, o = {}) {
  if (drawWorldEnemy(ctx, game, type, x, y, o)) return;
  drawEnemyImpl(ctx, game, type, x, y, o);
}

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
export function drawProp(ctx, game, kind, x, y, o = {}) {
  if (drawFurniture(ctx, game, kind, x, y, o)) return;
  drawPropImpl(ctx, game, kind, x, y, o);
}

/**
 * Projectile. kinds: 'mintscoop','slush','icicle','shout' (+ 'snowball','shockwave').
 * o: { r?, angle? (radians) or vx?/vy? (adds a trail + orients icicles), t?, life? 0..1 (rings fade), alpha? }
 * 'shout'/'shockwave' are expanding rings: pass r = current radius.
 */
/** Projectile kinds drawProjectile really draws (v2 skill/enemy shots + legacy). */
export const PROJECTILE_KINDS = [...PROJECTILE_KINDS_V2, 'mintscoop', 'slush', 'snowball', 'icicle', 'shout', 'shockwave'];
/** Zone kinds drawZone really draws (v2 + legacy). */
export const ZONE_KINDS = [...ZONE_KINDS_V2, ...LEGACY_ZONE_KINDS];
/**
 * Ground-level area effect, drawn under entities. (x, y) centre, r radius (length for beams/cones).
 * v2 kinds: fire, net, puddle, web, boundaries, drumwave, hose, laser, steam, aggro, sizzle, mop, mark. See docs/teams/art.md.
 */
export function drawZone(ctx, game, kind, x, y, r, o = {}) {
  if (drawSkillZone(ctx, game, kind, x, y, r, o)) return;
  drawZoneLegacy(ctx, game, kind, x, y, r, o);
}
export function drawProjectile(ctx, game, kind, x, y, o = {}) {
  if (drawSkillProjectile(ctx, game, kind, x, y, o)) return;
  drawProjectileImpl(ctx, game, kind, x, y, o);
}
