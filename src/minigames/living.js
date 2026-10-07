// Living room minigame: BUNNY ROUNDUP. Owned by: games-c.
// Dust bunnies flee from your hero (who follows the mouse). Push them into the vacuum's nozzle on the right.
// Click = CLAP: a shockwave that scatters every nearby bunny. Teaches itself: a ghost hand herds the first
// bunny into the vacuum while everyone else naps, then it's your turn. Mid-game twist: a STAMPEDE bursts out
// from under the couch, and the vacuum kicks into TURBO for a few seconds.
import { PALETTE, FONT } from '../core/theme.js';
import { finishMinigame } from '../core/flow.js';
import { text, panel } from '../ui/widgets.js';
import { Fx } from '../art/fx.js';
import * as Sprites from '../art/sprites.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { bark } from '../story/lines.js';
import { Bust, Speech, Combo, clamp, lerp, rand, pick, rr, timeMul, drawHand, drawPulseRing, fmtTime } from './c/common.js';

const TAU = Math.PI * 2;
const SIDE_W = 176;
const FLOOR = { x: 186, y: 14, w: 760, h: 512 };
const FX0 = FLOOR.x, FY0 = FLOOR.y, FX1 = FLOOR.x + FLOOR.w, FY1 = FLOOR.y + FLOOR.h;
const MOUTH = { x: FX1 - 50, y: 270 };
const CAPTURE_R = 30;
const SUCK_R = 90;
const SCARE_R = 135;
const CLAP_R = 200;
const DUST = '#d6cfc4', DUST_DARK = '#8c8478';
const OBSTACLES = [
  { kind: 'couch', x: 390, y: FY0, w: 270, h: 78 },
  { kind: 'table', x: 470, y: 236, w: 140, h: 76 },
  { kind: 'chair', x: FX0, y: 400, w: 92, h: 104 },
  { kind: 'plant', x: FX0 + 44, y: FY0 + 46, r: 28 },
];
const BAG_WORDS = ['bagged!', 'shoop!', 'into the bag!', 'bye bunny!', 'fwoomp!'];

export default class Minigame {
  constructor(game) { this.game = game; }

  enter(p) {
    this.p = p;
    const extra = Math.max(0, (p.attempt || 1) - 1);
    this.timeTotal = (80 + extra * 10) * timeMul(p);
    this.timeLeft = this.timeTotal;
    this.easy = extra > 0;
    this.phase = 'intro'; // intro -> play -> win|end
    this.t = 0; this.phaseT = 0; this.playT = 0;
    this.fx = new Fx();
    this.bust = new Bust(p.hero);
    this.speech = new Speech();
    this.combo = new Combo(2.2);
    this.hero = { x: FX0 + 220, y: 270, vx: 0, vy: 0, facing: 1 };
    this.ghost = { x: 560, y: 270 };
    this.lastMouse = { x: -1, y: -1 }; this.keyMode = false;
    this.clapCd = 0; this.clapHintT = 0;
    this.bagged = 0; this.bagPuff = 0; this.turbo = 0;
    this.stampeded = false; this.banner = 0;
    this.done = false; this._boomed = false;
    this.bunnies = [];
    // the demo bunny sits right in front of the vacuum; everyone else naps until the demo is done
    this.bunnies.push(this._bunny(650, 272, { demo: true, hopT: 99 }));
    const nNormal = extra ? 7 : 8, nSneaky = extra ? 2 : 3;
    const spots = [[300, 160], [330, 330], [420, 470], [560, 150], [700, 120], [720, 430], [560, 410], [800, 470], [790, 110], [400, 200], [650, 360]];
    for (let i = 0; i < nNormal + nSneaky; i++) {
      const [x, y] = spots[i % spots.length];
      this.bunnies.push(this._bunny(x + rand(-20, 20), y + rand(-20, 20), { sneaky: i >= nNormal, asleep: true }));
    }
    this.total = this.bunnies.length - 1; // the demo bunny is a freebie
    playMusic('minigame');
  }

  exit() {}

  _bunny(x, y, o = {}) {
    return { x, y, vx: 0, vy: 0, r: o.sneaky ? 15 : 17, hop: rand(0, TAU), hopT: rand(0.3, 1.2), scared: 0, juke: rand(0.3, 0.8), state: 'free', st: 0, face: 1, fluff: rand(0, 10), ...o };
  }

  _say(event) { this.speech.say(bark('living', event, { hero: this.p.hero })); }

