// Clip `einrichten`: Innenraum (Zuhause), warmes Licht, Möbel, Mika geht durchs Bild. Ansicht drinnen (240 px/m).
import { openDay, installWalker, camAt } from './_common.mjs';

const FRAMES = 40;
const PROBE = process.env.PROBE;

const rec = await openDay({ hour: 21, minute: 30, day: 4, weather: 'klar', view: 'weit' });
// Innen 240 px/m (3 x 80: bleibt auf dem Pixelraster): bei 1080p füllt der Raum sonst nur die Mitte des Bildes
await rec.eval(async () => { const { CONFIG } = await import('/src/config.js'); CONFIG.render.interiorPxPerMeter = 240; });
await installWalker(rec);
const info = await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  z.give({ holz: 60, schrott: 40, stein: 20, fasern: 20, stoff: 20 });
  for (const id of ['bild', 'teekanne', 'wimpel', 'lichterkette', 'stehlampe', 'lesesessel']) z.buyFurniture(id);
  const e = z.interior().entry;
  z.teleport(310.4, 3.6, Math.PI / 2); // im Wohnraum, links; schaut nach rechts
  return { entry: e, inside: g.viewInside, bounds: z.interior().bounds, cozy: z.cozy() };
});
console.log(JSON.stringify(info));
await rec.sim(2);
const KEYS = [[0, 312.5, 2.2], [FRAMES - 1, 312.9, 2.2]];

if (PROBE) {
  for (const f of PROBE.split(',').map(Number)) {
    const [x, z] = camAt(KEYS, f);
    await rec.clip('_p/einr-f' + f, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
  }
  console.log(JSON.stringify(await rec.eval(() => { const g = window.zomfy.game; const p = g.player.position; return { inside: g.viewInside, x: p.x, z: p.z, focus: [g.rig.focus.x, g.rig.focus.z] }; })));
} else {
  await rec.clip('einrichten', {
    frames: FRAMES,
    ui: 'world',
    cam: { keys: KEYS },
    each: (i) => { window.__route([[314.9, 3.6]], false, 0.3); },
    description: 'Innenraum des Fischerhauses am Abend (21:30, Ansicht drinnen 240 px/m statt der 160 des Spiels, damit der Raum das 1080p-Bild füllt): eingerichtet mit Bild, Teekanne, Wimpeln, Lichterkette, Stehlampe und Lesesessel; Kamin/Feuerschein, warmes Licht. Mika geht (echte Tastensteuerung) von links nach rechts durchs Bild (Profil).',
  });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
