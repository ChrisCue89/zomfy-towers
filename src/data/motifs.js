// Motive (M32, DESIGN 8): Jede Figur hat ein kurzes Motiv, das die Spieluhr spielt – beim
// Brief im Briefkasten, bei der Rückkehr und am Erinnerungsbrett (M31). Fünf bis sieben Töne,
// in e-Moll/G-Dur, damit sie über denselben Akkorden der Spieluhr klingen. `beat` ist die
// Länge eines Tons (s), `null` eine Pause.

export const MOTIFS = {
  hilde: { notes: ['G5', 'B5', 'D6', 'B5', 'A5', 'G5'], beat: 0.4 }, // wiegend, ein Posthorn im Kopf
  juna: { notes: ['E6', 'D6', 'E6', 'G6', 'D6', 'B5'], beat: 0.3 }, // flink, ein Funkspruch
  bert: { notes: ['G5', 'G5', 'A5', 'B5', null, 'G5'], beat: 0.38 }, // stur, gutmütig
  yusuf: { notes: ['B5', 'A5', 'G5', 'E5', 'G5'], beat: 0.46 }, // ruhig, tröstend
  knopf: { notes: ['D6', 'D6', 'E6', 'D6'], beat: 0.24 }, // ein Bellen in Tönen
  hannes: { notes: ['E5', 'G5', 'A5', 'B5', 'A5', 'G5'], beat: 0.42 },
  clara: { notes: ['B5', 'D6', 'B5', 'A5', 'B5', 'G5'], beat: 0.3 },
  lotte: { notes: ['G5', 'D6', 'B5', 'E6', 'D6'], beat: 0.44 },
  greta: { notes: ['E5', 'E5', 'B5', 'A5'], beat: 0.36 },
  fiete: { notes: ['D5', 'G5', 'A5', 'G5', 'E5', 'D5'], beat: 0.4 },
  ida: { notes: ['G5', 'A5', 'B5', 'D6', 'E6'], beat: 0.42 },
  rosa: { notes: ['B5', 'B5', 'A5', 'G5', 'A5', 'B5'], beat: 0.32 },
  anton: { notes: ['D6', 'B5', 'G5', 'B5', 'D6', 'G6'], beat: 0.28 },
  emil: { notes: ['E5', 'G5', 'B5', 'A5', 'G5'], beat: 0.48 },
  frieda: { notes: ['G5', 'G5', 'G5', 'D6', 'B5'], beat: 0.26 },
  mara: { notes: ['A5', 'E6', 'D6', 'B5', 'A5'], beat: 0.4 },
  paula: { notes: ['B5', 'G5', 'A5', 'E5', 'G5'], beat: 0.36 },
  edda: { notes: ['E5', 'G5', 'B5', 'E6', 'D6', 'B5', 'G5'], beat: 0.44 }, // das Haus, der See
};

/** Motiv einer Figur (unbekannte: ein schlichtes). */
export function motifOf(id) {
  return MOTIFS[id] || { notes: ['G5', 'B5', 'A5', 'G5'], beat: 0.4 };
}
