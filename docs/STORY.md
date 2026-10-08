# Aaron & Victoria: Housewarming — The Script

Owned by the **story** team. This file is generated from `src/story/lines.js` (the game's
source of truth), so what you read here is exactly what plays. Want a line changed? Ask story.

## How to use the voice (for action, minigame and hub teams)

```js
import { bark, logLine, CUTSCENES } from '../story/lines.js';
const line = bark('kitchen', 'start', { hero: 'victoria' }); // -> { who: 'victoria', text: '...' } or null
const log = logLine();                                        // -> 'optimizing fun... fun = fun * 2... overflow'
```

- **Events**: `start`, `boss`, `lowhp`, `hit`, `skillEarned` (pass `skill`), `win`, `lose`, `minigame`, `minigameWin`, `minigameFail`, `sabotage` (PartyPlanner meddles mid-minigame, e.g. swaps a drink), `minigameCombo` (streak), `minigameTwist` (surprise moment), `minigameClose` (time nearly up).
- `HERO_BLURBS[hero]` = `{ title, line }` for the hero cards on the select screen.
- Pass the hero on the field. You get that hero's line or a PartyPlanner log line, never the absent hero.
- PartyPlanner lines start with `> ` and are drawn monospace (terminal style).
- Please don't invent dialogue in your own files. If you need a line that isn't here, message story.

## Voice guide

- **Aaron**: earnest, enthusiastic, explains things in programmer terms, a bit goofy, owns his mistakes.
  Nods: karate, World of Warcraft (tanking), Magic: The Gathering, Marching Ravens drums.
- **Victoria**: warm, dry, competent, calm under pressure, never mean. Speaks Spanish, but it's one thing
  she can do, not her personality: one Spanish line in the whole script ("¿Qué hiciste?"). Nods: crochet, fixing things,
  teens social work (lightly).
- **PartyPlanner.exe**: literal-minded and well-meaning. Lowercase log lines, cheerful status reports,
  occasional `:)`. Each room is one of its functions gone wrong.
- **Narrator**: only for scene-setting and plain instructions ("Pick a room on the house map.").
- Every line tells the player what to do or shows who these two are. ≤ 90 characters. No in-jokes
  the player can't follow.

## Story spine

1. **Opening**: party at 7 PM, Aaron runs PartyPlanner.exe, it crashes into the house.
2. **Office** (always first): squash the bugs; the outro finds the crash log ("it's running inside the house").
3. Rooms 2–8 in any unlocked order. Each intro says what went weird and the goal; each outro pays it off,
   prints PartyPlanner's log, and names the new skills.
4. **Midgame** (after the 4th room): PartyPlanner is *learning* from them. Pick heroes and skills with care.
5. **Prefinale** (after the 8th room): it retreats to the pond. Ultimates unlock: **Pull Aggro** and **Boundaries**.
6. **Pond**: the code koi. Defeat it, patch it, retire it to playlist duty.
7. **Party**: one of three warm endings, by party score (stars earned / 27).

## Opening

### Opening  `opening`  (background: house)

- **NARRATOR**: Party day. Aaron and Victoria's housewarming starts at 7 PM.
- **VICTORIA** (*lean*): New house, guests at seven, and not one room is ready. We need a plan.
- **AARON** (*sparkle*): Already on it! I wrote PartyPlanner.exe to automate the whole prep.
- **VICTORIA** (*nod*, face: neutral): You wrote it at 2 AM.
- **AARON** (*bounce*, sfx: click): Peak coding hours. What could go wrong? Hitting Run...
- **PARTYPLANNER.EXE** (fx: spark, sfx: error)
  ```
  > RUN PartyPlanner.exe
  > FATAL: escaped laptop. Preparing house anyway :)
  ```
- **NARRATOR** (fx: glitch): The laptop sparks, and the program crashes into the house itself.
- **VICTORIA** (*shake*, face: neutral): Aaron. ¿Qué hiciste? Every room in the house just went haywire.
- **AARON** (*sweat*): My bad. Each room is one of its functions now. We'll fix them one by one.
- **NARRATOR**: Pick a room on the house map. Fix all nine before the guests arrive at 7 PM.

## Rooms

