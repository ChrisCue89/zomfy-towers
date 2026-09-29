// Lichtinseln: warme Lichtkreise auf dem Boden für Lampen, die kein echtes
// Punktlicht bekommen (die Zahl der three.js-Lichter muss konstant bleiben).
// Mischmodus: Ziel × (1 + Quelle) + warmes Grundlicht – der Boden wird warm
// aufgehellt und bekommt auch nachts auf dunklem Grund sichtbares Licht. Die
// Palettenabbildung macht daraus gestufte Ringe.

import * as THREE from 'three';

const _m = new THREE.Matrix4();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  #ifdef USE_INSTANCING
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  #else
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #endif
}
`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uLevel;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = 1.0 - smoothstep(0.0, 1.0, d);
  a = a * a * uLevel;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * a, 1.0);
  #ifdef ADDITIVE
  gl_FragColor.rgb *= 0.14;
  #endif
}
`;

export class LightPools {
  constructor(scene) {
    // Zwei Durchgänge: multiplikativ (Farbe des Bodens bleibt) und additiv (Grundlicht)
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uColor: { value: new THREE.Color(2.6, 1.7, 0.8) },
        uLevel: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.DstColorFactor,
      blendDst: THREE.OneFactor,
    });
    this.addMaterial = this.material.clone();
    this.addMaterial.defines = { ADDITIVE: '' };
    // Grundlicht: gedämpftes, sattes Orange (sonst wirkt der Kreis nachts milchig)
    this.addMaterial.uniforms = { uColor: { value: new THREE.Color(1.8, 0.75, 0.2) }, uLevel: this.material.uniforms.uLevel };
    this.addMaterial.blendSrc = THREE.OneFactor;
    this.addMaterial.blendDst = THREE.OneFactor;
    this.geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.group = new THREE.Group();
    this.group.name = 'Lichtinseln';
    // Wo es nachts hell ist (M22: Nebelwelle – nur im Licht sieht man die Horde)
    this.spots = [];
    this.scale = 1; // M27: Lottes Laternen – alle Lichtinseln größer (auch für Nebel und Laternenhexe)
    this.group.renderOrder = 2;
    scene.add(this.group);
  }

  add(x, z, radius) {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.scale.set(radius * 2 * this.scale, 1, radius * 2 * this.scale);
    mesh.position.set(x, 0.02, z);
    mesh.renderOrder = 2;
    const glow = new THREE.Mesh(this.geometry, this.addMaterial);
    glow.renderOrder = 3;
    mesh.add(glow);
    this.group.add(mesh);
    this.spots.push({ x, z, r: radius, mesh });
    return mesh;
  }

  /**
   * Viele gleiche Lichtinseln auf einmal (Fackeln an den Wegen): zwei Zeichenaufrufe für alle.
   * @param {THREE.InstancedMesh} [flames] die Flammen dazu (gleiche Reihenfolge) – erlöschen mit (M22)
   */
  addMany(points, radius, flames = null) {
    const make = (material, order) => {
      const mesh = new THREE.InstancedMesh(this.geometry, material, points.length);
      const m = new THREE.Matrix4();
      points.forEach((p, i) => mesh.setMatrixAt(i, m.makeScale(radius * 2 * this.scale, 1, radius * 2 * this.scale).setPosition(p.x, 0.02, p.z)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.renderOrder = order;
      mesh.frustumCulled = false;
      return mesh;
    };
    const mesh = make(this.material, 2);
    mesh.add(make(this.addMaterial, 3));
    this.group.add(mesh);
    points.forEach((p, i) => this.spots.push({ x: p.x, z: p.z, r: radius, mesh, i, flames }));
    return mesh;
  }

  remove(mesh) {
    this.group.remove(mesh);
    this.spots = this.spots.filter((s) => s.mesh !== mesh);
  }

  /**
   * Alle Lichtinseln größer oder wieder normal (M27: Lotte, die Laternenmacherin).
   * @param {number} k Faktor auf den Radius
   */
  setScale(k) {
    if (k === this.scale) return;
    this.scale = k;
    for (const s of this.spots) {
      if (s.i === undefined) s.mesh.scale.set(s.r * 2 * k, 1, s.r * 2 * k);
      else if (!s.off) this.show(s, true);
    }
  }

  /** Liegt die Stelle in einer Lichtinsel? (M22) */
  litAt(x, z) {
    const k = this.scale * this.scale;
    for (const s of this.spots) if (!s.off && (x - s.x) ** 2 + (z - s.z) ** 2 <= s.r * s.r * k) return true;
    return false;
  }

  /** Brennt im Umkreis `r` noch ein Licht? (Die Laternenhexe greift nur danach, M22.) */
  litNear(x, z, r) {
    for (const s of this.spots) if (!s.off && (x - s.x) ** 2 + (z - s.z) ** 2 <= r * r) return true;
    return false;
  }

  /** Lichtraub (M22): Jede Lichtinsel im Umkreis erlischt bis `until` (Spieluhr in s). Gibt zurück, wie viele. */
  steal(x, z, r, until) {
    let n = 0;
    for (const s of this.spots) {
      if (s.off || (x - s.x) ** 2 + (z - s.z) ** 2 > r * r) continue;
      s.off = until;
      this.show(s, false);
      n++;
    }
    return n;
  }

  /** Gestohlenes Licht kehrt zurück, sobald seine Zeit um ist (oder alles auf einmal: now = Infinity). */
  restore(now) {
    for (const s of this.spots) {
      if (!s.off || s.off > now) continue;
      s.off = 0;
      this.show(s, true);
    }
  }

  show(s, on) {
    if (s.i === undefined) {
      s.mesh.visible = on;
      return;
    }
    // Instanzen (Fackeln): auf null schrumpfen bzw. zurück an ihren Platz, die Flamme mit
    const pool = on ? _m.makeScale(s.r * 2 * this.scale, 1, s.r * 2 * this.scale).setPosition(s.x, 0.02, s.z) : ZERO;
    s.mesh.setMatrixAt(s.i, pool);
    s.mesh.instanceMatrix.needsUpdate = true;
    const glow = s.mesh.children[0];
    if (glow) {
      glow.setMatrixAt(s.i, pool);
      glow.instanceMatrix.needsUpdate = true;
    }
    if (s.flames) {
      s.flames.setMatrixAt(s.i, on ? _m.makeTranslation(s.x, 0, s.z) : ZERO);
      s.flames.instanceMatrix.needsUpdate = true;
    }
  }

  update(lampLevel) {
    this.material.uniforms.uLevel.value = lampLevel;
    this.group.visible = lampLevel > 0.01;
  }
}
