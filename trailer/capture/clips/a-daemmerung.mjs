// Clip `daemmerung`: Zeitraffer 17:00 -> 20:45 am Haus/Hof; Sonne sinkt, Lichtinseln (Laternen, Fenster, Kürbisse, Feuer) gehen an.
import { openDay, installWalker, camAt } from './_common.mjs';

const FRAMES = 90;
const KEYS = [[0, 3.4, -3.9], [FRAMES - 1, 3.9, -3.5]];
const PROBE = process.env.PROBE; // z. B. PROBE=0,0.5,1  (Anteil u der Zeitspanne)
const T0 = 17;
const SPAN = 3.75; // Stunden

const rec = await openDay({ hour: T0, minute: 0, day: 1, weather: 'wind', view: 'weit' });
await installWalker(rec);
const built = await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  z.give({ holz: 60, schrott: 30, stoff: 20, fasern: 30, stein: 20 });
  const res = {};
  // Lichter im Hof: zwei Laternenpfähle, zwei Kürbislaternen, eine Bank am Feuer
  res.l1 = z.build('laternenpfahl', 9, -2);
  res.l2 = z.build('laternenpfahl', -2, -4);
  res.k1 = z.build('kuerbislaterne', 6, -3);
  res.k2 = z.build('kuerbislaterne', 1, 0);
  // Krähen sitzen auf Pfosten im Bild (ziehen abends in den Wald)
  z.settleCrows();
  const cr = g.world.crows;
  for (const c of cr.list) if (c.state === 'sitzt') cr.leave(c, true);
  const high = cr.perches.filter((p) => p.y > 1.4 && p.x > -8 && p.x < 3 && p.z < 3);
  high.slice(0, 3).forEach((p, k) => cr.sit(cr.list[k], p));
  z.teleport(2.3, -0.6, -1.0); // Mika am Feuer (wie am Ende von haus-morgen)
  return res;
});
console.log('gebaut', JSON.stringify(built));
await rec.sim(2);
await rec.eval(() => { window.zomfy.teleport(2.3, -0.6, -1.0); });
await rec.sim(1);

if (PROBE) {
  for (const uu of PROBE.split(',').map(Number)) {
    await rec.eval((a) => { window.zomfy.setTime(a.h, a.m); }, { h: T0, m: SPAN * 60 * uu });
    await rec.sim(1);
    const [x, z] = camAt(KEYS, uu * (FRAMES - 1));
    await rec.clip('_p/daem-' + uu, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
  }
} else {
  await rec.clip('daemmerung', {
    frames: FRAMES,
    ui: 'world',
    cam: { keys: KEYS },
    each: (i, u) => {
      const g = window.zomfy.game;
      window.zomfy.setTime(17, 225 * u); // 17:00 -> 20:45
      if (i === 52) window.__tap('KeyF'); // Mika zündet ihre Laterne an (echte Taste)
    },
    description: 'Zeitraffer am Hof: 17:00 (goldenes Nachmittagslicht) bis 20:45 (Nacht) in 90 Bildern (Uhr wird je Bild gesetzt). Sonne sinkt, Schatten drehen, Krähen ziehen ab, Fenster/Kürbisse/Laternenpfähle/Lagerfeuer bilden Lichtinseln, Mika steht am Feuer und zündet bei Bild 52 ihre Laterne an. Kamera fast fest. Gute Schnittpunkte: Bild 10-80.',
  });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
