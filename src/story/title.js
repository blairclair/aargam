// Title screen. Owned by: story team.
// The house at dusk with party lights, both photo busts, the title, a glitchy PartyPlanner log,
// New Game / Continue (flow.startNewGame / continueGame) and a controls card.
import { GAME_TITLE, PALETTE, FONT } from '../core/theme.js';
import { hasSave } from '../core/state.js';
import { startNewGame, continueGame } from '../core/flow.js';
import { button, text, panel, keycap } from '../ui/widgets.js';
import { playMusic, playSfx } from '../audio/sfx.js';
import { house, partyLights } from './backdrops.js';
import { LOGS } from './lines.js';

const TAU = Math.PI * 2;
const BTN = { x: 380, w: 200, h: 46, y1: 268, y2: 324 };
const BUSTS = [
  { key: 'bust.aaron.smile', x: 150, h: 330, phase: 0 },
  { key: 'bust.victoria.smile', x: 812, h: 330, phase: 1.7 },
];

export default class TitleScene {
  constructor(game) { this.game = game; }

  enter() {
    this.t = 0;
    this.save = hasSave();
    this.sel = this.save ? 1 : 0;          // keyboard focus: Continue if there is a save
    this.confirmNew = 0;                    // seconds left on "click again to start over"
    this.logI = Math.floor(Math.random() * LOGS.length);
    this.logT = 0;
    this.leaving = false;
    try { playMusic('title'); } catch { /* never block on audio */ }
  }

  newGame() {
    if (this.save && this.confirmNew <= 0) { this.confirmNew = 3; playSfx('error'); return; }
    this.leaving = true; playSfx('unlock'); startNewGame(this.game);
  }
  cont() { this.leaving = true; playSfx('click'); continueGame(this.game); }

  update(dt) {
    if (this.leaving) return;
    const g = this.game, inp = g.input;
    this.t += dt; this.logT += dt;
    this.confirmNew = Math.max(0, this.confirmNew - dt);
    if (this.logT > 3.2) { this.logT = 0; this.logI = (this.logI + 1) % LOGS.length; }
    if (this.save && (inp.pressed('up') || inp.pressed('down'))) { this.sel = 1 - this.sel; playSfx('click'); }
    if (button(null, g, this.newLabel(), BTN.x, BTN.y1, BTN.w, BTN.h)) { this.sel = 0; this.newGame(); return; }
    if (this.save && button(null, g, 'Continue', BTN.x, BTN.y2, BTN.w, BTN.h)) { this.sel = 1; this.cont(); return; }
    if (inp.pressed('confirm')) { if (this.save && this.sel === 1) this.cont(); else this.newGame(); }
  }

  newLabel() { return this.confirmNew > 0 ? 'Start over? Click again' : 'New Game'; }

