// Mikas Fähigkeiten (M16, DESIGN.md 8): zwei Plätze mit Abklingzeit – der
// erste liegt auf der rechten Maustaste, der zweite auf X. Den Laternenblitz
// hat Mika von Anfang an (Licht macht den Moder müde), die zweite Fähigkeit
// wählt sie auf Stufe 3 aus drei Karten; auf Stufe 6 und 9 schärft sie eine
// der beiden (kürzer warten, stärker wirken). Die Wahl kommt zusätzlich zum
// Perk dieser Stufe. Werte hier, nicht im Code.

export const SKILLS = {
  // Blendet rings um Mika: kurz gelähmt, danach langsamer; bricht jedes Ausholen ab
  laternenblitz: { icon: 'blitz', cooldown: 16, radius: 3.4, stun: 1.1, slow: 0.5, slowTime: 2.5 },
  // Kürbis an den Zeiger: Flächenschaden, die Stelle brennt nach
  kuerbiswurf: { icon: 'wurf', cooldown: 12, range: 7.5, radius: 1.5, damage: 22, burn: 5, burnTime: 3 },
  // Knopf rennt hin und bellt: Wer dort steht, bleibt stehen und starrt ihn an
  pfiff: { icon: 'pfiff', cooldown: 22, range: 9, radius: 2.8, lure: 4, needs: 'knopf' },
  // Ein Brett auf die Barrikade am Zeiger: flickt einen Teil ihrer Haltbarkeit
  notbrett: { icon: 'notbrett', cooldown: 18, reach: 2.8, heal: 0.55 },
  // Türme rings um Mika schießen eine Weile schneller
  anfeuern: { icon: 'anfeuern', cooldown: 24, radius: 6, haste: 0.4, time: 7 },
  // Rundumschlag mit dem, was Mika in der Hand hat: trifft alle ringsum, stößt weit zurück
  wirbel: { icon: 'wirbel', cooldown: 10, reach: 0.45, damage: 1.4, push: 0.9 },
};

export const SKILL_IDS = Object.keys(SKILLS);

/** So lange flammt die Laterne beim Laternenblitz auf (Sekunden). */
export const FLASH_TIME = 0.45;

/** Die erste Fähigkeit (Platz 1, rechte Maustaste). */
export const START_SKILL = 'laternenblitz';

/** Auf diesen Stufen gibt es eine Fähigkeiten-Wahl: erst lernen, dann schärfen. */
export const SKILL_LEVELS = [3, 6, 9];

/** Höchster Rang einer Fähigkeit. */
export const SKILL_MAX_RANK = 3;

/** Wirkung je Rang: Abklingzeit × `cooldown`, Stärke (Dauer, Schaden, Heilung) × `power`. */
export function skillRank(rank) {
  const r = Math.max(1, Math.min(SKILL_MAX_RANK, rank || 1)) - 1;
  return { cooldown: 1 - 0.18 * r, power: 1 + 0.25 * r };
}

/** Wie viele Fähigkeiten-Wahlen bis zur Stufe `level` fällig sind. */
export function skillChoicesDue(level) {
  return SKILL_LEVELS.filter((l) => l <= level).length;
}

/** Wie viele Wahlen schon getroffen sind (zweiter Platz belegt, Ränge über 1). */
export function skillChoicesTaken(skills) {
  const second = skills?.slots?.[1] ? 1 : 0;
  const ranks = Object.values(skills?.ranks || {}).reduce((n, r) => n + Math.max(0, (r || 1) - 1), 0);
  return second + ranks;
}

/** Neutraler Zustand für ein neues Spiel. */
export function freshSkills() {
  return { slots: [START_SKILL, null], ranks: { [START_SKILL]: 1 } };
}
