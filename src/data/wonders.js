// Kleine Wunder (G6, recherche/storytelling-namen.md 4.3 und 5.2): die Stümpfe mit den drei
// Kreuzen am Waldrand, das Blinken vom Sturmhuk, der Eisgesang des Sees und Balduins Plane.
// Keine Balance, kein neuer Spielstand – nur Flags in `state.flags`. Texte in texts.js (T.wunder).

import { WANDERERS } from './wanderers.js';

/**
 * Die Stümpfe mit den drei Kreuzen: an jedem Zulauf so viele Meter vom Spawn entlang des Wegs
 * (abwechselnd nördlich und südlich), dazu Suchstarts am Südrand der Bucht (vorn im Bild; im
 * Norden verdeckten Haus, Birke und Eiche sie). Ein Stumpf steht knapp hinter dem Rand des
 * Begehbaren (`band`, Abstand zum Rand), nie näher als `free` an einem Baum, Busch oder Felsen.
 */
export const STUMPS = {
  along: [10, 18, 26],
  bay: [
    { x: -2.25, z: 10.5 },
    { x: 7.25, z: 10.5 },
  ],
  band: [0.3, 0.9],
  free: 0.8,
  radius: 1.4, // Einblendung »Ansehen«
};

/**
 * Der Leuchtturm am Sturmhuk liegt fern im Nordosten über dem See. Im Bild ist er nie; es zählt
 * nur die Richtung (die Randmarke zeigt dorthin).
 */
export const STURMHUK = { x: 48, z: -100 };

/** Blinkfolge in Sekunden: kurz an, aus, kurz an, aus, lang an, Pause. */
export const BLINK = [0.3, 0.35, 0.3, 0.35, 1.0, 1.7];
export const BLINK_PERIOD = BLINK.reduce((a, b) => a + b, 0);

/**
 * »Gute Nacht, Bucht«: Solange am Sturmhuk jemand ist, blinkt es jeden Abend ab 19:45 (Minuten
 * seit 06:00) dreimal hintereinander – spätestens bis 21:00, und nur, wenn Mika draußen ist.
 */
export const GOODNIGHT = { from: 13 * 60 + 45, until: 15 * 60, rounds: 3 };

/** Balduins Plane: ab diesem Tag liegt etwas Großes unter einer Plane im Boot. */
export const TARP = { fromDay: 20 };

/** Ist Edda zu Hause? (wie `survivors.eddaHome`, M32) */
const eddaHome = (st) => Boolean(st.edda?.home) && st.time.day >= st.edda.home;

/** Ist jemand zum Leuchtturm am Sturmhuk weitergezogen (Clara, M27)? */
export function keeperAtSturmhuk(st) {
  return Object.keys(WANDERERS).find((id) => WANDERERS[id].place === 'leuchtturm' && st.survivors?.[id]?.stage === 4) || null;
}

/**
 * Wer am Sturmhuk die Lampe hält: wer dorthin weitergezogen ist, sonst Edda – aber erst seit der
 * Frostnacht (vorher war die Lampe drei Jahre dunkel) und nur, bis sie heimkommt.
 */
export function sturmhukKeeper(st) {
  const keeper = keeperAtSturmhuk(st);
  if (keeper) return keeper;
  if (st.autumn?.frost && !eddaHome(st)) return 'edda';
  return null;
}
