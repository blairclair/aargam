// Damage, projectiles, shockwaves, telegraphs, zones, pickups. Owned by: action team.
// Every function takes the level scene `L` as the world.
import { PALETTE } from '../core/theme.js';
import { dist, angleTo } from '../core/math.js';
import { playSfx } from '../audio/sfx.js';
import { shotBlocker } from './arena.js';
import { DROPS } from './config.js';

export const angDiff = (a, b) => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
};

// ---------------------------------------------------------------- heroes
/**
 * Hurt the active hero. Returns 'hit' | 'blocked' | 'immune'.
 * o: { knock?: number, slow?: number, kind?: 'melee'|'shot'|'wave' }
 */
export function hurtHero(L, amount, sx, sy, o = {}) {
  const h = L.hero;
  if (!h || h.down || L.phase !== 'play') return 'immune';
  if (h.invuln > 0 || h.dashT > 0) return 'immune';
  const fromAng = angleTo(h.x, h.y, sx, sy);
  if (h.shieldT > 0 && o.kind !== 'wave' && angDiff(fromAng, h.facing) < Math.PI * 0.45) {
    playSfx('shield');
    L.fx.burst(h.x + Math.cos(h.facing) * 18, h.y - 18 + Math.sin(h.facing) * 18, PALETTE.denim, 8, 120);
    L.fx.floatText(h.x, h.y - 60, 'BLOCK', PALETTE.ice);
    return 'blocked';
  }
  const dmg = Math.max(1, Math.round(amount));
  h.hp -= dmg;
  h.flash = 0.15; h.hurtT = 0.25; h.invuln = 0.45;
  const k = o.knock ?? 160;
  h.kvx += Math.cos(fromAng + Math.PI) * k;
  h.kvy += Math.sin(fromAng + Math.PI) * k;
  if (o.slow) {
    if (!(h.slowT > 0)) L.fx.floatText(h.x, h.y - 78, 'Brain freeze!', PALETTE.frost);
    h.slowT = Math.max(h.slowT, o.slow);
    playSfx('freeze');
  }
  L.fx.floatText(h.x, h.y - 60, `-${dmg}`, PALETTE.danger);
  L.fx.burst(h.x, h.y - 20, PALETTE.danger, 8, 120);
  L.fx.addShake(5);
  L.damageTaken += dmg;
  playSfx('hurt');
  if (h.hp <= 0) { h.hp = 0; L.onHeroDown(h); }
  return 'hit';
}

/** Hurt the defend-mission cart. */
export function hurtCart(L, amount) {
  const c = L.cart;
  if (!c || c.hp <= 0 || L.phase !== 'play') return;
  c.hp = Math.max(0, c.hp - amount * 0.6);
  c.flash = 0.15;
  L.fx.burst(c.x, c.y - 20, PALETTE.frost, 6, 90);
  L.fx.floatText(c.x, c.y - 50, `-${Math.round(amount * 0.6)}`, PALETTE.frostDeep);
  if (L.cartWarnT <= 0) { L.bark('victoria', 'They\'re going for the cart!', 2); L.cartWarnT = 9; }
}

/** Hurt whatever an enemy is targeting. */
export function hurtTarget(L, target, amount, sx, sy, o) {
  if (target === L.cart) hurtCart(L, amount);
  else hurtHero(L, amount, sx, sy, o);
}

// ---------------------------------------------------------------- enemies
/**
 * Damage an enemy. Returns true if damage landed.
 * o: { knock, stun, ignoreShield, srcAng (angle from source toward enemy), silent }
 */
export function damageEnemy(L, e, amount, sx, sy, o = {}) {
  if (e.dead || e.spawning > 0) return false;
  const towardAng = angleTo(sx, sy, e.x, e.y);
  if (e.invuln > 0) {
    if (!o.silent) L.fx.floatText(e.x, e.y - e.h - 10, 'Hmph!', PALETTE.ice);
    return false;
  }
  // Popsicle Knight: wafer shield blocks hits from the front unless stunned.
  if (e.shielded && !(e.stun > 0) && !o.ignoreShield) {
    const fromAng = angleTo(e.x, e.y, sx, sy);
    if (angDiff(fromAng, e.facing) < Math.PI * 0.36) {
      playSfx('shield');
      L.fx.burst(e.x + Math.cos(e.facing) * 16, e.y - 18, PALETTE.sunDeep, 6, 100);
      if (L.blockHintT <= 0) { L.fx.floatText(e.x, e.y - e.h - 12, 'BLOCKED: flank it!', PALETTE.sun); L.blockHintT = 3; }
      e.kvx += Math.cos(towardAng) * 60; e.kvy += Math.sin(towardAng) * 60;
      return false;
    }
  }
  const dmg = Math.max(1, Math.round(amount));
  e.hp -= dmg;
  e.flash = 0.12;
  const k = (o.knock ?? 120) / e.mass;
  e.kvx += Math.cos(towardAng) * k;
  e.kvy += Math.sin(towardAng) * k;
  if (o.stun) e.stun = Math.max(e.stun, o.stun / (e.boss ? 3 : 1));
  L.fx.floatText(e.x + (Math.random() - 0.5) * 12, e.y - e.h - 8, String(dmg), o.crit ? PALETTE.sun : PALETTE.paper);
  L.fx.burst(e.x, e.y - e.h * 0.5, PALETTE.frost, 6, 110);
  if (!o.silent) playSfx('hit');
  if (e.hp <= 0) killEnemy(L, e);
  return true;
}

