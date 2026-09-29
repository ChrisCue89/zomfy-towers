// Clip `haendler-boot`: Balduins Boot läuft am Steg ein (Fanfare-Szene), Balduin geht an Land, lüftet die Mütze vor Mika.
import { openDay, camAt } from './_common.mjs';

const FRAMES = 70;
const DOCK = 57; // Bild, in dem das Boot festmacht und Balduin auf den Steg springt
const KEYS = [[0, 18.6, -0.4], [FRAMES - 1, 19.0, -0.4]];
const PROBE = process.env.PROBE;

const rec = await openDay({ hour: 6, minute: 30, day: 3, weather: 'klar', view: 'nah' });
await rec.eval(() => {
  const z = window.zomfy;
  z.settleCrows();
  const cr = z.game.world.crows;
  for (const c of cr.list) if (c.state === 'sitzt') cr.leave(c, true);
  z.teleport(14.6, -1.0, Math.PI / 2); // Mika steht am Stegbeginn und schaut aufs Wasser
});
await rec.sim(1);

if (PROBE) {
  let cur = 0;
  for (const f of PROBE.split(',').map(Number)) {
    await rec.eval((a) => { window.zomfy.game.state.time.minute = a.m; }, { m: 57.5 + 0.115 * Math.min(f, DOCK) });
    await rec.sim(1 / 30);
    const [x, z] = camAt(KEYS, f);
    await rec.clip('_p/boot-f' + f, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
  }
} else {
  await rec.clip('haendler-boot', {
    frames: FRAMES,
    ui: 'world',
    cam: { keys: KEYS },
    each: (i) => {
      // Die Ankunft läuft im Spiel über 24 Spielminuten (rund 10 s); wir zeigen die letzten Minuten etwas gerafft
      // (Uhr wird bis zum Anlegen je Bild gesetzt, danach läuft sie normal weiter).
      if (i <= 57) window.zomfy.game.state.time.minute = 57.5 + 0.115 * i;
    },
    description: 'Morgen (07:00, klar, Ansicht nah): Balduins Boot läuft von rechts am Steg ein (Kielwasser), Bild ~36 wirft er die Leine über den Poller, Bild 57 macht es fest: Balduin springt auf den Steg (Staub, Glöckchen "bimmel" als Klangereignis) und lüftet die Mütze vor Mika (Bild 58-70). Mika steht am Stegbeginn links. WICHTIG für den Ton: Das Spiel startet die Ankunftsfanfare (Schiffshorn, Paukenwirbel, Fanfare, Schlussakkord aufs Anlegen, 9,6 s) mit Beginn der Einfahrt; hier ist nur das Ende zu sehen - der Schlussakkord gehört auf Bild 57. Bootsmotor läuft bis Bild 57.',
  });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
