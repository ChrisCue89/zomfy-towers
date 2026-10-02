// Möbel zum Einrichten (Meilenstein 6). Seit Meilenstein 11 stehen sie im
// Wohnraum des Innenraums, im feinen Maß (1/16 m) und im Voxel-Raster von
// interior.js (Ursprung Nordwest-Ecke des Grundrisses, Fußboden bei y = 2):
// Bild und Lichterkette an der Rückwand, der Sessel am Kamin, Knopfs Körbchen
// vor dem Feuer. Sichtbar sind nur Ober- und Südseiten.
// N4: Das Haus ist größer geworden – die Stücke stehen an denselben Plätzen relativ
// zu Kommode, Tisch und Kamin (WOHN in interior.js), alles Absolute ist verschoben.

import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';
import { INTERIOR_FLOOR as FLOOR, INTERIOR_TOP as TOP } from './interior.js';

function bild() {
  const m = new VoxelModel();
  // Rahmen mit kleiner Landschaft: Himmel, Sonne, See, ein Häuschen am Ufer
  const b = 66; // N4: mit der Kommode verschoben
  m.box(149 + b, FLOOR + 26, 4, 158 + b, FLOOR + 34, 4, (x, y) => {
    const u = x - b;
    if (u === 149 || u === 158 || y === FLOOR + 26 || y === FLOOR + 34) return P.e3;
    if (y >= FLOOR + 31) return u === 155 && y === FLOOR + 32 ? P.f6 : P.b5;
    if (y === FLOOR + 30) return u <= 152 ? P.g5 : P.b4;
    if (y <= FLOOR + 28) return u >= 154 ? P.b3 : P.g6;
    return u === 151 ? P.r3 : P.g6;
  });
  return { model: m };
}

function teekanne() {
  const m = new VoxelModel();
  // Auf dem Tisch (Decke bei y = FLOOR + 14): bauchige Kanne, Tülle, Deckel, Henkel, zwei Tassen
  const dx = 64; // N4: mit dem Tisch verschoben
  const dz = 16;
  m.box(172 + dx, FLOOR + 15, 49 + dz, 175 + dx, FLOOR + 17, 52 + dz, (x, y) => (y === FLOOR + 17 ? P.a2 : P.a3));
  m.box(173 + dx, FLOOR + 18, 50 + dz, 174 + dx, FLOOR + 18, 51 + dz, P.a2);
  m.set(173 + dx, FLOOR + 19, 50 + dz, P.a4);
  m.set(176 + dx, FLOOR + 16, 51 + dz, P.a2).set(177 + dx, FLOOR + 17, 51 + dz, P.a2); // Tülle
  m.set(171 + dx, FLOOR + 16, 50 + dz, P.a2).set(171 + dx, FLOOR + 17, 50 + dz, P.a2); // Henkel
  m.box(178 + dx, FLOOR + 15, 53 + dz, 179 + dx, FLOOR + 16, 54 + dz, P.a4); // Tassen
  m.box(168 + dx, FLOOR + 15, 48 + dz, 169 + dx, FLOOR + 16, 49 + dz, P.a4);
  return { model: m };
}

function wimpel() {
  const m = new VoxelModel();
  // Wimpelkette quer durch den Wohnraum, bunte Dreiecke an einer Schnur
  const colors = [P.r3, P.f6, P.b3, P.g6, P.a1, P.a5];
  const x0 = 213; // N4: über die ganze, breitere Stube
  const x1 = 366;
  for (let x = x0; x <= x1; x++) {
    const sag = Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 6);
    const y = TOP - 3 - sag;
    m.set(x, y, 58, P.e8);
    const k = Math.floor((x - x0) / 5);
    const i = (x - x0) % 5;
    if (i < 4) {
      const c = colors[k % colors.length];
      m.set(x, y - 1, 58, c);
      if (i === 1 || i === 2) m.set(x, y - 2, 58, c);
      if (i === 1) m.set(x, y - 3, 58, c);
    }
  }
  return { model: m };
}

