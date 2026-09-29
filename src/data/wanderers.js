// Die Wanderer (M27, OFFENE-FRAGEN 161–164): Menschen, die im Lauf des Herbsts
// in die Bucht kommen. Jeder hat einen Beruf mit einer kleinen, meist nicht
// kämpferischen Fähigkeit, zwei Temperamente (für geteilte Szenen, M29), einen
// Running Gag, ein Erinnerungsstück und einen sicheren Ort, zu dem Mika ihn
// weiterbringen kann (Netzwerk, M32). Texte stehen in texts.js (T.wanderer)
// und dialogs.js.
//
// Ablauf (core/survivors.js): ankommen (Stufe 1) → ansprechen: Gast am Feuer
// (Stufe 2, eine Nacht am Gästeplatz) → am nächsten Morgen die Entscheidung:
// »Bleib bei uns« (Stufe 3, braucht einen freien Platz), »Weiterbringen«
// (Stufe 4: weitergezogen, zwei bis drei Tage später ein Brief) oder einmal
// »Bleib noch einen Tag«.

/**
 * Die Wanderer (M27: die ersten vier; M29 die übrigen acht). Ein Herbst hat acht
 * Ankunftstage (ARRIVAL_SLOTS) – jede Runde lernt Mika also acht der zwölf kennen.
 */
export const WANDERERS = {
  hannes: {
    name: 'Hannes',
    job: 'zimmerer',
    ability: 'flicken',
    temper: ['bedaechtig', 'stolz'],
    route: 'weg',
    place: 'forsthaus',
    spot: { x: -4.75, z: -3.25 }, // tagsüber beim Tor und den Barrikaden
  },
  clara: {
    name: 'Clara',
    job: 'mechanikerin',
    ability: 'schrauben',
    temper: ['neugierig', 'ungeduldig'],
    route: 'strand',
    place: 'leuchtturm',
    spot: { x: 3.25, z: 2.5 }, // bei den Türmen am Hof
  },
  lotte: {
    name: 'Lotte',
    job: 'laternenmacherin',
    ability: 'licht',
    temper: ['vertraeumt', 'herzlich'],
    route: 'weg',
    place: 'ferienlager',
    spot: { x: -2.75, z: 0.75 }, // am Feuer, bei den Lampen
  },
  greta: {
    name: 'Greta',
    job: 'jaegerin',
    ability: 'fallen',
    temper: ['wortkarg', 'verlaesslich'],
    route: 'strand',
    place: 'nordinsel',
    spot: { x: -5.25, z: 3.5 }, // am Tor, den Blick auf die Wege
  },
  // --- M29: die übrigen acht ---
  fiete: {
    name: 'Fiete',
    job: 'fischer',
    ability: 'handel',
    temper: ['bedaechtig', 'neugierig'],
    route: 'strand',
    place: 'hafen',
    spot: { x: 12.25, z: 1.75 }, // am Steg, den Blick aufs Wasser
  },
  ida: {
    name: 'Ida',
    job: 'foersterin',
    ability: 'wald',
    temper: ['wortkarg', 'vertraeumt'],
    route: 'weg',
    place: 'forsthaus',
    spot: { x: -3.75, z: -6.25 }, // bei den Bäumen hinter dem Hackklotz
  },
  rosa: {
    name: 'Rosa',
    job: 'koechin',
    ability: 'kochen',
    temper: ['herzlich', 'ungeduldig'],
    route: 'weg',
    place: 'farm',
    spot: { x: 1.75, z: 0.75 }, // am Feuer, beim Kessel
  },
  anton: {
    name: 'Anton',
    job: 'musiker',
    ability: 'musik',
    temper: ['vertraeumt', 'herzlich'],
    route: 'strand',
    place: 'ferienlager',
    spot: { x: 5.75, z: 4.25 }, // an der Bank, mit Blick auf den See
  },
  emil: {
    name: 'Emil',
    job: 'gaertner',
    ability: 'garten',
    temper: ['bedaechtig', 'herzlich'],
    route: 'weg',
    place: 'farm',
    spot: { x: -5.75, z: -7.75 }, // beim Beet
  },
  frieda: {
    name: 'Frieda',
    job: 'schmiedin',
    ability: 'schmieden',
    temper: ['stolz', 'verlaesslich'],
    route: 'weg',
    place: 'muehle',
    spot: { x: 0.25, z: -7.25 }, // hinter der Werkbank
  },
  mara: {
    name: 'Mara',
    job: 'spaeherin',
    ability: 'spaehen',
    temper: ['ungeduldig', 'neugierig'],
    route: 'weg',
    place: 'kloster',
    spot: { x: -6.25, z: 5.75 }, // am Wall, den Blick auf die Wege
  },
  paula: {
    name: 'Paula',
    job: 'naeherin',
    ability: 'naehen',
    temper: ['verlaesslich', 'stolz'],
    route: 'strand',
    place: 'kloster',
    spot: { x: 3.25, z: 6.25 }, // bei den Zelten
  },
};

