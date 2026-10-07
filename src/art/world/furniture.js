// Furniture: solid obstacles action places in rooms (also reused as back-wall set pieces by rooms.js).
// Owned by: art-world.
//
// Projection (top-down 3/4, oblique): a piece with floor footprint w x d and visual height H draws
//   front face  x∈[-w/2, w/2], y∈[-H, 0]
//   top face    x∈[-w/2, w/2], y∈[-d-H, -H]
// (x, y) = BASE POINT = bottom-centre of the footprint. Collision = FURNITURE_SIZE[kind] box
// [-w/2, w/2] x [-h, 0] relative to the base point. Y-sort by the base y.
// Static art is cached per (kind, variant, room tint); small animated overlays (screens, glows,
// bubbles, flames) are drawn live from o.t.
import { ROOMS } from '../../core/theme.js';
import { cached, rng, shade, rgba, mix, rrect, TAU, INK, WOOD, CREAM, LAMP, PALETTE, clamp01 } from './kit.js';

/** Collision footprints (world px). solid=false: decorative / walkable (lily pads, low plants on water...). */
export const FURNITURE_SIZE = {
  // office
  desk: { w: 120, h: 50, vh: 140 }, office_chair: { w: 34, h: 30, vh: 62 }, bookshelf: { w: 96, h: 30, vh: 150 },
  server_rack: { w: 56, h: 40, vh: 130 }, plant: { w: 36, h: 30, vh: 80 }, floor_lamp: { w: 26, h: 22, vh: 124 },
  // kitchen
  counter: { w: 128, h: 50, vh: 95 }, island: { w: 150, h: 72, vh: 120 }, oven: { w: 60, h: 50, vh: 102 },
  fridge: { w: 62, h: 52, vh: 176 }, starter_jar: { w: 40, h: 30, vh: 70 }, sink: { w: 64, h: 42, vh: 96 },
  // living
  sofa: { w: 160, h: 64, vh: 100 }, armchair: { w: 64, h: 56, vh: 90 }, coffee_table: { w: 96, h: 50, vh: 70 },
  tv_stand: { w: 130, h: 36, vh: 136 }, rug: { w: 220, h: 140, vh: 0, solid: false },
  // dining
  dining_table: { w: 220, h: 90, vh: 124 }, sideboard: { w: 110, h: 36, vh: 145 }, dining_chair: { w: 34, h: 30, vh: 66 },
  // playroom
  toy_box: { w: 70, h: 42, vh: 80 }, toy_shelf: { w: 100, h: 32, vh: 105 }, block_tower: { w: 40, h: 36, vh: 80 },
  play_table: { w: 96, h: 64, vh: 70 },
  // bedrooms
  bed: { w: 130, h: 170, vh: 226 }, guest_bed: { w: 100, h: 150, vh: 200 }, nightstand: { w: 40, h: 34, vh: 80 },
  dresser: { w: 104, h: 42, vh: 128 }, wardrobe: { w: 96, h: 46, vh: 176 }, laundry_basket: { w: 50, h: 40, vh: 56 },
  laundry_pile: { w: 50, h: 30, vh: 34, solid: false }, bathtub: { w: 140, h: 70, vh: 106 },
  // backyard + pond
  grill: { w: 56, h: 46, vh: 80 }, hedge: { w: 120, h: 40, vh: 90 }, tree: { w: 40, h: 30, vh: 150 },
  light_post: { w: 16, h: 16, vh: 110 }, patio_table: { w: 90, h: 70, vh: 76 }, garden_bed: { w: 140, h: 60, vh: 76 },
  fence: { w: 128, h: 14, vh: 56 }, rock: { w: 56, h: 36, vh: 40 }, reeds: { w: 44, h: 24, vh: 80 },
  lily_pad: { w: 48, h: 34, vh: 6, solid: false },
};
/** Accepted alternate names -> canonical kind. */
export const FURNITURE_ALIASES = { couch: 'sofa', hutch: 'sideboard', kitchen_island: 'island', toy_chest: 'toy_box', jar: 'starter_jar', lamp: 'floor_lamp' };

// ------------------------------------------------------------------ helpers
function fshadow(g, w, d, a = 0.2) {
  g.fillStyle = `rgba(30,18,10,${a})`;
  rrect(g, -w / 2 + 2, -d + 3, w + 3, d + 3, Math.min(10, d / 2)); g.fill();
}
/** Oblique box centred at x, base y. Returns {top, front} y's. */
function box(g, x, y, w, d, H, top, front, r = 3, line = true) {
  g.fillStyle = front; rrect(g, x - w / 2, y - H, w, H, r); g.fill();
  g.fillStyle = top; rrect(g, x - w / 2, y - H - d, w, d, r); g.fill();
  if (line) {
    g.strokeStyle = shade(front, -0.35); g.lineWidth = 1;
    rrect(g, x - w / 2 + 0.5, y - H - d + 0.5, w - 1, d + H - 1, r); g.stroke();
    g.strokeStyle = rgba('#ffffff', 0.25); g.beginPath(); g.moveTo(x - w / 2 + r, y - H + 0.5); g.lineTo(x + w / 2 - r, y - H + 0.5); g.stroke();
  }
}
function woodGrain(g, x, y, w, h, col, R, n = 4) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.strokeStyle = rgba(shade(col, -0.3), 0.35); g.lineWidth = 0.8;
  for (let i = 0; i < n; i++) {
    const yy = y + (i + 0.5) * (h / n) + (R() - 0.5) * 2;
    g.beginPath(); g.moveTo(x, yy); g.bezierCurveTo(x + w * 0.3, yy + (R() - 0.5) * 3, x + w * 0.7, yy + (R() - 0.5) * 3, x + w, yy); g.stroke();
  }
  g.restore();
}
function knob(g, x, y, r = 1.6, c = '#e8d6a8') { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(x + 0.4, y + 0.5, r * 0.6, 0, TAU); g.fill(); }
function leaf(g, x, y, len, ang, col) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = col; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -len * 0.28, len, 0); g.quadraticCurveTo(len * 0.5, len * 0.28, 0, 0); g.fill();
  g.strokeStyle = rgba(shade(col, -0.35), 0.6); g.lineWidth = 0.7; g.beginPath(); g.moveTo(1, 0); g.lineTo(len * 0.85, 0); g.stroke();
  g.restore();
}
function book(g, x, y, w, h, col) {
  g.fillStyle = col; g.fillRect(x, y - h, w, h);
  g.fillStyle = rgba('#ffffff', 0.25); g.fillRect(x, y - h + 2, w, 1.2);
  g.fillStyle = rgba('#000000', 0.18); g.fillRect(x + w - 1, y - h, 1, h);
}
const BOOK_COLS = ['#a8483a', '#3f7a4a', '#5b7fa6', '#f29f2e', '#7a4e8a', '#d9c7a0', '#2f4a6b', '#c9a0dc', '#e98aa8'];
const tint = (c, room, k = 0.25) => (room && ROOMS[room] ? mix(c, ROOMS[room].accent, k) : c);

// Painters: [canvasW, canvasH (above base), canvasBelow, draw(g, R, v, room)] — origin at base point.
const F = {};

