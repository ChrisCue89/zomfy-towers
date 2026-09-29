// Der Waffenschrank und der Übungsplatz (M30, OFFENE-FRAGEN 168, 169). Im Schrank in
// der Stube liegen sieben Waffen – vier Schusswaffen und drei für die Hand. Jede
// Person bekommt eine davon für den Notfall (die Lagerglocke, M31); auch Mika kann
// sich eine nehmen. Die Munition gehört allen: Was Mika nachts verschießt, fehlt,
// wenn die Glocke läutet. Treffer sprühen Sporen und Laub, nie Blut.
// Hier wird balanciert.

/**
 * Schusswaffen. Werte:
 *   ammo      welche Munition (AMMO)       mag      Schuss je Magazin
 *   reload    Nachladen (s)                rate     Schüsse je Sekunde (höchstens)
 *   damage    Schaden je Treffer           range    Reichweite (m)
 *   pellets   Kugeln je Schuss (Schrot)    spread   halber Streuwinkel (Grad)
 *   pierce    durchschlägt so viele Schlurfer zusätzlich
 *   push      Rückstoß (m)                 noise    so weit hört die Horde den Knall (m)
 *   kick      Rückstoß der Kamera (Stufe in data/feel.js: schuss, schussSchwer)
 *   flare     Leuchtkugel: Lichtinsel (Radius, Sekunden), blendet ringsum (s)
 */
export const GUNS = {
  jagdgewehr: { ammo: 'patronen', mag: 1, reload: 1.2, rate: 0.9, damage: 75, range: 12, pellets: 1, spread: 0, pierce: 1, push: 0.5, noise: 16, kick: 'schussSchwer' },
  doppelflinte: { ammo: 'schrot', mag: 2, reload: 1.5, rate: 1.6, damage: 15, range: 6, pellets: 6, spread: 20, pierce: 0, push: 1.3, noise: 14, kick: 'schussSchwer' },
  pistole: { ammo: 'patronen', mag: 6, reload: 1.3, rate: 2.6, damage: 24, range: 9, pellets: 1, spread: 3, pierce: 0, push: 0.25, noise: 11, kick: 'schuss' },
  signalpistole: { ammo: 'leuchtkugeln', mag: 1, reload: 1.6, rate: 0.8, damage: 8, range: 10, pellets: 1, spread: 0, pierce: 0, push: 0.2, noise: 8, kick: 'schuss', flare: { radius: 3.2, time: 12, blind: 5 } },
};

/** Alle Waffen im Schrank, in der Reihenfolge des Schranks (links nach rechts). */
export const ARMS_ORDER = ['jagdgewehr', 'doppelflinte', 'pistole', 'signalpistole', 'spaltaxt', 'mistgabel', 'schlaeger'];

/** Munition: Startvorrat im Schrank. Sie liegt im Vorrat wie alles andere (state.inventory). */
export const AMMO = ['patronen', 'schrot', 'leuchtkugeln'];
export const AMMO_START = { patronen: 6, schrot: 4, leuchtkugeln: 2 };

/**
 * Wer im Notfall welche Waffe nimmt (änderbar im Schrank). Dr. Yusuf nimmt keine – er
 * verarztet. Die Wanderer nach ihrem Beruf; wer fehlt, nimmt, was übrig ist.
 */
export const NOTFALL_START = {
  hilde: 'doppelflinte',
  bert: 'spaltaxt',
  juna: 'signalpistole',
  yusuf: null,
  hannes: 'spaltaxt',
  clara: 'pistole',
  lotte: 'signalpistole',
  greta: 'jagdgewehr',
  fiete: 'mistgabel',
  ida: 'jagdgewehr',
  rosa: 'schlaeger',
  anton: 'schlaeger',
  emil: 'mistgabel',
  frieda: 'schlaeger',
  mara: 'pistole',
  paula: 'mistgabel',
};

/** Der Schrank ist abgeschlossen – bis nach der ersten gehaltenen Nacht (Edda sagt, wo der Schlüssel liegt). */
export const ARMS_UNLOCK_NIGHTS = 1;

/**
 * Munition beschaffen: bei Balduin Patronen (für Zombieteile, `perDay` Mal am Tag),
 * an der Werkbank Schrot und Leuchtkugeln (Rezepte in data/recipes.js).
 */
export const AMMO_TRADE = { gives: { patronen: 6 }, cost: { teile: 5 }, perDay: 2 };