export function killEnemy(L, e) {
  if (e.dead) return;
  e.dead = true;
  e.hp = 0;
  L.defeated++;
  L.fx.burst(e.x, e.y - e.h * 0.5, PALETTE.ice, e.boss ? 40 : 16, e.boss ? 260 : 170);
  L.fx.burst(e.x, e.y - e.h * 0.5, PALETTE.mint, e.boss ? 20 : 6, 140);
  L.fx.addShake(e.boss ? 14 : e.type === 'slush_golem' ? 8 : 3);
  playSfx('thaw');
  const d = DROPS[e.type] ?? { scoops: [1, 1] };
  if (!e.noDrops) {
    const n = d.scoops[0] + Math.floor(Math.random() * (d.scoops[1] - d.scoops[0] + 1));
    for (let i = 0; i < n; i++) spawnPickup(L, 'scoop', e.x, e.y);
    for (let i = 0; i < (d.sunshine ?? 0); i++) spawnPickup(L, 'sunshine', e.x, e.y);
  }
  L.game.events.emit('enemy:defeated', { type: e.type, x: e.x, y: e.y });
}

// ---------------------------------------------------------------- props (ice blocks)
export function damageProp(L, p, amount) {
  if (!p.destructible || p.broken) return false;
  p.hp -= amount;
  p.flash = 0.12;
  L.fx.burst(p.x, p.y - 16, PALETTE.ice, 5, 90);
  playSfx('hit');
  if (p.hp <= 0) { p.broken = true; L.onPropBroken?.(p); }
  return true;
}

// ---------------------------------------------------------------- projectiles
/**
 * Spawn a projectile.
 * s: { kind, team:'hero'|'enemy', x, y, vx, vy, r, dmg, life, pierce?, lob?: {tx,ty,dur,h,splash}, slow?, knock? }
 */
export function spawnShot(L, s) {
  const shot = { r: 6, life: 1, pierce: 0, hits: new Set(), ...s, t: 0 };
  if (shot.lob) { shot.lob.sx = shot.x; shot.lob.sy = shot.y; shot.z = 0; shot.life = shot.lob.dur + 0.05; }
  L.shots.push(shot);
  return shot;
}

/** Lob a slush ball from (x,y) to (tx,ty), with a landing telegraph. */
export function lobSlush(L, x, y, tx, ty, dmg, o = {}) {
  const dur = o.dur ?? Math.max(0.6, Math.min(1.2, dist(x, y, tx, ty) / 380));
  const splash = o.splash ?? 34;
  addTelegraph(L, { kind: 'circle', x: tx, y: ty, r: splash, dur });
  return spawnShot(L, { kind: 'slush', team: 'enemy', x, y, vx: 0, vy: 0, r: 9, dmg, lob: { tx, ty, dur, h: o.h ?? 120, splash }, slow: o.slow ?? 1.6 });
}

function reflectShot(L, s, h) {
  // Denim Shield: turn an enemy shot into a hero shot aimed at the nearest enemy (or straight back).
  let target = null, best = 520;
  for (const e of L.enemies) {
    if (e.dead || e.spawning > 0) continue;
    const d = dist(s.x, s.y, e.x, e.y);
    if (d < best) { best = d; target = e; }
  }
  const ang = target ? angleTo(s.x, s.y, target.x, target.y - target.h * 0.4) : h.facing;
  s.team = 'hero';
  s.lob = null; s.z = 0;
  s.vx = Math.cos(ang) * 520; s.vy = Math.sin(ang) * 520;
  s.dmg = Math.round(h.tune.damage * 1.8);
  s.life = 1.2; s.t = 0; s.hits = new Set(); s.reflected = true;
  playSfx('shield');
  L.fx.burst(s.x, s.y, PALETTE.denim, 10, 140);
  L.fx.floatText(h.x, h.y - 70, 'Reflected!', PALETTE.mint);
}

