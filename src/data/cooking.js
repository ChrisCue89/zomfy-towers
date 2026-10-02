// A5: Gemeinsam kochen (DESIGN 8, OFFENE-FRAGEN 171, 234) – die dritte Abendaktivität neben Karten
// und Angeln. Abends lädt Mika jemanden ein; sie sitzen am Lagerfeuer (bei Regen, Sturm und Schnee
// in der Stube am Kamin), über der Glut hängt der Kessel. Mika wählt ein Gericht aus dem Vorrat,
// schnippelt im Takt, würzt nach dem Geschmack des Gegenübers und nimmt den Kessel zur rechten Zeit
// vom Feuer. Das Essen wirkt bis zum nächsten Morgen. Ablauf in core/cooking.js, Bild in
// ui/cookingView.js, Kessel und Gerichte in world/cookModels.js. Hier wird balanciert.

import { festivalTonight } from './festival.js';

/**
 * Der Abend (Minuten ab 06:00 wie Karten und Angeln) und das kleine Spiel: `cuts` Schnitte, das
 * Messer braucht `knife` Sekunden einmal übers Brett und zurück, die Schnittmarke ist `zone` breit
 * (Anteil des Bretts); der Kessel braucht `simmer` Sekunden vom ersten Blubbern bis »angebrannt«,
 * golden ist er im Fenster `window` (Anteil daran). Danach ist es `minutes` später.
 */
export const COOKING = {
  from: 12 * 60, // 18:00
  until: 14 * 60, // 20:00
  minutes: 45,
  cuts: 5,
  knife: 1.3,
  zone: 0.2,
  simmer: 4.2,
  window: [0.6, 0.82],
};

/**
 * Die Gerichte: was in den Kessel kommt (`fisch` aus dem Angelkorb, sonst aus dem Vorrat) und was
 * sie bis zum Morgen bewirken: `hp` mehr Leben, `speed` flinker (Anteil), `damage` kräftiger
 * (Anteil). Mit einem Löffel wirkt es halb, mit dreien anderthalbfach (`SPOON_FACTOR`).
 */
export const DISHES = {
  kuerbissuppe: { need: { fasern: 2 }, effect: { hp: 30 }, color: 'f4' },
  fischsuppe: { need: { fisch: 1, fasern: 1 }, effect: { hp: 15, speed: 0.1 }, color: 'e8' },
  pilzeintopf: { need: { pilze: 3 }, effect: { hp: 10, damage: 0.15 }, color: 'e5' },
};
export const DISH_ORDER = ['kuerbissuppe', 'fischsuppe', 'pilzeintopf'];

/** Wirkung je Löffel (1–3). */
export const SPOON_FACTOR = [0, 0.5, 1, 1.5];

/** Würzen: drei Gläser auf dem Brett. */
export const SPICES = ['salz', 'kraeuter', 'pfeffer'];

/**
 * Was jede Person am liebsten isst und wie sie es gewürzt mag. Vor dem Würzen verrät sie es
 * (Sprechblase), ihr Lieblingsgericht trägt in der Wahl ein Herz. Rosa ist Köchin: Mit ihr
 * gelingt jedes Gericht einen Löffel besser.
 */
export const TASTES = {
  hilde: { dish: 'kuerbissuppe', spice: 'kraeuter' },
  bert: { dish: 'fischsuppe', spice: 'pfeffer' },
  juna: { dish: 'pilzeintopf', spice: 'pfeffer' },
  yusuf: { dish: 'kuerbissuppe', spice: 'salz' },
  anton: { dish: 'pilzeintopf', spice: 'salz' },
  rosa: { dish: 'kuerbissuppe', spice: 'kraeuter', chef: true },
  clara: { dish: 'fischsuppe', spice: 'salz' },
  emil: { dish: 'kuerbissuppe', spice: 'kraeuter' },
  frieda: { dish: 'pilzeintopf', spice: 'pfeffer' },
  ida: { dish: 'pilzeintopf', spice: 'kraeuter' },
  hannes: { dish: 'fischsuppe', spice: 'pfeffer' },
  greta: { dish: 'fischsuppe', spice: 'kraeuter' },
  lotte: { dish: 'kuerbissuppe', spice: 'salz' },
  mara: { dish: 'pilzeintopf', spice: 'salz' },
  fiete: { dish: 'fischsuppe', spice: 'salz' },
  paula: { dish: 'kuerbissuppe', spice: 'pfeffer' },
};
const DEFAULT_TASTE = { dish: 'kuerbissuppe', spice: 'kraeuter' };
export const tasteOf = (id) => TASTES[id] || DEFAULT_TASTE;

