// Bosses: Roomba Tank, Sock Monster, Grill Dragon, PartyPlanner.exe. Owned by: action team.
// Every big attack is telegraphed. Phase changes are announced with a float text + shockwave.
// NOTE: must not import enemies.js (enemies.js spreads BOSS_SHAPE at load time).
import { PALETTE } from '../core/theme.js';
import { dist, angleTo } from '../core/math.js';
import { playSfx } from '../audio/sfx.js';
import { angDiff, hurtHero, lob, addTelegraph, addZone, addWave, spawnShot } from './combat.js';

export const BOSS_SHAPE = {
  roomba: { r: 36, h: 34, mass: 8, color: '#4a4f63' },
  sock_monster: { r: 38, h: 90, mass: 8, color: '#ff8fb1' },
  grill_dragon: { r: 36, h: 80, mass: 9, color: '#3a3a44' },
  partyplanner: { r: 44, h: 110, mass: 12, flying: true, color: '#7fd8a6' },
};

const TAU = Math.PI * 2;

function moveToward(e, tx, ty, sp, dt) {
  const a = angleTo(e.x, e.y, tx, ty);
  e.x += Math.cos(a) * sp * dt; e.y += Math.sin(a) * sp * dt;
  return a;
}
function bodyContact(L, e, dmg, cd = 1) {
  const h = L.hero;
  if (e.contactCd > 0 || !h) return;
  if (dist(e.x, e.y, h.x, h.y) < e.r + h.r) { hurtHero(L, dmg, e.x, e.y, { kind: 'melee', knock: 320, src: e }); e.contactCd = cd; }
}
function announce(L, e, text, color = PALETTE.danger) {
  L.fx.floatText(e.x, e.y - e.h - 30, text, color, { big: true });
  L.banner(text, color);
}
/** Phase from hp fraction (2 phases: 1 → 2 under 50%). */
function checkPhase(L, e, thresholds, names) {
  const frac = e.hp / e.maxHp;
  let p = 1;
  thresholds.forEach((t, i) => { if (frac <= t) p = i + 2; });
  if (p > e.phase) {
    e.phase = p;
    e.state = 'transition'; e.st = 1.6; e.invuln = 1.6;
    if (e.tele) e.tele.dead = true;
    addWave(L, { x: e.x, y: e.y, team: 'enemy', dmg: e.damage * 0.5, maxR: 260, speed: 420 });
    L.fx.addShake(10);
    playSfx('error');
    announce(L, e, names[p - 2]);
    return true;
  }
  return false;
}

