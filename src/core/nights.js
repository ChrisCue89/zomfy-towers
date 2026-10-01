// Tag und Nacht der Horde (DESIGN.md 5, 6.10, 6.12): Tagsüber einzelne,
// träge Schlurfer und ab Tag 2 ein kleiner Trupp; ab 20:30 kommt die Horde in
// Wellen. Ist die letzte Welle besiegt (oder bricht der Morgen an), ist die
// Nacht geschafft. Bricht die Horde durch, ist sie verloren – mit Folgen,
// aber nie mit Spielende. Am Morgen gibt es einen Bericht.

import { T } from '../data/texts.js';
import { planNight, planDay, applyLure, NIGHT_START, NIGHT_END, MUT_BONUS } from '../data/waves.js';
import { LURE, FLAWLESS, PANTRY } from '../data/risk.js';
import { gain } from './inventory.js';
import { bossOfNight, BOSS_ORDER as BOSS_TYPES, FINALE_BOSS } from '../data/bosses.js';
import { ENTRY_NAMES } from '../world/pathing.js';
import { HOUSE_LEVELS, BUILDINGS } from '../data/buildings.js';
import { towerStatsOf } from '../data/towers.js';
import { ABILITIES } from '../data/wanderers.js';

/** So viele Spielminuten vor der Nacht sagt Mika, wenn am Weg der ersten Welle kein Turm steht. */
const COVER_WARN_AHEAD = 60;
/** Nachtplan (M16): so viele Minuten vor der Horde erscheint er, höchstens so viele Zeilen. */
const PLAN_AHEAD = 60;
/** m16-r1: So lange vor der Nacht (ab der Tafel) ruft N schon die erste Welle – »Ich bin bereit«. */
const CALL_AHEAD = 60;
const PLAN_ROWS = 4;
/** Arten, die der Nachtplan mit Juna nennt (die übrigen sind der Normalfall). */
const HEAVY = ['anfuehrer', 'brummer', 'leuchtpilz', 'moderfalter', 'graeber', 'schildtraeger', 'lichtfresser', 'brueter', 'holzfaeller', 'pilzmutter', 'laternenhexe', 'moosriese'];

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
    const woher = T.horde.ueber(open);
    if (evening) this.game.hud.say(T.horde.ungedecktAbend(woher, open.length), 6);
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
    const plan = planNight(day, this.seed(), ENTRY_NAMES, this.game.state.difficulty, this.game.autumn?.planMode(day) || null); // M25: Frostnacht, danach neu gewürfelt
    if (this.hpMul) plan.hpFactor *= this.hpMul; // nur für den Balance-Durchlauf (tools/balance.mjs --nacht)
    // M24: Eine Moderlocke lockt in jeder Welle mehr Horde über ihren Spawn
    const lure = this.game.lureEntry?.();
    return lure ? applyLure(plan, lure, this.seed()) : plan;
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
   * Welle rufen (M16): Die nächste kommt sofort, alle späteren rücken um
   * dieselbe Zeit vor, jede früh gerufene bringt den Mutbonus. Seit m16-r1
   * schon abends ab der Tafel (die Nacht beginnt dann gleich) und nachts,
   * sobald die laufende Welle ganz unterwegs ist – nicht erst, wenn sie besiegt
   * ist: Die Wellen überlappten, gerufen werden konnte so nie.
   */
  canCall() {
    const night = this.state;
    if (!this.active) return this.canCallFirst();
    return Boolean(this.plan) && night.wave > 0 && night.wave < this.plan.waves.length && !this.queue.length;
  }

  /** Abends ab der Tafel: Die Nacht dieses Tages hat noch nicht begonnen. */
  canCallFirst() {
    const st = this.game.state;
    const m = st.time.minute;
    return this.enabled && this.state.n !== st.time.day && m >= NIGHT_START - CALL_AHEAD && m < NIGHT_START;
  }

  callNext() {
    if (!this.canCall()) return false;
    if (!this.active) this.beginNight(this.game.state.time.day); // »Ich bin bereit« (m16-r1)
    const night = this.state;
    const delta = this.plan.waves[night.wave].at - this.game.state.time.minute;
    if (delta < 1) return false;
    for (let i = night.wave; i < this.plan.waves.length; i++) this.plan.waves[i].at -= delta;
    this.plan.waves[night.wave].called = true;
    night.shift = (night.shift || 0) + delta;
    night.called = (night.called || 0) + 1;
    this.game.book?.onCall(); // M25: Tat »Wer wagt …«
    return true;
  }

  /**
   * Nachtplan (M16): eine Stunde vor der Horde die ganze Nacht im Voraus, nachts
   * in jeder Pause die nächsten Wellen – Uhrzeit und Wege; ist Juna eingezogen,
   * auch die schweren Arten (wie ihr Funkspruch am Morgen). Null = nichts zeigen.
   */
  /** So lange vor der Nacht hängt der Nachtplan – mit Mara (M29, Späherin) schon ab 17 Uhr. */
  planAhead() {
    return this.game.survivors?.ability('spaehen') ? Math.max(PLAN_AHEAD, NIGHT_START - (ABILITIES.spaehen.planFrom - 6) * 60) : PLAN_AHEAD;
  }

  /** `all` (H2): für die Karte – alle kommenden Wellen, auch während eine Welle läuft. */
  planView(all = false) {
    const g = this.game;
    const st = g.state;
    const minute = st.time.minute;
    let plan = null;
    let from = 0;
    if (this.active) {
      if (!this.canCall() && !all) return null; // während einer Welle genügt die Nachtleiste (die Karte zeigt alles)
      plan = this.plan;
      from = this.state.wave;
    } else if (this.state.n !== st.time.day && minute >= NIGHT_START - this.planAhead() && minute < NIGHT_START) {
      plan = this.planFor(st.time.day);
    } else return null;
    const juna = Boolean(g.survivors?.resident('juna'));
    const rows = plan.waves.slice(from, all ? undefined : from + PLAN_ROWS).map((w, k) => ({
      n: from + k + 1,
      at: w.at,
      entries: w.entries,
      heavy: juna ? HEAVY.filter((t) => w.spawns.some((s) => s.type === t)) : [],
      trait: w.trait || null, // M22: Wellenmerkmal (Nebelwelle …) – immer angekündigt
      boss: w.spawns.find((s) => BOSS_TYPES.includes(s.type) || s.type === FINALE_BOSS)?.type || null, // … und der Boss (M25: das Moderherz)
    }));
    return { total: plan.waves.length, rows, more: Math.max(0, plan.waves.length - from - rows.length), canCall: this.canCall(), evening: !this.active, juna, lure: plan.lure || null };
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
        for (const s of wave.spawns) this.queue.push({ ...s, bonus: Boolean(wave.called), trait: wave.trait || null });
        // Das Banner sagt es groß (Welle und Richtung), die Nachtleiste behält es –
        // eine zusätzliche Meldung lag nur darüber (m3-r2)
        g.hud.showBanner(`${T.horde.welleKurz(night.wave, plan.waves.length)} · ${T.horde.kurzListe(wave.entries)}${wave.trait ? ` · ${T.wellen.merkmale[wave.trait][0]}` : ''}`);
        // M22: Beim ersten Mal erklärt Mika das Merkmal
        if (wave.trait && !st.flags[`merkmal-${wave.trait}`]) {
          st.flags[`merkmal-${wave.trait}`] = true;
          g.hud.toast(T.wellen.merkmale[wave.trait][1], 'warnung', 7);
        }
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
      if (g.horde.room(s.type) <= 0) continue; // M25c: wartet, bis diese Art wieder ins Bild passt
      this.queue.splice(i, 1);
      const p = this.plan;
      const lured = p?.lure && s.entry === p.lure ? LURE.loot : 1; // M24: über die Moderlocke mehr Beute
      this.spawnGroup(s.type, s.entry, 1, { hpFactor: (p ? p.hpFactor : 1) * (s.hp || 1), speedFactor: p ? p.speedFactor : 1, lootFactor: (p ? p.lootFactor : 1) * (s.bonus ? MUT_BONUS : 1) * lured, champion: s.champion || null, trait: s.trait || null });
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
    const names = (wave) => T.horde.kurzListe(wave.entries);
    const cleared = this.game.horde.alive === 0 && !this.queue.length;
    if ((cleared || night.wave === 0) && night.wave < plan.waves.length) return T.horde.gleich(names(plan.waves[night.wave]));
    if (night.wave > 0 && !cleared) return T.horde.aus(names(plan.waves[night.wave - 1]));
    return null;
  }

  spawnGroup(type, entryName, count, { day = false, hpFactor = 1, speedFactor = 1, lootFactor = 1, champion = null, trait = null } = {}) {
    const g = this.game;
    const entry = g.world.pathing.entries[entryName];
    count = Math.min(count, g.horde.room(type)); // M25c: nie mehr, als das Bild zeigt (Ruf des Herzens)
    for (let k = 0; k < count; k++) {
      const jitter = (k - (count - 1) / 2) * 0.7;
      const from = { x: entry.from.x + jitter, z: entry.from.z + jitter * 0.5 };
      const z = g.horde.spawn(type, { from, entry, hpFactor, speedFactor, lootFactor, day, champion, trait });
      if (z.champion) g.onChampion(z); // M21: ein Champion kommt – groß ansagen
      if (z.def.boss) g.onBoss(z); // M22: der Boss der Nacht
      else if (T.arten.neu[type] && !g.state.flags[`art-${type}`]) {
        // M22: Eine neue Art erklärt Mika beim ersten Auftritt
        g.state.flags[`art-${type}`] = true;
        g.hud.toast(T.arten.neu[type], 'warnung', 7);
      }
    }
  }

  beginNight(n) {
    const st = this.game.state;
    this.plan = this.planFor(n);
    this.queue.length = 0;
    // Was Streuner schon vor der Nacht abgenagt haben, nennt der Morgenbericht extra
    const preLoss = st.world.dayEvents?.day === n ? Math.round(st.world.dayEvents.lost || 0) : 0;
    st.night = { n, wave: 0, done: false, won: false, kills: 0, loot: {}, homeStart: st.world.homeHp, preLoss, lost: false, shift: 0, called: 0, towers: {} };
    if (st.difficulty === 'wild') st.night.wild = true; // F3c: der vierte Stern, solange sie ganz auf »Wild« läuft
    this.game.hud.toast(T.horde.nachtBeginnt(n), 'mond', 4);
    // M25: Die Frostnacht sagt sich selbst an (das Moderherz statt des Bosses)
    this.game.autumn?.beginNight(n);
    if (this.plan.finale) return;
    // Jede fünfte Nacht: der Boss (M22) – schon beim Einbruch der Nacht angesagt
    const boss = this.plan.waves.flatMap((w) => w.spawns).find((s) => BOSS_TYPES.includes(s.type))?.type || bossOfNight(n);
    if (boss) this.game.hud.toast(T.bosse.heuteNacht(T.bosse[boss].name), 'warnung', 6);
    else if (n % 5 === 0) this.game.hud.toast(T.horde.anfuehrerNacht, 'warnung', 5);
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
      g.feel?.('letzterSchlurfer'); // M26: der letzte fällt in Zeitlupe
      g.survivors?.onNightEnd(); // Bert flickt die Türme
      g.bonds?.onNightWon(); // M29: Seite an Seite – wer auf dem Posten stand
      g.offerBlueprint?.('nacht'); // M19: nach jeder gewonnenen Nacht ein Bauplan zur Wahl
    } else {
      st.stats.nightsLost = (st.stats.nightsLost || 0) + 1;
    }
    g.posts?.onNightEnd(won); // M23: nach einer gehaltenen Bossnacht wird gefeiert
    const risk = this.settleRisk(won); // M24: Moderlocke, makellose Nacht, Vorratskammer
    const finale = won && this.plan?.finale ? g.autumn?.onFrost(night) || null : null; // M25: der erste Frost
    const stars = won && g.book ? g.book.starsFor(night, risk) : null; // M25, Teil 2: gehalten, makellos, mutig (F3c: und wild)
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
      spent: night.spent || 0, // M19: verbrauchte Fallen
      turm: g.towerRanks?.bestOfNight() || null, // Turm der Nacht (M16)
      // M17: Tor und Wall – gehalten oder durchbrochen, wie viele im Lager waren, was umgeworfen wurde
      lager: night.breach ? { at: night.breach.at, gate: night.breach.gate, entered: night.inCamp || 0, raided: [...(night.raided || [])] } : night.campHit ? { held: true } : null,
      risk,
      finale,
      stars,
    };
    if (st.report.turm) g.towerRanks?.crown(st.report.turm.id); // Turmalbum (M25): wie oft Turm der Nacht
    if (stars) g.book.onNightWon(night.n, stars);
    g.quietSave();
  }

  /**
   * Wagnis und Vorrat nach der Nacht (M24): Die Moderlocke dieser Nacht wird zur
   * Fundkiste (gehalten) oder ist fort; eine makellose Nacht (niemand im Lager,
   * das Zuhause heil) bringt einen Bonus und zählt zur Serie – nach drei hat
   * Balduin einen Schatz dabei; gespartes Schrott wächst, außer nach einem
   * Durchbruch. Gibt die Zeilen für den Morgenbericht zurück.
   */
  settleRisk(won) {
    const g = this.game;
    const st = g.state;
    const night = st.night;
    const out = { lure: null, flawless: false, streak: 0, treasure: false, interest: 0, breach: false };
    // Moderlocke: nur die, mit der diese Nacht geplant war
    const lure = this.plan?.lure ? g.world.buildings.list.find((b) => b.type === 'moderlocke') : null;
    if (lure) out.lure = { entry: this.plan.lure, chest: g.consumeLure(lure, won) };
    const broke = Boolean(night.breach || night.inCamp);
    out.breach = broke;
    const r = st.risk;
    if (won && !broke && !night.homeHit && !night.fell) {
      gain(st.inventory, FLAWLESS.reward);
      r.streak += 1;
      out.flawless = true;
      out.streak = r.streak;
      if (r.streak >= FLAWLESS.streak) {
        r.streak = 0;
        r.treasure = true;
        out.treasure = true;
      }
    } else r.streak = 0;
    if (won && !broke) {
      const cap = st.world.houseLevel >= 5 ? PANTRY.capStore : PANTRY.cap;
      out.interest = Math.min(cap, Math.floor((st.inventory.schrott || 0) * PANTRY.rate));
      if (out.interest > 0) gain(st.inventory, { schrott: out.interest });
    }
    // Die Locke gibt es, sobald genug Nächte gewonnen sind – einmal ansagen
    if (!st.flags.lockeHinweis && (st.stats.nightsWon || 0) >= LURE.unlock) {
      st.flags.lockeHinweis = true;
      g.hud.toast(T.wagnis.lockeNeu, 'moderlocke', 7);
    }
    return out;
  }

  /** Beim Laden: Warteschlange ist leer; Plan wird neu erstellt. */
  reset() {
    this.plan = null;
    this.dayPlan = null;
    this.queue.length = 0;
  }

  /** Zum Speichern: noch ausstehende Schlurfer der laufenden Welle. */
  toState() {
    return this.queue.map((s) => ({ type: s.type, entry: s.entry, delay: +s.delay.toFixed(1), ...(s.bonus ? { bonus: true } : {}), ...(s.champion ? { champion: s.champion } : {}), ...(s.trait ? { trait: s.trait } : {}), ...(s.hp && s.hp !== 1 ? { hp: s.hp } : {}) }));
  }

  load(queue) {
    this.queue = (queue || []).filter((s) => s && s.type && ENTRY_NAMES.includes(s.entry)).map((s) => ({ ...s }));
  }
}
