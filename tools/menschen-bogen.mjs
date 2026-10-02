// Musterbogen der Menschen-Sprites (F4): backt die Bilder ohne Browser und schreibt ein PNG zum
// Ansehen – alle acht Richtungen, Gehen und Rennen, die Taten mit dem Werkzeug als eigenem Bild,
// die Laterne, alle Gesichter und eine Reihe in Spielgröße; seit F7 die seltenen Posen (Kartentisch
// mit Tick, Angeln, Schießen, Pfiff, Wirbel, Drachen) mit ihrem Werkzeug. Nichts davon läuft im Spiel.
//
//   node tools/menschen-bogen.mjs [datei.png] [--figur=mika] [--aussehen=frau,orange,gruen,braun,mittel]
//                                 [--werkzeug=axt] [--zoom=3]

import { writeFileSync } from 'node:fs';
import { encodePng, Canvas } from './bogen-png.mjs';
import { bakePerson, bakeTool, PERSON_IDS, animsOf } from '../src/entities/peopleSprites.js';
import { PEOPLE, MIKA_BASE, TOOLS } from '../src/entities/peopleKinds.js';
import { lookSpec, LOOK_KEYS, DEFAULT_LOOK } from '../src/data/looks.js';
import { RAMPS } from '../src/render/palette.js';

const args = process.argv.slice(2);
const opt = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const out = args.find((a) => !a.startsWith('--')) || 'menschen-bogen.png';
const ZOOM = Number(opt('zoom', 3));
const ID = opt('figur', 'mika');
const TOOL = opt('werkzeug', ID === 'mika' ? 'axt' : null); // die Leute tragen nichts auf dem Rücken
if (!PERSON_IDS.includes(ID)) throw new Error(`Unbekannte Figur ${ID} (bekannt: ${PERSON_IDS.join(', ')})`);
if (TOOL && !TOOLS[TOOL]) throw new Error(`Unbekanntes Werkzeug ${TOOL}`);
const lookArg = opt('aussehen', null);
const look = { ...DEFAULT_LOOK };
if (lookArg) lookArg.split(',').forEach((v, i) => (look[LOOK_KEYS[i]] = v));
const kind = PEOPLE[ID];
const spec = ID === 'mika' ? lookSpec(MIKA_BASE, look) : kind.spec || {};

const t0 = performance.now();
let baked = 0;
const cache = new Map();
/** Der Teil, der einen Zustand enthält (mit oder ohne Laterne). */
function partOf(anim, lantern) {
  for (const [name, p] of Object.entries(kind.parts)) if (p.anims.includes(anim) && Boolean(p.lantern) === lantern) return name;
  return null;
}
function frame(d, anim, k, lantern = false) {
  const part = partOf(anim, lantern);
  if (!part) return null;
  const key = `${part}:${d}:${anim}:${k}`;
  if (!cache.has(key)) {
    cache.set(key, bakePerson(ID, spec, part, d, anim, k));
    baked++;
  }
  return cache.get(key);
}
const toolCache = new Map();
function tool(id, d, bucket) {
  const key = `${id}:${d}:${bucket}`;
  if (!toolCache.has(key)) toolCache.set(key, bakeTool(id, d, bucket));
  return toolCache.get(key);
}

const GRASS = RAMPS.g[4];
const GRASS_DARK = RAMPS.g[3];
const PAPER = 0xe8e0cc;
const SHADOW = 0x1f4226;
const anims = animsOf(ID);

/**
 * Figur mit Werkzeug (in der Hand oder auf dem Rücken) und Gesicht zeichnen; `item` ist ein eigenes
 * Werkzeug der Zelle (F7: Angel, Spule, Waffe), `layer[4]` dreht es um Achtel zur rechten Seite.
 */
function draw(cv, f, d, fx, fy, zoom, { held = false, back = false, expr = null, item = null } = {}) {
  const layer = held || item ? f.anchors.hand : back ? f.anchors.back : null;
  const id = item || TOOL;
  const t = layer && id ? tool(id, (d + (layer[4] || 0)) & 7, layer[2]) : null;
  const putTool = () => cv.frame(t, fx + Math.round(layer[0] * zoom), fy - Math.round(layer[1] * zoom), zoom);
  if (t?.w && !layer[3]) putTool();
  cv.frame(f, fx, fy, zoom, { shadowColor: SHADOW });
  if (expr && f.patches[expr]) cv.frame(f, fx, fy, zoom, { only: f.patches[expr].mask, color: f.patches[expr].color });
  if (t?.w && layer[3]) putTool();
}

