// Damage, projectiles, shockwaves, telegraphs, zones, pickups. Owned by: action team.
// Every function takes the room scene `L` as the world.
import { PALETTE } from '../core/theme.js';
import { dist, angleTo } from '../core/math.js';
import { playSfx } from '../audio/sfx.js';
import { shotBlocker, SIDE } from './arena.js';

export const angDiff = (a, b) => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
};

/** Enemies a hero attack may hit right now. */
export const targetable = (e) => !e.dead && !(e.spawning > 0) && !e.hidden && !e.untargetable;

// ---------------------------------------------------------------- hero
/**
 * Hurt the hero. Returns 'hit' | 'blocked' | 'immune'.
 * o: { knock?, slow?, root?, kind?: 'melee'|'shot'|'wave'|'hazard', src? (enemy) }
 */
export function hurtHero(L, amount, sx, sy, o = {}) {
  const h = L.hero;
  if (!h || h.down || L.phase !== 'play') return 'immune';
  if (h.invuln > 0 && o.kind !== 'hazard') return 'immune';
  if (o.kind === 'hazard' && h.hazardCd > 0) return 'immune';
  const fromAng = angleTo(h.x, h.y, sx, sy);
  if (h.shieldT > 0 && o.kind !== 'wave' && o.kind !== 'hazard' && angDiff(fromAng, h.facing) < Math.PI * 0.5) {
    playSfx('shield');
    L.fx.burst(h.x + Math.cos(h.facing) * 20, h.y - 18 + Math.sin(h.facing) * 14, PALETTE.paper, 8, 130);
    L.fx.floatText(h.x, h.y - 62, 'BLOCK', PALETTE.ice);
    if (o.src && o.kind === 'melee') { o.src.stun = Math.max(o.src.stun, 0.6); o.src.kvx += Math.cos(fromAng) * 260 / o.src.mass; o.src.kvy += Math.sin(fromAng) * 260 / o.src.mass; }
    return 'blocked';
  }
  let dmg = amount * (h.aggroT > 0 ? 0.5 : 1);
  dmg = Math.max(1, Math.round(dmg));
  h.hp -= dmg;
  h.flash = 0.15; h.hurtT = 0.25;
  if (o.kind === 'hazard') h.hazardCd = 0.6; else h.invuln = 0.5;
  const k = o.knock ?? 160;
  h.kvx += Math.cos(fromAng + Math.PI) * k;
  h.kvy += Math.sin(fromAng + Math.PI) * k;
  if (o.slow) h.slowT = Math.max(h.slowT, o.slow);
  if (o.root) { h.rootT = Math.max(h.rootT, o.root); L.fx.floatText(h.x, h.y - 80, 'Rooted!', PALETTE.mint); }
  L.fx.floatText(h.x, h.y - 60, `-${dmg}`, PALETTE.danger);
  L.fx.burst(h.x, h.y - 20, PALETTE.danger, 8, 120);
  L.fx.addShake(o.kind === 'hazard' ? 2 : 5);
  L.damageTaken += dmg;
  playSfx('hurt');
  if (h.hp <= 0) { h.hp = 0; L.onHeroDown(); }
  return 'hit';
}

// ---------------------------------------------------------------- enemies
/**
 * Damage an enemy. Returns true if damage landed.
 * o: { knock, stun, slow, burn, crit, silent, src:'basic'|skillId }
 */
export function damageEnemy(L, e, amount, sx, sy, o = {}) {
  if (e.dead || e.spawning > 0 || e.hidden) return false;
  if (e.invuln > 0 || e.armored) {
    if (!o.silent && (e.hintCd ?? 0) <= 0) { L.fx.floatText(e.x, e.y - e.h - 10, e.armorHint ?? 'Tink!', PALETTE.ice); e.hintCd = 1; }
    playSfx('shield');
    return false;
  }
  const towardAng = angleTo(sx, sy, e.x, e.y);
  let mul = L.hero?.dmgMul ?? 1;
  const marked = e.markT > 0;
  if (marked) mul *= 1.6;
  const dmg = Math.max(1, Math.round(amount * mul));
  e.hp -= dmg;
  e.flash = 0.12;
  const k = (o.knock ?? 120) / e.mass;
  e.kvx += Math.cos(towardAng) * k;
  e.kvy += Math.sin(towardAng) * k;
  if (o.stun) e.stun = Math.max(e.stun, o.stun / (e.boss ? 4 : 1));
  if (o.slow) e.slowT = Math.max(e.slowT, o.slow);
  if (o.burn) e.burnT = Math.max(e.burnT, o.burn);
  const crit = marked || o.crit;
  L.fx.floatText(e.x + (Math.random() - 0.5) * 12, e.y - e.h - 8, crit ? `${dmg}!` : String(dmg), crit ? PALETTE.sun : PALETTE.paper, crit ? { size: 20 } : undefined);
  L.fx.burst(e.x, e.y - e.h * 0.5, e.color ?? PALETTE.paper, 6, 110);
  if (!o.silent) playSfx(L.hero?.id === 'victoria' && o.src === 'basic' ? 'whack' : 'hit');
  e.onHurt?.(L, e, dmg);
  if (e.hp <= 0) killEnemy(L, e);
  return true;
}

