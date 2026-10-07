// Dining Room minigame: POUR THE DRINKS — color-sort logic puzzle. Owned by: games-a.
// PartyPlanner mixed every party drink together. Click a glass, then another, to pour its top layer
// (only onto an empty glass or the same drink, if there's room). Goal: each glass holds one drink.
// 3 handcrafted levels (all verified solvable with the BFS in a/pour-logic.js), undo + restart.
// Score = optimal pours / pours used (with a little slack). Level 1 is tiny with a looping hand demo.
import { button, text } from '../ui/widgets.js';
import { Fx } from '../art/fx.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import {
  PALETTE, TAU, clamp, lerp, ease, easeInOut, BOLD, rr, normParams, Cheer, Outro, drawHand, drawHighlight,
  drawArrow, prompt, titleTag, drawBackdrop, vignette, mix, star,
} from './a/common.js';
import { pourAmount, applyPour, isSolved, hasMove } from './a/pour-logic.js';

// Drinks: id -> look. Garnish appears when a glass is finished.
const DRINKS = {
  r: { name: 'Cranberry', color: '#d8445a', garnish: 'cherry' },
  y: { name: 'Lemonade', color: '#ffd54a', garnish: 'lemon' },
  g: { name: 'Mojito', color: '#7fd8a6', garnish: 'mint' },
  b: { name: 'Blue Soda', color: '#5aa4e6', garnish: 'umbrella' },
  p: { name: 'Grape Fizz', color: '#9b6bd6', garnish: 'straw' },
};

// opt = minimal pours (BFS, see a/pour-logic.js solveMoves). demo = [from, to] for the hand.
const LEVELS = [
  { cap: 3, opt: 5, demo: [0, 2], glasses: [['r', 'y', 'r'], ['y', 'r', 'y'], []] },
  { cap: 4, opt: 8, glasses: [['g', 'y', 'g', 'r'], ['g', 'r', 'y', 'y'], ['r', 'r', 'g', 'y'], [], []] },
  { cap: 4, opt: 15, glasses: [['r', 'p', 'y', 'p'], ['p', 'y', 'g', 'y'], ['r', 'b', 'r', 'g'], ['p', 'b', 'b', 'r'], ['g', 'g', 'b', 'y'], [], []] },
];

const UNIT = 34, GW = 62, BASE_Y = 402, POUR_T = 0.8;
const FLOOR = 380;

export default class PourTheDrinks {
  constructor(game) { this.game = game; }

  enter(params) {
    this.p = normParams(params);
    this.fx = new Fx();
    this.cheer = new Cheer(this.game, this.p, { x: 868, y: 540, h: 180 });
    this.outro = new Outro(this.game, this.p);
    this.t = 0;
    this.totalMoves = 0; this.totalOpt = 0;
    this.taught = false;
    this.loadLevel(0);
    playMusic('minigame');
    this.cheer.react('cheer', 'start', true);
  }
  exit() {}

  loadLevel(i) {
    this.li = i;
    const L = LEVELS[i];
    this.cap = L.cap;
    this.glasses = L.glasses.map((g) => g.slice());
    this.history = [];
    this.moves = 0;
    this.sel = -1;
    this.anim = null;
    this.levelT = 0;
    this.solvedT = -1;
    this.shakeG = this.glasses.map(() => 0);
    this.lift = this.glasses.map(() => 0);
    this.doneFx = this.glasses.map(() => false);
    this.slideIn = 1; // 1 → 0 slide
    const n = this.glasses.length, gap = Math.min(110, 640 / n);
    this.xs = this.glasses.map((_, k) => 420 + (k - (n - 1) / 2) * gap);
  }

  glassRect(k) {
    const h = this.cap * UNIT + 30;
    return { x: this.xs[k] - GW / 2, y: BASE_Y - h, w: GW, h };
  }
  hitGlass(mx, my) {
    for (let k = 0; k < this.glasses.length; k++) {
      const r = this.glassRect(k);
      if (mx >= r.x - 14 && mx <= r.x + r.w + 14 && my >= r.y - 40 && my <= BASE_Y + 20) return k;
    }
    return -1;
  }

