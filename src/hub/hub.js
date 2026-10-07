// House hub (floor plan). Owned by: hub team. PLACEHOLDER: list of available rooms.
import { ROOMS, PALETTE } from '../core/theme.js';
import { availableRooms } from '../core/state.js';
import { enterRoom } from '../core/flow.js';
import { button, text } from '../ui/widgets.js';

export default class HubScene {
  constructor(game) { this.game = game; }
  enter() {}
  rooms() { return availableRooms(this.game.state, ROOMS); }
  update() {
    const g = this.game;
    this.rooms().forEach((id, i) => { if (button(null, g, ROOMS[id].name, 360, 140 + i * 56, 240, 44)) enterRoom(g, id); });
  }
  render(ctx) {
    const g = this.game, s = g.state;
    ctx.fillStyle = '#3a2f2a'; ctx.fillRect(0, 0, g.width, g.height);
    text(ctx, `The House — ${s.clock}:00 — Party Points ${s.partyPoints}`, 20, 30);
    this.rooms().forEach((id, i) => button(ctx, g, ROOMS[id].name, 360, 140 + i * 56, 240, 44));
  }
}
