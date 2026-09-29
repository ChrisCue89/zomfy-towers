// Bindung (M29, OFFENE-FRAGEN 171): Aus Mitbewohnern werden Freunde – über
// gemeinsame Zeit, nicht über Geschenke oder Punkte. Vier stille Stufen ohne
// Verfall; keine Zahl im Bild. Jede neue Art gemeinsamer Zeit zählt voll,
// Wiederholungen weniger. Jede Stufe bringt eine Geste und einen
// Bindungsmoment (dialogs.js: `${id}Moment1` … `${id}Moment3`).

/** Stufen: ab so viel gemeinsamer Zeit. 0 fremd · 1 vertraut · 2 befreundet · 3 eng. */
export const BOND_STAGES = [0, 3, 8, 15];

/**
 * Arten gemeinsamer Zeit: `first` beim ersten Mal, `again` jedes weitere Mal,
 * `daily` höchstens einmal am Tag.
 *   karten  ein Kartenabend (M28)
 *   kochen  zusammen gekocht (M29)
 *   feuer   abends zusammen ins Feuer geschaut
 *   reden   das erste Gespräch des Tages
 *   nacht   Seite an Seite: auf dem Posten, die Nacht gehalten
 *   angeln  am Steg (M33)
 *   ueben   zusammen am Übungsplatz (M30)
 */
export const BOND_KINDS = {
  karten: { first: 3, again: 1, daily: true },
  kochen: { first: 3, again: 1, daily: true },
  feuer: { first: 1.5, again: 1, daily: true },
  reden: { first: 0.5, again: 0.5, daily: true },
  nacht: { first: 1, again: 0.5, daily: true },
  angeln: { first: 3, again: 1, daily: true },
  ueben: { first: 2, again: 1, daily: true }, // M30: am Übungsplatz, Mika war dabei
};

/** Wer eine Bindung haben kann: die Stammfiguren und alle Wanderer (Knopf ist ein Hund, aber auch ein Freund). */
export const BOND_PEOPLE_EXTRA = []; // Balduin bleibt Gast vom Wasser (kein Bewohner)

/**
 * Spitznamen für Mika ab »befreundet« (in Gruß und Dialogen, `{spitz}`).
 * Nur Menschen; Knopf wedelt.
 */
export const NICKNAMES = {
  hilde: 'Mikachen',
  juna: 'Käpt’n',
  bert: 'Frischling',
  yusuf: 'Leittier',
  hannes: 'Holzwurm',
  clara: 'Boss',
  lotte: 'Glühwürmchen',
  greta: 'Fuchs',
  fiete: 'Leichtmatrose',
  ida: 'Setzling',
  rosa: 'Schätzchen',
  anton: 'Notenkopf',
  emil: 'Sonnenblume',
  frieda: 'Funke',
  mara: 'Wegweiser',
  paula: 'Fingerhut',
};

/**
 * Erinnerungsstücke (ab »eng«, am Ende des dritten Bindungsmoments): Das Stück
 * steht dann im Regal der Stube. `shelf` = Platz im Regal (von links).
 */
export const KEEPSAKES = {
  knopf: { item: 'ball', shelf: 0 }, // sein Tennisball, grau vor Alter
  hilde: { item: 'posthorn', shelf: 1 }, // vierzig Jahre am Lenker
  juna: { item: 'roehre', shelf: 2 }, // die erste Röhre, die sie allein repariert hat
  bert: { item: 'namensschild', shelf: 3 }, // »Bert – Ihr Fachberater. Fragen Sie mich!«
  yusuf: { item: 'doktorhut', shelf: 4 }, // mit Plüschschaf
  hannes: { item: 'hobel', shelf: 5 }, // vom Großvater
  clara: { item: 'schild', shelf: 6 }, // »Hier wird nichts weggeworfen.«
  lotte: { item: 'papierlaterne', shelf: 7 }, // orange, mit Knopf im Fenster
  greta: { item: 'feder', shelf: 8 }, // Eichelhäher, von Karl
  fiete: { item: 'knoten', shelf: 9 }, // vierzig Jahre auf dem Kutter
  ida: { item: 'zapfen', shelf: 10 }, // von der ältesten Tanne im Revier
  rosa: { item: 'rezeptheft', shelf: 11 }, // mit Fettflecken
  anton: { item: 'mundharmonika', shelf: 12 }, // seine erste, mit sieben
  emil: { item: 'samen', shelf: 13 }, // Kürbissamen für den Frühling
  frieda: { item: 'hufeisen', shelf: 14 }, // Öffnung nach oben
  mara: { item: 'kompass', shelf: 15 }, // »Ich weiß jetzt, wo mein Süden ist.«
  paula: { item: 'kissen', shelf: 16 }, // aus allen Flicken der Bucht
};

