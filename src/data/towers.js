// Die vier Türme. Stufe 1–2 allgemein, ab Stufe 3 spezialisiert (A oder B),
// Stufe 4–5 bauen die Richtung aus. Kosten: Bau und Stufe 2 Schrott, Stufe
// 3–4 zusätzlich Zahnräder, Stufe 5 ein Moderkern (DESIGN.md 6.9).
//
// Werte je Stufe:
//   damage   Schaden pro Treffer          rate    Schüsse pro Sekunde
//   range    Reichweite in Metern         targets Ziele gleichzeitig
//   splash   Flächenradius (Katapult)     burn    Schaden/s brennender Boden
//   slow     Verlangsamung 0..1           slowTime Dauer in s
//   freeze   Einfrieren in s (Frost)      push    Rückstoß in m (Schlamm)
//   aura     Schadensbonus für Nachbartürme (Laterne), auraRange in Metern
//   pierce   ignoriert Panzerung          strongest zielt auf das meiste Leben
//   luck     Loot-Bonus im Licht          lightSlow Verlangsamung im Licht
//
// Die vier Familien aus den Bauplänen (M19, DESIGN.md 8):
//   stun     Betäubung je Glockenschlag (s)  heal  Haltbarkeit je Schlag für
//            Barrikaden, Tor und Wall im Umkreis (Friedensglocke)
//   push     Rückstoß gegen den Weg (m)      grind Schrott, den die Mühle über
//            Tag mahlt (morgens im Vorrat)
//   swarms   Schwärme gleichzeitig; damage ist beim Bienenkorb Schaden je Sekunde
//   hp       Haltbarkeit der Vogelscheuche   lure  so viele lockt sie zugleich,
//            lureTime so lange (s), damage beim Krähenscheuche: Picken je Sekunde

import { MIXES } from './mixes.js';

export const TOWER_TYPES = ['bolzen', 'katapult', 'sprenger', 'laternenturm', 'glockenturm', 'windrad', 'bienenkorb', 'vogelscheuche'];

