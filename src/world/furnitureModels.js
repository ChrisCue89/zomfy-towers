// Möbel zum Einrichten (Meilenstein 6). Die Modelle liegen im Voxel-Raster
// der Notunterkunft (1/8 m, Ursprung = Südwest-Ecke unten, siehe shelter.js):
// So stehen sie genau zwischen Bett, Ofen, Tisch und Regal. Sichtbar sind nur
// Ober- und Südseiten – Bilder hängen deshalb an der Rückwand.
// Das Körbchen für Knopf steht draußen am Feuer (Weltkoordinaten).

import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';

const FLOOR = 3;

function bild() {
  const m = new VoxelModel();
  // Rahmen mit kleiner Landschaft: Himmel, Sonne, Hügel, ein Häuschen
  m.box(4, 11, 1, 11, 16, 1, (x, y) => {
    if (x === 4 || x === 11 || y === 11 || y === 16) return P.e3;
    if (y >= 14) return x === 9 && y === 15 ? P.f6 : P.b4;
    if (y === 13) return x <= 6 ? P.g5 : P.b4;
    return x === 7 ? P.r3 : P.g6;
  });
  return { model: m };
}

function teekanne() {
  const m = new VoxelModel();
  // Auf dem Tisch (Platte bei y = 9): bauchige Kanne, Tülle, Deckel, zweite Tasse
  m.box(23, 10, 24, 24, 11, 25, (x, y) => (y === 11 ? P.a2 : P.a3));
  m.set(25, 11, 25, P.a2); // Tülle
  m.set(23, 12, 24, P.a4).set(24, 12, 25, P.a4); // Deckelknopf
  m.set(22, 11, 24, P.a2); // Henkel
  m.set(26, 10, 25, P.a4); // Tasse
  return { model: m };
}

function wimpel() {
  const m = new VoxelModel();
  // Wimpelkette quer durch den Raum, bunte Dreiecke hängen an einer Schnur
  const colors = [P.r3, P.f6, P.b3, P.g6, P.a1, P.a5];
  for (let x = 1; x <= 38; x++) {
    const sag = Math.round(Math.sin(((x - 1) / 37) * Math.PI) * 2);
    const y = 20 - sag;
    m.set(x, y, 13, P.e8);
    const k = Math.floor((x - 1) / 3);
    if ((x - 1) % 3 !== 2) {
      const c = colors[k % colors.length];
      m.set(x, y - 1, 13, c);
      if ((x - 1) % 3 === 0) m.set(x, y - 2, 13, c);
    }
  }
  return { model: m };
}

function lichterkette() {
  const m = new VoxelModel();
  const glow = new VoxelModel();
  // An der Rückwand, über Bett und Ofen (das Regal in der Mitte bleibt frei)
  for (let x = 2; x <= 37; x++) {
    if (x >= 15 && x <= 28) continue;
    const y = 21 - (x % 6 === 0 ? 1 : 0);
    m.set(x, y, 1, P.s3);
    if (x % 3 === 0) glow.set(x, y - 1, 1, [P.f6, P.a1, P.a6, P.f7][Math.floor(x / 3) % 4]);
  }
  return { model: m, glow };
}

function stehlampe() {
  const m = new VoxelModel();
  const glow = new VoxelModel();
  // Leselampe in der Ecke neben dem Sessel: Fuß, Stange, Schirm
  m.box(1, FLOOR, 19, 2, FLOOR, 20, P.s2);
  m.box(2, FLOOR + 1, 19, 2, FLOOR + 9, 19, P.s3);
  glow.box(1, FLOOR + 10, 18, 3, FLOOR + 12, 20, (x, y, z) => (y === FLOOR + 12 && (x === 1 || x === 3) && (z === 18 || z === 20) ? null : P.f6));
  return { model: m, glow, collider: { x0: 1, z0: 18.5, x1: 3, z1: 20.5 } };
}

function lesesessel() {
  const m = new VoxelModel();
  // Dicker, geflickter Sessel zwischen Nachttisch und Kiste, Blick nach Süden
  const fabric = (x, y, z) => ((x + z) % 5 === 0 ? P.r2 : (x + y) % 7 === 0 ? P.f4 : P.r3);
  m.box(2, FLOOR, 14, 7, FLOOR + 2, 18, fabric); // Sitz
  m.box(2, FLOOR + 3, 14, 7, FLOOR + 7, 15, fabric); // Lehne
  m.box(2, FLOOR + 3, 16, 2, FLOOR + 4, 18, fabric); // Armlehnen
  m.box(7, FLOOR + 3, 16, 7, FLOOR + 4, 18, fabric);
  m.box(4, FLOOR + 3, 16, 5, FLOOR + 3, 17, P.a4); // Kissen
  m.set(3, FLOOR, 18, P.e2).set(6, FLOOR, 18, P.e2);
  return { model: m, collider: { x0: 1.5, z0: 13.5, x1: 8, z1: 19 } };
}

/** Körbchen (draußen, Weltkoordinaten relativ zu `anchor`): Weidenkorb mit Decke. */
function koerbchen() {
  const m = new VoxelModel();
  m.box(0, 0, 0, 5, 1, 4, (x, y, z) => {
    const rim = x === 0 || x === 5 || z === 0 || z === 4;
    if (!rim && y === 1) return (x + z) % 2 ? P.b3 : P.a4; // karierte Decke
    if (!rim) return P.e4;
    return (x + y + z) % 2 ? P.e6 : P.e5;
  });
  m.box(0, 2, 0, 5, 2, 0, P.e6); // hoher Rand hinten
  return { model: m, outside: true };
}

export const FURNITURE_MODELS = { bild, teekanne, wimpel, lichterkette, stehlampe, lesesessel, koerbchen };
