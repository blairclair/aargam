// Static campaign data: map graph, upgrades, camp buildings, economy numbers. Owned by: strategy.
// Only DYNAMIC values (frost, cleared, shields...) live in game.state.map / game.state.camp;
// everything here is static and keyed by stable ids so saves stay small and robust.

export const ECON = {
  startScoops: 40,
  startSunshine: 2,
  dayLimit: 30,            // "Labor Day": the summer ends, the frost wins
  warmCost: 2,             // Sunshine: lower a node's frost by 1
  shieldCost: 1,           // Sunshine: protect a node from frost tonight
  campChillLimit: 3,       // camp chill reaching this = campaign lost
  defeatScoopKeep: 0.5,    // fraction of mission-collected scoops kept on defeat
};

export const REGION_BASE_DIFFICULTY = { lakeside: 1, oldcity: 2, summit: 3 };
export const REGION_ORDER = ['lakeside', 'oldcity', 'summit'];
// Golem that gates each region (beating it liberates the region and unlocks the next one).
export const REGION_GOLEM = { lakeside: 'sandbar', oldcity: 'clocktower', summit: 'glacier_gate' };

/**
 * Map nodes. x,y in 960x540 screen space. frost = starting frost (0..3).
 * kind: 'camp' (home, not playable) or a theme.MISSION_KINDS key.
 */
export const NODES = [
  // Lakeside Camp
  { id: 'camp', name: 'Lakeside Camp', region: 'lakeside', kind: 'camp', x: 62, y: 384, frost: 0, blurb: 'Home base. Tents, cocoa, and one blue toy bucket.' },
  { id: 'pavilion', name: 'The Pavilion', region: 'lakeside', kind: 'skirmish', x: 150, y: 300, frost: 1, blurb: 'Frostlings have taken the octagonal pavilion.' },
  { id: 'dock', name: 'Boat Dock', region: 'lakeside', kind: 'defend', x: 214, y: 398, frost: 1, blurb: 'Guard the ice-cream cart while the boats thaw.' },
  { id: 'picnic', name: 'Picnic Grove', region: 'lakeside', kind: 'rescue', x: 108, y: 168, frost: 2, blurb: 'Picnickers frozen mid-sandwich under the blue umbrella.' },
  { id: 'pines', name: 'Whispering Pines', region: 'lakeside', kind: 'skirmish', x: 222, y: 98, frost: 2, blurb: 'The pines are whispering. Mostly "brrr".' },
  { id: 'sandbar', name: 'Sandbar Showdown', region: 'lakeside', kind: 'boss', bossId: 'slush_golem', x: 284, y: 262, frost: 3, blurb: 'A Slush Golem blocks the road to the Old City.' },
  // Old City
  { id: 'elfreth', name: "Elfreth's Alley", region: 'oldcity', kind: 'skirmish', x: 378, y: 300, frost: 2, blurb: 'Colonial doors, brick, and far too many Frostlings.' },
  { id: 'lamplight', name: 'Lamplight Square', region: 'oldcity', kind: 'defend', x: 448, y: 176, frost: 2, blurb: 'Keep the cart safe under the iron lamp posts.' },
  { id: 'flowerbox', name: 'Flower Box Row', region: 'oldcity', kind: 'rescue', x: 470, y: 386, frost: 1, blurb: 'The mums and pumpkins are frozen. So are the shopkeepers.' },
  { id: 'market', name: 'Old Market Hall', region: 'oldcity', kind: 'skirmish', x: 556, y: 110, frost: 3, blurb: 'Popsicle Knights guard the stolen sprinkles.' },
  { id: 'clocktower', name: 'Clocktower Courtyard', region: 'oldcity', kind: 'boss', bossId: 'slush_golem', x: 590, y: 290, frost: 3, blurb: 'A bigger, slushier Golem. The clock is frozen at 3:14.' },
  // Blue Ridge Summit
  { id: 'overlook', name: 'Overlook Trail', region: 'summit', kind: 'skirmish', x: 690, y: 336, frost: 2, blurb: 'Best view in the land, if you can see past the snow.' },
  { id: 'switchback', name: 'Switchback Pines', region: 'summit', kind: 'rescue', x: 772, y: 404, frost: 2, blurb: 'Hikers frozen on the switchbacks. Aaron is outraged.' },
  { id: 'ranger', name: 'Ranger Lookout', region: 'summit', kind: 'defend', x: 772, y: 236, frost: 3, blurb: 'Hold the lookout while the cart climbs the ridge.' },
  { id: 'ridge', name: 'Hazy Ridge', region: 'summit', kind: 'skirmish', x: 880, y: 340, frost: 2, blurb: 'Blue haze, green pines, white frost. Mostly frost.' },
  { id: 'glacier_gate', name: 'Glacier Gate', region: 'summit', kind: 'boss', bossId: 'slush_golem', x: 852, y: 168, frost: 3, blurb: 'The last Slush Golem guards the fortress gate.' },
  { id: 'fortress', name: "Baron's Ice Fortress", region: 'summit', kind: 'boss', bossId: 'baron_brrr', x: 906, y: 74, frost: 3, blurb: 'Baron von Brrr. Monocle. Scepter. Every scoop in the land.' },
];

