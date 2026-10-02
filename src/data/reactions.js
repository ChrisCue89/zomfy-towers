// Zustände und Reaktionen (M18, DESIGN.md 8): Türme, Fähigkeiten und Wetter
// hinterlassen Zustände an den Schlurfern; zwei passende treffen sich zu einer
// Reaktion mit eigener Wirkung und einem Wort, das kurz über dem Kopf aufpoppt.
// Jede entdeckte Reaktion kommt ins Notizbuch.
//
// Zustände (Sekunden, ein neuer Treffer frischt auf):
//   nass      Sprenger (Grundstufen), Regen
//   frostig   Frostnebel (Sprenger A)
//   matschig  Schlammschleuder (Sprenger B)
//   geblendet Laternenblitz, im Schein von Laterne, Laternenturm, Leuchtfeuer
//   brennend  Feuerkürbis, Kürbiswurf, Pechkessel (der Brand selbst)
//   betäubt   Pfanne, Laternenblitz (die Betäubung selbst)

/**
 * Betäubung am Stück (M25c): Auch wenn sie immer wieder aufgefrischt wird (Dampf
 * ringsum, Glocke, Blitz, Pfanne), hält eine Betäubung höchstens `chain` s; danach
 * schüttelt sich der Schlurfer frei und ist `free` s lang nicht zu betäuben. Sonst
 * hielt Dampf eine dichte Horde die ganze Nacht fest (Balance-Durchlauf, Nacht 29:
 * 2400 Betäubungen in drei Sekunden, niemand kam voran, im Morgengrauen floh alles).
 * Keine einzelne Betäubung ist länger als `chain` (die längste: Dampf, 2,5 s).
 */
export const STUN = { chain: 3, free: 2 };

export const STATUS = {
  nass: { time: 4 },
  frostig: { time: 3 },
  matschig: { time: 4 },
  geblendet: { time: 2, light: 0.5 }, // im Schein: so lange nach dem Verlassen
};

/**
 * Reaktionen. needs: die beiden Zutaten.
 *   eisblock      eingefroren (freeze s), der nächste Treffer macht shatter-fachen Schaden
 *   dampf         Brand aus, er und alle im Umkreis (radius) stehen verwirrt (confuse s)
 *   glut          der Brand dauert burnTime-mal so lange und brennt burnDps-mal so heiß
 *   schwachstelle ein Bolzen trifft einen Geblendeten mit damage-fachem Schaden
 *   splitter      ein Streukürbis trifft einen Frostigen: die Splitter springen weiter
 *                 (radius) und treffen mit damage des Kürbisses
 *   klebekuerbis  ein Kürbis trifft einen Matschigen: eine klebrige Fläche (radius,
 *                 time s) bremst um slow
 */
export const REACTIONS = {
  eisblock: { needs: ['nass', 'frostig'], freeze: 2, shatter: 2 },
  dampf: { needs: ['nass', 'brennend'], radius: 1.6, confuse: 2.5 },
  glut: { needs: ['brennend', 'matschig'], burnTime: 2, burnDps: 1.5 },
  schwachstelle: { needs: ['geblendet', 'bolzen'], damage: 2 },
  splitter: { needs: ['frostig', 'streukuerbis'], radius: 1.2, damage: 0.5 },
  klebekuerbis: { needs: ['matschig', 'kuerbis'], radius: 1.4, slow: 0.5, time: 4 },
};
export const REACTION_ORDER = ['eisblock', 'dampf', 'glut', 'schwachstelle', 'splitter', 'klebekuerbis'];

/** Worte und Farben der Reaktionen über dem Kopf (Palette). */
export const REACTION_COLORS = {
  eisblock: 0xa8dcff,
  dampf: 0xebe4d6,
  glut: 0xf4a64c,
  schwachstelle: 0xfde08e,
  splitter: 0x93bce0,
  klebekuerbis: 0xbb8d54,
};

/** Tonhöhe des kleinen Klangs je Reaktion (Hz). */
export const REACTION_PITCH = {
  eisblock: 1320,
  dampf: 520,
  glut: 440,
  schwachstelle: 990,
  splitter: 1560,
  klebekuerbis: 330,
};

/**
 * Das Wetter wirkt (M18, OFFENE-FRAGEN 99): Regen macht alle nass und dämpft
 * jeden Brand (burn), Nebel kürzt die Reichweite aller Türme (range) – außer im
 * Schein einer Laterne –, Wind trägt Kürbisse weiter (catapult) und lässt
 * Splitter weiter springen (split).
 */
export const WEATHER_EFFECTS = {
  regen: { wet: true, burn: 0.6 },
  nebel: { range: 0.8 },
  wind: { catapult: 1.15, split: 1.4 },
};
