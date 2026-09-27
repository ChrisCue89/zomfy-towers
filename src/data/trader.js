// Balduin, der Händler (Meilenstein 8): Er kommt jeden Morgen und tauscht
// Zombieteile – die Beute der Nacht – gegen Rohstoffe. Was er mit den Teilen
// macht, sagt er nicht. Seit Meilenstein 9 kommt er nur über das Wasser: mit
// seinem Boot an den Steg (DESIGN.md 0 Nr. 7).
// Hier wird balanciert: Fahrplan, Liegeplatz, Angebote, Vorrat je Tag.

/** Fahrplan (Minuten seit 06:00) und Wege, alles in Metern. */
export const TRADER = {
  fromDay: 2, // erster Besuch am Morgen nach der ersten Nacht
  arrive: 40, // 06:40: Das Boot taucht im Osten auf (Mika ist dann gerade wach)
  leave: 6 * 60, // 12:00: Er legt wieder ab
  sail: 24, // so viele Spielminuten braucht das Boot vom Horizont bis zum Steg
  from: 44, // hier (x) taucht das Boot auf bzw. verschwindet wieder
  moor: { x: 18.25, z: 0.95 }, // Mitte des Boots am Steg (südlich längsseits)
  stand: { x: 16.75, z: -1.0 }, // hier steht Balduin auf dem Steg und handelt
  facing: -1.0, // Blick im Stehen: zum Ufer und etwas zur Kamera
  // M10: Die Einfahrt kommt aus dem Nordosten zwischen der Nord- und der Ostinsel
  // hindurch und legt längs am Steg an; die Ausfahrt dreht ab und fährt zwischen
  // Ost- und Südinsel nach Südosten davon. Stützpunkte [x, z], eine weiche Kurve.
  arriveRoute: [[48, -15], [34, -7.5], [26.5, -1.2], [21.6, 0.95], [18.25, 0.95]],
  leaveRoute: [[18.25, 0.95], [21, 1.5], [23.6, 3.4], [24.2, 9.2], [31, 15], [46, 20]],
  throwAt: 0.9, // so weit ist die Einfahrt, wenn die Leine über den Poller fliegt
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
  // Meilenstein 10: besondere Turmteile (ein Stück am Tag)
  fernrohr: { give: { teile: 12 }, part: 'fernrohr', stock: 1 },
  schmierfett: { give: { teile: 12 }, part: 'schmierfett', stock: 1 },
  gluecksmuenze: { give: { teile: 10 }, part: 'gluecksmuenze', stock: 1 },
};

/** Turmteile im Angebot: an geraden Tagen ab Tag 4 eines, reihum (M10). */
export const TRADER_PARTS = ['fernrohr', 'schmierfett', 'gluecksmuenze'];
export const PARTS_FROM_DAY = 4;

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
  const part = day >= PARTS_FROM_DAY && day % 2 === 0 ? [TRADER_PARTS[(day / 2) % TRADER_PARTS.length]] : [];
  return [...TRADER_BASE, ...TRADER_DAILY[k], ...part];
}
