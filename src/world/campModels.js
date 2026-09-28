// Wall und Tor des Lagers (M17, DESIGN.md 8): vier Stufen – Weidenzaun,
// Palisade, Bohlenwand mit Wehrgang, Steinmauer. Die Kamera blickt nach
// Norden: Die Längsseiten eines Walls, der von Nord nach Süd läuft, sieht sie
// nie. Höhe und Werkstoff lesen sich deshalb an den Südseiten einzelner Teile
// (Pfähle, Bohlen mit Stufen in der Oberkante, Zinnen) und an einer breiten
// Krone – wie ein senkrechter Zaun in einer Draufsicht.
// Maß 1/32 m. Jedes Modell liegt mittig: z läuft entlang der Mauer (Norden
// negativ), x quer dazu (Westen = außen, zur Horde).

import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';
import { hash3 } from '../core/rng.js';

export const CAMP_UNIT = 1 / 32;
const CELL = 32;

/** Höhe (Voxel) von Wall, Tor-Flügeln und Torpfosten je Stufe. */
export const WALL_HEIGHT = [0, 34, 56, 60, 52];
const WING_HEIGHT = [0, 34, 50, 56, 58];
export const POST_HEIGHT = [0, 46, 66, 72, 78];

/** Grenzen eines Abschnitts aus `cells` Zellen (z inklusive). */
function span(cells) {
  const half = (cells * CELL) / 2;
  return [-half, half - 1];
}

/** Höhe der Böschung (Voxel), auf der jede Stufe steht. */
export const MOUND = 10;
const MOUND_HALF = 20; // halbe Breite der Böschung: 0,625 m je Seite
const CREST = 4; // halbe Breite der Krone

/**
 * Die Böschung (der eigentliche »Wall«): ein Erdrücken entlang z, dessen
 * Flanken nach Osten und Westen fallen – die sieht die Kamera wie Dächer.
 * Stufe 4 bekommt einen Steinsockel statt Erde.
 */
function mound(m, z0, z1, seed, level, damage) {
  for (let z = z0; z <= z1; z++) {
    for (let x = -MOUND_HALF; x < MOUND_HALF; x++) {
      const d = Math.max(0, Math.abs(x + 0.5) - CREST);
      let h = Math.round(MOUND * (1 - d / (MOUND_HALF - CREST)));
      if (damage > 0 && hash3(z >> 3, (x + 32) >> 3, 13, seed) < damage * 0.35) h = Math.max(0, h - 3); // ausgetreten
      const west = x < 0;
      for (let y = 0; y <= h; y++) {
        const top = y === h;
        let c;
        if (level === 4) {
          const course = y >> 2;
          c = top ? (hash3(z >> 2, x >> 2, 21, seed) < 0.15 ? P.g4 : P.s6) : (z + course * 3) % 9 === 8 ? P.s3 : west ? P.s4 : P.s5;
        } else if (top) {
          const r = hash3(z >> 1, (x + 32) >> 1, 17, seed);
          c = d < 1 ? P.e4 : r < 0.12 ? P.f4 : r < 0.2 ? P.e5 : west ? (r < 0.6 ? P.g3 : P.g4) : r < 0.6 ? P.g4 : P.g5;
        } else c = west ? P.e2 : P.e3;
        m.set(x, y, z, c);
      }
    }
  }
}

/**
 * Streben innen (Osten), quer zur Mauer in der x-y-Ebene: Ihre Südseite ist
 * das, was die Kamera von der Höhe eines Nord-Süd-Walls überhaupt sieht.
 * Von der Mauerkrone schräg bis an den Rand der Zelle, alle `every` Voxel.
 */
function braces(m, z0, z1, x0, top, colors, { every = 48, width = 3, xMax = 15 } = {}) {
  const [dark, light, cap] = colors;
  const len = xMax - x0;
  for (let p = z0 + 18; p <= z1 - width; p += every) {
    for (let t = 0; t <= len; t++) {
      // von der Krone schräg hinunter bis auf die Flanke der Böschung (unter die Krone: y < 0)
      const y = Math.round(top - ((top + MOUND * 0.6) * t) / len);
      for (let dy = 0; dy < 4; dy++) {
        for (let dz = 0; dz < width; dz++) {
          const yy = y - dy;
          if (yy < -MOUND) continue;
          m.set(x0 + t, yy, p + dz, dz === width - 1 ? (dy === 0 ? cap : light) : dark);
        }
      }
    }
  }
}

