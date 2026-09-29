// Variantensimulator für »Letzte Runde« (Recherche, nicht im Spiel).
// Baut auf karten-sim.mjs auf, rechnet aber mit Wissen je Sicht:
// Die KI kennt nur eigene Karten, offene Karten und Gespähtes (Mond A);
// verdeckte Karten des Gegners schätzt sie (5 oder – Stil »zaehlt« – den
// Mittelwert der ungesehenen Karten). Blinde Karten kennt niemand.
// node karten-sim-v2.mjs [spiele]

const GAMES = Number(process.argv[2] || 20000);
const SUITS = ['blatt', 'feuer', 'mond', 'kraehe'];

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function makeDeck(r) {
  const d = [];
  let id = 0;
  for (const suit of SUITS) for (let v = 1; v <= 9; v++) d.push({ v, suit, id: id++, hidden: false, blind: false });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

const SUITBONUS = { feuer: 4, kraehe: 3.5, blatt: 2.5, mond: 2.5 };

function play(seed, rules, styles) {
  const r = rng(seed);
  const deck = makeDeck(r);
  const discard = [];
  const P = [0, 1].map((p) => ({ hand: deck.splice(0, rules.hands[p]), handMax: rules.hands[p], knocked: false, peeked: new Set(), style: styles[p] }));
  const places = [0, 1, 2].map(() => ({ side: [0, 1].map(() => ({ cards: [], closed: null, doneAt: Infinity, fire: false, pair: new Set() })), resolved: null }));
  const st = { decidedAt: 0, tieCards: 0, tieHigh: 0, tieKomi: 0, tiePlaces: 0, busts: 0, forced: 0, knocks: 0, blind: 0, blindBust: 0, hits: 0, turns: 0, reveals: 0, swaps: 0, trig: { blatt: [0, 0], feuer: [0, 0], mond: [0, 0], kraehe: [0, 0] } };
  let turn = 0;
  let who = 0;
  let pending = null; // Klopfen: { k, by }

  // ---- Wissen ----------------------------------------------------------
  const unseen = (p) => {
    const cnt = [0, 4, 4, 4, 4, 4, 4, 4, 4, 4];
    for (const c of P[p].hand) cnt[c.v]--;
    for (const pl of places) for (let q = 0; q < 2; q++) for (const c of pl.side[q].cards) {
      const visible = q === p ? !c.blind : !c.hidden || P[p].peeked.has(c.id);
      if (visible) cnt[c.v]--;
    }
    for (const c of discard) cnt[c.v]--;
    return cnt;
  };
  const expect = (p) => {
    if (!P[p].style.count) return 5;
    const cnt = unseen(p);
    let n = 0;
    let s = 0;
    for (let v = 1; v <= 9; v++) {
      n += Math.max(0, cnt[v]);
      s += v * Math.max(0, cnt[v]);
    }
    return n ? s / n : 5;
  };
  const actual = (s) => s.cards.reduce((a, c) => a + c.v, 0);
  const known = (p, s, E) => s.cards.reduce((a, c) => a + (c.blind ? E : c.v), 0); // Sicht des Besitzers
  const seen = (p, s, E) => s.cards.reduce((a, c) => a + (c.hidden && !P[p].peeked.has(c.id) ? E : c.v), 0); // Sicht des Gegners
  const allVisible = (p, s) => s.cards.every((c) => !c.hidden || P[p].peeked.has(c.id));
  const hasFace = (s) => s.cards.some((c) => c.hidden);
  const hasBlind = (s) => s.cards.some((c) => c.blind);
  const open = (p, k) => !places[k].resolved && !places[k].side[p].closed && places[k].side[p].cards.length < rules.cap;
  const done = (s) => !!s.closed || s.cards.length >= rules.cap;
  const markDone = (s) => {
    if (s.doneAt === Infinity && done(s)) s.doneAt = turn;
  };
  const fin = (s) => {
    let v = actual(s);
    if (s.fire) {
      if (rules.suits.feuer === 'A') v = v > 15 ? v - 1 : v < 15 ? v + 1 : v;
      else if (rules.suits.feuer === 'B') v = v === 14 || v === 16 ? 15 : v;
    }
    return v;
  };
  const checkHit = (p, s) => {
    if (!rules.hitClose) return;
    if (s.closed === 'hit' && (hasBlind(s) || actual(s) !== 15)) {
      s.closed = null;
      s.doneAt = Infinity;
    }
    if (!s.closed && !hasBlind(s) && actual(s) === 15) {
      s.closed = 'hit';
      st.hits++;
    }
    markDone(s);
  };

  // Karten von der höchsten an vergleichen (wie Beikarten beim Poker)
  const lexCmp = (a, b) => {
    const x = a.cards.map((c) => c.v).sort((m, n) => n - m);
    const y = b.cards.map((c) => c.v).sort((m, n) => n - m);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const u = x[i] || 0;
      const w = y[i] || 0;
      if (u !== w) return u - w;
    }
    return 0;
  };
  const resolve = (k) => {
    const pl = places[k];
    const [a, b] = pl.side;
    const va = fin(a);
    const vb = fin(b);
    if (va > 15) st.busts++;
    if (vb > 15) st.busts++;
    for (const s of pl.side) for (const c of s.cards) if (c.blind && actual(s) > 15) st.blindBust++;
    if (rules.tie === 'E') {
      const oa = va <= 15;
      const ob = vb <= 15;
      if (oa && ob) pl.resolved = va > vb ? 'a' : vb > va ? 'b' : a.cards.length < b.cards.length ? 'a' : b.cards.length < a.cards.length ? 'b' : 'x';
      else if (oa) pl.resolved = 'a';
      else if (ob) pl.resolved = 'b';
      else pl.resolved = 'x';
    } else {
      const rank = (v) => (v <= 15 ? v : 15 - (v - 15) - 100);
      const ra = rank(va);
      const rb = rank(vb);
      if (ra === rb) st.tiePlaces++;
      if (ra !== rb) pl.resolved = ra > rb ? 'a' : 'b';
      else if (a.moonTie !== b.moonTie) pl.resolved = a.moonTie ? 'a' : 'b';
      else if (rules.tie !== 'H2' && a.cards.length !== b.cards.length) { pl.resolved = a.cards.length < b.cards.length ? 'a' : 'b'; st.tieCards++; }
      else if ((rules.tie === 'H2' || rules.tie === 'H3') && lexCmp(a, b) !== 0) pl.resolved = lexCmp(a, b) > 0 ? 'a' : 'b';
      else if (rules.tie === 'V' && a.doneAt !== b.doneAt) pl.resolved = a.doneAt < b.doneAt ? 'a' : 'b';
      else if (rules.tie === 'H' && Math.max(...a.cards.map((c) => c.v), 0) !== Math.max(...b.cards.map((c) => c.v), 0)) { pl.resolved = Math.max(...a.cards.map((c) => c.v), 0) > Math.max(...b.cards.map((c) => c.v), 0) ? 'a' : 'b'; st.tieHigh++; }
      else { pl.resolved = ['K', 'H', 'H2', 'H3'].includes(rules.tie) || rules.komi ? 'b' : 'x'; st.tieKomi++; }
    }
  };
  const draw = (p) => {
    while (P[p].hand.length < P[p].handMax && deck.length) P[p].hand.push(deck.shift());
  };

  // ---- Bewertung -------------------------------------------------------
  const score = (p, k, v, hidden, suit, blind) => {
    const E = expect(p);
    const me = places[k].side[p];
    const op = places[k].side[1 - p];
    const t = known(p, me, E) + v;
    const left = rules.cap - me.cards.length - 1;
    const opVis = seen(p, op, E);
    const lost = done(op) && allVisible(p, op) && opVis <= 15 && opVis >= 14 && known(p, me, E) + 1 > 0;
    if (t > 15) return -60 - (t - 15) + (lost ? 55 : 0);
    let s = 0;
    if (lost) s -= 5 + v * 0.5;
    const room = 15 - t - left;
    if (room < 0) s -= 25 * -room * P[p].style.caution;
    const want = 15 - left * 3.5;
    s -= Math.abs(t - want) * 1.2;
    if (t === 15) s += 12;
    if (!blind) s -= (9 - v) * 0.35 * (left + 1) * 0.3;
    if (suit && rules.suits[suit] && !hidden && me.cards.some((q) => !q.hidden && q.suit === suit) && !me.pair.has(suit)) s += P[p].style.combo * SUITBONUS[suit];
    if (done(op) && opVis <= 15 && opVis > t + left * 5) s -= 6;
    return s;
  };
  const blindScore = (p, k) => {
    const cnt = unseen(p);
    const E = expect(p);
    const me = places[k].side[p];
    let n = 0;
    for (let v = 1; v <= 9; v++) n += Math.max(0, cnt[v]);
    if (!n) return -Infinity;
    let ev = 0;
    let pb = 0;
    for (let v = 1; v <= 9; v++) {
      if (cnt[v] <= 0) continue;
      const w = cnt[v] / n;
      ev += w * score(p, k, v, true, null, true);
      if (known(p, me, E) + v > 15) pb += w;
    }
    return ev - pb * 10 * P[p].style.caution + P[p].style.gamble * 3;
  };
  const bestPlacement = (p, c) => {
    let b = -Infinity;
    for (let k = 0; k < 3; k++) if (open(p, k)) b = Math.max(b, score(p, k, c.v, false, c.suit, false));
    return b;
  };

  // ---- Farbpaare -------------------------------------------------------
  const trigger = (p, k, suit) => {
    const me = places[k].side[p];
    const op = places[k].side[1 - p];
    const variant = rules.suits[suit];
    const E = expect(p);
    me.pair.add(suit);
    st.trig[suit][p]++;
    if (suit === 'feuer') me.fire = true;
    if (suit === 'blatt') {
      if (variant === 'A') {
        P[p].handMax++;
        draw(p);
      } else if (variant === 'C' || variant === 'C1') {
        const nn = variant === 'C' ? 2 : 1;
        for (let i = 0; i < nn && deck.length; i++) P[p].hand.push(deck.shift());
        for (let i = 0; i < nn && P[p].hand.length > 1; i++) {
          let worst = null;
          let ws = Infinity;
          for (const c of P[p].hand) {
            const s = bestPlacement(p, c);
            if (s < ws) {
              ws = s;
              worst = c;
            }
          }
          P[p].hand.splice(P[p].hand.indexOf(worst), 1);
          discard.push(worst);
        }
      } else if (variant === 'B') {
        // Laubwind: eine eigene Karte von einem offenen Platz zurück auf die Hand
        let best = null;
        for (let j = 0; j < 3; j++) {
          const s = places[j].side[p];
          if (places[j].resolved || s.closed === 'knock') continue;
          const tot = known(p, s, E);
          for (const c of s.cards) {
            const after = tot - (c.blind ? E : c.v);
            let gain = 0;
            if (tot > 15 && after <= 15) gain = 30 - (15 - after);
            else if (c.blind) gain = 4; // Ungewissheit loswerden
            if (gain > 0 && (!best || gain > best.gain)) best = { s, c, gain };
          }
        }
        if (best) {
          best.s.cards.splice(best.s.cards.indexOf(best.c), 1);
          best.c.hidden = false;
          best.c.blind = false;
          P[p].hand.push(best.c);
          if (best.s.closed === 'hit') best.s.closed = null;
          best.s.doneAt = Infinity;
          checkHit(p, best.s);
        }
      }
    }
    if (suit === 'mond') {
      const cand = [];
      for (const q of op.cards) if (q.hidden && !P[p].peeked.has(q.id)) cand.push(q);
      for (const pl of places) if (!pl.resolved && pl !== places[k]) for (const q of pl.side[1 - p].cards) if (q.hidden && !P[p].peeked.has(q.id)) cand.push(q);
      if (variant === 'D' || variant === 'E') me.moonTie = true;
      if (variant === 'E' && cand.length) {
        cand[0].hidden = false;
        cand[0].blind = false;
        st.reveals++;
        for (const pl of places) checkHit(1 - p, pl.side[1 - p]);
      }
      if (variant === 'F') for (const q of cand) {
        q.hidden = false;
        q.blind = false;
        st.reveals++;
      }
      if (variant === 'F') for (const pl of places) checkHit(1 - p, pl.side[1 - p]);
      if (variant === 'A') {
        if (cand.length) P[p].peeked.add(cand[0].id);
      } else if (variant === 'B') {
        if (cand.length) {
          cand[0].hidden = false;
          cand[0].blind = false;
          st.reveals++;
          for (const pl of places) checkHit(1 - p, pl.side[1 - p]);
        } else {
          // sonst eine eigene offene Karte zudecken (Schutz vor der Krähe)
          for (const pl of places) {
            if (pl.resolved) continue;
            const q = pl.side[p].cards.find((c) => !c.hidden);
            if (q) {
              q.hidden = true;
              break;
            }
          }
        }
      }
    }
    if (suit === 'kraehe') {
      if (op.closed === 'knock' || places[k].resolved) return;
      const my = known(p, me, E);
      const ot = seen(p, op, E);
      const val = (x) => (x <= 15 ? x : 15 - (x - 15) - 100);
      if (variant === 'A') {
        let best = null;
        for (const a of me.cards) for (const b of op.cards) {
          if (a.hidden || b.hidden) continue;
          const myT = my - a.v + b.v;
          const opT = ot - b.v + a.v;
          const gain = (val(myT) - val(ot) > 0 ? 1 : 0) - (val(my) - val(ot) > 0 ? 1 : 0) + (val(myT) - val(my)) * 0.02 + (val(ot) - val(opT)) * 0.02;
          if (gain > 0 && (!best || gain > best.gain)) best = { a, b, gain };
        }
        if (best) {
          me.cards[me.cards.indexOf(best.a)] = best.b;
          op.cards[op.cards.indexOf(best.b)] = best.a;
          st.swaps++;
          checkHit(p, me);
          checkHit(1 - p, op);
        }
      } else if (variant === 'B') {
        // Krähendieb: eine offene Karte des Gegners hier fortnehmen
        let best = null;
        for (const b of op.cards) {
          if (b.hidden) continue;
          const opT = ot - b.v;
          const gain = (val(my) - val(opT) > 0 ? 1 : 0) - (val(my) - val(ot) > 0 ? 1 : 0) + (val(ot) - val(opT)) * 0.02;
          if (gain > 0 && (!best || gain > best.gain)) best = { b, gain };
        }
        if (best) {
          op.cards.splice(op.cards.indexOf(best.b), 1);
          discard.push(best.b);
          st.swaps++;
          if (op.closed === 'hit') op.closed = null;
          op.doneAt = Infinity;
          checkHit(1 - p, op);
        }
      }
    }
  };

  // ---- Spielablauf -------------------------------------------------------
  const canMove = (p) => [0, 1, 2].some((k) => open(p, k)) && (P[p].hand.length || (rules.blind && deck.length));
  while (turn < 80) {
    const p = who;
    const me = P[p];
    const E = expect(p);
    const moves = [];
    for (let k = 0; k < 3; k++) {
      if (!open(p, k)) continue;
      const side = places[k].side[p];
      const canHide = !hasFace(side);
      for (const c of me.hand) {
        moves.push({ k, c, hidden: false, s: score(p, k, c.v, false, c.suit, false) });
        if (canHide) {
          const bluff = me.style.bluff * (c.v >= 6 ? 1.5 : 1) * (1 + r());
          moves.push({ k, c, hidden: true, s: score(p, k, c.v, true, c.suit, false) + bluff - 1 });
        }
      }
      if (rules.blind && canHide && deck.length) moves.push({ k, c: null, blind: true, hidden: true, s: blindScore(p, k) });
    }
    let knockMove = null;
    if (rules.knock && !me.knocked && !pending) {
      for (let k = 0; k < 3; k++) {
        const pl = places[k];
        const my = pl.side[p];
        if (pl.resolved || my.closed || my.cards.length < 2) continue;
        const t = known(p, my, E);
        const opT = seen(p, pl.side[1 - p], E);
        if (t <= 15 && t >= 15 - me.style.knockAt && opT < t - 1 + me.style.aggro * 2) knockMove = { k, s: 20 + t };
      }
    }
    if (!moves.length && !knockMove) {
      if (pending && pending.by !== p) {
        resolve(pending.k);
        pending = null;
      }
      if (!canMove(1 - p)) break;
      who = 1 - p;
      turn++;
      continue;
    }
    moves.sort((a, b) => b.s - a.s);
    const best = moves.length > 1 && me.style.mistake && r() < me.style.mistake ? moves[1 + Math.floor(r() * Math.min(3, moves.length - 1))] : moves[0];
    if (knockMove && (!best || knockMove.s > best.s + 8 * (1 - me.style.aggro))) {
      me.knocked = true;
      st.knocks++;
      const s = places[knockMove.k].side[p];
      s.closed = 'knock';
      markDone(s);
      pending = { k: knockMove.k, by: p };
    } else {
      const side = places[best.k].side[p];
      if (best.blind) {
        const c = deck.shift();
        c.hidden = true;
        c.blind = true;
        side.cards.push(c);
        st.blind++;
      } else {
        if (best.s <= -60) st.forced++;
        me.hand.splice(me.hand.indexOf(best.c), 1);
        best.c.hidden = best.hidden;
        best.c.blind = false;
        side.cards.push(best.c);
        if (rules.suits[best.c.suit] && !best.hidden && !side.pair.has(best.c.suit) && side.cards.filter((q) => !q.hidden && q.suit === best.c.suit).length >= 2) trigger(p, best.k, best.c.suit);
        draw(p);
      }
      checkHit(p, side);
      markDone(side);
      if (pending && pending.by !== p) {
        resolve(pending.k);
        pending = null;
      }
    }
    for (let k = 0; k < 3; k++) {
      const pl = places[k];
      if (pl.resolved || (pending && pending.k === k)) continue;
      const fertig = pl.side.every((s, q) => done(s) || !canMove(q));
      if (fertig) resolve(k);
    }
    st.turns++;
    if (!st.decidedAt && (places.filter((pl) => pl.resolved === 'a').length >= 2 || places.filter((pl) => pl.resolved === 'b').length >= 2)) st.decidedAt = st.turns;
    if (places.every((pl) => pl.resolved)) break;
    who = 1 - p;
    turn++;
  }
  for (let k = 0; k < 3; k++) if (!places[k].resolved) resolve(k);
  if (!st.decidedAt) st.decidedAt = st.turns;
  const a = places.filter((pl) => pl.resolved === 'a').length;
  const b = places.filter((pl) => pl.resolved === 'b').length;
  if (a !== b) return { winner: a > b ? 0 : 1, stats: st };
  if (rules.tie === 'E') {
    const hits = [0, 1].map((q) => places.filter((pl) => fin(pl.side[q]) === 15).length);
    if (hits[0] !== hits[1]) return { winner: hits[0] > hits[1] ? 0 : 1, stats: st };
    const dist = [0, 1].map((q) => places.reduce((acc, pl) => acc + (fin(pl.side[q]) > 15 ? 10 : 15 - fin(pl.side[q])), 0));
    return { winner: dist[0] < dist[1] ? 0 : dist[1] < dist[0] ? 1 : -1, stats: st };
  }
  return { winner: rules.komi ? 1 : -1, stats: st };
}

