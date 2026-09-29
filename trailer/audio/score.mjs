// Zeitplan des Trailers – EINE Quelle für Browser (page.js) und Node (build.mjs, mix.mjs).
// Alle Zeiten in Sekunden auf der Trailer-Zeitachse (0 … 60), sofern nicht anders gesagt.

export const SR = 44100;
export const DURATION = 60;
export const TOTAL_SAMPLES = Math.round(DURATION * SR); // 2 646 000
export const FPS = 30;

/** Stücke des Spiels: Tempo → Schlag und Takt (4/4). */
export const BPM = { titel: 72, nacht: 126, boss: 138 };
export const beatOf = (bpm) => 60 / bpm;
export const barOf = (bpm) => 240 / bpm;

const TB = barOf(BPM.titel); // 3,3333 s
const NB = barOf(BPM.nacht); // 1,9048 s
const BB = barOf(BPM.boss); // 1,7391 s

export const T = {
  // 0 – Studio
  jingle: 0.0, // Spieluhr von Tales of Cue
  // 2,5 – Akt I: titel, Vorspiel 2 Takte, ab 9,17 das Thema, Abbruch bei 12,5
  titel: 2.5,
  titelTheme: 2.5 + 2 * TB, // 9,1667
  titelCut: 12.5,
  // 12,5 – Wende
  trans: 12.5,
  // 16,0 – Akt II: harter Einsatz, nacht in 8 Takten (Stufe 0 → 1 ab Takt 3 → 2 ab Takt 6)
  nacht: 16.0,
  nachtStage1: 16.0 + 2 * NB,
  nachtStage2: 16.0 + 5 * NB,
  nachtEnd: 16.0 + 8 * NB, // 31,2381
  // 31,233 – Akt III: titel-Mittelteil (Streicher), Musik fällt bei 40,6 weg
  mid: 31.2333,
  midMusicEnd: 40.6,
  // 41,233 – Akt IV: harter Einsatz, boss in 6 Takten
  boss: 41.2333,
  bossEnd: 41.2333 + 6 * BB, // 51,668
  // Ausklang
  morning: 52.2, // leise Spieluhr/Piano
  title: 56.0, // Titelakkord
  end: DURATION,
};

/** Wo im Stück (in Sekunden ab Stückbeginn) der Mittelteil des titel liegt: Vorspiel 2 + Thema 4 + 4 = 10 Takte. */
export const TITEL_MID_OFFSET = 10 * TB; // 33,333 s

/** Herzschlag der Wende: Abstand 0,9 s → 0,45 s (geometrisch), der letzte »Schlag« ist der Einschlag bei 16,0. */
export function heartbeatsTransition() {
  const n = 5; // Schläge vor dem Einschlag
  const r = Math.pow(0.5, 1 / (n - 1));
  const gaps = [];
  for (let k = 0; k < n; k++) gaps.push(0.9 * Math.pow(r, k)); // 0,9 … 0,45 (n Abstände, der letzte führt zum Einschlag)
  const total = gaps.reduce((a, b) => a + b, 0);
  const times = [];
  let t = T.nacht - total;
  for (let k = 0; k < n; k++) {
    times.push(t);
    t += gaps[k];
  }
  return { times, gaps };
}

/** Herzschlag in der Stille vor dem Boss: ein Schlag bei ≈ 40,7 und 41,0. */
export const HEART_SILENCE = [40.7, 41.0];

/** Gleichmäßige Zeiten a, a+step, … < b. */
export function grid(a, step, b, count = null) {
  const out = [];
  const n = count ?? Math.ceil((b - a) / step - 1e-9);
  for (let k = 0; k < n; k++) out.push(a + k * step);
  return out;
}

export const BAR = { titel: TB, nacht: NB, boss: BB };
