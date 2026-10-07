# games-c — Bug Hunt (office) + Bunny Roundup (living)

## Bug Hunt (`src/minigames/office.js`)
- Teaches itself: one tutorial bug crawls in and stops, with a pulsing ring, a demo hand tapping it and a "Click the bugs!" prompt.
  The clock doesn't start until the player squashes it. Then an arrow hint points at the compiler line for about 3s.
- Code scrolls down into the COMPILER band. Click bugs before they reach it. A bug that reaches it costs 4s; clicking clean code costs 1s.
- Ramps over about 45s: spawn interval 2.3s→0.75s, speed ×1→×2.1, beetle → +fly (zigzag, after 8s) → +tank (2 hits, after 18s).
- Win: squash the quota (20) → "BUILD SUCCEEDED". Fail: time runs out → "BUILD FAILED", `success:false`.
- Retry (attempt n): quota −4 per retry (min 12), +10s, speed ×0.85. The `playlist` perk gives ×1.2 time.
- Twist: at 45% of the quota a giant SEGFAULT beetle arrives with an alarm and a banner. It takes 9 hits (each knocks it back), hatches mini-bugs, and is worth 3 bugs plus 5s; if it compiles, −10s.
- Combo counter (1.6s window): every 5th hit +2s; a misclick or an escape breaks it. A rare golden bug zips across: worth 2 bugs plus 3s.
- Barks from story/lines.js (minigame, hit, minigameWin, minigameFail) in a speech bubble by the bust.
- Score = 0.35·time left (half the clock left = full) + 0.3·(1 − escaped/6) + 0.2·accuracy + 0.15·best combo/8.

## Bunny Roundup (`src/minigames/living.js`)
- The hero follows the mouse (WASD works too). Dust bunnies flee from the hero; push them into the vacuum nozzle on the right wall. Click = CLAP, a shockwave that scatters nearby bunnies (0.9s cooldown).
- Teaches itself: everyone else naps while a ghost hero and hand push the demo bunny along a dashed arrow into the nozzle, under the prompt "Push the bunnies into the vacuum!". Then "Your turn!" and a hint: "They run from you. Click to CLAP!".
- Sneaky bunnies (darker, with ninja masks) are faster, drift away from the bag, and juke sideways. Obstacles deflect bunnies toward the vacuum so they never jam.
- Twist: a STAMPEDE at 38% of the time (or 55% bagged). 5 bunnies burst from under the couch and everything panics, but the vacuum goes TURBO for 7s (×1.7 suck radius).
- Bagging two within 2.2s chains a combo for +2s each.
- 11 bunnies plus 5 from the stampede, 80s. Retry: 9 plus 3, +10s. The `playlist` perk gives ×1.2 time.
- Win = all bagged: score 0.6 + 0.4·time left. Timeout with ≥60% bagged = success with score 0.5·fraction; otherwise `success:false`.


## Shared helpers (`src/minigames/c/common.js`)
`Bust` (reacting bust; uses art's `drawBust` expressions when available), `Speech` (bark bubble), `Combo`, `drawHand`, `drawPulseRing`, `drawArrowDown`, `drawCheck`, `timeMul(params)`, `perkList(params)`.
