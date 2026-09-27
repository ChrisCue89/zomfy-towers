// Wetter (Meilenstein 12, DESIGN.md 3.2 und 6.1): Das Wetter wechselt von Tag zu
// Tag – klar, Wind mit fallendem Laub, Nieselregen, Nebelmorgen – und färbt
// Licht und Klang. Es folgt aus dem Welt-Startwert und dem Tag, braucht also
// keinen Platz im Spielstand. Hier wird abgestimmt: Anteile und Stärken.

import { hash3 } from '../core/rng.js';

/**
 * Wirkung je Wetter (Faktoren auf das Tageslicht aus daynight.js):
 * sun/hemi/shadow = Sonne, Himmelslicht, Schattendeckkraft; exposure, saturation,
 * tint (Faktor je Farbkanal) für den Post-Pass; wind = Stärke im Gras;
 * rain = Regen (0..1); leaves = fallendes Laub; fog = Nebel über dem Land.
 */
export const WEATHER = {
  klar: { sun: 1, hemi: 1, shadow: 1, exposure: 1, saturation: 1, tint: [1, 1, 1], wind: 1, rain: 0, leaves: 0.25, fog: 0 },
  wind: { sun: 0.95, hemi: 1, shadow: 1, exposure: 1, saturation: 1.02, tint: [1, 0.99, 0.98], wind: 2.2, rain: 0, leaves: 1, fog: 0 },
  regen: { sun: 0.3, hemi: 1.05, shadow: 0.45, exposure: 0.93, saturation: 0.8, tint: [0.95, 0.98, 1.05], wind: 1.4, rain: 1, leaves: 0.35, fog: 0.15 },
  nebel: { sun: 0.6, hemi: 1.05, shadow: 0.6, exposure: 1.02, saturation: 0.85, tint: [0.98, 0.99, 1.02], wind: 0.6, rain: 0, leaves: 0.15, fog: 1 },
};
export const WEATHER_KINDS = Object.keys(WEATHER);

/** Die ersten beiden Tage sind klar (Einstieg); danach nach diesen Anteilen. */
export const WEATHER_CHANCES = { klar: 0.45, wind: 0.2, regen: 0.2, nebel: 0.15 };
export const WEATHER_CLEAR_DAYS = 2;

/** Nebel über dem Wasser an jedem Morgen (Stunden) – an Nebeltagen dichter und länger. */
export const MORNING_FOG = { from: 4.5, full: 6, until: 9, fogDayUntil: 11.5, water: 0.55, waterFogDay: 1 };

/** Wetter eines Tages (fest aus Startwert und Tag). */
export function weatherOf(day, seed) {
  if (day <= WEATHER_CLEAR_DAYS) return 'klar';
  let h = hash3(day, 7, 3, seed + 1234);
  for (const kind of WEATHER_KINDS) {
    h -= WEATHER_CHANCES[kind];
    if (h < 0) return kind;
  }
  return 'klar';
}
