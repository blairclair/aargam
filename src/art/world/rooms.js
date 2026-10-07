// Room interiors: floor, back wall (+ wall decor), side/front wall caps, haywire layer. Owned by: art-world.
//
// Frame (matches action/room.js): playable floor is x∈[0, arenaW], y∈[0, arenaH]; the back-wall face is
// drawn ABOVE y=0 (y∈[-wallH, 0]). Side walls are SIDE px thick INSIDE the floor rect (x<SIDE, x>arenaW-SIDE),
// the front wall cap is FRONT px at the bottom. Furniture and rugs are placed by action (drawFurniture);
// drawRoom only paints what's fixed to the building + light + haywire decals.
// Static art is cached in 512px world chunks (base layer + weird layer, drawn with alpha = o.weird).
import { ROOMS } from '../../core/theme.js';
import { makeCanvas, hash2, rng, mix, shade, rgba, rrect, TAU, INK, WOOD, CREAM, LAMP, PALETTE, clamp01 } from './kit.js';

export const WALL_H = 130;
export const SIDE = 26;
export const FRONT = 16;
const CH = 512;
const MARGIN = 80; // painted beyond the arena on each side before falling back to flat "outside" fill

// ------------------------------------------------------------------ room styles
const STYLE = {
  office: {
    floor: 'wood', wood: ['#c08d5e', '#a9784b'], wall: '#e9e0cc', paper: 'stripe', trim: '#f7f1e3', cap: '#4a3b36',
    decor: [['window', 0.2], ['whiteboard', 0.47], ['pennant', 0.66], ['window', 0.82], ['clock', 0.36], ['sconce', 0.08], ['sconce', 0.93]],
    weird: 'glitch',
  },
  kitchen: {
    floor: 'tile', tile: ['#f3ead8', '#e3d6bb'], wall: '#f4ecd8', paper: 'subway', trim: '#ffffff', cap: '#4a3b36',
    decor: [['cabinets', 0.19, { w: 0.24 }], ['cabinets', 0.82, { w: 0.24 }], ['window', 0.5, { w: 150 }], ['sign_bread', 0.38], ['pot_rail', 0.635], ['sconce', 0.04]],
    weird: 'dough',
  },
  living: {
    floor: 'wood', wood: ['#b5835a', '#9c6c45'], wall: '#e7dbe8', paper: 'damask', trim: '#fbf6ee', cap: '#4a3b36',
    decor: [['window', 0.18], ['gallery', 0.5], ['window', 0.82], ['sconce', 0.34], ['sconce', 0.66]],
    weird: 'dust',
  },
  dining: {
    floor: 'herring', wood: ['#a4744a', '#8d6038'], wall: '#f1dde0', paper: 'wainscot', trim: '#fffaf2', cap: '#4a3b36',
    decor: [['window', 0.2], ['painting', 0.5, { w: 150, h: 64 }], ['window', 0.8], ['sconce', 0.36], ['sconce', 0.64]],
    weird: 'shards', chandelier: true,
  },
  playroom: {
    floor: 'carpet', carpet: ['#cfe3f2', '#b9d3ea'], wall: '#fdf3d6', paper: 'dots', trim: '#ffffff', cap: '#4a3b36',
    decor: [['bunting', 0], ['window', 0.25], ['chalkboard', 0.55], ['window', 0.82], ['stars', 0.4]],
    weird: 'cards',
  },
  primary: {
    floor: 'carpet', carpet: ['#ecd9cf', '#dcc4b8'], wall: '#f3e2e6', paper: 'floral', trim: '#fffaf2', cap: '#4a3b36',
    decor: [['window', 0.2], ['frame_pair', 0.5], ['window', 0.8], ['sconce', 0.38], ['sconce', 0.62], ['hoop', 0.65]],
    weird: 'socks',
  },
  guest: {
    floor: 'tile', tile: ['#e8eef2', '#d6e0e6'], wall: '#dfeaf0', paper: 'beadboard', trim: '#ffffff', cap: '#4a3b36',
    decor: [['window', 0.3], ['painting', 0.62, { w: 90, h: 56, art: 'sea' }], ['towel_hook', 0.85], ['sconce', 0.47]],
    weird: 'flood',
  },
  backyard: {
    floor: 'grass', grass: ['#7fb85f', '#6aa64f'], outdoor: 'yard', wall: '#dfe5ea', trim: '#ffffff', cap: '#5a6370',
    decor: [['house_window', 0.16], ['back_door', 0.4], ['house_window', 0.62], ['house_window', 0.86]],
    weird: 'jungle', eaveLights: true,
  },
  pond: {
    floor: 'grass', grass: ['#7ab35c', '#64a04c'], outdoor: 'bank', wall: '#4f9a52', trim: '#3f7a4a', cap: '#2f5f3a',
    decor: [],
    weird: 'code',
  },
};
/** Room ids drawRoom renders for real. */
export const ROOM_KINDS = Object.keys(STYLE);

/** Per-room geometry hints. Action's own arena.water stays canonical for the pond. */
export function roomGeometry(roomId, arenaW, arenaH) {
  return { wallH: WALL_H, side: SIDE, front: FRONT, outdoor: !!STYLE[roomId]?.outdoor };
}

const acc = (id) => ROOMS[id]?.accent ?? '#c9a27a';
const tintA = (id, c, k = 0.1) => mix(c, acc(id), k);
const H = (x, y, s) => hash2(Math.floor(x), Math.floor(y), s);

// ------------------------------------------------------------------ floors
function floorWood(g, id, S, r, aw, ah) {
  const [cA, cB] = S.wood.map((c) => tintA(id, c, 0.06));
  const RH = 26, PL = 170;
  const y0 = Math.max(0, Math.floor(r.y0 / RH)), y1 = Math.min(Math.ceil(ah / RH), Math.ceil(r.y1 / RH));
  for (let row = y0; row < y1; row++) {
    const y = row * RH, off = H(row, 3, 11) * PL;
    const k0 = Math.floor((r.x0 - off) / PL) - 1, k1 = Math.ceil((r.x1 - off) / PL) + 1;
    for (let k = k0; k <= k1; k++) {
      const x = off + k * PL, hv = H(row, k, 5);
      g.fillStyle = mix(cA, cB, hv); g.fillRect(x, y, PL, RH);
      // grain
      g.strokeStyle = rgba(shade(cB, -0.25), 0.22); g.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const gy = y + 5 + i * 7 + H(row, k * 3 + i, 9) * 3;
        g.beginPath(); g.moveTo(x + 4, gy); g.bezierCurveTo(x + PL * 0.3, gy + 2, x + PL * 0.6, gy - 2, x + PL - 4, gy + 1); g.stroke();
      }
      if (hv > 0.82) { g.fillStyle = rgba(shade(cB, -0.35), 0.5); g.beginPath(); g.ellipse(x + 30 + hv * 90, y + RH / 2, 4, 2.4, 0, 0, TAU); g.fill(); }
      g.fillStyle = rgba('#ffffff', 0.07); g.fillRect(x, y + 1, PL, 2);
      g.fillStyle = rgba(shade(cB, -0.5), 0.55); g.fillRect(x, y, 1.5, RH);
    }
    g.fillStyle = rgba(shade(cB, -0.5), 0.6); g.fillRect(r.x0, y + RH - 1.5, r.x1 - r.x0, 1.5);
  }
}
function floorHerring(g, id, S, r, aw, ah) {
  const [cA, cB] = S.wood.map((c) => tintA(id, c, 0.06));
  const L = 64, W = 16;
  g.fillStyle = cB; g.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
  const i0 = Math.floor(r.x0 / (W * 2)) - 4, i1 = Math.ceil(r.x1 / (W * 2)) + 4;
  const j0 = Math.floor(r.y0 / W) - 6, j1 = Math.ceil(r.y1 / W) + 2;
  for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) {
    const bx = i * W * 2, by = j * W + (i % 2) * 0;
    for (const s of [0, 1]) {
      g.save(); g.translate(bx + s * W, by + (s ? W : 0)); g.rotate(s ? -Math.PI / 4 : Math.PI / 4);
      g.fillStyle = mix(cA, cB, H(i * 2 + s, j, 4)); g.fillRect(0, 0, L * 0.7, W * 0.7);
      g.strokeStyle = rgba(shade(cB, -0.45), 0.45); g.lineWidth = 1; g.strokeRect(0, 0, L * 0.7, W * 0.7);
      g.restore();
    }
  }
}
function floorTile(g, id, S, r, aw, ah) {
  const [cA, cB] = S.tile.map((c) => tintA(id, c, 0.05));
  const T = 56;
  const i0 = Math.floor(r.x0 / T), i1 = Math.ceil(r.x1 / T), j0 = Math.max(0, Math.floor(r.y0 / T)), j1 = Math.ceil(r.y1 / T);
  for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) {
    const x = i * T, y = j * T;
    g.fillStyle = (i + j) % 2 ? cA : mix(cA, cB, 0.6 + H(i, j, 8) * 0.4); g.fillRect(x, y, T, T);
    g.fillStyle = rgba('#ffffff', 0.18); g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + 20, y + 3); g.lineTo(x + 3, y + 20); g.fill();
    g.fillStyle = rgba(shade(cB, -0.3), 0.5); g.fillRect(x, y, T, 1.5); g.fillRect(x, y, 1.5, T);
  }
}
function floorCarpet(g, id, S, r, aw, ah) {
  const [cA, cB] = S.carpet.map((c) => tintA(id, c, 0.06));
  g.fillStyle = cA; g.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
  // soft plush: low-freq blotches + fine speckle
  for (let x = Math.floor(r.x0 / 40) * 40; x < r.x1; x += 40) for (let y = Math.floor(r.y0 / 40) * 40; y < r.y1; y += 40) {
    g.fillStyle = rgba(cB, 0.08 + H(x, y, 2) * 0.14); g.beginPath(); g.ellipse(x + H(x, y, 3) * 40, y + H(x, y, 4) * 40, 30 + H(x, y, 5) * 20, 18 + H(x, y, 6) * 10, 0, 0, TAU); g.fill();
  }
  for (let x = Math.floor(r.x0 / 6) * 6; x < r.x1; x += 6) for (let y = Math.floor(r.y0 / 6) * 6; y < r.y1; y += 6) {
    const h = H(x, y, 7); if (h < 0.5) continue;
    g.fillStyle = h > 0.8 ? rgba('#ffffff', 0.18) : rgba(shade(cB, -0.25), 0.18); g.fillRect(x + h * 4, y + (1 - h) * 4, 1.5, 1.5);
  }
}
function floorGrass(g, id, S, r, aw, ah) {
  const [cA, cB] = S.grass;
  g.fillStyle = cA; g.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
  // mowed stripes
  const SW = 90;
  for (let x = Math.floor(r.x0 / SW) * SW; x < r.x1; x += SW) if (Math.floor(x / SW) % 2) { g.fillStyle = rgba(shade(cA, 0.12), 0.5); g.fillRect(x, r.y0, SW, r.y1 - r.y0); }
  // patches
  for (let x = Math.floor(r.x0 / 64) * 64; x < r.x1; x += 64) for (let y = Math.floor(r.y0 / 64) * 64; y < r.y1; y += 64) {
    g.fillStyle = rgba(cB, 0.25 + H(x, y, 21) * 0.3); g.beginPath(); g.ellipse(x + H(x, y, 22) * 64, y + H(x, y, 23) * 64, 26 + H(x, y, 24) * 22, 14 + H(x, y, 25) * 10, 0, 0, TAU); g.fill();
  }
  // blades
  g.lineWidth = 1.2; g.lineCap = 'round';
  for (let x = Math.floor(r.x0 / 7) * 7; x < r.x1; x += 7) for (let y = Math.floor(r.y0 / 7) * 7; y < r.y1; y += 7) {
    const h = H(x, y, 26); if (h < 0.45) continue;
    const bx = x + H(x, y, 27) * 7, by = y + H(x, y, 28) * 7;
    g.strokeStyle = h > 0.85 ? rgba('#c8e6a0', 0.6) : rgba(shade(cB, -0.2), 0.55);
    g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (h - 0.7) * 4, by - 4 - h * 3); g.stroke();
    if (h > 0.985) { // tiny flowers / clover
      g.fillStyle = H(x, y, 29) > 0.5 ? '#fff6e5' : '#ffd84a'; g.beginPath(); g.arc(bx, by - 2, 1.8, 0, TAU); g.fill();
    }
  }
}
const FLOORS = { wood: floorWood, herring: floorHerring, tile: floorTile, carpet: floorCarpet, grass: floorGrass };