export function updateShots(L, dt) {
  const h = L.hero;
  for (const s of L.shots) {
    s.t += dt;
    s.life -= dt;
    if (s.lob) {
      const k = Math.min(1, s.t / s.lob.dur);
      s.x = s.lob.sx + (s.lob.tx - s.lob.sx) * k;
      s.y = s.lob.sy + (s.lob.ty - s.lob.sy) * k;
      s.z = 4 * s.lob.h * k * (1 - k);
      // Denim Shield catches lobs on the way down.
      if (h && h.shieldT > 0 && s.z < 50 && dist(s.x, s.y, h.x, h.y) < 44 && angDiff(angleTo(h.x, h.y, s.x, s.y), h.facing) < Math.PI * 0.5) {
        reflectShot(L, s, h);
        continue;
      }
      if (k >= 1) {
        s.dead = true;
        L.fx.burst(s.x, s.y, PALETTE.frost, 10, 110);
        if (h && dist(s.x, s.y, h.x, h.y) < s.lob.splash + h.r) hurtHero(L, s.dmg, s.x, s.y, { slow: s.slow, knock: 80, kind: 'shot' });
        if (L.cart && dist(s.x, s.y, L.cart.x, L.cart.y) < s.lob.splash + L.cart.r) hurtCart(L, s.dmg * 0.7);
      }
      continue;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.life <= 0) { s.dead = true; continue; }
    const blocker = shotBlocker(L.arena, s.x, s.y, s.r * 0.5);
    if (s.team === 'hero') {
      for (const e of L.enemies) {
        if (e.dead || e.spawning > 0 || s.hits.has(e)) continue;
        if (dist(s.x, s.y, e.x, e.y - e.h * 0.4) < s.r + e.r + 4) {
          s.hits.add(e);
          damageEnemy(L, e, s.dmg, s.x - s.vx * 0.05, s.y - s.vy * 0.05, { knock: s.knock ?? 90 });
          if (s.pierce-- <= 0) { s.dead = true; break; }
        }
      }
      if (s.dead) { L.fx.burst(s.x, s.y, s.kind === 'mintscoop' ? PALETTE.mint : PALETTE.frost, 6, 90); continue; }
      if (blocker) {
        if (blocker.destructible) damageProp(L, blocker, s.dmg);
        s.dead = true;
        L.fx.burst(s.x, s.y, PALETTE.mint, 5, 70);
      }
    } else {
      if (h && h.shieldT > 0 && dist(s.x, s.y, h.x, h.y - 16) < 40 && angDiff(angleTo(h.x, h.y, s.x, s.y), h.facing) < Math.PI * 0.5) {
        reflectShot(L, s, h);
        continue;
      }
      if (h && dist(s.x, s.y, h.x, h.y - 16) < s.r + h.r) {
        hurtHero(L, s.dmg, s.x - s.vx, s.y - s.vy, { slow: s.slow, knock: 120, kind: 'shot' });
        s.dead = true;
        L.fx.burst(s.x, s.y, PALETTE.frost, 6, 90);
        continue;
      }
      if (L.cart && dist(s.x, s.y, L.cart.x, L.cart.y - 16) < s.r + L.cart.r) { hurtCart(L, s.dmg * 0.7); s.dead = true; continue; }
      if (blocker && !blocker.destructible) { s.dead = true; L.fx.burst(s.x, s.y, PALETTE.frost, 5, 70); }
    }
  }
  L.shots = L.shots.filter((s) => !s.dead);
}

/** Destroy enemy shots within radius (Aaron's sweep/shout knock slush out of the air). */
export function clearEnemyShots(L, x, y, r, arcAng = null, arc = Math.PI * 2) {
  let n = 0;
  for (const s of L.shots) {
    if (s.team !== 'enemy' || s.dead) continue;
    if (s.lob && s.z > 60) continue;
    if (dist(x, y, s.x, s.y) > r) continue;
    if (arcAng !== null && angDiff(angleTo(x, y, s.x, s.y), arcAng) > arc / 2) continue;
    s.dead = true; n++;
    L.fx.burst(s.x, s.y, PALETTE.ice, 6, 100);
  }
  return n;
}

// ---------------------------------------------------------------- shockwaves
/** Expanding ring. team 'enemy' hurts heroes (dash i-frames dodge it), 'hero' is visual. */
export function addWave(L, w) {
  L.waves.push({ r: 8, band: 22, speed: 360, maxR: 220, hit: false, cartHit: false, color: PALETTE.frostDeep, ...w });
}

export function updateWaves(L, dt) {
  const h = L.hero;
  for (const w of L.waves) {
    w.r += w.speed * dt;
    if (w.r >= w.maxR) { w.dead = true; continue; }
    if (w.team !== 'enemy') continue;
    if (!w.hit && h) {
      const d = dist(w.x, w.y, h.x, h.y);
      if (Math.abs(d - w.r) < w.band + h.r * 0.5) {
        const res = hurtHero(L, w.dmg, w.x, w.y, { knock: 280, kind: 'wave' });
        if (res === 'hit') w.hit = true;
      }
    }
    if (!w.cartHit && L.cart && Math.abs(dist(w.x, w.y, L.cart.x, L.cart.y) - w.r) < w.band + L.cart.r * 0.5) {
      w.cartHit = true; hurtCart(L, w.dmg * 0.6);
    }
  }
  L.waves = L.waves.filter((w) => !w.dead);
}

