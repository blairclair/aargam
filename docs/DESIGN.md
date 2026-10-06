# Aaron & Victoria: The Great Scoop Heist — Design Bible

This is the creative source of truth. Every team builds toward it. If something you want to
add doesn't fit here, ask the supervisor before building it.

## Pitch

A warm, funny, slightly cozy **top-down action-adventure with a light strategy layer**, starring
Aaron and Victoria (real people; the player's brother and sister-in-law). The game is a gift, so
it should feel affectionate. The jokes are gentle and nobody is mean-spirited. It should be fun to
play for 20–40 minutes.

**Story:** It's the last week of summer. **Baron von Brrr** and his **Sorbet Syndicate** have
stolen every scoop of ice cream in the land and are spreading an unseasonal frost from their
fortress on Blue Ridge Summit. Aaron and Victoria set out from their lakeside camp to take back
the scoops, thaw the land, and save summer. Victoria is especially offended, because the Baron
took the mint chocolate chip.

## The heroes (taken from their photos; keep them recognizable)

| | **Aaron, "The Trail Guide"** | **Victoria, "The Old City Explorer"** |
|---|---|---|
| Look | Tall, lean, short strawberry-blond hair, **dark rectangular glasses**, big grin, grey/striped tee, dark shorts or jeans, sneakers | Long **wavy light-blond/honey hair**, warm smile, **denim jacket**, dark sweater or white tee, light-blue jeans, white sneakers |
| Vibe | Enthusiastic hiker, earnest, a bit of a goof, loves a summit view | Curious, clever, unflappable, loves old cities, history and ice cream (mint chip!) |
| Combat role | **Melee bruiser.** Higher HP | **Ranged tactician.** Lower HP, faster |
| Attack | *Pole Sweep*: arc swing with a hiking pole | *Mint-Chip Fling*: throws mint-chip scoops (projectiles) |
| Ability | *Compass Dash*: short invulnerable dash that knocks enemies aside | *Denim Shield*: brief frontal block that reflects slush shots |
| Special | *Summit Shout*: radial stun and knockback | *Flower Box Bloom*: plants a flower box that makes a healing/thawing zone |

**Tag-team:** One hero is on the field at a time. Press **Q/Tab** to swap. The benched hero slowly
regenerates HP. If the active hero is knocked out, the other one auto-swaps in. The mission is lost
only when both are down. Swapping should feel snappy (a puff of particles and a "swap" sfx).

**Portrait rule:** The heroes' **heads are their real photo faces** (circular crops in
`assets/portraits/`) on stylized chibi bodies ("big-head mode"). Use `drawPortrait` / `drawHero`.
Never distort or recolor the faces. Never use them for enemies or as a joke target.

## World: three regions (from the photos)

1. **Lakeside Camp** (home base, the first region): sandy paths, a lake, the octagonal wooden
   **pavilion**, picnic tables, a blue patio umbrella, pines. A blue toy bucket is a tiny Easter egg.
2. **Old City**: red brick sidewalks and alleys, iron lamp posts, red-and-black bollards, colonial
   doors, **flower boxes with mums and pumpkins** (autumn creeping in), flags.
3. **Blue Ridge Summit**: bright green pines over hazy blue mountain ridges under a vivid sky, rising
   to the **Baron's ice fortress** at the top (final boss).

Frost visually takes over a region as its frost level rises: blue tint, icicles, frozen props.
Thawing should look and feel great: warm colors return and flowers pop.

## Enemies: the Sorbet Syndicate (ids in `src/core/theme.js` `ENEMIES`)

- **Frostling**: small hopping ice blob in swarms. Cute.
- **Brain Freezer**: a floating cone that lobs slush balls. Getting hit gives a short "brain freeze" slow.
- **Popsicle Knight**: a stick-legged popsicle with a wafer shield. Blocks from the front, so flank it.
- **Slush Golem**: mini-boss, slow, ground-pound shockwave.
- **Baron von Brrr**: the final boss. A pompous frozen aristocrat with an ice-cream-scoop scepter
  and a monocle. Several phases.

## Game loop

```
Title → Overworld map (strategy) ⇄ Camp (upgrades)
           │ pick a node
           ▼
       Mission (action) → outcome → back to Overworld (rewards, frost spreads, day advances)
           ... thaw all three regions → Baron's fortress → Ending
```

**Strategy layer (Overworld + Camp):**
- A node map across the 3 regions (roughly 4–6 nodes per region plus the final fortress). Nodes
  connect, and you can only attack nodes adjacent to thawed ones.
- Each node has a **frost level 0–3**. Every day (that is, after every mission), frost **spreads**:
  some frozen nodes next to thawed ones gain frost, and a level-3 node can re-freeze a neighbor.
  This creates prioritization pressure: which fire do you put out first?
- Missions pay out **Scoops** (currency) and **Sunshine** (spend it on the map to lower a node's
  frost without fighting, or to shield a node for a day).
- **Camp** spends Scoops on upgrades for each hero (HP, damage, cooldowns, a new ability twist) and
  on camp buildings that give passive perks or mission modifiers (for example "Warm Cocoa Stand": start
  missions with an HP buffer).
- High frost on a node → harder mission (difficulty, `blizzard` modifier) but better rewards.

**Action layer (Missions):** Top-down arenas, procedurally laid out per region from a seed.
Mission kinds: `skirmish`, `rescue`, `defend`, `boss` (see `MISSION_KINDS`). A mission lasts
1–4 minutes. Scoops drop from enemies and can be picked up. Winning gives a satisfying
"SUMMER RESTORED" thaw moment.

## Tone & presentation

- Palette: warm late-summer colors (sun gold, mint, brick, lake blue, pine) against the villain's
  icy blues and whites. Use `PALETTE` from theme.js. Don't invent random colors.
- Juicy feedback: hit flashes, small screen shake, particles, damage numbers, punchy WebAudio sfx.
- Light banter between Aaron and Victoria at mission start and end, and the Baron monologues
  pompously. Keep lines short (under 90 characters each) and good-natured.
- Controls: WASD/arrows to move, mouse to aim, **left click/J** to attack, **Shift/right-click/K**
  for ability, **E/L** for special, **Q/Tab** to swap, **Esc/P** to pause. Everything should
  also be playable with keyboard only (aim follows movement direction when the mouse is idle).
- Everything is generated procedurally on Canvas 2D and synthesized with WebAudio. The only
  image files are the two portraits.

## Out of scope for the first pass
Multiplayer, mobile touch controls, external libraries or build steps, and loading any external
assets other than the portraits.
