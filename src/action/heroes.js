// Aaron + Victoria: tag-team heroes, abilities, swapping. Owned by: action team.
import { PALETTE, HEROES, HERO_IDS } from '../core/theme.js';
import { dist, angleTo } from '../core/math.js';
import { playSfx } from '../audio/sfx.js';
import { heroTuning } from './config.js';
import { collide } from './arena.js';
import { angDiff, damageEnemy, damageProp, spawnShot, clearEnemyShots, addWave } from './combat.js';

export function createHeroes(game, modifiers) {
  const party = game.state?.party ?? {};
  const out = {};
  for (const id of HERO_IDS) {
    const tune = heroTuning(id, party);
    const hp = modifiers.includes('warm_cocoa') ? Math.round(tune.maxHp * 1.25) : tune.maxHp;
    out[id] = {
      id, tune, x: 0, y: 0, r: 13,
      hp, maxHp: tune.maxHp,
      facing: -Math.PI / 2, moveAng: -Math.PI / 2,
      cd: { attack: 0, ability: 0, special: 0 },
      invuln: 0, flash: 0, hurtT: 0, slowT: 0,
      kvx: 0, kvy: 0,
      atkT: 0, atkDur: 0.22, dashT: 0, dashDur: 0.2, dashAng: 0, dashHits: new Set(),
      shieldT: 0, down: false, moving: false, animT: Math.random() * 3,
    };
  }
  return out;
}

/** Aim angle: mouse when it's been used recently, otherwise movement direction. */
function aimAngle(L, h) {
  const m = L.game.input.mouse;
  if (L.mouseAimT > 0) return angleTo(h.x, h.y - 18, m.x + L.cam.x, m.y + L.cam.y);
  return h.moveAng;
}

export function trySwap(L, auto = false) {
  const cur = L.hero;
  const otherId = L.activeId === 'aaron' ? 'victoria' : 'aaron';
  const other = L.heroes[otherId];
  if (other.down) {
    if (!auto && L.swapDeniedT <= 0) { L.fx.floatText(cur.x, cur.y - 70, `${HEROES[otherId].name} is down!`, PALETTE.danger); L.swapDeniedT = 1; }
    return false;
  }
  if (!auto && L.swapCd > 0) return false;
  other.x = cur.x; other.y = cur.y;
  other.facing = cur.facing; other.moveAng = cur.moveAng;
  other.kvx = 0; other.kvy = 0; other.slowT = 0;
  other.invuln = auto ? 1.2 : 0.5;
  other.atkT = 0; other.dashT = 0; other.shieldT = 0;
  cur.shieldT = 0; cur.dashT = 0;
  L.activeId = otherId;
  L.swapCd = 0.7;
  L.fx.burst(cur.x, cur.y - 20, PALETTE.sun, 18, 160);
  L.fx.burst(cur.x, cur.y - 20, otherId === 'victoria' ? PALETTE.denim : PALETTE.tee, 10, 120);
  if (auto) L.fx.floatText(cur.x, cur.y - 80, `${HEROES[otherId].name}, tag in!`, PALETTE.sun);
  playSfx('swap');
  L.game.events.emit('hero:swapped', { to: otherId });
  return true;
}