  // ------------------------------------------------------------------ update
  update(dt) {
    this.t += dt; this.phaseT += dt;
    this.fx.update(dt); this.bust.update(dt); this.speech.update(dt); this.combo.update(dt);
    this.clapCd = Math.max(0, this.clapCd - dt);
    this.bagPuff = Math.max(0, this.bagPuff - dt * 2.5);
    this.turbo = Math.max(0, this.turbo - dt);
    this.banner = Math.max(0, this.banner - dt);
    const m = this.game.input.mouse;

    if (this.phase === 'win' || this.phase === 'end') { this._updateEnd(m); this._updateBunnies(dt, false); return; }

    this._updateHero(dt, m);
    const playing = this.phase === 'play';

    if (this.phase === 'intro') {
      // ghost hand herds the demo bunny right into the nozzle
      const demo = this.bunnies.find((b) => b.demo);
      if (demo && demo.state === 'free') {
        const k = clamp((this.phaseT - 0.8) / 2.4, 0, 1);
        this.ghost.x = lerp(500, MOUTH.x - 60, k); this.ghost.y = demo.y + Math.sin(this.t * 3) * 6;
      }
      if (!demo && this.phaseT > 1) this._startPlay();
    }

    if (playing) {
      this.playT += dt;
      this.timeLeft -= dt;
      this.clapHintT += dt;
      if (m.pressed && !this.clapCd) this._clap(this.hero.x, this.hero.y);
      if (!this.stampeded && (this.playT > this.timeTotal * 0.38 || this.bagged >= Math.ceil(this.total * 0.55))) this._stampede();
      if (this.timeLeft <= 0) { this.timeLeft = 0; this._end(false); }
    }
    this._updateBunnies(dt, playing);
    if (playing && this.bunnies.length === 0) this._end(true);
  }

  _startPlay() {
    this.phase = 'play'; this.phaseT = 0;
    for (const b of this.bunnies) { b.asleep = false; b.hopT = rand(0, 0.5); }
    this.fx.floatText(MOUTH.x - 120, MOUTH.y - 70, 'Your turn!', PALETTE.sun, { big: true });
    playSfx('star');
    this._say('minigame');
  }