F.desk = [150, 150, 12, (g, R) => {
  fshadow(g, 120, 50);
  // legs (front)
  g.fillStyle = WOOD.deep; g.fillRect(-56, -40, 5, 40); g.fillRect(51, -40, 5, 40);
  // drawer pedestal right
  box(g, 34, 0, 44, 46, 38, WOOD.mid, WOOD.dark, 2);
  for (let i = 0; i < 3; i++) { g.strokeStyle = rgba(INK, 0.3); g.strokeRect(14, -36 + i * 12, 40, 10); knob(g, 34, -31 + i * 12, 1.4); }
  // top slab
  box(g, 0, -38, 124, 50, 5, WOOD.light, WOOD.dark, 2);
  woodGrain(g, -62, -93, 124, 50, WOOD.light, R, 5);
  // monitor (back), on stand
  g.fillStyle = '#2b2f3a'; g.fillRect(-22, -104, 6, 14); g.fillRect(-30, -92, 22, 3);
  g.fillStyle = '#1b1e27'; rrect(g, -50, -140, 62, 40, 3); g.fill();
  g.fillStyle = '#16324a'; g.fillRect(-47, -137, 56, 33);
  // code lines on monitor
  for (let i = 0; i < 6; i++) { g.fillStyle = [PALETTE.mint, '#ffc94a', '#8fc4ff', '#e98aa8'][i % 4]; g.fillRect(-44 + (i % 3) * 3, -133 + i * 5, 12 + R() * 28, 2); }
  // laptop (front right)
  g.fillStyle = '#c4c8d0'; rrect(g, 6, -64, 40, 14, 2); g.fill(); // base
  g.fillStyle = '#9aa0ab'; for (let i = 0; i < 3; i++) g.fillRect(9, -61 + i * 3.5, 34, 2);
  g.fillStyle = '#d7dbe2'; rrect(g, 8, -92, 36, 28, 2); g.fill(); // lid (screen side faces viewer)
  g.fillStyle = '#20384f'; g.fillRect(10.5, -89.5, 31, 23);
  // mug + cables
  g.fillStyle = '#fff6e5'; rrect(g, -12, -66, 9, 10, 2); g.fill(); g.strokeStyle = '#fff6e5'; g.lineWidth = 1.5; g.beginPath(); g.arc(-2.5, -61, 3, -1.2, 1.2); g.stroke();
  g.fillStyle = '#a8483a'; g.fillRect(-12, -66, 9, 2);
  g.strokeStyle = '#23262e'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(-20, -92); g.bezierCurveTo(-26, -60, -40, -40, -30, -2); g.moveTo(26, -64); g.bezierCurveTo(30, -40, 10, -20, 20, 4); g.stroke();
}];
F.desk.anim = (ctx, o, t) => {
  // laptop + monitor glow
  const w = clamp01(o.weird ?? 0);
  const fl = 0.75 + 0.25 * Math.sin(t * 3) + (w > 0 ? (Math.sin(t * 37) > 0.6 ? 0.4 * w : 0) : 0);
  ctx.fillStyle = rgba(w > 0.3 ? PALETTE.mint : '#8fc4ff', 0.18 * fl); ctx.beginPath(); ctx.ellipse(26, -74, 30, 20, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba(PALETTE.mint, 0.9); ctx.fillRect(13, -86, 6 + ((t * 18) % 20), 2);
  if (Math.floor(t * 2) % 2) ctx.fillRect(13 + 6 + ((t * 18) % 20) + 1, -86, 2, 3);
  if (w > 0) { ctx.fillStyle = rgba(PALETTE.mint, 0.6 * w); for (let i = 0; i < 4; i++) ctx.fillRect(11, -84 + ((t * 30 + i * 6) % 20), 30 * ((i * 0.37 + t) % 1), 1.5); }
};

F.office_chair = [50, 70, 10, (g) => {
  g.fillStyle = 'rgba(30,18,10,0.2)'; g.beginPath(); g.ellipse(2, -10, 18, 8, 0, 0, TAU); g.fill();
  g.strokeStyle = '#23262e'; g.lineWidth = 2.5; for (const a of [0.3, 1.4, 2.6, 3.7, 4.9]) { g.beginPath(); g.moveTo(0, -12); g.lineTo(Math.cos(a) * 15, -12 + Math.sin(a) * 6); g.stroke(); }
  g.fillStyle = '#23262e'; g.fillRect(-1.5, -26, 3, 14);
  g.fillStyle = '#3a3f4d'; rrect(g, -15, -32, 30, 10, 4); g.fill();
  g.fillStyle = '#4c5466'; rrect(g, -15, -40, 30, 10, 4); g.fill();
  g.fillStyle = '#3a3f4d'; rrect(g, -13, -62, 26, 24, 6); g.fill();
  g.fillStyle = rgba('#ffffff', 0.15); rrect(g, -10, -59, 8, 18, 3); g.fill();
}];

F.bookshelf = [110, 150, 10, (g, R) => {
  fshadow(g, 96, 30);
  box(g, 0, 0, 96, 28, 120, WOOD.mid, WOOD.walnut, 2);
  g.fillStyle = shade(WOOD.walnut, -0.35); g.fillRect(-44, -114, 88, 110);
  for (let s = 0; s < 4; s++) {
    const y = -6 - s * 28;
    g.fillStyle = WOOD.mid; g.fillRect(-46, y, 92, 3);
    let x = -43;
    while (x < 40) {
      const w = 4 + R() * 5, h = 14 + R() * 9;
      if (R() < 0.12) { // leaning book or little plant
        g.fillStyle = '#c96f4a'; g.fillRect(x, y - 7, 8, 7); leaf(g, x + 4, y - 7, 8, -2.2, '#5fae5c'); leaf(g, x + 4, y - 7, 8, -1.0, '#4f9a52'); x += 10; continue;
      }
      book(g, x, y, Math.min(w, 41 - x), h, BOOK_COLS[Math.floor(R() * BOOK_COLS.length)]); x += w + 0.5;
    }
  }
}];

F.counter = [140, 120, 10, (g, R, v, room) => {
  fshadow(g, 128, 50);
  const cab = tint('#e9e2d0', room, 0.18);
  box(g, 0, 0, 128, 46, 44, '#d9d4c8', cab, 2);
  // butcher-block top
  box(g, 0, -40, 132, 50, 5, '#d8b07a', WOOD.mid, 2); woodGrain(g, -66, -95, 132, 50, '#d8b07a', R, 6);
  // cabinet doors
  for (let i = 0; i < 3; i++) { g.strokeStyle = rgba(INK, 0.25); g.lineWidth = 1; g.strokeRect(-60 + i * 41, -32, 37, 29); knob(g, -60 + i * 41 + (i === 1 ? 4 : 33), -20, 1.4, '#b9a37a'); }
  // stuff on top: cutting board, bowl, flour bag
  g.fillStyle = '#c99a64'; rrect(g, -52, -78, 36, 22, 4); g.fill(); g.strokeStyle = shade('#c99a64', -0.3); g.stroke();
  g.fillStyle = '#e9e2d0'; g.beginPath(); g.ellipse(10, -68, 14, 8, 0, 0, TAU); g.fill(); g.fillStyle = '#f3e3c3'; g.beginPath(); g.ellipse(10, -70, 10, 5, 0, 0, TAU); g.fill();
  g.fillStyle = '#efe6d2'; rrect(g, 34, -88, 18, 24, 3); g.fill(); g.fillStyle = '#a8483a'; g.fillRect(36, -80, 14, 5);
  g.fillStyle = rgba('#ffffff', 0.5); for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(30 + R() * 30, -62 + R() * 8, 0.8 + R(), 0, TAU); g.fill(); }
}];

F.oven = [76, 110, 10, (g, R, v, room) => {
  fshadow(g, 60, 50);
  box(g, 0, 0, 60, 46, 46, '#2b2f3a', '#e4e6ea', 3);
  // cooktop burners
  for (const [bx, by] of [[-14, -80], [14, -80], [-14, -62], [14, -62]]) { g.strokeStyle = '#555c6b'; g.lineWidth = 2; g.beginPath(); g.ellipse(bx, by, 9, 6, 0, 0, TAU); g.stroke(); }
  // oven door window
  g.fillStyle = '#1b1e27'; rrect(g, -24, -34, 48, 26, 3); g.fill();
  g.fillStyle = '#c4c8d0'; g.fillRect(-22, -42, 44, 3);
  for (let i = 0; i < 4; i++) knob(g, -18 + i * 12, -44 + 0.5, 2, '#2b2f3a');
  // back panel
  g.fillStyle = '#c4c8d0'; g.fillRect(-30, -102, 60, 10); g.fillStyle = PALETTE.mint; g.fillRect(-6, -99, 12, 4);
  // kettle on a burner
  g.fillStyle = '#d0d4dc'; g.beginPath(); g.ellipse(14, -82, 8, 6, 0, 0, TAU); g.fill(); g.fillStyle = '#e98aa8'; g.beginPath(); g.ellipse(14, -86, 7, 4, 0, 0, TAU); g.fill();
}];
F.oven.anim = (ctx, o, t) => {
  const k = 0.55 + 0.25 * Math.sin(t * 2.3) + 0.1 * Math.sin(t * 7.1);
  const gr = ctx.createLinearGradient(0, -34, 0, -8); gr.addColorStop(0, rgba('#ff9a3a', 0.15 * k)); gr.addColorStop(1, rgba('#ffcf6a', 0.75 * k));
  ctx.fillStyle = gr; ctx.fillRect(-22, -32, 44, 22);
  ctx.fillStyle = rgba('#ffb04a', 0.12 * k); ctx.beginPath(); ctx.ellipse(0, 6, 34, 10, 0, 0, TAU); ctx.fill();
};

F.fridge = [76, 190, 10, (g, R) => {
  fshadow(g, 62, 52);
  box(g, 0, 0, 62, 48, 124, '#eef0f2', '#dfe3e8', 5);
  g.strokeStyle = '#b8bec8'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-31, -84); g.lineTo(31, -84); g.stroke();
  g.fillStyle = '#9aa0ab'; rrect(g, 22, -118, 3, 26, 1.5); g.fill(); rrect(g, 22, -78, 3, 34, 1.5); g.fill();
  // magnets, a photo, a drawing, a shopping list
  g.fillStyle = '#fff'; g.fillRect(-22, -116, 16, 13); g.fillStyle = '#8fc4ff'; g.fillRect(-20, -114, 12, 7); g.fillStyle = '#7fd8a6'; g.fillRect(-20, -108, 12, 3);
  g.fillStyle = '#fff6e5'; g.fillRect(-2, -112, 14, 18); g.fillStyle = rgba(INK, 0.4); for (let i = 0; i < 5; i++) g.fillRect(0, -108 + i * 3, 6 + R() * 5, 1);
  for (const [mx, my, c] of [[-14, -118, '#ff5d5d'], [5, -114, '#ffc94a'], [-10, -70, '#5aa4e6'], [8, -60, '#7fd8a6']]) { g.fillStyle = c; g.beginPath(); g.arc(mx, my, 2.5, 0, TAU); g.fill(); }
  g.fillStyle = '#ffc94a'; g.fillRect(-18, -66, 18, 14); g.strokeStyle = '#ff5d5d'; g.lineWidth = 1.2; g.beginPath(); g.arc(-9, -59, 4, 0, TAU); g.stroke();
}];

