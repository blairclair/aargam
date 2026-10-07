// Backyard minigame: DRUMLINE — drum the rampaging garden gnomes into a marching band (Marching Ravens nod).
// Owned by: games-d. Timing is judged against AudioContext.currentTime (see d/drums.js SongClock);
// falls back to a visual clock when audio is locked/unavailable.
import { PALETTE, FONT } from '../core/theme.js';
import { finishMinigame } from '../core/flow.js';
import { text, panel, bar, keycap, chip } from '../ui/widgets.js';
import { Fx } from '../art/fx.js';
import { drawHero } from '../art/sprites.js';
import { playSfx } from '../audio/sfx.js';
import { DrumKit, SongClock } from './d/drums.js';
import { buildChart, SECTION_STARTS } from './d/chart.js';
import { drawBackyard, drawLights, drawGnome, drawSnare, drawNoteGem } from './d/drumart.js';
import { RAVENS, readParams, drawBust, clamp } from './d/common.js';

const LANES = [
  { key: 'D', code: 'KeyD', voice: 'bass', name: 'BASS', color: RAVENS.purpleLite, rim: RAVENS.purpleDeep },
  { key: 'F', code: 'KeyF', voice: 'snare', name: 'SNARE', color: RAVENS.goldLite, rim: '#a8800f' },
  { key: 'J', code: 'KeyJ', voice: 'quadLo', name: 'QUAD', color: RAVENS.purpleLite, rim: RAVENS.purpleDeep },
  { key: 'K', code: 'KeyK', voice: 'quadHi', name: 'QUAD', color: RAVENS.goldLite, rim: '#a8800f' },
];
const HW = { x: 580, w: 340, top: 34, hitY: 448 };
const LANE_W = HW.w / 4;
const SPEED = 330;          // px per second of song time
const LEAD = 2.0;           // seconds of scroll-in before the demo bar
const BAND = 16;            // gnomes in the yard
const CHORDS = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]];
const SLOTS = (() => {
  const rows = [{ y: 478, s: 1.3 }, { y: 430, s: 1.17 }, { y: 389, s: 1.05 }, { y: 353, s: 0.94 }];
  const out = [];
  rows.forEach((r) => { for (let c = 0; c < 4; c++) out.push({ x: 350 + (c - 1.5) * 74 * r.s, y: r.y, s: r.s }); });
  return out;
})();

export default class Drumline {
  constructor(game) {
    this.game = game;
    this._onKey = (e) => {
      if (e.repeat) return;
      const lane = LANES.findIndex((l) => l.code === e.code);
      if (lane >= 0) this.hit(lane);
      else this.kit?.resume();
    };
    this._onPtr = (e) => {
      const c = this.game.canvas, r = c.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * this.game.width, y = ((e.clientY - r.top) / r.height) * this.game.height;
      this.kit?.resume();
      if (x >= HW.x && x < HW.x + HW.w && y > HW.top) this.hit(Math.floor((x - HW.x) / LANE_W));
    };
  }

  enter(params) {
    this.p = readParams(params);
    const { attempt, playlist } = this.p;
    this.bpm = 104 - (playlist ? 8 : 0) - (attempt >= 3 ? 8 : attempt === 2 ? 4 : 0);
    const ease = attempt >= 3 ? 2 : attempt === 2 ? 1 : 0;
    this.chart = buildChart(this.bpm, ease);
    const m = (playlist ? 1.2 : 1) * (attempt >= 3 ? 1.4 : attempt === 2 ? 1.2 : 1);
    this.W = { perfect: 0.05 * m, good: 0.11 * m, miss: 0.16 * m };
    this.recruitEvery = attempt >= 2 ? 6 : 8; // first gnome at a 4-streak, then every N in a row
    this.passAcc = attempt >= 3 ? 0.25 : attempt === 2 ? 0.35 : 0.45;
    this.notes = this.chart.notes.map((n) => ({ ...n, judged: null }));
    this.playable = this.notes.filter((n) => !n.demo).length;
    this.judgeFrom = 0;
    this.stats = { perfect: 0, good: 0, miss: 0 };
    this.combo = 0; this.best = 0;
    this.fx = new Fx();
    this.pops = [];
    this.padFlash = [0, 0, 0, 0];
    this.mood = 'idle'; this.moodK = 0;
    this.phase = 'play'; this.endT = 0; this.done = false;
    this.success = false; this.bandBeforeFinale = 0;
    this.t = 0;
    // gnomes start rampaging
    this.gnomes = [];
    for (let i = 0; i < BAND; i++) {
      this.gnomes.push({ x: 40 + Math.random() * 480, y: 300 + Math.random() * 220, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 60,
        state: 'wild', slot: -1, k: 0, hue: i % 4, face: 1, turn: Math.random() * 2 });
    }
    this.recruited = 0;
    // audio + clock
    this.kit?.dispose();
    this.kit = new DrumKit();
    this.clock = new SongClock(this.kit);
    this.clock.start(-LEAD);
    this.backing = this._buildBacking();
    this.bi = 0;
    window.addEventListener('keydown', this._onKey);
    this.game.canvas.addEventListener('pointerdown', this._onPtr);
  }

