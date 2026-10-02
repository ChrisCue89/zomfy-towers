// A3: Modelle der Krähengaben. Das Futterbrett ist ein Bau im Maß 1/32 (wie alle Bauten): ein
// Pfosten auf einem Kreuzfuß, zwei Streben, ein offenes Brett mit Rand und einer Blechschale
// Wasser – ohne Dach, damit man von oben sieht, was darauf liegt. Krümel und die Gabe auf dem Brett
// sind eigene kleine Modelle (1/32), die die Welt an- und ausschaltet. Fürs Foto der Karte hat jede
// Gabe ein großes Modell (wie die Erinnerungsstücke). Das Krähenglas und Jakobs Kompass stehen im
// Maß des Innenraums (1/16) auf der Fensterbank der Stube.

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { hash3 } from '../core/rng.js';

/** Oberkante des Bretts (1/32 m über dem Boden): hier sitzen Krähe, Krümel und Gabe. */
export const FEEDER_TOP = 38;
/** Wo auf dem Brett die Krähe pickt und wo die Gabe liegt (1/32 m von der Mitte der Zelle). */
export const FEEDER_SPOTS = { crow: { x: -4, z: -1 }, gift: { x: 3, z: 3 } };

/** Das Futterbrett (1 × 1 Feld, 1/32): Kreuzfuß, Pfosten, Streben, Brett mit Rand, Wasserschale. */
export function buildFeeder(seed) {
  const m = new VoxelModel();
  // Kreuzfuß aus zwei Brettern
  m.box(-11, 0, -2, 10, 2, 1, (x, y) => (y === 2 ? (x % 7 === 0 ? P.e4 : P.e5) : P.e3));
  m.box(-2, 0, -11, 1, 2, 10, (x, y, z) => (y === 2 ? (z % 7 === 0 ? P.e4 : P.e5) : P.e3));
  for (const [x, z] of [[-10, -1], [9, -1], [-1, -10], [-1, 9]]) m.set(x, 3, z, P.s5); // Nägel
  // Pfosten mit Maserung, die Westseite im Licht
  m.box(-2, 3, -2, 1, 35, 1, (x, y, z) => {
    if (x === -2) return y % 9 === 4 ? P.e4 : P.e6;
    if (z === 1) return hash3(x, y >> 2, 3, seed) < 0.2 ? P.e3 : P.e5;
    return P.e4;
  });
  // Zwei Streben unter dem Brett
  for (const side of [-1, 1]) {
    for (let k = 0; k <= 8; k++) {
      const x = side < 0 ? -3 - Math.round(k * 0.75) : 2 + Math.round(k * 0.75);
      m.box(x, 26 + k, -1, x, 27 + k, 0, k % 4 === 0 ? P.e3 : P.e4);
    }
  }
  // Das Brett: drei Bohlen mit Fugen, an den Enden etwas dunkler
  m.box(-10, 36, -8, 9, 37, 7, (x, y, z) => {
    if (y === 36) return P.e3;
    if (z === -3 || z === 2) return P.e4; // Fugen
    if (x <= -9 || x >= 8) return P.e5;
    return hash3(x >> 2, z, 5, seed) < 0.25 ? P.e5 : P.e6;
  });
  // Rand ringsum, vorn mit einer Lücke (dort fallen die Krümel hinunter)
  const rim = (x, z) => (x + z) % 5 === 0 ? P.e4 : P.e5;
  for (let x = -10; x <= 9; x++) {
    m.set(x, 38, -8, rim(x, -8));
    if (x < -3 || x > 2) m.set(x, 38, 7, x === -10 || x === 9 ? P.e4 : P.e6);
  }
  for (let z = -7; z <= 6; z++) m.set(-10, 38, z, rim(-10, z)).set(9, 38, z, rim(9, z));
  m.set(-8, 38, 7, P.s5).set(7, 38, 7, P.s5); // Nägel vorn am Rand
  // Blechschale mit Wasser hinten rechts
  m.box(3, 38, -7, 7, 38, -4, (x, y, z) => (x === 3 || x === 7 || z === -7 || z === -4 ? (x === 3 ? P.s7 : P.s6) : z === -6 && x === 4 ? P.b5 : P.b3));
  return m;
}

/**
 * Krümel auf dem Brett (1/32, im Raster des Baus: Ursprung in der Mitte der Zelle am Boden,
 * die Krümel liegen auf der Brettoberkante): Brot, Haferflocken, Kerne.
 */
