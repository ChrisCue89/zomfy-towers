// Bilder fürs Baumenü (H1, recherche/hud-baumenue.md 4.5): Jeder Bau erscheint so, wie er
// danach in der Welt steht – aus demselben Voxel-Modell und mit der Schrägsicht der Welt
// (je 1/32-Voxel s Pixel breit, 0,6·s Oberseite, 0,8·s Vorderseite). Gerechnet wird auf
// der CPU in ein Pixelfeld (kein Auslesen der GPU), einmal je Bau und dann gemerkt.
// Hohe Türme zeigt die Kachel als Brustbild: Kopf und oberer Sockel, unten abgeschnitten.

import { P, hexToRgb, nearestPaletteHex } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';
import { fineTowerModels, towerPartModel } from '../world/towerModels.js';
import { BUILDING_MODELS, buildBarricade } from '../world/buildingModels.js';
import { TRAP_MODELS } from '../world/trapModels.js';

/** Bildfläche einer Kachel (UI-Pixel). */
export const PICTURE = { w: 44, h: 40 };

const TOP_SHADE = 1.08;
const FRONT_SHADE = 0.8;
const AO_FRONT = 0.78;
const EDGE_SHADE = 0.55; // Tiefenkante innen (wie der Umriss in der Welt, nur weicher)
const GLOW = P.f6; // Leuchtendes (Laterne, Glut) in warmem Gelb
const VISIBLE = 0.7; // Brustbild: mindestens dieser Teil der Höhe bleibt zu sehen
const BUST_SCALE = 1.2; // Brustbild: so groß höchstens (Pixel je 1/32-Voxel)
const MAX_SCALE = 1.5; // Kleines (Knallerbsen, Kürbis) wird nicht riesig

const shades = new Map();
function shade(hex, factor) {
  const key = `${hex}|${factor}`;
  let out = shades.get(key);
  if (out === undefined) {
    const [r, g, b] = hexToRgb(hex);
    out = nearestPaletteHex(Math.min(1, r * factor), Math.min(1, g * factor), Math.min(1, b * factor));
    shades.set(key, out);
  }
  return out;
}

/**
 * Modell → Pixelfeld (-1 = leer). Reihenfolge von hinten nach vorn, unten nach oben;
 * Kanten auf ganze Pixel gerundet, so schließen die Flächen lückenlos aneinander.
 * @param {VoxelModel} model
 * @param {Set<number>} [glow] Schlüssel leuchtender Voxel (glowKey)
 * @returns {{w:number, h:number, px:Int32Array, depth:Float32Array, bust:boolean, scale:number, filled:number}}
 */
export function rasterize(model, glow = null, { w = PICTURE.w, h = PICTURE.h } = {}) {
  const cells = [];
  const hasGlow = glow && glow.size > 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  model.forEach((x, y, z, c) => {
    // Nur Voxel mit sichtbarer Oberseite oder Vorderseite zählen (die Kamera sieht nie mehr)
    if (!model.has(x, y + 1, z) || !model.has(x, y, z + 1)) cells.push([x, y, z, c]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  });
  const px = new Int32Array(w * h).fill(-1);
  const depth = new Float32Array(w * h).fill(Infinity);
  if (!cells.length) return { w, h, px, depth, bust: false, scale: 0, filled: 0 };
  const W = maxX - minX + 1;
  const tallRows = 0.8 * (maxY - minY + 1) + 0.6 * (maxZ - minZ + 1);
  // Ganz, wenn es gut hineinpasst; hohe Türme als Brustbild – aber nie weniger als VISIBLE der Höhe
  const whole = Math.min(MAX_SCALE, (w - 2) / W, (h - 2) / tallRows);
  const s = Math.max(whole, Math.min(BUST_SCALE, (w - 2) / W, (h - 2) / (VISIBLE * tallRows)));
  const bust = s > whole + 1e-6;
  const imgW = Math.round(W * s);
  const imgH = Math.round(tallRows * s);
  const ox = Math.floor((w - imgW) / 2);
  const oy = bust ? 1 : h - 1 - imgH; // Brustbild oben bündig, sonst unten bündig
  const X = (x) => ox + Math.round(s * (x - minX));
  const Y = (yb, zb) => oy + Math.round(s * (0.8 * (maxY + 1 - yb) + 0.6 * (zb - minZ)));
  const fill = (x0, x1, y0, y1, color, d) => {
    for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
        px[y * w + x] = color;
        depth[y * w + x] = d;
      }
    }
  };
  // Hinten (kleines z) zuerst, dann von unten nach oben
  cells.sort((a, b) => a[2] - b[2] || a[1] - b[1]);
  for (const [x, y, z, c] of cells) {
    const above = model.has(x, y + 1, z);
    const front = model.has(x, y, z + 1);
    const lit = hasGlow && glow.has(glowKey(x, y, z));
    const x0 = X(x);
    const x1 = X(x + 1);
    if (x1 <= x0) continue;
    // Tiefe entlang der Blickrichtung (0, −0,6, −0,8): größer = weiter weg
    const d = -0.6 * y - 0.8 * z;
    if (!above) fill(x0, x1, Y(y + 1, z), Y(y + 1, z + 1), lit ? GLOW : shade(c, TOP_SHADE), d);
    if (!front) {
      const covered = model.has(x, y + 1, z + 1);
      fill(x0, x1, Y(y + 1, z + 1), Y(y, z + 1), lit ? GLOW : shade(c, covered ? FRONT_SHADE * AO_FRONT : FRONT_SHADE), d - 0.8);
    }
  }
  // Tiefenkanten innen: Wo ein Nachbar deutlich näher liegt, wird das ferne Pixel dunkler
  const edge = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (px[i] < 0) continue;
      const d = depth[i];
      const near = (j) => px[j] >= 0 && depth[j] < d - 4;
      if ((x > 0 && near(i - 1)) || (x < w - 1 && near(i + 1)) || (y > 0 && near(i - w)) || (y < h - 1 && near(i + w))) edge.push(i);
    }
  }
  for (const i of edge) px[i] = shade(px[i], EDGE_SHADE);
  // Dunkler Umriss um die Silhouette
  const outline = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (px[i] >= 0) continue;
      if ((x > 0 && px[i - 1] >= 0) || (x < w - 1 && px[i + 1] >= 0) || (y > 0 && px[i - w] >= 0) || (y < h - 1 && px[i + w] >= 0)) outline.push(i);
    }
  }
  for (const i of outline) px[i] = P.n0;
  let filled = 0;
  for (let i = 0; i < px.length; i++) if (px[i] >= 0) filled++;
  return { w, h, px, depth, bust, scale: s, filled };
}

