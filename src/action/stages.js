// The 9 room stages: layout (real furniture), enemy waves, objective + progress. Owned by: action team.
// Difficulty ramps by unlock depth (office 0 → pond 5). Office is the tutorial.
import { ROOMS, PALETTE } from '../core/theme.js';
import { dist } from '../core/math.js';
import { openEdgePoint, isOpen } from './arena.js';
import { addTelegraph, addZone } from './combat.js';
import { playSfx } from '../audio/sfx.js';
import { officeSlime } from './goo.js';
import { creepyDirector, drawCreepyDark } from './creepies.js';

export const DEPTH = { office: 0, kitchen: 1, living: 1, dining: 2, playroom: 2, primary: 2, guest: 3, backyard: 4, pond: 5 };

/** Gentle ramp by unlock depth. tele = telegraph duration multiplier (longer = easier). */
export function scaling(roomId) {
  const d = DEPTH[roomId] ?? 1;
  return { d, hp: 0.85 + 0.07 * d, dmg: 0.6 + 0.08 * d, speed: 0.9 + 0.03 * d, aggro: 1.25 - 0.06 * d, tele: 1.3 - 0.06 * d };
}

// ---------------------------------------------------------------- wave runner
/**
 * waves: [{ spawn: [[type, n, opts?]...], from?: 'edge'|{x,y,spread}, at?: aliveThreshold (default 0), delay? }]
 * A wave starts when counted-alive <= its `at` (and the previous wave has started), after `delay` sec.
 */
function waveRunner(waves) {
  return {
    i: 0, wait: 0, planned: waves.reduce((a, w) => a + w.spawn.reduce((b, s) => b + (s[2]?.counts === false ? 0 : s[1]), 0), 0),
    update(L, dt) {
      if (this.i >= waves.length) return;
      const w = waves[this.i];
      if (L.aliveCounted() > (w.at ?? (this.i === 0 ? Infinity : 0))) { this.wait = 0; return; }
      this.wait += dt;
      if (this.wait < (w.delay ?? 0.8)) return;
      this.wait = 0;
      this.i++;
      spawnWave(L, w);
      this.planned -= w.spawn.reduce((b, s) => b + (s[2]?.counts === false ? 0 : s[1]), 0);
    },
    get done() { return this.i >= waves.length; },
  };
}

function spawnWave(L, w) {
  const h = L.hero;
  for (const [type, n, opts] of w.spawn) {
    if (opts?.formation) { spawnFormation(L, type, n, opts); continue; }
    for (let k = 0; k < n; k++) {
      let p;
      if (w.from && w.from !== 'edge') {
        const a = Math.random() * Math.PI * 2, r = Math.random() * (w.from.spread ?? 40);
        p = { x: w.from.x + Math.cos(a) * r, y: w.from.y + Math.sin(a) * r * 0.6 };
      } else p = openEdgePoint(L.arena, h.x, h.y, 18);
      L.spawnEnemy(type, p.x, p.y, { spawnDelay: 0.6 + k * 0.12, ...(opts ?? {}) });
    }
  }
  playSfx('blip');
  if (L.W && L.W.i > 1) L.say?.('sabotage');
}

function spawnFormation(L, type, n, opts) {
  const h = L.hero;
  const p = openEdgePoint(L.arena, h.x, h.y, 60);
  const F = { x: p.x, y: p.y, ang: Math.atan2(h.y - p.y, h.x - p.x), members: [], t: -1 };
  const { formation, ...rest } = opts;
  for (let k = 0; k < n; k++) {
    const slot = formation === 'column' ? k : k - (n - 1) / 2;
    const px = -Math.sin(F.ang), py = Math.cos(F.ang);
    const x = formation === 'column' ? p.x - Math.cos(F.ang) * k * 34 : p.x + px * slot * 40;
    const y = formation === 'column' ? p.y - Math.sin(F.ang) * k * 34 : p.y + py * slot * 40;
    const e = L.spawnEnemy(type, x, y, { spawnDelay: 0.6 + k * 0.1, form: F, slot, ...rest });
    F.members.push(e);
  }
}

