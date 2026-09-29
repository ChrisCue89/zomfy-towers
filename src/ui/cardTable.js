// Der Kartentisch (M28): Karten groß auf der Oberfläche, darunter lebt die Welt
// weiter (Feuer, Regen, das Gegenüber mit seinen Gesten). Die Regeln kennt nur
// core/cards.js; hier wird gezeigt, was Mika sieht (view), und jede Bewegung
// bekommt ihr Maß: Karten fliegen im Bogen, drehen sich in drei Bildern um,
// beim Klopfen pocht es zweimal, beim Aufdecken zählt die Summe mit steigender
// Tonhöhe, 15 ist ein Flammenstoß, Geplatzt eine platzende Kastanie.
//
// Tasten: A/D Karte, 1 2 3 Platz, E offen legen, Q verdeckt, K klopfen, Tab Griff
// ins Dunkle (Stufe 3), B schneller, Esc Abend beenden. Klicks werden in update()
// ausgewertet (CLAUDE.md), die Maus wählt nur, wenn sie bewegt wird.

import { T } from '../data/texts.js';
import { SPRECHER } from '../data/dialogs.js';
import { CARD_PLAYERS, CARD_BACKS } from '../data/cards.js';
import { view, moves, isLegal, CAP, TARGET, PLACE_KEYS } from '../core/cards.js';
import { COLORS } from './ui.js';
import { drawIcon } from './icons.js';
import { measure, wrap, LINE_HEIGHT } from './font.js';
import { drawCard, CARD_W, CARD_H, FLIP_STEPS } from './cardArt.js';
import { P, hexToCss } from '../render/palette.js';

const STEP = 14; // Versatz der Karten an einem Platz
const PLACE_W = CARD_W + STEP * (CAP - 1);
const PLACE_GAP = 34;
const HAND_GAP = 30;
const FLY = 0.24; // Flugzeit einer Karte (s)
const FLIP = 0.15; // Umdrehen (drei Bilder hin, drei zurück)
const PLACE_ICONS = { laterne: 'laterne', kessel: 'pech', kuerbis: 'kuerbis' };
const css = (hex) => hexToCss(hex);
const ease = (u) => 1 - (1 - u) * (1 - u);

export class CardTable {
  /** @param {import('../core/game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.match = null;
    this.beats = [];
    this.shown = null;
    this.sel = 0; // gewählte Handkarte (Index; = Handgröße: Griff ins Dunkle)
    this.place = 0; // gewählter Platz
    this.marks = []; // Laubwirbel: zum Abwerfen gewählte Karten
    this.stealSel = 0;
    this.line = null; // { text, t, kind }
    this.banner = null; // { text, t, color }
    this.confirm = null; // Abend beenden? { choice }
    this.wait = null; // 'next' | 'end' – auf E warten
    this.effects = []; // kleine Funken, Blätter, Schimmer
    this.time = 0;
    this.hinted = false;
  }

  /** Läuft gerade eine Bewegung? Dann zieht niemand. */
  get busy() {
    return this.beats.length > 0 || Boolean(this.wait) || Boolean(this.confirm);
  }

  name(id) {
    return SPRECHER[id]?.name || id;
  }

  open(match) {
    this.match = match;
    this.beats = [];
    this.shown = null;
    this.wait = null;
    this.confirm = null;
    this.banner = null;
    this.effects = [];
    this.line = null;
    this.say(T.karten.sprueche[match.id]?.hallo || '', 'spruch', 3.2);
  }

  close() {
    this.match = null;
    this.shown = null;
    this.beats = [];
  }

  /** Eine Zeile unter dem Porträt (Spruch oder Tick). */
  say(text, kind = 'spruch', t = 2.6) {
    if (!text) return;
    this.line = { text, t, kind };
  }

  // --- Anzeige-Modell -------------------------------------------------------------------

  /** Was Mika gerade sieht – aus der Tischansicht, dazu die Zahl der Karten des anderen. */
  snapshot() {
    const m = this.match;
    const v = view(m.g, 0);
    return {
      hand: v.hand.map((c) => ({ ...c })),
      theirHand: v.theirHand,
      deck: v.deck,
      places: v.places.map((pl) => ({
        winner: pl.winner,
        mine: { ...pl.mine, cards: pl.mine.cards.map((c) => ({ ...c })) },
        theirs: { ...pl.theirs, cards: pl.theirs.cards.map((c) => ({ ...c })) },
      })),
      pending: v.pending,
      knocked: v.knocked,
      stage: v.stage,
      choice: v.choice,
      discard: m.g.discard.length,
    };
  }

  /** Neue Partie: austeilen. */
  deal(match) {
    this.match = match;
    const snap = this.snapshot();
    this.shown = { ...snap, hand: [], theirHand: 0, deck: snap.deck + snap.hand.length + snap.theirHand };
    this.sel = 0;
    this.place = 0;
    this.banner = { text: T.karten.partie(match.gameNo), t: 1.4, color: COLORS.gold };
    for (let k = 0; k < snap.hand.length; k++) {
      this.beats.push({ kind: 'deal', to: 1, dur: 0.09, card: null });
      this.beats.push({ kind: 'deal', to: 0, dur: 0.09, card: snap.hand[k] });
    }
    this.beats.push({ kind: 'sync', dur: 0.05 });
    if (!this.hinted) {
      this.hinted = true;
      this.beats.push({ kind: 'hint', dur: 0.01 });
    }
  }

