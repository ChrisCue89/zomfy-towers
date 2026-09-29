// Clip `frost-morgen`: Morgen nach der Frostnacht (Tag 31): Schnee, Sonnenaufgang, alle am Feuer, Atemwölkchen.
import { openDay, setupCamp, camAt } from './_common.mjs';

const FRAMES = 75;
const KEYS = [[0, 2.6, -3.2], [FRAMES - 1, 3.6, -3.2]];
const PROBE = process.env.PROBE;

const rec = await openDay({ hour: 7, minute: 20, day: 31, weather: 'schnee', view: 'nah' });
console.log('lager', JSON.stringify(await setupCamp(rec, { day: 31 })));
await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  g.state.autumn.frost = 30; // der erste Frost ist gehalten (Tag 30): Schnee, der Moder schläft
  z.setDay(31);
  z.setTime(7, 20);
  z.setWeather('schnee', true);
  const cr = g.world.crows;
  for (const c of cr.list) if (c.state === 'sitzt') cr.leave(c, true);
  const spots = { bert: { x: -1.25, z: -2.75 }, juna: { x: 2.05, z: -3.05 }, hilde: { x: -1.25, z: -0.75 }, yusuf: { x: 2.25, z: -0.75 } };
  const c = { x: 0.5, z: -1.75 };
  g.posts.feastSpot = (id) => {
    if (!g.posts.feasting || !spots[id]) return null;
    const p = spots[id];
    return { x: p.x, z: p.z, facing: Math.atan2(c.x - p.x, c.z - p.z) };
  };
  z.setFeast(31); // Fest am Morgen danach: alle am Feuer
  z.teleport(2.0, 1.35, Math.PI * 0.85);
  g.survivors.placeAll(true);
});
await rec.sim(4);
await rec.eval(() => { const g = window.zomfy.game; g.survivors.placeAll(true); window.zomfy.teleport(2.0, 1.35, Math.PI * 0.85); });
await rec.sim(2);

if (PROBE) {
  for (const f of PROBE.split(',').map(Number)) {
    const [x, z] = camAt(KEYS, f);
    await rec.clip('_p/frost-f' + f, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
  }
  console.log(JSON.stringify(await rec.eval(() => ({ w: window.zomfy.weather(), a: window.zomfy.autumn().frost }))));
} else {
  await rec.clip('frost-morgen', {
    frames: FRAMES,
    ui: 'world',
    cam: { keys: KEYS },
    each: (i) => {
      const g = window.zomfy.game;
      const wave = (id, t) => { const n = g.survivors.npcs.list.get(id); if (n) n.wave = t; };
      if (i === 8) wave('hilde', 1.3);
      if (i === 30) wave('yusuf', 1.2);
      if (i === 50) wave('bert', 1.2);
    },
    description: 'Morgen nach der Frostnacht (Tag 31, 07:20, Schnee fällt, Ansicht nah): Schnee auf Boden, Zelten und Hausdach, tiefe Morgensonne, Bert, Juna, Hilde, Dr. Yusuf und Knopf am Lagerfeuer (Festmorgen), Mika südöstlich. Einzelne winken (Bild 8 Hilde, 30 Yusuf, 50 Bert). Langsame Fahrt nach rechts (aufs Haus). Gute Schnittpunkte: jeder Ausschnitt 0-74.',
  });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
