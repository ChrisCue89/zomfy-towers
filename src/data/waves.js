// Wellenplan: Wer kommt wann? Jede Nacht hat mehr Wellen, mehr Punkte und
// mehr Leben pro Schlurfer; neue Arten kommen nach und nach dazu (DESIGN.md
// 6.10, OFFENE-FRAGEN.md Nr. 2 und 5). Deterministisch je Nacht (Seed).

import { Rng } from '../core/rng.js';

/** Minuten seit 06:00: erste Welle um 20:30, die Nacht endet um 05:30. */
export const NIGHT_START = 14 * 60 + 30;
export const NIGHT_END = 23 * 60 + 30;
export const DAY_START = 2 * 60; // 08:00
export const DAY_END = 11 * 60; // 17:00

/** Punktekosten je Art (wie viel »Budget« ein Schlurfer verbraucht). */
const COST = { schlurfer: 1, flitzer: 1.2, schwaermer: 0.6, brummer: 5, leuchtpilz: 3 };

export function wavesInNight(n) {
  return Math.min(8, 3 + Math.floor((n - 1) / 2));
}

export function hpFactor(n) {
  return 1 + 0.25 * (n - 1);
}

export function isLeaderNight(n) {
  return n % 5 === 0;
}

/**
 * Plan einer Nacht.
 * @returns {{night:number, hpFactor:number, waves: Array<{at:number, entries:string[], spawns: Array<{type:string, entry:string, delay:number}>}>}}
 */
/**
 * Punkte der ganzen Nacht: gleichmäßig steigend, unabhängig davon, auf wie
 * viele Wellen sie sich verteilen (m3-r1: 18 → 21 → 46 war ein Sprung).
 * Nacht 1: 18, 2: 25, 3: 32, 4: 41, 5: 52, 8: 89.
 */
export function nightBudget(n) {
  return 18 + 6 * (n - 1) + 0.6 * (n - 1) ** 2;
}

export function planNight(n, seed, entries) {
  const rng = new Rng(seed * 31 + n * 977);
  const count = wavesInNight(n);
  const waves = [];
  let at = NIGHT_START;
  // Spätere Wellen einer Nacht sind größer (Gewichte 0,8 / 1,0 / 1,2 …)
  const weights = Array.from({ length: count }, (_, w) => 0.8 + 0.2 * w);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  for (let w = 0; w < count; w++) {
    const budget = (nightBudget(n) * weights[w]) / weightSum;
    // Eingänge: eine Seite, ab Nacht 3 manchmal zwei
    const first = rng.pick(entries);
    const used = n >= 3 && rng.chance(0.5) ? [first, rng.pick(entries.filter((e) => e !== first))] : [first];
    // Gruppen: einzelne Schlurfer oder ein Pulk Schwärmer (kommen dicht beieinander)
    const groups = [];
    let left = budget;
    const add = (type, count = 1) => {
      groups.push({ type, count, entry: used[groups.length % used.length] });
      left -= COST[type] * count;
    };
    // Schwere Arten nur, soweit die Welle sie trägt (Rest bleibt für normale Schlurfer)
    const heavy = (type, wanted) => {
      const fit = Math.floor((left - 2) / COST[type]);
      if (fit > 0) add(type, Math.min(wanted, fit));
    };
    if (n >= 4 && w >= 1) heavy('brummer', Math.min(3, 1 + Math.floor((n - 4) / 3)));
    if (n >= 6) heavy('leuchtpilz', Math.min(3, 1 + Math.floor((n - 6) / 3)));
    while (left > 0.4) {
      const r = rng.next();
      if (n >= 3 && r < 0.14) add('schwaermer', rng.int(3, 5));
      else if (n >= 2 && r < 0.5) add('flitzer');
      else add('schlurfer');
    }
    for (let i = groups.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [groups[i], groups[j]] = [groups[j], groups[i]];
    }
    // Gestaffelt über bis zu 30 Sekunden
    const span = Math.min(30, 8 + groups.length * 1.6);
    const spawns = [];
    groups.forEach((g, i) => {
      const t = (i / Math.max(1, groups.length - 1)) * span + rng.range(0, 1.2);
      for (let k = 0; k < g.count; k++) spawns.push({ type: g.type, entry: g.entry, delay: t + k * (g.type === 'schwaermer' ? 0.35 : 1.4) });
    });
    if (isLeaderNight(n) && w === count - 1) spawns.push({ type: 'anfuehrer', entry: used[0], delay: span + 4 });
    const shuffled = spawns.sort((a, b) => a.delay - b.delay);
    waves.push({ at: Math.round(at), entries: used, spawns: shuffled });
    // Anfangs lange Verschnaufpausen, später dichter
    at += Math.max(40, 74 - n * 3) + rng.int(-8, 8);
  }
  return { night: n, hpFactor: hpFactor(n), waves };
}

/**
 * Tagesplan: einzelne träge Schlurfer und ab Tag 2 ein, zwei kleine Trupps.
 * @returns {Array<{at:number, entry:string, count:number}>}
 */
export function planDay(day, seed, entries) {
  const rng = new Rng(seed * 17 + day * 613);
  const events = [];
  const singles = 2 + Math.min(3, Math.floor(day / 2));
  for (let i = 0; i < singles; i++) events.push({ at: rng.int(DAY_START, DAY_END), entry: rng.pick(entries), count: 1 });
  const groups = day >= 4 ? 2 : day >= 2 ? 1 : 0;
  for (let i = 0; i < groups; i++) events.push({ at: rng.int(DAY_START + 120, DAY_END - 60), entry: rng.pick(entries), count: rng.int(3, 4) });
  return events.sort((a, b) => a.at - b.at);
}
