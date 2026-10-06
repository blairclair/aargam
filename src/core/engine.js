// Game loop + scene manager. Owned by: supervisor.
import { WIDTH, HEIGHT } from './theme.js';
import { Input } from './input.js';
import { EventBus } from './events.js';
import { Assets } from './assets.js';
import { loadGame, newGame } from './state.js';

const STEP = 1 / 60;

/**
 * Scene contract — every scene module default-exports a class like:
 *   class MyScene {
 *     constructor(game) {}
 *     enter(params) {}   // called on switch; params is whatever the caller passed
 *     exit() {}
 *     update(dt) {}      // fixed 1/60s step
 *     render(ctx) {}     // ctx is 960x540 logical space
 *   }
 */
export class Game {
  constructor(canvas, sceneClasses) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = WIDTH;
    this.height = HEIGHT;
    this.input = new Input(canvas, this);
    this.events = new EventBus();
    this.assets = new Assets();
    this.state = loadGame() ?? newGame();
    this.time = 0;
    this.sceneClasses = sceneClasses;
    this.sceneCache = new Map();
    this.scene = null;
    this.sceneKey = null;
    this.paused = false;
    this._acc = 0;
    this._last = 0;
    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();
  }

  /** Switch to a scene by key (see src/scenes.js). Scenes are cached singletons. */
  switchScene(key, params = {}) {
    const Cls = this.sceneClasses[key];
    if (!Cls) throw new Error(`Unknown scene "${key}"`);
    if (this.scene?.exit) this.scene.exit();
    let s = this.sceneCache.get(key);
    if (!s) { s = new Cls(this); this.sceneCache.set(key, s); }
    this.scene = s;
    this.sceneKey = key;
    this.events.emit('scene:changed', { key, params });
    if (s.enter) s.enter(params);
  }

  start(key, params) {
    this.switchScene(key, params);
    requestAnimationFrame((t) => { this._last = t; this._frame(t); });
  }

  _frame(t) {
    const dt = Math.min(0.25, (t - this._last) / 1000);
    this._last = t;
    this._acc += dt;
    while (this._acc >= STEP) {
      this.time += STEP;
      try { this.scene?.update?.(STEP); } catch (e) { this._crash(e); return; }
      this.input.endFrame();
      this._acc -= STEP;
    }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    try { this.scene?.render?.(ctx); } catch (e) { this._crash(e); return; }
    requestAnimationFrame((tt) => this._frame(tt));
  }

  _crash(e) {
    console.error(e);
    this.crashed = { scene: this.sceneKey, message: e.message, stack: String(e.stack || '') };
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#300';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText(`Crash in scene "${this.sceneKey}": ${e.message}`, 20, 40);
    String(e.stack || '').split('\n').slice(1, 12).forEach((l, i) => ctx.fillText(l.trim(), 20, 70 + i * 20));
  }

  _resize() {
    const scale = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
    this.canvas.style.width = `${Math.floor(WIDTH * scale)}px`;
    this.canvas.style.height = `${Math.floor(HEIGHT * scale)}px`;
  }
}
