// Bauten der Bauleiste. Kosten in Vorratseinheiten.
// w × d = Grundriss in 1-m-Zellen (bei turns = 1 vertauscht).
// tower: Turm (Stufen, Spezialisierung, siehe towers.js); hp: Haltbarkeit;
// defense: Verteidigung (Abreißen gibt wie bei Türmen nur 70 % zurück);
// onPath: steht nur auf Wegfeldern (Barrikaden). Alles andere steht nie auf
// einem Weg (Meilenstein 9, DESIGN.md 0 Nr. 2 und 3).
// smash: die Horde bleibt davor stehen und schlägt es ein (Barrikaden, Wall, Tor).
// camp: Wall und Tor des Lagers (M17) – die Welt stellt sie auf, die Bauleiste
// nicht; Abreißen geht nicht. Ihre Haltbarkeit hängt an der Stufe (CAMP_LEVELS),
// `hp: 1` heißt hier nur »hat Haltbarkeit«.
// raid: Haltbarkeit gegen die Horde im Lager (M17d). Bricht sie durch, wirft sie
// um, was dort steht; umgeworfen (`broken`) tut ein Bau nichts mehr, bis Mika
// ihn tagsüber wieder aufstellt (RAID.rebuild der Baukosten).
// trap: Falle (M19) – steht auf einem Wegfeld wie eine Barrikade, ist aber
// begehbar: keine Kollision, sperrt das Flussfeld nicht. Abgenutzt (`broken`)
// wirkt sie nicht mehr, bis Mika sie tagsüber neu richtet. Werte in traps.js.
// Türme, Fallen und Barrikadenarten aus den Bauplänen (M19) kennt Mika erst,
// wenn sie den Bauplan gewählt hat (blueprints.js).

import { TOWERS, towerStats } from './towers.js';
import { MIXES } from './mixes.js';

