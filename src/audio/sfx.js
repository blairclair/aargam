// AUDIO — Owned by: story team. Signatures FROZEN: initAudio(game), playSfx(name, opts), playMusic(name), setVolume({master, music, sfx}).
// Everything is synthesized with WebAudio (no files). Names: theme.SFX / theme.MUSIC; unknown names are ignored.
// Nothing here may ever throw: every entry point is wrapped.
//
// Music: a tiny step sequencer per track (pad + bass + lead + drums) with ~1.2 s crossfades. Quiet by default.
// Auto-music: initAudio listens to 'scene:changed' and picks a track (title/house/room/boss/minigame/cutscene/party);
// any explicit playMusic() call from a scene's enter() wins because it runs after the event.
// The backyard and pond get a Marching Ravens-style snare cadence.

let ctx = null;
let master = null, musicBus = null, sfxBus = null, noiseBuf = null;
const vol = { master: 0.8, music: 0.32, sfx: 0.6 };
let wanted = null;        // music name requested (possibly before audio unlocked)
let current = null;       // active music instance
const fading = new Set(); // instances fading out
let timer = null;
const lastPlayed = new Map();

const safe = (f) => { try { return f(); } catch { return undefined; } };

/** Called once at boot. Must not throw if audio is unavailable. AudioContext must be resumed on first user gesture. */
export function initAudio(game) {
  safe(() => {
    const unlock = () => safe(() => {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        build();
      }
      if (ctx.state === 'suspended') ctx.resume();
      if (wanted && (!current || current.name !== wanted)) startMusic(wanted);
    });
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    game?.events?.on?.('scene:changed', ({ key, params } = {}) => safe(() => {
      const m = autoMusic(key, params ?? {});
      if (m) playMusic(m);
    }));
  });
}

function autoMusic(key, p) {
  switch (key) {
    case 'title': return 'title';
    case 'hub': case 'select': case 'results': return 'house';
    case 'room': return p.roomId === 'pond' ? 'boss' : p.roomId === 'backyard' ? 'backyard' : 'room';
    case 'minigame': return p.roomId === 'backyard' ? 'backyard' : 'minigame';
    case 'cutscene': return String(p.id ?? '').startsWith('party') ? 'party' : 'cutscene';
    default: return null;
  }
}

function build() {
  master = ctx.createGain(); master.gain.value = vol.master;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = vol.music; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  timer = setInterval(() => safe(tick), 30);
}

// ------------------------------------------------------------------ synth primitives
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function tone(freq, dur, o = {}) {
  const t = o.when ?? ctx.currentTime;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
  if (o.detune) osc.detune.value = o.detune;
  const v = Math.max(0.0002, o.vol ?? 0.2), a = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.01, dur));
  let node = osc;
  if (o.filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.filter; node.connect(f); node = f; }
  node.connect(g).connect(o.dest ?? sfxBus);
  osc.start(t); osc.stop(t + dur + 0.05);
}

function noise(dur, o = {}) {
  const t = o.when ?? ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = o.ftype ?? 'bandpass'; f.frequency.setValueAtTime(o.freq ?? 1200, t);
  if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain(), v = Math.max(0.0002, o.vol ?? 0.2);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (o.attack ?? 0.003));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(o.dest ?? sfxBus);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

const arp = (notes, step, o = {}) => notes.forEach((m, i) => tone(mtof(m), o.dur ?? step * 1.6, { ...o, when: ctx.currentTime + i * step }));

