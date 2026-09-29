// Signalverarbeitung in Node: Ein-/Ausblenden, Mischen, Lautheit (ITU-R BS.1770 / EBU R128),
// True Peak, Lookahead-Begrenzer, WAV lesen/schreiben. Alles deterministisch (kein Zufall außer
// dem festen Dither beim Schreiben der 16-Bit-Datei).
import { writeFileSync, readFileSync } from 'node:fs';

// --- Puffer ---------------------------------------------------------------------------------------

/** Stereo-Puffer aus zwei Float32Array. */
export const stereo = (n) => ({ l: new Float32Array(n), r: new Float32Array(n) });

/** src (Stereo) ab Abtastwert `at` in dst addieren, mit Faktor `g` (Zahl oder Funktion der Zeit ab Beginn von src in s). */
export function mixInto(dst, src, at, g = 1, sr = 44100) {
  const n = Math.min(src.l.length, dst.l.length - at);
  const fn = typeof g === 'function' ? g : null;
  for (let i = Math.max(0, -at); i < n; i++) {
    const k = fn ? fn(i / sr) : g;
    dst.l[at + i] += src.l[i] * k;
    dst.r[at + i] += src.r[i] * k;
  }
}

/** Stereo-Puffer mit Verstärkungsfunktion f(t) in Sekunden ab Bufferbeginn (t0 = Zeit von Index 0) multiplizieren. */
export function applyGain(buf, f, t0 = 0, sr = 44100) {
  for (let i = 0; i < buf.l.length; i++) {
    const k = f(t0 + i / sr);
    if (k !== 1) {
      buf.l[i] *= k;
      buf.r[i] *= k;
    }
  }
}

/** Verlauf aus Punkten [[t, dB], …]: linear in dB dazwischen; vor/nach dem Bereich bleibt der Wert stehen. dB ≤ −90 ergibt 0. */
export function dbCurve(points) {
  const lin = (db) => (db <= -90 ? 0 : 10 ** (db / 20));
  return (t) => {
    if (t <= points[0][0]) return lin(points[0][1]);
    for (let i = 1; i < points.length; i++) {
      if (t <= points[i][0]) {
        const [a, da] = points[i - 1];
        const [b, db] = points[i];
        const u = b === a ? 1 : (t - a) / (b - a);
        // Zwischen Stille (−90) und einem Wert nicht in dB interpolieren, sondern linear im Pegel (sonst hört man »Rutschen«)
        if (da <= -90 || db <= -90) return lin(da) + (lin(db) - lin(da)) * u;
        return lin(da + (db - da) * u);
      }
    }
    return lin(points[points.length - 1][1]);
  };
}

/** Sanfte Ausblendung (Kosinus) von Zeit a (Pegel 1) bis b (Pegel 0). */
export const fadeOut = (a, b) => (t) => (t <= a ? 1 : t >= b ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * (t - a)) / (b - a)));
/** Sanfte Einblendung (Kosinus) von Zeit a (0) bis b (1). */
export const fadeIn = (a, b) => (t) => (t <= a ? 0 : t >= b ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * (t - a)) / (b - a)));

// --- Lautheit (BS.1770-4) -----------------------------------------------------------------------------

function biquad(b0, b1, b2, a1, a2) {
  return (x) => {
    const y = new Float32Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = x[i];
      const o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = v; y2 = y1; y1 = o;
      y[i] = o;
    }
    return y;
  };
}

