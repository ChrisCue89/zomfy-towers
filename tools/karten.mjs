// Simulator für »Letzte Runde« (M28): spielt Tausende Partien mit den Regeln
// aus src/core/cards.js und prüft die Fairness.
//
//   node tools/karten.mjs            Prüfung (Startspieler, Remis, Farben, Tischansicht,
//                                    Figuren gegen den Grundstil, Ticks); Fehler → Exit 1
//   node tools/karten.mjs --n=20000  mehr Partien je Messung
//   node tools/karten.mjs --liga     jede Figur gegen jede
//
// Die Prüfung läuft ohne Browser in wenigen Sekunden; tools/check.mjs ruft sie im
// Abschnitt `karten` mit kleinerem n auf.

import { newGame, play, view, aiMove, isLegal, rng, showTell, STYLES, SUITS } from '../src/core/cards.js';
import { CARD_PLAYERS, CARD_PLAYER_ORDER } from '../src/data/cards.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);
const N = Number(args.n) || 6000;

/**
 * Eine Partie zweier Stile. `reads` hält, was jeder bisher vom anderen verdeckt
 * gesehen hat (Summe, Anzahl) – das Lesen der KI über mehrere Partien.
 */
export function playGame(seed, stage, starter, styles, tells = [null, null], reads = null) {
  const g = newGame(seed, { stage, starter });
  const r = [rng(seed * 3 + 7), rng(seed * 7 + 11)];
  const tr = [rng(seed * 13 + 5), rng(seed * 17 + 3)];
  const stats = { pairs: [], tells: [[], []], errors: 0 };
  let guard = 0;
  while (!g.over && guard++ < 400) {
    const p = g.who;
    const v = view(g, p);
    if (reads && reads[p].n) v.read = reads[p].sum / reads[p].n;
    const { move, mood } = aiMove(v, styles[p], r[p]);
    if (!isLegal(g, move)) {
      stats.errors++;
      break;
    }
    if (tells[p] && mood) stats.tells[p].push({ shown: showTell(tells[p], mood, tr[p]), hit: Boolean(mood[tells[p].mood]) });
    for (const e of play(g, move)) {
      if (e.kind === 'pair') stats.pairs.push({ p: e.p, suit: e.suit });
      if (reads && (e.kind === 'resolve' || e.kind === 'over')) {
        // Jeder merkt sich die verdeckten Karten des anderen
        for (const q of [0, 1]) for (const val of e.revealed[1 - q]) {
          reads[q].sum += val;
          reads[q].n++;
        }
      }
    }
  }
  if (!g.over) stats.errors++;
  return { g, stats };
}

/** Viele Partien, Anfang abwechselnd. Gibt Siege von Stil A, Startspieler-Quote, Züge, Farben zurück. */
export function series(n, stage, styleA, styleB, o = {}) {
  let winsA = 0;
  let starterWins = 0;
  let turns = 0;
  let errors = 0;
  let unfinished = 0;
  const suit = Object.fromEntries(SUITS.map((s) => [s, { n: 0, won: 0 }]));
  const tellA = { shown: 0, honest: 0, moves: 0 };
  const reads = o.read ? [{ sum: 0, n: 0 }, { sum: 0, n: 0 }] : null;
  for (let i = 0; i < n; i++) {
    const starter = i % 2;
    // A sitzt abwechselnd auf Platz 0 und 1, damit der Sitz nichts ausmacht
    const aSeat = Math.floor(i / 2) % 2;
    const styles = aSeat === 0 ? [styleA, styleB] : [styleB, styleA];
    const tells = aSeat === 0 ? [o.tellA || null, null] : [null, o.tellA || null];
    const rd = reads ? (aSeat === 0 ? reads : [reads[1], reads[0]]) : null;
    const { g, stats } = playGame((o.seed || 1) * 100003 + i, stage, starter, styles, tells, rd);
    errors += stats.errors;
    if (!g.over || (g.winner !== 0 && g.winner !== 1)) {
      unfinished++;
      continue;
    }
    if (g.winner === aSeat) winsA++;
    if (g.winner === starter) starterWins++;
    turns += g.turn;
    const seen = new Set();
    for (const pr of stats.pairs) {
      const key = pr.p + pr.suit;
      if (seen.has(key)) continue;
      seen.add(key);
      suit[pr.suit].n++;
      if (g.winner === pr.p) suit[pr.suit].won++;
    }
    for (const t of stats.tells[aSeat]) {
      tellA.moves++;
      if (t.shown) {
        tellA.shown++;
        if (t.hit) tellA.honest++;
      }
    }
  }
  return {
    winA: winsA / n,
    starter: starterWins / n,
    turns: turns / n,
    errors,
    unfinished,
    suit: Object.fromEntries(Object.entries(suit).map(([k, s]) => [k, s.n ? s.won / s.n : null])),
    tell: tellA.moves ? { perMove: tellA.shown / tellA.moves, honest: tellA.shown ? tellA.honest / tellA.shown : null } : null,
  };
}

/**
 * Faire KI (Nr. 173): Vertauscht man Mikas verdeckte Karten mit ungesehenen
 * Karten aus dem Stapel, bleiben Tischansicht und Zug der KI gleich.
 */