// --- Stufe 1: Weidenzaun ----------------------------------------------------------------

function wattle(m, z0, z1, seed, damage) {
  const H = WALL_HEIGHT[1];
  const start = z0 + 4;
  // Pfosten alle 16 Voxel (halber Meter); im kaputten Zustand stehen manche schief
  for (let p = start; p <= z1 - 2; p += 16) {
    const lean = damage > 0 && hash3(p, 1, 3, seed) < damage * 0.7;
    const h = H + 2 - Math.floor(hash3(p, 2, 3, seed) * 4) - (lean ? 7 : 0);
    for (let y = 0; y <= h; y++) {
      const dx = lean && y > h * 0.55 ? 1 : 0;
      for (let x = -1; x <= 1; x++) {
        for (let z = p - 1; z <= p + 1; z++) {
          const top = y >= h - 1;
          const c = top ? (z === p + 1 ? P.e6 : P.e7) : z === p + 1 ? (x === -1 ? P.e5 : P.e4) : (y + z) % 9 === 0 ? P.e2 : P.e3;
          m.set(x + dx, y, z, c);
        }
      }
    }
  }
  // Geflecht aus Weidenruten: abwechselnd außen und innen an den Pfosten vorbei;
  // kleine Stufen in jeder Rute geben dem Band Südseiten (sonst sähe man nur einen Strich)
  for (let row = 0; row < 7; row++) {
    const y0 = 4 + row * 4;
    for (let z = z0; z <= z1; z++) {
      if (damage > 0 && hash3(z >> 3, row, 5, seed) < damage * 0.55) continue; // Lücke im Geflecht
      const rel = z - start;
      const seg = Math.floor(rel / 16);
      const t = (((rel % 16) + 16) % 16) / 16;
      const side = ((seg % 2) + 2 + row) % 2 ? -2 : 2;
      const x = Math.round(side * Math.cos(t * Math.PI));
      const dip = (z >> 2) % 2;
      const green = hash3(z >> 2, row, 9, seed) < 0.25;
      m.set(x, y0 + dip, z, green ? P.g4 : row % 2 ? P.e5 : P.e6);
      m.set(x, y0 + dip + 1, z, green ? P.g5 : row % 2 ? P.e6 : P.e7);
    }
  }
  // Schräg gestellte Stützstangen innen – ein Weidenzaun, der sich anlehnen muss
  braces(m, z0, z1, 2, H - 6, [P.e3, P.e5, P.e6], { every: 40, width: 2, xMax: 12 });
}

// --- Stufe 2: Palisade ----------------------------------------------------------------------

function palisade(m, z0, z1, seed, damage) {
  const H = WALL_HEIGHT[2];
  for (let z = z0; z <= z1 - 3; z += 5) {
    const broken = damage > 0 && hash3(z, 7, 1, seed) < damage * 0.6;
    const h = H - 2 + Math.floor(hash3(z, 3, 1, seed) * 5) - (broken ? 24 + Math.floor(hash3(z, 8, 1, seed) * 10) : 0);
    const light = hash3(z, 4, 1, seed) < 0.5;
    for (let y = 0; y <= h; y++) {
      const tip = !broken && y > h - 4;
      const w = tip ? (y > h - 2 ? 1 : 2) : 4; // angespitzt
      const off = tip ? (4 - w) >> 1 : 0;
      for (let dx = 0; dx < w; dx++) {
        for (let dz = 0; dz < w; dz++) {
          const front = dz === w - 1; // Südseite: hell geschält
          let c;
          if (tip) c = front ? P.e9 : P.e8;
          else if (broken && y >= h - 1) c = P.e8; // frische Bruchkante
          else if (front) c = dx === 0 ? P.e5 : light ? P.e7 : P.e6;
          else c = (y + z) % 13 === 0 ? P.e2 : dx === 0 ? P.e3 : light ? P.e5 : P.e4;
          m.set(-2 + off + dx, y, z + off + dz, c);
        }
      }
    }
  }
  // Zwei Querriegel innen (Osten) halten die Pfähle
  for (const y0 of [12, 38]) {
    for (let z = z0; z <= z1; z++) {
      if (damage > 0 && hash3(z >> 4, y0, 2, seed) < damage * 0.4) continue;
      for (let y = y0; y <= y0 + 2; y++) for (let x = 2; x <= 3; x++) m.set(x, y, z, y === y0 + 2 ? P.e5 : P.e3);
    }
  }
  braces(m, z0, z1, 4, H - 8, [P.e3, P.e6, P.e8], { every: 44, width: 4, xMax: 15 });
}

