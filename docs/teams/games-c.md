# games-c — Bug Hunt (office) + Bunny Roundup (living)

## Bug Hunt (`src/minigames/office.js`)
- Teaches itself: one tutorial bug crawls in and stops, with a pulsing ring, a demo hand tapping it and a "Click the bugs!" prompt.
  The clock doesn't start until the player squashes it. Then an arrow hint points at the compiler line for about 3s.
- Code scrolls down into the COMPILER band. Click bugs before they reach it. A bug that reaches it costs 4s; clicking clean code costs 1s.
- Ramps over about 45s: spawn interval 2.3s→0.75s, speed ×1→×2.1, beetle → +fly (zigzag, after 8s) → +tank (2 hits, after 18s).
- Win: squash the quota (20) → "BUILD SUCCEEDED". Fail: time runs out → "BUILD FAILED", `success:false`.
- Retry (attempt n): quota −4 per retry (min 12), +10s, speed ×0.85. The `playlist` perk gives ×1.2 time.
- Score = 0.4·time left (half the clock left = full) + 0.35·(1 − escaped/6) + 0.25·click accuracy.

## Shared helpers (`src/minigames/c/common.js`)
`Bust` (reacting photo bust), `drawHand`, `drawPulseRing`, `drawArrowDown`, `drawCheck`, `timeMul(params)`, `perkList(params)`.
