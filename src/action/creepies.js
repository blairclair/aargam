// Living room: creepy dolls & teddies. Owned by: action team.
// While the Roomba fight goes on, toys climb out of the furniture. Every one is put together at random
// (eyes, hair, patches, stitches, colors), and they get creepier the closer the Roomba is to dying:
//   tier 1 "a bit off"  — waddle toward you, head tilted, one odd eye. Giggle.
//   tier 2 "wrong"      — glowing eyes, stitched grins, stand still… then jerk forward. Heads track you.
//   tier 3 "nightmare"  — cracked and torn, hollow red-dot eyes. They FREEZE while you face them and rush
//                         you when you look away (some appear right behind you).
// The room also darkens and flickers with each tier. Stage hooks: creepyDirector (update), drawCreepyDark (overlay).
import { PALETTE } from '../core/theme.js';
import { dist, angleTo } from '../core/math.js';
import { playSfx } from '../audio/sfx.js';
import { isOpen } from './arena.js';
import { angDiff, hurtHero } from './combat.js';

const TAU = Math.PI * 2;
const R = Math.random;
const pick = (a) => a[Math.floor(R() * a.length)];
const rnd = (a, b) => a + R() * (b - a);

const TOY_DRAW = 1.4;

export const CREEPY_SHAPE = {
  creepy_doll: { r: 12, h: 58, mass: 0.9, color: '#efe2d0' },
  creepy_teddy: { r: 14, h: 58, mass: 1.2, color: '#a8784e' },
};

const DOLL_NAMES = ['Little Clara', 'Miss Penny', 'Baby Dot', 'Rosalind', 'Cousin Margaret', 'Lady Pearl', 'Tiny Edith', 'Winnifred', 'Polly', 'Agatha'];
const TEDDY_NAMES = ['Mr. Snuggles', 'Captain Cuddles', 'Barnaby', 'Fuzzbutton', 'Old Bruno', 'Wobbles', 'Sir Hugsalot', 'Biscuit', 'Professor Paws', 'Mumbles'];
const SPAWN_SAY = [
  (n) => `${n} wants to play`, (n) => `${n} is watching`, (n) => `${n} is behind you`,
];
const GIGGLE = [['hee hee', 'tee hee', 'play?', 'hi!'], ['play with me', 'stay...', "don't go", 'we see you'], ['DON\'T BLINK', 'behind you', 'forever', 'look at me']];
const LAST_WORDS = [['aww', 'boo...', 'no fair'], ['...ow', 'later', 'not done'], ['see you soon', 'we\'ll be back', 'tonight...']];

// ---------------------------------------------------------------- looks (all random, once per toy)
function dollLook(tier) {
  const eye = () => pick(tier === 1 ? ['button', 'dot', 'dot', 'glass'] : tier === 2 ? ['button', 'glass', 'x', 'glow'] : ['hollow', 'hollow', 'missing', 'x']);
  return {
    skin: pick(['#f6e4d4', '#efd9c4', '#f3e0e6', '#e8d6c0', '#f8efe6']),
    dress: pick(['#d9536f', '#5aa4e6', '#7fd8a6', '#c9a0dc', '#ffc94a', '#e98aa8', '#8a5a3a', '#4a4f63']),
    trim: pick(['#fff6e5', '#ffe9f0', '#f0f0ff']),
    hair: pick(['#f2d27a', '#7a4a2a', '#2b2b2b', '#c46a3a', '#e6e0d0']),
    style: Math.floor(R() * 4), // 0 pigtails · 1 bob · 2 long · 3 patchy
    eyeL: eye(), eyeR: R() < 0.55 ? 'same' : eye(),
    mouth: pick(tier === 1 ? ['smile', 'o', 'smile'] : tier === 2 ? ['stitch', 'grin', 'smile'] : ['jaw', 'grin', 'stitch']),
    tilt: rnd(-0.35, 0.35) * (tier === 1 ? 0.6 : 1),
    bow: R() < 0.6, bowCol: pick(['#d9536f', '#5aa4e6', '#fff6e5', '#ffc94a']),
    cheeks: R() < 0.7,
    cracks: tier === 3 ? 2 + Math.floor(R() * 3) : tier === 2 && R() < 0.4 ? 1 : 0,
    crackSeed: R() * 100,
  };
}
function teddyLook(tier) {
  const eye = () => pick(tier === 1 ? ['button', 'dot', 'button'] : tier === 2 ? ['button', 'glow', 'x', 'mismatch'] : ['hollow', 'missing', 'x', 'hollow']);
  const fur = pick(['#a8784e', '#c49a6c', '#8a6a5a', '#d8b2a0', '#9a9aa8', '#e0c49a', '#c48aa0']);
  return {
    fur, belly: pick(['#f0dcc0', '#f6e6d6', '#e8d0b8']),
    ear: R() < (tier === 1 ? 0.15 : 0.5) ? pick([-1, 1]) : 0, // which ear is torn off
    patch: R() < 0.7 ? { x: rnd(-6, 6), y: rnd(-18, -8), col: pick(['#5aa4e6', '#d9536f', '#7fd8a6', '#ffc94a', '#c9a0dc']) } : null,
    eyeL: eye(), eyeR: R() < 0.5 ? 'same' : eye(),
    mouth: pick(tier === 1 ? ['smile', 'stitch'] : tier === 2 ? ['stitch', 'grin'] : ['jaw', 'grin']),
    bowtie: R() < 0.5 ? pick(['#d9536f', '#5aa4e6', '#2b2b2b', '#7fd8a6']) : null,
    stuffing: tier === 3 ? 2 + Math.floor(R() * 3) : tier === 2 && R() < 0.5 ? 1 : 0,
    tilt: rnd(-0.3, 0.3) * (tier === 1 ? 0.6 : 1),
    seams: tier >= 2,
  };
}

