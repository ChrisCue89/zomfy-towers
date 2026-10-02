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
    // Drinnen (M11) doppelt so groß: 10 Spielpixel pro 1/16-m-Voxel
    interiorPxPerMeter: 160,
    // Draußen auf Wunsch nah heran (M13, Taste Z): doppelt so groß wie die
    // Übersicht. Nur Vielfache von 80 halten alle Voxelkanten auf dem Pixelraster.
    nearPxPerMeter: 160,
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
    peopleKeep: 0.6, // F6f: wie viel Tageston die Menschen nachts behalten (0 = wie die Welt)
  },
  world: {
    voxel: 1 / 8,
    seed: Number(params.get('seed')) || 20260926,
    // Startwert des Wegenetzes (Meilenstein 9): sonst je neuem Spiel zufällig;
    // die Prüfung spielt immer auf derselben Karte
    mapSeed: params.has('map') ? Number(params.get('map')) >>> 0 : params.has('test') || params.has('playtest') ? 3 : null,
  },
  time: {
    secondsPerGameMinute: 0.4, // M8: 0,6 s zogen sich (ein Tag rund 9 statt 14 Minuten)
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
  // Ansicht draußen (M13): ?zoom=nah|weit erzwingt sie; Standard (und die Prüfung) weit
  view: ['nah', 'weit'].includes(params.get('zoom')) ? params.get('zoom') : params.has('test') ? 'weit' : null,
  // Look der Schlurfer (F2): ?horde=2d|3d erzwingt ihn; die Prüfung und die Playtest-Brücke
  // bleiben bei 3D, solange sie nicht umstellen (ihre übrigen Abschnitte messen Voxel)
  horde: ['2d', '3d'].includes(params.get('horde')) ? params.get('horde') : params.has('test') || params.has('playtest') ? '3d' : null,
  // Look der Menschen (F4): ?figuren=2d|3d erzwingt ihn; Prüfung und Playtest-Brücke bleiben bei 3D
  figuren: ['2d', '3d'].includes(params.get('figuren')) ? params.get('figuren') : params.has('test') || params.has('playtest') ? '3d' : null,
  debug: params.has('debug'),
  // A1: das Tagwerk der Bewohner – in Prüfung und Playtest-Brücke aus (die älteren Abschnitte
  // erwarten die Leute an ihren Tagesplätzen), ?alltag schaltet es dort ein
  chores: params.has('alltag') || !(params.has('test') || params.has('playtest')),
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