export const TOWERS = {
  bolzen: {
    role: 'einzel',
    projectile: 'bolzen',
    base: [
      { cost: { schrott: 8 }, damage: 14, rate: 1.1, range: 5.5 },
      { cost: { schrott: 8 }, damage: 23, rate: 1.25, range: 6 },
    ],
    specs: {
      A: {
        key: 'scharf',
        levels: [
          // m3-r2: vorher nur +3 Schaden/s gegenüber Stufe 2 – jetzt der Turm gegen Zähe und Anführer
          { cost: { schrott: 14, zahnraeder: 1 }, damage: 80, rate: 0.6, range: 7, pierce: true, strongest: true },
          { cost: { schrott: 20, zahnraeder: 2 }, damage: 120, rate: 0.65, range: 7.8, pierce: true, strongest: true },
          { cost: { schrott: 30, moderkerne: 1 }, damage: 190, rate: 0.7, range: 8.8, pierce: true, strongest: true },
        ],
      },
      B: {
        key: 'repetier',
        levels: [
          { cost: { schrott: 14, zahnraeder: 1 }, damage: 15, rate: 3, range: 5, targets: 2 },
          { cost: { schrott: 20, zahnraeder: 2 }, damage: 20, rate: 3.5, range: 5.3, targets: 2 },
          { cost: { schrott: 30, moderkerne: 1 }, damage: 26, rate: 4, range: 5.6, targets: 3 },
        ],
      },
    },
  },
  katapult: {
    role: 'flaeche',
    projectile: 'kuerbis',
    base: [
      { cost: { schrott: 10 }, damage: 18, rate: 0.45, range: 6, splash: 1.2 },
      { cost: { schrott: 10 }, damage: 28, rate: 0.5, range: 6.5, splash: 1.3 },
    ],
    specs: {
      A: {
        key: 'feuer',
        levels: [
          { cost: { schrott: 16, zahnraeder: 1 }, damage: 30, rate: 0.5, range: 6, splash: 1.3, burn: 10 },
          { cost: { schrott: 22, zahnraeder: 2 }, damage: 40, rate: 0.55, range: 6.3, splash: 1.4, burn: 16 },
          { cost: { schrott: 32, moderkerne: 1 }, damage: 55, rate: 0.6, range: 6.6, splash: 1.6, burn: 26 },
        ],
      },
      B: {
        key: 'streu',
        levels: [
          { cost: { schrott: 16, zahnraeder: 1 }, damage: 24, rate: 0.5, range: 6, splash: 1.1, split: 3 },
          { cost: { schrott: 22, zahnraeder: 2 }, damage: 32, rate: 0.55, range: 6.3, splash: 1.2, split: 3 },
          { cost: { schrott: 32, moderkerne: 1 }, damage: 42, rate: 0.6, range: 6.6, splash: 1.3, split: 4 },
        ],
      },
    },
  },
  sprenger: {
    role: 'kontrolle',
    projectile: 'wasser',
    base: [
      { cost: { schrott: 9 }, damage: 3, rate: 4, range: 3.5, slow: 0.35, slowTime: 1.2 },
      { cost: { schrott: 9 }, damage: 4, rate: 4, range: 3.9, slow: 0.45, slowTime: 1.4 },
    ],
    specs: {
      A: {
        key: 'frost',
        levels: [
          { cost: { schrott: 15, zahnraeder: 1 }, damage: 5, rate: 4, range: 3.8, slow: 0.6, slowTime: 1.6, freeze: 0.8 },
          { cost: { schrott: 21, zahnraeder: 2 }, damage: 7, rate: 4, range: 4.1, slow: 0.65, slowTime: 1.8, freeze: 1.1 },
          { cost: { schrott: 30, moderkerne: 1 }, damage: 10, rate: 4, range: 4.5, slow: 0.72, slowTime: 2, freeze: 1.5 },
        ],
      },
      B: {
        key: 'schlamm',
        levels: [
          { cost: { schrott: 15, zahnraeder: 1 }, damage: 8, rate: 4, range: 3.8, slow: 0.4, slowTime: 1.4, push: 0.6 },
          { cost: { schrott: 21, zahnraeder: 2 }, damage: 11, rate: 4, range: 4.1, slow: 0.45, slowTime: 1.5, push: 0.8 },
          { cost: { schrott: 30, moderkerne: 1 }, damage: 15, rate: 4, range: 4.5, slow: 0.5, slowTime: 1.6, push: 1.1 },
        ],
      },
    },
  },
  laternenturm: {
    role: 'unterstuetzung',
    projectile: null,
    base: [
      { cost: { schrott: 12 }, aura: 0.25, auraRange: 3.8, range: 3.8, lightSlow: 0.1 },
      { cost: { schrott: 12 }, aura: 0.35, auraRange: 4.1, range: 4.1, lightSlow: 0.12 },
    ],
    specs: {
      A: {
        key: 'leucht',
        levels: [
          { cost: { schrott: 18, zahnraeder: 1 }, aura: 0.4, auraRange: 3.8, range: 3.8, lightSlow: 0.15 },
          { cost: { schrott: 24, zahnraeder: 2 }, aura: 0.55, auraRange: 4.1, range: 4.1, lightSlow: 0.2 },
          { cost: { schrott: 34, moderkerne: 1 }, aura: 0.75, auraRange: 4.5, range: 4.5, lightSlow: 0.28 },
        ],
      },
      B: {
        key: 'glueck',
        levels: [
          { cost: { schrott: 18, zahnraeder: 1 }, aura: 0.2, auraRange: 3.6, range: 3.6, luck: 0.5 },
          { cost: { schrott: 24, zahnraeder: 2 }, aura: 0.25, auraRange: 3.9, range: 3.9, luck: 0.8 },
          { cost: { schrott: 34, moderkerne: 1 }, aura: 0.3, auraRange: 4.2, range: 4.2, luck: 1.2 },
        ],
      },
    },
  },
  // --- M19: Familien aus den Bauplänen ---------------------------------------------
  // Glockenturm: Ein Schlag betäubt alles in Reichweite kurz. Sturmglocke schlägt
  // härter, die Friedensglocke flickt dabei Barrikaden, Tor und Wall.
  glockenturm: {
    role: 'kontrolle',
    projectile: null,
    base: [
      { cost: { schrott: 12, holz: 2 }, damage: 6, rate: 0.25, range: 3.2, stun: 0.5 },
      { cost: { schrott: 12 }, damage: 9, rate: 0.27, range: 3.5, stun: 0.6 },
    ],
    specs: {
      A: {
        key: 'sturmglocke',
        levels: [
          { cost: { schrott: 18, zahnraeder: 1 }, damage: 14, rate: 0.3, range: 3.8, stun: 0.8 },
          { cost: { schrott: 24, zahnraeder: 2 }, damage: 20, rate: 0.32, range: 4.1, stun: 1 },
          { cost: { schrott: 34, moderkerne: 1 }, damage: 30, rate: 0.35, range: 4.5, stun: 1.3 },
        ],
      },
      B: {
        key: 'friedensglocke',
        levels: [
          { cost: { schrott: 18, zahnraeder: 1 }, damage: 6, rate: 0.25, range: 3.8, stun: 0.4, heal: 5 },
          { cost: { schrott: 24, zahnraeder: 2 }, damage: 8, rate: 0.27, range: 4.1, stun: 0.5, heal: 8 },
          { cost: { schrott: 34, moderkerne: 1 }, damage: 10, rate: 0.3, range: 4.5, stun: 0.6, heal: 12 },
        ],
      },
    },
  },
  // Windrad: Ein Windstoß schiebt die Horde ein Stück den Weg zurück; im Umkreis
  // sehen Türme durch den Nebel. Sturm bläst stärker, die Mühle mahlt tagsüber Schrott.
  windrad: {
    role: 'kontrolle',
    projectile: null,
    base: [
      { cost: { schrott: 8, holz: 6 }, push: 0.7, rate: 0.33, range: 3.4, slow: 0.2, slowTime: 1 },
      { cost: { schrott: 10 }, push: 0.9, rate: 0.35, range: 3.7, slow: 0.25, slowTime: 1 },
    ],
    specs: {
      A: {
        key: 'sturm',
        levels: [
          { cost: { schrott: 16, zahnraeder: 1 }, push: 1.2, rate: 0.37, range: 4, slow: 0.3, slowTime: 1.2 },
          { cost: { schrott: 22, zahnraeder: 2 }, push: 1.5, rate: 0.4, range: 4.3, slow: 0.35, slowTime: 1.3 },
          { cost: { schrott: 32, moderkerne: 1 }, push: 1.9, rate: 0.43, range: 4.7, slow: 0.4, slowTime: 1.5 },
        ],
      },
      B: {
        key: 'muehle',
        levels: [
          { cost: { schrott: 16, zahnraeder: 1 }, push: 0.8, rate: 0.33, range: 3.7, slow: 0.2, slowTime: 1, grind: 3 },
          { cost: { schrott: 22, zahnraeder: 2 }, push: 0.9, rate: 0.35, range: 3.9, slow: 0.2, slowTime: 1, grind: 5 },
          { cost: { schrott: 32, moderkerne: 1 }, push: 1, rate: 0.37, range: 4.1, slow: 0.25, slowTime: 1, grind: 8 },
        ],
      },
    },
  },
  // Bienenkorb: Ein Schwarm folgt einem Ziel und sticht (Schaden je Sekunde, durch
  // jede Panzerung). Die Königin schickt mehrere Schwärme, Honig klebt und bremst.
  bienenkorb: {
    role: 'schwarm',
    projectile: 'bienen',
    base: [
      { cost: { schrott: 10, fasern: 2 }, damage: 9, range: 4.5, swarms: 1 },
      { cost: { schrott: 10 }, damage: 14, range: 4.8, swarms: 1 },
    ],
    specs: {
      A: {
        key: 'koenigin',
        levels: [
          { cost: { schrott: 16, zahnraeder: 1 }, damage: 12, range: 5, swarms: 2 },
          { cost: { schrott: 22, zahnraeder: 2 }, damage: 16, range: 5.3, swarms: 2 },
          { cost: { schrott: 32, moderkerne: 1 }, damage: 18, range: 5.6, swarms: 3 },
        ],
      },
      B: {
        key: 'honig',
        levels: [
          { cost: { schrott: 16, zahnraeder: 1 }, damage: 22, range: 5, swarms: 1, slow: 0.25, slowTime: 0.6 },
          { cost: { schrott: 22, zahnraeder: 2 }, damage: 30, range: 5.3, swarms: 1, slow: 0.3, slowTime: 0.6 },
          { cost: { schrott: 32, moderkerne: 1 }, damage: 40, range: 5.6, swarms: 1, slow: 0.35, slowTime: 0.6 },
        ],
      },
    },
  },
  // Vogelscheuche: lockt Schlurfer vom Weg auf sich und muss geflickt werden. Der
  // Strohmann hält mehr aus, bei der Krähenscheuche picken Krähen die Gelockten.
  vogelscheuche: {
    role: 'koeder',
    projectile: null,
    base: [
      { cost: { holz: 6, fasern: 4 }, hp: 70, lure: 2, range: 3.4, lureTime: 5 },
      { cost: { holz: 4, schrott: 6 }, hp: 100, lure: 3, range: 3.7, lureTime: 5 },
    ],
    specs: {
      A: {
        key: 'strohmann',
        levels: [
          { cost: { holz: 8, schrott: 12, zahnraeder: 1 }, hp: 160, lure: 4, range: 4, lureTime: 6 },
          { cost: { holz: 10, schrott: 18, zahnraeder: 2 }, hp: 230, lure: 5, range: 4.3, lureTime: 6 },
          { cost: { holz: 12, schrott: 26, moderkerne: 1 }, hp: 320, lure: 6, range: 4.6, lureTime: 7 },
        ],
      },
      B: {
        key: 'kraehen',
        levels: [
          { cost: { holz: 6, schrott: 14, zahnraeder: 1 }, hp: 110, lure: 3, range: 4, lureTime: 5, damage: 6 },
          { cost: { holz: 8, schrott: 20, zahnraeder: 2 }, hp: 150, lure: 3, range: 4.3, lureTime: 5, damage: 10 },
          { cost: { holz: 10, schrott: 30, moderkerne: 1 }, hp: 200, lure: 4, range: 4.6, lureTime: 6, damage: 15 },
        ],
      },
    },
  },
};

