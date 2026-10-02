// Das Netzwerk (M32, OFFENE-FRAGEN 164, 191): Wer weitergezogen ist, bleibt in der Welt.
//   Briefe – morgens liegt Post im Briefkasten (die Fahne ist oben); mit Oma Hilde im Lager
//     bringt sie die Post (sie war Postbotin), sonst Balduin. E am Briefkasten zeigt die Briefe
//     als Karten, die Spieluhr spielt das Motiv des Absenders. Erst ein Brief nach zwei, drei
//     Tagen, ein zweiter nach neun bis zwölf.
//   Pakete – fünf bis acht Tage nach dem Weiterziehen bringt Balduin ein Paket vom Ort
//     (Rohstoffe, Munition), wenn er anlegt.
//   Stimmen – mit Juna im Lager hat das Funkgerät eine Wahl »Die anderen«: je Tag eine Stimme.
//   Besuch – am Morgen nach dem Fest (M23) kommt jemand von früher ans Feuer.
//   Rückkehr – ist ein Platz frei, nimmt Balduin eine Einladung mit; einen Tag später ist die
//     Person wieder da, als Gast am Feuer, und die Entscheidung ist gleich fällig.
//   Signalfeuer – in der Frostnacht brennt für jeden Weitergezogenen ein Feuer an seinem Ort,
//     und jeder Ort schickt eine kleine Hilfe.
// Höchstens eine Nachricht je Morgen.

import { T } from '../data/texts.js';
import { POST, PARCELS, SIGNAL_HELP } from '../data/network.js';
export { newPost, sanitizePost } from '../data/network.js';
import { WANDERERS, WANDERER_ORDER } from '../data/wanderers.js';
import { gain } from './inventory.js';
import { personOf } from './survivors.js';

/** Fester Versatz aus einem Bereich [a, b] je Person (kein Zufall: der Stand bleibt gleich). */
function spread([a, b], id, gone) {
  let h = gone * 7;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return a + (h % (b - a + 1));
}

