# Art-World team: rooms, furniture, enemies

Everything here is procedural Canvas 2D. The public API is `src/art/world/index.js`, re-exported by art's `src/art/sprites.js` facade.
Every draw call returns `false` when it drew nothing, so the consumer can draw its own fallback.
Review page: `/src/art/world/gallery.html?page=rooms|room|furniture|enemies` (see the header of `gallery.js` for params).

## Rooms: `drawRoom(ctx, game, roomId, camX, camY, w, h, o)`
- **Frame** (matches `action/room.js`). The playable floor is `x∈[0, arenaW]`, `y∈[0, arenaH]`, and the camera is already applied.
  - The **back-wall face is drawn above y=0**, over `y∈[-wallH, 0]`.
  - **Side walls** are `SIDE = 26` px thick *inside* the floor rect.
  - The **front wall cap** is `FRONT = 16` px at the bottom.
  - Indoors, a doorway gap sits at the bottom centre.
- `o`:
  - `weird` (0..1): the haywire layer (decals, scanline shimmer, flicker). Fade it to 0 when the room is fixed.
  - `t`: seconds.
  - `arenaW`, `arenaH`: floor size.
  - `wallH`: wall-face height, default `WALL_H = 130`. Pass `arena.wallH` (outdoor rooms use 110).
- `ROOM_KINDS` lists the rooms drawn for real. `roomGeometry(roomId, aw, ah)` returns `{wallH, side, front, outdoor}`.
- What drawRoom paints:
  - floor material, wallpaper/trim, and wall decor (windows with sunbeams, frames, clock, whiteboard, sconces…)
  - wall caps, lamp glow, the backyard eave string lights (they light up as `weird` → 0), and the dining chandelier light/shadow
  - per-room haywire decals and per-frame glitch scanlines
- It does **not** draw furniture or rugs. Action places those with `drawFurniture`.
- Haywire decals per room:

  | Room | Decals |
  |---|---|
  | office | green code glyphs, cables, papers |
  | kitchen | sourdough splats, flour, wall drips |
  | living | dust clumps, roomba tracks |
  | dining | wine spills, plate shards, napkins |
  | playroom | cards, dice, toys |
  | primary | socks, shirts |
  | guest | puddles, ceiling stains, live drips and ripples |
  | backyard | weeds, vines, gnome footprints |
  | pond | glowing code |

- **Water**: `drawWater(ctx, game, x, y, rx, ry, {t, weird})` draws a pond ellipse with bank pebbles, shimmer and ripples, plus code glyphs when weird. Call it for each `arena.water` after drawRoom and before entities.
- Performance: static art is cached in 512px world chunks (a base layer and a weird layer) per (room, size). Per-frame work is a few lights and scanlines.

## Furniture: `drawFurniture(ctx, game, kind, x, y, o) -> boolean`
- **Convention**: `(x, y)` is the **front-centre ground point**. The footprint (collision) is `[x-w/2, x+w/2] × [y-h, y]` with `FURNITURE_SIZE[kind] = { w, h, vh, solid? }`.
  - `h` is floor depth.
  - `vh` is approximate visual height (how far the art reaches above `y`).
  - `solid: false` means walkable/decor (rug, lily_pad, laundry_pile).
  - Y-sort by `y`. Art is drawn upward and backward from the point (oblique 3/4: front face `[-vh..0]`, top face behind it).
- `o`:
  - `t`
  - `weird` 0..1: TV static, laptop glitch, sink/bathtub overflow, server LEDs
  - `seed` 0..1: one of 3 variants (rug: 0 medallion, 1 round, 2 striped)
  - `room`: tints fabrics and paint toward the room accent
  - `lit` 0..1: `light_post`
  - `w` / `d`: stretch `rug`; tile `counter`, `hedge`, `fence` to a custom width
  - `flip`, `alpha`, `scale`
- `FURNITURE_KINDS` lists the canonical kinds. `FURNITURE_ALIASES`: couch→sofa, hutch→sideboard, kitchen_island→island, toy_chest→toy_box, jar→starter_jar, lamp→floor_lamp.

