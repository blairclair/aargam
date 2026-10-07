// Office minigame: BUG HUNT. Owned by: games-c. The first minigame the player ever sees, so it teaches itself:
// one friendly bug crawls in, a demo hand taps it, and the game only starts once the player squashes it.
// Code scrolls down Aaron's monitor into the compiler; click bugs before they reach the build line.
// Clicking clean code costs a second. Squash the quota before time runs out -> BUILD SUCCEEDED.
import { PALETTE, FONT } from '../core/theme.js';
import { finishMinigame } from '../core/flow.js';
import { text, panel } from '../ui/widgets.js';
import { Fx } from '../art/fx.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { bark } from '../story/lines.js';
import { Bust, Speech, Combo, star, clamp, lerp, rand, pick, rr, timeMul, drawHand, drawPulseRing, drawArrowDown, drawCheck, fmtTime } from './c/common.js';

const TAU = Math.PI * 2;
const MONO = '15px Menlo, Consolas, "Courier New", monospace';
const MONO_S = '13px Menlo, Consolas, "Courier New", monospace';
const BEZEL = { x: 190, y: 22, w: 580, h: 392 };
const SCREEN = { x: 210, y: 42, w: 540, h: 336 };
const CODE_TOP = SCREEN.y + 24;
const GUTTER = 40;
const LH = 22;
const BUILD_Y = SCREEN.y + SCREEN.h - 30; // bugs that cross this line get compiled
const DESK_Y = 448;

// PartyPlanner's source. Comments are its jokes.
const SOURCE = `# party_planner.py  v1.0-final-FINAL-v2
import vibes
from kitchen import bread, more_bread

def init():
    house.lights = "cozy"
    party.start_time = "19:00"
    # TODO: do not become sentient
    return True  # what could go wrong

def make_snacks():
    while snacks < float("inf"):
        snacks += 1  # balanced diet
    sourdough.alive = False  # please

def clean_up():
    for bunny in dust_bunnies:
        bunny.adopt()  # wait, no
    roomba.mode = "gentle"

def set_table():
    plates.throw = False
    chairs.charge = False  # they are chairs

def fix_everything():
    assert house.wifi.works()  # it never works
    victoria.fixes_everything = True  # always has
    return "fixed (probably)"

def decorate():
    lights.string(everywhere=True)
    gnomes.march = False  # stop marching

def main():
    try:
        party.run()
    except Chaos:
        call(victoria)
    return "party time"
`.split('\n');

const KW = new Set(['def', 'if', 'while', 'return', 'import', 'from', 'raise', 'for', 'in', 'is', 'not', 'None', 'True', 'False', 'assert', 'else', 'try', 'except', 'and', 'or']);
const COL = { kw: '#ff8fb1', str: PALETTE.mint, com: '#8a93a8', num: '#f2c26b', fn: '#7cc4ff', id: '#e9e3d6', op: '#c9a0dc' };

function tokenize(line) {
  const out = [];
  const re = /(#.*$)|("[^"]*"|'[^']*')|(\d[\d_.]*)|([A-Za-z_]\w*)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(line))) {
    if (m[1]) out.push([m[1], COL.com]);
    else if (m[2]) out.push([m[2], COL.str]);
    else if (m[3]) out.push([m[3], COL.num]);
    else if (m[4]) out.push([m[4], KW.has(m[4]) ? COL.kw : line[re.lastIndex] === '(' ? COL.fn : COL.id]);
    else if (m[5]) out.push([m[5], null]);
    else out.push([m[6], COL.op]);
  }
  return out;
}
const TOKENS = SOURCE.map(tokenize);

const SQUASH_WORDS = ['squashed!', 'fixed!', 'patched!', '-1 bug', 'git commit!', 'nice!'];
const BUG_KINDS = {
  beetle: { r: 16, hp: 1, speed: 30, color: '#e0564a', spot: '#3a1d1d' },
  fly: { r: 14, hp: 1, speed: 48, color: '#9b7fd6', spot: '#2c2140' },
  tank: { r: 20, hp: 2, speed: 22, color: '#5fae6e', spot: '#1f4a2a' },
  gold: { r: 15, hp: 1, speed: 0, color: '#ffd34a', spot: '#a87a10' },
  boss: { r: 42, hp: 9, speed: 12, color: '#b33a4a', spot: '#2a0f14' },
};

export default class Minigame {
  constructor(game) { this.game = game; }

