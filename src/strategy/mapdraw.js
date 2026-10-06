// Campaign map drawing (procedural Canvas 2D). Owned by: strategy.
import { PALETTE, REGIONS, FONT } from '../core/theme.js';
import { rng } from '../core/math.js';
import { text } from '../ui/widgets.js';
import { NODES, EDGES, NODE_BY_ID } from './data.js';
import { frostOf, isAvailable, regionUnlocked, shielded, isThawed } from './campaign.js';

const BANDS = { lakeside: [0, 320], oldcity: [320, 640], summit: [640, 960] };
const TOP = 36; // HUD bar height

let bgCache = null;

function nearNode(x, y, d) { return NODES.some((n) => Math.hypot(n.x - x, n.y - y) < d); }
function nearPath(x, y, d) {
  for (const [a, b] of EDGES) {
    const A = NODE_BY_ID[a], B = NODE_BY_ID[b];
    const dx = B.x - A.x, dy = B.y - A.y, L = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((x - A.x) * dx + (y - A.y) * dy) / L));
    if (Math.hypot(A.x + t * dx - x, A.y + t * dy - y) < d) return true;
  }
  return false;
}

function pine(ctx, x, y, s, c = PALETTE.pine) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(x, y + 2, 7 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.choc; ctx.fillRect(x - 1.5 * s, y - 4 * s, 3 * s, 5 * s);
  ctx.fillStyle = c;
  for (let i = 0; i < 3; i++) {
    const w = (9 - i * 2.2) * s, yy = y - 3 * s - i * 6 * s;
    ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x + w, yy); ctx.lineTo(x, yy - 10 * s); ctx.closePath(); ctx.fill();
  }
}

