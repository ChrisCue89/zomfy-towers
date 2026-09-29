// Clip `frost-nacht` (+ Einzelbild `hud-frost`): Nacht 30 („Tag 30 von 30“), es schneit. Die echte Frostnacht des Spiels
// läuft (jede Welle über alle drei Wege): Die Horde zieht von links den letzten Wegabschnitt entlang auf das Lagertor
// zu; Türme (Bolzenwerfer, Feuerkatapulte), Laternenpfähle und Fackeln, Schnee. Ansicht nah, Kamera fest vorm Tor.
// `hud-frost`: ein Einzelbild mit voller Oberfläche (Uhrentafel „Tag 30 von 30 · Schnee 20:42 · Nacht“, Nachtleiste).
//   node capture/clips/b-frost-nacht.mjs            (ZT_NAME=_probe ZT_FRAMES=1 für Proben; ZT_NOHUD=1 ohne Einzelbild)
import { Rec } from '../lib.mjs';
import { prepare, placeTowers } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'frost-nacht';
const FRAMES = Number(process.env.ZT_FRAMES || 110);
const CAM = [-12.6, 0.9];

const rec = await Rec.open({ ui: 'world' });
await prepare(rec, { day: 30, hour: 20, minute: 29, weather: 'schnee', view: 'nah' });
const towers = await placeTowers(rec, [
  { type: 'bolzen', i: -15, j: -2, level: 4, spec: 'B', xp: 520 },
  { type: 'katapult', i: -12, j: -2, level: 4, spec: 'A', xp: 520 },
  { type: 'katapult', i: -14, j: 4, level: 4, spec: 'A', xp: 200 },
  { type: 'bolzen', i: -11, j: 4, level: 4, spec: 'A', xp: 200 },
  { type: 'laternenpfahl', i: -17, j: -2 },
  { type: 'laternenpfahl', i: -17, j: 4 },
]);
console.log(JSON.stringify(towers.map((t) => [t.type, t.i, t.j, t.ok, t.why])));
await rec.eval(() => {
  const Z = window.zomfy;
  const g = Z.game;
  g.autumn.frostNow = true; // Schnee fällt (in der Frostnacht ab der dritten Phase des Herzens)
  g.state.tools.axt = true; // kein Axt-Auftrag in der Zieltafel
  g.world.props.axe.object.visible = false;
  g.addToHotbar('axt');
  // Wall und Tor: Bohlenwand, am Tor Laterne und Dornen
  const camp = Z.camp();
  for (const c of camp) for (let k = 0; k < 2; k++) Z.upgradeCamp(c.id);
  const tor = camp.find((c) => c.type === 'tor');
  Z.addGear(tor.id, 'laterne');
  Z.addGear(tor.id, 'dornen');
  Z.teleport(-5.2, 3.4, 4.2); // Mika steht hinter dem Wall, außerhalb des Bildes
  g.nights.enabled = true; // Frostnacht beginnt um 20:30 (Plan: jede Welle über alle drei Wege)
});
await rec.sim(3); // Nacht beginnt, Welle 1 wird angesagt
if (!process.env.ZT_NOHUD) {
  // Einzelbild mit voller Oberfläche: Uhrentafel, Nachtleiste
  await rec.eval(() => {
    window.zomfy.setTime(20, 42);
    window.zomfy.game.hud.toasts.length = 0;
  });
  await rec.sim(0.5);
  await rec.eval(() => (window.zomfy.game.hud.toasts.length = 0));
  await rec.clip('hud-frost', { frames: 1, ui: 'full', cam: { keys: [[0, CAM[0], CAM[1]]] }, description: 'Einzelbild mit voller Oberfläche: Uhrentafel „Tag 30 von 30 · Schnee 20:42 · Nacht“, Nachtleiste der Frostnacht („Aus: Nordweg, Mittelweg und Südweg“).' });
  await rec.setUi('world');
}
// Vorlauf: die Horde (echte Welle) zieht dichter Pulk auf das Tor zu
let waited = 0;
for (let t = 0; t < 400; t++) {
  await rec.sim(0.5);
  waited += 0.5;
  const c = await rec.eval(() => {
    const zs = window.zomfy.zombies().filter((z) => z.state !== 'dying');
    return { alive: zs.length, view: zs.filter((z) => z.x > -24 && z.x < -12).length };
  });
  if (c.view >= 9) {
    console.log('Vorlauf', waited, JSON.stringify(c));
    break;
  }
  if (t === 399) console.log('Vorlauf: Zeit um', JSON.stringify(c));
}
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, CAM[0], CAM[1]], [FRAMES - 1, CAM[0] + 0.6, CAM[1]]] },
  each: () => { window.__b.keep(); },
  description: 'Frostnacht (Nacht 30, „Tag 30 von 30“), Schneefall, Ansicht nah, Kamera fest vorm Lagertor (Tor und Wall rechts, Laterne am Tor, Laternenpfähle, Fackeln). Die echte Welle 1 der Frostnacht zieht von links auf das Tor zu, Bolzenwerfer und Feuerkatapulte beiderseits des Weges schießen (Kürbisbögen, Bolzen, Brand).',
});
console.log(r.problems);
await rec.close();
process.exit(0);
