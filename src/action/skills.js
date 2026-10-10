// Every skill in theme.SKILLS: cooldowns, tutorial prompts, and what they do. Owned by: action team.
// cast(L, h) runs once on press; channel skills (mop_spin, garden_hose) tick in updateChannel.
// Visuals: L.vfx entries ({kind, x, y, ang, t, dur, ...}) rendered by draw.js drawVfx.
import { PALETTE } from '../core/theme.js';
import { dist, angleTo } from '../core/math.js';
import { playSfx } from '../audio/sfx.js';
import { angDiff, damageEnemy, spawnShot, clearEnemyShots, addZone, nearestEnemy, targetable, addWave } from './combat.js';

const TAU = Math.PI * 2;

/** Hit every targetable enemy in an arc/circle. Returns the number hit. */
function arcHit(L, h, range, arc, mul, o = {}) {
  let n = 0;
  for (const e of L.enemies) {
    if (!targetable(e)) continue;
    if (e.flying && o.ground) continue;
    const d = dist(h.x, h.y, e.x, e.y);
    if (d > range + e.r) continue;
    if (arc < TAU && d > e.r + 10 && angDiff(angleTo(h.x, h.y, e.x, e.y), h.facing) > arc / 2) continue;
    if (o.filter && !o.filter(e)) continue;
    if (damageEnemy(L, e, h.damage * mul, h.x, h.y, o)) n++;
  }
  return n;
}

function vfx(L, v) { L.vfx.push({ t: 0, ...v }); }

/**
 * Skill definitions. tut = first-time prompt (shown once per skill, flag 'action.tut.<id>').
 * Prompt text names the key; {key} is substituted with the slot key.
 */
