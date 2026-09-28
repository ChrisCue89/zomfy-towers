// Wellenplan: Wer kommt wann? Jede Nacht hat mehr Wellen, mehr Punkte und
// mehr Leben pro Schlurfer; neue Arten kommen nach und nach dazu (DESIGN.md
// 6.10, OFFENE-FRAGEN.md Nr. 2 und 5). Deterministisch je Nacht (Seed).

import { Rng } from '../core/rng.js';
import { difficultyOf } from './difficulty.js';
import { addChampions } from './champions.js';
import { bossOfNight, bossHpFactor } from './bosses.js';

/** Minuten seit 06:00: erste Welle um 20:30, die Nacht endet um 05:30. */
export const NIGHT_START = 14 * 60 + 30;
export const NIGHT_END = 23 * 60 + 30;
export const DAY_START = 2 * 60; // 08:00
export const DAY_END = 11 * 60; // 17:00

/** Punktekosten je Art (wie viel »Budget« ein Schlurfer verbraucht). */
const COST = { schlurfer: 1, flitzer: 1.2, schwaermer: 0.6, brummer: 5, leuchtpilz: 3 };

/**
 * Welle rufen (M16, OFFENE-FRAGEN 119): Wer die nächste Welle in der Pause selbst
 * ruft, bekommt von ihr so viel mehr Beute – wie das frühe Rufen in den TD-Karten.
 */
export const MUT_BONUS = 1.25;

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
 * Wellenmerkmale (M22, DESIGN 8): Ab Nacht 4 trägt eine Welle je Nacht ein
 * Merkmal, ab Nacht 8 zwei (nie die erste Welle). Der Nachtplan kündigt sie an.
 *   speed  flinke Nacht: so viel schneller
 *   armor  gepanzerter Trupp: jeder Treffer verliert so viel mehr
 *   fog    Nebelwelle: außerhalb von Licht sieht man nur die Augen – Türme treffen nur im Licht
 *   regen/calm  heilende Welle: heilt je s diesen Anteil, wenn ihn `calm` s nichts traf
 *   pulks  Moderflut: so viele Pulks Schwärmer zusätzlich (je `pulk` Stück), dazu je vier Nächte einer mehr
 */
export const WAVE_TRAITS = {
  nebel: { fog: true },
  flink: { speed: 1.3 },
  gepanzert: { armor: 4 },
  heilend: { regen: 0.03, calm: 2 },
  moderflut: { pulks: 2, pulk: 4 },
};
export const WAVE_TRAIT_IDS = Object.keys(WAVE_TRAITS);
/** Ab dieser Nacht; in dieser Nacht ist das erste Merkmal immer die Nebelwelle. */
export const TRAITS_FROM_NIGHT = 4;
/** So lange bleibt ein Schlurfer der Nebelwelle sichtbar, nachdem er das Licht verlassen hat (s). */
export const FOG_SEEN = 1;

/**
 * Neue Arten (M22): ab ihrer Nacht werden Schlurfer und Flitzer einer Welle mit
 * dieser Wahrscheinlichkeit zu einer der neuen Arten (eigener Zufall – die
 * Wellen der ersten Nächte bleiben, wie sie waren).
 */
export const NEW_KINDS = { schildtraeger: 4, moderfalter: 6, graeber: 7, lichtfresser: 8, brueter: 9 };
function addNewKinds(waves, n, seed) {
  const open = Object.keys(NEW_KINDS).filter((t) => n >= NEW_KINDS[t]);
  if (!open.length) return;
  const rng = new Rng(seed * 71 + n * 389);
  const p = Math.min(0.3, 0.1 + 0.02 * (n - 4));
  for (const wave of waves) {
    for (const sp of wave.spawns) {
      if ((sp.type !== 'schlurfer' && sp.type !== 'flitzer') || sp.champion) continue;
      if (rng.chance(p)) sp.type = rng.pick(open);
    }
  }
}

/** Merkmale in den Plan einer Nacht eintragen (eigener Zufall – die Wellen bleiben, wie sie waren). */
function addWaveTraits(waves, n, seed) {
  if (n < TRAITS_FROM_NIGHT || waves.length < 2) return;
  const rng = new Rng(seed * 53 + n * 197);
  const free = waves.map((_, w) => w).filter((w) => w > 0);
  const count = Math.min(n >= 8 ? 2 : 1, free.length);
  for (let k = 0; k < count; k++) {
    const w = free.splice(rng.int(0, free.length - 1), 1)[0];
    const wave = waves[w];
    wave.trait = n === TRAITS_FROM_NIGHT && k === 0 ? 'nebel' : rng.pick(WAVE_TRAIT_IDS);
    if (wave.trait !== 'moderflut') continue;
    // Moderflut: zusätzliche Pulks Schwärmer über die ganze Welle verteilt
    const t = WAVE_TRAITS.moderflut;
    const span = Math.max(8, ...wave.spawns.map((sp) => sp.delay));
    for (let p = 0; p < t.pulks + Math.floor(n / 4); p++) {
      const entry = rng.pick(wave.entries);
      const at = rng.range(0, span);
      for (let q = 0; q < t.pulk; q++) wave.spawns.push({ type: 'schwaermer', entry, delay: at + q * 0.35 });
    }
    wave.spawns.sort((a, b) => a.delay - b.delay);
  }
}

/**
 * Plan einer Nacht.
 * @returns {{night:number, hpFactor:number, waves: Array<{at:number, entries:string[], spawns: Array<{type:string, entry:string, delay:number}>}>}}
 */