// ------------------------------------------------------------------ sound effects
const SFX = {
  click: () => tone(1100, 0.05, { type: 'triangle', vol: 0.12, slide: 900 }),
  blip: (o) => {
    const f = o.who === 'aaron' ? 430 : o.who === 'victoria' ? 620 : o.who === 'partyplanner' ? 980 : 520;
    tone(f * (0.96 + Math.random() * 0.08), 0.045, { type: o.who === 'partyplanner' ? 'square' : 'triangle', vol: 0.05 });
  },
  type: () => noise(0.03, { freq: 3500 + Math.random() * 1500, q: 4, vol: 0.12 }),
  hit: () => { noise(0.08, { freq: 900, vol: 0.25 }); tone(180, 0.08, { type: 'square', vol: 0.1, slide: 90 }); },
  kick: () => { tone(220, 0.12, { type: 'sine', vol: 0.35, slide: 60 }); noise(0.05, { freq: 2000, vol: 0.12 }); },
  whack: () => { tone(320, 0.1, { type: 'triangle', vol: 0.25, slide: 140 }); noise(0.06, { freq: 2600, q: 3, vol: 0.18 }); tone(1800, 0.12, { type: 'sine', vol: 0.05 }); },
  hurt: () => { tone(300, 0.2, { type: 'sawtooth', vol: 0.12, slide: 120, filter: 1400 }); },
  swing: () => noise(0.14, { freq: 600, sweep: 3000, q: 2, vol: 0.16, attack: 0.03 }),
  throw: () => noise(0.18, { freq: 1800, sweep: 500, q: 3, vol: 0.14, attack: 0.02 }),
  dash: () => noise(0.2, { freq: 400, sweep: 2400, q: 1.5, vol: 0.16, attack: 0.04 }),
  shield: () => { tone(880, 0.25, { type: 'triangle', vol: 0.12 }); tone(1320, 0.3, { type: 'sine', vol: 0.06, when: ctx.currentTime + 0.02 }); },
  shout: () => tone(260, 0.25, { type: 'sawtooth', vol: 0.1, slide: 420, filter: 1800 }),
  bloom: () => arp([72, 76, 79, 84], 0.07, { type: 'triangle', vol: 0.1 }), // doorbell-ish chime
  pickup: () => arp([79, 84], 0.06, { type: 'square', vol: 0.06, filter: 3000 }),
  swap: () => tone(500, 0.12, { type: 'triangle', vol: 0.1, slide: 900 }),
  victory: () => arp([60, 64, 67, 72, 76, 79, 84], 0.08, { type: 'triangle', vol: 0.12, dur: 0.35 }),
  defeat: () => arp([67, 63, 60, 55], 0.16, { type: 'triangle', vol: 0.12, dur: 0.4 }),
  freeze: () => { noise(0.4, { freq: 6000, q: 6, vol: 0.08 }); tone(1600, 0.4, { type: 'sine', vol: 0.05, slide: 2400 }); },
  thaw: () => tone(1400, 0.3, { type: 'sine', vol: 0.07, slide: 500 }),
  squish: () => { tone(160, 0.18, { type: 'sine', vol: 0.3, slide: 70 }); noise(0.12, { freq: 400, q: 2, vol: 0.12 }); },
  pour: () => { for (let i = 0; i < 6; i++) tone(500 + i * 90 + Math.random() * 40, 0.08, { type: 'sine', vol: 0.06, when: ctx.currentTime + i * 0.06 }); },
  drum: () => drumHit('snare', ctx.currentTime, sfxBus, 0.5),
  stitch: () => { noise(0.04, { freq: 5000, q: 5, vol: 0.12 }); tone(1500, 0.05, { type: 'triangle', vol: 0.05, when: ctx.currentTime + 0.04 }); },
  pipe: () => { tone(140, 0.12, { type: 'square', vol: 0.06, filter: 900 }); noise(0.05, { freq: 2500, q: 4, vol: 0.1 }); },
  card: () => noise(0.07, { freq: 3000, sweep: 1500, q: 1.5, vol: 0.14 }),
  unlock: () => arp([67, 72, 76, 79, 84], 0.06, { type: 'triangle', vol: 0.1, dur: 0.3 }),
  star: () => { tone(1568, 0.25, { type: 'triangle', vol: 0.1 }); tone(2093, 0.3, { type: 'sine', vol: 0.06, when: ctx.currentTime + 0.06 }); },
  error: () => { tone(220, 0.12, { type: 'square', vol: 0.08, filter: 1500 }); tone(196, 0.18, { type: 'square', vol: 0.08, filter: 1500, when: ctx.currentTime + 0.13 }); },
  boing: () => tone(180, 0.35, { type: 'sine', vol: 0.22, slide: 520 }),
  splash: () => { noise(0.4, { freq: 1200, sweep: 400, q: 0.8, vol: 0.22 }); tone(600, 0.1, { type: 'sine', vol: 0.06, slide: 1200 }); },
};

