// Speichern und Laden im Browser (localStorage), versioniert und mit Migrationen.

import { newCardState } from './cardNight.js';
import { INTERIOR_ENTRY } from '../world/interior.js';
import { SAVE_VERSION, sanitizeState } from './state.js';
import { BUILDINGS } from '../data/buildings.js';
import { towerInvested, towerBuildCost } from '../data/towers.js';
import { LAYOUT } from '../world/layout.js';
import { blueprintOptions, blueprintSeed } from '../data/blueprints.js';
import { WANDERER_ORDER, arrivalPlan } from '../data/wanderers.js';

/** So viel kostete eine Barrikade vor M9.1 – alte Stände bekommen das zurück. */
const OLD_BARRICADE_COST = { holz: 3 };

/** Ein neuer Startwert für das Wegenetz. */
export function randomMapSeed() {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}

/**
 * v7 -> v8: Meilenstein 9 (die Bucht und die Wege). Die Karte ist neu:
 * Türme und Barrikaden gibt es voll zurück (sie gehören jetzt neben bzw. auf
 * die Wege), die übrigen Bauten stellt das Spiel beim Laden in der Bucht neu
 * auf (world.relocate). Quellen, Überreste und Horde beginnen frisch; Mika
 * steht vor der Tür. Wer das Autowrack ausgeräumt hat, findet im Bootswrack
 * nichts mehr.
 */
function migrateToBay(data) {
  const refund = {};
  const add = (cost) => {
    for (const [res, n] of Object.entries(cost || {})) refund[res] = (refund[res] || 0) + n;
  };
  const keep = [];
  const towersSeen = {};
  for (const b of Array.isArray(data.world?.buildings) ? data.world.buildings : []) {
    const def = b && BUILDINGS[b.type];
    if (!def) continue;
    if (def.tower) {
      const n = towersSeen[b.type] || 0;
      towersSeen[b.type] = n + 1;
      const level = Math.max(1, Math.min(5, Math.floor(b.level || 1)));
      const invested = towerInvested(b.type, level, b.spec === 'A' || b.spec === 'B' ? b.spec : 'A');
      const first = towerInvested(b.type, 1, null);
      add(towerBuildCost(b.type, n));
      for (const [res, v] of Object.entries(invested)) refund[res] = (refund[res] || 0) + v - (first[res] || 0);
    } else if (def.defense) {
      add(b.type === 'barrikade' ? OLD_BARRICADE_COST : def.cost);
    } else {
      keep.push(b);
    }
  }
  const inventory = { ...(data.inventory || {}) };
  for (const [res, n] of Object.entries(refund)) inventory[res] = (inventory[res] || 0) + n;
  const flags = { ...(data.flags || {}), umgezogen: true };
  if (flags.autoLeer) flags.wrackLeer = true;
  if (flags.autoGesehen) flags.wrackGesehen = true;
  return {
    ...data,
    version: 8,
    inventory,
    player: { ...(data.player || {}), x: LAYOUT.start.x, z: LAYOUT.start.z, facing: LAYOUT.start.facing },
    world: { ...(data.world || {}), mapSeed: randomMapSeed(), relocate: true, buildings: keep, nodes: {}, searched: {} },
    horde: [],
    hordeQueue: [],
    loot: [],
    flags,
  };
}

export const SAVE_KEY = 'zomfy-towers.spielstand';
const BROKEN_KEY = 'zomfy-towers.spielstand.defekt';

