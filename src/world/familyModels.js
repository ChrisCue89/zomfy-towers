// Die Turmfamilien aus den Bauplänen (M19), geformt wie die Figuren (N1): Rundungen
// aus Abstandsfeldern, Kuppen im Licht. Maß 1/32, ein Feld = 32 × 32 Voxel um die
// Mitte. Jede Familie hat eine eigene Silhouette:
//   Glockenturm   Glockenstuhl mit rotem Giebeldach, darunter die Glocke (Kopf,
//                 schwingt nach dem Schlag) – Sturmglocke bronzen, Friedensglocke
//                 silbern mit grünem Kranz
//   Windrad       hoher Holzmast mit Gondel, vorn vier Flügel (Kopf, dreht sich) –
//                 Sturm mit blauen Segeln, Mühle mit cremefarbenen und Mühlstein
//   Bienenkorb    geflochtener Strohkorb auf einem Bänkchen – Königin mit Krone,
//                 Honig mit Honigtropfen und Topf
//   Vogelscheuche Stroh, Hemd, Querholz, Kürbiskopf mit Hut (Kopf, schaut den
//                 Gelockten nach, das Gesicht glimmt nachts) – Strohmann dick
//                 ausgestopft, Krähenscheuche mit dunklem Mantel und Krähen

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';
import { shade, sculpt, capsule, roundBox, blob, union, subtract, roundTone } from './voxelKit.js';
import { plinth, pips, levelFlag } from './towerModels.js';

const WHITE = 0xffffff;

/** Holz mit Maserung: je vier Voxel eine dunklere Fuge, Kante links im Licht. */
function timber(x, y, lightX) {
  if (x === lightX) return P.e5;
  return (x + (y >> 3)) % 5 === 0 ? P.e3 : P.e4;
}

// --- Glockenturm -------------------------------------------------------------------

function bellBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed, 7);
  // Vier Pfosten des Glockenstuhls, oben ein Querbalken für die Glocke
  for (const [x0, z0] of [[-13, -13], [9, -13], [-13, 9], [9, 9]]) m.box(x0, 8, z0, x0 + 3, 60, z0 + 3, (x, y) => timber(x, y, x0));
  for (const y0 of [24, 44]) {
    m.box(-13, y0, 9, 12, y0 + 2, 12, (x, y) => (y === y0 + 2 ? P.e6 : P.e4)); // vorn
    m.box(-13, y0, -13, 12, y0 + 2, -10, (x, y) => (y === y0 + 2 ? P.e6 : P.e4)); // hinten
  }
  m.line(-12, 26, 11, -3, 43, 11, P.e3, 1).line(11, 26, 11, 2, 43, 11, P.e3, 1); // Streben vorn
  m.box(-13, 58, -2, 12, 61, 1, (x, y) => (y === 61 ? P.e6 : P.e3)); // Glockenbalken
  // Giebeldach (First von West nach Ost) mit Schindelreihen
  const roof = spec === 'B' ? [P.g3, P.g4, P.g5] : [P.r1, P.r2, P.r3];
  for (let k = 0; k < 11; k++) {
    const y = 62 + k;
    const zr = 16 - Math.round(k * 1.45);
    m.box(-15, y, -zr, 14, y, zr, (x, yy, z) => {
      if (Math.abs(z) < zr - 1 && k < 10) return null; // innen hohl
      if (z > 0 && (x + (k % 2) * 3) % 6 === 0) return roof[0]; // Fugen der Schindeln
      return z > 0 ? roof[2] : roof[1];
    });
  }
  m.box(-16, 73, -1, 15, 74, 0, P.e3); // First
  if (level >= 4) m.box(-1, 75, -1, 0, 80, 0, P.f6).box(-3, 78, -1, 2, 78, 0, P.f6); // Wetterfahne
  pips(m, level, 3);
  levelFlag(m, 'glockenturm', level, spec, 22);
  return m;
}

