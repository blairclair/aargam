// DIALOG CONTRACT — Owned by: art team. API FROZEN (constructor, open, skipAll, update, render, active).
// Any scene can own a Dialog:
//   this.dialog = new Dialog(game);
//   this.dialog.open([{ who: 'aaron', text: 'Is that... a bug?', expr: 'surprised' }, { who: 'victoria', text: '...' }], () => onDone());
//   update: if (this.dialog.active) { this.dialog.update(dt); return; }   // dialog eats input while open
//   render: this.dialog.render(ctx);  (screen space, last)
// who: 'aaron' | 'victoria' | any SPEAKERS key ('partyplanner', 'narrator', 'guest', legacy 'baron'/'townsfolk') | any string (name plate only)
// Per-line fields: { who, text, expr?: drawBust expression ('smile'|'neutral'|'happy'|'surprised'|'annoyed'|'determined'|
//   'worried'|'sheepish'|'sad'|'thinking'), mood?: 'shout' (shakes the box), speed?: chars/sec, bust?: false (hide busts this line) }
// Heroes appear as big photo-cutout busts behind the box: Aaron on the left, Victoria on the right. The speaker is bright,
// a hero who spoke earlier in the same conversation stays on as a dimmed listener.
// Optional 3rd arg to open(): { busts?: false (no busts at all, compact) }.
// Click / Enter / Space: finish the typewriter, then advance.
import { HEROES, SPEAKERS, PALETTE } from '../core/theme.js';
import { drawEnemy, drawNPC, drawBust } from '../art/sprites.js';
import { panel, text, wrapText } from './widgets.js';
import { playSfx } from '../audio/sfx.js';

const TAU = Math.PI * 2;
const BODY_FONT = '17px "Trebuchet MS", system-ui, sans-serif';
const NARR_FONT = 'italic 18px "Trebuchet MS", system-ui, sans-serif';
const MONO_FONT = '16px "SF Mono", Menlo, Consolas, "Courier New", monospace';
const MONO_BOLD = 'bold 13px "SF Mono", Menlo, Consolas, "Courier New", monospace';
const TERM_GREEN = '#7dff9b';
const SIDE = { aaron: 1, victoria: -1 }; // 1 = left of screen

function speakerOf(who) {
  const h = HEROES[who];
  if (h) return { name: h.name, style: 'hero', color: who === 'aaron' ? PALETTE.sun : PALETTE.mint, hero: who };
  const s = SPEAKERS?.[who];
  if (s) return { name: s.name, style: s.style ?? 'normal', color: s.color ?? PALETTE.sun, key: who };
  return { name: String(who ?? ''), style: 'normal', color: PALETTE.sun };
}

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }

export class Dialog {
  constructor(game) { this.game = game; this.lines = []; this.i = 0; this.onDone = null; this.chars = 0; this.t = 0; this.inT = 0; this.cast = {}; this.opts = {}; }
  get active() { return this.i < this.lines.length; }
  open(lines, onDone, opts = {}) {
    this.lines = Array.isArray(lines) ? lines.filter(Boolean) : [];
    this.i = 0; this.chars = 0; this.t = 0; this.inT = 0; this._blip = 0; this.clock = 0;
    this.cast = {}; // hero -> { expr, inT (0..1), lastI }
    this.opts = opts ?? {};
    this.onDone = onDone ?? null;
    this._noteSpeaker();
    if (!this.lines.length && this.onDone) { const f = this.onDone; this.onDone = null; f(); }
  }
  /** Close immediately (skips the rest), still firing onDone. */
  skipAll() {
    this.i = this.lines.length;
    if (this.onDone) { const f = this.onDone; this.onDone = null; f(); }
  }
  _noteSpeaker() {
    const l = this.lines[this.i];
    if (!l || !HEROES[l.who]) return;
    const c = this.cast[l.who] ?? (this.cast[l.who] = { inT: 0 });
    c.expr = l.expr ?? 'smile'; c.lastI = this.i;
  }
  update(dt) {
    if (!this.active) return;
    const inp = this.game.input;
    const l = this.lines[this.i];
    const full = String(l.text ?? '').length;
    this.t += dt; this.clock += dt; this.inT = Math.min(1, this.inT + dt * 6);
    for (const c of Object.values(this.cast)) c.inT = Math.min(1, c.inT + dt * 4);
    const speed = l.speed ?? (speakerOf(l.who).style === 'terminal' ? 60 : 48);
    const before = Math.floor(this.chars);
    this.chars = Math.min(full, this.chars + dt * speed);
    if (Math.floor(this.chars) > before) {
      this._blip = (this._blip ?? 0) + 1;
      if (this._blip % 3 === 0) playSfx(speakerOf(l.who).style === 'terminal' ? 'type' : 'blip', { who: l.who });
    }
    if (inp.pressed('confirm') || inp.mouse.pressed) {
      if (this.chars < full) { this.chars = full; return; }
      this.i++; this.chars = 0; this.t = 0;
      if (!this.active && this.onDone) { const f = this.onDone; this.onDone = null; f(); return; }
      this._noteSpeaker();
    }
  }

