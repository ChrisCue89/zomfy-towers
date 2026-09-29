// Bildeffekte: Blende im Raster (wie im Spiel), Vignette, Bloom, Farbgebung, Partikel.

import { BAYER } from './vendor/bayer.js';
import { W, H, clamp, rnd, lerp, smooth } from './util.js';
import { C, LEAVES } from './palette.js';

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  return [c, g];
}
const [tmp, tmpG] = mk(W, H);
const [tmp2, tmp2G] = mk(W, H);
const [maskC, maskG] = mk(W / 3, H / 3);
const maskData = maskG.createImageData(W / 3, H / 3);

/**
 * Gerasterte Blende (die Blende des Spiels: 4×4-Bayer, Rasterzelle = 3 Bildpixel).
 * draw(g) zeichnet die neue Ebene; sie wird nur dort sichtbar, wo der Raster-Schwellwert unter
 * `progress` liegt. mode: 'fade' | 'right' | 'left' | 'up' | 'down' (laufende Kante).
 */
export function ditherReveal(ctx, draw, progress, mode = 'fade') {
  progress = clamp(progress);
  if (progress <= 0) return;
  if (progress >= 1) {
    draw(ctx);
    return;
  }
  const w = W / 3;
  const h = H / 3;
  const d = maskData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const thr = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      let pos = 0;
      if (mode === 'right') pos = x / w;
      else if (mode === 'left') pos = 1 - x / w;
      else if (mode === 'down') pos = y / h;
      else if (mode === 'up') pos = 1 - y / h;
      const t = mode === 'fade' ? thr : thr * 0.35 + pos * 0.65;
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = progress * 1.001 > t ? 255 : 0;
    }
  }
  maskG.putImageData(maskData, 0, 0);
  tmpG.globalCompositeOperation = 'source-over';
  tmpG.clearRect(0, 0, W, H);
  draw(tmpG);
  tmpG.globalCompositeOperation = 'destination-in';
  tmpG.imageSmoothingEnabled = false;
  tmpG.drawImage(maskC, 0, 0, W, H);
  tmpG.globalCompositeOperation = 'source-over';
  ctx.drawImage(tmp, 0, 0);
}

/** Vollfläche im Raster einfärben (Ab-/Aufblenden wie im Spiel: ditherFill). */
export function ditherFill(ctx, color, amount) {
  ditherReveal(ctx, (g) => {
    g.fillStyle = color;
    g.fillRect(0, 0, W, H);
  }, amount);
}