/** Fire-and-forget sound effect. Unknown names are ignored. */
export function playSfx(name, opts = {}) {
  if (!ctx || ctx.state !== 'running') return;
  safe(() => {
    const f = SFX[name]; if (!f) return;
    const now = ctx.currentTime, last = lastPlayed.get(name) ?? -1;
    if (now - last < (name === 'blip' || name === 'type' ? 0.02 : 0.035)) return; // no machine-gun stacking
    lastPlayed.set(name, now);
    f(opts ?? {});
  });
}

// ------------------------------------------------------------------ music
// Notes: 'C4', 'F#3', 'Bb4', '.' rest, '-' hold previous. 8 lead tokens per bar (8th notes).
// Drum strings: 16 chars per bar. x = hit, r = roll (two 32nds), X = accent.
const N = (s) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(s); if (!m) return null; const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12; };
const chord = (s) => s.split(' ').map(N);
const lead = (s) => s.replace(/\|/g, ' ').split(/\s+/).filter(Boolean);

const TRACKS = {
  title: {
    bpm: 92, pad: 'triangle', padVol: 0.035, bassVol: 0.08, leadVol: 0.05, leadType: 'triangle', bell: true,
    chords: ['C4 E4 G4', 'A3 C4 E4', 'F3 A3 C4', 'G3 B3 D4'].map(chord), bass: ['C2', 'A1', 'F1', 'G1'].map(N),
    lead: lead('E5 . G5 . C6 - B5 G5 | A5 . E5 . C5 - . . | F5 . A5 . C6 - A5 F5 | G5 - D5 . B4 - . .'),
    kick: 'x.......x.......', snare: '', hat: '....x.......x...',
  },
  house: { // cozy lo-fi for the hub
    bpm: 80, swing: 0.12, pad: 'sine', padVol: 0.045, bassVol: 0.09, leadVol: 0.035, leadType: 'sine', bell: true,
    chords: ['F3 A3 C4 E4', 'E3 G3 B3 D4', 'D3 F3 A3 C4', 'C3 E3 G3 B3'].map(chord), bass: ['F1', 'E1', 'D1', 'C1'].map(N),
    lead: lead('. A5 . C6 . E5 . . | . G5 . B5 . D5 . . | . F5 . A5 . C5 . D5 | E5 - - . . . . .'),
    kick: 'x.........x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', drumVol: 0.45,
  },
  room: {
    bpm: 120, pad: 'sawtooth', padVol: 0.02, padFilter: 1200, bassVol: 0.11, bassType: 'square', leadVol: 0.04, leadType: 'square', leadFilter: 2400,
    chords: ['A3 C4 E4', 'F3 A3 C4', 'C4 E4 G4', 'G3 B3 D4'].map(chord), bass: ['A1', 'F1', 'C2', 'G1'].map(N), bassPattern: 'x.x.x.xx',
    lead: lead('A4 C5 E5 A5 G5 E5 C5 E5 | F5 - E5 C5 A4 - . . | G5 E5 C5 G4 C5 E5 G5 C6 | B5 - G5 - D5 - . .'),
    kick: 'x...x...x...x...', snare: '....x.......x..x', hat: '..x...x...x...x.',
  },
  backyard: { // Marching Ravens nod: snare cadence + bass drum, major and proud
    bpm: 116, pad: 'triangle', padVol: 0.03, bassVol: 0.1, bassType: 'triangle', leadVol: 0.05, leadType: 'square', leadFilter: 2000,
    chords: ['Bb3 D4 F4', 'Eb4 G4 Bb4', 'F3 A3 C4', 'Bb3 D4 F4'].map(chord), bass: ['Bb1', 'Eb2', 'F1', 'Bb1'].map(N), bassPattern: 'x...x...',
    lead: lead('F5 - D5 F5 Bb5 - F5 . | G5 - Eb5 G5 Bb5 - G5 . | A5 - F5 A5 C6 - A5 . | Bb5 - - . F5 . Bb5 .'),
    kick: 'x...x...x...x...', snare: 'x.r.x.x.r.x.xrxr', hat: '', tom: '......x.......x.',
  },
  boss: { // pond / final fight: minor, driving, drumline rolls
    bpm: 136, pad: 'sawtooth', padVol: 0.025, padFilter: 900, bassVol: 0.13, bassType: 'sawtooth', bassFilter: 700, leadVol: 0.045, leadType: 'square', leadFilter: 2200,
    chords: ['D3 F3 A3', 'Bb2 D3 F3', 'C3 E3 G3', 'A2 C#3 E3'].map(chord), bass: ['D2', 'Bb1', 'C2', 'A1'].map(N), bassPattern: 'xxx.xxx.',
    lead: lead('D5 . F5 . A5 - G5 F5 | Bb5 - A5 - F5 - D5 . | C5 E5 G5 C6 Bb5 - G5 E5 | A5 - - C#5 E5 - A5 .'),
    kick: 'x..x..x.x..x..x.', snare: '....x.r.....x.rr', hat: 'x.x.x.x.x.x.x.x.',
  },
  minigame: {
    bpm: 108, pad: 'triangle', padVol: 0.03, bassVol: 0.08, leadVol: 0.045, leadType: 'triangle', bell: true,
    chords: ['G3 B3 D4', 'E3 G3 B3', 'C3 E3 G3', 'D3 F#3 A3'].map(chord), bass: ['G1', 'E1', 'C2', 'D2'].map(N), bassPattern: 'x...x.x.',
    lead: lead('G5 D5 B4 D5 G5 A5 B5 . | E5 B4 G4 B4 E5 F#5 G5 . | C5 E5 G5 E5 C6 B5 A5 G5 | F#5 . A5 . D5 . . .'),
    kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', drumVol: 0.5,
  },
  cutscene: {
    bpm: 76, pad: 'sine', padVol: 0.05, bassVol: 0.06, leadVol: 0.03, leadType: 'sine', bell: true,
    chords: ['D3 F#3 A3 C#4', 'B2 D3 F#3 A3', 'G2 B2 D3 F#3', 'A2 C#3 E3 G3'].map(chord), bass: ['D1', 'B0', 'G1', 'A1'].map(N), bassPattern: 'x.......',
    lead: lead('. . F#5 . . . E5 . | . . D5 . . . C#5 . | . . B4 . . . D5 . | E5 - - . . . . .'),
    kick: '', snare: '', hat: '',
  },
  party: { // the ending: bright, bouncy, with a drumline fill
    bpm: 124, swing: 0.08, pad: 'triangle', padVol: 0.035, bassVol: 0.12, bassType: 'square', bassFilter: 900, leadVol: 0.05, leadType: 'square', leadFilter: 3000, bell: true,
    chords: ['C4 E4 G4', 'F3 A3 C4', 'A3 C4 E4', 'G3 B3 D4'].map(chord), bass: ['C2', 'F1', 'A1', 'G1'].map(N), bassPattern: 'x.xx.xx.',
    lead: lead('E5 G5 C6 G5 E5 - C5 D5 | F5 A5 C6 A5 F5 - . . | E5 G5 A5 C6 B5 A5 G5 E5 | D5 - G5 - B5 - D6 .'),
    kick: 'x...x...x...x...', snare: '....x.......x.rr', hat: '..x...x...x...x.', clap: '....x.......x...',
  },
};
const ALIAS = { overworld: 'house', camp: 'house', battle: 'room' };