  // ------------------------------------------------------------------ render
  render(ctx) {
    if (!this.active) return;
    const g = this.game;
    const l = this.lines[this.i];
    const sp = speakerOf(l.who);
    const W = g.width, H = g.height;
    const ease = 1 - Math.pow(1 - this.inT, 3);
    const bx = 40, bw = W - 80, bh = 124, by = H - bh - 18 + (1 - ease) * 30;
    const full = String(l.text ?? '');
    const shown = full.slice(0, Math.floor(this.chars));
    const done = this.chars >= full.length;
    ctx.save();
    ctx.globalAlpha *= ease;
    // soft dim behind
    const grd = ctx.createLinearGradient(0, H - 260, 0, H);
    grd.addColorStop(0, 'rgba(16,19,31,0)'); grd.addColorStop(1, 'rgba(16,19,31,0.5)');
    ctx.fillStyle = grd; ctx.fillRect(0, H - 260, W, 260);

    if (sp.style === 'narration') {
      panel(ctx, bx + 60, by + 10, bw - 120, bh - 20, { style: 'paper', radius: 16 });
      const lines = wrapText(ctx, full, bw - 200, NARR_FONT);
      let shownLeft = shown.length;
      const y0 = by + bh / 2 - (lines.length - 1) * 12;
      lines.forEach((ln, k) => {
        const part = ln.slice(0, Math.max(0, shownLeft)); shownLeft -= ln.length + 1;
        ctx.save(); ctx.font = NARR_FONT; const fw = ctx.measureText(ln).width; ctx.restore();
        text(ctx, part, W / 2 - fw / 2, y0 + k * 24, { font: NARR_FONT, color: PALETTE.choc, baseline: 'middle', shadow: false });
      });
      if (done) this._advanceHint(ctx, bx + bw - 76, by + bh - 24, PALETTE.choc);
      ctx.restore();
      return;
    }

    // ---- busts (behind the box)
    if (this.opts.busts !== false && l.bust !== false) this._busts(ctx, l, sp, by);

    if (sp.style === 'terminal') { this._terminal(ctx, l, sp, bx, by, bw, bh, full, shown, done); ctx.restore(); return; }

    const villain = sp.style === 'villain';
    const shake = l.mood === 'shout' && !done ? (Math.random() - 0.5) * 3 : 0;
    panel(ctx, bx + shake, by, bw, bh, { style: villain ? 'ice' : 'dark', radius: 16 });
    // legacy round portraits for non-hero characters
    const legacyPortrait = sp.key === 'baron' || sp.key === 'townsfolk';
    const px = bx + 66, py = by + bh / 2;
    if (sp.key === 'baron') this._baronBust(ctx, px, py - 4, 44);
    else if (sp.key === 'townsfolk') this._townsBust(ctx, px, py - 4, 44, l.seed ?? 3);
    const right = sp.hero && SIDE[sp.hero] === -1;
    const tx = legacyPortrait ? bx + 130 : bx + 30;
    // name plate: on the speaker's side
    if (sp.name) {
      ctx.save();
      ctx.font = 'bold 15px "Trebuchet MS", system-ui, sans-serif';
      const nw = ctx.measureText(sp.name).width + 26;
      const ny = by - 14;
      const nx = right ? bx + bw - 24 - nw : tx - 6;
      ctx.fillStyle = villain ? PALETTE.frostDeep : sp.color;
      rr(ctx, nx, ny, nw, 26, 13); ctx.fill();
      ctx.strokeStyle = villain ? PALETTE.ice : PALETTE.paper; ctx.lineWidth = 2; ctx.stroke();
      if (villain) {
        ctx.fillStyle = PALETTE.ice;
        for (let k = 0; k < 5; k++) { const ix = nx + 12 + k * (nw - 24) / 4; ctx.beginPath(); ctx.moveTo(ix - 3, ny + 25); ctx.lineTo(ix + 3, ny + 25); ctx.lineTo(ix, ny + 31 + (k % 2) * 4); ctx.closePath(); ctx.fill(); }
      }
      ctx.restore();
      text(ctx, sp.name, nx + 13, ny + 14, { font: 'bold 15px "Trebuchet MS", system-ui, sans-serif', color: PALETTE.ink, baseline: 'middle', shadow: false });
    }
    // body text with typewriter
    const maxW = bx + bw - tx - 40;
    const lines = wrapText(ctx, full, maxW, BODY_FONT);
    let left = shown.length;
    const y0 = by + 38 + (lines.length < 3 ? (3 - Math.min(3, lines.length)) * 6 : 0);
    lines.slice(0, 3).forEach((ln, k) => {
      const part = ln.slice(0, Math.max(0, left)); left -= ln.length + 1;
      text(ctx, part, tx + shake, y0 + k * 25, { font: BODY_FONT, color: villain ? PALETTE.ice : PALETTE.paper, baseline: 'middle' });
    });
    if (done) this._advanceHint(ctx, bx + bw - 30, by + bh - 20, villain ? PALETTE.ice : PALETTE.sun);
    this._dots(ctx, bx, by, bw, bh, PALETTE.sun, 'rgba(255,246,229,0.3)');
    ctx.restore();
  }