Each room: intro (≤ 6 lines) → hero select → action → minigame → results → outro (≤ 4 lines).
On screen during intros, the cutscene also shows a **GOAL** banner (theme.ROOMS objective) and the clock;
during outros it shows a **NEW SKILLS** card.

### Office

#### Intro  `office.intro`  (background: office)

- **PARTYPLANNER.EXE** (sfx: error)
  ```
  > init(): turning bugs into features...
  > bugs: 47 (now with legs). features: 0
  ```
- **AARON** (*shake*): The bugs in my code crawled out of the laptop. Real bugs. With legs!
- **VICTORIA** (*lean*, face: neutral): Literal bugs. Perfect. How do we get rid of them?
- **AARON** (*bounce*): Squash every bug in the office. Then we hunt the rest inside the code.
- **VICTORIA** (*nod*): You stomp, I'll unplug things. Pick who goes in first.

#### Outro  `office.outro`  (background: office)

- **PARTYPLANNER.EXE** (sfx: type)
  ```
  > init(): bugs squashed: ALL
  > crash log saved to Desktop/sorry.txt
  ```
- **AARON** (*surprise*): The crash log! PartyPlanner is still running. Inside the house itself.
- **VICTORIA** (*nod*): So every room it touched is broken. Fine. One room at a time.
- **NARRATOR** (sfx: unlock): New skills! Aaron learned Debug. Victoria learned Unplug.

### Kitchen

#### Intro  `kitchen.intro`  (background: kitchen)

- **PARTYPLANNER.EXE** (sfx: squish)
  ```
  > make_snacks(): fed sourdough starter x9000.
  > snacks are now self-serving
  ```
- **VICTORIA** (*shake*): Our sourdough starter is alive. Like, alive alive. It ate a spatula.
- **AARON** (*surprise*): Dough blobs split in two when you hit them. And the toaster shoots toast!
- **VICTORIA** (*nod*): Beat back the dough. Then we bake a real loaf for the party. Together.

#### Outro  `kitchen.outro`  (background: kitchen)

- **PARTYPLANNER.EXE** (sfx: type)
  ```
  > make_snacks(): starter back in its jar. mood: sleepy
  > snacks: 1 loaf (real)
  ```
- **VICTORIA** (*sparkle*): Smells like Sunday morning in here. That might be our best loaf yet.
- **AARON** (*bounce*): Teamwork bread. I'm also keeping a baguette as a weapon.
- **NARRATOR** (sfx: unlock): New skills! Aaron learned Bread Toss. Victoria learned Hot Pan.

### Living Room

#### Intro  `living.intro`  (background: living)

- **PARTYPLANNER.EXE** (sfx: error)
  ```
  > clean_up(): Roomba upgraded to TANK.
  > dust bunnies converted to bunnies
  ```
- **VICTORIA** (*lean*, face: neutral): The Roomba has a cannon. And those dust bunnies are actual bunnies.
- **AARON** (*sparkle*): Okay, the bunnies are kind of cute.
- **VICTORIA** (*nod*, face: neutral): They're eating the couch, Aaron.
- **AARON** (*bounce*): Right. Defeat the Roomba tank, then herd the bunnies into the vacuum bag.

#### Outro  `living.outro`  (background: living)

- **PARTYPLANNER.EXE** (sfx: type)
  ```
  > clean_up(): Roomba demoted to Roomba. bunnies: bagged
  > couch: 80% couch
  ```
- **AARON** (*lean*): Can we keep one bunny? Just one?
- **VICTORIA** (*nod*, face: neutral): No. The couch has suffered enough.
- **NARRATOR** (sfx: unlock): New skills! Aaron learned Karate Sweep. Victoria learned Throw Pillow.

### Dining Room

#### Intro  `dining.intro`  (background: dining)

- **PARTYPLANNER.EXE** (sfx: throw)
  ```
  > set_table(): plates set to LAUNCH.
  > chairs set to CHARGE. table: set
  ```
- **AARON** (*shake*): The plates are flying like frisbees and the chairs are charging like bulls!
- **VICTORIA** (*shake*, face: neutral): No. Those plates are for the guests, not for throwing.
- **AARON** (*lean*): A chair scrapes the floor right before it charges. That's your cue to dodge.
- **VICTORIA** (*nod*): Wrangle the dining set. Then we pour the drinks.

#### Outro  `dining.outro`  (background: dining)

