// Ein Herbst mit Ende (M25, DESIGN 8, OFFENE-FRAGEN 117): Kalender, Frostnacht
// mit dem Moderherz in drei Phasen, der erste Frost (Schnee, der Moder schläft),
// Abspann und danach die Wahl – weiterspielen oder eine neue Runde. Werte in
// data/autumn.js; der Wellenplan kennt die Frostnacht (data/waves.js).

import { AUTUMN, FINALE, isFinaleNight, isRogueNight, isSnowDay } from '../data/autumn.js';
import { T } from '../data/texts.js';
import { SURVIVOR_ORDER, SURVIVORS } from '../data/survivors.js';
import { ENTRY_NAMES } from '../world/pathing.js';
import { P, hexToCss } from '../render/palette.js';
import { COLORS } from '../ui/ui.js';
import { measure } from '../ui/font.js';

/** Abspann: so viele Oberflächenpixel je Sekunde, Abstand der Zeilen; Kamerafahrt über die verschneite Bucht. */
const CREDITS = { speed: 16, fast: 5, line: 12, gap: 10, spots: ['haus', 'zusammen', 'unterholz', 'wald', 'haus'], spotTime: 9 };

export class Autumn {
  constructor(game) {
    this.game = game;
    this.heart = null; // das Moderherz, solange es lebt
    this.heartFell = false; // in dieser Frostnacht gefällt (sonst erstarrt es im Morgengrauen)
    this.frostNow = false; // Schnee schon in der Frostnacht (ab der dritten Phase)
    this.credits = null; // laufender Abspann { y, lines }
    this.collapse = null; // das gefallene Herz: im nächsten Schritt zerfällt die Horde
    this.stats = { phases: 0, calls: 0 }; // für die Prüfung
  }

  get st() {
    return this.game.state.autumn;
  }

  /** Art des Wellenplans für Nacht n (null = wie immer). */
  planMode(n) {
    if (isFinaleNight(n, this.st)) return 'finale';
    if (isRogueNight(n, this.st)) return 'rogue';
    return null;
  }

  /** Tag in der Uhr: im Herbst »Tag 12 von 30«, danach nur der Tag. */
  dayLabel(day) {
    return this.st.frost ? `${T.tag} ${day}` : T.herbst.tagVon(day, AUTUMN.days);
  }

  /** Liegt heute (bzw. gerade in der Frostnacht) Schnee? */
  snowing(day) {
    return this.frostNow || isSnowDay(day, this.st);
  }

  /** Schläft der Moder? (Nach dem Frost glimmt er nicht mehr – im Schnee gar nicht, danach nur schwach.) */
  moderGlow(day) {
    if (!this.st.frost && !this.frostNow) return 1;
    return isSnowDay(day, this.st) || this.frostNow ? 0 : 0.5;
  }

  /** Ansage am Morgen: die letzten Tage vor dem Frost zählen herunter. */
  morningLine(day) {
    if (this.st.frost) return null;
    const left = AUTUMN.days - day;
    if (left === 0) return T.herbst.heuteFrost;
    if (day >= AUTUMN.countdownFrom && left > 0) return T.herbst.nochNaechte(left);
    return null;
  }

  // --- Die Frostnacht ----------------------------------------------------------------

  beginNight(n) {
    this.heart = null;
    this.heartFell = false;
    this.frostNow = false;
    if (this.planMode(n) === 'finale') this.game.hud.toast(T.herbst.frostnacht, 'warnung', 7);
  }

  /** Das Herz ist da: Banner, Hinweis, erste Phase. */
  onHeart(z) {
    this.heart = z;
    z.boss.phase = 1;
    z.boss.attacks = ['wurzeln'];
    this.game.rig.shake = Math.max(this.game.rig.shake || 0, 0.4);
  }

  /** Jeder Spielschritt: Phasen des Herzens nach seinem Leben. */
  update(dt) {
    if (this.collapse) {
      this.collapseHorde(this.collapse);
      this.collapse = null;
    }
    const z = this.heart;
    if (!z) return;
    if (z.state === 'dying' || !this.game.horde.list.includes(z)) {
      this.heart = null;
      return;
    }
    const r = z.hp / z.maxHp;
    const b = z.boss;
    if (b.phase === 1 && r <= FINALE.phases[0]) {
      b.phase = 2;
      b.attacks = ['wurzeln', 'sporen'];
      this.game.hud.showBanner(T.herbst.ruf);
      this.call();
    } else if (b.phase === 2 && r <= FINALE.phases[1]) {
      b.phase = 3;
      z.speed *= FINALE.frostSlow;
      this.frostNow = true; // es beginnt zu schneien – der Frost kommt
      this.game.hud.showBanner(T.herbst.frostKommt);
      this.game.hud.toast(T.herbst.frostHinweis, 'schnee', 6);
      this.call();
    }
  }

