// Die Schlurfer. Werte gelten für Nacht 1; jede Nacht bekommt mehr Leben
// (siehe waves.js). Loot: [min, max] Stück oder Wahrscheinlichkeit für eins.
//
//   hp        Lebenspunkte              speed   Meter pro Sekunde
//   armor     zieht von jedem Treffer ab (Scharfschütze ignoriert sie)
//   hit       Schaden pro Schlag gegen Zuhause und Barrikaden
//   bite      Schaden pro Schlag gegen Mika
//   hitRate   Schläge pro Sekunde        scale   Größe (1 = wie Mika)
//   radius    Kollisionsradius
//   aggro     ab dieser Nähe (m) gehen sie nachts auf Mika los (M8: vorher 3,2 für alle)

export const ZOMBIES = {
  schlurfer: {
    hp: 30,
    speed: 0.8, // M8: 0,72 – keine Herausforderung
    armor: 0,
    hit: 4,
    bite: 7,
    aggro: 4.5,
    hitRate: 0.6,
    scale: 1,
    radius: 0.28,
    loot: { schrott: [1, 2], zahnraeder: 0.03 }, // m3-r1: Zahnräder waren zu selten
    xp: 1,
  },
  flitzer: {
    hp: 20,
    speed: 1.55,
    armor: 0,
    hit: 3,
    bite: 5,
    aggro: 6.5, // schnell und neugierig: sucht Mika zuerst
    hitRate: 1,
    scale: 0.95,
    radius: 0.25,
    loot: { schrott: [1, 2], zahnraeder: 0.03 }, // m3-r1: Zahnräder waren zu selten
    xp: 1,
  },
  schwaermer: {
    hp: 12,
    speed: 1.05,
    armor: 0,
    hit: 2,
    bite: 3,
    aggro: 5,
    hitRate: 0.9,
    scale: 0.62,
    radius: 0.2,
    loot: { schrott: [0, 1] },
    xp: 0.5,
  },
  brummer: {
    hp: 150,
    speed: 0.5,
    armor: 6,
    hit: 12,
    bite: 12,
    aggro: 3.5,
    hitRate: 0.5,
    scale: 1.4,
    radius: 0.42,
    breaksBarricades: true,
    loot: { schrott: [4, 6], zahnraeder: 0.3 },
    xp: 4,
  },
  leuchtpilz: {
    hp: 48,
    speed: 0.8,
    armor: 0,
    hit: 4,
    bite: 5,
    hitRate: 0.6,
    scale: 1.05,
    radius: 0.3,
    heal: 4, // Lebenspunkte pro Sekunde für Nachbarn
    healRange: 2.2,
    haste: 0.15, // Nachbarn werden schneller
    immuneSlow: true,
    loot: { schrott: [2, 3], zahnraeder: 0.2 },
    xp: 3,
  },
  anfuehrer: {
    hp: 700,
    speed: 0.55,
    armor: 4,
    hit: 18,
    bite: 16,
    hitRate: 0.6,
    scale: 1.65,
    radius: 0.5,
    breaksBarricades: true,
    summon: { type: 'schlurfer', count: 3, every: 9 },
    loot: { schrott: [18, 24], zahnraeder: [2, 3], moderkerne: 1 },
    xp: 20,
  },
};

/**
 * Schläge aufs Zuhause zählen nur so viel (m7-r1): Kam ein Trupp an den Türmen
 * vorbei, fiel das Zuhause in wenigen Sekunden – zu schnell, um hinzulaufen und
 * mitzukämpfen. Türme, Barrikaden und Mika treffen die Schlurfer wie bisher.
 */
export const HOUSE_DAMAGE = 0.8; // M8: 0,6 machte die Nächte zu harmlos

/** Nachts: Spürweite für Arten ohne eigenen Wert (m). */
export const NIGHT_AGGRO = 4;

/** Tagesschlurfer: träge, wenig Leben, kaum Loot, greifen nur sehr nah an. */
export const DAY_ZOMBIE = { type: 'schlurfer', hpFactor: 0.7, speedFactor: 0.65, lootFactor: 0.5, aggro: 1.4 };
