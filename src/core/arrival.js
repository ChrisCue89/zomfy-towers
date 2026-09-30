// Die Ankunft (N5, Probespiel 29.09.: »Das Intro muss liebevoll sein – unser Charakter
// kommt auf der Suche nach einem neuen Zuhause dahin«). Mika rudert im Morgennebel über
// den See (Wasser meiden die Schlurfer), legt nördlich am Steg an, geht über den Steg zum
// Haus – und auf der Bank knistert Eddas altes Funkgerät. Danach spricht Edda (Dialog
// »eddaErstkontakt«, mit Einführung zeigt sie dabei die Wege).
//
// Ablauf: karte (Titelkarte im Dunkel, Mikas Gedanken) → see (das Boot gleitet heran,
// die Kamera schwebt mit) → steg (Mika geht zum Haus) → funk (es knistert) → Dialog.
// Mit gehaltenem Esc ist alles bis zum Dialog vorbei. Das Boot bleibt danach am Steg.
// Texte stehen oben im schwarzen Balken (Kinobild), nie mitten im Bild.

import * as THREE from 'three';
import { T } from '../data/texts.js';
import { ARRIVAL, ARRIVAL_LINES } from '../data/arrival.js';
import { buildRowboat } from '../entities/traderModels.js';
import { COLORS } from '../ui/ui.js';
import { wrap, measure, drawText, LINE_HEIGHT } from '../ui/font.js';

