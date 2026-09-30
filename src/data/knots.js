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
];

/** Der Knoten, der für `who` gerade wartet (oder null). */
export function knotFor(state, who) {
  return KNOTS.find((k) => k.who === who && !state.flags[k.flag] && state.time.day >= (k.day || 0) && k.when(state)) || null;
}