  /** Ereignisse eines Zugs in Bewegungen übersetzen. p = wer gezogen hat (0 = Mika). */
  play(events, p) {
    const m = this.match;
    for (const e of events) {
      switch (e.kind) {
        case 'lay':
          this.beats.push({ kind: 'lay', dur: FLY, p: e.p, place: e.place, card: e.p === 0 || !e.hidden ? { id: e.card, v: e.v ?? this.valueOf(e.card), suit: e.suit ?? this.suitOf(e.card), hidden: e.hidden } : { hidden: true }, hidden: e.hidden });
          break;
        case 'blind':
          this.beats.push({ kind: 'blind', dur: FLY, p: e.p, place: e.place });
          break;
        case 'knock':
          this.beats.push({ kind: 'knock', dur: 0.55, p: e.p, place: e.place });
          break;
        case 'pair':
          this.beats.push({ kind: 'pair', dur: 0.8, p: e.p, place: e.place, suit: e.suit });
          break;
        case 'reveal':
        case 'steal':
        case 'drop':
          this.beats.push({ kind: e.kind, dur: e.kind === 'reveal' ? 0.45 : FLY, e });
          break;
        case 'hit':
          if (e.p === 0 || e.open) this.beats.push({ kind: 'hit', dur: 0.6, p: e.p, place: e.place });
          break;
        case 'resolve':
          this.beats.push({ kind: 'hush', dur: 0.25 }); // ein Schlag Stille vor dem Aufdecken
          this.beats.push({ kind: 'resolve', dur: 1.3, e });
          break;
        case 'over':
          this.beats.push({ kind: 'nachschau', dur: 0.6, e });
          break;
        default:
          break;
      }
    }
    this.beats.push({ kind: 'sync', dur: 0.12, drawAnim: true });
    void m;
    void p;
  }

  /** Wert und Farbe einer Karte aus dem echten Spiel (nur für offen gelegte Karten). */
  valueOf(id) {
    return this.findCard(id)?.v ?? null;
  }

  suitOf(id) {
    return this.findCard(id)?.suit ?? null;
  }

  findCard(id) {
    const g = this.match?.g;
    if (!g) return null;
    for (const pl of g.places) for (const s of pl.sides) for (const c of s.cards) if (c.id === id) return c;
    for (const h of g.hands) for (const c of h) if (c.id === id) return c;
    return g.discard.find((c) => c.id === id) || null;
  }

  /** Partie vorbei (aus CardNight.endGame): Banner, dann auf E warten. */
  gameOver(winner, done) {
    const opp = this.name(this.match.id);
    this.beats.push({
      kind: 'banner',
      dur: 0.9,
      text: winner === 0 ? T.karten.partieGewonnen : T.karten.partieVerloren(opp),
      color: winner === 0 ? COLORS.gold : COLORS.textWarm,
    });
    const sp = T.karten.sprueche[this.match.id];
    this.beats.push({ kind: 'say', dur: 0.01, text: done ? (winner === 0 ? sp.abendNiederlage : sp.abendSieg) : winner === 0 ? sp.partieNiederlage : sp.partieSieg });
    this.beats.push({ kind: 'wait', dur: 0.01, next: done ? 'end' : 'next' });
    this.game.survivors.cardGesture?.(this.match.id, winner === 0 ? 'schulter' : 'daumen');
    this.game.sound.play(winner === 0 ? 'jubel' : 'bimmel');
  }

  // --- Jeder Schritt --------------------------------------------------------------------

  update(input, dt) {
    const m = this.match;
    if (!m) return;
    this.time += dt;
    if (this.line && (this.line.t -= dt) <= 0) this.line = null;
    if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
    this.effects = this.effects.filter((f) => (f.t += dt) < f.dur);
    if (input.pressed('fast')) {
      m.fast = !m.fast;
      this.game.sound.play('klick');
    }
    // Abend beenden?
    if (this.confirm) {
      this.updateConfirm(input);
      return;
    }
    if (input.pressed('menu')) {
      this.confirm = { choice: 0 };
      return;
    }
    this.runBeats(dt * (m.fast ? 2 : 1));
    if (this.beats.length) return;
    if (this.wait) {
      if (input.pressed('confirm') || input.consumeClick()) {
        const w = this.wait;
        this.wait = null;
        this.game.sound.play('klick');
        if (w === 'next') this.game.cardNight.nextGame();
        else this.game.cardNight.close();
      }
      return;
    }
    if (!m.g || m.g.over || m.g.who !== 0) return;
    if (!this.shown) this.shown = this.snapshot();
    const v = view(m.g, 0);
    if (v.choice) this.updateChoice(input, v);
    else this.updateTurn(input, v);
  }

  runBeats(dt) {
    let rest = dt;
    while (this.beats.length && rest > 0) {
      const b = this.beats[0];
      if (!b.started) {
        b.started = true;
        b.t = 0;
        this.startBeat(b);
      }
      const use = Math.min(rest, b.dur - b.t);
      b.t += use;
      rest -= use;
      this.tickBeat(b);
      if (b.t >= b.dur) {
        this.endBeat(b);
        this.beats.shift();
      } else break;
    }
  }

