# Upgrade contract (strategy authors, action reviews)

Source of truth for the shop: `src/strategy/data.js` (`UPGRADES`, `BUILDINGS`). **Ids are stable; never renamed.**
Unknown ids must be ignored safely by action.

## How upgrades reach the action layer
- **Stat upgrades** are applied by strategy directly to `game.state.party.<hero>` (`maxHp`, `damage`, `speed`).
  Their ids are also pushed to `upgrades[]` for bookkeeping. **Action does nothing for them** beyond reading the numbers.
- **Ability upgrades** are pushed to `game.state.party.<hero>.upgrades[]`. Action interprets them.
- **Team upgrades** (`team.*`) are pushed to `party.aaron.upgrades[]`. Action accepts them on either hero.
- Strategy restores `hp = maxHp` for both heroes after every mission (rest at camp).

## Ability upgrades (action implements)
| id | hero | intended effect |
|---|---|---|
| `aaron.dash_damage` | Aaron | Compass Dash deals damage (~20) to enemies it passes through |
| `aaron.quick_dash` | Aaron | -30% Compass Dash cooldown |
| `aaron.wide_sweep` | Aaron | Bigger Pole Sweep arc and reach |
| `aaron.long_shout` | Aaron | Bigger Summit Shout radius and longer stun |
| `victoria.quick_fling` | Victoria | -25% Mint-Chip Fling cooldown |
| `victoria.piercing_scoop` | Victoria | Mint-chip scoops pass through 1 enemy |
| `victoria.triple_scoop` | Victoria | Fling throws 3 scoops in a spread |
| `victoria.long_shield` | Victoria | +60% Denim Shield duration |
| `victoria.big_bloom` | Victoria | +35% Flower Box Bloom radius, +50% heal |
| `team.regen` | team | Benched hero regenerates 2x faster |

## Stat upgrades (strategy applies; action reads numbers only)
| id | effect |
|---|---|
| `aaron.hp_1` / `aaron.hp_2` | +20 / +30 maxHp |
| `aaron.dmg_1` / `aaron.dmg_2` | +4 / +6 damage |
| `aaron.speed_1` | +15 speed |
| `victoria.hp_1` / `victoria.hp_2` | +15 / +25 maxHp |
| `victoria.dmg_1` / `victoria.dmg_2` | +3 / +5 damage |
| `victoria.speed_1` | +15 speed |

## Camp buildings → mission modifiers
| building | effect |
|---|---|
| Warm Cocoa Stand | every mission gets the `warm_cocoa` modifier |
| Scout Tower | every mission gets the `ally_scouts` modifier |
| Ice Cream Freezer (2 levels) | strategy-side: +25% / +50% Scoops from missions |
| Sunny Hammock | strategy-side: +1 Sunshine each morning |

Frost level 3 nodes add the `blizzard` modifier.
