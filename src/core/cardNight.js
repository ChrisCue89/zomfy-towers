// Kartenabend »Letzte Runde« (M28, OFFENE-FRAGEN 171–174): einladen, den Tisch
// am Feuer aufstellen (bei Regen oder Schnee am Kamin, mit Balduin am Steg),
// einen Abend bis zwei Siege spielen, dann Einsatz, Rückseite, Wettschuld und
// Menschenkunde. Die Regeln stehen in core/cards.js, das Bild in ui/cardTable.js.
//
// Die Uhr steht während des Abends (Modus 'karten'), danach wird eine feste Zeit
// abgebucht. Die KI zieht nur aus der Tischansicht (view) und denkt sichtbar;
// ihr Tick (data/cards.js) ist eine Geste der Figur und eine Zeile im Bild.

import { newGame, play, view, aiMove, isLegal, showTell, rng } from './cards.js';
import { CARD_PLAYERS, CARD_PLAYER_ORDER, RULE_STAGES, EVENING, THINK, STAKES, CARD_BACKS, DUTIES, TELL_NOTE_AFTER } from '../data/cards.js';
import { WEATHER } from '../data/weather.js';
import { T } from '../data/texts.js';

/** Geste der Figur zu ihrem Tick (npcs.poseGesture). */
const TELL_GESTURE = { bert: 'reiben', juna: 'kichern', balduin: 'muetze', hilde: 'summen', yusuf: 'brille', fiete: 'pfeife' };

/** Leerer Eintrag je Figur im Spielstand. */
export const emptyPerson = () => ({ played: 0, won: 0, lost: 0, read: [0, 0], tell: [0, 0], noted: false });

