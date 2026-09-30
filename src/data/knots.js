// Fäden verknoten (G2, recherche/storytelling-namen.md 4.4): kleine Momente, die einmal erzählt
// werden, wenn ihre Zeit gekommen ist – beim nächsten Gespräch mit der Person, statt des gewohnten
// Gesprächs (ein angekündigter Bindungsmoment geht vor). Jeder merkt sich ein Flag in `state.flags`.

/** Ist Edda zu Hause? (wie `survivors.eddaHome`, M32) */
const eddaHome = (st) => Boolean(st.edda?.home) && st.time.day >= st.edda.home;
/** Wohnt jemand in der Bucht? */
const living = (st, id) => st.survivors?.[id]?.stage === 3;

export const KNOTS = [
  // Hilde hört Edda im Funk und erkennt Frau Lindqvist – ihr letzter Brief hat eine Empfängerin
  { who: 'hilde', flag: 'hildeKenntEdda', dialog: 'hildeErkennt', day: 13, when: () => true },
  // Nach Eddas Heimkehr stellt Hilde den Brief zu: vierzig Jahre Post, und der letzte kommt an
  { who: 'hilde', flag: 'briefZugestellt', dialog: 'briefZustellen', when: (st) => eddaHome(st) && st.flags.hildeKenntEdda },
  // Yusuf erkennt den roten Faden an Knopfs Halsband: ein Pflegehund aus seiner Praxis
  { who: 'yusuf', flag: 'yusufKnopf', dialog: 'yusufKnopf', day: 16, when: (st) => living(st, 'knopf') },
  // Edda zu Hause: die Kleine, die um acht sendet – drei Jahre hat Edda ihr zugehört
  { who: 'edda', flag: 'eddaJuna', dialog: 'eddaJuna', when: (st) => living(st, 'juna') },
  // G3: Sage gegen Aufklärung – Hilde erzählt von Irrlichtern und Moosleuten, Yusuf widerspricht
  { who: 'hilde', flag: 'moosleute', dialog: 'moosleute', day: 6, when: (st) => living(st, 'yusuf') },
  // G4: Nach dem ersten Frost – Frau Holle hat die Betten ausgeschüttelt; das Pfeifen antwortet
  { who: 'hilde', flag: 'frauHolle', dialog: 'frauHolle', when: (st) => Boolean(st.autumn?.frost) },
  { who: 'juna', flag: 'pfeifen', dialog: 'junaPfeifen', when: (st) => Boolean(st.autumn?.frost) },
  // G6: Hilde über Balduin – früher fuhr er die Seepost (und war immer schneller); zuletzt in der Liste,
  // damit alle früheren Knoten vorgehen
  { who: 'hilde', flag: 'seepost', dialog: 'hildeSeepost', day: 9, when: (st) => Boolean(st.flags.balduinGetroffen) },
];

/**
 * G3: Der Wald erzählt – welche Gedanken Mika am Waldrand hat (T.geschichte), nach dem Tag:
 * erst was der Moder tut, dann der Volksmund, dann die Alte Ablage, dann der nahende Frost und
 * nach dem Herbst der Schnee.
 */
export const FOREST_STAGES = [
  { from: 1, key: 'waldrand' },
  { from: 7, key: 'waldrand2' },
  { from: 13, key: 'waldrand3' },
  { from: 20, key: 'waldrand4' },
  { from: 31, key: 'waldrandSchnee' },
];

/** Schlüssel der Waldrand-Gedanken für Tag `day`. */
export function forestKey(day) {
  let key = FOREST_STAGES[0].key;
  for (const s of FOREST_STAGES) if (day >= s.from) key = s.key;
  return key;
}

/** Der Knoten, der für `who` gerade wartet (oder null). */
export function knotFor(state, who) {
  return KNOTS.find((k) => k.who === who && !state.flags[k.flag] && state.time.day >= (k.day || 0) && k.when(state)) || null;
}
