// The Sorbet Syndicate: enemy creation + per-type AI. Owned by: action team.
import { ENEMIES, PALETTE } from '../core/theme.js';
import { dist, angleTo } from '../core/math.js';
import { playSfx } from '../audio/sfx.js';
import { collide } from './arena.js';
import { angDiff, hurtTarget, lobSlush, addTelegraph, addWave } from './combat.js';
import { updateBaron } from './boss.js';

const SHAPE = {
  frostling: { r: 10, h: 18, mass: 1 },
  brainfreezer: { r: 12, h: 36, mass: 1 },
  popsicle_knight: { r: 14, h: 36, mass: 1.6 },
  slush_golem: { r: 24, h: 50, mass: 4 },
  baron_brrr: { r: 30, h: 72, mass: 7 },
};

/** Create an enemy (not yet added). opts: { boss?, hpMul?, noDrops?, spawnDelay? } */
export function createEnemy(L, type, x, y, opts = {}) {
  const base = ENEMIES[type] ?? ENEMIES.frostling;
  const shape = SHAPE[base.id] ?? SHAPE.frostling;
  const s = L.scl;
  const hpMul = (opts.hpMul ?? 1) * s.hp;
  const hp = Math.round(base.hp * hpMul);
  const R = Math.random;
  return {
    type: base.id, name: base.name, x, y,
    r: shape.r * (opts.scale ?? 1), h: shape.h * (opts.scale ?? 1), mass: shape.mass * (opts.boss ? 1.5 : 1),
    scale: opts.scale ?? 1,
    hp, maxHp: hp,
    speed: base.speed * s.speed * (0.9 + R() * 0.2),
    damage: base.damage * s.dmg,
    facing: angleTo(x, y, L.hero?.x ?? x, L.hero?.y ?? y),
    stun: 0, flash: 0, kvx: 0, kvy: 0, slowT: 0, invuln: 0, z: 0,
    spawning: opts.spawnDelay ?? 0.8,
    state: 'move', st: 0,
    atkCd: (1 + R() * 1.5) * s.aggro, contactCd: 0, hopCd: R() * 0.5, hopT: 0,
    strafe: R() < 0.5 ? 1 : -1, strafeT: 2 + R() * 2,
    boss: !!opts.boss, noDrops: !!opts.noDrops,
    shielded: base.id === 'popsicle_knight',
    cartBias: L.cart ? (base.id === 'frostling' ? 0.75 : base.id === 'popsicle_knight' ? 0.6 : 0.4) > R() : false,
    animT: R() * 5, anim: 'move',
    phase: 1,
  };
}

/** Pick what this enemy is going after (hero, or the cart in defend). */
function targetOf(L, e) {
  const h = L.hero;
  if (L.cart && L.cart.hp > 0 && e.cartBias) {
    if (h && dist(e.x, e.y, h.x, h.y) < 110) return h; // provoked
    return L.cart;
  }
  return h;
}

/** Steer toward (tx,ty) with simple prop avoidance. */
function steer(L, e, tx, ty, speed, dt) {
  let dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d; dy /= d;
  let ax = dx, ay = dy;
  for (const p of L.arena.props) {
    if (!p.solid || p.broken) continue;
    const px = p.x - e.x, py = p.y - e.y;
    const pd = Math.hypot(px, py);
    const reach = p.r + e.r + 36;
    if (pd > reach || pd > d) continue;
    if (px * dx + py * dy <= 0) continue; // behind us
    // tangent away from obstacle, on the side we're already heading
    const cross = dx * py - dy * px;
    const side = cross > 0 ? -1 : 1;
    const w = (reach - pd) / reach * 1.6;
    ax += (-py / pd) * side * w; ay += (px / pd) * side * w;
  }
  const al = Math.hypot(ax, ay) || 1;
  e.x += (ax / al) * speed * dt;
  e.y += (ay / al) * speed * dt;
  return Math.atan2(ay, ax);
}

