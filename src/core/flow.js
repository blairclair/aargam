// GAME FLOW CONTRACT — owned by: supervisor. Every scene transition between teams goes through here,
// so no team needs to know another team's scene internals.
//
//   title ──startNewGame──▶ cutscene 'opening' ──▶ hub
//   hub ──enterRoom(roomId)──▶ cutscene '<room>.intro' ──▶ select {roomId}
//   select ──launchRoom({roomId, hero, loadout})──▶ room (action stage)
//   room ──finishAction({...victory})──▶ minigame {roomId, hero}     (defeat → select again)
//   minigame ──finishMinigame({...success, score})──▶ results {roomId, ...}  (fail → minigame again)
//   results ──finishRoom(roomId)──▶ cutscene '<room>.outro' (+ 'midgame' / 'prefinale' beats) ──▶ hub
//   after pond: cutscene 'party' {partyScore} ──▶ ending handled by story
import { ROOMS, ROOM_IDS, SKILLS, HERO_IDS } from './theme.js';
import { saveGame, newGame, availableRooms } from './state.js';
import { diff } from './difficulty.js';

/**
 * @typedef {Object} RoomParams        hub/select -> action  ('room' scene)
 * @property {string} roomId           key of theme.ROOMS
 * @property {'aaron'|'victoria'} hero
 * @property {string[]} loadout        up to 2 skill ids (basic + ultimate implied)
 * @property {number} attempt          1-based
 * @property {'easy'|'medium'|'hard'} difficulty   core/difficulty.js (Medium = original tuning)
 */
/**
 * @typedef {Object} ActionResult      action -> flow
 * @property {string} roomId
 * @property {'aaron'|'victoria'} hero
 * @property {boolean} victory
 * @property {number} hpFrac           0..1 remaining at end
 * @property {number} timeSec
 * @property {number} enemiesDefeated
 */
/**
 * @typedef {Object} MinigameParams    flow -> minigames ('minigame' scene)
 * @property {string} roomId
 * @property {'aaron'|'victoria'} hero
 * @property {number} attempt
 * @property {string[]} perks          Party Touch ids that minigames may honor (e.g. 'playlist' = +20% time)
 * @property {'easy'|'medium'|'hard'} difficulty   host scales the minigame clock; a minigame may also read it
 */
/**
 * @typedef {Object} MinigameResult    minigames -> flow
 * @property {string} roomId
 * @property {boolean} success
 * @property {number} score            0..1 quality (time left, accuracy, moves)
 */

const go = (game, scene, params) => game.switchScene(scene, params);

export function startNewGame(game) {
  game.state = newGame();
  saveGame(game.state);
  playCutscene(game, 'opening', { scene: 'hub' });
}

export function continueGame(game) { go(game, 'hub', {}); }

/** Plays cutscene `id` then switches to `next` ({scene, params}). Story owns the 'cutscene' scene + script. */
export function playCutscene(game, id, next = { scene: 'hub' }) {
  go(game, 'cutscene', { id, next });
}

/** Hub calls this when the player picks a room on the floor plan. */
export function enterRoom(game, roomId) {
  if (!availableRooms(game.state, ROOMS).includes(roomId)) return false;
  playCutscene(game, `${roomId}.intro`, { scene: 'select', params: { roomId } });
  return true;
}

/** Select screen calls this after hero + loadout are chosen. */
export function launchRoom(game, { roomId, hero, loadout = [], difficulty }) {
  const r = game.state.rooms[roomId];
  r.attempts = (r.attempts || 0) + 1;
  difficulty = diff(difficulty ?? r.difficulty).id;
  r.difficulty = difficulty;
  game.state.flags.lastDifficulty = difficulty;
  game._run = { roomId, hero, loadout, difficulty, attempt: r.attempts, action: null, minigame: null };
  game.events.emit('room:launched', game._run);
  go(game, 'room', { roomId, hero, loadout, difficulty, attempt: r.attempts });
}

