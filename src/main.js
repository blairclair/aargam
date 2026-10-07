// Boot. Owned by: supervisor.
import { Game } from './core/engine.js';
import { SCENES } from './scenes.js';
import { initAudio } from './audio/sfx.js';
import { ROOM_IDS, SKILLS } from './core/theme.js';
import { saveGame } from './core/state.js';

const canvas = document.getElementById('game');
const game = new Game(canvas, SCENES);
window.__game = game; // debug handle: __game.switchScene('room', {...}) from devtools

// Dev deep links (see docs/ARCHITECTURE.md):
//   ?scene=room&roomId=kitchen&hero=victoria&loadout=hot_pan,unplug
//   ?scene=minigame&roomId=dining      ?scene=cutscene&id=opening      ?scene=hub&dev=unlock3
//   dev=allskills  -> both heroes know every skill          dev=unlockN -> first N rooms marked done
const q = new URLSearchParams(location.search);

function applyDev(dev) {
  const s = game.state;
  if (!dev) return;
  if (dev.includes('allskills')) for (const sk of Object.values(SKILLS)) if (!s.skills[sk.hero].includes(sk.id)) s.skills[sk.hero].push(sk.id);
  const m = dev.match(/unlock(\d)/);
  if (m) ROOM_IDS.slice(0, Number(m[1])).forEach((id) => { s.rooms[id].done = true; s.rooms[id].stars = 2; });
  saveGame(s);
}

game.assets.loadAll().then(() => {
  initAudio(game);
  applyDev(q.get('dev'));
  if (q.get('scene')) {
    const params = Object.fromEntries(q.entries());
    for (const k of ['attempt', 'stars', 'partyScore']) if (params[k] != null) params[k] = Number(params[k]);
    if (params.loadout != null) params.loadout = params.loadout ? params.loadout.split(',') : [];
    if (params.scene === 'cutscene' && !params.next) params.next = { scene: 'hub' };
    game.start(params.scene, params);
  } else {
    game.start('title');
  }
  canvas.focus();
});