F.island = [166, 130, 12, (g, R, v, room) => {
  fshadow(g, 150, 72);
  const cab = tint('#5b7fa6', room, 0.15);
  box(g, 0, 0, 150, 68, 44, '#d9d4c8', cab, 3);
  for (let i = 0; i < 4; i++) { g.strokeStyle = rgba('#000', 0.2); g.strokeRect(-70 + i * 35.5, -34, 32, 31); knob(g, -70 + i * 35.5 + 16, -30, 1.5, '#d8c79a'); }
  box(g, 0, -40, 156, 72, 5, '#efe9df', '#cfc6b5', 3);
  // marble veins
  g.strokeStyle = rgba('#a59c8c', 0.4); g.lineWidth = 0.8; for (let i = 0; i < 6; i++) { g.beginPath(); const x0 = -70 + R() * 140; g.moveTo(x0, -116); g.bezierCurveTo(x0 + 10, -100, x0 - 12, -80, x0 + 6, -46); g.stroke(); }
  // bread board with a loaf + the sourdough jar
  g.fillStyle = '#c99a64'; rrect(g, -60, -100, 52, 30, 5); g.fill();
  g.fillStyle = '#c47a3a'; g.beginPath(); g.ellipse(-34, -86, 20, 10, 0, 0, TAU); g.fill();
  g.fillStyle = '#e6b06a'; g.beginPath(); g.ellipse(-34, -89, 16, 6, 0, 0, TAU); g.fill();
  g.strokeStyle = '#8a4e22'; g.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-40 + i * 8, -93); g.lineTo(-30 + i * 8, -84); g.stroke(); }
  jar(g, 30, -66);
  g.fillStyle = rgba('#ffffff', 0.55); for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(-10 + R() * 30, -96 + R() * 40, 0.8 + R() * 1.2, 0, TAU); g.fill(); }
}];
F.island.anim = (ctx, o, t) => jarBubbles(ctx, 30, -66, t, o.weird ?? 0);
function jar(g, x, y) {
  g.fillStyle = rgba('#dff3ff', 0.55); rrect(g, x - 11, y - 34, 22, 34, 5); g.fill();
  g.fillStyle = '#f3e3c3'; rrect(g, x - 10, y - 22, 20, 21, 4); g.fill();
  g.fillStyle = '#e8d2a8'; g.beginPath(); g.ellipse(x, y - 22, 10, 3, 0, 0, TAU); g.fill();
  g.strokeStyle = rgba('#ffffff', 0.8); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 7, y - 30); g.lineTo(x - 7, y - 6); g.stroke();
  g.fillStyle = '#b5835a'; rrect(g, x - 12, y - 38, 24, 5, 2); g.fill();
  g.fillStyle = '#fff6e5'; g.fillRect(x - 6, y - 16, 12, 7); g.fillStyle = rgba(INK, 0.5); g.fillRect(x - 4, y - 13, 8, 1);
}
/** Bubbling sourdough jar overlay (exported for rooms). Bubbles rise; bigger + spills when weird. */
export function jarBubbles(ctx, x, y, t, weird = 0) {
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.7 + i * 0.27) % 1;
    ctx.fillStyle = rgba('#fffaf0', 0.9 * (1 - k)); ctx.beginPath(); ctx.arc(x - 5 + i * 3.3, y - 4 - k * 16, 0.8 + k * 1.6, 0, TAU); ctx.fill();
  }
  if (weird > 0.05) {
    const s = weird * (1 + 0.15 * Math.sin(t * 4));
    ctx.fillStyle = '#f3e3c3'; ctx.beginPath(); ctx.ellipse(x, y - 38, 12 * s + 2, 5 * s + 1, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 8, y - 30, 4 * s, 9 * s, 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(x - 3, y - 40, 2 * s, 0, TAU); ctx.fill();
  }
}

F.dining_table = [236, 120, 14, (g, R, v, room) => {
  fshadow(g, 220, 90, 0.22);
  g.fillStyle = WOOD.deep; for (const lx of [-100, 96]) g.fillRect(lx, -34, 6, 34);
  box(g, 0, -28, 224, 90, 6, WOOD.oak, WOOD.walnut, 3);
  woodGrain(g, -112, -124, 224, 90, WOOD.oak, R, 8);
  // table runner tinted to room
  g.fillStyle = tint('#f2e6cf', room, 0.3); g.fillRect(-100, -86, 200, 14);
  g.strokeStyle = rgba(INK, 0.15); g.strokeRect(-100, -86, 200, 14);
  // place settings
  for (const px of [-70, 0, 70]) for (const py of [-110, -52]) {
    g.fillStyle = '#fbfaf6'; g.beginPath(); g.ellipse(px, py, 11, 7, 0, 0, TAU); g.fill();
    g.strokeStyle = '#d7cfc0'; g.lineWidth = 1; g.stroke();
    g.fillStyle = tint('#e98aa8', room, 0.2); g.beginPath(); g.ellipse(px, py, 6, 3.6, 0, 0, TAU); g.fill();
    g.fillStyle = '#c4c8d0'; g.fillRect(px + 14, py - 5, 1.5, 10);
  }
  // candles + flowers in the middle
  g.fillStyle = '#fff6e5'; g.fillRect(-36, -96, 4, 12); g.fillRect(32, -96, 4, 12);
  g.fillStyle = '#ffc94a'; g.beginPath(); g.arc(-34, -98, 2, 0, TAU); g.arc(34, -98, 2, 0, TAU); g.fill();
  g.fillStyle = '#5b7fa6'; rrect(g, -6, -92, 12, 10, 3); g.fill();
  for (const [fx, fy, c] of [[-5, -96, '#ff8fb1'], [3, -98, '#ffc94a'], [0, -101, '#fff6e5'], [6, -94, '#e98aa8']]) { g.fillStyle = c; g.beginPath(); g.arc(fx, fy, 3, 0, TAU); g.fill(); }
}];

F.dining_chair = [44, 70, 8, (g, R, v, room) => {
  fshadow(g, 34, 30);
  g.fillStyle = WOOD.walnut; g.fillRect(-14, -20, 3, 20); g.fillRect(11, -20, 3, 20);
  box(g, 0, -18, 32, 28, 4, tint(WOOD.oak, room, 0.1), WOOD.walnut, 3);
  g.fillStyle = tint('#e98aa8', room, 0.5); rrect(g, -12, -48, 24, 22, 4); g.fill();
  g.fillStyle = WOOD.walnut; g.fillRect(-15, -66, 3, 46); g.fillRect(12, -66, 3, 46); g.fillRect(-15, -66, 30, 5); g.fillRect(-15, -56, 30, 3);
}];

F.sideboard = [124, 160, 10, (g, R, v, room) => {
  fshadow(g, 110, 36);
  box(g, 0, 0, 110, 34, 50, WOOD.oak, WOOD.walnut, 2);
  for (let i = 0; i < 2; i++) { g.strokeStyle = rgba('#000', 0.25); g.strokeRect(-50 + i * 51, -42, 48, 36); knob(g, -50 + i * 51 + (i ? 6 : 42), -24, 1.6); }
  // upper glass cabinet with plates
  g.fillStyle = WOOD.walnut; g.fillRect(-52, -136, 104, 54);
  g.fillStyle = tint('#f2e6cf', room, 0.35); g.fillRect(-48, -132, 96, 46);
  g.fillStyle = WOOD.oak; g.fillRect(-50, -110, 100, 3); g.fillRect(-1, -134, 2, 48);
  for (let i = 0; i < 4; i++) for (const sy of [-112, -88]) {
    const px = -38 + i * 25; g.fillStyle = '#fbfaf6'; g.beginPath(); g.arc(px, sy - 9, 9, 0, TAU); g.fill();
    g.strokeStyle = tint('#5b7fa6', room, 0.4); g.lineWidth = 1.5; g.beginPath(); g.arc(px, sy - 9, 6.5, 0, TAU); g.stroke();
  }
  g.fillStyle = rgba('#ffffff', 0.3); g.beginPath(); g.moveTo(-46, -132); g.lineTo(-36, -132); g.lineTo(-46, -112); g.fill();
  g.fillStyle = WOOD.mid; g.fillRect(-56, -142, 112, 7);
}];

