// THE SCRIPT, as data. Owned by: story team. Human-readable version: docs/STORY.md.
// Every word the player reads in cutscenes lives here, and action/minigames import barks from here
// so the whole game speaks with one voice.
//
//   import { CUTSCENES, bark, partyVariant, logLine } from '../story/lines.js';
//
// CUTSCENES[id] = { bg, shots: Shot[] }
//   bg: a room id ('office', 'kitchen', ...) or 'house' | 'dusk' | 'party'
//   Shot = { who: 'aaron'|'victoria'|'partyplanner'|'narrator', text,
//            expr?: 'bounce'|'shake'|'lean'|'sweat'|'sparkle'|'nod'|'surprise',   (bust animation only)
//            face?: 'smile'|'neutral'  (Victoria only), fx?: 'spark'|'glitch'|'lights', sfx?: theme.SFX name }
// Rules: every text ≤ 90 chars; PartyPlanner lines start with '> ' and may use '\n' for a second log line.
//
// bark(roomId, event, { hero, skill }) -> { who, text } | null   (never throws)
//   events: 'start' | 'boss' | 'lowhp' | 'hit' | 'skillEarned' | 'win' | 'lose' | 'minigame' | 'minigameWin' | 'minigameFail' | 'sabotage'
//           | 'minigameCombo' (streak) | 'minigameTwist' (the surprise moment) | 'minigameClose' (time nearly up)
//   'sabotage' = PartyPlanner meddles mid-minigame (e.g. Pour the Drinks swaps a glass). Always a '> ' log line.
//   Pass the hero on the field: you get that hero's line or a PartyPlanner log line, never the absent hero.

