// Clip `frost-nacht` (+ Einzelbild `hud-frost`): Nacht 30 („Tag 30 von 30“), es schneit. Die echte Frostnacht des Spiels
// läuft (jede Welle über alle drei Wege): Die Horde zieht von links den letzten Wegabschnitt entlang auf das Lagertor
// zu; Türme (Bolzenwerfer, Feuerkatapulte), Laternenpfähle und Fackeln, Schnee. Ansicht nah, Kamera fest vorm Tor.
// `hud-frost`: ein Einzelbild mit voller Oberfläche (Uhrentafel „Tag 30 von 30 · Schnee 20:42 · Nacht“, Nachtleiste).
//   node capture/clips/b-frost-nacht.mjs            (ZT_NAME=_probe ZT_FRAMES=1 für Proben; ZT_NOHUD=1 ohne Einzelbild)
import { Rec } from '../lib.mjs';
import { prepare, placeTowers, snowCover } from './b-common.mjs';

const NAME = process.env.ZT_NAME || 'frost-nacht';
const FRAMES = Number(process.env.ZT_FRAMES || 110);
const CAM = [-13.6, 0.9];

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
await snowCover(rec, 0.5); // dünnere Schneedecke (kein Tarnmuster)
await rec.sim(3); // Nacht beginnt, Welle 1 wird angesagt
if (!process.env.ZT_NOHUD) {
  // Einzelbild mit voller Oberfläche: Uhrentafel, Nachtleiste
  await rec.eval(() => {
    window.zomfy.setTime(20, 42);
    window.zomfy.game.hud.toasts.length = 0;
  });
  await rec.sim(0.5);
  await rec.eval(() => (window.zomfy.game.hud.toasts.length = 0));
  await rec.clip('hud-frost', {
    frames: 1,
    ui: 'full',
    // Zielzeile, Einblendung und Hinweis stören die Uhrentafel: nach dem Setzen der Oberfläche ausblenden
    each: () => { const h = window.zomfy.game.hud; for (const n of ['drawGoal', 'drawPrompt', 'drawLabels', 'drawGoalMarker', 'drawEdgeMarkers']) h[n] = () => {}; },
    cam: { keys: [[0, CAM[0], CAM[1]]] }, description: 'Einzelbild mit voller Oberfläche: Uhrentafel „Tag 30 von 30 · Schnee 20:43 · Nacht“, Nachtleiste „Nacht 30 · Welle 1/8 · Aus: Nordweg, Mittelweg und Südweg“ (Zuhause 300/300, Tor 650/650), Vorrat oben rechts, Herzleiste, Schnellleiste und Bauleiste; ohne Zielzeile und Hinweis.',
  });
  if (process.env.ZT_ONLYHUD) {
    await rec.close();
    process.exit(0);
  }
  await rec.setUi('world');
}
// Vorlauf: die Horde (echte Welle) zieht als dichter Pulk auf das Tor zu – gewartet wird, bis ihre Spitze im Bild ist
let waited = 0;
for (let t = 0; t < 600; t++) {
  await rec.sim(0.5);
  waited += 0.5;
  const c = await rec.eval(() => {
    const zs = window.zomfy.zombies().filter((z) => z.state !== 'dying');
    return { alive: zs.length, view: zs.filter((z) => z.x > -19 && z.x < -8).length, back: zs.filter((z) => z.x > -26 && z.x <= -19).length };
  });
  if (c.view >= 8 && c.back >= 6) {
    console.log('Vorlauf', waited, JSON.stringify(c));
    break;
  }
  if (t === 599) console.log('Vorlauf: Zeit um', JSON.stringify(c));
}
const r = await rec.clip(NAME, {
  frames: FRAMES,
  cam: { keys: [[0, CAM[0], CAM[1]], [FRAMES - 1, CAM[0] + 0.6, CAM[1]]] },
  each: () => { window.__b.keep(); },
  description: 'Frostnacht (Nacht 30, „Tag 30 von 30“, Schnee), Ansicht nah, Kamera fährt langsam (0,6 m) nach rechts vorm Lagertor (Tor und Wall am rechten Rand). Die ECHTE Frostnacht läuft (Welle 1 und die zweite Welle mit dem Moderherz, Lebensbalken „Das Moderherz“ oben): von links zieht ein dichter Pulk aus Schwärmern, Brummern und Schlurfern den Weg entlang auf die Türme zu (Bild 36-109 mit 15-20 Figuren im Bild, davor 2-6). Zwei Bolzenwerfer (Bolzen sichtbar, Repetierer), zwei Feuer-Katapulte (Kürbisbögen, Brand-Symbole), Laternenpfähle und Fackel als Lichtinseln. Zwei Brummer stehen hinten am Tor. Schneedecke am Boden für die Aufnahme auf 50 % gedünnt, Schneeflocken wie im Spiel. Beste Schnitte: 30-70 und 70-109 (Pulk und Bögen).',
});
console.log(r.problems);
await rec.close();
process.exit(0);
