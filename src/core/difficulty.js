// Per-room difficulty (Easy / Medium / Hard). Owned by: supervisor.
// Picked on the select screen, remembered per room in state.rooms[id].difficulty, carried to the action stage
// (RoomParams.difficulty) and the minigame (MinigameParams.difficulty). Medium keeps the original enemy
// tuning (every multiplier is 1); floor hearts were added on top for all three.
//   action:   enemy hp / damage / speed, aggro = gap between attacks (higher = calmer), tele = telegraph length
//   hearts:   heartStart = hearts on the floor when the fight starts, heartEvery = sec between new floor hearts,
//             dropMul = enemy heart-drop chance multiplier
//   minigame: speed = minigame clock rate (host scales dt), bpm = Drumline tempo offset (its clock is audio time)
export const DIFFICULTY = {
  easy:   { id: 'easy',   name: 'Easy',   color: '#7ee0b0', hp: 0.7,  dmg: 0.55, speed: 0.9,  aggro: 1.3,  tele: 1.3,  mgSpeed: 0.8,  bpm: -12, heartStart: 3, heartEvery: 9,  dropMul: 1.5 },
  medium: { id: 'medium', name: 'Medium', color: '#ffc94a', hp: 1,    dmg: 1,    speed: 1,    aggro: 1,    tele: 1,    mgSpeed: 1,    bpm: 0,   heartStart: 1, heartEvery: 20, dropMul: 1 },
  hard:   { id: 'hard',   name: 'Hard',   color: '#ff7a6b', hp: 1.35, dmg: 1.4,  speed: 1.12, aggro: 0.78, tele: 0.82, mgSpeed: 1.18, bpm: 12,  heartStart: 0, heartEvery: 60, dropMul: 0.3 },
};
export const DIFF_IDS = ['easy', 'medium', 'hard'];

/** Settings for a difficulty id (unknown → Medium). */
export function diff(id) { return DIFFICULTY[id] ?? DIFFICULTY.medium; }

/** The difficulty to preselect for a room: its own last pick, else the last pick anywhere, else Medium. */
export function roomDifficulty(state, roomId) {
  const own = state?.rooms?.[roomId]?.difficulty;
  if (DIFFICULTY[own]) return own;
  const last = state?.flags?.lastDifficulty;
  return DIFFICULTY[last] ? last : 'medium';
}
