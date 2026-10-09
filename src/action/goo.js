// Office gross-out + slime floor. Owned by: action team. Looks come from art-world (Sprites.drawGoo*/drawSlime).
// - Bugs (beetle/moth/cable_spider) burst into goo: floor splat decals (persist all stage, cap ~60), flung
//   shell bits/legs that tumble and land, a spurt on every hit, and an ooze-drip trail while badly hurt.
// - From the office's halfway point, slime bubbles up out of the floor (1s telegraph), spreads, and dries
//   after ~10-15s. Slime is a pure movement hazard: no damage, the hero just loses grip (see heroes.js
//   slickT) and ground bugs sometimes slip and fall over (stunned, i.e. easier, never harder).
import { dist } from '../core/math.js';
import * as Sprites from '../art/sprites.js';
import { playSfx } from '../audio/sfx.js';
import { isOpen } from './arena.js';

const GOOEY = { beetle: 1, moth: 1, cable_spider: 1 };
const PIECES = { beetle: ['shell', 'shell', 'leg', 'leg'], moth: ['wing', 'wing'], cable_spider: ['plug', 'shell', 'leg', 'leg'] };
const SPLAT_R = { beetle: 19, moth: 17, cable_spider: 29 };
const DECAL_CAP = 60, PIECE_CAP = 40, DRIP_CAP = 50;
const gooColor = (type) => Sprites.GOO_COLORS?.[type]?.goo ?? '#58e0b4';
const can = (fn) => typeof Sprites[fn] === 'function';
let seq = 0;

export function createGoo() {
  return { decals: [], pieces: [], drips: [], debris: [], spurts: [], slime: [], on: false, spawnT: 0, toldSlip: false };
}

// ---------------------------------------------------------------- bug guts
function addDecal(list, d, cap) {
  list.push({ fade: 1, ...d });
  // over the cap: the oldest start fading out (never pop abruptly)
  let over = list.filter((x) => !x.fading).length - cap;
  for (const x of list) { if (over <= 0) break; if (!x.fading) { x.fading = true; over--; } }
}

/** A gooey bug died: splat + flung bits (+ sparks and an oil puddle for the spider). */
export function goreKill(L, e) {
  const G = L.goo;
  if (!G || !GOOEY[e.type]) return;
  const h = L.hero, R = Math.random;
  const ang = h ? Math.atan2(e.y - h.y, e.x - h.x) : R() * Math.PI * 2;
  const big = e.type === 'cable_spider';
  addDecal(G.decals, { type: e.type, x: e.x, y: e.y, r: SPLAT_R[e.type] + R() * 6, ang, seed: ++seq * 17 + Math.floor(R() * 1000), born: L.time }, DECAL_CAP);
  const z0 = (e.z || 0) + e.h * 0.4;
  for (const piece of PIECES[e.type]) {
    const a = ang + (R() - 0.5) * 2.4, v = 60 + R() * 110;
    G.debris.push({ type: e.type, piece, x: e.x, y: e.y, z: z0, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: 150 + R() * 140, rot: R() * 6, vr: (R() - 0.5) * 22, seed: ++seq, bounced: false });
  }
  const c = gooColor(e.type);
  L.fx.splat?.(e.x, e.y - e.h * 0.5 - (e.z || 0), c, 14);
  L.fx.burst(e.x, e.y - e.h * 0.5 - (e.z || 0), c, 10, 200);
  if (big) {
    L.fx.burst(e.x, e.y - 18, '#fff27a', 16, 240);
    L.fx.sparkle?.(e.x, e.y - 18, '#fff9c4', 10, 30);
  }
}

/** Goo spurt on every hit to a gooey bug. */
export function goreHit(L, e, sx, sy) {
  const G = L.goo;
  if (!G || !GOOEY[e.type] || e.dead) return;
  const ang = Math.atan2(e.y - sy, e.x - sx);
  G.spurts.push({ type: e.type, x: e.x, y: e.y - e.h * 0.5 - (e.z || 0), ang, t: 0 });
  if (!e.flying || Math.random() < 0.5) addDrip(G, e.type, e.x + Math.cos(ang) * 10, e.y + Math.sin(ang) * 6, 3);
}

function addDrip(G, type, x, y, r = 2.2) {
  G.drips.push({ type, x, y, r, t: 0, life: 6 + Math.random() * 2, seed: ++seq });
  if (G.drips.length > DRIP_CAP) G.drips.shift();
}

