// Clip `bauen`: Bauen mit Schwung: Baugeist (Vorschau) gleitet vor Mika her, dann setzt sie einen Bolzenwerfer neben den Weg (Stauchen/Strecken).
import { openDay, installWalker, camAt } from './_common.mjs';

const FRAMES = 45;
const PROBE = process.env.PROBE;

const rec = await openDay({ hour: 16, minute: 30, day: 3, weather: 'klar', view: 'nah' });
await installWalker(rec);
const site = await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  z.give({ holz: 60, schrott: 40, stein: 20, fasern: 20, stoff: 10 });
  for (const f of ['ersterTurm', 'werkbankGebaut', 'introGesehen']) z.setFlag(f); // keine Dialogfenster nach dem Bau
  const cr = g.world.crows;
  for (const c of cr.list) if (c.state === 'sitzt') cr.leave(c, true);
  // Bauplatz: freie Zelle nördlich des letzten Wegabschnitts (x -15..-10), z -1..-3
  let best = null;
  for (let j = -3; j <= 0; j++) for (let i = -16; i <= -9; i++) {
    if (z.placeCheck('bolzen', i, j).ok && z.placeCheck('bolzen', i - 3, j).ok && z.placeCheck('bolzen', i - 2, j).ok && z.placeCheck('bolzen', i - 1, j).ok) { if (!best || Math.abs(i + 11) + Math.abs(j + 1.5) < Math.abs(best.i + 11) + Math.abs(best.j + 1.5)) best = { i, j }; }
  }
  return best;
});
console.log('bauplatz', JSON.stringify(site));
if (!site) { await rec.close(); process.exit(1); }
const sx = site.i + 0.5; // Mitte der Zielzelle
const sz = site.j + 0.5;
const startX = sx - 1.6 - 3.2; // Mika läuft 3 m nach Osten, Baugeist geht 1,6 m voraus
const KEYS = [[0, startX + 2.0, sz - 0.8], [FRAMES - 1, sx + 0.2, sz - 0.8]];
await rec.eval((a) => {
  const z = window.zomfy;
  const g = z.game;
  z.teleport(a.x, a.z, Math.PI / 2); // schaut nach Osten (zum Haus)
  g.builder.startPlacement('bolzen'); // Bauleiste: Bolzenwerfer gewählt, die Vorschau folgt Mikas Blick (Tastaturbetrieb)
  window.__wp = null;
  window.__site = { x: a.sx, z: a.z };
}, { x: startX, z: sz, sx });
await rec.sim(1);

if (PROBE) {
  let cur = 0;
  for (const f of PROBE.split(',').map(Number)) {
    const [x, z] = camAt(KEYS, f);
    await rec.clip('_p/bauen-f' + f, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
  }
} else {
  await rec.clip('bauen', {
    frames: FRAMES,
    ui: 'world',
    cam: { keys: KEYS },
    each: (i) => {
      const g = window.zomfy.game;
      const a = { tx: window.__site.x, tz: window.__site.z };
      // Bild 0-22: Mika geht nach Osten, der Baugeist gleitet vor ihr her; Bild 24 stoppt sie, Bild 26 E = Bauen
      if (i < 22) window.__key('KeyD', true);
      else window.__key('KeyD', false);
      if (i === 27) g.input.pressedCodes.add('KeyE');
    },
    description: 'Nachmittag (16:30, klar, Ansicht nah) neben dem letzten Wegabschnitt im Westen des Hofs: Mika läuft nach rechts, vor ihr gleitet der Baugeist (halbtransparente Vorschau des Bolzenwerfers, grün = passt), Bild 27 setzt sie ihn mit E: Turm federt auf (Stauchen/Strecken), Staub, Klang "bau", Mika freut sich. Nach dem Bau zeigt sich der Turm noch 18 Bilder.',
  });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
