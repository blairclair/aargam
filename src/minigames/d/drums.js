// Synthesized marching drums + a song clock for Drumline. Owned by: games-d.
// Everything is WebAudio; nothing throws if audio is missing or locked — the clock then falls back
// to performance.now() so the game stays playable (visual-only).

let shared = null; // one AudioContext per page for this module (browsers cap the count)

export class DrumKit {
  constructor() {
    this.ctx = null; this.out = null; this.noise = null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        shared = shared ?? new AC();
        this.ctx = shared;
        this.out = this.ctx.createGain();
        this.out.gain.value = 0.55;
        const comp = this.ctx.createDynamicsCompressor();
        this.out.connect(comp).connect(this.ctx.destination);
        const len = Math.floor(this.ctx.sampleRate * 1.2);
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
    } catch { this.ctx = null; }
    this.resume();
  }

  /** Try to unlock; safe to call from any input handler. */
  resume() { try { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); } catch { /* ignore */ } }
  get running() { return !!this.ctx && this.ctx.state === 'running'; }
  /** Output latency (s) between scheduling and the speaker; used to line visuals up with sound. */
  get latency() {
    if (!this.running) return 0;
    const l = (this.ctx.outputLatency || 0) || (this.ctx.baseLatency || 0);
    return Math.max(0, Math.min(0.12, l));
  }
  dispose() { try { this.out?.disconnect(); } catch { /* ignore */ } }

  // ---------------------------------------------------------------- voices
  _env(t, peak, decay, attack = 0.002) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(this.out);
    return g;
  }
  _noise(t, dur, filterType, freq, q, peak, decay) {
    const src = this.ctx.createBufferSource(); src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    src.connect(f).connect(this._env(t, peak, decay));
    src.start(t, Math.random() * 0.5); src.stop(t + dur);
  }
  _tone(t, type, f0, f1, peak, decay, glide = 0.08) {
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + glide);
    o.connect(this._env(t, peak, decay));
    o.start(t); o.stop(t + decay + 0.05);
  }

  /** Metallic cymbal partials (inharmonic squares through a highpass), 808-style. */
  _metal(t, base, decay, peak) {
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
    hp.connect(this._env(t, peak, decay, 0.003));
    for (const r of [2, 3, 4.16, 5.43, 6.79, 8.21]) {
      const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = base * r;
      o.connect(hp); o.start(t); o.stop(t + decay + 0.05);
    }
  }

  /** Play a voice at audio time t (default: now). Unknown names are ignored. */
  play(name, t, vel = 1) {
    if (!this.running) return;
    const c = this.ctx; t = Math.max(c.currentTime, t ?? c.currentTime);
    switch (name) {
      case 'bass':
        this._tone(t, 'sine', 115, 42, 0.95 * vel, 0.45, 0.12);
        this._noise(t, 0.03, 'lowpass', 1200, 0.7, 0.3 * vel, 0.02);
        break;
      case 'snare':
        this._noise(t, 0.25, 'highpass', 1800, 0.8, 0.6 * vel, 0.17);
        this._noise(t, 0.08, 'bandpass', 3500, 1.5, 0.35 * vel, 0.05);
        this._tone(t, 'triangle', 240, 170, 0.35 * vel, 0.08, 0.05);
        break;
      case 'quadLo':
        this._tone(t, 'sine', 260, 205, 0.6 * vel, 0.24, 0.1);
        this._noise(t, 0.03, 'bandpass', 2000, 1, 0.15 * vel, 0.02);
        break;
      case 'quadHi':
        this._tone(t, 'sine', 390, 315, 0.55 * vel, 0.2, 0.08);
        this._noise(t, 0.03, 'bandpass', 2800, 1, 0.15 * vel, 0.02);
        break;
      // ---- the four player lanes: left/right drum, left/right cymbal
      case 'drumL': // deeper snare, left hand
        this._noise(t, 0.22, 'highpass', 1400, 0.8, 0.5 * vel, 0.15);
        this._tone(t, 'triangle', 210, 150, 0.5 * vel, 0.12, 0.06);
        this._tone(t, 'sine', 120, 70, 0.4 * vel, 0.16, 0.08);
        break;
      case 'drumR': // brighter, tighter snare, right hand
        this._noise(t, 0.18, 'highpass', 2400, 0.9, 0.55 * vel, 0.11);
        this._noise(t, 0.06, 'bandpass', 4200, 1.6, 0.3 * vel, 0.04);
        this._tone(t, 'triangle', 330, 240, 0.4 * vel, 0.08, 0.04);
        break;
      case 'cymL': // crash: wide, washy
        this._metal(t, 310, 0.9, 0.22 * vel);
        this._noise(t, 1.0, 'highpass', 6000, 0.6, 0.28 * vel, 0.85);
        break;
      case 'cymR': // ride: pingy bell
        this._metal(t, 470, 0.45, 0.2 * vel);
        this._tone(t, 'sine', 2350, 2300, 0.12 * vel, 0.4, 0.05);
        this._noise(t, 0.3, 'bandpass', 9000, 1.2, 0.12 * vel, 0.25);
        break;
      case 'click':
        this._tone(t, 'square', 1900, 1700, 0.12 * vel, 0.03, 0.01);
        break;
      case 'hat':
        this._noise(t, 0.06, 'highpass', 7500, 0.7, 0.12 * vel, 0.04);
        break;
      case 'crash':
        this._noise(t, 1.8, 'highpass', 5200, 0.5, 0.35 * vel, 1.5);
        this._noise(t, 0.6, 'bandpass', 9000, 0.8, 0.2 * vel, 0.5);
        break;
      case 'miss':
        this._tone(t, 'triangle', 160, 110, 0.12 * vel, 0.08, 0.06);
        break;
    }
  }

  /** Soft brass "pit" chord (purple-and-gold flourish). notes = semitones from root (Bb2 by default). */
  brass(t, notes, dur = 0.4, vel = 1, root = 116.54) {
    if (!this.running) return;
    t = Math.max(this.ctx.currentTime, t ?? this.ctx.currentTime);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(500, t);
    f.frequency.linearRampToValueAtTime(2200, t + 0.06);
    f.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11 * vel, t + 0.03);
    g.gain.setValueAtTime(0.11 * vel, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(this.out);
    for (const n of notes) {
      for (const det of [-6, 6]) {
        const o = this.ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = root * Math.pow(2, n / 12); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + dur + 0.05);
      }
    }
  }
}

/**
 * Song clock: seconds since start(). Uses AudioContext.currentTime while audio runs (tight, sample-
 * accurate), else performance.now(). Switching source mid-song stays continuous.
 */
export class SongClock {
  constructor(kit) { this.kit = kit; this.src = null; this.offset = 0; this.last = 0; this.started = false; }
  _raw(src) { return src === 'audio' ? this.kit.ctx.currentTime : performance.now() / 1000; }
  _src() { return this.kit.running ? 'audio' : 'perf'; }
  /** Begin so that now() === at. */
  start(at = 0) { this.src = this._src(); this.offset = this._raw(this.src) - at; this.last = at; this.started = true; }
  now() {
    if (!this.started) return 0;
    const src = this._src();
    if (src !== this.src) { this.offset = this._raw(src) - this.last; this.src = src; }
    const t = this._raw(src) - this.offset;
    if (t > this.last) this.last = t;
    return this.last;
  }
  /** Convert song time to AudioContext time (for scheduling). Null if audio is off. */
  toAudio(songT) { return this.src === 'audio' && this.kit.running ? songT + this.offset : null; }
}