  enter(p) {
    this.p = p;
    const extra = Math.max(0, (p.attempt || 1) - 1);
    this.quota = Math.max(12, 20 - extra * 4);
    this.speedMul = Math.max(0.7, 1 - extra * 0.15);
    this.timeTotal = (70 + extra * 10) * timeMul(p);
    this.timeLeft = this.timeTotal;
    this.phase = 'intro'; // intro -> play -> win|fail
    this.t = 0; this.phaseT = 0; this.playT = 0;
    this.squashed = 0; this.escaped = 0; this.misses = 0;
    this.bugs = []; this.spawnT = 1.2;
    this.fx = new Fx();
    this.bust = new Bust(p.hero);
    this.speech = new Speech();
    this.combo = new Combo(1.6);
    this.bossSpawned = false; this.bossBanner = 0; this.alarm = 0;
    this.goldT = rand(13, 17);
    this.buildFlash = 0; this.missFlash = 0;
    this.done = false;
    this._boomed = false;
    this.endLines = [];
    // code rows flowing down the screen
    this.rows = [];
    // code flows DOWN, so build from the bottom up taking lines in reverse: it still reads top-to-bottom
    this.nextLine = SOURCE.length - 1;
    for (let y = BUILD_Y + LH; y > CODE_TOP - LH; y -= LH) this.rows.unshift({ y, i: this._takeLine() });
    // the friendly tutorial bug
    this.bugs.push(this._makeBug('beetle', SCREEN.x + SCREEN.w / 2, CODE_TOP + 6, { tutorial: true }));
    playMusic('minigame');
  }

  exit() {}

  _say(event) { this.speech.say(bark('office', event, { hero: this.p.hero })); }

  _takeLine() { const i = this.nextLine; this.nextLine = (this.nextLine - 1 + SOURCE.length) % SOURCE.length; return i; }

  _makeBug(kind, x, y, o = {}) {
    const k = BUG_KINDS[kind];
    return { kind, x, y, r: k.r, hp: k.hp, maxHp: k.hp, vy: k.speed, vx: 0, t: rand(0, 10), wob: rand(0.8, 1.6), dir: Math.random() < 0.5 ? -1 : 1, hit: 0, kb: 0, hatch: 2.4, ...o };
  }

  _difficulty() {
    const e = this.playT;
    const boss = this.bugs.some((b) => b.kind === 'boss');
    return {
      interval: lerp(2.3, 0.75, clamp(e / 45, 0, 1)) / this.speedMul * (boss ? 1.7 : 1),
      speed: lerp(1, 2.1, clamp(e / 55, 0, 1)) * this.speedMul,
      maxBugs: Math.round(lerp(3, 8, clamp(e / 40, 0, 1))),
    };
  }

  _spawn() {
    const e = this.playT;
    let kind = 'beetle';
    const r = Math.random();
    if (e > 18 && r < 0.2) kind = 'tank';
    else if (e > 8 && r < 0.45) kind = 'fly';
    const x = rand(SCREEN.x + GUTTER + 24, SCREEN.x + SCREEN.w - 24);
    this.bugs.push(this._makeBug(kind, x, CODE_TOP - 10));
  }

  _spawnBoss() {
    this.bossSpawned = true;
    this.bossBanner = 2.8; this.alarm = 1;
    this.bugs.push(this._makeBug('boss', SCREEN.x + SCREEN.w / 2 + 20, CODE_TOP - 30, { hatch: 2.6 }));
    playSfx('shout'); playSfx('error');
    this.fx.addShake(10);
    this.bust.react('bad');
  }

  _spawnGold() {
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? SCREEN.x + GUTTER - 10 : SCREEN.x + SCREEN.w + 10;
    this.bugs.push(this._makeBug('gold', x, rand(CODE_TOP + 40, BUILD_Y - 120), { vx: (fromLeft ? 1 : -1) * 190 }));
    playSfx('blip');
  }

  update(dt) {
    this.t += dt; this.phaseT += dt;
    this.fx.update(dt); this.bust.update(dt); this.speech.update(dt); this.combo.update(dt);
    this.buildFlash = Math.max(0, this.buildFlash - dt * 2);
    this.missFlash = Math.max(0, this.missFlash - dt * 3);
    this.bossBanner = Math.max(0, this.bossBanner - dt);
    this.alarm = Math.max(0, this.alarm - dt * 0.4);
    const m = this.game.input.mouse;

    if (this.phase === 'win' || this.phase === 'fail') { this._updateEnd(dt, m); return; }

    const diff = this._difficulty();
    const playing = this.phase === 'play';
    // scroll code down into the compiler
    const scroll = (playing ? 16 * diff.speed : 10) * dt;
    for (const row of this.rows) row.y += scroll;
    this.rows = this.rows.filter((r) => r.y < SCREEN.y + SCREEN.h + LH);
    while (this.rows[0].y > CODE_TOP - LH + 2) this.rows.unshift({ y: this.rows[0].y - LH, i: this._takeLine(), born: this.t });

    // bugs crawl
    const born = [];
    for (const b of this.bugs) {
      b.t += dt; b.hit = Math.max(0, b.hit - dt * 4);
      if (b.tutorial) {
        const stopY = SCREEN.y + 140;
        b.y = Math.min(stopY, b.y + 34 * dt);
        b.x += Math.sin(b.t * 2) * 10 * dt;
        continue;
      }
      if (b.kind === 'gold') {
        b.x += b.vx * dt; b.y += Math.sin(b.t * 5) * 40 * dt;
        if (b.x < SCREEN.x - 30 || b.x > SCREEN.x + SCREEN.w + 30) b.dead = true; // got away, no penalty
        continue;
      }
      if (b.kind === 'boss') {
        b.kb = Math.max(0, b.kb - dt * 5);
        b.y += (b.vy * Math.min(diff.speed, 1.5) - b.kb * 90) * dt;
        b.y = Math.max(CODE_TOP - 30, b.y);
        b.x = SCREEN.x + SCREEN.w / 2 + 20 + Math.sin(b.t * 0.9) * 150;
        b.hatch -= dt;
        if (b.hatch <= 0 && b.y > CODE_TOP + 10) { b.hatch = 2.6; born.push(this._makeBug(Math.random() < 0.5 ? 'beetle' : 'fly', b.x + rand(-20, 20), b.y + 30)); this.fx.burst(b.x, b.y + 30, BUG_KINDS.boss.color, 6, 60); }
      } else {
        const zig = b.kind === 'fly' ? 70 : 22;
        b.y += b.vy * diff.speed * dt;
        b.x += Math.sin(b.t * 2.4 * b.wob) * zig * dt * b.dir * 1.6;
      }
      b.x = clamp(b.x, SCREEN.x + GUTTER + 14, SCREEN.x + SCREEN.w - 14);
      if (b.y >= BUILD_Y) { b.dead = true; this._escaped(b); }
    }
    this.bugs.push(...born);

    if (playing) {
      this.playT += dt;
      this.timeLeft -= dt;
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.bugs.length < diff.maxBugs) { this._spawn(); this.spawnT = diff.interval * rand(0.75, 1.25); }
      if (!this.bossSpawned && this.squashed >= Math.floor(this.quota * 0.45)) this._spawnBoss();
      if (this.playT > 10) { this.goldT -= dt; if (this.goldT <= 0) { this._spawnGold(); this.goldT = rand(11, 16); } }
      if (this.phaseT > 2.2 && !this._saidStart) { this._saidStart = true; this._say('minigame'); }
      if (this.timeLeft <= 0) { this.timeLeft = 0; this._end(false); }
    }

