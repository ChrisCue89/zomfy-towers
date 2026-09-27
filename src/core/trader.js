// Balduin, der Händler (Meilenstein 8, seit Meilenstein 9 mit dem Boot). Jeden
// Morgen ab Tag 2 tuckert sein Boot von Osten über den See, legt am Steg an,
// und Balduin handelt bis Mittag auf dem Steg: Zombieteile (die Beute der
// Nacht) gegen Rohstoffe. Wo er gerade ist, ergibt sich allein aus der Uhrzeit –
// nach dem Laden, Ausruhen oder Schlafen ist er also immer richtig. Gespeichert
// wird nur, was er heute schon verkauft hat.
//
// Ablauf: weg → kommt (Boot fährt heran) → steht (Handel am Steg) → geht → weg.
// Der Handel läuft im Fenster der Werkbank (ui/crafting.js, Quelle »haendler«).

import { T } from '../data/texts.js';
import { TRADER, TRADER_OFFERS, offersOfDay } from '../data/trader.js';
import { canAfford } from './inventory.js';
import { buildBoat, BOAT } from '../entities/traderModels.js';

const U = 1 / 16;
const DECK_Y = (BOAT.deck + 1) * U; // hier steht Balduin im Boot

export class Trader {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.phase = null; // weg | kommt | steht | geht
    this.time = 0;
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
    const { arrive, leave, sail } = TRADER;
    if (minute < arrive) return { id: 'weg', t: 0 };
    if (minute < arrive + sail) return { id: 'kommt', t: (minute - arrive) / sail };
    if (minute < leave) return { id: 'steht', t: 0 };
    if (minute < leave + sail) return { id: 'geht', t: (minute - leave) / sail };
    return { id: 'weg', t: 0 };
  }

  /** Ist er da (kommt oder steht)? Für Ziel-Pfeil und Hinweise. */
  get here() {
    return this.phase === 'kommt' || this.phase === 'steht';
  }

  /** Nach dem Laden oder einem neuen Spiel. */
  apply() {
    this.phase = null;
    this.update(0);
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
    it.enabled = now.id === 'steht' && !n.target;
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
