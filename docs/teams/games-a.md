# games-a — Dining (Pour the Drinks) and Kitchen (Bread Bake)

All five follow the MINIGAME CONTRACT in `src/minigames/host.js` and end through
`finishMinigame(game, { roomId, success, score, attempt })`. Each one teaches itself in the first
seconds with an animated hand or arrow, a highlighted target and one short prompt.

## Shared helpers: `src/minigames/a/common.js` (other teams may import read-only; contract at the top of the file)
- `normParams(p)` makes `perks` an array and `attempt` a number. `timeMul(p)` returns 1.2 with the
  `'playlist'` perk. `ease_level(p)` is 0, 1 or 2 by attempt.
- `Cheer` is the hero's bust in a corner with `react('cheer'|'oops', event)` and a speech bubble.
  Lines come from story's `bark()` once it's wired (`setBark`), with tiny generic fallbacks.
- `Outro` is the end card (headline, 1–3 stars, sub line). It calls `finishMinigame` after 3.2s or on click.
- Tutorial drawing: `drawHand`, `drawHighlight`, `drawArrow`, `prompt`. Scenery: `drawBackdrop`,
  `vignette`, `titleTag` and `timeBar`.

## Status
| Room | Game | Notes |
|---|---|---|
| dining | Pour the Drinks | 3 levels (fewest pours 5 / 8 / 15, BFS-verified in `a/pour-logic.js`). Wobble and fizz, a flow streak for quick pours, PartyPlanner swaps two top layers once in rounds 2 and 3 (BFS-checked to stay solvable, +0..3 to the fewest-pours count), and a clinking "Cheers!" finale. Score = 0.85·min(1, 1.15·fewest/used) + 0.15·speed. Never fails. Keys: 1–7 pick a glass, U/Z undo, R restart. |
| kitchen | Bread Bake + Mouse Heist | **Bake:** knead (rhythm, 2 demo beats + 10 scored), shape (trace an ellipse), proof (stop the gauge in the gold zone), bake (pull at golden; PartyPlanner turns the oven up). Never fails. **Steal beat** (~3.5 s): a giant mouse (`a/mouse.js`) bursts in and grabs the cooling loaf; the hero bust double-takes ("MY BREAD!"). **Chase** (`a/heist.js`, ~25-40 s): side-scroller through kitchen → hallway → living room. Space/↑/click jump, ↓ slide, → sprint (stamina). Gap meter + pantry progress bar. It throws crumbs (jump) and dish towels (slide), knocks a chair over (~28%), and dives into a wall hole the first time you get close (pops out further ahead). Inside 1.75 m: Space = TACKLE. Reaches the pantry = "Again!" (chase only, hero a bit faster, -0.15 chase score per retry). Score = 0.5·bake + 0.5·chase. Dev: `&phase=chase` / `&phase=steal`. |

Office, Living and Playroom moved to games-c and games-d.

Story events used: minigame/minigameWin (start and end bubbles), minigameCombo (streaks), minigameTwist (the swap and the oven), minigameClose (shape timer, bake past golden), hit (8-beat knead combo), sabotage (PartyPlanner terminal line). Kitchen only: stepGood/stepBad (bake step results), chaseSteal, chaseStart, chaseClose, chaseNear, chaseTrip, chaseHole, chaseCatch, chaseMiss. `line()` only returns lines spoken by the given hero (never the other hero's or PartyPlanner's).
