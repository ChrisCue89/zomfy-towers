// »Letzte Runde« (M28, OFFENE-FRAGEN 172–174): das Kartenspiel am Feuer.
// Nur Regeln und KI, keine Darstellung – tools/karten.mjs spielt damit
// Tausende Partien. Eine Partie ist ein Zustandsobjekt: `moves(g)` nennt die
// erlaubten Züge, `play(g, zug)` führt einen aus, `view(g, p)` zeigt, was
// Spieler p sieht. Nur aus dieser Tischansicht entscheidet die KI
// (`aiMove`): Sie kennt weder den Stapel noch verdeckte Karten.
//
// Regeln (geprüft im Simulator, recherche/kartenspiel.md):
//   36 Karten (Blatt, Feuer, Mond, Krähe, je 1–9), fünf auf der Hand, drei
//   Plätze (Laterne, Kessel, Kürbis), höchstens drei Karten je Platz und Seite,
//   je Platz höchstens eine eigene verdeckte. Jeder Zug: genau eine Karte an
//   einen eigenen Platz (offen oder verdeckt), dann nachziehen. Genau 15 schließt
//   die Seite (Volltreffer). Klopfen einmal je Partie statt zu legen (Seite mit
//   mindestens zwei Karten): Der andere hat noch einen Zug, dann wird der Platz
//   entschieden. Näher an 15 gewinnt, 15 oder weniger schlägt »geplatzt«, beide
//   drüber: weniger drüber gewinnt. Gleichstand: Mondlicht, dann weniger Karten,
//   dann die höhere Einzelkarte, dann wer nicht angefangen hat. Zwei Plätze
//   gewinnen die Partie.
//   Stufe 2 – Farbpaare (die zweite offene Karte einer Farbe an einem eigenen
//   Platz, einmal je Farbe und Seite): Feuer »Glut« (14 oder 16 zählt als 15),
//   Blatt »Laubwirbel« (zwei ziehen, zwei abwerfen), Mond »Mondlicht« (eine
//   verdeckte Karte des anderen aufdecken, ein Gleichstand hier gehört dir),
//   Krähe »Krähendieb« (eine offene Karte des anderen hier abwerfen, nicht nach
//   einem Klopfen).
//   Stufe 3 – Griff ins Dunkle: statt einer Handkarte die oberste Stapelkarte
//   ungesehen verdeckt legen (kein Nachziehen, kein Volltreffer damit).

export const SUITS = ['blatt', 'feuer', 'mond', 'kraehe'];
export const PLACE_KEYS = ['laterne', 'kessel', 'kuerbis'];
export const CAP = 3;
export const HAND = 5;
export const TARGET = 15;
const MAX_TURNS = 80;

/** Kleiner, fester Zufall aus einem Startwert (Mulberry32). */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const newSide = () => ({ cards: [], closed: null, pairs: [], glut: false, moonTie: false });

/**
 * Neue Partie.
 * @param {number} seed Startwert (Mischen)
 * @param {{stage?: 1|2|3, starter?: 0|1}} [o] Regelstufe und wer anfängt
 */
export function newGame(seed, { stage = 1, starter = 0 } = {}) {
  const rand = rng(seed);
  const deck = [];
  let id = 0;
  for (const suit of SUITS) for (let v = 1; v <= 9; v++) deck.push({ id: id++, suit, v });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return {
    stage,
    starter,
    who: starter,
    turn: 0,
    deck,
    discard: [],
    hands: [deck.splice(0, HAND), deck.splice(0, HAND)],
    places: PLACE_KEYS.map(() => ({ sides: [newSide(), newSide()], winner: null })),
    knocked: [false, false],
    pending: null, // Klopfen: { place, by }
    passes: 0,
    over: false,
    winner: null,
    events: [],
  };
}

// --- Hilfen --------------------------------------------------------------------------

const sum = (s) => s.cards.reduce((a, c) => a + c.v, 0);
const hasHidden = (s) => s.cards.some((c) => c.hidden);
const hasBlind = (s) => s.cards.some((c) => c.blind);
const sideDone = (s) => Boolean(s.closed) || s.cards.length >= CAP;

/** Wert einer Seite für die Wertung (Glut: 14 oder 16 zählt als 15). */
export function sideValue(s) {
  const v = sum(s);
  return s.glut && (v === 14 || v === 16) ? TARGET : v;
}