F.sofa = [180, 110, 12, (g, R, v, room) => {
  const fab = tint('#7a8fb0', room, 0.35), fabD = shade(fab, -0.22), fabL = shade(fab, 0.18);
  fshadow(g, 160, 64, 0.22);
  // base + seat
  box(g, 0, 0, 152, 50, 24, fab, fabD, 6);
  // back
  g.fillStyle = fabD; rrect(g, -78, -94, 156, 34, 10); g.fill();
  g.fillStyle = fab; rrect(g, -76, -96, 152, 22, 10); g.fill();
  // arms
  for (const s of [-1, 1]) { g.fillStyle = fabD; rrect(g, s * 70 - 12, -80, 24, 80, 10); g.fill(); g.fillStyle = fabL; rrect(g, s * 70 - 11, -82, 22, 22, 9); g.fill(); }
  // cushions
  for (let i = 0; i < 2; i++) { g.fillStyle = fabL; rrect(g, -56 + i * 57, -68, 55, 40, 8); g.fill(); g.strokeStyle = rgba(INK, 0.18); g.stroke(); }
  // throw pillows + crocheted blanket (Victoria)
  g.fillStyle = '#ffc94a'; rrect(g, -60, -92, 22, 18, 6); g.fill();
  g.fillStyle = '#e98aa8'; rrect(g, 38, -92, 22, 18, 6); g.fill();
  g.fillStyle = '#fff3dc'; g.beginPath(); g.moveTo(20, -70); g.lineTo(60, -70); g.lineTo(62, -24); g.lineTo(24, -30); g.closePath(); g.fill();
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = ['#7fd8a6', '#ff8fb1', '#ffc94a', '#5aa4e6'][(i + j) % 4]; g.beginPath(); g.arc(27 + i * 9, -63 + j * 10, 2.6, 0, TAU); g.fill(); }
  g.fillStyle = '#2b2f3a'; for (const lx of [-70, 66]) g.fillRect(lx, -2, 4, 4);
}];

F.tv_stand = [146, 150, 10, (g, R, v, room) => {
  fshadow(g, 130, 36);
  box(g, 0, 0, 130, 34, 30, WOOD.mid, WOOD.walnut, 2);
  for (let i = 0; i < 3; i++) { g.strokeStyle = rgba('#000', 0.25); g.strokeRect(-61 + i * 41, -26, 38, 22); }
  g.fillStyle = '#1b1e27'; g.fillRect(-20, -22, 18, 6); g.fillStyle = PALETTE.mint; g.fillRect(-18, -20, 2, 2); // console
  // TV on stand foot
  g.fillStyle = '#23262e'; g.fillRect(-4, -76, 8, 14); g.fillRect(-18, -66, 36, 4);
  g.fillStyle = '#14161d'; rrect(g, -58, -136, 116, 66, 3); g.fill();
  g.fillStyle = '#22324a'; g.fillRect(-54, -132, 108, 58);
  g.fillStyle = rgba('#ffffff', 0.08); g.beginPath(); g.moveTo(-54, -132); g.lineTo(-20, -132); g.lineTo(-54, -90); g.fill();
  // speakers + plant
  g.fillStyle = '#2b2f3a'; rrect(g, -62, -60, 12, 22, 2); g.fill(); rrect(g, 50, -60, 12, 22, 2); g.fill();
}];
F.tv_stand.anim = (ctx, o, t) => {
  const w = clamp01(o.weird ?? 0);
  if (w > 0.05) { // static snow
    for (let i = 0; i < 40; i++) { const k = Math.sin(i * 91.7 + Math.floor(t * 20) * 13.1); ctx.fillStyle = rgba(k > 0 ? '#ffffff' : '#7fd8a6', 0.35 * w); ctx.fillRect(-54 + ((i * 37 + Math.floor(t * 30) * 11) % 104), -132 + ((i * 53) % 56), 4, 2); }
  } else { // cozy screen: a fireplace channel
    const k = 0.7 + 0.3 * Math.sin(t * 6);
    ctx.fillStyle = rgba('#ff9a3a', 0.35 * k); ctx.beginPath(); ctx.ellipse(0, -84, 30, 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#ffd98a', 0.4 * k); ctx.beginPath(); ctx.ellipse(0, -88, 14, 9 + Math.sin(t * 9) * 2, 0, 0, TAU); ctx.fill();
  }
};

F.coffee_table = [110, 80, 10, (g, R) => {
  fshadow(g, 96, 50);
  g.fillStyle = WOOD.deep; for (const lx of [-44, 40]) g.fillRect(lx, -18, 4, 18);
  box(g, 0, -16, 98, 50, 6, WOOD.oak, WOOD.walnut, 4); woodGrain(g, -49, -72, 98, 50, WOOD.oak, R, 5);
  g.fillStyle = '#5b7fa6'; g.fillRect(-36, -60, 26, 18); g.fillStyle = '#ffc94a'; g.fillRect(-33, -64, 24, 16);
  g.fillStyle = '#fff6e5'; g.beginPath(); g.arc(18, -48, 6, 0, TAU); g.fill(); g.fillStyle = '#7a4e32'; g.beginPath(); g.arc(18, -48, 4, 0, TAU); g.fill();
  g.fillStyle = '#c96f4a'; rrect(g, 30, -66, 10, 9, 2); g.fill(); leaf(g, 35, -66, 9, -2, '#5fae5c'); leaf(g, 35, -66, 9, -1.1, '#4f9a52');
}];

F.armchair = [80, 100, 10, (g, R, v, room) => {
  const fab = tint('#c9a0dc', room, 0.3), fabD = shade(fab, -0.22), fabL = shade(fab, 0.15);
  fshadow(g, 64, 56);
  box(g, 0, 0, 58, 44, 22, fab, fabD, 6);
  g.fillStyle = fabD; rrect(g, -32, -84, 64, 30, 10); g.fill(); g.fillStyle = fab; rrect(g, -30, -86, 60, 20, 9); g.fill();
  for (const s of [-1, 1]) { g.fillStyle = fabD; rrect(g, s * 27 - 8, -70, 16, 70, 7); g.fill(); g.fillStyle = fabL; rrect(g, s * 27 - 7, -72, 14, 16, 7); g.fill(); }
  g.fillStyle = fabL; rrect(g, -19, -62, 38, 34, 7); g.fill();
}];

F.toy_shelf = [114, 110, 10, (g, R) => {
  fshadow(g, 100, 32);
  box(g, 0, 0, 100, 30, 64, '#f3e3c3', '#e9dcc4', 3);
  const bins = ['#ff5d5d', '#5aa4e6', '#ffc94a', '#7fd8a6', '#c9a0dc', '#f29f2e'];
  for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
    const x = -46 + i * 31, y = -32 - r * 30 + 30;
    g.fillStyle = bins[r * 3 + i]; rrect(g, x, y - 26, 28, 24, 3); g.fill();
    g.fillStyle = rgba('#ffffff', 0.35); g.fillRect(x + 3, y - 23, 22, 3);
  }
  // toys on top: block tower, ball, dino
  for (let i = 0; i < 3; i++) { g.fillStyle = bins[i + 2]; g.fillRect(-40 + i * 2, -100 - i * 9, 10, 9); }
  g.fillStyle = '#ff5d5d'; g.beginPath(); g.arc(8, -86, 7, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(2, -87, 12, 2);
  g.fillStyle = '#7fd8a6'; g.beginPath(); g.ellipse(32, -84, 10, 6, 0, 0, TAU); g.fill(); g.fillRect(36, -96, 5, 10); g.beginPath(); g.arc(40, -97, 4, 0, TAU); g.fill();
}];

F.toy_box = [84, 90, 10, (g, R) => {
  fshadow(g, 70, 42);
  box(g, 0, 0, 68, 40, 30, '#e05a4a', '#c4473a', 4);
  g.fillStyle = '#ffc94a'; g.fillRect(-34, -18, 68, 4); g.fillRect(-4, -30, 8, 12);
  // lid ajar with toys peeking
  g.fillStyle = '#c4473a'; rrect(g, -36, -76, 72, 10, 4); g.fill();
  g.fillStyle = '#5aa4e6'; g.beginPath(); g.arc(-14, -70, 6, 0, TAU); g.fill();
  g.fillStyle = '#c99a64'; g.beginPath(); g.arc(10, -72, 7, 0, TAU); g.fill(); g.beginPath(); g.arc(5, -78, 3, 0, TAU); g.arc(15, -78, 3, 0, TAU); g.fill();
  g.fillStyle = INK; g.fillRect(8, -73, 1.5, 1.5); g.fillRect(12, -73, 1.5, 1.5);
  // stars stencil
  g.fillStyle = rgba('#ffffff', 0.6); for (const sx of [-24, 22]) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 2 : 5; g.lineTo(sx + Math.cos(a) * r, -8 + Math.sin(a) * r * 0.8); } g.fill(); }
}];

