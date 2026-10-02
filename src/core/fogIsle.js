// Die Insel im Nebel (N7, OFFENE-FRAGEN 194): Wer die Spur kennt (Eddas Funkbuch im Zelt der
// Nordinsel oder die dritte Flaschenpost), hört ab dem nächsten Morgen von 07:00 bis 09:30
// von Nordosten eine Schiffsglocke. Am Boot heißt es dann »Der Glocke nach«: Mika rudert
// zwischen den Felsinseln hinaus in den Seenebel und lenkt dort selbst (WASD) – immer dem
// Klang nach. Auf der Insel warten Marthe und ihre Kinder Pim und Lu; ihr Kahn leckt. Mit
// Nägeln (Werkbank) und Zucker (Balduin oder Hilde) flickt Marthe ihn, am nächsten Morgen
// kommen die drei in die Bucht: Marthe stellt am Steg eine Reuse auf, die Kinder spielen im
// Hof. Sie sind keine Bewohner mit Platz (wie Edda): Sie schlafen in ihrem Kahn.

import { FOG_ISLE, FOG_SPOTS, BELL, FOG_TRIP, SEA_FOG, MEND, BAY_SPOTS, TRAP, FOG_PEOPLE, bellRings, fogIsleEdge } from '../data/fogIsle.js';
import { TRIP, PAGE_ORDER, pagesRead } from '../data/isles.js';
import { buildRoute, routeAt } from './arrival.js';
import { ARRIVAL } from '../data/arrival.js';
import { canAfford, pay, gain } from './inventory.js';
import { hash3 } from './rng.js';
import { T } from '../data/texts.js';
import { COLORS } from '../ui/ui.js';
import { drawIcon } from '../ui/icons.js';

const smooth = (u) => u * u * (3 - 2 * u);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const FOG_WHITE = '#dde2e8';
const FADE_IN = 0.9; // s: zurück am Steg weicht das Nebelweiß

