// Dialoge als Daten. Eine Zeile: { s: Sprecher-ID, t: Text, antworten? }.
// Eine Antwort: { t: Text, aktion?: Name einer Spielaktion, standard?: true }.
// `standard` markiert die harmlose Antwort, die vorgewählt ist – schnelles
// Durchdrücken löst so nie aus Versehen Schlafen, Ausruhen oder Ausbauen aus.
// Ein Dialog darf eine Funktion sein, die aus dem Spielzustand die Zeilen wählt.

import { TOWERS } from './towers.js';

export const SPRECHER = {
  mika: { name: 'Mika', portrait: 'mika' },
  radio: { name: 'Radio', portrait: 'radio' },
  schild: { name: 'Wegweiser', portrait: null },
};

const pick = (list, n) => list[((n % list.length) + list.length) % list.length];

/** Uhrzeit in Stunden (0..24) aus dem Spielzustand. */
const hourOf = (state) => (6 + (state.time.minute || 0) / 60) % 24;

/** Bis wann Ausruhen die Uhr vorstellt (Stunden). */
export const REST_TARGET = { wartenAbend: 18.5, wartenNacht: 20.4 };

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
  intro: [
    { s: 'mika', t: 'Eine Lichtung, ein Dach über dem Kopf und ein richtiges Bett. Nach all den Wochen unterwegs fühlt sich das fast wie Luxus an.' },
    { s: 'mika', t: 'Die Notunterkunft ist wacklig, aber sie hält. Und wer auch immer hier vor mir gewohnt hat, hatte ein Herz für Lichterketten.' },
    { s: 'mika', t: 'Nur nachts, heißt es, schlurfen sie aus dem Wald. Bis dahin brauche ich Werkzeug – und einen Turm oder zwei.' },
    { s: 'mika', t: 'Am Hackklotz steckt sogar noch eine Axt. Damit fange ich an.' },
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

  radio: (state) =>
    state.flags.radioGehoert
      ? [
          { s: 'radio', t: '…krrrzzz… …pssshhh…' },
          { s: 'mika', t: pick(['Heute nur Rauschen. Vielleicht morgen wieder.', 'Rauschen. Aber irgendwo da draußen ist jemand. Ich weiß es.', 'Ich drehe am Knopf. Nichts. Na gut.'], state.time.day) },
        ]
      : [
          { s: 'radio', t: '…krrzz… hier ist … Radio Stillwald … falls uns jemand hört …' },
          { s: 'radio', t: '…der alte Funkturm … wenn ihn jemand wieder … krrrzzz…' },
          { s: 'mika', t: 'Da war eine Stimme! Da draußen ist noch jemand.' },
        ],

  ofen: [{ s: 'mika', t: 'Der kleine Ofen bullert vor sich hin. Das beste Geräusch der Welt.' }],

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
        ? [{ s: 'mika', t: 'Mein Lieblingssessel. Mitten auf der Wiese. Genau richtig.' }]
        : [
            { s: 'mika', t: 'Ein Ohrensessel mitten auf der Wiese. Irgendwer hatte hier Prioritäten.' },
            { s: 'mika', t: '…Sehr bequem. Kann ich bestätigen.' },
          ],
      state
    ),

  funkturm: [
    { s: 'mika', t: 'Der alte Funkturm. Oder das, was von ihm übrig ist.' },
    { s: 'mika', t: 'Wenn der wieder stünde – mit einem Licht ganz oben – man würde es über den ganzen Wald sehen.' },
  ],

  schild: [
    { s: 'schild', t: '„Moosbach 12 km →“\n„← Freibad Stillwald – vorübergehend geschlossen“\n„↑ Lichtung. Du bist da.“' },
    { s: 'mika', t: 'Vorübergehend. Na klar.' },
  ],

  briefkasten: (state) =>
    state.flags.briefkastenGesehen
      ? [{ s: 'mika', t: 'Immer noch leer. Aber nachsehen macht trotzdem Spaß.' }]
      : [{ s: 'mika', t: 'Der Briefkasten ist leer. Noch.' }],

  strassenlaterne: [{ s: 'mika', t: 'Die Straßenlaterne ist schon lange aus. Dafür wohnt jetzt ein Vogel oben im Lampenkopf. Gute Wahl.' }],

  waesche: [{ s: 'mika', t: 'Die Wäsche ist trocken. Und die Socken passen sogar zusammen. Beinahe.' }],

  regentonne: [{ s: 'mika', t: 'Die Regentonne ist halb voll. Reicht zum Gießen – und für eine Katzenwäsche, wenn es sein muss.' }],

  hackklotz: [{ s: 'mika', t: 'Der Hackklotz. Die Axt habe ich schon eingesteckt.' }],

  axtFund: [
    { s: 'mika', t: 'Eine Axt! Stumpf, aber sie tut’s. Damit kann ich die jungen Bäume auf der Lichtung fällen.' },
    { s: 'mika', t: 'Die Bäume mit dem rot-weißen Band darf ich fällen. Und in den Schrotthaufen findet sich Kram für einen Turm – die Leiste unten rechts zeigt, was geht.' },
  ],

  werkbankGebaut: [{ s: 'mika', t: 'Eine richtige Werkbank! Hier kann ich eine Spitzhacke bauen – und Überschuss zu Schrott verwerten.' }],

  hausAusbau: [
    {
      s: 'mika',
      t: 'Die Notunterkunft zur Hütte ausbauen? Ein zweites Zimmer, ein richtiges Vordach, dickere Wände.',
      antworten: [{ t: 'Ja, ausbauen!', aktion: 'hausAusbauen' }, { t: 'Noch nicht.', standard: true }],
    },
  ],

  hausFertig: [{ s: 'mika', t: 'Geschafft. Das ist keine Notunterkunft mehr. Das ist eine Hütte. Meine Hütte.' }],

  ersterTurm: [
    { s: 'mika', t: 'Ein Bolzenwerfer. Der schießt von selbst auf alles, was aus dem Wald geschlurft kommt.' },
    { s: 'mika', t: 'Die roten Pünktchen beim Bauen zeigen, wo die Horde langläuft, die Kreuze, wo sie am Haus ankommt – das ist nicht nur vorn an der Tür. Dort gehören Türme hin.' },
    { s: 'mika', t: 'Heute Nacht kommt die Horde. Was sie liegen lässt, sammle ich ein – dafür gibt es neue Türme.' },
  ],

  // Der zweite Satz passt zum Vorrat: Reicht der Schrott schon für einen Turm? (m3-r2)
  abendHorde: (state) => [
    { s: 'mika', t: 'Es wird dunkel. Aus dem Wald kommt ein Stöhnen … Heute Nacht kommt die Horde.' },
    (state.inventory?.schrott || 0) >= TOWERS.bolzen.base[0].cost.schrott
      ? { s: 'mika', t: 'Ohne Turm stehe ich da allein. Schrott habe ich genug – schnell einen bauen, unten in der Bauleiste!' }
      : { s: 'mika', t: 'Ohne Turm stehe ich da allein. Schrott finde ich in den Haufen am Waldrand und im alten Auto.' },
  ],

  // Tagsüber bietet das Bett wenigstens das Ausruhen an (m3-r1: Leerlauf am Tag)
  bettHorde: (state) =>
    restAnswers(state)
      ? withRest([{ s: 'mika', t: 'Schlafen? Nicht, solange die Horde noch kommt. Aber die Beine hochlegen geht.' }], state)
      : [{ s: 'mika', t: 'Schlafen? Nicht, solange die Horde draußen ist. Erst muss die Nacht vorbei sein.' }],

  bank: (state) => withRest([{ s: 'mika', t: 'Eine Bank, selbst gebaut. Sitzt sich gleich doppelt so gut.' }], state),

  beet: [{ s: 'mika', t: 'Ein verwildertes Beet voller Kürbisse. Jemand hat hier mal gegärtnert – und die Kürbisse haben einfach weitergemacht.' }],

  schaukel: [
    { s: 'mika', t: 'Wiiiiieee!' },
    { s: 'mika', t: '…Ich bin erwachsen. Aber es guckt ja keiner.' },
  ],

  baumstamm: [{ s: 'mika', t: 'Ein umgestürzter Baum liegt quer über der Straße. Da komme ich noch nicht durch.' }],

  absperrung: [
    { s: 'mika', t: '„Durchfahrt verboten.“ Die Absperrung steht bestimmt schon seit Jahren hier. Dahinter wuchert alles zu.' },
    { s: 'mika', t: 'Irgendwann schaue ich nach, was dahinter liegt. Heute nicht.' },
  ],

  morgen: (state) => [
    {
      s: 'mika',
      t: pick(
        [
          'Guten Morgen, Lichtung.',
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
