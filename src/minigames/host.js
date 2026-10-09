// Minigame host scene. Owned by: supervisor. Delegates to the room's minigame class.
// MINIGAME CONTRACT: each src/minigames/<roomId>.js default-exports a class:
//   constructor(game)            enter(params: MinigameParams)    exit()
//   update(dt)                   render(ctx)
//   and when done calls finishMinigame(game, { roomId, success, score /*0..1*/, attempt })  (core/flow.js)
// Rules: teach visually in the first seconds (no text walls); 30–120s long; difficulty may scale with
// params.attempt (easier on retries) and honor params.perks (e.g. 'playlist' = +20% time).
import { MINIGAMES } from './index.js';
import { diff } from '../core/difficulty.js';
import { finishMinigame } from '../core/flow.js';
import { PALETTE } from '../core/theme.js';
import { button, panel, text } from '../ui/widgets.js';

// Skip: a small corner button on every minigame → confirm → counts as a pass with a low score.
export const SKIP_SCORE = 0.4;
const SKIP = { x: 884, y: 6, w: 70, h: 22 };
const YES = { x: 480 - 170, y: 300, w: 160, h: 44 }, NO = { x: 480 + 10, y: 300, w: 160, h: 44 };
const inside = (m, r) => m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;

export default class MinigameHost {
  constructor(game) { this.game = game; this.inner = null; }
  enter(params = {}) {
    const p = { roomId: 'office', hero: 'aaron', attempt: 1, perks: [], ...params };
    p.attempt = Number(p.attempt) || 1;
    p.difficulty = diff(p.difficulty).id;
    // Difficulty runs the minigame's clock slower (Easy) or faster (Hard): timers, spawns and motion all scale
    // together, so every minigame gets it for free. Drumline runs on audio time and reads params.difficulty itself.
    this.speed = p.roomId === 'backyard' ? 1 : diff(p.difficulty).mgSpeed;
    const Cls = MINIGAMES[p.roomId];
    if (!Cls) throw new Error(`No minigame for room "${p.roomId}"`);
    this.inner?.exit?.();
    this.inner = new Cls(this.game);
    this.p = p; this.confirm = false; this.done = false;
    this.inner.enter(p);
  }
  exit() { this.inner?.exit?.(); }
  update(dt) {
    const g = this.game, m = g.input.mouse;
    if (this.done) return;
    if (this.confirm) {
      if (button(null, g, 'Skip it', YES.x, YES.y, YES.w, YES.h) || g.input.pressed('Enter')) { this.skip(); return; }
      if (button(null, g, 'Keep playing', NO.x, NO.y, NO.w, NO.h) || g.input.pressed('back')) this.confirm = false;
      return; // minigame is frozen while the dialog is up
    }
    if (m.pressed && inside(m, SKIP)) { this.confirm = true; return; } // swallow the click
    this.inner?.update(dt * (this.speed ?? 1));
  }

  skip() {
    this.done = true;
    finishMinigame(this.game, { roomId: this.p.roomId, success: true, score: SKIP_SCORE, attempt: this.p.attempt, skipped: true });
  }

  render(ctx) {
    this.inner?.render(ctx);
    if (this.done) return;
    const m = this.game.input.mouse, hov = inside(m, SKIP);
    ctx.save();
    ctx.globalAlpha = hov ? 1 : 0.6;
    ctx.fillStyle = hov ? 'rgba(255,201,74,0.95)' : 'rgba(16,19,31,0.7)';
    ctx.beginPath(); ctx.roundRect(SKIP.x, SKIP.y, SKIP.w, SKIP.h, 11); ctx.fill();
    text(ctx, 'Skip ⏭', SKIP.x + SKIP.w / 2, SKIP.y + 15, { align: 'center', font: 'bold 12px "Trebuchet MS", sans-serif', color: hov ? PALETTE.ink : PALETTE.paper, shadow: false });
    ctx.restore();
    if (!this.confirm) return;
    ctx.fillStyle = 'rgba(16,19,31,0.7)'; ctx.fillRect(0, 0, 960, 540);
    panel(ctx, 480 - 220, 170, 440, 200, { radius: 18 });
    text(ctx, 'Skip this minigame?', 480, 220, { align: 'center', font: 'bold 26px "Trebuchet MS", sans-serif', color: PALETTE.sun });
    text(ctx, 'The room still counts as fixed, but you get a low score for this part.', 480, 256, { align: 'center', font: '14px "Trebuchet MS", sans-serif', color: PALETTE.paper, maxWidth: 400 });
    button(ctx, this.game, 'Skip it', YES.x, YES.y, YES.w, YES.h, { hotkey: 'Enter' });
    button(ctx, this.game, 'Keep playing', NO.x, NO.y, NO.w, NO.h, { primary: true, hotkey: 'Esc' });
  }
}
