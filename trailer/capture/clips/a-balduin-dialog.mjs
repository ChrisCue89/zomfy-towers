// Clip `balduin-dialog` (full): Balduin-Dialogtafel mit Porträt am Steg; die Zeile tippt sich.
import { openDay, camAt } from './_common.mjs';

const rec = await openDay({ hour: 8, minute: 5, day: 3, weather: 'klar', view: 'nah', ui: 'full' });
await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  for (const f of ['ziel_axt', 'ziel_turm', 'ziel_nacht', 'ziel_haendler', 'introGesehen']) z.setFlag(f);
  z.give({ teile: 12 });
  g.hud.drawGoal = () => {}; // Ziel-Kasten ("Nimm die Axt …") stört hier (bleibt aus, weil clip() ohne ui-Wert läuft)
  g.hud.drawGoalMarker = () => {};
  g.hud.drawPrompt = () => {};
  g.hud.drawEdgeMarkers = () => {};
  const cr = g.world.crows;
  for (const c of cr.list) if (c.state === 'sitzt') cr.leave(c, true);
  z.teleport(15.1, -1.0, Math.PI / 2);
});
await rec.sim(2);
const tr = await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  g.hud.toasts.length = 0;
  g.trader.talk(); // wie E auf Balduin: erstes Treffen
  const d = g.dialog;
  d.shown = d.line.t.length; // erste Zeile ("Ahoi! …") überspringen, die zweite beginnt zu tippen
  d.advance();
  return { phase: z.trader().phase, open: d.active, line: d.line?.t };
});
console.log(JSON.stringify(tr));
const KEYS = [[0, 15.9, 0.45], [59, 16.05, 0.45]];
await rec.clip('balduin-dialog', {
  frames: 60,
  cam: { keys: KEYS },
  each: () => { window.zomfy.game.hud.toasts.length = 0; },
  description: 'Steg am Morgen (08:05, klar, Ansicht nah), volle Oberfläche (Uhr, Vorrat, Dialogtafel mit Balduins Porträt). Balduin steht am Steg, Mika links. Bild 0-54: Balduin tippt "Ich kaufe Zombieteile. Hände, Füße, Ohren - alles, was nachts so abfällt. Ich zahle in Schrott, Holz, Stoff, manchmal Zahnrädern." (Tipp-Klänge "tipp" als Ereignisse), danach steht die Zeile. Ziel-Kasten und Hinweise ausgeblendet.',
});
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
