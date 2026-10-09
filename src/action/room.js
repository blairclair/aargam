// Room action stage. Owned by: action team.
// enter(RoomParams) -> stage card -> play (objective always on screen) -> victory beat / defeat -> finishAction.
// One hero on the field; stats from game.state.party[hero]; favored hero +15% damage.
import { ROOMS, HEROES, SKILLS, PALETTE, FONT } from '../core/theme.js';
import { finishAction } from '../core/flow.js';
import { diff } from '../core/difficulty.js';
import { saveGame } from '../core/state.js';
import { clamp, lerp } from '../core/math.js';
import * as Sprites from '../art/sprites.js';
import { Fx } from '../art/fx.js';
import * as HUD from '../ui/hud.js';
import { panel, text, button, bar, ring, keycap, wrapText, chip } from '../ui/widgets.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { bark } from '../story/lines.js';
import { buildArena } from './arena.js';
import { createHero, updateHero, heroDrawOpts, SLOT_KEYS } from './heroes.js';
import { SKILL_DEF, updateBoundary, beatPhase } from './skills.js';
import { createEnemy, updateEnemies, enemyDrawOpts } from './enemies.js';
import { updateShots, updateWaves, updateTelegraphs, updateZones, updatePickups, killEnemy } from './combat.js';
import { STAGES, scaling } from './stages.js';
import { createGoo, updateGoo, drawGooFloor, drawGooAir } from './goo.js';
import {
  drawRoomFallback, drawFurnitureFallback, drawEnemyFallback, drawShotFallback, drawTelegraph, drawWave, drawZone,
  drawBoundary, drawLaser, drawHose, drawVfx, drawHeart, drawBeatRing, drawMark,
} from './draw.js';

const W = 960, H = 540;
const INTRO = 2.4;      // stage card length (hero can already move)
const WIN_BEAT = 2.8;   // victory beat before handing off
const LOSE_BEAT = 2.4;
// the room's headline threat: its first appearance triggers the 'boss' bark
const HEADLINER = { cable_spider: 1, kettle: 1, roomba: 1, chair: 1, jack_box: 1, sock_monster: 1, pipe_snake: 1, grill_dragon: 1, partyplanner: 1 };

export default class RoomScene {
  constructor(game) { this.game = game; }

  // ------------------------------------------------------------ lifecycle
  enter(params = {}) {
    const g = this.game;
    const roomId = ROOMS[params.roomId] ? params.roomId : 'office';
    const hero = HEROES[params.hero] ? params.hero : 'aaron';
    this.p = { attempt: 1, ...params, roomId, hero };
    this.roomId = roomId;
    this.room = ROOMS[roomId];
    this.accent = this.room.accent ?? PALETTE.sun;
    this.stage = STAGES[roomId];
    this.diff = diff(params.difficulty);
    this.p.difficulty = this.diff.id;
    const sc = scaling(roomId), d = this.diff; // depth ramp × chosen difficulty (Medium = ×1)
    this.scl = { ...sc, hp: sc.hp * d.hp, dmg: sc.dmg * d.dmg, speed: sc.speed * d.speed, aggro: sc.aggro * d.aggro, tele: sc.tele * d.tele };
    this.arena = buildArena(this.stage);
    this.fitFurniture();

    // skills: basic + up to 2 loadout skills + the ultimate if earned
    const owned = g.state?.skills?.[hero] ?? [];
    const loadout = (Array.isArray(params.loadout) ? params.loadout : []).filter((id) => SKILLS[id]?.hero === hero && SKILLS[id].slot === 'skill').slice(0, 2);
    const ult = Object.values(SKILLS).find((s) => s.hero === hero && s.slot === 'ultimate' && owned.includes(s.id));
    this.slots = { basic: HEROES[hero].basic, s1: loadout[0] ?? null, s2: loadout[1] ?? null, ult: ult?.id ?? null };

    this.fx = new Fx();
    this.hero = createHero(g, hero, roomId, this.slots);
    this.hero.x = this.arena.start.x; this.hero.y = this.arena.start.y;
    this.enemies = []; this.shots = []; this.waves = []; this.tele = []; this.zones = []; this.pickups = []; this.vfx = []; this.timers = [];
    this.goo = createGoo();
    this.boundary = null; this.laser = null; this.hoseVfx = null; this.boss = null;
    this.time = 0; this.defeated = 0; this.kills = 0; this.damageTaken = 0; this.movedT = 0;
    this.mouseAimT = 0; this.lastMouse = { x: g.input.mouse.x, y: g.input.mouse.y };
    this.paused = false; this.finished = false;
    this.phase = 'intro'; this.introT = 0; this.endT = 0;
    this.bannerData = null; this.logData = null; this.barkData = null; this.barkCd = 0; this.saidBoss = false; this.saidLow = false;
    this.basicUses = 0; this.lastKills = 0;
    this.cam = { x: 0, y: 0 };
    this.snapCamera();
    this.setupTutorial();
    playMusic(this.room.enemies.some((id) => id === 'roomba' || id === 'sock_monster' || id === 'grill_dragon' || id === 'partyplanner') ? 'boss' : 'room');
  }

  exit() { this.timers = []; }

  /** Use art-world furniture footprints when they exist. */
  fitFurniture() {
    const size = Sprites.FURNITURE_SIZE;
    if (!size) return;
    for (const p of this.arena.props) {
      const s = size[p.kind];
      if (s && p.w && !p.fixedSize) { p.w = s.w; p.d = s.h; p.rr = Math.hypot(p.w / 2, p.d / 2); }
    }
  }