/** Kann p am Platz k noch legen? */
export function openFor(g, p, k) {
  const pl = g.places[k];
  const s = pl.sides[p];
  return pl.winner === null && !s.closed && s.cards.length < CAP;
}

const canMove = (g, p) => [0, 1, 2].some((k) => openFor(g, p, k)) && (g.hands[p].length > 0 || (g.stage >= 3 && g.deck.length > 0));

function draw(g, p) {
  while (g.hands[p].length < HAND && g.deck.length) g.hands[p].push(g.deck.shift());
}

/** Volltreffer: genau 15 ohne Blindkarte schließt die Seite (und öffnet sie wieder, wenn eine Karte fortkommt). */
function checkHit(g, p, s, k) {
  if (s.closed === 'hit' && (hasBlind(s) || sum(s) !== TARGET)) s.closed = null;
  if (!s.closed && !hasBlind(s) && sum(s) === TARGET) {
    s.closed = 'hit';
    g.events.push({ kind: 'hit', p, place: k, open: !hasHidden(s) });
  }
}

/** Rangfolge: 15 oder weniger vor »geplatzt«, darunter weniger drüber besser. */
const rank = (v) => (v <= TARGET ? v : TARGET - (v - TARGET) - 100);

/** Platz k entscheiden (Seiten, wie sie gerade liegen). */
function resolve(g, k, why = 'voll') {
  const pl = g.places[k];
  if (pl.winner !== null) return;
  const [a, b] = pl.sides;
  const ra = rank(sideValue(a));
  const rb = rank(sideValue(b));
  let w;
  let tie = null;
  if (ra !== rb) w = ra > rb ? 0 : 1;
  else if (a.moonTie !== b.moonTie) {
    w = a.moonTie ? 0 : 1;
    tie = 'mond';
  } else if (a.cards.length !== b.cards.length) {
    w = a.cards.length < b.cards.length ? 0 : 1;
    tie = 'karten';
  } else {
    const ma = Math.max(0, ...a.cards.map((c) => c.v));
    const mb = Math.max(0, ...b.cards.map((c) => c.v));
    if (ma !== mb) {
      w = ma > mb ? 0 : 1;
      tie = 'hoch';
    } else {
      w = 1 - g.starter;
      tie = 'anfang';
    }
  }
  pl.winner = w;
  // Aufgedeckt wird alles an diesem Platz (bewusst verdeckte Karten merkt sich, wer liest)
  const revealed = pl.sides.map((s) => s.cards.filter((c) => c.hidden && !c.blind).map((c) => c.v));
  for (const s of pl.sides) for (const c of s.cards) {
    c.hidden = false;
    c.blind = false;
  }
  g.events.push({ kind: 'resolve', place: k, winner: w, values: [sideValue(a), sideValue(b)], tie, why, revealed });
}

function finish(g) {
  const won = [0, 1].map((p) => g.places.filter((pl) => pl.winner === p).length);
  const decided = won[0] >= 2 || won[1] >= 2 || g.places.every((pl) => pl.winner !== null);
  if (!decided) return false;
  // Zum Schluss werden alle verdeckten Karten gezeigt (die Nachschau)
  const revealed = [[], []];
  for (const pl of g.places) pl.sides.forEach((s, q) => revealed[q].push(...s.cards.filter((c) => c.hidden && !c.blind).map((c) => c.v)));
  for (const pl of g.places) for (const s of pl.sides) for (const c of s.cards) {
    c.hidden = false;
    c.blind = false;
  }
  g.over = true;
  g.winner = won[0] > won[1] ? 0 : 1;
  g.events.push({ kind: 'over', winner: g.winner, places: won, revealed });
  return true;
}

// --- Farbpaare (Stufe 2) --------------------------------------------------------------

/** Schätzwert einer unbekannten Karte für Spieler p (Mittel der ungesehenen). */
function guess(v) {
  let n = 0;
  let s = 0;
  for (let x = 1; x <= 9; x++) {
    n += Math.max(0, v.unseen[x]);
    s += x * Math.max(0, v.unseen[x]);
  }
  return n ? s / n : 5;
}

