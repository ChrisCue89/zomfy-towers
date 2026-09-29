// Clips `reaktion-eisblock`, `reaktion-dampf`, `reaktion-kleber`: Zustände der Türme treffen sich zu einer
// Reaktion, das Wort („Eisblock!“, „Dampf!“, „Klebekürbis!“) poppt über den Schlurfern (Ansicht nah).
// Zwei Läufe: erst ein Trockenlauf findet das Bild, in dem das Wort erscheint, dann wird mit derselben
// festen Schrittfolge neu aufgebaut und ab wenigen Bildern davor aufgenommen.
//   node capture/clips/b-reaktion.mjs [eisblock|dampf|kleber|alle]   (ZT_FRAMES=1 für ein Probebild, ZT_PROBE=1 → Name _probe)
import { Rec } from '../lib.mjs';
import { prepare, placeTowers, findFrame } from './b-common.mjs';

const WHICH = process.argv[2] || 'alle';
const FRAMES = Number(process.env.ZT_FRAMES || 30);
const LEAD = 4; // Bilder vor dem Wort

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
    zombies: [-26.5, -27.6, -28.7],
    cam: [-17.4, 1.3],
    description: 'Nacht, Ansicht nah. Sprenger (nass) und Frost-Sprenger machen den Trupp nass und frostig: „Eisblock!“ poppt über dem vorderen Schlurfer, er friert ein; der Bolzen lässt ihn zerspringen („Klirr!“).',
  },
  dampf: {
    word: 'Dampf',
    towers: [
      { type: 'sprenger', i: -19, j: -2, level: 2, xp: 160 },
      { type: 'katapult', i: -16, j: 4, level: 3, spec: 'A', xp: 200 },
      { type: 'laternenpfahl', i: -23, j: 4 },
      { type: 'laternenpfahl', i: -13, j: -2 },
    ],
    zombies: [-26.5, -27.6, -28.7],
    cam: [-17.4, 1.3],
    description: 'Nacht, Ansicht nah. Der Sprenger macht den Trupp nass, ein Feuerkürbis des Katapults trifft: „Dampf!“ poppt, der Brand erlischt, ringsum steht alles verwirrt im Dampf.',
  },
  kleber: {
    word: 'Klebek',
    towers: [
      { type: 'sprenger', i: -19, j: -2, level: 3, spec: 'B', xp: 200 },
      { type: 'katapult', i: -16, j: 4, level: 2, xp: 200 },
      { type: 'laternenpfahl', i: -23, j: 4 },
      { type: 'laternenpfahl', i: -13, j: -2 },
    ],
    zombies: [-26.5, -27.6, -28.7],
    cam: [-17.4, 1.3],
    description: 'Nacht, Ansicht nah. Der Schlamm-Sprenger macht den Trupp matschig, ein Kürbis des Katapults trifft: „Klebekürbis!“ poppt, eine klebrige Fläche bremst die Horde.',
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

const names = WHICH === 'alle' ? Object.keys(SCENES) : [WHICH];
for (const name of names) {
  const sc = SCENES[name];
  const detect = new Function(`return () => window.zomfy.words().some((w) => w.startsWith(${JSON.stringify(sc.word)}))`)();
  const n = await findFrame(Rec, makeScene(sc), detect, { max: 1800 });
  console.log(`${name}: Wort in Bild ${n}`);
  if (n < 0) continue;
  const rec = await Rec.open({ ui: 'world' });
  await makeScene(sc)(rec);
  await rec.sim(Math.max(0, n - LEAD) / 30);
  const clipName = process.env.ZT_PROBE ? '_probe' : `reaktion-${name}`;
  const r = await rec.clip(clipName, {
    frames: FRAMES,
    cam: { keys: [[0, sc.cam[0], sc.cam[1]], [FRAMES - 1, sc.cam[0] + 0.4, sc.cam[1]]] },
    each: () => { window.__b.keep(); },
    description: sc.description,
  });
  console.log(name, r.problems);
  await rec.close();
}
process.exit(0);
