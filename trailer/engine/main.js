// Der Renderer: setzt aus den Ebenen von edit.js das Bild zur Zeit t zusammen.
// Alles ist eine reine Funktion der Bildnummer (deterministisch), damit sich jedes Bild einzeln
// berechnen und prüfen lässt.

import { W, H, FPS } from './util.js';
import { loadImage, preloadInfos } from './assets.js';
import { grade, bloom, vignette, flash, shakeAt } from './fx.js';
import * as edit from './edit.js';

const canvas = document.getElementById('c');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d', { willReadFrequently: false });
const scene = document.createElement('canvas');
scene.width = W;
scene.height = H;
const sg = scene.getContext('2d');

let ready = false;
async function setup() {
  await preloadInfos(edit.clipNames());
  ready = true;
  window.__ready = true;
}

function activeLayers(t) {
  return edit.layers.filter((l) => t >= l.t0 && t < l.t1).sort((a, b) => a.z - b.z || a.t0 - b.t0);
}

window.renderFrame = async (f) => {
  if (!ready) await setup();
  const t = f / FPS;
  const act = activeLayers(t);
  const need = act.flatMap((l) => (l.needs ? l.needs(t) : []));
  await Promise.all(need.map(loadImage));
  // nächstes Bild schon im Hintergrund holen
  const nxt = activeLayers(t + 1.5 / FPS).flatMap((l) => (l.needs ? l.needs(t + 1.5 / FPS) : []));
  for (const u of nxt) loadImage(u);

  // Szene (Aufnahmen) mit Farbgebung
  sg.globalCompositeOperation = 'source-over';
  sg.globalAlpha = 1;
  sg.fillStyle = '#05040c';
  sg.fillRect(0, 0, W, H);
  for (const l of act) if (l.space === 'scene') l.draw(sg, t);
  const gr = edit.gradeAt(t);
  grade(sg, gr);
  bloom(sg, gr?.bloom ?? 0.22, 5);

  // Bildschirm: Szene mit Wackeln, dann Überlagerungen
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#05040c';
  ctx.fillRect(0, 0, W, H);
  const [dx, dy] = shakeAt(t, edit.shakes);
  ctx.drawImage(scene, dx, dy);
  vignette(ctx, gr?.vignette ?? 0.4);
  for (const l of act) if (l.space !== 'scene') l.draw(ctx, t);
  flash(ctx, edit.flashAt(t), edit.flashColor);
  edit.finalPass?.(ctx, t);
  return f;
};

window.__png = async () => {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
};
window.__duration = edit.DURATION;
window.__shots = () => edit.layers.filter((l) => l.kind === 'shot').map((l) => ({ clip: l.spec.clip, at: l.spec.at, dur: l.spec.dur, from: l.spec.from, speed: l.spec.speed }));
setup();