// --- Stufe 3: Bohlenwand mit Wehrgang ----------------------------------------------------

function plankWall(m, z0, z1, seed, damage) {
  const H = WALL_HEIGHT[3];
  // Senkrechte Bohlen, je 6 Voxel breit, abwechselnd zwei Voxel höher: Die Oberkante
  // zeigt Stufen mit Südseiten; Eisenkappen auf jeder vierten Bohle
  for (let z = z0; z <= z1; z++) {
    const plank = Math.floor((z - z0) / 6);
    const hole = damage > 0 && hash3(plank, 2, 8, seed) < damage * 0.5;
    const h = (hole ? H - 22 - (plank % 3) * 6 : H) + (plank % 2 ? 2 : 0);
    const seam = (z - z0) % 6 === 5;
    const cap = !hole && plank % 4 === 0;
    for (let y = 0; y <= h; y++) {
      for (let x = -5; x <= 1; x++) {
        let c;
        if (cap && y >= h - 1) c = y === h ? P.s5 : P.s3;
        else if (seam) c = P.e3;
        else if (y >= h - 1) c = hole ? P.e8 : P.e7;
        else c = x === -5 ? P.e5 : (y + plank * 7) % 17 === 0 ? P.e4 : plank % 3 === 1 ? P.e5 : P.e6;
        m.set(x, y, z, c);
      }
    }
  }
  // Wehrgang innen: Pfosten alle 32 Voxel, darauf ein Bohlenboden quer zur Mauer
  const deckY = 40;
  for (let p = z0 + 2; p <= z1 - 3; p += 32) {
    for (let y = 0; y <= deckY; y++) {
      for (let x = 2; x <= 5; x++) for (let z = p; z <= p + 3; z++) m.set(x, y, z, z === p + 3 ? P.e5 : x === 5 ? P.e3 : P.e4);
      for (let x = 13; x <= 14; x++) for (let z = p; z <= p + 1; z++) m.set(x, y, z, z === p + 1 ? P.e4 : P.e3);
    }
  }
  for (let z = z0; z <= z1; z++) {
    if (damage > 0 && hash3(z >> 3, 3, 12, seed) < damage * 0.3) continue;
    const board = Math.floor((z - z0) / 4);
    for (let x = 2; x <= 14; x++) m.set(x, deckY + 1, z, (z - z0) % 4 === 3 ? P.e4 : board % 2 ? P.e6 : P.e7);
  }
  // Geländer am Wehrgang: Pfosten mit Handlauf – Südseiten der Pfosten zeigen die Höhe
  for (let z = z0 + 6; z <= z1; z += 16) for (let y = deckY + 2; y <= deckY + 12; y++) for (let x = 13; x <= 14; x++) m.set(x, y, z, P.e5);
  for (let z = z0; z <= z1; z++) m.set(14, deckY + 13, z, P.e7);
}

// --- Stufe 4: Steinmauer ----------------------------------------------------------------------

function stoneWall(m, z0, z1, seed, damage) {
  const H = WALL_HEIGHT[4];
  for (let z = z0; z <= z1; z++) {
    for (let x = -6; x <= 9; x++) {
      const hole = damage > 0 && hash3(z >> 4, (x + 8) >> 3, 4, seed) < damage * 0.45;
      const h = hole ? H - 18 - ((z >> 2) % 3) * 3 : H;
      for (let y = 0; y <= h; y++) {
        // Quader in versetzten Lagen (8 hoch, 12 lang)
        const course = y >> 3;
        const run = z - z0 + (course % 2) * 6;
        const block = Math.floor(run / 12);
        const joint = y % 8 === 7 || run % 12 === 11;
        const tone = [P.s4, P.s5, P.s6, P.s5][Math.floor(hash3(block, course, (x + 8) >> 3, seed) * 4)];
        m.set(x, y, z, joint ? P.s3 : hole && y >= h - 1 ? P.s7 : tone);
      }
    }
  }
  // Zinnen außen (Westen): 8 lang, Lücken 6, 10 hoch – ihre Südseiten zeigen die Krone
  for (let z = z0 + 2; z <= z1 - 7; z += 14) {
    if (damage > 0 && hash3(z, 5, 4, seed) < damage * 0.6) continue;
    for (let dz = 0; dz < 8; dz++) {
      for (let y = H + 1; y <= H + 10; y++) for (let x = -6; x <= -2; x++) m.set(x, y, z + dz, y === H + 10 ? P.s7 : dz === 7 ? P.s6 : x === -6 ? P.s4 : P.s5);
    }
  }
  // Strebepfeiler innen: Stein, oben schräg – ihre Südseiten zeigen die Höhe
  for (let p = z0 + 20; p <= z1 - 8; p += 48) {
    for (let x = 10; x <= 15; x++) {
      const top = Math.round(H - (x - 10) * 6);
      for (let y = 0; y <= top; y++) for (let dz = 0; dz < 8; dz++) m.set(x, y, p + dz, y >= top - 1 ? P.s7 : y % 8 === 7 ? P.s3 : dz === 7 ? P.s6 : P.s5);
    }
  }
  // Moos und Laub auf der Krone
  for (let z = z0; z <= z1; z++) {
    for (let x = -1; x <= 9; x++) {
      const r = hash3(z >> 1, (x + 8) >> 1, 6, seed);
      if (r < 0.1) m.set(x, H + 1, z, r < 0.05 ? P.g3 : P.g4);
      else if (r > 0.97) m.set(x, H + 1, z, P.f4);
    }
  }
}