  render(ctx) {
    const g = this.game, W = g.width, H = g.height, t = this.t;
    house(ctx, W, H, t, true, false);
    partyLights(ctx, -20, 14, W + 20, 14, t, 24);
    // dim the middle a touch so the title pops
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, 'rgba(16,19,31,0.55)'); gr.addColorStop(0.45, 'rgba(16,19,31,0.15)'); gr.addColorStop(1, 'rgba(16,19,31,0.6)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);

    // busts slide up on load, then bob gently
    BUSTS.forEach((b, k) => {
      const img = g.assets?.image?.(b.key);
      if (!img || !img.width) return;
      const e = 1 - Math.pow(1 - Math.min(1, Math.max(0, t * 1.6 - k * 0.25)), 3);
      const w = img.width * (b.h / img.height);
      const y = H - b.h + 18 + (1 - e) * 200 + Math.sin(t * 1.8 + b.phase) * 4;
      ctx.save(); ctx.globalAlpha = e;
      ctx.drawImage(img, b.x - w / 2, y, w, b.h);
      ctx.restore();
    });

    // title
    const bob = Math.sin(t * 2) * 3;
    text(ctx, 'Aaron & Victoria', W / 2, 78 + bob, { align: 'center', baseline: 'middle', font: 'bold 54px "Trebuchet MS", system-ui, sans-serif', color: PALETTE.sun, outline: PALETTE.ink, outlineWidth: 10 });
    text(ctx, 'Aaron & Victoria', W / 2, 78 + bob, { align: 'center', baseline: 'middle', font: 'bold 54px "Trebuchet MS", system-ui, sans-serif', color: PALETTE.sun });
    text(ctx, 'HOUSEWARMING', W / 2, 132 + bob, { align: 'center', baseline: 'middle', font: 'bold 34px "Trebuchet MS", system-ui, sans-serif', color: PALETTE.paper, outline: PALETTE.choc, outlineWidth: 8 });
    text(ctx, 'HOUSEWARMING', W / 2, 132 + bob, { align: 'center', baseline: 'middle', font: 'bold 34px "Trebuchet MS", system-ui, sans-serif', color: PALETTE.paper });
    text(ctx, 'The party starts at 7 PM. The house has other plans.', W / 2, 172, { align: 'center', baseline: 'middle', font: 'italic 17px "Trebuchet MS", sans-serif', color: '#ffe3b0' });

    // PartyPlanner's glitchy log ticker
    this.drawTicker(ctx, W / 2, 218);

    // buttons
    button(ctx, g, this.newLabel(), BTN.x, BTN.y1, BTN.w, BTN.h, { primary: !this.save || this.sel === 0 || this.confirmNew > 0, selected: this.sel === 0, sub: this.save ? null : 'Start the party prep' });
    if (this.save) button(ctx, g, 'Continue', BTN.x, BTN.y2, BTN.w, BTN.h, { primary: this.sel === 1 && this.confirmNew <= 0, selected: this.sel === 1, sub: 'Back to the house map' });

    this.drawControls(ctx, W, H);
    // canonical title string for screen readers/tests
    ctx.save(); ctx.globalAlpha = 0; text(ctx, GAME_TITLE, 0, 0); ctx.restore();
  }

  drawTicker(ctx, cx, cy) {
    const msg = `> ${LOGS[this.logI]}`;
    const shown = msg.slice(0, Math.floor(this.logT * 40));
    const font = '14px Menlo, Consolas, "Courier New", monospace';
    ctx.save();
    ctx.font = font;
    const w = Math.max(300, ctx.measureText(msg).width + 40);
    const jitter = Math.random() < 0.05 ? (Math.random() - 0.5) * 6 : 0;
    ctx.fillStyle = 'rgba(11,20,16,0.85)'; rr(ctx, cx - w / 2 + jitter, cy - 15, w, 30, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(127,216,166,0.7)'; ctx.lineWidth = 1.5; rr(ctx, cx - w / 2 + jitter, cy - 15, w, 30, 8); ctx.stroke();
    text(ctx, shown, cx - w / 2 + 16 + jitter, cy + 1, { font, color: PALETTE.mint, baseline: 'middle', shadow: false });
    const tw = ctx.measureText(shown).width;
    if (Math.floor(this.t * 2.4) % 2 === 0) { ctx.fillStyle = PALETTE.mint; ctx.fillRect(cx - w / 2 + 18 + tw + jitter, cy - 8, 9, 16); }
    ctx.restore();
  }

  drawControls(ctx, W, H) {
    const w = 430, h = 112, x = W / 2 - w / 2, y = H - h - 14;
    panel(ctx, x, y, w, h, { style: 'dark', radius: 14, alpha: 0.92 });
    text(ctx, 'CONTROLS', W / 2, y + 18, { align: 'center', baseline: 'middle', font: 'bold 13px "Trebuchet MS", sans-serif', color: PALETTE.sun });
    const rows = [
      [['←', '↑', '↓', '→'], 'Move', [['Click', 'J']], 'Attack'],
      [['K'], 'Skill 1', [['E']], 'Skill 2'],
      [['Space'], 'Ultimate', [['Esc']], 'Pause / skip scene'],
    ];
    rows.forEach((r, k) => {
      const ry = y + 44 + k * 24;
      let cx = x + 26;
      for (const key of r[0]) cx += keycap(ctx, key, cx + 10, ry) + 3;
      text(ctx, r[1], cx + 6, ry + 1, { baseline: 'middle', font: '14px "Trebuchet MS", sans-serif', color: PALETTE.paper });
      cx = x + 222;
      for (const key of r[2][0]) cx += keycap(ctx, key, cx + 10 + (key.length > 2 ? 8 : 0), ry) + 3 + (key.length > 2 ? 8 : 0);
      text(ctx, r[3], cx + 6, ry + 1, { baseline: 'middle', font: '14px "Trebuchet MS", sans-serif', color: PALETTE.paper });
    });
  }
}

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
