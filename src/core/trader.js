// Balduin, der Händler (Meilenstein 8). Jeden Morgen ab Tag 2 zieht er seinen
// Bollerwagen von Osten die Straße entlang, bleibt bis Mittag und tauscht
// Zombieteile (die Beute der Nacht) gegen Rohstoffe. Wo er gerade ist, ergibt
// sich allein aus der Uhrzeit – nach dem Laden, Ausruhen oder Schlafen steht
// er also immer richtig. Gespeichert wird nur, was er heute schon verkauft hat.
//
// Ablauf: weg → kommt (zieht den Wagen heran) → steht (Handel) → geht → weg.
// Der Handel läuft im Fenster der Werkbank (ui/crafting.js, Quelle »haendler«).

import { T } from '../data/texts.js';
import { TRADER, TRADER_OFFERS, offersOfDay } from '../data/trader.js';
import { canAfford } from './inventory.js';
import { buildCart, CART } from '../entities/traderModels.js';

const U = 1 / 16;
/** Möglicher Standplatz (x, an dem Balduin hält) – der erste freie wird genommen. */
const STANDS = [TRADER.standX, 1.0, 7.4];
const CART_Z = TRADER.lane - 0.25; // der Wagen läuft etwas nördlich von ihm (hinter ihm im Bild)
const HANDLE_DOWN = 0.57; // Deichsel liegt am Boden
const HANDLE_UP = -0.1; // Deichsel in der Hand

export class Trader {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.phase = null; // weg | kommt | steht | geht
    this.standX = TRADER.standX;
    this.reservedCells = []; // Bauraster-Zellen, die morgens für den Stand frei bleiben
    this.wheelAngle = 0;
    this.rattle = 0; // Strecke seit dem letzten Rumpeln
    this.lastCart = null; // letzte Wagenposition (für das Drehen der Räder)
    this.handle = HANDLE_DOWN;
    const world = game.world;
    this.cart = buildCart({ world: world.materials.occluder, fringe: world.materials.laundry });
    this.cart.root.visible = false;
    game.scene.add(this.cart.root);
    // Kollision nur für Mika und die Überlebenden – die Horde läuft hindurch
    this.collider = null;
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

  /** Wo steht Balduin gerade im Tagesablauf? t = Fortschritt beim Kommen/Gehen (0…1). */
  phaseAt(day, minute) {
    if (day < TRADER.fromDay) return { id: 'weg', t: 0 };
    const { arrive, leave, walk } = TRADER;
    if (minute < arrive) return { id: 'weg', t: 0 };
    if (minute < arrive + walk) return { id: 'kommt', t: (minute - arrive) / walk };
    if (minute < leave) return { id: 'steht', t: 0 };
    if (minute < leave + walk) return { id: 'geht', t: (minute - leave) / walk };
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
    const st = this.game.state;
    const now = this.phaseAt(st.time.day, st.time.minute);
    if (now.id !== this.phase) this.enter(now.id, this.phase);
    const n = this.npc;
    const pull = TRADER.pull;
    if (now.id === 'kommt') {
      const x = TRADER.edge + (this.standX - TRADER.edge) * now.t;
      this.drive(n, x, -1, dt);
      this.placeCart(x + pull, false);
    } else if (now.id === 'geht') {
      const from = this.standX + 2 * pull; // Wagen gewendet: er steht jetzt am Ostende
      const x = from + (TRADER.edge - from) * now.t;
      this.drive(n, x, 1, dt);
      this.placeCart(x - pull, true);
    }
    // Deichsel sanft heben bzw. ablegen
    const want = now.id === 'steht' ? HANDLE_DOWN : HANDLE_UP;
    this.handle += (want - this.handle) * Math.min(1, dt * 6);
    this.cart.handle.rotation.z = this.handle;
    const it = this.interaction;
    it.x = n.x;
    it.z = n.z;
    it.enabled = now.id === 'steht' && !n.target;
    it.prompt = this.game.state.flags.balduinGetroffen ? 'handeln' : 'ansprechen';
  }

