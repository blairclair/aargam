// Campaign rules: map state, frost spread + forecast, rewards, mission params, outcomes.
// Pure-ish logic on game.state (no rendering). Owned by: strategy. See docs/teams/strategy.md.
import { rng, clamp } from '../core/math.js';
import { HEROES } from '../core/theme.js';
import {
  ECON, NODES, NODE_BY_ID, NEIGHBORS, REGION_BASE_DIFFICULTY, REGION_ORDER, REGION_GOLEM,
  UPGRADE_BY_ID, BUILDING_BY_ID,
} from './data.js';
import { NODE_INTROS } from './story.js';

export const MAP_VERSION = 1;

// ---------- init ----------

/** Make sure state.map / state.camp exist and are our current shape. Returns true if freshly created. */
export function ensureCampaign(state) {
  let fresh = false;
  if (!state.map || state.map.v !== MAP_VERSION) {
    const seed = (Math.random() * 1e9) | 0;
    state.map = {
      v: MAP_VERSION,
      seed,
      nodes: Object.fromEntries(NODES.map((n) => [n.id, { frost: n.frost, cleared: false, shieldDay: 0, thawedDay: 0 }])),
      liberated: { lakeside: false, oldcity: false, summit: false },
      campChill: 0,
      storm: { day: 0, ids: [] },
    };
    if (!state.resources.scoops && !state.resources.sunshine) {
      state.resources.scoops = ECON.startScoops;
      state.resources.sunshine = ECON.startSunshine;
    }
    fresh = true;
  }
  // forward-compat: nodes added later get defaults
  for (const n of NODES) state.map.nodes[n.id] ??= { frost: n.frost, cleared: false, shieldDay: 0, thawedDay: 0 };
  if (!state.camp || typeof state.camp.buildings !== 'object') state.camp = { buildings: {} };
  if (state.map.storm.day !== state.day) rollStorm(state);
  return fresh;
}

// ---------- queries ----------

export const nodeState = (state, id) => state.map.nodes[id];
export const frostOf = (state, id) => (id === 'camp' ? 0 : state.map.nodes[id].frost);
export const isBoss = (id) => NODE_BY_ID[id].kind === 'boss';

export function regionUnlocked(state, region) {
  const i = REGION_ORDER.indexOf(region);
  return i <= 0 || !!state.map.liberated[REGION_ORDER[i - 1]];
}

/** Current frontier region (first one not yet liberated). */
export function currentRegion(state) {
  return REGION_ORDER.find((r) => !state.map.liberated[r]) ?? 'summit';
}

export function isThawed(state, id) { return id === 'camp' || state.map.nodes[id].frost === 0; }

/** Can the player launch a mission here right now? */
export function isAvailable(state, id) {
  const n = NODE_BY_ID[id];
  if (n.kind === 'camp' || isThawed(state, id) || state.map.nodes[id].cleared) return false;
  if (!regionUnlocked(state, n.region)) return false;
  return NEIGHBORS[id].some((m) => isThawed(state, m) && regionUnlocked(state, NODE_BY_ID[m].region));
}

/** Why a node is unavailable (for tooltips), or null. */
export function lockReason(state, id) {
  const n = NODE_BY_ID[id];
  if (n.kind === 'camp') return null;
  if (state.map.nodes[id].cleared) return 'Liberated';
  if (isThawed(state, id)) return 'Thawed';
  if (!regionUnlocked(state, n.region)) {
    const prev = REGION_ORDER[REGION_ORDER.indexOf(n.region) - 1];
    return `Locked: beat the Golem at ${NODE_BY_ID[REGION_GOLEM[prev]].name}`;
  }
  if (!isAvailable(state, id)) return 'Out of reach: thaw a neighbor';
  return null;
}

export const buildingLevel = (state, id) => state.camp?.buildings?.[id] ?? 0;
export const shielded = (state, id) => (id === 'camp' ? state.map.campShieldDay : state.map.nodes[id].shieldDay) === state.day;

export function difficultyOf(state, id) {
  const n = NODE_BY_ID[id];
  const f = frostOf(state, id);
  if (n.bossId === 'baron_brrr') return 5;
  const base = REGION_BASE_DIFFICULTY[n.region] + (n.kind === 'boss' ? 1 : 0);
  return clamp(base + (f - (n.kind === 'boss' ? 3 : 2)), 1, 5);
}

export function scoopMult(state) { return 1 + 0.25 * buildingLevel(state, 'freezer'); }

/** Strategy-side victory bonus (on top of what the player picked up during the mission). */
export function rewardsFor(state, id) {
  const n = NODE_BY_ID[id];
  const f = frostOf(state, id);
  const d = difficultyOf(state, id);
  const boss = n.kind === 'boss';
  const scoops = Math.round((20 + 12 * d + 8 * f + (boss ? 40 : 0)) * scoopMult(state));
  const sunshine = 1 + (f >= 3 ? 1 : 0) + (boss ? 1 : 0);
  return { scoops, sunshine };
}

