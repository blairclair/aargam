// Art-world review gallery (not used by the game). Owned by: art-world.
// /src/art/world/gallery.html?page=rooms|room|furniture|enemies
//   rooms:     all 9 rooms, whole arena scaled down (&weird=0..1 &t=)
//   room:      one room at 1:1 camera view (&room=kitchen &weird=0.7 &cx=&cy= &w=&h= &aw=&ah=)
//   furniture: every kind with its footprint box (&zoom=)
//   enemies:   every enemy x anim (&only=type,type &zoom= &t=)
import { ROOMS, ROOM_IDS, ENEMIES } from '../../core/theme.js';
import * as W from './index.js';

const q = new URLSearchParams(location.search);
const page = q.get('page') ?? 'enemies';
const T = Number(q.get('t') ?? 0.4);
const weird = Number(q.get('weird') ?? 0);
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const game = { time: T, width: 960, height: 540 };

function size(w, h) { cv.width = w; cv.height = h; }
function label(s, x, y, color = '#fff6e5', font = '12px sans-serif', align = 'center') {
  ctx.fillStyle = color; ctx.font = font; ctx.textAlign = align; ctx.fillText(s, x, y);
}
const ARENA = { backyard: [2600, 1700], pond: [1900, 1400] };
const arenaOf = (id) => [Number(q.get('aw')) || (ARENA[id]?.[0] ?? 1500), Number(q.get('ah')) || (ARENA[id]?.[1] ?? 1100)];

