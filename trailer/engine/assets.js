// Bilder laden: aufgenommene Clip-Bilder, mit kleinem Zwischenspeicher. Fehlende Bilder
// (Clip noch nicht aufgenommen) werden durch einen beschrifteten Platzhalter ersetzt,
// damit sich der Schnitt jederzeit ansehen lässt.

import { W, H, pad4 } from './util.js';

const MAX = 48;
const bitmaps = new Map(); // url -> ImageBitmap | null (fehlt)
const pending = new Map();
const infos = new Map();

export async function loadImage(url) {
  if (bitmaps.has(url)) {
    const b = bitmaps.get(url);
    bitmaps.delete(url);
    bitmaps.set(url, b);
    return b;
  }
  if (pending.has(url)) return pending.get(url);
  const p = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await createImageBitmap(await res.blob());
    } catch {
      return null;
    }
  })();
  pending.set(url, p);
  const b = await p;
  pending.delete(url);
  bitmaps.set(url, b);
  while (bitmaps.size > MAX) {
    const k = bitmaps.keys().next().value;
    bitmaps.get(k)?.close?.();
    bitmaps.delete(k);
  }
  return b;
}
export const peek = (url) => bitmaps.get(url) ?? null;

/** meta.json eines Clips (oder null). */
export function clipInfo(name) {
  if (!infos.has(name)) {
    infos.set(name, fetch(`/frames/${name}/meta.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  }
  return infos.get(name);
}
export const infoNow = new Map();
export async function preloadInfos(names) {
  await Promise.all(names.map(async (n) => infoNow.set(n, await clipInfo(n))));
}

export const sceneUrl = (clip, i) => `/frames/${clip}/${pad4(i)}.png`;
export const uiUrl = (clip, i) => `/frames/${clip}/${pad4(i)}.ui.png`;

// Platzhalter für fehlende Clips
const placeholders = new Map();
export function placeholder(clip, i) {
  const key = `${clip}`;
  if (!placeholders.has(key)) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#3b2a4a');
    grad.addColorStop(1, '#1f3a3a');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.12)';
    g.lineWidth = 2;
    for (let x = 0; x < W; x += 120) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, H);
      g.stroke();
    }
    for (let y = 0; y < H; y += 120) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.font = 'bold 64px monospace';
    g.textAlign = 'center';
    g.fillText(`Clip fehlt: ${clip}`, W / 2, H / 2);
    placeholders.set(key, c);
  }
  return placeholders.get(key);
}
