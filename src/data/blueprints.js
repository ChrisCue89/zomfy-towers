// Baupläne (M19, DESIGN.md 8): Am Anfang kennt Mika die vier Türme und die
// Holzbarrikade. Nach jeder gewonnenen Nacht wählt man einen von drei
// Bauplänen – jedes Spiel bekommt so seinen eigenen Bau-Weg. Baupläne finden
// sich auch im Wrack (einmal) und bei Balduin (für Zombieteile).
//
// Ein Bauplan schaltet den Bau gleichen Namens frei (buildings.js).
//   kind:   'turm' (neue Familie) oder 'falle' (auf den Weg)
//   weight: wie gern er in der Auswahl auftaucht
//   night:  frühestens nach dieser Nacht (Knallerbsen und Ölspur brauchen etwas
//           Übung mit den Wegen)

import { Rng } from '../core/rng.js';

export const START_BUILDINGS = ['bolzen', 'katapult', 'sprenger', 'laternenturm', 'barrikade'];

export const BLUEPRINTS = {
  glockenturm: { kind: 'turm', weight: 3 },
  windrad: { kind: 'turm', weight: 3 },
  bienenkorb: { kind: 'turm', weight: 3 },
  vogelscheuche: { kind: 'turm', weight: 3 },
  stachelbrett: { kind: 'falle', weight: 2 },
  leimtopf: { kind: 'falle', weight: 2 },
  klettenteppich: { kind: 'falle', weight: 2 },
  knallerbsen: { kind: 'falle', weight: 2, night: 2 },
  oelspur: { kind: 'falle', weight: 2, night: 3 },
};
export const BLUEPRINT_IDS = Object.keys(BLUEPRINTS);

/** So viele Baupläne stehen zur Wahl. */
export const BLUEPRINT_CHOICES = 3;

/** Balduin verkauft einen Bauplan (Wahl aus drei) für so viele Zombieteile – einmal je Besuch. */
export const BLUEPRINT_PRICE = { teile: 4 };

/**
 * Startwert einer Bauplan-Wahl: aus dem Wegenetz, der Nacht und wie viele Pläne
 * schon gewählt sind – neu laden würfelt nicht neu, zwei Spiele wählen verschieden.
 */
export function blueprintSeed(mapSeed, night, known) {
  return ((mapSeed || 1) * 977 + night * 131 + known * 17 + 5) >>> 0;
}

/** Kennt Mika diesen Bau (von Anfang an oder aus einem Bauplan)? */
export function knowsBuilding(known, type) {
  return !BLUEPRINTS[type] || known.includes(type);
}

/**
 * Drei Baupläne zur Wahl – ohne die schon bekannten, nach Gewicht gezogen und
 * möglichst aus verschiedenen Arten (ein Turm, eine Falle …). Der Zufall hängt
 * am Startwert: Neu laden würfelt nicht neu.
 * @param {string[]} known  schon freigeschaltete Baupläne
 * @param {number} night    Nummer der gewonnenen Nacht (0 = noch keine)
 * @param {number} seed
 */
export function blueprintOptions(known, night, seed) {
  const rng = new Rng(seed);
  let pool = BLUEPRINT_IDS.filter((id) => !known.includes(id) && (BLUEPRINTS[id].night || 0) <= night);
  const out = [];
  const draw = (list) => {
    const total = list.reduce((sum, id) => sum + BLUEPRINTS[id].weight, 0);
    let r = rng.next() * total;
    for (const id of list) {
      r -= BLUEPRINTS[id].weight;
      if (r < 0) return id;
    }
    return list[list.length - 1];
  };
  while (out.length < BLUEPRINT_CHOICES && pool.length) {
    // Erst eine Art, die noch nicht zur Wahl steht – dann, was übrig ist
    const kinds = new Set(out.map((id) => BLUEPRINTS[id].kind));
    const fresh = pool.filter((id) => !kinds.has(BLUEPRINTS[id].kind));
    const id = draw(fresh.length ? fresh : pool);
    out.push(id);
    pool = pool.filter((p) => p !== id);
  }
  return out;
}
