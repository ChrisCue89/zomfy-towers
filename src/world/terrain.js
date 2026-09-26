// Der Boden: eine große Fläche mit einer Textur, die pro 1/8 m einen Texel hat
// (5 × 3 Spielpixel). Wiese, Waldboden, Trampelpfad, Feuerstelle und die alte
// Landstraße werden hier prozedural gemalt.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { createWorldMaterial } from '../render/materials.js';
import { fbm, hash2, valueNoise } from '../core/rng.js';
import { LAYOUT, V, clearingDistance, distanceToPolyline } from './layout.js';

const AREA = { x0: -26, x1: 26, z0: -22, z1: 26 };

function pick(h, a, b, threshold) {
  return h < threshold ? a : b;
}

/** Farbe eines Bodentexels an der Weltposition (x, z). */
function groundColor(x, z, i, j, seed) {
  const h = hash2(i, j, seed);
  const h2 = hash2(i, j, seed + 17);
  const e = clearingDistance(x, z);
  const patch = fbm(x * 0.16, z * 0.16, 3, seed);
  const clump = valueNoise(x * 0.85, z * 0.85, seed + 7);

  // --- Wiese und Waldboden ---------------------------------------------
  let color;
  if (e < 0.97) {
    const ramp = [P.g4, P.g5, P.g5, P.g6];
    let k = patch < 0.36 ? 0 : patch < 0.52 ? 1 : patch < 0.66 ? 2 : 3;
    if (clump > 0.74) k = Math.min(3, k + 1);
    else if (clump < 0.22) k = Math.max(0, k - 1);
    color = ramp[k];
    if (h < 0.035) color = k >= 2 ? P.g7 : P.g6;
    if (h > 0.992 && patch > 0.45) color = h2 < 0.5 ? P.a4 : h2 < 0.8 ? P.f6 : P.a1;
  } else {
    // Waldboden: Moos, Nadeln, Laub
    const k = patch < 0.45 ? 0 : patch < 0.6 ? 1 : 2;
    color = [P.t1, P.g3, P.t2][k];
    if (clump > 0.7) color = P.g3;
    if (h < 0.08) color = P.e3;
    else if (h < 0.11) color = P.e4;
    else if (h > 0.97) color = P.t3;
  }
  // Übergang Wiese -> Wald: abgedunkelter Saum
  if (e >= 0.9 && e < 0.97 && h < (e - 0.9) * 9) color = P.g3;

  // --- Feuerstelle ------------------------------------------------------
  const fire = LAYOUT.campfire;
  const rFire = Math.hypot(x - fire.x, z - fire.z) + (clump - 0.5) * 0.35;
  if (rFire < 1.7) {
    color = pick(h, P.e4, P.e5, 0.55);
    if (rFire < 0.8) color = pick(h, P.s3, P.s2, 0.6);
    if (h2 > 0.93) color = P.e6;
  } else if (rFire < 2.1 && h < 0.5) {
    color = P.g4;
  }

  // --- Trampelpfade -----------------------------------------------------
  const wobble = (valueNoise(x * 1.3, z * 1.3, seed + 3) - 0.5) * 0.3;
  const dPath = distanceToPolyline(x, z, LAYOUT.path) + wobble;
  const dSide = distanceToPolyline(x, z, LAYOUT.sidePath) + wobble;
  if (dPath < 0.5 || dSide < 0.32) {
    color = pick(h, P.e5, P.e6, 0.62);
    if (dPath > 0.4 && dSide > 0.22) color = P.e4;
    if (h2 > 0.96) color = pick(h, P.s6, P.s7, 0.5);
  } else if ((dPath < 0.7 || dSide < 0.45) && h < 0.45) {
    color = h2 < 0.5 ? P.e4 : P.g4;
  }

  // --- Alte Landstraße --------------------------------------------------
  const { z0, z1 } = LAYOUT.road;
  const edgeN = (valueNoise(x * 1.6, 11.3, seed + 5) - 0.5) * 0.5;
  const edgeS = (valueNoise(x * 1.6, 27.7, seed + 6) - 0.5) * 0.5;
  if (z > z0 + edgeN && z < z1 + edgeS) {
    color = h < 0.62 ? P.s2 : h < 0.9 ? P.s3 : h < 0.95 ? P.s1 : P.s4;
    // Mittellinie, verblasst
    const mid = (z0 + z1) / 2;
    if (Math.abs(z - mid) < 0.07 && ((x % 3) + 3) % 3 < 1.5 && h2 > 0.25) color = h2 > 0.8 ? P.e8 : P.e9;
    // Risse, aus denen Gras wächst
    const crack = Math.abs(valueNoise(x * 0.8, z * 0.8, seed + 9) * 2 - 1);
    if (crack < 0.035) color = P.s1;
    else if (crack < 0.07 && h2 > 0.55) color = pick(h, P.g4, P.g5, 0.6);
    // Überwucherte Stellen
    const over = fbm(x * 0.35, z * 0.35, 2, seed + 13);
    const edgeDist = Math.min(z - (z0 + edgeN), z1 + edgeS - z);
    if (over > 0.64 || (edgeDist < 0.35 && h < 0.35)) color = pick(h2, P.g4, P.g5, 0.5);
  } else if (z > z0 - 0.4 + edgeN && z < z1 + 0.4 + edgeS && h < 0.5) {
    color = pick(h2, P.e5, P.s5, 0.5); // Bankett aus Kies
  }

  // --- Unter und um die Notunterkunft ----------------------------------
  const s = LAYOUT.shelter;
  const sx1 = s.x + s.width * V;
  const sz1 = s.z + s.depth * V;
  if (x > s.x - 0.25 && x < sx1 + 0.25 && z > s.z - 0.25 && z < sz1 + 0.25) {
    color = pick(h, P.e3, P.e4, 0.6);
  }

  // --- Hackklotz: Späne ---------------------------------------------------
  const cb = LAYOUT.choppingBlock;
  if (Math.hypot(x - cb.x, z - cb.z) < 0.9 && h > 0.7) color = h2 < 0.5 ? P.e7 : P.e8;

  // --- Gartenbeet --------------------------------------------------------
  const g = LAYOUT.garden;
  if (x > g.x - 0.25 && x < g.x + 2.25 && z > g.z - 0.25 && z < g.z + 1.75) color = pick(h, P.e3, P.g4, 0.7);

  // --- Ölfleck unter dem Autowrack ---------------------------------------
  const car = LAYOUT.car;
  if (Math.abs(x - car.x) < 1.9 && Math.abs(z - car.z) < 0.9 && h < 0.7) color = pick(h2, P.s1, P.t0, 0.5);

  return color;
}

