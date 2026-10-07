// Room results. Owned by: hub team. PLACEHOLDER.
import { ROOMS, SKILLS, PALETTE, FONT } from '../core/theme.js';
import { finishRoom } from '../core/flow.js';
import { text } from '../ui/widgets.js';

export default class ResultsScene {
  constructor(game) { this.game = game; }
  enter(p = {}) { this.p = { roomId: 'office', stars: 2, newSkills: [], ...p }; this.p.stars = Number(this.p.stars) || 1; }
  update() { if (this.game.input.pressed('confirm') || this.game.input.mouse.pressed) finishRoom(this.game, this.p.roomId, this.p.stars); }
  render(ctx) {
    const g = this.game;
    ctx.fillStyle = PALETTE.night; ctx.fillRect(0, 0, g.width, g.height);
    text(ctx, `${ROOMS[this.p.roomId].name} fixed! ${'★'.repeat(this.p.stars)}`, 480, 220, { align: 'center', font: FONT.big });
    text(ctx, `New skills: ${(this.p.newSkills || []).map((id) => SKILLS[id]?.name).join(', ')}`, 480, 280, { align: 'center' });
  }
}
