// Procedural arenas per region + collision helpers. Owned by: action team.
import { rng, dist } from '../core/math.js';

// Collision radius / flags per drawProp kind.
const PROP = {
  tree: { r: 18, shots: true },
  pine: { r: 15, shots: true },
  rock: { r: 17, shots: true },
  table: { r: 22, shots: false },
  umbrella: { r: 8, shots: false },
  lamp: { r: 7, shots: true },
  bollard: { r: 7, shots: false },
  flowerbox: { r: 15, shots: false },
  door: { r: 0, shots: false, deco: true },
  barrel: { r: 12, shots: true },
  bench: { r: 17, shots: false },
  pavilion: { r: 58, shots: true },
  icewall: { r: 24, shots: true },
  iceblock: { r: 20, shots: true },
  cart: { r: 26, shots: true },
};

export const ARENA_MARGIN = 28;

let propSeq = 0;
export function makeProp(kind, x, y, extra = {}) {
  const def = PROP[kind] ?? { r: 14, shots: true };
  return { id: ++propSeq, kind, x, y, r: def.r, solid: !def.deco && def.r > 0, blocksShots: def.shots, seed: (propSeq * 7919) % 1000, ...extra };
}

const SIZES = {
  skirmish: [1700, 1150],
  rescue: [1800, 1250],
  defend: [1500, 1050],
  boss: [1500, 1100],
};

/**
 * Generate an arena.
 * @returns {{w:number,h:number,region:string,props:any[],water:{x:number,y:number,r:number}[],start:{x:number,y:number},clear:{x:number,y:number,r:number}[]}}
 */
export function generateArena(region, kind, seed) {
  const R = rng((Number(seed) || 1) * 9973 + region.length * 31 + kind.length);
  const [w, h] = SIZES[kind] ?? SIZES.skirmish;
  const a = { w, h, region, props: [], water: [], deco: [], start: { x: w / 2, y: h / 2 + 60 }, clear: [] };
  if (kind === 'boss') a.start = { x: w / 2, y: h - 200 };
  if (kind === 'defend') a.cart = { x: w / 2, y: h / 2 };
  a.clear.push({ x: a.start.x, y: a.start.y, r: 150 });
  if (a.cart) a.clear.push({ x: a.cart.x, y: a.cart.y, r: 170 });
  if (kind === 'boss') a.clear.push({ x: w / 2, y: h / 2 - 80, r: 260 });

  const place = (kind, x, y, gap = 30, extra) => {
    const r = PROP[kind]?.r ?? 14;
    if (x < ARENA_MARGIN + r || y < ARENA_MARGIN + r + 10 || x > w - ARENA_MARGIN - r || y > h - ARENA_MARGIN - r) return null;
    for (const c of a.clear) if (dist(x, y, c.x, c.y) < c.r + r) return null;
    for (const wv of a.water) if (dist(x, y, wv.x, wv.y) < wv.r + r + 12) return null;
    for (const p of a.props) if (p.solid && dist(x, y, p.x, p.y) < p.r + r + gap) return null;
    const p = makeProp(kind, x, y, extra);
    a.props.push(p);
    return p;
  };
  const scatter = (kind, n, gap = 40, tries = 30) => {
    let placed = 0;
    for (let i = 0; i < n * tries && placed < n; i++) if (place(kind, R.range(0, w), R.range(0, h), gap)) placed++;
    return placed;
  };
  // Dense border trees/props so the edges read as boundaries.
  const border = (kinds, step = 70) => {
    for (let x = 30; x < w; x += step) {
      place(R.pick(kinds), x + R.range(-15, 15), ARENA_MARGIN + 20 + R.range(0, 20), 4);
      place(R.pick(kinds), x + R.range(-15, 15), h - ARENA_MARGIN - 20 - R.range(0, 20), 4);
    }
    for (let y = 80; y < h - 40; y += step) {
      place(R.pick(kinds), ARENA_MARGIN + 20 + R.range(0, 20), y + R.range(-15, 15), 4);
      place(R.pick(kinds), w - ARENA_MARGIN - 20 - R.range(0, 20), y + R.range(-15, 15), 4);
    }
  };

  if (region === 'lakeside') {
    // A lake blob on one side.
    const side = R() < 0.5 ? -1 : 1;
    const lx = w / 2 + side * w * 0.3, ly = R.range(h * 0.3, h * 0.65);
    for (let i = 0; i < 7; i++) {
      const wx = lx + R.range(-110, 110), wy = ly + R.range(-70, 70);
      if (a.clear.some((c) => dist(wx, wy, c.x, c.y) < c.r + 120)) continue;
      a.water.push({ x: wx, y: wy, r: R.range(70, 110) });
    }
    border(['pine', 'pine', 'tree', 'rock'], 65);
    const pav = place('pavilion', w / 2 - side * w * 0.25, R.range(h * 0.3, h * 0.7), 60);
    if (!pav) scatter('pavilion', 1, 60);
    for (let i = 0, n = R.int(3, 5); i < n; i++) {
      const t = place('table', R.range(120, w - 120), R.range(120, h - 120), 50);
      if (t && R() < 0.6) place('umbrella', t.x + 30, t.y - 4, 0);
    }
    scatter('pine', R.int(7, 11), 50);
    scatter('rock', R.int(3, 5), 50);
    scatter('bench', R.int(1, 3), 50);
    // Easter egg: the tiny blue toy bucket (decorative, drawn by action).
    for (let i = 0; i < 20; i++) {
      const bx = R.range(100, w - 100), by = R.range(100, h - 100);
      if (a.props.every((p) => dist(bx, by, p.x, p.y) > p.r + 20) && a.water.every((wv) => dist(bx, by, wv.x, wv.y) > wv.r + 20)) { a.deco.push({ kind: 'bucket', x: bx, y: by }); break; }
    }
  } else if (region === 'oldcity') {
    // Colonial facades along the top edge.
    for (let x = 90; x < w - 60; x += R.int(150, 220)) a.props.push(makeProp('door', x, ARENA_MARGIN + 6));
    border(['lamp', 'bollard', 'barrel', 'flowerbox'], 75);
    // Streets: rows of lamps / bollards.
    for (let i = 0, n = R.int(3, 4); i < n; i++) {
      const horiz = R() < 0.5;
      const sx = R.range(150, w - 450), sy = R.range(150, h - 350);
      const kind = R.pick(['lamp', 'bollard', 'bollard']);
      for (let k = 0; k < R.int(4, 6); k++) place(kind, horiz ? sx + k * 70 : sx, horiz ? sy : sy + k * 70, 10);
    }
    scatter('flowerbox', R.int(5, 8), 45);
    scatter('barrel', R.int(3, 6), 40);
    scatter('bench', R.int(2, 3), 50);
  } else {
    // summit (and fallback)
    border(['pine', 'pine', 'pine', 'rock'], 60);
    if (kind === 'boss') {
      // The Baron's ice fortress wall along the top.
      for (let x = 60; x < w - 40; x += 48) place('icewall', x, ARENA_MARGIN + 40 + (Math.abs(x - w / 2) < 120 ? -12 : 0), 0);
    }
    scatter('pine', R.int(12, 18), 45);
    scatter('rock', R.int(5, 8), 45);
    scatter('tree', R.int(2, 4), 45);
    if (kind !== 'boss') scatter('icewall', R.int(2, 4), 60);
  }
  a.rand = rng((Number(seed) || 1) * 31 + 5); // runtime rng (spawns), deterministic per seed
  a.place = place;
  return a;
}