/** K-Bewertung: Hochfrequenz-Anhebung (Kopf) und Hochpass (RLB), Koeffizienten für beliebige Abtastrate. */
export function kWeight(x, sr) {
  // Stufe 1: High-Shelf
  let f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
  let K = Math.tan((Math.PI * f0) / sr);
  const Vh = 10 ** (G / 20);
  const Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q + K * K;
  const s1 = biquad((Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0);
  // Stufe 2: Hochpass
  f0 = 38.13547087602444;
  Q = 0.5003270373238773;
  K = Math.tan((Math.PI * f0) / sr);
  a0 = 1 + K / Q + K * K;
  const s2 = biquad(1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0);
  return s2(s1(x));
}

/** Lautheitsmesser über ein Stereo-Signal: Summenfeld der K-bewerteten Quadrate für O(1)-Fensterabfragen. */
export class Meter {
  constructor(buf, sr = 44100) {
    this.sr = sr;
    const kl = kWeight(buf.l, sr);
    const kr = kWeight(buf.r, sr);
    const n = kl.length;
    this.prefix = new Float64Array(n + 1);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      acc += kl[i] * kl[i] + kr[i] * kr[i];
      this.prefix[i + 1] = acc;
    }
    this.n = n;
  }

  /** mittleres Quadrat (beide Kanäle addiert) im Fenster [t0, t1) in s */
  energy(t0, t1) {
    const a = Math.max(0, Math.round(t0 * this.sr));
    const b = Math.min(this.n, Math.round(t1 * this.sr));
    if (b <= a) return 0;
    return (this.prefix[b] - this.prefix[a]) / (b - a);
  }

  /** Lautheit des Fensters in LUFS (ohne Gate, für Abschnittsmessungen) */
  lufs(t0, t1) {
    const e = this.energy(t0, t1);
    return e > 0 ? -0.691 + 10 * Math.log10(e) : -Infinity;
  }

  /** Blocklautheiten (400 ms, Schritt 100 ms) */
  blocks(win = 0.4, hop = 0.1, from = 0, to = this.n / this.sr) {
    const out = [];
    for (let t = from; t + win <= to + 1e-9; t += hop) out.push({ t, e: this.energy(t, t + win) });
    return out;
  }

  /** Integrierte Lautheit mit absolutem (−70) und relativem (−10 LU) Gate; Bereich [from, to] */
  integrated(from = 0, to = this.n / this.sr) {
    const bl = this.blocks(0.4, 0.1, from, to);
    const abs = bl.filter((b) => b.e > 0 && -0.691 + 10 * Math.log10(b.e) > -70);
    if (!abs.length) return -Infinity;
    const mean = abs.reduce((a, b) => a + b.e, 0) / abs.length;
    const rel = -0.691 + 10 * Math.log10(mean) - 10;
    const rest = abs.filter((b) => -0.691 + 10 * Math.log10(b.e) > rel);
    const m2 = rest.reduce((a, b) => a + b.e, 0) / rest.length;
    return -0.691 + 10 * Math.log10(m2);
  }

  /** Kurzzeit-Lautheit (3 s, Schritt 0,1 s) als Reihe [{t, lufs}], t = Ende des Fensters */
  shortTerm(from = 0, to = this.n / this.sr) {
    const out = [];
    for (let t = from + 3; t <= to + 1e-9; t += 0.1) {
      const e = this.energy(t - 3, t);
      out.push({ t, lufs: e > 0 ? -0.691 + 10 * Math.log10(e) : -Infinity });
    }
    return out;
  }

  /** Lautheitsumfang (EBU Tech 3342): Kurzzeitwerte, Gate −70 abs und −20 LU rel., 10.–95. Perzentil */
  lra() {
    const st = this.shortTerm().filter((v) => v.lufs > -70);
    if (!st.length) return 0;
    const mean = st.reduce((a, v) => a + 10 ** (v.lufs / 10), 0) / st.length;
    const rel = 10 * Math.log10(mean) - 20;
    const s = st.filter((v) => v.lufs > rel).map((v) => v.lufs).sort((a, b) => a - b);
    if (s.length < 2) return 0;
    const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
    return q(0.95) - q(0.1);
  }
}

