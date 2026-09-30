// Die Insel im Nebel (N7, OFFENE-FRAGEN 194): Hinter den drei Felsinseln (N6) liegt draußen
// im Nordosten eine vierte, die man nur im Morgennebel findet – immer dem Klang von Marthes
// Schiffsglocke nach. Dort leben Marthe, die Bootsbauerin, und ihre Kinder Pim und Lu; ihr
// Kahn leckt. Mit Nägeln und Zucker flickt Marthe ihn, am nächsten Morgen rudern die drei in
// die Bucht. Die Spur: Eddas Funkbuch im Zelt der Nordinsel (N6) oder die dritte Flaschenpost
// (M33). Hier wird abgestimmt; die Texte stehen in T.nebel und dialogs.js.

/** Die Insel: weit draußen im Nordosten (östlich der Karte, dort ist nur noch See). */
export const FOG_ISLE = {
  x: 57.5,
  z: -12.5,
  rx: 4.2, // Halbachsen der Ellipse (m)
  rz: 3.2,
  top: 1 / 16, // Höhe des Inselbodens über dem Wasser (ein Voxel im Maß 1/16)
};

/**
 * Abstand zum Rand der Nebelinsel (negativ: an Land) – fest, nicht aus dem Startwert der
 * Karte: Modell (world/fogIsle.js) und Laufen (map.pushInside) nehmen dieselbe Form.
 */
export function fogIsleEdge(x, z) {
  const dx = x - FOG_ISLE.x;
  const dz = z - FOG_ISLE.z;
  const a = Math.atan2(dz, dx);
  const wobble = 0.32 * Math.sin(a * 3 + 0.8) + 0.18 * Math.sin(a * 5 + 2.1);
  return (Math.hypot(dx / FOG_ISLE.rx, dz / FOG_ISLE.rz) - 1) * 3.4 - wobble;
}

/**
 * Was auf der Insel steht (Stellen auf 1/8 m). Der Anleger liegt im Westen unter der Glocke –
 * wer der Glocke nachrudert, kommt dort an. `moor` ist der Platz des Boots (Bug nach Osten).
 */
export const FOG_SPOTS = {
  bell: { x: 54.625, z: -13.5 }, // Glockengestell am Westufer
  moor: { x: 52.1, z: -12.2 }, // hier liegt Mikas Boot
  shore: { x: 53.875, z: -12.125 }, // hier steht Mika an Land
  hut: { x: 57.5, z: -14.75 }, // Hütte aus Treibholz (hinten)
  tree: { x: 60.0, z: -13.75 }, // Apfelbaum
  fire: { x: 57.125, z: -12.0 }, // Feuerstelle
  line: { x: 59.75, z: -11.25 }, // Wäscheleine (Mitte)
  kahn: { x: 56.75, z: -9.875 }, // Marthes Kahn am Südstrand, längs (Ost–West)
  marthe: { x: 58.25, z: -10.5, facing: -2.2 }, // Marthe am Kahn
  pim: { x: 59.25, z: -12.5, facing: -0.4 },
  lu: { x: 56.125, z: -12.625, facing: 1.2 }, // am Feuer
};

/** Die Glocke: morgens von 07:00 bis 09:30 (Minuten ab 06:00), zwei Schläge in diesem Takt. */
export const BELL = {
  from: 60,
  until: 210,
  every: 3.6, // s zwischen den Doppelschlägen
  mark: 1.4, // s steht die Glocken-Marke am Rand
};

/**
 * Die Nebelfahrt (Modus 'nebelfahrt'): Bis `start` rudert Mika von selbst (zwischen den
 * Felsinseln hindurch hinaus in den Nebel), dann lenkt man mit WASD wie beim Laufen – das
 * Boot dreht sich in die Richtung und nimmt Fahrt auf. Eine Strömung treibt es nach Süden.
 * Wer lange vom Klang weg rudert oder zu weit abtreibt, verliert die Glocke.
 */
export const FOG_TRIP = {
  route: [[20.6, -3.1], [26.5, -2.4], [31.0, -3.2]],
  start: { x: 34.5, z: -4.0 },
  auto: 2.4, // m/s bis zum Start (hinaus)
  speed: 2.0, // m/s mit Ruder
  accel: 1.3, // m/s² (bremsen doppelt so stark)
  turn: 1.9, // rad/s
  drift: 0.3, // m/s nach Süden
  off: 1.25, // rad (gut 70°): so weit vom Klang weg ist »falsch«
  lostAfter: 12, // s falsch, dann ist die Glocke verloren
  maxTime: 100, // s auf dem Wasser, dann auch
  away: 10, // m weiter weg als beim Start: abgetrieben
  land: 2.4, // m vor dem Anleger: Mika legt an
  hit: 0.9, // m: so nah kommt die Bootsmitte an den Inselrand (dann gleitet es daran entlang)
  clear: 2.2, // m freie Sicht rund ums Boot …
  onIsle: 3.4, // … und auf der Insel rund um Mika (das Boot am Anleger bleibt zu sehen)
  course: 3.1, // … auf Kurs etwas mehr
  reveal: 10, // m vor dem Inselrand beginnt die Insel aus dem Nebel zu treten
  fade: 1.6, // s Nebelweiß beim Umkehren und Verlieren
  minutes: 20, // die Fahrt kostet so viel Spielzeit (je Weg)
  lostMinutes: 30,
  home: 12.5 * 60, // um 18:30 rudert Mika von der Insel von selbst zurück
};

