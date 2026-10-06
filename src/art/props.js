// Props, projectiles, zones, pickups, weather. Owned by: presentation.
// Props are cached per (kind, region, variant, frost bucket) to offscreen canvases.
import { PALETTE } from '../core/theme.js';
import { cached, shade, rrect, rgba, hash2, rng, mix } from './util.js';

const TAU = Math.PI * 2;
const WOOD = '#9a6a42', WOOD_D = '#6e4a2c', WOOD_L = '#c08a5a';
const IRON = '#23262e';

export const PROP_KINDS = ['tree', 'pine', 'rock', 'table', 'umbrella', 'lamp', 'bollard', 'flowerbox', 'door', 'icewall', 'iceblock', 'cart', 'pavilion', 'bench', 'barrel', 'bucket', 'flag'];

// ------------------------------------------------------------------ prop painters
// Each: [w, h, draw(g, R, region, v)] — drawn with origin at the base point (canvas bottom centre minus pad).
const P = {};

P.pine = [80, 124, (g, R, region) => {
  const summit = region === 'summit';
  const dark = summit ? '#2f7a3e' : PALETTE.pine, mid = summit ? '#3f9a4c' : shade(PALETTE.pine, 0.12), light = summit ? '#6cc46a' : shade(PALETTE.pine, 0.35);
  const h = 104 + R() * 14;
  g.fillStyle = 'rgba(16,19,31,0.22)'; g.beginPath(); g.ellipse(0, 0, 22, 6, 0, 0, TAU); g.fill();
  g.fillStyle = WOOD_D; g.fillRect(-4, -16, 8, 16);
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers;
    const by = -12 - k * (h - 30), w = 32 - k * 20, th = (h - 12) / tiers + 14;
    g.fillStyle = dark;
    g.beginPath(); g.moveTo(-w, by); g.quadraticCurveTo(0, by + 6, w, by); g.lineTo(0, by - th); g.closePath(); g.fill();
    g.fillStyle = mid;
    g.beginPath(); g.moveTo(-w * 0.15, by + 1); g.quadraticCurveTo(w * 0.5, by + 3, w, by); g.lineTo(0, by - th); g.closePath(); g.fill();
    g.strokeStyle = light; g.lineWidth = 1.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-w * 0.55, by - 3); g.lineTo(-w * 0.2, by - th * 0.45); g.stroke();
  }
}];

P.tree = [96, 112, (g, R, region) => {
  const autumn = region === 'oldcity';
  const pal = autumn ? ['#d9822b', '#e8b04a', '#c4532e', '#7a9a3a'] : ['#4f9a52', '#5fae5c', '#3f7a4a', '#7cc26a'];
  g.fillStyle = 'rgba(16,19,31,0.22)'; g.beginPath(); g.ellipse(0, 0, 26, 7, 0, 0, TAU); g.fill();
  g.fillStyle = WOOD_D;
  g.beginPath(); g.moveTo(-5, 0); g.lineTo(-3, -40); g.lineTo(3, -40); g.lineTo(6, 0); g.closePath(); g.fill();
  g.strokeStyle = WOOD_D; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -34); g.lineTo(-12, -50); g.moveTo(1, -38); g.lineTo(12, -54); g.stroke();
  const blobs = [[0, -70, 30], [-20, -58, 20], [20, -58, 20], [-10, -86, 20], [12, -84, 20]];
  for (const [x, y, r] of blobs) { g.fillStyle = shade(pal[2], -0.1); g.beginPath(); g.arc(x, y + 3, r, 0, TAU); g.fill(); }
  for (const [x, y, r] of blobs) { g.fillStyle = pal[Math.floor(R() * 2)]; g.beginPath(); g.arc(x, y, r - 2, 0, TAU); g.fill(); }
  for (let i = 0; i < 14; i++) {
    g.fillStyle = rgba(pal[3], 0.7); const a = R() * TAU, d = R() * 26;
    g.beginPath(); g.arc(Math.cos(a) * d - 4, -74 + Math.sin(a) * d * 0.7 - 4, 3 + R() * 3, 0, TAU); g.fill();
  }
}];

P.rock = [60, 44, (g, R, region) => {
  const base = region === 'summit' ? '#8f9a9c' : region === 'oldcity' ? '#8a8580' : '#a39a88';
  g.fillStyle = 'rgba(16,19,31,0.25)'; g.beginPath(); g.ellipse(0, -1, 24, 6, 0, 0, TAU); g.fill();
  g.fillStyle = shade(base, -0.2);
  g.beginPath(); g.moveTo(-22, 0); g.lineTo(-20, -18); g.lineTo(-8, -30); g.lineTo(10, -28); g.lineTo(22, -14); g.lineTo(21, 0); g.closePath(); g.fill();
  g.fillStyle = base;
  g.beginPath(); g.moveTo(-18, -4); g.lineTo(-17, -18); g.lineTo(-7, -28); g.lineTo(9, -26); g.lineTo(13, -14); g.lineTo(2, -6); g.closePath(); g.fill();
  g.fillStyle = shade(base, 0.25);
  g.beginPath(); g.moveTo(-7, -28); g.lineTo(9, -26); g.lineTo(3, -18); g.lineTo(-10, -20); g.closePath(); g.fill();
  if (R() < 0.6) { g.fillStyle = 'rgba(110,150,80,0.7)'; g.beginPath(); g.ellipse(-12, -3, 8, 3, 0, 0, TAU); g.fill(); }
}];