export function buildCrumbs(seed) {
  const m = new VoxelModel();
  const tones = [P.e9, P.f6, P.e8, P.f5, P.s9];
  const y = FEEDER_TOP;
  for (let k = 0; k < 24; k++) {
    const x = -8 + Math.floor(hash3(k, 1, 2, seed) * 11);
    const z = -6 + Math.floor(hash3(k, 3, 4, seed) * 12);
    if (x >= 2 && z <= -3) continue; // nicht in die Wasserschale
    m.set(x, y, z, tones[k % tones.length]);
  }
  // zwei Brotkanten (heller oben, Kruste dunkler)
  for (const [x, z] of [[-5, -1], [0, 3]]) m.box(x, y, z, x + 1, y, z + 1, P.e7).set(x, y + 1, z, P.e9).set(x + 1, y + 1, z, P.e9);
  return m;
}

/**
 * Die Gaben klein auf dem Brett (1/32): ein, zwei Farben und ein heller Punkt, der glänzt.
 * Muster: Zeilen von vorn nach hinten (z), Zeichen → Farbe; `h` legt eine zweite Lage darauf.
 */
const BOARD_GIFTS = {
  kronkorken: { legend: { r: P.r3, s: P.s7, w: P.s9 }, rows: ['sss', 'srs', 'wss'] },
  glasknopf: { legend: { b: P.b3, l: P.b5 }, rows: ['bl', 'bb'] },
  schrauben: { legend: { s: P.s5, l: P.s7 }, rows: ['l.l', 's.s', 's.s'] },
  fingerhut: { legend: { s: P.s6, w: P.s9 }, rows: ['ss', 'ss'], h: ['w.', '..'] },
  murmel: { legend: { g: P.g6, l: P.a6, w: P.s9 }, rows: ['gl', 'gg'], h: ['w.', '..'] },
  zahnrad: { legend: { y: P.e7, l: P.f6 }, rows: ['yly', 'l.l', 'yly'] },
  pinzette: { legend: { s: P.s7, w: P.s9 }, rows: ['s.', 's.', 'sw', 'ss'] },
  haeherfeder: { legend: { b: P.b4, k: P.n0, w: P.s9 }, rows: ['b.', 'kb', 'bw', 'k.'] },
  bleistift: { legend: { r: P.r3, e: P.e8, k: P.s2 }, rows: ['k', 'e', 'r', 'r'] },
  klemme: { legend: { r: P.r3, s: P.s6 }, rows: ['s.', 'ss', 'rr', 'rr'] },
  spiegelscherbe: { legend: { w: P.s9, b: P.b5, s: P.s8 }, rows: ['wb.', 'sww'] },
  muenze: { legend: { y: P.f6, l: P.f7 }, rows: ['yl', 'yy'] },
  gardinenring: { legend: { y: P.f5, l: P.f7 }, rows: ['yly', 'y.y', 'yyy'] },
  schluessel: { legend: { y: P.f5, l: P.f7 }, rows: ['yl', 'yy', '.y', '.l'] },
  nagelrest: { legend: { s: P.s4, e: P.e6 }, rows: ['s.e', 's.e', '..e'] },
};

/** Die Gabe klein auf dem Brett, im Raster des Baus (an FEEDER_SPOTS.gift, auf der Oberkante). */
export function buildBoardGift(id) {
  const spec = BOARD_GIFTS[id] || BOARD_GIFTS.kronkorken;
  const m = new VoxelModel();
  const { x: gx, z: gz } = FEEDER_SPOTS.gift;
  const put = (rows, y) =>
    rows.forEach((row, z) => {
      for (let x = 0; x < row.length; x++) if (spec.legend[row[x]] !== undefined) m.set(gx + x - 1, FEEDER_TOP + y, gz + z - 1, spec.legend[row[x]]);
    });
  put(spec.rows, 0);
  if (spec.h) put(spec.h, 1);
  return m;
}

// --- Fotos der Karte (groß, wie die Erinnerungsstücke) -----------------------------------------

/** Scheibe mit Mittelpunkt (cx, cz), Radius r, von y0 bis y1; color(x, y, z, d) mit d = Abstand. */
function disc(m, cx, cz, r, y0, y1, color) {
  for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
      const d = Math.hypot(x - cx, z - cz);
      if (d > r) continue;
      for (let y = y0; y <= y1; y++) {
        const c = color(x, y, z, d);
        if (c !== null && c !== undefined) m.set(x, y, z, c);
      }
    }
  }
}

/** Linie von a nach b (Voxel für Voxel), Farbe je Schritt. */
function line(m, ax, ay, az, bx, by, bz, color) {
  const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), Math.abs(bz - az), 1);
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    m.set(Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t), Math.round(az + (bz - az) * t), color(k, n));
  }
}

