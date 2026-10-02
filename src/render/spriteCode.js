// Kodierung der Sprite-Bilder für den Atlas (F2), ohne three.js – der Worker nutzt sie auch.
// Je Texel vier Bytes: Farbe als Index in die Palette (die Bilder kennen nur Palettenfarben),
// Art des Texels, die Normale in der Bildebene (x rechts, y oben in der Neigung der Kamera; die
// dritte Achse zeigt immer zur Kamera und wird im Shader zurückgerechnet).

import { PALETTE, hexToRgb, nearestPaletteIndex } from './palette.js';

/** Art eines Texels (zweites Byte). */
export const CODE = { empty: 0, shadow: 1, solid: 2, glow: 3 };

/** Achsen der Bildebene: oben (in der Neigung der Kamera) und zur Kamera. */
const UP = [0, 0.8, -0.6];
const TOWARD = [0, 0.6, 0.8];

const INDEX = new Map(PALETTE.map((c, i) => [c, i]));

/** Index einer Farbe in der Palette (eine fremde Farbe bekommt die nächste). */
export function paletteIndex(c) {
  const i = INDEX.get(c);
  if (i !== undefined) return i;
  const [r, g, b] = hexToRgb(c);
  const n = nearestPaletteIndex(r, g, b);
  INDEX.set(c, n);
  return n;
}

const byte = (v) => Math.round((Math.max(-1, Math.min(1, v)) * 0.5 + 0.5) * 255);

/**
 * Ein gebackenes Bild (zombieSprites.bakeFrame) auf seinen Rahmen zuschneiden und kodieren.
 * Zeile 0 liegt unten. `px`/`py` ist der Fußpunkt im zugeschnittenen Bild (Texelkanten, y ab
 * unten); ein leeres Bild hat w = h = 0.
 * @returns {{w:number, h:number, px:number, py:number, bytes:Uint8Array, solid:number, glow:number}}
 */
export function encodeFrame(frame) {
  const { w, h, color, glow, normal, shadow } = frame;
  let x0 = w;
  let x1 = -1;
  let y0 = h;
  let y1 = -1;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      if (color[k] < 0 && !(shadow && shadow[k])) continue;
      if (i < x0) x0 = i;
      if (i > x1) x1 = i;
      if (j < y0) y0 = j;
      if (j > y1) y1 = j;
    }
  }
  if (x1 < 0) return { w: 0, h: 0, px: 0, py: 0, bytes: new Uint8Array(0), solid: 0, glow: 0 };
  // Den Fußpunkt immer im Rahmen behalten (sonst verschöbe das Zuschneiden die Figur)
  x0 = Math.min(x0, frame.px);
  x1 = Math.max(x1, frame.px);
  y1 = Math.max(y1, Math.min(h - 1, frame.py));
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const bytes = new Uint8Array(cw * ch * 4);
  let solid = 0;
  let glowing = 0;
  for (let j = y0; j <= y1; j++) {
    for (let i = x0; i <= x1; i++) {
      const k = j * w + i;
      const o = ((y1 - j) * cw + (i - x0)) * 4;
      const c = color[k];
      if (c >= 0) {
        const ny = normal[k * 3 + 1];
        const nz = normal[k * 3 + 2];
        bytes[o] = paletteIndex(c);
        bytes[o + 1] = glow[k] ? CODE.glow : CODE.solid;
        bytes[o + 2] = byte(normal[k * 3]);
        bytes[o + 3] = byte(ny * UP[1] + nz * UP[2]);
        solid++;
        if (glow[k]) glowing++;
      } else if (shadow && shadow[k]) {
        bytes[o + 1] = CODE.shadow;
      }
    }
  }
  // Der Fußpunkt liegt auf der Oberkante der Zeile `py` (von oben) – ab unten bei y1 − py + 1
  return { w: cw, h: ch, px: frame.px - x0, py: y1 - frame.py + 1, bytes, solid, glow: glowing };
}

/** Die Normale aus den Bytes zurückrechnen (für Prüfungen; der Shader rechnet genauso). */
export function decodeNormal(bx, by) {
  const x = (bx / 255) * 2 - 1;
  const y = (by / 255) * 2 - 1;
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  return [x, y * UP[1] + z * TOWARD[1], y * UP[2] + z * TOWARD[2]];
}

/**
 * F4: Einen Flicken kodieren – nur die Texel, die `mask` markiert (ein Gesicht in einem anderen
 * Ausdruck), zugeschnitten auf ihr Rechteck. Der Fußpunkt bleibt der des ganzen Bildes und darf
 * außerhalb des Rechtecks liegen (meist darunter); `color`/`glow` sind die Farben des Flickens,
 * die Normalen kommen aus dem Bild. Ohne markierte Texel: w = h = 0.
 */
export function encodePatch(frame, mask, color, glow) {
  const { w, h, normal } = frame;
  let x0 = w;
  let x1 = -1;
  let y0 = h;
  let y1 = -1;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      if (!mask[k] || color[k] < 0) continue;
      if (i < x0) x0 = i;
      if (i > x1) x1 = i;
      if (j < y0) y0 = j;
      if (j > y1) y1 = j;
    }
  }
  if (x1 < 0) return { w: 0, h: 0, px: 0, py: 0, bytes: new Uint8Array(0), solid: 0, glow: 0 };
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const bytes = new Uint8Array(cw * ch * 4);
  let solid = 0;
  let glowing = 0;
  for (let j = y0; j <= y1; j++) {
    for (let i = x0; i <= x1; i++) {
      const k = j * w + i;
      if (!mask[k] || color[k] < 0) continue;
      const o = ((y1 - j) * cw + (i - x0)) * 4;
      const ny = normal[k * 3 + 1];
      const nz = normal[k * 3 + 2];
      bytes[o] = paletteIndex(color[k]);
      bytes[o + 1] = glow[k] ? CODE.glow : CODE.solid;
      bytes[o + 2] = byte(normal[k * 3]);
      bytes[o + 3] = byte(ny * UP[1] + nz * UP[2]);
      solid++;
      if (glow[k]) glowing++;
    }
  }
  return { w: cw, h: ch, px: frame.px - x0, py: y1 - frame.py + 1, bytes, solid, glow: glowing };
}
