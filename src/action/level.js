// Action mission scene. Owned by: action team.
// enter(MissionParams) -> intro dialog -> play -> victory/defeat banner -> outro dialog -> finishMission.
import { finishMission } from '../core/mission.js';
import { PALETTE, HEROES, HERO_IDS, REGION_IDS, MISSION_KINDS, FONT } from '../core/theme.js';
import { clamp, lerp, dist, angleTo } from '../core/math.js';
import * as Sprites from '../art/sprites.js';
import { Fx } from '../art/fx.js';
import { drawHUD } from '../ui/hud.js';
import { Dialog } from '../ui/dialog.js';
import { panel, text, button, bar } from '../ui/widgets.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { scaling, KNOWN_MODIFIERS } from './config.js';
import { generateArena } from './arena.js';
import { createHeroes, updateHeroes, trySwap, heroDrawOpts } from './heroes.js';
import { createEnemy, updateEnemies, enemyDrawOpts } from './enemies.js';
import { updateShots, updateWaves, updateTelegraphs, updateZones, updatePickups, killEnemy } from './combat.js';
import { createMission, resolveBossType } from './missions.js';
import { introLines, victoryLines, defeatLines } from './banter.js';
import { drawWater, drawTelegraph, drawWave, drawZone as drawZoneFallback, drawPickup as drawPickupFallback, drawNpcPlaceholder, drawSweepArc } from './draw.js';

const W = 960, H = 540;

function normalize(params = {}) {
  const p = { nodeId: 'dev', region: 'lakeside', kind: 'skirmish', difficulty: 1, seed: 1, modifiers: [], ...params };
  if (!REGION_IDS.includes(p.region)) p.region = 'lakeside';
  if (!MISSION_KINDS[p.kind]) p.kind = 'skirmish';
  p.difficulty = clamp(Math.round(Number(p.difficulty) || 1), 1, 5);
  p.seed = Number.isFinite(Number(p.seed)) ? Number(p.seed) : 1;
  let mods = p.modifiers;
  if (typeof mods === 'string') mods = mods.split(',');
  p.modifiers = Array.isArray(mods) ? mods.filter((m) => typeof m === 'string').map((m) => m.trim()) : [];
  return p;
}

export default class LevelScene {
  constructor(game) { this.game = game; }

  enter(params) {
    const g = this.game;
    this.p = normalize(params);
    this.mods = this.p.modifiers.filter((m) => KNOWN_MODIFIERS.includes(m));
    this.scl = scaling(this.p.difficulty);
    this.bossType = this.p.kind === 'boss' ? resolveBossType(this.p) : null;
    this.arena = generateArena(this.p.region, this.p.kind, this.p.seed);
    this.fx = new Fx();
    this.dialog = new Dialog(g);
    this.heroes = createHeroes(g, this.mods);
    this.activeId = 'aaron';
    for (const id of HERO_IDS) { this.heroes[id].x = this.arena.start.x; this.heroes[id].y = this.arena.start.y; }
    this.enemies = []; this.shots = []; this.waves = []; this.tele = []; this.zones = []; this.pickups = []; this.npcs = [];
    this.cart = null;
    this.time = 0; this.scoops = 0; this.sunshine = 0; this.defeated = 0; this.damageTaken = 0;
    this.swapCd = 0; this.mouseAimT = 0; this.lastMouse = { x: g.input.mouse.x, y: g.input.mouse.y };
    this.blockHintT = 0; this.cartWarnT = 0; this.swapDeniedT = 0; this.cdHintT = 0;
    this.barkData = null;
    this.paused = false; this.finished = false;
    this.phase = 'intro'; this.endT = 0; this.outcome = null; this.retreated = false;
    this.scoutT = 0;
    this.hintT = 0;
    this.frost = this.mods.includes('blizzard') ? 0.65 : clamp((this.p.difficulty - 1) * 0.12 + (this.p.region === 'summit' ? 0.1 : 0), 0, 0.55);
    this.weather = this.mods.includes('blizzard') ? 'blizzard' : (this.p.region === 'summit' && this.p.difficulty >= 3) ? 'snow' : null;
    this.mission = createMission(this.p.kind);
    this.mission.setup(this);
    this.cam = { x: 0, y: 0 };
    try { Sprites.warmGround?.(this.p.region, 0, 0, this.arena.w, this.arena.h); } catch (e) { console.warn('warmGround', e); }
    this.snapCamera();
    playMusic(this.p.kind === 'boss' ? 'boss' : 'battle');
    const firstTime = !g.state?.flags?.['action.tutorialDone'];
    const intro = Array.isArray(this.p.intro) && this.p.intro.length ? this.p.intro : introLines(this.p, this.bossType, firstTime);
    this.dialog.open(intro, () => this.startPlay());
  }

