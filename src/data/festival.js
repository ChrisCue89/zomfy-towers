// A6: Das Kürbisfest mit Laternenumzug (OFFENE-FRAGEN 235, DESIGN 9: »Kürbisfest im Herbst,
// Laternenumzug«). Am ersten trockenen Tag ab dem 18. Oktober liegt für jeden in der Bucht ein
// Kürbis bereit; die Leute schnitzen ihre über den Tag, Mika schnitzt ihren mit Augen, Nase und
// Mund aus je ein paar Formen. Abends sammeln sich alle mit Lampions am Feuer und ziehen singend
// bis ans Ende des Stegs und zurück – die Uhr steht dabei. Am Sturmhuk blinkt Edda zurück. Danach
// leuchtet die Kürbisreihe bis zum Frost. Ablauf in core/festival.js, Modelle in world/festModels.js,
// das Schnitzen in ui/carveView.js. Hier wird eingestellt.

import { hash3 } from '../core/rng.js';

/**
 * Zeiten (Stunden) und Wege. `from`/`until`: frühestens und spätestens dieser Tag (der erste ohne
 * Regen). Geschnitzt wird von `carveFrom` bis `carveUntil` (jede Person `carveTime` Sekunden an der
 * Bank); ab `gather` sammeln sich alle im Kreis ums Feuer (Halbmesser `ring`, Abstand `spacing`), der
 * Umzug beginnt, sobald Mika näher als `startNear` Meter dazukommt – bis `lastStart`. Der Zug geht
 * mit `speed` m/s einmal ein Stück ums Feuer, verlässt den Kreis bei `exit` (Richtung, 0 Norden,
 * π/2 Osten) und geht bis `dockEnd` (x auf dem Steg, Mitte `dockZ`), rückt dort auf `close` Meter
 * zusammen, hält `pause` Sekunden und geht zurück. Danach ist es `minutes` später. Mika gilt als
 * dabei, wenn sie am Stegende näher als `with` Meter am Zug ist. Die Kürbisse bleiben bis `keepUntil`
 * stehen und machen es gemütlicher (`cozy`).
 */
export const FESTIVAL = {
  from: 18,
  until: 28,
  carveFrom: 8,
  carveUntil: 16.5,
  carveTime: 12,
  gather: 18,
  lastStart: 19.5,
  startNear: 7,
  ring: [3.0, 3.4, 2.8, 3.8],
  speed: 1.05,
  spacing: 1.15,
  exit: (100 * Math.PI) / 180,
  lead: 0.45, // so weit (Bogenmaß) vor dem Ausgang steht die Spitze
  dockEnd: 20.25,
  dockZ: -1.0,
  close: 0.62,
  pause: 7,
  cheer: 4.5,
  minutes: 40,
  with: 9,
  mikaCarve: 20, // Minuten fürs eigene Gesicht
  keepUntil: 32,
  cozy: 1,
  people: 13, // so viele Kürbisse neben Mikas (und so viele im Zug, dazu Knopf)
};

/** Formen fürs Gesicht: Augen (3 × 5, das rechte gespiegelt), Nase (2 × 3), Mund (5 × 15). */
export const EYES = {
  dreieck: ['..#..', '.###.', '#####'],
  rund: ['.###.', '#####', '.###.'],
  froh: ['.###.', '#...#', '.....'],
  boese: ['#....', '###..', '.####'],
  stern: ['..#..', '#####', '.#.#.'],
};
export const NOSES = {
  dreieck: ['.#.', '###'],
  punkt: ['...', '.#.'],
  herz: ['#.#', '.#.'],
  keine: ['...', '...'],
};
export const MOUTHS = {
  grinsen: ['#.............#', '##...........##', '.###.##.##.###.', '..###########..', '....#######....'],
  laecheln: ['...............', '#.............#', '.##.........##.', '..###########..', '....#######....'],
  oh: ['......###......', '.....#####.....', '.....#####.....', '......###......', '...............'],
  zaehne: ['...............', '###.........###', '.#############.', '..###.###.###..', '...............'],
};
export const EYE_ORDER = Object.keys(EYES);
export const NOSE_ORDER = Object.keys(NOSES);
export const MOUTH_ORDER = Object.keys(MOUTHS);

/** Die Gesichter der Leute (Augen, Nase, Mund) – wer keins hat, bekommt eins aus seinem Namen. */
export const PERSON_FACES = {
  hilde: ['froh', 'herz', 'laecheln'],
  bert: ['boese', 'dreieck', 'zaehne'],
  juna: ['stern', 'punkt', 'grinsen'],
  yusuf: ['rund', 'dreieck', 'oh'],
  marthe: ['dreieck', 'dreieck', 'laecheln'],
  pim: ['boese', 'punkt', 'grinsen'],
  lu: ['rund', 'herz', 'laecheln'],
};

/** A6: Lampions in fünf Farben (Orange, Rot, Gelb, Rosa, Türkis) – welche trägt `id` (fest je Person)? */
export const LAMPIONS = 5;
export function lampionOf(id) {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % LAMPIONS;
}