- **PARTYPLANNER.EXE** (sfx: pour)
  ```
  > set_table(): plates: on table. chairs: sitting
  > drinks: poured, one per glass
  ```
- **VICTORIA** (*sparkle*): Table set, drinks poured, and nothing is charging at me. Perfect.
- **AARON** (*bounce*): I caught so many plates, I learned to block with them.
- **NARRATOR** (sfx: unlock): New skill for both! Aaron and Victoria learned Plate Shield (block + reflect).

### Playroom

#### Intro  `playroom.intro`  (background: playroom)

- **PARTYPLANNER.EXE** (sfx: card)
  ```
  > add_entertainment(): games now play themselves.
  > deck deployed in formation
  ```
- **AARON** (*sparkle*): The board games came alive! The playing cards are marching like an army!
- **VICTORIA** (*lean*, face: neutral): You look way too happy about this.
- **AARON** (*bounce*): I played a LOT of Magic: The Gathering as a teen. Card battles are my thing.
- **VICTORIA** (*nod*): Then clear the toy army, card nerd. Watch out for the jack-in-the-box.

#### Outro  `playroom.outro`  (background: playroom)

- **PARTYPLANNER.EXE** (sfx: card)
  ```
  > add_entertainment(): toy army disbanded
  > cards returned to deck. gg
  ```
- **AARON** (*sparkle*): Did you see me win that card duel? Teenage me is SO proud right now.
- **VICTORIA** (*nod*): Very cool, nerd. Now help me pick up four hundred tiny plastic houses.
- **NARRATOR** (sfx: unlock): New skills! Aaron learned Tap a Card. Victoria learned Bouncy Ball.

### Primary Bedroom

#### Intro  `primary.intro`  (background: primary)

- **PARTYPLANNER.EXE**
  ```
  > fold_laundry(): paired all socks. then paired the pairs.
  > result: 1 sock monster
  ```
- **VICTORIA** (*shake*, face: neutral): The laundry knotted itself into a monster. And it tore my crochet blanket.
- **AARON** (*lean*): The one you spent all winter on? Okay. Now it’s personal.
- **VICTORIA** (*nod*): Defeat the sock monster. Then I'll mend the blanket, stitch by stitch.

#### Outro  `primary.outro`  (background: primary)

- **PARTYPLANNER.EXE** (sfx: stitch)
  ```
  > fold_laundry(): monster unknotted. socks: paired (once)
  > blanket: MENDED by human
  ```
- **VICTORIA** (*sparkle*): Good as new. Better, actually. I added a border while I was at it.
- **AARON** (*bounce*): And every sock found its pair. Even the one I lost in college.
- **NARRATOR** (sfx: unlock): New skills! Aaron learned Sock Sling. Victoria learned Crochet Net.

### Guest Bedroom

#### Intro  `guest.intro`  (background: guest)

- **PARTYPLANNER.EXE** (sfx: splash)
  ```
  > fix_everything(): set all pipes to FREE.
  > water is now everywhere. you are welcome
  ```
- **VICTORIA** (*lean*, face: neutral): It "fixed" the plumbing. The ceiling leaks and the tub is launching ducks.
- **AARON** (*sweat*): Hundreds of rubber ducks. Squeaking. With intent.
- **VICTORIA** (*bounce*): Plumbing, finally something I can fix. Survive the flood while I work.
- **VICTORIA** (*nod*): Then I rotate the pipes and route the water outside.

#### Outro  `guest.outro`  (background: guest)

- **PARTYPLANNER.EXE** (sfx: pipe)
  ```
  > fix_everything(): water routed outside. ducks: 312
  > ducks: still here
  ```
- **AARON** (*sweat*): Pipes fixed, floor dry. What do we do with three hundred rubber ducks?
- **VICTORIA** (*nod*): Party favors. Problem solved.
- **NARRATOR** (sfx: unlock): New skills! Aaron learned Mop Spin. Victoria learned Wrench Throw.

### Backyard

#### Intro  `backyard.intro`  (background: backyard)

- **PARTYPLANNER.EXE** (sfx: drum)
  ```
  > decorate(): lawn grown to JUNGLE. gnomes enlisted.
  > grill upgraded to DRAGON
  ```
