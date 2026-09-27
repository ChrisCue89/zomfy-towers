// Klang (DESIGN.md 6.18): Alles entsteht im Browser (Web Audio), es gibt keine
// Tondateien. Der AudioContext wird erst bei der ersten echten Eingabe (Taste,
// Klick) angelegt – vorher wäre er gesperrt, und der Browser meldete eine
// Warnung (die Konsole muss sauber bleiben).
//
//   Effekte   play('hacken', { x, z }) – kurz, aus Rauschen und Oszillatoren,
//             leiser mit der Entfernung zu Mika, leicht nach links/rechts
//   Umgebung  Wind, Vögel am Tag, Grillen in der Nacht, Knistern am Feuer
//   Musik     leise Melodie am Abend, treibender Rhythmus während der Wellen;
//             Balduins Fanfare, wenn sein Boot kommt (M9.1)

const VOICES = 32; // höchstens so viele Effekte gleichzeitig
const HEAR = 16; // Meter: weiter weg hört man nichts mehr
const NEAR = 3; // Meter: bis hierher volle Lautstärke
const LOOKAHEAD = 0.25; // Sekunden, die der Musik-Takt vorausgeplant wird

// Pentatonik in C (Abendmelodie) und a-Moll (Nacht)
const MELODY = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];
const CHORDS = [
  [261.63, 329.63, 392.0], // C
  [220.0, 261.63, 329.63], // a
  [174.61, 220.0, 261.63], // F
  [196.0, 246.94, 293.66], // G
];
const BASS = [55.0, 55.0, 65.41, 49.0]; // A1 A1 C2 G1

