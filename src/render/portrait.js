// Porträts für Dialoge. Voxel-Modelle werden direkt in ein 2D-Canvas
// gezeichnet – mit derselben 3-4-5-Projektion wie die Spielwelt (5 px breit,
// 3 px Oberseite, 4 px Vorderseite je Voxel). Kein Auslesen der GPU nötig.

import { P, hexToRgb, nearestPaletteHex } from './palette.js';
import { VoxelModel } from './voxel.js';
import { buildBustModel, MIKA } from '../entities/characters.js';

const TOP_SHADE = 1.08;
const FRONT_SHADE = 0.8;
const AO_FRONT = 0.78;

function shadeHex(hex, factor) {
  const [r, g, b] = hexToRgb(hex);
  return nearestPaletteHex(Math.min(1, r * factor), Math.min(1, g * factor), Math.min(1, b * factor));
}

function css(hex) {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

/**
 * @param {VoxelModel} model
 * @param {{size?: number, top?: number}} options
 * @returns {HTMLCanvasElement}
 */
export function renderVoxelPortrait(model, { size = 52, top = 3 } = {}) {
  const cells = [];
  model.forEach((x, y, z, c) => cells.push([x, y, z, c]));
  // Projektion: sx = 5x, sy = -4y + 3z (nach unten wachsend)
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  for (const [x, y, z] of cells) {
    minX = Math.min(minX, x * 5);
    maxX = Math.max(maxX, x * 5 + 5);
    minY = Math.min(minY, -4 * (y + 1) + 3 * z);
  }
  const offsetX = Math.round((size - (maxX - minX)) / 2) - minX;
  const offsetY = top - minY;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  // Von hinten nach vorn, von unten nach oben zeichnen.
  cells.sort((a, b) => a[2] - b[2] || a[1] - b[1]);
  for (const [x, y, z, c] of cells) {
    const sx = x * 5 + offsetX;
    const topY = -4 * (y + 1) + 3 * z + offsetY;
    if (!model.has(x, y + 1, z)) {
      ctx.fillStyle = css(shadeHex(c, TOP_SHADE));
      ctx.fillRect(sx, topY, 5, 3);
    }
    if (!model.has(x, y, z + 1)) {
      const covered = model.has(x, y + 1, z + 1);
      ctx.fillStyle = css(shadeHex(c, covered ? FRONT_SHADE * AO_FRONT : FRONT_SHADE));
      ctx.fillRect(sx, topY + 3, 5, 4);
    }
  }

  // Dunkle Kontur um die Silhouette
  const image = ctx.getImageData(0, 0, size, size);
  const d = image.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < size && y < size && d[(y * size + x) * 4 + 3] > 0;
  const edge = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) edge.push([x, y]);
    }
  }
  ctx.fillStyle = css(P.n0);
  for (const [x, y] of edge) ctx.fillRect(x, y, 1, 1);
  return canvas;
}

function buildRadioModel() {
  const m = new VoxelModel();
  m.box(-5, 0, -2, 4, 6, 1, (x, y, z) => (z === 1 ? P.s3 : P.s2));
  for (let x = -4; x <= -1; x++) for (let y = 1; y <= 5; y++) if ((x + y) % 2 === 0) m.set(x, y, 1, P.s1);
  m.box(0, 3, 1, 3, 4, 1, P.e8);
  m.set(2, 3, 1, P.r4).set(2, 4, 1, P.r4);
  m.set(0, 1, 2, P.s6).set(3, 1, 2, P.s6);
  m.box(-3, 7, 0, 2, 7, 0, P.s4);
  m.set(-3, 8, 0, P.s4).set(2, 8, 0, P.s4);
  for (let i = 0; i < 5; i++) m.set(3 + Math.floor(i / 2), 7 + i, -1, P.s5);
  return m;
}

/** Alle Porträts, die Meilenstein 1 braucht. */
export function renderPortraits() {
  const bust = buildBustModel(MIKA);
  // Nur Kopf und Schultern
  const head = new VoxelModel();
  bust.forEach((x, y, z, c) => {
    if (y >= 5) head.set(x, y, z, c);
  });
  return {
    mika: renderVoxelPortrait(head, { top: 2 }),
    radio: renderVoxelPortrait(buildRadioModel(), { top: 8 }),
  };
}
