// Die Spielfigur: Eingabe -> Bewegung mit Kollision -> Animation.
// Aktionen (Schwung mit Werkzeug, Durchsuchen) sperren kurz die Bewegung und
// lösen zu einem festen Zeitpunkt ihren Effekt aus (onHit).

import * as THREE from 'three';
import { clamp, damp, dampAngle, lerp } from '../core/math.js';
import { buildCharacter, MIKA } from './characters.js';

const LANTERN_RAISE = -1.3;

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
   * @param {{duration?:number, hitAt?:number, tool?:string|null, face?:{x:number,z:number}, onHit?:Function, onDone?:Function}} options
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
      onHit: options.onHit || null,
      onDone: options.onDone || null,
      onCancel: options.onCancel || null,
    };
    if (options.face) this.facing = Math.atan2(options.face.x - this.position.x, options.face.z - this.position.z);
    return true;
  }

  get busy() {
    return Boolean(this.action);
  }

  /**
   * @param {number} dt
   * @param {{x:number, z:number}} move Eingaberichtung (Länge 0..1)
   * @param {boolean} run
   */
  update(dt, move, run) {
    this.time += dt;
    if (this.action) {
      // Durchsuchen bricht ab, wenn man losläuft; Schwünge laufen zu Ende.
      const moving = Math.hypot(move.x, move.z) > 0.1;
      if (this.action.kind === 'search' && moving) {
        const cancelled = this.action;
        this.action = null;
        if (cancelled.onCancel) cancelled.onCancel();
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
    this.velocity.x = damp(this.velocity.x, targetVX, sharp, dt);
    this.velocity.z = damp(this.velocity.z, targetVZ, sharp, dt);

    const beforeX = this.position.x;
    const beforeZ = this.position.z;
    this.world.colliders.move(this.position, this.velocity.x * dt, this.velocity.z * dt, this.config.radius);
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

    p.legL.rotation.x = s * 0.75 * amt;
    p.legR.rotation.x = -s * 0.75 * amt;
    p.body.position.y = Math.abs(Math.cos(this.phase)) * 0.035 * amt + Math.sin(this.time * 2.1) * 0.006 * idle;
    p.head.rotation.y = Math.sin(this.time * 0.35) * 0.18 * idle;
    p.head.rotation.z = Math.sin(this.phase) * 0.04 * amt;
    p.body.rotation.x = 0;

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
