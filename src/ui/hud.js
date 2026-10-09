// HUD CONTRACT — Owned by: art/ui/audio team. Signature FROZEN.
// Action scene calls drawHUD(ctx, game, hud) every frame in SCREEN space (no camera).
import { HEROES, PALETTE, FONT } from '../core/theme.js';
import { drawPortrait, drawCutoutHead, drawSkillIcon } from '../art/sprites.js';
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
  if (hud.hero && !hud.heroes) { drawHUDv2(ctx, game, hud, dt); return; } // v2 shape
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
  const lines = o.lines ?? ['Arrow keys: move', 'Mouse / J: attack', 'Shift / K / right-click: ability', 'E / L: special', 'Q / Tab: swap hero', 'Esc / P: resume'];
  lines.forEach((l, i) => text(ctx, l, W / 2, H / 2 - 44 + i * 26, { align: 'center', baseline: 'middle', color: PALETTE.paper }));
  ctx.restore();
}

// ============================================================ HUD v2 (one hero, skill bar, ultimate, objective, boss phases)
export const HUD_VERSION = 2;
const HERO_ACCENT = { aaron: PALETTE.sun, victoria: PALETTE.mint };

function heroCardV2(ctx, game, hud, dt) {
  const id = hud.hero, hero = HEROES[id];
  const accent = HERO_ACCENT[id] ?? PALETTE.sun;
  const maxHp = hud.maxHp || 1;
  const frac = Math.max(0, Math.min(1, (hud.hp ?? 0) / maxHp));
  const ghost = ghostOf('hp2:' + id, frac, dt);
  const low = frac < 0.3 && frac > 0;
  const x = 12, y = 12, w = 262, h = 66;
  panel(ctx, x, y, w, h, { radius: 18, alpha: 0.92, stroke: low ? PALETTE.danger : accent });
  // head well
  const pulse = low ? 0.5 + 0.5 * Math.sin(uiTime() * 10) : 0;
  ctx.save();
  ctx.fillStyle = rgbaHex(accent, 0.22 + pulse * 0.2);
  ctx.beginPath(); ctx.arc(x + 38, y + 34, 27, 0, TAU); ctx.fill();
  ctx.strokeStyle = low ? PALETTE.danger : accent; ctx.lineWidth = 3 + pulse * 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(x + 38, y + 34, 27, 0, TAU); ctx.clip();
  if (!drawCutoutHead(ctx, game, id, x + 38, y + 58, 46, { grey: frac <= 0 })) drawPortrait(ctx, game, id, x + 38, y + 34, 25, { border: 0, grey: frac <= 0 });
  ctx.restore();
  text(ctx, hero?.name ?? id, x + 74, y + 19, { font: 'bold 16px "Trebuchet MS", system-ui, sans-serif', color: accent, baseline: 'middle' });
  if (hud.favored) chip(ctx, '★ favored', x + 76 + measure(ctx, hero?.name ?? id, 'bold 16px "Trebuchet MS", system-ui, sans-serif'), y + 19, { fill: rgbaHex(accent, 0.9), font: 'bold 10px "Trebuchet MS", sans-serif' });
  text(ctx, `${Math.max(0, Math.round(hud.hp ?? 0))} / ${maxHp}`, x + w - 14, y + 19, { font: FONT.small, align: 'right', baseline: 'middle', color: 'rgba(255,246,229,0.8)' });
  bar(ctx, x + 74, y + 31, w - 88, 13, frac, low ? PALETTE.danger : PALETTE.heal, 'rgba(0,0,0,0.55)', { ghost });
  text(ctx, hero?.title ?? '', x + 74, y + 54, { font: FONT.small, color: 'rgba(255,246,229,0.6)', baseline: 'middle', shadow: false });
}

function measure(ctx, s, font) { ctx.save(); ctx.font = font; const w = ctx.measureText(s).width; ctx.restore(); return w; }
function rgbaHex(hex, a) { const n = hex.replace('#', ''); return `rgba(${parseInt(n.slice(0, 2), 16)},${parseInt(n.slice(2, 4), 16)},${parseInt(n.slice(4, 6), 16)},${a})`; }

const flashes = new Map(); // slot ready-flash memory
function slot(ctx, s, x, y, r, accent, dt, o = {}) {
  if (!s || !s.id) {
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,246,229,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
    if (o.key) keycap(ctx, o.key, x, y + r + 4, { small: true });
    return;
  }
  const cd = Math.max(0, Math.min(1, s.cd ?? 0));
  // "ready!" flash when a cooldown finishes
  const key = o.mem ?? s.id;
  const f = flashes.get(key) ?? { cd, k: 0 };
  if (f.cd > 0 && cd <= 0) f.k = 1;
  f.cd = cd; f.k = Math.max(0, f.k - dt * 3);
  flashes.set(key, f);
  if (f.k > 0) { ctx.save(); ctx.strokeStyle = rgbaHex(PALETTE.paper, f.k); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 4 + (1 - f.k) * 10, 0, TAU); ctx.stroke(); ctx.restore(); }
  drawSkillIcon(ctx, s.id, x, y, r * 2, { dim: cd > 0, ready: o.ult && (s.ready ?? cd <= 0) });
  if (cd > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,18,0.55)';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r - 1, -Math.PI / 2, -Math.PI / 2 + TAU * cd); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, r + 1.5, -Math.PI / 2 + TAU * cd, -Math.PI / 2 + TAU); ctx.stroke();
    ctx.restore();
  }
  if (s.key ?? o.key) keycap(ctx, s.key ?? o.key, x, y + r + 4, { small: true });
}

