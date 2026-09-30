// Sprite-Atlas (F1): gebackene Bilder als zwei Datentexturen – Farbe (sRGB-Palettenwerte,
// Alpha: 255 Figur, 128 Glühen, 64 Schatten) und Weltnormale (xyz · 0,5 + 0,5). Kein Canvas,
// kein Auslesen der GPU; die Daten bleiben im Speicher (nach einem Kontextverlust neu
// hochladbar). Bilder werden auf ihren Rahmen zugeschnitten und in Regale gepackt.

import * as THREE from 'three';

export const ALPHA = { solid: 255, glow: 128, shadow: 64 };

export class SpriteAtlas {
  constructor(size = 1024) {
    this.size = size;
    this.color = new Uint8Array(size * size * 4);
    this.normal = new Uint8Array(size * size * 4);
    const make = (data) => {
      const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      t.flipY = false;
      t.needsUpdate = true;
      return t;
    };
    this.colorTexture = make(this.color);
    this.normalTexture = make(this.normal);
    this.frames = new Map(); // Schlüssel -> { x, y, w, h, px, py } (Texel, y von unten)
    this.shelfX = 0;
    this.shelfY = 0;
    this.shelfH = 0;
    this.dirty = false;
  }

  /**
   * Ein gebackenes Bild aufnehmen (aus zombieSprites.bakeFrame): zuschneiden, packen, kopieren.
   * `px`/`py` sind der Fußpunkt (py von oben); im Atlas liegt Zeile 0 unten.
   */
  add(key, frame) {
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
    if (x1 < 0) {
      this.frames.set(key, { x: 0, y: 0, w: 1, h: 1, px: 0, py: 0 });
      return;
    }
    // Den Fußpunkt immer im Rahmen behalten (sonst verschöbe das Zuschneiden die Figur)
    x0 = Math.min(x0, frame.px);
    x1 = Math.max(x1, frame.px);
    y1 = Math.max(y1, Math.min(h - 1, frame.py));
    const cw = x1 - x0 + 1;
    const ch = y1 - y0 + 1;
    if (this.shelfX + cw > this.size) {
      this.shelfX = 0;
      this.shelfY += this.shelfH + 1;
      this.shelfH = 0;
    }
    if (this.shelfY + ch > this.size) throw new Error('Sprite-Atlas voll');
    const ax = this.shelfX;
    const ay = this.shelfY;
    this.shelfX += cw + 1;
    this.shelfH = Math.max(this.shelfH, ch);
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const k = j * w + i;
        const tx = ax + (i - x0);
        const ty = ay + (y1 - j); // Zeile 0 unten
        const o = (ty * this.size + tx) * 4;
        const c = color[k];
        if (c >= 0) {
          this.color[o] = (c >> 16) & 255;
          this.color[o + 1] = (c >> 8) & 255;
          this.color[o + 2] = c & 255;
          this.color[o + 3] = glow[k] ? ALPHA.glow : ALPHA.solid;
          this.normal[o] = Math.round((normal[k * 3] * 0.5 + 0.5) * 255);
          this.normal[o + 1] = Math.round((normal[k * 3 + 1] * 0.5 + 0.5) * 255);
          this.normal[o + 2] = Math.round((normal[k * 3 + 2] * 0.5 + 0.5) * 255);
          this.normal[o + 3] = 255;
        } else if (shadow && shadow[k]) {
          this.color[o + 3] = ALPHA.shadow;
        }
      }
    }
    // Fußpunkt im zugeschnittenen Bild (Texelkanten): x ab links, y ab unten. Er liegt auf der
    // Oberkante der Zeile `py` (von oben gezählt) – ab unten also bei y1 − py + 1.
    this.frames.set(key, { x: ax, y: ay, w: cw, h: ch, px: frame.px - x0, py: y1 - frame.py + 1 });
    this.dirty = true;
  }

  /** Nach dem Backen: die Texturen neu hochladen (einmal je Bild genügt). */
  upload() {
    if (!this.dirty) return;
    this.colorTexture.needsUpdate = true;
    this.normalTexture.needsUpdate = true;
    this.dirty = false;
  }
}