export function modifiersFor(state, id) {
  const mods = [];
  if (frostOf(state, id) >= 3) mods.push('blizzard');
  for (const b of ['cocoa', 'scout']) if (buildingLevel(state, b) > 0) mods.push(BUILDING_BY_ID[b].modifier);
  return mods;
}

function hashId(id) { let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return h >>> 0; }

export function missionParamsFor(state, id) {
  const n = NODE_BY_ID[id];
  const p = {
    nodeId: id,
    region: n.region,
    kind: n.kind,
    difficulty: difficultyOf(state, id),
    seed: ((state.map.seed ^ hashId(id)) + state.day * 977) >>> 0,
    modifiers: modifiersFor(state, id),
  };
  if (n.bossId) p.bossId = n.bossId;
  const intro = NODE_INTROS[id];
  if (intro) p.intro = intro;
  return p;
}

// ---------- frost: storm + forecast ----------

/** Number of nodes the Baron's storm intensifies each night. */
export const stormStrength = (day) => 1 + (day >= 12 ? 1 : 0);

/** Pick tonight's storm targets (deterministic per seed+day); stored so the forecast is honest. */
export function rollStorm(state) {
  const m = state.map;
  const r = rng((m.seed + state.day * 7919) >>> 0);
  const pool = [];
  for (const n of NODES) {
    const ns = m.nodes[n.id];
    if (n.kind === 'camp' || ns.cleared || ns.frost < 1 || ns.frost > 2) continue;
    if (!regionUnlocked(state, n.region) || m.liberated[n.region]) continue;
    const frontier = NEIGHBORS[n.id].some((x) => isThawed(state, x));
    pool.push({ id: n.id, w: frontier ? 3 : 1 });
  }
  const ids = [];
  for (let k = 0; k < stormStrength(state.day) && pool.length; k++) {
    let t = r() * pool.reduce((a, p) => a + p.w, 0);
    let i = 0;
    while (i < pool.length - 1 && (t -= pool[i].w) > 0) i++;
    ids.push(pool[i].id);
    pool.splice(i, 1);
  }
  m.storm = { day: state.day, ids };
}

/** Sources of re-freeze: non-boss nodes at full frost. */
const isFrostSource = (state, id) => id !== 'camp' && !isBoss(id) && state.map.nodes[id].frost >= 3;

/**
 * What happens tonight if nothing else changes.
 * @returns {{id:string, delta:number, reason:'storm'|'refreeze'|'chill'|'warmup', blocked?:boolean, source?:string}[]}
 */
export function forecast(state) {
  const m = state.map;
  const out = [];
  for (const id of m.storm.ids) {
    const ns = m.nodes[id];
    if (ns.cleared || ns.frost < 1 || ns.frost >= 3) continue; // thawed meanwhile or already maxed
    out.push({ id, delta: 1, reason: 'storm', blocked: shielded(state, id) });
  }
  for (const n of NODES) {
    if (n.kind === 'camp' || isBoss(n.id)) continue;
    const ns = m.nodes[n.id];
    if (ns.frost !== 0 || ns.thawedDay === state.day) continue; // freshly thawed: immune tonight
    const src = NEIGHBORS[n.id].find((x) => isFrostSource(state, x));
    if (src) out.push({ id: n.id, delta: 1, reason: 'refreeze', source: src, blocked: shielded(state, n.id) });
  }
  const campSrc = NEIGHBORS.camp.find((x) => isFrostSource(state, x));
  if (campSrc) out.push({ id: 'camp', delta: 1, reason: 'chill', source: campSrc, blocked: shielded(state, 'camp') });
  else if (m.campChill > 0) out.push({ id: 'camp', delta: -1, reason: 'warmup' });
  return out;
}

/** Apply tonight's forecast, advance the day, roll the next storm. Returns the applied changes. */
export function endDay(state) {
  const m = state.map;
  const changes = forecast(state);
  for (const c of changes) {
    if (c.blocked) continue;
    if (c.id === 'camp') m.campChill = clamp(m.campChill + c.delta, 0, ECON.campChillLimit);
    else m.nodes[c.id].frost = clamp(m.nodes[c.id].frost + c.delta, 0, 3);
  }
  state.day++;
  const morning = { sunshine: buildingLevel(state, 'hammock') };
  state.resources.sunshine += morning.sunshine;
  rollStorm(state);
  return { changes, morning };
}

/** 'chill' | 'summer' | null */
export function lossReason(state) {
  if (state.map.campChill >= ECON.campChillLimit) return 'chill';
  if (state.day > ECON.dayLimit) return 'summer';
  return null;
}

// ---------- sunshine actions ----------

