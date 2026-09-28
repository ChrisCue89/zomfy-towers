// Schwierigkeit (M16, OFFENE-FRAGEN 118): beim Spielstart wählbar und jederzeit
// im Menü änderbar – für Erkunderinnen zu hart, für Kämpfer zu leicht (m12-r1)
// trifft niemanden. Faktoren auf die Horde der Nacht und die Beute.
//
//   budget   Punkte der Nacht (wie viele Schlurfer)   hp     Leben je Schlurfer
//   speed    Tempo der Horde                          loot   Zombieteile je Abschuss

export const DIFFICULTIES = {
  gemuetlich: { budget: 0.65, hp: 0.8, speed: 0.92, loot: 1.25 },
  ausgewogen: { budget: 1, hp: 1, speed: 1, loot: 1 },
  wild: { budget: 1.35, hp: 1.2, speed: 1.08, loot: 0.9 },
};

export const DIFFICULTY_ORDER = ['gemuetlich', 'ausgewogen', 'wild'];
export const DEFAULT_DIFFICULTY = 'ausgewogen';

/** Faktoren einer Stufe (unbekannte Werte zählen wie »ausgewogen«). */
export function difficultyOf(id) {
  return DIFFICULTIES[id] || DIFFICULTIES[DEFAULT_DIFFICULTY];
}
