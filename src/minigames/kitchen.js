// Kitchen minigame: BREAD BAKE — four short steps, each scored 0..1. Owned by: games-a.
// Aaron and Victoria really do bake bread together, so this one is meant to be lovely.
//   1 KNEAD  rhythm: click / Space as the ring closes on the dough (2 demo beats, then 10 scored)
//   2 SHAPE  hold the mouse and trace the dotted loaf outline (a hand traces it first)
//   3 PROOF  stop the rising dough in the gold zone (a ghost run shows how)
//   4 BAKE   pull the loaf out when it's golden (color strip with a star target)
// Final: the finished loaf, its look shaped by the scores. Never fails; score = mean of the steps.
import { text, panel } from '../ui/widgets.js';
import { Fx } from '../art/fx.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import {
  PALETTE, TAU, clamp, lerp, ease, easeInOut, BOLD, rr, normParams, timeMul, ease_level, Cheer, Outro,
  drawHand, drawHighlight, drawArrow, prompt, titleTag, vignette, mix, mixRgbStops, star,
} from './a/common.js';

const STEPS = [
  { id: 'knead', name: 'Knead', verb: 'Kneaded' },
  { id: 'shape', name: 'Shape', verb: 'Shaped' },
  { id: 'proof', name: 'Proof', verb: 'Proofed' },
  { id: 'bake', name: 'Bake', verb: 'Baked' },
];
const DOUGH = '#f3e2c3', DOUGH_SH = '#dcc39a';
const BAKE_STOPS = ['#f3e2c3', '#f0d39a', '#e0a245', '#c47a30', '#8a4a22', '#3a2218'];
const CX = 470, CY = 300;          // work-surface center
const COUNTER_Y = 372;

const grade = (s) => (s >= 0.85 ? 'Perfect!' : s >= 0.6 ? 'Lovely!' : s >= 0.35 ? 'Not bad' : 'Rustic!');

export default class BreadBake {
  constructor(game) { this.game = game; }

  enter(params) {
    this.p = normParams(params);
    this.fx = new Fx();
    this.cheer = new Cheer(this.game, this.p, { x: 872, y: 540, h: 176 });
    this.outro = new Outro(this.game, this.p, { y: 128 });
    this.t = 0;
    this.scores = [];
    this.easy = ease_level(this.p);
    this.tm = timeMul(this.p);
    this.startStep(0);
    playMusic('minigame');
    this.cheer.react('cheer', 'start', true);
  }
  exit() {}

  // ------------------------------------------------------------------ step machine
  startStep(i) {
    this.si = i;
    this.phase = 'card';   // card -> play -> done -> (next step | reveal)
    this.pt = 0;
    const id = STEPS[i]?.id;
    if (id === 'knead') {
      this.beatGap = 0.62 + 0.06 * this.easy;
      this.demoBeats = 2; this.scoredBeats = 10;
      this.beats = Array.from({ length: this.demoBeats + this.scoredBeats }, (_, k) => ({ t: 1.2 + k * this.beatGap, demo: k < this.demoBeats, res: null }));
      this.squash = 0; this.knead = 0; this.lastTick = -1; this.kneadHits = 0;
    } else if (id === 'shape') {
      this.path = Array.from({ length: 120 }, (_, k) => { const a = (k / 120) * TAU; return { x: CX + Math.cos(a) * 150, y: CY + Math.sin(a) * 66 }; });
      this.checks = Array.from({ length: 40 }, (_, k) => ({ i: k * 3, hit: false }));
      this.stroke = []; this.distSum = 0; this.distN = 0; this.touched = false;
      this.shapeLimit = (12 + 3 * this.easy) * this.tm;
    } else if (id === 'proof') {
      this.level = 0; this.stopped = false; this.ghost = 0; this.demoDone = false; this.over = false;
      this.zoneC = 0.7; this.zoneHW = 0.075 + 0.03 * this.easy;
      this.proofDelay = 0;
    } else if (id === 'bake') {
      this.bake = 0; this.pulled = false; this.burnt = false;
      this.bakeDur = (7.5 + 1.5 * this.easy) * this.tm;
      this.goldC = 0.42; this.goldHW = 0.06 + 0.02 * this.easy;
    }
  }

  endStep(score) {
    score = clamp(score, 0, 1);
    this.scores[this.si] = score;
    this.phase = 'done'; this.pt = 0;
    this.fx.floatText(CX, 150, grade(score), score >= 0.6 ? PALETTE.sun : PALETTE.paper, { big: true, size: 34 });
    this.fx.sparkle(CX, 170, PALETTE.sun, Math.round(6 + score * 12), 80);
    playSfx(score >= 0.6 ? 'star' : 'blip');
    this.cheer.react(score >= 0.6 ? 'cheer' : 'oops', score >= 0.85 ? 'great' : score >= 0.6 ? 'good' : 'bad');
  }

  get total() { return this.scores.reduce((a, b) => a + b, 0) / STEPS.length; }

