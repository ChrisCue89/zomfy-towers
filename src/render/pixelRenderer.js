// Der Pixel-Renderer: Szene in niedriger Auflösung rendern, im Pixelmaßstab
// nachbearbeiten (Umrisse, Palette, Dithering) und ganzzahlig hochskalieren.

import * as THREE from 'three';
import { buildPaletteLut } from './palette.js';
import { FULLSCREEN_VERT, POST_FRAG, BLIT_FRAG } from './shaders.js';
import { SHADOW_LAYER } from './staticMesh.js';

function fullscreenTriangle() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  return geometry;
}

function makePass(material) {
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(fullscreenTriangle(), material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { scene, material };
}


/** So breit (Oberflächenpixel) soll die Oberfläche mindestens sein, wenn das Fenster es erlaubt. */
const MIN_UI_WIDTH = 480;
export class PixelRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} config CONFIG.render
   */
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // Schatten werden in einem eigenen Durchgang gerendert (siehe render()).
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0x0d0b18, 1);
    renderer.info.autoReset = false;
    this.renderer = renderer;

    // Kamera für den Schattenpass: sieht die Schatten-Ebene, ihr winziger
    // Sichtbereich liegt weit unter der Welt, sodass sie selbst nichts zeichnet.
    this.shadowPassCamera = new THREE.OrthographicCamera(-0.001, 0.001, 0.001, -0.001, 0.001, 0.002);
    this.shadowPassCamera.position.set(0, -5000, 0);
    this.shadowPassCamera.updateMatrixWorld(true);
    this.shadowPassCamera.layers.enable(SHADOW_LAYER);
    this.shadowPassTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true, stencilBuffer: false });

    const lut = buildPaletteLut(32);
    this.lutTexture = new THREE.DataTexture(lut.data, lut.width, lut.height, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.lutTexture.minFilter = THREE.NearestFilter;
    this.lutTexture.magFilter = THREE.NearestFilter;
    this.lutTexture.generateMipmaps = false;
    this.lutTexture.needsUpdate = true;

    this.post = makePass(
      new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: POST_FRAG,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          tColor: { value: null },
          tDepth: { value: null },
          tLut: { value: this.lutTexture },
          uRes: { value: new THREE.Vector2(1, 1) },
          uPx: { value: 1 / config.pxPerMeter },
          uNear: { value: 1 },
          uFar: { value: 100 },
          uDepthEdge: { value: config.outlineDepth },
          uNormalEdge: { value: config.normalEdge },
          uDarken: { value: config.outlineDarken },
          uHighlight: { value: config.edgeHighlight },
          uOutlineTint: { value: new THREE.Vector3(0.9, 0.82, 1.0) },
          uDither: { value: config.dither },
          uPaletteMix: { value: config.paletteMix },
          uLutSize: { value: lut.size },
          uExposure: { value: 1 },
          uTint: { value: new THREE.Vector3(1, 1, 1) },
          uSaturation: { value: 1 },
          uVignette: { value: 0.3 },
          uVignetteColor: { value: new THREE.Vector3(0.3, 0.3, 0.5) },
          uDitherOffset: { value: new THREE.Vector2(0, 0) },
        },
      })
    );

    this.blit = makePass(
      new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: BLIT_FRAG,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          tPost: { value: null },
          uScale: { value: 1 },
          uOffset: { value: new THREE.Vector2(0, 0) },
          uMargin: { value: new THREE.Vector2(1, 1) },
        },
      })
    );

    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.width = 0; // sichtbare Spielpixel der Szene
    this.height = 0;
    this.scale = 1; // Gerätepixel pro Spielpixel
    this.uiWidth = 0; // Pixel der Oberfläche (eigene, gröbere Leinwand)
    this.uiHeight = 0;
    this.uiScale = 1;
    this.dpr = 1;
    this.rtWidth = 0; // Render-Target inkl. Rand für den Subpixel-Versatz
    this.rtHeight = 0;
    this.sceneTarget = null;
    this.postTarget = null;
  }

  /** Größe an das Fenster anpassen. Gibt true zurück, wenn sich etwas geändert hat. */
  resize(cssWidth, cssHeight, dpr) {
    const devW = Math.max(1, Math.round(cssWidth * dpr));
    const devH = Math.max(1, Math.round(cssHeight * dpr));
    const scale = Math.max(1, Math.round(devH / this.config.targetLines) + (this.scaleShift || 0)); // Einstellung »Pixelgröße«
    const width = Math.ceil(devW / scale);
    const height = Math.ceil(devH / scale);
    // Oberfläche: eigene ganzzahlige Skalierung für ca. uiLines Zeilen
    // – bei sehr schmalen Fenstern auch nach der Breite, damit Leisten und Tafeln
    // nicht aus dem Bild rutschen (m5-r1: 320 × 900)
    const uiScale = Math.max(1, Math.min(Math.round(devH / (this.config.uiLines || this.config.targetLines)), Math.floor(devW / MIN_UI_WIDTH)));
    this.uiScale = uiScale;
    this.uiWidth = Math.ceil(devW / uiScale);
    this.uiHeight = Math.ceil(devH / uiScale);
    if (width === this.width && height === this.height && scale === this.scale && dpr === this.dpr) return false;

    this.width = width;
    this.height = height;
    this.scale = scale;
    this.dpr = dpr;

    this.renderer.setSize(width * scale, height * scale, false);
    this.canvas.style.width = `${(width * scale) / dpr}px`;
    this.canvas.style.height = `${(height * scale) / dpr}px`;

    // Gerade Maße, damit das Voxelraster exakt auf Pixelgrenzen fällt.
    this.rtWidth = width + 2 + (width % 2);
    this.rtHeight = height + 2 + (height % 2);

    if (this.sceneTarget) {
      this.sceneTarget.depthTexture.dispose();
      this.sceneTarget.dispose();
      this.postTarget.dispose();
    }
    this.sceneTarget = new THREE.WebGLRenderTarget(this.rtWidth, this.rtHeight, {
      type: THREE.HalfFloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      depthBuffer: true,
      stencilBuffer: false,
      depthTexture: new THREE.DepthTexture(this.rtWidth, this.rtHeight, THREE.UnsignedIntType),
    });
    this.postTarget = new THREE.WebGLRenderTarget(this.rtWidth, this.rtHeight, {
      type: THREE.UnsignedByteType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false,
    });

    const pu = this.post.material.uniforms;
    pu.tColor.value = this.sceneTarget.texture;
    pu.tDepth.value = this.sceneTarget.depthTexture;
    pu.uRes.value.set(this.rtWidth, this.rtHeight);
    const bu = this.blit.material.uniforms;
    bu.tPost.value = this.postTarget.texture;
    bu.uScale.value = scale;
    return true;
  }

  /** Bildschirmkoordinaten (CSS-Pixel) -> Pixel der Oberfläche. */
  clientToGame(clientX, clientY) {
    return {
      x: Math.floor((clientX * this.dpr) / this.uiScale),
      y: Math.floor((clientY * this.dpr) / this.uiScale),
    };
  }

  /** Szenenpixel pro Oberflächenpixel (z. B. 1/3 bei Full HD: Szene 1:1, Oberfläche ×3). */
  get uiToScene() {
    return this.uiScale / this.scale;
  }

  /**
   * @param {THREE.Scene} scene
   * @param {import('./cameraRig.js').CameraRig} rig
   * @param {object} look Werte aus dem Tag-Nacht-System (exposure, tint, …)
   */
  render(scene, rig, look) {
    const r = this.renderer;
    r.info.reset();

    // 1. Schattenkarte mit Stellvertretern (SHADOW_LAYER) aktualisieren.
    r.shadowMap.needsUpdate = true;
    r.setRenderTarget(this.shadowPassTarget);
    r.render(scene, this.shadowPassCamera);

    // 2. Szene in Spielauflösung.
    r.setRenderTarget(this.sceneTarget);
    r.render(scene, rig.camera);

    const pu = this.post.material.uniforms;
    pu.uNear.value = rig.camera.near;
    pu.uFar.value = rig.camera.far;
    pu.uDitherOffset.value.copy(rig.ditherOffset);
    if (look) {
      pu.uExposure.value = look.exposure;
      pu.uTint.value.copy(look.tint);
      pu.uSaturation.value = look.saturation;
      pu.uVignette.value = look.vignette;
      pu.uVignetteColor.value.copy(look.vignetteColor);
      pu.uOutlineTint.value.copy(look.outlineTint);
    }
    r.setRenderTarget(this.postTarget);
    r.render(this.post.scene, this.quadCamera);

    const bu = this.blit.material.uniforms;
    // Restversatz der eingerasteten Kamera in ganzen Gerätepixeln ausgleichen.
    bu.uOffset.value.set(Math.round(rig.residual.x * this.scale), Math.round(rig.residual.y * this.scale));
    r.setRenderTarget(null);
    r.render(this.blit.scene, this.quadCamera);
  }
}
