// Speichern und Laden im Browser (localStorage), versioniert und mit Migrationen.

import { SAVE_VERSION, sanitizeState } from './state.js';

export const SAVE_KEY = 'zomfy-towers.spielstand';
const BROKEN_KEY = 'zomfy-towers.spielstand.defekt';

/** Migrationen: MIGRATIONS[n] wandelt einen Stand der Version n in Version n+1. */
const MIGRATIONS = {
  // v3 -> v4: Meilenstein 4 (Waffen, Erfahrung, Perks). Alles beginnt bei null.
  3: (data) => ({
    ...data,
    version: 4,
    player: { ...(data.player || {}), xp: 0, level: 1 },
    weapons: {},
    perks: {},
    perkChoice: null,
  }),
  // v2 -> v3: Meilenstein 3 (Nächte, Türme, Loot). Neue Felder mit Standardwerten;
  // die erste Nacht beginnt am aktuellen Tag.
  2: (data) => ({
    ...data,
    version: 3,
    player: { ...(data.player || {}), hp: 100 },
    upgrades: { radius: 0, leben: 0, schlag: 0, tempo: 0 },
    world: { ...(data.world || {}), homeHp: (data.world?.houseLevel || 1) >= 2 ? 450 : 300 },
    night: { n: 0, wave: 0, done: true, won: false, kills: 0, loot: {}, homeStart: 300 },
  }),
  // v1 -> v2: Meilenstein 2 (Sammeln, Crafting, Bauen). „Technik“ wird zu
  // Zahnrädern, die Laterne wandert aus der Schnellleiste in die linke Hand.
  1: (data) => {
    const inventory = { ...(data.inventory || {}) };
    inventory.zahnraeder = (inventory.zahnraeder || 0) + (inventory.technik || 0);
    delete inventory.technik;
    inventory.moderkerne = inventory.moderkerne || 0;
    const slots = Array.isArray(data.hotbar?.slots) ? data.hotbar.slots.map((v) => (v === 'laterne' ? null : v)) : [];
    return {
      ...data,
      version: 2,
      inventory,
      hotbar: { slots, selected: 0 },
      flags: { ...(data.flags || {}), introGesehen: true },
      tools: { axt: false, spitzhacke: false },
      world: { houseLevel: 1, buildings: [], nodes: {}, searched: {} },
      stats: { ...(data.stats || {}), gathered: 0, built: 0 },
    };
  },
};

function storage() {
  try {
    const s = globalThis.localStorage;
    const probe = '__zomfy_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function migrate(data) {
  let current = data;
  let version = Number(current.version) || 1;
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`Keine Migration von Version ${version}`);
    current = step(current);
    version = current.version;
  }
  return current;
}

export class SaveStore {
  constructor({ disabled = false, config }) {
    this.config = config;
    this.disabled = disabled;
    this.storage = disabled ? null : storage();
  }

  get available() {
    return Boolean(this.storage);
  }

  /** @returns {{status: 'ok'|'none'|'corrupt'|'unavailable'|'disabled', state?: object}} */
  load() {
    if (this.disabled) return { status: 'disabled' };
    if (!this.storage) return { status: 'unavailable' };
    let raw;
    try {
      raw = this.storage.getItem(SAVE_KEY);
    } catch {
      return { status: 'unavailable' };
    }
    if (!raw) return { status: 'none' };
    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') throw new Error('kein Objekt');
      if ((Number(data.version) || 1) > SAVE_VERSION) throw new Error('Spielstand aus einer neueren Version');
      const migrated = migrate(data);
      return { status: 'ok', state: sanitizeState(migrated, this.config) };
    } catch (error) {
      // Kaputten Stand beiseitelegen statt ihn zu überschreiben.
      try {
        this.storage.setItem(BROKEN_KEY, raw);
        this.storage.removeItem(SAVE_KEY);
      } catch {
        /* nichts zu retten */
      }
      return { status: 'corrupt', error };
    }
  }

  /** @returns {boolean} */
  save(state) {
    if (this.disabled || !this.storage) return false;
    try {
      const data = { ...state, version: SAVE_VERSION, savedAt: new Date().toISOString() };
      this.storage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    if (!this.storage) return;
    try {
      this.storage.removeItem(SAVE_KEY);
    } catch {
      /* egal */
    }
  }
}
