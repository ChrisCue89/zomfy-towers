// Ortskunde (G5, recherche/storytelling-namen.md 4.1 und 4.6): die Orte der Holzmark und woher
// ihre Namen kommen. Ein Ort steht im Herbstbuch, sobald Mika ihn kennt – vom Wegweiser, aus
// dem Radio, aus einem Gespräch oder weil Mika selbst dort war. Mit der Zeit kommen Zeilen dazu
// (`lines`: Schlüssel in T.ortskunde.orte[id], in dieser Reihenfolge). Texte in texts.js.

import { WANDERERS } from './wanderers.js';
import { pagesRead } from './isles.js';

const stage = (st, id) => st.survivors?.[id]?.stage || 0;
const moment = (st, id) => st.bonds?.[id]?.moment || 0;
const flag = (st, k) => Boolean(st.flags?.[k]);
const read = (st, id) => pagesRead(st).includes(id);
const fog = (st) => st.isles?.fog?.stage || 0;
const isle = (id) => (st) => (st.isles?.visited || []).includes(id);
/** Das Radio in der Stube oder Juna selbst: Seewelle und Langer Jakob sind bekannt. */
const radio = (st) => flag(st, 'radioGehoert') || stage(st, 'juna') >= 2;

/**
 * Sichere Orte (M27/M32): bekannt, sobald jemand, der dorthin will, am Morgen der
 * Entscheidung davon erzählt hat (ab Stufe 3: geblieben, weitergezogen oder gefallen).
 */
const safe = (place) => (st) => Object.keys(WANDERERS).some((id) => WANDERERS[id].place === place && stage(st, id) >= 3);

/** Wer zu einem sicheren Ort weitergezogen ist (für die Zeile »dorthin«). */
export function movedTo(st, place) {
  return Object.keys(WANDERERS).filter((id) => WANDERERS[id].place === place && stage(st, id) === 4);
}

