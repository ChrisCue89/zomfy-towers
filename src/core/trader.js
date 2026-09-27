// Balduin, der Händler (Meilenstein 8, seit Meilenstein 9 mit dem Boot). Jeden
// Morgen ab Tag 2 tuckert sein Boot von Osten über den See, legt am Steg an,
// und Balduin handelt bis Mittag auf dem Steg: Zombieteile (die Beute der
// Nacht) gegen Rohstoffe. Wo er gerade ist, ergibt sich allein aus der Uhrzeit –
// nach dem Laden, Ausruhen oder Schlafen ist er also immer richtig. Gespeichert
// wird nur, was er heute schon verkauft hat.
//
// Ablauf: weg → kommt (Boot fährt heran) → steht (Handel am Steg) → geht → weg.
// Der Handel läuft im Fenster der Werkbank (ui/crafting.js, Quelle »haendler«).
// M9.1 (Wunsch des Auftraggebers): Beim Einfahren spielt eine kleine Fanfare;
// wer heute mit ihm gehandelt hat, dem sagt er beim Schließen des Fensters
// Tschüss, und er legt gleich ab. Ob heute gehandelt wurde, steht schon im
// Spielstand (`sold` des Tages) – nach dem Laden ist er dann einfach fort.

import { T } from '../data/texts.js';
import { TRADER, TRADER_OFFERS, offersOfDay } from '../data/trader.js';
import { canAfford } from './inventory.js';
import { buildBoat, BOAT } from '../entities/traderModels.js';

const U = 1 / 16;
const DECK_Y = (BOAT.deck + 1) * U; // hier steht Balduin im Boot
const FAREWELL = 5; // Spielminuten (2 s) zwischen »Tschüss« und Ablegen

