// Messung der fertigen Datei: Lautheit (ffmpeg ebur128, unabhängig von unserem Messer), Abschnitte, Einsätze.
import { spawnSync } from 'node:child_process';
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

export async function verify(path, buf, { say = console.log } = {}) {
  const meter = new Meter(buf);
  say(`Eigene Messung: integriert ${meter.integrated().toFixed(2)} LUFS, LRA ${meter.lra().toFixed(1)} LU, True Peak ${truePeakDb(buf).toFixed(2)} dBTP`);
  say('Abschnitt         von      bis    LUFS(Abschn.)   RMS dBFS   Spitze dBFS');
  for (const [name, a, b] of SECTIONS) {
    const r = rms(buf, a, b);
    say(`${name.padEnd(15)} ${a.toFixed(2).padStart(7)} ${b.toFixed(2).padStart(7)} ${meter.lufs(a, b).toFixed(1).padStart(10)} ${r.rms.toFixed(1).padStart(12)} ${r.peak.toFixed(1).padStart(12)}`);
  }
  say(`Einsätze (steilster Anstieg): Nacht ${onset(buf, T.nacht - 0.05, T.nacht + 0.05).toFixed(3)} s (soll ${T.nacht}), Boss ${onset(buf, T.boss - 0.05, T.boss + 0.05).toFixed(3)} s (soll ${T.boss})`);
  const f = spawnSyncFfmpeg(path);
  if (f) say(f);
  const w = readWav(path);
  say(`Datei: ${w.l.length} Abtastwerte (soll ${TOTAL_SAMPLES}), ${w.sr} Hz, ${w.ch} Kanäle`);
}

function spawnSyncFfmpeg(path) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  if (r.error) return `ffmpeg nicht verfügbar (${r.error.message})`;
  const txt = r.stderr;
  const at = txt.lastIndexOf('Summary:');
  return at < 0 ? 'ffmpeg: keine Zusammenfassung' : `ffmpeg ebur128:\n${txt.slice(at).replace(/\n\n/g, '\n').trim().split('\n').map((l) => '    ' + l.trim()).join('\n')}`;
}
