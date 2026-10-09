// ART-WORLD public API: room interiors, furniture, v2 enemies. Owned by: art-world.
// Wired into the game by the art team's src/art/sprites.js facade. See docs/teams/art-world.md.
// Consumers must handle `false` returns (draw their own fallback) and check ROOM_KINDS.
// Furniture: drawFurniture(ctx, game, kind, x, y, {t, weird, seed, room, flip, lit, alpha, scale}) -> boolean
// (x, y) = FRONT-CENTRE ground point; footprint [x-w/2, x+w/2] x [y-h, y]; FURNITURE_SIZE[kind] = {w, h (floor depth), vh (visual height), solid?}.
export { FURNITURE_KINDS, FURNITURE_SIZE, FURNITURE_ALIASES, drawFurniture } from './furniture.js';

// Rooms: drawRoom(ctx, game, roomId, camX, camY, w, h, {weird, t, arenaW, arenaH, wallH}) -> boolean
// drawWater(ctx, game, x, y, rx, ry, {t, weird}) for action's arena.water ellipses.
// drawStringLights(ctx, game, x1, y1, x2, y2, {t, lit 0..1, sag}) strands between light posts.
export { drawRoom, drawWater, drawStringLights, ROOM_KINDS, WALL_H, SIDE, FRONT, roomGeometry } from './rooms.js';

// Enemies: drawWorldEnemy(ctx, game, type, x, y, {facing, t, flash, anim, progress, phase, hpFrac, scale, seed, alpha, hpBar})
export { WORLD_ENEMY_KINDS, drawWorldEnemy } from './enemies.js';

// Office gross-out (goo.js): drawGooSplat(ctx, game, x, y, {type, seed, r, age, ang, alpha}) floor splat decal;
// drawGooPiece(ctx, game, x, y, {type, piece:'shell'|'leg'|'wing'|'plug', rot, z, seed, alpha}) flung bits;
// drawGooDrip(ctx, game, x, y, {type, seed, r, alpha}) ooze drop; drawGooSpurt(ctx, game, x, y, {type, k, ang}) hit spurt;
// drawSlime(ctx, game, x, y, r, {t, seed, warn, grow, life}) oozing floor slime. GOO_COLORS[type] = {goo, deep, hi, ...}.
export { drawGooSplat, drawGooPiece, drawGooDrip, drawGooSpurt, drawSlime, GOO_COLORS } from './goo.js';
