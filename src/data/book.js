// Herbstbuch (M25, Teil 2, DESIGN 8): Sterne je Nacht, Taten mit Herbstschmuck
// als Belohnung, die Schlurferkunde mit Dr. Yusufs Notizen und das Turmalbum.
// Hier wird abgestimmt; die Texte stehen in T.buch.

import { HOUSE_MAX } from './buildings.js';

/**
 * Sterne je gehaltener Nacht: gehalten (jede gewonnene Nacht), makellos
 * (niemand im Lager, das Zuhause heil – wie die makellose Nacht aus M24) und
 * mutig (mindestens eine Welle früh gerufen). Eine verlorene Nacht hat keine.
 */
export const STAR_KEYS = ['gehalten', 'makellos', 'mutig'];

/**
 * Taten in der Reihenfolge des Buchs. `need` ist das Ziel, `of` sagt, was
 * gezählt wird (core/book.js → `progress`). Jede dritte gelungene Tat bringt
 * ein Stück Herbstschmuck (DECO_ORDER).
 */
export const DEEDS = [
  { id: 'ersteNacht', of: 'nights', need: 1 },
  { id: 'dreiSterne', of: 'bestStars', need: 3 },
  { id: 'mutig', of: 'called', need: 10 },
  { id: 'gaeste', of: 'residents', need: 3 },
  { id: 'reaktionen', of: 'notes', need: 3 },
  { id: 'misch', of: 'recipes', need: 2 },
  { id: 'turmRang', of: 'rank', need: 3 },
  { id: 'kunde', of: 'kinds', need: 12 },
  { id: 'bosse', of: 'bosses', need: 4 },
  { id: 'zuhause', of: 'house', need: HOUSE_MAX },
  { id: 'sterne', of: 'stars', need: 50 },
  { id: 'frost', of: 'frost', need: 1 },
  { id: 'drachen', of: 'kite', need: 3 }, // N9: drei Loopings hintereinander mit Pims Drachen
];

/** Herbstschmuck als Belohnung: nach 3, 6, 9 und 12 Taten ein Stück mehr (Bauten mit `deco`). */
export const DECO_ORDER = ['kuerbis', 'laubhaufen', 'regentonne', 'kuerbislaterne'];
export const DEEDS_PER_DECO = 3;

/** Die vier Bosse der Nächte (Tat »bosse«). */
export const BOOK_BOSSES = ['holzfaeller', 'pilzmutter', 'laternenhexe', 'moosriese'];

/** Schlurferkunde: Reihenfolge der Arten (so, wie sie im Herbst auftauchen). */
export const KIND_ORDER = [
  'schlurfer', 'flitzer', 'schwaermer', 'brummer', 'leuchtpilz', 'anfuehrer', 'moderfalter', 'graeber',
  'schildtraeger', 'lichtfresser', 'brueter', 'holzfaeller', 'pilzmutter', 'laternenhexe', 'moosriese', 'moderherz',
];

/** Turmalbum: so viele Türme zeigt es (die mit den meisten Abschüssen). */
export const ALBUM_SIZE = 8;
