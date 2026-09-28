// Der Spielzustand: alles, was gespeichert wird, als reine Daten.
// Änderungen am Aufbau: SAVE_VERSION erhöhen und Migration in save.js ergänzen.

import { BUILDINGS, HOUSE_LEVELS, HOUSE_MAX, GEAR } from '../data/buildings.js';
import { INTERIOR_ENTRY, INTERIOR_EXTENT } from '../world/interior.js';
import { RESOURCES, HOTBAR_SIZE, ITEMS } from '../data/items.js';
import { WEAPON_ORDER } from '../data/weapons.js';
import { PERKS, PERK_IDS } from '../data/perks.js';
import { SURVIVOR_ORDER } from '../data/survivors.js';
import { FURNITURE } from '../data/furniture.js';
import { LOOKS, LOOK_KEYS, DEFAULT_LOOK, cleanName } from '../data/looks.js';
import { TRADER_OFFERS } from '../data/trader.js';
import { TOWER_PARTS, TOWER_PART_IDS } from '../data/towers.js';
import { LAYOUT } from '../world/layout.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from '../data/difficulty.js';
import { SKILLS, SKILL_IDS, SKILL_MAX_RANK, START_SKILL, freshSkills } from '../data/skills.js';
import { REACTIONS } from '../data/reactions.js';
import { BLUEPRINTS, BLUEPRINT_CHOICES } from '../data/blueprints.js';
import { MIXES } from '../data/mixes.js';
import { TOWERS } from '../data/towers.js';

export const SAVE_VERSION = 16;

/** Minuten pro Spieltag. Ein Spieltag beginnt um 06:00. */
export const DAY_MINUTES = 24 * 60;

/** Absolute Spielzeit in Minuten (Tag 1, 06:00 = 1440) – für alles, was Tage überdauert. */
export function absoluteMinute(time) {
  return time.day * DAY_MINUTES + time.minute;
}

/**
 * @param {object} config
 * @param {number} [mapSeed] Startwert des Wegenetzes (Meilenstein 9, je Spiel neu)
 */