/** Static terrain, cached on an offscreen canvas. */
function buildBackground(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const r = rng(424242);

  // region grounds with soft seams
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#dccb9c'); g.addColorStop(0.31, REGIONS.lakeside.ground);
  g.addColorStop(0.35, REGIONS.oldcity.ground); g.addColorStop(0.64, REGIONS.oldcity.ground);
  g.addColorStop(0.69, REGIONS.summit.ground); g.addColorStop(1, '#6d9a62');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  // --- Lakeside: lake, sand speckle, pines, pavilion hint, umbrella, bucket
  for (let i = 0; i < 500; i++) { ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(90,58,42,0.10)'; ctx.fillRect(r() * 320, TOP + r() * (h - TOP), 2, 2); }
  // the lake (west shore) with a sandy beach
  ctx.fillStyle = '#c9b582';
  ctx.beginPath(); ctx.ellipse(36, 262, 58, 82, 0.1, 0, Math.PI * 2); ctx.fill();
  const lg = ctx.createRadialGradient(20, 262, 8, 20, 262, 80);
  lg.addColorStop(0, '#3d7ea3'); lg.addColorStop(1, PALETTE.lake);
  ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(28, 262, 48, 72, 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) { const x = 4 + r() * 46, y = 205 + r() * 110; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 7, y - 3, x + 14, y); ctx.stroke(); }
  // dock pier
  ctx.fillStyle = PALETTE.choc; ctx.fillRect(176, 400, 26, 5);
  ctx.fillStyle = PALETTE.lake; ctx.beginPath(); ctx.ellipse(160, 412, 30, 14, 0, 0, Math.PI * 2); ctx.fill();
  // umbrella near picnic grove + blue bucket easter egg
  ctx.fillStyle = PALETTE.choc; ctx.fillRect(147, 160, 2, 16);
  ctx.fillStyle = '#3b6fd1'; ctx.beginPath(); ctx.arc(148, 162, 12, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#3b6fd1'; ctx.fillRect(92, 404, 6, 6); ctx.fillStyle = "#2a50a0"; ctx.fillRect(92, 404, 6, 1.5);

  // --- Old City: streets + brick blocks + lamp posts + flower boxes
  ctx.strokeStyle = 'rgba(255,235,210,0.18)'; ctx.lineWidth = 10;
  for (let x = 345; x < 640; x += 58) { ctx.beginPath(); ctx.moveTo(x, TOP); ctx.lineTo(x + 12, h); ctx.stroke(); }
  for (let y = 70; y < h; y += 62) { ctx.beginPath(); ctx.moveTo(320, y); ctx.lineTo(640, y + 6); ctx.stroke(); }
  for (let i = 0; i < 160; i++) {
    const x = 330 + r() * 300, y = TOP + 6 + r() * (h - TOP - 20);
    if (nearNode(x, y, 34) || nearPath(x, y, 14)) continue;
    const bw = 14 + r() * 16, bh = 10 + r() * 12;
    ctx.fillStyle = r() < 0.5 ? PALETTE.brick : PALETTE.brickDark;
    ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + bh - 3, bw, 3);
    ctx.fillStyle = r() < 0.5 ? '#2d2d36' : '#3a5a3a'; ctx.fillRect(x + bw / 2 - 2, y + bh - 7, 4, 4); // colonial door
    if (r() < 0.4) { ctx.fillStyle = r() < 0.5 ? PALETTE.sunDeep : '#c0392b'; ctx.fillRect(x + 2, y + 2, 4, 2); } // flower box
  }
  for (let i = 0; i < 14; i++) {
    const x = 335 + r() * 290, y = TOP + 20 + r() * (h - TOP - 40);
    if (nearNode(x, y, 26)) continue;
    ctx.fillStyle = '#1d1d24'; ctx.fillRect(x, y - 10, 1.5, 10);
    ctx.fillStyle = PALETTE.sun; ctx.beginPath(); ctx.arc(x + 0.7, y - 11, 2, 0, Math.PI * 2); ctx.fill();
  }

  // --- Summit: hazy blue ridges at the top, pines everywhere
  const ridgeCols = ['#9cc3e6', '#7fa9d6', '#6a93c4'];
  ridgeCols.forEach((col, k) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(640, 230 + k * 30);
    for (let x = 640; x <= w; x += 20) ctx.lineTo(x, 120 + k * 40 - Math.abs(Math.sin(x * 0.02 + k * 1.7)) * (60 - k * 10) - r() * 8);
    ctx.lineTo(w, 300); ctx.lineTo(640, 300); ctx.closePath(); ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
  });
  const sg = ctx.createLinearGradient(0, 200, 0, 300);
  sg.addColorStop(0, 'rgba(122,163,107,0)'); sg.addColorStop(1, REGIONS.summit.ground);
  ctx.fillStyle = sg; ctx.fillRect(640, 200, 320, 100);
  // fortress silhouette
  ctx.fillStyle = PALETTE.ice;
  ctx.beginPath(); ctx.moveTo(880, 92); ctx.lineTo(886, 52); ctx.lineTo(892, 92); ctx.lineTo(902, 92); ctx.lineTo(910, 40); ctx.lineTo(918, 92); ctx.lineTo(928, 92); ctx.lineTo(934, 58); ctx.lineTo(940, 92); ctx.closePath(); ctx.fill();

  // pines (lakeside + summit), avoiding nodes and paths
  for (let i = 0; i < 260; i++) {
    const summit = r() < 0.55;
    const x = summit ? 645 + r() * 310 : 5 + r() * 305;
    const y = TOP + 10 + r() * (h - TOP - 10);
    if (nearNode(x, y, 30) || nearPath(x, y, 13)) continue;
    if (!summit && (Math.hypot((x - 36) / 62, (y - 262) / 86) < 1 || Math.hypot((x - 160) / 34, (y - 412) / 18) < 1)) continue; // not in the lake
    if (summit && y < 150 && r() < 0.6) continue;
    pine(ctx, x, y, summit ? 0.8 + r() * 0.5 : 0.7 + r() * 0.4, summit ? (r() < 0.5 ? PALETTE.pine : '#2f6a3c') : '#4a8350');
  }
  return c;
}

