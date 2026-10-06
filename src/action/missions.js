// Mission kinds: skirmish, rescue, defend, boss. Owned by: action team.
// Each mission: { setup(L), update(L, dt), objective(L) -> {text, progress}, result(L) -> 'win'|'lose'|null }
import { ENEMIES, PALETTE } from '../core/theme.js';
import { dist } from '../core/math.js';
import { playSfx } from '../audio/sfx.js';
import { openPointAway, openEdgePoint, isOpen, makeProp } from './arena.js';
import { spawnPickup } from './combat.js';
import { RESCUE_THANKS, HERO_RESCUE_BARKS } from './banter.js';

const COST = { frostling: 1, brainfreezer: 2, popsicle_knight: 3, slush_golem: 8 };
const WEIGHTS = {
  lakeside: { frostling: 6, brainfreezer: 2, popsicle_knight: 1 },
  oldcity: { frostling: 3, brainfreezer: 2, popsicle_knight: 3 },
  summit: { frostling: 3, brainfreezer: 3, popsicle_knight: 2 },
};

/** Spend a point budget on a mix of enemies that fits the region/difficulty. */
export function buildGroup(L, budget, { golem = false } = {}) {
  const R = L.arena.rand;
  const w = { ...(WEIGHTS[L.p.region] ?? WEIGHTS.lakeside) };
  if (L.scl.d <= 1) w.popsicle_knight = 0;
  const out = [];
  if (golem && budget >= COST.slush_golem + 2) { out.push('slush_golem'); budget -= COST.slush_golem; }
  let guard = 0;
  while (budget >= 1 && guard++ < 100) {
    const opts = Object.entries(w).filter(([t, wt]) => wt > 0 && COST[t] <= budget);
    if (!opts.length) break;
    let r = R() * opts.reduce((s, [, wt]) => s + wt, 0);
    let type = opts[0][0];
    for (const [t, wt] of opts) { r -= wt; if (r <= 0) { type = t; break; } }
    out.push(type);
    budget -= COST[type];
  }
  return out;
}

function countMult(L) {
  return L.scl.count * (L.mods.includes('blizzard') ? 1.3 : 1);
}

/** Spawn a list of enemy types clustered around a point. */
function spawnCluster(L, types, cx, cy, spread = 90, opts = {}) {
  for (const t of types) {
    let x = cx, y = cy;
    for (let i = 0; i < 12; i++) {
      x = cx + (L.arena.rand() - 0.5) * spread * 2;
      y = cy + (L.arena.rand() - 0.5) * spread * 1.4;
      if (isOpen(L.arena, x, y, 16)) break;
    }
    L.spawnEnemy(t, x, y, { spawnDelay: 0.6 + L.arena.rand() * 0.6, ...opts });
  }
}

// ---------------------------------------------------------------- skirmish
const skirmish = {
  setup(L) {
    const d = L.scl.d;
    const n = d <= 2 ? 2 : 3;
    this.waves = [];
    for (let i = 0; i < n; i++) {
      const budget = Math.round((5 + 2 * d) * (1 + 0.3 * i) * countMult(L));
      const golem = i === n - 1 && (d >= 3 || (L.p.region === 'summit' && d >= 2));
      this.waves.push(buildGroup(L, budget, { golem }));
    }
    this.total = this.waves.reduce((s, w) => s + w.length, 0);
    this.wave = 0;
    this.killedBase = L.defeated;
    this.nextT = -1;
    this.spawnWave(L);
  },
  spawnWave(L) {
    const types = this.waves[this.wave];
    const h = L.hero;
    const clusters = Math.min(3, 1 + Math.floor(types.length / 5));
    const per = Math.ceil(types.length / clusters);
    for (let c = 0; c < clusters; c++) {
      const pt = openPointAway(L.arena, h.x, h.y, 360);
      spawnCluster(L, types.slice(c * per, (c + 1) * per), pt.x, pt.y);
    }
  },
  update(L, dt) {
    if (L.aliveCount() === 0 && this.wave < this.waves.length - 1) {
      if (this.nextT < 0) {
        this.nextT = 1.6;
        L.bark(Math.random() < 0.5 ? 'aaron' : 'victoria', this.wave === this.waves.length - 2 ? 'Last wave! Here they come!' : 'More of them! Heads up!', 1.8);
      }
      this.nextT -= dt;
      if (this.nextT <= 0) { this.wave++; this.nextT = -1; this.spawnWave(L); }
    }
  },
  objective(L) {
    const done = L.defeated - this.killedBase;
    return { text: `Clear the Syndicate: wave ${this.wave + 1}/${this.waves.length} (${L.aliveCount()} left)`, progress: Math.min(1, done / this.total) };
  },
  result(L) {
    return this.wave >= this.waves.length - 1 && L.aliveCount() === 0 && this.nextT < 0 ? 'win' : null;
  },
};

