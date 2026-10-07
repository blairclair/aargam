# Art team: exports, options, kinds

Everything is imported from `src/art/sprites.js` (characters, props, fx kinds) or `src/ui/*` (HUD, dialog, widgets).
Feature-detect new exports: `typeof Sprites.drawBust === 'function'`.
Faces are never distorted, recolored or mirrored. Expressions come only from motion and overlays.

## Busts: `drawBust(ctx, game, hero, expr, x, y, h, o)`
Big transparent photo cutouts (real face + hair, no circle), with a soft paper-colored outline and glow so they sit on any background.
- `(x, y)` is the **bottom-center**. The face's center-x sits on `x`. `h` is the total height in px. A good dialog size is 220–300.
- `expr`: `smile | neutral | happy | surprised | annoyed | determined`, plus `worried | sheepish | sad | thinking`. Unknown values fall back to smile.
  - Photos: Aaron only has `smile`. Victoria uses `smile` for smile/happy/sheepish and `neutral` (denim jacket and mint-chip cone) for everything else.
  - Motion and overlays: happy = bounce + sparkles · surprised = hop + "!" + motion lines · annoyed = shake + steam puff + anger mark ·
    determined = lean in + speed streaks + glint · worried/sheepish/sad = sweat drop · thinking = "..." dots.
- `o`:
  - `t`: seconds; drives idle breathing.
  - `exprT`: seconds since this expression started. Reset it on each new line so the "beat" (hop/shake) plays once.
  - `talking`: gentle talk-bob.
  - `dim`: 0..1 for the listener, which is darkened and slightly smaller.
  - `enter`: 0..1, slides and fades in.
  - `side`: 1 (left speaker) or -1 (right speaker). Sets the lean and slide direction. The face is never flipped.
  - `alpha`.
  - `rim`: outline color.
  - `fade`: bottom fade fraction, default 0.16.
  - `overlays`: false hides the overlays.
  - `bust`: `'smile'` or `'neutral'` forces a specific photo.
- Returns `{ faceX, faceY, top }` in screen coords (for bubbles and effects).
- Also exported: `BUST_EXPRS`, `bustKey(hero, expr)` (the image key used), and `drawCutoutHead(ctx, game, hero, x, y, h, o)`, which draws the in-world head with its chin at (x, y). It returns false if the image is missing.

## Kinds lists
- `ENEMY_KINDS`: the enemy ids `drawEnemy` really draws. Anything else falls back to the frostling, so draw your own fallback.
- `PROP_KINDS`, `ZONE_KINDS`, `PICKUP_KINDS`: same idea.

## Dialog v2: `new Dialog(game)` (`src/ui/dialog.js`, API unchanged)
- Lines are `{ who, text, expr?, mood?: 'shout', speed?, bust?: false }`. `expr` is any drawBust expression; the default is smile.
- Heroes appear as large cutout busts behind the text box: **Aaron on the left, Victoria on the right**. A hero who already spoke in this conversation stays on screen as a dimmed listener.
- `who: 'partyplanner'` (SPEAKERS style `terminal`) renders a green-on-black terminal window titled `PartyPlanner.exe — party.log`, with a `> ` prompt (added automatically unless the text already starts with `>`), a blinking block cursor, scanlines, and a short glitch when each line starts. It plays the `type` sfx.
- `narrator` draws the paper box (no busts). Other names draw a name plate only. Legacy `baron` and `townsfolk` speakers still work.
- `open(lines, onDone, { busts: false })` gives a compact version with no busts.

## Skill icons: `drawSkillIcon(ctx, skillId, x, y, size, o)`
A round badge with the hero-colored rim (gold double rim for ultimates) and a glyph, centered on (x, y). `size` is the diameter. Every `theme.SKILLS` id has one (`SKILL_ICON_IDS`).
`o`:
- `badge`: false draws the glyph only.
- `locked`: grey with a padlock.
- `dim`: desaturated, for cooldown.
- `ready`: pulsing gold glow.
- `alpha`, `t`.