  exit() { this.dialog = new Dialog(this.game); }

  get hero() { return this.heroes[this.activeId]; }

  startPlay() {
    this.phase = 'play';
    this.scoutT = this.mods.includes('ally_scouts') ? 9 : 0;
    this.hintT = 7;
    try { if (this.game.state?.flags) this.game.state.flags['action.tutorialDone'] = true; } catch { /* ignore */ }
  }

  // ------------------------------------------------------------ world API used by modules
  aliveCount() { let n = 0; for (const e of this.enemies) if (!e.dead) n++; return n; }

  spawnEnemy(type, x, y, opts = {}) {
    const e = createEnemy(this, type, x, y, opts);
    this.enemies.push(e);
    return e;
  }

  addNpc(x, y, seed) {
    const a = this.arena;
    const tx = x < a.w / 2 ? -40 : a.w + 40;
    this.npcs.push({ x, y, seed, t: 0, ang: angleTo(x, y, tx, y + (Math.random() - 0.5) * 300), speed: 120 });
  }

  bark(who, line, dur = 2) { this.barkData = { who, text: line, t: dur }; }

  onPropBroken(p) { this.mission.onPropBroken?.(this, p); }

  onHeroDown(h) {
    h.down = true; h.hp = 0;
    this.fx.burst(h.x, h.y - 20, PALETTE.frost, 30, 200);
    this.fx.addShake(10);
    playSfx('freeze');
    if (!trySwap(this, true)) this.lose();
  }

  win() {
    if (this.phase !== 'play') return;
    this.phase = 'won'; this.endT = 0; this.outcome = 'win';
    for (const e of this.enemies) if (!e.dead) killEnemy(this, e);
    this.shots = []; this.waves = []; this.tele = [];
    playSfx('victory'); playSfx('thaw');
    this.fx.addShake(8);
  }

  lose() {
    if (this.phase !== 'play') return;
    this.phase = 'lost'; this.endT = 0; this.outcome = 'lose';
    playSfx('defeat');
  }

  finish(victory) {
    if (this.finished) return;
    this.finished = true;
    const hpLeft = {};
    for (const id of HERO_IDS) { const h = this.heroes[id]; hpLeft[id] = h.down ? 0 : Math.max(1, Math.round(Math.min(h.hp, h.maxHp))); }
    finishMission(this.game, {
      nodeId: this.p.nodeId, victory, scoops: this.scoops, sunshine: this.sunshine, hpLeft,
      enemiesDefeated: this.defeated, timeSec: Math.round(this.time),
    });
  }

  snapCamera() {
    const h = this.hero;
    this.cam.x = clamp(h.x - W / 2, 0, Math.max(0, this.arena.w - W));
    this.cam.y = clamp(h.y - H / 2 - 20, 0, Math.max(0, this.arena.h - H));
  }

  updateCamera(dt) {
    const h = this.hero;
    const lead = this.phase === 'play' ? 50 : 0;
    const tx = clamp(h.x + Math.cos(h.facing) * lead - W / 2, 0, Math.max(0, this.arena.w - W));
    const ty = clamp(h.y - 20 + Math.sin(h.facing) * lead * 0.6 - H / 2, 0, Math.max(0, this.arena.h - H));
    const k = 1 - Math.exp(-6 * dt);
    this.cam.x = lerp(this.cam.x, tx, k);
    this.cam.y = lerp(this.cam.y, ty, k);
  }

