// Action mission scene. Owned by: action team. Placeholder.
// enter(MissionParams) -> play -> finishMission(game, MissionOutcome)
import { finishMission } from '../core/mission.js';
import { drawHero, drawEnemy, drawGround } from '../art/sprites.js';
import { drawHUD } from '../ui/hud.js';

export default class LevelScene {
  constructor(game) { this.game = game; }
  enter(params) {
    this.p = { region: 'lakeside', kind: 'skirmish', difficulty: 1, nodeId: 'dev', ...params };
    this.x = 480; this.y = 300; this.t = 0;
  }
  update(dt) {
    const g = this.game, a = g.input.axis();
    this.t += dt;
    this.x += a.x * 190 * dt; this.y += a.y * 190 * dt;
    if (g.input.pressed('confirm')) {
      finishMission(g, { nodeId: this.p.nodeId, victory: true, scoops: 5, sunshine: 1, hpLeft: { aaron: 100, victoria: 80 }, enemiesDefeated: 3, timeSec: this.t });
    }
  }
  render(ctx) {
    const g = this.game;
    drawGround(ctx, g, this.p.region, 0, 0, g.width, g.height);
    drawEnemy(ctx, g, 'frostling', 700, 300);
    drawHero(ctx, g, 'aaron', this.x, this.y);
    drawHUD(ctx, g, {
      active: 'aaron',
      heroes: { aaron: { hp: 120, maxHp: 120, cooldowns: { ability: 0, special: 0 } }, victoria: { hp: 95, maxHp: 95, cooldowns: { ability: 0, special: 0 } } },
      objective: 'Placeholder — press Enter to win', scoops: 0,
    });
  }
}
