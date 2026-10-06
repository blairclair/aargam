// HUD CONTRACT — Owned by: art/ui/audio team. Signature FROZEN.
// Action scene calls drawHUD(ctx, game, hud) every frame in SCREEN space (no camera).
import { HEROES, PALETTE, FONT } from '../core/theme.js';
import { drawPortrait } from '../art/sprites.js';
import { bar, text, panel, ring, keycap, chip, drawScoopIcon, drawSunIcon, uiTime } from './widgets.js';

const TAU = Math.PI * 2;
const ghosts = new Map(); // trailing damage per bar key
let lastNow = 0;
function ghostOf(key, frac, dt) {
  let g = ghosts.get(key);
  if (g == null || frac > g) g = frac;
  else g = Math.max(frac, g - dt * 0.6);
  ghosts.set(key, g);
  return g;
}
const pops = new Map(); // value-change pops (scoops counter)
function popOf(key, v, dt) {
  let p = pops.get(key) ?? { v, k: 0 };
  if (p.v !== v) p = { v, k: 1 };
  p.k = Math.max(0, p.k - dt * 4);
  pops.set(key, p);
  return p.k;
}

// ------------------------------------------------------------ ability glyphs
function glyph(ctx, kind, x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (kind) {
    case 'compass': // Compass Dash
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.stroke();
      ctx.fillStyle = PALETTE.danger; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(2.2, 0); ctx.lineTo(-2.2, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(2.2, 0); ctx.lineTo(-2.2, 0); ctx.closePath(); ctx.fill();
      break;
    case 'shout': // Summit Shout
      ctx.beginPath(); ctx.moveTo(-7, -2.5); ctx.lineTo(-2, -2.5); ctx.lineTo(3, -6); ctx.lineTo(3, 6); ctx.lineTo(-2, 2.5); ctx.lineTo(-7, 2.5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(3, 0, 5, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(3, 0, 8, -0.7, 0.7); ctx.stroke();
      break;
    case 'shield': // Denim Shield
      ctx.fillStyle = PALETTE.denim;
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(6.5, -4.5); ctx.quadraticCurveTo(6, 4, 0, 8); ctx.quadraticCurveTo(-6, 4, -6.5, -4.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e6a24a'; ctx.lineWidth = 1; ctx.setLineDash([1.5, 1.5]);
      ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4.5, -3.2); ctx.quadraticCurveTo(4, 3, 0, 6); ctx.quadraticCurveTo(-4, 3, -4.5, -3.2); ctx.closePath(); ctx.stroke();
      ctx.setLineDash([]);
      break;
    case 'bloom': // Flower Box Bloom
      ctx.fillStyle = '#e98aa8';
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5 - Math.PI / 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 3.8, -1.5 + Math.sin(a) * 3.8, 2.8, 0, TAU); ctx.fill(); }
      ctx.fillStyle = PALETTE.sun; ctx.beginPath(); ctx.arc(0, -1.5, 2.3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#9a6a42'; ctx.fillRect(-6, 4.5, 12, 3.5);
      break;
    default:
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
const GLYPHS = { aaron: ['compass', 'shout'], victoria: ['shield', 'bloom'] };

// ------------------------------------------------------------ pieces
function heroCard(ctx, game, id, h, active, x, y, dt) {
  const hero = HEROES[id];
  const down = h.down || h.hp <= 0;
  const frac = h.maxHp > 0 ? h.hp / h.maxHp : 0;
  const ghost = ghostOf('hp:' + id, frac, dt);
  const low = frac < 0.3 && !down;
  const accent = id === 'aaron' ? PALETTE.sun : PALETTE.mint;
  if (active) {
    panel(ctx, x, y, 268, 70, { radius: 18, alpha: 0.92 });
    const pr = 27;
    const pulse = low ? 2 + Math.sin(uiTime() * 10) * 2 : 0;
    drawPortrait(ctx, game, id, x + 38, y + 35, pr, { ring: low ? PALETTE.danger : accent, ringWidth: 4 + pulse, border: 2, grey: down });
    text(ctx, hero.name, x + 74, y + 21, { font: 'bold 16px "Trebuchet MS", system-ui, sans-serif', color: accent, baseline: 'middle' });
    text(ctx, `${Math.max(0, Math.round(h.hp))}/${h.maxHp}`, x + 182, y + 21, { font: FONT.small, align: 'right', baseline: 'middle', color: 'rgba(255,246,229,0.8)' });
    bar(ctx, x + 74, y + 32, 110, 12, frac, low ? PALETTE.danger : PALETTE.heal, 'rgba(0,0,0,0.55)', { ghost });
    // ability rings
    const cds = h.cooldowns ?? {};
    const [ga, gs] = GLYPHS[id] ?? ['', ''];
    const abilities = hero.abilities ?? {};
    [[cds.ability ?? 0, ga, 'K', abilities.ability?.name], [cds.special ?? 0, gs, 'E', abilities.special?.name]].forEach(([rem, gl, key], i) => {
      const cx = x + 212 + i * 36, cy = y + 31;
      ring(ctx, cx, cy, 15, rem, { color: accent });
      glyph(ctx, gl, cx, cy, 1, rem > 0 ? 'rgba(255,246,229,0.45)' : PALETTE.paper);
      keycap(ctx, key, cx, cy + 22, { small: true });
    });
    text(ctx, hero.title, x + 74, y + 57, { font: FONT.small, color: 'rgba(255,246,229,0.6)', baseline: 'middle', shadow: false });
  } else {
    panel(ctx, x, y, 170, 46, { radius: 16, alpha: 0.75, style: 'dark' });
    drawPortrait(ctx, game, id, x + 24, y + 23, 17, { ring: down ? '#555a6a' : 'rgba(255,246,229,0.35)', ringWidth: 2, border: 1.5, grey: down, alpha: down ? 0.8 : 0.95 });
    text(ctx, hero.name, x + 48, y + 15, { font: 'bold 13px "Trebuchet MS", system-ui, sans-serif', color: down ? '#9a9fae' : accent, baseline: 'middle' });
    bar(ctx, x + 48, y + 25, 82, 8, frac, PALETTE.heal, 'rgba(0,0,0,0.55)', { ghost });
    if (down) chip(ctx, 'KO', x + 140, y + 15, { fill: PALETTE.danger, color: PALETTE.paper, font: 'bold 10px "Trebuchet MS", sans-serif' });
    else keycap(ctx, 'Q', x + 148, y + 28, { small: true });
    text(ctx, down ? 'resting' : 'swap', x + 48, y + 40, { font: '10px "Trebuchet MS", sans-serif', color: 'rgba(255,246,229,0.55)', baseline: 'middle', shadow: false });
  }
}

function objectivePanel(ctx, game, hud, dt) {
  const W = game.width;
  const obj = String(hud.objective ?? '');
  ctx.save(); ctx.font = 'bold 15px "Trebuchet MS", system-ui, sans-serif';
  const tw = Math.min(380, Math.max(180, ctx.measureText(obj).width + 40));
  ctx.restore();
  const hasProg = typeof hud.progress === 'number';
  const ph = hasProg ? 52 : 38;
  const x = W - tw - 14, y = 12;
  panel(ctx, x, y, tw, ph, { radius: 14, alpha: 0.88 });
  // little flag icon
  ctx.save();
  ctx.fillStyle = PALETTE.sun; ctx.fillRect(x + 14, y + 10, 2, 18);
  ctx.beginPath(); ctx.moveTo(x + 16, y + 10); ctx.lineTo(x + 27, y + 14); ctx.lineTo(x + 16, y + 18); ctx.closePath(); ctx.fill();
  ctx.restore();
  text(ctx, obj, x + 34, y + 20, { font: 'bold 15px "Trebuchet MS", system-ui, sans-serif', baseline: 'middle', maxWidth: tw - 44 });
  if (hasProg) bar(ctx, x + 34, y + 34, tw - 48, 8, hud.progress, PALETTE.sun, 'rgba(0,0,0,0.5)');
  // resources row
  const ry = y + ph + 8;
  const pop = popOf('scoops', hud.scoops ?? 0, dt);
  panel(ctx, W - 108, ry, 94, 32, { radius: 16, alpha: 0.85 });
  drawScoopIcon(ctx, W - 88, ry + 17, 0.95 + pop * 0.35);
  text(ctx, String(hud.scoops ?? 0), W - 70, ry + 17, { font: `bold ${Math.round(17 + pop * 6)}px "Trebuchet MS", system-ui, sans-serif`, baseline: 'middle', color: pop > 0 ? PALETTE.mint : PALETTE.paper });
  if (hud.sunshine != null && hud.sunshine > 0) {
    const spop = popOf('sun', hud.sunshine, dt);
    panel(ctx, W - 186, ry, 70, 32, { radius: 16, alpha: 0.85 });
    drawSunIcon(ctx, W - 166, ry + 16, 0.9 + spop * 0.3);
    text(ctx, String(hud.sunshine), W - 148, ry + 17, { font: 'bold 17px "Trebuchet MS", system-ui, sans-serif', baseline: 'middle', color: spop > 0 ? PALETTE.sun : PALETTE.paper });
  }
}

function bossBar(ctx, game, boss, dt) {
  const W = game.width, H = game.height;
  const w = 520, x = (W - w) / 2, y = H - 34;
  const frac = Math.max(0, Math.min(1, boss.frac ?? 0));
  const ghost = ghostOf('boss:' + boss.name, frac, dt);
  panel(ctx, x - 12, y - 18, w + 24, 42, { style: 'ice', radius: 14, alpha: 0.92 });
  bar(ctx, x, y + 2, w, 14, frac, PALETTE.frostDeep, 'rgba(8,10,18,0.7)', { ghost });
  // phase ticks at 1/3 and 2/3
  ctx.save(); ctx.fillStyle = 'rgba(232,248,255,0.7)';
  for (const k of [1 / 3, 2 / 3]) ctx.fillRect(x + w * k - 1, y + 2, 2, 14);
  // icicle trim
  ctx.fillStyle = PALETTE.ice;
  for (let i = 0; i < 14; i++) { const ix = x - 4 + i * (w + 8) / 13; ctx.beginPath(); ctx.moveTo(ix - 3, y + 23); ctx.lineTo(ix + 3, y + 23); ctx.lineTo(ix, y + 27 + (i % 3) * 2); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  text(ctx, boss.name ?? 'Boss', W / 2, y - 6, { align: 'center', baseline: 'middle', font: 'bold 14px "Trebuchet MS", system-ui, sans-serif', color: PALETTE.ice, outline: 'rgba(16,19,31,0.9)', outlineWidth: 3 });
}

/**
 * @param {{
 *   active: 'aaron'|'victoria',
 *   heroes: { [id: string]: { hp: number, maxHp: number, down?: boolean, cooldowns: { ability: number, special: number } } }, // cooldowns: 0..1 remaining fraction
 *   objective: string,            // e.g. "Defeat all Frostlings (4 left)"
 *   progress?: number,            // 0..1 objective progress, optional
 *   scoops: number,               // collected this mission
 *   sunshine?: number,            // collected this mission (optional)
 *   bossHp?: { name: string, frac: number },
 * }} hud
 */
export function drawHUD(ctx, game, hud) {
  if (!hud) return;
  const now = uiTime();
  const dt = Math.min(0.1, Math.max(0, now - lastNow)); lastNow = now;
  ctx.save();
  const ids = Object.keys(hud.heroes ?? {});
  const active = hud.active ?? ids[0];
  let x = 12;
  if (hud.heroes?.[active]) { heroCard(ctx, game, active, hud.heroes[active], true, x, 12, dt); x += 280; }
  for (const id of ids) if (id !== active && HEROES[id]) heroCard(ctx, game, id, hud.heroes[id], false, x, 18, dt);
  objectivePanel(ctx, game, hud, dt);
  if (hud.bossHp) bossBar(ctx, game, hud.bossHp, dt);
  ctx.restore();
}

/**
 * Optional pause overlay (screen space). Returns nothing; draw last.
 * o: { title?, lines?: string[] (e.g. controls) }
 */
export function drawPauseOverlay(ctx, game, o = {}) {
  const W = game.width, H = game.height;
  ctx.save();
  ctx.fillStyle = 'rgba(16,19,31,0.6)'; ctx.fillRect(0, 0, W, H);
  panel(ctx, W / 2 - 200, H / 2 - 130, 400, 260, { radius: 20 });
  text(ctx, o.title ?? 'Paused', W / 2, H / 2 - 88, { align: 'center', baseline: 'middle', font: 'bold 34px "Trebuchet MS", system-ui, sans-serif', color: PALETTE.sun });
  const lines = o.lines ?? ['WASD / arrows: move', 'Mouse / J: attack', 'Shift / K / right-click: ability', 'E / L: special', 'Q / Tab: swap hero', 'Esc / P: resume'];
  lines.forEach((l, i) => text(ctx, l, W / 2, H / 2 - 44 + i * 26, { align: 'center', baseline: 'middle', color: PALETTE.paper }));
  ctx.restore();
}
