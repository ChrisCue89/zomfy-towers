// Angeln am Steg (M33, OFFENE-FRAGEN 171, 192): die zweite Abendaktivität neben den Karten.
// Ein Abend, eine Aktivität: Wer mitkommt (oder Mika allein), sitzt an der Nordkante des
// Stegs. Die Uhr steht (Modus 'angeln'), danach ist der Abend um FISHING.minutes weiter.
//
//   bereit → laden (E gehalten: die Kraft pendelt) → wurf (die Pose fliegt) → warten
//   (Anstupser, dann der Biss) → biss (E im Fenster schlägt an) → drill (E halten schiebt den
//   Kescher nach rechts, loslassen nach links; im Kescher füllt sich der Fang) → fang (der
//   Fisch springt heraus, die Fangkarte) – oder weg. Nach FISHING.casts Würfen oder mit Esc
//   steht Mika auf.
//
// Die Werte stehen in data/fishing.js, das Bild (Leisten, Schnur, Karte) in ui/fishingView.js.

import * as THREE from 'three';
import { SPOT, FISHING, FISH, FISH_ORDER, BOTTLES, FRIEND_PERKS } from '../data/fishing.js';
import { buildBobber32, buildFishModel } from '../entities/fishingModels.js';
import { createWorldMaterial } from '../render/materials.js';
import { Rng } from './rng.js';
import { hoursOf } from './state.js';
import { T } from '../data/texts.js';

const U = 1 / 32;
const FLIGHT = 0.55; // s, bis die Pose landet
const JUMP = 0.65; // s, bis der Fang bei Mika ist

export class Fishing {
  /** @param {import('./game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.session = null;
    this.meshes = null; // Pose, Pose des Gegenübers, springender Fang (erst beim ersten Mal)
    this.stats = { casts: 0, bites: 0, early: 0, caught: 0, lost: 0 }; // für die Prüfung
  }

  get data() {
    return this.game.state.fishing;
  }

  /** Warum Mika jetzt nicht angeln kann (`friend`: wer mitkommt) – null heißt: Es geht. */
  blocked(friend = null) {
    const g = this.game;
    const st = g.state;
    const d = this.data;
    if (!d.rod) return 'angel';
    if (g.nights?.active) return 'nacht';
    if (d.lastDay === st.time.day || st.cards?.lastDay === st.time.day) return 'heute'; // ein Abend, eine Aktivität
    const m = st.time.minute;
    if (m < FISHING.from || m > FISHING.until) return 'zeit';
    if (friend && !g.survivors.resident(friend)) return 'niemand';
    return null;
  }

  /** Die Pose und der springende Fang – einmal gebaut, danach nur versteckt. */
  ensureMeshes() {
    if (this.meshes) return this.meshes;
    const scene = this.game.scene;
    const material = createWorldMaterial({ selfLight: 0.45 });
    const bobberGeo = buildBobber32().toGeometry({ jitter: 0, seed: 3, size: U });
    const bobber = new THREE.Mesh(bobberGeo, material);
    const friendBobber = new THREE.Mesh(bobberGeo, material);
    for (const m of [bobber, friendBobber]) {
      m.visible = false;
      m.renderOrder = 1.6;
      scene.add(m);
    }
    const fish = new THREE.Group();
    fish.visible = false;
    scene.add(fish);
    this.meshes = { material, bobber, friendBobber, fish, fishMeshes: new Map() };
    return this.meshes;
  }

