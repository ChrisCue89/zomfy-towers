// Die Ankunft (N5): Zeiten und Wege der Eröffnung. Mika rudert im Morgennebel von
// Osten über den See, legt nördlich am Steg an (Balduin liegt südlich, data/trader.js)
// und geht über den Steg zum Haus. Koordinaten in Metern (Karte: Steg x 13–21,5).

export const ARRIVAL = {
  card: 7.5, // Titelkarte im Dunkel (s): zwei Gedanken, einer nach dem anderen
  lake: 11, // das Boot gleitet heran
  walk: 9, // höchstens so lange über den Steg zum Haus (sonst steht Mika gleich dort)
  crackle: 2.6, // es knistert, Mika hebt das Funkgerät auf
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
  lake: [0.8, 5.8],
  walk: [0.5],
};
