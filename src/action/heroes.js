// The hero on the field (one per room — no tag swap). Owned by: action team.
// Movement/aim/knockback feel is carried over unchanged from round 1 — keep it that way.
import { HEROES, ROOMS } from '../core/theme.js';
import * as Sprites from '../art/sprites.js';
import { angleTo } from '../core/math.js';
import { collide } from './arena.js';
import { castSkill, updateChannel, SKILL_DEF } from './skills.js';

/** Build the hero from game.state.party[hero] (hub already folded stat perks in). */
export function createHero(game, id, roomId, slots) {
  const base = HEROES[id] ?? HEROES.aaron;
  const p = game.state?.party?.[id] ?? {};
  const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  const favored = ROOMS[roomId]?.favored === id;
  const maxHp = Math.round(num(p.maxHp, base.base.maxHp));
  return {
    id, x: 0, y: 0, r: 13,
    hp: maxHp, maxHp,
    damage: num(p.damage, base.base.damage),
    speed: num(p.speed, base.base.speed),
    dmgMul: favored ? 1.15 : 1, favored,
    slots, // { basic, s1, s2, ult } skill ids or null
    cd: {}, cdMax: {},
    facing: -Math.PI / 2, moveAng: -Math.PI / 2,
    invuln: 0, flash: 0, hurtT: 0, slowT: 0, rootT: 0, hazardCd: 0,
    kvx: 0, kvy: 0,
    atkT: 0, atkDur: 0.22, spinT: 0, shieldT: 0, aggroT: 0, growT: 0,
    channel: null,
    down: false, moving: false, animT: Math.random() * 3,
  };
}

/** Aim angle: mouse when it's been used recently, otherwise movement direction. */
export function aimAngle(L, h) {
  const m = L.game.input.mouse;
  if (L.mouseAimT > 0) return angleTo(h.x, h.y - 18, m.x + L.cam.x, m.y + L.cam.y);
  return h.moveAng;
}

/** Aim point in world space (mouse, or a fixed distance ahead). */
export function aimPoint(L, h, range) {
  const m = L.game.input.mouse;
  if (L.mouseAimT > 0) {
    const tx = m.x + L.cam.x, ty = m.y + L.cam.y;
    const d = Math.hypot(tx - h.x, ty - h.y);
    if (d <= range) return { x: tx, y: ty };
  }
  return { x: h.x + Math.cos(h.facing) * range * 0.8, y: h.y + Math.sin(h.facing) * range * 0.8 };
}

/** Heroes draw 1.35x so the photo faces read (hitbox r stays 13). */
export const HERO_SCALE = 1.35;

const KEYS = { basic: 'attack', s1: 'ability', s2: 'special', ult: 'Space' };

