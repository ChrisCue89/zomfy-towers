import { openDay, setView } from './_common.mjs';
const rec = await openDay({ hour: 7, minute: 0, day: 1, weather: 'wind', view: 'weit' });
await rec.eval(() => {
  const z = window.zomfy; const g = z.game;
  z.teleport(6.06, -4.75, 0);
  z.settleCrows();
});
await rec.sim(3);
const info = await rec.eval(() => { const g = window.zomfy.game; return { door: g.world.shelter.door.center, hinge: g.world.shelter.door.hinge, fire: g.world.props.fire.smoke, chimney: g.world.shelter.chimney }; });
console.log(JSON.stringify(info));
const shots = [
  ['a', 3.5, -4.0], ['b', 5, -5.5], ['c', 2.5, -2.5],
];
for (const [n, x, z] of shots) {
  await rec.clip('_p/haus-' + n, { frames: 1, cam: { keys: [[0, x, z]] }, uiLayer: false });
}
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