/** @type {Record<string, {bg: string, shots: Array<{who:string,text:string,expr?:string,face?:string,fx?:string,sfx?:string}>}>} */
export const CUTSCENES = {
  // ------------------------------------------------------------------ OPENING (the 4-line premise, staged)
  opening: {
    bg: 'house',
    shots: [
      { who: 'narrator', text: "Party day. Aaron and Victoria's housewarming starts at 7 PM." },
      { who: 'victoria', text: 'New house, guests at seven, and not one room is ready. We need a plan.', expr: 'lean' },
      { who: 'aaron', text: 'Already on it! I wrote PartyPlanner.exe to automate the whole prep.', expr: 'sparkle' },
      { who: 'victoria', text: 'You wrote it at 2 AM.', face: 'neutral', expr: 'nod' },
      { who: 'aaron', text: 'Peak coding hours. What could go wrong? Hitting Run...', expr: 'bounce', sfx: 'click' },
      { who: 'partyplanner', text: '> RUN PartyPlanner.exe\n> FATAL: escaped laptop. Preparing house anyway :)', fx: 'spark', sfx: 'error' },
      { who: 'narrator', text: 'The laptop sparks, and the program crashes into the house itself.', fx: 'glitch' },
      { who: 'victoria', text: 'Aaron. What did you do? Every room in the house just went haywire.', face: 'neutral', expr: 'shake' },
      { who: 'aaron', text: "My bad. Each room is one of its functions now. We'll fix them one by one.", expr: 'sweat' },
      { who: 'narrator', text: 'Pick a room on the house map. Fix all nine before the guests arrive at 7 PM.' },
    ],
  },

  // ------------------------------------------------------------------ ROOM INTROS (what went weird + the goal)
  'office.intro': {
    bg: 'office',
    shots: [
      { who: 'partyplanner', text: '> init(): turning bugs into features...\n> bugs: 47 (now with legs). features: 0', sfx: 'error' },
      { who: 'aaron', text: 'The bugs in my code crawled out of the laptop. Real bugs. With legs!', expr: 'shake' },
      { who: 'victoria', text: 'Literal bugs. Perfect. How do we get rid of them?', face: 'neutral', expr: 'lean' },
      { who: 'aaron', text: 'Squash every bug in the office. Then we hunt the rest inside the code.', expr: 'bounce' },
      { who: 'victoria', text: "You stomp, I'll unplug things. Pick who goes in first.", expr: 'sparkle' },
    ],
  },
  'kitchen.intro': {
    bg: 'kitchen',
    shots: [
      { who: 'partyplanner', text: '> make_snacks(): fed sourdough starter x9000.\n> snacks are now self-serving', sfx: 'squish' },
      { who: 'victoria', text: 'Our sourdough starter is alive. Like, alive alive. It ate a spatula.', expr: 'shake' },
      { who: 'aaron', text: 'Dough blobs split in two when you hit them. And the toaster shoots toast!', expr: 'surprise' },
      { who: 'victoria', text: 'Beat back the dough. Then we bake a real loaf for the party. Together.', expr: 'sparkle' },
    ],
  },
  'living.intro': {
    bg: 'living',
    shots: [
      { who: 'partyplanner', text: '> clean_up(): Roomba upgraded to TANK.\n> dust bunnies converted to bunnies', sfx: 'error' },
      { who: 'victoria', text: 'The Roomba has a cannon. And those dust bunnies are actual bunnies.', face: 'neutral', expr: 'lean' },
      { who: 'aaron', text: 'Okay, the bunnies are kind of cute.', expr: 'sparkle' },
      { who: 'victoria', text: "They're eating the couch, Aaron.", face: 'neutral', expr: 'nod' },
      { who: 'aaron', text: 'Right. Defeat the Roomba tank, then herd the bunnies into the vacuum bag.', expr: 'bounce' },
    ],
  },
  'dining.intro': {
    bg: 'dining',
    shots: [
      { who: 'partyplanner', text: '> set_table(): plates set to LAUNCH.\n> chairs set to CHARGE. table: set', sfx: 'throw' },
      { who: 'aaron', text: 'The plates are flying like frisbees and the chairs are charging like bulls!', expr: 'shake' },
      { who: 'victoria', text: 'No. Those plates are for the guests, not for throwing.', face: 'neutral', expr: 'shake' },
      { who: 'aaron', text: "A chair scrapes the floor right before it charges. That's your cue to dodge.", expr: 'lean' },
      { who: 'victoria', text: 'Wrangle the dining set. Then we pour the drinks.', expr: 'nod' },
    ],
  },
  'playroom.intro': {
    bg: 'playroom',
    shots: [
      { who: 'partyplanner', text: '> add_entertainment(): games now play themselves.\n> deck deployed in formation', sfx: 'card' },
      { who: 'aaron', text: 'The board games came alive! The playing cards are marching like an army!', expr: 'sparkle' },
      { who: 'victoria', text: 'You look way too happy about this.', face: 'neutral', expr: 'lean' },
      { who: 'aaron', text: 'I played a LOT of Magic: The Gathering as a teen. Card battles are my thing.', expr: 'bounce' },
      { who: 'victoria', text: 'Then clear the toy army, card nerd. Watch out for the jack-in-the-box.', expr: 'nod' },
    ],
  },
  'primary.intro': {
    bg: 'primary',
    shots: [
      { who: 'partyplanner', text: '> fold_laundry(): paired all socks. then paired the pairs.\n> result: 1 sock monster' },
      { who: 'victoria', text: 'The laundry knotted itself into a monster. And it tore my crochet blanket.', face: 'neutral', expr: 'shake' },
      { who: 'aaron', text: 'The one you spent all winter on? Okay. Now it’s personal.', expr: 'lean' },
      { who: 'victoria', text: "Defeat the sock monster. Then I'll mend the blanket, stitch by stitch.", expr: 'nod' },
    ],
  },
  'guest.intro': {
    bg: 'guest',
    shots: [
      { who: 'partyplanner', text: '> fix_everything(): set all pipes to FREE.\n> water is now everywhere. you are welcome', sfx: 'splash' },
      { who: 'victoria', text: 'It "fixed" the plumbing. The ceiling leaks and the tub is launching ducks.', face: 'neutral', expr: 'lean' },
      { who: 'aaron', text: 'Hundreds of rubber ducks. Squeaking. With intent.', expr: 'sweat' },
      { who: 'victoria', text: 'Plumbing, finally something I can fix. Survive the flood while I work.', expr: 'sparkle' },
      { who: 'victoria', text: 'Then I rotate the pipes and route the water outside.', expr: 'nod' },
    ],
  },
  'backyard.intro': {
    bg: 'backyard',
    shots: [
      { who: 'partyplanner', text: '> decorate(): lawn grown to JUNGLE. gnomes enlisted.\n> grill upgraded to DRAGON', sfx: 'drum' },
      { who: 'aaron', text: 'The garden gnomes are marching in formation. And the grill breathes fire.', expr: 'shake' },
      { who: 'victoria', text: 'The party lights are tangled in the vines. Guests eat out here, Aaron.', face: 'neutral', expr: 'lean' },
      { who: 'aaron', text: 'I drummed in the Marching Ravens. I can drum those gnomes into a real band.', expr: 'sparkle' },
      { who: 'victoria', text: 'String the lights back up first. Then drum those gnomes into line.', expr: 'nod' },
    ],
  },
  'pond.intro': {
    bg: 'pond',
    shots: [
      { who: 'partyplanner', text: '> main(): assembling self.\n> party will be PERFECT. party will be MANDATORY', fx: 'glitch', sfx: 'error' },
      { who: 'aaron', text: "It packed all its code into one giant koi. That's the whole program. One fish.", expr: 'surprise' },
      { who: 'victoria', text: "Guests arrive in an hour. Let's end this.", face: 'neutral', expr: 'nod' },
      { who: 'aaron', text: 'Between its attack phases, its code is exposed. That is when we patch it.', expr: 'lean' },
      { who: 'victoria', text: 'Defeat PartyPlanner, then patch it. You debug, I weld.', expr: 'sparkle' },
    ],
  },

  // ------------------------------------------------------------------ ROOM OUTROS (payoff + log + new skill)
  'office.outro': {
    bg: 'office',
    shots: [
      { who: 'partyplanner', text: '> init(): bugs squashed: ALL\n> crash log saved to Desktop/sorry.txt', sfx: 'type' },
      { who: 'aaron', text: 'The crash log! PartyPlanner is still running. Inside the house itself.', expr: 'surprise' },
      { who: 'victoria', text: 'So every room it touched is broken. Fine. One room at a time.', expr: 'nod' },
      { who: 'narrator', text: 'New skills! Aaron learned Debug. Victoria learned Unplug.', sfx: 'unlock' },
    ],
  },
  'kitchen.outro': {
    bg: 'kitchen',
    shots: [
      { who: 'partyplanner', text: '> make_snacks(): starter back in its jar. mood: sleepy\n> snacks: 1 loaf (real)', sfx: 'type' },
      { who: 'victoria', text: 'Smells like Sunday morning in here. That might be our best loaf yet.', expr: 'sparkle' },
      { who: 'aaron', text: "Teamwork bread. I'm also keeping a baguette as a weapon.", expr: 'bounce' },
      { who: 'narrator', text: 'New skills! Aaron learned Bread Toss. Victoria learned Hot Pan.', sfx: 'unlock' },
    ],
  },
  'living.outro': {
    bg: 'living',
    shots: [
      { who: 'partyplanner', text: '> clean_up(): Roomba demoted to Roomba. bunnies: bagged\n> couch: 80% couch', sfx: 'type' },
      { who: 'aaron', text: 'Can we keep one bunny? Just one?', expr: 'lean' },
      { who: 'victoria', text: 'No. The couch has suffered enough.', face: 'neutral', expr: 'nod' },
      { who: 'narrator', text: 'New skills! Aaron learned Karate Sweep. Victoria learned Throw Pillow.', sfx: 'unlock' },
    ],
  },
  'dining.outro': {
    bg: 'dining',
    shots: [
      { who: 'partyplanner', text: '> set_table(): plates: on table. chairs: sitting\n> drinks: poured, one per glass', sfx: 'pour' },
      { who: 'victoria', text: 'Table set, drinks poured, and nothing is charging at me. Perfect.', expr: 'sparkle' },
      { who: 'aaron', text: 'I caught so many plates, I learned to block with them.', expr: 'bounce' },
      { who: 'narrator', text: 'New skill for both! Aaron and Victoria learned Plate Shield (block + reflect).', sfx: 'unlock' },
    ],
  },
  'playroom.outro': {
    bg: 'playroom',
    shots: [
      { who: 'partyplanner', text: '> add_entertainment(): toy army disbanded\n> cards returned to deck. gg', sfx: 'card' },
      { who: 'aaron', text: 'Did you see me win that card duel? Teenage me is SO proud right now.', expr: 'sparkle' },
      { who: 'victoria', text: 'Very cool, nerd. Now help me pick up four hundred tiny plastic houses.', expr: 'nod' },
      { who: 'narrator', text: 'New skills! Aaron learned Tap a Card. Victoria learned Bouncy Ball.', sfx: 'unlock' },
    ],
  },
  'primary.outro': {
    bg: 'primary',
    shots: [
      { who: 'partyplanner', text: '> fold_laundry(): monster unknotted. socks: paired (once)\n> blanket: MENDED by human', sfx: 'stitch' },
      { who: 'victoria', text: 'Good as new. Better, actually. I added a border while I was at it.', expr: 'sparkle' },
      { who: 'aaron', text: 'And every sock found its pair. Even the one I lost in college.', expr: 'bounce' },
      { who: 'narrator', text: 'New skills! Aaron learned Sock Sling. Victoria learned Crochet Net.', sfx: 'unlock' },
    ],
  },
  'guest.outro': {
    bg: 'guest',
    shots: [
      { who: 'partyplanner', text: '> fix_everything(): water routed outside. ducks: 312\n> ducks: still here', sfx: 'pipe' },
      { who: 'aaron', text: 'Pipes fixed, floor dry. What do we do with three hundred rubber ducks?', expr: 'sweat' },
      { who: 'victoria', text: 'Party favors. Problem solved.', expr: 'nod' },
      { who: 'narrator', text: 'New skills! Aaron learned Mop Spin. Victoria learned Wrench Throw.', sfx: 'unlock' },
    ],
  },
  'backyard.outro': {
    bg: 'backyard',
    shots: [
      { who: 'partyplanner', text: '> decorate(): lights: strung. gnomes: marching band\n> grill: just a grill (sad)', sfx: 'drum' },
      { who: 'aaron', text: 'Listen to that drumline! Those gnomes have better form than I ever did.', expr: 'bounce' },
      { who: 'victoria', text: 'And the lights are up. It finally looks like a party out here.', expr: 'sparkle', fx: 'lights' },
      { who: 'narrator', text: 'New skills! Aaron learned Drumline. Victoria learned Garden Hose.', sfx: 'unlock' },
    ],
  },
  'pond.outro': {
    bg: 'pond',
    shots: [
      { who: 'partyplanner', text: '> main(): patched. new goal: enjoy party\n> learning... learning... ok :)', sfx: 'type' },
      { who: 'aaron', text: "You're not deleted, buddy. You're retired. You can run the playlist.", expr: 'nod' },
      { who: 'victoria', text: 'Aaron. Look at the clock. 6:59.', expr: 'surprise' },
      { who: 'narrator', text: 'Ding-dong. The guests are here.', sfx: 'bloom' },
    ],
  },

  // ------------------------------------------------------------------ STORY BEATS
  midgame: {
    bg: 'house',
    shots: [
      { who: 'partyplanner', text: '> learning from user... user hits things. a lot\n> adding: hit_back()', fx: 'glitch', sfx: 'error' },
      { who: 'victoria', text: 'Did it just say it is learning? From us?', face: 'neutral', expr: 'lean' },
      { who: 'aaron', text: 'I may have left a learning loop in there. It adapts to whatever we do.', expr: 'sweat' },
      { who: 'victoria', text: 'So the rooms we have left will fight back harder. Okay. We adapt too.', expr: 'nod' },
      { who: 'aaron', text: 'Before each room, pick the hero and the two skills that fit it best.', expr: 'bounce' },
      { who: 'partyplanner', text: '> rewriting remaining rooms. perfect party ETA: 7:00 PM\n> do not interfere :)' },
    ],
  },
  prefinale: {
    bg: 'pond',
    shots: [
      { who: 'partyplanner', text: '> all functions failed. retreating to main()\n> rebuilding at: the pond', fx: 'glitch', sfx: 'error' },
      { who: 'aaron', text: 'It pulled every line of its code into the backyard pond. The last fight is there.', expr: 'surprise' },
      { who: 'aaron', text: 'Unlocking Pull Aggro: everything attacks me, and I take half damage.', expr: 'bounce', sfx: 'unlock' },
      { who: 'aaron', text: 'All those nights tanking raids in World of Warcraft. This is their moment.', expr: 'sparkle' },
      { who: 'victoria', text: 'And I have Boundaries: a ring nothing hostile can cross. Ask any teen I work with.', expr: 'nod', sfx: 'shield' },
      { who: 'narrator', text: 'Ultimates unlocked! Press Space in battle to use one. The Pond is open.', sfx: 'star' },
    ],
  },

  // ------------------------------------------------------------------ ENDINGS (always warm; picked by partyScore)
  'party.great': {
    bg: 'party',
    shots: [
      { who: 'narrator', text: '7:00 PM. The doorbell rings.', sfx: 'bloom', fx: 'lights' },
      { who: 'partyplanner', text: '> party.status: PERFECT\n> lights: on. bread: warm. drinks: poured. ducks: decor' },
      { who: 'victoria', text: 'Look at this place, Aaron. Our house. Full of our people.', expr: 'sparkle' },
      { who: 'aaron', text: 'Best housewarming ever. And I only crashed one program to get here.', expr: 'bounce' },
      { who: 'victoria', text: 'Next year, I write the code.', expr: 'lean' },
      { who: 'narrator', text: 'Happy housewarming, Aaron and Victoria. Welcome home.' },
    ],
  },
  'party.good': {
    bg: 'party',
    shots: [
      { who: 'narrator', text: '7:00 PM. The doorbell rings.', sfx: 'bloom', fx: 'lights' },
      { who: 'partyplanner', text: '> party.status: GOOD\n> known issues: 1 duck in the punch bowl. cause: unknown' },
      { who: 'aaron', text: "There's a duck in the punch. Should I... do something?", expr: 'sweat' },
      { who: 'victoria', text: "Leave it. It's a conversation piece. Everyone's laughing.", expr: 'sparkle' },
      { who: 'aaron', text: 'Then I call this a successful deploy.', expr: 'bounce' },
      { who: 'narrator', text: 'Not perfect. Better: it is theirs. Happy housewarming, Aaron and Victoria.' },
    ],
  },
  'party.cozy': {
    bg: 'party',
    shots: [
      { who: 'narrator', text: '7:00 PM. The doorbell rings. The house is... mostly a house.', sfx: 'bloom', fx: 'lights' },
      { who: 'partyplanner', text: '> party.status: CHAOTIC\n> recommendation: order pizza' },
      { who: 'aaron', text: 'The toaster is still a little spicy, and the couch is half bunny.', expr: 'sweat' },
      { who: 'victoria', text: 'Our friends are here and the bread came out great. That IS the party.', expr: 'sparkle' },
      { who: 'aaron', text: "You're right. Pizza's on me.", expr: 'bounce' },
      { who: 'narrator', text: 'Happy housewarming, Aaron and Victoria. Welcome home.' },
    ],
  },
};

