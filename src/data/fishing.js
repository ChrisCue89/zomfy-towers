// Angeln am Steg (M33, DESIGN 8, OFFENE-FRAGEN 171, 192): die zweite Abendaktivität.
// Mika sitzt an der Nordkante des Stegs, die Beine über dem Wasser, wirft aus (E halten
// und loslassen), wartet auf den Biss (nur der echte zählt), schlägt an und drillt den
// Fisch: Mit gehaltenem E wandert der Kescher-Bereich nach rechts, losgelassen nach links –
// solange der Fisch darin schwimmt, füllt sich der Fang. Hier wird balanciert.

import { eveningTaken } from './cooking.js';

/**
 * Wo geangelt wird: an der Nordkante des Stegs, Blick übers Wasser nach Norden – östlich von
 * Mikas Ruderboot (N5, bei x 16,6), westlich von Edda am Stegende (M32).
 */
export const SPOT = {
  mika: { x: 19.0, z: -1.625, facing: Math.PI, seatY: 0 }, // die Hüfte auf der Stegkante
  friend: { x: 18.125, z: -1.625, facing: Math.PI, seatY: 0 }, // wer mitkommt, sitzt links daneben (rechts am Mast steht Juna)
  prompt: { x: 19.0, z: -1.0, radius: 1.1 }, // die Einblendung auf dem Steg
  look: { x: 18.6, z: -3.1 }, // die Kamera schaut übers Wasser, beide unten im Bild
};

/** Der Abend: von 18 bis 20 Uhr (Minuten ab 06:00, wie der Kartenabend), so viele Würfe. */
export const FISHING = {
  from: 12 * 60, // 18:00
  until: 14 * 60, // 20:00
  casts: 5, // Würfe je Abend
  minutes: 50, // so viel Zeit ist danach vergangen
  castTime: 1.1, // s, bis die Kraft einmal hin und zurück ist
  near: 1.8, // m vor der Stegkante bei schwachem Wurf …
  far: 5.6, // … und bei vollem
  wait: [3.2, 8.5], // s bis zum Biss
  nibbles: [0, 3], // Anstupser vorher (Anschlagen zu früh verscheucht den Fisch)
  lost: 1.4, // s Pause, wenn einer entwischt ist
  drill: {
    zone: 0.26, // Breite des Keschers (Anteil der Leiste)
    push: 2.6, // Beschleunigung nach rechts mit gehaltenem E (Leisten je s²)
    fall: 2.1, // … nach links ohne
    bounce: 0.35, // Rückprall am Rand
    fill: 0.34, // Fang je s, solange der Fisch im Kescher ist
    drain: 0.24, // … sonst weniger
    start: 0.3,
  },
  sell: { perDay: 6 }, // so viele Fische nimmt Balduin am Tag
};

/** Balduins zweite Angel (falls Fiete nicht kommt): ab diesem Tag, für so viel. Fisch bringt je Stück so viel. */
export const ROD_OFFER = { day: 6, cost: { teile: 6 } };
export const FISH_PRICE = { teile: 2 };

/**
 * Die Fische: Größe (cm), Gewicht der Wahl, wie wild (0–1), wie lange der Biss hält (s),
 * ab welcher Wurfweite (0–1) sie beißen, Bedingungen (Abend ab 19 Uhr, Wetter) und was
 * Balduin in Zombieteilen gibt. Farben fürs Bild (Rücken, Seite, Bauch, Flossen).
 */
export const FISH = {
  ploetze: { size: [12, 24], weight: 30, wild: 0.18, window: 0.95, far: 0, value: 1, colors: ['s5', 's7', 's8', 'r3'] },
  barsch: { size: [15, 38], weight: 26, wild: 0.34, window: 0.8, far: 0, value: 1, colors: ['t2', 'g6', 'e8', 'f4'], stripes: true },
  brasse: { size: [25, 52], weight: 15, wild: 0.4, window: 0.75, far: 0.3, value: 2, colors: ['e4', 'e7', 'e8', 'e5'] },
  aal: { size: [45, 85], weight: 9, wild: 0.62, window: 0.6, far: 0, evening: true, value: 3, colors: ['n2', 'e3', 'e6', 'n3'], long: true },
  zander: { size: [35, 72], weight: 6, wild: 0.66, window: 0.55, far: 0.45, weather: ['nebel', 'regen', 'sturm'], value: 3, colors: ['s3', 's5', 's8', 's4'] },
  hecht: { size: [48, 98], weight: 5, wild: 0.78, window: 0.5, far: 0.6, value: 4, colors: ['t1', 'g4', 'g8', 'g3'], spots: true, long: true },
  stiefel: { junk: true, weight: 4, wild: 0.06, window: 1.1, far: 0, value: 0 },
  flasche: { bottle: true, weight: 4, wild: 0.1, window: 1.1, far: 0.4, value: 0 },
};
export const FISH_ORDER = ['ploetze', 'barsch', 'brasse', 'aal', 'zander', 'hecht', 'stiefel', 'flasche'];

/** Flaschenpost: so viele Zettel treiben im See (Texte in T.angeln.flaschen). */
export const BOTTLES = 5;

/**
 * Wer mitkommt, hilft ein wenig: Fiete (Hafen) macht den Kescher breiter, Greta (Nordinsel)
 * lässt sie schneller beißen, Hilde bringt Tee (ein Wurf mehr). Die anderen plaudern.
 */
export const FRIEND_PERKS = {
  fiete: { zone: 0.07 },
  greta: { wait: 0.7 },
  hilde: { casts: 1 },
};

/** Leerer Eintrag (state.fishing): Angel, Abende, letzter Abend, Fänge je Art, Flaschen, Korb. */
export function newFishing() {
  return { rod: false, taught: false, evenings: 0, lastDay: 0, caught: {}, bottles: 0, basket: 0, sold: { day: 0, n: 0 } };
}

/** Prüfen und reparieren (sanitizeState). */
export function sanitizeFishing(raw) {
  const out = newFishing();
  if (!raw || typeof raw !== 'object') return out;
  const int = (v, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : lo);
  out.rod = raw.rod === true;
  out.taught = raw.taught === true;
  out.evenings = int(raw.evenings, 0, 1e6);
  out.lastDay = int(raw.lastDay, 0, 1e6);
  out.bottles = int(raw.bottles, 0, BOTTLES);
  out.basket = int(raw.basket, 0, 999);
  if (raw.sold && typeof raw.sold === 'object') out.sold = { day: int(raw.sold.day, 0, 1e6), n: int(raw.sold.n, 0, 999) };
  for (const id of FISH_ORDER) {
    const c = raw.caught?.[id];
    if (c && typeof c === 'object') out.caught[id] = { n: int(c.n, 0, 1e6), best: int(c.best, 0, 999) };
  }
  return out;
}

/** Bietet `id` heute Abend das Angeln an? (Angel da, eingezogen, abends, noch keine Aktivität) */
export function fishingOffered(state, id) {
  const f = state.fishing;
  if (!f?.rod || state.survivors?.[id]?.stage !== 3) return false;
  if (eveningTaken(state)) return false; // A5: auch nach dem Kessel nicht, A6: nicht am Kürbisfest
  const m = state.time?.minute ?? 0;
  return m >= FISHING.from && m <= FISHING.until;
}