const PHOTOS = {
  kronkorken(m) {
    // gezackter Rand, rote Kappe, ein weißer Hirsch
    disc(m, 0, 0, 7, 0, 2, (x, y, z, d) => {
      if (d > 6.2) return Math.round(Math.atan2(z, x) * 4) % 2 ? null : y === 2 ? P.s8 : P.s6;
      if (y < 2) return P.s5;
      return d > 5.2 ? P.s7 : P.r3;
    });
    // ein Hirschkopf mit Geweih, erhaben
    const deer = [[-3, -4], [3, -4], [-3, -3], [-1, -3], [1, -3], [3, -3], [-2, -2], [-1, -2], [1, -2], [2, -2], [-1, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 2], [0, 2], [1, 2], [0, 3]];
    for (const [x, z] of deer) m.set(x, 3, z, P.s9);
    m.set(-1, 3, 1, P.s8).set(1, 3, 1, P.s8); // Augen eine Spur dunkler
  },
  glasknopf(m) {
    disc(m, 0, 0, 6.4, 0, 2, (x, y, z, d) => (y === 2 ? (d > 4.8 ? P.b4 : d < 1.6 ? null : P.b3) : P.b2));
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.remove?.(x, 2, z, x, 2, z), m.set(x, 1, z, P.b1);
    m.set(-3, 3, -3, P.s9).set(-2, 3, -4, P.b5);
  },
  murmel(m) {
    for (let x = -6; x <= 6; x++) {
      for (let y = 0; y <= 12; y++) {
        for (let z = -6; z <= 6; z++) {
          const d = Math.hypot(x, y - 6, z);
          if (d > 6.4) continue;
          const swirl = Math.abs(Math.sin((x + z) * 0.55 + (y - 6) * 0.35)) < 0.28;
          m.set(x, y, z, swirl ? (y > 6 ? P.a6 : P.a5) : y > 8 ? P.g7 : y > 4 ? P.g6 : P.g5);
        }
      }
    }
    m.set(-3, 10, 3, P.s9).set(-2, 11, 2, P.s9).set(-3, 11, 2, P.g8);
  },
  haeherfeder(m) {
    // Kiel schräg, Fahne mit Bändern in Blau, Schwarz und Weiß
    line(m, -8, 0, 6, 8, 0, -6, () => P.s8);
    for (let k = -6; k <= 6; k++) {
      const band = ((k + 7) >> 1) % 4;
      const c = band === 0 ? P.n1 : band === 1 ? P.b4 : band === 2 ? P.b2 : P.s9;
      for (let w = 1; w <= 3 - (Math.abs(k) > 4 ? 1 : 0); w++) {
        m.set(k + w, 0, -k + w, c);
        m.set(k - w + 1, 0, -k - w + 1, w === 1 ? c : P.b3);
      }
    }
  },
  spiegelscherbe(m) {
    const pts = [[-7, 5], [6, 6], [2, -7]];
    const inside = (x, z) => {
      const s = (a, b) => (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]);
      const d1 = s(pts[0], pts[1]);
      const d2 = s(pts[1], pts[2]);
      const d3 = s(pts[2], pts[0]);
      return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
    };
    for (let x = -8; x <= 7; x++) {
      for (let z = -8; z <= 7; z++) {
        if (!inside(x, z)) continue;
        const edge = !inside(x - 1, z) || !inside(x + 1, z) || !inside(x, z - 1) || !inside(x, z + 1);
        const sky = Math.abs(x + z - 1) <= 1;
        m.set(x, 0, z, edge ? P.s5 : sky ? P.b5 : (x - z) % 5 === 0 ? P.s9 : P.s8);
      }
    }
  },
  gardinenring(m) {
    disc(m, 0, 0, 7, 0, 1, (x, y, z, d) => (d < 4.6 ? null : y === 1 ? (x < 0 && z < 0 ? P.f7 : P.f5) : P.e7));
  },
  fingerhut(m) {
    // Rand unten heller, darüber die Grübchen im Versatz, oben die Kuppe
    const radius = [4.6, 4.6, 4.4, 4.4, 4.4, 4.4, 4.2, 3.8, 3.1, 2.0];
    radius.forEach((r, y) =>
      disc(m, 0, 0, r, y, y, (x, yy, z) => {
        if (y <= 1) return x < -2 ? P.s9 : P.s8;
        const dimple = (x + z + (y % 2)) % 2 === 0;
        if (dimple) return P.s5;
        return x < -2 ? P.s8 : P.s7;
      }),
    );
    m.set(-1, 9, -1, P.s9).set(-2, 8, -1, P.s9);
  },
  pinzette(m) {
    line(m, -9, 0, 1, 8, 0, 0, (k) => (k < 3 ? P.s5 : P.s7));
    line(m, -9, 1, -1, 8, 1, 0, (k) => (k < 3 ? P.s5 : P.s8));
    line(m, -9, 0, 3, 8, 0, 0, (k) => (k < 3 ? P.s5 : P.s7));
    m.set(8, 1, 0, P.s9).set(0, 2, 0, P.s9);
  },
  bleistift(m) {
    // Zimmermannsbleistift: flach, rot lackiert, mit dem Messer angespitzt
    m.box(-7, 0, -1, 5, 2, 1, (x, y) => (y === 2 ? (x % 4 === 0 ? P.r4 : P.r3) : P.r2));
    m.box(6, 0, -1, 7, 1, 1, P.e8).box(8, 0, 0, 9, 0, 0, P.s2).set(6, 2, 0, P.e9);
    m.box(-8, 0, -1, -8, 2, 1, P.e7);
  },
  klemme(m) {
    // Krokodilklemme: zwei Backen mit Zähnen, rote Hülle
    m.box(-9, 0, -2, -2, 2, 2, (x, y) => (y === 2 ? P.r4 : P.r3));
    m.box(-1, 0, -2, 7, 0, 2, (x, y, z) => (z === 0 ? null : P.s6));
    m.box(-1, 1, -2, 7, 1, 2, (x, y, z) => (z === 0 ? null : x % 2 ? P.s8 : P.s5));
    m.set(-10, 1, 0, P.s4).set(-11, 1, 0, P.r2);
  },
  muenze(m) {
    disc(m, 0, 0, 6.4, 0, 1, (x, y, z, d) => (y === 0 ? P.f4 : d > 5 ? P.f5 : d > 4 ? P.f7 : (x * x + z) % 7 === 0 ? P.f5 : P.f6));
    m.set(-2, 2, -2, P.f8);
  },
  schluessel(m) {
    disc(m, -6, 0, 3.6, 0, 1, (x, y, z, d) => (d < 1.8 ? null : y === 1 ? P.f6 : P.f4));
    m.box(-3, 0, -1, 7, 1, 0, (x, y) => (y === 1 ? (x % 3 === 0 ? P.f7 : P.f6) : P.f4));
    m.box(4, 0, 1, 5, 1, 2, P.f5).box(7, 0, 1, 7, 1, 3, P.f5);
    m.set(-7, 2, -2, P.f8);
  },
  schrauben(m) {
    // zwei Schrauben liegen da: runder Kopf mit Schlitz, Gewinde, Spitze
    for (const [x0, z0, l] of [[-7, -3, 10], [-4, 3, 8]]) {
      disc(m, x0, z0, 1.6, 0, 1, (x, y, z) => (y === 1 ? (x === x0 ? P.s3 : x < x0 ? P.s8 : P.s7) : P.s5));
      for (let k = 2; k <= l; k++) m.set(x0 + k, 0, z0, k === l ? P.s4 : k % 2 ? P.e4 : P.s6); // Gewinde, etwas Rost
    }
  },
  zahnrad(m) {
    disc(m, 0, 0, 7, 0, 1, (x, y, z, d) => {
      if (d < 2) return null;
      if (d > 5.6 && Math.round(Math.atan2(z, x) * 8 / Math.PI) % 2) return null;
      return y === 1 ? (d < 3.2 ? P.f7 : P.f5) : P.e7;
    });
  },
  nagelrest(m) {
    line(m, -6, 0, -3, 4, 0, -1, () => P.s5);
    line(m, 4, 0, -1, 6, 1, 2, () => P.s4);
    m.box(-7, 0, -4, -7, 1, -2, P.s6);
    m.box(-4, 0, 2, 6, 1, 4, (x, y) => (y === 1 ? (x % 3 ? P.e6 : P.e5) : P.e4));
  },
  kompass(m) {
    // Jakobs Kompass: Messingdose mit Deckelscharnier, weißes Blatt, rote Nadel nach Norden
    disc(m, 0, 0, 8, 0, 3, (x, y, z, d) => {
      if (y < 3) return d > 7 ? P.e7 : P.f4;
      if (d > 7) return P.f6;
      if (d > 6.2) return P.f5;
      return P.s9;
    });
    line(m, 0, 4, 0, 0, 4, -6, (k) => (k > 1 ? P.r3 : P.s3));
    line(m, 0, 4, 0, 0, 4, 5, (k) => (k > 1 ? P.s4 : P.s3));
    for (const [x, z] of [[-1, -7], [0, -7], [1, -7]]) m.set(x, 4, z, P.r3);
    for (const a of [0, 1, 2, 3, 4, 5, 6, 7]) m.set(Math.round(Math.cos(a * Math.PI / 4) * 5.4), 4, Math.round(Math.sin(a * Math.PI / 4) * 5.4), P.s5);
    m.box(-2, 1, 8, 1, 2, 9, P.f5).set(0, 3, 9, P.f7); // Scharnier
  },
};

