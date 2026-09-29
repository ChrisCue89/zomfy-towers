// Clip `barrikade`: Die Horde staut sich an einer Barrikadenreihe quer über den Weg, ein Brummer
// zerlegt sie (Holzsplitter), die Türme flankieren und treffen.
//   node capture/clips/b-barrikade.mjs            (ZT_NAME=_probe ZT_FRAMES=30 für Proben)
import { Rec } from '../lib.mjs';
import { prepare, placeTowers } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'barrikade';
const FRAMES = Number(process.env.ZT_FRAMES || 90);
const COL = -15; // Spalte der Barrikaden (Weg dort: j −1 … 3)

const rec = await Rec.open({ ui: 'world' });
await prepare(rec, { day: 6, hour: 21, minute: 0 });
const towers = await placeTowers(rec, [
  { type: 'katapult', i: -13, j: -2, level: 3, spec: 'A', xp: 200 },
  { type: 'laternenturm', i: -16, j: -2, level: 3, spec: 'A' },
  { type: 'bolzen', i: -14, j: 4, level: 3, spec: 'B', xp: 520 },
  { type: 'sprenger', i: -17, j: 4, level: 3, spec: 'B', xp: 160 },
]);
console.log(JSON.stringify(towers.map((t) => [t.type, t.i, t.j, t.ok, t.why])));
const bar = await rec.eval((COL) => {
  const Z = window.zomfy;
  const ids = [];
  for (const j of Z.pathColumn(COL)) {
    const r = Z.build('barrikade', COL, j, 1);
    const b = Z.buildings().find((q) => q.type === 'barrikade' && q.i === COL && q.j === j);
    if (r === 'ok' && b) {
      Z.upgradeBarricade(b.id); // verstärkt
      ids.push(b.id);
    } else ids.push(r);
  }
  // Zubehör: eine Laterne und Dornen an der mittleren Barrikade
  if (typeof ids[2] === 'number') { Z.addGear(ids[2], 'laterne'); Z.addGear(ids[2], 'dornen'); }
  Z.teleport(-12.5, 5.8, 0);
  const b = window.__b;
  // Trupp aus dem Wald: Schlurfer und Flitzer, ein Brummer vorn im Pulk
  const rows = [0.4, 1.5, 2.6];
  for (let k = 0; k < 13; k++) {
    const x = -33 + Math.floor(k / 3) * 1.6 + (k % 3) * 0.3;
    b.zombie(k === 2 ? 'brummer' : k % 4 === 3 ? 'flitzer' : 'schlurfer', x, rows[k % 3] + (k % 2) * 0.3, { hp: 2.5, speed: 1.15 });
  }
  return ids;
}, COL);
console.log('barrikaden', JSON.stringify(bar));
// Vorlauf: bis die ersten schlagen, dann noch einen Moment (Splitter fliegen schon im ersten Bild)
let waited = 0;
for (let t = 0; t < 60; t++) {
  await rec.sim(0.5);
  waited += 0.5;
  const st = await rec.eval(() => window.zomfy.zombies().filter((z) => z.state === 'smash').length);
  if (st >= 3) break;
}
console.log('vorlauf s', waited);
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, -16.5, 1.5], [FRAMES - 1, -15.5, 1.5]] },
  each: () => { window.__b.keep(); },
  description: 'Nacht, Barrikaden (Stufe 2, Laterne und Dornen in der Mitte) quer über den letzten Wegabschnitt. Der Trupp mit Brummer schlägt sie ein (Holzsplitter), Katapult (Feuer), Bolzen-Repetierer, Sprenger (Schlamm) und Laternenturm treffen von den Seiten.',
});
console.log(r.problems);
const end = await rec.eval(() => window.zomfy.buildings().filter((b) => b.type === 'barrikade').length);
console.log('barrikaden am Ende', end);
await rec.close();
process.exit(0);