export const SKILL_DEF = {
  // ---------------------------------------------------------------- basics
  kick: {
    cd: 0.42, tut: 'Click or J: Karate Kick! Hold to keep kicking.',
    cast(L, h) {
      h.atkT = h.atkDur;
      playSfx('kick');
      const range = 62 * (h.growT > 0 ? 1.3 : 1), arc = Math.PI * 0.75;
      const n = arcHit(L, h, range, arc, 1, { knock: 230, src: 'basic' });
      n && L.fx.addShake(2.5);
      clearEnemyShots(L, h.x, h.y - 10, range + 10, h.facing, arc);
      vfx(L, { kind: 'swoosh', x: h.x, y: h.y - 20, ang: h.facing, arc, r: range * 0.9, dur: 0.2, color: PALETTE.paper });
    },
  },
  wrench: {
    cd: 0.46, tut: 'Click or J: Wrench Whack! Hold to keep whacking.',
    cast(L, h) {
      h.atkT = h.atkDur;
      playSfx('swing');
      // Long-handled swing: reaches a bit past the kick with a wide arc, so it lands as easily (user playtest).
      const range = 70 * (h.growT > 0 ? 1.3 : 1), arc = Math.PI * 0.85;
      const n = arcHit(L, h, range, arc, 1.15, { knock: 280, stun: 0.25, src: 'basic' });
      if (n) { L.fx.addShake(3.5); L.fx.burst(h.x + Math.cos(h.facing) * 40, h.y - 16 + Math.sin(h.facing) * 30, PALETTE.sun, 6, 140); }
      clearEnemyShots(L, h.x, h.y - 10, range + 10, h.facing, arc);
      vfx(L, { kind: 'swoosh', x: h.x, y: h.y - 20, ang: h.facing, arc, r: range * 0.9, dur: 0.22, color: '#c8d0dc', thick: 11 });
    },
  },

  // ---------------------------------------------------------------- office
  debug: {
    cd: 8, tut: 'Press {key}: Debug reveals hidden bugs and marks enemies for big crits.',
    cast(L, h) {
      playSfx('blip');
      const R = 340;
      vfx(L, { kind: 'scan', x: h.x, y: h.y, r: R, dur: 0.6, color: PALETTE.mint });
      let n = 0;
      for (const e of L.enemies) {
        if (e.dead || e.spawning > 0 || dist(h.x, h.y, e.x, e.y) > R) continue;
        if (e.hidden) { e.hidden = false; e.revealT = 0.4; L.fx.floatText(e.x, e.y - e.h - 16, 'FOUND!', PALETTE.mint); }
        e.markT = 6; n++;
      }
      L.fx.floatText(h.x, h.y - 124, n ? `Debug: ${n} marked` : 'Debug: no bugs nearby', PALETTE.mint);
    },
  },
  // Short Circuit (id stays 'unplug' so saves keep it): Victoria rewires the room's current into a bolt that
  // jumps enemy to enemy. Real damage on every hop; machines take extra and stay fried (stunned) for a while.
  unplug: {
    cd: 7, tut: 'Press {key}: Short Circuit! A bolt jumps between up to 6 enemies. Machines get fried.',
    cast(L, h) {
      playSfx('error');
      const hit = new Set(), pts = [{ x: h.x + Math.cos(h.facing) * 16, y: h.y - 22 }];
      // first target: the closest enemy roughly where she's aiming, else just the closest one
      let e = null, bd = 280;
      for (const c of L.enemies) {
        if (!targetable(c)) continue;
        const d = dist(h.x, h.y, c.x, c.y);
        if (d < bd && (d < c.r + 30 || angDiff(angleTo(h.x, h.y, c.x, c.y), h.facing) < 0.6)) { bd = d; e = c; }
      }
      e ??= nearestEnemy(L, h.x, h.y, 200);
      let px = h.x, py = h.y;
      while (e && hit.size < 6) {
        hit.add(e);
        const zap = e.electronic ? 2.2 : 1.4;
        damageEnemy(L, e, h.damage * zap, px, py, { knock: 90, stun: e.electronic ? 3 : 1.1 });
        if (e.electronic) L.fx.floatText(e.x, e.y - e.h - 18, 'FRIED', PALETTE.sun);
        L.fx.burst(e.x, e.y - e.h * 0.5, PALETTE.sun, 6, 150);
        pts.push({ x: e.x, y: e.y - e.h * 0.5 });
        px = e.x; py = e.y;
        e = nearestEnemy(L, px, py, 220, hit);
      }
      if (hit.size) {
        vfx(L, { kind: 'chain', x: h.x, y: h.y, pts, dur: 0.4, color: PALETTE.sun });
        L.fx.addShake(2 + hit.size);
        if (hit.size > 2) L.fx.floatText(h.x, h.y - 124, `Short Circuit x${hit.size}!`, PALETTE.sun);
      } else {
        vfx(L, { kind: 'zap', x: h.x, y: h.y - 16, ang: h.facing, arc: 0.5, r: 120, dur: 0.3, color: PALETTE.sun });
        L.fx.floatText(h.x, h.y - 124, 'Short Circuit: nothing in reach', 'rgba(255,246,229,0.7)');
      }
    },
  },

  // ---------------------------------------------------------------- kitchen
  bread_toss: {
    cd: 4.5, tut: 'Press {key}: Bread Toss lobs a baguette where you aim. Big splash!',
    cast(L, h) {
      playSfx('throw');
      h.atkT = h.atkDur;
      const p = aimPointOf(L, h, 330);
      spawnShot(L, { kind: 'baguette', team: 'hero', x: h.x, y: h.y - 20, vx: 0, vy: 0, r: 8, dmg: Math.round(h.damage * 2.2), knock: 300, stun: 0.5,
        lob: { tx: p.x, ty: p.y, dur: 0.55, h: 110, splash: 64 }, color: '#e0b46a', spin: 14,
        onLand: (LL, s) => { LL.fx.addShake(5); LL.fx.burst(s.x, s.y, '#e0b46a', 16, 180); vfx(LL, { kind: 'ring', x: s.x, y: s.y, r: 64, dur: 0.35, color: '#f2c26b' }); playSfx('squish'); } });
    },
  },
  hot_pan: {
    cd: 6, tut: 'Press {key}: Hot Pan is a wide sizzling swing that burns.',
    cast(L, h) {
      playSfx('whack');
      h.atkT = h.atkDur;
      const range = 92, arc = Math.PI * 1.15;
      const n = arcHit(L, h, range, arc, 1.6, { knock: 320, burn: 3 });
      if (n) L.fx.addShake(5);
      vfx(L, { kind: 'swoosh', x: h.x, y: h.y - 20, ang: h.facing, arc, r: range * 0.9, dur: 0.28, color: '#ff8a3d', thick: 14 });
      for (let i = 0; i < 8; i++) { const a = h.facing - arc / 2 + arc * i / 7; L.fx.burst(h.x + Math.cos(a) * range * 0.8, h.y - 14 + Math.sin(a) * range * 0.6, i % 2 ? PALETTE.sunDeep : PALETTE.danger, 2, 60); }
    },
  },

  // ---------------------------------------------------------------- dining
  plate_shield_a: { cd: 7, tut: 'Press {key}: Plate Shield blocks hits from the front and reflects shots.', cast: plateShield },
  plate_shield_v: { cd: 7, tut: 'Press {key}: Plate Shield blocks hits from the front and reflects shots.', cast: plateShield },

  // ---------------------------------------------------------------- living
  karate_sweep: {
    cd: 5.5, tut: 'Press {key}: Karate Sweep spins and knocks everything away.',
    cast(L, h) {
      playSfx('kick');
      h.spinT = 0.35; h.atkT = h.atkDur;
      const n = arcHit(L, h, 100, TAU, 1.4, { knock: 520, stun: 0.6 });
      clearEnemyShots(L, h.x, h.y, 110);
      vfx(L, { kind: 'spin', x: h.x, y: h.y - 12, r: 96, dur: 0.35, color: PALETTE.paper });
      L.fx.addShake(n ? 7 : 3);
    },
  },
  throw_pillow: {
    cd: 4.5, tut: 'Press {key}: Throw Pillow ricochets off walls and enemies.',
    cast(L, h) {
      playSfx('throw');
      h.atkT = h.atkDur;
      const a = h.facing;
      spawnShot(L, { kind: 'pillow', team: 'hero', x: h.x + Math.cos(a) * 14, y: h.y - 20, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 11, dmg: Math.round(h.damage * 1.3), life: 2.4, knock: 220, bounces: 4, pierce: 99, color: '#c9a0dc', spin: 9,
        onHit: (LL, s, e) => { const nx = nearestEnemy(LL, s.x, s.y, 360, s.hits); if (nx && s.bounces-- > 0) { const b = angleTo(s.x, s.y, nx.x, nx.y - nx.h * 0.4); s.vx = Math.cos(b) * 520; s.vy = Math.sin(b) * 520; playSfx('boing'); } return true; } });
    },
  },

  // ---------------------------------------------------------------- playroom
  tap_card: {
    cd: 7, tut: 'Press {key}: Tap a Card casts a random spell card. Bolt, Growth or Salve!',
    cast(L, h) {
      playSfx('card');
      const cards = ['bolt', 'bolt', 'growth', 'salve'];
      if (h.hp > h.maxHp * 0.85) cards.pop(); // don't waste salve at full hp
      const c = cards[Math.floor(Math.random() * cards.length)];
      vfx(L, { kind: 'card', x: h.x, y: h.y - 70, dur: 1.1, card: c });
      if (c === 'bolt') {
        L.fx.floatText(h.x, h.y - 140, 'Lightning Bolt!', PALETTE.sun, { big: true });
        const hit = new Set();
        for (let i = 0; i < 3; i++) {
          const e = nearestEnemy(L, h.x, h.y, 520, hit);
          if (!e) break;
          hit.add(e);
          damageEnemy(L, e, h.damage * 2.2, e.x, e.y - 50, { knock: 60, stun: 0.5 });
          vfx(L, { kind: 'bolt', x: e.x, y: e.y - e.h * 0.5, dur: 0.3, color: PALETTE.sun });
        }
        L.fx.addShake(6);
      } else if (c === 'growth') {
        L.fx.floatText(h.x, h.y - 140, 'Giant Growth!', PALETTE.heal, { big: true });
        h.growT = 6; h.cd[h.slots.basic] = 0;
      } else {
        L.fx.floatText(h.x, h.y - 140, 'Healing Salve!', PALETTE.heal, { big: true });
        const heal = Math.round(h.maxHp * 0.3);
        h.hp = Math.min(h.maxHp, h.hp + heal);
        L.fx.burst(h.x, h.y - 20, PALETTE.heal, 18, 140);
      }
    },
  },
  bouncy_ball: {
    cd: 4.5, tut: 'Press {key}: Bouncy Ball pings from enemy to enemy.',
    cast(L, h) {
      playSfx('boing');
      h.atkT = h.atkDur;
      const a = h.facing;
      spawnShot(L, { kind: 'ball', team: 'hero', x: h.x + Math.cos(a) * 14, y: h.y - 20, vx: Math.cos(a) * 600, vy: Math.sin(a) * 600, r: 8, dmg: Math.round(h.damage * 1.1), life: 2.2, knock: 120, chain: 6, pierce: 99, color: '#ff5d8f',
        onHit: (LL, s, e) => {
          if (--s.chain <= 0) { s.dead = true; return true; }
          const nx = nearestEnemy(LL, s.x, s.y, 300, s.hits);
          if (!nx) { s.dead = true; return true; }
          const b = angleTo(s.x, s.y, nx.x, nx.y - nx.h * 0.4); s.vx = Math.cos(b) * 640; s.vy = Math.sin(b) * 640; s.life = 1; playSfx('boing');
          return true;
        }, bounces: 2 });
    },
  },

  // ---------------------------------------------------------------- primary
  sock_sling: {
    cd: 3.5, tut: 'Press {key}: Sock Sling hits from range and slows.',
    cast(L, h) {
      playSfx('throw');
      h.atkT = h.atkDur;
      for (const off of [-0.12, 0.12]) {
        const a = h.facing + off;
        spawnShot(L, { kind: 'sock', team: 'hero', x: h.x + Math.cos(a) * 14, y: h.y - 20, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, r: 8, dmg: Math.round(h.damage * 1.1), life: 0.9, knock: 90, slow: 3, pierce: 1, color: '#ff8fb1', spin: 12 });
      }
    },
  },
  crochet_net: {
    cd: 8, tut: 'Press {key}: Crochet Net snares every enemy in the area. Aim, then toss!',
    cast(L, h) {
      playSfx('stitch');
      const p = aimPointOf(L, h, 300);
      spawnShot(L, { kind: 'yarn', team: 'hero', x: h.x, y: h.y - 20, vx: 0, vy: 0, r: 8, dmg: Math.round(h.damage * 0.6), knock: 0,
        lob: { tx: p.x, ty: p.y, dur: 0.45, h: 80, splash: 95 }, color: '#ff8fb1',
        onLand: (LL, s) => { addZone(LL, { kind: 'net', x: s.x, y: s.y, r: 95, dur: 3.5 }); playSfx('stitch'); } });
    },
  },

  // ---------------------------------------------------------------- guest
  mop_spin: {
    cd: 7, tut: 'Press {key}: Mop Spin whirls you through enemies and dries puddles.',
    cast(L, h) {
      playSfx('splash');
      h.channel = { id: 'mop_spin', t: 0, dur: 1.5, tick: 0, moveMul: 1.1 };
    },
    tick(L, h, dt, ch) {
      h.spinT = 0.1;
      ch.tick -= dt;
      if (ch.tick <= 0) {
        ch.tick = 0.25;
        arcHit(L, h, 84, TAU, 0.55, { knock: 340, silent: true });
        clearEnemyShots(L, h.x, h.y, 90);
        vfx(L, { kind: 'spin', x: h.x, y: h.y - 10, r: 80, dur: 0.25, color: PALETTE.lake });
        playSfx('swing');
      }
      for (const z of L.zones) if ((z.kind === 'puddle' || z.kind === 'web' || z.kind === 'fire') && dist(z.x, z.y, h.x, h.y) < z.r + 60) z.dur = Math.min(z.dur, z.t + 0.3);
      if (Math.random() < 0.6) L.fx.burst(h.x + (Math.random() - 0.5) * 120, h.y - 6, PALETTE.lake, 1, 60);
    },
  },
  wrench_throw: {
    cd: 4, tut: 'Press {key}: Wrench Throw flies out and boomerangs back.',
    cast(L, h) {
      playSfx('throw');
      h.atkT = h.atkDur;
      const a = h.facing;
      spawnShot(L, { kind: 'wrench', team: 'hero', x: h.x + Math.cos(a) * 14, y: h.y - 20, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, r: 10, dmg: Math.round(h.damage * 1.2), life: 2.5, knock: 160, stun: 0.3, boomerang: 0.45, color: '#c8d0dc', spin: 18, ghost: true });
    },
  },

  // ---------------------------------------------------------------- backyard
  drumline: {
    cd: 5, tut: 'Press {key}: Drumline shockwave. Hit it ON the beat (watch the ring) for double power!',
    cast(L, h) {
      const ph = beatPhase(L);
      const onBeat = ph < 0.14 || ph > 0.9;
      playSfx('drum');
      const R = onBeat ? 210 : 140;
      arcHit(L, h, R, TAU, onBeat ? 2.2 : 1.1, { knock: onBeat ? 480 : 300, stun: onBeat ? 1.0 : 0.3 });
      clearEnemyShots(L, h.x, h.y, R);
      addWave(L, { x: h.x, y: h.y, team: 'hero', maxR: R, speed: 800, color: onBeat ? PALETTE.sun : '#9b6ab8', band: 10 });
      L.fx.floatText(h.x, h.y - 128, onBeat ? 'ON BEAT!' : 'Off beat', onBeat ? PALETTE.sun : 'rgba(255,246,229,0.7)', onBeat ? { big: true } : undefined);
      L.fx.addShake(onBeat ? 9 : 4);
    },
  },
  garden_hose: {
    cd: 7, tut: 'Press {key}: Garden Hose sprays a stream that shoves enemies back.',
    cast(L, h) {
      playSfx('splash');
      h.channel = { id: 'garden_hose', t: 0, dur: 1.8, tick: 0, moveMul: 0.45 };
    },
    tick(L, h, dt, ch) {
      const len = 230, a = h.facing;
      ch.tick -= dt;
      for (const e of L.enemies) {
        if (!targetable(e)) continue;
        const dx = e.x - h.x, dy = e.y - h.y;
        const along = dx * Math.cos(a) + dy * Math.sin(a), across = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
        if (along < 0 || along > len || across > 26 + e.r) continue;
        e.kvx += Math.cos(a) * 900 * dt / e.mass; e.kvy += Math.sin(a) * 900 * dt / e.mass;
        if (ch.tick <= 0) damageEnemy(L, e, h.damage * 0.45, h.x, h.y, { knock: 40, silent: true });
      }
      for (const z of L.zones) if (z.kind === 'fire' && dist(z.x, z.y, h.x + Math.cos(a) * 120, h.y + Math.sin(a) * 120) < 140) z.dur = Math.min(z.dur, z.t + 0.2);
      if (ch.tick <= 0) ch.tick = 0.2;
      for (let i = 0; i < 3; i++) { const d = Math.random() * len; L.fx.burst(h.x + Math.cos(a) * d, h.y - 14 + Math.sin(a) * d, i ? PALETTE.lake : PALETTE.ice, 1, 40); }
      L.hoseVfx = { x: h.x, y: h.y - 16, ang: a, len };
    },
  },

  // ---------------------------------------------------------------- ultimates
  pull_aggro: {
    cd: 24, tut: 'SPACE: Pull Aggro! Everything comes to you, and you take half damage.',
    cast(L, h) {
      playSfx('shout');
      h.aggroT = 6; h.invuln = Math.max(h.invuln, 0.4);
      for (const e of L.enemies) {
        if (!targetable(e)) continue;
        e.tauntT = 6; e.fleeT = 0;
        if (e.hidden) e.hidden = false;
      }
      vfx(L, { kind: 'scan', x: h.x, y: h.y, r: 420, dur: 0.6, color: PALETTE.danger });
      L.fx.floatText(h.x, h.y - 136, 'PULL AGGRO!', PALETTE.danger, { big: true });
      L.fx.addShake(8);
    },
  },
  boundaries: {
    cd: 24, tut: 'SPACE: Boundaries! Nothing hostile crosses the ring; everything inside is stunned.',
    cast(L, h) {
      playSfx('shield');
      L.boundary = { x: h.x, y: h.y, r: 160, t: 0, dur: 6 };
      for (const e of L.enemies) e.inBoundary = dist(e.x, e.y, h.x, h.y) < 160;
      for (const e of L.enemies) if (!e.dead && dist(e.x, e.y, h.x, h.y) < 160 + e.r) { e.stun = Math.max(e.stun, e.boss ? 1.6 : 6); }
      clearEnemyShots(L, h.x, h.y, 170);
      L.fx.floatText(h.x, h.y - 136, 'BOUNDARIES.', PALETTE.mint, { big: true });
      L.fx.addShake(8);
    },
  },
};