// Mischtürme (M20, mixes.js): Stufe 3–5 wie eine Spezialisierung »A« – Stufe 1 und 2
// gibt es nicht (sie entstehen erst beim Verbinden zweier Türme ab Stufe 3)
for (const [id, m] of Object.entries(MIXES)) {
  TOWERS[id] = { role: 'misch', projectile: m.projectile, mix: m.parts, strongest: Boolean(m.strongest), base: [m.levels[0], m.levels[0]], specs: { A: { key: id, levels: m.levels } } };
}

/** Werte eines Turms auf Stufe level (1..5) mit Spezialisierung spec ('A'|'B'|null). */
export function towerStats(type, level, spec) {
  const t = TOWERS[type];
  if (level <= 2) return t.base[level - 1];
  return t.specs[spec || 'A'].levels[level - 3];
}

/**
 * Besondere Turmteile (Meilenstein 10, DESIGN.md 6.9: »Balduin verkauft manchmal
 * besondere Turmteile«): Aufsätze, von denen jeder Turm einen tragen kann.
 * range/rate/aura sind Faktoren auf die Werte der Stufe; parts: Abschüsse
 * dieses Turms lassen immer Zombieteile fallen (sonst nur jedes zweite Mal).
 */
export const TOWER_PARTS = {
  fernrohr: { range: 1.25 }, // weiter sehen: Reichweite (beim Laternenturm auch die Aura)
  schmierfett: { rate: 1.25, aura: 1.25 }, // geölte Mechanik: schneller (Laternenturm: stärkere Aura)
  gluecksmuenze: { parts: true, not: ['laternenturm'] }, // Glück: jeder Abschuss lässt Teile fallen (die Laterne schießt nicht)
};
export const TOWER_PART_IDS = Object.keys(TOWER_PARTS);

