// Die Lagerglocke (M31, OFFENE-FRAGEN 165–167, 170): die schwerste Entscheidung der
// Nacht – allein halten oder alle rufen. Balduins alte Schiffsglocke hängt am Feuer.
// Läuten geht nur nachts nach einem Durchbruch und einmal je Nacht; dann greifen die
// Bewohner zu ihren Notfallwaffen und kämpfen innerhalb des Walls. Nur dann kann jemand
// fallen – nie auf »Gemütlich«, nie Knopf, und nie ohne Rettungsfenster.
// Hier wird balanciert.

export const BELL = {
  hold: 1.5, // so lange E halten (s)
  // Inszenierung in drei Takten: das Seil spannt sich, ein Schlag Stille, die Fenster gehen an
  pull: 0.8,
  silence: 0.6,
  window: 0.35, // Abstand, mit dem die Fenster nacheinander angehen (s)
  allClear: 20, // so lange nach dem letzten Schlurfer im Lager, dann Entwarnung (s)
  allClearRings: 3,
  near: 1.6, // so nah muss Mika an der Glocke stehen (m)
};

/**
 * Die Bewohner im Kampf (Nr. 167): Leben aus Grund und Übung, ein Treffer nimmt höchstens
 * `maxHit` der Leben (je Schwierigkeit), bei `retreatAt` ziehen sie sich zurück, wenn der
 * Weg frei ist – sonst gehen sie zu Boden (Rettungsfenster `rescue` s, doppelt so schnell mit
 * einem Schlurfer daneben). Mika rettet mit E (`rescueHold` s), Dr. Yusuf stabilisiert alle
 * im Umkreis (`yusuf.radius` m) nach `yusuf.time` s; ist das Lager frei, gelten alle als gerettet.
 */
export const DEFENSE = {
  hpBase: 80,
  hpPerLevel: 20,
  maxHit: { gemuetlich: 0.3, ausgewogen: 0.4, wild: 0.5 },
  retreatAt: 0.25,
  rescue: { gemuetlich: 60, ausgewogen: 60, wild: 40 },
  rescueFastNear: 1.6, // m: so nah steht ein Schlurfer, dann läuft die Zeit doppelt
  rescueHold: 2,
  rescueReach: 1.3, // so nah muss Mika an einem Liegenden stehen (m)
  biteFactor: 2, // Schlurfer schlagen Menschen härter als Holz (Biss mal so viel)
  yusuf: { radius: 6, time: 4 },
  reach: 1.1, // Nahkampf: so nah an den Schlurfer
  seek: 9, // so weit sehen sie einen Schlurfer im Lager (m)
  speed: 2.6, // m/s
  fright: { near: 2, time: 1 }, // Schreck: 1 s Zögern, wenn einer auf 2 m herankommt
  shotRate: 0.8, // Schüsse je Sekunde (Bewohner zielen länger als Mika)
};

/**
 * Nach der Nacht (Nr. 167): erschöpft (hat gekämpft) bis `tiredUntil` Uhr, verletzt (Nacht
 * mit höchstens der Hälfte der Leben beendet) und schwer verletzt (war zu Boden) für so viele
 * Tage je Schwierigkeit; Dr. Yusuf und ein Bett im Haus kürzen »schwer« um je einen Tag. Danach
 * bleibt eine Narbe (nur Aussehen und eine Zeile).
 */
export const WOUNDS = {
  tiredUntil: 12,
  days: { gemuetlich: [1, 2], ausgewogen: [2, 4], wild: [3, 5] }, // [verletzt, schwer verletzt]
};

/** Einstellung »Verluste« (Nr. 166): auf »Gemütlich« immer aus; beim Spielstart wählbar, später nur noch von an nach aus. */
export const LOSSES_DEFAULT = { gemuetlich: false, ausgewogen: true, wild: true };

/** Leerer Eintrag der Lagerglocke (state.bell): Nacht und Tag des Läutens, wartender Bericht. */
export const newBell = () => ({ night: 0, day: 0, report: null });

const WOUND_KINDS = ['erschoepft', 'verletzt', 'schwer'];

/** Wunden prüfen und reparieren (sanitizeState). */
export function sanitizeWounds(raw, people) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const id of people) {
    const w = raw[id];
    if (!w || !WOUND_KINDS.includes(w.kind) || !Number.isFinite(w.until)) continue;
    out[id] = { kind: w.kind, until: Math.max(1, Math.floor(w.until)) };
    if (w.kind === 'erschoepft') out[id].hour = Number.isFinite(w.hour) ? Math.max(0, Math.min(24, w.hour)) : WOUNDS.tiredUntil;
  }
  return out;
}