export function updateHeroes(L, dt) {
  const inp = L.game.input;
  const h = L.hero;
  // Benched hero regenerates (KO'd heroes stay down).
  for (const id of HERO_IDS) {
    const b = L.heroes[id];
    if (b === h || b.down) continue;
    if (b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + b.tune.regen * dt);
    for (const k in b.cd) b.cd[k] = Math.max(0, b.cd[k] - dt);
  }
  if (!h || h.down) return;
  h.animT += dt;
  for (const k in h.cd) h.cd[k] = Math.max(0, h.cd[k] - dt);
  h.invuln = Math.max(0, h.invuln - dt);
  h.flash = Math.max(0, h.flash - dt);
  h.hurtT = Math.max(0, h.hurtT - dt);
  h.slowT = Math.max(0, h.slowT - dt);
  h.atkT = Math.max(0, h.atkT - dt);
  h.shieldT = Math.max(0, h.shieldT - dt);

  if (inp.pressed('swap')) { if (trySwap(L)) return; }

  const ax = inp.axis();
  h.moving = ax.x !== 0 || ax.y !== 0;
  if (h.moving) h.moveAng = Math.atan2(ax.y, ax.x);
  h.facing = aimAngle(L, h);

  // Dash movement overrides normal movement.
  if (h.dashT > 0) {
    h.dashT -= dt;
    const sp = 780;
    h.x += Math.cos(h.dashAng) * sp * dt;
    h.y += Math.sin(h.dashAng) * sp * dt;
    if (Math.random() < 0.7) L.fx.burst(h.x, h.y - 10, PALETTE.sun, 2, 40);
    for (const e of L.enemies) {
      if (e.dead || e.spawning > 0 || h.dashHits.has(e)) continue;
      if (dist(h.x, h.y, e.x, e.y) < h.r + e.r + 10) {
        h.dashHits.add(e);
        // Knock aside, perpendicular to the dash.
        const side = Math.sign(Math.sin(angleTo(h.x, h.y, e.x, e.y) - h.dashAng)) || 1;
        const pa = h.dashAng + side * Math.PI / 2;
        e.kvx += Math.cos(pa) * 340 / e.mass; e.kvy += Math.sin(pa) * 340 / e.mass;
        e.stun = Math.max(e.stun, e.boss ? 0.1 : 0.4);
        if (h.tune.dashDamage > 0) damageEnemy(L, e, h.tune.damage * h.tune.dashDamage, h.x, h.y, { knock: 60, ignoreShield: true });
        else { L.fx.burst(e.x, e.y - 12, PALETTE.ice, 5, 90); playSfx('hit'); }
      }
    }
    if (h.dashT <= 0) h.invuln = Math.max(h.invuln, 0.1);
  } else {
    let sp = h.tune.speed * (h.slowT > 0 ? 0.55 : 1) * (h.shieldT > 0 ? 0.6 : 1) * (h.atkT > 0 && h.id === 'aaron' ? 0.7 : 1);
    h.x += ax.x * sp * dt;
    h.y += ax.y * sp * dt;
  }
  h.x += h.kvx * dt; h.y += h.kvy * dt;
  const f = Math.exp(-9 * dt);
  h.kvx *= f; h.kvy *= f;
  collide(L.arena, h);

  // Attacks. Holding attack auto-repeats on cooldown.
  if (inp.down('attack') && h.cd.attack <= 0) {
    if (inp.pressed('Mouse0') || inp.down('Mouse0')) L.mouseAimT = 3;
    h.facing = aimAngle(L, h);
    if (h.id === 'aaron') poleSweep(L, h); else mintFling(L, h);
    h.cd.attack = h.tune.cd.attack;
  }
  if (inp.pressed('ability') && h.cd.ability <= 0) {
    if (inp.pressed('Mouse2')) L.mouseAimT = 3;
    h.facing = aimAngle(L, h);
    if (h.id === 'aaron') compassDash(L, h); else denimShield(L, h);
    h.cd.ability = h.tune.cd.ability;
  } else if (inp.pressed('ability') && L.cdHintT <= 0) {
    L.cdHintT = 0.6;
  }
  if (inp.pressed('special') && h.cd.special <= 0) {
    if (h.id === 'aaron') summitShout(L, h); else flowerBloom(L, h);
    h.cd.special = h.tune.cd.special;
  }
}

// ---------------------------------------------------------------- Aaron
function poleSweep(L, h) {
  const t = h.tune;
  h.atkT = h.atkDur;
  playSfx('swing');
  const cx = h.x, cy = h.y;
  let hit = 0;
  for (const e of L.enemies) {
    if (e.dead || e.spawning > 0) continue;
    const d = dist(cx, cy, e.x, e.y);
    if (d > t.sweepRange + e.r) continue;
    if (d > e.r + 10 && angDiff(angleTo(cx, cy, e.x, e.y), h.facing) > t.sweepArc / 2) continue;
    if (damageEnemy(L, e, t.damage, cx, cy, { knock: 230 })) hit++;
  }
  for (const p of L.arena.props) {
    if (!p.destructible || p.broken) continue;
    const d = dist(cx, cy, p.x, p.y);
    if (d < t.sweepRange + p.r && angDiff(angleTo(cx, cy, p.x, p.y), h.facing) < t.sweepArc / 2 + 0.3) { damageProp(L, p, t.damage); hit++; }
  }
  hit += clearEnemyShots(L, cx, cy - 10, t.sweepRange + 10, h.facing, t.sweepArc);
  // Swoosh particles along the arc.
  for (let i = 0; i < 6; i++) {
    const a = h.facing - t.sweepArc / 2 + (t.sweepArc * i) / 5;
    L.fx.burst(cx + Math.cos(a) * t.sweepRange * 0.8, cy - 14 + Math.sin(a) * t.sweepRange * 0.8, PALETTE.paper, 1, 30);
  }
  if (hit) L.fx.addShake(2.5);
}