export function updateHero(L, dt) {
  const inp = L.game.input;
  const h = L.hero;
  if (!h || h.down) return;
  h.animT += dt;
  for (const k in h.cd) h.cd[k] = Math.max(0, h.cd[k] - dt);
  h.invuln = Math.max(0, h.invuln - dt);
  h.flash = Math.max(0, h.flash - dt);
  h.hurtT = Math.max(0, h.hurtT - dt);
  h.slowT = Math.max(0, h.slowT - dt);
  h.rootT = Math.max(0, h.rootT - dt);
  h.hazardCd = Math.max(0, h.hazardCd - dt);
  h.atkT = Math.max(0, h.atkT - dt);
  h.spinT = Math.max(0, h.spinT - dt);
  h.shieldT = Math.max(0, h.shieldT - dt);
  h.aggroT = Math.max(0, h.aggroT - dt);
  h.growT = Math.max(0, h.growT - dt);
  h.holdT = Math.max(0, (h.holdT ?? 0) - dt);

  const ax = inp.axis();
  h.moving = (ax.x !== 0 || ax.y !== 0) && h.rootT <= 0;
  if (ax.x !== 0 || ax.y !== 0) h.moveAng = Math.atan2(ax.y, ax.x);
  if (!h.channel || !h.channel.lockAim) h.facing = aimAngle(L, h);
  if (h.moving) L.movedT += dt;

  if (h.rootT <= 0) {
    const chSlow = h.channel ? (h.channel.moveMul ?? 0.5) : 1;
    const sp = h.speed * (h.slowT > 0 ? 0.55 : 1) * (h.shieldT > 0 ? 0.6 : 1) * (h.atkT > 0 && h.id === 'aaron' ? 0.7 : 1) * chSlow;
    h.x += ax.x * sp * dt;
    h.y += ax.y * sp * dt;
  }
  h.x += h.kvx * dt; h.y += h.kvy * dt;
  const f = Math.exp(-9 * dt);
  h.kvx *= f; h.kvy *= f;
  collide(L.arena, h);

  if (h.channel) updateChannel(L, h, dt);

  // Attacks. Holding attack auto-repeats on cooldown.
  if (inp.down('attack') && h.slots.basic && !(h.cd[h.slots.basic] > 0) && !h.channel) {
    if (inp.pressed('Mouse0') || inp.down('Mouse0')) L.mouseAimT = 3;
    h.facing = aimAngle(L, h);
    castSkill(L, h, h.slots.basic);
  }
  for (const slot of ['s1', 's2', 'ult']) {
    const id = h.slots[slot];
    if (!id || !inp.pressed(KEYS[slot])) continue;
    if (h.cd[id] > 0 || h.channel) { L.fx.floatText(h.x, h.y - 84, h.channel ? 'Busy!' : 'Recharging...', 'rgba(255,246,229,0.7)'); continue; }
    if (slot === 's1' && inp.pressed('Mouse2')) L.mouseAimT = 3;
    h.facing = aimAngle(L, h);
    castSkill(L, h, id);
  }
}

/** Prop drawn in the hero's hand while a skill is used. */
const HOLD = {
  hot_pan: 'pan', bread_toss: 'baguette', mop_spin: 'mop', garden_hose: 'hose', drumline: 'drumsticks',
  throw_pillow: 'pillow', tap_card: 'card', sock_sling: 'sock', crochet_net: 'yarn', bouncy_ball: 'ball', debug: 'laptop', unplug: 'wrench',
};

/** HUD key labels per slot. */
export const SLOT_KEYS = { basic: 'J', s1: 'K', s2: 'E', ult: 'Space' };

/** drawHero options for the hero. */
export function heroDrawOpts(L, h) {
  let anim = 'idle', progress;
  if (h.down) anim = 'down';
  else if (h.atkT > 0) { anim = 'attack'; progress = 1 - h.atkT / h.atkDur; }
  else if (h.hurtT > 0) { anim = 'hurt'; progress = 1 - h.hurtT / 0.25; }
  else if (h.moving) anim = 'walk';
  const blink = h.invuln > 0 && Math.floor(L.time * 20) % 2 === 0;
  let facing = h.facing;
  if (h.spinT > 0) facing = h.facing + L.time * 28;
  // the skill's prop in hand while it's being used (art HOLD_KINDS)
  let hold;
  const id = h.channel ? h.channel.id : h.holdT > 0 ? h.holdId : null;
  if (id && HOLD[id] && Sprites.HOLD_KINDS?.includes?.(HOLD[id])) hold = HOLD[id];
  if (h.shieldT > 0 && Sprites.HOLD_KINDS) hold = undefined;
  if (hold && h.holdT > 0.25 && !h.channel && anim !== 'hurt') { anim = 'attack'; progress = 1 - (h.holdT - 0.25) / 0.25; }
  return { hold, shieldKind: 'plate', facing, anim, progress, t: h.animT, flash: h.flash, alpha: blink ? 0.55 : 1, shield: h.shieldT > 0 ? Math.min(1, h.shieldT * 5) : 0, scale: HERO_SCALE * (h.growT > 0 ? 1.3 : 1) };
}

export { SKILL_DEF };