/**
 * Wie gut es wird: Schnitte (ab `cuts[1]` sauberen zwei Punkte, ab `cuts[0]` einer), das richtige
 * Gewürz, golden vom Feuer, das Lieblingsgericht, Rosa – ab `spoons[1]` Punkten zwei Löffel, ab
 * `spoons[2]` drei.
 */
export const SCORE = { cuts: [2, 4], spoons: [0, 2, 4] };

/** Herbstbuch: die Tat »Aus einem Topf« – jedes Gericht einmal gekocht. */
export const COOK_DEED = DISH_ORDER.length;

/** Ein neuer Zustand (state.cooking). */
export function newCooking() {
  // evenings: Abende am Kessel; lastDay: der letzte (ein Abend, eine Aktivität); meal: was heute
  // wirkt ({ id, day, q }); cooked: wie oft je Gericht; best: die meisten Löffel je Gericht;
  // tastes: wessen Geschmack Mika kennt (nach einem Abend zusammen)
  return { evenings: 0, lastDay: 0, meal: null, cooked: {}, best: {}, tastes: [] };
}

/** Gelesenen Zustand absichern. */
export function sanitizeCooking(raw) {
  const base = newCooking();
  if (!raw || typeof raw !== 'object') return base;
  const int = (v, min, max, d = min) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : d);
  base.evenings = int(raw.evenings, 0, 1e6);
  base.lastDay = int(raw.lastDay, 0, 1e6);
  const m = raw.meal;
  if (m && typeof m === 'object' && DISHES[m.id]) base.meal = { id: m.id, day: int(m.day, 0, 1e6), q: int(m.q, 1, 3, 1) };
  for (const id of DISH_ORDER) {
    if (raw.cooked?.[id]) base.cooked[id] = int(raw.cooked[id], 0, 1e6);
    if (raw.best?.[id]) base.best[id] = int(raw.best[id], 1, 3, 1);
  }
  base.tastes = Array.isArray(raw.tastes) ? [...new Set(raw.tastes.filter((id) => typeof id === 'string' && TASTES[id]))] : [];
  return base;
}

/** Wie viel davon gerade da ist (`fisch` aus dem Angelkorb). */
export function stockOf(state, res) {
  if (res === 'fisch') return state.fishing?.basket || 0;
  return state.inventory?.[res] || 0;
}

/** Was für ein Gericht fehlt ({ res: fehlend }), leer heißt: Es geht. */
export function missingFor(state, id) {
  const out = {};
  for (const [res, n] of Object.entries(DISHES[id].need)) {
    const have = stockOf(state, res);
    if (have < n) out[res] = n - have;
  }
  return out;
}

/** Geht heute irgendein Gericht? */
export function anyDish(state) {
  return DISH_ORDER.some((id) => !Object.keys(missingFor(state, id)).length);
}

/**
 * War heute Abend schon etwas (Karten, Angeln, Kochen) – oder ist heute das Kürbisfest (A6)? Ein
 * Abend, eine Aktivität (Nr. 171); Karten und Angeln fragen hier mit.
 */
export function eveningTaken(state) {
  const day = state.time?.day;
  return state.cards?.lastDay === day || state.fishing?.lastDay === day || state.cooking?.lastDay === day || festivalTonight(state);
}

/**
 * Bietet das Gespräch mit `id` heute »Kochst du mit mir?« an? Eingezogen, abends, noch keine
 * Aktivität, und ein Gericht geht (die letzte Prüfung – Nacht, Wetter – macht core/cooking.js).
 */
export function cookingOffered(state, id) {
  if (state.survivors?.[id]?.stage !== 3) return false;
  if (eveningTaken(state)) return false;
  const m = state.time?.minute ?? 0;
  if (m < COOKING.from || m > COOKING.until) return false;
  return anyDish(state);
}

/** Was heute Abend gegessen wurde, wirkt bis zum Morgen: Leben, Tempo, Schlagkraft. */
export function mealEffect(state) {
  const m = state.cooking?.meal;
  if (!m || m.day !== state.time?.day || !DISHES[m.id]) return { hp: 0, speed: 0, damage: 0 };
  const e = DISHES[m.id].effect;
  const k = SPOON_FACTOR[m.q] || 1;
  return { hp: Math.round((e.hp || 0) * k), speed: (e.speed || 0) * k, damage: (e.damage || 0) * k };
}

/** Wie viele verschiedene Gerichte schon gekocht wurden (Tat im Herbstbuch). */
export function dishesCooked(state) {
  return DISH_ORDER.filter((id) => (state.cooking?.cooked?.[id] || 0) > 0).length;
}