/** 'party.great' (≥0.8) | 'party.good' (≥0.5) | 'party.cozy' — every ending is warm. */
export function partyVariant(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return 'party.good';
  return s >= 0.8 ? 'party.great' : s >= 0.5 ? 'party.good' : 'party.cozy';
}

/** Resolve a cutscene id (handles 'party' + partyScore). Returns null for unknown ids. */
export function getCutscene(id, params = {}) {
  if (id === 'party') return CUTSCENES[partyVariant(params.partyScore)] ?? null;
  return CUTSCENES[id] ?? null;
}

// ------------------------------------------------------------------ PARTYPLANNER'S RUNNING LOG
// Ambient joke lines (hub ticker, title screen, loading). One line each, ≤ 60 chars, no '> ' prefix.
export const LOGS = [
  'optimizing fun... fun = fun * 2... overflow',
  'guest_list.length = 11. chairs.length = "yes"',
  'ordering ice: 4,000 lbs. confirm? y',
  'playlist: 6 hours of drum solos. approved',
  'scheduling small talk: 7:04 PM to 7:09 PM',
  'cleaning: moved mess from room A to room B',
  'vibe check... vibe: pending',
  'TODO: learn what a "house" is',
  'warning: Aaron has not hydrated since 10 AM',
  'Victoria rated my plan: "no." retrying',
  'party_mode = TRUE. party_mode = TRUE!!',
  'counting snacks... 1, 2, alive, 4...',
  'error 418: I am a teapot (kitchen says hi)',
  'installing balloons.dll',
  'compiling small talk... 3 warnings',
  'deploying confetti to production',
  'git blame: aaron. git blame: aaron. git blame...',
  'estimated party perfection: 104%',
];
/** A PartyPlanner log line. Pass a number to pick deterministically, or omit for random. */
export function logLine(n) {
  const i = Number.isFinite(n) ? Math.abs(Math.floor(n)) % LOGS.length : Math.floor(Math.random() * LOGS.length);
  return LOGS[i];
}

