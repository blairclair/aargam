// Minigame host scene. Owned by: supervisor. Delegates to the room's minigame class.
// MINIGAME CONTRACT: each src/minigames/<roomId>.js default-exports a class:
//   constructor(game)            enter(params: MinigameParams)    exit()
//   update(dt)                   render(ctx)
//   and when done calls finishMinigame(game, { roomId, success, score /*0..1*/, attempt })  (core/flow.js)
// Rules: teach visually in the first seconds (no text walls); 30–120s long; difficulty may scale with
// params.attempt (easier on retries) and honor params.perks (e.g. 'playlist' = +20% time).
import { MINIGAMES } from './index.js';

export default class MinigameHost {
  constructor(game) { this.game = game; this.inner = null; }
  enter(params = {}) {
    const p = { roomId: 'office', hero: 'aaron', attempt: 1, perks: [], ...params };
    p.attempt = Number(p.attempt) || 1;
    const Cls = MINIGAMES[p.roomId];
    if (!Cls) throw new Error(`No minigame for room "${p.roomId}"`);
    this.inner?.exit?.();
    this.inner = new Cls(this.game);
    this.inner.enter(p);
  }
  exit() { this.inner?.exit?.(); }
  update(dt) { this.inner?.update(dt); }
  render(ctx) { this.inner?.render(ctx); }
}
