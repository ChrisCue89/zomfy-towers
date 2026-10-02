// Das Bauraster: 1-m-Felder über der ganzen Karte. Zelle (i, j) deckt
// x ∈ [i, i+1), z ∈ [j, j+1) ab. Hier wird festgehalten, welche Felder frei,
// statisch blockiert (Haus, Bäume, Requisiten) oder bebaut sind – und seit
// Meilenstein 9, welche auf einem Weg der Horde liegen (dort nur Barrikaden)
// und welche zum Hof gehören (letzte Verteidigung, die Horde darf hinein).

import { MAP } from './map.js';

export const CELL = 1;

/** Bis zu diesem Abstand vom Wegrand (m) zählt ein Feld noch zum Weg. */
const PATH_MARGIN = 0.2;

export class BuildGrid {
  /** @param {import('./map.js').GameMap} map */
  constructor(map) {
    this.map = map;
    this.minX = MAP.x0;
    this.minZ = MAP.z0;
    this.width = MAP.x1 - MAP.x0;
    this.height = MAP.z1 - MAP.z0;
    const n = this.width * this.height;
    this.inside = new Uint8Array(n); // 1 = begehbares Land (bebaubar, wenn sonst frei)
    this.path = new Uint8Array(n); // 1 = Weg der Horde (nur Barrikaden)
    this.yard = new Uint8Array(n); // 1 = Hof vor dem Haus (Horde darf hinein)
    this.pathCost = new Float32Array(n).fill(1); // Wegmitte 1, Rand teurer: die Horde läuft in der Mitte
    this.blocked = new Uint8Array(n); // 1 = statisch belegt
    this.reserved = new Uint8Array(n); // 1 = Rohstoffquelle, 2 = Balduins Platz (morgens), 3 = Kürbisbank (A6): nicht bebaubar, aber begehbar
    this.house = new Uint8Array(n); // Ausbaustufe, ab der das Zuhause hier steht (0 = nie)
    this.houseLevel = 1; // jetzige Ausbaustufe (world.setHouseLevel)
    this.occupant = new Array(n).fill(null); // Gebäude-ID
    for (let j = 0; j < this.height; j++) {
      for (let i = 0; i < this.width; i++) {
        const k = j * this.width + i;
        const x = this.minX + i + 0.5;
        const z = this.minZ + j + 0.5;
        const d = map.pathDistance(x, z);
        const land = map.edgeDistance(x, z) < -0.3 && !map.onDock(x, z, -0.5);
        this.inside[k] = land ? 1 : 0;
        if (d <= PATH_MARGIN) {
          this.path[k] = 1;
          this.pathCost[k] = 1 + 1.5 * Math.min(1, Math.max(0, (d + 1) / 1.2));
        }
        if (land && map.inYard(x, z)) this.yard[k] = 1;
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

  /** Liegt die Zelle im Hof (innerhalb des Walls, M31: Lagerglocke)? */
  isYard(ci, cj) {
    const k = this.index(ci, cj);
    return k >= 0 && this.yard[k] === 1;
  }

  /** Liegt die Zelle auf einem Weg der Horde? */
  isPath(ci, cj) {
    const k = this.index(ci, cj);
    return k >= 0 && this.path[k] === 1;
  }

  /** Statische Hindernisse aus der Kollision übernehmen (einmal beim Start). */
  markStatic(colliders, margin = 0.05) {
    for (let j = 0; j < this.height; j++) {
      for (let i = 0; i < this.width; i++) {
        const k = j * this.width + i;
        if (!this.inside[k] && !this.path[k]) continue;
        const x = this.minX + i + 0.5;
        const z = this.minZ + j + 0.5;
        // Zelle gilt als blockiert, wenn ihr Mittelbereich ein Hindernis berührt.
        if (colliders.blocks(x, z, 0.35 + margin)) this.blocked[k] = 1;
      }
    }
  }

  /** Rechteck von Zellen als statisch blockiert markieren (z. B. Hausgrundriss). */
  blockRect(minX, minZ, maxX, maxZ, houseLevel = 0) {
    for (let cj = Math.floor(minZ); cj < Math.ceil(maxZ); cj++) {
      for (let ci = Math.floor(minX); ci < Math.ceil(maxX); ci++) {
        const k = this.index(ci, cj);
        if (k < 0) continue;
        this.blocked[k] = 1;
        if (houseLevel && (!this.house[k] || houseLevel < this.house[k])) this.house[k] = houseLevel;
      }
    }
  }

  /**
   * Warum ist diese Zelle nicht bebaubar? null = frei. (m7-r1: »Kein Platz« ohne
   * sichtbaren Grund – meist ein Grasbüschel oder der künftige Anbau.)
   * @returns {null|'wald'|'bau'|'zuhause'|'haus'|'hindernis'|'rohstoff'|'stand'|'fest'}
   */
  blockReason(ci, cj, strict = true) {
    const k = this.index(ci, cj);
    if (k < 0 || !this.inside[k]) return 'wald';
    if (this.occupant[k] !== null) return 'bau';
    if (this.house[k]) return this.house[k] <= this.houseLevel ? 'zuhause' : 'haus';
    if (this.blocked[k]) return 'hindernis';
    if (this.reserved[k] === 3) return 'fest'; // A6: die Kürbisbank (auch beim Laden alter Stände)
    if (strict && this.reserved[k]) return this.reserved[k] === 2 ? 'stand' : 'rohstoff';
    return null;
  }

  /** Zelle einer kleinen Rohstoffquelle (Kiesel, Gras, Äste) freihalten. */
  reserve(x, z) {
    const k = this.index(Math.floor(x), Math.floor(z));
    if (k >= 0) this.reserved[k] = 1;
  }

  /** @param {boolean} [strict] false = Rohstoff-Zellen zählen als frei (alte Spielstände laden) */
  isFree(ci, cj, strict = true) {
    const k = this.index(ci, cj);
    return k >= 0 && this.inside[k] === 1 && this.blocked[k] === 0 && this.occupant[k] === null && !(strict && this.reserved[k]) && this.reserved[k] !== 3;
  }

  /** Alle Zellen eines Grundrisses (w × d Zellen ab ci, cj). */
  cells(ci, cj, w, d) {
    const out = [];
    for (let dj = 0; dj < d; dj++) for (let di = 0; di < w; di++) out.push([ci + di, cj + dj]);
    return out;
  }

  canPlace(ci, cj, w, d, strict = true) {
    return this.cells(ci, cj, w, d).every(([i, j]) => this.isFree(i, j, strict));
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
