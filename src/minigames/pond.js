// Pond minigame (FINALE): FINAL PATCH. Owned by: games-b.
// PartyPlanner.exe (a giant koi made of code) is down. Patch its code before it reboots.
//   Aaron (debug): each line has one glitching token, so click it (or ←/→ + Enter) to fix it.
//   Victoria (weld): drag the fragment whose shape matches the gap (or ←/→ + Enter).
// Countdown, rising tension, then "PartyPlanner.exe has been terminated".
import { PALETTE } from '../core/theme.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { Fx } from '../art/fx.js';
import { text, chip, keycap } from '../ui/widgets.js';
import { normParams, finishOnce, Bust, prompt, drawHand, banner, rrect, clamp01, easeOut, bark, hexA, vignette } from './b/common.js';

const TAU = Math.PI * 2;
const MONO = 'bold 19px Menlo, Consolas, "Courier New", monospace';
const MONO_S = '13px Menlo, Consolas, "Courier New", monospace';
const KOI = '#ff8a3d', KOI_W = '#fff1e0', TERM_G = '#7dffb0', TERM_BG = 'rgba(8,14,20,0.86)', RED = '#ff4d5e';

// ---- Aaron: {bug|fix} marks the buggy token.
const DEBUG_LINES = [
  'if (guests.arrived {=|===} true) welcome();',
  'sourdough.alive = {true|false};',
  'roomba.mode = {"tank"|"vacuum"};',
  'socks.forEach(s => s.{fight()|pair()});',
  'gnomes.forEach(g => g.{attack()|march()});',
  'party.start = {"7 AM"|"7 PM"};',
  'return {chaos|party};',
];
// ---- Victoria: [frag] marks a gap to weld.
const WELD_LINES = [
  'pipes.leak = [false];',
  'quilt.mend([yarn]);',
  'house.lights = [on];',
  'bread.bake([golden]);',
  'door.open([guests], [warmly]);',
  'yard.gnomes.[march]([in_step]);',
  '[PartyPlanner].[exit](0);',
];
const DECOYS = ['chaos', '9000', '"tank"', 'panic()', 'null', 'forever', 'socks', 'lava', 'undefined', 'gnomes++', 'fire', 'NaN'];
const SHAPES = [
  { id: 'circle', color: '#7fd8a6' }, { id: 'triangle', color: '#ffc94a' }, { id: 'square', color: '#8cc4f0' },
  { id: 'diamond', color: '#ff8fb1' }, { id: 'star', color: '#c9a0dc' },
];

const TX = 30, TY = 92, TW = 560, LH = 38;   // terminal geometry

function tokenize(src) {
  // returns [{s, bug?, fix?, gap?}] with whitespace tokens preserved
  const out = [];
  const re = /\{([^|}]*)\|([^}]*)\}|\[([^\]]*)\]|"[^"]*"|[A-Za-z_][\w.]*\(?\)?|\d+|\s+|./g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1] != null) out.push({ s: m[1], bug: true, fix: m[2] });
    else if (m[3] != null) out.push({ s: m[3], gap: true });
    else out.push({ s: m[0] });
  }
  return out;
}

export default class FinalPatch {
  constructor(game) { this.game = game; }

  enter(params) {
    this.p = normParams(params, 'pond');
    this._finished = false;
    this.mode = this.p.hero === 'victoria' ? 'weld' : 'debug';
    this.fx = new Fx();
    this.bust = new Bust(this.game, this.p.hero);
    this.t = 0; this.st = 0; this.state = 'intro';
    this.total = 75 * this.p.timeMul;
    this.time = this.total;
    this.wrong = 0;
    this.cur = 0;
    this.sel = 0;
    this.drag = null;
    this.hit = [];
    this.flash = 0; this.redFlash = 0;
    this.prevDown = false;
    this.beat = 0;
    this.koiGlyphs = buildKoi();
    this.rain = Array.from({ length: 46 }, (_, i) => ({ x: (i * 211) % 960, y: (i * 97) % 540, v: 30 + (i * 13) % 50, c: '01{};<>/=*'[i % 10] }));
    this.lines = (this.mode === 'debug' ? DEBUG_LINES : WELD_LINES).map((src, li) => this.makeLine(src, li));
    playMusic('boss');
    this.bust.say(bark('pond', 'start', this.p.hero));
  }
  exit() {}

  makeLine(src, li) {
    const toks = tokenize(src);
    const line = { toks, fixed: false, fixT: 0, shake: 0 };
    if (this.mode === 'weld') {
      // assign a distinct shape per gap, and build the tray: correct fragments + decoys with other shapes
      const gaps = toks.filter((t) => t.gap);
      const shapes = shuffle(SHAPES.slice(), li * 7 + 3);
      gaps.forEach((g, i) => { g.shape = shapes[i]; g.filled = false; });
      const nDecoys = Math.max(1, (gaps.length > 1 ? 2 : 3) - this.p.ease);
      const decoyWords = shuffle(DECOYS.slice(), li * 5 + 1);
      const tray = gaps.map((g) => ({ s: g.s, shape: g.shape, gapRef: g }));
      for (let i = 0; i < nDecoys; i++) tray.push({ s: decoyWords[i], shape: shapes[gaps.length + (i % (shapes.length - gaps.length))], decoy: true });
      line.tray = shuffle(tray, li * 11 + 5).map((f) => ({ ...f, used: false, x: 0, y: 0, w: 0, wob: 0 }));
    }
    return line;
  }

