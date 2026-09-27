// Einrichten (Meilenstein 6, DESIGN.md 6.8): Dinge, die das Zuhause gemütlich
// machen. Jedes Stück gibt es einmal, es hat einen festen Platz (Modelle in
// world/furnitureModels.js) und bringt Gemütlichkeit. Die Reihenfolge ist die,
// in der die Bauleiste sie anbietet (immer das nächste noch fehlende Stück).

export const FURNITURE_ORDER = ['bild', 'teekanne', 'wimpel', 'lichterkette', 'stehlampe', 'lesesessel'];

export const FURNITURE = {
  bild: { cost: { holz: 3, schrott: 1 }, cozy: 1 },
  teekanne: { cost: { stein: 2, schrott: 1 }, cozy: 1 },
  wimpel: { cost: { stoff: 2, fasern: 2 }, cozy: 1 },
  lichterkette: { cost: { schrott: 4, stoff: 1 }, cozy: 2 },
  stehlampe: { cost: { schrott: 5, holz: 2, stoff: 1 }, cozy: 2 },
  lesesessel: { cost: { holz: 8, stoff: 4 }, cozy: 2 },
  koerbchen: { cost: { holz: 3, stoff: 2 }, cozy: 1, needs: 'knopf' }, // draußen am Feuer
};

/**
 * Morgen-Bonus je nach Gemütlichkeit: so viel Erfahrung wie Punkte, ab
 * `rested` Punkten ausgeschlafen – schneller unterwegs bis Mittag.
 */
export const COZY = { rested: 5, restedSpeed: 1.1, restedUntilHour: 12 };

/** Gemütlichkeit aus der Liste gekaufter Stücke. */
export function coziness(owned) {
  return (owned || []).reduce((sum, id) => sum + (FURNITURE[id]?.cozy || 0), 0);
}

/** Höchste erreichbare Gemütlichkeit (für die Anzeige »7/10«). */
export const MAX_COZY = Object.values(FURNITURE).reduce((sum, f) => sum + f.cozy, 0);
