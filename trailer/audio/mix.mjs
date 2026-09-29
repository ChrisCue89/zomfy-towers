// Mischung: setzt die gerechneten Stücke, Übergänge, das Bett und die Effekte auf die Zeitachse,
// stellt die Pegel nach Messwerten (Lautheit/Spitze/RMS je Fenster) ein und mastert (Sättigung,
// Begrenzer, Lautheit −16 LUFS, Ein-/Ausblendung an den Rändern).
import { SR, DURATION, T, BAR, TOTAL_SAMPLES } from './score.mjs';
import { stereo, mixInto, applyGain, fadeIn, fadeOut, Meter, limit, truePeakDb, toDb } from './dsp.mjs';

const N = TOTAL_SAMPLES;
const dbToLin = (db) => 10 ** (db / 20);
const clone = (b) => ({ l: Float32Array.from(b.l), r: Float32Array.from(b.r) });

// --- Pegeltabelle (Vor-Master; Ziel ist am Ende −16 LUFS integriert) -----------------------------------------
// Musik: Lautheit (LUFS, ungegatet) im Fenster, gemessen am einzelnen Stück. Die Stufen der Nacht ergeben sich
// aus dem Stück selbst (Stufe 2 ist die lauteste), gemessen wird an Stufe 2.
export const LEVELS = {
  music: {
    jingle: { win: [0.05, 3.0], lufs: -20.5 },
    'titel-intro': { win: [T.titel + 0.1, T.titelCut - 0.1], lufs: -21.5 },
    nacht: { win: [T.nachtStage2, T.nachtEnd - 0.05], lufs: -14.5 },
    'titel-mid': { win: [T.mid + 0.3, T.midMusicEnd - 0.1], lufs: -19.5 },
    boss: { win: [T.boss + 0.1, T.bossEnd - 0.05], lufs: -14.0 },
    morning: { win: [T.morning + 0.1, T.title - 0.4], lufs: -30 },
    title: { win: [T.title + 0.1, T.end - 0.6], lufs: -20.5 },
  },
  // Übergänge: Spitze (dBFS) bzw. Lautheit im Fenster
  trans: {
    'trans-drone': { kind: 'peak', win: [T.trans, T.nacht + 0.1], target: -16 },
    'trans-riser': { kind: 'lufs', win: [T.nacht - 1.0, T.nacht], target: -21 },
    'trans-cymbal': { kind: 'lufs', win: [T.nacht - 1.0, T.nacht], target: -22 },
    'trans-heart': { kind: 'peak', win: [15.4, 15.9], target: -13 },
  },
  impacts: [
    { kind: 'peak', win: [T.nacht, T.nacht + 0.5], target: -3.5 },
    { kind: 'peak', win: [T.boss, T.boss + 0.5], target: -2.5 },
  ],
  // Bett: RMS / Spitze (dBFS)
  bed: {
    'bed-wind': { kind: 'rms', win: [0, 12], target: -42 },
    'bed-fire': { kind: 'rms', win: [32, 40], target: -47 },
    'bed-waves': { kind: 'peak', win: [5.9, 11.5], target: -34 },
    'bed-animals': { kind: 'peak', win: [4.5, 5.6], target: -28 },
  },
  sfxDb: 0, // Grundverstärkung der Effekt-Ebene (roh → Mix)
};

// Ducken der Musik beim Einschlag: [Zeit, Tiefe dB, Haltezeit s, Erholung s]
const DUCKS = { nacht: [T.nacht, -5, 0.06, 0.28], boss: [T.boss, -4, 0.06, 0.25] };
const duck = ([t0, db, hold, rel]) => (t) => {
  if (t < t0) return 1;
  const g = dbToLin(db);
  if (t < t0 + hold) return g;
  if (t > t0 + hold + rel) return 1;
  return g + (1 - g) * (0.5 - 0.5 * Math.cos((Math.PI * (t - t0 - hold)) / rel));
};
const mul = (...fs) => (t) => fs.reduce((a, f) => a * f(t), 1);

