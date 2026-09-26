// Bauten der Bauleiste (Reiter „Zuhause“). Kosten in Vorratseinheiten.
// w × d = Grundriss in 1-m-Zellen (bei turns = 1 vertauscht).

export const BUILDINGS = {
  werkbank: { w: 2, d: 1, cost: { holz: 8, stein: 4 }, max: 1, icon: 'werkbank', use: 'werkbank' },
  barrikade: { w: 1, d: 1, cost: { holz: 3 }, icon: 'barrikade', repeat: true },
  laternenpfahl: { w: 1, d: 1, cost: { holz: 2, schrott: 2, stoff: 1 }, icon: 'laternenpfahl', repeat: true },
  beet: { w: 2, d: 1, cost: { holz: 4, fasern: 4 }, icon: 'beet', use: 'ernten', harvest: { fasern: 3 } },
  bank: { w: 2, d: 1, cost: { holz: 5 }, icon: 'bank', use: 'bank', max: 3 },
};

/** Reihenfolge im Reiter „Zuhause“ (nach dem Hausausbau). */
export const HOME_TAB = ['werkbank', 'barrikade', 'laternenpfahl', 'beet', 'bank'];

/** Ausbaustufen des Zuhauses. Stufe 1 = Notunterkunft. */
export const HOUSE_LEVELS = [
  null,
  { key: 'notunterkunft' },
  { key: 'huette', cost: { holz: 30, stein: 16, stoff: 6, schrott: 8 } },
];

/** Grundriss unter Berücksichtigung der Drehung. */
export function footprint(type, turns = 0) {
  const b = BUILDINGS[type];
  return turns % 2 ? { w: b.d, d: b.w } : { w: b.w, d: b.d };
}
