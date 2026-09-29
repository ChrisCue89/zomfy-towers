// Browser-Seite der Klangpipeline: rechnet die Stücke und Klänge des Spiels mit dem
// Klang-Baukasten (sound.js, music.js) in OfflineAudioContexts. Nichts hier ist Fremdaudio.
//
// build.mjs ruft `window.renderTask(name, params)` auf und bekommt Stereo-Samples (Float32,
// base64) zurück. Jede Aufgabe setzt zuerst den Zufallsgenerator (seeded) – damit ist jeder
// Lauf bitgleich. `Math.random` wird von den Rezepten des Spiels benutzt (Streuung, Rauschstart,
// Hall, gezupfte Saiten); der Trailer braucht reproduzierbare Ergebnisse.

import { Sound } from '/game/src/audio/sound.js';
import { Music, hz } from '/game/src/audio/music.js';
import { SR, DURATION, T, BAR, BPM, heartbeatsTransition, HEART_SILENCE } from '/score.mjs';

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

// --- Reproduzierbarkeit ------------------------------------------------------------------------------
//
// 1. Das Spiel hängt verklungene Töne über `onended` ab (spart im Live-Betrieb Rechenzeit). Im Offline-Kontext läuft dieses
//    Ereignis asynchron zum Rechenthread – ein Wettlauf, der die Samples von Lauf zu Lauf ändert. Die Handler werden ausgeschaltet;
//    verklungene Töne stehen bei ~0 im Graphen und kosten nichts.
Object.defineProperty(AudioScheduledSourceNode.prototype, 'onended', { configurable: true, get: () => null, set() {} });

// 2. Chromium addiert die Eingänge eines Knotens in der Reihenfolge einer Hash-Menge (Zeigeradressen) – bei drei oder mehr
//    Quellen an einem Knoten (Bus, Filter, Ausgang) ändert sich die Rundung von Lauf zu Lauf um ~1e−8. Zwei Summanden sind
//    dagegen vertauschbar und exakt. Deshalb werden connect()-Aufrufe gesammelt und vor dem Rechnen als Binärbaum aus
//    Zwei-Eingang-Addierern (GainNode, Verstärkung 1) aufgebaut: Summierreihenfolge = Aufrufreihenfolge im Code, jeder Eingang ≤ 2.
const rawConnect = AudioNode.prototype.connect;
const pendingByCtx = new Map(); // Kontext → Map(Ziel → [{src, out}])
AudioNode.prototype.connect = function (dest, out = 0, inp = 0) {
  if (!(dest instanceof AudioNode)) return rawConnect.call(this, dest, out); // AudioParam: ein Modulator je Parameter
  if (inp !== 0) throw new Error('connect: Eingang ≠ 0 nicht unterstützt');
  let map = pendingByCtx.get(this.context);
  if (!map) pendingByCtx.set(this.context, (map = new Map()));
  let list = map.get(dest);
  if (!list) map.set(dest, (list = []));
  if (!list.some((e) => e.src === this && e.out === out)) list.push({ src: this, out });
  return dest;
};
function buildAdderTrees(ctx) {
  const map = pendingByCtx.get(ctx);
  if (!map) return;
  pendingByCtx.delete(ctx);
  for (const [dest, list] of map) {
    let level = list;
    while (level.length > 2) {
      const next = [];
      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 >= level.length) {
          next.push(level[i]);
          continue;
        }
        const add = ctx.createGain();
        rawConnect.call(level[i].src, add, level[i].out);
        rawConnect.call(level[i + 1].src, add, level[i + 1].out);
        next.push({ src: add, out: 0 });
      }
      level = next;
    }
    for (const e of level) rawConnect.call(e.src, dest, e.out);
  }
}
const rawStart = OfflineAudioContext.prototype.startRendering;
OfflineAudioContext.prototype.startRendering = function () {
  buildAdderTrees(this);
  return rawStart.call(this);
};

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

function env(seconds, seedNo, sfxTo = null) {
  seed(seedNo);
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * SR), SR);
  const s = makeSound(ctx, sfxTo ? sfxTo(ctx) : ctx.destination);
  const m = new Music(s, ctx.destination);
  return { ctx, s, m };
}