export function canWarm(state, id) {
  if (id === 'camp' || state.map.nodes[id].cleared) return false;
  const min = isBoss(id) ? 1 : 0;
  return regionUnlocked(state, NODE_BY_ID[id].region) && state.map.nodes[id].frost > min && state.resources.sunshine >= ECON.warmCost;
}
export function warmNode(state, id) {
  if (!canWarm(state, id)) return false;
  state.resources.sunshine -= ECON.warmCost;
  const ns = state.map.nodes[id];
  ns.frost--;
  if (ns.frost === 0) ns.thawedDay = state.day;
  return true;
}
export function canShield(state, id) {
  if (shielded(state, id) || state.resources.sunshine < ECON.shieldCost) return false;
  if (id === 'camp') return true;
  return !state.map.nodes[id].cleared && regionUnlocked(state, NODE_BY_ID[id].region);
}
export function shieldNode(state, id) {
  if (!canShield(state, id)) return false;
  state.resources.sunshine -= ECON.shieldCost;
  if (id === 'camp') state.map.campShieldDay = state.day; else state.map.nodes[id].shieldDay = state.day;
  return true;
}

// ---------- mission outcome ----------

/**
 * Apply a MissionOutcome. Does NOT advance the day (call endDay after).
 * @returns report for the results panel
 */
export function applyOutcome(state, outcome) {
  const id = outcome.nodeId;
  const n = NODE_BY_ID[id];
  const rep = { nodeId: id, victory: !!outcome.victory, scoops: 0, sunshine: 0, thawed: [], liberated: null, wonGame: false, frostUp: false };
  const collectedScoops = Math.max(0, outcome.scoops | 0);
  const collectedSun = Math.max(0, outcome.sunshine | 0);
  if (!n || n.kind === 'camp') { // unknown node: just bank what was collected
    rep.scoops = collectedScoops; rep.sunshine = collectedSun;
  } else if (outcome.victory) {
    const bonus = rewardsFor(state, id);
    rep.scoops = Math.round(collectedScoops * scoopMult(state)) + bonus.scoops;
    rep.sunshine = collectedSun + bonus.sunshine;
    const ns = state.map.nodes[id];
    ns.frost = 0; ns.thawedDay = state.day;
    rep.thawed.push(id);
    if (n.kind === 'boss') {
      ns.cleared = true;
      if (n.bossId === 'baron_brrr') rep.wonGame = true;
      else if (REGION_GOLEM[n.region] === id) {
        state.map.liberated[n.region] = true;
        rep.liberated = n.region;
        // The cold snaps: every other node in the region loses 1 frost.
        for (const o of NODES) {
          if (o.region !== n.region || o.id === id || o.kind === 'camp') continue;
          const os = state.map.nodes[o.id];
          if (os.frost > 0) { os.frost--; if (os.frost === 0) { os.thawedDay = state.day; rep.thawed.push(o.id); } }
        }
      }
    }
  } else {
    rep.scoops = Math.floor(collectedScoops * ECON.defeatScoopKeep);
    rep.sunshine = collectedSun;
    const ns = state.map.nodes[id];
    if (!isBoss(id) && ns.frost < 3) { ns.frost++; rep.frostUp = true; }
  }
  state.resources.scoops += rep.scoops;
  state.resources.sunshine += rep.sunshine;
  // Rest at camp: full heal between missions.
  for (const h of Object.keys(HEROES)) if (state.party[h]) state.party[h].hp = state.party[h].maxHp;
  return rep;
}

// ---------- camp shop ----------

export function ownsUpgrade(state, uid) {
  const u = UPGRADE_BY_ID[uid];
  const hero = u.hero === 'team' ? 'aaron' : u.hero;
  return !!state.party[hero]?.upgrades?.includes(uid);
}
export function canBuyUpgrade(state, uid) {
  const u = UPGRADE_BY_ID[uid];
  return !!u && !ownsUpgrade(state, uid) && (!u.requires || ownsUpgrade(state, u.requires)) && state.resources.scoops >= u.cost;
}
export function buyUpgrade(state, uid) {
  if (!canBuyUpgrade(state, uid)) return false;
  const u = UPGRADE_BY_ID[uid];
  const p = state.party[u.hero === 'team' ? 'aaron' : u.hero];
  state.resources.scoops -= u.cost;
  p.upgrades.push(uid);
  if (u.stat) {
    for (const [k, v] of Object.entries(u.stat)) p[k] = (p[k] ?? 0) + v;
    if (u.stat.maxHp) p.hp = p.maxHp;
  }
  return true;
}
export function nextBuildingCost(state, bid) {
  const b = BUILDING_BY_ID[bid];
  const lvl = buildingLevel(state, bid);
  return lvl < b.costs.length ? b.costs[lvl] : null;
}
export function canBuyBuilding(state, bid) {
  const c = nextBuildingCost(state, bid);
  return c !== null && state.resources.scoops >= c;
}
export function buyBuilding(state, bid) {
  if (!canBuyBuilding(state, bid)) return false;
  state.resources.scoops -= nextBuildingCost(state, bid);
  state.camp.buildings[bid] = buildingLevel(state, bid) + 1;
  return true;
}