// ------------------------------------------------------------------ wall + decor
function wallPaper(g, id, S, x0, x1, wh) {
  const wall = tintA(id, S.wall, 0.12);
  const gr = g.createLinearGradient(0, -wh, 0, 0); gr.addColorStop(0, shade(wall, 0.06)); gr.addColorStop(1, shade(wall, -0.06));
  g.fillStyle = gr; g.fillRect(x0, -wh, x1 - x0, wh);
  const p = S.paper, a = acc(id);
  if (p === 'stripe') { g.fillStyle = rgba(shade(wall, -0.1), 0.5); for (let x = Math.floor(x0 / 36) * 36; x < x1; x += 36) g.fillRect(x, -wh, 14, wh); }
  else if (p === 'damask') {
    g.fillStyle = rgba(shade(wall, -0.12), 0.6);
    for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) for (let y = -wh + 14; y < -10; y += 34) { const ox = ((y / 34) | 0) % 2 ? 20 : 0; g.beginPath(); g.moveTo(x + ox, y - 7); g.lineTo(x + ox + 5, y); g.lineTo(x + ox, y + 7); g.lineTo(x + ox - 5, y); g.fill(); }
  } else if (p === 'dots') {
    const cols = ['#ff8fb1', '#5aa4e6', '#ffc94a', '#7fd8a6'];
    for (let x = Math.floor(x0 / 30) * 30; x < x1; x += 30) for (let y = -wh + 12; y < -14; y += 26) { g.fillStyle = rgba(cols[((x / 30) + (y / 26 | 0)) & 3], 0.45); g.beginPath(); g.arc(x + ((y / 26 | 0) % 2 ? 15 : 0), y, 3, 0, TAU); g.fill(); }
  } else if (p === 'floral') {
    for (let x = Math.floor(x0 / 46) * 46; x < x1; x += 46) for (let y = -wh + 16; y < -14; y += 38) {
      const cx = x + ((y / 38 | 0) % 2 ? 23 : 0);
      g.fillStyle = rgba(a, 0.28); for (let k = 0; k < 5; k++) { const an = k * TAU / 5; g.beginPath(); g.arc(cx + Math.cos(an) * 3.5, y + Math.sin(an) * 3.5, 2.6, 0, TAU); g.fill(); }
      g.fillStyle = rgba('#7cc26a', 0.35); g.beginPath(); g.ellipse(cx + 7, y + 6, 4, 1.6, 0.6, 0, TAU); g.fill();
    }
  } else if (p === 'subway') {
    const top = -wh * 0.55; g.fillStyle = '#fbfaf6'; g.fillRect(x0, top, x1 - x0, -top - 12);
    g.strokeStyle = rgba('#c9c2b2', 0.8); g.lineWidth = 1;
    for (let y = top, row = 0; y < -12; y += 12, row++) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); for (let x = Math.floor(x0 / 30) * 30 + (row % 2) * 15; x < x1; x += 30) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 12); g.stroke(); } }
  } else if (p === 'wainscot' || p === 'beadboard') {
    const top = -wh * 0.45, panel = p === 'wainscot' ? '#fffaf2' : '#f6fbff';
    g.fillStyle = panel; g.fillRect(x0, top, x1 - x0, -top);
    if (p === 'wainscot') { g.strokeStyle = rgba('#c9bfa8', 0.8); g.lineWidth = 1.5; for (let x = Math.floor(x0 / 80) * 80; x < x1; x += 80) g.strokeRect(x + 8, top + 10, 64, -top - 28); }
    else { g.strokeStyle = rgba('#b8c8d2', 0.7); g.lineWidth = 1; for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) { g.beginPath(); g.moveTo(x, top); g.lineTo(x, 0); g.stroke(); } }
    g.fillStyle = shade(panel, -0.08); g.fillRect(x0, top - 5, x1 - x0, 6); g.fillStyle = '#ffffff'; g.fillRect(x0, top - 5, x1 - x0, 2);
  }
  // crown molding + baseboard
  g.fillStyle = S.trim; g.fillRect(x0, -wh, x1 - x0, 7); g.fillStyle = rgba(INK, 0.12); g.fillRect(x0, -wh + 7, x1 - x0, 3);
  g.fillStyle = S.trim; g.fillRect(x0, -14, x1 - x0, 14); g.fillStyle = rgba('#ffffff', 0.7); g.fillRect(x0, -14, x1 - x0, 2);
  g.fillStyle = rgba(INK, 0.15); g.fillRect(x0, -2, x1 - x0, 2);
}
function siding(g, id, S, x0, x1, wh) {
  // house exterior for the backyard: clapboard + gutter + foundation
  g.fillStyle = '#dfe5ea'; g.fillRect(x0, -wh, x1 - x0, wh);
  for (let y = -wh + 18; y < -12; y += 11) { g.fillStyle = rgba('#9aa6b2', 0.55); g.fillRect(x0, y, x1 - x0, 1.6); g.fillStyle = rgba('#ffffff', 0.5); g.fillRect(x0, y + 1.6, x1 - x0, 1); }
  g.fillStyle = '#5a6370'; g.fillRect(x0, -wh, x1 - x0, 12); g.fillStyle = '#7a8492'; g.fillRect(x0, -wh + 12, x1 - x0, 4);
  g.fillStyle = '#a89c8c'; g.fillRect(x0, -14, x1 - x0, 14);
  for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) { g.fillStyle = rgba('#7a6e60', 0.5); g.fillRect(x, -14, 1.5, 14); }
  // stone patio strip along the house
  for (let x = Math.floor(x0 / 52) * 52; x < x1; x += 52) for (let row = 0; row < 2; row++) {
    const px = x + (row ? 26 : 0), py = row * 30 + 2;
    g.fillStyle = mix('#cbbfa8', '#b8ab92', H(px, py, 31)); rrect(g, px + 2, py, 48, 27, 5); g.fill();
    g.fillStyle = rgba('#ffffff', 0.18); g.fillRect(px + 5, py + 3, 30, 2);
  }
}
function farBank(g, id, S, x0, x1, wh) {
  // pond: a hedge + picket fence + tree canopy far bank
  const sky = g.createLinearGradient(0, -wh, 0, -wh * 0.4); sky.addColorStop(0, '#9fd0ec'); sky.addColorStop(1, '#cfe8f2');
  g.fillStyle = sky; g.fillRect(x0, -wh, x1 - x0, wh);
  for (let x = Math.floor(x0 / 70) * 70 - 70; x < x1 + 70; x += 70) { const h = H(x, 1, 41); g.fillStyle = mix('#3f7a4a', '#4f9a52', h); g.beginPath(); g.arc(x + 35, -wh + 26 + h * 14, 40 + h * 14, 0, TAU); g.fill(); }
  g.fillStyle = '#f4efe2'; for (let x = Math.floor(x0 / 15) * 15; x < x1; x += 15) { g.beginPath(); g.moveTo(x, -18); g.lineTo(x, -62); g.lineTo(x + 5, -68); g.lineTo(x + 10, -62); g.lineTo(x + 10, -18); g.fill(); }
  g.fillStyle = '#e9e2d0'; g.fillRect(x0, -56, x1 - x0, 5); g.fillRect(x0, -34, x1 - x0, 5);
  for (let x = Math.floor(x0 / 22) * 22; x < x1; x += 22) { const h = H(x, 2, 42); g.fillStyle = mix('#5fae5c', '#7cc26a', h); g.beginPath(); g.arc(x + 11, -16 + h * 4, 16 + h * 6, Math.PI, TAU); g.fill(); }
  g.fillStyle = '#5fae5c'; g.fillRect(x0, -16, x1 - x0, 16);
}