F.bed = [150, 240, 12, (g, R, v, room) => {
  const quilt = tint('#ff8fb1', room, 0.2);
  fshadow(g, 130, 170, 0.22);
  // frame
  box(g, 0, 0, 130, 160, 20, '#f6f1e7', WOOD.walnut, 4);
  // headboard (back)
  g.fillStyle = WOOD.walnut; rrect(g, -68, -226, 136, 46, 10); g.fill(); g.fillStyle = WOOD.mid; rrect(g, -62, -222, 124, 36, 8); g.fill();
  // pillows
  for (const px of [-30, 30]) { g.fillStyle = '#fffaf2'; rrect(g, px - 26, -176, 52, 24, 9); g.fill(); g.strokeStyle = rgba(INK, 0.12); g.stroke(); }
  // quilt (patchwork) with folded top
  g.fillStyle = quilt; rrect(g, -64, -146, 128, 140, 6); g.fill();
  const pats = [quilt, '#ffc94a', '#7fd8a6', '#fff3dc', '#5aa4e6', shade(quilt, 0.2)];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) { g.fillStyle = pats[Math.floor(R() * pats.length)]; g.fillRect(-60 + i * 20, -128 + j * 17, 19, 16); }
  g.strokeStyle = rgba('#fff', 0.7); g.setLineDash([2, 2]); g.lineWidth = 0.8;
  for (let i = 0; i <= 6; i++) { g.beginPath(); g.moveTo(-60 + i * 20, -128); g.lineTo(-60 + i * 20, -9); g.stroke(); }
  g.setLineDash([]);
  g.fillStyle = '#fffaf2'; rrect(g, -64, -150, 128, 20, 6); g.fill();
  g.fillStyle = shade(quilt, -0.2); g.fillRect(-64, -10, 128, 10);
}];

F.dresser = [118, 120, 10, (g, R, v, room) => {
  fshadow(g, 104, 42);
  box(g, 0, 0, 104, 38, 58, WOOD.oak, WOOD.mid, 2);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) { g.strokeStyle = rgba('#000', 0.22); g.strokeRect(-49 + i * 50, -54 + r * 17, 47, 15); knob(g, -49 + i * 50 + 23, -47 + r * 17, 1.5, '#e8d6a8'); }
  // mirror + jewelry dish + folded clothes
  g.fillStyle = WOOD.walnut; rrect(g, -30, -128, 60, 34, 14); g.fill(); g.fillStyle = '#cfe6f2'; rrect(g, -26, -124, 52, 28, 12); g.fill();
  g.fillStyle = rgba('#ffffff', 0.5); g.beginPath(); g.moveTo(-18, -122); g.lineTo(-8, -122); g.lineTo(-20, -100); g.fill();
  g.fillStyle = tint('#ff8fb1', room, 0.3); rrect(g, 24, -88, 22, 10, 3); g.fill(); g.fillStyle = '#5b7fa6'; rrect(g, 25, -94, 20, 7, 3); g.fill();
  g.fillStyle = '#fff6e5'; g.beginPath(); g.ellipse(-36, -78, 8, 4, 0, 0, TAU); g.fill(); g.fillStyle = '#ffc94a'; g.beginPath(); g.arc(-38, -79, 1.5, 0, TAU); g.arc(-34, -78, 1.2, 0, TAU); g.fill();
}];

F.nightstand = [52, 80, 8, (g) => {
  fshadow(g, 40, 34);
  box(g, 0, 0, 40, 32, 32, WOOD.oak, WOOD.mid, 2);
  g.strokeStyle = rgba('#000', 0.22); g.strokeRect(-17, -28, 34, 12); knob(g, 0, -22, 1.4, '#e8d6a8');
  // lamp
  g.fillStyle = '#c4c8d0'; g.fillRect(-1.5, -66, 3, 12); g.fillStyle = '#d9c7a0'; g.beginPath(); g.ellipse(0, -55, 7, 3, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff3dc'; g.beginPath(); g.moveTo(-10, -66); g.lineTo(10, -66); g.lineTo(6, -80); g.lineTo(-6, -80); g.closePath(); g.fill();
}];
F.nightstand.anim = (ctx, o, t) => { ctx.fillStyle = rgba(LAMP, 0.22 + 0.03 * Math.sin(t * 2)); ctx.beginPath(); ctx.arc(0, -70, 22, 0, TAU); ctx.fill(); };

F.wardrobe = [110, 190, 10, (g, R) => {
  fshadow(g, 96, 46);
  box(g, 0, 0, 96, 42, 130, WOOD.mid, WOOD.walnut, 2);
  g.strokeStyle = rgba('#000', 0.3); g.beginPath(); g.moveTo(0, -128); g.lineTo(0, -6); g.stroke();
  for (const s of [-1, 1]) { g.strokeRect(s > 0 ? 4 : -44, -122, 40, 92); knob(g, s * 6, -70, 1.8, '#e8d6a8'); }
  g.fillStyle = WOOD.dark; g.fillRect(-48, -24, 96, 4);
  // sleeve poking out of the door gap
  g.fillStyle = '#5b7fa6'; g.beginPath(); g.moveTo(-1, -60); g.lineTo(6, -56); g.lineTo(4, -44); g.lineTo(-1, -48); g.fill();
}];

F.laundry_pile = [64, 50, 8, (g, R) => {
  g.fillStyle = 'rgba(30,18,10,0.15)'; g.beginPath(); g.ellipse(0, -10, 26, 12, 0, 0, TAU); g.fill();
  const cols = ['#5b7fa6', '#8d95a3', '#ff8fb1', '#fff3dc', '#7fd8a6', '#2b2f3a', '#ffc94a'];
  for (let i = 0; i < 9; i++) {
    const x = (R() - 0.5) * 34, y = -6 - R() * 18 - (i > 5 ? 8 : 0);
    g.fillStyle = cols[Math.floor(R() * cols.length)]; g.beginPath(); g.ellipse(x, y, 9 + R() * 6, 5 + R() * 3, R() * 3, 0, TAU); g.fill();
    g.strokeStyle = rgba(INK, 0.15); g.stroke();
  }
  // a striped sock on top
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-6, -30); g.lineTo(6, -28); g.lineTo(8, -22); g.stroke();
  g.strokeStyle = '#ff5d5d'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-2, -32); g.lineTo(-2, -27); g.moveTo(3, -31); g.lineTo(3, -26); g.stroke();
}];

F.bathtub = [156, 120, 10, (g, R) => {
  fshadow(g, 140, 70);
  box(g, 0, 0, 140, 66, 34, '#f4f6f8', '#e4e8ee', 16);
  g.fillStyle = '#bfe9ff'; rrect(g, -60, -92, 120, 50, 14); g.fill();
  g.fillStyle = rgba('#6fb7e8', 0.5); rrect(g, -60, -80, 120, 38, 14); g.fill();
  for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(-40 + R() * 80, -88 + R() * 10, 3 + R() * 4, 0, TAU); g.fill(); }
  // claw feet + faucet
  g.fillStyle = '#c4a24a'; for (const fx of [-58, 54]) { g.beginPath(); g.arc(fx, -1, 4, 0, TAU); g.fill(); }
  g.fillStyle = '#c4c8d0'; g.fillRect(52, -104, 6, 14); g.fillRect(44, -106, 14, 4);
}];
F.bathtub.anim = (ctx, o, t) => {
  // overflowing trickle when weird
  const w = clamp01(o.weird ?? 0); if (w < 0.05) return;
  ctx.fillStyle = rgba('#8fd0f2', 0.7 * w);
  for (let i = 0; i < 3; i++) { const k = (t * 1.3 + i / 3) % 1; ctx.beginPath(); ctx.arc(-40 + i * 40, -34 + k * 34, 2.5, 0, TAU); ctx.fill(); }
  ctx.fillStyle = rgba('#8fd0f2', 0.4 * w); ctx.beginPath(); ctx.ellipse(0, 6, 80, 12, 0, 0, TAU); ctx.fill();
};

