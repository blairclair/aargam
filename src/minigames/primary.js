// Primary Bedroom minigame: CROCHET PATTERN. Owned by: games-b.
// Simon-says: watch the stitch sequence, repeat it (arrow keys / WASD or click the yarn balls).
// Every correct stitch crochets a round of a granny square into the torn quilt; sequences grow.
import { PALETTE } from '../core/theme.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { Fx } from '../art/fx.js';
import { text, keycap, chip } from '../ui/widgets.js';
import { normParams, finishOnce, Bust, prompt, drawHand, backdrop, banner, titleChip, rrect, clamp01, easeOut, easeOutBack, bark, hexA } from './b/common.js';

const TAU = Math.PI * 2;

// The four stitches (real crochet names; Victoria would insist).
const STITCHES = [
  { id: 'chain', name: 'Chain', key: '↑', action: 'up', color: '#ff8fb1', dx: 0, dy: -1 },
  { id: 'single', name: 'Single', key: '→', action: 'right', color: '#7fd8a6', dx: 1, dy: 0 },
  { id: 'double', name: 'Double', key: '↓', action: 'down', color: '#ffc94a', dx: 0, dy: 1 },
  { id: 'treble', name: 'Treble', key: '←', action: 'left', color: '#8cc4f0', dx: -1, dy: 0 },
];

const COLS = 4, ROWS = 3, SQ = 92;
const QX = 70, QY = 120;                     // quilt top-left
const PAD_X = 735, PAD_Y = 300, PAD_R = 92;  // stitch pad center + arm distance
// which quilt cells are torn (mended in this order)
const HOLES = [[1, 0], [2, 1], [0, 1], [3, 2], [1, 2], [3, 0]];
const CREAM = '#fff3dc';

function lengthsFor(ease) {
  return [[3, 4, 4, 5, 5, 6], [3, 3, 4, 4, 5, 5], [2, 3, 3, 4, 4, 5]][ease] ?? [3, 4, 4, 5, 5, 6];
}

export default class CrochetPattern {
  constructor(game) { this.game = game; }

  enter(params) {
    this.p = normParams(params, 'primary');
    this._finished = false;
    this.fx = new Fx();
    this.bust = new Bust(this.game, this.p.hero);
    this.t = 0;
    this.lengths = lengthsFor(this.p.ease);
    this.lives = 3 + this.p.ease;
    this.mistakes = 0; this.timeouts = 0;
    this.round = 0;
    this.seq = [];
    this.squares = HOLES.map(() => ({ prog: 0, shown: 0, done: false, pop: 0, colors: [] }));
    this.btnPulse = [0, 0, 0, 0];
    this.btnGlow = [0, 0, 0, 0];
    this.tangle = 0;
    this.showSpeed = 0.68 * (this.p.ease ? 1.15 : 1);
    this.newRound(true);
    this.setState('intro');
    playMusic('minigame');
    this.bust.say(bark('primary', 'start', this.p.hero));
  }
  exit() {}

  setState(s) { this.state = s; this.st = 0; }

  newRound(first = false) {
    const len = this.lengths[this.round];
    // Simon rule: keep the previous pattern and add new stitches on the end
    const seq = first ? [] : this.seq.slice(0, Math.min(this.seq.length, len - 1));
    while (seq.length < len) {
      let s = Math.floor(Math.random() * 4);
      if (seq.length >= 2 && seq[seq.length - 1] === s && seq[seq.length - 2] === s) s = (s + 1 + Math.floor(Math.random() * 3)) % 4;
      seq.push(s);
    }
    this.seq = seq;
    this.idx = 0;
    const sq = this.squares[this.round];
    sq.colors = seq.map((i) => STITCHES[i].color);
    sq.prog = 0;
  }

  startShow() { this.setState('show'); this.showIdx = -1; this.idx = 0; }

  get inputTime() { return (2.4 + this.seq.length * 1.5) * this.p.timeMul; }