function windowAt(g, id, x, wh, o = {}) {
  const w = o.w ?? 104, h = 68, top = -wh + 20;
  const a = acc(id);
  // light patch on the floor (sunbeam)
  g.fillStyle = rgba('#fff2c8', 0.16);
  g.beginPath(); g.moveTo(x - w / 2 + 6, 0); g.lineTo(x + w / 2 - 6, 0); g.lineTo(x + w / 2 + 40, 120); g.lineTo(x - w / 2 + 30, 120); g.closePath(); g.fill();
  g.fillStyle = shade(WOOD.light, 0.3); rrect(g, x - w / 2 - 6, top - 6, w + 12, h + 12, 3); g.fill();
  const sky = g.createLinearGradient(0, top, 0, top + h); sky.addColorStop(0, '#8fc8ee'); sky.addColorStop(1, '#d8f0ff');
  g.fillStyle = sky; g.fillRect(x - w / 2, top, w, h);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x - w * 0.2, top + 18, 7, 0, TAU); g.arc(x - w * 0.1, top + 15, 9, 0, TAU); g.arc(x, top + 19, 6, 0, TAU); g.fill();
  g.fillStyle = '#6aa64f'; g.beginPath(); g.arc(x + w * 0.3, top + h + 6, 22, Math.PI, TAU); g.fill(); g.fillStyle = '#5a9a44'; g.beginPath(); g.arc(x + w * 0.05, top + h + 10, 18, Math.PI, TAU); g.fill();
  g.fillStyle = rgba('#ffffff', 0.35); g.beginPath(); g.moveTo(x - w / 2 + 4, top); g.lineTo(x - w / 2 + 22, top); g.lineTo(x - w / 2 + 4, top + 30); g.fill();
  g.fillStyle = shade(WOOD.light, 0.3); g.fillRect(x - 2, top, 4, h); g.fillRect(x - w / 2, top + h / 2 - 2, w, 4);
  g.fillStyle = shade(WOOD.light, 0.1); g.fillRect(x - w / 2 - 10, top + h + 4, w + 20, 6);
  // curtains
  const cc = mix(a, '#ffffff', 0.25);
  for (const s of [-1, 1]) {
    g.fillStyle = cc; g.beginPath(); const cx = x + s * (w / 2 + 2);
    g.moveTo(cx - s * 2, top - 12); g.lineTo(cx + s * 16, top - 12); g.quadraticCurveTo(cx + s * 12, top + h * 0.6, cx + s * 18, top + h + 14); g.lineTo(cx - s * 6, top + h + 14); g.quadraticCurveTo(cx - s * 14, top + h * 0.5, cx - s * 2, top - 12); g.fill();
    g.strokeStyle = rgba(shade(cc, -0.25), 0.6); g.lineWidth = 1; for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(cx + s * k * 5, top - 10); g.lineTo(cx + s * (k * 5 + 1), top + h + 12); g.stroke(); }
  }
  g.fillStyle = WOOD.walnut; g.fillRect(x - w / 2 - 22, top - 15, w + 44, 4);
}
function frame(g, x, y, w, h, art) {
  g.fillStyle = rgba(INK, 0.15); g.fillRect(x - w / 2 + 3, y + 3, w, h);
  g.fillStyle = WOOD.walnut; g.fillRect(x - w / 2, y, w, h);
  g.fillStyle = CREAM; g.fillRect(x - w / 2 + 4, y + 4, w - 8, h - 8);
  const ix = x - w / 2 + 7, iy = y + 7, iw = w - 14, ih = h - 14;
  g.save(); g.beginPath(); g.rect(ix, iy, iw, ih); g.clip();
  if (art === 'mountains') {
    g.fillStyle = '#bfe3ff'; g.fillRect(ix, iy, iw, ih); g.fillStyle = '#5b7fa6'; g.beginPath(); g.moveTo(ix, iy + ih); g.lineTo(ix + iw * 0.35, iy + ih * 0.3); g.lineTo(ix + iw * 0.6, iy + ih * 0.7); g.lineTo(ix + iw * 0.8, iy + ih * 0.4); g.lineTo(ix + iw, iy + ih); g.fill();
    g.fillStyle = '#ffc94a'; g.beginPath(); g.arc(ix + iw * 0.8, iy + ih * 0.25, 4, 0, TAU); g.fill();
  } else if (art === 'sea') {
    g.fillStyle = '#d8f0ff'; g.fillRect(ix, iy, iw, ih); g.fillStyle = '#4f8fb3'; g.fillRect(ix, iy + ih * 0.55, iw, ih); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(ix + iw * 0.5, iy + ih * 0.2); g.lineTo(ix + iw * 0.5, iy + ih * 0.55); g.lineTo(ix + iw * 0.7, iy + ih * 0.55); g.fill();
  } else if (art === 'bread') {
    g.fillStyle = '#f6e7c8'; g.fillRect(ix, iy, iw, ih); g.fillStyle = '#c47a3a'; g.beginPath(); g.ellipse(ix + iw / 2, iy + ih * 0.6, iw * 0.35, ih * 0.28, 0, 0, TAU); g.fill();
    g.strokeStyle = '#8a4e22'; g.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(ix + iw / 2 + i * 7 - 4, iy + ih * 0.5); g.lineTo(ix + iw / 2 + i * 7 + 4, iy + ih * 0.7); g.stroke(); }
  } else if (art === 'heart') {
    g.fillStyle = '#fff3dc'; g.fillRect(ix, iy, iw, ih); g.fillStyle = '#ff8fb1'; const cx = ix + iw / 2, cy = iy + ih / 2, s = Math.min(iw, ih) * 0.22;
    g.beginPath(); g.moveTo(cx, cy + s); g.bezierCurveTo(cx - s * 2, cy - s * 0.5, cx - s, cy - s * 2, cx, cy - s * 0.6); g.bezierCurveTo(cx + s, cy - s * 2, cx + s * 2, cy - s * 0.5, cx, cy + s); g.fill();
  } else { // abstract warm
    const cols = ['#f29f2e', '#e98aa8', '#7fd8a6', '#5aa4e6', '#ffc94a'];
    g.fillStyle = '#fff6e5'; g.fillRect(ix, iy, iw, ih);
    for (let i = 0; i < 5; i++) { g.fillStyle = rgba(cols[i], 0.85); g.beginPath(); g.arc(ix + iw * (0.15 + i * 0.18), iy + ih * (0.3 + (i % 2) * 0.35), ih * 0.28, 0, TAU); g.fill(); }
  }
  g.restore();
}
function decor(g, id, S, kind, fx, o, aw, wh, lights) {
  const x = fx * aw, top = -wh + 20;
  switch (kind) {
    case 'window': windowAt(g, id, x, wh, o); break;
    case 'house_window': {
      g.fillStyle = '#ffffff'; g.fillRect(x - 46, -wh + 26, 92, 62);
      const gl = g.createLinearGradient(0, -wh + 30, 0, -wh + 84); gl.addColorStop(0, '#ffe7a8'); gl.addColorStop(1, '#ffc96a');
      g.fillStyle = gl; g.fillRect(x - 40, -wh + 32, 80, 50);
      g.fillStyle = '#ffffff'; g.fillRect(x - 2, -wh + 32, 4, 50); g.fillRect(x - 40, -wh + 55, 80, 4);
      g.fillStyle = '#4a6b94'; g.fillRect(x - 58, -wh + 26, 12, 62); g.fillRect(x + 46, -wh + 26, 12, 62);
      g.fillStyle = '#c96f4a'; g.fillRect(x - 44, -wh + 90, 88, 10); for (let i = 0; i < 6; i++) { g.fillStyle = ['#ff8fb1', '#ffc94a', '#fff6e5'][i % 3]; g.beginPath(); g.arc(x - 36 + i * 14, -wh + 88, 4, 0, TAU); g.fill(); }
      break;
    }
    case 'back_door': {
      g.fillStyle = '#ffffff'; g.fillRect(x - 40, -wh + 18, 80, wh - 30);
      g.fillStyle = '#4a6b94'; g.fillRect(x - 34, -wh + 24, 68, wh - 36);
      g.fillStyle = '#ffe2a0'; g.fillRect(x - 28, -wh + 30, 56, 40);
      g.fillStyle = '#4a6b94'; g.fillRect(x - 1, -wh + 30, 2, 40);
      g.fillStyle = '#ffc94a'; g.beginPath(); g.arc(x + 24, -wh + 80, 3, 0, TAU); g.fill();
      g.fillStyle = '#a8483a'; rrect(g, x - 34, -14, 68, 12, 3); g.fill(); g.fillStyle = '#fff6e5'; g.font = 'bold 8px sans-serif'; g.textAlign = 'center'; g.fillText('WELCOME', x, -5);
      lights.push({ x: x + 50, y: -wh + 40, r: 26, c: LAMP });
      break;
    }
    case 'clock': {
      const y = -wh + 44; g.fillStyle = WOOD.walnut; g.beginPath(); g.arc(x, y, 15, 0, TAU); g.fill(); g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill();
      g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 8); g.moveTo(x, y); g.lineTo(x + 6, y + 2); g.stroke();
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.fillStyle = INK; g.fillRect(x + Math.cos(a) * 10 - 0.6, y + Math.sin(a) * 10 - 0.6, 1.2, 1.2); }
      break;
    }
    case 'sconce': {
      const y = -wh + 50; g.fillStyle = '#c4a24a'; g.fillRect(x - 2, y, 4, 14); g.fillStyle = '#fff3dc'; g.beginPath(); g.moveTo(x - 9, y + 2); g.lineTo(x + 9, y + 2); g.lineTo(x + 6, y - 12); g.lineTo(x - 6, y - 12); g.fill();
      lights.push({ x, y: y - 4, r: 46, c: LAMP });
      break;
    }
    case 'whiteboard': {
      const w = 170, h = 74, y = top - 2;
      g.fillStyle = '#c4c8d0'; g.fillRect(x - w / 2 - 4, y - 4, w + 8, h + 8); g.fillStyle = '#fbfcfd'; g.fillRect(x - w / 2, y, w, h);
      g.font = '9px monospace'; g.textAlign = 'left';
      const lines = [['PartyPlanner.exe  TODO', '#2b2f3a'], ['[x] init()', '#3fa874'], ['[ ] make_snacks()', '#5b7fa6'], ['[ ] clean_up()', '#5b7fa6'], ['[ ] decorate()  7PM!!', '#a8483a']];
      lines.forEach(([s, c], i) => { g.fillStyle = c; g.fillText(s, x - w / 2 + 8, y + 14 + i * 13); });
      g.strokeStyle = '#a8483a'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x + 52, y + 63, 22, 7, 0, 0, TAU); g.stroke();
      g.fillStyle = '#9aa0ab'; g.fillRect(x - 30, y + h + 2, 60, 4); g.fillStyle = '#ff5d5d'; g.fillRect(x - 20, y + h, 10, 3); g.fillStyle = '#5aa4e6'; g.fillRect(x - 6, y + h, 10, 3);
      break;
    }
    case 'pennant': { // Marching Ravens nod (purple + gold)
      const y = top + 6; g.fillStyle = '#4b2a7a'; g.beginPath(); g.moveTo(x - 40, y); g.lineTo(x + 46, y + 14); g.lineTo(x - 40, y + 30); g.fill();
      g.fillStyle = '#c4a24a'; g.fillRect(x - 44, y - 3, 5, 36);
      g.fillStyle = '#ffd84a'; g.font = 'bold 9px sans-serif'; g.textAlign = 'left'; g.fillText('RAVENS', x - 32, y + 18);
      frame(g, x + 4, y + 40, 34, 26, 'mountains');
      break;
    }
    case 'sign_bread': {
      const y = top; g.fillStyle = WOOD.mid; rrect(g, x - 56, y, 112, 34, 6); g.fill(); g.fillStyle = WOOD.light; rrect(g, x - 52, y + 4, 104, 26, 4); g.fill();
      g.fillStyle = WOOD.deep; g.font = 'bold 13px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.fillText('fresh bread', x, y + 22);
      frame(g, x, y + 38, 36, 28, 'bread');
      break;
    }
    case 'pot_rail': {
      const y = top + 4; g.fillStyle = '#9aa0ab'; g.fillRect(x - 70, y, 140, 3);
      const pots = [['#c4c8d0', 12], ['#b5835a', 15], ['#a8483a', 11], ['#c4c8d0', 9], ['#2b2f3a', 13]];
      pots.forEach(([c, r], i) => { const px = x - 56 + i * 28; g.strokeStyle = '#555c6b'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, y + 3); g.lineTo(px, y + 12); g.stroke(); g.fillStyle = c; g.beginPath(); g.arc(px, y + 12 + r, r, 0, TAU); g.fill(); g.fillStyle = rgba('#ffffff', 0.25); g.beginPath(); g.arc(px - r * 0.3, y + 12 + r * 0.7, r * 0.35, 0, TAU); g.fill(); });
      break;
    }
    case 'gallery': {
      frame(g, x - 70, top + 4, 54, 40, 'mountains'); frame(g, x - 4, top - 4, 44, 56, 'abstract'); frame(g, x + 60, top + 8, 50, 36, 'heart');
      // floating shelf with candles + plant
      g.fillStyle = WOOD.walnut; g.fillRect(x - 70, top + 66, 140, 5);
      g.fillStyle = '#fff6e5'; g.fillRect(x - 50, top + 56, 7, 10); g.fillRect(x - 40, top + 52, 7, 14);
      g.fillStyle = '#c96f4a'; g.fillRect(x + 30, top + 56, 12, 10); g.fillStyle = '#5fae5c'; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(x + 30 + i * 4, top + 52 + (i % 2) * 2, 3, 7, (i - 1.5) * 0.4, 0, TAU); g.fill(); }
      lights.push({ x: x - 45, y: top + 50, r: 18, c: '#ffd98a' });
      break;
    }
    case 'painting': frame(g, x, top + (o.y ?? 2), o.w ?? 120, o.h ?? 60, o.art ?? 'abstract'); break;
    case 'frame_pair': frame(g, x - 40, top + 6, 56, 44, 'heart'); frame(g, x + 34, top + 2, 46, 52, 'abstract'); break;
    case 'hoop': { // Victoria's crochet hoop art
      const y = top + 30; g.strokeStyle = WOOD.light; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 18, 0, TAU); g.stroke();
      g.fillStyle = '#fff3dc'; g.beginPath(); g.arc(x, y, 16, 0, TAU); g.fill();
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.fillStyle = ['#ff8fb1', '#7fd8a6', '#ffc94a'][i % 3]; g.beginPath(); g.arc(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 4, 0, TAU); g.fill(); }
      g.fillStyle = '#5aa4e6'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill();
      break;
    }
    case 'chalkboard': {
      const w = 160, h = 72, y = top - 2;
      g.fillStyle = WOOD.mid; g.fillRect(x - w / 2 - 5, y - 5, w + 10, h + 10); g.fillStyle = '#2f4a3a'; g.fillRect(x - w / 2, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = 'bold 13px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.fillText('GAME NIGHT', x, y + 22);
      g.font = '10px "Trebuchet MS", sans-serif'; g.fillText('A + V  vs  everyone', x, y + 40);
      g.fillStyle = '#ffc94a'; g.fillText('★ ★ ★', x, y + 58);
      g.fillStyle = '#fff'; g.fillRect(x + 50, y + h + 1, 10, 3); g.fillStyle = '#ff8fb1'; g.fillRect(x + 64, y + h + 1, 8, 3);
      break;
    }
    case 'stars': { g.fillStyle = rgba('#ffc94a', 0.7); for (let i = 0; i < 6; i++) { const sx = x + (i - 3) * 60 + H(i, 1, 51) * 30, sy = top + 6 + H(i, 2, 52) * 60; star(g, sx, sy, 5); } break; }
    case 'bunting': {
      const cols = ['#ff5d5d', '#ffc94a', '#7fd8a6', '#5aa4e6', '#c9a0dc'];
      g.strokeStyle = '#8a7a5a'; g.lineWidth = 1; g.beginPath();
      for (let x2 = 0; x2 <= aw; x2 += 4) g.lineTo(x2, -wh + 14 + Math.sin(x2 / 120 * Math.PI) ** 2 * 10);
      g.stroke();
      for (let x2 = 10, i = 0; x2 < aw - 10; x2 += 26, i++) { const y = -wh + 14 + Math.sin(x2 / 120 * Math.PI) ** 2 * 10; g.fillStyle = cols[i % 5]; g.beginPath(); g.moveTo(x2 - 8, y); g.lineTo(x2 + 8, y); g.lineTo(x2, y + 16); g.fill(); }
      break;
    }
    case 'cabinets': { // upper kitchen cabinets across a fraction of the wall
      const w = (o.w ?? 0.3) * aw, y = -wh + 12, hh = 52;
      g.fillStyle = rgba(INK, 0.15); g.fillRect(x - w / 2 + 3, y + 3, w, hh);
      g.fillStyle = tintA(id, '#f1eadb', 0.12); g.fillRect(x - w / 2, y, w, hh);
      const n = Math.max(2, Math.round(w / 48)), dw = w / n;
      for (let i = 0; i < n; i++) {
        const dx = x - w / 2 + i * dw;
        g.strokeStyle = rgba('#b5a88c', 0.9); g.lineWidth = 1.5; g.strokeRect(dx + 4, y + 4, dw - 8, hh - 8);
        if (i % 3 === 1) { g.fillStyle = rgba('#cfe6f2', 0.7); g.fillRect(dx + 8, y + 8, dw - 16, hh - 16); g.fillStyle = '#fbfaf6'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(dx + 14 + k * (dw - 28) / 2, y + hh - 16, 5, 0, TAU); g.fill(); } }
        g.fillStyle = '#b9a37a'; g.fillRect(dx + (i % 2 ? 8 : dw - 11), y + hh - 16, 3, 9);
      }
      g.fillStyle = shade('#f1eadb', -0.1); g.fillRect(x - w / 2 - 3, y + hh, w + 6, 4);
      g.fillStyle = rgba(LAMP, 0.25); g.fillRect(x - w / 2, y + hh + 4, w, 6); // under-cabinet light
      break;
    }
    case 'towel_hook': {
      const y = top + 14; g.fillStyle = '#c4c8d0'; g.fillRect(x - 24, y, 48, 4);
      g.fillStyle = '#e98aa8'; rrect(g, x - 18, y + 4, 16, 40, 3); g.fill(); g.fillStyle = '#fff6e5'; rrect(g, x + 2, y + 4, 16, 34, 3); g.fill();
      g.fillStyle = rgba('#ffffff', 0.5); g.fillRect(x - 18, y + 34, 16, 3);
      break;
    }
  }
}
function star(g, x, y, r) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }

// ------------------------------------------------------------------ side + front walls / outside
function walls(g, id, S, aw, ah, wh, r) {
  const outdoor = S.outdoor;
  if (outdoor === 'yard') {
    // picket fence on the sides + front, hedges beyond
    g.fillStyle = '#4f8a43'; g.fillRect(-MARGIN, -wh, MARGIN, ah + wh + MARGIN); g.fillRect(aw, -wh, MARGIN, ah + wh + MARGIN); g.fillRect(-MARGIN, ah, aw + MARGIN * 2, MARGIN);
    for (const sx of [0, aw - SIDE]) {
      g.fillStyle = 'rgba(16,19,31,0.15)'; g.fillRect(sx + (sx ? -6 : SIDE), 0, 6, ah);
      for (let y = Math.max(0, Math.floor(r.y0 / 14) * 14); y < Math.min(ah, r.y1); y += 14) { g.fillStyle = '#f4efe2'; rrect(g, sx + 4, y + 1, SIDE - 8, 11, 3); g.fill(); g.strokeStyle = '#c9bfa8'; g.lineWidth = 1; g.stroke(); }
      g.fillStyle = '#e9e2d0'; g.fillRect(sx + 8, 0, 4, ah); g.fillRect(sx + SIDE - 12, 0, 4, ah);
    }
    g.fillStyle = 'rgba(16,19,31,0.15)'; g.fillRect(0, ah - FRONT - 6, aw, 6);
    for (let x = Math.max(0, Math.floor(r.x0 / 15) * 15); x < Math.min(aw, r.x1); x += 15) { g.fillStyle = '#f4efe2'; g.fillRect(x + 2, ah - FRONT, 10, FRONT); g.strokeStyle = '#c9bfa8'; g.strokeRect(x + 2, ah - FRONT, 10, FRONT); }
    return;
  }
  if (outdoor === 'bank') {
    g.fillStyle = '#3f7a4a'; g.fillRect(-MARGIN, -wh, MARGIN, ah + wh + MARGIN); g.fillRect(aw, -wh, MARGIN, ah + wh + MARGIN); g.fillRect(-MARGIN, ah, aw + MARGIN * 2, MARGIN);
    const bush = (bx, by, s) => { const h = H(bx, by, 61); g.fillStyle = mix('#3f7a4a', '#5fae5c', h); g.beginPath(); g.arc(bx, by, s * (0.8 + h * 0.4), 0, TAU); g.fill(); g.fillStyle = rgba('#7cc26a', 0.6); g.beginPath(); g.arc(bx - s * 0.3, by - s * 0.3, s * 0.4, 0, TAU); g.fill(); };
    for (let y = -10; y < ah + 20; y += 26) { bush(SIDE * 0.4, y, 20); bush(aw - SIDE * 0.4, y + 13, 20); }
    for (let x = 0; x < aw; x += 28) bush(x, ah - 2, 18);
    return;
  }
  const cap = S.cap, capL = shade(cap, 0.25);
  const out = '#1e1a22';
  g.fillStyle = out; g.fillRect(-MARGIN, -wh - MARGIN, MARGIN, ah + wh + MARGIN * 2); g.fillRect(aw, -wh - MARGIN, MARGIN, ah + wh + MARGIN * 2);
  g.fillRect(-MARGIN, ah, aw + MARGIN * 2, MARGIN); g.fillRect(-MARGIN, -wh - MARGIN, aw + MARGIN * 2, MARGIN - 18);
  // top cap over the back wall
  g.fillStyle = cap; g.fillRect(-2, -wh - 18, aw + 4, 18); g.fillStyle = capL; g.fillRect(-2, -wh - 3, aw + 4, 3);
  // side caps (inside the arena edge) + contact shadow on the floor
  for (const [sx, inner] of [[0, SIDE], [aw - SIDE, aw - SIDE]]) {
    g.fillStyle = cap; g.fillRect(sx, -wh - 18, SIDE, ah + wh + 18);
    g.fillStyle = capL; g.fillRect(sx === 0 ? SIDE - 3 : sx, -wh - 3, 3, ah + wh + 3);
  }
  const sh = g.createLinearGradient(SIDE, 0, SIDE + 22, 0); sh.addColorStop(0, rgba(INK, 0.22)); sh.addColorStop(1, rgba(INK, 0));
  g.fillStyle = sh; g.fillRect(SIDE, 0, 22, ah);
  const sh2 = g.createLinearGradient(aw - SIDE, 0, aw - SIDE - 22, 0); sh2.addColorStop(0, rgba(INK, 0.22)); sh2.addColorStop(1, rgba(INK, 0));
  g.fillStyle = sh2; g.fillRect(aw - SIDE - 22, 0, 22, ah);
  // back-wall contact shadow
  const sh3 = g.createLinearGradient(0, 0, 0, 26); sh3.addColorStop(0, rgba(INK, 0.25)); sh3.addColorStop(1, rgba(INK, 0));
  g.fillStyle = sh3; g.fillRect(SIDE, 0, aw - SIDE * 2, 26);
  // front cap
  g.fillStyle = cap; g.fillRect(0, ah - FRONT, aw, FRONT + 2); g.fillStyle = capL; g.fillRect(0, ah - FRONT, aw, 3);
  // a doorway gap in the front wall (where the hero came in)
  g.fillStyle = shade(S.wood?.[0] ?? S.tile?.[0] ?? S.carpet?.[0] ?? '#b98a5c', -0.15); g.fillRect(aw / 2 - 50, ah - FRONT + 3, 100, FRONT);
  g.fillStyle = S.trim; g.fillRect(aw / 2 - 56, ah - FRONT, 6, FRONT + 2); g.fillRect(aw / 2 + 50, ah - FRONT, 6, FRONT + 2);
}

