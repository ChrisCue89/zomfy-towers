// Natur: Bäume, Büsche, Steine, Gras und Blumen als Voxel-Modelle – im
// Herbst (Meilenstein 9): Laub in Orange, Rot und Gelb, dazwischen dunkle
// Tannen. Der Wald wächst dort, wo die Karte nicht begehbar ist; am Saum
// stehen Büsche, auf Wiese und Hof Gras. Viele gleiche Modelle werden als
// InstancedMesh in räumlichen Blöcken gezeichnet, damit die Kamera nur die
// sichtbaren Blöcke rendert.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3, Rng, fbm, valueNoise } from '../core/rng.js';
import { LAYOUT, snapV } from './layout.js';
import { MAP, ISLANDS } from './map.js';

/** Laubfarben (dunkel → hell) für Kronen. */
export const LEAVES = {
  gruen: [P.g3, P.g4, P.g5, P.g6, P.g7],
  orange: [P.r2, P.f2, P.f3, P.f4, P.f5],
  rot: [P.r0, P.r1, P.r2, P.r3, P.f3],
  gelb: [P.e6, P.e7, P.f5, P.f6, P.f7],
};
import { SHADOW_LAYER, SHADOW_PROXY_MATERIAL, shadowGeometry } from '../render/staticMesh.js';

// --- Modelle ---------------------------------------------------------------

export function buildFir(seed, scale = 1) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const trunkTop = Math.round(6 * scale);
  m.box(-1, 0, -1, 0, trunkTop + 3, 0, (x, y, z) => (hash3(x, y, z, seed) < 0.3 ? P.e3 : P.e2));
  const tiers = [
    [12, 8, 8],
    [10, 6, 8],
    [8, 4, 7],
    [6, 2, 7],
    [3, 0, 5],
  ].map(([r0, r1, h]) => [r0 * scale, r1 * scale, Math.max(3, Math.round(h * scale))]);
  let y = trunkTop;
  for (const [r0, r1, h] of tiers) {
    const wobble = rng.range(-0.6, 0.6);
    for (let k = 0; k < h; k++) {
      const t = h > 1 ? k / (h - 1) : 1;
      const r = Math.max(0.6, r0 + (r1 - r0) * t + (k === 0 ? wobble : 0));
      const yy = y + k;
      for (let x = Math.floor(-r); x <= Math.ceil(r); x++) {
        for (let z = Math.floor(-r); z <= Math.ceil(r); z++) {
          const dx = x + 0.5;
          const dz = z + 0.5;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d > r) continue;
          const hsh = hash3(x, yy, z, seed);
          // Ausgefranster Rand
          if (d > r - 1 && hsh < 0.28) continue;
          let c = t < 0.3 ? P.t1 : t < 0.7 ? P.t2 : P.t3;
          if (d > r - 1.5 && t > 0.5) c = P.t3;
          if (hsh > 0.9) c = P.t4;
          else if (hsh < 0.08) c = P.t0;
          m.set(x, yy, z, c);
        }
      }
    }
    y += h - 3;
  }
  m.box(-1, y + 2, -1, 0, y + 3, 0, P.t3);
  return m;
}

export function buildDeciduous(seed, scale = 1, leaves = LEAVES.gruen) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const trunkH = Math.round(11 * scale);
  // Stamm mit Wurzelansatz
  m.box(-1, 0, -1, 1, trunkH, 1, (x, y, z) => (hash3(x, y, z, seed) < 0.25 ? P.e3 : P.e2));
  m.set(-2, 0, 0, P.e2).set(2, 0, -1, P.e2).set(0, 0, 2, P.e3).set(-1, 0, -2, P.e2);
  // Äste
  m.line(0, trunkH - 3, 0, -5, trunkH + 2, 1, P.e2);
  m.line(0, trunkH - 2, 0, 5, trunkH + 3, -2, P.e2);
  // Krone aus mehreren Blobs
  const cy = trunkH + 7 * scale;
  const blobs = [
    [0, cy, 0, 10, 7.5, 10],
    [rng.range(-7, -5), cy - 2, rng.range(-3, 3), 7, 6, 7],
    [rng.range(5, 7), cy - 1, rng.range(-3, 3), 7, 6, 7],
    [rng.range(-2, 2), cy + 4, rng.range(-2, 3), 7, 5, 7],
  ];
  for (const [bx, by, bz, rx, ry, rz] of blobs) {
    m.ellipsoid(bx, by, bz, rx * scale, ry * scale, rz * scale, (x, y, z, dx, dy) => {
      const hsh = hash3(x, y, z, seed + 1);
      const edge = dx * dx + dy * dy > 0.7;
      if (edge && hsh < 0.3) return null;
      let c = dy > 0.45 ? leaves[3] : dy > 0 ? leaves[2] : dy > -0.45 ? leaves[1] : leaves[0];
      if (hsh > 0.93) c = dy > 0.2 ? leaves[4] : leaves[2];
      else if (hsh < 0.06) c = leaves[0];
      return c;
    });
  }
  return m;
}

