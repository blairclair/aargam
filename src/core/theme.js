// THEME BIBLE (code form). Owned by: supervisor. See docs/DESIGN.md for the prose version.
// Every module should pull names, colors and canonical ids from here so the game
// reads as one world. Request changes from the supervisor instead of editing.

export const GAME_TITLE = 'Aaron & Victoria: Housewarming';

export const WIDTH = 960;
export const HEIGHT = 540;

// Shared palette — warm late-summer tones vs. the icy villain palette.
export const PALETTE = {
  ink: '#10131f',
  night: '#1b2238',
  paper: '#fff6e5',
  sun: '#ffc94a',
  sunDeep: '#f29f2e',
  mint: '#7fd8a6',       // Victoria's mint-chip scoop
  mintDeep: '#3fa874',
  choc: '#5a3a2a',
  brick: '#a8483a',      // Old City brick
  brickDark: '#6e2c25',
  lake: '#4f8fb3',
  pine: '#3f7a4a',
  sky: '#5aa4e6',
  denim: '#5b7fa6',      // Victoria's jacket / jeans
  tee: '#8d95a3',        // Aaron's grey tee
  frost: '#bfe9ff',      // villain / enemies
  frostDeep: '#6fb7e8',
  ice: '#e8f8ff',
  danger: '#ff5d5d',
  heal: '#8cff9e',
};

export const FONT = {
  ui: '16px "Trebuchet MS", system-ui, sans-serif',
  big: 'bold 40px "Trebuchet MS", system-ui, sans-serif',
  title: 'bold 56px "Trebuchet MS", system-ui, sans-serif',
  small: '12px "Trebuchet MS", system-ui, sans-serif',
};

// ============================================================ v2: HOUSEWARMING
// Canonical heroes. Base stats; earned skills live in game.state.skills.
export const HEROES = {
  aaron: {
    id: 'aaron', name: 'Aaron', title: 'The Programmer',
    portrait: 'portrait.aaron', face: 'face.aaron',
    busts: { smile: 'bust.aaron.smile' },  // transparent photo cutouts for cutscenes/dialog/select
    look: { hair: '#c99a5b', shirt: PALETTE.tee, pants: '#2b2f3a', glasses: true, skin: '#f2c7a5' },
    base: { maxHp: 120, speed: 190, damage: 18 },
    basic: 'kick',
    // legacy (round 1) — still read by old action/hud code until migrated:
    abilities: { attack: { name: 'Karate Kick', cooldown: 0.45 }, ability: { name: 'Debug', cooldown: 6 }, special: { name: 'Bread Toss', cooldown: 4 } },
  },
  victoria: {
    id: 'victoria', name: 'Victoria', title: 'The Fixer',
    portrait: 'portrait.victoria', face: 'face.victoria',
    busts: { smile: 'bust.victoria.smile', neutral: 'bust.victoria.neutral' },
    look: { hair: '#d9b47a', shirt: '#1f2540', jacket: PALETTE.denim, pants: '#4a6b94', glasses: false, skin: '#f4cdb0' },
    base: { maxHp: 105, speed: 200, damage: 16 },
    basic: 'wrench',
    abilities: { attack: { name: 'Wrench Whack', cooldown: 0.4 }, ability: { name: 'Unplug', cooldown: 6 }, special: { name: 'Hot Pan', cooldown: 4 } },
  },
};
export const HERO_IDS = ['aaron', 'victoria'];

