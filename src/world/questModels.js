// Fundstücke der Nebenaufträge (M23): Hildes Garnkorb, Junas Antennenteile,
// Berts roter Werkzeugkasten – im Maß 1/32 m (FINE32), klein und in kräftigen
// Farben, damit man sie neben dem Weg im Laub findet. Darüber funkelt es ab
// und zu (wie bei der Beute).

import { VoxelModel } from '../render/voxel.js';
import { P } from '../render/palette.js';
import { shade, edgeLight } from './voxelKit.js';

/** Weidenkorb mit drei Garnknäueln und Stricknadeln. */
function garnModel() {
  const m = new VoxelModel();
  // Korb: geflochten (Wechsel hell/dunkel), oben ein Rand
  m.box(-7, 0, -4, 6, 5, 3, (x, y, z) => {
    if (x > -7 && x < 6 && z > -4 && z < 3 && y > 0) return null; // hohl
    return y === 5 ? P.e6 : (x + y + z) % 2 ? P.e5 : P.e4;
  });
  // Knäuel ragen aus dem Korb: rot, blau, senfgelb (Fadenlinien im Wechsel)
  const ball = (cx, cz, a, b) => m.ellipsoid(cx, 6, cz, 2.8, 2.6, 2.6, (x, y) => ((x + y) % 3 === 0 ? b : a));
  ball(-3.5, -1, P.r3, P.r2);
  ball(2.5, -1.5, P.b3, P.b2);
  ball(-0.5, 1.5, P.f6, P.f5);
  // Stricknadeln schräg im blauen Knäuel, mit Kugel am Ende
  m.line(2, 6, -2, 6, 12, -3, P.s7);
  m.line(3, 6, -1, 7, 11, 0, P.s6);
  m.set(6, 13, -3, P.r4).set(7, 12, 0, P.r4);
  // Loser Faden hängt über den Rand
  m.set(-7, 4, 0, P.r3).set(-8, 3, 0, P.r3).set(-8, 2, 1, P.r3).set(-8, 1, 1, P.r3);
  edgeLight(m);
  return m;
}

/** Stück einer Antenne: Stab mit Querstreben, rote Spitze, Kabel. */
function antenneModel() {
  const m = new VoxelModel();
  // Liegt schräg auf einem kleinen Stein
  m.ellipsoid(4, 1, 0, 3, 2, 2.5, (x, y) => (y >= 2 ? P.s6 : P.s4));
  m.line(-9, 0, 1, 6, 4, -1, P.s6, 0.6);
  m.line(-9, 1, 1, 6, 5, -1, P.s7);
  // Querstreben
  for (const t of [-5, -1, 3]) {
    const y = Math.round(1 + ((t + 9) / 15) * 4);
    m.line(t, y, -3, t, y, 3, P.s5);
  }
  // Rote Spitze und Kugel
  m.box(6, 4, -2, 8, 6, 0, P.r4).set(7, 7, -1, P.r3);
  // Kabel mit Stecker
  m.line(-9, 0, 1, -11, 0, 4, P.n2);
  m.box(-12, 0, 4, -11, 1, 5, P.f6);
  edgeLight(m);
  return m;
}

/** Berts Werkzeugkasten: rot lackiert, Griff, Verschlüsse, Hammerstiel schaut heraus. */
function werkzeugModel() {
  const m = new VoxelModel();
  const red = (x, y) => (y === 7 ? P.r4 : y === 0 ? P.r1 : (x + y) % 7 === 0 ? P.r2 : P.r3);
  m.box(-8, 0, -4, 7, 7, 3, red);
  m.box(-8, 4, 4, 7, 4, 4, P.r2); // Deckelkante vorn
  // Verschlüsse
  m.box(-6, 3, 4, -5, 5, 4, P.s7).box(4, 3, 4, 5, 5, 4, P.s7);
  // Griff
  m.box(-4, 8, -1, -4, 10, 0, P.s5).box(3, 8, -1, 3, 10, 0, P.s5).box(-4, 10, -1, 3, 10, 0, P.s6);
  // Hammerstiel schaut unter dem Deckel hervor
  m.box(7, 6, -2, 10, 6, -1, P.e6).box(10, 5, -3, 11, 7, 0, P.s4);
  edgeLight(m, { only: new Set([P.r3, P.r4]) });
  return m;
}

export const QUEST_ITEM_MODELS = {
  garnrollen: garnModel,
  antennenteil: antenneModel,
  werkzeugkasten: werkzeugModel,
};

/** Funkeln über einem Fundstück: ein helles Kreuz (größer als bei der Beute). */
export function questGlintModel() {
  const m = new VoxelModel();
  const hi = 0xfff6d8;
  const mid = 0xffd98a;
  m.set(0, 0, 0, hi);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) m.set(dx, dy, 0, mid);
  m.set(2, 0, 0, shade(mid, -1)).set(-2, 0, 0, shade(mid, -1)).set(0, 2, 0, shade(mid, -1)).set(0, -2, 0, shade(mid, -1));
  return m;
}