  press(i) {
    const want = this.seq[this.idx];
    const sq = this.squares[this.round];
    this.btnPulse[i] = 1;
    const [bx, by] = btnPos(i);
    if (i === want) {
      this.idx++;
      sq.prog = this.idx / this.seq.length;
      playSfx('stitch', { pitch: i });
      this.fx.sparkle(bx, by, STITCHES[i].color, 4, 20);
      const [cx, cy] = cellCenter(HOLES[this.round]);
      this.fx.burst(cx, cy, STITCHES[i].color, 6, 70);
      if (this.idx >= this.seq.length) this.completeSquare();
    } else {
      this.fail(false);
    }
  }

  fail(timeout) {
    this.mistakes++; if (timeout) this.timeouts++;
    this.lives--;
    playSfx('error');
    this.tangle = 1;
    this.bust.react('oops');
    this.bust.say(bark('primary', 'miss', this.p.hero));
    this.fx.addShake(6);
    const [cx, cy] = cellCenter(HOLES[this.round]);
    this.fx.floatText(cx, cy - 20, timeout ? 'Too slow!' : 'Tangled!', PALETTE.danger, { big: true });
    this.squares[this.round].prog = 0;
    if (this.lives <= 0) { this.setState('lost'); playSfx('defeat'); return; }
    this.setState('tangled');
  }

  completeSquare() {
    const sq = this.squares[this.round];
    sq.done = true; sq.pop = 1;
    const [cx, cy] = cellCenter(HOLES[this.round]);
    this.fx.thaw(cx, cy, 50);
    this.fx.floatText(cx, cy - 30, 'Mended!', PALETTE.sun, { big: true });
    playSfx('star');
    this.bust.react('happy');
    this.bust.say(bark('primary', 'progress', this.p.hero));
    this.setState('done');
  }

  update(dt) {
    this.t += dt; this.st += dt;
    this.fx.update(dt); this.bust.update(dt);
    for (let i = 0; i < 4; i++) { this.btnPulse[i] = Math.max(0, this.btnPulse[i] - dt * 4); this.btnGlow[i] = Math.max(0, this.btnGlow[i] - dt * 2.2); }
    this.tangle = Math.max(0, this.tangle - dt * 1.2);
    for (const sq of this.squares) { sq.shown += (sq.prog - sq.shown) * Math.min(1, dt * 10); sq.pop = Math.max(0, sq.pop - dt * 2); }
    const inp = this.game.input;

    switch (this.state) {
      case 'intro':
        if (this.st > 1.8 || (this.st > 0.4 && (inp.pressed('confirm') || inp.mouse.pressed))) this.startShow();
        break;
      case 'show': {
        // light each stitch in turn
        const step = this.showSpeed;
        const i = Math.floor((this.st - 0.5) / step);
        if (i > this.showIdx && i < this.seq.length) {
          this.showIdx = i;
          const s = this.seq[i];
          this.btnGlow[s] = 1; this.btnPulse[s] = 1;
          playSfx('stitch', { pitch: s });
        }
        if (this.st > 0.5 + this.seq.length * step + 0.35) { this.setState('input'); this.idx = 0; }
        break;
      }
      case 'input': {
        for (let i = 0; i < 4; i++) {
          const s = STITCHES[i];
          if (inp.pressed(s.action)) { this.press(i); if (this.state !== 'input') return; }
        }
        if (inp.mouse.pressed) {
          for (let i = 0; i < 4; i++) {
            const [bx, by] = btnPos(i);
            if (Math.hypot(inp.mouse.x - bx, inp.mouse.y - by) < 40) { this.press(i); break; }
          }
          if (this.state !== 'input') return;
        }
        if (this.st > this.inputTime) this.fail(true);
        break;
      }
      case 'tangled':
        if (this.st > 1.3) this.startShow();
        break;
      case 'done':
        if (this.st > 1.2) {
          this.round++;
          if (this.round >= HOLES.length) { this.setState('won'); this.fx.confetti(QX + COLS * SQ / 2, QY + 40, 80); playSfx('victory'); this.bust.react('wow'); this.bust.say(bark('primary', 'win', this.p.hero)); }
          else { this.newRound(); this.startShow(); }
        }
        break;
      case 'won':
        if (this.st > 3) finishOnce(this, true, 1 - this.mistakes * 0.12 - this.timeouts * 0.05 - this.p.ease * 0.05);
        break;
      case 'lost':
        if (this.st > 2.5) finishOnce(this, false, (this.round / HOLES.length) * 0.4);
        break;
    }
  }