function plateShield(L, h) {
  playSfx('shield');
  h.shieldT = 1.6;
  L.fx.burst(h.x + Math.cos(h.facing) * 18, h.y - 18, PALETTE.paper, 10, 100);
}

function aimPointOf(L, h, range) {
  const m = L.game.input.mouse;
  if (L.mouseAimT > 0) {
    const tx = m.x + L.cam.x, ty = m.y + L.cam.y;
    const d = Math.hypot(tx - h.x, ty - h.y);
    if (d <= range) return { x: tx, y: ty };
    return { x: h.x + (tx - h.x) / d * range, y: h.y + (ty - h.y) / d * range };
  }
  // keyboard: auto-target the nearest enemy in front, else straight ahead
  let best = null, bd = range;
  for (const e of L.enemies) { if (!targetable(e)) continue; const d = dist(h.x, h.y, e.x, e.y); if (d < bd && angDiff(angleTo(h.x, h.y, e.x, e.y), h.facing) < 0.7) { bd = d; best = e; } }
  if (best) return { x: best.x, y: best.y };
  return { x: h.x + Math.cos(h.facing) * range * 0.75, y: h.y + Math.sin(h.facing) * range * 0.75 };
}

/** Drumline beat: 100 BPM. 0..1 phase within the beat (0 = on the beat). */
export const BEAT = 0.6;
export function beatPhase(L) { return (L.time % BEAT) / BEAT; }