function trigger(g, p, k, suit) {
  const me = g.places[k].sides[p];
  const op = g.places[k].sides[1 - p];
  me.pairs.push(suit);
  g.events.push({ kind: 'pair', p, place: k, suit });
  if (suit === 'feuer') me.glut = true;
  if (suit === 'blatt') {
    // Zwei ziehen, dann zwei Handkarten abwerfen (die Wahl ist ein eigener Zug: `drop`)
    let n = 0;
    for (let i = 0; i < 2 && g.deck.length; i++, n++) g.hands[p].push(g.deck.shift());
    const drop = Math.min(2, g.hands[p].length - 1);
    if (drop > 0) g.choice = { kind: 'drop', p, place: k, n: drop, drew: n };
  }
  if (suit === 'mond') {
    me.moonTie = true;
    // Eine verdeckte Karte des anderen aufdecken: hier zuerst, sonst an einem offenen Platz
    const cand = [...op.cards.filter((c) => c.hidden)];
    for (const pl of g.places) if (pl.winner === null && pl !== g.places[k]) cand.push(...pl.sides[1 - p].cards.filter((c) => c.hidden));
    if (cand.length) {
      cand[0].hidden = false;
      cand[0].blind = false;
      g.events.push({ kind: 'reveal', p, card: cand[0].id });
      g.places.forEach((pl, j) => checkHit(g, 1 - p, pl.sides[1 - p], j));
    }
  }
  if (suit === 'kraehe') {
    // Eine offene Karte des anderen hier abwerfen – wer will, lässt es (die Wahl ist `steal`)
    if (op.closed === 'knock') return;
    const open = op.cards.filter((c) => !c.hidden);
    if (open.length) g.choice = { kind: 'steal', p, place: k, cards: open.map((c) => c.id) };
  }
}

/** Eine Wahl aus einem Farbpaar ausführen (Laubwirbel: abwerfen, Krähendieb: fortnehmen). */
function settleChoice(g, move) {
  const ch = g.choice;
  const p = ch.p;
  if (ch.kind === 'drop') {
    for (const id of move.cards.slice(0, ch.n)) {
      const i = g.hands[p].findIndex((c) => c.id === id);
      if (i >= 0) g.discard.push(...g.hands[p].splice(i, 1));
    }
    g.events.push({ kind: 'drop', p, cards: move.cards.slice(0, ch.n) });
  } else if (ch.kind === 'steal' && move.card !== null && move.card !== undefined) {
    const op = g.places[ch.place].sides[1 - p];
    const i = op.cards.findIndex((c) => c.id === move.card);
    if (i >= 0) {
      const [c] = op.cards.splice(i, 1);
      g.discard.push(c);
      g.events.push({ kind: 'steal', p, place: ch.place, card: c.id });
      checkHit(g, 1 - p, op, ch.place);
    }
  }
  g.choice = null;
}

// --- Züge ------------------------------------------------------------------------------

/** Erlaubte Züge des Spielers am Zug. */
export function moves(g) {
  if (g.over) return [];
  const p = g.who;
  const out = [];
  if (g.choice) {
    const ch = g.choice;
    if (ch.kind === 'drop') {
      const ids = g.hands[p].map((c) => c.id);
      if (ch.n === 1) for (const a of ids) out.push({ kind: 'drop', cards: [a] });
      else for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) out.push({ kind: 'drop', cards: [ids[i], ids[j]] });
    } else {
      for (const id of ch.cards) out.push({ kind: 'steal', card: id });
      out.push({ kind: 'steal', card: null });
    }
    return out;
  }
  for (let k = 0; k < 3; k++) {
    if (!openFor(g, p, k)) continue;
    const canHide = !hasHidden(g.places[k].sides[p]);
    for (const c of g.hands[p]) {
      out.push({ kind: 'lay', card: c.id, place: k, hidden: false });
      if (canHide) out.push({ kind: 'lay', card: c.id, place: k, hidden: true });
    }
    if (g.stage >= 3 && canHide && g.deck.length) out.push({ kind: 'blind', place: k });
  }
  // Wer nichts legen kann, setzt aus – Klopfen bleibt freiwillig
  if (!out.length) out.push({ kind: 'pass' });
  if (!g.knocked[p] && !g.pending) {
    for (let k = 0; k < 3; k++) {
      const s = g.places[k].sides[p];
      if (g.places[k].winner === null && !s.closed && s.cards.length >= 2) out.push({ kind: 'knock', place: k });
    }
  }
  return out;
}