// ------------------------------------------------------------------ haywire decals (static layer)
function weirdDecals(g, id, S, aw, ah, wh, r) {
  const R = rng(9000 + id.length * 31 + aw * 7 + ah);
  const pts = (n) => Array.from({ length: n }, () => ({ x: SIDE + 20 + R() * (aw - SIDE * 2 - 40), y: 20 + R() * (ah - 60), a: R() * TAU, s: 0.7 + R() * 0.6, k: R() }));
  const area = (aw * ah) / 100000 * 0.2;
  const vis = (p, pad = 60) => p.x > r.x0 - pad && p.x < r.x1 + pad && p.y > r.y0 - pad && p.y < r.y1 + pad;
  const a = acc(id);
  switch (S.weird) {
    case 'glitch': {
      g.font = '12px monospace'; g.textAlign = 'center';
      const glyphs = ['{ }', '0x1F', '404', ';', '=>', 'NaN', '</>', 'null', '01101', 'undefined', '[ ]', 'ERR'];
      for (const p of pts(Math.round(40 * area))) { if (!vis(p)) continue; g.fillStyle = rgba(PALETTE.mint, 0.35 + p.k * 0.3); g.fillText(glyphs[Math.floor(p.k * glyphs.length)], p.x, p.y); }
      for (const p of pts(Math.round(10 * area))) { if (!vis(p, 120)) continue; g.strokeStyle = p.k > 0.5 ? '#2b2f3a' : '#5a5f6b'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(p.x, p.y); g.bezierCurveTo(p.x + 40, p.y - 30 * p.s, p.x + 60, p.y + 40, p.x + 110 * p.s, p.y + 10); g.stroke(); g.fillStyle = '#c4c8d0'; g.fillRect(p.x + 110 * p.s - 3, p.y + 7, 7, 6); }
      for (const p of pts(Math.round(12 * area))) { if (!vis(p)) continue; g.save(); g.translate(p.x, p.y); g.rotate(p.a * 0.3); g.fillStyle = '#fbfaf6'; g.fillRect(-9, -11, 18, 22); g.fillStyle = rgba(INK, 0.35); for (let i = 0; i < 5; i++) g.fillRect(-6, -7 + i * 4, 6 + p.k * 6, 1); g.restore(); }
      // green glitch marks across the wall
      for (let i = 0; i < Math.round(aw / 90); i++) { g.fillStyle = rgba(PALETTE.mint, 0.25 + R() * 0.2); g.fillRect(R() * aw, -wh + R() * (wh - 20), 20 + R() * 80, 2 + R() * 4); }
      break;
    }
    case 'dough': {
      for (const p of pts(Math.round(18 * area))) { if (!vis(p)) continue; splat(g, p.x, p.y, 14 * p.s, '#f3e3c3', p.k); }
      for (const p of pts(Math.round(6 * area))) { if (!vis(p)) continue; g.fillStyle = rgba('#ffffff', 0.3); g.beginPath(); g.ellipse(p.x, p.y, 30 * p.s, 16 * p.s, p.a, 0, TAU); g.fill(); g.fillStyle = rgba('#ffffff', 0.5); for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(p.x + (R() - 0.5) * 50, p.y + (R() - 0.5) * 24, 1 + R() * 1.5, 0, TAU); g.fill(); } }
      for (let i = 0; i < Math.round(aw / 140); i++) { const x = R() * aw, y = -wh + 30 + R() * 60; splat(g, x, y, 9, '#f3e3c3', R()); g.fillStyle = '#f3e3c3'; g.fillRect(x - 2, y, 4, 12 + R() * 16); }
      break;
    }
    case 'dust': {
      for (const p of pts(Math.round(24 * area))) { if (!vis(p)) continue; fluff(g, p.x, p.y, 7 * p.s, R); }
      for (const p of pts(Math.round(4 * area))) { if (!vis(p, 300)) continue; g.strokeStyle = rgba('#5a4a3a', 0.12); g.lineWidth = 7; g.setLineDash([10, 8]); for (const o of [-22, 22]) { g.beginPath(); g.arc(p.x, p.y + o, 160 * p.s, p.a, p.a + 1.6); g.stroke(); } g.setLineDash([]); }
      break;
    }
    case 'shards': {
      for (const p of pts(Math.round(16 * area))) { if (!vis(p)) continue; g.fillStyle = rgba('#7a1f3a', 0.35); g.beginPath(); g.ellipse(p.x, p.y, 26 * p.s, 13 * p.s, p.a * 0.2, 0, TAU); g.fill(); }
      for (const p of pts(Math.round(30 * area))) { if (!vis(p)) continue; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = '#fbfaf6'; g.beginPath(); g.moveTo(0, 0); g.lineTo(10 * p.s, 2); g.lineTo(4, 8 * p.s); g.closePath(); g.fill(); g.strokeStyle = rgba('#5b7fa6', 0.8); g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(10 * p.s, 2); g.stroke(); g.restore(); }
      for (const p of pts(Math.round(6 * area))) { if (!vis(p)) continue; g.fillStyle = mix('#e98aa8', '#ffffff', 0.4); g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillRect(-10, -10, 20, 20); g.restore(); }
      break;
    }
    case 'cards': {
      const suits = ['♠', '♥', '♦', '♣'];
      for (const p of pts(Math.round(34 * area))) {
        if (!vis(p)) continue; g.save(); g.translate(p.x, p.y); g.rotate(p.a);
        if (p.k < 0.7) { g.fillStyle = '#fff'; rrect(g, -8, -11, 16, 22, 2); g.fill(); g.strokeStyle = rgba(INK, 0.3); g.lineWidth = 1; g.stroke(); g.fillStyle = p.k < 0.35 ? '#ff5d5d' : INK; g.font = '11px serif'; g.textAlign = 'center'; g.fillText(suits[Math.floor(p.k * 5.7) % 4], 0, 4); }
        else if (p.k < 0.85) { g.fillStyle = '#fff'; rrect(g, -6, -6, 12, 12, 2); g.fill(); g.fillStyle = INK; for (const [dx, dy] of [[-3, -3], [3, 3], [0, 0]]) { g.beginPath(); g.arc(dx, dy, 1.3, 0, TAU); g.fill(); } }
        else { g.fillStyle = ['#7fd8a6', '#ffc94a', '#5aa4e6'][Math.floor(p.k * 30) % 3]; g.fillRect(-7, -5, 14, 10); g.beginPath(); g.arc(7, 0, 3, 0, TAU); g.fill(); }
        g.restore();
      }
      break;
    }
    case 'socks': {
      const cols = ['#ff8fb1', '#5aa4e6', '#ffc94a', '#7fd8a6', '#c9a0dc', '#fff3dc', '#8d95a3'];
      for (const p of pts(Math.round(30 * area))) { if (!vis(p)) continue; sock(g, p.x, p.y, p.a, cols[Math.floor(p.k * 7)], cols[Math.floor(p.k * 49) % 7], p.s); }
      for (const p of pts(Math.round(6 * area))) { if (!vis(p)) continue; g.fillStyle = cols[Math.floor(p.k * 7)]; g.save(); g.translate(p.x, p.y); g.rotate(p.a); rrect(g, -18, -12, 36, 24, 8); g.fill(); g.fillRect(-26, -12, 10, 10); g.fillRect(16, -12, 10, 10); g.restore(); }
      break;
    }
    case 'flood': {
      for (const p of pts(Math.round(12 * area))) { if (!vis(p, 120)) continue; puddle(g, p.x, p.y, 50 * p.s, 22 * p.s); }
      for (let i = 0; i < Math.round(aw / 160); i++) { // ceiling stains + drips down the wall
        const x = SIDE + 40 + R() * (aw - SIDE * 2 - 80); g.fillStyle = rgba('#8a7a5a', 0.25); g.beginPath(); g.ellipse(x, -wh + 14, 30 + R() * 30, 10, 0, 0, TAU); g.fill();
        g.strokeStyle = rgba('#8a7a5a', 0.35); g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, -wh + 14, 22, 7, 0, 0, TAU); g.stroke();
        g.fillStyle = rgba('#6fb7e8', 0.35); g.fillRect(x - 1.5, -wh + 18, 3, 30 + R() * 50);
      }
      break;
    }
    case 'jungle': {
      for (const p of pts(Math.round(20 * area))) { if (!vis(p, 80)) continue; weeds(g, p.x, p.y, p.s, R); }
      for (const p of pts(Math.round(8 * area))) { if (!vis(p, 200)) continue; g.strokeStyle = '#3f7a4a'; g.lineWidth = 4; g.beginPath(); g.moveTo(p.x, p.y); g.bezierCurveTo(p.x + 50, p.y - 40, p.x + 90, p.y + 40, p.x + 150 * p.s, p.y); g.stroke(); for (let i = 0; i < 6; i++) { const t = i / 6; g.fillStyle = '#5fae5c'; g.beginPath(); g.ellipse(p.x + t * 150 * p.s, p.y + Math.sin(t * 6) * 16, 7, 3.5, t * 4, 0, TAU); g.fill(); } }
      for (const p of pts(Math.round(10 * area))) { if (!vis(p)) continue; g.fillStyle = rgba('#5a3a24', 0.3); for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(p.x + i * 14, p.y + (i % 2) * 8, 3, 4.5, 0, 0, TAU); g.fill(); } }
      // vines creeping up the siding
      for (let i = 0; i < Math.round(aw / 120); i++) { const x = R() * aw; g.strokeStyle = '#3f7a4a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 20, -30, x - 20, -60, x + 10, -wh + 20); g.stroke(); for (let k = 0; k < 5; k++) { g.fillStyle = '#5fae5c'; g.beginPath(); g.ellipse(x + Math.sin(k) * 10, -k * 20 - 8, 6, 3, k, 0, TAU); g.fill(); } }
      break;
    }
    case 'code': {
      g.font = '11px monospace'; g.textAlign = 'center';
      const glyphs = ['main()', '{', '}', '0', '1', ';', '>>', 'fn', 'koi', '//', '=>'];
      for (const p of pts(Math.round(110 * area))) { if (!vis(p)) continue; g.fillStyle = rgba(PALETTE.mint, 0.5 + p.k * 0.4); g.fillText(glyphs[Math.floor(p.k * glyphs.length)], p.x, p.y); }
      for (const p of pts(Math.round(10 * area))) { if (!vis(p, 100)) continue; g.strokeStyle = rgba(PALETTE.mint, 0.25); g.lineWidth = 2; g.beginPath(); g.ellipse(p.x, p.y, 40 * p.s, 16 * p.s, 0, 0, TAU); g.stroke(); }
      break;
    }
  }
}
function splat(g, x, y, r, c, k) {
  g.save(); g.translate(x, y); g.scale(1, 0.6); x = 0; y = 0;
  g.fillStyle = rgba('#a8875a', 0.45); g.beginPath(); g.arc(x + 1.5, y + 2, r + 1.5, 0, TAU); g.fill();
  g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + k * 6, d = r * (1 + ((i * 37 + k * 100) % 10) / 10); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, r * 0.3, 0, TAU); g.fill(); }
  g.fillStyle = rgba('#ffffff', 0.6); g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.2, -0.4, 0, TAU); g.fill();
  g.restore();
}
function fluff(g, x, y, r, R) {
  g.fillStyle = rgba('#9a948a', 0.7); for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x + (R() - 0.5) * r * 2, y + (R() - 0.5) * r, r * (0.5 + R() * 0.5), 0, TAU); g.fill(); }
  g.fillStyle = rgba('#c4bfb6', 0.6); g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, TAU); g.fill();
}
function sock(g, x, y, a, c1, c2, s) {
  g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
  g.strokeStyle = c1; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(-12, -6); g.lineTo(4, -6); g.quadraticCurveTo(12, -6, 12, 4); g.stroke();
  g.strokeStyle = c2; g.lineWidth = 2; for (const sx of [-8, -3]) { g.beginPath(); g.moveTo(sx, -9.5); g.lineTo(sx, -2.5); g.stroke(); }
  g.strokeStyle = rgba(INK, 0.2); g.lineWidth = 1; g.beginPath(); g.moveTo(-14, -2); g.lineTo(4, -2); g.stroke();
  g.restore();
}
function puddle(g, x, y, rx, ry) {
  g.fillStyle = rgba('#6fb7e8', 0.4); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
  g.fillStyle = rgba('#8fd0f2', 0.45); g.beginPath(); g.ellipse(x + rx * 0.25, y + ry * 0.1, rx * 0.6, ry * 0.55, 0.2, 0, TAU); g.fill();
  g.strokeStyle = rgba('#ffffff', 0.55); g.lineWidth = 1.5; g.beginPath(); g.ellipse(x - rx * 0.3, y - ry * 0.3, rx * 0.3, ry * 0.2, 0, Math.PI * 1.1, Math.PI * 1.8); g.stroke();
}
function weeds(g, x, y, s, R) {
  for (let i = 0; i < 9; i++) { const lx = x + (R() - 0.5) * 30 * s, h = (16 + R() * 26) * s; g.strokeStyle = R() < 0.5 ? '#3f7a4a' : '#4f9a52'; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(lx, y); g.quadraticCurveTo(lx + (R() - 0.5) * 12, y - h * 0.6, lx + (R() - 0.5) * 16, y - h); g.stroke(); }
  if (R() < 0.4) { g.fillStyle = '#ffc94a'; g.beginPath(); g.arc(x, y - 22 * s, 3, 0, TAU); g.fill(); }
}