  startPlay() {
    this.phase = 'play';
    this.stage.setup?.(this);
    this.later(0.6, () => this.say('start', true));
    if (this.p.attempt > 1 && this.stage === STAGES.office) this.tut.moved = true;
  }

  // ------------------------------------------------------------ world API used by modules
  aliveCount() { let n = 0; for (const e of this.enemies) if (!e.dead) n++; return n; }
  aliveCounted() { let n = 0; for (const e of this.enemies) if (!e.dead && e.counts !== false) n++; return n; }
  spawnEnemy(type, x, y, opts = {}) {
    const e = createEnemy(this, type, x, y, opts);
    this.enemies.push(e);
    if (HEADLINER[type] && !this.saidBoss) { this.saidBoss = true; this.later((opts.spawnDelay ?? 0.7) + 0.3, () => this.say('boss', true)); }
    return e;
  }
  killEnemy(e) { killEnemy(this, e); }
  later(delay, fn) { this.timers.push({ t: delay, fn }); }
  banner(textStr, color = PALETTE.sun, dur = 2.2) { this.bannerData = { text: textStr, color, t: dur, max: dur }; }
  log(line) { this.logData = { text: line, t: 3.2 }; playSfx('type'); }

  /** Short story bark (story/lines.js), used sparingly. PartyPlanner lines go to the terminal box. */
  say(event, force = false) {
    if (!force && this.barkCd > 0) return;
    const r = bark(this.roomId, event, { hero: this.hero.id });
    if (!r?.text) return;
    this.barkCd = 9;
    if (r.who === 'partyplanner' || r.text.startsWith('> ')) this.log(r.text.split('\n')[0].replace(/^> ?/, '> '));
    else this.barkData = { who: r.who, text: r.text, t: 3.2 };
  }

  onSkillUsed(id) {
    this.game.events.emit('skill:used', { id });
    if (id === this.slots.basic) this.basicUses++;
    const pr = this.prompts[0];
    if (pr && pr.skill === id) pr.used = (pr.used ?? 0) + 1;
  }

  onHeroDown() {
    const h = this.hero;
    h.down = true; h.hp = 0; h.channel = null;
    this.fx.burst(h.x, h.y - 20, PALETTE.danger, 30, 200);
    this.fx.addShake(10);
    this.lose();
  }

  win() {
    if (this.phase !== 'play') return;
    this.phase = 'won'; this.endT = 0;
    for (const e of this.enemies) if (!e.dead) killEnemy(this, e, { silent: true });
    this.shots = []; this.waves = []; this.tele = []; this.zones = this.zones.filter((z) => z.kind === 'burnmark'); this.laser = null;
    this.hero.channel = null; this.hoseVfx = null;
    playSfx('victory');
    this.fx.addShake(8);
    this.fx.confetti?.(this.hero.x, this.hero.y - 60, 60);
    const fixed = this.roomId === 'pond' ? 'PartyPlanner.exe is down. Patch it!' : `${this.room.name}: fixed!`;
    this.banner(fixed, PALETTE.sun, WIN_BEAT);
    this.barkData = null; this.say('win', true);
  }

  lose() {
    if (this.phase !== 'play') return;
    this.phase = 'lost'; this.endT = 0;
    playSfx('defeat');
    this.banner('Knocked out! Catch your breath and try again.', PALETTE.danger, LOSE_BEAT);
    this.say('lose', true);
  }

  finish(victory) {
    if (this.finished) return;
    this.finished = true;
    const h = this.hero;
    finishAction(this.game, {
      roomId: this.roomId, hero: h.id, victory,
      hpFrac: victory ? clamp(h.hp / h.maxHp, 0, 1) : 0,
      timeSec: Math.round(this.time), enemiesDefeated: this.kills,
    });
  }

  // ------------------------------------------------------------ tutorial prompts
  setupTutorial() {
    const flags = this.game.state?.flags ?? {};
    const office = this.roomId === 'office';
    this.tut = { moved: !office || !!flags['action.tut.move'] };
    this.prompts = [];
    if (office && !flags['action.tut.move']) this.prompts.push({ flag: 'action.tut.move', key: '←↑↓→', text: 'Move with the arrow keys. The mouse aims.', done: (L) => L.movedT > 1.2 });
    const add = (slot) => {
      const id = this.slots[slot];
      if (!id || flags[`action.tut.${id}`]) return;
      const def = SKILL_DEF[id];
      const key = slot === 'basic' ? 'J' : slot === 'ult' ? 'Space' : SLOT_KEYS[slot] === 'K' ? 'K' : 'E';
      const label = slot === 's1' ? 'K / Shift' : slot === 's2' ? 'E / L' : key;
      this.prompts.push({ flag: `action.tut.${id}`, skill: id, key, text: (def?.tut ?? SKILLS[id].desc).replace('{key}', label), done: (L, pr) => (pr.used ?? 0) >= (slot === 'basic' ? 3 : 1) });
    };
    add('basic'); add('s1'); add('s2'); add('ult');
    // prompt timing: the first one waits for the stage card; each lasts until done or ~8s
    for (const pr of this.prompts) pr.t = 0;
  }

