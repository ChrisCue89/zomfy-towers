import { openDay, setView } from './_common.mjs';
const rec = await openDay({ hour: 22, minute: 0, day: 2, weather: 'klar', view: 'weit' });
await rec.eval(() => {
  const z = window.zomfy;
  z.teleport(-20, 3, 0);
  z.spawnZombie('schildtraeger', -50.6, -14.6);
  z.spawnZombie('schlurfer', -52.5, -14.9);
});
await rec.sim(2);
const shots = [
  ['a', 'nah', -48, -16.2, 22, 0],
  ['b', 'nah', -48, -17.8, 22, 0],
  ['c', 'nah', -48, -16.2, 23, 30],
  ['d', 'nah', -48, -16.2, 21, 0],
];
for (const [n, v, x, z, h, m] of shots) {
  await rec.eval((a) => window.zomfy.setTime(a.h, a.m), { h, m });
  await setView(rec, v);
  await rec.clip('_p/wald-' + n, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
}
console.log(JSON.stringify(await rec.eval(() => window.zomfy.zombies())));
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
