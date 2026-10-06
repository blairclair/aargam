// Ending screen (final victory or campaign loss). Owned by: art/ui/audio team. Placeholder.
// params: { victory: boolean }
import { PALETTE, FONT } from '../core/theme.js';
import { clearSave } from '../core/state.js';
import { text } from './widgets.js';

export default class EndingScene {
  constructor(game) { this.game = game; }
  enter(params) { this.victory = !!params.victory; if (this.victory) clearSave(); }
  update() { if (this.game.input.pressed('confirm')) this.game.switchScene('title'); }
  render(ctx) {
    const g = this.game;
    ctx.fillStyle = PALETTE.night; ctx.fillRect(0, 0, g.width, g.height);
    text(ctx, this.victory ? 'Summer is saved!' : 'The frost wins... for now.', g.width / 2, 250, { align: 'center', font: FONT.big });
    text(ctx, 'Press Enter', g.width / 2, 320, { align: 'center' });
  }
}