  /** Das Herz ruft die Horde: über jeden Weg ein Pulk Schwärmer. */
  call() {
    const g = this.game;
    const p = g.nights.plan;
    for (const entry of ENTRY_NAMES) g.nights.spawnGroup('schwaermer', entry, FINALE.pulk, { hpFactor: p ? p.hpFactor : 1, speedFactor: p ? p.speedFactor : 1, lootFactor: p ? p.lootFactor : 1 });
    this.stats.phases++;
    this.stats.calls += ENTRY_NAMES.length;
    g.sound.play('welle');
  }

  /** Das Herz fällt: Der Moder bricht zusammen – im nächsten Schritt zerfällt alles zu Staub. */
  heartDown(z) {
    const g = this.game;
    this.heart = null;
    this.heartFell = true;
    this.frostNow = true;
    this.collapse = z; // erst im nächsten Schritt (mitten in einer Schleife über die Horde wäre es gefährlich)
    g.nights.queue.length = 0;
    if (g.nights.plan) g.state.night.wave = g.nights.plan.waves.length;
    g.hud.showBanner(T.herbst.herzFaellt);
    g.sound.play('jubel');
  }

  /** Alles, was noch lebt, zerfällt zu Staub; nur das Herz sinkt noch zusammen. */
  collapseHorde(z) {
    const g = this.game;
    const list = g.horde.list;
    for (const o of list) if (o !== z && o.state !== 'dying') g.effects.dust(o.x, o.z, 0.8, 8);
    const keep = list.filter((o) => o === z);
    list.length = 0;
    list.push(...keep);
    g.horde.pods.length = 0;
  }

  /**
   * Die Frostnacht ist gehalten (das Herz fiel oder erstarrte im Morgengrauen):
   * Der erste Frost ist da. Gibt die Zeile für den Morgenbericht zurück.
   */
  onFrost(night) {
    const st = this.st;
    if (st.frost) return null;
    st.frost = night.n;
    this.frostNow = true;
    if (!this.heartFell) this.game.hud.showBanner(T.herbst.herzErstarrt); // im Morgengrauen erstarrt
    return { heart: this.heartFell };
  }

  // --- Abspann und Wahl -------------------------------------------------------------

  /** Nach dem Morgenbericht der Frostnacht: einmal der Abspann. true = er läuft. */
  afterReport() {
    const st = this.st;
    if (!st.frost || st.credits) return false;
    this.startCredits();
    return true;
  }

  startCredits() {
    const g = this.game;
    this.credits = { y: g.ui.height + 8, lines: this.creditLines(), t: 0 };
    g.mode = 'abspann';
  }

  /** Die Zeilen des Abspanns – mit den Menschen und Zahlen dieses Herbsts. */
  creditLines() {
    const st = this.game.state;
    const C = T.herbst.abspann;
    const lines = [{ text: C.titel, big: true }, { text: C.untertitel, dim: true }, { gap: true }];
    lines.push({ text: C.bucht, head: true }, { text: st.player.name || 'Mika' });
    const people = SURVIVOR_ORDER.filter((id) => (st.survivors[id]?.stage || 0) >= 2).map((id) => SURVIVORS[id].name);
    for (const name of people) lines.push({ text: name });
    lines.push({ text: C.balduin }, { gap: true });
    const towers = this.game.world.buildings.towers.filter((b) => (b.kills || 0) > 0).sort((a, b) => (b.kills || 0) - (a.kills || 0)).slice(0, 3);
    if (towers.length) {
      lines.push({ text: C.tuerme, head: true });
      for (const t of towers) lines.push({ text: C.turm(this.game.towerRanks.nameOf(t), t.kills) });
      lines.push({ gap: true });
    }
    const s = st.stats;
    lines.push({ text: C.zahlen, head: true });
    lines.push({ text: C.naechte(s.nightsWon || 0) }, { text: C.besiegt(s.kills || 0) }, { text: C.bosse(s.bosses || 0) });
    lines.push({ gap: true }, { text: C.von, head: true }, { text: C.studio }, { gap: true }, { text: C.danke, big: true }, { gap: true }, { text: C.weiter, dim: true });
    return lines;
  }

