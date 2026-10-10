// v2 enemy roster: creation + one behavior per theme.ENEMIES role. Owned by: action team.
// Bosses live in bosses.js. Looks come from art's drawEnemy (fallbacks in draw.js).
import { ENEMIES, PALETTE } from '../core/theme.js';
import { dist, angleTo } from '../core/math.js';
import { playSfx } from '../audio/sfx.js';
import { collide, inWater, isOpen } from './arena.js';
import { angDiff, hurtHero, lob, addTelegraph, addZone, spawnShot, spawnPickup } from './combat.js';
import { BOSS_AI, BOSS_SHAPE } from './bosses.js';
import { CREEPY_AI, CREEPY_INIT, CREEPY_SHAPE } from './creepies.js';

// r = body radius, h = sprite height (for hit/label placement), mass = knockback resistance
const SHAPE = {
  beetle: { r: 11, h: 20, mass: 1, color: '#7fd8a6' },
  moth: { r: 10, h: 30, mass: 0.7, flying: true, color: '#c9d4ff' },
  cable_spider: { r: 15, h: 26, mass: 1.6, color: '#4a4f63' },
  dough_blob: { r: 17, h: 28, mass: 1.4, color: '#f3dcae' },
  toaster: { r: 16, h: 34, mass: 99, color: '#c8d0dc' },
  kettle: { r: 16, h: 36, mass: 2, color: '#d9534f' },
  flying_plate: { r: 12, h: 30, mass: 0.6, flying: true, color: '#fff6e5' },
  chair: { r: 16, h: 40, mass: 2.2, color: '#8a5a3a' },
  dust_bunny: { r: 10, h: 20, mass: 0.7, color: '#b7aebf' },
  card_soldier: { r: 12, h: 38, mass: 1.1, color: '#e9e2d2' },
  pawn: { r: 14, h: 36, mass: 1.8, color: '#f3efe6' },
  jack_box: { r: 18, h: 34, mass: 99, color: '#5aa4e6' },
  lint: { r: 8, h: 16, mass: 0.5, color: '#b9b6c8' },
  hanger: { r: 13, h: 34, mass: 0.8, flying: true, color: '#d8dce4' },
  rubber_duck: { r: 11, h: 22, mass: 0.8, color: '#ffd23f' },
  pipe_snake: { r: 13, h: 22, mass: 1.4, color: '#7e8a97' },
  gnome: { r: 12, h: 34, mass: 1.3, color: '#d9534f' },
  vine: { r: 16, h: 40, mass: 99, color: '#3f7a4a' },
  code_fish: { r: 13, h: 24, mass: 0.9, color: '#6fb7e8' },
  ...BOSS_SHAPE,
  ...CREEPY_SHAPE,
};

/**
 * Create an enemy (not yet added). opts: { boss?, hpMul?, dmgMul?, speedMul?, scale?, spawnDelay?, hidden?, counts?, ...fields }
 */
export function createEnemy(L, type, x, y, opts = {}) {
  const base = ENEMIES[type] ?? ENEMIES.beetle;
  const shape = SHAPE[base.id] ?? SHAPE.beetle;
  const s = L.scl;
  const scale = opts.scale ?? 1;
  const hp = Math.max(1, Math.round(base.hp * (opts.hpMul ?? 1) * s.hp));
  const R = Math.random;
  const e = {
    type: base.id, name: base.name, x, y,
    r: shape.r * scale, h: shape.h * scale, mass: shape.mass * scale, scale, color: shape.color,
    flying: !!shape.flying, electronic: !!base.electronic, boss: !!base.boss,
    hp, maxHp: hp,
    speed: base.speed * s.speed * (opts.speedMul ?? 1) * (0.9 + R() * 0.2),
    damage: base.damage * s.dmg * (opts.dmgMul ?? 1),
    facing: angleTo(x, y, L.hero?.x ?? x, L.hero?.y ?? y),
    stun: 0, flash: 0, kvx: 0, kvy: 0, slowT: 0, burnT: 0, snareT: 0, markT: 0, tauntT: 0, invuln: 0, z: 0,
    spawning: opts.spawnDelay ?? 0.7,
    state: 'move', st: 0,
    atkCd: (0.8 + R() * 1.4) * s.aggro, contactCd: 0,
    animT: R() * 5, anim: 'move', phase: 1,
    seed: Math.floor(R() * 1000),
    counts: opts.counts ?? true,
  };
  for (const k of Object.keys(opts)) if (!['hpMul', 'dmgMul', 'speedMul', 'scale', 'spawnDelay'].includes(k)) e[k] = opts[k];
  if (e.boss) e.mass = shape.mass;
  (INIT[e.type] ?? CREEPY_INIT[e.type])?.(L, e);
  return e;
}

// ---------------------------------------------------------------- shared movement
/** Steer toward (tx,ty) with simple prop avoidance. Returns the heading used. */
export function steer(L, e, tx, ty, speed, dt) {
  let dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d; dy /= d;
  let ax = dx, ay = dy;
  if (!e.flying) for (const p of L.arena.props) {
    if (!p.solid || p.broken) continue;
    const pcy = p.w ? p.y - p.d / 2 : p.y;
    const px = p.x - e.x, py = pcy - e.y;
    const pd = Math.hypot(px, py);
    const reach = p.rr + e.r + 30;
    if (pd > reach || pd > d + p.rr) continue;
    if (px * dx + py * dy <= 0) continue;
    const cross = dx * py - dy * px;
    const side = cross > 0 ? -1 : 1;
    const w = (reach - pd) / reach * 1.8;
    ax += (-py / pd) * side * w; ay += (px / pd) * side * w;
  }
  const al = Math.hypot(ax, ay) || 1;
  e.x += (ax / al) * speed * dt;
  e.y += (ay / al) * speed * dt;
  return Math.atan2(ay, ax);
}

function contact(L, e, dmg, cd = 0.9, o = {}) {
  const h = L.hero;
  if (!h || h.down || e.contactCd > 0) return false;
  if (dist(e.x, e.y, h.x, h.y) < e.r + h.r + 4) {
    const r = hurtHero(L, dmg, e.x, e.y, { knock: 170, kind: 'melee', src: e, ...o });
    e.contactCd = cd;
    return r === 'hit';
  }
  return false;
}

