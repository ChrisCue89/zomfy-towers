// Aufwertungen der Figur (H5: an der Werkbank, Seite »Figur«). Jede hat drei Stufen;
// value(stufe) liefert den Wert, cost[stufe] den Preis der nächsten Stufe.

export const UPGRADES = {
  radius: {
    icon: 'magnet',
    values: [2.0, 2.8, 3.6, 4.6], // Sammelradius in Metern (m3-r1: Grundwert war zu klein)
    cost: [{ schrott: 6 }, { schrott: 12 }, { schrott: 20, zahnraeder: 1 }],
  },
  leben: {
    icon: 'herz',
    values: [100, 130, 170, 220], // Lebenspunkte
    cost: [{ schrott: 8 }, { schrott: 14 }, { schrott: 22, zahnraeder: 1 }],
  },
  schlag: {
    icon: 'faust',
    values: [1, 1.5, 2.1, 2.8], // Schadensfaktor im Nahkampf
    cost: [{ schrott: 8 }, { schrott: 15 }, { schrott: 25, zahnraeder: 1 }],
  },
  tempo: {
    icon: 'stiefel',
    values: [1, 1.08, 1.16, 1.25], // Lauftempo
    cost: [{ schrott: 6 }, { schrott: 12 }, { schrott: 20 }],
  },
};

export const UPGRADE_ORDER = ['radius', 'leben', 'schlag', 'tempo'];

export function upgradeValue(state, id) {
  const level = state.upgrades?.[id] || 0;
  return UPGRADES[id].values[Math.min(level, UPGRADES[id].values.length - 1)];
}
