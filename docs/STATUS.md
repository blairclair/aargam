# Build status & handoff (supervisor-owned)

Read this first if you are a new session picking up the Housewarming build.
Updated by the supervisor at every 10-minute check-in. Last update: 2026-10-06 ~21:55.

## Where everything lives
- `main` on GitHub — integrated, playable game (always green: check + smoke).
- `first-pass` branch / `v0.1-first-pass` tag — round 1 ("The Great Scoop Heist"), kept forever.
- `origin/wip/<team>` — each agent's in-progress backup (`tools/backup.sh <team>`, ≤10 min old).
- Local worktrees: `.claude/worktrees/agent-*` (one per agent; not in git).
- Design: `docs/DESIGN.md` · contracts: `docs/ARCHITECTURE.md` · process: `docs/WORKFLOW.md` · script: `docs/STORY.md`.

## Resume after a cutoff
1. `git fetch origin && git branch -r | grep wip/` — see each team's latest WIP.
2. For each team with WIP newer than its last `main` ship: check out `origin/wip/<team>` in a worktree,
   run `node tools/check.mjs --team <team>` + `node tools/smoke.mjs`, then `tools/ship.sh <team>`.
3. Relaunch agents per team with the role prompts summarized below, pointing them at their wip branch.

## Teams (round 2)
| Team | Owns | State at last update |
|---|---|---|
| story | src/story, src/audio, docs/STORY.md | ✅ DONE (107cd15): script, staged cutscenes, title, audio + auto-music, barks API (incl. mid-minigame + sabotage), HERO_BLURBS |
| hub | src/hub | ✅ FIRST PASS DONE (26c952e): floor plan, shop, select (busts), results. Open: hand playtest; hub tip copy could move to story |
| action | src/action | all 9 rooms + real art (ad872c7); fix: bark bubble overlaps skill bar bottom-left |
| games-a | dining, kitchen | ✅ DONE (df78e41): Pour the Drinks (solver-verified, sabotage twist, Cheers finale), Bread Bake (4 steps, oven twist) |
| games-b | guest, primary, pond | ✅ DONE (dbf6c6c): Pipe Fixer (juiced), Crochet, Final Patch. Open: human playtest of timings |
| games-c | office, living | ✅ DONE (9062c36): Bug Hunt v2, Bunny Roundup. All 9 minigames shipped. |
| games-d | playroom, backyard | ✅ DONE (18395e5): Drumline (D/F drums, J/K cymbals), Card Duel. Open: Card Duel maybe too easy (needs human playtest) |
| art | src/art (not world), src/ui | facade re-exports world (8018a49) — real rooms now in-game; next: hero likeness pass (in-world heads still photo circles) |
| art-world | src/art/world | ✅ DONE (b69567f): 9 rooms, 41 furniture, 24 enemies, drawWater, drawStringLights. Open: dough blob looks more worried than menacing |

## User feedback log (most recent first)
- Drumline: D/F = left/right drum, J/K = left/right cymbal.
- Pipe Fixer "kinda boring" → all minigames need pressure, motion, surprise.
- Dining minigame = Pour the Drinks (color-sort logic). Kitchen = Bread Bake (they make bread).
- Round 1: loved colors + character movement; story/dialogue made no sense; too many skills up front.

## Backlog for finished teams (supervisor or a follow-up agent)
- Wire story's mid-minigame barks (`minigameCombo/Twist/Close`, `sabotage`) into guest/primary/pond (games-b), office/living (games-c), playroom/backyard (games-d).
- Hub: use `HERO_BLURBS` from lines.js for select-screen role lines.
- Minigames: optional switch to shared a/common.js helpers for visual consistency.
- Human playtest timings: Bunny Roundup 80s, Bug Hunt ramp, Pipe flood ~66s, Final Patch 75s, Card Duel maybe too easy.

## For the user to check (morning)
- Invented personal details in the script — confirm or veto: Victoria's "Ask any teen I work with" and Aaron's "the one I lost in college" (see docs/STORY.md).
- Listen to the music/sfx mix with sound on (only tested muted).
- Playtest minigame difficulty (bots only so far).

## Known issues / next for the supervisor
- Integration playthrough of the full loop once art-world rooms + HUD v2 land.
- Fallback rugs drawn as red dashed ellipses read as attack telegraphs (action fixing).
- In-world hero heads still read as round photo medallions (art likeness pass).
