import { openDay, installWalker } from './_common.mjs';
const rec = await openDay({ hour: 7, minute: 0, day: 1, weather: 'wind', view: 'weit' });
await installWalker(rec);
await rec.eval(() => { const z = window.zomfy; z.teleport(6.06, -4.75, 0); });
await rec.sim(1);
const pts = [[4.9, -3.9], [3.9, -0.9], [2.1, -0.65]];
let k = 0;
for (let i = 0; i < 100; i++) {
  const r = await rec.eval((a) => {
    const done = window.__route(a.pts);
    const p = window.zomfy.game.player.position;
    return { done, x: +p.x.toFixed(2), z: +p.z.toFixed(2), f: +window.zomfy.game.player.facing.toFixed(2) };
  }, { pts });
  await rec.sim(1 / 30);
  if (i % 5 === 0) console.log(i, k, JSON.stringify(r));
}
await rec.close();
process.exit(0);
