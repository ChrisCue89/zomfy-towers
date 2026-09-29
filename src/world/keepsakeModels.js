// Erinnerungsstücke (M29, im Maß 1/32): Was die Bewohner Mika schenken, wenn
// sie einander nahestehen. Sie stehen im Regal der Stube. Ursprung am Boden
// des Stücks, um die Mitte gebaut; Süden (+z) ist die Seite zur Kamera.
// Jedes Stück braucht eine eigene Silhouette und Farbe (Lesbarkeit vor Stimmung).

import { P } from '../render/palette.js';
import { VoxelModel } from '../render/voxel.js';

/** Knopfs Tennisball: grau-gelb, mit der hellen Naht, ein bisschen platt gekaut. */
function ball() {
  const m = new VoxelModel();
  m.ellipsoid(0, 2.2, 0, 2.6, 2.2, 2.6, (x, y, z) => {
    const seam = Math.abs(Math.sin((x + 0.5) * 0.9) * 1.6 - (z + 0.5)) < 0.6;
    if (seam) return P.s8;
    return (x + y + z) % 5 === 0 ? P.f4 : y > 2 ? P.f5 : P.f4;
  });
  return m;
}

/** Hildes Posthorn: Messing, eine Windung, Mundstück links, Trichter rechts, gelbe Kordel. */
function posthorn() {
  const m = new VoxelModel();
  // Windung als Ring (liegt auf der Seite, zeigt zur Kamera)
  for (let a = 0; a < 40; a++) {
    const t = (a / 40) * Math.PI * 2;
    const x = Math.round(Math.cos(t) * 3.2);
    const y = Math.round(3.6 + Math.sin(t) * 3.2);
    m.set(x, y, 0, a % 7 === 0 ? P.f6 : P.f5).set(x, y, -1, P.f4);
  }
  // Trichter rechts, Mundstück links
  for (let k = 0; k < 4; k++) m.box(4 + k, 3 - Math.floor(k / 2), -1, 4 + k, 4 + Math.floor(k / 2), 0, k === 3 ? P.f6 : P.f5);
  m.set(-4, 4, 0, P.f4).set(-5, 4, 0, P.f3);
  // Kordel mit Quaste
  m.set(0, 0, 0, P.f6).set(0, -1, 0, P.f6).set(1, -2, 0, P.f7);
  return m;
}

/** Junas Radioröhre: Glaskolben mit Glühfaden, schwarzer Sockel mit Stiften, an einer Schnur. */
function roehre() {
  const m = new VoxelModel();
  m.box(-2, 0, -2, 2, 1, 2, P.n1); // Sockel
  m.set(-1, -1, 0, P.s6).set(1, -1, 0, P.s6);
  m.ellipsoid(0, 5, 0, 2.6, 4.2, 2.6, (x, y, z) => (Math.abs(x + 0.5) < 1 && Math.abs(z + 0.5) < 1 ? (y > 5 ? P.f6 : P.s5) : z + 0.5 > 1.6 ? P.b5 : P.b4));
  m.set(0, 10, 0, P.b3).set(0, 11, 0, P.r3).set(1, 12, 0, P.r3); // Spitze und Schnur
  return m;
}

/** Berts Namensschild: rotes Blechschild mit weißem Feld, Nadel hinten. */
function namensschild() {
  const m = new VoxelModel();
  m.box(-6, 0, 0, 6, 5, 0, (x, y) => (y === 0 || y === 5 || x === -6 || x === 6 ? P.r2 : y >= 2 && y <= 3 && x > -5 && x < 5 ? ((x + 6) % 3 === 0 ? P.n1 : P.s9) : P.r3));
  m.box(-6, 0, -1, 6, 0, -1, P.s6); // Aufsteller
  return m;
}