export function killEnemy(L, e, { silent = false } = {}) {
  if (e.dead) return;
  e.dead = true;
  e.hp = 0;
  L.kills++;
  if (e.counts !== false) L.defeated++;
  if (!silent) {
    L.fx.burst(e.x, e.y - e.h * 0.5, e.color ?? PALETTE.paper, e.boss ? 40 : 14, e.boss ? 260 : 170);
    L.fx.sparkle?.(e.x, e.y - e.h * 0.5, PALETTE.sun, e.boss ? 20 : 5, e.boss ? 60 : 20);
    L.fx.addShake(e.boss ? 14 : 3);
    playSfx(e.boss ? 'victory' : 'squish');
  }
  e.onDeath?.(L, e);
  // occasional heart drop keeps runs forgiving (more likely when hurt)
  const h = L.hero;
  if (!silent && h && !e.noDrops && e.counts !== false) {
    const need = 1 - h.hp / h.maxHp;
    if (Math.random() < 0.05 + need * 0.18) spawnPickup(L, 'heart', e.x, e.y);
  }
  L.game.events.emit('enemy:defeated', { type: e.type, x: e.x, y: e.y });
  L.stage?.onKill?.(L, e);
}

// ---------------------------------------------------------------- projectiles
/**
 * Spawn a projectile.
 * s: { kind, team:'hero'|'enemy', x, y, vx, vy, r, dmg, life, pierce?, knock?, slow?, stun?, burn?,
 *      lob?: {tx,ty,dur,h,splash}, onLand?(L,s), onHit?(L,s,e) -> bool keepAlive, bounces?, boomerang?, spin? }
 */
export function spawnShot(L, s) {
  const shot = { r: 6, life: 1, pierce: 0, hits: new Set(), z: 0, ...s, t: 0 };
  if (shot.lob) { shot.lob.sx = shot.x; shot.lob.sy = shot.y; shot.life = shot.lob.dur + 0.05; }
  L.shots.push(shot);
  return shot;
}

/** Enemy lob from (x,y) to (tx,ty) with a landing telegraph. */
export function lob(L, kind, x, y, tx, ty, dmg, o = {}) {
  const dur = o.dur ?? Math.max(0.6, Math.min(1.2, dist(x, y, tx, ty) / 380));
  const splash = o.splash ?? 34;
  addTelegraph(L, { kind: 'circle', x: tx, y: ty, r: splash, dur, color: o.color });
  return spawnShot(L, { kind, team: 'enemy', x, y, vx: 0, vy: 0, r: 9, dmg, lob: { tx, ty, dur, h: o.h ?? 120, splash }, slow: o.slow, onLand: o.onLand });
}