  updatePrompts(dt) {
    const pr = this.prompts[0];
    if (!pr) return;
    if (this.phase === 'intro' && pr.flag !== 'action.tut.move') return;
    if (!pr.shown) {
      pr.shown = true;
      try { this.game.state.flags[pr.flag] = true; saveGame(this.game.state); } catch { /* ignore */ }
      playSfx('blip');
    }
    pr.t += dt;
    const done = pr.done(this, pr);
    if (pr.flag === 'action.tut.move' && done) this.tut.moved = true;
    if ((done && pr.t > 1.2) || pr.t > (pr.flag === 'action.tut.move' ? 30 : 9)) {
      if (pr.flag === 'action.tut.move') this.tut.moved = true;
      this.prompts.shift();
    }
  }

  // ------------------------------------------------------------ camera
  snapCamera() {
    const h = this.hero, A = this.arena;
    this.cam.x = clamp(h.x - W / 2, 0, Math.max(0, A.w - W));
    this.cam.y = clamp(h.y - H / 2 - 20, -10, Math.max(0, A.h - H));
  }

  updateCamera(dt) {
    const h = this.hero, A = this.arena;
    const lead = this.phase === 'play' ? 50 : 0;
    const tx = clamp(h.x + Math.cos(h.facing) * lead - W / 2, 0, Math.max(0, A.w - W));
    const ty = clamp(h.y - 20 + Math.sin(h.facing) * lead * 0.6 - H / 2, -10, Math.max(0, A.h - H));
    const k = 1 - Math.exp(-6 * dt);
    this.cam.x = lerp(this.cam.x, tx, k);
    this.cam.y = lerp(this.cam.y, ty, k);
  }

