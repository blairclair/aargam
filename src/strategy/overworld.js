// Overworld / campaign map. Owned by: strategy team.
// enter({ outcome? }): if outcome present, apply rewards, thaw, end the day (frost spreads), save,
// then show a results panel. Otherwise just show the map.
import { PALETTE, REGIONS, MISSION_KINDS, FONT, ENEMIES } from '../core/theme.js';
import { saveGame } from '../core/state.js';
import { launchMission } from '../core/mission.js';
import { button, text, panel } from '../ui/widgets.js';
import { Dialog } from '../ui/dialog.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { ECON, NODES, NODE_BY_ID, REGION_GOLEM } from './data.js';
import {
  ensureCampaign, forecast, isAvailable, lockReason, frostOf, difficultyOf, rewardsFor, modifiersFor,
  missionParamsFor, applyOutcome, endDay, lossReason, canWarm, warmNode, canShield, shieldNode,
  shielded, currentRegion,
} from './campaign.js';
import { drawMap, hitNode, nodeRadius, KIND_LABEL } from './mapdraw.js';
import { FIRST_VISIT, LIBERATED, BARON_DEFEATED, DEFEAT_LINES, CAMP_CHILL_WARNING } from './story.js';

const SMALL_B = 'bold 13px "Trebuchet MS", system-ui, sans-serif';
const nameOf = (id) => NODE_BY_ID[id]?.name ?? id;

function describeChange(c) {
  const n = nameOf(c.id);
  if (c.reason === 'storm') return `${n}: storm, +1 frost`;
  if (c.reason === 'refreeze') return `${n}: re-freezes (next to ${nameOf(c.source)})`;
  if (c.reason === 'chill') return `CAMP CHILL +1 (${nameOf(c.source)} is frozen solid)`;
  return 'Camp warms up: chill -1';
}

export default class OverworldScene {
  constructor(game) { this.game = game; this.dialog = new Dialog(game); }

  enter(params = {}) {
    const g = this.game, s = g.state;
    ensureCampaign(s);
    this.selected = null;
    this.armed = null;
    this.hover = null;
    this.results = null;
    this.pulse = null;
    this.toast = null;
    this.after = [];
    this.dialog.open([]);
    playMusic('overworld');

    if (params.outcome && params.outcome.nodeId) {
      this.handleOutcome(params.outcome);
    } else if (lossReason(s)) {
      this.goEnding(false);
      return;
    } else if (!s.flags['strategy.introSeen']) {
      s.flags['strategy.introSeen'] = true;
      saveGame(s);
      this.dialog.open(FIRST_VISIT);
    }
    this.forecast = forecast(s);
    this.selected = this.defaultSelection();
  }

  handleOutcome(outcome) {
    const g = this.game, s = g.state;
    const rep = applyOutcome(s, outcome);
    for (const id of rep.thawed) g.events.emit('node:thawed', { nodeId: id, region: NODE_BY_ID[id]?.region });
    if (rep.wonGame) {
      saveGame(s);
      playSfx('victory');
      this.pulse = { ids: rep.thawed, t: 0 };
      this.dialog.open(BARON_DEFEATED, () => this.goEnding(true));
      return;
    }
    const night = endDay(s);
    saveGame(s);
    playSfx(rep.victory ? 'thaw' : 'defeat');
    if (night.changes.some((c) => !c.blocked && c.delta > 0)) setTimeout(() => playSfx('freeze'), 350);
    this.results = { rep, night };
    this.pulse = rep.thawed.length ? { ids: rep.thawed, t: 0 } : null;
    // story beats queued after the results panel
    if (rep.liberated) this.after.push(LIBERATED[rep.liberated]);
    else if (!rep.victory) this.after.push(DEFEAT_LINES[(s.day + s.stats.missionsLost) % DEFEAT_LINES.length]);
    const fc = forecast(s);
    if (fc.some((c) => c.id === 'camp' && c.delta > 0 && !c.blocked) && !lossReason(s)) this.after.push(CAMP_CHILL_WARNING);
  }

  goEnding(victory) { this.game.switchScene('ending', { victory }); }

