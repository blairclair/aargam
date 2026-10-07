// Guest Bedroom minigame: PIPE FIXER. Owned by: games-b.
// Rotate pipe tiles so the water runs from the LEAK to the DRAIN before the room floods.
// 3 handcrafted boards (4x4, 5x5, 6x6). Mouse: click = turn (right-click = turn back).
// Keyboard: arrows/WASD move the cursor, Space/Enter/J turn.
import { PALETTE } from '../core/theme.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { Fx } from '../art/fx.js';
import { text, bar, chip } from '../ui/widgets.js';
import { normParams, finishOnce, Bust, prompt, drawHand, backdrop, banner, titleChip, rrect, clamp01, easeOut, bark, hexA } from './b/common.js';

const TAU = Math.PI * 2;
const N = 1, E = 2, S = 4, W = 8;
const DIRS = [[N, 0, -1, S], [E, 1, 0, W], [S, 0, 1, N], [W, -1, 0, E]];
const rot1 = (m) => ((m << 1) | (m >> 3)) & 15;
const rotN = (m, n) => { for (let i = 0; i < ((n % 4) + 4) % 4; i++) m = rot1(m); return m; };
const WATER = '#5ec4f2', WATER_DEEP = '#2f86c4', PIPE = '#c9cdd6', PIPE_DARK = '#7d8494', COPPER = '#d98c4a';

// Handcrafted boards: the solution path (cell list) from the leak (left edge) to the drain (right edge).
// Filler tiles are fixed per board (seeded), so every board plays the same every time.
const BOARDS = [
  { cols: 4, rows: 4, seed: 11, path: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2], [2, 3], [3, 3]] },
  { cols: 5, rows: 5, seed: 23, path: [[0, 2], [0, 3], [1, 3], [2, 3], [2, 2], [2, 1], [3, 1], [3, 0], [4, 0]] },
  { cols: 6, rows: 6, seed: 37, path: [[0, 4], [1, 4], [1, 5], [2, 5], [3, 5], [3, 4], [3, 3], [2, 3], [2, 2], [2, 1], [2, 0], [3, 0], [4, 0], [4, 1], [5, 1]] },
];

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function dirBetween(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return dx === 1 ? E : dx === -1 ? W : dy === 1 ? S : N;
}

function buildBoard(def, ease) {
  const rnd = seeded(def.seed);
  const { cols, rows, path } = def;
  const tiles = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const r = rnd();
    // filler: elbows and straights mostly, a few tees; never empty so the board reads as plumbing
    const base = r < 0.45 ? (N | E) : r < 0.8 ? (N | S) : (N | E | S);
    tiles.push({ x, y, mask: rotN(base, Math.floor(rnd() * 4)), onPath: false, need: 0, ang: 0, rot: 0, wet: 0, pop: 0, dist: 99, parent: -1 });
  }
  const at = (x, y) => tiles[y * cols + x];
  path.forEach((c, i) => {
    const a = i === 0 ? W : dirBetween(c, path[i - 1]);
    const b = i === path.length - 1 ? E : dirBetween(c, path[i + 1]);
    const t = at(c[0], c[1]);
    t.mask = a | b; t.onPath = true; t.solved = a | b;
  });
  // scramble path tiles. Retries leave more of the path already right.
  const keepFrac = [0, 0.35, 0.55][ease] ?? 0;
  path.forEach((c, i) => {
    const t = at(c[0], c[1]);
    const straight = t.mask === (N | S) || t.mask === (E | W);
    if (i > 0 && rnd() < keepFrac) return;
    let k = 1 + Math.floor(rnd() * 3);
    if (straight && k === 2) k = 1;
    t.mask = rotN(t.mask, k);
  });
  // first path tile must start wrong so the demo has something to show
  const first = at(path[0][0], path[0][1]);
  if (first.mask === first.solved) first.mask = rotN(first.mask, 1);
  // also scramble fillers a bit
  for (const t of tiles) if (!t.onPath) t.mask = rotN(t.mask, Math.floor(rnd() * 4));
  return { cols, rows, tiles, at, src: path[0], drain: path[path.length - 1], path };
}

