// Title screen. Owned by: art/ui/audio team. Placeholder.
import { GAME_TITLE, PALETTE, FONT } from '../core/theme.js';
import { newGame, hasSave, saveGame } from '../core/state.js';
import { drawPortrait } from '../art/sprites.js';
import { button, text } from './widgets.js';

export default class TitleScene {
  constructor(game) { this.game = game; }
  enter() {}
  update(dt) {
    const g = this.game;
    if (button(null, g, 'New Game', 380, 330, 200, 44) || g.input.pressed('confirm')) {
      g.state = newGame(); saveGame(g.state); g.switchScene('overworld');
    }
    if (hasSave() && button(null, g, 'Continue', 380, 390, 200, 44)) g.switchScene('overworld');
  }
  render(ctx) {
    const g = this.game;
    ctx.fillStyle = PALETTE.night; ctx.fillRect(0, 0, g.width, g.height);
    text(ctx, GAME_TITLE, g.width / 2, 120, { align: 'center', font: FONT.big, color: PALETTE.sun });
    drawPortrait(ctx, g, 'aaron', 380, 230, 60);
    drawPortrait(ctx, g, 'victoria', 580, 230, 60);
    button(ctx, g, 'New Game', 380, 330, 200, 44);
    if (hasSave()) button(ctx, g, 'Continue', 380, 390, 200, 44);
  }
}