// ---------------------------------------------------------------- setup + AI
function init(L, e) {
  e.tier ??= 1;
  e.look = e.type === 'creepy_teddy' ? teddyLook(e.tier) : dollLook(e.tier);
  e.toyName ??= pick(e.type === 'creepy_teddy' ? TEDDY_NAMES : DOLL_NAMES);
  e.state = 'sit'; e.st = e.tier === 3 ? 0.2 : rnd(0.8, 1.6); // sits still a moment before it "wakes"
  e.giggleT = rnd(3, 7);
  e.noDrops = true;
  e.onDeath = (LL, me) => {
    LL.fx.burst(me.x, me.y - 20, me.type === 'creepy_teddy' ? '#f6efe6' : '#f8efe6', 10, 160);
    LL.fx.floatText(me.x, me.y - me.h - 14, pick(LAST_WORDS[me.tier - 1]), 'rgba(255,246,229,0.75)');
  };
}
export const CREEPY_INIT = { creepy_doll: init, creepy_teddy: init };

/** A stand-alone random toy for drawing outside the fight (Bunny Roundup uses these). */
export function makeToy(type, tier = 3) {
  const e = { type, tier, seed: Math.floor(R() * 1000), facing: 0, state: 'move', anim: 'idle', h: 58 };
  init(null, e);
  e.state = 'move';
  return e;
}

/** Is the hero facing this toy (and close enough to see it)? */
function watched(L, e) {
  const h = L.hero;
  return dist(h.x, h.y, e.x, e.y) < 560 && angDiff(angleTo(h.x, h.y, e.x, e.y), h.facing) < 0.8;
}

function toward(e, tx, ty, sp, dt) {
  const a = angleTo(e.x, e.y, tx, ty);
  e.x += Math.cos(a) * sp * dt; e.y += Math.sin(a) * sp * dt;
  e.facing = a;
}

function touch(L, e, mul = 1) {
  const h = L.hero;
  if (e.contactCd > 0 || dist(e.x, e.y, h.x, h.y) > e.r + h.r + 6) return;
  hurtHero(L, e.damage * mul, e.x, e.y, { knock: 190, kind: 'melee', src: e });
  e.contactCd = 1;
}

