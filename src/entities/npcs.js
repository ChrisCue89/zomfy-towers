// Darstellung der Überlebenden (Meilenstein 6): Figuren aus survivorModels.js
// (gleiches Rig wie Mika) und Knopf, der Hund. Nur Darstellung und Animation –
// wo jemand steht und ob er zu sehen ist, entscheidet core/survivors.js.

import * as THREE from 'three';
import { survivorParts32, bedrollModel } from './survivorModels.js';
import { armsModel } from './characters.js';
import { ROD_TIP } from './fishingModels.js';
import { SPOOL_TIP } from './kiteModels.js';
import { buildDog, poseDog } from './dogModel.js';
import { buildLampionStick, buildLampion, lampionColorOf, LAMPION_STICK } from '../world/festModels.js';
import { createWorldMaterial } from '../render/materials.js';
import { damp, dampAngle, clamp } from '../core/math.js';

const U = 1 / 32; // M13g: doppelt fein wie Mika – Gelenke der 1/16-Figur mal zwei
const WALK_SPEED = 1.6;

/**
 * Gelenke im Maß 1/32: je Teil [Gelenk, Ursprung des Modells]; `hip` ist die Höhe des
 * Hüftgelenks im Stehen (M28: Sitzen), `hand` die Hand unter der Schulter (M31: Waffe).
 * Kinder (N7) stehen auf kürzeren Beinen und einem kleineren Rumpf – der Kopf bleibt so
 * groß wie bei den Erwachsenen (sein Modell liegt weiter bei y 28, das Gelenk tiefer).
 */
const RIGS = {
  adult: { hip: 12, hand: -16, legL: [[-4, 12, 0], [-8, 0, -4]], legR: [[4, 12, 0], [0, 0, -4]], torso: [[0, 12, 0], [0, 0, 0]], head: [[0, 28, -4], [0, 0, 0]], armL: [[-14, 28, 0], [-16, 12, -4]], armR: [[14, 28, 0], [12, 12, -4]] },
  child: { hip: 7, hand: -10, legL: [[-4, 7, 0], [-8, 0, -4]], legR: [[4, 7, 0], [0, 0, -4]], torso: [[0, 7, 0], [0, 0, 0]], head: [[0, 18, -4], [0, -10, 0]], armL: [[-11, 17, 0], [-13, 7, -4]], armR: [[10, 17, 0], [8, 7, -4]] },
};

/** Menschliche Figur aus Teilen – Gelenke wie bei Mika (characters.js), Kinder kleiner (N7). */
function buildSurvivor(id, seed) {
  const parts = survivorParts32(id);
  const rig = parts.child ? RIGS.child : RIGS.adult;
  const material = createWorldMaterial({ selfLight: 0.3 });
  const geo = (model) => model.toGeometry({ jitter: 0.03, seed, size: U });
  const part = (model, joint, offset = [0, 0, 0]) => {
    const pivot = new THREE.Group();
    pivot.position.set(joint[0] * U, joint[1] * U, joint[2] * U);
    const mesh = new THREE.Mesh(geo(model), material);
    mesh.position.set((offset[0] - joint[0]) * U, (offset[1] - joint[1]) * U, (offset[2] - joint[2]) * U);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);
    return pivot;
  };
  const root = new THREE.Group();
  root.name = id;
  const body = new THREE.Group();
  root.add(body);
  const legL = part(parts.leg, ...rig.legL);
  const legR = part(parts.leg, ...rig.legR);
  root.add(legL, legR);
  const torso = part(parts.torso, ...rig.torso);
  const head = part(parts.head, ...rig.head);
  const armL = part(parts.arm, ...rig.armL);
  const armR = part(parts.armR || parts.arm, ...rig.armR); // Lu hält rechts einen Apfel
  body.add(torso, head, armL, armR);
  // Lider: Haut vor den Augen, meist versteckt
  const eyelids = new THREE.Mesh(geo(parts.lids), material);
  eyelids.position.set(0, -28 * U, 4 * U);
  eyelids.visible = false;
  head.add(eyelids);
  // Gesichtsplatten (M12): normal und lächelnd – Balduin grinst ohnehin immer
  let faces = null;
  if (parts.faces) {
    faces = {};
    for (const expr of ['normal', 'froh']) {
      const plate = new THREE.Mesh(geo(parts.faces[expr]), material);
      plate.position.set(0, -28 * U, 4 * U);
      plate.castShadow = true;
      plate.receiveShadow = true;
      plate.visible = expr === 'normal';
      head.add(plate);
      faces[expr] = plate;
    }
  }
  return { root, material, parts: { body, torso, head, armL, armR, legL, legR, eyelids, faces }, smileEyes: Boolean(parts.faces?.eyesClose), hip: rig.hip * U, hand: rig.hand * U, child: Boolean(parts.child) };
}

