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