/** Passt dieses Teil in diese Turmart? */
export function partFits(type, id) {
  return !(TOWER_PARTS[id]?.not || []).includes(type);
}

/**
 * Wirksame Werte eines Turms samt Turmteil. Zwischengespeichert am Bau (kein
 * neues Objekt pro Bild); neu gerechnet, wenn sich Stufe, Richtung oder Teil ändern.
 */
export function towerStatsOf(b) {
  const rank = towerRank(b.xp);
  const key = `${b.level}|${b.spec}|${b.part || ''}|${rank}`;
  if (b._statsKey === key) return b._stats;
  const base = towerStats(b.type, b.level, b.spec);
  const part = b.part ? TOWER_PARTS[b.part] : null;
  let s = base;
  if (part && (part.range || part.rate || part.aura)) {
    s = { ...base };
    if (part.range && base.range) s.range = base.range * part.range;
    if (part.range && base.auraRange) s.auraRange = base.auraRange * part.range;
    if (part.rate && base.rate && b.type !== 'laternenturm') s.rate = base.rate * part.rate;
    if (part.aura && base.aura) s.aura = base.aura * part.aura;
  }
  // Rang (M16): ein wenig mehr Schaden bzw. Aura
  const bonus = TOWER_RANKS[rank - 1].bonus;
  if (bonus > 0) {
    if (s === base) s = { ...base };
    if (s.damage) s.damage *= 1 + bonus;
    if (s.aura) s.aura *= 1 + bonus;
  }
  b._statsKey = key;
  b._stats = s;
  return s;
}