- **AARON** (*shake*): The garden gnomes are marching in formation. And the grill breathes fire.
- **VICTORIA** (*lean*, face: neutral): The party lights are tangled in the vines. Guests eat out here, Aaron.
- **AARON** (*sparkle*): I drummed in the Marching Ravens. I can drum those gnomes into a real band.
- **VICTORIA** (*nod*): String the lights back up first. Then drum those gnomes into line.

#### Outro  `backyard.outro`  (background: backyard)

- **PARTYPLANNER.EXE** (sfx: drum)
  ```
  > decorate(): lights: strung. gnomes: marching band
  > grill: just a grill (sad)
  ```
- **AARON** (*bounce*): Listen to that drumline! Those gnomes have better form than I ever did.
- **VICTORIA** (*sparkle*, fx: lights): And the lights are up. It finally looks like a party out here.
- **NARRATOR** (sfx: unlock): New skills! Aaron learned Drumline. Victoria learned Garden Hose.

### Pond (finale)

#### Intro  `pond.intro`  (background: pond)

- **PARTYPLANNER.EXE** (fx: glitch, sfx: error)
  ```
  > main(): assembling self.
  > party will be PERFECT. party will be MANDATORY
  ```
- **AARON** (*surprise*): It packed all its code into one giant koi. That's the whole program. One fish.
- **VICTORIA** (*nod*, face: neutral): Guests arrive in an hour. Let's end this.
- **AARON** (*lean*): Between its attack phases, its code is exposed. That is when we patch it.
- **VICTORIA** (*bounce*): Defeat PartyPlanner, then patch it. You debug, I weld.

#### Outro  `pond.outro`  (background: pond)

- **PARTYPLANNER.EXE** (sfx: type)
  ```
  > main(): patched. new goal: enjoy party
  > learning... learning... ok :)
  ```
- **AARON** (*nod*): You're not deleted, buddy. You're retired. You can run the playlist.
- **VICTORIA** (*surprise*): Aaron. Look at the clock. 6:59.
- **NARRATOR** (sfx: bloom): Ding-dong. The guests are here.

## Story beats

### Midgame (after the 4th room)  `midgame`  (background: house)

- **PARTYPLANNER.EXE** (fx: glitch, sfx: error)
  ```
  > learning from user... user hits things. a lot
  > adding: hit_back()
  ```
- **VICTORIA** (*lean*, face: neutral): Did it just say it is learning? From us?
- **AARON** (*sweat*): I may have left a learning loop in there. It adapts to whatever we do.
- **VICTORIA** (*nod*): So the rooms we have left will fight back harder. Okay. We adapt too.
- **AARON** (*bounce*): Before each room, pick the hero and the two skills that fit it best.
- **PARTYPLANNER.EXE**
  ```
  > rewriting remaining rooms. perfect party ETA: 7:00 PM
  > do not interfere :)
  ```

### Prefinale (after the 8th room; ultimates unlock)  `prefinale`  (background: pond)

- **PARTYPLANNER.EXE** (fx: glitch, sfx: error)
  ```
  > all functions failed. retreating to main()
  > rebuilding at: the pond
  ```
- **AARON** (*surprise*): It pulled every line of its code into the backyard pond. The last fight is there.
- **AARON** (*bounce*, sfx: unlock): Unlocking Pull Aggro: everything attacks me, and I take half damage.
- **AARON** (*sparkle*): All those nights tanking raids in World of Warcraft. This is their moment.
- **VICTORIA** (*nod*, sfx: shield): And I have Boundaries: a ring nothing hostile can cross. Ask any teen I work with.
- **NARRATOR** (sfx: star): Ultimates unlocked! Press Space in battle to use one. The Pond is open.

## The party (ending)

`partyScore` ≥ 0.8 → **great**, ≥ 0.5 → **good**, below → **cozy**. All three are warm; none is a failure.
After the last line, an end card reads "Happy housewarming! Welcome home." with the star total.

### Great  `party.great`  (background: party)

- **NARRATOR** (fx: lights, sfx: bloom): 7:00 PM. The doorbell rings.
- **PARTYPLANNER.EXE**
  ```
  > party.status: PERFECT
  > lights: on. bread: warm. drinks: poured. ducks: decor
  ```
