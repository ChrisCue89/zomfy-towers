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
const SPLAT = {
  kuerbis: [c(P.f4), c(P.f5), c(P.f3), c(P.g5)],
  feuer: [c(P.f5), c(P.f6), c(P.f3), c(P.f7)],
  wasser: [c(0xd8f0ff), c(0xa8dcff), c(P.b5), c(0xeaf8ff)], // hell – auch nachts zu sehen
  frost: [c(0xe8f8ff), c(P.b5), c(P.a4)],
  schlamm: [c(P.e3), c(P.e4), c(P.e2)],
  moos: [c(P.g5), c(P.g6), c(P.t4), c(P.a1)],
  funken: [c(P.f7), c(P.f8), c(P.s8)],
};

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

  /** Spritzer in alle Richtungen (Kürbis, Wasser, Schlamm, Moos beim Tod …). */
  splat(x, y, z, kind = 'kuerbis', count = 12, power = 1) {
    const colors = SPLAT[kind] || SPLAT.kuerbis;
    const r = this.rng;
    for (let i = 0; i < count; i++) {
      const a = r.range(0, Math.PI * 2);
      const s = r.range(0.6, 2.4) * power;
      this.particles.spawn({
        x: x + r.range(-0.1, 0.1),
        y: y + r.range(0, 0.2),
        z: z + r.range(-0.1, 0.1),
        vx: Math.cos(a) * s,
        vy: r.range(1.2, 3.4) * power,
        vz: Math.sin(a) * s * 0.8,
        life: r.range(0.4, 0.8),
        size0: kind === 'frost' ? 3 : 2,
        size1: 1,
        color0: colors[i % colors.length],
        alpha0: 1,
        alpha1: 0.7,
        drag: 1.4,
        lift: kind === 'frost' ? -2 : -9,
        windFactor: 0,
      });
    }
  }

  /** Wasserstrahl eines Rasensprengers in Richtung angle. */
  spray(x, y, z, angle, reach, kind = 'wasser') {
    const colors = SPLAT[kind] || SPLAT.wasser;
    const r = this.rng;
    const a = angle + r.range(-0.25, 0.25);
    const s = reach * r.range(1.6, 2.2);
    this.particles.spawn({
      x,
      y,
      z,
      vx: Math.sin(a) * s,
      vy: r.range(1.4, 2.2),
      vz: Math.cos(a) * s,
      life: r.range(0.45, 0.6),
      size0: 3,
      size1: kind === 'frost' ? 4 : 2,
      color0: colors[Math.floor(r.range(0, colors.length))],
      alpha0: 0.95,
      alpha1: kind === 'frost' ? 0.2 : 0.6,
      drag: 1.8,
      lift: kind === 'frost' ? -1 : -7,
      windFactor: 0.2,
    });
  }

  /** Flammen auf brennendem Boden. */
  flames(x, z, radius) {
    const r = this.rng;
    const a = r.range(0, Math.PI * 2);
    const d = Math.sqrt(r.next()) * radius;
    this.particles.spawn({
      x: x + Math.cos(a) * d,
      y: 0.05,
      z: z + Math.sin(a) * d * 0.8,
      vx: 0,
      vy: r.range(0.6, 1.2),
      vz: 0,
      life: r.range(0.35, 0.6),
      size0: 3,
      size1: 1,
      color0: SPLAT.feuer[Math.floor(r.range(0, 4))],
      color1: c(P.f2),
      alpha0: 1,
      alpha1: 0.3,
      drag: 0.5,
      lift: 1.5,
      windFactor: 0.5,
    });
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