/** Wants to keep distance? Taunted enemies come close instead. */
const keepAway = (e, want) => (e.tauntT > 0 ? 40 : want);

function orbit(L, e, want, sp, dt) {
  const h = L.hero;
  const d = dist(e.x, e.y, h.x, h.y);
  e.strafeT = (e.strafeT ?? 2) - dt;
  if (e.strafeT <= 0) { e.strafe = -(e.strafe ?? 1); e.strafeT = 1.5 + Math.random() * 2; }
  const radial = d > want + 40 ? 1 : d < want - 60 ? -1 : 0;
  const a = angleTo(e.x, e.y, h.x, h.y);
  const mx = Math.cos(a) * radial + Math.cos(a + Math.PI / 2) * (e.strafe ?? 1) * 0.7;
  const my = Math.sin(a) * radial + Math.sin(a + Math.PI / 2) * (e.strafe ?? 1) * 0.7;
  const ml = Math.hypot(mx, my) || 1;
  e.x += (mx / ml) * sp * dt; e.y += (my / ml) * sp * dt;
  e.facing = a;
}

// ---------------------------------------------------------------- update loop
export function updateEnemies(L, dt) {
  const list = L.enemies;
  const h = L.hero;
  for (const e of list) {
    if (e.dead) continue;
    e.animT += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.hintCd = Math.max(0, (e.hintCd ?? 0) - dt);
    if (e.spawning > 0) {
      e.spawning -= dt;
      if (Math.random() < 0.4) L.fx.burst(e.x + (Math.random() - 0.5) * 30, e.y - 10, L.accent, 1, 40);
      continue;
    }
    e.contactCd = Math.max(0, e.contactCd - dt);
    e.atkCd -= dt;
    e.invuln = Math.max(0, e.invuln - dt);
    e.slowT = Math.max(0, e.slowT - dt);
    e.markT = Math.max(0, e.markT - dt);
    e.tauntT = Math.max(0, e.tauntT - dt);
    e.snareT = Math.max(0, e.snareT - dt);
    if (e.burnT > 0) {
      e.burnT -= dt;
      e.burnTick = (e.burnTick ?? 0) - dt;
      if (e.burnTick <= 0) { e.burnTick = 0.5; e.hp -= Math.max(1, Math.round((h?.damage ?? 16) * 0.25)); e.flash = 0.06; L.fx.burst(e.x, e.y - e.h * 0.6, PALETTE.sunDeep, 3, 50); if (e.hp <= 0) { L.killEnemy(e); continue; } }
    }
    e.x += e.kvx * dt; e.y += e.kvy * dt;
    const f = Math.exp(-7 * dt);
    e.kvx *= f; e.kvy *= f;
    const ox = e.x, oy = e.y;
    if (e.stun > 0) {
      e.stun -= dt;
      e.anim = 'hurt';
      if (!e.boss && e.state !== 'move' && !e.keepState) { e.state = 'move'; e.st = 0; if (e.tele) e.tele.dead = true; }
      if (Math.random() < 0.12) L.fx.burst(e.x, e.y - e.h - 6, PALETTE.sun, 1, 30);
    } else if (h && !h.down) {
      const sp = e.speed * (e.slowT > 0 ? 0.5 : 1);
      (BOSS_AI[e.type] ?? AI[e.type] ?? CREEPY_AI[e.type])?.(L, e, dt, sp);
    }
    if (e.snareT > 0 && !e.boss) { e.x = ox; e.y = oy; }
    if (e.anchored) { e.x = e.ax; e.y = e.ay; }
    else if (!e.noCollide) e.bumped = collide(L.arena, e, { flying: e.flying, swim: e.swim });
  }
  // Separation so swarms surround instead of stacking.
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead || a.spawning > 0 || a.flying || a.hidden) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead || b.spawning > 0 || b.flying || b.hidden) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const min = a.r + b.r + 2;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min && d2 > 0.0001) {
        const d = Math.sqrt(d2), push = (min - d) / 2;
        const wa = Math.min(1, b.mass / (a.mass + b.mass)), wb = 1 - wa;
        if (!a.anchored) { a.x -= (dx / d) * push * 2 * wa; a.y -= (dy / d) * push * 2 * wa; }
        if (!b.anchored) { b.x += (dx / d) * push * 2 * wb; b.y += (dy / d) * push * 2 * wb; }
      }
    }
  }
  // Keep enemies from standing inside the hero.
  if (h && !h.down) for (const e of list) {
    if (e.dead || e.spawning > 0 || e.flying || e.hidden || e.z > 4) continue;
    const d = dist(e.x, e.y, h.x, h.y), min = e.r + h.r;
    if (d < min && d > 0.01) {
      const push = min - d;
      const heavy = e.anchored || e.mass > 3;
      if (!heavy) { e.x += ((e.x - h.x) / d) * push * 0.6; e.y += ((e.y - h.y) / d) * push * 0.6; }
      const hk = heavy ? 1 : 0.4;
      h.x -= ((e.x - h.x) / d) * push * hk; h.y -= ((e.y - h.y) / d) * push * hk;
    }
  }
}

