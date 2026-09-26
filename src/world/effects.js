// Kleine Partikel-Effekte fürs Sammeln und Bauen: Späne, Steinsplitter,
// Grashalme, Laub und Staubwolken. Alles über das gemeinsame Partikelsystem.

import * as THREE from 'three';
import { P } from '../render/palette.js';

const c = (hex) => new THREE.Color(hex);
const CHIPS = {
  holz: [c(P.e7), c(P.e5), c(P.e8)],
  stein: [c(P.s7), c(P.s5), c(P.s8)],
  gras: [c(P.g7), c(P.g6), c(P.g8)],
  schrott: [c(P.s6), c(P.r3), c(P.s4)],
};
const LEAVES = [c(P.g6), c(P.g7), c(P.g5), c(P.g8)];
const DUST = [c(P.e8), c(P.e9), c(P.s8)];

export class Effects {
  /** @param {import('./particles.js').Particles} particles */
  constructor(particles) {
    this.particles = particles;
    this.rng = particles.rng;
  }

  /** Späne/Splitter bei einem Treffer. kind: holz, stein, gras, schrott */
  chips(x, y, z, kind = 'holz', count = 7) {
    const colors = CHIPS[kind] || CHIPS.holz;
    const r = this.rng;
    for (let i = 0; i < count; i++) {
      const a = r.range(0, Math.PI * 2);
      const s = r.range(0.8, 2.2);
      const color = colors[i % colors.length];
      this.particles.spawn({
        x: x + r.range(-0.15, 0.15),
        y: y + r.range(-0.1, 0.2),
        z: z + r.range(-0.1, 0.15),
        vx: Math.cos(a) * s,
        vy: r.range(1.6, 3.2),
        vz: Math.sin(a) * s * 0.7 + 0.4,
        life: r.range(0.45, 0.8),
        size0: 2,
        size1: 1,
        color0: color,
        alpha0: 1,
        alpha1: 0.8,
        drag: 1.2,
        lift: -9,
        windFactor: 0,
      });
    }
  }

  /** Laub, das beim Fällen eines Baums herabrieselt. */
  leaves(x, z, height = 2.5, count = 26) {
    const r = this.rng;
    for (let i = 0; i < count; i++) {
      this.particles.spawn({
        x: x + r.range(-0.9, 0.9),
        y: r.range(0.8, height),
        z: z + r.range(-0.6, 0.6),
        vx: r.range(-0.6, 0.6),
        vy: r.range(-0.2, 0.6),
        vz: r.range(-0.3, 0.5),
        life: r.range(0.9, 1.6),
        size0: 2,
        size1: 2,
        color0: LEAVES[i % LEAVES.length],
        alpha0: 1,
        alpha1: 0.6,
        drag: 2.2,
        lift: -1.6,
        windFactor: 2,
      });
    }
  }

  /** Staubwolke am Boden (Bauen, Abreißen, Ausbau). */
  dust(x, z, size = 1, count = 22) {
    const r = this.rng;
    for (let i = 0; i < count; i++) {
      const a = r.range(0, Math.PI * 2);
      const d = r.range(0.2, 0.6) * size;
      this.particles.spawn({
        x: x + Math.cos(a) * d,
        y: r.range(0.05, 0.3),
        z: z + Math.sin(a) * d * 0.8,
        vx: Math.cos(a) * r.range(0.4, 1.1),
        vy: r.range(0.3, 0.9),
        vz: Math.sin(a) * r.range(0.3, 0.9),
        life: r.range(0.7, 1.3),
        size0: 3,
        size1: 6,
        color0: DUST[i % DUST.length],
        alpha0: 0.9,
        alpha1: 0,
        drag: 2.5,
        lift: 0.2,
        windFactor: 0.6,
        round: true,
      });
    }
  }
}
