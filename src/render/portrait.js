// Porträts für Dialoge. Voxel-Modelle werden direkt in ein 2D-Canvas
// gezeichnet – mit derselben 3-4-5-Projektion wie die Spielwelt (5 px breit,
// 3 px Oberseite, 4 px Vorderseite je Voxel). Kein Auslesen der GPU nötig.

import { P, hexToRgb, nearestPaletteHex } from './palette.js';
import { VoxelModel } from './voxel.js';
import { buildFineBustModel, MIKA } from '../entities/characters.js';
import { survivorParts, survivorParts32 } from '../entities/survivorModels.js';
import { WANDERER_ORDER } from '../data/wanderers.js';
import { dogModels } from '../entities/dogModel.js';

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
 * @param {{size?: number, top?: number, w?: number, t?: number, f?: number}} options
 *   w/t/f: Pixel je Voxel für Breite, Oberseite und Vorderseite (Welt: 5/3/4;
 *   feine Modelle der Überlebenden: 4/1/3, damit der Kopf ins Fenster passt;
 *   Figuren im Maß 1/32 (M27): 2/1/1,5 – die Reihen wechseln dann zwischen
 *   einem und zwei Pixeln, gerundet auf ganze Pixel)
 * @returns {HTMLCanvasElement}
 */
export function renderVoxelPortrait(model, { size = 52, top = 3, w = 5, t = 3, f = 4 } = {}) {
  const cells = [];
  model.forEach((x, y, z, c) => cells.push([x, y, z, c]));
  // Projektion: sx = w·x, sy = -f·y + t·z (nach unten wachsend)
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  for (const [x, y, z] of cells) {
    minX = Math.min(minX, x * w);
    maxX = Math.max(maxX, x * w + w);
    minY = Math.min(minY, Math.round(-f * (y + 1)) + t * z);
  }
  const offsetX = Math.round((size - (maxX - minX)) / 2) - minX;
  const offsetY = top - minY;
  // Oberkante der Reihe y (ganze Pixel – bei f = 1,5 wechseln die Reihen zwischen 1 und 2 px)
  const rowTop = (y) => Math.round(-f * (y + 1));

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  // Von hinten nach vorn, von unten nach oben zeichnen.
  cells.sort((a, b) => a[2] - b[2] || a[1] - b[1]);
  for (const [x, y, z, c] of cells) {
    const sx = x * w + offsetX;
    const topY = rowTop(y) + t * z + offsetY;
    const rowH = rowTop(y - 1) - rowTop(y);
    if (!model.has(x, y + 1, z) && t > 0) {
      ctx.fillStyle = css(shadeHex(c, TOP_SHADE));
      ctx.fillRect(sx, topY, w, t);
    }
    if (!model.has(x, y, z + 1)) {
      const covered = model.has(x, y + 1, z + 1);
      ctx.fillStyle = css(shadeHex(c, covered ? FRONT_SHADE * AO_FRONT : FRONT_SHADE));
      ctx.fillRect(sx, topY + t, w, rowH);
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

/**
 * Brustbild im Maß 1/32 (M27): der runde Kopf aus dem Figuren-Baukasten (N1)
 * mit der Gesichtsplatte – so sehen die Wanderer im Dialog aus wie in der Welt.
 */
function portrait32(id) {
  const parts = survivorParts32(id);
  const bust = new VoxelModel();
  const add = (model) => model.forEach((x, y, z, c) => y >= 20 && bust.set(x, y, z, c));
  add(parts.torso);
  add(parts.head);
  if (parts.faces) add(parts.faces.normal);
  return renderVoxelPortrait(bust, { top: 1, w: 2, t: 1, f: 1.5 });
}

/** Brustbild einer Überlebenden-Figur (feines Modell, flachere Projektion). */
function survivorPortrait(id) {
  const parts = survivorParts(id);
  const bust = new VoxelModel();
  const add = (model) => model.forEach((x, y, z, c) => y >= 10 && bust.set(x, y, z, c));
  add(parts.torso);
  add(parts.head);
  return renderVoxelPortrait(bust, { top: 2, w: 4, t: 1, f: 3 });
}

/** Balduin: Brust mit Schal, Bart, Grinsen mit Goldzahn und Schiebermütze. */
function balduinPortrait() {
  const parts = survivorParts('balduin');
  const bust = new VoxelModel();
  const add = (model) => model.forEach((x, y, z, c) => y >= 10 && y <= 24 && bust.set(x, y, z, c));
  add(parts.torso);
  add(parts.head);
  return renderVoxelPortrait(bust, { top: 1, w: 4, t: 1, f: 3 });
}

/** Knopf: der ganze Hund, schräg von vorn. */
function dogPortrait() {
  const m = new VoxelModel();
  const { body, head, tail } = dogModels();
  body.forEach((x, y, z, c) => m.set(x, y, z, c));
  head.forEach((x, y, z, c) => m.set(x, y + 8, z + 4, c));
  tail.forEach((x, y, z, c) => m.set(x, y + 8, z - 5, c));
  return renderVoxelPortrait(m, { top: 6, w: 5, t: 2, f: 4 });
}

/**
 * Porträt der Hauptfigur (mit dem gewählten Aussehen, Meilenstein 7) – seit
 * m12-r1 im feinen Maß wie die Überlebenden: Schultern, Gesicht und der
 * Umschlag der Mütze (der Rest passt nicht ins Fenster).
 */
export function mikaPortrait(spec = MIKA) {
  const bust = new VoxelModel();
  buildFineBustModel(spec).forEach((x, y, z, c) => {
    if (y >= 12 && y <= 24) bust.set(x, y, z, c);
  });
  return renderVoxelPortrait(bust, { size: 54, top: 1, w: 4, t: 1, f: 3 });
}

/** Alle Porträts: Mika, Radio und die Überlebenden (Meilenstein 6). */
export function renderPortraits() {
  return {
    mika: mikaPortrait(),
    radio: renderVoxelPortrait(buildRadioModel(), { top: 8 }),
    hilde: survivorPortrait('hilde'),
    juna: survivorPortrait('juna'),
    bert: survivorPortrait('bert'),
    yusuf: survivorPortrait('yusuf'),
    balduin: balduinPortrait(),
    knopf: dogPortrait(),
    ...Object.fromEntries(WANDERER_ORDER.map((id) => [id, portrait32(id)])), // M27: die Wanderer
  };
}
