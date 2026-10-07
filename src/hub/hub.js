// House hub: a top-down floor plan of Aaron & Victoria's house. Owned by: hub team.
// Each room shows locked / available / done. Click (or arrows + Enter) an available room to enter it.
// Also hosts the Party Touch shop (B).
import { ROOMS, ROOM_IDS, PALETTE, FONT, PERKS } from '../core/theme.js';
import { availableRooms, saveGame } from '../core/state.js';
import { enterRoom } from '../core/flow.js';
import { button, text, panel, chip, keycap, wrapText, bar } from '../ui/widgets.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { TAU, MONO, BOLD, rr, fmtHour, star, Sparks, PERK_LIST, owns, buyPerk } from './common.js';

// ---------------------------------------------------------------- layout (960x540 logical)
const HOUSE = { x: 24, y: 62, w: 380, h: 408 };
const YARD = { x: 404, y: 62, w: 282, h: 408 };
const POND = { cx: 566, cy: 368, rx: 92, ry: 58 };
const R = {
  primary:  { x: 24, y: 62, w: 150, h: 130 },
  guest:    { x: 174, y: 62, w: 110, h: 130 },
  office:   { x: 284, y: 62, w: 120, h: 130 },
  living:   { x: 24, y: 192, w: 210, h: 144 },
  playroom: { x: 234, y: 192, w: 170, h: 144 },
  dining:   { x: 24, y: 336, w: 170, h: 134 },
  kitchen:  { x: 194, y: 336, w: 210, h: 134 },
  backyard: YARD,
  pond: { x: POND.cx - POND.rx, y: POND.cy - POND.ry, w: POND.rx * 2, h: POND.ry * 2 },
};
// door gaps on shared walls: [x, y, w, h]
const DOORS = [
  [84, 189, 30, 6], [204, 189, 26, 6], [326, 189, 30, 6], // bedrooms/office -> living/playroom
  [231, 250, 6, 32],                                       // living <-> playroom
  [86, 333, 30, 6],                                        // living -> dining
  [191, 388, 6, 32],                                       // dining <-> kitchen
  [256, 333, 30, 6],                                       // playroom -> kitchen
];
const PATIO_DOOR = [400, 396, 8, 52];
const FRONT_DOOR = [20, 252, 8, 34];
const SIDE = { x: 698, y: 54, w: 250, h: 424 };
const GO_Y = SIDE.y + 248, SHOP_BTN_Y = SIDE.y + 318;
const CENTER = (id) => id === 'pond' ? { x: POND.cx, y: POND.cy } : { x: R[id].x + R[id].w / 2, y: R[id].y + R[id].h / 2 };

const FLOORS = {
  primary: 'carpet', guest: 'carpet', office: 'wood', living: 'wood', playroom: 'mat', dining: 'wood', kitchen: 'tile',
};

export default class HubScene {
  constructor(game) { this.game = game; this.sparks = new Sparks(); }

  enter(p = {}) {
    this.t = 0;
    this.sparks = new Sparks();
    this.shopOpen = false;
    this.shopFocus = 0;
    this.shake = 0;
    this.toast = null;
    this.justFinished = p.justFinished && ROOMS[p.justFinished] ? p.justFinished : null;
    this.celebrate = this.justFinished ? 3.2 : 0;
    this.newRooms = new Set(this.justFinished ? this.newlyUnlocked(this.justFinished) : []);
    const av = this.rooms();
    this.focus = [...this.newRooms][0] ?? av[0] ?? null;
    this.hover = null;
    this.hoverRaw = null;
    playMusic('house');
    if (this.justFinished) { playSfx('victory'); this.burstAt(this.justFinished, 40); }
  }

  rooms() { return availableRooms(this.game.state, ROOMS); }

  newlyUnlocked(fin) {
    const s = this.game.state;
    const before = { ...s, rooms: { ...s.rooms, [fin]: { ...s.rooms[fin], done: false } } };
    const was = new Set(availableRooms(before, ROOMS));
    return this.rooms().filter((id) => !was.has(id));
  }

  roomState(id) {
    const r = this.game.state.rooms[id];
    if (r?.done) return 'done';
    return this.rooms().includes(id) ? 'available' : 'locked';
  }

  roomAt(x, y) {
    const dx = (x - POND.cx) / POND.rx, dy = (y - POND.cy) / POND.ry;
    if (dx * dx + dy * dy <= 1) return 'pond';
    for (const id of ROOM_IDS) {
      if (id === 'pond') continue;
      const b = R[id];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return id;
    }
    return null;
  }

  burstAt(id, n = 24) {
    const c = CENTER(id);
    this.sparks.burst(c.x, c.y, [PALETTE.sun, ROOMS[id].accent, PALETTE.paper, '#ff8fb1'], n, 170);
  }

  unlockText(id) {
    const req = ROOMS[id].requires;
    const s = this.game.state;
    if (req.includes('*')) {
      const n = ROOM_IDS.filter((k) => k !== id && s.rooms[k].done).length;
      return `Fix all 8 other rooms first (${n}/8 done)`;
    }
    return `Fix the ${req.map((k) => ROOMS[k].name).join(' or the ')} first`;
  }

  // ------------------------------------------------------------ update
  update(dt) {
    const g = this.game, inp = g.input;
    this.t += dt;
    this.sparks.update(dt);
    this.shake = Math.max(0, this.shake - dt * 3);
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    if (this.celebrate > 0) {
      const before = this.celebrate;
      this.celebrate -= dt;
      if (before > 2.2 && this.celebrate <= 2.2) {
        if (this.newRooms.size) playSfx('unlock');
        for (const id of this.newRooms) this.burstAt(id, 18);
      }
    }

    if (this.shopOpen) { this.updateShop(); return; }

    const av = this.rooms();
    if (this.focus && !av.includes(this.focus)) this.focus = av[0] ?? null;
    // keyboard: cycle through available rooms
    if (av.length) {
      let step = 0;
      if (inp.pressed('right') || inp.pressed('down')) step = 1;
      if (inp.pressed('left') || inp.pressed('up')) step = -1;
      if (step) {
        const i = Math.max(0, av.indexOf(this.focus));
        this.focus = av[(i + step + av.length) % av.length];
        this.hover = null;
        playSfx('blip');
      }
      if (inp.pressed('confirm') && this.focus) { this.go(this.focus); return; }
    }
    if (inp.pressed('KeyB')) { this.openShop(); return; }

    // mouse
    const m = inp.mouse;
    const over = this.roomAt(m.x, m.y);
    if (over !== this.hoverRaw) {
      this.hoverRaw = over;
      this.hover = over;
      if (over && av.includes(over) && over !== this.focus) { this.focus = over; playSfx('blip'); }
    }
    if (m.pressed && over) {
      if (this.roomState(over) === 'available') { this.go(over); return; }
      this.hover = over;
      if (this.roomState(over) === 'locked') { playSfx('error'); this.shake = 1; this.toast = { msg: `${ROOMS[over].name} is locked. ${this.unlockText(over)}.`, t: 2.5 }; }
      else { playSfx('blip'); this.toast = { msg: `${ROOMS[over].name} is already fixed. ${'★'.repeat(g.state.rooms[over].stars)}`, t: 2 }; }
    }

    // side panel buttons
    const pid = this.panelRoom();
    if (pid && this.roomState(pid) === 'available' && button(null, g, 'Go fix it!', SIDE.x + 16, GO_Y, SIDE.w - 32, 40, { primary: true })) { this.go(pid); return; }
    if (button(null, g, 'Party Touches', SIDE.x + 16, SHOP_BTN_Y, SIDE.w - 32, 46)) this.openShop();
  }