/**
 * Ein Wall-Abschnitt aus `cells` Zellen (entlang z).
 * @param {number} damage 0 = ganz, 0.55 = kaputt (Lücken, schiefe Pfähle)
 */
export function buildWall(seed, level = 1, cells = 3, damage = 0) {
  level = Math.max(1, Math.min(4, level));
  const m = new VoxelModel();
  const [z0, z1] = span(cells);
  mound(m, z0, z1, seed, level, damage);
  // Die Stufe steht auf der Krone: alles um MOUND angehoben
  const lifted = { set: (x, y, z, c) => m.set(x, y + MOUND, z, c) };
  const builders = [null, wattle, palisade, plankWall, stoneWall];
  builders[level](lifted, z0, z1, seed, damage);
  return m;
}

/** Trümmer eines Abschnitts: flach am Boden, die Horde steigt darüber. */
export function buildWallRubble(seed, level = 1, cells = 3) {
  const m = new VoxelModel();
  const [z0, z1] = span(cells);
  mound(m, z0, z1, seed, level, 0.9);
  for (let k = 0; k < cells * 6; k++) {
    const z = z0 + 4 + Math.floor(hash3(k, 1, 2, seed) * (z1 - z0 - 8));
    const x = -10 + Math.floor(hash3(k, 2, 2, seed) * 20);
    if (level === 4) {
      // Steinbrocken
      const r = 2 + Math.floor(hash3(k, 3, 2, seed) * 3);
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) for (let y = 0; y <= r; y++) if (dx * dx + dz * dz + y * y * 2 <= r * r + 1) m.set(x + dx, y + 6, z + dz, y === r ? P.s6 : (dx + dz) % 3 ? P.s5 : P.s4);
    } else {
      // Pfahl- und Bohlenstücke, meist längs, manche quer
      const along = hash3(k, 4, 2, seed) < 0.7;
      const len = 6 + Math.floor(hash3(k, 5, 2, seed) * 14);
      const tone = level === 1 ? (k % 3 ? P.e5 : P.g4) : k % 2 ? P.e5 : P.e6;
      for (let t = 0; t < len; t++) {
        for (let y = 0; y <= 2; y++) {
          const px = along ? x : x + t - (len >> 1);
          const pz = along ? z + t - (len >> 1) : z;
          if (pz < z0 || pz > z1) continue;
          m.set(px, y + 6, pz, y === 2 ? tone : P.e3);
          m.set(px + (along ? 1 : 0), y + 6, pz + (along ? 0 : 1), y === 2 ? P.e7 : P.e4);
        }
      }
    }
  }
  return m;
}

// --- Das Tor ------------------------------------------------------------------------------------
//
// Fünf Zellen entlang z: [Pfosten][Flügel][Schlupftür][Flügel][Pfosten]. Die
// Flügel bleiben zu; die Schlupftür in der Mitte schwingt nach innen (Osten)
// auf, wenn Mika davorsteht – sie ist ein eigenes Modell mit dem Ursprung am
// Scharnier (Nordkante).

