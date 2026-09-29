import { openDay } from './_common.mjs';
const rec = await openDay({ hour: 6, minute: 40, weather: 'klar' });
await rec.eval(() => { const z = window.zomfy; z.teleport(-20, 3, 0); z.settleCrows(); });
await rec.sim(1);
const shots = [
  ['a', 'klar', 6, 40, 15, -1],
  ['b', 'nebel', 6, 40, 15, -1],
  ['c', 'wind', 7, 10, 15, -1],
  ['d', 'nebel', 7, 30, 17, 0],
];
for (const [n, w, h, m, x, z] of shots) {
  await rec.eval((a) => { const zz = window.zomfy; zz.setWeather(a.w, true); zz.setTime(a.h, a.m); }, { w, h, m });
  await rec.sim(1);
  await rec.clip('_p/see-' + n, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