/** Kurzzeit-RMS (dBFS, beide Kanäle gemittelt) im gleitenden Fenster: [{t (Ende), db}] */
export function shortTermRms(buf, win = 3, hop = 0.5, sr = 44100) {
  const n = buf.l.length;
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + buf.l[i] * buf.l[i] + buf.r[i] * buf.r[i];
  const out = [];
  for (let t = win; t <= n / sr + 1e-9; t += hop) {
    const a = Math.round((t - win) * sr);
    const b = Math.min(n, Math.round(t * sr));
    out.push({ t, db: 10 * Math.log10((pre[b] - pre[a]) / (2 * (b - a)) + 1e-30) });
  }
  return out;
}

// --- True Peak und Begrenzer ---------------------------------------------------------------------------

/** 4-fach überabgetastet: 12 Taps je Phase, Blackman-Harris-Fenster (Phasen 1…3; Phase 0 ist das Signal selbst). */
const TP_TAPS = 12;
const TP_PHASE = (() => {
  const H = [];
  const half = TP_TAPS / 2 - 1;
  for (let p = 1; p < 4; p++) {
    const phi = p / 4; // Ausgabepunkt zwischen x[i] und x[i+1]
    const h = new Float64Array(TP_TAPS);
    let sum = 0;
    for (let j = 0; j < TP_TAPS; j++) {
      const d = phi - (j - half); // Abstand des Abtastwerts x[i + k] vom Ausgabepunkt, k = j − half
      const w = 0.35875 + 0.48829 * Math.cos((2 * Math.PI * d) / TP_TAPS) + 0.14128 * Math.cos((4 * Math.PI * d) / TP_TAPS) + 0.01168 * Math.cos((6 * Math.PI * d) / TP_TAPS);
      h[j] = (d === 0 ? 1 : Math.sin(Math.PI * d) / (Math.PI * d)) * w;
      sum += h[j];
    }
    for (let j = 0; j < TP_TAPS; j++) h[j] /= sum;
    H.push(h);
  }
  return H;
})();

/** Spitzenverlauf je Abtastwert: Maximum aus |x| und den drei Zwischenwerten bis zum nächsten Abtastwert (beide Kanäle). */
export function peakTrack(buf) {
  const n = buf.l.length;
  const pk = new Float32Array(n);
  const half = TP_TAPS / 2 - 1;
  for (const x of [buf.l, buf.r]) {
    for (let i = 0; i < n; i++) {
      let m = Math.abs(x[i]);
      const lo = i - half;
      if (lo >= 0 && i + TP_TAPS - half <= n) {
        for (let p = 0; p < 3; p++) {
          const h = TP_PHASE[p];
          let acc = 0;
          for (let k = 0; k < TP_TAPS; k++) acc += x[lo + k] * h[k];
          const a = Math.abs(acc);
          if (a > m) m = a;
        }
      }
      if (m > pk[i]) pk[i] = m;
    }
  }
  return pk;
}

export const toDb = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);

export function truePeakDb(buf) {
  const pk = peakTrack(buf);
  let m = 0;
  for (let i = 0; i < pk.length; i++) if (pk[i] > m) m = pk[i];
  return toDb(m);
}

/**
 * Lookahead-Begrenzer (offline, ohne Latenz): Verstärkung folgt dem überabgetasteten Spitzenverlauf.
 * Gleitendes Minimum (±attack) → gleitender Mittelwert (glatte Rampe vor jeder Spitze) → langsame Erholung.
 * ceilingDb: Obergrenze in dBTP (linear gedeckelt); attack in s, release in s.
 */
