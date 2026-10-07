// Shared minigame helpers. Owned by: games-a (edit); any minigame team may IMPORT read-only.
// Pure drawing/util helpers; no scene switching except finishMinigame via Outro.
// CONTRACT — these signatures stay stable (additions only):
//   math:     TAU, clamp(v,a,b), lerp(a,b,t), ease(t), easeInOut(t), BOLD(px), MONO(px), rr(ctx,x,y,w,h,r)
//   params:   normParams(p) -> {...p, hero, attempt:number, perks:string[]}, timeMul(p) (1.2 w/ 'playlist'),
//             ease_level(p) (0|1|2 by attempt)
//   voice:    setBark(fn), line(roomId, event, hero)   events: start|good|great|bad|win|lose (+ story ids; combo|twist|close map to minigameCombo/Twist/Close),
//             ppLine(seed?, roomId?, event?='sabotage'), drawTerminal(ctx, str, t, dur, {y,w,banner,bannerY,bannerAt})
//   bust:     new Cheer(game, p, {x,y,h,side}) .react(mood 'cheer'|'oops'|'idle', event?, force?) .say(str,dur) .update(dt) .render(ctx)
//   end card: new Outro(game, p, {y?=250}) .start(success, score0to1, headline, sub?) .update(dt) .render(ctx) .active
//             (calls finishMinigame after 3.2s or click/Enter)
//   tutorial: drawHand(ctx,x,y,press0to1,{alpha}), drawHighlight(ctx,x,y,w,h,t,color?), drawArrow(ctx,ax,ay,bx,by,t,color?,bend?),
//             prompt(ctx,str,y?,{font,x,alpha,fill,stroke,color,bob})
//   scenery:  titleTag(ctx,roomId), timeBar(ctx,frac,x?,y?,w?,h?), drawBackdrop(ctx,roomId,t,{floorY,wallTop,wallBot,lampX}),
//             vignette(ctx), star(ctx,x,y,r,rot?)
//   color:    mix(hexA,hexB,k) -> 'rgb()', mixRgbStops(hexStops[],k) -> 'rgb()'
//   re-exports: playSfx, PALETTE, FONT, ROOMS
import { PALETTE, FONT, ROOMS, HEROES } from '../../core/theme.js';
import { finishMinigame } from '../../core/flow.js';
import { text, panel, chip } from '../../ui/widgets.js';
import { playSfx } from '../../audio/sfx.js';
import { bark, logLine } from '../../story/lines.js';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeInOut = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const BOLD = (px) => `bold ${px}px "Trebuchet MS", system-ui, sans-serif`;
export const MONO = (px) => `${px}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}

/** Normalizes MinigameParams so every game can rely on the shape (deep links pass strings). */
export function normParams(p = {}) {
  let perks = p.perks ?? [];
  if (typeof perks === 'string') perks = perks.split(',').filter(Boolean);
  const hero = HEROES[p.hero] ? p.hero : 'aaron';
  return { ...p, roomId: p.roomId, hero, attempt: Math.max(1, Number(p.attempt) || 1), perks };
}
/** 'playlist' perk = +20% time. */
export const timeMul = (p) => (p.perks.includes('playlist') ? 1.2 : 1);
/** 0 on first try, 1 on second, 2 max after that — use to soften difficulty. */
export const ease_level = (p) => Math.min(2, p.attempt - 1);

// ---------------------------------------------------------------- reaction lines
// Story owns all dialogue: src/story/lines.js bark(roomId, event, { hero }) -> { who, text } | null.
// Our short in-game events map onto story's minigame events; story event ids ('hit', ...) pass through.
// good/great/bad fall back to tiny UI-level exclamations (not story dialogue).
let barkFn = bark;
export function setBark(fn) { barkFn = typeof fn === 'function' ? fn : bark; }
const STORY_EVENT = { start: 'minigame', win: 'minigameWin', lose: 'minigameFail', combo: 'minigameCombo', twist: 'minigameTwist', close: 'minigameClose' };
const STORY_EVENTS = new Set(['start', 'boss', 'lowhp', 'hit', 'win', 'lose', 'minigame', 'minigameWin', 'minigameFail', 'sabotage', 'minigameCombo', 'minigameTwist', 'minigameClose']);
const FALLBACK = { start: 'Here we go!', good: 'Nice!', great: 'Yes!', bad: 'Oops!', win: 'We did it!', lose: 'One more try.', combo: 'Combo!', twist: 'Whoa!', close: 'Hurry!' };
export function line(roomId, event, hero) {
  const ev = STORY_EVENT[event] ?? (STORY_EVENTS.has(event) ? event : null);
  if (ev && barkFn) {
    try { const s = barkFn(roomId, ev, { hero }); if (s) return typeof s === 'string' ? s : s.text ?? null; } catch { /* ignore */ }
  }
  return FALLBACK[event] ?? null;
}
/** A PartyPlanner terminal line with the '> ' prompt: the room's story 'sabotage' line if roomId is given, else a log line. */
export function ppLine(seed, roomId, event = 'sabotage') {
  try {
    if (roomId) { const b = bark(roomId, event, { seed }); if (b?.text) return b.text.startsWith('>') ? b.text : `> ${b.text}`; }
    return `> ${logLine(seed)}`;
  } catch { return '> optimizing...'; }
}

/**
 * PartyPlanner terminal popup (glitch flash + typed monospace line). t = seconds since it appeared, dur = total.
 * o: { y?=150, w?=520, banner?: string (UI note under it, e.g. 'PartyPlanner swapped two drinks!'), bannerY?, bannerAt?=1.5 }
 */
export function drawTerminal(ctx, str, t, dur, o = {}) {
  const a = clamp(t < 0.25 ? t / 0.25 : t > dur - 0.3 ? (dur - t) / 0.3 : 1, 0, 1);
  if (t < 0.35) {
    ctx.save(); ctx.globalAlpha = (0.35 - t) * 1.2;
    for (let y = 0; y < 540; y += 6) { ctx.fillStyle = y % 12 ? 'rgba(127,216,166,0.25)' : 'rgba(255,93,93,0.18)'; ctx.fillRect(Math.sin(y + t * 90) * 12, y, 960, 3); }
    ctx.restore();
  }
  ctx.save(); ctx.globalAlpha = a;
  const w = o.w ?? 520, x = 480 - w / 2, y = (o.y ?? 150) - (1 - ease(t / 0.3)) * 30;
  ctx.fillStyle = 'rgba(8,12,10,0.94)'; rr(ctx, x, y, w, 64, 10); ctx.fill();
  ctx.strokeStyle = '#7fd8a6'; ctx.lineWidth = 2; rr(ctx, x, y, w, 64, 10); ctx.stroke();
  ctx.fillStyle = '#7fd8a6'; ctx.font = MONO(12); ctx.textBaseline = 'middle';
  ctx.fillText('PartyPlanner.exe', x + 12, y + 14);
  const n = Math.floor(clamp((t - 0.2) * 40, 0, str.length));
  ctx.font = MONO(15); ctx.fillStyle = '#c9ffe0';
  ctx.fillText(str.slice(0, n) + (Math.floor(t * 3) % 2 ? '_' : ' '), x + 12, y + 40, w - 24);
  ctx.restore();
  const at = o.bannerAt ?? 1.5;
  if (o.banner && t > at) prompt(ctx, o.banner, o.bannerY ?? 446, { alpha: clamp((t - at) * 4, 0, 1) * a, fill: '#e8fff1', stroke: '#3fa874' });
}

// ---------------------------------------------------------------- hero cheer bust
/** A corner bust that bounces/cheers/winces, with a speech bubble. */
export class Cheer {
  constructor(game, p, o = {}) {
    this.game = game; this.p = p; this.hero = p.hero;
    this.x = o.x ?? 860; this.y = o.y ?? 540; this.h = o.h ?? 170; this.side = o.side ?? 'right';
    this.mood = 'idle'; this.moodT = 0; this.bubble = null; this.bubbleT = 0; this.t = 0; this.cool = 0;
  }
  /** mood: 'cheer' | 'oops' | 'idle'. event: bark event id (optional speech bubble). */
  react(mood, event, force = false) {
    this.mood = mood; this.moodT = 0.9;
    if (event && (force || this.cool <= 0)) {
      const s = line(this.p.roomId, event, this.hero);
      if (s) { this.bubble = s; this.bubbleT = 2.2; this.cool = 3; }
    }
  }
  say(str, dur = 2.2) { this.bubble = str; this.bubbleT = dur; }
  update(dt) {
    this.t += dt; this.moodT -= dt; this.bubbleT -= dt; this.cool -= dt;
    if (this.moodT <= 0) this.mood = 'idle';
  }
  render(ctx) {
    const img = this.game.assets.image(`bust.${this.hero}.smile`);
    const t = this.t, h = this.h;
    let dy = Math.sin(t * 2) * 2, dx = 0, rot = 0, sc = 1;
    if (this.mood === 'cheer') { const k = this.moodT / 0.9; dy -= Math.abs(Math.sin(t * 14)) * 14 * k; sc = 1 + 0.05 * k; }
    if (this.mood === 'oops') { const k = this.moodT / 0.9; dx = Math.sin(t * 40) * 5 * k; rot = -0.06 * k; }
    ctx.save();
    ctx.translate(this.x + dx, this.y + dy); ctx.rotate(rot); ctx.scale(sc, sc);
    // warm glow behind
    const gl = ctx.createRadialGradient(0, -h * 0.55, 10, 0, -h * 0.55, h * 0.75);
    gl.addColorStop(0, 'rgba(255,201,74,0.35)'); gl.addColorStop(1, 'rgba(255,201,74,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -h * 0.55, h * 0.75, 0, TAU); ctx.fill();
    if (img) {
      const w = h * img.width / img.height;
      ctx.drawImage(img, -w / 2, -h, w, h);
    } else {
      ctx.fillStyle = HEROES[this.hero]?.look.hair ?? PALETTE.sun;
      ctx.beginPath(); ctx.arc(0, -h * 0.55, h * 0.32, 0, TAU); ctx.fill();
      text(ctx, HEROES[this.hero]?.name ?? '', 0, -h * 0.5, { align: 'center', font: BOLD(16) });
    }
    if (this.mood === 'cheer') {
      ctx.fillStyle = PALETTE.sun;
      for (let i = 0; i < 3; i++) star(ctx, Math.cos(t * 3 + i * 2.1) * h * 0.45, -h * 0.9 + Math.sin(t * 4 + i) * 10, 7, t * 3 + i);
    }
    ctx.restore();
    if (this.bubble && this.bubbleT > 0) {
      const a = clamp(this.bubbleT / 0.3, 0, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.font = BOLD(15);
      const w = Math.min(300, ctx.measureText(this.bubble).width + 26), bh = 34;
      const bx = clamp(this.side === 'right' ? this.x - w + 30 : this.x - 30, 8, 952 - w), by = this.y - h - bh - 8;
      ctx.fillStyle = PALETTE.paper; rr(ctx, bx, by, w, bh, 14); ctx.fill();
      ctx.beginPath(); ctx.moveTo(this.x - 6, by + bh - 1); ctx.lineTo(this.x + 6, by + bh - 1); ctx.lineTo(this.x, by + bh + 10); ctx.fill();
      ctx.strokeStyle = PALETTE.sunDeep; ctx.lineWidth = 2; rr(ctx, bx, by, w, bh, 14); ctx.stroke();
      text(ctx, this.bubble, bx + w / 2, by + bh / 2 + 1, { align: 'center', baseline: 'middle', color: PALETTE.ink, font: BOLD(15), shadow: false, maxWidth: w - 16 });
      ctx.restore();
    }
  }
}

export function star(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath(); ctx.fill();
}

// ---------------------------------------------------------------- tutorial pointer
/** Cartoon pointing hand; tip at (x, y). press 0..1 squashes it + shows a click ring. */
export function drawHand(ctx, x, y, press = 0, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= o.alpha ?? 1;
  if (press > 0) {
    ctx.strokeStyle = `rgba(255,201,74,${0.9 * press})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 10 + (1 - press) * 18, 0, TAU); ctx.stroke();
  }
  ctx.rotate(-0.35);
  ctx.scale(1 - press * 0.08, 1 - press * 0.12);
  ctx.fillStyle = 'rgba(16,19,31,0.25)';
  ctx.beginPath(); ctx.ellipse(6, 30, 16, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath();
  // finger
  ctx.moveTo(-4, 2); ctx.quadraticCurveTo(-5, -2, 0, -2); ctx.quadraticCurveTo(5, -2, 4, 2);
  ctx.lineTo(4, 16);
  // knuckles
  ctx.quadraticCurveTo(8, 12, 11, 16); ctx.quadraticCurveTo(15, 14, 17, 19); ctx.quadraticCurveTo(21, 18, 22, 24);
  ctx.lineTo(21, 36); ctx.quadraticCurveTo(18, 46, 6, 46); ctx.lineTo(-2, 46);
  ctx.quadraticCurveTo(-12, 44, -14, 34); ctx.lineTo(-16, 24); ctx.quadraticCurveTo(-16, 19, -10, 21); ctx.lineTo(-4, 26);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PALETTE.denim; ctx.fillRect(-6, 44, 26, 7); ctx.strokeRect(-6, 44, 26, 7);
  ctx.restore();
}

