// Bauten der Bauleiste (Reiter „Zuhause“). Kosten in Vorratseinheiten.
// w × d = Grundriss in 1-m-Zellen (bei turns = 1 vertauscht).

export const BUILDINGS = {
  werkbank: { w: 2, d: 1, cost: { holz: 8, stein: 2 }, max: 1, icon: 'werkbank', use: 'werkbank', height: 1.6 },
  barrikade: { w: 1, d: 1, cost: { holz: 3 }, icon: 'barrikade', repeat: true, height: 1.1 },
  laternenpfahl: { w: 1, d: 1, cost: { holz: 2, schrott: 2, stoff: 1 }, icon: 'laternenpfahl', repeat: true, height: 2 },
  beet: { w: 2, d: 1, cost: { holz: 4, fasern: 4 }, icon: 'beet', use: 'ernten', harvest: { fasern: 3 }, height: 0.7 },
  bank: { w: 2, d: 1, cost: { holz: 5 }, icon: 'bank', use: 'bank', max: 3, height: 1 },
};

/** Reihenfolge im Reiter „Zuhause“ (nach dem Hausausbau). */
export const HOME_TAB = ['werkbank', 'barrikade', 'laternenpfahl', 'beet', 'bank'];

/** Ausbaustufen des Zuhauses. Stufe 1 = Notunterkunft. */
export const HOUSE_LEVELS = [
  null,
  { key: 'notunterkunft' },
  { key: 'huette', cost: { holz: 30, stein: 12, stoff: 5, schrott: 8 } },
];

/** Grundriss unter Berücksichtigung der Drehung. */
export function footprint(type, turns = 0) {
  const b = BUILDINGS[type];
  return turns % 2 ? { w: b.d, d: b.w } : { w: b.w, d: b.d };
}
