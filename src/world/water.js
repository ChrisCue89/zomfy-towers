// Der Kranichsee (Meilenstein 9): Der Seegrund ist ins Gelände gemalt; darüber
// liegen zwei Schichten Wellenkämme, die langsam treiben. Die Kämme sind
// einzelne Texel einer kleinen, sich wiederholenden Textur – alles andere
// wird verworfen (alphaTest), damit Tiefenpuffer und Umrisse stimmen. Die
// Verschiebung rastet auf ganze Texel ein, so bleibt der Pixel-Look scharf.

import * as THREE from 'three';
import { P } from '../render/palette.js';
import { createWorldMaterial } from '../render/materials.js';
import { hash2, Rng } from '../core/rng.js';
import { MAP } from './map.js';

const TILE = 8; // m je Wiederholung
const TEXELS = 64; // 1/8 m je Texel
const CELL = 0.5; // Auflösung der Wasserfläche

/** Textur mit Wellenkämmen (kurze waagrechte Striche) und ein paar Glitzerpunkten. */
function crestTexture(seed, colors, count) {
  const data = new Uint8Array(TEXELS * TEXELS * 4);
  const rng = new Rng(seed);
  const put = (x, y, c) => {
    const k = (((y + TEXELS) % TEXELS) * TEXELS + ((x + TEXELS) % TEXELS)) * 4;
    data[k] = (c >> 16) & 255;
    data[k + 1] = (c >> 8) & 255;
    data[k + 2] = c & 255;
    data[k + 3] = 255;
  };
  for (let n = 0; n < count; n++) {
    const x = rng.int(0, TEXELS - 1);
    const y = rng.int(0, TEXELS - 1);
    const len = rng.int(2, 5);
    const c = colors[rng.int(0, colors.length - 1)];
    for (let k = 0; k < len; k++) put(x + k, y, c);
    if (len >= 4 && hash2(x, y, seed) < 0.5) put(x + 1, y - 1, colors[0]); // Kamm mit Krone
  }
  const texture = new THREE.DataTexture(data, TEXELS, TEXELS, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** Fläche aus Rechtecken über allen Wasserzellen (je Zeile zusammengefasst). */
function waterGeometry(map, y) {
  const pos = [];
  const uv = [];
  const idx = [];
  const x0 = 10;
  const x1 = MAP.x1 + 40;
  const z0 = MAP.z0 - 10;
  const z1 = MAP.z1 + 10;
  const quad = (ax, bx, az, bz) => {
    const n = pos.length / 3;
    pos.push(ax, y, az, ax, y, bz, bx, y, bz, bx, y, az);
    uv.push(ax / TILE, -az / TILE, ax / TILE, -bz / TILE, bx / TILE, -bz / TILE, bx / TILE, -az / TILE);
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  };
  for (let z = z0; z < z1; z += CELL) {
    let start = null;
    for (let x = x0; x <= x1; x += CELL) {
      const cx = x + CELL / 2;
      const cz = z + CELL / 2;
      const inMap = cz > MAP.z0 && cz < MAP.z1 && cx < MAP.x1;
      const wet = x < x1 && (inMap ? map.isWater(cx, cz) && !map.onDock(cx, cz, -0.3) : cx > 14);
      if (wet && start === null) start = x;
      else if (!wet && start !== null) {
        quad(start, x, z, z + CELL);
        start = null;
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(idx);
  return geometry;
}

export function createWater(map, seed) {
  const group = new THREE.Group();
  group.name = 'See';
  const layers = [
    { texture: crestTexture(seed + 1, [P.b4, P.b3, P.b5], 70), y: 0.004, speed: [0.35, 0.08] },
    { texture: crestTexture(seed + 2, [P.b5, P.a4, P.b4], 26), y: 0.008, speed: [-0.2, 0.05] },
  ];
  for (const layer of layers) {
    const material = createWorldMaterial({ map: layer.texture, vertexColors: false });
    material.alphaTest = 0.5;
    const mesh = new THREE.Mesh(waterGeometry(map, layer.y), material);
    mesh.receiveShadow = true;
    mesh.name = 'Wellen';
    group.add(mesh);
    layer.mesh = mesh;
  }
  let time = 0;
  return {
    group,
    update(dt) {
      time += dt;
      for (const layer of layers) {
        // Ganze Texel: die Kämme springen, statt zu verschwimmen
        layer.texture.offset.set(Math.round(time * layer.speed[0] * 8) / TEXELS, Math.round(time * layer.speed[1] * 8) / TEXELS);
      }
    },
  };
}