P.table = [84, 56, (g) => {
  g.fillStyle = 'rgba(16,19,31,0.22)'; g.beginPath(); g.ellipse(0, -4, 38, 8, 0, 0, TAU); g.fill();
  // benches
  for (const by of [-6, -34]) {
    g.fillStyle = WOOD_D; g.fillRect(-32, by - 2, 4, 6); g.fillRect(28, by - 2, 4, 6);
    g.fillStyle = WOOD; rrect(g, -36, by - 6, 72, 6, 2); g.fill();
    g.fillStyle = WOOD_L; g.fillRect(-36, by - 6, 72, 1.5);
  }
  // A-frame legs + top
  g.strokeStyle = WOOD_D; g.lineWidth = 3;
  g.beginPath(); g.moveTo(-24, -4); g.lineTo(-20, -20); g.moveTo(24, -4); g.lineTo(20, -20); g.stroke();
  g.fillStyle = WOOD; rrect(g, -34, -32, 68, 16, 3); g.fill();
  g.strokeStyle = WOOD_D; g.lineWidth = 1;
  for (const y of [-27, -22]) { g.beginPath(); g.moveTo(-34, y); g.lineTo(34, y); g.stroke(); }
  g.fillStyle = WOOD_L; g.fillRect(-34, -32, 68, 2);
  // gingham cloth corner + a little cup
  g.fillStyle = rgba(PALETTE.danger, 0.75); g.fillRect(-10, -31, 20, 12);
  g.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 4; i++) { g.fillRect(-10 + i * 5, -31, 2.5, 12); g.fillRect(-10, -31 + i * 3, 20, 1.2); }
}];

P.umbrella = [104, 100, (g) => {
  g.fillStyle = 'rgba(16,19,31,0.18)'; g.beginPath(); g.ellipse(4, -2, 40, 10, 0, 0, TAU); g.fill();
  // little round patio table
  g.fillStyle = IRON; g.fillRect(-1.5, -64, 3, 64);
  g.fillStyle = '#e8e2d6'; g.beginPath(); g.ellipse(0, -20, 20, 6, 0, 0, TAU); g.fill();
  g.strokeStyle = '#b5ab98'; g.lineWidth = 1.5; g.stroke();
  g.strokeStyle = IRON; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, -18); g.lineTo(-16, 0); g.moveTo(14, -18); g.lineTo(16, 0); g.stroke();
  // blue canopy (scalloped)
  const blue = PALETTE.lake, blueD = shade(PALETTE.lake, -0.2);
  g.fillStyle = blueD;
  g.beginPath(); g.moveTo(-46, -62);
  for (let i = 0; i < 8; i++) { const x = -46 + i * 11.5; g.quadraticCurveTo(x + 5.75, -55, x + 11.5, -62); }
  g.lineTo(0, -92); g.closePath(); g.fill();
  g.fillStyle = blue;
  g.beginPath(); g.moveTo(-46, -63); g.lineTo(0, -92); g.lineTo(46, -63); g.quadraticCurveTo(0, -70, -46, -63); g.fill();
  g.fillStyle = shade(blue, 0.25);
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, -92); g.lineTo(s * 23, -64); g.lineTo(s * 12, -66); g.closePath(); g.fill(); }
  g.fillStyle = PALETTE.paper; g.beginPath(); g.arc(0, -93, 2.5, 0, TAU); g.fill();
}];

P.lamp = [40, 104, (g) => {
  g.fillStyle = 'rgba(16,19,31,0.25)'; g.beginPath(); g.ellipse(0, 0, 10, 3.5, 0, 0, TAU); g.fill();
  g.fillStyle = IRON;
  rrect(g, -6, -10, 12, 10, 2); g.fill();
  g.fillRect(-2.5, -76, 5, 68);
  g.fillRect(-4.5, -30, 9, 3); g.fillRect(-4, -60, 8, 2);
  // lantern
  g.beginPath(); g.moveTo(-9, -78); g.lineTo(9, -78); g.lineTo(6, -82); g.lineTo(-6, -82); g.closePath(); g.fill();
  g.fillStyle = '#ffe7a8'; g.beginPath(); g.moveTo(-7, -82); g.lineTo(7, -82); g.lineTo(9, -96); g.lineTo(-9, -96); g.closePath(); g.fill();
  g.strokeStyle = IRON; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -82); g.lineTo(0, -96); g.stroke();
  g.fillStyle = IRON; g.beginPath(); g.moveTo(-11, -96); g.lineTo(11, -96); g.lineTo(0, -103); g.closePath(); g.fill();
}];

P.bollard = [20, 36, (g) => {
  g.fillStyle = 'rgba(16,19,31,0.25)'; g.beginPath(); g.ellipse(0, 0, 8, 3, 0, 0, TAU); g.fill();
  g.fillStyle = IRON; rrect(g, -5.5, -28, 11, 28, 4); g.fill();
  g.beginPath(); g.arc(0, -28, 5.5, Math.PI, 0); g.fill();
  g.fillStyle = PALETTE.brick; g.fillRect(-5.5, -22, 11, 6);
  g.fillStyle = PALETTE.danger; g.fillRect(-5.5, -22, 11, 1.5);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-3.5, -30, 2, 28);
}];

P.flowerbox = [64, 46, (g, R) => {
  g.fillStyle = 'rgba(16,19,31,0.22)'; g.beginPath(); g.ellipse(0, -1, 30, 5, 0, 0, TAU); g.fill();
  // mums
  const mums = ['#e8b04a', '#d9822b', '#b04a7a', '#c4532e', '#f2d36b'];
  for (let i = 0; i < 9; i++) {
    const x = -22 + i * 5.5 + (R() - 0.5) * 3, y = -24 - R() * 10;
    g.fillStyle = '#4f7a3a'; g.beginPath(); g.arc(x, y + 5, 5, 0, TAU); g.fill();
    const c = mums[Math.floor(R() * mums.length)];
    g.fillStyle = shade(c, -0.15); g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill();
    g.fillStyle = c;
    for (let p = 0; p < 7; p++) { const a = p * TAU / 7; g.beginPath(); g.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 1.9, 0, TAU); g.fill(); }
    g.fillStyle = shade(c, 0.35); g.beginPath(); g.arc(x, y, 1.5, 0, TAU); g.fill();
  }
  // wooden box
  g.fillStyle = WOOD_D; rrect(g, -29, -20, 58, 20, 2); g.fill();
  g.fillStyle = WOOD; rrect(g, -28, -19, 56, 17, 2); g.fill();
  g.strokeStyle = WOOD_D; g.lineWidth = 1; g.beginPath(); g.moveTo(-28, -11); g.lineTo(28, -11); g.stroke();
  g.fillStyle = WOOD_L; g.fillRect(-29, -21, 58, 2.5);
  // pumpkins
  const pumpkin = (x, y, r) => {
    g.fillStyle = '#d9731e'; g.beginPath(); g.ellipse(x, y, r * 1.2, r, 0, 0, TAU); g.fill();
    g.strokeStyle = '#a8501a'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(x, y, r * 0.5, r, 0, 0, TAU); g.stroke();
    g.fillStyle = '#f29f2e'; g.beginPath(); g.ellipse(x - r * 0.4, y - r * 0.35, r * 0.3, r * 0.2, -0.4, 0, TAU); g.fill();
    g.fillStyle = '#4f7a3a'; g.fillRect(x - 1, y - r - 3, 2, 4);
  };
  pumpkin(-20, -4, 6); if (R() < 0.7) pumpkin(21, -3, 4.5);
}];

