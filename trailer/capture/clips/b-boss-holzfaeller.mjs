// Clip `boss-holzfaeller`: Der Holzfäller (Boss der Nacht 5) mit Lebensbalken oben. Er steht vor der Barrikadenreihe,
// ein orangener Ring am Boden warnt („holt aus!“), dann schlägt er zu: Barrikaden zersplittern, die Welt wackelt.
// Trockenlauf findet das Bild, in dem er ausholt; der Clip beginnt kurz davor. Ansicht nah.
//   node capture/clips/b-boss-holzfaeller.mjs            (ZT_NAME=_probe ZT_FRAMES=1 für Proben)
import { Rec } from '../lib.mjs';
import { prepare, placeTowers, findFrame } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'boss-holzfaeller';
const FRAMES = Number(process.env.ZT_FRAMES || 45);
const LEAD = 3;

async function scene(rec) {
  await prepare(rec, { day: 5, hour: 21, minute: 30, view: 'nah' });
  const towers = await placeTowers(rec, [
    { type: 'katapult', i: -9, j: -2, level: 3, spec: 'A', xp: 520 },
    { type: 'katapult', i: -9, j: 4, level: 3, spec: 'A', xp: 200 },
    { type: 'laternenpfahl', i: -13, j: -2 },
    { type: 'laternenpfahl', i: -13, j: 4 },
  ]);
  console.log(JSON.stringify(towers.map((t) => [t.type, t.i, t.j, t.ok, t.why])));
  await rec.eval(() => {
    const Z = window.zomfy;
    const g = Z.game;
    for (const col of [-11, -10]) {
      for (const j of Z.pathColumn(col)) {
        Z.build('barrikade', col, j, 1);
        const b = Z.buildings().find((q) => q.type === 'barrikade' && q.i === col && q.j === j);
        if (b) {
          Z.upgradeBarricade(b.id);
          Z.upgradeBarricade(b.id); // Metall
        }
      }
    }
    Z.teleport(-8.2, 5.6, 0);
    const id = window.__b.zombie('holzfaeller', -15.5, 1.5, { hp: 1 });
    g.onBoss(g.horde.list.find((z) => z.id === id)); // Lebensbalken, Ansage (wie beim Nachtplan)
    // ein paar Schlurfer im Gefolge
    for (let k = 0; k < 5; k++) window.__b.zombie('schlurfer', -18 - k * 1.2, 0.6 + (k % 3) * 0.9, { hp: 2 });
  });
}

const detect = () => window.zomfy.game.horde.list.some((z) => z.boss && z.boss.windup > 0);
const n = await findFrame(Rec, scene, detect, { max: 900 });
console.log('Ausholen in Bild', n);
if (n < 0) process.exit(1);
const rec = await Rec.open({ ui: 'world' });
await scene(rec);
await rec.sim(Math.max(0, n - LEAD) / 30);
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, -13.6, 0.4], [FRAMES - 1, -13.1, 0.4]] },
  each: () => { window.__b.keep(); },
  description: 'Nacht 5, Ansicht nah. Der Holzfäller (Boss, Lebensbalken oben) steht vor zwei Metall-Barrikadenreihen; ab Bild ~3 warnt ein Ring am Boden, das Wort „holt aus!“ steht über ihm; um Bild ~39 schlägt er zu (Barrikaden zersplittern, Kamerawackeln). Katapulte mit Feuerkürbissen dahinter.',
});
console.log(r.problems);
await rec.close();
process.exit(0);
