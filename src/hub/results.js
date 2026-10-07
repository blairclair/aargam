// Room results. Owned by: hub team.
// params: { roomId, hero, stars, action: ActionResult, minigame: MinigameResult, newSkills: string[] }
// Continue -> finishRoom(game, roomId, stars).
import { ROOMS, SKILLS, HEROES, PALETTE, FONT } from '../core/theme.js';
import { finishRoom } from '../core/flow.js';
import { button, text, panel, chip, bar, wrapText } from '../ui/widgets.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { MONO, BOLD, rr, star, drawBustImg, skillIcon, Sparks } from './common.js';

const STAR_T = [0.6, 1.0, 1.4];  // when each star lands
const REVEAL_T = 2.0;            // new skills appear
const CONT = { x: 736, y: 470, w: 200, h: 52 };

export default class ResultsScene {
  constructor(game) { this.game = game; }

  enter(p = {}) {
    const s = this.game.state;
    const roomId = ROOMS[p.roomId] ? p.roomId : 'office';
    const hero = HEROES[p.hero] ? p.hero : (this.game._run?.hero ?? 'aaron');
    const stars = Math.max(1, Math.min(3, Number(p.stars) || 1));
    const newSkills = (Array.isArray(p.newSkills) ? p.newSkills : Object.values(ROOMS[roomId].skills ?? {}))
      .filter((id) => SKILLS[id] && !(s.skills[SKILLS[id].hero] ?? []).includes(id));
    this.p = { ...p, roomId, hero, stars, newSkills };
    this.room = ROOMS[roomId];
    const prev = s.rooms[roomId]?.stars ?? 0;
    this.pp = Math.max(0, stars - prev) * 10;
    this.t = 0;
    this.landed = 0;
    this.revealed = false;
    this.sparks = new Sparks();
    this.sparks.burst(480, -10, [PALETTE.sun, '#ff8fb1', PALETTE.mint, PALETTE.sky, PALETTE.paper], 60, 260, { g: 160, stars: 0.15 });
    playMusic('house');
    playSfx('victory');
  }

  skip() {
    this.t = Math.max(this.t, REVEAL_T + 0.3);
  }

  update(dt) {
    const g = this.game, inp = g.input;
    this.t += dt;
    this.sparks.update(dt);
    while (this.landed < 3 && this.t >= STAR_T[this.landed]) {
      const i = this.landed++;
      const sx = 480 - 70 + i * 70;
      if (i < this.p.stars) { playSfx('star'); this.sparks.burst(sx, 150, [PALETTE.sun, '#fff3c4'], 22, 180, { g: 120, stars: 0.6 }); }
      else playSfx('blip');
    }
    if (!this.revealed && this.t >= REVEAL_T) {
      this.revealed = true;
      if (this.p.newSkills.length) { playSfx('unlock'); this.p.newSkills.forEach((_, i) => { const c = this.skillCard(i); this.sparks.burst(c.x + 30, c.y + c.h / 2, [PALETTE.mint, PALETTE.paper, PALETTE.sun], 20, 140, { g: 60, stars: 0.5 }); }); }
    }
    if (Math.random() < dt * 2) this.sparks.burst(80 + Math.random() * 800, -10, [PALETTE.sun, '#ff8fb1', PALETTE.mint, PALETTE.sky], 6, 60, { g: 140, stars: 0.1 });

    const ready = this.t >= REVEAL_T;
    if (inp.pressed('confirm') || (m(inp) && !ready)) {
      if (!ready) { this.skip(); return; }
      if (inp.pressed('confirm')) { this.continue(); return; }
    }
    if (ready && button(null, g, 'Continue', CONT.x, CONT.y, CONT.w, CONT.h, { primary: true })) this.continue();
  }

  continue() {
    if (this.done) return;
    this.done = true;
    playSfx('click');
    finishRoom(this.game, this.p.roomId, this.p.stars);
  }