  go(id) {
    if (enterRoom(this.game, id)) playSfx('swap');
  }

  panelRoom() { return this.hover ?? this.focus ?? this.rooms()[0] ?? null; }

  openShop() {
    this.shopOpen = true; this.shopFocus = 0;
    this.game.state.flags['hub.seenShop'] = true;
    playSfx('click');
  }

  updateShop() {
    const g = this.game, inp = g.input;
    if (inp.pressed('back') || inp.pressed('KeyB')) { this.shopOpen = false; playSfx('click'); return; }
    const n = PERK_LIST.length;
    if (inp.pressed('down')) this.shopFocus = Math.min(n - 1, this.shopFocus + 2);
    if (inp.pressed('up')) this.shopFocus = Math.max(0, this.shopFocus - 2);
    if (inp.pressed('right')) this.shopFocus = Math.min(n - 1, this.shopFocus + 1);
    if (inp.pressed('left')) this.shopFocus = Math.max(0, this.shopFocus - 1);
    if (inp.pressed('confirm')) this.tryBuy(PERK_LIST[this.shopFocus]?.id);
    PERK_LIST.forEach((pk, i) => {
      const c = shopCell(i);
      const can = !owns(g.state, pk.id);
      if (can && button(null, g, `${pk.cost} PP`, c.x + c.w - 92, c.y + c.h - 36, 80, 28, { disabled: g.state.partyPoints < pk.cost })) this.tryBuy(pk.id);
    });
    if (button(null, g, 'Done', 480 - 60, SHOP.y + SHOP.h - 50, 120, 36, { primary: true })) { this.shopOpen = false; }
  }

  tryBuy(id) {
    const s = this.game.state, pk = PERKS[id];
    if (!pk || owns(s, id)) return;
    if (s.partyPoints < pk.cost) { playSfx('error'); this.toast = { msg: `Need ${pk.cost - s.partyPoints} more Party Points. Earn them with stars.`, t: 2.2 }; return; }
    if (buyPerk(s, id)) {
      saveGame(s);
      playSfx('pickup');
      const c = shopCell(PERK_LIST.indexOf(pk));
      this.sparks.burst(c.x + c.w / 2, c.y + c.h / 2, [PALETTE.sun, PALETTE.mint, '#ff8fb1', PALETTE.paper], 30, 180);
      this.toast = { msg: `${pk.name}: ${pk.desc}!`, t: 2.2 };
    }
  }

  // ------------------------------------------------------------ render
  render(ctx) {
    const g = this.game, s = g.state;
    // backdrop: soft garden green around the lot
    const bg = ctx.createLinearGradient(0, 0, 0, g.height);
    bg.addColorStop(0, '#2b3a2e'); bg.addColorStop(1, '#1d2620');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.width, g.height);

    const sx = this.shake > 0 ? Math.sin(this.t * 60) * this.shake * 3 : 0;
    ctx.save(); ctx.translate(sx, 0);
    this.drawYard(ctx);
    this.drawHouse(ctx);
    for (const id of ROOM_IDS) this.drawRoomState(ctx, id);
    if (owns(s, 'fairy_lights')) this.drawFairyLights(ctx);
    this.drawFocus(ctx);
    ctx.restore();
    this.sparks.render(ctx);

