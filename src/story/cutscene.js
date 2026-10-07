// Cutscene player. Owned by: story team. PLACEHOLDER (plays a Dialog, then goes to params.next).
// params: { id: 'opening' | '<roomId>.intro' | '<roomId>.outro' | 'midgame' | 'prefinale' | 'party', next: {scene, params}, partyScore? }
// Unknown ids must not crash: skip straight to next.
import { PALETTE } from '../core/theme.js';
import { Dialog } from '../ui/dialog.js';
import { text } from '../ui/widgets.js';

const SCRIPT = {
  opening: [
    { who: 'narrator', text: "Party day. Aaron and Victoria's housewarming starts at 7 PM." },
    { who: 'aaron', text: 'I wrote PartyPlanner.exe to automate the prep. What could go wrong?' },
    { who: 'partyplanner', text: '> PartyPlanner.exe: FATAL — spilling into house...' },
    { who: 'victoria', text: 'Aaron. ¿Qué hiciste?' },
  ],
};

export default class CutsceneScene {
  constructor(game) { this.game = game; this.dialog = new Dialog(game); }
  enter(params = {}) {
    this.p = params;
    const lines = SCRIPT[params.id] ?? [{ who: 'narrator', text: `[cutscene: ${params.id}]` }];
    this.dialog.open(lines, () => this.done());
  }
  done() {
    const n = this.p.next ?? { scene: 'hub' };
    this.game.switchScene(n.scene, n.params ?? {});
  }
  update(dt) { if (this.game.input.pressed('back')) { this.dialog.skipAll?.(); return; } this.dialog.update(dt); }
  render(ctx) {
    const g = this.game;
    ctx.fillStyle = PALETTE.night; ctx.fillRect(0, 0, g.width, g.height);
    text(ctx, this.p?.id ?? '', 20, 30, { color: 'rgba(255,246,229,0.4)' });
    this.dialog.render(ctx);
  }
}
