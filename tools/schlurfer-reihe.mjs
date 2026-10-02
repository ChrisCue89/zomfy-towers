// Aufstellung aller Arten (F-Design): jede Art von vorn (stehend), schräg und von der Seite
// (gehend) in Spielgröße (2 × 2 Pixel je Texel), oben am Tag auf dem Kies der Wege, unten in der
// Nacht (nur das Eigenlicht leuchtet). Für den Blick auf Umriss, Farbe und Lesbarkeit im Pulk.
//
//   node tools/schlurfer-reihe.mjs [datei.png]

import { deflateSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { bakeFrame, SPRITE_TYPES } from '../src/entities/zombieSprites.js';
import { RAMPS } from '../src/render/palette.js';

const out = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'schlurfer-reihe.png';
const Z = 2;

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
function encodePng(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Nachtfarbe: dunkel und kühl, Glühendes bleibt hell. */
function night(c) {
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  return (Math.round(r * 0.22) << 16) | (Math.round(g * 0.26) << 8) | Math.round(b * 0.42 + 8);
}

const frames = SPRITE_TYPES.map((t) => [bakeFrame(0, 'stehen', 0, t), bakeFrame(1, 'gehen', 1, t), bakeFrame(2, 'gehen', 3, t)]);
// Jede Figur auf ihren Rahmen zuschneiden, dann nebeneinander auf eine gemeinsame Fußlinie
const boxes = frames.map((fs) =>
  fs.map((f) => {
    let x0 = f.w;
    let x1 = 0;
    let y0 = f.h;
    for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) if (f.color[j * f.w + i] >= 0) (x0 = Math.min(x0, i)), (x1 = Math.max(x1, i)), (y0 = Math.min(y0, j));
    return { f, x0, x1, y0 };
  }),
);
const gap = 6;
const top = Math.max(...boxes.flat().map((b) => b.f.py - b.y0)) + 6;
const bottom = 30;
const rowH = (top + bottom) * Z;
let W = gap * Z;
for (const bs of boxes) for (const b of bs) W += (b.x1 - b.x0 + 1 + gap) * Z;
W += gap * Z * SPRITE_TYPES.length;
const H = rowH * 2;
const px = Buffer.alloc(W * H * 3);
const set = (x, y, c) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = (c >> 16) & 255;
  px[i + 1] = (c >> 8) & 255;
  px[i + 2] = c & 255;
};
// Hintergrund: Kies des Wegs am Tag, die Nacht darunter
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const n = ((x >> 1) * 73 + (y >> 1) * 151) % 17;
    const day = n < 3 ? RAMPS.e[5] : n < 6 ? RAMPS.s[5] : RAMPS.e[6];
    set(x, y, y < rowH ? day : night(n < 5 ? RAMPS.e[4] : RAMPS.e[5]));
  }
}
for (const [row, fn] of [[0, (c) => c], [1, night]]) {
  let x = gap * Z;
  for (const bs of boxes) {
    for (const { f, x0, x1 } of bs) {
      const base = row * rowH + top * Z;
      for (let j = 0; j < f.h; j++) {
        for (let i = x0; i <= x1; i++) {
          const k = j * f.w + i;
          const c = f.color[k];
          let col = c >= 0 ? (f.glow[k] ? c : fn(c)) : f.shadow[k] ? (row ? 0x05060d : 0x5a4a38) : -1;
          if (col < 0) continue;
          for (let dy = 0; dy < Z; dy++) for (let dx = 0; dx < Z; dx++) set(x + (i - x0) * Z + dx, base + (j - f.py) * Z + dy, col);
        }
      }
      x += (x1 - x0 + 1 + gap) * Z;
    }
    x += gap * Z;
  }
}
writeFileSync(out, encodePng(W, H, px));
console.log(`${out}: ${W} × ${H}, ${SPRITE_TYPES.length} Arten`);
