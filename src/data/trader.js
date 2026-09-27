// Balduin, der Händler (Meilenstein 8): Er zieht jeden Morgen seinen
// Bollerwagen die Straße entlang und tauscht Zombieteile – die Beute der
// Nacht – gegen Rohstoffe. Was er mit den Teilen macht, sagt er nicht.
// Hier wird balanciert: Fahrplan, Standplatz, Angebote, Vorrat je Tag.

/** Fahrplan (Minuten seit 06:00) und Wege, alles in Metern. */
export const TRADER = {
  fromDay: 2, // erster Besuch am Morgen nach der ersten Nacht
  arrive: 40, // 06:40: Er biegt von Osten auf die Straße (Mika ist dann gerade wach)
  leave: 6 * 60, // 12:00: Er packt ein und zieht weiter
  walk: 16, // so viele Spielminuten braucht er vom Waldrand bis zum Stand
  lane: 10.8, // auf dieser Linie (z) läuft er die Straße entlang (südlich am Schrotthaufen vorbei)
  edge: 13.6, // hier (x) taucht er am Ostrand auf bzw. verschwindet wieder
  standX: 4.2, // hier (x) hält er an; der Wagen steht östlich davon
  front: { x: 4.85, z: 11.45 }, // vor dem Wagen, etwas seitlich (die Gläser bleiben zu sehen), Blick zur Kamera
  pull: 1.6, // Abstand Balduin – Wagenmitte beim Ziehen (Deichsel)
};

/**
 * Angebote: Was gibt Mika, was bekommt sie? `stock` = höchstens so oft am Tag.
 * Schrott gibt es immer; dazu wechseln jeden Tag zwei Sonderangebote.
 * Nacht 1 bringt rund 30–35 Zombieteile (M8.1): das sind gut 20 Schrott –
 * so viel wie vorher direkt aus der Nacht, nur dass man jetzt handeln muss.
 */
export const TRADER_OFFERS = {
  schrott: { give: { teile: 3 }, get: { schrott: 2 } },
  holz: { give: { teile: 2 }, get: { holz: 5 } },
  stein: { give: { teile: 2 }, get: { stein: 3 } },
  fasern: { give: { teile: 2 }, get: { fasern: 4 } },
  stoff: { give: { teile: 3 }, get: { stoff: 2 } },
  zahnrad: { give: { teile: 7 }, get: { zahnraeder: 1 }, stock: 2 },
  moderkern: { give: { teile: 18 }, get: { moderkerne: 1 }, stock: 1 },
};

/** Immer im Angebot. */
export const TRADER_BASE = ['schrott'];

/** Sonderangebote je Tag, reihum ab dem ersten Besuch. */
export const TRADER_DAILY = [
  ['holz', 'stoff'],
  ['stein', 'zahnrad'],
  ['fasern', 'stoff'],
  ['holz', 'zahnrad'],
  ['stein', 'moderkern'],
  ['fasern', 'zahnrad'],
];

/** Angebote des Tages (Schlüssel aus TRADER_OFFERS). */
export function offersOfDay(day) {
  const k = Math.max(0, day - TRADER.fromDay) % TRADER_DAILY.length;
  return [...TRADER_BASE, ...TRADER_DAILY[k]];
}