- **VICTORIA** (*sparkle*): Look at this place, Aaron. Our house. Full of our people.
- **AARON** (*bounce*): Best housewarming ever. And I only crashed one program to get here.
- **VICTORIA** (*lean*): Next year, I write the code.
- **NARRATOR**: Happy housewarming, Aaron and Victoria. Welcome home.

### Good  `party.good`  (background: party)

- **NARRATOR** (fx: lights, sfx: bloom): 7:00 PM. The doorbell rings.
- **PARTYPLANNER.EXE**
  ```
  > party.status: GOOD
  > known issues: 1 duck in the punch bowl. cause: unknown
  ```
- **AARON** (*sweat*): There's a duck in the punch. Should I... do something?
- **VICTORIA** (*sparkle*): Leave it. It's a conversation piece. Everyone's laughing.
- **AARON** (*bounce*): Then I call this a successful deploy.
- **NARRATOR**: Not perfect. Better: it is theirs. Happy housewarming, Aaron and Victoria.

### Cozy  `party.cozy`  (background: party)

- **NARRATOR** (fx: lights, sfx: bloom): 7:00 PM. The doorbell rings. The house is... mostly a house.
- **PARTYPLANNER.EXE**
  ```
  > party.status: CHAOTIC
  > recommendation: order pizza
  ```
- **AARON** (*sweat*): The toaster is still a little spicy, and the couch is half bunny.
- **VICTORIA** (*sparkle*): Our friends are here and the bread came out great. That IS the party.
- **AARON** (*bounce*): You're right. Pizza's on me.
- **NARRATOR**: Happy housewarming, Aaron and Victoria. Welcome home.

## PartyPlanner's running log

Ambient lines for the hub ticker, title screen, loading. `logLine()` picks one.

- `> optimizing fun... fun = fun * 2... overflow`
- `> guest_list.length = 11. chairs.length = "yes"`
- `> ordering ice: 4,000 lbs. confirm? y`
- `> playlist: 6 hours of drum solos. approved`
- `> scheduling small talk: 7:04 PM to 7:09 PM`
- `> cleaning: moved mess from room A to room B`
- `> vibe check... vibe: pending`
- `> TODO: learn what a "house" is`
- `> warning: Aaron has not hydrated since 10 AM`
- `> Victoria rated my plan: "no." retrying`
- `> party_mode = TRUE. party_mode = TRUE!!`
- `> counting snacks... 1, 2, alive, 4...`
- `> error 418: I am a teapot (kitchen says hi)`
- `> installing balloons.dll`
- `> compiling small talk... 3 warnings`
- `> deploying confetti to production`
- `> git blame: aaron. git blame: aaron. git blame...`
- `> estimated party perfection: 104%`

## Combat and minigame barks

`bark(roomId, event, { hero })` picks from the room's lines first, then these generic ones.

### Office

- **sabotage**: PP: "> init(): bugs looked lonely. spawning friends :)" · PP: "> init(): compiling faster. you are welcome"
- **minigameCombo**: A: "Squash streak! I am in the zone." · V: "Click, click, click. Nice."
- **minigameTwist**: A: "A SEGFAULT beetle! Get it before it crashes everything!" · V: "That big one is bad news. Click it now!"
- **minigameClose**: A: "Build is almost done. Last bugs, hurry!" · V: "Seconds left, Aaron. Finish them."
- **start**: A: "Squash every bug! Step on them, kick them, whatever works." · V: "Bugs on my keyboard. Absolutely not." · PP: "> init(): bugs are a feature"
- **boss**: A: "Cable spider! Its webs slow you down. Stay out of them." · V: "Big spider. Unplug it."
- **lowhp**: A: "These bugs bite harder than my code reviews." · V: "Step back and heal."
- **hit**: A: "Squashed!" · V: "Exterminated." · A: "Bug fixed!"
- **win**: A: "Zero bugs! First time in my career." · V: "Office clean. Now the code."
- **minigame**: A: "Click the bugs before they compile!" · V: "Click each bug before it reaches the end."
- **minigameWin**: A: "Clean build! Zero warnings!" · PP: "> build: passing. how"
- **minigameFail**: A: "It compiled with bugs. Again!" · V: "Faster clicks, Aaron."

### Kitchen

