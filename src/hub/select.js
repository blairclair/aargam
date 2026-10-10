// Hero + loadout select. Owned by: hub team.
// params: { roomId, retry?, lastHero? }. Saves state.loadout[hero], then launchRoom(game, {roomId, hero, loadout}).
import { ROOMS, SKILLS, HEROES, PALETTE, FONT } from '../core/theme.js';
import { saveGame } from '../core/state.js';
import { launchRoom, continueGame } from '../core/flow.js';
import { DIFFICULTY, DIFF_IDS, roomDifficulty } from '../core/difficulty.js';
import { button, text, panel, chip, keycap, wrapText } from '../ui/widgets.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { MONO, BOLD, rr, ROLE, FAVORED_BONUS, drawBustImg, skillIcon, Sparks } from './common.js';

const HEROES_ORDER = ['aaron', 'victoria'];
const CARD = (i) => ({ x: 24 + i * 226, y: 96, w: 210, h: 334 });
const RIGHT = { x: 484, y: 96, w: 452, h: 334 };
const TILE = (i) => ({ x: RIGHT.x + 14 + (i % 2) * 216, y: RIGHT.y + 92 + Math.floor(i / 2) * 58, w: 208, h: 52 });
const GO = { x: 736, y: 446, w: 200, h: 52 };
const BACK = { x: 24, y: 452, w: 120, h: 40 };
// Easy / Medium / Hard segmented control, top-right of the header (F cycles it)
const DIFF_BTN = (i) => ({ x: 712 + i * 76, y: 26, w: 72, h: 30 });

// Retry tips: first entry whose hero knows the skill wins (other hero preferred).
const TIPS = {
  office: [{ hero: 'aaron', text: 'Tip: keep moving and kick bugs before they swarm you.' }],
  kitchen: [{ hero: 'victoria', skill: 'unplug', text: 'Try Victoria: Short Circuit chains through the Toaster Turrets and fries them.' }, { hero: 'aaron', skill: 'debug', text: 'Try Aaron: Debug marks enemies so they take extra damage.' }],
  living: [{ hero: 'victoria', skill: 'unplug', text: 'Try Victoria: Short Circuit fries the Roomba Tank, and this is her specialty.' }],
  dining: [{ hero: 'victoria', skill: 'hot_pan', text: 'Try Victoria: Hot Pan\'s wide swing swats flying plates.' }, { hero: 'aaron', skill: 'bread_toss', text: 'Try Aaron: Bread Toss hits plates from a safe distance.' }],
  playroom: [{ hero: 'aaron', skill: 'debug', text: 'Try Aaron: Debug reveals Jack-in-the-Boxes before they pop.' }, { hero: 'victoria', skill: 'throw_pillow', text: 'Try Victoria: Throw Pillow ricochets through the card soldiers.' }],
  primary: [{ hero: 'victoria', skill: 'throw_pillow', text: 'Try Victoria: Throw Pillow ricochets through the lint swarm.' }, { hero: 'aaron', skill: 'karate_sweep', text: 'Try Aaron: Karate Sweep trips the whole lint swarm, then launches it.' }],
  guest: [{ hero: 'victoria', skill: 'crochet_net', text: 'Try Victoria: Crochet Net snares the rubber-duck swarm.' }, { hero: 'aaron', skill: 'plate_shield_a', text: 'Try Aaron: Plate Shield blocks what the pipes throw at you.' }],
  backyard: [{ hero: 'victoria', skill: 'crochet_net', text: 'Try Victoria: Crochet Net pins the gnome formation in place.' }, { hero: 'aaron', skill: 'mop_spin', text: 'Try Aaron: Mop Spin clears gnomes and vines around you.' }],
  pond: [{ hero: 'victoria', skill: 'boundaries', text: 'Try Victoria: her Boundaries ultimate stuns everything inside the ring.' }, { hero: 'aaron', skill: 'pull_aggro', text: 'Try Aaron: Pull Aggro halves the damage you take. Tank it!' }],
};