const STYLES = {
  vorsichtig: { caution: 1.6, bluff: 0.2, aggro: 0, knockAt: 1, combo: 0.6, gamble: 0 },
  ausgewogen: { caution: 1, bluff: 1, aggro: 0.5, knockAt: 2, combo: 1, gamble: 0.5 },
  wild: { caution: 0.5, bluff: 2.2, aggro: 1, knockAt: 3, combo: 1.2, gamble: 1.5 },
  zaehlt: { caution: 1.2, bluff: 0.8, aggro: 0.4, knockAt: 2, combo: 0.9, gamble: 0.3, count: true },
  fischer: { caution: 1.5, bluff: 0.6, aggro: 0.3, knockAt: 1, combo: 0.8, gamble: 0.2, count: true },
  bert: { caution: 1.0, bluff: 0, aggro: 0, knockAt: 0, combo: 0.5, gamble: 0, mistake: 0.25 },
  patzer10: { caution: 1, bluff: 1, aggro: 0.5, knockAt: 2, combo: 1, gamble: 0.5, mistake: 0.1 },
};

function run(name, rules, sa = 'ausgewogen', sb = 'ausgewogen') {
  let w0 = 0;
  let w1 = 0;
  let draws = 0;
  let aWins = 0;
  const sum = { decidedAt: 0, tieCards: 0, tieHigh: 0, tieKomi: 0, tiePlaces: 0, busts: 0, forced: 0, knocks: 0, blind: 0, blindBust: 0, hits: 0, turns: 0, reveals: 0, swaps: 0 };
  const pairWins = { blatt: [0, 0], feuer: [0, 0], mond: [0, 0], kraehe: [0, 0] };
  for (let g = 0; g < GAMES; g++) {
    const swap = g % 2 === 1;
    const res = play(g * 7919 + 17, rules, swap ? [STYLES[sb], STYLES[sa]] : [STYLES[sa], STYLES[sb]]);
    if (res.winner === -1) draws++;
    else if (res.winner === 0) w0++;
    else w1++;
    if (res.winner !== -1 && (res.winner === 0) !== swap) aWins++;
    for (const key of Object.keys(sum)) sum[key] += res.stats[key];
    for (const s of SUITS) for (const p of [0, 1]) if (res.stats.trig[s][p]) {
      pairWins[s][0]++;
      if (res.winner === p) pairWins[s][1]++;
    }
  }
  const pct = (x) => `${((100 * x) / GAMES).toFixed(1)} %`;
  const per = (x) => (x / GAMES).toFixed(2);
  console.log(`${name}`);
  console.log(`   Start ${pct(w0)} · Nachziehend ${pct(w1)} · Remis ${pct(draws)} · ${sa} schlägt ${sb} ${pct(aWins)} · geplatzt ${per(sum.busts)}/Spiel · erzwungen ${per(sum.forced)} · blind ${per(sum.blind)} (davon geplatzt ${per(sum.blindBust)}) · Volltreffer ${per(sum.hits)} · Klopfen ${per(sum.knocks)} · Züge ${per(sum.turns)} (entschieden nach ${per(sum.decidedAt)}) · Gleichstand-Plätze ${per(sum.tiePlaces)} (Karten ${per(sum.tieCards)}, hoch ${per(sum.tieHigh)}, Rest ${per(sum.tieKomi)})`);
  if (Object.values(rules.suits).some(Boolean)) console.log(`   Farbpaar → Siegquote: ${SUITS.map((s) => (rules.suits[s] ? `${s}(${rules.suits[s]}) ${pairWins[s][0] ? ((100 * pairWins[s][1]) / pairWins[s][0]).toFixed(1) : '–'} % (${per(pairWins[s][0])}/Spiel)` : `${s} aus`)).join(' · ')}`);
}

