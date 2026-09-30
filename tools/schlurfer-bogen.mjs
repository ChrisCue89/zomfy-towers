// Musterbogen der Schlurfer-Sprites (F-Design): backt die Bilder ohne Browser (der Bäcker ist
// reines JavaScript) und schreibt ein PNG zum Ansehen – alle acht Richtungen, der Gang, Treffer
// und Fallen, dazu eine Reihe in Spielgröße. Nichts davon läuft im Spiel.
//
//   node tools/schlurfer-bogen.mjs [datei.png] [--art=schlurfer] [--zoom=3]

import { deflateSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { bakeFrame, ANIMS, DIRS, SPRITE_TYPES } from '../src/entities/zombieSprites.js';
import { RAMPS } from '../src/render/palette.js';

const args = process.argv.slice(2);
const opt = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const out = args.find((a) => !a.startsWith('--')) || 'schlurfer-bogen.png';
const ZOOM = Number(opt('zoom', 3));
const ART = opt('art', 'schlurfer');
if (!SPRITE_TYPES.includes(ART)) throw new Error(`Unbekannte Art ${ART} (bekannt: ${SPRITE_TYPES.join(', ')})`);

// --- PNG ohne Abhängigkeiten ------------------------------------------------------------------
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
  ihdr[9] = 2; // RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// --- Leinwand ---------------------------------------------------------------------------------
class Canvas {
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
  /** Ein Bild aus dem Bäcker, `zoom` Pixel je Texel, gespiegelt mit `flip`. */
  sprite(f, x0, y0, zoom, flip = false, shadowColor = null) {
    for (let j = 0; j < f.h; j++) {
      for (let i = 0; i < f.w; i++) {
        const si = flip ? f.w - 1 - i : i;
        const c = f.color[j * f.w + si];
        const col = c >= 0 ? c : shadowColor !== null && f.shadow[j * f.w + si] ? shadowColor : -1;
        if (col < 0) continue;
        for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) this.set(x0 + i * zoom + dx, y0 + j * zoom + dy, col);
      }
    }
  }
}

// --- Bogen ------------------------------------------------------------------------------------
const GRASS = RAMPS.g[4];
const GRASS_DARK = RAMPS.g[3];
const PAPER = 0xe8e0cc;
const NAMES = ['S', 'SO', 'O', 'NO', 'N', 'NW', 'W', 'SW'];
const t0 = performance.now();
let baked = 0;
const cache = new Map();
function frame(d, anim, k) {
  const key = `${d}:${anim}:${k}`;
  if (!cache.has(key)) {
    cache.set(key, bakeFrame(d, anim, k, ART));
    baked++;
  }
  return cache.get(key);
}
/** Richtung 0–7 → gezeichnete Richtung und Spiegel (W, NW, SW sind Spiegel von O, NO, SO). */
const drawn = (dir) => (dir <= 4 ? { d: dir, flip: false } : { d: 8 - dir, flip: true });

const probe = frame(0, 'stehen', 0);
const cw = probe.w * ZOOM;
const ch = probe.h * ZOOM;
const gap = 8;
const rows = [
  { label: 'stehen', cells: NAMES.map((_, dir) => ({ dir, anim: 'stehen', k: 0 })) },
  { label: 'gehen S', cells: Array.from({ length: ANIMS.gehen }, (_, k) => ({ dir: 0, anim: 'gehen', k })) },
  { label: 'gehen O', cells: Array.from({ length: ANIMS.gehen }, (_, k) => ({ dir: 2, anim: 'gehen', k })) },
  {
    label: 'ausholen, schlag',
    cells: [0, 2].flatMap((dir) => [{ dir, anim: 'ausholen', k: 0 }, ...Array.from({ length: ANIMS.schlag }, (_, k) => ({ dir, anim: 'schlag', k }))]),
  },
  { label: 'treffer, fallen', cells: [{ dir: 1, anim: 'treffer', k: 0 }, ...Array.from({ length: ANIMS.fallen }, (_, k) => ({ dir: 1, anim: 'fallen', k }))] },
];
const cols = Math.max(...rows.map((r) => r.cells.length));
// Unten eine Reihe in Spielgröße (2 × 2 Pixel je Texel) auf Gras, dicht wie ein Pulk
const pulkH = probe.h * 2 + 16;
const W = cols * (cw + gap) + gap;
const H = rows.length * (ch + gap) + gap + pulkH;
const cv = new Canvas(W, H, PAPER);
rows.forEach((row, r) => {
  row.cells.forEach((c, n) => {
    const { d, flip } = drawn(c.dir);
    const x = gap + n * (cw + gap);
    const y = gap + r * (ch + gap);
    cv.fill(x, y, cw, ch, (n + r) % 2 ? GRASS : GRASS_DARK);
    cv.sprite(frame(d, c.anim, c.k), x, y, ZOOM, flip, 0x1f4226);
  });
});
const py = rows.length * (ch + gap) + gap;
cv.fill(0, py, W, pulkH, GRASS);
for (let n = 0; n < 24; n++) {
  const dir = [0, 1, 7, 0, 2, 6, 1, 0][n % 8];
  const { d, flip } = drawn(dir);
  const f = frame(d, 'gehen', n % ANIMS.gehen);
  cv.sprite(f, 12 + n * (probe.w * 2 - 90), py + 8 + (n % 3) * 6, 2, flip, 0x1f4226);
}
writeFileSync(out, encodePng(W, H, cv.px));
console.log(`${out}: ${W} × ${H}, ${baked} Bilder in ${Math.round(performance.now() - t0)} ms (${DIRS} Richtungen gezeichnet)`);
