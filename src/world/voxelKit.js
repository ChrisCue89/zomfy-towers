// Baukasten für Modelle im feinen Maß (Meilenstein 13: 1/16 m, M13g: 1/32 m):
// Farben innerhalb ihrer Rampe verschieben, Bretter, Rundhölzer, Steine,
// Blumen, Quader in 1/16-Koordinaten auf 1/32-Modellen und Kantenlicht.
// Alles rechnet in Voxeln des jeweiligen Modells (size 1/16 bzw. 1/32).

import { P, RAMPS } from '../render/palette.js';
import { hash3 } from '../core/rng.js';

export const FINE = 1 / 16;
/** Doppelt so fein (M13g): gut 2 px je Voxel bei 80 px/m – die Detaildichte des Vorbilds. */
export const FINE32 = 1 / 32;

// Rampen, deren Stufen wirklich von dunkel nach hell laufen (»a« sind Akzente)
const WHERE = new Map();
for (const [name, ramp] of Object.entries(RAMPS)) {
  if (name === 'a') continue;
  ramp.forEach((hex, i) => {
    if (!WHERE.has(hex)) WHERE.set(hex, [ramp, i]);
  });
}

/** Farbe innerhalb ihrer Rampe um k Stufen heller (k > 0) oder dunkler (k < 0). */
export function shade(hex, k) {
  const w = WHERE.get(hex);
  if (!w || !k) return hex;
  const [ramp, i] = w;
  return ramp[Math.max(0, Math.min(ramp.length - 1, i + k))];
}

/**
 * Senkrechte Bretter: u läuft entlang der Wand, y nach oben. Dunkle Fuge am
 * Brettanfang, jedes Brett etwas anders getönt, Maserung als kurze Striche
 * (Länge `grain`) eine Stufe dunkler, hier und da ein Astloch. Mit `edge`
 * fängt die Kante neben der Fuge Licht (im Maß 1/32).
 */
export function boardColor(u, y, seed, { width = 4, tones = [P.e4, P.e5, P.e6], seam = P.e3, grain = 5, edge = false } = {}) {
  const i = Math.floor(u / width);
  const k = u - i * width;
  if (k === 0) return seam;
  const r = hash3(i, 0, 0, seed);
  let c = tones[r < 0.3 ? 0 : r < 0.75 ? 1 : Math.min(2, tones.length - 1)];
  if (hash3(u, Math.floor(y / grain), i, seed + 3) > 0.84) c = shade(c, -1);
  else if (edge && k === 1) c = shade(c, 1);
  if (hash3(u, y, i, seed + 7) > 0.993) return seam;
  return c;
}

/**
 * Liegende Bretter (Deck, Stufen): Bretter der Breite `width` quer zu v,
 * versetzte Stöße entlang u. Gibt die Farbe der Oberseite zurück.
 */
export function deckColor(u, v, seed, { width = 3, run = 22, tones = [P.e5, P.e6, P.e5], seam = P.e3 } = {}) {
  const row = Math.floor(v / width);
  if (v - row * width === width - 1) return seam;
  const offset = Math.floor(hash3(row, 1, 0, seed) * run);
  const piece = Math.floor((u + offset) / run);
  if ((u + offset) % run === 0) return seam;
  const r = hash3(row, piece, 0, seed + 1);
  let c = tones[Math.floor(r * tones.length)];
  if (hash3(u, v, row, seed + 2) > 0.9) c = shade(c, -1);
  return c;
}

/**
 * Liegendes Rundholz entlang x (Mittelachse auf Höhe cy, Tiefe cz, Radius r):
 * Rinde in Längsrillen, oben heller; an den Enden Jahresringe. `seg` ist die
 * Länge der Rindenstücke, `ring` die Breite eines Jahresrings (beides in Voxeln).
 */
