// Clip `haus-morgen`: Fischerhaus von außen am Morgen, warmes Fenster, Laub weht, Mika tritt aus der Tür und geht zum Feuer.
import { openDay, installWalker, camAt } from './_common.mjs';

const FRAMES = 100;
const KEYS = [[0, 5.3, -5.7], [14, 5.3, -5.6], [FRAMES - 1, 3.6, -4.3]];
const PROBE = process.env.PROBE;

const rec = await openDay({ hour: 7, minute: 0, day: 1, weather: 'wind', view: 'weit' });
await installWalker(rec);
await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  // Krähen: nur die auf dem Wäscheleinen-Pfosten bleibt
  z.settleCrows();
  const cr = g.world.crows;
  for (const c of cr.list) if (c.state === 'sitzt') cr.leave(c, true);
  const spot = (x, zz) => cr.perches.find((p) => Math.abs(p.x - x) < 0.3 && Math.abs(p.z - zz) < 0.3);
  const post = cr.perches.find((p) => p.y > 2 && p.z < -5) || cr.perches[0];
  cr.sit(cr.list[0], post);
  // Mika steht im Haus an der Tür und geht hinaus (echter Durchgang mit Aufblenden)
  const e = z.interior().entry;
  z.teleport(e.x, e.z - 0.6, Math.PI);
});
await rec.sim(1);
// Taste S (nach Süden = zur Tür hinaus) halten, bis der Durchgang läuft und die Blende halb durch ist (Mika steht dann draußen)
await rec.eval(() => window.__key('KeyS', true));
for (let k = 0; k < 40; k++) {
  await rec.sim(1 / 30);
  const st = await rec.eval(() => { const g = window.zomfy.game; return g.passage ? { done: g.passage.done, t: g.passage.t } : null; });
  if (st && st.done) break;
}
await rec.eval(() => window.__stop());

if (PROBE) {
  for (const f of PROBE.split(',').map(Number)) {
    const [x, z] = camAt(KEYS, f);
    await rec.clip('_p/haus-f' + f, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: true });
  }
} else {
  await rec.clip('haus-morgen', {
    frames: FRAMES,
    ui: 'world',
    cam: { keys: KEYS },
    each: (i) => {
      const g = window.zomfy.game;
      if (i === 0) g.sound.play('tuer'); // Türklang des Durchgangs (der Durchgang selbst begann kurz vor Bild 0)
      // ab Bild 9 zum Feuer (Südostseite, vor dem Sessel), dann stehen bleiben
      if (i >= 9) window.__route([[4.9, -3.9], [3.9, -0.9], [2.1, -0.65]]);
    },
    description: 'Morgen am Fischerhaus (Tag 1, 07:00, Windwetter mit Laub, Ansicht weit). Bild 0-6: Blende (Oberflächen-Ebene, gerastertes Aufblenden) - Mika tritt aus der Tür (echter Durchgang des Spiels), warmes Fenster, Kürbislichter, Krähe auf dem Wäscheleinenpfosten, Rauch aus dem Kamin. Ab Bild 9 geht Mika (echte Tastensteuerung) zum Lagerfeuer und bleibt dort stehen (Ankunft etwa Bild 78). Kamera ruhig auf dem Haus, ab Bild 14 langsame Fahrt zum Feuer. Gute Schnittpunkte: Bild 7-60.',
  });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
