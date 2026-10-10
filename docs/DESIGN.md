# Aaron & Victoria: Housewarming — Design Bible (v2)

The creative source of truth. Round 1 (`first-pass` branch) taught us one rule above all others:
**the player must always know what is happening, why, and what to do next.** If a line of dialogue,
a mechanic, or a screen would confuse someone who has never seen this doc, it is wrong.

## The people (real — be affectionate, be accurate)

**Aaron** — the user's little brother. A good guy. Programmer. Did karate as a kid. As a teen: World
of Warcraft and Magic: The Gathering. Played drums in the **Marching Ravens** (Baltimore Ravens
marching band). Tall, lean, strawberry-blond swoop, dark rectangular glasses, huge grin, grey tees.
Voice: earnest, enthusiastic, explains things in programmer terms, a little goofy, owns his mistakes.

**Victoria** — Aaron's wife. Strong, kind. Social worker for teens. Blonde, blue-eyed, speaks Spanish.
A fix-it girl. Crochets. Does not take any shit. Long wavy honey-blond hair, denim jacket, jeans,
white sneakers. Voice: warm, dry, competent, calm under pressure, never mean. No Spanish in her dialogue at all —
the user asked for it cut entirely. Don't add any.

Together: they just bought a really nice house, and they make bread together.

## Story (the whole premise fits in four lines — the opening cutscene says exactly this)

> It's party day. Aaron and Victoria's housewarming starts at **7 PM**.
> Aaron wrote **PartyPlanner.exe** to automate the prep. "What could go wrong?"
> He hits Run. The laptop sparks — and the program crashes *into the house*.
> Every room it tried to "prepare" has gone haywire. Fix them all before the guests arrive.

PartyPlanner is literal-minded and well-meaning. Each room is one of its functions gone wrong
(`make_snacks()` brought the sourdough starter to life). Its log lines are a running joke.
Cutscenes between rooms advance the plot: they find the crash log (office), they realize
PartyPlanner is *learning* (mid-game), it retreats to the pond and assembles itself (pre-finale),
and finally the party (ending, shaped by how well you did).

## The house = the game (all 9 areas must be beaten to win)

| # | Area | PartyPlanner called | What went weird | Objective (action) | Minigame (unique) | Favored |
|---|---|---|---|---|---|---|
| 1 | **Office** (tutorial) | `init()` | Laptop bugs became **real bugs** | Squash the bugs | **Bug Hunt** — click the bugs crawling through scrolling code before they compile | Aaron |
| 2 | **Kitchen** | `make_snacks()` | The **sourdough starter is alive**; dough blobs split when hit; toaster fires toast; kettle screams steam | Beat back the dough | **Bread Bake** — knead (rhythm), shape (trace), proof (timing), bake (pull it out golden) | — |
| 3 | **Dining room** | `set_table()` | Plates fly like frisbees; chairs charge like bulls | Wrangle the dining set | **Pour the Drinks** — color-sort logic: pour between glasses until each holds one drink | — |
| 4 | **Living room** | `clean_up()` | The Roomba is a tank; dust bunnies are actual bunnies; randomly built creepy dolls & teddies crawl out of the furniture and get creepier (darker room, glowing eyes, then freeze-when-watched) as the Roomba weakens | Defeat the Roomba | **Bunny Roundup** — herd dust bunnies into the vacuum bag | Victoria |
| 5 | **Playroom** | `add_entertainment()` | Board games came alive; playing cards march as soldiers | Clear the toy army | **Card Duel** — tiny card battle (a Magic: The Gathering nod) | Aaron |
| 6 | **Primary bedroom** | `fold_laundry()` | Laundry knotted into a **sock monster** | Defeat the sock monster | **Crochet Pattern** — repeat the stitch sequence to mend the quilt | Victoria |
| 7 | **Guest bedroom** | `fix_everything()` | Plumbing went rogue; ceiling leaks; rubber-duck army | Survive the flood | **Pipe Fixer** — rotate pipe tiles to route the water out | Victoria |
| 8 | **Backyard** | `decorate()` | Lawn is a jungle; garden-gnome army; the grill is a dragon | String the lights | **Drumline** — rhythm game drumming the gnomes into a marching band (Marching Ravens nod) | Aaron |
| 9 | **Pond** (finale) | `main()` | PartyPlanner assembles itself as a **giant koi made of code** | Defeat PartyPlanner | **Final Patch** — between boss phases, patch its exposed code (Aaron debugs, Victoria welds) | — |

