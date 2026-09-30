// Herbstbuch (M25, Teil 2, DESIGN 8): Sterne je gehaltener Nacht, Taten mit
// Herbstschmuck als Belohnung, die Schlurferkunde (wie oft welche Art erledigt
// wurde, mit Dr. Yusufs Notizen) und das Turmalbum. Der Zustand liegt in
// `state.book`; das Pausenmenü zeigt das Buch (ui/menu.js), der Morgenbericht
// die Sterne (ui/report.js). Werte in data/book.js.

import { T } from '../data/texts.js';
import { DEEDS, DECO_ORDER, DEEDS_PER_DECO, BOOK_BOSSES, KIND_ORDER, ALBUM_SIZE } from '../data/book.js';
import { PEOPLE } from './survivors.js';
import { REACTION_ORDER } from '../data/reactions.js';
import { MIX_ORDER } from '../data/mixes.js';
import { BUILDINGS } from '../data/buildings.js';
import { towerRank, RANK_NAMES } from '../data/towers.js';

/** So oft (Sekunden) schaut das Buch nach, ob eine Tat gelungen ist. */
const CHECK_EVERY = 1.5;

export class Book {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.checkIn = CHECK_EVERY;
  }

  get st() {
    return this.game.state.book;
  }

  // --- Sterne ------------------------------------------------------------------------

  /** Sterne einer gehaltenen Nacht in der Reihenfolge von STAR_KEYS: gehalten, makellos, mutig. */
  starsFor(night, risk) {
    return [true, Boolean(risk?.flawless), (night.called || 0) > 0];
  }

  /** Nach einer gehaltenen Nacht: Sterne eintragen (eine wiederholte Nacht zählt mit ihrem besten Ergebnis). */
  onNightWon(n, stars) {
    const count = stars.filter(Boolean).length;
    this.st.stars[n] = Math.max(this.st.stars[n] || 0, count);
    this.check();
  }

  get totalStars() {
    return Object.values(this.st.stars).reduce((sum, k) => sum + k, 0);
  }

  get bestStars() {
    return Object.values(this.st.stars).reduce((best, k) => Math.max(best, k), 0);
  }

  // --- Schlurferkunde und Mut ------------------------------------------------------------

  /** Ein Schlurfer ist erledigt: Strichliste je Art; die erste einer Art ist ein neuer Eintrag. */
  onKill(z) {
    const type = z.type;
    if (!KIND_ORDER.includes(type)) return;
    const first = !this.st.kinds[type];
    this.st.kinds[type] = (this.st.kinds[type] || 0) + 1;
    if (first) this.game.hud.toast(T.buch.kundeNeu(T.buch.art[type][0]), 'buch', 3, 'chronik');
  }

  /** Eine Welle wurde früh gerufen (Tat »Wer wagt …«). */
  onCall() {
    this.st.called += 1;
  }

  /** Arten, die schon einmal erledigt wurden. */
  get kindsKnown() {
    return KIND_ORDER.filter((k) => this.st.kinds[k] > 0).length;
  }

  /** Schreibt Dr. Yusuf mit? Erst, wenn er in der Bucht wohnt oder zu Gast ist. */
  get yusufWrites() {
    return (this.game.state.survivors.yusuf?.stage || 0) >= 2;
  }

  // --- Taten -------------------------------------------------------------------------------

  /** Wie weit eine Tat ist (Zahl, Ziel ist `need`). */
  progress(deed) {
    const st = this.game.state;
    switch (deed.of) {
      case 'nights':
        return st.stats.nightsWon || 0;
      case 'bestStars':
        return this.bestStars;
      case 'called':
        return this.st.called;
      case 'residents':
        return PEOPLE.filter((id) => id !== 'knopf' && st.survivors[id]?.stage === 3).length; // M27: auch die Wanderer
      case 'notes':
        return REACTION_ORDER.filter((k) => st.notes?.[k]).length;
      case 'recipes':
        return MIX_ORDER.filter((k) => st.recipes?.[k]).length;
      case 'rank':
        return this.game.world.buildings.towers.reduce((best, b) => Math.max(best, towerRank(b.xp)), 0);
      case 'kinds':
        return this.kindsKnown;
      case 'bosses':
        return BOOK_BOSSES.filter((k) => this.st.kinds[k] > 0).length;
      case 'house':
        return st.world.houseLevel;
      case 'stars':
        return this.totalStars;
      case 'frost':
        return st.autumn?.frost ? 1 : 0;
      case 'kite':
        return st.isles?.fog?.kite?.best || 0; // N9: längste Reihe von Loopings
      default:
        return 0;
    }
  }

  get doneCount() {
    return DEEDS.filter((d) => this.st.deeds[d.id]).length;
  }

  /** Herbstschmuck, den die Taten schon gebracht haben (in der Reihenfolge von DECO_ORDER). */
  decoUnlocked() {
    return DECO_ORDER.slice(0, Math.floor(this.doneCount / DEEDS_PER_DECO));
  }

  /**
   * Gelungene Taten eintragen. Leise nach dem Laden (ein alter Spielstand
   * bekommt seine Taten, ohne dass ein Schwall Meldungen kommt), sonst mit
   * Meldung und – bei jeder dritten – dem neuen Herbstschmuck.
   */
  check({ quiet = false } = {}) {
    const before = this.decoUnlocked().length;
    const day = this.game.state.time.day;
    const fresh = [];
    for (const deed of DEEDS) {
      if (this.st.deeds[deed.id] || this.progress(deed) < deed.need) continue;
      this.st.deeds[deed.id] = day;
      fresh.push(deed.id);
    }
    if (quiet || !fresh.length) return fresh;
    const g = this.game;
    for (const id of fresh) g.hud.toast(T.buch.tatNeu(T.buch.taten[id][0]), 'buch', 4, 'chronik');
    g.sound.play('aufwertung');
    const deco = this.decoUnlocked();
    for (const type of deco.slice(before)) g.hud.toast(T.buch.schmuckNeu(T.bauten[type]), BUILDINGS[type].icon, 5, 'chronik');
    return fresh;
  }

  /** Pro Spielschritt im Spielmodus: ab und zu nach den Taten sehen (Zählen ist billig). */
  update(dt) {
    this.checkIn -= dt;
    if (this.checkIn > 0) return;
    this.checkIn = CHECK_EVERY;
    if (this.game.introRunning) return;
    this.check();
  }

  // --- Seiten des Buchs ----------------------------------------------------------------------

  /** Zeilen der Seite »Taten«. */
  deedRows() {
    return DEEDS.map((d) => {
      const day = this.st.deeds[d.id] || 0;
      const have = Math.min(d.need, this.progress(d));
      return { id: d.id, done: day > 0, day, have, need: d.need, name: T.buch.taten[d.id][0], info: T.buch.taten[d.id][1] };
    });
  }

  /** Was als Nächstes kommt: wie viele Taten bis zum nächsten Herbstschmuck (null, wenn alles da ist). */
  nextDeco() {
    const have = this.decoUnlocked().length;
    if (have >= DECO_ORDER.length) return null;
    return { left: (have + 1) * DEEDS_PER_DECO - this.doneCount, type: DECO_ORDER[have] };
  }

  /** Zeilen der Seite »Schlurferkunde«. */
  kindRows() {
    return KIND_ORDER.map((k) => ({ id: k, n: this.st.kinds[k] || 0, name: T.buch.art[k][0], info: T.buch.art[k][1], note: T.buch.art[k][2] }));
  }

  /** Turmalbum: die Türme mit den meisten Abschüssen. */
  album() {
    const ranks = this.game.towerRanks;
    return this.game.world.buildings.towers
      .filter((b) => (b.kills || 0) > 0)
      .sort((a, b) => (b.kills || 0) - (a.kills || 0) || a.id - b.id)
      .slice(0, ALBUM_SIZE)
      .map((b) => ({ id: b.id, name: ranks.nameOf(b), art: T.bauten[b.type], kills: b.kills || 0, rang: RANK_NAMES[towerRank(b.xp) - 1], best: b.best || 0, day: b.day || 0 }));
  }

  /** Für die Prüfung. */
  view() {
    return {
      stars: { ...this.st.stars },
      total: this.totalStars,
      deeds: { ...this.st.deeds },
      done: this.doneCount,
      deco: this.decoUnlocked(),
      kinds: { ...this.st.kinds },
      called: this.st.called,
      yusuf: this.yusufWrites,
      album: this.album().map((a) => `${a.name}:${a.kills}:${a.best}`),
    };
  }
}