export const GATE_CELLS = 5;
export const GATE_HALF = (GATE_CELLS * CELL) / 2; // 80
export const POST = 12; // Pfostenbreite (z)
export const WICKET = { z0: -16, len: 32 }; // Schlupftür: 1 m in der Mitte

function wingPanel(m, z0, z1, level, seed, damage, h) {
  for (let z = z0; z <= z1; z++) {
    const rel = z - z0;
    for (let y = 1; y <= h; y++) {
      if (damage > 0 && y > 8 && hash3(z >> 3, y >> 3, 3, seed) < damage * 0.4) continue;
      for (let x = -1; x <= 1; x++) {
        let c;
        if (level === 1) {
          // Weidenflechtwerk mit Rahmen
          const frame = rel < 2 || z1 - z < 2 || y <= 2 || y >= h - 1;
          c = frame ? P.e4 : (y >> 1) % 2 === (z >> 2) % 2 ? P.e6 : P.e5;
        } else if (level === 2) {
          // Stangen dicht an dicht, oben angespitzt
          const seam = rel % 4 === 3;
          c = seam ? P.e3 : y >= h - 1 ? P.e8 : x === -1 ? P.e4 : P.e5;
        } else {
          // Bohlen mit Eisenbändern und Nägeln
          const band = y === 8 || y === 9 || y === h - 8 || y === h - 7;
          const seam = rel % 6 === 5;
          c = band ? (level === 4 ? P.s4 : P.s3) : seam ? P.e3 : level === 4 ? (x === -1 ? P.e4 : P.e5) : x === -1 ? P.e5 : P.e6;
          if (band && rel % 6 === 2) c = P.s7; // Nagelkopf
        }
        m.set(x, y, z, c);
      }
    }
  }
  // Querstrebe (Z) innen, damit der Flügel von oben nach etwas aussieht
  for (let t = 0; t <= z1 - z0; t++) {
    const y = 6 + Math.round(((h - 12) * t) / (z1 - z0));
    for (let dy = 0; dy <= 2; dy++) m.set(2, y + dy, z0 + t, level >= 3 ? P.s4 : P.e4);
  }
}

/**
 * Tor im Maß 1/32: Rahmen (Pfosten, Flügel, Sturz) und die Schlupftür.
 * @returns {{frame: VoxelModel, wicket: VoxelModel, height: number}}
 */
