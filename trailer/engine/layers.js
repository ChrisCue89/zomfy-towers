// Bausteine für Text- und Grafikebenen. Jede Funktion liefert eine Ebene
// { t0, t1, z, space, draw(ctx, t) } – reine Funktionen der Zeit.

import { W, H, clamp, lerp, ramp, fade, smooth, easeOut, backOut, rnd, pulse } from './util.js';
import { drawPx, textWidth } from './text.js';
import { C } from './palette.js';
import { scrim, leaves, snow, spores, embers, sparkle, lantern, lightPool, ditherFill } from './fx.js';
import { measure } from './vendor/font.js';
import { uiUrl, peek, infoNow } from './assets.js';

const over = (t0, t1, z, draw) => ({ t0, t1, z, space: 'over', draw });

/** »Text {Gold}« → Läufe [{text, gold}]. */
function runsOf(text) {
  const out = [];
  const re = /\{([^}]*)\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), hi: false });
    out.push({ text: m[1], hi: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), hi: false });
  return out;
}

/** Mehrfarbige Zeile zeichnen; `chars` = sichtbare Zeichen (Schreibmaschine). */
export function drawRuns(ctx, runs, { x, y, scale, align = 'center', alpha = 1, chars = Infinity, style = {}, hiStyle = {}, glowHi = null, hiPulse = 0 }) {
  const total = runs.reduce((n, r) => n + r.text.length, 0);
  const width = runs.reduce((w, r, i) => w + measure(r.text) + (i ? 1 : 0), 0) * scale;
  let cx = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  let used = 0;
  runs.forEach((r) => {
    const n = clamp(chars - used, 0, r.text.length);
    used += r.text.length;
    const w = measure(r.text) * scale;
    if (n > 0) {
      const st = r.hi ? { color: C.gold, ...hiStyle } : style;
      drawPx(ctx, r.text, { x: cx, y, scale, align: 'left', alpha, chars: n, glow: r.hi && glowHi ? { color: C.gold, blur: 16, alpha: glowHi * (0.55 + 0.45 * hiPulse), base: scale } : null, ...st });
    }
    cx += w + scale;
  });
  return { width, total };
}

/**
 * Erzählertext unten (Schreibmaschine). `{…}` hebt in Gold hervor (leuchtet).
 * opts: { y, scale, cps, out }
 */
export function narrate(text, at, dur, { y = H - 150, scale = 6, cps = 26, glow = 0.8, scrimAmt = 0.9, tone = 'warm' } = {}) {
  const runs = runsOf(text);
  const n = runs.reduce((k, r) => k + r.text.length, 0);
  return over(at, at + dur, 20, (ctx, t) => {
    const a = fade(t, at, at + dur, 0.25, 0.4);
    scrim(ctx, a * scrimAmt, 'bottom', 0.38);
    const chars = Math.max(0, (t - at) * cps);
    const pulseHi = 0.5 + 0.5 * Math.sin((t - at) * 4);
    const rise = (1 - easeOut(ramp(t, at, at + 0.35))) * 12;
    drawRuns(ctx, runs, { x: W / 2, y: y + rise, scale, alpha: a, chars, style: { color: tone === 'cold' ? C.ice : C.text, outline: C.outline, thick: 2 }, hiStyle: { gradient: [C.cream, C.gold], outline: C.outline, thick: 2 }, glowHi: glow, hiPulse: pulseHi });
  });
}

/**
 * Wucht-Titel: Wort groß (Verlauf, Extrusion), Unterzeile klein. Erscheint mit Überschwingen, kurzem Blitz
 * und Erschütterung; `dur` bis zum Abgang.
 * opts: { sub, x, y, scale, subScale, align, color:'gold'|'ice'|'white'|'red' }
 */
