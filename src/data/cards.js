// Kartenabend »Letzte Runde« (M28, OFFENE-FRAGEN 172–174): Wer spielt wie,
// woran man es sieht, was auf dem Tisch liegt. Die Regeln stehen in
// core/cards.js, geprüft mit `node tools/karten.mjs`.
//
// Stil (siehe core/cards.js, aiMove): caution = Vorsicht (wie viel Luft bis 15
// für Pflichtkarten), bluff = verdeckt legen, ohne es zu müssen, aggro und
// knockAt = wie früh geklopft wird (−1: nie), combo = Lust auf Farbpaare,
// gamble = Griff ins Dunkle, count = Gedächtnis (0–1), read = Lesen (0–1: rückt
// die Schätzung von Mikas verdeckten Karten an das, was Mika bisher verdeckt
// hatte), bluffLow = versteckt auch schwache Karten, um stark zu wirken, mistake = Patzer.
//
// Tick (Nr. 173): Er kommt nur bei echten Entscheidungen. `mood` sagt, welche
// Stimmung ihn auslöst (strong, unsure, bluff, hidden, pairPrep), `rate` wie oft
// dann, `fake` wie oft er sonst trotzdem kommt (Gegen-Tick). Beim Aufdecken lässt
// er sich nachprüfen; nach drei Beobachtungen notiert Mika einen Verdacht.

export const CARD_PLAYERS = {
  bert: {
    style: { caution: 1.0, bluff: 0, aggro: 0, knockAt: -1, combo: 0.5, gamble: 0, mistake: 0.25 },
    tell: { mood: 'strong', rate: 1, fake: 0 },
    stake: 'grinsekuerbis',
    rank: 1,
  },
  juna: {
    style: { caution: 0.5, bluff: 2.2, bluffLow: 0.5, aggro: 1, knockAt: 3, combo: 1.2, gamble: 1.5 },
    tell: { mood: 'hidden', rate: 0.9, fake: 0.3 },
    stake: 'funkabzeichen',
    rank: 2,
  },
  balduin: {
    style: { caution: 0.7, bluff: 1.6, bluffLow: 3, aggro: 1, knockAt: 3, combo: 0.8, gamble: 1.2, count: 0.3, read: 0.2 },
    tell: { mood: 'bluff', rate: 0.8, fake: 0.02 },
    stake: 'taschenuhr',
    rank: 3,
    stage: 3, // Balduin spielt immer mit dem Griff ins Dunkle (und bringt ihn bei)
  },
  hilde: {
    style: { caution: 1.1, bluff: 0.6, aggro: 0.4, knockAt: 2, combo: 2.0, gamble: 0.3, count: 0.7, read: 0.3 },
    tell: { mood: 'pairPrep', rate: 0.8, fake: 0.05 },
    stake: 'kartenbeutel',
    rank: 4,
  },
  yusuf: {
    style: { caution: 1.6, bluff: 0.2, aggro: 0, knockAt: 1, combo: 0.6, gamble: 0, count: 0.5, read: 0.3 },
    tell: { mood: 'unsure', rate: 0.85, fake: 0.03 },
    stake: 'teedose',
    rank: 5,
  },
  fiete: {
    style: { caution: 1.6, bluff: 0.3, aggro: 0.3, knockAt: 1, combo: 0.9, gamble: 0, count: 1, read: 1 },
    tell: { mood: 'strong', rate: 0.75, fake: 0.18 }, // jedes dritte Mal täuscht die Pfeife
    stake: 'flaschenschiff',
    rank: 6,
  },
};

/** Reihenfolge im Herbstbuch (Menschenkunde) und im Simulator. */
export const CARD_PLAYER_ORDER = ['bert', 'juna', 'balduin', 'hilde', 'yusuf', 'fiete'];

/** Nach so vielen Beobachtungen eines Ticks notiert Mika einen Verdacht. */
export const TELL_NOTE_AFTER = 3;

/**
 * Regelstufen (Nr. 172): Bert erklärt das Grundspiel am ersten Abend, Hilde die
 * Farbpaare ab dem dritten, Balduin den Griff ins Dunkle, sobald Mika mit ihm spielt.
 */
export const RULE_STAGES = {
  pairsFrom: 3, // ab dem dritten Kartenabend
  blindWith: 'balduin', // wer den Griff ins Dunkle beibringt
};

/** Ein Abend: bis zwei Siege, der Anfang wechselt. Danach wird Zeit abgebucht (Minuten). */
// Zeiten in Minuten seit 06:00 wie state.time.minute: 18:00 bis 19:40
export const EVENING = { wins: 2, from: (18 - 6) * 60, until: (19 - 6) * 60 + 40, minutes: 50, perDay: 1 };

/** Die KI denkt sichtbar (Sekunden), im schnellen Modus kürzer. */
export const THINK = { min: 0.55, max: 1.3, fast: 0.2 };

/**
 * Einsätze (Nr. 174): Jede Figur legt ihr Stück sichtbar auf den Tisch, der erste
 * Sieg gegen sie bringt es. Gemütlichkeit 0 – nichts vom Kartentisch hilft in der
 * Nacht. `shelf` = Platz auf dem Kaminsims (Innenraum), `hud` = wirkt auf die Anzeige.
 */
export const STAKES = {
  grinsekuerbis: { shelf: 0 },
  funkabzeichen: { shelf: 1 },
  taschenuhr: { shelf: 2, hud: 'uhr' },
  kartenbeutel: { shelf: 3 },
  teedose: { shelf: 4 },
  flaschenschiff: { shelf: 5 },
};

/**
 * Kartenrückseiten (Kosmetik): Nach dem Stück gibt jeder weitere Sieg gegen eine
 * Figur ihre Rückseite frei. `paper` (Grund) und `ink` (Muster) sind Palettenfarben (P.*).
 */
export const CARD_BACKS = {
  laub: { paper: 'e3', ink: 'f5', from: null }, // von Anfang an
  kuerbis: { paper: 'f2', ink: 'f6', from: 'bert' },
  funk: { paper: 'b1', ink: 'b4', from: 'juna' },
  anker: { paper: 'b0', ink: 'f6', from: 'balduin' },
  strick: { paper: 'r1', ink: 'a1', from: 'hilde' },
  kranich: { paper: 't1', ink: 's8', from: 'yusuf' },
  moewe: { paper: 'b3', ink: 'a4', from: 'fiete' },
};

/**
 * Mikas Einsatz ist eine Pflicht, nie Vorrat: Wer verliert, erledigt sie am
 * nächsten Morgen (eine Zeile im Morgenbericht). Reihum je Abend.
 */
export const DUTIES = ['spuelen', 'holz', 'fruehstueck', 'knopf', 'tee'];

/**
 * Bietet `id` heute Abend eine Runde an? (Dialog-Antwort; die letzte Prüfung macht
 * core/cardNight.js). Eingezogen, abends 18:00–19:40, einmal am Tag, erst mit Bert.
 */
export function cardsOffered(state, id) {
  const c = state.cards;
  if (!c || !CARD_PLAYERS[id] || id === 'balduin') return false;
  if (state.survivors?.[id]?.stage !== 3) return false;
  if (c.lastDay === state.time?.day) return false;
  const m = state.time?.minute ?? 0;
  if (m < EVENING.from || m > EVENING.until) return false;
  return Boolean(c.evenings) || id === 'bert';
}