export default class PipeFixer {
  constructor(game) { this.game = game; }

  enter(params) {
    this.p = normParams(params, 'guest');
    this._finished = false;
    this.fx = new Fx();
    this.bust = new Bust(this.game, this.p.hero);
    this.t = 0;
    this.boardIdx = 0;
    this.level = 0; this.peak = 0;
    const fixit = this.p.hero === 'victoria' ? 1.1 : 1;
    this.fillTime = 72 * this.p.timeMul * fixit;      // seconds for the room to fill completely
    this.rotations = 0; this.minRotations = 0;
    this.cursor = { x: 0, y: 0 };
    this.state = 'demo';
    this.stateT = 0;
    this.taught = false;
    this.loadBoard(0);
    playMusic('minigame');
    this.bust.say(bark('guest', 'start', this.p.hero));
  }

  exit() {}

  loadBoard(i) {
    this.boardIdx = i;
    this.b = buildBoard(BOARDS[i], this.p.ease);
    const { cols, rows } = this.b;
    this.tile = Math.min(86, Math.floor(380 / rows));
    this.ox = Math.round(500 - (cols * this.tile) / 2);
    this.oy = Math.round(300 - (rows * this.tile) / 2);
    for (const t of this.b.tiles) {
      // visual rotation tracks clicks; mask is the logical state
      t.ang = 0; t.target = 0;
      if (t.onPath) {
        let k = 0, m = t.mask;
        while (m !== t.solved && k < 4) { m = rot1(m); k++; }
        t.need = k;
        this.minRotations += k;
      }
    }
    this.cursor = { x: this.b.src[0], y: this.b.src[1] };
    this.slide = 0;
    this.flow();
    if (i === 0) {
      const first = this.b.at(this.b.src[0], this.b.src[1]);
      this.demo = { tile: first, clicks: first.need, done: 0 };
    }
  }

  /** BFS from the leak along mutually-connected openings. */
  flow() {
    const b = this.b;
    for (const t of b.tiles) { t.flooded = false; t.dist = 99; t.parent = -1; }
    const s = b.at(b.src[0], b.src[1]);
    if (!(s.mask & W)) { this.connected = false; return; }
    const q = [s]; s.flooded = true; s.dist = 0; s.parent = -2;
    while (q.length) {
      const t = q.shift();
      for (const [bit, dx, dy, opp] of DIRS) {
        if (!(t.mask & bit)) continue;
        const nx = t.x + dx, ny = t.y + dy;
        if (nx < 0 || ny < 0 || nx >= b.cols || ny >= b.rows) continue;
        const n = b.at(nx, ny);
        if (n.flooded || !(n.mask & opp)) continue;
        n.flooded = true; n.dist = t.dist + 1; n.parent = t.y * b.cols + t.x;
        q.push(n);
      }
    }
    const d = b.at(b.drain[0], b.drain[1]);
    this.connected = d.flooded && !!(d.mask & E);
  }

  turn(t, dir = 1) {
    t.mask = dir > 0 ? rot1(t.mask) : rotN(t.mask, 3);
    t.target += dir * Math.PI / 2;
    t.pop = 1;
    this.rotations++;
    playSfx('pipe');
    const was = this.connected;
    this.flow();
    if (this.connected && !was) this.drainPending = true;
  }

  tileAt(mx, my) {
    const { cols, rows } = this.b;
    const x = Math.floor((mx - this.ox) / this.tile), y = Math.floor((my - this.oy) / this.tile);
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
    return this.b.at(x, y);
  }

  center(t) { return [this.ox + (t.x + 0.5) * this.tile, this.oy + (t.y + 0.5) * this.tile]; }

