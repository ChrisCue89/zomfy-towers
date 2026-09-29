// Der Schnitt: Zeitachse des Trailers (60 s, 30 Bilder/s). Siehe ../STORYBOARD.md.
// Zeiten in Sekunden. Taktschläge stammen aus dem Ton (Stücke des Spiels):
//   titel 72 BPM ab 2,5 s · nacht 126 BPM ab 16,0 s · titel-Mittelteil ab 31,233 s · boss 138 BPM ab 41,233 s

import { W, H, FPS, clamp, lerp, smooth, ramp, pulse } from './util.js';
import { shot } from './shots.js';
import { narrate, slam, nameTag, particles, studio, title, fadeToBlack, sticker } from './layers.js';
import { ditherFill } from './fx.js';

export const DURATION = 60;

// --- Zeitgerüst
export const T = {
  titel: 2.5,
  night: 16.0,
  zu: 31.2333,
  boss: 41.2333,
  end: 51.6667,
  title: 56.0,
};
const BEAT = { titel: 60 / 72, night: 60 / 126, boss: 60 / 138 };
export const nb = (k) => T.night + k * BEAT.night; // Taktschläge der Nacht
export const bb = (k) => T.boss + k * BEAT.boss; // Taktschläge des Bosses
export const zb = (k) => T.zu + k * BEAT.titel;
export const tb = (k) => T.titel + k * BEAT.titel;

const S = (n) => `/game/screenshots/${n}.png`;
const STAND = {
  reaktionen: 'reaktionen', 'hud-frost': 'finale', 'balduin-frag': 'dialog',
  'see-morgen': 'haendler', 'haus-morgen': 'titel', sammeln: 'tag', bauen: 'turm-bauen', einrichten: 'innen', 'feuer-abend': 'abend',
  daemmerung: 'abend', 'wald-moder': 'moder-nacht', 'turm-bauen-nacht': 'nacht', 'turm-feuer': 'horde', barrikade: 'barrikaden', nahkampf: 'nahkampf',
  'reaktion-eisblock': 'reaktionen', 'reaktion-dampf': 'reaktionen', 'reaktion-kleber': 'reaktionen', 'boss-holzfaeller': 'boss', 'champion-beute': 'champion',
  'lager-tor': 'lager-nacht', 'wege-weit': 'nachtplan', morgenbericht: 'bericht', 'hilde-kommt': 'ueberlebende', 'leute-feuer': 'gaeste',
  'nah-hilde': 'ueberlebende', 'nah-juna': 'gaeste', 'nah-bert': 'ueberlebende', 'nah-yusuf': 'gaeste', 'nah-knopf': 'ueberlebende', 'karten-kamin': 'kartenabend-kamin',
  'haendler-boot': 'haendler', 'frost-nacht': 'finale', moderherz: 'finale', leuchtfeuer: 'schnee', 'herz-zerfall': 'finale', 'frost-morgen': 'abspann', 'balduin-dialog': 'dialog',
};
const sh = (clip, at, dur, o = {}) => shot({ clip, at, dur, standin: S(STAND[clip] || 'titel'), ...o });

export const layers = [];
const add = (...l) => layers.push(...l.flat());

// ============================================================================
// STUDIO  0,0 – 2,5
// ============================================================================
add(studio(0, 2.6));

// ============================================================================
// AKT I · EIN ZUHAUSE  2,5 – 12,5   (titel, 72 BPM: Schlag 0,833 s, Takt 3,33 s)
// ============================================================================
add(
  // Steg im Morgenlicht, langsam (100 Bilder über 4,3 s)
  sh('see-morgen', 2.0, tb(4) - 2.0 + 0.5, { speed: 0.78, tin: { kind: 'dither', dur: 0.6 }, zoom: [1.0, 1.06], pan: [[0, 0], [-24, 6]] }),
  // Mika tritt aus dem Haus und geht zum Feuer
  sh('haus-morgen', tb(4), tb(8) - tb(4) + 0.4, { from: 6, speed: 0.82, tin: { kind: 'dither', dur: 0.5, mode: 'right' } }),
  // Tagsüber: sammeln, bauen, einrichten (auf den Schlägen der Spieluhr)
  sh('sammeln', tb(8), 2 * BEAT.titel, { speed: 0.8 }),
  sh('bauen', tb(10), BEAT.titel),
  sh('einrichten', tb(11), BEAT.titel + 0.05),
  // Blick in den Wald: der Moder schaut kurz durchs Fenster (je 4 Bilder)
  sh('wald-moder', tb(10) + 0.42, 4 / FPS, { ui: false, from: 40, grade: 'cold' }),
  sh('wald-moder', tb(11) + 0.32, 4 / FPS, { ui: false, from: 52, grade: 'cold' }),
  particles('leaves', 2.3, 12.5, { count: 22, seed: 4, alpha: 0.9, speed: 0.8 }),
  narrate('Die Welt ist still geworden.', 2.9, 2.6),
  narrate('Am Stillsee brennt noch {Licht.}', 6.2, 2.7),
  narrate('Tagsüber baust du dir ein {Zuhause.}', 9.3, 3.0),
);