  // ------------------------------------------------------------ update
  update(dt) {
    const g = this.game, inp = g.input;
    if ((this.phase === 'play' || this.phase === 'intro') && inp.pressed('pause')) { this.paused = !this.paused; playSfx('click'); }
    if (this.paused) {
      if (button(null, g, 'Resume', W / 2 - 110, 330, 220, 44)) this.paused = false;
      else if (button(null, g, 'Give up (retry)', W / 2 - 110, 384, 220, 44)) { this.paused = false; this.phase = 'play'; this.lose(); }
      return;
    }
    this.fx.update(dt);

    // Mouse aim: active while the mouse has moved recently or a mouse button is used.
    const m = inp.mouse;
    if (Math.abs(m.x - this.lastMouse.x) + Math.abs(m.y - this.lastMouse.y) > 2) this.mouseAimT = 3;
    else this.mouseAimT = Math.max(0, this.mouseAimT - dt);
    if (m.down) this.mouseAimT = Math.max(this.mouseAimT, 0.5);
    this.lastMouse.x = m.x; this.lastMouse.y = m.y;

    if (this.bannerData) { this.bannerData.t -= dt; if (this.bannerData.t <= 0) this.bannerData = null; }
    if (this.logData) { this.logData.t -= dt; if (this.logData.t <= 0) this.logData = null; }
    if (this.barkData) { this.barkData.t -= dt; if (this.barkData.t <= 0) this.barkData = null; }
    this.barkCd = Math.max(0, this.barkCd - dt);
    for (const v of this.vfx) v.t += dt;
    this.vfx = this.vfx.filter((v) => v.t < v.dur);
    for (const p of this.arena.props) if (p.flash > 0) p.flash -= dt;

    if (this.phase === 'intro') {
      this.introT += dt;
      updateHero(this, dt);
      this.updatePrompts(dt);
      if (this.introT >= INTRO) this.startPlay();
      this.updateCamera(dt);
      return;
    }

    const playing = this.phase === 'play';
    if (playing) {
      this.time += dt;
      updateHero(this, dt);
      updateEnemies(this, dt);
      updateBoundary(this, dt);
      for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0) { tm.done = true; tm.fn(); } }
      this.timers = this.timers.filter((tm) => !tm.done);
    }
    updateShots(this, dt);
    updateWaves(this, dt);
    updateTelegraphs(this, dt);
    updateZones(this, dt);
    updateGoo(this, dt);
    updatePickups(this, dt);
    if (this.enemies.length > 60) this.enemies = this.enemies.filter((e) => !e.dead || e === this.boss);
    if (this.laser && !(this.boss && this.boss.state === 'laser' && !this.boss.dead && !(this.boss.stun > 0))) this.laser = null;

    if (playing) {
      this.updatePrompts(dt);
      this.stage.update?.(this, dt);
      const h = this.hero;
      if (!this.saidLow && h.hp < h.maxHp * 0.3 && !h.down) { this.saidLow = true; this.say('lowhp', true); }
      if (this.kills > this.lastKills) { this.lastKills = this.kills; if (Math.random() < 0.12) this.say('hit'); }
      if (this.stage.done(this)) this.win();
    } else if (this.phase === 'won') {
      this.endT += dt;
      if (Math.random() < 0.4) {
        const h = this.hero;
        this.fx.burst(h.x + (Math.random() - 0.5) * 700, h.y + (Math.random() - 0.5) * 400, [PALETTE.sun, PALETTE.heal, this.accent, PALETTE.sunDeep][Math.floor(Math.random() * 4)], 6, 80);
      }
      if (this.endT > WIN_BEAT) this.finish(true);
    } else if (this.phase === 'lost') {
      this.endT += dt;
      if (this.endT > LOSE_BEAT) this.finish(false);
    }
    this.updateCamera(dt);
  }

  // ------------------------------------------------------------ render
  render(ctx) {
    const g = this.game, A = this.arena;
    const sh = this.fx.shakeOffset();
    const cx = Math.round(this.cam.x + sh.x), cy = Math.round(this.cam.y + sh.y);
    ctx.save();
    ctx.translate(-cx, -cy);
    this.drawRoom(ctx, cx, cy);

    // ground layer: deco furniture (rugs, lily pads), water, zones, telegraphs, rings
    for (const p of A.props) if (p.deco) this.drawFurniture(ctx, p);
    this.drawWater(ctx);
    const vx0 = cx - 160, vx1 = cx + W + 160, vy0 = cy - 120, vy1 = cy + H + 200;
    drawGooFloor(ctx, this, { x0: vx0, x1: vx1, y0: vy0, y1: vy1 });
    for (const z of this.zones) {
      if (artZone(z.kind)) Sprites.drawZone(ctx, this.game, z.kind, z.x, z.y, z.r * Math.min(1, z.t * 5), { t: this.time, life: Math.max(0, 1 - z.t / z.dur), seed: z.x });
      else drawZone(ctx, z, this.time);
    }
    if (this.boundary) {
      const b = this.boundary;
      if (artZone('boundaries')) Sprites.drawZone(ctx, this.game, 'boundaries', b.x, b.y, b.r, { t: this.time, life: Math.max(0, 1 - b.t / b.dur) });
      else drawBoundary(ctx, b, this.time);
    }
    for (const t of this.tele) drawTelegraph(ctx, t);
    for (const w of this.waves) {
      if (w.team === 'hero' && artZone('drumwave')) Sprites.drawZone(ctx, this.game, 'drumwave', w.x, w.y, w.r, { t: this.time, life: 1 - w.r / w.maxR, onBeat: w.color === PALETTE.sun });
      else drawWave(ctx, w);
    }
    const h = this.hero;
    if (this.slots.s1 === 'drumline' || this.slots.s2 === 'drumline') if (!h.down) drawBeatRing(ctx, h, beatPhase(this));
    if (h.aggroT > 0 && artZone('aggro')) Sprites.drawZone(ctx, this.game, 'aggro', h.x, h.y, 40, { t: this.time, life: Math.min(1, h.aggroT / 6) });
    else if (h.aggroT > 0) { ctx.save(); ctx.globalAlpha = 0.3 + Math.sin(this.time * 10) * 0.1; ctx.fillStyle = PALETTE.danger; ctx.beginPath(); ctx.ellipse(h.x, h.y, 34, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

    // Y-sorted drawables (culled to the view).
    const inView = (o) => o.x > vx0 && o.x < vx1 && o.y > vy0 && o.y < vy1;
    const list = [];
    for (const p of A.props) if (!p.deco && !p.broken && inView(p)) list.push({ y: p.y, k: 0, o: p });
    for (const e of this.enemies) if (!e.dead && inView(e)) list.push({ y: e.y, k: 1, o: e });
    for (const p of this.pickups) if (inView(p)) list.push({ y: p.y, k: 3, o: p });
    for (const s of this.shots) if (inView(s)) list.push({ y: s.lob ? s.y : s.y + 16, k: 4, o: s });
    list.push({ y: h.y, k: 5, o: h });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) this.drawItem(ctx, it.k, it.o);
    drawGooAir(ctx, this);

    this.drawLights(ctx);
    if (this.laser) {
      const l = this.laser;
      if (artZone('laser')) Sprites.drawZone(ctx, this.game, 'laser', l.x, l.y, l.len, { t: this.time, angle: l.ang, width: 32 });
      else drawLaser(ctx, l, this.time);
    }
    if (this.hoseVfx && h.channel) {
      const v = this.hoseVfx;
      if (artZone('hose')) Sprites.drawZone(ctx, this.game, 'hose', v.x, v.y, v.len, { t: this.time, angle: v.ang, width: 20 });
      else drawHose(ctx, v, this.time);
    }
    for (const v of this.vfx) drawVfx(ctx, v);
    for (const e of this.enemies) if (!e.dead && e.markT > 0 && !e.hidden) drawMark(ctx, e, this.time);
    this.fx.render(ctx);
    ctx.restore();

    // ---- screen space
    if (this.phase === 'won') { ctx.fillStyle = `rgba(255,201,74,${Math.min(0.2, this.endT * 0.1)})`; ctx.fillRect(0, 0, W, H); }
    if (this.phase === 'lost') { ctx.fillStyle = `rgba(16,19,31,${Math.min(0.45, this.endT * 0.25)})`; ctx.fillRect(0, 0, W, H); }
    this.drawOffscreenMarkers(ctx, cx, cy);
    this.drawHud(ctx);
    if (this.logData) this.drawLog(ctx);
    if (this.barkData) this.drawBark(ctx, cx, cy);
    if (this.phase === 'intro') this.drawStageCard(ctx);
    this.drawPrompt(ctx);
    if ((this.phase === 'won' || this.phase === 'lost') && typeof Sprites.drawBust === 'function') this.drawEndBust(ctx);
    if (this.bannerData) this.drawBanner(ctx);
    if (this.paused) this.drawPause(ctx);
  }

  drawRoom(ctx, cx, cy) {
    const A = this.arena, g = this.game;
    const ready = Sprites.ROOM_KINDS?.includes?.(this.roomId) && typeof Sprites.drawRoom === 'function';
    if (ready) {
      // art convention: playable floor is 0..arenaW × 0..arenaH; back wall drawn above y=0
      ctx.save();
      ctx.translate(0, A.wallH);
      Sprites.drawRoom(ctx, g, this.roomId, cx, cy - A.wallH, W, H, { weird: this.weird(), t: this.time, arenaW: A.w, arenaH: A.h - A.wallH, wallH: A.wallH });
      ctx.restore();
    } else drawRoomFallback(ctx, A, this.accent, this.time);
  }

  /** 1 while the room is haywire, fading to 0 during the victory beat. */
  weird() { return this.phase === 'won' ? Math.max(0, 1 - this.endT / 1.5) : 1; }

  drawWater(ctx) {
    if (typeof Sprites.drawWater === 'function') {
      for (const wv of this.arena.water) Sprites.drawWater(ctx, this.game, wv.x, wv.y, wv.rx, wv.ry, { t: this.time, weird: this.weird() });
      return;
    }
    for (const wv of this.arena.water) {
      ctx.save();
      ctx.fillStyle = '#d9c99a';
      ctx.beginPath(); ctx.ellipse(wv.x, wv.y, wv.rx + 14, wv.ry + 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.lake;
      ctx.beginPath(); ctx.ellipse(wv.x, wv.y, wv.rx, wv.ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { const k = ((this.time * 0.3 + i / 4) % 1); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(wv.x, wv.y, wv.rx * k, wv.ry * k, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
  }

  drawFurniture(ctx, p) {
    const g = this.game;
    const o = { seed: p.seed, t: this.time, w: p.w, d: p.d, lit: p.done ? 1 : p.lit, flash: p.flash > 0 ? p.flash : 0, room: this.roomId, laptop: p.laptop };
    // PROP_KINDS = art-world furniture + round-1 props (my kind names are canonical; tree/rock reuse round-1 art)
    if (Sprites.PROP_KINDS?.includes?.(p.kind)) { Sprites.drawProp(ctx, g, p.kind, p.x, p.y, o); return; }
    drawFurnitureFallback(ctx, p, this.time, g);
  }

  drawItem(ctx, k, o) {
    const g = this.game;
    if (k === 0) this.drawFurniture(ctx, o);
    else if (k === 1) {
      const e = o;
      if (e.hidden && e.type === 'pipe_snake') return;
      if (e.hidden && e.type === 'code_fish') { // a ripple + dorsal fin under the surface
        ctx.save(); ctx.strokeStyle = 'rgba(232,248,255,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, 14 + Math.sin(e.animT * 4) * 3, 5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        return;
      }
      const opts = enemyDrawOpts(e);
      if (e.z > 0) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r, e.r * 0.35, 0, 0, Math.PI * 2); ctx.fill(); }
      if (Sprites.ENEMY_KINDS?.includes?.(e.type)) {
        ctx.save(); ctx.globalAlpha = opts.alpha;
        Sprites.drawEnemy(ctx, g, e.type, e.x, e.y - (e.z || 0), opts);
        ctx.restore();
      } else drawEnemyFallback(ctx, e.type, e.x, e.y - (e.z || 0), opts, e);
      if (e.stun > 0) drawStars(ctx, e.x, e.y - e.h - 8 - (e.z || 0), this.time);
      if (e.snareT > 0) { ctx.save(); ctx.strokeStyle = '#ff8fb1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y - 6, e.r + 4, e.r * 0.6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      if (e.burnT > 0 && Math.random() < 0.3) this.fx.burst(e.x, e.y - e.h * 0.7, PALETTE.sunDeep, 1, 30);
    } else if (k === 3) {
      drawHeart(ctx, o, this.time);
    } else if (k === 4) {
      const s = o;
      if (s.lob) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 8, 3, 0, 0, Math.PI * 2); ctx.fill(); }
      if (Sprites.PROJECTILE_KINDS?.includes?.(s.kind)) Sprites.drawProjectile(ctx, g, s.kind, s.x, s.y - (s.z || 0), { r: s.r, vx: s.lob ? (s.lob.tx - s.lob.sx) : s.vx, vy: s.lob ? (s.lob.ty - s.lob.sy) : s.vy, t: s.t, team: s.team, glyph: s.glyph, reflected: s.reflected });
      else drawShotFallback(ctx, s, this.time);
    } else if (k === 5) {
      const h = o;
      const opts = heroDrawOpts(this, h);
      Sprites.drawHero(ctx, g, h.id, h.x, h.y, opts);
      if (h.shieldT > 0 && !Sprites.HOLD_KINDS) drawPlate(ctx, h, this.time);
      if (h.slowT > 0) { ctx.fillStyle = 'rgba(255,246,229,0.3)'; ctx.beginPath(); ctx.ellipse(h.x, h.y, 16, 6, 0, 0, Math.PI * 2); ctx.fill(); }
      if (h.rootT > 0) { ctx.save(); ctx.strokeStyle = PALETTE.pine; ctx.lineWidth = 4; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(h.x + i * 8, h.y); ctx.quadraticCurveTo(h.x + i * 14, h.y - 12, h.x + i * 4, h.y - 22); ctx.stroke(); } ctx.restore(); }
    }
  }

  /** Backyard: strands of bulbs hang between consecutive posts as they get strung. */
  drawLights(ctx) {
    const L = this.lights;
    if (!L || L.length < 2) return;
    for (let i = 0; i < L.length - 1; i++) {
      const a = L[i], b = L[i + 1];
      const lit = Math.min(a.done ? 1 : a.lit, b.done ? 1 : b.lit);
      if (typeof Sprites.drawStringLights === 'function') Sprites.drawStringLights(ctx, this.game, a.x, a.y - 96, b.x, b.y - 96, { t: this.time, lit, sag: 40 });
      else {
        ctx.save();
        ctx.strokeStyle = 'rgba(40,40,48,0.8)'; ctx.lineWidth = 1.5;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 96 + 40;
        ctx.beginPath(); ctx.moveTo(a.x, a.y - 84); ctx.quadraticCurveTo(mx, my, b.x, b.y - 84); ctx.stroke();
        const n = 10;
        for (let k = 1; k < n; k++) {
          const u = k / n, x = (1 - u) * (1 - u) * a.x + 2 * u * (1 - u) * mx + u * u * b.x, y = (1 - u) * (1 - u) * (a.y - 84) + 2 * u * (1 - u) * my + u * u * (b.y - 84);
          ctx.fillStyle = lit >= 1 ? ['#ffc94a', '#ff8fb1', '#7fd8a6', '#5aa4e6'][k % 4] : '#55555f';
          ctx.beginPath(); ctx.arc(x, y + 3, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  /** Arrows to the last few enemies (and light posts) when they're off-screen. */
  drawOffscreenMarkers(ctx, cx, cy) {
    if (this.phase !== 'play') return;
    const pts = [];
    const live = this.enemies.filter((e) => !e.dead && !(e.spawning > 0) && e.counts !== false);
    if (live.length <= 3) for (const e of live) pts.push({ x: e.x, y: e.y - 20, c: e.hidden ? PALETTE.mint : PALETTE.danger });
    if (this.boss && !this.boss.dead) pts.push({ x: this.boss.x, y: this.boss.y - 30, c: PALETTE.danger });
    for (const p of this.lights ?? []) if (!p.done) pts.push({ x: p.x, y: p.y - 60, c: PALETTE.sun });
    for (const m of pts) {
      const sx = m.x - cx, sy = m.y - cy;
      if (sx > 10 && sx < W - 10 && sy > 70 && sy < H - 10) continue;
      const a = Math.atan2(sy - H / 2, sx - W / 2);
      const ex = clamp(sx, 24, W - 24), ey = clamp(sy, 84, H - 70);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
      ctx.fillStyle = m.c; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-7, -9); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  // ------------------------------------------------------------ HUD
  hudData() {
    const h = this.hero;
    const frac = (id) => (id && h.cd[id] > 0 ? h.cd[id] / (h.cdMax[id] || SKILL_DEF[id]?.cd || 1) : 0);
    const skills = [['s1', 'K'], ['s2', 'E']].filter(([s]) => this.slots[s]).map(([s, key]) => ({ id: this.slots[s], cd: frac(this.slots[s]), key }));
    const obj = this.phase === 'intro' ? { text: this.room.objective, progress: 0 } : this.stage.objective(this);
    const hud = {
      hero: h.id, hp: Math.max(0, Math.round(h.hp)), maxHp: h.maxHp,
      basic: { id: this.slots.basic, cd: frac(this.slots.basic), key: 'J' },
      skills,
      ultimate: this.slots.ult ? { id: this.slots.ult, cd: frac(this.slots.ult), ready: !(h.cd[this.slots.ult] > 0), key: 'Space' } : undefined,
      objective: obj.text, progress: clamp(obj.progress ?? 0, 0, 1),
      favored: h.favored,
    };
    if (this.boss && !this.boss.dead && !(this.boss.spawning > 0)) {
      hud.bossHp = { name: this.boss.name, frac: this.boss.hp / this.boss.maxHp };
      if (this.boss.type === 'partyplanner') hud.bossHp.phases = 3;
    }
    return hud;
  }

  drawHud(ctx) {
    const hud = this.hudData();
    if ((HUD.HUD_VERSION ?? 1) >= 2) { HUD.drawHUD(ctx, this.game, hud); return; }
    // Legacy HUD: let it draw objective + boss bar; action draws the hero card + skill bar itself.
    this.drawObjective(ctx, hud);
    if (hud.bossHp) this.drawBossBar(ctx, hud.bossHp);
    this.drawHeroCard(ctx, hud);
    this.drawSkillBar(ctx, hud);
  }

  drawObjective(ctx, hud) {
    ctx.save(); ctx.font = 'bold 15px "Trebuchet MS", system-ui, sans-serif';
    const tw = Math.min(420, Math.max(200, ctx.measureText(hud.objective).width + 50));
    ctx.restore();
    const x = W - tw - 12, y = 12;
    panel(ctx, x, y, tw, 52, { radius: 14, alpha: 0.9, stroke: this.accent });
    ctx.fillStyle = this.accent; ctx.fillRect(x + 14, y + 10, 2, 18);
    ctx.beginPath(); ctx.moveTo(x + 16, y + 10); ctx.lineTo(x + 27, y + 14); ctx.lineTo(x + 16, y + 18); ctx.closePath(); ctx.fill();
    text(ctx, hud.objective, x + 34, y + 25, { font: 'bold 15px "Trebuchet MS", system-ui, sans-serif', maxWidth: tw - 44 });
    bar(ctx, x + 34, y + 34, tw - 48, 8, hud.progress, PALETTE.sun, 'rgba(0,0,0,0.5)');
  }

  drawBossBar(ctx, b) {
    const w = 520, x = (W - w) / 2, y = H - 38;
    panel(ctx, x - 12, y - 22, w + 24, 46, { radius: 14, alpha: 0.92, stroke: PALETTE.danger });
    bar(ctx, x, y + 2, w, 14, b.frac, PALETTE.danger, 'rgba(8,10,18,0.7)');
    if (b.phases) { ctx.fillStyle = 'rgba(255,246,229,0.8)'; for (let i = 1; i < b.phases; i++) ctx.fillRect(x + w * i / b.phases - 1, y + 2, 2, 14); }
    text(ctx, b.name, W / 2, y - 6, { align: 'center', font: 'bold 14px "Trebuchet MS", system-ui, sans-serif' });
  }

  drawHeroCard(ctx, hud) {
    const g = this.game, h = this.hero;
    const accent = h.id === 'aaron' ? PALETTE.sun : PALETTE.mint;
    const low = hud.hp / hud.maxHp < 0.3;
    panel(ctx, 12, 12, 250, 66, { radius: 18, alpha: 0.92 });
    Sprites.drawPortrait(ctx, g, h.id, 46, 45, 26, { ring: low ? PALETTE.danger : accent, ringWidth: 4, border: 2 });
    text(ctx, HEROES[h.id].name, 82, 33, { font: 'bold 16px "Trebuchet MS", system-ui, sans-serif', color: accent });
    if (h.favored) text(ctx, 'favored +15%', 250, 33, { font: FONT.small, align: 'right', color: PALETTE.sun });
    bar(ctx, 82, 42, 166, 12, hud.hp / hud.maxHp, low ? PALETTE.danger : PALETTE.heal, 'rgba(0,0,0,0.55)');
    text(ctx, `${hud.hp}/${hud.maxHp}`, 82, 70, { font: FONT.small, color: 'rgba(255,246,229,0.8)' });
  }

  drawSkillBar(ctx, hud) {
    const slots = [{ ...hud.basic, key: 'J' }, ...hud.skills];
    if (hud.ultimate) slots.push({ ...hud.ultimate, key: 'Spc' });
    const sz = 52, gap = 12, total = slots.length * sz + (slots.length - 1) * gap;
    let x = W / 2 - total / 2;
    const y = H - (hud.bossHp ? 122 : 72);
    panel(ctx, x - 12, y - 8, total + 24, sz + 26, { radius: 16, alpha: 0.8 });
    for (const s of slots) {
      const ccx = x + sz / 2, ccy = y + sz / 2 - 2;
      ctx.save();
      ctx.fillStyle = 'rgba(16,19,31,0.75)'; ctx.beginPath(); ctx.arc(ccx, ccy, sz / 2 - 2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = s.cd > 0 ? 0.45 : 1;
      if (typeof Sprites.drawSkillIcon === 'function') Sprites.drawSkillIcon(ctx, s.id, ccx, ccy, sz - 14, {});
      else skillGlyph(ctx, s.id, ccx, ccy);
      ctx.restore();
      ring(ctx, ccx, ccy, sz / 2 - 2, s.cd, { color: SKILLS[s.id]?.slot === 'ultimate' ? PALETTE.danger : this.accent });
      keycap(ctx, s.key, ccx, y + sz + 4, { small: true });
      x += sz + gap;
    }
  }

  drawStageCard(ctx) {
    const k = this.introT / INTRO;
    const a = Math.min(1, this.introT * 4, (1 - k) * 5);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    panel(ctx, W / 2 - 260, 150, 520, 150, { radius: 20, stroke: this.accent });
    text(ctx, this.room.name.toUpperCase(), W / 2, 196, { align: 'center', font: FONT.big, color: this.accent });
    text(ctx, `Goal: ${this.room.objective}`, W / 2, 236, { align: 'center', font: 'bold 20px "Trebuchet MS", system-ui, sans-serif' });
    const fav = this.hero.favored ? `  ·  ${HEROES[this.hero.id].name}'s room: +15% damage` : '';
    text(ctx, `${k > 0.6 ? 'GO!' : 'Get ready...'}${fav}`, W / 2, 272, { align: 'center', color: k > 0.6 ? PALETTE.sun : PALETTE.paper });
    chip(ctx, this.diff.name, W / 2, 150, { align: 'center', fill: this.diff.color, color: PALETTE.ink });
    ctx.restore();
  }

  drawPrompt(ctx) {
    const pr = this.prompts?.[0];
    if (!pr || !pr.shown || this.paused) return;
    if (this.phase !== 'play' && !(this.phase === 'intro' && pr.flag === 'action.tut.move')) return;
    const a = Math.min(1, pr.t * 4);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = 'bold 16px "Trebuchet MS", system-ui, sans-serif';
    const tw = Math.min(700, ctx.measureText(pr.text).width + 100);
    const y = this.phase === 'intro' ? 340 : 96;
    const pulse = 1 + Math.sin(this.time * 6) * 0.03;
    ctx.translate(W / 2, y + 22); ctx.scale(pulse, pulse); ctx.translate(-W / 2, -(y + 22));
    panel(ctx, W / 2 - tw / 2, y, tw, 44, { radius: 14, stroke: PALETTE.sun });
    keycap(ctx, pr.key, W / 2 - tw / 2 + 36, y + 22, {});
    text(ctx, pr.text, W / 2 - tw / 2 + 70, y + 28, { font: 'bold 16px "Trebuchet MS", system-ui, sans-serif', maxWidth: tw - 84 });
    ctx.restore();
  }

  /** Hero photo bust slides in for the victory beat (or a sheepish one on defeat). */
  drawEndBust(ctx) {
    const won = this.phase === 'won';
    const k = Math.min(1, this.endT * 3);
    const ease = 1 - Math.pow(1 - k, 3);
    const expr = won ? 'happy' : 'sheepish';
    ctx.save();
    try { Sprites.drawBust(ctx, this.game, this.hero.id, expr, 130, H, 290, { t: this.endT, exprT: this.endT, enter: ease, side: 1 }); } catch { /* art optional */ }
    ctx.restore();
  }

  drawBanner(ctx) {
    const b = this.bannerData;
    const a = Math.min(1, (b.max - b.t) * 5, b.t * 3);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = FONT.big;
    const tw = Math.min(900, ctx.measureText(b.text).width + 60);
    panel(ctx, W / 2 - tw / 2, 188, tw, 72, { radius: 18, stroke: b.color });
    text(ctx, b.text, W / 2, 238, { align: 'center', font: tw > 880 ? 'bold 28px "Trebuchet MS", system-ui, sans-serif' : FONT.big, color: b.color, maxWidth: tw - 30 });
    ctx.restore();
  }

  /** Speech bubble above the hero's head (never over the HUD). */
  drawBark(ctx, cx, cy) {
    const bk = this.barkData, g = this.game, h = this.hero;
    const lines = wrapText(ctx, bk.text, 250, FONT.small).slice(0, 3);
    const bw = 300, bh = 14 + lines.length * 16;
    const x = clamp(h.x - cx - bw / 2, 8, W - bw - 8);
    const y = clamp(h.y - cy - 150 - bh, 70, H - 200);
    ctx.save();
    ctx.globalAlpha = Math.min(1, bk.t * 3, (3.2 - bk.t) * 6);
    panel(ctx, x, y, bw, bh, { radius: 12, stroke: bk.who === 'aaron' ? PALETTE.sun : PALETTE.mint });
    const tx = clamp(h.x - cx, x + 20, x + bw - 20);
    ctx.fillStyle = 'rgba(27,34,56,0.92)';
    ctx.beginPath(); ctx.moveTo(tx - 8, y + bh - 1); ctx.lineTo(tx + 8, y + bh - 1); ctx.lineTo(tx, y + bh + 10); ctx.closePath(); ctx.fill();
    if (HEROES[bk.who]) Sprites.drawPortrait(ctx, g, bk.who, x + 20, y + bh / 2, 13, {});
    lines.forEach((l, i) => text(ctx, l, x + 40, y + 19 + i * 16, { font: FONT.small }));
    ctx.restore();
  }

  /** PartyPlanner "speaks" in monospace log lines with a blinking cursor. */
  drawLog(ctx) {
    const l = this.logData;
    ctx.save();
    ctx.globalAlpha = Math.min(1, l.t * 3);
    ctx.font = 'bold 15px monospace';
    const shown = l.text.slice(0, Math.floor((3.2 - l.t) * 40));
    const tw = Math.max(260, ctx.measureText(l.text).width + 40);
    const x = W / 2 - tw / 2, y = 150;
    ctx.fillStyle = 'rgba(10,14,20,0.88)'; ctx.fillRect(x, y, tw, 34);
    ctx.strokeStyle = PALETTE.mint; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, tw, 34);
    ctx.fillStyle = PALETTE.mint; ctx.textBaseline = 'middle';
    ctx.fillText(shown + (Math.floor(this.time * 3) % 2 ? '_' : ' '), x + 16, y + 17);
    ctx.restore();
  }

  drawPause(ctx) {
    const g = this.game;
    ctx.fillStyle = 'rgba(16,19,31,0.65)'; ctx.fillRect(0, 0, W, H);
    panel(ctx, W / 2 - 250, 90, 500, 360, { radius: 20 });
    text(ctx, 'Paused', W / 2, 140, { align: 'center', font: FONT.big, color: PALETTE.sun });
    text(ctx, `${this.room.name}: ${this.room.objective}`, W / 2, 172, { align: 'center', color: this.accent });
    const s = this.slots;
    const lines = ['Arrow keys: move  ·  mouse: aim', `Click / J: ${SKILLS[s.basic].name}`];
    if (s.s1) lines.push(`K / Shift: ${SKILLS[s.s1].name}`);
    if (s.s2) lines.push(`E / L: ${SKILLS[s.s2].name}`);
    if (s.ult) lines.push(`Space: ${SKILLS[s.ult].name}`);
    lines.push('Esc / P: resume');
    lines.forEach((l, i) => text(ctx, l, W / 2, 204 + i * 20, { align: 'center', font: FONT.small }));
    button(ctx, g, 'Resume', W / 2 - 110, 330, 220, 44);
    button(ctx, g, 'Give up (retry)', W / 2 - 110, 384, 220, 44);
  }
}

// ------------------------------------------------------------ tiny local drawings
const artZone = (kind) => Sprites.ZONE_KINDS?.includes?.(kind) && typeof Sprites.drawZone === 'function';

function drawStars(ctx, x, y, t) {
  ctx.fillStyle = PALETTE.sun;
  for (let i = 0; i < 3; i++) {
    const a = t * 5 + (i * Math.PI * 2) / 3;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * 10, y + Math.sin(a) * 3, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPlate(ctx, h, t) {
  const a = h.facing, px = h.x + Math.cos(a) * 26, py = h.y - 24 + Math.sin(a) * 16;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#fff6e5'; ctx.strokeStyle = '#e98aa8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(px, py, 16, 16 * (0.6 + 0.4 * Math.abs(Math.cos(a))), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(px, py, 9, 9 * (0.6 + 0.4 * Math.abs(Math.cos(a))), 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** Letter glyph until art ships drawSkillIcon. */
function skillGlyph(ctx, id, x, y) {
  const sk = SKILLS[id];
  const col = sk?.slot === 'ultimate' ? PALETTE.danger : sk?.hero === 'aaron' ? PALETTE.sun : PALETTE.mint;
  ctx.fillStyle = col;
  ctx.font = 'bold 18px "Trebuchet MS", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const words = (sk?.name ?? '?').split(' ');
  ctx.fillText(words.map((w) => w[0]).join('').slice(0, 2).toUpperCase(), x, y);
}
