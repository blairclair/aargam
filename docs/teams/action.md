# Action team — room action stages

Scene `room` (`src/action/room.js`). Input: `RoomParams {roomId, hero, loadout, attempt}`. Output: `finishAction(game,
{roomId, hero, victory, hpFrac, timeSec, enemiesDefeated})`. A defeat (or "Give up" in pause) also goes through finishAction.

## Files
| file | what |
|---|---|
| `room.js` | scene: stage card → play → victory beat / defeat → finishAction; camera, HUD, prompts, barks, pause |
| `heroes.js` | the one hero on the field (round-1 movement/aim/knockback, unchanged), input → skills |
| `skills.js` | `SKILL_DEF[id] = {cd, tut, cast, tick?}` for every id in theme.SKILLS; Boundaries ring; drum beat |
| `enemies.js` | v2 roster: shapes + one behavior per `role` |
| `bosses.js` | Roomba Tank, Sock Monster, Grill Dragon (2 phases each), PartyPlanner.exe (3 phases) |
| `stages.js` | 9 stages: layout (furniture), waves/script, objective text + progress, done(); difficulty by unlock depth |
| `combat.js` | damage, projectiles, shockwaves, telegraphs, ground zones, heart pickups |
| `arena.js` | furniture boxes + collision (circle vs box), spawn points |
| `draw.js` | gameplay overlays + fallbacks for anything art hasn't drawn yet |

## Rules the stages follow
- Hero stats come from `game.state.party[hero]` only (hub folds stat perks in; action applies no perks itself).
- Favored hero (`ROOMS[id].favored`) deals ×1.15 damage (shown on the stage card + hero card).
- Skills: basic always (J / click, hold to repeat), `loadout[0]` on K/Shift/right-click, `loadout[1]` on E/L,
  the hero's ultimate on Space if it is in `state.skills[hero]`.
- Every big enemy attack is telegraphed (red shape). Red dashed/filled shapes on the floor mean danger — nothing else uses them.
- Difficulty: `scaling(roomId)` by depth (office 0 … pond 5): hp, damage, speed, aggression, telegraph length.

## Flags written (`state.flags`)
`action.tut.move` (office movement prompt), `action.tut.<skillId>` (first-time key prompt for each skill).

## Events emitted
`skill:used {id}`, `enemy:defeated {type, x, y}`.

## Furniture kinds (canonical names; art-world draws them, action falls back)
`(x, y)` = front-center ground point; footprint `[x-w/2, x+w/2] × [y-d, y]` (`FURNITURE_SIZE[kind] = {w, h=depth}` overrides).
desk (o.laptop), office_chair, bookshelf, server_rack, plant, counter, island, oven, fridge, starter_jar, sofa, armchair,
coffee_table, tv_stand, rug (deco), dining_table, sideboard, toy_box, block_tower, play_table, bed, nightstand, dresser,
laundry_basket, guest_bed, bathtub, sink, grill, hedge, tree, light_post (o.lit 0..1), patio_table, rock, reeds, lily_pad (deco).
drawProp options passed: `{seed, t, w, d, lit, flash, room, laptop}`.

## Feature detection (fallbacks until art lists the id)
- Room interior: `Sprites.ROOM_KINDS.includes(roomId)` → `Sprites.drawRoom` (translated so the playable floor is 0..arenaW × 0..arenaH).
- Furniture: `Sprites.PROP_KINDS.includes(kind)` → `Sprites.drawProp`.
- Enemies: `Sprites.ENEMY_KINDS.includes(type)` → `Sprites.drawEnemy(…, {facing, t, flash, hpFrac, anim, phase, state, scale, marked, hidden, alpha})`.
- Skill icons: `Sprites.drawSkillIcon(ctx, id, x, y, size, o)` if it exists.
- HUD: if `HUD_VERSION >= 2` is exported from `src/ui/hud.js`, action calls `drawHUD` with the v2 shape
  `{hero, hp, maxHp, basic:{id,cd,key}, skills:[{id,cd,key}], ultimate?:{id,cd,ready,key}, objective, progress, bossHp?:{name,frac,phases?}, favored}`;
  otherwise action draws its own hero card, skill bar, objective panel and boss bar.
- Projectile kinds drawn by action: baguette, pillow, ball, sock, yarn, wrench, toast, web, ember, code.

## Story
Barks from `src/story/lines.js` `bark(roomId, event, {hero})`: start, boss (first appearance of the room's headline enemy),
lowhp (once), hit (rare, on kills, 9s cooldown), win, lose. PartyPlanner lines show in a monospace terminal box.

## Dev
`?scene=room&roomId=kitchen&hero=victoria&loadout=hot_pan,unplug&dev=allskills`. `src/core/mission.js` is no longer used by action.
