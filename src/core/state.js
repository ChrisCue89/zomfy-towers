// Der Spielzustand: alles, was gespeichert wird, als reine Daten.
// Änderungen am Aufbau: SAVE_VERSION erhöhen und Migration in save.js ergänzen.

import { RESOURCES, HOTBAR_SIZE, ITEMS } from '../data/items.js';
import { WEAPON_ORDER } from '../data/weapons.js';
import { PERKS, PERK_IDS } from '../data/perks.js';

export const SAVE_VERSION = 4;

/** Minuten pro Spieltag. Ein Spieltag beginnt um 06:00. */
export const DAY_MINUTES = 24 * 60;

export function createNewState(config) {
  const slots = new Array(HOTBAR_SIZE).fill(null);
  return {
    version: SAVE_VERSION,
    time: { day: 1, minute: config.time.newGameMinute },
    player: { x: -0.625, z: 0.25, facing: 0, lantern: false, hp: 100, xp: 0, level: 1 },
    inventory: { holz: 4, stein: 2, fasern: 3, stoff: 1, schrott: 1, zahnraeder: 0, moderkerne: 0 },
    hotbar: { slots, selected: 0 },
    tools: { axt: false, spitzhacke: false },
    upgrades: { radius: 0, leben: 0, schlag: 0, tempo: 0 },
    weapons: {}, // gebaute Waffen: Name -> Stufe (1–3)
    perks: {}, // gewählte Perks: Name -> Stufe
    perkChoice: null, // offene Perk-Wahl (drei Namen), falls beim Speichern noch nicht gewählt
    world: { houseLevel: 1, homeHp: 300, buildings: [], nodes: {}, searched: {}, dayEvents: null },
    // Die Nacht des Tages n: laufende Welle, geschafft?, Bilanz für den Morgenbericht
    night: { n: 0, wave: 0, done: true, won: false, kills: 0, loot: {}, homeStart: 300 },
    horde: [], // lebende Schlurfer (zum Weiterspielen nach dem Neuladen)
    hordeQueue: [], // noch ausstehende Schlurfer der laufenden Welle
    loot: [], // Loot am Boden
    report: null, // Morgenbericht, der noch gezeigt werden muss
    flags: {},
    stats: { nightsSlept: 0, gathered: 0, built: 0, kills: 0, nightsWon: 0, nightsLost: 0 },
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
  out.player.hp = num(data.player?.hp, 100, 1, 1000);
  out.player.xp = num(data.player?.xp, 0, 0, 1e7);
  out.player.level = Math.floor(num(data.player?.level, 1, 1, 99));
  for (const r of RESOURCES) out.inventory[r] = Math.floor(num(data.inventory?.[r], base.inventory[r], 0, 99999));
  if (Array.isArray(data.hotbar?.slots)) {
    out.hotbar.slots = base.hotbar.slots.map((fallback, i) => {
      const v = data.hotbar.slots[i];
      return (typeof v === 'string' && ITEMS[v]) || v === null ? v : fallback;
    });
  }
  out.hotbar.selected = Math.floor(num(data.hotbar?.selected, base.hotbar.selected, 0, HOTBAR_SIZE - 1));
  if (data.flags && typeof data.flags === 'object') {
    for (const [k, v] of Object.entries(data.flags)) if (typeof v === 'boolean' || typeof v === 'number') out.flags[k] = v;
  }
  out.stats.nightsSlept = Math.floor(num(data.stats?.nightsSlept, 0, 0, 1e6));
  out.stats.gathered = Math.floor(num(data.stats?.gathered, 0, 0, 1e9));
  out.stats.built = Math.floor(num(data.stats?.built, 0, 0, 1e9));
  out.stats.kills = Math.floor(num(data.stats?.kills, 0, 0, 1e9));
  out.stats.nightsWon = Math.floor(num(data.stats?.nightsWon, 0, 0, 1e6));
  out.stats.nightsLost = Math.floor(num(data.stats?.nightsLost, 0, 0, 1e6));
  for (const k of Object.keys(out.upgrades)) out.upgrades[k] = Math.floor(num(data.upgrades?.[k], 0, 0, 3));
  for (const k of WEAPON_ORDER) if (Number.isFinite(data.weapons?.[k])) out.weapons[k] = Math.floor(num(data.weapons[k], 1, 1, 3));
  for (const k of PERK_IDS) if (Number.isFinite(data.perks?.[k])) out.perks[k] = Math.floor(num(data.perks[k], 0, 0, PERKS[k].max));
  if (Array.isArray(data.perkChoice)) {
    const choice = data.perkChoice.filter((id) => PERK_IDS.includes(id)).slice(0, 3);
    out.perkChoice = choice.length ? choice : null;
  }
  out.tools.axt = Boolean(data.tools?.axt);
  out.tools.spitzhacke = Boolean(data.tools?.spitzhacke);
  const w = data.world || {};
  out.world.houseLevel = Math.floor(num(w.houseLevel, 1, 1, 2));
  out.world.homeHp = num(w.homeHp, out.world.houseLevel >= 2 ? 450 : 300, 0, 5000);
  if (w.dayEvents && Number.isFinite(w.dayEvents.day)) out.world.dayEvents = { day: Math.floor(w.dayEvents.day), done: Math.floor(num(w.dayEvents.done, 0, 0, 99)) };
  const n = data.night || {};
  out.night = {
    n: Math.floor(num(n.n, 0, 0, 1e6)),
    wave: Math.floor(num(n.wave, 0, 0, 99)),
    done: n.done !== false,
    won: Boolean(n.won),
    kills: Math.floor(num(n.kills, 0, 0, 1e6)),
    loot: {},
    homeStart: num(n.homeStart, out.world.homeHp, 0, 5000),
  };
  for (const r of RESOURCES) if (Number.isFinite(n.loot?.[r])) out.night.loot[r] = Math.floor(n.loot[r]);
  const listOf = (v) => (Array.isArray(v) ? v.filter((e) => e && typeof e === 'object') : []);
  out.horde = listOf(data.horde).filter((z) => typeof z.type === 'string' && Number.isFinite(z.x) && Number.isFinite(z.z)).slice(0, 300);
  out.hordeQueue = listOf(data.hordeQueue).slice(0, 300);
  out.loot = listOf(data.loot).filter((l) => typeof l.res === 'string' && Number.isFinite(l.x) && Number.isFinite(l.z)).slice(0, 300);
  out.report = data.report && typeof data.report === 'object' ? data.report : null;
  if (Array.isArray(w.buildings)) {
    out.world.buildings = w.buildings
      .filter((b) => b && typeof b.type === 'string' && Number.isFinite(b.i) && Number.isFinite(b.j))
      .map((b) => {
        const entry = { id: Math.floor(num(b.id, 0, 0, 1e9)), type: b.type, i: Math.floor(b.i), j: Math.floor(b.j), turns: Math.floor(num(b.turns, 0, 0, 3)) };
        if (Number.isFinite(b.day)) entry.day = Math.floor(b.day);
        if (Number.isFinite(b.level)) entry.level = Math.floor(num(b.level, 1, 1, 5));
        if (b.spec === 'A' || b.spec === 'B') entry.spec = b.spec;
        if (Number.isFinite(b.hp)) entry.hp = num(b.hp, 100, 0, 1000);
        return entry;
      });
  }
  if (w.nodes && typeof w.nodes === 'object') {
    for (const [k, v] of Object.entries(w.nodes)) if (v && Number.isFinite(v.until)) out.world.nodes[k] = { until: Math.floor(v.until) };
  }
  if (w.searched && typeof w.searched === 'object') {
    for (const [k, v] of Object.entries(w.searched)) if (Number.isFinite(v)) out.world.searched[k] = Math.floor(v);
  }
  return out;
}