export class CardNight {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.match = null;
  }

  get data() {
    return this.game.state.cards;
  }

  person(id) {
    const c = this.data;
    return (c.people[id] ||= emptyPerson());
  }

  /** Warum Mika jetzt nicht mit `id` spielen kann – null heißt: Es geht. */
  blocked(id) {
    const g = this.game;
    const st = g.state;
    const c = this.data;
    if (!CARD_PLAYERS[id]) return 'niemand';
    if (g.nights?.active) return 'nacht';
    if (c.lastDay === st.time.day || st.fishing?.lastDay === st.time.day) return 'heute'; // M33: ein Abend, eine Aktivität
    if (id === 'balduin') {
      // Balduin spielt eine Runde am Steg, solange er angelegt hat – erst wenn Mika die Farbpaare kennt
      if (g.trader.phase !== 'steht' || g.trader.leaving || c.evenings < RULE_STAGES.pairsFrom - 1) return 'fort';
      return null;
    }
    if (!g.survivors.resident(id)) return 'niemand';
    const m = st.time.minute;
    if (m < EVENING.from || m > EVENING.until) return 'zeit';
    if (!c.evenings && id !== 'bert') return 'bert';
    return null;
  }

  /** Regelstufe des nächsten Abends mit `id`. */
  stageFor(id) {
    const c = this.data;
    const pairs = c.evenings + 1 >= RULE_STAGES.pairsFrom;
    const blind = c.blind || id === RULE_STAGES.blindWith;
    return blind ? 3 : pairs ? 2 : 1;
  }

  /** Wo steht der Tisch? Am Feuer; bei Regen oder Schnee am Kamin; mit Balduin am Steg. */
  spotFor(id) {
    const w = this.game.world;
    if (id === 'balduin') return w.cardSpot('steg');
    const wx = WEATHER[w.weather.kind] || WEATHER.klar;
    return w.cardSpot(wx.rain > 0 || wx.snow > 0 ? 'kamin' : 'feuer');
  }

  /** Einladung angenommen: Tisch aufstellen, Regeln erklären (erstes Mal), erste Partie. */
  begin(id) {
    const g = this.game;
    if (this.blocked(id)) return false;
    const c = this.data;
    const spot = this.spotFor(id);
    const stage = this.stageFor(id);
    const seed = (g.state.world.mapSeed * 7919 + g.state.time.day * 131 + c.evenings * 17 + 3) >>> 0;
    this.match = {
      id,
      spot,
      stage,
      seed,
      wins: [0, 0],
      gameNo: 0,
      g: null,
      ai: rng(seed ^ 0x5bd1e995),
      tellRand: rng(seed ^ 0x27d4eb2d),
      think: 0,
      tells: [], // Ticks dieser Partie: { hit }
      over: false,
      result: null,
      fast: false,
    };
    g.builder?.cancel?.();
    g.world.cardLook = spot.look; // die Kamera fährt an den Tisch (lookSpot »karten«)
    g.world.showCardTable(spot, id, !c.stakes.includes(CARD_PLAYERS[id].stake) ? CARD_PLAYERS[id].stake : null);
    g.survivors.seatAt(id, spot.opp);
    const opp = g.survivors.npcs.list.get(id);
    if (opp) opp.cards = true; // F7: am Tisch mit den Karten in der Hand (Sprite »karten«)
    g.player.seat(spot.mika);
    g.applyView(g.world.isInside(spot.mika.x, spot.mika.z)); // nah heran (160 px/m)
    g.sound.play('karten-mischen');
    g.mode = 'karten';
    g.cardTable.open(this.match);
    // Beim ersten Mal erklärt Bert, ab dem dritten Abend Hilde die Farbpaare, Balduin den Griff ins Dunkle
    const talks = [];
    if (!c.evenings) talks.push('kartenRegeln');
    if (stage >= 2 && c.stage < 2) talks.push('kartenPaare');
    if (stage >= 3 && !c.blind) talks.push('kartenDunkel');
    c.stage = Math.max(c.stage, stage);
    if (stage >= 3) c.blind = true;
    const next = () => {
      const key = talks.shift();
      if (!key) {
        g.mode = 'karten';
        this.nextGame();
        return;
      }
      g.startDialog(key, next);
    };
    next();
    return true;
  }

  /** Nächste Partie: Der Anfang wechselt (die erste beginnt Mika). */
  nextGame() {
    const m = this.match;
    m.gameNo++;
    const starter = (m.gameNo - 1) % 2; // 0 = Mika
    m.g = newGame((m.seed + m.gameNo * 104729) >>> 0, { stage: m.stage, starter });
    m.tells = [];
    m.think = this.thinkTime();
    this.game.cardTable.deal(m);
    this.game.sound.play('karten-mischen');
  }

  thinkTime() {
    const m = this.match;
    if (m.fast) return THINK.fast;
    return THINK.min + m.ai() * (THINK.max - THINK.min);
  }

  /** Ist Mika am Zug (und darf etwas tun)? */
  get myTurn() {
    const m = this.match;
    return Boolean(m && m.g && !m.g.over && m.g.who === 0 && !this.game.cardTable.busy);
  }

  /** Mikas Zug (aus der Oberfläche). Gibt die Ereignisse zurück oder null, wenn der Zug nicht geht. */
  mikaMove(move) {
    const m = this.match;
    if (!this.myTurn || !isLegal(m.g, move)) return null;
    const events = play(m.g, move);
    this.afterMove(0, events);
    return events;
  }

  /** Jeder Schritt im Modus 'karten': Die KI denkt und zieht, Partien und Abend enden. */
  update(dt) {
    const m = this.match;
    if (!m || m.over) return;
    const table = this.game.cardTable;
    if (!m.g || table.busy) return;
    if (m.g.over) {
      this.endGame();
      return;
    }
    if (m.g.who !== 1) return;
    m.think -= dt;
    if (m.think > 0) return;
    const v = view(m.g, 1);
    const p = this.person(m.id);
    if (p.read[1] >= 2) v.read = p.read[0] / p.read[1]; // was Mika bisher verdeckt hatte
    const pl = CARD_PLAYERS[m.id];
    const { move, mood } = aiMove(v, pl.style, m.ai);
    if (mood && showTell(pl.tell, mood, m.tellRand)) {
      m.tells.push({ hit: Boolean(mood[pl.tell.mood]) });
      this.game.survivors.cardGesture(m.id, TELL_GESTURE[m.id]);
      table.say(T.karten.ticks[m.id], 'tick');
    }
    if (!isLegal(m.g, move)) {
      // Sollte nie passieren – sicherheitshalber aussetzen statt hängen
      const events = play(m.g, { kind: 'pass' });
      this.afterMove(1, events);
      return;
    }
    const events = play(m.g, move);
    this.afterMove(1, events);
    m.think = this.thinkTime();
  }

  /** Nach jedem Zug: Ereignisse ins Bild, Lesen aus aufgedeckten Karten. */
  afterMove(p, events) {
    const m = this.match;
    const person = this.person(m.id);
    for (const e of events) {
      // Was Mika verdeckt hatte, merkt sich das Gegenüber (Lesen, Nr. 173)
      if (e.kind === 'resolve' || e.kind === 'over') {
        for (const v of e.revealed[0]) {
          person.read[0] += v;
          person.read[1]++;
        }
      }
    }
    this.game.cardTable.play(events, p);
  }

  /** Eine Partie ist aus: Stand, Ticks in die Menschenkunde, nächste Partie oder Ende des Abends. */
  endGame() {
    const m = this.match;
    const g = this.game;
    const winner = m.g.winner; // 0 = Mika
    m.wins[winner]++;
    const person = this.person(m.id);
    for (const t of m.tells) {
      person.tell[0]++;
      if (t.hit) person.tell[1]++;
    }
    m.tells = [];
    if (!person.noted && person.tell[0] >= TELL_NOTE_AFTER) {
      person.noted = true;
      g.hud.toast(T.karten.verdachtNeu(g.cardTable.name(m.id)), 'buch', 3.2);
    }
    const done = m.wins[0] >= EVENING.wins || m.wins[1] >= EVENING.wins;
    g.cardTable.gameOver(winner, done);
    if (done) this.settle(m.wins[0] >= EVENING.wins);
    else m.g = null; // die Oberfläche ruft nextGame(), sobald das Ergebnis gelesen ist
  }

  /** Der Abend ist entschieden: Einsatz, Rückseite, Wettschuld, Zählwerk. */
  settle(won) {
    const m = this.match;
    const g = this.game;
    const c = this.data;
    const person = this.person(m.id);
    const pl = CARD_PLAYERS[m.id];
    person.played++;
    if (won) person.won++;
    else person.lost++;
    c.evenings++;
    c.lastDay = g.state.time.day;
    g.bonds?.add(m.id, 'karten'); // M29: ein Abend zusammen – ob gewonnen oder verloren
    const reward = { stake: null, back: null, duty: null };
    if (won && !c.stakes.includes(pl.stake)) {
      c.stakes.push(pl.stake);
      reward.stake = pl.stake;
      g.world.refreshStakes?.(c.stakes);
    } else if (won) {
      const back = Object.keys(CARD_BACKS).find((b) => CARD_BACKS[b].from === m.id && !c.backs.includes(b));
      if (back) {
        c.backs.push(back);
        reward.back = back;
      }
    }
    const what = DUTIES[(c.evenings - 1) % DUTIES.length];
    c.duty = { day: g.state.time.day + 1, who: won ? m.id : 'mika', what };
    reward.duty = c.duty;
    m.over = true;
    m.result = { won, reward };
  }

  /** Aufstehen: Tisch weg, Zeit abbuchen, zurück ins Spiel. `resign` = vorzeitig beendet (zählt verloren). */
  close(resign = false) {
    const m = this.match;
    const g = this.game;
    if (!m) return;
    if (resign && !m.over) this.settle(false);
    this.match = null;
    g.cardTable.close();
    g.world.hideCardTable();
    g.survivors.seatAt(m.id, null);
    g.player.seat(null);
    g.pushPlayerOut(); // vom Stuhl bzw. Hocker aufstehen, ohne in einem Möbel zu stecken
    g.applyView(g.world.isInside(g.player.position.x, g.player.position.z)); // zurück zur eingestellten Ansicht
    g.state.time.minute += EVENING.minutes; // die Uhr stand – jetzt ist der Abend vorbei
    g.mode = 'play';
    g.useLockUntil = g.clock + 0.4;
    g.quietSave?.();
  }

  /** Morgenbericht: die Wettschuld vom Vorabend. */
  morning() {
    const c = this.data;
    const d = c.duty;
    if (!d || d.day !== this.game.state.time.day) return [];
    const who = d.who === 'mika' ? 'Mika' : this.game.cardTable.name(d.who);
    return [{ text: T.karten.pflichtMorgen(who, T.karten.pflichten[d.what]) }];
  }

  /** Herbstbuch, Seite »Menschenkunde«: je Figur Abende, Stück und Verdacht. */
  bookRows() {
    const c = this.data;
    return CARD_PLAYER_ORDER.filter((id) => c.people[id]?.played || c.people[id]?.tell?.[0]).map((id) => {
      const p = c.people[id];
      return {
        id,
        played: p.played,
        won: p.won,
        lost: p.lost,
        stake: CARD_PLAYERS[id].stake,
        stakeWon: c.stakes.includes(CARD_PLAYERS[id].stake),
        note: p.noted ? T.karten.verdacht[id](p.tell[0], p.tell[1]) : null,
      };
    });
  }
}

