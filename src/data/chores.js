// A1: Die Bucht lebt – das Tagwerk der Bewohner. Tagsüber geht jeder, der eingezogen ist, an
// seinen Arbeitsplatz und tut, was er kann: Hilde strickt auf der Bank am Feuer, Yusuf liest
// gegenüber, Bert spaltet Holz am Hackklotz, Juna funkt am Mast, Knopf schläft mittags am Feuer,
// und die Wanderer arbeiten nach ihrem Beruf. Kommt Mika heran, halten sie inne und schauen auf
// (wer sitzt oder kniet, bleibt, wie er ist). Abläufe in core/chores.js, Posen in
// entities/peopleFigure.js, die Dinge in der Hand in entities/peopleKinds.js (`choreProps`).

import { LAYOUT } from '../world/layout.js';

/**
 * Zeiten und Abstände: Gearbeitet wird von `from` bis `until` (Stunden, innerhalb der Zeit, in der
 * die Menschen draußen sind); `near`: so nah muss Mika kommen, damit jemand innehält; `again`:
 * so lange danach geht die Arbeit weiter; `volume`: Lautstärke der Arbeitsgeräusche.
 */
export const CHORE = {
  from: 8,
  until: 18,
  near: 2.0,
  again: 1.2,
  volume: 0.4,
};

const H = Math.PI / 2;
const fire = LAYOUT.campfire;
const cb = LAYOUT.choppingBlock;

/**
 * Die Arbeiten: Bild (`anim` in PERSON_ANIMS bzw. DOG_ANIMS) und Takt – `beat` ist eine Folge aus
 * [Bild, Sekunden], die sich wiederholt (Bild -1: einfach stehen, etwa zum Nachlegen). `hit`: bei
 * diesem Bild ein Geräusch (`sound`). `still`: dreht sich nicht zu Mika (sitzt, kniet, liegt).
 * `tool`: hält dieses Werkzeug als eigenes Bild (wie eine Waffe). `dry`: nicht im Regen (Wolle,
 * Buch, Papier, Stoff) – dann steht die Figur an ihrem Tagesplatz.
 */
export const ACTS = {
  stricken: { anim: 'stricken', beat: [[0, 0.55], [1, 0.55]], still: true, dry: true },
  lesen: { anim: 'lesen', beat: [[0, 6.5], [1, 0.5]], still: true, dry: true },
  hacken: { anim: 'schwung', tool: 'spaltaxt', beat: [[0, 0.75], [1, 0.12], [2, 0.45], [3, 0.5], [-1, 2.4]], hit: 2, sound: 'hacken' },
  funken: { anim: 'funken', beat: [[0, 3.5], [1, 2.6]] },
  schlafen: { anim: 'schlafen', beat: [[0, 1.7], [1, 1.7]], still: true },
  haemmern: { anim: 'haemmern', beat: [[0, 0.32], [1, 0.24], [0, 0.32], [1, 0.24], [0, 0.32], [1, 0.24], [0, 1.8]], hit: 1, sound: 'hammer' },
  schrauben: { anim: 'schrauben', beat: [[0, 0.5], [1, 0.5], [0, 0.5], [1, 0.5], [0, 1.6]] },
  basteln: { anim: 'basteln', beat: [[0, 1.3], [1, 0.9]], dry: true },
  spaehen: { anim: 'spaehen', beat: [[0, 2.8], [1, 2.8]] },
  netz: { anim: 'netz', beat: [[0, 0.8], [1, 0.6]] },
  pflanzen: { anim: 'pflanzen', beat: [[0, 1.5], [1, 1.0]], still: true },
  ruehren: { anim: 'ruehren', beat: [[0, 0.42], [1, 0.42]] },
  musizieren: { anim: 'musizieren', beat: [[0, 0.62], [1, 0.62]] },
  giessen: { anim: 'giessen', beat: [[0, 1.4], [1, 2.6]] },
  naehen: { anim: 'naehen', beat: [[0, 0.9], [1, 0.7]], dry: true },
};

/**
 * Wer was wo tut: `act` aus ACTS, `at` die Stelle (sonst der Tagesplatz), `facing` die
 * Blickrichtung (0 Süden zur Kamera, π/2 Osten – wer etwas in der rechten Hand führt, schaut nach
 * Osten oder Süden, sonst verdeckte er es), `seat` ein Sitzplatz (Höhe `y`; die Figur geht bis
 * `at` und setzt sich dann), `from`/`until` abweichende Zeiten.
 */
export const CHORES = {
  // Die Stammfiguren
  hilde: { act: 'stricken', at: { x: fire.x - 1.25, z: fire.z + 0.3 }, seat: { x: fire.x - 1.95, z: fire.z + 0.3, y: 0.5 }, facing: H },
  yusuf: { act: 'lesen', at: { x: fire.x + 0.4, z: fire.z - 1.45 }, seat: { x: fire.x + 0.4, z: fire.z - 2.1, y: 0.5 }, facing: 0 },
  bert: { act: 'hacken', at: { x: cb.x - 0.75, z: cb.z }, facing: H }, // im Profil liest sich der Hieb
  juna: { act: 'funken', facing: 0 },
  knopf: { act: 'schlafen', at: { x: fire.x - 0.85, z: fire.z + 1.15 }, facing: H, from: 11, until: 15 },
  // Die Wanderer
  hannes: { act: 'haemmern', at: { x: -6.25, z: -2.75 }, facing: -H }, // am Zaun neben dem Tor
  clara: { act: 'schrauben', at: { x: LAYOUT.wreck.x - 2.3, z: LAYOUT.wreck.z }, facing: H }, // am Bootswrack
  lotte: { act: 'basteln', facing: 0 },
  greta: { act: 'spaehen', facing: -H },
  fiete: { act: 'netz', facing: 0 },
  ida: { act: 'pflanzen', facing: 0 },
  rosa: { act: 'ruehren', facing: 0 },
  anton: { act: 'musizieren', facing: 0 },
  emil: { act: 'giessen', at: { x: LAYOUT.garden.x - 0.5, z: LAYOUT.garden.z + 0.75 }, facing: H }, // am Beet
  frieda: { act: 'haemmern', facing: 0 },
  mara: { act: 'spaehen', facing: -H },
  paula: { act: 'naehen', facing: 0 },
};
