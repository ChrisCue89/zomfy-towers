// Die Oberflächen-Leinwand: ein 2D-Canvas in Spielauflösung, pixelgenau
// hochskaliert. Alles wird jedes Bild neu gezeichnet (Sofortmodus).

import { P, hexToCss } from '../render/palette.js';
import { drawText, measure, LINE_HEIGHT } from './font.js';
import { BAYER } from './bayer.js';

export const COLORS = {
  outline: hexToCss(P.n0),
  frame: hexToCss(P.e5),
  frameDark: hexToCss(P.e3),
  fill: hexToCss(P.d0),
  fillLight: hexToCss(P.d1),
  fillHover: hexToCss(P.d2),
  inset: hexToCss(P.n1),
  text: hexToCss(P.s9),
  textWarm: hexToCss(P.e9),
  textDim: hexToCss(P.s6),
  gold: hexToCss(P.f6),
  goldDark: hexToCss(P.f4),
  shadow: hexToCss(P.n0),
  night: hexToCss(P.n0),
  red: hexToCss(P.a0),
  green: hexToCss(P.a6),
  buildOk: hexToCss(P.g9),
  buildBad: hexToCss(P.f3),
};

export class UICanvas {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 1;
    this.height = 1;
    this.mouse = { x: -1, y: -1, clicked: false };
  }

  resize(width, height, scale, dpr) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${(width * scale) / dpr}px`;
    this.canvas.style.height = `${(height * scale) / dpr}px`;
    this.width = width;
    this.height = height;
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Mausdaten für dieses Bild übernehmen. */
  begin(mouse) {
    this.mouse = mouse;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** Pixel-Panel mit dunkler Kontur, Holzrahmen und Füllung; Ecken abgerundet. */
  panel(x, y, w, h, { fill = COLORS.fill, frame = COLORS.frame, highlight = COLORS.fillLight } = {}) {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    const c = this.ctx;
    c.fillStyle = COLORS.outline;
    c.fillRect(x + 2, y, w - 4, h);
    c.fillRect(x, y + 2, w, h - 4);
    c.fillRect(x + 1, y + 1, w - 2, h - 2);
    c.fillStyle = frame;
    c.fillRect(x + 2, y + 1, w - 4, h - 2);
    c.fillRect(x + 1, y + 2, w - 2, h - 4);
    c.fillStyle = fill;
    c.fillRect(x + 2, y + 2, w - 4, h - 4);
    if (highlight) {
      c.fillStyle = highlight;
      c.fillRect(x + 2, y + 2, w - 4, 1);
    }
    // Schatten unten rechts
    c.fillStyle = 'rgba(13, 11, 24, 0.55)';
    c.fillRect(x + 2, y + h, w - 2, 1);
  }

  /** Vertiefte Fläche (z. B. Porträtrahmen, Schnellleistenplatz). */
  inset(x, y, w, h, { fill = COLORS.inset, border = COLORS.frameDark } = {}) {
    const c = this.ctx;
    c.fillStyle = border;
    c.fillRect(x, y, w, h);
    c.fillStyle = fill;
    c.fillRect(x + 1, y + 1, w - 2, h - 2);
  }

  text(text, x, y, color = COLORS.text, options) {
    return drawText(this.ctx, text, x, y, color, options);
  }

  textCentered(text, cx, y, color = COLORS.text, options) {
    return drawText(this.ctx, text, Math.round(cx - measure(text) / 2), y, color, options);
  }

  hover(x, y, w, h) {
    const m = this.mouse;
    return m.inside && m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
  }

  /**
   * Knopf zeichnen. Gibt true zurück, wenn er in diesem Bild angeklickt wurde.
   * @param {boolean} focused per Tastatur ausgewählt
   */
  button(label, x, y, w, h, { focused = false, hoverHighlight = true } = {}) {
    const hovered = this.hover(x, y, w, h);
    const active = (hoverHighlight && hovered) || focused;
    this.panel(x, y, w, h, {
      fill: active ? COLORS.fillHover : COLORS.fill,
      frame: active ? COLORS.gold : COLORS.frame,
      highlight: active ? COLORS.fillLight : null,
    });
    this.textCentered(label, x + w / 2, y + Math.round((h - LINE_HEIGHT) / 2) - 1, active ? COLORS.gold : COLORS.text);
    return hovered && this.mouse.clicked;
  }

  /** Gerasterte Abdunklung über den ganzen Bildschirm (0..1). */
  ditherFill(amount, color = COLORS.night) {
    if (amount <= 0) return;
    const c = this.ctx;
    c.fillStyle = color;
    if (amount >= 1) {
      c.fillRect(0, 0, this.width, this.height);
      return;
    }
    // 4×4-Muster als Kachel
    const pattern = this.patternFor(amount, color);
    c.fillStyle = pattern;
    c.fillRect(0, 0, this.width, this.height);
  }

  /** Gerasterte Abdunklung eines Rechtecks. */
  ditherRect(x, y, w, h, amount, color = COLORS.night) {
    if (amount <= 0) return;
    this.ctx.fillStyle = this.patternFor(amount, color);
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** Umriss eines Rechtecks (1 px). */
  frame(x, y, w, h, color) {
    const c = this.ctx;
    c.fillStyle = color;
    c.fillRect(x, y, w, 1);
    c.fillRect(x, y + h - 1, w, 1);
    c.fillRect(x, y, 1, h);
    c.fillRect(x + w - 1, y, 1, h);
  }

  patternFor(amount, color) {
    const level = Math.max(0, Math.min(16, Math.round(amount * 16)));
    const key = `${level}|${color}`;
    this.patterns = this.patterns || new Map();
    if (!this.patterns.has(key)) {
      const tile = document.createElement('canvas');
      tile.width = 4;
      tile.height = 4;
      const t = tile.getContext('2d');
      t.fillStyle = color;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (BAYER[y * 4 + x] < level) t.fillRect(x, y, 1, 1);
      this.patterns.set(key, this.ctx.createPattern(tile, 'repeat'));
    }
    return this.patterns.get(key);
  }
}
