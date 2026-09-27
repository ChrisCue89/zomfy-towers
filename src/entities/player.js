// Die Spielfigur: Eingabe -> Bewegung mit Kollision -> Animation.
// Aktionen (Schwung mit Werkzeug, Durchsuchen) sperren kurz die Bewegung und
// lösen zu einem festen Zeitpunkt ihren Effekt aus (onHit).

import * as THREE from 'three';
import { clamp, damp, dampAngle, lerp } from '../core/math.js';
import { buildCharacter, MIKA } from './characters.js';
import { createSilhouetteMaterial } from '../render/materials.js';

const LANTERN_RAISE = -1.3;
export const FLINCH = 0.28; // Dauer des Zusammenzuckens
const SLIDE_LOOK = 0.7; // so weit schaut Mika seitlich voraus, wenn sie festhängt (m7-r1: 0,4 m – im Haus blieb man zu oft an Möbeln hängen)
const SLIDE_TURN = 1.15; // Richtung des Ausweichschritts (Bogenmaß zur Wunschrichtung)

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

export class Player {
  /**
   * @param {object} deps
   * @param {import('../world/world.js').World} deps.world
   * @param {object} deps.config CONFIG.player
   */
  constructor({ world, config }) {
    this.world = world;
    this.config = config;
    this.character = buildCharacter(MIKA, { occluder: false });
    this.object = this.character.root;
    this.object.name = 'Mika';
    // Hinter Verdeckungen (Haus, Bäume) bleibt Mika als warmer Umriss sichtbar
    const silhouette = createSilhouetteMaterial(0xffc86a, 0.8); // Mika hebt sich deutlich ab
    for (const name of ['legL', 'legR', 'torso', 'head', 'armL', 'armR']) {
      const mesh = this.character.parts[name].children.find((c) => c.isMesh);
      if (!mesh) continue;
      mesh.renderOrder = 2;
      const outline = new THREE.Mesh(mesh.geometry, silhouette);
      outline.userData.outline = true;
      outline.renderOrder = 1.75; // nach den Schlurfern: auch hinter einem Brummer bleibt Mika sichtbar
      mesh.add(outline);
    }

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.facing = 0; // 0 = Blick nach Süden (+z)
    this.phase = 0;
    this.time = 0;
    this.moveAmount = 0;
    this.holdingLantern = false;
    this.lanternLit = false;
    this.lanternSwing = 0;
    this.heldTool = null; // Werkzeug in der rechten Hand (aus der Schnellleiste)
    this.speedFactor = 1; // Aufwertung »Tempo«
    this.action = null;
    this.swingReadyAt = 0; // abgebrochenes Ausschwingen: nächster Schlag erst ab hier (this.time)
    this.flinch = 0; // Zusammenzucken nach einem Treffer (Sekunden)
    this.blinkAt = 2 + Math.random() * 3; // nächstes Blinzeln (this.time)
    this._probe = { x: 0, z: 0 };
    this._lanternWorld = new THREE.Vector3();
  }

  place(x, z, facing = this.facing) {
    this.position.set(x, this.world.heightAt(x, z), z);
    this.velocity.set(0, 0, 0);
    this.facing = facing;
    this.action = null;
    this.syncObject();
  }

  /**
   * Aktion starten.
   * @param {'swing'|'search'} kind
   * @param {{duration?:number, hitAt?:number, tool?:string|null, face?:{x:number,z:number}, onHit?:Function, onDone?:Function, onCancel?:Function, progress?:boolean, cancelable?:boolean}} options
   */
  startAction(kind, options = {}) {
    if (this.action) return false;
    const duration = options.duration ?? (kind === 'swing' ? 0.5 : 1.2);
    this.action = {
      kind,
      t: 0,
      duration,
      hitAt: options.hitAt ?? (kind === 'swing' ? 0.3 : duration * 0.85),
      hit: false,
      tool: options.tool ?? null,
      progress: options.progress || false, // Balken über dem Kopf (Durchsuchen, Ernten)
      dir: options.dir || null, // Ausweichrolle, Ausfallschritt: Richtung und Tempo
      speed: options.speed || 0,
      onHit: options.onHit || null,
      onDone: options.onDone || null,
      onCancel: options.onCancel || null,
      cancelable: options.cancelable ?? kind === 'search', // Loslaufen bricht ab
      freeAfterHit: options.freeAfterHit || false, // nach dem Treffer bricht Loslaufen den Rest ab
    };
    if (options.face) this.facing = Math.atan2(options.face.x - this.position.x, options.face.z - this.position.z);
    return true;
  }

