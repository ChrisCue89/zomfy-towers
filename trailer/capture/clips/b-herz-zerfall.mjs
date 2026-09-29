// Clip `herz-zerfall`: Das Moderherz fällt (letzte Phase, es schneit). Die Horde zerfällt zu Staub und Moos, Trefferstopp,
// Kamerawackeln und Zeitlupe des Spiels; dann Zeitraffer der Morgendämmerung über der stillen Bucht. Ansicht nah.
// Das Herz wird in Bild 8 erledigt (so, als hätte ein Turm es gefällt: killZombie(id, 'turm') = derselbe Weg wie ein Abschuss).
//   node capture/clips/b-herz-zerfall.mjs            (ZT_NAME=_probe ZT_FRAMES=1 für Proben)
import { Rec } from '../lib.mjs';
import { prepare, placeTowers } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'herz-zerfall';
const FRAMES = Number(process.env.ZT_FRAMES || 60);

const rec = await Rec.open({ ui: 'world' });
await prepare(rec, { day: 30, hour: 5, minute: 5, weather: 'schnee', view: 'nah' });
const towers = await placeTowers(rec, [
  { type: 'bolzen', i: -15, j: -2, level: 4, spec: 'B', xp: 520 },
  { type: 'katapult', i: -14, j: 4, level: 4, spec: 'A', xp: 200 },
  { type: 'laternenpfahl', i: -19, j: -2 },
  { type: 'laternenpfahl', i: -19, j: 4 },
]);
console.log(JSON.stringify(towers.map((t) => [t.type, t.i, t.j, t.ok, t.why])));
const heart = await rec.eval(() => {
  const Z = window.zomfy;
  const g = Z.game;
  g.autumn.frostNow = true; // dritte Phase: es schneit
  Z.teleport(-12.6, 5.2, 0);
  // die Frostnacht ist im Gang; alle Wellen sind gekommen – fällt das Herz und stirbt der Rest, ist die Nacht gehalten
  g.nights.beginNight(g.state.time.day);
  g.state.night.wave = g.nights.plan.waves.length;
  g.nights.queue.length = 0;
  const b = window.__b;
  const id = Z.spawnHeart(-18.6, b.traceZ('mitte', -18.6));
  const h = g.horde.list.find((q) => q.id === id);
  h.boss.phase = 3; // wie im Spiel nach zwei Dritteln Leben: Ruf und Frost sind schon vorbei
  h.boss.attacks = ['wurzeln', 'sporen'];
  h.speed *= 0.75;
  h.hp = h.maxHp * 0.05;
  // die Horde um das Herz
  const ring = [[-20.6, 0.4], [-21.4, 1.9], [-20.0, 2.8], [-22.6, 1.1], [-16.8, 0.3], [-16.4, 2.4], [-17.8, 3.2], [-23.6, 2.3], [-19.0, -0.3], [-22.0, 3.1]];
  ring.forEach(([x, z], k) => b.zombie(k % 3 === 0 ? 'schwaermer' : k % 3 === 1 ? 'schlurfer' : 'flitzer', x, z, { hp: 3 }));
  g.nights.enabled = true;
  window.__heart = id;
  // Zeitraffer der Morgendämmerung ab Bild 26 (von 05:30 bis 07:20)
  window.__dawn = (i) => {
    if (i >= 26) Z.setTime(5, 30 + Math.round((i - 26) * 3.4));
  };
  return id;
});
console.log('Herz', heart);
await rec.sim(0.6);
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, -18.4, 1.7], [FRAMES - 1, -17.2, 1.5]] },
  each: (i) => {
    window.__b.keep();
    if (i === 8) window.zomfy.killZombie(window.__heart, 'turm');
    window.__dawn(i);
  },
  description: 'Frostnacht, Ansicht nah, Schnee. Das Moderherz (Lebensbalken oben) fällt in Bild 8 (Trefferstopp, Wackeln, Zeitlupe), im Folgebild zerfällt die Horde ringsum zu Staub und Moos; ab Bild 26 läuft ein Zeitraffer in die Morgendämmerung (05:30 bis 07:20), die Bucht liegt still im Schnee. Beste Schnitte: 4-24 (Fall), 30-59 (Morgengrauen).',
});
console.log(r.problems);
const end = await rec.eval(() => ({ alive: window.zomfy.game.horde.list.length, done: window.zomfy.state().night.done, frost: window.zomfy.state().autumn.frost }));
console.log(JSON.stringify(end));
await rec.close();
process.exit(0);