/** Pulsing highlight ring around a target (tutorial). */
export function drawHighlight(ctx, x, y, w, h, t, color = PALETTE.sun) {
  const p = 0.5 + 0.5 * Math.sin(t * 6);
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 3 + p * 2; ctx.globalAlpha = 0.55 + p * 0.45;
  ctx.setLineDash([10, 6]); ctx.lineDashOffset = -t * 30;
  rr(ctx, x - 6 - p * 3, y - 6 - p * 3, w + 12 + p * 6, h + 12 + p * 6, 14); ctx.stroke();
  ctx.restore();
}

/** Curved arrow from a to b (tutorial). */
export function drawArrow(ctx, ax, ay, bx, by, t, color = PALETTE.sun, bend = -60) {
  const mx = (ax + bx) / 2, my = Math.min(ay, by) + bend;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 40;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
  ctx.setLineDash([]);
  const ang = Math.atan2(by - my, bx - mx);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(bx + Math.cos(ang) * 6, by + Math.sin(ang) * 6);
  ctx.lineTo(bx + Math.cos(ang + 2.5) * 18, by + Math.sin(ang + 2.5) * 18);
  ctx.lineTo(bx + Math.cos(ang - 2.5) * 18, by + Math.sin(ang - 2.5) * 18); ctx.fill();
  ctx.restore();
}

