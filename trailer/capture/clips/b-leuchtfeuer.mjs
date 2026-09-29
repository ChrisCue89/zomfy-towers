// Clip `leuchtfeuer`: Der Leuchtmast am Steg (Stufe 3, das Leuchtfeuer) im Schneetreiben, Nacht, Ansicht nah.
// Langsame Kamerafahrt vom Steg aufwärts zur Lampe. Die Lichtinsel des Leuchtfeuers ist für die Aufnahme an den Mast
// verlegt (world.props.beaconPos), damit Lampe, Lichtschein und Steg zusammen im Bild sind; Schlurfer auf dem Steg laufen
// durch den Schein (geblendet, um 30 % langsamer – das Leuchtfeuer wirkt im Spiel so). Zwei Laternentürme setzen warme Inseln.
//   node capture/clips/b-leuchtfeuer.mjs            (ZT_NAME=_probe ZT_FRAMES=1 für Proben, ZT_PROBE2=1: Anfang und Ende)
import { Rec } from '../lib.mjs';
import { prepare, snowCover } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'leuchtfeuer';
const FRAMES = Number(process.env.ZT_FRAMES || 60);
const MAST = { x: 22.25, z: -1.0 };
const CAM0 = [20.6, -1.4]; // Anfang: unten am Steg
const CAMM = [21.1, -5.0];
const CAM1 = [21.6, -8.2]; // Ende: hoch zur Lampe

const rec = await Rec.open({ ui: 'world' });
await prepare(rec, { day: 30, hour: 22, minute: 10, weather: 'schnee', view: 'nah' });
await rec.eval((MAST) => {
  const Z = window.zomfy;
  const g = Z.game;
  g.autumn.frostNow = true; // erster Frost: es schneit, der Moder schläft
  g.world.props.beaconPos.x = MAST.x - 0.6; // Lichtinsel des Leuchtfeuers an den Steg (nur für die Aufnahme)
  g.world.props.beaconPos.z = MAST.z + 0.3;
  Z.setTowerStage(3); // Leuchtmast = Leuchtfeuer
  g.world.lightPools.setScale(1.6); // größere Lichtinseln (wie mit Lottes Laternen)
  Z.teleport(16.6, 2.6, 4.2);
  g.player.facing = Math.PI / 2;
  const b = window.__b;
  // ein paar Schlurfer kommen den Steg entlang (zum Haus), mitten durch den Schein
  [[19.6, -1.0], [18.1, -0.9], [16.6, -1.1], [15.2, -1.0]].forEach(([x, z]) => b.zombie('schlurfer', x, z, { hp: 3 }));
}, MAST);
await snowCover(rec, 0.5); // dünnere Schneedecke (kein Tarnmuster)
await rec.sim(2);
if (process.env.ZT_PROBE2) {
  await rec.clip('_probe', { frames: 1, cam: { keys: [[0, ...CAM0]] } });
  await rec.clip('_probe', { frames: 1, first: 1, cam: { keys: [[0, ...CAMM]] } });
  await rec.clip('_probe', { frames: 1, first: 2, cam: { keys: [[0, ...CAM1]] } });
  await rec.close();
  process.exit(0);
}
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, ...CAM0], [FRAMES - 1, ...CAM1]] },
  each: () => { window.__b.keep(); },
  description: 'Nacht im Schneetreiben (Tag 30, 22:10, Frost), Ansicht nah. Der Leuchtmast am Ende des Stegs (Stufe 3, Leuchtfeuer) steht im Mittelpunkt: Bild 0-30 Steg und Mastfuß in großer, ovaler Lichtinsel (graues bis violettes Licht auf Wasser und Schnee; die Insel wurde für die Aufnahme an den Mast verlegt und 1,6x vergrößert), vier Schlurfer laufen den Steg entlang durch den Schein (geblendet, um 30 % langsamer); Kamerafahrt (Neigung nach oben) am Mast entlang, ab Bild ~45 steht das weiße Lampenglas ganz oben im Bild mit Halo, die Kamera hält dort bis Bild 59. Schneedecke am Boden für die Aufnahme auf 50 % gedünnt (weniger Tarnmuster), Schneeflocken wie im Spiel. Beste Schnitte: 0-25 (Steg+Schlurfer im Licht), 40-59 (Lampe).',
});
console.log(r.problems);
await rec.close();
process.exit(0);