export function createNewState(config, mapSeed = 1) {
  const slots = new Array(HOTBAR_SIZE).fill(null);
  const start = LAYOUT.start;
  return {
    version: SAVE_VERSION,
    difficulty: DEFAULT_DIFFICULTY, // M16: gemuetlich · ausgewogen · wild
    time: { day: 1, minute: config.time.newGameMinute },
    // rested/tea: Tag, an dem Mika ausgeschlafen ist bzw. Kräutertee bekam (Meilenstein 6)
    // name/look: gewählt auf dem Titelbild (Meilenstein 7)
    player: { x: start.x, z: start.z, facing: start.facing, lantern: false, hp: 100, xp: 0, level: 1, rested: 0, tea: 0, soup: 0, name: 'Mika', look: { ...DEFAULT_LOOK } },
    inventory: { holz: 4, stein: 2, fasern: 3, stoff: 1, schrott: 1, teile: 0, zahnraeder: 0, moderkerne: 0 },
    hotbar: { slots, selected: 0 },
    tools: { axt: false, spitzhacke: false },
    upgrades: { radius: 0, leben: 0, schlag: 0, tempo: 0 },
    // Besondere Turmteile im Vorrat (Meilenstein 10): noch nicht eingebaut
    towerParts: Object.fromEntries(TOWER_PART_IDS.map((id) => [id, 0])),
    weapons: {}, // gebaute Waffen: Name -> Stufe (1–3)
    perks: {}, // gewählte Perks: Name -> Stufe
    perkChoice: null, // offene Perk-Wahl (drei Namen), falls beim Speichern noch nicht gewählt
    // M16: Fähigkeiten auf zwei Plätzen (rechte Maustaste, X) und ihr Rang (1–3);
    // skillChoice: offene Fähigkeiten-Wahl { mode: 'lernen'|'schaerfen', options }
    skills: freshSkills(),
    skillChoice: null,
    notes: {}, // M18: Notizbuch – entdeckte Reaktion -> Tag der Entdeckung
    recipes: {}, // M20: Werkstattbuch – gebautes Rezept (Mischturm) -> Tag
    // M19: gewählte Baupläne (Bauarten, der Reihe nach) und eine offene Wahl
    // { options: [drei Baupläne], from: 'nacht'|'wrack'|'balduin', extra: so viele Wahlen kommen danach }
    blueprints: [],
    blueprintChoice: null,
    // tower: Ausbau des Funkturms (0–3), furniture: gekaufte Möbel, tradeDay: Tag des
    // letzten Tauschs mit Hilde, yusufNight: Nacht, in der Yusuf Mika schon verarztet hat,
    // survivorsStart: Tag, ab dem die Ankunftstage der Überlebenden zählen (alte Stände)
    // trader: was Balduin am Tag `day` schon verkauft hat (Vorrat der Sonderangebote, M8)
    // mapSeed: Startwert des Wegenetzes (M9); relocate: Bauten eines alten Stands neu aufstellen
    world: { mapSeed: mapSeed >>> 0, relocate: false, houseLevel: 1, homeHp: 300, buildings: [], nodes: {}, searched: {}, dayEvents: null, tower: 0, furniture: [], tradeDay: 0, yusufNight: 0, survivorsStart: 0, trader: { day: 0, sold: {} } },
    // Überlebende: stage 0 unterwegs, 1 angekommen, 2 zu Gast, 3 eingezogen; tent = Bau-ID
    survivors: Object.fromEntries(SURVIVOR_ORDER.map((id) => [id, { stage: 0, day: 0, tent: null, errand: 0 }])), // errand: 0 offen, 1 läuft, 2 erledigt
    // Die Nacht des Tages n: laufende Welle, geschafft?, Bilanz für den Morgenbericht
    night: { n: 0, wave: 0, done: true, won: false, kills: 0, loot: {}, homeStart: 300 },
    horde: [], // lebende Schlurfer (zum Weiterspielen nach dem Neuladen)
    hordeQueue: [], // noch ausstehende Schlurfer der laufenden Welle
    loot: [], // Überreste am Boden (bleiben bis zu drei Tage, `until` in absoluten Spielminuten)
    report: null, // Morgenbericht, der noch gezeigt werden muss
    flags: {},
    stats: { nightsSlept: 0, gathered: 0, built: 0, kills: 0, nightsWon: 0, nightsLost: 0, champions: 0, chests: 0 },
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
  out.difficulty = DIFFICULTIES[data.difficulty] ? data.difficulty : DEFAULT_DIFFICULTY;
  out.time.day = Math.floor(num(data.time?.day, base.time.day, 1, 1e6));
  out.time.minute = num(data.time?.minute, base.time.minute, 0, DAY_MINUTES - 0.001);
  // Drinnen (M11) liegt die Figur weit östlich der Karte im Innenraum
  const indoors = typeof data.player?.x === 'number' && data.player.x > INTERIOR_EXTENT.minX - 5;
  out.player.x = indoors ? num(data.player.x, INTERIOR_ENTRY.x, INTERIOR_EXTENT.minX, INTERIOR_EXTENT.maxX) : num(data.player?.x, base.player.x, -70, 40);
  out.player.z = indoors ? num(data.player?.z, INTERIOR_ENTRY.z, INTERIOR_EXTENT.minZ, INTERIOR_EXTENT.maxZ) : num(data.player?.z, base.player.z, -40, 40);
  out.player.facing = num(data.player?.facing, 0, -10, 10);
  out.player.lantern = Boolean(data.player?.lantern);
  out.player.hp = num(data.player?.hp, 100, 1, 1000);
  out.player.xp = num(data.player?.xp, 0, 0, 1e7);
  out.player.level = Math.floor(num(data.player?.level, 1, 1, 99));
  out.player.rested = Math.floor(num(data.player?.rested, 0, 0, 1e6));
  out.player.tea = Math.floor(num(data.player?.tea, 0, 0, 1e6));
  out.player.soup = Math.floor(num(data.player?.soup, 0, 0, 1e6)); // Tag der letzten Suppe (M11)
  out.player.name = cleanName(data.player?.name);
  out.player.look = Object.fromEntries(LOOK_KEYS.map((k) => [k, LOOKS[k][data.player?.look?.[k]] ? data.player.look[k] : DEFAULT_LOOK[k]]));
  for (const r of RESOURCES) out.inventory[r] = Math.floor(num(data.inventory?.[r], base.inventory[r], 0, 99999));
  for (const id of TOWER_PART_IDS) out.towerParts[id] = Math.floor(num(data.towerParts?.[id], 0, 0, 99));
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
  out.stats.champions = Math.floor(num(data.stats?.champions, 0, 0, 1e6)); // M21
  out.stats.chests = Math.floor(num(data.stats?.chests, 0, 0, 1e6));
  for (const k of Object.keys(out.upgrades)) out.upgrades[k] = Math.floor(num(data.upgrades?.[k], 0, 0, 3));
  for (const k of WEAPON_ORDER) if (Number.isFinite(data.weapons?.[k])) out.weapons[k] = Math.floor(num(data.weapons[k], 1, 1, 3));
  for (const k of PERK_IDS) if (Number.isFinite(data.perks?.[k])) out.perks[k] = Math.floor(num(data.perks[k], 0, 0, PERKS[k].max));
  if (Array.isArray(data.perkChoice)) {
    const choice = data.perkChoice.filter((id) => PERK_IDS.includes(id)).slice(0, 3);
    out.perkChoice = choice.length ? choice : null;
  }
  // Fähigkeiten (M16): Platz 1 ist nie leer, keine Fähigkeit doppelt
  const sk = data.skills || {};
  const slots = Array.isArray(sk.slots) ? sk.slots.slice(0, 2).map((id) => (SKILLS[id] ? id : null)) : [];
  if (!slots[0]) slots[0] = START_SKILL;
  if (slots[1] === slots[0]) slots[1] = null;
  out.skills = { slots: [slots[0], slots[1] || null], ranks: {} };
  for (const id of out.skills.slots) if (id) out.skills.ranks[id] = Math.floor(num(sk.ranks?.[id], 1, 1, SKILL_MAX_RANK));
  // Baupläne (M19): nur bekannte Namen, jeder einmal; eine offene Wahl mit ein bis drei Plänen
  out.blueprints = Array.isArray(data.blueprints) ? [...new Set(data.blueprints.filter((id) => BLUEPRINTS[id]))] : [];
  const bc = data.blueprintChoice;
  if (bc && Array.isArray(bc.options)) {
    const options = [...new Set(bc.options.filter((id) => BLUEPRINTS[id] && !out.blueprints.includes(id)))].slice(0, BLUEPRINT_CHOICES);
    if (options.length) out.blueprintChoice = { options, from: ['nacht', 'wrack', 'balduin'].includes(bc.from) ? bc.from : 'nacht', extra: Math.floor(num(bc.extra, 0, 0, 9)) };
  }
  // Notizbuch (M18): entdeckte Reaktionen mit dem Tag der Entdeckung
  out.notes = {};
  if (data.notes && typeof data.notes === 'object') for (const [k, d] of Object.entries(data.notes)) if (REACTIONS[k] && Number.isFinite(d)) out.notes[k] = Math.floor(num(d, 1, 1, 1e6));
  // Werkstattbuch (M20): nur bekannte Rezepte
  out.recipes = {};
  if (data.recipes && typeof data.recipes === 'object') for (const [k, d] of Object.entries(data.recipes)) if (MIXES[k] && Number.isFinite(d)) out.recipes[k] = Math.floor(num(d, 1, 1, 1e6));
  const sc = data.skillChoice;
  if (sc && (sc.mode === 'lernen' || sc.mode === 'schaerfen') && Array.isArray(sc.options)) {
    const options = sc.options.filter((id) => SKILL_IDS.includes(id)).slice(0, 3);
    out.skillChoice = options.length ? { mode: sc.mode, options } : null;
  }
  out.tools.axt = Boolean(data.tools?.axt);
  out.tools.spitzhacke = Boolean(data.tools?.spitzhacke);
  const w = data.world || {};
  out.world.mapSeed = Math.floor(num(w.mapSeed, 1, 0, 4294967295));
  out.world.relocate = Boolean(w.relocate);
  out.world.houseLevel = Math.floor(num(w.houseLevel, 1, 1, HOUSE_MAX));
  out.world.homeHp = num(w.homeHp, HOUSE_LEVELS[out.world.houseLevel].hp, 0, 5000);
  if (w.dayEvents && Number.isFinite(w.dayEvents.day)) out.world.dayEvents = { day: Math.floor(w.dayEvents.day), done: Math.floor(num(w.dayEvents.done, 0, 0, 99)), lost: num(w.dayEvents.lost, 0, 0, 5000) };
  const n = data.night || {};
  out.night = {
    n: Math.floor(num(n.n, 0, 0, 1e6)),
    wave: Math.floor(num(n.wave, 0, 0, 99)),
    done: n.done !== false,
    won: Boolean(n.won),
    kills: Math.floor(num(n.kills, 0, 0, 1e6)),
    loot: {},
    homeStart: num(n.homeStart, out.world.homeHp, 0, 5000),
    preLoss: num(n.preLoss, 0, 0, 5000),
    shift: num(n.shift, 0, 0, 24 * 60), // M16: um so viele Minuten sind späte Wellen vorgerückt
    called: Math.floor(num(n.called, 0, 0, 99)), // M16: selbst gerufene Wellen
    towers: {}, // M16: Abschüsse je Turm in dieser Nacht (Turm der Nacht)
    // M17: Tor und Wall getroffen, Durchbruch (Uhrzeit, Tor oder Wall), wie viele im Lager waren, was umgeworfen wurde
    campHit: Boolean(n.campHit),
    inCamp: Math.floor(num(n.inCamp, 0, 0, 1e4)),
    raided: Array.isArray(n.raided) ? n.raided.filter((t) => typeof t === 'string' && BUILDINGS[t]).slice(0, 60) : [],
  };
  if (n.breach && Number.isFinite(n.breach.at)) out.night.breach = { at: Math.floor(num(n.breach.at, 0, 0, 24 * 60)), gate: Boolean(n.breach.gate) };
  if (n.towers && typeof n.towers === 'object') {
    for (const [id, k] of Object.entries(n.towers)) if (/^\d+$/.test(id) && Number.isFinite(k)) out.night.towers[id] = Math.floor(num(k, 0, 0, 1e6));
  }
  for (const r of RESOURCES) if (Number.isFinite(n.loot?.[r])) out.night.loot[r] = Math.floor(n.loot[r]);
  const listOf = (v) => (Array.isArray(v) ? v.filter((e) => e && typeof e === 'object') : []);
  out.horde = listOf(data.horde).filter((z) => typeof z.type === 'string' && Number.isFinite(z.x) && Number.isFinite(z.z)).slice(0, 300);
  out.hordeQueue = listOf(data.hordeQueue).slice(0, 300);
  out.loot = listOf(data.loot)
    .filter((l) => typeof l.res === 'string' && Number.isFinite(l.x) && Number.isFinite(l.z))
    .map((l) => ({ res: l.res, x: l.x, z: l.z, ...(Number.isFinite(l.until) ? { until: Math.floor(l.until) } : {}) }))
    .slice(0, 600);
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
        if (b.broken === true) entry.broken = true; // zerstörte Barrikade (Trümmer)
        // Turmteile (M10; M21: bis zu zwei als Liste)
        if (Array.isArray(b.parts)) entry.parts = [...new Set(b.parts.filter((id) => typeof id === 'string' && TOWER_PARTS[id]))].slice(0, 2);
        else if (typeof b.part === 'string' && TOWER_PARTS[b.part]) entry.parts = [b.part];
        // Geschichte des Turms (M16): Erfahrung, Abschüsse, Name
        if (Number.isFinite(b.xp) && b.xp > 0) entry.xp = Math.round(num(b.xp, 0, 0, 1e7));
        if (Number.isFinite(b.kills) && b.kills > 0) entry.kills = Math.floor(num(b.kills, 0, 0, 1e7));
        if (Number.isInteger(b.name) && b.name >= 0) entry.name = Math.floor(num(b.name, 0, 0, 999));
        // Zubehör an Barrikade oder Tor (M17e)
        if (Array.isArray(b.gear)) entry.gear = [...new Set(b.gear.filter((id) => typeof id === 'string' && GEAR[id]))].slice(0, 3);
        // Mischturm (M20): aus welchen Türmen er entstand
        if (Array.isArray(b.from)) {
          entry.from = b.from
            .filter((f) => f && typeof f.t === 'string' && TOWERS[f.t] && !MIXES[f.t])
            .slice(0, 2)
            .map((f) => ({ t: f.t, l: Math.floor(num(f.l, 3, 1, 5)), s: f.s === 'A' || f.s === 'B' ? f.s : null }));
        }
        return entry;
      });
  }
  if (w.nodes && typeof w.nodes === 'object') {
    for (const [k, v] of Object.entries(w.nodes)) if (v && Number.isFinite(v.until)) out.world.nodes[k] = { until: Math.floor(v.until) };
  }
  if (w.searched && typeof w.searched === 'object') {
    for (const [k, v] of Object.entries(w.searched)) if (Number.isFinite(v)) out.world.searched[k] = Math.floor(v);
  }
  out.world.tower = Math.floor(num(w.tower, 0, 0, 3));
  out.world.furniture = Array.isArray(w.furniture) ? [...new Set(w.furniture.filter((id) => typeof id === 'string' && FURNITURE[id]))] : [];
  out.world.tradeDay = Math.floor(num(w.tradeDay, 0, 0, 1e6));
  out.world.yusufNight = Math.floor(num(w.yusufNight, 0, 0, 1e6));
  out.world.survivorsStart = Math.floor(num(w.survivorsStart, 0, 0, 1e6));
  out.world.trader.day = Math.floor(num(w.trader?.day, 0, 0, 1e6));
  if (w.trader?.sold && typeof w.trader.sold === 'object') {
    for (const [k, v] of Object.entries(w.trader.sold)) if (TRADER_OFFERS[k] && Number.isFinite(v)) out.world.trader.sold[k] = Math.floor(num(v, 0, 0, 99));
  }
  for (const id of SURVIVOR_ORDER) {
    const s = data.survivors?.[id] || {};
    out.survivors[id] = { stage: Math.floor(num(s.stage, 0, 0, 3)), day: Math.floor(num(s.day, 0, 0, 1e6)), tent: Number.isFinite(s.tent) ? Math.floor(s.tent) : null, errand: Math.floor(num(s.errand, 0, 0, 2)) };
  }
  return out;
}
