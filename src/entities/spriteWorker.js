// Backen im Hintergrund (F2): Ein Worker bekommt je Nachricht ein Bild (Art, Größe, Richtung,
// Zustand, Nummer), backt es mit demselben Bäcker wie das Spiel, schneidet es zu, kodiert es für
// den Atlas und schickt die Bytes zurück (übertragen, nicht kopiert). Bäcker und Kodierung sind
// reines JavaScript ohne three.js – deshalb braucht der Worker keine Importmap. Seit F4 backt er
// auch Menschen (mit Gesichtsflicken und Ankern) und Werkzeuge (`family`).

import { bakeFrame } from './zombieSprites.js';
import { encodeFrame } from '../render/spriteCode.js';
import { bakePerson, bakeTool, encodeBake, bakeBuffers } from './peopleSprites.js';

self.onmessage = (e) => {
  const msg = e.data;
  try {
    const t0 = performance.now();
    if (msg.family === 'person' || msg.family === 'tool') {
      const f = msg.family === 'person' ? bakePerson(msg.person, msg.spec, msg.part, msg.d, msg.anim, msg.k) : bakeTool(msg.tool, msg.d, msg.bucket);
      const enc = encodeBake(f);
      const ms = performance.now() - t0;
      self.postMessage({ id: msg.id, enc, ms }, bakeBuffers(enc));
      return;
    }
    const { id, type, f, d, anim, k } = msg;
    const enc = encodeFrame(bakeFrame(d, anim, k, type, f));
    const ms = performance.now() - t0;
    self.postMessage({ id, enc, ms }, [enc.bytes.buffer]);
  } catch (err) {
    self.postMessage({ id: msg.id, error: String((err && err.message) || err) });
  }
};