  // ------------------------------------------------------------ render
  render(ctx) {
    const g = this.game;
    backdrop(ctx, g, 'primary', this.t, { top: '#3b2638', bottom: '#2c2030' });
    const sh = this.fx.shakeOffset();
    ctx.save(); ctx.translate(sh.x, sh.y);
    this.drawBed(ctx);
    this.drawQuilt(ctx);
    this.drawPad(ctx);
    this.drawSequence(ctx);
    this.fx.render(ctx);
    ctx.restore();

    titleChip(ctx, 'primary');
    // lives as yarn balls
    for (let i = 0; i < 3 + this.p.ease; i++) yarnBall(ctx, 960 - 30 - i * 28, 26, 10, i < this.lives ? '#ff8fb1' : 'rgba(255,255,255,0.15)', this.t + i);
    text(ctx, 'Yarn', 960 - 40 - (3 + this.p.ease) * 28, 31, { align: 'right', font: 'bold 13px "Trebuchet MS", sans-serif', color: 'rgba(255,246,229,0.8)' });
    const doneN = this.squares.filter((s) => s.done).length;
    chip(ctx, `Squares ${doneN} / ${HOLES.length}`, 480, 30, { align: 'center', font: 'bold 14px "Trebuchet MS", sans-serif', fill: '#ff8fb1' });
    if (this.p.playlist) chip(ctx, '♪ Playlist +20% time', 960 - 16, 54, { align: 'right', fill: PALETTE.sky });

    this.bust.draw(ctx, 900, 548, 135);

    // teaching layer: one prompt at a time
    const r1 = this.round === 0;
    if (this.state === 'intro') {
      const [cx, cy] = cellCenter(HOLES[0]);
      prompt(ctx, 'Mend the torn quilt: copy the stitches!', 480, 500, this.t);
      ctx.save(); ctx.strokeStyle = PALETTE.sun; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -this.t * 20;
      rrect(ctx, cx - SQ / 2 - 4, cy - SQ / 2 - 4, SQ + 8, SQ + 8, 10); ctx.stroke(); ctx.restore();
    } else if (this.state === 'show') {
      prompt(ctx, r1 ? 'Watch the pattern…' : 'Watch…', 480, 500, this.t, { color: '#ff8fb1' });
    } else if (this.state === 'input') {
      if (r1) prompt(ctx, ['Your turn! Repeat it with', { key: '←' }, { key: '↑' }, { key: '↓' }, { key: '→' }, 'or click'], 420, 500, this.t, { color: PALETTE.mint });
      else prompt(ctx, 'Your turn!', 480, 500, this.t, { color: PALETTE.mint });
      // timer ribbon
      const f = 1 - this.st / this.inputTime;
      ctx.fillStyle = 'rgba(16,19,31,0.6)'; rrect(ctx, PAD_X - 110, 474, 220, 8, 4); ctx.fill();
      ctx.fillStyle = f < 0.3 ? PALETTE.danger : '#ff8fb1'; rrect(ctx, PAD_X - 110, 474, 220 * clamp01(f), 8, 4); ctx.fill();
      // first round: ghost hand on the next expected stitch
      if (r1 && this.mistakes === 0 && this.st > 0.6 && this.squares[0].prog < 1) {
        const [bx, by] = btnPos(this.seq[this.idx]);
        const bob = Math.sin(this.t * 6) * 4;
        drawHand(ctx, bx + 6, by + 12 + bob, Math.max(0, Math.sin(this.t * 6)) * 0.6, 0.85);
      }
    } else if (this.state === 'tangled') {
      prompt(ctx, 'Oops, tangled! Watch again…', 480, 500, this.t, { color: PALETTE.danger });
    }
    if (this.state === 'won') banner(ctx, 'Quilt mended!', 480, 230, this.st, { color: '#ff8fb1', sub: 'Every square stitched back in.' });
    if (this.state === 'lost') banner(ctx, 'All tangled up!', 480, 230, this.st, { color: PALETTE.danger, sub: 'Untangle and try again: it gets easier.' });
  }