export const EDGES = [
  ['camp', 'pavilion'], ['camp', 'dock'], ['pavilion', 'picnic'], ['pavilion', 'dock'],
  ['picnic', 'pines'], ['pines', 'sandbar'], ['dock', 'sandbar'],
  ['sandbar', 'elfreth'],
  ['elfreth', 'lamplight'], ['elfreth', 'flowerbox'], ['lamplight', 'market'],
  ['market', 'clocktower'], ['flowerbox', 'clocktower'],
  ['clocktower', 'overlook'],
  ['overlook', 'switchback'], ['overlook', 'ranger'], ['switchback', 'ridge'],
  ['ranger', 'glacier_gate'], ['ridge', 'glacier_gate'], ['glacier_gate', 'fortress'],
];

export const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]));
export const NEIGHBORS = Object.fromEntries(NODES.map((n) => [n.id, []]));
for (const [a, b] of EDGES) { NEIGHBORS[a].push(b); NEIGHBORS[b].push(a); }

/**
 * Hero upgrades (the camp shop). `stat` upgrades are applied by strategy directly to
 * game.state.party.<hero> (maxHp/damage/speed) AND recorded in upgrades[]; action needs
 * to do nothing for them. `ability` upgrades are interpreted by action (see docs/teams/upgrades.md).
 * `requires` = id that must be owned first. IDS ARE STABLE: never rename.
 */