export function limit(buf, { ceilingDb = -1.3, attack = 0.004, release = 0.12, sr = 44100 } = {}) {
  const n = buf.l.length;
  const ceil = 10 ** (ceilingDb / 20);
  const pk = peakTrack(buf);
  const need = new Float32Array(n);
  let over = 0;
  for (let i = 0; i < n; i++) {
    need[i] = pk[i] > ceil ? ceil / pk[i] : 1;
    if (need[i] < 1) over++;
  }
  if (!over) return { maxReductionDb: 0, over: 0 };
  const L = Math.max(2, Math.round(attack * sr));
  // gleitendes Minimum über [i−L, i+L] (Deque)
  const mn = new Float32Array(n);
  const dq = new Int32Array(n);
  let head = 0, tail = 0;
  for (let i = 0; i < n + L; i++) {
    if (i < n) {
      while (tail > head && need[dq[tail - 1]] >= need[i]) tail--;
      dq[tail++] = i;
    }
    const c = i - L; // Mitte des Fensters
    if (c >= 0) {
      while (dq[head] < c - L) head++;
      mn[c] = need[dq[head]];
    }
  }
  // gleitender Mittelwert über L+1 Werte, zentriert
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + mn[i];
  const g = new Float32Array(n);
  const hw = Math.floor(L / 2);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - hw);
    const b = Math.min(n - 1, i + hw);
    g[i] = (pre[b + 1] - pre[a]) / (b - a + 1);
  }
  // Erholung: nie über die vorige Verstärkung + exponentielle Rückkehr zu 1
  const rel = Math.exp(-1 / (release * sr));
  let prev = 1;
  let minG = 1;
  for (let i = 0; i < n; i++) {
    const back = 1 - (1 - prev) * rel;
    prev = Math.min(g[i], back);
    g[i] = prev;
    if (prev < minG) minG = prev;
    buf.l[i] *= prev;
    buf.r[i] *= prev;
  }
  return { maxReductionDb: toDb(minG), over };
}

// --- WAV --------------------------------------------------------------------------------------------------

function header(kind, channels, sr, bytes) {
  const h = Buffer.alloc(44);
  const bits = kind === 'pcm16' ? 16 : 32;
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + bytes, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(kind === 'pcm16' ? 1 : 3, 20);
  h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(sr, 24);
  h.writeUInt32LE((sr * channels * bits) / 8, 28);
  h.writeUInt16LE((channels * bits) / 8, 32);
  h.writeUInt16LE(bits, 34);
  h.write('data', 36);
  h.writeUInt32LE(bytes, 40);
  return h;
}

/** 16 Bit, stereo, TPDF-Dither (fester Startwert – Ergebnis bleibt bitgleich). */
export function writeWav16(path, buf, sr = 44100) {
  const n = buf.l.length;
  const data = Buffer.alloc(n * 4);
  let s = 0x12345678;
  const rand = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 2; c++) {
      const x = (c ? buf.r : buf.l)[i] * 32767 + (rand() - rand());
      data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x))), i * 4 + c * 2);
    }
  }
  writeFileSync(path, Buffer.concat([header('pcm16', 2, sr, data.length), data]));
}

/** 32-Bit-Gleitkomma, stereo (für die Stems: keine Rundung, kein Übersteuern). */
export function writeWavFloat(path, buf, sr = 44100) {
  const n = buf.l.length;
  const data = Buffer.alloc(n * 8);
  for (let i = 0; i < n; i++) {
    data.writeFloatLE(buf.l[i], i * 8);
    data.writeFloatLE(buf.r[i], i * 8 + 4);
  }
  writeFileSync(path, Buffer.concat([header('float', 2, sr, data.length), data]));
}

/** Stereo-WAV (16 Bit oder 32 Bit float) lesen – für Prüfungen. */
export function readWav(path) {
  const b = readFileSync(path);
  const fmt = b.readUInt16LE(20);
  const ch = b.readUInt16LE(22);
  const sr = b.readUInt32LE(24);
  const bits = b.readUInt16LE(34);
  let off = 12;
  while (b.toString('ascii', off, off + 4) !== 'data') off += 8 + b.readUInt32LE(off + 4);
  const bytes = b.readUInt32LE(off + 4);
  const n = bytes / (ch * (bits / 8));
  const out = stereo(n);
  let p = off + 8;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      const v = fmt === 3 ? b.readFloatLE(p) : b.readInt16LE(p) / 32768;
      p += bits / 8;
      if (c === 0) out.l[i] = v;
      if (c === 1 || ch === 1) out.r[i] = v;
    }
  }
  return { ...out, sr, ch };
}