**Unlocking (the strategy of order):** the hub is the house floor plan. A room is playable when
ANY room it requires is done. The Pond needs all 8 others. Designed so there are almost always
**2–3 choices**:
office → kitchen, living · kitchen → dining · living → playroom, primary · dining|primary → guest ·
playroom|guest → backyard · all 8 → pond.

**Party clock:** starts 10 AM, each room takes an hour → the pond ends at 7 PM. Narrative, not a fail state.

## How a room plays (always the same rhythm — the player learns it once)
1. **Intro cutscene** (≤ 6 lines): what went weird, what the goal is.
2. **Choose your hero** (Aaron or Victoria) + **loadout** (2 skill slots from earned skills).
   The room's favored hero gets a small bonus (shown on the select screen).
3. **Action stage**: top-down fight in that room. Objective always on screen.
4. **Minigame**: the room's unique puzzle/game. Taught by a 1-screen visual demo, no walls of text.
5. **Results**: 1–3 ⭐ (action performance + minigame score), Party Points, **new skill earned**.
6. **Outro cutscene** (≤ 4 lines) → back to the house, room now warm and lit.
Fail the action stage → retry (or swap hero). Fail the minigame → retry minigame only.

## Heroes & skills (earned — the player starts with ONE attack)
Movement, animation, and color from round 1 are loved — **keep them**. One hero on the field per room
(no tag-swap). Controls: arrow keys move (WASD still works but is never shown), mouse aim, **click/J** basic attack, **K/Shift** skill 1,
**E/L** skill 2, **Space** ultimate (once unlocked), **Esc/P** pause.

| Earned in | Aaron | Victoria |
|---|---|---|
| start | **Karate Kick** (basic) | **Wrench Whack** (basic) |
| Office | **Debug** — reveal & mark hidden enemies (crit on marked) | **Short Circuit** — a bolt that chains through up to 6 enemies; machines take extra damage and are stunned |
| Kitchen | **Bread Toss** — lob a baguette (ranged) | **Hot Pan** — wide sizzling swing, burns |
| Dining | **Plate Shield** — block & reflect | **Plate Shield** — block & reflect |
| Living | **Karate Sweep** — wide leg sweep trips everything (stun), then a spin kick launches it | **Throw Pillow** — ricocheting ranged |
| Playroom | **Tap a Card** — summon a random spell card | **Bouncy Ball** — bounces between enemies |
| Primary | **Sock Sling** — slow-on-hit ranged | **Crochet Net** — snare enemies in an area |
| Guest | **Mop Spin** — spinning, pushes water/enemies | **Wrench Throw** — boomerang wrench |
| Backyard | **Drumline** — rhythm shockwave, stronger on beat | **Garden Hose** — knockback stream |
| Pre-finale | ⚡ **Pull Aggro** (ultimate) — all enemies target you, you take half dmg (WoW tank nod) | ⚡ **Boundaries** (ultimate) — a ring nothing hostile can cross; everything inside is stunned |

## Strategy layer (light, meaningful)
Room order (unlock graph) · hero choice per room · 2-slot loadout · **Party Points** (from stars) spent
in the hub on **Party Touches** (small perks: "Good Coffee" +10% speed, "Playlist" +minigame time,
"Snack Table" heal per room, "Extra Chairs"...) · final **party score** = total stars → ending variant.

## Presentation
- Keep round-1 palette warmth and hero animation feel. The house is cozy, real-feeling: wood floors,
  rugs, plants, warm lamps; each room's "weird" has its own accent color.
- **Likeness**: big **photo cutout busts** (real face + real hair, transparent background) in cutscenes,
  dialogue, select screen. In-world sprites keep chibi bodies with tight face crops; bodies drawn to match
  real outfits (Aaron: grey tee, dark shorts / jeans, sneakers; Victoria: denim jacket or white tee, jeans,
  white sneakers). Expressions are conveyed by bust animation (bounce, shake, lean, sweat drop, sparkle),
  never by altering faces.
- PartyPlanner "speaks" in monospace log lines with a blinking cursor.

## Writing rules (the round-1 failure — non-negotiable)
- Every line either tells the player what to do or shows who these two are. No unexplained references.
- Lines ≤ 90 chars, ≤ 6 lines per cutscene beat. Humor is gentle and specific to them.
- First time any mechanic appears, a one-line prompt + visual shows how ("Press K: Debug").
- No Spanish in Victoria's dialogue, not even one word — user feedback, round 3.
