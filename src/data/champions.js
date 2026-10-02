// Champions (M21, DESIGN.md 8): Ab Nacht 3 läuft in einzelnen Wellen ein
// Schlurfer mit goldenem Schimmer, einem Namen und Merkmalen mit. Wer ihn
// erwischt, findet eine Fundkiste, die in Beute aufplatzt – mit einem Turmteil.
// Hier wird balanciert; die Namen stehen in texts.js (T.champions.namen).

import { Rng } from '../core/rng.js';

/** Ab dieser Nacht gibt es Champions. */
export const CHAMPION_FROM_NIGHT = 3;

/**
 * So viele Champions in Nacht n (höchstens einer je Welle).
 * @param {number} [early] so viele Nächte früher kommt der erste (»Wild«, M25c) –
 *   nur der Anfang rückt vor, die Anzahl je Nacht bleibt (sonst wurde Nacht 9 mit
 *   drei Champions bei voller Zähigkeit zur Spitze: Durchbruch, Mika bei 4 Leben)
 */
export function championsInNight(n, early = 0) {
  if (n < CHAMPION_FROM_NIGHT - early) return 0;
  return n < 6 ? 1 : n < 10 ? 2 : 3;
}

/** Merkmale je Champion: bis Nacht 5 eins, danach zwei. */
export function traitCount(n) {
  return n >= 6 ? 2 : 1;
}

/** Grundwerte: Leben ×hp, Größe ×scale, Erfahrung ×xp, Beute ×loot. */
export const CHAMPION = { hp: 3, scale: 1.15, xp: 4, loot: 2 };

/**
 * Merkmale:
 *   moosig         heilt `regen` (Anteil des Lebens je s), wenn ihn `calm` s nichts traf
 *   gepanzert      jeder Treffer verliert `armor` Schaden mehr (wie beim Brummer)
 *   flink          `speed`-mal so schnell
 *   schildtragend  ein Schild fängt Schaden bis `shield` × Leben ab, dann bricht er
 *   teilend        zerfällt in `split` kleine Schlurfer mit `splitHp` seines Lebens
 *   lichtfressend  nicht zu blenden und nicht zu betäuben; Licht (Laternenturm) bremst ihn nicht
 */
export const TRAITS = {
  moosig: { regen: 0.05, calm: 1.5 },
  gepanzert: { armor: 6 },
  flink: { speed: 1.35 },
  schildtragend: { shield: 0.5 },
  teilend: { split: 2, splitHp: 0.3 },
  lichtfressend: { lightproof: true },
};
export const TRAIT_IDS = Object.keys(TRAITS);

/** Diese Arten können Champion werden (keine Schwärmer, kein Anführer). */
export const CHAMPION_TYPES = ['schlurfer', 'flitzer', 'brummer', 'leuchtpilz'];

/** Wie viele Namen es gibt (T.champions.namen hat genau so viele). */
export const CHAMPION_NAMES = 16;

/**
 * Fundkiste: Seltenheit des Turmteils (Gewichte) und was sonst herausfällt.
 * Die Kiste fliegt nicht zu Mika – sie platzt auf, wenn Mika davorsteht.
 */
export const CHEST_RARITY = { gewoehnlich: 40, selten: 34, besonders: 21, einzigartig: 5 };
export const CHEST_LOOT = { schrott: [3, 5], teile: [2, 4], zahnraeder: 0.5 };
/** So nah muss Mika an die Kiste (m). */
export const CHEST_REACH = 0.85;

/**
 * Champions einer Nacht in den Plan eintragen: je Welle höchstens einer, in
 * späteren Wellen lieber. Ein eigener Zufall (nicht der des Wellenplans), damit
 * die Wellen aus früheren Ständen gleich bleiben.
 * @param {Array<{spawns: Array<object>}>} waves
 * @param {number} [early] so viele Nächte früher kommt der erste (Schwierigkeit »Wild«, M25c)
 */
export function addChampions(waves, n, seed, early = 0) {
  const count = Math.min(championsInNight(n, early), waves.length);
  if (!count) return;
  const rng = new Rng(seed * 37 + n * 131);
  // Wellen von hinten nach vorn: die letzten sind die großen
  const order = waves.map((_, w) => w).sort((a, b) => b - a);
  const chosen = [];
  for (const w of order) {
    if (chosen.length >= count) break;
    if (rng.chance(0.7) || waves.length - chosen.length <= count) chosen.push(w);
  }
  for (const w of chosen) {
    const pool = waves[w].spawns.filter((s) => CHAMPION_TYPES.includes(s.type));
    if (!pool.length) continue;
    const s = pool[Math.floor(pool.length * (0.35 + rng.next() * 0.5))]; // eher aus der Mitte der Welle
    const traits = [];
    while (traits.length < traitCount(n)) {
      const t = rng.pick(TRAIT_IDS);
      if (!traits.includes(t)) traits.push(t);
    }
    s.champion = { name: rng.int(0, CHAMPION_NAMES - 1), traits };
  }
}

/** Champion-Angaben aus einem Spielstand prüfen (sonst null). */
export function cleanChampion(c) {
  if (!c || typeof c !== 'object') return null;
  const traits = Array.isArray(c.traits) ? [...new Set(c.traits.filter((t) => TRAITS[t]))].slice(0, 3) : [];
  const name = Number.isInteger(c.name) ? Math.max(0, Math.min(CHAMPION_NAMES - 1, c.name)) : 0;
  return { name, traits };
}