export function castSkill(L, h, id) {
  const def = SKILL_DEF[id];
  if (!def) return;
  def.cast(L, h);
  h.holdId = id; h.holdT = 0.5;
  h.cd[id] = def.cd;
  h.cdMax[id] = def.cd;
  L.onSkillUsed(id);
}

export function updateChannel(L, h, dt) {
  const ch = h.channel;
  ch.t += dt;
  SKILL_DEF[ch.id]?.tick?.(L, h, dt, ch);
  if (ch.t >= ch.dur) { h.channel = null; L.hoseVfx = null; }
}

/** Boundaries ring: keep hostiles out, stun those inside. Called every frame by the room. */
export function updateBoundary(L, dt) {
  const b = L.boundary;
  if (!b) return;
  b.t += dt;
  if (b.t >= b.dur) { L.boundary = null; return; }
  for (const e of L.enemies) {
    if (e.dead || e.spawning > 0) continue;
    const d = dist(e.x, e.y, b.x, b.y);
    if (e.inBoundary === undefined) e.inBoundary = d < b.r;
    if (e.inBoundary) { e.stun = Math.max(e.stun, e.boss ? 0 : 0.2); if (d > b.r - e.r) e.inBoundary = false; continue; }
    const min = b.r + e.r;
    if (d < min) {
      const a = angleTo(b.x, b.y, e.x, e.y);
      e.x = b.x + Math.cos(a) * min; e.y = b.y + Math.sin(a) * min;
      e.kvx = Math.cos(a) * 120; e.kvy = Math.sin(a) * 120;
      if (Math.random() < 0.3) L.fx.burst(e.x, e.y - 10, PALETTE.mint, 2, 60);
    }
  }
}
