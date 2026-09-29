// Clip `turm-feuer`: Bolzenwerfer, Kürbiskatapult, Rasensprenger und Laternenturm am letzten
// Wegabschnitt vorm Lager schießen auf einen Trupp Schlurfer. Nacht, Lichtinseln der Türme.
//   node capture/clips/b-turm-feuer.mjs            (ZT_NAME=_probe ZT_FRAMES=30 für Proben)
import { Rec } from '../lib.mjs';
import { prepare, placeTowers } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'turm-feuer';
const FRAMES = Number(process.env.ZT_FRAMES || 90);

const rec = await Rec.open({ ui: 'world' });
await prepare(rec, { day: 4, hour: 21, minute: 0 });
const towers = await placeTowers(rec, [
  { type: 'laternenturm', i: -16, j: -2, level: 3, spec: 'A' },
  { type: 'bolzen', i: -14, j: -2, level: 3, spec: 'B', xp: 520 },
  { type: 'katapult', i: -19, j: -2, level: 3, spec: 'A', xp: 200 },
  { type: 'katapult', i: -17, j: 5, level: 3, spec: 'A', xp: 200 },
  { type: 'sprenger', i: -13, j: 4, level: 2, xp: 160 },
  { type: 'bolzen', i: -20, j: 4, level: 3, spec: 'A', xp: 200 },
]);
console.log(JSON.stringify(towers.map((t) => [t.type, t.ok, t.why])));
await rec.eval(() => {
  const Z = window.zomfy;
  Z.teleport(-15.5, 5.8, 0);
  const b = window.__b;
  // ein dichter Trupp über die Breite des Weges, in der Mitte ein Brummer
  const rows = [0.3, 1.5, 2.7];
  for (let k = 0; k < 15; k++) {
    const x = -33.5 + Math.floor(k / 3) * 1.5 + (k % 3) * 0.35;
    b.zombie(k === 7 ? 'brummer' : k % 5 === 4 ? 'flitzer' : 'schlurfer', x, rows[k % 3] + (k % 2) * 0.25, { hp: 2.5 });
  }
});
await rec.sim(5);
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, -17, 1.5], [FRAMES - 1, -14.5, 1.5]] },
  each: () => { window.__b.keep(); window.__b.hold(21, 0); },
  description: 'Nacht, Bolzenwerfer (Repetierer), Kürbiskatapult (Feuer), Sprenger (Frost) und Laternenturm am letzten Wegabschnitt; ein Trupp Schlurfer mit Brummer läuft von links herein.',
});
console.log(r.problems);
await rec.close();
process.exit(0);
