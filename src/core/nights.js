// Tag und Nacht der Horde (DESIGN.md 5, 6.10, 6.12): Tagsüber einzelne,
// träge Schlurfer und ab Tag 2 ein kleiner Trupp; ab 20:30 kommt die Horde in
// Wellen. Ist die letzte Welle besiegt (oder bricht der Morgen an), ist die
// Nacht geschafft. Bricht die Horde durch, ist sie verloren – mit Folgen,
// aber nie mit Spielende. Am Morgen gibt es einen Bericht.

import { T } from '../data/texts.js';
import { planNight, planDay, NIGHT_START, NIGHT_END, MUT_BONUS } from '../data/waves.js';
import { ENTRY_NAMES } from '../world/pathing.js';
import { HOUSE_LEVELS, BUILDINGS } from '../data/buildings.js';
import { towerStatsOf } from '../data/towers.js';

/** So viele Spielminuten vor der Nacht sagt Mika, wenn am Weg der ersten Welle kein Turm steht. */
const COVER_WARN_AHEAD = 60;
/** Nachtplan (M16): so viele Minuten vor der Horde erscheint er, höchstens so viele Zeilen. */
const PLAN_AHEAD = 60;
const PLAN_ROWS = 4;
/** Arten, die der Nachtplan mit Juna nennt (die übrigen sind der Normalfall). */
const HEAVY = ['anfuehrer', 'brummer', 'leuchtpilz'];

