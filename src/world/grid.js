// Das Bauraster: 1-m-Felder über der Lichtung. Zelle (i, j) deckt
// x ∈ [i, i+1), z ∈ [j, j+1) ab. Hier wird festgehalten, welche Felder frei,
// statisch blockiert (Haus, Bäume, Requisiten) oder bebaut sind.
// Ab Meilenstein 3 rechnet die Horde auf diesem Raster ihre Wege.

import { clearingDistance } from './layout.js';

export const CELL = 1;

export class BuildGrid {
  /**
   * @param {{minX:number, maxX:number, minZ:number, maxZ:number}} bounds in Metern (ganzzahlig)
   */
  constructor(bounds) {
    this.minX = bounds.minX;
    this.minZ = bounds.minZ;
    this.width = bounds.maxX - bounds.minX;
    this.height = bounds.maxZ - bounds.minZ;
    const n = this.width * this.height;
    this.inside = new Uint8Array(n); // 1 = auf der Lichtung
    this.blocked = new Uint8Array(n); // 1 = statisch belegt
    this.occupant = new Array(n).fill(null); // Gebäude-ID
    for (let j = 0; j < this.height; j++) {
      for (let i = 0; i < this.width; i++) {
        const x = this.minX + i + 0.5;
        const z = this.minZ + j + 0.5;
        this.inside[j * this.width + i] = clearingDistance(x, z) < 0.94 ? 1 : 0;
      }
    }
  }

  index(ci, cj) {
    const i = ci - this.minX;
    const j = cj - this.minZ;
    if (i < 0 || j < 0 || i >= this.width || j >= this.height) return -1;
    return j * this.width + i;
  }

  /** Weltposition -> Zellkoordinaten (ganzzahlig). */
  cellAt(x, z) {
    return { i: Math.floor(x / CELL), j: Math.floor(z / CELL) };
  }

  /** Mittelpunkt einer Zelle in Weltkoordinaten. */
  center(ci, cj) {
    return { x: ci + 0.5, z: cj + 0.5 };
  }

  /** Statische Hindernisse aus der Kollision übernehmen (einmal beim Start). */
  markStatic(colliders, margin = 0.05) {
    for (let j = 0; j < this.height; j++) {
      for (let i = 0; i < this.width; i++) {
        const k = j * this.width + i;
        if (!this.inside[k]) continue;
        const x = this.minX + i + 0.5;
        const z = this.minZ + j + 0.5;
        // Zelle gilt als blockiert, wenn ihr Mittelbereich ein Hindernis berührt.
        if (colliders.blocks(x, z, 0.35 + margin)) this.blocked[k] = 1;
      }
    }
  }

  /** Rechteck von Zellen als statisch blockiert markieren (z. B. Hausgrundriss). */
  blockRect(minX, minZ, maxX, maxZ) {
    for (let cj = Math.floor(minZ); cj < Math.ceil(maxZ); cj++) {
      for (let ci = Math.floor(minX); ci < Math.ceil(maxX); ci++) {
        const k = this.index(ci, cj);
        if (k >= 0) this.blocked[k] = 1;
      }
    }
  }

  isFree(ci, cj) {
    const k = this.index(ci, cj);
    return k >= 0 && this.inside[k] === 1 && this.blocked[k] === 0 && this.occupant[k] === null;
  }

  /** Alle Zellen eines Grundrisses (w × d Zellen ab ci, cj). */
  cells(ci, cj, w, d) {
    const out = [];
    for (let dj = 0; dj < d; dj++) for (let di = 0; di < w; di++) out.push([ci + di, cj + dj]);
    return out;
  }

  canPlace(ci, cj, w, d) {
    return this.cells(ci, cj, w, d).every(([i, j]) => this.isFree(i, j));
  }

  occupy(id, ci, cj, w, d) {
    for (const [i, j] of this.cells(ci, cj, w, d)) {
      const k = this.index(i, j);
      if (k >= 0) this.occupant[k] = id;
    }
  }

  release(id) {
    for (let k = 0; k < this.occupant.length; k++) if (this.occupant[k] === id) this.occupant[k] = null;
  }

  occupantAt(ci, cj) {
    const k = this.index(ci, cj);
    return k >= 0 ? this.occupant[k] : null;
  }
}