/**
 * Ränge (M16): Türme sammeln Erfahrung – je Schadenspunkt TOWER_DAMAGE_XP, je
 * Abschuss TOWER_KILL_XP, der Laternenturm für jeden Abschuss in seinem Licht. Rang II
 * bis IV bringen je einen Wimpel und etwas mehr Wirkung.
 */
export const TOWER_RANKS = [
  { xp: 0, bonus: 0 },
  { xp: 150, bonus: 0.08 },
  { xp: 500, bonus: 0.16 },
  { xp: 1200, bonus: 0.25 },
];
export const TOWER_KILL_XP = 6;
/** Erfahrung je Schadenspunkt (m16-r1: vorher 1 – Rang IV kam schon in der ersten Nacht). */
export const TOWER_DAMAGE_XP = 0.25;
export const TOWER_LIGHT_XP = 4;
export const RANK_NAMES = ['I', 'II', 'III', 'IV'];

/** Rang 1–4 aus der Erfahrung. */
export function towerRank(xp) {
  let rank = 1;
  for (let k = 1; k < TOWER_RANKS.length; k++) if ((xp || 0) >= TOWER_RANKS[k].xp) rank = k + 1;
  return rank;
}

/** Gesamtkosten bis zu einer Stufe (für den Abriss: 70 % davon zurück). */
export function towerInvested(type, level, spec) {
  const total = {};
  for (let l = 1; l <= level; l++) {
    for (const [res, n] of Object.entries(towerStats(type, l, spec).cost)) total[res] = (total[res] || 0) + n;
  }
  return total;
}

export const TOWER_REFUND = 0.7;

/**
 * Jeder weitere Turm derselben Art kostet 2 Schrott mehr (höchstens +8) –
 * sonst lohnt nur das Streuen billiger Bolzenwerfer, nie das Aufrüsten (m3-r1).
 */
export const TOWER_EXTRA = 2;
export const TOWER_EXTRA_MAX = 8;

/** Baukosten des nächsten Turms, wenn schon `count` dieser Art stehen. */
export function towerBuildCost(type, count) {
  const base = TOWERS[type].base[0].cost;
  const extra = Math.min(TOWER_EXTRA_MAX, TOWER_EXTRA * count);
  return { ...base, schrott: (base.schrott || 0) + extra };
}
