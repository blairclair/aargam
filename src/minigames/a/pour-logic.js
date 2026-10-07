// Pour the Drinks — pure puzzle rules + solver (runs in browser and Node). Owned by: games-a.
// A glass is an array of drink ids, bottom → top. All glasses share one capacity.

export function topRun(glass) {
  if (!glass.length) return 0;
  const c = glass[glass.length - 1];
  let n = 0;
  for (let i = glass.length - 1; i >= 0 && glass[i] === c; i--) n++;
  return n;
}

/** How many layers would move from glass a to glass b (0 = illegal). */
export function pourAmount(glasses, a, b, cap) {
  if (a === b) return 0;
  const A = glasses[a], B = glasses[b];
  if (!A.length || B.length >= cap) return 0;
  const c = A[A.length - 1];
  if (B.length && B[B.length - 1] !== c) return 0;
  return Math.min(topRun(A), cap - B.length);
}

export function applyPour(glasses, a, b, cap) {
  const n = pourAmount(glasses, a, b, cap);
  if (!n) return null;
  const g = glasses.map((x) => x.slice());
  for (let i = 0; i < n; i++) g[b].push(g[a].pop());
  return g;
}

export function isSolved(glasses, cap) {
  return glasses.every((g) => g.length === 0 || (g.length === cap && g.every((c) => c === g[0])));
}

export function hasMove(glasses, cap) {
  for (let a = 0; a < glasses.length; a++) for (let b = 0; b < glasses.length; b++) if (pourAmount(glasses, a, b, cap)) return true;
  return false;
}

const key = (g) => g.map((x) => x.join('')).sort().join('|');

/** Minimal number of pours to solve (BFS), or -1. Fine for the small handcrafted levels. */
export function solveMoves(start, cap, limit = 400000) {
  if (isSolved(start, cap)) return 0;
  const seen = new Set([key(start)]);
  let frontier = [start], depth = 0;
  while (frontier.length && seen.size < limit) {
    depth++;
    const next = [];
    for (const g of frontier) {
      for (let a = 0; a < g.length; a++) for (let b = 0; b < g.length; b++) {
        const n = applyPour(g, a, b, cap);
        if (!n) continue;
        const k = key(n);
        if (seen.has(k)) continue;
        if (isSolved(n, cap)) return depth;
        seen.add(k); next.push(n);
      }
    }
    frontier = next;
  }
  return -1;
}