    this.drawTopBar(ctx);
    this.drawSide(ctx);
    this.drawHint(ctx);
    if (this.celebrate > 0) this.drawCelebration(ctx);
    if (this.hover && this.roomState(this.hover) === 'locked' && !this.shopOpen) this.drawTooltip(ctx, this.hover);
    if (this.shopOpen) this.drawShop(ctx);
    if (this.toast) {
      const a = Math.min(1, this.toast.t * 3);
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = BOLD(15);
      const w = ctx.measureText(this.toast.msg).width + 36;
      panel(ctx, 480 - w / 2, 440, w, 34, { style: 'paper', radius: 17 });
      text(ctx, this.toast.msg, 480, 462, { align: 'center', color: PALETTE.choc, font: BOLD(15), shadow: false });
      ctx.restore();
    }
  }

  // ---- outdoor: backyard + pond
  drawYard(ctx) {
    const s = this.game.state, t = this.t;
    const dusk = Math.max(0, Math.min(1, (s.clock - 10) / 9));
    const y = YARD;
    // lawn with mowing stripes
    ctx.fillStyle = '#5f9a4f'; ctx.fillRect(y.x, y.y, y.w, y.h);
    for (let i = 0; i < y.w; i += 28) { ctx.fillStyle = (i / 28) % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; ctx.fillRect(y.x + i, y.y, 14, y.h); }
    // lawn speckles
    for (let i = 0; i < 90; i++) {
      const px = y.x + ((i * 97) % y.w), py = y.y + ((i * 53 + i * i * 7) % y.h);
      ctx.fillStyle = i % 3 ? 'rgba(40,90,40,0.35)' : 'rgba(170,220,120,0.35)';
      ctx.fillRect(px, py, 2, 3);
    }
    // patio deck by the kitchen
    ctx.fillStyle = '#a77a52'; ctx.fillRect(y.x, 378, 76, 92);
    ctx.strokeStyle = 'rgba(70,40,20,0.45)'; ctx.lineWidth = 1;
    for (let i = 0; i < 92; i += 9) { ctx.beginPath(); ctx.moveTo(y.x, 378 + i); ctx.lineTo(y.x + 76, 378 + i); ctx.stroke(); }
    // stepping-stone path from patio to pond
    ctx.fillStyle = '#c9bfae';
    [[490, 420], [512, 432], [478, 400]].forEach(([px, py]) => { ctx.beginPath(); ctx.ellipse(px, py, 9, 6, 0, 0, TAU); ctx.fill(); });
    // grill on the patio
    ctx.fillStyle = '#2b2b30'; ctx.beginPath(); ctx.arc(y.x + 22, 398, 11, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#777'; ctx.lineWidth = 1; for (let i = -6; i <= 6; i += 4) { ctx.beginPath(); ctx.moveTo(y.x + 22 + i, 390); ctx.lineTo(y.x + 22 + i, 406); ctx.stroke(); }
    // lawn chairs (+ more with extra chairs)
    const chairs = owns(s, 'extra_chairs') ? [[y.x + 50, 400], [y.x + 50, 430], [y.x + 22, 452], [y.x + 56, 456]] : [[y.x + 50, 410]];
    for (const [cx, cy] of chairs) { ctx.fillStyle = '#e9d6a8'; rr(ctx, cx - 8, cy - 8, 16, 16, 3); ctx.fill(); ctx.fillStyle = '#c4a46a'; ctx.fillRect(cx - 8, cy - 8, 16, 5); }
    // garden beds along the fence
    const flowers = owns(s, 'fresh_flowers');
    for (const bx of [y.x + 90, y.x + 170]) {
      ctx.fillStyle = '#6b4a32'; rr(ctx, bx, y.y + 14, 64, 18, 5); ctx.fill();
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = flowers ? ['#ff8fb1', '#ffc94a', '#fff6e5', '#c9a0dc'][i % 4] : '#3f7a4a';
        ctx.beginPath(); ctx.arc(bx + 7 + i * 10, y.y + 23, flowers ? 4 : 3, 0, TAU); ctx.fill();
      }
    }
    // trees (top-down canopies)
    for (const [tx, ty, tr] of [[y.x + 248, y.y + 40, 30], [y.x + 40, y.y + 70, 24], [y.x + 252, y.y + 210, 26], [y.x + 140, y.y + 150, 18]]) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.arc(tx + 5, ty + 6, tr, 0, TAU); ctx.fill();
      const tg = ctx.createRadialGradient(tx - tr * 0.3, ty - tr * 0.3, 2, tx, ty, tr);
      tg.addColorStop(0, '#7fbf63'); tg.addColorStop(1, '#2f6b3a');
      ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(tx, ty, tr, 0, TAU); ctx.fill();
    }
    // pond
    ctx.fillStyle = '#8a7a64'; ctx.beginPath(); ctx.ellipse(POND.cx, POND.cy, POND.rx + 6, POND.ry + 6, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 22; i++) { const a = i / 22 * TAU; ctx.fillStyle = i % 2 ? '#a89a82' : '#7d6e59'; ctx.beginPath(); ctx.ellipse(POND.cx + Math.cos(a) * (POND.rx + 4), POND.cy + Math.sin(a) * (POND.ry + 4), 7, 5, a, 0, TAU); ctx.fill(); }
    const wg = ctx.createRadialGradient(POND.cx - 20, POND.cy - 15, 5, POND.cx, POND.cy, POND.rx);
    wg.addColorStop(0, '#7cc3e0'); wg.addColorStop(1, '#2f6f95');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(POND.cx, POND.cy, POND.rx, POND.ry, 0, 0, TAU); ctx.fill();
    // ripples + lily pads + koi
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const k = ((t * 0.4 + i / 3) % 1); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(POND.cx + 30, POND.cy - 10, 6 + k * 26, 3 + k * 14, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const [lx, ly] of [[POND.cx - 50, POND.cy + 18], [POND.cx - 34, POND.cy + 30], [POND.cx + 52, POND.cy + 22]]) {
      ctx.fillStyle = '#4f9a52'; ctx.beginPath(); ctx.arc(lx, ly, 8, 0.3, TAU - 0.1); ctx.lineTo(lx, ly); ctx.fill();
    }
    for (let i = 0; i < 2; i++) {
      const a = t * (0.5 + i * 0.2) + i * 3;
      const kx = POND.cx + Math.cos(a) * 46, ky = POND.cy + Math.sin(a) * 24;
      ctx.save(); ctx.translate(kx, ky); ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = i ? '#fff6e5' : '#f29f2e'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.5, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-13, -3); ctx.lineTo(-13, 3); ctx.fill();
      ctx.restore();
    }
    // fence
    ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 4;
    ctx.strokeRect(y.x + 2, y.y + 2, y.w - 4, y.h - 4);
    ctx.fillStyle = '#b08a62';
    for (let i = 0; i <= y.w; i += 20) { ctx.fillRect(y.x + i - 2, y.y - 1, 4, 6); ctx.fillRect(y.x + i - 2, y.y + y.h - 5, 4, 6); }
    for (let i = 0; i <= y.h; i += 20) ctx.fillRect(y.x + y.w - 5, y.y + i - 2, 6, 4);
    // the afternoon gets golden as the party approaches
    if (dusk > 0) { ctx.fillStyle = `rgba(255,150,60,${0.18 * dusk})`; ctx.fillRect(y.x, y.y, y.w, y.h); }
  }

  // ---- indoor
  drawHouse(ctx) {
    const s = this.game.state;
    // exterior shadow + wall base
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(HOUSE.x + 6, HOUSE.y + 8, HOUSE.w, HOUSE.h);
    for (const id of Object.keys(FLOORS)) drawFloor(ctx, R[id], FLOORS[id], id);
    for (const id of Object.keys(FLOORS)) drawFurniture(ctx, id, R[id], this.t, s);
    // interior walls
    ctx.strokeStyle = '#4a3426'; ctx.lineWidth = 5; ctx.lineJoin = 'miter';
    for (const id of Object.keys(FLOORS)) { const b = R[id]; ctx.strokeRect(b.x, b.y, b.w, b.h); }
    // doors (threshold gaps)
    ctx.fillStyle = '#c8a27a';
    for (const [x, y, w, h] of DOORS) ctx.fillRect(x, y, w, h);
    // exterior walls
    ctx.strokeStyle = '#3a271c'; ctx.lineWidth = 8;
    ctx.strokeRect(HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h);
    // patio slider + front door
    ctx.fillStyle = '#bfe3f2'; ctx.fillRect(...PATIO_DOOR);
    ctx.fillStyle = '#a8483a'; ctx.fillRect(...FRONT_DOOR);
    ctx.fillStyle = '#d8c49a'; rr(ctx, 4, 254, 14, 30, 3); ctx.fill(); // welcome mat
    // windows on exterior walls
    ctx.fillStyle = '#bfe3f2';
    for (const wx of [60, 120, 210, 320]) ctx.fillRect(wx, HOUSE.y - 3, 26, 6);
    for (const wx of [60, 250, 330]) ctx.fillRect(wx, HOUSE.y + HOUSE.h - 3, 26, 6);
  }

  drawRoomState(ctx, id) {
    const st = this.roomState(id), room = ROOMS[id], t = this.t;
    const isPond = id === 'pond', b = isPond ? null : R[id];
    const clipShape = () => {
      ctx.beginPath();
      if (isPond) ctx.ellipse(POND.cx, POND.cy, POND.rx, POND.ry, 0, 0, TAU);
      else ctx.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    };
    const c = CENTER(id);
    ctx.save();
    if (st === 'locked') {
      clipShape(); ctx.fillStyle = id === 'backyard' ? 'rgba(16,19,31,0.42)' : 'rgba(16,19,31,0.6)'; ctx.fill();
      drawLock(ctx, c.x, isPond ? c.y : c.y + 6, 0.9);
    } else if (st === 'available') {
      const pulse = 0.5 + 0.5 * Math.sin(t * 4 + (this.newRooms.has(id) ? 0 : ROOM_IDS.indexOf(id)));
      clipShape(); ctx.fillStyle = hexA(room.accent, 0.1 + pulse * 0.14); ctx.fill();
      ctx.save(); clipShape(); ctx.clip(); drawWeird(ctx, id, c, b, t); ctx.restore();
      ctx.shadowColor = room.accent; ctx.shadowBlur = 12 + pulse * 14;
      ctx.strokeStyle = room.accent; ctx.lineWidth = 3 + pulse * 2;
      clipShape(); ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      // done: warm lamp glow
      const rad = isPond ? POND.rx : Math.max(b.w, b.h) * 0.7;
      const lg = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, rad);
      lg.addColorStop(0, 'rgba(255,214,120,0.38)'); lg.addColorStop(1, 'rgba(255,190,90,0.05)');
      clipShape(); ctx.fillStyle = lg; ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,120,0.7)'; ctx.lineWidth = 2; clipShape(); ctx.stroke();
    }
    ctx.restore();

    // name label
    const lx = isPond ? c.x : b.x + b.w / 2;
    const ly = isPond ? POND.cy - POND.ry - 20 : b.y + 14;
    if (id === 'backyard') {
      chip(ctx, room.name, YARD.x + YARD.w / 2, YARD.y + 50, { align: 'center', fill: st === 'locked' ? '#4a4f60' : st === 'done' ? PALETTE.sun : room.accent, color: st === 'locked' ? '#b8bccb' : PALETTE.ink, font: BOLD(13) });
    } else {
      chip(ctx, room.name, lx, ly, { align: 'center', fill: st === 'locked' ? '#4a4f60' : st === 'done' ? PALETTE.sun : room.accent, color: st === 'locked' ? '#b8bccb' : PALETTE.ink, font: BOLD(isPond ? 13 : 12) });
    }
    if (st === 'done') {
      const n = this.game.state.rooms[id].stars;
      const sy = id === 'backyard' ? YARD.y + 72 : isPond ? POND.cy + POND.ry + 14 : b.y + b.h - 14;
      const sx0 = (id === 'backyard' ? YARD.x + YARD.w / 2 : lx) - 22;
      for (let i = 0; i < 3; i++) star(ctx, sx0 + i * 22, sy, 8, i < n ? PALETTE.sun : 'rgba(255,246,229,0.25)');
    }
    if (st === 'available' && this.newRooms.has(id)) {
      const bob = Math.sin(t * 6) * 2;
      const ny = id === 'backyard' ? YARD.y + 72 : isPond ? POND.cy + POND.ry + 14 : b.y + 34;
      chip(ctx, 'NEW!', id === 'backyard' ? YARD.x + YARD.w / 2 : lx, ny + bob, { align: 'center', fill: PALETTE.paper, color: PALETTE.danger });
    }
  }

  drawFairyLights(ctx) {
    const t = this.t;
    const strand = (x0, y0, x1, y1, sag, n) => {
      ctx.strokeStyle = 'rgba(40,30,20,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); ctx.stroke();
      for (let i = 1; i < n; i++) {
        const k = i / n, ix = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * (x0 + x1) / 2 + k * k * x1;
        const iy = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * ((y0 + y1) / 2 + sag * 2) + k * k * y1;
        const tw = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.7);
        const col = ['#ffe9a8', '#ffc94a', '#ff8fb1', '#bfe9ff'][i % 4];
        ctx.save(); ctx.globalAlpha = tw; ctx.shadowColor = col; ctx.shadowBlur = 10;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ix, iy, 2.6, 0, TAU); ctx.fill(); ctx.restore();
      }
    };
    strand(YARD.x + 4, YARD.y + 4, YARD.x + YARD.w - 4, YARD.y + 4, 22, 14);
    strand(YARD.x + 4, 378, YARD.x + YARD.w - 4, YARD.y + 140, 18, 14);
    strand(HOUSE.x, HOUSE.y, HOUSE.x + HOUSE.w, HOUSE.y, 6, 18);
    strand(YARD.x + 4, YARD.y + 4, YARD.x + 4, 378, 14, 12);
  }

  drawFocus(ctx) {
    const id = this.focus;
    if (!id || this.shopOpen) return;
    const t = this.t;
    const c = CENTER(id);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,246,229,0.95)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 20;
    ctx.beginPath();
    if (id === 'pond') ctx.ellipse(POND.cx, POND.cy, POND.rx + 10, POND.ry + 10, 0, 0, TAU);
    else { const b = R[id]; ctx.rect(b.x + 6, b.y + 6, b.w - 12, b.h - 12); }
    ctx.stroke();
    ctx.restore();
    // bouncing pointer
    const ay = (id === 'pond' ? POND.cy - 6 : id === 'backyard' ? YARD.y + 110 : c.y + 4) + Math.sin(t * 6) * 4;
    const ax = id === 'backyard' ? YARD.x + YARD.w / 2 : c.x;
    ctx.fillStyle = PALETTE.paper; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax, ay + 10); ctx.lineTo(ax - 9, ay - 4); ctx.lineTo(ax + 9, ay - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  drawTopBar(ctx) {
    const s = this.game.state;
    panel(ctx, 8, 6, 944, 40, { radius: 10 });
    text(ctx, 'The House', 22, 32, { font: BOLD(20), color: PALETTE.sun });
    // clock
    const k = Math.max(0, Math.min(1, (s.clock - 10) / 9));
    drawClock(ctx, 196, 26, 12, s.clock);
    text(ctx, fmtHour(s.clock), 216, 32, { font: BOLD(18) });
    text(ctx, '·  guests arrive at 7:00 PM', 312, 32, { font: FONT.ui, color: 'rgba(255,246,229,0.8)' });
    bar(ctx, 528, 20, 150, 12, k, PALETTE.sunDeep);
    // stars + party points
    const stars = ROOM_IDS.reduce((a, id) => a + (s.rooms[id].stars || 0), 0);
    const done = ROOM_IDS.filter((id) => s.rooms[id].done).length;
    star(ctx, 708, 26, 9); text(ctx, `${stars}/27`, 722, 32, { font: BOLD(16) });
    text(ctx, `${done}/9 fixed`, 778, 32, { font: FONT.small, color: 'rgba(255,246,229,0.75)' });
    drawPartyPopper(ctx, 852, 26);
    text(ctx, `${s.partyPoints} PP`, 868, 32, { font: BOLD(16), color: PALETTE.mint });
  }

  drawSide(ctx) {
    const g = this.game, s = g.state;
    const x = SIDE.x, y = SIDE.y, w = SIDE.w;
    panel(ctx, x, y, w, 300, { radius: 12 });
    const id = this.panelRoom();
    if (id) {
      const room = ROOMS[id], st = this.roomState(id);
      ctx.fillStyle = room.accent; rr(ctx, x + 12, y + 12, 6, 34, 3); ctx.fill();
      text(ctx, room.name, x + 26, y + 36, { font: BOLD(22) });
      const label = st === 'done' ? 'FIXED' : st === 'available' ? 'READY TO FIX' : 'LOCKED';
      chip(ctx, label, x + 26, y + 60, { fill: st === 'done' ? PALETTE.sun : st === 'available' ? room.accent : '#4a4f60', color: st === 'locked' ? '#d0d3de' : PALETTE.ink });
      if (st === 'done') { const n = s.rooms[id].stars; for (let i = 0; i < 3; i++) star(ctx, x + 110 + i * 20, y + 60, 8, i < n ? PALETTE.sun : 'rgba(255,246,229,0.25)'); }
      // PartyPlanner's function, terminal style
      ctx.fillStyle = '#0d1410'; rr(ctx, x + 14, y + 76, w - 28, 26, 6); ctx.fill();
      const cursor = Math.floor(this.t * 2) % 2 ? '_' : ' ';
      text(ctx, `> ${room.fn} ${st === 'done' ? 'OK' : 'ERROR'}${cursor}`, x + 22, y + 94, { font: MONO, color: st === 'done' ? PALETTE.mint : '#ff9b7a', shadow: false });
      let yy = y + 124;
      for (const line of wrapText(ctx, room.weird + '.', w - 32, BOLD(14)).slice(0, 2)) { text(ctx, line, x + 16, yy, { font: BOLD(14), color: PALETTE.paper }); yy += 18; }
      yy += 6;
      text(ctx, `Goal: ${room.objective}`, x + 16, yy, { font: FONT.small, color: 'rgba(255,246,229,0.85)', maxWidth: w - 32 }); yy += 18;
      text(ctx, `Minigame: ${room.minigame}`, x + 16, yy, { font: FONT.small, color: 'rgba(255,246,229,0.85)', maxWidth: w - 32 }); yy += 18;
      if (room.favored) { text(ctx, `Specialist: ${room.favored === 'aaron' ? 'Aaron' : 'Victoria'}`, x + 16, yy, { font: FONT.small, color: PALETTE.sun }); }
      yy += 18;
      if (st === 'locked') {
        for (const line of wrapText(ctx, `Locked: ${this.unlockText(id)}.`, w - 32, FONT.small)) { text(ctx, line, x + 16, yy + 8, { font: FONT.small, color: '#ffb3a8' }); yy += 16; }
      } else if (st === 'done') {
        text(ctx, 'All cozy again. Nice work!', x + 16, yy + 8, { font: FONT.small, color: PALETTE.mint });
      }
      if (st === 'available') button(ctx, g, 'Go fix it!', x + 16, GO_Y, w - 32, 40, { primary: true, hotkey: 'Enter' });
    }
    // shop button
    const cheapest = PERK_LIST.filter((p) => !owns(s, p.id)).reduce((m, p) => Math.min(m, p.cost), Infinity);
    const afford = s.partyPoints >= cheapest;
    button(ctx, g, 'Party Touches', x + 16, SHOP_BTN_Y, w - 32, 46, { sub: afford ? 'You can afford one!' : `${s.purchases.length}/${PERK_LIST.length} bought`, hotkey: 'B', style: afford ? 'mint' : undefined });
    if (afford) { const p = 0.5 + 0.5 * Math.sin(this.t * 5); ctx.fillStyle = `rgba(127,216,166,${p})`; ctx.beginPath(); ctx.arc(x + w - 20, SHOP_BTN_Y + 2, 5, 0, TAU); ctx.fill(); }
  }

  drawHint(ctx) {
    const s = this.game.state;
    const av = this.rooms();
    const done = ROOM_IDS.filter((id) => s.rooms[id].done).length;
    let hint;
    if (this.celebrate > 0 && this.justFinished) {
      const nu = [...this.newRooms].map((id) => ROOMS[id].name);
      hint = `${ROOMS[this.justFinished].name} fixed!` + (nu.length ? ` Now open: ${nu.join(' and ')}.` : ' Pick your next room.');
    } else if (done === 0) {
      hint = 'What now? Start in the glowing Office, where Aaron\'s laptop bugs got loose. Click it or press Enter.';
    } else if (av.length === 1 && av[0] === 'pond') {
      hint = 'What now? Every room is fixed. PartyPlanner is hiding in the pond. Go end this!';
    } else if (av.length === 0) {
      hint = 'The house is ready. Party time!';
    } else {
      hint = `What now? Pick one of the ${av.length} glowing rooms. Arrows to browse, Enter to go.`;
      const cheapest = PERK_LIST.filter((p) => !owns(s, p.id)).reduce((m, p) => Math.min(m, p.cost), Infinity);
      if (s.partyPoints >= cheapest) hint += ' You can buy a Party Touch (B).';
    }
    panel(ctx, 8, 488, 944, 44, { radius: 10, style: 'paper' });
    text(ctx, hint, 24, 516, { font: BOLD(15), color: PALETTE.choc, shadow: false, maxWidth: 912 });
  }

  drawTooltip(ctx, id) {
    const m = this.game.input.mouse;
    const msg = `Locked: ${this.unlockText(id)}`;
    ctx.font = FONT.small;
    const w = ctx.measureText(msg).width + 20;
    const x = Math.min(m.x + 14, 690 - w), y = Math.max(56, m.y - 34);
    panel(ctx, x, y, w, 26, { radius: 8, shadow: true, stroke: '#ffb3a8' });
    text(ctx, msg, x + 10, y + 17, { font: FONT.small });
  }

  drawCelebration(ctx) {
    const k = this.celebrate;
    const a = Math.min(1, k * 2, (3.2 - k) * 4);
    const room = ROOMS[this.justFinished];
    const n = this.game.state.rooms[this.justFinished].stars;
    const sc = 1 + Math.max(0, (k - 2.9)) * 2;
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(345, 270); ctx.scale(sc, sc);
    panel(ctx, -170, -40, 340, 80, { style: 'paper', radius: 16 });
    text(ctx, `${room.name} fixed!`, 0, -6, { align: 'center', font: BOLD(26), color: PALETTE.choc, shadow: false });
    for (let i = 0; i < 3; i++) star(ctx, -24 + i * 24, 22, 10, i < n ? PALETTE.sun : 'rgba(90,58,42,0.2)');
    ctx.restore();
  }

  drawShop(ctx) {
    const g = this.game, s = g.state;
    ctx.fillStyle = 'rgba(10,12,20,0.6)'; ctx.fillRect(0, 0, g.width, g.height);
    panel(ctx, SHOP.x, SHOP.y, SHOP.w, SHOP.h, { style: 'paper', radius: 16 });
    text(ctx, 'Party Touches', SHOP.x + 24, SHOP.y + 40, { font: BOLD(26), color: PALETTE.choc, shadow: false });
    text(ctx, 'Little upgrades for the party. Earn Party Points (PP) with stars: 10 PP per star.', SHOP.x + 24, SHOP.y + 62, { font: FONT.small, color: PALETTE.choc, shadow: false });
    drawPartyPopper(ctx, SHOP.x + SHOP.w - 120, SHOP.y + 34);
    text(ctx, `${s.partyPoints} PP`, SHOP.x + SHOP.w - 104, SHOP.y + 40, { font: BOLD(20), color: PALETTE.mintDeep, shadow: false });
    PERK_LIST.forEach((pk, i) => {
      const c = shopCell(i);
      const have = owns(s, pk.id);
      const sel = i === this.shopFocus;
      ctx.fillStyle = have ? 'rgba(127,216,166,0.25)' : sel ? 'rgba(242,159,46,0.18)' : 'rgba(90,58,42,0.07)';
      rr(ctx, c.x, c.y, c.w, c.h, 10); ctx.fill();
      ctx.strokeStyle = sel ? PALETTE.sunDeep : 'rgba(90,58,42,0.25)'; ctx.lineWidth = sel ? 2.5 : 1; rr(ctx, c.x, c.y, c.w, c.h, 10); ctx.stroke();
      drawPerkIcon(ctx, pk.id, c.x + 30, c.y + c.h / 2, this.t);
      text(ctx, pk.name, c.x + 58, c.y + 24, { font: BOLD(15), color: PALETTE.choc, shadow: false });
      const kindLabel = pk.kind === 'cosmetic' ? 'Decor' : pk.kind === 'minigame' ? 'Minigames' : 'Both heroes';
      text(ctx, kindLabel, c.x + c.w - 12, c.y + 22, { align: 'right', font: FONT.small, color: 'rgba(90,58,42,0.6)', shadow: false });
      text(ctx, pk.desc, c.x + 58, c.y + 44, { font: FONT.small, color: PALETTE.choc, shadow: false, maxWidth: c.w - 160 });
      if (have) chip(ctx, 'OWNED', c.x + c.w - 52, c.y + c.h - 22, { align: 'center', fill: PALETTE.mintDeep, color: PALETTE.paper });
      else button(ctx, g, `${pk.cost} PP`, c.x + c.w - 92, c.y + c.h - 36, 80, 28, { disabled: s.partyPoints < pk.cost, primary: s.partyPoints >= pk.cost });
    });
    button(ctx, g, 'Done', 480 - 60, SHOP.y + SHOP.h - 50, 120, 36, { primary: true, hotkey: 'Esc' });
  }
}