  update(dt) {
    this.t += dt; this.levelT += dt;
    this.fx.update(dt); this.cheer.update(dt); this.outro.update(dt);
    this.slideIn = Math.max(0, this.slideIn - dt * 2.5);
    for (let k = 0; k < this.glasses.length; k++) {
      this.shakeG[k] = Math.max(0, this.shakeG[k] - dt * 2.5);
      this.lift[k] = lerp(this.lift[k], k === this.sel ? 1 : 0, Math.min(1, dt * 14));
    }
    if (this.outro.active) return;

    if (this.anim) {
      this.anim.t += dt;
      if (this.anim.t >= POUR_T) this.finishPour();
      return;
    }
    if (this.solvedT >= 0) {
      this.solvedT += dt;
      if (this.solvedT > 1.7) {
        if (this.li + 1 < LEVELS.length) this.loadLevel(this.li + 1);
        else this.finishGame();
      }
      return;
    }

    const inp = this.game.input, m = inp.mouse;
    // buttons (hit-test pass)
    if (button(null, this.game, 'Undo', 24, 478, 104, 40, { hotkey: 'U' }) || inp.pressed('KeyU') || inp.pressed('KeyZ')) this.undo();
    if (button(null, this.game, 'Restart', 140, 478, 116, 40, { hotkey: 'R' }) || inp.pressed('KeyR')) this.restart();

    let click = -1;
    if (m.pressed) click = this.hitGlass(m.x, m.y);
    for (let k = 0; k < Math.min(9, this.glasses.length); k++) if (inp.pressed(`Digit${k + 1}`)) click = k;
    if (click >= 0) this.clickGlass(click);
    else if (m.pressed && m.y < 440 && this.sel >= 0) this.sel = -1;
  }

  clickGlass(k) {
    if (this.sel < 0) {
      if (!this.glasses[k].length) { this.shakeG[k] = 1; playSfx('error'); return; }
      this.sel = k; playSfx('blip');
      return;
    }
    if (k === this.sel) { this.sel = -1; return; }
    const a = this.sel, n = pourAmount(this.glasses, a, k, this.cap);
    if (!n) {
      this.shakeG[k] = 1; playSfx('error');
      this.cheer.react('oops', 'bad');
      this.sel = -1;
      return;
    }
    const color = this.glasses[a][this.glasses[a].length - 1];
    this.history.push(this.glasses.map((g) => g.slice()));
    this.glasses = applyPour(this.glasses, a, k, this.cap);
    this.anim = { a, b: k, n, color, t: 0 };
    this.moves++; this.totalMoves++;
    this.sel = -1;
    this.taught = true;
    playSfx('pour');
  }

  finishPour() {
    const { b } = this.anim;
    this.anim = null;
    const g = this.glasses[b];
    const r = this.glassRect(b);
    this.fx.splat(this.xs[b], r.y + r.h - g.length * UNIT - 8, DRINKS[g[g.length - 1]].color, 5);
    if (g.length === this.cap && g.every((c) => c === g[0]) && !this.doneFx[b]) {
      this.doneFx[b] = true;
      this.fx.sparkle(this.xs[b], r.y + 20, PALETTE.sun, 12, 30);
      this.fx.ringPulse(this.xs[b], r.y + r.h / 2, DRINKS[g[0]].color, 70, 0.5);
      this.fx.floatText(this.xs[b], r.y - 30, DRINKS[g[0]].name + '!', PALETTE.paper, { size: 18 });
      playSfx('star');
      this.cheer.react('cheer', 'good');
    }
    if (isSolved(this.glasses, this.cap)) {
      this.solvedT = 0;
      this.totalOpt += LEVELS[this.li].opt;
      this.fx.confetti(420, 120, 50);
      this.fx.floatText(420, 140, 'Cheers!', PALETTE.sun, { big: true, size: 40 });
      playSfx('victory');
      this.cheer.react('cheer', 'great', true);
    }
  }

  undo() {
    if (!this.history.length) { playSfx('error'); return; }
    this.glasses = this.history.pop();
    this.doneFx = this.glasses.map((g) => g.length === this.cap && g.every((c) => c === g[0]));
    this.sel = -1; playSfx('swap');
  }
  restart() {
    const moves = this.moves;
    this.loadLevel(this.li);
    this.moves = moves; this.slideIn = 0;
    playSfx('swap');
  }