const KIND_COLOR = { camp: PALETTE.sun, skirmish: PALETTE.brick, rescue: PALETTE.mintDeep, defend: PALETTE.denim, boss: '#6c4aa8' };
const FROST_FILL = ['#ffe08a', PALETTE.frost, PALETTE.frostDeep, '#4a8fd0'];

function icon(ctx, kind, bossId, s) {
  ctx.save(); ctx.fillStyle = PALETTE.paper; ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.scale(s, s);
  if (kind === 'camp') { ctx.beginPath(); ctx.moveTo(-8, 6); ctx.lineTo(0, -8); ctx.lineTo(8, 6); ctx.closePath(); ctx.fill(); ctx.fillStyle = PALETTE.choc; ctx.beginPath(); ctx.moveTo(-2, 6); ctx.lineTo(0, 0); ctx.lineTo(2, 6); ctx.fill(); }
  else if (kind === 'skirmish') { ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6); ctx.lineTo(-6, 6); ctx.moveTo(-7, 2); ctx.lineTo(-2, 7); ctx.moveTo(7, 2); ctx.lineTo(2, 7); ctx.stroke(); }
  else if (kind === 'rescue') { ctx.beginPath(); ctx.moveTo(0, 7); ctx.bezierCurveTo(-11, -1, -5, -10, 0, -4); ctx.bezierCurveTo(5, -10, 11, -1, 0, 7); ctx.fill(); }
  else if (kind === 'defend') { ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, -5); ctx.lineTo(6, 2); ctx.quadraticCurveTo(3, 7, 0, 8); ctx.quadraticCurveTo(-3, 7, -6, 2); ctx.lineTo(-7, -5); ctx.closePath(); ctx.fill(); }
  else if (bossId === 'baron_brrr') { ctx.beginPath(); ctx.arc(0, -1, 7, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(2.5, -2, 2.5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(4.5, 0); ctx.lineTo(5, 8); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(-8, 5); ctx.lineTo(-8, -5); ctx.lineTo(-4, -1); ctx.lineTo(0, -7); ctx.lineTo(4, -1); ctx.lineTo(8, -5); ctx.lineTo(8, 5); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

function flake(ctx, x, y, s, color = PALETTE.ice) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.translate(x, y);
  for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke(); }
  ctx.restore();
}

export const nodeRadius = (n) => (n.kind === 'boss' ? 19 : n.kind === 'camp' ? 18 : 15);

/** Node under (x,y) or null. */
export function hitNode(x, y) {
  for (const n of NODES) if (Math.hypot(n.x - x, n.y - y) <= nodeRadius(n) + 6) return n;
  return null;
}

/**
 * Draw the whole map.
 * @param view {{hover:string|null, selected:string|null, forecast:Array, time:number, pulse:{id,t}|null}}
 */
export function drawMap(ctx, game, view) {
  const st = game.state;
  const w = game.width, h = game.height, t = view.time;
  if (!bgCache) bgCache = buildBackground(w, h);
  ctx.drawImage(bgCache, 0, 0);

  // frost tint per node (icy blobs)
  for (const n of NODES) {
    const f = frostOf(st, n.id);
    if (f <= 0) continue;
    const rad = 42 + f * 18;
    const gr = ctx.createRadialGradient(n.x, n.y, 4, n.x, n.y, rad);
    gr.addColorStop(0, `rgba(232,248,255,${0.22 + f * 0.13})`);
    gr.addColorStop(0.6, `rgba(191,233,255,${0.1 + f * 0.08})`);
    gr.addColorStop(1, 'rgba(191,233,255,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(n.x, n.y, rad, 0, Math.PI * 2); ctx.fill();
  }
  // warm glow + flowers around thawed nodes
  for (const n of NODES) {
    if (frostOf(st, n.id) > 0) continue;
    const gr = ctx.createRadialGradient(n.x, n.y, 4, n.x, n.y, 50);
    gr.addColorStop(0, 'rgba(255,201,74,0.35)'); gr.addColorStop(1, 'rgba(255,201,74,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(n.x, n.y, 50, 0, Math.PI * 2); ctx.fill();
    const r = rng(n.x * 1000 + n.y);
    for (let i = 0; i < 7; i++) {
      const a = r() * Math.PI * 2, d = 24 + r() * 16;
      ctx.fillStyle = [PALETTE.sun, '#ff8fb1', '#ffffff', PALETTE.sunDeep][i % 4];
      ctx.beginPath(); ctx.arc(n.x + Math.cos(a) * d, n.y + Math.sin(a) * d, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // locked regions: dim + label
  for (const [rid, [x0, x1]] of Object.entries(BANDS)) {
    if (regionUnlocked(st, rid)) continue;
    ctx.fillStyle = 'rgba(27,34,56,0.42)'; ctx.fillRect(x0, TOP, x1 - x0, h - TOP);
    ctx.fillStyle = 'rgba(232,248,255,0.10)'; ctx.fillRect(x0, TOP, x1 - x0, h - TOP);
  }

  // paths
  for (const [a, b] of EDGES) {
    const A = NODE_BY_ID[a], B = NODE_BY_ID[b];
    const warm = isThawed(st, a) && isThawed(st, b);
    const locked = !regionUnlocked(st, A.region) || !regionUnlocked(st, B.region);
    const mx = (A.x + B.x) / 2 + (B.y - A.y) * 0.12, my = (A.y + B.y) / 2 - (B.x - A.x) * 0.12;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(16,19,31,0.35)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(mx, my, B.x, B.y); ctx.stroke();
    ctx.strokeStyle = warm ? PALETTE.sun : locked ? 'rgba(191,233,255,0.35)' : PALETTE.ice;
    ctx.lineWidth = 3; ctx.setLineDash(warm ? [] : [6, 6]);
    if (!warm && !locked) ctx.lineDashOffset = -t * 8;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(mx, my, B.x, B.y); ctx.stroke();
    ctx.restore();
  }

  // region names
  for (const [rid, [x0, x1]] of Object.entries(BANDS)) {
    const unlocked = regionUnlocked(st, rid);
    const lib = st.map.liberated[rid];
    text(ctx, REGIONS[rid].name.toUpperCase(), (x0 + x1) / 2, 56, { align: 'center', font: 'bold 15px "Trebuchet MS", system-ui, sans-serif', color: lib ? PALETTE.sun : unlocked ? PALETTE.paper : 'rgba(232,248,255,0.6)' });
    if (!unlocked) text(ctx, 'LOCKED', (x0 + x1) / 2, h / 2 + 4, { align: 'center', font: FONT.big, color: 'rgba(232,248,255,0.35)', shadow: false });
  }

  // forecast lookup
  const fc = {};
  for (const f of view.forecast) (fc[f.id] ??= []).push(f);

  // nodes
  for (const n of NODES) {
    const f = frostOf(st, n.id);
    const ns = st.map.nodes[n.id];
    const avail = isAvailable(st, n.id);
    const locked = !regionUnlocked(st, n.region);
    const R = nodeRadius(n);
    ctx.save();
    if (locked) ctx.globalAlpha = 0.6;
    if (avail) {
      const p = 0.5 + 0.5 * Math.sin(t * 4 + n.x);
      ctx.strokeStyle = `rgba(255,201,74,${0.5 + 0.5 * p})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(n.x, n.y, R + 5 + p * 3, 0, Math.PI * 2); ctx.stroke();
    }
    if (view.selected === n.id) {
      ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.lineDashOffset = t * 10;
      ctx.beginPath(); ctx.arc(n.x, n.y, R + 11, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    // body
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(n.x, n.y + R - 2, R, R * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = n.kind === 'camp' ? PALETTE.sun : ns.cleared ? PALETTE.sun : KIND_COLOR[n.kind];
    ctx.strokeStyle = view.hover === n.id ? PALETTE.paper : PALETTE.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(n.x, n.y, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // frost cap: icy rim proportional to frost
    if (f > 0) {
      ctx.strokeStyle = FROST_FILL[f]; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(n.x, n.y, R - 2, Math.PI * (1.5 - f / 3), Math.PI * (1.5 + f / 3)); ctx.stroke();
      if (f >= 3) { // icicles
        ctx.fillStyle = PALETTE.ice;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(n.x + i * 5 - 2, n.y + R - 3); ctx.lineTo(n.x + i * 5 + 2, n.y + R - 3); ctx.lineTo(n.x + i * 5, n.y + R + 4 + (i & 1) * 3); ctx.fill(); }
      }
    }
    ctx.translate(n.x, n.y); icon(ctx, n.kind, n.bossId, R / 15); ctx.translate(-n.x, -n.y);
    // frost pips
    if (n.kind !== 'camp') {
      for (let i = 0; i < 3; i++) {
        const px = n.x - 10 + i * 10, py = n.y + R + 9;
        ctx.fillStyle = i < f ? PALETTE.frost : 'rgba(16,19,31,0.5)';
        ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px + 4, py); ctx.lineTo(px, py + 4); ctx.lineTo(px - 4, py); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    } else {
      // camp chill meter under camp
      const chill = st.map.campChill;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < chill ? PALETTE.danger : 'rgba(16,19,31,0.5)';
        ctx.fillRect(n.x - 14 + i * 10, n.y + R + 6, 8, 5);
      }
    }
    // shield
    if (shielded(st, n.id)) {
      ctx.strokeStyle = PALETTE.sun; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.lineDashOffset = -t * 6;
      ctx.beginPath(); ctx.arc(n.x, n.y, R + 8, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = PALETTE.sun; ctx.beginPath(); ctx.arc(n.x - R - 2, n.y - R + 2, 5, 0, Math.PI * 2); ctx.fill();
    }
    // forecast badge
    const fl = fc[n.id];
    if (fl) {
      const worst = fl.find((x) => !x.blocked && x.delta > 0) ?? fl[0];
      const bx = n.x + R + 3, by = n.y - R - 3;
      const good = worst.delta < 0, blocked = worst.blocked;
      const bob = Math.sin(t * 5) * 1.5;
      ctx.fillStyle = blocked ? 'rgba(16,19,31,0.75)' : good ? PALETTE.mintDeep : worst.reason === 'storm' ? PALETTE.frostDeep : PALETTE.danger;
      ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(bx - 11, by - 8 + bob, 24, 16, 5); ctx.fill(); ctx.stroke();
      text(ctx, blocked ? 'safe' : good ? '-1' : '+1', bx + 1, by + 4 + bob, { align: 'center', font: 'bold 11px "Trebuchet MS", sans-serif', shadow: false, color: PALETTE.paper });
    }
    ctx.restore();
    // snowfall over heavily frozen nodes
    if (f >= 2) {
      for (let i = 0; i < f * 3; i++) {
        const ph = (t * (12 + i * 3) + i * 37) % 70;
        const sx = n.x - 35 + ((i * 53 + n.y) % 70) + Math.sin(t + i) * 4;
        ctx.globalAlpha = 0.8 * (1 - ph / 70);
        flake(ctx, sx, n.y - 40 + ph, 2.4);
      }
      ctx.globalAlpha = 1;
    }
    // thaw pulse animation
    if (view.pulse && view.pulse.ids.includes(n.id) && view.pulse.t < 1.6) {
      const k = view.pulse.t / 1.6;
      ctx.strokeStyle = `rgba(255,201,74,${1 - k})`; ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(n.x, n.y, R + k * 60, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

/** Short label for a mission kind. */
export const KIND_LABEL = { camp: 'Home base', skirmish: 'Skirmish', rescue: 'Rescue', defend: 'Defend', boss: 'Boss' };