const LOOKS = {
  gold: { gradient: [C.cream, C.gold], extColor: C.ember, extrude: 3, glow: C.gold },
  ice: { gradient: ['#ffffff', C.ice], extColor: C.iceDeep, extrude: 3, glow: C.ice },
  white: { gradient: ['#ffffff', C.text], extColor: C.frameDark, extrude: 3, glow: '#ffffff' },
  red: { gradient: ['#ffd6b0', C.orange], extColor: C.red, extrude: 3, glow: C.orange },
  violet: { gradient: ['#efe3ff', C.violet], extColor: C.moder, extrude: 3, glow: C.violet },
};
export function slam(text, at, dur, { sub = null, x = W / 2, y = H - 250, scale = 15, subScale = 6, align = 'center', look = 'gold', letters = true, out = 0.12, scrimAmt = 0.85 } = {}) {
  const L = LOOKS[look];
  return over(at, at + dur, 25, (ctx, t) => {
    const lt = t - at;
    const a = fade(t, at, at + dur, 0.04, out);
    scrim(ctx, a * scrimAmt, 'bottom', 0.46);
    const pop = backOut(ramp(lt, 0, 0.2));
    const s = lerp(1.9, 1, clamp(pop, 0, 1.15));
    const style = { gradient: L.gradient, extrude: 2, extColor: L.extColor, outline: C.outline, thick: 2 };
    const perLetter = letters
      ? (i, n) => {
          const d = i * 0.028;
          const p = backOut(ramp(lt, d, d + 0.2));
          return { s: lerp(2.0, 1, clamp(p, 0, 1.1)), a: ramp(lt, d, d + 0.06), dy: (1 - clamp(p, 0, 1)) * -24 };
        }
      : null;
    drawPx(ctx, text, { x, y, scale: perLetter ? scale : Math.max(3, Math.round(scale * s / 3) * 3), align, alpha: a, letters: perLetter || ((i) => ({})), tracking: 1, glow: { color: L.glow, blur: 26, alpha: 0.55 + 0.35 * pulse(t, at + 0.05, 5), base: scale }, ...style });
    if (sub) {
      const sa = a * ramp(lt, 0.18, 0.4);
      drawPx(ctx, sub, { x, y: y + scale * 7.4 + 30, scale: subScale, align, alpha: sa, color: C.text, outline: C.outline, thick: 2 });
    }
  });
}

