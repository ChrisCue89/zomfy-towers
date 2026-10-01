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
//   smash     Faktor auf `hit` gegen Barrikaden (M9: alle schlagen Barrikaden ein,
//             Brummer und Anführer besonders hart)
//   heavy     schwer: Rückstoß, Frost, Betäubung und Locken wirken nur halb (M22)
//   boss      Boss (M22): Name und Lebensbalken oben, eigene Musik, Angriffe aus
//             data/bosses.js (`attacks`); `split`: zerfällt beim Tod in so viele
//   flying    fliegt über Barrikaden (Fallen und Flächen am Boden treffen ihn nicht)
//   digger    buddelt sich unter Barrikaden durch      door  Tür vorn: fängt ab, bis sie bricht
//   lightproof  Licht schreckt ihn nicht               snuff löscht Lichter im Umkreis (m)
//   brood     legt Sporenkapseln (alle `every` s, schlüpfen nach `hatch` s: `count` Schwärmer,
//             höchstens `max` Kapseln je Brüter – M25c: sonst ohne Ende in späten Nächten)
//   steadfast standhaft (M25, das Moderherz): keine Betäubung, kein Rückstoß, kein Locken –
//             nur Licht macht es müde; bei vielen Türmen stand es sonst still

export const ZOMBIES = {
  schlurfer: {
    hp: 30,
    speed: 1.1, // M8: 0,72 – keine Herausforderung; M9: 0,8 – lange Wege; M9.1: 1,0 – »etwas schneller« (alle Arten +10 %)
    armor: 0,
    hit: 4,
    bite: 7,
    aggro: 4.5,
    hitRate: 0.6,
    scale: 1,
    radius: 0.28,
    loot: { teile: [1, 2], zahnraeder: 0.03 }, // m3-r1: Zahnräder waren zu selten
    xp: 1,
  },
  flitzer: {
    hp: 20,
    speed: 1.95,
    armor: 0,
    hit: 3,
    bite: 5,
    aggro: 6.5, // schnell und neugierig: sucht Mika zuerst
    hitRate: 1,
    scale: 0.95,
    radius: 0.25,
    loot: { teile: [1, 2], zahnraeder: 0.03 }, // m3-r1: Zahnräder waren zu selten
    xp: 1,
  },
  schwaermer: {
    hp: 12,
    speed: 1.35,
    armor: 0,
    hit: 2,
    bite: 3,
    aggro: 5,
    hitRate: 0.9,
    scale: 0.62,
    radius: 0.2,
    loot: { teile: [0, 1] },
    xp: 0.5,
  },
  brummer: {
    hp: 150,
    speed: 0.68,
    armor: 6,
    hit: 12,
    bite: 12,
    aggro: 3.5,
    hitRate: 0.5,
    scale: 1.4,
    radius: 0.42,
    smash: 2,
    heavy: true,
    loot: { teile: [4, 6], zahnraeder: 0.3 },
    xp: 4,
  },
  leuchtpilz: {
    hp: 48,
    speed: 1.1,
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
    loot: { teile: [2, 3], zahnraeder: 0.2 },
    xp: 3,
  },
  anfuehrer: {
    hp: 700,
    speed: 0.75,
    armor: 4,
    hit: 18,
    bite: 16,
    hitRate: 0.6,
    scale: 1.65,
    radius: 0.5,
    smash: 2,
    heavy: true,
    summon: { type: 'schlurfer', count: 3, every: 9 },
    loot: { teile: [18, 24], zahnraeder: [2, 3], moderkerne: 1 },
    partsAlways: true, // sein Haufen Teile hängt nicht an einem Münzwurf
    xp: 20,
  },
  // --- Neue Arten (M22): jede stellt eine eigene Frage ---
  // Moderfalter: fliegt über dem Weg, über Barrikaden hinweg – nur Türme und Mika treffen ihn
  moderfalter: {
    hp: 22,
    speed: 1.45,
    armor: 0,
    hit: 3,
    bite: 4,
    aggro: 3,
    hitRate: 0.8,
    scale: 0.85,
    radius: 0.22,
    flying: true,
    loot: { teile: [1, 1], zahnraeder: 0.03 },
    xp: 1,
  },
  // Gräber: buddelt sich unter Barrikaden durch (Wall und Tor muss er einschlagen)
  graeber: {
    hp: 46,
    speed: 0.95,
    armor: 1,
    hit: 4,
    bite: 7,
    hitRate: 0.6,
    scale: 1,
    radius: 0.28,
    digger: true,
    loot: { teile: [1, 2], zahnraeder: 0.08 },
    xp: 2,
  },
  // Schildträger: trägt eine alte Tür vor sich – von vorn fängt sie drei Viertel ab, bis sie bricht
  schildtraeger: {
    hp: 60,
    speed: 0.9,
    armor: 0,
    hit: 5,
    bite: 7,
    hitRate: 0.55,
    scale: 1.1,
    radius: 0.32,
    door: { hp: 140, front: 0.25, angle: 70 },
    loot: { teile: [2, 3], zahnraeder: 0.1 },
    xp: 2,
  },
  // Lichtfresser: löscht Fackeln und Laternen am Weg (bis zum Morgen), Licht schreckt ihn nicht
  lichtfresser: {
    hp: 40,
    speed: 1,
    armor: 0,
    hit: 3,
    bite: 5,
    hitRate: 0.7,
    scale: 1,
    radius: 0.28,
    lightproof: true,
    snuff: 1.7, // so nah löscht er ein Licht (m)
    loot: { teile: [1, 2], zahnraeder: 0.06 },
    xp: 2,
  },
  // Brüter: legt Sporenkapseln, aus denen Schwärmer schlüpfen – Mika kann sie zertreten
  brueter: {
    hp: 75,
    speed: 0.72,
    armor: 2,
    hit: 5,
    bite: 7,
    hitRate: 0.5,
    scale: 1.2,
    radius: 0.36,
    brood: { every: 7, hatch: 5, count: 3, hp: 12, max: 4 },
    loot: { teile: [2, 4], zahnraeder: 0.12 },
    xp: 3,
  },
  // --- Bosse (M22): statt des Anführers in jeder fünften Nacht (data/bosses.js) ---
  // Der Holzfäller (Nacht 5): zerschlägt Barrikaden mit einem Hieb und stürmt
  holzfaeller: {
    hp: 950,
    speed: 0.8,
    armor: 4,
    hit: 20,
    bite: 18,
    hitRate: 0.6,
    scale: 1.75,
    radius: 0.5,
    smash: 2.5,
    heavy: true,
    boss: true,
    attacks: ['hieb'],
    loot: { teile: [20, 26], zahnraeder: [2, 3], moderkerne: 1 },
    partsAlways: true,
    xp: 25,
  },
  // Die Pilzmutter (Nacht 10): Sporenwolken heilen die Horde, aus ihnen schlüpfen Schwärmer
  pilzmutter: {
    hp: 1300,
    speed: 0.6,
    armor: 2,
    hit: 14,
    bite: 14,
    hitRate: 0.5,
    scale: 1.8,
    radius: 0.55,
    smash: 2,
    heavy: true,
    boss: true,
    immuneSlow: true,
    attacks: ['sporen'],
    loot: { teile: [22, 28], zahnraeder: [2, 4], moderkerne: 1 },
    partsAlways: true,
    xp: 30,
  },
  // Die Laternenhexe (Nacht 15): stiehlt das Licht ringsum und heilt sich daran
  laternenhexe: {
    hp: 1150,
    speed: 0.95,
    armor: 2,
    hit: 14,
    bite: 16,
    hitRate: 0.7,
    scale: 1.6,
    radius: 0.45,
    smash: 2,
    heavy: true,
    boss: true,
    lightproof: true,
    attacks: ['lichtraub'],
    loot: { teile: [22, 28], zahnraeder: [3, 4], moderkerne: 1 },
    partsAlways: true,
    xp: 30,
  },
  // Der Moosriese (Nacht 20): stampft Barrikaden und Mika um, zerfällt in drei
  moosriese: {
    hp: 2200,
    speed: 0.55,
    armor: 8,
    hit: 26,
    bite: 22,
    hitRate: 0.45,
    scale: 2.1,
    radius: 0.62,
    smash: 3,
    heavy: true,
    boss: true,
    attacks: ['stampfer'],
    split: 3,
    loot: { teile: [26, 32], zahnraeder: [3, 5], moderkerne: 2 },
    partsAlways: true,
    xp: 40,
  },
  // --- Finale (M25): das Moderherz in der Frostnacht (data/autumn.js) ---
  // Langsam, riesig und gepanzert; Wurzeln brechen Barrikaden, später Sporen.
  // Unter zwei Dritteln seines Lebens ruft es die Horde über alle Wege, unter
  // einem Drittel kommt der Frost.
  moderherz: {
    hp: 4800,
    speed: 0.42,
    armor: 6,
    hit: 28,
    bite: 24,
    hitRate: 0.45,
    scale: 2.3,
    radius: 0.85,
    smash: 4,
    heavy: true,
    boss: true,
    immuneSlow: true,
    steadfast: true, // M25: sonst hielten viele Türme es mit Betäubung und Rückstoß am Waldrand fest
    heart: true,
    // Es zieht das Feuer der Scharfschützen auf sich: Sie zielen auf den Stärksten, und die zähen
    // Brummer der späten Nächte hatten fast so viel Leben – das Herz erstarrte fast unberührt
    drawsFire: true,
    attacks: ['wurzeln'],
    loot: { teile: [40, 50], zahnraeder: [4, 6], moderkerne: 3 },
    partsAlways: true,
    xp: 80,
  },
};