  _busts(ctx, l, sp, by) {
    const g = this.game;
    const H = 320, baseY = by + 92;
    const W = g.width;
    // draw listeners first, then the speaker on top
    const heroes = Object.keys(this.cast).sort((a, b) => (a === sp.hero ? 1 : 0) - (b === sp.hero ? 1 : 0));
    for (const id of heroes) {
      const c = this.cast[id];
      const speaking = id === sp.hero;
      const side = SIDE[id] ?? 1;
      const x = side === 1 ? 150 : W - 150;
      drawBust(ctx, g, id, speaking ? c.expr : (c.expr === 'smile' || c.expr === 'happy' ? 'smile' : 'neutral'), x, baseY + (speaking ? 0 : 6), speaking ? H : H * 0.94, {
        t: this.clock, exprT: speaking ? this.t : 99, talking: speaking && this.chars < String(l.text ?? '').length,
        dim: speaking ? 0 : 0.55, enter: c.inT, side, overlays: speaking,
      });
    }
  }

  _terminal(ctx, l, sp, bx, by, bw, bh, full, shown, done) {
    const t = this.clock;
    const glitch = this.t < 0.18 ? (Math.random() - 0.5) * 6 : 0;
    const x = bx + glitch, y = by;
    ctx.save();
    // window body
    ctx.fillStyle = 'rgba(8,10,18,0.45)'; rr(ctx, x + 3, y + 5, bw, bh, 10); ctx.fill();
    const gr = ctx.createLinearGradient(0, y, 0, y + bh);
    gr.addColorStop(0, '#0d1f17'); gr.addColorStop(1, '#06100b');
    ctx.fillStyle = gr; rr(ctx, x, y, bw, bh, 10); ctx.fill();
    // title bar
    ctx.save(); rr(ctx, x, y, bw, bh, 10); ctx.clip();
    ctx.fillStyle = '#163526'; ctx.fillRect(x, y, bw, 24);
    for (const [k, col] of [[0, '#ff5f57'], [1, '#febc2e'], [2, '#28c840']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 16 + k * 16, y + 12, 5, 0, TAU); ctx.fill(); }
    text(ctx, `${sp.name || 'PartyPlanner.exe'} — party.log`, x + bw / 2, y + 13, { font: MONO_BOLD, color: 'rgba(125,255,155,0.8)', align: 'center', baseline: 'middle', shadow: false });
    // scanlines + faint glow sweep
    ctx.fillStyle = 'rgba(125,255,155,0.035)';
    for (let yy = y + 24; yy < y + bh; yy += 3) ctx.fillRect(x, yy, bw, 1);
    const sweep = ((t * 0.35) % 1) * (bh + 40) - 20;
    const sg = ctx.createLinearGradient(0, y + sweep - 20, 0, y + sweep + 20);
    sg.addColorStop(0, 'rgba(125,255,155,0)'); sg.addColorStop(0.5, 'rgba(125,255,155,0.06)'); sg.addColorStop(1, 'rgba(125,255,155,0)');
    ctx.fillStyle = sg; ctx.fillRect(x, y + sweep - 20, bw, 40);
    ctx.restore();
    ctx.strokeStyle = sp.color ?? PALETTE.mint; ctx.lineWidth = 2; rr(ctx, x, y, bw, bh, 10); ctx.stroke();
    ctx.shadowColor = TERM_GREEN; ctx.shadowBlur = 10; ctx.globalAlpha *= 0.35; ctx.stroke();
    ctx.restore();

    // text: prompt + typewriter + blinking block cursor
    const prompt = /^\s*>/.test(full) ? '' : '> ';
    const body = prompt + full, shownBody = prompt + shown;
    const tx = x + 26, maxW = bw - 60;
    const lines = wrapText(ctx, body, maxW, MONO_FONT);
    let left = shownBody.length;
    let cx = tx, cy = y + 46;
    ctx.save();
    ctx.shadowColor = 'rgba(125,255,155,0.6)'; ctx.shadowBlur = 6;
    lines.slice(0, 3).forEach((ln, k) => {
      const part = ln.slice(0, Math.max(0, left)); left -= ln.length + 1;
      ctx.font = MONO_FONT; ctx.fillStyle = TERM_GREEN; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(part, tx, y + 46 + k * 24);
      if (part.length > 0 || k === 0) { cx = tx + ctx.measureText(part).width; cy = y + 46 + k * 24; }
    });
    // cursor
    if (Math.floor(t * 2.5) % 2 === 0 || !done) { ctx.fillStyle = TERM_GREEN; ctx.fillRect(cx + 2, cy - 9, 9, 18); }
    ctx.restore();
    if (done) text(ctx, '[ENTER]', x + bw - 20, y + bh - 16, { font: MONO_BOLD, color: `rgba(125,255,155,${0.5 + 0.5 * Math.sin(this.t * 6)})`, align: 'right', baseline: 'middle', shadow: false });
    this._dots(ctx, bx, by, bw, bh, TERM_GREEN, 'rgba(125,255,155,0.25)');
  }

  _dots(ctx, bx, by, bw, bh, on, off) {
    if (this.lines.length <= 1) return;
    const n = this.lines.length;
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = k === this.i ? on : off;
      ctx.beginPath(); ctx.arc(bx + bw / 2 - (n - 1) * 6 + k * 12, by + bh - 12, k === this.i ? 3.2 : 2.4, 0, TAU); ctx.fill();
    }
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