  get line() { return this.lines[this.cur]; }

  // ------------------------------------------------------------- update
  update(dt) {
    this.t += dt; this.st += dt;
    this.fx.update(dt); this.bust.update(dt);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.redFlash = Math.max(0, this.redFlash - dt * 3);
    for (const l of this.lines) { l.shake = Math.max(0, l.shake - dt * 4); if (l.fixed) l.fixT += dt; }
    for (const r of this.rain) { r.y += r.v * dt * (1 + this.tension * 2); if (r.y > 560) { r.y = -20; r.x = (r.x + 373) % 960; } }
    const inp = this.game.input, m = inp.mouse;
    const released = this.prevDown && !m.down;
    this.prevDown = m.down;

    if (this.state === 'intro') {
      if (this.st > 3.2 || (this.st > 0.6 && (inp.pressed('confirm') || m.pressed))) { this.state = 'play'; this.st = 0; playSfx('type'); }
      return;
    }
    if (this.state === 'play') {
      this.time -= dt;
      this.bust.tense = this.tension;
      // heartbeat that speeds up with tension
      const rate = 0.9 - this.tension * 0.55;
      this.beat += dt;
      if (this.tension > 0.45 && this.beat > rate) { this.beat = 0; playSfx('drum', { volume: 0.5 + this.tension * 0.5 }); if (this.tension > 0.75) this.fx.addShake(1.5); }
      if (this.time < 15 && !this.warned) { this.warned = true; this.bust.react('worried'); this.bust.say(bark('pond', 'danger', this.p.hero)); }
      if (this.time <= 0) { this.time = 0; this.lose(); return; }
      if (this.mode === 'debug') this.updateDebug(inp, m);
      else this.updateWeld(inp, m, released);
      return;
    }
    if (this.state === 'final') {
      // scripted climax
      const s = this.st;
      if (!this.k1 && s > 1.3) { this.k1 = true; playSfx('type'); playSfx('error'); }
      if (s > 1 && s < 2.2) this.fx.addShake(2 + (s - 1) * 5);
      if (!this.k2 && s > 2.2) {
        this.k2 = true; this.flash = 1; this.fx.addShake(14); playSfx('splash'); playSfx('victory');
        for (const gph of this.koiGlyphs) gph.vx = (Math.random() - 0.5) * 240, gph.vy = -60 - Math.random() * 260, gph.spin = (Math.random() - 0.5) * 8;
        this.fx.confetti(480, 330, 90); this.fx.thaw(480, 300, 120);
        this.bust.react('wow'); this.bust.say(bark('pond', 'win', this.p.hero));
      }
      if (this.k2) for (const gph of this.koiGlyphs) { gph.dx = (gph.dx ?? 0) + gph.vx * dt; gph.dy = (gph.dy ?? 0) + gph.vy * dt; gph.vy += 160 * dt; gph.r = (gph.r ?? 0) + gph.spin * dt; }
      if (s > 3.4 && Math.floor(s * 2) !== Math.floor((s - dt) * 2)) this.fx.confetti(120 + Math.random() * 720, 520, 18);
      if (s > 7.5 || (s > 4.8 && (inp.pressed('confirm') || m.pressed))) {
        const timeFrac = clamp01(this.time / this.total);
        finishOnce(this, true, 0.45 + 0.35 * timeFrac + 0.2 * clamp01(1 - this.wrong * 0.1) - this.p.ease * 0.04);
      }
      return;
    }
    if (this.state === 'lost') {
      if (this.st > 3) finishOnce(this, false, 0.4 * (this.cur / this.lines.length));
    }
  }

  get tension() { return this.state === 'play' ? clamp01(1 - this.time / this.total) : this.state === 'lost' ? 1 : 0; }

  updateDebug(inp, m) {
    const line = this.line;
    const sels = this.hit.filter((h) => h.line === this.cur);
    if (inp.pressed('left')) { this.sel = (this.sel + sels.length - 1) % Math.max(1, sels.length); this.kbd = true; playSfx('blip'); }
    if (inp.pressed('right')) { this.sel = (this.sel + 1) % Math.max(1, sels.length); this.kbd = true; playSfx('blip'); }
    let pick = null;
    if (m.pressed) { pick = sels.find((h) => m.x >= h.x - 3 && m.x <= h.x + h.w + 3 && m.y >= h.y - 16 && m.y <= h.y + 16); this.kbd = false; }
    else if (inp.pressed('confirm') || inp.pressed('KeyJ')) pick = sels[this.sel];
    if (!pick) return;
    const tok = line.toks[pick.tok];
    if (tok.bug) {
      tok.old = tok.s; tok.s = tok.fix; tok.fixedAt = this.t;
      this.lineFixed(pick.x + pick.w / 2, pick.y);
    } else {
      this.miss(pick.x + pick.w / 2, pick.y, 'not the bug');
      tok.bad = this.t;
    }
  }