- **sabotage**: PP: "> make_snacks(): oven felt cold. turned it up to 11" · PP: "> make_snacks(): dough seemed bored. adding bounce"
- **minigameCombo**: A: "Perfect rhythm! This dough loves me." · V: "Push, fold, turn. Just like Sunday mornings."
- **minigameTwist**: A: "The dough is fighting back! Steady!" · V: "Oven just spiked. Watch the crust!"
- **minigameClose**: A: "It is browning fast! Pull it soon!" · V: "Now or never. Take it out."
- **start**: V: "Beat back the dough! Careful, it splits when you hit it." · A: "Mind the toaster. It shoots toast!" · PP: "> make_snacks(): snacks are FIGHTING back"
- **boss**: A: "The kettle! Stay out of its steam cone!" · V: "Kettle is screaming. Hit it from behind."
- **lowhp**: A: "I'm toast. Almost. Not yet!" · V: "Too hot in here. Back off a sec."
- **hit**: A: "Punched down!" · V: "Kneaded." · A: "That dough is proofed."
- **win**: V: "Kitchen's ours. Now let's bake." · A: "The starter is napping. We did it."
- **minigame**: V: "Knead to the beat, then shape, proof and bake." · A: "Pull it out when the crust turns golden!"
- **minigameWin**: V: "Golden. Perfect crumb." · A: "Best loaf ever. I want a slice."
- **minigameFail**: V: "Burnt. Again, and pull it sooner." · A: "Let us try again. Bread is patience."

### Living Room

- **sabotage**: PP: "> clean_up(): bunnies looked tired. adding caffeine" · PP: "> clean_up(): moved the vacuum bag. feng shui"
- **minigameCombo**: A: "Bunny train! Three in a row!" · V: "Into the bag. Good bunnies."
- **minigameTwist**: A: "They scattered! Round them up again!" · V: "The bag moved. Of course it did."
- **minigameClose**: A: "Last few bunnies, hurry!" · V: "Almost out of time. Push them in."
- **start**: V: "Take out the Roomba tank. The bunnies just distract you." · A: "Bunnies! No. Focus. Roomba." · PP: "> clean_up(): removing furniture (all)"
- **boss**: V: "Roomba is charging. Sidestep, then hit it." · A: "It sucks things in. Stay out of its pull!"
- **lowhp**: V: "The Roomba hits like a truck. Regroup." · A: "Ow. That bumper is not padded."
- **hit**: V: "Dented." · A: "Hi-yah!"
- **win**: V: "Roomba down. Good boy now." · A: "Tank defeated. Bunnies: still cute."
- **minigame**: V: "Herd the bunnies into the vacuum bag." · A: "Push them in. Gently!"
- **minigameWin**: V: "Every bunny bagged." · A: "Bye, bunnies! Visit the yard."
- **minigameFail**: V: "A few got away. Again." · A: "They are too fast! One more try."

### Dining Room

- **sabotage**: PP: "> set_table(): drinks looked boring. adding variety :)" · PP: "> set_table(): swapped two drinks. for fun"
- **minigameCombo**: A: "Clean pours! Zero spills!" · V: "One glass, one drink. Like that."
- **minigameTwist**: A: "It swapped a drink! Re-sort that one." · V: "It mixed my glasses. Fix it."
- **minigameClose**: A: "Guests are thirsty. Pour faster!" · V: "Last pours. Make them count."
- **start**: A: "Wrangle the dining set! Dodge the flying plates." · V: "Chair scrapes the floor, then charges. Move!" · PP: "> set_table(): table is set. to KILL"
- **boss**: A: "That chair is stampeding! Sidestep it!" · V: "Let it charge into the wall."
- **lowhp**: A: "Took a plate to the face. Dignity: low." · V: "Okay, fall back."
- **hit**: A: "Plate caught!" · V: "Sit. Down." · A: "Table for zero!"
- **win**: V: "Dining set wrangled." · A: "Chairs are chairs again!"
- **minigame**: V: "Pour until each glass holds one drink." · A: "Color sort! It's basically a sorting algorithm."
- **minigameWin**: V: "Every glass, one drink. Salud." · A: "O(n) pours. Beautiful."
- **minigameFail**: V: "Mixed drinks. Not the good kind. Again." · A: "Hmm, plan the pours first."

### Playroom