P.door = [76, 112, (g, R) => {
  const doorCols = ['#2f5a3a', '#7a2a25', '#1f2f5a', '#2a2a2a'];
  const dc = doorCols[Math.floor(R() * doorCols.length)];
  // brick facade chunk
  g.fillStyle = PALETTE.brickDark; g.fillRect(-36, -108, 72, 104);
  for (let y = -108, row = 0; y < -4; y += 6, row++) for (let x = -36 - (row % 2) * 6; x < 36; x += 12) {
    g.fillStyle = shade(PALETTE.brick, (hash2(x, y, 5) - 0.5) * 0.25);
    g.fillRect(Math.max(-36, x + 0.5), y + 0.5, Math.min(11, 36 - x - 0.5), 5);
  }
  // white trim, fanlight
  g.fillStyle = PALETTE.paper; g.fillRect(-20, -86, 40, 82);
  g.beginPath(); g.arc(0, -86, 20, Math.PI, 0); g.fill();
  g.fillStyle = '#ffe7a8'; g.beginPath(); g.arc(0, -86, 15, Math.PI, 0); g.fill();
  g.strokeStyle = PALETTE.paper; g.lineWidth = 1.5;
  for (let i = 1; i < 5; i++) { const a = Math.PI + i * Math.PI / 5; g.beginPath(); g.moveTo(0, -86); g.lineTo(Math.cos(a) * 15, -86 + Math.sin(a) * 15); g.stroke(); }
  // panel door
  g.fillStyle = dc; g.fillRect(-15, -84, 30, 78);
  g.strokeStyle = shade(dc, -0.3); g.lineWidth = 1.5;
  for (const [x, y, w, h] of [[-12, -80, 10, 22], [2, -80, 10, 22], [-12, -52, 10, 18], [2, -52, 10, 18], [-12, -30, 10, 20], [2, -30, 10, 20]]) g.strokeRect(x, y, w, h);
  g.fillStyle = PALETTE.sun; g.beginPath(); g.arc(9, -44, 1.8, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, -64, 2.2, 0, TAU); g.fill();
  // marble steps
  g.fillStyle = '#e5e1d8'; g.fillRect(-26, -6, 52, 6); g.fillStyle = '#cfc9bd'; g.fillRect(-26, -2, 52, 2);
}];

P.icewall = [76, 66, (g) => {
  g.fillStyle = 'rgba(16,19,31,0.2)'; g.beginPath(); g.ellipse(0, -2, 36, 7, 0, 0, TAU); g.fill();
  const rows = 4, bw = 18, bh = 13;
  for (let r = 0; r < rows; r++) for (let i = -2; i < 2; i++) {
    const x = i * bw + (r % 2 ? bw / 2 : 0) - (r % 2 ? bw / 2 : 0), y = -bh * (r + 1);
    const xx = Math.max(-34, x + (r % 2 ? 9 : 0) - 0), w = Math.min(bw - 1, 34 - xx);
    if (w <= 2) continue;
    const gr = g.createLinearGradient(xx, y, xx + w, y + bh);
    gr.addColorStop(0, PALETTE.ice); gr.addColorStop(1, PALETTE.frost);
    g.fillStyle = gr; rrect(g, xx, y, w, bh - 1, 2.5); g.fill();
    g.strokeStyle = rgba(PALETTE.frostDeep, 0.8); g.lineWidth = 1; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(xx + 2, y + 2, w * 0.4, 1.5);
  }
}];

P.iceblock = [48, 54, (g) => {
  g.fillStyle = 'rgba(16,19,31,0.2)'; g.beginPath(); g.ellipse(0, -1, 18, 5, 0, 0, TAU); g.fill();
  const gr = g.createLinearGradient(-16, -40, 16, 0);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, PALETTE.ice); gr.addColorStop(1, PALETTE.frost);
  g.fillStyle = gr; rrect(g, -16, -36, 32, 34, 4); g.fill();
  g.fillStyle = rgba(PALETTE.frostDeep, 0.5); rrect(g, -16, -10, 32, 8, 3); g.fill();
  g.fillStyle = '#ffffff'; rrect(g, -16, -42, 32, 8, 3); g.fill();
  g.strokeStyle = PALETTE.frostDeep; g.lineWidth = 1.5; rrect(g, -16, -42, 32, 40, 4); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath(); g.moveTo(-12, -32); g.lineTo(-7, -32); g.lineTo(-12, -16); g.closePath(); g.fill();
}];

