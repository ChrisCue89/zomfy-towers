// Kleine Wunder (G6, recherche/storytelling-namen.md 4.3 und 5.2): Gedanken an den Stümpfen mit
// den drei Kreuzen, das Blinken vom Sturmhuk (eine Randmarke – der Leuchtturm liegt weit
// außerhalb des Bildes, eine Lichtquelle kommt nicht dazu) und der Eisgesang des Sees nach dem
// Herz. Werte in data/wonders.js, Texte in T.wunder und T.funk.

import { BLINK, BLINK_PERIOD, GOODNIGHT, keeperAtSturmhuk, sturmhukKeeper } from '../data/wonders.js';
import { WANDERERS } from '../data/wanderers.js';
import { T } from '../data/texts.js';

export class Wonders {
  constructor(game) {
    this.game = game;
    this.clock = 0; // Takt der Blinkfolge in der Frostnacht
    this.blinkT = -1; // »Gute Nacht, Bucht«: Sekunden seit dem Start (-1: blinkt nicht)
    this.stats = { goodnights: 0, songs: 0, stumps: 0 }; // für die Prüfung
  }

  get st() {
    return this.game.state;
  }

  update(dt) {
    this.clock += dt;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      if (this.blinkT >= BLINK_PERIOD * GOODNIGHT.rounds) this.blinkT = -1;
    } else if (dt > 0) this.checkGoodnight();
  }

  // --- Der Sturmhuk ------------------------------------------------------------------

  /** Die Frostnacht beginnt: Der Sturmhuk blinkt – Edda sagt, wer die Lampe angezündet hat. */
  frostNight() {
    const st = this.st;
    st.flags.sturmhukGeblinkt = true;
    this.clock = 0;
    this.game.funk?.once('sturmhuk', keeperAtSturmhuk(st) ? T.funk.sturmhukClara : T.funk.sturmhuk);
  }

  /**
   * Gute Nacht, Bucht: Solange jemand am Sturmhuk ist, blinkt es jeden Abend ab Viertel vor acht
   * dreimal – sobald Mika draußen ist (einmal am Tag, `state.flags.sturmhukTag`).
   */
  checkGoodnight() {
    const g = this.game;
    const st = this.st;
    if (st.flags.sturmhukTag === st.time.day) return;
    const m = st.time.minute;
    if (m < GOODNIGHT.from || m >= GOODNIGHT.until) return;
    if (g.mode !== 'play' || g.viewInside || g.introRunning || g.hud.speech) return;
    const keeper = sturmhukKeeper(st);
    if (!keeper) return;
    st.flags.sturmhukTag = st.time.day;
    this.blinkT = 0;
    this.stats.goodnights++;
    g.hud.say(keeper === 'edda' ? T.wunder.gruss.edda : T.wunder.gruss.bei(WANDERERS[keeper]?.name || ''), 5);
  }

  /** Zeigt die Randmarke gerade zum Sturmhuk? (die ganze Frostnacht und beim Abendgruß) */
  blinking() {
    const g = this.game;
    if (g.viewInside) return false;
    return this.blinkT >= 0 || (g.nights.active && Boolean(g.nights.plan?.finale));
  }

  /** Brennt die Lampe gerade? Kurz, kurz, lang – dann eine Pause. */
  lampOn() {
    const t = (this.blinkT >= 0 ? this.blinkT : this.clock) % BLINK_PERIOD;
    let end = 0;
    for (let i = 0; i < BLINK.length; i++) {
      end += BLINK[i];
      if (t < end) return i % 2 === 0;
    }
    return false;
  }

  // --- Der Eisgesang -----------------------------------------------------------------

  /**
   * Der See singt beim ersten Eis: sobald die Frostnacht gehalten ist – ob das Herz fiel oder im
   * Morgengrauen erstarrte (autumn.onFrost). Nur einmal; Edda hört es am Funk mit.
   */
  sing() {
    const st = this.st;
    if (st.flags.seeGesungen) return;
    st.flags.seeGesungen = true;
    this.stats.songs++;
    this.game.sound.play('eisgesang');
    this.game.funk?.once('seeSingt', T.funk.seeSingt);
  }

  // --- Die Stümpfe -------------------------------------------------------------------

  /** Mikas Gedanke an Stumpf k: erst Staunen, nach Hildes Geschichte die Moosleute, im Schnee Ruhe. */
  stumpThought(k) {
    const st = this.st;
    const w = T.wunder.stumpf;
    this.stats.stumps++;
    const lines = this.game.autumn.snowing(st.time.day) ? w.schnee : st.flags.moosleute ? w.moosleute : w.erst;
    return lines[(st.time.day + k) % lines.length];
  }

  /** Für die Prüfung. */
  info() {
    const st = this.st;
    return {
      stumps: this.game.world.stumps.spots.map((s) => ({ ...s })),
      blinking: this.blinking(),
      lamp: this.lampOn(),
      blinkT: this.blinkT,
      keeper: sturmhukKeeper(st),
      goodnightDay: st.flags.sturmhukTag || 0,
      frostBlinked: Boolean(st.flags.sturmhukGeblinkt),
      sung: Boolean(st.flags.seeGesungen),
      stats: { ...this.stats },
      tarp: this.game.trader.boat.tarp.visible,
    };
  }
}
