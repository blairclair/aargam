// Cutscene player. Owned by: story team. Script lives in ./lines.js (docs/STORY.md).
// params: { id: 'opening' | '<roomId>.intro' | '<roomId>.outro' | 'midgame' | 'prefinale' | 'party', next: {scene, params}, partyScore? }
// Staging: room backdrop, big photo busts sliding in from the sides (Aaron left, Victoria right),
// expressions by animation only (bounce/shake/lean/nod/surprise/sweat/sparkle), PartyPlanner in a
// terminal box with a blinking cursor, goal banner on intros, new-skill card on outros, end card on 'party'.
// Click / Enter / Space advances (first finishes the typewriter). Esc / Backspace skips. Unknown ids fall through.
import { PALETTE, FONT, ROOMS, SKILLS, HEROES } from '../core/theme.js';
import * as Sprites from '../art/sprites.js';
import { panel, text, wrapText, chip, keycap } from '../ui/widgets.js';
import { playSfx, playMusic } from '../audio/sfx.js';
import { getCutscene, partyVariant } from './lines.js';
import { drawBackdrop, partyLights, glow } from './backdrops.js';

const TAU = Math.PI * 2;
const BODY = '20px "Trebuchet MS", system-ui, sans-serif';
const NARR = 'italic 20px "Trebuchet MS", system-ui, sans-serif';
const MONO = '18px Menlo, Consolas, "Courier New", monospace';
const HERO_COL = { aaron: PALETTE.sun, victoria: PALETTE.mint };
// Bust framing: draw height chosen so both faces read at the same size; top edge fixed.
const BUSTS = {
  'bust.aaron.smile': { h: 360 },
  'bust.victoria.smile': { h: 360 },
  'bust.victoria.neutral': { h: 410 },
};
const BUST_TOP = 72;
const SIDE = { aaron: { x: 200, dir: -1 }, victoria: { x: 760, dir: 1 } };
const BOX = { x: 36, y: 392, w: 888, h: 132 };

const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
const decay = (t, d) => Math.max(0, 1 - t / d);
export function fmtHour(h) {
  const hh = ((Math.round(h) % 24) + 24) % 24;
  return `${hh % 12 || 12}:00 ${hh < 12 ? 'AM' : 'PM'}`;
}

export default class CutsceneScene {
  constructor(game) { this.game = game; }

  enter(params = {}) {
    this.p = params ?? {};
    this.id = String(this.p.id ?? '');
    this.data = getCutscene(this.id, this.p);
    this.exited = false;
    this.t = 0; this.shotT = 0; this.i = 0; this.chars = 0; this.blipN = 0;
    this.inputDelay = 0.3; this.flash = 0; this.shake = 0; this.glitch = 0;
    this.ending = false; this.endT = 0;
    this.wrapCache = null;
    if (!this.data || !this.data.shots?.length) { this.skipNow = true; return; }
    this.skipNow = false;
    const [room, kind] = this.id.split('.');
    this.room = ROOMS[room] ? room : null;
    this.kind = kind ?? this.id; // 'intro' | 'outro' | 'opening' | 'midgame' | 'prefinale' | 'party'
    this.isParty = this.id === 'party' || this.id.startsWith('party.');
    // cast: every hero who speaks, in fixed sides; stagger the slide-ins
    const heroes = ['aaron', 'victoria'].filter((h) => this.data.shots.some((s) => s.who === h));
    this.actors = heroes.map((h, k) => ({ hero: h, enter: -0.15 - k * 0.18, face: 'smile', prevFace: null, faceT: 1, expr: null, exprT: 0, talk: 0 }));
    try { playMusic(this.isParty ? 'party' : 'cutscene'); } catch { /* audio never blocks */ }
    this.startShot(0);
  }

  exit() { this.wrapCache = null; }

  get shot() { return this.data?.shots?.[this.i]; }

