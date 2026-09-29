// Clip `balduin-frag` (full): die Pointe – Balduin: "Frag nicht. Wissenschaft! Oder Kunst. Oder Suppe - nein, keine Suppe."
// Wie balduin-dialog (Steg am Morgen, Ansicht nah, volle Oberfläche), nur diese eine Zeile in der Tafel.
import { openDay } from './_common.mjs';

const rec = await openDay({ hour: 8, minute: 5, day: 3, weather: 'klar', view: 'nah', ui: 'full' });
await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  for (const f of ['ziel_axt', 'ziel_turm', 'ziel_nacht', 'ziel_haendler', 'introGesehen']) z.setFlag(f);
  z.give({ teile: 12 });
  g.hud.drawGoal = () => {};
  g.hud.drawGoalMarker = () => {};
  g.hud.drawPrompt = () => {};
  g.hud.drawEdgeMarkers = () => {};
  const cr = g.world.crows;
  for (const c of cr.list) if (c.state === 'sitzt') cr.leave(c, true);
  z.teleport(15.1, -1.0, Math.PI / 2);
});
await rec.sim(2);
// Gespräch öffnen (wie E auf Balduin) und ohne Aufnahme bis zur Pointe klicken: Zeile 1 und 2 fertig weiterschalten,
// Mikas Zwischenfrage überspringen -> Balduin beginnt "Frag nicht ..." zu tippen (Zeile 0 der Tafel).
const st = await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  g.hud.toasts.length = 0;
  g.trader.talk();
  const d = g.dialog;
  const skip = () => { d.shown = d.line.t.length; d.advance(); };
  skip(); // "Ahoi! ..." -> "Ich kaufe Zombieteile ..."
  skip(); // -> Mika "Zombieteile? Wofür um alles in der Welt ..."
  skip(); // -> Balduin "Frag nicht. ..."
  const n = g.survivors.npcs.list.get('balduin');
  n.gestures.length = 0;
  return { line: d.line?.t, s: d.line?.s, shown: d.shown, phase: z.trader().phase };
});
console.log(JSON.stringify(st));
await rec.clip('balduin-frag', {
  frames: 66,
  cam: { keys: [[0, 16.0, 0.45], [65, 16.12, 0.45]] },
  each: (i) => {
    const g = window.zomfy.game;
    g.hud.toasts.length = 0;
    // Zeile ist um Bild ~32 fertig; Balduin zuckt mit den Achseln ("Frag nicht"), wie im Spiel als Geste (npcs.gesture)
    if (i === 38) { const n = g.survivors.npcs.list.get('balduin'); g.survivors.npcs.gesture(n, 'schulter', 1.3); }
  },
  description: 'Die Pointe (Steg am Morgen 08:05, Ansicht nah, volle Oberfläche): Balduin tippt in der Dialogtafel "Frag nicht. Wissenschaft! Oder Kunst. Oder Suppe - nein, keine Suppe." (Bild 0-~32, Tipp-Klänge "tipp" als Ereignisse), danach steht die Zeile vollständig; Bild 38-60 zuckt Balduin mit den Achseln (Geste "schulter"). Nur diese eine Zeile in der Tafel, Ziel-Kasten und Hinweise ausgeblendet. Mika links, Balduin am Steg.',
});
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