  // ------------------------------------------------------------ update
  update(dt) {
    const g = this.game, inp = g.input;
    this.fx.update(dt);
    if (this.dialog.active) { this.dialog.update(dt); this.updateCamera(dt); return; }
    if (this.phase === 'intro' || this.phase === 'outro') { this.updateCamera(dt); return; }

    if (this.phase === 'play' && inp.pressed('pause')) { this.paused = !this.paused; playSfx('click'); }
    if (this.paused) {
      if (button(null, g, 'Resume', W / 2 - 110, 300, 220, 44)) this.paused = false;
      else if (button(null, g, 'Retreat to camp', W / 2 - 110, 354, 220, 44)) { this.paused = false; this.phase = 'lost'; this.outcome = 'lose'; this.endT = 1.2; this.retreated = true; playSfx('defeat'); }
      return;
    }

    // Mouse aim: active while the mouse has moved recently or a mouse button is used.
    const m = inp.mouse;
    if (Math.abs(m.x - this.lastMouse.x) + Math.abs(m.y - this.lastMouse.y) > 2) this.mouseAimT = 3;
    else this.mouseAimT = Math.max(0, this.mouseAimT - dt);
    if (m.down) this.mouseAimT = Math.max(this.mouseAimT, 0.5);
    this.lastMouse.x = m.x; this.lastMouse.y = m.y;

    const playing = this.phase === 'play';
    if (playing) this.time += dt;
    this.swapCd = Math.max(0, this.swapCd - dt);
    this.blockHintT -= dt; this.cartWarnT -= dt; this.swapDeniedT -= dt; this.cdHintT -= dt;
    this.scoutT = Math.max(0, this.scoutT - dt);
    this.hintT = Math.max(0, this.hintT - dt);
    if (this.barkData) { this.barkData.t -= dt; if (this.barkData.t <= 0) this.barkData = null; }
    if (this.cart) this.cart.flash = Math.max(0, (this.cart.flash ?? 0) - dt);
    for (const p of this.arena.props) if (p.flash > 0) p.flash -= dt;

    if (playing) updateHeroes(this, dt);
    if (playing) updateEnemies(this, dt);
    updateShots(this, dt);
    updateWaves(this, dt);
    updateTelegraphs(this, dt);
    updateZones(this, dt);
    updatePickups(this, dt, this.phase === 'won');
    for (const n of this.npcs) { n.t += dt; n.x += Math.cos(n.ang) * n.speed * dt; n.y += Math.sin(n.ang) * n.speed * dt; }
    this.npcs = this.npcs.filter((n) => n.t < 6);
    if (this.enemies.length > 40) this.enemies = this.enemies.filter((e) => !e.dead);
    else if (Math.random() < 0.05) this.enemies = this.enemies.filter((e) => !e.dead);

    if (playing) {
      this.mission.update(this, dt);
      const r = this.mission.result(this);
      if (r === 'win') this.win();
      else if (r === 'lose') this.lose();
    }

    if (this.phase === 'won') {
      this.endT += dt;
      this.frost = Math.max(0, this.frost - dt * 0.5);
      if (Math.random() < 0.5) {
        const h = this.hero;
        this.fx.burst(h.x + (Math.random() - 0.5) * 700, h.y + (Math.random() - 0.5) * 400, [PALETTE.sun, PALETTE.heal, PALETTE.mint, PALETTE.sunDeep][Math.floor(Math.random() * 4)], 6, 80);
      }
      if (this.endT > 3 && this.phase === 'won') {
        this.phase = 'outro';
        this.dialog.open(victoryLines(this.p, this.bossType), () => this.finish(true));
      }
    } else if (this.phase === 'lost') {
      this.endT += dt;
      if (this.endT > 2.4) {
        this.phase = 'outro';
        const lines = this.retreated ? [{ who: 'victoria', text: 'Tactical retreat! We\'ll be back with more sunscreen.' }] : defeatLines(this.p, this.bossType);
        this.dialog.open(lines, () => this.finish(false));
      }
    }
    this.updateCamera(dt);
  }