  updateWeld(inp, m, released) {
    const line = this.line;
    const tray = line.tray;
    const avail = tray.filter((f) => !f.used);
    // keyboard
    if (inp.pressed('left')) { this.sel = (this.sel + avail.length - 1) % Math.max(1, avail.length); this.kbd = true; playSfx('blip'); }
    if (inp.pressed('right')) { this.sel = (this.sel + 1) % Math.max(1, avail.length); this.kbd = true; playSfx('blip'); }
    const gap = line.toks.find((t) => t.gap && !t.filled);
    if ((inp.pressed('confirm') || inp.pressed('KeyJ')) && avail[this.sel] && gap) { this.tryWeld(avail[this.sel], gap); return; }
    // mouse: press on a fragment to pick it up; release over a gap to weld (or click-then-click)
    if (m.pressed) {
      this.kbd = false;
      const f = avail.find((f) => m.x >= f.x && m.x <= f.x + f.w && m.y >= f.y - 18 && m.y <= f.y + 18);
      if (f) { this.drag = { f, ox: m.x - f.x, oy: m.y - f.y, sx: m.x, sy: m.y, moved: false }; playSfx('click'); return; }
      if (this.held) {
        const g = this.gapAt(m.x, m.y);
        if (g) { this.tryWeld(this.held, g); this.held = null; return; }
        this.held = null;
      }
    }
    if (this.drag && m.down && Math.hypot(m.x - this.drag.sx, m.y - this.drag.sy) > 6) this.drag.moved = true;
    if (this.drag && released) {
      const d = this.drag; this.drag = null;
      if (!d.moved) { this.held = d.f; return; }      // a click selects; next click on a gap welds
      const g = this.gapAt(m.x, m.y);
      if (g) this.tryWeld(d.f, g);
    }
  }

  gapAt(x, y) {
    const h = this.hit.find((h) => h.line === this.cur && h.gap && !h.tokRef.filled && x >= h.x - 12 && x <= h.x + h.w + 12 && y >= h.y - 22 && y <= h.y + 22);
    return h?.tokRef ?? null;
  }

  tryWeld(f, gap) {
    const pos = this.hit.find((h) => h.tokRef === gap) ?? { x: 400, y: 300, w: 60 };
    if (f.shape === gap.shape && f.s === gap.s) {
      f.used = true; gap.filled = true; gap.fixedAt = this.t;
      this.fx.sparkle(pos.x + pos.w / 2, pos.y, f.shape.color, 10, 26);
      this.fx.burst(pos.x + pos.w / 2, pos.y, '#ffe9a8', 14, 160); // weld sparks
      playSfx('whack');
      this.sel = 0;
      if (this.line.toks.every((t) => !t.gap || t.filled)) this.lineFixed(pos.x + pos.w / 2, pos.y);
      else this.bust.react('happy');
    } else {
      f.wob = 1;
      this.miss(pos.x + pos.w / 2, pos.y, "doesn't fit");
    }
  }

  lineFixed(x, y) {
    const line = this.line;
    line.fixed = true; line.fixT = 0;
    playSfx('star');
    this.fx.sparkle(x, y, TERM_G, 12, 30);
    this.fx.ringPulse(x, y, TERM_G, 80, 0.5);
    this.fx.floatText(x, y - 26, this.mode === 'debug' ? 'debugged!' : 'welded!', TERM_G);
    this.bust.react('happy');
    // a fixed line buys a little time back
    const bonus = 2.5;
    this.time = Math.min(this.total, this.time + bonus);
    this.fx.floatText(812, 60, `+${bonus}s`, TERM_G, { size: 16 });
    this.cur++; this.sel = 0; this.held = null; this.drag = null;
    if (this.cur >= this.lines.length) { this.state = 'final'; this.st = 0; this.bust.tense = 0; }
    else if (this.cur === Math.floor(this.lines.length / 2)) this.bust.say(bark('pond', 'progress', this.p.hero));
  }

  miss(x, y, why) {
    this.wrong++;
    const pen = 3;
    this.time -= pen;
    this.line.shake = 1;
    this.redFlash = 1;
    playSfx('error');
    this.fx.addShake(5);
    this.fx.floatText(x, y - 24, `${why}  -${pen}s`, RED);
    this.bust.react('oops');
  }

  lose() {
    this.state = 'lost'; this.st = 0;
    playSfx('defeat'); playSfx('splash');
    this.fx.addShake(16); this.redFlash = 1;
    this.bust.react('oops'); this.bust.say(bark('pond', 'fail', this.p.hero));
  }

