# games-b: Pipe Fixer, Crochet Pattern, Final Patch

The owner is games-b. Drumline (backyard) moved to games-d.

| Room | File | Game | Controls |
|---|---|---|---|
| guest | `src/minigames/guest.js` | **Pipe Fixer**: turn pipe tiles until the water runs from LEAK to DRAIN, before the flood meter fills. 4 short handcrafted boards. Open pipe ends spray water and speed up the flood, fixed pipes BURST mid-puzzle, rubber ducks ride the current, furniture floats up, and a connection pays off with a WHOOSH. Fast solves build a speed streak that drains extra water. | click to turn, right-click/Q to turn back; arrows/WASD + Space/Enter/J |
| primary | `src/minigames/primary.js` | **Crochet Pattern**: Simon-says. Watch the stitches light up, then repeat them. Each stitch crochets a round of a granny square into the torn quilt. 6 squares, and the sequences grow. A sock monster creeps up and reaches for the square while you dawdle, then lunges when you tangle. Rounds 3 and 5 are SPEED STITCH surprise rounds, and quick inputs build combos. | arrows/WASD or click the yarn balls |
| pond | `src/minigames/pond.js` | **Final Patch** (finale): a countdown to PartyPlanner's reboot. Aaron clicks the glitching token in each line. Victoria drags the fragment whose shape matches the gap. Halfway through, PartyPlanner fights back: the koi lunges and the reboot overclocks to ×1.35. It ends on "PartyPlanner.exe has been terminated". | click / drag; ←/→ + Enter |

## Shared helpers (`src/minigames/b/common.js`)
`normParams(p, roomId)` returns `{hero, attempt, perks, ease 0..2, playlist, timeMul}`. `finishOnce(self, success, score)`.
`Bust` is the reacting photo bust (`react('happy'|'oops'|'wow'|'worried')`, `tense`, `say(text)`).
`bark(roomId, moment, hero)` maps start/win/fail to story's minigame/minigameWin/minigameFail. It only shows lines spoken by the current hero.
Teaching widgets: `prompt` (a pill with keycaps), `drawHand` (the ghost cursor), `banner`, `backdrop`, `titleChip`.

## Rules we honor
- **Pressure, motion, surprise** (from playtest feedback): no static puzzles. Each game has a visible threat that rises, plus a mid-game twist.
- **Teach first:** each game opens with a ghost-hand demo or highlight plus one prompt line.
- **Retries** (`attempt` > 1, ease up to 2) make it easier. Pipe: part of the path is pre-solved, and wrong path tiles get dashed hints at ease 2. Crochet: shorter sequences, one more yarn life, a slower show. Patch: a stronger glitch tell and fewer decoys.
- **`perks.includes('playlist')`** gives +20% time (flood fill time, crochet input time, patch countdown).
- **Scores:** Pipe scores by peak flood level and extra turns. Crochet scores by mistakes and timeouts. Patch scores by time left and wrong picks. `success:false` happens only when the room floods, all the yarn tangles, or PartyPlanner reboots.
- **Music:** Pipe and Crochet use `playMusic('minigame')`. Final Patch keeps `'boss'` (the supervisor's call).
- **Dev testing:** `?scene=minigame&roomId=pond&hero=victoria&attempt=2`