  update(dt) {
    this.t += dt; this.pt += dt;
    this.fx.update(dt); this.cheer.update(dt); this.outro.update(dt);
    if (this.outro.active) return;
    if (this.phase === 'card') { if (this.pt > 1.1) { this.phase = 'play'; this.pt = 0; } return; }
    if (this.phase === 'done') {
      if (this.pt > 1.5) { if (this.si + 1 < STEPS.length) this.startStep(this.si + 1); else { this.phase = 'reveal'; this.pt = 0; this.revealFx(); } }
      return;
    }
    if (this.phase === 'reveal') {
      if (Math.random() < 0.08) this.fx.sparkle(CX + (Math.random() - 0.5) * 260, CY - 30 + (Math.random() - 0.5) * 80, PALETTE.sun, 1, 4);
      if (this.pt > 3.4 || (this.pt > 1.2 && this.game.input.mouse.pressed)) {
        const s = this.total;
        this.outro.start(true, s, 'Fresh bread!', STEPS.map((st, i) => `${st.name} ${'★'.repeat(stars(this.scores[i]))}`).join('   '));
        this.cheer.react('cheer', 'win', true);
      }
      return;
    }
    const id = STEPS[this.si].id;
    if (id === 'knead') this.updKnead(dt);
    else if (id === 'shape') this.updShape(dt);
    else if (id === 'proof') this.updProof(dt);
    else this.updBake(dt);
  }

  tap() { const i = this.game.input; return i.mouse.pressed || i.pressed('confirm') || i.pressed('attack'); }

  revealFx() {
    this.fx.confetti(CX, 80, 50);
    this.fx.thaw(CX, CY - 10, 90);
    playSfx('victory');
  }

  // ------------------------------------------------------------------ KNEAD
  updKnead(dt) {
    this.squash = Math.max(0, this.squash - dt * 5);
    const t = this.pt;
    // metronome tick on each beat
    const bi = this.beats.findIndex((b) => b.t > t) - 1;
    if (bi !== this.lastTick && bi >= 0) { this.lastTick = bi; playSfx('drum', { volume: 0.4 }); }
    // demo beats press themselves
    for (const b of this.beats) if (b.demo && !b.res && t >= b.t) { b.res = 'demo'; this.press(true); }
    if (this.tap()) {
      let best = null, bd = 1e9;
      for (const b of this.beats) if (!b.demo && !b.res) { const d = Math.abs(t - b.t); if (d < bd) { bd = d; best = b; } }
      const win = 0.26 + 0.04 * this.easy;
      if (best && bd < win) {
        const perfect = 0.085 + 0.03 * this.easy;
        best.res = bd < perfect ? 'perfect' : bd < win * 0.62 ? 'good' : 'ok';
        this.press(false, best.res);
      } else { this.squash = 0.4; playSfx('squish', { volume: 0.4 }); }
    }
    for (const b of this.beats) if (!b.demo && !b.res && t > b.t + 0.3) { b.res = 'miss'; this.fx.floatText(CX, CY - 90, 'miss', 'rgba(255,246,229,0.7)', { size: 16 }); }
    const last = this.beats[this.beats.length - 1];
    if (t > last.t + 0.6) {
      const val = { perfect: 1, good: 0.75, ok: 0.45, miss: 0 };
      const sc = this.beats.filter((b) => !b.demo).reduce((a, b) => a + (val[b.res] ?? 0), 0) / this.scoredBeats;
      this.endStep(sc);
    }
  }
  press(demo, res) {
    this.squash = 1;
    if (!demo) this.knead = Math.min(1, this.knead + (res === 'perfect' ? 0.1 : res === 'good' ? 0.08 : 0.05));
    playSfx('squish');
    this.fx.snowPuff(CX + (Math.random() - 0.5) * 120, CY + 30, 6, '#fffaf0');
    if (!demo) {
      const col = res === 'perfect' ? PALETTE.sun : res === 'good' ? PALETTE.mint : PALETTE.paper;
      this.fx.floatText(CX, CY - 90, res === 'perfect' ? 'Perfect!' : res === 'good' ? 'Good' : 'OK', col, { size: res === 'perfect' ? 22 : 17 });
      if (res === 'perfect') { this.fx.ringPulse(CX, CY, PALETTE.sun, 150, 0.35, 3); this.fx.addShake(2); }
    }
  }

  // ------------------------------------------------------------------ SHAPE
  updShape(dt) {
    const m = this.game.input.mouse;
    if (m.down && m.y < COUNTER_Y + 140) {
      this.touched = true;
      const last = this.stroke[this.stroke.length - 1];
      if (!last || Math.hypot(last.x - m.x, last.y - m.y) > 3) {
        this.stroke.push({ x: m.x, y: m.y, t: this.t });
        if (this.stroke.length > 400) this.stroke.shift();
        // distance to the outline
        let d = 1e9;
        for (const p of this.path) d = Math.min(d, Math.hypot(p.x - m.x, p.y - m.y));
        this.distSum += Math.min(d, 60); this.distN++;
        let newHit = false;
        for (const c of this.checks) if (!c.hit) { const p = this.path[c.i]; if (Math.hypot(p.x - m.x, p.y - m.y) < 26 + 4 * this.easy) { c.hit = true; newHit = true; } }
        if (newHit && Math.random() < 0.5) this.fx.sparkle(m.x, m.y, '#fffaf0', 1, 4);
        if (d < 30 && Math.random() < 0.25) playSfx('squish', { volume: 0.15 });
      }
    }
    const cov = this.coverage();
    if (cov >= 0.95 || this.pt > this.shapeLimit) {
      const acc = this.distN ? 1 - clamp((this.distSum / this.distN - 6) / 34, 0, 1) : 0;
      this.endStep(cov * 0.6 + acc * 0.4 * (cov > 0.3 ? 1 : cov / 0.3));
      this.fx.ringPulse(CX, CY, PALETTE.sun, 180, 0.5);
    }
  }
  coverage() { return this.checks.filter((c) => c.hit).length / this.checks.length; }

