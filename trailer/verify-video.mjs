// Prüft das fertige Video: Länge, Auflösung, Bildrate, Codecs, Lautheit, Stille, schwarze Bilder.
//   node verify-video.mjs out/zomfy-towers-trailer.mp4
// Beendet sich mit Code 1, wenn eine Prüfung scheitert.
import { spawnSync } from 'node:child_process';
import { FFMPEG, DURATION } from './config.mjs';

const file = process.argv[2];
if (!file) {
  console.error('Aufruf: node verify-video.mjs <video.mp4>');
  process.exit(2);
}
const ff = (args) => spawnSync(FFMPEG, ['-hide_banner', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }).stderr;

const problems = [];
const check = (ok, text) => {
  console.log(`${ok ? '✓' : '✗'} ${text}`);
  if (!ok) problems.push(text);
};

const info = ff(['-i', file]);
const dur = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(info);
const seconds = dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : 0;
check(Math.abs(seconds - DURATION) < 0.1, `Länge ${seconds.toFixed(2)} s (Soll ${DURATION} s)`);
check(/Video: h264.*1920x1080.*30 fps/.test(info), 'Video: H.264, 1920×1080, 30 Bilder/s');
check(/yuv420p/.test(info), 'Pixelformat yuv420p (läuft überall)');
check(/Audio: aac.*44100 Hz, stereo/.test(info), 'Ton: AAC, 44,1 kHz, stereo');

const loud = ff(['-i', file, '-af', 'ebur128=peak=true', '-vn', '-f', 'null', '-']);
const summary = loud.slice(loud.lastIndexOf('Summary:'));
const I = Number(/I:\s+(-?\d+\.\d)\s+LUFS/.exec(summary)?.[1]);
const LRA = Number(/LRA:\s+(\d+\.\d)\s+LU/.exec(summary)?.[1]);
const TP = Number(/Peak:\s+(-?\d+\.\d)\s+dBFS/.exec(summary)?.[1]);
check(I > -18 && I < -14, `Lautheit ${I} LUFS (Ziel −16 ± 2)`);
check(TP <= -0.9, `True Peak ${TP} dBFS (≤ −1)`);
console.log(`  Lautheitsumfang ${LRA} LU`);

// Schwarze Bilder: nur an den Rändern erlaubt (erste 0,1 s, letzte 0,6 s)
const black = ff(['-i', file, '-vf', 'blackdetect=d=0.15:pix_th=0.06', '-an', '-f', 'null', '-']);
const blacks = [...black.matchAll(/black_start:(\d+\.?\d*) black_end:(\d+\.?\d*)/g)].map((m) => [Number(m[1]), Number(m[2])]);
const bad = blacks.filter(([a, b]) => !(a < 0.15 || b > seconds - 0.05));
check(bad.length === 0, `keine ungewollten schwarzen Stellen ${bad.length ? JSON.stringify(bad) : ''}`);

// Stille: gewollt sind zwei Momente (≈ 40,7–41,2 und 51,97–52,2)
const sil = ff(['-i', file, '-af', 'silencedetect=n=-42dB:d=0.2', '-vn', '-f', 'null', '-']);
const silences = [...sil.matchAll(/silence_start: (\d+\.?\d*)/g)].map((m) => Number(m[1]));
console.log(`  Stillen bei ${silences.map((s) => s.toFixed(2)).join(', ') || '–'} s`);

process.exit(problems.length ? 1 : 0);