  startBeat(b) {
    const g = this.game;
    const s = this.shown;
    switch (b.kind) {
      case 'deal':
        g.sound.play('karte');
        break;
      case 'lay':
      case 'blind':
        g.sound.play('karte');
        // Ab und zu ein Wort beim Legen – nie über einem Tick oder einer Meldung
        if (b.p === 1 && !this.line && Math.random() < 0.3) this.say(pickLine(T.karten.sprueche[this.match.id]?.dran, this.time), 'spruch', 1.2);
        break;
      case 'knock':
        this.say(b.p === 0 ? T.karten.duKlopfst : T.karten.klopft(this.name(this.match.id)), 'ereignis', 2.2);
        break;
      case 'pair':
        g.sound.play(b.suit === 'feuer' ? 'flammen' : b.suit === 'blatt' ? 'windstoss' : b.suit === 'mond' ? 'glocke' : 'kraehe');
        this.say(`${T.karten.paare[b.suit]}! ${T.karten.paarInfo[b.suit]}`, 'ereignis', 2.6);
        this.burst(b.suit, b.p, b.place);
        break;
      case 'hit':
        g.sound.play('flammen');
        this.burst('feuer', b.p, b.place, 14);
        break;
      case 'resolve':
        b.pl = s?.places[b.e.place];
        b.real = this.match.g.places[b.e.place];
        break;
      case 'say':
        this.say(b.text, 'spruch', 3);
        break;
      case 'hint':
        this.say(T.karten.niemandSchaut, 'ereignis', 4);
        break;
      case 'banner':
        this.banner = { text: b.text, t: 1.8, color: b.color };
        break;
      default:
        break;
    }
    void s;
  }

  tickBeat(b) {
    const g = this.game;
    if (b.kind === 'knock') {
      // Die Faust pocht zweimal aufs Holz, das Bild wackelt um einen Pixel
      for (const at of [0.08, 0.3]) {
        if (!b[`k${at}`] && b.t >= at) {
          b[`k${at}`] = true;
          g.sound.play('klopfen');
          g.rig?.addTrauma?.(0.18, 0, 1, 1);
        }
      }
    }
    if (b.kind === 'resolve' && b.real) {
      // Karte für Karte umdrehen, die Summe zählt mit steigender Tonhöhe
      const n = b.real.sides[0].cards.length + b.real.sides[1].cards.length;
      const step = Math.min(0.12, 0.7 / Math.max(1, n));
      const k = Math.min(n, Math.floor(b.t / step));
      if ((b.counted || 0) < k) {
        b.counted = k;
        g.sound.play('tipp', { pitch: 380 + k * 60 });
      }
      if (!b.decided && b.t >= 0.8) {
        b.decided = true;
        const w = b.e.winner;
        const val = b.e.values[w];
        const other = b.e.values[1 - w];
        if (val === TARGET) g.sound.play('flammen');
        if (other > TARGET) {
          g.sound.play('knall');
          this.burst('kastanie', 1 - w, b.e.place, 10);
        }
        if (b.e.tie) this.say(T.karten.gleichstand[b.e.tie], 'ereignis', 2.6);
        else if (other > TARGET) this.say(T.karten.geplatzt, 'ereignis', 1.6);
      }
    }
  }

  endBeat(b) {
    const s = this.shown;
    if (!s) return;
    switch (b.kind) {
      case 'deal':
        if (b.to === 0) s.hand.push(b.card);
        else s.theirHand++;
        s.deck = Math.max(0, s.deck - 1);
        break;
      case 'lay': {
        const side = b.p === 0 ? s.places[b.place].mine : s.places[b.place].theirs;
        side.cards.push(b.card);
        if (b.p === 0) s.hand = s.hand.filter((c) => c.id !== b.card.id);
        else s.theirHand = Math.max(0, s.theirHand - 1);
        break;
      }
      case 'blind': {
        const side = b.p === 0 ? s.places[b.place].mine : s.places[b.place].theirs;
        side.cards.push({ hidden: true, blind: true });
        s.deck = Math.max(0, s.deck - 1);
        break;
      }
      case 'resolve':
      case 'nachschau':
      case 'sync':
      case 'reveal':
      case 'steal':
      case 'drop':
        // Nach dem Aufdecken zeigt das Bild wieder genau den Tisch
        this.shown = this.snapshot();
        if (b.kind === 'resolve') this.revealAll(b.e.place);
        if (b.kind === 'nachschau') for (let k = 0; k < 3; k++) this.revealAll(k);
        break;
      case 'wait':
        this.wait = b.next;
        break;
      default:
        break;
    }
    this.clampSel();
  }

  /** Nach dem Entscheiden: alle Karten an Platz k offen (Werte aus dem echten Spiel). */
  revealAll(k) {
    const real = this.match.g.places[k];
    const pl = this.shown.places[k];
    pl.mine.cards = real.sides[0].cards.map((c) => ({ id: c.id, v: c.v, suit: c.suit, hidden: false }));
    pl.theirs.cards = real.sides[1].cards.map((c) => ({ id: c.id, v: c.v, suit: c.suit, hidden: false }));
  }

  clampSel() {
    const n = this.shown?.hand.length || 0;
    const max = n + (this.canBlind() ? 1 : 0) - 1;
    this.sel = Math.max(0, Math.min(this.sel, max));
  }

  canBlind() {
    const m = this.match;
    return Boolean(m?.g && m.g.stage >= 3 && m.g.deck.length && [0, 1, 2].some((k) => this.canPlace(k, true)));
  }

  /** Darf Mika an Platz k legen (verdeckt: je Platz nur eine)? */
  canPlace(k, hidden) {
    const g = this.match?.g;
    if (!g) return false;
    const pl = g.places[k];
    const s = pl.sides[0];
    if (pl.winner !== null || s.closed || s.cards.length >= CAP) return false;
    return !hidden || !s.cards.some((c) => c.hidden);
  }

  // --- Eingaben -------------------------------------------------------------------------