/** Schlüssel eines Zugs (Reihenfolge der abgeworfenen Karten egal). */
const moveKey = (m) => JSON.stringify({ kind: m.kind, place: m.place ?? null, card: m.card ?? null, hidden: Boolean(m.hidden), cards: m.cards ? [...m.cards].sort((a, b) => a - b) : null });

/** Steht der Zug in `moves(g)`? */
export function isLegal(g, move) {
  const key = moveKey(move);
  return moves(g).some((m) => moveKey(m) === key);
}

/** Einen Zug ausführen (muss in `moves(g)` stehen). Gibt die Ereignisse dieses Zugs zurück. */
export function play(g, move) {
  if (g.over) return [];
  g.events = [];
  const p = g.who;
  if (g.choice) {
    settleChoice(g, move);
    endTurn(g);
    return g.events;
  }
  g.ctx = { pending: g.pending, place: null, draw: false };
  if (move.kind === 'knock') {
    const s = g.places[move.place].sides[p];
    s.closed = 'knock';
    g.knocked[p] = true;
    g.pending = { place: move.place, by: p };
    g.events.push({ kind: 'knock', p, place: move.place });
  } else if (move.kind === 'lay' || move.kind === 'blind') {
    const k = move.place;
    const s = g.places[k].sides[p];
    g.ctx.place = k;
    if (move.kind === 'blind') {
      const c = g.deck.shift();
      s.cards.push({ ...c, hidden: true, blind: true });
      g.events.push({ kind: 'blind', p, place: k });
    } else {
      const i = g.hands[p].findIndex((c) => c.id === move.card);
      const [c] = g.hands[p].splice(i, 1);
      const card = { ...c, hidden: Boolean(move.hidden), blind: false };
      s.cards.push(card);
      g.events.push({ kind: 'lay', p, place: k, card: card.id, hidden: card.hidden, v: card.hidden ? null : card.v, suit: card.hidden ? null : card.suit });
      g.ctx.draw = true;
      const pair = g.stage >= 2 && !card.hidden && !s.pairs.includes(card.suit) && s.cards.filter((q) => !q.hidden && q.suit === card.suit).length >= 2;
      if (pair) trigger(g, p, k, card.suit);
      if (g.choice) return g.events; // erst wählen, dann geht der Zug weiter
    }
  } else {
    g.events.push({ kind: 'pass', p });
  }
  endTurn(g);
  return g.events;
}

/** Zugende: nachziehen, Volltreffer, Klopfen auflösen, fertige Plätze entscheiden, weitergeben. */
function endTurn(g) {
  const p = g.who;
  const ctx = g.ctx || { pending: null, place: null, draw: false };
  g.ctx = null;
  if (ctx.draw) draw(g, p);
  if (ctx.place !== null) checkHit(g, p, g.places[ctx.place].sides[p], ctx.place);
  // Der letzte Zug nach einem Klopfen ist gemacht: aufdecken und entscheiden
  if (ctx.pending && ctx.pending.by !== p) {
    resolve(g, ctx.pending.place, 'klopfen');
    g.pending = null;
  }
  // Plätze, an denen beide fertig sind (oder keiner mehr legen kann)
  for (let k = 0; k < 3; k++) {
    const pl = g.places[k];
    if (pl.winner !== null || (g.pending && g.pending.place === k)) continue;
    if (pl.sides.every((s, q) => sideDone(s) || !canMove(g, q))) resolve(g, k);
  }
  g.turn++;
  if (!finish(g)) {
    if (g.turn >= MAX_TURNS || (!canMove(g, 0) && !canMove(g, 1) && !g.pending)) {
      for (let k = 0; k < 3; k++) resolve(g, k, 'ende');
      finish(g);
    } else g.who = 1 - p;
  }
}

// --- Tischansicht und KI --------------------------------------------------------------

/**
 * Was Spieler p sieht: eigene Hand, offene Karten, eigene verdeckte (nicht die
 * blind gelegten), Zähler des Stapels, abgeworfene Karten. Verdeckte Karten des
 * anderen stehen als { hidden: true } ohne Wert darin.
 */