  /** Abspann weiterlaufen lassen; E, Enter oder Leertaste beschleunigen, Esc springt ans Ende. */
  updateCredits(dt, input) {
    const c = this.credits;
    if (!c) return;
    const fast = input.isDown('confirm') || input.isDown('use');
    c.t += dt * (fast ? CREDITS.fast : 1);
    c.y -= dt * CREDITS.speed * (fast ? CREDITS.fast : 1);
    const height = this.creditsHeight();
    if (input.pressed('menu') || c.y + height < -8) this.endCredits();
  }

  /** Wohin die Kamera im Abspann schaut: Haus, Zusammenfluss, Unterholz, Waldrand – und zurück. */
  creditsLook() {
    const c = this.credits;
    if (!c) return null;
    return CREDITS.spots[Math.min(CREDITS.spots.length - 1, Math.floor(c.t / CREDITS.spotTime))];
  }

  creditsHeight() {
    let h = 0;
    for (const l of this.credits.lines) h += l.gap ? CREDITS.gap : l.big ? CREDITS.line * 2 + 4 : CREDITS.line;
    return h;
  }

  /** Abspann vorbei: Die Wahl nach dem Herbst (ein Dialog mit zwei Antworten). */
  endCredits() {
    const g = this.game;
    this.credits = null;
    this.st.credits = true;
    g.mode = 'play';
    g.quietSave();
    // »Neue Runde« fragt noch einmal nach – vorgewählt ist das Bleiben
    g.startDialog('nachDemHerbst', (a) => (a === 'neu' ? g.startDialog('neueRundeSicher', (b) => this.choose(b === 'neu' ? 'neu' : 'weiter')) : this.choose('weiter')));
  }

  /** Antwort im Dialog nach dem Herbst. */
  choose(answer) {
    const g = this.game;
    if (answer === 'weiter') {
      this.st.mode = 'weiter';
      g.hud.toast(T.herbst.weiterGewaehlt, 'mond', 6);
      g.quietSave();
    } else if (answer === 'neu') {
      g.newRound();
    }
  }

  drawCredits(ui) {
    const c = this.credits;
    if (!c) return;
    // Nur ein Band hinter den Zeilen abdunkeln – links und rechts bleibt die verschneite Bucht klar
    const cx = Math.round(ui.width / 2);
    const band = 150;
    ui.ditherRect(cx - band, 0, band * 2, ui.height, 0.55, COLORS.night);
    ui.ditherRect(cx - band - 12, 0, 12, ui.height, 0.25, COLORS.night);
    ui.ditherRect(cx + band, 0, 12, ui.height, 0.25, COLORS.night);
    let y = Math.round(c.y);
    for (const l of c.lines) {
      if (l.gap) {
        y += CREDITS.gap;
        continue;
      }
      if (l.big) {
        if (y > -30 && y < ui.height + 4) this.game.drawBigText(ui, l.text, cx, y, 2, COLORS.gold);
        y += CREDITS.line * 2 + 4;
        continue;
      }
      if (y > -12 && y < ui.height + 4) ui.textCentered(l.text, cx, y, l.head ? COLORS.gold : l.dim ? COLORS.textDim : COLORS.text);
      y += CREDITS.line;
    }
    const hint = T.herbst.abspann.taste;
    ui.text(hint, ui.width - measure(hint) - 6, ui.height - 12, hexToCss(P.s6));
  }

  /** Für die Prüfung. */
  view() {
    const z = this.heart;
    return {
      frost: this.st.frost,
      mode: this.st.mode,
      credits: this.st.credits,
      abspann: this.credits ? { y: Math.round(this.credits.y), lines: this.credits.lines.filter((l) => l.text).map((l) => l.text) } : null,
      heart: z ? { hp: Math.round(z.hp), max: Math.round(z.maxHp), phase: z.boss.phase, x: +z.x.toFixed(2), z: +z.z.toFixed(2) } : null,
      heartFell: this.heartFell,
      frostNow: this.frostNow,
      stats: { ...this.stats },
    };
  }
}