  defaultSelection() {
    const s = this.game.state;
    const reg = currentRegion(s);
    return NODES.find((n) => isAvailable(s, n.id) && n.region === reg)?.id ?? NODES.find((n) => isAvailable(s, n.id))?.id ?? 'camp';
  }

  closeResults() {
    this.results = null;
    const s = this.game.state;
    const next = () => {
      const lines = this.after.shift();
      if (lines) this.dialog.open(lines, next);
      else if (lossReason(s)) this.goEnding(false);
    };
    next();
  }

  // ---------- layout shared by update + render ----------
  actionButtons() {
    const s = this.game.state, id = this.selected;
    if (!id) return [];
    const x = 612, y = 502, h = 28, out = [];
    if (id === 'camp') {
      out.push({ key: 'camp', label: 'Enter Camp', x, y, w: 160, h, enabled: true });
      out.push({ key: 'shield', label: `Shield camp (${ECON.shieldCost} Sun)`, x: x + 166, y, w: 162, h, enabled: canShield(s, id) });
      return out;
    }
    out.push({ key: 'launch', label: 'Launch!', x, y, w: 100, h, enabled: isAvailable(s, id) });
    out.push({ key: 'warm', label: `Warm -1 (${ECON.warmCost} Sun)`, x: x + 106, y, w: 126, h, enabled: canWarm(s, id) });
    out.push({ key: 'shield', label: `Shield (${ECON.shieldCost} Sun)`, x: x + 238, y, w: 90, h, enabled: canShield(s, id) });
    return out;
  }

  update(dt) {
    const g = this.game, s = g.state, inp = g.input, m = inp.mouse;
    if (this.pulse) this.pulse.t += dt;
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    if (this.dialog.active) { this.dialog.update(dt); return; }

    if (this.results) {
      if (button(null, g, 'Continue', 400, 404, 160, 40) || inp.pressed('confirm')) this.closeResults();
      return;
    }
    if (!s.map) return;

    // top bar: camp button
    if (button(null, g, 'Camp', 872, 4, 80, 28) || inp.pressed('KeyC')) { g.switchScene('camp'); return; }

    this.hover = m.y < 438 ? hitNode(m.x, m.y)?.id ?? null : null;
    // action buttons first (they sit over the map)
    for (const b of this.actionButtons()) {
      if (button(null, g, b.label, b.x, b.y, b.w, b.h, { disabled: !b.enabled })) { this.doAction(b.key); return; }
    }
    if (m.pressed && this.hover && m.y < 438) {
      // second click on a node the player already clicked = launch
      if (this.armed === this.hover && this.selected === this.hover && isAvailable(s, this.hover)) { this.doAction('launch'); return; }
      this.selected = this.armed = this.hover;
      playSfx('click');
    }
    // keyboard: cycle reachable nodes, Enter to launch
    if (inp.pressed('left') || inp.pressed('right') || inp.pressed('up') || inp.pressed('down')) {
      const list = ['camp', ...NODES.filter((n) => isAvailable(s, n.id)).map((n) => n.id)];
      const i = list.indexOf(this.selected);
      const dir = inp.pressed('left') || inp.pressed('up') ? -1 : 1;
      this.selected = list[(i + dir + list.length) % list.length];
    }
    if (inp.pressed('confirm') && this.selected) {
      if (this.selected === 'camp') g.switchScene('camp');
      else if (isAvailable(s, this.selected)) this.doAction('launch');
    }
  }

  doAction(key) {
    const g = this.game, s = g.state, id = this.selected;
    if (key === 'camp') { g.switchScene('camp'); return; }
    if (key === 'launch') {
      if (!isAvailable(s, id)) return;
      saveGame(s);
      launchMission(g, missionParamsFor(s, id));
      return;
    }
    if (key === 'warm' && warmNode(s, id)) {
      playSfx('thaw');
      this.pulse = { ids: [id], t: 0 };
      this.toast = { msg: frostOf(s, id) === 0 ? `${nameOf(id)} thawed with Sunshine!` : `${nameOf(id)}: frost ${frostOf(s, id)}`, t: 2 };
      if (frostOf(s, id) === 0) g.events.emit('node:thawed', { nodeId: id, region: NODE_BY_ID[id].region });
    } else if (key === 'shield' && shieldNode(s, id)) {
      playSfx('shield');
      this.toast = { msg: `${nameOf(id)} is shielded tonight`, t: 2 };
    } else return;
    saveGame(s);
    this.forecast = forecast(s);
  }