P.cart = [92, 104, (g) => {
  g.fillStyle = 'rgba(16,19,31,0.22)'; g.beginPath(); g.ellipse(0, -2, 38, 8, 0, 0, TAU); g.fill();
  // umbrella (sun stripes)
  g.fillStyle = PALETTE.paper; g.fillRect(-1.5, -96, 3, 50);
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? PALETTE.paper : PALETTE.sunDeep;
    g.beginPath(); g.moveTo(0, -98); g.lineTo(-36 + i * 12, -76); g.lineTo(-24 + i * 12, -76); g.closePath(); g.fill();
  }
  g.fillStyle = PALETTE.sun; g.beginPath(); g.arc(0, -99, 2.5, 0, TAU); g.fill();
  // cart body
  g.fillStyle = PALETTE.paper; rrect(g, -32, -46, 64, 34, 6); g.fill();
  g.fillStyle = PALETTE.mint; g.fillRect(-32, -30, 64, 6);
  g.fillStyle = PALETTE.mintDeep; g.fillRect(-32, -24, 64, 2);
  g.strokeStyle = shade(PALETTE.paper, -0.25); g.lineWidth = 1.5; rrect(g, -32, -46, 64, 34, 6); g.stroke();
  // scoops in tubs on top
  const flav = [PALETTE.mint, '#ffb3c8', '#f4e3b0', PALETTE.choc];
  flav.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(-21 + i * 14, -48, 6, Math.PI, 0); g.fill(); });
  g.fillStyle = PALETTE.choc; g.fillRect(-23, -51, 1.5, 1.5); g.fillRect(-19, -50, 1.5, 1.5);
  // little cone sign
  g.fillStyle = '#d9a35e'; g.beginPath(); g.moveTo(-6, -40); g.lineTo(6, -40); g.lineTo(0, -32); g.closePath(); g.fill();
  g.fillStyle = '#ffb3c8'; g.beginPath(); g.arc(0, -41, 5, Math.PI, 0); g.fill();
  // wheels + handle
  for (const x of [-20, 20]) {
    g.fillStyle = IRON; g.beginPath(); g.arc(x, -9, 8, 0, TAU); g.fill();
    g.fillStyle = '#9aa3b5'; g.beginPath(); g.arc(x, -9, 3, 0, TAU); g.fill();
  }
  g.strokeStyle = IRON; g.lineWidth = 2.5; g.beginPath(); g.moveTo(32, -40); g.lineTo(42, -48); g.stroke();
}];

P.pavilion = [236, 200, (g) => {
  // octagonal wooden pavilion (3/4 view): deck, 6 visible posts, railing, shingle roof, cupola
  g.fillStyle = 'rgba(16,19,31,0.22)'; g.beginPath(); g.ellipse(0, -6, 108, 26, 0, 0, TAU); g.fill();
  const oct = (rx, ry, cy) => { const pts = []; for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * TAU / 8; pts.push([Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return pts; };
  const poly = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  // deck
  g.fillStyle = WOOD_D; poly(oct(100, 26, -4)); g.fill();
  g.fillStyle = WOOD; poly(oct(98, 24, -9)); g.fill();
  g.strokeStyle = rgba(WOOD_D, 0.6); g.lineWidth = 1;
  for (let x = -90; x < 90; x += 9) { g.beginPath(); g.moveTo(x, -30); g.lineTo(x + 4, 12); g.stroke(); }
  // back posts
  const posts = oct(88, 20, -10);
  const postH = 92;
  for (const [x, y] of posts) if (y < -10) { g.fillStyle = shade(WOOD, -0.15); g.fillRect(x - 4, y - postH, 8, postH); }
  // back railing
  g.strokeStyle = shade(WOOD, -0.1); g.lineWidth = 3;
  poly(posts.map(([x, y]) => [x, y - 26])); g.stroke();
  // picnic table inside
  g.fillStyle = WOOD_L; rrect(g, -30, -32, 60, 12, 3); g.fill();
  g.fillStyle = WOOD_D; g.fillRect(-24, -20, 4, 10); g.fillRect(20, -20, 4, 10);
  // front posts
  for (const [x, y] of posts) if (y >= -10) {
    g.fillStyle = WOOD; g.fillRect(x - 4.5, y - postH, 9, postH);
    g.fillStyle = WOOD_L; g.fillRect(x - 4.5, y - postH, 2.5, postH);
  }
  // front railing with balusters
  g.strokeStyle = WOOD_L; g.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const [x1, y1] = posts[i], [x2, y2] = posts[(i + 1) % 8];
    if (y1 < -10 && y2 < -10) continue;
    if (i === 1) continue; // entrance gap at the front
    g.beginPath(); g.moveTo(x1, y1 - 26); g.lineTo(x2, y2 - 26); g.stroke();
    g.lineWidth = 1.5;
    for (let k = 1; k < 6; k++) { const t = k / 6; g.beginPath(); g.moveTo(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t); g.lineTo(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t - 26); g.stroke(); }
    g.lineWidth = 3;
  }
  // roof: octagonal cone
  const eave = oct(116, 34, -10 - postH);
  const apexY = -10 - postH - 60;
  const roofC = '#5a4a3e', roofL = '#7a6450', roofD = '#3e322a';
  for (let i = 0; i < 8; i++) {
    const [x1, y1] = eave[i], [x2, y2] = eave[(i + 1) % 8];
    const front = (y1 + y2) / 2 > -10 - postH - 2;
    g.fillStyle = front ? ((x1 + x2) < 0 ? roofL : roofC) : roofD;
    g.beginPath(); g.moveTo(0, apexY); g.lineTo(x1, y1); g.lineTo(x2, y2); g.closePath(); g.fill();
  }
  // shingle rows
  g.strokeStyle = 'rgba(30,22,16,0.35)'; g.lineWidth = 1;
  for (let k = 1; k < 5; k++) { const t = k / 5; poly(eave.map(([x, y]) => [x * t, apexY + (y - apexY) * t])); g.stroke(); }
  // fascia
  g.strokeStyle = PALETTE.paper; g.lineWidth = 3;
  g.beginPath(); for (let i = 0; i < 8; i++) { const [x, y] = eave[i]; if (y > -10 - postH - 6) { g.moveTo(x, y); const [x2, y2] = eave[(i + 1) % 8]; g.lineTo(x2, y2); } } g.stroke();
  // cupola
  g.fillStyle = PALETTE.paper; g.fillRect(-8, apexY - 10, 16, 12);
  g.fillStyle = roofD; g.beginPath(); g.moveTo(-12, apexY - 10); g.lineTo(12, apexY - 10); g.lineTo(0, apexY - 22); g.closePath(); g.fill();
  g.fillStyle = PALETTE.sun; g.beginPath(); g.arc(0, apexY - 24, 2.5, 0, TAU); g.fill();
}];

P.bench = [64, 44, (g) => {
  g.fillStyle = 'rgba(16,19,31,0.2)'; g.beginPath(); g.ellipse(0, -1, 28, 5, 0, 0, TAU); g.fill();
  g.strokeStyle = IRON; g.lineWidth = 2.5;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 24, 0); g.lineTo(s * 24, -14); g.lineTo(s * 25, -32); g.stroke(); g.beginPath(); g.moveTo(s * 24, -14); g.lineTo(s * 26, -3); g.stroke(); }
  for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? WOOD_L : WOOD; rrect(g, -28, -32 + i * 5, 56, 4, 1.5); g.fill(); }
  for (let i = 0; i < 2; i++) { g.fillStyle = i ? WOOD : WOOD_L; rrect(g, -28, -16 + i * 4, 56, 4, 1.5); g.fill(); }
}];