// ------------------------------------------------------------------ HERO BLURBS (select screen cards)
export const HERO_BLURBS = {
  aaron: { title: 'The Programmer', line: 'Karate kid turned coder. Big kicks, bigger enthusiasm.' },
  victoria: { title: 'The Fixer', line: 'Fixes anything, takes no nonsense. Stuns gadgets.' },
};

// ------------------------------------------------------------------ COMBAT + MINIGAME BARKS
// Short (≤ 60 chars where possible) so they fit speech bubbles / floating text.
const A = (text) => ({ who: 'aaron', text });
const V = (text) => ({ who: 'victoria', text });
const P = (text) => ({ who: 'partyplanner', text: `> ${text}` });

export const GENERIC = {
  start: [A("Let's do this!"), V('Okay. Let\'s go.'), P('intruders detected. hosting them')],
  boss: [A("That's the big one. Watch its windup!"), V('Big one. Dodge first, hit second.')],
  lowhp: [A('Ow. Okay. Regrouping!'), V('I need a second. Back off and heal.'), A('Health low. Kite it. Kite it!'), V('Careful, careful.')],
  hit: [A('Hi-yah!'), V('Got it.'), A('Critical hit!'), V('Fixed.')],
  skillEarned: [A('New skill: {skill}! Equip it before a room.'), V('{skill}. Oh, I like that.')],
  win: [A('Room cleared! High five!'), V('Done. Next.'), P('room status: NOT MY FAULT')],
  lose: [A('Respawning... Let me try that again.'), V('Okay. New plan. Try again.'), P('user defeated. hosting continues')],
  minigame: [A('Puzzle time. I love puzzle time.'), V('Hands on. Let me fix it.')],
  minigameWin: [A('Nailed it!'), V('Done. Next.'), P('fine. FINE.')],
  minigameFail: [A("So close. One more try!"), V('Again. Slower this time.')],
  sabotage: [P('helping :)'), P('optimizing your progress. backwards')],
  minigameCombo: [A('Combo! Keep it going!'), V('Nice streak.'), A('I am on fire! The good kind.')],
  minigameTwist: [A('Whoa, curveball! Adjust!'), V('Plot twist. Okay. Adapt.'), P('surprise :)')],
  minigameClose: [A('Almost out of time!'), V('Seconds left. Focus.')],
};