  // ---------- render ----------
  render(ctx) {
    const g = this.game, s = g.state;
    if (!s.map) return;
    this.forecast = forecast(s);
    drawMap(ctx, g, { hover: this.hover, selected: this.selected, forecast: this.forecast, time: g.time, pulse: this.pulse });
    this.drawTopBar(ctx);
    this.drawForecast(ctx);
    if (this.selected) this.drawSelection(ctx);
    if (this.hover && !this.results && !this.dialog.active) this.drawTooltip(ctx, this.hover);
    if (this.toast) {
      ctx.globalAlpha = Math.min(1, this.toast.t * 2);
      panel(ctx, g.width / 2 - 170, 46, 340, 30, { fill: 'rgba(16,19,31,0.85)' });
      text(ctx, this.toast.msg, g.width / 2, 61, { align: 'center', baseline: 'middle', color: PALETTE.sun });
      ctx.globalAlpha = 1;
    }
    if (this.results) this.drawResults(ctx);
    this.dialog.render(ctx);
  }

  drawTopBar(ctx) {
    const g = this.game, s = g.state;
    ctx.fillStyle = 'rgba(16,19,31,0.82)'; ctx.fillRect(0, 0, g.width, 36);
    ctx.fillStyle = PALETTE.sun; ctx.fillRect(0, 35, g.width, 1);
    const left = ECON.dayLimit - s.day;
    text(ctx, `Day ${s.day} / ${ECON.dayLimit}`, 12, 24, { font: 'bold 17px "Trebuchet MS", system-ui, sans-serif', color: left <= 4 ? PALETTE.danger : PALETTE.paper });
    // resources
    ctx.fillStyle = PALETTE.mint; ctx.beginPath(); ctx.arc(148, 17, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d9c7a0'; ctx.beginPath(); ctx.moveTo(141, 20); ctx.lineTo(155, 20); ctx.lineTo(148, 32); ctx.fill();
    text(ctx, `${s.resources.scoops} Scoops`, 162, 24);
    ctx.fillStyle = PALETTE.sun; ctx.beginPath(); ctx.arc(276, 18, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.sun; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + g.time * 0.5; ctx.beginPath(); ctx.moveTo(276 + Math.cos(a) * 9, 18 + Math.sin(a) * 9); ctx.lineTo(276 + Math.cos(a) * 12, 18 + Math.sin(a) * 12); ctx.stroke(); }
    text(ctx, `${s.resources.sunshine} Sunshine`, 293, 24);
    // camp chill meter
    const chill = s.map.campChill;
    text(ctx, 'Camp chill', 410, 24, { color: chill >= 2 ? PALETTE.danger : PALETTE.paper });
    for (let i = 0; i < ECON.campChillLimit; i++) {
      ctx.fillStyle = i < chill ? PALETTE.danger : 'rgba(255,255,255,0.15)';
      ctx.strokeStyle = PALETTE.frost; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(492 + i * 20, 10, 16, 16, 3); ctx.fill(); ctx.stroke();
    }
    // objective
    const reg = currentRegion(s);
    const obj = s.map.liberated.summit ? 'Storm the Baron\'s Ice Fortress!' : `Goal: beat the Slush Golem at ${nameOf(REGION_GOLEM[reg])}`;
    text(ctx, obj, 552, 23, { font: FONT.small, color: PALETTE.frost });
    button(ctx, g, 'Camp', 872, 4, 80, 28);
  }

  drawForecast(ctx) {
    const g = this.game;
    const list = this.forecast;
    const lines = list.length ? list.map((c) => ({ c, t: (c.blocked ? 'SHIELDED: ' : '') + describeChange(c) })) : [{ t: 'Clear skies. No frost moves tonight.' }];
    const danger = list.some((c) => c.id === 'camp' && c.delta > 0 && !c.blocked);
    const x = 8, y = 440, w = 584, h = 96;
    panel(ctx, x, y, w, h, { stroke: danger ? PALETTE.danger : PALETTE.frost, fill: 'rgba(16,19,31,0.86)' });
    const blink = Math.sin(g.time * 8) > 0;
    text(ctx, danger ? "TONIGHT'S FORECAST: THE CAMP IS GETTING COLDER!" : "Tonight's forecast (frost moves after your next mission)", x + 12, y + 18,
      { font: SMALL_B, color: danger ? (blink ? PALETTE.danger : PALETTE.paper) : PALETTE.frost });
    const shown = lines.slice(0, 8);
    shown.forEach((l, i) => {
      const col = !l.c ? PALETTE.mint : l.c.blocked ? '#9aa3b5' : l.c.delta < 0 ? PALETTE.mint : l.c.reason === 'storm' ? PALETTE.frost : PALETTE.danger;
      const cx = x + 12 + (i >= 4 ? 288 : 0), cy = y + 37 + (i % 4) * 16;
      if (l.c && !l.c.blocked && l.c.delta > 0) { ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + 3, cy - 4, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      text(ctx, l.t, cx + 11, cy, { font: FONT.small, color: col });
    });
    if (lines.length > shown.length) text(ctx, `+${lines.length - shown.length} more`, x + w - 10, y + 18, { font: FONT.small, align: 'right' });
  }

  drawSelection(ctx) {
    const g = this.game, s = g.state, id = this.selected, n = NODE_BY_ID[id];
    panel(ctx, 600, 440, 352, 96, { fill: 'rgba(16,19,31,0.88)' });
    text(ctx, n.name, 612, 459, { font: 'bold 16px "Trebuchet MS", system-ui, sans-serif', color: PALETTE.sun });
    let sub;
    if (id === 'camp') sub = `Home base. Chill ${s.map.campChill}/${ECON.campChillLimit}. Shop for upgrades here.`;
    else {
      const why = lockReason(s, id);
      sub = `${KIND_LABEL[n.kind]} | Frost ${frostOf(s, id)}/3 | Difficulty ${difficultyOf(s, id)}` + (why ? ` | ${why}` : '');
    }
    text(ctx, sub, 612, 477, { font: FONT.small, color: PALETTE.frost });
    if (id !== 'camp' && frostOf(s, id) > 0 && !s.map.nodes[id].cleared) {
      const r = rewardsFor(s, id);
      text(ctx, `Victory: +${r.scoops} Scoops, +${r.sunshine} Sunshine (plus pickups)`, 612, 494, { font: FONT.small, color: PALETTE.mint });
    }
    for (const b of this.actionButtons()) button(ctx, g, b.label, b.x, b.y, b.w, b.h, { disabled: !b.enabled, font: SMALL_B });
  }

  drawTooltip(ctx, id) {
    const g = this.game, s = g.state, n = NODE_BY_ID[id];
    const lines = [];
    const add = (t, color = PALETTE.paper, font = FONT.small) => lines.push({ t, color, font });
    add(n.name, PALETTE.sun, 'bold 15px "Trebuchet MS", system-ui, sans-serif');
    add(`${REGIONS[n.region].name}  |  ${KIND_LABEL[n.kind]}`, PALETTE.frost);
    add(n.blurb);
    if (n.kind === 'camp') {
      add(`Camp chill ${s.map.campChill}/${ECON.campChillLimit}. At ${ECON.campChillLimit}, the summer is lost.`, s.map.campChill ? PALETTE.danger : PALETTE.paper);
      add('Chill rises when a neighbor sits at frost 3.');
    } else {
      const f = frostOf(s, id);
      if (n.kind !== 'camp' && MISSION_KINDS[n.kind]) add(`Mission: ${MISSION_KINDS[n.kind]}${n.bossId ? ` (${ENEMIES[n.bossId].name})` : ''}`);
      add(`Frost ${f}/3   Difficulty ${'\u2605'.repeat(difficultyOf(s, id))}`, PALETTE.frost);
      const mods = modifiersFor(s, id);
      if (mods.length) add(`Modifiers: ${mods.join(', ')}`, mods.includes('blizzard') ? PALETTE.frostDeep : PALETTE.mint);
      if (f > 0 && !s.map.nodes[id].cleared) { const r = rewardsFor(s, id); add(`Rewards: ${r.scoops} Scoops + ${r.sunshine} Sunshine (+ pickups)`, PALETTE.mint); }
      const why = lockReason(s, id);
      if (why) add(why, why === 'Thawed' || why === 'Liberated' ? PALETTE.sun : '#c8cbd6');
      else add('Click again (or Launch) to start the mission', PALETTE.sun);
    }
    for (const c of this.forecast.filter((c) => c.id === id)) add(`Tonight: ${c.blocked ? 'SHIELDED from ' : ''}${describeChange(c)}`, c.blocked ? '#9aa3b5' : c.delta < 0 ? PALETTE.mint : PALETTE.danger);
    if (shielded(s, id)) add('Shielded by Sunshine tonight', PALETTE.sun);

    ctx.save(); ctx.font = FONT.small;
    const w = Math.min(380, 24 + Math.max(...lines.map((l) => { ctx.font = l.font; return ctx.measureText(l.t).width; })));
    ctx.restore();
    const h = 14 + lines.length * 17;
    let x = n.x + nodeRadius(n) + 14, y = n.y - h / 2;
    if (x + w > g.width - 6) x = n.x - nodeRadius(n) - 14 - w;
    y = Math.max(40, Math.min(g.height - h - 6, y));
    panel(ctx, x, y, w, h, { fill: 'rgba(16,19,31,0.93)' });
    lines.forEach((l, i) => text(ctx, l.t, x + 12, y + 20 + i * 17, { font: l.font, color: l.color }));
  }

  drawResults(ctx) {
    const g = this.game, { rep, night } = this.results;
    ctx.fillStyle = 'rgba(16,19,31,0.55)'; ctx.fillRect(0, 0, g.width, g.height);
    panel(ctx, 250, 96, 460, 360, { stroke: rep.victory ? PALETTE.sun : PALETTE.frost });
    const title = rep.victory ? (rep.liberated ? 'REGION LIBERATED!' : 'SUMMER RESTORED!') : 'Tactical Retreat...';
    text(ctx, title, g.width / 2, 142, { align: 'center', font: FONT.big, color: rep.victory ? PALETTE.sun : PALETTE.frost });
    text(ctx, nameOf(rep.nodeId) + (rep.victory ? ' is thawed!' : ' stays frozen.'), g.width / 2, 172, { align: 'center' });
    let y = 204;
    text(ctx, `+${rep.scoops} Scoops    +${rep.sunshine} Sunshine`, g.width / 2, y, { align: 'center', color: PALETTE.mint, font: 'bold 18px "Trebuchet MS", system-ui, sans-serif' });
    y += 24;
    if (rep.thawed.length > 1) { text(ctx, `The cold snaps! Also thawed: ${rep.thawed.slice(1).map(nameOf).join(', ')}`.slice(0, 70), g.width / 2, y, { align: 'center', font: FONT.small, color: PALETTE.sun }); y += 18; }
    if (rep.frostUp) { text(ctx, 'The frost there thickened (+1).', g.width / 2, y, { align: 'center', font: FONT.small, color: PALETTE.frost }); y += 18; }
    y += 8;
    text(ctx, `Overnight (now Day ${g.state.day}):`, 280, y, { font: SMALL_B, color: PALETTE.frost }); y += 20;
    const ch = night.changes.length ? night.changes : [];
    if (!ch.length) { text(ctx, 'A calm night. The frost held still.', 290, y, { font: FONT.small, color: PALETTE.mint }); y += 17; }
    for (const c of ch.slice(0, 6)) {
      text(ctx, (c.blocked ? 'Shield held! ' : '') + describeChange(c), 290, y, { font: FONT.small, color: c.blocked || c.delta < 0 ? PALETTE.mint : c.reason === 'storm' ? PALETTE.frost : PALETTE.danger });
      y += 17;
    }
    if (night.morning.sunshine) { text(ctx, `Sunny Hammock: +${night.morning.sunshine} Sunshine`, 290, y, { font: FONT.small, color: PALETTE.sun }); y += 17; }
    button(ctx, g, 'Continue', 400, 404, 160, 40);
  }
}