// ---------------------------------------------------------------- per-type setup
// Rubber duck variety (guest bedroom): every duck rolls one of these. Looks are painted by foes_yard.js
// rubber_duck from e.duck; a few also change how the duck plays. w = roll weight.
const DUCKS = [
  { id: 'classic', w: 4, name: 'Rubber Duck' },
  { id: 'duckling', w: 3, name: 'Duckling', scale: 0.7, hp: 0.5, speed: 1.35, body: '#fff07a', deep: '#e8c43a' },
  { id: 'mama', w: 1, name: 'Mama Duck', scale: 1.5, hp: 2.6, speed: 0.8, dmg: 1.3, bonnet: true },
  { id: 'pirate', w: 2, name: 'Pirate Duck', patch: true, bandana: '#d9343f' },
  { id: 'devil', w: 2, name: 'Devil Duck', body: '#e0453a', deep: '#a82a22', beak: '#2b2232', horns: true, tail: true },
  { id: 'ninja', w: 2, name: 'Ninja Duck', body: '#3a3046', deep: '#1d1826', mask: '#d9343f', dash: true },
  { id: 'ghost', w: 1, name: 'Ghost Duck', body: '#eef6ff', deep: '#b9cde0', beak: '#cfe0f0', ghost: true, speed: 1.1 },
  { id: 'zombie', w: 1, name: 'Zombie Duck', body: '#9cc48a', deep: '#6d8f5e', beak: '#b88a5a', stitches: true, xeye: true, speed: 0.75, hp: 1.6 },
  { id: 'disco', w: 1, name: 'Disco Duck', disco: true, shades: true },
  { id: 'cool', w: 2, name: 'Cool Duck', shades: true },
  { id: 'viking', w: 1, name: 'Viking Duck', helmet: true, hp: 1.4 },
  { id: 'drummer', w: 1, name: 'Drummer Duck', shako: true }, // Marching Ravens shako
  { id: 'wizard', w: 1, name: 'Wizard Duck', wizard: true },
  { id: 'punk', w: 1, name: 'Punk Duck', body: '#ff8fb1', deep: '#d9607f', mohawk: '#7fd8a6' },
  { id: 'squirt', w: 2, name: 'Squirt Duck', body: '#7fc8f0', deep: '#4f8fb3', squirt: true },
  { id: 'golden', w: 0.5, name: 'Golden Duck', body: '#f5b908', deep: '#a8740a', beak: '#fff1a8', gold: true, hp: 1.8, speed: 1.25 },
];
const DUCK_W = DUCKS.reduce((a, d) => a + d.w, 0);
function rollDuck(L) {
  let r = Math.random() * DUCK_W;
  for (const d of DUCKS) if ((r -= d.w) <= 0) return d;
  return DUCKS[0];
}

const INIT = {
  toaster(L, e) { e.anchored = true; e.ax = e.x; e.ay = e.y; },
  jack_box(L, e) { e.anchored = true; e.ax = e.x; e.ay = e.y; e.hidden = true; e.state = 'closed'; },
  vine(L, e) { e.anchored = true; e.ax = e.x; e.ay = e.y; },
  dough_blob(L, e) {
    e.gen = e.gen ?? 0;
    e.onHurt = (LL, me) => {
      if (me.gen >= 2 || me.hp <= 0 || me.hp < 6) return;
      // split in two: this blob shrinks, a twin pops out
      me.gen++;
      me.scale *= 0.78; me.r *= 0.78; me.h *= 0.78; me.mass *= 0.7;
      me.maxHp = Math.max(1, Math.round(me.maxHp / 2)); me.hp = Math.min(me.hp, me.maxHp);
      const a = Math.random() * Math.PI * 2;
      const twin = LL.spawnEnemy('dough_blob', me.x + Math.cos(a) * 20, me.y + Math.sin(a) * 14, { gen: me.gen, spawnDelay: 0.05, hpMul: 0 });
      twin.scale = me.scale; twin.r = me.r; twin.h = me.h; twin.mass = me.mass; twin.maxHp = me.maxHp; twin.hp = me.hp;
      twin.kvx = Math.cos(a) * 220; twin.kvy = Math.sin(a) * 220;
      LL.fx.splat?.(me.x, me.y, '#f3dcae', 8);
      LL.fx.floatText(me.x, me.y - me.h - 18, 'split!', '#f3dcae');
      playSfx('squish');
    };
  },
  pawn(L, e) { e.hopCd = 0.4 + Math.random() * 0.6; },
  rubber_duck(L, e) {
    const d = e.duck ? DUCKS.find((x) => x.id === e.duck.id) ?? rollDuck(L) : rollDuck(L);
    e.duck = d; e.name = d.name; e.dashT = 1 + Math.random() * 2; e.squirtT = 2 + Math.random() * 3;
    if (d.scale) { e.scale *= d.scale; e.r *= d.scale; e.h *= d.scale; e.mass *= d.scale; }
    if (d.hp) { e.maxHp = Math.max(1, Math.round(e.maxHp * d.hp)); e.hp = e.maxHp; }
    if (d.speed) e.speed *= d.speed;
    if (d.dmg) e.damage *= d.dmg;
    if (d.gold) e.onDeath = (LL, me) => { spawnPickup(LL, 'heart', me.x, me.y); LL.fx.sparkle?.(me.x, me.y - 10, '#ffd96a', 14, 30); LL.fx.floatText(me.x, me.y - 40, 'Golden duck!', '#ffd96a', { big: true }); };
  },
  code_fish(L, e) { e.swim = true; e.hidden = !!inWater(L.arena, e.x, e.y); e.state = e.hidden ? 'swim' : 'flop'; e.st = e.hidden ? 1 + Math.random() * 2 : 1; },
  pipe_snake(L, e) {
    // emerges from the nearest wall
    e.state = 'lurk'; e.hidden = true; e.st = 1 + Math.random() * 1.2; e.noCollide = true;
  },
  gnome(L, e) { e.marchT = Math.random(); },
  card_soldier(L, e) {},
};