- **sabotage**: PP: "> add_entertainment(): shuffled the deck. again" · PP: "> add_entertainment(): house rules updated :)"
- **minigameCombo**: A: "Combo! That is how you build a deck." · V: "Okay, that was a good play."
- **minigameTwist**: A: "It drew a rare card! Rethink the plan." · V: "It changed the rules mid-game. Typical."
- **minigameClose**: A: "Last turn. Make it count!" · V: "One more play. Choose well."
- **start**: A: "Clear the toy army! Cards march, pawns hop." · V: "Jack-in-the-box ambush. Stay alert." · PP: "> add_entertainment(): deploying fun"
- **boss**: A: "Jack-in-the-box! Dodge the pop!" · V: "It pops up. Hit it while it is out."
- **lowhp**: A: "I need to tap out. Not yet, not yet!" · V: "Toy army hurts. Heal up."
- **hit**: A: "Your turn is over!" · V: "Game over." · A: "Discard!"
- **win**: A: "Toy army disbanded. Victory!" · V: "Toys back on the shelf."
- **minigame**: A: "Card Duel! Play cards to beat its hand." · V: "Okay, card nerd. Show me."
- **minigameWin**: A: "GG! Teenage me is proud." · PP: "> opponent: concedes"
- **minigameFail**: A: "Bad draw. Shuffle up, again!" · V: "Try a different card order."

### Primary Bedroom

- **sabotage**: PP: "> fold_laundry(): pattern was too easy. adding a stitch" · PP: "> fold_laundry(): sorted the yarn. then unsorted it"
- **minigameCombo**: A: "Flawless stitches! You make it look easy." · V: "Chain, loop, pull. Muscle memory."
- **minigameTwist**: A: "The sock monster is lunging! Keep stitching!" · V: "Ignore the sock. Watch the pattern."
- **minigameClose**: A: "Almost mended. Last row!" · V: "Last stitches. Steady hands."
- **start**: V: "Defeat the sock monster! Lint and hangers incoming." · A: "That monster is made of our socks. All of them." · PP: "> fold_laundry(): folding. YOU"
- **boss**: V: "It grabs! Keep your distance." · A: "Incoming sock volley! Dodge!"
- **lowhp**: V: "This thing hits hard for laundry." · A: "Smells like gym socks. Fading..."
- **hit**: V: "Folded." · A: "Sock it to ya!"
- **win**: V: "Monster unknotted. Socks freed." · A: "Every sock paired. A miracle."
- **minigame**: V: "Repeat the stitch pattern to mend the blanket." · A: "Watch the pattern, then copy it."
- **minigameWin**: V: "Mended. Even better than before." · A: "That is gorgeous, babe."
- **minigameFail**: V: "Dropped a stitch. Again." · A: "You got this. Watch it once more."

### Guest Bedroom

- **sabotage**: PP: "> fix_everything(): that pipe looked crooked. rotated it" · PP: "> fix_everything(): water pressure: MORE"
- **minigameCombo**: A: "Look at that flow! Textbook plumbing." · V: "Connected. Next one."
- **minigameTwist**: A: "A pipe burst! Reroute around it!" · V: "New leak. Fine. I have a wrench."
- **minigameClose**: A: "Water is rising! Finish the route!" · V: "Last pipe. Now."
- **start**: V: "Survive the flood! Watch for drips from the ceiling." · A: "Duck army incoming. Squeak squeak." · PP: "> fix_everything(): fixing. aggressively"
- **boss**: V: "Pipe snake from the wall! Move!" · A: "The pipes are attacking now?!"
- **lowhp**: V: "I'm soaked. Fall back to dry ground." · A: "Ducks... too many ducks..."
- **hit**: V: "Tightened." · A: "Quack THIS." · V: "Sealed."
- **win**: V: "Flood survived. Now for the pipes." · A: "Water level: manageable."
- **minigame**: V: "Rotate the pipes to route the water out." · A: "Connect the tap to the drain!"
- **minigameWin**: V: "Water routed. Easy." · A: "My wife is a plumbing genius."
- **minigameFail**: V: "Leak. Trace it back and rotate." · A: "So close! One pipe off."

### Backyard