export class Nights {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.plan = null; // Plan der laufenden Nacht
    this.dayPlan = null;
    this.queue = []; // noch zu erscheinende Schlurfer { type, entry, delay }
    this.enabled = true; // aus nur für Prüf-Bilder (window.zomfy.setHorde)
    this.lastMinute = null; // für Zeitsprünge (Ausruhen, Werkeln)
    this.finishedAt = -99; // wann die letzte Nacht endete (game.clock)
    this.coverWarned = null; // »Tag|Welle«, für die schon vor ungedeckten Wegen gewarnt wurde
  }

  /**
   * Waldpfade (aus `entries`), an deren Weg bis zum Haus kein schießender Turm
   * steht (m7-r1: Mira wusste nicht, welche Wege offen sind – ein Trupp kam
   * dann ungehindert ans Haus).
   */
  uncovered(entries) {
    const g = this.game;
    const towers = g.world.buildings.list
      .filter((b) => BUILDINGS[b.type].tower && b.hp > 0)
      .map((b) => ({ x: b.i + 0.5, z: b.j + 0.5, s: towerStatsOf(b) }))
      .filter((t) => t.s.damage > 0);
    return entries.filter((name) => {
      const path = g.world.pathing.trace(name);
      return !towers.some((t) => path.some((p) => (p.x - t.x) ** 2 + (p.z - t.z) ** 2 <= t.s.range * t.s.range));
    });
  }

  /** Einmal je Welle: Liegt ihr Weg ohne Turm, sagt es Mika (abends) bzw. eine Meldung (nachts). */
  warnUncovered(day, waveIndex, entries, evening) {
    const key = `${day}|${waveIndex}`;
    if (this.coverWarned === key) return;
    this.coverWarned = key;
    const open = this.uncovered(entries);
    if (!open.length) return;
    const woher = open.map((e) => T.horde.richtung[e]).join(T.horde.und);
    if (evening) this.game.hud.say(T.horde.ungedecktAbend(woher), 6);
    else this.game.hud.toast(T.horde.ungedeckt(woher), 'warnung', 4.5);
  }

  get state() {
    return this.game.state.night;
  }

  /** Läuft gerade die Horde (Nacht begonnen, noch nicht geschafft)? */
  get active() {
    return this.state.n === this.game.state.time.day && !this.state.done;
  }

  /** Darf man schlafen? Erst, wenn die Nacht dieses Tages vorbei ist. */
  canSleep() {
    const st = this.game.state;
    return this.state.n === st.time.day && this.state.done;
  }

  seed() {
    return this.game.world.seed;
  }

  /** Plan der Nacht von Tag `day` – mit der gewählten Schwierigkeit (M16). */
  planFor(day) {
    return planNight(day, this.seed(), ENTRY_NAMES, this.game.state.difficulty);
  }

  ensurePlans() {
    const st = this.game.state;
    const day = st.time.day;
    if (!this.dayPlan || this.dayPlan.day !== day) this.dayPlan = { day, events: planDay(day, this.seed(), ENTRY_NAMES) };
    if (this.state.n === day && (!this.plan || this.plan.night !== day)) {
      this.plan = this.planFor(day);
      // Nach dem Neuladen: früh gerufene Wellen (M16) haben die späteren vorgezogen
      const shift = this.state.shift || 0;
      if (shift) for (let i = this.state.wave; i < this.plan.waves.length; i++) this.plan.waves[i].at -= shift;
    }
  }

  /**
   * Welle rufen (M16): nachts in der Pause, wenn die Welle davor besiegt ist.
   * Die nächste kommt sofort, alle späteren rücken um dieselbe Zeit vor.
   */
  canCall() {
    const night = this.state;
    return this.active && Boolean(this.plan) && night.wave > 0 && night.wave < this.plan.waves.length && this.game.horde.alive === 0 && !this.queue.length;
  }

  callNext() {
    if (!this.canCall()) return false;
    const night = this.state;
    const delta = this.plan.waves[night.wave].at - this.game.state.time.minute;
    if (delta < 1) return false;
    for (let i = night.wave; i < this.plan.waves.length; i++) this.plan.waves[i].at -= delta;
    this.plan.waves[night.wave].called = true;
    night.shift = (night.shift || 0) + delta;
    night.called = (night.called || 0) + 1;
    return true;
  }

  /**
   * Nachtplan (M16): eine Stunde vor der Horde die ganze Nacht im Voraus, nachts
   * in jeder Pause die nächsten Wellen – Uhrzeit und Wege; ist Juna eingezogen,
   * auch die schweren Arten (wie ihr Funkspruch am Morgen). Null = nichts zeigen.
   */
  planView() {
    const g = this.game;
    const st = g.state;
    const minute = st.time.minute;
    let plan = null;
    let from = 0;
    if (this.active) {
      if (!this.canCall()) return null; // während einer Welle genügt die Nachtleiste
      plan = this.plan;
      from = this.state.wave;
    } else if (this.state.n !== st.time.day && minute >= NIGHT_START - PLAN_AHEAD && minute < NIGHT_START) {
      plan = this.planFor(st.time.day);
    } else return null;
    const juna = Boolean(g.survivors?.resident('juna'));
    const rows = plan.waves.slice(from, from + PLAN_ROWS).map((w, k) => ({
      n: from + k + 1,
      at: w.at,
      entries: w.entries,
      heavy: juna ? HEAVY.filter((t) => w.spawns.some((s) => s.type === t)) : [],
    }));
    return { total: plan.waves.length, rows, more: Math.max(0, plan.waves.length - from - rows.length), canCall: this.active, juna };
  }

  /**
   * Woher die nächste Welle kommt (M16, Randmarken): abends die erste, nachts in
   * der Pause die nächste. Während eine Welle läuft, zeigen die Pfeile die Horde selbst.
   */
  nextEntries() {
    const view = this.planView();
    return view && view.rows.length ? { n: view.rows[0].n, entries: view.rows[0].entries } : null;
  }

  /** Zeitraffer (M16): nur nachts, solange die Horde kommt. */
  get fastAllowed() {
    return this.active;
  }

  /** Pro Spielschritt (nur wenn die Zeit läuft). */
  update(dt) {
    if (!this.enabled) return;
    const g = this.game;
    const st = g.state;
    const minute = st.time.minute;
    this.ensurePlans();

    // Tagesschlurfer. Nach einem Zeitsprung (Ausruhen, Werkeln) kommt nicht alles
    // Verpasste auf einmal – wer ruht, verpasst die Streuner.
    const jumped = this.lastMinute !== null && minute - this.lastMinute > 20;
    this.lastMinute = minute;
    if (minute < NIGHT_START) {
      const today = st.world.dayEvents?.day === st.time.day ? st.world.dayEvents : null;
      const done = today ? today.done : 0;
      const events = this.dayPlan.events;
      let k = done;
      while (k < events.length && minute >= events[k].at) {
        const e = events[k];
        if (!jumped) {
          this.spawnGroup('schlurfer', e.entry, e.count, { day: true });
          if (e.count > 1) g.hud.toast(T.horde.trupp(T.horde.richtung[e.entry]), 'warnung', 3.5);
        }
        k++;
      }
      st.world.dayEvents = { day: st.time.day, done: k, lost: today?.lost || 0 };
    }

    // Eine Stunde vor der Horde: Kommt die erste Welle über einen Weg ohne Turm?
    if (this.enabled && minute >= NIGHT_START - COVER_WARN_AHEAD && minute < NIGHT_START && this.state.n !== st.time.day && this.coverWarned !== `${st.time.day}|0`) {
      const first = this.planFor(st.time.day).waves[0];
      if (first) this.warnUncovered(st.time.day, 0, first.entries, true);
    }

    // Die Nacht beginnt (danach ist st.night ein neues Objekt – erst hier lesen)
    if (minute >= NIGHT_START && this.state.n !== st.time.day) this.beginNight(st.time.day);
    const night = this.state;

    if (this.active) {
      const plan = this.plan;
      while (night.wave < plan.waves.length && minute >= plan.waves[night.wave].at) {
        const wave = plan.waves[night.wave];
        night.wave++;
        for (const s of wave.spawns) this.queue.push({ ...s, bonus: Boolean(wave.called) });
        // Das Banner sagt es groß (Welle und Richtung), die Nachtleiste behält es –
        // eine zusätzliche Meldung lag nur darüber (m3-r2)
        g.hud.showBanner(`${T.horde.welleKurz(night.wave, plan.waves.length)} · ${wave.entries.map((e) => T.horde.richtungKurz[e]).join(T.horde.und)}`);
        g.sound.play('welle');
        g.player.express('staunen', 1.4); // da kommen sie (M12)
        // Die erste Welle überhaupt: Mikas Laternenblitz vorstellen (M16)
        if (!st.flags.blitzHinweis) {
          st.flags.blitzHinweis = true;
          g.hud.toast(T.faehigkeiten.blitzHinweis, 'blitz', 6);
        }
      }
      // Morgengrauen: Wer noch da ist, flieht in den Wald
      if (minute >= NIGHT_END) {
        this.queue.length = 0;
        g.horde.list.forEach((z) => {
          if (z.state !== 'dying') g.effects.dust(z.x, z.z, 0.8, 8);
        });
        g.horde.clear();
        night.wave = plan.waves.length;
      }
    }

    // Zwischen den Wellen: Die nächste kommt über einen Weg ohne Turm?
    if (this.active && night.wave > 0 && night.wave < this.plan.waves.length && g.horde.alive === 0 && !this.queue.length) {
      this.warnUncovered(night.n, night.wave, this.plan.waves[night.wave].entries, false);
    }

    // Warteschlange abarbeiten
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const s = this.queue[i];
      s.delay -= dt;
      if (s.delay > 0) continue;
      this.queue.splice(i, 1);
      const p = this.plan;
      this.spawnGroup(s.type, s.entry, 1, { hpFactor: p ? p.hpFactor : 1, speedFactor: p ? p.speedFactor : 1, lootFactor: (p ? p.lootFactor : 1) * (s.bonus ? MUT_BONUS : 1) });
    }

    // Geschafft?
    if (this.active && night.wave >= this.plan.waves.length && !this.queue.length && g.horde.alive === 0) this.finishNight(true);
  }

  /**
   * »aus dem Westen« für die laufende Welle; ist sie besiegt und kommt noch
   * eine, deren Richtung (»Gleich: Osten«). Null, wenn nichts mehr kommt.
   */
  directionText() {
    const plan = this.plan;
    const night = this.state;
    if (!plan || !this.active) return null;
    const names = (wave) => wave.entries.map((e) => T.horde.richtungKurz[e]).join(T.horde.und);
    const cleared = this.game.horde.alive === 0 && !this.queue.length;
    if ((cleared || night.wave === 0) && night.wave < plan.waves.length) return T.horde.gleich(names(plan.waves[night.wave]));
    if (night.wave > 0 && !cleared) return T.horde.aus(names(plan.waves[night.wave - 1]));
    return null;
  }

  spawnGroup(type, entryName, count, { day = false, hpFactor = 1, speedFactor = 1, lootFactor = 1 } = {}) {
    const g = this.game;
    const entry = g.world.pathing.entries[entryName];
    for (let k = 0; k < count; k++) {
      const jitter = (k - (count - 1) / 2) * 0.7;
      const from = { x: entry.from.x + jitter, z: entry.from.z + jitter * 0.5 };
      g.horde.spawn(type, { from, entry, hpFactor, speedFactor, lootFactor, day });
    }
  }

  beginNight(n) {
    const st = this.game.state;
    this.plan = this.planFor(n);
    this.queue.length = 0;
    // Was Streuner schon vor der Nacht abgenagt haben, nennt der Morgenbericht extra
    const preLoss = st.world.dayEvents?.day === n ? Math.round(st.world.dayEvents.lost || 0) : 0;
    st.night = { n, wave: 0, done: false, won: false, kills: 0, loot: {}, homeStart: st.world.homeHp, preLoss, lost: false, shift: 0, called: 0, towers: {} };
    this.game.hud.toast(T.horde.nachtBeginnt(n), 'mond', 4);
    if (n % 5 === 0) this.game.hud.toast(T.horde.anfuehrerNacht, 'warnung', 5);
  }

  /** Nacht beenden: gewonnen (letzte Welle besiegt, Morgengrauen) oder verloren. */
  finishNight(won) {
    const g = this.game;
    const st = g.state;
    const night = st.night;
    if (night.done) return;
    night.done = true;
    night.won = won;
    this.finishedAt = g.clock; // Gedanken danach erst mit etwas Abstand (m3-r2: Textstau)
    this.queue.length = 0;
    if (won) {
      st.stats.nightsWon = (st.stats.nightsWon || 0) + 1;
      g.hud.toast(T.horde.geschafft(night.n), 'haus', 5);
      g.hud.showBanner(T.horde.geschafftKurz);
      g.sound.play('morgen');
      g.survivors?.onNightEnd(); // Bert flickt die Türme
    } else {
      st.stats.nightsLost = (st.stats.nightsLost || 0) + 1;
    }
    st.report = {
      n: night.n,
      won,
      kills: night.kills,
      loot: { ...night.loot },
      homeLost: night.fell ? Math.round(night.homeStart) : Math.max(0, Math.round(night.homeStart - st.world.homeHp)),
      fell: Boolean(night.fell),
      homeNow: Math.round(st.world.homeHp),
      homeMax: HOUSE_LEVELS[st.world.houseLevel].hp,
      preLoss: night.preLoss || 0,
      losses: night.losses || null,
      damaged: night.damaged || null,
      broken: night.broken || 0,
      turm: g.towerRanks?.bestOfNight() || null, // Turm der Nacht (M16)
      // M17: Tor und Wall – gehalten oder durchbrochen, wie viele im Lager waren, was umgeworfen wurde
      lager: night.breach ? { at: night.breach.at, gate: night.breach.gate, entered: night.inCamp || 0, raided: [...(night.raided || [])] } : night.campHit ? { held: true } : null,
    };
    g.quietSave();
  }

  /** Beim Laden: Warteschlange ist leer; Plan wird neu erstellt. */
  reset() {
    this.plan = null;
    this.dayPlan = null;
    this.queue.length = 0;
  }

  /** Zum Speichern: noch ausstehende Schlurfer der laufenden Welle. */
  toState() {
    return this.queue.map((s) => ({ type: s.type, entry: s.entry, delay: +s.delay.toFixed(1), ...(s.bonus ? { bonus: true } : {}) }));
  }

  load(queue) {
    this.queue = (queue || []).filter((s) => s && s.type && ENTRY_NAMES.includes(s.entry)).map((s) => ({ ...s }));
  }
}
