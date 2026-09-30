// Dialoge als Daten. Eine Zeile: { s: Sprecher-ID, t: Text, antworten?, blick?, karte? }.
// `blick` (nur in der Einleitung, M15) lenkt die Kamera auf einen Ort der Karte,
// `karte` zeigt dazu die Karte der Wege über dem Dialog.
// Eine Antwort: { t: Text, aktion?: Name einer Spielaktion, standard?: true }.
// `standard` markiert die harmlose Antwort, die vorgewählt ist – schnelles
// Durchdrücken löst so nie aus Versehen Schlafen, Ausruhen oder Ausbauen aus.
// Ein Dialog darf eine Funktion sein, die aus dem Spielzustand die Zeilen wählt.

import { TOWERS } from './towers.js';
import { TRADES, ERRANDS } from './survivors.js';
import { WANDERERS, freePlaces } from './wanderers.js';
import { T } from './texts.js';
import { cardsOffered } from './cards.js';
import { fishingOffered } from './fishing.js';
import { stepsLeft } from './arms.js';
import { REPAIR } from './isles.js';
import { bellRings } from './fogIsle.js';

// M30: Wer am Übungsplatz üben kann – eingezogene Menschen (kein Hund), heute noch nicht, nicht ganz geübt
const UEBEN_ORDER = ['hilde', 'juna', 'bert', 'yusuf', ...Object.keys(WANDERERS)];
const personName = (id) => SPRECHER[id]?.name || id;
const restUebungen = (t) => stepsLeft(t);
function uebenKandidaten(state) {
  return UEBEN_ORDER.filter((id) => (state.survivors?.[id]?.stage || 0) >= 3 && state.training?.[id]?.day !== state.time.day && stepsLeft(state.training?.[id]) !== null).slice(0, 6);
}

export const SPRECHER = {
  mika: { name: 'Mika', portrait: 'mika' },
  radio: { name: 'Radio', portrait: 'radio' },
  schild: { name: 'Wegweiser', portrait: null },
  knopf: { name: 'Knopf', portrait: 'knopf' },
  hilde: { name: 'Oma Hilde', portrait: 'hilde' },
  juna: { name: 'Juna', portrait: 'juna' },
  bert: { name: 'Bert', portrait: 'bert' },
  yusuf: { name: 'Dr. Yusuf', portrait: 'yusuf' },
  balduin: { name: 'Balduin', portrait: 'balduin' },
  // M27: die Wanderer
  hannes: { name: 'Hannes', portrait: 'hannes' },
  clara: { name: 'Clara', portrait: 'clara' },
  lotte: { name: 'Lotte', portrait: 'lotte' },
  greta: { name: 'Greta', portrait: 'greta' },
  // M29: die übrigen acht
  fiete: { name: 'Fiete', portrait: 'fiete' },
  ida: { name: 'Ida', portrait: 'ida' },
  rosa: { name: 'Rosa', portrait: 'rosa' },
  anton: { name: 'Anton', portrait: 'anton' },
  emil: { name: 'Emil', portrait: 'emil' },
  frieda: { name: 'Frieda', portrait: 'frieda' },
  mara: { name: 'Mara', portrait: 'mara' },
  paula: { name: 'Paula', portrait: 'paula' },
  edda: { name: 'Edda', portrait: 'edda' }, // N4: nur über Funk, als altes Foto
  eddaHier: { name: 'Edda', portrait: 'eddaHeute' }, // M32: nach dem Herbst zu Hause, silbernes Haar
  // N7: die Insel im Nebel
  marthe: { name: 'Marthe', portrait: 'marthe' },
  pim: { name: 'Pim', portrait: 'pim' },
  lu: { name: 'Lu', portrait: 'lu' },
};

// --- Überlebende (Meilenstein 6) ------------------------------------------------------

const RES_NAMES = { holz: 'Holz', stein: 'Stein', fasern: 'Fasern', stoff: 'Stoff', schrott: 'Schrott', teile: 'Zombieteile', zahnraeder: 'Zahnrad', moderkerne: 'Moderkern' };
const amount = (res) => Object.entries(res).map(([r, n]) => `${n} ${RES_NAMES[r] || r}`).join(', ');

/** Ist ein Schlafplatz frei? (M27: Zelte, Schlafhütte, Dachkammer – umgeworfene zählen nicht) */
function freeTent(state) {
  return freePlaces(state) > 0;
}

/** Antworten für Gäste und Bewohner: einziehen (wenn ein Zelt frei ist), Extras, Tschüss. */
function guestAnswers(state, id, extra = []) {
  const answers = [...extra];
  if (state.survivors?.[id]?.stage === 2 && freeTent(state)) answers.push({ t: 'Das Zelt dort ist für dich.', aktion: 'einziehen' });
  if (cardsOffered(state, id)) answers.push({ t: T.karten.einladen, aktion: 'karten' }); // M28: abends eine Runde
  if (fishingOffered(state, id)) answers.push({ t: T.angeln.einladen, aktion: 'angeln' }); // M33: oder zum Steg
  if (!answers.length) return undefined;
  answers.push({ t: 'Bis später.', standard: true });
  return answers;
}

const todaysTrade = (state) => TRADES[((state.time?.day || 1) - 1) % TRADES.length];

function canTrade(state) {
  const offer = todaysTrade(state);
  if (state.world?.tradeDay === state.time?.day) return false;
  return Object.entries(offer.give).every(([r, n]) => (state.inventory?.[r] || 0) >= n);
}

/** Läuft der Auftrag (1) und kann Mika ihn gleich abgeben? */
const errandOf = (state, id) => state.survivors?.[id]?.errand || 0;
const canHandIn = (state, id) => errandOf(state, id) === 1 && Object.entries(ERRANDS[id].give || {}).every(([r, n]) => (state.inventory?.[r] || 0) >= n);
const handIn = (id) => ({ t: `Hier, bitte! (${amount(ERRANDS[id].give)})`, aktion: 'auftrag' });

function withAnswers(lines, answers) {
  if (!answers) return lines;
  const last = lines[lines.length - 1];
  return [...lines.slice(0, -1), { ...last, antworten: answers }];
}

const pick = (list, n) => list[((n % list.length) + list.length) % list.length];

// --- Wanderer (M27) ------------------------------------------------------------------

/** Wer unter den Bewohnern würde Platz machen? Der Wanderer, der am längsten da ist. */
function wouldLeave(state, guest) {
  const list = Object.keys(WANDERERS).filter((id) => id !== guest && state.survivors?.[id]?.stage === 3);
  list.sort((a, b) => (state.survivors[a].day || 0) - (state.survivors[b].day || 0));
  return list[0] || null;
}

/**
 * Die Entscheidung am Morgen (M27, OFFENE-FRAGEN 163): bleiben (wenn ein Platz
 * frei ist), sonst Platz machen lassen (ein Bewohner zieht aus eigenem Grund
 * weiter), weiterbringen oder – einmal – noch einen Tag. Vorgewählt ist immer
 * das Harmlose: noch einen Tag bzw. »Ich überlege noch«.
 */
function decision(state, id, lines) {
  const w = WANDERERS[id];
  const s = state.survivors?.[id] || {};
  const out = [...lines];
  const answers = [];
  if (freePlaces(state) > 0) answers.push({ t: T.wanderer.bleiben(w.name), aktion: 'bleiben' });
  else {
    out.push({ s: 'mika', t: T.wanderer.vollBemerkung });
    const other = wouldLeave(state, id);
    if (other) answers.push({ t: T.wanderer.platzMachen(WANDERERS[other].name, T.wanderer.zumOrt[WANDERERS[other].place]), aktion: 'platzMachen' });
  }
  answers.push({ t: T.wanderer.weiterbringen(T.wanderer.zumOrt[w.place]), aktion: 'weiterbringen' });
  answers.push(s.extra ? { t: T.wanderer.ueberlegen, standard: true } : { t: T.wanderer.nochEinTagAntwort, aktion: 'nochEinTag', standard: true });
  return withAnswers(out, answers);
}

/** Bewohner (M27): eine Zeile je Tag. Als Gast vor der Entscheidung: noch am Feuer. */
function resident(state, id, lines) {
  // M33: Fiete bringt das Angeln bei (solange Mika keine Angel hat), abends lädt Mika zum Steg ein
  const answers = [];
  if (id === 'fiete' && !state.fishing?.rod) answers.push({ t: T.angeln.lernen, aktion: 'angelnLernen' });
  if (fishingOffered(state, id)) answers.push({ t: T.angeln.einladen, aktion: 'angeln' });
  if (answers.length) answers.push({ t: 'Bis später.', standard: true });
  const line = state.survivors?.[id]?.stage === 2 ? { s: id, t: T.wanderer.wartenZeile } : { s: id, t: pick(lines, (state.time?.day || 1) + id.length) };
  return [answers.length ? { ...line, antworten: answers } : line];
}

/** Uhrzeit in Stunden (0..24) aus dem Spielzustand. */
const hourOf = (state) => (6 + (state.time.minute || 0) / 60) % 24;

/** Bis wann Ausruhen die Uhr vorstellt (Stunden). */
// m16-r1: bis zur Abendtafel (19:30) – dann ruft N die Horde, wenn Mika bereit ist
export const REST_TARGET = { wartenAbend: 19.5, wartenNacht: 20.4 };

/** 18.5 → »18:30« */
const clock = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

/** Antworten zum Ausruhen, passend zur Tageszeit – mit Zielzeit (m3-r2). */
function restAnswers(state) {
  const h = hourOf(state);
  if (h >= 6 && h < 17.5) return [{ t: `Bis zum Abend ausruhen (${clock(REST_TARGET.wartenAbend)})`, aktion: 'wartenAbend' }, { t: 'Weitermachen', standard: true }];
  // Abends nur bis kurz vor der Horde – in die Nacht hinein wird nicht gewartet
  if (h >= 17.5 && h < 20.25) return [{ t: `Warten, bis die Horde kommt (${clock(REST_TARGET.wartenNacht)})`, aktion: 'wartenNacht' }, { t: 'Weitermachen', standard: true }];
  return null;
}

/** Bietet ein Sitzplatz gerade Ausruhen an? */
export const canRest = (state) => Boolean(restAnswers(state));

function withRest(lines, state) {
  const answers = restAnswers(state);
  if (!answers) return lines;
  const last = lines[lines.length - 1];
  return [...lines.slice(0, -1), { ...last, antworten: answers }];
}

/** M32: Weitergezogene, deren erster Brief schon da war (für Stimmen über Funk). */
function weitergezogen(state) {
  return Object.keys(WANDERERS).filter((id) => state.survivors?.[id]?.stage === 4 && state.survivors[id].read);
}

/** M32: Hört man über Junas Funkgerät die anderen? (Juna eingezogen, jemand weitergezogen) */
function stimmenBereit(state) {
  return state.survivors?.juna?.stage === 3 && weitergezogen(state).length > 0;
}

/** N9: Pim wünscht sich einen Drachen (bei Wind begeistert, sonst träumend). */
function kiteWish(state, wind) {
  const name = state.player?.name || 'Mika';
  return [
    { s: 'pim', t: wind ? `${name}! Spürst du den Wind? Bei so einem Wind müsste man einen Drachen steigen lassen!` : `${name}, weißt du, was man im Herbst macht, wenn Wind kommt? Drachen steigen lassen!` },
    { s: 'lu', t: 'Einen mit Gesicht! Mit einem Katzengesicht!' },
    { s: 'pim', t: 'Mama kann Drachen bauen. Sie sagt, ein Drachen ist ein Segel, das sein Boot verloren hat.' },
    { s: 'lu', t: 'Das versteh ich nicht.' },
    { s: 'pim', t: 'Ich auch nicht. Aber sie braucht Stoff fürs Segel, Fasern für die Schnur und zwei gerade Stöcke.' },
    {
      s: 'pim',
      t: 'Zwei Stück Stoff, vier Fasern und zwei Holz. Hast du so was? Bitte!',
      antworten: [
        { t: 'Ich bring euch, was ihr braucht.', standard: true },
        { t: 'Mal sehen, was sich findet.' },
      ],
    },
  ];
}