/** Großes Modell einer Gabe fürs Foto der Karte. */
export function buildGiftPhoto(id) {
  const m = new VoxelModel();
  (PHOTOS[id] || PHOTOS.kronkorken)(m);
  return m;
}

// --- Innenraum (1/16): das Krähenglas und Jakobs Kompass auf der Fensterbank ------------------

/** Farbe je Stück im Glas (ein, zwei Voxel). */
const JAR_COLORS = {
  kronkorken: [P.r3, P.s7],
  glasknopf: [P.b3, P.b5],
  murmel: [P.g6, P.a6],
  haeherfeder: [P.b4, P.n1],
  spiegelscherbe: [P.s9, P.b5],
  gardinenring: [P.f5, P.f7],
};

/**
 * Das Krähenglas (1/16, Ursprung: linke hintere Ecke auf der Fensterbank): ein Einmachglas mit
 * Stoffhaube und Bändchen, 4 breit, 2 tief; vorn ist es offen gezeichnet (die Kanten sind Glas),
 * damit man die Stücke sieht – von unten nach oben.
 */
export function buildCrowJar(items) {
  const m = new VoxelModel();
  m.box(0, 0, 0, 3, 0, 1, P.n7); // Boden
  for (const x of [0, 3]) m.box(x, 1, 0, x, 4, 1, (xx, y, z) => (z === 1 ? (x === 0 ? P.s9 : P.n8) : P.n7)); // Glaskanten
  m.box(1, 1, 0, 2, 4, 0, P.n6); // Rückwand (dunkles Glas)
  m.box(0, 5, 0, 3, 5, 1, (x, y, z) => ((x + z) % 2 ? P.r4 : P.s9)); // Stoffhaube, kariert
  m.box(1, 6, 0, 2, 6, 1, (x, y, z) => ((x + z) % 2 ? P.s9 : P.r4));
  m.box(0, 4, 1, 3, 4, 1, (x) => (x === 0 || x === 3 ? P.r2 : null)); // das Bändchen an den Kanten
  // Die Stücke: vorn in der Mitte, von unten nach oben
  const slots = [[1, 1], [2, 1], [1, 2], [2, 2], [1, 3], [2, 3]];
  items.slice(0, slots.length).forEach((id, k) => {
    const [x, y] = slots[k];
    const [c, l] = JAR_COLORS[id] || [P.s6, P.s8];
    m.set(x, y, 1, k % 2 ? l : c);
  });
  return m;
}