  update(dt) {
    this.t += dt; this.stateT += dt;
    this.fx.update(dt); this.bust.update(dt);
    const inp = this.game.input, m = inp.mouse;
    const b = this.b;

    for (const t of b.tiles) {
      t.ang += (t.target - t.ang) * Math.min(1, dt * 18);
      t.pop = Math.max(0, t.pop - dt * 5);
      // water advances along the BFS tree, one tile after another
      const parentWet = t.parent === -2 ? 1 : t.parent >= 0 ? b.tiles[t.parent].wet : 0;
      if (t.flooded && parentWet > 0.75) t.wet = Math.min(1, t.wet + dt * 7);
      else if (!t.flooded) t.wet = Math.max(0, t.wet - dt * 5);
    }
    this.slide = Math.min(1, this.slide + dt * 3);

    if (this.state === 'demo') {
      // ghost hand turns the first pipe so the player sees cause and effect. Any input skips.
      const d = this.demo;
      const clickAt = 1.1 + d.done * 0.7;
      if (d.done < d.clicks && this.stateT > clickAt) { this.turn(d.tile); this.rotations--; this.minRotations -= 1; d.tile.need = Math.max(0, d.tile.need - 1); d.done++; }
      const userActed = m.pressed || m.rightPressed || inp.pressed('confirm') || inp.pressed('KeyJ');
      if (this.stateT > 1.1 + d.clicks * 0.7 + 1.4 || (userActed && this.stateT > 0.3)) {
        this.state = 'play'; this.stateT = 0;
        if (!userActed) return;
      } else return;
    }

    if (this.state === 'play') {
      // rising water
      this.level = Math.min(1, this.level + dt / this.fillTime);
      this.peak = Math.max(this.peak, this.level);
      this.bust.tense = clamp01((this.level - 0.6) / 0.35);
      if (this.level > 0.75 && !this.warned) { this.warned = true; this.bust.react('worried'); this.bust.say(bark('guest', 'danger', this.p.hero)); playSfx('error'); }
      if (this.level >= 1) { this.lose(); return; }

      // input
      const hov = this.tileAt(m.x, m.y);
      if (hov && (m.pressed || m.rightPressed || this._lastMx !== m.x || this._lastMy !== m.y)) this.cursor = { x: hov.x, y: hov.y };
      this._lastMx = m.x; this._lastMy = m.y;
      if (hov && m.pressed) this.turn(hov, 1);
      else if (hov && m.rightPressed) this.turn(hov, -1);
      const c = this.cursor;
      if (inp.pressed('left')) c.x = Math.max(0, c.x - 1);
      if (inp.pressed('right')) c.x = Math.min(b.cols - 1, c.x + 1);
      if (inp.pressed('up')) c.y = Math.max(0, c.y - 1);
      if (inp.pressed('down')) c.y = Math.min(b.rows - 1, c.y + 1);
      if (inp.pressed('confirm') || inp.pressed('KeyJ')) this.turn(b.at(c.x, c.y), 1);
      if (inp.pressed('KeyQ')) this.turn(b.at(c.x, c.y), -1);

      // board complete once water physically reaches the drain
      const d = b.at(b.drain[0], b.drain[1]);
      if (this.connected && d.wet >= 1) this.clearBoard();
    } else if (this.state === 'cleared') {
      this.level = Math.max(this.levelAfter, this.level - dt * 0.35);
      if (this.stateT > 1.6) {
        if (this.boardIdx + 1 < BOARDS.length) { this.loadBoard(this.boardIdx + 1); this.state = 'play'; this.stateT = 0; }
        else { this.state = 'won'; this.stateT = 0; this.fx.confetti(480, 300, 70); playSfx('victory'); this.bust.react('wow'); this.bust.say(bark('guest', 'win', this.p.hero)); }
      }
    } else if (this.state === 'won') {
      this.level = Math.max(0, this.level - dt * 0.4);
      if (this.stateT > 2.6) {
        const extra = Math.max(0, this.rotations - this.minRotations);
        const score = 0.45 + 0.55 * (1 - this.peak) - Math.min(0.15, extra * 0.006);
        finishOnce(this, true, score);
      }
    } else if (this.state === 'lost') {
      if (this.stateT > 2.4) finishOnce(this, false, 0.1 * this.boardIdx);
    }
  }

