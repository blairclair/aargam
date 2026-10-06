# Strategy team notes

## Modules (`src/strategy/`)
| file | what |
|---|---|
| `data.js` | Static data: map nodes (positions, kinds, start frost), edges, `ECON` numbers, `UPGRADES`, `BUILDINGS` |
| `campaign.js` | Pure rules on `game.state`: init, availability, difficulty/rewards/modifiers, storm + forecast + `endDay`, Sunshine actions, `applyOutcome`, shop purchases |
| `mapdraw.js` | Procedural map rendering (cached terrain canvas, frost blobs, paths, nodes, badges, snowfall) |
| `story.js` | Dialog lines: first visit, region liberated, Baron defeat, defeat banter, camp-chill warning, per-node mission intros |
| `overworld.js` | `overworld` scene: map, top bar, forecast panel, selection panel, tooltips, results panel |
| `camp.js` | `camp` scene: hero upgrade columns with portraits + stat bars, buildings column |

`campaign.js` has no DOM dependencies, so it can be imported in Node for balance sims.

## State shape
```
state.map  = { v:1, seed, nodes:{ <id>:{frost 0..3, cleared, shieldDay, thawedDay} },
               liberated:{lakeside,oldcity,summit}, campChill 0..3, campShieldDay, storm:{day, ids[]} }
state.camp = { buildings:{ cocoa, scout, freezer, hammock: level } }
state.flags['strategy.introSeen']
```
Static node info lives in `data.js` keyed by id; saves only hold dynamic values. A map with `v !== 1` is re-initialized.

## Map and frost rules
- 17 nodes: Lakeside (camp + 5), Old City (5), Summit (6 incl. the fortress). Each region ends in a Slush Golem
  boss node (`sandbar`, `clocktower`, `glacier_gate`); the Baron (`fortress`) sits behind `glacier_gate`.
- A node is **attackable** if it's frozen, its region is unlocked, and a neighbor is thawed (camp always counts as thawed).
- Beating a region's golem **liberates** it: the next region unlocks, every other node in it loses 1 frost,
  and the storm stops targeting it. Boss nodes stay cleared forever.
- **Each night** (after every mission, win or lose), the forecast is applied, then the day advances:
  1. **Storm**: the Baron picks `1` node per night (`2` from day 12) among frost-1/2 nodes in the current
     region (weighted 3x toward the frontier). They get +1 frost. Picks are rolled at the start of each day
     from `seed+day` and stored, so the forecast shown is exactly what will happen.
  2. **Re-freeze**: a thawed non-boss node next to a **non-boss frost-3** node goes back to frost 1.
     A node thawed today is immune tonight.
  3. **Camp chill**: if a non-boss camp neighbor is at frost 3, camp chill +1, otherwise chill -1.
- **Shield** (1 Sunshine) blocks all of tonight's changes on that node (or the camp). **Warm** (2 Sunshine) lowers
  frost by 1 (bosses min 1). Neither costs a day.
- **Loss**: camp chill reaches 3, or day > 30. **Win**: beat the Baron.

## Missions
- Difficulty = region base (1/2/3) + (frost − 2), golems = base + 1, Baron = 5, clamped 1..5.
- Modifiers: `blizzard` at frost 3, `warm_cocoa` (Cocoa Stand), `ally_scouts` (Scout Tower).
- Seed = f(map seed, node id, day). Each node passes 2–3 `intro` lines.

## Economy
- Start: 40 Scoops, 2 Sunshine.
- Victory bonus: Scoops `(20 + 12·difficulty + 8·frost + 40 if boss) × freezer mult`; Sunshine `1 + (frost 3) + (boss)`.
  Plus everything picked up in the mission (picked-up scoops also get the freezer multiplier).
- Defeat: keep 50% of picked-up Scoops and all Sunshine. The node gains +1 frost, capped at 2 and skipped if the storm already targets it tonight, so a defeat never creates a frost-3 node.
- Heroes are fully healed after every mission.
- Shop: see `docs/teams/upgrades.md`. Stat tier I is 60–80, tier II 130–150, abilities 110–170.
  Buildings: Cocoa 100, Scout 110, Freezer 80/160 (+25%/+50% Scoops), Hammock 120 (+1 Sunshine every morning).
- **Pacing**: the shortest winning route is 9 missions (dock, sandbar, elfreth, flowerbox, clocktower,
  overlook, ranger, glacier_gate, fortress), so the earliest possible win is on day 9 of 30. Clearing all 16
  mission nodes takes 16 days plus losses.
- Balance sim (greedy player, rushing golems): 75% mission win rate → ~99% campaign wins, avg ~day 15;
  50% → ~60%. A player who clears every node needs ~16–20 days.