// Skills. slot: 'basic' (always equipped) | 'skill' (2 equip slots) | 'ultimate'. Action implements, art draws icons.
export const SKILLS = {
  kick:         { id: 'kick', hero: 'aaron', slot: 'basic', name: 'Karate Kick', desc: 'Quick kick. Childhood karate pays off.', earnedIn: 'start' },
  wrench:       { id: 'wrench', hero: 'victoria', slot: 'basic', name: 'Wrench Whack', desc: 'A solid whack. Also fixes things.', earnedIn: 'start' },
  debug:        { id: 'debug', hero: 'aaron', slot: 'skill', name: 'Debug', desc: 'Reveal hidden enemies; marked enemies take extra damage.', earnedIn: 'office' },
  unplug:       { id: 'unplug', hero: 'victoria', slot: 'skill', name: 'Unplug', desc: 'Stun electronic enemies in a cone.', earnedIn: 'office' },
  bread_toss:   { id: 'bread_toss', hero: 'aaron', slot: 'skill', name: 'Bread Toss', desc: 'Lob a baguette.', earnedIn: 'kitchen' },
  hot_pan:      { id: 'hot_pan', hero: 'victoria', slot: 'skill', name: 'Hot Pan', desc: 'Wide sizzling swing that burns.', earnedIn: 'kitchen' },
  plate_shield_a: { id: 'plate_shield_a', hero: 'aaron', slot: 'skill', name: 'Plate Shield', desc: 'Block and reflect shots.', earnedIn: 'dining' },
  plate_shield_v: { id: 'plate_shield_v', hero: 'victoria', slot: 'skill', name: 'Plate Shield', desc: 'Block and reflect shots.', earnedIn: 'dining' },
  karate_sweep: { id: 'karate_sweep', hero: 'aaron', slot: 'skill', name: 'Karate Sweep', desc: 'Spinning kick with knockback.', earnedIn: 'living' },
  throw_pillow: { id: 'throw_pillow', hero: 'victoria', slot: 'skill', name: 'Throw Pillow', desc: 'Ricocheting pillow.', earnedIn: 'living' },
  tap_card:     { id: 'tap_card', hero: 'aaron', slot: 'skill', name: 'Tap a Card', desc: 'Cast a random spell card.', earnedIn: 'playroom' },
  bouncy_ball:  { id: 'bouncy_ball', hero: 'victoria', slot: 'skill', name: 'Bouncy Ball', desc: 'Bounces between enemies.', earnedIn: 'playroom' },
  sock_sling:   { id: 'sock_sling', hero: 'aaron', slot: 'skill', name: 'Sock Sling', desc: 'Ranged; slows on hit.', earnedIn: 'primary' },
  crochet_net:  { id: 'crochet_net', hero: 'victoria', slot: 'skill', name: 'Crochet Net', desc: 'Snare enemies in an area.', earnedIn: 'primary' },
  mop_spin:     { id: 'mop_spin', hero: 'aaron', slot: 'skill', name: 'Mop Spin', desc: 'Spin that pushes water and enemies.', earnedIn: 'guest' },
  wrench_throw: { id: 'wrench_throw', hero: 'victoria', slot: 'skill', name: 'Wrench Throw', desc: 'Boomerang wrench.', earnedIn: 'guest' },
  drumline:     { id: 'drumline', hero: 'aaron', slot: 'skill', name: 'Drumline', desc: 'Rhythm shockwave; stronger on the beat.', earnedIn: 'backyard' },
  garden_hose:  { id: 'garden_hose', hero: 'victoria', slot: 'skill', name: 'Garden Hose', desc: 'Knockback water stream.', earnedIn: 'backyard' },
  pull_aggro:   { id: 'pull_aggro', hero: 'aaron', slot: 'ultimate', name: 'Pull Aggro', desc: 'Everything targets you; you take half damage.', earnedIn: 'prefinale' },
  boundaries:   { id: 'boundaries', hero: 'victoria', slot: 'ultimate', name: 'Boundaries', desc: 'A ring nothing hostile can cross; everything inside is stunned.', earnedIn: 'prefinale' },
};