export function buildGate(seed, level = 1, damage = 0) {
  level = Math.max(1, Math.min(4, level));
  const frame = new VoxelModel();
  const ph = POST_HEIGHT[level];
  const wh = WING_HEIGHT[level];
  // Pfosten (Stufe 4: Steinpfeiler)
  for (const [a, b] of [[-GATE_HALF, -GATE_HALF + POST - 1], [GATE_HALF - POST, GATE_HALF - 1]]) {
    for (let z = a; z <= b; z++) {
      for (let x = -6; x <= 5; x++) {
        for (let y = 0; y <= ph; y++) {
          let c;
          if (level === 4) {
            const course = y >> 3;
            c = y % 8 === 7 || (z + course * 5) % 12 === 11 ? P.s3 : [P.s5, P.s6, P.s5, P.s4][Math.floor(hash3((z + 90) >> 2, course, (x + 8) >> 2, seed) * 4)];
          } else {
            const front = z === b;
            c = y >= ph - 1 ? P.e7 : front ? (x === -6 ? P.e5 : P.e6) : (y + x) % 11 === 0 ? P.e3 : P.e4;
          }
          frame.set(x, y, z, c);
        }
      }
      // Kappe oben
      if (level >= 2) for (let x = -7; x <= 6; x++) frame.set(x, ph + 1, z, level === 4 ? P.s7 : P.e8);
    }
  }
  // Kleine Pyramidendächer auf den Pfosten (ab Stufe 2): ihre Südflanke sieht man gut
  if (level >= 2) {
    for (const zc of [-GATE_HALF + POST / 2, GATE_HALF - POST / 2]) {
      for (let r = 0; r <= 8; r++) {
        const y = ph + 2 + r;
        const w = 9 - r;
        for (let dx = -w; dx <= w - 1; dx++) {
          for (let dz = -w; dz <= w - 1; dz++) {
            const edge = Math.abs(dx + 0.5) >= w - 1 || Math.abs(dz + 0.5) >= w - 1;
            if (!edge && r < 8) continue;
            const c = level === 4 ? (r % 2 ? P.s5 : P.s6) : level === 3 ? (r % 2 ? P.r3 : P.r4) : r % 2 ? P.e4 : P.e5;
            frame.set(dx, y, Math.round(zc) + dz, c);
          }
        }
      }
    }
  }
  // Schild über der Wegmitte, quer zur Mauer (Süden sieht die Kamera): eine Laterne darauf gemalt
  const sy = ph - 20;
  for (let x = -12; x <= 11; x++) {
    for (let y = sy; y <= sy + 11; y++) {
      const border = x === -12 || x === 11 || y === sy || y === sy + 11;
      let c = border ? P.e3 : (x + y) % 7 === 0 ? P.e6 : P.e7;
      // Laterne: Bügel, Glas, Boden
      const lx = x + 0.5;
      const ly = y - sy;
      if (Math.abs(lx) <= 3 && ly >= 3 && ly <= 8) c = ly === 3 || ly === 8 ? P.e2 : Math.abs(lx) <= 1.5 ? P.f6 : P.f4;
      if (Math.abs(lx) <= 1 && ly === 9) c = P.e2;
      frame.set(x, y, 0, c);
      frame.set(x, y, -1, P.e4);
    }
  }
  for (const x of [-9, 8]) for (let y = sy + 12; y <= ph - 8; y++) frame.set(x, y, 0, P.s4); // Ketten
  // Sturz über dem Tor: Balken von Pfosten zu Pfosten, ab Stufe 3 mit kleinem Dach
  const ly = ph - 8;
  for (let z = -GATE_HALF + POST; z < GATE_HALF - POST; z++) {
    for (let y = ly; y <= ly + 4; y++) for (let x = -3; x <= 2; x++) frame.set(x, y, z, y === ly + 4 ? P.e6 : level === 4 ? P.e3 : P.e4);
  }
  // Streben an den Pfosten (innen und außen) – Südseiten zeigen die Höhe
  for (const zc of [-GATE_HALF + 3, GATE_HALF - POST + 3]) {
    for (const dir of [1, -1]) {
      const len = 12;
      for (let t = 0; t <= len; t++) {
        const y = Math.round(ph * 0.55 - (ph * 0.55 * t) / len);
        for (let dy = 0; dy < 4; dy++) for (let dz = 0; dz < 5; dz++) if (y - dy >= 0) frame.set(dir * (6 + t) - (dir < 0 ? 1 : 0), y - dy, zc + dz, dz === 4 ? (level === 4 ? P.s6 : P.e6) : level === 4 ? P.s4 : P.e4);
      }
    }
  }
  // Flügel links und rechts der Schlupftür
  wingPanel(frame, -GATE_HALF + POST, WICKET.z0 - 1, level, seed, damage, wh);
  wingPanel(frame, WICKET.z0 + WICKET.len, GATE_HALF - POST - 1, level, seed, damage, wh);
  // Schlupftür: Ursprung am Scharnier (Nordkante), z = 0 … len−1
  const wicket = new VoxelModel();
  wingPanel(wicket, 0, WICKET.len - 1, level, seed + 5, damage, wh - 4);
  // Griff (Ring) an der Außenseite
  wicket.set(-2, (wh >> 1) - 1, WICKET.len - 5, P.s7).set(-2, wh >> 1, WICKET.len - 5, P.s6);
  return { frame, wicket, height: ph };
}

/**
 * Fahne über einem Torpfosten (M17): Mast mit Knauf und Querholz (statisch)
 * und das Tuch (flach zur Kamera, im Wind) mit dem Ursprung oben am Querholz.
 * Rot-orange mit hellem Streifen und Schwalbenschwanz – so erkennt man das
 * Tor auch als Weidenzaun von Weitem.
 */
export function buildGateBanner(level = 1) {
  const ph = POST_HEIGHT[Math.max(1, Math.min(4, level))];
  const base = level >= 2 ? ph + 10 : ph + 1; // über dem Dächlein bzw. auf dem Pfosten
  const H = 30; // Mast
  const pole = new VoxelModel();
  pole.box(0, base, 0, 1, base + H, 1, (x, y) => (y % 10 === 0 ? P.e2 : x === 0 ? P.e5 : P.e4));
  pole.box(-1, base + H + 1, -1, 2, base + H + 2, 2, P.f6); // Knauf
  pole.box(-18, base + H - 2, 0, 1, base + H - 1, 0, P.e3); // Querholz nach außen (Westen)
  const cloth = new VoxelModel();
  for (let y = 0; y < 28; y++) {
    for (let x = -17; x <= -1; x++) {
      const tail = y >= 22 && Math.abs(x + 9) < (y - 21) * 1.4; // Schwalbenschwanz unten
      if (tail) continue;
      const stripe = y >= 8 && y <= 11;
      const edge = x === -17 || x === -1;
      cloth.set(x, -y - 1, 0, stripe ? P.f7 : edge ? P.f2 : (x + y) % 9 === 0 ? P.f4 : P.f3);
    }
  }
  return { pole, cloth, top: base + H - 2 };
}