/**
 * Die lose Diele vor dem Kamin (1/16, Ursprung: Westende der Diele am Boden): Die Ecke des
 * Teppichs ist zurückgeschlagen, eine Diele steht einen Fingerbreit hoch, darunter ein dunkler Spalt.
 */
export function buildLooseBoard() {
  const m = new VoxelModel();
  m.box(-1, 0, 0, 8, 0, 0, P.e0); // Spalt
  m.box(0, 1, 1, 7, 1, 1, (x) => (x % 3 === 0 ? P.e7 : P.e8)); // die Diele, angehoben
  m.set(7, 1, 1, P.s7).set(0, 1, 1, P.s7); // Nagelköpfe
  m.box(-3, 1, 2, -1, 1, 3, (x, y, z) => ((x + z) % 2 ? P.r3 : P.f6)); // die umgeschlagene Teppichecke
  return m;
}

/**
 * Jakobs Kompass auf der Fensterbank (1/16, Ursprung hinten links): eine kleine Messingdose, das
 * helle Blatt mit der roten Nadel nach oben, dahinter der aufgeklappte Deckel – handgroß.
 */
export function buildSillCompass() {
  const m = new VoxelModel();
  m.set(0, 0, 1, P.f6).set(1, 0, 1, P.s9); // vorn: Messingrand, das Blatt
  m.set(0, 0, 0, P.f4).set(1, 0, 0, P.r3); // hinten: Rand, die Nadel nach Norden
  m.set(0, 1, 0, P.f5).set(1, 1, 0, P.f6); // der aufgeklappte Deckel
  return m;
}