// The house. requires = ANY of these done unlocks the room ('*' = all other rooms).
export const ROOMS = {
  office:   { id: 'office', name: 'Office', fn: 'init()', weird: 'Laptop bugs became real bugs', objective: 'Squash the bugs', minigame: 'Bug Hunt', favored: 'aaron', requires: [], hour: 10, accent: '#7fd8a6', enemies: ['beetle', 'moth', 'cable_spider'], skills: { aaron: 'debug', victoria: 'unplug' } },
  kitchen:  { id: 'kitchen', name: 'Kitchen', fn: 'make_snacks()', weird: 'The sourdough starter is alive', objective: 'Beat back the dough', minigame: 'Bread Bake', favored: null, requires: ['office'], accent: '#f2c26b', enemies: ['dough_blob', 'toaster', 'kettle'], skills: { aaron: 'bread_toss', victoria: 'hot_pan' } },
  living:   { id: 'living', name: 'Living Room', fn: 'clean_up()', weird: 'The Roomba is a tank; dust bunnies are bunnies', objective: 'Defeat the Roomba', minigame: 'Bunny Roundup', favored: 'victoria', requires: ['office'], accent: '#c9a0dc', enemies: ['dust_bunny', 'roomba'], skills: { aaron: 'karate_sweep', victoria: 'throw_pillow' } },
  dining:   { id: 'dining', name: 'Dining Room', fn: 'set_table()', weird: 'Plates fly; chairs charge', objective: 'Wrangle the dining set', minigame: 'Pour the Drinks', favored: null, requires: ['kitchen'], accent: '#e98aa8', enemies: ['flying_plate', 'chair'], skills: { aaron: 'plate_shield_a', victoria: 'plate_shield_v' } },
  playroom: { id: 'playroom', name: 'Playroom', fn: 'add_entertainment()', weird: 'Board games came alive', objective: 'Clear the toy army', minigame: 'Card Duel', favored: 'aaron', requires: ['living'], accent: '#5aa4e6', enemies: ['card_soldier', 'pawn', 'jack_box'], skills: { aaron: 'tap_card', victoria: 'bouncy_ball' } },
  primary:  { id: 'primary', name: 'Primary Bedroom', fn: 'fold_laundry()', weird: 'The laundry is a sock monster', objective: 'Defeat the sock monster', minigame: 'Crochet Pattern', favored: 'victoria', requires: ['living'], accent: '#ff8fb1', enemies: ['lint', 'hanger', 'sock_monster'], skills: { aaron: 'sock_sling', victoria: 'crochet_net' } },
  guest:    { id: 'guest', name: 'Guest Bedroom', fn: 'fix_everything()', weird: 'The plumbing went rogue', objective: 'Survive the flood', minigame: 'Pipe Fixer', favored: 'victoria', requires: ['dining', 'primary'], accent: '#4f8fb3', enemies: ['rubber_duck', 'pipe_snake', 'drip'], skills: { aaron: 'mop_spin', victoria: 'wrench_throw' } },
  backyard: { id: 'backyard', name: 'Backyard', fn: 'decorate()', weird: 'Gnome army; the grill is a dragon', objective: 'String the lights', minigame: 'Drumline', favored: 'aaron', requires: ['playroom', 'guest'], accent: '#3f7a4a', enemies: ['gnome', 'vine', 'grill_dragon'], skills: { aaron: 'drumline', victoria: 'garden_hose' } },
  pond:     { id: 'pond', name: 'Pond', fn: 'main()', weird: 'PartyPlanner became a giant code koi', objective: 'Defeat PartyPlanner', minigame: 'Final Patch', favored: null, requires: ['*'], accent: '#6fb7e8', enemies: ['code_fish', 'partyplanner'], skills: {} },
};
export const ROOM_IDS = ['office', 'kitchen', 'living', 'dining', 'playroom', 'primary', 'guest', 'backyard', 'pond'];
export const START_HOUR = 10; // party at 19:00

