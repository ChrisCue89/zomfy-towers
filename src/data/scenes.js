// Geteilte Szenen (M29, OFFENE-FRAGEN 162): zwei Bewohner reden miteinander –
// morgens über die Nacht, abends am Feuer. Statt einer Paar-Matrix haben die
// Szenen Rollenplätze nach Temperament (Wildermyth); wer gerade da ist und
// passt, spielt die Rolle. Sprechblasen über den Köpfen, nie ein Dialog (der
// hielte das Spiel an). Ein Gedächtnis (state.scenes.seen) verhindert, dass
// dieselbe Szene zweimal kommt, solange es andere gibt.
//
// Zeilen: [Rolle, Text] – Rolle 0 oder 1; im Text stehen {a} und {b} für die
// Namen der Rollen. `when`: 'morgen' (nach einer Nacht) oder 'abend' (am
// Feuer, 17–19 Uhr). `need`: Anlass (siehe SCENE_EVENTS), sonst jederzeit.

/** Temperamente der Stammfiguren (die Wanderer haben ihre in wanderers.js). */
export const CORE_TEMPERS = {
  hilde: ['herzlich', 'neugierig'],
  juna: ['ungeduldig', 'vertraeumt'],
  bert: ['stolz', 'wortkarg'],
  yusuf: ['bedaechtig', 'verlaesslich'],
};

/**
 * Anlässe am Morgen, aus dem Bericht der Nacht:
 *   durchbruch  die Horde war im Lager
 *   makellos    niemand kam ans Zuhause
 *   boss        eine Bossnacht gehalten
 *   regen       es hat geregnet
 *   nebel       eine Nebelwelle
 *   verloren    die Nacht ist verloren gegangen
 */
export const SCENE_EVENTS = ['durchbruch', 'makellos', 'boss', 'regen', 'nebel', 'verloren'];

