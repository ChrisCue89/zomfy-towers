// Clips `nah-hilde`, `nah-juna`, `nah-bert`, `nah-yusuf`, `nah-knopf`: je eine Figur nah (160 px/m) im goldenen Nachmittagslicht (17:20).
import { openDay, setupCamp } from './_common.mjs';

const FRAMES = 30;
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;

const rec = await openDay({ hour: 17, minute: 20, day: 8, weather: 'klar', view: 'nah' });
console.log('lager', JSON.stringify(await setupCamp(rec)));
await rec.eval(() => {
  const z = window.zomfy;
  z.settleCrows();
  const cr = z.game.world.crows;
  for (const c of cr.list) if (c.state === 'sitzt') cr.leave(c, true); // keine Krähen im Bild
});

// Figur, Blickrichtung, Geste (Bild), Kameraversatz (Figur unten-mittig, leicht aus der Mitte)
const SHOTS = [
  { name: 'nah-hilde', id: 'hilde', at: [-3.9, -4.85], facing: 0.35, gesture: ['summen', 2.0, 4], dx: 0.35, dz: -1.05, drift: 0.35, desc: 'Oma Hilde (Postbotin) steht vor ihrem Zelt am Hofeingang, summt zufrieden und wiegt den Kopf (Bild 4-34), lächelt.' },
  { name: 'nah-juna', id: 'juna', facing: -0.5, gesture: ['winken', 1.4, 3], dx: 0.4, dz: -1.05, drift: 0.35, desc: 'Juna (Funkbastlerin) am Leuchtmast am Ende des Stegs, See und Mast im Hintergrund; winkt (Bild 3-45).' },
  { name: 'nah-bert', id: 'bert', facing: 0.2, gesture: ['bart', 1.8, 4], dx: 0.35, dz: -1.05, drift: 0.35, desc: 'Bert (Handwerker mit Schnauzer und Warnweste) am Hackklotz, kratzt sich nachdenklich am Kinn (Bild 4-58). Holzstapel/Haus im Hintergrund.' },
  { name: 'nah-yusuf', id: 'yusuf', facing: -0.3, gesture: ['brille', 1.6, 4], dx: -0.3, dz: -1.05, drift: 0.35, desc: 'Dr. Yusuf (Arzt) am Feuer neben dem Sessel, rückt die Brille zurecht (Bild 4-52). Warmes Licht, Feuer daneben.' },
  { name: 'nah-knopf', id: 'knopf', facing: 0.6, gesture: null, dx: 0.3, dz: -0.35, drift: 0.25, desc: 'Knopf, der Hund, am Lagerfeuer, wedelt und bellt kurz (Bild 6, Klangereignis bellen).' },
];

for (const s of SHOTS) {
  if (only && !only.includes(s.name)) continue;
  const info = await rec.eval((a) => {
    const z = window.zomfy;
    const g = z.game;
    z.teleport(-14, 4, 0); // Mika weit weg: niemand dreht sich zu ihr
    g.survivors.placeAll(true);
    const n = g.survivors.npcs.list.get(a.id);
    // die anderen aus dem Bild nehmen (nur die Figur des Clips bleibt sichtbar)
    for (const [id, o] of g.survivors.npcs.list) if (id !== a.id) o.model.root.visible = false;
    if (a.at) g.survivors.npcs.place(n, a.at[0], a.at[1], a.facing);
    n.model.root.visible = true;
    n.gestures.length = 0;
    n.facing = a.facing;
    n.restFacing = a.facing;
    g.survivors.npcs.sync(n);
    return { x: n.x, z: n.z };
  }, s);
  await rec.sim(1.2);
  const info2 = await rec.eval((a) => { const n = window.zomfy.game.survivors.npcs.list.get(a.id); n.restFacing = a.facing; n.facing = a.facing; return { x: n.x, z: n.z }; }, s);
  console.log(s.name, JSON.stringify(info2));
  const cx = info2.x + s.dx;
  const cz = info2.z + s.dz;
  await rec.eval((a) => { window.__nah = a; }, s);
  await rec.clip(s.name, {
    frames: FRAMES,
    ui: 'world',
    cam: { keys: [[0, cx, cz], [FRAMES - 1, cx + s.drift, cz]] },
    each: (i) => {
      const g = window.zomfy.game;
      const a = window.__nah;
      const n = g.survivors.npcs.list.get(a.id);
      if (a.gesture && i === a.gesture[2]) g.survivors.npcs.gesture(n, a.gesture[0], a.gesture[1]);
      if (a.id === 'knopf' && i === 6) {
        n.bark = 0.7;
        g.sound.play('bellen', { x: n.x, z: n.z, volume: 0.7 }); // wie beim Bellen im Spiel
      }
    },
    description: s.desc,
  });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
