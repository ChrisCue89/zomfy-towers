// Clip `wald-moder`: Nacht am Waldrand, violett glimmender Moder, ein Schlurfer mit Kochtopf-Helm (Schildträger) schlurft ins Bild.
import { openDay, setView } from './_common.mjs';

const FRAMES = 90;
const KEYS = [[0, -48, -16.2], [FRAMES - 1, -47.6, -16.2]];

const rec = await openDay({ hour: 22, minute: 30, day: 2, weather: 'klar', view: 'nah' });
await rec.eval(() => {
  const z = window.zomfy;
  z.teleport(-20, 3, 0); // Mika weit weg, damit niemand auf sie aufmerksam wird
  // Der Schlurfer mit Kochtopf-Helm tritt von links aus dem Moder auf den Weg, ein Schlurfer mit Gänseblümchen folgt
  z.spawnZombie('schildtraeger', -54.7, -14.65);
  z.spawnZombie('schlurfer', -56.9, -14.9);
});
await setView(rec, 'nah');
await rec.sim(1);
await rec.clip('wald-moder', {
  frames: FRAMES,
  ui: 'world',
  cam: { keys: KEYS },
  description: 'Nacht (22:30) am Waldrand der Nordzuführung, Ansicht nah. Links violett glimmender Moder mit Pilzringen und eine Fackel, Weg in Bildmitte. Der Schildträger (Schlurfer mit Kochtopf als Helm, Tür als Schild) tritt ab Bild ~10 von links ins Bild und schlurft nach rechts (Bild 60-75: klar im linken Drittel, gut zu sehen), ein normaler Schlurfer mit Gänseblümchen folgt (tritt um Bild 50-60 ins Bild). Kamera fast fest. Schnittpunkt: Bild 40-89.',
});
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