export const BUILDINGS = {
  bolzen: { w: 1, d: 1, tower: true, cost: TOWERS.bolzen.base[0].cost, icon: 'bolzen', hp: 100, height: 1.6 },
  katapult: { w: 1, d: 1, tower: true, cost: TOWERS.katapult.base[0].cost, icon: 'katapult', hp: 100, height: 1.5 },
  sprenger: { w: 1, d: 1, tower: true, cost: TOWERS.sprenger.base[0].cost, icon: 'sprenger', hp: 100, height: 1.4 },
  laternenturm: { w: 1, d: 1, tower: true, cost: TOWERS.laternenturm.base[0].cost, icon: 'laternenturm', hp: 100, height: 2.4 },
  // M19: Familien aus den Bauplänen (die Vogelscheuche hält je Stufe mehr aus, towers.js)
  glockenturm: { w: 1, d: 1, tower: true, cost: TOWERS.glockenturm.base[0].cost, icon: 'glockenturm', hp: 100, height: 2.2 },
  windrad: { w: 1, d: 1, tower: true, cost: TOWERS.windrad.base[0].cost, icon: 'windrad', hp: 100, height: 2.6 },
  bienenkorb: { w: 1, d: 1, tower: true, cost: TOWERS.bienenkorb.base[0].cost, icon: 'bienenkorb', hp: 100, height: 1.3 },
  vogelscheuche: { w: 1, d: 1, tower: true, cost: TOWERS.vogelscheuche.base[0].cost, icon: 'vogelscheuche', hp: 100, height: 2, lure: true },
  werkbank: { w: 2, d: 1, cost: { holz: 8, stein: 2 }, max: 1, icon: 'werkbank', use: 'werkbank', height: 1.6, raid: 60 },
  barrikade: { w: 1, d: 1, cost: { holz: 1 }, icon: 'barrikade', repeat: true, defense: true, onPath: true, smash: true, hp: 20, height: 1 },
  laternenpfahl: { w: 1, d: 1, cost: { holz: 2, schrott: 2, stoff: 1 }, icon: 'laternenpfahl', repeat: true, height: 2, raid: 25 },
  beet: { w: 2, d: 1, cost: { holz: 4, fasern: 4 }, icon: 'beet', use: 'ernten', harvest: { fasern: 3 }, height: 0.7, raid: 30 },
  bank: { w: 2, d: 1, cost: { holz: 5 }, icon: 'bank', use: 'bank', max: 3, height: 1, raid: 30 },
  // M23: Hochsitz neben dem Weg – nachts bezieht ein eingezogener Überlebender dort Posten (Reiter Einrichten)
  hochsitz: { w: 1, d: 1, cost: { holz: 10, schrott: 3 }, icon: 'hochsitz', post: true, max: 4, height: 2.4 },
  // M30: Übungsplatz – Heuballen, Kürbis-Zielscheibe, Strohpuppe, Dosen auf dem Zaun (Reiter Einrichten, einmal)
  uebungsplatz: { w: 3, d: 2, cost: { holz: 12, fasern: 6, schrott: 2 }, icon: 'uebungsplatz', use: 'ueben', max: 1, height: 1.6, raid: 40 },
  // M31: Lagerglocke – Balduins alte Schiffsglocke am Galgen aus Treibholz (Reiter Einrichten, einmal,
  // nur im Hof, sobald der Waffenschrank offen ist). Die Horde wirft sie nicht um: Läuten muss gehen.
  lagerglocke: { w: 1, d: 1, cost: { holz: 6, schrott: 4, teile: 6 }, icon: 'lagerglocke', use: 'glocke', max: 1, yard: true, height: 2 },
  // Herbstschmuck (M25): Belohnungen aus dem Herbstbuch – nur zum Schönmachen
  kuerbis: { w: 1, d: 1, cost: { fasern: 2 }, icon: 'kuerbis', deco: true, max: 6, height: 0.6 },
  laubhaufen: { w: 2, d: 1, cost: { fasern: 1 }, icon: 'laubhaufen', deco: true, max: 4, height: 0.4 },
  regentonne: { w: 1, d: 1, cost: { holz: 3, schrott: 1 }, icon: 'regentonne', deco: true, max: 4, height: 0.9 },
  kuerbislaterne: { w: 1, d: 1, cost: { fasern: 2, holz: 1 }, icon: 'kuerbislaterne', deco: true, max: 6, height: 0.7 },
  // Meilenstein 6: Schlafplatz für eine Überlebende oder einen Überlebenden
  // M11: Holzlager – Scheite unter einem Pultdach, jeden Tag 2 Holz zum Mitnehmen
  // M24 (Balance): 3 statt 2 Holz, und jeden Morgen baut es aus seinem Vorrat bis zu `rebuild` zerschlagene Barrikaden wieder auf
  holzlager: { w: 2, d: 1, cost: { holz: 6, stein: 2 }, icon: 'holzlager', use: 'ernten', prompt: 'holzNehmen', harvest: { holz: 3 }, rebuild: 2, max: 2, height: 1.4, raid: 45 },
  zelt: { w: 2, d: 2, cost: { holz: 6, stoff: 2 }, icon: 'zelt', max: 5, height: 1.4, raid: 50 }, // M27: fünf (vier für die Stammbesetzung, eins für einen Wanderer)
  // M27: Schlafhütte – zwei Schlafplätze, erst ab dem Schlafzimmer (Zuhause-Stufe `house`)
  schlafhuette: { w: 2, d: 2, cost: { holz: 24, stein: 8, stoff: 4 }, icon: 'schlafhuette', max: 1, house: 3, height: 2.4, raid: 80 }, // m6-r1: 8 Holz, 3 Stoff reichten Mira fünf Tage lang nicht
  // M19: Fallen auf den Wegen (begehbar; hp = wie lange sie halten, Werte in traps.js)
  stachelbrett: { w: 1, d: 1, cost: { holz: 2, schrott: 2 }, icon: 'stachelbrett', trap: true, onPath: true, repeat: true, hp: 30, height: 0.2 },
  // M24: Moderlocke – auf den Weg nahe einem Spawn: dort in der Nacht mehr Horde und Beute (data/risk.js)
  moderlocke: { w: 1, d: 1, cost: { teile: 8, fasern: 3 }, icon: 'moderlocke', bait: true, onPath: true, max: 1, height: 0.9 },
  leimtopf: { w: 1, d: 1, cost: { holz: 1, schrott: 1, fasern: 2 }, icon: 'leimtopf', trap: true, onPath: true, repeat: true, hp: 25, height: 0.4 },
  klettenteppich: { w: 1, d: 1, cost: { holz: 1, fasern: 4 }, icon: 'klettenteppich', trap: true, onPath: true, repeat: true, hp: 30, height: 0.15 },
  knallerbsen: { w: 1, d: 1, cost: { holz: 1, schrott: 3 }, icon: 'knallerbsen', trap: true, onPath: true, repeat: true, hp: 1, height: 0.2 },
  oelspur: { w: 1, d: 1, cost: { holz: 1, schrott: 2 }, icon: 'oelspur', trap: true, onPath: true, repeat: true, hp: 1, height: 0.2 },
  // M17: Wall (Abschnitte zu 3 und 4 m) und Tor (5 m) am Westrand der Bucht
  wall3: { w: 1, d: 3, camp: 'wall', smash: true, defense: true, hp: 1, icon: 'wall', height: 1.6 },
  wall4: { w: 1, d: 4, camp: 'wall', smash: true, defense: true, hp: 1, icon: 'wall', height: 1.6 },
  tor: { w: 1, d: 5, camp: 'tor', smash: true, defense: true, hp: 1, icon: 'tor', height: 2.2 },
};

