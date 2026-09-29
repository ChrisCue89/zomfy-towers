// Einstellungen aus aufgenommenen Clips: Bildwahl, Kamerafahrt (Zoom/Schwenk), Zeitlupe,
// Blenden (Schnitt, Raster, Blitz) und optional die Oberflächen-Ebene des Spiels.

import { W, H, FPS, clamp, lerp, smooth, easeOut, easeInOut } from './util.js';
import { sceneUrl, uiUrl, peek, placeholder, infoNow } from './assets.js';
import { ditherReveal } from './fx.js';

const EASE = { smooth, linear: (u) => u, out: easeOut, inOut: easeInOut };

/**
 * spec: { clip, at, dur, from = 0 (Bildnummer im Clip), speed = 1, zoom = [z0, z1], pan = [[x0,y0],[x1,y1]] (Pixel),
 *   ease = 'smooth', tin = { kind: 'cut' | 'dither' | 'flash', dur, mode }, ui = false | true | { rects: [...] },
 *   standin = '/game/screenshots/x.png' (nur solange der Clip fehlt), hold = false }
 */
export function shot(spec) {
  const s = { from: 0, speed: 1, zoom: [1, 1], pan: [[0, 0], [0, 0]], ease: 'smooth', tin: { kind: 'cut', dur: 0 }, ui: false, ...spec };
  const info = () => infoNow.get(s.clip);
  const index = (t) => {
    const lt = Math.max(0, t - s.at);
    const fi = s.from + lt * FPS * s.speed;
    const n = info()?.frames;
    const cap = n ? n - 1 : Infinity;
    const i = Math.min(cap, Math.floor(fi));
    const frac = fi >= cap ? 0 : fi - Math.floor(fi);
    return [i, frac, Math.min(cap, i + 1)];
  };
  const layer = {
    kind: 'shot',
    id: s.id || s.clip,
    space: 'scene',
    z: s.z ?? 0,
    t0: s.at,
    t1: s.at + s.dur,
    spec: s,
    needs(t) {
      if (!info() && s.standin) return [s.standin];
      if (!info()) return [];
      const [i, frac, j] = index(t);
      const out = [sceneUrl(s.clip, i)];
      if (s.speed < 1 && frac > 0.02 && j !== i) out.push(sceneUrl(s.clip, j));
      if (s.ui) out.push(uiUrl(s.clip, i));
      return out;
    },
    draw(ctx, t) {
      const lt = t - s.at;
      const p = s.tin.dur > 0 ? clamp(lt / s.tin.dur) : 1;
      const body = (g) => drawBody(g, t);
      if (s.tin.kind === 'dither' && p < 1) ditherReveal(ctx, body, p, s.tin.mode || 'fade');
      else body(ctx);
    },
  };

  function drawBody(g, t) {
    const lt = t - s.at;
    const u = clamp(lt / Math.max(0.001, s.dur));
    const e = (EASE[s.ease] || smooth)(u);
    const z = lerp(s.zoom[0], s.zoom[1], e);
    const px = lerp(s.pan[0][0], s.pan[1][0], e);
    const py = lerp(s.pan[0][1], s.pan[1][1], e);
    let img = null;
    let j = null;
    let frac = 0;
    if (info()) {
      const [i, f, k] = index(t);
      img = peek(sceneUrl(s.clip, i)) || placeholder(s.clip, i);
      frac = f;
      j = s.speed < 1 && f > 0.02 && k !== i ? peek(sceneUrl(s.clip, k)) : null;
    } else if (s.standin) {
      img = peek(s.standin) || placeholder(s.clip, 0);
    } else {
      img = placeholder(s.clip, 0);
    }
    g.save();
    g.imageSmoothingEnabled = z !== 1;
    g.imageSmoothingQuality = 'high';
    const dw = W * z;
    const dh = H * z;
    const dx = Math.round((W - dw) / 2 + px);
    const dy = Math.round((H - dh) / 2 + py);
    g.drawImage(img, dx, dy, dw, dh);
    if (j) {
      g.globalAlpha = frac;
      g.drawImage(j, dx, dy, dw, dh);
      g.globalAlpha = 1;
    }
    g.restore();
    if (s.ui && info()) {
      const [i] = index(t);
      const ui = peek(uiUrl(s.clip, i));
      if (ui) {
        g.save();
        g.imageSmoothingEnabled = false;
        if (s.ui.rects) {
          for (const r of s.ui.rects) g.drawImage(ui, r[0], r[1], r[2], r[3], r[0] * 3, r[1] * 3, r[2] * 3, r[3] * 3);
        } else g.drawImage(ui, 0, 0, W, H);
        g.restore();
      }
    }
  }
  return layer;
}