export function createTerrain(seed) {
  const width = Math.round((AREA.x1 - AREA.x0) / V);
  const height = Math.round((AREA.z1 - AREA.z0) / V);
  const data = new Uint8Array(width * height * 4);
  for (let j = 0; j < height; j++) {
    const z = AREA.z0 + (j + 0.5) * V;
    for (let i = 0; i < width; i++) {
      const x = AREA.x0 + (i + 0.5) * V;
      const c = groundColor(x, z, i, j, seed);
      const k = (j * width + i) * 4;
      data[k] = (c >> 16) & 255;
      data[k + 1] = (c >> 8) & 255;
      data[k + 2] = c & 255;
      data[k + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  const { x0, x1, z0, z1 } = AREA;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([x0, 0, z0, x0, 0, z1, x1, 0, z1, x1, 0, z0], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);

  const ground = new THREE.Mesh(geometry, createWorldMaterial({ map: texture, vertexColors: false }));
  ground.receiveShadow = true;
  ground.name = 'Boden';

  // Dunkler Waldboden weit außerhalb, falls der Blick je so weit reicht.
  const outer = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: P.t0 })
  );
  outer.position.y = -0.02;
  outer.name = 'Waldboden';

  const group = new THREE.Group();
  group.add(ground, outer);
  return { group, texture };
}
