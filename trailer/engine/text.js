// Pixel-Text in der Schrift des Spiels, beliebig groß (ganzzahlig), mit Kontur, Extrusion,
// Farbverlauf, Leuchten und Buchstaben-Animation.
//
// Ein Text wird einmal als kleines Bild gezeichnet (Q Teilpixel je Schriftpixel) und dann
// pixelscharf vergrößert. Kontur und Extrusion werden in Teilpixeln gerechnet (1/Q Schriftpixel),
// damit sie die 1-Pixel-Lücken der Schrift (S, M, O …) nicht zulaufen lassen.

import { drawText, measure, advance, GLYPH_ROWS } from './vendor/font.js';
import { C } from './palette.js';

const Q = 3;
const cache = new Map();

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

/** Maske (weißer Text) in einer Farbe oder einem Verlauf (von oben nach unten über die Versalhöhe). */
function tinted(mask, fill, rows) {
  const [c, g] = canvasOf(mask.width, mask.height);
  g.drawImage(mask, 0, 0);
  g.globalCompositeOperation = 'source-in';
  if (Array.isArray(fill)) {
    const gr = g.createLinearGradient(0, rows[0] * Q, 0, rows[1] * Q);
    gr.addColorStop(0, fill[0]);
    gr.addColorStop(1, fill[1]);
    g.fillStyle = gr;
  } else g.fillStyle = fill;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Kreisförmige Versätze bis Radius n (in Teilpixeln). */
function disc(n) {
  const out = [];
  for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) if (dx * dx + dy * dy <= n * n + n * 0.6) out.push([dx, dy]);
  return out;
}

/**
 * Sprite für einen Text. Maße in Schriftpixeln: pad (Rand), canvas ist Q-fach aufgelöst.
 * o: { color, outline, thick (Teilpixel), extrude (Teilpixel), extColor, gradient:[oben, unten] }
 */
export function sprite(text, o = {}) {
  const { color = C.text, outline = C.outline, thick = 1, extrude = 0, extColor = C.frameDark, gradient = null } = o;
  const key = JSON.stringify([text, color, outline, thick, extrude, extColor, gradient]);
  if (cache.has(key)) return cache.get(key);
  const pad = 2 + Math.ceil((thick + extrude) / Q);
  const w0 = measure(text) + pad * 2;
  const h0 = GLYPH_ROWS + pad * 2;
  const [base, bg] = canvasOf(w0, h0);
  drawText(bg, text, pad, pad, '#ffffff');
  const [mask, mg] = canvasOf(w0 * Q, h0 * Q);
  mg.drawImage(base, 0, 0, w0 * Q, h0 * Q);
  const [c, g] = canvasOf(w0 * Q, h0 * Q);
  const ext = [];
  for (let k = 1; k <= extrude; k++) ext.push([k, k], [k, k - 1], [k - 1, k]);
  if (outline && thick > 0) {
    const t = tinted(mask, outline);
    const seen = new Set();
    for (const [ux, uy] of [[0, 0], ...ext]) {
      for (const [dx, dy] of disc(thick)) {
        const k = `${ux + dx},${uy + dy}`;
        if (seen.has(k)) continue;
        seen.add(k);
        g.drawImage(t, ux + dx, uy + dy);
      }
    }
  }
  if (extrude) {
    const t = tinted(mask, extColor);
    for (const [dx, dy] of ext) g.drawImage(t, dx, dy);
  }
  g.drawImage(tinted(mask, gradient || color, [pad + 2, pad + 9]), 0, 0);
  const s = { canvas: c, w: w0, h: h0, pad };
  cache.set(key, s);
  return s;
}

const glowCache = new Map();
function glowSprite(text, style, scale, blur, color) {
  const key = JSON.stringify([text, style, scale, blur, color]);
  if (glowCache.has(key)) return glowCache.get(key);
  const s = sprite(text, { ...style, outline: null, thick: 0, extrude: 0 });
  const m = Math.ceil(blur * 3);
  const [c, g] = canvasOf(s.w * scale + m * 2, s.h * scale + m * 2);
  const [sil, sg] = canvasOf(s.canvas.width, s.canvas.height);
  sg.drawImage(s.canvas, 0, 0);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = color;
  sg.fillRect(0, 0, sil.width, sil.height);
  g.filter = `blur(${blur}px)`;
  g.imageSmoothingEnabled = false;
  g.drawImage(sil, m, m, s.w * scale, s.h * scale);
  const out = { canvas: c, m, w: c.width, h: c.height, pad: s.pad };
  glowCache.set(key, out);
  return out;
}

/** Breite in Bildpixeln. */
export const textWidth = (text, scale) => measure(text) * scale;

/**
 * Text zeichnen.
 * x,y: Ankerpunkt. align: 'left' | 'center' | 'right'. anchor: 'top' (Zeilenanfang) | 'cap' (Mitte der Versalien).
 * letters(i, n, ch) → { dx, dy, s, a } oder null (unsichtbar) für Buchstaben-Animation; tracking = Zusatzabstand
 * (Schriftpixel) zwischen Buchstaben nur in diesem Modus. glow: { color, blur, alpha, base }.
 */
export function drawPx(ctx, text, o = {}) {
  const { x = 0, y = 0, scale = 6, align = 'left', anchor = 'cap', alpha = 1, glow = null, letters = null, chars = null, tracking = 0, ...style } = o;
  if (chars !== null) text = text.slice(0, Math.max(0, Math.floor(chars)));
  if (!text) return;
  const nch = [...text].length;
  const wpx = (measure(text) + (letters ? (nch - 1) * tracking : 0)) * scale;
  let left = align === 'center' ? x - wpx / 2 : align === 'right' ? x - wpx : x;
  const top = anchor === 'cap' ? y - 5.5 * scale : y;
  left = Math.round(left);
  const topR = Math.round(top);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  if (glow && alpha > 0.01) {
    const base = glow.base || scale;
    const gs = glowSprite(text, style, base, glow.blur ?? 18, glow.color || C.gold);
    const k = scale / base;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * (glow.alpha ?? 0.7);
    ctx.drawImage(gs.canvas, left - (gs.pad * base + gs.m) * k, topR - (gs.pad * base + gs.m) * k, gs.w * k, gs.h * k);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
  }
  if (!letters) {
    const sp = sprite(text, style);
    ctx.drawImage(sp.canvas, left - sp.pad * scale, topR - sp.pad * scale, sp.w * scale, sp.h * scale);
  } else {
    let i = 0;
    for (const ch of text) {
      const prefix = (i === 0 ? 0 : measure(text.slice(0, i)) + 1) + i * tracking;
      const fx = letters(i, nch, ch);
      i++;
      if (!fx || ch === ' ') continue;
      const sp = sprite(ch, style);
      const cw = advance(ch) - 1;
      const s = (fx.s ?? 1) * scale;
      const cx = left + (prefix + cw / 2) * scale + (fx.dx || 0);
      const cy = topR + 5.5 * scale + (fx.dy || 0);
      ctx.globalAlpha = alpha * (fx.a ?? 1);
      ctx.drawImage(sp.canvas, Math.round(cx - (sp.pad + cw / 2) * s), Math.round(cy - (sp.pad + 5.5) * s), sp.w * s, sp.h * s);
    }
  }
  ctx.restore();
}