  /** Phasenwechsel: sichtbar machen, Wagen parken oder wenden, Stand freihalten. */
  enter(id, prev) {
    const g = this.game;
    const n = this.npc;
    this.phase = id;
    n.drive = null;
    n.pull = null;
    n.restFacing = id === 'steht' ? 0 : null; // am Stand: Blick zur Straße (zur Kamera)
    const visible = id !== 'weg';
    n.model.root.visible = visible;
    this.cart.root.visible = visible;
    if (id === 'kommt' || (id === 'steht' && prev !== 'kommt') || id === 'geht') this.standX = this.chooseStand();
    this.setStand(id === 'steht');
    if (id === 'kommt') {
      this.handle = HANDLE_UP;
      this.lastCart = null;
    } else if (id === 'steht') {
      this.placeCart(this.standX + TRADER.pull, false);
      const front = this.frontSpot();
      if (prev === 'kommt') {
        g.survivors.npcs.walkTo(n, front.x, front.z);
        g.sound.play('bimmel', { x: n.x, z: n.z });
        if (!g.state.flags.balduinGetroffen) g.hud.say(T.haendler.ankunft, 5);
      } else {
        g.survivors.npcs.place(n, front.x, front.z, 0);
        this.handle = HANDLE_DOWN;
      }
    } else if (id === 'geht') {
      // Einpacken und wenden – eine Staubwolke verdeckt das Umdrehen
      const cx = this.standX + TRADER.pull;
      g.effects.dust(cx, CART_Z, 1.4, 26);
      this.lastCart = null;
      this.placeCart(cx, true);
      this.handle = HANDLE_UP;
    }
  }

  /** Balduin an x auf der Straße setzen und laufen lassen (dir: -1 nach Westen, 1 nach Osten). */
  drive(n, x, dir, dt) {
    const moved = Math.abs(x - n.x);
    n.target = null;
    n.drive = dt > 0 ? Math.min(3, moved / dt) : 0;
    n.pull = dir < 0 ? 'L' : 'R'; // der Arm auf der Wagenseite (nördlich, hinter ihm)
    n.facing = dir < 0 ? -Math.PI / 2 : Math.PI / 2;
    this.game.survivors.npcs.place(n, x, TRADER.lane, n.facing);
  }

  /** Wagen an seine Stelle setzen; Räder drehen sich mit der gefahrenen Strecke. */
  placeCart(x, turned) {
    const root = this.cart.root;
    root.position.set(x, 0, CART_Z);
    this.cart.turn.rotation.y = turned ? Math.PI : 0;
    if (this.lastCart !== null) {
      const d = Math.abs(x - this.lastCart);
      this.wheelAngle += d / (CART.wheelRadius * U);
      this.rattle += d;
      if (this.rattle > 0.45) {
        this.rattle = 0;
        this.game.sound.play('rumpeln', { x, z: CART_Z, volume: 0.8 });
      }
    }
    this.lastCart = x;
    for (const w of this.cart.wheels) w.rotation.z = this.wheelAngle;
  }

  /** Platz vor dem Wagen, von dem aus Balduin handelt. */
  frontSpot() {
    return this.game.survivors.freeSpot(this.standX + TRADER.front.x - TRADER.standX, TRADER.front.z, 0.28);
  }

  // --- Standplatz -------------------------------------------------------------------

  /** Zellen unter Wagen, Deichsel und Handelsplatz. */
  standCells(standX) {
    const grid = this.game.world.grid;
    const minX = standX - 0.2;
    const maxX = standX + TRADER.pull + (CART.halfLength + 1) * U;
    const cells = [];
    for (let cj = Math.floor(CART_Z - 0.5); cj <= Math.floor(TRADER.front.z + 0.3); cj++) {
      for (let ci = Math.floor(minX); ci <= Math.floor(maxX); ci++) if (grid.index(ci, cj) >= 0) cells.push([ci, cj]);
    }
    return cells;
  }

  /** Erster Standplatz, auf dem nichts gebaut ist. */
  chooseStand() {
    const grid = this.game.world.grid;
    for (const x of STANDS) if (this.standCells(x).every(([ci, cj]) => grid.occupantAt(ci, cj) === null)) return x;
    return STANDS[0];
  }

  /** Solange er steht: Stand nicht bebaubar, Wagen mit Kollision. */
  setStand(on) {
    const world = this.game.world;
    const grid = world.grid;
    for (const k of this.reservedCells) if (grid.reserved[k] === 2) grid.reserved[k] = 0;
    this.reservedCells = [];
    if (this.collider) {
      world.colliders.remove(this.collider);
      this.collider = null;
    }
    if (!on) return;
    for (const [ci, cj] of this.standCells(this.standX)) {
      const k = grid.index(ci, cj);
      if (grid.reserved[k] === 0) {
        grid.reserved[k] = 2;
        this.reservedCells.push(k);
      }
    }
    const cx = this.standX + TRADER.pull;
    const hx = (CART.halfLength + 0.5) * U;
    const hz = (CART.wheelZ + 0.5) * U;
    this.collider = world.colliders.addBox(cx - hx, CART_Z - hz, cx + hx, CART_Z + hz, 'wagen');
    this.collider.hordeFree = true;
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