  /** Einladung angenommen (oder allein): hinsetzen, Angel in die Hand, die Kamera ans Wasser. */
  begin(friend = null) {
    const g = this.game;
    if (this.blocked(friend)) return false;
    const st = g.state;
    const d = this.data;
    const perk = (friend && FRIEND_PERKS[friend]) || {};
    const seed = ((st.world.mapSeed || 1) * 7919 + st.time.day * 104729 + d.evenings * 31 + 11) >>> 0;
    this.session = {
      friend,
      perk,
      casts: FISHING.casts + (perk.casts || 0),
      cast: 0,
      phase: 'bereit',
      t: 0,
      power: 0,
      powerDir: 1,
      rng: new Rng(seed),
      bob: { x: SPOT.mika.x, z: SPOT.mika.z - 2, y: 0, dip: 0 },
      from: null,
      to: null,
      wait: 0,
      nibbles: [],
      twitch: 0,
      fish: null,
      window: 0,
      drill: null,
      card: null,
      catches: [],
      chatAt: 5,
      said: [],
      message: null,
    };
    d.evenings++;
    d.lastDay = st.time.day;
    const m = this.ensureMeshes();
    g.builder?.cancel?.();
    g.player.seat(SPOT.mika);
    g.player.fishingPose = { phase: 'bereit' };
    if (friend) {
      g.survivors.seatAt(friend, SPOT.friend);
      const n = g.survivors.npcs.list.get(friend);
      if (n) {
        g.survivors.npcs.hold(n, 'angel');
        n.fishing = true;
      }
      m.friendBobber.position.set(SPOT.friend.x + 0.25, 0, SPOT.friend.z - 2.6);
      m.friendBobber.visible = true;
    }
    g.world.fishLook = SPOT.look; // die Kamera schaut übers Wasser (lookSpot »angeln«)
    g.applyView(false); // nah heran (160 px/m)
    g.sound.play('platsch', { volume: 0.3 });
    g.mode = 'angeln';
    g.fishingView?.open(this.session);
    return true;
  }

  /** Jeder Schritt im Modus 'angeln' (die Uhr steht). */
  update(dt, input) {
    const s = this.session;
    if (!s) return;
    const g = this.game;
    s.t += dt;
    const pose = g.player.fishingPose;
    // Esc: aufstehen (die Fangkarte schließt erst)
    if (input.pressed('menu') && !s.card) {
      this.end();
      return;
    }
    switch (s.phase) {
      case 'bereit':
        if (input.isDown('use') && !s.card && g.clock >= (g.useLockUntil || 0)) this.setPhase('laden');
        break;
      case 'laden': {
        s.power += (dt / (FISHING.castTime / 2)) * s.powerDir;
        if (s.power >= 1) {
          s.power = 1;
          s.powerDir = -1;
        } else if (s.power <= 0) {
          s.power = 0;
          s.powerDir = 1;
        }
        if (!input.isDown('use')) this.throwCast();
        break;
      }
      case 'wurf':
        if (s.t >= FLIGHT) {
          s.bob.x = s.to.x;
          s.bob.z = s.to.z;
          g.effects.splat(s.bob.x, 0.05, s.bob.z, 'wasser', 8, 0.35);
          g.sound.play('platsch', { x: s.bob.x, z: s.bob.z, volume: 0.6 });
          this.startWaiting();
        }
        break;
      case 'warten':
        this.updateWaiting(dt, input);
        break;
      case 'biss':
        if (input.pressed('use')) {
          this.startDrill();
        } else if (s.t > s.window) {
          this.lose(T.angeln.verpasst);
        }
        break;
      case 'drill':
        this.updateDrill(dt, input);
        break;
      case 'fang':
        if (s.t >= JUMP && !s.card) this.showCard();
        if (s.card && s.t > JUMP + 0.35 && (input.pressed('use') || input.pressed('confirm') || input.mouse.clicked)) {
          input.consumeClick?.();
          s.card = null;
          this.meshes.fish.visible = false;
          this.nextCast();
        }
        break;
      case 'weg':
        if (s.t >= FISHING.lost) this.nextCast();
        break;
    }
    if (!this.session) return; // der letzte Wurf ist vorbei – Mika ist aufgestanden
    // Pose und Arme
    pose.phase = s.phase === 'warten' || s.phase === 'weg' ? 'bereit' : s.phase;
    pose.power = s.power;
    pose.t = s.t;
    pose.reel = s.phase === 'drill' && input.isDown('use');
    pose.pull = s.drill ? Math.min(1, Math.abs(s.drill.fv) * 1.6) : 0;
    this.updateMeshes(dt);
    this.chat(dt);
  }

