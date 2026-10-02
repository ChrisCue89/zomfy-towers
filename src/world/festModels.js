// A6: Das Kürbisfest – die Modelle (1/32 m). Die Kürbisbank am Feuer: ein langes Brett auf drei
// Klötzen, hinten auf dem Brett eine Reihe Kürbisse, vorn eine zweite im Gras (die Kürbisse kommen
// aus decoModels.js – geschnitzt mit dem Gesicht ihrer Leute), daneben ein Eimer mit Kernen und ein
// paar Schnitzel. Dazu der Lampion am Stab, den die Leute beim Umzug tragen (Voxel-Figuren; die
// Sprites zeichnen ihn selbst, peopleKinds.js).

import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';
import { hash3 } from '../core/rng.js';
import { boardColor } from './voxelKit.js';
import { lampionOf } from '../data/festival.js';

/**
 * Maße der Bank (Meter, um die Mitte ihres Feldes aus `w` × `d` Zellen): das Brett hinten (`backZ`,
 * Oberkante `seatY`), die Plätze in zwei Reihen zu `slots` im Abstand `step` (alles auf dem
 * 1/8-m-Raster – die Kanten der Kürbisse liegen dann auf Bildpunkten).
 */
export const BENCH = { w: 5, d: 2, seatY: 11 / 32, backZ: -0.5, frontZ: 0.375, slots: 7, step: 0.625 };

/** Platz k (0 … 13): hinten 0–6 auf dem Brett, vorn 7–13 im Gras – je von West nach Ost. */
export function slotPos(k) {
  const front = k >= BENCH.slots;
  const i = k % BENCH.slots;
  return { x: (i - (BENCH.slots - 1) / 2) * BENCH.step, y: front ? 0 : BENCH.seatY, z: front ? BENCH.frontZ : BENCH.backZ };
}

/** Die Bank: ein Brett (4,5 m) auf drei Klötzen, der Eimer mit Kernen, Schnitzel im Gras. */
export function buildPumpkinBench(seed) {
  const m = new VoxelModel();
  const half = 72; // 2,25 m
  const z0 = Math.round(BENCH.backZ * 32) - 6;
  const top = Math.round(BENCH.seatY * 32) - 1;
  // Klötze: kurze Rundhölzer, oben heller Schnitt mit Ringen, Rinde in Rillen
  for (const cx of [-58, 0, 58]) {
    const r = 5.5;
    for (let y = 0; y < top - 1; y++) {
      for (let x = -6; x <= 6; x++) {
        for (let z = -6; z <= 6; z++) {
          const d = Math.hypot(x + 0.5, z + 0.5);
          if (d > r) continue;
          const groove = Math.floor((Math.atan2(z + 0.5, x + 0.5) / Math.PI) * 5 + 10) % 2 === 0;
          let c = groove ? P.e2 : P.e3;
          if (y === top - 2) c = d > r - 1 ? P.e4 : Math.floor(d / 1.6) % 2 ? P.e7 : P.e8; // Schnittfläche (kaum zu sehen)
          else if (x < -2 && !groove) c = P.e4; // Licht von links
          m.set(cx + x, y, z0 + 6 + z, c);
        }
      }
    }
  }
  // Das Brett: zwei Voxel dick, Maserung längs, an der Vorderkante eine helle Kante
  for (let x = -half; x < half; x++) {
    for (let z = z0; z < z0 + 12; z++) {
      for (let y = top - 1; y <= top; y++) {
        let c = boardColor(z - z0, x, seed, { width: 6, tones: [P.e5, P.e6, P.e6], seam: P.e4, grain: 7 });
        if (y < top) c = P.e4;
        if (z === z0 + 11 && y === top) c = P.e7;
        if ((x === -half || x === half - 1) && y === top) c = P.e5;
        m.set(x, y, z, c);
      }
    }
  }
  // Der Eimer mit Kernen am Westende zwischen den Reihen, Holzdauben mit Eisenband
  const bx = -half + 2;
  const bz = 0;
  for (let y = 0; y <= 9; y++) {
    const rr = 4.2 + y * 0.08;
    for (let x = -5; x <= 5; x++) {
      for (let z = -5; z <= 5; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d > rr) continue;
        if (y < 8 && d < rr - 1.2) continue;
        let c = Math.floor((Math.atan2(z + 0.5, x + 0.5) / Math.PI) * 6 + 12) % 2 ? P.e5 : P.e6;
        if (y === 2 || y === 7) c = P.s2; // Eisenbänder
        if (y >= 8 && d < rr - 1.0) c = hash3(x, z, y, seed) > 0.5 ? P.f7 : P.e8; // Kerne obenauf
        m.set(bx + x, y, bz + z, c);
      }
    }
  }
  // Schnitzel und Kerne im Gras vor der Bank
  for (let k = 0; k < 16; k++) {
    const x = Math.round((hash3(k, 1, 0, seed) - 0.5) * 2 * (half - 6));
    const z = z0 + 14 + Math.round(hash3(k, 2, 0, seed) * 14);
    if (k % 3 === 0) m.set(x, 0, z, P.f7); // ein Kern
    else m.set(x, 0, z, P.f4).set(x + 1, 0, z, hash3(k, 3, 0, seed) > 0.5 ? P.f5 : P.f6); // ein Stück Schale
  }
  return m;
}

