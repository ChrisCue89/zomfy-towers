// Browser-Seite der Klangpipeline: rechnet die Stücke und Klänge des Spiels mit dem
// Klang-Baukasten (sound.js, music.js) in OfflineAudioContexts. Nichts hier ist Fremdaudio.
//
// build.mjs ruft `window.renderTask(name, params)` auf und bekommt Stereo-Samples (Float32,
// base64) zurück. Jede Aufgabe setzt zuerst den Zufallsgenerator (seeded) – damit ist jeder
// Lauf bitgleich. `Math.random` wird von den Rezepten des Spiels benutzt (Streuung, Rauschstart,
// Hall, gezupfte Saiten); der Trailer braucht reproduzierbare Ergebnisse.

import { Sound } from '/game/src/audio/sound.js';
import { Music, hz } from '/game/src/audio/music.js';
import { SR, DURATION, T, BAR, BPM, TITEL_MID_OFFSET, heartbeatsTransition, HEART_SILENCE } from '/score.mjs';

// --- Zufall ---------------------------------------------------------------------------------

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seed = (n) => {
  Math.random = mulberry32(n);
};
const rnd = (a, b) => a + Math.random() * (b - a);

// --- Umgebung -------------------------------------------------------------------------------

/** Ein Sound-Objekt ohne Lautsprecher (wie renderMusic), mit Bussen für Effekte und Umgebung. */
function makeSound(ctx, dest = ctx.destination) {
  const s = Object.create(Sound.prototype);
  s.ctx = ctx;
  s.counting = false;
  s.voices = 0;
  s.pitchMul = 1;
  s.last = new Map();
  s.listener = { x: 0, z: 0 };
  s.lastVary = null;
  Object.defineProperty(s, 'ready', { value: true });
  s.noiseBuffer = ctx.createBuffer(1, SR * 2, SR);
  const nd = s.noiseBuffer.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  s.sfxBus = ctx.createGain();
  s.sfxBus.connect(dest);
  s.ambBus = ctx.createGain();
  s.ambBus.connect(dest);
  s.sfxPans = s.panPool(s.sfxBus, 0.7);
  s.ambPans = s.panPool(s.ambBus, 0.8);
  return s;
}

function env(seconds, seedNo) {
  seed(seedNo);
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * SR), SR);
  const s = makeSound(ctx);
  const m = new Music(s, ctx.destination);
  return { ctx, s, m };
}

/** Die Uhr des Kontexts auf T setzen: die Rezepte des Spiels planen mit ctx.currentTime. */
function clock(ctx, t) {
  Object.defineProperty(ctx, 'currentTime', { get: () => t, configurable: true });
}

function pack(buf, from = 0, to = buf.length) {
  const out = { n: to - from, ch: [] };
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c).subarray(from, to);
    const u8 = new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
    let str = '';
    for (let i = 0; i < u8.length; i += 0x8000) str += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    out.ch.push(btoa(str));
  }
  return out;
}

const gain = (ctx, v, dest) => {
  const g = ctx.createGain();
  g.gain.value = v;
  if (dest) g.connect(dest);
  return g;
};

/** Ein Stück-Bus wie in Music.begin (Bus, Hall-Send, Filter), ohne etwas zu planen: schedule() wird nie gerufen. */
function looseBus(m, id) {
  return m.begin(id, 1e6);
}

