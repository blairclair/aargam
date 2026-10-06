// DIALOG CONTRACT — Owned by: art/ui/audio team. API FROZEN.
// Any scene can own a Dialog:
//   this.dialog = new Dialog(game);
//   this.dialog.open([{ who: 'aaron', text: 'Is that... a Frostling?' }, { who: 'victoria', text: '...' }], () => onDone());
//   update: if (this.dialog.active) { this.dialog.update(dt); return; }   // dialog eats input while open
//   render: this.dialog.render(ctx);  (screen space, last)
// who: 'aaron' | 'victoria' | any SPEAKERS key ('baron', 'narrator', 'townsfolk') | any string (shown as a name, no portrait)
// Click / Enter / Space: finish the typewriter, then advance. Optional per-line fields: { mood?: 'shout' (shakes), speed?: chars/sec }.
import { HEROES, SPEAKERS, PALETTE, FONT } from '../core/theme.js';
import { drawPortrait, drawEnemy, drawNPC } from '../art/sprites.js';
import { panel, text, wrapText } from './widgets.js';
import { playSfx } from '../audio/sfx.js';

const TAU = Math.PI * 2;
const BODY_FONT = '17px "Trebuchet MS", system-ui, sans-serif';
const NARR_FONT = 'italic 18px "Trebuchet MS", system-ui, sans-serif';

function speakerOf(who) {
  const h = HEROES[who];
  if (h) return { name: h.name, style: 'hero', color: who === 'aaron' ? PALETTE.sun : PALETTE.mint, hero: who };
  const s = SPEAKERS?.[who];
  if (s) return { name: s.name, style: s.style ?? 'normal', color: s.color ?? PALETTE.sun, key: who };
  return { name: String(who ?? ''), style: 'normal', color: PALETTE.sun };
}