export function logX(m, x0, x1, cy, cz, r, seed, { ends = true, moss = false, bark = [P.e2, P.e3, P.e4], seg = 5, ring = r / 4 } = {}) {
  for (let x = x0; x <= x1; x++) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
        const dy = y + 0.5 - cy;
        const dz = z + 0.5 - cz;
        const d = Math.sqrt(dy * dy + dz * dz);
        if (d > r) continue;
        let c;
        if (ends && (x === x0 || x === x1)) {
          const band = Math.floor(d / ring);
          c = d > r - 0.9 ? bark[1] : band % 2 ? P.e7 : P.e8;
          if (d < 0.8) c = P.e6;
        } else {
          const a = Math.atan2(dy, dz);
          const groove = Math.floor((a / Math.PI) * 6 + 12 + (hash3(Math.floor(x / seg), 0, 0, seed) > 0.5 ? 0.5 : 0)) % 2 === 0;
          const h = hash3(x, y, z, seed);
          c = dy > r * 0.35 ? (groove ? bark[1] : bark[2]) : groove ? bark[0] : bark[1];
          if (h > 0.93) c = shade(c, -1);
          if (moss && dy > r * 0.45 && hash3(Math.floor(x / 2), 0, z, seed + 4) > 0.55) c = h > 0.6 ? P.g5 : P.g4;
        }
        m.set(x, y, z, c);
      }
    }
  }
  return m;
}

/** Liegendes Rundholz entlang z (wie logX, um 90° gedreht). */
export function logZ(m, z0, z1, cx, cy, r, seed, options) {
  const tmp = logX(new (m.constructor)(), z0, z1, cy, 0, r, seed, options);
  tmp.forEach((x, y, z, c) => m.set(cx + z, y, x, c));
  return m;
}

/**
 * Rundlicher Stein: Ellipsoid mit hellerer Oberseite, dunklerem Fuß und
 * Sprenkeln; unten abgeflacht (liegt auf dem Boden). `grain` fasst Voxel zu
 * Sprenkeln zusammen (im Maß 1/32 zwei, damit der Stein nicht grieselt).
 */
export function stoneBlob(m, cx, cz, rx, ry, rz, seed, tones = [P.s3, P.s4, P.s5, P.s6, P.s7], { grain = 1 } = {}) {
  m.ellipsoid(cx, 0, cz, rx, ry, rz, (x, y, z, dx, dy) => {
    if (y < 0) return null;
    const h = hash3(Math.floor(x / grain), Math.floor(y / grain), Math.floor(z / grain), seed);
    let t = dy > 0.55 ? 3 : dy > 0.15 ? 2 : 1;
    if (h > 0.86) t += 1;
    else if (h < 0.12) t -= 1;
    if (y === 0) t = Math.min(t, 1);
    return tones[Math.max(0, Math.min(tones.length - 1, t))];
  });
  return m;
}

/** Kleine Blüte: Stiel, Blatt und ein Kreuz aus Blütenblättern mit hellerer Mitte. */
export function flower(m, x, y, z, petal, center = P.f6, stem = 2) {
  for (let k = 0; k < stem; k++) m.set(x, y + k, z, P.g4);
  const t = y + stem;
  m.set(x, t, z, center).set(x - 1, t, z, petal).set(x + 1, t, z, petal).set(x, t, z + 1, petal).set(x, t + 1, z, petal);
  return m;
}

/**
 * Quader in 1/16-Koordinaten auf einem Modell im Maß 1/32 (M13g): jede
 * Grenze wird verdoppelt, die Farbfunktion bekommt die feinen Koordinaten.
 * So bleiben bewährte Maße erhalten, Muster und Kanten werden doppelt so fein.
 */
export function box2(m, x0, y0, z0, x1, y1, z1, color) {
  return m.box(2 * Math.min(x0, x1), 2 * Math.min(y0, y1), 2 * Math.min(z0, z1), 2 * Math.max(x0, x1) + 1, 2 * Math.max(y0, y1) + 1, 2 * Math.max(z0, z1) + 1, color);
}

/**
 * Kantenlicht wie in gezeichneter Pixelkunst (M13g): obere Kanten, die nach
 * Süden (zur Kamera) oder Westen (zum Licht) frei liegen, eine Stufe heller,
 * untere Vorderkanten eine Stufe dunkler. `only` beschränkt auf Farben.
 */
export function edgeLight(m, { up = 1, down = -1, only = null } = {}) {
  const changes = [];
  m.forEach((x, y, z, c) => {
    if (only && !only.has(c)) return;
    const top = !m.has(x, y + 1, z);
    const front = !m.has(x, y, z + 1);
    let k = 0;
    if (top && (front || !m.has(x - 1, y, z))) k = up;
    else if (front && y > 0 && !m.has(x, y - 1, z)) k = down;
    if (k) changes.push([x, y, z, shade(c, k)]);
  });
  for (const [x, y, z, c] of changes) m.set(x, y, z, c);
  return m;
}
