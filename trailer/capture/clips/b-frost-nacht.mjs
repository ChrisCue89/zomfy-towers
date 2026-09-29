// Clip `frost-nacht` (+ Einzelbild `hud-frost`): Nacht 30, „Tag 30 von 30“, es schneit. Die echte Frostnacht des
// Spiels läuft (jede Welle über alle drei Wege): Die Horde strömt aus Nord-, Mittel- und Südweg auf die
// Weggabelung zu, dort stehen Türme (Insel zwischen den Wegen, Fackeln), Ansicht weit.
// `hud-frost`: ein Einzelbild mit voller Oberfläche (Uhrentafel „Tag 30 von 30 · Schnee 20:42 · Nacht“, Nachtleiste).
//   node capture/clips/b-frost-nacht.mjs            (ZT_NAME=_probe ZT_FRAMES=1 für Proben)
import { Rec } from '../lib.mjs';
import { prepare, placeTowers } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'frost-nacht';
const FRAMES = Number(process.env.ZT_FRAMES || 110);

const rec = await Rec.open({ ui: 'world' });
await prepare(rec, { day: 30, hour: 20, minute: 29, weather: 'schnee' });
const towers = await placeTowers(rec, [
  { type: 'bolzen', i: -35, j: 0, level: 4, spec: 'B', xp: 520 },
  { type: 'katapult', i: -34, j: 2, level: 4, spec: 'A', xp: 520 },
  { type: 'laternenturm', i: -36, j: 1, level: 3, spec: 'A' },
  { type: 'katapult', i: -32, j: 6, level: 3, spec: 'A', xp: 200 },
  { type: 'bolzen', i: -30, j: 5, level: 4, spec: 'A', xp: 200 },
  { type: 'sprenger', i: -33, j: -3, level: 3, spec: 'A', xp: 200 },
]);
console.log(JSON.stringify(towers.map((t) => [t.type, t.i, t.j, t.ok, t.why])));
await rec.eval(() => {
  const Z = window.zomfy;
  const g = Z.game;
  g.autumn.frostNow = true; // Schnee fällt (in der Frostnacht ab der dritten Phase des Herzens)
  g.state.tools.axt = true; // kein Axt-Auftrag in der Zieltafel
  g.world.props.axe.object.visible = false;
  g.addToHotbar('axt');
  Z.teleport(-28.8, 9.4, 0);
  g.nights.enabled = true; // Frostnacht beginnt um 20:30 (Plan: jede Welle über alle drei Wege)
});
await rec.sim(3); // Nacht beginnt, Welle 1 wird angesagt
// Einzelbild mit voller Oberfläche: Uhrentafel, Nachtleiste
await rec.eval(() => {
  window.zomfy.setTime(20, 42);
  window.zomfy.game.hud.toasts.length = 0;
});
await rec.sim(0.5);
await rec.eval(() => (window.zomfy.game.hud.toasts.length = 0));
await rec.clip('hud-frost', { frames: 1, ui: 'full', cam: { keys: [[0, -36, -1.5]] }, description: 'Einzelbild mit voller Oberfläche: Uhrentafel „Tag 30 von 30 · Schnee 20:42 · Nacht“, Nachtleiste der Frostnacht.' });
await rec.setUi('world');
// Vorlauf: die Horde ist auf allen drei Wegen unterwegs und kurz vor der Weggabelung
let waited = 0;
for (let t = 0; t < 240; t++) {
  await rec.sim(0.5);
  waited += 0.5;
  const c = await rec.eval(() => {
    const zs = window.zomfy.zombies().filter((z) => z.state !== 'dying');
    const near = zs.filter((z) => z.x > -47 && z.x < -34);
    const lane = (z) => (z.z < -3 ? 'n' : z.z > 6 ? 's' : 'm');
    return { alive: zs.length, n: near.filter((z) => lane(z) === 'n').length, m: near.filter((z) => lane(z) === 'm').length, s: near.filter((z) => lane(z) === 's').length };
  });
  if (c.n >= 3 && c.m >= 3 && c.s >= 3) {
    console.log('Vorlauf', waited, JSON.stringify(c));
    break;
  }
  if (t === 239) console.log('Vorlauf: Zeit um', JSON.stringify(c));
}
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, -39.5, -1.6], [FRAMES - 1, -36.5, -0.8]] },
  each: () => { window.__b.keep(); },
  description: 'Frostnacht (Nacht 30, „Tag 30 von 30“), Schneefall, Ansicht weit. Die echte Welle 1 strömt aus Nord-, Mittel- und Südweg auf die Weggabelung zu (Fackeln, Lichtinseln); Türme auf der Insel zwischen den Wegen und am Südweg schießen. Kamera fährt langsam nach rechts.',
});
console.log(r.problems);
await rec.close();
process.exit(0);
