// Clip `barrikade`: Die Horde staut sich an einer Barrikadenreihe quer über den Weg, ein Brummer
// zerlegt sie (Holzsplitter), die Türme flankieren und treffen.
//   node capture/clips/b-barrikade.mjs            (ZT_NAME=_probe ZT_FRAMES=30 für Proben)
import { Rec } from '../lib.mjs';
import { prepare, placeTowers } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'barrikade';
const FRAMES = Number(process.env.ZT_FRAMES || 75);
const COL = -13; // Spalte der Barrikaden (Weg dort: j −1 … 3)

const rec = await Rec.open({ ui: 'world' });
await prepare(rec, { day: 6, hour: 21, minute: 0 });
const towers = await placeTowers(rec, [
  { type: 'bolzen', i: -11, j: -2, level: 3, spec: 'B', xp: 520 },
  { type: 'katapult', i: -9, j: -2, level: 3, spec: 'A', xp: 200 },
  { type: 'laternenturm', i: -11, j: 4, level: 3, spec: 'A' },
  { type: 'bolzen', i: -9, j: 4, level: 2, xp: 200 },
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
  Z.teleport(-13.2, 6.2, 0);
  const b = window.__b;
  // Trupp aus dem Wald: Schlurfer und Flitzer, ein Brummer vorn im Pulk
  const rows = [0.5, 1.5, 2.5];
  // der Brummer vorn, dahinter ein dichter Trupp (die Türme dünnen ihn aus, während der Brummer schlägt)
  b.zombie('brummer', -17.4, 1.5, { hp: 4 });
  for (let k = 0; k < 14; k++) {
    const x = -19.4 - Math.floor(k / 3) * 1.5 - (k % 3) * 0.3;
    b.zombie(k % 5 === 4 ? 'flitzer' : 'schlurfer', x, rows[k % 3] + (k % 2) * 0.3, { hp: 3, speed: 1.1 });
  }
  return ids;
}, COL);
console.log('barrikaden', JSON.stringify(bar));
// Vorlauf: bis die ersten schlagen, dann noch einen Moment (Splitter fliegen schon im ersten Bild)
let waited = 0;
for (let t = 0; t < 120; t++) {
  await rec.sim(0.25);
  waited += 0.25;
  const st = await rec.eval(() => window.zomfy.zombies().filter((z) => z.state === 'smash').length);
  if (st >= 1) break;
}
await rec.sim(0.5);
console.log('vorlauf s', waited);
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, -14.6, 1.5], [FRAMES - 1, -13.6, 1.5]] },
  each: () => { window.__b.keep(); },
  description: 'Nacht, Barrikaden (Stufe 2, Laterne und Dornen in der Mitte) quer über den letzten Wegabschnitt. Der Trupp mit Brummer schlägt sie ein (Holzsplitter), Katapult (Feuer), Bolzen und Laternenturm stehen dahinter.',
});
console.log(r.problems);
const end = await rec.eval(() => window.zomfy.buildings().filter((b) => b.type === 'barrikade').length);
console.log('barrikaden am Ende', end);
await rec.close();
process.exit(0);
