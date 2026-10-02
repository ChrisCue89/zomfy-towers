// A3: Krähengaben – Krähen merken sich Gesichter. Wer ihnen jeden Tag ein paar Krümel aufs
// Futterbrett streut, dem trauen sie mit der Zeit: Sie fliegen nicht mehr auf, wenn Mika
// vorbeigeht, und morgens liegt manchmal etwas auf dem Brett – Glänzendes aus der Bucht fürs
// Krähenglas in der Stube, Kleinkram, der jemandem in der Bucht gehört (der freut sich, wenn er
// ihn wiederbekommt), selten etwas Nützliches und einmal ein kleiner Schlüssel mit den Buchstaben
// J. L. – zu Jakob Lindqvists Schatulle unter der Diele vor dem Kamin (DESIGN 4.2).
// Ablauf in core/crowGifts.js, die Vögel in entities/crows.js, die Modelle in world/crowModels.js.

/**
 * Füttern: geht, solange Krähen in der Bucht sind (`from`/`until`, Stunden, wie DAY in
 * entities/crows.js), einmal am Tag; nach `pecks` Schnabelhieben sind die Krümel weg.
 * `call`: so viele Sekunden, bis eine Krähe zum Brett kommt.
 */
export const CROW_FEED = { from: 6.5, until: 18.5, pecks: 7, call: [1.5, 4] };

/**
 * Vertrauen: wächst um eins nach jedem Tag mit Krümeln, sinkt um `decay` nach jedem Tag ohne
 * (nie unter null). Ab `gift` bringen sie etwas, ab `tame` fliegen sie vor Mika nicht mehr auf.
 */
export const CROW_TRUST = { max: 8, gift: 2, tame: 3, decay: 1 };

/** Chance einer Gabe am Morgen nach einem Tag mit Krümeln: base + per × Vertrauen, höchstens max. */
export const CROW_GIFT_CHANCE = { base: 0.3, per: 0.12, max: 0.85 };

/** So nah dürfen zahme Krähen Mika kommen lassen (m); scheu sind es 2,6 (entities/crows.js). */
export const TAME_SHY = 1.0;

/**
 * Die Gaben in ihrer Reihenfolge – jede kommt einmal, sobald das Vertrauen `trust` erreicht.
 * `jar`: kommt ins Krähenglas auf der Fensterbank, `owner`: gehört jemandem, der in der Bucht
 * wohnt (sonst überspringen die Krähen es, bis er da ist), `res`: in den Vorrat, `part`: ein
 * Turmteil, `key`: der Schlüssel zur Schatulle (erst nach `after` anderen Gaben).
 * Sind alle verschenkt, bringen sie abwechselnd die Gaben aus `AGAIN`.
 */
export const CROW_GIFTS = [
  { id: 'kronkorken', trust: 2, jar: true },
  { id: 'glasknopf', trust: 2, jar: true },
  { id: 'schrauben', trust: 2, res: { schrott: 2 } },
  { id: 'fingerhut', trust: 3, owner: 'hilde' },
  { id: 'murmel', trust: 3, jar: true },
  { id: 'zahnrad', trust: 3, res: { zahnraeder: 1 } },
  { id: 'pinzette', trust: 4, owner: 'yusuf' },
  { id: 'haeherfeder', trust: 4, jar: true },
  { id: 'bleistift', trust: 4, owner: 'bert' },
  { id: 'klemme', trust: 5, owner: 'juna' },
  { id: 'spiegelscherbe', trust: 5, jar: true },
  { id: 'muenze', trust: 5, part: 'gluecksmuenze' },
  { id: 'gardinenring', trust: 6, jar: true },
  { id: 'schluessel', trust: 6, key: true, after: 5 },
];

/** Danach immer wieder: Kleinkram für den Vorrat. */
export const AGAIN = [
  { id: 'schrauben', res: { schrott: 2 } },
  { id: 'nagelrest', res: { schrott: 1, holz: 1 } },
  { id: 'zahnrad', res: { zahnraeder: 1 } },
];

