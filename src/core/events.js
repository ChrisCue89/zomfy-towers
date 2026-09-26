// Minimaler Ereignisbus, damit Systeme lose gekoppelt bleiben.

export class Events {
  constructor() {
    this.handlers = new Map();
  }

  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    const set = this.handlers.get(type);
    if (set) set.delete(handler);
  }

  emit(type, payload) {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const handler of [...set]) handler(payload);
  }
}