function skillBarV2(ctx, game, hud, dt) {
  const accent = HERO_ACCENT[hud.hero] ?? PALETTE.sun;
  const H = game.height;
  const skills = hud.skills ?? [];
  const n = 1 + Math.max(2, skills.length) + (hud.ultimate ? 1 : 0);
  const w = 26 + n * 58 + (hud.ultimate ? 10 : 0), x = 12, y = H - 82, h = 70;
  panel(ctx, x, y, w, h, { radius: 18, alpha: 0.85 });
  let cx = x + 36;
  const basic = typeof hud.basic === 'string' ? { id: hud.basic, cd: 0, key: 'J' } : hud.basic;
  slot(ctx, basic, cx, y + 30, 19, accent, dt, { key: 'J', mem: 'basic' }); cx += 58;
  for (let i = 0; i < Math.max(2, skills.length); i++) { slot(ctx, skills[i], cx, y + 30, 21, accent, dt, { key: ['K', 'E'][i], mem: 's' + i }); cx += 58; }
  if (hud.ultimate) {
    cx += 8;
    slot(ctx, hud.ultimate, cx, y + 29, 24, PALETTE.sun, dt, { key: hud.ultimate.key ?? 'Space', ult: true, mem: 'ult' });
  }
}

function objectiveV2(ctx, game, hud) {
  const W = game.width;
  const obj = String(hud.objective ?? '');
  const accent = HERO_ACCENT[hud.hero] ?? PALETTE.sun;
  const tw = Math.min(420, Math.max(200, measure(ctx, obj, 'bold 15px "Trebuchet MS", system-ui, sans-serif') + 54));
  const hasProg = typeof hud.progress === 'number';
  const ph = hasProg ? 54 : 40;
  const x = W - tw - 12, y = 12;
  panel(ctx, x, y, tw, ph, { radius: 14, alpha: 0.9 });
  // little flag
  ctx.save();
  ctx.fillStyle = accent; ctx.fillRect(x + 15, y + 10, 2, 19);
  ctx.beginPath(); ctx.moveTo(x + 17, y + 10); ctx.lineTo(x + 29, y + 14.5); ctx.lineTo(x + 17, y + 19); ctx.closePath(); ctx.fill();
  ctx.restore();
  text(ctx, obj, x + 38, y + 20, { font: 'bold 15px "Trebuchet MS", system-ui, sans-serif', baseline: 'middle', maxWidth: tw - 50 });
  if (hasProg) {
    const p = Math.max(0, Math.min(1, hud.progress));
    bar(ctx, x + 38, y + 36, tw - 92, 9, p, PALETTE.sun, 'rgba(0,0,0,0.5)');
    text(ctx, `${Math.round(p * 100)}%`, x + tw - 14, y + 40, { font: 'bold 12px "Trebuchet MS", sans-serif', align: 'right', baseline: 'middle', color: p >= 1 ? PALETTE.heal : PALETTE.paper });
  }
}

function bossBarV2(ctx, game, boss, dt) {
  const W = game.width, H = game.height;
  const w = 420, x = (W - w) / 2 + 60, y = H - 40;
  const frac = Math.max(0, Math.min(1, boss.frac ?? 0));
  const ghost = ghostOf('boss2:' + boss.name, frac, dt);
  const isPP = /partyplanner/i.test(boss.name ?? '');
  const col = isPP ? '#7dff9b' : PALETTE.danger;
  panel(ctx, x - 12, y - 20, w + 24, 46, { radius: 14, alpha: 0.92, fill: isPP ? 'rgba(8,24,16,0.92)' : undefined, stroke: col });
  bar(ctx, x, y + 2, w, 14, frac, col, 'rgba(8,10,18,0.7)', { ghost });
  // phases: number (equal splits) or array of hp fractions where phases change
  let ticks = [];
  if (Array.isArray(boss.phases)) ticks = boss.phases.filter((f) => f > 0 && f < 1);
  else if (boss.phases > 1) for (let k = 1; k < boss.phases; k++) ticks.push(k / boss.phases);
  ctx.save();
  for (const k of ticks) {
    const passed = frac < k;
    ctx.fillStyle = passed ? 'rgba(255,246,229,0.35)' : PALETTE.paper;
    ctx.fillRect(x + w * k - 1, y, 2, 18);
    ctx.beginPath(); ctx.moveTo(x + w * k - 4, y - 3); ctx.lineTo(x + w * k + 4, y - 3); ctx.lineTo(x + w * k, y + 2); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  let label = boss.name ?? 'Boss';
  if (ticks.length) {
    const phase = 1 + ticks.filter((k) => frac < k).length;
    label += `  ·  phase ${phase}/${ticks.length + 1}`;
  }
  text(ctx, label, x + w / 2, y - 7, { align: 'center', baseline: 'middle', font: isPP ? 'bold 13px "SF Mono", Menlo, Consolas, monospace' : 'bold 14px "Trebuchet MS", system-ui, sans-serif', color: isPP ? '#7dff9b' : PALETTE.paper, outline: 'rgba(16,19,31,0.9)', outlineWidth: 3 });
}

function drawHUDv2(ctx, game, hud, dt) {
  ctx.save();
  heroCardV2(ctx, game, hud, dt);
  skillBarV2(ctx, game, hud, dt);
  objectiveV2(ctx, game, hud);
  if (hud.bossHp) bossBarV2(ctx, game, hud.bossHp, dt);
  ctx.restore();
}