// v2 enemy roster (behaviors: action; looks: art). Legacy round-1 enemies kept below until migrated.
export const ENEMIES = {
  beetle:        { id: 'beetle', name: 'Syntax Beetle', hp: 18, speed: 95, damage: 7, room: 'office', role: 'swarmer' },
  moth:          { id: 'moth', name: 'Packet Moth', hp: 12, speed: 130, damage: 5, room: 'office', role: 'erratic flyer' },
  cable_spider:  { id: 'cable_spider', name: 'Cable Spider', hp: 40, speed: 70, damage: 10, room: 'office', role: 'webs that slow', electronic: true },
  dough_blob:    { id: 'dough_blob', name: 'Dough Blob', hp: 30, speed: 60, damage: 8, room: 'kitchen', role: 'splits in two when hit' },
  toaster:       { id: 'toaster', name: 'Toaster Turret', hp: 45, speed: 0, damage: 9, room: 'kitchen', role: 'fires toast', electronic: true },
  kettle:        { id: 'kettle', name: 'Screaming Kettle', hp: 60, speed: 50, damage: 12, room: 'kitchen', role: 'steam cone' },
  flying_plate:  { id: 'flying_plate', name: 'Flying Plate', hp: 14, speed: 160, damage: 8, room: 'dining', role: 'frisbee arcs' },
  chair:         { id: 'chair', name: 'Bull Chair', hp: 50, speed: 140, damage: 14, room: 'dining', role: 'telegraphed charge' },
  dust_bunny:    { id: 'dust_bunny', name: 'Dust Bunny', hp: 10, speed: 150, damage: 4, room: 'living', role: 'fast hopper, flees' },
  roomba:        { id: 'roomba', name: 'Roomba Tank', hp: 320, speed: 70, damage: 18, room: 'living', role: 'mini-boss: suction + bumper charge', electronic: true, boss: true },
  card_soldier:  { id: 'card_soldier', name: 'Card Soldier', hp: 28, speed: 80, damage: 9, room: 'playroom', role: 'formation marcher' },
  pawn:          { id: 'pawn', name: 'Pawn', hp: 35, speed: 60, damage: 10, room: 'playroom', role: 'hops grid squares' },
  jack_box:      { id: 'jack_box', name: 'Jack-in-the-Box', hp: 55, speed: 0, damage: 14, room: 'playroom', role: 'pop-up ambush' },
  lint:          { id: 'lint', name: 'Lint Sprite', hp: 10, speed: 110, damage: 4, room: 'primary', role: 'swarm' },
  hanger:        { id: 'hanger', name: 'Hanger Hawk', hp: 25, speed: 140, damage: 9, room: 'primary', role: 'swooping flyer' },
  sock_monster:  { id: 'sock_monster', name: 'Sock Monster', hp: 420, speed: 65, damage: 20, room: 'primary', role: 'boss: grabs, throws socks', boss: true },
  rubber_duck:   { id: 'rubber_duck', name: 'Rubber Duck', hp: 16, speed: 100, damage: 6, room: 'guest', role: 'swarm, squeaks' },
  pipe_snake:    { id: 'pipe_snake', name: 'Pipe Snake', hp: 45, speed: 85, damage: 11, room: 'guest', role: 'bursts from walls' },
  drip:          { id: 'drip', name: 'Leak', hp: 1, speed: 0, damage: 6, room: 'guest', role: 'hazard puddles from ceiling' },
  gnome:         { id: 'gnome', name: 'Garden Gnome', hp: 30, speed: 75, damage: 9, room: 'backyard', role: 'marching formation' },
  vine:          { id: 'vine', name: 'Jungle Vine', hp: 40, speed: 0, damage: 8, room: 'backyard', role: 'grabs & roots' },
  grill_dragon:  { id: 'grill_dragon', name: 'Grill Dragon', hp: 380, speed: 60, damage: 20, room: 'backyard', role: 'mini-boss: charcoal breath', boss: true },
  code_fish:     { id: 'code_fish', name: 'Code Fish', hp: 20, speed: 110, damage: 7, room: 'pond', role: 'leaps from water' },
  partyplanner:  { id: 'partyplanner', name: 'PartyPlanner.exe', hp: 1200, speed: 80, damage: 24, room: 'pond', role: 'final boss: 3 phases', boss: true },
  // ---- legacy round-1 roster (remove once src/action and src/art have migrated) ----
  frostling: { id: 'frostling', name: 'Frostling', hp: 20, speed: 90, damage: 8, role: 'swarmer', legacy: true },
  brainfreezer: { id: 'brainfreezer', name: 'Brain Freezer', hp: 30, speed: 60, damage: 10, role: 'ranged', legacy: true },
  popsicle_knight: { id: 'popsicle_knight', name: 'Popsicle Knight', hp: 70, speed: 70, damage: 16, role: 'shielded melee', legacy: true },
  slush_golem: { id: 'slush_golem', name: 'Slush Golem', hp: 220, speed: 40, damage: 26, role: 'mini-boss', legacy: true },
  baron_brrr: { id: 'baron_brrr', name: 'Baron von Brrr', hp: 900, speed: 80, damage: 30, role: 'final boss', legacy: true },
};