/** Namensschild wie eine Tafel des Spiels (Pflaume, Rahmen, goldene Schrift). */
export function nameTag(name, role, at, dur, { x = 120, y = H - 250, side = 'left', scale = 6 } = {}) {
  return over(at, at + dur, 26, (ctx, t) => {
    const lt = t - at;
    const a = fade(t, at, at + dur, 0.08, 0.12);
    const w = Math.max(textWidth(name, scale), textWidth(role, scale * 0.5)) + 72;
    const h = scale * 7 + scale * 4 + 66;
    const slide = (1 - easeOut(ramp(lt, 0, 0.22))) * 90 * (side === 'left' ? -1 : 1);
    const px = Math.round((side === 'left' ? x : W - x - w) + slide);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = C.outline;
    ctx.fillRect(px - 6, y - 6, w + 12, h + 12);
    ctx.fillStyle = C.frame;
    ctx.fillRect(px - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = C.plum;
    ctx.fillRect(px, y, w, h);
    ctx.fillStyle = C.plumLight;
    ctx.fillRect(px, y, w, 3);
    ctx.restore();
    drawPx(ctx, name, { x: px + 36, y: y + 33 + scale * 3.5, scale, alpha: a, color: C.gold, outline: null, thick: 0, anchor: 'cap', align: 'left', extrude: 0 });
    drawPx(ctx, role, { x: px + 36, y: y + 33 + scale * 7 + 24 + scale * 1.5, scale: scale * 0.5, alpha: a, color: C.text, outline: null, thick: 0, align: 'left' });
  });
}

/** Partikel-Ebene (Laub, Schnee, Sporen, Funken). */
export function particles(kind, t0, t1, opts = {}) {
  return over(t0, t1, opts.z ?? 5, (ctx, t) => {
    const a = fade(t, t0, t1, opts.fi ?? 0.5, opts.fo ?? 0.5) * (opts.alpha ?? 1);
    if (a <= 0.01) return;
    const lt = t - t0;
    if (kind === 'leaves') leaves(ctx, lt + (opts.offset || 0), { ...opts, alpha: a });
    else if (kind === 'snow') snow(ctx, lt + (opts.offset || 0), { ...opts, alpha: a });
    else if (kind === 'spores') spores(ctx, lt + (opts.offset || 0), { ...opts, alpha: a });
    else if (kind === 'embers') embers(ctx, lt + (opts.offset || 0), { ...opts, alpha: a });
  });
}

/** Studiokarte: »Tales of Cue präsentiert« mit Laterne, Laub und Glitzern (Spieluhr-Töne bei 0,06/0,21/0,36/0,51 s). */
export function studio(t0, t1) {
  return {
    t0, t1, z: -1, space: 'scene', // unter der ersten Einstellung: deren Raster-Blende deckt sie auf
    draw(ctx, t) {
      const lt = t - t0;
      ctx.fillStyle = '#0d0b18';
      ctx.fillRect(0, 0, W, H);
      const fadeOut = 1 - ramp(lt, 1.95, 2.45);
      leaves(ctx, lt + 3, { count: 14, seed: 11, alpha: 0.55 * fadeOut, speed: 0.6, size: 1 });
      // vier Spieluhr-Töne: vier Glitzer, dann Laterne und Text
      const notes = [0.06, 0.21, 0.36, 0.51];
      const pos = [[-150, 30], [-50, -10], [50, 30], [150, -20]];
      notes.forEach((n, k) => {
        const p = ramp(lt, n, n + 0.5);
        if (p > 0 && p < 1) sparkle(ctx, W / 2 + pos[k][0] * 1.6, H / 2 - 120 + pos[k][1], 18 - p * 10, (1 - p) * fadeOut, C.cream);
      });
      const lg = ramp(lt, 0.6, 0.9);
      if (lg > 0) lantern(ctx, W / 2, H / 2 - 120, 9, lg * fadeOut * (0.9 + 0.1 * Math.sin(lt * 9)));
      const ta = ramp(lt, 0.75, 1.15) * fadeOut;
      drawPx(ctx, 'Tales of Cue', { x: W / 2, y: H / 2 + 60, scale: 9, align: 'center', alpha: ta, gradient: [C.cream, C.gold], outline: C.outline, thick: 2, glow: { color: C.gold, blur: 20, alpha: 0.4, base: 9 } });
      drawPx(ctx, 'präsentiert', { x: W / 2, y: H / 2 + 150, scale: 6, align: 'center', alpha: ramp(lt, 1.15, 1.5) * fadeOut, color: C.warm, outline: C.outline, thick: 2 });
    },
  };
}

/**
 * Titelkarte: ZOMFY TOWERS in vier Gruppen zu den vier Spieluhr-Tönen (0,06/0,21/0,36/0,51 s nach `t0`),
 * Akkord bei +0,66 s: Aufleuchten. Danach Untertitel, Hinweis, Studio.
 */
export function title(t0, t1, { url = null } = {}) {
  const groups = ['ZOM', 'FY ', 'TOW', 'ERS'];
  const notes = [0.06, 0.21, 0.36, 0.51];
  return {
    t0, t1, z: 60, space: 'over',
    draw(ctx, t) {
      const lt = t - t0;
      const a = fade(t, t0, t1, 0.001, 0.5);
      // dunkler Grund: Nachthimmel-Verlauf, dahinter schimmert die letzte Einstellung durch
      const bg = ramp(lt, 0, 0.35);
      ctx.save();
      ctx.globalAlpha = bg * 0.82 * a;
      const gr = ctx.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#0d0b18');
      gr.addColorStop(1, '#2a1830');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      snow(ctx, lt + 20, { count: 60, seed: 21, alpha: 0.6 * a, speed: 0.5, wind: 20 });
      embers(ctx, lt + 5, { count: 26, seed: 8, alpha: 0.9 * a, x0: W * 0.3, x1: W * 0.7, y0: H * 0.72, rise: 160 });
      const flare = pulse(lt, 0.66, 3.2);
      lightPool(ctx, W / 2, H / 2 - 40, 640 + flare * 300, '255,190,100', (0.22 + 0.5 * flare) * a);
      const S = 15;
      lantern(ctx, W / 2, H / 2 - 270 - (1 - Math.min(1, backOut(ramp(lt, 0.5, 0.8)))) * 40, 6, ramp(lt, 0.55, 0.8) * (0.85 + 0.15 * Math.sin(lt * 8)) * a);
      const full = 'ZOMFY TOWERS';
      let start = 0;
      groups.forEach((g, gi) => {
        const p = backOut(ramp(lt, notes[gi], notes[gi] + 0.28));
        const off = measure(full.slice(0, start)) + (start ? 1 : 0);
        const gw = measure(g.trimEnd());
        const cx = W / 2 - ((measure(full) + (full.length - 1)) * S) / 2 + (off + start) * S;
        if (p > 0.001) {
          drawPx(ctx, g.trimEnd(), { x: cx, y: H / 2 - 40 - (1 - Math.min(1, p)) * 60, scale: S, align: 'left', alpha: a * ramp(lt, notes[gi], notes[gi] + 0.08), gradient: [C.cream, C.gold], extrude: 3, extColor: C.ember, outline: C.outline, thick: 2, letters: (i) => ({}), tracking: 1 });
        }
        start += g.length;
      });
      if (flare > 0.01) drawPx(ctx, full, { x: W / 2, y: H / 2 - 40, scale: S, align: 'center', alpha: flare * 0.25 * a, color: '#ffffff', outline: null, thick: 0, letters: (i) => ({}), tracking: 1, glow: { color: C.gold, blur: 30, alpha: 0.9, base: S } });
      // Untertitel, Hinweis, Studio
      const s1 = ramp(lt, 0.95, 1.3);
      drawPx(ctx, 'Gemütliche Endzeit mit Zombies.', { x: W / 2, y: H / 2 + 150, scale: 6, align: 'center', alpha: s1 * a, chars: Math.max(0, (lt - 0.95) * 34), color: C.text, outline: C.outline, thick: 2 });
      const s2 = ramp(lt, 1.9, 2.3);
      drawPx(ctx, url || 'Direkt im Browser spielbar', { x: W / 2, y: H / 2 + 240, scale: 6, align: 'center', alpha: s2 * a * 0.95, color: C.gold, outline: C.outline, thick: 2 });
      drawPx(ctx, 'Maus & Tastatur · Desktop', { x: W / 2, y: H / 2 + 285, scale: 3, align: 'center', alpha: s2 * a * 0.7, color: C.warm, outline: C.outline, thick: 2 });
      const s3 = ramp(lt, 2.6, 3.0);
      drawPx(ctx, 'Tales of Cue', { x: W / 2, y: H - 90, scale: 6, align: 'center', alpha: s3 * a * 0.85, color: C.warm, outline: C.outline, thick: 2 });
    },
  };
}

/** Schwarzblende im Raster am Ende/Anfang. */
export function fadeToBlack(t0, t1, out = true) {
  return { t0, t1, z: 100, space: 'over', draw(ctx, t) { ditherFill(ctx, '#0d0b18', out ? ramp(t, t0, t1) : 1 - ramp(t, t0, t1)); } };
}

/**
 * UI-Sticker: ein Ausschnitt der echten Spieloberfläche (Oberflächen-Ebene eines Clips, 640×360),
 * vergrößert und mit Schwung eingeblendet – die Tafeln des Spiels als Grafikelement.
 * o: { clip, frame, rect:[x,y,w,h] (Oberflächenpixel), x, y (Mitte, Bildpixel), scale (ganzzahlig), pop, glow }
 */
export function sticker(clip, frame, rect, at, dur, { x = W / 2, y = H / 2, scale = 6, dx = 0, dy = 0, glow = null, hold = 0.0 } = {}) {
  const url = uiUrl(clip, frame);
  return {
    t0: at, t1: at + dur, z: 24, space: 'over',
    needs: () => [url],
    draw(ctx, t) {
      const ui = peek(url);
      const lt = t - at;
      const a = fade(t, at, at + dur, 0.06, 0.12);
      const p = backOut(ramp(lt, 0, 0.24));
      const s = Math.max(1, Math.round(lerp(scale * 1.6, scale, clamp(p, 0, 1.1))));
      const [rx, ry, rw, rh] = rect;
      const w = rw * s;
      const h = rh * s;
      const cx = Math.round(x + dx * (1 - easeOut(ramp(lt, 0, 0.3))) );
      const cy = Math.round(y + dy * (1 - easeOut(ramp(lt, 0, 0.3))));
      if (glow) lightPool(ctx, cx, cy, Math.max(w, h) * 0.8, glow, 0.35 * a);
      if (!ui) return;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(ui, rx, ry, rw, rh, cx - w / 2, cy - h / 2, w, h);
      ctx.restore();
    },
  };
}
