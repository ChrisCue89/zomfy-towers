// PNG und Leinwand für die Bögen (ohne Abhängigkeiten): RGB-Bild schreiben, Sprites setzen.

import { deflateSync } from 'node:zlib';
import { Buffer } from 'node:buffer';

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** RGB-Bytes (w × h × 3) als PNG. */
export function encodePng(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Eine einfache Leinwand. */
export class Canvas {
  constructor(w, h, bg) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 3);
    this.fill(0, 0, w, h, bg);
  }
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = (c >> 16) & 255;
    this.px[i + 1] = (c >> 8) & 255;
    this.px[i + 2] = c & 255;
  }
  fill(x0, y0, w, h, c) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c);
  }
  /**
   * Ein gebackenes Bild (color, shadow) setzen: Fußpunkt (px, py) des Bildes auf (fx, fy) der
   * Leinwand, `zoom` Pixel je Texel. `only` (Maske) setzt nur diese Texel (Flicken).
   */
  frame(f, fx, fy, zoom, { shadowColor = null, only = null, color = null } = {}) {
    const col = color || f.color;
    for (let j = 0; j < f.h; j++) {
      for (let i = 0; i < f.w; i++) {
        const k = j * f.w + i;
        if (only && !only[k]) continue;
        const c = col[k];
        const v = c >= 0 ? c : shadowColor !== null && f.shadow && f.shadow[k] ? shadowColor : -1;
        if (v < 0) continue;
        const x0 = fx + (i - f.px) * zoom;
        const y0 = fy + (j - f.py) * zoom;
        for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) this.set(x0 + dx, y0 + dy, v);
      }
    }
  }
}