/** Yusufs Doktorhut: schwarzer Pappquader mit Quaste, obendrauf ein weißes Plüschschaf. */
function doktorhut() {
  const m = new VoxelModel();
  m.box(-3, 0, -3, 3, 2, 3, P.n1);
  m.box(-5, 3, -5, 5, 3, 5, (x, y, z) => (Math.abs(x) === 5 || Math.abs(z) === 5 ? P.n2 : P.n1));
  // Quaste an der Südostecke
  m.set(4, 2, 4, P.f5).set(4, 1, 4, P.f5).set(4, 0, 5, P.f6);
  // Schaf: Wolle, dunkler Kopf, Beinchen
  m.ellipsoid(0, 6, 0, 3, 2.2, 2.2, (x, y, z) => ((x + y + z) % 2 ? P.s9 : P.s8));
  m.box(3, 6, -1, 4, 7, 0, P.n2).set(4, 7, 0, P.s9);
  for (const [x, z] of [[-2, -1], [-2, 1], [2, -1], [2, 1]]) m.set(x, 4, z, P.n2);
  return m;
}

/** Hannes’ Hobel: Holzkörper mit Griffhorn vorn, Stahlmesser, Keil. */
function hobel() {
  const m = new VoxelModel();
  m.box(-7, 0, -2, 7, 3, 2, (x, y) => (y === 3 ? P.e6 : (x + y) % 5 === 0 ? P.e4 : P.e5));
  m.box(-6, 4, -1, -4, 7, 1, P.e5).set(-5, 8, 0, P.e6); // Horn
  m.box(0, 4, -1, 0, 6, 1, P.s7).box(1, 4, -1, 2, 5, 1, P.e3); // Messer und Keil
  return m;
}

/** Claras Werkstattschild: Blech mit Rostrand, Schrift als helle Striche, zwei Schrauben. */
function schild() {
  const m = new VoxelModel();
  m.box(-8, 0, 0, 8, 7, 0, (x, y) => {
    if (y === 0 || y === 7 || Math.abs(x) === 8) return (x + y) % 3 ? P.e3 : P.f2;
    if ((y === 2 || y === 5) && Math.abs(x) < 7 && (x + 8) % 4 !== 3) return P.s9;
    return P.b3;
  });
  m.set(-7, 6, 1, P.s7).set(7, 6, 1, P.s7);
  m.box(-8, 0, -1, 8, 0, -1, P.e3);
  return m;
}

/** Lottes Papierlaterne: orange gefaltet, Knopf als dunkles Fenster, Drahtbügel. */
function papierlaterne() {
  const m = new VoxelModel();
  m.box(-3, 0, -3, 3, 0, 3, P.e3);
  m.box(-3, 1, -3, 3, 7, 3, (x, y, z) => {
    if (y === 4 || y === 1 || y === 7) return P.f3; // Faltkanten
    if (z === 3 && x >= -1 && x <= 1 && y >= 2 && y <= 5) return y === 5 && x !== 0 ? P.f4 : P.e2; // Hund im Fenster
    return P.f4;
  });
  m.box(-3, 8, 0, 3, 8, 0, P.s6).set(0, 9, 0, P.s6);
  return m;
}

/** Gretas Eichelhäherfeder: blau-schwarz gebändert, in einem kleinen Holzfuß. */
function feder() {
  const m = new VoxelModel();
  m.box(-2, 0, -1, 2, 1, 1, P.e4);
  for (let y = 2; y < 12; y++) {
    const w = y < 4 || y > 10 ? 0 : 1;
    const c = y % 3 === 0 ? P.n1 : y % 3 === 1 ? P.b4 : P.s9;
    m.set(Math.round((y - 2) * 0.25), y, 0, P.e6);
    if (w) m.set(Math.round((y - 2) * 0.25) + 1, y, 0, c).set(Math.round((y - 2) * 0.25) - 1, y, 0, c);
  }
  return m;
}

/** Fietes Affenfaust: ein Knotenball aus Hanftau mit kurzem Ende, auf einem Holzklötzchen. */
function knoten() {
  const m = new VoxelModel();
  m.box(-3, 0, -2, 3, 1, 2, (x) => (x % 3 === 0 ? P.e4 : P.e5));
  // Der Ball: die Windungen laufen abwechselnd quer und hoch (helle und dunkle Schläge)
  m.ellipsoid(0, 5, 0, 2.9, 2.9, 2.9, (x, y, z) => {
    const across = (y + 20) % 2 === 0;
    const band = across ? (x + z + 20) % 3 === 0 : (y + z + 20) % 3 === 0;
    return band ? P.e6 : across ? P.e8 : P.e7;
  });
  // Das lose Ende hängt nach vorn herunter, mit aufgedrehtem Takling
  m.set(2, 3, 2, P.e7).set(3, 2, 2, P.e7).set(3, 2, 3, P.e8).set(4, 1, 3, P.s9);
  return m;
}