  drawBed(ctx) {
    // headboard + pillows behind the quilt
    const x = QX - 30, w = COLS * SQ + 60;
    ctx.fillStyle = '#6b4636'; rrect(ctx, x, QY - 80, w, 110, 22); ctx.fill();
    ctx.fillStyle = '#7d5442'; rrect(ctx, x + 12, QY - 68, w - 24, 86, 16); ctx.fill();
    ctx.fillStyle = '#f3e6d6';
    rrect(ctx, x + 40, QY - 40, 140, 50, 22); ctx.fill();
    rrect(ctx, x + w - 180, QY - 40, 140, 50, 22); ctx.fill();
    // mattress edge
    ctx.fillStyle = '#e8dccb'; rrect(ctx, x - 6, QY - 6, w + 12, ROWS * SQ + 36, 14); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rrect(ctx, x - 6, QY + ROWS * SQ + 18, w + 12, 16, 8); ctx.fill();
  }

  drawQuilt(ctx) {
    const sway = this.state === 'won' ? Math.min(1, this.st) : 0;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const hi = HOLES.findIndex(([hx, hy]) => hx === x && hy === y);
      const cx = QX + x * SQ + SQ / 2, cy = QY + y * SQ + SQ / 2 + Math.sin(this.t * 3 + x + y) * 3 * sway;
      if (hi < 0) {
        granny(ctx, cx, cy, SQ, baseColors(x, y), 1);
        continue;
      }
      const sq = this.squares[hi];
      if (sq.done) {
        const s = 1 + sq.pop * 0.18 * Math.sin(sq.pop * Math.PI);
        ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
        granny(ctx, 0, 0, SQ, sq.colors, 1);
        ctx.restore();
        continue;
      }
      // torn hole
      tornHole(ctx, cx, cy, SQ, x * 7 + y * 3);
      if (hi === this.round && sq.shown > 0.01) granny(ctx, cx, cy, SQ, sq.colors, sq.shown, true);
      if (hi === this.round && this.state !== 'intro') {
        ctx.save(); ctx.strokeStyle = hexA(PALETTE.sun, 0.5 + 0.4 * Math.sin(this.t * 5)); ctx.lineWidth = 3;
        rrect(ctx, cx - SQ / 2 + 2, cy - SQ / 2 + 2, SQ - 4, SQ - 4, 8); ctx.stroke(); ctx.restore();
      }
    }
    // stitched seams between squares
    ctx.save(); ctx.strokeStyle = 'rgba(255,243,220,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(QX + x * SQ, QY); ctx.lineTo(QX + x * SQ, QY + ROWS * SQ); ctx.stroke(); }
    for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(QX, QY + y * SQ); ctx.lineTo(QX + COLS * SQ, QY + y * SQ); ctx.stroke(); }
    ctx.restore();
    if (this.tangle > 0) {
      // a red yarn scribble over the current hole
      const [cx, cy] = cellCenter(HOLES[Math.min(this.round, HOLES.length - 1)]);
      ctx.save(); ctx.globalAlpha = this.tangle; ctx.strokeStyle = PALETTE.danger; ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 40; i++) { const a = i * 0.9, r = 10 + (i * 37 % 30); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a * 1.3) * r * 0.8); }
      ctx.stroke(); ctx.restore();
    }
  }

  drawPad(ctx) {
    // wooden hoop behind the pad
    ctx.save();
    ctx.fillStyle = 'rgba(16,19,31,0.55)'; ctx.beginPath(); ctx.arc(PAD_X, PAD_Y, PAD_R + 58, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#b07a4f'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(PAD_X, PAD_Y, PAD_R + 54, 0, TAU); ctx.stroke();
    // the hook in the middle
    ctx.translate(PAD_X, PAD_Y); ctx.rotate(-0.6 + Math.sin(this.t * 2) * 0.05);
    ctx.fillStyle = '#c9cdd6'; rrect(ctx, -4, -34, 8, 64, 4); ctx.fill();
    ctx.fillStyle = '#ff8fb1'; rrect(ctx, -6, 0, 12, 30, 5); ctx.fill();
    ctx.strokeStyle = '#c9cdd6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(4, -34, 5, Math.PI, TAU * 0.9); ctx.stroke();
    ctx.restore();
    const active = this.state === 'input';
    for (let i = 0; i < 4; i++) {
      const s = STITCHES[i], [bx, by] = btnPos(i);
      const glow = this.btnGlow[i], pulse = this.btnPulse[i];
      const m = this.game.input.mouse;
      const hover = active && Math.hypot(m.x - bx, m.y - by) < 40;
      const sc = 1 + pulse * 0.18 + (hover ? 0.05 : 0);
      ctx.save(); ctx.translate(bx, by); ctx.scale(sc, sc);
      if (glow > 0) {
        const rg = ctx.createRadialGradient(0, 0, 10, 0, 0, 64);
        rg.addColorStop(0, hexA(s.color, 0.8 * glow)); rg.addColorStop(1, hexA(s.color, 0));
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 64, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = active || glow > 0 ? 1 : 0.75;
      yarnBall(ctx, 0, 0, 34, s.color, this.t * 0.3 + i);
      stitchIcon(ctx, s.id, 0, -2, 16, PALETTE.ink);
      ctx.restore();
      keycap(ctx, s.key, bx + s.dx * 50, by + s.dy * 50);
      text(ctx, s.name, bx, by + (s.dy === 1 ? -44 : 50), { align: 'center', font: 'bold 13px "Trebuchet MS", sans-serif', color: s.color, outline: PALETTE.ink, outlineWidth: 3 });
    }
  }

  drawSequence(ctx) {
    // pattern card above the pad: what you've seen / what you've stitched
    const n = this.seq.length, w = 34, x0 = PAD_X - (n * w) / 2, y = 112;
    ctx.save();
    ctx.fillStyle = 'rgba(255,243,220,0.95)'; rrect(ctx, x0 - 14, y - 26, n * w + 28, 52, 12); ctx.fill();
    ctx.strokeStyle = '#ff8fb1'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    text(ctx, 'PATTERN', PAD_X, y - 32, { align: 'center', font: 'bold 12px "Trebuchet MS", sans-serif', color: '#ff8fb1' });
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * w + w / 2;
      const s = STITCHES[this.seq[i]];
      let showIcon = false, done = false;
      if (this.state === 'show') showIcon = i <= this.showIdx;
      else if (this.state === 'input') { done = i < this.idx; }
      else if (this.state === 'done' || this.state === 'won') done = true;
      ctx.save();
      ctx.fillStyle = done ? s.color : showIcon ? hexA(s.color, 0.9) : 'rgba(90,58,42,0.15)';
      ctx.beginPath(); ctx.arc(cx, y, 13, 0, TAU); ctx.fill();
      if (this.state === 'input' && i === this.idx) { ctx.strokeStyle = PALETTE.choc; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, y, 16 + Math.sin(this.t * 8), 0, TAU); ctx.stroke(); }
      ctx.restore();
      if (showIcon || done) stitchIcon(ctx, s.id, cx, y, 8, PALETTE.ink);
      else text(ctx, '?', cx, y + 5, { align: 'center', font: 'bold 14px "Trebuchet MS", sans-serif', color: 'rgba(90,58,42,0.45)', shadow: false });
    }
  }
}