/** Rauschquelle über die ganze Länge (kein hörbares Wiederholen), Ausgang: Filterkette. */
function longNoise(ctx, seconds) {
  const b = ctx.createBuffer(1, Math.ceil(seconds * SR), SR);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

// --- Aufgaben: Musik ------------------------------------------------------------------------

const tasks = {};

/** Spieluhr von Tales of Cue (0,00 s). music.jingle() beginnt bei currentTime + 0,06: die Uhr auf −0,06 s stellen. */
tasks.jingle = async () => {
  const { ctx, m } = env(7, 101);
  clock(ctx, -0.06);
  m.jingle();
  return pack(await ctx.startRendering());
};

/** titel: Vorspiel, Thema in der Spieluhr, Abbruch bei 12,5 s (Stückzeit 10,0 s). Kurzer Hall bleibt. */
tasks['titel-intro'] = async () => {
  const dur = T.titelCut - T.titel; // 10,0 s = drei Takte
  const { ctx, m } = env(dur + 3.5, 102);
  const cur = m.begin('titel', 0);
  m.schedule(dur - 1e-4, 0);
  // Abbruch: der Bus (Direktklang + Hall-Send) fällt in ~50 ms weg, der schon im Hall stehende Rest klingt aus
  cur.bus.gain.setTargetAtTime(0.0001, dur - 0.06, 0.02);
  return pack(await ctx.startRendering());
};

/** nacht: acht Takte, Stufe 0 (Takt 1–2), 1 (Takt 3–5), 2 (Takt 6–8) – wie das Spiel es bei steigender Bedrohung spielt. */
tasks.nacht = async () => {
  const NB = BAR.nacht;
  const { ctx, s, m } = env(8 * NB + 4.5, 103);
  const cur = m.begin('nacht', 0);
  m.schedule(2 * NB - 1e-4, 0);
  m.schedule(5 * NB - 1e-4, 1);
  // Becken beim Wechsel auf Stufe 2 (das Spiel setzt es bei Stufe 2 in Takt 1 und 5 einer Runde)
  s.noise(5 * NB, 1.5, { type: 'highpass', freq: 4800, peak: 0.07, attack: 0.002, out: cur.bus });
  m.schedule(8 * NB - 1e-4, 2);
  return pack(await ctx.startRendering());
};

/** titel-Mittelteil (Streicher): im Stück ab Takt 11 (33,333 s). Wir springen direkt in den Abschnitt (gleiche Noten). */
tasks['titel-mid'] = async () => {
  const dur = T.midMusicEnd - T.mid; // 9,37 s
  const { ctx, m } = env(dur + 3.5, 104);
  const cur = m.begin('titel', 0);
  cur.sec = 3; // Mittelteil: Em7 – Cmaj7 – G/H – D, Streicher, Besen, Spieluhr im Thema
  cur.bar = 0;
  cur.step = 0;
  m.schedule(dur - 1e-4, 0);
  cur.bus.gain.setTargetAtTime(0.0001, dur - 0.1, 0.06);
  return pack(await ctx.startRendering());
};

/** boss: sechs Takte, dann ein Schlussschlag auf dem Taktanfang von Takt 7 (= 51,67 s) und Abwürgen. */
tasks.boss = async () => {
  const BB = BAR.boss;
  const end = 6 * BB;
  const { ctx, s, m } = env(end + 3.5, 105);
  const cur = m.begin('boss', 0);
  m.schedule(end - 1e-4, 2);
  // Schlussschlag: Kick + Pauke + Becken (wie Takt 1 der Nacht) und ein c-Moll-Akkord der Hörner
  const out = cur.bus;
  s.tone('sine', 150, end, 0.22, { freqEnd: 42, peak: 0.46, attack: 0.002, out });
  s.tone('sine', 82, end, 0.45, { freqEnd: 52, peak: 0.3, attack: 0.003, out });
  s.noise(end, 1.5, { type: 'highpass', freq: 4800, peak: 0.07, attack: 0.002, out });
  for (const f of [hz('C3'), hz('G3'), hz('C4'), hz('Eb4'), hz('G4')]) s.brass(f, end, 0.3, 0.05, out);
  cur.bus.gain.setTargetAtTime(0.0001, end + 0.22, 0.06);
  return pack(await ctx.startRendering());
};

/** Morgen (ab 52,2 s): der erste Takt des Themas in der Spieluhr, ein weicher E-Piano-Akkord darunter. */
tasks.morning = async () => {
  const len = T.title - T.morning + 1.5;
  const { ctx, m } = env(len, 106);
  const cur = looseBus(m, 'titel');
  const out = cur.bus;
  const step = 60 / BPM.titel / 4;
  const beat = step * 4;
  // Thema (titel, erster Takt): B4:6 A4:2 G4:4 D4:4 – die Spieluhr klingt eine Oktave höher (bellOctave 2)
  [['B4', 0], ['A4', 6], ['G4', 8], ['D4', 12]].forEach(([n, st], k) => m.bell(hz(n) * 2, st * step, 0.026 * (k === 0 ? 1.15 : 1), out));
  // Gmaj7 (F#3 B3 D4) sehr weich; dazu eine gezupfte Gitarrennote wie im Vorspiel
  ['F#3', 'B3', 'D4'].forEach((n, k) => m.ep(hz(n), k * 0.012, beat * 3.2, 0.02, out));
  m.pluck(hz('D5'), 0.02, 0.02, out);
  return pack(await ctx.startRendering());
};

/**
 * Titelakkord (56,0 s): die Spieluhr-Figur G–H–D–G wie im jingle, danach der Schlussakkord Gadd9
 * des titel (music.finish: E-Piano, Gitarre, Bass, Flöte) mit Streicherfläche und Glitzern.
 */
tasks.title = async () => {
  const { ctx, m } = env(T.end - T.title + 1.5, 107);
  const cur = looseBus(m, 'titel');
  const out = cur.bus;
  const eighth = 0.15;
  ['G5', 'B5', 'D6', 'G6'].forEach((n, k) => m.bell(hz(n), k * eighth, 0.05, out));
  const at = 4 * eighth;
  m.finish(cur, at); // Gadd9: E-Piano, Gitarre, Bass, Flöte – der Schlussakkord des Stücks
  m.pad(['B3', 'D4', 'A4'].map(hz), at, 2.6, 0.02, 1100, out);
  ['D6', 'B5', 'G6'].forEach((n, k) => m.bell(hz(n), at + 0.55 + k * 0.16, 0.035, out));
  return pack(await ctx.startRendering());
};

// --- Aufgaben: Übergänge und Einschläge -----------------------------------------------------------

/** Ein umgekehrtes Becken, Länge `len`, endet bei `endAt` (Zeit im Zielkontext). */
async function reverseCymbal(ctx, dest, endAt, len, level, pan) {
  const oc = new OfflineAudioContext(1, Math.ceil(len * SR), SR);
  const s = makeSound(oc);
  const bus = oc.createGain();
  bus.connect(oc.destination);
  // Das Becken des Spiels (Rauschen, Hochpass 4800 Hz), dazu zwei hellere Schichten für Glanz
  s.noise(0, len * 0.95, { type: 'highpass', freq: 4800, peak: 0.5, attack: 0.002, out: bus });
  s.noise(0, len * 0.8, { type: 'bandpass', freq: 7500, q: 0.9, peak: 0.35, attack: 0.002, out: bus });
  s.noise(0, len * 0.95, { type: 'highpass', freq: 9500, peak: 0.25, attack: 0.002, out: bus });
  const rendered = await oc.startRendering();
  const d = rendered.getChannelData(0);
  const rev = ctx.createBuffer(1, d.length, SR);
  const r = rev.getChannelData(0);
  for (let i = 0; i < d.length; i++) r[i] = d[d.length - 1 - i];
  const src = ctx.createBufferSource();
  src.buffer = rev;
  const g = gain(ctx, level);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  src.connect(g).connect(p).connect(dest);
  src.start(endAt - len);
}

/** Tiefes Grollen: Sinus-Drohne unter 80 Hz (D1, A1, D2) mit Schwebung und langsam schwellendem Rauschen. */
function drone(ctx, s, t0, t1, level, dest) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.04 * level, t0);
  g.gain.exponentialRampToValueAtTime(level, t1 - 0.02);
  g.gain.setTargetAtTime(0.0001, t1, 0.05);
  g.connect(dest);
  for (const [f, a] of [[36.71, 1], [36.71 * 1.011, 0.7], [55, 0.5], [73.42, 0.4], [73.42 * 0.994, 0.28]]) {
    const o = ctx.createOscillator();
    o.type = f > 60 ? 'triangle' : 'sine';
    o.frequency.value = f;
    const og = gain(ctx, a, g);
    o.connect(og);
    o.start(t0);
    o.stop(t1 + 0.5);
  }
  // Grollen: tiefes Rauschen, dessen Pegel zittert
  const src = ctx.createBufferSource();
  src.buffer = s.noiseBuffer;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 70;
  lp.Q.value = 1.2;
  const rg = gain(ctx, 3.5);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.7;
  const depth = gain(ctx, 1.4);
  lfo.connect(depth).connect(rg.gain);
  src.connect(lp).connect(rg).connect(g);
  src.start(t0, 0.3);
  lfo.start(t0);
  src.stop(t1 + 0.5);
  lfo.stop(t1 + 0.5);
}