/** Gesicht einer Person als Namen der Formen. */
export function faceOfPerson(id) {
  if (PERSON_FACES[id]) return PERSON_FACES[id];
  const h = (k) => hash3(id.length, k, id.charCodeAt(0) + id.charCodeAt(id.length - 1), 77);
  return [EYE_ORDER[Math.floor(h(1) * EYE_ORDER.length)], NOSE_ORDER[Math.floor(h(2) * NOSE_ORDER.length)], MOUTH_ORDER[Math.floor(h(3) * MOUTH_ORDER.length)]];
}

/** Mikas Wahl (Zahlen) als Namen der Formen. */
export function faceOfChoice(c) {
  const [e, n, m] = c || [0, 0, 0];
  return [EYE_ORDER[e] || EYE_ORDER[0], NOSE_ORDER[n] || NOSE_ORDER[0], MOUTH_ORDER[m] || MOUTH_ORDER[0]];
}

/**
 * Das Gesicht als Raster (10 Zeilen × 15 Spalten, '#' wird geschnitzt): oben die Augen (das rechte
 * gespiegelt), dann die Nase in der Mitte, unten der Mund.
 */
export function faceGrid([eyes, nose, mouth]) {
  const rows = Array.from({ length: 10 }, () => Array(15).fill('.'));
  const put = (pattern, r0, c0, mirror = false) => {
    pattern.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[mirror ? row.length - 1 - c : c] === '#') rows[r0 + r][c0 + c] = '#';
    });
  };
  put(EYES[eyes] || EYES.dreieck, 0, 1);
  put(EYES[eyes] || EYES.dreieck, 0, 9, true);
  put(NOSES[nose] || NOSES.dreieck, 3, 6);
  put(MOUTHS[mouth] || MOUTHS.grinsen, 5, 0);
  return rows.map((r) => r.join(''));
}

/** Zu welcher Stunde jemand seinen Kürbis schnitzt (fest je Person und Tag). */
export function carveHour(id, day) {
  return FESTIVAL.carveFrom + 0.5 + hash3(id.charCodeAt(0), id.length, day, 31) * (FESTIVAL.carveUntil - FESTIVAL.carveFrom - 1);
}

/** A6: Ist heute Abend das Fest (dann keine Karten, kein Angeln, kein Kessel – ein Abend, eine Aktivität)? */
export function festivalTonight(state) {
  const f = state.festival;
  return Boolean(f && f.day && f.day === state.time?.day && !f.done);
}

/** Ein neuer Zustand (state.festival). */
export function newFestival() {
  // day: an diesem Tag ist (oder war) das Fest (0: noch keins); carved: wer schon geschnitzt hat;
  // face: Mikas Gesicht (Zahlen) oder null; walked: Mika ging mit; done: der Umzug ist vorbei
  // (oder fiel aus); people: wer einen Kürbis hat (in der Reihenfolge der Bank); spot: Mitte der
  // Kürbisbank (oder null, solange sie nicht steht)
  return { day: 0, carved: [], face: null, walked: false, done: false, people: [], spot: null };
}

/** Gelesenen Zustand absichern. */
export function sanitizeFestival(raw) {
  const base = newFestival();
  if (!raw || typeof raw !== 'object') return base;
  const int = (v, min, max, d = min) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : d);
  const ids = (a) => (Array.isArray(a) ? [...new Set(a.filter((id) => typeof id === 'string' && /^[a-z]{2,12}$/.test(id)))].slice(0, 24) : []);
  base.day = int(raw.day, 0, 1e6);
  base.carved = ids(raw.carved);
  base.people = ids(raw.people);
  if (Array.isArray(raw.face) && raw.face.length === 3) base.face = [int(raw.face[0], 0, EYE_ORDER.length - 1), int(raw.face[1], 0, NOSE_ORDER.length - 1), int(raw.face[2], 0, MOUTH_ORDER.length - 1)];
  base.walked = Boolean(raw.walked);
  base.done = Boolean(raw.done);
  const sp = raw.spot;
  if (sp && typeof sp === 'object' && Number.isFinite(sp.x) && Number.isFinite(sp.z) && Math.abs(sp.x) < 200 && Math.abs(sp.z) < 200) base.spot = { x: sp.x, z: sp.z };
  return base;
}

/**
 * Der Festtag: der erste Tag ab `first` (frühestens `FESTIVAL.from`), an dem es nicht regnet
 * (`forecast(tag)` gibt das Wetter eines Tages) – spätestens `FESTIVAL.until`, danach keiner mehr (0).
 * Ist ein Fest schon festgelegt, bleibt es.
 */
export function festivalDay(state, forecast, first = FESTIVAL.from) {
  const f = state.festival;
  if (f?.day) return f.day;
  const from = Math.max(FESTIVAL.from, first);
  if (from > FESTIVAL.until) return 0;
  for (let d = from; d <= FESTIVAL.until; d++) if (forecast(d) !== 'regen') return d;
  return FESTIVAL.until;
}

/** Gemütlichkeit der Kürbisreihe: nach dem Fest bis `keepUntil` (core/furnishing.js). */
export function festivalCozy(state) {
  const f = state.festival;
  const day = state.time?.day ?? 0;
  return f?.day && f.done && day >= f.day && day <= FESTIVAL.keepUntil ? FESTIVAL.cozy : 0;
}