/** Idas Tannenzapfen von der ältesten Tanne: lange Schuppen, unten breit, oben spitz, ein Harztropfen. */
function zapfen() {
  const m = new VoxelModel();
  for (let y = 0; y <= 12; y++) {
    const r = y < 2 ? 1.6 + y * 0.6 : Math.max(0.6, 2.9 - (y - 2) * 0.24);
    const rr = Math.ceil(r);
    for (let x = -rr; x <= rr; x++) {
      for (let z = -rr; z <= rr; z++) {
        const d = Math.hypot(x, z);
        if (d > r + 0.2) continue;
        const tip = d > r - 0.9 && (x + z + y * 2 + 30) % 3 === 0; // helle Schuppenspitzen
        m.set(x, y, z, tip ? P.e6 : (y + (x > 0 ? 1 : 0)) % 2 ? P.e4 : P.e3);
      }
    }
  }
  m.set(0, 13, 0, P.e3).set(1, 8, 2, P.f6); // Spitze und Harztropfen in der Sonne
  return m;
}

/** Rosas Rezeptheft: rotes Wachstuch mit Gummiband, Zettel ragen heraus, ein Fettfleck. */
function rezeptheft() {
  const m = new VoxelModel();
  m.box(-4, 0, -1, 4, 10, 1, (x, y, z) => {
    if (z < 1) return x === 4 ? (y % 2 ? P.s9 : P.s8) : P.r2; // Seiten und Rücken
    if (x === 2) return P.n1; // Gummiband
    if ((x === -2 || x === -1) && (y === 6 || y === 7)) return P.r4; // Fettfleck
    if (y === 9 && x >= -3 && x <= 0) return P.s9; // Schildchen
    return P.r3;
  });
  m.set(-2, 11, 0, P.s9).set(-1, 11, 0, P.b4).set(1, 11, 0, P.f5); // Zettel oben
  m.box(-4, 0, -2, 4, 0, -2, P.e3); // Buchstütze
  return m;
}

/** Antons erste Mundharmonika: Holzkamm zwischen blanken Deckeln, auf einem Filzständer. */
function mundharmonika() {
  const m = new VoxelModel();
  m.box(-5, 0, -2, 5, 1, 2, (x) => ((x + 6) % 4 === 0 ? P.g2 : P.g3)); // grüner Filz
  m.box(-6, 2, -1, 6, 5, 1, (x, y, z) => {
    if (y === 2 || y === 5) return (x + 12) % 3 === 0 ? P.s9 : P.s7; // Deckel
    if (z === 1 && y >= 3 && y <= 4) return (x + 12) % 2 === 0 ? P.n1 : P.e5; // Kanzellen
    return P.e5;
  });
  m.set(-6, 6, 0, P.s6).set(6, 6, 0, P.s6); // Nieten
  return m;
}

/** Emils Kürbissamen für den Frühling: ein Glas voller Kerne, Korken, Papieretikett mit Kürbis. */
function samen() {
  const m = new VoxelModel();
  m.box(-3, 0, -3, 3, 8, 3, (x, y, z) => {
    const edge = Math.abs(x) === 3 || Math.abs(z) === 3;
    if (z === 3 && y >= 3 && y <= 5 && x >= -2 && x <= 2) return y === 4 && x >= -1 && x <= 1 ? P.f5 : P.s9; // Etikett
    if (y > 6) return edge ? P.b5 : P.s9; // Luft über den Kernen
    if (edge && (x + y + z) % 4 === 0) return P.s9; // Glanz auf dem Glas
    return (x * 3 + y * 5 + z) % 4 === 0 ? P.e6 : P.e8;
  });
  m.set(0, 5, 4, P.g4); // Stiel des gemalten Kürbisses
  m.box(-2, 9, -2, 2, 10, 2, (x, y) => (y === 10 && (x + 4) % 2 ? P.e6 : P.e5)); // Korken
  return m;
}

