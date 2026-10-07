// Drumline chart: a marching cadence in bars of 8 eighth-notes. Owned by: games-d.
// Lanes: 0 = D bass, 1 = F snare, 2 = J quad low, 3 = K quad high.

const P = {
  A1: [[0, 0], [2, 1], [4, 0], [6, 1]],
  A2: [[0, 0], [2, 1], [4, 2], [6, 1]],
  A3: [[0, 0], [2, 1], [4, 3], [6, 1]],
  A4: [[0, 0], [2, 2], [4, 3], [6, 1]],
  B1: [[0, 0], [2, 1], [3, 1], [4, 2], [6, 1]],
  B2: [[0, 0], [2, 2], [3, 3], [4, 1], [6, 1]],
  B3: [[0, 0], [1, 0], [2, 1], [4, 2], [5, 3], [6, 1]],
  C1: [[0, 0], [0, 3], [2, 1], [3, 2], [4, 1], [6, 0], [6, 1]],
  C2: [[0, 0], [0, 2], [2, 1], [4, 3], [5, 2], [6, 0], [6, 1]],
  D1: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 3], [5, 2], [6, 1], [7, 0]],
  D2: [[0, 1], [1, 1], [2, 2], [3, 2], [4, 3], [5, 3], [6, 0], [7, 1]],
  END: [[0, 0], [0, 3]],
};

// 1 demo bar + 1 count-in bar, then 27 playing bars and a final hit.
const SONG = [
  'A1', 'A2', 'A1', 'A3', 'A1', 'A4',
  'B1', 'A2', 'B2', 'A3', 'B3', 'A4',
  'C1', 'A2', 'C2', 'B3', 'C1', 'A4',
  'D1', 'B1', 'D2', 'B3', 'D1', 'D2',
  'C1', 'D1', 'D2', 'END',
];
export const DEMO = [[0, 0], [2, 1], [4, 2], [6, 3]];
export const SECTION_STARTS = [2, 8, 14, 20, 26]; // bar numbers where the groove steps up

/**
 * Build notes. ease: 0 normal, 1 = drop off-beat eighths in the busiest bars, 2 = also no doubles.
 * Returns { notes:[{t, lane, demo, bar}], bars, barDur, beatDur, endT }.
 */
export function buildChart(bpm, ease = 0) {
  const beatDur = 60 / bpm, barDur = beatDur * 4, e8 = beatDur / 2;
  const notes = [];
  for (const [pos, lane] of DEMO) notes.push({ t: pos * e8, lane, demo: true, bar: 0 });
  SONG.forEach((name, i) => {
    const bar = i + 2;
    let pat = P[name];
    if (ease >= 1 && bar >= 20) pat = pat.filter(([pos]) => pos % 2 === 0);
    if (ease >= 2) { const seen = new Set(); pat = pat.filter(([pos]) => (seen.has(pos) ? false : (seen.add(pos), true))); }
    for (const [pos, lane] of pat) notes.push({ t: bar * barDur + pos * e8, lane, demo: false, bar });
  });
  notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
  const bars = SONG.length + 2;
  return { notes, bars, barDur, beatDur, endT: (bars - 1) * barDur };
}
