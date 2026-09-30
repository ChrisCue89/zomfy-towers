// Die Spielfigur: Eingabe -> Bewegung mit Kollision -> Animation.
// Aktionen (Schwung mit Werkzeug, Durchsuchen) sperren kurz die Bewegung und
// lösen zu einem festen Zeitpunkt ihren Effekt aus (onHit).

import * as THREE from 'three';
import { clamp, damp, dampAngle, lerp } from '../core/math.js';
import { buildCharacter, MIKA, OPEN_EYES } from './characters.js';
import { createSilhouetteMaterial } from '../render/materials.js';

const LANTERN_RAISE = -1.3;
// N1: mit Ellbogen – Oberarm leicht vor, Unterarm angewinkelt
const LANTERN_UPPER = -0.55;
const LANTERN_FORE = -0.95;
export const FLINCH = 0.28; // Dauer des Zusammenzuckens
const SLIDE_LOOK = 0.7; // so weit schaut Mika seitlich voraus, wenn sie festhängt (m7-r1: 0,4 m – im Haus blieb man zu oft an Möbeln hängen)
const SLIDE_TURN = 1.15; // Richtung des Ausweichschritts (Bogenmaß zur Wunschrichtung)
/**
 * Über eigene Barrikaden klettert Mika, langsamer und ein Stück höher (m12-r1:
 * sie blieb nachts mitten in der Reihe hängen, die Horde im Rücken).
 */
const CLIMB = { speed: 0.45, lift: 0.28 };
const MOVE = { climb: true };
/**
 * N4 (Probespiel 29.09.): Werkzeug und Waffe hängen auf dem Rücken. Beim Benutzen
 * zieht Mika sie (der Schwung holt ohnehin über die Schulter aus), danach bleiben
 * sie noch `hold` Sekunden in der Hand und wandern mit einem Griff über die Schulter
 * (`sheath` Sekunden) zurück. Im Kampf hält game.js sie gezogen (keepDrawn).
 */