| kind | w×h (vh) | kind | w×h (vh) | kind | w×h (vh) |
|---|---|---|---|---|---|
| desk | 120×50 (140) | office_chair | 34×30 (62) | bookshelf | 96×30 (150) |
| server_rack | 56×40 (130) | plant | 36×30 (80) | floor_lamp | 26×22 (124) |
| counter | 128×50 (95) | island | 150×72 (120) | oven | 60×50 (102) |
| fridge | 62×52 (176) | starter_jar | 40×30 (70) | sink | 64×42 (96) |
| sofa | 160×64 (100) | armchair | 64×56 (90) | coffee_table | 96×50 (70) |
| tv_stand | 130×36 (136) | rug | 220×140 (flat, non-solid) | dining_table | 220×90 (124) |
| sideboard | 110×36 (145) | dining_chair | 34×30 (66) | toy_box | 70×42 (80) |
| toy_shelf | 100×32 (105) | block_tower | 40×36 (80) | play_table | 96×64 (70) |
| bed | 130×170 (226) | guest_bed | 100×150 (200) | nightstand | 40×34 (80) |
| dresser | 104×42 (128) | wardrobe | 96×46 (176) | laundry_basket | 50×40 (56) |
| laundry_pile | 50×30 (non-solid) | bathtub | 140×70 (106) | grill | 56×46 (80) |
| hedge | 120×40 (90) | tree | 40×30 (150) | light_post | 16×16 (110) |
| patio_table | 90×70 (76) | garden_bed | 140×60 (76) | fence | 128×14 (56) |
| rock | 56×36 (40) | reeds | 44×24 (80) | lily_pad | 48×34 (non-solid) |

Animated overlays (drawn live from `o.t`): desk (screen glow, cursor), oven (glow), island and starter_jar (bubbling starter that overflows when weird), tv_stand (cozy fireplace channel, static when weird), server_rack (LEDs), nightstand and floor_lamp (lamp glow), grill (smoke, coals), sink and bathtub (overflow when weird), light_post (`o.lit`).

## Enemies: `drawWorldEnemy(ctx, game, type, x, y, o) -> boolean`
- `(x, y)` is the feet/ground point. `WORLD_ENEMY_KINDS` lists every non-legacy id in `theme.ENEMIES`.
- `o`:
  - `facing` (radians)
  - `t`
  - `flash` 0..1: white hit flash
  - `anim`: 'idle' | 'move' | 'attack' | 'hurt'
  - `progress` 0..1: attack wind-up until 0.7 (shake/glow, red `!`, dashed ground ring), then release. For hurt, 0 is fresh and 1 is recovered.
  - `phase` 1..3 (bosses)
  - `hpFrac`: a small HP bar on regular enemies when < 1. Bosses draw none; use the HUD.
  - `scale`, `alpha`, `seed` (stable per-entity variety), `hpBar: false`
- Per-type notes:
  - `dough_blob`: `o.small` draws the split child.
  - `card_soldier`: suit comes from `seed`. `pawn`: ivory/ebony from `seed`.
  - `chair`: draws a dashed charge lane along `facing` during wind-up.
  - `roomba`: the turret aims along `facing`. LEDs go blue, then yellow on wind-up, orange in phase 2, red in phase 3. Smoke appears as hp drops.
  - `sock_monster`: phases unravel it, and it loses socks below 50% hp.
  - `grill_dragon`: lid-mouth fire breath, which escalates with phase.
  - `drip` (Leak): a puddle at the point, plus a droplet falling with `progress`.
  - `code_fish`: only ripples/shadow when idle (underwater), leaps on move/attack.
  - `partyplanner`: a 400×300 code koi floating about 70px above its water point, head toward `facing`. Attack is a mouth orb plus a telegraph line along `facing`, then a beam. Phase 2 adds glitch/RGB split and a "Not Responding" window. Phase 3 adds blue-screen fragments, ERROR/FATAL and lightning.