F.grill = [72, 110, 10, (g) => {
  g.fillStyle = 'rgba(30,18,10,0.22)'; g.beginPath(); g.ellipse(2, -8, 26, 10, 0, 0, TAU); g.fill();
  g.strokeStyle = '#23262e'; g.lineWidth = 3; g.beginPath(); g.moveTo(-16, -30); g.lineTo(-20, 0); g.moveTo(16, -30); g.lineTo(20, 0); g.moveTo(0, -28); g.lineTo(0, -6); g.stroke();
  g.fillStyle = '#23262e'; g.beginPath(); g.arc(-20, 0, 4, 0, TAU); g.arc(20, 0, 4, 0, TAU); g.fill();
  g.fillStyle = '#1b1e27'; g.beginPath(); g.ellipse(0, -42, 26, 18, 0, 0, Math.PI); g.fill();
  g.fillStyle = '#2b2f3a'; g.beginPath(); g.ellipse(0, -46, 26, 30, 0, Math.PI, TAU); g.fill();
  g.fillStyle = rgba('#ffffff', 0.18); g.beginPath(); g.ellipse(-9, -60, 7, 10, -0.4, 0, TAU); g.fill();
  g.fillStyle = '#c4c8d0'; g.fillRect(-6, -78, 12, 4);
  g.strokeStyle = '#555c6b'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, -44, 26, 6, 0, 0, TAU); g.stroke();
}];
F.grill.anim = (ctx, o, t) => {
  for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; ctx.fillStyle = rgba('#d8d8d8', 0.35 * (1 - k)); ctx.beginPath(); ctx.arc(Math.sin(t * 2 + i) * 4, -80 - k * 30, 4 + k * 7, 0, TAU); ctx.fill(); }
  ctx.fillStyle = rgba('#ff9a3a', 0.25 + 0.1 * Math.sin(t * 5)); ctx.beginPath(); ctx.ellipse(0, -44, 20, 4, 0, 0, TAU); ctx.fill();
};

F.garden_bed = [156, 90, 10, (g, R) => {
  fshadow(g, 140, 60);
  box(g, 0, 0, 140, 58, 18, '#6b4a2e', WOOD.mid, 3);
  g.fillStyle = '#5a3a24'; g.fillRect(-66, -72, 132, 50);
  for (let i = 0; i < 12; i++) { g.fillStyle = rgba('#3a2414', 0.5); g.beginPath(); g.arc(-60 + R() * 120, -70 + R() * 46, 1.5, 0, TAU); g.fill(); }
  // rows: tomatoes, lettuce, flowers
  for (let i = 0; i < 6; i++) {
    const x = -54 + i * 21;
    for (const a of [-2.4, -1.6, -0.8]) leaf(g, x, -32, 12, a + (R() - 0.5) * 0.4, '#5fae5c');
    g.fillStyle = '#7cc26a'; g.beginPath(); g.arc(x, -58, 7, 0, TAU); g.fill(); g.fillStyle = '#5fae5c'; g.beginPath(); g.arc(x - 2, -60, 4, 0, TAU); g.fill();
    g.fillStyle = '#e05a4a'; g.beginPath(); g.arc(x + 3, -36, 3, 0, TAU); g.fill();
  }
  for (let i = 0; i < 5; i++) { g.fillStyle = ['#ff8fb1', '#ffc94a', '#fff6e5', '#c9a0dc'][i % 4]; g.beginPath(); g.arc(-50 + i * 25, -46, 2.6, 0, TAU); g.fill(); }
}];

F.fence = [140, 80, 6, (g) => {
  g.fillStyle = 'rgba(30,18,10,0.18)'; g.fillRect(-64, -8, 130, 10);
  g.fillStyle = '#e9e2d0'; g.fillRect(-64, -40, 128, 5); g.fillRect(-64, -18, 128, 5);
  for (let i = 0; i < 9; i++) {
    const x = -62 + i * 15;
    g.fillStyle = '#f4efe2'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, -50); g.lineTo(x + 5, -56); g.lineTo(x + 10, -50); g.lineTo(x + 10, 0); g.closePath(); g.fill();
    g.strokeStyle = '#c9bfa8'; g.lineWidth = 1; g.stroke();
  }
}];

F.patio_table = [110, 110, 10, (g) => {
  fshadow(g, 90, 70);
  for (const [cx, cy] of [[-38, -14], [38, -14]]) { // chairs
    g.fillStyle = '#3f7a4a'; rrect(g, cx - 12, cy - 22, 24, 18, 4); g.fill(); g.fillRect(cx - 12, cy - 4, 3, 6); g.fillRect(cx + 9, cy - 4, 3, 6);
    g.fillStyle = shade('#3f7a4a', -0.2); rrect(g, cx - 12, cy - 40, 24, 16, 4); g.fill();
  }
  g.fillStyle = '#23262e'; g.fillRect(-2, -30, 4, 30);
  g.fillStyle = '#e8e2d6'; g.beginPath(); g.ellipse(0, -36, 34, 22, 0, 0, TAU); g.fill(); g.strokeStyle = '#b5ab98'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#d6cdb9'; g.beginPath(); g.ellipse(0, -34, 34, 22, 0, 0.1, Math.PI - 0.1); g.lineTo(-34, -36); g.fill();
  g.fillStyle = '#e8e2d6'; g.beginPath(); g.ellipse(0, -38, 34, 22, 0, 0, TAU); g.fill();
  g.fillStyle = '#ffc94a'; g.beginPath(); g.arc(-8, -42, 5, 0, TAU); g.fill(); g.fillStyle = '#ff8fb1'; g.beginPath(); g.arc(8, -36, 4, 0, TAU); g.fill();
  g.fillStyle = '#fff'; rrect(g, 4, -50, 8, 10, 2); g.fill();
}];

F.lily_pad = [60, 40, 6, (g, R) => {
  g.fillStyle = 'rgba(20,50,60,0.25)'; g.beginPath(); g.ellipse(2, -14, 22, 13, 0, 0, TAU); g.fill();
  g.fillStyle = '#4f9a52'; g.beginPath(); g.ellipse(0, -16, 22, 14, 0, 0.35, TAU - 0.1); g.lineTo(0, -16); g.closePath(); g.fill();
  g.strokeStyle = '#3f7a4a'; g.lineWidth = 1; g.stroke();
  g.strokeStyle = rgba('#7cc26a', 0.8); for (let i = 0; i < 6; i++) { const a = 0.6 + i * 0.95; g.beginPath(); g.moveTo(0, -16); g.lineTo(Math.cos(a) * 18, -16 + Math.sin(a) * 11); g.stroke(); }
  if (R() < 0.6) { // lotus flower
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#ffd1e0' : '#ff8fb1'; g.beginPath(); g.ellipse(-6 + Math.cos(i) * 3, -22 + Math.sin(i) * 2, 3, 6, i, 0, TAU); g.fill(); }
    g.fillStyle = '#ffc94a'; g.beginPath(); g.arc(-6, -22, 2, 0, TAU); g.fill();
  }
}];

F.rock = [70, 60, 8, (g, R) => {
  const base = '#9a948a';
  g.fillStyle = 'rgba(30,18,10,0.25)'; g.beginPath(); g.ellipse(2, -8, 28, 11, 0, 0, TAU); g.fill();
  g.fillStyle = shade(base, -0.22);
  g.beginPath(); g.moveTo(-27, -4); g.lineTo(-24, -24); g.lineTo(-10, -38); g.lineTo(12, -36); g.lineTo(26, -20); g.lineTo(26, -4); g.quadraticCurveTo(0, 4, -27, -4); g.fill();
  g.fillStyle = base; g.beginPath(); g.moveTo(-22, -12); g.lineTo(-20, -26); g.lineTo(-9, -36); g.lineTo(11, -34); g.lineTo(18, -22); g.lineTo(4, -14); g.closePath(); g.fill();
  g.fillStyle = shade(base, 0.25); g.beginPath(); g.moveTo(-9, -36); g.lineTo(11, -34); g.lineTo(4, -26); g.lineTo(-12, -28); g.closePath(); g.fill();
  g.fillStyle = 'rgba(110,150,80,0.75)'; g.beginPath(); g.ellipse(-14, -6, 10, 4, 0, 0, TAU); g.fill();
}];

F.reeds = [64, 90, 8, (g, R) => {
  g.fillStyle = 'rgba(30,40,30,0.2)'; g.beginPath(); g.ellipse(0, -10, 22, 10, 0, 0, TAU); g.fill();
  for (let i = 0; i < 14; i++) {
    const x = (R() - 0.5) * 36, y = -4 - R() * 16, h = 34 + R() * 34, lean = (R() - 0.5) * 12;
    g.strokeStyle = R() < 0.5 ? '#5f8f4a' : '#7aa35a'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h); g.stroke();
    if (R() < 0.4) { g.fillStyle = '#6b4423'; rrect(g, x + lean - 2.5, y - h - 2, 5, 12, 2.5); g.fill(); }
  }
}];

F.plant = [56, 90, 8, (g, R) => {
  g.fillStyle = 'rgba(30,18,10,0.2)'; g.beginPath(); g.ellipse(2, -6, 17, 7, 0, 0, TAU); g.fill();
  g.fillStyle = '#c96f4a'; g.beginPath(); g.moveTo(-13, -26); g.lineTo(13, -26); g.lineTo(10, 0); g.lineTo(-10, 0); g.closePath(); g.fill();
  g.fillStyle = '#b05e3d'; g.fillRect(-14, -28, 28, 5); g.fillStyle = '#4a3020'; g.beginPath(); g.ellipse(0, -28, 12, 3, 0, 0, TAU); g.fill();
  // monstera-ish leaves
  const greens = ['#3f7a4a', '#4f9a52', '#5fae5c', '#7cc26a'];
  for (let i = 0; i < 13; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.8; leaf(g, 0, -30, 28 + R() * 20, a, greens[Math.floor(R() * 4)]); }
}];