/** Ab so vielen Stücken im Krähenglas wird die Stube gemütlicher (+1). */
export const JAR_COZY = 3;

/** Herbstbuch: Tat »Krähenfreund« nach so vielen Gaben. */
export const CROW_DEED = 5;

/** Ein neuer Zustand (state.crows). */
export function newCrows() {
  // trust: Vertrauen; fed: Tag der letzten Krümel; gift: was auf dem Brett wartet;
  // got: alle bisherigen Gaben (auch die wiederholten, in der Reihenfolge); jar: Stücke im Glas;
  // carry: was Mika noch zurückgeben will; back: zurückgegeben (Besitzer-ID je Stück);
  // chest: 0 kein Schlüssel, 1 Schlüssel da (die Diele wartet), 2 Schatulle geöffnet
  return { trust: 0, fed: 0, gift: null, got: [], jar: [], carry: [], back: [], chest: 0 };
}

const KNOWN = new Set([...CROW_GIFTS.map((g) => g.id), ...AGAIN.map((g) => g.id)]);

/** Gelesenen Zustand absichern. */
export function sanitizeCrows(raw) {
  const base = newCrows();
  if (!raw || typeof raw !== 'object') return base;
  const int = (v, min, max) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : min);
  const ids = (list, max = 200) => (Array.isArray(list) ? list.filter((id) => KNOWN.has(id)).slice(-max) : []);
  base.trust = int(raw.trust, 0, CROW_TRUST.max);
  base.fed = int(raw.fed, 0, 1e6);
  base.gift = KNOWN.has(raw.gift) ? raw.gift : null;
  base.got = ids(raw.got);
  base.jar = [...new Set(ids(raw.jar))].filter((id) => giftOf(id)?.jar);
  base.carry = [...new Set(ids(raw.carry))].filter((id) => giftOf(id)?.owner);
  base.back = [...new Set(ids(raw.back))].filter((id) => giftOf(id)?.owner);
  base.chest = int(raw.chest, 0, 2);
  return base;
}

/** Eintrag einer Gabe (aus der Reihe oder den Wiederholungen). */
export function giftOf(id) {
  return CROW_GIFTS.find((g) => g.id === id) || AGAIN.find((g) => g.id === id) || null;
}

/** Wohnt jemand in der Bucht (Stufe 3, eingezogen)? */
const living = (state, id) => state.survivors?.[id]?.stage === 3;

/**
 * Die nächste Gabe: die erste der Reihe, die noch nicht kam und deren Vertrauen reicht (Stücke
 * eines Besitzers, der nicht da ist, warten). Ist die Reihe durch, Kleinkram im Wechsel.
 */
export function nextGift(state) {
  const c = state.crows;
  const had = new Set(c.got);
  const others = c.got.length;
  for (const g of CROW_GIFTS) {
    if (had.has(g.id) || c.trust < g.trust) continue;
    if (g.owner && !living(state, g.owner)) continue;
    if (g.key && others < (g.after || 0)) continue;
    return g.id;
  }
  if (CROW_GIFTS.every((g) => had.has(g.id) || (g.owner && !living(state, g.owner)))) return AGAIN[c.got.length % AGAIN.length].id;
  return null;
}

/** Chance einer Gabe bei diesem Vertrauen. */
export function giftChance(trust) {
  return Math.min(CROW_GIFT_CHANCE.max, CROW_GIFT_CHANCE.base + CROW_GIFT_CHANCE.per * trust);
}

/** Hat Mika etwas von dieser Person bei sich, das die Krähen gebracht haben? (für dialogs.js) */
export function crowReturn(state, id) {
  return (state.crows?.carry || []).find((g) => giftOf(g)?.owner === id) || null;
}

/** Gemütlichkeit des Krähenglases (furnishing.cozy). */
export function crowCozy(state) {
  return (state.crows?.jar?.length || 0) >= JAR_COZY ? 1 : 0;
}

/** Wie viele Gaben bisher (Tat im Herbstbuch). */
export function crowGiftCount(state) {
  return state.crows?.got?.length || 0;
}