/** Weicher Weg durch die Stützpunkte (Catmull-Rom), gleichmäßig nach Länge (N6: auch für die Inselfahrten). */
export function buildRoute(points) {
  const pts = [];
  const at = (i) => points[Math.max(0, Math.min(points.length - 1, i))];
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < 16; k++) {
      const t = k / 16;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
      pts.push({ x: f(p0[0], p1[0], p2[0], p3[0]), z: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  const last = points[points.length - 1];
  pts.push({ x: last[0], z: last[1] });
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  return { pts, len, total: len[len.length - 1] };
}

/** Stelle und Richtung auf dem Weg bei u (0..1). */
export function routeAt(route, u, out) {
  const target = Math.max(0, Math.min(1, u)) * route.total;
  let i = 1;
  while (i < route.len.length - 1 && route.len[i] < target) i++;
  const a = route.pts[i - 1];
  const b = route.pts[i];
  const f = (target - route.len[i - 1]) / (route.len[i] - route.len[i - 1] || 1);
  out.x = a.x + (b.x - a.x) * f;
  out.z = a.z + (b.z - a.z) * f;
  out.dx = b.x - a.x;
  out.dz = b.z - a.z;
  return out;
}

const ease = (u) => 1 - (1 - u) * (1 - u) * (1 - u); // gleitet aus

export class Arrival {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.phase = null; // karte · see · steg · funk – null: vorbei (oder nie gestartet)
    this.t = 0;
    this.hold = 0; // wie lange Esc schon gehalten wird
    this.focus = new THREE.Vector3();
    this.route = buildRoute(ARRIVAL.route);
    this.pose = { x: 0, z: 0, dx: -1, dz: 0 };
    this.walkIndex = 0;
    this.time = 0;
    this.stroke = 0; // Takt der Riemen (rad)
    this.boat = buildRowboat({ world: game.world.materials.occluder });
    game.scene.add(this.boat.root);
    this.moor();
  }

  get active() {
    return this.phase !== null;
  }

  /** Das Boot an seinen Platz nördlich am Steg (nach der Ankunft und in alten Ständen). */
  moor() {
    const m = ARRIVAL.moor;
    this.pose.x = m.x;
    this.pose.z = m.z;
    this.pose.dx = -1;
    this.pose.dz = 0;
    this.placeBoat(0);
    this.oars(0, false);
  }

  /** Die Ankunft beginnen (neues Spiel). */
  start() {
    const g = this.game;
    this.phase = 'karte';
    this.t = 0;
    this.hold = 0;
    this.stroke = 0;
    g.mode = 'ankunft';
    g.introRunning = true;
    g.builder.cancel?.();
    routeAt(this.route, 0, this.pose);
    this.placeBoat(0);
    this.seatMika();
    g.rig.jumpTo(this.pose.x, this.pose.z);
  }

  /** Mika auf die Ruderbank setzen (mit dem Gesicht in Fahrtrichtung). */
  seatMika() {
    const p = this.pose;
    const rowing = this.game.player.seated?.rowing ?? ARRIVAL.stroke;
    this.game.player.seat({ x: p.x, z: p.z, facing: Math.atan2(p.dx, p.dz), seatY: ARRIVAL.seatY, rowing });
    this.game.player.position.y = this.bob;
    this.game.player.syncObject();
  }

  /** Boot an die aktuelle Stelle; es schaukelt in ganzen Bildpunkten. */
  placeBoat(dt) {
    this.time += dt;
    const p = this.pose;
    const heading = Math.atan2(p.dz, -p.dx); // der Bug (−x) zeigt in Fahrtrichtung
    this.bob = Math.round(Math.sin(this.time * 1.3) * 1.5) / 80;
    this.boat.root.position.set(p.x, this.bob, p.z);
    this.boat.root.rotation.y = heading;
    return heading;
  }

  /**
   * Riemen: im Takt durchziehen oder ruhig an Bord liegen. Mika sitzt mit dem Gesicht
   * zum Bug und schiebt: Die Blätter gehen im Wasser nach achtern (sin fällt), beim
   * Vorholen heben sie sich (Kippen um die Längsachse, links und rechts gespiegelt).
   */
  oars(phase, rowing) {
    const [l, r] = this.boat.oars;
    if (!rowing) {
      l.rotation.set(-0.2, 0.95, 0);
      r.rotation.set(0.2, -0.95, 0);
      return;
    }
    const q = Math.sin(phase);
    const down = 0.38 - Math.max(0, Math.cos(phase)) * 0.25;
    l.rotation.set(-down, q * 0.55, 0);
    r.rotation.set(down, -q * 0.55, 0);
  }

  /**
   * @param {number} dt
   * @param {import('./input.js').Input} input
   */
  update(dt, input) {
    const g = this.game;
    if (!this.active) {
      this.placeBoat(dt); // am Steg: sanft schaukeln
      return;
    }
    this.t += dt;
    // Esc halten: alles bis zum Dialog überspringen
    if (input.isDown('menu')) this.hold += dt;
    else this.hold = 0;
    if (this.hold >= ARRIVAL.skipHold) {
      this.finish(true);
      return;
    }
    const player = g.player;
    if (this.phase === 'karte') {
      routeAt(this.route, 0, this.pose);
      this.placeBoat(dt);
      this.stroke += dt * ARRIVAL.stroke;
      this.oars(this.stroke, true);
      this.seatMika();
      player.seated.phase = this.stroke; // Hände und Riemen im selben Takt
      player.idle(dt);
      this.focus.set(this.pose.x, 0, this.pose.z);
      if (this.t >= ARRIVAL.card) this.next('see');
    } else if (this.phase === 'see') {
      const u = ease(Math.min(1, this.t / ARRIVAL.lake));
      const rowing = u < 0.97; // die letzten Meter gleitet es
      routeAt(this.route, u, this.pose);
      this.placeBoat(dt);
      if (rowing) this.stroke += dt * ARRIVAL.stroke;
      this.oars(this.stroke, rowing);
      this.seatMika();
      if (rowing) player.seated.phase = this.stroke;
      else player.seated.rowing = 0;
      player.idle(dt);
      this.focus.set(this.pose.x - 1.5, 0, this.pose.z);
      if (this.t >= ARRIVAL.lake + 0.6) {
        // Aussteigen: auf den Steg, das Boot liegt fest
        player.seat(null);
        const [x, z] = ARRIVAL.walkPath[0];
        player.place(x, z, -Math.PI / 2);
        this.moor();
        this.walkIndex = 1;
        g.sound.play('schritt');
        this.next('steg');
      }
    } else if (this.phase === 'steg') {
      this.placeBoat(dt);
      const target = ARRIVAL.walkPath[this.walkIndex];
      const p = player.position;
      const dx = target[0] - p.x;
      const dz = target[1] - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.25) this.walkIndex++;
      if (this.walkIndex >= ARRIVAL.walkPath.length || this.t >= ARRIVAL.walk) {
        const end = ARRIVAL.walkPath[ARRIVAL.walkPath.length - 1];
        if (this.walkIndex < ARRIVAL.walkPath.length) player.place(end[0], end[1], Math.PI); // hängt Mika fest, steht Mika gleich dort
        player.idle(dt);
        g.sound.play('funk');
        this.next('funk');
      } else {
        player.update(dt, { x: dx / d, z: dz / d }, false);
      }
      this.focus.set(p.x, 0, p.z);
    } else if (this.phase === 'funk') {
      this.placeBoat(dt);
      player.idle(dt);
      this.focus.set(player.position.x, 0, player.position.z);
      if (this.t >= ARRIVAL.crackle) this.finish(false);
    }
  }

  next(phase) {
    this.phase = phase;
    this.t = 0;
  }

  /** Vorbei (oder übersprungen): Mika steht vor dem Haus, das Boot liegt am Steg – Edda spricht. */
  finish(skipped) {
    const g = this.game;
    const player = g.player;
    player.seat(null);
    if (skipped || this.phase !== 'funk') {
      const end = ARRIVAL.walkPath[ARRIVAL.walkPath.length - 1];
      player.place(end[0], end[1], Math.PI);
      g.rig.jumpTo(end[0], end[1]);
    }
    this.moor();
    this.phase = null;
    this.hold = 0;
    g.mode = 'play';
    g.afterArrival();
  }

  /** Zeile(n) der aktuellen Phase: welche Gedanken schon zu sehen sind. */
  lines() {
    if (this.phase === 'karte') return T.ankunft.karte.filter((_, k) => this.t >= ARRIVAL_LINES.card[k]);
    if (this.phase === 'see') return T.ankunft.see.filter((_, k) => this.t >= ARRIVAL_LINES.lake[k]).slice(-1);
    if (this.phase === 'steg') return T.ankunft.steg.filter((_, k) => this.t >= ARRIVAL_LINES.walk[k]);
    if (this.phase === 'funk') return [T.ankunft.funk];
    return [];
  }

  /** @param {import('../ui/ui.js').UICanvas} ui */
  draw(ui) {
    if (!this.active) return;
    const ctx = ui.ctx;
    const card = this.phase === 'karte';
    const bar = Math.round(ui.height * ARRIVAL.bar);
    // Titelkarte: ganz dunkel, am Ende blendet sie gerastert auf; sonst Kinobalken oben und unten
    if (card) {
      const fade = Math.max(0, (this.t - (ARRIVAL.card - 1.2)) / 1.2);
      ui.ditherFill(1 - fade, COLORS.night);
    } else {
      ctx.fillStyle = COLORS.night;
      ctx.fillRect(0, 0, ui.width, bar);
      ctx.fillRect(0, ui.height - bar, ui.width, bar);
    }
    // Gedanken: oben (in der Karte im oberen Drittel), warm und deutlich, Buchstabe für Buchstabe
    const lines = this.lines();
    let y = card ? Math.round(ui.height * 0.3) : Math.round((bar - LINE_HEIGHT) / 2);
    lines.forEach((text, k) => {
      const since = this.phase === 'karte' ? this.t - ARRIVAL_LINES.card[k] : this.phase === 'see' ? this.t - ARRIVAL_LINES.lake[T.ankunft.see.indexOf(text)] : this.t - (ARRIVAL_LINES.walk[k] || 0);
      const shown = text.slice(0, Math.max(0, Math.floor(since * 40)));
      for (const line of wrap(shown, ui.width - 80)) {
        const x = Math.round((ui.width - measure(line)) / 2);
        drawText(ctx, line, x, y, card ? COLORS.textWarm : COLORS.text, { outline: COLORS.outline });
        y += LINE_HEIGHT;
      }
      y += card ? 8 : 2;
    });
    // Überspringen: klein unten rechts im Balken, mit einem Balken, solange Esc gehalten wird
    const hint = T.ankunft.ueberspringen;
    const hx = ui.width - measure(hint) - 8;
    const hy = ui.height - Math.round((bar + LINE_HEIGHT) / 2) - (card ? 6 : 0);
    drawText(ctx, hint, hx, hy, COLORS.textDim, { outline: COLORS.outline });
    if (this.hold > 0) {
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(hx, hy + LINE_HEIGHT, Math.round(measure(hint) * Math.min(1, this.hold / ARRIVAL.skipHold)), 1);
    }
  }
}