/** Hüllkurven der Stücke (Zeit auf der Trailer-Achse). */
const ENVELOPE = {
  jingle: fadeOut(3.4, 5.4),
  'titel-intro': fadeOut(13.0, 14.4),
  nacht: mul(fadeOut(T.mid + 0.07, T.mid + 1.4), duck(DUCKS.nacht)),
  'titel-mid': mul(fadeIn(T.mid, T.mid + 0.06), fadeOut(T.midMusicEnd - 0.1, T.midMusicEnd + 0.18)),
  boss: mul(fadeOut(T.bossEnd + 0.3, T.bossEnd + 0.5), duck(DUCKS.boss)),
  morning: fadeOut(T.title, T.title + 1.2),
  title: fadeOut(T.end - 0.6, T.end),
};

/** Stille-Fenster, in denen Effekte (sfx-track) und Bett schweigen: Luft holen. */
export const SILENCES = [
  { name: 'luft-holen-1', start: T.midMusicEnd - 0.05, end: T.boss - 0.0 },
  { name: 'luft-holen-2', start: T.bossEnd + 0.3, end: T.morning - 0.05 },
];

// --- Hilfen ----------------------------------------------------------------------------------------------------------

/** Ein gerechnetes Stück (oder Ausschnitt) mit Anfangszeit `at` s auf die volle Länge legen. */
function place(part, at = part.at ?? 0) {
  const b = stereo(N);
  const off = Math.round(at * SR);
  const n = Math.min(part.l.length, N - off);
  b.l.set(part.l.subarray(0, n), off);
  b.r.set(part.r.subarray(0, n), off);
  return b;
}

function rmsDb(buf, t0, t1) {
  const a = Math.round(t0 * SR);
  const b = Math.min(N, Math.round(t1 * SR));
  let s = 0;
  for (let i = a; i < b; i++) s += buf.l[i] * buf.l[i] + buf.r[i] * buf.r[i];
  return toDb(Math.sqrt(s / (2 * (b - a))));
}
function peakDb(buf, t0, t1) {
  const a = Math.round(t0 * SR);
  const b = Math.min(N, Math.round(t1 * SR));
  let m = 0;
  for (let i = a; i < b; i++) m = Math.max(m, Math.abs(buf.l[i]), Math.abs(buf.r[i]));
  return toDb(m);
}

/** Verstärkung (dB), mit der das Fenster den Zielwert trifft. */
function gainTo(buf, { kind = 'lufs', win, target, lufs }) {
  const goal = target ?? lufs;
  const now = kind === 'peak' ? peakDb(buf, ...win) : kind === 'rms' ? rmsDb(buf, ...win) : new Meter(buf).lufs(...win);
  return goal - now;
}

function scaled(buf, db, env = null) {
  const g = dbToLin(db);
  const out = clone(buf);
  for (let i = 0; i < N; i++) {
    out.l[i] *= g;
    out.r[i] *= g;
  }
  if (env) applyGain(out, env, 0, SR);
  return out;
}

const sum = (list) => {
  const out = stereo(N);
  for (const b of list) {
    for (let i = 0; i < N; i++) {
      out.l[i] += b.l[i];
      out.r[i] += b.r[i];
    }
  }
  return out;
};

// --- Mischung ----------------------------------------------------------------------------------------------------------

/**
 * @param {object} raw Ergebnisse von renderTask (Name → {l,r,at,…} oder {parts})
 * @param {object} opts { sfxDb }
 * @returns {{stems, pre, log}} stems: music, transitions, bed, sfx (Nach-Fader, Vor-Master)
 */