export const UPGRADES = [
  // Aaron
  { id: 'aaron.hp_1', hero: 'aaron', name: 'Trail Mix', type: 'stat', stat: { maxHp: 20 }, cost: 60, desc: '+20 max HP' },
  { id: 'aaron.hp_2', hero: 'aaron', name: 'Trail Mix Deluxe', type: 'stat', stat: { maxHp: 30 }, cost: 130, requires: 'aaron.hp_1', desc: '+30 max HP' },
  { id: 'aaron.dmg_1', hero: 'aaron', name: 'Carbon Hiking Pole', type: 'stat', stat: { damage: 4 }, cost: 70, desc: '+4 Pole Sweep damage' },
  { id: 'aaron.dmg_2', hero: 'aaron', name: 'Summit-Grade Pole', type: 'stat', stat: { damage: 6 }, cost: 150, requires: 'aaron.dmg_1', desc: '+6 Pole Sweep damage' },
  { id: 'aaron.speed_1', hero: 'aaron', name: 'Broken-In Sneakers', type: 'stat', stat: { speed: 15 }, cost: 80, desc: '+15 move speed' },
  { id: 'aaron.dash_damage', hero: 'aaron', name: 'Compass Dash: Trailblazer', type: 'ability', cost: 140, desc: 'Compass Dash damages enemies' },
  { id: 'aaron.quick_dash', hero: 'aaron', name: 'Compass Dash: Shortcut', type: 'ability', cost: 110, desc: '-30% Compass Dash cooldown' },
  { id: 'aaron.wide_sweep', hero: 'aaron', name: 'Pole Sweep: Wide Arc', type: 'ability', cost: 120, desc: 'Bigger Pole Sweep arc and reach' },
  { id: 'aaron.long_shout', hero: 'aaron', name: 'Summit Shout: Echo', type: 'ability', cost: 160, desc: 'Bigger Shout radius, longer stun' },
  // Victoria
  { id: 'victoria.hp_1', hero: 'victoria', name: 'Cozy Sweater', type: 'stat', stat: { maxHp: 15 }, cost: 60, desc: '+15 max HP' },
  { id: 'victoria.hp_2', hero: 'victoria', name: 'Extra-Cozy Sweater', type: 'stat', stat: { maxHp: 25 }, cost: 130, requires: 'victoria.hp_1', desc: '+25 max HP' },
  { id: 'victoria.dmg_1', hero: 'victoria', name: 'Waffle-Cone Arm', type: 'stat', stat: { damage: 3 }, cost: 70, desc: '+3 Mint-Chip Fling damage' },
  { id: 'victoria.dmg_2', hero: 'victoria', name: 'Double-Dipped', type: 'stat', stat: { damage: 5 }, cost: 150, requires: 'victoria.dmg_1', desc: '+5 Mint-Chip Fling damage' },
  { id: 'victoria.speed_1', hero: 'victoria', name: 'White Sneakers', type: 'stat', stat: { speed: 15 }, cost: 80, desc: '+15 move speed' },
  { id: 'victoria.quick_fling', hero: 'victoria', name: 'Mint-Chip: Quick Wrist', type: 'ability', cost: 110, desc: '-25% Mint-Chip Fling cooldown' },
  { id: 'victoria.piercing_scoop', hero: 'victoria', name: 'Mint-Chip: Rocky Road', type: 'ability', cost: 130, desc: 'Scoops pass through 1 enemy' },
  { id: 'victoria.triple_scoop', hero: 'victoria', name: 'Mint-Chip: Triple Scoop', type: 'ability', cost: 170, desc: 'Fling throws 3 scoops in a spread' },
  { id: 'victoria.long_shield', hero: 'victoria', name: 'Denim Shield: Acid Wash', type: 'ability', cost: 120, desc: '+60% Denim Shield duration' },
  { id: 'victoria.big_bloom', hero: 'victoria', name: 'Flower Box: Full Bloom', type: 'ability', cost: 130, desc: '+35% Bloom radius, +50% heal' },
  // Team (stored in party.aaron.upgrades; action accepts it on either hero)
  { id: 'team.regen', hero: 'team', name: 'Hammock Naps', type: 'ability', cost: 120, desc: 'Benched hero regenerates 2x faster' },
];
export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** Camp buildings. level 0 = not built. Each level has its own cost. */
export const BUILDINGS = [
  { id: 'cocoa', name: 'Warm Cocoa Stand', costs: [100], desc: ['Missions start with +25% HP (warm_cocoa)'], modifier: 'warm_cocoa' },
  { id: 'scout', name: 'Scout Tower', costs: [110], desc: ['Enemy positions shown at start (ally_scouts)'], modifier: 'ally_scouts' },
  { id: 'freezer', name: 'Ice Cream Freezer', costs: [80, 160], desc: ['+25% Scoops from missions', '+50% Scoops from missions'] },
  { id: 'hammock', name: 'Sunny Hammock', costs: [120], desc: ['+1 Sunshine every morning'] },
];
export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));
