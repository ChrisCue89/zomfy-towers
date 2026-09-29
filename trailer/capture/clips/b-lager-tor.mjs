// Clip `lager-tor`: Die Horde steht vor dem Tor des Lagers (Bohlenwand, Stufe 3) und schlägt es ein –
// Dornen sprühen Funken, die Laterne am Tor wirft eine Lichtinsel; hinter dem Wall schleudern zwei
// Feuer-Katapulte Kürbisse, Mika steht am Hof. Ansicht nah, Kamera fest am Tor.
//   node capture/clips/b-lager-tor.mjs            (ZT_NAME=_probe ZT_FRAMES=1 für Proben)
import { Rec } from '../lib.mjs';
import { prepare, placeTowers } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'lager-tor';
const FRAMES = Number(process.env.ZT_FRAMES || 60);

const rec = await Rec.open({ ui: 'world' });
await prepare(rec, { day: 8, hour: 21, minute: 0, view: 'nah' });
const towers = await placeTowers(rec, [
  { type: 'katapult', i: -5, j: -2, level: 3, spec: 'A', xp: 520 },
  { type: 'katapult', i: -5, j: 4, level: 3, spec: 'A', xp: 200 },
  { type: 'laternenpfahl', i: -6, j: 5 },
]);
console.log(JSON.stringify(towers.map((t) => [t.type, t.i, t.j, t.ok, t.why])));
const gate = await rec.eval(() => {
  const Z = window.zomfy;
  const g = Z.game;
  const camp = Z.camp();
  for (const c of camp) for (let k = 0; k < 2; k++) Z.upgradeCamp(c.id); // Bohlenwand
  const tor = camp.find((c) => c.type === 'tor');
  for (const gear of ['dornen', 'laterne', 'glocke']) Z.addGear(tor.id, gear);
  Z.teleport(-3.8, 3.2, 4.2);
  g.player.facing = -Math.PI / 2;
  const b = window.__b;
  // draußen vor dem Tor: ein Brummer und ein dichter Trupp
  b.zombie('brummer', -10.1, 1.6, { hp: 3 });
  const rows = [0.0, 1.0, 2.0, 3.0];
  for (let k = 0; k < 9; k++) b.zombie(k % 4 === 3 ? 'flitzer' : 'schlurfer', -11.6 - Math.floor(k / 4) * 1.3, rows[k % 4] + 0.2, { hp: 3 });
  return tor.id;
});
// Vorlauf: bis die ersten am Tor schlagen
for (let t = 0; t < 200; t++) {
  await rec.sim(0.25);
  const n = await rec.eval(() => window.zomfy.zombies().filter((z) => z.state === 'smash').length);
  if (n >= 2) break;
}
await rec.sim(0.5);
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, -8.8, 1.5], [FRAMES - 1, -8.4, 1.5]] },
  each: () => { window.__b.keep(); },
  description: 'Nacht, Ansicht nah. Die Horde (Brummer, Schlurfer, Flitzer) schlägt das Lagertor (Bohlenwand) ein; Dornen sprühen Funken, die Laterne am Tor leuchtet; hinter dem Wall werfen zwei Feuer-Katapulte Kürbisse, Mika steht am Hof.',
});
console.log(r.problems);
const st = await rec.eval(() => window.zomfy.camp().find((c) => c.type === 'tor'));
console.log(JSON.stringify(st));
await rec.close();
process.exit(0);
