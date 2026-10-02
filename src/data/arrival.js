// Die Ankunft (N5): Zeiten und Wege der Eröffnung. Mika rudert im Morgennebel von
// Osten über den See, legt nördlich am Steg an (Balduin liegt südlich, data/trader.js)
// und geht über den Steg zum Haus. Koordinaten in Metern (Karte: Steg x 13–21,5).

export const ARRIVAL = {
  card: 7.5, // Titelkarte im Dunkel (s): zwei Gedanken, einer nach dem anderen
  lake: 13, // das Boot gleitet heran (G7: drei Gedanken auf dem See)
  walk: 9, // höchstens so lange über den Steg zum Haus (sonst steht Mika gleich dort)
  stroll: 0.55, // G7: langsam über den Steg (Anteil am Gehtempo) – Mika schaut sich um
  talkAfter: 0, // G7: die Sprechtaste erscheint mit der letzten Zeile am Funk (gedrückt werden darf schon ab der zweiten)
  answer: 6, // G7: so lange wartet der Funkkasten auf die Sprechtaste (E), dann drückt Mika selbst
  bar: 0.12, // Höhe der schwarzen Balken oben und unten (Anteil am Bild)
  skipHold: 0.6, // so lange Esc halten, dann ist die Ankunft vorbei
  // Weg des Boots: aus dem Nebel im Nordosten bis an den Steg
  route: [
    [38, -12],
    [30, -8.5],
    [22.5, -4.3],
    [16.6, -2.7],
  ],
  moor: { x: 16.6, z: -2.7 }, // hier liegt das Ruderboot danach
  seatY: 0.28, // Höhe der Ruderbank
  stroke: 2.4, // Takt der Riemen (rad/s): gemächlich, keine Flucht
  // Über den Steg zum Haus
  walkPath: [
    [16.4, -1.0],
    [13.2, -1.0],
    [9.4, -2.2],
    [6.2, -3.0],
  ],
};

/** Zeilen der Titelkarte und der Balken, zu welchem Zeitpunkt (s) sie beginnen. */
export const ARRIVAL_LINES = {
  card: [0.6, 3.8],
  lake: [0.8, 5.0, 9.2],
  walk: [0.4, 3.6],
  funk: [1.0, 4.0, 7.0], // G7: Stille, dann knistert der Kasten an der Tür; je Zeile 3 s, mit der letzten die Sprechtaste
};

/**
 * Das erste Feuer (N10): Drei Herbste stand die Holzlände leer – bei der Ankunft sind
 * Feuerstelle und Kamin kalt. Die Streichhölzer stehen in einer Blechdose auf dem Kaminsims,
 * das Holz im Kamin hat Edda noch selbst aufgeschichtet; draußen braucht das Feuer zwei
 * Scheite (`campCost`, sonst Äste sammeln). Frisch angezündet wachsen die Flammen `grow`
 * Sekunden lang aus der Glut.
 */
export const FIRST_FIRE = {
  campCost: { holz: 2 },
  grow: 2.5,
};
