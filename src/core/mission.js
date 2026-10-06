// MISSION HANDOFF CONTRACT between strategy (launches) and action (plays). Owned by: supervisor.

/**
 * @typedef {Object} MissionParams   strategy -> action  (game.switchScene('level', params))
 * @property {string} nodeId          map node being played (opaque to action; echo it back)
 * @property {'lakeside'|'oldcity'|'summit'} region
 * @property {'skirmish'|'rescue'|'defend'|'boss'} kind     see theme.MISSION_KINDS
 * @property {number} difficulty      1..5
 * @property {number} seed            for deterministic procedural layout
 * @property {string[]} [modifiers]   optional strategy effects, e.g. 'blizzard' (frost lvl 3), 'ally_scouts', 'warm_cocoa'
 *                                    action ignores unknown modifiers
 * @property {string} [bossId]        for kind 'boss': enemy id from theme.ENEMIES
 * @property {{who:string,text:string}[]} [intro]  optional dialog to play at mission start
 */

/**
 * @typedef {Object} MissionOutcome  action -> strategy  (via finishMission)
 * @property {string} nodeId
 * @property {boolean} victory
 * @property {number} scoops          collected during mission
 * @property {number} sunshine        collected during mission
 * @property {{aaron:number, victoria:number}} hpLeft   remaining hp (0 = knocked out)
 * @property {number} enemiesDefeated
 * @property {number} timeSec
 */

/** Action calls this when a mission ends. Writes shared stats, then hands control to strategy. */
export function finishMission(game, outcome) {
  const s = game.state;
  s.stats.enemiesDefeated += outcome.enemiesDefeated || 0;
  if (outcome.victory) s.stats.missionsWon++; else s.stats.missionsLost++;
  game.events.emit('mission:finished', outcome);
  game.switchScene('overworld', { outcome });
}

/** Strategy calls this to launch a mission (fills defaults). */
export function launchMission(game, params) {
  const p = { difficulty: 1, seed: (Math.random() * 1e9) | 0, modifiers: [], ...params };
  game.events.emit('mission:launched', p);
  game.switchScene('level', p);
}
