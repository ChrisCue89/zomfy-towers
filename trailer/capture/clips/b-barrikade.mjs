// Clip `barrikade`: Die Horde staut sich an einer Barrikadenreihe quer über den Weg, ein Brummer
// zerlegt sie (Holzsplitter), die Türme flankieren und treffen.
//   node capture/clips/b-barrikade.mjs            (ZT_NAME=_probe ZT_FRAMES=30 für Proben)
import { Rec } from '../lib.mjs';
import { prepare, placeTowers } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'barrikade';
const FRAMES = Number(process.env.ZT_FRAMES || 75);
const COL = -13; // Spalte der Barrikaden (Weg dort: j −1 … 3)

const rec = await Rec.open({ ui: 'world' });
await prepare(rec, { day: 6, hour: 21, minute: 0, view: 'nah' });
const towers = await placeTowers(rec, [
  { type: 'katapult', i: -11, j: -2, level: 3, spec: 'A', xp: 520 },
  { type: 'katapult', i: -11, j: 4, level: 3, spec: 'A', xp: 200 },
  { type: 'laternenpfahl', i: -14, j: -2 },
  { type: 'laternenpfahl', i: -14, j: 4 },
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
  // Zubehör: Dornen an der mittleren Barrikade (wer draufschlägt, verletzt sich)
  if (typeof ids[2] === 'number') Z.addGear(ids[2], 'dornen');
  Z.teleport(-9.5, 4.8, 0);
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
// Vorlauf: bis der Brummer die erste Barrikade fast durchgeschlagen hat – dann bricht sie im Clip
let waited = 0;
for (let t = 0; t < 400; t++) {
  await rec.sim(0.1);
  waited += 0.1;
  const st = await rec.eval(() => {
    const l = window.zomfy.game.world.buildings.list.filter((b) => b.type === 'barrikade');
    return { min: Math.min(...l.filter((b) => !b.broken).map((b) => b.hp)), broken: l.filter((b) => b.broken).length };
  });
  if (st.broken > 0 || st.min <= 14) break;
}
console.log('vorlauf s', waited.toFixed(1));
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, -13.6, 1.6], [FRAMES - 1, -13.0, 1.6]] },
  each: () => { window.__b.keep(); },
  description: 'Nacht, Ansicht nah (160 px/m). Ein Brummer mit Trupp (Schlurfer, Flitzer, Brand-Symbole über den Köpfen) hat eine Reihe Verstärkter Barrikaden quer über den Weg erreicht und schlägt sie ein; die Barrikaden dahinter (Dornen an der mittleren) halten teils: Bild 0-10 Splitter- und Funkenschauer, Bild 10 (Klang „abriss“) bricht eine Barrikade, Bild 20 fallen drei Schlurfer, Bild 20-74 drängt sich der Trupp durch die Lücke, der Brummer steht im Spalt. Zwei Feuer-Katapulte dahinter (Kürbisse fliegen im Bogen, Aufprall), zwei Laternenpfähle als Lichtinseln, Mika rechts. Ein Brummer bleibt bis zum Ende stehen (Bild 74 noch am Schlagen), im Clip fällt kein Boss. Beste Schnitte: 0-25 (Splitter und Bögen), 35-60 (Trupp im Spalt).',
});
console.log(r.problems);
const end = await rec.eval(() => window.zomfy.buildings().filter((b) => b.type === 'barrikade').length);
console.log('barrikaden am Ende', end);
await rec.close();
process.exit(0);