  setPhase(phase) {
    const s = this.session;
    s.phase = phase;
    s.t = 0;
    if (phase === 'laden') {
      s.power = 0;
      s.powerDir = 1;
    }
  }

  /** Losgelassen: Die Pose fliegt so weit, wie die Kraft reicht. */
  throwCast() {
    const g = this.game;
    const s = this.session;
    s.cast++;
    this.stats.casts++;
    const dist = FISHING.near + (FISHING.far - FISHING.near) * s.power;
    const tip = this.rodTip();
    s.from = { x: tip.x, y: tip.y, z: tip.z };
    s.to = { x: SPOT.mika.x + s.rng.range(-0.35, 0.35), z: SPOT.mika.z - 0.3 - dist };
    s.castPower = s.power;
    g.sound.play('auswerfen');
    this.setPhase('wurf');
  }

  startWaiting() {
    const s = this.session;
    const [a, b] = FISHING.wait;
    s.wait = s.rng.range(a, b) * (s.perk.wait || 1);
    const n = s.rng.int(FISHING.nibbles[0], FISHING.nibbles[1]);
    s.nibbles = Array.from({ length: n }, () => s.rng.range(0.8, s.wait - 0.6)).sort((x, y) => x - y);
    s.twitch = 0;
    this.setPhase('warten');
  }

  updateWaiting(dt, input) {
    const g = this.game;
    const s = this.session;
    s.twitch = Math.max(0, s.twitch - dt);
    if (s.nibbles.length && s.t >= s.nibbles[0]) {
      s.nibbles.shift();
      s.twitch = 0.22; // ein Anstupser: die Pose zuckt
      g.effects.splat(s.bob.x, 0.03, s.bob.z, 'wasser', 3, 0.15);
      g.sound.play('tipp', { pitch: 300, volume: 0.5 });
    }
    if (input.pressed('use')) {
      // Zu früh angeschlagen: der Fisch ist fort, es dauert wieder ein bisschen
      this.stats.early++;
      this.say(T.angeln.zuFrueh);
      g.sound.play('platsch', { x: s.bob.x, z: s.bob.z, volume: 0.35 });
      s.wait = s.t + s.rng.range(2.2, 4.5);
      s.nibbles = [];
      return;
    }
    if (s.t >= s.wait) {
      // Der Biss: die Pose taucht ab
      s.fish = this.pickFish(s.castPower ?? 0.5);
      s.window = FISH[s.fish].window;
      this.stats.bites++;
      g.effects.splat(s.bob.x, 0.05, s.bob.z, 'wasser', 6, 0.3);
      g.sound.play('biss', { x: s.bob.x, z: s.bob.z });
      this.setPhase('biss');
    }
  }

  /** Wer beißt: nach Wurfweite, Uhrzeit (Aal ab 19 Uhr), Wetter; die Flaschenpost nur, solange noch Zettel treiben. */
  pickFish(power) {
    const g = this.game;
    const s = this.session;
    const h = hoursOf(g.state.time.minute);
    const w = g.world.weather?.kind || 'klar';
    const pool = [];
    let sum = 0;
    for (const id of FISH_ORDER) {
      const f = FISH[id];
      if ((f.far || 0) > power + 0.05) continue;
      if (f.evening && h < 19) continue;
      if (f.bottle && this.data.bottles >= BOTTLES) continue;
      let wgt = f.weight;
      if (f.weather) wgt *= f.weather.includes(w) ? 3 : 0.4;
      if (f.far) wgt *= 0.6 + power;
      pool.push([id, wgt]);
      sum += wgt;
    }
    let r = s.rng.next() * sum;
    for (const [id, wgt] of pool) {
      r -= wgt;
      if (r <= 0) return id;
    }
    return pool[0][0];
  }

  startDrill() {
    const g = this.game;
    const s = this.session;
    const f = FISH[s.fish];
    const D = FISHING.drill;
    const zone = D.zone + (s.perk.zone || 0) - f.wild * 0.06;
    s.drill = { zone, zx: 0.5 - zone / 2, zv: 0, fx: 0.5, fv: 0, target: s.rng.next(), retarget: 0, progress: D.start };
    g.sound.play('kurbel');
    this.setPhase('drill');
  }