  updateTurn(input, v) {
    const g = this.game;
    const ui = g.ui;
    const L = this.layout(ui);
    const handN = v.hand.length;
    const total = handN + (this.canBlind() ? 1 : 0);
    // Karte wählen: A/D, Maus über einer Handkarte
    if (input.pressed('left')) this.sel = (this.sel + total - 1) % Math.max(1, total);
    if (input.pressed('right')) this.sel = (this.sel + 1) % Math.max(1, total);
    if (input.pressed('buildTab') && this.canBlind()) this.sel = handN; // Griff ins Dunkle
    const hoverCard = L.hand.findIndex((r) => ui.hover(r.x, r.y - 4, r.w, r.h + 4));
    if (hoverCard >= 0 && input.mouse.moved) this.sel = hoverCard;
    // Platz wählen: 1 2 3, Maus über der eigenen Seite
    for (let k = 0; k < 3; k++) if (input.pressed(`slot${k + 1}`)) this.place = k;
    const hoverPlace = L.places.findIndex((r) => ui.hover(r.mine.x - 4, r.mine.y - 4, r.mine.w + 8, r.mine.h + 8));
    if (hoverPlace >= 0 && input.mouse.moved) this.place = hoverPlace;
    const blind = this.sel >= handN;
    const card = blind ? null : v.hand[this.sel];
    let move = null;
    const clickPlace = hoverPlace >= 0 && input.mouse.clicked;
    const rightPlace = hoverPlace >= 0 && input.mouse.rightClicked;
    if (clickPlace || rightPlace) this.place = hoverPlace;
    if (hoverCard >= 0 && input.mouse.clicked) {
      input.consumeClick();
      this.sel = hoverCard;
      g.sound.play('klick');
    }
    const layOpen = input.pressed('use') || clickPlace;
    const layHidden = input.pressedCode('KeyQ') || rightPlace;
    if (layOpen || layHidden) {
      if (clickPlace) input.consumeClick();
      if (blind) move = { kind: 'blind', place: this.place };
      else if (card) move = { kind: 'lay', card: card.id, place: this.place, hidden: Boolean(layHidden) };
    }
    const knockBtn = L.places.findIndex((r) => r.knock && ui.hover(r.knock.x, r.knock.y, r.knock.w, r.knock.h));
    if (knockBtn >= 0 && input.mouse.clicked) {
      input.consumeClick();
      move = { kind: 'knock', place: knockBtn };
    }
    if (input.pressedCode('KeyK')) move = { kind: 'knock', place: this.place };
    // Nirgends mehr zu legen: E setzt aus (Klopfen bleibt möglich)
    const canLay = moves(this.match.g).some((mv) => mv.kind === 'lay' || mv.kind === 'blind');
    if (!canLay && !move?.kind?.startsWith('knock') && (input.pressed('use') || input.mouse.clicked)) move = { kind: 'pass' };
    if (!move) return;
    if (!isLegal(this.match.g, move)) {
      g.sound.play('tipp', { pitch: 220 });
      this.say(this.whyNot(move), 'hinweis', 1.8);
      return;
    }
    g.cardNight.mikaMove(move);
  }

  whyNot(move) {
    const g = this.match.g;
    const s = g.places[move.place]?.sides[0];
    if (move.kind === 'knock') {
      if (g.knocked[0]) return 'Geklopft wird nur einmal je Partie.';
      if (g.pending) return 'Jetzt nicht – es wird gleich aufgedeckt.';
      return 'Klopfen geht an einem offenen Platz mit mindestens zwei deiner Karten.';
    }
    if (s && (s.closed || s.cards.length >= CAP || g.places[move.place].winner !== null)) return 'Dieser Platz ist voll oder zu.';
    if (move.hidden || move.kind === 'blind') return 'Je Platz darf nur eine deiner Karten verdeckt liegen.';
    return 'Das geht hier nicht.';
  }

  /** Laubwirbel (Karten abwerfen) oder Krähendieb (eine Karte drüben fortnehmen). */
  updateChoice(input, v) {
    const g = this.game;
    const ch = v.choice;
    const ui = g.ui;
    const L = this.layout(ui);
    if (ch.kind === 'drop') {
      const n = v.hand.length;
      if (input.pressed('left')) this.sel = (this.sel + n - 1) % n;
      if (input.pressed('right')) this.sel = (this.sel + 1) % n;
      const hover = L.hand.findIndex((r) => ui.hover(r.x, r.y - 4, r.w, r.h + 4));
      if (hover >= 0 && input.mouse.moved) this.sel = hover;
      const toggle = input.pressed('use') || (hover >= 0 && input.mouse.clicked);
      if (hover >= 0 && input.mouse.clicked) {
        input.consumeClick();
        this.sel = hover;
      }
      if (toggle) {
        const id = v.hand[this.sel]?.id;
        if (id !== undefined) this.marks = this.marks.includes(id) ? this.marks.filter((x) => x !== id) : [...this.marks, id];
        g.sound.play('klick');
      }
      if (this.marks.length >= ch.n) {
        const move = { kind: 'drop', cards: this.marks.slice(0, ch.n) };
        this.marks = [];
        g.cardNight.mikaMove(move);
      }
      return;
    }
    // Krähendieb: die offenen Karten drüben am Platz
    const opts = ch.cards;
    if (input.pressed('left')) this.stealSel = (this.stealSel + opts.length - 1) % opts.length;
    if (input.pressed('right')) this.stealSel = (this.stealSel + 1) % opts.length;
    this.stealSel = Math.min(this.stealSel, opts.length - 1);
    const rects = this.stealRects(L, ch);
    const hover = rects.findIndex((r) => ui.hover(r.x, r.y, r.w, r.h));
    if (hover >= 0 && input.mouse.moved) this.stealSel = hover;
    if (input.pressed('use') || (hover >= 0 && input.mouse.clicked)) {
      if (hover >= 0 && input.mouse.clicked) {
        input.consumeClick();
        this.stealSel = hover;
      }
      g.cardNight.mikaMove({ kind: 'steal', card: opts[this.stealSel] });
    } else if (input.pressedCode('KeyQ')) g.cardNight.mikaMove({ kind: 'steal', card: null });
  }