  startShot(i) {
    this.i = i; this.chars = 0; this.shotT = 0; this.blipN = 0; this.wrapCache = null;
    const s = this.shot; if (!s) return;
    if (s.sfx) playSfx(s.sfx);
    if (s.fx === 'spark') { this.flash = 1; this.shake = 0.6; }
    if (s.fx === 'glitch') { this.glitch = 0.9; this.shake = 0.25; }
    for (const a of this.actors) {
      if (a.hero !== s.who) continue;
      a.expr = s.expr ?? null; a.exprT = 0;
      const face = a.hero === 'victoria' && s.face === 'neutral' ? 'neutral' : 'smile';
      if (face !== a.face) { a.prevFace = a.face; a.face = face; a.faceT = 0; }
    }
  }

  done() {
    if (this.exited) return;
    this.exited = true;
    const n = this.p?.next ?? { scene: 'hub' };
    this.game.switchScene(n.scene ?? 'hub', n.params ?? {});
  }

  advance() {
    if (this.i + 1 < this.data.shots.length) { this.startShot(this.i + 1); playSfx('click'); return; }
    if (this.isParty && !this.ending) { this.ending = true; this.endT = 0; playSfx('victory'); return; }
    this.done();
  }

  update(dt) {
    if (this.exited) return;
    if (this.skipNow) { this.done(); return; }
    const g = this.game, inp = g.input;
    this.t += dt; this.shotT += dt;
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.shake = Math.max(0, this.shake - dt);
    this.glitch = Math.max(0, this.glitch - dt);
    for (const a of this.actors) {
      a.enter = Math.min(1, a.enter + dt * 2.4);
      a.exprT += dt; a.faceT = Math.min(1, a.faceT + dt * 5);
      const speaking = this.shot?.who === a.hero && !this.ending;
      a.talk += ((speaking ? 1 : 0) - a.talk) * Math.min(1, dt * 8);
    }
    if (this.ending) {
      this.endT += dt;
      if (this.endT > 0.8 && (inp.pressed('confirm') || inp.mouse.pressed || inp.pressed('back'))) this.done();
      return;
    }
    const s = this.shot;
    const full = String(s.text).length;
    const pp = s.who === 'partyplanner';
    const before = Math.floor(this.chars);
    this.chars = Math.min(full, this.chars + dt * (pp ? 62 : 46));
    if (Math.floor(this.chars) > before && ++this.blipN % (pp ? 2 : 3) === 0) playSfx(pp ? 'type' : 'blip', { who: s.who });
    if (this.inputDelay > 0) { this.inputDelay -= dt; return; }
    if (inp.pressed('back')) {
      if (this.isParty && !this.ending) { this.ending = true; this.endT = 0; return; }
      this.done(); return;
    }
    if (inp.pressed('confirm') || inp.mouse.pressed) {
      if (this.chars < full) this.chars = full;
      else this.advance();
    }
  }

