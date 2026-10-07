// Minigame for the pond — see docs/DESIGN.md. Owned by: minigame team (OWNERS.json). PLACEHOLDER.
import { ROOMS, PALETTE, FONT } from '../core/theme.js';
import { finishMinigame } from '../core/flow.js';
import { text, panel } from '../ui/widgets.js';

export default class Minigame {
  constructor(game) { this.game = game; }
  enter(p) { this.p = p; this.t = 0; }
  update(dt) {
    this.t += dt;
    const inp = this.game.input;
    if (inp.pressed('confirm')) finishMinigame(this.game, { roomId: this.p.roomId, success: true, score: 0.8, attempt: this.p.attempt });
    if (inp.pressed('back')) finishMinigame(this.game, { roomId: this.p.roomId, success: false, score: 0, attempt: this.p.attempt });
  }
  render(ctx) {
    const g = this.game, r = ROOMS[this.p.roomId];
    ctx.fillStyle = PALETTE.night; ctx.fillRect(0, 0, g.width, g.height);
    panel(ctx, 230, 170, 500, 200);
    text(ctx, `${r.name}: ${r.minigame}`, 480, 240, { align: 'center', font: FONT.big });
    text(ctx, 'Placeholder — Enter = win, Esc = fail', 480, 300, { align: 'center' });
  }
}
