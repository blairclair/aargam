// Baron von Brrr: multi-phase final boss with telegraphed attacks. Owned by: action team.
import { PALETTE } from '../core/theme.js';
import { dist, angleTo } from '../core/math.js';
import { playSfx } from '../audio/sfx.js';
import { angDiff, hurtHero, spawnShot, lobSlush, addTelegraph, addWave } from './combat.js';

const PHASE_LINES = {
  2: ['Enough! Syndicate, to me! Chill them to the bone!', 'You dare scuff my monocle? Minions!'],
  3: ['I shall freeze summer itself... FOREVER!', 'No more manners. Prepare for ABSOLUTE ZERO!'],
};
const TAUNTS = [
  'Mint chip is wasted on the warm-blooded.',
  'Bow before the Baron!',
  'Such dreadful sunburnt manners.',
  'Your summer is OVER, darlings.',
  'A scoop for me, and none for thee!',
];

function pickAttack(L, e, d) {
  const p = e.phase;
  const opts = [];
  if (d < 130) opts.push('sweep', 'sweep');
  opts.push('fan');
  if (p >= 2) opts.push('barrage', 'summon');
  if (p >= 3) opts.push('nova', 'glide', 'spiral');
  else if (p === 2) opts.push('nova');
  let a = opts[Math.floor(Math.random() * opts.length)];
  if (a === e.lastAtk && opts.length > 1) a = opts[Math.floor(Math.random() * opts.length)];
  if (a === 'summon' && L.aliveCount() > 7) a = 'fan';
  e.lastAtk = a;
  return a;
}

export function updateBaron(L, e, dt, sp, steer) {
  const h = L.hero;
  if (!h) return;
  const frac = e.hp / e.maxHp;
  const want = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
  if (want > e.phase) {
    e.phase = want;
    e.invuln = 1.6;
    e.state = 'move'; e.st = 0; e.atkCd = 1.8;
    if (e.tele) e.tele.dead = true;
    L.fx.addShake(14);
    L.fx.burst(e.x, e.y - 40, PALETTE.ice, 40, 280);
    addWave(L, { x: e.x, y: e.y, team: 'enemy', dmg: e.damage * 0.5, maxR: 300, speed: 420 });
    playSfx('freeze');
    const lines = PHASE_LINES[want];
    L.bark('baron', lines[Math.floor(Math.random() * lines.length)], 3.2);
    L.onBossPhase?.(want);
  }
  const d = dist(e.x, e.y, h.x, h.y);
  const rage = e.phase === 3 ? 0.7 : e.phase === 2 ? 0.85 : 1;
  e.tauntCd = (e.tauntCd ?? 8) - dt;
  if (e.tauntCd <= 0) { e.tauntCd = 12 + Math.random() * 8; L.bark('baron', TAUNTS[Math.floor(Math.random() * TAUNTS.length)], 2.6); }

  switch (e.state) {
    case 'move': {
      e.anim = 'move';
      e.facing = angleTo(e.x, e.y, h.x, h.y);
      // Hover at a pompous distance and circle.
      e.strafeT -= dt;
      if (e.strafeT <= 0) { e.strafe *= -1; e.strafeT = 2 + Math.random() * 2; }
      const keep = e.phase === 3 ? 150 : 210;
      const a = e.facing + (d > keep ? 0.5 * e.strafe : Math.PI / 2 * e.strafe + (d < keep - 60 ? 0.6 * e.strafe : 0));
      steer(L, e, e.x + Math.cos(a) * 100, e.y + Math.sin(a) * 100, sp * (e.phase === 3 ? 1.25 : 1), dt);
      if (e.atkCd <= 0) startAttack(L, e, pickAttack(L, e, d));
      break;
    }
    case 'wind': {
      e.anim = 'attack';
      e.st -= dt;
      if (e.atk === 'fan' || e.atk === 'spiral') e.facing = angleTo(e.x, e.y, h.x, h.y);
      if (e.st <= 0) releaseAttack(L, e);
      break;
    }
    case 'glide': {
      e.anim = 'attack';
      e.st -= dt;
      e.x += Math.cos(e.glideAng) * 620 * dt;
      e.y += Math.sin(e.glideAng) * 620 * dt;
      if (Math.random() < 0.8) L.fx.burst(e.x, e.y - 20, PALETTE.ice, 2, 60);
      if (!e.glideHit && dist(e.x, e.y, h.x, h.y) < e.r + h.r + 8) {
        if (hurtHero(L, e.damage, e.x, e.y, { knock: 320, kind: 'melee' }) === 'hit') e.glideHit = true;
      }
      if (e.st <= 0) { e.state = 'recover'; e.st = 0.8; }
      break;
    }
    case 'barrage': {
      e.anim = 'attack';
      e.st -= dt;
      e.burstT -= dt;
      if (e.burstT <= 0 && e.burstN > 0) {
        e.burstN--; e.burstT = 0.22;
        lobSlush(L, e.x, e.y - e.h, h.x + (Math.random() - 0.5) * 140, h.y + (Math.random() - 0.5) * 140, e.damage * 0.55, { splash: 38 });
        playSfx('throw');
      }
      if (e.burstN <= 0 && e.st <= 0) { e.state = 'recover'; e.st = 0.6; }
      break;
    }
    case 'spiral': {
      e.anim = 'attack';
      e.st -= dt;
      e.burstT -= dt;
      if (e.burstT <= 0) {
        e.burstT = 0.09;
        e.spinAng += 0.47;
        for (let k = 0; k < 2; k++) {
          const a = e.spinAng + k * Math.PI;
          spawnShot(L, { kind: 'icicle', team: 'enemy', x: e.x + Math.cos(a) * 26, y: e.y - 30 + Math.sin(a) * 20, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, r: 7, dmg: e.damage * 0.4, life: 2.6 });
        }
      }
      if (e.st <= 0) { e.state = 'recover'; e.st = 0.7; }
      break;
    }
    default: { // recover
      e.anim = 'idle';
      e.st -= dt;
      if (e.st <= 0) { e.state = 'move'; e.atkCd = (1.4 + Math.random() * 0.8) * L.scl.aggro * rage; }
    }
  }
}