const SHOP = { x: 130, y: 54, w: 700, h: 430 };
function shopCell(i) {
  const col = i % 2, row = Math.floor(i / 2);
  return { x: SHOP.x + 20 + col * 334, y: SHOP.y + 80 + row * 72, w: 326, h: 64 };
}

// ---------------------------------------------------------------- drawing helpers
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function drawFloor(ctx, b, kind, id) {
  ctx.save();
  ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
  if (kind === 'wood') {
    ctx.fillStyle = '#b98a5e'; ctx.fillRect(b.x, b.y, b.w, b.h);
    for (let yy = b.y, r = 0; yy < b.y + b.h; yy += 10, r++) {
      ctx.fillStyle = r % 2 ? 'rgba(90,55,30,0.12)' : 'rgba(255,230,190,0.08)'; ctx.fillRect(b.x, yy, b.w, 10);
      ctx.fillStyle = 'rgba(70,40,20,0.25)'; ctx.fillRect(b.x, yy, b.w, 1);
      for (let xx = b.x + ((r * 37) % 60); xx < b.x + b.w; xx += 60) ctx.fillRect(xx, yy, 1, 10);
    }
  } else if (kind === 'carpet') {
    ctx.fillStyle = id === 'primary' ? '#cdbba6' : '#bfc7c2'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 60; i++) ctx.fillRect(b.x + ((i * 41) % b.w), b.y + ((i * 67) % b.h), 2, 2);
  } else if (kind === 'tile') {
    for (let yy = 0; yy < b.h; yy += 14) for (let xx = 0; xx < b.w; xx += 14) {
      ctx.fillStyle = ((xx + yy) / 14) % 2 ? '#e9e1d2' : '#d6cbb6'; ctx.fillRect(b.x + xx, b.y + yy, 14, 14);
    }
  } else if (kind === 'mat') {
    ctx.fillStyle = '#b98a5e'; ctx.fillRect(b.x, b.y, b.w, b.h);
    const cols = ['#5aa4e6', '#ffc94a', '#7fd8a6', '#ff8fb1'];
    for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 5; xx++) { ctx.fillStyle = cols[(xx + yy) % 4]; ctx.fillRect(b.x + 20 + xx * 22, b.y + 40 + yy * 22, 21, 21); }
  }
  ctx.restore();
}