/** Die Uhr des Kontexts auf T setzen: die Rezepte des Spiels planen mit ctx.currentTime. */
function clock(ctx, t) {
  Object.defineProperty(ctx, 'currentTime', { get: () => t, configurable: true });
}

/** AudioBuffer → { n, at, ch: [base64, base64] }; optional nur der Ausschnitt [from, to] in Sekunden. */
function pack(buf, from = 0, to = null) {
  const a = Math.round(from * SR);
  const b = to === null ? buf.length : Math.min(buf.length, Math.round(to * SR));
  const out = { n: b - a, at: from, ch: [] };
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c).subarray(a, b);
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
  g.gain.setValueAtTime(0.12 * level, t0);
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

// Jede Komponente einzeln (eigener Stem, eigener Pegel in mix.mjs): Drohne, Riser, Becken/Whoosh, Herzschlag, Einschläge.
const SPAN_TRANS = [12.0, 17.2];

tasks['trans-drone'] = async () => {
  const { ctx, s } = env(DURATION, 211);
  drone(ctx, s, T.trans, T.nacht, 1, ctx.destination);
  return pack(await ctx.startRendering(), ...SPAN_TRANS);
};

tasks['trans-riser'] = async () => {
  const { ctx, s } = env(DURATION, 212);
  riser(ctx, s, T.trans + 0.1, T.nacht, 1, ctx.destination);
  return pack(await ctx.startRendering(), ...SPAN_TRANS);
};

tasks['trans-cymbal'] = async () => {
  const { ctx, s } = env(DURATION, 213);
  // zwei umgekehrte Becken (links/rechts), Ende exakt auf dem Einschlag
  await reverseCymbal(ctx, ctx.destination, T.nacht, 3.0, 1, -0.55);
  await reverseCymbal(ctx, ctx.destination, T.nacht, 3.0, 1, 0.55);
  // Whoosh nach unten beim Abbruch des Themas
  s.noise(T.trans, 0.9, { type: 'bandpass', freq: 5200, freqEnd: 420, q: 0.8, attack: 0.05, peak: 0.16 * 3, out: ctx.destination });
  return pack(await ctx.startRendering(), ...SPAN_TRANS);
};

/** Herzschlag (Rezept `herzschlag` des Spiels) + ein Hauch Körper, damit man ihn auch auf kleinen Lautsprechern hört. */
tasks['trans-heart'] = async () => {
  let bus;
  const { ctx, s, m } = env(DURATION, 214, (c) => (bus = gain(c, 1, c.destination)));
  bus.connect(gain(ctx, 0.2, m.verb));
  const beat = (t, v, dub = true) => {
    clock(ctx, t - 0.005);
    s.voices = 0;
    if (dub) s.play('herzschlag', { volume: v });
    else s.tone('sine', 64, t, 0.14, { freqEnd: 44, peak: 0.24 * v, attack: 0.006, out: bus });
    s.tone('sine', 128, t, 0.09, { freqEnd: 88, peak: 0.07 * v, attack: 0.004, out: bus });
    s.noise(t, 0.04, { type: 'lowpass', freq: 240, peak: 0.08 * v, attack: 0.003, out: bus });
    if (dub) s.tone('sine', 116, t + 0.2, 0.08, { freqEnd: 80, peak: 0.05 * v, attack: 0.004, out: bus });
  };
  // Wende: Abstand 0,9 → 0,45 s, lauter werdend; der letzte »Schlag« ist der Einschlag
  const hb = heartbeatsTransition();
  hb.times.forEach((t, k) => beat(t, 0.55 + 0.75 * (k / (hb.times.length - 1))));
  // Stille vor dem Boss: zwei einzelne, langsame Schläge (ohne »dub«) – der Einschlag folgt 0,23 s nach dem zweiten
  beat(HEART_SILENCE[0], 0.9, false);
  beat(HEART_SILENCE[1], 1.1, false);
  const buf = await ctx.startRendering();
  return { parts: [pack(buf, ...SPAN_TRANS), pack(buf, 40.3, 42.0)] };
};