// Mischtürme (M20): zwei Felder (turns = 1: übereinander), entstehen nur durch
// Verbinden zweier Türme – darum in keinem Reiter der Bauleiste
for (const id of Object.keys(MIXES)) BUILDINGS[id] = { w: 2, d: 1, tower: true, mix: true, cost: {}, icon: id, hp: 160, height: 1.9 };

/**
 * Wall und Tor je Stufe (M17, DESIGN.md 8): 1 Weidenzaun, 2 Palisade,
 * 3 Bohlenwand mit Wehrgang, 4 Steinmauer. wallHp je Meter Wall, gateHp für
 * das Tor; wallCost je Meter bzw. gateCost = Ausbau auf diese Stufe
 * (Stufe 1: was ein Wiederaufbau aus Trümmern mindestens kostet); block =
 * Anteil jedes Schlags, der abprallt. Ein Schlurfer schlägt rund 2,4 je
 * Sekunde, ein Brummer 6, ein Anführer 11.
 */
export const CAMP_LEVELS = [
  null,
  { key: 'weidenzaun', wallHp: 25, gateHp: 150, wallCost: { holz: 1 }, gateCost: { holz: 6 } },
  { key: 'palisade', wallHp: 60, gateHp: 350, wallCost: { holz: 4 }, gateCost: { holz: 25, stein: 6 } },
  { key: 'bohlenwand', wallHp: 110, gateHp: 650, wallCost: { holz: 4, schrott: 3 }, gateCost: { holz: 35, schrott: 20, zahnraeder: 2 }, block: 0.1 },
  { key: 'steinmauer', wallHp: 170, gateHp: 1000, wallCost: { stein: 6, schrott: 2 }, gateCost: { stein: 40, schrott: 30, moderkerne: 1 }, block: 0.25 },
];
export const CAMP_MAX = CAMP_LEVELS.length - 1;

/** Wiederaufbau aus Trümmern: dieser Anteil dessen, was im Abschnitt steckt. */
export const CAMP_REBUILD = 0.5;

