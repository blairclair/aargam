// Persistent game state + save/load. Owned by: supervisor (schema), see docs/ARCHITECTURE.md.
// Who writes what:
//   rooms, clock, partyPoints, stars  -> core/flow.js (via finishRoom); hub may READ
//   skills                            -> core/flow.js grants on room completion; hub/action READ
//   loadout, purchases                -> hub
//   party                             -> hub (permanent stat perks); action READS
//   flags                             -> anyone, keys prefixed by team: 'story.seenOpening', 'action.tutKick'
import { HEROES, ROOM_IDS, START_HOUR } from './theme.js';

const SAVE_KEY = 'aargam.save.v2';
export const STATE_VERSION = 2;

export function newGame() {
  return {
    version: STATE_VERSION,
    clock: START_HOUR,                 // hour of day; +1 per room completed
    partyPoints: 0,                    // currency earned from stars, spent in hub
    rooms: Object.fromEntries(ROOM_IDS.map((id) => [id, { done: false, stars: 0, attempts: 0, playedAs: null }])),
    skills: { aaron: [HEROES.aaron.basic], victoria: [HEROES.victoria.basic] }, // earned skill ids
    loadout: { aaron: [], victoria: [] }, // up to 2 equipped 'skill' ids each (basic + ultimate are automatic)
    party: Object.fromEntries(Object.values(HEROES).map((h) => [h.id, { maxHp: h.base.maxHp, damage: h.base.damage, speed: h.base.speed }])),
    purchases: [],                     // Party Touch ids bought in hub
    flags: {},
    stats: { enemiesDefeated: 0, roomsFailed: 0, minigamesFailed: 0 },
  };
}

export function saveGame(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s?.version === STATE_VERSION ? s : null;
  } catch { return null; }
}

export function hasSave() { return loadGame() !== null; }
export function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }

/** Rooms currently playable: not done, and ANY requirement done ('*' = all other rooms done). */
export function availableRooms(state, ROOMS) {
  const done = (id) => state.rooms[id]?.done;
  return Object.values(ROOMS).filter((r) => {
    if (done(r.id)) return false;
    if (!r.requires.length) return true;
    if (r.requires.includes('*')) return Object.keys(ROOMS).every((id) => id === r.id || done(id));
    return r.requires.some(done);
  }).map((r) => r.id);
}