P.barrel = [40, 48, (g) => {
  g.fillStyle = 'rgba(16,19,31,0.22)'; g.beginPath(); g.ellipse(0, -1, 15, 4, 0, 0, TAU); g.fill();
  g.fillStyle = WOOD; g.beginPath(); g.moveTo(-12, -2); g.quadraticCurveTo(-16, -18, -12, -34); g.lineTo(12, -34); g.quadraticCurveTo(16, -18, 12, -2); g.closePath(); g.fill();
  g.strokeStyle = WOOD_D; g.lineWidth = 1;
  for (const x of [-6, 0, 6]) { g.beginPath(); g.moveTo(x, -2); g.quadraticCurveTo(x * 1.3, -18, x, -34); g.stroke(); }
  g.strokeStyle = '#4a4f57'; g.lineWidth = 2.5;
  for (const y of [-8, -28]) { g.beginPath(); g.moveTo(-13.5, y); g.quadraticCurveTo(0, y + 2, 13.5, y); g.stroke(); }
  g.fillStyle = WOOD_L; g.beginPath(); g.ellipse(0, -34, 12, 3.5, 0, 0, TAU); g.fill();
  g.strokeStyle = WOOD_D; g.lineWidth = 1; g.stroke();
}];

P.bucket = [28, 26, (g) => {
  // the tiny blue toy bucket easter egg
  g.fillStyle = 'rgba(16,19,31,0.2)'; g.beginPath(); g.ellipse(0, -1, 8, 2.5, 0, 0, TAU); g.fill();
  g.fillStyle = '#3a7fd9'; g.beginPath(); g.moveTo(-6, -2); g.lineTo(-7.5, -13); g.lineTo(7.5, -13); g.lineTo(6, -2); g.closePath(); g.fill();
  g.fillStyle = '#5aa4e6'; g.beginPath(); g.ellipse(0, -13, 7.5, 2.2, 0, 0, TAU); g.fill();
  g.fillStyle = '#d8c79a'; g.beginPath(); g.ellipse(0, -13, 6, 1.5, 0, 0, TAU); g.fill();
  g.strokeStyle = '#2a5fa8'; g.lineWidth = 1; g.beginPath(); g.arc(0, -13, 7, Math.PI, 0); g.stroke();
  g.strokeStyle = PALETTE.sun; g.lineWidth = 1.5; g.beginPath(); g.moveTo(5, -12); g.lineTo(10, -20); g.stroke();
  g.fillStyle = PALETTE.sun; g.beginPath(); g.ellipse(4.5, -11, 2.2, 1.5, 0.6, 0, TAU); g.fill();
}];

P.flag = [70, 100, (g) => {
  g.fillStyle = 'rgba(16,19,31,0.2)'; g.beginPath(); g.ellipse(0, -1, 6, 2, 0, 0, TAU); g.fill();
  g.fillStyle = '#d9d4c8'; g.fillRect(-1.5, -96, 3, 96);
  g.fillStyle = PALETTE.sun; g.beginPath(); g.arc(0, -97, 2.5, 0, TAU); g.fill();
}];

// live overlays (drawn every frame on top of the cached image)
const LIVE = {
  lamp(ctx, o, t) {
    const fl = 0.85 + 0.15 * Math.sin(t * 13 + (o.seed ?? 0)) * Math.sin(t * 7.3);
    const gr = ctx.createRadialGradient(0, -89, 2, 0, -89, 46);
    gr.addColorStop(0, `rgba(255,214,120,${0.55 * fl})`); gr.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -89, 46, 0, TAU); ctx.fill();
    ctx.restore();
  },
  flag(ctx, o, t) {
    const seg = 12, w = 44, h = 26;
    for (let i = 0; i < seg; i++) {
      const x0 = 1.5 + (i / seg) * w, x1 = 1.5 + ((i + 1) / seg) * w;
      const k = i / seg;
      const yo = Math.sin(t * 6 - i * 0.6) * 3 * k;
      // red/white stripes + blue canton
      for (let s = 0; s < 7; s++) {
        ctx.fillStyle = s % 2 ? PALETTE.paper : PALETTE.danger;
        ctx.fillRect(x0, -94 + yo + (s * h) / 7, x1 - x0 + 0.6, h / 7 + 0.4);
      }
      if (k < 0.42) { ctx.fillStyle = '#2a3a7a'; ctx.fillRect(x0, -94 + yo, x1 - x0 + 0.6, h * 0.55); }
    }
  },
};
const SWAY = { pine: 0.03, tree: 0.035, umbrella: 0.01, flowerbox: 0.0 };

// ------------------------------------------------------------------ frost post-process
function frostify(g, w, h, f, seed) {
  if (f <= 0) return;
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 140;
  const tops = [], bottoms = [];
  for (let x = 0; x < w; x++) for (let y = 1; y < h - 1; y++) {
    if (solid(x, y) && !solid(x, y - 1)) tops.push([x, y]);
    if (solid(x, y) && !solid(x, y + 1) && y < h - 14) {
      let free = true; for (let k = 1; k < 10; k++) if (solid(x, y + k)) { free = false; break; }
      if (free) bottoms.push([x, y]);
    }
  }
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = rgba(PALETTE.frost, 0.38 * f); g.fillRect(0, 0, w, h);
  g.restore();
  const th = 2 + f * 7; // canvas is 2x supersampled
  g.fillStyle = '#f4fbff';
  for (const [x, y] of tops) g.fillRect(x, y - th * 0.4, 1, th);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [x, y] of tops) if (hash2(x, y, seed) < 0.04) { g.beginPath(); g.arc(x, y, th * 0.8, 0, TAU); g.fill(); }
  if (f > 0.4) {
    for (const [x, y] of bottoms) {
      if (hash2(x, y, seed + 9) > 0.12 * f) continue;
      const L = 6 + hash2(x, y, 3) * 14 * f;
      g.fillStyle = rgba(PALETTE.ice, 0.95);
      g.beginPath(); g.moveTo(x - 2.5, y); g.lineTo(x + 2.5, y); g.lineTo(x, y + L); g.closePath(); g.fill();
    }
  }
}