// ============================================================================
// DIE WENDE  12,5 – 16,0
// ============================================================================
add(
  sh('daemmerung', 12.5, 2.85, { ui: false, from: 4, speed: 0.95, tin: { kind: 'dither', dur: 0.5 } }),
  sh('wald-moder', 14.7, 1.3 + 0.1, { ui: false, from: 46, tin: { kind: 'dither', dur: 0.45, mode: 'right' } }),
  particles('spores', 14.4, 16.0, { count: 34, seed: 2, fi: 0.4, fo: 0.05 }),
  narrate('Nachts …', 12.7, 1.6, { tone: 'cold' }),
  narrate('… kommt der Wald zu Besuch.', 14.35, 1.6, { tone: 'cold' }),
);

// ============================================================================
// AKT II · DIE NACHT  16,0 – 31,23   (nacht, 126 BPM; Schlag 0,476 s, Takt 1,905 s)
// ============================================================================
const BAR = 4 * BEAT.night;
add(
  // Takt 1: Türme neben dem Weg
  sh('turm-feuer', nb(0), BAR, { from: 0 }),
  // Takt 2: Barrikaden darauf
  sh('barrikade', nb(4), BAR, { from: 0 }),
  // Takt 3: und du mittendrin
  sh('nahkampf', nb(8), BAR, { from: 4 }),
  // Takt 4: Reaktionen (drei Wörter des Spiels), dann Türme
  sh('reaktionen', nb(12), BEAT.night, { from: 4 }),
  sh('reaktionen', nb(13), BEAT.night, { from: 16 }),
  sh('reaktionen', nb(14), BEAT.night, { from: 48 }),
  sh('turm-feuer', nb(15), BEAT.night, { from: 60 }),
  // Takt 5: ein Boss
  sh('boss-holzfaeller', nb(16), 2 * BEAT.night, { from: 16 }),
  sh('lager-tor', nb(18), 2 * BEAT.night, { from: 8 }),
  // Takt 6: 30 Nächte
  sh('turm-feuer', nb(20), 2 * BEAT.night, { from: 62 }),
  sh('lager-tor', nb(22), 2 * BEAT.night, { from: 32 }),
  // Takt 7: Stakkato im Schlag
  sh('barrikade', nb(24), BEAT.night, { from: 40 }),
  sh('nahkampf', nb(25), BEAT.night, { from: 42 }),
  sh('lager-tor', nb(26), BEAT.night, { from: 0 }),
  sh('turm-feuer', nb(27), BEAT.night + 0.8, { from: 20 }),
  // Takt 8: Morgen. Nacht überstanden.
  sh('morgenbericht', nb(28), T.zu - nb(28) + 0.65, { tin: { kind: 'dither', dur: 0.7, mode: 'up' }, ui: { rects: [[108, 78, 428, 174]] } }),
  slam('TÜRME', nb(0), BAR - 0.05, { sub: 'neben dem Weg.' }),
  slam('BARRIKADEN', nb(4), BAR - 0.05, { sub: 'darauf.', scale: 12 }),
  slam('UND DU', nb(8), BAR - 0.05, { sub: 'mittendrin.' }),
  slam('EIN BOSS', nb(16), BAR - 0.05, { sub: 'in jeder fünften Nacht.', look: 'red', scale: 12 }),
  slam('30 NÄCHTE', nb(20), 2 * BAR - 0.05, { sub: 'ein Herbst.', scale: 12 }),
);

