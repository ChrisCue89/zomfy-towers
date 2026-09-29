// hits.json: Taktschläge, Taktanfänge, Einschläge und Stille-Momente auf der Trailer-Zeitachse – für den Schnitt.
import { T, BAR, BPM, FPS, DURATION, grid, heartbeatsTransition, HEART_SILENCE, beatOf } from './score.mjs';
import { SILENCES } from './mix.mjs';

const r4 = (x) => Math.round(x * 10000) / 10000;
const R = (list) => list.map(r4);

export function buildHits({ masterInfo = null, sfxInfo = null } = {}) {
  const tb = beatOf(BPM.titel);
  const nb = beatOf(BPM.nacht);
  const bb = beatOf(BPM.boss);
  const beats = {
    'titel-vorspiel': R(grid(T.titel, tb, T.titelTheme)), // 8 Schläge, 2 Takte
    'titel-thema': R(grid(T.titelTheme, tb, T.titelCut)), // 4 Schläge, 1 Takt (dann Abbruch)
    nacht: R(grid(T.nacht, nb, T.nachtEnd + 1e-6, 32)), // 32 Schläge, 8 Takte
    'titel-mittelteil': R(grid(T.mid, tb, T.boss, 12)), // 12 Schläge, 3 Takte (Musik endet bei 40,6)
    boss: R(grid(T.boss, bb, T.bossEnd + 1e-6, 24)), // 24 Schläge, 6 Takte
  };
  const bars = {
    'titel-vorspiel': R(grid(T.titel, BAR.titel, T.titelTheme, 2)),
    'titel-thema': R([T.titelTheme]),
    nacht: R(grid(T.nacht, BAR.nacht, 0, 8)),
    'titel-mittelteil': R(grid(T.mid, BAR.titel, 0, 3)),
    boss: R(grid(T.boss, BAR.boss, 0, 6)),
  };
  const eighths = {
    nacht: R(grid(T.nacht, nb / 2, 0, 64)),
    boss: R(grid(T.boss, bb / 2, 0, 48)),
  };
  const hb = heartbeatsTransition();
  const sections = [
    { name: 'studio', start: 0, end: T.titel, music: 'jingle (Spieluhr von Tales of Cue)' },
    { name: 'titel-vorspiel', start: T.titel, end: T.titelTheme, music: 'titel, 72 BPM, Vorspiel (E-Piano, Gitarre)', bpm: BPM.titel },
    { name: 'titel-thema', start: T.titelTheme, end: T.titelCut, music: 'titel, Thema in der Spieluhr, bricht bei 12,5 ab', bpm: BPM.titel },
    { name: 'wende', start: T.trans, end: T.nacht, music: 'Grollen, Herzschlag, Riser, umgekehrtes Becken' },
    { name: 'nacht-stufe-0', start: T.nacht, end: T.nachtStage1, music: 'nacht, Takt 1–2: Bass, Kick, Hi-Hat', bpm: BPM.nacht },
    { name: 'nacht-stufe-1', start: T.nachtStage1, end: T.nachtStage2, music: 'nacht, Takt 3–5: + Snare, Streicher', bpm: BPM.nacht },
    { name: 'nacht-stufe-2', start: T.nachtStage2, end: T.nachtEnd, music: 'nacht, Takt 6–8: + Hörner, Becken, Toms', bpm: BPM.nacht },
    { name: 'zuflucht', start: T.mid, end: T.midMusicEnd, music: 'titel-Mittelteil mit Streichern, 72 BPM', bpm: BPM.titel },
    { name: 'luft-holen-1', start: T.midMusicEnd, end: T.boss, music: 'Stille, zwei Herzschläge' },
    { name: 'boss', start: T.boss, end: T.bossEnd, music: 'boss, 138 BPM, Pauke + Hörner', bpm: BPM.boss },
    { name: 'luft-holen-2', start: T.bossEnd, end: T.morning, music: 'Schlussschlag, dann Stille (Wind, Vogel)' },
    { name: 'morgen', start: T.morning, end: T.title, music: 'leise Spieluhr/E-Piano (Thema, erster Takt)' },
    { name: 'titel', start: T.title, end: DURATION, music: 'Spieluhr-Figur, Gadd9-Schlussakkord, klingt aus' },
  ].map((s) => ({ ...s, start: r4(s.start), end: r4(s.end), frames: [Math.round(s.start * FPS), Math.round(s.end * FPS)] }));
  const impacts = [
    { t: T.nacht, name: 'einschlag-nacht', strength: 'gross', note: 'harter Einsatz: Trommel + Rauschstoß + Sub-Boom, nacht Takt 1' },
    { t: T.nachtStage1, name: 'stufe-1', strength: 'leicht', note: 'Snare + Streicher setzen ein (Takt 3)' },
    { t: T.nachtStage2, name: 'stufe-2', strength: 'mittel', note: 'Hörner + Becken (Takt 6)' },
    { t: T.mid, name: 'wende-zuflucht', strength: 'weich', note: 'Streicher schwellen an, Nacht klingt aus' },
    { t: T.boss, name: 'einschlag-boss', strength: 'sehr gross', note: 'harter Einsatz: großer Einschlag + boss Takt 1' },
    { t: T.bossEnd, name: 'boss-schluss', strength: 'mittel', note: 'Schlussschlag (Kick, Pauke, Becken, Hörner), dann Stille' },
    { t: T.title, name: 'titel-figur', strength: 'weich', note: 'Spieluhr G–H–D–G; Akkord Gadd9 bei +0,6 s' },
  ].map((x) => ({ ...x, t: r4(x.t), frame: Math.round(x.t * FPS) }));
  const silences = SILENCES.map((s) => ({ ...s, start: r4(s.start), end: r4(s.end) }));
  return {
    version: 1,
    generator: 'trailer/audio/build.mjs',
    duration: DURATION,
    sampleRate: 44100,
    fps: FPS,
    beats,
    bars,
    eighths,
    sections,
    impacts,
    silences,
    heartbeats: {
      wende: R(hb.times), // Abstände 0,9 → 0,45 s; der nächste »Schlag« ist der Einschlag bei 16,0 (jeweils + 0,2 s zweiter Schlag)
      stille: R(HEART_SILENCE), // 40,7 (mit zweitem Schlag bei 40,9) und 41,0
    },
    cues: {
      jingle: R([0, 0.15, 0.3, 0.45]), // Glocken G–H–D–G; Akkord bei 0,6; Glitzern ab 1,15
      morgen: R([T.morning, T.morning + 6 * (BAR.titel / 16), T.morning + 8 * (BAR.titel / 16), T.morning + 12 * (BAR.titel / 16)]), // Themennoten B–A–G–D
      titelakkord: R([T.title, T.title + 0.15, T.title + 0.3, T.title + 0.45, T.title + 0.6]), // Figur G–H–D–G, dann Gadd9
      'reverse-becken-ende': r4(T.nacht),
    },
    snap: snapList(beats, bars, impacts),
    master: masterInfo && { lufs: r4(masterInfo.lufs), gainDb: r4(masterInfo.gainDb) },
    sfx: sfxInfo,
  };
}

/** Alle Taktschläge (kind: bar | beat) und Einschläge (impact) sortiert, zum Einrasten des Schnitts. */
function snapList(beats, bars, impacts) {
  const barSet = new Set(Object.values(bars).flat());
  const out = [];
  for (const [piece, list] of Object.entries(beats)) for (const t of list) out.push({ t, kind: barSet.has(t) ? 'bar' : 'beat', piece });
  for (const im of impacts) out.push({ t: im.t, kind: 'impact', piece: im.name });
  return out.sort((a, b) => a.t - b.t || (a.kind === 'impact' ? -1 : 1));
}
