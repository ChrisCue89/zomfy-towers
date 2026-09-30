// Die Inseln im See (N6, Wunsch des Auftraggebers vom 29.09.: »mit einem Boot zu anderen
// Inseln Abenteuer erleben«, OFFENE-FRAGEN 193): Mikas Ruderboot (seit N5 nördlich am
// Steg) fährt tagsüber zu den drei Felsinseln. Jede hat etwas zu finden; wer auf einer
// Insel ist, läuft nur auf ihr (map.pushInside mit `isle`). Hier wird balanciert.

/** Wann und wie gerudert wird. */
export const TRIP = {
  from: 60, // ab 07:00 (Minuten ab 06:00)
  until: 11.5 * 60, // bis 17:30 – danach bleibt das Boot am Steg
  home: 12.5 * 60, // um 18:30 rudert Mika von einer Insel von selbst zurück
  speed: 1.9, // m/s über das Wasser
  turn: 2.2, // so schnell dreht das Boot (rad/s) – am Steg liegt es mit dem Bug zum Ufer
  minutes: 15, // so lange dauert eine Fahrt in Spielzeit
  near: 10, // kein Schlurfer näher als so viele Meter
  reach: 1.1, // Bootsmitte bis Bug (m): so weit liegt das Boot vor dem Inselrand
  mooring: { x: 16.6, z: -2.7 }, // der Platz des Boots am Steg (ARRIVAL.moor)
  dock: { x: 16.6, z: -1.45 }, // hier steigt Mika am Steg ein und aus
};

/**
 * Die drei Inseln (ISLANDS in world/map.js, gleiche Reihenfolge). `side` zeigt von der
 * Inselmitte zum Anleger (das Boot legt dort mit dem Bug zur Insel an, core/isles.js
 * sucht den Rand), `shore` ist, wo Mika an Land steht (sicher auf der Insel, auch wenn
 * ihr Rand je Karte ein wenig anders ausfällt), `via` sind Wegpunkte ab dem Steg – um
 * das Stegende herum, nie über Balduins Anleger. Zurück geht es dieselben Punkte rückwärts.
 */
export const ISLES = {
  nord: { index: 0, side: { x: -0.99, z: 0.12 }, shore: { x: 21.0, z: -8.375 }, via: [[17.3, -5.6]] },
  mitte: { index: 1, side: { x: -0.68, z: -0.73 }, shore: { x: 25.75, z: 4.125 }, via: [[20.6, -3.1], [22.6, -1.4]] },
  sued: { index: 2, side: { x: 0, z: -1 }, shore: { x: 20.5, z: 11.75 }, via: [[20.6, -3.1], [22.6, -1.2], [22.4, 3.5], [20.8, 7.0]] },
};
export const ISLE_ORDER = ['nord', 'mitte', 'sued'];

/**
 * Was es auf den Inseln gibt: `gives` landet im Vorrat, `chest` ist eine Fundkiste
 * (Turmteil), `cat` die Katze (kommt mit nach Hause), `bench` eine Bank mit Aussicht
 * (immer wieder – ein Gedanke), `note` ein Zettel (Karte wie ein Brief), `home` stellt
 * etwas vor das Haus. Stellen auf 1/8 m, sicher an Land (auch wenn der Rand der Insel
 * je Karte ein wenig anders ausfällt) und fern der Signalfeuer (data/network.js).
 */
export const FINDS = {
  zelt: { isle: 'nord', x: 22.25, z: -9.25, note: 'zelt', clear: 1.1 },
  netz: { isle: 'nord', x: 23.375, z: -9.0, gives: { fasern: 8, stoff: 1 }, clear: 0.9 },
  bank: { isle: 'mitte', x: 27.25, z: 3.875, bench: true, clear: 1.0 },
  kiste: { isle: 'mitte', x: 28.5, z: 5.25, chest: true, clear: 0.8 },
  kuerbisse: { isle: 'sued', x: 21.25, z: 12.25, gives: { fasern: 3 }, home: true, clear: 0.8 },
  katze: { isle: 'sued', x: 19.875, z: 13.0, cat: true, clear: 0.6 },
};
export const FIND_ORDER = ['zelt', 'netz', 'bank', 'kiste', 'kuerbisse', 'katze'];

/** Das Boot hat Mika hergebracht (N5), aber es leckt: so viel kostet das Abdichten. */
export const REPAIR = { holz: 8, fasern: 4 };

/** Solange Mika auf dem See oder einer Insel ist, darf die Kamera so weit nach Osten. */
export const ISLE_VIEW = { maxX: 27.5 };

/** Die Katze wohnt danach vor der Haustür (Veranda, rechts der Tür) und macht es gemütlicher. */
export const CAT = { x: 7.375, z: -5.0, cozy: 1 };
/** Die wilden Kürbisse von der kleinen Insel: links neben der Haustür. */
export const HOME_PUMPKINS = { x: 5.125, z: -5.0 };

/** Wo auf den Inseln keine Tanne wachsen darf (Fundstellen und Landeplätze), für world/nature.js. */
export function isleClearings() {
  const finds = FIND_ORDER.map((id) => ({ x: FINDS[id].x, z: FINDS[id].z, r: FINDS[id].clear }));
  return [...finds, ...ISLE_ORDER.map((id) => ({ x: ISLES[id].shore.x, z: ISLES[id].shore.z, r: 0.75 }))];
}

/** Leerer Eintrag (state.isles): Boot abgedichtet, besuchte Inseln, Gefundenes, Katze. */
export function newIsles() {
  return { boat: false, visited: [], found: [], cat: false };
}

/** Prüfen und reparieren (sanitizeState). */
export function sanitizeIsles(raw) {
  const out = newIsles();
  if (!raw || typeof raw !== 'object') return out;
  out.visited = Array.isArray(raw.visited) ? [...new Set(raw.visited.filter((id) => ISLES[id]))] : [];
  out.found = Array.isArray(raw.found) ? [...new Set(raw.found.filter((id) => FINDS[id]))] : [];
  out.cat = raw.cat === true || out.found.includes('katze');
  out.boat = raw.boat === true || out.visited.length > 0;
  return out;
}