function btnPos(i) { const s = STITCHES[i]; return [PAD_X + s.dx * PAD_R, PAD_Y + s.dy * PAD_R]; }
function cellCenter([x, y]) { return [QX + x * SQ + SQ / 2, QY + y * SQ + SQ / 2]; }

const QUILT_SETS = [['#e98aa8', '#fff3dc', '#7fd8a6'], ['#ffc94a', '#e98aa8', '#8cc4f0'], ['#8cc4f0', '#fff3dc', '#ff8fb1'], ['#7fd8a6', '#ffc94a', '#e98aa8'], ['#c9a0dc', '#7fd8a6', '#fff3dc']];
function baseColors(x, y) { return QUILT_SETS[(x * 3 + y * 2) % QUILT_SETS.length]; }

/**
 * Granny square: concentric rounds of 3-stitch clusters on a cream ground. colors: one per round (inner→outer).
 * prog 0..1 draws clusters progressively (the square crochets itself in).
 */
function granny(ctx, cx, cy, size, colors, prog = 1, ghost = false) {
  const half = size / 2 - 3;
  ctx.save();
  ctx.translate(cx, cy);
  if (!ghost || prog > 0) {
    ctx.globalAlpha *= ghost ? Math.min(1, prog * 3) : 1;
    ctx.fillStyle = CREAM; rrect(ctx, -half, -half, half * 2, half * 2, 6); ctx.fill();
  }
  // at most 4 visible rounds; each round has (r+1) three-stitch clusters per side, like a real granny square
  const rounds = Math.max(1, Math.min(4, colors.length));
  const roundCol = (r) => colors[Math.min(colors.length - 1, Math.floor(r * colors.length / rounds))];
  const per = []; let total = 0;
  for (let r = 0; r < rounds; r++) { const n = 4 * (r + 1); per.push(n); total += n; }
  const step = (half - 4) / (rounds + 0.3);
  let budget = prog * total;
  for (let r = 0; r < rounds && budget > 0; r++) {
    const rad = step * (r + 1);
    const n = per[r], perSide = r + 1, sideLen = rad * 2;
    const sw = sideLen / perSide / 4.2;               // spacing of the three stitches in a cluster
    ctx.fillStyle = roundCol(r);
    for (let k = 0; k < n && budget > 0; k++, budget--) {
      const side = Math.floor(k / perSide), j = k % perSide;
      const f = (j + 0.5) / perSide;
      const pts = [[-rad, -rad], [rad, -rad], [rad, rad], [-rad, rad]];
      const a = pts[side], b = pts[(side + 1) % 4];
      const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const pop = Math.min(1, budget);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(pop, pop);
      for (let q = -1; q <= 1; q++) { ctx.beginPath(); ctx.ellipse(q * sw, 0, sw * 0.42, step * 0.4, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }
  // center dot
  if (prog > 0) { ctx.fillStyle = colors[0]; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = 'rgba(90,58,42,0.25)'; ctx.lineWidth = 1.5; rrect(ctx, -half, -half, half * 2, half * 2, 6); ctx.stroke();
  ctx.restore();
}

function tornHole(ctx, cx, cy, size, seed) {
  const half = size / 2 - 3;
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = '#e9d9c3'; rrect(ctx, -half, -half, half * 2, half * 2, 6); ctx.fill();
  ctx.fillStyle = '#2a1e22';
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU, r = half * (0.62 + 0.14 * Math.sin(seed + i * 2.7) * (i % 2 ? 1 : -0.6));
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  // frayed yarn ends
  ctx.strokeStyle = '#e8b9c6'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = seed + i * 0.9, r = half * 0.62;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.quadraticCurveTo(Math.cos(a + 0.3) * r * 0.6, Math.sin(a + 0.3) * r * 0.6, Math.cos(a + 0.1) * r * 0.45, Math.sin(a + 0.1) * r * 0.45);
    ctx.stroke();
  }
  ctx.restore();
}

function yarnBall(ctx, x, y, r, color, t = 0) {
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.15, color); g.addColorStop(1, shadeHex(color, -0.35));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, r * 0.07);
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(0, i * r * 0.28, r * 1.1, r * 0.35, 0.5 + t * 0.05, 0, TAU); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
}

function stitchIcon(ctx, id, x, y, s, color) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, s * 0.16); ctx.lineCap = 'round';
  ctx.beginPath();
  if (id === 'chain') {
    ctx.ellipse(0, -s * 0.45, s * 0.28, s * 0.42, 0, 0, TAU);
    ctx.moveTo(s * 0.28, s * 0.45); ctx.ellipse(0, s * 0.45, s * 0.28, s * 0.42, 0, 0, TAU);
  } else if (id === 'single') {
    ctx.moveTo(-s * 0.6, -s * 0.6); ctx.lineTo(s * 0.6, s * 0.6); ctx.moveTo(s * 0.6, -s * 0.6); ctx.lineTo(-s * 0.6, s * 0.6);
  } else {
    // double = T with one slash, treble = T with two
    ctx.moveTo(-s * 0.5, -s * 0.8); ctx.lineTo(s * 0.5, -s * 0.8); ctx.moveTo(0, -s * 0.8); ctx.lineTo(0, s * 0.8);
    ctx.moveTo(-s * 0.35, -s * 0.05); ctx.lineTo(s * 0.35, -s * 0.35);
    if (id === 'treble') { ctx.moveTo(-s * 0.35, s * 0.35); ctx.lineTo(s * 0.35, s * 0.05); }
  }
  ctx.stroke();
  ctx.restore();
}

function shadeHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

