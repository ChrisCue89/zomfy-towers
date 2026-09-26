// Voxel-Baukasten: Modelle werden im Code aus Voxeln (1/8 m) zusammengesetzt
// und zu einem Mesh mit eingebackener Umgebungsverdeckung (AO) und leichter
// Farbstreuung pro Voxel umgewandelt.

import * as THREE from 'three';
import { hash3 } from '../core/rng.js';

const OFFSET = 1024;
const SPAN = 2048;

function key(x, y, z) {
  return ((x + OFFSET) * SPAN + (y + OFFSET)) * SPAN + (z + OFFSET);
}

// Flächen: Normale, Tangentenachsen und die vier Ecken gegen den Uhrzeigersinn
// (von außen gesehen) als Offsets zur Voxel-Ecke.
const FACES = [
  { n: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { n: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

const AO_CURVE = [0.52, 0.7, 0.86, 1.0];

const tmpColor = new THREE.Color();

export class VoxelModel {
  constructor() {
    this.cells = new Map(); // key -> [x, y, z, hex]
  }

  get size() {
    return this.cells.size;
  }

  set(x, y, z, color) {
    const k = key(x, y, z);
    if (color === null || color === undefined) this.cells.delete(k);
    else this.cells.set(k, [x, y, z, color]);
    return this;
  }

  has(x, y, z) {
    return this.cells.has(key(x, y, z));
  }

  get(x, y, z) {
    const cell = this.cells.get(key(x, y, z));
    return cell ? cell[3] : null;
  }

  /**
   * Quader füllen, Grenzen jeweils inklusive.
   * `color` darf eine Funktion (x, y, z) => hex | null sein.
   */
  box(x0, y0, z0, x1, y1, z1, color) {
    const fn = typeof color === 'function';
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
          this.set(x, y, z, fn ? color(x, y, z) : color);
        }
      }
    }
    return this;
  }

  /** Nur überschreiben, wo schon ein Voxel ist (z. B. Muster aufmalen). */
  paint(x0, y0, z0, x1, y1, z1, color) {
    const fn = typeof color === 'function';
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
          if (this.has(x, y, z)) this.set(x, y, z, fn ? color(x, y, z) : color);
        }
      }
    }
    return this;
  }

  remove(x0, y0, z0, x1, y1, z1) {
    return this.box(x0, y0, z0, x1, y1, z1, null);
  }

  /** Ellipsoid um den Mittelpunkt (Voxelmitten), Radien in Voxeln. */
  ellipsoid(cx, cy, cz, rx, ry, rz, color) {
    const fn = typeof color === 'function';
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          const dz = (z + 0.5 - cz) / rz;
          if (dx * dx + dy * dy + dz * dz <= 1) this.set(x, y, z, fn ? color(x, y, z, dx, dy, dz) : color);
        }
      }
    }
    return this;
  }

  /** Stehender Zylinder (Achse y), Radius in Voxeln. */
  cylinder(cx, cz, y0, y1, r, color) {
    const fn = typeof color === 'function';
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
        const dx = x + 0.5 - cx;
        const dz = z + 0.5 - cz;
        if (dx * dx + dz * dz > r * r) continue;
        for (let y = y0; y <= y1; y++) this.set(x, y, z, fn ? color(x, y, z) : color);
      }
    }
    return this;
  }

  /** Voxel-Linie (3D-Bresenham) zwischen zwei Punkten. */
  line(x0, y0, z0, x1, y1, z1, color, thickness = 0) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t);
      const z = Math.round(z0 + (z1 - z0) * t);
      if (thickness > 0) this.box(x, y, z, x + thickness, y, z + thickness, color);
      else this.set(x, y, z, color);
    }
    return this;
  }

  /** Alle Voxel eines anderen Modells versetzt übernehmen. */
  merge(other, dx = 0, dy = 0, dz = 0) {
    for (const [x, y, z, c] of other.cells.values()) this.set(x + dx, y + dy, z + dz, c);
    return this;
  }

  forEach(fn) {
    for (const [x, y, z, c] of this.cells.values()) fn(x, y, z, c);
  }

  /**
   * Um die y-Achse in 90°-Schritten gedrehte Kopie (gleiche Drehrichtung wie
   * three.js rotation.y). Voxel [x, x+1] × [z, z+1] -> (z, −x−1).
   */
  rotated(turns = 0) {
    const t = ((turns % 4) + 4) % 4;
    const out = new VoxelModel();
    for (const [x, y, z, c] of this.cells.values()) {
      let rx = x;
      let rz = z;
      for (let i = 0; i < t; i++) {
        const nx = rz;
        rz = -rx - 1;
        rx = nx;
      }
      out.set(rx, y, rz, c);
    }
    return out;
  }

  /**
   * Grobe Kopie für Schatten: je factor³ Voxel werden zu einem, wenn
   * mindestens `threshold` davon gefüllt sind. Geometrie mit size·factor bauen.
   */
  downsampled(factor = 2, threshold = 2) {
    const counts = new Map();
    for (const [x, y, z] of this.cells.values()) {
      const bx = Math.floor(x / factor);
      const by = Math.floor(y / factor);
      const bz = Math.floor(z / factor);
      const k = key(bx, by, bz);
      const entry = counts.get(k);
      if (entry) entry[3]++;
      else counts.set(k, [bx, by, bz, 1]);
    }
    const out = new VoxelModel();
    for (const [bx, by, bz, n] of counts.values()) if (n >= threshold) out.set(bx, by, bz, 0x808080);
    return out;
  }

  /**
   * In eine BufferGeometry umwandeln.
   * @param {object} [options]
   * @param {number} [options.size] Kantenlänge eines Voxels in Metern
   * @param {number} [options.jitter] Farbstreuung pro Voxel (0..0,2)
   * @param {number} [options.seed]
   * @param {boolean} [options.ao]
   * @param {boolean} [options.skipBottom] Unterseiten weglassen (steht auf dem Boden)
   * @param {boolean} [options.visibleOnly] Nur Flächen, die die feste Kamera je
   *   sehen kann (oben und Süden). Für statische, ungedrehte Objekte.
   * @param {number} [options.brightness] Faktor auf alle Farben
   */
  toGeometry(options = {}) {
    const { size = 1 / 8, jitter = 0.05, seed = 7, ao = true, skipBottom = false, visibleOnly = false, brightness = 1 } = options;
    const positions = [];
    const normals = [];
    const colors = [];
    const indices = [];
    const cells = this.cells;
    const solid = (x, y, z) => cells.has(key(x, y, z));

    for (const [x, y, z, hex] of cells.values()) {
      tmpColor.setHex(hex); // sRGB -> linear
      const j = 1 + (hash3(x, y, z, seed) - 0.5) * 2 * jitter;
      const r = tmpColor.r * j * brightness;
      const g = tmpColor.g * j * brightness;
      const b = tmpColor.b * j * brightness;

      for (let f = 0; f < 6; f++) {
        const face = FACES[f];
        const [nx, ny, nz] = face.n;
        if (skipBottom && ny === -1) continue;
        if (visibleOnly && ny !== 1 && nz !== 1) continue;
        if (solid(x + nx, y + ny, z + nz)) continue;

        const base = positions.length / 3;
        const aoValues = [3, 3, 3, 3];
        for (let c = 0; c < 4; c++) {
          const [ox, oy, oz] = face.corners[c];
          positions.push((x + ox) * size, (y + oy) * size, (z + oz) * size);
          normals.push(nx, ny, nz);
          let shade = 1;
          if (ao) {
            // Die zwei Tangentenrichtungen dieser Ecke in der Ebene vor der Fläche.
            const ax = nx !== 0 ? 0 : ox === 1 ? 1 : -1;
            const ay = ny !== 0 ? 0 : oy === 1 ? 1 : -1;
            const az = nz !== 0 ? 0 : oz === 1 ? 1 : -1;
            const px = x + nx;
            const py = y + ny;
            const pz = z + nz;
            let s1;
            let s2;
            let corner;
            if (nx !== 0) {
              s1 = solid(px, py + ay, pz);
              s2 = solid(px, py, pz + az);
              corner = solid(px, py + ay, pz + az);
            } else if (ny !== 0) {
              s1 = solid(px + ax, py, pz);
              s2 = solid(px, py, pz + az);
              corner = solid(px + ax, py, pz + az);
            } else {
              s1 = solid(px + ax, py, pz);
              s2 = solid(px, py + ay, pz);
              corner = solid(px + ax, py + ay, pz);
            }
            const level = s1 && s2 ? 0 : 3 - ((s1 ? 1 : 0) + (s2 ? 1 : 0) + (corner ? 1 : 0));
            aoValues[c] = level;
            shade = AO_CURVE[level];
          }
          colors.push(r * shade, g * shade, b * shade);
        }
        if (aoValues[0] + aoValues[2] < aoValues[1] + aoValues[3]) {
          indices.push(base, base + 1, base + 3, base + 1, base + 2, base + 3);
        } else {
          indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return geometry;
  }
}

/** Mehrere Geometrien mit gleichen Attributen zu einer zusammenfügen. */
export function mergeGeometries(geometries) {
  let vertexCount = 0;
  let indexCount = 0;
  for (const g of geometries) {
    vertexCount += g.attributes.position.count;
    indexCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
  let v = 0;
  let i = 0;
  for (const g of geometries) {
    const count = g.attributes.position.count;
    positions.set(g.attributes.position.array, v * 3);
    normals.set(g.attributes.normal.array, v * 3);
    colors.set(g.attributes.color.array, v * 3);
    if (g.index) {
      const src = g.index.array;
      for (let k = 0; k < src.length; k++) indices[i + k] = src[k] + v;
      i += src.length;
    } else {
      for (let k = 0; k < count; k++) indices[i + k] = v + k;
      i += count;
    }
    v += count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

/** Geometrie verschieben/drehen (in Metern bzw. 90°-Schritten um y). */
export function transformGeometry(geometry, { x = 0, y = 0, z = 0, turns = 0 } = {}) {
  const m = new THREE.Matrix4().makeRotationY((turns * Math.PI) / 2);
  m.setPosition(x, y, z);
  geometry.applyMatrix4(m);
  return geometry;
}
