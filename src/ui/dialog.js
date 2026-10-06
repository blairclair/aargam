// DIALOG CONTRACT — Owned by: art/ui/audio team. API FROZEN; internals placeholder.
// Any scene can own a Dialog:
//   this.dialog = new Dialog(game);
//   this.dialog.open([{ who: 'aaron', text: 'Is that... a Frostling?' }, { who: 'victoria', text: '...' }], () => onDone());
//   update: if (this.dialog.active) { this.dialog.update(dt); return; }   // dialog eats input while open
//   render: this.dialog.render(ctx);  (screen space, last)
// who: 'aaron' | 'victoria' | 'baron' | 'narrator' | any string (shown as a name, no portrait)
import { HEROES } from '../core/theme.js';
import { drawPortrait } from '../art/sprites.js';
import { panel, text } from './widgets.js';

export class Dialog {
  constructor(game) { this.game = game; this.lines = []; this.i = 0; this.onDone = null; }
  get active() { return this.i < this.lines.length; }
  open(lines, onDone) { this.lines = lines; this.i = 0; this.onDone = onDone ?? null; }
  update(dt) {
    const inp = this.game.input;
    if (inp.pressed('confirm') || inp.mouse.pressed) {
      this.i++;
      if (!this.active && this.onDone) { const f = this.onDone; this.onDone = null; f(); }
    }
  }
  render(ctx) {
    if (!this.active) return;
    const l = this.lines[this.i];
    const g = this.game;
    panel(ctx, 40, g.height - 140, g.width - 80, 110);
    if (HEROES[l.who]) drawPortrait(ctx, g, l.who, 100, g.height - 85, 40);
    text(ctx, HEROES[l.who]?.name ?? l.who, 160, g.height - 108);
    text(ctx, l.text, 160, g.height - 80);
  }
}
