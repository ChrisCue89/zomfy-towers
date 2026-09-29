// Clip `morgenbericht` (full): Morgenbericht "Nacht 5 überstanden" mit drei Sternen über warmem Morgenbild.
import { openDay, camAt } from './_common.mjs';

const FRAMES = 40;
const rec = await openDay({ hour: 6, minute: 50, day: 6, weather: 'klar', view: 'weit', ui: 'full' });
await rec.eval(() => {
  const z = window.zomfy;
  const g = z.game;
  for (const f of ['ziel_axt', 'ziel_turm', 'ziel_nacht', 'ziel_haendler', 'introGesehen']) z.setFlag(f);
  g.hud.drawGoal = () => {};
  g.hud.drawGoalMarker = () => {};
  g.hud.drawPrompt = () => {};
  const cr = g.world.crows;
  for (const c of cr.list) if (c.state === 'sitzt') cr.leave(c, true);
  z.teleport(2.2, -0.55, -1.2); // Mika steht am Feuer
  // Bericht der Nacht 5: gehalten, makellos, mutig (die Werte sind ein Beispiel, Aufbau und Texte kommen aus dem Spiel)
  g.state.report = {
    n: 5, won: true, kills: 44, turm: { name: 'Rüdiger', art: 'Bolzenwerfer', kills: 31 }, lager: { held: true },
    risk: { flawless: true, streak: 2 }, loot: { teile: 24, schrott: 3 }, homeLost: 0, homeNow: 300, homeMax: 300,
    extra: [], stars: [true, true, true],
  };
  g.hud.toasts.length = 0;
  g.showReport();
});
await rec.sim(1);
await rec.clip('morgenbericht', {
  frames: FRAMES,
  ui: 'full',
  cam: { keys: [[0, 3.4, -3.3], [FRAMES - 1, 3.0, -3.3]] },
  each: () => { window.zomfy.game.hud.toasts.length = 0; },
  description: 'Morgenbericht (volle Oberfläche): Tafel "Nacht 5 überstanden" mit Sternenzeile (Gehalten, Makellos, Mutig - alle drei golden), Zeilen zu besiegten Schlurfern, Turm der Nacht, Beute, Zuhause; darunter das warme Morgenbild (06:50, Hof, Feuer, Mika am Feuer), gerastert abgedunkelt. Kamera ganz leicht nach links. Gute Schnittpunkte: Bild 0-39 (Tafel steht ab Bild 0; "weiter"-Hinweis blinkt ab Bild ~12).',
});
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