export class Dialog {
  constructor(game) { this.game = game; this.lines = []; this.i = 0; this.onDone = null; this.chars = 0; this.t = 0; this.inT = 0; }
  get active() { return this.i < this.lines.length; }
  open(lines, onDone) {
    this.lines = Array.isArray(lines) ? lines.filter(Boolean) : [];
    this.i = 0; this.chars = 0; this.t = 0; this.inT = 0; this._blip = 0;
    this.onDone = onDone ?? null;
    if (!this.lines.length && this.onDone) { const f = this.onDone; this.onDone = null; f(); }
  }
  /** Close immediately (skips the rest), still firing onDone. */
  skipAll() {
    this.i = this.lines.length;
    if (this.onDone) { const f = this.onDone; this.onDone = null; f(); }
  }
  update(dt) {
    if (!this.active) return;
    const inp = this.game.input;
    const l = this.lines[this.i];
    const full = String(l.text ?? '').length;
    this.t += dt; this.inT = Math.min(1, this.inT + dt * 6);
    const speed = l.speed ?? 48;
    const before = Math.floor(this.chars);
    this.chars = Math.min(full, this.chars + dt * speed);
    if (Math.floor(this.chars) > before) {
      this._blip = (this._blip ?? 0) + 1;
      if (this._blip % 3 === 0) playSfx('blip', { who: l.who });
    }
    if (inp.pressed('confirm') || inp.mouse.pressed) {
      if (this.chars < full) { this.chars = full; return; }
      this.i++; this.chars = 0; this.t = 0;
      if (!this.active && this.onDone) { const f = this.onDone; this.onDone = null; f(); }
    }
  }
  render(ctx) {
    if (!this.active) return;
    const g = this.game;
    const l = this.lines[this.i];
    const sp = speakerOf(l.who);
    const W = g.width, H = g.height;
    const ease = 1 - Math.pow(1 - this.inT, 3);
    const bx = 40, bw = W - 80, bh = 118, by = H - bh - 22 + (1 - ease) * 30;
    const full = String(l.text ?? '');
    const shown = full.slice(0, Math.floor(this.chars));
    const done = this.chars >= full.length;
    ctx.save();
    ctx.globalAlpha *= ease;
    // soft dim behind
    const grd = ctx.createLinearGradient(0, H - 200, 0, H);
    grd.addColorStop(0, 'rgba(16,19,31,0)'); grd.addColorStop(1, 'rgba(16,19,31,0.45)');
    ctx.fillStyle = grd; ctx.fillRect(0, H - 200, W, 200);

    if (sp.style === 'narration') {
      panel(ctx, bx + 60, by + 10, bw - 120, bh - 20, { style: 'paper', radius: 16 });
      const lines = wrapText(ctx, full, bw - 200, NARR_FONT);
      let shownLeft = shown.length;
      const y0 = by + bh / 2 - (lines.length - 1) * 12;
      lines.forEach((ln, k) => {
        const part = ln.slice(0, Math.max(0, shownLeft)); shownLeft -= ln.length + 1;
        // measure full line so text does not shift while typing
        ctx.save(); ctx.font = NARR_FONT; const fw = ctx.measureText(ln).width; ctx.restore();
        text(ctx, part, W / 2 - fw / 2, y0 + k * 24, { font: NARR_FONT, color: PALETTE.choc, baseline: 'middle', shadow: false });
      });
      if (done) this._advanceHint(ctx, bx + bw - 76, by + bh - 24, PALETTE.choc);
      ctx.restore();
      return;
    }

    const villain = sp.style === 'villain';
    const shake = l.mood === 'shout' && !done ? (Math.random() - 0.5) * 3 : 0;
    panel(ctx, bx + shake, by, bw, bh, { style: villain ? 'ice' : 'dark', radius: 16 });
    // portrait slot
    const px = bx + 66, py = by + bh / 2;
    const hasPortrait = !!sp.hero || sp.key === 'baron' || sp.key === 'townsfolk';
    if (sp.hero) {
      drawPortrait(ctx, g, sp.hero, px, py - 4, 44, { ring: sp.color, ringWidth: 4, border: 2 });
    } else if (sp.key === 'baron') {
      this._baronBust(ctx, px, py - 4, 44);
    } else if (sp.key === 'townsfolk') {
      this._townsBust(ctx, px, py - 4, 44, l.seed ?? 3);
    }
    // name plate
    const tx = hasPortrait ? bx + 130 : bx + 28;
    if (sp.name) {
      ctx.save();
      ctx.font = 'bold 15px "Trebuchet MS", system-ui, sans-serif';
      const nw = ctx.measureText(sp.name).width + 26;
      const ny = by - 14;
      ctx.fillStyle = villain ? PALETTE.frostDeep : sp.color;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(tx - 6, ny, nw, 26, 13) : ctx.rect(tx - 6, ny, nw, 26); ctx.fill();
      ctx.strokeStyle = villain ? PALETTE.ice : PALETTE.paper; ctx.lineWidth = 2; ctx.stroke();
      if (villain) { // icicles under the plate
        ctx.fillStyle = PALETTE.ice;
        for (let k = 0; k < 5; k++) { const ix = tx + 6 + k * (nw - 24) / 4; ctx.beginPath(); ctx.moveTo(ix - 3, ny + 25); ctx.lineTo(ix + 3, ny + 25); ctx.lineTo(ix, ny + 31 + (k % 2) * 4); ctx.closePath(); ctx.fill(); }
      }
      ctx.restore();
      text(ctx, sp.name, tx + 7, ny + 14, { font: 'bold 15px "Trebuchet MS", system-ui, sans-serif', color: PALETTE.ink, baseline: 'middle', shadow: false });
    }
    // body text with typewriter
    const maxW = bx + bw - tx - 30;
    const lines = wrapText(ctx, full, maxW, BODY_FONT);
    let left = shown.length;
    lines.slice(0, 3).forEach((ln, k) => {
      const part = ln.slice(0, Math.max(0, left)); left -= ln.length + 1;
      text(ctx, part, tx + shake, by + 40 + k * 25, { font: BODY_FONT, color: villain ? PALETTE.ice : PALETTE.paper, baseline: 'middle' });
    });
    if (done) this._advanceHint(ctx, bx + bw - 30, by + bh - 20, villain ? PALETTE.ice : PALETTE.sun);
    // progress dots
    if (this.lines.length > 1) {
      for (let k = 0; k < this.lines.length; k++) {
        ctx.fillStyle = k === this.i ? PALETTE.sun : 'rgba(255,246,229,0.3)';
        ctx.beginPath(); ctx.arc(bx + bw / 2 - (this.lines.length - 1) * 6 + k * 12, by + bh - 12, k === this.i ? 3.2 : 2.4, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }
  _advanceHint(ctx, x, y, col) {
    const b = Math.sin(this.t * 6) * 3;
    ctx.save();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - 7, y - 4 + b); ctx.lineTo(x + 7, y - 4 + b); ctx.lineTo(x, y + 4 + b); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  _baronBust(ctx, x, y, r) {
    ctx.save();
    const gr = ctx.createRadialGradient(x, y - 10, 4, x, y, r);
    gr.addColorStop(0, '#3a5a9a'); gr.addColorStop(1, '#1b2238');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    // Baron is ~120px tall; scale so his head (~y -80) sits in the circle
    drawEnemy(ctx, this.game, 'baron_brrr', x - 2, y + 82, { scale: 0.95, anim: 'idle', facing: 0, t: this.t, hpBar: false });
    ctx.restore();
    ctx.strokeStyle = PALETTE.frost; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  _townsBust(ctx, x, y, r, seed) {
    ctx.save();
    ctx.fillStyle = '#f6e7c8'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    drawNPC(ctx, this.game, 'townsfolk', x, y + 62, { seed, scale: 1.9, anim: 'wave', t: this.t });
    ctx.restore();
    ctx.strokeStyle = PALETTE.sun; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}
