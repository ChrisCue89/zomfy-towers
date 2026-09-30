// Das Tutorial ist Edda (N5, Probespiel 29.09.: »dann lernen wir alles über die Frau
// mit dem Funkgerät – das ist unser Tutorial; man muss es am Anfang überspringen
// können«). Mit Einführung (Titelbild, state.tutorial.on) erklärt Edda über Funk eins
// nach dem anderen: erst laufen, dann jedes Ziel, wenn es an der Reihe ist, und jede
// Sache, wenn man sie zum ersten Mal braucht (teach). Ohne Einführung schweigt sie
// dazu – ihre Geschichte (Haus, erste Nacht, Balduin, Frost) erzählt sie trotzdem.

import { T } from '../data/texts.js';

/** So weit muss Mika laufen, bis Edda das erste Ziel nennt (m). */
const WALK = 4;

export class Tutorial {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.walkFrom = null; // Stelle, ab der das Laufen zählt
  }

  /** Einführung an? (alte Stände ohne Eintrag: aus) */
  get on() {
    return this.game.state.tutorial?.on === true;
  }

  /** Nach der Ankunft: der erste Schritt – laufen. */
  begin() {
    if (!this.on) return;
    const p = this.game.player.position;
    this.walkFrom = { x: p.x, z: p.z };
    this.game.funk.once('laufen', T.tutorial.laufen);
  }

  /** Eine Erklärung beim ersten Mal – nur mit Einführung. */
  teach(flag, text) {
    return this.on ? this.game.funk.once(flag, text) : false;
  }

  /** Jeder Schritt im Spiel (nicht in der Einleitung). */
  update() {
    if (!this.on) return;
    const g = this.game;
    const flags = g.state.flags;
    // Erst laufen: nach einem Neuladen mitten in diesem Schritt zählt es ab hier
    if (flags.funk_laufen && !flags.funk_laufenGut) {
      const p = g.player.position;
      this.walkFrom ||= { x: p.x, z: p.z };
      if (Math.hypot(p.x - this.walkFrom.x, p.z - this.walkFrom.z) < WALK) return;
      this.walkFrom = null;
      g.funk.once('laufenGut', T.tutorial.gut);
    }
    // Jedes Ziel sagt Edda einmal an, sobald es an der Reihe ist – ist es schon erreicht, bevor
    // sie dazu kommt, fällt die Zeile weg (N10: Dose, Kamin und Feuer liegen dicht beieinander)
    const id = g.goal?.id;
    if (id && T.funk.ziele[id]) g.funk.once(`ziel_${id}`, T.funk.ziele[id], () => g.goal?.id !== id);
    for (const key of ['kiesel', 'feuerHolz']) {
      const text = T.ziele[key];
      if (g.goal?.text === text) g.funk.once(`ziel_${key}`, T.funk.ziele[key], () => g.goal?.text !== text);
    }
    // Karte und Ansicht, sobald der erste Turm steht
    if (g.world.buildings.towers.length > 0) g.funk.once('karte', T.tutorial.karte);
  }
}