  /**
   * Anderes Aussehen (Titelbild): Die Figur wird mit den neuen Farben noch einmal
   * gebaut, übernommen werden nur die Formen – Gelenke, Umrisse, Werkzeuge und
   * Laterne bleiben dieselben.
   */
  setLook(spec) {
    const fresh = buildCharacter(spec, { occluder: false });
    for (const name of ['legL', 'legR', 'torso', 'head', 'armL', 'armR']) {
      const oldMeshes = [];
      const newMeshes = [];
      this.character.parts[name].traverse((o) => o.isMesh && !o.userData.outline && oldMeshes.push(o));
      fresh.parts[name].traverse((o) => o.isMesh && newMeshes.push(o));
      oldMeshes.forEach((mesh, k) => {
        const geo = newMeshes[k]?.geometry;
        if (!geo || geo === mesh.geometry) return;
        mesh.geometry.dispose();
        mesh.geometry = geo;
        for (const child of mesh.children) if (child.userData.outline) child.geometry = geo;
      });
    }
  }

  get busy() {
    return Boolean(this.action);
  }

  /** Darf der nächste Schlag beginnen (auch nach abgebrochenem Ausschwingen)? */
  get swingReady() {
    return !this.action && this.time >= this.swingReadyAt;
  }

  /**
   * @param {number} dt
   * @param {{x:number, z:number}} move Eingaberichtung (Länge 0..1)
   * @param {boolean} run
   */
  update(dt, move, run) {
    this.time += dt;
    const roll = this.action && this.action.kind === 'roll' ? this.action : null;
    // Ausfallschritt: ein Schwung mit Richtung geht bis zum Treffer ein Stück mit
    const lunge = this.action && this.action.kind === 'swing' && this.action.dir && this.action.t < this.action.hitAt ? this.action : null;
    if (this.action) {
      // Durchsuchen bricht ab, wenn man losläuft; Schwünge, Rollen und kurzes
      // Aufsammeln laufen zu Ende.
      const moving = Math.hypot(move.x, move.z) > 0.1;
      if (this.action.cancelable && moving) {
        const cancelled = this.action;
        this.action = null;
        if (cancelled.onCancel) cancelled.onCancel();
      } else if (this.action.freeAfterHit && this.action.hit && moving) {
        // Schlag sitzt: Wer jetzt losläuft, muss das Ausschwingen nicht abwarten
        // (m4-r1: im Getümmel »klebte« Mika nach jedem Schlag am Boden). Der
        // nächste Schlag kommt trotzdem erst im gewohnten Takt.
        this.swingReadyAt = this.time + (this.action.duration - this.action.t);
        this.action = null;
      } else move = { x: 0, z: 0 };
    }
    this.updateAction(dt);

    const speed = (run ? this.config.runSpeed : this.config.walkSpeed) * this.speedFactor;
    const len = Math.hypot(move.x, move.z);
    const dirX = len > 0 ? move.x / len : 0;
    const dirZ = len > 0 ? move.z / len : 0;
    const targetVX = dirX * speed * Math.min(1, len);
    const targetVZ = dirZ * speed * Math.min(1, len);
    const sharp = len > 0 ? 14 : 18;
    if (roll) {
      // Ausweichrolle: fester Schwung in eine Richtung, zum Ende hin langsamer
      const k = 1 - 0.5 * (roll.t / roll.duration);
      this.velocity.x = roll.dir.x * roll.speed * k;
      this.velocity.z = roll.dir.z * roll.speed * k;
      this.facing = Math.atan2(roll.dir.x, roll.dir.z);
    } else if (lunge) {
      this.velocity.x = lunge.dir.x * lunge.speed;
      this.velocity.z = lunge.dir.z * lunge.speed;
    } else if (this.action && this.action.kind === 'swing' && this.action.dir) {
      this.velocity.set(0, 0, 0); // nach dem Ausfallschritt fest stehen, nicht nachrutschen
    } else {
      this.velocity.x = damp(this.velocity.x, targetVX, sharp, dt);
      this.velocity.z = damp(this.velocity.z, targetVZ, sharp, dt);
    }

    const beforeX = this.position.x;
    const beforeZ = this.position.z;
    this.world.colliders.move(this.position, this.velocity.x * dt, this.velocity.z * dt, this.config.radius);
    if (len > 0.1 && !roll && !lunge) this.slideAround(beforeX, beforeZ, this.velocity.x * dt, this.velocity.z * dt);
    if (dt > 0) {
      this.velocity.x = (this.position.x - beforeX) / dt;
      this.velocity.z = (this.position.z - beforeZ) / dt;
    }
    this.position.y = damp(this.position.y, this.world.heightAt(this.position.x, this.position.z), 20, dt);

    const actual = Math.hypot(this.velocity.x, this.velocity.z);
    if (len > 0.1) this.facing = dampAngle(this.facing, Math.atan2(dirX, dirZ), 14, dt);
    this.moveAmount = damp(this.moveAmount, clamp(actual / this.config.walkSpeed, 0, 1.4), 12, dt);
    this.phase += dt * actual * 4.4;
    this.animate(dt);
    this.syncObject();
  }

