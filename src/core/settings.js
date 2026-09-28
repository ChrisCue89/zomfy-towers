// Einstellungen (Meilenstein 7): Lautstärke, Pixelgröße, Textgeschwindigkeit.
// Sie gehören nicht zum Spielstand – eigener Schlüssel im Browser, damit ein
// neues Spiel sie nicht zurücksetzt.

const KEY = 'zomfy-towers.einstellungen';

/**
 * Pixelgröße als Verschiebung des ganzzahligen Maßstabs: klein = mehr Überblick
 * (ein Schritt feiner), groß = näher dran (ein Schritt gröber).
 */
export const PIXEL_SIZES = { klein: -1, mittel: 0, gross: 1 };
/** Ansicht draußen (M13): weit = 80 px/m (Standard, Größe wie immer), nah = 160 px/m wie drinnen. */
export const VIEWS = ['nah', 'weit'];
/** Zeichen pro Sekunde beim Tippen der Dialoge (0 = sofort). */
export const TEXT_SPEEDS = { langsam: 36, normal: 72, schnell: 140, sofort: 0 };

export const DEFAULT_SETTINGS = {
  master: 8, // 0..10
  music: 6,
  sfx: 8,
  pixel: 'mittel',
  text: 'normal',
  view: 'weit',
};

export function loadSettings() {
  const out = { ...DEFAULT_SETTINGS };
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && typeof data === 'object') {
      for (const k of ['master', 'music', 'sfx']) if (Number.isFinite(data[k])) out[k] = Math.max(0, Math.min(10, Math.round(data[k])));
      if (data.pixel in PIXEL_SIZES) out.pixel = data.pixel;
      if (data.text in TEXT_SPEEDS) out.text = data.text;
      if (VIEWS.includes(data.view)) out.view = data.view;
    }
  } catch {
    // kaputt oder gesperrt: Standardwerte
  }
  return out;
}

export function saveSettings(settings) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Speicher gesperrt (privates Fenster): Einstellungen gelten nur für diese Sitzung
  }
}

/** Lautstärken für den Klang (0..1). */
export function volumesOf(settings) {
  return { master: settings.master / 10, music: settings.music / 10, sfx: settings.sfx / 10 };
}