// ------------------------------------------------------------------ chunk cache
const chunks = new Map();
const layouts = new Map();
function layoutOf(id, aw, ah, wh) {
  const key = `${id}:${aw}:${ah}:${wh}`;
  let L = layouts.get(key);
  if (!L) {
    L = { lights: [], drips: [], puddles: [] };
    const S = STYLE[id];
    if (S.decor) for (const [k, fx, o] of S.decor) collectLights(L.lights, k, fx * aw, wh);
    if (S.weird === 'flood') { const R = rng(4242 + aw); for (let i = 0; i < Math.round(aw / 220); i++) L.drips.push({ x: SIDE + 60 + R() * (aw - SIDE * 2 - 120), y: 60 + R() * (ah - 160), p: R() }); }
    layouts.set(key, L);
  }
  return L;
}
function collectLights(out, kind, x, wh) {
  if (kind === 'sconce') out.push({ x, y: -wh + 46, r: 48, c: LAMP });
  else if (kind === 'gallery') out.push({ x: x - 45, y: -wh + 70, r: 20, c: LAMP });
  else if (kind === 'back_door') out.push({ x, y: -wh + 50, r: 40, c: LAMP });
  else if (kind === 'house_window') out.push({ x, y: -wh + 57, r: 46, c: '#ffd98a' });
}
function getChunk(id, aw, ah, wh, layer, cx, cy) {
  const key = `${id}:${aw}:${ah}:${wh}:${layer}:${cx}:${cy}`;
  let c = chunks.get(key);
  if (c) { chunks.delete(key); chunks.set(key, c); return c; }
  c = makeCanvas(CH, CH);
  const g = c.getContext('2d');
  const X0 = cx * CH, Y0 = cy * CH;
  const r = { x0: X0, y0: Y0, x1: X0 + CH, y1: Y0 + CH };
  g.translate(-X0, -Y0);
  const S = STYLE[id];
  if (layer === 'base') paintBase(g, id, S, aw, ah, wh, r);
  else weirdDecals(g, id, S, aw, ah, wh, r);
  chunks.set(key, c);
  if (chunks.size > 64) chunks.delete(chunks.keys().next().value);
  return c;
}
function paintBase(g, id, S, aw, ah, wh, r) {
  // floor
  const fr = { x0: Math.max(r.x0, 0), y0: Math.max(r.y0, 0), x1: Math.min(r.x1, aw), y1: Math.min(r.y1, ah) };
  if (fr.x1 > fr.x0 && fr.y1 > fr.y0) {
    g.save(); g.beginPath(); g.rect(fr.x0, fr.y0, fr.x1 - fr.x0, fr.y1 - fr.y0); g.clip();
    FLOORS[S.floor](g, id, S, fr, aw, ah);
    g.restore();
  }
  // back wall
  if (r.y0 < 0) {
    g.save(); g.beginPath(); g.rect(-MARGIN, -wh - MARGIN, aw + MARGIN * 2, wh + MARGIN + 0.5); g.clip();
    const x0 = Math.max(r.x0, -MARGIN), x1 = Math.min(r.x1, aw + MARGIN);
    if (S.outdoor === 'yard') siding(g, id, S, x0, x1, wh);
    else if (S.outdoor === 'bank') farBank(g, id, S, x0, x1, wh);
    else wallPaper(g, id, S, x0, x1, wh);
    g.restore();
  }
  // wall decor (+ window sunbeams on the floor); needs the full arena clip
  g.save(); g.beginPath(); g.rect(0, -wh, aw, wh + ah); g.clip();
  const dummy = [];
  for (const [k, fx, o] of S.decor ?? []) decor(g, id, S, k, fx, o ?? {}, aw, wh, dummy);
  g.restore();
  if (S.outdoor === 'yard') yardGround(g, id, aw, ah, r);
  walls(g, id, S, aw, ah, wh, r);
}