/** Die Glocke hängt unter ihrem Joch; der Drehpunkt (Ursprung) liegt im Joch. */
function bellHead(level, spec) {
  const m = new VoxelModel();
  const size = level >= 4 ? 1.15 : level >= 3 ? 1.05 : 1;
  const metal = spec === 'B' ? [P.s6, P.s7, P.s8] : [P.e6, P.f4, P.f5];
  m.box(-6, 0, -2, 5, 2, 1, (x, y) => (y === 2 ? P.e5 : P.e3)); // Joch
  // Glockenkörper: schmal oben, weit unten, ein Wulst am Rand
  const body = (x, y, z) => {
    const t = Math.max(0, Math.min(1, -y / (17 * size)));
    const r = (4.5 + t * t * 5.5) * size;
    const d = Math.hypot(x, z) - r;
    const cap = y - -1; // oben rund abgeschlossen
    return Math.max(d, cap, -y - 17 * size);
  };
  const lip = capsule(0, -17 * size, 0, 0, -16 * size, 0, 10.2 * size);
  sculpt(m, union(body, (x, y, z) => Math.max(lip(x, y, z), Math.abs(y + 16.5 * size) - 1)), -12, -20, -12, 11, -1, 11, (x, y, z, n) => {
    if (y <= -16 * size) return metal[0];
    if (Math.abs(y + 8 * size) < 1 && n.z > 0.2) return shade(metal[2], 1); // Zierband
    return roundTone(metal[1], n, { light: 1, dark: -1 });
  });
  m.box(-1, Math.round(-20 * size), -1, 0, Math.round(-15 * size), 0, P.s2); // Klöppel
  if (spec === 'B') {
    // Friedensglocke: grüner Kranz um die Schulter, rote Beeren
    for (let a = 0; a < 20; a++) {
      const w = (a / 20) * Math.PI * 2;
      const x = Math.round(Math.cos(w) * 6 * size);
      const z = Math.round(Math.sin(w) * 6 * size);
      m.set(x, -4, z, a % 5 === 0 ? P.a0 : a % 2 ? P.g5 : P.g6);
    }
  }
  return m;
}

function fineBell(level, spec, seed) {
  return { base: bellBase(level, spec, seed), head: bellHead(level, spec), headY: 58, glow: null, glowOnHead: false };
}

// --- Windrad -----------------------------------------------------------------------

function millBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed, 7);
  // Mast, nach oben schlanker, mit Trittsprossen und zwei Streben
  for (let y = 8; y <= 62; y++) {
    const r = y < 30 ? 4 : y < 50 ? 3 : 2;
    m.box(-r, y, -r, r - 1, y, r - 1, (x) => timber(x, y, -r));
  }
  for (let y = 16; y <= 56; y += 8) m.box(3, y, -1, 5, y, 0, P.e6);
  m.line(-13, 8, -1, -3, 34, -1, P.e3, 1).line(12, 8, -1, 2, 34, -1, P.e3, 1);
  // Gondel mit Dach und Steuerfahne nach Norden (hinten)
  m.box(-5, 62, -8, 4, 69, 4, (x, y, z) => (y === 69 ? P.e6 : z === 4 ? P.e5 : P.e4));
  m.box(-6, 70, -9, 5, 71, 5, spec === 'B' ? P.r3 : P.s4);
  m.box(-1, 64, -20, 0, 66, -9, P.e3).box(0, 60, -22, 0, 72, -16, (x, y) => (y % 4 === 0 ? P.s7 : P.s8)); // Fahne
  if (spec === 'B') {
    // Mühle: Mühlstein am Fuß und ein Sack mit gemahlenem Schrott
    sculpt(m, roundBox(10, 16, 12, 5, 8, 2, 1.5), 4, 8, 9, 15, 24, 15, (x, y, z, n) => roundTone(P.s5, n));
    m.box(9, 15, 15, 10, 16, 15, P.s3);
    sculpt(m, blob(-10, 12, 12, 4, 5, 3), -15, 8, 9, -5, 18, 15, (x, y, z, n) => roundTone(P.e7, n));
    m.box(-11, 16, 15, -9, 17, 15, P.s6); // Schrauben im Sack
  }
  pips(m, level, 3);
  levelFlag(m, 'windrad', level, spec, 22);
  return m;
}

/** Vier Flügel in der Ebene zur Kamera; Ursprung = Nabe (dreht sich um z). */
function millHead(level, spec) {
  const m = new VoxelModel();
  const cloth = spec === 'A' ? [P.b3, P.b4, P.b5] : spec === 'B' ? [P.e7, P.e8, P.e9] : [P.s7, P.s8, P.s9];
  const len = level >= 4 ? 24 : level >= 3 ? 22 : 20;
  const z = 6;
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    for (let r = 2; r <= len; r++) {
      const cx = Math.round(ux * r);
      const cy = Math.round(uy * r);
      m.set(cx, cy, z, P.e3); // Rute
      if (r < 6) continue;
      // Segel neben der Rute (in Drehrichtung), mit Latten
      for (let w = 1; w <= 5; w++) {
        const sx = Math.round(ux * r - uy * w);
        const sy = Math.round(uy * r + ux * w);
        const lath = r % 5 === 0 || w === 5;
        m.set(sx, sy, z, lath ? P.e5 : w <= 2 ? cloth[2] : r % 2 ? cloth[1] : cloth[0]);
      }
    }
  }
  sculpt(m, blob(0, 0, z, 3, 3, 2.5), -4, -4, z - 3, 3, 3, z + 3, (x, y, zz, n) => roundTone(P.e3, n)); // Nabe
  m.box(-1, -1, z - 5, 0, 0, z - 1, P.s3); // Welle in die Gondel
  return m;
}