const NO_SUITS = { feuer: null, blatt: null, mond: null, kraehe: null };
const E_SUITS = { feuer: 'A', blatt: 'A', mond: 'A', kraehe: 'A' };
const base = { cap: 3, hands: [5, 6], knock: true, hitClose: true, blind: false, tie: 'E', suits: E_SUITS };

const which = process.argv[3] || 'alle';
if (which === 'alle' || which === 'grund') {
  run('K: Konzept E (5/6 Karten, Klopfen, Farbpaare E, Gleichstand E)', base);
  run('V1: Gleichstand »jeder Platz hat einen Gewinner«', { ...base, tie: 'V' });
  run('V1 + 5/5 Karten (Startvorteil ohne Ausgleich)', { ...base, tie: 'V', hands: [5, 5] });
  run('V1 + 4/5 Karten', { ...base, tie: 'V', hands: [4, 5] });
  run('V2: V1 + blind vom Stapel', { ...base, tie: 'V', blind: true });
}
if (which === 'gleich') {
  for (const hands of [[5, 6], [5, 5], [4, 5], [4, 4], [3, 4]]) {
    for (const tie of ['E', 'V', 'K', 'H']) run(`Hand ${hands.join('/')} · Gleichstand ${tie}`, { ...base, hands, tie });
  }
}
if (which === 'gleich2') {
  for (const hands of [[5, 5], [5, 6], [4, 4]]) {
    for (const tie of ['H', 'H2', 'H3']) run(`Hand ${hands.join('/')} · Gleichstand ${tie}`, { ...base, hands, tie });
  }
}
const B2 = { ...base, hands: [5, 5], tie: 'H' };
const PROP = { feuer: 'B', blatt: 'C', mond: 'E', kraehe: 'B' };
if (which === 'neu') {
  run('N0: 5/5, Gleichstand H, Farbpaare E', B2);
  run('N1: + blind vom Stapel', { ...B2, blind: true });
  run('N2: Farbpaare ohne', { ...B2, suits: NO_SUITS });
  run('N3: Feuer B', { ...B2, suits: { ...E_SUITS, feuer: 'B' } });
  run('N4: Blatt C (zwei ziehen, zwei ab)', { ...B2, suits: { ...E_SUITS, blatt: 'C' } });
  run('N5: Blatt B (Laubwind)', { ...B2, suits: { ...E_SUITS, blatt: 'B' } });
  run('N6: Mond B (Mondlicht)', { ...B2, suits: { ...E_SUITS, mond: 'B' } });
  run('N7: Krähe B (Krähendieb)', { ...B2, suits: { ...E_SUITS, kraehe: 'B' } });
  run('N8: Vorschlag Feuer B, Blatt A, Mond B, Krähe A', { ...B2, suits: PROP });
  run('N9: Vorschlag + blind', { ...B2, blind: true, suits: PROP });
  run('N10: Vorschlag + blind, Krähe B', { ...B2, blind: true, suits: { ...PROP, kraehe: 'B' } });
}
if (which === 'mond') {
  const V = { ...B2, blind: true, suits: { feuer: 'B', blatt: 'C', mond: 'B', kraehe: 'B' } };
  run('M0: Feuer B, Blatt C, Mond B, Krähe B, blind', V);
  run('M1: Mond D (Gleichstand hier gewinnst du)', { ...V, suits: { ...V.suits, mond: 'D' } });
  run('M2: Mond E (aufdecken + Gleichstand hier)', { ...V, suits: { ...V.suits, mond: 'E' } });
  run('M3: Mond F (alle verdeckten des Gegners aufdecken)', { ...V, suits: { ...V.suits, mond: 'F' } });
  run('M4: Mond A (spähen, KI nutzt es)', { ...V, suits: { ...V.suits, mond: 'A' } });
  run('M5: Blatt C1 (eine ziehen, eine ab), Mond E', { ...V, suits: { ...V.suits, blatt: 'C1', mond: 'E' } });
  run('M6: Mond E ohne blind', { ...V, blind: false, suits: { ...V.suits, mond: 'E' } });
}
if (which === 'final') {
  run('F1: Stufe 1 (5/5, Klopfen, Volltreffer, Gleichstand-Kaskade, ohne Farben, ohne blind)', { ...B2, suits: NO_SUITS });
  run('F2: Stufe 1+2 (dazu Farbpaare: Feuer Glut, Blatt Laubwirbel, Mond Mondlicht, Krähe Krähendieb)', { ...B2, suits: PROP });
  run('F3: Stufe 1+2+3 (dazu blind legen)', { ...B2, blind: true, suits: PROP });
  run('F0: Konzept E zum Vergleich (5/6, Gleichstand E, Farbpaare E)', { ...base });
}
if (which === 'npc') {
  const V = { ...B2, blind: true, suits: PROP };
  run('P1: ausgewogen gegen bert (25 % Patzer)', V, 'ausgewogen', 'bert');
  run('P2: ausgewogen gegen patzer10', V, 'ausgewogen', 'patzer10');
  run('P3: fischer gegen ausgewogen', V, 'fischer', 'ausgewogen');
  run('P4: fischer gegen vorsichtig', V, 'fischer', 'vorsichtig');
  run('P5: fischer gegen wild', V, 'fischer', 'wild');
}
if (which === 'stile2') {
  const V = { ...B2, blind: true, suits: PROP };
  run('S1: vorsichtig gegen wild', V, 'vorsichtig', 'wild');
  run('S2: zaehlt gegen ausgewogen', V, 'zaehlt', 'ausgewogen');
  run('S3: zaehlt gegen wild', V, 'zaehlt', 'wild');
  run('S4: ausgewogen gegen wild', V, 'ausgewogen', 'wild');
  run('S5: vorsichtig gegen ausgewogen', V, 'vorsichtig', 'ausgewogen');
  run('S6: zaehlt gegen vorsichtig', V, 'zaehlt', 'vorsichtig');
}
if (which === 'alle' || which === 'farben') {
  run('F-B: Feuer nur 14/16 → 15', { ...base, tie: 'V', suits: { ...E_SUITS, feuer: 'B' } });
  run('B-C: Blatt zwei ziehen, zwei abwerfen', { ...base, tie: 'V', suits: { ...E_SUITS, blatt: 'C' } });
  run('B-B: Blatt Laubwind (Karte zurück auf die Hand)', { ...base, tie: 'V', suits: { ...E_SUITS, blatt: 'B' } });
  run('M-B: Mondlicht (verdeckte des Gegners aufdecken, sonst eigene zudecken)', { ...base, tie: 'V', suits: { ...E_SUITS, mond: 'B' } });
  run('K-B: Krähendieb (offene Karte des Gegners fortnehmen)', { ...base, tie: 'V', suits: { ...E_SUITS, kraehe: 'B' } });
  run('Vorschlag: Feuer B, Blatt A, Mond B, Krähe A', { ...base, tie: 'V', suits: { feuer: 'B', blatt: 'A', mond: 'B', kraehe: 'A' } });
  run('Vorschlag + blind', { ...base, tie: 'V', blind: true, suits: { feuer: 'B', blatt: 'A', mond: 'B', kraehe: 'A' } });
}
if (which === 'alle' || which === 'stile') {
  const V = { ...base, tie: 'V', blind: true, suits: { feuer: 'B', blatt: 'A', mond: 'B', kraehe: 'A' } };
  run('Stile im Vorschlag: vorsichtig gegen wild', V, 'vorsichtig', 'wild');
  run('Stile im Vorschlag: zaehlt gegen ausgewogen', V, 'zaehlt', 'ausgewogen');
  run('Stile im Vorschlag: zaehlt gegen wild', V, 'zaehlt', 'wild');
  run('Stile im Vorschlag: ausgewogen gegen wild', V, 'ausgewogen', 'wild');
}