export function view(g, p) {
  const unseen = [0, 4, 4, 4, 4, 4, 4, 4, 4, 4];
  const places = g.places.map((pl) => {
    const mine = pl.sides[p];
    const theirs = pl.sides[1 - p];
    const showMine = mine.cards.map((c) => (c.blind ? { id: null, hidden: true, blind: true, v: null, suit: null } : { id: c.id, v: c.v, suit: c.suit, hidden: c.hidden }));
    // Verdeckte Karten des anderen tragen keine ID – die verriete Farbe und Wert
    const showTheirs = theirs.cards.map((c) => (c.hidden ? { id: null, hidden: true, v: null, suit: null } : { id: c.id, v: c.v, suit: c.suit, hidden: false }));
    for (const c of [...showMine, ...showTheirs]) if (c.v) unseen[c.v]--;
    return {
      winner: pl.winner === null ? null : pl.winner === p ? 'mine' : 'theirs',
      mine: { cards: showMine, closed: mine.closed, pairs: [...mine.pairs], glut: mine.glut, moonTie: mine.moonTie },
      // Ein Volltreffer mit verdeckter Karte bleibt ein Geheimnis, bis aufgedeckt wird
      theirs: { cards: showTheirs, closed: theirs.closed === 'hit' && hasHidden(theirs) ? null : theirs.closed, pairs: [...theirs.pairs], glut: theirs.glut, moonTie: theirs.moonTie },
    };
  });
  const hand = g.hands[p].map((c) => ({ id: c.id, v: c.v, suit: c.suit }));
  for (const c of hand) unseen[c.v]--;
  for (const c of g.discard) unseen[c.v]--;
  return {
    me: p,
    stage: g.stage,
    myTurn: g.who === p && !g.over,
    starter: g.starter === p,
    hand,
    places,
    deck: g.deck.length,
    theirHand: g.hands[1 - p].length,
    knocked: { mine: g.knocked[p], theirs: g.knocked[1 - p] },
    pending: g.pending ? { place: g.pending.place, mine: g.pending.by === p } : null,
    choice: g.choice && g.choice.p === p ? { ...g.choice } : null,
    unseen,
    over: g.over,
    won: g.over ? g.winner === p : null,
  };
}

/** Ausgewogener Grundstil (Simulator, Vergleich); die Figuren stehen in data/cards.js. */
export const STYLES = {
  ausgewogen: { caution: 1, bluff: 1, aggro: 0.5, knockAt: 2, combo: 1, gamble: 0.5 },
};

const SUIT_BONUS = { feuer: 4, kraehe: 3.5, blatt: 2.5, mond: 2.5 };

/**
 * Geschätzter Wert einer unbekannten Karte. `count` (0–1) ist das Gedächtnis:
 * 0 schätzt immer 5, 1 rechnet mit dem Mittel der ungesehenen Karten.
 */
function estimate(v, style) {
  const c = style.count === true ? 1 : style.count || 0;
  return 5 + c * (guess(v) - 5);
}

/**
 * Schätzwert einer verdeckten Karte des anderen. `read` (0–1) ist das Lesen: Es
 * rückt die Schätzung zu dem, was der andere bisher verdeckt hatte (`v.read`,
 * vom Spiel aus früheren Partien mitgegeben).
 */
function estimateTheirs(v, style) {
  const e = estimate(v, style);
  return v.read && style.read ? e + style.read * (v.read - e) : e;
}

/** Wie gut ist eine Karte mit Wert val an Platz k (aus Sicht der Tischansicht)? */
function placeScore(v, k, val, hidden, suit, blind, style) {
  const E = estimate(v, style);
  const Eo = estimateTheirs(v, style);
  const me = v.places[k].mine;
  const op = v.places[k].theirs;
  const known = me.cards.reduce((a, c) => a + (c.blind ? E : c.v), 0);
  const t = known + val;
  const left = CAP - me.cards.length - 1;
  const opVis = op.cards.reduce((a, c) => a + (c.hidden ? Eo : c.v), 0);
  const opDone = Boolean(op.closed) || op.cards.length >= CAP;
  const opAllVisible = op.cards.every((c) => !c.hidden);
  const lost = opDone && opAllVisible && opVis <= TARGET && opVis >= 14;
  if (t > TARGET) return -60 - (t - TARGET) + (lost ? 55 : 0);
  let s = 0;
  if (lost) s -= 5 + val * 0.5;
  const room = TARGET - t - left;
  if (room < 0) s -= 25 * -room * style.caution;
  const want = TARGET - left * 3.5;
  s -= Math.abs(t - want) * 1.2;
  if (t === TARGET) s += 12;
  if (!blind) s -= (9 - val) * 0.35 * (left + 1) * 0.3;
  if (suit && v.stage >= 2 && !hidden && me.cards.some((q) => !q.hidden && q.suit === suit) && !me.pairs.includes(suit)) s += style.combo * SUIT_BONUS[suit];
  if (opDone && opVis <= TARGET && opVis > t + left * 5) s -= 6;
  return s;
}