export const PLACES = {
  // Von Anfang an: die Gegend, der See, die Bucht (Wegweiser, Karte), der Wald und die Wege
  holzmark: { art: 'gegend', known: () => true, lines: (st) => ['jetzt', st.autumn?.frost && 'frost'] },
  kranichsee: { art: 'see', known: () => true, lines: (st) => ['jetzt', st.time.day >= 29 && 'fort'] },
  holzlaende: { art: 'bucht', known: () => true, lines: (st) => ['jetzt', moment(st, 'hilde') >= 2 && 'brief', st.autumn?.frost && 'frost'] },
  jakob: { art: 'mast', known: radio, lines: (st) => ['jetzt', (st.world?.tower || 0) >= 3 ? 'leuchtet' : stage(st, 'juna') >= 2 && 'juna', st.edda?.met && 'edda'] },
  seewelle: { art: 'funk', known: radio, lines: (st) => [stage(st, 'juna') >= 2 ? 'juna' : 'radio', moment(st, 'juna') >= 2 && 'sender', read(st, 'dose') && 'hoerer', st.edda?.met && 'edda'] },
  daemmerwohld: { art: 'wald', known: () => true, lines: (st) => ['jetzt', (flag(st, 'moosleute') || (st.flags?.waldrandTag || 0) >= 7) && 'kreuze', st.autumn?.frost && 'schnee'] },
  wege: { art: 'wege', known: () => true, lines: () => ['jetzt'] },
  ablage: { art: 'wald', known: (st) => flag(st, 'funk_boss_pilzmutter') || (st.flags?.waldrandTag || 0) >= 13, lines: (st) => ['jetzt', st.autumn?.frost && 'herz'] },
  // Die Inseln: bekannt, sobald Mika dort an Land war (N6); der Apfelwerder mit der Spur (N7)
  wartholm: { art: 'insel', known: isle('nord'), lines: (st) => ['jetzt', read(st, 'zelt') && 'zelt'] },
  kiekwerder: { art: 'insel', known: isle('mitte'), lines: (st) => ['jetzt', (st.isles?.found || []).includes('bank') && 'bank'] },
  kuerbisholm: { art: 'insel', known: isle('sued'), lines: (st) => ['jetzt', st.isles?.cat && 'katze'] },
  apfelwerder: {
    art: 'insel',
    known: (st) => fog(st) >= 1,
    /** Vor der ersten Fahrt heißt sie nur »die Insel im Nebel« – außer Mika hat Eddas Seite im Zelt gelesen. */
    named: (st) => fog(st) >= 2 || read(st, 'zelt'),
    lines: (st) => [fog(st) >= 2 && 'marthe', fog(st) >= 4 && 'bucht'],
  },
  wollgrashof: { art: 'hof', known: (st) => read(st, 'stein') || read(st, 'zelt') || fog(st) >= 2, lines: (st) => [(fog(st) >= 2 || read(st, 'zelt')) && 'marthe', read(st, 'stein') && 'moder'] },
  // Hinter dem Wald: vom Wegweiser, von Yusuf, Juna und Hannes
  birkhagen: {
    art: 'dorf',
    known: (st) => flag(st, 'schildGelesen') || moment(st, 'yusuf') >= 2 || moment(st, 'juna') >= 2,
    lines: (st) => [flag(st, 'schildGelesen') && 'schild', moment(st, 'yusuf') >= 2 && 'yusuf', moment(st, 'juna') >= 2 && 'juna'],
  },
  tannrode: { art: 'dorf', known: (st) => moment(st, 'hannes') >= 2, lines: () => ['hannes'] },
  faehrhaus: { art: 'gasthaus', known: (st) => stage(st, 'rosa') >= 2, lines: () => ['rosa'] },
  // Die sicheren Orte (M32): die Namen aus G1
  sturmhuk: {
    art: 'sicher',
    place: 'leuchtturm',
    // G6: auch, sobald die Lampe in der Frostnacht geblinkt hat (Edda nennt den Namen im Funk)
    known: (st) => safe('leuchtturm')(st) || Boolean(st.edda?.met) || flag(st, 'sturmhukGeblinkt'),
    lines: (st) => [st.edda?.met && 'edda', flag(st, 'sturmhukGeblinkt') && 'blinkt', flag(st, 'sturmhukTag') && 'gruss'],
  },
  eulenbruch: { art: 'sicher', place: 'forsthaus', known: safe('forsthaus'), lines: () => [] },
  sonnenkamp: { art: 'sicher', place: 'farm', known: safe('farm'), lines: () => [] },
  gluehwuermchen: { art: 'sicher', place: 'ferienlager', known: safe('ferienlager'), lines: () => [] },
  // G7: Mikas Heimat – bekannt, sobald jemand dorthin will, und nach einer Ankunft von Anfang an
  aalbek: { art: 'sicher', place: 'hafen', known: (st) => Boolean(st.flags?.ausAalbek) || safe('hafen')(st), lines: (st) => [st.flags?.ausAalbek && 'mika'] },
  hammermuehle: { art: 'sicher', place: 'muehle', known: safe('muehle'), lines: () => [] },
  luzia: { art: 'sicher', place: 'kloster', known: safe('kloster'), lines: () => [] },
  norderholm: { art: 'sicher', place: 'nordinsel', known: safe('nordinsel'), lines: () => [] },
};

/** Reihenfolge im Buch: vom Haus aus nach außen. */
export const PLACE_ORDER = Object.keys(PLACES);

/** Die Orte, die Mika kennt, in der Reihenfolge des Buchs. */
export function placesKnown(st) {
  return PLACE_ORDER.filter((id) => PLACES[id].known(st));
}

/** Schlüssel der Zeilen, die zu einem Ort gerade dazugehören (ohne die Herkunft). */
export function placeLines(st, id) {
  return PLACES[id].lines(st).filter(Boolean);
}
