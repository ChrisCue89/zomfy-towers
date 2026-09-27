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
    arrive: { x: -5.5, z: 6.0 }, // sitzt am Briefkasten (Bucht, Meilenstein 9)
    spot: { x: -0.75, z: -0.25 }, // tagsüber am Feuer
    tent: false,
    prompt: 'streicheln',
  },
  hilde: {
    name: 'Oma Hilde',
    day: 3,
    arrive: { x: -4.75, z: 4.75 }, // mit dem Lastenrad am Hofeingang
    spot: { x: -2.25, z: 5.0 },
    tent: true,
    prompt: 'ansprechen',
  },
  juna: {
    name: 'Juna',
    day: 4,
    arrive: { x: 19.75, z: -1.0 }, // am alten Mast am Ende des Stegs
    spot: { x: 20.25, z: -1.25 },
    tent: true,
    prompt: 'ansprechen',
  },
  bert: {
    name: 'Bert',
    day: 5,
    arrive: { x: -5.25, z: 0.25 }, // kommt den Weg herauf in den Hof
    spot: { x: 0.75, z: -5.25 }, // beim Hackklotz
    tent: true,
    prompt: 'ansprechen',
  },
  yusuf: {
    name: 'Dr. Yusuf',
    day: 6,
    arrive: { x: 11.25, z: 7.25 }, // unten am Strand
    spot: { x: 3.5, z: -0.5 }, // am Feuer, beim Sessel
    tent: true,
    prompt: 'ansprechen',
  },
};

/** Stufen des Leuchtmasts am Steg (früher Funkturm, Juna): Kosten und was dazukommt. */
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

/**
 * Aufträge (DESIGN.md 6.14): Wer eingezogen ist, bittet Mika gleich um etwas.
 * bring: im Gespräch abgeben · licht: eine Laterne nahe beim eigenen Zelt.
 * Juna braucht keinen eigenen Auftrag – ihr Auftrag ist der Funkturm.
 */
export const ERRANDS = {
  hilde: { kind: 'bring', give: { fasern: 8 }, reward: { maxHp: 15 } }, // Schal
  bert: { kind: 'licht', radius: 3.2, reward: { zahnraeder: 2, schrott: 4 } },
  yusuf: { kind: 'bring', give: { fasern: 6, stoff: 1 }, reward: { tea: 3 } }, // stärkerer Tee
};