  updateDrill(dt, input) {
    const g = this.game;
    const s = this.session;
    const d = s.drill;
    const D = FISHING.drill;
    const f = FISH[s.fish];
    // Der Kescher: gehaltenes E drückt nach rechts, sonst fällt er nach links
    d.zv += (input.isDown('use') ? D.push : -D.fall) * dt;
    d.zv = Math.max(-1.4, Math.min(1.4, d.zv));
    d.zx += d.zv * dt;
    if (d.zx < 0) {
      d.zx = 0;
      d.zv = -d.zv * D.bounce;
    } else if (d.zx > 1 - d.zone) {
      d.zx = 1 - d.zone;
      d.zv = -d.zv * D.bounce;
    }
    // Der Fisch: sucht sich immer wieder ein neues Ziel, wilde öfter und schneller
    d.retarget -= dt;
    if (d.retarget <= 0) {
      d.target = s.rng.next();
      d.retarget = s.rng.range(0.45, 1.3) * (1.1 - f.wild * 0.6);
      if (s.rng.chance(f.wild * 0.35)) d.target = d.fx < 0.5 ? s.rng.range(0.8, 1) : s.rng.range(0, 0.2); // ein Satz zur Seite
    }
    const speed = 0.22 + f.wild * 0.95;
    const want = Math.sign(d.target - d.fx) * Math.min(speed, Math.abs(d.target - d.fx) * 5);
    d.fv += (want - d.fv) * Math.min(1, dt * 7);
    d.fx = Math.max(0, Math.min(1, d.fx + d.fv * dt));
    // Im Kescher füllt sich der Fang, daneben rinnt er aus
    const inside = d.fx >= d.zx && d.fx <= d.zx + d.zone;
    d.inside = inside;
    d.progress += (inside ? D.fill : -D.drain * (0.6 + f.wild * 0.6)) * dt;
    if (inside && Math.floor(s.t * 6) !== Math.floor((s.t - dt) * 6)) g.sound.play('kurbel', { volume: 0.45 });
    if (d.progress >= 1) this.land();
    else if (d.progress <= 0) this.lose(T.angeln.abgerissen);
  }

  /** Gefangen: Größe würfeln, der Fang springt aus dem Wasser zu Mika. */
  land() {
    const g = this.game;
    const s = this.session;
    const f = FISH[s.fish];
    let size = 0;
    if (f.size) {
      const k = s.rng.next() ** (1.6 - (s.castPower ?? 0.5) * 0.8);
      size = Math.round(f.size[0] + (f.size[1] - f.size[0]) * k);
    }
    s.caught = { id: s.fish, size };
    this.stats.caught++;
    s.drill = null;
    const m = this.meshes;
    // Der springende Fang (Größe in Voxeln aus Zentimetern, Stiefel und Flasche fest)
    const len = f.size ? Math.max(8, Math.round(size / 3.1)) : 12;
    const key = `${s.fish}:${len}`;
    let mesh = m.fishMeshes.get(key);
    if (!mesh) {
      mesh = new THREE.Mesh(buildFishModel(s.fish, len).toGeometry({ jitter: 0, seed: 5, size: U }), m.material);
      m.fishMeshes.set(key, mesh);
    }
    m.fish.clear();
    mesh.position.set(-len * U * 0.5, 0, 0);
    m.fish.add(mesh);
    m.fish.visible = true;
    s.from = { x: s.bob.x, y: 0, z: s.bob.z };
    g.effects.splat(s.bob.x, 0.1, s.bob.z, 'wasser', 14, 0.6);
    g.sound.play('platsch', { x: s.bob.x, z: s.bob.z, volume: 0.9 });
    this.setPhase('fang');
  }

