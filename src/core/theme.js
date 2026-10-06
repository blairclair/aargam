// THEME BIBLE (code form). Owned by: supervisor. See docs/DESIGN.md for the prose version.
// Every module should pull names, colors and canonical ids from here so the game
// reads as one world. Request changes from the supervisor instead of editing.

export const GAME_TITLE = 'Aaron & Victoria: The Great Scoop Heist';

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

// Canonical heroes. Stats here are BASE values; upgrades live in game state.
export const HEROES = {
  aaron: {
    id: 'aaron',
    name: 'Aaron',
    title: 'The Trail Guide',
    portrait: 'portrait.aaron', // wider crop: HUD, dialog, title
    face: 'face.aaron',         // tight crop: in-world sprite heads
    look: { hair: '#c99a5b', shirt: PALETTE.tee, pants: '#2b2f3a', glasses: true, skin: '#f2c7a5' },
    base: { maxHp: 120, speed: 190, damage: 18 },
    // Melee bruiser: hiking-pole sweep, Compass Dash, Summit Shout (stun).
    abilities: {
      attack: { name: 'Pole Sweep', cooldown: 0.45 },
      ability: { name: 'Compass Dash', cooldown: 3.5 },
      special: { name: 'Summit Shout', cooldown: 14 },
    },
  },
  victoria: {
    id: 'victoria',
    name: 'Victoria',
    title: 'The Old City Explorer',
    portrait: 'portrait.victoria',
    face: 'face.victoria',
    look: { hair: '#d9b47a', shirt: '#1f2540', jacket: PALETTE.denim, pants: '#4a6b94', glasses: false, skin: '#f4cdb0' },
    base: { maxHp: 95, speed: 205, damage: 14 },
    // Ranged tactician: flings mint-chip scoops, Denim Shield, Flower Box Bloom (heal zone).
    abilities: {
      attack: { name: 'Mint-Chip Fling', cooldown: 0.3 },
      ability: { name: 'Denim Shield', cooldown: 6 },
      special: { name: 'Flower Box Bloom', cooldown: 16 },
    },
  },
};
export const HERO_IDS = ['aaron', 'victoria'];

// Dialog speakers that aren't heroes. Dialog shows `name` on the name plate; narrator has no plate.
export const SPEAKERS = {
  narrator: { name: '', style: 'narration' },
  baron: { name: 'Baron von Brrr', color: '#6fb7e8', style: 'villain' },
  townsfolk: { name: 'Grateful Local', color: '#ffc94a', style: 'normal' },
};

// Regions are drawn from places in the photos.
export const REGIONS = {
  lakeside: { id: 'lakeside', name: 'Lakeside Camp', blurb: 'The pavilion by the lake, sandy paths, picnic tables, pines.', ground: '#d8c79a', accent: PALETTE.lake },
  oldcity: { id: 'oldcity', name: 'Old City', blurb: 'Brick alleys, lamp posts, flower boxes, colonial doors.', ground: '#b8675a', accent: PALETTE.brick },
  summit: { id: 'summit', name: 'Blue Ridge Summit', blurb: 'Hazy blue mountains, bright pines — and the Baron\'s ice fortress.', ground: '#7aa36b', accent: PALETTE.sky },
};
export const REGION_IDS = ['lakeside', 'oldcity', 'summit'];

// Canonical enemy roster (the Sorbet Syndicate). Action owns behavior; art owns looks.
export const ENEMIES = {
  frostling: { id: 'frostling', name: 'Frostling', hp: 20, speed: 90, damage: 8, role: 'swarmer' },
  brainfreezer: { id: 'brainfreezer', name: 'Brain Freezer', hp: 30, speed: 60, damage: 10, role: 'ranged: lobs slush' },
  popsicle_knight: { id: 'popsicle_knight', name: 'Popsicle Knight', hp: 70, speed: 70, damage: 16, role: 'shielded melee' },
  slush_golem: { id: 'slush_golem', name: 'Slush Golem', hp: 220, speed: 40, damage: 26, role: 'mini-boss' },
  baron_brrr: { id: 'baron_brrr', name: 'Baron von Brrr', hp: 900, speed: 80, damage: 30, role: 'final boss' },
};

// Mission kinds the strategy layer can launch; action must support all of them.
export const MISSION_KINDS = {
  skirmish: 'Clear all enemies',
  rescue: 'Free the frozen townsfolk (break the ice blocks) and survive',
  defend: 'Protect the ice-cream cart for N seconds',
  boss: 'Defeat the region boss',
};

// Resources the strategy layer tracks.
export const RESOURCES = {
  scoops: { name: 'Scoops', color: PALETTE.mint, blurb: 'Recovered ice cream. Main currency.' },
  sunshine: { name: 'Sunshine', color: PALETTE.sun, blurb: 'Pushes back the frost on the map.' },
};

// Canonical sound + music names (audio implements, everyone else just calls them).
export const SFX = ['click', 'hit', 'hurt', 'swing', 'throw', 'dash', 'shield', 'shout', 'bloom', 'pickup', 'swap', 'victory', 'defeat', 'freeze', 'thaw'];
export const MUSIC = ['title', 'overworld', 'camp', 'battle', 'boss'];