export const SCENES = [
  // --- Morgens: nach der Nacht ------------------------------------------------------
  {
    id: 'torSchuld',
    when: 'morgen',
    need: 'durchbruch',
    roles: [['stolz', 'verlaesslich'], ['herzlich', 'bedaechtig']],
    lines: [
      [0, 'Das Tor. Hätt ich gestern noch flicken sollen.'],
      [1, 'Wir sind alle noch da, {a}. Das Tor flicken wir heute zusammen.'],
      [0, 'Zusammen. Hmpf. Na gut.'],
    ],
  },
  {
    id: 'lagerAufraeumen',
    when: 'morgen',
    need: 'durchbruch',
    roles: [['ungeduldig', 'neugierig'], ['wortkarg', 'verlaesslich']],
    lines: [
      [0, 'Die haben die Werkbank umgeschmissen! Unsere Werkbank!'],
      [1, 'Steht gleich wieder.'],
      [0, 'Und wenn sie heute Nacht wiederkommen?'],
      [1, 'Dann stehen wir auch wieder.'],
    ],
  },
  {
    id: 'keinerKam',
    when: 'morgen',
    need: 'makellos',
    roles: [['ungeduldig', 'vertraeumt'], ['wortkarg', 'bedaechtig']],
    lines: [
      [0, 'Keiner! Nicht einer kam bis ans Tor! Hast du das gesehen, {b}?'],
      [1, 'Gesehen.'],
      [0, 'Und? Und?!'],
      [1, 'Gut gemacht.'],
    ],
  },
  {
    id: 'ruhigeNacht',
    when: 'morgen',
    need: 'makellos',
    roles: [['herzlich', 'vertraeumt'], ['stolz', 'verlaesslich']],
    lines: [
      [0, 'So still war es noch nie. Ich hab die Grillen gehört, mitten in der Nacht.'],
      [1, 'Die Barrikaden haben gehalten. Jede einzelne.'],
      [0, 'Dann danke ich den Barrikaden. Und dir.'],
    ],
  },
  {
    id: 'riesenFall',
    when: 'morgen',
    need: 'boss',
    roles: [['vertraeumt', 'herzlich'], ['neugierig', 'stolz']],
    lines: [
      [0, 'Als er umgefallen ist, hat der Boden gezittert. Ich dachte, der See schwappt über.'],
      [1, 'Ich hab mitgezählt: siebzehn Treffer, bis er lag. Siebzehn!'],
      [0, 'Du hast mitgezählt? Mitten in der Nacht?'],
      [1, 'Einer muss es ja tun.'],
    ],
  },
  {
    id: 'bossMut',
    when: 'morgen',
    need: 'boss',
    roles: [['bedaechtig', 'wortkarg'], ['ungeduldig', 'neugierig']],
    lines: [
      [1, 'Hattest du Angst, {a}?'],
      [0, 'Ja.'],
      [1, 'Echt? Du sahst gar nicht so aus.'],
      [0, 'Deshalb.'],
    ],
  },
  {
    id: 'nasseSocken',
    when: 'morgen',
    need: 'regen',
    roles: [['ungeduldig', 'stolz'], ['herzlich', 'verlaesslich']],
    lines: [
      [0, 'Nasse Socken. Schon wieder. Ich hab keine trockenen mehr.'],
      [1, 'Häng sie ans Feuer. Die trocknen schneller, als du schimpfen kannst.'],
      [0, 'Das ist eine Herausforderung.'],
    ],
  },
  {
    id: 'regenMusik',
    when: 'morgen',
    need: 'regen',
    roles: [['vertraeumt', 'neugierig'], ['wortkarg', 'bedaechtig']],
    lines: [
      [0, 'Hast du den Regen auf den Zeltplanen gehört? Wie ganz viele kleine Trommeln.'],
      [1, 'Und wie das Zelt tropft.'],
      [0, 'Auch das. Aber im Takt!'],
    ],
  },
  {
    id: 'nebelGeister',
    when: 'morgen',
    need: 'nebel',
    roles: [['neugierig', 'vertraeumt'], ['bedaechtig', 'verlaesslich']],
    lines: [
      [0, 'Im Nebel sahen sie aus wie Gespenster. Nur die Augen, sonst nichts.'],
      [1, 'Gespenster klopfen nicht ans Tor. Und im Licht sind sie wieder ganz gewöhnliche Schlurfer.'],
      [0, 'Das ist beruhigend. Glaube ich.'],
    ],
  },
  {
    id: 'verlorenMut',
    when: 'morgen',
    need: 'verloren',
    roles: [['herzlich', 'verlaesslich'], ['vertraeumt', 'ungeduldig']],
    lines: [
      [1, 'Das war furchtbar. Ich hab gedacht, jetzt ist alles vorbei.'],
      [0, 'Ist es nicht. Das Haus steht, wir stehen. Heute bauen wir, und heute Nacht halten wir.'],
      [1, 'Versprochen?'],
      [0, 'Versprochen, {b}.'],
    ],
  },
  // --- Morgens: einfach so ----------------------------------------------------------
  {
    id: 'kaffeeTee',
    when: 'morgen',
    roles: [['stolz', 'ungeduldig'], ['bedaechtig', 'herzlich']],
    lines: [
      [0, 'Gibt es hier irgendwo Kaffee? Echten?'],
      [1, 'Tee. Mit Kamille. Beruhigt.'],
      [0, 'Ich will nicht beruhigt werden, ich will wach werden.'],
      [1, 'Dann trink ihn sehr heiß.'],
    ],
  },
  {
    id: 'mikaSchlaeft',
    when: 'morgen',
    roles: [['herzlich', 'neugierig'], ['wortkarg', 'verlaesslich']],
    lines: [
      [0, 'Schläft Mika eigentlich jemals?'],
      [1, 'Kurz.'],
      [0, 'Man sollte mal nachsehen. Mit einer Decke.'],
      [1, 'Hab ich schon.'],
    ],
  },
  {
    id: 'balduinRaetsel',
    when: 'morgen',
    roles: [['neugierig', 'ungeduldig'], ['bedaechtig', 'vertraeumt']],
    lines: [
      [0, 'Was macht Balduin eigentlich mit den ganzen Zombieteilen?'],
      [1, 'Vielleicht baut er sich einen Freund.'],
      [0, 'Das ist das Unheimlichste, was ich heute gehört habe.'],
      [1, 'Es ist noch früh.'],
    ],
  },
  {
    id: 'kuerbisStreit',
    when: 'morgen',
    roles: [['stolz', 'wortkarg'], ['vertraeumt', 'herzlich']],
    lines: [
      [1, 'Ich finde, der große Kürbis sollte ein Gesicht bekommen. Ein freundliches.'],
      [0, 'Der wird Suppe.'],
      [1, 'Man kann doch keine Suppe essen, die einen anlächelt!'],
      [0, 'Doch. Schmeckt genauso.'],
    ],
  },
  // --- Abends am Feuer -------------------------------------------------------------
  {
    id: 'sterne',
    when: 'abend',
    roles: [['vertraeumt', 'neugierig'], ['wortkarg', 'bedaechtig']],
    lines: [
      [0, 'Da, das Sternbild. Sieht aus wie eine Kanne.'],
      [1, 'Großer Wagen.'],
      [0, 'Ich finde, Kanne passt besser.'],
      [1, '… Kanne.'],
    ],
  },
  {
    id: 'frueher',
    when: 'abend',
    roles: [['herzlich', 'bedaechtig'], ['ungeduldig', 'stolz']],
    lines: [
      [0, 'Was hast du früher abends gemacht, {b}? Vor alledem?'],
      [1, 'Ferngesehen. Geschimpft. Eingeschlafen.'],
      [0, 'Und jetzt?'],
      [1, 'Ins Feuer gesehen. Geschimpft. Eingeschlafen. Ist gar nicht so anders.'],
    ],
  },
  {
    id: 'lieblingsgeraeusch',
    when: 'abend',
    roles: [['vertraeumt', 'herzlich'], ['verlaesslich', 'neugierig']],
    lines: [
      [0, 'Mein Lieblingsgeräusch ist das Knacken, wenn ein Scheit ins Feuer fällt.'],
      [1, 'Meins ist die Stille, wenn die letzte Welle vorbei ist.'],
      [0, 'Die ist auch schön. Aber man kann sie schlecht nachmachen.'],
    ],
  },
  {
    id: 'beibringen',
    when: 'abend',
    roles: [['ungeduldig', 'neugierig'], ['bedaechtig', 'wortkarg']],
    lines: [
      [0, 'Bringst du mir bei, was du kannst? Alles? Heute noch?'],
      [1, 'Geduld zuerst.'],
      [0, 'Und dann?'],
      [1, 'Dann Geduld. Dann der Rest.'],
    ],
  },
  {
    id: 'morgenPlan',
    when: 'abend',
    roles: [['verlaesslich', 'stolz'], ['vertraeumt', 'herzlich']],
    lines: [
      [0, 'Morgen setzen wir die Barrikade am Nordweg neu. Früh.'],
      [1, 'Und danach backen wir was. Irgendwas mit Kürbis.'],
      [0, 'Erst die Barrikade.'],
      [1, 'Erst die Barrikade. Dann der Kürbis. Abgemacht.'],
    ],
  },
  {
    id: 'moderLeise',
    when: 'abend',
    roles: [['neugierig', 'bedaechtig'], ['herzlich', 'vertraeumt']],
    lines: [
      [0, 'Glaubst du, der Moder schläft irgendwann?'],
      [1, 'Alles schläft irgendwann. Sogar {a}, wenn man lange genug wartet.'],
      [0, 'Ich schlafe nie.'],
      [1, 'Du schnarchst.'],
    ],
  },
];
