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
    // Angestrebte Zahl an Spielpixel-Zeilen. Der Skalierungsfaktor ist immer ganzzahlig.
    targetLines: 360,
    // 5 Spielpixel pro 1/8-m-Voxel (Breite) -> 40 px pro Meter.
    pxPerMeter: 40,
    // Kameraneigung mit Steigung 3:4 (sin = 0,6; cos = 0,8): Böden 3 px, Wände 4 px pro Voxel.
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
    radius: 0.3,
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
};

export { parseClock };
