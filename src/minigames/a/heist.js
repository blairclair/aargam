// MOUSE HEIST: the follow-up to Bread Bake. Owned by: games-a.
// A giant mouse steals the finished loaf (the "steal" beat, ~3.4 s), then a side-scrolling chase through
// the house (kitchen -> hallway -> living room). The hero auto-runs right; the mouse runs ahead with the loaf.
//   Space / Up / W / click  jump (crumbs, pots, shoes, the knocked-over chair)
//   Down / S (hold)         slide under (thrown dish towels, hanging pans, clotheslines)
//   Right / D (hold)        sprint (stamina bar), the only way to really close the gap
// Pressure: the gap is on screen and in a meter; the mouse is heading for the pantry hole (progress bar).
// Surprises: it throws crumbs and dish towels back at you, knocks a chair into your path (~28%),
// and dives into a hole in the wall, popping out further ahead (~52%).
// Catch it (gap closes) -> tackle, loaf back. It reaches the pantry -> "Again!" with an easier chase
// (never re-bake). Score 0..1 from how early you caught it, minus trips, minus 0.15 per retry.
//
//   const h = new MouseHeist(game, p, { cheer, loafColor, easy, tm });
//   h.startSteal() | h.startChase();  h.update(dt);  h.render(ctx, drawCounter)  ->  h.done, h.score
//   drawCounter(ctx, loafOnBoard) draws the kitchen counter scene behind the steal beat (kitchen.js owns it).
import * as Sprites from '../../art/sprites.js';
import { Fx } from '../../art/fx.js';
import { text, panel } from '../../ui/widgets.js';
import { PALETTE, TAU, clamp, lerp, ease, BOLD, rr, playSfx, prompt, star } from './common.js';
import { drawMouse, drawStolenLoaf } from './mouse.js';

const GROUND = 452;          // feet line on screen
const HERO_X = 230;          // hero's fixed screen x
const HERO_SCALE = 2.0;
const MOUSE_SCALE = 1.75;
const HERO_H = 150, DUCK_H = 62;   // collision heights (px above feet)
const GRAV = 2000, JUMP_V = 700;
const CATCH_GAP = 70;        // auto-catch
const TACKLE_GAP = 175;      // Space lunges for it inside this gap