  /**
   * Um Ecken gleiten: Hängt Mika an einer Kante oder einem runden Ding fest
   * (Tonne, Kiste, Tischecke), schaut sie kurz voraus, auf welcher Seite es
   * weitergeht, und macht den Schritt schräg dorthin (m3-r2). Vor einer langen
   * Wand und in echten Ecken bleibt sie stehen – dort ist keine Seite frei.
   */
  slideAround(x0, z0, mx, mz) {
    const want = Math.hypot(mx, mz);
    if (want < 1e-4) return;
    const ux = mx / want;
    const uz = mz / want;
    const progress = (this.position.x - x0) * ux + (this.position.z - z0) * uz;
    if (progress > want * 0.4) return;
    const r = this.config.radius;
    const probe = this._probe;
    let side = 0;
    let best = SLIDE_LOOK * 0.3;
    for (const sign of [1, -1]) {
      probe.x = this.position.x;
      probe.z = this.position.z;
      this.world.colliders.move(probe, -uz * sign * SLIDE_LOOK, ux * sign * SLIDE_LOOK, r);
      const bx = probe.x;
      const bz = probe.z;
      this.world.colliders.move(probe, ux * SLIDE_LOOK, uz * SLIDE_LOOK, r);
      const p = (probe.x - bx) * ux + (probe.z - bz) * uz;
      if (p > best) {
        best = p;
        side = sign;
      }
    }
    if (!side) return;
    const c = Math.cos(SLIDE_TURN);
    const s = Math.sin(SLIDE_TURN) * side;
    this.world.colliders.move(this.position, (ux * c - uz * s) * want, (uz * c + ux * s) * want, r);
  }

  updateAction(dt) {
    const a = this.action;
    if (!a) return;
    a.t += dt;
    if (!a.hit && a.t >= a.hitAt) {
      a.hit = true;
      if (a.onHit) a.onHit();
    }
    if (a.t >= a.duration) {
      this.action = null;
      if (a.onDone) a.onDone();
    }
  }

  /** Stillstand (z. B. während Dialogen): nur Ruheanimation. */
  idle(dt) {
    this.time += dt;
    this.velocity.set(0, 0, 0);
    this.moveAmount = damp(this.moveAmount, 0, 10, dt);
    this.animate(dt);
    this.syncObject();
  }

