# Architecture & Contracts

Vanilla JS ES modules + Canvas 2D. **No build step and no dependencies.** Serve the repo root with any
static server (`python3 -m http.server 8000`) and open `http://localhost:8000/`.

## Layout & ownership (enforced by `OWNERS.json` + `tools/check.mjs`)

| Path | Team | What |
|---|---|---|
| `src/core/**`, `src/main.js`, `src/scenes.js`, `tools/**`, `docs/*.md` | **supervisor** | engine, input, state schema, contracts, theme |
| `src/action/**` | **action** | the `level` scene: heroes, enemies, combat, procedural arenas, mission kinds |
| `src/strategy/**` | **strategy** | the `overworld` + `camp` scenes: node map, frost spread, economy, upgrades, story progression |
| `src/art/**`, `src/ui/**`, `src/audio/**` | **presentation** | sprites, fx, HUD, dialog, widgets, title + ending scenes, sfx + music |

You may create any new files inside your own directories. You **may not** edit files outside
them. If you need a contract change, a new theme constant, or a new asset key, message the
supervisor.

## Engine (`src/core/engine.js`)
- Fixed 60 Hz `update(dt)`, variable `render(ctx)`. Logical resolution is **960×540**, and CSS scales the canvas.
- `game.switchScene(key, params)`: the scene keys are in `src/scenes.js`. Scenes are cached singletons, so
  **reset your per-run state in `enter()`**, not in the constructor.
- `game.input`: `down(action)`, `pressed(action)`, `axis()`, `mouse {x,y,down,pressed,rightPressed}`.
  The actions are listed in `BINDINGS` in `src/core/input.js`.
- `game.events`: pub/sub (`on`, `off`, `emit`).
- `game.assets.image(key)` may return undefined, so always handle that case.
- `game.state`: the persistent save (see below). `game.time` is seconds since boot.
- Dev deep-link: `index.html?scene=level&region=oldcity&kind=skirmish&difficulty=2&seed=7`
  launches straight into a scene. `window.__game` is exposed for the devtools console.
- A thrown error in a scene paints a red crash screen with the stack trace instead of failing silently.

## State (`src/core/state.js`)
```
{ version, day, resources:{scoops,sunshine},
  party:{ aaron:{level,xp,maxHp,hp,damage,speed,upgrades[]}, victoria:{...} },
  map: <strategy-owned>, camp: <strategy-owned>, flags:{ 'team.key': any }, stats:{...} }
```
- Strategy owns `map`, `camp`, and `resources`, and writes `party.*` upgrades and stats.
- Action **reads** `party` (maxHp, damage, speed, `upgrades[]` ids) at mission start and never writes
  `game.state` directly, except through `finishMission`.
- **Upgrade ids** are strings like `'aaron.dash_damage'` and `'victoria.triple_scoop'`. Strategy defines
  the shop and action interprets the ids. The two teams agree on the list in `docs/teams/upgrades.md`, which
  **strategy authors and action reviews** (message each other through the supervisor if you disagree).
  Unknown ids must be ignored safely.
- Call `saveGame(game.state)` after meaningful changes (strategy does this after missions and purchases).

## Mission handoff (`src/core/mission.js`)
- Strategy → action: `launchMission(game, MissionParams)`.
- Action → strategy: `finishMission(game, MissionOutcome)`, which switches to `overworld` with `{ outcome }`.
- Typedefs are in that file. Action must support every `kind` × `region` combination, difficulty 1–5, and must
  ignore unknown `modifiers`. Known modifiers so far: `blizzard` (more enemies, slow-moving snow
  overlay), `warm_cocoa` (+25% starting HP), `ally_scouts` (enemy positions shown at start).

## Presentation contracts (frozen signatures, internals are placeholders to replace)
- `src/art/sprites.js`: `drawHero`, `drawEnemy`, `drawPortrait`, `drawGround`, `drawProp`, `drawProjectile`.
  `(x,y)` is the feet/base point. The caller y-sorts and applies the camera.
- `src/art/fx.js`: the `Fx` class (`burst`, `floatText`, `addShake`, `shakeOffset`, `update`, `render`).
- `src/ui/hud.js`: `drawHUD(ctx, game, hud)`. See the JSDoc for the `hud` shape.
- `src/ui/dialog.js`: the `Dialog` class (`open(lines, onDone)`, `active`, `update`, `render`).
- `src/ui/widgets.js`: `panel`, `text`, `button`, `bar`. **All teams use these for UI** so the game
  looks consistent.
- `src/audio/sfx.js`: `initAudio`, `playSfx(name)`, `playMusic(name)`, `setVolume`. Names are in theme `SFX`/`MUSIC`.

Presentation may **add** new exports and optional fields freely. Changing or removing an existing
signature requires supervisor sign-off. Consumers must not rely on placeholder visuals.

## Events (game.events)
| name | payload | emitter |
|---|---|---|
| `scene:changed` | `{key, params}` | engine |
| `mission:launched` | MissionParams | core/mission |
| `mission:finished` | MissionOutcome | core/mission |
| `hero:swapped` | `{to}` | action |
| `enemy:defeated` | `{type,x,y}` | action |
| `node:thawed` | `{nodeId, region}` | strategy |
| `upgrade:bought` | `{id}` | strategy |

Add new events by appending to this table (ask the supervisor).
