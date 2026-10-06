// Boot. Owned by: supervisor.
import { Game } from './core/engine.js';
import { SCENES } from './scenes.js';
import { initAudio } from './audio/sfx.js';

const canvas = document.getElementById('game');
const game = new Game(canvas, SCENES);
window.__game = game; // debug handle: __game.switchScene('level', {...}) from devtools

// Dev shortcut: index.html?scene=level&region=oldcity&kind=skirmish&difficulty=2
const q = new URLSearchParams(location.search);

game.assets.loadAll().then(() => {
  initAudio(game);
  if (q.get('scene')) {
    const params = Object.fromEntries(q.entries());
    if (params.difficulty) params.difficulty = Number(params.difficulty);
    if (params.seed) params.seed = Number(params.seed);
    game.start(q.get('scene'), params);
  } else {
    game.start('title');
  }
  canvas.focus();
});