## HUD v2: `drawHUD(ctx, game, hud)` + `HUD_VERSION = 2` (`src/ui/hud.js`)
v2 is detected by `hud.hero` (no `hud.heroes`). The legacy round-1 shape still works.
`{ hero, hp, maxHp, basic: {id, cd, key} | id, skills: [{id, cd /*0..1 remaining*/, key}], ultimate?: {id, cd, ready, key}, objective, progress?: 0..1, favored?: bool, bossHp?: {name, frac, phases?: n | number[] (hp fracs)} }`
- Top-left: hero card with the in-world cutout head, HP bar with trailing ghost, a low-HP pulse, and a "★ favored" chip.
- Bottom-left: skill bar. Each slot shows the icon, a cooldown pie and ring, and a keycap. A white ring flashes when a skill comes off cooldown. Missing slots show a dashed circle.
- Top-right: objective with a flag and a percentage progress bar.
- Bottom-center: boss bar with phase ticks and "phase n/m". PartyPlanner gets a green terminal styling.

## Heroes: `drawHero(ctx, game, id, x, y, o)` (signature unchanged)
- Heads are the real photo cutouts with the real hair silhouette (no circle) and a thin soft outline. They are never mirrored or recolored. If the image is missing, the old round crop with drawn hair is used.
- Bodies match the photos.
  - Aaron: tall and lean (long legs), heather-grey tee with faint stripes, dark shorts, white sneakers, fitness watch.
  - Victoria: light-wash denim jacket over a navy knit, mid-wash jeans with rolled cuffs, white sneakers, long hair continuing behind her shoulders, wrench in her back pocket.
- `HERO_SCALE = 1.2` multiplies every hero draw so faces read at room scale. Pass `o.rawScale: true` to skip it.
- `anim: 'attack'`: Aaron does a **karate kick** toward `o.facing`; Victoria does an overhand **wrench swing**. Both leave a swoosh.
- `o.hold`: one of `HOLD_KINDS` (`wrench, pan, baguette, mop, hose, drumsticks, plate, pillow, card, sock, yarn, ball, laptop`). Puts the item in the front hand; with `anim: 'attack'` it becomes an overhand swing with that item. `o.kick: false` turns off Aaron's kick.
- `o.shield` 0..1 with `o.shieldKind: 'plate'` draws the Plate Shield. The default is the round-1 denim shield. `drawPlateShield` is also exported.
- Other `o` fields as before: `facing, anim (idle|walk|attack|dash|hurt|down), progress, t, flash, scale, alpha`.

## Projectiles: `drawProjectile(ctx, game, kind, x, y, o)` and `PROJECTILE_KINDS`
v2 kinds, named to match action's `shot.kind`:
- **Skills:** `baguette`, `pillow`, `ball` (bouncy, hops), `sock` (`o.team: 'enemy'` makes it pink), `yarn` (thread trail), `wrench` (spinning boomerang), `card`, `drop`/`water`.
- **Enemies:** `toast`, `web`, `ember`, `code` (PartyPlanner glyph; `o.glyph`), `plate`, `steam`, `dough`, `lint`.
- **Aliases:** `bouncy_ball`, `throw_pillow`, `bread`.
- **Legacy (round 1):** `mintscoop`, `slush`, `snowball`, `icicle`, `shout`, `shockwave`.
- `o`: `vx/vy` or `angle` (direction and trail), `r`, `t`, `alpha`, `scale`.

## Zones: `drawZone(ctx, game, kind, x, y, r, o)` and `ZONE_KINDS`
Ground-level, drawn under entities. `r` is the radius, or the length for beams and cones.
- **Area zones:** `fire` (charcoal flames), `net`/`crochet_net`, `puddle`/`leak`, `web`, `boundaries`/`ring` (Victoria's ultimate), `drumwave` (`o.life`; `o.onBeat` makes it gold), `aggro` (Pull Aggro aura), `mop` (Mop Spin swirl), `mark` (Debug mark).
- **Directional (`o.angle`):** `hose` (`o.width`), `laser` (PartyPlanner; `o.width`), `steam` (kettle cone; `o.arc`), `sizzle` (Hot Pan arc; `o.arc`, `o.life`).
- **Legacy:** `bloom`, `telegraph`, `frostpatch`, `shield`.

## Facade re-exports from art-world (`src/art/world`)
`drawRoom, drawWater, drawStringLights, ROOM_KINDS, FURNITURE_KINDS, FURNITURE_SIZE, FURNITURE_ALIASES, WALL_H, roomGeometry`.
- `drawEnemy` tries `drawWorldEnemy` first; `drawProp` tries `drawFurniture` first.
- `ENEMY_KINDS` and `PROP_KINDS` are the merged lists.