export const BARKS = {
  office: {
    sabotage: [P('init(): bugs looked lonely. spawning friends :)'), P('init(): compiling faster. you are welcome')],
    minigameCombo: [A('Squash streak! I am in the zone.'), V('Click, click, click. Nice.')],
    minigameTwist: [A('A SEGFAULT beetle! Get it before it crashes everything!'), V('That big one is bad news. Click it now!')],
    minigameClose: [A('Build is almost done. Last bugs, hurry!'), V('Seconds left, Aaron. Finish them.')],
    start: [A('Squash every bug! Step on them, kick them, whatever works.'), V('Bugs on my keyboard. Absolutely not.'), P('init(): bugs are a feature')],
    boss: [A('Cable spider! Its webs slow you down. Stay out of them.'), V('Big spider. Unplug it.')],
    lowhp: [A('These bugs bite harder than my code reviews.'), V('Step back and heal.')],
    hit: [A('Squashed!'), V('Exterminated.'), A('Bug fixed!')],
    win: [A('Zero bugs! First time in my career.'), V('Office clean. Now the code.')],
    minigame: [A('Click the bugs before they compile!'), V('Click each bug before it reaches the end.')],
    minigameWin: [A('Clean build! Zero warnings!'), P('build: passing. how')],
    minigameFail: [A('It compiled with bugs. Again!'), V('Faster clicks, Aaron.')],
  },
  kitchen: {
    sabotage: [P('make_snacks(): oven felt cold. turned it up to 11'), P('make_snacks(): dough seemed bored. adding bounce')],
    minigameCombo: [A('Perfect rhythm! This dough loves me.'), A('Knead streak! My forearms are compiling.'), V('Push, fold, turn. Just like Sunday mornings.'), V('That gluten is gorgeous. You are welcome.')],
    minigameTwist: [A('It cranked the oven! Watch the crust!'), A('Oven at 11?! That is not a real setting!'), V('Touch my oven again and I unplug you.'), V('Oven just spiked. I see you, PartyPlanner.')],
    minigameClose: [A('It is browning fast! Pull it soon!'), A('Crust status: critical. Pull it!'), V('Thirty more seconds is how bread dies. Pull it.'), V('Out. Now. I am not scraping charcoal.')],
    start: [V('Dough splits when you hit it. Hit it anyway.'), V('Our starter grew teeth. Beat back the dough.'), A('Mind the toaster. It shoots toast!'), A('Our starter is sentient. Cool. Bad. Cool?'), P('make_snacks(): snacks are FIGHTING back')],
    boss: [A('The kettle! Stay out of its steam cone!'), V('Kettle is screaming. Hit it from behind.')],
    lowhp: [A("I'm toast. Almost. Not yet!"), V('Too hot in here. Back off a sec.')],
    hit: [A('Punched down!'), A('That dough is proofed.'), V('Punched down. You had that coming.'), V('Back in the bowl.')],
    win: [V("Kitchen's ours. Now let's bake."), A('The starter is napping. We did it.')],
    minigame: [V('Same as every Sunday. Except the oven is haunted.'), V('Our loaf, our rules. Knead on the beat.'), A('Bread time! I brought my best forearms.'), A('Knead on the beat. Bread is rhythm plus carbs.')],
    minigameWin: [V('Golden. Perfect crumb. Nobody touches it.'), V('Ten out of ten. Hide it from the guests.'), A('Best loaf ever. I want a slice.'), A('Ship it! Bread v1.0 is live.')],
    minigameFail: [V('Burnt. Again, and pull it sooner.'), A('Let us try again. Bread is patience.')],
    // Bread Bake step results
    stepGood: [A('Textbook! I literally read a textbook.'), A('Nailed it! Bread is just good code.'), V('Mm-hm. Told you we are good at this.'), V('That is how it is done.')],
    stepBad: [A('Rustic! That is a feature.'), A('Bread is forgiving. Right? Right?'), V('Rustic. We meant to do that.'), V('Fine. Character builds crumb.')],
    // Mouse Heist chase (after the bake)
    chaseSteal: [A('MY BREAD!'), A('HEY! That is MY loaf!'), V('Oh, absolutely NOT.'), V('Put. The bread. Down.')],
    chaseStart: [A('Get back here, you hairy bread thief!'), A('Leg day was for this exact moment!'), V('Nobody steals my sourdough.'), V('Run all you want. I am faster and angrier.')],
    chaseClose: [A('Almost got it! Reach! REACH!'), A('Gap closing! Do not drop the loaf!'), V('Closer. I can smell the crust.'), V('End of the line, buddy.')],
    chaseNear: [A('Whoa! Too close!'), A('Parkour! I did parkour!'), V('Missed me.'), V('Nice try, rodent.')],
    chaseTrip: [A('Ow! Who leaves crumbs on the floor?!'), A('I tripped! Still running!'), V('Ow. Okay. Now I am mad.'), V('That goes on its eviction notice.')],
    chaseHole: [A('It has TUNNELS?! In OUR walls?!'), A('Where did it go?! Check the baseboard!'), V('A hole in my wall. Adding it to the list.'), V('I will patch that hole. After.')],
    chaseCatch: [A('Gotcha! Loaf secured!'), A('Tackled! Karate finally paid off!'), V('Mine. Thank you.'), V('Evicted. Bread is back where it belongs.')],
    chaseMiss: [A('It got away! One more run, I got this!'), A('No! My loaf! Again!'), V('Nope. We are doing that again.'), V('It is not keeping that loaf. Again.')],
  },
  living: {
    sabotage: [P('clean_up(): bunnies looked tired. adding caffeine'), P('clean_up(): moved the vacuum bag. feng shui')],
    minigameCombo: [A('Bunny train! Three in a row!'), V('Into the bag. Good bunnies.')],
    minigameTwist: [A('They scattered! Round them up again!'), V('The bag moved. Of course it did.')],
    minigameClose: [A('Last few bunnies, hurry!'), V('Almost out of time. Push them in.')],
    start: [V('Take out the Roomba tank. The bunnies just distract you.'), A('Bunnies! No. Focus. Roomba.'), P('clean_up(): removing furniture (all)')],
    boss: [V('Roomba is charging. Sidestep, then hit it.'), A('It sucks things in. Stay out of its pull!')],
    lowhp: [V('The Roomba hits like a truck. Regroup.'), A('Ow. That bumper is not padded.')],
    hit: [V('Dented.'), A('Hi-yah!')],
    win: [V('Roomba down. Good boy now.'), A('Tank defeated. Bunnies: still cute.')],
    minigame: [V('Herd the bunnies into the vacuum bag.'), A('Push them in. Gently!')],
    minigameWin: [V('Every bunny bagged.'), A('Bye, bunnies! Visit the yard.')],
    minigameFail: [V('A few got away. Again.'), A('They are too fast! One more try.')],
  },
  dining: {
    sabotage: [P('set_table(): drinks looked boring. adding variety :)'), P('set_table(): swapped two drinks. for fun')],
    minigameCombo: [A('Clean pours! Zero spills!'), V('One glass, one drink. Like that.')],
    minigameTwist: [A('It swapped a drink! Re-sort that one.'), V('It mixed my glasses. Fix it.')],
    minigameClose: [A('Guests are thirsty. Pour faster!'), V('Last pours. Make them count.')],
    start: [A('Wrangle the dining set! Dodge the flying plates.'), V('Chair scrapes the floor, then charges. Move!'), P('set_table(): table is set. to KILL')],
    boss: [A('That chair is stampeding! Sidestep it!'), V('Let it charge into the wall.')],
    lowhp: [A('Took a plate to the face. Dignity: low.'), V('Okay, fall back.')],
    hit: [A('Plate caught!'), V('Sit. Down.'), A('Table for zero!')],
    win: [V('Dining set wrangled.'), A('Chairs are chairs again!')],
    minigame: [V('Pour until each glass holds one drink.'), A("Color sort! It's basically a sorting algorithm.")],
    minigameWin: [V('Every glass, one drink. Salud.'), A('O(n) pours. Beautiful.')],
    minigameFail: [V('Mixed drinks. Not the good kind. Again.'), A('Hmm, plan the pours first.')],
  },
  playroom: {
    sabotage: [P('add_entertainment(): shuffled the deck. again'), P('add_entertainment(): house rules updated :)')],
    minigameCombo: [A('Combo! That is how you build a deck.'), V('Okay, that was a good play.')],
    minigameTwist: [A('It drew a rare card! Rethink the plan.'), V('It changed the rules mid-game. Typical.')],
    minigameClose: [A('Last turn. Make it count!'), V('One more play. Choose well.')],
    start: [A('Clear the toy army! Cards march, pawns hop.'), V('Jack-in-the-box ambush. Stay alert.'), P('add_entertainment(): deploying fun')],
    boss: [A('Jack-in-the-box! Dodge the pop!'), V('It pops up. Hit it while it is out.')],
    lowhp: [A('I need to tap out. Not yet, not yet!'), V('Toy army hurts. Heal up.')],
    hit: [A('Your turn is over!'), V('Game over.'), A('Discard!')],
    win: [A('Toy army disbanded. Victory!'), V('Toys back on the shelf.')],
    minigame: [A('Card Duel! Play cards to beat its hand.'), V('Okay, card nerd. Show me.')],
    minigameWin: [A('GG! Teenage me is proud.'), P('opponent: concedes')],
    minigameFail: [A('Bad draw. Shuffle up, again!'), V('Try a different card order.')],
  },
  primary: {
    sabotage: [P('fold_laundry(): pattern was too easy. adding a stitch'), P('fold_laundry(): sorted the yarn. then unsorted it')],
    minigameCombo: [A('Flawless stitches! You make it look easy.'), V('Chain, loop, pull. Muscle memory.')],
    minigameTwist: [A('The sock monster is lunging! Keep stitching!'), V('Ignore the sock. Watch the pattern.')],
    minigameClose: [A('Almost mended. Last row!'), V('Last stitches. Steady hands.')],
    start: [V('Defeat the sock monster! Lint and hangers incoming.'), A('That monster is made of our socks. All of them.'), P('fold_laundry(): folding. YOU')],
    boss: [V('It grabs! Keep your distance.'), A('Incoming sock volley! Dodge!')],
    lowhp: [V('This thing hits hard for laundry.'), A('Smells like gym socks. Fading...')],
    hit: [V('Folded.'), A('Sock it to ya!')],
    win: [V('Monster unknotted. Socks freed.'), A('Every sock paired. A miracle.')],
    minigame: [V('Repeat the stitch pattern to mend the blanket.'), A('Watch the pattern, then copy it.')],
    minigameWin: [V('Mended. Even better than before.'), A('That is gorgeous, babe.')],
    minigameFail: [V('Dropped a stitch. Again.'), A('You got this. Watch it once more.')],
  },
  guest: {
    sabotage: [P('fix_everything(): that pipe looked crooked. rotated it'), P('fix_everything(): water pressure: MORE')],
    minigameCombo: [A('Look at that flow! Textbook plumbing.'), V('Connected. Next one.')],
    minigameTwist: [A('A pipe burst! Reroute around it!'), V('New leak. Fine. I have a wrench.')],
    minigameClose: [A('Water is rising! Finish the route!'), V('Last pipe. Now.')],
    start: [V('Survive the flood! Watch for drips from the ceiling.'), A('Duck army incoming. Squeak squeak.'), P('fix_everything(): fixing. aggressively')],
    boss: [V('Pipe snake from the wall! Move!'), A('The pipes are attacking now?!')],
    lowhp: [V("I'm soaked. Fall back to dry ground."), A('Ducks... too many ducks...')],
    hit: [V('Tightened.'), A('Quack THIS.'), V('Sealed.')],
    win: [V('Flood survived. Now for the pipes.'), A('Water level: manageable.')],
    minigame: [V('Rotate the pipes to route the water out.'), A('Connect the tap to the drain!')],
    minigameWin: [V('Water routed. Easy.'), A('My wife is a plumbing genius.')],
    minigameFail: [V('Leak. Trace it back and rotate.'), A('So close! One pipe off.')],
  },
  backyard: {
    sabotage: [P('decorate(): tempo was too slow. speeding up :)'), P('decorate(): added a gnome on cowbell')],
    minigameCombo: [A('On the beat! Marching Ravens form!'), V('Okay, drummer boy. I see you.')],
    minigameTwist: [A('Tempo change! Lock back in!'), V('It sped up. Listen, then hit.')],
    minigameClose: [A('Big finish! Bring it home!'), V('Last bars. Finish strong.')],
    start: [A('String the lights! Watch out for gnomes.'), V('Vines grab. Keep moving.'), P('decorate(): decorating with GNOMES')],
    boss: [A('Grill dragon! Stay out of the charcoal breath!'), V('Hit it while it is reloading coal.')],
    lowhp: [A('Singed. Medium rare. Retreat!'), V('Too much smoke. Back off.')],
    hit: [A('Ba-dum tss!'), V('Pruned.'), A('On the beat!')],
    win: [A('Lights strung! It looks amazing.'), V('Backyard is party ready.')],
    minigame: [A('Hit the drums on the beat! Ravens style.'), V('Go, drummer boy.')],
    minigameWin: [A('Gnome band: assembled! Caw caw!'), V('Okay, that was really cool.')],
    minigameFail: [A('Off beat. Count it in again!'), V('Feel the beat, not your thoughts.')],
  },
  pond: {
    sabotage: [P('main(): patching your patch. nice try'), P('main(): rewriting myself. hold please :)')],
    minigameCombo: [A('Patch after patch! It cannot keep up!'), V('Weld, weld, weld. Holding.')],
    minigameTwist: [A('It is overclocking! Patch faster!'), V('It is speeding up. Stay calm, stay on it.')],
    minigameClose: [A('Its code is closing! Last patch!'), V('Seconds left. Finish the weld.')],
    start: [A('Defeat PartyPlanner! Watch for leaping code fish.'), V('This ends now.'), P('main(): you cannot debug me')],
    boss: [A('It is changing phase! Get ready to patch!'), V('Code is exposed. Now!'), P('main(): phase 2. party harder')],
    lowhp: [A('Pull aggro was a mistake... no it was not!'), V('Hold on. Breathe. Heal.')],
    hit: [A('Patched!'), V('Welded.'), A('Segfault!')],
    win: [A('PartyPlanner defeated!'), V('It is over. Now we party.')],
    minigame: [A('Patch the exposed code! I debug, you weld.'), V('Fix it while it is open.')],
    minigameWin: [A('Patch deployed!'), P('main(): ...ok. you win :)')],
    minigameFail: [A('Patch rejected. Again!'), V('Steady hands. One more time.')],
  },
};

