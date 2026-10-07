# Build status & handoff (supervisor-owned)

Read this first if you are a new session picking up the Housewarming build.
Updated by the supervisor at every 10-minute check-in. Last update: 2026-10-06 ~20:45.

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
| story | src/story, src/audio, docs/STORY.md | script + lines.js shipped (c4551d4); doing cutscene staging w/ busts → title → audio |
| hub | src/hub | floor plan, shop, select, results shipped (bf4338b); switching to drawBust, polish |
| action | src/action | all 9 rooms playable (213742f); tuning, fix rug-looks-like-telegraph, docs |
| games-a | dining, kitchen minigames | Pour the Drinks shipping; Bread Bake verified, next; then liveliness pass |
| games-b | guest, primary, pond | Pipe Fixer shipped (df6712d); Crochet + Final Patch shipping; then make Pipe Fixer less boring |
| games-c | office, living | Bug Hunt shipping; then boss-bug twist; Bunny Roundup |
| games-d | playroom, backyard | Drumline shipped (75ef94e); remap keys (D/F drums, J/K cymbals); then Card Duel |
| art | src/art (not world), src/ui | busts (1b5bebc), dialog v2 + facade (aa5ad59); next HUD v2 (HUD_VERSION=2), skill icons, hero likeness |
| art-world | src/art/world | stub API (051b52a); furniture + office room + enemies next |

## User feedback log (most recent first)
- Drumline: D/F = left/right drum, J/K = left/right cymbal.
- Pipe Fixer "kinda boring" → all minigames need pressure, motion, surprise.
- Dining minigame = Pour the Drinks (color-sort logic). Kitchen = Bread Bake (they make bread).
- Round 1: loved colors + character movement; story/dialogue made no sense; too many skills up front.

## Known issues / next for the supervisor
- Integration playthrough of the full loop once art-world rooms + HUD v2 land.
- Fallback rugs drawn as red dashed ellipses read as attack telegraphs (action fixing).
- In-world hero heads still read as round photo medallions (art likeness pass).