// Balduins Fanfare (M9.1): D-Dur, 100 Schläge pro Minute. Noten als
// [Schlag, Länge in Schlägen, Frequenz]. Drei Takte Ruf, dann der Schlussakkord
// genau aufs Anlegen (die Einfahrt dauert 24 Spielminuten = 9,6 s).
const N = { A1: 55.0, D2: 73.42, G1: 49.0, A2: 110.0, D3: 146.83, Fis3: 185.0, G3: 196.0, A3: 220.0, H3: 246.94, Cis4: 277.18, D4: 293.66, E4: 329.63, Fis4: 369.99, G4: 392.0, A4: 440.0, H4: 493.88, D5: 587.33, E5: 659.25, Fis5: 739.99, G5: 783.99, A5: 880.0 };
const FANFARE = {
  beat: 0.6,
  start: 2.4, // davor: Schiffshorn und Paukenwirbel
  melody: [
    [0, 1.5, N.A4], [1.5, 0.5, N.A4], [2, 2, N.D5],
    [4, 1, N.Fis5], [5, 0.5, N.E5], [5.5, 0.5, N.D5], [6, 1, N.E5], [7, 1, N.A4],
    [8, 1, N.H4], [9, 0.5, N.D5], [9.5, 0.5, N.G5], [10, 1, N.Fis5], [11, 1, N.E5],
  ],
  // Akkorde der Blechbläser: [Schlag, Länge, Töne]
  chords: [
    [0, 4, [N.D4, N.Fis4, N.A4]], [4, 2, [N.D4, N.Fis4, N.A4]], [6, 2, [N.Cis4, N.E4, N.A4]],
    [8, 2, [N.D4, N.G4, N.H4]], [10, 2, [N.Cis4, N.E4, N.A4]],
  ],
  bass: [N.D2, N.A1, N.D2, N.A1, N.D2, N.D2, N.A1, N.A1, N.G1, N.G1, N.A1, N.A1],
  final: [N.D3, N.A3, N.D4, N.Fis4, N.A4, N.D5],
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Effekte als kleine Rezepte: (s, t, v, out) – s ist der Klang-Baukasten,
 * t die Startzeit, v die Lautstärke (0..1), out der Ausgang.
 */
const SFX = {
  schritt: (s, t, v, o) => s.noise(t, 0.05, { type: 'lowpass', freq: 650, peak: 0.1 * v, out: o }),
  schrittHolz: (s, t, v, o) => {
    s.noise(t, 0.04, { type: 'bandpass', freq: 1300, q: 2, peak: 0.12 * v, out: o });
    s.tone('sine', 190, t, 0.05, { freqEnd: 150, peak: 0.08 * v, out: o });
  },
  hacken: (s, t, v, o) => {
    s.noise(t, 0.09, { type: 'bandpass', freq: 1100, q: 1.2, peak: 0.45 * v, out: o });
    s.tone('sine', 150, t, 0.13, { freqEnd: 70, peak: 0.45 * v, out: o });
  },
  stein: (s, t, v, o) => {
    s.noise(t, 0.035, { type: 'highpass', freq: 2600, peak: 0.3 * v, out: o });
    s.tone('triangle', 1900, t, 0.18, { freqEnd: 1750, peak: 0.1 * v, out: o });
  },
  rupfen: (s, t, v, o) => s.noise(t, 0.14, { type: 'highpass', freq: 2400, freqEnd: 4200, attack: 0.03, peak: 0.16 * v, out: o }),
  aufheben: (s, t, v, o) => s.tone('triangle', 620, t, 0.08, { freqEnd: 860, peak: 0.12 * v, out: o }),
  suchen: (s, t, v, o) => s.noise(t, 0.22, { type: 'bandpass', freq: 700, freqEnd: 1600, q: 1.5, attack: 0.05, peak: 0.16 * v, out: o }),
  schwung: (s, t, v, o) => s.noise(t, 0.16, { type: 'bandpass', freq: 450, freqEnd: 1700, q: 1.4, attack: 0.05, peak: 0.22 * v, out: o }),
  treffer: (s, t, v, o) => {
    s.tone('sine', 125, t, 0.15, { freqEnd: 55, peak: 0.55 * v, out: o });
    s.noise(t, 0.05, { type: 'lowpass', freq: 1900, peak: 0.35 * v, out: o });
  },
  autsch: (s, t, v, o) => s.tone('square', 520, t, 0.13, { freqEnd: 250, peak: 0.07 * v, filter: 1800, out: o }),
  rolle: (s, t, v, o) => s.noise(t, 0.26, { type: 'bandpass', freq: 300, freqEnd: 950, q: 1.2, attack: 0.06, peak: 0.2 * v, out: o }),
  bolzen: (s, t, v, o) => {
    s.tone('sawtooth', 720, t, 0.09, { freqEnd: 190, peak: 0.08 * v, filter: 2600, out: o });
    s.noise(t, 0.03, { type: 'highpass', freq: 3200, peak: 0.08 * v, out: o });
  },
  katapult: (s, t, v, o) => {
    s.noise(t, 0.3, { type: 'lowpass', freq: 700, freqEnd: 220, attack: 0.04, peak: 0.22 * v, out: o });
    s.tone('sine', 95, t, 0.2, { freqEnd: 60, peak: 0.2 * v, out: o });
  },
  platsch: (s, t, v, o) => {
    s.noise(t, 0.22, { type: 'lowpass', freq: 900, peak: 0.3 * v, out: o });
    s.tone('sine', 75, t, 0.2, { freqEnd: 40, peak: 0.3 * v, out: o });
  },
  sprenger: (s, t, v, o) => s.noise(t, 0.24, { type: 'highpass', freq: 1500, attack: 0.02, peak: 0.12 * v, out: o }),
  glocke: (s, t, v, o) => {
    s.tone('sine', 880, t, 0.7, { peak: 0.08 * v, attack: 0.005, out: o });
    s.tone('sine', 1320, t, 0.45, { peak: 0.04 * v, attack: 0.005, out: o });
  },
  // Balduins Wagenglöckchen und das Rumpeln der Räder (Meilenstein 8)
  bimmel: (s, t, v, o) => {
    for (const dt of [0, 0.15, 0.3]) {
      s.tone('sine', 1560, t + dt, 0.24, { peak: 0.05 * v, attack: 0.003, out: o });
      s.tone('sine', 2340, t + dt, 0.14, { peak: 0.025 * v, attack: 0.003, out: o });
    }
  },
  rumpeln: (s, t, v, o) => s.noise(t, 0.12, { type: 'lowpass', freq: 380, freqEnd: 160, attack: 0.01, peak: 0.1 * v, out: o }),
  loot: (s, t, v, o, opt) => {
    const base = opt.pitch || 880;
    [1, 1.26, 1.5].forEach((m, k) => s.tone('triangle', base * m, t + k * 0.045, 0.09, { peak: 0.08 * v, out: o }));
  },
  bau: (s, t, v, o) => {
    for (const dt of [0, 0.13]) {
      s.noise(t + dt, 0.05, { type: 'bandpass', freq: 950, q: 1.5, peak: 0.35 * v, out: o });
      s.tone('sine', 170, t + dt, 0.08, { freqEnd: 110, peak: 0.25 * v, out: o });
    }
  },
  abriss: (s, t, v, o) => s.noise(t, 0.4, { type: 'lowpass', freq: 1400, freqEnd: 260, peak: 0.35 * v, out: o }),
  aufwertung: (s, t, v, o) => [523.25, 659.25, 783.99].forEach((f, k) => s.tone('square', f, t + k * 0.06, 0.1, { peak: 0.05 * v, filter: 2400, out: o })),
  klick: (s, t, v, o) => s.tone('square', 1250, t, 0.02, { peak: 0.035 * v, filter: 3000, out: o }),
  tipp: (s, t, v, o, opt) => s.tone('square', opt.pitch || 520, t, 0.028, { peak: 0.025 * v, filter: 2200, out: o }),
  welle: (s, t, v, o) => {
    s.tone('sawtooth', 110, t, 1.7, { attack: 0.35, peak: 0.12 * v, filter: 650, out: o });
    s.tone('sawtooth', 164.81, t, 1.7, { attack: 0.35, peak: 0.09 * v, filter: 650, out: o });
    s.tone('sawtooth', 55, t, 1.9, { attack: 0.4, peak: 0.1 * v, filter: 300, out: o });
  },
  stufe: (s, t, v, o) => [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => s.tone('triangle', f, t + k * 0.08, 0.18, { peak: 0.1 * v, out: o })),
  morgen: (s, t, v, o) => [659.25, 783.99, 1046.5].forEach((f, k) => s.tone('sine', f, t + k * 0.14, 0.5, { peak: 0.07 * v, out: o })),
  bellen: (s, t, v, o) => {
    for (const dt of [0, 0.17]) {
      s.noise(t + dt, 0.09, { type: 'bandpass', freq: 760, freqEnd: 480, q: 3, peak: 0.45 * v, out: o });
      s.tone('square', 330, t + dt, 0.08, { freqEnd: 230, peak: 0.05 * v, filter: 1200, out: o });
    }
  },
  tod: (s, t, v, o) => {
    s.tone('sawtooth', 140, t, 0.42, { freqEnd: 58, peak: 0.1 * v, filter: 520, out: o });
    s.noise(t + 0.1, 0.32, { type: 'lowpass', freq: 520, peak: 0.2 * v, out: o });
  },
  stoehnen: (s, t, v, o, opt) => s.tone('sawtooth', opt.pitch || 88, t, 0.9, { attack: 0.18, peak: 0.06 * v, filter: 420, vibrato: 5, out: o }),
  zuhause: (s, t, v, o) => {
    s.noise(t, 0.12, { type: 'lowpass', freq: 800, peak: 0.35 * v, out: o });
    s.tone('sine', 90, t, 0.18, { freqEnd: 50, peak: 0.3 * v, out: o });
  },
};

/** Wie oft ein Effekt höchstens kommt (Sekunden) – sonst prasselt es im Getümmel. */
const MIN_GAP = { rumpeln: 0.2, bimmel: 0.5, sprenger: 0.28, treffer: 0.03, bolzen: 0.04, loot: 0.05, schritt: 0.08, schrittHolz: 0.08, stoehnen: 0.6, tipp: 0.045, zuhause: 0.12, tod: 0.05 };

export class Sound {
  /** @param {{master:number, music:number, sfx:number}} volumes 0..1 */
  constructor(volumes) {
    this.volumes = { master: 0.8, music: 0.6, sfx: 0.8, ...volumes };
    this.ctx = null;
    this.failed = false;
    this.listener = { x: 0, z: 0 };
    this.voices = 0; // laufende Effekt-Stimmen
    this.counting = false;
    this.last = new Map();
    this.nextBird = 2;
    this.nextCricket = 1;
    this.nextPop = 0;
    this.nextGroan = 3;
    this.music = { mode: null, beat: 0, time: 0, bar: 0 };
    this.musicLevel = 0; // 0..1, sanft ein- und ausgeblendet
  }

  get ready() {
    return Boolean(this.ctx) && this.ctx.state === 'running';
  }

  /** Erste echte Eingabe: Klang anlegen bzw. wieder aufwecken. */
  unlock() {
    if (this.failed) return;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) {
      this.failed = true;
      return;
    }
    try {
      this.ctx = new AC();
    } catch {
      this.failed = true;
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    this.sfxBus = c.createGain();
    this.sfxBus.connect(this.master);
    this.ambBus = c.createGain();
    this.ambBus.connect(this.master);
    this.musicBus = c.createGain();
    this.musicBus.connect(this.master);
    this.musicFade = c.createGain();
    this.musicFade.gain.value = 0;
    this.musicFade.connect(this.musicBus);
    // Rauschen für Wind, Feuer und Schritte (einmal erzeugt)
    const len = c.sampleRate * 2;
    this.noiseBuffer = c.createBuffer(1, len, c.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    // Wind: endloses, weich gefiltertes Rauschen
    this.wind = this.loop({ type: 'lowpass', freq: 380, gain: 0 });
    this.fire = this.loop({ type: 'lowpass', freq: 260, gain: 0 });
    this.applyVolumes();
  }

  setVolumes(volumes) {
    Object.assign(this.volumes, volumes);
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.volumes.sfx * 0.9, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music, t, 0.05);
  }

  /** Tab im Hintergrund: Klang anhalten. */
  pause(paused) {
    if (!this.ctx) return;
    if (paused && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
    else if (!paused && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  // --- Baukasten ------------------------------------------------------------------------

  /** Endloses gefiltertes Rauschen (Wind, Feuer). */
  loop({ type, freq, gain }) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(this.ambBus);
    src.start();
    return { filter, gain: g };
  }

  envelope(param, t, attack, dur, peak) {
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + Math.max(attack + 0.01, dur));
  }

  track(node, end) {
    // Nur Effekte zählen gegen die Obergrenze – Musik und Umgebung laufen immer
    const sfx = this.counting;
    if (sfx) this.voices++;
    node.onended = () => {
      if (sfx) this.voices--;
    };
    node.stop(end);
  }

  tone(type, freq, t, dur, { freqEnd = null, peak = 0.1, attack = 0.008, filter = 0, vibrato = 0, out }) {
    const c = this.ctx;
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    if (vibrato) {
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.frequency.value = vibrato;
      depth.gain.value = freq * 0.04;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    const g = c.createGain();
    this.envelope(g.gain, t, attack, dur, peak);
    let node = osc;
    if (filter) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      node.connect(f);
      node = f;
    }
    node.connect(g).connect(out);
    osc.start(t);
    this.track(osc, t + dur + 0.05);
  }

  noise(t, dur, { type = 'lowpass', freq = 1000, freqEnd = null, q = 0.8, peak = 0.2, attack = 0.004, out }) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = c.createGain();
    this.envelope(g.gain, t, attack, dur, peak);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 1.5);
    this.track(src, t + dur + 0.05);
  }

  /**
   * Blechbläser: zwei leicht verstimmte Sägezähne durch einen Tiefpass, der beim
   * Anblasen kurz aufgeht (der »Biss« eines Horns), mit gehaltenem Ton.
   */
  brass(freq, t, dur, peak, out) {
    const c = this.ctx;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 1.1;
    f.frequency.setValueAtTime(freq * 1.5, t);
    f.frequency.linearRampToValueAtTime(Math.min(4200, freq * 6), t + 0.05);
    f.frequency.exponentialRampToValueAtTime(Math.min(2600, freq * 3.2), t + 0.3);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.045);
    g.gain.linearRampToValueAtTime(peak * 0.8, t + Math.max(0.06, dur - 0.05));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.16);
    f.connect(g).connect(out);
    for (const detune of [-7, 6]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(freq, t);
      o.detune.value = detune;
      o.connect(f);
      o.start(t);
      this.track(o, t + dur + 0.22);
    }
  }

  /**
   * Balduins Auftritt (M9.1, Wunsch des Auftraggebers: »eine epische Musik beim
   * Eintreffen«): ein Schiffshorn aus dem Osten, ein Paukenwirbel, dann drei Takte
   * Fanfare in D-Dur über Horn-Akkorden, Tuba und kleiner Trommel. Der
   * Schlussakkord mit Becken fällt aufs Anlegen. Läuft über den Musik-Regler.
   */
  fanfare() {
    if (!this.ready) return;
    const c = this.ctx;
    const t0 = c.currentTime + 0.05;
    const out = c.createGain();
    out.gain.value = 0.85;
    out.connect(this.musicBus);
    const F = FANFARE;
    const at = (beat) => t0 + F.start + beat * F.beat;
    // Schiffshorn: tief, zweistimmig, von rechts (das Boot kommt von Osten)
    let horn = out;
    if (c.createStereoPanner) {
      horn = c.createStereoPanner();
      horn.pan.value = 0.55;
      horn.connect(out);
    }
    for (const [start, len] of [[0, 1.2], [1.4, 0.55]]) for (const f of [N.D2, N.A2]) this.brass(f, t0 + start, len, 0.11, horn);
    // Paukenwirbel zum Einsatz: immer dichter und lauter
    for (let k = 0, t = t0 + 1.0; t < at(0) - 0.02; k++) {
      const v = 0.08 + 0.22 * ((t - t0 - 1.0) / (F.start - 1.0));
      this.tone('sine', 98, t, 0.25, { freqEnd: 60, peak: v, attack: 0.004, out });
      t += Math.max(0.055, 0.16 - k * 0.012);
    }
    // Melodie (Horn, hell) und Akkorde (Hörner, weich)
    for (const [beat, len, f] of F.melody) this.brass(f, at(beat), len * F.beat * 0.92, 0.1, out);
    for (const [beat, len, notes] of F.chords) for (const f of notes) this.brass(f, at(beat), len * F.beat * 0.96, 0.03, out);
    // Tuba je Schlag, Pauke auf die Eins, kleine Trommel auf zwei und vier
    F.bass.forEach((f, k) => {
      this.tone('square', f, at(k), F.beat * 0.8, { peak: 0.09, attack: 0.02, filter: 320, out });
      if (k % 4 === 0) this.tone('sine', f * 1.5, at(k), 0.45, { freqEnd: f, peak: 0.3, attack: 0.004, out });
      if (k % 2 === 1) this.noise(at(k), 0.1, { type: 'bandpass', freq: 1900, q: 0.9, peak: 0.07, out });
    });
    // Trommelwirbel in den Schluss hinein
    for (let t = at(11.25); t < at(12) - 0.02; t += 0.055) this.noise(t, 0.05, { type: 'bandpass', freq: 2000, q: 1, peak: 0.05, out });
    // Schlussakkord mit Pauke und Becken – Balduin ist da
    const end = at(12);
    for (const f of F.final) this.brass(f, end, 1.7, f > 500 ? 0.05 : 0.035, out);
    this.tone('sine', 110, end, 0.8, { freqEnd: N.D2, peak: 0.36, attack: 0.004, out });
    this.noise(end, 1.8, { type: 'highpass', freq: 5200, peak: 0.08, attack: 0.004, out });
    this.tone('square', N.D2, end, 1.6, { peak: 0.1, attack: 0.02, filter: 320, out });
  }

  /**
   * Balduins Motor (M10): ein tiefes Tuckern, solange das Boot fährt – leiser
   * in der Ferne, leicht zur Seite, wo das Boot ist. level 0 = aus.
   */
  motor(level, x = 0, z = 0) {
    if (!this.ready) return;
    const c = this.ctx;
    if (!this._motor) {
      if (level <= 0) return;
      // Rechteckton, dessen Lautstärke ein zweites Rechteck (7 Hz) an- und ausknipst
      const osc = c.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 56;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 240;
      const pulse = c.createGain();
      pulse.gain.value = 0.5;
      const lfo = c.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 7;
      const depth = c.createGain();
      depth.gain.value = 0.5;
      lfo.connect(depth).connect(pulse.gain);
      const out = c.createGain();
      out.gain.value = 0;
      const pan = c.createStereoPanner ? c.createStereoPanner() : null;
      osc.connect(filter).connect(pulse).connect(out);
      if (pan) out.connect(pan).connect(this.ambBus);
      else out.connect(this.ambBus);
      osc.start();
      lfo.start();
      this._motor = { out, pan, lfo };
    }
    const t = c.currentTime;
    const d = Math.hypot(x - this.listener.x, z - this.listener.z);
    const v = Math.max(0, level) * clamp(1 - (d - 5) / 32, 0, 1) * 0.1;
    this._motor.out.gain.setTargetAtTime(v, t, 0.2);
    this._motor.lfo.frequency.setTargetAtTime(5 + Math.max(0, level) * 3, t, 0.3);
    if (this._motor.pan) this._motor.pan.pan.setTargetAtTime(clamp((x - this.listener.x) / 14, -1, 1) * 0.7, t, 0.2);
  }

  // --- Effekte ----------------------------------------------------------------------------

  /**
   * Einen Effekt spielen. Mit x/z leiser in der Ferne und etwas seitlich.
   * @param {string} name
   * @param {{x?:number, z?:number, volume?:number, pitch?:number}} [opt]
   */
  play(name, opt = {}) {
    if (!this.ready || this.voices > VOICES) return;
    const recipe = SFX[name];
    if (!recipe) return;
    const c = this.ctx;
    const now = c.currentTime;
    const gap = MIN_GAP[name] || 0.02;
    if (now - (this.last.get(name) ?? -1) < gap) return;
    this.last.set(name, now);
    let v = opt.volume ?? 1;
    let out = this.sfxBus;
    if (opt.x !== undefined) {
      const dx = opt.x - this.listener.x;
      const dz = opt.z - this.listener.z;
      const d = Math.hypot(dx, dz);
      if (d > HEAR) return;
      v *= Math.pow(clamp(1 - (d - NEAR) / (HEAR - NEAR), 0, 1), 1.4);
      if (v < 0.02) return;
      if (c.createStereoPanner) {
        const pan = c.createStereoPanner();
        pan.pan.value = clamp(dx / 10, -1, 1) * 0.7;
        pan.connect(this.sfxBus);
        out = pan;
      }
    }
    this.counting = true;
    recipe(this, now + 0.005, v, out, opt);
    this.counting = false;
  }

  // --- Umgebung und Musik (jedes Bild) ------------------------------------------------------

  /**
   * @param {number} dt
   * @param {{hours:number, inside:boolean, fireDist:number, fight:boolean, zombiesNear:number, x:number, z:number, quiet:boolean}} s
   */
  update(dt, s) {
    this.listener.x = s.x;
    this.listener.z = s.z;
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const night = s.hours >= 20.25 || s.hours < 5.5;
    const day = s.hours >= 6 && s.hours < 19.5;
    // Wind: leise, nachts etwas kräftiger, drinnen gedämpft
    const windTarget = (night ? 0.05 : 0.032) * (s.inside ? 0.35 : 1) * (0.75 + 0.25 * Math.sin(t * 0.13) * Math.sin(t * 0.07));
    this.wind.gain.gain.setTargetAtTime(windTarget, t, 0.8);
    this.wind.filter.frequency.setTargetAtTime(300 + 180 * (0.5 + 0.5 * Math.sin(t * 0.21)), t, 0.8);
    // Feuer: Grundrauschen und Knistern in der Nähe
    const fire = clamp(1 - s.fireDist / 9, 0, 1);
    this.fire.gain.gain.setTargetAtTime(0.05 * fire * fire, t, 0.3);
    if (fire > 0 && (this.nextPop -= dt) <= 0) {
      this.nextPop = 0.04 + Math.random() * 0.25;
      this.noise(t, 0.012 + Math.random() * 0.02, { type: 'bandpass', freq: 1400 + Math.random() * 2200, q: 2, peak: 0.07 * fire, out: this.ambBus });
    }
    if (!s.inside && !s.quiet) {
      // Vögel am Tag: kurze Pfiffe mit schnellem Tonhöhenwechsel
      if (day && (this.nextBird -= dt) <= 0) {
        this.nextBird = 1.5 + Math.random() * 4.5;
        this.bird(t);
      }
      // Grillen in der Nacht: drei kurze Zirp-Pulse
      if (night && (this.nextCricket -= dt) <= 0) {
        this.nextCricket = 0.35 + Math.random() * 0.7;
        this.cricket(t);
      }
    }
    // Schlurfer in der Nähe brummeln ab und zu
    if (s.zombiesNear > 0 && (this.nextGroan -= dt) <= 0) {
      this.nextGroan = 1.2 + Math.random() * 3 / Math.min(4, s.zombiesNear);
      this.play('stoehnen', { volume: 0.7, pitch: 70 + Math.random() * 40 });
    }
    this.updateMusic(dt, s);
  }

  bird(t) {
    const out = this.panned(Math.random() * 2 - 1);
    const n = 2 + Math.floor(Math.random() * 4);
    const base = 2400 + Math.random() * 1800;
    for (let k = 0; k < n; k++) {
      const up = Math.random() < 0.5;
      this.tone('sine', base * (up ? 0.85 : 1.15), t + k * 0.09, 0.07, { freqEnd: base * (up ? 1.2 : 0.8), peak: 0.035, attack: 0.01, out });
    }
  }

  cricket(t) {
    const out = this.panned(Math.random() * 2 - 1);
    const f = 4200 + Math.random() * 700;
    for (let k = 0; k < 3; k++) this.tone('sine', f, t + k * 0.03, 0.014, { peak: 0.018, attack: 0.002, out });
  }

  panned(pan) {
    const c = this.ctx;
    if (!c.createStereoPanner) return this.ambBus;
    const p = c.createStereoPanner();
    p.pan.value = pan * 0.8;
    p.connect(this.ambBus);
    return p;
  }

  /** Abends eine leise Melodie, während der Wellen ein treibender Rhythmus. */
  updateMusic(dt, s) {
    const c = this.ctx;
    const t = c.currentTime;
    const want = s.fight ? 'nacht' : s.hours >= 17 && s.hours < 20.5 && !s.quiet ? 'abend' : null;
    const m = this.music;
    if (want && want !== m.mode) {
      m.mode = want;
      m.time = Math.max(m.time, t + 0.1);
      m.beat = 0;
    }
    // Ein- und Ausblenden
    this.musicLevel = clamp(this.musicLevel + (want ? dt / 2.5 : -dt / 3), 0, 1);
    this.musicFade.gain.setTargetAtTime(this.musicLevel * (m.mode === 'nacht' ? 0.9 : 0.7), t, 0.1);
    if (!m.mode || this.musicLevel <= 0) {
      if (!want) m.mode = null;
      return;
    }
    const out = this.musicFade;
    if (m.time < t - 0.1) m.time = t + 0.05; // nach einer Pause nichts nachholen
    while (m.time < t + LOOKAHEAD) {
      if (m.mode === 'nacht') {
        // 104 Schläge pro Minute in Achteln: Pauke auf 1 und 3, Hi-Hat dazwischen, Bass je Schlag
        const step = 60 / 104 / 2;
        const k = m.beat % 16;
        if (k % 4 === 0) this.tone('sine', 110, m.time, 0.22, { freqEnd: 42, peak: 0.5, out });
        if (k % 2 === 1) this.noise(m.time, 0.03, { type: 'highpass', freq: 7000, peak: 0.06, out });
        if (k % 2 === 0) this.tone('square', BASS[(k / 4) | 0], m.time, step * 1.6, { peak: 0.09, filter: 380, out });
        if (k === 14 && m.bar % 2 === 1) this.noise(m.time, 0.12, { type: 'bandpass', freq: 1800, q: 1, peak: 0.08, out });
        m.time += step;
        m.beat++;
        if (m.beat % 16 === 0) m.bar++;
      } else {
        // 72 Schläge pro Minute: sanfte Pentatonik-Melodie über wechselnden Akkorden
        const step = 60 / 72;
        const k = m.beat % 8;
        if (k === 0) {
          const chord = CHORDS[m.bar % CHORDS.length];
          for (const f of chord) this.tone('sine', f, m.time, step * 7.5, { attack: 0.4, peak: 0.035, out });
        }
        if (Math.random() < (k % 2 === 0 ? 0.8 : 0.45)) {
          const note = MELODY[Math.floor(Math.random() * MELODY.length)];
          this.tone('triangle', note, m.time, step * 0.9, { attack: 0.02, peak: 0.05, vibrato: 4.5, out });
        }
        m.time += step;
        m.beat++;
        if (m.beat % 8 === 0) m.bar++;
      }
    }
  }
}
