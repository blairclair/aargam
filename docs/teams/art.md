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