function furnitureBox(ctx, x, y, w, h, fill, r = 3) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; rr(ctx, x + 2, y + 3, w, h, r); ctx.fill();
  ctx.fillStyle = fill; rr(ctx, x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = 'rgba(40,25,15,0.35)'; ctx.lineWidth = 1; rr(ctx, x, y, w, h, r); ctx.stroke();
}
function plant(ctx, x, y, r = 7) {
  ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#4f9a52';
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, r * 0.3, a, 0, TAU); ctx.fill(); }
}
function vase(ctx, x, y) {
  ctx.fillStyle = '#e9f2f5'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
  ['#ff8fb1', '#ffc94a', '#c9a0dc'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x - 4 + i * 4, y - 3 - (i % 2) * 2, 2.6, 0, TAU); ctx.fill(); });
}
function chair(ctx, x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  furnitureBox(ctx, -6, -6, 12, 12, '#7a5236', 2);
  ctx.fillStyle = '#5a3a24'; ctx.fillRect(-6, -8, 12, 3);
  ctx.restore();
}

function drawFurniture(ctx, id, b, t, s) {
  const flowers = owns(s, 'fresh_flowers');
  const X = b.x, Y = b.y;
  switch (id) {
    case 'primary': {
      ctx.fillStyle = '#b07a8a'; rr(ctx, X + 30, Y + 54, 90, 64, 8); ctx.fill(); // rug
      furnitureBox(ctx, X + 44, Y + 28, 62, 70, '#f3e6dc', 5);                  // queen bed
      ctx.fillStyle = '#ff8fb1'; rr(ctx, X + 44, Y + 52, 62, 46, 4); ctx.fill(); // quilt (crocheted)
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(X + 44 + i * 13, Y + 52); ctx.lineTo(X + 44 + i * 13, Y + 98); ctx.stroke(); }
      ctx.fillStyle = '#fff'; rr(ctx, X + 48, Y + 32, 25, 13, 4); ctx.fill(); rr(ctx, X + 77, Y + 32, 25, 13, 4); ctx.fill();
      furnitureBox(ctx, X + 26, Y + 30, 14, 14, '#8a5a3a'); furnitureBox(ctx, X + 110, Y + 30, 14, 14, '#8a5a3a');
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(X + 33, Y + 37, 4, 0, TAU); ctx.arc(X + 117, Y + 37, 4, 0, TAU); ctx.fill();
      furnitureBox(ctx, X + 12, Y + 100, 40, 16, '#9a6a48');
      if (flowers) vase(ctx, X + 117, Y + 50);
      break;
    }
    case 'guest': {
      furnitureBox(ctx, X + 14, Y + 26, 40, 62, '#e6eef2', 4);
      ctx.fillStyle = '#4f8fb3'; rr(ctx, X + 14, Y + 46, 40, 42, 3); ctx.fill();
      ctx.fillStyle = '#fff'; rr(ctx, X + 19, Y + 30, 30, 11, 4); ctx.fill();
      furnitureBox(ctx, X + 62, Y + 26, 14, 14, '#8a5a3a');
      ctx.fillStyle = '#d9c7a3'; rr(ctx, X + 30, Y + 96, 50, 22, 6); ctx.fill();
      plant(ctx, X + 92, Y + 104, 8);
      furnitureBox(ctx, X + 84, Y + 24, 18, 40, '#a77a52'); // dresser
      if (flowers) vase(ctx, X + 69, Y + 33);
      break;
    }
    case 'office': {
      furnitureBox(ctx, X + 20, Y + 26, 80, 26, '#7a5236');          // desk
      ctx.fillStyle = '#222'; rr(ctx, X + 30, Y + 30, 30, 18, 2); ctx.fill(); // laptop
      const glow = 0.6 + 0.4 * Math.sin(t * 7);
      ctx.fillStyle = s.rooms.office.done ? '#7fd8a6' : `rgba(255,120,100,${glow})`; ctx.fillRect(X + 33, Y + 33, 24, 12);
      ctx.fillStyle = '#333'; rr(ctx, X + 66, Y + 30, 26, 6, 2); ctx.fill(); // monitor
      ctx.fillStyle = '#3a3f4a'; ctx.beginPath(); ctx.arc(X + 50, Y + 68, 10, 0, TAU); ctx.fill(); // chair
      furnitureBox(ctx, X + 10, Y + 92, 70, 18, '#8a5a3a');            // bookshelf
      ['#a8483a', '#5aa4e6', '#ffc94a', '#7fd8a6', '#c9a0dc', '#f29f2e'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(X + 14 + i * 10, Y + 95, 7, 12); });
      plant(ctx, X + 100, Y + 100, 8);
      break;
    }
    case 'living': {
      ctx.fillStyle = '#8f6f9a'; rr(ctx, X + 36, Y + 40, 130, 72, 10); ctx.fill(); // rug
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; rr(ctx, X + 42, Y + 46, 118, 60, 8); ctx.stroke();
      furnitureBox(ctx, X + 30, Y + 112, 140, 22, '#5b7fa6', 8);  // sofa
      furnitureBox(ctx, X + 30, Y + 84, 22, 50, '#5b7fa6', 8);    // L
      ctx.fillStyle = '#ffc94a'; rr(ctx, X + 60, Y + 116, 16, 12, 4); ctx.fill(); ctx.fillStyle = '#ff8fb1'; rr(ctx, X + 120, Y + 116, 16, 12, 4); ctx.fill();
      furnitureBox(ctx, X + 76, Y + 62, 50, 26, '#7a5236', 4);   // coffee table
      furnitureBox(ctx, X + 60, Y + 22, 80, 10, '#3a3f4a');      // tv
      ctx.fillStyle = '#111'; ctx.fillRect(X + 66, Y + 24, 68, 4);
      furnitureBox(ctx, X + 176, Y + 70, 22, 22, '#c9a0dc', 6);  // armchair
      plant(ctx, X + 186, Y + 30, 10);
      if (flowers) vase(ctx, X + 101, Y + 75);
      break;
    }
    case 'playroom': {
      furnitureBox(ctx, X + 130, Y + 28, 28, 18, '#a8483a');      // toy chest
      ctx.fillStyle = '#ffc94a'; ctx.beginPath(); ctx.arc(X + 150, Y + 118, 14, 0, TAU); ctx.fill(); // beanbag
      ['#a8483a', '#5aa4e6', '#7fd8a6'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(X + 138 + i * 9, Y + 70 + (i % 2) * 8, 8, 8); });
      furnitureBox(ctx, X + 44, Y + 66, 40, 30, '#fff6e5', 2); // board game
      ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = 0.6;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X + 44 + i * 10, Y + 66); ctx.lineTo(X + 44 + i * 10, Y + 96); ctx.stroke(); }
      break;
    }
    case 'dining': {
      ctx.fillStyle = '#8a3f4a'; rr(ctx, X + 26, Y + 30, 118, 80, 10); ctx.fill(); // rug
      const extra = owns(s, 'extra_chairs');
      const tw = 76, th = 40, tx = X + 47, ty = Y + 50;
      const cxs = extra ? [tx + 14, tx + 38, tx + 62] : [tx + 22, tx + 54];
      for (const cx of cxs) { chair(ctx, cx, ty - 8, 0); chair(ctx, cx, ty + th + 8, Math.PI); }
      if (extra) { chair(ctx, tx - 9, ty + th / 2, -Math.PI / 2); chair(ctx, tx + tw + 9, ty + th / 2, Math.PI / 2); }
      furnitureBox(ctx, tx, ty, tw, th, '#9a6a48', 5);
      ctx.fillStyle = '#fff6e5';
      for (const cx of cxs) { ctx.beginPath(); ctx.arc(cx, ty + 9, 5, 0, TAU); ctx.arc(cx, ty + th - 9, 5, 0, TAU); ctx.fill(); }
      if (flowers) vase(ctx, tx + tw / 2, ty + th / 2 + 2);
      furnitureBox(ctx, X + 20, Y + 112, 60, 12, '#7a5236'); // sideboard
      break;
    }
    case 'kitchen': {
      furnitureBox(ctx, X + 10, Y + 18, b.w - 20, 22, '#d9d1c2', 2);  // back counter
      furnitureBox(ctx, X + b.w - 32, Y + 18, 22, b.h - 36, '#d9d1c2', 2); // side counter
      // stove
      ctx.fillStyle = '#2b2b30'; ctx.fillRect(X + 70, Y + 20, 34, 18);
      ctx.strokeStyle = s.rooms.kitchen.done ? '#555' : `rgba(255,120,60,${0.5 + 0.5 * Math.sin(t * 5)})`; ctx.lineWidth = 1.5;
      for (const [ox, oy] of [[78, 25], [96, 25], [78, 33], [96, 33]]) { ctx.beginPath(); ctx.arc(X + ox, Y + oy, 3, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#bfe3f2'; ctx.fillRect(X + 124, Y + 22, 24, 14); // sink
      furnitureBox(ctx, X + 12, Y + 18, 26, 26, '#eef1f3', 3);        // fridge
      furnitureBox(ctx, X + 62, Y + 70, 80, 32, '#b0a28a', 4);        // island
      ctx.fillStyle = '#e0a95e'; ctx.beginPath(); ctx.ellipse(X + 86, Y + 86, 12, 6, 0, 0, TAU); ctx.fill(); // a loaf
      for (const cx of [X + 76, X + 102, X + 128]) { ctx.fillStyle = '#5a3a24'; ctx.beginPath(); ctx.arc(cx, Y + 112, 5, 0, TAU); ctx.fill(); }
      if (flowers) vase(ctx, X + 124, Y + 84);
      break;
    }
  }
}