function startAttack(L, e, atk) {
  const h = L.hero;
  e.atk = atk;
  e.state = 'wind';
  if (atk === 'sweep') {
    e.st = 0.6;
    e.facing = angleTo(e.x, e.y, h.x, h.y);
    e.tele = addTelegraph(L, { kind: 'cone', x: e.x, y: e.y, r: 135, ang: e.facing, arc: Math.PI * 0.85, dur: e.st, follow: e });
  } else if (atk === 'fan') {
    e.st = 0.75;
    const n = e.phase === 1 ? 5 : e.phase === 2 ? 7 : 9;
    e.fanN = n;
    e.facing = angleTo(e.x, e.y, h.x, h.y);
    for (let i = 0; i < n; i++) {
      const a = e.facing + (i - (n - 1) / 2) * 0.16;
      addTelegraph(L, { kind: 'line', x: e.x, y: e.y - 30, ang: a, len: 380, width: 10, dur: e.st });
    }
  } else if (atk === 'barrage') {
    e.st = 0.5;
    L.bark('baron', 'A scoop for everyone! Ha!', 1.8);
  } else if (atk === 'summon') {
    e.st = 0.8;
    addTelegraph(L, { kind: 'circle', x: e.x, y: e.y, r: 90, dur: e.st, follow: e, ring: true });
  } else if (atk === 'nova') {
    e.st = 1.05;
    e.tele = addTelegraph(L, { kind: 'circle', x: e.x, y: e.y, r: 360, dur: e.st, follow: e, ring: true });
    L.bark('baron', 'Feel the chill of nobility!', 1.6);
  } else if (atk === 'glide') {
    e.st = 0.6;
    e.glideAng = angleTo(e.x, e.y, h.x, h.y);
    addTelegraph(L, { kind: 'line', x: e.x, y: e.y, ang: e.glideAng, len: 400, width: e.r * 2, dur: e.st });
  } else if (atk === 'spiral') {
    e.st = 0.7;
    addTelegraph(L, { kind: 'circle', x: e.x, y: e.y, r: 60, dur: e.st, follow: e });
  }
}

function releaseAttack(L, e) {
  const h = L.hero;
  const atk = e.atk;
  e.state = 'recover'; e.st = 0.7;
  if (atk === 'sweep') {
    playSfx('swing');
    L.fx.addShake(5);
    for (let i = 0; i < 9; i++) {
      const a = e.facing - 0.65 + i * 0.16;
      L.fx.burst(e.x + Math.cos(a) * 110, e.y - 20 + Math.sin(a) * 90, PALETTE.ice, 2, 50);
    }
    if (dist(e.x, e.y, h.x, h.y) < 135 + h.r && angDiff(angleTo(e.x, e.y, h.x, h.y), e.facing) < Math.PI * 0.43) {
      hurtHero(L, e.damage, e.x, e.y, { knock: 340, kind: 'melee' });
    }
  } else if (atk === 'fan') {
    playSfx('throw');
    const n = e.fanN;
    for (let i = 0; i < n; i++) {
      const a = e.facing + (i - (n - 1) / 2) * 0.16;
      spawnShot(L, { kind: 'icicle', team: 'enemy', x: e.x, y: e.y - 30, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, r: 7, dmg: e.damage * 0.5, life: 1.6 });
    }
  } else if (atk === 'barrage') {
    e.state = 'barrage'; e.burstN = e.phase === 3 ? 7 : 5; e.burstT = 0; e.st = 1.2;
  } else if (atk === 'summon') {
    playSfx('freeze');
    const n = e.phase === 3 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const type = e.phase === 3 && i === 0 ? 'popsicle_knight' : i % 2 ? 'brainfreezer' : 'frostling';
      L.spawnEnemy(type, e.x + Math.cos(a) * 110, e.y + Math.sin(a) * 80, { hpMul: 0.8 });
    }
  } else if (atk === 'nova') {
    L.fx.addShake(12);
    playSfx('freeze');
    addWave(L, { x: e.x, y: e.y, team: 'enemy', dmg: e.damage * 0.8, maxR: 380, speed: 360 });
    if (e.phase === 3) e.echoNova = true;
  } else if (atk === 'glide') {
    e.state = 'glide'; e.st = 0.55; e.glideHit = false; e.invuln = 0;
    playSfx('dash');
  } else if (atk === 'spiral') {
    e.state = 'spiral'; e.st = 2.0; e.burstT = 0; e.spinAng = Math.random() * Math.PI * 2;
  }
}