  /** Die Fangkarte: was es ist, wie groß, neu oder Rekord; Flaschenpost mit Zettel. */
  showCard() {
    const g = this.game;
    const s = this.session;
    const d = this.data;
    const { id, size } = s.caught;
    const f = FISH[id];
    const rec = (d.caught[id] ||= { n: 0, best: 0 });
    const first = rec.n === 0;
    const record = !first && size > rec.best;
    rec.n++;
    rec.best = Math.max(rec.best, size);
    let note = null;
    if (f.bottle) {
      d.bottles = Math.min(BOTTLES, d.bottles + 1);
      note = T.angeln.flaschen[d.bottles - 1] || null;
    } else if (!f.junk) d.basket++;
    s.catches.push({ id, size });
    s.card = { id, size, first, record, note, friend: s.friend };
    g.sound.play(f.junk ? 'rumpeln' : 'fang');
    if (s.friend) this.friendSay(s.rng.pick(f.junk ? T.angeln.stiefelFreund : T.angeln.lob), 2.6);
    g.quietSave();
  }

  /** Entwischt oder verpasst: kurz warten, dann der nächste Wurf. */
  lose(text) {
    const g = this.game;
    const s = this.session;
    this.stats.lost++;
    s.drill = null;
    this.say(text);
    g.effects.splat(s.bob.x, 0.05, s.bob.z, 'wasser', 5, 0.25);
    this.setPhase('weg');
  }

  nextCast() {
    const s = this.session;
    if (s.cast >= s.casts) {
      this.end();
      return;
    }
    s.fish = null;
    s.castPower = null;
    this.setPhase('bereit');
    this.game.useLockUntil = this.game.clock + 0.25; // das E der Fangkarte wirft nicht gleich aus
  }

  /** Aufstehen: Angel weg, das Gegenüber steht auf, der Abend ist um. */
  end() {
    const g = this.game;
    const s = this.session;
    if (!s) return;
    this.session = null;
    const m = this.meshes;
    m.bobber.visible = false;
    m.friendBobber.visible = false;
    m.fish.visible = false;
    g.player.fishingPose = null;
    g.player.seat(null);
    if (s.friend) {
      const n = g.survivors.npcs.list.get(s.friend);
      if (n) {
        n.fishing = false;
        g.survivors.npcs.hold(n, null);
      }
      g.survivors.seatAt(s.friend, null);
      g.bonds?.add(s.friend, 'angeln'); // gemeinsame Zeit am Steg (M29)
    }
    g.world.fishLook = null;
    g.fishingView?.close();
    g.applyView(false);
    g.state.time.minute += FISHING.minutes; // die Uhr stand – jetzt ist der Abend weiter
    g.mode = 'play';
    g.useLockUntil = g.clock + 0.4;
    const fish = s.catches.filter((c) => FISH[c.id].size);
    g.hud.toast(fish.length ? T.angeln.abend(fish.length) : T.angeln.abendLeer, 'angel', 4);
    g.quietSave();
  }

  // --- Bild ----------------------------------------------------------------------------

  /** Weltstelle der Angelspitze (für Wurf und Schnur). */
  rodTip(out = new THREE.Vector3()) {
    if (this.game.people?.toolTip('mika', out)) return out; // F7: die Spitze im Bild des Sprites
    const tip = this.game.player.character.rodTip;
    if (!tip) return out.set(SPOT.mika.x, 1.2, SPOT.mika.z - 1.2);
    this.game.player.object.updateMatrixWorld(true);
    return tip.getWorldPosition(out);
  }

  /** Spitze der Angel des Gegenübers (oder null). */
  friendTip(out = new THREE.Vector3()) {
    const s = this.session;
    if (s?.friend && this.game.people?.toolTip(s.friend, out)) return out; // F7: im Sprite
    const n = s?.friend ? this.game.survivors.npcs.list.get(s.friend) : null;
    const tip = n?.model.parts.rodTip;
    if (!tip) return null;
    n.model.root.updateMatrixWorld(true);
    return tip.getWorldPosition(out);
  }

