// Backen im Hintergrund (F2): Ein Worker bekommt je Nachricht ein Bild (Art, Größe, Richtung,
// Zustand, Nummer), backt es mit demselben Bäcker wie das Spiel, schneidet es zu, kodiert es für
// den Atlas und schickt die Bytes zurück (übertragen, nicht kopiert). Bäcker und Kodierung sind
// reines JavaScript ohne three.js – deshalb braucht der Worker keine Importmap.

import { bakeFrame } from './zombieSprites.js';
import { encodeFrame } from '../render/spriteCode.js';

self.onmessage = (e) => {
  const { id, type, f, d, anim, k } = e.data;
  try {
    const t0 = performance.now();
    const enc = encodeFrame(bakeFrame(d, anim, k, type, f));
    const ms = performance.now() - t0;
    self.postMessage({ id, enc, ms }, [enc.bytes.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