  finishGame() {
    // the pours you spent vs the fewest possible; 15% slack so near-perfect play still gets full marks
    const score = clamp((this.totalOpt * 1.15) / Math.max(1, this.totalMoves), 0.25, 1);
    this.outro.start(true, score, 'Drinks are served!', `${this.totalMoves} pours (best possible: ${this.totalOpt})`);
    this.cheer.react('cheer', 'win', true);
  }

  // ------------------------------------------------------------------ render
  render(ctx) {
    const sh = this.fx.shakeOffset();
    ctx.save(); ctx.translate(sh.x, sh.y);
    drawBackdrop(ctx, 'dining', this.t, { floorY: FLOOR, wallTop: '#3d2a3c', wallBot: '#5e3a4c', lampX: 760 });
    this.drawBunting(ctx);
    this.drawTable(ctx);

    ctx.save();
    ctx.translate(this.slideIn * 900, 0);
    // valid-target glow while a glass is selected (teaches the rule visually)
    if (this.sel >= 0 && !this.anim) {
      for (let k = 0; k < this.glasses.length; k++) {
        if (k === this.sel) continue;
        if (pourAmount(this.glasses, this.sel, k, this.cap)) {
          const r = this.glassRect(k);
          ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.t * 6);
          ctx.fillStyle = PALETTE.mint; ctx.beginPath(); ctx.ellipse(this.xs[k], BASE_Y + 4, 44, 10, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }
    }
    // glasses (moving source last so it's on top)
    const order = this.glasses.map((_, k) => k).filter((k) => !this.anim || k !== this.anim.a);
    if (this.anim) order.push(this.anim.a);
    for (const k of order) this.drawGlassAt(ctx, k);
    if (this.anim) this.drawStream(ctx);
    // number hints under glasses
    for (let k = 0; k < this.glasses.length; k++) text(ctx, String(k + 1), this.xs[k], BASE_Y + 30, { align: 'center', font: BOLD(13), color: 'rgba(255,246,229,0.45)', shadow: false });
    ctx.restore();

    this.fx.render(ctx);
    ctx.restore();
    vignette(ctx);

    // HUD
    titleTag(ctx, 'dining');
    const lvlX = 22;
    for (let i = 0; i < LEVELS.length; i++) {
      ctx.fillStyle = i < this.li || (i === this.li && this.solvedT >= 0) ? PALETTE.sun : i === this.li ? PALETTE.paper : 'rgba(255,246,229,0.25)';
      ctx.beginPath(); ctx.arc(lvlX + 6 + i * 20, 52, 6, 0, TAU); ctx.fill();
    }
    text(ctx, `Round ${this.li + 1} of ${LEVELS.length}`, lvlX + 66, 57, { font: BOLD(14) });
    text(ctx, `Pours: ${this.moves}`, 24, 84, { font: BOLD(16), color: PALETTE.paper });
    text(ctx, `Fewest possible: ${LEVELS[this.li].opt}`, 24, 104, { font: '13px "Trebuchet MS", sans-serif', color: 'rgba(255,246,229,0.7)' });

    const stuck = !this.anim && this.solvedT < 0 && !hasMove(this.glasses, this.cap);
    if (stuck) { drawHighlight(ctx, 24, 478, 232, 40, this.t, PALETTE.sun); }
    button(ctx, this.game, 'Undo', 24, 478, 104, 40, { hotkey: 'U', disabled: !this.history.length });
    button(ctx, this.game, 'Restart', 140, 478, 116, 40, { hotkey: 'R' });

    this.cheer.render(ctx);

    // instruction + demo
    if (this.solvedT < 0 && !this.outro.active) {
      if (stuck) prompt(ctx, 'No pours left — try Undo or Restart', 150);
      else if (this.li === 0 && !this.taught) { prompt(ctx, 'Click a glass, then another to pour', 150); this.drawDemo(ctx); }
      else if (this.li === 0 && this.levelT < 30) prompt(ctx, 'Same drink on same drink. Make each glass one drink!', 150, { font: BOLD(17) });
      else if (this.levelT < 3) prompt(ctx, this.li === 1 ? 'Bigger table!' : 'Last round — the whole party!', 150);
    }
    this.outro.render(ctx);
  }

  drawDemo(ctx) {
    const [a, b] = LEVELS[0].demo;
    const ra = this.glassRect(a), rb = this.glassRect(b);
    if (this.sel !== a) {
      // point at the source
      const cyc = (this.t % 2.2) / 2.2;
      const press = cyc > 0.55 && cyc < 0.75 ? Math.sin((cyc - 0.55) / 0.2 * Math.PI) : 0;
      const from = { x: 640, y: 470 }, to = { x: this.xs[a] + 6, y: ra.y + ra.h * 0.5 };
      const k = easeInOut(cyc / 0.5);
      drawHighlight(ctx, ra.x, ra.y - 6, ra.w, ra.h + 6, this.t);
      drawArrow(ctx, this.xs[a], ra.y - 24, this.xs[b], rb.y - 24, this.t, 'rgba(255,201,74,0.75)', -70);
      drawHand(ctx, lerp(from.x, to.x, k), lerp(from.y, to.y, k), press, { alpha: cyc > 0.9 ? (1 - cyc) * 10 : 1 });
    } else {
      const cyc = (this.t % 1.4) / 1.4;
      const press = cyc > 0.5 && cyc < 0.75 ? Math.sin((cyc - 0.5) / 0.25 * Math.PI) : 0;
      drawHighlight(ctx, rb.x, rb.y - 6, rb.w, rb.h + 6, this.t, PALETTE.mint);
      drawHand(ctx, this.xs[b] + 6, rb.y + rb.h * 0.55 + (1 - ease(cyc / 0.5)) * 40, press);
    }
  }

  drawBunting(ctx) {
    const cols = ['#e98aa8', PALETTE.sun, PALETTE.mint, PALETTE.sky, '#c9a0dc'];
    ctx.save();
    ctx.strokeStyle = 'rgba(255,246,229,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 18); ctx.quadraticCurveTo(480, 78, 960, 18); ctx.stroke();
    for (let i = 0; i < 20; i++) {
      const u = (i + 0.5) / 20, x = u * 960, y = 18 + 4 * u * (1 - u) * 60 * 1.0;
      const sw = Math.sin(this.t * 2 + i) * 0.08;
      ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.lineTo(0, 26); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawTable(ctx) {
    // table top + tablecloth with a scalloped edge
    ctx.save();
    ctx.fillStyle = '#4a2c1c'; ctx.fillRect(40, 470, 20, 70); ctx.fillRect(820, 470, 20, 70);
    const g = ctx.createLinearGradient(0, 360, 0, 470);
    g.addColorStop(0, '#fff6e5'); g.addColorStop(1, '#f1dcc0');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(10, 372); ctx.lineTo(950, 372); ctx.lineTo(950, 456);
    for (let x = 950; x >= 10; x -= 40) ctx.quadraticCurveTo(x - 20, 476, x - 40, 456);
    ctx.closePath(); ctx.fill();
    // gingham stripes in the room accent
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#e98aa8';
    for (let x = 20; x < 950; x += 48) ctx.fillRect(x, 372, 22, 86);
    ctx.fillRect(10, 395, 940, 14); ctx.fillRect(10, 430, 940, 14);
    ctx.restore();
    // candle
    const cx = 880, cy = 372;
    ctx.fillStyle = '#fff6e5'; rr(ctx, cx - 7, cy - 40, 14, 40, 3); ctx.fill();
    const fl = 1 + Math.sin(this.t * 13) * 0.08 + Math.sin(this.t * 7) * 0.05;
    const cg = ctx.createRadialGradient(cx, cy - 50, 2, cx, cy - 50, 50);
    cg.addColorStop(0, 'rgba(255,201,74,0.5)'); cg.addColorStop(1, 'rgba(255,201,74,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy - 50, 50, 0, TAU); ctx.fill();
    ctx.fillStyle = PALETTE.sun; ctx.beginPath(); ctx.ellipse(cx, cy - 50, 5, 10 * fl, 0, 0, TAU); ctx.fill();
  }

  /** Visual state of glass k (layers + fractional top) accounting for an in-flight pour. */
  glassView(k) {
    const g = this.glasses[k];
    const A = this.anim;
    if (!A) return { layers: g, extra: null };
    const k1 = clamp((A.t / POUR_T - 0.3) / 0.5, 0, 1);
    if (k === A.a) return { layers: g, extra: { color: A.color, amount: A.n * (1 - k1) } };
    if (k === A.b) return { layers: g.slice(0, g.length - A.n), extra: { color: A.color, amount: A.n * k1 } };
    return { layers: g, extra: null };
  }

  sourcePose() {
    const A = this.anim, u = A.t / POUR_T;
    const ra = this.glassRect(A.a), rb = this.glassRect(A.b);
    const dir = this.xs[A.b] >= this.xs[A.a] ? 1 : -1;
    const tx = this.xs[A.b] - dir * 52, ty = rb.y - 70;
    let k = u < 0.3 ? easeInOut(u / 0.3) : u > 0.85 ? 1 - easeInOut((u - 0.85) / 0.15) : 1;
    return { x: lerp(this.xs[A.a], tx, k), yOff: lerp(0, ty - ra.y, k), rot: dir * 1.05 * k, dir, k };
  }

  drawGlassAt(ctx, k) {
    const r = this.glassRect(k);
    const view = this.glassView(k);
    let x = this.xs[k], yOff = -this.lift[k] * 20, rot = 0;
    if (this.shakeG[k] > 0) x += Math.sin(this.t * 50) * 6 * this.shakeG[k];
    if (this.anim && k === this.anim.a) { const pose = this.sourcePose(); x = pose.x; yOff = pose.yOff; rot = pose.rot; }
    const full = !this.anim && this.glasses[k].length === this.cap && this.glasses[k].every((c) => c === this.glasses[k][0]);
    // shadow
    ctx.save(); ctx.fillStyle = 'rgba(60,30,30,0.22)'; ctx.beginPath(); ctx.ellipse(this.xs[k], BASE_Y + 2, GW * 0.55, 7, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save();
    ctx.translate(x, BASE_Y + yOff - r.h / 2);
    ctx.rotate(rot);
    drawGlass(ctx, r.h, view.layers, view.extra, this.t, this.cap, k === this.sel);
    if (full) drawGarnish(ctx, DRINKS[this.glasses[k][0]].garnish, -r.h / 2, this.t + k);
    ctx.restore();
  }

  drawStream(ctx) {
    const A = this.anim, u = A.t / POUR_T;
    if (u < 0.28 || u > 0.85) return;
    const pose = this.sourcePose();
    const r = this.glassRect(A.a), rb = this.glassRect(A.b);
    // lip of the tilted source glass
    const lx = -pose.dir * 0 + GW / 2 * pose.dir, ly = -r.h / 2;
    const cy = BASE_Y + pose.yOff - r.h / 2;
    const px = pose.x + lx * Math.cos(pose.rot) - ly * Math.sin(pose.rot);
    const py = cy + lx * Math.sin(pose.rot) + ly * Math.cos(pose.rot);
    const g = this.glasses[A.b];
    const k1 = clamp((u - 0.3) / 0.5, 0, 1);
    const surf = rb.y + rb.h - 10 - (g.length - A.n + A.n * k1) * UNIT;
    const w = 7 * Math.sin(clamp((u - 0.28) / 0.57, 0, 1) * Math.PI) + 1;
    ctx.save();
    ctx.strokeStyle = DRINKS[A.color].color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + pose.dir * 14, py + 6, this.xs[A.b] + Math.sin(this.t * 30) * 1.5, surf);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, w * 0.3);
    ctx.stroke();
    ctx.restore();
    if (Math.random() < 0.5) this.fx.burst(this.xs[A.b], surf, DRINKS[A.color].color, 1, 50);
  }
}

/** Glass centered at (0,0) of height h; liquid layers bottom-up; extra = fractional top layer. */
function drawGlass(ctx, h, layers, extra, t, cap, selected) {
  const w = GW, top = -h / 2, bot = h / 2;
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(-w / 2, top); ctx.lineTo(-w / 2 + 5, bot - 10);
    ctx.quadraticCurveTo(-w / 2 + 6, bot, -w / 2 + 16, bot); ctx.lineTo(w / 2 - 16, bot);
    ctx.quadraticCurveTo(w / 2 - 6, bot, w / 2 - 5, bot - 10); ctx.lineTo(w / 2, top);
  };
  if (selected) {
    ctx.save(); ctx.shadowColor = PALETTE.sun; ctx.shadowBlur = 24; ctx.strokeStyle = PALETTE.sun; ctx.lineWidth = 4; shape(); ctx.stroke(); ctx.restore();
  }
  // glass body
  ctx.save();
  ctx.fillStyle = 'rgba(232,248,255,0.13)'; shape(); ctx.closePath(); ctx.fill();
  ctx.save(); shape(); ctx.closePath(); ctx.clip();
  let y = bot - 10;
  const all = layers.slice();
  const drawLayer = (color, units, isTop) => {
    const hh = units * UNIT;
    const c = DRINKS[color].color;
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, mix(c, '#000000', 0.15)); g.addColorStop(0.35, c); g.addColorStop(1, mix(c, '#000000', 0.25));
    ctx.fillStyle = g; ctx.fillRect(-w / 2, y - hh, w, hh + 0.5);
    if (isTop && units > 0.05) {
      ctx.fillStyle = mix(c, '#ffffff', 0.35);
      ctx.beginPath(); ctx.ellipse(0, y - hh, w / 2 - 2, 4, 0, 0, TAU); ctx.fill();
    }
    // bubbles
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 2; i++) {
      const by = y - ((t * 18 + i * 13 + color.charCodeAt(0) * 7) % Math.max(1, hh));
      ctx.beginPath(); ctx.arc(-12 + i * 18 + Math.sin(t * 3 + i) * 3, by, 1.8, 0, TAU); ctx.fill();
    }
    y -= hh;
  };
  for (let i = 0; i < all.length; i++) drawLayer(all[i], 1, i === all.length - 1 && !(extra && extra.amount > 0.01));
  if (extra && extra.amount > 0.01) drawLayer(extra.color, extra.amount, true);
  // the base of the glass under the bottom line
  ctx.fillStyle = 'rgba(232,248,255,0.25)'; ctx.fillRect(-w / 2, bot - 10, w, 10);
  ctx.restore();
  // rim + outline + gloss
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5; shape(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, top, w / 2, 4, 0, 0, TAU); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath(); ctx.moveTo(-w / 2 + 8, top + 8); ctx.lineTo(-w / 2 + 14, top + 8); ctx.lineTo(-w / 2 + 17, bot - 18); ctx.lineTo(-w / 2 + 12, bot - 18); ctx.closePath(); ctx.fill();
  // capacity tick marks (subtle)
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
  for (let i = 1; i < cap; i++) { const yy = bot - 10 - i * UNIT; ctx.beginPath(); ctx.moveTo(w / 2 - 12, yy); ctx.lineTo(w / 2 - 5, yy); ctx.stroke(); }
  ctx.restore();
}