/** Riser: gefiltertes Rauschen fährt aufwärts, dazu Streicher (Sägezähne) und ein Sinus im Glissando nach oben (auf D). */
function riser(ctx, s, t0, t1, level, dest) {
  const dur = t1 - t0;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.02 * level, t0);
  g.gain.exponentialRampToValueAtTime(level, t1 - 0.01);
  g.gain.setTargetAtTime(0.0001, t1, 0.012);
  g.connect(dest);
  // Rauschen
  const src = ctx.createBufferSource();
  src.buffer = s.noiseBuffer;
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(350, t0);
  bp.frequency.exponentialRampToValueAtTime(7500, t1);
  src.connect(bp).connect(gain(ctx, 1.0, g));
  src.start(t0, 0.7);
  src.stop(t1 + 0.1);
  // Streicher: drei leicht verstimmte Sägezähne D3 → D5, Tiefpass öffnet sich
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.5;
  lp.frequency.setValueAtTime(500, t0);
  lp.frequency.exponentialRampToValueAtTime(4200, t1);
  const sg = gain(ctx, 0.11);
  lp.connect(sg).connect(g);
  for (const det of [-10, 0, 10]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.detune.value = det;
    o.frequency.setValueAtTime(146.83, t0);
    o.frequency.exponentialRampToValueAtTime(587.33, t1);
    o.connect(lp);
    o.start(t0);
    o.stop(t1 + 0.1);
  }
  // Sinus-Glissando D4 → D6 (etwas später einsetzend, damit es zum Ende hin sirrt)
  const sine = ctx.createOscillator();
  sine.type = 'sine';
  sine.frequency.setValueAtTime(293.66, t0);
  sine.frequency.exponentialRampToValueAtTime(1174.66, t1);
  const sgain = ctx.createGain();
  sgain.gain.setValueAtTime(0.0001, t0);
  sgain.gain.setValueAtTime(0.0001, t0 + dur * 0.25);
  sgain.gain.exponentialRampToValueAtTime(0.09, t1);
  sine.connect(sgain).connect(g);
  sine.start(t0);
  sine.stop(t1 + 0.1);
}