export function buildBirch(seed, scale = 1, leaves = [P.g5, P.g6, P.g7, P.g8]) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const trunkH = Math.round(20 * scale);
  m.box(-1, 0, -1, 0, trunkH, 0, (x, y, z) => {
    const hsh = hash3(0, y, 0, seed);
    if (hsh < 0.18) return P.s1;
    return hash3(x, y, z, seed) < 0.3 ? P.s8 : P.s9;
  });
  const blobs = [
    [0, trunkH + 1, 0, 6, 5, 6],
    [rng.range(-4, -3), trunkH - 4, rng.range(-2, 2), 4.5, 4, 4.5],
    [rng.range(3, 4), trunkH - 3, rng.range(-2, 2), 4.5, 4, 4.5],
    [0, trunkH + 5, 0, 4, 3.5, 4],
  ];
  for (const [bx, by, bz, rx, ry, rz] of blobs) {
    m.ellipsoid(bx, by, bz, rx * scale, ry * scale, rz * scale, (x, y, z, dx, dy) => {
      const hsh = hash3(x, y, z, seed + 3);
      if (dx * dx + dy * dy > 0.6 && hsh < 0.35) return null;
      let c = dy > 0.3 ? leaves[2] : dy > -0.3 ? leaves[1] : leaves[0];
      if (hsh > 0.9) c = leaves[3];
      return c;
    });
  }
  return m;
}

export function buildBush(seed, size = 1, berries = false, leaves = [P.g4, P.g5, P.g6, P.g7]) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const rx = rng.range(4.5, 6.5) * size;
  const ry = rng.range(3, 4.5) * size;
  const rz = rng.range(4, 5.5) * size;
  m.ellipsoid(0, ry * 0.75, 0, rx, ry, rz, (x, y, z, dx, dy) => {
    const hsh = hash3(x, y, z, seed);
    if (dx * dx + dy * dy > 0.55 && hsh < 0.3) return null;
    if (y < 0) return null;
    let c = dy > 0.35 ? leaves[2] : dy > -0.2 ? leaves[1] : leaves[0];
    if (hsh > 0.92) c = leaves[3];
    if (berries && dy > -0.2 && hsh > 0.86 && hsh < 0.9) c = rng.chance(0.5) ? P.r3 : P.a0;
    return c;
  });
  return m;
}

export function buildRock(seed, size = 1) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const rx = rng.range(3, 5) * size;
  const ry = rng.range(2, 3.5) * size;
  const rz = rng.range(2.5, 4) * size;
  m.ellipsoid(0, ry * 0.45, 0, rx, ry, rz, (x, y, z, dx, dy, dz) => {
    if (y < 0) return null;
    const hsh = hash3(x, y, z, seed);
    const n = valueNoise(x * 0.4, z * 0.4 + y * 0.3, seed);
    if (dx * dx + dz * dz > 0.8 && hsh < 0.25) return null;
    let c = n < 0.35 ? P.s4 : n < 0.7 ? P.s5 : P.s6;
    if (dy > 0.5 && n > 0.45) c = hsh < 0.5 ? P.g4 : P.g5; // Moos
    if (hsh > 0.95) c = P.s7;
    return c;
  });
  return m;
}

function buildTuft(seed) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const blades = rng.int(2, 4);
  for (let i = 0; i < blades; i++) {
    const x = rng.int(-1, 1);
    const z = rng.int(-1, 0);
    const h = rng.chance(0.25) ? 2 : 1;
    // Herbst: viele Spitzen schon gelb
    for (let y = 0; y < h; y++) m.set(x, y, z, y === h - 1 && rng.chance(0.5) ? (rng.chance(0.5) ? P.e7 : P.g7) : P.g6);
  }
  return m;
}

function buildFlower(seed, blossom) {
  const m = new VoxelModel();
  const rng = new Rng(seed);
  const stems = rng.int(1, 3);
  m.set(0, 0, 0, P.g5).set(1, 0, 0, P.g4);
  for (let i = 0; i < stems; i++) {
    const x = i === 0 ? 0 : rng.int(-1, 1);
    const z = i === 0 ? 0 : rng.int(-1, 1);
    const h = rng.int(1, 2);
    for (let y = 0; y < h; y++) m.set(x, y, z, P.g4);
    m.set(x, h, z, blossom);
  }
  return m;
}