  // ------------------------------------------------------------ render
  render(ctx) {
    const g = this.game;
    const sh = this.fx.shakeOffset();
    const cx = Math.round(this.cam.x + sh.x), cy = Math.round(this.cam.y + sh.y);
    const frost = this.frost;
    Sprites.drawGround(ctx, g, this.p.region, cx, cy, W, H, { frost });

    ctx.save();
    ctx.translate(-cx, -cy);
    // Darken outside the arena (visible only during shake).
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(-200, -200, this.arena.w + 400, 200); ctx.fillRect(-200, this.arena.h, this.arena.w + 400, 200);
    ctx.fillRect(-200, 0, 200, this.arena.h); ctx.fillRect(this.arena.w, 0, 200, this.arena.h);

    drawWater(ctx, this.arena.water, this.time, frost);
    for (const d of this.arena.deco) if (d.kind === 'bucket') drawBucket(ctx, d.x, d.y);
    for (const z of this.zones) {
      if (Sprites.drawZone) Sprites.drawZone(ctx, g, 'bloom', z.x, z.y, z.r, { t: z.t, life: 1 - z.t / z.dur });
      else drawZoneFallback(ctx, z);
      Sprites.drawProp(ctx, g, 'flowerbox', z.x, z.y + 6, { seed: z.seed, t: this.time, scale: Math.min(1, z.t * 4) }); }
    for (const t of this.tele) {
      if (t.kind === 'circle' && Sprites.drawZone) Sprites.drawZone(ctx, g, 'telegraph', t.x, t.y, t.r, { t: t.t, progress: Math.min(1, t.t / t.dur) });
      else drawTelegraph(ctx, t);
    }
    for (const w of this.waves) drawWave(ctx, w);

    // Y-sorted drawables (culled to the view).
    const vx0 = cx - 120, vx1 = cx + W + 120, vy0 = cy - 120, vy1 = cy + H + 160;
    const inView = (o) => o.x > vx0 && o.x < vx1 && o.y > vy0 && o.y < vy1;
    const list = [];
    for (const p of this.arena.props) if (!p.broken && inView(p)) list.push({ y: p.y, k: 0, o: p });
    for (const e of this.enemies) if (!e.dead && inView(e)) list.push({ y: e.y, k: 1, o: e });
    for (const n of this.npcs) if (inView(n)) list.push({ y: n.y, k: 2, o: n });
    for (const p of this.pickups) if (inView(p)) list.push({ y: p.y, k: 3, o: p });
    for (const s of this.shots) if (inView(s)) list.push({ y: s.lob ? s.y : s.y + 16, k: 4, o: s });
    const h = this.hero;
    if (h && !h.down) list.push({ y: h.y, k: 5, o: h });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) this.drawItem(ctx, it.k, it.o, frost);

    this.fx.render(ctx);
    ctx.restore();

