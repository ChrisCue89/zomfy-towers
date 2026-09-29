// Messung der fertigen Datei: Lautheit (ffmpeg ebur128, unabhängig von unserem Messer), Abschnitte, Einsätze.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { FFMPEG } from '../config.mjs';
import { SR, T, TOTAL_SAMPLES } from './score.mjs';
import { Meter, truePeakDb, toDb, readWav } from './dsp.mjs';

export const SECTIONS = [
  ['studio', 0, T.titel],
  ['titel-vorspiel', T.titel, T.titelTheme],
  ['titel-thema', T.titelTheme, T.titelCut],
  ['wende', T.trans, T.nacht],
  ['nacht-0', T.nacht, T.nachtStage1],
  ['nacht-1', T.nachtStage1, T.nachtStage2],
  ['nacht-2', T.nachtStage2, T.nachtEnd],
  ['zuflucht', T.mid, T.midMusicEnd],
  ['luft-holen-1', T.midMusicEnd + 0.1, T.boss],
  ['boss', T.boss, T.bossEnd],
  ['luft-holen-2', T.bossEnd + 0.35, T.morning],
  ['morgen', T.morning, T.title],
  ['titel', T.title, T.end],
];

function rms(buf, t0, t1) {
  const a = Math.round(t0 * SR);
  const b = Math.min(buf.l.length, Math.round(t1 * SR));
  let s = 0;
  let pk = 0;
  for (let i = a; i < b; i++) {
    s += buf.l[i] * buf.l[i] + buf.r[i] * buf.r[i];
    pk = Math.max(pk, Math.abs(buf.l[i]), Math.abs(buf.r[i]));
  }
  return { rms: toDb(Math.sqrt(s / (2 * (b - a)))), peak: toDb(pk) };
}

/** Zeit des steilsten Anstiegs der 5-ms-RMS-Hüllkurve im Fenster [t0, t1]. */
export function onset(buf, t0, t1) {
  const win = Math.round(0.005 * SR);
  let best = -1;
  let at = t0;
  for (let i = Math.round(t0 * SR); i < Math.round(t1 * SR); i += Math.round(0.001 * SR)) {
    let a = 0;
    let b = 0;
    for (let k = 0; k < win; k++) {
      a += buf.l[i - win + k] ** 2 + buf.r[i - win + k] ** 2;
      b += buf.l[i + k] ** 2 + buf.r[i + k] ** 2;
    }
    const rise = Math.sqrt(b / win) - Math.sqrt(a / win);
    if (rise > best) {
      best = rise;
      at = i / SR;
    }
  }
  return at;
}