  updateMeshes(dt) {
    const s = this.session;
    const m = this.meshes;
    const time = this.game.clock;
    const bob = s.bob;
    // Pose: im Flug auf einer Bahn, auf dem Wasser wippend, beim Biss unter Wasser
    let shown = s.phase !== 'bereit' && s.phase !== 'laden' && s.phase !== 'fang';
    if (s.phase === 'wurf') {
      const q = Math.min(1, s.t / FLIGHT);
      bob.x = s.from.x + (s.to.x - s.from.x) * q;
      bob.z = s.from.z + (s.to.z - s.from.z) * q;
      bob.y = s.from.y * (1 - q) + Math.sin(q * Math.PI) * 1.1;
    } else if (s.phase === 'drill' && s.drill) {
      // der Fisch zieht die Pose hin und her, beim Einholen kommt sie näher
      bob.x += ((s.drill.fx - 0.5) * 1.2 + SPOT.mika.x - bob.x) * Math.min(1, dt * 2);
      const home = s.to.z + (SPOT.mika.z - 0.6 - s.to.z) * Math.max(0, s.drill.progress - 0.3) * 0.8;
      bob.z += (home - bob.z) * Math.min(1, dt * 2);
      bob.y = -0.06 + Math.sin(time * 13) * 0.015;
    } else if (s.phase === 'biss') bob.y = -0.09;
    else if (s.phase === 'weg') shown = s.t < 0.4;
    else bob.y = Math.sin(time * 2.2 + bob.x) * 0.012 - (s.twitch > 0 ? 0.05 : 0);
    m.bobber.visible = shown;
    m.bobber.position.set(Math.round(bob.x * 32) / 32, bob.y, Math.round(bob.z * 32) / 32);
    if (m.friendBobber.visible) m.friendBobber.position.y = Math.sin(time * 1.9 + 1.3) * 0.012;
    // Der Fang springt in einem Bogen zu Mika
    if (s.phase === 'fang' && m.fish.visible) {
      const q = Math.min(1, s.t / JUMP);
      const x = s.from.x + (SPOT.mika.x - s.from.x) * q;
      const z = s.from.z + (SPOT.mika.z - 0.35 - s.from.z) * q;
      m.fish.position.set(x, 0.1 + Math.sin(q * Math.PI) * 1.4 + q * 0.45, z);
      m.fish.rotation.z = q < 1 ? Math.sin(time * 20) * 0.35 : 0.25;
    }
  }

  // --- Plaudern -------------------------------------------------------------------------

  say(text) {
    const s = this.session;
    s.message = { text, t: 0 };
    this.game.hud.say(text, 2.2);
  }

  friendSay(text, dur = 3.2) {
    const s = this.session;
    const n = s?.friend ? this.game.survivors.npcs.list.get(s.friend) : null;
    if (n && text) this.game.hud.bubble(n, text, dur);
  }

  /** Wer mitkommt, erzählt zwischendurch etwas (nie zweimal dasselbe an einem Abend). */
  chat(dt) {
    const s = this.session;
    if (!s?.friend || s.phase !== 'warten') return;
    s.chatAt -= dt;
    if (s.chatAt > 0) return;
    s.chatAt = s.rng.range(7, 12);
    const lines = T.angeln.plaudern[s.friend] || T.angeln.plaudernAlle;
    const free = lines.filter((l) => !s.said.includes(l));
    if (!free.length) return;
    const line = free[s.rng.int(0, free.length - 1)];
    s.said.push(line);
    this.friendSay(line, 4);
  }

  /** Für die Prüfung. */
  info() {
    const s = this.session;
    return {
      data: JSON.parse(JSON.stringify(this.data)),
      blocked: this.blocked(),
      stats: { ...this.stats },
      session: s
        ? {
            friend: s.friend,
            phase: s.phase,
            t: s.t,
            cast: s.cast,
            casts: s.casts,
            power: s.power,
            fish: s.fish,
            wait: s.wait,
            nibbles: s.nibbles.length,
            window: s.window,
            drill: s.drill ? { ...s.drill } : null,
            card: s.card ? { ...s.card } : null,
            catches: s.catches.map((c) => ({ ...c })),
            bob: { ...s.bob },
          }
        : null,
    };
  }
}