// obstacle kinds: low = jump over (h = top), high = slide under (b = bottom clearance)
const KIND = {
  crumbs: { low: true, h: 26, w: 60 },
  pot: { low: true, h: 40, w: 50 },
  shoes: { low: true, h: 30, w: 58 },
  books: { low: true, h: 44, w: 50 },
  cushion: { low: true, h: 36, w: 64 },
  chair: { low: true, h: 52, w: 92 },
  towel: { high: true, b: 74, w: 64 },
  pans: { high: true, b: 76, w: 56 },
  line: { high: true, b: 76, w: 70 },
  plant: { high: true, b: 76, w: 56 },
};
const SECTION = [
  { name: 'Kitchen', low: ['crumbs', 'pot'], high: ['pans'], wall: '#7a5640', wall2: '#5a4033' },
  { name: 'Hallway', low: ['shoes', 'books'], high: ['line'], wall: '#6a4a5e', wall2: '#4b3446' },
  { name: 'Living Room', low: ['cushion', 'books'], high: ['plant'], wall: '#46606a', wall2: '#30444d' },
];
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export class MouseHeist {
  constructor(game, p, o = {}) {
    this.game = game; this.p = p; this.hero = p.hero;
    this.cheer = o.cheer; this.loafColor = o.loafColor ?? '#d99a48';
    this.easy = o.easy ?? 0; this.tm = o.tm ?? 1;
    this.fx = new Fx();
    this.state = 'idle'; this.st = 0; this.t = 0; this.cam = 0;
    this.retry = 0; this.done = false; this.score = 0; this.tutorialShown = false;
  }

  // ================================================================ STEAL BEAT
  startSteal() {
    this.state = 'steal'; this.st = 0; this.loafTaken = false; this.saidSteal = false;
    this.cheer.showBust = false; this.cheer.place(150, 540, 280, 'left');
  }
  updSteal(dt) {
    const s = this.st;
    if (s > 0.35 && !this.thump) { this.thump = true; this.fx.addShake(4); playSfx('boing', { volume: 0.6 }); }
    if (s > 0.6 && !this.skid) { this.skid = true; playSfx('dash'); this.fx.addShake(6); for (let i = 0; i < 6; i++) this.fx.snowPuff(640 + i * 20, 372, 3, '#e8dccb'); }
    if (s > 1.15 && !this.loafTaken) { this.loafTaken = true; playSfx('pickup', { pitch: 0.7 }); this.fx.snowPuff(470, 330, 14, '#fffaf0'); this.fx.floatText(520, 230, 'yoink!', PALETTE.paper, { size: 26 }); }
    if (s > 2.0 && !this.saidSteal) {
      this.saidSteal = true; this.fx.addShake(10); playSfx('shout');
      this.cheer.react('oops', 'chaseSteal', true); this.cheer.bubbleT = 2.4;
    }
    if (s > 2.75 && !this.zoom) { this.zoom = true; playSfx('dash', { pitch: 1.3 }); }
    if (s > 3.5) this.startChase();
  }
  renderSteal(ctx, drawCounter) {
    const s = this.st, t = this.t;
    drawCounter(ctx, !this.loafTaken);
    // the mouse: bursts in from the right, skids, grabs, gloats, bolts
    let mx, pose = 'run', look = -1, loaf = this.loafTaken;
    if (s < 0.6) { mx = lerp(1180, 660, ease(s / 0.6)); pose = 'run'; look = -1; }
    else if (s < 0.95) { mx = 660 + Math.sin((s - 0.6) * 40) * 4 * (0.95 - s); pose = 'stand'; look = -1; }
    else if (s < 1.25) { mx = lerp(660, 600, ease((s - 0.95) / 0.3)); pose = 'grab'; look = -1; }
    else if (s < 2.0) { mx = 600; pose = 'hug'; }
    else if (s < 2.7) { mx = 600; pose = 'taunt'; }
    else { mx = lerp(600, 1250, ease((s - 2.7) / 0.7)); pose = 'run'; look = 1; }
    const flip = s < 2.7; // faces the loaf (left) until it bolts
    ctx.save();
    ctx.translate(mx, 372);
    if (flip) ctx.scale(-1, 1);
    drawMouse(ctx, 0, 0, { scale: 2.3, t, pose, loaf, loafColor: this.loafColor, loafW: 72, look });
    ctx.restore();
    if (s > 2.7) { // dust trail
      ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) { const y = 200 + i * 34; ctx.beginPath(); ctx.moveTo(mx - 160 - i * 20, y); ctx.lineTo(mx - 260 - i * 30, y); ctx.stroke(); }
      ctx.restore();
    }
    if (s > 0.25 && s < 0.7) { // something big is coming
      text(ctx, '!', 900, 200 + Math.sin(t * 30) * 4, { align: 'center', font: BOLD(64), color: PALETTE.danger, outline: PALETTE.ink });
    }
    // the hero's double-take: content glance -> looks away -> SNAPS back
    let expr = 'happy', bx = 150, sc = 1, rot = 0, exprT = s;
    if (s < 1.3) { expr = 'happy'; rot = Math.sin(t * 3) * 0.02; }
    else if (s < 2.0) { expr = 'smile'; bx = 130; rot = -0.06; exprT = s - 1.3; }   // looking away, oblivious
    else { expr = 'surprised'; exprT = s - 2.0; sc = 1 + 0.12 * Math.max(0, 1 - (s - 2.0) * 3); bx = 160 + Math.sin(t * 50) * 5 * Math.max(0, 1 - (s - 2.0) * 2); }
    ctx.save();
    ctx.translate(bx, 540); ctx.rotate(rot); ctx.scale(sc, sc);
    if (typeof Sprites.drawBust === 'function') Sprites.drawBust(ctx, this.game, this.hero, expr, 0, 0, 280, { t, exprT });
    ctx.restore();
    if (s > 1.3 && s < 2.0) text(ctx, '♪', bx + 90, 300 - (s - 1.3) * 40, { align: 'center', font: BOLD(30), color: PALETTE.paper, alpha: 0.8 });
    if (s > 2.0) { // the snap: big "!!" and shock lines beside the bust
      const k = ease((s - 2.0) / 0.15);
      ctx.save(); ctx.translate(300, 300); ctx.rotate(0.15); ctx.scale(k, k);
      text(ctx, '!!', 0, 0, { align: 'center', baseline: 'middle', font: BOLD(72), color: PALETTE.danger, outline: PALETTE.ink });
      ctx.restore();
      ctx.save(); ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.globalAlpha = 0.8 * k;
      for (let i = 0; i < 6; i++) { const a = -1.2 + i * 0.35; ctx.beginPath(); ctx.moveTo(150 + Math.cos(a) * 170, 400 + Math.sin(a) * 170); ctx.lineTo(150 + Math.cos(a) * 205, 400 + Math.sin(a) * 205); ctx.stroke(); }
      ctx.restore();
    }
    if (s > 2.0 && s < 2.15) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, 960, 540); }
    // big stamp
    if (s > 2.0) {
      const k = ease((s - 2.0) / 0.25);
      ctx.save(); ctx.translate(620, 130); ctx.rotate(-0.08); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); ctx.globalAlpha = k;
      text(ctx, 'BREAD THIEF!', 0, 0, { align: 'center', baseline: 'middle', font: BOLD(54), color: PALETTE.sun, outline: PALETTE.choc });
      ctx.restore();
    }
  }

  // ================================================================ CHASE
  startChase() {
    const r = this.retry, easy = this.easy;
    this.state = 'go'; this.st = 0;
    this.cheer.showBust = true; this.cheer.place(900, 540, 112, 'right');
    this.vh = 296 + 10 * easy + 14 * r;               // hero base speed
    this.vm = 322;                                     // mouse base speed
    this.D = 322 * 42 * this.tm * (1 + 0.08 * r);     // mouse's run to the pantry hole
    this.space = 1 + 0.12 * r + 0.08 * easy;          // obstacle spacing multiplier
    this.hx = 0; this.mx = 470; this.cam = 0; this.mx0 = this.mx; this.hx0 = 0;
    this.jumpY = 0; this.vy = 0; this.ducking = false; this.duckT = 0;
    this.stamina = 1; this.sprinting = false; this.trip = 0; this.trips = 0;
    this.obs = []; this.nextX = 900; this.throwT = 2.6; this.windT = -1; this.windKind = null;
    this.mouseSlow = 0; this.tauntT = 0; this.tauntCd = 5; this.hop = 0;
    this.chairDone = false; this.holeState = null; this.holes = []; this.hiddenT = 0;
    this.saidClose = false; this.saidNear = false; this.saidTrip = false; this.firstLow = null; this.firstHigh = null;
    this.catchT = 0; this.runT = 0; this.canTackle = false; this.impact = false; this.gotLoaf = false;
    this.fx = new Fx();
    playSfx('whack');
  }

  get gap() { return this.mx - this.hx; }
  get mprog() { return clamp((this.mx - this.mx0) / this.D, 0, 1); }
  section(wx) { const f = (wx - this.hx0) / this.D; return f < 0.34 ? 0 : f < 0.67 ? 1 : 2; }

  update(dt) {
    this.t += dt; this.st += dt;
    this.fx.update(dt);
    if (this.state === 'steal') return this.updSteal(dt);
    if (this.state === 'go') {
      if (this.st > 0.15 && !this.saidGo) { this.saidGo = true; if (this.retry === 0) this.cheer.react('cheer', 'chaseStart', true); }
      if (this.st > 1.1) { this.state = 'run'; this.st = 0; this.saidGo = false; }
      return;
    }
    if (this.state === 'run') return this.updRun(dt);
    if (this.state === 'caught') return this.updCaught(dt);
    if (this.state === 'escaped') {
      // pan over to the pantry so you SEE it dive in with your loaf
      this.cam = lerp(this.cam, clamp(this.gap - 380, 0, 2400), 1 - Math.exp(-dt * 5));
      if (this.st > 2.2) { this.state = 'again'; this.st = 0; playSfx('whack'); }
      return;
    }
    if (this.state === 'again') { if (this.st > 1.6) { this.retry++; this.startChase(); } }
  }

  updRun(dt) {
    const inp = this.game.input;
    this.runT += dt;
    // ---- hero input
    const grounded = this.jumpY <= 0;
    const jump = inp.pressed('up') || inp.pressed('confirm') || inp.mouse.pressed;
    if (jump && this.canTackle) return this.catchIt();
    if (jump && grounded && this.trip <= 0) { this.vy = JUMP_V; this.ducking = false; playSfx('boing', { volume: 0.5, pitch: 1.2 }); }
    const duck = inp.down('down');
    if (duck && grounded && !this.ducking) { this.duckT = 0; playSfx('swing', { volume: 0.4 }); }
    this.ducking = duck && grounded;
    if (this.ducking) this.duckT += dt;
    if (!grounded || this.vy > 0) { this.jumpY += this.vy * dt; this.vy -= GRAV * dt; if (inp.down('down')) this.vy -= GRAV * dt; if (this.jumpY <= 0) { this.jumpY = 0; this.vy = 0; this.fx.snowPuff(HERO_X, GROUND, 3, '#e8dccb'); } }
    const wantSprint = inp.down('right') && this.trip <= 0;
    this.sprinting = wantSprint && this.stamina > 0.02;
    this.stamina = clamp(this.stamina + (this.sprinting ? -0.55 : 0.36) * dt, 0, 1);
    this.trip = Math.max(0, this.trip - dt);
    let vh = this.vh + (this.sprinting ? 115 : 0);
    if (this.trip > 0) vh *= 0.3;
    if (this.ducking) vh *= 0.92;
    this.hx += vh * dt;
    if (this.sprinting && Math.random() < dt * 14) this.fx.snowPuff(HERO_X - 20, GROUND, 1, '#e8dccb');

    // ---- mouse
    let vm = this.vm;
    const gap = this.gap;
    this.panic = gap < 230; // sweats and squeaks (no speed boost: closing in should feel earned, not rubber-banded)
    if (this.mouseSlow > 0) { this.mouseSlow -= dt; vm *= this.slowK ?? 0.72; }
    this.tauntCd -= dt;
    if (this.tauntT > 0) { this.tauntT -= dt; vm = 170; }
    else if (gap > 600 && this.tauntCd <= 0 && !this.holeState) { this.tauntT = 1.1; this.tauntCd = 7; playSfx('squish', { pitch: 1.6 }); this.fx.floatText(this.sx(this.mx), GROUND - 230, 'nyeh!', PALETTE.paper, { size: 22 }); }
    if (this.windT >= 0) vm *= 0.8;
    this.mx += vm * dt;
    // the mouse hops over floor obstacles
    this.hop = Math.max(0, this.hop - dt);
    for (const o of this.obs) if (!o.mhop && KIND[o.kind].low && !o.thrown && o.x > this.mx - 10 && o.x < this.mx + 60) { o.mhop = true; this.hop = 0.45; }

    // ---- surprises
    const f = this.mprog;
    if (!this.chairDone && f > 0.28 && !this.holeState) this.knockChair();
    // the first time you get close (or halfway, whichever comes first) it bolts into the wall
    if (!this.holeState && (f > 0.52 || (gap < 250 && this.runT > 3))) this.diveHole();
    if (this.holeState === 'hidden') {
      this.hiddenT += dt;
      if (this.hiddenT > 1.5) {
        this.holeState = 'out'; this.hiddenT = 0;
        this.mx += 260;
        this.holes.push({ x: this.mx - 10 });
        this.mouseSlow = 1.0; this.slowK = 0.85; // it comes out a little dizzy from the tunnel
        playSfx('boing'); this.fx.burst(this.sx(this.mx), GROUND - 30, '#c9b8a8', 14, 160);
        this.fx.floatText(this.sx(this.mx), GROUND - 210, 'There!', PALETTE.sun, { size: 26 });
      }
    }

    // ---- throws (telegraphed by a wind-up pose)
    if (this.holeState !== 'hidden') {
      this.throwT -= dt;
      if (this.windT < 0 && this.throwT <= 0 && this.gap < 760 && this.gap > 200) { this.windT = 0; this.windKind = this.pickThrow(); }
      if (this.windT >= 0) { this.windT += dt; if (this.windT > 0.4) this.releaseThrow(); }
    }

    // ---- static obstacles ahead
    while (this.nextX < this.hx + 1150 && this.nextX < this.hx0 + this.D + 300) {
      const sec = SECTION[this.section(this.nextX)];
      const n = Math.floor(this.nextX / 37);
      const high = hash(n) < 0.34;
      const list = high ? sec.high : sec.low;
      const kind = list[Math.floor(hash(n + 7) * list.length)];
      if (!this.obs.some((o) => Math.abs(o.x - this.nextX) < 220)) this.obs.push({ x: this.nextX, kind, y: 0 });
      this.nextX += (430 + hash(n + 3) * 300) * this.space;
    }

    // ---- move thrown things + collisions
    for (const o of this.obs) {
      if (o.vx) o.x += o.vx * dt;
      if (o.fly) { o.t += dt; const k = clamp(o.t / o.dur, 0, 1); o.y = Math.sin(k * Math.PI) * 120; if (k >= 1) { o.fly = false; o.vx = 0; o.y = 0; this.fx.snowPuff(this.sx(o.x), GROUND, 4, '#e0b268'); } }
      if (o.tumble != null) { o.tumble += dt; if (o.tumble < 0.7) o.x -= 260 * dt; }
      const K = KIND[o.kind];
      const dx = Math.abs(o.x - this.hx);
      if (!o.hit && !o.passed && !o.fly && dx < K.w / 2 + 16) {
        const hit = K.low ? this.jumpY < K.h - 2 : (this.ducking ? DUCK_H : HERO_H) + this.jumpY > K.b;
        if (hit) this.tripOn(o);
      }
      if (!o.passed && o.x < this.hx - K.w / 2 - 16) {
        o.passed = true;
        if (!o.hit) {
          const near = K.low ? this.jumpY - K.h < 22 : this.duckT < 0.22;
          if (near) this.nearMiss();
        }
      }
    }
    this.obs = this.obs.filter((o) => o.x > this.hx - 400);
    this.holes = this.holes.filter((h) => h.x > this.hx - 400);

    // ---- bark: gap closing
    if (!this.saidClose && gap < 240 && this.holeState !== 'hidden') { this.saidClose = true; this.cheer.react('cheer', 'chaseClose', true); }
    // ---- end conditions
    this.canTackle = this.holeState === 'out' && this.gap < TACKLE_GAP && this.trip <= 0;
    if (gap <= CATCH_GAP && this.holeState !== 'hidden') return this.catchIt();
    if (this.mx - this.mx0 >= this.D) return this.escape();
  }

  sx(wx) { return HERO_X + (wx - this.hx) - this.cam; }

  pickThrow() {
    // towel unless a floor obstacle sits where it would meet the hero (no jump+slide combos)
    const meet = this.hx + this.vh * (this.gap / (this.vh + 230));
    const lowNear = this.obs.some((o) => KIND[o.kind].low && !o.passed && Math.abs(o.x - meet) < 240);
    const highNear = this.obs.some((o) => KIND[o.kind].high && !o.passed && Math.abs(o.x - (this.mx - 90)) < 240);
    // crumbs land ~45 px behind it after 0.4 s, while the hero runs ~160 px: keep them >= ~230 px ahead on landing
    const land = this.mx - 45;
    const crumbsOk = !highNear && this.gap > 440 && !this.obs.some((o) => !o.passed && Math.abs(o.x - land) < 230);
    const towelOk = !lowNear;
    if (crumbsOk && towelOk) return hash(this.t * 13) < 0.5 ? 'towel' : 'crumbs';
    return towelOk ? 'towel' : crumbsOk ? 'crumbs' : null;
  }
  releaseThrow() {
    const k = this.windKind;
    this.windT = -1; this.throwT = (2.8 + hash(this.t) * 1.6) * this.space;
    if (!k) return;
    playSfx('throw');
    if (k === 'towel') this.obs.push({ x: this.mx - 30, kind: 'towel', y: 0, vx: -230, thrown: true, spin: 0 });
    else this.obs.push({ x: this.mx - 20, kind: 'crumbs', y: 0, vx: -60, thrown: true, fly: true, t: 0, dur: 0.4 });
  }
  knockChair() {
    this.chairDone = true;
    const x = this.mx - 40;
    // keep the chair clear of other floor clutter
    this.obs = this.obs.filter((o) => Math.abs(o.x - (x - 180)) > 200 || o.passed);
    this.obs.push({ x, kind: 'chair', y: 0, tumble: 0 });
    this.fx.addShake(8); playSfx('hit'); playSfx('whack', { pitch: 0.7 });
    this.fx.floatText(this.sx(x), GROUND - 160, 'CRASH!', PALETTE.danger, { big: true, size: 34 });
    this.mouseSlow = 0.5; this.slowK = 0.72;
  }
  diveHole() {
    this.holeState = 'hidden'; this.hiddenT = 0;
    this.holes.push({ x: this.mx + 30 });
    playSfx('squish', { pitch: 0.6 }); this.fx.burst(this.sx(this.mx + 30), GROUND - 20, '#c9b8a8', 10, 120);
    this.fx.floatText(this.sx(this.mx + 30), GROUND - 160, '?!', PALETTE.sun, { big: true, size: 36 });
    this.cheer.react('oops', 'chaseHole', true);
    this.windT = -1;
  }
  tripOn(o) {
    o.hit = true; this.trips++; if (globalThis.__heistLog) console.log('[drv] trip on ' + o.kind + (o.thrown ? ' (thrown)' : '') + ' jumpY=' + Math.round(this.jumpY) + ' duck=' + this.ducking); this.trip = 0.7; this.vy = Math.max(this.vy, 0);
    this.fx.addShake(7); playSfx('hurt');
    this.fx.burst(HERO_X + 20, GROUND - 40, o.kind === 'towel' ? '#e46a6a' : '#e0b268', 12, 150);
    this.fx.floatText(HERO_X, GROUND - 190, 'trip!', PALETTE.danger, { size: 22 });
    this.cheer.react('oops', 'chaseTrip', !this.saidTrip); this.saidTrip = true;
  }
  nearMiss() {
    this.fx.floatText(HERO_X + 40, GROUND - 200, 'close one!', PALETTE.mint, { size: 20 });
    playSfx('blip', { pitch: 1.6 });
    this.cheer.react('cheer', 'chaseNear', !this.saidNear); this.saidNear = true;
  }
  catchIt() {
    this.state = 'caught'; this.st = 0;
    const f = this.mprog;
    const base = clamp(0.35 + 0.65 * clamp((1 - f) / 0.5, 0, 1) - 0.06 * this.trips, 0.3, 1);
    this.chaseScore = Math.max(0.25, base - 0.15 * this.retry);
    this.catchFrom = this.sx(this.mx);
    playSfx('dash');
  }
  updCaught(dt) {
    const s = this.st;
    if (s > 0.32 && !this.impact) {
      this.impact = true; this.fx.addShake(12); playSfx('kick'); playSfx('hit');
      for (let i = 0; i < 5; i++) this.fx.snowPuff(this.catchFrom + (i - 2) * 26, GROUND - 20, 6, '#efe4d4');
      this.fx.sparkle(this.catchFrom, GROUND - 120, PALETTE.sun, 14, 60);
      this.fx.floatText(this.catchFrom, GROUND - 250, 'TACKLE!', PALETTE.sun, { big: true, size: 44 });
    }
    if (s > 1.15 && !this.gotLoaf) {
      this.gotLoaf = true; playSfx('star'); playSfx('victory');
      this.fx.confetti(this.catchFrom - 40, 120, 50);
      this.cheer.react('cheer', 'chaseCatch', true);
    }
    if (s > 3.6) { this.done = true; this.score = this.chaseScore; }
  }
  escape() {
    this.state = 'escaped'; this.st = 0;
    playSfx('defeat'); this.fx.addShake(5);
    this.cheer.react('oops', 'chaseMiss', true);
  }

  // ---------------------------------------------------------------- render
  render(ctx, drawCounter) {
    if (this.state === 'steal') {
      const sh = this.fx.shakeOffset();
      ctx.save(); ctx.translate(sh.x, sh.y);
      this.renderSteal(ctx, drawCounter);
      this.fx.render(ctx);
      ctx.restore();
      this.cheer.render(ctx);
      return;
    }
    if (this.state === 'idle') return;
    const sh = this.fx.shakeOffset();
    ctx.save(); ctx.translate(sh.x, sh.y);
    this.drawWorld(ctx);
    this.drawObstacles(ctx, false);
    this.drawMouseRunner(ctx);
    this.drawHeroRunner(ctx);
    this.drawObstacles(ctx, true);
    this.fx.render(ctx);
    ctx.restore();
    this.drawHUD(ctx);
    this.cheer.render(ctx);
    this.drawOverlays(ctx);
  }

  drawWorld(ctx) {
    const camL = this.hx - HERO_X + this.cam;
    const wallBot = GROUND - 26;
    // wall by section
    for (let i = 0; i < 3; i++) {
      const a = this.hx0 + this.D * [0, 0.34, 0.67][i], b = i < 2 ? this.hx0 + this.D * [0.34, 0.67][i] : 1e9;
      const x0 = Math.max(0, a - camL), x1 = Math.min(960, b - camL);
      if (x1 <= x0 && !(i === 0 && a - camL > 0)) continue;
      const sec = SECTION[i];
      const g = ctx.createLinearGradient(0, 0, 0, wallBot);
      g.addColorStop(0, sec.wall2); g.addColorStop(1, sec.wall);
      ctx.fillStyle = g; ctx.fillRect(i === 0 ? 0 : x0, 0, x1 - (i === 0 ? 0 : x0), wallBot);
      ctx.save(); ctx.beginPath(); ctx.rect(i === 0 ? 0 : x0, 0, x1 - (i === 0 ? 0 : x0), wallBot); ctx.clip();
      if (i === 0) { // subway tiles
        ctx.fillStyle = 'rgba(255,240,215,0.07)';
        for (let y = 150, r = 0; y < wallBot; y += 26, r++) for (let x = -((camL) % 60) - (r % 2) * 30 - 60; x < 960; x += 60) { rr(ctx, x + 2, y + 2, 56, 22, 4); ctx.fill(); }
      } else if (i === 1) { // striped wallpaper
        ctx.fillStyle = 'rgba(255,230,240,0.06)';
        for (let x = -((camL) % 40) - 40; x < 960; x += 40) ctx.fillRect(x, 0, 16, wallBot);
      } else { // dotted wallpaper
        ctx.fillStyle = 'rgba(220,250,255,0.08)';
        for (let y = 20, r = 0; y < wallBot - 40; y += 36, r++) for (let x = -((camL) % 72) - 72 + (r % 2) * 36; x < 1000; x += 72) { ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
      }
      ctx.restore();
    }
    // decor every 520 px of world
    const k0 = Math.floor((camL - 300) / 520), k1 = Math.floor((camL + 1000) / 520);
    for (let k = k0; k <= k1; k++) this.drawDecor(ctx, k, k * 520 - camL + 120);
    // doorways at the section borders
    for (const f of [0.34, 0.67]) { const x = this.hx0 + this.D * f - camL; if (x > -120 && x < 1080) this.drawDoorway(ctx, x, wallBot, f < 0.5 ? 'Hallway' : 'Living Room'); }
    // pantry door + hole at the end
    const endX = this.mx0 + this.D - camL;
    if (endX < 1200) this.drawPantry(ctx, endX, wallBot);
    // wainscot + baseboard
    ctx.fillStyle = 'rgba(255,246,229,0.08)'; ctx.fillRect(0, wallBot - 70, 960, 70);
    ctx.fillStyle = 'rgba(16,19,31,0.25)'; ctx.fillRect(0, wallBot - 72, 960, 3);
    ctx.fillStyle = '#e9dcc4'; ctx.fillRect(0, wallBot - 14, 960, 14);
    ctx.fillStyle = 'rgba(16,19,31,0.25)'; ctx.fillRect(0, wallBot - 1, 960, 3);
    // mouse holes in the baseboard
    for (const h of this.holes) this.drawHole(ctx, this.sx(h.x), wallBot + 2);
    // floor boards (scroll 1:1)
    const fg = ctx.createLinearGradient(0, wallBot, 0, 540);
    fg.addColorStop(0, '#9a6842'); fg.addColorStop(1, '#5e3b26');
    ctx.fillStyle = fg; ctx.fillRect(0, wallBot, 960, 540 - wallBot);
    ctx.strokeStyle = 'rgba(40,22,12,0.35)'; ctx.lineWidth = 1.5;
    for (let y = wallBot + 20, row = 0; y < 540; y += 24, row++) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke();
      const off = (row * 97) % 180;
      for (let x = -((camL - off) % 180 + 180) % 180; x < 960; x += 180) { ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x, y); ctx.stroke(); }
    }
    // runner rug in the hallway
    const ra = this.hx0 + this.D * 0.36 - camL, rb = this.hx0 + this.D * 0.65 - camL;
    if (rb > 0 && ra < 960) { ctx.fillStyle = 'rgba(169,72,58,0.55)'; ctx.fillRect(Math.max(0, ra), GROUND - 8, Math.min(960, rb) - Math.max(0, ra), 34); ctx.fillStyle = 'rgba(255,201,74,0.35)'; ctx.fillRect(Math.max(0, ra), GROUND - 4, Math.min(960, rb) - Math.max(0, ra), 3); ctx.fillRect(Math.max(0, ra), GROUND + 20, Math.min(960, rb) - Math.max(0, ra), 3); }
    // warm lamp glow
    const lg = ctx.createRadialGradient(480, 40, 10, 480, 40, 520);
    lg.addColorStop(0, 'rgba(255,201,74,0.16)'); lg.addColorStop(1, 'rgba(255,201,74,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, 960, 540);
  }

  drawDecor(ctx, k, x) {
    const sec = this.section(k * 520 + 120);
    const r = hash(k + 101), wallBot = GROUND - 26;
    ctx.save();
    if (sec === 0) {
      if (r < 0.5) { // upper cabinets
        ctx.fillStyle = '#b5835a'; rr(ctx, x - 90, 40, 180, 110, 8); ctx.fill();
        ctx.strokeStyle = '#7a4e32'; ctx.lineWidth = 3; ctx.strokeRect(x - 80, 50, 76, 90); ctx.strokeRect(x + 4, 50, 76, 90);
        ctx.fillStyle = '#e9dcc4'; ctx.fillRect(x - 12, 92, 4, 14); ctx.fillRect(x + 10, 92, 4, 14);
      } else { // window with morning light
        ctx.fillStyle = '#ffe9b8'; rr(ctx, x - 70, 60, 140, 150, 8); ctx.fill();
        const sky = ctx.createLinearGradient(0, 66, 0, 204); sky.addColorStop(0, '#9fd3f0'); sky.addColorStop(1, '#ffe4a8');
        ctx.fillStyle = sky; ctx.fillRect(x - 62, 68, 124, 134);
        ctx.fillStyle = '#ffe9b8'; ctx.fillRect(x - 3, 68, 6, 134); ctx.fillRect(x - 62, 132, 124, 6);
      }
      // counter run along the wall
      ctx.fillStyle = '#c48d52'; ctx.fillRect(x - 200, wallBot - 110, 400, 16);
      ctx.fillStyle = '#8a5a3a'; ctx.fillRect(x - 196, wallBot - 94, 392, 80);
      ctx.strokeStyle = 'rgba(40,22,12,0.4)'; ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) ctx.strokeRect(x + i * 130 - 60, wallBot - 88, 120, 68);
    } else if (sec === 1) { // picture frames + a coat hook
      const w = 70 + r * 50, h = 60 + hash(k + 5) * 50;
      ctx.fillStyle = '#c9a26a'; rr(ctx, x - w / 2 - 8, 110 - 8, w + 16, h + 16, 4); ctx.fill();
      ctx.fillStyle = ['#7fb3d5', '#e8b07a', '#9ccf9a'][Math.floor(r * 3)]; ctx.fillRect(x - w / 2, 110, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x - w / 4, 110 + h / 3, h / 6, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(16,19,31,0.2)'; ctx.beginPath(); ctx.moveTo(x - w / 2, 110 + h); ctx.lineTo(x - w / 6, 110 + h * 0.45); ctx.lineTo(x + w / 2, 110 + h); ctx.fill();
      if (r > 0.5) { ctx.fillStyle = '#c9a26a'; ctx.fillRect(x + 120, 210, 80, 8); ctx.fillStyle = PALETTE.denim; rr(ctx, x + 130, 218, 26, 90, 8); ctx.fill(); }
    } else { // window + sofa back + floor lamp
      ctx.fillStyle = '#ffe9b8'; rr(ctx, x - 80, 70, 160, 140, 8); ctx.fill();
      ctx.fillStyle = '#ffd59a'; ctx.fillRect(x - 72, 78, 144, 124);
      ctx.fillStyle = '#ffe9b8'; ctx.fillRect(x - 3, 78, 6, 124);
      ctx.fillStyle = 'rgba(244,166,141,0.55)'; ctx.beginPath(); ctx.arc(x + 30, 150, 20, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3f6e7a'; rr(ctx, x - 150, wallBot - 100, 300, 92, 26); ctx.fill();
      ctx.fillStyle = '#4f8590'; rr(ctx, x - 140, wallBot - 70, 280, 50, 18); ctx.fill();
    }
    ctx.restore();
  }

  drawDoorway(ctx, x, wallBot, label) {
    ctx.save();
    ctx.fillStyle = '#2a1d1a'; ctx.fillRect(x - 55, 120, 110, wallBot - 120);
    ctx.fillStyle = '#e9dcc4'; ctx.fillRect(x - 66, 110, 12, wallBot - 110); ctx.fillRect(x + 54, 110, 12, wallBot - 110); ctx.fillRect(x - 66, 108, 132, 14);
    text(ctx, label, x, 96, { align: 'center', font: BOLD(16), color: PALETTE.paper, alpha: 0.85 });
    ctx.restore();
  }
  drawPantry(ctx, x, wallBot) {
    ctx.save();
    ctx.fillStyle = '#b5835a'; ctx.fillRect(x + 40, 130, 130, wallBot - 130);
    ctx.strokeStyle = '#7a4e32'; ctx.lineWidth = 3; ctx.strokeRect(x + 50, 140, 110, wallBot - 150);
    text(ctx, 'PANTRY', x + 105, 120, { align: 'center', font: BOLD(16), color: PALETTE.paper });
    ctx.restore();
    this.drawHole(ctx, x, wallBot + 2, 1.4);
    // flag over the goal so the end is readable
    ctx.save(); ctx.fillStyle = PALETTE.danger; ctx.globalAlpha = 0.8 + 0.2 * Math.sin(this.t * 6);
    text(ctx, '▼ escape hole', x, wallBot - 70, { align: 'center', font: BOLD(14), color: PALETTE.danger, outline: PALETTE.ink });
    ctx.restore();
  }
  drawHole(ctx, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#120c0a'; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-30, -26); ctx.arc(0, -26, 30, Math.PI, 0); ctx.lineTo(30, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6b4a3a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }

  drawObstacles(ctx, front) {
    for (const o of this.obs) {
      const K = KIND[o.kind];
      if (!!K.high !== front) continue; // hanging + flying things draw in front of the hero
      const x = this.sx(o.x);
      if (x < -140 || x > 1100) continue;
      ctx.save(); ctx.translate(x, GROUND - (o.y ?? 0));
      if (o.hit) ctx.globalAlpha = 0.55;
      drawObstacle(ctx, o, this.t);
      ctx.restore();
      // first-time prompts
      if (this.retry === 0 && !o.passed && !o.hit && x > HERO_X + 40 && x < HERO_X + 330) {
        if (K.low && (this.firstLow == null || this.firstLow === o)) { this.firstLow = o; text(ctx, 'JUMP!', x, GROUND - 90 - Math.abs(Math.sin(this.t * 8)) * 8, { align: 'center', font: BOLD(24), color: PALETTE.sun, outline: PALETTE.ink }); }
        if (K.high && (this.firstHigh == null || this.firstHigh === o)) { this.firstHigh = o; text(ctx, 'SLIDE! (↓)', x, GROUND - 40, { align: 'center', font: BOLD(22), color: PALETTE.mint, outline: PALETTE.ink }); }
      }
    }
  }

  drawMouseRunner(ctx) {
    if (this.state === 'run' && this.holeState === 'hidden') return;
    let x = this.sx(this.mx), pose = 'run', look = 1, y = GROUND;
    const caught = this.state === 'caught';
    if (caught) { x = this.catchFrom; pose = this.st > 0.32 ? 'dizzy' : 'run'; }
    else if (this.state === 'escaped') {
      if (this.st > 0.9) return;
      pose = 'dive'; x += Math.min(this.st, 0.5) * 60; y = GROUND - 10;
    } else if (this.state === 'run') {
      if (this.windT >= 0) { pose = 'throw'; look = -1; }
      else if (this.tauntT > 0) { pose = 'taunt'; look = -1; }
      if (this.holeState === 'out' && this.mouseSlow > 0.55 && this.slowK === 0.85) pose = 'dizzy';
      y = GROUND - Math.sin(clamp(this.hop / 0.45, 0, 1) * Math.PI) * 40;
    }
    if (x > 1000) { // off-screen: edge arrow with distance
      const d = Math.round(this.gap / 100);
      ctx.save(); ctx.fillStyle = PALETTE.danger;
      ctx.beginPath(); ctx.moveTo(950, GROUND - 90); ctx.lineTo(924, GROUND - 106); ctx.lineTo(924, GROUND - 74); ctx.fill();
      text(ctx, `${d} m`, 900, GROUND - 88, { align: 'right', baseline: 'middle', font: BOLD(18), color: PALETTE.paper, outline: PALETTE.ink });
      ctx.restore();
      return;
    }
    drawMouse(ctx, x, y, { scale: MOUSE_SCALE, t: this.t, pose, loaf: !(caught && this.st > 0.32), loafColor: this.loafColor, look, panic: this.panic && !caught });
    if (this.canTackle && this.state === 'run') {
      const b = Math.abs(Math.sin(this.t * 10));
      text(ctx, 'TACKLE! (Space)', x - 20, y - 262 - b * 8, { align: 'center', font: BOLD(26), color: PALETTE.sun, outline: PALETTE.choc });
    }
    // gap callout over the thief
    else if (this.state === 'run' && x < 900) text(ctx, `${(this.gap / 100).toFixed(1)} m`, x - 10, y - 236, { align: 'center', font: BOLD(16), color: this.gap < 240 ? PALETTE.mint : PALETTE.paper, outline: PALETTE.ink });
  }

  drawHeroRunner(ctx) {
    const game = this.game, t = this.t;
    if (this.state === 'caught') {
      const s = this.st, k = clamp(s / 0.32, 0, 1);
      const x = lerp(HERO_X, this.catchFrom - 40, ease(k)), y = GROUND - Math.sin(k * Math.PI) * 60;
      if (s < 0.32) Sprites.drawHero(ctx, game, this.hero, x, y, { anim: 'dash', facing: 0, t, scale: HERO_SCALE });
      else {
        // loaf flies up out of the mouse's arms and lands in the hero's hands, held high
        const lk = clamp((s - 0.32) / 0.8, 0, 1);
        Sprites.drawHero(ctx, game, this.hero, x, GROUND, { anim: 'idle', facing: 0, t, scale: HERO_SCALE });
        const lx = lerp(this.catchFrom + 10, x, lk), ly = lerp(GROUND - 120, GROUND - 175, lk) - Math.sin(lk * Math.PI) * 120;
        if (lk >= 1) { ctx.fillStyle = 'rgba(255,201,74,0.3)'; ctx.beginPath(); ctx.arc(lx, ly - 20, 60 + Math.sin(t * 6) * 6, 0, TAU); ctx.fill(); }
        drawStolenLoaf(ctx, lx, ly, 96, this.loafColor);
      }
      return;
    }
    const x = HERO_X - this.cam, y = GROUND - this.jumpY;
    if (this.state === 'again' || this.state === 'escaped') {
      Sprites.drawHero(ctx, game, this.hero, x, GROUND, { anim: 'idle', facing: 0, t, scale: HERO_SCALE });
      return;
    }
    if (this.ducking) {
      ctx.save(); ctx.translate(x + 20, GROUND - 4); ctx.rotate(-1.05);
      Sprites.drawHero(ctx, game, this.hero, 0, 0, { anim: 'dash', facing: 0, t, scale: HERO_SCALE });
      ctx.restore();
      if (Math.random() < 0.5) this.fx.snowPuff(x + 30, GROUND, 1, '#e8dccb');
      return;
    }
    const anim = this.trip > 0 ? 'hurt' : this.sprinting || this.jumpY > 0 ? 'dash' : 'walk';
    Sprites.drawHero(ctx, game, this.hero, x, y, { anim, facing: 0, t: t * 1.6, progress: this.trip > 0 ? 1 - this.trip / 0.7 : undefined, scale: HERO_SCALE });
  }

  drawHUD(ctx) {
    if (this.state === 'steal' || this.state === 'idle') return;
    // gap meter: hero portrait on the left, the thief slides along; catch zone glows
    const x0 = 300, x1 = 660, y = 40;
    panel(ctx, x0 - 46, y - 24, x1 - x0 + 92, 72, { radius: 16, style: 'dark' });
    const g = this.state === 'caught' ? 0 : this.holeState === 'hidden' && this.state === 'run' ? null : clamp(this.gap / 820, 0, 1);
    ctx.fillStyle = 'rgba(255,246,229,0.15)'; rr(ctx, x0, y - 6, x1 - x0, 12, 6); ctx.fill();
    ctx.fillStyle = 'rgba(127,216,166,0.45)'; rr(ctx, x0, y - 6, (x1 - x0) * (CATCH_GAP / 820) + 14, 12, 6); ctx.fill();
    if (g != null) {
      const mxp = x0 + (x1 - x0) * g;
      ctx.fillStyle = g < 0.3 ? PALETTE.mint : g < 0.65 ? PALETTE.sun : PALETTE.danger;
      rr(ctx, x0, y - 6, Math.max(12, mxp - x0), 12, 6); ctx.fill();
      ctx.save(); ctx.translate(mxp, y + 2); drawMouse(ctx, 0, 0, { scale: 0.34, t: this.t, pose: 'peek' }); ctx.restore();
    } else text(ctx, '?', (x0 + x1) / 2, y + 1, { align: 'center', baseline: 'middle', font: BOLD(22), color: PALETTE.sun });
    if (typeof Sprites.drawPortrait === 'function') Sprites.drawPortrait(ctx, this.game, this.hero, x0 - 22, y, 16);
    text(ctx, 'GAP', x1 + 26, y + 1, { align: 'center', baseline: 'middle', font: BOLD(12), color: PALETTE.paper });
    // the thief's run to the pantry hole
    const f = this.mprog, py = y + 26;
    ctx.fillStyle = 'rgba(255,246,229,0.15)'; rr(ctx, x0, py - 3, x1 - x0, 6, 3); ctx.fill();
    ctx.fillStyle = f > 0.8 ? PALETTE.danger : 'rgba(255,246,229,0.6)'; rr(ctx, x0, py - 3, Math.max(6, (x1 - x0) * f), 6, 3); ctx.fill();
    text(ctx, 'pantry', x1 + 26, py, { align: 'center', baseline: 'middle', font: BOLD(11), color: f > 0.8 ? PALETTE.danger : 'rgba(255,246,229,0.7)' });
    // sprint stamina by the hero's feet
    if (this.state === 'run' || this.state === 'go') {
      const sx = HERO_X - 40, sy = GROUND + 30;
      ctx.fillStyle = 'rgba(16,19,31,0.5)'; rr(ctx, sx, sy, 80, 10, 5); ctx.fill();
      ctx.fillStyle = this.stamina > 0.3 ? PALETTE.sun : PALETTE.danger; rr(ctx, sx, sy, Math.max(10, 80 * this.stamina), 10, 5); ctx.fill();
      text(ctx, 'sprint →', HERO_X, sy + 26, { align: 'center', font: BOLD(12), color: 'rgba(255,246,229,0.8)' });
    }
  }

  drawOverlays(ctx) {
    const s = this.st;
    if (this.state === 'go') {
      const k = ease(s / 0.25);
      ctx.save(); ctx.translate(480, 200); ctx.scale(0.5 + 0.5 * k, 0.5 + 0.5 * k); ctx.globalAlpha = clamp((1.1 - s) / 0.3, 0, 1);
      text(ctx, this.retry ? 'AGAIN! GO!' : 'CHASE IT!', 0, 0, { align: 'center', baseline: 'middle', font: BOLD(64), color: PALETTE.sun, outline: PALETTE.choc });
      ctx.restore();
    }
    // controls card, the first time only
    const showCtl = !this.tutorialDone && (this.state === 'go' || (this.state === 'run' && this.runT < 4.5));
    if (showCtl) {
      const a = this.state === 'go' ? clamp(s / 0.3, 0, 1) : clamp((4.5 - this.runT) / 0.5, 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      panel(ctx, 250, 108, 460, 58, { radius: 18, style: 'paper' });
      const items = [['Space / ↑', 'jump'], ['↓', 'slide'], ['→', 'sprint']];
      items.forEach(([k, v], i) => {
        const cx = 330 + i * 150;
        ctx.font = BOLD(15); const w = ctx.measureText(k).width + 18;
        ctx.fillStyle = PALETTE.ink; rr(ctx, cx - w / 2 - 20, 124, w, 26, 7); ctx.fill();
        text(ctx, k, cx - 20, 138, { align: 'center', baseline: 'middle', font: BOLD(15), color: PALETTE.paper, shadow: false });
        text(ctx, v, cx - 20 + w / 2 + 6, 138, { baseline: 'middle', font: BOLD(15), color: PALETTE.choc, shadow: false });
      });
      ctx.restore();
    }
    if (this.state === 'run' && this.runT > 4.5) this.tutorialDone = true;
    if (this.state === 'escaped') {
      prompt(ctx, 'It got away with the loaf!', 200, { font: BOLD(26), fill: '#ffe1dc', stroke: PALETTE.danger });
    }
    if (this.state === 'again') {
      const k = ease(s / 0.3);
      ctx.save(); ctx.fillStyle = `rgba(16,19,31,${0.35 * k})`; ctx.fillRect(0, 0, 960, 540);
      ctx.translate(480, 230); ctx.rotate(-0.06); ctx.scale(0.4 + 0.6 * k, 0.4 + 0.6 * k);
      text(ctx, 'Again!', 0, 0, { align: 'center', baseline: 'middle', font: BOLD(80), color: PALETTE.sun, outline: PALETTE.choc });
      ctx.restore();
      text(ctx, 'It is getting tired. You are faster now.', 480, 310, { align: 'center', font: BOLD(20), color: PALETTE.paper, alpha: k });
    }
    if (this.state === 'caught' && s > 1.15 && !this.done) {
      const k = ease((s - 1.15) / 0.3);
      ctx.save(); ctx.translate(480, 170); ctx.scale(0.5 + 0.5 * k, 0.5 + 0.5 * k); ctx.globalAlpha = k;
      text(ctx, 'Bread rescued!', 0, 0, { align: 'center', baseline: 'middle', font: BOLD(54), color: PALETTE.sun, outline: PALETTE.choc });
      ctx.restore();
      ctx.fillStyle = PALETTE.sun; for (let i = 0; i < 3; i++) star(ctx, 380 + i * 100, 230 + Math.sin(this.t * 5 + i) * 6, 12, this.t * 2 + i);
    }
  }
}

// ---------------------------------------------------------------- obstacle art (origin = floor point)
function drawObstacle(c, o, t) {
  const k = o.kind;
  c.lineJoin = 'round';
  if (k === 'crumbs') {
    c.fillStyle = 'rgba(16,19,31,0.25)'; c.beginPath(); c.ellipse(0, 0, 32, 6, 0, 0, TAU); c.fill();
    const cols = ['#e0b268', '#c98f45', '#f0d39a'];
    for (let i = 0; i < 16; i++) { const a = hash(i) * Math.PI, r = 4 + hash(i + 9) * 6; c.fillStyle = cols[i % 3]; c.beginPath(); c.arc(Math.cos(a) * 24 * hash(i + 3), -r - Math.sin(a) * 14 * hash(i + 5), r, 0, TAU); c.fill(); }
    c.strokeStyle = '#8a5a2a'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, -10, 14, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  } else if (k === 'pot') {
    c.fillStyle = 'rgba(16,19,31,0.25)'; c.beginPath(); c.ellipse(0, 0, 30, 6, 0, 0, TAU); c.fill();
    c.fillStyle = '#c47a4a'; c.strokeStyle = '#7a3e1e'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(-24, 0); c.lineTo(-20, -38); c.lineTo(20, -38); c.lineTo(24, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e09a6a'; c.fillRect(-18, -34, 6, 30);
    c.fillStyle = '#3a3f4a'; c.fillRect(24, -26, 22, 6);
  } else if (k === 'shoes') {
    for (const dx of [-16, 14]) {
      c.fillStyle = '#f6f5f0'; c.strokeStyle = '#9aa0aa'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(dx - 14, 0); c.lineTo(dx - 14, -20); c.quadraticCurveTo(dx - 4, -30, dx + 2, -18); c.quadraticCurveTo(dx + 18, -14, dx + 18, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = PALETTE.denim; c.fillRect(dx - 12, -6, 28, 4);
    }
  } else if (k === 'books') {
    const cols = ['#a8483a', '#3f7a4a', '#5b7fa6', '#e0a245'];
    for (let i = 0; i < 4; i++) { c.fillStyle = cols[i]; c.strokeStyle = 'rgba(16,19,31,0.5)'; c.lineWidth = 1.5; const w = 48 - i * 4; c.save(); c.translate(0, -i * 11); c.rotate((hash(i + 2) - 0.5) * 0.12); rr(c, -w / 2, -11, w, 11, 2); c.fill(); c.stroke(); c.restore(); }
  } else if (k === 'cushion') {
    c.fillStyle = '#e08a7a'; c.strokeStyle = '#a14a3a'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(-32, -2); c.quadraticCurveTo(-36, -36, -26, -36); c.quadraticCurveTo(0, -30, 26, -36); c.quadraticCurveTo(36, -36, 32, -2); c.quadraticCurveTo(0, 4, -32, -2); c.fill(); c.stroke();
    c.fillStyle = '#a14a3a'; c.beginPath(); c.arc(0, -18, 3, 0, TAU); c.fill();
  } else if (k === 'chair') {
    const tb = o.tumble ?? 1;
    const ang = -Math.min(1, tb / 0.6) * Math.PI / 2 * 1.0;
    c.fillStyle = 'rgba(16,19,31,0.25)'; c.beginPath(); c.ellipse(0, 0, 46, 7, 0, 0, TAU); c.fill();
    c.save(); c.translate(30, 0); c.rotate(ang);
    c.fillStyle = '#b5835a'; c.strokeStyle = '#5e3b25'; c.lineWidth = 3;
    c.fillRect(-36, -50, 8, 50); c.strokeRect(-36, -50, 8, 50);       // back legs
    c.fillRect(-4, -50, 8, 50); c.strokeRect(-4, -50, 8, 50);         // front leg
    c.fillRect(-38, -58, 46, 10); c.strokeRect(-38, -58, 46, 10);     // seat
    c.fillRect(-38, -120, 8, 64); c.strokeRect(-38, -120, 8, 64);     // back post
    rr(c, -40, -122, 14, 40, 4); c.fill(); c.stroke();
    c.restore();
    if (tb < 0.8) { c.fillStyle = 'rgba(255,246,229,0.6)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-30 - i * 16, -20 - i * 6, 6 - i, 0, TAU); c.fill(); } }
  } else if (k === 'towel') {
    const b = KIND.towel.b;
    c.save(); c.translate(0, -b - 30); c.rotate(Math.sin(t * 9) * 0.25);
    c.fillStyle = '#f6efe2'; c.strokeStyle = '#a14a3a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-32, -24); c.quadraticCurveTo(0, -30 + Math.sin(t * 14) * 6, 32, -24); c.lineTo(30, 26); c.quadraticCurveTo(0, 20 + Math.sin(t * 14 + 1) * 6, -30, 26); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#d0584a'; c.fillRect(-30, -10, 60, 6); c.fillRect(-30, 8, 60, 6);
    c.restore();
    c.strokeStyle = 'rgba(255,246,229,0.5)'; c.lineWidth = 3; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(40 + i * 6, -b - 40 + i * 14); c.lineTo(70 + i * 10, -b - 40 + i * 14); c.stroke(); }
  } else if (k === 'pans' || k === 'line' || k === 'plant') {
    const b = KIND[k].b;
    c.strokeStyle = '#4a4f5a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -GROUND); c.lineTo(0, -b - 40); c.stroke();
    if (k === 'pans') {
      c.fillStyle = '#3a3f4a'; c.beginPath(); c.arc(0, -b - 22, 24, 0, TAU); c.fill();
      c.fillStyle = '#5a606c'; c.beginPath(); c.arc(0, -b - 22, 18, 0, TAU); c.fill();
      c.fillStyle = '#c47a4a'; c.fillRect(-20, -b - 2, 40, 4);
    } else if (k === 'line') {
      c.strokeStyle = '#e9dcc4'; c.lineWidth = 2; c.beginPath(); c.moveTo(-60, -b - 40); c.quadraticCurveTo(0, -b - 30, 60, -b - 40); c.stroke();
      const cols = ['#7fd8a6', '#f2a7a8', '#ffc94a'];
      for (let i = 0; i < 3; i++) { c.save(); c.translate(-36 + i * 36, -b - 36); c.rotate(Math.sin(t * 3 + i) * 0.12); c.fillStyle = cols[i]; rr(c, -8, 0, 16, 30, 4); c.fill(); rr(c, -8, 22, 22, 12, 5); c.fill(); c.restore(); }
    } else {
      c.fillStyle = '#c47a4a'; c.strokeStyle = '#7a3e1e'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-20, -b - 36); c.lineTo(20, -b - 36); c.lineTo(14, -b - 4); c.lineTo(-14, -b - 4); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = PALETTE.pine;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(-18 + i * 9, -b + 6 + (i % 2) * 10, 5, 12, (i - 2) * 0.3, 0, TAU); c.fill(); }
    }
    // a hazard shimmer so it reads as "go under"
    c.strokeStyle = 'rgba(127,216,166,0.5)'; c.setLineDash([6, 6]); c.lineWidth = 2;
    c.beginPath(); c.moveTo(-34, -b + 2); c.lineTo(34, -b + 2); c.stroke(); c.setLineDash([]);
  }
}