function fineMill(level, spec, seed) {
  return { base: millBase(level, spec, seed), head: millHead(level, spec), headY: 66, glow: null, glowOnHead: false };
}

// --- Bienenkorb --------------------------------------------------------------------

function hiveBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed, 5);
  // Bänkchen: Brett auf zwei Beinen
  for (const x0 of [-12, 9]) m.box(x0, 6, -8, x0 + 2, 11, 7, (x, y) => (x === x0 ? P.e5 : P.e4));
  m.box(-14, 12, -10, 13, 13, 9, (x, y, z) => (y === 13 ? (z === 9 ? P.e7 : P.e6) : P.e4));
  // Strohkorb: Kuppel aus Wülsten, dazwischen dunkle Bindung, vorn das Flugloch
  const dome = subtract(blob(0, 14, 0, 12, 20, 12), (x, y) => y - 14); // nur die obere Hälfte
  const hole = roundBox(0, 17, 11, 3, 2.5, 3, 1.5);
  sculpt(m, subtract(dome, hole), -13, 14, -13, 12, 34, 12, (x, y, z, n) => {
    const band = (y - 14) % 4;
    if (band === 3) return roundTone(P.e4, n); // Bindung
    const straw = hash3(x >> 1, y, z >> 1, seed) < 0.3 ? P.e8 : P.e7;
    return roundTone(straw, n);
  });
  m.box(-2, 15, 9, 1, 18, 10, P.n0); // dunkles Flugloch
  m.box(-3, 14, 10, 2, 14, 12, P.e6); // Anflugbrett
  if (spec === 'B') {
    // Honig läuft vorn herunter, daneben ein Topf
    for (const [x, y0, y1] of [[-6, 20, 27], [5, 18, 25], [-1, 24, 30]]) {
      for (let y = y0; y <= y1; y++) m.set(x, y, Math.floor(12 * Math.sqrt(Math.max(0, 1 - ((y - 14) / 20) ** 2))), y === y0 ? P.f7 : P.f6); // auf der Kuppel
    }
    sculpt(m, blob(11, 17, 5, 3, 3.5, 3), 7, 14, 1, 15, 21, 9, (x, y, z, n) => (y >= 20 ? P.f6 : roundTone(P.r3, n)));
  }
  pips(m, level, 2);
  levelFlag(m, 'bienenkorb', level, spec, 12);
  return m;
}

/** Oben auf dem Korb: Knauf, die Königin trägt eine Krone. Ursprung auf der Kuppe. */
function hiveHead(level, spec) {
  const m = new VoxelModel();
  if (spec === 'A') {
    m.box(-3, 0, -3, 2, 1, 2, P.f5);
    for (const [x, z] of [[-3, -3], [2, -3], [-3, 2], [2, 2], [0, 2], [-1, -3]]) m.box(x, 2, z, x, 3, z, P.f7);
    m.set(0, 2, 2, P.a0).set(-1, 2, 2, P.a0); // Stein vorn
    return m;
  }
  sculpt(m, blob(0, 1, 0, 2.5, 2, 2.5), -3, 0, -3, 2, 3, 2, (x, y, z, n) => roundTone(P.e6, n));
  return m;
}

function fineHive(level, spec, seed) {
  return { base: hiveBase(level, spec, seed), head: hiveHead(level, spec), headY: 34, glow: null, glowOnHead: false };
}

// --- Vogelscheuche -----------------------------------------------------------------

function crow(m, x0, y0, z0, flip = 1) {
  // Krähe, sitzend: Körper, Kopf, Schnabel, Schwanz
  sculpt(m, union(blob(x0, y0 + 3, z0, 3, 2.6, 2.2), blob(x0 + 2.6 * flip, y0 + 6, z0, 1.8, 1.8, 1.8)), x0 - 5, y0, z0 - 3, x0 + 5, y0 + 9, z0 + 3, (x, y, z, n) => roundTone(P.n1, n, { light: 1, dark: 0 }));
  m.set(x0 + 4 * flip, y0 + 6, z0, P.f5).set(x0 + 5 * flip, y0 + 6, z0, P.f4); // Schnabel
  m.set(x0 + 3 * flip, y0 + 7, z0 + 1, P.s9); // Auge
  m.box(x0 - 4 * flip, y0 + 1, z0, x0 - 5 * flip, y0 + 2, z0, P.n1); // Schwanz
}

