// Room arenas: furniture props + collision. Owned by: action team.
// A room is a rectangle of floor below a back wall (wallH). Furniture are axis-aligned boxes whose
// (x, y) is the FRONT-CENTER ground point (so y-sorting by y works); footprint = [x-w/2, x+w/2] × [y-d, y].
import { dist, rng } from '../core/math.js';

export const SIDE = 26; // side-wall thickness (walkable area starts here)

// kind -> default footprint + flags. h = visual height (fallback drawing only).
export const FURNITURE = {
  desk: { w: 150, d: 50, h: 42, shots: true },
  office_chair: { w: 34, d: 26, h: 30, shots: false },
  bookshelf: { w: 110, d: 30, h: 110, shots: true },
  server_rack: { w: 60, d: 36, h: 100, shots: true },
  plant: { r: 16, h: 50, shots: false },
  counter: { w: 200, d: 52, h: 46, shots: true },
  island: { w: 180, d: 70, h: 46, shots: true },
  oven: { w: 70, d: 52, h: 50, shots: true },
  fridge: { w: 70, d: 50, h: 120, shots: true },
  sofa: { w: 190, d: 60, h: 44, shots: false },
  armchair: { w: 70, d: 56, h: 44, shots: false },
  coffee_table: { w: 110, d: 46, h: 22, shots: false },
  tv_stand: { w: 160, d: 34, h: 70, shots: true },
  dining_table: { w: 260, d: 110, h: 36, shots: false },
  sideboard: { w: 170, d: 40, h: 50, shots: true },
  toy_box: { w: 80, d: 44, h: 36, shots: false },
  block_tower: { r: 18, h: 50, shots: true },
  play_table: { w: 110, d: 60, h: 26, shots: false },
  bed: { w: 190, d: 150, h: 34, shots: false },
  dresser: { w: 120, d: 40, h: 60, shots: true },
  nightstand: { w: 46, d: 34, h: 32, shots: false },
  laundry_basket: { r: 18, h: 26, shots: false },
  guest_bed: { w: 120, d: 150, h: 32, shots: false },
  bathtub: { w: 170, d: 70, h: 32, shots: false },
  sink: { w: 70, d: 40, h: 40, shots: false },
  grill: { w: 90, d: 50, h: 54, shots: true },
  hedge: { w: 120, d: 36, h: 44, shots: true },
  tree: { r: 22, h: 90, shots: true },
  light_post: { r: 10, h: 80, shots: false },
  patio_table: { r: 30, h: 30, shots: false },
  rock: { r: 20, h: 22, shots: true },
  reeds: { r: 14, h: 30, shots: false },
  lily_pad: { r: 0, deco: true },
  rug: { w: 240, d: 150, deco: true },
  starter_jar: { r: 22, h: 46, shots: true },
};

let seq = 0;
/** Create a furniture/prop entry. extra may override w/d/r or add fields (hp, tag, ...). */
export function makeProp(kind, x, y, extra = {}) {
  const def = FURNITURE[kind] ?? { r: 14, h: 30, shots: true };
  const p = { id: ++seq, kind, x, y, seed: (seq * 7919) % 1000, h: def.h ?? 30, blocksShots: !!def.shots, deco: !!def.deco, ...extra };
  if (p.w == null && def.w != null) { p.w = def.w; p.d = def.d; }
  if (p.r == null && def.r != null) p.r = def.r;
  p.solid = !p.deco && (p.w > 0 || p.r > 0);
  // approx radius for culling / generic checks
  p.rr = p.w ? Math.hypot(p.w / 2, p.d / 2) : (p.r ?? 0);
  return p;
}

/**
 * Build an arena from a stage layout.
 * def: { w, h, wallH, floor, props: [[kind, x, y, extra?]...], water?: [{x,y,rx,ry}], start:{x,y}, outdoor? }
 */
export function buildArena(def) {
  const a = {
    w: def.w, h: def.h, wallH: def.wallH ?? 120, floor: def.floor ?? 'wood', outdoor: !!def.outdoor,
    props: [], water: (def.water ?? []).map((wv) => ({ ...wv })), start: { ...def.start },
    rand: rng(def.seed ?? 7),
  };
  for (const [kind, x, y, extra] of def.props ?? []) a.props.push(makeProp(kind, x, y, extra));
  return a;
}

function pushOutRect(p, e) {
  const x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, y0 = p.y - p.d, y1 = p.y;
  const cx = Math.max(x0, Math.min(x1, e.x)), cy = Math.max(y0, Math.min(y1, e.y));
  let dx = e.x - cx, dy = e.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= e.r * e.r) return false;
  if (d2 < 0.0001) {
    // center inside: push out along the shallowest side
    const l = e.x - x0, r = x1 - e.x, t = e.y - y0, b = y1 - e.y;
    const m = Math.min(l, r, t, b);
    if (m === l) e.x = x0 - e.r; else if (m === r) e.x = x1 + e.r; else if (m === t) e.y = y0 - e.r; else e.y = y1 + e.r;
    return true;
  }
  const d = Math.sqrt(d2);
  e.x = cx + (dx / d) * e.r; e.y = cy + (dy / d) * e.r;
  return true;
}