  exit() {
    window.removeEventListener('keydown', this._onKey);
    this.game.canvas.removeEventListener('pointerdown', this._onPtr);
    this.kit?.dispose(); this.kit = null;
  }

  _buildBacking() {
    const { beatDur, barDur, bars } = this.chart, ev = [];
    for (const n of this.notes) if (n.demo) ev.push({ t: n.t, kind: 'drum', voice: LANES[n.lane].voice });
    for (let b = 0; b < 4; b++) ev.push({ t: barDur + b * beatDur, kind: 'click', vel: b === 3 ? 1.6 : 1 });
    for (let bar = 2; bar < bars - 1; bar++) {
      const big = bar >= SECTION_STARTS[3];
      for (let b = 0; b < 4; b++) ev.push({ t: bar * barDur + b * beatDur, kind: 'hat', vel: b === 0 ? 1.3 : 0.8 });
      ev.push({ t: bar * barDur, kind: 'brass', notes: CHORDS[bar % 4], dur: beatDur * 1.6, vel: big ? 1 : 0.7 });
      if (big || bar >= SECTION_STARTS[1]) ev.push({ t: bar * barDur + beatDur * 2.5, kind: 'brass', notes: CHORDS[bar % 4], dur: beatDur * 0.9, vel: 0.5 });
    }
    return ev.sort((a, b) => a.t - b.t);
  }

  /** Song time as heard (audio latency compensated). */
  vis() { return this.clock.now() - this.kit.latency; }
  beat() { return (this.vis()) / this.chart.beatDur; }