// Party Touches — bought in the hub with Party Points (state.purchases). Canonical ids; hub sells them,
// `who` says which team applies the effect. Unknown ids must be ignored everywhere.
export const PERKS = {
  good_coffee:  { id: 'good_coffee', name: 'Good Coffee', cost: 20, who: 'action', desc: '+10% move speed in rooms' },
  snack_table:  { id: 'snack_table', name: 'Snack Table', cost: 30, who: 'action', desc: '+20 max HP in rooms' },
  playlist:     { id: 'playlist', name: 'The Playlist', cost: 20, who: 'minigames', desc: '+20% time in minigames' },
  comfy_shoes:  { id: 'comfy_shoes', name: 'Comfy Shoes', cost: 30, who: 'action', desc: 'Skills recharge 15% faster' },
  extra_chairs: { id: 'extra_chairs', name: 'Extra Chairs', cost: 10, who: 'hub', desc: 'Cosmetic: more seats for guests' },
  fairy_lights: { id: 'fairy_lights', name: 'Fairy Lights', cost: 15, who: 'hub', desc: 'Cosmetic: the house twinkles' },
  welcome_mat:  { id: 'welcome_mat', name: 'Welcome Mat', cost: 10, who: 'hub', desc: 'Cosmetic: a punny doormat' },
};

// Dialog speakers that aren't heroes. Dialog shows `name` on the plate; narrator has no plate.
export const SPEAKERS = {
  narrator: { name: '', style: 'narration' },
  partyplanner: { name: 'PartyPlanner.exe', color: '#7fd8a6', style: 'terminal' },
  guest: { name: 'Guest', color: '#ffc94a', style: 'normal' },
  baron: { name: 'Baron von Brrr', color: '#6fb7e8', style: 'villain' }, // legacy
  townsfolk: { name: 'Grateful Local', color: '#ffc94a', style: 'normal' }, // legacy
};

// Canonical sound + music names (audio implements, everyone else just calls them; unknown names are ignored).
export const SFX = ['click', 'hit', 'hurt', 'swing', 'throw', 'dash', 'shield', 'shout', 'bloom', 'pickup', 'swap', 'victory', 'defeat', 'freeze', 'thaw',
  'blip', 'kick', 'whack', 'squish', 'pour', 'drum', 'stitch', 'pipe', 'card', 'unlock', 'star', 'error', 'type', 'boing', 'splash'];
export const MUSIC = ['title', 'house', 'room', 'boss', 'minigame', 'cutscene', 'party',
  'overworld', 'camp', 'battle']; // last three legacy

// ============================================================ LEGACY (round 1) — do not use in new code
export const REGIONS = {
  lakeside: { id: 'lakeside', name: 'Lakeside Camp', ground: '#d8c79a', accent: PALETTE.lake },
  oldcity: { id: 'oldcity', name: 'Old City', ground: '#b8675a', accent: PALETTE.brick },
  summit: { id: 'summit', name: 'Blue Ridge Summit', ground: '#7aa36b', accent: PALETTE.sky },
};
export const REGION_IDS = ['lakeside', 'oldcity', 'summit'];
export const MISSION_KINDS = { skirmish: 'Clear all enemies', rescue: 'Free the frozen townsfolk', defend: 'Protect the cart', boss: 'Defeat the boss' };
export const RESOURCES = { scoops: { name: 'Scoops', color: PALETTE.mint }, sunshine: { name: 'Sunshine', color: PALETTE.sun } };
