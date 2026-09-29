// Clip `leute-feuer`: Alle am Feuer (Fest am Morgen nach der Bossnacht): Hilde, Juna, Bert, Dr. Yusuf, Knopf und Mika. Langsame Fahrt.
import { openDay, setupCamp, camAt } from './_common.mjs';

const FRAMES = 60;
const KEYS = [[0, 0.3, -1.7], [FRAMES - 1, 1.1, -1.7]];
const PROBE = process.env.PROBE;

const rec = await openDay({ hour: 8, minute: 0, day: 8, weather: 'klar', view: 'nah' });
const camp = await setupCamp(rec);
console.log('lager', JSON.stringify(camp));
await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  // Festplätze im Halbkreis um das Feuer, so dass man die Gesichter sieht (das Spiel stellt sie sonst im Vollkreis auf)
  const spots = {
    bert: { x: -1.25, z: -2.75 },
    juna: { x: 2.05, z: -3.05 },
    hilde: { x: -1.25, z: -0.75 },
    yusuf: { x: 2.25, z: -0.75 },
  };
  const c = { x: 0.5, z: -1.75 };
  g.posts.feastSpot = (id) => {
    if (!g.posts.feasting || !spots[id]) return null;
    const p = spots[id];
    return { x: p.x, z: p.z, facing: Math.atan2(c.x - p.x, c.z - p.z) };
  };
  z.setFeast(g.state.time.day); // Festtag: alle am Feuer (wie nach jeder fünften Nacht)
  z.teleport(2.0, 1.35, Math.PI * 0.85); // Mika steht südöstlich des Feuers und schaut in die Runde
  g.survivors.placeAll(true);
});
await rec.sim(4);
await rec.eval(() => { const g = window.zomfy.game; g.survivors.placeAll(true); window.zomfy.teleport(2.0, 1.35, Math.PI * 0.85); });
await rec.sim(2);

if (PROBE) {
  for (const f of PROBE.split(',').map(Number)) {
    const [x, z] = camAt(KEYS, f);
    await rec.clip('_p/leute-f' + f, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
  }
  console.log(JSON.stringify(await rec.eval(() => { const z = window.zomfy; return { posts: z.posts().feasting, np: ['knopf', 'hilde', 'juna', 'bert', 'yusuf'].map((id) => [id, z.npcPos(id)]) }; })));
} else {
  await rec.clip('leute-feuer', {
    frames: FRAMES,
    ui: 'world',
    cam: { keys: KEYS },
    each: (i) => {
      const g = window.zomfy.game;
      // zwei Zusatzwinker (das Spiel lässt beim Fest reihum winken; hier zeitlich gelegt)
      const wave = (id, t) => { const n = g.survivors.npcs.list.get(id); if (n) n.wave = t; };
      if (i === 6) wave('hilde', 1.3);
      if (i === 26) wave('bert', 1.2);
      if (i === 40) wave('yusuf', 1.2);
    },
    description: 'Festmorgen (08:00, klar, Ansicht nah) am Lagerfeuer: Bert, Juna, Hilde, Dr. Yusuf im Halbkreis, Knopf (Hund) am Feuer, Mika südöstlich schaut in die Runde; Zelte links im Hintergrund, Haus rechts oben. Langsame Fahrt nach rechts. Einzelne winken (Bild 6 Hilde, 26 Bert, 40 Yusuf), Knopf bellt beim Fest. Gute Schnittpunkte: Bild 0-59 (jeder Ausschnitt).',
  });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
