// Das Netzwerk der sicheren Orte (M32, OFFENE-FRAGEN 164): Wer weitergezogen ist, bleibt in
// der Welt. Drei Kanäle – Briefe im Briefkasten (Oma Hilde bringt die Post), Pakete (Balduin),
// Stimmen über Funk (Juna) –, dazu ein Besuch zum Fest, die Rückkehr auf einen freien Platz
// und in der Frostnacht ein Signalfeuer je Ort. Höchstens eine Nachricht je Morgen.
// Hier wird balanciert.

import { WANDERERS } from './wanderers.js';

/**
 * Wann was kommt (Tage nach dem Weiterziehen): der erste Brief nach `LETTER_DELAY`
 * (data/wanderers.js, 2–3 Tage), das Paket nach `parcel`, der zweite Brief nach `second`.
 * Pakete bringt Balduin, wenn er anlegt (sonst beim nächsten Mal).
 */
export const POST = {
  parcel: [5, 8],
  second: [9, 12],
  perMorning: 1, // Nachrichten je Morgen (Nr. 164)
  inviteCost: { teile: 3 }, // Balduin nimmt eine Einladung mit – für ein paar Zombieteile Fährgeld
  inviteDays: 1, // so viele Tage später ist sie da
};

/**
 * Was ein Paket aus einem Ort enthält (Rohstoffe und Munition) – dazu mit einem
 * Weitergezogenen, der »eng« war, ein Möbelstück aus dem Katalog.
 */
export const PARCELS = {
  nordinsel: { schrott: 6, zahnraeder: 2 },
  forsthaus: { holz: 14, fasern: 4 },
  farm: { fasern: 10, stoff: 2 },
  leuchtturm: { leuchtkugeln: 2, schrott: 4 },
  ferienlager: { stoff: 3, fasern: 6 },
  hafen: { schrott: 8, patronen: 4 },
  muehle: { stein: 10, holz: 6 },
  kloster: { stoff: 2, teile: 6 },
};

/**
 * Signalfeuer in der Frostnacht (Nr. 164): je Ort eines, auf den drei Felsinseln im See
 * (ISLANDS in world/map.js) – die Leute von dort sind hinübergerudert, damit die Bucht es
 * sieht. Stellen am Westrand der Inseln (zur Bucht hin), auf 1/8 m, frei von Tannen und Fels.
 */
export const SIGNAL_SPOTS = {
  nordinsel: { x: 20.75, z: -8.5 }, // Nordinsel (22,5 | −8,5)
  kloster: { x: 21.25, z: -7.5 },
  forsthaus: { x: 22.5, z: -7.125 },
  leuchtturm: { x: 24.75, z: 5.5 }, // mittlere Insel (27 | 5,5)
  muehle: { x: 25.375, z: 6.75 },
  ferienlager: { x: 27.0, z: 7.375 },
  farm: { x: 19.625, z: 12.5 }, // Südinsel (20,5 | 12,5)
  hafen: { x: 20.5, z: 13.125 },
};
export const SIGNAL_HELP = {
  nordinsel: { schrott: 4 },
  forsthaus: { holz: 10 },
  farm: { fasern: 6 },
  leuchtturm: { leuchtkugeln: 2 },
  ferienlager: { stoff: 2 },
  hafen: { patronen: 4 },
  muehle: { stein: 6 },
  kloster: { teile: 4 },
};

/** Leerer Eintrag (state.post): Briefkasten, Gelesenes, Verschicktes, Einladung, Besuch, Signalfeuer. */
export function newPost() {
  return { box: [], read: [], sent: [], invite: null, visit: null, visited: [], signals: 0 };
}

/** Prüfen und reparieren (sanitizeState). */
export function sanitizePost(raw) {
  const out = newPost();
  if (!raw || typeof raw !== 'object') return out;
  const ok = (id) => typeof id === 'string' && WANDERERS[id];
  const kinds = ['brief', 'brief2'];
  const mail = (list) => (Array.isArray(list) ? list.filter((m) => m && ok(m.from) && kinds.includes(m.kind) && Number.isFinite(m.day)).map((m) => ({ from: m.from, kind: m.kind, day: Math.floor(m.day) })) : []);
  out.box = mail(raw.box).slice(0, 12);
  out.read = mail(raw.read).slice(-60);
  out.sent = Array.isArray(raw.sent) ? raw.sent.filter((k) => typeof k === 'string' && /^[a-z]+:(brief2|paket)$/.test(k)).slice(0, 60) : [];
  if (raw.invite && ok(raw.invite.id) && Number.isFinite(raw.invite.day)) out.invite = { id: raw.invite.id, day: Math.floor(raw.invite.day) };
  if (raw.visit && ok(raw.visit.id) && Number.isFinite(raw.visit.day)) out.visit = { id: raw.visit.id, day: Math.floor(raw.visit.day) };
  out.visited = Array.isArray(raw.visited) ? raw.visited.filter(ok).slice(0, 20) : [];
  out.signals = Number.isFinite(raw.signals) ? Math.floor(raw.signals) : 0;
  return out;
}