  stealRects(L, ch) {
    const pl = this.shown?.places[ch.place];
    if (!pl) return [];
    const base = L.places[ch.place].theirs;
    return pl.theirs.cards.map((c, i) => ({ id: c.id, x: base.x + i * STEP, y: base.y, w: i === pl.theirs.cards.length - 1 ? CARD_W : STEP, h: CARD_H })).filter((r) => ch.cards.includes(r.id));
  }

  updateConfirm(input) {
    const c = this.confirm;
    if (input.pressed('left') || input.pressed('up')) c.choice = 0;
    if (input.pressed('right') || input.pressed('down')) c.choice = 1;
    const L = this.confirmLayout(this.game.ui);
    const ui = this.game.ui;
    L.buttons.forEach((b, k) => {
      if (ui.hover(b.x, b.y, b.w, b.h) && input.mouse.moved) c.choice = k;
    });
    const clicked = L.buttons.findIndex((b) => ui.hover(b.x, b.y, b.w, b.h) && input.mouse.clicked);
    if (input.pressed('menu')) {
      this.confirm = null; // Esc: harmlos – weiterspielen
      return;
    }
    if (clicked >= 0 || input.pressed('confirm')) {
      input.consumeClick();
      const k = clicked >= 0 ? clicked : c.choice;
      this.confirm = null;
      if (k === 1) this.game.cardNight.close(true);
    }
  }

  // --- Layout ---------------------------------------------------------------------------

  layout(ui) {
    const W = ui.width;
    const H = ui.height;
    const total = 3 * PLACE_W + 2 * PLACE_GAP;
    const x0 = Math.round((W - total) / 2);
    const yTheirs = Math.round(H * 0.5); // darüber bleibt Platz für Tisch, Gegenüber und Feuer
    const yLabel = yTheirs + CARD_H + 3;
    const yMine = yLabel + 22;
    const yHand = Math.min(H - CARD_H - 26, yMine + CARD_H + 22);
    const places = [0, 1, 2].map((k) => {
      const x = x0 + k * (PLACE_W + PLACE_GAP);
      return {
        x,
        theirs: { x, y: yTheirs, w: PLACE_W, h: CARD_H },
        label: { x: x - 6, y: yLabel, w: PLACE_W + 12, h: 20 },
        mine: { x, y: yMine, w: PLACE_W, h: CARD_H },
        knock: null,
      };
    });
    const hand = this.shown?.hand || [];
    const n = hand.length + (this.canBlind() ? 1 : 0);
    const hx = Math.round((W - (n * HAND_GAP - (HAND_GAP - CARD_W))) / 2);
    const handRects = Array.from({ length: n }, (_, k) => ({ x: hx + k * HAND_GAP, y: yHand, w: CARD_W, h: CARD_H }));
    // Klopfen: kleiner Knopf unter der eigenen Seite, wo es geht
    const g = this.match?.g;
    if (g && !g.over && g.who === 0 && !g.knocked[0] && !g.pending) {
      places.forEach((r, k) => {
        const s = g.places[k].sides[0];
        if (g.places[k].winner === null && !s.closed && s.cards.length >= 2) r.knock = { x: r.x + PLACE_W - 12, y: yMine + CARD_H + 2, w: 14, h: 11 };
      });
    }
    return { places, hand: handRects, deck: { x: x0 - 44, y: yLabel - 8 }, discard: { x: x0 + total + 16, y: yLabel - 8 }, yHand, portrait: { x: 8, y: 8 } };
  }

  confirmLayout(ui) {
    const w = 250;
    const h = 64;
    const x = Math.round((ui.width - w) / 2);
    const y = Math.round((ui.height - h) / 2) - 30;
    return { x, y, w, h, buttons: [{ x: x + 16, y: y + 36, w: 100, h: 18 }, { x: x + w - 116, y: y + 36, w: 100, h: 18 }] };
  }

  // --- Zeichnen -------------------------------------------------------------------------

  /** @param {import('./ui.js').UICanvas} ui */
  draw(ui) {
    const m = this.match;
    if (!m) return;
    const L = this.layout(ui);
    const ctx = ui.ctx;
    const s = this.shown;
    const back = this.game.state.cards?.back || 'laub';
    // Tischtuch als dunkler, gerasterter Streifen hinter den Karten – die Welt bleibt sichtbar
    ui.ditherRect(0, L.places[0].theirs.y - 10, ui.width, ui.height - L.places[0].theirs.y + 10, 0.45);
    this.drawHeader(ui, L);
    if (!s) return;
    // Stapel und Abwurf
    for (let k = 0; k < Math.min(4, Math.ceil(s.deck / 6)); k++) drawCard(ctx, null, L.deck.x - k, L.deck.y - k, { back });
    ui.textCentered(T.karten.stapel(s.deck), L.deck.x + CARD_W / 2, L.deck.y + CARD_H + 2, COLORS.textDim);
    // Plätze
    L.places.forEach((r, k) => this.drawPlace(ui, r, k, s.places[k]));
    // Hand des anderen (Rückseiten, oben rechts klein) – ohne die Karte, die gerade fliegt
    const b0 = this.beats[0];
    const away = b0?.started && b0.kind === 'lay' && b0.p === 1 ? 1 : 0;
    for (let k = 0; k < s.theirHand - away; k++) drawCard(ctx, null, ui.width - 20 - CARD_W - k * 9, 8, { back });
    // Eigene Hand
    this.drawHand(ui, L, s);
    // Bewegte Karten und Wirkungen
    this.drawBeat(ui, L);
    this.drawEffects(ui, L);
    // Tasten, Banner, Rückfrage
    this.drawFooter(ui, L);
    if (this.banner) {
      const w = measure(this.banner.text) + 24;
      const x = Math.round((ui.width - w) / 2);
      // über der Reihe des Gegenübers – zwischen den Reihen verdeckte es die Summen des Kessels
      const y = L.places[0].theirs.y - 27;
      ui.panel(x, y, w, 22, { frame: this.banner.color });
      ui.textCentered(this.banner.text, ui.width / 2, y + 5, this.banner.color);
    }
    if (this.wait) {
      const res = m.result;
      if (res && this.wait === 'end') this.drawResult(ui, res);
      ui.textCentered(T.karten.weiter, ui.width / 2, ui.height - 14, COLORS.gold);
    }
    if (this.confirm) this.drawConfirm(ui);
  }

