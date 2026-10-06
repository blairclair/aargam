// Persistent game state + save/load. Owned by: supervisor (schema), see docs/ARCHITECTURE.md.
// Top-level keys are fixed. Each team owns the CONTENTS of its namespace:
//   party     -> shared (strategy writes upgrades, action reads stats)
//   resources -> strategy
//   map       -> strategy (node graph, frost levels, statuses)
//   camp      -> strategy
//   flags     -> anyone, but prefix keys with your team: 'action.tutorialDone', 'ui.seenIntro'
import { HEROES } from './theme.js';

const SAVE_KEY = 'aargam.save.v1';
export const STATE_VERSION = 1;

export function newGame() {
  return {
    version: STATE_VERSION,
    day: 1,
    resources: { scoops: 0, sunshine: 0 },
    party: Object.fromEntries(Object.values(HEROES).map((h) => [h.id, {
      level: 1,
      xp: 0,
      maxHp: h.base.maxHp,
      hp: h.base.maxHp,
      damage: h.base.damage,
      speed: h.base.speed,
      upgrades: [], // string ids, defined by strategy (camp shop), interpreted by action
    }])),
    map: null,  // strategy initializes on first overworld enter
    camp: null, // strategy initializes on first camp enter
    flags: {},
    stats: { missionsWon: 0, missionsLost: 0, enemiesDefeated: 0 },
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