function creepyAI(L, e, dt, sp) {
  const h = L.hero;
  e.st -= dt;
  e.giggleT -= dt;
  if (e.giggleT <= 0) {
    e.giggleT = rnd(4, 8) / e.tier;
    L.fx.floatText(e.x, e.y - e.h - 16, pick(GIGGLE[e.tier - 1]), e.tier === 3 ? '#ff7a6b' : 'rgba(255,246,229,0.7)');
  }
  if (e.state === 'sit') { // slumped and still... then the head snaps up
    e.anim = 'idle'; e.facing = angleTo(e.x, e.y, h.x, h.y);
    if (e.st <= 0) { e.state = 'move'; e.st = 0; if (e.tier >= 2) playSfx('stitch'); }
    return;
  }
  if (e.tier === 1) { // waddle, with the odd pause to stare
    if (e.st <= 0) { e.paused = !e.paused && R() < 0.35; e.st = e.paused ? rnd(0.5, 1) : rnd(1.2, 2.4); }
    e.anim = e.paused ? 'idle' : 'move';
    if (!e.paused) toward(e, h.x, h.y, sp, dt);
    else e.facing = angleTo(e.x, e.y, h.x, h.y);
    touch(L, e);
  } else if (e.tier === 2) { // perfectly still, then a sudden jerk forward
    if (e.st <= 0) { e.jerk = !e.jerk; e.st = e.jerk ? 0.2 : rnd(0.5, 1.1); if (e.jerk) e.jx = 0; }
    e.facing = angleTo(e.x, e.y, h.x, h.y);
    e.anim = e.jerk ? 'move' : 'idle';
    if (e.jerk) toward(e, h.x, h.y, sp * 3.6, dt);
    touch(L, e, 1.1);
  } else { // weeping-angel: frozen while watched, rushes when you look away
    const seen = watched(L, e);
    if (seen && !e.wasSeen) { e.freezeFlash = 0.25; playSfx('freeze'); }
    e.wasSeen = seen;
    e.freezeFlash = Math.max(0, (e.freezeFlash ?? 0) - dt);
    if (seen) { e.anim = 'idle'; return; } // not even its head moves
    e.anim = 'move';
    toward(e, h.x, h.y, sp * 2.3, dt);
    touch(L, e, 1.4);
  }
}
export const CREEPY_AI = { creepy_doll: creepyAI, creepy_teddy: creepyAI };

// ---------------------------------------------------------------- director (living stage update)
const TIER_AT = [0, 0.35, 0.7]; // boss progress where each tier starts
const NOOKS = [[320, 430], [980, 430], [1110, 230], [110, 250], [500, 210], [800, 210], [650, 690], [200, 640], [1100, 640]];
const LINES = {
  2: { aaron: 'That teddy blinked. Teddies do not blink.', victoria: 'Nobody look at the one with the stitched mouth.' },
  3: { aaron: 'I did not install a horror game. Who installed a horror game?', victoria: "Don't look away from them. I mean it." },
};
const FIRST = { aaron: 'Why are there dolls. We do not own dolls.', victoria: 'Those were NOT here this morning.' };

export function creepyDirector(L, dt) {
  const C = (L.creepy ??= { t: 0, tier: 0, spawnT: 4, dark: 0, flick: 0, done: false });
  C.t += dt;
  const boss = L.boss;
  const toys = L.enemies.filter((e) => !e.dead && e.toyName);
  if (!boss || boss.dead) {
    if (!C.done) { // the Roomba's gone: every toy goes limp
      C.done = true;
      for (const e of toys) { L.fx.burst(e.x, e.y - 20, '#f8efe6', 8, 120); e.counts = false; L.killEnemy(e); }
    }
    C.dark = Math.max(0, C.dark - dt * 0.6);
    return;
  }
  if (boss.spawning > 0) return;
  const prog = 1 - boss.hp / boss.maxHp;
  const tier = prog >= TIER_AT[2] ? 3 : prog >= TIER_AT[1] ? 2 : 1;
  if (tier !== C.tier && C.t > 3) {
    const first = C.tier === 0;
    C.tier = tier;
    const who = L.hero.id;
    if (first) { L.log("> toys.spawn(mood='friendly')"); L.barkData = { who, text: FIRST[who] ?? FIRST.aaron, t: 3.2 }; }
    else if (tier === 2) { L.log("> toys.mood = 'unsettling'"); L.banner('The toys are watching...', '#c9a0dc'); L.barkData = { who, text: LINES[2][who] ?? LINES[2].aaron, t: 3.4 }; playSfx('error'); }
    else { L.log("> toys.mood = 'DON'T BLINK'"); L.banner("They only move when you look away", '#ff7a6b', 3); L.barkData = { who, text: LINES[3][who] ?? LINES[3].aaron, t: 3.4 }; playSfx('error'); L.fx.addShake(6); }
    C.spawnT = 0.6;
  }
  if (!C.tier) return;
  // darkness eases toward the tier's level; flicker gets worse with each tier
  const want = [0, 0.12, 0.34, 0.55][C.tier];
  C.dark += (want - C.dark) * Math.min(1, dt * 1.5);
  C.flick = Math.max(0, C.flick - dt);
  if (C.tier >= 2 && C.flick <= 0 && R() < dt * (C.tier === 3 ? 0.5 : 0.2)) C.flick = rnd(0.06, 0.16);

  const easy = L.diff?.id === 'easy', hard = L.diff?.id === 'hard';
  const cap = [0, 2, 3, 4][C.tier] + (hard ? 1 : 0) - (easy ? 1 : 0);
  const every = [0, 6.5, 4.5, 3.2][C.tier] * (easy ? 1.35 : hard ? 0.8 : 1);
  C.spawnT -= dt;
  if (C.spawnT > 0 || toys.length >= cap) return;
  C.spawnT = every * rnd(0.8, 1.2);
  spawnToy(L, C.tier);
}

