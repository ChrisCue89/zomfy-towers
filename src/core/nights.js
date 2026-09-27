// Tag und Nacht der Horde (DESIGN.md 5, 6.10, 6.12): Tagsüber einzelne,
// träge Schlurfer und ab Tag 2 ein kleiner Trupp; ab 20:30 kommt die Horde in
// Wellen. Ist die letzte Welle besiegt (oder bricht der Morgen an), ist die
// Nacht geschafft. Bricht die Horde durch, ist sie verloren – mit Folgen,
// aber nie mit Spielende. Am Morgen gibt es einen Bericht.

import { T } from '../data/texts.js';
import { planNight, planDay, NIGHT_START, NIGHT_END } from '../data/waves.js';
import { ENTRY_NAMES } from '../world/pathing.js';
import { HOUSE_LEVELS } from '../data/buildings.js';

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

  ensurePlans() {
    const st = this.game.state;
    const day = st.time.day;
    if (!this.dayPlan || this.dayPlan.day !== day) this.dayPlan = { day, events: planDay(day, this.seed(), ENTRY_NAMES) };
    if (this.state.n === day && (!this.plan || this.plan.night !== day)) this.plan = planNight(day, this.seed(), ENTRY_NAMES);
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

    // Die Nacht beginnt (danach ist st.night ein neues Objekt – erst hier lesen)
    if (minute >= NIGHT_START && this.state.n !== st.time.day) this.beginNight(st.time.day);
    const night = this.state;

    if (this.active) {
      const plan = this.plan;
      while (night.wave < plan.waves.length && minute >= plan.waves[night.wave].at) {
        const wave = plan.waves[night.wave];
        night.wave++;
        for (const s of wave.spawns) this.queue.push({ ...s });
        // Das Banner sagt es groß (Welle und Richtung), die Nachtleiste behält es –
        // eine zusätzliche Meldung lag nur darüber (m3-r2)
        g.hud.showBanner(`${T.horde.welleKurz(night.wave, plan.waves.length)} · ${wave.entries.map((e) => T.horde.richtungKurz[e]).join(T.horde.und)}`);
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

    // Warteschlange abarbeiten
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const s = this.queue[i];
      s.delay -= dt;
      if (s.delay > 0) continue;
      this.queue.splice(i, 1);
      this.spawnGroup(s.type, s.entry, 1, { hpFactor: this.plan ? this.plan.hpFactor : 1 });
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

  spawnGroup(type, entryName, count, { day = false, hpFactor = 1 } = {}) {
    const g = this.game;
    const entry = g.world.pathing.entries[entryName];
    for (let k = 0; k < count; k++) {
      const jitter = (k - (count - 1) / 2) * 0.7;
      const from = { x: entry.from.x + jitter, z: entry.from.z + jitter * 0.5 };
      g.horde.spawn(type, { from, entry, hpFactor, day });
    }
  }

  beginNight(n) {
    const st = this.game.state;
    this.plan = planNight(n, this.seed(), ENTRY_NAMES);
    this.queue.length = 0;
    // Was Streuner schon vor der Nacht abgenagt haben, nennt der Morgenbericht extra
    const preLoss = st.world.dayEvents?.day === n ? Math.round(st.world.dayEvents.lost || 0) : 0;
    st.night = { n, wave: 0, done: false, won: false, kills: 0, loot: {}, homeStart: st.world.homeHp, preLoss, lost: false };
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
    return this.queue.map((s) => ({ type: s.type, entry: s.entry, delay: +s.delay.toFixed(1) }));
  }

  load(queue) {
    this.queue = (queue || []).filter((s) => s && s.type && ENTRY_NAMES.includes(s.entry)).map((s) => ({ ...s }));
  }
}
