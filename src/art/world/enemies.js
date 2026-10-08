// v2 enemy dispatcher. Owned by: art-world.
// Each painter module exports PAINTERS = { type: [boxW, boxH, fn(c, P)] } with the origin at the
// enemy's FEET (ground point). The box is only used for hit-flash compositing: the sprite must fit
// in [-boxW/2, boxW/2] x [-(boxH-8), 8 + meta.below]. Optional 4th element meta = { barY (HP bar y), below,
// drawScale }. drawScale is art-only: it enlarges the painted sprite (flash box and HP bar offset follow)
// so small foes read next to the 1.35x heroes. Hitboxes live in action and are unaffected.
import { PALETTE } from '../../core/theme.js';
import { withFlash, rrect, facingOf, clamp01 } from './kit.js';
import { PAINTERS as HOUSE } from './foes_house.js';
import { PAINTERS as YARD } from './foes_yard.js';
import { PAINTERS as BOSS } from './partyplanner.js';

const PAINTERS = { ...HOUSE, ...YARD, ...BOSS };
export const WORLD_ENEMY_KINDS = Object.keys(PAINTERS);

/**
 * P passed to painters:
 * { t, ang (facing radians), dir (±1), anim: 'idle'|'move'|'attack'|'hurt', prog (0..1), phase (1..3),
 *   hpFrac, seed (0..1, stable per entity), o (raw options) }
 */
export function drawWorldEnemy(ctx, game, type, x, y, o = {}) {
  const def = PAINTERS[type];
  if (!def) return false;
  const [bw, bh, fn, meta] = def;
  const below = meta?.below ?? 0;
  const { ang, dir } = facingOf(o.facing);
  const t = o.t ?? game?.time ?? 0;
  const anim = o.anim === 'walk' ? 'move' : (o.anim ?? 'move');
  const P = {
    t, ang, dir, anim, o,
    hpFrac: o.hpFrac ?? 1,
    phase: Math.max(1, Math.min(3, o.phase ?? 1)),
    prog: clamp01(o.progress ?? ((t * 1.2) % 1)),
    seed: o.seed ?? (((x * 0.013 + y * 0.007) % 1) + 1) % 1,
  };
  ctx.save();
  ctx.translate(x, y);
  const s = o.scale ?? 1;
  if (s !== 1) ctx.scale(s, s);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  const hurt = anim === 'hurt' ? 1 - P.prog : 0;
  if (hurt) ctx.translate(Math.sin(t * 60) * 1.6 * hurt, 0);
  const ds = meta?.drawScale ?? 1;
  ctx.save();
  if (ds !== 1) ctx.scale(ds, ds);
  withFlash(ctx, bw, bh + below, bw / 2, bh - 8, o.flash, (c) => fn(c, P));
  ctx.restore();
  if (o.hpFrac != null && o.hpFrac < 1 && o.hpFrac > 0 && o.hpBar !== false && !BOSS_IDS.has(type)) {
    const w = Math.min(36, bw * 0.6), yy = (meta?.barY ?? -bh + 12) * ds;
    ctx.fillStyle = 'rgba(16,19,31,0.6)'; rrect(ctx, -w / 2 - 1, yy - 1, w + 2, 5, 2); ctx.fill();
    ctx.fillStyle = o.hpFrac > 0.35 ? PALETTE.heal : PALETTE.danger;
    rrect(ctx, -w / 2, yy, w * o.hpFrac, 3, 1.5); ctx.fill();
  }
  ctx.restore();
  return true;
}
const BOSS_IDS = new Set(['roomba', 'sock_monster', 'grill_dragon', 'partyplanner']);
