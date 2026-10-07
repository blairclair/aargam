# Hub team: house floor plan, select, results, Party Touch shop

Scenes: `hub`, `select`, `results` (all in `src/hub/`). Canonical perk table: `PERKS` in `src/core/theme.js` (the shop is built from it).

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

## Scenes at a glance
- **hub** `{justFinished?}`: floor plan (bedrooms + office top, living + playroom middle, dining + kitchen bottom,
  backyard with pond to the east). Locked rooms are dimmed with a lock icon, and hover shows what unlocks them.
  Available rooms pulse in their `accent` with a small animation of their weird thing. Done rooms glow warm and show stars.
  Keys: arrows cycle available rooms, Enter enters, B opens the shop. `justFinished` triggers a banner, confetti, and a NEW tag on rooms it unlocked.
  Cosmetic perks change the plan: fairy lights (string lights), extra chairs (dining + patio), fresh flowers (vases + flower beds).
- **select** `{roomId, retry?, lastHero?}`: two bust cards (art `drawBust`, with 'happy' for the selected hero and dim for the other).
  The favored hero gets the tag "X's specialty: +15% damage" (**action: please make the bonus match 15% damage**).
  Loadout tiles toggle with a click, 1-9, or Up/Down + Enter. Left/Right or Q/Tab swaps hero. Esc goes back to the house (`continueGame`).
  Retries show a room-specific tip suggesting the other hero or skill.
- **results**: stars land one by one, then the HP/minigame breakdown, then PP (+10 per *new* star), then new skill cards.
  Enter or a click skips the animation. Continue calls `finishRoom`.
