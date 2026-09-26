// Die Spielfigur: Eingabe -> Bewegung mit Kollision -> Animation.

import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../core/math.js';
import { buildCharacter, MIKA } from './characters.js';

const LANTERN_RAISE = -1.3;

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
    this._lanternWorld = new THREE.Vector3();
  }

  place(x, z, facing = this.facing) {
    this.position.set(x, this.world.heightAt(x, z), z);
    this.velocity.set(0, 0, 0);
    this.facing = facing;
    this.syncObject();
  }

  /**
   * @param {number} dt
   * @param {{x:number, z:number}} move Eingaberichtung (Länge 0..1)
   * @param {boolean} run
   */
  update(dt, move, run) {
    this.time += dt;
    const speed = run ? this.config.runSpeed : this.config.walkSpeed;
    const len = Math.hypot(move.x, move.z);
    const dirX = len > 0 ? move.x / len : 0;
    const dirZ = len > 0 ? move.z / len : 0;
    const targetVX = dirX * speed * Math.min(1, len);
    const targetVZ = dirZ * speed * Math.min(1, len);
    const sharp = len > 0 ? 14 : 18;
    this.velocity.x = damp(this.velocity.x, targetVX, sharp, dt);
    this.velocity.z = damp(this.velocity.z, targetVZ, sharp, dt);

    const before = { x: this.position.x, z: this.position.z };
    this.world.colliders.move(this.position, this.velocity.x * dt, this.velocity.z * dt, this.config.radius);
    // Tatsächliche Geschwindigkeit nach der Kollision (für Animation und Kamera)
    if (dt > 0) {
      this.velocity.x = (this.position.x - before.x) / dt;
      this.velocity.z = (this.position.z - before.z) / dt;
    }
    this.position.y = damp(this.position.y, this.world.heightAt(this.position.x, this.position.z), 20, dt);

    const actual = Math.hypot(this.velocity.x, this.velocity.z);
    if (len > 0.1) this.facing = dampAngle(this.facing, Math.atan2(dirX, dirZ), 14, dt);
    this.moveAmount = damp(this.moveAmount, clamp(actual / this.config.walkSpeed, 0, 1.4), 12, dt);
    this.phase += dt * actual * 4.4;
    this.animate(dt);
    this.syncObject();
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

    p.legL.rotation.x = s * 0.75 * amt;
    p.legR.rotation.x = -s * 0.75 * amt;
    p.armL.rotation.x = -s * 0.6 * amt;
    p.armL.rotation.z = -0.05 - Math.sin(this.time * 2.1) * 0.03 * idle;
    p.body.position.y = Math.abs(Math.cos(this.phase)) * 0.035 * amt + Math.sin(this.time * 2.1) * 0.006 * idle;
    p.head.rotation.y = Math.sin(this.time * 0.35) * 0.18 * idle;
    p.head.rotation.z = Math.sin(this.phase) * 0.04 * amt;

    const lantern = this.character.lantern;
    lantern.group.visible = this.holdingLantern;
    if (this.holdingLantern) {
      this.lanternSwing = damp(this.lanternSwing, s * 0.25 * amt, 6, dt);
      p.armR.rotation.x = LANTERN_RAISE + s * 0.06 * amt;
      p.armR.rotation.z = 0.08;
      lantern.group.rotation.x = -LANTERN_RAISE - s * 0.06 * amt + this.lanternSwing;
      lantern.group.rotation.z = Math.sin(this.time * 1.7) * 0.05;
    } else {
      p.armR.rotation.x = s * 0.6 * amt;
      p.armR.rotation.z = 0.05 + Math.sin(this.time * 2.1) * 0.03 * idle;
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