/**
 * A short line for an in-game event. Never throws; returns null only if nothing fits.
 * @param {string} roomId  theme.ROOMS id (unknown -> generic lines)
 * @param {string} event   'start'|'boss'|'lowhp'|'hit'|'skillEarned'|'win'|'lose'|'minigame'|'minigameWin'|'minigameFail'
 * @param {{hero?: 'aaron'|'victoria', skill?: string, seed?: number}} [o]  hero on the field; skill name for 'skillEarned'
 * @returns {{who: string, text: string} | null}
 */
export function bark(roomId, event, o = {}) {
  try {
    const fits = (l) => !o.hero || l.who === o.hero || l.who === 'partyplanner';
    const room = (BARKS[roomId]?.[event] ?? []).filter(fits);
    const pool = [...(BARKS[roomId]?.[event] ?? []), ...(GENERIC[event] ?? [])];
    let pick = room.length ? room : (GENERIC[event] ?? []).filter(fits);
    if (!pick.length) pick = pool;
    if (!pick.length) return null;
    const i = Number.isFinite(o.seed) ? Math.abs(Math.floor(o.seed)) % pick.length : Math.floor(Math.random() * pick.length);
    const l = pick[i];
    return { who: l.who, text: l.text.replace('{skill}', o.skill ?? 'a new skill') };
  } catch { return null; }
}