export function mixStems(raw, opts = {}) {
  const log = [];
  // Musik
  const musicParts = [];
  const musicGain = {};
  for (const [id, cfg] of Object.entries(LEVELS.music)) {
    const p = place(raw[id], id === 'jingle' ? T.jingle : id === 'titel-intro' ? T.titel : id === 'nacht' ? T.nacht : id === 'titel-mid' ? T.mid : id === 'boss' ? T.boss : id === 'morning' ? T.morning : T.title);
    const db = gainTo(p, cfg);
    musicGain[id] = db;
    musicParts.push(scaled(p, db, ENVELOPE[id]));
  }
  log.push(`Musik-Pegel (dB roh → Mix): ${Object.entries(musicGain).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ')}`);
  const music = sum(musicParts);

  // Übergänge und Einschläge
  const transParts = [];
  for (const [id, cfg] of Object.entries(LEVELS.trans)) {
    const parts = raw[id].parts ?? [raw[id]];
    const placed = parts.map((p) => place(p));
    const db = gainTo(placed[0], cfg);
    log.push(`${id}: ${db.toFixed(1)} dB`);
    placed.forEach((b) => transParts.push(scaled(b, db)));
  }
  raw.impacts.parts.forEach((p, k) => {
    const b = place(p);
    const db = gainTo(b, LEVELS.impacts[k]);
    log.push(`impact ${k}: ${db.toFixed(1)} dB`);
    transParts.push(scaled(b, db));
  });
  const transitions = sum(transParts);

  // Bett
  const bedParts = [];
  for (const [id, cfg] of Object.entries(LEVELS.bed)) {
    const b = place(raw[id]);
    const db = gainTo(b, cfg);
    log.push(`${id}: ${db.toFixed(1)} dB`);
    bedParts.push(scaled(b, db));
  }
  const bed = sum(bedParts);

  // Effekte (sfx-track.json)
  let sfx = stereo(N);
  if (raw.sfx) {
    const b = place(raw.sfx);
    const gate = (t) => {
      let g = 1;
      for (const s of SILENCES) {
        const a = s.start;
        const e = s.end;
        if (t > a - 0.05 && t < e + 0.02) g *= t < a ? 1 - (t - (a - 0.05)) / 0.05 : t > e ? 1 - (t - e) / 0.02 : 0;
      }
      return g;
    };
    sfx = scaled(b, opts.sfxDb ?? LEVELS.sfxDb, gate);
  }

  return { stems: { music, transitions, bed, sfx }, pre: sum([music, transitions, bed, sfx]), log, musicGain };
}

// --- Master ------------------------------------------------------------------------------------------------------------------

/** Weiche Begrenzung der Spitzen (linear bis `knee`, danach tanh in Richtung `asym`) – macht aus Kick-Spitzen Charakter statt Pumpen. */
export function softClip(buf, knee = 0.5, asym = 0.9) {
  const k = asym - knee;
  let clipped = 0;
  for (const x of [buf.l, buf.r]) {
    for (let i = 0; i < x.length; i++) {
      const a = Math.abs(x[i]);
      if (a > knee) {
        x[i] = Math.sign(x[i]) * (knee + k * Math.tanh((a - knee) / k));
        clipped++;
      }
    }
  }
  return clipped;
}

/**
 * Master: Verstärkung → Sättigung → Begrenzer → Ränder. Sucht die Verstärkung, bei der die integrierte Lautheit
 * (nach Begrenzer) den Zielwert trifft. Gibt die fertige Mischung und die Verstärkung zurück.
 */
export function master(pre, { targetLufs = -16, ceilingDb = -1.3, knee = 0.55, asym = 0.93, edge = 0.02, iterations = 5 } = {}) {
  const fi = fadeIn(0, edge);
  const fo = fadeOut(DURATION - edge, DURATION);
  const edgeFade = (t) => fi(t) * fo(t);
  let gDb = targetLufs - new Meter(pre).integrated();
  let out;
  let info;
  for (let it = 0; it < iterations; it++) {
    out = clone(pre);
    const g = dbToLin(gDb);
    for (let i = 0; i < N; i++) {
      out.l[i] *= g;
      out.r[i] *= g;
    }
    const clipped = softClip(out, knee, asym);
    const lim = limit(out, { ceilingDb, attack: 0.004, release: 0.1, sr: SR });
    applyGain(out, edgeFade, 0, SR);
    const lufs = new Meter(out).integrated();
    info = { gainDb: gDb, lufs, clipped, limiter: lim };
    if (Math.abs(lufs - targetLufs) < 0.05) break;
    gDb += targetLufs - lufs;
  }
  return { out, info };
}