/** Wie lange eine Hülse liegen bleibt: bis zum nächsten Morgen (höchstens so viele im Bild). */
export const CASINGS_MAX = 48;

/**
 * Übung (Nr. 169): ein Regler je Person, Stufe 0–3. Für die nächste Stufe braucht es
 * `steps[stufe]` Übungen; eine Übung dauert `hours` Spielstunden, höchstens eine je
 * Person und Tag, die Fähigkeit ruht solange. Schießübungen kosten `ammo` Patronen
 * (sonst üben sie an der Strohpuppe). Je Stufe: `hp` Leben mehr, `aim` Treffsicherheit
 * mehr (Grund `aimBase` %), `fright` Schreck weniger (Grund `frightBase` %: 1 s Zögern,
 * wenn ein Schlurfer auf 2 m herankommt). Übt Mika mit, zählt es als gemeinsame Zeit.
 * Geübt wird zwischen `from` und `until` Uhr (die Übung muss bis `until` fertig sein).
 */
export const TRAINING = { steps: [2, 3, 4], hours: 2, ammo: 3, hp: 20, aim: 8, aimBase: 60, fright: 10, frightBase: 30, from: 8, until: 17 };

/**
 * Eigene Profile (»Juna schnell, aber schreckhaft«): Zuschläge auf Treffsicherheit und
 * Schreck, unabhängig von der Stufe. Fehlt jemand, gilt 0.
 */
export const PROFILES = {
  hilde: { aim: 10, fright: -10 }, // hat früher Tontauben geschossen
  bert: { aim: -5, fright: -15 }, // stur wie ein Pfosten
  juna: { aim: 5, fright: 15 }, // schnell, aber schreckhaft
  yusuf: { aim: -10, fright: -5 },
  greta: { aim: 15, fright: -10 },
  ida: { aim: 10, fright: -5 },
  anton: { aim: -5, fright: 10 },
  mara: { aim: 5, fright: -5 },
};

/** Treffsicherheit und Schreck einer Person (in %) bei ihrer Übungsstufe. */
export function armsSkill(id, level) {
  const p = PROFILES[id] || {};
  return {
    aim: Math.max(20, Math.min(98, TRAINING.aimBase + TRAINING.aim * level + (p.aim || 0))),
    fright: Math.max(0, Math.min(80, TRAINING.frightBase - TRAINING.fright * level + (p.fright || 0))),
    hp: TRAINING.hp * level,
  };
}

/** Wie viele Übungen fehlen noch bis zur nächsten Stufe (null: ganz geübt)? */
export function stepsLeft(t) {
  const level = t?.level || 0;
  if (level >= TRAINING.steps.length) return null;
  return TRAINING.steps[level] - (t?.done || 0);
}

/** Leerer Eintrag für den Waffenschrank (state.arms). */
export function newArms() {
  return { unlocked: false, taken: [], notfall: { ...NOTFALL_START }, mag: {} };
}

/** Waffenschrank prüfen und reparieren (sanitizeState). */
export function sanitizeArms(raw, people) {
  const out = newArms();
  if (!raw || typeof raw !== 'object') return out;
  out.unlocked = raw.unlocked === true;
  out.taken = Array.isArray(raw.taken) ? raw.taken.filter((id, i, a) => ARMS_ORDER.includes(id) && a.indexOf(id) === i) : [];
  for (const id of people) {
    const w = raw.notfall?.[id];
    if (w === null || ARMS_ORDER.includes(w)) out.notfall[id] = w;
  }
  for (const id of Object.keys(GUNS)) {
    const n = raw.mag?.[id];
    if (Number.isFinite(n)) out.mag[id] = Math.max(0, Math.min(GUNS[id].mag, Math.floor(n)));
  }
  return out;
}

/** Übung prüfen und reparieren. */
export function sanitizeTraining(raw, people) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const id of people) {
    const t = raw[id];
    if (!t || typeof t !== 'object') continue;
    const level = Number.isFinite(t.level) ? Math.max(0, Math.min(TRAINING.steps.length, Math.floor(t.level))) : 0;
    const done = Number.isFinite(t.done) ? Math.max(0, Math.min(10, Math.floor(t.done))) : 0;
    const day = Number.isFinite(t.day) ? Math.floor(t.day) : 0;
    out[id] = { level, done, day };
  }
  return out;
}