  clearBoard() {
    this.state = 'cleared'; this.stateT = 0;
    this.levelAfter = Math.max(0, this.level - 0.3);
    const b = this.b, d = b.at(b.drain[0], b.drain[1]);
    const [dx, dy] = this.center(d);
    this.fx.splat(dx + this.tile * 0.7, dy, WATER, 18);
    this.fx.ringPulse(dx + this.tile * 0.7, dy, WATER, 70, 0.6);
    for (const c of b.path) { const [x, y] = this.center(b.at(c[0], c[1])); this.fx.sparkle(x, y, PALETTE.paper, 2, 14); }
    this.fx.floatText(dx, dy - 40, 'Fixed!', PALETTE.sun, { big: true });
    playSfx('splash'); playSfx('star');
    this.bust.react('happy');
    this.bust.say(bark('guest', 'progress', this.p.hero));
  }

  lose() {
    this.state = 'lost'; this.stateT = 0;
    playSfx('splash'); playSfx('defeat');
    this.bust.react('oops'); this.bust.say(bark('guest', 'fail', this.p.hero));
    this.fx.addShake(8);
    for (let i = 0; i < 6; i++) this.fx.splat(120 + i * 140, 520, WATER, 10);
  }

  // ------------------------------------------------------------- render
  render(ctx) {
    const g = this.game, W2 = g.width, H = g.height;
    backdrop(ctx, g, 'guest', this.t, { top: '#2b3550', bottom: '#2a2c3d' });
    this.drawWallTiles(ctx);
    const sh = this.fx.shakeOffset();
    ctx.save(); ctx.translate(sh.x, sh.y);

    this.drawRisingWater(ctx, 'back');
    this.drawBoard(ctx);
    this.drawRisingWater(ctx, 'front');
    this.fx.render(ctx);
    ctx.restore();

    this.drawMeter(ctx);
    titleChip(ctx, 'guest');
    chip(ctx, `Board ${this.boardIdx + 1} / ${BOARDS.length}`, 480, 30, { align: 'center', font: 'bold 14px "Trebuchet MS", sans-serif' });
    if (this.p.hero === 'victoria') chip(ctx, 'Fix-it girl: water rises slower', W2 - 16, 26, { align: 'right', fill: PALETTE.mint });
    if (this.p.playlist) chip(ctx, '♪ Playlist +20% time', W2 - 16, 50, { align: 'right', fill: PALETTE.sky });
    this.bust.draw(ctx, W2 - 92, H + 6, 190);

    // teaching layer
    if (this.state === 'demo') {
      const d = this.demo, [hx, hy] = this.center(d.tile);
      const ph = this.stateT;
      const arrive = easeOut(ph / 0.9);
      const press = d.done < d.clicks ? Math.max(0, 1 - Math.abs(ph - (1.1 + d.done * 0.7)) * 6) : 0;
      drawHand(ctx, 700 + (hx - 700) * arrive, 470 + (hy + 4 - 470) * arrive, press, Math.min(1, ph * 3));
      prompt(ctx, 'Click pipes to turn them. Lead the water to the drain!', 480, 500, this.t);
    } else if (this.state === 'play' && this.boardIdx === 0 && this.stateT < 5 && this.rotations < 2) {
      prompt(ctx, 'Click pipes to turn them. Lead the water to the drain!', 480, 500, this.t, { alpha: clamp01(5 - this.stateT) });
    } else if (this.state === 'play') {
      text(ctx, 'Click / Space: turn   Right-click / Q: turn back   Arrows: move', 480, 528, { align: 'center', font: '12px "Trebuchet MS", sans-serif', color: 'rgba(255,246,229,0.6)' });
    }
    if (this.state === 'cleared') banner(ctx, this.boardIdx + 1 < BOARDS.length ? 'Pipe fixed!' : 'Last one!', 480, 90, this.stateT, { font: 'bold 38px "Trebuchet MS", sans-serif' });
    if (this.state === 'won') banner(ctx, 'All pipes fixed!', 480, 250, this.stateT, { sub: 'The guest room is dry again.' });
    if (this.state === 'lost') banner(ctx, 'Flooded!', 480, 250, this.stateT, { color: WATER, sub: 'Grab a towel and try again: it gets easier.' });
  }

