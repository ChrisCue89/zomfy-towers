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

export const TOWER_TYPES = ['bolzen', 'katapult', 'sprenger', 'laternenturm'];

export const TOWERS = {
  bolzen: {
    role: 'einzel',
    projectile: 'bolzen',
    base: [
      { cost: { schrott: 8 }, damage: 14, rate: 1.1, range: 5.5 },
      { cost: { schrott: 10 }, damage: 21, rate: 1.2, range: 6 },
    ],
    specs: {
      A: {
        key: 'scharf',
        levels: [
          { cost: { schrott: 14, zahnraeder: 1 }, damage: 55, rate: 0.6, range: 7, pierce: true, strongest: true },
          { cost: { schrott: 20, zahnraeder: 2 }, damage: 85, rate: 0.65, range: 7.8, pierce: true, strongest: true },
          { cost: { schrott: 30, moderkerne: 1 }, damage: 140, rate: 0.7, range: 8.8, pierce: true, strongest: true },
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
      { cost: { schrott: 12 }, damage: 26, rate: 0.5, range: 6.5, splash: 1.3 },
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
      { cost: { schrott: 11 }, damage: 4, rate: 4, range: 3.9, slow: 0.45, slowTime: 1.4 },
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
      { cost: { schrott: 12 }, aura: 0.15, auraRange: 3.2, range: 3.2 },
      { cost: { schrott: 14 }, aura: 0.25, auraRange: 3.5, range: 3.5 },
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
};

/** Werte eines Turms auf Stufe level (1..5) mit Spezialisierung spec ('A'|'B'|null). */
export function towerStats(type, level, spec) {
  const t = TOWERS[type];
  if (level <= 2) return t.base[level - 1];
  return t.specs[spec || 'A'].levels[level - 3];
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