/** Einschlag: tiefe Sinus-Trommel + Rauschstoß, Sub-Boom, kurzes Nachhallen (Hall des Baukastens). */
function impact(s, m, t, size, dest) {
  const bus = gain(s.ctx, 1, dest);
  const send = gain(s.ctx, 0.22 * size, m.verb);
  bus.connect(send);
  const o = { out: bus };
  s.tone('sine', 135, t, 0.5 * size, { freqEnd: 40, peak: 0.85, attack: 0.002, ...o }); // tiefe Trommel
  s.tone('sine', 84, t, 0.42 * size, { freqEnd: 52, peak: 0.55 * size, attack: 0.003, ...o }); // Pauke darunter
  s.noise(t, 0.17 * size, { type: 'lowpass', freq: 2800, freqEnd: 420, q: 0.7, peak: 0.6, attack: 0.001, ...o }); // Rauschstoß
  s.noise(t, 0.05, { type: 'highpass', freq: 3200, peak: 0.28, attack: 0.001, ...o }); // Anschlag
  s.tone('sine', 54, t, 1.2 * size, { freqEnd: 41, peak: 0.85, attack: 0.004, ...o }); // Sub-Boom, 1,2 s
  if (size > 1) {
    s.tone('sine', 41, t, 1.9, { freqEnd: 34, peak: 0.6, attack: 0.006, ...o }); // noch tiefer, länger
    s.noise(t, 2.0, { type: 'highpass', freq: 4800, peak: 0.12, attack: 0.002, ...o }); // Becken
  }
}

