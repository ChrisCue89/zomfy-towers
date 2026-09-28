// Der Boden: eine große Fläche mit einer Textur, die pro 1/16 m einen Texel hat
// (seit M13 so fein wie die Voxel der Modelle – in der nahen Ansicht waren die
// 1/8-m-Texel als Kacheln zu sehen).
// Herbstwiese, Waldboden mit Laub, die Erdwege der Horde, Sand und Kiesel am
// Ufer, der Seegrund und die Hofstellen (Feuerstelle, Hackklotz, Beet) werden
// hier prozedural gemalt. Das Wasser darüber (Wellen) kommt aus water.js.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { createWorldMaterial } from '../render/materials.js';
import { fbm, hash2, valueNoise } from '../core/rng.js';
import { LAYOUT, V } from './layout.js';
import { MAP, shoreX, ISLANDS } from './map.js';

export const AREA = MAP;
const TEXEL = 1 / 16; // Kantenlänge eines Bodentexels

function pick(h, a, b, threshold) {
  return h < threshold ? a : b;
}

/**
 * Herbstwiese: Grün mit Gelb und Braun, dazwischen Laub. Seit M13 ruhiger:
 * trockene Stellen und Laub liegen in zusammenhängenden Flecken (drift),
 * nicht mehr als einzelne Punkte überall – so heben sich die Dinge ab.
 */
function meadow(h, h2, patch, clump, wild, drift) {
  const ramp = [P.g3, P.g4, P.g5, P.g5, P.g6];
  let k = patch < 0.34 ? 0 : patch < 0.48 ? 1 : patch < 0.62 ? 2 : patch < 0.74 ? 3 : 4;
  if (clump > 0.74) k = Math.min(4, k + 1);
  else if (clump < 0.22) k = Math.max(0, k - 1);
  let color = ramp[k];
  // Trockene, gelbliche Flecken (Herbst)
  if (patch > 0.66 && clump > 0.5) color = h < 0.7 ? P.g7 : P.e7;
  if (h < 0.012) color = k >= 2 ? P.g7 : P.g6;
  // Gefallenes Laub in Verwehungen: dort dicht, dazwischen fast keins
  const leaf = (0.018 + wild * 0.05) * (drift > 0.58 ? 2.4 : 0.25);
  if (h > 1 - leaf) color = h2 < 0.35 ? P.f4 : h2 < 0.6 ? P.r3 : h2 < 0.85 ? P.f5 : P.e6;
  return color;
}

/** Waldboden: Moos, Nadeln, viel Laub. */
function forestFloor(h, h2, patch, clump) {
  const k = patch < 0.42 ? 0 : patch < 0.6 ? 1 : 2;
  let color = [P.t1, P.g3, P.e3][k];
  if (clump > 0.7) color = P.g3;
  if (h < 0.035) color = P.e2;
  else if (h < 0.05) color = P.e4;
  else if (h > 0.955) color = h2 < 0.4 ? P.r2 : h2 < 0.7 ? P.f3 : P.e5; // Laub
  return color;
}