function yardGround(g, id, aw, ah, r) {
  g.save(); g.beginPath(); g.rect(SIDE, 0, aw - SIDE * 2, ah - FRONT); g.clip();
  // mulched flower borders along both side fences + the front fence
  const bed = (x, y, w, h) => {
    g.fillStyle = '#6b4a2e'; rrect(g, x, y, w, h, 10); g.fill();
    g.fillStyle = rgba('#3a2414', 0.35); for (let i = 0; i < (w * h) / 120; i++) { g.beginPath(); g.arc(x + H(x + i, y, 71) * w, y + H(x, y + i, 72) * h, 1.4, 0, TAU); g.fill(); }
    const cols = ['#ff8fb1', '#ffc94a', '#c9a0dc', '#fff6e5', '#ff5d5d'];
    for (let yy = y + 10; yy < y + h - 4; yy += 18) for (let xx = x + 10; xx < x + w - 4; xx += 18) {
      const hv = H(xx, yy, 73); if (hv < 0.25) continue;
      g.fillStyle = '#4f9a52'; g.beginPath(); g.arc(xx, yy + 3, 6, 0, TAU); g.fill();
      g.fillStyle = cols[Math.floor(hv * 5)]; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(xx + Math.cos(a) * 2.6, yy - 2 + Math.sin(a) * 2.6, 2.2, 0, TAU); g.fill(); }
      g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(xx, yy - 2, 1.5, 0, TAU); g.fill();
    }
  };
  bed(SIDE, 70, 46, ah - 170); bed(aw - SIDE - 46, 70, 46, ah - 170);
  bed(SIDE + 80, ah - FRONT - 40, aw * 0.3, 40); bed(aw - SIDE - 80 - aw * 0.3, ah - FRONT - 40, aw * 0.3, 40);
  // flagstone path from the back door to the front gate
  const dx = 0.4 * aw;
  for (let i = 0, y = 70; y < ah - 30; i++, y += 46) {
    const k = (y - 70) / (ah - 100), x = dx + (aw / 2 - dx) * k + Math.sin(i * 1.3) * 14;
    g.fillStyle = rgba(INK, 0.15); g.beginPath(); g.ellipse(x + 2, y + 3, 26, 15, 0, 0, TAU); g.fill();
    g.fillStyle = mix('#cbbfa8', '#b8ab92', H(i, 1, 74)); g.beginPath(); g.ellipse(x, y, 26, 15, H(i, 2, 74) - 0.5, 0, TAU); g.fill();
    g.fillStyle = rgba('#ffffff', 0.2); g.beginPath(); g.ellipse(x - 6, y - 4, 10, 4, 0, 0, TAU); g.fill();
  }
  // a little herb patch + bird bath shadow spot near the patio corners (flat decor)
  for (const [px, py] of [[aw * 0.72, 120], [aw * 0.2, ah * 0.55]]) {
    g.fillStyle = '#6b4a2e'; g.beginPath(); g.ellipse(px, py, 50, 24, 0, 0, TAU); g.fill();
    for (let i = 0; i < 9; i++) { const a = i * 0.7, d = 8 + (i % 3) * 12; g.fillStyle = ['#5fae5c', '#7cc26a', '#4f9a52'][i % 3]; g.beginPath(); g.arc(px + Math.cos(a) * d * 1.6, py + Math.sin(a) * d * 0.7, 7, 0, TAU); g.fill(); }
  }
  g.restore();
}

/**
 * A strand of party string lights hanging between two points (e.g. between light_posts; pass the bulb-height
 * points, about y - 96 above each post's base). o: { t, lit 0..1 (fraction of bulbs on / brightness), sag px }
 */
export function drawStringLights(ctx, game, x1, y1, x2, y2, o = {}) {
  const t = o.t ?? game?.time ?? 0, lit = clamp01(o.lit ?? 1), sag = o.sag ?? Math.min(60, Math.hypot(x2 - x1, y2 - y1) * 0.12);
  const pt = (k) => [x1 + (x2 - x1) * k, y1 + (y2 - y1) * k + Math.sin(k * Math.PI) * sag];
  ctx.strokeStyle = '#3a3f4d'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i <= 24; i++) { const [x, y] = pt(i / 24); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.stroke();
  const n = Math.max(3, Math.round(Math.hypot(x2 - x1, y2 - y1) / 28)), cols = ['#ffd98a', '#ff8fb1', '#7fd8a6', '#8fc4ff'], gs = glow();
  for (let i = 1; i < n; i++) {
    const [x, y] = pt(i / n), on = lit > 0 && (i / n) <= lit + 0.001;
    if (on) { ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 3 + i * 1.7); ctx.drawImage(gs, x - 16, y - 12, 32, 32); ctx.globalAlpha = 1; }
    ctx.fillStyle = on ? cols[i % 4] : '#8a8a7a'; ctx.beginPath(); ctx.ellipse(x, y + 4, 3, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a3f4d'; ctx.fillRect(x - 1.5, y - 1, 3, 2);
  }
  return true;
}

