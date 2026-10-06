// Overworld / campaign map. Owned by: strategy team. Placeholder.
// enter({ outcome? }) — if outcome present, apply rewards / frost changes, then show the map.
import { PALETTE, REGIONS } from '../core/theme.js';
import { saveGame } from '../core/state.js';
import { launchMission } from '../core/mission.js';
import { button, text } from '../ui/widgets.js';

export default class OverworldScene {
  constructor(game) { this.game = game; }
  enter(params = {}) {
    const s = this.game.state;
    if (!s.map) s.map = { nodes: [{ id: 'n1', region: 'lakeside', kind: 'skirmish', difficulty: 1, status: 'frozen' }] };
    if (params.outcome) {
      s.resources.scoops += params.outcome.scoops;
      s.day++;
      saveGame(s);
    }
  }
  update() {
    const g = this.game;
    if (button(null, g, 'Play mission', 380, 250, 200, 44)) {
      const n = g.state.map.nodes[0];
      launchMission(g, { nodeId: n.id, region: n.region, kind: n.kind, difficulty: n.difficulty });
    }
    if (button(null, g, 'Camp', 380, 310, 200, 44)) g.switchScene('camp');
  }
  render(ctx) {
    const g = this.game;
    ctx.fillStyle = PALETTE.lake; ctx.fillRect(0, 0, g.width, g.height);
    text(ctx, `Overworld (placeholder) — Day ${g.state.day} — Scoops ${g.state.resources.scoops}`, 20, 30);
    text(ctx, REGIONS.lakeside.name, 20, 60);
    button(ctx, g, 'Play mission', 380, 250, 200, 44);
    button(ctx, g, 'Camp', 380, 310, 200, 44);
  }
}
