# Hub team: house floor plan, select, results, Party Touch shop

Scenes: `hub`, `select`, `results` (all in `src/hub/`). Exported perk table: `PERKS` in `src/hub/perks.js`.

## Party Touches (perks), recorded in `state.purchases` (array of ids)

Buy once, permanent for the rest of the run. Costs are Party Points (10 per new star, so 270 max).

| id | Name | Cost | Effect | Who honors it |
|---|---|---|---|---|
| `good_coffee` | Good Coffee | 30 | +10% move speed, both heroes | **hub** multiplies `state.party[hero].speed` by 1.10 on purchase. Action just reads `party`. Do NOT re-apply. |
| `snack_table` | Snack Table | 30 | +20 max HP, both heroes (rooms start with more HP) | **hub** adds 20 to `state.party[hero].maxHp` on purchase. Action just reads `party`. |
| `house_shoes` | Lucky House Shoes | 40 | +10% damage, both heroes | **hub** multiplies `state.party[hero].damage` by 1.10 on purchase. Action just reads `party`. |
| `playlist` | Party Playlist | 25 | +20% minigame time (or equivalent leniency, e.g. slower notes) | **minigames**: `params.perks.includes('playlist')` |
| `fairy_lights` | Fairy Lights | 15 | Cosmetic: string lights across the backyard and house on the hub | hub only |
| `extra_chairs` | Extra Chairs | 10 | Cosmetic: more chairs at the dining table and on the patio | hub only |
| `fresh_flowers` | Fresh Flowers | 10 | Cosmetic: vases of flowers on tables and window boxes | hub only |

Rules:
- Stat perks write `state.party` directly, so **action must not also check `purchases` for those three ids** (it would double-apply).
- Action may show a small flourish for them by checking `state.purchases`, but must not change stats.
- Minigames get `perks` via `MinigameParams.perks` (flow copies `state.purchases`).

## Loadout
- `state.loadout[hero]` = up to 2 `slot: 'skill'` ids, saved by select before `launchRoom`. Basic and ultimate are implicit.
- Select pre-fills from the last saved loadout (filtered to skills the hero still knows), else the 2 newest skills.

## Flags written by hub
- `hub.lastHero`: hero last picked on the select screen.
- `hub.seenShop`: player opened the Party Touch shop at least once.
