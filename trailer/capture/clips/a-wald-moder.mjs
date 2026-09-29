// Clip `wald-moder`: Nacht am Waldrand, violett glimmender Moder, ein Schlurfer mit Kochtopf-Helm (Schildträger) schlurft ins Bild.
import { openDay, setView, camAt } from './_common.mjs';

const FRAMES = 90;
// Kamera fährt langsam nach links (auf den Moder und die Fackel zu); der Schildträger läuft von links hinein und liegt ab Bild 60 in der Bildmitte
const KEYS = [[0, -49.2, -16.3], [FRAMES - 1, -52.0, -16.3]];
const PROBE = process.env.PROBE;

const rec = await openDay({ hour: 20, minute: 20, day: 2, weather: 'klar', view: 'nah' });
await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  z.teleport(-20, 3, 0); // Mika weit weg, damit niemand auf sie aufmerksam wird
  // Der Schlurfer mit Kochtopf-Helm tritt von links auf den Weg, ein Schlurfer mit Gänseblümchen folgt dicht dahinter.
  // Etwas zügiger als sonst (Tempo x1,3 wie beim Wellenmerkmal »flink«), damit er in 3 s bis in die Bildmitte kommt.
  const a = z.spawnZombie('schildtraeger', -55.3, -15.35);
  const b = z.spawnZombie('schlurfer', -57.0, -15.3);
  for (const id of [a, b]) { const q = g.horde.list.find((o) => o.id === id); q.speed = 1.2; q.aggro = 0; }
});
await setView(rec, 'nah');
// Kamerafahrt darf über die Spielfeld-Grenzen der Figur hinaus nach links (Bounds nur für die Kamera)
await rec.eval(() => { const rig = window.zomfy.game.rig; rig.bounds = { minX: -70, maxX: 30, minZ: -40, maxZ: 30 }; rig.limits = null; });
await rec.sim(1 / 3);

if (PROBE) {
  let cur = 0;
  for (const f of PROBE.split(',').map(Number)) {
    await rec.sim((f - cur) / 30);
    const [x, z] = camAt(KEYS, f);
    await rec.clip('_p/wald-f' + f, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
    cur = f + 1;
  }
} else {
  await rec.clip('wald-moder', {
    frames: FRAMES,
    ui: 'world',
    cam: { keys: KEYS },
    description: 'Dämmerung/Nacht (20:20) am Waldrand der Nordzuführung, Ansicht nah: links violett glimmender Moder mit Pilzringen und Fackelschein, der Weg läuft durchs Bild. Der Schildträger (Schlurfer mit Kochtopf als Helm, Tür als Schild) tritt von links ins Bild (ab Bild 0-10 am linken Rand), ist bei Bild 30 im linken Drittel, bei Bild 60-90 in der Bildmitte (mittleres Drittel) und gut zu sehen; ein normaler Schlurfer mit Gänseblümchen folgt dicht dahinter (tritt um Bild 25 ins Bild). Kamera fährt langsam nach links. Tempo der Schlurfer 1,2 m/s (etwas zügiger als im Spiel, damit sie in 3 s bis zur Mitte kommen). Schnittpunkt: 4-Bilder-Blitz aus Bild 60-75.',
  });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