export const DIALOGE = {
  // --- Balduin, der Händler (Meilenstein 8) ---
  balduinTreffen: [
    { s: 'balduin', t: 'Ahoi! Balduin mein Name. Handel, Wandel, Bootsladung!' },
    { s: 'balduin', t: 'Ich kaufe Zombieteile. Hände, Füße, Ohren – alles, was nachts so abfällt. Ich zahle in Schrott, Holz, Stoff, manchmal Zahnrädern.' },
    { s: 'mika', t: 'Zombieteile? Wofür um alles in der Welt …' },
    { s: 'balduin', t: 'Frag nicht. Wissenschaft! Oder Kunst. Oder Suppe – nein, keine Suppe.' },
    {
      s: 'balduin',
      t: 'Jeden Morgen leg ich hier am Steg an – bis Mittag, oder bis wir fertig sind. Nachts sammelst du, morgens handeln wir. Abgemacht?',
      antworten: [
        { t: 'Zeig mal her!', aktion: 'handeln' },
        { t: 'Später.', standard: true },
      ],
    },
  ],
  // --- Nach dem Herbst (M25): weiterspielen oder eine neue Runde? ---
  nachDemHerbst: [
    { s: 'mika', t: 'Schnee auf dem Steg. Der Moder schläft – zum ersten Mal ist es still im Wald.' },
    { s: 'mika', t: 'Fort ist er nicht. Wenn der Schnee schmilzt, regt er sich wieder – nur nicht mehr so, wie man es kennt.' },
    {
      s: 'mika',
      t: 'Und jetzt?',
      antworten: [
        { t: 'Hierbleiben – die Nächte würfeln neu', aktion: 'weiter', standard: true },
        { t: 'Eine neue Bucht suchen (neue Runde)', aktion: 'neu' },
      ],
    },
  ],
  neueRundeSicher: [
    {
      s: 'mika',
      t: 'Eine neue Bucht, ein neues Wegenetz – und alles von vorn. Dieser Spielstand endet dann. Wirklich?',
      antworten: [
        { t: 'Nein, ich bleibe hier', aktion: 'weiter', standard: true },
        { t: 'Ja, neue Runde', aktion: 'neu' },
      ],
    },
  ],
  // --- Überlebende ---
  knopfTreffen: [
    { s: 'mika', t: 'Na, wer bist du denn? Ein Hund – ganz allein hier draußen?' },
    { s: 'knopf', t: 'Wuff!' },
    {
      s: 'mika',
      t: 'Struppig, dünn und mit einem großen Knopf am Halsband. Dann heißt du wohl Knopf.',
      antworten: [
        { t: 'Komm her, Knopf!', aktion: 'streicheln', standard: true }, // m16-r1: bei einem Hund darf das vorgewählt sein
        { t: 'Bis später.' },
      ],
    },
  ],
  knopf: (state) => [
    {
      s: 'mika',
      t: pick(
        [
          'Knopf wedelt so doll, dass sein ganzes Hinterteil mitwackelt.',
          'Knopf legt mir einen Stock vor die Füße. Später, versprochen.',
          'Knopf schnüffelt Richtung Waldrand. Er passt auf uns auf.',
          (state.world?.furniture || []).includes('koerbchen') ? 'Knopf rollt sich in seinem Körbchen zusammen. Der Herr hat es gut.' : 'Knopf lehnt sich an mein Bein. Guter Hund.',
        ],
        state.time.day
      ),
    },
  ],
  hildeTreffen: [
    { s: 'hilde', t: 'Guten Morgen, Kindchen! Post hab ich keine mehr – aber ein Lastenrad voller Kram.' },
    { s: 'hilde', t: 'Ich fahr die alten Runden ab – nur auf festen Wegen, versteht sich. Wer noch da ist, bekommt, was er braucht, gegen das, was er übrig hat.' },
    { s: 'mika', t: 'Noch jemand hier draußen. Das ist die beste Nachricht seit Wochen.' },
    { s: 'hilde', t: 'Gib mir einen trockenen Schlafplatz, dann bleib ich eine Weile. Ein Zelt tät’s.' },
  ],
  hilde: (state) => {
    const offer = todaysTrade(state);
    const traded = state.world?.tradeDay === state.time.day;
    const lines = [{ s: 'hilde', t: traded ? 'Für heute ist der Handel durch. Morgen hab ich wieder was Schönes.' : `Heute im Angebot: ${amount(offer.get)} für ${amount(offer.give)}.` }];
    if (errandOf(state, 'hilde') === 1 && !canHandIn(state, 'hilde')) lines.push({ s: 'hilde', t: 'Und denk an meine acht Fasern, Kindchen. Die wachsen im hohen Gras.' });
    const extra = !traded && canTrade(state) ? [{ t: 'Tauschen!', aktion: 'tauschen' }] : [];
    if (canHandIn(state, 'hilde')) extra.unshift(handIn('hilde'));
    return withAnswers(lines, guestAnswers(state, 'hilde', extra));
  },
  junaTreffen: [
    { s: 'juna', t: 'Du hast mein Signal gehört? Radio Stillwald – das bin ich! Na ja, ich und dieses Funkgerät.' },
    { s: 'juna', t: 'Der alte Mast am Steg hat früher den Fischern heimgeleuchtet. Wenn wir ihn wieder hochkriegen …' },
    { s: 'juna', t: '… mit Antenne und einem Licht ganz oben, dann sieht man uns über den ganzen See. Alle, die noch unterwegs sind, finden her.' },
    { s: 'mika', t: 'Ein Leuchtfeuer. Ich bin dabei. Was brauchen wir?' },
    { s: 'juna', t: 'Erst mal eine Leiter und eine Plattform. Schrott und Holz. Der Rest steht im Baumenü, Reiter „Leute“.' },
  ],
  juna: (state) => {
    const stage = state.world?.tower || 0;
    const t = [
      'Leiter und Plattform zuerst. Zwanzig Schrott, zwölf Holz – dann kommen wir hoch.',
      'Jetzt die Antenne: drei Zahnräder, Stoff für die Kabel und etwas Schrott.',
      'Fürs Leuchtfeuer brauchen wir einen Moderkern. Die Anführer der Horde tragen so was mit sich rum …',
      'Es brennt jeden Abend. Und manchmal antwortet jemand am Funk.',
    ][stage];
    return withAnswers([{ s: 'juna', t }], guestAnswers(state, 'juna'));
  },
  bertTreffen: [
    { s: 'bert', t: 'Hmpf. Die Barrikade da? Schief. Die Türme? Wackeln.' },
    { s: 'bert', t: 'Dreißig Jahre Baumarkt. Schrauben, Kleber, Werkzeug – ich weiß, wie man was flickt.' },
    { s: 'bert', t: 'Hast du ’nen Schlafplatz, bleib ich. Dann flick ich nachts deine Türme, und Reparieren kostet dich die Hälfte.' },
  ],
  bert: (state) =>
    withAnswers(
      [
        {
          s: 'bert',
          t:
            state.survivors?.bert?.stage === 3
              ? errandOf(state, 'bert') === 1
                ? 'Ein Laternenpfahl neben meinem Zelt. Vorher red ich nicht über Zahnräder. Hmpf.'
                : pick(
                    [
                      'Die Türme stehen wieder gerade. Na ja, fast.',
                      'Wer hat die Werkbank so eingeräumt? Egal. Ich räum um.',
                      'Hmpf. Gute Arbeit, die Barrikaden. Hab nur zwei Nägel nachgeschlagen.',
                      // M15: Vorgeschichte
                      'Die Holzfäller haben ihre Wege geschottert, damit die Laster durchkommen. Heute ist das der einzige feste Boden im Wald. Hmpf. Ironie.',
                    ],
                    state.time.day
                  )
              : 'Schlafplatz gefunden? Nein? Dann schlaf ich eben wieder am Feuer. Hmpf.',
        },
      ],
      guestAnswers(state, 'bert')
    ),
  yusufTreffen: [
    { s: 'yusuf', t: 'Keine Sorge, ich bin Arzt. Na ja – Tierarzt. Aber ein Mensch ist auch nur ein großes, wehleidiges Tier.' },
    { s: 'yusuf', t: 'Ich hab Kräuter dabei. Mit einem Schlafplatz bleibe ich, koche jeden Morgen Tee und flicke dich zusammen, wenn es nachts brenzlig wird.' },
  ],
  yusuf: (state) =>
    withAnswers(
      [
        {
          s: 'yusuf',
          t:
            state.survivors?.yusuf?.stage === 3
              ? errandOf(state, 'yusuf') === 1
                ? 'Hast du an die Kamille gedacht? Sechs Fasern aus dem hohen Gras und ein Stück Stoff.'
                : pick(
                    [
                      'Tee? Tee.',
                      'Kamille, Minze und ein Geheimnis. Mehr verrate ich nicht.',
                      'Du siehst müde aus. Das ist normal. Alle hier sehen müde aus.',
                      // M15: Vorgeschichte
                      'Der Moder ist ein Pilz. Dunkel, kühl und feucht mag er es – Licht und Wärme machen ihn träge. Und die Schlurfer mit ihm.',
                      'Die Moderkerne der Anführer … Wenn ich nur ein Mikroskop hätte.',
                    ],
                    state.time.day
                  )
              : 'Ein Zelt wäre schön. Mein Rücken ist nicht mehr der jüngste.',
        },
      ],
      guestAnswers(state, 'yusuf', canHandIn(state, 'yusuf') ? [handIn('yusuf')] : [])
    ),
  // M28: Kartenabend – Bert erklärt das Grundspiel, Hilde die Farbpaare, Balduin den Griff ins Dunkle
  kartenRegeln: [
    { s: 'bert', t: 'Setz dich. Das Spiel heißt „Letzte Runde“. Hab ich dreißig Jahre lang in der Mittagspause gespielt.' },
    { s: 'bert', t: 'Drei Plätze: Laterne, Kessel, Kürbis. Fünf Karten auf der Hand. Jede Runde legst du eine auf deine Seite – höchstens drei pro Platz.' },
    { s: 'bert', t: 'Eine davon darf verdeckt liegen. Wer näher an 15 kommt, kriegt den Platz. Drüber, und die Kastanie ist geplatzt. Genau 15 ist ein Volltreffer.' },
    { s: 'bert', t: 'Einmal darfst du klopfen: Dann hab ich noch einen Zug, und wir decken auf. Zwei Plätze gewinnen. Hmpf. Fertig.' },
    { s: 'mika', t: 'Und wer verliert?' },
    { s: 'bert', t: 'Spült ab. Wie immer.' },
  ],
  kartenPaare: [
    { s: 'hilde', t: 'Darf ich, Kindchen? Ich zeig dir, was mein Mann mir beigebracht hat.' },
    { s: 'hilde', t: 'Zwei offene Karten derselben Farbe am selben Platz – das ist ein Farbpaar. Jedes Paar tut einmal etwas.' },
    { s: 'hilde', t: 'Feuer macht Glut: 14 oder 16 zählen dort als 15. Blatt bringt einen Laubwirbel: zwei ziehen, zwei abwerfen.' },
    { s: 'hilde', t: 'Der Mond deckt eine verdeckte Karte drüben auf, und ein Gleichstand dort gehört dir. Die Krähe nimmt eine offene Karte drüben fort.' },
    { s: 'hilde', t: 'Verdeckte Karten bilden keine Paare. Merk dir das – dann merkt sich das Spiel dich.' },
  ],
  kartenDunkel: [
    { s: 'balduin', t: 'Karten? Hoho! Dann zeig ich dir den Griff ins Dunkle, wie wir ihn auf See spielen.' },
    { s: 'balduin', t: 'Statt einer Handkarte nimmst du die oberste vom Stapel und legst sie ungesehen verdeckt hin. Keiner weiß, was es ist – du auch nicht.' },
    { s: 'balduin', t: 'Nachziehen gibt’s dann nicht, und ein Volltreffer zählt damit nicht. Wagnis, mein Kind. Das Salz im Spiel.' },
  ],
  hildeAuftrag: [
    { s: 'hilde', t: 'Danke, Kindchen. Und weil du nachts so frierst: Bring mir acht Fasern, dann strick ich dir einen Schal.' },
    { s: 'mika', t: 'Fasern gibt es im hohen Gras. Mach ich!' },
  ],
  bertAuftrag: [
    { s: 'bert', t: 'Hmpf. Danke. Aber nachts seh ich da drin meine eigenen Schrauben nicht.' },
    { s: 'bert', t: 'Stell mir einen Laternenpfahl neben das Zelt. Dafür hab ich noch ein paar Zahnräder übrig.' },
  ],
  yusufAuftrag: [
    { s: 'yusuf', t: 'Wunderbar. Eine Bitte hätte ich: Für meinen Tee fehlt Kamille.' },
    { s: 'yusuf', t: 'Sie wächst im hohen Gras. Sechs Fasern und ein Stück Stoff als Beutel – dann wird der Tee richtig gut.' },
  ],
  // --- Die Wanderer (M27): ankommen, am Feuer übernachten, am Morgen die Entscheidung ---
  hannesTreffen: [
    { s: 'hannes', t: 'Moin. Hannes, Zimmermann auf Wanderschaft. Drei Jahre und einen Tag – das Jahr mit dem Moder zählt doppelt, finde ich.' },
    { s: 'hannes', t: '(klopft an den Torpfosten) Hm. Fichte. Ordentlich gesetzt. Nur der hier wackelt ein bisschen.' },
    { s: 'mika', t: 'Bleib heute Nacht am Feuer. Morgen sehen wir weiter.' },
    { s: 'hannes', t: 'Mehr verlang ich nicht. Ein Feuer und ein Dach aus Sternen.' },
  ],
  hannesEntscheidung: (state) =>
    decision(state, 'hannes', [
      { s: 'hannes', t: 'Laute Nacht. Aber eure Barrikaden haben gehalten – ich hab sie ächzen hören, und gehalten haben sie trotzdem.' },
      { s: 'hannes', t: 'Wenn ihr mich wollt, bleib ich. Nachts flick ich, was die Horde ankratzt. Wenn nicht, ist’s auch recht: Im Forsthaus am Nordufer sucht man immer eine Hand.' },
    ]),
  hannes: (state) =>
    resident(state, 'hannes', [
      'Die Barrikade links hat geknarzt. Jetzt nicht mehr. Gern geschehen.',
      '(klopft auf den Tisch) Hm. Hohl. Wusst ich’s doch.',
      'Mein Meister hat gesagt: Zweimal messen, einmal sägen. Die Horde misst gar nicht. Deshalb gewinnen wir.',
      'Das ist mein Hobel. Älter als ich. Den geb ich nicht her.',
      'Auf der Walz darf man seinem Zuhause nicht zu nahe kommen. Meins gibt’s nicht mehr. Also ist das hier jetzt … nah genug.',
    ]),
  // --- Clara ---
  claraTreffen: [
    { s: 'clara', t: 'Hallo! Ist das da ein Bolzenwerfer? Selbst gebaut? Wer hat die Feder so gespannt – großartig. Und völlig falsch.' },
    { s: 'clara', t: 'Clara, Mechanikerin. Ich laufe am Strand entlang, seit der Moder das Dach meiner Werkstatt gefressen hat.' },
    { s: 'mika', t: 'Du kannst heute Nacht am Feuer schlafen.' },
    { s: 'clara', t: 'Super. Darf ich vorher kurz mit deinen Türmen reden? Die sehen einsam aus.' },
  ],
  claraEntscheidung: (state) =>
    decision(state, 'clara', [
      { s: 'clara', t: 'Ich hab die halbe Nacht den Türmen zugehört. Einer quietscht in C-Dur. Das lässt sich richten.' },
      { s: 'clara', t: 'Ich würde bleiben – dann wird Flicken billiger, und beim Basteln spar ich dir Teile. Sonst geh ich zum alten Leuchtturm. Da soll eine Werkstatt sein.' },
    ]),
  clara: (state) =>
    resident(state, 'clara', [
      'Ich hab dem Katapult einen Spitznamen gegeben. Er mag ihn nicht. Er gewöhnt sich dran.',
      'Schraubenschlüssel sind wie Freunde: Man braucht immer den, der gerade woanders liegt.',
      'Psst. Ich rede gerade mit dem Laternenturm. Er ist schüchtern.',
      'Bring mir Zahnräder, dann bau ich dir … irgendwas. Überraschung.',
      'In meiner Werkstatt hing ein Schild: „Hier wird nichts weggeworfen.“ Das Schild hab ich noch.',
    ]),
  // --- Lotte ---
  lotteTreffen: [
    { s: 'lotte', t: 'Oh! Licht! Ihr habt Licht! Entschuldigung – ich bin Lotte. Ich mache Laternen. Also, früher. Jetzt trag ich eine.' },
    { s: 'lotte', t: 'Licht macht den Moder müde, wusstest du das? Man sieht es an den Pilzen. Sie ducken sich.' },
    { s: 'mika', t: 'Bleib heute Nacht am Feuer. Da ist es hell.' },
    { s: 'lotte', t: 'Am Feuer. Das ist die schönste Laterne von allen.' },
  ],
  lotteEntscheidung: (state) =>
    decision(state, 'lotte', [
      { s: 'lotte', t: 'Guten Morgen! Ich hab meinen zweiten Handschuh verloren. Und dafür einen Stern gefunden. Na ja, einen Knopf. Er glänzt.' },
      { s: 'lotte', t: 'Wenn ich bleibe, bastle ich an euren Lampen – dann leuchten sie weiter. Sonst gehe ich zum Ferienlager am See. Da sind Kinder, und Kinder brauchen Laternen.' },
    ]),
  lotte: (state) =>
    resident(state, 'lotte', [
      'Hat jemand meine Schere gesehen? Und den Kleber? Und … ach, hier. Alles in meiner Tasche.',
      'Jede Lichtinsel hier ist ein Stück größer geworden. Das merkt keiner. Die Schlurfer schon.',
      'Die Laterne an meinem Gürtel hat meine Oma gefaltet. Papier, Draht und ganz viel Geduld.',
      'Weißt du, was das Schönste an Laternen ist? Man trägt das Licht zu jemandem hin.',
      'Heute hab ich nur einmal was verloren. Rekord!',
    ]),
  // --- Greta ---
  gretaTreffen: [
    { s: 'greta', t: 'Greta. Jägerin.' },
    { s: 'mika', t: '… und?' },
    { s: 'greta', t: 'Spuren gelesen. Eure Wege. Viele Schlurfer. Gute Fallen. Falsch gestellt.' },
    { s: 'mika', t: 'Du kannst heute Nacht am Feuer bleiben.' },
    { s: 'greta', t: 'Danke.' },
  ],
  gretaEntscheidung: (state) =>
    decision(state, 'greta', [
      { s: 'greta', t: 'Unruhige Nacht. Zwei Fallen ausgelöst. Gut so.' },
      { s: 'greta', t: 'Ich bleibe, wenn ihr wollt. Stell die Fallen jeden Morgen neu. Sonst: Nordinsel. Mein Bruder.' },
    ]),
  greta: (state) =>
    resident(state, 'greta', [
      'Fallen stehen.',
      'Wind dreht. Nacht wird kalt.',
      'Schlurfer schleifen den linken Fuß. Immer den linken. Merkwürdig.',
      'Die Pfeife? Von meinem Mann. Rauch nicht. Halt sie nur.',
      'Du redest viel. Ist gut. Einer muss.',
    ]),
  // --- M29: Fiete, der alte Fischer ---
  fieteTreffen: [
    { s: 'fiete', t: 'Moin. Fiete. Hab am Strand gesessen und auf ein Boot gewartet. Kam keins. Kam dein Feuer.' },
    { s: 'fiete', t: 'Früher bin ich jeden Morgen rausgefahren. Hab mal einen Hecht gefangen – so lang wie ein Ruder.' },
    { s: 'mika', t: 'Bleib heute Nacht am Feuer, Fiete.' },
    { s: 'fiete', t: 'Gern. Spielt hier jemand Karten? Ich frag nur. Ich bin ganz schlecht.' },
  ],
  fieteEntscheidung: (state) =>
    decision(state, 'fiete', [
      { s: 'fiete', t: 'Gut geschlafen. Euer Feuer knackt wie der Ofen auf meinem alten Kutter.' },
      { s: 'fiete', t: 'Wenn ich bleibe, rede ich mit Balduin – mit mir handelt er anständig, wir kennen uns von früher. Sonst geh ich zum alten Hafen. Da liegen noch Boote.' },
    ]),
  fiete: (state) =>
    resident(state, 'fiete', [
      'Der Hecht? War so lang wie zwei Ruder. Mindestens.',
      'Balduin und ich haben früher um Heringe gefeilscht. Er hat immer verloren. Er weiß es nur nicht.',
      'Karten heute Abend? Ich bin ganz schlecht, ehrlich.',
      'Der See hat sich verändert. Die Enten nicht. Frech wie immer.',
      'Knoten halten, wenn man sie richtig macht. Freundschaften auch.',
    ]),
  // N6: Das Ruderboot am Steg – wohin?
  // N6: Das Boot leckt noch – abdichten (vorgewählt ist »Später«)
  bootFlicken: [
    {
      s: 'mika',
      t: T.inseln.leck,
      antworten: [
        { t: T.inseln.abdichten(REPAIR), aktion: 'abdichten' },
        { t: T.inseln.spaeter, standard: true },
      ],
    },
  ],
  bootFahrt: (state) => [
    {
      s: 'mika',
      t: bellRings(state) ? T.nebel.frage : T.inseln.frage,
      antworten: [
        ...(bellRings(state) ? [{ t: T.nebel.derGlockeNach, aktion: 'nebel' }] : []), // N7: solange die Glocke läutet
        ...['nord', 'mitte', 'sued'].map((id) => ({ t: (state.isles?.visited || []).includes(id) ? T.inseln.namenBekannt[id] : T.inseln.namen[id], aktion: `insel:${id}` })),
        { t: T.inseln.bleiben, standard: true },
      ],
    },
  ],
  // --- N7: Die Insel im Nebel -------------------------------------------------------
  // Erste Begegnung: Marthe kommt zum Anleger, die Kinder hinterher
  martheTreffen: (state) => {
    const cat = Boolean(state.isles?.cat);
    return [
      { s: 'marthe', t: 'Halt! Wer … ach. Du bist von der Bucht, oder? Die mit dem Feuer jede Nacht.' },
      { s: 'mika', t: `Ich bin ${state.player?.name || 'Mika'}. Ich hab eure Glocke gehört. Und Edda hat von euch geschrieben – in ihrem Funkbuch.` },
      { s: 'marthe', t: 'Edda! Die Frau vom Funk. Jeden Morgen hat sie uns gesagt, dass wir durchhalten sollen. Dann kam nichts mehr.' },
      { s: 'mika', t: 'Sie funkt noch. Mit mir.' },
      { s: 'marthe', t: 'Dann lebt sie. Gut. … Gut.' },
      { s: 'marthe', t: 'Ich bin Marthe. Ich hab früher Boote gebaut, drüben am alten Hof. Das sind Pim und Lu. Pim, sag Hallo. Lu – nicht mit Äpfeln werfen.' },
      { s: 'pim', t: 'Hast du ein Boot? Ein echtes? Mit Riemen und allem?' },
      { s: 'lu', t: cat ? 'Gibt es bei euch eine Katze?' : 'Gibt es bei euch Tiere?' },
      { s: 'mika', t: cat ? 'Eine rote. Sie heißt Mieze.' : 'Einen Hund. Er heißt Knopf, und er bellt die Krähen an.' },
      { s: 'lu', t: cat ? 'MIEZE!' : 'Knopf! Das ist ein guter Name. Für einen Hund.' },
      { s: 'marthe', t: 'Unser Kahn leckt. Mit Nägeln und ein bisschen Zucker krieg ich ihn dicht – Zucker und Harz, das ist der beste Leim, den ich kenne.' },
      { s: 'marthe', t: 'Und die Kinder hatten seit Wochen nichts Süßes. Aber sag ihnen nicht, dass ich das gesagt hab.' },
      {
        s: 'marthe',
        t: 'Bringst du uns beides? Dann kommen wir rüber. Zu euch.',
        antworten: [
          { t: 'Ich bringe Nägel und Zucker.', standard: true },
          { t: 'Kommt doch gleich mit!', aktion: 'gleich' },
        ],
      },
    ];
  },
  martheGleich: [
    { s: 'marthe', t: 'Zu viert in deiner Nussschale? Bei dem Nebel? Nein, nein.' },
    { s: 'marthe', t: 'Wir kommen mit dem Kahn. Wenn er dicht ist. Nägel und Zucker – eine Handvoll von jedem reicht.' },
  ],
  // Solange noch etwas fehlt
  martheWarten: (state) => {
    const inv = state.inventory || {};
    const fehlt = [!(inv.naegel >= 1) && 'Nägel', !(inv.zucker >= 1) && 'Zucker'].filter(Boolean).join(' und ');
    return [
      pick(
        [
          { s: 'marthe', t: `Noch fehlen ${fehlt}. Nägel schmiedet man aus Schrott – an deiner Werkbank geht das bestimmt.` },
          { s: 'marthe', t: `${fehlt}, dann ist der Kahn dicht. Zucker hat vielleicht euer Händler. Händler haben immer Zucker.` },
          { s: 'marthe', t: 'Die Kinder fragen jeden Morgen, ob heute der Tag ist. Ich sag: bald.' },
        ],
        state.time.day
      ),
    ];
  },
  // Nägel und Zucker sind da: Marthe flickt den Kahn
  martheFlicken: [
    { s: 'mika', t: 'Nägel. Und eine Dose Zucker.' },
    { s: 'marthe', t: 'Gib her. … So. Das Brett hier, drei Nägel, und die Fuge mit Harz und Zucker. Riecht nach Karamell, oder?' },
    { s: 'lu', t: 'Darf ich den Rest?' },
    { s: 'marthe', t: 'Einen Löffel. Einen, Lu!' },
    { s: 'marthe', t: 'Morgen früh sind wir bei euch. Setzt schon mal Wasser auf.' },
  ],
  // Der Kahn ist dicht – morgen kommen sie
  martheBald: [
    { s: 'marthe', t: 'Morgen früh, mit dem ersten Licht. Ich will den Leim noch eine Nacht trocknen lassen.' },
  ],
  pimInsel: (state) => [
    pick(
      [
        { s: 'pim', t: 'Ich hab einen Hut aus Zeitung. Mama sagt, Kapitäne tragen so was. Glaub ich nicht. Aber er ist gut.' },
        { s: 'pim', t: 'Die Glocke hab ich geläutet! Jeden Morgen. Man muss zweimal ziehen. Zweimal!' },
        { s: 'pim', t: 'Nachts sehen wir euer Feuer. Lu glaubt, da wohnen Riesen. Ich weiß, dass da Leute wohnen. Sind da Riesen?' },
      ],
      state.time.day
    ),
  ],
  luInsel: (state) => [
    pick(
      [
        { s: 'lu', t: 'Willst du einen Apfel? Der ist nur ein bisschen angebissen.' },
        { s: 'lu', t: 'Ich hab nicht mit Äpfeln geworfen. Ich hab sie nur ganz schnell getragen.' },
        { s: 'lu', t: 'Wenn wir bei euch wohnen – darf ich dann den Hund streicheln? Und die Katze? Und dich?' },
      ],
      state.time.day
    ),
  ],
  // Hilde gibt Zucker für die Kinder
  hildeZucker: [
    { s: 'mika', t: 'Hilde, hast du Zucker? Auf der Insel im Nebel sind Kinder. Und ein Kahn, der leckt.' },
    { s: 'hilde', t: 'Zucker? Für Kinder? Da, nimm die ganze Dose. Ich hab sie für schlechte Tage aufgehoben.' },
    { s: 'hilde', t: 'Und sag der Mutter, sie soll mit dem Kahn vorsichtig sein. Ich hab schon genug Leute aus dem Wasser gezogen. Im Kopf, meine ich.' },
  ],
  // In der Bucht: Marthe am Steg, die Kinder im Hof
  martheDa: (state) => [
    pick(
      [
        { s: 'marthe', t: 'Die Reuse ist aus Weide. Hab ich auf der Insel geflochten, als die Kinder schliefen. Morgens liegt was drin – du darfst leeren.' },
        { s: 'marthe', t: 'Dein Ruderboot hat eine lockere Dolle. Ich mach das, wenn du nicht hinsiehst.' },
        { s: 'marthe', t: 'Ich hab Edda gestern über Funk gehabt. Sie hat geweint. Ich auch. Wir haben dann über Boote geredet.' },
        { s: 'marthe', t: 'Pim will Bootsbauer werden. Lu will Katze werden. Ich sag beiden: Übt fleißig.' },
        { s: 'marthe', t: 'Nachts schlafen wir im Kahn, unter der Plane. Da hat jeder seinen Platz. Mach dir keine Sorgen.' },
        { s: 'marthe', t: 'Auf der Insel war es still. Hier ist es laut. Das ist gut – laut heißt: Da sind Leute.' },
        ...(state.isles?.fog?.kite?.stage >= 3 ? [{ s: 'marthe', t: 'Ein Drachen ist ein Segel, das sein Boot verloren hat. Die zwei halten ihn fest, als hinge die ganze Insel dran.' }] : []),
      ],
      state.time.day
    ),
  ],
  // N8: Marthe gibt Mika die letzte Seite aus Eddas Funkbuch (beim ersten Gespräch in der Bucht)
  martheSeite: [
    { s: 'marthe', t: 'Warte, bevor ich es vergesse.' },
    { s: 'marthe', t: 'Das hat Edda mir gegeben, an dem Tag, als ihr Funk verstummte. Eine Seite aus ihrem Funkbuch. Sie hat gesagt: »Gib sie jemandem, der das Feuer anmacht.«' },
    { s: 'mika', t: 'Jemandem, der das Feuer anmacht?' },
    { s: 'marthe', t: 'Na, dir. Lies.' },
  ],
  pimDa: (state) => [
    pick(
      [
        { s: 'pim', t: 'Fangen! Du bist! … Du musst jetzt rennen. Warum rennst du nicht?' },
        { s: 'pim', t: 'Ich hab den Hund gesehen! Er hat mich abgeschleckt. Am Ohr!' },
        { s: 'pim', t: 'Wenn ich groß bin, bau ich ein Boot mit Segel. Dann fahren wir alle zur Insel und pflücken Äpfel.' },
        { s: 'pim', t: 'Zählst du die Türme? Ich hab bis vierzehn gezählt. Dann kam ein Schmetterling.' },
      ],
      state.time.day
    ),
  ],
  luDa: (state) => [
    pick(
      [
        { s: 'lu', t: state.isles?.cat ? 'Mieze hat mich angeguckt. Ganz lange. Ich glaub, wir sind jetzt Freundinnen.' : 'Knopf mag mich. Er hat mir einen Stock gebracht. Einen nassen.' },
        { s: 'lu', t: 'Ich hab dir einen Apfel aufgehoben. Den mit dem Wurm hab ich schon gegessen.' },
        { s: 'lu', t: 'Wohnen hier Riesen? Pim sagt nein. Aber das Feuer ist so groß.' },
        { s: 'lu', t: 'Mama sagt, wir sind jetzt zu Hause. Ist das hier zu Hause?' },
      ],
      state.time.day
    ),
  ],
  // --- N9: Pims Drachen ---
  // Der Wunsch: an einem Windtag (oder ein paar Tage nach der Ankunft in der Bucht)
  pimDrachen: (state) => kiteWish(state, true),
  pimDrachenStill: (state) => kiteWish(state, false),
  // Es fehlt noch etwas
  pimDrachenWarten: (state) => {
    const inv = state.inventory || {};
    const fehlt = [!(inv.stoff >= 2) && 'Stoff', !(inv.fasern >= 4) && 'Fasern', !(inv.holz >= 2) && 'Holz'].filter(Boolean);
    const liste = fehlt.length > 1 ? `${fehlt.slice(0, -1).join(', ')} und ${fehlt[fehlt.length - 1]}` : fehlt[0] || 'nichts';
    return [
      pick(
        [
          { s: 'pim', t: `Mama sagt, es fehlen noch ${liste}. Stoff gibt es in alten Zelten, sagt sie. Und die Schnur dreht sie aus Fasern.` },
          { s: 'lu', t: `Pim sagt, uns fehlen ${liste}. Ich hab einen Stock gefunden! Der ist aber krumm.` },
          { s: 'pim', t: `Noch ${liste}. Der Wind wartet bestimmt auf uns. Oder? Wartet Wind?` },
        ],
        state.time.day
      ),
    ];
  },
  // Mika bringt alles – Marthe baut ihn über Nacht
  pimDrachenGeben: (state) => [
    { s: 'mika', t: 'Hier: zwei Stück Stoff, Fasern für die Schnur und zwei gerade Stöcke.' },
    { s: 'pim', t: 'MAMA! MAMA! Wir kriegen einen Drachen!' },
    { s: 'marthe', t: 'Ich hab’s gehört. Die halbe Bucht hat’s gehört.' },
    { s: 'marthe', t: 'Heute Nacht, wenn die zwei schlafen. Morgen fliegt er – wenn der Wind mitspielt.' },
    { s: 'lu', t: state.isles?.cat ? 'Ich mal das Gesicht! Ich mal Mieze!' : 'Ich mal das Gesicht! Eine Katze! Eine rote!' },
  ],
  pimDrachenMorgen: [{ s: 'pim', t: 'Mama baut heute Nacht! Ich darf die Stöcke halten. Und morgen die Schnur!' }],
  // M33: Fiete bringt Mika das Angeln bei
  fieteAngeln: [
    { s: 'fiete', t: 'Angeln? Na endlich fragt mal einer! Hier – meine zweite. Die erste geb ich nicht her.' },
    { s: 'fiete', t: 'Abends an die Nordkante vom Steg. E halten, dann loslassen – je länger du hältst, desto weiter fliegt sie.' },
    { s: 'fiete', t: 'Zuckt die Pose nur, lass sie. Das ist ein Neugieriger. Taucht sie ganz ab: sofort anschlagen!' },
    { s: 'fiete', t: 'Und dann nicht zerren. Mit E den Kescher unter dem Fisch halten, bis er müde ist. Fische werden müde. Ich auch.' },
    { s: 'mika', t: 'Und was mache ich mit den Fischen?' },
    { s: 'fiete', t: 'Balduin nimmt sie. Er tut so, als ob nicht. Aber er nimmt sie.' },
  ],
  // --- Ida, die Försterin ---
  idaTreffen: [
    { s: 'ida', t: 'Hallo. Ida. Ich war Försterin, drüben im Revier am Nordufer.' },
    { s: 'ida', t: 'Der Moder frisst den Waldboden. Aber die alten Bäume stehen noch. Die sind zäher als wir.' },
    { s: 'mika', t: 'Bleib heute Nacht am Feuer, Ida.' },
    { s: 'ida', t: 'Danke. (legt die Hand an einen Stamm) Ist doch in Ordnung, Gustav, oder?' },
    { s: 'mika', t: '… Gustav?' },
    { s: 'ida', t: 'Die Buche. Sie heißt Gustav.' },
  ],
  idaEntscheidung: (state) =>
    decision(state, 'ida', [
      { s: 'ida', t: 'Gustav hat die Nacht gut überstanden. Ich auch.' },
      { s: 'ida', t: 'Wenn ich bleibe, pflege ich eure Bäume – dann wachsen sie schneller nach, wenn du fällst. Sonst geh ich zum Forsthaus. Da braucht man mich auch.' },
    ]),
  ida: (state) =>
    resident(state, 'ida', [
      'Die Eiche am Weg heißt Hedwig. Sie mag keinen Wind.',
      'Du darfst ruhig Bäume fällen. Ich pflanze nach. Das ist ein Tausch.',
      'Im Wald war es früher nie still. Hier bei euch hör ich es wieder – das Knacken, das Rascheln.',
      'Der Moder mag keine Wurzeln. Wurzeln halten fest. Wie wir.',
      'Gustav lässt grüßen.',
    ]),
  // --- Rosa, die Köchin ---
  rosaTreffen: [
    { s: 'rosa', t: 'Hallo! Oh, ein Feuer! Wer kocht hier? Du? Lass mal riechen. (schnuppert) Hm. Fehlt Salz.' },
    { s: 'mika', t: 'Ich hab noch gar nichts gekocht.' },
    { s: 'rosa', t: 'Eben. Rosa, Köchin. Ich hatte ein Gasthaus am Südufer, bis der Moder die Speisekammer gefressen hat.' },
    { s: 'mika', t: 'Bleib heute Nacht am Feuer.' },
    { s: 'rosa', t: 'Gern – und morgen früh gibt’s was Warmes. Keine Widerrede.' },
  ],
  rosaEntscheidung: (state) =>
    decision(state, 'rosa', [
      { s: 'rosa', t: 'Guten Morgen! Ich hab schon Tee gemacht. Und Brei. Und mir Sorgen, weil ihr so wenig esst.' },
      { s: 'rosa', t: 'Wenn ich bleibe, wird eure Suppe eine richtige Suppe – die gibt Kraft für die ganze Nacht. Sonst gehe ich zur Alten Farm. Da gibt es Hühner.' },
    ]),
  rosa: (state) =>
    resident(state, 'rosa', [
      'Probier mal. (reicht einen Löffel) … Fehlt Salz, oder?',
      'Wer hungrig kämpft, kämpft schlecht. Das ist Wissenschaft.',
      'Bert isst alles. Das ist schön und gleichzeitig beleidigend.',
      'Kürbis geht für alles: Suppe, Kuchen, Brot. Nur nicht für Kaffee. Hab ich probiert.',
      'In meinem Gasthaus stand auf jedem Tisch eine Kerze. Hier ist das Feuer die Kerze.',
    ]),
  // --- Anton, der Musiker ---
  antonTreffen: [
    { s: 'anton', t: 'Guten Abend! Anton, Musiker. Na ja, fahrender Musiker. Na ja, gehender.' },
    { s: 'anton', t: '(zieht die Quetschkommode auf) Ein Feuer, ein See, eine Bucht voller Barrikaden … Das wird ein Lied.' },
    { s: 'mika', t: 'Bleib heute Nacht am Feuer, Anton.' },
    { s: 'anton', t: 'Mit Vergnügen. Ich spiel auch ganz leise. Versprochen.' },
  ],
  antonEntscheidung: (state) =>
    decision(state, 'anton', [
      { s: 'anton', t: 'Guten Morgen! Ich hab die ganze Nacht an einer Strophe gefeilt. Sie reimt sich auf „Barrikade“.' },
      { s: 'anton', t: 'Wenn ich bleibe, spiele ich abends am Feuer – dann schlaft ihr alle gemütlicher. Sonst ziehe ich zum Ferienlager. Kinder sind ein dankbares Publikum.' },
    ]),
  anton: (state) =>
    resident(state, 'anton', [
      'Die Schlurfer schlurfen im Dreivierteltakt. Hast du das gemerkt? Walzer!',
      'Bert singt mit, wenn er denkt, dass keiner zuhört. Bass. Gar nicht schlecht.',
      'Ein Lied über Knopf? In Arbeit. Bisher besteht es nur aus Bellen.',
      'Die Quetschkommode hat meinem Großvater gehört. Sie hat mehr Hochzeiten gesehen als ich.',
      'Musik vertreibt keine Schlurfer. Aber die Angst. Das ist fast dasselbe.',
    ]),
  // --- Emil, der Gärtner ---
  emilTreffen: [
    { s: 'emil', t: 'Guten Tag. Emil. Gärtner. Ich bin … ganz … langsam hergekommen.' },
    { s: 'emil', t: 'Die Schlurfer sind schneller als ich. Aber ich hab Geduld. Die haben keine.' },
    { s: 'mika', t: 'Bleib heute Nacht am Feuer, Emil.' },
    { s: 'emil', t: 'Gern. Darf ich mir morgen eure Beete ansehen? Ich sehe da … Möglichkeiten.' },
  ],
  emilEntscheidung: (state) =>
    decision(state, 'emil', [
      { s: 'emil', t: 'Morgen. Ich hab mir den Boden angesehen. Er ist gut. Er weiß es nur noch nicht.' },
      { s: 'emil', t: 'Wenn ich bleibe, tragen eure Beete mehr, und für Dr. Yusufs Tee zieh ich Kräuter. Sonst geh ich zur Alten Farm – deren Garten braucht Hilfe.' },
    ]),
  emil: (state) =>
    resident(state, 'emil', [
      'Kompost ist das Geheimnis. Alles wird wieder Erde, und aus Erde wird alles.',
      'Ein Kürbis braucht vier Monate. Ich hab Zeit.',
      'Die Ringelblumen am Beet? Hab ich gesetzt. Nur für die Augen.',
      'Rosa sagt, meinen Kräutern fehlt Salz. Kräuter brauchen kein Salz.',
      'Der Moder und ich wollen beide in die Erde. Nur frag ich vorher.',
    ]),
  // --- Frieda, die Schmiedin ---
  friedaTreffen: [
    { s: 'frieda', t: 'HALLO! Oh. Zu laut? Tut mir leid. Schmiede. Da wird man ein bisschen taub.' },
    { s: 'frieda', t: 'Frieda. Ich hatte eine Schmiede an der Wassermühle, bis der Moder das Wasserrad gefressen hat.' },
    { s: 'frieda', t: '(klopft an eine Barrikade) Holz. Hm. Das kann ich besser.' },
    { s: 'mika', t: 'Bleib heute Nacht am Feuer.' },
    { s: 'frieda', t: 'Gern. Ich schlafe wie ein Amboss.' },
  ],
  friedaEntscheidung: (state) =>
    decision(state, 'frieda', [
      { s: 'frieda', t: 'MORGEN! Oh – Morgen. Ich hab von Eisen geträumt.' },
      { s: 'frieda', t: 'Wenn ich bleibe, schmiede ich eure Metallbarrikaden – mit halb so viel Schrott. Sonst geh ich zurück zur Wassermühle. Vielleicht dreht sich das Rad wieder, wenn einer hilft.' },
    ]),
  frieda: (state) =>
    resident(state, 'frieda', [
      'Das richte ich mit dem Hammer. Alles richte ich mit dem Hammer.',
      'Clara und ich streiten, ob man Schrauben braucht. Braucht man nicht. Man braucht Nieten.',
      'Gutes Eisen singt, wenn man draufschlägt. Deine Barrikaden singen jetzt.',
      'Kleine Hände für eine Schmiedin, sagen die Leute. Die Leute sagen viel, wenn der Tag lang ist.',
      'Schrott ist nur Eisen, das eine zweite Chance braucht.',
    ]),
  // --- Mara, die Späherin ---
  maraTreffen: [
    { s: 'mara', t: 'Ich bin Mara. Ich hab euch drei Tage lang beobachtet. Von der Kuppe da oben.' },
    { s: 'mika', t: 'Drei Tage?' },
    { s: 'mara', t: 'Siebenundvierzig Barrikaden gezählt. Zwölf Türme. Einen Hund, der schnarcht. Ihr haltet durch – das wollte ich wissen, bevor ich klopfe.' },
    { s: 'mika', t: 'Bleib heute Nacht am Feuer.' },
    { s: 'mara', t: 'Gern. Ich schlafe mit einem Auge offen. Das andere gehört euch.' },
  ],
  maraEntscheidung: (state) =>
    decision(state, 'mara', [
      { s: 'mara', t: 'Die Horde kam gestern zuerst über den Weg, den ich vorhergesagt hab. Nur so nebenbei.' },
      { s: 'mara', t: 'Wenn ich bleibe, lauf ich jeden Morgen die Wege ab – dann weißt du früh, woher sie kommen. Sonst geh ich zum Kloster am Hang. Von dort sieht man drei Täler.' },
    ]),
  mara: (state) =>
    resident(state, 'mara', [
      'Schon gesehen. Alles schon gesehen. Außer Bert beim Tanzen. Das will ich noch sehen.',
      'Vierzehn Schlurfer am Mittelweg heute Nacht. Oder fünfzehn. Einer war ein Busch.',
      'Karten zeichnen ist einfach. Man muss nur überall gewesen sein.',
      'Die Krähen hier sind gute Späher. Ich hab mit ihnen einen Vertrag.',
      'Ich war schon überall. Hier bin ich am liebsten.',
    ]),
  // --- Paula, die Näherin ---
  paulaTreffen: [
    { s: 'paula', t: 'Guten Abend. Paula. Halt mal still.' },
    { s: 'mika', t: 'Was …?' },
    { s: 'paula', t: '(zieht einen Faden durch) So. Dein Ärmel hatte ein Loch. Jetzt nicht mehr. Ich war Schneiderin in der Stadt – jetzt flicke ich, was die Welt zerreißt.' },
    { s: 'mika', t: 'Bleib heute Nacht am Feuer, Paula.' },
    { s: 'paula', t: 'Danke, mein Kind. Ich hab mein Nähzeug dabei. Ich bin nie unnütz.' },
  ],
  paulaEntscheidung: (state) =>
    decision(state, 'paula', [
      { s: 'paula', t: 'Morgen. Ich hab heute Nacht zwei Socken gestopft. Nicht meine.' },
      { s: 'paula', t: 'Wenn ich bleibe, stelle ich jeden Morgen wieder auf, was die Horde umgeworfen hat, und flicke die Zelte. Sonst geh ich zum Kloster am Hang. Die Schwestern brauchen eine Nadel.' },
    ]),
  paula: (state) =>
    resident(state, 'paula', [
      'Halt still. (näht) So. Jetzt kannst du weiter.',
      'Bert hat drei Löcher in der Schürze. Er sagt, das sind Lüftungsschlitze.',
      'Eine Naht hält nur, wenn man jeden Stich ernst nimmt.',
      'Ich flicke alles. Nur Herzen nicht. Die heilen von allein, wenn man sie lässt.',
      'Mein Fingerhut ist aus Silber. Der Rest von mir ist aus Geduld.',
    ]),
  funkturm1: [{ s: 'juna', t: 'Die Beine stehen wieder gerade, die Leiter hält. Von da oben sieht man über den ganzen See!' }],
  funkturm2: [
    { s: 'juna', t: 'Hörst du das? Rauschen … und dazwischen Stimmen. Da draußen sind noch mehr!' },
    { s: 'juna', t: 'Jetzt fehlt nur noch das Licht. Dafür brauchen wir einen Moderkern.' },
  ],
  funkturm3: [
    { s: 'juna', t: 'Es brennt! Schau nur, wie weit das Licht reicht.' },
    { s: 'mika', t: 'Die Schlurfer werden im Schein ganz langsam. Wie Motten – nur andersrum.' },
    { s: 'juna', t: 'Jetzt leuchten wir über den See. Wer noch unterwegs ist, findet her.' },
    { s: 'mika', t: 'Und wir halten die Nächte durch. Gemeinsam.' },
  ],

  // Einleitung (M15): was passiert ist, warum die Horde nur über die Wege kommt und
  // was Mika hier vorhat. Die Kamera fährt dazu vom Waldrand über die Wege zum Haus.
  // N5: Der erste Kontakt nach der Ankunft. Mit Einführung zeigt Edda dabei die Wege (die
  // Kamera fährt mit, `blick`), ohne Einführung bleibt es beim Kennenlernen.
  eddaErstkontakt: (state) => [
    { s: 'edda', t: 'Krrz … Hallo? … Ist da jemand an der Holzlände?' },
    { s: 'mika', t: 'Ja. Ich bin gerade angekommen, mit dem Boot. Wer spricht da?' },
    { s: 'edda', t: 'Edda. Das Funkgerät in deiner Hand war mal meins. Das Haus auch.' },
    { s: 'edda', t: 'Du suchst ein Zuhause? Dann bleib. Es ist ein gutes Haus. Aber nachts wird es hier laut.' },
    ...(state.tutorial?.on
      ? [
          { s: 'edda', blick: 'wald', t: 'Schau nach Westen, in den Wald. Dort ist vor drei Herbsten der Moder aufgeblüht. Wen er einspinnt, der wird zum Schlurfer – und nachts zieht es sie zu Licht und Wärme.' },
          { s: 'edda', blick: 'unterholz', t: 'Durchs Unterholz kommen sie nicht. Der Boden dort ist ein einziges Geflecht, weich wie Moos und zäh wie Leim. Fest sind nur die alten Holzfällerwege.' },
          { s: 'edda', blick: 'zusammen', karte: true, t: 'Und alle Wege laufen hier zusammen, an der alten Holzlände. Genau bei dir. Deshalb kommen sie hierher.' },
          { s: 'edda', blick: 'haus', t: 'Hinter dir nur Wasser, und Wasser meiden sie. Du musst also nur die Wege halten: Türme daneben, Barrikaden darauf.' },
          { s: 'edda', blick: 'mika', t: 'Tagsüber machst du es dir gemütlich, nachts hältst du durch. Ich bleib am Funkgerät und helfe dir, Schritt für Schritt.' },
        ]
      : [{ s: 'edda', t: 'Du siehst aus, als wüsstest du, was du tust. Ich melde mich, wenn es brenzlig wird.' }]),
  ],

  bettFrueh: [
    {
      s: 'mika',
      t: 'Jetzt schon schlafen? Draußen ist es noch hell.',
      antworten: [
        { t: 'Ja, bis morgen.', aktion: 'schlafen' },
        { t: 'Noch nicht.', standard: true },
      ],
    },
  ],

  // N4: Das Funkgerät in der Stube – Balduins Katalog, Edda oder das Radio
  // M30: Übungsplatz – wer übt heute? (nur, wer eingezogen ist und heute noch nicht geübt hat)
  uebungsplatz: (state) => {
    const people = uebenKandidaten(state);
    return [
      {
        s: 'mika',
        t: T.waffen.uebenFrage,
        antworten: [...people.map((id) => ({ t: T.waffen.uebenAntwort(personName(id), T.waffen.stufe(state.training?.[id]?.level || 0, restUebungen(state.training?.[id]))), aktion: `ueben:${id}` })), { t: T.waffen.uebenNiemand, standard: true }],
      },
    ];
  },
  radio: (state) => [
    {
      s: 'mika',
      t: 'Das Funkgerät. Wen rufe ich?',
      antworten: [
        ...(state.flags?.balduinGetroffen ? [{ t: 'Balduin – den Katalog', aktion: 'katalog' }] : []),
        { t: 'Edda …?', aktion: 'edda' },
        ...(stimmenBereit(state) ? [{ t: T.netz.stimmenFrage, aktion: 'stimmen' }] : []), // M32: mit Juna hört man die anderen
        { t: 'Radio hören', aktion: 'radioHoeren' },
        { t: 'Niemanden.', standard: true },
      ],
    },
  ],
  // N4: Edda meldet sich – mal knapp, mal mit einem Stück ihrer Geschichte
  // M32: Edda kommt nach dem Herbst nach Hause – am Ende des Stegs beim alten Funkturm
  eddaHeimkehr: (state) => [
    { s: 'eddaHier', t: 'Na? Erkennst du mich ohne das Rauschen?' },
    { s: 'mika', t: 'Edda! Du bist … echt.' },
    { s: 'eddaHier', t: 'Ziemlich echt, ja. Und ziemlich durchgefroren. Ich bin die halbe Nacht gerudert – von da drüben, wo man euer Feuer sieht.' },
    { s: 'eddaHier', t: `Ich hab dir jeden Abend zugehört, ${state.player?.name || 'Mika'}. Wie du das Tor geflickt hast. Wie du die Leute aufgenommen hast. Ich wusste nicht, ob ich mich zurücktraue.` },
    { s: 'eddaHier', t: 'Das Haus riecht nach Suppe. Früher roch es nach Fisch und Teer. Das hier ist besser.' },
    { s: 'mika', t: 'Es ist dein Haus. Soll ich …' },
    { s: 'eddaHier', t: 'Es ist unser Haus. Ich nehm den Sessel am Kamin, der knarzt so schön. Und tagsüber steh ich hier und schau aufs Wasser – das hab ich am meisten vermisst.' },
    { s: 'eddaHier', t: 'Das Funkgerät behältst du. Irgendwer da draußen braucht jetzt jemanden, der zuhört.' },
  ],
  eddaDa: (state) => [
    pick(
      [
        { s: 'eddaHier', t: 'Der See ist ruhig heute. Ich hab sogar sein Brummeln im Winter vermisst.' },
        { s: 'eddaHier', t: 'Hier hat mein Großvater gestanden und nach den Booten geschaut. Jetzt steh ich hier und schau nach euch.' },
        { s: 'eddaHier', t: 'Der alte Funkturm. Wir hatten eine Sendung, »Radio Stillwald«. Drei Hörer. Einer davon war Balduin.' },
        { s: 'eddaHier', t: 'Wenn abends auf den Inseln ein Licht angeht, winke ich. Man weiß ja nie.' },
        { s: 'eddaHier', t: 'Du hast aus meiner Holzlände ein Zuhause gemacht. Für viele. Weißt du das eigentlich?' },
        { s: 'eddaHier', t: 'Der Moder schläft jetzt. Im Frühjahr wacht er wieder auf – aber dann sind wir auch wach.' },
        { s: 'eddaHier', t: 'Balduin schuldet mir immer noch einen Tanz. Ich hab ihn gestern daran erinnert. Er hat so getan, als hätte er einen Motorschaden.' },
      ],
      state.time.day,
    ),
  ],
  eddaFunk: (state) => [
    { s: 'mika', t: 'Edda? Bist du da?' },
    pick(
      [
        { s: 'edda', t: 'Ich bin immer da, Mika. Nur nicht immer am Funkgerät. Ist das Feuer an?' },
        { s: 'edda', t: 'Die Holzlände hat mein Großvater gebaut. Den Steg, die Hütte, das Tor. Ich hab dort Laufen gelernt.' },
        { s: 'edda', t: 'Wo ich bin? Irgendwo, wo man den See sehen kann. Mehr sag ich noch nicht.' },
        { s: 'edda', t: 'Der Moder hört auf Licht und Wärme. Merk dir das. Es wird wichtig.' },
        { s: 'edda', t: 'Balduin? Wir kennen uns lange. Er schuldet mir noch einen Tanz.' },
        { s: 'edda', t: 'Krrz … schlechter Empfang heute. Das liegt am Wetter. Oder am Moder. Oder an mir.' },
        { s: 'edda', t: 'Radio Stillwald? … So. Dann hat also doch jemand zugehört.' },
        // N8: Wenn Marthe mit den Kindern in der Bucht wohnt
        ...(state.isles?.fog?.stage === 4
          ? [
              { s: 'edda', t: 'Marthe hat mir heute Morgen die Glocke vorgeläutet. Über Funk. Zweimal. Ich hab so getan, als wär das nichts.' },
              { s: 'edda', t: 'Pass auf Pim auf. Wenn der einen Hammer findet, baut er dir ein Boot. Aus deinem Zaun.' },
              { s: 'edda', t: 'Lu hat mir erzählt, dass bei euch Riesen wohnen. Ich hab gesagt: Die sind freundlich und kochen gut.' },
            ]
          : []),
      ],
      state.time.day
    ),
  ],
  // M32: Juna hat das Funkgerät auf die sicheren Orte gestellt – je Tag meldet sich jemand
  stimmen: (state) => {
    const ids = weitergezogen(state);
    if (!ids.length) return [{ s: 'radio', t: '…krrrzzz…' }, { s: 'mika', t: T.netz.stimmenLeer }];
    const day = state.time.day;
    const id = ids[day % ids.length];
    const lines = T.netz.stimmen[id] || [T.netz.stimmeAlle];
    return [
      { s: 'radio', t: '…krrz… …pssh…' },
      { s: id, t: lines[Math.floor(day / ids.length) % lines.length] },
      { s: 'mika', t: pick(['Ich halte die Taste und sage nur: »Hier auch alles gut.«', 'Ich muss lächeln. Das Rauschen klingt gleich ein bisschen wärmer.', '»Wir hören dich!« Ob sie es hört? Bestimmt.'], day) },
    ];
  },
  // M32: Zum Fest ist jemand von früher gekommen
  besuch: (state) => {
    const id = state.post?.visit?.id;
    return [
      { s: id || 'mika', t: (id && T.netz.besuchZeile[id]) || T.netz.besuchAlle },
      { s: 'mika', t: pick(['Schön, dass du da bist. Setz dich, es gibt Tee.', 'Du hast uns gefehlt. Erzähl – wie ist es dort?', 'Bleib bis heute Abend. Das Feuer ist groß genug für alle.'], state.time.day) },
    ];
  },
  radioHoeren: (state) =>
    state.flags.radioGehoert
      ? [
          { s: 'radio', t: '…krrrzzz… …pssshhh…' },
          { s: 'mika', t: pick(['Heute nur Rauschen. Vielleicht morgen wieder.', 'Rauschen. Aber irgendwo da draußen ist jemand. Ich weiß es.', 'Ich drehe am Knopf. Nichts. Na gut.'], state.time.day) },
        ]
      : [
          { s: 'radio', t: '…krrzz… hier ist … Radio Stillwald … falls uns jemand hört …' },
          { s: 'radio', t: '…bleibt auf festem Boden … nachts Licht an, Türen zu … krrzz…' },
          { s: 'radio', t: '…der alte Mast am Steg … wenn ihn jemand wieder … krrrzzz…' },
          { s: 'mika', t: 'Da war eine Stimme! Da draußen ist noch jemand.' },
        ],

  // Der Kamin im Wohnraum (Meilenstein 11): drinnen ausruhen wie am Lagerfeuer
  kamin: (state) =>
    withRest(
      [
        {
          s: 'mika',
          t: pick(
            [
              'Das Feuer knackt, draußen rauscht der See. Hier drin ist die Welt in Ordnung.',
              'Warme Füße, kalte Nase am Fenster. So mag ich den Herbst.',
              'Ich lege ein Scheit nach. Funken tanzen den Kamin hinauf.',
              'Wer hier gewohnt hat, hat den Kamin geliebt. Die Steine sind ganz glatt vom Anlehnen.',
            ],
            state.time.day
          ),
        },
      ],
      state
    ),

  lagerfeuer: (state) =>
    withRest(
      [
        {
          s: 'mika',
          t: pick(
            [
              'Knack. Knister. Das Feuer erzählt Geschichten, die niemand versteht. Ich höre trotzdem gern zu.',
              'Wärme im Gesicht, Kälte im Rücken. So muss ein Lagerfeuer sein.',
              'Ich könnte stundenlang in die Flammen schauen.',
            ],
            state.time.day
          ),
        },
      ],
      state
    ),

  sessel: (state) =>
    withRest(
      state.flags.sesselProbiert
        ? [{ s: 'mika', t: 'Mein Lieblingssessel. Mitten im Hof, mit Blick aufs Wasser. Genau richtig.' }]
        : [
            { s: 'mika', t: 'Ein Ohrensessel mitten im Hof. Irgendwer hatte hier Prioritäten.' },
            { s: 'mika', t: '…Sehr bequem. Kann ich bestätigen.' },
          ],
      state
    ),

  funkturm: [
    { s: 'mika', t: 'Der alte Mast am Steg. Früher hat er den Fischern heimgeleuchtet.' },
    { s: 'mika', t: 'Wenn der wieder stünde – mit einem Licht ganz oben – man würde es über den ganzen See sehen.' },
  ],

  schild: [
    { s: 'schild', t: '„→ Fischerhaus am Stillsee“\n„← Moosbach 12 km – Weg gesperrt“\n„Bitte Füße abtreten.“' },
    { s: 'mika', t: 'Füße abtreten. Die Schlurfer lesen das bestimmt.' },
  ],

  briefkasten: (state) =>
    state.post?.read?.length
      ? [{ s: 'mika', t: 'Leer. Die Briefe von unterwegs liegen im Herbstbuch, auf der Seite »Post«.' }] // M32
      : state.flags.briefkastenGesehen
      ? [{ s: 'mika', t: 'Immer noch leer. Aber nachsehen macht trotzdem Spaß.' }]
      : [{ s: 'mika', t: 'Der Briefkasten ist leer. Noch.' }],

  waesche: [{ s: 'mika', t: 'Die Wäsche ist trocken. Und die Socken passen sogar zusammen. Beinahe.' }],

  regentonne: [{ s: 'mika', t: 'Die Regentonne ist halb voll. Reicht zum Gießen – und für eine Katzenwäsche, wenn es sein muss.' }],

  hackklotz: [{ s: 'mika', t: 'Der Hackklotz. Die Axt habe ich schon eingesteckt.' }],

  axtFund: [
    { s: 'mika', t: 'Eine Axt! Stumpf, aber sie tut’s. Damit kann ich Bäume fällen.' },
    { s: 'mika', t: 'Die Bäume mit dem rot-weißen Band darf ich fällen. Und in den Schrotthaufen findet sich Kram für einen Turm – das Baumenü unten rechts (Tab) zeigt, was geht.' },
  ],

  werkbankGebaut: [{ s: 'mika', t: 'Eine richtige Werkbank! Hier kann ich eine Spitzhacke bauen – und Überschuss zu Schrott verwerten.' }],

  // Ausbau des Zuhauses (M11): je Stufe ein Raum
  hausAusbau: (state) => [
    {
      s: 'mika',
      t: [
        null,
        null,
        'Die Notunterkunft zur Hütte ausbauen? Ein Anbau mit Küche, ein richtiges Vordach, dickere Wände.',
        'Den Dachboden zum Schlafzimmer ausbauen? Ein eigenes Bett unterm Dach, weg vom Kamin.',
        'Eine Werkstatt anbauen? Mit Werkbank, Werkzeugwand und Platz für Bretter.',
        'Ein Lager anbauen? Trocken, mit Regalen – was dort liegt, geht nicht so schnell verloren.',
      ][Math.min(5, (state.world?.houseLevel ?? 1) + 1)],
      antworten: [{ t: 'Ja, ausbauen!', aktion: 'hausAusbauen' }, { t: 'Noch nicht.', standard: true }],
    },
  ],

  hausFertig: (state) => [
    {
      s: 'mika',
      t: [
        null,
        null,
        'Geschafft. Das ist keine Notunterkunft mehr. Das ist eine Hütte. Meine Hütte. Mit Küche!',
        'Ein Schlafzimmer unterm Dach. Heute Nacht schlafe ich wie ein Stein.',
        'Eine eigene Werkstatt! Hier kann ich basteln, auch wenn draußen die Horde klopft.',
        'Das Lager ist fertig. Was hier liegt, bleibt hier – egal, was die Nacht bringt.',
      ][Math.min(5, state.world?.houseLevel ?? 2)],
    },
  ],

  // Küche (M11): einmal am Tag Suppe kochen
  herd: (state) =>
    state.player?.soup === state.time?.day
      ? [{ s: 'mika', t: 'Der Topf ist leer gegessen. Morgen koche ich wieder.' }]
      : [
          {
            s: 'mika',
            t: 'Der Herd ist warm. Eine Kürbissuppe mit Kräutern? Das macht satt und hält die ganze Nacht.',
            antworten: [{ t: 'Suppe kochen (3 Fasern)', aktion: 'suppe' }, { t: 'Später.', standard: true }],
          },
        ],

  lager: [{ s: 'mika', t: 'Alles trocken und ordentlich. Was hier liegt, verliere ich nicht so schnell.' }],

  ersterTurm: [
    { s: 'mika', t: 'Ein Bolzenwerfer. Der schießt von selbst auf alles, was aus dem Wald geschlurft kommt.' },
    { s: 'mika', t: 'Die roten Pünktchen beim Bauen zeigen, wo die Horde langläuft. Neben den Weg gehören Türme – und auf den Weg Barrikaden, an denen sie hängen bleibt.' },
    { s: 'mika', t: 'Heute Nacht kommt die Horde. Was sie liegen lässt, sammle ich ein – vielleicht kann ich damit ja etwas anfangen.' },
  ],

  // Der zweite Satz passt zum Vorrat: Reicht der Schrott schon für einen Turm? (m3-r2)
  abendHorde: (state) => [
    { s: 'mika', t: 'Es wird dunkel. Aus dem Wald kommt ein Stöhnen … Heute Nacht kommt die Horde.' },
    (state.inventory?.schrott || 0) >= TOWERS.bolzen.base[0].cost.schrott
      ? { s: 'mika', t: 'Ohne Turm stehe ich da allein. Schrott habe ich genug – schnell einen bauen, unten in der Bauleiste!' }
      : {
          s: 'mika',
          t: state.flags?.wrackLeer
            ? `Ohne Turm stehe ich da allein. Schrott finde ich in den Haufen an den Wegen${state.flags?.balduinGetroffen ? ' – und morgens bei Balduin.' : '.'}`
            : 'Ohne Turm stehe ich da allein. Schrott finde ich in den Haufen an den Wegen und im Bootswrack am Strand.',
        },
  ],

  // Tagsüber bietet das Bett wenigstens das Ausruhen an (m3-r1: Leerlauf am Tag)
  bettHorde: (state) =>
    restAnswers(state)
      ? withRest([{ s: 'mika', t: 'Schlafen? Nicht, solange die Horde noch kommt. Aber die Beine hochlegen geht.' }], state)
      : [{ s: 'mika', t: 'Schlafen? Nicht, solange die Horde draußen ist. Erst muss die Nacht vorbei sein.' }],

  bank: (state) => withRest([{ s: 'mika', t: 'Eine Bank, selbst gebaut. Sitzt sich gleich doppelt so gut.' }], state),

  beet: [{ s: 'mika', t: 'Ein verwildertes Beet voller Kürbisse. Jemand hat hier mal gegärtnert – und die Kürbisse haben einfach weitergemacht.' }],

  morgen: (state) => [
    {
      s: 'mika',
      t: pick(
        [
          'Guten Morgen, See.',
          'Ausgeschlafen. Der Tag kann kommen.',
          'Die Vögel sind schon wach. Dann wohl ich auch.',
          // m3-r2: vor dem Ausbau ist es noch die Notunterkunft
          `Ein neuer Tag. ${(state.world?.houseLevel || 1) >= 2 ? 'Die Hütte' : 'Mein Unterschlupf'} steht noch. Das ist ein guter Anfang.`,
        ],
        state.time.day
      ),
    },
  ],
  // --- M29: Bindungsmomente – je Figur drei (vertraut, befreundet, eng). Sie spielen beim
  // nächsten Ansprechen nach dem Aufstieg; der dritte endet mit dem Erinnerungsstück.
  // Keine Pronomen für Mika (Name und Aussehen sind frei wählbar).
  // --- Knopf ------------------------------------------------------------------------
  knopfMoment1: [
    { s: 'mika', t: 'Knopf trottet heran und legt mir den Kopf aufs Knie. Einfach so, ohne Stock, ohne Bitte.' },
    { s: 'knopf', t: 'Wuff.' },
    { s: 'mika', t: 'Ja. Ich hab dich auch gern.' },
  ],
  knopfMoment2: [
    { s: 'mika', t: 'Knopf sitzt am Tor und schaut in den Wald. Bei jedem Knacken zucken die Ohren.' },
    { s: 'mika', t: 'Jemand hat ihm den Knopf ans Halsband genäht. Mit rotem Garn, ganz ordentlich. Ob er auf diesen Jemand wartet?' },
    { s: 'knopf', t: '(leise) Wuff.' },
    { s: 'mika', t: 'Du passt auf uns auf. Und wir auf dich. Abgemacht?' },
    { s: 'mika', t: 'Knopf lehnt sich an mein Bein. Das heißt wohl ja.' },
  ],
  knopfMoment3: [
    { s: 'mika', t: 'Knopf kommt mit etwas im Maul und legt es mir feierlich vor die Füße: ein Tennisball, grau vor Alter, weich vom Kauen.' },
    { s: 'knopf', t: 'Wuff!' },
    { s: 'mika', t: 'Dein Schatz? Für mich?' },
    { s: 'mika', t: 'Er schiebt ihn mit der Nase noch ein Stück näher. Dann legt er sich daneben und seufzt. Sehr zufrieden.' },
    { s: 'mika', t: 'Der Ball bekommt einen Ehrenplatz im Regal. Knopf wird das jeden Abend kontrollieren.' },
  ],

  // --- Oma Hilde --------------------------------------------------------------------
  hildeMoment1: [
    { s: 'hilde', t: 'Kindchen, komm mal her. Du hast da einen Faden am Ärmel.' },
    { s: 'hilde', t: '(zupft) So. Auf meiner Runde hab ich immer was gerichtet. Einen Kragen, eine Fahrradklingel, einen Streit.' },
    { s: 'mika', t: 'Einen Streit?' },
    { s: 'hilde', t: 'Die Leute reden mit der Post, Kindchen. Und die Post hört zu. Vierzig Jahre lang.' },
  ],
  hildeMoment2: [
    { s: 'hilde', t: 'Weißt du, was ich am meisten vermisse? Nicht die Leute. Die sind ja noch da, irgendwo, hoffentlich.' },
    { s: 'hilde', t: 'Den letzten Brief. Der steckte noch in meiner Tasche, als der Moder kam. An Frau Lindqvist, Am Seeufer 4.' },
    { s: 'hilde', t: 'Aufgemacht hab ich ihn nie. Das tut man nicht.' },
    { s: 'mika', t: 'Vielleicht ist sie noch da. Irgendwo am Ufer.' },
    { s: 'hilde', t: 'Vielleicht. Wenn Juna mal jemanden am See erreicht, frag ich nach. So lange trag ich ihn eben weiter.' },
  ],
  hildeMoment3: [
    { s: 'hilde', t: 'Mikachen. Setz dich. Ich hab was für dich.' },
    { s: 'hilde', t: 'Mein Posthorn. Hing vierzig Jahre am Lenker und hat jeden Morgen getrötet, ob die Leute wollten oder nicht.' },
    { s: 'mika', t: 'Das kann ich nicht annehmen.' },
    { s: 'hilde', t: 'Doch. Jetzt bringst du den Leuten, was sie brauchen. Nur dass sie zu dir kommen.' },
    { s: 'hilde', t: 'Und wenn du mal nicht weiterweißt: einmal tröten. Das hilft. Meistens den anderen.' },
  ],

  // --- Juna -------------------------------------------------------------------------
  junaMoment1: [
    { s: 'juna', t: 'Psst! Hör mal. (dreht am Knopf) Da. Hinter dem Rauschen.' },
    { s: 'mika', t: 'Ich höre … Rauschen.' },
    { s: 'juna', t: 'Ganz leise. Jemand pfeift. Seit drei Nächten, immer dieselbe Melodie.' },
    { s: 'juna', t: 'Ich pfeif jetzt zurück. Vielleicht denkt der andere, er ist verrückt. Aber vielleicht freut er sich.' },
  ],
  junaMoment2: [
    { s: 'juna', t: 'Käpt’n? Darf ich dir was sagen, ohne dass du es weitererzählst?' },
    { s: 'juna', t: 'Radio Stillwald – das gab es wirklich. Mein Vater hat es gemacht, aus dem Keller, jeden Abend um acht.' },
    { s: 'juna', t: 'Als der Moder kam, hat er gesagt: Sende weiter, egal was passiert. Dann ist er losgegangen, Hilfe holen.' },
    { s: 'mika', t: 'Und du sendest.' },
    { s: 'juna', t: 'Jeden Abend um acht. Wenn er irgendwo ein Radio hat, weiß er, dass ich noch da bin. (lacht, ein bisschen zu laut) Na ja. Und jetzt weiß er auch, dass es hier Kürbisse gibt.' },
  ],
  junaMoment3: [
    { s: 'juna', t: 'Käpt’n! Hand auf. Augen zu. Nicht schummeln!' },
    { s: 'juna', t: 'Das ist die erste Röhre, die ich ganz allein repariert hab. Mit neun. Mein Vater hat sie mir an einer Schnur umgehängt wie eine Medaille.' },
    { s: 'mika', t: 'Juna … die brauchst du doch.' },
    { s: 'juna', t: 'Nee. Die ist durchgebrannt, schon ewig. Aber sie hat einmal geleuchtet, weil ich was richtig gemacht hab.' },
    { s: 'juna', t: 'Genau wie hier. Stell sie irgendwohin, wo ich sie seh. Dann weiß ich immer, wo zu Hause ist.' },
  ],

  // --- Bert -------------------------------------------------------------------------
  bertMoment1: [
    { s: 'bert', t: 'Hmpf. Deine Säge. Stumpf.' },
    { s: 'bert', t: '(feilt) Dreißig Jahre Baumarkt. Weißt du, wie oft ich das gesagt hab? „Stumpf. Das ist nicht die Säge, das ist der Mensch.“' },
    { s: 'mika', t: 'Und – war es der Mensch?' },
    { s: 'bert', t: 'Immer. (reicht die Säge zurück) Jetzt nicht mehr. Gern geschehen.' },
  ],
  bertMoment2: [
    { s: 'bert', t: 'Setz dich. Nein, da nicht. Der Klotz wackelt.' },
    { s: 'bert', t: 'Ich hatte eine Frau. Marianne. Die hat gesagt, ich rede mit Schrauben mehr als mit Menschen.' },
    { s: 'bert', t: 'Hatte recht. Schrauben widersprechen nicht. Menschen gehen fort.' },
    { s: 'mika', t: 'Wohin ist sie gegangen?' },
    { s: 'bert', t: 'Zu ihrer Schwester in die Stadt. Vor dem Moder. Weiß nicht, ob sie angekommen ist. (lange Pause) Hmpf. Genug geredet. Die Barrikade da vorn ist schief.' },
  ],
  bertMoment3: [
    { s: 'bert', t: 'Hier. Nimm. Frag nicht.' },
    { s: 'mika', t: 'Ein Namensschild? „Bert – Ihr Fachberater. Fragen Sie mich!“' },
    { s: 'bert', t: 'Dreißig Jahre am Kittel. Die Leute haben gefragt. Ich hab geantwortet. Meistens: „Gang sieben.“' },
    { s: 'bert', t: 'Hier fragt mich auch wieder jemand. Das ist … hmpf. Das ist gut.' },
    { s: 'mika', t: 'Danke, Bert.' },
    { s: 'bert', t: 'Gang sieben. Falls du was brauchst.' },
  ],

  // --- Dr. Yusuf --------------------------------------------------------------------
  yusufMoment1: [
    { s: 'yusuf', t: 'Zeig mal deine Hand. Nein, die andere. Ah. Eine Schwiele vom Axtstiel.' },
    { s: 'yusuf', t: 'Pferde kriegen so etwas am Widerrist. Ich empfehle Ringelblumensalbe und weniger Holzhacken.' },
    { s: 'mika', t: 'Und was empfehlen Sie, wenn man das Holz braucht?' },
    { s: 'yusuf', t: 'Dann Ringelblumensalbe. Das mit dem Holzhacken war ohnehin nur als Scherz gemeint.' },
  ],
  yusufMoment2: [
    { s: 'yusuf', t: 'Ich hatte eine Praxis im Dorf hinter dem Wald. Hunde, Katzen, einmal ein Esel mit Liebeskummer.' },
    { s: 'yusuf', t: 'Als der Moder kam, habe ich die Tiere freigelassen. Alle. Die Käfige offen, die Tür offen. Lauft.' },
    { s: 'yusuf', t: 'Manchmal frage ich mich, ob das richtig war.' },
    { s: 'mika', t: 'Knopf ist auch irgendwo losgelaufen. Und jetzt ist er hier.' },
    { s: 'yusuf', t: '(schaut zu Knopf hinüber) … Ja. Ja, das ist er. Danke. Das hilft mehr als jeder Tee.' },
  ],
  yusufMoment3: [
    { s: 'yusuf', t: 'Ich möchte dir etwas schenken. Es ist albern. Das ist der Sinn der Sache.' },
    { s: 'mika', t: 'Ein Hut? Mit einem … Plüschschaf obendrauf?' },
    { s: 'yusuf', t: 'Mein Doktorhut. Die Kollegen haben ihn gebastelt, als ich fertig war. Das Schaf war meine erste Patientin.' },
    { s: 'yusuf', t: 'Ich habe ihn aus dem Dorf mitgenommen statt einer zweiten Hose. Man muss Prioritäten setzen.' },
    { s: 'yusuf', t: 'Stell ihn ins Regal. Wenn es schwer wird, schau ihn an. Niemand kann traurig bleiben, wenn ein Schaf auf ihn herabblickt.' },
  ],

  // --- Hannes -----------------------------------------------------------------------
  hannesMoment1: [
    { s: 'hannes', t: '(klopft an deinen Türrahmen) Hm. Kiefer. Hat sich gesetzt. Hält noch fünfzig Jahre.' },
    { s: 'mika', t: 'Klopfst du eigentlich auf alles?' },
    { s: 'hannes', t: 'Holz redet, wenn man anklopft. Menschen auch, nur leiser.' },
    { s: 'hannes', t: '(klopft sanft an Mikas Schulter) Hm. Hält auch noch fünfzig Jahre. Mindestens.' },
  ],
  hannesMoment2: [
    { s: 'hannes', t: 'Auf der Walz darf man seinem Heimatort nicht näher als fünfzig Kilometer kommen. Drei Jahre und einen Tag.' },
    { s: 'hannes', t: 'Ich hatte noch vier Monate. Dann wär ich heimgegangen, mit dem Wanderbuch voller Stempel.' },
    { s: 'hannes', t: 'Jetzt gibt es den Ort nicht mehr. Der Moder hat ihn eingewickelt wie ein Päckchen.' },
    { s: 'mika', t: 'Dann bist du jetzt für immer auf der Walz?' },
    { s: 'hannes', t: 'Oder angekommen. (klopft auf den Balken) Kommt drauf an, wie man’s sieht. Ich seh’s gerade ganz gut.' },
  ],
  hannesMoment3: [
    { s: 'hannes', t: 'Ich hab gesagt, den Hobel geb ich nicht her. Hab ich gesagt, oder?' },
    { s: 'mika', t: 'Hast du.' },
    { s: 'hannes', t: 'Er war von meinem Großvater. Der hat gesagt: Gib ihn dem, bei dem du bleiben willst.' },
    { s: 'hannes', t: 'Also. Nimm. Und wehe, du hobelst damit Kürbisse.' },
  ],

  // --- Clara ------------------------------------------------------------------------
  claraMoment1: [
    { s: 'clara', t: 'Boss! Hör dir das an. (tippt an den Turm) Hörst du? Nichts! Er quietscht nicht mehr.' },
    { s: 'mika', t: 'Hat er vorher gequietscht?' },
    { s: 'clara', t: 'In C-Dur. Jetzt schnurrt er. Ich hab ihm gesagt, dass er ein guter Turm ist. Und ihn geölt. Vor allem geölt.' },
  ],
  claraMoment2: [
    { s: 'clara', t: 'Meine Werkstatt war eine alte Tankstelle. Über der Tür stand noch „Super bleifrei“. Die Leute dachten, das bin ich.' },
    { s: 'clara', t: 'Ich hab alles repariert. Fahrräder, Toaster, einmal ein Herz aus Blech für ein Kind, das weinen musste.' },
    { s: 'clara', t: 'Dann ist das Dach eingebrochen, und der Moder kam durch die Ritzen. Ich hab nur das Schild gerettet.' },
    { s: 'mika', t: 'Welches Schild?' },
    { s: 'clara', t: '„Hier wird nichts weggeworfen.“ Hing über der Werkbank. Ich glaub, das hier ist auch so ein Ort. Ihr werft auch nichts weg. Nicht mal Leute.' },
  ],
  claraMoment3: [
    { s: 'clara', t: 'Boss, ich brauch zwei Hände und einen Nagel. Du bist die Hände.' },
    { s: 'clara', t: '(hält das Schild hoch) „Hier wird nichts weggeworfen.“ Es gehört über deine Tür. Oder ins Regal. Aber gut sichtbar.' },
    { s: 'mika', t: 'Das ist doch dein Schild.' },
    { s: 'clara', t: 'Deshalb. Mein Schild hängt da, wo ich zu Hause bin. So einfach ist Mechanik.' },
  ],

  // --- Lotte ------------------------------------------------------------------------
  lotteMoment1: [
    { s: 'lotte', t: 'Mika! Ich hab was gefunden! (kramt) Moment. Ich hab was gefunden und dann … hier! Nein. Das ist ein Keks.' },
    { s: 'lotte', t: 'Egal. Willst du den Keks? Er ist nur ein bisschen zerbrochen. Glück bringt er trotzdem.' },
    { s: 'mika', t: 'Kekse bringen Glück?' },
    { s: 'lotte', t: 'Zerbrochene schon. Dann kann man teilen. (bricht ihn in zwei) Siehst du? Schon wirkt es.' },
  ],
  lotteMoment2: [
    { s: 'lotte', t: 'Weißt du, warum ich so viel verliere? Meine Oma hat gesagt, ich hab Löcher in den Taschen und im Kopf.' },
    { s: 'lotte', t: 'Aber eins hab ich nie verloren: die Laterne, die sie mir gefaltet hat. Die trag ich immer.' },
    { s: 'lotte', t: 'In der ersten Nacht mit dem Moder war es so dunkel, dass ich dachte, ich verliere mich selbst. Dann hab ich die Laterne angezündet.' },
    { s: 'mika', t: 'Und dann?' },
    { s: 'lotte', t: 'Dann war ich wieder da. So einfach ist Licht. Deshalb mach ich es immer weiter.' },
  ],
  lotteMoment3: [
    { s: 'lotte', t: 'Die ganze Nacht hab ich gefaltet. Und nur zweimal die Schere verloren!' },
    { s: 'lotte', t: '(hält eine Papierlaterne hoch, orange wie ein Kürbis) Für dich. Mit einem Fenster in Form von … einem Hund. Ungefähr.' },
    { s: 'mika', t: 'Das ist Knopf!' },
    { s: 'lotte', t: 'Siehst du, du erkennst ihn! Dann hab ich es richtig gemacht. Eine Laterne ist für den, bei dem man sich nicht verliert.' },
  ],

  // --- Greta ------------------------------------------------------------------------
  gretaMoment1: [
    { s: 'greta', t: 'Komm. Leise.' },
    { s: 'mika', t: '(flüstert) Was ist da?' },
    { s: 'greta', t: 'Reh. Am Schilf. Erstes seit dem Moder.' },
    { s: 'mika', t: 'Es lebt noch was da draußen.' },
    { s: 'greta', t: 'Ja. Nicht nur Schlurfer. Wollt ich dir zeigen.' },
  ],
  gretaMoment2: [
    { s: 'greta', t: 'Die Pfeife. Du hast gefragt.' },
    { s: 'greta', t: 'Mein Mann. Karl. Hat mir Fallen beigebracht. Und Geduld.' },
    { s: 'greta', t: 'Er ist im Wald geblieben. Am ersten Abend. Hat die anderen rausgebracht. Sich selbst nicht.' },
    { s: 'mika', t: 'Das tut mir leid, Greta.' },
    { s: 'greta', t: 'Mir auch. (lange Pause) Du erinnerst mich an ihn. Redest mehr. Aber sonst.' },
  ],
  gretaMoment3: [
    { s: 'greta', t: 'Hier.' },
    { s: 'mika', t: 'Die Feder von deinem Hut?' },
    { s: 'greta', t: 'Eichelhäher. Hat Karl gefunden. Bringt Glück, hat er gesagt.' },
    { s: 'greta', t: 'Hat gewirkt. Ich bin hier.' },
    { s: 'greta', t: 'Jetzt du.' },
  ],
  // M29: die übrigen acht
  fieteMoment1: [
    { s: 'fiete', t: 'Komm mal mit zum Steg. Nur kurz.' },
    { s: 'mika', t: 'Was ist denn?' },
    { s: 'fiete', t: 'Nichts. Das ist es ja. Kein Schlurfer, kein Sturm, nur Wasser. So hab ich das früher jeden Morgen gehabt.' },
    { s: 'fiete', t: 'Danke, dass ich das wieder hab.' },
  ],
  fieteMoment2: [
    { s: 'fiete', t: 'Der Hecht. Ich muss dir was gestehen.' },
    { s: 'fiete', t: 'Er war so lang wie meine Hand. Und ich hab ihn wieder reingeworfen, weil er mich so traurig angeguckt hat.' },
    { s: 'mika', t: 'Und das Ruder?' },
    { s: 'fiete', t: 'Hab ich erfunden. Aber die Geschichte wird jedes Jahr besser, findest du nicht?' },
  ],
  fieteMoment3: [
    { s: 'fiete', t: 'Hier. Meine Knotentafel. Hat vierzig Jahre auf dem Kutter gehangen.' },
    { s: 'fiete', t: 'Palstek, Webeleinstek, Achtknoten. Jeder hält was anderes.' },
    { s: 'mika', t: 'Und welcher hält uns?' },
    { s: 'fiete', t: 'Keiner davon. Uns hält was Besseres. Häng sie irgendwo hin, wo du sie siehst.' },
  ],
  idaMoment1: [
    { s: 'ida', t: 'Komm her. Schau mal an den Stumpf.' },
    { s: 'mika', t: 'Ein Trieb. Ganz klein.' },
    { s: 'ida', t: 'Der Baum, den du letzte Woche gefällt hast. Er kommt wieder.' },
    { s: 'ida', t: 'Ich wollte, dass du das siehst. Nicht alles, was fällt, ist fort.' },
  ],
  idaMoment2: [
    { s: 'ida', t: 'Ich hatte ein Revier. Vierhundert Hektar. Jeden Baum kannte ich.' },
    { s: 'ida', t: 'Als der Moder kam, bin ich geblieben, bis es nicht mehr ging. Ich hab mich verabschiedet.' },
    { s: 'mika', t: 'Von jedem Baum?' },
    { s: 'ida', t: 'Von den wichtigen. Es hat drei Tage gedauert.' },
  ],
  idaMoment3: [
    { s: 'ida', t: 'Der hier ist für dich.' },
    { s: 'ida', t: 'Ein Zapfen von der ältesten Tanne im Revier. Dreihundert Jahre. Sie hat alles überstanden.' },
    { s: 'ida', t: 'Wenn wir hier fertig sind, stecken wir die Samen in die Erde. Zusammen.' },
    { s: 'mika', t: 'Versprochen.' },
  ],
  rosaMoment1: [
    { s: 'rosa', t: 'Mund auf.' },
    { s: 'mika', t: 'Was ist das?' },
    { s: 'rosa', t: 'Kürbisplätzchen. Das Rezept meiner Mutter. Ich hab sie seit dem Moder nicht mehr gebacken. Und? Und?' },
    { s: 'mika', t: 'Wunderbar.' },
    { s: 'rosa', t: 'Fehlt Salz. Aber wunderbar.' },
  ],
  rosaMoment2: [
    { s: 'rosa', t: 'Weißt du, warum ich koche? Weil man dabei nicht nachdenken muss.' },
    { s: 'rosa', t: 'Am ersten Abend mit dem Moder hab ich für dreißig Leute gekocht. Es kamen vier.' },
    { s: 'rosa', t: 'Hier kommen alle. Jeden Abend. Das ist mein Glück.' },
  ],
  rosaMoment3: [
    { s: 'rosa', t: 'Hier. Mein Rezeptheft. Omas Brühe, Mutters Plätzchen, meine Kürbissuppe. Mit Fettflecken.' },
    { s: 'mika', t: 'Das kann ich nicht annehmen.' },
    { s: 'rosa', t: 'Doch. Ein Rezept, das niemand kocht, ist nur Papier. Du kochst es. Mit Salz.' },
  ],
  antonMoment1: [
    { s: 'anton', t: 'Hör mal. Ich hab was für dich geschrieben.' },
    { s: 'anton', t: '(spielt eine kleine Melodie, leise und ein bisschen schief)' },
    { s: 'mika', t: 'Das ist … schön.' },
    { s: 'anton', t: 'Es heißt „Mika hält die Nacht“. Der Text fehlt noch. Auf Mika reimt sich nichts.' },
  ],
  antonMoment2: [
    { s: 'anton', t: 'Ich hab früher in großen Sälen gespielt. Hunderte Leute.' },
    { s: 'anton', t: 'Hier sind es eine Handvoll und ein Hund. Und es ist das beste Publikum, das ich je hatte.' },
    { s: 'mika', t: 'Warum?' },
    { s: 'anton', t: 'Weil hier keiner zuhört, weil er bezahlt hat. Sondern weil er es braucht.' },
  ],
  antonMoment3: [
    { s: 'anton', t: 'Hier. Meine erste Mundharmonika. Damit hab ich angefangen, mit sieben.' },
    { s: 'anton', t: 'Sie kann nur eine Tonleiter, und die ist schief. Aber sie hat mich hierher gebracht.' },
    { s: 'anton', t: 'Spiel drauf, wenn es still wird. Dann weiß ich, dass du an uns denkst.' },
  ],
  emilMoment1: [
    { s: 'emil', t: 'Psst. Hier. Knie dich hin.' },
    { s: 'emil', t: 'Siehst du? Der erste Kürbis, den ich hier gesetzt hab. Er hat eine Blüte.' },
    { s: 'mika', t: 'Mitten im Herbst?' },
    { s: 'emil', t: 'Er weiß nicht, dass es zu spät ist. Das gefällt mir an ihm.' },
  ],
  emilMoment2: [
    { s: 'emil', t: 'Meine Frau hatte den schönsten Garten im Dorf. Rosen, so groß wie Kohlköpfe.' },
    { s: 'emil', t: 'Als der Moder kam, haben wir die Rosen in Töpfe gesetzt und mitgenommen. Sie hat es nicht geschafft. Die Rosen schon.' },
    { s: 'emil', t: '… Eine davon steht jetzt bei euch am Beet. Hab ich gar nicht erzählt, oder?' },
  ],
  emilMoment3: [
    { s: 'emil', t: 'Hier. Kürbissamen. Von meinen besten.' },
    { s: 'emil', t: 'Im Frühling steckst du sie in die Erde. Dann gibt es wieder Kürbisse. Und Laternen. Und Suppe.' },
    { s: 'mika', t: 'Im Frühling … ob wir den erleben?' },
    { s: 'emil', t: 'Deswegen geb ich sie dir. Damit du daran denkst, dass er kommt.' },
  ],
  friedaMoment1: [
    { s: 'frieda', t: 'Hier, halt mal.' },
    { s: 'mika', t: 'Ein Nagel?' },
    { s: 'frieda', t: 'Der erste, den ich hier geschmiedet hab. Er ist schief.' },
    { s: 'frieda', t: 'Die erste Arbeit an einem neuen Ort teilt man. Alte Schmiederegel. Jetzt ist es unser Nagel.' },
  ],
  friedaMoment2: [
    { s: 'frieda', t: 'Mein Vater war Schmied, sein Vater auch. Alle haben gesagt, eine Tochter kann das nicht.' },
    { s: 'frieda', t: 'Ich hab die Schmiede dann zwanzig Jahre geführt. Jetzt ist sie weg.' },
    { s: 'mika', t: 'Das tut mir leid.' },
    { s: 'frieda', t: 'Muss es nicht. Eine Schmiede ist ein Feuer und zwei Hände. Das Feuer habt ihr. Die Hände hab ich.' },
  ],
  friedaMoment3: [
    { s: 'frieda', t: 'Hier. Ein Hufeisen. Hab ich nur für dich gemacht.' },
    { s: 'frieda', t: 'Man hängt es über die Tür, die Öffnung nach oben – dann fällt das Glück nicht raus.' },
    { s: 'mika', t: 'Und wenn es falsch herum hängt?' },
    { s: 'frieda', t: 'Dann richte ich es. Mit dem Hammer.' },
  ],
  maraMoment1: [
    { s: 'mara', t: 'Komm mit, schnell. Schau da rüber, über den Wald.' },
    { s: 'mika', t: 'Rauch?' },
    { s: 'mara', t: 'Ein Kochfeuer. Weit hinten. Da leben noch Leute.' },
    { s: 'mara', t: 'Ich wollte, dass du es zuerst weißt: Wir sind nicht allein.' },
  ],
  maraMoment2: [
    { s: 'mara', t: 'Ich bin früher nie irgendwo geblieben. Ein Ort, drei Tage, weiter.' },
    { s: 'mara', t: 'Mein Vater hat gesagt: Wer stehen bleibt, verliert. Ich glaube, er hatte nur Angst vor Abschieden.' },
    { s: 'mika', t: 'Und du?' },
    { s: 'mara', t: 'Ich zähle die Tage hier nicht mehr. Das ist neu.' },
  ],
  maraMoment3: [
    { s: 'mara', t: 'Hier. Mein Kompass. Er hat mich überallhin geführt.' },
    { s: 'mara', t: 'Die Nadel zeigt nach Norden. Aber ich weiß jetzt, wo mein Zuhause ist.' },
    { s: 'mara', t: 'Behalt ihn. Ich brauch ihn nicht mehr.' },
  ],
  paulaMoment1: [
    { s: 'paula', t: 'Komm her. Arme hoch.' },
    { s: 'mika', t: 'Paula?' },
    { s: 'paula', t: 'Ein Schal. Aus den Resten von allen hier. Das Blau ist von Junas Jacke, das Rot von Berts Kappe.' },
    { s: 'paula', t: 'Jetzt trägst du alle ein bisschen mit dir herum.' },
  ],
  paulaMoment2: [
    { s: 'paula', t: 'Ich hatte eine Werkstatt voller Stoffe. Seide, Samt, Tweed.' },
    { s: 'paula', t: 'Weißt du, was ich am Ende mitgenommen habe? Eine Nadel, einen Faden, einen Fingerhut.' },
    { s: 'paula', t: 'Mehr braucht man nicht. Alles andere findet sich. So wie ihr.' },
  ],
  paulaMoment3: [
    { s: 'paula', t: 'Hier. Ein Kissen. Aus allen Flicken, die ich hier gemacht habe.' },
    { s: 'paula', t: 'Jeder Flicken ist ein Riss, den wir überstanden haben. Das Karierte war dein Ärmel nach der ersten Nacht.' },
    { s: 'mika', t: 'Es ist wunderschön.' },
    { s: 'paula', t: 'Es ist geflickt. Das ist schöner.' },
  ],
};