function blindScore(v, k, style) {
  const E = estimate(v, style);
  const me = v.places[k].mine;
  const known = me.cards.reduce((a, c) => a + (c.blind ? E : c.v), 0);
  let n = 0;
  for (let x = 1; x <= 9; x++) n += Math.max(0, v.unseen[x]);
  if (!n) return -Infinity;
  let ev = 0;
  let bust = 0;
  for (let x = 1; x <= 9; x++) {
    if (v.unseen[x] <= 0) continue;
    const w = v.unseen[x] / n;
    ev += w * placeScore(v, k, x, true, null, true, style);
    if (known + x > TARGET) bust += w;
  }
  return ev - bust * 10 * style.caution + style.gamble * 3;
}

/** Wahl nach einem Farbpaar – nur aus der Tischansicht. */
function aiChoice(v, style) {
  const ch = v.choice;
  if (ch.kind === 'drop') {
    // Die Handkarten abwerfen, die nirgends gut passen
    const scored = v.hand.map((c) => {
      let best = -Infinity;
      for (let k = 0; k < 3; k++) {
        const pl = v.places[k];
        if (pl.winner !== null || pl.mine.closed || pl.mine.cards.length >= CAP) continue;
        best = Math.max(best, placeScore(v, k, c.v, false, c.suit, false, style));
      }
      return { id: c.id, s: best };
    });
    scored.sort((a, b) => a.s - b.s);
    return { kind: 'drop', cards: scored.slice(0, ch.n).map((x) => x.id) };
  }
  // Krähendieb: die offene Karte fortnehmen, die dem anderen am meisten nützt – oder keine
  const E = estimate(v, style);
  const Eo = estimateTheirs(v, style);
  const pl = v.places[ch.place];
  const my = pl.mine.cards.reduce((a, c) => a + (c.blind ? E : c.v), 0);
  const ot = pl.theirs.cards.reduce((a, c) => a + (c.hidden ? Eo : c.v), 0);
  let best = null;
  for (const c of pl.theirs.cards) {
    if (c.hidden || !ch.cards.includes(c.id)) continue;
    const after = ot - c.v;
    const gain = (rank(my) > rank(after) ? 1 : 0) - (rank(my) > rank(ot) ? 1 : 0) + (rank(ot) - rank(after)) * 0.02;
    if (!best || gain > best.gain) best = { id: c.id, gain };
  }
  return { kind: 'steal', card: best && best.gain > 0 ? best.id : null };
}

/** Wie sieht Platz k nach einer Karte mit Wert val aus? 'strong', 'weak' oder 'ok' (für den Tick). */
function outlook(v, k, val, style) {
  const E = estimate(v, style);
  const Eo = estimateTheirs(v, style);
  const pl = v.places[k];
  const t = pl.mine.cards.reduce((a, c) => a + (c.blind ? E : c.v), 0) + val;
  const opp = pl.theirs.cards.reduce((a, c) => a + (c.hidden ? Eo : c.v), 0);
  const opDone = Boolean(pl.theirs.closed) || pl.theirs.cards.length >= CAP;
  if (t > TARGET) return 'weak';
  if (t === TARGET || (t >= TARGET - 2 && opp < t)) return 'strong';
  if (opDone && opp <= TARGET && opp > t && pl.mine.cards.length + 1 >= CAP) return 'weak';
  return 'ok';
}

/**
 * Der Zug der KI – nur aus der Tischansicht `v` (siehe view). `rand` ist ihr
 * eigener Zufall (Bluff, Patzer, Tick), nicht der des Stapels.
 * @returns {{move: object, mood: {strong: boolean, unsure: boolean, bluff: boolean, pairPrep: boolean}}}
 *   Zug und Stimmung – daraus macht data/cards.js den sichtbaren Tick
 */
