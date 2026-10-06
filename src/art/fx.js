// FX CONTRACT — Owned by: art/ui/audio team. Signatures FROZEN; internals placeholder.
// Usage (action scene): const fx = new Fx(); fx.burst(x,y,'#fff'); fx.update(dt); fx.render(ctx);
// Render inside the same camera transform as the world.
export class Fx {
  constructor() { this.parts = []; this.texts = []; this.shake = 0; }
  /** Particle burst. */
  burst(x, y, color = '#fff', count = 10, speed = 120) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, max: 0.5, color });
    }
  }
  /** Floating text (damage numbers, "+3 scoops"). */
  floatText(x, y, text, color = '#fff') { this.texts.push({ x, y, text, color, life: 0.9 }); }
  /** Screen shake amount in px; read fx.shakeOffset() when building the camera transform. */
  addShake(px) { this.shake = Math.max(this.shake, px); }
  shakeOffset() { return { x: (Math.random() - 0.5) * this.shake, y: (Math.random() - 0.5) * this.shake }; }
  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 30);
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    for (const t of this.texts) { t.y -= 30 * dt; t.life -= dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    this.texts = this.texts.filter((t) => t.life > 0);
  }
  render(ctx) {
    for (const p of this.parts) { ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    for (const t of this.texts) { ctx.globalAlpha = Math.min(1, t.life * 2); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y); }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
}
