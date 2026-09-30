// Sprite-Atlas (F1, seit F2 mit Seiten): gebackene Bilder als eine Array-Textur aus Seiten von
// 1024 × 1024 Texeln, je Texel vier Bytes (spriteCode.js: Palettenindex, Art, Normale in der
// Bildebene) – halb so viel Speicher wie Farbe und Normale als zwei Texturen; alle Arten
// zusammen brauchen rund 7 Mio. Texel. Kein Canvas, kein Auslesen der GPU; die Daten bleiben im
// Speicher. Die Bilder einer Art kommen zusammen und werden nach Höhe sortiert in Regale gepackt;
// ist eine Seite voll, beginnt die nächste. Reichen die Seiten nicht, entsteht eine größere Textur
// (einmal ganz hochladen), danach lädt three.js nur geänderte Seiten.

import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { CODE } from './spriteCode.js';

export class SpriteAtlas {
  /**
   * @param {number} size Kantenlänge einer Seite (Texel)
   * @param {number} maxPages höchstens so viele Seiten (danach wirft add)
   */
  constructor(size = 1024, maxPages = 16) {
    this.size = size;
    this.maxPages = maxPages;
    this.pages = 0;
    this.data = new Uint8Array(0);
    this.texture = null;
    this.fresh = true;
    // Die Materialien lesen die Textur über diese Uniform – wächst der Atlas, zeigt sie auf die neue
    this.uniform = { value: null };
    // Farbtafel: die Palette, fest (die Bilder kennen nur Palettenfarben)
    this.palette = new Uint8Array(256 * 4);
    PALETTE.forEach((c, i) => {
      this.palette.set([(c >> 16) & 255, (c >> 8) & 255, c & 255, 255], i * 4);
    });
    this.paletteTexture = new THREE.DataTexture(this.palette, 256, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.paletteTexture.magFilter = THREE.NearestFilter;
    this.paletteTexture.minFilter = THREE.NearestFilter;
    this.paletteTexture.generateMipmaps = false;
    this.paletteTexture.needsUpdate = true;
    this.frames = new Map(); // Schlüssel -> { x, y, w, h, px, py, page, solid, glow } (Texel, y von unten)
    this.shelfX = 0;
    this.shelfY = 0;
    this.shelfH = 0;
    this.page = -1;
    this.dirtyPages = new Set();
    this.grow(2);
  }

  /** Platz für `pages` Seiten schaffen: neue Textur, alte Daten übernehmen. */
  grow(pages) {
    const n = Math.min(this.maxPages, pages);
    if (n <= this.pages) return false;
    const data = new Uint8Array(this.size * this.size * 4 * n);
    data.set(this.data);
    this.data = data;
    this.pages = n;
    this.texture?.dispose();
    const t = new THREE.DataArrayTexture(data, this.size, this.size, n);
    t.format = THREE.RGBAFormat;
    t.type = THREE.UnsignedByteType;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.flipY = false;
    t.unpackAlignment = 1;
    t.needsUpdate = true; // die neue Textur lädt alle Seiten
    // Bis three.js sie einmal ganz hochgeladen hat, keine einzelnen Seiten anmelden (sonst lüde es
    // nur diese, und die übernommenen Seiten blieben leer)
    this.fresh = true;
    t.onUpdate = () => {
      this.fresh = false;
    };
    this.texture = t;
    this.uniform.value = t;
    this.dirtyPages.clear();
    return true;
  }

  /** Platz für ein Bild der Größe w × h: im Regal, sonst im nächsten Regal, sonst auf der nächsten Seite. */
  place(w, h) {
    if (w > this.size || h > this.size) throw new Error('Sprite zu groß für den Atlas');
    if (this.page < 0 || this.shelfX + w > this.size) {
      this.shelfX = 0;
      this.shelfY += this.shelfH + 1;
      this.shelfH = 0;
    }
    if (this.page < 0 || this.shelfY + h > this.size) {
      if (this.page + 1 >= this.pages && !this.grow(this.pages + 2)) throw new Error('Sprite-Atlas voll');
      this.page++;
      this.shelfX = 0;
      this.shelfY = 0;
      this.shelfH = 0;
    }
    const at = { x: this.shelfX, y: this.shelfY, page: this.page };
    this.shelfX += w + 1;
    this.shelfH = Math.max(this.shelfH, h);
    return at;
  }

  /**
   * Die Bilder einer Art aufnehmen (kodiert mit spriteCode.encodeFrame): nach Höhe sortiert in
   * ein neues Regal packen und kopieren. Wirft, wenn der Atlas voll ist (dann bleibt die Art weg).
   * @param {Array<[string, {w, h, px, py, bytes, solid, glow}]>} entries
   */
  addAll(entries) {
    const list = [...entries].sort((a, b) => b[1].h - a[1].h);
    // ein neues Regal: die Höhen der vorigen Art passen selten zu diesen
    if (this.page >= 0 && this.shelfX > 0) {
      this.shelfX = this.size;
    }
    const S = this.size;
    for (const [key, e] of list) {
      if (!e.w) {
        this.frames.set(key, { x: 0, y: 0, w: 0, h: 0, px: 0, py: 0, page: 0, solid: 0, glow: 0 });
        continue;
      }
      const at = this.place(e.w, e.h);
      const base = at.page * S * S * 4;
      for (let r = 0; r < e.h; r++) this.data.set(e.bytes.subarray(r * e.w * 4, (r + 1) * e.w * 4), base + ((at.y + r) * S + at.x) * 4);
      this.frames.set(key, { x: at.x, y: at.y, w: e.w, h: e.h, px: e.px, py: e.py, page: at.page, solid: e.solid, glow: e.glow });
      this.dirtyPages.add(at.page);
    }
    this.upload();
  }

  /** Geänderte Seiten zum Hochladen anmelden (three.js lädt sie vor dem nächsten Zeichnen). */
  upload() {
    if (!this.dirtyPages.size) return;
    // Eine frische Textur lädt ohnehin alles; sonst nur die geänderten Seiten
    if (!this.fresh) for (const p of this.dirtyPages) this.texture.addLayerUpdate(p);
    this.texture.needsUpdate = true;
    this.dirtyPages.clear();
  }

  /** Prüfung und Bögen: ein Texel eines Bildes als [r, g, b, Art] (x ab links, y ab unten). */
  texel(f, x, y) {
    const o = f.page * this.size * this.size * 4 + ((f.y + y) * this.size + f.x + x) * 4;
    const code = this.data[o + 1];
    if (code === CODE.empty || code === CODE.shadow) return [0, 0, 0, code];
    const i = this.data[o] * 4;
    return [this.palette[i], this.palette[i + 1], this.palette[i + 2], code];
  }

  /** Belegung: Seiten, genutzte Texel (Rahmen) und Speicher. */
  info() {
    let used = 0;
    for (const f of this.frames.values()) used += f.w * f.h;
    return { pages: this.pages, page: this.page, used, mb: +(this.data.length / 1048576).toFixed(1) };
  }
}