F.floor_lamp = [44, 140, 8, (g) => {
  g.fillStyle = 'rgba(30,18,10,0.2)'; g.beginPath(); g.ellipse(2, -4, 13, 5, 0, 0, TAU); g.fill();
  g.fillStyle = '#2b2f3a'; g.beginPath(); g.ellipse(0, -3, 10, 4, 0, 0, TAU); g.fill(); g.fillRect(-1.5, -100, 3, 98);
  g.fillStyle = '#fff3dc'; g.beginPath(); g.moveTo(-14, -96); g.lineTo(14, -96); g.lineTo(9, -120); g.lineTo(-9, -120); g.closePath(); g.fill();
  g.strokeStyle = '#e8d2a8'; g.lineWidth = 1; g.stroke();
}];
F.floor_lamp.anim = (ctx, o, t) => {
  const k = 1 - 0.5 * clamp01(o.weird ?? 0) * (Math.sin(t * 23) > 0.7 ? 1 : 0);
  ctx.fillStyle = rgba(LAMP, 0.18 * k); ctx.beginPath(); ctx.arc(0, -104, 34, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba(LAMP, 0.12 * k); ctx.beginPath(); ctx.ellipse(0, 2, 36, 12, 0, 0, TAU); ctx.fill();
};

F.server_rack = [70, 150, 10, (g) => {
  fshadow(g, 56, 40);
  box(g, 0, 0, 56, 38, 124, '#3a3f4d', '#23262e', 3);
  for (let i = 0; i < 7; i++) {
    const y = -118 + i * 16;
    g.fillStyle = '#2b2f3a'; g.fillRect(-24, y, 48, 13);
    g.fillStyle = '#14161d'; for (let k = 0; k < 6; k++) g.fillRect(-20 + k * 5, y + 4, 3, 5);
  }
  g.strokeStyle = '#5aa4e6'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-26, -100); g.bezierCurveTo(-36, -70, -30, -30, -24, -4); g.stroke();
  g.strokeStyle = '#ffc94a'; g.beginPath(); g.moveTo(26, -84); g.bezierCurveTo(34, -60, 30, -20, 22, -2); g.stroke();
}];
F.server_rack.anim = (ctx, o, t) => {
  const w = clamp01(o.weird ?? 0);
  for (let i = 0; i < 7; i++) for (let k = 0; k < 3; k++) {
    const on = Math.sin(t * (3 + k * 2.3) + i * 1.7 + k) > (w > 0.3 ? -0.2 : 0.2);
    ctx.fillStyle = on ? (w > 0.5 && (i + k) % 3 === 0 ? PALETTE.danger : PALETTE.mint) : '#1b3a2a';
    ctx.fillRect(10 + k * 4, -114 + i * 16, 2.5, 2.5);
  }
};

F.starter_jar = [60, 90, 8, (g) => {
  g.fillStyle = 'rgba(30,18,10,0.2)'; g.beginPath(); g.ellipse(2, -6, 20, 8, 0, 0, TAU); g.fill();
  g.save(); g.scale(1.6, 1.6); jar(g, 0, 0); g.restore();
}];
F.starter_jar.anim = (ctx, o, t) => { ctx.save(); ctx.scale(1.6, 1.6); jarBubbles(ctx, 0, 0, t, o.weird ?? 0); ctx.restore(); };

F.sink = [78, 140, 10, (g, R, v, room) => {
  fshadow(g, 64, 42);
  box(g, 0, 0, 64, 40, 50, '#f4f6f8', tint('#dfe3e8', room, 0.15), 4);
  g.strokeStyle = rgba(INK, 0.2); g.strokeRect(-28, -42, 26, 36); g.strokeRect(2, -42, 26, 36);
  g.fillStyle = '#cfd6de'; rrect(g, -22, -84, 44, 26, 10); g.fill();
  g.fillStyle = '#9fb6c8'; rrect(g, -18, -80, 36, 18, 8); g.fill();
  g.fillStyle = '#c4c8d0'; g.fillRect(-2, -98, 4, 14); g.fillRect(-2, -98, 12, 3);
  g.fillStyle = '#cfe6f2'; rrect(g, -18, -134, 36, 30, 6); g.fill(); g.strokeStyle = '#c4c8d0'; g.lineWidth = 2; g.stroke();
}];
F.sink.anim = (ctx, o, t) => {
  const w = clamp01(o.weird ?? 0); if (w < 0.05) return;
  ctx.fillStyle = rgba('#8fd0f2', 0.85 * w);
  for (let i = 0; i < 3; i++) { const k = (t * 2 + i / 3) % 1; ctx.beginPath(); ctx.arc(8 + Math.sin(i) * 2, -94 + k * 20, 1.6, 0, TAU); ctx.fill(); }
  ctx.fillStyle = rgba('#8fd0f2', 0.35 * w); ctx.beginPath(); ctx.ellipse(0, 4, 40, 9, 0, 0, TAU); ctx.fill();
};

const RUGS = ['#a8483a', '#5b7fa6', '#3f7a4a'];
F.rug = [232, 150, 8, (g, R, v, room) => {
  const base = tint(RUGS[v], room, 0.35), edge = shade(base, -0.25), light = shade(base, 0.35);
  if (v === 1) { // round
    g.fillStyle = edge; g.beginPath(); g.ellipse(0, -70, 110, 70, 0, 0, TAU); g.fill();
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? base : light; g.beginPath(); g.ellipse(0, -70, 100 - i * 24, 62 - i * 15, 0, 0, TAU); g.fill(); }
    return;
  }
  g.fillStyle = edge; rrect(g, -110, -140, 220, 140, 6); g.fill();
  g.fillStyle = base; rrect(g, -102, -132, 204, 124, 4); g.fill();
  g.strokeStyle = light; g.lineWidth = 3; g.strokeRect(-90, -120, 180, 100);
  if (v === 0) { // medallion
    g.fillStyle = light; g.beginPath(); g.moveTo(0, -112); g.lineTo(46, -70); g.lineTo(0, -28); g.lineTo(-46, -70); g.closePath(); g.fill();
    g.fillStyle = edge; g.beginPath(); g.moveTo(0, -96); g.lineTo(28, -70); g.lineTo(0, -44); g.lineTo(-28, -70); g.closePath(); g.fill();
    g.fillStyle = CREAM; g.beginPath(); g.arc(0, -70, 7, 0, TAU); g.fill();
  } else { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? light : CREAM; g.fillRect(-90, -110 + i * 15, 180, 6); } }
  g.strokeStyle = CREAM; g.lineWidth = 1;
  for (let x = -106; x <= 106; x += 4) { g.beginPath(); g.moveTo(x, -140); g.lineTo(x, -145); g.moveTo(x, 0); g.lineTo(x, 5); g.stroke(); }
}];

F.block_tower = [56, 100, 8, (g, R) => {
  g.fillStyle = 'rgba(30,18,10,0.2)'; g.beginPath(); g.ellipse(2, -10, 22, 10, 0, 0, TAU); g.fill();
  const cols = ['#ff5d5d', '#5aa4e6', '#ffc94a', '#7fd8a6', '#c9a0dc', '#f29f2e'];
  const letters = 'EMOH';
  for (let i = 0; i < 4; i++) {
    const x = (R() - 0.5) * 6, y = -4 - i * 15, c = cols[i % 6];
    box(g, x, y, 22, 14, 13, shade(c, 0.2), c, 2);
    g.fillStyle = '#fff'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText(letters[i], x, y - 3);
  }
  box(g, 14, 0, 14, 10, 10, shade('#7fd8a6', 0.2), '#7fd8a6', 2);
}];

F.play_table = [112, 100, 10, (g, R) => {
  fshadow(g, 96, 64);
  for (const [cx, cy, c] of [[-44, -6, '#ff5d5d'], [44, -6, '#5aa4e6']]) { box(g, cx, cy, 16, 14, 14, shade(c, 0.2), c, 3); }
  g.fillStyle = '#e9dcc4'; for (const lx of [-40, 36]) g.fillRect(lx, -24, 4, 24);
  box(g, 0, -20, 92, 60, 5, '#ffc94a', '#f29f2e', 5);
  g.fillStyle = '#fff'; g.fillRect(-30, -74, 30, 22); g.fillStyle = '#5aa4e6'; g.beginPath(); g.arc(-18, -64, 5, 0, TAU); g.fill();
  g.fillStyle = '#7fd8a6'; g.fillRect(-26, -58, 20, 3);
  for (let i = 0; i < 5; i++) { g.fillStyle = ['#ff5d5d', '#5aa4e6', '#7fd8a6', '#c9a0dc', '#f29f2e'][i]; g.save(); g.translate(12 + i * 5, -60); g.rotate(0.3 * (R() - 0.5)); g.fillRect(-1.5, -9, 3, 18); g.restore(); }
}];