function lichterkette() {
  const m = new VoxelModel();
  const glow = new VoxelModel();
  // An der Rückwand unter dem Deckenbalken, links und rechts vom Kamin
  const colors = [P.f6, P.a1, P.a6, P.f7];
  for (let x = 213; x <= 366; x++) {
    if (x >= 273 && x <= 306) continue; // N4: der Kamin steht jetzt bei 274
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
  const d = 90; // N4: mit dem Kamin verschoben
  const e = 19; // M29: an die Südwestecke des Sessels – über ihm hängt das Erinnerungsregal
  m.box(163 + d, FLOOR, 13 + e, 166 + d, FLOOR, 16 + e, P.s2);
  m.box(164 + d, FLOOR + 1, 14 + e, 165 + d, FLOOR + 22, 15 + e, P.s3);
  glow.box(161 + d, FLOOR + 23, 11 + e, 168 + d, FLOOR + 27, 18 + e, (x, y, z) => {
    const edge = (x === 161 + d || x === 168 + d) && (z === 11 + e || z === 18 + e);
    if (edge) return null;
    if (y === FLOOR + 27 && (x === 161 + d || x === 168 + d || z === 11 + e || z === 18 + e)) return null;
    return P.f6;
  });
  return { model: m, glow, collider: { x0: 162 + d, z0: 12 + e, x1: 168 + d, z1: 18 + e } };
}

function lesesessel() {
  const m = new VoxelModel();
  // Dicker, geflickter Ohrensessel mit Blick aufs Feuer (nach Osten)
  const d = 90; // N4: mit dem Kamin verschoben
  const fabric = (x, y, z) => ((x + z) % 7 === 0 ? P.r2 : (x + y) % 9 === 0 ? P.f4 : P.r3);
  m.box(168 + d, FLOOR, 17, 179 + d, FLOOR + 5, 28, fabric); // Sitz
  m.box(168 + d, FLOOR + 6, 17, 170 + d, FLOOR + 17, 28, fabric); // Lehne im Westen
  m.box(168 + d, FLOOR + 14, 16, 172 + d, FLOOR + 19, 17, fabric).box(168 + d, FLOOR + 14, 28, 172 + d, FLOOR + 19, 29, fabric); // Ohren
  m.box(171 + d, FLOOR + 6, 17, 179 + d, FLOOR + 9, 18, fabric).box(171 + d, FLOOR + 6, 27, 179 + d, FLOOR + 9, 28, fabric); // Armlehnen
  m.box(172 + d, FLOOR + 6, 20, 176 + d, FLOOR + 7, 25, P.a4); // Kissen
  m.box(173 + d, FLOOR + 8, 21, 175 + d, FLOOR + 8, 24, P.a1);
  for (const [x, z] of [[168, 17], [179, 17], [168, 28], [179, 28]]) m.set(x + d, FLOOR, z, P.e2);
  // Häkeldecke über der Lehne
  m.box(168 + d, FLOOR + 10, 19, 169 + d, FLOOR + 17, 26, (x, y, z) => ((y + z) % 3 === 0 ? P.b4 : (y + z) % 3 === 1 ? P.f6 : P.a4));
  return { model: m, collider: { x0: 168 + d, z0: 16, x1: 180 + d, z1: 30 } };
}

/** Körbchen für Knopf: Weidenkorb mit karierter Decke, vor dem Kamin. */
function koerbchen() {
  const m = new VoxelModel();
  const x0 = 304; // N4: mit dem Kamin verschoben (vor dem Feuer, Ostseite)
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

// --- N4: Balduins Katalog – Stube ------------------------------------------------------

/** Flickenteppich unter dem Tisch: Quadrate in Herbstfarben, dunkler Saum. */
function flickenteppich() {
  const m = new VoxelModel();
  const colors = [P.r3, P.b3, P.f5, P.g5, P.a1, P.e6, P.d4];
  const x0 = 219;
  const x1 = 256;
  const z0 = 50;
  const z1 = 86;
  m.box(x0, FLOOR, z0, x1, FLOOR, z1, (x, y, z) => {
    if (x === x0 || x === x1 || z === z0 || z === z1) return (x + z) % 2 ? P.e2 : P.e3; // Saum
    const k = (Math.floor((x - x0) / 6) * 3 + Math.floor((z - z0) / 6) * 5) % colors.length;
    if ((x - x0) % 6 === 0 || (z - z0) % 6 === 0) return P.e8; // Nähte
    return colors[k];
  });
  return { model: m };
}

/** Blumenampel am Fenster: Topf an Schnüren, Ranken hängen herab. */
function blumenampel() {
  const m = new VoxelModel();
  const cx = 242;
  const cz = 10;
  for (const [dx, dz] of [[-2, -2], [2, -2], [0, 2]]) m.line(cx + dx, FLOOR + 33, cz + dz, cx, TOP + 1, cz, P.e8);
  m.cylinder(cx + 0.5, cz + 0.5, FLOOR + 29, FLOOR + 32, 2.6, (x, y) => (y === FLOOR + 32 ? P.r2 : P.r3));
  const leaves = [P.g5, P.g6, P.g7];
  for (const [dx, dz, len] of [[-3, 0, 7], [3, 1, 9], [0, 3, 6], [-2, 3, 8], [2, -2, 5]]) {
    for (let k = 0; k <= len; k++) m.set(cx + dx + (k % 3 === 2 ? Math.sign(dx) : 0), FLOOR + 32 - k, cz + dz, leaves[(k + dx) % 3 < 0 ? 0 : (k + dx) % 3]);
  }
  m.set(cx - 1, FLOOR + 33, cz, P.a0).set(cx + 1, FLOOR + 34, cz + 1, P.a1); // zwei Blüten
  return { model: m };
}

/** Bücherregal rechts vom Kamin: vier Böden, bunte Buchrücken, ein Globus obenauf. */
function buecherregal() {
  const m = new VoxelModel();
  const x0 = 310;
  const x1 = 324;
  m.box(x0, FLOOR, 4, x1, FLOOR + 30, 10, (x, y, z) => (x === x0 || x === x1 || (y - FLOOR) % 8 === 0 ? P.e3 : z === 4 ? P.e2 : null));
  const books = [P.r3, P.b3, P.g4, P.f5, P.d4, P.e6, P.a2, P.b4];
  for (let shelf = 0; shelf < 3; shelf++) {
    const y0 = FLOOR + 1 + shelf * 8;
    let x = x0 + 1;
    let k = shelf * 3;
    while (x < x1) {
      const h = 5 + ((x * 7 + shelf) % 3);
      const w = (x + shelf) % 4 === 0 ? 2 : 1;
      if (x + w > x1) break;
      m.box(x, y0, 5, x + w - 1, y0 + h - 1, 9, (xx, yy) => (yy === y0 + h - 2 ? P.f6 : books[k % books.length])); // Rücken mit Goldstreifen
      x += w;
      k++;
      if ((x + shelf) % 6 === 0) x++; // Lücke
    }
  }
  m.cylinder(x0 + 7.5, 7.5, FLOOR + 31, FLOOR + 31, 1.6, P.e3); // Globus-Fuß
  m.ellipsoid(x0 + 7.5, FLOOR + 34.5, 7.5, 3, 3, 3, (x, y, z) => ((x * 3 + y + z * 2) % 5 < 2 ? P.g5 : P.b4));
  return { model: m, collider: { x0, z0: 4, x1: x1 + 1, z1: 11 } };
}

/** Standuhr an der Westwand: Gehäuse, Zifferblatt, Pendel hinter Glas. */
function standuhr() {
  const m = new VoxelModel();
  const x0 = 213;
  const z0 = 26;
  m.box(x0, FLOOR, z0, x0 + 6, FLOOR + 38, z0 + 5, (x, y, z) => {
    if (y >= FLOOR + 36) return P.e3; // Krone
    if (z === z0 + 5 && x > x0 && x < x0 + 6 && y >= FLOOR + 27 && y <= FLOOR + 33) {
      const dx = x - (x0 + 3);
      const dy = y - (FLOOR + 30);
      if (dx === 0 && dy === 0) return P.n1;
      if ((dx === 0 && dy > 0) || (dy === 0 && dx > 0 && dx < 2)) return P.n1; // Zeiger
      return P.s9; // Zifferblatt
    }
    if (z === z0 + 5 && x > x0 && x < x0 + 6 && y >= FLOOR + 6 && y <= FLOOR + 24) {
      if (x === x0 + 3 && y >= FLOOR + 12) return P.f5; // Pendelstange
      if (x >= x0 + 2 && x <= x0 + 4 && y >= FLOOR + 9 && y <= FLOOR + 11) return P.f6; // Pendel
      return P.n3; // Glas, dunkel
    }
    return (x + y) % 7 === 0 ? P.e4 : P.e5;
  });
  return { model: m, collider: { x0, z0, x1: x0 + 7, z1: z0 + 6 } };
}

/** Sofa östlich vom Teppich, dem Kamin zugewandt: Polster, Lehne, zwei Kissen, eine Decke. */
function sofa() {
  const m = new VoxelModel();
  const x0 = 318;
  const z0 = 20;
  const z1 = 45;
  const fabric = (x, y, z) => ((x + y + z) % 6 === 0 ? P.g3 : P.g4);
  m.box(x0, FLOOR, z0, x0 + 9, FLOOR + 5, z1, fabric); // Sitz
  m.box(x0 + 7, FLOOR + 6, z0, x0 + 9, FLOOR + 14, z1, fabric); // Lehne im Osten
  m.box(x0, FLOOR + 6, z0, x0 + 6, FLOOR + 9, z0 + 1, fabric).box(x0, FLOOR + 6, z1 - 1, x0 + 6, FLOOR + 9, z1, fabric); // Armlehnen
  for (let z = z0 + 3; z <= z1 - 3; z += 12) m.box(x0 + 1, FLOOR + 6, z, x0 + 6, FLOOR + 7, z + 9, P.g5); // Sitzpolster
  m.box(x0 + 5, FLOOR + 6, z0 + 3, x0 + 6, FLOOR + 11, z0 + 8, P.f5).box(x0 + 5, FLOOR + 6, z1 - 8, x0 + 6, FLOOR + 11, z1 - 3, P.a1); // Kissen
  m.box(x0 + 7, FLOOR + 10, z0 + 12, x0 + 9, FLOOR + 15, z0 + 19, (x, y, z) => ((y + z) % 3 === 0 ? P.a4 : P.r3)); // Decke über der Lehne
  for (const [x, z] of [[x0, z0], [x0 + 9, z0], [x0, z1], [x0 + 9, z1]]) m.set(x, FLOOR, z, P.e2);
  return { model: m, collider: { x0, z0, x1: x0 + 10, z1: z1 + 1 } };
}

/** Grammophon auf einem Schränkchen: Trichter, Plattenteller, Kurbel. */
function grammophon() {
  const m = new VoxelModel();
  const x0 = 338; // neben dem Fenster, frei von der Pflanze vorn an der Wand
  const z0 = 86;
  m.box(x0, FLOOR, z0, x0 + 9, FLOOR + 10, z0 + 7, (x, y, z) => (y === FLOOR + 10 ? P.e6 : z === z0 + 7 && (x === x0 + 4 || x === x0 + 5) && y === FLOOR + 6 ? P.s6 : P.e4));
  m.box(x0 + 1, FLOOR + 11, z0 + 1, x0 + 8, FLOOR + 13, z0 + 6, P.e3); // Kasten
  m.cylinder(x0 + 4.5, z0 + 3.5, FLOOR + 14, FLOOR + 14, 2.8, (x, y, z) => ((x + z) % 2 ? P.n1 : P.n2)); // Platte
  m.set(x0 + 4, FLOOR + 15, z0 + 3, P.r3);
  // Trichter: vom Tonarm schräg nach oben, messingfarben aufgeweitet
  for (let k = 0; k < 8; k++) {
    const r = Math.floor(k / 2);
    m.box(x0 + 6 + k, FLOOR + 15 + k, z0 + 3 - r, x0 + 6 + k, FLOOR + 15 + k + r, z0 + 3 + r, k === 7 ? P.f6 : P.f5);
  }
  m.set(x0 + 9, FLOOR + 12, z0 + 7, P.s6).set(x0 + 10, FLOOR + 12, z0 + 7, P.s6); // Kurbel
  return { model: m, collider: { x0, z0, x1: x0 + 10, z1: z0 + 8 } };
}

// --- N4: Küche ----------------------------------------------------------------------

/** Zwiebelzopf an der Wand zwischen Anrichte und Herd. */
function zwiebelzopf() {
  const m = new VoxelModel();
  const x = 130;
  for (let y = FLOOR + 18; y <= FLOOR + 32; y++) m.set(x, y, 4, P.e8);
  for (let k = 0; k < 6; k++) {
    const y = FLOOR + 19 + k * 2;
    const side = k % 2 ? 1 : -1;
    m.ellipsoid(x + side, y, 5, 1.4, 1.2, 1.2, k % 3 === 0 ? P.d4 : P.f5);
  }
  m.set(x, FLOOR + 33, 4, P.s5); // Nagel
  return { model: m };
}

/** Kräutertöpfe auf der Fensterbank über der Spüle. */
function kraeuter() {
  const m = new VoxelModel();
  for (const [x, c] of [[169, P.g6], [174, P.g5], [179, P.g7]]) {
    m.box(x, 21, 3, x + 2, 23, 5, (xx, y) => (y === 23 ? P.r2 : P.r3));
    for (const [dx, dy] of [[0, 0], [1, 1], [2, 0], [1, 2], [0, 2], [2, 3]]) m.set(x + dx, 24 + dy, 4, (dx + dy) % 2 ? c : P.g4);
  }
  return { model: m };
}

/** Kupferpfannen an einer Leiste zwischen Herd und Spüle. */
function kupfertoepfe() {
  const m = new VoxelModel();
  m.box(158, FLOOR + 30, 4, 165, FLOOR + 30, 5, P.e3);
  for (const [x, size] of [[159, 2], [162, 3]]) {
    m.box(x, FLOOR + 25, 5, x, FLOOR + 29, 5, P.e2); // Stiel
    m.cylinder(x + 0.5, 7, FLOOR + 21 - size, FLOOR + 24, size + 0.6, (xx, y) => (y === FLOOR + 24 ? P.f5 : (xx + y) % 3 === 0 ? P.f4 : P.f3));
  }
  return { model: m };
}

/** Kürbiskuchen mit Gitter auf dem Küchentisch. */
function kuchen() {
  const m = new VoxelModel();
  const x0 = 146;
  const z0 = 63;
  m.cylinder(x0 + 3.5, z0 + 3.5, FLOOR + 14, FLOOR + 14, 4.2, P.e7); // Teig
  m.cylinder(x0 + 3.5, z0 + 3.5, FLOOR + 15, FLOOR + 15, 3.4, (x, y, z) => ((x + z) % 3 === 0 ? P.e8 : P.f4)); // Füllung mit Gitter
  m.set(x0 + 3, FLOOR + 16, z0 + 3, P.s9); // Sahnetupfer
  return { model: m };
}

// --- N4: Schlafzimmer ---------------------------------------------------------------

/** Hausschuhe vor dem Bett, mit weißem Plüsch. */
function hausschuhe() {
  const m = new VoxelModel();
  for (const x of [400, 405]) {
    m.box(x, FLOOR, 42, x + 2, FLOOR + 1, 46, (xx, y, z) => (z <= 43 && y === FLOOR + 1 ? P.s9 : P.r3));
    m.set(x + 1, FLOOR + 1, 46, P.r2);
  }
  return { model: m };
}

/** Standspiegel zwischen Bett und Schrank. */
function standspiegel() {
  const m = new VoxelModel();
  const x0 = 427;
  m.box(x0, FLOOR, 7, x0 + 7, FLOOR, 10, P.e3); // Fuß
  m.box(x0, FLOOR + 1, 8, x0 + 7, FLOOR + 30, 8, (x, y) => {
    if (x === x0 || x === x0 + 7 || y === FLOOR + 1 || y === FLOOR + 30) return P.e4;
    if ((x + y) % 11 === 0 || (x + y) % 11 === 1) return P.s9; // Glanz
    return y > FLOOR + 18 ? P.b5 : P.n6;
  });
  return { model: m, collider: { x0, z0: 7, x1: x0 + 8, z1: 11 } };
}

/** Patchwork-Quilt über dem Fußende des Betts, hängt an den Seiten herab. */
function quilt() {
  const m = new VoxelModel();
  const x0 = 392;
  const x1 = 419;
  const patch = [P.r3, P.f5, P.g5, P.a1, P.b3, P.e6];
  m.box(x0, FLOOR + 8, 27, x1, FLOOR + 8, 39, (x, y, z) => (x === x0 || x === x1 || z === 39 ? P.e3 : (x - x0) % 4 === 0 || (z - 27) % 4 === 0 ? P.e8 : patch[(Math.floor((x - x0) / 4) + Math.floor((z - 27) / 4) * 2) % patch.length]));
  m.box(x0 - 1, FLOOR + 3, 27, x0 - 1, FLOOR + 8, 39, (x, y, z) => ((y + z) % 4 === 0 ? P.e8 : patch[Math.floor(z / 4) % patch.length]));
  m.box(x1 + 1, FLOOR + 3, 27, x1 + 1, FLOOR + 8, 39, (x, y, z) => ((y + z) % 4 === 0 ? P.e8 : patch[(Math.floor(z / 4) + 2) % patch.length]));
  return { model: m };
}

// --- N4: Werkstatt und Lager ----------------------------------------------------------

/** Arbeitshocker vor der Werkbank. */
function hocker() {
  const m = new VoxelModel();
  const x0 = 22;
  const z0 = 20;
  m.box(x0, FLOOR + 9, z0, x0 + 5, FLOOR + 10, z0 + 5, P.e6);
  for (const [x, z] of [[x0, z0], [x0 + 5, z0], [x0, z0 + 5], [x0 + 5, z0 + 5]]) m.box(x, FLOOR, z, x, FLOOR + 8, z, P.e3);
  m.box(x0, FLOOR + 4, z0, x0 + 5, FLOOR + 4, z0, P.e4).box(x0, FLOOR + 4, z0 + 5, x0 + 5, FLOOR + 4, z0 + 5, P.e4);
  return { model: m, collider: { x0, z0, x1: x0 + 6, z1: z0 + 6 } };
}

/** Rote Werkzeugkiste neben dem Sägebock, oben ragen Griffe heraus. */
function werkzeugkiste() {
  const m = new VoxelModel();
  const x0 = 50;
  const z0 = 60;
  m.box(x0, FLOOR, z0, x0 + 8, FLOOR + 5, z0 + 5, (x, y, z) => (y === FLOOR + 5 ? P.r2 : z === z0 + 5 && y === FLOOR + 3 ? P.s6 : P.r3));
  m.box(x0 + 3, FLOOR + 7, z0 + 2, x0 + 5, FLOOR + 7, z0 + 3, P.s4).set(x0 + 3, FLOOR + 6, z0 + 2, P.s4).set(x0 + 5, FLOOR + 6, z0 + 2, P.s4); // Griff
  m.box(x0 + 1, FLOOR + 6, z0 + 1, x0 + 1, FLOOR + 8, z0 + 1, P.e5).set(x0 + 7, FLOOR + 6, z0 + 4, P.s6).set(x0 + 7, FLOOR + 7, z0 + 4, P.s6);
  return { model: m, collider: { x0, z0, x1: x0 + 9, z1: z0 + 6 } };
}

/** Gestapelte Apfelkisten, rot und grün. */
function apfelkisten() {
  const m = new VoxelModel();
  for (const [x0, y0, z0, apple] of [[540, 0, 20, P.r3], [549, 0, 20, P.g6], [544, 6, 21, P.r4]]) {
    m.box(x0, FLOOR + y0, z0, x0 + 8, FLOOR + y0 + 5, z0 + 7, (x, y, z) => (x === x0 || x === x0 + 8 || z === z0 || z === z0 + 7 || y === FLOOR + y0 ? ((x + y) % 3 ? P.e5 : P.e4) : null));
    for (let x = x0 + 1; x <= x0 + 7; x += 2) for (let z = z0 + 1; z <= z0 + 6; z += 2) m.set(x, FLOOR + y0 + 5, z, (x + z) % 4 === 0 ? P.e8 : apple);
  }
  return { model: m, collider: { x0: 540, z0: 20, x1: 558, z1: 28 } };
}

/** Hängematte zwischen zwei Pfosten vorn im Lager. */
function haengematte() {
  const m = new VoxelModel();
  const xa = 520; // östlich der Säcke
  const xb = 550;
  const z = 94;
  for (const x of [xa, xb]) m.box(x, FLOOR, z - 1, x + 1, FLOOR + 22, z + 1, P.e3);
  for (let x = xa + 2; x < xb; x++) {
    const q = (x - xa - 2) / (xb - xa - 2);
    const y = Math.round(FLOOR + 17 - Math.sin(q * Math.PI) * 9);
    const stripe = Math.floor((x - xa) / 3) % 3;
    for (let dz = -2; dz <= 2; dz++) m.set(x, y, z + dz, [P.f5, P.r3, P.s9][stripe]);
  }
  return { model: m, collider: { x0: xa, z0: z - 1, x1: xb + 2, z1: z + 2 } };
}

export const FURNITURE_MODELS = {
  bild,
  teekanne,
  wimpel,
  lichterkette,
  stehlampe,
  lesesessel,
  koerbchen,
  flickenteppich,
  blumenampel,
  buecherregal,
  standuhr,
  sofa,
  grammophon,
  zwiebelzopf,
  kraeuter,
  kupfertoepfe,
  kuchen,
  hausschuhe,
  standspiegel,
  quilt,
  hocker,
  werkzeugkiste,
  apfelkisten,
  haengematte,
};
