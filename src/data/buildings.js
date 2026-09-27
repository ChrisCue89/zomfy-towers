// Bauten der Bauleiste. Kosten in Vorratseinheiten.
// w × d = Grundriss in 1-m-Zellen (bei turns = 1 vertauscht).
// tower: Turm (Stufen, Spezialisierung, siehe towers.js); hp: Haltbarkeit;
// defense: Verteidigung (Abreißen gibt wie bei Türmen nur 70 % zurück);
// onPath: steht nur auf Wegfeldern (Barrikaden). Alles andere steht nie auf
// einem Weg (Meilenstein 9, DESIGN.md 0 Nr. 2 und 3).

import { TOWERS } from './towers.js';

export const BUILDINGS = {
  bolzen: { w: 1, d: 1, tower: true, cost: TOWERS.bolzen.base[0].cost, icon: 'bolzen', hp: 100, height: 1.6 },
  katapult: { w: 1, d: 1, tower: true, cost: TOWERS.katapult.base[0].cost, icon: 'katapult', hp: 100, height: 1.5 },
  sprenger: { w: 1, d: 1, tower: true, cost: TOWERS.sprenger.base[0].cost, icon: 'sprenger', hp: 100, height: 1.4 },
  laternenturm: { w: 1, d: 1, tower: true, cost: TOWERS.laternenturm.base[0].cost, icon: 'laternenturm', hp: 100, height: 2.4 },
  werkbank: { w: 2, d: 1, cost: { holz: 8, stein: 2 }, max: 1, icon: 'werkbank', use: 'werkbank', height: 1.6 },
  barrikade: { w: 1, d: 1, cost: { holz: 1 }, icon: 'barrikade', repeat: true, defense: true, onPath: true, hp: 20, height: 1 },
  laternenpfahl: { w: 1, d: 1, cost: { holz: 2, schrott: 2, stoff: 1 }, icon: 'laternenpfahl', repeat: true, height: 2 },
  beet: { w: 2, d: 1, cost: { holz: 4, fasern: 4 }, icon: 'beet', use: 'ernten', harvest: { fasern: 3 }, height: 0.7 },
  bank: { w: 2, d: 1, cost: { holz: 5 }, icon: 'bank', use: 'bank', max: 3, height: 1 },
  // Meilenstein 6: Schlafplatz für eine Überlebende oder einen Überlebenden
  zelt: { w: 2, d: 2, cost: { holz: 6, stoff: 2 }, icon: 'zelt', max: 4, height: 1.4 }, // m6-r1: 8 Holz, 3 Stoff reichten Mira fünf Tage lang nicht
};

/**
 * Verlorene Nacht: Türme verlieren ein Drittel ihrer Haltbarkeit, aber nie mehr
 * als bis auf diesen Anteil (m7-r1: Nach drei Pechnächten schwiegen sie sonst,
 * und ohne vollen Einsatz kam man aus der Spirale nicht mehr heraus).
 */
export const TOWER_LOSS_FLOOR = 1 / 3;

/**
 * Barrikaden je Stufe (DESIGN.md 6.10): 1 Holzbarriere, 2 verstärkt, 3 Metall.
 * cost = Ausbau auf diese Stufe; block = Anteil jedes Schlags, der abprallt.
 * M9.1 (Auftraggeber: »nur 1 Holz, aber schnell kaputt«): Eine Holzbarriere
 * hält einen Schlurfer rund 8 s auf, einen Trupp oder Brummer 2–3 s – sie
 * bremst, damit die Türme Zeit haben. Die Stufen im selben Verhältnis
 * (M9: 80/170/300 für 3/5/2+6).
 */
export const BARRICADE_LEVELS = [
  null,
  { key: 'holz', hp: 20, cost: { holz: 1 } },
  { key: 'verstaerkt', hp: 55, cost: { holz: 2 } },
  { key: 'metall', hp: 140, cost: { holz: 1, schrott: 4 }, block: 0.25 },
];

/** Wiederaufbau aus Trümmern: dieser Anteil dessen, was in der Barrikade steckt. */
export const BARRICADE_REBUILD = 0.6;

export function barricadeLevel(level) {
  return BARRICADE_LEVELS[Math.max(1, Math.min(BARRICADE_LEVELS.length - 1, Math.floor(level || 1)))];
}

/** Was steckt in einer Barrikade dieser Stufe (alle Stufen zusammen)? */
export function barricadeInvested(level) {
  const total = {};
  for (let l = 1; l <= level; l++) for (const [res, n] of Object.entries(BARRICADE_LEVELS[l].cost)) total[res] = (total[res] || 0) + n;
  return total;
}

/** Volle Haltbarkeit eines Baus (Barrikaden je Stufe). */
export function maxHpOf(b) {
  if (b.type === 'barrikade') return barricadeLevel(b.level).hp;
  return BUILDINGS[b.type].hp || 0;
}

/** Reihenfolge in den Reitern der Bauleiste. */
export const TOWER_TAB = ['bolzen', 'katapult', 'sprenger', 'laternenturm', 'barrikade'];
export const HOME_TAB = ['werkbank', 'laternenpfahl', 'beet', 'bank'];

/** Ausbaustufen des Zuhauses. Stufe 1 = Notunterkunft. */
export const HOUSE_LEVELS = [
  null,
  { key: 'notunterkunft', hp: 300 },
  { key: 'huette', cost: { holz: 30, stein: 12, stoff: 5, schrott: 8 }, hp: 450 },
];

/** Grundriss unter Berücksichtigung der Drehung. */
export function footprint(type, turns = 0) {
  const b = BUILDINGS[type];
  return turns % 2 ? { w: b.d, d: b.w } : { w: b.w, d: b.d };
}