export default class SelectScene {
  constructor(game) { this.game = game; }

  enter(p = {}) {
    const s = this.game.state;
    this.p = { roomId: 'office', ...p };
    if (!ROOMS[this.p.roomId]) this.p.roomId = 'office';
    this.room = ROOMS[this.p.roomId];
    this.t = 0;
    this.sparks = new Sparks();
    const remembered = s.flags?.['hub.lastHero'];
    this.hero = (this.p.retry && HEROES[this.p.lastHero]) ? this.p.lastHero
      : this.room.favored ?? (HEROES[remembered] ? remembered : 'aaron');
    this.loadouts = {};
    for (const h of HEROES_ORDER) this.loadouts[h] = initialLoadout(s, h);
    this.focus = -1; // -1 = Go button, 0..n-1 = skill tiles
    this.tip = this.p.retry ? retryTip(s, this.p.roomId, this.p.lastHero) : null;
    this.selT = 0;
    this.difficulty = roomDifficulty(s, this.p.roomId);
    playMusic('house');
  }

  skills(hero = this.hero) { return (this.game.state.skills[hero] ?? []).filter((id) => SKILLS[id]?.slot === 'skill'); }

  setHero(h) {
    if (h === this.hero) return;
    this.hero = h; this.focus = -1; this.selT = this.t;
    playSfx('swap');
  }

  toggle(id) {
    const lo = this.loadouts[this.hero];
    const i = lo.indexOf(id);
    if (i >= 0) { lo.splice(i, 1); playSfx('click'); return; }
    if (lo.length >= 2) lo.shift();
    lo.push(id);
    playSfx('pickup');
    const k = this.skills().indexOf(id), c = TILE(k);
    this.sparks.burst(c.x + 26, c.y + c.h / 2, [PALETTE.sun, PALETTE.paper], 10, 90, { g: 60 });
  }

  launch() {
    const g = this.game, s = g.state;
    const loadout = this.loadouts[this.hero].filter((id) => s.skills[this.hero].includes(id)).slice(0, 2);
    s.loadout[this.hero] = loadout.slice();
    s.flags['hub.lastHero'] = this.hero;
    saveGame(s);
    playSfx('shout');
    launchRoom(g, { roomId: this.p.roomId, hero: this.hero, loadout, difficulty: this.difficulty });
  }

  setDifficulty(id) {
    if (id === this.difficulty || !DIFFICULTY[id]) return;
    this.difficulty = id;
    playSfx('blip');
    const c = DIFF_BTN(DIFF_IDS.indexOf(id));
    this.sparks.burst(c.x + c.w / 2, c.y + c.h / 2, [DIFFICULTY[id].color, PALETTE.paper], 8, 70, { g: 60 });
  }