    // ---- screen space
    const wx = this.phase === 'won' ? Math.max(0, 1 - this.endT / 2) : 1;
    if (this.weather && Sprites.drawWeather && wx > 0) Sprites.drawWeather(ctx, g, this.weather, W, H, { t: this.time, camX: cx, camY: cy, intensity: wx });
    const h0 = this.hero;
    const frostAmt = Math.max(this.weather === 'blizzard' ? 0.25 * wx : 0, h0 && h0.slowT > 0 ? Math.min(0.45, h0.slowT * 0.4) : 0);
    if (frostAmt > 0 && Sprites.drawFrostOverlay) Sprites.drawFrostOverlay(ctx, W, H, frostAmt, { t: this.time });
    if (this.phase === 'won') {
      ctx.fillStyle = `rgba(255,201,74,${Math.min(0.22, this.endT * 0.1)})`;
      ctx.fillRect(0, 0, W, H);
    }
    this.drawMarkers(ctx, cx, cy);
    if (this.barkData) this.drawBark(ctx);
    drawHUD(ctx, g, this.hudData());
    if (this.phase === 'play' && this.hintT > 0 && !this.paused) {
      ctx.globalAlpha = Math.min(1, this.hintT);
      text(ctx, 'WASD move · Click/J attack · Shift/K ability · E special · Q swap · P pause', W / 2, this.mission.bossHp ? H - 46 : H - 16, { align: 'center', font: FONT.small });
      ctx.globalAlpha = 1;
    }
    if (this.phase === 'won' || this.phase === 'lost') this.drawBanner(ctx);
    if (this.paused) this.drawPause(ctx);
    this.dialog.render(ctx);
  }

  drawItem(ctx, k, o, frost) {
    const g = this.game;
    if (k === 0) {
      const p = o;
      if (p.rescue) drawFrozenNpc(ctx, g, p, this.time);
      else Sprites.drawProp(ctx, g, p.kind, p.x, p.y, { frost: p.kind === 'iceblock' || p.kind === 'icewall' ? undefined : frost, seed: p.seed, t: this.time, flash: p.flash > 0 ? p.flash : 0, region: this.p.region, hpFrac: p.maxHp ? p.hp / p.maxHp : undefined });
      if ((p.rescue || p.isCart) && p.hp < p.maxHp && p.hp > 0) bar(ctx, p.x - 20, p.y - (p.isCart ? 62 : 52), 40, 5, p.hp / p.maxHp, p.isCart ? PALETTE.mint : PALETTE.ice);
    } else if (k === 1) {
      const e = o;
      if (e.z > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r, e.r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save();
      const opts = enemyDrawOpts(e);
      ctx.globalAlpha = opts.alpha;
      Sprites.drawEnemy(ctx, g, e.type, e.x, e.y - (e.z || 0), opts);
      ctx.restore();
      if (e.stun > 0) drawStars(ctx, e.x, e.y - e.h - 8 - (e.z || 0), this.time);
    } else if (k === 2) {
      const alpha = clamp(1 - (o.t - 4) / 2, 0, 1);
      if (Sprites.drawNPC) Sprites.drawNPC(ctx, g, 'townsfolk', o.x, o.y, { seed: o.seed, frozen: false, freed: Math.min(1, o.t / 1.5), anim: o.t < 1.2 ? 'wave' : 'idle', facing: o.t < 1.2 ? Math.PI / 2 : o.ang, t: o.t, region: this.p.region, alpha });
      else drawNpcPlaceholder(ctx, o.x, o.y, o.seed, o.t, alpha);
    } else if (k === 3) {
      if (Sprites.drawPickup) Sprites.drawPickup(ctx, g, o.kind, o.x, o.y - o.z, { t: this.time + (o.seed ?? 0), flavor: o.kind === 'scoop' ? 'mint' : undefined, seed: o.seed });
      else drawPickupFallback(ctx, o, this.time);
    } else if (k === 4) {
      const s = o;
      if (s.lob) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(s.x, s.y, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
      Sprites.drawProjectile(ctx, g, s.kind, s.x, s.y - (s.z || 0), { r: s.r, angle: Math.atan2(s.vy, s.vx), vx: s.vx, vy: s.vy, t: s.t, reflected: s.reflected });
    } else if (k === 5) {
      const h = o;
      if (h.id === 'aaron' && h.atkT > 0) drawSweepArc(ctx, h, 1 - h.atkT / h.atkDur);
      Sprites.drawHero(ctx, g, h.id, h.x, h.y, heroDrawOpts(this, h));
      if (h.slowT > 0) { ctx.fillStyle = 'rgba(191,233,255,0.35)'; ctx.beginPath(); ctx.ellipse(h.x, h.y, 16, 6, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  drawMarkers(ctx, cx, cy) {
    const t = this.time;
    const pts = [];
    if (this.scoutT > 0) for (const e of this.enemies) if (!e.dead) pts.push({ x: e.x, y: e.y - e.h / 2, c: PALETTE.danger, a: Math.min(1, this.scoutT) });
    for (const p of this.arena.props) if (p.rescue && !p.broken) pts.push({ x: p.x, y: p.y - 20, c: PALETTE.sun, a: 1, offOnly: true });
    if (this.cart && this.cart.flash > 0) pts.push({ x: this.cart.x, y: this.cart.y - 20, c: PALETTE.danger, a: 1, offOnly: true });
    for (const m of pts) {
      const sx = m.x - cx, sy = m.y - cy;
      const on = sx > 10 && sx < W - 10 && sy > 70 && sy < H - 10;
      ctx.save();
      ctx.globalAlpha = m.a;
      if (on) {
        if (m.offOnly) { ctx.restore(); continue; }
        ctx.strokeStyle = m.c; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, 16 + Math.sin(t * 6) * 3, 0, Math.PI * 2); ctx.stroke();
      } else {
        const a = Math.atan2(sy - H / 2, sx - W / 2);
        const ex = clamp(sx, 24, W - 24), ey = clamp(sy, 84, H - 24);
        ctx.translate(ex, ey); ctx.rotate(a);
        ctx.fillStyle = m.c;
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  drawBark(ctx) {
    const b = this.barkData;
    const g = this.game;
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.t * 3);
    ctx.font = FONT.ui;
    const tw = Math.min(560, ctx.measureText(b.text).width + 90);
    const x = W / 2 - tw / 2, y = 78;
    panel(ctx, x, y, tw, 40, { stroke: b.who === 'baron' || b.who === 'golem' ? PALETTE.frostDeep : PALETTE.sun });
    if (HEROES[b.who]) Sprites.drawPortrait(ctx, g, b.who, x + 22, y + 20, 15);
    else text(ctx, b.who === 'baron' ? 'Baron:' : b.who === 'golem' ? 'Golem:' : '', x + 10, y + 26, { font: FONT.small, color: PALETTE.frost });
    text(ctx, b.text, x + (HEROES[b.who] ? 46 : 58), y + 26);
    ctx.restore();
  }

  drawBanner(ctx) {
    const victory = this.outcome === 'win';
    const k = Math.min(1, this.endT * 2.5);
    ctx.save();
    ctx.globalAlpha = k;
    panel(ctx, W / 2 - 280, 170, 560, 130, { stroke: victory ? PALETTE.sun : PALETTE.frostDeep });
    const title = victory ? (this.bossType === 'baron_brrr' ? 'THE BARON IS BEATEN!' : 'SUMMER RESTORED!') : this.retreated ? 'RETREAT!' : 'BRAIN FREEZE...';
    text(ctx, title, W / 2, 230, { align: 'center', font: FONT.big, color: victory ? PALETTE.sun : PALETTE.frost });
    const sub = victory ? `+${this.scoops} scoops${this.sunshine ? ` · +${this.sunshine} sunshine` : ''} · ${this.defeated} Syndicate thawed` : 'The Syndicate holds this ground... for now.';
    text(ctx, sub, W / 2, 270, { align: 'center' });
    ctx.restore();
  }

  drawPause(ctx) {
    const g = this.game;
    ctx.fillStyle = 'rgba(16,19,31,0.6)';
    ctx.fillRect(0, 0, W, H);
    panel(ctx, W / 2 - 230, 110, 460, 320);
    text(ctx, 'Paused', W / 2, 160, { align: 'center', font: FONT.big, color: PALETTE.sun });
    const lines = ['WASD / arrows: move  ·  mouse: aim', 'Click / J: attack  ·  Shift / right-click / K: ability', 'E / L: special  ·  Q / Tab: swap hero', 'Esc / P: resume'];
    lines.forEach((l, i) => text(ctx, l, W / 2, 196 + i * 22, { align: 'center', font: FONT.small }));
    button(ctx, g, 'Resume', W / 2 - 110, 300, 220, 44);
    button(ctx, g, 'Retreat to camp', W / 2 - 110, 354, 220, 44);
  }

  hudData() {
    const heroes = {};
    for (const id of HERO_IDS) {
      const h = this.heroes[id];
      heroes[id] = {
        hp: Math.max(0, Math.round(h.hp)), maxHp: h.maxHp, down: h.down,
        cooldowns: { ability: h.cd.ability / h.tune.cd.ability, special: h.cd.special / h.tune.cd.special },
      };
    }
    const obj = this.mission.objective(this);
    const hud = { active: this.activeId, heroes, objective: obj.text, progress: obj.progress, scoops: this.scoops, sunshine: this.sunshine };
    const bh = this.mission.bossHp?.(this);
    if (bh) hud.bossHp = bh;
    if (this.phase === 'intro') hud.objective = MISSION_KINDS[this.p.kind];
    return hud;
  }
}

// ------------------------------------------------------------ tiny local drawings
function drawStars(ctx, x, y, t) {
  ctx.fillStyle = PALETTE.sun;
  for (let i = 0; i < 3; i++) {
    const a = t * 5 + (i * Math.PI * 2) / 3;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * 10, y + Math.sin(a) * 3, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBucket(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(x, y, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.sky;
  ctx.beginPath(); ctx.moveTo(x - 6, y - 11); ctx.lineTo(x + 6, y - 11); ctx.lineTo(x + 4.5, y); ctx.lineTo(x - 4.5, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y - 11, 6, Math.PI, 0); ctx.stroke();
  ctx.restore();
}

function drawFrozenNpc(ctx, g, p, t) {
  const frozen = 0.3 + 0.7 * Math.max(0, p.hp / p.maxHp);
  if (Sprites.drawNPC) Sprites.drawNPC(ctx, g, 'townsfolk', p.x, p.y, { seed: p.npcSeed, frozen, t, flash: p.flash > 0 ? p.flash : 0 });
  else drawNpcPlaceholder(ctx, p.x, p.y - 2, p.npcSeed, 0, 0.9, true);
}
