// Title screen. Owned by: story team. PLACEHOLDER.
import { GAME_TITLE, PALETTE, FONT } from '../core/theme.js';
import { hasSave } from '../core/state.js';
import { startNewGame, continueGame } from '../core/flow.js';
import { button, text } from '../ui/widgets.js';

export default class TitleScene {
  constructor(game) { this.game = game; }
  enter() {}
  update() {
    const g = this.game;
    if (button(null, g, 'New Game', 380, 330, 200, 44) || g.input.pressed('confirm')) startNewGame(g);
    else if (hasSave() && button(null, g, 'Continue', 380, 390, 200, 44)) continueGame(g);
  }
  render(ctx) {
    const g = this.game;
    ctx.fillStyle = PALETTE.night; ctx.fillRect(0, 0, g.width, g.height);
    text(ctx, GAME_TITLE, g.width / 2, 140, { align: 'center', font: FONT.big, color: PALETTE.sun });
    button(ctx, g, 'New Game', 380, 330, 200, 44);
    if (hasSave()) button(ctx, g, 'Continue', 380, 390, 200, 44);
  }
}