/** Farbe eines Bodentexels an der Weltposition (x, z); `out.path` sagt, ob er zum Weg gehört. */
function groundColor(map, x, z, i, j, seed, out) {
  out.path = false;
  const h = hash2(i, j, seed);
  const h2 = hash2(i, j, seed + 17);
  const patch = fbm(x * 0.16, z * 0.16, 3, seed);
  const clump = valueNoise(x * 0.85, z * 0.85, seed + 7);

  // --- See, Ufer, Inseln ---------------------------------------------------
  const shore = shoreX(z);
  const wobble = (valueNoise(x * 1.1, z * 1.1, seed + 3) - 0.5) * 0.5;
  const s = x - shore + wobble * 0.6;
  if (s > 0 && !map.onIsland(x, z)) {
    // Seegrund: flach und hell am Ufer, dann tief und dunkel (die Wellen liegen darüber)
    if (s < 0.3) return pick(h, P.s6, P.e7, 0.5); // nasser Kies an der Wasserkante
    if (s < 1.4) return h < 0.12 ? P.a5 : pick(h2, P.b2, P.a5, 0.55);
    if (s < 3.2) return h < 0.08 ? P.b3 : P.b2;
    return h < 0.05 ? P.b2 : pick(patch, P.b1, P.n4, 0.5);
  }
  for (const isl of ISLANDS) {
    const d = Math.hypot(x - isl.x, (z - isl.z) * 1.25) + (map.noise(x, z, 0.9, 71) - 0.5) * 0.8;
    if (d < isl.r) return d > isl.r - 0.45 ? pick(h, P.s5, P.s4, 0.5) : d > isl.r - 1 ? pick(h, P.e8, P.s6, 0.6) : forestFloor(h, h2, patch, clump);
  }
  // Sand und Kiesel am Ufer
  if (s > -1.7) {
    let color = h < 0.55 ? P.e8 : h < 0.85 ? P.e9 : P.s7;
    if (h2 > 0.9) color = pick(h, P.s5, P.s6, 0.5); // Kiesel
    if (s < -1.25 && h < 0.5) color = pick(h2, P.g5, P.e7, 0.5); // Übergang ins Gras
    return color;
  }

  // --- Land ----------------------------------------------------------------
  const edge = map.edgeDistance(x, z); // < 0: begehbar
  const wild = Math.max(0, Math.min(1, (edge + 3) / 3));
  const drift = valueNoise(x * 0.45, z * 0.45, seed + 31);
  let color = edge > 0.15 ? forestFloor(h, h2, patch, clump) : meadow(h, h2, patch, clump, wild, drift);
  // Waldsaum: dunkler, mit Laub
  if (edge > -0.6 && edge <= 0.15 && h < (edge + 0.6) * 0.9) color = h2 < 0.3 ? P.e4 : P.g3;

  // --- Wege der Horde ------------------------------------------------------
  const dPath = map.sampleLinear(map.pathField, x, z) + (valueNoise(x * 1.3, z * 1.3, seed + 3) - 0.5) * 0.45;
  if (dPath < -0.1) {
    out.path = true;
    // Seit M13 ruhiger: Fahrspuren und helle Flecken als Flächen, wenig Einzelpunkte
    const rut = valueNoise(x * 0.7, z * 0.7, seed + 21);
    const blot = valueNoise(x * 2.2, z * 2.2, seed + 41);
    color = rut > 0.62 ? pick(h, P.e4, P.e3, 0.85) : blot > 0.72 ? P.e6 : pick(h, P.e5, P.e6, 0.86);
    if (dPath > -0.3) color = P.e4; // Rand: festgetreten, dunkler
    if (h2 > 0.975) color = pick(h, P.s5, P.s6, 0.5); // Kiesel
    else if (h2 < 0.02 && drift > 0.5) color = P.f4; // ein Blatt
  } else if (dPath < 0.2 && clump < 0.55) {
    color = h2 < 0.5 ? P.e4 : P.g3; // abgetretener Saum
  }

  // --- Hof: festgetretene Stellen ------------------------------------------
  if (map.inYard(x, z) && patch > 0.58 && clump < 0.4) color = pick(h2, P.e5, P.e4, 0.75);

  // --- Feuerstelle ----------------------------------------------------------
  const fire = LAYOUT.campfire;
  const rFire = Math.hypot(x - fire.x, z - fire.z) + (clump - 0.5) * 0.35;
  if (rFire < 1.7) {
    color = pick(h, P.e4, P.e5, 0.55);
    if (rFire < 0.8) color = pick(h, P.s3, P.s2, 0.6);
    if (h2 > 0.93) color = P.e6;
  } else if (rFire < 2.1 && h < 0.5) {
    color = P.g4;
  }

  // --- Unter und um das Haus -------------------------------------------------
  const sh = LAYOUT.shelter;
  const sx1 = sh.x + sh.width * V;
  const sz1 = sh.z + sh.depth * V;
  if (x > sh.x - 0.25 && x < sx1 + 0.25 && z > sh.z - 0.25 && z < sz1 + 0.25) color = pick(h, P.e3, P.e4, 0.6);

  // --- Hackklotz: Späne ---------------------------------------------------------
  const cb = LAYOUT.choppingBlock;
  if (Math.hypot(x - cb.x, z - cb.z) < 0.9 && h > 0.7) color = h2 < 0.5 ? P.e7 : P.e8;

  // --- Gartenbeet --------------------------------------------------------------
  const g = LAYOUT.garden;
  if (x > g.x - 0.25 && x < g.x + 2.25 && z > g.z - 0.25 && z < g.z + 1.75) color = pick(h, P.e3, P.g4, 0.7);

  // --- Unter dem Bootswrack -----------------------------------------------------
  const w = LAYOUT.wreck;
  if (Math.abs(x - w.x) < 2.3 && Math.abs(z - w.z) < 1.1 && h < 0.6) color = pick(h2, P.e7, P.s6, 0.5);

  return color;
}

export function createTerrain(seed, map) {
  const width = Math.round((AREA.x1 - AREA.x0) / TEXEL);
  const height = Math.round((AREA.z1 - AREA.z0) / TEXEL);
  const data = new Uint8Array(width * height * 4);
  const glowData = new Uint8Array(width * height * 4); // Eigenlicht der Wege (m12-r1, DESIGN 3.6)
  const out = { path: false };
  for (let j = 0; j < height; j++) {
    const z = AREA.z0 + (j + 0.5) * TEXEL;
    for (let i = 0; i < width; i++) {
      const x = AREA.x0 + (i + 0.5) * TEXEL;
      const c = groundColor(map, x, z, i, j, seed, out);
      const k = (j * width + i) * 4;
      data[k] = (c >> 16) & 255;
      data[k + 1] = (c >> 8) & 255;
      data[k + 2] = c & 255;
      data[k + 3] = 255;
      if (out.path) {
        glowData[k] = data[k];
        glowData[k + 1] = data[k + 1];
        glowData[k + 2] = data[k + 2];
      }
      glowData[k + 3] = 255;
    }
  }
  const makeTexture = (pixels) => {
    const t = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  };
  const texture = makeTexture(data);

  const { x0, x1, z0, z1 } = AREA;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([x0, 0, z0, x0, 0, z1, x1, 0, z1, x1, 0, z0], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);

  const material = createWorldMaterial({ map: texture, vertexColors: false });
  // Nachts leuchten die Wege ein wenig aus sich heraus (Stärke setzt world.js nach der Nacht)
  material.emissiveMap = makeTexture(glowData);
  material.emissive.set(0xffffff);
  material.emissiveIntensity = 0;
  const ground = new THREE.Mesh(geometry, material);
  ground.receiveShadow = true;
  ground.name = 'Boden';

  // Dunkler Grund weit außerhalb, falls der Blick je so weit reicht (links Wald, rechts See).
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: P.t0 }));
  outer.position.y = -0.02;
  outer.name = 'Waldboden';
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(200, 400).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: P.n4 }));
  lake.position.set(x1 + 100, -0.01, 0);
  lake.name = 'Seegrund';

  const group = new THREE.Group();
  group.add(ground, outer, lake);
  return { group, texture, material };
}