function scareBase(level, spec, seed) {
  const m = new VoxelModel();
  plinth(m, seed, 4);
  // Strohhaufen am Fuß
  sculpt(m, blob(0, 5, 0, 10, 4, 10), -11, 5, -11, 10, 9, 10, (x, y, z, n) => (hash3(x >> 1, y, z >> 1, seed) < 0.3 ? P.f6 : roundTone(P.e7, n)));
  m.box(-1, 5, -1, 0, 58, 0, (x, y) => (x === -1 ? P.e5 : P.e4)); // Pfahl
  m.box(-15, 40, -1, 14, 41, 0, (x, y) => (y === 41 ? P.e5 : P.e4)); // Querholz
  // Hemd bzw. Mantel, ausgestopft: dick beim Strohmann
  const fat = spec === 'A' ? 1.35 : 1;
  const cloth = spec === 'B' ? [P.n2, P.n3] : spec === 'A' ? [P.b3, P.b4] : [P.r2, P.r3];
  const body = union(roundBox(0, 32, 0, 6 * fat, 10, 4 * fat, 3), capsule(-6, 39, 0, -13, 39, 0, 2.8 * fat), capsule(6, 39, 0, 13, 39, 0, 2.8 * fat));
  sculpt(m, body, -16, 20, -8, 15, 44, 7, (x, y, z, n) => {
    if (spec === 'A' && hash3(x >> 2, y >> 2, z, seed) > 0.86) return P.e6; // Flicken
    if (spec !== 'B' && (x + y) % 7 === 0 && Math.abs(x) < 6) return shade(cloth[1], 1); // Karo
    return roundTone(cloth[1], n);
  });
  // Strohbüschel an den Ärmeln und unten
  for (const [x, y, z] of [[-15, 38, 0], [-16, 40, 1], [14, 38, 0], [15, 40, -1], [-3, 21, 2], [0, 20, 3], [3, 21, 2], [2, 20, -2]]) m.box(x, y, z, x, y + 1, z, (xx, yy) => (yy % 2 ? P.f6 : P.e7));
  if (spec === 'B') {
    crow(m, 11, 42, 0, 1);
    if (level >= 4) crow(m, -12, 42, 0, -1);
  }
  pips(m, level, 1);
  levelFlag(m, 'vogelscheuche', level, spec, 16);
  return m;
}

/** Kürbiskopf mit Hut; Ursprung auf dem Pfahl. Das Gesicht zeigt nach vorn (+z). */
function scareHead(level, spec) {
  const m = new VoxelModel();
  const pumpkin = blob(0, 6, 0, 7, 6, 7);
  sculpt(m, pumpkin, -8, 0, -8, 7, 12, 7, (x, y, z, n) => {
    const rib = Math.abs(Math.atan2(z, x) * 5) % 2 < 0.35;
    return roundTone(rib ? P.f3 : P.f4, n);
  });
  // Hut: Krempe und Kopf, beim Strohmann mit Band
  const hat = spec === 'B' ? [P.n1, P.n2] : [P.e3, P.e4];
  m.box(-9, 11, -9, 8, 11, 8, (x, y, z) => (Math.hypot(x + 0.5, z + 0.5) < 9.2 ? hat[1] : null));
  m.box(-5, 12, -5, 4, 18, 4, (x, y, z) => (Math.hypot(x + 0.5, z + 0.5) < 5.2 ? (y === 13 && spec === 'A' ? P.r3 : y === 18 ? hat[1] : hat[0]) : null));
  return m;
}

/** Das Gesicht glimmt: Augen und Mund vorn in den Kürbis geschnitzt. */
function scareGlow(head) {
  const g = new VoxelModel();
  for (const [x, y] of [[-3, 7], [-2, 7], [2, 7], [1, 7], [-3, 4], [-2, 3], [-1, 3], [0, 3], [1, 3], [2, 4]]) {
    let z = 8;
    while (z > 0 && !head.has(x, y, z)) z--;
    head.set(x, y, z, null);
    g.set(x, y, z, WHITE);
  }
  return g;
}

function fineScarecrow(level, spec, seed) {
  const head = scareHead(level, spec);
  return { base: scareBase(level, spec, seed), head, headY: 42, glow: scareGlow(head), glowOnHead: true };
}

export const FAMILY_MODELS = {
  glockenturm: fineBell,
  windrad: fineMill,
  bienenkorb: fineHive,
  vogelscheuche: fineScarecrow,
};
