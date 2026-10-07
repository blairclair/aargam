// Character + loadout select. Owned by: hub team. PLACEHOLDER.
import { ROOMS, PALETTE } from '../core/theme.js';
import { launchRoom } from '../core/flow.js';
import { button, text } from '../ui/widgets.js';

export default class SelectScene {
  constructor(game) { this.game = game; }
  enter(p = {}) { this.p = { roomId: 'office', ...p }; }
  update() {
    const g = this.game;
    for (const [i, hero] of ['aaron', 'victoria'].entries()) {
      if (button(null, g, hero, 260 + i * 260, 300, 180, 50)) launchRoom(g, { roomId: this.p.roomId, hero, loadout: g.state.skills[hero].filter((id) => id !== 'kick' && id !== 'wrench').slice(0, 2) });
    }
  }
  render(ctx) {
    const g = this.game;
    ctx.fillStyle = PALETTE.night; ctx.fillRect(0, 0, g.width, g.height);
    text(ctx, `Who takes the ${ROOMS[this.p.roomId].name}?`, 480, 160, { align: 'center' });
    ['aaron', 'victoria'].forEach((h, i) => button(ctx, g, h, 260 + i * 260, 300, 180, 50));
  }
}