function buildMushroom(seed) {
  const m = new VoxelModel();
  m.set(0, 0, 0, P.s8);
  m.box(-1, 1, -1, 0, 1, 0, (x, y, z) => (hash3(x, y, z, seed) < 0.3 ? P.a4 : P.r3));
  return m;
}

// --- Verteilen und Instanzen -------------------------------------------------

const CHUNK = 12;

/**
 * Sammelt Instanzen je Modell, Drehung und räumlichem Block und baut daraus
 * InstancedMeshes: sichtbare Flächen für die Kamera, grobe Stellvertreter für
 * den Schattenpass.
 */
export class InstanceScatter {
  constructor(seed = 3) {
    this.seed = seed;
    this.models = new Map();
    this.buckets = new Map();
  }

  /**
   * @param {string} name
   * @param {VoxelModel} model
   * @param {THREE.Material} material
   * @param {{shadow?: 'coarse'|'full'|'none', jitter?: number}} [options]
   */
  addModel(name, model, material, { shadow = 'coarse', jitter = 0.05 } = {}) {
    this.models.set(name, { model, material, shadow, jitter, visuals: new Map(), proxy: null });
  }

  visualGeometry(entry, turns) {
    if (!entry.visuals.has(turns)) {
      const rotated = turns ? entry.model.rotated(turns) : entry.model;
      entry.visuals.set(turns, rotated.toGeometry({ jitter: entry.jitter, seed: this.seed, visibleOnly: true }));
    }
    return entry.visuals.get(turns);
  }

  proxyGeometry(entry) {
    if (!entry.proxy) entry.proxy = shadowGeometry(entry.model, entry.shadow);
    return entry.proxy;
  }

  place(name, x, z, turns = 0) {
    const t = ((turns % 4) + 4) % 4;
    const key = `${name}|${t}|${Math.floor(x / CHUNK)}|${Math.floor(z / CHUNK)}`;
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push([x, z]);
  }

  build() {
    const group = new THREE.Group();
    group.name = 'Natur';
    let instances = 0;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();
    for (const [key, spots] of this.buckets) {
      const [name, turnsText] = key.split('|');
      const turns = Number(turnsText);
      const entry = this.models.get(name);
      const visual = new THREE.InstancedMesh(this.visualGeometry(entry, turns), entry.material, spots.length);
      spots.forEach(([x, z], i) => visual.setMatrixAt(i, m.makeTranslation(x, 0, z)));
      visual.instanceMatrix.needsUpdate = true;
      visual.computeBoundingSphere();
      visual.castShadow = false;
      visual.receiveShadow = true;
      visual.name = key;
      group.add(visual);
      if (entry.shadow !== 'none') {
        const proxy = new THREE.InstancedMesh(this.proxyGeometry(entry), SHADOW_PROXY_MATERIAL, spots.length);
        q.setFromAxisAngle(up, (turns * Math.PI) / 2);
        spots.forEach(([x, z], i) => proxy.setMatrixAt(i, m.compose(pos.set(x, 0, z), q, one)));
        proxy.instanceMatrix.needsUpdate = true;
        proxy.computeBoundingSphere();
        proxy.castShadow = true;
        proxy.receiveShadow = false;
        proxy.layers.set(SHADOW_LAYER);
        proxy.name = `${key}|schatten`;
        group.add(proxy);
      }
      instances += spots.length;
    }
    return { group, instances };
  }
}

/**
 * Wald um Wege und Bucht, Büsche am Saum, Felsen, Gras und Blumen.
 * @param {object} o seed, materials, colliders, blockers (Flächen der Requisiten), map, nodes (Rohstoffquellen)
 * @returns {{ group: THREE.Group, stats: object }}
 */