F.laundry_basket = [64, 80, 8, (g, R) => {
  g.fillStyle = 'rgba(30,18,10,0.2)'; g.beginPath(); g.ellipse(2, -8, 26, 10, 0, 0, TAU); g.fill();
  const cols = ['#5b7fa6', '#ff8fb1', '#fff3dc', '#7fd8a6', '#8d95a3'];
  for (let i = 0; i < 6; i++) { g.fillStyle = cols[i % 5]; g.beginPath(); g.ellipse(-14 + i * 6, -48 - R() * 6, 9, 6, R() * 3, 0, TAU); g.fill(); }
  g.fillStyle = '#d9b47a'; g.beginPath(); g.moveTo(-24, -46); g.lineTo(24, -46); g.lineTo(20, 0); g.lineTo(-20, 0); g.closePath(); g.fill();
  g.strokeStyle = '#b08850'; g.lineWidth = 1;
  for (let y = -40; y < 0; y += 6) { g.beginPath(); g.moveTo(-23 + (y + 46) * 0.08, y); g.lineTo(23 - (y + 46) * 0.08, y); g.stroke(); }
  for (let x = -18; x <= 18; x += 6) { g.beginPath(); g.moveTo(x * 1.1, -46); g.lineTo(x * 0.9, 0); g.stroke(); }
  g.fillStyle = '#c99a64'; g.fillRect(-25, -48, 50, 4);
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(16, -44); g.quadraticCurveTo(26, -34, 24, -18); g.stroke();
}];

F.guest_bed = [120, 210, 12, (g, R, v, room) => {
  const quilt = tint('#8fb8d8', room, 0.15);
  fshadow(g, 100, 150, 0.22);
  box(g, 0, 0, 100, 140, 18, '#f6f1e7', WOOD.oak, 4);
  g.fillStyle = WOOD.oak; rrect(g, -52, -196, 104, 40, 6); g.fill(); g.fillStyle = WOOD.light; for (let i = 0; i < 5; i++) g.fillRect(-44 + i * 20, -190, 8, 30);
  g.fillStyle = '#fffaf2'; rrect(g, -30, -154, 60, 22, 9); g.fill();
  g.fillStyle = quilt; rrect(g, -48, -126, 96, 118, 6); g.fill();
  g.strokeStyle = rgba('#ffffff', 0.5); g.lineWidth = 1;
  for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(-48, -126 + i * 20); g.lineTo(48, -126 + i * 20); g.stroke(); }
  g.fillStyle = '#fffaf2'; rrect(g, -48, -130, 96, 16, 5); g.fill();
  g.fillStyle = shade(quilt, -0.2); g.fillRect(-48, -8, 96, 8);
  g.fillStyle = '#fff6e5'; rrect(g, 10, -60, 28, 16, 3); g.fill(); g.fillStyle = '#e98aa8'; g.fillRect(10, -50, 28, 2);
}];

F.hedge = [136, 120, 10, (g, R) => {
  fshadow(g, 120, 40, 0.25);
  box(g, 0, 0, 120, 38, 50, '#5fae5c', '#3f7a4a', 14, false);
  for (let i = 0; i < 40; i++) { g.fillStyle = ['#4f9a52', '#5fae5c', '#7cc26a', '#3f7a4a'][Math.floor(R() * 4)]; g.beginPath(); g.arc(-56 + R() * 112, -86 + R() * 80, 4 + R() * 5, 0, TAU); g.fill(); }
  for (let i = 0; i < 6; i++) { g.fillStyle = '#fff6e5'; g.beginPath(); g.arc(-50 + R() * 100, -84 + R() * 30, 1.6, 0, TAU); g.fill(); }
}];

F.tree = [130, 180, 10, (g, R) => {
  g.fillStyle = 'rgba(16,19,31,0.22)'; g.beginPath(); g.ellipse(4, -6, 44, 14, 0, 0, TAU); g.fill();
  g.fillStyle = WOOD.deep; g.beginPath(); g.moveTo(-8, 0); g.lineTo(-5, -70); g.lineTo(5, -70); g.lineTo(9, 0); g.closePath(); g.fill();
  g.strokeStyle = WOOD.deep; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -60); g.lineTo(-18, -84); g.moveTo(2, -66); g.lineTo(20, -90); g.stroke();
  const pal = ['#4f9a52', '#5fae5c', '#3f7a4a', '#7cc26a'];
  const blobs = [[0, -118, 42], [-30, -100, 28], [30, -100, 28], [-16, -142, 28], [18, -140, 28]];
  for (const [x, y, r] of blobs) { g.fillStyle = shade(pal[2], -0.12); g.beginPath(); g.arc(x, y + 4, r, 0, TAU); g.fill(); }
  for (const [x, y, r] of blobs) { g.fillStyle = pal[Math.floor(R() * 2)]; g.beginPath(); g.arc(x, y, r - 3, 0, TAU); g.fill(); }
  for (let i = 0; i < 18; i++) { g.fillStyle = rgba(pal[3], 0.7); const a = R() * TAU, d = R() * 36; g.beginPath(); g.arc(Math.cos(a) * d - 6, -124 + Math.sin(a) * d * 0.7 - 6, 4 + R() * 4, 0, TAU); g.fill(); }
}];

F.light_post = [40, 130, 8, (g) => {
  g.fillStyle = 'rgba(16,19,31,0.22)'; g.beginPath(); g.ellipse(2, -3, 10, 4, 0, 0, TAU); g.fill();
  g.fillStyle = WOOD.dark; g.fillRect(-3, -108, 6, 108); g.fillStyle = WOOD.mid; g.fillRect(-3, -108, 2, 108);
  g.fillStyle = WOOD.deep; g.fillRect(-8, -110, 16, 4);
  g.fillStyle = '#23262e'; g.fillRect(-0.5, -106, 1, 6);
}];
F.light_post.anim = (ctx, o, t) => {
  const lit = clamp01(o.lit ?? 0);
  ctx.fillStyle = lit > 0 ? mix('#8a7a5a', LAMP, lit) : '#8a7a5a'; ctx.beginPath(); ctx.ellipse(0, -96, 3.5, 4.5, 0, 0, TAU); ctx.fill();
  if (lit > 0) {
    const k = lit * (0.85 + 0.15 * Math.sin(t * 3));
    ctx.fillStyle = rgba(LAMP, 0.35 * k); ctx.beginPath(); ctx.arc(0, -96, 16, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(LAMP, 0.12 * k); ctx.beginPath(); ctx.ellipse(0, 0, 34, 12, 0, 0, TAU); ctx.fill();
  }
};

export const FURNITURE_KINDS = Object.keys(FURNITURE_SIZE);
const TILED = new Set(['counter', 'hedge', 'fence', 'garden_bed']);

/**
 * Draw a furniture piece. (x, y) = base point. o: { t?, weird? 0..1, seed? 0..1 (variant), room? (tints fabrics
 * to the room accent), flip? (mirror horizontally), alpha?, scale? }. Returns false for unknown kinds.
 */
export function drawFurniture(ctx, game, kind, x, y, o = {}) {
  const k = F[kind] ? kind : FURNITURE_ALIASES[kind];
  const def = F[k];
  if (!def) return false;
  kind = k;
  const [cw, chH, below, paint] = def;
  const v = Math.floor(((o.seed ?? 0) % 1 + 1) % 1 * 3);
  const room = o.room ?? '';
  const canvas = cached(`aw-f:${kind}:${v}:${room}`, cw, chH + below, (g) => {
    g.translate(cw / 2, chH);
    paint(g, rng(1000 + v * 77 + kind.length * 13), v, room);
  });
  ctx.save();
  ctx.translate(x, y);
  const s = o.scale ?? 1; if (s !== 1) ctx.scale(s, s);
  if (o.flip) ctx.scale(-1, 1);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  const fs = FURNITURE_SIZE[kind];
  if (kind === 'rug' && (o.w || o.d)) { // stretch the flat rug to any footprint
    ctx.scale((o.w ?? fs.w) / fs.w, (o.d ?? fs.h) / fs.h); ctx.drawImage(canvas, -cw / 2, -chH);
  } else if (TILED.has(kind) && o.w && Math.abs(o.w - fs.w) > 4) { // repeat sections across a custom width
    const n = Math.max(1, Math.round(o.w / fs.w)), sw = o.w / n;
    for (let i = 0; i < n; i++) { ctx.save(); ctx.translate(-o.w / 2 + sw * (i + 0.5), 0); ctx.scale(sw / fs.w, 1); ctx.drawImage(canvas, -cw / 2, -chH); ctx.restore(); }
  } else ctx.drawImage(canvas, -cw / 2, -chH);
  if (def.anim) def.anim(ctx, o, o.t ?? game?.time ?? 0);
  ctx.restore();
  return true;
}
