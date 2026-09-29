// Clip `karten-kamin`: Kartenabend am Kamin (bei Regen): Bert, Mika, Kamin, Karten. Warm, drinnen.
import { openDay, setupCamp } from './_common.mjs';

const FRAMES = 60;
const rec = await openDay({ hour: 18, minute: 40, day: 8, weather: 'regen', view: 'weit' });
console.log('lager', JSON.stringify(await setupCamp(rec, { ids: ['bert'], tents: [[-5, -3]] })));
const begin = await rec.eval(() => {
  const z = window.zomfy;
  z.setFlag('kartenIntro'); // (kein Einfluss, falls unbekannt)
  z.teleport(3, 2, 0);
  const ok = z.cardBegin('bert');
  z.finishDialog(); // Bert erklärt die Regeln - für die Aufnahme übersprungen
  return { ok, mode: z.game.mode, spot: z.cards().match?.spot, inside: z.game.viewInside };
});
console.log('karten', JSON.stringify(begin));
await rec.eval(() => { window.__mikaDone = false; });
await rec.clip('karten-kamin', {
  frames: FRAMES,
  ui: 'world',
  cam: null,
  each: (i) => {
    const z = window.zomfy;
    const g = z.game;
    // Mika spielt ihre erste Karte (der Zug, den die Regel-KI wählt - derselbe Aufruf wie bei Tastendruck), sobald der Tisch bereit ist
    if (i >= 18 && !window.__mikaDone && g.cardNight.myTurn) {
      const mv = z.cardAiMove();
      if (mv && g.cardNight.mikaMove(mv)) window.__mikaDone = true;
    }
  },
  description: 'Kartenabend bei Regen (18:40) drinnen am Kamin: der Tisch wird gedeckt/gegeben (Karten fliegen), Bert (Mütze, Schnauzer) sitzt gegenüber, Mika von hinten rechts, Kamin dahinter, warmes Licht. Bild ~18+ spielt Mika ihre erste Karte, danach denkt Bert und zieht (Geste "reiben" = sein Tick). Oberflächen-Ebene (.ui.png) enthält Kartenhand, Tisch-Kopfzeile ("Bert - Partie 1") - für reine Weltbilder nur die 0000.png nehmen. Kamera fährt vom Spiel selbst an den Tisch.',
});
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
