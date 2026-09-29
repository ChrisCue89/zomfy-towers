import { openDay, setView } from './_common.mjs';
const rec = await openDay({ hour: 22, minute: 0, day: 2, weather: 'klar', view: 'weit' });
await rec.eval(() => {
  const z = window.zomfy;
  z.teleport(-20, 3, 0);
  z.spawnZombie('schildtraeger', -46.2, -14.1);
  z.spawnZombie('schlurfer', -48.5, -14.4);
});
await rec.sim(2);
const shots = [
  ['a', 'weit', -44, -17.5],
  ['b', 'nah', -45.5, -15.3],
  ['c', 'weit', -50, -17],
  ['d', 'weit', -38, -11],
];
for (const [n, v, x, z] of shots) {
  await setView(rec, v);
  await rec.clip('_p/wald-' + n, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
}
console.log(JSON.stringify(await rec.eval(() => window.zomfy.zombies())));
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