export class Npcs {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../world/world.js').World} world
   */
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.list = new Map(); // id -> Figur mit Zustand
    this.time = 0;
    this.group = new THREE.Group();
    this.group.name = 'Überlebende';
    scene.add(this.group);
  }

  /** Figur anlegen (einmal) und zurückgeben. */
  get(id, dog = false) {
    let n = this.list.get(id);
    if (n) return n;
    const model = dog ? buildDog({ seed: 11 }) : buildSurvivor(id, 17 + this.list.size);
    n = {
      id,
      dog,
      model,
      x: 0,
      z: 0,
      facing: 0,
      target: null, // Laufziel {x, z}
      phase: 0,
      moving: 0,
      blinkAt: 1 + Math.random() * 3,
      wave: 0, // Winken (Sekunden)
      gestures: [], // Gesten nacheinander (M10): { kind, dur, t }
      bark: 0, // Bellen (Sekunden)
      sit: 0,
      sitTarget: 0,
      drive: null, // m/s: Position setzt jemand anderes
      y: null, // Höhe, wenn sie nicht vom Boden kommt (Balduin im Boot)
      restFacing: null, // Blickrichtung im Stehen, wenn Mika weiter weg ist
      pull: null,
      near: false, // Mika steht nah dabei (dann lächeln sie, M12)
    };
    // N4: nach dem Nebel (1,5) zeichnen, vor Mikas Umriss (1,75) – sonst flackert der Nebel
    // an den Beinen, wenn jemand durch eine Nebelbank läuft
    model.root.traverse((o) => {
      if (o.isMesh) o.renderOrder = 1.6;
    });
    model.root.visible = false;
    this.group.add(model.root);
    this.list.set(id, n);
    return n;
  }

  /** Sofort an eine Stelle setzen. */
  place(n, x, z, facing = 0) {
    n.x = x;
    n.z = z;
    n.facing = facing;
    n.target = null;
    this.sync(n);
  }

  /** Zu (x, z) gehen; `free`: ohne Kollision (A1: die letzten Schritte auf eine Bank und herunter). */
  walkTo(n, x, z, free = false) {
    if (Math.hypot(n.x - x, n.z - z) < 0.05) return;
    n.target = { x, z, free };
  }

  sync(n) {
    const root = n.model.root;
    // M28: Wer sitzt, hat die Hüfte auf Sitzhöhe (seatY über dem Boden)
    const seat = !n.dog && n.seatY !== null && n.seatY !== undefined ? (n.seatY - n.model.hip) * n.sit : 0;
    root.position.set(n.x, (n.y ?? this.world.heightAt(n.x, n.z)) + seat, n.z);
    root.rotation.y = n.facing;
    // M31: zu Boden gegangen – liegt auf dem Rücken (nach der Lagerglocke), die Hüfte auf dem Boden
    root.rotation.x = n.lying ? -Math.PI / 2 : 0;
    if (n.lying) root.position.y += 0.12;
  }

  /**
   * @param {number} dt
   * @param {{x:number, z:number}} player
   */
  update(dt, player) {
    this.time += dt;
    const t = this.time;
    for (const n of this.list.values()) {
      if (!n.model.root.visible) continue;
      // Laufen: gerade Linie mit Kollision, am Ziel stehen bleiben
      let speed = 0;
      n.near = false;
      if (n.drive !== null) speed = n.drive;
      else if (n.target) {
        const dx = n.target.x - n.x;
        const dz = n.target.z - n.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.08) n.target = null;
        else {
          const step = Math.min(d, WALK_SPEED * (n.dog ? 1.3 : 1) * (n.rush || 1) * dt); // rush: Knopf auf den Pfiff (M16)
          const pos = { x: n.x, z: n.z };
          if (n.target.free) {
            pos.x += (dx / d) * step;
            pos.z += (dz / d) * step;
          } else this.world.colliders.move(pos, (dx / d) * step, (dz / d) * step, n.dog ? 0.2 : 0.25, { bounds: true });
          speed = Math.hypot(pos.x - n.x, pos.z - n.z) / Math.max(dt, 1e-4);
          if (speed < 0.05 && d > 0.3) n.target = null; // festgefahren: hier bleiben
          n.x = pos.x;
          n.z = pos.z;
          n.facing = dampAngle(n.facing, Math.atan2(dx, dz), 8, dt);
        }
      } else {
        // Stehend: Mika in der Nähe anschauen
        const px = player.x - n.x;
        const pz = player.z - n.z;
        n.near = px * px + pz * pz < 9;
        // Wer sitzt (Kartentisch, M28), bleibt dem Tisch zugewandt – sonst drehte sich das
        // Gegenüber zu Mika über Eck und zeigte der Kamera nur noch das Profil. Wer am Feuer
        // im Gespräch ist (M29), schaut sein Gegenüber an.
        const seated = (n.sitTarget > 0 || n.talking || n.kite) && n.restFacing !== null; // N9: wer den Drachen hält, schaut zum Drachen
        if (n.near && !seated) n.facing = dampAngle(n.facing, Math.atan2(px, pz), 4, dt);
        else if (n.restFacing !== null) n.facing = dampAngle(n.facing, n.restFacing, 3, dt);
      }
      n.moving = damp(n.moving, clamp(speed / WALK_SPEED, 0, 1), 10, dt);
      n.phase += dt * speed * 4.4;
      n.wave = Math.max(0, n.wave - dt);
      n.bark = Math.max(0, n.bark - dt);
      n.sit = damp(n.sit, n.sitTarget, 4, dt);
      if (n.dog) poseDog(n.model, { t, phase: n.phase, moving: n.moving, wag: n.target ? 0.6 : 1, sit: n.sit, bark: n.bark > 0 ? Math.abs(Math.sin(n.bark * 18)) : 0 });
      else this.poseHuman(n, dt, player);
      this.sync(n);
    }
  }

  poseHuman(n, dt, player = null) {
    const p = n.model.parts;
    const amt = n.moving;
    const s = Math.sin(n.phase);
    const idle = 1 - amt;
    p.legL.rotation.x = s * 0.7 * amt;
    p.legR.rotation.x = -s * 0.7 * amt;
    p.armL.rotation.x = -s * 0.55 * amt;
    p.armR.rotation.x = s * 0.55 * amt;
    p.body.position.y = Math.abs(Math.cos(n.phase)) * 0.03 * amt + Math.sin(this.time * 2 + n.x) * 0.005 * idle;
    p.head.rotation.x = Math.sin(n.phase * 2) * 0.05 * amt;
    p.head.rotation.y = Math.sin(this.time * 0.4 + n.z) * 0.15 * idle;
    // M28: Sitzen am Kartentisch – Beine nach vorn, Arme auf dem Tisch, die Karten in der Hand
    if (n.sit > 0.01) {
      const k = n.sit;
      p.legL.rotation.x = -1.5 * k;
      p.legR.rotation.x = -1.4 * k;
      p.armL.rotation.x = -0.95 * k;
      p.armR.rotation.x = -0.95 * k;
      p.body.position.y = Math.sin(this.time * 1.7 + n.x) * 0.004;
      // der Blick geht ab und zu hinüber zu Mika (Kopf, nicht der Körper)
      if (player) {
        const turn = Math.atan2(player.x - n.x, player.z - n.z) - n.facing;
        const want = Math.max(-0.45, Math.min(0.45, Math.atan2(Math.sin(turn), Math.cos(turn)))) * (0.5 + 0.5 * Math.sin(this.time * 0.35 + n.x));
        p.head.rotation.y = want * k;
      }
    }
    // Winken zur Begrüßung
    if (n.wave > 0) {
      p.armR.rotation.x = -2.6;
      p.armR.rotation.z = 0.25 + Math.sin(n.wave * 14) * 0.35;
    } else if (n.practice) {
      // M30: Übung – im Anschlag auf die Dosen (Rückstoß beim Schuss) oder ein Hieb auf die Strohpuppe
      const q = n.practice.t;
      if (n.practice.kind === 'schuss') {
        p.armR.rotation.x = -1.5 + Math.max(0, 1 - q / 0.1) * 0.35;
        p.armL.rotation.x = -1.3;
        p.armR.rotation.z = 0.2;
      } else {
        p.armR.rotation.x = q < 0.12 ? -2.6 : q < 0.3 ? -2.6 + ((q - 0.12) / 0.18) * 2.3 : -0.3 - Math.min(1, (q - 0.3) / 1.2) * 0.2;
        p.armR.rotation.z = 0.1;
      }
    } else {
      p.armR.rotation.z = damp(p.armR.rotation.z, 0, 8, dt);
    }
    p.armL.rotation.z = damp(p.armL.rotation.z, 0, 8, dt);
    p.head.rotation.z = damp(p.head.rotation.z, 0, 8, dt);
    if (n.fishing) {
      // M33: am Steg – die Angel schräg nach vorn oben, die linke Hand an der Kurbel
      p.armR.rotation.x = -2.05 + Math.sin(this.time * 0.9 + n.x) * 0.03;
      p.armR.rotation.z = 0.12;
      p.armL.rotation.x = -1.3;
      p.armL.rotation.z = -0.38;
    }
    if (n.kite) {
      // N9: den Drachen halten – beide Hände an der Spule vor der Brust; in der Böe ziehen sie mit
      const pull = n.kite.pull || 0;
      p.armR.rotation.x = -1.65 - pull * 0.4 + Math.sin(this.time * 1.3 + n.x) * 0.04;
      p.armR.rotation.z = 0.22;
      p.armL.rotation.x = -1.5 - pull * 0.35;
      p.armL.rotation.z = -0.32;
    }
    if (n.kite || n.skyward) p.head.rotation.x = -0.3; // der Blick geht hinauf zum Drachen
    if (n.lampion && p.lampion) {
      // A6: Laternenumzug – der Lampion am Stab vor sich, am Stegende hoch gehoben; er hängt
      // senkrecht unter der Spitze (gegen den Arm zurückgedreht) und pendelt im Schritt
      const raise = n.lampion.raise || 0;
      p.armL.rotation.x = -0.95 - raise * 0.85 + Math.sin(n.phase) * 0.05 * amt;
      p.armL.rotation.z = -0.1;
      p.lampion.hang.rotation.x = -p.armL.rotation.x + Math.sin(this.time * 2.1 + n.x) * 0.07 + Math.sin(n.phase) * 0.12 * amt;
      p.lampion.hang.rotation.z = 0.1;
    }
    if (n.chore?.anim && !n.wave) this.poseChore(n, p);
    this.poseGesture(n, dt);
    // Lächeln beim Winken, bei Gesten und wenn Mika dabeisteht (M12)
    const happy = n.wave > 0 || n.near || n.gestures.length > 0;
    if (p.faces) {
      p.faces.froh.visible = happy;
      p.faces.normal.visible = !happy;
    }
    if (this.time > n.blinkAt + 0.13) n.blinkAt = this.time + 2.5 + Math.random() * 3.5;
    p.eyelids.visible = this.time >= n.blinkAt && !(happy && n.model.smileEyes);
  }

  /**
   * A1: Das Tagwerk (core/chores.js) als Voxel-Haltung – grob wie die Sprites: die Arme vorn bei
   * der Handarbeit, der Hammer im Takt, die Hand über den Augen, der Kopf gesenkt beim Lesen.
   */
  poseChore(n, p) {
    const { anim, k } = n.chore;
    const t = this.time + n.x;
    const arms = (l, r, zl = 0, zr = 0) => {
      p.armL.rotation.x = l;
      p.armR.rotation.x = r;
      p.armL.rotation.z = zl;
      p.armR.rotation.z = zr;
    };
    if (anim === 'schwung') arms(-0.4, [-2.7, -1.4, -0.35, -0.6][k] ?? -0.5, 0, 0.1);
    else if (anim === 'haemmern') arms(-0.9, k ? -0.9 : -2.5, 0, k ? 0 : 0.25);
    else if (anim === 'schrauben') arms(-1.0, -1.35 - (k ? 0.25 : 0), 0, -0.1);
    else if (anim === 'giessen') arms(-0.2, k ? -0.75 : -0.95, 0, 0.1);
    else if (anim === 'spaehen') arms(-0.1, -2.7, 0, -0.55);
    else if (anim === 'funken') arms(-1.2, -2.6, -0.2, 0.75);
    else if (anim === 'musizieren') arms(-1.25, -1.25, k ? 0.2 : 0.45, k ? -0.2 : -0.45);
    else if (anim === 'ruehren') arms(-1.0, -1.1 + Math.sin(t * 7) * 0.12, -0.2, 0.15 * Math.cos(t * 7));
    else if (anim === 'pflanzen') arms(-0.75, -0.65 - (k ? 0.12 : 0), 0, 0);
    else arms(-1.05, -1.1 - (k ? 0.12 : 0), -0.15, 0.15); // stricken, lesen, netz, nähen, basteln
    if (anim !== 'spaehen' && anim !== 'funken') p.head.rotation.x = 0.28; // der Blick auf die Arbeit
  }

  /**
   * M31: eine Waffe aus dem Schrank in der rechten Hand (null: nichts) – dieselben Modelle wie bei
   * Mika, erst beim ersten Griff gebaut.
   */
  hold(n, id) {
    if (n.dog) return;
    const p = n.model.parts;
    if (!p.hand) {
      p.hand = new THREE.Group();
      p.hand.position.set(0, n.model.hand, 0);
      p.armR.add(p.hand);
      p.held = {};
    }
    if (id && !p.held[id]) {
      const model = armsModel(id);
      if (!model) return;
      const mesh = new THREE.Mesh(model.toGeometry({ jitter: 0.02, seed: 5, size: U }), n.model.material);
      mesh.position.set(-2 * U, 0, -2 * U);
      mesh.castShadow = true;
      mesh.renderOrder = 1.6;
      p.hand.add(mesh);
      p.held[id] = mesh;
      if (id === 'angel') {
        // M33: Spitze der Angel für die Schnur
        p.rodTip = new THREE.Object3D();
        p.rodTip.position.set(1.5 * U, (-ROD_TIP + 0.5) * U, 1.5 * U);
        mesh.add(p.rodTip);
      }
      if (id === 'spule') {
        // N9: hier verlässt die Drachenschnur die Spule
        p.spoolTip = new THREE.Object3D();
        p.spoolTip.position.set(SPOOL_TIP.x * U, SPOOL_TIP.y * U, SPOOL_TIP.z * U);
        mesh.add(p.spoolTip);
      }
    }
    for (const [k, mesh] of Object.entries(p.held)) mesh.visible = k === id;
  }

  /**
   * A6: Ein Lampion am Stab in der linken Hand (Kürbisfest), beim ersten Mal gebaut: der Stab aus der
   * Faust nach vorn, daran der Lampion in der Farbe der Person (das Papier glüht). `on` false legt
   * ihn weg.
   */
  lampion(n, on) {
    if (n.dog) return;
    const p = n.model.parts;
    if (on && !p.lampion) {
      const group = new THREE.Group();
      group.position.set(0, n.model.hand, 0);
      const stick = new THREE.Mesh(buildLampionStick().toGeometry({ jitter: 0.02, seed: 3, size: U }), n.model.material);
      const hang = new THREE.Group();
      hang.position.set(0.5 * U, (Math.round(LAMPION_STICK * 0.21) + 0.5) * U, (LAMPION_STICK + 0.5) * U);
      const { frame, paper } = buildLampion(lampionColorOf(n.id));
      const rim = new THREE.Mesh(frame.toGeometry({ jitter: 0.02, seed: 4, size: U }), n.model.material);
      const glow = new THREE.Mesh(paper.toGeometry({ jitter: 0, ao: false, size: U }), this.world.materials.lampionGlow);
      hang.add(rim, glow);
      group.add(stick, hang);
      for (const mesh of [stick, rim, glow]) {
        mesh.castShadow = mesh !== glow;
        mesh.renderOrder = 1.6;
      }
      p.armL.add(group);
      p.lampion = { group, hang };
    }
    if (p.lampion) p.lampion.group.visible = on;
    n.lampion = on ? n.lampion || { raise: 0 } : null;
  }

  /** Eine Geste vorspielen (M10); mehrere laufen nacheinander. */
  gesture(n, kind, dur) {
    n.gestures.push({ kind, dur, t: 0 });
  }

  /**
   * Gesten über der Grundhaltung (M10, Balduin): Mütze lüften, Hände reiben,
   * Daumen hoch, Winken, Achselzucken, Bart kraulen. Weich ein- und ausgeblendet.
   */
  poseGesture(n, dt) {
    const g = n.gestures[0];
    if (!g) return;
    g.t += dt;
    const p = n.model.parts;
    const k = clamp(Math.min(g.t / 0.18, (g.dur - g.t) / 0.18), 0, 1);
    const to = (obj, axis, value) => {
      obj.rotation[axis] += (value - obj.rotation[axis]) * k;
    };
    switch (g.kind) {
      case 'muetze': // rechte Hand an den Mützenschirm, Kopf nickt
        to(p.armR, 'x', -2.85);
        to(p.armR, 'z', -0.45);
        p.head.rotation.x += Math.sin(g.t * 7) * 0.1 * k;
        break;
      case 'reiben': // beide Hände vor dem Bauch, die reiben sich
        to(p.armL, 'x', -1.05);
        to(p.armR, 'x', -1.05);
        to(p.armL, 'z', -0.38 + Math.sin(g.t * 20) * 0.1);
        to(p.armR, 'z', 0.38 - Math.sin(g.t * 20) * 0.1);
        break;
      case 'daumen': // rechter Arm nach vorn oben, kurz gehalten
        to(p.armR, 'x', -1.75);
        to(p.armR, 'z', -0.1);
        break;
      case 'winken':
        to(p.armR, 'x', -2.6);
        to(p.armR, 'z', 0.25 + Math.sin(g.t * 14) * 0.35);
        break;
      case 'schulter': // Achseln zucken, Kopf schief
        to(p.armL, 'z', 0.4);
        to(p.armR, 'z', -0.4);
        to(p.head, 'z', 0.16);
        break;
      case 'bart': // rechte Hand am Kinn, nachdenklich
        to(p.armR, 'x', -2.1);
        to(p.armR, 'z', -0.55);
        to(p.head, 'x', -0.1);
        break;
      // M28: die Ticks am Kartentisch
      case 'kichern': // Hand vor den Mund, die Schultern hüpfen
        to(p.armR, 'x', -2.35);
        to(p.armR, 'z', -0.5);
        to(p.head, 'z', 0.12);
        p.body.position.y += Math.abs(Math.sin(g.t * 26)) * 0.012 * k;
        break;
      case 'summen': // Kopf wiegt sich im Takt
        p.head.rotation.z += Math.sin(g.t * 5) * 0.16 * k;
        p.head.rotation.x += 0.06 * k;
        break;
      case 'brille': // rechte Hand an die Brille, Kopf etwas gesenkt
        to(p.armR, 'x', -2.55);
        to(p.armR, 'z', -0.3);
        to(p.head, 'x', 0.12);
        break;
      case 'pfeife': // Pfeife an den Mund, ein Zug
        to(p.armR, 'x', -2.2);
        to(p.armR, 'z', -0.45);
        p.head.rotation.x += -0.08 * Math.sin(Math.min(1, g.t / g.dur) * Math.PI) * k;
        break;
      default:
        break;
    }
    if (g.t >= g.dur) n.gestures.shift();
  }

  setVisible(id, visible) {
    const n = this.list.get(id);
    if (n) n.model.root.visible = visible;
  }

  /**
   * Schlafsäcke an den Gästeplätzen (M27): einmal angelegt, sichtbar, solange
   * dort ein Gast übernachtet.
   * @param {Array<{x:number, z:number, facing:number}>} spots
   * @param {Set<number>} used Indizes der belegten Plätze
   */
  setBedrolls(spots, used) {
    if (!this.bedrolls) {
      const geo = bedrollModel().toGeometry({ jitter: 0.02, seed: 5, size: U });
      const material = createWorldMaterial({ selfLight: 0.2 });
      this.bedrolls = spots.map((s) => {
        const mesh = new THREE.Mesh(geo, material);
        // hinter dem Sitzplatz, vom Feuer weg
        const bx = s.x - Math.sin(s.facing) * 0.8;
        const bz = s.z - Math.cos(s.facing) * 0.8;
        mesh.position.set(Math.round(bx * 8) / 8, this.world.heightAt(bx, bz), Math.round(bz * 8) / 8);
        mesh.rotation.y = Math.round(s.facing / (Math.PI / 2)) * (Math.PI / 2); // nur 90°-Drehungen (Pixelraster)
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.visible = false;
        this.group.add(mesh);
        return mesh;
      });
    }
    this.bedrolls.forEach((mesh, i) => (mesh.visible = used.has(i)));
  }
}