function propCanvas(kind, region, variant, fb) {
  const def = P[kind] ?? P.rock;
  const [w, h, draw] = def;
  const pad = 6;
  const W = w + pad * 2, H = h + pad * 2;
  const k = 2; // supersample for crisp scaling
  return cached(`prop:${kind}:${region}:${variant}:${fb}`, W * k, H * k, (g, c) => {
    g.scale(k, k);
    g.translate(W / 2, H - pad - 4);
    const R = rng(variant * 977 + kind.length * 31 + 7);
    draw(g, R, region, variant);
    if (fb > 0) { g.setTransform(1, 0, 0, 1, 0, 0); frostify(g, c.width, c.height, fb / 3, variant); }
    c.ax = W / 2; c.ay = H - pad - 4; c.lw = W; c.lh = H;
  });
}

/** drawProp implementation. o: { region?, frost?: 0..1, seed?, t?, scale?, alpha?, flash?, hpFrac? (ice cracks) } */
export function drawPropImpl(ctx, game, kind, x, y, o = {}) {
  const region = o.region ?? game?.scene?.p?.region ?? game?.scene?.params?.region ?? 'lakeside';
  const fb = Math.round(Math.max(0, Math.min(1, o.frost ?? 0)) * 3);
  const variant = Math.abs(Math.floor(o.seed ?? 0)) % 4;
  const c = propCanvas(kind, region, variant, fb);
  const t = o.t ?? game?.time ?? 0;
  ctx.save();
  ctx.translate(x, y);
  const s = o.scale ?? 1;
  if (s !== 1) ctx.scale(s, s);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  const sw = SWAY[kind];
  if (sw) { const k = Math.sin(t * 1.3 + (o.seed ?? x * 0.01)) * sw; ctx.transform(1, 0, k, 1, 0, 0); }
  ctx.drawImage(c, -c.ax, -c.ay, c.lw, c.lh);
  if (LIVE[kind]) LIVE[kind](ctx, o, t);
  if ((kind === 'iceblock' || kind === 'icewall') && o.hpFrac != null && o.hpFrac < 1) iceCracks(ctx, kind, 1 - o.hpFrac, o.seed ?? 0);
  if (o.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= Math.min(1, o.flash) * 0.6;
    ctx.drawImage(c, -c.ax, -c.ay, c.lw, c.lh);
  }
  ctx.restore();
}

function iceCracks(ctx, kind, dmg, seed) {
  const R = rng(seed * 13 + 5);
  ctx.strokeStyle = rgba(PALETTE.frostDeep, 0.95); ctx.lineWidth = 1.3; ctx.lineCap = 'round';
  const n = Math.ceil(dmg * 5);
  const top = kind === 'iceblock' ? -40 : -50, wd = kind === 'iceblock' ? 14 : 30;
  for (let i = 0; i < n; i++) {
    let x = (R() - 0.5) * wd, y = top + R() * 10;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 10; y += 5 + R() * 6; ctx.lineTo(x, y); }
    ctx.stroke();
  }
}