export function aiMove(v, style, rand) {
  if (v.choice) return { move: aiChoice(v, style), mood: null };
  const cands = [];
  for (let k = 0; k < 3; k++) {
    const me = v.places[k].mine;
    if (v.places[k].winner !== null || me.closed || me.cards.length >= CAP) continue;
    const canHide = !me.cards.some((c) => c.hidden);
    for (const c of v.hand) {
      cands.push({ move: { kind: 'lay', card: c.id, place: k, hidden: false }, s: placeScore(v, k, c.v, false, c.suit, false, style), v: c.v, suit: c.suit });
      if (canHide) {
        // Bluff: hohe Karten verdeckt ist Taktik; wer `bluffLow` hat, versteckt auch schwache, um stark zu wirken
        const bluff = style.bluff * (c.v >= 6 ? 1.5 : 1) * (1 + rand()) + (style.bluffLow && c.v <= 4 ? style.bluffLow * 3 * rand() : 0);
        cands.push({ move: { kind: 'lay', card: c.id, place: k, hidden: true }, s: placeScore(v, k, c.v, true, c.suit, false, style) + bluff - 1, v: c.v, suit: c.suit });
      }
    }
    if (v.stage >= 3 && canHide && v.deck > 0) cands.push({ move: { kind: 'blind', place: k }, s: blindScore(v, k, style) });
  }
  let knock = null;
  if (!v.knocked.mine && !v.pending && style.knockAt >= 0) {
    const E = estimate(v, style);
    const Eo = estimateTheirs(v, style);
    for (let k = 0; k < 3; k++) {
      const pl = v.places[k];
      const me = pl.mine;
      if (pl.winner !== null || me.closed || me.cards.length < 2) continue;
      const t = me.cards.reduce((a, c) => a + (c.blind ? E : c.v), 0);
      const opT = pl.theirs.cards.reduce((a, c) => a + (c.hidden ? Eo : c.v), 0);
      if (t <= TARGET && t >= TARGET - style.knockAt && opT < t - 1 + style.aggro * 2) knock = { move: { kind: 'knock', place: k }, s: 20 + t };
    }
  }
  if (!cands.length && !knock) return { move: { kind: 'pass' }, mood: null };
  cands.sort((a, b) => b.s - a.s);
  let best = cands[0];
  const second = cands[1];
  if (best && cands.length > 1 && style.mistake && rand() < style.mistake) best = cands[1 + Math.floor(rand() * Math.min(3, cands.length - 1))];
  const pick = knock && (!best || knock.s > best.s + 8 * (1 - style.aggro)) ? knock : best;
  // Stimmung für den Tick (nur aus der Tischansicht): stark (Volltreffer, Klopfen oder dicht dran und vorn),
  // unsicher (erzwungen schwacher Zug oder ein Platz, der verloren aussieht), Bluff (schwache Karte verdeckt),
  // verdeckt, Paar in Vorbereitung (offen, und eine zweite Karte der Farbe wartet auf der Hand)
  const mv = pick.move;
  const out = mv.kind === 'lay' ? outlook(v, mv.place, pick.v, style) : mv.kind === 'knock' ? 'strong' : 'ok';
  const mood = {
    strong: out === 'strong',
    unsure: out === 'weak' || (mv.kind === 'lay' && pick.s <= -2.5),
    bluff: mv.kind === 'lay' && mv.hidden && pick.v <= 4,
    hidden: (mv.kind === 'lay' && mv.hidden) || mv.kind === 'blind',
    pairPrep: mv.kind === 'lay' && !mv.hidden && v.stage >= 2 && !v.places[mv.place].mine.pairs.includes(pick.suit) && !v.places[mv.place].mine.cards.some((q) => !q.hidden && q.suit === pick.suit) && v.hand.some((c) => c.id !== mv.card && c.suit === pick.suit),
    knock: mv.kind === 'knock',
  };
  return { move: mv, mood };
}

/**
 * Zeigt die Figur ihren Tick? `tell` aus data/cards.js ({ mood, rate, fake }),
 * `mood` aus aiMove. Kommt die Stimmung vor, zuckt sie mit `rate`, sonst mit
 * `fake` (Gegen-Tick).
 */
export function showTell(tell, mood, rand) {
  if (!tell || !mood) return false;
  return rand() < (mood[tell.mood] ? tell.rate : tell.fake);
}