function nearestEnemy(L, x, y, maxD, exclude) {
  let best = null, bd = maxD;
  for (const e of L.enemies) {
    if (!targetable(e) || exclude?.has(e)) continue;
    const d = dist(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
export { nearestEnemy };

/** Plate Shield reflection: turn an enemy shot into a hero shot at the nearest enemy. */
function reflectShot(L, s, h) {
  const target = nearestEnemy(L, s.x, s.y, 560);
  const ang = target ? angleTo(s.x, s.y, target.x, target.y - target.h * 0.4) : h.facing;
  s.team = 'hero';
  s.lob = null; s.z = 0;
  s.vx = Math.cos(ang) * 560; s.vy = Math.sin(ang) * 560;
  s.dmg = Math.round(h.damage * 1.8);
  s.life = 1.2; s.t = 0; s.hits = new Set(); s.reflected = true; s.onLand = null;
  playSfx('shield');
  L.fx.burst(s.x, s.y, PALETTE.paper, 10, 140);
  L.fx.floatText(h.x, h.y - 72, 'Reflected!', PALETTE.mint);
}

function shieldCatches(h, s) {
  return h && h.shieldT > 0 && dist(s.x, s.y, h.x, h.y - 16) < 46 && angDiff(angleTo(h.x, h.y, s.x, s.y), h.facing) < Math.PI * 0.55;
}

export function updateShots(L, dt) {
  const h = L.hero;
  for (const s of L.shots) {
    if (s.dead) continue;
    s.t += dt;
    s.life -= dt;
    if (s.lob) {
      const k = Math.min(1, s.t / s.lob.dur);
      s.x = s.lob.sx + (s.lob.tx - s.lob.sx) * k;
      s.y = s.lob.sy + (s.lob.ty - s.lob.sy) * k;
      s.z = 4 * s.lob.h * k * (1 - k);
      if (s.team === 'enemy' && s.z < 50 && shieldCatches(h, s)) { reflectShot(L, s, h); continue; }
      if (k >= 1) {
        s.dead = true;
        L.fx.burst(s.x, s.y, s.color ?? PALETTE.paper, 10, 110);
        if (s.team === 'enemy') {
          if (h && dist(s.x, s.y, h.x, h.y) < s.lob.splash + h.r) hurtHero(L, s.dmg, s.x, s.y, { slow: s.slow, knock: 90, kind: 'shot' });
        } else {
          for (const e of L.enemies) if (targetable(e) && dist(s.x, s.y, e.x, e.y) < s.lob.splash + e.r) damageEnemy(L, e, s.dmg, s.x, s.y, { knock: s.knock ?? 200, stun: s.stun, slow: s.slow, src: s.src });
        }
        s.onLand?.(L, s);
      }
      continue;
    }
    // homing / boomerang
    if (s.boomerang) {
      if (!s.returning && s.t > s.boomerang) { s.returning = true; s.hits = new Set(); }
      if (s.returning && h) {
        const a = angleTo(s.x, s.y, h.x, h.y - 16), sp = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
        if (dist(s.x, s.y, h.x, h.y - 16) < 22) { s.dead = true; continue; }
        s.life = Math.max(s.life, 0.2);
      }
    }
    if (s.curve) { const a = Math.atan2(s.vy, s.vx) + s.curve * dt, sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.life <= 0) { s.dead = true; continue; }
    const blocker = s.ghost ? null : shotBlocker(L.arena, s.x, s.y + 14, s.r * 0.5);
    if (s.team === 'hero') {
      for (const e of L.enemies) {
        if (!targetable(e) || s.hits.has(e) || (e.flying && s.lowOnly)) continue;
        if (dist(s.x, s.y, e.x, e.y - e.h * 0.4) < s.r + e.r + 4) {
          s.hits.add(e);
          damageEnemy(L, e, s.dmg, s.x - s.vx * 0.05, s.y - s.vy * 0.05, { knock: s.knock ?? 90, slow: s.slow, stun: s.stun, src: s.src });
          if (s.onHit && s.onHit(L, s, e)) continue;
          if (s.boomerang) continue;
          if (s.pierce-- <= 0) { s.dead = true; break; }
        }
      }
      if (s.dead) { L.fx.burst(s.x, s.y, s.color ?? PALETTE.paper, 6, 90); continue; }
      if (blocker) {
        if (s.bounces > 0) { bounceOff(L, s); continue; }
        if (s.boomerang) { s.returning = true; continue; }
        s.dead = true;
        L.fx.burst(s.x, s.y, s.color ?? PALETTE.paper, 5, 70);
      }
    } else {
      if (shieldCatches(h, s)) { reflectShot(L, s, h); continue; }
      if (L.boundary && L.boundary.t < L.boundary.dur && Math.abs(dist(s.x, s.y, L.boundary.x, L.boundary.y) - L.boundary.r) < 14) {
        s.dead = true; L.fx.burst(s.x, s.y, PALETTE.mint, 6, 80); continue;
      }
      if (h && !h.down && dist(s.x, s.y, h.x, h.y - 16) < s.r + h.r) {
        hurtHero(L, s.dmg, s.x - s.vx, s.y - s.vy, { slow: s.slow, knock: 120, kind: 'shot' });
        s.dead = true;
        L.fx.burst(s.x, s.y, s.color ?? PALETTE.paper, 6, 90);
        continue;
      }
      if (blocker) { s.dead = true; L.fx.burst(s.x, s.y, s.color ?? PALETTE.paper, 5, 70); }
    }
  }
  L.shots = L.shots.filter((s) => !s.dead);
}

function bounceOff(L, s) {
  s.bounces--;
  const a = L.arena;
  // reflect off walls, otherwise just reverse
  if (s.x < SIDE + 4 || s.x > a.w - SIDE - 4) s.vx = -s.vx;
  else if (s.y + 14 < a.wallH - 20 || s.y > a.h) s.vy = -s.vy;
  else { s.vx = -s.vx; s.vy = -s.vy; }
  s.x += s.vx * 0.02; s.y += s.vy * 0.02;
  s.hits = new Set();
  playSfx('boing');
}

/** Destroy enemy shots within radius. */
export function clearEnemyShots(L, x, y, r, arcAng = null, arc = Math.PI * 2) {
  let n = 0;
  for (const s of L.shots) {
    if (s.team !== 'enemy' || s.dead) continue;
    if (s.lob && s.z > 60) continue;
    if (dist(x, y, s.x, s.y) > r) continue;
    if (arcAng !== null && angDiff(angleTo(x, y, s.x, s.y), arcAng) > arc / 2) continue;
    s.dead = true; n++;
    L.fx.burst(s.x, s.y, PALETTE.paper, 6, 100);
  }
  return n;
}

// ---------------------------------------------------------------- shockwaves
/** Expanding ring. team 'enemy' hurts the hero once; 'hero' is visual. */
export function addWave(L, w) {
  L.waves.push({ r: 8, band: 22, speed: 360, maxR: 220, hit: false, color: PALETTE.danger, ...w });
}

export function updateWaves(L, dt) {
  const h = L.hero;
  for (const w of L.waves) {
    w.r += w.speed * dt;
    if (w.r >= w.maxR) { w.dead = true; continue; }
    if (w.team !== 'enemy' || w.hit || !h) continue;
    const d = dist(w.x, w.y, h.x, h.y);
    if (Math.abs(d - w.r) < w.band + h.r * 0.5) {
      const res = hurtHero(L, w.dmg, w.x, w.y, { knock: 280, kind: 'wave' });
      if (res === 'hit') w.hit = true;
    }
  }
  L.waves = L.waves.filter((w) => !w.dead);
}

// ---------------------------------------------------------------- telegraphs
/** t: { kind:'circle'|'line'|'cone', x, y, r?, ang?, len?, width?, arc?, dur, follow?, color? } */
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

// ---------------------------------------------------------------- pickups (hearts)
export function spawnPickup(L, kind, x, y) {
  const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 100;
  L.pickups.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, z: 0, vz: 160 + Math.random() * 80, t: 0, seed: Math.floor(Math.random() * 1000) });
}

export function updatePickups(L, dt) {
  const h = L.hero;
  for (const p of L.pickups) {
    p.t += dt;
    p.vz -= 520 * dt;
    p.z = Math.max(0, p.z + p.vz * dt);
    if (p.z === 0) p.vz = Math.abs(p.vz) > 60 ? -p.vz * 0.35 : 0;
    const f = Math.exp(-4 * dt);
    p.vx *= f; p.vy *= f;
    if (h && !h.down && p.t > 0.35) {
      const d = dist(p.x, p.y, h.x, h.y);
      if (d < 90) { const a = angleTo(p.x, p.y, h.x, h.y), sp = 240 + (90 - d) * 4; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; }
      if (d < h.r + 10) {
        p.dead = true;
        const heal = Math.round(h.maxHp * 0.15);
        h.hp = Math.min(h.maxHp, h.hp + heal);
        L.fx.floatText(h.x, h.y - 70, `+${heal}`, PALETTE.heal);
        L.fx.burst(p.x, p.y, PALETTE.heal, 8, 90);
        playSfx('pickup');
        continue;
      }
    }
    if (p.t > 14) p.dead = true;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.x = Math.max(40, Math.min(L.arena.w - 40, p.x));
    p.y = Math.max(L.arena.wallH + 10, Math.min(L.arena.h - 30, p.y));
  }
  L.pickups = L.pickups.filter((p) => !p.dead);
}

// ---------------------------------------------------------------- ground zones
/**
 * Zones are lingering ground areas. kind:
 *  'web' | 'puddle' | 'fire'  (hostile: slow/hurt the hero)    'net' (snares enemies)   'burnmark' (visual)
 * z: { kind, x, y, r, dur, dmg?, slow? }
 */
export function addZone(L, z) { const zone = { t: 0, ...z }; L.zones.push(zone); return zone; }

export function updateZones(L, dt) {
  const h = L.hero;
  for (const z of L.zones) {
    z.t += dt;
    if (z.t >= z.dur) { z.dead = true; continue; }
    const grow = Math.min(1, z.t * 5);
    const r = z.r * grow;
    if (z.kind === 'net') {
      for (const e of L.enemies) if (targetable(e) && !e.flying && dist(e.x, e.y, z.x, z.y) < r + e.r * 0.5) { e.snareT = Math.max(e.snareT, 0.25); }
      continue;
    }
    if (!h || h.down) continue;
    const inside = Math.hypot(h.x - z.x, (h.y - z.y) / 0.7) < r;
    if (!inside) continue;
    if (z.kind === 'web') h.slowT = Math.max(h.slowT, 0.3);
    if (z.kind === 'puddle') { h.slowT = Math.max(h.slowT, 0.2); if (z.dmg) hurtHero(L, z.dmg, z.x, z.y, { kind: 'hazard', knock: 0 }); }
    if (z.kind === 'fire' && z.t > 0.2) hurtHero(L, z.dmg ?? 6, z.x, z.y, { kind: 'hazard', knock: 30 });
  }
  L.zones = L.zones.filter((z) => !z.dead);
}
