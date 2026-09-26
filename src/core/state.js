// Der Spielzustand: alles, was gespeichert wird, als reine Daten.
// Änderungen am Aufbau: SAVE_VERSION erhöhen und Migration in save.js ergänzen.

import { RESOURCES, HOTBAR_SIZE } from '../data/items.js';

export const SAVE_VERSION = 1;

/** Minuten pro Spieltag. Ein Spieltag beginnt um 06:00. */
export const DAY_MINUTES = 24 * 60;

export function createNewState(config) {
  const slots = new Array(HOTBAR_SIZE).fill(null);
  slots[0] = 'laterne';
  return {
    version: SAVE_VERSION,
    time: { day: 1, minute: config.time.newGameMinute },
    player: { x: -0.625, z: 0.25, facing: 0, lantern: false },
    inventory: { holz: 4, stein: 2, fasern: 3, schrott: 1, stoff: 1, technik: 0 },
    hotbar: { slots, selected: 1 },
    flags: {},
    stats: { nightsSlept: 0 },
  };
}

/** Minuten seit 06:00 -> Uhrzeit in Stunden (0..24). */
export function hoursOf(minute) {
  return (6 + minute / 60) % 24;
}

/** Minuten seit 06:00 -> "HH:MM". */
export function clockText(minute) {
  const total = Math.floor(minute + 6 * 60) % DAY_MINUTES;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Geladene Daten gegen die aktuelle Struktur absichern: fehlende oder
 * kaputte Felder werden durch Standardwerte ersetzt.
 */
export function sanitizeState(data, config) {
  const base = createNewState(config);
  const num = (v, fallback, min = -Infinity, max = Infinity) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  const out = base;
  if (!data || typeof data !== 'object') return out;
  out.time.day = Math.floor(num(data.time?.day, base.time.day, 1, 1e6));
  out.time.minute = num(data.time?.minute, base.time.minute, 0, DAY_MINUTES - 0.001);
  out.player.x = num(data.player?.x, base.player.x, -40, 40);
  out.player.z = num(data.player?.z, base.player.z, -40, 40);
  out.player.facing = num(data.player?.facing, 0, -10, 10);
  out.player.lantern = Boolean(data.player?.lantern);
  for (const r of RESOURCES) out.inventory[r] = Math.floor(num(data.inventory?.[r], base.inventory[r], 0, 99999));
  if (Array.isArray(data.hotbar?.slots)) {
    out.hotbar.slots = base.hotbar.slots.map((fallback, i) => {
      const v = data.hotbar.slots[i];
      return typeof v === 'string' || v === null ? v : fallback;
    });
  }
  out.hotbar.selected = Math.floor(num(data.hotbar?.selected, base.hotbar.selected, 0, HOTBAR_SIZE - 1));
  if (data.flags && typeof data.flags === 'object') {
    for (const [k, v] of Object.entries(data.flags)) if (typeof v === 'boolean' || typeof v === 'number') out.flags[k] = v;
  }
  out.stats.nightsSlept = Math.floor(num(data.stats?.nightsSlept, 0, 0, 1e6));
  return out;
}