/**
 * Punkte der ganzen Nacht: gleichmäßig steigend, unabhängig davon, auf wie
 * viele Wellen sie sich verteilen (m3-r1: 18 → 21 → 46 war ein Sprung).
 * Ab Nacht 2 steiler (m3-r2: »leichter statt schwerer«, das Loot wuchs
 * schneller als die Bedrohung). Nacht 1 bleibt sanft.
 * M8: »keine Herausforderung, schon gar nicht in Nacht 1« – mehr ab Nacht 1.
 * M9: Auf den langen Wegen haben die Türme mehr Zeit – noch etwas mehr.
 * M9.1 (Auftraggeber: »ein Turm und bisschen Handarbeit regelt« Nacht 1): +3.
 * Nacht 1: 33, 2: 43, 3: 55, 4: 69, 5: 85, 8: 145 (M9: 30, 40, 52, 66, 82, 142).
 */
export function nightBudget(n) {
  return 33 + 9 * (n - 1) + (n - 1) ** 2;
}

export function planNight(n, seed, entries, difficulty) {
  const rng = new Rng(seed * 31 + n * 977);
  const diff = difficultyOf(difficulty);
  const count = wavesInNight(n);
  const waves = [];
  let at = NIGHT_START;
  // Spätere Wellen einer Nacht sind größer (Gewichte 0,8 / 1,0 / 1,2 …)
  const weights = Array.from({ length: count }, (_, w) => 0.8 + 0.2 * w);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  for (let w = 0; w < count; w++) {
    const budget = (nightBudget(n) * diff.budget * weights[w]) / weightSum;
    // Eingänge (M16): Nacht 1 eine Seite; ab Nacht 2 oft zwei, ab Nacht 4 manchmal alle –
    // sonst gehörte alles auf den letzten Abschnitt (m12-r1), und das Wegenetz wäre Kulisse
    const first = rng.pick(entries);
    const used = [first];
    // (in Nacht 2 kommt die letzte Welle sicher über zwei Wege – so lernt man es kennen)
    if (n >= 2 && (rng.chance(n >= 3 ? 0.6 : 0.45) || (n === 2 && w === count - 1))) used.push(rng.pick(entries.filter((e) => !used.includes(e))));
    if (n >= 4 && used.length === 2 && entries.length > 2 && rng.chance(0.3)) used.push(rng.pick(entries.filter((e) => !used.includes(e))));
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
    // Gepanzerte: ab Nacht 3 einer in der letzten Welle, ab Nacht 4 in jeder außer der ersten
    if ((n >= 4 && w >= 1) || (n === 3 && w === count - 1)) heavy('brummer', Math.min(3, 1 + Math.floor((n - 3) / 3)));
    if (n >= 6) heavy('leuchtpilz', Math.min(3, 1 + Math.floor((n - 6) / 3)));
    while (left > 0.4) {
      const r = rng.next();
      if (n >= 3 && r < 0.14) add('schwaermer', rng.int(3, 5));
      else if (r < (n >= 2 ? 0.5 : 0.25)) add('flitzer'); // M8: ein paar Flitzer schon in Nacht 1
      else add('schlurfer');
    }
    for (let i = groups.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [groups[i], groups[j]] = [groups[j], groups[i]];
    }
    // Gestaffelt über bis zu 20 Sekunden (M9: vorher 30 – auf den langen Wegen
    // zogen sich die Wellen sonst so auseinander, dass jeder Turm sie einzeln abräumte)
    const span = Math.min(20, 6 + groups.length * 1.1);
    const spawns = [];
    groups.forEach((g, i) => {
      const t = (i / Math.max(1, groups.length - 1)) * span + rng.range(0, 1.2);
      for (let k = 0; k < g.count; k++) spawns.push({ type: g.type, entry: g.entry, delay: t + k * (g.type === 'schwaermer' ? 0.35 : 1.4) });
    });
    // Jede fünfte Nacht führt ein Boss die letzte Welle an (M22; vorher der Anführer)
    if (isLeaderNight(n) && w === count - 1) spawns.push({ type: bossOfNight(n) || 'anfuehrer', entry: used[0], delay: span + 4, hp: bossHpFactor(n) });
    const shuffled = spawns.sort((a, b) => a.delay - b.delay);
    waves.push({ at: Math.round(at), entries: used, spawns: shuffled });
    // Verschnaufpausen zum Einsammeln und Flicken, später dichter (m3-r1: das
    // Warten zwischen den Wellen zog sich)
    at += Math.max(36, 62 - n * 3) + rng.int(-6, 6);
  }
  // Champions (M21): ab Nacht 3 einzelne Schlurfer mit Namen und Merkmalen (eigener Zufall)
  addChampions(waves, n, seed);
  // Neue Arten und Wellenmerkmale (M22): Schildträger, Moderfalter … · Nebelwelle, flinke Nacht … (eigener Zufall)
  addNewKinds(waves, n, seed);
  addWaveTraits(waves, n, seed);
  return { night: n, hpFactor: hpFactor(n) * diff.hp, speedFactor: diff.speed, lootFactor: diff.loot, waves };
}

/**
 * Tagesplan (DESIGN.md 0 Nr. 5): Der Tag ist ruhig – nur ganz vereinzelt ein
 * träger Schlurfer, nie Gruppen oder Wellen (M9: vorher auch kleine Trupps).
 * @returns {Array<{at:number, entry:string, count:number}>}
 */
export function planDay(day, seed, entries) {
  const rng = new Rng(seed * 17 + day * 613);
  const events = [];
  const singles = day <= 1 ? 1 : 2 + (day >= 6 && rng.chance(0.5) ? 1 : 0);
  for (let i = 0; i < singles; i++) events.push({ at: rng.int(DAY_START, DAY_END), entry: rng.pick(entries), count: 1 });
  return events.sort((a, b) => a.at - b.at);
}