/** Einschläge: 16,0 (Wende → Nacht) und 41,233 (Boss, größer). */
tasks.impacts = async () => {
  const { ctx, s, m } = env(DURATION, 215);
  impact(s, m, T.nacht, 1, ctx.destination);
  impact(s, m, T.boss, 1.5, ctx.destination);
  const buf = await ctx.startRendering();
  return { parts: [pack(buf, 15.8, 19.0), pack(buf, 41.0, 44.5)] };
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

/** Wind: zwei Rauschquellen (links/rechts), Tiefpass wie im Spiel (300–480 Hz, langsam wandernd), Pegel nach Abschnitt. */
tasks['bed-wind'] = async () => {
  const { ctx } = env(DURATION, 301);
  const windLevel = curve([
    [0, 1.0], [12, 1.1], [16, 1.6], [22, 1.0], [31, 1.0], [31.5, 0.4], [40.4, 0.4], [40.9, 0.2],
    [41.4, 1.0], [51.4, 1.3], [51.67, 0.3], [52.5, 0.7], [60, 0.7],
  ]);
  for (const side of [-1, 1]) {
    const src = ctx.createBufferSource();
    src.buffer = longNoise(ctx, DURATION + 0.1);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 0.8;
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = 0.55 * side;
    for (let t = 0; t <= DURATION; t += 0.25) {
      const sway = 0.75 + 0.25 * Math.sin(t * 0.13 + side) * Math.sin(t * 0.07 + side * 2);
      f.frequency.setValueAtTime(300 + 180 * (0.5 + 0.5 * Math.sin(t * 0.21 + side)), t);
      g.gain.setValueAtTime(0.03 * windLevel(t) * sway, t);
    }
    src.connect(f).connect(g).connect(p).connect(ctx.destination);
    src.start(0);
  }
  return pack(await ctx.startRendering());
};

/** Feuer: Rauschen (Tiefpass 260 Hz) und Knistern wie im Spiel (update: Bandpass-Pops alle 0,04–0,29 s), 0–12 s und 31–41 s. */
tasks['bed-fire'] = async () => {
  const { ctx, s } = env(DURATION, 302);
  const fire = (a, b, level, fadeIn, fadeOut) => {
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
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start(a);
    src.stop(b + 0.05);
    let t = a;
    while (t < b) {
      const fade = Math.min(1, (t - a) / fadeIn, (b - t) / fadeOut);
      if (fade > 0.02) {
        const out = s.pan(s.ambPans, ctx.destination, Math.random() * 0.8 - 0.5);
        s.noise(t, 0.012 + Math.random() * 0.02, { type: 'bandpass', freq: 1400 + Math.random() * 2200, q: 2, peak: 0.07 * level * fade, out });
      }
      t += 0.04 + Math.random() * 0.25;
    }
  };
  fire(0, 12.4, 0.75, 0.05, 0.9);
  fire(T.mid, 40.55, 0.9, 0.9, 0.3);
  return pack(await ctx.startRendering());
};

/** Wellen am See (0–12 s, 52–60 s): langsames Anschwellen und Verebben, links/rechts im Wechsel. */
tasks['bed-waves'] = async () => {
  const { ctx, s } = env(DURATION, 303);
  const wave = (t, dur, peak, dir) => {
    const out = s.pan(s.ambPans, ctx.destination, dir);
    s.noise(t, dur, { type: 'lowpass', freq: 900, freqEnd: 330, q: 0.6, attack: dur * 0.38, peak, out });
    s.noise(t + 0.15, dur * 0.8, { type: 'bandpass', freq: 2300, freqEnd: 1200, q: 0.5, attack: dur * 0.36, peak: peak * 0.22, out });
  };
  // Spitze jeweils 38 % nach dem Beginn; die letzte Welle vor der Wende ebbt bis 12,5 s auf −50 dB ab
  [[0.1, 5.2, 1, -0.5], [5.4, 5.4, 1.2, 0.5], [9.6, 3.6, 0.9, -0.4]].forEach((a) => wave(...a));
  [[51.9, 5.4, 0.9, 0.5], [56.3, 4.4, 1.0, -0.5]].forEach((a) => wave(...a));
  return pack(await ctx.startRendering());
};

/** Krähen (Rezept `kraehe`: caw) und Vögel am Tag/Morgen – sparsam. */
tasks['bed-animals'] = async () => {
  const { ctx, s } = env(DURATION, 304);
  s.caw(4.7, -0.6, 1);
  s.caw(9.9, 0.55, 0.85);
  s.caw(54.3, -0.5, 0.8);
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
 *
 * Gerechnet wird in Blöcken von 3 s (je eigener Kontext, 1 s Vorlauf für `@whoosh`, 4 s Nachklang) und in JS
 * aufaddiert: Im Spiel hängt jeder verklungene Effekt sich ab, hier stünden Tausende Knoten 60 s lang im Graphen.
 */
tasks.sfx = async ({ events }) => {
  const CHUNK = 3;
  const PRE = 1;
  const TAIL = 4;
  const N = Math.round(DURATION * SR);
  const acc = [new Float32Array(N), new Float32Array(N)];
  const sorted = events.slice().sort((a, b) => a.t - b.t);
  const lastAbs = new Map(); // MIN_GAP über die Blöcke hinweg (absolute Zeit)
  const skipped = [];
  let played = 0;
  for (let c0 = 0, k = 0; c0 < DURATION; c0 += CHUNK, k++) {
    const chunk = sorted.filter((e) => e.t >= c0 && e.t < c0 + CHUNK);
    if (!chunk.length) continue;
    const origin = c0 - PRE; // Zeit 0 des Blockkontexts (ganze Sekunden: sample-genau)
    const { ctx, s, m } = env(PRE + CHUNK + TAIL, 401 + k);
    for (const e of chunk) {
      const lt = e.t - origin;
      s.voices = 0; // im Spiel zählen laufende Stimmen; hier läuft nichts »ab«
      s.lastVary = null;
      s.listener = { x: e.lx ?? 0, z: e.lz ?? 0 };
      if (e.name.startsWith('@')) {
        const kind = e.name.slice(1);
        clock(ctx, lt);
        const dir = e.x !== undefined ? Math.max(-1, Math.min(1, (e.x - (e.lx ?? 0)) / 10)) : rnd(-0.6, 0.6);
        if (kind === 'caw') s.caw(lt, dir, (e.volume ?? 1) * 3);
        else if (kind === 'bird') s.bird(lt);
        else if (kind === 'cricket') s.cricket(lt);
        else if (kind === 'whoosh') s.noise(lt - 0.6, 0.7, { type: 'bandpass', freq: 500, freqEnd: 4500, q: 0.8, attack: 0.6, peak: 0.16 * (e.volume ?? 1), out: s.sfxBus });
        else if (kind === 'boom') impact(s, m, lt, 0.7 * (e.volume ?? 1), ctx.destination);
        else {
          skipped.push({ t: e.t, name: e.name, why: 'unbekannter Umgebungsklang' });
          continue;
        }
        played++;
        continue;
      }
      const now = lt - 0.005;
      clock(ctx, now);
      s.last = new Map();
      if (lastAbs.has(e.name)) s.last.set(e.name, lastAbs.get(e.name) - origin);
      const opt = {};
      for (const key of ['x', 'z', 'volume', 'pitch', 'rate']) if (e[key] !== undefined) opt[key] = e[key];
      s.play(e.name, opt);
      if (s.last.has(e.name)) lastAbs.set(e.name, s.last.get(e.name) + origin);
      if (s.lastVary) played++; // play() setzt lastVary erst, wenn der Effekt wirklich klingt
      else if (!s.last.has(e.name)) skipped.push({ t: e.t, name: e.name, why: 'Effekt unbekannt' });
      else if (s.last.get(e.name) !== now) skipped.push({ t: e.t, name: e.name, why: 'Mindestabstand (MIN_GAP)' });
      else skipped.push({ t: e.t, name: e.name, why: 'zu weit weg (Hörweite 16 m) oder zu leise' });
    }
    const buf = await ctx.startRendering();
    const off = Math.round(origin * SR);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = Math.max(0, -off); i < d.length && off + i < N; i++) acc[c][off + i] += d[i];
    }
  }
  const r = pack({ length: N, getChannelData: (c) => acc[c] });
  r.played = played;
  r.skipped = skipped;
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