/** Kartenstand für einen neuen Spielstand (state.js). */
export function newCardState() {
  return { evenings: 0, lastDay: -1, stage: 1, blind: false, back: 'laub', backs: ['laub'], stakes: [], duty: null, people: {} };
}

/** Kartenstand prüfen und reparieren (sanitizeState). */
export function sanitizeCards(raw) {
  const out = newCardState();
  if (!raw || typeof raw !== 'object') return out;
  const int = (v, lo, hi, d) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d);
  out.evenings = int(raw.evenings, 0, 1e5, 0);
  out.lastDay = int(raw.lastDay, -1, 1e6, -1);
  out.stage = int(raw.stage, 1, 3, 1);
  out.blind = Boolean(raw.blind);
  out.backs = Array.isArray(raw.backs) ? [...new Set(['laub', ...raw.backs.filter((b) => CARD_BACKS[b])])] : ['laub'];
  out.back = out.backs.includes(raw.back) ? raw.back : 'laub';
  out.stakes = Array.isArray(raw.stakes) ? [...new Set(raw.stakes.filter((s) => STAKES[s]))] : [];
  if (raw.duty && typeof raw.duty === 'object' && DUTIES.includes(raw.duty.what) && (raw.duty.who === 'mika' || CARD_PLAYERS[raw.duty.who])) {
    out.duty = { day: int(raw.duty.day, 0, 1e6, 0), who: raw.duty.who, what: raw.duty.what };
  }
  for (const id of CARD_PLAYER_ORDER) {
    const p = raw.people?.[id];
    if (!p || typeof p !== 'object') continue;
    const pair = (a) => (Array.isArray(a) && a.length === 2 ? [Math.max(0, Number(a[0]) || 0), Math.max(0, Math.floor(Number(a[1]) || 0))] : [0, 0]);
    out.people[id] = { played: int(p.played, 0, 1e5, 0), won: int(p.won, 0, 1e5, 0), lost: int(p.lost, 0, 1e5, 0), read: pair(p.read), tell: pair(p.tell), noted: Boolean(p.noted) };
  }
  return out;
}
