// Clip `moderherz`: Das Moderherz (Frostnacht, Tag 30) stapft über den Weg, die Türme schlagen auf
// es ein; es steht still, ein Ring warnt am Boden (Wurzeln), dann brechen die Wurzeln aus dem
// Boden, zerschlagen die Barrikaden und die Welt wackelt. Lebensbalken „Das Moderherz“ oben.
// Ansicht nah (160 px/m).
//   node capture/clips/b-moderherz.mjs            (ZT_NAME=_probe ZT_FRAMES=1 für Proben)
import { Rec } from '../lib.mjs';
import { prepare, placeTowers } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'moderherz';
const FRAMES = Number(process.env.ZT_FRAMES || 110);
const COL = -15; // Barrikadenreihe vor dem Herz

const rec = await Rec.open({ ui: 'world' });
await prepare(rec, { day: 30, hour: 22, minute: 0, view: 'nah' });
const towers = await placeTowers(rec, [
  { type: 'bolzen', i: -13, j: -2, level: 3, spec: 'B', xp: 520 },
  { type: 'katapult', i: -12, j: 4, level: 3, spec: 'A', xp: 200 },
  { type: 'laternenpfahl', i: -17, j: -2 },
  { type: 'laternenpfahl', i: -17, j: 4 },
]);
console.log(JSON.stringify(towers.map((t) => [t.type, t.i, t.j, t.ok, t.why])));
const ids = await rec.eval((COL) => {
  const Z = window.zomfy;
  const ids = [];
  for (const j of Z.pathColumn(COL)) {
    const r = Z.build('barrikade', COL, j, 1);
    const b = Z.buildings().find((q) => q.type === 'barrikade' && q.i === COL && q.j === j);
    if (r === 'ok' && b) {
      Z.upgradeBarricade(b.id);
      ids.push(b.id);
    } else ids.push(r);
  }
  Z.teleport(-10.6, 4.9, 0);
  const id = Z.spawnHeart(-19, Z.game.world.pathing.trace('mitte').find((p) => p.x > -19).z);
  return { ids, id };
}, COL);
console.log(JSON.stringify(ids));
await rec.sim(4.3); // kurz vor der Ankündigung der Wurzeln (erster Angriff nach 5 s)
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, -16.6, 1.5], [FRAMES - 1, -15.4, 1.5]] },
  each: () => { window.__b.keep(); },
  description: 'Frostnacht (Tag 30, 22:00), Ansicht nah. Das Moderherz stapft langsam über den Weg, Bolzenwerfer und Feuerkatapult treffen es, Lebensbalken oben. Ab etwa Bild 20 warnt ein Ring am Boden, um Bild 62 brechen die Wurzeln aus (Wackeln, Splitter, Barrikaden fallen).',
});
console.log(r.problems);
const end = await rec.eval(() => ({ heart: window.zomfy.autumn().heart, barr: window.zomfy.buildings().filter((b) => b.type === 'barrikade').length }));
console.log(JSON.stringify(end));
await rec.close();
process.exit(0);