/** Action calls this when the action stage ends. */
export function finishAction(game, result) {
  const run = game._run ?? { roomId: result.roomId, hero: result.hero, loadout: [], attempt: 1 };
  run.action = result;
  game._run = run;
  game.state.stats.enemiesDefeated += result.enemiesDefeated || 0;
  game.events.emit('room:actionFinished', result);
  if (!result.victory) {
    game.state.stats.roomsFailed++;
    saveGame(game.state);
    go(game, 'select', { roomId: run.roomId, retry: true, lastHero: run.hero });
    return;
  }
  go(game, 'minigame', { roomId: run.roomId, hero: run.hero, attempt: 1, perks: game.state.purchases.slice(), difficulty: run.difficulty ?? 'medium' });
}

/** Minigame calls this when it ends. Fail → replay the minigame. */
export function finishMinigame(game, result) {
  const run = game._run ?? { roomId: result.roomId, hero: 'aaron', loadout: [], attempt: 1, action: { hpFrac: 1, victory: true } };
  run.minigame = result;
  game._run = run;
  game.events.emit('room:minigameFinished', result);
  if (!result.success) {
    game.state.stats.minigamesFailed++;
    go(game, 'minigame', { roomId: run.roomId, hero: run.hero, attempt: (result.attempt || 1) + 1, perks: game.state.purchases.slice(), difficulty: run.difficulty ?? 'medium' });
    return;
  }
  const stars = computeStars(run);
  go(game, 'results', { roomId: run.roomId, hero: run.hero, difficulty: run.difficulty ?? 'medium', stars, action: run.action, minigame: result, newSkills: skillsFor(run.roomId) });
}

/** 1..3 stars from action hp + minigame score. */
export function computeStars(run) {
  const hp = run.action?.hpFrac ?? 1;
  const mg = run.minigame?.score ?? 0.5;
  const v = hp * 0.4 + mg * 0.6;
  return v >= 0.75 ? 3 : v >= 0.45 ? 2 : 1;
}

function skillsFor(roomId) {
  return Object.values(ROOMS[roomId]?.skills ?? {});
}

/** Results screen calls this when the player continues. Records progress, grants skills, plays the outro. */
export function finishRoom(game, roomId, stars) {
  const s = game.state, r = s.rooms[roomId];
  const firstClear = !r.done;
  r.done = true;
  r.playedAs = game._run?.hero ?? r.playedAs;
  const gained = Math.max(0, stars - (r.stars || 0));
  r.stars = Math.max(r.stars || 0, stars);
  s.partyPoints += gained * 10;
  if (firstClear) {
    s.clock += 1;
    for (const id of skillsFor(roomId)) {
      const hero = SKILLS[id].hero;
      if (!s.skills[hero].includes(id)) s.skills[hero].push(id);
    }
  }
  const doneCount = ROOM_IDS.filter((id) => s.rooms[id].done).length;
  // story beats: after 4 rooms -> 'midgame'; after 8 -> 'prefinale' (grants ultimates); after pond -> 'party'
  const beats = [`${roomId}.outro`];
  if (firstClear && doneCount === 4) beats.push('midgame');
  if (firstClear && doneCount === 8) {
    beats.push('prefinale');
    for (const sk of Object.values(SKILLS)) if (sk.slot === 'ultimate' && !s.skills[sk.hero].includes(sk.id)) s.skills[sk.hero].push(sk.id);
  }
  saveGame(s);
  game.events.emit('room:finished', { roomId, stars, firstClear });
  game._run = null;
  const end = roomId === 'pond'
    ? { scene: 'cutscene', params: { id: 'party', next: { scene: 'title' }, partyScore: partyScore(s) } }
    : { scene: 'hub', params: { justFinished: roomId } };
  // chain beats: each cutscene's `next` is the following beat
  let next = end;
  for (let i = beats.length - 1; i >= 0; i--) next = { scene: 'cutscene', params: { id: beats[i], next } };
  go(game, next.scene, next.params);
}

/** 0..1 overall party quality (total stars / max). Story uses it to pick the ending variant. */
export function partyScore(state) {
  const total = ROOM_IDS.reduce((a, id) => a + (state.rooms[id].stars || 0), 0);
  return total / (ROOM_IDS.length * 3);
}

export { HERO_IDS };