tasks.transitions = async () => {
  const { ctx, s, m } = env(DURATION, 201);
  const dest = ctx.destination;
  // Übergang 12,5 – 16,0
  const bDrone = gain(ctx, 1, dest);
  const bRise = gain(ctx, 1, dest);
  const bHeart = gain(ctx, 1, dest);
  const heartSend = gain(ctx, 0.25, m.verb);
  bHeart.connect(heartSend);
  drone(ctx, s, T.trans, T.nacht, 0.5, bDrone);
  riser(ctx, s, T.trans + 0.1, T.nacht, 0.5, bRise);
  await reverseCymbal(ctx, bRise, T.nacht, 3.0, 0.55, -0.55);
  await reverseCymbal(ctx, bRise, T.nacht, 3.0, 0.55, 0.55);
  // Whoosh nach unten beim Abbruch des Themas
  s.noise(T.trans, 0.9, { type: 'bandpass', freq: 5200, freqEnd: 420, q: 0.8, attack: 0.05, peak: 0.16, out: bRise });
  // Herzschlag: Abstand 0,9 → 0,45 s, lauter werdend (Rezept `herzschlag` des Spiels + ein Hauch Körper, damit man ihn auch auf kleinen Lautsprechern hört)
  const hb = heartbeatsTransition();
  s.sfxBus.disconnect();
  s.sfxBus.connect(bHeart);
  const heart = (t, v, dub = true) => {
    clock(ctx, t - 0.005);
    s.voices = 0;
    if (dub) s.play('herzschlag', { volume: v });
    else s.tone('sine', 64, t, 0.14, { freqEnd: 44, peak: 0.24 * v, attack: 0.006, out: bHeart });
    s.tone('sine', 128, t, 0.09, { freqEnd: 88, peak: 0.07 * v, attack: 0.004, out: bHeart });
    s.noise(t, 0.04, { type: 'lowpass', freq: 240, peak: 0.08 * v, attack: 0.003, out: bHeart });
    if (dub) {
      s.tone('sine', 116, t + 0.2, 0.08, { freqEnd: 80, peak: 0.05 * v, attack: 0.004, out: bHeart });
    }
  };
  hb.times.forEach((t, k) => heart(t, 0.55 + 0.75 * (k / (hb.times.length - 1))));
  // Einschlag 16,0
  const bImp = gain(ctx, 1, dest);
  impact(s, m, T.nacht, 1, bImp);
  // Stille vor dem Boss: zwei Herzschläge (der zweite ohne zweiten Schlag – der Einschlag ist sein »dub«)
  clock(ctx, 0);
  heart(HEART_SILENCE[0], 0.9, true);
  heart(HEART_SILENCE[1], 1.1, false);
  // Einschlag 41,233 (der große)
  impact(s, m, T.boss, 1.5, bImp);
  return pack(await ctx.startRendering());
};

// --- Aufgaben: Bett -----------------------------------------------------------------------------

/** Stückweise linearer Verlauf über Zeitpunkte [[t, wert], …] (Werte vor/nach dem Bereich bleiben stehen). */
function curve(points) {
  return (t) => {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      if (t <= points[i][0]) {
        const [a, va] = points[i - 1];
        const [b, vb] = points[i];
        return va + ((vb - va) * (t - a)) / (b - a);
      }
    }
    return points[points.length - 1][1];
  };
}