/** Migrationen: MIGRATIONS[n] wandelt einen Stand der Version n in Version n+1. */
const MIGRATIONS = {
  // v18 -> v19: M25 (Ein Herbst mit Ende). Der Frost kam noch nicht – auch wer schon
  // über Tag 30 hinaus spielt, bekommt die Frostnacht noch (in der nächsten Nacht).
  // v19 -> v20: M25, Teil 2 (Herbstbuch). Sterne, Arten und gerufene Wellen beginnen bei null;
  // Taten, die der Stand schon erfüllt, trägt das Buch nach dem Laden leise ein.
  // v20 -> v21: M27 (Gäste und Plätze). Die Wanderer sind noch unterwegs; ihre Ankünfte
  // beginnen frühestens morgen – ein alter Stand verpasst keinen, und keiner steht plötzlich da.
  // v21 -> v22: M28 (Kartenabend). Noch kein Abend gespielt, die Rückseite »Herbstlaub«.
  21: (data) => ({ ...data, version: 22, cards: newCardState() }),
  20: (data) => ({ ...data, version: 21, guests: { plan: arrivalPlan((data.world?.mapSeed ?? 0) >>> 0, WANDERER_ORDER, (data.time?.day || 1) + 1) } }),
  19: (data) => ({ ...data, version: 20, book: { stars: {}, deeds: {}, kinds: {}, called: 0 } }),
  18: (data) => ({ ...data, version: 19, autumn: { frost: null, mode: 'herbst', credits: false } }),
  // v17 -> v18: M24 (Wagnis und Vorrat). Noch keine makellose Nacht in Folge, kein Schatz.
  17: (data) => ({ ...data, version: 18, risk: { streak: 0, treasure: false } }),
  // v16 -> v17: M23 (Gemeinsam durch die Nacht). Noch kein Nebenauftrag, kein Fest;
  // Hochsitze gibt es erst ab jetzt (kein Bau trägt schon einen Posten).
  16: (data) => ({ ...data, version: 17, quests: { active: null, done: [] }, feast: 0 }),
  // v14 -> v15: M20 (Mischtürme). Das Werkstattbuch beginnt leer.
  // v15 -> v16: M21 (Turmteile mit Seltenheit). Ein Turm trägt seine Teile als Liste
  // (ein Fach, ab Stufe 4 zwei) – aus `part` wird `parts`.
  15: (data) => ({
    ...data,
    version: 16,
    world: {
      ...data.world,
      buildings: Array.isArray(data.world?.buildings)
        ? data.world.buildings.map((b) => {
            if (!b || typeof b !== 'object' || !b.part) return b;
            const { part, ...rest } = b;
            return { ...rest, parts: [part] };
          })
        : data.world?.buildings,
    },
  }),
  14: (data) => ({ ...data, version: 15, recipes: {} }),
  // v13 -> v14: M19 (Baupläne). Wer schon eine Nacht gewonnen hat, darf gleich den
  // ersten Bauplan wählen – sonst gäbe es den ersten erst nach der nächsten Nacht.
  13: (data) => {
    const won = Math.max(0, Math.floor(data.stats?.nightsWon || 0));
    const choice = won > 0 ? { options: blueprintOptions([], won, blueprintSeed(data.world?.mapSeed, won, 0)), from: 'nacht' } : null;
    return { ...data, version: 14, blueprints: [], blueprintChoice: choice };
  },
  // v12 -> v13: M18 (Zustände und Reaktionen). Das Notizbuch beginnt leer.
  12: (data) => ({ ...data, version: 13, notes: {} }),
  // v11 -> v12: M17 (Tor und Wall). Neue Bauarten wall3, wall4 und tor – das Spiel stellt
  // den Weidenzaun mit Tor beim Laden auf und gibt zurück, was auf der Linie stand.
  11: (data) => ({ ...data, version: 12 }),
  // v10 -> v11: M16 (Die Nacht in der Hand). Bisherige Stände spielen »ausgewogen«,
  // Mika hat den Laternenblitz; eine fällige Fähigkeiten-Wahl kommt beim nächsten ruhigen Moment.
  10: (data) => ({ ...data, version: 11, difficulty: 'ausgewogen', skills: { slots: ['laternenblitz', null], ranks: { laternenblitz: 1 } }, skillChoice: null }),
  // v9 -> v10: Meilenstein 11 (Innenraum als eigenes Bild). Wer im alten Haus stand,
  // steht jetzt im Innenraum hinter der Tür (das Haus von außen hat kein Inneres mehr).
  9: (data) => {
    const p = data.player || {};
    const inOldHouse = typeof p.x === 'number' && typeof p.z === 'number' && p.x > 4.5 && p.x < 11.75 && p.z > -9.0 && p.z < -5.5;
    return { ...data, version: 10, player: inOldHouse ? { ...p, x: INTERIOR_ENTRY.x, z: INTERIOR_ENTRY.z, facing: Math.PI } : p };
  },
  // v8 -> v9: Meilenstein 10 (besondere Turmteile). Noch keiner im Vorrat, kein Turm trägt eins.
  8: (data) => ({ ...data, version: 9, towerParts: {} }),
  7: migrateToBay,
  // v6 -> v7: Meilenstein 8 (Zombieteile, Balduin, Autowrack nur einmal). Wer das
  // Wrack schon durchsucht hat, findet dort nichts mehr; Zombieteile beginnen bei null.
  6: (data) => ({
    ...data,
    version: 7,
    inventory: { ...(data.inventory || {}), teile: 0 },
    world: { ...(data.world || {}), trader: { day: 0, sold: {} } },
    flags: { ...(data.flags || {}), ...(data.world?.searched?.auto !== undefined ? { autoLeer: true } : {}) },
  }),
  // v5 -> v6: Meilenstein 7 (Name und Aussehen vom Titelbild). Bisherige Stände
  // behalten Mika, wie sie war.
  5: (data) => ({
    ...data,
    version: 6,
    player: { ...(data.player || {}), name: 'Mika', look: { hat: 'orange', jacket: 'gruen', hair: 'braun', skin: 'mittel' } },
  }),
  // v4 -> v5: Meilenstein 6 (Überlebende, Funkturm, Einrichten). Die Überlebenden
  // kommen nach und nach ab dem nächsten Tag – nicht alle auf einmal.
  4: (data) => ({
    ...data,
    version: 5,
    world: { ...(data.world || {}), tower: 0, furniture: [], tradeDay: 0, yusufNight: 0, survivorsStart: Math.max(0, (data.time?.day || 1) - 1) },
    survivors: {},
  }),
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