  hit(lane) {
    if (!this.kit) return;
    this.kit.resume();
    this.kit.play(LANES[lane].voice);
    this.padFlash[lane] = 1;
    this.lastHitLane = lane; this.lastHitAge = 0;
    if (this.phase !== 'play') return;
    const t = this.vis();
    let best = null, bd = Infinity;
    for (let i = this.judgeFrom; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.t - t > this.W.miss) break;
      if (n.judged || n.demo || n.lane !== lane) continue;
      const d = Math.abs(n.t - t);
      if (d < bd) { bd = d; best = n; }
    }
    if (!best || bd > this.W.miss) return; // stray hit: just a drum sound, no penalty
    if (bd <= this.W.perfect) this._judge(best, 'perfect');
    else if (bd <= this.W.good) this._judge(best, 'good');
    else this._judge(best, 'miss', t < best.t ? 'early' : 'late');
  }

  _judge(n, grade, why) {
    n.judged = grade;
    this.stats[grade]++;
    const x = HW.x + (n.lane + 0.5) * LANE_W;
    if (grade === 'miss') {
      this.combo = 0;
      this.pops.push({ lane: n.lane, text: why === 'early' ? 'EARLY' : why === 'late' ? 'LATE' : 'MISS', color: PALETTE.danger, life: 0.6 });
      this.mood = 'oops'; this.moodK = 1;
      this.kit.play('miss');
      return;
    }
    this.combo++; this.best = Math.max(this.best, this.combo);
    const perfect = grade === 'perfect';
    this.pops.push({ lane: n.lane, text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? RAVENS.goldLite : PALETTE.mint, life: 0.6 });
    this.fx.burst(x, HW.hitY, perfect ? RAVENS.goldLite : LANES[n.lane].color, perfect ? 12 : 7, perfect ? 150 : 100);
    if (perfect) { this.mood = 'happy'; this.moodK = Math.max(this.moodK, 0.7); }
    if (this.combo === 4 || this.combo % this.recruitEvery === 0) this._recruit();
  }

  _recruit(quiet = false) {
    const g = this.gnomes.find((q) => q.state === 'wild');
    if (!g) return;
    g.state = 'join'; g.slot = this.recruited++; g.k = 0; g.fx = g.x; g.fy = g.y;
    if (!quiet) { this.mood = 'cheer'; this.moodK = 1; playSfx('star'); }
  }

  update(dt) {
    this.t += dt;
    const g = this.game, inp = g.input;
    const now = this.clock.now(), vis = this.vis();
    // schedule backing a little ahead on the audio clock
    while (this.bi < this.backing.length && this.backing[this.bi].t <= now + 0.18) {
      const ev = this.backing[this.bi++];
      const at = this.clock.toAudio(ev.t);
      if (at == null || ev.t < now - 0.05) continue;
      if (ev.kind === 'brass') this.kit.brass(at, ev.notes, ev.dur, ev.vel);
      else if (ev.kind === 'drum') this.kit.play(ev.voice, at);
      else this.kit.play(ev.kind, at, ev.vel ?? 1);
    }
    // demo notes auto-play; overdue notes become misses
    for (let i = this.judgeFrom; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.t > vis) break;
      if (n.judged) continue;
      if (n.demo) {
        n.judged = 'auto'; this.padFlash[n.lane] = 1; this.lastHitLane = n.lane; this.lastHitAge = 0;
        this.fx.burst(HW.x + (n.lane + 0.5) * LANE_W, HW.hitY, RAVENS.goldLite, 8, 110);
      } else if (vis - n.t > this.W.miss) this._judge(n, 'miss');
    }
    while (this.judgeFrom < this.notes.length && this.notes[this.judgeFrom].judged) this.judgeFrom++;

    for (let i = 0; i < 4; i++) this.padFlash[i] = Math.max(0, this.padFlash[i] - dt * 5);
    this.lastHitAge = (this.lastHitAge ?? 9) + dt;
    this.moodK = Math.max(0, this.moodK - dt * 1.6);
    for (const p of this.pops) p.life -= dt;
    this.pops = this.pops.filter((p) => p.life > 0);
    this._updateGnomes(dt, vis);
    this.fx.update(dt);

    if (this.phase === 'play' && this.judgeFrom >= this.notes.length && vis > this.chart.endT + this.chart.beatDur) this._finale();
    if (this.phase === 'finale') {
      this.endT += dt;
      if (this.success && this.endT < 2.5 && Math.random() < dt * 3) this.fx.confetti(60 + Math.random() * 480, 300, 18);
      const ready = this.endT > 1.4;
      if (ready && (inp.pressed('confirm') || inp.mouse.pressed || this.endT > 7)) this._finish();
    }
  }

  _finale() {
    this.phase = 'finale'; this.endT = 0;
    const acc = (this.stats.perfect + 0.6 * this.stats.good) / Math.max(1, this.playable);
    this.acc = acc;
    this.success = acc >= this.passAcc;
    this.bandBeforeFinale = this.recruited;
    this.score = clamp(acc * 0.85 + (this.recruited / BAND) * 0.15, 0, 1);
    const at = this.clock.toAudio(this.clock.now() + 0.05);
    if (this.success) {
      if (at != null) {
        const b = this.chart.beatDur / 2;
        this.kit.brass(at, [0, 4, 7], b * 0.9, 1); this.kit.play('snare', at);
        this.kit.brass(at + b, [5, 9, 12], b * 0.9, 1); this.kit.play('snare', at + b);
        this.kit.brass(at + 2 * b, [7, 11, 14], b * 0.9, 1); this.kit.play('quadHi', at + 2 * b);
        for (let i = 0; i < 8; i++) this.kit.play(i % 2 ? 'quadLo' : 'quadHi', at + 3 * b + i * b / 4, 0.7);
        this.kit.brass(at + 5 * b, [0, 4, 7, 12], b * 6, 1.2); this.kit.play('crash', at + 5 * b); this.kit.play('bass', at + 5 * b);
      }
      let k = 0;
      while (this.gnomes.some((q) => q.state === 'wild') && k++ < BAND) this._recruit(true);
      this.mood = 'cheer'; this.moodK = 1;
      this.fx.confetti(330, 320, 50);
      playSfx('victory');
    } else {
      if (at != null) this.kit.play('miss', at);
      this.mood = 'oops'; this.moodK = 1;
    }
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    finishMinigame(this.game, { roomId: this.p.roomId ?? 'backyard', success: this.success, score: this.success ? this.score : this.score * 0.5, attempt: this.p.attempt });
  }

  _updateGnomes(dt, vis) {
    for (const q of this.gnomes) {
      if (q.state === 'wild') {
        q.turn -= dt;
        if (q.turn <= 0) { q.turn = 0.8 + Math.random() * 1.8; q.vx = (Math.random() - 0.5) * 160; q.vy = (Math.random() - 0.5) * 80; }
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.x < 30 || q.x > 530) { q.vx *= -1; q.x = clamp(q.x, 30, 530); }
        if (q.y < 292 || q.y > 525) { q.vy *= -1; q.y = clamp(q.y, 292, 525); }
        if (Math.abs(q.vx) > 5) q.face = q.vx > 0 ? 1 : -1;
      } else if (q.state === 'join') {
        q.k = Math.min(1, q.k + dt / 0.5);
        const s = SLOTS[q.slot], e = q.k * q.k * (3 - 2 * q.k);
        q.x = q.fx + (s.x - q.fx) * e; q.y = q.fy + (s.y - q.fy) * e;
        q.face = 1;
        if (q.k >= 1) { q.state = 'band'; this.fx.sparkle(s.x, s.y - 30 * s.s, RAVENS.goldLite, 8, 16); this.fx.ringPulse(s.x, s.y, RAVENS.gold, 34, 0.4, 3); }
      }
    }
  }

  // ------------------------------------------------------------------ render
  render(ctx) {
    const g = this.game, W = g.width, H = g.height;
    const vis = this.vis(), beatF = vis / this.chart.beatDur;
    const beatIdx = Math.floor(beatF), phase = beatF - beatIdx;
    drawBackyard(ctx, W, H);
    drawLights(ctx, -10, 150, 560, 136, this.recruited / BAND, this.t, 20, 26);
    ctx.save();
    const sh = this.fx.shakeOffset(); ctx.translate(sh.x, sh.y);
    // gnomes + drummer, depth sorted
    const items = this.gnomes.map((q) => ({ y: q.y, q }));
    items.push({ y: 500, hero: true });
    items.sort((a, b) => a.y - b.y);
    const marching = vis > 0;
    for (const it of items) {
      if (it.hero) { this._drawDrummer(ctx, phase); continue; }
      const q = it.q;
      if (q.state === 'wild') drawGnome(ctx, q.x, q.y, { s: 0.95, angry: true, face: q.face, hue: q.hue, t: this.t + q.hue, hop: Math.abs(Math.sin(this.t * 9 + q.hue)) * 4 });
      else {
        const s = SLOTS[q.slot];
        const step = q.state === 'band' && marching ? (beatIdx % 2 ? 1 : -1) * Math.sin(phase * Math.PI) : 0;
        let hop = q.state === 'join' ? Math.sin(q.k * Math.PI) * 40 : 0;
        // ending flourish: the whole band hops in unison on the final hits
        if (this.phase === 'finale' && this.success && q.state === 'band' && this.endT < 2.4) hop += Math.abs(Math.sin(this.endT * Math.PI / this.chart.beatDur)) * 10;
        drawGnome(ctx, q.x, q.y, { s: s.s * 0.95, band: q.state === 'band' || q.k > 0.5 ? 1 : 0, step, face: 1, hue: q.hue, t: this.t, hop });
      }
    }
    this.fx.render(ctx);
    ctx.restore();
    this._drawHighway(ctx, vis);
    this._drawHud(ctx, vis, phase);
    if (this.phase === 'finale') this._drawEnd(ctx);
  }

  _drawDrummer(ctx, phase) {
    const g = this.game, x = 128, y = 506;
    const recent = (this.lastHitAge ?? 9) < 0.12;
    drawHero(ctx, g, this.p.hero, x, y, { scale: 1.7, anim: 'idle', facing: 0, t: this.t });
    // sticks
    const L = this.lastHitLane ?? 0;
    const downL = recent && L <= 1, downR = recent && L >= 2;
    ctx.save(); ctx.strokeStyle = '#e6c79a'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 40); ctx.lineTo(x + 26, downL ? y - 42 : y - 66);
    ctx.moveTo(x + 14, y - 40); ctx.lineTo(x + 44, downR ? y - 42 : y - 64);
    ctx.stroke(); ctx.restore();
    drawSnare(ctx, x + 32, y - 40, 0.95, Math.max(...this.padFlash));
    // sash
    ctx.fillStyle = RAVENS.gold; ctx.globalAlpha = 0.9;
    ctx.fillRect(x - 14, y - 52, 4, 4);
    ctx.globalAlpha = 1;
  }

  _drawHighway(ctx, vis) {
    const { x, w, top, hitY } = HW;
    ctx.save();
    // board
    ctx.fillStyle = 'rgba(23,18,31,0.9)';
    ctx.fillRect(x, top, w, 540 - top);
    for (let i = 0; i < 4; i++) {
      const lx = x + i * LANE_W;
      const gr = ctx.createLinearGradient(0, top, 0, hitY);
      gr.addColorStop(0, 'rgba(75,42,140,0)'); gr.addColorStop(1, i % 2 ? 'rgba(227,181,43,0.16)' : 'rgba(123,85,214,0.22)');
      ctx.fillStyle = gr; ctx.fillRect(lx, top, LANE_W, hitY - top);
      if (this.padFlash[i] > 0) { ctx.fillStyle = `rgba(255,217,106,${0.18 * this.padFlash[i]})`; ctx.fillRect(lx, top, LANE_W, hitY - top); }
      if (i) { ctx.fillStyle = 'rgba(227,181,43,0.35)'; ctx.fillRect(lx - 1, top, 2, 540 - top); }
    }
    ctx.strokeStyle = RAVENS.gold; ctx.lineWidth = 3; ctx.strokeRect(x, top, w, 540 - top);
    // beat lines
    const { beatDur } = this.chart;
    const b0 = Math.floor(vis / beatDur);
    ctx.save(); ctx.beginPath(); ctx.rect(x, top, w, hitY - top); ctx.clip();
    for (let b = b0; b < b0 + 8; b++) {
      const y = hitY - (b * beatDur - vis) * SPEED;
      if (y < top || y > hitY) continue;
      ctx.fillStyle = b % 4 === 0 ? 'rgba(255,246,229,0.32)' : 'rgba(255,246,229,0.1)';
      ctx.fillRect(x, y - (b % 4 === 0 ? 1.5 : 0.5), w, b % 4 === 0 ? 3 : 1);
    }
    ctx.restore();
    // hit line
    ctx.fillStyle = RAVENS.gold; ctx.fillRect(x, hitY - 3, w, 6);
    // pads + keycaps
    for (let i = 0; i < 4; i++) {
      const cx = x + (i + 0.5) * LANE_W, L = LANES[i], f = this.padFlash[i];
      ctx.save();
      ctx.fillStyle = L.rim; ctx.beginPath(); ctx.ellipse(cx, hitY, LANE_W * 0.4 + f * 4, 15 + f * 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = f > 0 ? '#fff' : L.color; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = `rgba(255,246,229,${0.15 + f * 0.6})`; ctx.beginPath(); ctx.ellipse(cx, hitY - 1, LANE_W * 0.3, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      keycap(ctx, L.key, cx, hitY + 36);
      text(ctx, L.name, cx, hitY + 66, { align: 'center', font: 'bold 12px "Trebuchet MS", sans-serif', color: L.color });
    }
    // notes
    for (let i = this.judgeFrom; i < this.notes.length; i++) {
      const n = this.notes[i];
      const y = hitY - (n.t - vis) * SPEED;
      if (y < top - 20) break;
      if (n.judged && n.judged !== 'miss') continue;
      const cx = x + (n.lane + 0.5) * LANE_W, L = LANES[n.lane];
      const near = clamp(1 - Math.abs(n.t - vis) / 0.35, 0, 1);
      if (n.judged === 'miss') drawNoteGem(ctx, cx, y, '#6a6478', '#3a3540', LANE_W * 0.72, 0.5);
      else drawNoteGem(ctx, cx, y, L.color, L.rim, LANE_W * 0.72, n.demo ? 0.85 : 1, near);
    }
    // judgement pops
    for (const p of this.pops) {
      const k = 1 - p.life / 0.6, cx = x + (p.lane + 0.5) * LANE_W;
      text(ctx, p.text, cx, hitY - 40 - k * 26, { align: 'center', font: `bold ${Math.round(13 + (k < 0.15 ? (k / 0.15) * 3 : 3))}px "Trebuchet MS", sans-serif`, color: p.color, outline: 'rgba(16,19,31,0.9)', alpha: Math.min(1, p.life * 4) });
    }
    // combo
    if (this.combo >= 4) {
      text(ctx, `${this.combo}`, x + w / 2, top + 54, { align: 'center', font: 'bold 34px "Trebuchet MS", sans-serif', color: RAVENS.goldLite, outline: RAVENS.purpleDeep, outlineWidth: 6 });
      text(ctx, 'COMBO', x + w / 2, top + 74, { align: 'center', font: 'bold 12px "Trebuchet MS", sans-serif', color: PALETTE.paper });
    }
    ctx.restore();
  }

  _drawHud(ctx, vis, phase) {
    const g = this.game;
    const { barDur, endT } = this.chart;
    // bust (left top), title + progress
    drawBust(ctx, g, this.p.hero, 64, 64, { size: 104, k: this.moodK, mood: this.moodK > 0.05 ? this.mood : 'idle', beat: vis > 0 ? phase : 0, ring: RAVENS.gold });
    panel(ctx, 124, 14, 300, 58, { radius: 12, stroke: RAVENS.gold });
    text(ctx, 'DRUMLINE', 140, 38, { font: 'bold 20px "Trebuchet MS", sans-serif', color: RAVENS.goldLite });
    bar(ctx, 140, 48, 268, 10, clamp(vis / endT, 0, 1), RAVENS.purpleLite);
    // band counter
    drawGnome(ctx, 448, 70, { s: 0.6, band: 1 });
    chip(ctx, `${this.recruited}/${BAND} marching`, 462, 52, { fill: RAVENS.gold });
    // teaching overlay
    const cx = HW.x + HW.w / 2;
    if (vis < barDur) {
      // WATCH: demo bar plays itself
      panel(ctx, HW.x + 14, 96, HW.w - 28, 74, { radius: 12, stroke: RAVENS.gold, alpha: 0.95 });
      chip(ctx, 'WATCH', cx, 114, { align: 'center', fill: RAVENS.gold });
      text(ctx, 'Hit the drum as its note', cx, 140, { align: 'center', font: 'bold 16px "Trebuchet MS", sans-serif' });
      text(ctx, 'crosses the gold line', cx, 160, { align: 'center', font: 'bold 16px "Trebuchet MS", sans-serif', color: RAVENS.goldLite });
      // ghost hand pressing the upcoming demo key
      const next = this.notes.find((n) => n.demo && n.judged !== 'auto') ?? this.notes.find((n) => n.demo && n.judged === 'auto' && vis - n.t < 0.25);
      if (next) {
        const k = clamp(1 - (next.t - vis) / 0.5, 0, 1);
        this._drawHand(ctx, HW.x + (next.lane + 0.5) * LANE_W + 10, HW.hitY + 40 - k * 6 + (k > 0.9 ? 4 : 0));
      }
    } else if (vis < barDur * 2) {
      const b = Math.floor((vis - barDur) / this.chart.beatDur);
      const word = ['3', '2', '1', 'GO!'][clamp(b, 0, 3)];
      const k = ((vis - barDur) / this.chart.beatDur) % 1;
      panel(ctx, HW.x + 40, 96, HW.w - 80, 46, { radius: 12, stroke: RAVENS.gold, alpha: 0.95 });
      text(ctx, 'YOUR TURN!  D F J K or click', cx, 125, { align: 'center', font: 'bold 16px "Trebuchet MS", sans-serif', color: RAVENS.goldLite });
      text(ctx, word, cx, 250, { align: 'center', font: `bold ${Math.round(70 - k * 16)}px "Trebuchet MS", sans-serif`, color: RAVENS.goldLite, outline: RAVENS.purpleDeep, outlineWidth: 8, alpha: 1 - k * 0.5 });
    } else if (vis < barDur * 4) {
      text(ctx, 'Streaks recruit gnomes into the band!', 300, 112, { align: 'center', font: 'bold 16px "Trebuchet MS", sans-serif', color: PALETTE.paper, outline: 'rgba(16,19,31,0.85)', alpha: clamp((barDur * 4 - vis) / barDur, 0, 1) });
    }
    if (!this.kit.running && this.t > 0.5 && this.phase === 'play') {
      text(ctx, '(sound off: follow the notes)', 300, 530, { align: 'center', font: FONT.small, color: 'rgba(255,246,229,0.7)' });
    }
  }

  _drawHand(ctx, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.3);
    ctx.fillStyle = PALETTE.paper; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-4, -26, 9, 24, 4) : ctx.rect(-4, -26, 9, 24);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-9, -6, 24, 22, 7) : ctx.rect(-9, -6, 24, 22); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawEnd(ctx) {
    const k = clamp(this.endT / 0.4, 0, 1);
    const w = 312, h = 236, x = HW.x + (HW.w - w) / 2, y = 120 - (1 - k) * 30;
    ctx.save(); ctx.globalAlpha = k;
    panel(ctx, x, y, w, h, { radius: 16, stroke: this.success ? RAVENS.gold : PALETTE.danger });
    text(ctx, this.success ? 'The band is marching!' : 'The gnomes broke ranks!', x + w / 2, y + 44, { align: 'center', font: 'bold 22px "Trebuchet MS", sans-serif', color: this.success ? RAVENS.goldLite : PALETTE.paper });
    const s = this.stats;
    const cols = [['PERFECT', s.perfect, RAVENS.goldLite], ['GOOD', s.good, PALETTE.mint], ['MISS', s.miss, PALETTE.danger]];
    cols.forEach(([lab, v, c], i) => {
      const cx = x + 62 + i * 94;
      text(ctx, String(v), cx, y + 96, { align: 'center', font: 'bold 30px "Trebuchet MS", sans-serif', color: c });
      text(ctx, lab, cx, y + 116, { align: 'center', font: FONT.small, color: PALETTE.paper });
    });
    text(ctx, `Accuracy ${Math.round((this.acc ?? 0) * 100)}%`, x + w / 2, y + 152, { align: 'center', font: 'bold 18px "Trebuchet MS", sans-serif' });
    text(ctx, `Best streak ${this.best}  \u00b7  ${this.bandBeforeFinale}/${BAND} gnomes drummed in`, x + w / 2, y + 176, { align: 'center', font: FONT.small, color: 'rgba(255,246,229,0.8)' });
    if (this.endT > 1.4) text(ctx, this.success ? 'Click or Enter to continue' : 'Click or Enter to try again', x + w / 2, y + 212, { align: 'center', font: FONT.small, color: RAVENS.goldLite, alpha: 0.6 + 0.4 * Math.sin(this.endT * 5) });
    ctx.restore();
  }
}