  drawHeader(ui, L) {
    const m = this.match;
    const ctx = ui.ctx;
    const id = m.id;
    const portrait = this.game.portraits?.[SPRECHER[id]?.portrait];
    const x = L.portrait.x;
    const y = L.portrait.y;
    ui.panel(x, y, 190, 62);
    ui.inset(x + 6, y + 6, 50, 50);
    if (portrait) ctx.drawImage(portrait, x + 6 + Math.floor((50 - portrait.width) / 2), y + 6 + Math.floor((50 - portrait.height) / 2));
    ui.text(this.name(id), x + 62, y + 6, COLORS.gold);
    ui.text(T.karten.partie(Math.max(1, m.gameNo)), x + 62, y + 20, COLORS.textDim);
    ui.text(T.karten.stand(m.wins[0], m.wins[1]), x + 62, y + 34, COLORS.text);
    if (m.fast) ui.text('»', x + 170, y + 6, COLORS.gold);
    // Wer ist dran?
    const g = m.g;
    const status = !g || this.wait ? '' : g.over ? '' : g.who === 0 ? T.karten.duDran : T.karten.denkt(this.name(id));
    if (status) ui.text(status, x + 62, y + 47, g.who === 0 ? COLORS.gold : COLORS.textDim);
    // Zeile: Spruch, Tick oder Ereignis – unter dem Porträt (daneben lag sie auf dem Kopf des
    // Gegenübers, der oben in der Mitte des Bildes sitzt)
    if (this.line) {
      const lines = wrap(this.line.text, 176);
      const w = Math.max(...lines.map((l) => measure(l))) + 14;
      const h = lines.length * LINE_HEIGHT + 8;
      const by = y + 66;
      ui.panel(x, by, w, h, { frame: this.line.kind === 'tick' ? COLORS.gold : COLORS.frame });
      lines.forEach((l, k) => ui.text(l, x + 7, by + 4 + k * LINE_HEIGHT, this.line.kind === 'tick' ? COLORS.gold : COLORS.text));
    }
  }

  drawPlace(ui, r, k, pl) {
    const ctx = ui.ctx;
    const back = this.game.state.cards?.back || 'laub';
    const g = this.match.g;
    const theirName = this.name(this.match.id);
    const my = this.game.cardNight.myTurn && !this.beats.length;
    const selHidden = false;
    // Rahmen der eigenen Seite: gold, wenn die gewählte Karte hier hin darf
    const canHere = my && this.canPlace(k, this.sel >= (this.shown?.hand.length || 0) || selHidden);
    if (my && k === this.place) ui.frame(r.mine.x - 3, r.mine.y - 3, r.mine.w + 6, r.mine.h + 6, canHere ? COLORS.gold : COLORS.red);
    else ui.frame(r.mine.x - 3, r.mine.y - 3, r.mine.w + 6, r.mine.h + 6, COLORS.frameDark);
    ui.frame(r.theirs.x - 3, r.theirs.y - 3, r.theirs.w + 6, r.theirs.h + 6, COLORS.frameDark);
    const drawSide = (side, box, mine) => {
      side.cards.forEach((c, i) => {
        const cx = box.x + i * STEP;
        const face = c.v !== null && c.v !== undefined && !(mine ? c.blind : c.hidden) ? { suit: c.suit, v: c.v } : null;
        drawCard(ctx, face, cx, box.y, { back, veil: mine && c.hidden && !c.blind });
      });
      if (side.closed === 'knock') drawIcon(ctx, 'faust', box.x + box.w - 6, box.y - 8);
      if (side.closed === 'hit') ui.text('15', box.x + box.w - 10, box.y - 11, COLORS.gold, { outline: COLORS.outline });
    };
    if (pl) {
      drawSide(pl.theirs, r.theirs, false);
      drawSide(pl.mine, r.mine, true);
    }
    // Mitte: Platzsymbol, Name und Summen
    const lab = r.label;
    drawIcon(ctx, PLACE_ICONS[PLACE_KEYS[k]], lab.x, lab.y + 4);
    ui.text(T.karten.plaetze[k], lab.x + 14, lab.y + 1, COLORS.textWarm);
    if (pl) {
      const sumMine = pl.mine.cards.reduce((a, c) => a + (c.blind ? 0 : c.v || 0), 0);
      const blindMine = pl.mine.cards.some((c) => c.blind);
      const sumTheirs = pl.theirs.cards.reduce((a, c) => a + (c.hidden ? 0 : c.v || 0), 0);
      const hidTheirs = pl.theirs.cards.some((c) => c.hidden);
      const tMine = `${sumMine}${blindMine ? '+?' : ''}`;
      const tTheirs = pl.theirs.cards.length ? `${sumTheirs}${hidTheirs ? '+?' : ''}` : '–';
      const col = (v, hid) => (hid ? COLORS.text : v > TARGET ? COLORS.red : v === TARGET ? COLORS.gold : COLORS.text);
      ui.text(tTheirs, lab.x + lab.w - measure(tTheirs), lab.y + 1, col(sumTheirs, hidTheirs));
      ui.text(tMine, lab.x + lab.w - measure(tMine), lab.y + 11, col(sumMine, blindMine));
      if (pl.winner) {
        const text = pl.winner === 'mine' ? T.karten.platzGewonnen : T.karten.platzVerloren(theirName);
        const w = measure(text) + 10;
        const bx = Math.round(r.x + PLACE_W / 2 - w / 2);
        const by = pl.winner === 'mine' ? r.mine.y + CARD_H - 8 : r.theirs.y + CARD_H - 8;
        ui.panel(bx, by, w, 15, { frame: pl.winner === 'mine' ? COLORS.gold : COLORS.frame });
        ui.text(text, bx + 5, by + 2, pl.winner === 'mine' ? COLORS.gold : COLORS.text);
      }
      // Farbpaare als kleine Zeichen
      pl.mine.pairs?.forEach((p, i) => drawIcon(ctx, `karte-${p}`, r.mine.x - 11, r.mine.y + i * 9));
      pl.theirs.pairs?.forEach((p, i) => drawIcon(ctx, `karte-${p}`, r.theirs.x - 11, r.theirs.y + i * 9));
    }
    if (r.knock) {
      const hov = this.game.ui.hover(r.knock.x, r.knock.y, r.knock.w, r.knock.h);
      ui.inset(r.knock.x, r.knock.y, r.knock.w, r.knock.h, { fill: hov ? COLORS.fillHover : COLORS.inset, border: hov ? COLORS.gold : COLORS.frameDark });
      ui.text('K', r.knock.x + 4, r.knock.y, hov ? COLORS.gold : COLORS.textDim);
    }
    void g;
  }