/** Push a circle entity {x,y,r} out of solid props, water (unless flying) and arena bounds. */
export function collide(arena, e, { flying = false } = {}) {
  for (const p of arena.props) {
    if (!p.solid || p.broken) continue;
    const dx = e.x - p.x, dy = e.y - p.y;
    const min = p.r + e.r;
    const d2 = dx * dx + dy * dy;
    if (d2 < min * min) {
      const d = Math.sqrt(d2) || 0.01;
      e.x = p.x + (dx / d) * min;
      e.y = p.y + (dy / d) * min;
    }
  }
  if (!flying) {
    for (const wv of arena.water) {
      const dx = e.x - wv.x, dy = e.y - wv.y;
      const min = wv.r + e.r - 6;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 0.01;
        e.x = wv.x + (dx / d) * min;
        e.y = wv.y + (dy / d) * min;
      }
    }
  }
  const m = ARENA_MARGIN + e.r;
  e.x = Math.max(m, Math.min(arena.w - m, e.x));
  e.y = Math.max(m + 10, Math.min(arena.h - m, e.y));
}

/** The prop a shot at (x,y,r) would hit, or null. */
export function shotBlocker(arena, x, y, r) {
  for (const p of arena.props) {
    if (!p.solid || p.broken || !p.blocksShots) continue;
    if (dist(x, y, p.x, p.y) < p.r + r) return p;
  }
  return null;
}

/** Is a point free of props/water (for spawning)? */
export function isOpen(arena, x, y, r = 16) {
  if (x < ARENA_MARGIN + r + 20 || y < ARENA_MARGIN + r + 30 || x > arena.w - ARENA_MARGIN - r - 20 || y > arena.h - ARENA_MARGIN - r - 20) return false;
  for (const p of arena.props) if (p.solid && !p.broken && dist(x, y, p.x, p.y) < p.r + r + 6) return false;
  for (const wv of arena.water) if (dist(x, y, wv.x, wv.y) < wv.r + r) return false;
  return true;
}

/** Random open point at least `minD` away from (fx,fy). Falls back to an arena corner-ish point. */
export function openPointAway(arena, fx, fy, minD = 380, r = 16) {
  const R = arena.rand;
  for (let i = 0; i < 80; i++) {
    const x = R.range(80, arena.w - 80), y = R.range(100, arena.h - 80);
    if (dist(x, y, fx, fy) >= minD && isOpen(arena, x, y, r)) return { x, y };
  }
  for (let i = 0; i < 80; i++) {
    const x = R.range(80, arena.w - 80), y = R.range(100, arena.h - 80);
    if (isOpen(arena, x, y, r)) return { x, y };
  }
  return { x: fx > arena.w / 2 ? 120 : arena.w - 120, y: arena.h / 2 };
}

/** Open point near an arena edge (defend waves come in from the edges). */
export function openEdgePoint(arena, r = 16) {
  const R = arena.rand;
  for (let i = 0; i < 60; i++) {
    const side = R.int(0, 3);
    const x = side === 0 ? R.range(90, 160) : side === 1 ? R.range(arena.w - 160, arena.w - 90) : R.range(90, arena.w - 90);
    const y = side === 2 ? R.range(110, 170) : side === 3 ? R.range(arena.h - 160, arena.h - 90) : R.range(110, arena.h - 90);
    if (isOpen(arena, x, y, r)) return { x, y };
  }
  return openPointAway(arena, arena.w / 2, arena.h / 2, 300, r);
}