export const WANDERER_ORDER = Object.keys(WANDERERS);

/**
 * Was die Fähigkeiten tun (klein, verschieden, meist nicht kämpferisch):
 *   flicken    Hannes: nach jeder Nacht die Hälfte der Schäden an Holzbarrikaden
 *   schrauben  Clara: Türme flicken ein Viertel billiger, Basteln braucht ein Teil weniger
 *   licht      Lotte: alle Lichtinseln ein Viertel größer (Licht macht den Moder müde)
 *   fallen     Greta: verbrauchte Fallen stehen am Morgen wieder
 *   handel     Fiete: Balduin legt bei jedem Tausch von Rohstoffen `extra` drauf
 *   wald       Ida: Bäume wachsen `faster` Tage schneller nach (mindestens einer)
 *   kochen     Rosa: die Suppe gibt `soupHp` statt SOUP.maxHp Leben bis zum Morgen
 *   musik      Anton: spielt abends am Feuer – morgens `cozy` Gemütlichkeit mehr
 *   garten     Emil: Beete tragen `extra` Fasern mehr je Ernte
 *   schmieden  Frieda: Metallbarrikaden kosten nur `scrap` des Schrotts
 *   spaehen    Mara: meldet morgens die Wege der Nacht; der Nachtplan hängt ab `planFrom` Uhr
 *   naehen     Paula: Umgeworfenes im Lager steht morgens wieder
 */
export const ABILITIES = {
  flicken: { share: 0.5 },
  schrauben: { repair: 0.75, tinker: 1 },
  licht: { radius: 1.25 },
  fallen: { rearm: true },
  handel: { extra: 1 },
  wald: { faster: 1 },
  kochen: { soupHp: 40 },
  musik: { cozy: 2 },
  garten: { extra: 2 },
  schmieden: { scrap: 0.5 },
  spaehen: { planFrom: 17 },
  naehen: { raise: true },
};

/** Ankunftstage (OFFENE-FRAGEN 161): je ±1 aus dem Startwert der Karte. */
export const ARRIVAL_SLOTS = [7, 9, 12, 14, 17, 19, 22, 24];
/** Bis zu diesem Tag kommen neue Gesichter; danach steht die Frostnacht bevor. */
export const LAST_ARRIVAL = 24;
/** Bossnächte (jede fünfte) und der Morgen danach (Fest): kein Neuankömmling. */
export const BOSS_EVERY = 5;

/** Wo Neuankömmlinge stehen, je nach Weg: gleich hinter dem Tor oder unten am Strand. */
export const ARRIVE_SPOTS = {
  weg: { x: -5.5, z: 2.25 },
  strand: { x: 10.75, z: 7.75 },
};

/** Wer weiterzieht, geht diesen Weg: durch die Schlupftür hinaus bzw. am Strand entlang. */
export const EXIT_ROUTES = {
  weg: [
    { x: -6.5, z: 1.5 },
    { x: -10.5, z: 1.5 },
  ],
  strand: [{ x: 11.5, z: 9.75 }],
};

/** Gästeplätze am Feuer (Schlafsack dahinter), mit Blick über das Feuer zur Kamera. */
export const GUEST_SPOTS = [
  { x: -1.75, z: -3.0, facing: 1.06 }, // links vom Nordbalken
  { x: 2.5, z: -3.75, facing: -1.0 }, // hinter dem Ohrensessel, aber ganz zu sehen
];

/** Schlafplätze: Zelte (je einer), die Hütte (zwei), das Gästezimmer (einer, ab Zuhause-Stufe 5). */
export const PLACES = { zelt: 1, schlafhuette: 2 };
export const GUEST_ROOM_LEVEL = 5;

