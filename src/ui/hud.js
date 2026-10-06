// HUD CONTRACT — Owned by: art/ui/audio team. Signature FROZEN; internals placeholder.
// Action scene calls drawHUD(ctx, game, hud) every frame in SCREEN space (no camera).
import { HEROES } from '../core/theme.js';
import { drawPortrait } from '../art/sprites.js';
import { bar, text } from './widgets.js';

/**
 * @param {{
 *   active: 'aaron'|'victoria',
 *   heroes: { [id: string]: { hp: number, maxHp: number, cooldowns: { ability: number, special: number } } }, // cooldowns: 0..1 remaining fraction
 *   objective: string,            // e.g. "Defeat all Frostlings (4 left)"
 *   progress?: number,            // 0..1 objective progress, optional
 *   scoops: number,               // collected this mission
 *   bossHp?: { name: string, frac: number },
 * }} hud
 */
export function drawHUD(ctx, game, hud) {
  let x = 16;
  for (const id of Object.keys(hud.heroes)) {
    const h = hud.heroes[id];
    const active = id === hud.active;
    drawPortrait(ctx, game, id, x + 24, 40, active ? 24 : 18);
    text(ctx, HEROES[id].name, x + 54, 30);
    bar(ctx, x + 54, 38, 120, 10, h.hp / h.maxHp);
    x += 200;
  }
  text(ctx, hud.objective ?? '', game.width - 16, 30, { align: 'right' });
  text(ctx, `Scoops: ${hud.scoops ?? 0}`, game.width - 16, 54, { align: 'right' });
  if (hud.bossHp) bar(ctx, 230, game.height - 30, 500, 14, hud.bossHp.frac, '#6fb7e8');
}