// --- Zubehör (M17e) ------------------------------------------------------------------------------
//
// Dornen, Laterne, Pechkessel und Glocke, im Maß 1/32 um die Mitte des Baus
// gebaut, der sie trägt (Barrikade: eine Zelle; Tor: fünf Zellen entlang z,
// Westen = außen). Die Barrikade dreht ihr Zubehör mit (turns), das Tor nicht.
// Leuchtendes (Laternenglas) liegt in einem eigenen Modell für das Glüh-Material.

/** Eisendorn schräg nach außen: Fuß 2 × 2, Schaft, helle Spitze. dir = (dx, dz) nach außen. */
function spike(m, x, y0, z, dx, dz, len = 8) {
  for (let t = 0; t < len; t++) {
    const px = x + Math.round((dx * t) / 2);
    const pz = z + Math.round((dz * t) / 2);
    const y = y0 + t;
    const tip = t >= len - 2;
    const c = tip ? P.s8 : t < 2 ? P.s3 : t % 3 === 1 ? P.s6 : P.s5;
    m.set(px, y, pz, c);
    if (t < len - 3) m.set(px + (dz ? 1 : 0), y, pz + (dx ? 1 : 0), shadeIron(c));
  }
}

function shadeIron(c) {
  return c === P.s6 ? P.s4 : c === P.s5 ? P.s4 : c === P.s3 ? P.s2 : c;
}

/** Kleine Laterne (Rahmen, Dach, Ring): Glas als Glüh-Modell. Ursprung = Mitte unten. */
function lantern(m, glow, x, y, z) {
  m.box(x - 3, y, z - 3, x + 2, y, z + 2, P.s3); // Boden
  for (const [dx, dz] of [[-3, -3], [2, -3], [-3, 2], [2, 2]]) m.box(x + dx, y + 1, z + dz, x + dx, y + 6, z + dz, P.s4); // Streben
  m.box(x - 4, y + 7, z - 4, x + 3, y + 7, z + 3, P.s3); // Dach
  m.box(x - 3, y + 8, z - 3, x + 2, y + 8, z + 2, P.s4);
  m.box(x - 1, y + 9, z - 1, x, y + 9, z, P.s6); // Knauf
  glow.box(x - 2, y + 1, z - 2, x + 1, y + 6, z + 1, 0xffffff);
}

/**
 * Zubehör als Voxelmodell.
 * @param {'dornen'|'laterne'|'pech'|'glocke'} id
 * @param {'barrikade'|'tor'} host
 * @param {number} level Stufe des Tors (Höhe der Pfosten)
 * @returns {{model: VoxelModel, glow: VoxelModel|null}}
 */