const NAMES = ['S', 'SO', 'O', 'NO', 'N', 'NW', 'W', 'SW'];
const seq = (anim, d, lantern = false, extra = {}) => Array.from({ length: anims[anim] || 0 }, (_, k) => ({ d, anim, k, lantern, ...extra }));
const rows = [
  { label: 'stehen (Werkzeug auf dem Rücken)', cells: NAMES.map((_, d) => ({ d, anim: 'stehen', k: 0, back: true })) },
  { label: 'gehen S, O', cells: [...seq('gehen', 0), ...seq('gehen', 2)] },
  { label: 'gehen N, rennen SO', cells: [...seq('gehen', 4, false, { back: true }), ...seq('rennen', 1)] },
];
if (kind.parts.aktion) {
  rows.push({ label: 'schwung S, SO, O, N', cells: [0, 1, 2, 4].flatMap((d) => seq('schwung', d, false, { held: true })).slice(0, 16) });
  rows.push({ label: 'treffer, rolle, suchen, wurf, jubel, blitz', cells: [...seq('treffer', 1), ...seq('rolle', 2), ...seq('suchen', 1), ...seq('wurf', 1, false, { held: true }), ...seq('jubel', 0), ...seq('blitz', 1)] });
}
if (kind.parts.laterne) {
  rows.push({ label: 'Laterne: stehen in acht Richtungen, gehen S', cells: [...NAMES.map((_, d) => ({ d, anim: 'stehen', k: 0, lantern: true })), ...seq('gehen', 0, true)] });
}
// F7: seltene Posen mit ihrem Werkzeug
if (kind.parts.sitz) rows.push({ label: 'Kartentisch S, W; Angeln N (warten, ausholen, Wurf, Drill), O', cells: [...seq('karten', 0), ...seq('karten', 6), ...seq('angeln', 4, false, { item: 'angel' }), { d: 2, anim: 'angeln', k: 0, item: 'angel' }] });
if (kind.parts.waffe && ID === 'mika') rows.push({ label: 'Pistole, Flinte, Pfiff, Wirbel, Drachen', cells: [...seq('schiessen', 1, false, { item: 'pistole' }), ...seq('anschlag', 2, false, { item: 'doppelflinte' }), { d: 0, anim: 'pfiff', k: 0, back: true }, { d: 1, anim: 'wirbel', k: 0, item: 'axt' }, { d: 3, anim: 'wirbel', k: 0, item: 'axt' }, ...seq('drachen', 0, false, { item: 'spule' }), { d: 1, anim: 'drachen', k: 0, item: 'spule' }] });
if (kind.parts.karten) rows.push({ label: 'Kartentisch S, W, Tick SO', cells: [...seq('karten', 0), { d: 6, anim: 'karten', k: 0 }, ...seq('tick', 1)] });
if (kind.parts.angeln) rows.push({ label: 'Angeln N, O; Waffe: Anschlag, Schuss, Hieb, Daumen', cells: [{ d: 4, anim: 'angeln', k: 0, item: 'angel' }, { d: 2, anim: 'angeln', k: 0, item: 'angel' }, ...seq('anschlag', 1, false, { item: 'doppelflinte' }), ...seq('schiessen', 0, false, { item: 'pistole' }), { d: 1, anim: 'schwung', k: 0, item: 'spaltaxt' }, { d: 1, anim: 'schwung', k: 2, item: 'spaltaxt' }, { d: 0, anim: 'daumen', k: 0 }] });
// A1: das Tagwerk (je Richtung S, SO, O, W beide Bilder)
if (kind.parts.alltag) rows.push({ label: `Tagwerk: ${kind.parts.alltag.anims.join(', ')} – S, SO, O, W`, cells: kind.parts.alltag.anims.flatMap((anim) => [0, 1, 2, 6].flatMap((d) => seq(anim, d))).slice(0, 16) });
if (kind.parts.drachen) rows.push({ label: 'Drachen S, SW; nachschauen', cells: [...seq('drachen', 0, false, { item: 'spule' }), ...seq('drachen', 7, false, { item: 'spule' }), ...seq('gucken', 0), { d: 1, anim: 'gucken', k: 0 }] });
if (kind.expressions) {
  rows.push({ label: 'Gesichter S', cells: kind.expressions.map((expr) => ({ d: 0, anim: 'stehen', k: 0, expr })) });
  rows.push({ label: 'Gesichter SO, O', cells: kind.expressions.flatMap((expr) => [{ d: 1, anim: 'stehen', k: 0, expr }, { d: 2, anim: 'stehen', k: 0, expr }]).slice(0, 16) });
}

const probe = frame(0, 'stehen', 0);
const cw = 46 * ZOOM;
const ch = (kind.parts.sitz || kind.parts.angeln ? 96 : 70) * ZOOM; // F7: Platz für die Angel
const gap = 6;
const cols = Math.max(...rows.map((r) => r.cells.length));
const gameH = 70 * 2 + 20;
const W = cols * (cw + gap) + gap;
const H = rows.length * (ch + gap) + gap + gameH;
const cv = new Canvas(W, H, PAPER);
rows.forEach((row, r) => {
  row.cells.forEach((c, n) => {
    const f = frame(c.d, c.anim, c.k, Boolean(c.lantern));
    if (!f) return;
    const x = gap + n * (cw + gap);
    const y = gap + r * (ch + gap);
    cv.fill(x, y, cw, ch, (n + r) % 2 ? GRASS : GRASS_DARK);
    draw(cv, f, c.d, x + Math.round(cw / 2), y + ch - 8 * ZOOM, ZOOM, c);
  });
});
// Unten in Spielgröße (2 × 2 Pixel je Texel) auf Gras
const gy = rows.length * (ch + gap) + gap;
cv.fill(0, gy, W, gameH, GRASS);
const lineup = [
  { d: 0, anim: 'stehen', k: 0 },
  { d: 1, anim: 'gehen', k: 1, back: true },
  { d: 2, anim: 'gehen', k: 3, back: true },
  { d: 3, anim: 'gehen', k: 0, back: true },
  { d: 4, anim: 'stehen', k: 0, back: true },
  { d: 6, anim: 'rennen', k: 2 },
  { d: 7, anim: 'stehen', k: 1, expr: 'froh' },
  { d: 0, anim: 'stehen', k: 0, lantern: true },
  { d: 1, anim: 'gehen', k: 2, lantern: true },
  { d: 0, anim: 'schwung', k: 0, held: true },
  { d: 0, anim: 'schwung', k: 2, held: true },
];
lineup.forEach((c, n) => {
  const f = frame(c.d, c.anim, c.k, Boolean(c.lantern));
  if (f) draw(cv, f, c.d, 40 + n * 70, gy + gameH - 22, 2, c);
});
writeFileSync(out, encodePng(W, H, cv.px));
console.log(`${out}: ${W} × ${H}, ${baked} Bilder in ${Math.round(performance.now() - t0)} ms (Zelle ${probe.w} × ${probe.h})`);