  update(dt) {
    const g = this.game, inp = g.input;
    this.t += dt;
    this.sparks.update(dt);
    const list = this.skills();

    if (inp.pressed('left')) this.setHero('aaron');
    if (inp.pressed('right')) this.setHero('victoria');
    if (inp.pressed('swap')) this.setHero(this.hero === 'aaron' ? 'victoria' : 'aaron');
    if (inp.pressed('up') && list.length) { this.focus = this.focus < 0 ? list.length - 1 : Math.max(0, this.focus - 1); playSfx('blip'); }
    if (inp.pressed('down') && list.length) { this.focus = this.focus < 0 ? -1 : this.focus + 1 >= list.length ? -1 : this.focus + 1; playSfx('blip'); }
    for (let k = 0; k < Math.min(9, list.length); k++) if (inp.pressed(`Digit${k + 1}`)) this.toggle(list[k]);
    if (inp.pressed('confirm')) {
      if (this.focus >= 0 && list[this.focus]) this.toggle(list[this.focus]);
      else { this.launch(); return; }
    }
    if (inp.pressed('back')) { continueGame(g); return; }
    if (inp.pressed('KeyF')) this.setDifficulty(DIFF_IDS[(DIFF_IDS.indexOf(this.difficulty) + 1) % DIFF_IDS.length]);

    // mouse
    const m = inp.mouse;
    if (m.pressed) {
      HEROES_ORDER.forEach((h, i) => { const c = CARD(i); if (m.x >= c.x && m.x <= c.x + c.w && m.y >= c.y && m.y <= c.y + c.h) this.setHero(h); });
      list.forEach((id, i) => { const c = TILE(i); if (m.x >= c.x && m.x <= c.x + c.w && m.y >= c.y && m.y <= c.y + c.h) { this.focus = i; this.toggle(id); } });
      DIFF_IDS.forEach((id, i) => { const c = DIFF_BTN(i); if (m.x >= c.x && m.x <= c.x + c.w && m.y >= c.y && m.y <= c.y + c.h) this.setDifficulty(id); });
    }
    if (button(null, g, "Let's go!", GO.x, GO.y, GO.w, GO.h, { primary: true })) { this.launch(); return; }
    if (button(null, g, 'Back', BACK.x, BACK.y, BACK.w, BACK.h)) { continueGame(g); }
  }

  render(ctx) {
    const g = this.game, s = g.state, room = this.room;
    // warm room-tinted backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, g.height);
    bg.addColorStop(0, '#2a2236'); bg.addColorStop(1, '#14121c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.width, g.height);
    const glow = ctx.createRadialGradient(480, 120, 20, 480, 120, 600);
    glow.addColorStop(0, hexA(room.accent, 0.22)); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, g.width, g.height);

    // header
    panel(ctx, 8, 8, 944, 78, { radius: 12 });
    ctx.fillStyle = room.accent; rr(ctx, 22, 20, 6, 54, 3); ctx.fill();
    text(ctx, `Who takes the ${room.name}?`, 40, 46, { font: BOLD(28), color: PALETTE.paper });
    text(ctx, `> ${room.fn}`, 40, 72, { font: MONO, color: PALETTE.mint, shadow: false });
    ctx.font = MONO; const fw = ctx.measureText(`> ${room.fn}`).width;
    text(ctx, `${room.weird}.  Goal: ${room.objective}.`, 52 + fw, 72, { font: FONT.small, color: 'rgba(255,246,229,0.85)', maxWidth: 880 - fw });
    if (this.p.retry) chip(ctx, `Attempt ${(s.rooms[this.p.roomId]?.attempts ?? 0) + 1}`, 700, 41, { align: 'right', fill: '#ffb3a8' });
    this.drawDifficulty(ctx);

    HEROES_ORDER.forEach((h, i) => this.drawCard(ctx, h, i));
    this.drawLoadout(ctx);
    this.sparks.render(ctx);

    // bottom bar: back, explainer/tip, go
    button(ctx, g, 'Back', BACK.x, BACK.y, BACK.w, BACK.h, { hotkey: 'Esc', sub: 'to the house' });
    const firstRoom = this.p.roomId === 'office' && !s.rooms.office.done && !this.p.retry;
    const msg = this.tip ?? (firstRoom
      ? 'First room! Click a hero (or press Left/Right), then press Enter. The gold tag shows who gets a bonus here.'
      : `Left/Right: hero  ·  Up/Down + Enter (or 1-${Math.max(1, Math.min(9, this.skills().length))}): toggle skills  ·  F: difficulty  ·  Enter on Let's go!`);
    panel(ctx, 160, 446, 562, 52, { style: 'paper', radius: 12 });
    const lines = wrapText(ctx, msg, 530, BOLD(14));
    lines.slice(0, 2).forEach((l, k) => text(ctx, l, 176, (lines.length > 1 ? 467 : 477) + k * 18, { font: BOLD(14), color: this.tip ? '#8a3f2a' : PALETTE.choc, shadow: false }));
    const lo = this.loadouts[this.hero];
    button(ctx, g, "Let's go!", GO.x, GO.y, GO.w, GO.h, {
      primary: true, selected: this.focus === -1,
      sub: `${HEROES[this.hero].name} · ${DIFFICULTY[this.difficulty].name}${lo.length ? ' · ' + lo.map((id) => SKILLS[id].name).join(' + ') : ''}`,
    });
  }

