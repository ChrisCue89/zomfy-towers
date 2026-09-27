// Die Überlebenden (DESIGN.md 4.5, 6.14): Wann sie kommen, wo sie stehen, was
// sie können. Stufen im Spielzustand (state.survivors[id].stage):
//   0 noch unterwegs · 1 angekommen (noch nicht angesprochen)
//   2 zu Gast (bleibt tagsüber, braucht ein Zelt) · 3 eingezogen (Fähigkeit aktiv)
// Knopf braucht kein Zelt: Er zieht ein, sobald man ihn gestreichelt hat.

export const SURVIVOR_ORDER = ['knopf', 'hilde', 'juna', 'bert', 'yusuf'];

export const SURVIVORS = {
  knopf: {
    name: 'Knopf',
    dog: true,
    day: 2, // kommt am Morgen dieses Tages
    arrive: { x: -1.2, z: 8.2 }, // sitzt am Briefkasten
    spot: { x: 3.1, z: 2.1 }, // tagsüber am Feuer
    tent: false,
    prompt: 'streicheln',
  },
  hilde: {
    name: 'Oma Hilde',
    day: 3,
    arrive: { x: 9.2, z: 9.4 }, // mit dem Lastenrad auf der Straße
    spot: { x: 1.4, z: 5.2 },
    tent: true,
    prompt: 'ansprechen',
  },
  juna: {
    name: 'Juna',
    day: 4,
    arrive: { x: 8.2, z: -4.6 }, // am Funkturm
    spot: { x: 8.0, z: -4.6 },
    tent: true,
    prompt: 'ansprechen',
  },
  bert: {
    name: 'Bert',
    day: 5,
    arrive: { x: -12.5, z: 9.2 }, // kommt von Westen die Straße entlang
    spot: { x: -5.6, z: 1.2 }, // beim Hackklotz
    tent: true,
    prompt: 'ansprechen',
  },
  yusuf: {
    name: 'Dr. Yusuf',
    day: 6,
    arrive: { x: 12.8, z: 1.5 },
    spot: { x: 6.4, z: 2.6 }, // am Feuer, beim Sessel
    tent: true,
    prompt: 'ansprechen',
  },
};

/** Stufen des Funkturms (Juna): Kosten und was dazukommt. */
export const TOWER_STAGES = [
  null,
  { cost: { schrott: 20, holz: 12 }, hours: 2 }, // Leiter und Plattform
  { cost: { schrott: 12, zahnraeder: 3, stoff: 6 }, hours: 3 }, // Antenne und Kabel
  { cost: { schrott: 30, moderkerne: 1 }, hours: 3 }, // Leuchtfeuer
];

/** Leuchtfeuer: Reichweite (m) und wie stark Schlurfer darin gebremst werden. */
export const BEACON = { range: 7.5, slow: 0.3, glow: 6 }; // glow: Radius der sichtbaren Lichtinsel

/** Hildes Tauschangebote, eines je Tag (reihum). */
export const TRADES = [
  { give: { holz: 6 }, get: { schrott: 2 } },
  { give: { stein: 4 }, get: { schrott: 2 } },
  { give: { fasern: 5 }, get: { stoff: 1 } },
  { give: { schrott: 8 }, get: { zahnraeder: 1 } },
  { give: { stoff: 2 }, get: { schrott: 3 } },
];

/** Morgengaben der Eingezogenen (im Morgenbericht). */
export const MORNING_GIFTS = {
  knopf: { schrott: 1 }, // hat etwas ausgebuddelt
  hilde: { schrott: 2, fasern: 2 }, // von ihrer Runde
};

/** Bert: Reparieren kostet nur diesen Anteil; Türme flickt er nachts um so viel. */
export const BERT_REPAIR = { costFactor: 0.5, nightlyTower: 0.3 };

/** Dr. Yusuf: Kräutertee am Morgen – schnelleres Heilen bis zum Abend. */
export const YUSUF_TEA = { regen: 2 };