export class Trader {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.phase = null; // weg | kommt | steht | geht
    this.time = 0;
    this.left = null; // { day, minute }: heute nach dem Handel abgelegt (statt um 12 Uhr)
    this.fanfares = 0; // wie oft die Ankunftsfanfare kam (für die Prüfung)
    const world = game.world;
    this.boat = buildBoat({ world: world.materials.occluder });
    this.boat.root.visible = false;
    game.scene.add(this.boat.root);
    this.interaction = { id: 'npc-balduin', x: 0, z: 0, radius: 1.35, prompt: 'handeln', npc: 'balduin', trader: true, enabled: false };
    world.traderInteractions = [this.interaction];
    world.refreshInteractions();
  }

  get npc() {
    return this.game.survivors.npcs.get('balduin');
  }

  get st() {
    return this.game.state.world.trader;
  }

  /** Wo ist Balduin gerade im Tagesablauf? t = Fortschritt beim Kommen/Gehen (0…1). */
  phaseAt(day, minute) {
    if (day < TRADER.fromDay) return { id: 'weg', t: 0 };
    const { arrive, sail } = TRADER;
    // Nach dem Handel legt er gleich ab, sonst um 12 Uhr
    const early = this.left && this.left.day === day ? this.left.minute : Infinity;
    const leave = Math.min(TRADER.leave, early);
    if (minute < arrive) return { id: 'weg', t: 0 };
    if (minute < arrive + sail && leave > arrive) return { id: 'kommt', t: (minute - arrive) / sail };
    if (minute < leave) return { id: 'steht', t: 0 };
    if (minute < leave + sail) return { id: 'geht', t: (minute - leave) / sail };
    return { id: 'weg', t: 0 };
  }

  /** Hat er sich heute schon verabschiedet (nach dem Handel)? */
  get leaving() {
    return Boolean(this.left && this.left.day === this.game.state.time.day);
  }

  /** Hat Mika heute schon mit ihm getauscht? */
  tradedToday() {
    const t = this.st;
    return t.day === this.game.state.time.day && Object.values(t.sold || {}).some((n) => n > 0);
  }

  /** Ist er da (kommt oder steht)? Für Ziel-Pfeil und Hinweise. */
  get here() {
    return this.phase === 'kommt' || this.phase === 'steht';
  }

  /** Nach dem Laden oder einem neuen Spiel. */
  apply() {
    this.phase = null;
    // Heute schon gehandelt: Er hat sich längst verabschiedet
    this.left = this.tradedToday() ? { day: this.game.state.time.day, minute: -Infinity } : null;
    this.update(0);
  }

  /**
   * Handelsfenster zu (M9.1): Wer heute getauscht hat, dem sagt Balduin Tschüss,
   * winkt und legt kurz darauf ab. Ohne Tausch wartet er weiter bis Mittag.
   */
  closed() {
    const g = this.game;
    const n = this.npc;
    if (this.phase !== 'steht' || this.leaving) return;
    const lines = this.tradedToday() ? T.haendler.tschuess : T.haendler.bisSpaeter;
    g.hud.say(lines[g.state.time.day % lines.length], 3.2, { x: n.x, y: 2.5, z: n.z });
    if (!this.tradedToday()) return;
    n.wave = 1.6;
    this.left = { day: g.state.time.day, minute: g.state.time.minute + FAREWELL };
  }

  // --- Jeder Spielschritt -----------------------------------------------------------

  update(dt) {
    this.time += dt;
    const st = this.game.state;
    const now = this.phaseAt(st.time.day, st.time.minute);
    if (now.id !== this.phase) this.enter(now.id, this.phase);
    const n = this.npc;
    const { moor } = TRADER;
    // Einfahren: langsamer werden bis zum Steg; Ausfahren: erst langsam, dann zügig
    let x = moor.x;
    if (now.id === 'kommt') x = TRADER.from + (moor.x - TRADER.from) * (1 - (1 - now.t) ** 2);
    else if (now.id === 'geht') x = moor.x + (TRADER.from - moor.x) * now.t ** 2;
    // Das Boot schaukelt – in ganzen Bildpunkten, damit es scharf bleibt
    const bob = Math.round(Math.sin(this.time * 1.4) * 1.5) / 80;
    this.boat.root.position.set(x, bob, moor.z);
    if (now.id === 'kommt' || now.id === 'geht') {
      n.y = DECK_Y + bob;
      this.game.survivors.npcs.place(n, x + 0.5, moor.z, -Math.PI / 2);
    }
    const it = this.interaction;
    it.x = n.x;
    it.z = n.z;
    it.enabled = now.id === 'steht' && !n.target && !this.leaving;
    it.prompt = this.game.state.flags.balduinGetroffen ? 'handeln' : 'ansprechen';
  }

  /** Phasenwechsel: sichtbar machen, anlegen (Balduin geht auf den Steg), ablegen. */
  enter(id, prev) {
    const g = this.game;
    const n = this.npc;
    this.phase = id;
    n.drive = null;
    n.pull = null;
    n.restFacing = id === 'steht' ? TRADER.facing : null;
    const visible = id !== 'weg';
    n.model.root.visible = visible;
    this.boat.root.visible = visible;
    if (id === 'kommt' && prev === 'weg') {
      // Balduins Auftritt: Schiffshorn, Paukenwirbel, Fanfare – der Schlussakkord fällt aufs Anlegen
      this.fanfares += 1;
      g.sound.fanfare();
    }
    if (id === 'steht') {
      // Festmachen: Balduin springt auf den Steg
      n.y = null;
      const s = TRADER.stand;
      g.survivors.npcs.place(n, s.x, s.z, TRADER.facing);
      if (prev === 'kommt') {
        g.effects.dust(s.x + 0.6, s.z + 0.8, 0.8, 10);
        g.sound.play('bimmel', { x: s.x, z: s.z });
        if (!g.state.flags.balduinGetroffen) g.hud.say(T.haendler.ankunft, 5);
      }
    } else if (id === 'geht' && prev === 'steht') {
      g.effects.dust(TRADER.stand.x + 0.6, TRADER.stand.z + 0.8, 0.8, 10);
    }
  }

  // --- Handel -----------------------------------------------------------------------

  /** Heute schon verkauft (Vorrat der Sonderangebote). */
  soldToday(key) {
    const t = this.st;
    return t.day === this.game.state.time.day ? t.sold[key] || 0 : 0;
  }

  /** Angebote des Tages als Rezepte für das Handelsfenster. */
  offers() {
    const st = this.game.state;
    return offersOfDay(st.time.day).map((key) => {
      const o = TRADER_OFFERS[key];
      const [res, n] = Object.entries(o.get)[0];
      const left = o.stock ? Math.max(0, o.stock - this.soldToday(key)) : null;
      const soldOut = left === 0;
      return {
        id: `tausch-${key}`,
        key,
        icon: res,
        name: left === null ? T.menge(n, res) : T.haendler.vorrat(T.menge(n, res), left),
        info: T.haendler.info[key],
        cost: o.give,
        gives: { inventory: o.get },
        trade: true,
        owned: soldOut,
        ownedText: T.haendler.ausverkauft,
        affordable: !soldOut && canAfford(st.inventory, o.give),
      };
    });
  }

  /** Ein Tausch ist durch (game.craft hat bezahlt und ausgegeben). */
  sold(offer) {
    const st = this.game.state;
    const t = this.st;
    if (t.day !== st.time.day) {
      t.day = st.time.day;
      t.sold = {};
    }
    t.sold[offer.key] = (t.sold[offer.key] || 0) + 1;
    st.flags.gehandelt = true;
  }

  /** Spruch des Tages oben im Handelsfenster. */
  quote() {
    const st = this.game.state;
    if (!(st.inventory.teile > 0)) return T.haendler.keineTeile;
    const list = T.haendler.sprueche;
    return list[(st.time.day * 7) % list.length];
  }

  talk() {
    const g = this.game;
    if (g.state.flags.balduinGetroffen) {
      g.openCrafting('haendler');
      return;
    }
    g.startDialog('balduinTreffen', (aktion) => {
      g.state.flags.balduinGetroffen = true;
      if (aktion === 'handeln') g.openCrafting('haendler');
      g.quietSave();
    });
  }

  /** Zeile im Morgenbericht (ab dem ersten Besuchstag). */
  morning() {
    const st = this.game.state;
    if (st.time.day < TRADER.fromDay) return [];
    return [{ text: st.flags.balduinGetroffen ? T.haendler.bericht : T.haendler.berichtErst }];
  }

  /** Für den Ziel-Pfeil: wo steht er gerade? */
  target() {
    if (!this.here) return null;
    const n = this.npc;
    return { x: n.x, y: 1.9, z: n.z };
  }
}