/** Friedas Hufeisen, Öffnung nach oben (dann fällt das Glück nicht heraus), auf einem Brett genagelt. */
function hufeisen() {
  const m = new VoxelModel();
  m.box(-6, 0, -1, 6, 12, -1, (x, y) => ((x + 6) % 4 === 0 ? P.e4 : P.e5)); // Brettchen
  for (let a = 0; a <= 28; a++) {
    const t = Math.PI + (a / 28) * Math.PI; // untere Hälfte des Bogens
    const x = Math.round(Math.cos(t) * 4);
    const y = Math.round(6 + Math.sin(t) * 4);
    m.set(x, y, 0, a % 6 === 3 ? P.n1 : a % 5 === 0 ? P.s6 : P.s4); // Nagellöcher und Glanz
  }
  for (let y = 6; y <= 10; y++) m.set(-4, y, 0, y === 8 ? P.n1 : P.s4).set(4, y, 0, y === 9 ? P.s6 : P.s4); // Schenkel
  m.set(-4, 11, 0, P.s3).set(4, 11, 0, P.s3).set(0, 12, 0, P.s7); // Stollen und Nagel
  return m;
}

/** Maras Kompass: Messinggehäuse mit aufgeklapptem Deckel, helles Blatt, rote Nadel nach Norden. */
function kompass() {
  const m = new VoxelModel();
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      const d = Math.hypot(x, z);
      if (d > 4.4) continue;
      const rim = d > 3.3;
      m.set(x, 0, z, P.f4).set(x, 1, z, rim ? P.f6 : P.s9);
      if (rim) m.set(x, 2, z, (x + z) % 3 === 0 ? P.f7 : P.f5);
    }
  }
  // Nadel: rot nach Norden (hinten), dunkel nach Süden, Mitte ein Messingpunkt
  m.set(0, 2, -1, P.r3).set(0, 2, -2, P.r3).set(0, 2, -3, P.r4).set(0, 2, 1, P.n2).set(0, 2, 2, P.n2).set(0, 2, 0, P.f6);
  m.set(-3, 2, 0, P.n2).set(3, 2, 0, P.n2); // Striche für Westen und Osten
  // Aufgeklappter Deckel steht hinten
  for (let x = -4; x <= 4; x++) for (let y = 2; y <= 9; y++) if (Math.hypot(x, y - 5.5) <= 4.4) m.set(x, y, -5, Math.hypot(x, y - 5.5) > 3.4 ? P.f5 : P.f4);
  m.set(0, 1, 5, P.f6).set(0, 2, 5, P.f6); // Öse
  return m;
}

/** Paulas Flickenkissen aus allen Stoffresten der Bucht, mit Quasten an den Ecken. */
function kissen() {
  const m = new VoxelModel();
  const patches = [P.r3, P.b4, P.f5, P.g4, P.a3, P.t2];
  for (let x = -6; x <= 6; x++) {
    for (let y = 0; y <= 9; y++) {
      const bulge = 2 - Math.round(Math.abs(x) / 6 + Math.abs(y - 4.5) / 5); // in der Mitte am dicksten
      for (let z = -1 - bulge; z <= 1 + bulge; z++) {
        const p = patches[(Math.floor((x + 6) / 4) * 2 + Math.floor(y / 4) + 6) % patches.length];
        const seam = (x + 6) % 4 === 3 || y % 4 === 3;
        m.set(x, y, z, seam ? P.s9 : p);
      }
    }
  }
  for (const [x, y] of [[-7, 0], [7, 0], [-7, 9], [7, 9]]) m.set(x, y, 0, P.f6); // Quasten
  return m;
}

const KEEPSAKE_BUILDERS = { ball, posthorn, roehre, namensschild, doktorhut, hobel, schild, papierlaterne, feder, knoten, zapfen, rezeptheft, mundharmonika, samen, hufeisen, kompass, kissen };

/** Erinnerungsstück nach Name (data/bonds.js KEEPSAKES). */
export function buildKeepsake(item) {
  return (KEEPSAKE_BUILDERS[item] || ball)();
}
