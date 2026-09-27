// Möbel zum Einrichten (Meilenstein 6). Seit Meilenstein 11 stehen sie im
// Wohnraum des Innenraums, im feinen Maß (1/16 m) und im Voxel-Raster von
// interior.js (Ursprung Nordwest-Ecke des Grundrisses, Fußboden bei y = 2):
// Bild und Lichterkette an der Rückwand, der Sessel am Kamin, Knopfs Körbchen
// vor dem Feuer. Sichtbar sind nur Ober- und Südseiten.

import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';
import { INTERIOR_FLOOR as FLOOR, INTERIOR_TOP as TOP } from './interior.js';

function bild() {
  const m = new VoxelModel();
  // Rahmen mit kleiner Landschaft: Himmel, Sonne, See, ein Häuschen am Ufer
  m.box(149, FLOOR + 26, 4, 158, FLOOR + 34, 4, (x, y) => {
    if (x === 149 || x === 158 || y === FLOOR + 26 || y === FLOOR + 34) return P.e3;
    if (y >= FLOOR + 31) return x === 155 && y === FLOOR + 32 ? P.f6 : P.b5;
    if (y === FLOOR + 30) return x <= 152 ? P.g5 : P.b4;
    if (y <= FLOOR + 28) return x >= 154 ? P.b3 : P.g6;
    return x === 151 ? P.r3 : P.g6;
  });
  return { model: m };
}

function teekanne() {
  const m = new VoxelModel();
  // Auf dem Tisch (Decke bei y = FLOOR + 14): bauchige Kanne, Tülle, Deckel, Henkel, zwei Tassen
  m.box(164, FLOOR + 15, 49, 167, FLOOR + 17, 52, (x, y) => (y === FLOOR + 17 ? P.a2 : P.a3));
  m.box(165, FLOOR + 18, 50, 166, FLOOR + 18, 51, P.a2);
  m.set(165, FLOOR + 19, 50, P.a4);
  m.set(168, FLOOR + 16, 51, P.a2).set(169, FLOOR + 17, 51, P.a2); // Tülle
  m.set(163, FLOOR + 16, 50, P.a2).set(163, FLOOR + 17, 50, P.a2); // Henkel
  m.box(170, FLOOR + 15, 53, 171, FLOOR + 16, 54, P.a4); // Tassen
  m.box(160, FLOOR + 15, 48, 161, FLOOR + 16, 49, P.a4);
  return { model: m };
}

function wimpel() {
  const m = new VoxelModel();
  // Wimpelkette quer durch den Wohnraum, bunte Dreiecke an einer Schnur
  const colors = [P.r3, P.f6, P.b3, P.g6, P.a1, P.a5];
  const x0 = 149;
  const x1 = 250;
  for (let x = x0; x <= x1; x++) {
    const sag = Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 6);
    const y = TOP - 3 - sag;
    m.set(x, y, 44, P.e8);
    const k = Math.floor((x - x0) / 5);
    const i = (x - x0) % 5;
    if (i < 4) {
      const c = colors[k % colors.length];
      m.set(x, y - 1, 44, c);
      if (i === 1 || i === 2) m.set(x, y - 2, 44, c);
      if (i === 1) m.set(x, y - 3, 44, c);
    }
  }
  return { model: m };
}

function lichterkette() {
  const m = new VoxelModel();
  const glow = new VoxelModel();
  // An der Rückwand unter dem Deckenbalken, links und rechts vom Kamin
  const colors = [P.f6, P.a1, P.a6, P.f7];
  for (let x = 149; x <= 250; x++) {
    if (x >= 183 && x <= 216) continue;
    const y = TOP - 5 - (x % 8 < 4 ? 0 : 1);
    m.set(x, y, 4, P.s3);
    if (x % 4 === 0) glow.set(x, y - 1, 4, colors[Math.floor(x / 4) % colors.length]);
  }
  return { model: m, glow };
}

function stehlampe() {
  const m = new VoxelModel();
  const glow = new VoxelModel();
  // Leselampe neben dem Sessel: Fuß, Stange, Schirm
  m.box(163, FLOOR, 13, 166, FLOOR, 16, P.s2);
  m.box(164, FLOOR + 1, 14, 165, FLOOR + 22, 15, P.s3);
  glow.box(161, FLOOR + 23, 11, 168, FLOOR + 27, 18, (x, y, z) => {
    const edge = (x === 161 || x === 168) && (z === 11 || z === 18);
    if (edge) return null;
    if (y === FLOOR + 27 && (x === 161 || x === 168 || z === 11 || z === 18)) return null;
    return P.f6;
  });
  return { model: m, glow, collider: { x0: 162, z0: 12, x1: 168, z1: 18 } };
}

function lesesessel() {
  const m = new VoxelModel();
  // Dicker, geflickter Ohrensessel mit Blick aufs Feuer (nach Osten)
  const fabric = (x, y, z) => ((x + z) % 7 === 0 ? P.r2 : (x + y) % 9 === 0 ? P.f4 : P.r3);
  m.box(168, FLOOR, 17, 179, FLOOR + 5, 28, fabric); // Sitz
  m.box(168, FLOOR + 6, 17, 170, FLOOR + 17, 28, fabric); // Lehne im Westen
  m.box(168, FLOOR + 14, 16, 172, FLOOR + 19, 17, fabric).box(168, FLOOR + 14, 28, 172, FLOOR + 19, 29, fabric); // Ohren
  m.box(171, FLOOR + 6, 17, 179, FLOOR + 9, 18, fabric).box(171, FLOOR + 6, 27, 179, FLOOR + 9, 28, fabric); // Armlehnen
  m.box(172, FLOOR + 6, 20, 176, FLOOR + 7, 25, P.a4); // Kissen
  m.box(173, FLOOR + 8, 21, 175, FLOOR + 8, 24, P.a1);
  for (const [x, z] of [[168, 17], [179, 17], [168, 28], [179, 28]]) m.set(x, FLOOR, z, P.e2);
  // Häkeldecke über der Lehne
  m.box(168, FLOOR + 10, 19, 169, FLOOR + 17, 26, (x, y, z) => ((y + z) % 3 === 0 ? P.b4 : (y + z) % 3 === 1 ? P.f6 : P.a4));
  return { model: m, collider: { x0: 168, z0: 16, x1: 180, z1: 30 } };
}

/** Körbchen für Knopf: Weidenkorb mit karierter Decke, vor dem Kamin. */
function koerbchen() {
  const m = new VoxelModel();
  const x0 = 214;
  const z0 = 42;
  m.box(x0, FLOOR, z0, x0 + 11, FLOOR + 3, z0 + 8, (x, y, z) => {
    const rim = x === x0 || x === x0 + 11 || z === z0 || z === z0 + 8;
    if (!rim && y === FLOOR + 2) return Math.floor(x / 2 + z / 2) % 2 ? P.b3 : P.a4; // karierte Decke
    if (!rim) return y > FLOOR + 2 ? null : P.e4;
    return (x + y + z) % 2 ? P.e6 : P.e5;
  });
  m.box(x0, FLOOR + 4, z0, x0 + 11, FLOOR + 5, z0 + 1, (x, y) => (x % 2 ? P.e6 : P.e5)); // hoher Rand hinten
  return { model: m, collider: { x0, z0, x1: x0 + 12, z1: z0 + 9 } };
}

export const FURNITURE_MODELS = { bild, teekanne, wimpel, lichterkette, stehlampe, lesesessel, koerbchen };