/** One short instruction pill, top-center. */
export function prompt(ctx, str, y = 42, o = {}) {
  if (!str) return;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  const font = o.font ?? BOLD(20);
  ctx.font = font;
  const w = ctx.measureText(str).width + 44, h = 40, x = (o.x ?? 480) - w / 2;
  const bob = o.bob === false ? 0 : Math.sin(performance.now() / 300) * 2;
  ctx.fillStyle = 'rgba(16,19,31,0.35)'; rr(ctx, x + 2, y - h / 2 + 4 + bob, w, h, 20); ctx.fill();
  ctx.fillStyle = o.fill ?? PALETTE.paper; rr(ctx, x, y - h / 2 + bob, w, h, 20); ctx.fill();
  ctx.strokeStyle = o.stroke ?? PALETTE.sunDeep; ctx.lineWidth = 3; rr(ctx, x, y - h / 2 + bob, w, h, 20); ctx.stroke();
  text(ctx, str, 480 + ((o.x ?? 480) - 480), y + 1 + bob, { align: 'center', baseline: 'middle', font, color: o.color ?? PALETTE.ink, shadow: false });
  ctx.restore();
}

/** Title tag top-left: "Dining Room · Pour the Drinks". */
export function titleTag(ctx, roomId) {
  const r = ROOMS[roomId];
  if (!r) return;
  chip(ctx, `${r.name}  ·  ${r.minigame}`, 14, 22, { fill: r.accent, color: PALETTE.ink, font: BOLD(13) });
}

