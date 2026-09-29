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
  edda: { name: 'Edda', portrait: 'edda' }, // N4: nur über Funk, als altes Foto
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
  if (state.survivors?.[id]?.stage === 2) return [{ s: id, t: T.wanderer.wartenZeile }];
  return [{ s: id, t: pick(lines, (state.time?.day || 1) + id.length) }];
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
    { s: 'juna', t: 'Erst mal eine Leiter und eine Plattform. Schrott und Holz. Der Rest steht in der Bauleiste, Reiter „Einrichten“.' },
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
  intro: [
    { s: 'mika', blick: 'wald', t: 'Drei Herbste ist es her, seit der Moder aus dem Waldboden kam. Wen er einspinnt, der wird zum Schlurfer: schläfrig, grummelig – und nachts immer dem Licht und der Wärme nach.' },
    { s: 'mika', blick: 'unterholz', t: 'Durchs Unterholz kommen sie nicht. Der Boden dort ist ein einziges Modergeflecht, weich wie Moos und zäh wie Leim. Fest sind nur die alten Holzfällerwege.' },
    { s: 'mika', blick: 'zusammen', karte: true, t: 'Und alle diese Wege laufen hier zusammen, an der alten Holzlände am Stillsee. Früher rollten die Holzfäller hier ihre Stämme ins Wasser.' },
    { s: 'mika', blick: 'haus', t: 'Hinter mir nur Wasser – und Wasser meiden sie. Dazu ein altes Fischerhaus mit Lichterkette und einem richtigen Bett. Hier bleibe ich.' },
    { s: 'mika', blick: 'mika', t: 'Tagsüber mache ich es zu einem Zuhause, nachts halte ich die Wege: Türme daneben, Barrikaden darauf. Vielleicht finden ja noch andere her.' },
    { s: 'mika', t: 'Aber erst brauche ich Werkzeug. Am Hackklotz steckt noch eine Axt.' },
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
  radio: (state) => [
    {
      s: 'mika',
      t: 'Das Funkgerät. Wen rufe ich?',
      antworten: [
        ...(state.flags?.balduinGetroffen ? [{ t: 'Balduin – den Katalog', aktion: 'katalog' }] : []),
        { t: 'Edda …?', aktion: 'edda' },
        { t: 'Radio hören', aktion: 'radioHoeren' },
        { t: 'Niemanden.', standard: true },
      ],
    },
  ],
  // N4: Edda meldet sich – mal knapp, mal mit einem Stück ihrer Geschichte
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
      ],
      state.time.day
    ),
  ],
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
    state.flags.briefkastenGesehen
      ? [{ s: 'mika', t: 'Immer noch leer. Aber nachsehen macht trotzdem Spaß.' }]
      : [{ s: 'mika', t: 'Der Briefkasten ist leer. Noch.' }],

  waesche: [{ s: 'mika', t: 'Die Wäsche ist trocken. Und die Socken passen sogar zusammen. Beinahe.' }],

  regentonne: [{ s: 'mika', t: 'Die Regentonne ist halb voll. Reicht zum Gießen – und für eine Katzenwäsche, wenn es sein muss.' }],

  hackklotz: [{ s: 'mika', t: 'Der Hackklotz. Die Axt habe ich schon eingesteckt.' }],

  axtFund: [
    { s: 'mika', t: 'Eine Axt! Stumpf, aber sie tut’s. Damit kann ich Bäume fällen.' },
    { s: 'mika', t: 'Die Bäume mit dem rot-weißen Band darf ich fällen. Und in den Schrotthaufen findet sich Kram für einen Turm – die Leiste unten rechts zeigt, was geht.' },
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
};