/** Push a circle entity {x,y,r} out of solid props, water (unless flying) and room walls. Returns true if it hit a prop. */
export function collide(arena, e, { flying = false, swim = false } = {}) {
  let hit = false;
  if (!flying) {
    for (const p of arena.props) {
      if (!p.solid || p.broken) continue;
      if (p.w) { if (pushOutRect(p, e)) hit = true; continue; }
      const dx = e.x - p.x, dy = e.y - p.y, min = p.r + e.r, d2 = dx * dx + dy * dy;
      if (d2 < min * min) { const d = Math.sqrt(d2) || 0.01; e.x = p.x + (dx / d) * min; e.y = p.y + (dy / d) * min; hit = true; }
    }
    if (!swim) for (const wv of arena.water) {
      // ellipse: scale to circle space
      const sx = (e.x - wv.x) / wv.rx, sy = (e.y - wv.y) / wv.ry, d = Math.hypot(sx, sy);
      const lim = 1 + (e.r - 6) / Math.min(wv.rx, wv.ry);
      if (d < lim) { const k = lim / (d || 0.01); e.x = wv.x + sx * k * wv.rx; e.y = wv.y + sy * k * wv.ry; }
    }
  }
  e.x = Math.max(SIDE + e.r, Math.min(arena.w - SIDE - e.r, e.x));
  e.y = Math.max(arena.wallH + e.r * 0.5, Math.min(arena.h - 18 - e.r * 0.5, e.y));
  return hit;
}

/** Is (x,y) inside any water ellipse? */
export function inWater(arena, x, y, pad = 0) {
  for (const wv of arena.water) if (Math.hypot((x - wv.x) / (wv.rx + pad), (y - wv.y) / (wv.ry + pad)) < 1) return wv;
  return null;
}

/** The prop a shot at (x,y,r) would hit, or null. Walls count as a pseudo-prop. */
export function shotBlocker(arena, x, y, r) {
  if (x < SIDE - 4 || x > arena.w - SIDE + 4 || y < arena.wallH - 30 || y > arena.h + 10) return WALL;
  for (const p of arena.props) {
    if (!p.solid || p.broken || !p.blocksShots) continue;
    if (p.w) { if (x > p.x - p.w / 2 - r && x < p.x + p.w / 2 + r && y > p.y - p.d - 30 - r && y < p.y + r) return p; }
    else if (dist(x, y, p.x, p.y - 10) < p.r + r) return p;
  }
  return null;
}
const WALL = { wall: true };

/** Is a point free of props/water/walls (for spawning)? */
export function isOpen(arena, x, y, r = 16) {
  if (x < SIDE + r + 10 || x > arena.w - SIDE - r - 10 || y < arena.wallH + r + 10 || y > arena.h - r - 24) return false;
  for (const p of arena.props) {
    if (!p.solid || p.broken) continue;
    if (p.w) { if (x > p.x - p.w / 2 - r && x < p.x + p.w / 2 + r && y > p.y - p.d - r && y < p.y + r) return false; }
    else if (dist(x, y, p.x, p.y) < p.r + r + 4) return false;
  }
  if (inWater(arena, x, y, r)) return false;
  return true;
}

/** Random open point at least minD from (fx,fy). */
export function openPointAway(arena, fx, fy, minD = 320, r = 16) {
  const R = arena.rand;
  for (let i = 0; i < 120; i++) {
    const x = R.range(60, arena.w - 60), y = R.range(arena.wallH + 30, arena.h - 50);
    if (dist(x, y, fx, fy) >= minD && isOpen(arena, x, y, r)) return { x, y };
  }
  for (let i = 0; i < 80; i++) {
    const x = R.range(60, arena.w - 60), y = R.range(arena.wallH + 30, arena.h - 50);
    if (isOpen(arena, x, y, r)) return { x, y };
  }
  return { x: fx > arena.w / 2 ? 120 : arena.w - 120, y: (arena.wallH + arena.h) / 2 };
}

/** Open point near a room edge (doorways), away from the hero. */
export function openEdgePoint(arena, fx, fy, r = 16) {
  const R = arena.rand;
  for (let i = 0; i < 80; i++) {
    const side = R.int(0, 3);
    const x = side === 0 ? R.range(50, 110) : side === 1 ? R.range(arena.w - 110, arena.w - 50) : R.range(60, arena.w - 60);
    const y = side === 2 ? R.range(arena.wallH + 20, arena.wallH + 70) : side === 3 ? R.range(arena.h - 90, arena.h - 40) : R.range(arena.wallH + 30, arena.h - 50);
    if (dist(x, y, fx, fy) > 260 && isOpen(arena, x, y, r)) return { x, y };
  }
  return openPointAway(arena, fx, fy, 260, r);
}
