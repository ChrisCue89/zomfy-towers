// Ein Herbst mit Ende (M25, DESIGN 8, OFFENE-FRAGEN 117): Ein Herbst hat 30
// Tage. In der Nacht des ersten Frosts wächst das Moderherz aus dem Wald – ein
// Finale über alle Wege in drei Phasen. Hält die Bucht bis zum Morgen (oder
// fällt das Herz vorher), kommt der Frost: Schnee fällt, der Moder schläft, die
// Bucht feiert, der Abspann läuft. Danach: weiterspielen – die Nächte würfeln
// sich neu – oder eine neue Runde an einer neuen Bucht. Hier wird abgestimmt.

/** Länge des Herbsts (die letzte Nacht ist die Frostnacht) und wie lange der erste Schnee liegt. */
export const AUTUMN = { days: 30, snowDays: 3, countdownFrom: 25 };

/**
 * Frostnacht: jede Welle über alle Wege, das Budget etwas höher; das Herz
 * führt die letzte Welle an (`heartHp` mal so viel Leben wie ein Boss dieser
 * Nacht). Phasen nach seinem Leben: unter `phases[0]` ruft es die Horde über
 * alle Wege (je Weg ein Pulk mit `pulk` Schwärmern), unter `phases[1]` kommt
 * der Frost – das Herz wird langsamer (`frostSlow`), ruft noch einmal, und
 * seine Sporen kommen öfter.
 */
export const FINALE = { budget: 1.15, heartHp: 1, phases: [0.66, 0.33], pulk: 5, frostSlow: 0.75 };

/**
 * Nach dem Herbst (»weiterspielen«): Jede Nacht würfelt sich neu – Wege je
 * Welle, ein oder zwei Merkmale, ein Teil der Horde aus allen bekannten Arten,
 * jede fünfte Nacht ein zufälliger Boss. Wachstum langsamer als im Herbst
 * (`growth` Nächte je Nacht), damit es lange trägt.
 */
export const ROGUE = { growth: 0.5, traits: [1, 2], swap: 0.35, kinds: ['schlurfer', 'flitzer', 'schwaermer', 'brummer', 'leuchtpilz', 'schildtraeger', 'moderfalter', 'graeber', 'lichtfresser', 'brueter'] };

/** Ist Nacht n die Frostnacht? (Solange der Frost nicht kam, bleibt es die Frostnacht.) */
export function isFinaleNight(n, autumn) {
  return n >= AUTUMN.days && !(autumn && autumn.frost);
}

/** Würfelt die Nacht neu? (Nach dem Herbst, wenn man weiterspielt.) */
export function isRogueNight(n, autumn) {
  return Boolean(autumn && autumn.frost && autumn.mode === 'weiter' && n > autumn.frost);
}

/** Liegt an diesem Tag noch der erste Schnee? */
export function isSnowDay(day, autumn) {
  return Boolean(autumn && autumn.frost && day > autumn.frost && day <= autumn.frost + AUTUMN.snowDays);
}
