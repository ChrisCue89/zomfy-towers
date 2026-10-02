// Die Stümpfe mit den drei Kreuzen (G6, recherche/storytelling-namen.md 2.7 und 4.1): Die
// Holzhauer schlugen drei Kreuze in jeden Stumpf – für die Moosleute, damit sie Ruhe haben.
// Ein paar alte Stümpfe stehen noch am Waldrand, an den Zuläufen und am Südrand der Bucht.
// Gesetzt wird nach der Natur auf freie Stellen: Der Zufall der Natur bleibt, wie er war.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';
import { createStaticVoxelObject } from '../render/staticMesh.js';
import { FINE32 } from './voxelKit.js';
import { STUMPS } from '../data/wonders.js';

/** Die drei Kreuze auf der Schnittfläche (Mitte in Voxeln; +z liegt im Süden, zur Kamera). */
const CROSSES = [
  [-4, -3],
  [4, -3],
  [0, 4],
];

/**
 * Alter Stumpf (1/32 m, gut 0,65 m breit, 0,375 m hoch): graue, verwitterte Schnittfläche mit
 * Jahresringen und Trockenrissen, drei eingeschlagene Kreuze, Moos am Nordrand, an einer Stelle
 * ist die Rinde abgefallen, im Westen ein Baumschwamm, vier Wurzelansätze.
 */
export function buildCrossStump(seed) {
  const m = new VoxelModel();
  const r = 10.6;
  const H = 12;
  m.cylinder(0, 0, 0, H, r, (x, y, z) => {
    const d = Math.hypot(x + 0.5, z + 0.5);
    const a = Math.atan2(z + 0.5, x + 0.5);
    const moss = hash3(x >> 1, y >> 1, z >> 1, seed + 3) < 0.55;
    if (y === H) {
      if (d > r - 1.3) return z + 0.5 < -r * 0.2 && moss ? P.g4 : P.e3; // Rinde, im Norden bemoost
      if (z + 0.5 < -r * 0.45 && d > r - 3.2 && moss) return P.g3; // Moospolster am Nordrand
      if (d > r - 2.3) return P.e5; // Splint
      if ((Math.abs(a - 2.2) < 0.07 || Math.abs(a + 0.7) < 0.06) && d > 2.2) return P.e2; // Trockenrisse
      if (hash3(x >> 1, 0, z >> 1, seed + 5) < 0.22) return P.s5; // grau verwittert
      return d % 2.6 < 0.8 ? P.e5 : P.e6; // Jahresringe
    }
    // Rinde in senkrechten Platten; im Südosten ist sie abgefallen (graues Holz mit Maserung)
    if (a > 0.25 && a < 1.05 && y >= 3 && y <= H - 2) return (x + z) % 3 === 0 ? P.e4 : P.s5;
    const u = (a / Math.PI) * 10 + 20;
    const f = u - Math.floor(u);
    if (f < 0.2) return P.e1;
    if (z + 0.5 < -r * 0.4 && y < 7 && moss) return y < 3 ? P.g3 : P.g4; // Moos im Norden, unten dichter
    return x + 0.5 < -r * 0.4 ? P.e4 : hash3(Math.floor(u), y >> 1, 0, seed) < 0.35 ? P.e2 : P.e3;
  });
  // Die drei Kreuze: eingeschlagene Kerben (eine Lage tief), an der Nordkante hell ausgefranst
  for (const [cx, cz] of CROSSES) {
    for (let k = -2; k <= 2; k++) {
      for (const [x, z] of [[cx + k, cz + k], [cx + k, cz - k]]) {
        m.set(x, H, z, null);
        m.set(x, H - 1, z, P.e1);
        if (m.get(x, H, z - 1) && Math.abs(k) < 2) m.set(x, H, z - 1, P.e7);
      }
    }
  }
  // Baumschwamm im Westen: eine halbe Scheibe, oben braun, unten cremefarben
  for (let dx = 0; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      if (dx * dx * 0.9 + dz * dz * 0.55 > 5.2) continue;
      const x = -11 - dx;
      m.set(x, 7, dz, dx === 3 || Math.abs(dz) === 3 ? P.e7 : P.e4).set(x, 6, dz, P.e8);
    }
  }
  // Wurzelansätze, nach außen flacher
  for (const [dx, dz] of [[1, 0.25], [-1, -0.3], [0.2, 1], [-0.3, -1]]) {
    for (let t = 0; t <= 4; t++) {
      const x = Math.round(dx * (r - 1 + t));
      const z = Math.round(dz * (r - 1 + t));
      const h = Math.max(0, 3 - t);
      m.box(x - 1, 0, z - 1, x + 1, h, z + 1, (xx, y) => (y === h ? (dz < -0.5 ? P.g4 : P.e4) : P.e3));
    }
  }
  return m;
}

