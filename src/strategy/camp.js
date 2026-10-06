// Camp (base management / upgrades). Owned by: strategy team. Placeholder.
import { PALETTE } from '../core/theme.js';
import { button, text } from '../ui/widgets.js';

export default class CampScene {
  constructor(game) { this.game = game; }
  enter() {}
  update() { if (button(null, this.game, 'Back to map', 380, 400, 200, 44) || this.game.input.pressed('back')) this.game.switchScene('overworld'); }
  render(ctx) {
    const g = this.game;
    ctx.fillStyle = PALETTE.pine; ctx.fillRect(0, 0, g.width, g.height);
    text(ctx, 'Lakeside Camp (placeholder)', 20, 30);
    button(ctx, g, 'Back to map', 380, 400, 200, 44);
  }
}