/** Kamera auf der Fahrt und auf der Insel: über den See bis weit nach Osten. */
export const FOG_VIEW = { minX: 14, maxX: 64, minZ: -26, maxZ: 8 };

/** Der Seenebel: wie weit er die Bucht verlässt (von x0 bis x1 wird er dicht) und seine Lagen. */
export const SEA_FOG = {
  x0: 25,
  x1: 33,
  isle: 6.5, // m freie Sicht um die Insel, solange Mika dort ist
  layers: [0.35, 0.95, 1.6], // Höhen der Lagen (m)
};

/** Was Marthe für den Kahn braucht (Nägel an der Werkbank, Zucker bei Balduin oder von Hilde). */
export const MEND = { naegel: 1, zucker: 1 };
export const NAILS = { schrott: 3 }; // Werkbank: 3 Schrott → Nägel
export const SUGAR = { teile: 3 }; // Balduin: 3 Zombieteile → Zucker

/**
 * In der Bucht (Stufe 4): Marthes Kahn liegt südlich am Steg (westlich von Balduins Boot), mit
 * dem Heck auf dem Strand; Marthe steht tagsüber am Strand daneben. Die Reuse liegt nördlich
 * am Steg (westlich von Mikas Ruderboot, der Pfahl am Ufer) und gibt jeden Morgen Fisch für den
 * Korb (M33: Balduin nimmt ihn). Die Kinder spielen im Hof zwischen diesen Stellen.
 */
export const BAY_SPOTS = {
  kahn: { x: 14.875, z: 0.625 },
  marthe: { x: 13.125, z: 0.625, facing: Math.PI / 2 }, // am Strand, den Blick auf ihren Kahn
  trap: { x: 14.0, z: -2.375 }, // die Reuse im Wasser nördlich am Steg
  trapUse: { x: 14.0, z: -1.5 }, // hier leert Mika sie (Nordkante des Stegs)
  dockEnd: { x: 12.25, z: -1.0 }, // das Ufer am Anfang des Stegs (von hier laufen die Kinder in den Hof)
  play: [
    [5.5, 2.5],
    [8.0, 3.5],
    [6.5, 5.5],
    [3.5, 4.0],
    [9.5, 1.5],
  ],
  arrive: { from: { x: 34, z: -3 }, time: 22 }, // der Kahn kommt aus dem Nebel (s)
};
export const TRAP = { fish: [1, 2] }; // Fische je Morgen in der Reuse

/** Die drei von der Insel (keine Bewohner mit Platz – sie schlafen in ihrem Kahn, wie Edda im Haus). */
export const FOG_PEOPLE = ['marthe', 'pim', 'lu'];

/** Stufen: 0 nichts bekannt, 1 Spur, 2 dort gewesen (Auftrag), 3 Kahn geflickt, 4 in der Bucht. */
export const FOG_STAGES = 4;

/** Leerer Eintrag (state.isles.fog). */
export function newFog() {
  return { stage: 0, from: 0, lost: 0, arrive: 0, hilde: false, trap: 0, trips: 0 };
}

/** Prüfen und reparieren (sanitizeIsles); `found`/`bottles` geben die Spur alter Stände. */
export function sanitizeFog(raw, { found = [], bottles = 0 } = {}) {
  const out = newFog();
  const int = (v, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : lo);
  if (raw && typeof raw === 'object') {
    out.stage = int(raw.stage, 0, FOG_STAGES);
    out.from = int(raw.from, 0, 99999);
    out.lost = int(raw.lost, 0, 99999);
    out.arrive = int(raw.arrive, 0, 99999);
    out.hilde = raw.hilde === true;
    out.trap = int(raw.trap, 0, 99999);
    out.trips = int(raw.trips, 0, 99999);
  }
  // Wer die Spur schon kennt (Zelt oder dritte Flaschenpost), hört die Glocke
  if (out.stage === 0 && (found.includes('zelt') || bottles >= 3)) out.stage = 1;
  if (out.stage === 3 && !out.arrive) out.arrive = 1;
  return out;
}

/** Läutet die Glocke gerade? (Dialoge und Spiel – nur aus dem Zustand) */
export function bellRings(state) {
  const f = state.isles?.fog;
  if (!f || f.stage < 1 || f.stage > 2) return false;
  const day = state.time.day;
  const m = state.time.minute;
  return day >= f.from && f.lost !== day && m >= BELL.from && m <= BELL.until;
}