/** Start/replace looping music track; null stops music. */
export function playMusic(name) {
  safe(() => {
    const n = name == null ? null : (ALIAS[name] ?? name);
    if (n != null && !TRACKS[n]) return; // unknown -> ignore
    wanted = n;
    if (!ctx || ctx.state !== 'running') return; // starts on unlock
    if (current?.name === n) return;
    startMusic(n);
  });
}

function startMusic(name) {
  const now = ctx.currentTime;
  if (current) {
    const old = current;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(old.gain.gain.value, now);
    old.gain.gain.linearRampToValueAtTime(0.0001, now + 1.2);
    old.stopAt = now + 1.3;
    fading.add(old);
    current = null;
  }
  if (!name || !TRACKS[name]) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(1, now + 1.2);
  g.connect(musicBus);
  current = { name, tr: TRACKS[name], gain: g, step: 0, next: now + 0.08 };
}

function tick() {
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const inst of [...fading]) {
    if (now > inst.stopAt) { safe(() => inst.gain.disconnect()); fading.delete(inst); } else schedule(inst, now);
  }
  if (current) schedule(current, now);
}

function schedule(inst, now) {
  const tr = inst.tr, sp16 = 60 / tr.bpm / 4;
  if (inst.next < now - 0.25) inst.next = now + 0.05; // tab was asleep: don't burst-play the backlog
  while (inst.next < now + 0.15) {
    if (inst.stopAt && inst.next > inst.stopAt) return;
    const s = inst.step, bar = Math.floor(s / 16) % tr.chords.length, st = s % 16;
    const swing = st % 2 === 1 ? (tr.swing ?? 0) * sp16 : 0;
    playStep(inst, tr, bar, st, inst.next + swing, sp16);
    inst.step++; inst.next += sp16;
  }
}