// ============================================================================
// AKT III · ZUFLUCHT  31,23 – 41,23   (titel-Mittelteil, Schlag 0,833 s)
// ============================================================================
add(
  sh('leute-feuer', T.zu, 4 * BEAT.titel + 0.1, { speed: 0.6, zoom: [1.0, 1.05], tin: { kind: 'dither', dur: 0.5 } }),
  sh('nah-hilde', zb(4), 0.667, { from: 4 }),
  sh('nah-juna', zb(4) + 0.667, 0.667, { from: 4 }),
  sh('nah-bert', zb(4) + 1.333, 0.667, { from: 4 }),
  sh('nah-yusuf', zb(4) + 2.0, 0.667, { from: 4 }),
  sh('nah-knopf', zb(4) + 2.667, 0.667, { from: 4 }),
  sh('karten-kamin', zb(8), 2 * BEAT.titel + 0.05, { from: 8, ui: false, zoom: [1.86, 1.9], pan: [[0, 70], [0, 60]] }),
  sticker('karten-kamin', 40, [8, 8, 192, 62], zb(8) + 0.12, 2 * BEAT.titel - 0.1, { x: 372, y: 190, scale: 3 }),
  sticker('karten-kamin', 40, [244, 294, 152, 42], zb(8) + 0.5, 2 * BEAT.titel - 0.5, { x: W / 2, y: 900, scale: 4, dy: 60 }),
  sh('haendler-boot', zb(10), 2 * BEAT.titel + 0.1, { from: 34, speed: 0.85 }),
  narrate('Und du bist nicht {allein.}', T.zu + 0.5, 2.7),
  nameTag('Hilde', 'ehemalige Postbotin', zb(4), 0.667),
  nameTag('Juna', 'Funkbastlerin', zb(4) + 0.667, 0.667),
  nameTag('Bert', 'Baumarkt-Verkäufer', zb(4) + 1.333, 0.667),
  nameTag('Dr. Yusuf', 'Tierarzt', zb(4) + 2.0, 0.667),
  nameTag('Knopf', 'Hund', zb(4) + 2.667, 0.667),
  narrate('Kartenabend am Kamin. Handel am Steg.', zb(8) + 0.2, 3.0),
);

// Luft holen: Bild wird schwarz, nur die Uhrentafel der Frostnacht leuchtet, zwei Herzschläge (40,7 / 41,0)
add(
  { t0: 40.32, t1: T.boss, z: 22, space: 'over', draw(ctx, t) { ditherFill(ctx, '#0d0b18', ramp(t, 40.32, 40.62)); } },
  sticker('hud-frost', 0, [4, 4, 149, 34], 40.62, T.boss - 40.62, { x: W / 2, y: H / 2, scale: 9, glow: '150,190,255' }),
);

// ============================================================================
// AKT IV · FROSTNACHT  41,23 – 51,67   (boss, 138 BPM; Schlag 0,435 s, Takt 1,739 s)
// ============================================================================
const BBAR = 4 * BEAT.boss;
add(
  sh('frost-nacht', bb(0), 2 * BBAR + 0.05, { from: 0, ui: { rects: [[0, 32, 640, 328], [0, 0, 205, 32], [435, 0, 205, 32]] } }),
  sh('moderherz', bb(8), 2 * BBAR + 0.05, { from: 0 }),
  sh('leuchtfeuer', bb(16), 51.4 - bb(16), { from: 0, speed: 0.6 }),
  // das Herz fällt in Bild 8 des Clips: genau auf den Schlussschlag der Musik (T.end)
  sh('herz-zerfall', T.end - 8 / FPS, 1.55, { from: 0 }),
  particles('snow', T.boss, T.end + 0.5, { count: 110, seed: 6, alpha: 0.9, speed: 1.1, wind: 55, z: 6 }),
  sticker('hud-frost', 0, [225, 4, 190, 55], bb(1), 2 * BBAR - 0.4, { x: W / 2, y: 118, scale: 3 }),
  slam('DER ERSTE FROST', bb(0), 2 * BBAR - 0.05, { look: 'ice', scale: 12 }),
  slam('DAS MODERHERZ', bb(8), 2 * BBAR - 0.05, { look: 'violet', scale: 12, sub: 'erwacht.' }),
  slam('HALTE DAS LICHT.', bb(16), 2 * BBAR - 0.1, { look: 'gold', scale: 12 }),
);

