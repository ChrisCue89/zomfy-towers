// Clip `leuchtfeuer`: Nacht im Schnee (Tag 30). Der Leuchtmast am Steg ist ausgebaut (Stufe 3, das Leuchtfeuer),
// seine Lichtinsel liegt groß auf dem Hof; Schlurfer, die hineinlaufen, werden geblendet und langsamer.
// Ansicht weit, Kamera fest.
//   node capture/clips/b-leuchtfeuer.mjs            (ZT_NAME=_probe ZT_FRAMES=1 für Proben)
import { Rec } from '../lib.mjs';
import { prepare, placeTowers } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'leuchtfeuer';
const FRAMES = Number(process.env.ZT_FRAMES || 60);

const rec = await Rec.open({ ui: 'world' });
await prepare(rec, { day: 30, hour: 22, minute: 30, weather: 'schnee' });
const towers = await placeTowers(rec, [
  { type: 'bolzen', i: 3, j: 5, level: 3, spec: 'B', xp: 520 },
  { type: 'katapult', i: 9, j: 6, level: 3, spec: 'A', xp: 200 },
]);
console.log(JSON.stringify(towers.map((t) => [t.type, t.i, t.j, t.ok, t.why])));
await rec.eval(() => {
  const Z = window.zomfy;
  const g = Z.game;
  g.autumn.frostNow = true; // erster Frost: es schneit, der Moder schläft
  Z.setTowerStage(3); // Leuchtmast am Steg = Leuchtfeuer (Lichtinsel auf dem Hof)
  Z.teleport(10.8, 3.6, 4.2);
  g.player.facing = -Math.PI / 2;
  const b = window.__b;
  // ein Trupp im Hof, unterwegs zum Haus – mitten durch den Schein des Leuchtfeuers
  const list = [[4.0, 3.4], [5.4, 2.6], [6.8, 3.6], [4.6, 1.4], [6.2, 0.8], [7.6, 2.0], [8.6, 1.2], [5.0, 4.4]];
  for (const [x, z] of list) b.zombie('schlurfer', x, z, { hp: 3 });
});
await rec.sim(3);
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, 12.8, 0.4], [FRAMES - 1, 12.4, 0.4]] },
  each: () => { window.__b.keep(); },
  description: 'Nacht im Schnee (Tag 30, 22:30), Ansicht weit. Der Leuchtmast am Steg leuchtet (Stufe 3, Leuchtfeuer) und wirft eine große Lichtinsel auf den Hof; ein Trupp Schlurfer zieht durch den Schein (geblendet, langsamer), Bolzenwerfer und Katapult schießen, Mika steht im Licht.',
});
console.log(r.problems);
await rec.close();
process.exit(0);
