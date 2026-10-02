// Einrichten (Meilenstein 6, DESIGN.md 6.8) – seit N4 aus Balduins Katalog: Über das
// Funkgerät in der Stube bestellt Mika Möbel und Kleinigkeiten, Balduin bringt sie am
// nächsten Morgen mit dem Boot und trägt sie hinein. Jedes Stück gibt es einmal, es
// hat einen festen Platz in seinem Raum (Modelle in world/furnitureModels.js), kostet
// Zombieteile – Balduins Währung – und bringt Gemütlichkeit. Der Katalog zeigt es groß.

import { houseCozy, HOUSE_MAX } from './buildings.js';

/** Seiten des Katalogs – ein Raum je Seite, bestellbar ab seiner Ausbaustufe (interior.js ROOMS). */
export const CATALOG_ROOMS = ['wohnraum', 'kueche', 'schlafzimmer', 'werkstatt', 'lager'];
export const ROOM_LEVEL = { wohnraum: 1, kueche: 2, schlafzimmer: 3, werkstatt: 4, lager: 5 };

/**
 * Die Stücke: `room` (Seite im Katalog), `cost` (Zombieteile), `cozy` (Gemütlichkeit),
 * `needs` (wer im Lager wohnen muss). Reihenfolge = Reihenfolge im Katalog.
 */
export const FURNITURE = {
  // Stube
  bild: { room: 'wohnraum', cost: { teile: 6 }, cozy: 1 },
  teekanne: { room: 'wohnraum', cost: { teile: 6 }, cozy: 1 },
  flickenteppich: { room: 'wohnraum', cost: { teile: 8 }, cozy: 1 },
  wimpel: { room: 'wohnraum', cost: { teile: 8 }, cozy: 1 },
  blumenampel: { room: 'wohnraum', cost: { teile: 8 }, cozy: 1 },
  koerbchen: { room: 'wohnraum', cost: { teile: 8 }, cozy: 1, needs: 'knopf' },
  lichterkette: { room: 'wohnraum', cost: { teile: 12 }, cozy: 2 },
  stehlampe: { room: 'wohnraum', cost: { teile: 14 }, cozy: 2 },
  buecherregal: { room: 'wohnraum', cost: { teile: 16 }, cozy: 2 },
  lesesessel: { room: 'wohnraum', cost: { teile: 18 }, cozy: 2 },
  standuhr: { room: 'wohnraum', cost: { teile: 20 }, cozy: 2 },
  sofa: { room: 'wohnraum', cost: { teile: 22 }, cozy: 2 },
  grammophon: { room: 'wohnraum', cost: { teile: 24 }, cozy: 2 },
  // Küche (Stufe 2)
  zwiebelzopf: { room: 'kueche', cost: { teile: 6 }, cozy: 1 },
  kuchen: { room: 'kueche', cost: { teile: 6 }, cozy: 1 },
  kraeuter: { room: 'kueche', cost: { teile: 8 }, cozy: 1 },
  kupfertoepfe: { room: 'kueche', cost: { teile: 12 }, cozy: 1 },
  // Schlafzimmer (Stufe 3)
  hausschuhe: { room: 'schlafzimmer', cost: { teile: 4 }, cozy: 1 },
  standspiegel: { room: 'schlafzimmer', cost: { teile: 12 }, cozy: 1 },
  quilt: { room: 'schlafzimmer', cost: { teile: 14 }, cozy: 2 },
  // Werkstatt (Stufe 4)
  hocker: { room: 'werkstatt', cost: { teile: 6 }, cozy: 1 },
  werkzeugkiste: { room: 'werkstatt', cost: { teile: 10 }, cozy: 1 },
  // Lager (Stufe 5)
  apfelkisten: { room: 'lager', cost: { teile: 8 }, cozy: 1 },
  haengematte: { room: 'lager', cost: { teile: 16 }, cozy: 2 },
};

export const FURNITURE_ORDER = Object.keys(FURNITURE);

/**
 * Morgen-Bonus je nach Gemütlichkeit: so viel Erfahrung wie Punkte, ab
 * `rested` Punkten ausgeschlafen – schneller unterwegs bis Mittag.
 */
export const COZY = { rested: 5, restedSpeed: 1.1, restedUntilHour: 12 };

/** Gemütlichkeit aus der Liste gekaufter Stücke. */
export function coziness(owned) {
  return (owned || []).reduce((sum, id) => sum + (FURNITURE[id]?.cozy || 0), 0);
}

/** Höchste erreichbare Gemütlichkeit (für die Anzeige »7/12«): Möbel plus Schlafzimmer (M11). */
export const MAX_COZY = Object.values(FURNITURE).reduce((sum, f) => sum + f.cozy, 0) + houseCozy(HOUSE_MAX);

/** Bestellungen (N4): höchstens so viele Stücke auf einmal unterwegs. */
export const ORDER_MAX = 4;
