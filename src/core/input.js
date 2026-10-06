// Action-mapped input. Owned by: supervisor.
// Use input.down('attack') for held, input.pressed('attack') for this-frame edge.
// Mouse coords are in 960x540 logical space.

export const BINDINGS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  attack: ['KeyJ', 'Mouse0'],
  ability: ['ShiftLeft', 'ShiftRight', 'KeyK', 'Mouse2'],
  special: ['KeyE', 'KeyL'],
  swap: ['KeyQ', 'Tab'],
  confirm: ['Enter', 'Space'],
  back: ['Escape', 'Backspace'],
  pause: ['Escape', 'KeyP'],
};

export class Input {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.held = new Set();
    this.justPressed = new Set();
    this.mouse = { x: 0, y: 0, down: false, pressed: false, rightPressed: false };
    const codeOf = (e) => e.code;
    window.addEventListener('keydown', (e) => {
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(e.code)) e.preventDefault();
      if (!this.held.has(codeOf(e))) this.justPressed.add(codeOf(e));
      this.held.add(codeOf(e));
    });
    window.addEventListener('keyup', (e) => this.held.delete(codeOf(e)));
    window.addEventListener('blur', () => this.held.clear());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousemove', (e) => this._move(e));
    canvas.addEventListener('mousedown', (e) => {
      this._move(e);
      canvas.focus();
      const code = `Mouse${e.button}`;
      this.held.add(code);
      this.justPressed.add(code);
      if (e.button === 0) { this.mouse.down = true; this.mouse.pressed = true; }
      if (e.button === 2) this.mouse.rightPressed = true;
    });
    window.addEventListener('mouseup', (e) => {
      this.held.delete(`Mouse${e.button}`);
      if (e.button === 0) this.mouse.down = false;
    });
  }

  _move(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - r.left) / r.width) * this.game.width;
    this.mouse.y = ((e.clientY - r.top) / r.height) * this.game.height;
  }

  down(action) { return (BINDINGS[action] || [action]).some((c) => this.held.has(c)); }
  pressed(action) { return (BINDINGS[action] || [action]).some((c) => this.justPressed.has(c)); }

  /** Normalized movement vector from up/down/left/right. */
  axis() {
    let x = (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0);
    let y = (this.down('down') ? 1 : 0) - (this.down('up') ? 1 : 0);
    const l = Math.hypot(x, y);
    if (l > 0) { x /= l; y /= l; }
    return { x, y };
  }

  endFrame() {
    this.justPressed.clear();
    this.mouse.pressed = false;
    this.mouse.rightPressed = false;
  }
}
