// Gemeinsame Helfer der Aufnahme-Skripte (Gruppe A).
import { Rec } from '../lib.mjs';

export { Rec };

/** Spiel öffnen, Horde aus, Ansicht/Uhrzeit/Wetter wählen. */
export async function openDay(o = {}) {
  const { hour = 8, minute = 0, day = 3, weather = 'klar', ui = 'world', view = 'weit', horde = false } = o;
  const rec = await Rec.open({ ui });
  await rec.eval((a) => {
    const z = window.zomfy;
    z.setDay(a.day);
    z.setTime(a.hour, a.minute);
    z.setWeather(a.weather, true);
    z.setHorde(a.horde);
    z.game.settings.shake = z.game.settings.shake; // unverändert
    if (z.game.view !== a.view) z.game.applySettings({ view: a.view });
  }, { day, hour, minute, weather, view, horde });
  return rec;
}

/** Ansicht nah (160 px/m) oder weit (80 px/m) draußen. */
export function setView(rec, view) {
  return rec.eval((v) => { const g = window.zomfy.game; if (g.view !== v) g.applySettings({ view: v }); else g.applyView(false); }, view);
}

/** Uhrzeit pro Bild festhalten (Spielzeit läuft sonst weiter). */
export function pinTime(rec, hour, minute = 0) {
  return rec.eval((a) => { window.__pin = a; }, { hour, minute });
}

/** Kamerapunkt zu Bild f (wie __setCam interpoliert, weich). */
export function camAt(keys, f, ease = 'smooth') {
  const k = keys;
  if (f >= k[k.length - 1][0]) return [k[k.length - 1][1], k[k.length - 1][2]];
  if (f <= k[0][0]) return [k[0][1], k[0][2]];
  let j = 0;
  while (k[j + 1][0] <= f) j++;
  let u = (f - k[j][0]) / (k[j + 1][0] - k[j][0]);
  if (ease !== 'linear') u = u * u * (3 - 2 * u);
  return [k[j][1] + (k[j + 1][1] - k[j][1]) * u, k[j][2] + (k[j + 1][2] - k[j][2]) * u];
}