// ---------------------------------------------------------------- telegraphs
/** t: { kind:'circle'|'line'|'cone', x, y, r?, ang?, len?, width?, arc?, dur, follow? } */
export function addTelegraph(L, t) {
  const tg = { t: 0, ...t };
  L.tele.push(tg);
  return tg;
}
export function updateTelegraphs(L, dt) {
  for (const t of L.tele) {
    t.t += dt;
    if (t.follow) { t.x = t.follow.x; t.y = t.follow.y; if (t.follow.dead) t.dead = true; }
    if (t.t >= t.dur) t.dead = true;
  }
  L.tele = L.tele.filter((t) => !t.dead);
}

// ---------------------------------------------------------------- pickups
export function spawnPickup(L, kind, x, y) {
  const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 120;
  L.pickups.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, z: 0, vz: 160 + Math.random() * 80, t: 0, seed: Math.floor(Math.random() * 1000) });
}

export function updatePickups(L, dt, vacuum = false) {
  const h = L.hero;
  for (const p of L.pickups) {
    p.t += dt;
    p.vz -= 520 * dt;
    p.z = Math.max(0, p.z + p.vz * dt);
    if (p.z === 0) p.vz = Math.abs(p.vz) > 60 ? -p.vz * 0.35 : 0;
    const f = Math.exp(-4 * dt);
    p.vx *= f; p.vy *= f;
    if (h && p.t > 0.35) {
      const d = dist(p.x, p.y, h.x, h.y);
      if (vacuum || d < 110) {
        const a = angleTo(p.x, p.y, h.x, h.y), sp = vacuum ? 700 : 260 + (110 - d) * 4;
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      }
      if (d < h.r + 10) {
        p.dead = true;
        if (p.kind === 'sunshine') { L.sunshine++; L.fx.floatText(h.x, h.y - 70, '+1 sunshine', PALETTE.sun); }
        else { L.scoops++; L.fx.floatText(h.x + 10, h.y - 64, '+1', PALETTE.mint); }
        L.fx.burst(p.x, p.y, p.kind === 'sunshine' ? PALETTE.sun : PALETTE.mint, 5, 80);
        playSfx('pickup');
        continue;
      }
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.x = Math.max(40, Math.min(L.arena.w - 40, p.x));
    p.y = Math.max(50, Math.min(L.arena.h - 40, p.y));
  }
  L.pickups = L.pickups.filter((p) => !p.dead);
}

// ---------------------------------------------------------------- zones (Flower Box Bloom)
export function updateZones(L, dt) {
  const h = L.hero;
  for (const z of L.zones) {
    z.t += dt;
    if (z.t >= z.dur) { z.dead = true; continue; }
    if (h && dist(h.x, h.y, z.x, z.y) < z.r) {
      const cap = Math.max(h.maxHp, h.hp);
      if (h.hp < cap) {
        h.hp = Math.min(cap, h.hp + z.heal * dt);
        z.healAcc = (z.healAcc ?? 0) + z.heal * dt;
        if (z.healAcc >= 5) { L.fx.floatText(h.x, h.y - 66, `+${Math.round(z.healAcc)}`, PALETTE.heal); z.healAcc = 0; }
      }
      h.slowT = 0;
    }
    z.tick = (z.tick ?? 0) + dt;
    if (z.tick >= 0.5) {
      z.tick = 0;
      for (const e of L.enemies) {
        if (e.dead || e.spawning > 0) continue;
        if (dist(e.x, e.y, z.x, z.y) < z.r + e.r) damageEnemy(L, e, z.thaw * 0.5, z.x, z.y, { knock: 20, ignoreShield: true, silent: true });
      }
      for (const p of L.arena.props) {
        if (p.destructible && !p.broken && dist(p.x, p.y, z.x, z.y) < z.r + p.r) damageProp(L, p, z.thaw);
      }
      if (Math.random() < 0.8) L.fx.burst(z.x + (Math.random() - 0.5) * z.r, z.y + (Math.random() - 0.5) * z.r * 0.6, Math.random() < 0.5 ? PALETTE.sun : PALETTE.heal, 3, 40);
    }
    // Thawing ground slows enemies inside.
    for (const e of L.enemies) if (!e.dead && dist(e.x, e.y, z.x, z.y) < z.r) e.slowT = Math.max(e.slowT ?? 0, 0.2);
  }
  L.zones = L.zones.filter((z) => !z.dead);
}