// ------------------------------------------------------------------ projectiles
/** o: { r?, angle?, vx?, vy?, t?, life? (0..1 remaining, for 'shout'/'shockwave'), alpha? } */
export function drawProjectileImpl(ctx, game, kind, x, y, o = {}) {
  const t = o.t ?? game?.time ?? 0;
  const ang = o.angle ?? (o.vx != null || o.vy != null ? Math.atan2(o.vy ?? 0, o.vx ?? 0) : 0);
  const moving = o.vx != null || o.vy != null || o.angle != null;
  ctx.save();
  ctx.translate(x, y);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  switch (kind) {
    case 'mintscoop': {
      const r = o.r ?? 6;
      if (moving) for (let i = 3; i >= 1; i--) {
        ctx.fillStyle = rgba(PALETTE.mint, 0.18 * (4 - i));
        ctx.beginPath(); ctx.arc(-Math.cos(ang) * r * i * 0.9, -Math.sin(ang) * r * i * 0.9, r * (1 - i * 0.18), 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(16,19,31,0.18)'; ctx.beginPath(); ctx.ellipse(0, r + 6, r * 0.8, r * 0.3, 0, 0, TAU); ctx.fill();
      ctx.rotate(t * 8);
      ctx.fillStyle = PALETTE.mintDeep; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = PALETTE.mint; ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.12, r * 0.86, 0, TAU); ctx.fill();
      ctx.fillStyle = PALETTE.choc;
      for (const [cx, cy] of [[-0.4, -0.3], [0.35, -0.1], [-0.1, 0.4], [0.3, 0.45], [-0.5, 0.2]]) ctx.fillRect(cx * r - 1, cy * r - 1, 2, 2);
      ctx.rotate(-t * 8);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.4, r * 0.25, 0, TAU); ctx.fill();
      break;
    }
    case 'slush': case 'snowball': {
      const r = o.r ?? (kind === 'snowball' ? 8 : 6);
      if (moving) for (let i = 1; i <= 3; i++) {
        ctx.fillStyle = rgba(PALETTE.frost, 0.25 / i);
        ctx.beginPath(); ctx.arc(-Math.cos(ang) * r * i, -Math.sin(ang) * r * i, r * 0.6, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(16,19,31,0.18)'; ctx.beginPath(); ctx.ellipse(0, r + 8, r * 0.8, r * 0.3, 0, 0, TAU); ctx.fill();
      const wob = 1 + Math.sin(t * 20) * 0.06;
      ctx.scale(wob, 2 - wob);
      ctx.fillStyle = kind === 'snowball' ? '#ffffff' : PALETTE.frostDeep;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = kind === 'snowball' ? PALETTE.ice : PALETTE.frost;
      ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.15, r * 0.8, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.4; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.15, 0, TAU); ctx.fill(); }
      break;
    }
    case 'icicle': {
      const r = o.r ?? 5;
      ctx.rotate(ang);
      ctx.fillStyle = rgba(PALETTE.frost, 0.35);
      ctx.beginPath(); ctx.moveTo(-r * 6, 0); ctx.lineTo(-r * 1.5, -r * 0.6); ctx.lineTo(-r * 1.5, r * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PALETTE.ice; ctx.strokeStyle = PALETTE.frostDeep; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(r * 2.6, 0); ctx.lineTo(-r * 1.8, -r * 0.9); ctx.lineTo(-r * 1.2, 0); ctx.lineTo(-r * 1.8, r * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(-r, -r * 0.25, r * 2.4, r * 0.25);
      break;
    }
    case 'shout': case 'shockwave': {
      const r = o.r ?? 40, life = Math.max(0, Math.min(1, o.life ?? 0.6));
      const col = kind === 'shout' ? PALETTE.sun : PALETTE.ice;
      ctx.globalAlpha *= Math.min(1, life * 1.6);
      ctx.scale(1, kind === 'shockwave' ? 0.5 : 1);
      ctx.strokeStyle = col; ctx.lineWidth = 3 + life * 5;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(kind === 'shout' ? PALETTE.paper : PALETTE.frost, 0.7); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, TAU); ctx.stroke();
      if (kind === 'shout') {
        ctx.fillStyle = PALETTE.sunDeep; ctx.font = `bold ${Math.round(10 + r * 0.08)}px "Trebuchet MS", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + r * 0.01; ctx.fillText('!', Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05); }
      } else {
        ctx.fillStyle = PALETTE.ice;
        for (let i = 0; i < 10; i++) { const a = i * TAU / 10; ctx.save(); ctx.translate(Math.cos(a) * r, Math.sin(a) * r); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0, -9 * life); ctx.lineTo(3, 0); ctx.fill(); ctx.restore(); }
      }
      break;
    }
    default: {
      ctx.fillStyle = PALETTE.frost; ctx.beginPath(); ctx.arc(0, 0, o.r ?? 6, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ zones (ground decals)
export const ZONE_KINDS = ['bloom', 'telegraph', 'frostpatch', 'shield'];
/**
 * Ground-level area effects, drawn under entities. (x,y) centre, r radius.
 * kinds: 'bloom' (Flower Box Bloom heal/thaw zone), 'telegraph' (incoming attack warning; o.progress 0..1 fills),
 *        'frostpatch' (icy slick), 'shield' (soft bubble). o: { t?, life? 0..1 (fade), progress?, alpha? }
 */
export function drawZone(ctx, game, kind, x, y, r, o = {}) {
  const t = o.t ?? game?.time ?? 0;
  const life = o.life ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= Math.min(1, life * 3) * (o.alpha ?? 1);
  ctx.scale(1, 0.6);
  if (kind === 'bloom') {
    const gr = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
    gr.addColorStop(0, rgba(PALETTE.heal, 0.35)); gr.addColorStop(0.7, rgba(PALETTE.sun, 0.2)); gr.addColorStop(1, rgba(PALETTE.sun, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(PALETTE.mint, 0.8); ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 20;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // petals drifting in a slow ring + flowers popping around the rim
    const cols = ['#e98aa8', PALETTE.sun, PALETTE.paper, '#b9a3ff', PALETTE.sunDeep];
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12 + t * 0.4, d = r * (0.35 + 0.5 * ((i * 0.37) % 1));
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d - Math.sin(t * 3 + i) * 4, 3, 2, a, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10, pop = Math.min(1, Math.max(0, (t * 2 - i * 0.08) % 3));
      const fx = Math.cos(a) * r * 0.95, fy = Math.sin(a) * r * 0.95;
      ctx.fillStyle = cols[(i + 2) % cols.length];
      for (let p = 0; p < 5; p++) { const pa = p * TAU / 5; ctx.beginPath(); ctx.arc(fx + Math.cos(pa) * 3 * pop, fy + Math.sin(pa) * 3 * pop, 2.2 * pop, 0, TAU); ctx.fill(); }
      ctx.fillStyle = PALETTE.sunDeep; ctx.beginPath(); ctx.arc(fx, fy, 1.6 * pop, 0, TAU); ctx.fill();
    }
  } else if (kind === 'telegraph') {
    const p = Math.max(0, Math.min(1, o.progress ?? ((t * 1.2) % 1)));
    ctx.fillStyle = rgba(PALETTE.danger, 0.12); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(PALETTE.danger, 0.28); ctx.beginPath(); ctx.arc(0, 0, r * p, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(PALETTE.danger, 0.6 + 0.4 * Math.sin(t * 20)); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  } else if (kind === 'frostpatch') {
    const gr = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    gr.addColorStop(0, rgba(PALETTE.ice, 0.75)); gr.addColorStop(0.8, rgba(PALETTE.frost, 0.5)); gr.addColorStop(1, rgba(PALETTE.frost, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) { const a = i * 1.3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a + 0.2) * r * 0.7); ctx.stroke(); }
  } else if (kind === 'shield') {
    ctx.scale(1, 1 / 0.6);
    ctx.fillStyle = rgba(PALETTE.denim, 0.18); ctx.strokeStyle = rgba(PALETTE.ice, 0.7); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -r * 0.6, r, 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ pickups
export const PICKUP_KINDS = ['scoop', 'sunshine', 'heart'];
const FLAVORS = { mint: [PALETTE.mint, PALETTE.choc], strawberry: ['#ffb3c8', '#e2557a'], vanilla: ['#f4e3b0', '#d9b46a'], chocolate: ['#8a5a3a', '#5a3a2a'] };
/** Collectible pickups. o: { t?, flavor?: 'mint'|'strawberry'|'vanilla'|'chocolate', seed?, alpha?, scale? } */
export function drawPickup(ctx, game, kind, x, y, o = {}) {
  const t = o.t ?? game?.time ?? 0;
  const bob = Math.sin(t * 4 + (o.seed ?? x * 0.1)) * 2.5;
  ctx.save();
  ctx.translate(x, y);
  if (o.scale) ctx.scale(o.scale, o.scale);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.fillStyle = 'rgba(16,19,31,0.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 7 - bob * 0.4, 2.5, 0, 0, TAU); ctx.fill();
  ctx.translate(0, -12 + bob);
  if (kind === 'scoop') {
    const fl = o.flavor ?? ['mint', 'strawberry', 'vanilla', 'chocolate'][Math.abs(Math.floor(o.seed ?? 0)) % 4];
    const [c1, c2] = FLAVORS[fl] ?? FLAVORS.mint;
    ctx.fillStyle = '#d9a35e'; ctx.beginPath(); ctx.moveTo(-5.5, 0); ctx.lineTo(5.5, 0); ctx.lineTo(0, 11); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a8743a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-3, 1); ctx.lineTo(2, 8); ctx.moveTo(3, 1); ctx.lineTo(-2, 8); ctx.stroke();
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(0, -2.5, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = c2; ctx.fillRect(-3, -5, 1.6, 1.6); ctx.fillRect(1.5, -3, 1.6, 1.6); ctx.fillRect(-1, -1, 1.6, 1.6);
    ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.beginPath(); ctx.arc(-2.4, -5, 1.6, 0, TAU); ctx.fill();
  } else if (kind === 'sunshine') {
    ctx.rotate(t * 1.5);
    ctx.fillStyle = PALETTE.sunDeep;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.2) * 6, Math.sin(a - 0.2) * 6); ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); ctx.lineTo(Math.cos(a + 0.2) * 6, Math.sin(a + 0.2) * 6); ctx.fill(); }
    ctx.rotate(-t * 1.5);
    ctx.fillStyle = PALETTE.sun; ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-2.6, -1.5, 1.4, 1.4); ctx.fillRect(1.2, -1.5, 1.4, 1.4);
    ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 0.6, 2, 0.3, Math.PI - 0.3); ctx.stroke();
  } else if (kind === 'heart') {
    const s = 1 + Math.sin(t * 6) * 0.08;
    ctx.scale(s, s);
    ctx.fillStyle = PALETTE.danger;
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-10, -1, -6, -10, 0, -4); ctx.bezierCurveTo(6, -10, 10, -1, 0, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-3.5, -3.5, 1.6, 0, TAU); ctx.fill();
  }
  // twinkle
  const tw = (t * 1.3 + (o.seed ?? 0) * 0.37) % 1;
  if (tw < 0.25) {
    const a = Math.sin(tw / 0.25 * Math.PI);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.moveTo(7, -9 - 4 * a); ctx.lineTo(8, -9); ctx.lineTo(7, -9 + 4 * a); ctx.lineTo(6, -9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7 - 4 * a, -9); ctx.lineTo(7, -8); ctx.lineTo(7 + 4 * a, -9); ctx.lineTo(7, -10); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ screen-space weather / frost
/**
 * Screen-space weather overlay (draw after the world, before the HUD).
 * kind 'snow' (light flurries) | 'blizzard' (heavy, windy). o: { t?, camX?, camY?, intensity? 0..1 }
 */
export function drawWeather(ctx, game, kind, w, h, o = {}) {
  const t = o.t ?? game?.time ?? 0;
  const heavy = kind === 'blizzard';
  const n = Math.round((heavy ? 220 : 70) * (o.intensity ?? 1));
  const camX = o.camX ?? 0, camY = o.camY ?? 0;
  ctx.save();
  if (heavy) { ctx.fillStyle = rgba(PALETTE.ice, 0.12 * (o.intensity ?? 1)); ctx.fillRect(0, 0, w, h); }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < n; i++) {
    const sp = 30 + hash2(i, 1, 7) * 60, sz = 1 + hash2(i, 2, 7) * (heavy ? 2.5 : 2);
    const wind = heavy ? 140 : 18;
    let x = (hash2(i, 3, 7) * (w + 200) + t * wind + Math.sin(t * 1.3 + i) * 12 - camX * 0.3) % (w + 200);
    let y = (hash2(i, 4, 7) * (h + 100) + t * sp * (heavy ? 1.6 : 1) - camY * 0.3) % (h + 100);
    if (x < 0) x += w + 200; if (y < 0) y += h + 100;
    ctx.globalAlpha = 0.5 + hash2(i, 5, 7) * 0.5;
    if (heavy && sz > 2) { ctx.fillRect(x - 100 - sz * 2, y - 50, sz * 4, sz * 0.8); }
    else { ctx.beginPath(); ctx.arc(x - 100, y - 50, sz, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

function frostVignette(w, h) {
  return cached(`frostvig:${w}x${h}`, w, h, (g) => {
    const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.65);
    gr.addColorStop(0, rgba(PALETTE.frost, 0)); gr.addColorStop(1, rgba(PALETTE.ice, 0.85));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // crystal fronds creeping in from the edges
    const R = rng(42);
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineCap = 'round';
    const frond = (x, y, a, len, depth) => {
      if (depth <= 0 || len < 3) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      g.lineWidth = depth * 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      frond(x2, y2, a + (R() - 0.5) * 0.5, len * 0.75, depth - 1);
      frond(x + (x2 - x) * 0.5, y + (y2 - y) * 0.5, a + 0.9, len * 0.45, depth - 1);
      frond(x + (x2 - x) * 0.5, y + (y2 - y) * 0.5, a - 0.9, len * 0.45, depth - 1);
    };
    for (let i = 0; i < 26; i++) {
      const side = i % 4;
      const p = R();
      const [x, y, a] = side === 0 ? [p * w, 0, Math.PI / 2] : side === 1 ? [p * w, h, -Math.PI / 2] : side === 2 ? [0, p * h, 0] : [w, p * h, Math.PI];
      frond(x, y, a + (R() - 0.5) * 0.8, 18 + R() * 26, 4);
    }
  });
}
/** Screen-space frost creeping in from the edges. amount 0..1. */
export function drawFrostOverlay(ctx, w, h, amount, o = {}) {
  if (!(amount > 0)) return;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, amount) * (0.85 + 0.15 * Math.sin((o.t ?? 0) * 2));
  ctx.drawImage(frostVignette(w, h), 0, 0, w, h);
  ctx.restore();
}
export { mix };