function drawGarnish(ctx, kind, top, t) {
  ctx.save();
  const bob = Math.sin(t * 2) * 1.5;
  if (kind === 'lemon') {
    ctx.translate(22, top - 4 + bob);
    ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#f2b72e'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(242,183,46,0.7)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.stroke(); }
  } else if (kind === 'cherry') {
    ctx.translate(8, top - 10 + bob);
    ctx.strokeStyle = '#3f7a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6, -14, 14, -18); ctx.stroke();
    ctx.fillStyle = '#c0283c'; ctx.beginPath(); ctx.arc(0, 4, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-3, 1, 2.2, 0, TAU); ctx.fill();
  } else if (kind === 'mint') {
    ctx.translate(-6, top - 6 + bob);
    ctx.fillStyle = '#3fa874';
    for (const [a, s] of [[-0.6, 1], [0.5, 0.9], [-0.05, 1.1]]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -10 * s, 5 * s, 11 * s, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  } else if (kind === 'umbrella') {
    ctx.translate(14, top - 2 + bob); ctx.rotate(0.35);
    ctx.strokeStyle = '#fff6e5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.stroke();
    const cols = ['#e98aa8', PALETTE.sun];
    for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[i % 2]; ctx.beginPath(); ctx.moveTo(0, -36); ctx.arc(0, -26, 18, Math.PI + i * Math.PI / 4, Math.PI + (i + 1) * Math.PI / 4); ctx.closePath(); ctx.fill(); }
  } else {
    ctx.translate(10, top + 10); ctx.rotate(0.3);
    ctx.fillStyle = '#fff6e5'; rr(ctx, -3, -50, 6, 50, 3); ctx.fill();
    ctx.fillStyle = '#e98aa8'; for (let i = 0; i < 5; i++) ctx.fillRect(-3, -48 + i * 10, 6, 4);
  }
  ctx.restore();
  ctx.fillStyle = PALETTE.sun;
  const tw = 0.5 + 0.5 * Math.sin(t * 5);
  ctx.save(); ctx.globalAlpha = tw; star(ctx, -GW / 2 + 4, top + 16, 5); ctx.restore();
}
