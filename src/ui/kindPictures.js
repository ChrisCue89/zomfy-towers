// Bilder der Schlurferkunde (F3d): die Vorderansicht einer Art, gebacken mit demselben Bäcker wie
// die Sprites der Horde (entities/zombieSprites.js) – nur kleiner, damit jede Art neben die
// Beschreibung im Herbstbuch passt. Neue Größen werden gebacken, nie skaliert (CLAUDE.md): Große
// Arten backen mit einem kleineren Faktor, bis sie in die Höhe passen. Bekannte Arten stehen in
// Farbe da, unbekannte als Schattenriss, in dem nur das Eigenlicht glimmt (Augen, Pilzkappen).
// Ein Bild kostet 20 bis 150 ms – `pump` backt höchstens eines je Aufruf, gemerkt wird für immer.

import { bakeFrame } from '../entities/zombieSprites.js';
import { KINDS } from '../entities/zombieSpriteKinds.js';
import { KIND_PICTURE } from '../data/book.js';

export class KindPictures {
  constructor() {
    this.done = new Map(); // `${type}:${known}` -> { canvas, w, h, f, bakes }
    this.queue = [];
    this.baked = 0;
  }

  /** Das Bild oder null (dann wird es vorgemerkt und beim nächsten `pump` gebacken). */
  get(type, known) {
    const key = `${type}:${known ? 1 : 0}`;
    const pic = this.done.get(key);
    if (pic) return pic;
    if (!this.queue.includes(key)) this.queue.push(key);
    return null;
  }

  /** Gleich backen (Prüfung). */
  now(type, known) {
    const key = `${type}:${known ? 1 : 0}`;
    if (!this.done.has(key)) this.bake(key);
    return this.done.get(key);
  }

  /** Höchstens ein vorgemerktes Bild backen. */
  pump() {
    const key = this.queue.shift();
    if (key && !this.done.has(key)) this.bake(key);
  }

  bake(key) {
    const [type, known] = key.split(':');
    const H = KIND_PICTURE.h;
    // Erst schätzen (Größe der Art), passt es nicht, mit dem gemessenen Maß noch einmal
    let f = Math.min(1, H / (KIND_PICTURE.perSize * KINDS[type].size));
    let pic = null;
    let bakes = 0;
    for (let tries = 0; tries < 3; tries++) {
      const frame = bakeFrame(0, 'stehen', 0, type, f);
      bakes++;
      pic = this.crop(frame);
      if (pic.h <= H + 1) break;
      f *= H / pic.h;
    }
    const canvas = document.createElement('canvas');
    canvas.width = pic.w;
    canvas.height = pic.h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(pic.w, pic.h);
    const d = img.data;
    const silhouette = known !== '1';
    for (let i = 0; i < pic.w * pic.h; i++) {
      let c = pic.color[i];
      if (c === -2) c = KIND_PICTURE.shadow; // Schatten unter den Füßen
      else if (c >= 0 && silhouette && !pic.glow[i]) c = KIND_PICTURE.silhouette;
      if (c < 0) continue;
      d[i * 4] = (c >> 16) & 255;
      d[i * 4 + 1] = (c >> 8) & 255;
      d[i * 4 + 2] = c & 255;
      d[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.done.set(key, { canvas, w: pic.w, h: pic.h, f: +f.toFixed(3), bakes, silhouette });
    this.baked++;
  }

  /**
   * Auf die Figur zuschneiden: das Rechteck um alle festen Texel, darunter höchstens drei Reihen
   * Schatten (der fliegende Falter lässt seinen Schatten unten). Farbe -1 = leer, -2 = Schatten.
   */
  crop(frame) {
    const { w, h, color, glow, shadow } = frame;
    let x0 = w;
    let x1 = -1;
    let y0 = h;
    let y1 = -1;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (color[j * w + i] < 0) continue;
        if (i < x0) x0 = i;
        if (i > x1) x1 = i;
        if (j < y0) y0 = j;
        if (j > y1) y1 = j;
      }
    }
    if (x1 < 0) return { w: 1, h: 1, color: new Int32Array([-1]), glow: new Uint8Array(1) };
    let yb = y1;
    for (let j = y1 + 1; j < Math.min(h, y1 + 4); j++) {
      for (let i = x0; i <= x1; i++) if (shadow[j * w + i]) yb = j;
    }
    const cw = x1 - x0 + 1;
    const ch = yb - y0 + 1;
    const out = new Int32Array(cw * ch).fill(-1);
    const g = new Uint8Array(cw * ch);
    for (let j = 0; j < ch; j++) {
      for (let i = 0; i < cw; i++) {
        const s = (y0 + j) * w + x0 + i;
        const c = color[s];
        out[j * cw + i] = c >= 0 ? c : shadow[s] ? -2 : -1;
        g[j * cw + i] = glow[s];
      }
    }
    return { w: cw, h: ch, color: out, glow: g };
  }
}