export const TOOL_CARRY = { hold: 2.6, sheath: 0.32 };

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
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
    this.climbing = false; // klettert gerade über eine eigene Barrikade (m12-r1)
    this.riding = null; // Neigung, solange Mika auf der Reifenschaukel steht (m12-r1)
    this.seated = null; // M28: am Kartentisch – { x, z, facing, seatY }
    this.fishingPose = null; // M33: beim Angeln { phase, power, t, pull, reel }
    this.character = buildCharacter(MIKA, { occluder: false });
    this.object = this.character.root;
    this.object.name = 'Mika';
    // Hinter Verdeckungen (Haus, Bäume) bleibt Mika als warmer Umriss sichtbar
    // Mika hebt sich ab – aber nur halb gerastert: dicht gerastert verschmolz sie mit
    // Schlurfern und Stühlen davor zu einem gelben Klumpen (m12-r1)
    const silhouette = createSilhouetteMaterial(0xffc86a, 0.5);
    for (const name of ['legL', 'legR', 'torso', 'head', 'armL', 'armR', 'kneeL', 'kneeR', 'elbowL', 'elbowR']) {
      if (!this.character.parts[name]) continue;
      const mesh = this.character.parts[name].children.find((c) => c.isMesh);
      if (!mesh) continue;
      mesh.renderOrder = 2;
      const outline = new THREE.Mesh(mesh.geometry, silhouette);
      outline.userData.outline = true;
      outline.renderOrder = 1.75; // nach Türmen und Bauten, vor den Schlurfern (1.8, m16-r1: kein gelbes Knäuel)
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
    this.heldTool = null; // Werkzeug aus der Schnellleiste (N4: auf dem Rücken, gezogen beim Benutzen)
    this.drawnT = 0; // N4: so lange bleibt das Werkzeug noch in der Hand (s)
    this.speedFactor = 1; // Aufwertung »Tempo«
    this.action = null;
    this.swingReadyAt = 0; // abgebrochenes Ausschwingen: nächster Schlag erst ab hier (this.time)
    this.flinch = 0; // Zusammenzucken nach einem Treffer (Sekunden)
    this.blinkAt = 2 + Math.random() * 3; // nächstes Blinzeln (this.time)
    this.mood = 'normal'; // Grundstimmung im Gesicht (setzt game.js, M12)
    this.faceTemp = 'normal'; // kurzer Ausdruck (express)
    this.faceTimer = 0;
    this.faceShown = 'normal';
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
   * @param {'swing'|'search'|'roll'|'blitz'|'wurf'|'pfiff'|'jubel'|'wirbel'} kind
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
      long: options.long || false, // M30: lange Waffe – beide Hände am Gewehr
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
      this.character.parts[name].traverse((o) => o.isMesh && !o.userData.outline && !o.userData.gear && oldMeshes.push(o));
      fresh.parts[name].traverse((o) => o.isMesh && !o.userData.gear && newMeshes.push(o));
      oldMeshes.forEach((mesh, k) => {
        const geo = newMeshes[k]?.geometry;
        if (!geo || geo === mesh.geometry) return;
        mesh.geometry.dispose();
        mesh.geometry = geo;
        for (const child of mesh.children) if (child.userData.outline) child.geometry = geo;
      });
    }
  }

  /** N4: Werkzeug bzw. Waffe mindestens so lange gezogen lassen (Kampf in der Nähe). */
  keepDrawn(seconds) {
    if (this.heldTool) this.drawnT = Math.max(this.drawnT, seconds);
  }

  /** N4: Ist gerade ein Werkzeug in der Hand (Aktion oder noch nicht weggesteckt)? */
  get toolDrawn() {
    return Boolean(this.action?.tool) || (this.drawnT > 0 && Boolean(this.heldTool));
  }

  /** Kurzer Gesichtsausdruck (M12), z. B. 'froh' nach einem Fund. */
  express(expr, seconds = 1) {
    this.faceTemp = expr;
    this.faceTimer = seconds;
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

    this.climbing = this.onBarricade(this.position.x, this.position.z);
    const speed = (run ? this.config.runSpeed : this.config.walkSpeed) * this.speedFactor * (this.climbing ? CLIMB.speed : 1);
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
    this.world.colliders.move(this.position, this.velocity.x * dt, this.velocity.z * dt, this.config.radius, MOVE);
    if (len > 0.1 && !roll && !lunge) this.slideAround(beforeX, beforeZ, this.velocity.x * dt, this.velocity.z * dt);
    if (dt > 0) {
      this.velocity.x = (this.position.x - beforeX) / dt;
      this.velocity.z = (this.position.z - beforeZ) / dt;
    }
    const lift = this.onBarricade(this.position.x, this.position.z) ? CLIMB.lift : 0;
    this.position.y = damp(this.position.y, this.world.heightAt(this.position.x, this.position.z) + lift, lift ? 12 : 20, dt);

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
      this.world.colliders.move(probe, -uz * sign * SLIDE_LOOK, ux * sign * SLIDE_LOOK, r, MOVE);
      const bx = probe.x;
      const bz = probe.z;
      this.world.colliders.move(probe, ux * SLIDE_LOOK, uz * SLIDE_LOOK, r, MOVE);
      const p = (probe.x - bx) * ux + (probe.z - bz) * uz;
      if (p > best) {
        best = p;
        side = sign;
      }
    }
    if (!side) return;
    const c = Math.cos(SLIDE_TURN);
    const s = Math.sin(SLIDE_TURN) * side;
    this.world.colliders.move(this.position, (ux * c - uz * s) * want, (uz * c + ux * s) * want, r, MOVE);
  }

  /** Steht Mika auf einer heilen Barrikade (klettert gerade drüber)? */
  onBarricade(x, z) {
    const b = this.world.buildings?.atCell(Math.floor(x), Math.floor(z));
    return Boolean(b && b.type === 'barrikade' && !b.broken);
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

  /** Gesicht sofort umstellen (M26: im Trefferstopp steht das Bild still – das Aua muss schon drin sein). */
  setFace(expr) {
    const faces = this.character.parts.faces;
    if (!faces || !faces[expr] || expr === this.faceShown) return;
    faces[this.faceShown].visible = false;
    faces[expr].visible = true;
    this.faceShown = expr;
  }

  animate(dt) {
    const p = this.character.parts;
    this.flashT = Math.max(0, (this.flashT || 0) - dt); // Laternenblitz (M16): Licht über intensity
    const act = this.action;
    this.spinAngle = act && act.kind === 'wirbel' ? easeInOut(Math.min(1, act.t / act.duration)) * Math.PI * 2 : 0;
    const amt = this.moveAmount;
    const s = Math.sin(this.phase);
    const idle = 1 - clamp(amt, 0, 1);
    const a = this.action;

    const running = clamp((amt - 1) / 0.4, 0, 1);

    p.legL.rotation.x = s * 0.75 * amt;
    p.legR.rotation.x = -s * 0.75 * amt;
    // N1: Das Knie beugt sich, wenn das Bein hinten ist (der Fuß hebt ab), die
    // Ellbogen sind immer ein wenig gebeugt und schwingen mit
    const knee = (hip) => Math.max(0, hip) * 1.25 + 0.08 * Math.min(1, amt);
    if (p.kneeL) {
      p.kneeL.rotation.x = knee(p.legL.rotation.x);
      p.kneeR.rotation.x = knee(p.legR.rotation.x);
    }
    p.body.position.y = Math.abs(Math.cos(this.phase)) * 0.035 * amt + Math.sin(this.time * 2.1) * 0.006 * idle;
    // Kopf: nickt im Schritt, schaut im Stehen langsam umher
    p.head.rotation.x = Math.sin(this.phase * 2) * 0.05 * Math.min(1, amt);
    p.head.rotation.y = Math.sin(this.time * 0.35) * 0.18 * idle;
    p.head.rotation.z = Math.sin(this.phase) * 0.04 * amt;
    // Beim Rennen etwas vorgebeugt
    p.body.rotation.x = running * 0.14;
    // Gesicht (M12): Treffer, Arbeit und Kampf gehen vor, dann ein kurzer Ausdruck, sonst die Stimmung
    if (p.faces) {
      this.faceTimer = Math.max(0, this.faceTimer - dt);
      let expr = this.faceTimer > 0 ? this.faceTemp : this.mood;
      if (this.flinch > 0) expr = 'aua';
      else if (a && (a.kind === 'swing' || a.kind === 'roll' || a.kind === 'wurf' || a.kind === 'wirbel')) expr = 'entschlossen';
      else if (a && a.kind === 'blitz') expr = 'staunen';
      else if (a && a.kind === 'jubel') expr = 'froh';
      this.setFace(expr);
    }
    // Blinzeln: alle paar Sekunden für einen Augenblick die Lider zu (nur bei offenen Augen)
    if (p.eyelids) {
      if (this.time > this.blinkAt + 0.13) this.blinkAt = this.time + 2.2 + Math.random() * 3.5;
      p.eyelids.visible = this.time >= this.blinkAt && OPEN_EYES.has(this.faceShown);
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
      if (p.kneeL) {
        p.kneeL.rotation.x = q * 1.6;
        p.kneeR.rotation.x = q * 1.4;
      }
    }

    // M28: am Kartentisch sitzen – Oberschenkel nach vorn, Knie gebeugt (die Füße hängen)
    if (this.seated) {
      p.legL.rotation.x = -1.5;
      p.legR.rotation.x = -1.42;
      if (p.kneeL) {
        p.kneeL.rotation.x = 1.4;
        p.kneeR.rotation.x = 1.3;
      }
      p.body.rotation.x = 0.08;
      p.body.position.y = Math.sin(this.time * 1.9) * 0.004;
    }

    // Rechte Hand: Werkzeug zeigen (Aktion hat Vorrang vor der Auswahl). Drinnen
    // steckt Mika es weg – in der engen Stube ragte die Axt durch die Wand (m12-r1).
    // N4: Sonst hängt es auf dem Rücken und ist nur beim Benutzen und kurz danach
    // in der Hand; zuletzt greift die Hand über die Schulter und steckt es zurück.
    const indoors = this.world.isInside?.(this.position.x, this.position.z);
    if (a?.tool) this.drawnT = TOOL_CARRY.hold;
    else this.drawnT = Math.max(0, this.drawnT - dt);
    const carried = indoors ? null : this.heldTool;
    const shownTool = this.fishingPose ? 'angel' : a ? a.tool : this.drawnT > 0 ? carried : null; // M33: beim Angeln die Angel
    const sheathing = !a && shownTool && this.drawnT < TOOL_CARRY.sheath ? 1 - this.drawnT / TOOL_CARRY.sheath : 0;
    for (const [name, mesh] of Object.entries(this.character.tools)) mesh.visible = name === shownTool;
    const backTool = !shownTool && !this.seated ? carried : null;
    for (const [name, mesh] of Object.entries(this.character.backTools || {})) mesh.visible = name === backTool;

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
      if (p.elbowR) p.elbowR.rotation.x = q < hit * 0.8 ? -0.5 * easeOut(q / (hit * 0.8)) : lerp(-0.5, 0, Math.min(1, (q - hit * 0.8) / (hit * 0.2))); // ausholen, dann strecken
    } else if (a && a.kind === 'shoot') {
      // M30: Schuss – Arm gestreckt nach vorn im Anschlag, im ersten Augenblick ruckt er hoch (Rückstoß)
      const kick = Math.max(0, 1 - a.t / 0.09);
      p.armR.rotation.x = -1.5 + kick * 0.35;
      p.armR.rotation.z = a.long ? 0.28 : 0.08;
      if (p.elbowR) p.elbowR.rotation.x = 0;
      p.body.rotation.x = -0.05 * kick;
    } else if (a && a.kind === 'wurf') {
      // Kürbiswurf (M16): über Kopf ausholen, beim Loslassen weit nach vorn
      const q = a.t / a.duration;
      const hit = a.hitAt / a.duration;
      p.armR.rotation.x = q < hit ? lerp(-0.3, -3.0, easeOut(q / hit)) : lerp(-3.0, -0.8, Math.min(1, (q - hit) / 0.3));
      p.armR.rotation.z = 0.15;
      p.body.rotation.x = q < hit ? -0.1 * (q / hit) : 0.16 * Math.max(0, 1 - (q - hit) / (1 - hit));
      if (p.elbowR) p.elbowR.rotation.x = q < hit ? -1.1 * easeOut(q / hit) : lerp(-1.1, -0.15, Math.min(1, (q - hit) / 0.2));
    } else if (a && a.kind === 'pfiff') {
      // Pfiff (M16): zwei Finger an den Mund, Kopf ein wenig zurück
      const q = Math.min(1, a.t / (a.hitAt * 0.8));
      p.armR.rotation.x = lerp(-0.2, -2.1, easeOut(q));
      p.armR.rotation.z = lerp(0.05, -0.4, q);
      if (p.elbowR) p.elbowR.rotation.x = lerp(-0.2, -1.9, easeOut(q));
      p.head.rotation.x = -0.18 * q;
    } else if (a && a.kind === 'jubel') {
      // Anfeuern (M16): Arm hoch, kleiner Hüpfer
      const q = a.t / a.duration;
      p.armR.rotation.x = -2.9 + Math.sin(q * Math.PI * 4) * 0.2;
      p.armR.rotation.z = 0.35;
      if (p.elbowR) p.elbowR.rotation.x = -0.1;
      p.body.position.y = Math.abs(Math.sin(q * Math.PI * 2)) * 0.07;
    } else if (a && a.kind === 'wirbel') {
      // Wirbel (M16): Arm seitlich gestreckt, einmal ganz herum
      p.armR.rotation.x = -1.35;
      p.armR.rotation.z = 1.15;
      if (p.elbowR) p.elbowR.rotation.x = 0;
      p.body.rotation.x = 0.1;
    } else if (a && a.kind === 'search') {
      const w = Math.sin(a.t * 14);
      p.armR.rotation.x = -0.9 + w * 0.35;
      p.armR.rotation.z = 0.1;
      p.body.rotation.x = 0.28;
      if (p.elbowR) p.elbowR.rotation.x = -0.6 - w * 0.3;
    } else if (this.seated?.rowing) {
      // N5: Rudern (die Ankunft) – beide Hände an den Griffen im Takt der Riemen (`phase`)
      const q = Math.sin(this.seated.phase ?? this.time * this.seated.rowing);
      p.armR.rotation.x = -1.2 + q * 0.45;
      p.armR.rotation.z = 0.22;
      if (p.elbowR) p.elbowR.rotation.x = -0.65 - q * 0.35;
      p.body.rotation.x = 0.08 - q * 0.12;
    } else if (this.seated) {
      // Die Karten vor der Brust
      p.armR.rotation.x = -1.05;
      p.armR.rotation.z = 0.3;
      if (p.elbowR) p.elbowR.rotation.x = -0.8;
    } else if (sheathing > 0) {
      // N4: Wegstecken – die Hand fährt über die Schulter nach hinten
      const q = easeInOut(Math.min(1, sheathing * 1.4));
      p.armR.rotation.x = lerp(-0.25, -2.75, q);
      p.armR.rotation.z = lerp(0.05, -0.25, q);
      if (p.elbowR) p.elbowR.rotation.x = lerp(-0.45, -1.35, q);
    } else {
      p.armR.rotation.x = (shownTool ? -0.25 : 0) + s * 0.6 * amt;
      p.armR.rotation.z = 0.05 + Math.sin(this.time * 2.1) * 0.03 * idle;
      if (p.elbowR) p.elbowR.rotation.x = (shownTool ? -0.45 : -0.18) + Math.min(0, s * 0.6 * amt) * 0.6;
    }
    // Werkzeug in Ruhe schräg nach vorn getragen (sonst steckt es im Boden);
    // beim Schwung liegt es in der Verlängerung des Arms
    const carry = shownTool && !(a && (a.kind === 'swing' || a.kind === 'search' || a.kind === 'wirbel')) ? -1.0 : 0;
    p.hand.rotation.x = damp(p.hand.rotation.x, carry, 14, dt);

    // Auf der Schaukel: Hände an den Seilen, Beine gerade, kein Werkzeug in der Hand
    if (this.riding !== null) {
      p.legL.rotation.x = 0;
      p.legR.rotation.x = 0;
      p.body.rotation.x = 0;
      p.armR.rotation.x = -2.8;
      p.armR.rotation.z = -0.18;
      if (p.elbowR) p.elbowR.rotation.x = 0;
      if (p.kneeL) p.kneeL.rotation.x = p.kneeR.rotation.x = 0;
      for (const mesh of Object.values(this.character.tools)) mesh.visible = false;
      for (const mesh of Object.values(this.character.backTools || {})) mesh.visible = false;
    }

    // Linker Arm: Laterne oder Schwingen
    const lantern = this.character.lantern;
    const flashing = a && a.kind === 'blitz';
    lantern.group.visible = this.holdingLantern || flashing;
    if (flashing) {
      // Laternenblitz (M16): die Laterne hoch über den Kopf – sie flammt am höchsten Punkt auf
      const q = a.t / a.duration;
      const up = q < a.hitAt / a.duration ? easeOut(q / (a.hitAt / a.duration)) : q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
      p.armL.rotation.x = lerp(LANTERN_UPPER, -2.95, up);
      p.armL.rotation.z = -0.12;
      if (p.elbowL) p.elbowL.rotation.x = lerp(LANTERN_FORE, -0.05, up);
      lantern.group.rotation.x = -p.armL.rotation.x - (p.elbowL ? p.elbowL.rotation.x : 0);
      lantern.group.rotation.z = 0;
    } else if (a && a.kind === 'jubel' && !this.holdingLantern) {
      p.armL.rotation.x = -2.9 - Math.sin((a.t / a.duration) * Math.PI * 4) * 0.2;
      p.armL.rotation.z = -0.35;
      if (p.elbowL) p.elbowL.rotation.x = -0.1;
    } else if (this.holdingLantern) {
      this.lanternSwing = damp(this.lanternSwing, s * 0.25 * amt, 6, dt);
      // N1: Oberarm etwas vor, Unterarm hoch – die Laterne hängt vor der Brust
      const upper = p.elbowL ? LANTERN_UPPER : LANTERN_RAISE;
      const fore = p.elbowL ? LANTERN_FORE : 0;
      p.armL.rotation.x = upper + s * 0.06 * amt;
      p.armL.rotation.z = -0.08;
      if (p.elbowL) p.elbowL.rotation.x = fore;
      lantern.group.rotation.x = -upper - fore - s * 0.06 * amt + this.lanternSwing;
      lantern.group.rotation.z = Math.sin(this.time * 1.7) * 0.05;
    } else if (a && a.kind === 'shoot' && a.long && !this.holdingLantern) {
      // M30: lange Waffe – die linke Hand stützt den Vorderschaft
      p.armL.rotation.x = -1.35 + Math.max(0, 1 - a.t / 0.09) * 0.3;
      p.armL.rotation.z = -0.42;
      if (p.elbowL) p.elbowL.rotation.x = -0.35;
    } else if (this.seated?.rowing) {
      // N5: rudern – der linke Arm zieht im selben Takt wie der rechte
      const q = Math.sin(this.seated.phase ?? this.time * this.seated.rowing);
      p.armL.rotation.x = -1.2 + q * 0.45;
      p.armL.rotation.z = -0.22;
      if (p.elbowL) p.elbowL.rotation.x = -0.65 - q * 0.35;
    } else if (a && a.kind === 'search') {
      p.armL.rotation.x = -0.9 - Math.sin(a.t * 14) * 0.35;
      p.armL.rotation.z = -0.1;
      if (p.elbowL) p.elbowL.rotation.x = -0.6 + Math.sin(a.t * 14) * 0.3;
    } else {
      p.armL.rotation.x = -s * 0.6 * amt;
      p.armL.rotation.z = -0.05 - Math.sin(this.time * 2.1) * 0.03 * idle;
      if (p.elbowL) p.elbowL.rotation.x = -0.18 + Math.min(0, -s * 0.6 * amt) * 0.6;
    }
    if (this.riding !== null && !this.holdingLantern) {
      p.armL.rotation.x = -2.8;
      p.armL.rotation.z = 0.18;
      if (p.elbowL) p.elbowL.rotation.x = 0;
    }

    // M33: Angeln – rechts die Angel schräg nach vorn oben, links die Hand an der Kurbel.
    // Beim Laden holt sie weit über die Schulter aus, der Wurf schnellt nach vorn, im Drill
    // steht die Rute steiler und zittert, die linke Hand kurbelt.
    const fp = this.fishingPose;
    if (fp) {
      let ang = -2.05;
      if (fp.phase === 'laden') ang = lerp(-2.05, -3.05, fp.power || 0);
      else if (fp.phase === 'wurf') ang = lerp(-3.05, -1.75, Math.min(1, (fp.t || 0) / 0.2));
      else if (fp.phase === 'biss') ang = -2.3;
      else if (fp.phase === 'drill') ang = -2.3 - (fp.pull || 0) * 0.2 + Math.sin(this.time * 19) * 0.04 * (fp.pull || 0);
      else if (fp.phase === 'fang') ang = -2.6;
      p.armR.rotation.x = ang;
      p.armR.rotation.z = 0.12;
      if (p.elbowR) p.elbowR.rotation.x = -0.2;
      p.armL.rotation.x = -1.3;
      p.armL.rotation.z = -0.38;
      if (p.elbowL) p.elbowL.rotation.x = -0.85 + (fp.reel ? Math.sin(this.time * 15) * 0.35 : 0);
      lantern.group.visible = false;
    }
  }

  /** Kartenabend (M28): hinsetzen (seatY = Höhe der Sitzfläche) oder wieder aufstehen (null). */
  seat(spot) {
    this.seated = spot ? { ...spot } : null;
    if (spot) this.place(spot.x, spot.z, spot.facing);
    else this.syncObject();
  }

  syncObject() {
    this.object.position.copy(this.position);
    if (this.seated) this.object.position.y += (this.seated.seatY ?? 0.28) - 0.375; // Hüfte auf die Sitzfläche
    this.object.rotation.y = this.facing + (this.spinAngle || 0);
    this.object.rotation.z = this.riding ?? 0; // auf der Schaukel neigt sie sich mit
  }

  /** Auf der Reifenschaukel: Stelle und Neigung kommen von der Schaukel. */
  ride(dt, x, y, z, tilt) {
    this.time += dt;
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.facing = 0;
    this.riding = tilt;
    this.moveAmount = 0;
    this.animate(dt);
    this.syncObject();
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