  drawDifficulty(ctx) {
    const m = this.game.input.mouse;
    text(ctx, 'Difficulty', DIFF_BTN(0).x, 19, { font: 'bold 11px "Trebuchet MS", sans-serif', color: 'rgba(255,246,229,0.7)', shadow: false });
    keycap(ctx, 'F', DIFF_BTN(2).x + DIFF_BTN(2).w - 8, 15, { small: true });
    DIFF_IDS.forEach((id, i) => {
      const c = DIFF_BTN(i), d = DIFFICULTY[id], on = id === this.difficulty;
      const hover = m.x >= c.x && m.x <= c.x + c.w && m.y >= c.y && m.y <= c.y + c.h;
      ctx.fillStyle = on ? d.color : hover ? 'rgba(255,246,229,0.14)' : 'rgba(255,246,229,0.05)';
      rr(ctx, c.x, c.y, c.w, c.h, 9); ctx.fill();
      ctx.strokeStyle = on ? d.color : 'rgba(255,246,229,0.25)'; ctx.lineWidth = on ? 2 : 1; rr(ctx, c.x, c.y, c.w, c.h, 9); ctx.stroke();
      text(ctx, d.name, c.x + c.w / 2, c.y + 20, { align: 'center', font: BOLD(14), color: on ? PALETTE.ink : d.color, shadow: false });
    });
  }

