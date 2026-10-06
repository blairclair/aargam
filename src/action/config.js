// Action tuning + difficulty scaling + upgrade interpretation. Owned by: action team.
import { HEROES } from '../core/theme.js';

/** Difficulty 1..5 → multipliers. */
export function scaling(difficulty) {
  const d = Math.max(1, Math.min(5, Math.round(Number(difficulty) || 1)));
  return {
    d,
    count: 1 + 0.22 * (d - 1),     // enemy count multiplier
    hp: 1 + 0.15 * (d - 1),        // enemy hp multiplier
    dmg: 1 + 0.1 * (d - 1),        // enemy damage multiplier
    aggro: 1 - 0.09 * (d - 1),     // enemy cooldown multiplier (lower = more aggressive)
    speed: 1 + 0.04 * (d - 1),
  };
}

/** Known modifiers; anything else is ignored. */
export const KNOWN_MODIFIERS = ['blizzard', 'warm_cocoa', 'ally_scouts'];

/** Upgrade ids interpreted by action (see docs/teams/action.md). Unknown ids are ignored. */
export const KNOWN_UPGRADES = [
  'aaron.dash_damage', 'aaron.wide_sweep', 'aaron.long_shout', 'aaron.quick_dash',
  'victoria.triple_scoop', 'victoria.piercing_scoop', 'victoria.long_shield', 'victoria.big_bloom', 'victoria.quick_fling',
  'team.regen',
];

/** Build a hero's ability tuning from base theme + party stats + upgrades. */
export function heroTuning(id, party) {
  const h = HEROES[id];
  const p = party?.[id] ?? {};
  const ups = new Set(Array.isArray(p.upgrades) ? p.upgrades.filter((u) => typeof u === 'string') : []);
  const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  const t = {
    maxHp: num(p.maxHp, h.base.maxHp),
    damage: num(p.damage, h.base.damage),
    speed: num(p.speed, h.base.speed),
    ups,
    cd: {
      attack: h.abilities.attack.cooldown,
      ability: h.abilities.ability.cooldown,
      special: h.abilities.special.cooldown,
    },
    regen: 3.5, // hp/s while benched
  };
  if (id === 'aaron') {
    t.sweepRange = ups.has('aaron.wide_sweep') ? 76 : 62;
    t.sweepArc = ups.has('aaron.wide_sweep') ? Math.PI * 0.95 : Math.PI * 0.7;
    t.dashDamage = ups.has('aaron.dash_damage') ? 1.0 : 0;
    t.shoutRadius = ups.has('aaron.long_shout') ? 230 : 170;
    t.shoutStun = ups.has('aaron.long_shout') ? 2.4 : 1.6;
    if (ups.has('aaron.quick_dash')) t.cd.ability *= 0.7;
  } else {
    t.scoops = ups.has('victoria.triple_scoop') ? 3 : 1;
    t.pierce = ups.has('victoria.piercing_scoop') ? 1 : 0;
    t.shieldDur = ups.has('victoria.long_shield') ? 1.9 : 1.2;
    t.bloomRadius = ups.has('victoria.big_bloom') ? 145 : 108;
    t.bloomHeal = ups.has('victoria.big_bloom') ? 15 : 10;
    if (ups.has('victoria.quick_fling')) t.cd.attack *= 0.75;
  }
  const anyRegen = ['aaron', 'victoria'].some((k) => (party?.[k]?.upgrades ?? []).includes?.('team.regen'));
  if (anyRegen) t.regen *= 2;
  return t;
}

/** Scoop drops per enemy type. */
export const DROPS = {
  frostling: { scoops: [1, 1] },
  brainfreezer: { scoops: [1, 2] },
  popsicle_knight: { scoops: [2, 3] },
  slush_golem: { scoops: [4, 6], sunshine: 1 },
  baron_brrr: { scoops: [12, 15], sunshine: 3 },
};