// ---------------------------------------------------------------- update
export function updateGoo(L, dt) {
  const G = L.goo;
  if (!G) return;
  for (const list of [G.decals, G.pieces]) for (const d of list) if (d.fading) d.fade -= dt / 0.8;
  if (G.decals.length && G.decals[0].fade <= 0) G.decals = G.decals.filter((d) => d.fade > 0);
  if (G.pieces.length && G.pieces[0].fade <= 0) G.pieces = G.pieces.filter((d) => d.fade > 0);
  for (const d of G.drips) d.t += dt;
  if (G.drips.length && G.drips[0].t > G.drips[0].life) G.drips = G.drips.filter((d) => d.t < d.life);
  for (const s of G.spurts) s.t += dt;
  if (G.spurts.length) G.spurts = G.spurts.filter((s) => s.t < 0.35);
  // flung bits: ballistic arc, one little bounce, then they lie on the floor as decals
  for (const b of G.debris) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz -= 900 * dt; b.rot += b.vr * dt;
    if (b.z <= 0) {
      b.z = 0;
      if (!b.bounced && b.vz < -120) { b.bounced = true; b.vz = -b.vz * 0.3; b.vx *= 0.45; b.vy *= 0.45; b.vr *= 0.4; }
      else { b.done = true; addDecal(G.pieces, { type: b.type, piece: b.piece, x: b.x, y: b.y, rot: b.rot, seed: b.seed }, PIECE_CAP); }
    }
  }
  if (G.debris.length) G.debris = G.debris.filter((b) => !b.done);
  // badly hurt bugs leak a drip trail as they move
  for (const e of L.enemies) {
    if (e.dead || !GOOEY[e.type] || e.spawning > 0 || e.hp > e.maxHp * 0.5) continue;
    e.dripT = (e.dripT ?? 0) - dt;
    if (e.dripT > 0) continue;
    e.dripT = 0.22 + Math.random() * 0.2;
    if (e.lastDrip && dist(e.x, e.y, e.lastDrip.x, e.lastDrip.y) < 6) continue;
    e.lastDrip = { x: e.x, y: e.y };
    addDrip(G, e.type, e.x + (Math.random() - 0.5) * 8, e.y + 2);
  }
  updateSlime(L, dt);
}

// ---------------------------------------------------------------- slime floor
const WARN = 1.0, GROW = 1.3, DRY = 2.0;

/** Office stage hook: starts the ooze at ~halfway, then keeps 3..6 puddles going. */
export function officeSlime(L, dt, progress) {
  const G = L.goo;
  if (!G || L.phase !== 'play') return;
  if (!G.on) {
    if (progress < 0.5) return;
    G.on = true; G.spawnT = 0.4;
    L.say('sabotage', true);
    L.banner('The floor is oozing! Slime is slippery.', '#7dff6a', 2.4);
    playSfx('squish');
  }
  const target = 3 + Math.round(3 * Math.min(1, Math.max(0, (progress - 0.5) / 0.35)));
  G.spawnT -= dt;
  if (G.spawnT > 0) return;
  const live = G.slime.filter((p) => p.t < p.life).length;
  if (live >= target) { G.spawnT = 0.5; return; }
  G.spawnT = 1.4 + Math.random() * 1.4;
  spawnPuddle(L);
}

function spawnPuddle(L) {
  const G = L.goo, A = L.arena, h = L.hero;
  const r = 30 + Math.random() * 26; // ~60..112 px across
  for (let i = 0; i < 40; i++) {
    let x, y;
    if (i < 20 && Math.random() < 0.5) { // near the hero (never right under them)
      const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 150;
      x = h.x + Math.cos(a) * d; y = h.y + Math.sin(a) * d * 0.7;
    } else { x = 60 + Math.random() * (A.w - 120); y = A.wallH + 40 + Math.random() * (A.h - A.wallH - 80); }
    if (!isOpen(A, x, y, r * 0.75)) continue;
    if (dist(x, y, h.x, h.y) < r + 50) continue;
    if (G.slime.some((p) => dist(x, y, p.x, p.y) < (r + p.r) * 0.8)) continue;
    G.slime.push({ x, y, r, t: 0, life: WARN + 10 + Math.random() * 5, seed: ++seq * 31 + Math.floor(Math.random() * 97) });
    return;
  }
}

/** Fraction of a puddle that is slick right now (0 while it's only bubbling). */
function slickR(p) {
  if (p.t < WARN) return 0;
  const grow = Math.min(1, (p.t - WARN) / GROW), left = Math.min(1, (p.life - p.t) / DRY);
  return p.r * 0.9 * (0.25 + 0.75 * grow) * (0.7 + 0.3 * left) * Math.min(1, left * 3);
}
const inPuddle = (p, x, y, pad = 0) => { const r = slickR(p) * 0.85 + pad; return r > 4 && Math.hypot(x - p.x, (y - p.y) / 0.6) < r; };