  drawCard(ctx, h, i) {
    const g = this.game, c = CARD(i), sel = h === this.hero, room = this.room;
    const fav = room.favored === h;
    ctx.save();
    // card body
    const lift = sel ? 4 : 0;
    const y = c.y - lift;
    if (sel) { ctx.shadowColor = PALETTE.sun; ctx.shadowBlur = 22; }
    const bg = ctx.createLinearGradient(0, y, 0, y + c.h);
    bg.addColorStop(0, sel ? (h === 'aaron' ? '#4a4f66' : '#3c5478') : '#2a2d3c');
    bg.addColorStop(1, sel ? '#1c1f2e' : '#15171f');
    ctx.fillStyle = bg; rr(ctx, c.x, y, c.w, c.h, 16); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = sel ? PALETTE.sun : 'rgba(255,246,229,0.25)'; ctx.lineWidth = sel ? 3 : 1.5; rr(ctx, c.x, y, c.w, c.h, 16); ctx.stroke();
    // bust (clipped to the card)
    ctx.save();
    rr(ctx, c.x, y, c.w, c.h, 16); ctx.clip();
    const halo = ctx.createRadialGradient(c.x + c.w / 2, y + 130, 10, c.x + c.w / 2, y + 130, 120);
    halo.addColorStop(0, sel ? 'rgba(255,201,74,0.35)' : 'rgba(255,255,255,0.06)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo; ctx.fillRect(c.x, y, c.w, c.h);
    drawBustImg(ctx, g, h, c.x + c.w / 2, y + 240, 214, {
      expr: sel ? 'happy' : 'smile', t: this.t, exprT: this.t - (this.selT ?? 0),
      dim: sel ? 0 : 0.6, side: i === 0 ? 1 : -1, enter: Math.min(1, this.t * 3),
    });
    // fade bust into name plate
    const fade = ctx.createLinearGradient(0, y + 200, 0, y + 240);
    fade.addColorStop(0, 'rgba(21,23,31,0)'); fade.addColorStop(1, 'rgba(21,23,31,0.95)');
    ctx.fillStyle = fade; ctx.fillRect(c.x, y + 200, c.w, 40);
    ctx.fillStyle = 'rgba(21,23,31,0.95)'; ctx.fillRect(c.x, y + 240, c.w, c.h - 240);
    ctx.restore();
    // text
    text(ctx, HEROES[h].name, c.x + c.w / 2, y + 262, { align: 'center', font: BOLD(24), color: sel ? PALETTE.sun : PALETTE.paper });
    text(ctx, ROLE[h].title, c.x + c.w / 2, y + 280, { align: 'center', font: FONT.small, color: 'rgba(255,246,229,0.7)' });
    wrapText(ctx, ROLE[h].line, c.w - 24, FONT.small).slice(0, 2).forEach((l, k) => text(ctx, l, c.x + c.w / 2, y + 300 + k * 15, { align: 'center', font: FONT.small, color: 'rgba(255,246,229,0.9)' }));
    if (fav) {
      const pulse = 1 + Math.sin(this.t * 4) * 0.04;
      ctx.save(); ctx.translate(c.x + c.w / 2, y + 18); ctx.scale(pulse, pulse);
      chip(ctx, `${HEROES[h].name}'s specialty: ${FAVORED_BONUS}`, 0, 0, { align: 'center', fill: PALETTE.sun, font: BOLD(12) });
      ctx.restore();
    }
    keycap(ctx, i === 0 ? '←' : '→', c.x + c.w - 18, y + c.h - 18, { small: true });
    ctx.restore();
  }

  drawLoadout(ctx) {
    const s = this.game.state, h = this.hero, x = RIGHT.x, y = RIGHT.y;
    panel(ctx, x, y, RIGHT.w, RIGHT.h, { radius: 14 });
    text(ctx, `${HEROES[h].name}'s loadout`, x + 16, y + 30, { font: BOLD(20), color: PALETTE.sun });
    const lo = this.loadouts[h];
    text(ctx, `Pick up to 2 (${lo.length}/2) · used with K and E`, x + RIGHT.w - 16, y + 30, { align: 'right', font: FONT.small, color: 'rgba(255,246,229,0.8)' });
    // always-on
    const basic = HEROES[h].basic;
    const ult = (s.skills[h] ?? []).find((id) => SKILLS[id]?.slot === 'ultimate');
    skillIcon(ctx, basic, x + 28, y + 58, 24);
    text(ctx, `${SKILLS[basic].name}`, x + 46, y + 56, { font: BOLD(13) });
    text(ctx, 'basic attack · always on', x + 46, y + 70, { font: FONT.small, color: 'rgba(255,246,229,0.6)' });
    if (ult) {
      skillIcon(ctx, ult, x + 244, y + 58, 24);
      text(ctx, `${SKILLS[ult].name}`, x + 262, y + 56, { font: BOLD(13), color: '#e7b8ff' });
      text(ctx, 'ultimate · always on (Space)', x + 262, y + 70, { font: FONT.small, color: 'rgba(255,246,229,0.6)' });
    }
    ctx.fillStyle = 'rgba(255,246,229,0.15)'; ctx.fillRect(x + 14, y + 82, RIGHT.w - 28, 1);

    const list = this.skills();
    if (!list.length) {
      const lines = wrapText(ctx, `No extra skills yet. Each room you fix teaches ${HEROES[h].name} a new one, and you can bring two along.`, RIGHT.w - 60, BOLD(15));
      lines.forEach((l, k) => text(ctx, l, x + RIGHT.w / 2, y + 160 + k * 22, { align: 'center', font: BOLD(15), color: 'rgba(255,246,229,0.85)' }));
      text(ctx, 'For now: your basic attack is all you need.', x + RIGHT.w / 2, y + 240, { align: 'center', font: FONT.small, color: PALETTE.mint });
      return;
    }
    const m = this.game.input.mouse;
    list.forEach((id, i) => {
      const c = TILE(i), sk = SKILLS[id];
      const slot = lo.indexOf(id);
      const on = slot >= 0, foc = this.focus === i;
      const hover = m.x >= c.x && m.x <= c.x + c.w && m.y >= c.y && m.y <= c.y + c.h;
      ctx.fillStyle = on ? 'rgba(255,201,74,0.22)' : hover ? 'rgba(255,246,229,0.1)' : 'rgba(255,246,229,0.04)';
      rr(ctx, c.x, c.y, c.w, c.h, 10); ctx.fill();
      ctx.strokeStyle = on ? PALETTE.sun : 'rgba(255,246,229,0.2)'; ctx.lineWidth = on ? 2 : 1; rr(ctx, c.x, c.y, c.w, c.h, 10); ctx.stroke();
      if (foc) { ctx.save(); ctx.strokeStyle = 'rgba(255,246,229,0.85)'; ctx.setLineDash([4, 3]); rr(ctx, c.x - 3, c.y - 3, c.w + 6, c.h + 6, 12); ctx.stroke(); ctx.restore(); }
      skillIcon(ctx, id, c.x + 26, c.y + c.h / 2, 34, { alpha: on ? 1 : 0.75 });
      text(ctx, sk.name, c.x + 50, c.y + 20, { font: BOLD(14), color: on ? PALETTE.sun : PALETTE.paper, maxWidth: c.w - 84 });
      ellipsize(wrapText(ctx, sk.desc, c.w - 64, '11px "Trebuchet MS", system-ui, sans-serif'), 2).forEach((l, k) => text(ctx, l, c.x + 50, c.y + 35 + k * 13, { font: '11px "Trebuchet MS", system-ui, sans-serif', color: 'rgba(255,246,229,0.75)', shadow: false }));
      if (on) chip(ctx, slot === 0 ? 'K' : 'E', c.x + c.w - 10, c.y + 14, { align: 'right', fill: PALETTE.sun });
      else if (i < 9) keycap(ctx, String(i + 1), c.x + c.w - 16, c.y + 14, { small: true });
      if (s.rooms && SKILLS[id].earnedIn === lastDoneRoom(s)) chip(ctx, 'NEW', c.x + c.w - 30, c.y + 14, { align: 'right', fill: PALETTE.mint, font: 'bold 10px "Trebuchet MS", sans-serif' });
    });
  }
}

function ellipsize(lines, n) {
  if (lines.length <= n) return lines;
  const out = lines.slice(0, n);
  out[n - 1] = out[n - 1].replace(/\s*\S*$/, '') + '…';
  return out;
}

function initialLoadout(s, hero) {
  const known = (s.skills[hero] ?? []).filter((id) => SKILLS[id]?.slot === 'skill');
  const lo = (s.loadout?.[hero] ?? []).filter((id) => known.includes(id)).slice(0, 2);
  // fill empty slots with the newest skills so new players never walk in empty-handed
  for (let i = known.length - 1; i >= 0 && lo.length < 2; i--) if (!lo.includes(known[i])) lo.push(known[i]);
  return lo;
}

function lastDoneRoom(s) {
  // the room whose skills are "new": the most recently earned room (latest skill in the list)
  const last = s.skills?.aaron?.[s.skills.aaron.length - 1];
  return SKILLS[last]?.earnedIn;
}

function retryTip(s, roomId, lastHero) {
  const tips = TIPS[roomId] ?? [];
  const room = ROOMS[roomId];
  const ok = (t) => !t.skill || (s.skills[t.hero] ?? []).includes(t.skill);
  const pick = tips.find((t) => t.hero !== lastHero && ok(t)) ?? tips.find(ok);
  if (pick) return pick.text;
  if (room.favored && room.favored !== lastHero) return `Try ${HEROES[room.favored].name}: this is ${room.favored === 'aaron' ? 'his' : 'her'} specialty room (${FAVORED_BONUS}).`;
  return 'So close! Try the other hero, or swap a different skill into your loadout.';
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