function spawnToy(L, tier) {
  const h = L.hero;
  const type = R() < 0.5 ? 'creepy_doll' : 'creepy_teddy';
  let x, y, behind = false;
  if (tier === 3 && R() < 0.4) { // right behind the hero, out of sight
    const a = h.facing + Math.PI + rnd(-0.5, 0.5);
    x = h.x + Math.cos(a) * 190; y = h.y + Math.sin(a) * 150;
    behind = isOpen(L.arena, x, y, 16);
  }
  if (!behind) {
    const spots = NOOKS.filter(([nx, ny]) => dist(nx, ny, h.x, h.y) > 260 && isOpen(L.arena, nx, ny, 16));
    if (!spots.length) return;
    [x, y] = pick(spots);
    x += rnd(-20, 20); y += rnd(-14, 14);
  }
  const e = L.spawnEnemy(type, x, y, {
    tier, counts: false, spawnDelay: tier === 3 ? 0.35 : 0.9,
    hpMul: [1, 1, 1.3, 1.6][tier], dmgMul: [1, 1, 1.2, 1.5][tier], scale: tier === 3 ? 1.12 : 1,
  });
  const name = e?.toyName ?? 'Something';
  L.fx.floatText(x, y - 64, SPAWN_SAY[behind ? 2 : tier === 1 ? 0 : 1](name), tier === 3 ? '#ff7a6b' : '#c9a0dc');
  if (behind) playSfx('stitch');
}