  drawWallTiles(ctx) {
    // bathroom-ish subway tile wall
    ctx.save();
    ctx.globalAlpha = 0.07; ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 1;
    for (let y = 0; y < 540; y += 28) {
      const off = (y / 28) % 2 ? 28 : 0;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke();
      for (let x = -off; x < 960; x += 56) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 28); ctx.stroke(); }
    }
    ctx.restore();
  }

  drawRisingWater(ctx, layer) {
    const H = 540, top = H - this.level * 330;
    if (this.level <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = layer === 'back' ? 0.55 : 0.18;
    const g = ctx.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, WATER); g.addColorStop(1, WATER_DEEP);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, H);
    const ph = layer === 'back' ? 0 : 2;
    for (let x = 0; x <= 960; x += 16) ctx.lineTo(x, top + Math.sin(x / 50 + this.t * 2 + ph) * 5 + Math.sin(x / 23 - this.t * 3) * 2);
    ctx.lineTo(960, H); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (layer === 'back') {
      // rubber ducks riding the flood (the guest room's duck army, now harmless)
      for (let i = 0; i < 4; i++) {
        const x = ((i * 260 + this.t * (14 + i * 5)) % 1040) - 40;
        const y = top + Math.sin(x / 50 + this.t * 2) * 5 - 6;
        duck(ctx, x, y, 0.9 + (i % 2) * 0.2, Math.sin(this.t * 2 + i) * 0.15);
      }
    }
  }

  drawMeter(ctx) {
    const x = 34, y = 110, w = 46, h = 300;
    rrect(ctx, x - 6, y - 30, w + 12, h + 64, 14);
    ctx.fillStyle = 'rgba(16,19,31,0.7)'; ctx.fill();
    text(ctx, 'FLOOD', x + w / 2, y - 12, { align: 'center', font: 'bold 12px "Trebuchet MS", sans-serif', color: PALETTE.frost });
    ctx.save();
    rrect(ctx, x, y, w, h, 10); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(); ctx.clip();
    const lv = this.level, top = y + h * (1 - lv);
    const g = ctx.createLinearGradient(0, top, 0, y + h);
    const danger = lv > 0.75;
    g.addColorStop(0, danger ? '#ff8b7a' : WATER); g.addColorStop(1, danger ? PALETTE.danger : WATER_DEEP);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y + h);
    for (let i = 0; i <= w; i += 4) ctx.lineTo(x + i, top + Math.sin(i / 7 + this.t * 5) * 2.5);
    ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
    // bubbles
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 5; i++) { const by = y + h - ((this.t * 30 + i * 53) % (h * lv + 1)); ctx.beginPath(); ctx.arc(x + 8 + (i * 9) % 30, by, 2, 0, TAU); ctx.fill(); }
    ctx.restore();
    // danger line
    const dl = y + h * 0.25;
    ctx.strokeStyle = PALETTE.danger; ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 4, dl); ctx.lineTo(x + w + 4, dl); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = danger && Math.sin(this.t * 12) > 0 ? PALETTE.danger : PALETTE.frost; ctx.lineWidth = 2;
    rrect(ctx, x, y, w, h, 10); ctx.stroke();
    text(ctx, `${Math.round(lv * 100)}%`, x + w / 2, y + h + 22, { align: 'center', font: 'bold 14px "Trebuchet MS", sans-serif' });
  }

  drawBoard(ctx) {
    const b = this.b, T = this.tile;
    const slideY = (1 - easeOut(this.slide)) * -40;
    ctx.save(); ctx.translate(0, slideY); ctx.globalAlpha *= easeOut(this.slide);
    // board frame
    const bw = b.cols * T, bh = b.rows * T;
    rrect(ctx, this.ox - 14, this.oy - 14, bw + 28, bh + 28, 16);
    ctx.fillStyle = '#4a3a33'; ctx.fill();
    ctx.strokeStyle = '#2b201c'; ctx.lineWidth = 3; ctx.stroke();

    // leak source and drain outside the board
    const [sx, sy] = this.center(b.at(b.src[0], b.src[1]));
    const [dx, dy] = this.center(b.at(b.drain[0], b.drain[1]));
    this.drawLeak(ctx, this.ox - 14, sy);
    this.drawDrain(ctx, this.ox + bw + 14, dy);

    const hint = this.p.ease >= 2;
    for (const t of b.tiles) {
      const x = this.ox + t.x * T, y = this.oy + t.y * T;
      const cur = this.state === 'play' && this.cursor.x === t.x && this.cursor.y === t.y;
      // tile base
      rrect(ctx, x + 3, y + 3, T - 6, T - 6, 9);
      ctx.fillStyle = (t.x + t.y) % 2 ? '#f1e4cc' : '#e8d8bb'; ctx.fill();
      if (t.wet > 0) { ctx.fillStyle = hexA(WATER, 0.12 * t.wet); ctx.fill(); }
      if (hint && t.onPath && t.mask !== t.solved) { ctx.strokeStyle = 'rgba(255,201,74,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); }
      if (cur) { ctx.strokeStyle = PALETTE.sun; ctx.lineWidth = 3; rrect(ctx, x + 2, y + 2, T - 4, T - 4, 10); ctx.stroke(); }
      // pipe: draw the logical mask in a frame rotated back by the pending visual turn
      const pend = t.target - t.ang;
      ctx.save();
      ctx.translate(x + T / 2, y + T / 2);
      ctx.rotate(-pend);
      const s = 1 + t.pop * 0.08;
      ctx.scale(s, s);
      drawPipe(ctx, t.mask, T, t.wet, this.t, t.dist);
      ctx.restore();
    }
    ctx.restore();
  }

  drawLeak(ctx, x, y) {
    // a cracked pipe stub gushing water into the board
    ctx.save();
    ctx.fillStyle = COPPER; rrect(ctx, x - 46, y - 13, 46, 26, 6); ctx.fill();
    ctx.fillStyle = '#a8642e'; ctx.fillRect(x - 40, y - 15, 8, 30);
    ctx.fillStyle = WATER;
    for (let i = 0; i < 6; i++) { const k = ((this.t * 2 + i / 6) % 1); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(x - 30 + Math.sin(i * 3) * 8, y - 16 - k * 22, 3, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    text(ctx, 'LEAK', x - 24, y - 42, { align: 'center', font: 'bold 14px "Trebuchet MS", sans-serif', color: WATER, outline: PALETTE.ink });
    const bob = Math.sin(this.t * 6) * 3;
    ctx.fillStyle = WATER; ctx.beginPath(); ctx.moveTo(x - 24 - 6, y - 36 + bob); ctx.lineTo(x - 24 + 6, y - 36 + bob); ctx.lineTo(x - 24, y - 28 + bob); ctx.fill();
    ctx.restore();
  }

  drawDrain(ctx, x, y) {
    ctx.save();
    const glow = this.connected ? 1 : 0.5 + 0.5 * Math.sin(this.t * 4);
    ctx.fillStyle = PIPE_DARK; rrect(ctx, x, y - 13, 40, 26, 6); ctx.fill();
    ctx.fillStyle = '#3a3f4b'; ctx.beginPath(); ctx.ellipse(x + 44, y, 14, 18, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(127,216,166,${0.5 + glow * 0.5})`; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#20242e'; ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + 38, y + i * 7); ctx.lineTo(x + 50, y + i * 7); ctx.stroke(); }
    text(ctx, 'DRAIN', x + 30, y - 42, { align: 'center', font: 'bold 14px "Trebuchet MS", sans-serif', color: PALETTE.mint, outline: PALETTE.ink });
    const bob = Math.sin(this.t * 6 + 1) * 3;
    ctx.fillStyle = PALETTE.mint; ctx.beginPath(); ctx.moveTo(x + 24, y - 36 + bob); ctx.lineTo(x + 36, y - 36 + bob); ctx.lineTo(x + 30, y - 28 + bob); ctx.fill();
    ctx.restore();
  }
}

/** Pipe arms toward each open side of mask, drawn centered at 0,0 with tile size T; wet 0..1 fills with water. */
function drawPipe(ctx, mask, T, wet, t, dist) {
  const h = T / 2, r = T * 0.16;
  const arms = [];
  if (mask & N) arms.push([0, -h]);
  if (mask & E) arms.push([h, 0]);
  if (mask & S) arms.push([0, h]);
  if (mask & W) arms.push([-h, 0]);
  ctx.lineCap = 'butt';
  // outer pipe
  ctx.strokeStyle = PIPE_DARK; ctx.lineWidth = r * 2 + 6;
  for (const [ax, ay] of arms) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ax, ay); ctx.stroke(); }
  ctx.strokeStyle = PIPE; ctx.lineWidth = r * 2;
  for (const [ax, ay] of arms) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ax, ay); ctx.stroke(); }
  // highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = r * 0.5;
  for (const [ax, ay] of arms) { ctx.beginPath(); ctx.moveTo(ay ? -r * 0.4 : 0, ax ? -r * 0.4 : 0); ctx.lineTo(ax + (ay ? -r * 0.4 : 0), ay + (ax ? -r * 0.4 : 0)); ctx.stroke(); }
  // water channel
  if (wet > 0) {
    ctx.strokeStyle = WATER; ctx.lineWidth = r * 1.25 * Math.min(1, wet * 1.5);
    ctx.lineCap = 'round';
    for (const [ax, ay] of arms) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ax * wet, ay * wet); ctx.stroke(); }
    // flowing ripples
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    for (const [ax, ay] of arms) {
      const k = ((t * 2.2 - dist * 0.3) % 1 + 1) % 1;
      ctx.beginPath(); ctx.moveTo(ax * k * wet - ay * 0.08, ay * k * wet - ax * 0.08); ctx.lineTo(ax * k * wet + ay * 0.08, ay * k * wet + ax * 0.08); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // joint
  ctx.fillStyle = COPPER; ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#8f5428'; ctx.lineWidth = 2; ctx.stroke();
  if (wet > 0.5) { ctx.fillStyle = WATER; ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, TAU); ctx.fill(); }
  // flanges at tile edges
  ctx.fillStyle = PIPE_DARK;
  for (const [ax, ay] of arms) {
    ctx.save(); ctx.translate(ax * 0.92, ay * 0.92); ctx.rotate(Math.atan2(ay, ax));
    ctx.fillRect(-3, -r - 4, 6, r * 2 + 8);
    ctx.restore();
  }
}

function duck(ctx, x, y, s, tilt) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 9, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(8, -9, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f29f2e'; ctx.beginPath(); ctx.moveTo(14, -9); ctx.lineTo(21, -7); ctx.lineTo(14, -5); ctx.fill();
  ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(10, -11, 1.5, 0, TAU); ctx.fill();
  ctx.restore();
}
