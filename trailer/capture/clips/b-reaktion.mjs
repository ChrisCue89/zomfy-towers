// Clip `reaktionen` (90 Bilder, Ansicht nah): zwei Abschnitte hintereinander in derselben Nummerierung –
//   Bild  0–44: „Eisblock!“ (Sprenger nass + Frost-Sprenger), danach „Klirr!“ (Bolzen lässt ihn zerspringen)
//   Bild 45–89: „Dampf!“ (Sprenger nass + Feuerkürbis des Katapults)
// Jeder Abschnitt ist eine eigene Szene aus echten Türmen; ein Trockenlauf findet das Bild, in dem das Wort
// erscheint, dann wird mit derselben festen Schrittfolge neu aufgebaut und ab 4 Bildern davor aufgenommen.
// (Bei Bedarf einzeln: node capture/clips/b-reaktion.mjs eisblock|dampf; ZT_NAME=_probe ZT_FRAMES=1 für Proben.)
import { Rec } from '../lib.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FRAMES as FRAMES_DIR } from '../../config.mjs';
import { prepare, placeTowers, findFrame } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'reaktionen';
const LEAD = 4;
const SEG = Number(process.env.ZT_FRAMES || 45);

const SCENES = {
  eisblock: {
    word: 'Eisblock',
    towers: [
      { type: 'sprenger', i: -20, j: -2, level: 2, xp: 160 },
      { type: 'sprenger', i: -18, j: -2, level: 3, spec: 'A', xp: 200 },
      { type: 'bolzen', i: -16, j: -2, level: 2, xp: 200 },
      { type: 'laternenpfahl', i: -24, j: 4 },
      { type: 'laternenpfahl', i: -13, j: 4 },
    ],
    zombies: [-24.5, -25.6, -26.7],
    cam: [-17.6, 1.3],
    text: 'Nass (Sprenger) + frostig (Frost-Sprenger) = „Eisblock!“, der Bolzen lässt ihn zerspringen („Klirr!“)',
  },
  dampf: {
    word: 'Dampf',
    towers: [
      { type: 'sprenger', i: -19, j: -2, level: 2, xp: 160 },
      { type: 'katapult', i: -16, j: 4, level: 3, spec: 'A', xp: 200 },
      { type: 'laternenpfahl', i: -23, j: 4 },
      { type: 'laternenpfahl', i: -13, j: -2 },
    ],
    zombies: [-24.5, -25.6, -26.7],
    cam: [-17.6, 1.3],
    text: 'Nass (Sprenger) + brennend (Feuerkürbis des Katapults) = „Dampf!“',
  },
};

function makeScene(sc) {
  return async (rec) => {
    await prepare(rec, { day: 5, hour: 21, minute: 0, view: 'nah' });
    const towers = await placeTowers(rec, sc.towers);
    console.log(JSON.stringify(towers.map((t) => [t.type, t.i, t.j, t.ok, t.why])));
    await rec.eval((xs) => {
      const b = window.__b;
      xs.forEach((x, k) => b.zombie('schlurfer', x, b.traceZ('mitte', x) + (k % 2 ? 0.5 : -0.3), { hp: 4, speed: 0.75 }));
    }, sc.zombies);
  };
}

const which = process.argv[2] ? [process.argv[2]] : ['eisblock', 'dampf'];
const events = [];
const texts = [];
let first = 0;
for (const name of which) {
  const sc = SCENES[name];
  const detect = new Function(`return () => window.zomfy.words().some((w) => w.startsWith(${JSON.stringify(sc.word)}))`)();
  const n = await findFrame(Rec, makeScene(sc), detect, { max: 2400 });
  console.log(`${name}: Wort in Bild ${n}`);
  if (n < 0) continue;
  const rec = await Rec.open({ ui: 'world' });
  await makeScene(sc)(rec);
  await rec.sim(Math.max(0, n - LEAD) / 30);
  const r = await rec.clip(NAME, {
    frames: SEG,
    first,
    cam: { keys: [[0, sc.cam[0], sc.cam[1]], [SEG - 1, sc.cam[0] + 0.5, sc.cam[1]]] },
    each: () => { window.__b.keep(); },
  });
  console.log(name, r.problems);
  await rec.close();
  // Klangereignisse dieses Abschnitts mit Bildversatz zusammenführen
  const dir = join(FRAMES_DIR, NAME);
  for (const e of JSON.parse(readFileSync(join(dir, 'events.json'), 'utf8'))) events.push({ ...e, f: e.f + first });
  texts.push(`Bild ${first}-${first + SEG - 1}: ${sc.text}`);
  first += SEG;
}
const dir = join(FRAMES_DIR, NAME);
writeFileSync(join(dir, 'events.json'), JSON.stringify(events));
const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
meta.frames = first;
meta.description = `Nacht, Ansicht nah, zwei Szenen aus echten Türmen hintereinander. ${texts.join(' · ')}. Das Wort steht jeweils ab ca. 4 Bildern nach Abschnittsbeginn über den Schlurfern und bleibt rund eine Sekunde.`;
writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 1));
process.exit(0);
