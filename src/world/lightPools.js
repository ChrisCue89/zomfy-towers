// Lichtinseln: warme Lichtkreise auf dem Boden für Lampen, die kein echtes
// Punktlicht bekommen (die Zahl der three.js-Lichter muss konstant bleiben).
// Mischmodus: Ziel × (1 + Quelle) + warmes Grundlicht – der Boden wird warm
// aufgehellt und bekommt auch nachts auf dunklem Grund sichtbares Licht. Die
// Palettenabbildung macht daraus gestufte Ringe.

import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
    this.group.renderOrder = 2;
    scene.add(this.group);
  }

  add(x, z, radius) {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.scale.set(radius * 2, 1, radius * 2);
    mesh.position.set(x, 0.02, z);
    mesh.renderOrder = 2;
    const glow = new THREE.Mesh(this.geometry, this.addMaterial);
    glow.renderOrder = 3;
    mesh.add(glow);
    this.group.add(mesh);
    return mesh;
  }

  remove(mesh) {
    this.group.remove(mesh);
  }

  update(lampLevel) {
    this.material.uniforms.uLevel.value = lampLevel;
    this.group.visible = lampLevel > 0.01;
  }
}