/**
 * Durchbruch (M17d): Wer im Lager steht, sucht sich in dieser Reichweite (m bis
 * zur Kante) etwas zum Umwerfen, sonst geht es weiter zum Haus. scan: so oft
 * schaut er sich um (s); giveUp: kommt er so lange nicht heran, lässt er es;
 * rebuild: Umgeworfenes wieder aufstellen kostet diesen Anteil der Baukosten.
 */
export const RAID = { reach: 3.2, scan: 0.5, giveUp: 3, rebuild: 0.5 };

/**
 * Sitzbank (M24, Balance): Hinsetzen heilt Mika voll und gibt ihr `buff` Sekunden
 * lang `damage` mal so viel Schlagkraft – danach `cooldown` Sekunden Pause.
 */
export const BENCH = { cooldown: 25, buff: 20, damage: 1.25 };
/** Tagsüber nagen Streuner Wall und Tor höchstens bis auf diesen Anteil ab (wie am Haus). */
export const CAMP_DAY_FLOOR = 0.75;

/**
 * Lage im Raster (fest, M17): Spalte i = −8 (x −8 … −7) am Westrand der Bucht,
 * das Tor über dem letzten Weg (j −1 … 3), der Wall nördlich und südlich davon.
 */
export const CAMP_LAYOUT = {
  i: -8,
  gate: { j: -1 },
  walls: [
    { type: 'wall3', j: -13 },
    { type: 'wall3', j: -10 },
    { type: 'wall3', j: -7 },
    { type: 'wall3', j: -4 },
    { type: 'wall4', j: 4 },
    { type: 'wall3', j: 8 },
  ],
};

export function campLevel(level) {
  return CAMP_LEVELS[Math.max(1, Math.min(CAMP_MAX, Math.floor(level || 1)))];
}

/** Zellen eines Wall-Abschnitts (bzw. 5 für das Tor). */
export function campCells(type) {
  return BUILDINGS[type].d;
}

/** Was steckt in einem Abschnitt bzw. im Tor dieser Stufe (alle Stufen zusammen)? */
export function campInvested(b) {
  const gate = BUILDINGS[b.type].camp === 'tor';
  const cells = campCells(b.type);
  const total = {};
  for (let l = 1; l <= (b.level || 1); l++) {
    const cost = gate ? CAMP_LEVELS[l].gateCost : CAMP_LEVELS[l].wallCost;
    for (const [res, n] of Object.entries(cost)) total[res] = (total[res] || 0) + n * (gate ? 1 : cells);
  }
  return total;
}

/** Ausbau eines Abschnitts bzw. des Tors auf die nächste Stufe (oder null). */
export function campUpgradeCost(b) {
  const next = (b.level || 1) + 1;
  if (next > CAMP_MAX) return null;
  const gate = BUILDINGS[b.type].camp === 'tor';
  const cost = gate ? CAMP_LEVELS[next].gateCost : CAMP_LEVELS[next].wallCost;
  return Object.fromEntries(Object.entries(cost).map(([res, n]) => [res, n * (gate ? 1 : campCells(b.type))]));
}

/**
 * Zubehör (M17e, DESIGN.md 8 M17): Barrikaden tragen so viele Teile, wie ihre
 * Stufe zählt (Holz 1, verstärkt 2, Metall 3), das Tor alle drei, die zu ihm
 * passen. Zubehör bleibt, wenn der Bau zerbricht, und wirkt wieder, sobald er
 * steht; Abreißen gibt 70 % zurück.
 *   dornen:  Wer draufschlägt, verletzt sich (damage je Schlag, durch jede Panzerung).
 *   laterne: blendet – Schlurfer im Umkreis (radius) laufen und schlagen um slow
 *            langsamer; dazu eine Lichtinsel.
 *   pech:    Der erste Schlag je Nacht kippt den Kessel: alles im Umkreis brennt
 *            (burn je Sekunde, burnTime Sekunden). Füllt sich bis zur nächsten Nacht.
 *   glocke:  (nur Tor) läutet beim ersten Schlag je Nacht – Knopf bellt, und wohnt
 *            Bert im Lager, flickt er das Tor um repair seiner Haltbarkeit.
 */