  drawHand(ui, L, s) {
    const ctx = ui.ctx;
    const back = this.game.state.cards?.back || 'laub';
    const v = this.match.g && !this.match.g.over ? view(this.match.g, 0) : null;
    const choice = v?.choice;
    const my = this.game.cardNight.myTurn && !this.beats.length;
    // Die Karte, die gerade fliegt, liegt nicht mehr in der Hand
    const b0 = this.beats[0];
    const flying = b0?.started && b0.kind === 'lay' && b0.p === 0 ? b0.card.id : null;
    L.hand.forEach((r, k) => {
      const c = s.hand[k];
      if (c && c.id === flying) return;
      const selected = my && k === this.sel && (!choice || choice.kind === 'drop');
      const marked = c && this.marks.includes(c.id);
      const lift = selected ? 5 : marked ? 3 : 0;
      if (c) drawCard(ctx, { suit: c.suit, v: c.v }, r.x, r.y, { lift });
      else {
        // Griff ins Dunkle: die oberste Karte des Stapels
        drawCard(ctx, null, r.x, r.y, { back, lift });
        ui.textCentered('?', r.x + CARD_W / 2, r.y - lift + 12, COLORS.gold, { outline: COLORS.outline });
      }
      if (selected) ui.frame(r.x - 1, r.y - lift - 1, CARD_W + 2, CARD_H + 2, COLORS.gold);
      if (marked) ui.frame(r.x - 1, r.y - lift - 1, CARD_W + 2, CARD_H + 2, COLORS.red);
    });
    if (choice?.kind === 'steal') {
      const rects = this.stealRects(L, choice);
      rects.forEach((r, k) => ui.frame(r.x - 1, r.y - 1, r.w + 2, r.h + 2, k === this.stealSel ? COLORS.gold : COLORS.frameDark));
    }
  }

  /** Karte im Flug (Austeilen, Legen, Griff ins Dunkle, Abwerfen). */
  drawBeat(ui, L) {
    const b = this.beats[0];
    if (!b || !b.started) return;
    const ctx = ui.ctx;
    const back = this.game.state.cards?.back || 'laub';
    const u = ease(Math.min(1, b.t / b.dur));
    const fly = (card, from, to, flip) => {
      const x = from.x + (to.x - from.x) * u;
      const y = from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * 14; // im Bogen
      let squash = 1;
      let face = card;
      if (flip) {
        // Umdrehen in drei Bildern hin und drei zurück
        const f = Math.min(5, Math.floor(u * 6));
        squash = f < 3 ? FLIP_STEPS[f] : FLIP_STEPS[5 - f];
        face = f < 3 ? null : card;
      }
      drawCard(ctx, face, x, y, { back, squash });
    };
    const deck = { x: L.deck.x, y: L.deck.y };
    if (b.kind === 'deal') {
      const to = b.to === 0 ? L.hand[Math.min(L.hand.length - 1, this.shown.hand.length)] || { x: ui.width / 2, y: L.yHand } : { x: ui.width - 20 - CARD_W - this.shown.theirHand * 9, y: 8 };
      fly(null, deck, to, false);
    }
    if (b.kind === 'lay' || b.kind === 'blind') {
      const side = b.p === 0 ? this.shown.places[b.place].mine : this.shown.places[b.place].theirs;
      const box = b.p === 0 ? L.places[b.place].mine : L.places[b.place].theirs;
      const to = { x: box.x + side.cards.length * STEP, y: box.y };
      const from = b.kind === 'blind' ? deck : b.p === 0 ? L.hand[Math.max(0, this.shown.hand.findIndex((c) => c.id === b.card.id))] || deck : { x: ui.width - 20 - CARD_W, y: 8 };
      const open = b.kind === 'lay' && (!b.hidden || b.p === 0) ? { suit: b.card.suit, v: b.card.v } : null;
      fly(open, from, to, b.p === 1 && Boolean(open));
    }
    if (b.kind === 'knock') {
      const box = b.p === 0 ? L.places[b.place].mine : L.places[b.place].theirs;
      const bump = b.t < 0.08 || (b.t > 0.22 && b.t < 0.3) ? 2 : 0;
      drawIcon(ctx, 'faust', box.x + PLACE_W / 2 - 5, box.y - 12 + bump);
    }
    if (b.kind === 'hit') {
      const box = b.p === 0 ? L.places[b.place].mine : L.places[b.place].theirs;
      const text = T.karten.volltreffer;
      ui.text(text, box.x + PLACE_W / 2 - measure(text) / 2, box.y - 12 - Math.round(u * 6), COLORS.gold, { outline: COLORS.outline });
    }
    if (b.kind === 'resolve' && b.pl) {
      // Summen zählen hoch, dann steht der Sieger
      const box = L.places[b.e.place];
      if (b.decided) {
        const w = b.e.winner === 0 ? box.mine : box.theirs;
        ui.frame(w.x - 4, w.y - 4, w.w + 8, w.h + 8, COLORS.gold);
      }
    }
  }

