import { openDay, setView } from './_common.mjs';
const rec = await openDay({ hour: 7, minute: 10, day: 1, weather: 'klar', view: 'nah' });
await rec.eval(() => {
  const z = window.zomfy; const g = z.game;
  z.teleport(-30, 4, 0);
  const cr = g.world.crows;
  for (const c of cr.list) if (c.state === 'sitzt') cr.leave(c, true);
  const spot = (x, zz) => cr.perches.find((p) => Math.abs(p.x - x) < 0.2 && Math.abs(p.z - zz) < 0.2);
  cr.sit(cr.list[0], spot(16, -1.55)); cr.list[0].facing = Math.PI * 0.5 + 0.2;
});
await setView(rec, 'nah');
await rec.sim(3);
const shots = [
  ['a', 'klar', 7, 10, 15.5, -1.2],
  ['b', 'nebel', 7, 10, 15.5, -1.2],
  ['c', 'klar', 7, 40, 18, -1.2],
  ['d', 'wind', 7, 30, 18, -0.5],
];
for (const [n, w, h, m, x, z] of shots) {
  await rec.eval((a) => { const zz = window.zomfy; zz.setWeather(a.w, true); zz.setTime(a.h, a.m); }, { w, h, m });
  await rec.sim(1);
  await rec.clip('_p/see2-' + n, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