export const GEAR = {
  dornen: { on: ['barrikade', 'tor'], cost: { holz: 2, schrott: 2 }, damage: 4 },
  laterne: { on: ['barrikade', 'tor'], cost: { schrott: 2, stoff: 1 }, radius: 2.4, slow: 0.3 },
  pech: { on: ['barrikade'], cost: { holz: 2, schrott: 3 }, radius: 1.9, burn: 4, burnTime: 4 },
  glocke: { on: ['tor'], cost: { schrott: 4, zahnraeder: 1 }, repair: 0.2 },
};
export const GEAR_ORDER = ['dornen', 'laterne', 'pech', 'glocke'];

/** Wie viele Zubehörteile trägt dieser Bau (Barrikade: je Stufe eins, Tor: drei)? */
export function gearSlots(b) {
  if (b.type === 'barrikade') return Math.max(1, Math.min(3, b.level || 1));
  return BUILDINGS[b.type]?.camp === 'tor' ? 3 : 0;
}

/** Passt dieses Zubehör an diesen Bau? */
export function gearFits(type, id) {
  return Boolean(GEAR[id]?.on.includes(type));
}

/**
 * Verlorene Nacht: Türme verlieren ein Drittel ihrer Haltbarkeit, aber nie mehr
 * als bis auf diesen Anteil (m7-r1: Nach drei Pechnächten schwiegen sie sonst,
 * und ohne vollen Einsatz kam man aus der Spirale nicht mehr heraus).
 */
export const TOWER_LOSS_FLOOR = 1 / 3;

/**
 * Barrikaden je Stufe (DESIGN.md 6.10): 1 Holzbarriere, 2 verstärkt, 3 Metall.
 * cost = Ausbau auf diese Stufe; block = Anteil jedes Schlags, der abprallt.
 * M9.1 (Auftraggeber: »nur 1 Holz, aber schnell kaputt«): Eine Holzbarriere
 * hält einen Schlurfer rund 8 s auf, einen Trupp oder Brummer 2–3 s – sie
 * bremst, damit die Türme Zeit haben. Die Stufen im selben Verhältnis
 * (M9: 80/170/300 für 3/5/2+6).
 */
export const BARRICADE_LEVELS = [
  null,
  { key: 'holz', hp: 20, cost: { holz: 1 } },
  { key: 'verstaerkt', hp: 55, cost: { holz: 2 } },
  { key: 'metall', hp: 140, cost: { holz: 1, schrott: 4 }, block: 0.25 },
];

/** Wiederaufbau aus Trümmern: dieser Anteil dessen, was in der Barrikade steckt. */
export const BARRICADE_REBUILD = 0.6;

export function barricadeLevel(level) {
  return BARRICADE_LEVELS[Math.max(1, Math.min(BARRICADE_LEVELS.length - 1, Math.floor(level || 1)))];
}

/** Was steckt in einer Barrikade dieser Stufe (alle Stufen zusammen)? */
export function barricadeInvested(level) {
  const total = {};
  for (let l = 1; l <= level; l++) for (const [res, n] of Object.entries(BARRICADE_LEVELS[l].cost)) total[res] = (total[res] || 0) + n;
  return total;
}

/** Volle Haltbarkeit eines Baus (Barrikaden je Stufe, im Lager gegen die Horde). */
export function maxHpOf(b) {
  if (b.type === 'barrikade') return barricadeLevel(b.level).hp;
  const def = BUILDINGS[b.type];
  if (def.camp === 'tor') return campLevel(b.level).gateHp;
  if (def.camp === 'wall') return campLevel(b.level).wallHp * def.d;
  if (def.lure) return towerStats(b.type, b.level || 1, b.spec).hp; // Vogelscheuche (M19): je Stufe mehr
  return def.hp || def.raid || 0;
}