/** Farben der Lampions: Papier in Orange, Rot, Gelb, Rosa, Türkis. */
export const LAMPION_COLORS = [P.f5, P.r4, P.f6, P.a1, P.a6];

/** Welche Farbe trägt `id` (fest je Person, wie die Sprites: data/festival.js)? */
export function lampionColorOf(id) {
  return LAMPION_COLORS[lampionOf(id)];
}

/**
 * Der Stab in der Hand (im Rahmen des Arms: der Arm hängt entlang −y, die Hand im Ursprung). Er steht
 * quer zum Arm nach vorn – hält die Figur den Arm schräg vor sich, zeigt er nach oben. Länge in Voxeln.
 */
export const LAMPION_STICK = 15;
export function buildLampionStick() {
  const m = new VoxelModel();
  for (let k = 0; k <= LAMPION_STICK; k++) {
    const y = Math.round(k * 0.21);
    m.set(0, y, k, k < 3 ? P.e3 : k % 4 === 0 ? P.e5 : P.e6);
  }
  return m;
}

/**
 * Der Lampion selbst (hängt senkrecht unter der Spitze des Stabs, Ursprung am Haken): ein Draht, oben
 * und unten ein dunkler Rand, dazwischen das Papier in Bahnen (ein eigenes Modell fürs Glühen, in der
 * Farbe des Papiers).
 */
export function buildLampion(color) {
  const frame = new VoxelModel();
  const paper = new VoxelModel();
  for (let y = -3; y <= 0; y++) frame.set(0, y, 0, P.s3); // der Draht
  const cy = -9;
  const rx = 4.4;
  const ry = 5.2;
  for (let y = cy - 6; y <= cy + 6; y++) {
    for (let x = -5; x <= 5; x++) {
      for (let z = -5; z <= 5; z++) {
        const dx = (x + 0.5) / rx;
        const dz = (z + 0.5) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy + dz * dz > 1) continue;
        if (Math.abs(y - cy) >= 4) frame.set(x, y, z, Math.abs(y - cy) >= 5 ? P.e2 : P.r1); // Ränder
        else paper.set(x, y, z, (y - cy + 8) % 3 === 0 ? shadeOf(color) : color); // Bahnen
      }
    }
  }
  return { frame, paper };
}

/** Die Falz zwischen zwei Papierbahnen: eine Stufe dunkler (in der eigenen Rampe). */
function shadeOf(color) {
  const order = [P.f4, P.f5, P.f6, P.f7];
  const i = order.indexOf(color);
  if (i > 0) return order[i - 1];
  if (color === P.r4) return P.r3;
  if (color === P.a1) return P.a0;
  if (color === P.a6) return P.a5;
  return color;
}
