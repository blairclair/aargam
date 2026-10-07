# Architecture & Contracts (v2 — Housewarming)

Vanilla JS ES modules + Canvas 2D. **No build step, no dependencies.** `python3 -m http.server 8000`.
Round 1 lives on the `first-pass` branch / `v0.1-first-pass` tag — read it for reference any time
(`git show first-pass:src/action/heroes.js`).

## Teams & ownership (enforced by `OWNERS.json` + `tools/check.mjs --team`)

| Team | Owns | Builds |
|---|---|---|
| **supervisor** | `src/core/**`, `src/main.js`, `src/scenes.js`, `src/minigames/{index,host}.js`, `tools/**`, `assets/**`, `docs/{DESIGN,ARCHITECTURE,WORKFLOW}.md` | engine, flow, state, theme, contracts |
| **story** | `src/story/**`, `src/audio/**`, `docs/STORY.md` | full script, cutscene player, title, party ending, all music + sfx |
| **hub** | `src/hub/**` | house floor-plan hub, unlock UX, hero+loadout select, results, Party Touch shop |
| **action** | `src/action/**` | room action stages: heroes, skills, enemies, 9 room arenas + objectives |
| **games-a** | `src/minigames/{office,kitchen,dining,living,playroom}.js`, `src/minigames/a/**` | Bug Hunt, Bread Bake, Pour the Drinks, Bunny Roundup, Card Duel |
| **games-b** | `src/minigames/{primary,guest,backyard,pond}.js`, `src/minigames/b/**` | Crochet Pattern, Pipe Fixer, Drumline, Final Patch |
| **art** | `src/art/**` (except `src/art/world/**`), `src/ui/**` | heroes, busts & portraits, skill icons, projectiles/zones, Fx, HUD, widgets, dialog; owns the `sprites.js` facade and wires in `art/world` |
| **art-world** | `src/art/world/**` | room interiors (`drawRoom`), furniture props, all v2 enemies (incl. PartyPlanner koi) — exported from `src/art/world/index.js` |

## Flow (`src/core/flow.js`) — the only way teams hand off to each other
```
title ─startNewGame─▶ cutscene 'opening' ─▶ hub
hub ─enterRoom(roomId)─▶ cutscene '<room>.intro' ─▶ select{roomId}
select ─launchRoom({roomId,hero,loadout})─▶ room
room ─finishAction(ActionResult)─▶ minigame{roomId,hero,attempt,perks}   (defeat → select{retry})
minigame ─finishMinigame(MinigameResult)─▶ results{roomId,stars,...}     (fail → minigame again)
results ─finishRoom(roomId,stars)─▶ cutscene '<room>.outro' [+ 'midgame' after 4th room, 'prefinale' after 8th] ─▶ hub
after pond: cutscene 'party' {partyScore 0..1, next: title}
```
Typedefs (RoomParams, ActionResult, MinigameParams, MinigameResult) are in `flow.js`. `finishRoom`
grants the room's skills (theme.ROOMS[id].skills), advances the clock, awards Party Points (10/new star),
and grants both ultimates at the 'prefinale' beat. Never call `game.switchScene` into another team's scene.

## Theme (`src/core/theme.js`) — canonical ids
`HEROES`, `SKILLS` (slot basic|skill|ultimate, hero, earnedIn), `ROOMS` (requires, favored, enemies,
skills, minigame, fn, weird, objective, accent), `ENEMIES` (v2 roster by room; `legacy: true` = round 1),
`SPEAKERS` (narrator, partyplanner [style 'terminal'], guest), `SFX`, `MUSIC`, `PALETTE`, `FONT`.
Legacy exports (REGIONS, MISSION_KINDS, …) exist only so round-1 code keeps running; don't use them.

## State (`src/core/state.js`, save key `aargam.save.v2`)
`{ clock, partyPoints, rooms{id:{done,stars,attempts,playedAs}}, skills{aaron[],victoria[]},
loadout{aaron[],victoria[]}, party{id:{maxHp,damage,speed}}, purchases[], flags{}, stats{} }`
- flow writes rooms/clock/partyPoints/skills. hub writes loadout/purchases/party. action reads party + loadout.
- `availableRooms(state, ROOMS)` = the unlock rule (ANY requirement done; '*' = all others).

## Engine
Fixed 60 Hz `update(dt)`, `render(ctx)` in 960×540. Scenes are cached singletons — **reset per-run
state in `enter()`**. `game.input` (`down/pressed/axis/mouse`; actions in `src/core/input.js`),
`game.events`, `game.assets.image(key)` (may be undefined), `game.state`, `game.time`.
A thrown error paints a crash screen and sets `game.crashed` (smoke test fails on it).

## Assets (`src/core/assets.js`)
`portrait.*` (round crops), `face.*` (tight face crops for small in-world heads),
**`bust.aaron.smile`, `bust.victoria.smile`, `bust.victoria.neutral`** (transparent photo cutouts — real
face + hair; use for cutscenes, dialog, select), `full.*` (full-body cutouts; body-proportion reference).
Never distort, recolor, or mirror-flip faces as a joke; never put them on enemies.

## Art contracts (`src/art/sprites.js`, `src/art/fx.js`, `src/ui/*`)
Existing signatures stay (drawHero, drawEnemy, drawPortrait, drawGround, drawProp, drawProjectile, drawNPC,
drawZone, drawPickup, drawWeather, drawFrostOverlay, Fx, drawHUD, Dialog, panel/text/button/bar…).
v2 additions are owned by art and documented in `docs/teams/art.md` as they ship, e.g.
`drawRoom(ctx, game, roomId, camX, camY, w, h, o)` (interior floor/walls), `drawBust(ctx, game, hero, expr, x, y, h, o)`,
`drawSkillIcon(ctx, skillId, x, y, size, o)`, new `drawEnemy` types (theme.ENEMIES v2), new `drawProp` kinds.
Until art ships something, consumers draw a simple fallback (check `typeof Sprites.drawRoom === 'function'`).
**HUD v2 shape**: `drawHUD(ctx, game, { hero, hp, maxHp, skills:[{id, cd /*0..1 remaining*/, key}], ultimate?:{id, cd, ready},
objective, progress?, bossHp?:{name, frac, phases?} })`. Art keeps accepting the legacy shape until action migrates.

## Dev deep links (`src/main.js`)
`?scene=room&roomId=kitchen&hero=victoria&loadout=hot_pan,unplug` · `?scene=minigame&roomId=dining&attempt=2` ·
`?scene=cutscene&id=kitchen.intro` · `?scene=hub&dev=unlock5` · `&dev=allskills` · `?scene=results&roomId=office&stars=3`.

## Events (game.events)
`scene:changed`, `room:launched`, `room:actionFinished`, `room:minigameFinished`, `room:finished` (core);
`enemy:defeated {type,x,y}`, `skill:used {id}` (action). Add new ones by asking the supervisor.