/** Round time bar (top). frac 0..1 remaining. */
export function timeBar(ctx, frac, x = 330, y = 76, w = 300, h = 12) {
  const f = clamp(frac, 0, 1);
  const col = f > 0.35 ? PALETTE.mint : f > 0.15 ? PALETTE.sun : PALETTE.danger;
  ctx.save();
  ctx.fillStyle = 'rgba(16,19,31,0.55)'; rr(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = col; rr(ctx, x, y, Math.max(h, w * f), h, h / 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x + 6, y + 2, Math.max(0, w * f - 12), 2);
  // tiny clock
  ctx.fillStyle = PALETTE.paper; ctx.beginPath(); ctx.arc(x - 12, y + h / 2, 9, 0, TAU); ctx.fill();
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(x - 12, y + h / 2); ctx.lineTo(x - 12, y + h / 2 - 6); ctx.moveTo(x - 12, y + h / 2); ctx.lineTo(x - 8, y + h / 2 + 2); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- end-of-game overlay
/**
 * Finishing card. Call outro.start(success, score, headline) once; update/render each frame.
 * After a short beat (or click/Enter after 0.8s) it calls finishMinigame.
 */
export class Outro {
  constructor(game, p, o = {}) { this.game = game; this.p = p; this.y = o.y ?? 250; this.active = false; this.t = 0; this.sent = false; }
  start(success, score, headline, sub) {
    if (this.active) return;
    this.active = true; this.t = 0; this.success = success; this.score = clamp(score, 0, 1);
    this.headline = headline; this.sub = sub ?? null;
    playSfx(success ? 'victory' : 'defeat');
  }
  get stars() { return this.score >= 0.8 ? 3 : this.score >= 0.5 ? 2 : 1; }
  update(dt) {
    if (!this.active || this.sent) return;
    this.t += dt;
    const inp = this.game.input;
    if (this.t > 3.2 || (this.t > 0.9 && (inp.mouse.pressed || inp.pressed('confirm')))) {
      this.sent = true;
      finishMinigame(this.game, { roomId: this.p.roomId, success: this.success, score: this.success ? this.score : Math.min(this.score, 0.3), attempt: this.p.attempt });
    }
  }
  render(ctx) {
    if (!this.active) return;
    const a = ease(this.t / 0.35);
    ctx.save();
    ctx.fillStyle = `rgba(16,19,31,${0.45 * a})`; ctx.fillRect(0, 0, 960, 540);
    const s = 0.7 + 0.3 * a;
    ctx.translate(480, this.y); ctx.scale(s, s); ctx.globalAlpha = a;
    panel(ctx, -210, -90, 420, 180, { style: this.success ? 'dark' : 'ice', radius: 22 });
    text(ctx, this.headline, 0, -40, { align: 'center', baseline: 'middle', font: BOLD(34), color: this.success ? PALETTE.sun : PALETTE.frost });
    if (this.success) {
      for (let i = 0; i < 3; i++) {
        const on = i < this.stars, pop = ease((this.t - 0.3 - i * 0.18) / 0.25);
        ctx.save(); ctx.translate(-60 + i * 60, 18); ctx.scale(0.4 + 0.6 * pop, 0.4 + 0.6 * pop);
        ctx.fillStyle = on ? PALETTE.sun : 'rgba(255,246,229,0.18)'; star(ctx, 0, 0, 22);
        if (on) { ctx.strokeStyle = PALETTE.sunDeep; ctx.lineWidth = 2; ctx.stroke(); }
        ctx.restore();
      }
    }
    if (this.sub) text(ctx, this.sub, 0, this.success ? 52 : 20, { align: 'center', baseline: 'middle', font: FONT.ui, color: PALETTE.paper });
    if (this.t > 0.9) text(ctx, 'click to continue', 0, 76, { align: 'center', baseline: 'middle', font: FONT.small, color: 'rgba(255,246,229,0.6)', shadow: false });
    ctx.restore();
  }
}

// ---------------------------------------------------------------- shared backdrop
/** Cozy room interior: wallpaper with a soft pattern, wainscot, wood floor; tinted by the room accent. */
export function drawBackdrop(ctx, roomId, t = 0, o = {}) {
  const acc = ROOMS[roomId]?.accent ?? PALETTE.sun;
  const floorY = o.floorY ?? 380;
  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, o.wallTop ?? '#3b2f45'); g.addColorStop(1, o.wallBot ?? '#5a4152');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 960, floorY);
  // wallpaper dots in accent
  ctx.save(); ctx.globalAlpha = 0.09; ctx.fillStyle = acc;
  for (let y = 20; y < floorY - 40; y += 36) for (let x = (y / 36) % 2 ? 18 : 0; x < 960; x += 36) { ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
  ctx.restore();
  // wainscot
  ctx.fillStyle = 'rgba(255,246,229,0.08)'; ctx.fillRect(0, floorY - 46, 960, 46);
  ctx.fillStyle = 'rgba(16,19,31,0.25)'; ctx.fillRect(0, floorY - 48, 960, 3);
  // floor boards
  const fg = ctx.createLinearGradient(0, floorY, 0, 540);
  fg.addColorStop(0, '#8a5a3a'); fg.addColorStop(1, '#5e3b26');
  ctx.fillStyle = fg; ctx.fillRect(0, floorY, 960, 540 - floorY);
  ctx.strokeStyle = 'rgba(40,22,12,0.35)'; ctx.lineWidth = 1.5;
  for (let y = floorY + 22, row = 0; y < 540; y += 26, row++) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke();
    for (let x = (row * 97) % 180; x < 960; x += 180) { ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x, y); ctx.stroke(); }
  }
  // warm lamp glow
  const lg = ctx.createRadialGradient(o.lampX ?? 120, 60, 10, o.lampX ?? 120, 60, 360);
  lg.addColorStop(0, 'rgba(255,201,74,0.22)'); lg.addColorStop(1, 'rgba(255,201,74,0)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, 960, 540);
}

/** Soft vignette over everything. */
export function vignette(ctx) {
  const g = ctx.createRadialGradient(480, 270, 260, 480, 270, 620);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,8,16,0.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
}

/** Hex color helpers. */
export function mix(a, b, k) {
  const p = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * clamp(k, 0, 1))).join(',')})`;
}
export function mixRgbStops(stops, k) {
  k = clamp(k, 0, 1) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(k));
  return mix(stops[i], stops[i + 1], k - i);
}

export { playSfx, PALETTE, FONT, ROOMS };