/** Visual hint of each available room's "weird thing", drawn in its accent color. */
function drawWeird(ctx, id, c, b, t) {
  const acc = ROOMS[id].accent;
  ctx.save();
  ctx.fillStyle = acc; ctx.strokeStyle = acc;
  const bx = b?.x ?? POND.cx - POND.rx, by = b?.y ?? POND.cy - POND.ry, bw = b?.w ?? POND.rx * 2, bh = b?.h ?? POND.ry * 2;
  const wander = (i, sp = 1) => ({ x: bx + 16 + ((Math.sin(t * 0.7 * sp + i * 2.1) + 1) / 2) * (bw - 32), y: by + 30 + ((Math.cos(t * 0.9 * sp + i * 1.3) + 1) / 2) * (bh - 50) });
  switch (id) {
    case 'office': for (let i = 0; i < 5; i++) { const p = wander(i, 1.6); bugGlyph(ctx, p.x, p.y, t * 20 + i, '#2d6b47'); } break;
    case 'kitchen': for (let i = 0; i < 3; i++) { const p = wander(i, 0.6); const sq = 1 + Math.sin(t * 5 + i) * 0.15; ctx.fillStyle = '#f3e1b5'; ctx.strokeStyle = '#b8935a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, 9 * sq, 7 / sq, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#333'; ctx.fillRect(p.x - 3, p.y - 2, 2, 2); ctx.fillRect(p.x + 2, p.y - 2, 2, 2); } break;
    case 'living': { const p = wander(0, 0.5); ctx.fillStyle = '#3a3f4a'; ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, TAU); ctx.fill(); ctx.fillStyle = PALETTE.danger; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill();
      for (let i = 1; i < 4; i++) { const q = wander(i, 2.2); ctx.fillStyle = '#d8d0e0'; ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(q.x - 2, q.y - 6, 1.5, 4, -0.2, 0, TAU); ctx.ellipse(q.x + 2, q.y - 6, 1.5, 4, 0.2, 0, TAU); ctx.fill(); } break; }
    case 'dining': for (let i = 0; i < 3; i++) { const a = t * 2.5 + i * 2.1; const px = c.x + Math.cos(a) * 46, py = c.y + Math.sin(a) * 30; ctx.fillStyle = '#fff6e5'; ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, 8, 6, 0, 0, TAU); ctx.fill(); ctx.stroke(); } break;
    case 'playroom': for (let i = 0; i < 5; i++) { const px = bx + ((t * 30 + i * 34) % (bw - 10)), py = by + 112 + Math.abs(Math.sin(t * 6 + i)) * -4; ctx.fillStyle = '#fff6e5'; ctx.fillRect(px, py, 9, 13); ctx.fillStyle = i % 2 ? PALETTE.danger : PALETTE.ink; ctx.fillRect(px + 3, py + 4, 3, 4); } break;
    case 'primary': for (let i = 0; i < 4; i++) { const p = wander(i, 1.2); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(t * 4 + i)); ctx.fillStyle = ['#ff8fb1', '#fff6e5', '#5aa4e6', '#ffc94a'][i]; ctx.fillRect(-3, -8, 6, 12); ctx.fillRect(-3, 2, 9, 5); ctx.restore(); } break;
    case 'guest': for (let i = 0; i < 4; i++) { const k = (t * 0.8 + i / 4) % 1; const px = bx + 20 + i * 24, py = by + 26 + k * (bh - 40); ctx.globalAlpha = 1 - k * 0.5; ctx.fillStyle = '#7cc3e0'; ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.quadraticCurveTo(px + 5, py + 2, px, py + 4); ctx.quadraticCurveTo(px - 5, py + 2, px, py - 6); ctx.fill(); }
      ctx.globalAlpha = 1; { const p = wander(9, 1); ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#f29f2e'; ctx.fillRect(p.x + 5, p.y - 1, 4, 3); } break;
    case 'backyard': for (let i = 0; i < 5; i++) { const px = bx + 30 + ((t * 18 + i * 50) % (bw - 60)), py = by + 120 + (i % 2) * 24; ctx.fillStyle = PALETTE.danger; ctx.beginPath(); ctx.moveTo(px, py - 12); ctx.lineTo(px - 6, py); ctx.lineTo(px + 6, py); ctx.fill(); ctx.fillStyle = '#f2c7a5'; ctx.beginPath(); ctx.arc(px, py + 2, 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(px - 3, py + 4, 6, 3); } break;
    case 'pond': { ctx.font = MONO; ctx.textAlign = 'center'; const glyphs = ['{ }', '01', '=>', '</>', ';']; for (let i = 0; i < 6; i++) { const k = (t * 0.4 + i / 6) % 1; ctx.globalAlpha = Math.sin(k * Math.PI); ctx.fillStyle = '#d9f6ff'; ctx.fillText(glyphs[i % glyphs.length], c.x - 60 + i * 24, c.y + 30 - k * 50); } break; }
  }
  ctx.restore();
}