// ---------------------------------------------------------------- overlay (screen space, over the world)
export function drawCreepyDark(ctx, L) {
  const C = L.creepy;
  if (!C || (C.dark <= 0.005 && C.flick <= 0)) return;
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const fade = typeof L.weird === 'function' ? L.weird() : 1;
  const k = C.dark * fade;
  const hx = L.hero.x - L.cam.x, hy = L.hero.y - L.cam.y - 20;
  ctx.save();
  const g = ctx.createRadialGradient(hx, hy, 90, hx, hy, 560);
  g.addColorStop(0, 'rgba(10,6,18,0)');
  g.addColorStop(1, `rgba(10,6,18,${Math.min(0.92, k * 1.6)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `rgba(10,6,18,${k * 0.35})`; ctx.fillRect(0, 0, W, H);
  if (C.tier === 3) { ctx.fillStyle = `rgba(120,10,20,${0.08 * fade})`; ctx.fillRect(0, 0, W, H); }
  if (C.flick > 0) { ctx.fillStyle = `rgba(5,3,10,${0.7 * fade})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}

// ---------------------------------------------------------------- drawing
function drawEye(ctx, kind, x, y, s, tier, frozen) {
  ctx.save();
  switch (kind) {
    case 'button':
      ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(x, y, 2.6 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8a8a8a'; for (const [dx, dy] of [[-0.8, -0.8], [0.8, 0.8]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, 0.5 * s, 0, TAU); ctx.fill(); }
      break;
    case 'dot': ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(x, y, 1.7 * s, 0, TAU); ctx.fill(); break;
    case 'glass':
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 2.8 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4f8fb3'; ctx.beginPath(); ctx.arc(x, y, 1.7 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(x, y, 0.8 * s, 0, TAU); ctx.fill();
      break;
    case 'x': ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 2 * s); ctx.lineTo(x + 2 * s, y + 2 * s); ctx.moveTo(x + 2 * s, y - 2 * s); ctx.lineTo(x - 2 * s, y + 2 * s); ctx.stroke(); break;
    case 'glow': case 'mismatch':
      ctx.fillStyle = '#1b1020'; ctx.beginPath(); ctx.arc(x, y, 2.6 * s, 0, TAU); ctx.fill();
      ctx.shadowColor = '#ff3b3b'; ctx.shadowBlur = 6; ctx.fillStyle = '#ff5d5d'; ctx.beginPath(); ctx.arc(x, y, 1 * s, 0, TAU); ctx.fill();
      break;
    case 'missing': ctx.fillStyle = '#120a14'; ctx.beginPath(); ctx.ellipse(x, y, 2.4 * s, 3 * s, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#6a5a50'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 2 * s, y + 2 * s); ctx.lineTo(x + 3 * s, y + 5 * s); ctx.stroke(); break;
    case 'hollow':
      ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.ellipse(x, y, 3 * s, 3.4 * s, 0, 0, TAU); ctx.fill();
      ctx.shadowColor = '#ff2020'; ctx.shadowBlur = frozen ? 10 : 5; ctx.fillStyle = frozen ? '#ff4040' : '#d01818';
      ctx.beginPath(); ctx.arc(x, y + 0.4, 0.9 * s, 0, TAU); ctx.fill();
      break;
  }
  ctx.restore();
}

function drawMouth(ctx, kind, y, s) {
  ctx.save();
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  switch (kind) {
    case 'smile': ctx.beginPath(); ctx.arc(0, y - 1.5 * s, 2.6 * s, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke(); break;
    case 'o': ctx.fillStyle = '#8a2a3a'; ctx.beginPath(); ctx.ellipse(0, y, 1.3 * s, 1.6 * s, 0, 0, TAU); ctx.fill(); break;
    case 'stitch':
      ctx.beginPath(); ctx.moveTo(-4 * s, y); ctx.quadraticCurveTo(0, y + 2.4 * s, 4 * s, y); ctx.stroke();
      for (let i = -3; i <= 3; i += 1.5) { ctx.beginPath(); ctx.moveTo(i * s, y - 1.2 * s + Math.abs(i) * 0.15 * s); ctx.lineTo(i * s, y + 2.2 * s - Math.abs(i) * 0.2 * s); ctx.stroke(); }
      break;
    case 'grin':
      ctx.fillStyle = '#1a0a10'; ctx.beginPath(); ctx.moveTo(-5 * s, y - 1 * s); ctx.quadraticCurveTo(0, y + 4 * s, 5 * s, y - 1 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f6efe0'; for (let i = -4; i <= 3; i += 1.6) { ctx.beginPath(); ctx.moveTo(i * s, y - 0.6 * s); ctx.lineTo((i + 0.8) * s, y + 1 * s); ctx.lineTo((i + 1.6) * s, y - 0.6 * s); ctx.fill(); }
      break;
    case 'jaw':
      ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.ellipse(0, y + 1.5 * s, 2.6 * s, 4.2 * s, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.moveTo(-2.6 * s, y + 1.5 * s); ctx.lineTo(-4 * s, y + 6 * s); ctx.moveTo(2.6 * s, y + 1.5 * s); ctx.lineTo(4 * s, y + 6 * s); ctx.stroke();
      break;
  }
  ctx.restore();
}

/** Head rotation: tilt + tier-2 slow tracking sway + tier-3 occasional full head-turn. */
function headAngle(e, t) {
  let a = e.look.tilt;
  if (e.tier === 2) a += Math.sin(t * 0.8 + e.seed) * 0.25;
  if (e.tier === 3 && e.anim !== 'idle' && ((t + e.seed * 0.01) % 4) < 0.5) a += Math.PI; // head spun right round
  if (e.state === 'sit') a += 0.6; // slumped
  return a;
}

function drawDoll(ctx, e, o) {
  const L = e.look, t = o.t ?? 0, s = 1, moving = o.anim === 'move', hurt = o.anim === 'hurt';
  const step = moving ? Math.sin(t * (e.tier === 3 ? 16 : 9)) : 0;
  const reach = e.tier === 3 && moving;
  // legs
  ctx.fillStyle = L.skin; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1.5;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.rect(sd * 4 - 2, -9 + (sd * step > 0 ? -2 : 0), 4, 9); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2b2b2b'; ctx.fillRect(sd * 4 - 2.5, -2 + (sd * step > 0 ? -2 : 0), 5, 3); ctx.fillStyle = L.skin; }
  // dress
  ctx.fillStyle = o.flash > 0 ? '#fff' : L.dress;
  ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(12, -8); ctx.lineTo(6, -24); ctx.lineTo(-6, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = L.trim; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-11, -10); ctx.lineTo(11, -10); ctx.stroke();
  if (e.tier >= 2) { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -24); ctx.lineTo(-1, -16); ctx.lineTo(-4, -10); ctx.stroke(); } // torn seam
  // arms (tier 3 reach out stiffly)
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1.5; ctx.fillStyle = L.skin;
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.translate(sd * 7, -22);
    ctx.rotate(reach ? -sd * 1.3 : sd * (0.35 + step * 0.25));
    ctx.beginPath(); ctx.ellipse(0, 6, 2.6, 6.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // head
  ctx.save(); ctx.translate(0, -32); ctx.rotate(headAngle(e, t) + (hurt ? 0.3 : 0));
  if (L.style === 2) { ctx.fillStyle = L.hair; ctx.beginPath(); ctx.ellipse(0, 3, 12, 13, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = o.flash > 0 ? '#fff' : L.skin; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = L.hair;
  if (L.style === 0) { ctx.beginPath(); ctx.arc(0, -3, 10, Math.PI, TAU); ctx.fill(); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 12, 2, 3.5, 7, sd * 0.3, 0, TAU); ctx.fill(); } }
  else if (L.style === 1 || L.style === 2) { ctx.beginPath(); ctx.arc(0, -2, 10.5, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ctx.fillRect(-10.5, -3, 3.5, 9); ctx.fillRect(7, -3, 3.5, 9); }
  else { for (let i = 0; i < 6; i++) { const a = Math.PI + 0.3 + i * 0.5; ctx.beginPath(); ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 2.4, 0, TAU); ctx.fill(); } } // patchy
  if (L.bow) { ctx.fillStyle = L.bowCol; ctx.beginPath(); ctx.moveTo(4, -9); ctx.lineTo(10, -13); ctx.lineTo(10, -6); ctx.closePath(); ctx.moveTo(4, -9); ctx.lineTo(-1, -14); ctx.lineTo(-1, -5); ctx.closePath(); ctx.fill(); }
  if (L.cheeks && e.tier < 3) { ctx.fillStyle = 'rgba(233,120,140,0.45)'; ctx.beginPath(); ctx.arc(-6, 4, 2, 0, TAU); ctx.arc(6, 4, 2, 0, TAU); ctx.fill(); }
  const frozen = e.freezeFlash > 0;
  drawEye(ctx, L.eyeL, -4, -1, 1, e.tier, frozen);
  drawEye(ctx, L.eyeR === 'same' ? L.eyeL : L.eyeR, 4, -1, 1, e.tier, frozen);
  drawMouth(ctx, L.mouth, 5, 1);
  if (L.cracks) { // porcelain cracks
    ctx.strokeStyle = 'rgba(30,20,20,0.7)'; ctx.lineWidth = 0.9;
    for (let i = 0; i < L.cracks; i++) {
      const a = L.crackSeed + i * 2.1; let x = Math.cos(a) * 9, y = Math.sin(a) * 9;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 3; j++) { x *= 0.62; y *= 0.62; x += Math.sin(a * 3 + j) * 2; y += Math.cos(a * 5 + j) * 2; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawTeddy(ctx, e, o) {
  const L = e.look, t = o.t ?? 0, moving = o.anim === 'move', hurt = o.anim === 'hurt';
  const step = moving ? Math.sin(t * (e.tier === 3 ? 15 : 8)) : 0;
  const reach = e.tier === 3 && moving;
  const fur = o.flash > 0 ? '#fff' : L.fur;
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1.5;
  // feet
  ctx.fillStyle = fur;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 6, -3 + (sd * step > 0 ? -2 : 0), 5, 3.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
  // body
  ctx.beginPath(); ctx.ellipse(0, -14, 11, 12, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = L.belly; ctx.beginPath(); ctx.ellipse(0, -12, 6.5, 7.5, 0, 0, TAU); ctx.fill();
  if (L.patch) { ctx.fillStyle = L.patch.col; ctx.fillRect(L.patch.x - 3, L.patch.y - 3, 6, 6); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.8; ctx.setLineDash([1.5, 1.5]); ctx.strokeRect(L.patch.x - 3, L.patch.y - 3, 6, 6); ctx.setLineDash([]); }
  if (L.seams) { ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(0, -4); ctx.stroke(); for (let y = -23; y < -5; y += 3) { ctx.beginPath(); ctx.moveTo(-1.5, y); ctx.lineTo(1.5, y + 1); ctx.stroke(); } }
  for (let i = 0; i < L.stuffing; i++) { ctx.fillStyle = '#f6f2ea'; const a = e.seed + i * 1.9; ctx.beginPath(); ctx.arc(Math.cos(a) * 9, -14 + Math.sin(a) * 9, 2.4 + (i % 2), 0, TAU); ctx.arc(Math.cos(a) * 11, -14 + Math.sin(a) * 11, 1.8, 0, TAU); ctx.fill(); }
  // arms
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1.5; ctx.fillStyle = fur;
  for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * 9, -20); ctx.rotate(reach ? -sd * 1.35 : sd * (0.5 + step * 0.3)); ctx.beginPath(); ctx.ellipse(0, 6, 3.6, 7, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
  if (L.bowtie) { ctx.fillStyle = L.bowtie; ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(-6, -28); ctx.lineTo(-6, -22); ctx.closePath(); ctx.moveTo(0, -25); ctx.lineTo(6, -28); ctx.lineTo(6, -22); ctx.closePath(); ctx.fill(); }
  // head
  ctx.save(); ctx.translate(0, -34); ctx.rotate(headAngle(e, t) + (hurt ? 0.3 : 0));
  ctx.fillStyle = fur; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1.5;
  for (const sd of [-1, 1]) {
    if (L.ear === sd) { ctx.fillStyle = '#f6f2ea'; ctx.beginPath(); ctx.arc(sd * 8, -8, 2, 0, TAU); ctx.fill(); ctx.fillStyle = fur; continue; } // torn off, stuffing showing
    ctx.beginPath(); ctx.arc(sd * 8, -8, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = L.belly; ctx.beginPath(); ctx.arc(sd * 8, -8, 2.2, 0, TAU); ctx.fill(); ctx.fillStyle = fur;
  }
  ctx.beginPath(); ctx.arc(0, 0, 10.5, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = L.belly; ctx.beginPath(); ctx.ellipse(0, 4, 5, 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.ellipse(0, 2, 1.8, 1.3, 0, 0, TAU); ctx.fill();
  const frozen = e.freezeFlash > 0;
  drawEye(ctx, L.eyeL, -4.2, -2, 1, e.tier, frozen);
  drawEye(ctx, L.eyeR === 'same' ? L.eyeL : L.eyeR === 'mismatch' ? 'button' : L.eyeR, 4.2, -2, L.eyeR === 'mismatch' ? 1.4 : 1, e.tier, frozen);
  drawMouth(ctx, L.mouth, 6, 0.8);
  ctx.restore();
}

/** Called from draw.js drawEnemyFallback for creepy_doll / creepy_teddy. */
export function drawCreepy(ctx, e, x, y, o) {
  if (!e?.look) return;
  const s = (o.scale ?? 1) * TOY_DRAW; // drawn big like the heroes so the faces read (hitbox unchanged)
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  // tier 2 twitches in place; tier 3 is perfectly still when watched, jittery when it moves
  const jit = (e.tier === 2 && o.anim === 'idle' && Math.random() < 0.06) || (e.tier === 3 && o.anim === 'move') ? (Math.random() - 0.5) * 2.5 : 0;
  ctx.translate(x + jit, y); ctx.scale(s, s);
  ctx.fillStyle = e.tier === 3 ? 'rgba(40,0,10,0.45)' : 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(0, 0, e.tier === 3 ? 18 : 13, 5, 0, 0, TAU); ctx.fill();
  if (Math.cos(e.facing ?? 0) < 0) ctx.scale(-1, 1);
  if (e.state === 'sit') { ctx.translate(0, 6); ctx.scale(1, 0.86); }
  (e.type === 'creepy_teddy' ? drawTeddy : drawDoll)(ctx, e, o);
  ctx.restore();
  // hp sliver once hurt
  if (o.hpFrac != null && o.hpFrac < 1) {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 14, y - e.h * (o.scale ?? 1) - 6, 28, 4);
    ctx.fillStyle = e.tier === 3 ? '#ff5d5d' : '#c9a0dc'; ctx.fillRect(x - 14, y - e.h * (o.scale ?? 1) - 6, 28 * Math.max(0, o.hpFrac), 4); ctx.restore();
  }
}