  // ------------------------------------------------------------------ render
  render(ctx) {
    const g = this.game, W = g.width, H = g.height;
    if (this.skipNow || !this.data) { ctx.fillStyle = PALETTE.night; ctx.fillRect(0, 0, W, H); return; }
    ctx.save();
    const sh = this.shake > 0 ? this.shake * 10 : 0;
    if (sh) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    drawBackdrop(ctx, g, this.data.bg, this.t, W, H, { weird: this.kind === 'intro' ? 1 : this.kind === 'outro' ? 0.1 : 0.6 });
    if (this.shot?.fx === 'lights' || this.isParty) partyLights(ctx, -20, 18, W + 20, 18, this.t, 22);
    // soft floor shadow so busts sit in the scene
    const gr = ctx.createLinearGradient(0, H * 0.45, 0, H);
    gr.addColorStop(0, 'rgba(16,19,31,0)'); gr.addColorStop(1, 'rgba(16,19,31,0.55)');
    ctx.fillStyle = gr; ctx.fillRect(0, H * 0.45, W, H * 0.55);
    for (const a of this.actors) if (a.talk < 0.5) this.drawActor(ctx, a);
    for (const a of this.actors) if (a.talk >= 0.5) this.drawActor(ctx, a);
    ctx.restore();

    if (this.glitch > 0) this.drawGlitch(ctx, W, H);
    this.drawHeader(ctx, W);
    if (this.ending) { this.drawEndCard(ctx, W, H); return; }
    this.drawCard(ctx, W);
    this.drawBox(ctx, W, H);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,250,235,${this.flash * 0.85})`; ctx.fillRect(0, 0, W, H); }
  }

  drawActor(ctx, a) {
    if (typeof Sprites.drawBust === 'function') {
      // art's bust: expression = motion + overlays only; faces untouched
      const side = SIDE[a.hero];
      const active = a.talk > 0.5;
      const expr = active ? artExpr(a.hero, a.expr) : (a.face === 'neutral' ? 'neutral' : 'smile');
      try {
        Sprites.drawBust(ctx, this.game, a.hero, expr, side.x + (a.hero === 'aaron' ? 10 : -10), 474, 360, {
          t: this.t, exprT: a.exprT, talking: active && this.chars < String(this.shot?.text ?? '').length,
          dim: 1 - a.talk, enter: Math.max(0, a.enter), side: a.hero === 'aaron' ? 1 : -1,
          bust: a.hero === 'victoria' && a.face === 'neutral' ? 'neutral' : (a.hero === 'victoria' && a.forceSmile ? 'smile' : undefined),
          rim: active ? HERO_COL[a.hero] : undefined,
        });
        return;
      } catch { /* fall through to our own staging */ }
    }
    this.drawActorOwn(ctx, a);
  }

  drawActorOwn(ctx, a) {
    const g = this.game, side = SIDE[a.hero];
    const e = ease(a.enter);
    const t = a.exprT, talk = a.talk;
    let x = side.x + side.dir * (1 - e) * 460;
    let y = BUST_TOP + (1 - talk) * 22 + Math.sin(this.t * 1.6 + (a.hero === 'aaron' ? 0 : 2)) * 2.5; // breathing
    let rot = 0, scale = 0.94 + talk * 0.06;
    const inward = -side.dir; // toward screen center
    const active = talk > 0.5;
    if (active) {
      switch (a.expr) {
        case 'bounce': y -= Math.abs(Math.sin(t * 11)) * 20 * decay(t, 1.0); break;
        case 'shake': x += Math.sin(t * 55) * 9 * decay(t, 0.7); break;
        case 'lean': { const k = ease(t * 3); x += inward * 26 * k; rot = inward * 0.07 * k; y += 6 * k; break; }
        case 'nod': y += Math.max(0, Math.sin(t * 9)) * 10 * decay(t, 0.75); break;
        case 'surprise': y -= 26 * Math.sin(Math.min(1, t * 5) * Math.PI) * decay(t, 0.6); break;
        case 'sweat': y += 6 * ease(t * 3); break;
        case 'sparkle': y -= Math.abs(Math.sin(t * 8)) * 8 * decay(t, 0.8); break;
        default: break;
      }
    }
    ctx.save();
    ctx.globalAlpha = Math.min(1, e * 1.4);
    // draw current face (crossfade from previous on a face swap)
    const keys = [];
    if (a.prevFace && a.faceT < 1) keys.push([`bust.${a.hero}.${a.prevFace}`, 1 - a.faceT]);
    keys.push([`bust.${a.hero}.${a.face}`, a.prevFace && a.faceT < 1 ? a.faceT : 1]);
    let headX = x, headY = y + 120, bw = 300;
    for (const [key, alpha] of keys) {
      const img = g.assets?.image?.(key);
      const fr = BUSTS[key] ?? { h: 360 };
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.translate(x, y + fr.h * 0.95); ctx.rotate(rot); ctx.scale(scale, scale);
      if (img && img.width) {
        const h = fr.h, w = img.width * (h / img.height);
        ctx.drawImage(img, -w / 2, -h * 0.95, w, h);
        bw = w;
      } else {
        // fallback: round portrait (or a colored initial) if the cutout failed to load
        if (typeof Sprites.drawPortrait === 'function') Sprites.drawPortrait(ctx, g, a.hero, 0, -fr.h * 0.6, 110, { ring: HERO_COL[a.hero], ringWidth: 5 });
      }
      ctx.restore();
    }
    // overlays (drawn beside the head, never on the face)
    headX = x + inward * bw * 0.32; headY = y + 40;
    if (active) {
      if (a.expr === 'sweat') this.sweatDrop(ctx, x - inward * bw * 0.36, y + 70 + Math.min(1, t * 0.8) * 26, t);
      if (a.expr === 'sparkle') this.sparkles(ctx, x, y + 90, bw * 0.55, t);
      if (a.expr === 'surprise' && t < 1.4) this.bang(ctx, x - inward * bw * 0.42, y + 20 - ease(t * 4) * 16);
      if (a.expr === 'shake' && t < 1.0) this.shakeLines(ctx, x - inward * bw * 0.48, y + 60);
    }
    ctx.restore();
  }

  sweatDrop(ctx, x, y, t) {
    ctx.save();
    ctx.globalAlpha *= Math.min(1, t * 3);
    ctx.fillStyle = '#9fd8ff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.quadraticCurveTo(x + 13, y - 2, x, y + 6); ctx.quadraticCurveTo(x - 13, y - 2, x, y - 22); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(x - 3, y - 4, 2, 4, 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  }
  sparkles(ctx, x, y, r, t) {
    ctx.save();
    for (let k = 0; k < 6; k++) {
      const a = k * TAU / 6 + t * 0.8, rr = r * (0.9 + 0.12 * Math.sin(t * 3 + k));
      const s = 7 + 5 * Math.max(0, Math.sin(t * 5 + k * 1.7));
      star(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7, s, k % 2 ? PALETTE.sun : '#ffffff');
    }
    ctx.restore();
  }
  bang(ctx, x, y) {
    text(ctx, '!', x, y, { font: 'bold 54px "Trebuchet MS", sans-serif', color: PALETTE.sun, outline: PALETTE.ink, outlineWidth: 6, align: 'center' });
  }
  shakeLines(ctx, x, y) {
    ctx.save(); ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x - 12, y + k * 16); ctx.lineTo(x + 12, y + k * 14 - 6); ctx.stroke(); }
    ctx.restore();
  }

  drawGlitch(ctx, W, H) {
    const c = ctx.canvas; if (!c) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sx = c.width / W, sy = c.height / H;
    for (let k = 0; k < 6; k++) {
      const y = Math.random() * H, h = 4 + Math.random() * 18, dx = (Math.random() - 0.5) * 40 * this.glitch;
      try { ctx.drawImage(c, 0, y * sy, c.width, h * sy, dx * sx, y * sy, c.width, h * sy); } catch { /* ignore */ }
    }
    ctx.globalAlpha = 0.15 * this.glitch; ctx.fillStyle = PALETTE.mint; ctx.fillRect(0, (Math.random() * H) * sy, c.width, 3 * sy);
    ctx.restore();
  }

  drawHeader(ctx, W) {
    const s = this.game.state ?? {};
    const clock = Number.isFinite(s.clock) ? fmtHour(s.clock) : null;
    if (this.room) {
      const R = ROOMS[this.room];
      panel(ctx, W / 2 - 230, 10, 460, this.kind === 'intro' ? 62 : 40, { style: 'dark', radius: 14, stroke: R.accent, alpha: 0.92 });
      text(ctx, `${R.name.toUpperCase()}`, W / 2, 31, { align: 'center', baseline: 'middle', font: 'bold 17px "Trebuchet MS", sans-serif', color: lighten(R.accent, 0.35) });
      if (this.kind === 'intro') text(ctx, `GOAL: ${R.objective}  ·  then: ${R.minigame}`, W / 2, 55, { align: 'center', baseline: 'middle', font: 'bold 15px "Trebuchet MS", sans-serif', color: PALETTE.paper });
    }
    if (clock && !this.isParty && s.clock < 19) {
      chip(ctx, `${clock}  ·  party at 7 PM`, W - 16, 26, { align: 'right', fill: 'rgba(16,19,31,0.8)', color: PALETTE.sun });
    }
    // skip hint
    if (!this.ending) {
      ctx.save(); ctx.globalAlpha = 0.75;
      keycap(ctx, 'Esc', 34, 26, { small: true });
      text(ctx, 'skip', 50, 27, { baseline: 'middle', font: FONT.small, color: PALETTE.paper });
      ctx.restore();
    }
  }

  /** New-skill card (last shot of an outro) / ultimates card (last shot of prefinale). */
  drawCard(ctx, W) {
    const last = this.i === this.data.shots.length - 1;
    let items = null, title = '';
    if (last && this.kind === 'outro' && this.room) {
      items = Object.entries(ROOMS[this.room].skills ?? {}).map(([hero, id]) => ({ hero, sk: SKILLS[id] })).filter((x) => x.sk);
      title = 'NEW SKILLS';
    } else if (last && this.id === 'prefinale') {
      items = Object.values(SKILLS).filter((sk) => sk.slot === 'ultimate').map((sk) => ({ hero: sk.hero, sk }));
      title = 'ULTIMATES UNLOCKED  ·  press Space';
    }
    if (!items?.length) return;
    const k = ease(this.shotT * 3);
    const w = 400, h = 52 + items.length * 56, x = W / 2 - w / 2, y = 118 - (1 - k) * 30;
    ctx.save(); ctx.globalAlpha *= k;
    glow(ctx, W / 2, y + h / 2, 260, PALETTE.sun, 0.25);
    panel(ctx, x, y, w, h, { style: 'paper', radius: 16 });
    text(ctx, title, W / 2, y + 26, { align: 'center', baseline: 'middle', font: 'bold 18px "Trebuchet MS", sans-serif', color: PALETTE.sunDeep, shadow: false });
    items.forEach(({ hero, sk }, n) => {
      const iy = y + 58 + n * 56;
      if (typeof Sprites.drawSkillIcon === 'function') {
        try { Sprites.drawSkillIcon(ctx, sk.id, x + 40, iy + 16, 40, {}); } catch { this.iconFallback(ctx, x + 40, iy + 16, hero); }
      } else this.iconFallback(ctx, x + 40, iy + 16, hero);
      text(ctx, `${HEROES[hero]?.name ?? hero}: ${sk.name}`, x + 74, iy + 8, { baseline: 'middle', font: 'bold 17px "Trebuchet MS", sans-serif', color: PALETTE.choc, shadow: false });
      text(ctx, sk.desc, x + 74, iy + 29, { baseline: 'middle', font: '14px "Trebuchet MS", sans-serif', color: '#7a5a40', shadow: false, maxWidth: w - 90 });
    });
    ctx.restore();
  }
  iconFallback(ctx, x, y, hero) {
    ctx.save();
    ctx.fillStyle = HERO_COL[hero] ?? PALETTE.sun; ctx.beginPath(); ctx.arc(x, y, 18, 0, TAU); ctx.fill();
    star(ctx, x, y, 11, PALETTE.paper);
    ctx.restore();
  }

  drawBox(ctx, W, H) {
    const s = this.shot; if (!s) return;
    const who = s.who;
    const pp = who === 'partyplanner', narr = who === 'narrator' || !HEROES[who] && !pp;
    const full = String(s.text);
    const shown = Math.floor(this.chars);
    const done = this.chars >= full.length;
    const inK = ease(this.shotT * 6);
    const { x, y, w, h } = BOX;
    const font = pp ? MONO : narr ? NARR : BODY;
    if (!this.wrapCache) {
      const maxW = narr ? w - 160 : w - 80;
      // keep explicit \n breaks (PartyPlanner logs) and wrap within each
      this.wrapCache = full.split('\n').flatMap((p) => wrapText(ctx, p, maxW, font));
    }
    const lines = this.wrapCache;
    ctx.save();
    if (pp) {
      // terminal window
      const gl = Math.random() < 0.06 ? (Math.random() - 0.5) * 6 : 0;
      ctx.translate(gl, (1 - inK) * 16);
      ctx.fillStyle = 'rgba(8,10,18,0.5)'; rrect(ctx, x + 3, y + 5, w, h, 12); ctx.fill();
      ctx.fillStyle = '#0b1410'; rrect(ctx, x, y, w, h, 12); ctx.fill();
      ctx.strokeStyle = PALETTE.mint; ctx.lineWidth = 2; rrect(ctx, x, y, w, h, 12); ctx.stroke();
      ctx.fillStyle = '#16261d'; rrect(ctx, x + 2, y + 2, w - 4, 26, 10); ctx.fill();
      ['#ff5d5d', '#ffc94a', '#7fd8a6'].forEach((c, k) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 20 + k * 18, y + 15, 5, 0, TAU); ctx.fill(); });
      text(ctx, 'PartyPlanner.exe — live log', x + w / 2, y + 15, { align: 'center', baseline: 'middle', font: '13px Menlo, Consolas, monospace', color: 'rgba(127,216,166,0.8)', shadow: false });
      // scanlines
      ctx.fillStyle = 'rgba(127,216,166,0.04)'; for (let sy = y + 30; sy < y + h; sy += 4) ctx.fillRect(x + 2, sy, w - 4, 1);
      let left = shown, cx = x + 28, cy = y + 52;
      ctx.font = MONO;
      lines.forEach((ln, k) => {
        if (left < 0) return;
        const part = ln.slice(0, Math.max(0, left));
        left -= ln.length + 1;
        text(ctx, part, x + 28, y + 52 + k * 28, { font: MONO, color: k % 2 ? '#bff5d6' : PALETTE.mint, baseline: 'middle', shadow: false });
        cx = x + 28 + ctx.measureText(part).width; cy = y + 52 + k * 28;
      });
      if (Math.floor(this.t * 2.2) % 2 === 0 || !done) { ctx.fillStyle = PALETTE.mint; ctx.fillRect(cx + 3, cy - 10, 11, 20); }
      if (done) this.advanceHint(ctx, x + w - 30, y + h - 22, PALETTE.mint);
    } else if (narr) {
      const nx = x + 70, nw = w - 140;
      ctx.globalAlpha *= inK;
      panel(ctx, nx, y + 8, nw, h - 16, { style: 'paper', radius: 16 });
      let left = shown;
      const y0 = y + h / 2 - (lines.length - 1) * 14;
      lines.forEach((ln, k) => {
        const part = ln.slice(0, Math.max(0, left)); left -= ln.length + 1;
        ctx.save(); ctx.font = font; const fw = ctx.measureText(ln).width; ctx.restore();
        text(ctx, part, W / 2 - fw / 2, y0 + k * 28, { font, color: PALETTE.choc, baseline: 'middle', shadow: false });
      });
      if (done) this.advanceHint(ctx, nx + nw - 28, y + h - 30, PALETTE.sunDeep);
    } else {
      const col = HERO_COL[who] ?? PALETTE.sun;
      ctx.translate(0, (1 - inK) * 14);
      panel(ctx, x, y, w, h, { style: 'dark', radius: 16, stroke: col });
      // name plate on the speaker's side
      const name = HEROES[who]?.name ?? String(who);
      ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
      const nw = ctx.measureText(name).width + 30;
      const nx = who === 'victoria' ? x + w - nw - 26 : x + 26, ny = y - 16;
      ctx.fillStyle = col; rrect(ctx, nx, ny, nw, 30, 15); ctx.fill();
      ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 2; rrect(ctx, nx, ny, nw, 30, 15); ctx.stroke();
      text(ctx, name, nx + nw / 2, ny + 16, { align: 'center', baseline: 'middle', font: 'bold 18px "Trebuchet MS", sans-serif', color: PALETTE.ink, shadow: false });
      let left = shown;
      lines.slice(0, 3).forEach((ln, k) => {
        const part = ln.slice(0, Math.max(0, left)); left -= ln.length + 1;
        text(ctx, part, x + 34, y + 44 + k * 30, { font: BODY, color: PALETTE.paper, baseline: 'middle' });
      });
      if (done) this.advanceHint(ctx, x + w - 30, y + h - 22, col);
    }
    ctx.restore();
    // progress dots + "what's next" hint
    const n = this.data.shots.length;
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = k === this.i ? PALETTE.sun : 'rgba(255,246,229,0.35)';
      ctx.beginPath(); ctx.arc(W / 2 - (n - 1) * 7 + k * 14, H - 9, k === this.i ? 3.5 : 2.5, 0, TAU); ctx.fill();
    }
    if (this.i === n - 1 && done) {
      const nextLabel = this.nextLabel();
      if (nextLabel) chip(ctx, nextLabel, x + w - 46, y + h - 20, { align: 'right', fill: PALETTE.sun, color: PALETTE.ink, font: 'bold 13px "Trebuchet MS", sans-serif' });
    }
  }

  nextLabel() {
    const sc = this.p?.next?.scene;
    if (this.isParty) return 'Click to celebrate';
    if (sc === 'select') return 'Next: choose your hero ▸';
    if (sc === 'hub') return 'Next: back to the house map ▸';
    if (sc === 'cutscene') return 'Click to continue ▸';
    return 'Click to continue ▸';
  }

  advanceHint(ctx, x, y, col) {
    if (this.i === this.data.shots.length - 1) return; // the "Next: ..." chip replaces the arrow
    const b = Math.sin(this.t * 6) * 3;
    ctx.save(); ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - 8, y - 5 + b); ctx.lineTo(x + 8, y - 5 + b); ctx.lineTo(x, y + 4 + b); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  drawEndCard(ctx, W, H) {
    const k = ease(this.endT * 1.5);
    const s = this.game.state;
    const stars = s?.rooms ? Object.values(s.rooms).reduce((a, r) => a + (r.stars || 0), 0) : null;
    ctx.save();
    ctx.fillStyle = `rgba(16,19,31,${0.55 * k})`; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = k;
    const y = 150 - (1 - k) * 30;
    panel(ctx, W / 2 - 250, y, 500, 230, { style: 'paper', radius: 20 });
    text(ctx, 'Happy Housewarming!', W / 2, y + 58, { align: 'center', baseline: 'middle', font: 'bold 40px "Trebuchet MS", sans-serif', color: PALETTE.sunDeep, shadow: false });
    text(ctx, 'Aaron & Victoria — welcome home.', W / 2, y + 102, { align: 'center', baseline: 'middle', font: 'italic 21px "Trebuchet MS", sans-serif', color: PALETTE.choc, shadow: false });
    if (stars) text(ctx, `Party stars: ${stars} / 27   ·   ${partyLabel(this.p?.partyScore)}`, W / 2, y + 144, { align: 'center', baseline: 'middle', font: 'bold 17px "Trebuchet MS", sans-serif', color: '#7a5a40', shadow: false });
    text(ctx, 'Made with love. Thanks for playing.', W / 2, y + 178, { align: 'center', baseline: 'middle', font: '16px "Trebuchet MS", sans-serif', color: '#7a5a40', shadow: false });
    if (this.endT > 0.8) text(ctx, 'Click to return to the title', W / 2, y + 208, { align: 'center', baseline: 'middle', font: 'bold 14px "Trebuchet MS", sans-serif', color: PALETTE.sunDeep, shadow: false, alpha: 0.6 + 0.4 * Math.sin(this.t * 4) });
    for (let n = 0; n < 14; n++) {
      const a = n * TAU / 14 + this.t * 0.3;
      star(ctx, W / 2 + Math.cos(a) * 300, y + 115 + Math.sin(a) * 150, 6 + 4 * Math.max(0, Math.sin(this.t * 4 + n)), n % 2 ? PALETTE.sun : '#ff8fb1');
    }
    ctx.restore();
  }
}

/** Script expressions -> art's drawBust expressions. */
function artExpr(hero, e) {
  switch (e) {
    case 'bounce': case 'sparkle': return 'happy';
    case 'shake': return hero === 'victoria' ? 'annoyed' : 'surprised';
    case 'lean': return 'determined';
    case 'surprise': return 'surprised';
    case 'sweat': return 'sheepish';
    case 'nod': return 'smile';
    default: return 'smile';
  }
}

function lighten(hex, k) {
  const n = parseInt(String(hex).slice(1, 7), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k));
  return `rgb(${c.join(',')})`;
}

function partyLabel(score) {
  const v = partyVariant(score);
  return v === 'party.great' ? 'a perfect party' : v === 'party.good' ? 'a great party' : 'a cozy party';
}
function star(ctx, x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
