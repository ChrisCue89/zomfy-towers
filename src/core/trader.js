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
import { blueprintOptions } from '../data/blueprints.js';
import { TRADER, TRADER_OFFERS, offersOfDay } from '../data/trader.js';
import { canAfford } from './inventory.js';
import { FLAWLESS } from '../data/risk.js';
import { ABILITIES, WANDERERS } from '../data/wanderers.js';
import { POST } from '../data/network.js';
import { FISHING, ROD_OFFER, FISH_PRICE } from '../data/fishing.js';
import { AMMO_TRADE, ARMS_REPLACE } from '../data/arms.js';
import { buildBoat, buildRope, BOAT, BOAT_UNIT, CLEAT } from '../entities/traderModels.js';
import { LAYOUT } from '../world/layout.js';

const U = BOAT_UNIT;
const DECK_Y = (BOAT.deck + 1) * U; // hier steht Balduin im Boot
const FAREWELL = 5; // Spielminuten (2 s) zwischen »Tschüss« und Ablegen
const STERN = BOAT.halfLength * U; // vom Mittelpunkt bis zum Heck (m)

/** Weiche Kurve (Catmull-Rom) durch die Stützpunkte, nach Bogenlänge vermessen. */
function buildRoute(points, steps = 40) {
  const pts = [];
  const at = (i) => points[Math.max(0, Math.min(points.length - 1, i))];
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push({ x: f(p0[0], p1[0], p2[0], p3[0]), z: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  const last = points[points.length - 1];
  pts.push({ x: last[0], z: last[1] });
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  return { pts, len, total: len[len.length - 1] };
}

/** Punkt und Fahrtrichtung bei Anteil u (0…1) der Strecke. */
function routePose(route, u, out) {
  const target = Math.max(0, Math.min(1, u)) * route.total;
  let lo = 0;
  let hi = route.len.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (route.len[mid] < target) lo = mid;
    else hi = mid;
  }
  const a = route.pts[lo];
  const b = route.pts[hi];
  const f = (target - route.len[lo]) / (route.len[hi] - route.len[lo] || 1);
  out.x = a.x + (b.x - a.x) * f;
  out.z = a.z + (b.z - a.z) * f;
  const d = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  out.dx = (b.x - a.x) / d;
  out.dz = (b.z - a.z) / d;
  return out;
}

const ARRIVE = buildRoute(TRADER.arriveRoute);
const LEAVE = buildRoute(TRADER.leaveRoute);
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const turnTo = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;

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
    // Leine vom Bug zum Poller (M10)
    this.rope = buildRope(world.materials.occluder);
    game.scene.add(this.rope.mesh);
    this.pose = { x: TRADER.moor.x, z: TRADER.moor.z, dx: -1, dz: 0 };
    this.foamT = 0;
    this.greetedDay = 0; // an welchem Tag er Mika schon mit der Mütze gegrüßt hat (M10)
    this.idleT = 6; // Sekunden bis zur nächsten kleinen Geste im Stehen
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
    n.gestures.length = 0;
    if (!this.tradedToday()) {
      g.survivors.npcs.gesture(n, 'schulter', 1.1);
      return;
    }
    // Daumen hoch, dann winkt er zum Abschied
    g.survivors.npcs.gesture(n, 'daumen', 0.8);
    g.survivors.npcs.gesture(n, 'winken', 1.5);
    this.left = { day: g.state.time.day, minute: g.state.time.minute + FAREWELL };
  }

  // --- Jeder Spielschritt -----------------------------------------------------------

  update(dt) {
    this.time += dt;
    const g = this.game;
    const st = g.state;
    const now = this.phaseAt(st.time.day, st.time.minute);
    if (now.id !== this.phase) this.enter(now.id, this.phase);
    const n = this.npc;
    const { moor } = TRADER;
    // Einfahren: zwischen den Inseln hindurch, langsamer werden bis zum Steg;
    // Ausfahren: erst auf der Stelle drehen, dann zügig davon (M10)
    const pose = this.pose;
    const lastX = pose.x;
    const lastZ = pose.z;
    if (now.id === 'kommt') routePose(ARRIVE, 1 - (1 - now.t) ** 2, pose);
    else if (now.id === 'geht') routePose(LEAVE, now.t ** 2, pose);
    else Object.assign(pose, { x: moor.x, z: moor.z, dx: -1, dz: 0 });
    // Der Bug (im Modell −x) zeigt in Fahrtrichtung
    let heading = Math.atan2(pose.dz, -pose.dx);
    if (now.id === 'geht') heading = turnTo(0, heading, smooth(0, 0.3, now.t));
    // Das Boot schaukelt – in ganzen Bildpunkten, damit es scharf bleibt
    const bob = Math.round(Math.sin(this.time * 1.4) * 1.5) / 80;
    this.boat.root.position.set(pose.x, bob, pose.z);
    this.boat.root.rotation.y = heading;
    const moving = now.id === 'kommt' || now.id === 'geht';
    const c = Math.cos(heading);
    const s = Math.sin(heading);
    if (moving) {
      // Balduin steht etwas hinter der Mitte an Deck und schaut nach vorn
      n.y = DECK_Y + bob;
      g.survivors.npcs.place(n, pose.x + 0.5 * c, pose.z - 0.5 * s, Math.atan2(-c, s));
      // Kielwasser hinter dem Heck, solange das Boot Fahrt macht
      const speed = dt > 0 ? Math.hypot(pose.x - lastX, pose.z - lastZ) / dt : 0;
      this.foamT -= dt;
      if (speed > 0.25 && this.foamT <= 0) {
        this.foamT = 0.07;
        g.effects.foam(pose.x + STERN * c, pose.z - STERN * s, speed > 1 ? 2 : 1);
      }
    }
    g.sound.motor(moving && dt > 0 ? 1 : 0, pose.x, pose.z);
    this.updateRope(now, bob, c, s);
    if (now.id === 'steht' && dt > 0) this.updateGestures(dt);
    const it = this.interaction;
    it.x = n.x;
    it.z = n.z;
    it.enabled = now.id === 'steht' && !n.target && !this.leaving;
    it.prompt = this.game.state.flags.balduinGetroffen ? 'handeln' : 'ansprechen';
  }

  /**
   * Balduins Gesten am Steg (M10): Kommt Mika heran, lüftet er einmal am Tag die
   * Mütze (eine laufende Geste macht er noch zu Ende); sonst reibt er sich ab und
   * zu die Hände (sie hat Teile dabei) oder krault nachdenklich den Bart.
   */
  updateGestures(dt) {
    const g = this.game;
    const n = this.npc;
    if (this.leaving) return;
    const p = g.player.position;
    const d = Math.hypot(p.x - n.x, p.z - n.z);
    const day = g.state.time.day;
    if (d < 2.6 && this.greetedDay !== day) {
      this.greetedDay = day;
      n.gestures.length = Math.min(n.gestures.length, 1);
      g.survivors.npcs.gesture(n, 'muetze', 1.3);
      return;
    }
    if (n.gestures.length) return;
    this.idleT -= dt;
    if (this.idleT > 0 || d > 6) return;
    this.idleT = 9 + Math.random() * 5;
    g.survivors.npcs.gesture(n, (g.state.inventory.teile || 0) >= 3 ? 'reiben' : 'bart', 1.6);
  }

  /**
   * Die Leine (M10): Kurz vor dem Anlegen wirft Balduin sie im Bogen über den
   * Poller; solange er handelt, hängt sie zwischen Bugklampe und Poller durch.
   */
  updateRope(now, bob, c, s) {
    const b = LAYOUT.bollard;
    const post = { x: b.x, y: 0.7, z: b.z };
    if (now.id === 'kommt' && now.t >= TRADER.throwAt) {
      const n = this.npc;
      const hand = { x: n.x, y: DECK_Y + bob + 1.1, z: n.z };
      this.rope.set(hand, post, -0.45, (now.t - TRADER.throwAt) / (1 - TRADER.throwAt));
    } else if (now.id === 'steht') {
      const p = this.pose;
      const lx = CLEAT.x * U;
      const lz = CLEAT.z * U;
      const cleat = { x: p.x + lx * c + lz * s, y: DECK_Y + bob + U * 3, z: p.z - lx * s + lz * c };
      this.rope.set(cleat, post, 0.14, 1);
    } else this.rope.hide();
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
      g.player.express('staunen', 2); // Was ist denn das? (M12)
      if (!g.state.flags.balduinGetroffen) g.hud.say(T.haendler.ankunft, 5);
      g.funk?.once('balduin', T.funk.balduin); // N4: Edda kennt ihn
    }
    if (id === 'steht') {
      // Festmachen: Balduin springt auf den Steg
      n.y = null;
      const s = TRADER.stand;
      g.survivors.npcs.place(n, s.x, s.z, TRADER.facing);
      if (prev === 'kommt') {
        g.effects.dust(s.x + 0.6, s.z + 0.8, 0.8, 10);
        g.sound.play('bimmel', { x: s.x, z: s.z });
        g.deliverOrders?.(); // N4: Bestelltes aus dem Katalog trägt er gleich ins Haus
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
    const list = this.dayOffers();
    // M24: nach drei makellosen Nächten hat Balduin einen Schatz dabei
    if (st.risk?.treasure) {
      const [name, info] = T.wagnis.schatzAngebot;
      list.push({ id: 'tausch-schatz', key: 'schatz', cost: FLAWLESS.price, trade: true, icon: 'kiste', name, info, gives: { rare: FLAWLESS.rarity }, affordable: canAfford(st.inventory, FLAWLESS.price) });
    }
    // M30: Patronen für den Waffenschrank – nur ein paar am Tag, sie gehören allen
    if (st.arms?.unlocked) {
      const left = Math.max(0, AMMO_TRADE.perDay - this.soldToday('patronen'));
      const n = AMMO_TRADE.gives.patronen;
      list.push({ id: 'tausch-patronen', key: 'patronen', cost: AMMO_TRADE.cost, trade: true, icon: 'patronen', name: T.haendler.vorrat(T.menge(n, 'patronen'), left), info: T.waffen.patronenInfo, gives: { inventory: { patronen: n } }, owned: left === 0, ownedText: T.haendler.ausverkauft, affordable: left > 0 && canAfford(st.inventory, AMMO_TRADE.cost) });
    }
    // M31: Was nach der Lagerglocke im Laub blieb, bringt Balduin nach (eine Waffe je Tag)
    const lost = st.arms?.lost || [];
    if (lost.length) {
      const left = Math.max(0, ARMS_REPLACE.perDay - this.soldToday('ersatz'));
      for (const id of lost) {
        list.push({ id: `tausch-ersatz-${id}`, key: 'ersatz', cost: ARMS_REPLACE.cost, trade: true, icon: id, name: T.waffen.ersatz(T.gegenstaende[id]), info: T.waffen.ersatzInfo, gives: { arm: id }, owned: left === 0, ownedText: T.haendler.ausverkauft, affordable: left > 0 && canAfford(st.inventory, ARMS_REPLACE.cost) });
      }
    }
    // M32: Ist ein Platz frei, nimmt Balduin eine Einladung mit – am nächsten Morgen ist die Person wieder da
    for (const id of this.game.post?.invitable() || []) {
      const w = WANDERERS[id];
      list.push({ id: `tausch-einladung-${id}`, key: 'einladung', cost: POST.inviteCost, trade: true, icon: 'brief', name: T.netz.einladung(w.name), info: T.netz.einladungInfo(T.wanderer.zumOrt[w.place], w.name), gives: { invite: id }, affordable: canAfford(st.inventory, POST.inviteCost) });
    }
    // M33: Balduins zweite Angel (solange Mika keine hat) und Fisch aus dem Korb
    const fishing = st.fishing;
    if (fishing && !fishing.rod && st.time.day >= ROD_OFFER.day) {
      list.push({ id: 'tausch-angel', key: 'angel', cost: ROD_OFFER.cost, trade: true, icon: 'angel', name: T.angeln.angelAngebot, info: T.angeln.angelInfo, gives: { rod: true }, affordable: canAfford(st.inventory, ROD_OFFER.cost) });
    }
    if (fishing?.basket > 0) {
      const left = Math.max(0, FISHING.sell.perDay - this.soldToday('fisch'));
      list.push({ id: 'tausch-fisch', key: 'fisch', cost: {}, trade: true, icon: 'fisch', name: T.angeln.korb(fishing.basket), info: T.angeln.korbInfo, gives: { fish: FISH_PRICE }, owned: left === 0, ownedText: T.haendler.ausverkauft, affordable: left > 0 });
    }
    return list;
  }

  /** Die Angebote dieses Tages (Fahrplan aus data/trader.js). */
  dayOffers() {
    const st = this.game.state;
    return offersOfDay(st.time.day).map((key) => {
      const o = TRADER_OFFERS[key];
      const left = o.stock ? Math.max(0, o.stock - this.soldToday(key)) : null;
      const soldOut = left === 0;
      const common = { id: `tausch-${key}`, key, cost: o.give, trade: true, owned: soldOut, ownedText: T.haendler.ausverkauft, affordable: !soldOut && canAfford(st.inventory, o.give) };
      if (o.blueprint) {
        // Bauplan (M19): drei zur Wahl – ausverkauft, wenn es keine neuen mehr gibt
        const none = !blueprintOptions(st.blueprints, 99, 1).length;
        const [name, info] = T.bauplaene.kaufen;
        return { ...common, icon: 'bauplan', name: T.haendler.vorrat(name, left), info, gives: { blueprint: true }, owned: soldOut || none, ownedText: none ? T.bauplaene.keine : T.haendler.ausverkauft, affordable: !soldOut && !none && canAfford(st.inventory, o.give) };
      }
      if (o.bag) {
        // Wundertüte (M21): ein zufälliges Turmteil
        const [name, info] = T.wundertuete.kaufen;
        return { ...common, icon: 'wundertuete', name: T.haendler.vorrat(name, left), info, gives: { bag: true } };
      }
      if (o.part) {
        // Besonderes Turmteil (M10)
        const [name, info] = T.turmteile[o.part];
        return { ...common, icon: o.part, name: T.haendler.vorrat(name, left), info, gives: { part: o.part } };
      }
      // M29: Mit Fiete im Lager legt Balduin bei Rohstoffen etwas drauf (sie kennen sich von früher)
      const [res, base] = Object.entries(o.get)[0];
      const n = base + Math.floor(ABILITIES.handel.extra * (this.game.survivors?.ability('handel') || 0)); // M31: verletzt halb
      return { ...common, icon: res, name: left === null ? T.menge(n, res) : T.haendler.vorrat(T.menge(n, res), left), info: T.haendler.info[key], gives: { inventory: { [res]: n } } };
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