/** Bett: Wind (durchgehend), Krähen, Feuerknistern (0–12, 31–41), Wellen am See (0–12, 52–60), Vögel am Morgen. */
tasks.bed = async () => {
  const { ctx, s } = env(DURATION, 301);
  const dest = ctx.destination;
  // Wind: zwei Rauschquellen (links/rechts), Tiefpass wie im Spiel (300–480 Hz, langsam wandernd), Pegel nach Abschnitt
  const windLevel = curve([
    [0, 0.03], [12, 0.034], [16, 0.05], [22, 0.03], [31, 0.03], [31.5, 0.011], [40.4, 0.011], [40.9, 0.006],
    [41.4, 0.03], [51.4, 0.04], [51.67, 0.008], [52.5, 0.02], [60, 0.02],
  ]);
  const seconds = DURATION;
  for (const side of [-1, 1]) {
    const src = ctx.createBufferSource();
    src.buffer = longNoise(ctx, seconds + 0.1);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 0.8;
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = 0.55 * side;
    for (let t = 0; t <= seconds; t += 0.25) {
      const sway = 0.75 + 0.25 * Math.sin(t * 0.13 + side) * Math.sin(t * 0.07 + side * 2);
      f.frequency.setValueAtTime(300 + 180 * (0.5 + 0.5 * Math.sin(t * 0.21 + side)), t);
      g.gain.setValueAtTime(windLevel(t) * sway * 1.4, t);
    }
    src.connect(f).connect(g).connect(p).connect(dest);
    src.start(0);
  }
  // Feuer (Rauschen, Tiefpass 260 Hz) und Knistern wie im Spiel, jeweils mit weichen Rändern
  const fire = (a, b, level, fadeIn = 0.8, fadeOut = 0.8) => {
    const src = ctx.createBufferSource();
    src.buffer = longNoise(ctx, b - a + 1);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, a);
    g.gain.linearRampToValueAtTime(0.05 * level * level, a + fadeIn);
    g.gain.setValueAtTime(0.05 * level * level, b - fadeOut);
    g.gain.linearRampToValueAtTime(0.0001, b);
    src.connect(lp).connect(g).connect(dest);
    src.start(a);
    src.stop(b + 0.05);
    let t = a;
    while (t < b) {
      const step = 0.04 + Math.random() * 0.25;
      const fade = Math.min(1, (t - a) / fadeIn, (b - t) / fadeOut);
      if (fade > 0.02) {
        const pan = s.pan(s.ambPans, dest, Math.random() * 0.8 - 0.5);
        s.noise(t, 0.012 + Math.random() * 0.02, { type: 'bandpass', freq: 1400 + Math.random() * 2200, q: 2, peak: 0.07 * level * fade, out: pan });
      }
      t += step;
    }
  };
  fire(0, 12.4, 0.75, 0.05, 0.9);
  fire(T.mid, 40.55, 0.9, 0.9, 0.3);
  // Wellen am See: langsames Anschwellen und Verebben, links/rechts im Wechsel
  const wave = (t, dur, peak, dir) => {
    const out = s.pan(s.ambPans, s.ambBus, dir);
    s.noise(t, dur, { type: 'lowpass', freq: 900, freqEnd: 330, q: 0.6, attack: dur * 0.38, peak, out });
    s.noise(t + 0.15, dur * 0.8, { type: 'bandpass', freq: 2300, freqEnd: 1200, q: 0.5, attack: dur * 0.36, peak: peak * 0.22, out });
  };
  [[0.1, 5.2, 0.05, -0.5], [5.9, 5.6, 0.06, 0.5], [11.2, 4.2, 0.045, -0.4]].forEach((a) => wave(...a));
  [[51.9, 5.4, 0.045, 0.5], [57.3, 4.6, 0.05, -0.5]].forEach((a) => wave(...a));
  // Krähen (kraehe: caw) und Vögel am Tag/Morgen – sparsam
  s.caw(4.7, -0.6, 3.2);
  s.caw(9.9, 0.55, 2.6);
  s.caw(54.3, -0.5, 2.4);
  s.bird(7.6);
  s.bird(52.6);
  s.bird(53.4);
  s.bird(55.2);
  return pack(await ctx.startRendering());
};