export async function verify(path, buf, { say = console.log, stems = null } = {}) {
  const meter = new Meter(buf);
  const checks = [];
  const check = (name, ok, value) => checks.push({ name, ok, value });
  const own = { i: meter.integrated(), lra: meter.lra(), tp: truePeakDb(buf) };
  say(`Eigene Messung: integriert ${own.i.toFixed(2)} LUFS, LRA ${own.lra.toFixed(1)} LU, True Peak ${own.tp.toFixed(2)} dBTP`);
  say('Abschnitt          von      bis   LUFS(Abschn.)   RMS dBFS   Spitze dBFS');
  for (const [name, a, b] of SECTIONS) {
    const r = rms(buf, a, b);
    say(`${name.padEnd(15)} ${a.toFixed(2).padStart(7)} ${b.toFixed(2).padStart(7)} ${meter.lufs(a, b).toFixed(1).padStart(10)} ${r.rms.toFixed(1).padStart(12)} ${r.peak.toFixed(1).padStart(12)}`);
  }
  // Einsätze: steilster Anstieg der 5-ms-Hüllkurve nahe der vereinbarten Zeit
  const marks = [['Einschlag Nacht', T.nacht], ['Einschlag Boss', T.boss], ['Spieluhr Morgen', T.morning], ['Titelfigur', T.title]];
  for (const [name, t] of marks) {
    const at = onset(buf, t - 0.06, t + 0.06);
    say(`Einsatz ${name.padEnd(16)} gemessen ${at.toFixed(3)} s, soll ${t.toFixed(3)} s`);
    check(`Einsatz ${name} ±10 ms`, Math.abs(at - t) <= 0.01, at);
  }
  // Stille-Momente
  const q1 = rms(buf, T.boss - 0.13, T.boss - 0.01).rms;
  const q2 = rms(buf, T.bossEnd + 0.4, T.morning - 0.05).rms;
  say(`Stille: vor Boss (41,10–41,22) ${q1.toFixed(1)} dBFS RMS; nach Boss (${(T.bossEnd + 0.4).toFixed(2)}–52,15) ${q2.toFixed(1)} dBFS RMS`);
  check('Stille vor dem Boss < −40 dBFS', q1 < -40, q1);
  check('Stille nach dem Boss < −40 dBFS', q2 < -40, q2);
  // ffmpeg (unabhängiger Messer)
  const ff = ffmpegMeasure(path);
  if (ff) {
    say(ff.text);
    check('Lautheit (ffmpeg ebur128) −16 ± 0,3 LUFS', Math.abs(ff.i + 16) <= 0.3, ff.i);
    check('LRA (ffmpeg) 5–12 LU', ff.lra >= 5 && ff.lra <= 12, ff.lra);
    check('True Peak (ffmpeg) ≤ −1,0 dBTP', ff.tp <= -1.0, ff.tp);
  }
  const lp = loudnormTruePeak(path);
  if (lp) {
    say(lp.text);
    check('True Peak (ffmpeg loudnorm) ≤ −1,0 dBTP', lp.tp <= -1.0, lp.tp);
  }
  const w = readWav(path);
  say(`Datei: ${w.l.length} Abtastwerte (soll ${TOTAL_SAMPLES}), ${w.sr} Hz, ${w.ch} Kanäle`);
  check('2 646 000 Abtastwerte, 44,1 kHz, stereo', w.l.length === TOTAL_SAMPLES && w.sr === SR && w.ch === 2, w.l.length);
  let pk = 0;
  for (let i = 0; i < w.l.length; i++) pk = Math.max(pk, Math.abs(w.l[i]), Math.abs(w.r[i]));
  check('kein Clipping (Spitze < 0,99)', pk < 0.99, pk);
  check('Ränder: erster/letzter Abtastwert ≈ 0', Math.abs(w.l[0]) < 1e-3 && Math.abs(w.l[w.l.length - 1]) < 1e-3, w.l[0]);
  say('Prüfungen:');
  for (const c of checks) say(`  ${c.ok ? 'ok    ' : 'FEHLER'} ${c.name} (${typeof c.value === 'number' ? c.value.toFixed(3) : c.value})`);
  return checks;
}

function ffmpegMeasure(path) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  if (r.error) return null;
  const txt = r.stderr;
  const at = txt.lastIndexOf('Summary:');
  if (at < 0) return null;
  const sum = txt.slice(at);
  const num = (re) => Number(re.exec(sum)?.[1]);
  return {
    i: num(/I:\s+(-?[\d.]+) LUFS/),
    lra: num(/LRA:\s+(-?[\d.]+) LU/),
    tp: num(/Peak:\s+(-?[\d.]+) dBFS/),
    text: `ffmpeg ebur128: I ${num(/I:\s+(-?[\d.]+) LUFS/)} LUFS, LRA ${num(/LRA:\s+(-?[\d.]+) LU/)} LU, True Peak ${num(/Peak:\s+(-?[\d.]+) dBFS/)} dBFS`,
  };
}

/** True Peak mit zwei Nachkommastellen (loudnorm gibt sie als JSON aus). */
function loudnormTruePeak(path) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', path, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /"input_tp"\s*:\s*"([-\d.]+)"/.exec(r.stderr || '');
  return m ? { tp: Number(m[1]), text: `ffmpeg loudnorm: input_tp ${m[1]} dBTP` } : null;
}

/** Spektrogramme (ffmpeg showspectrumpic) als PNG: ganz, Wende, Einschläge, Ausklang. */
export async function spectrograms(path, dir, { say = console.log } = {}) {
  mkdirSync(dir, { recursive: true });
  const jobs = [['gesamt', 0, 60], ['wende-12-17', 11.5, 6.5], ['boss-40-43', 40, 3.5], ['ausklang-50-60', 50, 10]];
  for (const [name, ss, t] of jobs) {
    const r = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(ss), '-t', String(t), '-i', path, '-lavfi', 'showspectrumpic=s=1400x480:legend=1:scale=log:fscale=log:drange=90:limit=0:color=intensity', join(dir, `${name}.png`)], { encoding: 'utf8' });
    say(r.status === 0 ? `Spektrogramm ${join(dir, name + '.png')}` : `Spektrogramm ${name} fehlgeschlagen: ${r.stderr}`);
  }
}