/**
 * Wo die Stücke in der Stube stehen (N4: die größere Stube). Voxel des Innenraums
 * (1/16 m; y mit FLOOR = 2 als Boden, ein Stück steht mit der Unterkante auf `y`).
 * Das Erinnerungsregal hängt zwischen Fenster und Kamin – vier Bretter über dem
 * Lesesessel; was nicht aufs Brett gehört, findet seinen eigenen Platz: Zapfen und
 * Feder auf der Fensterbank, das Hufeisen (Öffnung nach oben) am Kamin, Claras
 * Werkstattschild über der Kommode, Lottes Papierlaterne am Fenster (`hang`: Höhe
 * der Gardinenstange). `board`: steht auf einem Brett des Regals.
 */
export const KEEPSAKE_BOARDS = [
  { x0: 253, x1: 272, y: 13 },
  { x0: 253, x1: 272, y: 21 },
  { x0: 253, x1: 272, y: 29 },
  { x0: 253, x1: 272, y: 37 },
];
export const KEEPSAKE_SPOTS = {
  // oberstes Brett
  doktorhut: { x: 256, y: 37, z: 6.5, board: true },
  posthorn: { x: 262.5, y: 37, z: 6.5, board: true },
  roehre: { x: 269.5, y: 37, z: 6.5, board: true },
  // zweites Brett
  hobel: { x: 257, y: 29, z: 6.5, board: true },
  namensschild: { x: 265, y: 29, z: 6.5, board: true },
  ball: { x: 270.5, y: 29, z: 6.5, board: true },
  // drittes Brett
  kissen: { x: 257, y: 21, z: 6.5, board: true },
  knoten: { x: 263.5, y: 21, z: 6.5, board: true },
  samen: { x: 269, y: 21, z: 6.5, board: true },
  // unterstes Brett
  mundharmonika: { x: 256.5, y: 13, z: 6.5, board: true },
  kompass: { x: 263, y: 13, z: 6.5, board: true },
  rezeptheft: { x: 268.5, y: 13, z: 6.5, board: true },
  // eigene Plätze
  zapfen: { x: 239.5, y: 19, z: 4.5 }, // Fensterbank
  feder: { x: 246, y: 19, z: 4.5 }, // Fensterbank
  hufeisen: { x: 289.5, y: 31, z: 12.5 }, // an der Kaminschürze, über dem Sims
  schild: { x: 222, y: 39, z: 4.2 }, // über der Kommode (»gut sichtbar«)
  papierlaterne: { x: 243, y: 30, z: 5.5, hang: 40 }, // am Fenster, an der Gardinenstange
};

/** Gruß am Morgen (ab »vertraut«): höchstens einmal am Tag, wenn Mika näher als so viele Meter kommt. */
export const GREET = { radius: 3.2, from: 30, until: (11 - 6) * 60 }; // Minuten seit 06:00: 06:30 bis 11:00

/** Abends am Feuer (ab »befreundet«): So viele Freunde setzen sich höchstens zu Mika. */
export const FIRE_FRIENDS = 2;

/** Leerer Eintrag je Figur (state.bonds[id]). */
export const emptyBond = () => ({ pts: 0, kinds: {}, last: {}, moment: 0 });

/** Bindungen für einen neuen Spielstand. */
export function newBonds() {
  return {};
}

/** Bindungen prüfen und reparieren (sanitizeState). */
export function sanitizeBonds(raw, ids) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const id of ids) {
    const b = raw[id];
    if (!b || typeof b !== 'object') continue;
    const e = emptyBond();
    e.pts = Number.isFinite(b.pts) ? Math.max(0, Math.min(1e4, b.pts)) : 0;
    for (const k of Object.keys(BOND_KINDS)) {
      if (Number.isFinite(b.kinds?.[k])) e.kinds[k] = Math.max(0, Math.min(1e5, Math.floor(b.kinds[k])));
      if (Number.isFinite(b.last?.[k])) e.last[k] = Math.max(-1, Math.min(1e6, Math.floor(b.last[k])));
    }
    e.moment = Number.isFinite(b.moment) ? Math.max(0, Math.min(3, Math.floor(b.moment))) : 0;
    out[id] = e;
  }
  return out;
}
