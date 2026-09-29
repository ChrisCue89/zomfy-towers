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

/**
 * Tastatur-Steuerung im Spiel (echte Eingabe über game.input): window.__walkTo(x, z, run) hält je Bild die
 * passenden Richtungstasten (W/A/S/D) gedrückt und gibt die Restentfernung zurück, window.__stop() lässt los.
 */
export function installWalker(rec) {
  return rec.eval(() => {
    const g = window.zomfy.game;
    const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'];
    window.__stop = () => { for (const k of KEYS) g.input.down.delete(k); };
    window.__walkTo = (tx, tz, run = false, eps = 0.12) => {
      const p = g.player.position;
      const dx = tx - p.x;
      const dz = tz - p.z;
      const set = (k, on) => (on ? g.input.down.add(k) : g.input.down.delete(k));
      set('KeyD', dx > eps);
      set('KeyA', dx < -eps);
      set('KeyS', dz > eps);
      set('KeyW', dz < -eps);
      set('ShiftLeft', run);
      return Math.hypot(dx, dz);
    };
    // Route aus Wegpunkten [[x, z], …]: je Bild aufrufen; Zwischenpunkte gelten ab 0,45 m als erreicht, der letzte ab `end` m
    window.__route = (pts, run = false, end = 0.3) => {
      const wp = window.__wp && window.__wp.pts === pts.toString() ? window.__wp : (window.__wp = { pts: pts.toString(), k: 0, done: false });
      if (wp.done) return true;
      const [tx, tz] = pts[wp.k];
      const last = wp.k === pts.length - 1;
      const d = window.__walkTo(tx, tz, run, last ? 0.08 : 0.15);
      if (d < (last ? end : 0.45)) {
        wp.k++;
        if (wp.k >= pts.length) { wp.done = true; window.__stop(); return true; }
      }
      return false;
    };
    window.__key = (code, on = true) => (on ? g.input.down.add(code) : g.input.down.delete(code));
    window.__tap = (code) => g.input.pressedCodes.add(code);
  });
}

/**
 * Lager mit Menschen (für Gruppe A): Tage, Vorräte, Zelte (ins Bild gesetzt), alle Überlebenden eingezogen.
 * Gibt die Ergebnisse der Bauversuche zurück.
 */
export function setupCamp(rec, { day = 8, tents = [[-5, -3], [-4, 3], [4, 2], [7, -1]], ids = ['knopf', 'hilde', 'juna', 'bert', 'yusuf'] } = {}) {
  return rec.eval((a) => {
    const z = window.zomfy;
    const g = z.game;
    z.setDay(a.day);
    z.give({ holz: 200, schrott: 80, stoff: 60, fasern: 80, stein: 60 });
    const res = { tents: [], moved: {} };
    for (const [i, j] of a.tents) res.tents.push(`${i},${j}:${z.build('zelt', i, j)}`);
    for (const id of a.ids) {
      z.setSurvivor(id, 2);
      res.moved[id] = g.survivors.moveIn(id);
    }
    g.survivors.placeAll(true);
    g.survivors.refreshInteractions();
    return res;
  }, { day, tents, ids });
}
