// Mit dem Boot zu den Inseln (N6, OFFENE-FRAGEN 193): Mikas Ruderboot liegt seit der Ankunft
// (N5) nördlich am Steg. Tagsüber bringt es Mika zu einer der drei Felsinseln (Modus
// 'rudern': Riemen im Takt, Kielwasser, Esc legt gleich an), dort läuft Mika nur auf der
// Insel (map.isle) und findet etwas; E am Boot rudert zurück, um 18:30 von selbst.
// Das Boot selbst gehört der Ankunft (core/arrival.js: Pose, Riemen, Schaukeln).

import { TRIP, ISLES, FINDS, CAT, REPAIR } from '../data/isles.js';
import { ARRIVAL } from '../data/arrival.js';
import { ISLANDS } from '../world/map.js';
import { buildRoute, routeAt } from './arrival.js';
import { gain, pay } from './inventory.js';
import { T } from '../data/texts.js';
import { COLORS } from '../ui/ui.js';

const smooth = (u) => u * u * (3 - 2 * u);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Isles {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.trip = null; // laufende Fahrt { target, route, t, dur }
    this.at = null; // auf welcher Insel Mika gerade steht (null: in der Bucht)
    this.boatAt = null; // wo das Boot liegt (null: am Steg)
    this.heading = Math.PI; // Fahrtrichtung des Boots (am Steg: Bug nach Westen)
    this.wake = 0;
    this.boatInteraction = { id: 'ruderboot', x: TRIP.dock.x, z: TRIP.dock.z, radius: 1.0, prompt: 'rudern', boat: true, enabled: true };
  }

  get data() {
    return this.game.state.isles;
  }

  /** Auf dem See oder einer Insel (Kamera nah heran, weiter nach Osten). */
  get away() {
    return Boolean(this.trip || this.at);
  }

  /**
   * Wo das Boot an einer Insel liegt: vom Inselrand entlang `side` nach außen (der Rand
   * ist je Karte ein wenig anders), der Bug zeigt zur Insel. `approach` liegt davor.
   */
  landing(id) {
    const isle = ISLES[id];
    const s = ISLANDS[isle.index];
    const map = this.game.world.map;
    const { x: sx, z: sz } = isle.side;
    let t = 0;
    while (t < s.r * 1.6 && map.isleEdge(isle.index, s.x + sx * t, s.z + sz * t) < 0) t += 0.05;
    const edge = { x: s.x + sx * t, z: s.z + sz * t };
    const boat = { x: edge.x + sx * TRIP.reach, z: edge.z + sz * TRIP.reach };
    const approach = { x: boat.x + sx * 1.6, z: boat.z + sz * 1.6 };
    return { edge, boat, approach };
  }

  /** Einblendungen der Inseln und des Boots in die Welt (world.isleInteractions). */
  refresh() {
    const w = this.game.world;
    const b = this.boatInteraction;
    const spot = this.boatAt ? ISLES[this.boatAt].shore : TRIP.dock;
    b.x = spot.x;
    b.z = spot.z;
    b.prompt = !this.data.boat ? 'bootFlicken' : this.boatAt ? 'zurueckRudern' : 'rudern';
    w.isleProps.setFound(this.data.found, this.data.cat);
    // Fundstellen nur auf der Insel, auf der Mika gerade ist (sonst ragen sie über das Wasser)
    for (const it of w.isleProps.interactions) if (it.isleFind) it.enabled = it.enabled && FINDS[it.isleFind].isle === this.at;
    w.isleInteractions = [b, ...w.isleProps.interactions];
    w.refreshInteractions();
  }

  /** Warum jetzt keine Fahrt (null: es geht). */
  blocked() {
    const g = this.game;
    const m = g.state.time.minute;
    if (g.nights?.active) return 'nacht';
    if (m < TRIP.from || m > TRIP.until) return 'zeit';
    const p = g.player.position;
    if (g.horde.anyNear(p.x, p.z, TRIP.near)) return 'horde';
    return null;
  }

  /** E am Boot: erst abdichten, dann am Steg die Wahl des Ziels, auf einer Insel zurück zur Bucht. */
  use() {
    const g = this.game;
    if (this.at) {
      this.row(null);
      return;
    }
    if (!this.data.boat) {
      g.startDialog('bootFlicken', (aktion) => {
        if (aktion === 'abdichten') this.repair();
      });
      return;
    }
    const why = this.blocked();
    if (why) {
      g.hud.say(T.inseln.gruende[why], 2.6);
      return;
    }
    g.startDialog('bootFahrt', (aktion) => {
      if (typeof aktion === 'string' && aktion.startsWith('insel:')) this.row(aktion.slice(6));
    });
  }

  /** Das Boot abdichten (Holz und Fasern aus dem Vorrat). */
  repair() {
    const g = this.game;
    if (!pay(g.state.inventory, REPAIR)) {
      g.hud.say(T.inseln.zuWenig, 2.6);
      return;
    }
    this.data.boat = true;
    g.sound.play('klopfen');
    g.effects.chips(TRIP.mooring.x, 0.3, TRIP.mooring.z, 'holz', 8);
    g.hud.toast(T.inseln.dicht, null, 4);
    g.funk.once('boot', T.funk.boot);
    this.refresh();
    g.quietSave();
  }

  /** Losrudern: zu einer Insel (`target`) oder zurück an den Steg (null). */
  row(target) {
    const g = this.game;
    const a = g.arrival;
    const from = this.boatAt;
    const pts = [[a.pose.x, a.pose.z]];
    if (from) {
      // erst ein Stück vom Ufer weg, dann dieselben Punkte zurück wie hin
      const l = this.landing(from);
      pts.push([l.approach.x, l.approach.z]);
      for (const p of [...ISLES[from].via].reverse()) pts.push(p);
    } else {
      for (const p of ISLES[target].via) pts.push(p);
    }
    if (target) {
      const l = this.landing(target);
      pts.push([l.approach.x, l.approach.z], [l.boat.x, l.boat.z]);
    } else {
      // von Osten heran, der Bug zeigt zum Ufer (wie nach der Ankunft)
      pts.push([TRIP.mooring.x + 1.8, TRIP.mooring.z], [TRIP.mooring.x, TRIP.mooring.z]);
    }
    const route = buildRoute(pts);
    this.trip = { target, route, t: 0, dur: Math.max(1.5, route.total / TRIP.speed) };
    this.heading = Math.atan2(a.pose.dz, a.pose.dx);
    this.at = null;
    this.boatAt = null;
    g.world.map.isle = null;
    g.builder?.cancel?.();
    g.player.seat(null);
    a.seatMika();
    g.mode = 'rudern';
    g.applyView(false); // nah heran, die Kamera darf über den See
    g.sound.play('platsch', { volume: 0.4 });
    this.refresh();
  }

  /** Jeder Schritt im Modus 'rudern'. */
  update(dt, input) {
    const tr = this.trip;
    if (!tr) return;
    const g = this.game;
    const a = g.arrival;
    tr.t += dt;
    const u = input.pressed('menu') ? 1 : Math.min(1, tr.t / tr.dur);
    routeAt(tr.route, smooth(u), a.pose);
    // Das Boot dreht sich gemächlich in die Fahrtrichtung (am Steg liegt es andersherum)
    const want = Math.atan2(a.pose.dz, a.pose.dx);
    const diff = wrapAngle(want - this.heading);
    const turn = TRIP.turn * dt;
    this.heading = wrapAngle(this.heading + Math.max(-turn, Math.min(turn, diff)));
    a.pose.dx = Math.cos(this.heading);
    a.pose.dz = Math.sin(this.heading);
    a.placeBoat(0); // geschaukelt wird in arrival.update (einmal je Bild)
    const rowing = u < 0.96;
    if (rowing) a.stroke += dt * ARRIVAL.stroke;
    a.oars(a.stroke, rowing);
    a.seatMika();
    if (g.player.seated) g.player.seated.phase = a.stroke; // Hände und Riemen im selben Takt
    g.player.idle(dt);
    // Kielwasser: kleine Spritzer hinter dem Boot
    this.wake -= dt;
    if (rowing && this.wake <= 0) {
      this.wake = 0.35;
      g.effects.splat(a.pose.x - a.pose.dx * 1.1, 0.02, a.pose.z - a.pose.dz * 1.1, 'wasser', 3, 0.2);
    }
    if (u >= 1) this.land();
  }

  /** Angelegt: an Land gehen (Insel oder Steg), die Fahrt kostet ein wenig Zeit. */
  land() {
    const g = this.game;
    const tr = this.trip;
    this.trip = null;
    const a = g.arrival;
    const p = g.player;
    p.seat(null);
    a.oars(0, false);
    if (tr.target) {
      const isle = ISLES[tr.target];
      this.at = tr.target;
      this.boatAt = tr.target;
      g.world.map.isle = isle.index;
      p.place(isle.shore.x, isle.shore.z, Math.atan2(-isle.side.x, -isle.side.z)); // Blick in die Insel
      g.pushPlayerOut();
      const d = this.data;
      const first = !d.visited.includes(tr.target);
      if (first) d.visited.push(tr.target);
      g.hud.say(first ? T.inseln.ankunft[tr.target] : T.inseln.wieder[tr.target], 5);
      g.sound.play('schritt');
    } else {
      this.at = null;
      this.boatAt = null;
      g.world.map.isle = null;
      a.moor();
      this.heading = Math.PI;
      p.place(TRIP.dock.x, TRIP.dock.z, -Math.PI / 2); // Blick zum Ufer
      g.pushPlayerOut();
    }
    g.state.time.minute += TRIP.minutes;
    g.mode = 'play';
    g.useLockUntil = g.clock + 0.4;
    g.applyView(false);
    this.refresh();
    g.quietSave();
  }

  /** Im Spiel: um 18:30 rudert Mika von einer Insel von selbst zurück (nachts bleibt niemand draußen). */
  tick() {
    const g = this.game;
    if (this.at && g.mode === 'play' && g.state.time.minute >= TRIP.home) {
      g.hud.toast(T.inseln.spaet, 'angel', 4);
      this.row(null);
    }
  }

  /** E an einer Fundstelle. */
  find(id) {
    const g = this.game;
    const f = FINDS[id];
    const d = this.data;
    if (f.bench) {
      // Die Bank mit Aussicht: immer wieder ein Gedanke (der erste zählt als Fund)
      if (!d.found.includes(id)) d.found.push(id);
      const lines = T.inseln.bank;
      g.hud.say(lines[(g.state.time.day + d.found.length) % lines.length], 5);
      g.player.express('froh', 2);
      this.refresh();
      g.quietSave();
      return;
    }
    if (d.found.includes(id)) return;
    d.found.push(id);
    if (f.gives) {
      gain(g.state.inventory, f.gives);
      g.sound.play('loot');
    }
    if (f.chest) g.openChest(f.x, f.z); // M21: ein Turmteil aus der Fundkiste
    if (f.cat) {
      d.cat = true; // die Katze macht es gemütlicher (furnishing.cozy)
      g.sound.play('schnurren');
    }
    g.hud.say(T.inseln.funde[id], 5);
    if (f.note) {
      g.deliveryCard.open([{ letter: 'edda', kind: 'notiz', name: T.inseln.notizVon, place: null, day: g.state.time.day, text: T.inseln.notizen[f.note] }]);
      g.mode = 'lieferung';
    }
    this.refresh();
    g.quietSave();
  }

  /** Nach dem Laden: Wer auf einer Insel gespeichert hat, wacht am Steg auf (das Boot liegt dort). */
  apply() {
    const g = this.game;
    const p = g.state.player;
    this.trip = null;
    this.at = null;
    this.boatAt = null;
    this.heading = Math.PI;
    g.world.map.isle = null;
    if (!g.arrival.active) g.arrival.moor();
    // (Der Innenraum liegt östlich der Karte – für die Karte wäre das See: wer drinnen ist, bleibt drinnen)
    if (!g.world.isInside(p.x, p.z) && (g.world.map.onIsland(p.x, p.z) || g.world.map.isWater(p.x, p.z))) {
      p.x = TRIP.dock.x;
      p.z = TRIP.dock.z;
    }
    g.world.placeHomeCat();
    this.refresh();
  }

  /** Unten in der Mitte, solange gerudert wird: wohin, und dass Esc gleich anlegt. */
  draw(ui) {
    const tr = this.trip;
    if (!tr) return;
    const I = T.inseln;
    const goal = tr.target ? (this.data.visited.includes(tr.target) ? I.namenBekannt : I.namen)[tr.target] : I.heim;
    const w = 180;
    const h = 32;
    const x = Math.round((ui.width - w) / 2);
    const y = ui.height - h - 10;
    ui.panel(x, y, w, h);
    ui.textCentered(goal, x + w / 2, y + 4, COLORS.text);
    ui.textCentered(I.anlegen, x + w / 2, y + h - 13, COLORS.textDim);
  }

  /** Für die Prüfung. */
  info() {
    const a = this.game.arrival;
    return {
      data: JSON.parse(JSON.stringify(this.data)),
      at: this.at,
      boatAt: this.boatAt,
      trip: this.trip ? { target: this.trip.target, t: this.trip.t, dur: this.trip.dur } : null,
      boat: { x: a.pose.x, z: a.pose.z, heading: this.heading },
      blocked: this.blocked(),
      mapIsle: this.game.world.map.isle ?? null,
      cozyCat: this.data.cat ? CAT.cozy : 0,
      landings: Object.fromEntries(Object.keys(ISLES).map((id) => [id, this.landing(id)])),
    };
  }
}