// ---------------------------------------------------------------- rescue
const rescue = {
  setup(L) {
    const d = L.scl.d;
    const n = Math.min(6, 3 + Math.floor(d / 2));
    this.blocks = [];
    const a = L.arena;
    for (let i = 0; i < n; i++) {
      let pt = null;
      for (let k = 0; k < 60; k++) {
        const c = openPointAway(a, a.start.x, a.start.y, 280, 30);
        if (this.blocks.every((b) => dist(b.x, b.y, c.x, c.y) > 260) || k > 50) { pt = c; break; }
      }
      const hp = Math.round(48 * (1 + 0.12 * (d - 1)));
      const p = makeProp('iceblock', pt.x, pt.y, { destructible: true, hp, maxHp: hp, npcSeed: Math.floor(a.rand() * 1000), rescue: true });
      a.props.push(p);
      this.blocks.push(p);
      // A few guards near each block.
      const guards = buildGroup(L, Math.round((1.5 + d * 0.7) * countMult(L)));
      spawnCluster(L, guards, pt.x, pt.y, 100);
    }
    this.freed = 0;
    this.trickleT = 8;
  },
  onPropBroken(L, p) {
    if (!p.rescue) return;
    this.freed++;
    playSfx('thaw');
    L.fx.burst(p.x, p.y - 20, PALETTE.ice, 26, 200);
    L.fx.burst(p.x, p.y - 20, PALETTE.sun, 12, 140);
    L.fx.floatText(p.x, p.y - 60, RESCUE_THANKS[Math.floor(Math.random() * RESCUE_THANKS.length)], PALETTE.sun);
    spawnPickup(L, 'sunshine', p.x, p.y);
    spawnPickup(L, 'scoop', p.x, p.y);
    L.addNpc(p.x, p.y, p.npcSeed);
    if (this.freed < this.blocks.length) {
      const [who, text] = HERO_RESCUE_BARKS[Math.floor(Math.random() * HERO_RESCUE_BARKS.length)];
      L.bark(who, text, 1.8);
    }
  },
  update(L, dt) {
    this.trickleT -= dt;
    const cap = 4 + L.scl.d + (L.mods.includes('blizzard') ? 2 : 0);
    if (this.trickleT <= 0) {
      this.trickleT = Math.max(6, 12 - L.scl.d) * (L.mods.includes('blizzard') ? 0.8 : 1);
      if (L.aliveCount() < cap) {
        const pt = openPointAway(L.arena, L.hero.x, L.hero.y, 420);
        spawnCluster(L, buildGroup(L, Math.round((2 + L.scl.d * 0.8) * countMult(L))), pt.x, pt.y, 70);
      }
    }
  },
  objective(L) {
    return { text: `Free the frozen townsfolk: ${this.freed}/${this.blocks.length}`, progress: this.freed / this.blocks.length };
  },
  result() { return this.freed >= this.blocks.length ? 'win' : null; },
};