  // ------------------------------------------------------------------ PROOF
  updProof(dt) {
    if (!this.demoDone) {
      // ghost run: bar rises to the zone and the hand clicks it
      this.ghost = Math.min(this.zoneC, this.pt * 0.55);
      if (this.pt > 2.4) { this.demoDone = true; this.pt = 0; }
      return;
    }
    if (this.stopped) return;
    if (this.pt < 0.6) return; // brief beat before it starts
    const speed = (0.12 + this.level * 0.42) / this.tm;
    this.level += speed * dt;
    if (Math.random() < dt * 4) this.fx.burst(CX + (Math.random() - 0.5) * 120, CY - 40 - this.level * 70, '#fffaf0', 1, 30);
    if (this.level >= 1) {
      this.level = 1; this.stopped = true; this.over = true;
      this.fx.burst(CX, CY - 80, DOUGH, 18, 160); this.fx.addShake(6); playSfx('error');
      this.endStep(0.15);
      return;
    }
    if (this.tap()) {
      this.stopped = true;
      const d = Math.abs(this.level - this.zoneC), hw = this.zoneHW;
      const sc = d <= hw ? 1 - 0.3 * (d / hw) : Math.max(0.05, 0.7 - (d - hw) * 4);
      playSfx('blip');
      this.endStep(sc);
    }
  }

  // ------------------------------------------------------------------ BAKE
  updBake(dt) {
    if (this.pulled) return;
    if (this.pt < 0.8) return;
    this.bake += dt / this.bakeDur;
    if (Math.random() < dt * 3) this.fx.burst(CX + (Math.random() - 0.5) * 80, 150, 'rgba(255,255,255,0.6)', 1, 20);
    if (this.bake >= 1) {
      this.bake = 1; this.pulled = true; this.burnt = true;
      for (let i = 0; i < 4; i++) this.fx.snowPuff(CX + (i - 1.5) * 40, 160, 6, '#555');
      playSfx('error');
      this.endStep(0.1);
      return;
    }
    if (this.tap()) {
      this.pulled = true;
      const d = Math.abs(this.bake - this.goldC), hw = this.goldHW;
      const sc = d <= hw ? 1 - 0.25 * (d / hw) : Math.max(0.05, 0.75 - (d - hw) * 3.2);
      playSfx('pickup');
      this.fx.sparkle(CX, CY - 20, PALETTE.sun, 10, 60);
      this.endStep(sc);
    }
  }

  // ================================================================== RENDER
  render(ctx) {
    const sh = this.fx.shakeOffset();
    ctx.save(); ctx.translate(sh.x, sh.y);
    this.drawKitchen(ctx);
    const id = this.phase === 'reveal' ? 'reveal' : STEPS[this.si].id;
    if (id === 'knead') this.drawKnead(ctx);
    else if (id === 'shape') this.drawShape(ctx);
    else if (id === 'proof') this.drawProof(ctx);
    else if (id === 'bake') this.drawBake(ctx);
    else this.drawReveal(ctx);
    this.fx.render(ctx);
    ctx.restore();
    vignette(ctx);
    titleTag(ctx, 'kitchen');
    this.drawSteps(ctx);
    this.cheer.render(ctx);
    if (this.phase === 'card') this.drawCard(ctx);
    this.drawPrompt(ctx);
    this.outro.render(ctx);
  }

  drawPrompt(ctx) {
    if (this.phase !== 'play' || this.outro.active) return;
    const id = STEPS[this.si].id;
    if (id === 'knead') {
      const firstScored = this.beats[this.demoBeats];
      prompt(ctx, this.pt < firstScored.t - this.beatGap * 0.6 ? 'Watch the ring… squish on the beat!' : 'Click (or Space) when the ring hits the dough', 112);
    } else if (id === 'shape') prompt(ctx, this.touched ? 'Keep tracing all the way around' : 'Hold the mouse and trace the loaf', 112);
    else if (id === 'proof') prompt(ctx, !this.demoDone ? 'Let it rise… then click in the gold zone' : 'Click to stop it in the gold zone!', 112);
    else if (id === 'bake') prompt(ctx, 'Click to pull it out when it\'s golden!', 112);
  }

  drawCard(ctx) {
    const k = this.pt / 1.1;
    const a = k < 0.2 ? ease(k / 0.2) : k > 0.8 ? 1 - ease((k - 0.8) / 0.2) : 1;
    ctx.save(); ctx.globalAlpha = a;
    const x = 480 + (1 - ease(k / 0.25)) * -200;
    panel(ctx, x - 150, 200, 300, 110, { style: 'paper', radius: 22 });
    text(ctx, `Step ${this.si + 1} of 4`, x, 236, { align: 'center', font: BOLD(16), color: PALETTE.choc, shadow: false });
    text(ctx, STEPS[this.si].name, x, 284, { align: 'center', font: BOLD(44), color: '#b0662a', shadow: false });
    ctx.restore();
  }

