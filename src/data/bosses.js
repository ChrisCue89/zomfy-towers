// Bosse (M22, DESIGN 8): In jeder fünften Nacht führt statt des Anführers ein
// Boss die letzte Welle an – mit Namen, Lebensbalken oben im Bild, eigener Musik
// und angekündigten Angriffen: erst ein Ring am Boden und ein Wort über dem
// Kopf, dann der Schlag. Werte hier; das Verhalten steht in horde.js
// (Ankündigung, Ausführung), die Wirkung in game.js.

/** Reihenfolge der Bosse: Nacht 5, 10, 15, 20 – danach von vorn, zäher. */
export const BOSS_ORDER = ['holzfaeller', 'pilzmutter', 'laternenhexe', 'moosriese'];

/** Das Finale (M25): In der Frostnacht führt das Moderherz die zweite Welle an (FINALE.heartWave). */
export const FINALE_BOSS = 'moderherz';

/** Boss der Nacht n (oder null). */
export function bossOfNight(n) {
  if (n < 5 || n % 5 !== 0) return null;
  return BOSS_ORDER[(n / 5 - 1) % BOSS_ORDER.length];
}

/**
 * Leben der Bosse (B1): Sie tragen die Zähigkeit ihrer Nacht (wie deren Horde, mit dem Rabatt der
 * Bossnacht) und ein Fünftel mehr – so kommt der Holzfäller auf »Ausgewogen« bis an die erste
 * Barrikadenreihe und zeigt dort seinen Hieb, statt 20 m davor zu fallen (Balance-Durchlauf).
 */
export const BOSS_HP = 1.2;

/** Leben-Faktor des Bosses: jede weitere Runde durch alle vier 60 % mehr. */
export function bossHpFactor(n) {
  return 1 + Math.floor((n / 5 - 1) / BOSS_ORDER.length) * 0.6;
}

/**
 * Angriffe: alle `every` Sekunden (der erste nach `first`), `telegraph` Sekunden
 * Ankündigung, in der der Boss stillsteht.
 *   hieb      Holzfäller: zerschlägt Barrikaden und Zubehör im Umkreis `radius`
 *             vor sich (`damage`), trifft Mika (`bite`), danach stürmt er
 *             `charge` Sekunden mit `chargeSpeed`-facher Geschwindigkeit
 *   sporen    Pilzmutter: heilt die Horde im Umkreis um `heal` ihres Lebens,
 *             `spawn` Schwärmer schlüpfen aus der Wolke
 *   lichtraub Laternenhexe: löscht jedes Licht im Umkreis für `time` Sekunden
 *             (Lichtinseln, Mikas Laterne) und heilt sich je gestohlenem Licht
 *             um `healPer` ihres Lebens
 *   stampfer  Moosriese: Barrikaden und Zubehör im Umkreis nehmen `damage`,
 *             Mika wird `stun` Sekunden umgeworfen
 */
export const BOSS_ATTACKS = {
  hieb: { first: 5, every: 9, telegraph: 1.2, radius: 2.4, damage: 420, bite: 22, charge: 2.2, chargeSpeed: 3.2 },
  sporen: { first: 6, every: 11, telegraph: 1.4, radius: 5, heal: 0.25, spawn: 3 },
  lichtraub: { first: 5, every: 12, telegraph: 1.5, radius: 9, time: 25, healPer: 0.03 },
  stampfer: { first: 6, every: 10, telegraph: 1.2, radius: 2.8, damage: 160, bite: 18, stun: 1.2 },
  // Moderherz (M25): Wurzeln brechen aus dem Boden – Barrikaden und Zubehör ringsum, Mika im Kreis
  wurzeln: { first: 5, every: 8, telegraph: 1.4, radius: 3.2, damage: 260, bite: 20 },
};

/** Zerfällt der Boss (Moosriese): so groß und so viel Leben haben die Teile. */
export const SPLIT = { size: 0.55, hp: 0.25 };
