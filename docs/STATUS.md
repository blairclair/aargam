# Build status & handoff (supervisor-owned)

Read this first if you are a new session picking up the Housewarming build.
Updated by the supervisor at every 10-minute check-in. Last update: 2026-10-06 ~21:20.

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
| story | src/story, src/audio, docs/STORY.md | script, staged cutscenes w/ busts, title, synthesized audio + auto-music shipped (76f67cb, 688c823). Owes: dining swap line, mid-minigame barks (combo/twist/close), review hub copy |
| hub | src/hub | ✅ FIRST PASS DONE (26c952e): floor plan, shop, select (busts), results. Open: hand playtest; hub tip copy could move to story |
| action | src/action | all 9 rooms playable (213742f); tuning, fix rug-looks-like-telegraph, adopt HUD v2 when art exports HUD_VERSION=2 |
| games-a | dining, kitchen | Pour the Drinks + Bread Bake shipped (1f9d5f4); liveliness pass in progress |
| games-b | guest, primary, pond | ✅ DONE (dbf6c6c): Pipe Fixer (juiced), Crochet, Final Patch. Open: human playtest of timings |
| games-c | office, living | Bug Hunt v2 shipped (6fd0785: Segfault boss, combos, kind jokes); building Bunny Roundup (last minigame) |
| games-d | playroom, backyard | ✅ DONE (18395e5): Drumline (D/F drums, J/K cymbals), Card Duel. Open: Card Duel maybe too easy (needs human playtest) |
| art | src/art (not world), src/ui | busts, dialog v2, facade, HUD v2 + skill icons (ce995fd); next: re-export ROOM_KINDS/drawWater/WALL_H, hero likeness |
| art-world | src/art/world | shipping all 9 rooms, 41 furniture, 24 enemies incl. koi (in flight); backup ok |

## User feedback log (most recent first)
- Drumline: D/F = left/right drum, J/K = left/right cymbal.
- Pipe Fixer "kinda boring" → all minigames need pressure, motion, surprise.
- Dining minigame = Pour the Drinks (color-sort logic). Kitchen = Bread Bake (they make bread).
- Round 1: loved colors + character movement; story/dialogue made no sense; too many skills up front.

## Known issues / next for the supervisor
- Integration playthrough of the full loop once art-world rooms + HUD v2 land.
- Fallback rugs drawn as red dashed ellipses read as attack telegraphs (action fixing).
- In-world hero heads still read as round photo medallions (art likeness pass).