export function fairnessProbe(n, stage = 3) {
  let probes = 0;
  let changed = 0;
  for (let i = 0; i < n; i++) {
    const g = newGame(424242 + i, { stage, starter: i % 2 });
    const r = [rng(i * 5 + 1), rng(i * 9 + 2)];
    const stopAt = 3 + (i % 12);
    let guard = 0;
    while (!g.over && guard++ < 400) {
      const p = g.who;
      const hidden = g.places.flatMap((pl) => pl.sides[0].cards.filter((c) => c.hidden && !c.blind));
      if (p === 1 && g.turn >= stopAt && hidden.length && g.deck.length && !g.choice) {
        const before = view(g, 1);
        const seedAi = 777 + i;
        const a = aiMove(before, STYLES.ausgewogen, rng(seedAi)).move;
        // Mikas verdeckte Karten gegen Stapelkarten tauschen (Farbe, Wert, ID)
        const twin = structuredClone(g);
        const twinHidden = twin.places.flatMap((pl) => pl.sides[0].cards.filter((c) => c.hidden && !c.blind));
        twinHidden.forEach((c, j) => {
          const d = twin.deck[(j * 7 + i) % twin.deck.length];
          [c.v, d.v] = [d.v, c.v];
          [c.suit, d.suit] = [d.suit, c.suit];
          [c.id, d.id] = [d.id, c.id];
        });
        const after = view(twin, 1);
        const b = aiMove(after, STYLES.ausgewogen, rng(seedAi)).move;
        probes++;
        if (JSON.stringify(before) !== JSON.stringify(after) || JSON.stringify(a) !== JSON.stringify(b)) changed++;
        break;
      }
      const { move } = aiMove(view(g, p), STYLES.ausgewogen, r[p]);
      play(g, move);
    }
  }
  return { probes, changed };
}

const pct = (x) => (x === null || x === undefined ? '  –  ' : `${(x * 100).toFixed(1)} %`);

/** Die Prüfung; gibt die Liste der Fehler zurück (leer = alles gut). */
export function runChecks(n = N, log = console.log) {
  const fails = [];
  const base = STYLES.ausgewogen;
  for (const stage of [1, 2, 3]) {
    const s = series(n, stage, base, base, { seed: stage });
    log(`Stufe ${stage}: Startspieler ${pct(s.starter)}, ${s.turns.toFixed(1)} Züge, Fehler ${s.errors}, offen ${s.unfinished}` + (stage >= 2 ? ` · Farben ${SUITS.map((k) => `${k} ${pct(s.suit[k])}`).join(', ')}` : ''));
    if (s.errors || s.unfinished) fails.push(`Stufe ${stage}: ${s.errors} ungültige Züge, ${s.unfinished} unentschiedene Partien`);
    if (Math.abs(s.starter - 0.5) > 0.035) fails.push(`Stufe ${stage}: Startspieler gewinnt ${pct(s.starter)}`);
    if (stage >= 2) for (const k of SUITS) if (s.suit[k] !== null && Math.abs(s.suit[k] - 0.5) > 0.07) fails.push(`Stufe ${stage}: Farbpaar ${k} bei ${pct(s.suit[k])}`);
  }
  const f = fairnessProbe(Math.max(200, Math.round(n / 10)));
  log(`Tischansicht: ${f.probes} Stellungen, Zug geändert: ${f.changed}`);
  if (!f.probes || f.changed) fails.push(`Tischansicht: ${f.changed} von ${f.probes} Zügen hängen an Mikas verdeckten Karten`);
  log('Figuren gegen den Grundstil (Stufe 3, mit Lesen):');
  let prev = null;
  for (const id of CARD_PLAYER_ORDER) {
    const pl = CARD_PLAYERS[id];
    const s = series(Math.round(n / 2), 3, pl.style, base, { seed: 9 + pl.rank, tellA: pl.tell, read: true });
    log(`  ${id.padEnd(8)} gewinnt ${pct(s.winA)} · Tick ${pct(s.tell?.perMove)} der Züge, ehrlich ${pct(s.tell?.honest)}`);
    if (s.errors || s.unfinished) fails.push(`${id}: ${s.errors} ungültige Züge`);
    if (!s.tell || s.tell.perMove < 0.04) fails.push(`${id}: Tick zu selten (${pct(s.tell?.perMove)})`);
    if (s.tell && s.tell.honest !== null && s.tell.honest < 0.5) fails.push(`${id}: Tick meist gelogen (${pct(s.tell.honest)})`);
    prev = s;
  }
  void prev;
  return fails;
}

function league(n) {
  console.log('Liga (Zeile gewinnt gegen Spalte, Stufe 3):');
  console.log('          ' + CARD_PLAYER_ORDER.map((id) => id.padStart(9)).join(''));
  for (const a of CARD_PLAYER_ORDER) {
    let row = a.padEnd(10);
    for (const b of CARD_PLAYER_ORDER) {
      if (a === b) {
        row += '        –';
        continue;
      }
      const s = series(Math.round(n / 4), 3, CARD_PLAYERS[a].style, CARD_PLAYERS[b].style, { seed: 31, read: true });
      row += pct(s.winA).padStart(9);
    }
    console.log(row);
  }
}

// Direkt aufgerufen: Prüfung (oder Liga)
if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = Date.now();
  if (args.liga) league(N);
  else {
    const fails = runChecks(N);
    console.log(fails.length ? `\n✗ ${fails.length} Befund(e):\n  ${fails.join('\n  ')}` : `\n✓ Kartenspiel fair (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    process.exitCode = fails.length ? 1 : 0;
  }
}
