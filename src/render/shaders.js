// GLSL-Bausteine für den Pixel-Renderer. three.js übersetzt ShaderMaterial immer
// als GLSL ES 3.00, daher stehen texelFetch, Integer-Arithmetik und Arrays bereit.

/** Geordnetes 4×4-Dithering. Liefert Schwellwerte in (0, 1). */
export const BAYER_GLSL = /* glsl */ `
float bayer4(ivec2 p) {
  const int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[(p.y & 3) * 4 + (p.x & 3)]) + 0.5) / 16.0;
}
`;

export const FULLSCREEN_VERT = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Post-Pass in Spielauflösung:
 * Umrisse aus Tiefensprüngen, helle Kanten an Außenecken (Normalen aus der
 * Tiefe rekonstruiert), Farbgebung, Vignette, Dithering und Palettenabbildung.
 */
export const POST_FRAG = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tLut;
uniform vec2 uRes;
uniform float uPx;
uniform float uNear;
uniform float uFar;
uniform float uDepthEdge;
uniform float uNormalEdge;
uniform float uDarken;
uniform float uHighlight;
uniform vec3 uOutlineTint;
uniform float uDither;
uniform float uPaletteMix;
uniform float uLutSize;
uniform float uExposure;
uniform vec3 uTint;
uniform float uSaturation;
uniform float uVignette;
uniform vec3 uVignetteColor;
uniform vec4 uHaze;
uniform ivec2 uDitherOffset;

${BAYER_GLSL}

float depthAt(ivec2 p) {
  p = clamp(p, ivec2(0), ivec2(uRes) - 1);
  return uNear + texelFetch(tDepth, p, 0).r * (uFar - uNear);
}

// Normale im Kameraraum aus den Tiefen der Nachbarn. Es wird jeweils die Seite
// mit dem kleineren Tiefensprung genommen, damit Kanten die Fläche nicht verfälschen.
vec3 normalAt(ivec2 p, out vec2 slope) {
  float c = depthAt(p);
  float l = depthAt(p - ivec2(1, 0));
  float r = depthAt(p + ivec2(1, 0));
  float d = depthAt(p - ivec2(0, 1));
  float u = depthAt(p + ivec2(0, 1));
  float sx = abs(r - c) < abs(c - l) ? r - c : c - l;
  float sy = abs(u - c) < abs(c - d) ? u - c : c - d;
  slope = vec2(sx, sy);
  return normalize(vec3(sx, sy, uPx));
}

vec3 paletteLookup(vec3 c) {
  float m = uLutSize - 1.0;
  vec3 q = floor(clamp(c, 0.0, 1.0) * m + 0.5);
  ivec2 t = ivec2(int(q.r) + int(q.b) * int(uLutSize), int(q.g));
  return texelFetch(tLut, t, 0).rgb;
}

vec3 linearToSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

vec3 softClip(vec3 c) {
  vec3 over = max(c - 0.78, 0.0);
  return min(c, 0.78) + over / (1.0 + over * 1.5);
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec3 col = texelFetch(tColor, p, 0).rgb;
  float raw = texelFetch(tDepth, p, 0).r;
  float dC = uNear + raw * (uFar - uNear);

  vec2 sC;
  vec3 nC = normalAt(p, sC);

  float silhouette = 0.0;
  float crease = 0.0;
  const ivec2 dirs[4] = ivec2[4](ivec2(1, 0), ivec2(-1, 0), ivec2(0, 1), ivec2(0, -1));
  for (int i = 0; i < 4; i++) {
    ivec2 q = p + dirs[i];
    float dN = depthAt(q);
    // Nachbar liegt deutlich weiter hinten: wir sind der Rand eines Objekts.
    if (dN - dC > uDepthEdge) silhouette = 1.0;
    // Außenecke: Normale knickt und der Nachbar liegt hinter unserer Ebene.
    vec2 sN;
    vec3 nN = normalAt(q, sN);
    float predicted = dC + dot(vec2(dirs[i]), sC);
    float convex = step(uPx * 0.25, dN - predicted);
    vec3 nd = nC - nN;
    float upward = step(0.02, dot(nd, vec3(0.15, 1.0, 0.35)));
    crease = max(crease, step(uNormalEdge, length(nd)) * convex * upward);
  }
  if (raw >= 0.99999) {
    silhouette = 0.0;
    crease = 0.0;
  }

  if (silhouette > 0.5) {
    col *= (1.0 - uDarken) * uOutlineTint;
  } else if (crease > 0.5) {
    col = col * (1.0 + uHighlight) + vec3(0.004);
  }

  // Farbgebung je Tageszeit. Tönung und Entsättigung wirken nur auf dunkle
  // und mittlere Töne – helle, warme Lichtquellen bleiben warm.
  col *= uExposure;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float keep = smoothstep(0.22, 0.75, lum);
  col *= mix(uTint, vec3(1.0), keep);
  col = max(mix(vec3(lum), col, mix(uSaturation, 1.0, keep)), 0.0);

  vec3 s = linearToSrgb(softClip(col));
  s += (bayer4(p + uDitherOffset) - 0.5) * uDither;
  vec3 pal = paletteLookup(s);
  vec3 outColor = mix(clamp(s, 0.0, 1.0), pal, uPaletteMix);

  // Dunst und Vignette hängen am Bild, nicht an der Welt – darum erst nach dem Raster der
  // Palette und weich (Rückmeldung 30.09.: »der Nebel flackert immer noch«). Vorher lagen
  // sie davor: Beim Gehen nach Norden glitt die Welt unter dem Verlauf hindurch, und je Bild
  // kippten Tausende Pixel über dem See zwischen zwei Palettenfarben hin und her.
  // M33: Luftperspektive – nach Norden (oben im Bild) ein leichter Dunst
  float haze = smoothstep(0.42, 1.0, gl_FragCoord.y / uRes.y) * uHaze.a * (1.0 - keep * 0.7);
  outColor = mix(outColor, linearToSrgb(uHaze.rgb), haze);
  // Vignette: Ränder weich in die Nachtfarbe ziehen
  vec2 v = (gl_FragCoord.xy / uRes - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float vig = smoothstep(0.42, 1.0, length(v) * 1.08);
  outColor = mix(outColor, outColor * linearToSrgb(uVignetteColor), vig * uVignette);
  gl_FragColor = vec4(outColor, 1.0);
}
`;

/** Ganzzahliges Hochskalieren auf den Bildschirm mit Subpixel-Versatz der Kamera. */
export const BLIT_FRAG = /* glsl */ `
uniform sampler2D tPost;
uniform float uScale;
uniform vec2 uOffset;
uniform ivec2 uMargin;

void main() {
  ivec2 p = ivec2(floor((gl_FragCoord.xy + uOffset) / uScale)) + uMargin;
  gl_FragColor = vec4(texelFetch(tPost, p, 0).rgb, 1.0);
}
`;