function compassDash(L, h) {
  h.dashAng = h.moving ? h.moveAng : h.facing;
  h.dashT = h.dashDur;
  h.dashHits = new Set();
  h.invuln = Math.max(h.invuln, h.dashDur + 0.05);
  h.slowT = 0;
  playSfx('dash');
  L.fx.burst(h.x, h.y - 10, PALETTE.sun, 10, 120);
}

function summitShout(L, h) {
  const t = h.tune;
  playSfx('shout');
  L.fx.addShake(9);
  addWave(L, { x: h.x, y: h.y, team: 'hero', maxR: t.shoutRadius, speed: 700, color: PALETTE.sun, band: 10 });
  L.fx.floatText(h.x, h.y - 80, 'SUMMIT SHOUT!', PALETTE.sun);
  h.invuln = Math.max(h.invuln, 0.3);
  for (const e of L.enemies) {
    if (e.dead || e.spawning > 0) continue;
    if (dist(h.x, h.y, e.x, e.y) < t.shoutRadius + e.r) {
      damageEnemy(L, e, t.damage * 0.5, h.x, h.y, { knock: 420, stun: t.shoutStun, ignoreShield: true });
    }
  }
  for (const p of L.arena.props) if (p.destructible && !p.broken && dist(h.x, h.y, p.x, p.y) < t.shoutRadius) damageProp(L, p, t.damage * 0.5);
  clearEnemyShots(L, h.x, h.y, t.shoutRadius);
}

// ---------------------------------------------------------------- Victoria
function mintFling(L, h) {
  const t = h.tune;
  h.atkT = h.atkDur;
  playSfx('throw');
  const n = t.scoops;
  for (let i = 0; i < n; i++) {
    const a = h.facing + (n > 1 ? (i - (n - 1) / 2) * 0.2 : 0);
    const sx = h.x + Math.cos(a) * 14, sy = h.y - 20 + Math.sin(a) * 10;
    spawnShot(L, { kind: 'mintscoop', team: 'hero', x: sx, y: sy, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, r: 7, dmg: n > 1 ? Math.round(t.damage * 0.75) : t.damage, life: 0.8, pierce: t.pierce, knock: 110 });
  }
}

function denimShield(L, h) {
  h.shieldT = h.tune.shieldDur;
  playSfx('shield');
  L.fx.burst(h.x + Math.cos(h.facing) * 16, h.y - 18, PALETTE.denim, 10, 100);
}

function flowerBloom(L, h) {
  const t = h.tune;
  playSfx('bloom');
  L.zones.push({ x: h.x, y: h.y, r: t.bloomRadius, t: 0, dur: 6, heal: t.bloomHeal, thaw: Math.round(t.damage * 0.6), seed: Math.floor(Math.random() * 1000) });
  L.fx.burst(h.x, h.y - 10, PALETTE.heal, 18, 160);
  L.fx.burst(h.x, h.y - 10, PALETTE.sun, 12, 120);
  L.fx.floatText(h.x, h.y - 80, 'Flower Box Bloom!', PALETTE.heal);
}

/** drawHero options for a hero. */
export function heroDrawOpts(L, h) {
  let anim = 'idle', progress;
  if (h.dashT > 0) { anim = 'dash'; progress = 1 - h.dashT / h.dashDur; }
  else if (h.atkT > 0) { anim = 'attack'; progress = 1 - h.atkT / h.atkDur; }
  else if (h.hurtT > 0) { anim = 'hurt'; progress = 1 - h.hurtT / 0.25; }
  else if (h.moving) anim = 'walk';
  const blink = h.invuln > 0 && h.dashT <= 0 && Math.floor(L.time * 20) % 2 === 0;
  return { facing: h.facing, anim, progress, t: h.animT, flash: h.flash, alpha: blink ? 0.55 : 1, shield: h.shieldT > 0 ? Math.min(1, h.shieldT * 5) : 0 };
}