// ---------------------------------------------------------------- behaviors (one per role)
const AI = {
  // swarmer: scuttles in zig-zags, quick lunge when close
  beetle(L, e, dt, sp) {
    const h = L.hero;
    const d = dist(e.x, e.y, h.x, h.y);
    if (e.state === 'lunge') {
      e.st -= dt; e.anim = 'attack';
      e.x += Math.cos(e.facing) * sp * 3.4 * dt; e.y += Math.sin(e.facing) * sp * 3.4 * dt;
      contact(L, e, e.damage, 0.8);
      if (e.st <= 0) { e.state = 'move'; e.atkCd = (1.3 + Math.random()) * L.scl.aggro; }
      return;
    }
    if (e.state === 'wind') {
      e.st -= dt; e.anim = 'attack';
      if (e.st <= 0) { e.state = 'lunge'; e.st = 0.22; }
      return;
    }
    e.anim = 'move';
    const zig = Math.sin(e.animT * 7 + e.seed) * 0.6;
    const a = angleTo(e.x, e.y, h.x, h.y) + (d > 90 ? zig : 0);
    e.facing = steer(L, e, e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 50, sp, dt);
    contact(L, e, e.damage * 0.7, 1);
    if (d < 90 && e.atkCd <= 0) { e.state = 'wind'; e.st = 0.3 * L.scl.tele; e.facing = angleTo(e.x, e.y, h.x, h.y); }
  },

  // erratic flyer: flutters around you, then dives through
  moth(L, e, dt, sp) {
    const h = L.hero;
    e.z = 16 + Math.sin(e.animT * 9) * 4;
    if (e.state === 'dive') {
      e.st -= dt; e.anim = 'attack';
      e.x += Math.cos(e.facing) * 380 * dt; e.y += Math.sin(e.facing) * 380 * dt;
      contact(L, e, e.damage, 0.9);
      if (e.st <= 0) { e.state = 'move'; e.atkCd = (2 + Math.random() * 1.5) * L.scl.aggro; }
      return;
    }
    if (e.state === 'wind') { e.st -= dt; e.anim = 'attack'; e.facing = angleTo(e.x, e.y, h.x, h.y); if (e.st <= 0) { e.state = 'dive'; e.st = 0.45; } return; }
    e.anim = 'move';
    e.wob = (e.wob ?? Math.random() * 6) + dt * (2 + Math.sin(e.animT) * 1.5);
    const want = keepAway(e, 110);
    const a = angleTo(h.x, h.y, e.x, e.y) + Math.sin(e.wob) * 0.9;
    const tx = h.x + Math.cos(a) * want, ty = h.y + Math.sin(a) * want * 0.8;
    const jitter = Math.sin(e.animT * 13 + e.seed) * 50;
    e.x += ((tx - e.x) * 1.6 + jitter) * dt * (sp / 130); e.y += ((ty - e.y) * 1.6 - jitter * 0.6) * dt * (sp / 130);
    e.facing = angleTo(e.x, e.y, h.x, h.y);
    if (e.atkCd <= 0 && dist(e.x, e.y, h.x, h.y) < 200) { e.state = 'wind'; e.st = 0.45 * L.scl.tele; }
  },

  // webs that slow: keeps distance, lobs web blobs that leave sticky patches
  cable_spider(L, e, dt, sp) {
    const h = L.hero;
    if (e.state === 'wind') {
      e.st -= dt; e.anim = 'attack';
      if (e.st <= 0) {
        lob(L, 'web', e.x, e.y - e.h, h.x + h.kvx * 0.1, h.y, e.damage * 0.6, { splash: 40, slow: 1.5, color: PALETTE.paper,
          onLand: (LL, s) => addZone(LL, { kind: 'web', x: s.x, y: s.y, r: 52, dur: 5 }) });
        playSfx('throw');
        e.state = 'move'; e.atkCd = (2.6 + Math.random()) * L.scl.aggro;
      }
      return;
    }
    e.anim = 'move';
    orbit(L, e, keepAway(e, 230), sp, dt);
    contact(L, e, e.damage, 1);
    if (e.atkCd <= 0 && dist(e.x, e.y, h.x, h.y) < 420) { e.state = 'wind'; e.st = 0.5 * L.scl.tele; }
  },

  // splits in two when hit (see INIT); oozes and belly-flops
  dough_blob(L, e, dt, sp) {
    const h = L.hero;
    const d = dist(e.x, e.y, h.x, h.y);
    if (e.state === 'wind') {
      e.st -= dt; e.anim = 'attack';
      if (e.st <= 0) { e.state = 'flop'; e.st = 0.35; e.fx0 = e.x; e.fy0 = e.y; }
      return;
    }
    if (e.state === 'flop') {
      e.st -= dt;
      const k = 1 - e.st / 0.35;
      e.x = e.fx0 + (e.tx - e.fx0) * k; e.y = e.fy0 + (e.ty - e.fy0) * k; e.z = Math.sin(Math.PI * k) * 26;
      if (e.st <= 0) {
        e.z = 0; e.state = 'move'; e.atkCd = (2 + Math.random()) * L.scl.aggro;
        L.fx.splat?.(e.x, e.y, '#f3dcae', 6);
        if (dist(e.x, e.y, h.x, h.y) < 44 + h.r) hurtHero(L, e.damage, e.x, e.y, { kind: 'melee', knock: 200, src: e });
        playSfx('squish');
      }
      return;
    }
    e.anim = 'move';
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(e.animT * 3));
    e.facing = steer(L, e, h.x, h.y, sp * pulse, dt);
    contact(L, e, e.damage * 0.7, 1);
    if (d < 130 && e.atkCd <= 0) {
      e.state = 'wind'; e.st = 0.55 * L.scl.tele; e.tx = h.x; e.ty = h.y;
      addTelegraph(L, { kind: 'circle', x: h.x, y: h.y, r: 44, dur: e.st + 0.35 });
    }
  },

  // turret: aims, telegraphs, fires two slices of toast
  toaster(L, e, dt) {
    const h = L.hero;
    e.facing = angleTo(e.x, e.y, h.x, h.y);
    if (e.state === 'wind') {
      e.st -= dt; e.anim = 'attack';
      if (e.tele) e.tele.ang = angleTo(e.x, e.y - 16, h.x, h.y - 16);
      if (e.st <= 0) {
        const a = angleTo(e.x, e.y - 16, h.x, h.y - 16);
        for (const off of [-0.09, 0.09]) spawnShot(L, { kind: 'toast', team: 'enemy', x: e.x, y: e.y - 22, vx: Math.cos(a + off) * 330, vy: Math.sin(a + off) * 330, r: 8, dmg: e.damage, life: 2.2, color: '#d8a25a' });
        playSfx('throw'); L.fx.burst(e.x, e.y - 30, '#d8a25a', 6, 120);
        e.state = 'move'; e.atkCd = (2.2 + Math.random() * 0.8) * L.scl.aggro;
      }
      return;
    }
    e.anim = 'idle';
    if (e.atkCd <= 0 && dist(e.x, e.y, h.x, h.y) < 560) {
      e.state = 'wind'; e.st = 0.7 * L.scl.tele;
      e.tele = addTelegraph(L, { kind: 'line', x: e.x, y: e.y - 16, ang: e.facing, len: 340, width: 26, dur: e.st });
    }
  },

  // steam cone: plods closer, whistles (telegraph), blasts steam
  kettle(L, e, dt, sp) {
    const h = L.hero;
    const d = dist(e.x, e.y, h.x, h.y);
    if (e.state === 'wind') {
      e.st -= dt; e.anim = 'attack';
      if (Math.random() < 0.4) L.fx.burst(e.x, e.y - e.h, PALETTE.paper, 1, 40);
      if (e.st <= 0) { e.state = 'steam'; e.st = 0.6; playSfx('error'); }
      return;
    }
    if (e.state === 'steam') {
      e.st -= dt; e.anim = 'attack';
      for (let i = 0; i < 3; i++) { const a = e.facing + (Math.random() - 0.5) * 0.9, r = Math.random() * 150; L.fx.burst(e.x + Math.cos(a) * r, e.y - 20 + Math.sin(a) * r, 'rgba(255,255,255,0.9)', 1, 30); }
      if (d < 160 + h.r && angDiff(angleTo(e.x, e.y, h.x, h.y), e.facing) < 0.5) hurtHero(L, e.damage, e.x, e.y, { kind: 'melee', knock: 260, src: e });
      if (e.st <= 0) { e.state = 'move'; e.atkCd = (2.4 + Math.random()) * L.scl.aggro; }
      return;
    }
    e.anim = 'move';
    e.facing = steer(L, e, h.x, h.y, sp, dt);
    if (d < 150 && e.atkCd <= 0) {
      e.state = 'wind'; e.st = 0.8 * L.scl.tele; e.facing = angleTo(e.x, e.y, h.x, h.y);
      e.tele = addTelegraph(L, { kind: 'cone', x: e.x, y: e.y, r: 160, ang: e.facing, arc: 1.0, dur: e.st });
    }
  },

  // frisbee arcs: curving throws past you, then a hover to recover
  flying_plate(L, e, dt, sp) {
    const h = L.hero;
    e.z = 18 + Math.sin(e.animT * 6) * 3;
    if (e.state === 'fly') {
      e.st -= dt; e.anim = 'attack';
      const a = Math.atan2(e.vy, e.vx) + e.curve * dt;
      e.vx = Math.cos(a) * sp * 2.4; e.vy = Math.sin(a) * sp * 2.4;
      e.x += e.vx * dt; e.y += e.vy * dt; e.facing = a;
      contact(L, e, e.damage, 0.7);
      if (e.st <= 0) { e.state = 'move'; e.atkCd = (0.9 + Math.random() * 0.8) * L.scl.aggro; }
      return;
    }
    e.anim = 'move';
    orbit(L, e, keepAway(e, 200), sp * 0.5, dt);
    if (e.atkCd <= 0) {
      e.state = 'fly'; e.st = 1.3;
      e.curve = (Math.random() < 0.5 ? -1 : 1) * 1.6;
      const a = angleTo(e.x, e.y, h.x, h.y) - e.curve * 0.55;
      e.vx = Math.cos(a); e.vy = Math.sin(a);
      playSfx('throw');
    }
  },

  // telegraphed charge: scrapes, glows, bulls straight ahead; dizzy if it hits furniture
  chair(L, e, dt, sp) {
    const h = L.hero;
    const d = dist(e.x, e.y, h.x, h.y);
    if (e.state === 'wind') {
      e.st -= dt; e.anim = 'attack';
      if (Math.random() < 0.3) L.fx.burst(e.x, e.y, '#8a5a3a', 1, 50);
      if (e.st <= 0) { e.state = 'charge'; e.st = 0.75; playSfx('dash'); }
      return;
    }
    if (e.state === 'charge') {
      e.st -= dt; e.anim = 'attack';
      e.x += Math.cos(e.facing) * 440 * dt; e.y += Math.sin(e.facing) * 440 * dt;
      contact(L, e, e.damage, 0.8, { knock: 340 });
      if (e.bumped) { e.stun = 1.6; e.state = 'move'; L.fx.floatText(e.x, e.y - e.h - 12, 'dizzy!', PALETTE.sun); L.fx.addShake(4); playSfx('hit'); e.atkCd = 2; }
      else if (e.st <= 0) { e.state = 'move'; e.atkCd = (1.6 + Math.random()) * L.scl.aggro; }
      return;
    }
    e.anim = 'move';
    e.facing = steer(L, e, h.x, h.y, sp * 0.4, dt);
    contact(L, e, e.damage * 0.6, 1);
    if (d < 380 && e.atkCd <= 0) {
      e.state = 'wind'; e.st = 0.85 * L.scl.tele; e.facing = angleTo(e.x, e.y, h.x, h.y);
      e.tele = addTelegraph(L, { kind: 'line', x: e.x, y: e.y, ang: e.facing, len: 330, width: e.r * 2 + 10, dur: e.st });
    }
  },

  // fast hopper, flees: darts in, nips, then bolts away
  dust_bunny(L, e, dt, sp) {
    const h = L.hero;
    const d = dist(e.x, e.y, h.x, h.y);
    e.z = Math.abs(Math.sin(e.animT * 10)) * 6;
    if (e.fleeT > 0 && !(e.tauntT > 0)) {
      e.fleeT -= dt; e.anim = 'move';
      const a = angleTo(h.x, h.y, e.x, e.y);
      e.facing = steer(L, e, e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80, sp * 1.1, dt);
      return;
    }
    e.anim = 'move';
    e.facing = steer(L, e, h.x, h.y, sp, dt);
    if (contact(L, e, e.damage, 0.6) || (d < 60 && h.atkT > 0)) e.fleeT = 1.4 + Math.random();
  },

  // formation marcher: rows march in step, then break rank to stab when close
  card_soldier(L, e, dt, sp) {
    const h = L.hero;
    const d = dist(e.x, e.y, h.x, h.y);
    const F = e.form;
    if (e.state === 'wind') {
      e.st -= dt; e.anim = 'attack';
      if (e.st <= 0) {
        e.state = 'move'; e.atkCd = (1.6 + Math.random()) * L.scl.aggro; e.broke = true;
        e.x += Math.cos(e.facing) * 12; e.y += Math.sin(e.facing) * 12;
        if (dist(e.x, e.y, h.x, h.y) < 70 + h.r && angDiff(angleTo(e.x, e.y, h.x, h.y), e.facing) < 0.6) hurtHero(L, e.damage, e.x, e.y, { kind: 'melee', knock: 220, src: e });
        playSfx('swing');
      }
      return;
    }
    e.anim = 'move';
    if (F && !e.broke && d > 120 && !(e.tauntT > 0)) {
      // formation: leader advances the shared center once per frame
      if (F.t !== L.time) {
        F.t = L.time;
        const want = angleTo(F.x, F.y, h.x, h.y);
        let da = ((want - F.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        F.ang += Math.max(-0.8 * dt, Math.min(0.8 * dt, da));
        const step = Math.sin(L.time * 6) > 0 ? 1 : 0.35; // marching cadence
        F.x += Math.cos(F.ang) * sp * step * dt; F.y += Math.sin(F.ang) * sp * step * dt;
      }
      const px = -Math.sin(F.ang), py = Math.cos(F.ang);
      const tx = F.x + px * e.slot * 40, ty = F.y + py * e.slot * 40;
      e.facing = steer(L, e, tx, ty, Math.min(sp * 1.6, dist(e.x, e.y, tx, ty) * 6), dt);
      e.facing = F.ang;
    } else {
      e.facing = steer(L, e, h.x, h.y, sp, dt);
    }
    if (d < 75 && e.atkCd <= 0) {
      e.state = 'wind'; e.st = 0.45 * L.scl.tele; e.facing = angleTo(e.x, e.y, h.x, h.y);
      e.tele = addTelegraph(L, { kind: 'cone', x: e.x, y: e.y, r: 72, ang: e.facing, arc: 0.9, dur: e.st });
    }
  },

  // hops grid squares like a chess pawn; captures diagonally
  pawn(L, e, dt) {
    const h = L.hero, G = 64;
    if (e.state === 'hop') {
      e.st -= dt;
      const k = 1 - e.st / e.hopDur;
      e.x = e.hx0 + (e.htx - e.hx0) * k; e.y = e.hy0 + (e.hty - e.hy0) * k; e.z = Math.sin(Math.PI * Math.min(1, k)) * (e.capture ? 26 : 16);
      e.anim = e.capture ? 'attack' : 'move';
      if (e.st <= 0) {
        e.z = 0; e.state = 'move';
        L.fx.burst(e.x, e.y, '#d8cfb8', 4, 60);
        if (e.capture) { if (dist(e.x, e.y, h.x, h.y) < 40 + h.r) hurtHero(L, e.damage * 1.3, e.x, e.y, { kind: 'melee', knock: 260, src: e }); playSfx('card'); e.capture = false; }
      }
      return;
    }
    e.anim = 'idle';
    e.hopCd -= dt;
    if (e.hopCd > 0) return;
    const dx = h.x - e.x, dy = h.y - e.y;
    let tx = e.x, ty = e.y;
    e.capture = false;
    if (Math.abs(dx) > 26 && Math.abs(dy) > 26 && Math.abs(dx) < G * 1.6 && Math.abs(dy) < G * 1.6 && e.atkCd <= 0) {
      tx = e.x + Math.sign(dx) * G; ty = e.y + Math.sign(dy) * G; e.capture = true; e.atkCd = 2 * L.scl.aggro;
      addTelegraph(L, { kind: 'circle', x: tx, y: ty, r: 40, dur: 0.4 * L.scl.tele + 0.35 });
      e.hopCd = 0.4 * L.scl.tele;
      e.pending = { tx, ty };
      return;
    }
    if (e.pending) { tx = e.pending.tx; ty = e.pending.ty; e.pending = null; e.capture = true; }
    else if (Math.abs(dx) > Math.abs(dy)) tx += Math.sign(dx) * G; else ty += Math.sign(dy) * G;
    if (!e.capture && !isOpen(L.arena, tx, ty, e.r)) { if (Math.abs(dx) > Math.abs(dy)) { tx = e.x; ty = e.y + Math.sign(dy || 1) * G; } else { ty = e.y; tx = e.x + Math.sign(dx || 1) * G; } }
    e.hx0 = e.x; e.hy0 = e.y; e.htx = tx; e.hty = ty;
    e.hopDur = e.capture ? 0.35 : 0.3; e.st = e.hopDur; e.state = 'hop';
    e.facing = angleTo(e.x, e.y, tx, ty);
    e.hopCd = (0.55 + Math.random() * 0.3) * L.scl.aggro;
  },

  // pop-up ambush: looks like a toy chest until you come close
  jack_box(L, e, dt) {
    const h = L.hero;
    const d = dist(e.x, e.y, h.x, h.y);
    e.st -= dt;
    if (e.state === 'closed') {
      e.anim = 'idle';
      e.armored = !e.hidden; e.armorHint = 'Closed! Wait for the pop.';
      if ((d < 130 || e.tauntT > 0 || e.revealT > 0) && e.st <= 0) {
        e.hidden = false; e.state = 'wind'; e.st = 0.55 * L.scl.tele;
        addTelegraph(L, { kind: 'circle', x: e.x, y: e.y, r: 95, dur: e.st });
        playSfx('boing');
      }
      e.revealT = Math.max(0, (e.revealT ?? 0) - dt);
      return;
    }
    if (e.state === 'wind') { e.anim = 'attack'; e.armored = false; if (e.st <= 0) { e.state = 'open'; e.st = 2.6; L.fx.addShake(5); L.fx.burst(e.x, e.y - 40, PALETTE.sun, 14, 200); if (d < 95 + h.r) hurtHero(L, e.damage, e.x, e.y, { kind: 'melee', knock: 320, src: e }); playSfx('boing'); } return; }
    // open: vulnerable, springs at you
    e.anim = 'move'; e.armored = false;
    e.facing = angleTo(e.x, e.y, h.x, h.y);
    contact(L, e, e.damage * 0.6, 1);
    if (e.st <= 0) { e.state = 'closed'; e.st = 1.8; }
  },

  // swarm: little lint puffs drift in clumps
  lint(L, e, dt, sp) {
    const h = L.hero;
    e.z = 4 + Math.sin(e.animT * 5 + e.seed) * 3;
    const a = angleTo(e.x, e.y, h.x, h.y) + Math.sin(e.animT * 4 + e.seed) * 0.8;
    e.facing = steer(L, e, e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40, sp, dt);
    e.anim = 'move';
    contact(L, e, e.damage, 0.7);
  },

  // swooping flyer: circles high, telegraphs, then swoops straight through
  hanger(L, e, dt, sp) {
    const h = L.hero;
    e.z = e.state === 'swoop' ? 6 : 26;
    if (e.state === 'wind') { e.st -= dt; e.anim = 'attack'; if (e.tele) e.tele.ang = e.facing; if (e.st <= 0) { e.state = 'swoop'; e.st = 0.6; playSfx('dash'); } return; }
    if (e.state === 'swoop') {
      e.st -= dt; e.anim = 'attack';
      e.x += Math.cos(e.facing) * 520 * dt; e.y += Math.sin(e.facing) * 520 * dt;
      contact(L, e, e.damage, 0.9);
      if (e.st <= 0) { e.state = 'move'; e.atkCd = (1.8 + Math.random()) * L.scl.aggro; }
      return;
    }
    e.anim = 'move';
    e.circ = (e.circ ?? Math.random() * 6) + dt * (sp / 180);
    const want = keepAway(e, 190);
    const tx = h.x + Math.cos(e.circ) * want, ty = h.y + Math.sin(e.circ) * want * 0.7;
    e.x += (tx - e.x) * 2.2 * dt; e.y += (ty - e.y) * 2.2 * dt;
    if (e.atkCd <= 0) {
      e.state = 'wind'; e.st = 0.6 * L.scl.tele; e.facing = angleTo(e.x, e.y, h.x, h.y);
      e.tele = addTelegraph(L, { kind: 'line', x: e.x, y: e.y, ang: e.facing, len: 320, width: 30, dur: e.st, follow: e });
    }
  },

  // swarm, squeaks: waddles in a flock; squeaks when bonked
  rubber_duck(L, e, dt, sp) {
    const h = L.hero, d = e.duck ?? {};
    e.anim = 'move';
    if (!e.onHurt) e.onHurt = () => playSfx('boing');
    // ninja: a quick dash at you every few seconds
    if (d.dash) {
      e.dashT -= dt;
      if (e.dashT <= 0 && e.dashT > -0.3) { e.facing = steer(L, e, h.x, h.y, sp * 3.4, dt); contact(L, e, e.damage, 0.8); return; }
      if (e.dashT <= -0.3) e.dashT = 2 + Math.random() * 1.5;
    }
    // squirt: stops to spit water at you, which leaves a (slippery) puddle
    if (d.squirt && dist(e.x, e.y, h.x, h.y) < 340) {
      e.squirtT -= dt;
      if (e.squirtT <= 0) {
        e.squirtT = 4 + Math.random() * 2;
        const tx = h.x + (h.svx ?? 0) * 0.3, ty = h.y + (h.svy ?? 0) * 0.3;
        playSfx('splash');
        lob(L, 'water', e.x, e.y - e.h, tx, ty, e.damage * 0.5, { splash: 30, color: PALETTE.lake, h: 70,
          onLand: (LL, s) => { if (isOpen(LL.arena, s.x, s.y, 10)) addZone(LL, { kind: 'puddle', x: s.x, y: s.y, r: 44, dur: 4.5 }); } });
      }
    }
    // golden: rare and skittish, it runs AWAY (catch it for a heart)
    const away = d.gold && dist(e.x, e.y, h.x, h.y) < 260;
    const a = angleTo(e.x, e.y, h.x, h.y) + (away ? Math.PI : 0) + Math.sin(e.animT * 3 + e.seed) * (d.ghost ? 0.8 : 0.35);
    e.facing = steer(L, e, e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40, sp * (0.75 + 0.25 * Math.abs(Math.sin(e.animT * 8))), dt);
    if (!d.gold) contact(L, e, e.damage, 0.8);
  },

  // bursts from walls: lurks in the wall, telegraphs a line, lunges out, then slithers
  pipe_snake(L, e, dt, sp) {
    const h = L.hero, A = L.arena;
    if (e.state === 'lurk') {
      e.st -= dt;
      if (e.tauntT > 0 || e.revealT > 0) e.st = Math.min(e.st, 0.01);
      if (e.st <= 0) {
        // pick a wall spot nearest the hero
        const opts = [{ x: h.x, y: A.wallH + 4 }, { x: 30, y: h.y }, { x: A.w - 30, y: h.y }];
        const s = opts.reduce((b, o) => (dist(o.x, o.y, h.x, h.y) < dist(b.x, b.y, h.x, h.y) ? o : b));
        e.x = Math.max(60, Math.min(A.w - 60, s.x)); e.y = s.y;
        e.facing = angleTo(e.x, e.y, h.x, h.y);
        e.state = 'wind'; e.st = 0.85 * L.scl.tele;
        e.tele = addTelegraph(L, { kind: 'line', x: e.x, y: e.y, ang: e.facing, len: 300, width: 34, dur: e.st });
        L.fx.burst(e.x, e.y, PALETTE.lake, 10, 120);
      }
      return;
    }
    if (e.state === 'wind') { e.st -= dt; e.anim = 'attack'; if (e.st <= 0) { e.hidden = false; e.noCollide = false; e.state = 'lunge'; e.st = 0.5; playSfx('pipe'); } return; }
    if (e.state === 'lunge') {
      e.st -= dt; e.anim = 'attack';
      e.x += Math.cos(e.facing) * 600 * dt; e.y += Math.sin(e.facing) * 600 * dt;
      contact(L, e, e.damage, 0.8, { knock: 280 });
      if (e.st <= 0) { e.state = 'move'; e.atkCd = (2 + Math.random()) * L.scl.aggro; }
      return;
    }
    e.anim = 'move';
    const a = angleTo(e.x, e.y, h.x, h.y) + Math.sin(e.animT * 5) * 0.7;
    e.facing = steer(L, e, e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40, sp, dt);
    contact(L, e, e.damage * 0.7, 1);
    if (e.atkCd <= 0 && dist(e.x, e.y, h.x, h.y) < 220) {
      e.state = 'wind'; e.st = 0.5 * L.scl.tele; e.facing = angleTo(e.x, e.y, h.x, h.y);
      e.tele = addTelegraph(L, { kind: 'line', x: e.x, y: e.y, ang: e.facing, len: 220, width: 30, dur: e.st });
    }
  },

  // marching formation: a column that only marches when you're NOT looking at it
  gnome(L, e, dt, sp) {
    const h = L.hero;
    const d = dist(e.x, e.y, h.x, h.y);
    const watched = d < 420 && angDiff(h.facing, angleTo(h.x, h.y, e.x, e.y)) < 0.55 && !(e.tauntT > 0);
    if (watched) { e.anim = 'idle'; e.frozenLook = true; return; }
    e.frozenLook = false;
    e.anim = 'move';
    const F = e.form;
    let tx = h.x, ty = h.y;
    if (F && e.slot > 0) {
      const lead = F.members[e.slot - 1];
      if (lead && !lead.dead) { tx = lead.x - Math.cos(lead.facing) * 34; ty = lead.y - Math.sin(lead.facing) * 34; }
    }
    const step = Math.sin(L.time * 7 + (e.slot ?? 0)) > -0.2 ? 1.25 : 0.2; // stomp-stomp
    e.facing = steer(L, e, tx, ty, sp * step, dt);
    if (dist(e.x, e.y, tx, ty) < 6) e.facing = angleTo(e.x, e.y, h.x, h.y);
    contact(L, e, e.damage, 0.9);
  },

  // grabs & roots: rooted vine telegraphs a snare under you
  vine(L, e, dt) {
    const h = L.hero;
    const d = dist(e.x, e.y, h.x, h.y);
    e.facing = angleTo(e.x, e.y, h.x, h.y);
    if (e.state === 'wind') {
      e.st -= dt; e.anim = 'attack';
      if (e.st <= 0) {
        e.state = 'move'; e.atkCd = (3 + Math.random()) * L.scl.aggro;
        L.fx.burst(e.tx, e.ty, '#3f7a4a', 12, 140);
        if (dist(e.tx, e.ty, h.x, h.y) < 42 + h.r) hurtHero(L, e.damage, e.tx, e.ty, { kind: 'melee', knock: 0, root: 1.1, src: e });
        playSfx('whack');
      }
      return;
    }
    e.anim = 'idle';
    contact(L, e, e.damage * 0.6, 1);
    if (d < 230 && e.atkCd <= 0) {
      e.state = 'wind'; e.st = 0.8 * L.scl.tele; e.tx = h.x; e.ty = h.y;
      addTelegraph(L, { kind: 'circle', x: h.x, y: h.y, r: 42, dur: e.st, color: '#3f7a4a' });
    }
  },

  // leaps from water: hidden while swimming, telegraphs a landing, flops (vulnerable), hops back
  code_fish(L, e, dt, sp) {
    const h = L.hero, A = L.arena;
    e.st -= dt;
    if (e.state === 'swim') {
      e.hidden = true; e.anim = 'move';
      const wv = A.water[0];
      if (wv) {
        e.sw = (e.sw ?? Math.random() * 6) + dt * 0.8;
        e.x = wv.x + Math.cos(e.sw + e.seed) * wv.rx * 0.6; e.y = wv.y + Math.sin(e.sw + e.seed) * wv.ry * 0.6;
      }
      if (e.st <= 0 || e.revealT > 0 || e.tauntT > 0) {
        e.revealT = 0;
        const d = dist(e.x, e.y, h.x, h.y);
        const k = Math.min(1, 300 / Math.max(1, d));
        e.lx0 = e.x; e.ly0 = e.y; e.ltx = e.x + (h.x - e.x) * k; e.lty = e.y + (h.y - e.y) * k;
        e.state = 'wind'; e.st = 0.7 * L.scl.tele;
        addTelegraph(L, { kind: 'circle', x: e.ltx, y: e.lty, r: 40, dur: e.st + 0.6 });
        L.fx.burst(e.x, e.y, PALETTE.ice, 8, 100);
      }
      return;
    }
    if (e.state === 'wind') { e.hidden = false; e.anim = 'attack'; if (e.st <= 0) { e.state = 'leap'; e.st = 0.6; playSfx('splash'); } return; }
    if (e.state === 'leap') {
      const k = 1 - e.st / 0.6;
      e.x = e.lx0 + (e.ltx - e.lx0) * k; e.y = e.ly0 + (e.lty - e.ly0) * k; e.z = Math.sin(Math.PI * Math.min(1, k)) * 90;
      e.noCollide = true;
      if (e.st <= 0) {
        e.z = 0; e.noCollide = false; e.state = 'flop'; e.st = 2.2;
        if (dist(e.x, e.y, h.x, h.y) < 40 + h.r) hurtHero(L, e.damage, e.x, e.y, { kind: 'melee', knock: 220, src: e });
        L.fx.burst(e.x, e.y, PALETTE.lake, 10, 120);
      }
      return;
    }
    if (e.state === 'flop') {
      e.anim = 'hurt';
      e.x += Math.sin(e.animT * 20) * 20 * dt;
      if (e.st <= 0) {
        const wv = A.water[0];
        if (wv) { e.state = 'back'; e.st = 0.6; e.lx0 = e.x; e.ly0 = e.y; e.ltx = wv.x + (Math.random() - 0.5) * wv.rx; e.lty = wv.y + (Math.random() - 0.5) * wv.ry * 0.8; }
        else { e.state = 'swim'; e.st = 2; }
      }
      return;
    }
    if (e.state === 'back') {
      const k = 1 - e.st / 0.6;
      e.x = e.lx0 + (e.ltx - e.lx0) * k; e.y = e.ly0 + (e.lty - e.ly0) * k; e.z = Math.sin(Math.PI * Math.min(1, k)) * 60;
      e.noCollide = true;
      if (e.st <= 0) { e.z = 0; e.noCollide = false; e.state = 'swim'; e.st = (2.2 + Math.random() * 1.6) * L.scl.aggro; L.fx.burst(e.x, e.y, PALETTE.ice, 8, 100); playSfx('splash'); }
    }
  },
};

/** drawEnemy options for an enemy. */
export function enemyDrawOpts(e) {
  return {
    facing: e.facing, t: e.animT, flash: e.flash, hpFrac: e.boss ? undefined : e.hp / e.maxHp,
    anim: e.stun > 0 ? 'hurt' : e.flash > 0.05 ? 'hurt' : e.anim,
    phase: e.phase, state: e.state, scale: e.scale !== 1 ? e.scale : undefined,
    marked: e.markT > 0, hidden: !!e.hidden, duck: e.duck,
    alpha: e.spawning > 0 ? Math.max(0.15, 1 - e.spawning / 0.7) : e.hidden ? 0.28 : 1,
  };
}
