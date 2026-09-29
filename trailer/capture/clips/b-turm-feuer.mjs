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
  { type: 'katapult', i: -25, j: -1, level: 3, spec: 'A', xp: 200 },
  { type: 'laternenturm', i: -22, j: -2, level: 3, spec: 'A' },
  { type: 'bolzen', i: -20, j: -2, level: 3, spec: 'B', xp: 520 },
  { type: 'bolzen', i: -26, j: 4, level: 3, spec: 'A', xp: 200 },
  { type: 'katapult', i: -23, j: 5, level: 3, spec: 'A', xp: 200 },
  { type: 'sprenger', i: -20, j: 4, level: 2, xp: 160 },
]);
console.log(JSON.stringify(towers.map((t) => [t.type, t.i, t.j, t.ok, t.why])));
await rec.eval(() => {
  const Z = window.zomfy;
  Z.teleport(-22.3, 6.6, 0);
  const b = window.__b;
  // ein dichter Trupp auf dem Weg (kommt von links aus dem Wald), in der Mitte ein Brummer
  const off = [-0.9, 0.1, 1.0];
  for (let k = 0; k < 16; k++) {
    const x = -34 - Math.floor(k / 3) * 1.6 - (k % 3) * 0.35;
    b.zombie(k === 6 ? 'brummer' : k % 5 === 4 ? 'flitzer' : 'schlurfer', x, b.traceZ('mitte', x) + off[k % 3] + (k % 2) * 0.25, { hp: 2.5 });
  }
});
await rec.sim(5);
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, -26.2, 1.4], [FRAMES - 1, -24.8, 1.4]] },
  each: () => { window.__b.keep(); },
  description: 'Nacht, Bolzenwerfer (Repetierer), Kürbiskatapult (Feuer), Sprenger (Frost) und Laternenturm am letzten Wegabschnitt; ein Trupp Schlurfer mit Brummer läuft von links herein.',
});
console.log(r.problems);
await rec.close();
process.exit(0);
