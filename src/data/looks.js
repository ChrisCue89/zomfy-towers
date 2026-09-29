// Aussehen der Hauptfigur (Meilenstein 7): Figur (N5), Mütze, Jacke, Haare und Haut
// zur Wahl. Jede Option ist eine kleine Farbrampe aus der Palette; lookSpec() setzt
// sie in die Figur-Beschreibung (MIKA in entities/characters.js) ein.

import { P } from '../render/palette.js';

export const LOOKS = {
  // N5 (Probespiel): Frau oder Mann – nur die Figur ändert sich (Frisur, Wimpern, Porträt),
  // alle Texte sprechen Mika mit »du« oder dem Namen an. Alte Stände bleiben »Mann«
  // (das bisherige Modell mit kurzem Haar), neue beginnen mit »Frau«.
  body: {
    frau: { body: 'frau' },
    mann: { body: 'mann' },
  },
  hat: {
    orange: { hat: P.f4, hatDark: P.f3, hatLight: P.f5 },
    rot: { hat: P.r3, hatDark: P.r2, hatLight: P.r4 },
    blau: { hat: P.b3, hatDark: P.b2, hatLight: P.b4 },
    lila: { hat: P.a2, hatDark: P.d2, hatLight: P.a3 },
  },
  jacket: {
    gruen: { jacket: P.g5, jacketDark: P.g4, jacketLight: P.g6 },
    blau: { jacket: P.b2, jacketDark: P.b1, jacketLight: P.b3 },
    rot: { jacket: P.r2, jacketDark: P.r1, jacketLight: P.r3 },
    senf: { jacket: P.e6, jacketDark: P.e5, jacketLight: P.e7 },
  },
  hair: {
    braun: { hair: P.e3 },
    schwarz: { hair: P.n1 },
    blond: { hair: P.f6 },
    rot: { hair: P.r3 },
  },
  skin: {
    mittel: { skin: P.h3, skinShade: P.h2 },
    hell: { skin: P.h4, skinShade: P.h3 },
    braun: { skin: P.h2, skinShade: P.h1 },
    dunkel: { skin: P.h1, skinShade: P.h0 },
  },
};

export const LOOK_KEYS = ['body', 'hat', 'jacket', 'hair', 'skin'];

export const DEFAULT_LOOK = { body: 'frau', hat: 'orange', jacket: 'gruen', hair: 'braun', skin: 'mittel' };

/** Figur-Beschreibung mit dem gewählten Aussehen. */
export function lookSpec(base, look = DEFAULT_LOOK) {
  const spec = { ...base };
  for (const key of LOOK_KEYS) Object.assign(spec, LOOKS[key][look?.[key]] || LOOKS[key][DEFAULT_LOOK[key]]);
  return spec;
}

/** Erlaubte Zeichen im Namen: Buchstaben (auch Umlaute), Leerzeichen, Bindestrich. */
export const NAME_MAX = 12;
export function cleanName(name) {
  const text = String(name || '')
    .replace(/[^A-Za-zÄÖÜäöüß\- ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
  return text || 'Mika';
}