// --- Vignette und Farbgebung
const vign = new Map();
export function vignette(ctx, strength = 0.5, inner = 0.55) {
  if (strength <= 0) return;
  const key = `${strength.toFixed(2)}|${inner}`;
  if (!vign.has(key)) {
    const [c, g] = mk(W, H);
    const r = Math.hypot(W, H) / 2;
    const gr = g.createRadialGradient(W / 2, H / 2, r * inner, W / 2, H / 2, r);
    gr.addColorStop(0, 'rgba(6,4,14,0)');
    gr.addColorStop(1, `rgba(6,4,14,${strength})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    vign.set(key, c);
  }
  ctx.drawImage(vign.get(key), 0, 0);
}

/**
 * Farbgebung: { sat, contrast, bright, tints: [[farbe, alpha, modus], …] }.
 * Sättigung/Kontrast/Helligkeit über einen Filterdurchlauf, Tönungen als Überlagerung.
 */
export function grade(ctx, g) {
  if (!g) return;
  const sat = g.sat ?? 1;
  const con = g.contrast ?? 1;
  const bri = g.bright ?? 1;
  if (sat !== 1 || con !== 1 || bri !== 1) {
    tmp2G.globalCompositeOperation = 'source-over';
    tmp2G.clearRect(0, 0, W, H);
    tmp2G.drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'copy';
    ctx.filter = `saturate(${sat}) contrast(${con}) brightness(${bri})`;
    ctx.drawImage(tmp2, 0, 0);
    ctx.restore();
  }
  for (const [color, alpha, mode] of g.tints || []) {
    ctx.save();
    ctx.globalCompositeOperation = mode || 'soft-light';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/** Leuchten heller Flächen (warme Fenster, Feuer, Laternen). */
const [bloomSmall, bloomSmallG] = mk(W / 4, H / 4);
const [bloomBlur, bloomBlurG] = mk(W / 4, H / 4);
export function bloom(ctx, strength = 0.3, blur = 5, thresh = 1.35) {
  if (strength <= 0) return;
  bloomSmallG.imageSmoothingEnabled = true;
  bloomSmallG.clearRect(0, 0, W / 4, H / 4);
  bloomSmallG.drawImage(ctx.canvas, 0, 0, W / 4, H / 4);
  bloomBlurG.clearRect(0, 0, W / 4, H / 4);
  bloomBlurG.filter = `brightness(${thresh}) contrast(1.9) saturate(1.2) blur(${blur}px)`;
  bloomBlurG.drawImage(bloomSmall, 0, 0);
  bloomBlurG.filter = 'none';
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = strength;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bloomBlur, 0, 0, W, H);
  ctx.restore();
}

export function flash(ctx, alpha, color = '#fff6d8') {
  if (alpha <= 0.003) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Dunkler Verlauf von unten (für Untertitel) oder oben. */
export function scrim(ctx, alpha, from = 'bottom', size = 0.42) {
  if (alpha <= 0.003) return;
  const gr = from === 'bottom' ? ctx.createLinearGradient(0, H, 0, H * (1 - size)) : ctx.createLinearGradient(0, 0, 0, H * size);
  gr.addColorStop(0, `rgba(8,6,18,${0.78 * alpha})`);
  gr.addColorStop(1, 'rgba(8,6,18,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, from === 'bottom' ? H * (1 - size) : 0, W, H * size);
}

export function letterbox(ctx, amount, ratio = 2.39) {
  if (amount <= 0) return;
  const target = (H - W / ratio) / 2;
  const bar = Math.round(target * amount);
  ctx.fillStyle = '#05040c';
  ctx.fillRect(0, 0, W, bar);
  ctx.fillRect(0, H - bar, W, bar);
}

/** Bildwackeln in ganzen Pixeln aus einer Liste [zeit, stärke] (klingt ab). */
export function shakeAt(t, hits, decay = 9) {
  let ax = 0;
  let ay = 0;
  for (const [t0, amp] of hits) {
    if (t < t0 || t > t0 + 1.2) continue;
    const k = amp * Math.exp(-(t - t0) * decay);
    const n = Math.floor((t - t0) * 30);
    ax += (rnd(t0 * 10 + n, 1) * 2 - 1) * k;
    ay += (rnd(t0 * 10 + n, 2) * 2 - 1) * k;
  }
  return [Math.round(ax / 3) * 3, Math.round(ay / 3) * 3];
}

// --- Partikel (alle in ganzen 3-Pixel-Schritten, damit sie zur Pixelwelt passen)
const snap = (v) => Math.round(v / 3) * 3;

/** Herbstlaub, das durchs Bild treibt. */
export function leaves(ctx, t, { count = 26, seed = 1, alpha = 1, speed = 1, dir = 1, size = 1 } = {}) {
  for (let i = 0; i < count; i++) {
    const r1 = rnd(seed, i * 5 + 1);
    const r2 = rnd(seed, i * 5 + 2);
    const r3 = rnd(seed, i * 5 + 3);
    const r4 = rnd(seed, i * 5 + 4);
    const v = (80 + r1 * 120) * speed;
    const x = (((r2 * W + t * v * dir) % (W + 200)) + W + 200) % (W + 200) - 100;
    const y = (((r3 * H + t * (40 + r4 * 70) * speed) % (H + 200)) + H + 200) % (H + 200) - 100 + Math.sin(t * (1.1 + r1) + i) * 26;
    const flip = Math.sin(t * (4 + r2 * 3) + i * 2) > 0;
    const w = (flip ? 9 : 6) * size;
    const h = (flip ? 6 : 9) * size;
    ctx.globalAlpha = alpha * (0.75 + r4 * 0.25);
    ctx.fillStyle = LEAVES[Math.floor(r3 * LEAVES.length)];
    ctx.fillRect(snap(x), snap(y), w, h);
    ctx.fillStyle = 'rgba(30,14,10,.35)';
    ctx.fillRect(snap(x) + 3, snap(y) + h - 3, w - 3, 3);
  }
  ctx.globalAlpha = 1;
}

export function snow(ctx, t, { count = 90, seed = 3, alpha = 0.9, speed = 1, wind = 40 } = {}) {
  for (let i = 0; i < count; i++) {
    const r1 = rnd(seed, i * 4 + 1);
    const r2 = rnd(seed, i * 4 + 2);
    const r3 = rnd(seed, i * 4 + 3);
    const vy = (60 + r1 * 110) * speed;
    const x = (((r2 * W + t * wind * (0.5 + r3) + Math.sin(t * 0.8 + i) * 30) % W) + W) % W;
    const y = (((r3 * H + t * vy) % (H + 40)) + H + 40) % (H + 40) - 20;
    const s = r1 > 0.75 ? 6 : 3;
    ctx.globalAlpha = alpha * (0.55 + r2 * 0.45);
    ctx.fillStyle = C.snow;
    ctx.fillRect(snap(x), snap(y), s, s);
  }
  ctx.globalAlpha = 1;
}

/** Funken, die aufsteigen (Feuer, Laternen). */
export function embers(ctx, t, { count = 30, seed = 5, alpha = 1, x0 = 0, x1 = W, y0 = H, rise = 90, color = C.gold } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const r1 = rnd(seed, i * 4 + 1);
    const r2 = rnd(seed, i * 4 + 2);
    const r3 = rnd(seed, i * 4 + 3);
    const life = 2 + r1 * 3;
    const u = ((t / life + r2) % 1 + 1) % 1;
    const x = lerp(x0, x1, r3) + Math.sin(t * 2 + i) * 30 * u;
    const y = y0 - u * rise * (1.5 + r1);
    ctx.globalAlpha = alpha * Math.sin(u * Math.PI) * 0.9;
    ctx.fillStyle = color;
    ctx.fillRect(snap(x), snap(y), 3, 3);
  }
  ctx.restore();
}

/** Schimmernde Sporen des Moders (violett). */
export function spores(ctx, t, { count = 40, seed = 9, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const r1 = rnd(seed, i * 4 + 1);
    const r2 = rnd(seed, i * 4 + 2);
    const r3 = rnd(seed, i * 4 + 3);
    const x = r2 * W + Math.sin(t * (0.4 + r1) + i * 3) * 60;
    const y = (((r3 * H - t * (14 + r1 * 24)) % H) + H) % H;
    ctx.globalAlpha = alpha * (0.35 + 0.65 * Math.abs(Math.sin(t * (1 + r1 * 2) + i)));
    ctx.fillStyle = r1 > 0.5 ? C.violet : '#c9a8ff';
    ctx.fillRect(snap(x), snap(y), 3, 3);
  }
  ctx.restore();
}

/** Vierzackiger Glitzerstern (Pixelkunst) an (x, y), Größe s in Pixeln (ungerade Vielfache von 3). */
export function sparkle(ctx, x, y, s, alpha = 1, color = C.cream) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = color;
  const u = 3;
  ctx.fillRect(x - u / 2, y - s, u, s * 2);
  ctx.fillRect(x - s, y - u / 2, s * 2, u);
  ctx.fillStyle = C.gold;
  ctx.fillRect(x - u * 1.5, y - u / 2, u * 3, u);
  ctx.restore();
}

/** Weicher Lichtfleck (Laterne, Fenster, Feuer). */
export function lightPool(ctx, x, y, r, color = '255,196,110', alpha = 0.5) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color},${alpha})`);
  g.addColorStop(0.4, `rgba(${color},${alpha * 0.35})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** Pixel-Laterne (Motiv des Trailers) mit Mittelpunkt (x, y), Skala s. */
const LANTERN = [
  '....oooo....',
  '...o....o...',
  '...o....o...',
  '..oooooooo..',
  '.oFFFFFFFFo.',
  '.oFyyyyyyFo.',
  '.oFyWWWWyFo.',
  '.oFyWWWWyFo.',
  '.oFyWWWWyFo.',
  '.oFyyyyyyFo.',
  '.oFFFFFFFFo.',
  '..oooooooo..',
  '..o......o..',
];
const LCOL = { o: '#2e1f17', F: '#d15d2c', y: '#fac665', W: '#fff2c4' };
export function lantern(ctx, cx, cy, s, glowAmt = 1) {
  const w = LANTERN[0].length * s;
  const h = LANTERN.length * s;
  const x0 = Math.round(cx - w / 2);
  const y0 = Math.round(cy - h / 2);
  lightPool(ctx, cx, cy, s * 26 * (0.85 + 0.15 * glowAmt), '255,190,100', 0.55 * glowAmt);
  LANTERN.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      ctx.fillStyle = LCOL[ch];
      ctx.fillRect(x0 + i * s, y0 + j * s, s, s);
    }
  });
}