function waveProgress(L, W) {
  const killed = L.defeated;
  const total = killed + L.aliveCounted() + W.planned;
  return total ? killed / total : 0;
}
const remaining = (L, W) => L.aliveCounted() + W.planned;

/** Shared wave-stage shape. */
function waveStage(o) {
  return {
    ...o,
    setup(L) { L.W = waveRunner(o.waves); o.setup?.(L); },
    update(L, dt) { if (o.gate && !o.gate(L)) return; L.W.update(L, dt); o.update?.(L, dt); },
    objective(L) {
      const left = remaining(L, L.W);
      return { text: `${ROOMS[L.roomId].objective}: ${left} left`, progress: waveProgress(L, L.W) };
    },
    done(L) { return L.W.done && L.aliveCounted() === 0; },
  };
}

// ---------------------------------------------------------------- layouts + scripts
export const STAGES = {
  // 1 ── Office (tutorial): slow bugs, teaches movement + basic attack.
  office: waveStage({
    w: 1000, h: 610, wallH: 130, floor: 'wood', start: { x: 500, y: 440 },
    props: [
      ['rug', 500, 500, { w: 320, d: 170 }],
      ['bookshelf', 170, 168], ['desk', 500, 215, { laptop: true }], ['office_chair', 500, 250],
      ['server_rack', 840, 172], ['plant', 60, 175], ['plant', 945, 570],
      ['bookshelf', 330, 168, { w: 90 }],
    ],
    gate: (L) => L.tut.moved,
    // Second half: slime oozes out of the floor (movement hazard only; tuning below is untouched).
    update(L, dt) { officeSlime(L, dt, waveProgress(L, L.W)); },
    // Playtest: the old waves (half-speed beetles, one at a time) were a walkover. Wave 1 still teaches the
    // kick; after that waves overlap (`at`), bugs pour out of the laptop, and the last push has two spiders.
    waves: [
      { spawn: [['beetle', 4, { speedMul: 0.8, dmgMul: 0.8 }]], delay: 0.3 },
      { spawn: [['beetle', 5, { speedMul: 0.95 }], ['moth', 2]], at: 1, delay: 1 },
      { spawn: [['beetle', 6]], from: { x: 500, y: 250, spread: 30 }, at: 2, delay: 0.8 },
      { spawn: [['moth', 3], ['cable_spider', 1], ['beetle', 3, { speedMul: 1.1 }]], at: 2, delay: 1 },
      { spawn: [['beetle', 7]], from: { x: 500, y: 250, spread: 40 }, at: 3, delay: 0.8 },
      { spawn: [['cable_spider', 2, { hpMul: 1.2 }], ['moth', 3], ['beetle', 4, { hpMul: 1.4 }]], at: 1, delay: 1.2 },
    ],
  }),

  // 2 ── Kitchen: the sourdough starter keeps spitting dough; toasters on the counters, a screaming kettle.
  kitchen: waveStage({
    w: 1300, h: 680, wallH: 130, floor: 'tile', start: { x: 650, y: 600 },
    props: [
      ['counter', 250, 200, { w: 340 }], ['oven', 470, 200], ['fridge', 560, 196],
      ['counter', 900, 200, { w: 360 }], ['island', 650, 470], ['starter_jar', 1180, 240], ['plant', 60, 640],
    ],
    setup(L) { L.spawnEnemy('toaster', 250, 240, { spawnDelay: 1 }); },
    waves: [
      { spawn: [['dough_blob', 3]], from: { x: 1150, y: 300, spread: 50 } },
      { spawn: [['dough_blob', 3], ['kettle', 1]], from: { x: 1150, y: 300, spread: 60 }, at: 2, delay: 1.5 },
      { spawn: [['toaster', 1]], from: { x: 900, y: 240, spread: 0 }, at: 3, delay: 0.5 },
      { spawn: [['dough_blob', 4], ['kettle', 1]], from: { x: 1150, y: 300, spread: 70 }, at: 1, delay: 1.5 },
      { spawn: [['dough_blob', 5]], from: { x: 1150, y: 300, spread: 80 }, at: 1, delay: 1.5 },
    ],
  }),

  // 3 ── Living room: the Roomba Tank (mini-boss) + dust bunnies.
  living: {
    w: 1300, h: 720, wallH: 130, floor: 'wood', start: { x: 650, y: 665 },
    props: [
      ['rug', 650, 520, { w: 380, d: 230 }], ['tv_stand', 650, 172], ['coffee_table', 650, 470],
      ['sofa', 650, 595, { w: 230 }], ['armchair', 320, 470], ['armchair', 980, 470],
      ['plant', 70, 180], ['bookshelf', 1150, 168],
    ],
    setup(L) {
      L.boss = L.spawnEnemy('roomba', 650, 300, { spawnDelay: 1.2, hpMul: 3, dmgMul: 0.75 });
      for (let i = 0; i < 3; i++) L.spawnEnemy('dust_bunny', 250 + i * 400, 300 + (i % 2) * 50, { spawnDelay: 1.4, counts: false });
    },
    update(L, dt) { creepyDirector(L, dt); }, // creepy dolls & teddies, creepier as the Roomba weakens
    drawOver(ctx, L) { drawCreepyDark(ctx, L); },
    onKill(L, e) { if (e === L.boss) creepyDirector(L, 0); }, // the toys go limp with it
    objective(L) { return { text: `${ROOMS.living.objective}`, progress: 1 - L.boss.hp / L.boss.maxHp }; },
    done(L) { return L.boss.dead; },
  },

  // 4 ── Dining room: plates fly from the sideboard, chairs charge.
  dining: waveStage({
    w: 1240, h: 690, wallH: 130, floor: 'wood', start: { x: 620, y: 630 },
    props: [['rug', 620, 520, { w: 420, d: 250 }], ['dining_table', 620, 470], ['sideboard', 620, 174], ['plant', 60, 180], ['plant', 1180, 180]],
    waves: [
      { spawn: [['chair', 2, { onDeath: wrangled }], ['flying_plate', 2]], from: { x: 620, y: 300, spread: 140 }, delay: 0.2 },
      { spawn: [['flying_plate', 4]], from: { x: 620, y: 230, spread: 120 }, at: 1, delay: 1 },
      { spawn: [['chair', 3, { onDeath: wrangled }]], at: 1, delay: 1 },
      { spawn: [['chair', 2, { onDeath: wrangled }], ['flying_plate', 3]], at: 1, delay: 1.2 },
      { spawn: [['chair', 3, { onDeath: wrangled }], ['flying_plate', 3]], from: { x: 620, y: 300, spread: 160 }, delay: 1.2 },
    ],
  }),

  // 5 ── Playroom: card-soldier formations, grid-hopping pawns, jack-in-the-box ambushes.
  playroom: waveStage({
    w: 1240, h: 700, wallH: 130, floor: 'carpet', start: { x: 620, y: 640 },
    props: [['rug', 620, 540, { w: 420, d: 250 }], ['toy_box', 200, 210], ['block_tower', 1040, 260], ['play_table', 620, 330], ['bookshelf', 1080, 168], ['block_tower', 150, 600]],
    setup(L) { for (const [x, y] of [[330, 520], [920, 600], [760, 260]]) L.spawnEnemy('jack_box', x, y, { spawnDelay: 0 }); },
    waves: [
      { spawn: [['card_soldier', 4, { formation: 'row' }]], delay: 0.5, at: 3 },
      { spawn: [['pawn', 3]], at: 4, delay: 1 },
      { spawn: [['card_soldier', 5, { formation: 'row' }], ['pawn', 2]], at: 3, delay: 1.2 },
      { spawn: [['card_soldier', 4, { formation: 'row' }], ['card_soldier', 4, { formation: 'row' }], ['pawn', 2]], at: 1, delay: 1.5 },
    ],
  }),

  // 6 ── Primary bedroom: lint + hanger hawks, then the Sock Monster climbs out of the laundry.
  primary: {
    w: 1300, h: 720, wallH: 130, floor: 'carpet', start: { x: 650, y: 660 },
    props: [['rug', 650, 600, { w: 360, d: 180 }], ['bed', 650, 340], ['nightstand', 505, 220], ['nightstand', 795, 220], ['dresser', 1080, 180], ['laundry_basket', 200, 560], ['laundry_basket', 1120, 620], ['plant', 60, 180]],
    setup(L) { L.W = waveRunner([{ spawn: [['lint', 6], ['hanger', 2]], delay: 0.4 }, { spawn: [['lint', 4], ['hanger', 1]], at: 2, delay: 1 }]); },
    update(L, dt) {
      L.W.update(L, dt);
      if (!L.boss && L.W.done && L.aliveCounted() <= 1) {
        L.boss = L.spawnEnemy('sock_monster', 220, 470, { spawnDelay: 1.4, hpMul: 2.4 });
        L.banner('The laundry is moving...', PALETTE.danger);
        L.fx.burst(200, 540, '#ff8fb1', 30, 220);
        playSfx('error');
      }
    },
    objective(L) {
      const waveP = Math.min(1, L.defeated / 13);
      return { text: L.boss ? ROOMS.primary.objective : `${ROOMS.primary.objective}: clear the lint first`, progress: L.boss ? 0.2 + 0.8 * (1 - L.boss.hp / L.boss.maxHp) : 0.2 * waveP };
    },
    done(L) { return L.boss?.dead; },
  },

  // 7 ── Guest bedroom: survive the flood. Leaks drip puddles, ducks swarm, pipe snakes burst from walls.
  guest: {
    w: 1200, h: 700, wallH: 130, floor: 'tile', start: { x: 600, y: 600 },
    props: [['guest_bed', 280, 360], ['bathtub', 860, 240], ['sink', 1090, 200], ['dresser', 520, 176], ['rug', 640, 560, { w: 300, d: 170 }]],
    survive: 70,
    setup(L) { L.surviveT = 0; L.dripT = 2; L.duckT = 1; L.snakeT = 6; },
    update(L, dt) {
      L.surviveT += dt;
      const k = L.surviveT / 70;
      L.dripT -= dt;
      if (L.dripT <= 0) {
        L.dripT = 2.6 - k * 1.2;
        const h = L.hero, x = h.x + (Math.random() - 0.5) * 220, y = h.y + (Math.random() - 0.5) * 140;
        if (isOpen(L.arena, x, y, 10)) {
          addTelegraph(L, { kind: 'circle', x, y, r: 46, dur: 1.0 * L.scl.tele, color: PALETTE.lake });
          L.later(1.0 * L.scl.tele, () => { addZone(L, { kind: 'puddle', x, y, r: 50, dur: 7, dmg: 3 }); L.fx.burst(x, y, PALETTE.lake, 10, 120); playSfx('splash'); });
        }
      }
      L.duckT -= dt;
      if (L.duckT <= 0 && L.aliveCount() < 10) {
        L.duckT = 9 - k * 3;
        const p = { x: 860, y: 300 };
        for (let i = 0; i < 4 + Math.floor(k * 3); i++) L.spawnEnemy('rubber_duck', p.x + (Math.random() - 0.5) * 120, p.y + Math.random() * 40, { spawnDelay: 0.4 + i * 0.1, counts: false });
      }
      L.snakeT -= dt;
      if (L.snakeT <= 0 && L.enemies.filter((e) => !e.dead && e.type === 'pipe_snake').length < 1 + Math.floor(k * 2)) {
        L.snakeT = 10 - k * 3;
        L.spawnEnemy('pipe_snake', 40, 300, { spawnDelay: 0, counts: false });
      }
    },
    objective(L) { const left = Math.max(0, Math.ceil(70 - (L.surviveT ?? 0))); return { text: `${ROOMS.guest.objective}: ${left}s until the water's off`, progress: Math.min(1, (L.surviveT ?? 0) / 70) }; },
    done(L) { return L.surviveT >= 70; },
  },

  // 8 ── Backyard: string 4 light posts (stand close) while gnomes march; then the grill wakes up.
  backyard: {
    w: 1500, h: 920, wallH: 110, floor: 'grass', outdoor: true, start: { x: 750, y: 780 },
    props: [
      ['grill', 1240, 250], ['patio_table', 420, 640], ['tree', 140, 260], ['tree', 1390, 780], ['hedge', 700, 170], ['hedge', 400, 170],
      ['light_post', 270, 420, { tag: 'light' }], ['light_post', 820, 360, { tag: 'light' }], ['light_post', 1120, 640, { tag: 'light' }], ['light_post', 330, 820, { tag: 'light' }],
    ],
    setup(L) {
      L.lights = L.arena.props.filter((p) => p.tag === 'light');
      for (const p of L.lights) { p.lit = 0; p.done = false; }
      L.gnomeT = 1; L.spawnEnemy('vine', 600, 520, { counts: false }); L.spawnEnemy('vine', 1000, 450, { counts: false });
    },
    update(L, dt) {
      const h = L.hero;
      for (const p of L.lights) {
        if (p.done) continue;
        const near = dist(h.x, h.y, p.x, p.y) < 80;
        p.lit = Math.max(0, Math.min(1, p.lit + (near ? dt / 2.2 : -dt / 6)));
        if (near && Math.random() < 0.3) L.fx.burst(p.x, p.y - 70, PALETTE.sun, 1, 40);
        if (p.lit >= 1) { p.done = true; L.fx.sparkle?.(p.x, p.y - 70, PALETTE.sun, 20, 40); L.fx.floatText(p.x, p.y - 100, 'Lights up!', PALETTE.sun, { big: true }); playSfx('star'); }
      }
      const lit = L.lights.filter((p) => p.done).length;
      L.gnomeT -= dt;
      if (!L.boss && L.gnomeT <= 0 && L.aliveCount() < 9) {
        L.gnomeT = 11;
        spawnWave(L, { spawn: [['gnome', 4 + Math.min(2, lit), { formation: 'column', counts: false }]] });
      }
      if (!L.boss && lit >= L.lights.length) {
        L.boss = L.spawnEnemy('grill_dragon', 1240, 320, { spawnDelay: 1.4, hpMul: 2.4 });
        L.banner('The grill is waking up!', PALETTE.danger);
        playSfx('error');
      }
    },
    objective(L) {
      const lit = L.lights.filter((p) => p.done).length, part = L.lights.reduce((a, p) => a + (p.done ? 1 : p.lit), 0);
      if (!L.boss) return { text: `${ROOMS.backyard.objective}: ${lit}/4 (stand by a post)`, progress: 0.6 * part / 4 };
      return { text: `${ROOMS.backyard.objective}: tame the Grill Dragon!`, progress: 0.6 + 0.4 * (1 - L.boss.hp / L.boss.maxHp) };
    },
    done(L) { return L.boss?.dead; },
  },

  // 9 ── Pond (finale): PartyPlanner.exe, 3 telegraphed phases. Ends at 0 HP; Final Patch finishes it.
  pond: {
    w: 1400, h: 920, wallH: 110, floor: 'grass', outdoor: true, start: { x: 700, y: 820 },
    water: [{ x: 700, y: 470, rx: 270, ry: 150 }],
    props: [['reeds', 400, 420], ['reeds', 1000, 520], ['reeds', 560, 640], ['rock', 980, 330], ['rock', 360, 600], ['tree', 120, 240], ['tree', 1290, 260], ['tree', 1300, 800], ['lily_pad', 640, 440], ['lily_pad', 780, 520]],
    setup(L) {
      L.boss = L.spawnEnemy('partyplanner', 700, 470, { spawnDelay: 1.6, hpMul: 1.6 });
      for (let i = 0; i < 2; i++) L.spawnEnemy('code_fish', 700 + (i ? 120 : -120), 470, { spawnDelay: 1.6, counts: false });
      L.log('> main() // party_mode = true');
    },
    update() {},
    objective(L) { return { text: `${ROOMS.pond.objective} (phase ${L.boss.phase}/3)`, progress: 1 - L.boss.hp / L.boss.maxHp }; },
    done(L) { return L.boss.dead; },
  },
};

function wrangled(L, e) { L.fx.floatText(e.x, e.y - 50, 'Wrangled!', PALETTE.sun); }