- **sabotage**: PP: "> decorate(): tempo was too slow. speeding up :)" · PP: "> decorate(): added a gnome on cowbell"
- **minigameCombo**: A: "On the beat! Marching Ravens form!" · V: "Okay, drummer boy. I see you."
- **minigameTwist**: A: "Tempo change! Lock back in!" · V: "It sped up. Listen, then hit."
- **minigameClose**: A: "Big finish! Bring it home!" · V: "Last bars. Finish strong."
- **start**: A: "String the lights! Watch out for gnomes." · V: "Vines grab. Keep moving." · PP: "> decorate(): decorating with GNOMES"
- **boss**: A: "Grill dragon! Stay out of the charcoal breath!" · V: "Hit it while it is reloading coal."
- **lowhp**: A: "Singed. Medium rare. Retreat!" · V: "Too much smoke. Back off."
- **hit**: A: "Ba-dum tss!" · V: "Pruned." · A: "On the beat!"
- **win**: A: "Lights strung! It looks amazing." · V: "Backyard is party ready."
- **minigame**: A: "Hit the drums on the beat! Ravens style." · V: "Go, drummer boy."
- **minigameWin**: A: "Gnome band: assembled! Caw caw!" · V: "Okay, that was really cool."
- **minigameFail**: A: "Off beat. Count it in again!" · V: "Feel the beat, not your thoughts."

### Pond (finale)

- **sabotage**: PP: "> main(): patching your patch. nice try" · PP: "> main(): rewriting myself. hold please :)"
- **minigameCombo**: A: "Patch after patch! It cannot keep up!" · V: "Weld, weld, weld. Holding."
- **minigameTwist**: A: "It is overclocking! Patch faster!" · V: "It is speeding up. Stay calm, stay on it."
- **minigameClose**: A: "Its code is closing! Last patch!" · V: "Seconds left. Finish the weld."
- **start**: A: "Defeat PartyPlanner! Watch for leaping code fish." · V: "This ends now." · PP: "> main(): you cannot debug me"
- **boss**: A: "It is changing phase! Get ready to patch!" · V: "Code is exposed. Now!" · PP: "> main(): phase 2. party harder"
- **lowhp**: A: "Pull aggro was a mistake... no it was not!" · V: "Hold on. Breathe. Heal."
- **hit**: A: "Patched!" · V: "Welded." · A: "Segfault!"
- **win**: A: "PartyPlanner defeated!" · V: "It is over. Now we party."
- **minigame**: A: "Patch the exposed code! I debug, you weld." · V: "Fix it while it is open."
- **minigameWin**: A: "Patch deployed!" · PP: "> main(): ...ok. you win :)"
- **minigameFail**: A: "Patch rejected. Again!" · V: "Steady hands. One more time."

### Generic (any room)

- **start**: A: "Let's do this!" · V: "Okay. Let's go." · PP: "> intruders detected. hosting them"
- **boss**: A: "That's the big one. Watch its windup!" · V: "Big one. Dodge first, hit second."
- **lowhp**: A: "Ow. Okay. Regrouping!" · V: "I need a second. Back off and heal." · A: "Health low. Kite it. Kite it!" · V: "Careful, careful."
- **hit**: A: "Hi-yah!" · V: "Got it." · A: "Critical hit!" · V: "Fixed."
- **skillEarned**: A: "New skill: {skill}! Equip it before a room." · V: "{skill}. Oh, I like that."
- **win**: A: "Room cleared! High five!" · V: "Done. Next." · PP: "> room status: NOT MY FAULT"
- **lose**: A: "Respawning... Let me try that again." · V: "Okay. New plan. Try again." · PP: "> user defeated. hosting continues"
- **minigame**: A: "Puzzle time. I love puzzle time." · V: "Hands on. Let me fix it."
- **minigameWin**: A: "Nailed it!" · V: "Done. Next." · PP: "> fine. FINE."
- **minigameFail**: A: "So close. One more try!" · V: "Again. Slower this time."
- **sabotage**: PP: "> helping :)" · PP: "> optimizing your progress. backwards"
- **minigameCombo**: A: "Combo! Keep it going!" · V: "Nice streak." · A: "I am on fire! The good kind."
- **minigameTwist**: A: "Whoa, curveball! Adjust!" · V: "Plot twist. Okay. Adapt." · PP: "> surprise :)"
- **minigameClose**: A: "Almost out of time!" · V: "Seconds left. Focus."
