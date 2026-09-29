// Clip `karten-kamin`: Kartenabend am Kamin (bei Regen): Bert, Mika, Kamin, Karten. Warm, drinnen.
import { openDay, setupCamp } from './_common.mjs';

const FRAMES = 60;
const rec = await openDay({ hour: 18, minute: 40, day: 8, weather: 'regen', view: 'weit' });
// Innen 240 px/m (3 x 80: bleibt auf dem Pixelraster): bei 1080p füllt der Raum sonst nur die Mitte des Bildes
await rec.eval(async () => { const { CONFIG } = await import('/src/config.js'); CONFIG.render.interiorPxPerMeter = 240; });
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
  // feste Kamera (das Spiel fährt sie sonst in den ersten 1,5 s an den Tisch): etwas weiter nördlich, damit der Kamin ins Bild kommt
  cam: { keys: [[0, 312.5, 1.55], [FRAMES - 1, 312.55, 1.55]] },
  each: (i) => {
    const z = window.zomfy;
    const g = z.game;
    // Mika spielt ihre erste Karte (der Zug, den die Regel-KI wählt - derselbe Aufruf wie bei Tastendruck), sobald der Tisch bereit ist
    if (i >= 18 && !window.__mikaDone && g.cardNight.myTurn) {
      const mv = z.cardAiMove();
      if (mv && g.cardNight.mikaMove(mv)) window.__mikaDone = true;
    }
  },
  description: 'Kartenabend bei Regen (18:40) drinnen am Kamin: der Tisch wird gedeckt/gegeben (Karten fliegen), Bert (Mütze, Schnauzer) sitzt gegenüber, Mika von hinten rechts, Kamin dahinter, warmes Licht. Bild ~18+ spielt Mika ihre erste Karte, danach denkt Bert und zieht (Geste "reiben" = sein Tick). Oberflächen-Ebene (.ui.png) enthält Kartenhand, Tisch-Kopfzeile ("Bert - Partie 1") - für reine Weltbilder nur die 0000.png nehmen. Feste Kamera, Ansicht 240 px/m statt der 160 des Spiels.',
});
console.log('problems', rec.problems);
await rec.close();
process.exit(0);