function updateSlime(L, dt) {
  const G = L.goo, h = L.hero;
  if (!G.slime.length) return;
  for (const p of G.slime) {
    const was = p.t;
    p.t += dt;
    if (L.phase === 'won' && p.t < p.life - DRY) p.life = p.t + DRY; // room fixed: everything dries up
    if (was < WARN && p.t >= WARN) { L.fx.splat?.(p.x, p.y, '#6fe05a', 10); playSfx('squish'); }
  }
  G.slime = G.slime.filter((p) => p.t < p.life);
  if (L.phase !== 'play') return;
  if (h && !h.down && G.slime.some((p) => inPuddle(p, h.x, h.y))) {
    h.slickT = 0.18;
    const v = Math.hypot(h.svx ?? 0, h.svy ?? 0);
    if (v > 60 && Math.random() < dt * 14) L.fx.burst(h.x - (h.svx ?? 0) * 0.05, h.y, '#7dff6a', 2, 70); // slime kicked up by skidding feet
    if (!G.toldSlip) { G.toldSlip = true; L.fx.floatText(h.x, h.y - 120, 'Slippery!', '#7dff6a', { big: true }); playSfx('boing'); }
  }
  // ground bugs that blunder into slime sometimes go feet-up (a free stun, never a speed boost)
  for (const e of L.enemies) {
    if (e.dead || e.flying || e.boss || e.spawning > 0 || e.hidden || e.anchored) continue;
    e.slipCd = Math.max(0, (e.slipCd ?? 0) - dt);
    if (e.slipCd > 0 || !G.slime.some((p) => inPuddle(p, e.x, e.y))) continue;
    e.slipCd = 2.5;
    if (Math.random() > 0.45) continue;
    e.stun = Math.max(e.stun, 0.6);
    e.kvx += Math.cos(e.facing) * 120; e.kvy += Math.sin(e.facing) * 80;
    if (Math.random() < 0.5) L.fx.floatText(e.x, e.y - e.h - 14, 'whoa!', '#7dff6a');
  }
}

// ---------------------------------------------------------------- draw
/** Floor layer (under actors): splats, landed bits, drips, then the slime on top. */
export function drawGooFloor(ctx, L, view) {
  const G = L.goo, g = L.game;
  if (!G) return;
  const vis = (o, pad = 60) => o.x > view.x0 - pad && o.x < view.x1 + pad && o.y > view.y0 - pad && o.y < view.y1 + pad;
  const alpha = (d) => (d.fading ? Math.max(0, d.fade) : 1);
  if (can('drawGooSplat')) for (const d of G.decals) if (vis(d)) Sprites.drawGooSplat(ctx, g, d.x, d.y, { type: d.type, seed: d.seed, r: d.r, age: L.time - d.born, ang: d.ang, alpha: alpha(d) });
  if (can('drawGooPiece')) for (const d of G.pieces) if (vis(d, 20)) Sprites.drawGooPiece(ctx, g, d.x, d.y, { type: d.type, piece: d.piece, rot: d.rot, seed: d.seed, alpha: alpha(d) });
  if (can('drawGooDrip')) for (const d of G.drips) if (vis(d, 10)) Sprites.drawGooDrip(ctx, g, d.x, d.y, { type: d.type, seed: d.seed, r: d.r, alpha: Math.min(1, (d.life - d.t) / 1.5) });
  if (can('drawSlime')) for (const p of G.slime) {
    if (!vis(p, p.r + 20)) continue;
    const warn = Math.min(1, p.t / WARN), grow = Math.min(1, Math.max(0, (p.t - WARN) / GROW)), life = Math.min(1, (p.life - p.t) / DRY);
    Sprites.drawSlime(ctx, g, p.x, p.y, p.r, { t: L.time, age: p.t, seed: p.seed, warn, grow, life });
  }
}

/** Air layer (over actors): bits still flying, hit spurts. */
export function drawGooAir(ctx, L) {
  const G = L.goo, g = L.game;
  if (!G) return;
  if (can('drawGooPiece')) for (const b of G.debris) Sprites.drawGooPiece(ctx, g, b.x, b.y, { type: b.type, piece: b.piece, rot: b.rot, z: b.z, seed: b.seed });
  if (can('drawGooSpurt')) for (const s of G.spurts) Sprites.drawGooSpurt(ctx, g, s.x, s.y, { type: s.type, k: s.t / 0.35, ang: s.ang });
}