export function createNature({ seed, materials, colliders, blockers, map, nodes = [] }) {
  const rng = new Rng(seed ^ 0x5eed);
  const scatter = new InstanceScatter(seed);
  const { occluder, world } = materials;
  const windy = materials.windy || world;

  const firs = [buildFir(seed + 1, 1.0), buildFir(seed + 2, 1.15), buildFir(seed + 3, 0.85)];
  const oaks = [
    buildDeciduous(seed + 11, 1.0, LEAVES.orange),
    buildDeciduous(seed + 12, 0.9, LEAVES.rot),
    buildDeciduous(seed + 13, 1.1, LEAVES.gelb),
    buildDeciduous(seed + 14, 0.95, LEAVES.orange),
    buildDeciduous(seed + 15, 1.05, LEAVES.gruen),
  ];
  const birches = [buildBirch(seed + 21, 1.0, [P.e7, P.f5, P.f6, P.f7]), buildBirch(seed + 22, 0.85, [P.e7, P.f5, P.f6, P.f7])];
  // Niedrige Bäume für den Waldrand südlich von Wegen und Bucht (hohe Kronen verdeckten sonst den Weg)
  const smalls = [buildFir(seed + 4, 0.55), buildDeciduous(seed + 16, 0.55, LEAVES.orange), buildDeciduous(seed + 17, 0.5, LEAVES.gelb)];
  const bushes = [
    buildBush(seed + 31, 1.0),
    buildBush(seed + 32, 1.2, true, [P.r1, P.r2, P.r3, P.f3]),
    buildBush(seed + 33, 0.8, false, [P.e5, P.e6, P.f4, P.f5]),
    buildBush(seed + 34, 1.0, true),
  ];
  const rocks = [buildRock(seed + 41, 1.0), buildRock(seed + 42, 0.6), buildRock(seed + 43, 1.4), buildRock(seed + 44, 0.8)];
  const tufts = [0, 1, 2, 3, 4, 5].map((i) => buildTuft(seed + 51 + i));
  const flowerColors = [P.a2, P.a3, P.f6, P.a3, P.a1];
  const flowers = flowerColors.map((c, i) => buildFlower(seed + 61 + i, c));
  const mushrooms = [buildMushroom(seed + 71), buildMushroom(seed + 72)];

  firs.forEach((m, i) => scatter.addModel(`fir${i}`, m, occluder));
  oaks.forEach((m, i) => scatter.addModel(`oak${i}`, m, occluder));
  birches.forEach((m, i) => scatter.addModel(`birch${i}`, m, occluder));
  smalls.forEach((m, i) => scatter.addModel(`small${i}`, m, occluder));
  bushes.forEach((m, i) => scatter.addModel(`bush${i}`, m, occluder));
  rocks.forEach((m, i) => scatter.addModel(`rock${i}`, m, world));
  tufts.forEach((m, i) => scatter.addModel(`tuft${i}`, m, windy, { shadow: 'none', jitter: 0.03 }));
  flowers.forEach((m, i) => scatter.addModel(`flower${i}`, m, windy, { shadow: 'none', jitter: 0 }));
  mushrooms.forEach((m, i) => scatter.addModel(`mushroom${i}`, m, world, { shadow: 'none' }));

  const nearNode = (x, z, r) => nodes.some((n) => (n.x - x) ** 2 + (n.z - z) ** 2 < (r + (n.radius || 0.6)) ** 2);
  const blocked = (x, z, r) =>
    colliders.blocks(x, z, r) || blockers.some((b) => x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) || nearNode(x, z, r);
  const land = (x, z) => !map.isWater(x, z) && !map.onDock(x, z, -0.6);
  // Läge eine Krone von hier aus (im Bild nach oben) über Weg oder Begehbarem?
  const covers = (x, z, reach) => {
    for (let dz = 1; dz <= reach; dz += 1) if (map.edgeDistance(x, z - dz) < -0.6 || map.pathDistance(x, z - dz) < 0.3) return true;
    return false;
  };

  // --- Wald: überall, wo die Karte nicht begehbar ist (Wege bleiben frei) ---
  const spacing = 2.2;
  let trees = 0;
  for (let gz = MAP.z0 - 2; gz <= MAP.z1 + 2; gz += spacing) {
    for (let gx = MAP.x0 - 2; gx <= MAP.x1; gx += spacing) {
      const x = snapV(gx + rng.range(-0.8, 0.8));
      const z = snapV(gz + rng.range(-0.8, 0.8));
      if (!land(x, z) || map.onIsland(x, z, -1)) continue;
      const edge = map.edgeDistance(x, z);
      if (edge < 0.55) continue;
      if (map.pathDistance(x, z) < 1.6) continue; // auch im Wald am Spawn bleibt der Weg frei
      if (blocked(x, z, 0.4)) continue;
      const turns = rng.int(0, 1) * 2; // zwei Drehungen reichen (weniger Zeichenaufrufe)
      if (covers(x, z, 5.5)) {
        // Südlich von Weg und Bucht: nur Niedriges
        if (!covers(x, z, 3)) scatter.place(`small${rng.int(0, smalls.length - 1)}`, x, z, turns);
        else if (rng.chance(0.55)) scatter.place(`bush${rng.int(0, 3)}`, x, z, turns);
        else continue;
        if (edge < 1.6) colliders.addCircle(x, z, 0.35, 'waldbaum');
        continue;
      }
      const roll = rng.next();
      const nearEdge = edge < 3;
      // Am Ufer (rechts) eher Kiefern und Birken, am Weg mehr bunte Laubbäume
      let name;
      if (roll < (nearEdge ? 0.3 : 0.5)) name = `fir${rng.int(0, 2)}`;
      else if (roll < (nearEdge ? 0.82 : 0.86)) name = `oak${rng.int(0, oaks.length - 1)}`;
      else name = `birch${rng.int(0, 1)}`;
      scatter.place(name, x, z, turns);
      trees++;
      if (edge < 1.6) colliders.addCircle(x, z, 0.35, 'waldbaum');
      if (nearEdge && rng.chance(0.2)) scatter.place(`mushroom${rng.int(0, 1)}`, snapV(x + rng.range(-1.2, 1.2)), snapV(z + rng.range(0.6, 1.4)), rng.int(0, 3));
    }
  }
  // Inseln im See: ein paar Tannen und Felsen
  for (const isl of ISLANDS) {
    const n = Math.max(1, Math.round(isl.r * 1.3));
    for (let k = 0; k < n; k++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(0, isl.r * 0.5);
      scatter.place(`fir${rng.int(0, 2)}`, snapV(isl.x + Math.cos(a) * r), snapV(isl.z + Math.sin(a) * r * 0.8), rng.int(0, 3));
      trees++;
    }
    scatter.place(`rock${rng.int(0, 3)}`, snapV(isl.x + isl.r * 0.6), snapV(isl.z + isl.r * 0.35), rng.int(0, 3));
  }

  // --- Büsche und Felsen als Saum (dort endet das Begehbare) ---
  let bushesPlaced = 0;
  let rocksPlaced = 0;
  for (let gz = MAP.z0 + 3; gz <= MAP.z1 - 3; gz += 1.3) {
    for (let gx = MAP.x0 + 8; gx <= MAP.x1; gx += 1.3) {
      const x = snapV(gx + rng.range(-0.5, 0.5));
      const z = snapV(gz + rng.range(-0.5, 0.5));
      if (!land(x, z)) continue;
      const edge = map.edgeDistance(x, z);
      if (edge < -0.1 || edge > 0.7) continue;
      if (map.pathDistance(x, z) < 1.4 || blocked(x, z, 0.5)) continue;
      if (rng.chance(0.45)) continue;
      if (rng.chance(0.18)) {
        scatter.place(`rock${rng.int(0, 3)}`, x, z, rng.int(0, 3));
        colliders.addCircle(x, z, 0.45, 'fels');
        rocksPlaced++;
      } else {
        scatter.place(`bush${rng.int(0, 3)}`, x, z, rng.int(0, 3));
        colliders.addCircle(x, z, 0.55, 'busch');
        bushesPlaced++;
      }
    }
  }

  // --- Gras und Blumen auf Wiese und Hof (nicht auf den Wegen) ---
  let tuftsPlaced = 0;
  let flowersPlaced = 0;
  const area = (MAP.x1 - MAP.x0) * (MAP.z1 - MAP.z0);
  for (let i = 0; i < area * 0.9; i++) {
    const x = snapV(rng.range(MAP.x0 + 8, MAP.x1 - 4));
    const z = snapV(rng.range(MAP.z0 + 4, MAP.z1 - 4));
    if (!land(x, z)) continue;
    const edge = map.edgeDistance(x, z);
    if (edge > 0.4) continue;
    if (map.pathDistance(x, z) < 0.45) continue;
    if (map.inYard(x, z) && rng.chance(0.5)) continue; // der Hof ist zertreten
    if (Math.hypot(x - LAYOUT.campfire.x, z - LAYOUT.campfire.z) < 2.2) continue;
    if (blocked(x, z, 0.3)) continue;
    const density = fbm(x * 0.22, z * 0.22, 2, seed + 99);
    const flowerPatch = valueNoise(x * 0.3, z * 0.3, seed + 5) > 0.72;
    if (flowerPatch && rng.chance(0.25)) {
      scatter.place(`flower${rng.int(0, flowers.length - 1)}`, x, z, rng.int(0, 3));
      flowersPlaced++;
    } else if (rng.next() < (density - 0.3) * 1.1) {
      scatter.place(`tuft${rng.int(0, tufts.length - 1)}`, x, z, rng.int(0, 3));
      tuftsPlaced++;
    }
  }

  const { group, instances } = scatter.build();
  return { group, stats: { trees, bushes: bushesPlaced, rocks: rocksPlaced, tufts: tuftsPlaced, flowers: flowersPlaced, instances } };
}