/** Einheitsvektor senkrecht zum Weg am Punkt k (nach links der Laufrichtung). */
function normalAt(points, k) {
  const a = points[Math.max(0, k - 1)];
  const b = points[Math.min(points.length - 1, k + 1)];
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return { x: -(b.z - a.z) / len, z: (b.x - a.x) / len };
}

/** Der Punkt eines Wegs `s` Meter nach seinem Anfang (mit Index) oder null. */
function pointAlong(points, s) {
  let run = 0;
  for (let k = 1; k < points.length; k++) {
    const seg = Math.hypot(points[k].x - points[k - 1].x, points[k].z - points[k - 1].z);
    if (run + seg >= s) return { k, x: points[k].x, z: points[k].z };
    run += seg;
  }
  return null;
}

/**
 * Stellt die Stümpfe auf. Nach der Natur aufrufen (Bäume, Büsche und Felsen stehen schon im
 * Kollisionsraster) und vor dem Bauraster.
 * @returns {{ group: THREE.Group, interactions: Array, spots: Array }}
 */
export function createStumps({ seed, materials, colliders, map, blockers = [] }) {
  const group = new THREE.Group();
  group.name = 'Stümpfe mit drei Kreuzen';
  const spots = [];
  const snap = (v) => Math.round(v * 8) / 8;
  const [near, far] = STUMPS.band;
  const free = (x, z) => {
    if (map.isWater(x, z) || map.onIsland(x, z, -0.5) || map.inBay(x, z)) return false;
    const edge = map.edgeDistance(x, z);
    if (edge < near || edge > far || map.pathDistance(x, z) < 1.5) return false;
    if (colliders.blocks(x, z, STUMPS.free)) return false;
    if (blockers.some((b) => x > b.minX - 0.6 && x < b.maxX + 0.6 && z > b.minZ - 0.6 && z < b.maxZ + 0.6)) return false;
    return !spots.some((s) => Math.hypot(s.x - x, s.z - z) < 3);
  };
  /** Von (x, z) aus in Richtung (nx, nz) bis hinter den Rand des Begehbaren suchen. */
  const probe = (x, z, nx, nz, from, to) => {
    for (let s = from; s <= to; s += 0.25) {
      const px = snap(x + nx * s);
      const pz = snap(z + nz * s);
      if (map.edgeDistance(px, pz) < near) continue;
      for (const extra of [0, 0.25, 0.5]) {
        const qx = snap(px + nx * extra);
        const qz = snap(pz + nz * extra);
        if (free(qx, qz)) return { x: qx, z: qz };
      }
      return null; // der Rand ist hier, aber belegt
    }
    return null;
  };
  // An den Zuläufen: abwechselnd zuerst nördlich und südlich des Wegs (ist die Seite belegt, die andere)
  for (const path of map.paths) {
    if (!path.feeder) continue;
    STUMPS.along.forEach((s, i) => {
      for (const shift of [0, 1.5, -1.5, 3, -3, 4.5, -4.5]) {
        const at = pointAlong(path.points, s + shift);
        if (!at) return;
        const n = normalAt(path.points, at.k);
        const north = n.z < 0 ? 1 : -1;
        const sides = i % 2 === 0 ? [north, -north] : [-north, north];
        for (const side of sides) {
          const spot = probe(at.x, at.z, n.x * side, n.z * side, path.width / 2 + 2, path.width / 2 + 10);
          if (spot) {
            spots.push({ ...spot, where: path.feeder });
            return;
          }
        }
      }
    });
  }
  // Am Südrand der Bucht: vom Hof aus nach Süden bis in den Wald
  for (const start of STUMPS.bay) {
    for (const shift of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
      const spot = probe(start.x + shift, start.z, 0, 1, 0, 4);
      if (spot) {
        spots.push({ ...spot, where: 'bucht' });
        break;
      }
    }
  }
  const interactions = [];
  spots.forEach((s, k) => {
    const object = createStaticVoxelObject(buildCrossStump(seed + 70 + k), materials.world, { turns: 0, seed, size: FINE32, shadow: 'coarse4' });
    object.position.set(s.x, 0, s.z);
    object.name = 'Stumpf mit drei Kreuzen';
    group.add(object);
    colliders.addCircle(s.x, s.z, 0.35, 'stumpf');
    // Ansehen gibt einen Gedanken (nie einen Dialog – hier kommt nachts die Horde vorbei)
    interactions.push({ id: `stumpf-${k}`, x: s.x, z: s.z, radius: STUMPS.radius, prompt: 'ansehen', stump: k });
  });
  return { group, interactions, spots };
}
