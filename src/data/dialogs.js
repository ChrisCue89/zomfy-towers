// Dialoge als Daten. Eine Zeile: { s: Sprecher-ID, t: Text, antworten? }.
// Eine Antwort: { t: Text, aktion?: Name einer Spielaktion }.
// Ein Dialog darf eine Funktion sein, die aus dem Spielzustand die Zeilen wählt.

export const SPRECHER = {
  mika: { name: 'Mika', portrait: 'mika' },
  radio: { name: 'Radio', portrait: 'radio' },
  schild: { name: 'Wegweiser', portrait: null },
};

const pick = (list, n) => list[((n % list.length) + list.length) % list.length];

/** Uhrzeit in Stunden (0..24) aus dem Spielzustand. */
const hourOf = (state) => (6 + (state.time.minute || 0) / 60) % 24;

/** Antworten zum Ausruhen, passend zur Tageszeit. */
function restAnswers(state) {
  const h = hourOf(state);
  if (h >= 6 && h < 17.5) return [{ t: 'Bis zum Abend ausruhen', aktion: 'wartenAbend' }, { t: 'Weitermachen' }];
  if (h >= 17.5 && h < 21) return [{ t: 'Bis in die Nacht sitzen bleiben', aktion: 'wartenNacht' }, { t: 'Weitermachen' }];
  return null;
}

function withRest(lines, state) {
  const answers = restAnswers(state);
  if (!answers) return lines;
  const last = lines[lines.length - 1];
  return [...lines.slice(0, -1), { ...last, antworten: answers }];
}

export const DIALOGE = {
  intro: [
    { s: 'mika', t: 'Eine Lichtung, eine Hütte mit Dach und ein richtiges Bett. Nach all den Wochen unterwegs fühlt sich das fast wie Luxus an.' },
    { s: 'mika', t: 'Die Hütte ist wacklig, aber sie hält. Und wer auch immer hier vor mir gewohnt hat, hatte ein Herz für Lichterketten.' },
    { s: 'mika', t: 'Ich sehe mich ein bisschen um. Und heute Abend schlafe ich im eigenen Bett.' },
  ],

  bettFrueh: [
    {
      s: 'mika',
      t: 'Jetzt schon schlafen? Draußen ist es noch hell.',
      antworten: [
        { t: 'Ja, bis morgen.', aktion: 'schlafen' },
        { t: 'Noch nicht.' },
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

  auto: [
    { s: 'mika', t: 'Das Auto fährt schon lange nirgendwo mehr hin. Auf dem Dach wächst Moos, aus der Motorhaube ein Busch.' },
    { s: 'mika', t: 'Bestimmt steckt darin noch brauchbarer Kram. Das schaue ich mir an, wenn ich Werkzeug habe.' },
  ],

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

  hackklotz: [{ s: 'mika', t: 'Eine Axt steckt im Hackklotz. Morgen hacke ich Holz. Ganz bestimmt.' }],

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
          'Ein neuer Tag. Die Hütte steht noch. Das ist ein guter Anfang.',
        ],
        state.time.day
      ),
    },
  ],

  abendHinweis: [{ s: 'mika', t: 'Es wird dunkel. Mit der Laterne sehe ich mehr. (Taste F)' }],

  spaetHinweis: [{ s: 'mika', t: 'Ich sollte bald ins Bett. Morgen ist auch noch ein Tag.' }],
};