export function updateEnemies(L, dt) {
  const list = L.enemies;
  for (const e of list) {
    if (e.dead) continue;
    e.animT += dt;
    e.flash = Math.max(0, e.flash - dt);
    if (e.spawning > 0) {
      e.spawning -= dt;
      if (Math.random() < 0.5) L.fx.burst(e.x + (Math.random() - 0.5) * 30, e.y - 10, PALETTE.frost, 1, 40);
      continue;
    }
    e.contactCd = Math.max(0, e.contactCd - dt);
    e.atkCd -= dt;
    e.invuln = Math.max(0, e.invuln - dt);
    e.slowT = Math.max(0, (e.slowT ?? 0) - dt);
    e.x += e.kvx * dt; e.y += e.kvy * dt;
    const f = Math.exp(-7 * dt);
    e.kvx *= f; e.kvy *= f;
    if (e.stun > 0) {
      e.stun -= dt;
      e.anim = 'hurt';
      if (e.state !== 'move' && e.type !== 'baron_brrr') { e.state = 'move'; e.st = 0; e.tele && (e.tele.dead = true); }
      if (Math.random() < 0.15) L.fx.burst(e.x, e.y - e.h - 6, PALETTE.sun, 1, 30);
    } else {
      const sp = e.speed * (e.slowT > 0 ? 0.6 : 1);
      AI[e.type]?.(L, e, dt, sp);
    }
    collide(L.arena, e, { flying: e.type === 'brainfreezer' });
  }
  // Separation so swarms surround instead of stacking.
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead || a.spawning > 0) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead || b.spawning > 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const min = a.r + b.r + 2;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min && d2 > 0.0001) {
        const d = Math.sqrt(d2), push = (min - d) / 2;
        const wa = b.mass / (a.mass + b.mass), wb = 1 - wa;
        a.x -= (dx / d) * push * 2 * wa; a.y -= (dy / d) * push * 2 * wa;
        b.x += (dx / d) * push * 2 * wb; b.y += (dy / d) * push * 2 * wb;
      }
    }
  }
  // Keep enemies from standing inside the hero.
  const h = L.hero;
  if (h) for (const e of list) {
    if (e.dead || e.spawning > 0 || e.type === 'brainfreezer') continue;
    const d = dist(e.x, e.y, h.x, h.y), min = e.r + h.r;
    if (d < min && d > 0.01) {
      const push = min - d;
      e.x += ((e.x - h.x) / d) * push * 0.6; e.y += ((e.y - h.y) / d) * push * 0.6;
      h.x -= ((e.x - h.x) / d) * push * 0.4; h.y -= ((e.y - h.y) / d) * push * 0.4;
    }
  }
}

function contact(L, e, target, dmg, cd = 0.9) {
  if (!target || e.contactCd > 0) return;
  const tr = target.r ?? 13;
  if (dist(e.x, e.y, target.x, target.y) < e.r + tr + 4) {
    hurtTarget(L, target, dmg, e.x, e.y, { knock: 170, kind: 'melee' });
    e.contactCd = cd;
  }
}

