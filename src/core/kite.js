// Drachenwetter (N9, OFFENE-FRAGEN 196): Pims Drachen. An einem windigen Tag wünscht sich Pim
// einen (Sprechblase, dann der Dialog); mit Stoff, Schnur (Fasern) und zwei Stöcken (Holz) baut
// Marthe ihn über Nacht, Lu malt Mieze darauf. Danach lassen die Kinder ihn an Wind- und klaren
// Tagen im Hof steigen: Pim hält die Spule, Lu rennt darunter herum, der Drachen steht im Wind
// über dem Strand. E bei Pim: Mika übernimmt die Leine (Modus 'drachen', die Uhr steht – wie beim
// Angeln). Kommt eine Böe, zählt mittendrin ein Zupfen (E): Der Drachen dreht einen Looping. Drei
// hintereinander sind eine Tat im Herbstbuch. Esc oder eine Richtungstaste gibt die Leine zurück.

import * as THREE from 'three';
import { KITE, KITE_NEED, kiteWeather } from '../data/kite.js';
import { KITE_TAIL_DROP, TAIL_POINTS, TAIL_BOWS, LINE_POINTS, buildKiteView } from '../entities/kiteModels.js';
import { canAfford, pay } from './inventory.js';
import { hash3 } from './rng.js';
import { T } from '../data/texts.js';
import { COLORS } from '../ui/ui.js';
import { measure } from '../ui/font.js';

const TAIL_SEG = 0.075; // m je Glied des Schwanzes
const smooth = (u) => u * u * (3 - 2 * u);
const LEAF = [0xd15d2c, 0xe8833a, 0xfac665, 0xb03e25];