// ============================================================================
// AUSKLANG  51,67 – 60
// ============================================================================
add(
  sh('frost-morgen', 52.2, 2.25, { from: 4, zoom: [1.0, 1.05], tin: { kind: 'dither', dur: 0.6 } }),
  sh('balduin-frag', 53.85, 2.4, { from: 0, ui: { rects: [[96, 262, 448, 92]] }, zoom: [1.0, 1.1], pan: [[0, 0], [0, -34]], tin: { kind: 'dither', dur: 0.4 } }),
  narrate('Am Morgen liegt {Schnee.}', 52.1, 1.9),
  title(T.title, DURATION),
);
add(fadeToBlack(59.55, 60.0, true));

// ============================================================================
// Farbgebung, Wackeln, Blitze
// ============================================================================
const GRADES = [
  // t, { sat, contrast, bright, vignette, bloom, warm, cold }
  [0.0, { sat: 1, contrast: 1, bright: 1, vignette: 0.3, bloom: 0.2, warm: 0, cold: 0 }],
  [2.5, { sat: 1.08, contrast: 1.03, bright: 1.0, vignette: 0.32, bloom: 0.25, warm: 0.16, cold: 0 }],
  [12.0, { sat: 1.08, contrast: 1.03, bright: 1.0, vignette: 0.34, bloom: 0.25, warm: 0.16, cold: 0 }],
  [14.5, { sat: 0.98, contrast: 1.06, bright: 1.05, vignette: 0.48, bloom: 0.3, warm: 0.02, cold: 0.2 }],
  [16.0, { sat: 1.0, contrast: 1.06, bright: 1.1, vignette: 0.5, bloom: 0.34, warm: 0, cold: 0.18 }],
  [29.3, { sat: 1.0, contrast: 1.06, bright: 1.1, vignette: 0.5, bloom: 0.34, warm: 0, cold: 0.18 }],
  [31.0, { sat: 1.08, contrast: 1.03, bright: 1.0, vignette: 0.34, bloom: 0.26, warm: 0.16, cold: 0 }],
  [40.6, { sat: 1.08, contrast: 1.03, bright: 1.0, vignette: 0.34, bloom: 0.26, warm: 0.16, cold: 0 }],
  [41.3, { sat: 0.86, contrast: 1.07, bright: 1.12, vignette: 0.52, bloom: 0.36, warm: 0, cold: 0.24 }],
  [51.4, { sat: 0.86, contrast: 1.07, bright: 1.12, vignette: 0.52, bloom: 0.36, warm: 0, cold: 0.24 }],
  [52.4, { sat: 1.05, contrast: 1.02, bright: 1.02, vignette: 0.34, bloom: 0.28, warm: 0.12, cold: 0 }],
  [60, { sat: 1.05, contrast: 1.02, bright: 1.02, vignette: 0.34, bloom: 0.28, warm: 0.12, cold: 0 }],
];
export function gradeAt(t) {
  let i = 0;
  while (i < GRADES.length - 2 && GRADES[i + 1][0] <= t) i++;
  const [ta, a] = GRADES[i];
  const [tb2, b] = GRADES[i + 1];
  const u = smooth(clamp((t - ta) / (tb2 - ta)));
  const m = (k) => lerp(a[k], b[k], u);
  const g = { sat: m('sat'), contrast: m('contrast'), bright: m('bright'), vignette: m('vignette'), bloom: m('bloom'), tints: [] };
  if (m('warm') > 0.005) g.tints.push(['#ffb35c', m('warm'), 'soft-light']);
  if (m('cold') > 0.005) g.tints.push(['#4f6cc0', m('cold'), 'soft-light']);
  return g;
}

// [zeit, stärke in Pixeln]
export const shakes = [
  [T.night, 27], [T.boss, 27], [nb(8), 9], [nb(16) + 22 / 30, 18], [T.end, 21], [bb(8), 15], [bb(16), 12], [T.title + 0.66, 9],
];
// [zeit, stärke, abklingen]
const FLASHES = [[T.night, 0.85, 7], [T.boss, 0.8, 7], [nb(8), 0.25, 9], [nb(16), 0.3, 9], [bb(8), 0.35, 8], [bb(16), 0.3, 8], [T.end, 0.55, 6], [T.title, 0.35, 4], [T.title + 0.66, 0.25, 5]];
export const flashColor = '#fff2c8';
export function flashAt(t) {
  let a = 0;
  for (const [t0, k, d] of FLASHES) if (t >= t0) a = Math.max(a, k * Math.exp(-(t - t0) * d));
  return a < 0.01 ? 0 : a;
}
export const finalPass = null;

export function clipNames() {
  return [...new Set(layers.filter((l) => l.kind === 'shot').map((l) => l.spec.clip))];
}