  drawSteps(ctx) {
    const x0 = 330, y = 54;
    for (let i = 0; i < STEPS.length; i++) {
      const x = x0 + i * 100, cur = i === this.si && this.phase !== 'reveal', done = this.scores[i] != null;
      if (i < STEPS.length - 1) { ctx.fillStyle = done ? PALETTE.sun : 'rgba(255,246,229,0.3)'; ctx.fillRect(x + 22, y - 2, 56, 4); }
      ctx.fillStyle = done ? PALETTE.sun : cur ? PALETTE.paper : 'rgba(255,246,229,0.25)';
      ctx.beginPath(); ctx.arc(x, y, cur ? 17 : 14, 0, TAU); ctx.fill();
      if (cur) { ctx.strokeStyle = PALETTE.sunDeep; ctx.lineWidth = 3; ctx.stroke(); }
      drawStepIcon(ctx, STEPS[i].id, x, y, done || cur ? PALETTE.choc : 'rgba(16,19,31,0.45)');
      text(ctx, STEPS[i].name, x, y + 32, { align: 'center', font: BOLD(12), color: cur ? PALETTE.paper : 'rgba(255,246,229,0.7)' });
      if (done) { ctx.fillStyle = PALETTE.sun; for (let s = 0; s < stars(this.scores[i]); s++) star(ctx, x - 12 + s * 12, y + 46, 5); }
    }
  }