export class Post {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
  }

  get data() {
    return this.game.state.post;
  }

  /** Weitergezogene (Stufe 4) mit dem Tag, an dem sie gingen. */
  gone() {
    const st = this.game.state;
    return WANDERER_ORDER.filter((id) => st.survivors[id]?.stage === 4 && Number.isFinite(st.survivors[id].gone));
  }

  sent(id, kind) {
    return this.data.sent.includes(`${id}:${kind}`);
  }

  markSent(id, kind) {
    if (!this.sent(id, kind)) this.data.sent.push(`${id}:${kind}`);
  }

  /** Kam von `id` schon ein erster Brief (gelesen oder noch im Kasten)? */
  hadLetter(id) {
    return [...this.data.read, ...this.data.box].some((m) => m.from === id && m.kind === 'brief');
  }

  /** Liegt Post im Briefkasten? (Fahne oben) */
  get waiting() {
    return this.data.box.length > 0;
  }

  /**
   * Morgens: höchstens eine neue Nachricht in den Briefkasten – erst der erste Brief (Tag aus
   * M27: `letter`), dann der zweite. Liefert die Zeile für den Morgenbericht.
   */
  morning() {
    const g = this.game;
    const st = g.state;
    const day = st.time.day;
    const lines = [];
    let n = 0;
    for (const id of this.gone()) {
      if (n >= POST.perMorning) break;
      const s = st.survivors[id];
      let kind = null;
      if (!s.read && day >= (s.letter || 0)) {
        s.read = true; // M27: der erste Brief ist da
        if (this.hadLetter(id)) continue; // wer ein zweites Mal weiterzieht, schreibt nicht dasselbe noch einmal
        kind = 'brief';
      } else if (s.read && !this.sent(id, 'brief2') && day >= s.gone + spread(POST.second, id, s.gone)) {
        this.markSent(id, 'brief2');
        kind = 'brief2';
      }
      if (!kind) continue;
      this.data.box.push({ from: id, kind, day });
      n++;
      const w = WANDERERS[id];
      const hilde = g.survivors.strength('hilde') > 0;
      lines.push({ text: hilde ? T.netz.postHilde(w.name, T.wanderer.vomOrt[w.place]) : T.netz.post(w.name, T.wanderer.vomOrt[w.place]) });
    }
    // Am Festtag (M23) kommt jemand von früher ans Feuer – wer noch nie zu Besuch war
    if (st.feast === day && this.data.visit?.day !== day) {
      const id = this.gone().find((q) => !this.data.visited.includes(q) && st.survivors[q].read);
      if (id) {
        this.data.visit = { id, day };
        this.data.visited.push(id);
        const w = WANDERERS[id];
        lines.push({ text: T.netz.besuch(w.name, T.wanderer.vomOrt[w.place]) });
      }
    }
    // Nach dem Herbst kommt Edda nach Hause (M32, T.funk.danach)
    if (st.edda?.home === day) lines.push({ text: T.netz.eddaDaheim });
    g.world.setMailFlag(this.waiting);
    return lines;
  }

  /** E am Briefkasten: die Briefe als Karten (danach im Herbstbuch), sonst der alte Gedanke. */
  open() {
    const g = this.game;
    const box = this.data.box;
    if (!box.length) {
      g.startDialog('briefkasten');
      return;
    }
    const cards = box.map((m) => ({ letter: m.from, kind: m.kind, name: personOf(m.from)?.name || m.from, place: WANDERERS[m.from]?.place || null, day: m.day }));
    this.data.read.push(...box.map((m) => ({ from: m.from, kind: m.kind, day: m.day })));
    this.data.box = [];
    g.world.setMailFlag(false);
    g.sound.play('aufheben');
    g.sound.memorial(cards[0].letter); // die Spieluhr spielt das Motiv des Absenders
    g.deliveryCard.open(cards);
    g.mode = 'lieferung';
    g.state.flags.briefkastenGesehen = true;
    g.quietSave();
  }

  /**
   * Pakete (Kanal 2): Balduin legt an – was fällig ist, trägt er mit hinein (die Lieferkarte
   * zeigt es, der Vorrat bekommt es gleich). game.deliverOrders ruft es.
   */
  parcels() {
    const g = this.game;
    const st = g.state;
    const day = st.time.day;
    const out = [];
    for (const id of this.gone()) {
      const s = st.survivors[id];
      if (this.sent(id, 'paket') || day < s.gone + spread(POST.parcel, id, s.gone)) continue;
      const place = WANDERERS[id].place;
      const gives = PARCELS[place] || { holz: 6 };
      gain(st.inventory, gives);
      this.markSent(id, 'paket');
      out.push({ parcel: id, name: WANDERERS[id].name, place, gives: { ...gives } });
    }
    return out;
  }

  // --- Stimmen (Kanal 3, Juna) -------------------------------------------------------

  /** Kann das Funkgerät heute »Die anderen« empfangen? */
  voiceReady() {
    const g = this.game;
    return g.survivors.strength('juna') > 0 && this.gone().some((id) => this.game.state.survivors[id].read);
  }

  /** Eine Stimme für heute: jeder Weitergezogene der Reihe nach, je Tag eine (Dialog `stimmen`). */
  voice() {
    const st = this.game.state;
    const ids = this.gone().filter((id) => st.survivors[id].read);
    if (!ids.length) return null;
    const day = st.time.day;
    const id = ids[day % ids.length];
    const lines = T.netz.stimmen[id] || [T.netz.stimmeAlle];
    return { id, text: lines[Math.floor(day / ids.length) % lines.length] };
  }

  // --- Besuch und Rückkehr --------------------------------------------------------------

  /** Wer heute zu Besuch ist (am Festtag, siehe morning). */
  visitorToday() {
    return this.data.visit?.day === this.game.state.time.day ? this.data.visit.id : null;
  }

  /** Wer eine Einladung bekommen kann (Balduin): Weitergezogene mit Brief, wenn ein Platz frei ist. */
  invitable() {
    const g = this.game;
    if (this.data.invite || !g.survivors.freePlace()) return [];
    return this.gone().filter((id) => g.state.survivors[id].read);
  }

  /** Einladung mitgegeben: morgen ist sie da. */
  invite(id) {
    const st = this.game.state;
    this.data.invite = { id, day: st.time.day + POST.inviteDays };
  }

  /** Morgens: Ist die Eingeladene da? (survivors.arrive ruft es) */
  arrivals() {
    const g = this.game;
    const st = g.state;
    const inv = this.data.invite;
    if (!inv || st.time.day < inv.day) return null;
    this.data.invite = null;
    const s = st.survivors[inv.id];
    if (!s || s.stage !== 4) return null;
    return inv.id;
  }

  // --- Frostnacht ----------------------------------------------------------------------

  /** Die Orte, an denen jemand von uns lebt (je Ort einmal). */
  places() {
    return [...new Set(this.gone().map((id) => WANDERERS[id].place))];
  }

  /** Die Frostnacht beginnt: Signalfeuer an den Orten, jeder Ort schickt eine kleine Hilfe. */
  signalFires() {
    const g = this.game;
    const st = g.state;
    const ids = this.gone();
    const places = this.places();
    g.world.setSignalFires(places);
    if (!places.length || this.data.signals) return places; // die Hilfe kommt einmal (auch wenn die Frostnacht wiederholt wird)
    this.data.signals = st.time.day;
    const total = {};
    for (const p of places) for (const [k, v] of Object.entries(SIGNAL_HELP[p] || {})) total[k] = (total[k] || 0) + v;
    gain(st.inventory, total);
    g.hud.toast(T.netz.signalfeuer(ids.map((id) => WANDERERS[id].name)), 'leuchtkugeln', 6);
    return places;
  }

  /** Für die Prüfung. */
  info() {
    return {
      box: this.data.box.map((m) => ({ ...m })),
      read: this.data.read.map((m) => ({ ...m })),
      sent: [...this.data.sent],
      invite: this.data.invite ? { ...this.data.invite } : null,
      visit: this.data.visit ? { ...this.data.visit } : null,
      signals: this.data.signals,
      gone: this.gone(),
      voiceReady: this.voiceReady(),
    };
  }
}