/** Hat ein Bau Haltbarkeit (Türme, Barrikaden, Wall, Tor und alles im Lager)? */
export function hasHp(type) {
  const def = BUILDINGS[type];
  return Boolean(def && (def.hp || def.raid));
}

/** Anteil jedes Schlags, der an einem Bau abprallt (Metallbarrikade, Bohlen, Stein). */
export function blockOf(b) {
  if (b.type === 'barrikade') return barricadeLevel(b.level).block || 0;
  if (BUILDINGS[b.type].camp) return campLevel(b.level).block || 0;
  return 0;
}

/**
 * Reihenfolge in den Reitern des Baumenüs. Die erste Seite der Türme bleibt
 * immer gleich (Q R T G C); Familien aus den Bauplänen kommen dahinter (M19,
 * Reiter »Helfer«), Fallen in den eigenen Reiter »Fallen«. H5: Was im Hof steht
 * und dem Lager dient, liegt im Reiter »Lager« (vorher teils unter »Zuhause«,
 * das Holzlager unter »Leute«).
 */
export const TOWER_TAB = ['bolzen', 'katapult', 'sprenger', 'laternenturm', 'barrikade', 'glockenturm', 'windrad', 'bienenkorb', 'vogelscheuche'];
export const TRAP_TAB = ['stachelbrett', 'leimtopf', 'klettenteppich', 'knallerbsen', 'oelspur'];
export const YARD_TAB = ['werkbank', 'holzlager', 'beet', 'bank', 'laternenpfahl'];

/**
 * Ausbaustufen des Zuhauses (DESIGN.md 6.8, Meilenstein 11). Jede Stufe gibt
 * Standfestigkeit (hp) und einen Raum im Innenraum (world/interior.js):
 * Wohnraum mit Kamin → Küche → Schlafzimmer unterm Dach → Werkstatt → Lager.
 * cozy: Gemütlichkeit obendrauf, lossFactor: Anteil, den eine verlorene Nacht noch kostet.
 */
export const HOUSE_LEVELS = [
  null,
  { key: 'notunterkunft', room: 'wohnraum', hp: 300 },
  { key: 'huette', room: 'kueche', cost: { holz: 30, stein: 12, stoff: 5, schrott: 8 }, hp: 450 },
  { key: 'schlafzimmer', room: 'schlafzimmer', cost: { holz: 40, stein: 16, stoff: 10, schrott: 12 }, hp: 600, cozy: 2 },
  { key: 'werkstatt', room: 'werkstatt', cost: { holz: 45, stein: 20, schrott: 20, zahnraeder: 2 }, hp: 750 },
  { key: 'lager', room: 'lager', cost: { holz: 50, stein: 25, schrott: 25, zahnraeder: 3, stoff: 6 }, hp: 900, lossFactor: 0.5 },
];
export const HOUSE_MAX = HOUSE_LEVELS.length - 1;

/** Gemütlichkeit, die das Haus selbst mitbringt (Schlafzimmer). */
export function houseCozy(level) {
  return HOUSE_LEVELS.slice(1, level + 1).reduce((sum, l) => sum + (l.cozy || 0), 0);
}

/** Anteil der Verluste nach einer verlorenen Nacht (Lager: nur die Hälfte). */
export function houseLossFactor(level) {
  return HOUSE_LEVELS.slice(1, level + 1).reduce((f, l) => f * (l.lossFactor || 1), 1);
}

/** Küche (ab der Hütte): einmal am Tag Suppe – satt und warm bis zum nächsten Morgen. */
export const SOUP = { cost: { fasern: 3 }, maxHp: 25 };

/** Grundriss unter Berücksichtigung der Drehung. */
export function footprint(type, turns = 0) {
  const b = BUILDINGS[type];
  return turns % 2 ? { w: b.d, d: b.w } : { w: b.w, d: b.d };
}
