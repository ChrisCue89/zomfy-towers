// Clip `see-morgen`: Steg und See im Morgenlicht, leerer Steg, Krähe, Laub. Langsame Fahrt über den Steg (Ansicht nah).
import { openDay, setView, camAt } from './_common.mjs';

const FRAMES = 100;
const KEYS = [[0, 14.4, -1.2], [FRAMES - 1, 18.6, -1.0]];
const PROBE = process.env.PROBE; // z. B. PROBE=0,50,99

const rec = await openDay({ hour: 7, minute: 10, day: 1, weather: 'wind', view: 'nah' });
await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  z.teleport(-30, 4, 0); // Mika weit weg (aus dem Bild)
  z.settleCrows();
  // Krähe auf den Steg (Poller-Stange), eine zweite weiter hinten
  const cr = g.world.crows;
  for (const c of cr.list) if (c.state === 'sitzt') cr.leave(c, true);
  const spot = (x, zz) => cr.perches.find((p) => Math.abs(p.x - x) < 0.2 && Math.abs(p.z - zz) < 0.2);
  cr.sit(cr.list[0], spot(16, -1.55));
  cr.list[0].facing = Math.PI * 0.5 + 0.2; // schaut zum See hinaus
});
await setView(rec, 'nah');
await rec.sim(3);

if (PROBE) {
  for (const f of PROBE.split(',').map(Number)) {
    const [x, z] = camAt(KEYS, f);
    await rec.clip('_p/see-f' + f, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
  }
} else {
  await rec.clip('see-morgen', {
    frames: FRAMES,
    ui: 'world',
    cam: { keys: KEYS },
    // Bild 74: die Krähe fliegt vom Steg auf (echtes Auffliegen des Spiels, mit Krächzen)
    each: (i) => {
      if (i === 74) {
        const cr = window.zomfy.game.world.crows;
        const c = cr.list[0];
        if (c.state === 'sitzt') cr.flee(c, { x: c.pos.x - 2.5, z: c.pos.z + 1.2 }, true);
      }
    },
    description: 'Morgenlicht am Stillsee (Tag 1, 07:10, Wind, Ansicht nah 160 px/m). Leerer Steg, Krähe sitzt darauf, Laub fällt, Morgennebel über dem Wasser. Sehr ruhige Fahrt nach rechts über den Steg Richtung Leuchtmast. Bild 0-72 ruhig, Krähe fliegt ab Bild 74 krächzend auf (Klangereignis caw). Gute Schnittpunkte: Bild 0-70 (ruhig) oder 60-99 (mit Auffliegen).',
  });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
