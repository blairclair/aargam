// Minigame registry. Owned by: supervisor. One module per room; each owned by a minigame team (OWNERS.json).
import office from './office.js';
import kitchen from './kitchen.js';
import dining from './dining.js';
import living from './living.js';
import playroom from './playroom.js';
import primary from './primary.js';
import guest from './guest.js';
import backyard from './backyard.js';
import pond from './pond.js';

export const MINIGAMES = { office, kitchen, dining, living, playroom, primary, guest, backyard, pond };