export class Kite {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.view = buildKiteView({ world: game.world.materials.occluder });
    game.scene.add(this.view.root);
    this.t = 0;
    this.phase = null; // null | 'hin' (Pim geht an seinen Platz) | 'oben' | 'runter'
    this.phaseT = 0;
    this.air = 0; // 0 am Boden … 1 ganz oben
    this.holder = null; // 'pim' | 'mika'
    this.session = null; // Mika hält die Leine { t, streak, loops }
    this.gust = null; // laufende Böe { t, index, done, kids }
    this.gustIn = 3;
    this.gusts = 0;
    this.loopT = -1; // läuft ein Looping: 0…1
    this.dipT = 0; // gezupft ohne Böe: er sackt kurz weg
    this.pull = 0; // die Arme ziehen (klingt ab)
    this.roll = 0;
    this.pos = new THREE.Vector3(); // die Waage des Drachens
    this.anchor = new THREE.Vector3(); // wo die Schnur die Spule verlässt
    this.base = new THREE.Vector3(); // geglättete Spule (beim Übergeben kein Sprung)
    this.baseReady = false;
    this.lastX = 0;
    this.tail = Array.from({ length: TAIL_POINTS }, () => ({ p: new THREE.Vector3(), q: new THREE.Vector3() }));
    this.tailReady = false;
    this.wishDay = 0; // an diesem Tag hat Pim den Wunsch schon gesagt
    this.luT = 0; // bis Lu wieder woanders hinrennt
    this.loopsShown = 0; // Prüfung: gezählte Loopings (auch die der Kinder)
    this._v = new THREE.Vector3();
    this._w = new THREE.Vector3();
  }

  get data() {
    return this.game.state.isles.fog.kite;
  }

  npc(id) {
    return this.game.survivors.npcs.list.get(id) || null;
  }

  /** Wetter des Tages – fliegt er heute? (Werte je Wetter oder null) */
  weather() {
    return kiteWeather(this.game.world.weather.kind);
  }

  /** Steht ein Schlurfer in der Nähe? */
  zombieNear(x, z) {
    return this.game.horde.anyNear(x, z, KITE.near);
  }

  /** Dürfen die Kinder den Drachen gerade steigen lassen? */
  canFly() {
    const g = this.game;
    const st = g.state;
    if (this.data.stage < 3 || st.isles.fog.stage !== 4 || g.fogIsle.glide || g.nights?.active) return false;
    const m = st.time.minute;
    if (m < KITE.from || m > KITE.until || !this.weather()) return false;
    const pim = this.npc('pim');
    if (!pim?.model.root.visible) return false;
    return !this.zombieNear(KITE.spot.x, KITE.spot.z);
  }

  /** Lenkt der Drachen gerade die Kinder (fogIsle.updateKids lässt sie dann in Ruhe)? */
  controls(id) {
    return Boolean(this.phase) && (id === 'pim' || id === 'lu');
  }

  /** Kann Mika die Leine übernehmen (Einblendung »Drachen halten« an Pim)? */
  canTake() {
    return this.phase === 'oben' && this.holder === 'pim' && this.air > 0.9 && !this.session;
  }

  // --- Jeder Schritt ------------------------------------------------------------------------

  update(dt) {
    const g = this.game;
    this.t += dt;
    if (g.mode === 'play') this.checkStages();
    const want = Boolean(this.session) || this.canFly();
    this.phaseT += dt;
    if (want && !this.phase) this.begin();
    else if (!want && (this.phase === 'hin' || this.phase === 'oben')) this.land();
    if (this.phase === 'hin') this.updateWalk();
    if (this.phase === 'oben') this.air = Math.min(1, this.air + dt / KITE.rise);
    else if (this.phase === 'runter') {
      this.air = Math.max(0, this.air - dt / KITE.rise);
      if (this.air <= 0) this.finish();
    }
    if (!this.phase || this.phase === 'hin') {
      this.view.root.visible = false;
      return;
    }
    this.pull = Math.max(0, this.pull - dt * 3);
    this.dipT = Math.max(0, this.dipT - dt);
    if (this.loopT >= 0) {
      this.loopT += dt / KITE.loop;
      if (this.loopT >= 1) this.loopT = -1;
    }
    this.updateGusts(dt);
    this.place(dt);
    this.updateKids(dt);
  }

  /** Wunsch, Bauen über Nacht (nur im Spiel). */
  checkStages() {
    const g = this.game;
    const d = this.data;
    const st = g.state;
    if (d.stage === 2 && st.time.day > d.day) {
      // Marthe hat ihn über Nacht gebaut, Lu hat Mieze darauf gemalt
      d.stage = 3;
      g.hud.toast(T.drachen.fertig, null, 6);
      g.funk.once('drachen', T.funk.drachen);
      g.quietSave();
    }
    // Pim wünscht sich einen (einmal am Tag eine Sprechblase, wenn Mika vorbeikommt)
    if (d.stage === 0 && st.isles.fog.stage === 4 && this.wishDay !== st.time.day && this.wishOk()) {
      const pim = this.npc('pim');
      const p = g.player.position;
      if (pim?.model.root.visible && Math.hypot(pim.x - p.x, pim.z - p.z) < 3.5) {
        this.wishDay = st.time.day;
        g.hud.bubble(pim, this.game.world.weather.kind === 'wind' ? T.drachen.wunschBlase : T.drachen.wunschBlaseStill, 4);
      }
    }
  }

  /** Ein Windtag – oder drei Tage, nachdem die drei in der Bucht angekommen sind. */
  wishOk() {
    const st = this.game.state;
    return this.game.world.weather.kind === 'wind' || st.time.day >= (st.isles.fog.arrive || 0) + 3;
  }

  /** Pim geht an seinen Platz im Hof. */
  begin() {
    const g = this.game;
    const pim = this.npc('pim');
    if (!pim) return;
    this.phase = 'hin';
    this.phaseT = 0;
    this.holder = 'pim';
    g.survivors.npcs.walkTo(pim, KITE.spot.x, KITE.spot.z);
    pim.rush = 1.3;
  }

  /** Angekommen (oder lange genug gelaufen): die Spule in die Hand, der Drachen steigt. */
  updateWalk() {
    const pim = this.npc('pim');
    if (!pim) return;
    const there = Math.hypot(pim.x - KITE.spot.x, pim.z - KITE.spot.z) < 0.5;
    if (!(there && !pim.target) && this.phaseT < 6) return;
    pim.target = null;
    this.phase = 'oben';
    this.phaseT = 0;
    this.gustIn = 3;
    this.hold(pim);
    this.baseReady = false;
    this.tailReady = false;
  }

  /** Pim (oder Lu nie) hält die Spule. */
  hold(n) {
    const npcs = this.game.survivors.npcs;
    npcs.hold(n, 'spule');
    n.kite = { pull: 0 };
    n.skyward = false;
    n.restFacing = Math.PI / 2; // nach Osten, zum Drachen
  }

  /** Der Wind lässt nach, es wird Nachmittag, jemand kommt: einholen. */
  land() {
    if (this.session) this.release();
    this.phase = this.air > 0 ? 'runter' : null;
    this.phaseT = 0;
    this.gust = null;
    this.loopT = -1;
    if (!this.phase) this.finish();
  }

  /** Unten: die Spule weg, die Kinder spielen wieder. */
  finish() {
    const npcs = this.game.survivors.npcs;
    for (const id of ['pim', 'lu']) {
      const n = this.npc(id);
      if (!n) continue;
      n.kite = null;
      n.skyward = false;
      n.restFacing = 0;
      npcs.hold(n, null);
      if (this.game.fogIsle.play[id]) this.game.fogIsle.play[id].t = 0.5;
    }
    this.phase = null;
    this.holder = null;
    this.air = 0;
    this.view.root.visible = false;
  }

  // --- Böen und Loopings --------------------------------------------------------------------

  updateGusts(dt) {
    if (this.phase !== 'oben' || this.air < 0.95) return;
    if (this.gust) {
      const gu = this.gust;
      gu.t += dt;
      // Die Kinder schaffen allein ab und zu einen
      if (gu.kids && !gu.done && this.holder === 'pim' && gu.t >= KITE.gust / 2) {
        gu.done = true;
        this.startLoop(false);
      }
      if (gu.t >= KITE.gust) this.gust = null;
      return;
    }
    this.gustIn -= dt;
    if (this.gustIn <= 0) this.startGust();
  }

  /** Eine Böe: Laub fliegt, der Drachen zieht nach oben – mittendrin zählt ein Zupfen. */
  startGust() {
    const g = this.game;
    const w = this.weather() || KITE.weather.klar;
    this.gusts++;
    const day = g.state.time.day;
    this.gustIn = w.gusts[0] + hash3(this.gusts, day, 3, 17) * (w.gusts[1] - w.gusts[0]);
    this.gust = { t: 0, index: this.gusts, done: false, kids: this.holder === 'pim' && hash3(this.gusts, day, 9, 4) < KITE.kidsLoop };
    const p = g.player.position;
    const d = Math.hypot(this.pos.x - p.x, this.pos.z - p.z);
    if (d < 18) g.sound.play('boee', { x: this.pos.x, z: this.pos.z, volume: Math.min(1, 8 / Math.max(4, d)) });
    // Laub wirbelt zwischen Spule und Drachen im Wind mit
    const r = (k) => hash3(this.gusts, k, 5, 23);
    for (let k = 0; k < 10; k++) {
      const u = r(k);
      const c = LEAF[k % LEAF.length];
      g.world.particles.spawn({
        x: this.anchor.x - 2 + u * (this.pos.x - this.anchor.x + 2),
        y: 0.4 + r(k + 20) * 2.2,
        z: this.anchor.z - 1.2 + r(k + 40) * 2.4,
        vx: 2.6 + r(k + 60) * 1.8,
        vy: 0.6 + r(k + 80) * 0.9,
        vz: (r(k + 90) - 0.5) * 0.6,
        life: 3,
        size0: 4,
        size1: 4,
        color0: c,
        color1: c,
        alpha0: 1,
        alpha1: 1,
        drag: 0.6,
        lift: -0.4,
        round: 0,
        windFactor: 2,
        flutter: 5,
        phase: k,
        sway: 0.3,
        floor: 0.03,
        rest: 1,
      });
    }
  }

  /** Mitten in der Böe (dann zählt ein Zupfen)? */
  inWindow() {
    const gu = this.gust;
    return Boolean(gu && !gu.done && Math.abs(gu.t - KITE.gust / 2) <= KITE.window / 2);
  }

  /** Ein Looping: der Drachen dreht eine Schleife – die Kinder jubeln. */
  startLoop(byMika) {
    const g = this.game;
    this.loopT = 0;
    this.loopsShown++;
    g.sound.play('looping', { x: this.pos.x, z: this.pos.z });
    g.hud.popWord(this.pos.x, this.pos.y + 0.7, this.pos.z, T.drachen.looping, COLORS.gold);
    const pim = this.npc('pim');
    const lu = this.npc('lu');
    if (!byMika) {
      if (lu) g.hud.bubble(lu, T.drachen.kinderJubel[this.loopsShown % T.drachen.kinderJubel.length], 2);
      return;
    }
    const s = this.session;
    const n = s.streak;
    if (n === KITE.loops) {
      if (pim) g.hud.bubble(pim, T.drachen.drei, 3);
      if (lu) g.hud.bubble(lu, T.drachen.nochmal, 3);
    } else if (pim) g.hud.bubble(pim, T.drachen.zaehlen[Math.min(n, T.drachen.zaehlen.length) - 1], 1.8);
  }

  // --- Mika hält die Leine ------------------------------------------------------------------

  /** E an Pim: Mika übernimmt die Spule. */
  take() {
    const g = this.game;
    if (!this.canTake()) return;
    const p = g.player.position;
    if (this.zombieNear(p.x, p.z)) {
      g.hud.say(T.drachen.nichtJetzt, 3);
      return;
    }
    const pim = this.npc('pim');
    this.session = { t: 0, streak: 0, loops: 0 };
    this.holder = 'mika';
    this.data.flown++;
    g.player.place(p.x, p.z, Math.PI / 2); // der Blick nach Osten, zum Drachen
    g.player.kitePose = { pull: 0 };
    if (pim) {
      g.survivors.npcs.hold(pim, null);
      pim.kite = null;
      pim.skyward = true;
      pim.restFacing = Math.PI / 2;
      g.survivors.npcs.walkTo(pim, p.x - 0.75, p.z + 0.85);
      g.hud.bubble(pim, T.drachen.uebergeben, 2.6);
    }
    g.mode = 'drachen';
    // Die Kamera nimmt Mika und den Drachen ins Bild (der hängt rund fünf Meter hoch)
    g.world.kiteLook = this.lookAt(p, { x: 0, z: 0 });
    g.applyView(g.world.isInside(p.x, p.z));
  }

  /**
   * Blickpunkt zwischen Mika und dem Drachen im Bild: Ein Meter Höhe liegt 0,8/0,6 m weiter
   * oben als der Boden darunter; dazu ein halber Meter Luft über dem Drachen.
   */
  lookAt(p, out) {
    out.x = (p.x + this.pos.x) / 2;
    out.z = (p.z + this.pos.z - (4 / 3) * (this.pos.y + 0.5)) / 2;
    return out;
  }

  /** Im Modus 'drachen': Zupfen (E), Loslassen (Esc oder eine Richtungstaste). */
  updateSession(dt, input) {
    const s = this.session;
    if (!s) {
      this.game.mode = 'play';
      return;
    }
    s.t += dt;
    const p = this.game.player;
    p.kitePose.pull = this.pull;
    // Böe und Looping heben den Drachen ein Stück: der Blick folgt ihm weich (sonst stieß er oben an den Rand)
    const look = this.game.world.kiteLook;
    if (look) {
      const want = this.lookAt(p.position, this._look || (this._look = { x: 0, z: 0 }));
      const k = 1 - Math.exp(-dt * 1.5);
      look.x += (want.x - look.x) * k;
      look.z += (want.z - look.z) * k;
    }
    if (input.pressed('menu') || input.pressed('up') || input.pressed('down') || input.pressed('left') || input.pressed('right')) {
      this.release();
      return;
    }
    if (input.pressed('use') || input.mouse.clicked) this.tug();
  }

  /** Zupfen: mitten in der Böe ein Looping, sonst sackt er kurz weg (und die Reihe ist hin). */
  tug() {
    const g = this.game;
    const s = this.session;
    if (!s || this.loopT >= 0 || this.air < 0.9) return;
    this.pull = 1;
    if (this.inWindow()) {
      this.gust.done = true;
      s.streak++;
      s.loops++;
      const d = this.data;
      d.loops++;
      d.best = Math.max(d.best, s.streak);
      this.startLoop(true);
      return;
    }
    s.streak = 0;
    this.dipT = KITE.dip;
    g.sound.play('zupf', { x: this.pos.x, z: this.pos.z });
    const pim = this.npc('pim');
    if (pim) g.hud.bubble(pim, T.drachen.daneben[Math.floor(s.t) % T.drachen.daneben.length], 1.8);
  }

  /** Die Leine zurück an Pim; die Uhr läuft weiter (so viel Zeit ist vergangen). */
  release() {
    const g = this.game;
    const s = this.session;
    if (!s) return;
    this.session = null;
    g.player.kitePose = null;
    if (g.mode === 'drachen') g.mode = 'play';
    g.state.time.minute += KITE.minutes;
    g.useLockUntil = g.clock + 0.35;
    g.world.kiteLook = null;
    g.applyView(g.world.isInside(g.player.position.x, g.player.position.z));
    const pim = this.npc('pim');
    this.holder = 'pim';
    if (pim) {
      this.hold(pim);
      g.survivors.npcs.walkTo(pim, KITE.spot.x, KITE.spot.z);
      g.hud.bubble(pim, s.loops ? T.drachen.zurueckGut : T.drachen.zurueck, 2.6);
    }
    if (s.loops) g.hud.toast(T.drachen.bilanz(s.loops, this.data.best), null, 4);
    g.quietSave();
  }

  // --- Bild ---------------------------------------------------------------------------------

  /** Wo die Schnur gerade die Spule verlässt (Pim oder Mika). */
  spoolAt(out) {
    const g = this.game;
    if (this.holder === 'mika') {
      const tip = g.player.character.spoolTip;
      if (tip) {
        g.player.object.updateMatrixWorld(true);
        return tip.getWorldPosition(out);
      }
      const p = g.player.position;
      return out.set(p.x + 0.3, 1.0, p.z);
    }
    const pim = this.npc('pim');
    const tip = pim?.model.parts.spoolTip;
    if (tip && pim.model.parts.held?.spule?.visible) {
      pim.model.root.updateMatrixWorld(true);
      return tip.getWorldPosition(out);
    }
    return out.set((pim?.x ?? KITE.spot.x) + 0.2, 0.7, pim?.z ?? KITE.spot.z);
  }

  /** Drachen, Leine, Schwanz und Schleifen an ihre Stelle. */
  place(dt) {
    const w = this.weather() || KITE.weather.klar;
    const a = this.spoolAt(this.anchor);
    if (!this.baseReady) {
      this.base.copy(a);
      this.baseReady = true;
    } else this.base.lerp(a, 1 - Math.exp(-dt * 5));
    const air = smooth(this.air);
    const gu = this.gust ? Math.sin((Math.PI * this.gust.t) / KITE.gust) : 0;
    const L = w.line * (0.12 + 0.88 * air);
    const elev = w.elev + gu * 0.12 + Math.sin(this.t * 0.37) * 0.04;
    const reach = Math.cos(elev) * L;
    const pos = this.pos;
    pos.set(
      this.base.x + reach * KITE.wind.x + Math.sin(this.t * 0.5) * w.sway * air,
      this.base.y + Math.sin(elev) * L + (Math.sin(this.t * 1.05 + 0.7) * w.bob + gu * w.lift) * air - Math.sin((Math.PI * this.dipT) / KITE.dip) * 0.45,
      this.base.z + reach * KITE.wind.z + Math.sin(this.t * 0.31) * 0.25 * air
    );
    // Neigung: in die Bewegung, beim Wegsacken ein Wackeln, im Looping einmal ganz herum
    const vx = dt > 0 ? (pos.x - this.lastX) / dt : 0;
    this.lastX = pos.x;
    let roll = Math.max(-0.35, Math.min(0.35, -vx * 0.35)) + Math.sin(this.t * 3.1) * 0.05 * air + Math.sin(this.dipT * 18) * 0.25 * (this.dipT / KITE.dip);
    if (this.loopT >= 0) {
      const u = smooth(this.loopT);
      const ang = u * Math.PI * 2;
      pos.x += Math.sin(ang) * KITE.radius;
      pos.y += (1 - Math.cos(ang)) * KITE.radius;
      roll = -ang;
    }
    this.roll = roll;
    const v = this.view;
    v.root.visible = true;
    v.kite.position.copy(pos);
    v.kite.rotation.z = roll;
    this.drawLine(a, pos, gu);
    this.updateTail(dt, w === KITE.weather.wind ? 1 : 0.5);
  }

  /** Die Leine hängt leicht durch – in der Böe zieht sie sich straff. */
  drawLine(a, b, gust) {
    const arr = this.view.line.geometry.attributes.position;
    const sag = (0.28 - gust * 0.18) * Math.min(1, a.distanceTo(b) / 4);
    for (let i = 0; i < LINE_POINTS; i++) {
      const s = i / (LINE_POINTS - 1);
      arr.setXYZ(i, a.x + (b.x - a.x) * s, a.y + (b.y - a.y) * s - sag * 4 * s * (1 - s), a.z + (b.z - a.z) * s);
    }
    arr.needsUpdate = true;
  }

  /** Der Schwanz: eine Kette, die der Wind nach Osten streckt und in Wellen schlagen lässt. */
  updateTail(dt, windK) {
    const pts = this.tail;
    const c = Math.cos(this.roll);
    const s = Math.sin(this.roll);
    const tip = this._v.set(this.pos.x + KITE_TAIL_DROP * s, this.pos.y - KITE_TAIL_DROP * c, this.pos.z);
    if (!this.tailReady) {
      pts.forEach((P, i) => {
        P.p.set(tip.x + i * TAIL_SEG * 0.6, tip.y - i * TAIL_SEG * 0.8, tip.z);
        P.q.copy(P.p);
      });
      this.tailReady = true;
    }
    const h = Math.min(dt, 1 / 30);
    const gx = (1.8 + 2.4 * windK) * h * h;
    const gy = -3.4 * h * h;
    pts[0].p.copy(tip);
    pts[0].q.copy(tip);
    for (let i = 1; i < pts.length; i++) {
      const P = pts[i];
      const vx = (P.p.x - P.q.x) * 0.92;
      const vy = (P.p.y - P.q.y) * 0.92;
      P.q.copy(P.p);
      P.p.x += vx + gx;
      P.p.y += vy + gy + Math.sin(this.t * 9 - i * 0.7) * 0.0022 * windK;
      P.p.z = tip.z;
    }
    // Jedes Glied bleibt gleich lang hinter dem vorigen
    for (let i = 1; i < pts.length; i++) {
      const A = pts[i - 1].p;
      const B = pts[i].p;
      const d = this._w.subVectors(B, A);
      const len = d.length() || 1;
      B.copy(A).addScaledVector(d, TAIL_SEG / len);
    }
    const arr = this.view.tail.geometry.attributes.position;
    pts.forEach((P, i) => arr.setXYZ(i, P.p.x, P.p.y, P.p.z));
    arr.needsUpdate = true;
    TAIL_BOWS.forEach((k, j) => {
      const b = this.view.bows[j];
      const P = pts[k].p;
      const Q = pts[k - 1].p;
      b.position.set(P.x, P.y, P.z + 0.01);
      b.rotation.z = Math.atan2(P.y - Q.y, P.x - Q.x) + Math.PI / 2; // quer zur Schnur geknotet
    });
  }

  /** Die Kinder: Pim hält die Spule (oder steht neben Mika), Lu rennt unter dem Drachen herum. */
  updateKids(dt) {
    const g = this.game;
    const pim = this.npc('pim');
    const lu = this.npc('lu');
    if (pim?.kite) pim.kite.pull = this.pull + (this.gust ? Math.sin((Math.PI * this.gust.t) / KITE.gust) * 0.4 : 0);
    if (!lu || g.mode === 'dialog') return;
    this.luT -= dt;
    if (lu.target || this.luT > 0) {
      lu.skyward = !lu.target;
      return;
    }
    const k = Math.floor(this.t);
    const u = 0.25 + hash3(k, 3, 1, 7) * 0.55;
    const x = this.anchor.x + (this.pos.x - this.anchor.x) * u;
    const z = this.anchor.z - 1.4 + hash3(k, 5, 2, 9) * 2.8;
    g.survivors.npcs.walkTo(lu, Math.min(x, KITE.spot.x + 3.2), z);
    lu.rush = 1.4;
    lu.restFacing = Math.PI / 2;
    this.luT = 2.2 + hash3(k, 7, 3, 1) * 2.5;
  }

  /** Ring um den Drachen in der Böe und das kleine Feld unten (nur, wenn Mika hält). */
  draw(ui) {
    const s = this.session;
    if (!s) return;
    const g = this.game;
    const D = T.drachen;
    const gu = this.gust;
    if (gu && !gu.done && this.loopT < 0) {
      const at = g.worldToUi(this.pos.x, this.pos.y - 0.2, this.pos.z);
      const half = KITE.gust / 2;
      const k = Math.max(0, 1 - gu.t / half); // der Ring zieht sich bis zur Mitte der Böe zusammen
      const r = Math.round(7 + k * 18);
      const hot = this.inWindow();
      const c = ui.ctx;
      c.fillStyle = COLORS.outline;
      ringPixels(c, at.x, at.y, r + 1, 2);
      c.fillStyle = hot ? COLORS.gold : COLORS.text;
      ringPixels(c, at.x, at.y, r, 1);
      if (hot) ui.text('E', Math.round(at.x + r + 4), Math.round(at.y - 5), COLORS.gold, { outline: COLORS.outline });
    }
    const w = 220;
    const h = 32;
    const x = Math.round((ui.width - w) / 2);
    const y = ui.height - h - 10;
    ui.panel(x, y, w, h);
    const hint = this.loopT >= 0 ? D.hinweisLooping : gu && !gu.done ? (this.inWindow() ? D.hinweisJetzt : D.hinweisBoee) : D.hinweisWarten;
    ui.textCentered(hint, x + w / 2, y + 4, gu && this.inWindow() ? COLORS.gold : COLORS.text);
    const count = D.reihe(s.streak, KITE.loops);
    ui.text(count, x + 6, y + h - 13, s.streak >= KITE.loops ? COLORS.gold : COLORS.textDim);
    ui.text(D.loslassen, x + w - 6 - measure(D.loslassen), y + h - 13, COLORS.textDim);
  }

  /** Zeile im Zielkasten, solange Pim auf Stoff, Schnur und Stöcke wartet. */
  goal() {
    if (this.data.stage !== 1) return null;
    const inv = this.game.state.inventory;
    const have = Object.entries(KITE_NEED).filter(([k, n]) => (inv[k] || 0) >= n).length;
    const all = Object.keys(KITE_NEED).length;
    return { id: 'drachen', text: have >= all ? T.drachen.zielPim : T.drachen.ziel, progress: `(${have}/${all})` };
  }

  /** Mit Pim reden (fogIsle.talk fragt zuerst hier): Wunsch, Bringen, Warten. */
  talkPim() {
    const g = this.game;
    const d = this.data;
    const inv = g.state.inventory;
    if (d.stage === 0 && this.wishOk()) {
      g.startDialog(g.world.weather.kind === 'wind' ? 'pimDrachen' : 'pimDrachenStill', () => {
        d.stage = 1;
        g.hud.toast(T.drachen.auftrag, 'stoff', 5);
        g.quietSave();
      });
      return true;
    }
    if (d.stage === 1) {
      if (!canAfford(inv, KITE_NEED)) {
        g.startDialog('pimDrachenWarten');
        return true;
      }
      g.startDialog('pimDrachenGeben', () => {
        if (!pay(inv, KITE_NEED)) return;
        d.stage = 2;
        d.day = g.state.time.day;
        g.hud.toast(T.drachen.gebracht, null, 5);
        g.quietSave();
      });
      return true;
    }
    if (d.stage === 2) {
      g.startDialog('pimDrachenMorgen');
      return true;
    }
    return false;
  }

  /** Für die Prüfung. */
  info() {
    const v = (p) => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, z: Math.round(p.z * 100) / 100 });
    const pim = this.npc('pim');
    const lu = this.npc('lu');
    return {
      data: { ...this.data },
      phase: this.phase,
      air: Math.round(this.air * 100) / 100,
      holder: this.holder,
      visible: this.view.root.visible,
      pos: v(this.pos),
      anchor: v(this.anchor),
      roll: Math.round(this.roll * 100) / 100,
      tailEnd: v(this.tail[this.tail.length - 1].p),
      gust: this.gust ? { t: Math.round(this.gust.t * 100) / 100, done: this.gust.done, kids: this.gust.kids } : null,
      window: this.inWindow(),
      loopT: Math.round(this.loopT * 100) / 100,
      loops: this.loopsShown,
      session: this.session ? { ...this.session } : null,
      canFly: this.canFly(),
      canTake: this.canTake(),
      weather: this.game.world.weather.kind,
      goal: this.goal(),
      pim: pim ? { x: pim.x, z: pim.z, kite: Boolean(pim.kite), spool: Boolean(pim.model.parts.held?.spule?.visible) } : null,
      lu: lu ? { x: lu.x, z: lu.z } : null,
    };
  }

  /** Prüfung: gleich eine Böe. */
  gustNow() {
    this.gust = null;
    this.gustIn = 0;
  }
}

/** Ein Ring aus einzelnen Bildpunkten (Mittelpunkt-Kreis, `t` Pixel stark). */
function ringPixels(c, cx, cy, r, t) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  const steps = Math.max(12, Math.round(r * 6.3));
  for (let k = 0; k < steps; k++) {
    const a = (k / steps) * Math.PI * 2;
    c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.9), t, t);
  }
}