// --- Aufgaben: Effekte aus sfx-track.json ---------------------------------------------------------

/**
 * Jeder Eintrag { t, name, x?, z?, lx?, lz?, volume?, rate? } wird mit den Rezepten des Spiels (sound.js,
 * `play`) gerechnet: Dämpfung, Stereolage, Streuung und Mindestabstand (MIN_GAP) macht `play` selbst.
 * `@caw`, `@bird`, `@cricket`: Umgebungsklänge; `@whoosh`, `@boom`: Trailer-Bausteine.
 */
tasks.sfx = async ({ events }) => {
  const { ctx, s, m } = env(DURATION, 401);
  const sorted = events.slice().sort((a, b) => a.t - b.t);
  const played = [];
  for (const e of sorted) {
    s.voices = 0; // im Spiel zählen laufende Stimmen; hier läuft nichts »ab«
    s.lastVary = null;
    s.listener = { x: e.lx ?? 0, z: e.lz ?? 0 };
    if (e.name.startsWith('@')) {
      const kind = e.name.slice(1);
      clock(ctx, e.t);
      const dir = e.x !== undefined ? Math.max(-1, Math.min(1, (e.x - (e.lx ?? 0)) / 10)) : rnd(-0.6, 0.6);
      if (kind === 'caw') s.caw(e.t, dir, (e.volume ?? 1) * 3);
      else if (kind === 'bird') s.bird(e.t);
      else if (kind === 'cricket') s.cricket(e.t);
      else if (kind === 'whoosh') s.noise(e.t - 0.6, 0.7, { type: 'bandpass', freq: 500, freqEnd: 4500, q: 0.8, attack: 0.6, peak: 0.16 * (e.volume ?? 1), out: s.sfxBus });
      else if (kind === 'boom') impact(s, m, e.t, 0.7 * (e.volume ?? 1), ctx.destination);
      else continue;
      played.push(e);
      continue;
    }
    clock(ctx, e.t - 0.005);
    const opt = {};
    for (const k of ['x', 'z', 'volume', 'pitch', 'rate']) if (e[k] !== undefined) opt[k] = e[k];
    s.play(e.name, opt);
    if (s.lastVary) played.push(e); // play() setzt lastVary erst, wenn der Effekt wirklich klingt (Abstand, Entfernung, MIN_GAP)
  }
  const r = pack(await ctx.startRendering());
  r.played = played.length;
  r.skipped = sorted.filter((e) => !played.includes(e)).map((e) => `${e.t} ${e.name}`);
  return r;
};

// --- Prüfung: Stücke lauffähig? ---------------------------------------------------------------------

/** Wie renderMusic: Stücke kurz rechnen und Spitze/Pegel/`bad` melden (Nichts darf stumm oder NaN sein). */
tasks.check = async () => {
  const out = [];
  for (const id of ['titel', 'nacht', 'boss']) {
    seed(9);
    const ctx = new OfflineAudioContext(2, SR * 6, SR);
    const s = makeSound(ctx);
    const m = new Music(s, ctx.destination);
    m.begin(id, 0.05);
    m.schedule(6, id === 'boss' ? 2 : 1);
    const buf = await ctx.startRendering();
    let peak = 0;
    let sum = 0;
    let bad = 0;
    const l = buf.getChannelData(0);
    for (let i = 0; i < l.length; i++) {
      const v = l[i];
      if (!Number.isFinite(v)) bad++;
      else {
        peak = Math.max(peak, Math.abs(v));
        sum += v * v;
      }
    }
    out.push({ id, peak, rms: Math.sqrt(sum / l.length), bad });
  }
  return out;
};

window.renderTask = async (name, params = {}) => {
  if (!tasks[name]) throw new Error(`unbekannte Aufgabe ${name}`);
  const t0 = performance.now();
  const r = await tasks[name](params);
  if (r && typeof r === 'object' && !Array.isArray(r)) r.ms = Math.round(performance.now() - t0);
  return r;
};
window.audioReady = true;
