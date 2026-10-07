# games-d — Drumline (backyard) + Card Duel (playroom)

## Files
- `src/minigames/backyard.js` — **Drumline**. 4 lanes: D = left drum, F = right drum, J = left cymbal (crash), K = right cymbal (ride); or click/tap the lane, Marching Ravens purple & gold.
- `src/minigames/playroom.js` — **Card Duel** (tiny MTG nod).
- `src/minigames/d/common.js` — `readParams` (perks array or comma string), `drawBust` (reacting photo bust), `drawBubble`, `RAVENS` colors.
- `src/minigames/d/drums.js` — `DrumKit` (WebAudio drumL/drumR/cymL/cymR lane voices + snare/quads/bass/crash/brass for the flourish, own AudioContext) and `SongClock`.
- `src/minigames/d/chart.js` — the cadence chart (demo bar, count-in, 27 bars + final hit).
- `src/minigames/d/drumart.js` — backyard field, string lights, gnomes (wild ↔ band uniform), snare, note gems.

## Drumline timing
- The song clock reads `AudioContext.currentTime` while audio is running and `performance.now()` otherwise. It stays continuous when it switches source, so locked or missing audio means a visual-only game with no crash.
- Key and pointer presses are read with our own `keydown`/`pointerdown` listeners (added in `enter`, removed in `exit`) and judged when the event arrives, not at the 60 Hz input poll.
- Judging and drawing use `now - outputLatency`, the time the player actually hears. Backing (hats, brass, demo drums, count-in clicks) is scheduled about 180 ms ahead on the audio clock.
- Windows: Perfect ±50 ms, Good ±110 ms, Miss ±160 ms. These are ×1.2 with `playlist` and ×1.2 / ×1.4 on attempt 2 / 3+.
- Tempo: 104 BPM (about 72 s total). `playlist` drops it by 8 BPM and attempts 2 / 3+ drop it by a further 4 / 8. Attempts 2+ also thin the busiest bars, and 3+ removes doubles.
- Gnomes join the band at a streak of 4, then at every 8 in a row (every 6 on retries). The string lights brighten as they join. If you succeed, the stragglers join for the finale.
- Score = 0.85 × accuracy + 0.15 × the fraction of the band recruited before the finale. Accuracy = (Perfect + 0.6 × Good) / notes. You fail if accuracy is below 45% (35% on attempt 2, 25% on attempt 3+).
- Barks come from `story/lines.js`: `minigame` at the start, `hit` on every 4th recruit, and `minigameWin` / `minigameFail` at the end.

## Testing
`ONLY="scene=minigame&roomId=backyard" node tools/smoke.mjs --port 8109 --shots <dir>`. Add `&perks=playlist` or `&attempt=2` to test those cases.

## Card Duel
- 3 lanes and a hand of 3. Mana lands refill each round (2, 3, ... up to 6) and turn sideways when tapped (an MTG nod). Tap a card, then a lane, or press 1/2/3 then 1/2/3. Enter or the button ends the turn, and then every lane clashes straight ahead (an empty lane means a hit to the face).
- Each round PartyPlanner places its board-game pieces before your turn, so you can see them and answer. It blocks your strongest guest half the time; otherwise it goes for an open lane.
- Trick cards: REVERSE (your guests swap lanes) or TABLE FLIP (3 damage to every guest) in round 3, MONOPOLY MONEY (+2 foe mana) in round 5, and TABLE FLIP in round 7 if it hasn't been played yet.
- Final turn drama: once PartyPlanner is at half HP or below, or it's the final round, the legendary **HOUSEWARMING!** card (cost 0) shows up. All your guests attack again for double damage.
- Round 1 is guided, with a pointer and a prompt for each step: pick the card, pick the lane, end the turn.
- You win when PartyPlanner reaches 0 HP. If neither side is out after the last round, whoever has the higher HP fraction wins. Score = 0.5 + 0.35 × your HP fraction + 0.15 × the share of rounds you didn't need. Rounds: 8, +2 with playlist, +1 on retries. PartyPlanner's HP and mana go down on attempts 2 and 3+.