  _updateHero(dt, m) {
    const h = this.hero, inp = this.game.input;
    const ax = inp.axis();
    if (ax.x || ax.y) this.keyMode = true;
    if (Math.abs(m.x - this.lastMouse.x) + Math.abs(m.y - this.lastMouse.y) > 2) { this.keyMode = false; this.lastMouse = { x: m.x, y: m.y }; }
    let tx, ty;
    if (this.keyMode) { tx = h.x + ax.x * 60; ty = h.y + ax.y * 60; }
    else { tx = m.x; ty = m.y; }
    tx = clamp(tx, FX0 + 12, FX1 - 12); ty = clamp(ty, FY0 + 12, FY1 - 8);
    const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy);
    const maxV = this.keyMode ? 330 : 640;
    const sp = Math.min(maxV, d * 14);
    h.vx = d > 0.5 ? (dx / d) * sp : 0; h.vy = d > 0.5 ? (dy / d) * sp : 0;
    h.x += h.vx * dt; h.y += h.vy * dt;
    if (Math.abs(h.vx) > 20) h.facing = Math.sign(h.vx);
  }

  _clap(x, y) {
    this.clapCd = 0.9;
    playSfx('whack');
    this.fx.ringPulse(x, y, PALETTE.sun, CLAP_R, 0.4, 5);
    this.fx.snowPuff(x, y, 8, PALETTE.paper);
    this.fx.addShake(3);
    this.fx.floatText(x, y - 46, 'CLAP!', PALETTE.sun, { size: 18 });
    let n = 0;
    for (const b of this.bunnies) {
      if (b.state !== 'free') continue;
      const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy) || 1;
      if (d > CLAP_R) continue;
      const k = 1 - d / CLAP_R;
      b.vx += (dx / d) * 520 * (0.35 + k); b.vy += (dy / d) * 520 * (0.35 + k);
      b.scared = 1.2; b.hop = 0; n++;
    }
    if (n) playSfx('boing');
  }

  _stampede() {
    this.stampeded = true;
    this.banner = 2.6;
    this.turbo = 7;
    const n = this.easy ? 3 : 5;
    const couch = OBSTACLES[0];
    for (let i = 0; i < n; i++) {
      const b = this._bunny(couch.x + 30 + (i / (n - 1)) * (couch.w - 60), couch.y + couch.h + 18, { stampede: true });
      b.vx = rand(-260, 260); b.vy = rand(200, 380); b.scared = 1.4;
      this.bunnies.push(b);
      this.fx.snowPuff(b.x, b.y, 10, DUST);
    }
    this.total += n;
    // existing bunnies panic too
    for (const b of this.bunnies) if (b.state === 'free' && !b.stampede) { b.scared = 1; b.vx += rand(-200, 200); b.vy += rand(-200, 200); }
    playSfx('shout'); playSfx('boing');
    this.fx.addShake(10);
    this.bust.react('bad');
  }

  _updateBunnies(dt, playing) {
    const h = this.hero;
    const suckR = SUCK_R * (this.turbo > 0 ? 1.7 : 1);
    const herders = [];
    if (playing) herders.push(h);
    if (this.phase === 'intro') herders.push(this.ghost);
    for (const b of this.bunnies) {
      b.st += dt; b.fluff += dt;
      if (b.state === 'sucked') {
        // spiral into the nozzle
        const k = clamp(b.st / 0.45, 0, 1);
        const a = b.a0 + k * 8;
        const r0 = b.d0 * (1 - k);
        b.x = MOUTH.x + Math.cos(a) * r0; b.y = MOUTH.y + Math.sin(a) * r0;
        b.scale = 1 - k * 0.85;
        if (k >= 1) this._bagged(b);
        continue;
      }
      if (b.asleep) { b.vx *= 0.9; b.vy *= 0.9; continue; }
      b.scared = Math.max(0, b.scared - dt);
      // flee herders
      for (const s of herders) {
        const dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy) || 1;
        if (d < SCARE_R) {
          const k = Math.pow(1 - d / SCARE_R, 0.7);
          const force = (b.sneaky ? 1500 : 1250) * k;
          b.vx += (dx / d) * force * dt; b.vy += (dy / d) * force * dt;
          if (b.scared < 0.3) b.scared = 0.4;
          // sneaky ones juke sideways when you get close
          if (b.sneaky && playing) {
            b.juke -= dt;
            if (b.juke <= 0 && d < SCARE_R * 0.6) { const s2 = Math.random() < 0.5 ? -1 : 1; b.vx += (-dy / d) * s2 * 330; b.vy += (dx / d) * s2 * 330; b.juke = rand(0.6, 1.1); b.hop = 0; }
          }
        }
      }
      // idle hopping
      b.hopT -= dt;
      if (b.hopT <= 0 && b.scared <= 0) {
        let a = rand(0, TAU);
        if (b.sneaky) { const away = Math.atan2(b.y - MOUTH.y, b.x - MOUTH.x); a = away + rand(-1, 1); } // sneaky: drifts away from the bag
        const v = b.sneaky ? rand(110, 170) : rand(60, 120);
        b.vx += Math.cos(a) * v; b.vy += Math.sin(a) * v; b.hop = 0;
        b.hopT = rand(0.7, 1.5);
      }
      // suction
      const mdx = MOUTH.x - b.x, mdy = MOUTH.y - b.y, md = Math.hypot(mdx, mdy) || 1;
      if (md < suckR && this.phase !== 'end') {
        const k = 1 - md / suckR;
        b.vx += (mdx / md) * 900 * k * dt; b.vy += (mdy / md) * 900 * k * dt;
        if (Math.random() < dt * 8) this.fx._p({ x: b.x + rand(-8, 8), y: b.y + rand(-8, 8), vx: mdx / md * 140, vy: mdy / md * 140, g: 0, drag: 0, life: 0.3, max: 0.3, color: DUST, size: 2.5, shape: 'dot', rot: 0, vr: 0 });
      }
      if (md < CAPTURE_R + b.r * 0.5 && this.phase !== 'end') { b.state = 'sucked'; b.st = 0; b.a0 = Math.atan2(b.y - MOUTH.y, b.x - MOUTH.x); b.d0 = md; playSfx('pour'); continue; }
      // walls: soft push away (except the right wall near the vacuum, so you can corner them into it)
      const W = 34, wf = 900;
      if (b.x < FX0 + W) b.vx += wf * (1 - (b.x - FX0) / W) * dt;
      if (b.x > FX1 - W && Math.abs(b.y - MOUTH.y) > 100) b.vx -= wf * (1 - (FX1 - b.x) / W) * dt;
      if (b.y < FY0 + W) b.vy += wf * (1 - (b.y - FY0) / W) * dt;
      if (b.y > FY1 - W) b.vy -= wf * (1 - (FY1 - b.y) / W) * dt;
      // friction + speed cap
      const fr = Math.max(0, 1 - 3.0 * dt);
      b.vx *= fr; b.vy *= fr;
      const sp = Math.hypot(b.vx, b.vy), cap = b.sneaky ? 420 : b.stampede ? 380 : 330;
      if (sp > cap) { b.vx *= cap / sp; b.vy *= cap / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (sp > 30) { b.hop += dt * (8 + sp / 30); b.face = Math.sign(b.vx) || b.face; }
      else b.hop = 0;
      if (sp > 200 && Math.random() < dt * 10) this.fx.snowPuff(b.x, b.y + b.r * 0.6, 1, DUST);
      // hard bounds + obstacles
      b.x = clamp(b.x, FX0 + b.r, FX1 - b.r); b.y = clamp(b.y, FY0 + b.r, FY1 - b.r);
      for (const o of OBSTACLES) collide(b, o);
    }
    // keep bunnies from stacking
    const bs = this.bunnies;
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], c = bs[j];
      if (a.state !== 'free' || c.state !== 'free') continue;
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || 1, min = a.r + c.r;
      if (d < min) { const push = (min - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; c.x += dx / d * push; c.y += dy / d * push; }
    }
    this.bunnies = this.bunnies.filter((b) => !b.gone);
  }

  _bagged(b) {
    b.gone = true;
    this.bagPuff = 1;
    this.fx.snowPuff(MOUTH.x, MOUTH.y, 12, DUST);
    this.fx.burst(MOUTH.x + 20, MOUTH.y - 40, DUST, 8, 90);
    if (b.demo) {
      playSfx('squish');
      return;
    }
    this.bagged++;
    const n = this.combo.hit();
    playSfx('squish');
    this.fx.floatText(MOUTH.x - 50, MOUTH.y - 48, n >= 2 ? `x${n} ${pick(['double bag!', 'bunny train!', 'roundup!'])}` : pick(BAG_WORDS), n >= 2 ? PALETTE.sun : PALETTE.paper, { size: n >= 2 ? 18 : 15 });
    if (n >= 2) { this.timeLeft = Math.min(this.timeTotal, this.timeLeft + 2); this.fx.floatText(MOUTH.x - 50, MOUTH.y - 24, '+2s', PALETTE.sun); playSfx('star'); }
    this.fx.sparkle(MOUTH.x, MOUTH.y - 30, PALETTE.sun, 5, 20);
    this.bust.react('good');
  }

  _end(win) {
    if (this.phase === 'win' || this.phase === 'end') return;
    const frac = this.bagged / this.total;
    this.success = win || frac >= 0.6;
    this.phase = win ? 'win' : 'end'; this.phaseT = 0;
    if (win) {
      const tf = clamp(this.timeLeft / (this.timeTotal * 0.4), 0, 1);
      this.score = clamp(0.6 + 0.4 * tf, 0, 1);
    } else this.score = this.success ? clamp(0.5 * frac, 0, 1) : 0;
    this._say(this.success ? 'minigameWin' : 'minigameFail');
    if (this.success) { playSfx('victory'); this.bust.react('cheer'); } else { playSfx('defeat'); this.bust.react('bad'); }
  }

  _updateEnd(m) {
    const T = this.phaseT;
    if (this.success && !this._boomed && T > 0.6) {
      this._boomed = true;
      this.fx.confetti(MOUTH.x - 30, MOUTH.y - 60, 60);
      this.fx.thaw(MOUTH.x - 10, MOUTH.y - 40, 60);
      playSfx('star');
    }
    if ((T > 2.2 && m.pressed) || T > 4.6) this._finish();
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    finishMinigame(this.game, { roomId: this.p.roomId, success: !!this.success, score: this.success ? this.score : 0, attempt: this.p.attempt });
  }

  // ------------------------------------------------------------------ render
  render(ctx) {
    const g = this.game;
    const sh = this.fx.shakeOffset();
    ctx.fillStyle = '#2a1f2e'; ctx.fillRect(0, 0, g.width, g.height);
    ctx.save();
    ctx.translate(sh.x, sh.y);
    this._drawFloor(ctx);
    this._drawVacuum(ctx);
    for (const o of OBSTACLES) this._drawObstacle(ctx, o);
    // y-sorted bunnies + hero
    const list = this.bunnies.map((b) => ({ y: b.y, b }));
    if (this.phase !== 'intro') list.push({ y: this.hero.y, hero: true });
    list.sort((a, c) => a.y - c.y);
    for (const it of list) it.hero ? this._drawHero(ctx) : this._drawBunny(ctx, it.b);
    this._drawNozzleFront(ctx);
    this.fx.render(ctx);
    this._drawOverlay(ctx);
    ctx.restore();
    this._drawSidebar(ctx);
  }

  _drawFloor(ctx) {
    ctx.save();
    rr(ctx, FX0, FY0, FLOOR.w, FLOOR.h, 10); ctx.clip();
    ctx.fillStyle = '#a77b52'; ctx.fillRect(FX0, FY0, FLOOR.w, FLOOR.h);
    // planks
    for (let y = FY0, row = 0; y < FY1; y += 32, row++) {
      ctx.fillStyle = row % 2 ? '#9f744c' : '#ab7f56'; ctx.fillRect(FX0, y, FLOOR.w, 31);
      ctx.fillStyle = 'rgba(70,40,20,0.35)'; ctx.fillRect(FX0, y + 31, FLOOR.w, 1);
      for (let x = FX0 + ((row * 97) % 180); x < FX1; x += 180) ctx.fillRect(x, y, 1.5, 31);
    }
    // rug
    ctx.fillStyle = '#7d5b8f'; ctx.beginPath(); ctx.ellipse(560, 300, 250, 150, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c9a0dc'; ctx.beginPath(); ctx.ellipse(560, 300, 232, 134, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,246,229,0.45)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.ellipse(560, 300, 205, 112, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // lamp light pool
    const glow = ctx.createRadialGradient(FX1 - 120, FY1 - 60, 10, FX1 - 120, FY1 - 60, 260);
    glow.addColorStop(0, 'rgba(255,201,74,0.22)'); glow.addColorStop(1, 'rgba(255,201,74,0)');
    ctx.fillStyle = glow; ctx.fillRect(FX0, FY0, FLOOR.w, FLOOR.h);
    // suction field
    const suckR = SUCK_R * (this.turbo > 0 ? 1.7 : 1);
    ctx.strokeStyle = this.turbo > 0 ? 'rgba(255,201,74,0.55)' : 'rgba(255,246,229,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const k = ((this.t * 0.9 + i / 3) % 1);
      ctx.globalAlpha = k;
      ctx.beginPath(); ctx.arc(MOUTH.x, MOUTH.y, suckR * k + CAPTURE_R * (1 - k), Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // baseboard frame
    ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = 6; rr(ctx, FX0, FY0, FLOOR.w, FLOOR.h, 10); ctx.stroke();
  }

  _drawObstacle(ctx, o) {
    ctx.save();
    if (o.kind === 'couch') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, o.x + 4, o.y + 8, o.w, o.h, 14); ctx.fill();
      ctx.fillStyle = '#4f6f8f'; rr(ctx, o.x, o.y, o.w, o.h, 14); ctx.fill();
      ctx.fillStyle = '#5b7fa6'; rr(ctx, o.x + 14, o.y + 18, o.w - 28, o.h - 26, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(16,19,31,0.25)'; ctx.lineWidth = 2;
      for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(o.x + 14 + (o.w - 28) * i / 3, o.y + 20); ctx.lineTo(o.x + 14 + (o.w - 28) * i / 3, o.y + o.h - 10); ctx.stroke(); }
      // throw pillows + a crochet blanket
      ctx.fillStyle = PALETTE.sun; rr(ctx, o.x + 22, o.y + 22, 34, 30, 8); ctx.fill();
      ctx.fillStyle = '#e98aa8'; rr(ctx, o.x + o.w - 56, o.y + 22, 34, 30, 8); ctx.fill();
      ctx.fillStyle = PALETTE.mint; rr(ctx, o.x + 110, o.y + 34, 70, 38, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (let x = 0; x < 70; x += 10) for (let y = 0; y < 38; y += 10) if ((x + y) % 20 === 0) ctx.fillRect(o.x + 110 + x, o.y + 34 + y, 5, 5);
    } else if (o.kind === 'table') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, o.x + 4, o.y + 8, o.w, o.h, 10); ctx.fill();
      ctx.fillStyle = '#6e4a30'; rr(ctx, o.x, o.y, o.w, o.h, 10); ctx.fill();
      ctx.fillStyle = '#8a5f3e'; rr(ctx, o.x + 6, o.y + 6, o.w - 12, o.h - 12, 7); ctx.fill();
      // bread loaf + mug (they bake together)
      ctx.fillStyle = '#d99a52'; ctx.beginPath(); ctx.ellipse(o.x + 50, o.y + 38, 28, 16, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#a8662e'; ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(o.x + 50 + i * 10 - 4, o.y + 28); ctx.lineTo(o.x + 50 + i * 10 + 4, o.y + 48); ctx.stroke(); }
      ctx.fillStyle = PALETTE.paper; ctx.beginPath(); ctx.arc(o.x + 104, o.y + 36, 11, 0, TAU); ctx.fill();
      ctx.fillStyle = PALETTE.choc; ctx.beginPath(); ctx.arc(o.x + 104, o.y + 36, 7, 0, TAU); ctx.fill();
    } else if (o.kind === 'chair') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, o.x + 4, o.y + 8, o.w, o.h, 16); ctx.fill();
      ctx.fillStyle = '#a8483a'; rr(ctx, o.x, o.y, o.w, o.h, 16); ctx.fill();
      ctx.fillStyle = '#c45a4a'; rr(ctx, o.x + 18, o.y + 14, o.w - 30, o.h - 28, 10); ctx.fill();
    } else if (o.kind === 'plant') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(o.x + 3, o.y + 6, o.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c0703e'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill();
      ctx.fillStyle = PALETTE.pine;
      for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + Math.sin(this.t + i) * 0.05; ctx.beginPath(); ctx.ellipse(o.x + Math.cos(a) * 18, o.y + Math.sin(a) * 18, 16, 7, a, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }

  _drawVacuum(ctx) {
    // canister against the right wall, bag on top that inflates as bunnies go in
    const x = FX1 - 26, cy = MOUTH.y;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(ctx, x - 26, cy - 92, 56, 196, 18); ctx.fill();
    ctx.fillStyle = this.turbo > 0 ? '#e0564a' : '#c94c58'; rr(ctx, x - 30, cy - 100, 56, 196, 18); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(ctx, x - 24, cy - 92, 12, 176, 6); ctx.fill();
    // bag
    const fill = clamp(this.bagged / Math.max(1, this.total), 0, 1);
    const br = 26 + fill * 22 + this.bagPuff * 8;
    ctx.fillStyle = '#efe6d6'; ctx.strokeStyle = PALETTE.choc; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x - 4, cy - 104 - br * 0.6, br * 0.85, br, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = DUST;
    for (let i = 0; i < Math.round(fill * 8); i++) { ctx.beginPath(); ctx.arc(x - 4 + Math.cos(i * 2.1) * br * 0.45, cy - 104 - br * 0.6 + Math.sin(i * 1.7) * br * 0.5, 6, 0, TAU); ctx.fill(); }
    text(ctx, 'BAG', x - 4, cy - 100 - br * 0.6, { align: 'center', font: 'bold 12px "Trebuchet MS", sans-serif', color: PALETTE.choc, shadow: false });
    // wheels
    ctx.fillStyle = '#2b2f3a';
    ctx.beginPath(); ctx.arc(x - 14, cy + 96, 10, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 10, cy + 96, 10, 0, TAU); ctx.fill();
    if (this.turbo > 0) text(ctx, 'TURBO', x - 2, cy + 70, { align: 'center', font: 'bold 11px "Trebuchet MS", sans-serif', color: PALETTE.sun, outline: PALETTE.ink, outlineWidth: 3 });
    ctx.restore();
  }

  _drawNozzleFront(ctx) {
    // funnel opening facing left
    const wob = Math.sin(this.t * 30) * (this.turbo > 0 ? 1.5 : 0.6);
    ctx.save();
    ctx.translate(MOUTH.x + wob, MOUTH.y);
    ctx.fillStyle = '#3a3f4d';
    ctx.beginPath(); ctx.moveTo(-6, -CAPTURE_R - 6); ctx.lineTo(26, -14); ctx.lineTo(26, 14); ctx.lineTo(-6, CAPTURE_R + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#10131f'; ctx.beginPath(); ctx.ellipse(-4, 0, 9, CAPTURE_R + 2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8d95a3'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }

  _drawHero(ctx) {
    const h = this.hero;
    // scare radius hint
    ctx.save();
    ctx.strokeStyle = 'rgba(255,246,229,0.28)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -this.t * 12;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, SCARE_R, SCARE_R * 0.75, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    if (this.clapCd > 0) { ctx.strokeStyle = 'rgba(255,201,74,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y + 4, 22, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - this.clapCd / 0.9)); ctx.stroke(); }
    ctx.restore();
    const moving = Math.hypot(h.vx, h.vy) > 30;
    if (typeof Sprites.drawHero === 'function') Sprites.drawHero(ctx, this.game, this.p.hero === 'victoria' ? 'victoria' : 'aaron', h.x, h.y + 10, { facing: h.facing, anim: moving ? 'walk' : 'idle', t: this.t, scale: 1 });
  }

  _drawBunny(ctx, b) {
    const s = b.scale ?? 1;
    const hopY = -Math.abs(Math.sin(b.hop)) * 7;
    const dark = b.sneaky;
    const body = dark ? DUST_DARK : DUST;
    const r = b.r * s;
    ctx.save();
    ctx.translate(b.x, b.y);
    // shadow
    ctx.fillStyle = 'rgba(40,25,15,0.3)'; ctx.beginPath(); ctx.ellipse(0, r * 0.75, r * 0.95, r * 0.35, 0, 0, TAU); ctx.fill();
    ctx.translate(0, hopY);
    if (b.state === 'sucked') ctx.rotate(b.st * 14);
    // ears (flop back when running)
    const lean = clamp(-b.vx / 400, -0.5, 0.5);
    for (const e of [-1, 1]) {
      ctx.save(); ctx.translate(e * r * 0.35, -r * 0.7); ctx.rotate(e * 0.25 + lean + (b.scared > 0 ? e * 0.2 : 0));
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.22, r * 0.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e9b3b8'; ctx.beginPath(); ctx.ellipse(0, -r * 0.5, r * 0.1, r * 0.4, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // fluffy dust body: lumpy ring of puffs
    ctx.fillStyle = body;
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9, wob = 1 + Math.sin(b.fluff * 6 + i * 1.7) * 0.08;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.55, r * 0.48 * wob, 0, TAU); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, TAU); ctx.fill();
    // dust specks
    ctx.fillStyle = dark ? '#5e574e' : '#a69d90';
    for (let i = 0; i < 5; i++) { const a = i * 2.4 + 0.5; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.5, 1.6, 0, TAU); ctx.fill(); }
    // face looks the way it's going
    const fx = b.face * r * 0.18;
    if (dark) { ctx.fillStyle = '#3a3530'; rr(ctx, -r * 0.75 + fx, -r * 0.42, r * 1.5, r * 0.36, r * 0.18); ctx.fill(); } // sneaky mask
    const scared = b.scared > 0 || b.state === 'sucked';
    for (const e of [-1, 1]) {
      const ex = fx + e * r * 0.3, ey = -r * 0.24;
      if (b.asleep) { ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(ex, ey, r * 0.11, 0.2, Math.PI - 0.2); ctx.stroke(); continue; }
      if (scared) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, r * 0.16, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#1a1614'; ctx.beginPath(); ctx.arc(ex + b.face * 1.2, ey, r * (scared ? 0.08 : 0.1), 0, TAU); ctx.fill();
      if (!scared) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + b.face * 1.2 - 1.2, ey - 1.2, 1.3, 0, TAU); ctx.fill(); }
    }
    ctx.fillStyle = '#e98aa8'; ctx.beginPath(); ctx.arc(fx, -r * 0.04, r * 0.09, 0, TAU); ctx.fill();
    // tail puff
    ctx.fillStyle = dark ? '#a69d90' : '#f4efe6'; ctx.beginPath(); ctx.arc(-b.face * r * 0.85, r * 0.2, r * 0.25, 0, TAU); ctx.fill();
    if (b.asleep) text(ctx, 'z', r * 0.7, -r * 1.3 - Math.sin(this.t * 2 + b.x) * 3, { font: 'bold 14px "Trebuchet MS", sans-serif', color: PALETTE.paper, alpha: 0.8 });
    if (scared && b.state === 'free') { ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.arc(-b.face * r * 0.7, -r * 0.8, 3, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  _drawOverlay(ctx) {
    const cx = FX0 + FLOOR.w / 2;
    if (this.phase === 'intro') {
      const demo = this.bunnies.find((b) => b.demo);
      if (demo) {
        // dashed arrow bunny -> nozzle, ghost hand pushing from behind
        ctx.save();
        ctx.strokeStyle = PALETTE.sun; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -this.t * 40;
        ctx.beginPath(); ctx.moveTo(demo.x + 26, demo.y); ctx.lineTo(MOUTH.x - 30, MOUTH.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = PALETTE.sun; ctx.beginPath(); ctx.moveTo(MOUTH.x - 18, MOUTH.y); ctx.lineTo(MOUTH.x - 34, MOUTH.y - 10); ctx.lineTo(MOUTH.x - 34, MOUTH.y + 10); ctx.closePath(); ctx.fill();
        ctx.restore();
        drawPulseRing(ctx, MOUTH.x - 4, MOUTH.y, CAPTURE_R + 10, this.t);
        const ga = Math.min(1, this.phaseT * 2);
        if (typeof Sprites.drawHero === 'function') Sprites.drawHero(ctx, this.game, this.p.hero === 'victoria' ? 'victoria' : 'aaron', this.ghost.x, this.ghost.y + 10, { facing: 1, anim: 'walk', t: this.t, alpha: 0.65 * ga });
        drawHand(ctx, this.ghost.x + 6, this.ghost.y + 14, 0, ga);
      }
      panel(ctx, cx - 210, 26, 420, 50, { style: 'paper', radius: 14 });
      text(ctx, 'Push the bunnies into the vacuum!', cx, 59, { align: 'center', font: 'bold 22px "Trebuchet MS", sans-serif', color: PALETTE.ink, shadow: false });
    } else if (this.phase === 'play') {
      if (this.phaseT < 4.5) {
        const a = Math.min(1, (4.5 - this.phaseT) * 2);
        panel(ctx, cx - 190, 26, 380, 46, { style: 'paper', radius: 14, alpha: a });
        text(ctx, 'They run from you. Click to CLAP!', cx, 56, { align: 'center', font: 'bold 19px "Trebuchet MS", sans-serif', color: PALETTE.ink, shadow: false, alpha: a });
      }
      if (this.banner > 0) {
        const k = this.banner, a = Math.min(1, k * 2), sc = k > 2.3 ? 1 + (k - 2.3) * 2 : 1;
        ctx.save(); ctx.globalAlpha = a;
        ctx.translate(cx, 200); ctx.scale(sc, sc); ctx.rotate(Math.sin(this.t * 20) * 0.02);
        panel(ctx, -210, -38, 420, 76, { fill: '#4a2f22', stroke: PALETTE.sun, lineWidth: 3, radius: 14 });
        text(ctx, 'STAMPEDE!', 0, -2, { align: 'center', font: 'bold 32px "Trebuchet MS", sans-serif', color: PALETTE.sun });
        text(ctx, 'Vacuum TURBO on: bigger suck zone!', 0, 24, { align: 'center', font: 'bold 15px "Trebuchet MS", sans-serif', color: PALETTE.paper });
        ctx.restore();
      }
      this.combo.render(ctx, MOUTH.x - 120, MOUTH.y + 90);
    } else {
      const T = this.phaseT, k = clamp(T / 0.3, 0, 1);
      ctx.save(); ctx.globalAlpha = k;
      ctx.translate(cx, 250); ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
      const win = this.phase === 'win';
      panel(ctx, -230, -56, 460, 112, { style: this.success ? 'mint' : 'dark', radius: 18, lineWidth: 3 });
      text(ctx, win ? 'ALL BAGGED!' : this.success ? "Time's up! Nice herding!" : "Time's up!", 0, -8, { align: 'center', font: win ? FONT.big : 'bold 30px "Trebuchet MS", sans-serif', color: this.success ? PALETTE.heal : '#ffb3b3' });
      text(ctx, `${this.bagged} of ${this.total} dust bunnies in the bag`, 0, 28, { align: 'center', font: FONT.ui, color: PALETTE.paper });
      ctx.restore();
      if (T > 2.2) text(ctx, this.success ? 'click to continue' : 'one more try — click', cx, 340, { align: 'center', font: FONT.small, color: PALETTE.paper, alpha: 0.6 + 0.4 * Math.sin(T * 4) });
    }
  }

  _drawSidebar(ctx) {
    const g = this.game;
    panel(ctx, 8, 14, SIDE_W - 14, 200, { radius: 14 });
    text(ctx, 'BUNNY ROUNDUP', SIDE_W / 2 + 1, 40, { align: 'center', font: 'bold 15px "Trebuchet MS", sans-serif', color: PALETTE.sun });
    // timer
    const low = this.phase === 'play' && this.timeLeft < 10;
    text(ctx, fmtTime(this.timeLeft), SIDE_W / 2 + 1, 86, { align: 'center', font: FONT.big, color: low && Math.sin(this.t * 8) > 0 ? PALETTE.danger : PALETTE.paper });
    const tf = clamp(this.timeLeft / this.timeTotal, 0, 1);
    ctx.fillStyle = 'rgba(16,19,31,0.8)'; rr(ctx, 22, 98, SIDE_W - 42, 8, 4); ctx.fill();
    ctx.fillStyle = tf < 0.2 ? PALETTE.danger : PALETTE.sun; rr(ctx, 22, 98, (SIDE_W - 42) * tf, 8, 4); ctx.fill();
    // bunny tally: little heads, filled when bagged
    text(ctx, `${this.bagged} / ${this.total} bagged`, SIDE_W / 2 + 1, 130, { align: 'center', font: 'bold 14px "Trebuchet MS", sans-serif', color: PALETTE.paper });
    const per = 6;
    for (let i = 0; i < this.total; i++) {
      const x = 30 + (i % per) * 23, y = 152 + Math.floor(i / per) * 22;
      const got = i < this.bagged;
      ctx.fillStyle = got ? DUST : 'rgba(255,246,229,0.15)';
      ctx.beginPath(); ctx.ellipse(x - 4, y - 8, 2.5, 6, -0.2, 0, TAU); ctx.ellipse(x + 4, y - 8, 2.5, 6, 0.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
    }
    this.bust.render(ctx, g, 6, g.height + 2, 190);
    this.speech.render(ctx, 90, 350, 230);
  }
}

/** Bounce off a surface with normal (nx, ny), and slide along it toward the vacuum so bunnies never jam. */
function deflect(b, nx, ny) {
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return;
  b.vx -= vn * nx * 1.4; b.vy -= vn * ny * 1.4;
  let tx = -ny, ty = nx;
  if (tx * (MOUTH.x - b.x) + ty * (MOUTH.y - b.y) < 0) { tx = -tx; ty = -ty; }
  b.vx += tx * -vn * 1.1; b.vy += ty * -vn * 1.1;
}

/** Push bunny b out of obstacle o (rect or circle) and kill the velocity going into it. */
function collide(b, o) {
  if (o.r) {
    const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy) || 1, min = o.r + b.r;
    if (d < min) { b.x = o.x + dx / d * min; b.y = o.y + dy / d * min; deflect(b, dx / d, dy / d); }
    return;
  }
  const cx = clamp(b.x, o.x, o.x + o.w), cy = clamp(b.y, o.y, o.y + o.h);
  const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
  if (d >= b.r) return;
  if (d > 0.01) {
    b.x = cx + dx / d * b.r; b.y = cy + dy / d * b.r;
    deflect(b, dx / d, dy / d);
  } else {
    // center inside the rect: pop out the nearest side
    const l = b.x - o.x, r = o.x + o.w - b.x, t = b.y - o.y, btm = o.y + o.h - b.y, m = Math.min(l, r, t, btm);
    if (m === l) b.x = o.x - b.r; else if (m === r) b.x = o.x + o.w + b.r; else if (m === t) b.y = o.y - b.r; else b.y = o.y + o.h + b.r;
  }
}