  // ---------------------------------------------------------------- scenery
  drawKitchen(ctx) {
    // subway-tile wall
    const g = ctx.createLinearGradient(0, 0, 0, COUNTER_Y);
    g.addColorStop(0, '#5a4033'); g.addColorStop(1, '#7a5640');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 960, COUNTER_Y);
    ctx.fillStyle = 'rgba(255,240,215,0.07)';
    for (let y = 0, r = 0; y < COUNTER_Y; y += 26, r++) for (let x = (r % 2) * -30; x < 960; x += 60) { rr(ctx, x + 2, y + 2, 56, 22, 4); ctx.fill(); }
    // window with morning light
    ctx.save();
    ctx.fillStyle = '#ffe9b8'; rr(ctx, 70, 60, 150, 170, 8); ctx.fill();
    const sky = ctx.createLinearGradient(0, 66, 0, 224); sky.addColorStop(0, '#9fd3f0'); sky.addColorStop(1, '#ffe4a8');
    ctx.fillStyle = sky; ctx.fillRect(80, 70, 130, 150);
    ctx.fillStyle = '#ffe9b8'; ctx.fillRect(142, 70, 6, 150); ctx.fillRect(80, 142, 130, 6);
    ctx.fillStyle = PALETTE.pine; ctx.beginPath(); ctx.ellipse(110, 220, 40, 22, 0, Math.PI, 0); ctx.fill();
    ctx.restore();
    // hanging utensils rail
    ctx.fillStyle = '#c9a26a'; ctx.fillRect(640, 70, 200, 6);
    for (let i = 0; i < 4; i++) {
      const x = 670 + i * 46, sw = Math.sin(this.t * 1.3 + i) * 0.04;
      ctx.save(); ctx.translate(x, 76); ctx.rotate(sw);
      ctx.fillStyle = '#9aa3ad'; ctx.fillRect(-2, 0, 4, 46);
      ctx.fillStyle = i % 2 ? '#9aa3ad' : '#b0662a';
      if (i === 0) { ctx.beginPath(); ctx.ellipse(0, 54, 9, 12, 0, 0, TAU); ctx.fill(); }
      else if (i === 1) { ctx.fillRect(-8, 46, 16, 20); }
      else if (i === 2) { ctx.beginPath(); ctx.arc(0, 56, 10, 0, TAU); ctx.fill(); }
      else { for (let k = -1; k <= 1; k++) ctx.fillRect(k * 5 - 1, 46, 2, 18); }
      ctx.restore();
    }
    // the (now friendly) sourdough starter jar
    this.drawStarter(ctx, 770, COUNTER_Y);
    // butcher-block counter
    const cg = ctx.createLinearGradient(0, COUNTER_Y, 0, 540);
    cg.addColorStop(0, '#d9a86a'); cg.addColorStop(0.08, '#c48d52'); cg.addColorStop(1, '#8a5a32');
    ctx.fillStyle = cg; ctx.fillRect(0, COUNTER_Y - 4, 960, 540 - COUNTER_Y + 4);
    ctx.strokeStyle = 'rgba(90,50,25,0.25)'; ctx.lineWidth = 2;
    for (let x = 0; x < 960; x += 64) { ctx.beginPath(); ctx.moveTo(x, COUNTER_Y + 6); ctx.lineTo(x, 540); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,240,210,0.35)'; ctx.fillRect(0, COUNTER_Y - 4, 960, 4);
    // flour dusting
    ctx.fillStyle = 'rgba(255,250,240,0.28)';
    for (let i = 0; i < 60; i++) { const a = i * 2.39996, r = 40 + (i * 37) % 160; ctx.beginPath(); ctx.arc(CX + Math.cos(a) * r * 1.4, COUNTER_Y + 40 + Math.sin(a) * r * 0.25, 2 + (i % 3), 0, TAU); ctx.fill(); }
  }

  drawStarter(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    const bub = Math.sin(this.t * 2.2);
    ctx.fillStyle = 'rgba(232,248,255,0.25)'; rr(ctx, -26, -70, 52, 70, 8); ctx.fill();
    ctx.fillStyle = '#efe0c0'; rr(ctx, -24, -46 - bub * 2, 48, 46 + bub * 2, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-14 + i * 9, -20 - ((this.t * 12 + i * 11) % 24), 2, 0, TAU); ctx.fill(); }
    // sleepy happy face
    ctx.strokeStyle = PALETTE.choc; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-8, -28, 3, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(8, -28, 3, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -20, 4, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; rr(ctx, -26, -70, 52, 70, 8); ctx.stroke();
    ctx.fillStyle = '#b0662a'; rr(ctx, -28, -78, 56, 10, 4); ctx.fill();
    ctx.restore();
  }

  board(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(60,30,10,0.25)'; ctx.beginPath(); ctx.ellipse(CX, CY + 92, 250, 26, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8c48c'; rr(ctx, CX - 250, CY + 62, 500, 30, 14); ctx.fill();
    ctx.fillStyle = '#cfa266'; rr(ctx, CX - 250, CY + 80, 500, 12, 8); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- KNEAD
  drawKnead(ctx) {
    this.board(ctx);
    const sq = ease(this.squash);
    const sx = 1 + sq * 0.22, sy = 1 - sq * 0.24;
    drawDough(ctx, CX, CY + 40, 120 * sx, 70 * sy, 1 - this.knead, this.t);
    // hands press
    const hy = CY - 30 - (1 - sq) * 28;
    drawPressHands(ctx, CX, hy + sq * 22, sq);
    if (this.phase !== 'play') return;
    // approach rings for the next two beats
    const t = this.pt;
    const up = this.beats.filter((b) => !b.res && b.t - t < this.beatGap * 1.6 && b.t - t > -0.3).slice(0, 2);
    for (const b of up) {
      const k = clamp((b.t - t) / (this.beatGap * 1.6), 0, 1);
      const r = 96 + k * 150;
      ctx.save();
      ctx.globalAlpha = 1 - k * 0.6;
      ctx.strokeStyle = b.demo ? 'rgba(255,246,229,0.9)' : PALETTE.sun; ctx.lineWidth = 6 - k * 3;
      ctx.beginPath(); ctx.ellipse(CX, CY + 40, r * 1.3, r * 0.75, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    // target outline
    ctx.save(); ctx.strokeStyle = 'rgba(255,201,74,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.ellipse(CX, CY + 40, 96 * 1.3, 96 * 0.75, 0, 0, TAU); ctx.stroke(); ctx.restore();
    // beat pips
    const scored = this.beats.filter((b) => !b.demo);
    scored.forEach((b, i) => {
      const x = CX - 135 + i * 30, y = 470;
      ctx.fillStyle = b.res === 'perfect' ? PALETTE.sun : b.res === 'good' ? PALETTE.mint : b.res === 'ok' ? PALETTE.paper : b.res === 'miss' ? 'rgba(16,19,31,0.5)' : 'rgba(255,246,229,0.25)';
      ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
    });
    // demo hand on the demo beats
    const firstScored = this.beats[this.demoBeats].t;
    if (t < firstScored - 0.2) {
      const nb = this.beats.find((b) => b.demo && b.t > t - 0.15) ?? this.beats[0];
      const k = clamp((nb.t - t) / 0.35, 0, 1);
      drawHand(ctx, CX + 150, CY + 10 - k * 30, k < 0.15 ? 1 - k / 0.15 : 0);
      if (this.pt < 1.2) drawHighlight(ctx, CX - 130, CY - 20, 260, 120, this.t);
    }
  }

  // ---------------------------------------------------------------- SHAPE
  drawShape(ctx) {
    this.board(ctx);
    const cov = this.phase === 'play' ? this.coverage() : 1;
    // dough morphs from a blob into a batard as you trace
    drawDough(ctx, CX, CY + 10, lerp(115, 140, cov), lerp(72, 58, cov), lerp(0.35, 0.05, cov), this.t);
    if (this.phase !== 'play') return;
    // dotted outline, lit where traced
    ctx.save();
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (const c of this.checks) {
      const p = this.path[c.i];
      ctx.fillStyle = c.hit ? PALETTE.sun : 'rgba(255,246,229,0.85)';
      ctx.beginPath(); ctx.arc(p.x, p.y, c.hit ? 6 : 4, 0, TAU); ctx.fill();
    }
    // start marker
    const s = this.path[0];
    if (!this.touched) { ctx.fillStyle = PALETTE.mint; ctx.beginPath(); ctx.arc(s.x, s.y, 10 + Math.sin(this.t * 6) * 2, 0, TAU); ctx.fill(); }
    // player's flour trail
    if (this.stroke.length > 1) {
      ctx.strokeStyle = 'rgba(255,250,240,0.7)'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(this.stroke[0].x, this.stroke[0].y);
      for (let i = 1; i < this.stroke.length; i++) {
        const a = this.stroke[i - 1], b = this.stroke[i];
        if (Math.hypot(a.x - b.x, a.y - b.y) > 60) ctx.moveTo(b.x, b.y); else ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
    }
    ctx.restore();
    // demo: a hand traces the loop until the player starts
    if (!this.touched) {
      const k = (this.t * 0.42) % 1, idx = Math.floor(k * this.path.length);
      ctx.save(); ctx.strokeStyle = 'rgba(255,201,74,0.85)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); for (let i = Math.max(0, idx - 30); i <= idx; i++) { const p = this.path[i]; if (i === Math.max(0, idx - 30)) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); } ctx.stroke(); ctx.restore();
      const p = this.path[idx];
      drawHand(ctx, p.x, p.y, 0.6);
    }
    // timer ring
    const rem = 1 - this.pt / this.shapeLimit;
    ctx.save(); ctx.strokeStyle = rem > 0.3 ? PALETTE.mint : PALETTE.danger; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(CX + 260, CY - 60, 20, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(rem, 0, 1)); ctx.stroke(); ctx.restore();
    text(ctx, `${Math.round(cov * 100)}%`, CX + 260, CY - 54, { align: 'center', font: BOLD(13) });
  }

  // ---------------------------------------------------------------- PROOF
  drawProof(ctx) {
    const lv = this.demoDone ? this.level : this.ghost;
    // bowl with rising dough
    const bx = CX, by = CY + 70;
    const rise = ease(lv);
    // dough top (behind the bowl rim)
    drawDough(ctx, bx, by - 30 - rise * 70, 120 + rise * 30, 40 + rise * 55, 0.05, this.t);
    if (this.over) { ctx.fillStyle = 'rgba(243,226,195,0.9)'; ctx.beginPath(); ctx.ellipse(bx + 120, by - 10, 40, 16, 0.4, 0, TAU); ctx.fill(); }
    // glass bowl
    ctx.save();
    ctx.fillStyle = 'rgba(232,248,255,0.22)';
    ctx.beginPath(); ctx.moveTo(bx - 170, by - 60); ctx.quadraticCurveTo(bx - 160, by + 40, bx, by + 50); ctx.quadraticCurveTo(bx + 160, by + 40, bx + 170, by - 60); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(bx - 110, by - 20, 8, 30, 0.4, 0, TAU); ctx.fill();
    // tea towel stripes on the bowl
    ctx.fillStyle = 'rgba(169,72,58,0.55)'; ctx.fillRect(bx - 150, by - 8, 300, 8);
    ctx.restore();
    // gauge
    const gx = CX + 250, gy = 150, gh = 240, gw = 36;
    panel(ctx, gx - 12, gy - 14, gw + 24, gh + 28, { radius: 14, style: 'dark' });
    const zy0 = gy + gh * (1 - (this.zoneC + this.zoneHW)), zy1 = gy + gh * (1 - (this.zoneC - this.zoneHW));
    ctx.fillStyle = 'rgba(255,201,74,0.35)'; ctx.fillRect(gx, zy0, gw, zy1 - zy0);
    ctx.strokeStyle = PALETTE.sun; ctx.lineWidth = 2; ctx.strokeRect(gx, zy0, gw, zy1 - zy0);
    ctx.fillStyle = PALETTE.danger; ctx.globalAlpha = 0.35; ctx.fillRect(gx, gy, gw, gh * 0.08); ctx.globalAlpha = 1;
    const fy = gy + gh * (1 - lv);
    const fg = ctx.createLinearGradient(0, fy, 0, gy + gh); fg.addColorStop(0, '#fff6e5'); fg.addColorStop(1, DOUGH_SH);
    ctx.fillStyle = fg; ctx.fillRect(gx + 4, fy, gw - 8, gy + gh - fy);
    ctx.fillStyle = PALETTE.sun; star(ctx, gx + gw + 22, (zy0 + zy1) / 2, 10, this.t);
    text(ctx, 'x2', gx + gw / 2, gy - 22, { align: 'center', font: BOLD(13), color: PALETTE.paper });
    if (this.phase === 'play' && !this.demoDone) {
      drawArrow(ctx, gx - 110, (zy0 + zy1) / 2 - 60, gx - 6, (zy0 + zy1) / 2, this.t, PALETTE.sun, -30);
      const hit = this.ghost >= this.zoneC - 0.01;
      drawHand(ctx, gx + gw / 2 + 6, (zy0 + zy1) / 2 + 10, hit ? clamp(1 - (this.pt - 1.3) * 3, 0, 1) : 0, { alpha: 0.9 });
      if (hit) text(ctx, 'like this!', gx + gw / 2, gy + gh + 34, { align: 'center', font: BOLD(15), color: PALETTE.sun });
    }
  }

  // ---------------------------------------------------------------- BAKE
  drawBake(ctx) {
    const ox = CX, oy = 250;
    // oven body
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, ox - 196, oy - 126, 400, 266, 22); ctx.fill();
    const og = ctx.createLinearGradient(0, oy - 130, 0, oy + 130); og.addColorStop(0, '#c9ccd2'); og.addColorStop(1, '#8b9099');
    ctx.fillStyle = og; rr(ctx, ox - 200, oy - 130, 400, 260, 22); ctx.fill();
    // dials
    for (let i = 0; i < 3; i++) { ctx.fillStyle = '#3a3f4a'; ctx.beginPath(); ctx.arc(ox - 120 + i * 120, oy - 104, 11, 0, TAU); ctx.fill(); ctx.fillStyle = PALETTE.sun; ctx.fillRect(ox - 121 + i * 120, oy - 114, 2, 8); }
    // window
    const glow = this.pulled ? 0.4 : 0.85 + Math.sin(this.t * 9) * 0.05;
    ctx.fillStyle = '#2a1a14'; rr(ctx, ox - 160, oy - 80, 320, 170, 16); ctx.fill();
    const wg = ctx.createRadialGradient(ox, oy + 10, 20, ox, oy + 10, 200);
    wg.addColorStop(0, `rgba(255,170,70,${glow})`); wg.addColorStop(1, 'rgba(120,40,10,0.6)');
    ctx.fillStyle = wg; rr(ctx, ox - 150, oy - 70, 300, 150, 12); ctx.fill();
    // elements
    ctx.strokeStyle = `rgba(255,90,40,${glow})`; ctx.lineWidth = 3;
    ctx.beginPath(); for (let x = -130; x <= 130; x += 20) ctx.lineTo(ox + x, oy - 58 + (x / 20 % 2 ? 4 : -4)); ctx.stroke();
    ctx.restore();
    // loaf inside (slides out when pulled)
    const out = this.pulled ? ease(this.pt - this.pulledAt()) : 0;
    const col = mixRgbStops(BAKE_STOPS, this.bake);
    drawLoaf(ctx, ox, oy + 40 + out * 160, 120, 62, col, this.scores[1] ?? 0.8, this.t, clamp(this.bake * 2, 0, 1));
    // handle
    ctx.fillStyle = '#e6e8ec'; rr(ctx, ox - 120, oy + 102, 240, 10, 5); ctx.fill();
    // color strip
    const sx = CX - 200, sy = 420, sw = 400, shh = 22;
    ctx.save();
    const sg = ctx.createLinearGradient(sx, 0, sx + sw, 0);
    BAKE_STOPS.forEach((c, i) => sg.addColorStop(i / (BAKE_STOPS.length - 1), c));
    ctx.fillStyle = sg; rr(ctx, sx, sy, sw, shh, 11); ctx.fill();
    ctx.strokeStyle = 'rgba(16,19,31,0.6)'; ctx.lineWidth = 2; rr(ctx, sx, sy, sw, shh, 11); ctx.stroke();
    const z0 = sx + sw * (this.goldC - this.goldHW), z1 = sx + sw * (this.goldC + this.goldHW);
    if (this.phase === 'play' && !this.pulled) drawHighlight(ctx, z0, sy, z1 - z0, shh, this.t, PALETTE.sun);
    else { ctx.strokeStyle = PALETTE.sun; ctx.lineWidth = 3; rr(ctx, z0, sy - 2, z1 - z0, shh + 4, 6); ctx.stroke(); }
    ctx.fillStyle = PALETTE.sun; star(ctx, (z0 + z1) / 2, sy - 14, 10, this.t);
    text(ctx, 'raw', sx, sy + 40, { font: BOLD(12) }); text(ctx, 'burnt', sx + sw, sy + 40, { align: 'right', font: BOLD(12) });
    text(ctx, 'golden', (z0 + z1) / 2, sy + 40, { align: 'center', font: BOLD(13), color: PALETTE.sun });
    // marker
    const mx = sx + sw * this.bake;
    ctx.fillStyle = PALETTE.paper; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(mx, sy + shh + 2); ctx.lineTo(mx - 9, sy + shh + 14); ctx.lineTo(mx + 9, sy + shh + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(mx - 2, sy - 4, 4, shh + 8);
    ctx.restore();
    if (this.phase === 'play' && !this.pulled && this.pt < 3) drawHand(ctx, (z0 + z1) / 2 + 4, sy + shh + 30, 0, { alpha: 0.9 });
  }
  pulledAt() { return this._pulledAt ?? (this._pulledAt = this.pt); }

  // ---------------------------------------------------------------- REVEAL
  drawReveal(ctx) {
    this.board(ctx);
    const k = ease(this.pt / 0.6);
    const col = mixRgbStops(BAKE_STOPS, this.bake ?? this.goldC);
    // warm halo
    const hg = ctx.createRadialGradient(CX, CY + 10, 20, CX, CY + 10, 260);
    hg.addColorStop(0, `rgba(255,201,74,${0.35 * k})`); hg.addColorStop(1, 'rgba(255,201,74,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, 960, 540);
    ctx.save(); ctx.translate(CX, CY + 40); ctx.scale(0.6 + 0.6 * k, 0.6 + 0.6 * k);
    drawLoaf(ctx, 0, 0, 150, 78, col, this.scores[1] ?? 0.8, this.t, 1, this.scores[2] ?? 0.8);
    ctx.restore();
    // steam
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const x = CX - 50 + i * 50, ph = this.t * 1.6 + i * 1.3, a = 0.5 + 0.5 * Math.sin(ph);
      ctx.globalAlpha = a * k;
      ctx.beginPath(); ctx.moveTo(x, CY - 40);
      for (let s = 1; s <= 6; s++) ctx.lineTo(x + Math.sin(ph + s) * 10, CY - 40 - s * 16);
      ctx.stroke();
    }
    ctx.restore();
    if (!this.outro.active) text(ctx, this.total >= 0.6 ? 'A beautiful loaf!' : 'A homemade loaf!', CX, 160, { align: 'center', font: BOLD(36), color: PALETTE.sun, outline: PALETTE.choc, alpha: k });
  }
}

const stars = (s) => (s == null ? 0 : s >= 0.8 ? 3 : s >= 0.5 ? 2 : 1);

// ------------------------------------------------------------------ shared drawing
/** Lumpy dough blob. lump 0 = silky smooth, 1 = very lumpy. */
function drawDough(ctx, x, y, rx, ry, lump, t) {
  const N = 28, pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const n = Math.sin(a * 3 + 1.3) * 0.5 + Math.sin(a * 5 + 0.7) * 0.35 + Math.sin(a * 7 + 2.1) * 0.15;
    const r = 1 + n * 0.12 * lump + Math.sin(t * 2 + a) * 0.01;
    pts.push({ x: x + Math.cos(a) * rx * r, y: y + Math.sin(a) * ry * r * (Math.sin(a) > 0 ? 0.7 : 1) });
  }
  ctx.save();
  ctx.fillStyle = 'rgba(70,40,20,0.22)'; ctx.beginPath(); ctx.ellipse(x, y + ry * 0.62, rx * 1.02, ry * 0.25, 0, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.5, 4, x, y, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, '#fffaf0'); g.addColorStop(0.55, DOUGH); g.addColorStop(1, DOUGH_SH);
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[(i + 1) % N];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(a.x, a.y, mx, my);
  }
  ctx.quadraticCurveTo(pts[0].x, pts[0].y, (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(160,120,80,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  // flour specks + sheen
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(x + Math.cos(i * 2.4) * rx * 0.5, y - ry * 0.2 + Math.sin(i * 1.7) * ry * 0.3, 1.6, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.35, y - ry * 0.45, rx * 0.25, ry * 0.12, -0.2, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Two cartoon hands pressing down (heel of the palm). */
function drawPressHands(ctx, x, y, sq) {
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(x + s * 52, y); ctx.rotate(s * 0.25);
    ctx.fillStyle = '#f2c7a5'; ctx.strokeStyle = 'rgba(120,70,40,0.5)'; ctx.lineWidth = 2;
    rr(ctx, -24, -30, 48, 42, 18); ctx.fill(); ctx.stroke();
    for (let f = 0; f < 4; f++) { rr(ctx, -22 + f * 11.5, -54, 10, 30, 5); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = s < 0 ? '#8d95a3' : '#5b7fa6'; ctx.fillRect(-22, 10, 44, 26);
    ctx.restore();
  }
  if (sq > 0.7) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 90 + i * 90, y + 50, 4, 0, TAU); ctx.fill(); } }
}

/** Baked loaf (batard) with an "ear" score. q = shape quality, bake = how baked the crust is (0..1). */
function drawLoaf(ctx, x, y, rx, ry, col, q, t, bake = 1, proofQ = 0.8) {
  const lump = clamp(1 - q, 0, 1);
  const hgt = ry * (0.75 + 0.35 * proofQ);
  ctx.save();
  ctx.fillStyle = 'rgba(60,30,10,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 8, rx * 1.05, ry * 0.28, 0, 0, TAU); ctx.fill();
  ctx.beginPath();
  const N = 30;
  for (let i = 0; i <= N; i++) {
    const a = Math.PI + (i / N) * Math.PI;
    const n = 1 + Math.sin(a * 5 + 1) * 0.06 * lump;
    const px = x + Math.cos(a) * rx * n, py = y + Math.sin(a) * hgt * n;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.quadraticCurveTo(x + rx * 0.9, y + 10, x, y + 10); ctx.quadraticCurveTo(x - rx * 0.9, y + 10, x - rx, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - hgt, 0, y + 10);
  g.addColorStop(0, mix(toHex(col), '#ffffff', 0.18)); g.addColorStop(0.6, toHex(col)); g.addColorStop(1, mix(toHex(col), '#000000', 0.3));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(60,30,10,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  // the score / ear: a lighter slash along the top
  ctx.save(); ctx.clip();
  ctx.strokeStyle = mix('#f6e2b8', toHex(col), 0.35 * bake); ctx.lineWidth = 9 + 5 * proofQ; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - rx * 0.6, y - hgt * 0.55); ctx.quadraticCurveTo(x, y - hgt * 1.05, x + rx * 0.6, y - hgt * 0.62); ctx.stroke();
  ctx.strokeStyle = mix(toHex(col), '#000000', 0.35); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x - rx * 0.6, y - hgt * 0.45); ctx.quadraticCurveTo(x, y - hgt * 0.93, x + rx * 0.6, y - hgt * 0.52); ctx.stroke();
  ctx.restore();
  // flour dusting
  ctx.fillStyle = 'rgba(255,250,240,0.55)';
  for (let i = 0; i < 18; i++) { const a = Math.PI + 0.3 + (i / 18) * (Math.PI - 0.6); ctx.beginPath(); ctx.arc(x + Math.cos(a) * rx * 0.75 + Math.sin(i * 7) * 8, y + Math.sin(a) * hgt * 0.7 + Math.cos(i * 5) * 5, 1.4 + (i % 3) * 0.6, 0, TAU); ctx.fill(); }
  ctx.restore();
}

function toHex(c) {
  if (c.startsWith('#')) return c;
  const m = c.match(/\d+/g).map(Number);
  return '#' + m.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
}

function drawStepIcon(ctx, id, x, y, col) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  if (id === 'knead') { ctx.beginPath(); ctx.ellipse(0, 3, 9, 5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -2); ctx.moveTo(-4, -6); ctx.lineTo(0, -2); ctx.lineTo(4, -6); ctx.stroke(); }
  else if (id === 'shape') { ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0, 0, TAU); ctx.stroke(); }
  else if (id === 'proof') { ctx.fillRect(-2, -8, 4, 14); ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(0, -11); ctx.lineTo(6, -4); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(-10, 4); ctx.quadraticCurveTo(0, -12, 10, 4); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