export function buildGear(id, host, level = 1) {
  const m = new VoxelModel();
  const glow = new VoxelModel();
  const gate = host === 'tor';
  const ph = POST_HEIGHT[Math.max(1, Math.min(4, level))];
  if (id === 'dornen') {
    if (gate) {
      // Zwei Reihen Dornen an der Außenseite beider Flügel (die Schlupftür bleibt frei)
      for (const [a, b] of [[-GATE_HALF + POST + 2, WICKET.z0 - 4], [WICKET.z0 + WICKET.len + 3, GATE_HALF - POST - 3]]) {
        for (let z = a; z <= b; z += 6) for (const y of [8, 22]) spike(m, -2, y, z, -2, 0, 7);
        // Draht zwischen den Dornen
        for (let z = a; z <= b; z++) m.set(-5, 11, z, P.s4).set(-5, 25, z, P.s4);
      }
    } else {
      // Eine Reihe vorn und hinten, schräg nach außen, dazwischen Draht
      for (const [zRow, dz] of [[11, 1], [-12, -1]]) {
        for (let x = -14; x <= 12; x += 6) spike(m, x + (dz < 0 ? 2 : 0), 0, zRow, 0, dz * 2, 9);
        for (let x = -15; x <= 14; x++) m.set(x, 4, zRow + dz * 4, (x >> 1) % 3 === 0 ? P.s6 : P.s4);
      }
    }
  } else if (id === 'laterne') {
    if (gate) {
      // An beiden Pfosten ein Ausleger nach außen, daran eine Laterne
      for (const zc of [-GATE_HALF + POST / 2, GATE_HALF - POST / 2]) {
        const z = Math.round(zc);
        const y = ph - 14;
        m.box(-14, y + 12, z - 1, -6, y + 13, z, P.e3); // Ausleger
        m.box(-11, y + 10, z, -11, y + 11, z, P.s4); // Haken
        lantern(m, glow, -11, y, z);
      }
    } else {
      // Pfahl in der hinteren rechten Ecke, Ausleger zur Mitte, Laterne daran
      m.box(11, 0, -13, 12, 43, -12, (x, y) => (y % 12 === 0 ? P.e2 : x === 11 ? P.e5 : P.e4));
      m.box(10, 44, -14, 13, 45, -11, P.e3); // Kappe
      m.box(5, 41, -13, 10, 42, -12, P.e3); // Ausleger
      m.box(6, 39, -12, 6, 40, -12, P.s4); // Haken
      lantern(m, glow, 6, 29, -12);
    }
  } else if (id === 'pech') {
    // Kessel auf drei Steinen vorn links: schwarzes Pech mit hellem Glanz
    const cx = -10;
    const cz = 9;
    for (const [dx, dz] of [[-4, -3], [3, -3], [0, 4]]) m.box(cx + dx - 1, 0, cz + dz - 1, cx + dx + 1, 2, cz + dz + 1, (x, y) => (y === 2 ? P.s6 : P.s5));
    for (let y = 3; y <= 10; y++) {
      const r = y <= 4 ? 3.6 + (y - 3) : y >= 9 ? 5.6 : 5.2;
      for (let x = -6; x <= 6; x++) {
        for (let z = -6; z <= 6; z++) {
          const d = Math.hypot(x + 0.5, z + 0.5);
          if (d > r) continue;
          const rim = y === 10;
          const inner = d < r - 1.2;
          if (rim && inner) m.set(cx + x, y - 1, cz + z, d < 1.6 && x < 0 ? P.n6 : P.n1); // Pech mit Glanz
          else if (rim) m.set(cx + x, y, cz + z, P.s4);
          else if (!inner) m.set(cx + x, y, cz + z, z >= 3 ? P.s3 : P.s2);
        }
      }
    }
    // Henkel
    for (let t = -4; t <= 4; t++) m.set(cx + t, 12 + (Math.abs(t) < 3 ? 1 : 0), cz, P.s4);
    m.set(cx - 5, 11, cz, P.s4).set(cx + 4, 11, cz, P.s4);
  } else if (id === 'glocke') {
    // Galgen am Nordpfosten nach innen (Osten), darunter die Glocke mit Seil
    const z = -GATE_HALF + Math.round(POST / 2);
    const top = ph - 2;
    m.box(6, top, z - 1, 17, top + 1, z, P.e3); // Arm
    for (let t = 0; t < 7; t++) m.set(6 + t, top - 1 - t, z, P.e4); // Strebe
    // Glocke: Kranz, Flanke, Schulter (Bronze mit Licht auf der Südseite)
    const bx = 13;
    for (let y = 0; y < 10; y++) {
      const r = y < 2 ? 5.2 : y < 7 ? 4.2 - (y - 2) * 0.25 : 3.2 - (y - 7) * 0.8;
      const yy = top - 12 + y;
      for (let dx = -6; dx <= 6; dx++) {
        for (let dz = -6; dz <= 6; dz++) {
          const d = Math.hypot(dx + 0.5, dz + 0.5);
          if (d > r || (d < r - 1.4 && y < 8)) continue;
          m.set(bx + dx, yy, z + dz, y < 2 ? P.f2 : dz >= 2 ? P.f5 : dx < -1 ? P.f3 : P.f4);
        }
      }
    }
    m.box(bx - 1, top - 3, z, bx, top - 1, z, P.s4); // Joch
    m.box(bx, top - 14, z, bx, top - 12, z, P.s5); // Klöppel
    for (let y = 4; y < top - 12; y += 1) m.set(bx + 5, y, z + 1, y % 4 === 0 ? P.e5 : P.e7); // Seil
  }
  return { model: m, glow: glow.size ? glow : null };
}
