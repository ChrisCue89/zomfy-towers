// Einstellungen (Meilenstein 7): Lautstärke, Pixelgröße, Textgeschwindigkeit;
// seit M26 auch Wackeln und Blitze (Zugänglichkeit), seit F1 der Look der Schlurfer (seit F2
// standardmäßig 2D), seit F4 der Look der Menschen (Figuren 2D/3D).
// Sie gehören nicht zum Spielstand – eigener Schlüssel im Browser, damit ein
// neues Spiel sie nicht zurücksetzt.

const KEY = 'zomfy-towers.einstellungen';

/**
 * Pixelgröße als Verschiebung des ganzzahligen Maßstabs: klein = mehr Überblick
 * (ein Schritt feiner), groß = näher dran (ein Schritt gröber).
 */
export const PIXEL_SIZES = { klein: -1, mittel: 0, gross: 1 };
/**
 * H4: Größe der Oberfläche als Verschiebung ihres ganzzahligen Faktors – klein = mehr Zeilen
 * (ein Schritt feiner), groß = weniger Zeilen (ein Schritt gröber); nur, solange 270 bis 540
 * Zeilen bleiben (sonst gilt das Fenster wie »mittel«).
 */
export const UI_SIZES = { klein: -1, mittel: 0, gross: 1 };
/** Ansicht draußen (M13): weit = 80 px/m (Standard, Größe wie immer), nah = 160 px/m wie drinnen. */
export const VIEWS = ['nah', 'weit'];
/** Kamerawackeln (M26): aus, halb, voll – Faktoren in `data/feel.js`. */
export const SHAKES = ['aus', 'halb', 'voll'];
/** Blitze (M26): voll oder sanft (der Laternenblitz flammt schwächer auf). */
export const FLASHES = ['voll', 'sanft'];
/** F1/F2: Schlurfer als Voxel (3D) oder als Sprites (2D, seit F2 alle Arten und der Standard). */
export const HORDE_LOOKS = ['3d', '2d'];
/** F4: Mika, die Bewohner, Balduin und Knopf als Voxel (3D) oder als Sprites (2D, Standard). */
export const FIGURE_LOOKS = ['3d', '2d'];
/**
 * Stand der gespeicherten Einstellungen: Mit 2 wurde 2D der Standard der Schlurfer (F2) – ein
 * älterer Stand hatte »3D« nur als alten Standard gespeichert, dort gilt einmal der neue.
 */
const SETTINGS_VERSION = 2;
/** Zeichen pro Sekunde beim Tippen der Dialoge (0 = sofort). */
export const TEXT_SPEEDS = { langsam: 36, normal: 72, schnell: 140, sofort: 0 };

export const DEFAULT_SETTINGS = {
  master: 8, // 0..10
  music: 6,
  sfx: 8,
  pixel: 'mittel',
  ui: 'mittel',
  text: 'normal',
  view: 'weit',
  shake: 'voll',
  flashes: 'voll',
  horde: '2d',
  figuren: '2d',
};

export function loadSettings() {
  const out = { ...DEFAULT_SETTINGS };
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && typeof data === 'object') {
      for (const k of ['master', 'music', 'sfx']) if (Number.isFinite(data[k])) out[k] = Math.max(0, Math.min(10, Math.round(data[k])));
      if (data.pixel in PIXEL_SIZES) out.pixel = data.pixel;
      if (data.ui in UI_SIZES) out.ui = data.ui;
      if (data.text in TEXT_SPEEDS) out.text = data.text;
      if (VIEWS.includes(data.view)) out.view = data.view;
      if (SHAKES.includes(data.shake)) out.shake = data.shake;
      if (FLASHES.includes(data.flashes)) out.flashes = data.flashes;
      if (HORDE_LOOKS.includes(data.horde) && data.v >= 2) out.horde = data.horde;
      if (FIGURE_LOOKS.includes(data.figuren)) out.figuren = data.figuren;
    }
  } catch {
    // kaputt oder gesperrt: Standardwerte
  }
  return out;
}

export function saveSettings(settings) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify({ ...settings, v: SETTINGS_VERSION }));
  } catch {
    // Speicher gesperrt (privates Fenster): Einstellungen gelten nur für diese Sitzung
  }
}

/** Lautstärken für den Klang (0..1). */
export function volumesOf(settings) {
  return { master: settings.master / 10, music: settings.music / 10, sfx: settings.sfx / 10 };
}