function bugGlyph(ctx, x, y, ph, col) {
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x, y, 4, 5, 0, 0, TAU); ctx.fill();
  for (const s of [-1, 1]) for (const k of [-2, 1, 4]) { ctx.beginPath(); ctx.moveTo(x + s * 3, y + k); ctx.lineTo(x + s * 7, y + k + Math.sin(ph) * 2); ctx.stroke(); }
}

function drawLock(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#c9ccd8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -6, 6, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#c9ccd8'; rr(ctx, -9, -6, 18, 14, 3); ctx.fill();
  ctx.fillStyle = '#4a4f60'; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, TAU); ctx.fill(); ctx.fillRect(-1, 0, 2, 4);
  ctx.restore();
}

function drawClock(ctx, x, y, r, hour) {
  ctx.save();
  ctx.fillStyle = PALETTE.paper; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = PALETTE.sunDeep; ctx.lineWidth = 2; ctx.stroke();
  const ha = ((hour % 12) / 12) * TAU - Math.PI / 2;
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ha) * r * 0.5, y + Math.sin(ha) * r * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 0.75); ctx.stroke();
  ctx.restore();
}

function drawPartyPopper(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = PALETTE.sunDeep; ctx.beginPath(); ctx.moveTo(x - 7, y + 8); ctx.lineTo(x + 2, y - 4); ctx.lineTo(x + 6, y); ctx.closePath(); ctx.fill();
  ['#ff8fb1', PALETTE.mint, PALETTE.sun].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x + 4 + i * 3, y - 9 + i * 2, 3, 3); });
  ctx.restore();
}