export const BOSS_AI = {
  // ---------------------------------------------------------------- Roomba Tank (living room)
  roomba(L, e, dt, sp) {
    const h = L.hero;
    e.st -= dt;
    e.spin = (e.spin ?? 0) + dt * 3;
    checkPhase(L, e, [0.5], ['ROOMBA: TURBO MODE']);
    switch (e.state) {
      case 'transition': e.anim = 'hurt'; if (e.st <= 0) { e.state = 'move'; e.atkCd = 0.8; } return;
      case 'move': {
        e.anim = 'move';
        e.facing = moveToward(e, h.x, h.y, sp * 0.7, dt);
        bodyContact(L, e, e.damage * 0.6);
        if (e.atkCd <= 0) {
          e.combo = e.phase === 2 ? 2 : 1;
          if (Math.random() < 0.55 || e.lastAtk === 'suck') {
            e.state = 'windCharge'; e.st = 0.85 * L.scl.tele; e.facing = angleTo(e.x, e.y, h.x, h.y);
            e.tele = addTelegraph(L, { kind: 'line', x: e.x, y: e.y, ang: e.facing, len: 520, width: e.r * 2 + 8, dur: e.st });
            e.lastAtk = 'charge';
          } else {
            e.state = 'windSuck'; e.st = 0.8 * L.scl.tele; e.lastAtk = 'suck';
            e.tele = addTelegraph(L, { kind: 'circle', x: e.x, y: e.y, r: 240, dur: e.st, follow: e, ring: true });
            L.fx.floatText(e.x, e.y - 60, 'vrrrRRRMMM', PALETTE.paper);
          }
        }
        return;
      }
      case 'windCharge': e.anim = 'attack'; if (e.st <= 0) { e.state = 'charge'; e.st = 1.1; playSfx('dash'); } return;
      case 'charge': {
        e.anim = 'attack';
        e.x += Math.cos(e.facing) * 560 * dt; e.y += Math.sin(e.facing) * 560 * dt;
        bodyContact(L, e, e.damage, 0.8);
        if (Math.random() < 0.5) L.fx.burst(e.x, e.y, '#b7aebf', 2, 60);
        if (e.bumped || e.st <= 0) {
          if (e.bumped) { L.fx.addShake(8); L.fx.floatText(e.x, e.y - 50, 'BONK!', PALETTE.sun, { big: true }); playSfx('hit'); }
          if (--e.combo > 0 && !e.bumped) {
            e.state = 'windCharge'; e.st = 0.5 * L.scl.tele; e.facing = angleTo(e.x, e.y, h.x, h.y);
            e.tele = addTelegraph(L, { kind: 'line', x: e.x, y: e.y, ang: e.facing, len: 520, width: e.r * 2 + 8, dur: e.st });
          } else { e.state = 'dazed'; e.st = e.bumped ? 2.0 : 0.9; }
        }
        return;
      }
      case 'dazed': e.anim = 'hurt'; if (Math.random() < 0.2) L.fx.burst(e.x, e.y - 40, PALETTE.sun, 1, 40); if (e.st <= 0) { e.state = 'move'; e.atkCd = (2 + Math.random()) * L.scl.aggro; } return;
      case 'windSuck': e.anim = 'attack'; if (e.st <= 0) { e.state = 'suck'; e.st = 2.4; } return;
      case 'suck': {
        e.anim = 'attack';
        const d = dist(e.x, e.y, h.x, h.y);
        if (d < 260) {
          const a = angleTo(h.x, h.y, e.x, e.y), pull = 260 * (1 - d / 300);
          h.kvx += Math.cos(a) * pull * dt * 4; h.kvy += Math.sin(a) * pull * dt * 4;
        }
        for (let i = 0; i < 2; i++) { const a = Math.random() * TAU, r = 120 + Math.random() * 120; L.fx.burst(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r * 0.7, '#b7aebf', 1, 20); }
        bodyContact(L, e, e.damage, 0.8);
        if (e.st <= 0) {
          e.state = 'move'; e.atkCd = (1.6 + Math.random()) * L.scl.aggro;
          // the dust bag pops out bunnies
          const n = L.aliveCount() < 7 ? (e.phase === 2 ? 3 : 2) : 0;
          for (let i = 0; i < n; i++) L.spawnEnemy('dust_bunny', e.x + (Math.random() - 0.5) * 80, e.y + 30 + Math.random() * 30, { spawnDelay: 0.3, counts: false });
          if (n) L.fx.burst(e.x, e.y, '#b7aebf', 20, 160);
        }
        return;
      }
    }
  },

  // ---------------------------------------------------------------- Sock Monster (primary bedroom)
  sock_monster(L, e, dt, sp) {
    const h = L.hero;
    e.st -= dt;
    checkPhase(L, e, [0.5], ['SOCK MONSTER: SPIN CYCLE']);
    const d = dist(e.x, e.y, h.x, h.y);
    switch (e.state) {
      case 'transition': e.anim = 'hurt'; if (e.st <= 0) { e.state = 'move'; e.atkCd = 0.6; } return;
      case 'move': {
        e.anim = 'move';
        e.facing = moveToward(e, h.x, h.y, sp * (d > 160 ? 1 : 0.3), dt);
        bodyContact(L, e, e.damage * 0.6);
        if (e.atkCd > 0) return;
        const r = Math.random();
        if (d < 230 && r < 0.45) {
          e.state = 'windGrab'; e.st = 0.75 * L.scl.tele; e.facing = angleTo(e.x, e.y, h.x, h.y);
          e.tele = addTelegraph(L, { kind: 'line', x: e.x, y: e.y - 10, ang: e.facing, len: 240, width: 40, dur: e.st });
        } else if (e.phase === 2 && r < 0.75) {
          e.state = 'windSpin'; e.st = 0.8 * L.scl.tele;
          e.tele = addTelegraph(L, { kind: 'circle', x: e.x, y: e.y, r: 120, dur: e.st, follow: e });
        } else {
          e.state = 'windThrow'; e.st = 0.5 * L.scl.tele; e.throws = e.phase === 2 ? 5 : 3;
        }
        return;
      }
      case 'windGrab': e.anim = 'attack'; if (e.st <= 0) {
        e.state = 'recover'; e.st = 0.9;
        const dx = h.x - e.x, dy = h.y - e.y, a = e.facing;
        const along = dx * Math.cos(a) + dy * Math.sin(a), across = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
        L.fx.burst(e.x + Math.cos(a) * 200, e.y + Math.sin(a) * 200, '#ff8fb1', 12, 160);
        playSfx('whack');
        if (along > 0 && along < 250 && across < 34 + h.r) {
          const r = hurtHero(L, e.damage, e.x, e.y, { kind: 'melee', knock: 0, src: e });
          if (r === 'hit') { e.state = 'hold'; e.st = 0.9; h.rootT = 1.0; L.fx.floatText(h.x, h.y - 130, 'GRABBED!', PALETTE.danger, { big: true }); }
        }
      } return;
      case 'hold': {
        e.anim = 'attack';
        h.x += (e.x + Math.cos(e.facing) * 50 - h.x) * Math.min(1, dt * 10); h.y += (e.y + Math.sin(e.facing) * 30 - h.y) * Math.min(1, dt * 10);
        if (e.st <= 0) {
          const a = angleTo(e.x, e.y, L.arena.w / 2, (L.arena.wallH + L.arena.h) / 2) + (Math.random() - 0.5);
          h.kvx = Math.cos(a) * 700; h.kvy = Math.sin(a) * 700; h.rootT = 0; h.invuln = 0.8;
          L.fx.addShake(8); playSfx('throw');
          e.state = 'recover'; e.st = 1.0;
        }
        return;
      }
      case 'windThrow': e.anim = 'attack'; if (e.st <= 0) {
        if (e.throws-- > 0) {
          const tx = h.x + (Math.random() - 0.5) * 110, ty = h.y + (Math.random() - 0.5) * 80;
          lob(L, 'sock', e.x, e.y - e.h * 0.8, tx, ty, e.damage * 0.6, { splash: 36, color: '#ff8fb1', slow: 1 });
          playSfx('throw'); e.st = 0.25;
        } else { e.state = 'recover'; e.st = 0.7; }
      } return;
      case 'windSpin': e.anim = 'attack'; if (e.st <= 0) { e.state = 'spin'; e.st = 1.8; playSfx('swing'); } return;
      case 'spin': {
        e.anim = 'attack';
        e.facing += dt * 14;
        moveToward(e, h.x, h.y, sp * 1.6, dt);
        if (d < 120 + h.r) hurtHero(L, e.damage * 0.7, e.x, e.y, { kind: 'melee', knock: 380, src: e });
        if (Math.random() < 0.5) L.fx.burst(e.x, e.y - 40, '#ff8fb1', 2, 120);
        if (e.st <= 0) {
          e.state = 'recover'; e.st = 1.3;
          if (L.aliveCount() < 8) for (let i = 0; i < 3; i++) L.spawnEnemy('lint', e.x + (Math.random() - 0.5) * 120, e.y + (Math.random() - 0.5) * 80, { spawnDelay: 0.3, counts: false });
        }
        return;
      }
      case 'recover': e.anim = 'idle'; if (e.st <= 0) { e.state = 'move'; e.atkCd = (1.1 + Math.random()) * L.scl.aggro; } return;
    }
  },

  // ---------------------------------------------------------------- Grill Dragon (backyard)
  grill_dragon(L, e, dt, sp) {
    const h = L.hero;
    e.st -= dt;
    checkPhase(L, e, [0.5], ['GRILL DRAGON: FLARE-UP!']);
    const d = dist(e.x, e.y, h.x, h.y);
    if (Math.random() < 0.15) L.fx.burst(e.x + (Math.random() - 0.5) * 30, e.y - e.h, Math.random() < 0.5 ? PALETTE.sunDeep : PALETTE.danger, 1, 40);
    switch (e.state) {
      case 'transition': e.anim = 'hurt'; if (e.st <= 0) { e.state = 'move'; e.atkCd = 0.5; } return;
      case 'move':
        e.anim = 'move';
        e.facing = moveToward(e, h.x, h.y, sp * (d > 200 ? 1 : 0.2), dt);
        bodyContact(L, e, e.damage * 0.6);
        if (e.atkCd <= 0) {
          if (d < 280 && Math.random() < 0.6) {
            e.state = 'windBreath'; e.st = 0.95 * L.scl.tele; e.facing = angleTo(e.x, e.y, h.x, h.y);
            e.tele = addTelegraph(L, { kind: 'cone', x: e.x, y: e.y - 10, r: 250, ang: e.facing, arc: 0.9, dur: e.st });
          } else { e.state = 'windEmber'; e.st = 0.5 * L.scl.tele; e.throws = e.phase === 2 ? 6 : 4; }
        }
        return;
      case 'windBreath': e.anim = 'attack'; if (e.st <= 0) { e.state = 'breath'; e.st = 1.0; e.zt = 0; playSfx('shout'); } return;
      case 'breath': {
        e.anim = 'attack';
        if (e.phase === 2) e.facing += Math.sign(angDiff(angleTo(e.x, e.y, h.x, h.y), e.facing + 0.01) - angDiff(angleTo(e.x, e.y, h.x, h.y), e.facing - 0.01)) * -0.6 * dt;
        for (let i = 0; i < 4; i++) { const a = e.facing + (Math.random() - 0.5) * 0.9, r = 30 + Math.random() * 220; L.fx.burst(e.x + Math.cos(a) * r, e.y - 20 + Math.sin(a) * r, Math.random() < 0.5 ? PALETTE.sunDeep : '#5a5a66', 1, 40); }
        if (d < 250 + h.r && angDiff(angleTo(e.x, e.y, h.x, h.y), e.facing) < 0.45) hurtHero(L, e.damage * 0.8, e.x, e.y, { kind: 'melee', knock: 240, src: e });
        e.zt -= dt;
        if (e.zt <= 0) { e.zt = 0.3; const r = 90 + Math.random() * 140; addZone(L, { kind: 'fire', x: e.x + Math.cos(e.facing) * r, y: e.y + Math.sin(e.facing) * r, r: 34, dur: 3.5, dmg: 5 }); }
        if (e.st <= 0) { e.state = 'recover'; e.st = 1.2; }
        return;
      }
      case 'windEmber': e.anim = 'attack'; if (e.st <= 0) {
        if (e.throws-- > 0) {
          const tx = h.x + (Math.random() - 0.5) * 180, ty = h.y + (Math.random() - 0.5) * 130;
          lob(L, 'ember', e.x, e.y - e.h, tx, ty, e.damage * 0.6, { splash: 34, color: PALETTE.sunDeep, onLand: (LL, s) => addZone(LL, { kind: 'fire', x: s.x, y: s.y, r: 36, dur: 3, dmg: 5 }) });
          playSfx('throw'); e.st = 0.22;
        } else {
          e.state = 'recover'; e.st = 0.8;
          if (e.phase === 2 && L.aliveCount() < 7) for (let i = 0; i < 2; i++) L.spawnEnemy('gnome', e.x + (i ? 70 : -70), e.y + 50, { spawnDelay: 0.4, counts: false });
        }
      } return;
      case 'recover': e.anim = 'idle'; if (e.st <= 0) { e.state = 'move'; e.atkCd = (1.3 + Math.random()) * L.scl.aggro; } return;
    }
  },

  // ---------------------------------------------------------------- PartyPlanner.exe (pond finale)
  partyplanner(L, e, dt, sp) {
    const h = L.hero, A = L.arena;
    e.st -= dt;
    e.z = 26 + Math.sin(e.animT * 2) * 8;
    checkPhase(L, e, [2 / 3, 1 / 3], ['> phase_2: optimize_schedule()', '> phase_3: deploy_party()']);
    const d = dist(e.x, e.y, h.x, h.y);
    const home = { x: A.water[0]?.x ?? A.w / 2, y: A.water[0]?.y ?? A.h / 2 };
    switch (e.state) {
      case 'transition': e.anim = 'hurt'; e.x += (home.x - e.x) * dt * 2; e.y += (home.y - e.y) * dt * 2; if (e.st <= 0) { e.state = 'move'; e.atkCd = 0.6; } return;
      case 'move': {
        e.anim = 'move';
        e.wob = (e.wob ?? 0) + dt * 0.7;
        // hovers along the bank so melee heroes can reach it
        const wv = A.water[0] ?? { rx: 200, ry: 120 };
        const tx = home.x + Math.cos(e.wob) * (wv.rx + 30), ty = home.y + Math.sin(e.wob) * (wv.ry + 40);
        moveToward(e, tx, ty, sp * 0.8, dt);
        e.facing = angleTo(e.x, e.y, h.x, h.y);
        if (e.atkCd > 0) return;
        const pool = e.phase === 1 ? ['ring', 'ring', 'summon'] : e.phase === 2 ? ['ring', 'laser', 'laser', 'summon'] : ['dash', 'dash', 'laser', 'ring'];
        let pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick === 'summon' && L.aliveCount() > 5) pick = 'ring';
        if (pick === e.last && pool.length > 2) pick = pool.find((p) => p !== e.last) ?? pick;
        e.last = pick;
        if (pick === 'ring') {
          e.state = 'windRing'; e.st = 0.75 * L.scl.tele; e.waves = e.phase === 1 ? 1 : 2;
          e.tele = addTelegraph(L, { kind: 'circle', x: e.x, y: e.y, r: 90, dur: e.st, follow: e, color: PALETTE.mint });
          L.log('> broadcast_invites(all)');
        } else if (pick === 'summon') {
          e.state = 'recover'; e.st = 1.0;
          L.log('> spawn(helpers, 3)');
          for (let i = 0; i < 3; i++) { const a = Math.random() * TAU; L.spawnEnemy('code_fish', home.x + Math.cos(a) * 60, home.y + Math.sin(a) * 40, { spawnDelay: 0.5, counts: false }); }
        } else if (pick === 'laser') {
          e.state = 'windLaser'; e.st = 1.0 * L.scl.tele; e.facing = angleTo(e.x, e.y, h.x, h.y) - 0.8;
          e.tele = addTelegraph(L, { kind: 'line', x: e.x, y: e.y, ang: e.facing, len: 900, width: 30, dur: e.st, color: PALETTE.mint });
          L.log('> schedule.sort(by=YOU)');
        } else {
          e.state = 'windDash'; e.st = 0.7 * L.scl.tele; e.dashes = 3; e.facing = angleTo(e.x, e.y, h.x, h.y);
          e.tele = addTelegraph(L, { kind: 'line', x: e.x, y: e.y, ang: e.facing, len: 520, width: e.r * 2, dur: e.st });
          L.log('> deploy --force');
        }
        return;
      }
      case 'windRing': e.anim = 'attack'; if (e.st <= 0) {
        const n = e.phase === 1 ? 12 : 16, off = Math.random() * TAU;
        for (let i = 0; i < n; i++) { const a = off + i * TAU / n; spawnShot(L, { kind: 'code', team: 'enemy', x: e.x, y: e.y - 30, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, r: 8, dmg: e.damage * 0.5, life: 3, color: PALETTE.mint, glyph: '{};<>/=01'[i % 9], ghost: true }); }
        playSfx('type'); L.fx.addShake(3);
        if (--e.waves > 0) { e.st = 0.5; } else { e.state = 'recover'; e.st = 0.9; }
      } return;
      case 'windLaser': e.anim = 'attack'; if (e.st <= 0) { e.state = 'laser'; e.st = 2.0; e.spinDir = Math.random() < 0.5 ? 1 : -1; playSfx('error'); } return;
      case 'laser': {
        e.anim = 'attack';
        e.facing += e.spinDir * 0.8 * dt;
        L.laser = { x: e.x, y: e.y - 30, ang: e.facing, len: 900 };
        const dx = h.x - e.x, dy = h.y - 16 - (e.y - 30), a = e.facing;
        const along = dx * Math.cos(a) + dy * Math.sin(a), across = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
        if (along > 0 && across < 16 + h.r) hurtHero(L, e.damage * 0.6, e.x, e.y, { kind: 'shot', knock: 200 });
        if (e.st <= 0) { L.laser = null; e.state = 'recover'; e.st = 1.0; }
        return;
      }
      case 'windDash': e.anim = 'attack'; if (e.st <= 0) { e.state = 'dash'; e.st = 0.55; playSfx('dash'); } return;
      case 'dash': {
        e.anim = 'attack';
        e.x += Math.cos(e.facing) * 820 * dt; e.y += Math.sin(e.facing) * 820 * dt;
        e.x = Math.max(80, Math.min(A.w - 80, e.x)); e.y = Math.max(A.wallH + 40, Math.min(A.h - 60, e.y));
        bodyContact(L, e, e.damage, 0.8);
        if (Math.random() < 0.6) L.fx.burst(e.x, e.y - 30, PALETTE.mint, 2, 80);
        if (e.st <= 0) {
          if (--e.dashes > 0) {
            e.state = 'windDash'; e.st = 0.45 * L.scl.tele; e.facing = angleTo(e.x, e.y, h.x, h.y);
            e.tele = addTelegraph(L, { kind: 'line', x: e.x, y: e.y, ang: e.facing, len: 450, width: e.r * 2, dur: e.st });
          } else { e.state = 'recover'; e.st = 1.6; L.fx.floatText(e.x, e.y - 120, 'buffering...', PALETTE.mint); }
        }
        return;
      }
      case 'recover': e.anim = 'idle'; if (e.st <= 0) { e.state = 'move'; e.atkCd = (0.9 + Math.random() * 0.8) * L.scl.aggro * (e.phase === 3 ? 0.8 : 1); } return;
    }
  },
};