/** Schlüssel eines leuchtenden Voxels (wie in render/voxel.js, ganze Zahl statt Text). */
function glowKey(x, y, z) {
  return ((x + 1024) * 2048 + (y + 1024)) * 2048 + (z + 1024);
}

/** Ein Modell samt Leuchtendem zusammensetzen (Kopf auf den Sockel, Glühteile dazu). */
function compose(parts) {
  const model = new VoxelModel();
  const glow = new Set();
  for (const { m, dy = 0, lit = false } of parts) {
    if (!m) continue;
    m.forEach((x, y, z, c) => {
      model.set(x, y + dy, z, c);
      if (lit) glow.add(glowKey(x, y + dy, z));
    });
  }
  return { model, glow };
}

/** Modell eines Bildes nach Schlüssel: »bau:art«, »turm:art:stufe:spez«, »barrikade:stufe«, »teil:id«. */
export function pictureModel(key) {
  const [kind, id, a, b] = key.split(':');
  if (kind === 'turm' || (kind === 'bau' && TOWER_TYPES.has(id))) {
    const level = kind === 'turm' ? Number(a) || 1 : 1;
    const spec = kind === 'turm' && b && b !== '-' ? b : null;
    const t = fineTowerModels(id, level, spec);
    return compose([
      { m: t.base },
      { m: t.head, dy: t.headY },
      { m: t.glow, dy: t.glowOnHead ? t.headY : 0, lit: true },
      { m: t.baseGlow, lit: true },
    ]);
  }
  if (kind === 'barrikade') return compose([{ m: buildBarricade(5, Number(id) || 1) }]);
  if (kind === 'teil') return compose([{ m: towerPartModel(id).upsampled(2) }]);
  if (kind === 'bau' && BUILDING_MODELS[id]) {
    const spec = BUILDING_MODELS[id];
    return compose([{ m: spec.model(5) }, { m: spec.glow ? spec.glow() : null, lit: true }]);
  }
  if (kind === 'bau' && TRAP_MODELS[id]) return compose([{ m: TRAP_MODELS[id](5) }]);
  return null;
}

// Arten mit Turmmodell (Türme, Familien, Mischtürme) – vom Spiel gesetzt (data/buildings.js)
const TOWER_TYPES = new Set();
export function registerTowerTypes(types) {
  for (const t of types) TOWER_TYPES.add(t);
}

/** Pixelfeld → Canvas (nur im Browser). */
function toCanvas(r) {
  const canvas = document.createElement('canvas');
  canvas.width = r.w;
  canvas.height = r.h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(r.w, r.h);
  const d = img.data;
  for (let i = 0; i < r.px.length; i++) {
    const c = r.px[i];
    if (c < 0) continue;
    d[i * 4] = (c >> 16) & 255;
    d[i * 4 + 1] = (c >> 8) & 255;
    d[i * 4 + 2] = c & 255;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Zwischenspeicher mit Warteschlange: `get(key)` gibt das Bild oder null (dann wird es
 * vorgemerkt), `tick(ms)` rechnet Vorgemerktes, bis die Zeit um ist (mindestens eines).
 */
export class BuildPictures {
  constructor() {
    this.done = new Map(); // key -> { canvas, filled, bust } | null (kein Modell)
    this.queue = [];
    this.rendered = 0;
  }

  get(key) {
    if (!key) return null;
    if (this.done.has(key)) return this.done.get(key);
    if (!this.queue.includes(key)) this.queue.push(key);
    return null;
  }

  /** Gleich rechnen (Prüfung, erstes Öffnen mit freier Zeit). */
  now(key) {
    if (!this.done.has(key)) this.render(key);
    return this.done.get(key);
  }

  render(key) {
    const src = pictureModel(key);
    if (!src) {
      this.done.set(key, null);
      return;
    }
    const r = rasterize(src.model, src.glow);
    this.done.set(key, { canvas: toCanvas(r), filled: r.filled, bust: r.bust, scale: r.scale });
    this.rendered++;
  }

  tick(ms = 4) {
    const t0 = performance.now();
    while (this.queue.length) {
      this.render(this.queue.shift());
      if (performance.now() - t0 >= ms) break;
    }
  }
}