  /** Funken, Blätter, Mondschimmer, Kastanien – kleine Pixel-Wirkungen über den Karten. */
  burst(kind, p, place, n = 12) {
    const L = this.layout(this.game.ui);
    const box = p === 0 ? L.places[place].mine : L.places[place].theirs;
    const cx = box.x + PLACE_W / 2;
    const cy = box.y + CARD_H / 2;
    const color = { feuer: [P.f6, P.f4, P.f7], blatt: [P.g6, P.e6, P.f5], mond: [P.s9, P.b5, P.a3], kraehe: [P.n1, P.d2, P.n2], kastanie: [P.e4, P.e6, P.f3] }[kind] || [P.s9];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.time;
      const sp = 20 + ((i * 37) % 23);
      this.effects.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 18, t: 0, dur: 0.5 + (i % 4) * 0.08, color: css(color[i % color.length]), size: kind === 'kastanie' ? 2 : 1 });
    }
  }

  drawEffects(ui) {
    const ctx = ui.ctx;
    for (const f of this.effects) {
      const x = Math.round(f.x + f.vx * f.t);
      const y = Math.round(f.y + f.vy * f.t + 30 * f.t * f.t);
      ctx.fillStyle = f.color;
      ctx.fillRect(x, y, f.size, f.size);
    }
  }

  drawFooter(ui) {
    const m = this.match;
    if (!m.g || this.wait || this.beats.length) return;
    const v = view(m.g, 0);
    let text = '';
    if (v.choice) text = v.choice.kind === 'drop' ? T.karten.wahl.drop(v.choice.n) : T.karten.wahl.steal;
    else if (m.g.who === 0 && !moves(m.g).some((mv) => mv.kind === 'lay' || mv.kind === 'blind')) text = T.karten.aussetzen;
    else if (m.g.who === 0) text = T.karten.tasten + (this.canBlind() ? ` · ${T.karten.tasteDunkel}` : '') + ` · ${T.karten.tasteSchnell}`;
    if (v.pending && !v.pending.mine && m.g.who === 0) text = `${T.karten.letzterZug} ${text}`;
    if (text) {
      const lines = wrap(text, ui.width - 20);
      lines.forEach((l, k) => ui.textCentered(l, ui.width / 2, ui.height - 14 - (lines.length - 1 - k) * LINE_HEIGHT, COLORS.textDim));
    }
  }

  drawResult(ui, res) {
    const m = this.match;
    const name = this.name(m.id);
    const rows = [res.won ? T.karten.abendGewonnen(name) : T.karten.abendVerloren(name)];
    if (res.reward.stake) rows.push(T.karten.stueckGewonnen(T.karten.stuecke[res.reward.stake]));
    if (res.reward.back) rows.push(T.karten.rueckseiteNeu(T.karten.rueckseiten[res.reward.back]));
    const d = res.reward.duty;
    if (d) rows.push(T.karten.pflichtMorgen(d.who === 'mika' ? 'Mika' : this.name(d.who), T.karten.pflichten[d.what]));
    const w = Math.min(ui.width - 40, Math.max(...rows.map((r) => measure(r))) + 30);
    const lines = rows.flatMap((r) => wrap(r, w - 24));
    const h = lines.length * LINE_HEIGHT + 20;
    const x = Math.round((ui.width - w) / 2);
    // über der Reihe des Gegenübers (die zählt jetzt nicht mehr) – weiter oben verdeckte die
    // Tafel die Zeile unter dem Porträt und den Tisch
    const y = Math.round(this.layout(ui).places[0].theirs.y - 12);
    ui.panel(x, y, w, h, { frame: res.won ? COLORS.gold : COLORS.frame });
    lines.forEach((l, k) => ui.textCentered(l, ui.width / 2, y + 10 + k * LINE_HEIGHT, k === 0 ? (res.won ? COLORS.gold : COLORS.textWarm) : COLORS.text));
  }

  drawConfirm(ui) {
    const L = this.confirmLayout(ui);
    ui.ditherFill(0.3);
    ui.panel(L.x, L.y, L.w, L.h);
    const lines = wrap(T.karten.aufgeben, L.w - 20);
    lines.forEach((l, k) => ui.textCentered(l, L.x + L.w / 2, L.y + 8 + k * LINE_HEIGHT, COLORS.text));
    [T.karten.weiterspielen, T.karten.beenden].forEach((label, k) => {
      const b = L.buttons[k];
      ui.button(label, b.x, b.y, b.w, b.h, { focused: this.confirm.choice === k });
    });
  }
}

function pickLine(list, t) {
  if (!list || !list.length) return '';
  return list[Math.floor(t * 7) % list.length];
}