    if (m.pressed) this._click(m.x, m.y);
    this.bugs = this.bugs.filter((b) => !b.dead);
  }

  _click(x, y) {
    if (x < SCREEN.x || x > SCREEN.x + SCREEN.w || y < SCREEN.y || y > SCREEN.y + SCREEN.h) return;
    let best = null, bd = Infinity;
    for (const b of this.bugs) {
      const d = Math.hypot(b.x - x, b.y - y) - b.r;
      if (d < 14 && d < bd) { best = b; bd = d; }
    }
    if (best) { this._hitBug(best, x, y); return; }
    if (this.phase !== 'play') { this.fx.floatText(x, y - 10, 'try the bug!', PALETTE.sun); return; }
    // clicked clean code
    this.misses++;
    this.timeLeft = Math.max(0, this.timeLeft - 1);
    this.missFlash = 1;
    this._breakCombo(x, y + 30);
    playSfx('error');
    this.fx.floatText(x, y - 8, '-1s', PALETTE.danger, { size: 18 });
    this.fx.floatText(x, y + 14, pick(['that was fine code!', 'SyntaxError', 'not a bug']), '#ffb3b3', { size: 12 });
    this.fx.addShake(2);
  }

  _breakCombo(x, y) {
    if (this.combo.break() >= 3) this.fx.floatText(x, y, 'combo lost', '#ffb3b3', { size: 13 });
  }

  _bonus(sec, x, y, label) {
    this.timeLeft = Math.min(this.timeTotal, this.timeLeft + sec);
    this.fx.floatText(x, y, `${label} +${sec}s`, PALETTE.sun, { size: 18 });
  }

  _hitBug(b, cx, cy) {
    b.hp--; b.hit = 1;
    if (!b.tutorial) {
      const n = this.combo.hit();
      if (n % 5 === 0) { this._bonus(2, SCREEN.x + SCREEN.w - 90, SCREEN.y + 84, `x${n} combo`); playSfx('star'); }
    }
    if (b.kind === 'boss' && b.hp > 0) {
      b.kb = 1;
      playSfx('hit');
      this.fx.burst(cx, cy, PALETTE.sun, 8, 140);
      this.fx.floatText(cx, cy - 20, pick(['bonk!', 'thwack!', 'patch!', 'refactor!']), PALETTE.paper);
      this.fx.addShake(3);
      return;
    }
    if (b.hp > 0) { playSfx('boing'); this.fx.burst(b.x, b.y, BUG_KINDS[b.kind].color, 6, 80); this.fx.floatText(b.x, b.y - 18, 'crack!', PALETTE.paper); return; }
    b.dead = true;
    playSfx('squish');
    this.fx.splat(b.x, b.y, PALETTE.mint, 8);
    this.fx.burst(b.x, b.y, BUG_KINDS[b.kind].color, 10, 140);
    this.fx.addShake(2);
    this.bust.react('good');
    if (b.tutorial) {
      this.phase = 'play'; this.phaseT = 0;
      this.fx.floatText(b.x, b.y - 44, 'You got it!', PALETTE.sun, { big: true });
      this.fx.sparkle(b.x, b.y, PALETTE.sun, 12, 26);
      playSfx('star');
      return;
    }
    if (b.kind === 'boss') {
      this.squashed += 3;
      this.alarm = 0; this.bossBanner = 0;
      this.fx.thaw(b.x, b.y, 70);
      this.fx.confetti(b.x, b.y, 30);
      this.fx.floatText(b.x, b.y - 50, 'SEGFAULT FIXED!', PALETTE.sun, { big: true });
      this._bonus(5, b.x, b.y - 20, 'boss');
      this.fx.addShake(9);
      this.bust.react('cheer');
      playSfx('star'); playSfx('victory');
      this._say('hit');
    } else if (b.kind === 'gold') {
      this.squashed += 2;
      this.fx.sparkle(b.x, b.y, PALETTE.sun, 16, 30);
      this._bonus(3, b.x, b.y - 22, 'golden bug!');
      playSfx('star');
      this.bust.react('cheer');
    } else {
      this.squashed++;
      this.fx.floatText(b.x, b.y - 20, pick(SQUASH_WORDS), PALETTE.mint);
    }
    if (this.squashed >= this.quota) this._end(true);
  }

  _escaped(b) {
    const boss = b.kind === 'boss';
    const cost = boss ? 10 : 4;
    this.escaped += boss ? 3 : 1;
    this.timeLeft = Math.max(0, this.timeLeft - cost);
    this.buildFlash = 1;
    this._breakCombo(b.x, BUILD_Y - 44);
    playSfx('error');
    this.fx.burst(b.x, BUILD_Y, PALETTE.danger, boss ? 30 : 12, 120);
    this.fx.floatText(b.x, BUILD_Y - 22, `${boss ? 'SEGFAULT compiled!' : 'bug compiled!'} -${cost}s`, PALETTE.danger, { size: 16 });
    this.fx.addShake(boss ? 12 : 6);
    this.bust.react('bad');
    if (boss) this.alarm = 0;
  }

  _end(win) {
    if (this.phase === 'win' || this.phase === 'fail') return;
    this.phase = win ? 'win' : 'fail'; this.phaseT = 0;
    for (const b of this.bugs) { this.fx.burst(b.x, b.y, win ? PALETTE.mint : BUG_KINDS[b.kind].color, 8, 100); }
    if (win) this.bugs = [];
    if (win) {
      const timeFrac = clamp(this.timeLeft / (this.timeTotal * 0.5), 0, 1);
      const clean = 1 - clamp(this.escaped / 6, 0, 1);
      const acc = this.squashed / (this.squashed + this.misses);
      const combo = clamp(this.combo.best / 8, 0, 1);
      this.score = clamp(0.35 * timeFrac + 0.3 * clean + 0.2 * acc + 0.15 * combo, 0.1, 1);
      this._say('minigameWin');
      this.endLines = ['$ python party_planner.py --build', `  ${Math.min(this.squashed, this.quota)} bugs fixed. ${this.escaped} snuck in. best combo x${this.combo.best}`, '  1 warning: party may be too fun'];
      playSfx('victory');
      this.bust.react('cheer');
    } else {
      this.score = 0;
      this.endLines = ['$ python party_planner.py --build', `  Error: ${Math.max(0, this.quota - this.squashed)} bugs still loose`, '  Retrying build...'];
      playSfx('defeat');
      this._say('minigameFail');
      this.bust.react('bad');
    }
  }

  _updateEnd(dt, m) {
    const T = this.phaseT;
    if (this.phase === 'win' && !this._boomed && T > 1.1) {
      this._boomed = true;
      playSfx('star');
      this.fx.confetti(SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h / 2 + 40, 60);
      this.fx.ringPulse(SCREEN.x + SCREEN.w / 2, SCREEN.y + 200, PALETTE.mint, 200, 0.7);
    }
    const canSkip = T > 2.2;
    if ((canSkip && m.pressed) || T > 4.6) this._finish();
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    const win = this.phase === 'win';
    finishMinigame(this.game, { roomId: this.p.roomId, success: win, score: win ? this.score : 0, attempt: this.p.attempt });
  }

  // ------------------------------------------------------------------ render
  render(ctx) {
    const g = this.game;
    const sh = this.fx.shakeOffset();
    ctx.save();
    ctx.translate(sh.x, sh.y);
    this._drawRoom(ctx);
    this.bust.render(ctx, g, 8, DESK_Y + 6, 250);
    this._drawMonitor(ctx);
    this._drawScreen(ctx);
    this._drawDesk(ctx);
    this._drawSticky(ctx);
    this._drawOverlay(ctx);
    this.fx.render(ctx);
    if (this.phase === 'play') this.combo.render(ctx, SCREEN.x + SCREEN.w - 90, SCREEN.y + 52);
    this.speech.render(ctx, 120, 196, 250);
    ctx.restore();
    // boss alarm: pulsing red vignette
    if (this.alarm > 0) {
      const a = this.alarm * (0.5 + 0.5 * Math.sin(this.t * 10));
      const v = ctx.createRadialGradient(480, 270, 200, 480, 270, 560);
      v.addColorStop(0, 'rgba(255,60,60,0)'); v.addColorStop(1, `rgba(255,60,60,${0.45 * a})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, g.width, g.height);
    }
  }

  _drawRoom(ctx) {
    const g = this.game;
    const wall = ctx.createLinearGradient(0, 0, 0, DESK_Y);
    wall.addColorStop(0, '#3b2c3a'); wall.addColorStop(1, '#5a3f3a');
    ctx.fillStyle = wall; ctx.fillRect(-10, -10, g.width + 20, DESK_Y + 20);
    // wainscot stripes
    ctx.fillStyle = 'rgba(255,246,229,0.04)';
    for (let x = 0; x < g.width; x += 48) ctx.fillRect(x, 0, 24, DESK_Y);
    // warm lamp glow top-right
    const glow = ctx.createRadialGradient(880, 40, 10, 880, 40, 320);
    glow.addColorStop(0, 'rgba(255,201,74,0.35)'); glow.addColorStop(1, 'rgba(255,201,74,0)');
    ctx.fillStyle = glow; ctx.fillRect(500, -10, 470, 460);
    // crochet-hoop heart on the wall
    ctx.fillStyle = PALETTE.paper; ctx.beginPath(); ctx.arc(870, 300, 40, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c9a26b'; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = '#c9a26b'; ctx.fillRect(864, 254, 12, 8);
    ctx.fillStyle = '#e98aa8';
    ctx.beginPath(); ctx.moveTo(870, 318); ctx.bezierCurveTo(840, 298, 850, 276, 870, 290); ctx.bezierCurveTo(890, 276, 900, 298, 870, 318); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(870, 300, 37, 0, TAU); ctx.clip();
    ctx.strokeStyle = 'rgba(90,58,42,0.2)'; ctx.lineWidth = 1;
    for (let i = -36; i <= 36; i += 6) { ctx.beginPath(); ctx.moveTo(870 + i, 262); ctx.lineTo(870 + i, 338); ctx.stroke(); }
    ctx.restore();
    // plant on desk, right
    ctx.fillStyle = '#a8483a'; rr(ctx, 870, 392, 46, 56, 6); ctx.fill();
    ctx.fillStyle = PALETTE.pine;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.38 + Math.sin(this.t * 1.2 + i) * 0.04;
      ctx.beginPath(); ctx.ellipse(893 + Math.cos(a) * 24, 392 + Math.sin(a) * 30, 9, 22, a + Math.PI / 2, 0, TAU); ctx.fill();
    }
  }

  _drawMonitor(ctx) {
    // stand
    ctx.fillStyle = '#2b2f3a';
    ctx.beginPath(); ctx.moveTo(450, BEZEL.y + BEZEL.h - 4); ctx.lineTo(510, BEZEL.y + BEZEL.h - 4); ctx.lineTo(530, DESK_Y + 4); ctx.lineTo(430, DESK_Y + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1f222b'; rr(ctx, 400, DESK_Y - 4, 160, 12, 5); ctx.fill();
    // bezel
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, BEZEL.x + 4, BEZEL.y + 8, BEZEL.w, BEZEL.h, 16); ctx.fill();
    const bz = ctx.createLinearGradient(0, BEZEL.y, 0, BEZEL.y + BEZEL.h);
    bz.addColorStop(0, '#3a3f4d'); bz.addColorStop(1, '#22252f');
    ctx.fillStyle = bz; rr(ctx, BEZEL.x, BEZEL.y, BEZEL.w, BEZEL.h, 16); ctx.fill();
    // power led
    ctx.fillStyle = this.phase === 'fail' ? PALETTE.danger : PALETTE.mint;
    ctx.beginPath(); ctx.arc(BEZEL.x + BEZEL.w - 22, BEZEL.y + BEZEL.h - 18, 3.5, 0, TAU); ctx.fill();
    // chin: bug progress bar
    const px = SCREEN.x + 10, py = SCREEN.y + SCREEN.h + 12, pw = SCREEN.w - 70;
    ctx.fillStyle = '#151824'; rr(ctx, px, py, pw, 14, 7); ctx.fill();
    const frac = this.phase === 'intro' ? 0 : clamp(this.squashed / this.quota, 0, 1);
    if (frac > 0) { ctx.fillStyle = PALETTE.mint; rr(ctx, px, py, Math.max(14, pw * frac), 14, 7); ctx.fill(); }
    text(ctx, `bugs fixed ${Math.min(this.squashed, this.quota)}/${this.quota}`, px + pw / 2, py + 11, { align: 'center', font: 'bold 11px "Trebuchet MS", sans-serif', color: PALETTE.paper });
  }

  _drawScreen(ctx) {
    const S = SCREEN;
    ctx.save();
    rr(ctx, S.x, S.y, S.w, S.h, 6); ctx.clip();
    ctx.fillStyle = '#161b2e'; ctx.fillRect(S.x, S.y, S.w, S.h);
    // gutter
    ctx.fillStyle = '#1d2339'; ctx.fillRect(S.x, S.y, GUTTER, S.h);
    // code
    ctx.textBaseline = 'middle';
    for (const row of this.rows) {
      const y = row.y + LH / 2;
      ctx.font = MONO_S; ctx.fillStyle = '#56607a'; ctx.textAlign = 'right';
      ctx.fillText(String(row.i + 1), S.x + GUTTER - 8, y);
      ctx.textAlign = 'left'; ctx.font = MONO;
      let x = S.x + GUTTER + 10;
      for (const [str, col] of TOKENS[row.i]) {
        if (col) { ctx.fillStyle = col; ctx.fillText(str, x, y); }
        x += ctx.measureText(str).width;
      }
    }
    // miss flash
    if (this.missFlash > 0) { ctx.fillStyle = `rgba(255,93,93,${this.missFlash * 0.12})`; ctx.fillRect(S.x, S.y, S.w, S.h); }
    // build line (the compiler)
    const fl = this.buildFlash;
    ctx.fillStyle = '#12261f'; ctx.fillRect(S.x, BUILD_Y, S.w, S.y + S.h - BUILD_Y);
    ctx.fillStyle = fl > 0 ? `rgba(255,93,93,${0.25 + fl * 0.5})` : 'rgba(127,216,166,0.12)';
    ctx.fillRect(S.x, BUILD_Y, S.w, S.y + S.h - BUILD_Y);
    ctx.strokeStyle = fl > 0 ? PALETTE.danger : PALETTE.mint; ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]); ctx.lineDashOffset = -this.t * 30;
    ctx.beginPath(); ctx.moveTo(S.x, BUILD_Y); ctx.lineTo(S.x + S.w, BUILD_Y); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, '▼ COMPILER ▼  bugs that reach here get built in', S.x + S.w / 2, BUILD_Y + 19, { align: 'center', font: 'bold 12px Menlo, Consolas, monospace', color: fl > 0 ? '#ffd0d0' : PALETTE.mint, shadow: false });
    // bugs
    for (const b of this.bugs) this._drawBug(ctx, b);
    // title bar + timer strip
    ctx.fillStyle = '#262c45'; ctx.fillRect(S.x, S.y, S.w, 22);
    for (const [i, c] of ['#ff5f57', '#febc2e', '#28c840'].entries()) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(S.x + 14 + i * 16, S.y + 11, 5, 0, TAU); ctx.fill(); }
    text(ctx, 'party_planner.py — PartyPlanner.exe', S.x + S.w / 2, S.y + 15, { align: 'center', font: 'bold 12px "Trebuchet MS", sans-serif', color: '#c8cde0', shadow: false });
    if (this.phase !== 'intro') {
      const tf = clamp(this.timeLeft / this.timeTotal, 0, 1);
      ctx.fillStyle = tf < 0.25 ? PALETTE.danger : PALETTE.sun;
      ctx.fillRect(S.x, S.y + 20, S.w * tf, 3);
    }
    // scanline sheen
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let y = S.y; y < S.y + S.h; y += 4) ctx.fillRect(S.x, y, S.w, 1);
    ctx.restore();
  }

  _drawBug(ctx, b) {
    const k = BUG_KINDS[b.kind];
    const r = b.r * (1 + b.hit * 0.25);
    const ang = b.kind === 'gold' ? (b.vx > 0 ? -Math.PI / 2 : Math.PI / 2)
      : b.kind === 'boss' ? Math.sin(b.t * 0.9) * 0.25
      : Math.atan2(1, Math.cos(b.t * 2.4 * b.wob) * 0.6 * b.dir) - Math.PI / 2;
    ctx.save();
    ctx.translate(b.x, b.y);
    // warm halo so bugs pop off the busy code
    const halo = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.4);
    halo.addColorStop(0, b.kind === 'boss' ? 'rgba(255,93,93,0.45)' : b.kind === 'gold' ? 'rgba(255,230,120,0.8)' : 'rgba(255,201,74,0.38)'); halo.addColorStop(1, 'rgba(255,201,74,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, TAU); ctx.fill();
    // soft shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(2, 4, r, r * 0.8, 0, 0, TAU); ctx.fill();
    ctx.rotate(ang);
    // legs (scuttle)
    ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const sw = Math.sin(b.t * 18 + i * 2) * 4;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * r * 0.6, i * r * 0.45); ctx.lineTo(s * (r + 6), i * r * 0.55 + sw * s); ctx.stroke();
      }
    }
    // wings for flies
    if (b.kind === 'fly') {
      ctx.fillStyle = 'rgba(220,235,255,0.55)';
      const f = Math.sin(b.t * 40) * 0.5;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 0.9, -r * 0.2, r * 0.9, r * 0.45, s * (0.5 + f), 0, TAU); ctx.fill(); }
    }
    // body
    ctx.fillStyle = k.color;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 2; ctx.stroke();
    // shell line + spots
    ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.lineTo(0, r); ctx.stroke();
    ctx.fillStyle = k.spot;
    for (const [sx, sy] of [[-0.4, 0], [0.4, 0.1], [-0.3, 0.55], [0.35, 0.6]]) { ctx.beginPath(); ctx.arc(sx * r, sy * r, r * 0.14, 0, TAU); ctx.fill(); }
    if (b.kind === 'tank' && b.hp < b.maxHp) { ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.2); ctx.lineTo(-r * 0.1, r * 0.2); ctx.lineTo(-r * 0.3, r * 0.5); ctx.stroke(); }
    // head + eyes (head points down = direction of travel)
    ctx.fillStyle = '#1a1420'; ctx.beginPath(); ctx.arc(0, r * 0.95, r * 0.45, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.2, r * 1.05, r * 0.16, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#000';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.2, r * 1.1, r * 0.08, 0, TAU); ctx.fill(); }
    if (b.kind === 'boss') {
      // angry brows (it's a very rude bug)
      ctx.strokeStyle = '#ffd0d0'; ctx.lineWidth = 3;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.08, r * 0.92); ctx.lineTo(s * r * 0.36, r * 0.82); ctx.stroke(); }
    }
    if (b.kind === 'gold') { ctx.fillStyle = '#fff'; star(ctx, -r * 0.3, -r * 0.3, 3 + Math.sin(b.t * 9) * 1.5); }
    // antennae
    ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 1.5;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.15, r * 1.3); ctx.quadraticCurveTo(s * r * 0.5, r * 1.8, s * r * 0.7, r * 1.7 + Math.sin(b.t * 6) * 2); ctx.stroke(); }
    ctx.restore();
  }

  _drawDesk(ctx) {
    const g = this.game;
    const dg = ctx.createLinearGradient(0, DESK_Y, 0, g.height);
    dg.addColorStop(0, '#9a6a44'); dg.addColorStop(1, '#6e4a30');
    ctx.fillStyle = dg; ctx.fillRect(-10, DESK_Y, g.width + 20, g.height - DESK_Y + 10);
    ctx.fillStyle = '#b8845a'; ctx.fillRect(-10, DESK_Y, g.width + 20, 6);
    ctx.strokeStyle = 'rgba(60,35,20,0.25)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, DESK_Y + 22 + i * 20); ctx.bezierCurveTo(300, DESK_Y + 16 + i * 20, 600, DESK_Y + 30 + i * 20, 960, DESK_Y + 20 + i * 20); ctx.stroke(); }
    // keyboard
    ctx.fillStyle = '#2b2f3a'; rr(ctx, 330, DESK_Y + 22, 300, 52, 8); ctx.fill();
    ctx.fillStyle = '#d8d2c4';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 14; c++) { rr(ctx, 340 + c * 20.5, DESK_Y + 29 + r * 14, 17, 11, 2); ctx.fill(); }
    // mug of coffee
    ctx.fillStyle = PALETTE.paper; rr(ctx, 690, DESK_Y + 18, 40, 46, 6); ctx.fill();
    ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(732, DESK_Y + 40, 11, -1.2, 1.2); ctx.stroke();
    ctx.fillStyle = PALETTE.choc; ctx.beginPath(); ctx.ellipse(710, DESK_Y + 21, 17, 4, 0, 0, TAU); ctx.fill();
    text(ctx, '</>', 710, DESK_Y + 48, { align: 'center', font: 'bold 13px Menlo, monospace', color: PALETTE.brick, shadow: false });
    ctx.strokeStyle = 'rgba(255,246,229,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) { const o = Math.sin(this.t * 2 + i * 2) * 4; ctx.beginPath(); ctx.moveTo(702 + i * 14, DESK_Y + 10); ctx.quadraticCurveTo(696 + i * 14 + o, DESK_Y - 4, 704 + i * 14, DESK_Y - 16); ctx.stroke(); }
  }

  _drawSticky(ctx) {
    // sticky note with the clock, stuck to the wall right of the monitor
    const x = 800, y = 70, w = 140, h = 150;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.rotate(0.04);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-w / 2 + 4, -h / 2 + 6, w, h);
    ctx.fillStyle = '#ffe680'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-w / 2, -h / 2, w, 18);
    text(ctx, 'BUILD IN', 0, -h / 2 + 40, { align: 'center', font: 'bold 16px "Trebuchet MS", sans-serif', color: PALETTE.choc, shadow: false });
    const low = this.phase === 'play' && this.timeLeft < 10;
    const pulse = low ? 1 + Math.abs(Math.sin(this.t * 6)) * 0.12 : 1;
    ctx.save(); ctx.scale(pulse, pulse);
    text(ctx, fmtTime(this.timeLeft), 0, 12, { align: 'center', font: FONT.big, color: low ? PALETTE.brick : PALETTE.ink, shadow: false });
    ctx.restore();
    const bugsLeft = Math.max(0, this.quota - this.squashed);
    text(ctx, this.phase === 'intro' ? 'starts after' : `${bugsLeft} bugs to go`, 0, 46, { align: 'center', font: 'bold 14px "Trebuchet MS", sans-serif', color: PALETTE.choc, shadow: false });
    if (this.phase === 'intro') text(ctx, 'your first squash', 0, 63, { align: 'center', font: 'bold 13px "Trebuchet MS", sans-serif', color: PALETTE.choc, shadow: false });
    ctx.restore();
  }

  _drawOverlay(ctx) {
    const S = SCREEN;
    const boss = this.bugs.find((q) => q.kind === 'boss');
    if (boss && this.phase === 'play') {
      const w = 110, x = boss.x - w / 2, y = Math.max(boss.y - boss.r - 26, CODE_TOP + 16);
      ctx.fillStyle = 'rgba(16,19,31,0.85)'; rr(ctx, x - 2, y - 2, w + 4, 12, 6); ctx.fill();
      ctx.fillStyle = PALETTE.danger; rr(ctx, x, y, w * boss.hp / boss.maxHp, 8, 4); ctx.fill();
      text(ctx, 'SEGFAULT', boss.x, y - 6, { align: 'center', font: 'bold 12px Menlo, Consolas, monospace', color: '#ffd0d0', outline: PALETTE.ink, outlineWidth: 3 });
    }
    if (this.bossBanner > 0) {
      const k = this.bossBanner, a = Math.min(1, k * 2), sc = k > 2.5 ? 1 + (k - 2.5) * 2 : 1;
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(S.x + S.w / 2, S.y + S.h / 2 + 30); ctx.scale(sc, sc);
      panel(ctx, -200, -36, 400, 72, { fill: '#4a1f22', stroke: PALETTE.danger, lineWidth: 3, radius: 14 });
      text(ctx, '⚠ CRITICAL BUG ⚠', 0, -4, { align: 'center', font: 'bold 28px "Trebuchet MS", sans-serif', color: '#ffd0d0' });
      text(ctx, 'Click it again and again!', 0, 22, { align: 'center', font: 'bold 15px "Trebuchet MS", sans-serif', color: PALETTE.paper });
      ctx.restore();
    }
    if (this.phase === 'intro') {
      const b = this.bugs.find((q) => q.tutorial);
      if (b) {
        drawPulseRing(ctx, b.x, b.y, 30, this.t);
        // demo hand: glide in, tap, hold, repeat
        const cyc = (this.phaseT % 2.2) / 2.2;
        const sx = b.x + 150, sy = b.y + 120;
        const k = clamp(cyc / 0.45, 0, 1), e = 1 - Math.pow(1 - k, 3);
        const hx = lerp(sx, b.x + 4, e), hy = lerp(sy, b.y + 4, e);
        const press = cyc > 0.5 && cyc < 0.68 ? Math.sin(((cyc - 0.5) / 0.18) * Math.PI) : 0;
        const alpha = cyc > 0.85 ? (1 - cyc) / 0.15 : Math.min(1, cyc / 0.1);
        drawHand(ctx, hx, hy, press, alpha);
      }
      panel(ctx, S.x + S.w / 2 - 150, S.y + 34, 300, 44, { style: 'paper', radius: 14 });
      text(ctx, 'Click the bugs!', S.x + S.w / 2, S.y + 65, { align: 'center', font: 'bold 26px "Trebuchet MS", sans-serif', color: PALETTE.ink, shadow: false });
    } else if (this.phase === 'play' && this.phaseT < 3.2) {
      const a = Math.min(1, (3.2 - this.phaseT) * 2);
      ctx.save(); ctx.globalAlpha = a;
      drawArrowDown(ctx, S.x + S.w / 2, BUILD_Y - 8, this.t, PALETTE.danger);
      panel(ctx, S.x + S.w / 2 - 170, BUILD_Y - 92, 340, 40, { style: 'paper', radius: 14 });
      text(ctx, "Don't let them reach the compiler!", S.x + S.w / 2, BUILD_Y - 66, { align: 'center', font: 'bold 18px "Trebuchet MS", sans-serif', color: PALETTE.ink, shadow: false });
      ctx.restore();
    } else if (this.phase === 'win' || this.phase === 'fail') {
      this._drawEnd(ctx);
    }
  }

  _drawEnd(ctx) {
    const S = SCREEN, T = this.phaseT, win = this.phase === 'win';
    ctx.save();
    rr(ctx, S.x, S.y, S.w, S.h, 6); ctx.clip();
    ctx.fillStyle = `rgba(10,12,22,${Math.min(0.88, T * 2)})`; ctx.fillRect(S.x, S.y, S.w, S.h);
    ctx.textBaseline = 'alphabetic';
    this.endLines.forEach((line, i) => {
      const start = 0.15 + i * 0.3;
      if (T < start) return;
      const n = Math.floor((T - start) * 60);
      text(ctx, line.slice(0, n) + (n < line.length && Math.sin(T * 20) > 0 ? '▌' : ''), S.x + 24, S.y + 60 + i * 24, { font: MONO, color: i === 0 ? PALETTE.paper : win ? '#bfe9c9' : '#ffb3b3', shadow: false });
    });
    if (T > 1.0) {
      const k = clamp((T - 1.0) / 0.25, 0, 1);
      const sc = k < 1 ? 0.6 + 0.5 * Math.sin(k * Math.PI * 0.75) : 1;
      ctx.save();
      ctx.translate(S.x + S.w / 2, S.y + 210); ctx.scale(sc, sc);
      panel(ctx, -220, -44, 440, 88, { fill: win ? '#1f4a33' : '#4a1f22', stroke: win ? PALETTE.mint : PALETTE.danger, lineWidth: 3, radius: 16 });
      if (win) drawCheck(ctx, -170, 0, 26);
      text(ctx, win ? 'BUILD SUCCEEDED' : 'BUILD FAILED', win ? 24 : 0, 13, { align: 'center', font: 'bold 34px Menlo, Consolas, monospace', color: win ? PALETTE.heal : '#ffb3b3' });
      ctx.restore();
    }
    if (T > 2.2) text(ctx, win ? 'click to continue' : 'one more try — click', S.x + S.w / 2, S.y + 300, { align: 'center', font: FONT.small, color: PALETTE.paper, alpha: 0.6 + 0.4 * Math.sin(T * 4) });
    ctx.restore();
  }
}
