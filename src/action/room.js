// Room action stage. Owned by: action team. PLACEHOLDER — the round-1 level engine (level.js and friends)
// is the starting point to adapt: keep the hero movement/animation feel exactly.
// enter(RoomParams) -> play -> finishAction(game, ActionResult)
import { ROOMS } from '../core/theme.js';
import { finishAction } from '../core/flow.js';
import { drawHero, drawEnemy } from '../art/sprites.js';
import { text } from '../ui/widgets.js';

export default class RoomScene {
  constructor(game) { this.game = game; }
  enter(p = {}) { this.p = { roomId: 'office', hero: 'aaron', loadout: [], attempt: 1, ...p }; this.x = 480; this.y = 320; this.t = 0; }
  update(dt) {
    const g = this.game, a = g.input.axis();
    this.t += dt; this.x += a.x * 190 * dt; this.y += a.y * 190 * dt;
    if (g.input.pressed('confirm')) finishAction(g, { roomId: this.p.roomId, hero: this.p.hero, victory: true, hpFrac: 0.8, timeSec: this.t, enemiesDefeated: 5 });
  }
  render(ctx) {
    const g = this.game;
    ctx.fillStyle = '#8a6a4a'; ctx.fillRect(0, 0, g.width, g.height);
    drawHero(ctx, g, this.p.hero, this.x, this.y, { anim: 'idle' });
    text(ctx, `${ROOMS[this.p.roomId]?.name}: ${ROOMS[this.p.roomId]?.objective} — placeholder, Enter = win`, 20, 30);
  }
}
