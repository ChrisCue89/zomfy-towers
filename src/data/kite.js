// Drachenwetter (N9, OFFENE-FRAGEN 196): An einem windigen Tag wünscht sich Pim einen Drachen.
// Mika bringt Stoff, Schnur (Fasern) und zwei Stöcke (Holz), Marthe baut ihn über Nacht, Lu malt
// Mieze darauf. Danach lassen die Kinder ihn an Wind- und klaren Tagen im Hof steigen – er steht im
// Wind über dem Strand. E bei Pim: Mika hält die Leine; zupft Mika in einer Böe (E im Fenster),
// dreht der Drachen einen Looping. Drei hintereinander sind eine Tat im Herbstbuch. Hier wird
// abgestimmt; die Texte stehen in T.drachen und dialogs.js.

/** Was Marthe für den Drachen braucht: Stoff fürs Segel, Fasern für die Schnur, Holz für die Stäbe. */
export const KITE_NEED = { stoff: 2, fasern: 4, holz: 2 };

/**
 * Wann und wie er fliegt. `from`/`until` in Minuten ab 06:00 (09:30 bis 16:30). Je Wetter: `line`
 * Länge der Leine (m), `elev` Steigwinkel (rad), `sway` Pendeln quer (m), `bob` auf und ab (m),
 * `gusts` Abstand der Böen (s, von–bis), `lift` so viel höher trägt ihn eine Böe (m).
 */
export const KITE = {
  from: 3.5 * 60,
  until: 10.5 * 60,
  weather: {
    wind: { line: 6.2, elev: 0.8, sway: 0.55, bob: 0.22, gusts: [4.5, 7.5], lift: 0.7 },
    klar: { line: 5.0, elev: 0.66, sway: 0.3, bob: 0.12, gusts: [7, 11], lift: 0.4 },
  },
  spot: { x: 8.5, z: 3.25 }, // hier steht Pim im Hof – der Drachen steht im Wind über dem Strand (Osten)
  wind: { x: 1, z: 0 }, // Windrichtung (wie das Laub, core/../world/weather.js)
  rise: 3.5, // s: so lange steigt er nach dem Start bzw. sinkt er am Ende
  gust: 1.6, // s dauert eine Böe
  window: 0.85, // s: so lange zählt ein Zupfen – mittendrin, wenn die Böe am stärksten ist
  loop: 1.3, // s dauert ein Looping
  radius: 0.95, // m: so groß ist die Schleife
  dip: 0.7, // s wackelt er nach einem Zupfen daneben
  loops: 3, // so viele hintereinander: die Tat im Herbstbuch
  near: 10, // kein Schlurfer näher als so viele Meter
  minutes: 20, // danach ist die Uhr so viel weiter (beim Halten steht sie – wie beim Angeln)
  kidsLoop: 0.25, // so oft (je Böe) schaffen die Kinder allein einen Looping
};

/** Stufen: 0 nichts, 1 Pim wünscht sich einen, 2 Mika hat alles gebracht (Marthe baut), 3 fertig. */
export const KITE_STAGES = 3;

/** Leerer Eintrag (state.isles.fog.kite). */
export function newKite() {
  return { stage: 0, day: 0, loops: 0, best: 0, flown: 0 };
}

/** Prüfen und reparieren (sanitizeFog). */
export function sanitizeKite(raw) {
  const out = newKite();
  if (!raw || typeof raw !== 'object') return out;
  const int = (v, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : lo);
  out.stage = int(raw.stage, 0, KITE_STAGES);
  out.day = int(raw.day, 0, 99999);
  out.loops = int(raw.loops, 0, 99999);
  out.best = int(raw.best, 0, 99999);
  out.flown = int(raw.flown, 0, 99999);
  return out;
}

/** Fliegt der Drachen heute bei diesem Wetter? (nur Wind und klar – nie bei Regen, Nebel, Schnee) */
export function kiteWeather(kind) {
  return KITE.weather[kind] || null;
}