function drawPerkIcon(ctx, id, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill();
  switch (id) {
    case 'good_coffee': ctx.fillStyle = '#fff'; rr(ctx, -9, -6, 16, 16, 3); ctx.fill(); ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.arc(9, 2, 4, -1.4, 1.4); ctx.stroke(); ctx.fillStyle = '#6b4226'; ctx.fillRect(-7, -4, 12, 4);
      ctx.strokeStyle = 'rgba(90,58,42,0.5)'; ctx.beginPath(); ctx.moveTo(-3, -9); ctx.quadraticCurveTo(0, -13 + Math.sin(t * 3), -2, -16); ctx.stroke(); break;
    case 'snack_table': furnitureBox(ctx, -13, -2, 26, 12, '#9a6a48'); ctx.fillStyle = '#e0a95e'; ctx.beginPath(); ctx.ellipse(-4, -4, 7, 4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ff8fb1'; ctx.beginPath(); ctx.arc(7, -4, 4, 0, TAU); ctx.fill(); break;
    case 'house_shoes': ctx.fillStyle = '#c9a0dc'; ctx.beginPath(); ctx.ellipse(-5, 2, 5, 10, -0.2, 0, TAU); ctx.ellipse(6, 2, 5, 10, 0.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff6e5'; ctx.beginPath(); ctx.arc(-5, -5, 3, 0, TAU); ctx.arc(6, -5, 3, 0, TAU); ctx.fill(); break;
    case 'playlist': ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(-5, 7, 4, 0, TAU); ctx.arc(7, 4, 4, 0, TAU); ctx.fill(); ctx.fillRect(-2, -9, 2.5, 16); ctx.fillRect(10, -12, 2.5, 16); ctx.fillRect(-2, -12, 14.5, 4); break;
    case 'fairy_lights': ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-15, -6); ctx.quadraticCurveTo(0, 10, 15, -6); ctx.stroke();
      [[-9, 0, '#ffc94a'], [0, 2, '#ff8fb1'], [9, 0, '#bfe9ff']].forEach(([lx, ly, c], i) => { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4 + i); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(lx, ly + 3, 3.5, 0, TAU); ctx.fill(); }); break;
    case 'extra_chairs': chair(ctx, -6, 0, 0); chair(ctx, 7, 2, 0.2); break;
    case 'fresh_flowers': ctx.scale(2, 2); vase(ctx, 0, 3); break;
    default: star(ctx, 0, 0, 10);
  }
  ctx.restore();
}
