// AUDIO CONTRACT — Owned by: art/ui/audio team. Signatures FROZEN; internals placeholder.
// All audio is synthesized with WebAudio (no files). Names are listed in theme.SFX / theme.MUSIC.
let ctx = null;

/** Called once at boot. Must not throw if audio is unavailable. AudioContext must be resumed on first user gesture. */
export function initAudio(game) {
  const unlock = () => {
    try { ctx = ctx ?? new AudioContext(); ctx.resume(); } catch { /* no audio */ }
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

/** Fire-and-forget sound effect. Unknown names are ignored. */
export function playSfx(name, opts = {}) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = 440; g.gain.value = 0.03;
  o.connect(g).connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.05);
}

/** Start/replace looping music track; null stops music. */
export function playMusic(name) { /* placeholder */ }

export function setVolume({ master, music, sfx } = {}) { /* placeholder */ }