export class FogIsle {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.trip = null; // Nebelfahrt { phase, t, … }
    this.at = false; // Mika steht auf der Nebelinsel
    this.bellT = 0; // bis zum nächsten Doppelschlag (s)
    this.strokes = 0; // Schläge seit dem Start (Prüfung)
    this.markT = 0; // die Glocken-Marke am Rand (s)
    this.swing = 0; // die Glocke schwingt (s)
    this.clueT = 0;
    this.greet = null; // Marthe kommt zum Anleger (erste Ankunft)
    this.glide = null; // der Kahn fährt in die Bucht (Ankunft)
    this.play = { pim: { t: 0.5, k: 0 }, lu: { t: 2, k: 2 } }; // Kinder im Hof
    this.said = new Set(); // Gedanken auf der Fahrt (je Fahrt einmal)
    this.boatInteraction = { id: 'nebelboot', x: FOG_SPOTS.shore.x, z: FOG_SPOTS.shore.z, radius: 1.0, prompt: 'zurueckRudern', fogBoat: true, enabled: false };
    this.people = FOG_PEOPLE.map((id) => ({ id: `npc-${id}`, x: 0, z: 0, radius: 1.35, prompt: 'ansprechen', npc: id, enabled: false }));
    this.lastLost = null; // Prüfung: warum die letzte Fahrt verloren ging
    this.fadeIn = 0; // nach der Fahrt: das Nebelweiß weicht (s)
    this.baySwing = 0; // N8: die Glocke am Steg schwingt (s)
    this.bayRings = 0; // N8: wie oft sie geläutet hat (Prüfung)
  }

  get data() {
    return this.game.state.isles.fog;
  }

  get island() {
    return this.game.world.fogIsle;
  }

  /** Auf dem Weg zur Nebelinsel oder dort (Kamera nah, weit nach Osten). */
  get away() {
    return Boolean(this.trip || this.at);
  }

  /** Läutet die Glocke gerade (Stufe 1–2, 07:00–09:30, nicht am Tag, an dem sie verloren ging)? */
  rings() {
    return bellRings(this.game.state);
  }

  // --- Jeder Schritt -------------------------------------------------------------------

  /** Im Spiel (auch beim Rudern): Spur, Glocke, Menschen, Ankunft, Nebel. */
  update(dt) {
    const g = this.game;
    const d = this.data;
    this.clueT -= dt;
    if (this.clueT <= 0) {
      this.clueT = 1;
      this.checkClue();
    }
    const playing = g.mode === 'play' || g.mode === 'rudern' || g.mode === 'nebelfahrt';
    if (playing && this.rings() && !g.world.isInside(g.player.position.x, g.player.position.z)) {
      this.bellT -= dt;
      if (this.bellT <= 0) {
        this.bellT = BELL.every;
        this.strike();
      }
    } else this.bellT = Math.min(this.bellT, 0.8);
    this.markT = Math.max(0, this.markT - dt);
    this.fadeIn = Math.max(0, this.fadeIn - dt);
    this.swing = Math.max(0, this.swing - dt);
    this.island.bellPivot.rotation.z = Math.sin(this.swing * 9) * 0.22 * Math.min(1, this.swing);
    this.baySwing = Math.max(0, this.baySwing - dt);
    this.island.bayBellPivot.rotation.z = Math.sin(this.baySwing * 9) * 0.22 * Math.min(1, this.baySwing);
    if (g.mode === 'play') {
      this.tick();
      if (d.stage === 3 && g.state.time.day >= d.arrive && g.state.time.minute >= BELL.from && !this.glide && !this.away) this.startGlide();
    }
    if (this.greet) this.updateGreet(dt);
    if (this.glide) this.updateGlide(dt);
    else if (d.stage === 4) this.updateKids(dt);
    this.updatePeople();
    this.updateFog();
  }

  /** Die Spur: Zelt auf der Nordinsel (N6) oder die dritte Flaschenpost (M33). */
  checkClue() {
    const st = this.game.state;
    const d = this.data;
    if (d.stage !== 0) return;
    if (st.isles.found.includes('zelt') || (st.fishing?.bottles || 0) >= 3) {
      d.stage = 1;
      d.from = st.time.day + 1; // am nächsten Morgen läutet es
    }
  }

  /** Zwei Schläge aus Richtung der Insel – ein Stück vor Mika, leiser mit der Entfernung. */
  strike() {
    const g = this.game;
    const p = g.player.position;
    const b = FOG_SPOTS.bell;
    const dx = b.x - p.x;
    const dz = b.z - p.z;
    const dist = Math.hypot(dx, dz) || 1;
    const volume = Math.max(0.3, Math.min(1, 12 / dist));
    g.sound.play('nebelglocke', { x: p.x + (dx / dist) * 5, z: p.z + (dz / dist) * 5, volume });
    this.markT = BELL.mark;
    this.swing = 1.4;
    this.strokes++;
    // Beim ersten Mal erklärt Edda, was das ist (ist das Boot noch leck, auch das)
    if (g.mode === 'play' && !this.away) g.funk.once('nebelglocke', g.state.isles.boat ? T.funk.nebelglocke : T.funk.nebelglockeLeck);
  }

  /** Um 18:30 rudert Mika von der Nebelinsel zurück (nachts bleibt niemand draußen). */
  tick() {
    const g = this.game;
    if (this.at && g.state.time.minute >= FOG_TRIP.home) {
      g.hud.toast(T.inseln.spaet, 'angel', 4);
      this.leave();
    }
  }

  // --- Die Fahrt ------------------------------------------------------------------------

  /** »Der Glocke nach« (Dialog am Boot): hinaus in den Nebel. */
  start() {
    const g = this.game;
    const a = g.arrival;
    const pts = [[a.pose.x, a.pose.z], ...FOG_TRIP.route, [FOG_TRIP.start.x, FOG_TRIP.start.z]];
    const route = buildRoute(pts);
    this.trip = { phase: 'hinaus', route, t: 0, dur: Math.max(2, route.total / FOG_TRIP.auto), heading: Math.atan2(a.pose.dz, a.pose.dx), speed: 0, off: 0, time: 0, startDist: 0, wake: 0 };
    this.said.clear();
    this.data.trips++;
    g.isles.at = null;
    g.isles.boatAt = null;
    g.world.map.isle = null;
    g.builder?.cancel?.();
    g.player.seat(null);
    a.seatMika();
    g.mode = 'nebelfahrt';
    this.island.setShown(true);
    this.placePeople(true);
    g.applyView(false);
    g.sound.play('platsch', { volume: 0.4 });
    this.refresh();
    g.isles.refresh();
  }

  /** Jeder Schritt im Modus 'nebelfahrt' (die Uhr steht, die Fahrt kostet danach Zeit). */
  updateTrip(dt, input) {
    const tr = this.trip;
    if (!tr) return;
    const g = this.game;
    const a = g.arrival;
    tr.t += dt;
    let rowing = false;
    if (tr.phase === 'hinaus' || tr.phase === 'anlegen' || tr.phase === 'heim') {
      // Von selbst: der Strecke nach, das Boot dreht sich gemächlich in die Fahrtrichtung
      const u = Math.min(1, tr.t / tr.dur);
      routeAt(tr.route, tr.phase === 'anlegen' ? smooth(u) : u, a.pose);
      this.turnTo(Math.atan2(a.pose.dz, a.pose.dx), dt);
      rowing = u < 0.97;
      if (u >= 1) {
        if (tr.phase === 'hinaus') this.beginSearch();
        else if (tr.phase === 'anlegen') return this.landIsle();
      }
      if (tr.phase === 'heim' && tr.t >= tr.dur + FOG_TRIP.fade) return this.arriveHome(false);
    } else if (tr.phase === 'suchen') {
      if (input.pressed('menu')) {
        input.consume('menu');
        this.turnBack(false);
        return;
      }
      rowing = this.steer(dt, input);
    } else if (tr.phase === 'verloren') {
      // Das Boot treibt, das Weiß schluckt alles
      a.pose.z += FOG_TRIP.drift * dt;
      if (tr.t >= FOG_TRIP.fade + 0.8) return this.arriveHome(true);
    }
    a.pose.dx = Math.cos(tr.heading);
    a.pose.dz = Math.sin(tr.heading);
    a.placeBoat(0);
    if (rowing) a.stroke += dt * ARRIVAL.stroke;
    a.oars(a.stroke, rowing);
    a.seatMika();
    if (g.player.seated) g.player.seated.phase = a.stroke;
    g.player.idle(dt);
    tr.wake -= dt;
    if (rowing && tr.wake <= 0) {
      tr.wake = 0.35;
      g.effects.splat(a.pose.x - a.pose.dx * 1.1, 0.02, a.pose.z - a.pose.dz * 1.1, 'wasser', 3, 0.2);
    }
  }

  /** Bug langsam in eine Richtung drehen. */
  turnTo(want, dt) {
    const tr = this.trip;
    const diff = wrapAngle(want - tr.heading);
    const turn = FOG_TRIP.turn * dt;
    tr.heading = wrapAngle(tr.heading + Math.max(-turn, Math.min(turn, diff)));
  }

  /** Im Nebel: ab hier lenkt man selbst. */
  beginSearch() {
    const tr = this.trip;
    const a = this.game.arrival;
    tr.phase = 'suchen';
    tr.t = 0;
    tr.speed = FOG_TRIP.speed * 0.6;
    tr.startDist = Math.hypot(FOG_SPOTS.moor.x - a.pose.x, FOG_SPOTS.moor.z - a.pose.z);
    this.game.hud.say(T.nebel.grau, 4);
  }

  /** WASD wie beim Laufen: das Boot dreht sich dorthin und nimmt Fahrt auf; die Strömung treibt es. */
  steer(dt, input) {
    const g = this.game;
    const tr = this.trip;
    const a = g.arrival;
    const v = input.moveVector();
    const want = v.x || v.z ? Math.atan2(v.z, v.x) : null;
    if (want !== null) this.turnTo(want, dt);
    const align = want !== null ? Math.max(0, Math.cos(wrapAngle(want - tr.heading))) : 0;
    const target = FOG_TRIP.speed * align;
    const rate = (target > tr.speed ? FOG_TRIP.accel : FOG_TRIP.accel * 2) * dt;
    tr.speed += Math.max(-rate, Math.min(rate, target - tr.speed));
    let x = a.pose.x + Math.cos(tr.heading) * tr.speed * dt;
    let z = a.pose.z + Math.sin(tr.heading) * tr.speed * dt + FOG_TRIP.drift * dt;
    // Am Inselrand entlang gleiten (die Bootsmitte bleibt `hit` vor dem Ufer)
    for (let k = 0; k < 3; k++) {
      const f = FOG_TRIP.hit - fogIsleEdge(x, z);
      if (f <= 0) break;
      const e = 0.05;
      const gx = (fogIsleEdge(x + e, z) - fogIsleEdge(x - e, z)) / (2 * e);
      const gz = (fogIsleEdge(x, z + e) - fogIsleEdge(x, z - e)) / (2 * e);
      const g2 = gx * gx + gz * gz || 1;
      x += (gx / g2) * f;
      z += (gz / g2) * f;
    }
    a.pose.x = x;
    a.pose.z = z;
    tr.time += dt;
    // Kurs: zum Anleger unter der Glocke
    const m = FOG_SPOTS.moor;
    const dist = Math.hypot(m.x - x, m.z - z);
    const bearing = Math.atan2(m.z - z, m.x - x);
    const wrong = Math.abs(wrapAngle(bearing - tr.heading)) > FOG_TRIP.off;
    if (want === null) tr.off += dt * 0.5; // treiben lassen: langsam verloren
    else if (wrong && tr.speed > 0.3) tr.off += dt;
    else tr.off = Math.max(0, tr.off - dt * 2);
    tr.dist = dist;
    if (tr.off > 4 && !this.said.has('weg')) {
      this.said.add('weg');
      g.hud.say(T.nebel.wegVomKlang, 3);
    }
    if (dist < FOG_TRIP.land) this.approach();
    else if (tr.off > FOG_TRIP.lostAfter) this.lose('kurs');
    else if (tr.time > FOG_TRIP.maxTime) this.lose('zeit');
    else if (dist > tr.startDist + FOG_TRIP.away) this.lose('abgetrieben');
    return tr.speed > 0.25;
  }

  /** Nah am Anleger: die letzten Meter von selbst, der Bug zur Insel. */
  approach() {
    const tr = this.trip;
    const a = this.game.arrival;
    const m = FOG_SPOTS.moor;
    tr.route = buildRoute([[a.pose.x, a.pose.z], [m.x - 0.9, m.z], [m.x, m.z]]);
    tr.phase = 'anlegen';
    tr.t = 0;
    tr.dur = Math.max(1.2, tr.route.total / 1.4);
  }

  /** Die Glocke ist weg: treiben, Weiß, zurück am Steg (heute läutet sie nicht mehr). */
  lose(why) {
    const tr = this.trip;
    tr.phase = 'verloren';
    tr.t = 0;
    this.lastLost = why;
    this.game.hud.say(T.nebel.verloren, 5);
  }

  /** Esc im Nebel: umkehren (die Glocke läutet weiter – man kann es gleich noch einmal versuchen). */
  turnBack() {
    const tr = this.trip;
    const a = this.game.arrival;
    tr.phase = 'heim';
    tr.t = 0;
    tr.route = buildRoute([[a.pose.x, a.pose.z], [a.pose.x - 2.5, a.pose.z + 0.3], [a.pose.x - 5, a.pose.z + 0.4]]);
    tr.dur = 2.4;
    this.game.hud.say(T.nebel.umkehren, 3);
  }

  /** Angelegt: Mika steigt an Land. */
  landIsle() {
    const g = this.game;
    const a = g.arrival;
    const p = g.player;
    const d = this.data;
    this.trip = null;
    this.at = true;
    const m = FOG_SPOTS.moor;
    a.pose.x = m.x;
    a.pose.z = m.z;
    a.pose.dx = 1;
    a.pose.dz = 0;
    a.placeBoat(0);
    p.seat(null);
    a.oars(0, false);
    g.world.map.isle = 'nebel';
    p.place(FOG_SPOTS.shore.x, FOG_SPOTS.shore.z, Math.PI / 2); // Blick in die Insel
    g.pushPlayerOut();
    g.state.time.minute += FOG_TRIP.minutes;
    g.mode = 'play';
    g.useLockUntil = g.clock + 0.4;
    const first = d.stage <= 1;
    g.hud.say(first ? T.nebel.ankunft : T.nebel.wieder, 5);
    g.sound.play('schritt');
    this.placePeople(true);
    if (first) this.greet = { t: 0 }; // Marthe kommt herüber
    g.applyView(false);
    this.refresh();
    g.quietSave();
  }

  /** E am Boot auf der Nebelinsel: zurück in die Bucht. */
  leave() {
    const g = this.game;
    const a = g.arrival;
    this.at = false;
    this.greet = null;
    g.world.map.isle = null;
    this.trip = { phase: 'heim', route: buildRoute([[a.pose.x, a.pose.z], [a.pose.x - 2.5, a.pose.z + 0.4], [a.pose.x - 6, a.pose.z + 1.2]]), t: 0, dur: 3, heading: Math.atan2(a.pose.dz, a.pose.dx), speed: 0, off: 0, time: 0, startDist: 0, wake: 0 };
    g.builder?.cancel?.();
    g.player.seat(null);
    a.seatMika();
    g.mode = 'nebelfahrt';
    g.sound.play('platsch', { volume: 0.4 });
    this.refresh();
  }

  /** Zurück am Steg (nach dem Heimweg oder verloren). */
  arriveHome(lost) {
    const g = this.game;
    const a = g.arrival;
    const p = g.player;
    this.trip = null;
    this.at = false;
    g.world.map.isle = null;
    a.moor();
    g.isles.heading = Math.PI;
    p.seat(null);
    p.place(TRIP.dock.x, TRIP.dock.z, -Math.PI / 2);
    g.pushPlayerOut();
    g.state.time.minute += lost ? FOG_TRIP.lostMinutes : FOG_TRIP.minutes;
    if (lost) this.data.lost = g.state.time.day;
    this.fadeIn = FADE_IN;
    g.mode = 'play';
    g.useLockUntil = g.clock + 0.4;
    this.island.setShown(false);
    this.placePeople(true);
    g.applyView(false);
    g.isles.refresh();
    this.refresh();
    g.quietSave();
  }

  /** Nach dem Laden: Wer auf der Nebelinsel gespeichert hat, wacht am Steg auf (isles.apply). */
  apply() {
    this.trip = null;
    this.at = false;
    this.greet = null;
    this.glide = null;
    this.island.setShown(false);
    this.island.setBay(this.data.stage === 4);
    this.placePeople(true);
    this.refresh();
  }

  // --- Menschen ---------------------------------------------------------------------------

  /** Marthe und die Kinder: auf der Insel (bis der Kahn geflickt ist) oder in der Bucht. */
  placePeople(jump) {
    const g = this.game;
    const npcs = g.survivors.npcs;
    const d = this.data;
    const onIsle = this.away && d.stage >= 1 && d.stage <= 3;
    const inBay = d.stage === 4 && !this.glide && g.survivors.isOutsideTime() && !g.nights?.active;
    FOG_PEOPLE.forEach((id, k) => {
      if (!onIsle && !inBay && !this.glide) {
        if (npcs.list.has(id)) npcs.setVisible(id, false);
        return;
      }
      if (this.glide) return; // sitzen im Kahn (updateGlide)
      if (g.festival?.controls(id)) return; // A6: schnitzt gerade oder geht im Umzug mit
      const n = npcs.get(id, false);
      n.model.root.visible = true;
      n.sitTarget = 0;
      n.sit = 0;
      n.seatY = null;
      n.y = null;
      n.rush = 1;
      if (onIsle) {
        const s = FOG_SPOTS[id];
        n.restFacing = s.facing;
        if (jump) npcs.place(n, s.x, s.z, s.facing);
        return;
      }
      if (id === 'marthe') {
        const s = BAY_SPOTS.marthe;
        n.restFacing = s.facing;
        if (jump) npcs.place(n, s.x, s.z, s.facing);
        else npcs.walkTo(n, s.x, s.z);
      } else if (jump) {
        const [x, z] = BAY_SPOTS.play[(k * 2) % BAY_SPOTS.play.length];
        n.restFacing = 0;
        npcs.place(n, x, z, 0);
      }
    });
  }

  /** Einblendungen der drei an ihre Stelle, sichtbar nur, wer zu sehen ist. */
  updatePeople() {
    const npcs = this.game.survivors.npcs;
    const kite = this.game.kite;
    for (const it of this.people) {
      const n = npcs.list.get(it.npc);
      it.enabled = Boolean(n?.model.root.visible) && !this.glide && !this.trip;
      if (n) {
        it.x = n.x;
        it.z = n.z;
      }
      if (it.npc === 'pim') {
        // N9: Fliegt der Drachen, gibt Pim Mika die Leine
        it.kite = Boolean(kite?.canTake());
        it.prompt = it.kite ? 'drachenHalten' : 'ansprechen';
      }
    }
  }

  /** Erste Ankunft: Marthe kommt zum Anleger, dann spricht sie Mika an. */
  updateGreet(dt) {
    const g = this.game;
    const gr = this.greet;
    gr.t += dt;
    const n = g.survivors.npcs.list.get('marthe');
    if (!n || g.mode !== 'play') return;
    const p = g.player.position;
    if (gr.t < 0.1) g.survivors.npcs.walkTo(n, p.x + 1.2, p.z - 0.2);
    if (gr.t > 3 || Math.hypot(n.x - p.x, n.z - p.z) < 1.5) {
      this.greet = null;
      n.target = null;
      this.talk('marthe');
    }
  }

  /** Mit Marthe, Pim oder Lu reden (survivors.talk leitet hierher). */
  talk(id) {
    const g = this.game;
    const d = this.data;
    const inv = g.state.inventory;
    if (!this.at) {
      // N8: Beim ersten Gespräch in der Bucht gibt Marthe Mika die letzte Seite aus Eddas Funkbuch
      if (id === 'marthe' && d.stage === 4 && !d.page) {
        g.startDialog('martheSeite', () => {
          d.page = true;
          this.showPage(T.nebel.seite);
          g.quietSave();
        });
        return;
      }
      if (id === 'pim' && d.stage === 4 && g.kite?.talkPim()) return; // N9: Pims Drachen
      g.startDialog(`${id}Da`);
      return;
    }
    if (id !== 'marthe') {
      g.startDialog(`${id}Insel`);
      return;
    }
    if (d.stage <= 1) {
      g.startDialog('martheTreffen', (aktion) => {
        d.stage = 2; // der Auftrag: Nägel und Zucker
        this.backToWork();
        g.hud.toast(T.nebel.auftrag, 'naegel', 5);
        g.quietSave();
        if (aktion === 'gleich') g.startDialog('martheGleich');
      });
      return;
    }
    if (d.stage === 2 && canAfford(inv, MEND)) {
      g.startDialog('martheFlicken', () => {
        if (!pay(inv, MEND)) return;
        d.stage = 3;
        d.arrive = g.state.time.day + 1;
        g.sound.play('klopfen');
        g.effects.chips(FOG_SPOTS.kahn.x, 0.3, FOG_SPOTS.kahn.z, 'holz', 8);
        g.hud.toast(T.nebel.geflickt, null, 5);
        g.quietSave();
      });
      return;
    }
    g.startDialog(d.stage === 2 ? 'martheWarten' : 'martheBald');
  }

  /** N8: Eine Seite aus Eddas Funkbuch als Karte zeigen (wie im Zelt, N6). */
  showPage(text) {
    const g = this.game;
    g.deliveryCard.open([{ letter: 'edda', kind: 'notiz', name: T.inseln.notizVon, place: null, day: g.state.time.day, text }]);
    g.mode = 'lieferung';
    this.checkPages();
  }

  /** N8: Sind alle vier Seiten gelesen, meldet sich Edda (einmal). */
  checkPages() {
    if (pagesRead(this.game.state).length >= PAGE_ORDER.length) this.game.funk.once('funkbuch', T.funk.funkbuch);
  }

  /**
   * N8: Marthes Glocke am Steg: zwei Schläge. Läutet Mika (E), kommen Pim und Lu angerannt und
   * Knopf bellt; sie läutet auch, wenn Balduin anlegt.
   */
  ringBay(byMika) {
    const g = this.game;
    const b = BAY_SPOTS.bell;
    g.sound.play('nebelglocke', { x: b.x, z: b.z, volume: 0.9 });
    this.baySwing = 1.4;
    this.bayRings++;
    if (!byMika) return;
    const npcs = g.survivors.npcs;
    const p = g.player.position;
    const kids = ['pim', 'lu'].map((id) => npcs.list.get(id)).filter((n) => n?.model.root.visible);
    kids.forEach((n, k) => {
      npcs.walkTo(n, p.x + (k ? 0.8 : -0.8), p.z + 0.6);
      n.rush = 1.5;
      this.play[n.id].t = 6; // eine Weile bleiben sie bei Mika
    });
    g.survivors.alarmBark?.();
    const lines = T.nebel.glockeKinder;
    g.hud.say(kids.length ? lines[this.bayRings % lines.length] : T.nebel.glockeAllein, 3);
  }

  /** Nach dem ersten Gespräch geht Marthe zurück an ihren Kahn. */
  backToWork() {
    const n = this.game.survivors.npcs.list.get('marthe');
    if (!n || !this.at) return;
    const s = FOG_SPOTS.marthe;
    n.restFacing = s.facing;
    this.game.survivors.npcs.walkTo(n, s.x, s.z);
  }

  /** Hilde gibt Zucker für die Kinder (einmal, solange der Auftrag läuft). */
  hildeSugar() {
    const g = this.game;
    const d = this.data;
    if (d.stage !== 2 || d.hilde || (g.state.inventory.zucker || 0) >= MEND.zucker) return false;
    g.startDialog('hildeZucker', () => {
      d.hilde = true;
      gain(g.state.inventory, { zucker: 1 });
      g.sound.play('loot');
      g.quietSave();
    });
    return true;
  }

  /** Ankunft in der Bucht: Der geflickte Kahn gleitet aus dem Nebel an den Steg. */
  startGlide() {
    const g = this.game;
    const k = BAY_SPOTS.kahn;
    const from = BAY_SPOTS.arrive.from;
    const route = buildRoute([[from.x, from.z], [27, -1.2], [21.5, 1.9], [k.x + 2, k.z + 0.1], [k.x, k.z]]);
    this.glide = { t: 0, route, dur: BAY_SPOTS.arrive.time, pose: { x: 0, z: 0, dx: -1, dz: 0 } };
    this.island.glideKahn.visible = true;
    this.island.bay.visible = true;
    const npcs = g.survivors.npcs;
    for (const id of FOG_PEOPLE) {
      const n = npcs.get(id, false);
      n.model.root.visible = true;
      n.target = null;
      n.sit = 1;
      n.sitTarget = 1;
      n.seatY = 0.27;
      n.y = 0;
      n.gestures.length = 0;
    }
    this.updateGlide(0);
  }

  updateGlide(dt) {
    const g = this.game;
    const gl = this.glide;
    gl.t += dt;
    const u = Math.min(1, gl.t / gl.dur);
    const pose = routeAt(gl.route, 1 - (1 - u) * (1 - u), gl.pose);
    const heading = Math.atan2(pose.dz, pose.dx);
    const obj = this.island.glideKahn;
    const bob = Math.round(Math.sin(gl.t * 1.4) * 1.5) / 80;
    obj.position.set(pose.x, bob, pose.z);
    obj.rotation.y = u >= 1 ? 0 : -heading + Math.PI; // der Kahn fährt mit dem Heck (−x) voran
    const npcs = g.survivors.npcs;
    const cx = Math.cos(heading);
    const cz = Math.sin(heading);
    // Marthe rudert auf der Ducht, Pim sitzt vorn, Lu hinten
    for (const [id, off] of [['marthe', 0], ['pim', 0.75], ['lu', -0.75]]) {
      const n = npcs.list.get(id);
      if (!n) continue;
      n.x = pose.x + cx * off;
      n.z = pose.z + cz * off;
      n.y = bob;
      n.facing = Math.atan2(cx, cz) + (id === 'marthe' ? Math.PI : 0);
      n.restFacing = n.facing;
      npcs.sync(n);
    }
    if (u < 1) return;
    // Angelegt: aussteigen, Kahn fest am Steg
    this.glide = null;
    this.island.glideKahn.visible = false;
    this.island.setBay(true);
    this.data.stage = 4;
    this.refresh();
    for (const id of FOG_PEOPLE) {
      const n = npcs.list.get(id);
      n.sit = 0;
      n.sitTarget = 0;
      n.seatY = null;
      n.y = null;
      npcs.place(n, BAY_SPOTS.marthe.x + (id === 'marthe' ? 0 : id === 'pim' ? 0.7 : -0.7), BAY_SPOTS.marthe.z, 0);
    }
    this.placePeople(false);
    g.hud.toast(T.nebel.inDerBucht, null, 5);
    g.funk.say(T.funk.martheDa);
    g.quietSave();
  }

  /** Die Kinder spielen im Hof: laufen von Stelle zu Stelle, Lu hinter Pim her. */
  updateKids(dt) {
    const g = this.game;
    if (g.mode !== 'play') return;
    const npcs = g.survivors.npcs;
    for (const id of ['pim', 'lu']) {
      const n = npcs.list.get(id);
      if (!n?.model.root.visible || g.kite?.controls(id) || g.festival?.controls(id)) continue; // N9: beim Drachen lenkt kite.js die Kinder, A6: beim Kürbisfest das Fest
      const s = this.play[id];
      s.t -= dt;
      if (n.target) continue;
      // Wer noch auf dem Steg steht (nach der Ankunft), läuft erst den Steg entlang ans Ufer –
      // quer übers Wasser hielte ihn die Begrenzung auf dem Steg fest
      const dock = BAY_SPOTS.dockEnd;
      if (n.x > dock.x + 0.6 && n.z > -1.8 && n.z < -0.2) {
        npcs.walkTo(n, dock.x, dock.z + (id === 'lu' ? 0.3 : -0.3));
        n.rush = 1.35;
        s.t = 0;
        continue;
      }
      if (s.t > 0) continue;
      s.k = (s.k + 1 + (hash3(s.k, g.state.time.day, id.length, 5) < 0.3 ? 1 : 0)) % BAY_SPOTS.play.length;
      const [x, z] = BAY_SPOTS.play[s.k];
      if (id === 'lu') {
        const pim = npcs.list.get('pim');
        npcs.walkTo(n, pim ? pim.x - 0.6 : x, pim ? pim.z + 0.3 : z); // Fangen spielen
      } else npcs.walkTo(n, x, z);
      n.rush = 1.35;
      s.t = 2.5 + hash3(s.k, g.state.time.minute | 0, 3, 9) * 3;
    }
  }

  // --- Reuse ------------------------------------------------------------------------------

  /** E an der Reuse: jeden Morgen ein, zwei Fische für den Korb (Balduin nimmt sie, M33). */
  emptyTrap() {
    const g = this.game;
    const d = this.data;
    const day = g.state.time.day;
    if (d.trap === day) {
      g.hud.toast(T.nebel.reuseLeer, 'fisch', 3);
      return;
    }
    d.trap = day;
    const [lo, hi] = TRAP.fish;
    const n = lo + Math.floor(hash3(day, 7, 3, 11) * (hi - lo + 1));
    g.state.fishing.basket = (g.state.fishing.basket || 0) + n;
    g.sound.play('platsch', { volume: 0.5 });
    g.hud.toast(T.nebel.reuse(n), 'fisch', 4);
    g.quietSave();
  }

  // --- Welt und Bild ---------------------------------------------------------------------

  /** Einblendungen (world.fogInteractions): Boot, Menschen, Dinge auf der Insel, Reuse. */
  refresh() {
    const w = this.game.world;
    const isl = this.island;
    this.boatInteraction.enabled = this.at;
    for (const it of isl.interactions) it.enabled = this.at;
    isl.trapInteraction.enabled = this.data.stage === 4;
    isl.bellInteraction.enabled = this.data.stage === 4;
    isl.placeBayBell(w.heightAt(BAY_SPOTS.bell.x, BAY_SPOTS.bell.z)); // auf den Planken des Stegs
    this.updatePeople();
    w.fogInteractions = [this.boatInteraction, ...isl.interactions, isl.trapInteraction, isl.bellInteraction, ...this.people];
    w.refreshInteractions();
  }

  /** E an etwas auf der Insel: ein Gedanke. */
  look(key) {
    this.game.hud.say(T.nebel.ansehen[key], 4);
  }

  /** Seenebel: morgens ein Band im Nordosten, auf der Fahrt dicht, freie Sicht um Boot und Insel. */
  updateFog() {
    const g = this.game;
    const sea = this.island.sea;
    const color = g.world.weather.fog.uniforms.uColor.value;
    const a = g.arrival;
    const tr = this.trip;
    if (tr) {
      let clear = FOG_TRIP.clear;
      let isle = 0;
      if (tr.phase === 'suchen') {
        const m = FOG_SPOTS.moor;
        const bearing = Math.atan2(m.z - a.pose.z, m.x - a.pose.x);
        if (Math.abs(wrapAngle(bearing - tr.heading)) < 0.6) clear = FOG_TRIP.course;
        const edge = fogIsleEdge(a.pose.x, a.pose.z);
        isle = Math.max(0, Math.min(SEA_FOG.isle, (FOG_TRIP.reveal - edge) * 0.8));
      } else if (tr.phase === 'anlegen') isle = SEA_FOG.isle;
      else if (tr.phase === 'heim' && tr.t < 0.8) isle = SEA_FOG.isle * (1 - tr.t / 0.8);
      sea.set({ amount: 1, boat: a.pose, clear, isle, color });
      return;
    }
    if (this.at) {
      sea.set({ amount: 1, boat: g.player.position, clear: FOG_TRIP.onIsle, isle: SEA_FOG.isle, color }); // um Mika immer frei (auch am Boot)
      return;
    }
    // In der Bucht: solange die Glocke läutet, liegt draußen im Nordosten Nebel
    sea.set({ amount: this.rings() ? 0.85 : 0, color });
  }

  /** Oberfläche: Glocken-Marke am Rand, auf der Fahrt die Zeile unten und das Nebelweiß. */
  draw(ui) {
    const g = this.game;
    const tr = this.trip;
    if (this.markT > 0 && (g.mode === 'play' || g.mode === 'nebelfahrt' || g.mode === 'rudern') && !this.at && !g.viewInside) this.drawBellMark(ui);
    if (this.fadeIn > 0 && !tr) ui.ditherFill(this.fadeIn / FADE_IN, FOG_WHITE);
    if (!tr) return;
    if (tr.phase === 'suchen' || tr.phase === 'hinaus') {
      const w = 190;
      const h = 32;
      const x = Math.round((ui.width - w) / 2);
      const y = ui.height - h - 10;
      ui.panel(x, y, w, h);
      ui.textCentered(T.nebel.fahrt, x + w / 2, y + 4, COLORS.text);
      ui.textCentered(tr.phase === 'suchen' ? T.nebel.steuern : T.nebel.hinaus, x + w / 2, y + h - 13, COLORS.textDim);
    }
    // Nebelweiß beim Verlieren und am Ende des Heimwegs
    let fade = 0;
    if (tr.phase === 'verloren') fade = Math.min(1, tr.t / FOG_TRIP.fade);
    if (tr.phase === 'heim') fade = Math.max(0, Math.min(1, (tr.t - tr.dur + 0.4) / (FOG_TRIP.fade - 0.4)));
    if (fade > 0) ui.ditherFill(fade, FOG_WHITE);
  }

  /** Wo die Glocken-Marke am Rand steht (null: die Glocke ist im Bild). */
  markSpot(ui) {
    const g = this.game;
    const b = FOG_SPOTS.bell;
    const p = g.worldToUi(b.x, 1.5, b.z);
    if (p.x >= 0 && p.x < ui.width && p.y >= 0 && p.y < ui.height) return null;
    const safe = { x0: 18, x1: ui.width - 18, y0: 90, y1: ui.height - 64 };
    const sx = (safe.x0 + safe.x1) / 2;
    const sy = (safe.y0 + safe.y1) / 2;
    const dx = p.x - sx;
    const dy = p.y - sy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const k = Math.min((safe.x1 - sx) / Math.abs(ux || 1e-3), (safe.y1 - sy) / Math.abs(uy || 1e-3));
    return { x: Math.round(sx + ux * k), y: Math.round(sy + uy * k) };
  }

  /** Eine kleine Glocke am Rand, wo der Klang herkommt (die Insel liegt außerhalb des Bildes). */
  drawBellMark(ui) {
    const at = this.markSpot(ui);
    if (!at) return;
    const x = at.x;
    const y = at.y + (Math.floor(this.markT * 10) % 2 ? -1 : 0); // wackelt beim Läuten
    ui.rect(x - 8, y - 8, 16, 16, COLORS.outline);
    ui.rect(x - 7, y - 7, 14, 14, COLORS.fill);
    drawIcon(ui.ctx, 'glocke', x - 5, y - 5);
  }

  /** Zeile im Zielkasten, solange Marthe auf Nägel und Zucker wartet. */
  goal() {
    const d = this.data;
    if (d.stage !== 2) return null;
    const inv = this.game.state.inventory;
    const have = (inv.naegel >= MEND.naegel ? 1 : 0) + (inv.zucker >= MEND.zucker ? 1 : 0);
    return { id: 'nebel', text: have >= 2 ? T.nebel.zielZurueck : T.nebel.ziel, progress: `(${have}/2)` };
  }

  /** Für die Prüfung. */
  info() {
    const a = this.game.arrival;
    const npcs = this.game.survivors.npcs;
    const tr = this.trip;
    return {
      data: { ...this.data },
      rings: this.rings(),
      strokes: this.strokes,
      mark: this.markT > 0 && !this.at ? this.markSpot(this.game.ui) : null,
      at: this.at,
      away: this.away,
      mapIsle: this.game.world.map.isle ?? null,
      trip: tr ? { phase: tr.phase, t: tr.t, heading: tr.heading, speed: tr.speed, off: tr.off, dist: tr.dist ?? null, time: tr.time } : null,
      boat: { x: a.pose.x, z: a.pose.z },
      lost: this.lastLost,
      glide: this.glide ? { t: this.glide.t, dur: this.glide.dur } : null,
      islandShown: this.island.group.visible,
      bayShown: this.island.bay.visible,
      people: Object.fromEntries(FOG_PEOPLE.map((id) => {
        const n = npcs.list.get(id);
        return [id, n ? { x: n.x, z: n.z, visible: n.model.root.visible, child: n.model.child, sit: n.sit } : null];
      })),
      fog: { amount: this.island.sea.uniforms.uAmount.value, shown: this.island.sea.group.visible, isle: this.island.sea.uniforms.uIsle.value.z, clear: this.island.sea.uniforms.uBoat.value.z },
      moor: { ...FOG_SPOTS.moor },
      shore: { ...FOG_SPOTS.shore },
      center: { x: FOG_ISLE.x, z: FOG_ISLE.z },
      goal: this.goal(),
    };
  }
}