// ------------------------------------------------------------------ live overlays
let glowSprite = null;
function glow() {
  if (glowSprite) return glowSprite;
  glowSprite = makeCanvas(128, 128);
  const g = glowSprite.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,217,138,0.55)'); gr.addColorStop(0.4, 'rgba(255,217,138,0.22)'); gr.addColorStop(1, 'rgba(255,217,138,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return glowSprite;
}
function liveOverlays(ctx, id, S, aw, ah, wh, camX, camY, w, h, weird, t) {
  const L = layoutOf(id, aw, ah, wh);
  // lamps: steady when fixed, flickery when haywire
  const gs = glow();
  for (const l of L.lights) {
    if (l.x + l.r < camX || l.x - l.r > camX + w || l.y + l.r < camY || l.y - l.r > camY + h) continue;
    const fl = 1 - weird * 0.6 * (Math.sin(t * 13 + l.x) > 0.75 ? 1 : 0) + 0.05 * Math.sin(t * 2 + l.x);
    ctx.globalAlpha = Math.max(0, fl); ctx.drawImage(gs, l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  ctx.globalAlpha = 1;
  // dining chandelier: soft pool of light + shadow ring in the middle of the room
  if (S.chandelier) {
    const cx = aw / 2, cy = ah * 0.45, sw = Math.sin(t * 1.2) * 6 * (0.3 + weird);
    ctx.fillStyle = rgba(INK, 0.08); ctx.beginPath(); ctx.ellipse(cx + sw, cy, 150, 64, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.7 - 0.3 * weird; ctx.drawImage(gs, cx - 170 + sw, cy - 90, 340, 180); ctx.globalAlpha = 1;
    ctx.strokeStyle = rgba(INK, 0.12); ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * 0.2 * weird; ctx.beginPath(); ctx.arc(cx + sw + Math.cos(a) * 90, cy + Math.sin(a) * 36, 10, 0, TAU); ctx.stroke(); }
  }
  // backyard: string lights along the eave (light up as the room gets fixed)
  if (S.eaveLights) {
    const lit = 1 - weird, cols = ['#ffd98a', '#ff8fb1', '#7fd8a6', '#8fc4ff'];
    ctx.strokeStyle = '#3a3f4d'; ctx.lineWidth = 1; ctx.beginPath();
    const yA = -wh + 18, x0 = Math.max(0, camX - 40), x1 = Math.min(aw, camX + w + 40);
    for (let x = x0 - (x0 % 4); x < x1; x += 4) { const y = yA + Math.sin(((x % 160) / 160) * Math.PI) * 14; if (x === x0 - (x0 % 4)) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    for (let x = Math.ceil(x0 / 32) * 32; x < x1; x += 32) {
      const y = yA + Math.sin(((x % 160) / 160) * Math.PI) * 14 + 4, i = (x / 32) & 3, on = lit > 0.05 && ((x / 32) % 7 !== 3 || lit > 0.9);
      if (on) { ctx.globalAlpha = lit * (0.8 + 0.2 * Math.sin(t * 3 + x)); ctx.drawImage(gs, x - 14, y - 14, 28, 28); ctx.globalAlpha = 1; }
      ctx.fillStyle = on ? mix('#8a8a7a', cols[i], lit) : '#8a8a7a'; ctx.beginPath(); ctx.ellipse(x, y, 3, 4, 0, 0, TAU); ctx.fill();
    }
  }
  if (weird <= 0.01) return;
  // guest: drips from the ceiling into rippling puddles
  if (S.weird === 'flood') {
    for (const d of L.drips) {
      const k = (t * 0.8 + d.p) % 1;
      ctx.strokeStyle = rgba('#ffffff', 0.6 * weird * (1 - k)); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, 8 + k * 34, 3 + k * 13, 0, 0, TAU); ctx.stroke();
      const fk = (t * 1.6 + d.p) % 1; ctx.fillStyle = rgba('#8fd0f2', 0.8 * weird); ctx.beginPath(); ctx.ellipse(d.x, d.y - 120 * (1 - fk), 2.5, 4, 0, 0, TAU); ctx.fill();
    }
  }
  // office/pond: floating glyph particles
  if (S.weird === 'glitch' || S.weird === 'code') {
    ctx.font = '11px monospace'; ctx.textAlign = 'center';
    for (let i = 0; i < 14; i++) {
      const k = (t * 0.15 + i * 0.37) % 1, gx = camX + ((i * 397.3) % w), gy = camY + h - k * (h + 40);
      ctx.fillStyle = rgba(PALETTE.mint, 0.5 * weird * Math.sin(k * Math.PI)); ctx.fillText(i % 3 ? (i % 2 ? '1' : '0') : '{}', gx + Math.sin(t + i) * 10, gy);
    }
  }
  // universal haywire: glitchy scanline shimmer in the room's accent
  const a = acc(id), step = Math.floor(t * 9);
  const n = 2 + Math.round(weird * 5);
  for (let i = 0; i < n; i++) {
    const hv = hash2(step, i, 7); if (hv < 0.35) continue;
    const y = camY + hash2(step, i, 8) * h, hh = 2 + hash2(step, i, 9) * 9, off = (hash2(step, i, 10) - 0.5) * 14 * weird;
    ctx.fillStyle = rgba(a, 0.07 + 0.12 * weird * hv); ctx.fillRect(camX, y, w, hh);
    ctx.fillStyle = rgba('#ff5dd0', 0.07 * weird); ctx.fillRect(camX + off, y + hh, w, 1.5);
    ctx.fillStyle = rgba('#5dfff0', 0.07 * weird); ctx.fillRect(camX - off, y - 1.5, w, 1.5);
  }
  ctx.fillStyle = rgba(a, 0.04 * weird); ctx.fillRect(camX, camY, w, h);
}

/**
 * Fill the visible area of a room in world space (camera already applied).
 * (camX, camY) = top-left world coordinate visible; w, h = visible size.
 * o: { weird 0..1 (haywire state, fades the decals/glitch), t (seconds), arenaW, arenaH (floor size),
 *      wallH (back-wall face height above y=0, default WALL_H) }
 */
export function drawRoom(ctx, game, roomId, camX, camY, w, h, o = {}) {
  const S = STYLE[roomId];
  const aw = Math.round(o.arenaW ?? 1200), ah = Math.round(o.arenaH ?? 700), wh = Math.round(o.wallH ?? WALL_H);
  const t = o.t ?? game?.time ?? 0, weird = clamp01(o.weird ?? 0);
  if (!S) { ctx.fillStyle = '#b98a5c'; ctx.fillRect(camX, camY, w, h); return false; }
  ctx.fillStyle = S.outdoor === 'yard' ? '#4f8a43' : S.outdoor === 'bank' ? '#3f7a4a' : '#1e1a22';
  ctx.fillRect(camX, camY, w, h);
  const x0 = Math.max(camX, -MARGIN), y0 = Math.max(camY, -wh - MARGIN), x1 = Math.min(camX + w, aw + MARGIN), y1 = Math.min(camY + h, ah + MARGIN);
  if (x1 <= x0 || y1 <= y0) return true;
  const cx0 = Math.floor(x0 / CH), cx1 = Math.floor((x1 - 0.01) / CH), cy0 = Math.floor(y0 / CH), cy1 = Math.floor((y1 - 0.01) / CH);
  ctx.save();
  ctx.beginPath(); ctx.rect(-MARGIN, -wh - MARGIN, aw + MARGIN * 2, ah + wh + MARGIN * 2); ctx.clip();
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) ctx.drawImage(getChunk(roomId, aw, ah, wh, 'base', cx, cy), cx * CH, cy * CH);
  if (weird > 0.01) {
    ctx.globalAlpha = weird;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) ctx.drawImage(getChunk(roomId, aw, ah, wh, 'weird', cx, cy), cx * CH, cy * CH);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  liveOverlays(ctx, roomId, S, aw, ah, wh, camX, camY, w, h, weird, t);
  return true;
}

/**
 * Pretty pond water (for action's arena.water ellipses). Draw right after drawRoom, before entities.
 * o: { t, weird 0..1 (green code glow in the water), seed }
 */
export function drawWater(ctx, game, x, y, rx, ry, o = {}) {
  const t = o.t ?? game?.time ?? 0, weird = clamp01(o.weird ?? 0);
  ctx.save();
  // muddy bank + pebbles
  ctx.fillStyle = '#c9b58a'; ctx.beginPath(); ctx.ellipse(x, y + 4, rx + 18, ry + 14, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, j = hash2(i, 3, 71); ctx.fillStyle = mix('#a39a88', '#d8cfbf', j); ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * (rx + 10 + j * 6), y + 4 + Math.sin(a) * (ry + 8 + j * 4), 5 + j * 4, 3 + j * 2, 0, 0, TAU); ctx.fill(); }
  const gr = ctx.createRadialGradient(x, y + ry * 0.2, ry * 0.1, x, y, Math.max(rx, ry));
  gr.addColorStop(0, '#2f6f8f'); gr.addColorStop(0.65, '#4f8fb3'); gr.addColorStop(1, '#79b6d1');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.clip();
  // depth band at the top edge (bank shadow)
  ctx.fillStyle = rgba('#1b3a4a', 0.25); ctx.beginPath(); ctx.ellipse(x, y - ry * 0.9, rx, ry * 0.35, 0, 0, TAU); ctx.fill();
  // shimmer
  for (let i = 0; i < 46; i++) {
    const hx = hash2(i, 1, 81), hy = hash2(i, 2, 81), k = (t * 0.35 + hash2(i, 3, 81)) % 1;
    const px = x + (hx - 0.5) * rx * 2 + Math.sin(t * 0.7 + i) * 8, py = y + (hy - 0.5) * ry * 2;
    ctx.strokeStyle = rgba('#e8f8ff', 0.55 * Math.sin(k * Math.PI)); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px - 8, py); ctx.quadraticCurveTo(px, py - 2.5, px + 8, py); ctx.stroke();
  }
  // slow ripple rings
  for (let i = 0; i < 3; i++) { const k = (t * 0.18 + i / 3) % 1; ctx.strokeStyle = rgba('#e8f8ff', 0.25 * (1 - k)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x + rx * 0.2, y - ry * 0.1, rx * 0.8 * k, ry * 0.8 * k, 0, 0, TAU); ctx.stroke(); }
  // haywire: green code glowing under the surface
  if (weird > 0.01) {
    ctx.font = '12px monospace'; ctx.textAlign = 'center';
    for (let i = 0; i < 30; i++) {
      const hx = hash2(i, 5, 91), k = (t * 0.25 + hash2(i, 6, 91)) % 1;
      ctx.fillStyle = rgba(PALETTE.mint, 0.45 * weird * Math.sin(k * Math.PI)); ctx.fillText(['0', '1', '{', '}', ';', 'fn'][i % 6], x + (hx - 0.5) * rx * 1.8, y - ry + k * ry * 2);
    }
    ctx.fillStyle = rgba(PALETTE.mint, 0.1 * weird); ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  }
  ctx.restore();
  // rim highlight
  ctx.strokeStyle = rgba('#ffffff', 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
  return true;
}
