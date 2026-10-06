// Camp: spend Scoops on hero upgrades and camp buildings. Owned by: strategy team.
import { PALETTE, HEROES, FONT } from '../core/theme.js';
import { saveGame } from '../core/state.js';
import { button, text, panel, bar } from '../ui/widgets.js';
import { drawPortrait } from '../art/sprites.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { rng } from '../core/math.js';
import { UPGRADES, UPGRADE_BY_ID, BUILDINGS } from './data.js';
import {
  ensureCampaign, ownsUpgrade, canBuyUpgrade, buyUpgrade, buildingLevel, nextBuildingCost, canBuyBuilding, buyBuilding,
} from './campaign.js';

const COL_W = 300, ROW_H = 40;
const COLS = { aaron: 12, victoria: 330, camp: 648 };
const ROW_Y0 = 156;
const SMALL_B = 'bold 13px "Trebuchet MS", system-ui, sans-serif';

/** Visible shop rows per hero: each upgrade chain shows only its next unbought tier (or the last, owned). */
function heroRows(state, hero) {
  const list = UPGRADES.filter((u) => u.hero === hero);
  return list.filter((u) => {
    const next = list.find((v) => v.requires === u.id);
    if (u.requires && !ownsUpgrade(state, u.requires)) return false; // hidden until previous tier owned
    if (next && ownsUpgrade(state, u.id)) return false; // replaced by next tier
    return true;
  }).map((u) => ({ kind: 'upgrade', id: u.id, name: u.name, desc: u.desc, cost: u.cost, owned: ownsUpgrade(state, u.id), can: canBuyUpgrade(state, u.id), tier: u.requires ? 'II' : '' }));
}

function campRows(state) {
  const rows = BUILDINGS.map((b) => {
    const lvl = buildingLevel(state, b.id);
    const cost = nextBuildingCost(state, b.id);
    const maxed = cost === null;
    return {
      kind: 'building', id: b.id, name: b.name + (b.costs.length > 1 && lvl > 0 ? ` (Lv ${lvl})` : ''),
      desc: b.desc[Math.min(lvl, b.desc.length - 1)], cost, owned: maxed, can: canBuyBuilding(state, b.id),
    };
  });
  const team = UPGRADE_BY_ID['team.regen'];
  rows.push({ kind: 'upgrade', id: team.id, name: team.name, desc: team.desc, cost: team.cost, owned: ownsUpgrade(state, team.id), can: canBuyUpgrade(state, team.id) });
  return rows;
}

export default class CampScene {
  constructor(game) { this.game = game; }

  enter() {
    ensureCampaign(this.game.state);
    this.flash = null;
    this.sparks = [];
    playMusic('camp');
  }

  layout() {
    const s = this.game.state;
    const out = [];
    for (const h of ['aaron', 'victoria']) heroRows(s, h).forEach((r, i) => out.push({ ...r, x: COLS[h], y: ROW_Y0 + i * (ROW_H + 4), w: COL_W, h: ROW_H }));
    campRows(s).forEach((r, i) => out.push({ ...r, x: COLS.camp, y: 70 + i * 52, w: COL_W, h: 48 }));
    return out;
  }