  // ------------------------------------------------------------- render
  render(ctx) {
    const W = 960, H = 540;
    const ten = this.tension;
    this.drawPond(ctx, ten);
    const sh = this.fx.shakeOffset();
    ctx.save(); ctx.translate(sh.x, sh.y);
    this.drawKoi(ctx, ten);
    if (this.state !== 'final' || this.st < 2.4) this.drawTerminal(ctx, ten);
    this.fx.render(ctx);
    ctx.restore();

    // HUD: countdown + reboot bar
    if (this.state === 'play' || this.state === 'intro' || this.state === 'lost') this.drawCountdown(ctx, ten);
    // tension vignette
    if (ten > 0.4 || this.redFlash > 0) vignette(ctx, W, H, Math.min(0.85, (ten - 0.4) * 1.1 * (0.75 + 0.25 * Math.sin(this.t * (6 + ten * 8))) + this.redFlash * 0.5), '200,20,40');
    this.bust.draw(ctx, 884, H + 8, 150);

    // teaching
    if (this.state === 'intro') {
      prompt(ctx, this.mode === 'debug' ? 'Patch its code before it reboots! Click the glitchy bit.' : 'Patch its code before it reboots! Drag in the matching piece.', 420, 506, this.t, { color: TERM_G });
    } else if (this.state === 'play' && this.cur === 0) {
      prompt(ctx, this.mode === 'debug' ? ['Click the glitching word', 'or', { key: '←' }, { key: '→' }, { key: '↵' }] : ['Drag the matching shape into the gap', 'or', { key: '←' }, { key: '→' }, { key: '↵' }], 400, 506, this.t, { color: TERM_G, font: 'bold 18px "Trebuchet MS", sans-serif' });
      this.drawGhostHand(ctx);
    }
    if (this.state === 'final') this.drawFinale(ctx);
    if (this.state === 'lost') banner(ctx, 'REBOOT COMPLETE', 480, 250, this.st, { color: RED, font: 'bold 52px Menlo, Consolas, monospace', sub: 'PartyPlanner is back up. Try again: it gets easier.' });
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash})`; ctx.fillRect(0, 0, W, H); }
  }

  drawPond(ctx, ten) {
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, '#0d1a2a'); g.addColorStop(0.5, '#123247'); g.addColorStop(1, '#0b2230');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
    // moon reflection
    ctx.save(); ctx.globalAlpha = 0.25;
    for (let i = 0; i < 8; i++) { ctx.fillStyle = '#fff6e5'; ctx.fillRect(820 - i * 3 + Math.sin(this.t * 2 + i) * 6, 60 + i * 16, 60 - i * 6, 3); }
    ctx.restore();
    // code rain in the water
    ctx.save(); ctx.font = MONO_S; ctx.textAlign = 'center';
    for (const r of this.rain) { ctx.fillStyle = hexA(ten > 0.6 ? RED : KOI, 0.12 + ten * 0.1); ctx.fillText(r.c, r.x, r.y); }
    ctx.restore();
    // lily pads
    for (let i = 0; i < 5; i++) {
      const x = [40, 900, 130, 820, 520][i], y = [480, 470, 70, 420, 510][i] + Math.sin(this.t + i) * 3;
      ctx.fillStyle = '#2f6b45'; ctx.beginPath(); ctx.arc(x, y, 24, 0.3, TAU - 0.1); ctx.lineTo(x, y); ctx.fill();
      if (i % 2 === 0) { ctx.fillStyle = '#ffb3c8'; ctx.beginPath(); ctx.arc(x + 6, y - 4, 6, 0, TAU); ctx.fill(); }
    }
    // fireflies (the party lights, waiting)
    for (let i = 0; i < 14; i++) {
      const x = (i * 71 + Math.sin(this.t * 0.7 + i) * 30) % 960, y = 40 + (i * 37) % 200 + Math.cos(this.t + i) * 10;
      ctx.fillStyle = `rgba(255,220,120,${0.25 + 0.25 * Math.sin(this.t * 3 + i)})`;
      ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill();
    }
  }

  drawKoi(ctx, ten) {
    const thrash = this.state === 'lost' ? 1 : ten;
    const fin = this.state === 'final';
    const gone = fin && this.st > 2.2;
    const fade = gone ? clamp01(1 - (this.st - 2.2) / 2) : 1;
    if (fade <= 0) return;
    ctx.save();
    // the koi lurks to the right of the terminal, head toward the code; it thrashes harder as it reboots
    const bob = Math.sin(this.t * 1.3) * 6;
    ctx.translate(752, 250 + bob);
    ctx.rotate(Math.sin(this.t * (1.1 + thrash * 5)) * (0.04 + thrash * 0.07));
    ctx.scale(0.5, 0.5);
    const dying = fin && this.st > 1 && this.st < 2.2;
    const glitch = (this.state === 'play' && Math.random() < 0.02 + ten * 0.12) || (dying && Math.random() < 0.6);
    if (glitch) ctx.translate((Math.random() - 0.5) * 30, 0);
    // silhouette: soft glow + body with orange patches
    if (!gone) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.shadowColor = thrash > 0.6 ? RED : KOI; ctx.shadowBlur = 30 + thrash * 30;
      ctx.fillStyle = 'rgba(255,241,224,0.22)';
      ctx.fill(KOI_PATH);
      ctx.restore();
      ctx.save();
      ctx.clip(KOI_PATH);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = KOI;
      for (const [px, py, r] of [[-170, -40, 70], [-20, 30, 80], [120, -30, 60], [300, 10, 70]]) { ctx.beginPath(); ctx.ellipse(px, py, r * 1.3, r, 0.3, 0, TAU); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = hexA(thrash > 0.6 ? RED : KOI, 0.8); ctx.lineWidth = 3; ctx.stroke(KOI_PATH);
    }
    // code texture
    ctx.font = 'bold 16px Menlo, Consolas, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const flick = Math.floor(this.t * 8);
    for (const g of this.koiGlyphs) {
      const x = g.x + (g.dx ?? 0), y = g.y + (g.dy ?? 0) + Math.sin(this.t * (2 + thrash * 5) + g.x * 0.02) * (2 + thrash * 6) * g.u;
      ctx.globalAlpha = fade * (g.eye ? 1 : 0.55 + 0.35 * ((g.n + flick) % 5 === 0 ? 1 : 0));
      ctx.fillStyle = g.eye ? (fin ? '#888' : thrash > 0.5 ? RED : '#ffe9a8') : g.col;
      const c = g.eye ? g.c : CHARS[(g.n + (Math.random() < 0.02 + thrash * 0.05 ? flick : 0)) % CHARS.length];
      if (g.r) { ctx.save(); ctx.translate(x, y); ctx.rotate(g.r); ctx.fillText(c, 0, 0); ctx.restore(); }
      else ctx.fillText(c, x, y);
    }
    // eye glow
    if (!gone) {
      const e = this.koiGlyphs.find((g) => g.eye);
      const rg = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, 40);
      rg.addColorStop(0, hexA(thrash > 0.5 ? RED : '#ffe9a8', 0.7)); rg.addColorStop(1, hexA(KOI, 0));
      ctx.globalAlpha = 1; ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(e.x, e.y, 40, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawTerminal(ctx, ten) {
    const n = this.lines.length;
    const th = 44 + n * LH + (this.mode === 'weld' ? 84 : 18);
    const fade = this.state === 'final' ? clamp01(1 - (this.st - 1.8) / 0.6) : 1;
    ctx.save(); ctx.globalAlpha *= fade;
    const intro = this.state === 'intro' ? easeOut(this.st / 0.5) : 1;
    ctx.translate(0, (1 - intro) * 30); ctx.globalAlpha *= intro;
    // window
    ctx.fillStyle = TERM_BG; rrect(ctx, TX, TY, TW, th, 12); ctx.fill();
    ctx.strokeStyle = ten > 0.6 && Math.sin(this.t * 10) > 0 ? RED : hexA(TERM_G, 0.7); ctx.lineWidth = 2; rrect(ctx, TX, TY, TW, th, 12); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; rrect(ctx, TX, TY, TW, 30, 12); ctx.fill();
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(TX + 18 + i * 18, TY + 15, 5.5, 0, TAU); ctx.fill(); });
    text(ctx, this.mode === 'debug' ? 'partyplanner.exe: core dump (debugger attached)' : 'partyplanner.exe: core dump (welding torch ready)', TX + TW / 2, TY + 20, { align: 'center', font: MONO_S, color: 'rgba(255,246,229,0.7)', shadow: false });
    // scanlines
    ctx.save(); rrect(ctx, TX, TY, TW, th, 12); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let y = TY; y < TY + th; y += 4) ctx.fillRect(TX, y, TW, 1);
    ctx.restore();

    this.hit = [];
    ctx.font = MONO;
    const cw = ctx.measureText('M').width;
    for (let li = 0; li < n; li++) {
      const line = this.lines[li];
      const y = TY + 44 + li * LH + LH / 2;
      const active = li === this.cur && this.state === 'play';
      const future = li > this.cur;
      const dx = line.shake > 0 ? Math.sin(line.shake * 40) * 6 * line.shake : 0;
      if (active) { ctx.fillStyle = hexA(ten > 0.6 ? RED : PALETTE.sun, 0.12 + 0.05 * Math.sin(this.t * 6)); ctx.fillRect(TX + 8, y - LH / 2 + 2, TW - 16, LH - 4); }
      // gutter: line number + status
      text(ctx, String(li + 1).padStart(2, '0'), TX + 18, y + 6, { font: MONO_S, color: 'rgba(255,246,229,0.35)', shadow: false });
      text(ctx, line.fixed ? '✓' : active ? '▶' : '✗', TX + 44, y + 7, { font: 'bold 16px Menlo, monospace', color: line.fixed ? TERM_G : active ? PALETTE.sun : hexA(RED, future ? 0.5 : 0.9), shadow: false });
      let x = TX + 70 + dx;
      line.toks.forEach((tok, ti) => {
        const s = tok.s;
        if (tok.gap && !tok.filled) {
          const w = Math.max(4, s.length) * cw + 28;
          if (active) this.hit.push({ line: li, tok: ti, x, y, w, gap: true, tokRef: tok });
          this.drawGap(ctx, x, y, w, tok, active);
          x += w + 4; return;
        }
        const w = s.length * cw;
        let col = line.fixed ? TERM_G : future ? 'rgba(255,246,229,0.4)' : '#e6edf3';
        if (!line.fixed && /^"/.test(s)) col = future ? 'rgba(255,200,140,0.45)' : '#ffc88c';
        if (!line.fixed && /^(if|return|for|while)$/.test(s)) col = future ? 'rgba(201,160,220,0.5)' : '#d7a8ff';
        let ox = 0, oy = 0;
        if (tok.bug && !line.fixed) {
          // the glitch "tell": jitter + chromatic split, stronger on retries and as tension rises
          const k = (0.55 + this.p.ease * 0.25) * (future ? 0.5 : 1);
          if (Math.sin(this.t * 9 + ti) > 0.55 - k * 0.3) { ox = (Math.random() - 0.5) * 3 * k; oy = (Math.random() - 0.5) * 2 * k; }
          ctx.save(); ctx.globalAlpha *= 0.55 * k;
          ctx.fillStyle = '#ff3b6b'; ctx.fillText(s, x - 1.5 + ox, y + 6);
          ctx.fillStyle = '#3bd8ff'; ctx.fillText(s, x + 1.5 - ox, y + 6);
          ctx.restore();
        }
        if (active && this.mode === 'debug' && /\S/.test(s)) {
          const idx = this.hit.filter((h) => h.line === li).length;
          this.hit.push({ line: li, tok: ti, x, y, w });
          const m = this.game.input.mouse;
          const hov = this.kbd ? idx === this.sel : m.x >= x - 3 && m.x <= x + w + 3 && m.y >= y - 16 && m.y <= y + 16;
          if (hov) { ctx.strokeStyle = PALETTE.sun; ctx.lineWidth = 2; rrect(ctx, x - 4, y - 14, w + 8, 28, 6); ctx.stroke(); }
          if (tok.bad && this.t - tok.bad < 0.5) { ctx.fillStyle = hexA(RED, 0.35 * (1 - (this.t - tok.bad) / 0.5)); rrect(ctx, x - 4, y - 14, w + 8, 28, 6); ctx.fill(); }
        }
        if (tok.fixedAt && this.t - tok.fixedAt < 0.8) {
          const k = (this.t - tok.fixedAt) / 0.8;
          ctx.fillStyle = hexA(TERM_G, 0.35 * (1 - k)); rrect(ctx, x - 4, y - 14, w + 8, 28, 6); ctx.fill();
          if (tok.shape) { /* welded fragment keeps its color briefly */ }
        }
        ctx.fillStyle = tok.gap && tok.filled && this.t - tok.fixedAt < 1.2 ? tok.shape.color : col;
        ctx.fillText(s, x + ox, y + 6 + oy);
        if (tok.old && this.t - tok.fixedAt < 0.8) {
          // old token flies away
          const k = (this.t - tok.fixedAt) / 0.8;
          ctx.save(); ctx.globalAlpha *= 1 - k; ctx.fillStyle = RED; ctx.fillText(tok.old, x, y + 6 - k * 30); ctx.restore();
        }
        x += w;
      });
      // blinking cursor at the end of the active line
      if (active && Math.sin(this.t * 8) > 0) { ctx.fillStyle = TERM_G; ctx.fillRect(x + 4, y - 9, cw * 0.6, 18); }
    }
    if (this.mode === 'weld' && this.state !== 'final') this.drawTray(ctx, TY + 44 + n * LH + 10);
    ctx.restore();
  }

  drawGap(ctx, x, y, w, tok, active) {
    const c = tok.shape.color;
    ctx.save();
    ctx.setLineDash([5, 4]); ctx.lineDashOffset = -this.t * 18;
    ctx.strokeStyle = active ? c : hexA(c, 0.4); ctx.lineWidth = 2;
    ctx.fillStyle = hexA(c, active ? 0.12 + 0.08 * Math.sin(this.t * 6) : 0.05);
    rrect(ctx, x, y - 14, w, 28, 6); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    drawShape(ctx, tok.shape.id, x + w / 2, y, 8, active ? c : hexA(c, 0.5));
    ctx.restore();
  }

  drawTray(ctx, y0) {
    const line = this.line;
    if (!line?.tray) return;
    text(ctx, 'FRAGMENTS', TX + 18, y0 + 8, { font: MONO_S, color: 'rgba(255,246,229,0.45)', shadow: false });
    ctx.font = MONO;
    const cw = ctx.measureText('M').width;
    const avail = line.tray.filter((f) => !f.used);
    let x = TX + 20;
    const y = y0 + 44;
    const m = this.game.input.mouse;
    for (const f of line.tray) {
      f.w = f.s.length * cw + 46;
      f.x = x; f.y = y;
      x += f.w + 14;
      if (f.used) continue;
      f.wob = Math.max(0, f.wob - 0.05);
      const dragging = this.drag?.f === f && this.drag.moved;
      const fx = dragging ? m.x - this.drag.ox : f.x + Math.sin(f.wob * 30) * 6 * f.wob;
      const fy = dragging ? m.y - this.drag.oy : f.y;
      const selected = (this.kbd && avail[this.sel] === f) || this.held === f;
      this.drawFrag(ctx, f, fx, fy, selected, dragging);
    }
    // keep the dragged one on top (redraw)
    if (this.drag?.moved) { const f = this.drag.f; this.drawFrag(ctx, f, m.x - this.drag.ox, m.y - this.drag.oy, true, true); }
  }

  drawFrag(ctx, f, x, y, selected, dragging) {
    const c = f.shape.color;
    ctx.save();
    if (dragging) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6; }
    ctx.fillStyle = '#1d2733'; rrect(ctx, x, y - 17, f.w, 34, 8); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = selected ? PALETTE.sun : c; ctx.lineWidth = selected ? 3 : 2; rrect(ctx, x, y - 17, f.w, 34, 8); ctx.stroke();
    drawShape(ctx, f.shape.id, x + 17, y, 8, c);
    ctx.font = MONO; ctx.fillStyle = '#e6edf3'; ctx.textBaseline = 'middle'; ctx.fillText(f.s, x + 32, y + 1);
    ctx.restore();
  }

  drawGhostHand(ctx) {
    if (this.st < 0.8 || this.wrong > 0) return;
    if (this.mode === 'debug') {
      const h = this.hit.find((h) => h.line === 0 && this.line.toks[h.tok]?.bug);
      if (!h) return;
      const k = (this.st * 0.8) % 1;
      drawHand(ctx, h.x + h.w / 2 + 2, h.y + 8 + Math.sin(this.t * 6) * 4, k > 0.7 ? (k - 0.7) / 0.3 : 0, 0.9);
    } else {
      const line = this.line;
      const f = line.tray?.find((f) => !f.used && !f.decoy);
      const g = this.hit.find((h) => h.gap && h.tokRef === f?.gapRef);
      if (!f || !g || this.drag) return;
      const k = (this.st * 0.45) % 1;
      const a = easeOut(clamp01((k - 0.15) / 0.6));
      const x = f.x + 17 + (g.x + g.w / 2 - f.x - 17) * a, y = f.y + (g.y - f.y) * a;
      ctx.save(); ctx.globalAlpha = 0.45 * clamp01(k * 5) * clamp01((1 - k) * 6);
      this.drawFrag(ctx, f, x - 17, y, false, true);
      ctx.restore();
      drawHand(ctx, x + 4, y + 12, k < 0.15 || k > 0.75 ? 0.6 : 0, clamp01(k * 5) * clamp01((1 - k) * 6));
    }
  }

  drawCountdown(ctx, ten) {
    const x = 812, y = 26;
    const t = Math.max(0, this.time);
    const s = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    const urgent = t < 15;
    const jit = urgent ? (Math.random() - 0.5) * 3 : 0;
    ctx.save();
    ctx.fillStyle = 'rgba(8,14,20,0.8)'; rrect(ctx, x - 96, y - 18, 238, 76, 12); ctx.fill();
    ctx.strokeStyle = urgent ? RED : hexA(TERM_G, 0.6); ctx.lineWidth = 2; rrect(ctx, x - 96, y - 18, 238, 76, 12); ctx.stroke();
    ctx.restore();
    text(ctx, 'REBOOT IN', x - 82, y + 2, { font: 'bold 12px Menlo, monospace', color: urgent ? RED : 'rgba(255,246,229,0.7)', shadow: false });
    const pulse = urgent ? 1 + 0.08 * Math.max(0, Math.sin(this.t * 12)) : 1;
    ctx.save(); ctx.translate(x + 60 + jit, y + 8); ctx.scale(pulse, pulse);
    text(ctx, s, 0, 0, { align: 'center', baseline: 'middle', font: 'bold 32px Menlo, Consolas, monospace', color: urgent ? RED : PALETTE.paper, outline: PALETTE.ink, outlineWidth: 4 });
    ctx.restore();
    // reboot progress bar
    const f = this.state === 'lost' ? 1 : ten;
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x - 82, y + 32, 210, 10);
    ctx.fillStyle = f > 0.75 ? RED : KOI; ctx.fillRect(x - 82, y + 32, 210 * f, 10);
    for (let i = 1; i < 10; i++) { ctx.fillStyle = 'rgba(8,14,20,0.9)'; ctx.fillRect(x - 82 + i * 21, y + 32, 2, 10); }
    text(ctx, `PartyPlanner.exe rebooting ${Math.round(f * 100)}%`, x + 23, y + 54, { align: 'center', font: '11px Menlo, monospace', color: 'rgba(255,246,229,0.6)', shadow: false });
    if (this.p.playlist) chip(ctx, '♪ Playlist +20% time', x + 142, y + 72, { align: 'right', fill: PALETTE.sky });
    text(ctx, `Patched ${this.cur}/${this.lines.length}`, TX, TY - 12, { font: 'bold 15px Menlo, monospace', color: TERM_G });
  }

  drawFinale(ctx) {
    const s = this.st;
    // terminal log lines typed out
    const log = ['> patch applied (7/7) ✓', '> kill -9 PartyPlanner.exe'];
    ctx.save();
    ctx.font = MONO;
    if (s < 2.4) {
      log.forEach((l, i) => {
        const start = i * 0.9 + 0.2;
        const n = Math.floor(clamp01((s - start) / 0.6) * l.length);
        if (n > 0) text(ctx, l.slice(0, n), TX + 70, TY + 44 + this.lines.length * LH + 30 + i * 26, { font: MONO, color: i ? PALETTE.sun : TERM_G, shadow: false });
      });
    }
    ctx.restore();
    if (s > 2.6) {
      const msg = 'PartyPlanner.exe has been terminated';
      const n = Math.floor(clamp01((s - 2.6) / 1.4) * msg.length);
      const k = s - 2.6;
      ctx.save();
      ctx.fillStyle = `rgba(8,14,20,${Math.min(0.75, k * 0.8)})`; rrect(ctx, 80, 196, 800, 120, 18); ctx.fill();
      ctx.strokeStyle = hexA(TERM_G, Math.min(1, k)); ctx.lineWidth = 3; rrect(ctx, 80, 196, 800, 120, 18); ctx.stroke();
      ctx.restore();
      const cur = Math.sin(this.t * 8) > 0 && n < msg.length + 1 ? '█' : ' ';
      text(ctx, msg.slice(0, n) + (n >= msg.length ? '' : cur), 480, 250, { align: 'center', baseline: 'middle', font: 'bold 34px Menlo, Consolas, monospace', color: TERM_G, outline: PALETTE.ink, outlineWidth: 6 });
      if (s > 4.2) {
        const a = clamp01((s - 4.2) * 2);
        text(ctx, 'The house is safe. The party is ON!', 480, 292, { align: 'center', baseline: 'middle', font: 'bold 20px "Trebuchet MS", sans-serif', color: PALETTE.sun, alpha: a, outline: PALETTE.ink });
      }
      if (s > 4.8) text(ctx, 'click to continue', 480, 520, { align: 'center', font: '13px "Trebuchet MS", sans-serif', color: 'rgba(255,246,229,0.6)' });
    }
  }
}

// --------------------------------------------------------------- helpers
function shuffle(arr, seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

function drawShape(ctx, id, x, y, r, color) {
  ctx.save(); ctx.fillStyle = color; ctx.beginPath();
  if (id === 'circle') ctx.arc(x, y, r, 0, TAU);
  else if (id === 'triangle') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r * 0.8); ctx.lineTo(x - r, y + r * 0.8); ctx.closePath(); }
  else if (id === 'square') ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
  else if (id === 'diamond') { ctx.moveTo(x, y - r * 1.1); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.1); ctx.lineTo(x - r, y); ctx.closePath(); }
  else { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r * 1.1; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }
  ctx.fill(); ctx.restore();
}

const CHARS = '01{}[]();=<>/*+&|!?#$%';
/** Koi silhouette in fish space (nose at x=-320, tail tip at x=400). */
const KOI_PATH = (() => {
  const p = new Path2D();
  p.moveTo(-320, 0);
  p.bezierCurveTo(-310, -70, -200, -120, -60, -112);
  p.bezierCurveTo(80, -104, 180, -60, 250, -22);
  p.bezierCurveTo(300, -60, 360, -130, 405, -120);
  p.bezierCurveTo(370, -60, 360, -20, 350, 0);
  p.bezierCurveTo(360, 20, 370, 60, 405, 120);
  p.bezierCurveTo(360, 130, 300, 60, 250, 22);
  p.bezierCurveTo(180, 60, 80, 104, -60, 112);
  p.bezierCurveTo(-200, 120, -310, 70, -320, 0);
  p.closePath();
  // pectoral fins + dorsal
  p.moveTo(-170, 95); p.bezierCurveTo(-150, 160, -90, 190, -60, 180); p.bezierCurveTo(-80, 150, -110, 120, -120, 100); p.closePath();
  p.moveTo(-60, -110); p.bezierCurveTo(-20, -160, 60, -150, 120, -85); p.closePath();
  return p;
})();

/** Glyphs filling the koi silhouette, orange/white patches, one eye, whiskers. */
function buildKoi() {
  const out = [];
  let test = null;
  try { test = document.createElement('canvas').getContext('2d'); } catch { /* no DOM */ }
  let n = 0;
  for (let y = -190; y <= 190; y += 19) {
    for (let x = -330; x <= 410; x += 15) {
      const xx = x + ((y / 19) % 2 ? 7 : 0);
      if (test && !test.isPointInPath(KOI_PATH, xx, y)) continue;
      n++;
      const patch = Math.sin(xx * 0.02 + 1) * Math.cos(y * 0.03) + Math.sin(xx * 0.011 - y * 0.02) > 0.2;
      out.push({ x: xx, y, u: clamp01((xx + 320) / 720), n: n * 7, col: patch ? KOI : KOI_W });
    }
  }
  out.push({ x: -250, y: -30, u: 0, n: 0, c: '@', eye: true });
  for (let i = 0; i < 5; i++) out.push({ x: -330 - i * 13, y: 26 + i * 9, u: 0, n: 3, col: KOI_W });
  return out;
}