/**
 * Freie Schlafplätze aus dem Spielzustand (für die Dialoge; core/survivors.js
 * rechnet dasselbe mit den Bauten der Welt): Zelte, Hütten, Gästezimmer, die
 * stehen und noch niemandem gehören.
 */
export function freePlaces(state) {
  const used = new Set(
    Object.values(state.survivors || {})
      .filter((s) => s && s.tent !== null && s.tent !== undefined && s.stage === 3)
      .map((s) => `${s.tent}|${s.slot || 0}`)
  );
  let n = 0;
  for (const b of state.world?.buildings || []) {
    const k = PLACES[b.type] || 0;
    for (let slot = 0; slot < k; slot++) if (!b.broken && !used.has(`${b.id}|${slot}`)) n++;
  }
  if ((state.world?.houseLevel || 1) >= GUEST_ROOM_LEVEL && !used.has('zimmer|0')) n++;
  return n;
}

/** Die sicheren Orte des Netzwerks (M32 baut es aus). */
export const SAFE_PLACES = ['nordinsel', 'forsthaus', 'farm', 'leuchtturm', 'ferienlager', 'hafen', 'muehle', 'kloster'];

/** Der erste Brief kommt so viele Tage nach dem Weiterbringen. */
export const LETTER_DELAY = [2, 3];

/**
 * Plan der Ankünfte aus dem Startwert: Reihenfolge der Wanderer gemischt, je
 * Ankunft ein Tag aus ARRIVAL_SLOTS ±1 – nie in einer Bossnacht, nie am
 * Festmorgen danach, nie zwei Tage hintereinander. Gibt es weniger Wanderer als
 * Plätze, verteilen sie sich über den ganzen Herbst. `from` lässt frühere Tage
 * aus (alte Spielstände, die schon weiter sind).
 * @param {number} seed Startwert der Karte
 * @param {string[]} ids verfügbare Wanderer
 * @param {number} [from] erster möglicher Tag
 * @returns {Array<{id:string, day:number}>}
 */
export function arrivalPlan(seed, ids, from = 1) {
  let s = (seed >>> 0) ^ 0x5bd1e995;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = [...ids];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const n = Math.min(order.length, ARRIVAL_SLOTS.length);
  // Weniger Wanderer als Plätze: gleichmäßig über die Plätze verteilen
  const slots = Array.from({ length: n }, (_, k) => ARRIVAL_SLOTS[Math.floor((k * ARRIVAL_SLOTS.length) / n)]);
  const bad = (d) => d % BOSS_EVERY === 0 || d % BOSS_EVERY === 1;
  const plan = [];
  let last = -9;
  let next = 0;
  for (let k = 0; k < slots.length; k++) {
    const slot = slots[k];
    const room = (slots[k + 1] ?? LAST_ARRIVAL + 2) - 2; // der nächste Platz muss frei bleiben
    const options = [slot - 1, slot, slot + 1].filter((d) => d >= from && d <= Math.min(LAST_ARRIVAL, room) && !bad(d) && d > last + 1);
    let day = options.length ? options[Math.floor(rand() * options.length)] : null;
    if (day === null) {
      // alte Stände: der nächste passende Tag ab `from`
      for (let d = Math.max(from, last + 2); d <= LAST_ARRIVAL; d++) {
        if (!bad(d)) {
          day = d;
          break;
        }
      }
    }
    if (day === null) break;
    plan.push({ id: order[next++], day });
    last = day;
  }
  return plan;
}

/**
 * M29: Ältere Pläne (M27: vier Wanderer) um die neuen ergänzen. Bestehende Einträge
 * bleiben, wie sie sind; wer noch nicht im Plan steht, bekommt ab `from` einen der
 * freien Plätze – nie am Tag neben einer anderen Ankunft.
 */
export function extendPlan(plan, seed, ids, from) {
  const have = new Set(plan.map((p) => p.id));
  const taken = plan.map((p) => p.day);
  const fresh = arrivalPlan(seed ^ 0x29a1, ids.filter((id) => !have.has(id)), from).filter((p) => taken.every((d) => Math.abs(d - p.day) > 1));
  return [...plan, ...fresh].sort((a, b) => a.day - b.day);
}