  update(dt) {
    const g = this.game, s = g.state;
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }
    for (const p of this.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; }
    this.sparks = this.sparks.filter((p) => p.life > 0);
    if (button(null, g, 'Back to map', 806, 486, 146, 40) || g.input.pressed('back') || g.input.pressed('KeyM')) { g.switchScene('overworld'); return; }
    for (const r of this.layout()) {
      if (!button(null, g, r.name, r.x, r.y, r.w, r.h, { disabled: r.owned || !r.can })) continue;
      const ok = r.kind === 'upgrade' ? buyUpgrade(s, r.id) : buyBuilding(s, r.id);
      if (!ok) continue;
      if (r.kind === 'upgrade') g.events.emit('upgrade:bought', { id: r.id });
      saveGame(s);
      playSfx('pickup');
      this.flash = { msg: `${r.name.replace(/ \(Lv \d\)$/, '')} acquired!`, t: 1.8 };
      const c = rng((g.time * 1000) | 0);
      for (let i = 0; i < 24; i++) this.sparks.push({ x: r.x + r.w - 40, y: r.y + r.h / 2, vx: (c() - 0.5) * 260, vy: -c() * 220, life: 0.8, color: [PALETTE.sun, PALETTE.mint, '#ff8fb1'][i % 3] });
      return;
    }
  }

  drawBackground(ctx) {
    const g = this.game, t = g.time;
    const sky = ctx.createLinearGradient(0, 0, 0, g.height);
    sky.addColorStop(0, '#2a3358'); sky.addColorStop(0.55, '#3d4f6e'); sky.addColorStop(1, '#3a5a3f');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, g.width, g.height);
    // string lights
    ctx.strokeStyle = 'rgba(255,246,229,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 44); ctx.quadraticCurveTo(g.width / 2, 74, g.width, 44); ctx.stroke();
    for (let i = 1; i < 24; i++) {
      const x = i * g.width / 24, y = 44 + Math.sin(Math.PI * i / 24) * 15;
      ctx.fillStyle = `rgba(255,201,74,${0.55 + 0.45 * Math.sin(t * 2 + i)})`;
      ctx.beginPath(); ctx.arc(x, y + 4, 3, 0, Math.PI * 2); ctx.fill();
    }
    // pines silhouette along the bottom + campfire glow
    const r = rng(77);
    ctx.fillStyle = '#23402b';
    for (let i = 0; i < 40; i++) { const x = r() * g.width, s = 20 + r() * 30; ctx.beginPath(); ctx.moveTo(x - s / 2, g.height); ctx.lineTo(x, g.height - s * 2); ctx.lineTo(x + s / 2, g.height); ctx.fill(); }
    const fx = 728, fy = 510;
    const glow = ctx.createRadialGradient(fx, fy, 4, fx, fy, 120 + Math.sin(t * 9) * 6);
    glow.addColorStop(0, 'rgba(255,170,60,0.55)'); glow.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(fx, fy, 130, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = [PALETTE.danger, PALETTE.sunDeep, PALETTE.sun][i];
      const fl = 18 - i * 5 + Math.sin(t * 12 + i) * 3;
      ctx.beginPath(); ctx.moveTo(fx - 10 + i * 3, fy + 6); ctx.quadraticCurveTo(fx, fy - fl * 1.6, fx + 10 - i * 3, fy + 6); ctx.fill();
    }
    ctx.fillStyle = PALETTE.choc; ctx.fillRect(fx - 14, fy + 4, 28, 5);
  }

  drawHeroHeader(ctx, hero) {
    const g = this.game, p = g.state.party[hero], H = HEROES[hero], x = COLS[hero];
    panel(ctx, x, 70, COL_W, 80, { fill: 'rgba(16,19,31,0.78)', stroke: hero === 'aaron' ? PALETTE.tee : PALETTE.denim });
    drawPortrait(ctx, g, hero, x + 42, 110, 32, { border: 3, borderColor: PALETTE.sun });
    text(ctx, H.name, x + 86, 94, { font: 'bold 18px "Trebuchet MS", system-ui, sans-serif', color: PALETTE.sun });
    ctx.save(); ctx.font = 'bold 18px "Trebuchet MS", system-ui, sans-serif'; const nw = ctx.measureText(H.name).width; ctx.restore();
    text(ctx, H.title, x + 86 + nw + 10, 94, { font: FONT.small, color: PALETTE.frost });
    const stats = [['HP', p.maxHp, H.base.maxHp, 220, PALETTE.heal], ['DMG', p.damage, H.base.damage, 32, PALETTE.danger], ['SPD', p.speed, H.base.speed, 240, PALETTE.sky]];
    stats.forEach(([lab, v, base, max, col], i) => {
      const yy = 106 + i * 14;
      text(ctx, lab, x + 86, yy + 8, { font: FONT.small, shadow: false });
      bar(ctx, x + 118, yy, 130, 9, v / max, col);
      text(ctx, `${v}${v > base ? ` (+${v - base})` : ''}`, x + 254, yy + 8, { font: FONT.small, shadow: false, color: v > base ? PALETTE.mint : PALETTE.paper });
    });
  }

  drawRow(ctx, r) {
    const g = this.game, m = g.input.mouse;
    const hover = m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
    const fill = r.owned ? 'rgba(63,168,116,0.35)' : !r.can ? 'rgba(16,19,31,0.7)' : hover ? 'rgba(242,159,46,0.9)' : 'rgba(16,19,31,0.85)';
    panel(ctx, r.x, r.y, r.w, r.h, { fill, stroke: r.owned ? PALETTE.mintDeep : r.can ? PALETTE.sun : '#59607a', radius: 8 });
    const tall = r.h > 44;
    text(ctx, r.name, r.x + 10, r.y + (tall ? 19 : 17), { font: SMALL_B, color: r.owned ? PALETTE.mint : PALETTE.paper });
    text(ctx, r.desc, r.x + 10, r.y + (tall ? 38 : 33), { font: FONT.small, color: r.owned ? '#cfe' : PALETTE.frost });
    if (r.owned) text(ctx, r.kind === 'building' ? 'BUILT' : 'OWNED', r.x + r.w - 10, r.y + 17, { align: 'right', font: SMALL_B, color: PALETTE.mint });
    else {
      ctx.fillStyle = PALETTE.mint; ctx.beginPath(); ctx.arc(r.x + r.w - 14, r.y + 13, 5, 0, Math.PI * 2); ctx.fill();
      text(ctx, String(r.cost), r.x + r.w - 24, r.y + 17, { align: 'right', font: SMALL_B, color: r.can ? PALETTE.sun : '#9aa3b5' });
    }
  }

  render(ctx) {
    const g = this.game, s = g.state;
    this.drawBackground(ctx);
    // top bar
    ctx.fillStyle = 'rgba(16,19,31,0.82)'; ctx.fillRect(0, 0, g.width, 36);
    text(ctx, 'Lakeside Camp', 12, 25, { font: 'bold 19px "Trebuchet MS", system-ui, sans-serif', color: PALETTE.sun });
    text(ctx, `Day ${s.day}   |   ${s.resources.scoops} Scoops   |   ${s.resources.sunshine} Sunshine`, 180, 24);
    text(ctx, 'Spend Scoops on gear and camp perks. Everything heals at camp.', g.width - 12, 24, { align: 'right', font: FONT.small, color: PALETTE.frost });
    this.drawHeroHeader(ctx, 'aaron');
    this.drawHeroHeader(ctx, 'victoria');
    text(ctx, 'Camp Buildings', COLS.camp + 4, 62, { font: SMALL_B, color: PALETTE.sun });
    for (const r of this.layout()) this.drawRow(ctx, r);
    button(ctx, g, 'Back to map', 806, 486, 146, 40);
    for (const p of this.sparks) { ctx.globalAlpha = Math.max(0, p.life / 0.8); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
    ctx.globalAlpha = 1;
    if (this.flash) {
      ctx.globalAlpha = Math.min(1, this.flash.t * 2);
      panel(ctx, COLS.camp, 340, COL_W, 34, { fill: 'rgba(16,19,31,0.9)', stroke: PALETTE.mint });
      text(ctx, this.flash.msg, COLS.camp + COL_W / 2, 358, { align: 'center', baseline: 'middle', color: PALETTE.mint, font: SMALL_B });
      ctx.globalAlpha = 1;
    }
  }
}