const AI = {
  // Small hopping blobs. Hop toward the target with jitter; lunge when close.
  frostling(L, e, dt, sp) {
    const t = targetOf(L, e);
    if (!t) return;
    const d = dist(e.x, e.y, t.x, t.y);
    if (e.hopT > 0) {
      e.hopT -= dt;
      const k = 1 - e.hopT / e.hopDur;
      e.z = Math.sin(Math.PI * Math.min(1, k)) * (e.lunge ? 6 : 12);
      e.x += Math.cos(e.hopAng) * e.hopSp * dt;
      e.y += Math.sin(e.hopAng) * e.hopSp * dt;
      e.anim = e.lunge ? 'attack' : 'move';
      if (e.hopT <= 0) { e.z = 0; e.lunge = false; }
    } else {
      e.hopCd -= dt;
      e.anim = 'idle';
      if (e.hopCd <= 0) {
        e.lunge = d < 95 && e.atkCd <= 0;
        const jitter = e.lunge ? 0.1 : d > 200 ? 0.7 : 0.35;
        e.hopAng = angleTo(e.x, e.y, t.x, t.y) + (Math.random() - 0.5) * jitter * 2;
        e.hopDur = e.lunge ? 0.24 : 0.32;
        e.hopT = e.hopDur;
        e.hopSp = sp * (e.lunge ? 3.6 : 2.3);
        e.facing = e.hopAng;
        e.hopCd = (0.25 + Math.random() * 0.35) * L.scl.aggro;
        if (e.lunge) e.atkCd = 1.1 * L.scl.aggro;
      }
    }
    contact(L, e, t, e.damage, 0.8);
  },

  // Floating cone: keeps its distance, strafes, lobs slush that slows.
  brainfreezer(L, e, dt, sp) {
    const t = targetOf(L, e);
    if (!t) return;
    const d = dist(e.x, e.y, t.x, t.y);
    e.facing = angleTo(e.x, e.y, t.x, t.y);
    e.z = 10 + Math.sin(e.animT * 3) * 4;
    if (e.state === 'wind') {
      e.st -= dt;
      e.anim = 'attack';
      if (e.st <= 0) {
        const lead = t.kvx !== undefined ? 0.25 : 0;
        const tx = t.x + (Math.random() - 0.5) * 30 + (L.game.input.axis().x * (t.tune?.speed ?? 0) * lead);
        const ty = t.y + (Math.random() - 0.5) * 30 + (L.game.input.axis().y * (t.tune?.speed ?? 0) * lead);
        lobSlush(L, e.x, e.y - e.h, tx, ty, e.damage);
        playSfx('throw');
        e.state = 'move';
        e.atkCd = (2.3 + Math.random() * 1.2) * L.scl.aggro;
      }
      return;
    }
    e.anim = 'move';
    e.strafeT -= dt;
    if (e.strafeT <= 0) { e.strafe *= -1; e.strafeT = 1.5 + Math.random() * 2; }
    const want = 250;
    const radial = d > want + 40 ? 1 : d < want - 60 ? -1 : 0;
    const a = angleTo(e.x, e.y, t.x, t.y);
    const mx = Math.cos(a) * radial + Math.cos(a + Math.PI / 2) * e.strafe * 0.7;
    const my = Math.sin(a) * radial + Math.sin(a + Math.PI / 2) * e.strafe * 0.7;
    const ml = Math.hypot(mx, my) || 1;
    e.x += (mx / ml) * sp * dt; e.y += (my / ml) * sp * dt;
    if (e.atkCd <= 0 && d < 520) { e.state = 'wind'; e.st = 0.45; }
  },

  // Shielded melee: turns slowly (so you can flank), telegraphed thrust.
  popsicle_knight(L, e, dt, sp) {
    const t = targetOf(L, e);
    if (!t) return;
    const d = dist(e.x, e.y, t.x, t.y);
    const want = angleTo(e.x, e.y, t.x, t.y);
    const turnRate = e.state === 'recover' ? 0.5 : e.state === 'wind' ? 0.9 : 2.0;
    let delta = ((want - e.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    e.facing += Math.max(-turnRate * dt, Math.min(turnRate * dt, delta));
    if (e.state === 'move') {
      e.anim = 'move';
      if (angDiff(e.facing, want) < 0.9 && d > e.r + (t.r ?? 13) + 10) {
        e.x += Math.cos(e.facing) * sp * dt; e.y += Math.sin(e.facing) * sp * dt;
      }
      if (d < 78 && e.atkCd <= 0) {
        e.state = 'wind'; e.st = 0.55 * Math.max(0.75, L.scl.aggro);
        e.tele = addTelegraph(L, { kind: 'cone', x: e.x, y: e.y, r: 80, ang: e.facing, arc: Math.PI * 0.6, dur: e.st, follow: e });
      }
    } else if (e.state === 'wind') {
      e.anim = 'attack';
      e.st -= dt;
      if (e.tele) e.tele.ang = e.facing;
      if (e.st <= 0) {
        e.state = 'recover'; e.st = 0.7;
        e.x += Math.cos(e.facing) * 10; e.y += Math.sin(e.facing) * 10;
        playSfx('swing');
        if (d < 84 + (t.r ?? 13) && angDiff(want, e.facing) < Math.PI * 0.32) hurtTarget(L, t, e.damage, e.x, e.y, { knock: 260, kind: 'melee' });
      }
    } else {
      e.anim = 'idle';
      e.st -= dt;
      if (e.st <= 0) { e.state = 'move'; e.atkCd = 1.3 * L.scl.aggro; }
    }
  },

  // Mini-boss: slow, ground-pound shockwave.
  slush_golem(L, e, dt, sp) {
    const t = targetOf(L, e);
    if (!t) return;
    const d = dist(e.x, e.y, t.x, t.y);
    if (e.state === 'move') {
      e.anim = 'move';
      e.facing = steer(L, e, t.x, t.y, sp, dt);
      contact(L, e, t, e.damage * 0.5, 1.2);
      if (d < 220 && e.atkCd <= 0) {
        e.state = 'wind'; e.st = 1.0 * Math.max(0.7, L.scl.aggro);
        e.tele = addTelegraph(L, { kind: 'circle', x: e.x, y: e.y, r: 230, dur: e.st, follow: e, ring: true });
        if (Math.random() < 0.4) L.bark('golem', 'RRRMMBLE...', 1.2);
      }
      // As a boss, it also calls in frostlings.
      if (e.boss) {
        e.summonCd = (e.summonCd ?? 6) - dt;
        if (e.summonCd <= 0 && L.aliveCount() < 8) {
          e.summonCd = 9 * L.scl.aggro;
          for (let i = 0; i < 2 + (e.hp < e.maxHp / 2 ? 1 : 0); i++) L.spawnEnemy('frostling', e.x + (Math.random() - 0.5) * 140, e.y + 40 + Math.random() * 60, { noDrops: false });
        }
      }
    } else if (e.state === 'wind') {
      e.anim = 'attack';
      e.st -= dt;
      if (Math.random() < 0.3) L.fx.addShake(1.5);
      if (e.st <= 0) {
        e.state = 'recover'; e.st = 0.9;
        addWave(L, { x: e.x, y: e.y, team: 'enemy', dmg: e.damage, maxR: 250, speed: 330 });
        if (e.boss && e.hp < e.maxHp / 2) e.echo = 0.45;
        L.fx.addShake(11);
        L.fx.burst(e.x, e.y, PALETTE.frost, 24, 220);
        playSfx('hit'); playSfx('freeze');
      }
    } else {
      e.anim = 'idle';
      e.st -= dt;
      if (e.echo > 0) {
        e.echo -= dt;
        if (e.echo <= 0) addWave(L, { x: e.x, y: e.y, team: 'enemy', dmg: e.damage * 0.8, maxR: 320, speed: 300 });
      }
      if (e.st <= 0) { e.state = 'move'; e.atkCd = 3.0 * L.scl.aggro; }
    }
  },

  baron_brrr(L, e, dt, sp) { updateBaron(L, e, dt, sp, steer); },
};

/** drawEnemy options for an enemy. */
export function enemyDrawOpts(e) {
  return {
    facing: e.facing, t: e.animT, flash: e.flash, hpFrac: e.hp / e.maxHp,
    anim: e.stun > 0 ? 'hurt' : e.flash > 0.05 ? 'hurt' : e.anim,
    phase: e.phase, scale: e.scale !== 1 ? e.scale : undefined,
    alpha: e.spawning > 0 ? Math.max(0.15, 1 - e.spawning / 0.8) : 1,
  };
}