const pages = {
  rooms() {
    const cw = 600, chh = 460, cols = 3;
    size(cw * cols, chh * 3);
    ctx.fillStyle = '#10131f'; ctx.fillRect(0, 0, cv.width, cv.height);
    ROOM_IDS.forEach((id, i) => {
      const [aw, ah] = arenaOf(id);
      const pad = 60, wall = W.WALL_H ?? 120;
      const vw = aw + pad * 2, vh = ah + wall + pad * 2;
      const k = Math.min((cw - 10) / vw, (chh - 30) / vh);
      const ox = (i % cols) * cw + 5, oy = Math.floor(i / cols) * chh + 22;
      ctx.save();
      ctx.beginPath(); ctx.rect(ox, oy, vw * k, vh * k); ctx.clip();
      ctx.translate(ox, oy); ctx.scale(k, k); ctx.translate(pad, wall + pad);
      W.drawRoom(ctx, game, id, -pad, -wall - pad, vw, vh, { weird, t: T, arenaW: aw, arenaH: ah });
      ctx.restore();
      label(`${ROOMS[id].name} (${aw}x${ah}) weird=${weird}`, ox + 4, oy - 6, '#fff6e5', '13px sans-serif', 'left');
    });
  },
  room() {
    const id = q.get('room') ?? 'office';
    const [aw, ah] = arenaOf(id);
    const w = Number(q.get('w') ?? 960), h = Number(q.get('h') ?? 540);
    const cx = Number(q.get('cx') ?? -40), cy = Number(q.get('cy') ?? -(W.WALL_H ?? 120) - 20);
    size(w, h);
    ctx.save(); ctx.translate(-cx, -cy);
    W.drawRoom(ctx, game, id, cx, cy, w, h, { weird, t: T, arenaW: aw, arenaH: ah });
    // optional furniture/enemy preview list: &f=couch@300,400;plant@100,200  &e=dust_bunny@500,300
    for (const spec of (q.get('f') ?? '').split(';').filter(Boolean)) {
      const [k, p] = spec.split('@'); const [x, y] = p.split(',').map(Number);
      W.drawFurniture(ctx, game, k, x, y, { t: T, weird, room: id });
    }
    for (const spec of (q.get('e') ?? '').split(';').filter(Boolean)) {
      const [k, p] = spec.split('@'); const [x, y] = p.split(',').map(Number);
      W.drawWorldEnemy(ctx, game, k, x, y, { t: T, anim: 'move', facing: Math.PI });
    }
    ctx.restore();
  },
  furniture() {
    const zoom = Number(q.get('zoom') ?? 1);
    const kinds = W.FURNITURE_KINDS;
    const cols = 6, cw = 260 * zoom, ch = 250 * zoom;
    size(cw * cols, Math.max(1, Math.ceil(kinds.length / cols)) * ch);
    ctx.fillStyle = '#c69a6a'; ctx.fillRect(0, 0, cv.width, cv.height);
    kinds.forEach((k, i) => {
      const x = (i % cols) * cw + cw / 2, y = Math.floor(i / cols) * ch + ch - 40 * zoom;
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.strokeRect((i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
      ctx.save(); ctx.translate(x, y); ctx.scale(zoom, zoom);
      const fs = W.FURNITURE_SIZE[k];
      if (fs) { ctx.strokeStyle = 'rgba(255,40,40,0.8)'; ctx.lineWidth = 1 / zoom; ctx.strokeRect(-fs.w / 2, -fs.h, fs.w, fs.h); }
      const ok = W.drawFurniture(ctx, game, k, 0, 0, { t: T, weird, seed: i * 0.13 });
      ctx.restore();
      label(`${k} ${fs ? `${fs.w}x${fs.h}` : ''}${ok ? '' : ' (MISSING)'}`, x, y + 28 * zoom, '#10131f', `${12 * zoom}px sans-serif`);
    });
  },
  enemies() {
    const only = (q.get('only') ?? '').split(',').filter(Boolean);
    const kinds = Object.keys(ENEMIES).filter((k) => !ENEMIES[k].legacy && (!only.length || only.includes(k)));
    const zoom = Number(q.get('zoom') ?? 2);
    const cells = [
      ['idle', { anim: 'idle' }], ['move', { anim: 'move' }], ['move L', { anim: 'move', facing: Math.PI }],
      ['atk .2', { anim: 'attack', progress: 0.2 }], ['atk .6', { anim: 'attack', progress: 0.6 }], ['atk .95', { anim: 'attack', progress: 0.95 }],
      ['hurt', { anim: 'hurt', progress: 0.3, hpFrac: 0.4 }], ['flash', { anim: 'idle', flash: 1 }],
      ['ph2', { anim: 'move', phase: 2, hpFrac: 0.6 }], ['ph3', { anim: 'attack', phase: 3, progress: 0.6, hpFrac: 0.2 }],
      ['1x', { anim: 'move', scale: 0.5 }],
    ];
    const rowH = (k) => (ENEMIES[k].boss ? (k === 'partyplanner' ? 300 : 150) : 70) * (ENEMIES[k].boss ? 1 : zoom) + 24;
    const colW = (k) => (ENEMIES[k].boss ? (k === 'partyplanner' ? 330 : 170) : 56 * zoom);
    const width = Math.max(...kinds.map((k) => colW(k) * cells.length + 140), 600);
    size(width, kinds.reduce((s, k) => s + rowH(k), 30));
    ctx.fillStyle = '#c69a6a'; ctx.fillRect(0, 0, cv.width, cv.height);
    cells.forEach(([n], j) => label(n, 140 + j * 56 * zoom + 28 * zoom, 18, '#10131f'));
    let y = 30;
    for (const k of kinds) {
      const h = rowH(k), cw = colW(k), boss = ENEMIES[k].boss, z = boss ? 1 : zoom;
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, y, cv.width, h - 4);
      label(ENEMIES[k].name, 6, y + 16, '#10131f', 'bold 12px sans-serif', 'left');
      label(k, 6, y + 30, '#10131f', '11px sans-serif', 'left');
      cells.forEach(([, opt], j) => {
        if (!boss && (j === 8 || j === 9) && k !== 'code_fish') { /* phases only matter for bosses */ }
        const x = 140 + j * cw + cw / 2;
        ctx.save(); ctx.translate(x, y + h - 22); ctx.scale(z, z);
        const ok = W.drawWorldEnemy(ctx, game, k, 0, 0, { t: T + j * 0.37, facing: 0, seed: 0.3, ...opt, scale: (opt.scale ?? 1) });
        ctx.restore();
        if (!ok && j === 0) label('(not drawn yet)', x, y + h / 2, '#a8483a');
      });
      y += h;
    }
  },
};
(pages[page] ?? pages.enemies)();
document.title = `world gallery: ${page}`;
window.__done = true;
