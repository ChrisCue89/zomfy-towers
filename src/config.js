// Zentrale Stellschrauben. Alles, was Look, Tempo oder Balance bestimmt, steht hier.

const params = new URLSearchParams(globalThis.location ? globalThis.location.search : '');

/** "HH:MM" -> Minuten seit 06:00 (Spieltag beginnt um 06:00), sonst null. */
function parseClock(text) {
  if (!text) return null;
  const match = /^(\d{1,2}):?(\d{2})?$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]) % 24;
  const minutes = Number(match[2] || 0) % 60;
  return (((hours - 6) * 60 + minutes) % 1440 + 1440) % 1440;
}

export const CONFIG = {
  render: {
    // Angestrebte Zahl an Spielpixel-Zeilen der Szene. Der Skalierungsfaktor ist
    // immer ganzzahlig: Full HD zeigt die Szene 1:1 (1920×1080, Sicht 24 m),
    // 1440p doppelt (1280×720, Sicht 16 m) – Meilenstein 5.
    targetLines: 900,
    // Die Oberfläche hat ihre eigene, gröbere Leinwand (Schrift und Tafeln
    // bleiben so groß wie bisher).
    uiLines: 360,
    // 10 Spielpixel pro 1/8-m-Voxel und 5 pro 1/16-m-Voxel (Breite) -> 80 px pro Meter.
    pxPerMeter: 80,
    // Kameraneigung mit Steigung 3:4 (sin = 0,6; cos = 0,8): Böden 3 px, Wände 4 px pro 1/16-m-Voxel.
    pitchSin: 0.6,
    pitchCos: 0.8,
    shadowMapSize: 2048,
    shadowRange: 15, // halbe Kantenlänge des Schattenbereichs in Metern
    outlineDepth: 0.22, // Tiefensprung in Metern, ab dem eine Umrisslinie entsteht
    outlineDarken: 0.42,
    edgeHighlight: 0.22,
    normalEdge: 0.45,
    dither: 0.03,
    paletteMix: 1.0,
  },
  world: {
    voxel: 1 / 8,
    seed: Number(params.get('seed')) || 20260926,
  },
  time: {
    secondsPerGameMinute: 0.6,
    newGameMinute: 60, // 07:00
    wakeMinute: 30, // 06:30
    nightStartMinute: 12 * 60, // 18:00 – ab hier darf man ohne Nachfrage schlafen
  },
  player: {
    walkSpeed: 3.0,
    runSpeed: 5.0,
    radius: 0.27, // m3-r1: etwas schlanker, damit man zwischen Bauten durchkommt
    interactRange: 1.6,
  },
  camera: {
    followSharpness: 6,
    lookAhead: 0.6,
    // Blickpunkt liegt etwas nördlich der Figur: Hohes ragt im Bild nach oben.
    focusOffsetZ: -1.0,
  },
  debug: params.has('debug'),
  test: params.has('test'),
  playtest: params.has('playtest'),
  noSave: params.has('nosave'),
  startMinute: parseClock(params.get('time')),
  spawn: params.get('spawn'),
  skipIntro: params.has('nointro') || params.has('test'),
  // Titelbild beim Start (Meilenstein 7); Prüfung und ?nointro/?notitle springen direkt ins Spiel
  showTitle: !(params.has('test') || params.has('nointro') || params.has('notitle')),
};

export { parseClock };
