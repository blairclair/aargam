// Shared helpers for the games-d minigames (Drumline, Card Duel). Owned by: games-d.
import { PALETTE, HEROES } from '../../core/theme.js';

export const RAVENS = {
  purple: '#4b2a8c',
  purpleLite: '#7b55d6',
  purpleDeep: '#26124d',
  gold: '#e3b52b',
  goldLite: '#ffd96a',
  black: '#17121f',
};

/** Normalize MinigameParams: perks may arrive as an array or (deep link) a comma string. */
export function readParams(p = {}) {
  const perks = Array.isArray(p.perks) ? p.perks : String(p.perks ?? '').split(',').filter(Boolean);
  const attempt = Math.max(1, Number(p.attempt) || 1);
  const hero = HEROES[p.hero] ? p.hero : 'aaron';
  return { roomId: p.roomId, hero, attempt, perks, playlist: perks.includes('playlist') };
}

/**
 * Hero photo bust in a corner that reacts. mood: 'idle' | 'happy' | 'oops' | 'cheer'.
 * k = 0..1 strength of the current reaction (decays in caller). beat = 0..1 phase for a little bop.
 */
export function drawBust(ctx, game, hero, x, y, o = {}) {
  const img = game.assets?.image?.(HEROES[hero]?.busts?.smile ?? `bust.${hero}.smile`);
  const size = o.size ?? 120;
  const k = o.k ?? 0, mood = o.mood ?? 'idle', beat = o.beat ?? 0;
  ctx.save();
  // backing circle
  ctx.translate(x, y);
  const bop = Math.pow(1 - beat, 3) * 3;
  let rot = 0, sc = 1, dy = -bop, dx = 0;
  if (mood === 'happy' || mood === 'cheer') { sc = 1 + 0.08 * k; dy -= 8 * k; rot = Math.sin(k * 9) * 0.06 * k; }
  if (mood === 'oops') { dx = Math.sin(k * 40) * 4 * k; rot = -0.1 * k; }
  ctx.fillStyle = 'rgba(16,19,31,0.55)';
  ctx.beginPath(); ctx.arc(0, 0, size * 0.48, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = o.ring ?? PALETTE.sun; ctx.lineWidth = 3;
  ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, size * 0.48, 0, Math.PI * 2); ctx.clip();
  ctx.translate(dx, dy); ctx.rotate(rot); ctx.scale(sc, sc);
  if (img) {
    const h = size * 1.05, w = h * (img.width / img.height);
    ctx.drawImage(img, -w / 2, -h * 0.5, w, h);
  } else {
    ctx.fillStyle = HEROES[hero]?.look?.skin ?? '#f2c7a5';
    ctx.beginPath(); ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // reaction badge
  if (k > 0.05 && mood !== 'idle') {
    ctx.globalAlpha = Math.min(1, k * 2);
    const bx = size * 0.36, by = -size * 0.36;
    ctx.fillStyle = mood === 'oops' ? PALETTE.danger : PALETTE.sun;
    ctx.beginPath(); ctx.arc(bx, by, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.ink; ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(mood === 'oops' ? '!' : mood === 'cheer' ? '★' : '♪', bx, by + 1);
  }
  ctx.restore();
}

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function easeOutBack(k) { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