  skillCard(i) {
    const n = this.p.newSkills.length;
    const w = n > 1 ? 300 : 360, gap = 16;
    const total = n * w + (n - 1) * gap;
    return { x: 600 - total / 2 + i * (w + gap), y: 384, w, h: 80 };
  }

  render(ctx) {
    const g = this.game, s = g.state, p = this.p, room = this.room, t = this.t;
    // backdrop: warm, lit room glow
    const bg = ctx.createLinearGradient(0, 0, 0, g.height);
    bg.addColorStop(0, '#3a2a22'); bg.addColorStop(1, '#17121a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.width, g.height);
    const lamp = ctx.createRadialGradient(480, 150, 10, 480, 150, 520);
    lamp.addColorStop(0, 'rgba(255,214,120,0.35)'); lamp.addColorStop(0.5, hexA(room.accent, 0.12)); lamp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lamp; ctx.fillRect(0, 0, g.width, g.height);
    // rotating light rays behind the stars
    ctx.save(); ctx.translate(480, 150); ctx.rotate(t * 0.15);
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = 'rgba(255,230,160,0.05)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -420); ctx.lineTo(40, -420); ctx.closePath(); ctx.fill(); }
    ctx.restore();

    // hero bust, celebrating
    const hop = Math.abs(Math.sin(t * 3)) * (t < 2.5 ? 10 : 4);
    drawBustImg(ctx, g, p.hero, 150, 540 - hop + 8, 330, { glow: 'rgba(255,214,120,0.6)' });

    // title
    const pop = Math.min(1, t * 4);
    ctx.save(); ctx.translate(480, 62); ctx.scale(0.6 + 0.4 * easeOutBack(pop), 0.6 + 0.4 * easeOutBack(pop)); ctx.globalAlpha = pop;
    text(ctx, `${room.name} fixed!`, 0, 0, { align: 'center', font: BOLD(40), color: PALETTE.sun, outline: PALETTE.choc, outlineWidth: 6 });
    ctx.restore();
    text(ctx, `> ${room.fn} ... OK`, 480, 92, { align: 'center', font: MONO, color: PALETTE.mint, shadow: false, alpha: Math.min(1, t * 2) });

    // stars
    for (let i = 0; i < 3; i++) {
      const sx = 480 - 70 + i * 70, k = (t - STAR_T[i]) / 0.3;
      star(ctx, sx, 150, 28, 'rgba(255,246,229,0.12)', { stroke: 'rgba(255,246,229,0.35)', lineWidth: 2 });
      if (i < p.stars && k > 0) {
        const sc = k < 1 ? 1.8 - 0.8 * easeOutBack(k) : 1 + Math.sin(t * 3 + i) * 0.04;
        ctx.save(); ctx.translate(sx, 150); ctx.scale(sc, sc);
        star(ctx, 0, 0, 28, PALETTE.sun, { stroke: PALETTE.choc, lineWidth: 2.5 });
        ctx.restore();
      }
    }

    // breakdown
    const bx = 330, by = 190, bw = 540;
    panel(ctx, bx, by, bw, 160, { radius: 14, alpha: Math.min(1, t * 2) });
    const a = p.action ?? {}, mg = p.minigame ?? {};
    const hp = a.hpFrac ?? null, score = mg.score ?? null;
    let y = by + 32;
    const row = (label, frac, color, value) => {
      text(ctx, label, bx + 20, y, { font: BOLD(15) });
      if (frac != null) bar(ctx, bx + 210, y - 13, 220, 16, Math.min(frac, Math.max(0, (t - 0.3) * 1.2)), color);
      text(ctx, value, bx + bw - 20, y, { align: 'right', font: BOLD(15), color: PALETTE.sun });
      y += 32;
    };
    row(`${HEROES[p.hero].name}'s health left`, hp, PALETTE.heal, hp == null ? '—' : `${Math.round(hp * 100)}%`);
    row(`${room.minigame} score`, score, PALETTE.sky, score == null ? '—' : `${Math.round(score * 100)}%`);
    const bits = [];
    if (a.timeSec != null) bits.push(`Time ${Math.floor(a.timeSec / 60)}:${String(Math.round(a.timeSec % 60)).padStart(2, '0')}`);
    if (a.enemiesDefeated != null) bits.push(`${a.enemiesDefeated} enemies defeated`);
    if ((s.rooms[p.roomId]?.attempts ?? 0) > 1) bits.push(`${s.rooms[p.roomId].attempts} tries`);
    text(ctx, bits.join('  ·  ') || 'Stars come from health left (40%) and minigame score (60%).', bx + 20, y, { font: FONT.small, color: 'rgba(255,246,229,0.75)' });
    y += 30;
    ctx.fillStyle = 'rgba(255,246,229,0.15)'; ctx.fillRect(bx + 16, y - 20, bw - 32, 1);
    const shown = Math.round(this.pp * Math.min(1, Math.max(0, (t - 1.6) / 0.5)));
    text(ctx, 'Party Points earned', bx + 20, y + 4, { font: BOLD(16), color: PALETTE.mint });
    text(ctx, `+${shown} PP`, bx + bw - 20, y + 4, { align: 'right', font: BOLD(20), color: PALETTE.mint });
    text(ctx, this.pp ? 'Spend them on Party Touches back at the house.' : 'No new stars this time, so no new points.', bx + 210, y + 4, { font: FONT.small, color: 'rgba(255,246,229,0.6)', maxWidth: 200 });

    // new skills reveal
    if (p.newSkills.length) {
      const ra = Math.min(1, Math.max(0, (t - REVEAL_T) * 3));
      text(ctx, p.newSkills.length > 1 ? 'New skills learned!' : 'New skill learned!', 600, 377, { align: 'center', font: BOLD(16), color: PALETTE.sun, alpha: ra });
      p.newSkills.forEach((id, i) => {
        const c = this.skillCard(i), sk = SKILLS[id];
        const k = Math.min(1, Math.max(0, (t - REVEAL_T - i * 0.15) * 3));
        if (k <= 0) return;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(0.7 + 0.3 * easeOutBack(k), 0.7 + 0.3 * easeOutBack(k)); ctx.translate(-c.x - c.w / 2, -c.y - c.h / 2);
        panel(ctx, c.x, c.y, c.w, c.h, { style: 'mint', radius: 12 });
        const bob = Math.sin(t * 3 + i) * 2;
        skillIcon(ctx, id, c.x + 40, c.y + c.h / 2 + bob, 50);
        text(ctx, sk.name, c.x + 76, c.y + 28, { font: BOLD(17), color: PALETTE.paper });
        chip(ctx, HEROES[sk.hero].name, c.x + c.w - 12, c.y + 20, { align: 'right', fill: sk.hero === 'aaron' ? PALETTE.sun : PALETTE.denim, color: sk.hero === 'aaron' ? PALETTE.ink : PALETTE.paper });
        wrapText(ctx, sk.desc, c.w - 92, FONT.small).slice(0, 2).forEach((l, j) => text(ctx, l, c.x + 76, c.y + 48 + j * 15, { font: FONT.small, color: 'rgba(232,255,240,0.9)' }));
        ctx.restore();
      });
    } else if (t > REVEAL_T) {
      text(ctx, 'Every skill from this room is already yours.', 600, 410, { align: 'center', font: FONT.small, color: 'rgba(255,246,229,0.6)' });
    }

    this.sparks.render(ctx);
    if (t >= REVEAL_T) {
      button(ctx, g, 'Continue', CONT.x, CONT.y, CONT.w, CONT.h, { primary: true, hotkey: 'Enter', sub: p.roomId === 'pond' ? 'on to the party!' : 'back to the house' });
    } else {
      text(ctx, 'Enter to skip', CONT.x + CONT.w / 2, CONT.y + 30, { align: 'center', font: FONT.small, color: 'rgba(255,246,229,0.5)' });
    }
  }
}

function m(inp) { return inp.mouse.pressed; }
function easeOutBack(k) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