  animate(dt) {
    const p = this.character.parts;
    const amt = this.moveAmount;
    const s = Math.sin(this.phase);
    const idle = 1 - clamp(amt, 0, 1);
    const a = this.action;

    const running = clamp((amt - 1) / 0.4, 0, 1);

    p.legL.rotation.x = s * 0.75 * amt;
    p.legR.rotation.x = -s * 0.75 * amt;
    p.body.position.y = Math.abs(Math.cos(this.phase)) * 0.035 * amt + Math.sin(this.time * 2.1) * 0.006 * idle;
    // Kopf: nickt im Schritt, schaut im Stehen langsam umher
    p.head.rotation.x = Math.sin(this.phase * 2) * 0.05 * Math.min(1, amt);
    p.head.rotation.y = Math.sin(this.time * 0.35) * 0.18 * idle;
    p.head.rotation.z = Math.sin(this.phase) * 0.04 * amt;
    // Beim Rennen etwas vorgebeugt
    p.body.rotation.x = running * 0.14;
    // Blinzeln: alle paar Sekunden für einen Augenblick die Lider zu
    if (p.eyelids) {
      if (this.time > this.blinkAt + 0.13) this.blinkAt = this.time + 2.2 + Math.random() * 3.5;
      p.eyelids.visible = this.time >= this.blinkAt;
    }
    // Getroffen: kurz zusammenzucken, Kopf nach hinten
    if (this.flinch > 0) {
      this.flinch = Math.max(0, this.flinch - dt);
      const q = Math.sin((this.flinch / FLINCH) * Math.PI);
      p.body.rotation.x -= q * 0.28;
      p.head.rotation.x -= q * 0.25;
    }
    if (a && a.kind === 'roll') {
      // Hechtsprung: tief nach vorn, Beine angezogen
      const q = Math.sin((a.t / a.duration) * Math.PI);
      p.body.rotation.x = q * 1.05;
      p.body.position.y = -q * 0.12;
      p.legL.rotation.x = -q * 1.1;
      p.legR.rotation.x = -q * 0.8;
    }

    // Rechte Hand: Werkzeug zeigen (Aktion hat Vorrang vor der Auswahl)
    const shownTool = a ? a.tool : this.heldTool;
    for (const [name, mesh] of Object.entries(this.character.tools)) mesh.visible = name === shownTool;

    // Rechter Arm
    if (a && a.kind === 'swing') {
      const q = a.t / a.duration;
      const hit = a.hitAt / a.duration;
      let angle;
      if (q < hit * 0.8) angle = lerp(-0.3, -2.7, easeOut(q / (hit * 0.8)));
      else if (q < hit) angle = lerp(-2.7, -0.4, (q - hit * 0.8) / (hit * 0.2));
      else angle = lerp(-0.4, -0.25, (q - hit) / (1 - hit));
      p.armR.rotation.x = angle;
      p.armR.rotation.z = 0.12;
      p.body.rotation.x = q > hit * 0.8 && q < hit + 0.15 ? 0.12 : 0;
    } else if (a && a.kind === 'search') {
      const w = Math.sin(a.t * 14);
      p.armR.rotation.x = -0.9 + w * 0.35;
      p.armR.rotation.z = 0.1;
      p.body.rotation.x = 0.28;
    } else {
      p.armR.rotation.x = (shownTool ? -0.35 : 0) + s * 0.6 * amt;
      p.armR.rotation.z = 0.05 + Math.sin(this.time * 2.1) * 0.03 * idle;
    }
    // Werkzeug in Ruhe schräg nach vorn getragen (sonst steckt es im Boden);
    // beim Schwung liegt es in der Verlängerung des Arms
    const carry = shownTool && !(a && (a.kind === 'swing' || a.kind === 'search')) ? -1.0 : 0;
    p.hand.rotation.x = damp(p.hand.rotation.x, carry, 14, dt);

    // Linker Arm: Laterne oder Schwingen
    const lantern = this.character.lantern;
    lantern.group.visible = this.holdingLantern;
    if (this.holdingLantern) {
      this.lanternSwing = damp(this.lanternSwing, s * 0.25 * amt, 6, dt);
      p.armL.rotation.x = LANTERN_RAISE + s * 0.06 * amt;
      p.armL.rotation.z = -0.08;
      lantern.group.rotation.x = -LANTERN_RAISE - s * 0.06 * amt + this.lanternSwing;
      lantern.group.rotation.z = Math.sin(this.time * 1.7) * 0.05;
    } else if (a && a.kind === 'search') {
      p.armL.rotation.x = -0.9 - Math.sin(a.t * 14) * 0.35;
      p.armL.rotation.z = -0.1;
    } else {
      p.armL.rotation.x = -s * 0.6 * amt;
      p.armL.rotation.z = -0.05 - Math.sin(this.time * 2.1) * 0.03 * idle;
    }
  }

  syncObject() {
    this.object.position.copy(this.position);
    this.object.rotation.y = this.facing;
  }

  /** Weltposition des Laternenglases (für das Licht). */
  lanternPosition() {
    this.object.updateMatrixWorld(true);
    return this.character.lantern.lightAnchor.getWorldPosition(this._lanternWorld);
  }

  get speed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }
}