function playStep(inst, tr, bar, st, t, sp16) {
  const out = inst.gain;
  // pad: whole-bar chord, re-struck each bar
  if (st === 0) for (const m of tr.chords[bar]) tone(mtof(m), sp16 * 16 * 0.98, { when: t, type: tr.pad, vol: tr.padVol, attack: 0.25, filter: tr.padFilter, dest: out, detune: (Math.random() - 0.5) * 8 });
  // bass on 8ths following its pattern
  if (st % 2 === 0) {
    const pat = tr.bassPattern ?? 'x...x...';
    if (pat[(st / 2) % pat.length] === 'x') {
      const root = tr.bass[bar]; const oct = st === 6 || st === 14 ? 12 : 0;
      tone(mtof(root + oct), sp16 * 1.8, { when: t, type: tr.bassType ?? 'triangle', vol: tr.bassVol, filter: tr.bassFilter ?? 1200, dest: out });
    }
    // lead on 8ths
    const tok = tr.lead[(bar * 8 + st / 2) % tr.lead.length];
    const m = tok && tok !== '.' && tok !== '-' ? N(tok) : null;
    if (m != null) {
      let len = 1; for (let k = bar * 8 + st / 2 + 1; tr.lead[k % tr.lead.length] === '-' && len < 8; k++) len++;
      tone(mtof(m), sp16 * 2 * len * 0.9, { when: t, type: tr.leadType, vol: tr.leadVol, filter: tr.leadFilter, dest: out, attack: 0.01 });
      if (tr.bell) tone(mtof(m + 12), 0.35, { when: t, type: 'sine', vol: tr.leadVol * 0.35, dest: out });
    }
  }
  const dv = tr.drumVol ?? 1;
  for (const kind of ['kick', 'snare', 'hat', 'tom', 'clap']) {
    const c = tr[kind]?.[st];
    if (!c || c === '.') continue;
    drumHit(kind, t, out, dv * (c === 'X' ? 1.3 : 1));
    if (c === 'r') drumHit(kind, t + sp16 / 2, out, dv * 0.7);
  }
}

function drumHit(kind, t, dest, v = 1) {
  if (kind === 'kick') tone(150, 0.16, { when: t, slide: 45, vol: 0.32 * v, dest });
  else if (kind === 'snare') { noise(0.12, { when: t, freq: 2200, q: 0.7, vol: 0.14 * v, dest, ftype: 'highpass' }); tone(190, 0.07, { when: t, type: 'triangle', vol: 0.08 * v, dest }); }
  else if (kind === 'hat') noise(0.035, { when: t, freq: 8000, q: 1, vol: 0.05 * v, dest, ftype: 'highpass' });
  else if (kind === 'tom') tone(120, 0.18, { when: t, slide: 80, type: 'sine', vol: 0.2 * v, dest });
  else if (kind === 'clap') for (let k = 0; k < 3; k++) noise(0.05, { when: t + k * 0.012, freq: 1500, q: 1.2, vol: 0.09 * v, dest });
}

/** Volumes 0..1. Any subset. */
export function setVolume({ master: m, music, sfx } = {}) {
  safe(() => {
    if (Number.isFinite(m)) vol.master = clamp(m);
    if (Number.isFinite(music)) vol.music = clamp(music);
    if (Number.isFinite(sfx)) vol.sfx = clamp(sfx);
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.setTargetAtTime(vol.master, now, 0.05);
    musicBus.gain.setTargetAtTime(vol.music, now, 0.05);
    sfxBus.gain.setTargetAtTime(vol.sfx, now, 0.05);
  });
}
const clamp = (x) => Math.max(0, Math.min(1, x));
