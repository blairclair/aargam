# games-a — Office, Kitchen, Dining, Living, Playroom minigames

All five follow the MINIGAME CONTRACT in `src/minigames/host.js` and end through
`finishMinigame(game, { roomId, success, score, attempt })`. Each one teaches itself in the first
seconds with an animated hand or arrow, a highlighted target and one short prompt.

## Shared helpers: `src/minigames/a/common.js`
- `normParams(p)` makes `perks` an array and `attempt` a number. `timeMul(p)` returns 1.2 with the
  `'playlist'` perk. `ease_level(p)` is 0, 1 or 2 by attempt.
- `Cheer` is the hero's bust in a corner with `react('cheer'|'oops', event)` and a speech bubble.
  Lines come from story's `bark()` once it's wired (`setBark`), with tiny generic fallbacks.
- `Outro` is the end card (headline, 1–3 stars, sub line). It calls `finishMinigame` after 3.2s or on click.
- Tutorial drawing: `drawHand`, `drawHighlight`, `drawArrow`, `prompt`. Scenery: `drawBackdrop`,
  `vignette`, `titleTag` and `timeBar`.

## Status
| Room | Game | Status | Score |
|---|---|---|---|
| dining | Pour the Drinks | shipped | 3 levels (opt 5 / 8 / 15 pours, BFS-verified in `a/pour-logic.js`); score = min(1, 1.15·opt/pours). Never fails. |
| kitchen | Bread Bake | todo | |
| office | Bug Hunt | todo | |
| living | Bunny Roundup | todo | |
| playroom | Card Duel | todo | |

Keys in Pour the Drinks: 1–7 pick a glass, U/Z undo, R restart.