/**
 * Schläge aufs Zuhause zählen nur so viel (m7-r1): Kam ein Trupp an den Türmen
 * vorbei, fiel das Zuhause in wenigen Sekunden – zu schnell, um hinzulaufen und
 * mitzukämpfen. Türme, Barrikaden und Mika treffen die Schlurfer wie bisher.
 */
export const HOUSE_DAMAGE = 0.8; // M8: 0,6 machte die Nächte zu harmlos

/**
 * Zombieteile (M9.1, Wunsch des Auftraggebers): Nicht jeder Schlurfer verliert
 * Teile. Wer ihn selbst erschlägt, bekommt sicher welche; fällt er durch einen
 * Turm (auch im Feuer), nur mit dieser Wahrscheinlichkeit. Zahnräder und
 * Moderkerne fallen wie bisher, der Anführer lässt immer Teile (partsAlways).
 */
export const PARTS_FROM_TOWERS = 0.5;

/** Nachts: Spürweite für Arten ohne eigenen Wert (m). */
export const NIGHT_AGGRO = 4;

/** Tagesschlurfer: träge, wenig Leben, kaum Loot, greifen nur sehr nah an. */
export const DAY_ZOMBIE = { type: 'schlurfer', hpFactor: 0.7, speedFactor: 0.65, lootFactor: 0.5, aggro: 1.4 };
