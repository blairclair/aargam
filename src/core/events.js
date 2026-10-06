// Tiny pub/sub. Owned by: supervisor. Event names are listed in docs/ARCHITECTURE.md.
export class EventBus {
  constructor() { this.map = new Map(); }
  on(name, fn) {
    if (!this.map.has(name)) this.map.set(name, new Set());
    this.map.get(name).add(fn);
    return () => this.off(name, fn);
  }
  off(name, fn) { this.map.get(name)?.delete(fn); }
  emit(name, payload) {
    for (const fn of [...(this.map.get(name) || [])]) {
      try { fn(payload); } catch (e) { console.error(`event ${name}`, e); }
    }
  }
}