// ---------------------------------------------------------------- defend
const defend = {
  setup(L) {
    const d = L.scl.d;
    const a = L.arena;
    const cartHp = 520 - 40 * (d - 1);
    const cart = makeProp('cart', a.cart.x, a.cart.y, { hp: cartHp, maxHp: cartHp, isCart: true });
    a.props.push(cart);
    L.cart = cart;
    this.dur = 35 + 7 * d;
    this.t = 0;
    this.spawnT = 2.5;
    this.golemAt = d >= 3 ? this.dur * 0.55 : Infinity;
    // Opening group.
    const pt = openEdgePoint(a);
    spawnCluster(L, buildGroup(L, Math.round((3 + d) * countMult(L))), pt.x, pt.y, 70);
  },
  update(L, dt) {
    this.t += dt;
    this.spawnT -= dt;
    const left = this.dur - this.t;
    if (this.spawnT <= 0 && left > 4) {
      this.spawnT = Math.max(1.8, 4.4 - 0.45 * L.scl.d) * (L.mods.includes('blizzard') ? 0.8 : 1);
      if (L.aliveCount() < 10 + L.scl.d * 2) {
        const pt = openEdgePoint(L.arena);
        spawnCluster(L, buildGroup(L, Math.round((2 + L.scl.d * 0.6 + this.t / 20) * countMult(L))), pt.x, pt.y, 60);
      }
    }
    if (this.t >= this.golemAt) {
      this.golemAt = Infinity;
      const pt = openEdgePoint(L.arena, 26);
      L.spawnEnemy('slush_golem', pt.x, pt.y);
      L.bark('aaron', 'Slush Golem incoming! Keep it off the cart!', 2.2);
    }
    if (left <= 10 && !this.finalPush) { this.finalPush = true; L.bark('victoria', 'Ten more seconds! Hold the line!', 2); }
  },
  objective(L) {
    const left = Math.max(0, Math.ceil(this.dur - this.t));
    return { text: `Protect the ice-cream cart: ${left}s`, progress: Math.min(1, this.t / this.dur) };
  },
  result(L) {
    if (L.cart.hp <= 0) return 'lose';
    return this.t >= this.dur ? 'win' : null;
  },
  bossHp(L) { return { name: 'Ice-Cream Cart', frac: L.cart.hp / L.cart.maxHp }; },
};

// ---------------------------------------------------------------- boss
export function resolveBossType(p) {
  if (p.bossId && ENEMIES[p.bossId]) return p.bossId;
  return p.region === 'summit' ? 'baron_brrr' : 'slush_golem';
}

const boss = {
  setup(L) {
    const a = L.arena;
    const type = L.bossType;
    const base = ENEMIES[type];
    const hpMul = type === 'baron_brrr' ? 1 : type === 'slush_golem' ? 2.6 : Math.max(4, 500 / base.hp);
    const scale = type === 'baron_brrr' ? 1 : type === 'slush_golem' ? 1.3 : 1.7;
    this.boss = L.spawnEnemy(type, a.w / 2, a.h / 2 - 120, { boss: true, hpMul, scale, spawnDelay: 0.3 });
    if (type !== 'baron_brrr' && type !== 'slush_golem') this.boss.name = `King ${base.name}`;
    // Opening adds.
    const adds = buildGroup(L, Math.round((1 + L.scl.d) * countMult(L)));
    for (const t of adds) {
      const ang = Math.random() * Math.PI * 2;
      L.spawnEnemy(t, this.boss.x + Math.cos(ang) * 180, this.boss.y + Math.sin(ang) * 120, { spawnDelay: 0.8 });
    }
    this.addT = 14;
  },
  update(L, dt) {
    // Blizzard keeps sending small reinforcements.
    if (L.mods.includes('blizzard') && L.bossType !== 'baron_brrr') {
      this.addT -= dt;
      if (this.addT <= 0 && L.aliveCount() < 8) {
        this.addT = 14;
        const pt = openEdgePoint(L.arena);
        L.spawnEnemy('frostling', pt.x, pt.y);
        L.spawnEnemy('frostling', pt.x + 30, pt.y + 20);
      }
    }
  },
  objective(L) {
    return { text: `Defeat ${this.boss.name}`, progress: 1 - this.boss.hp / this.boss.maxHp };
  },
  result() { return this.boss.dead ? 'win' : null; },
  bossHp() { return { name: this.boss.name, frac: Math.max(0, this.boss.hp / this.boss.maxHp) }; },
};

const KINDS = { skirmish, rescue, defend, boss };

/** Fresh mission instance for a kind (falls back to skirmish). */
export function createMission(kind) {
  const proto = KINDS[kind] ?? skirmish;
  return Object.create(proto);
}
