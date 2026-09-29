#!/usr/bin/env node
// Klangpipeline des Trailers: rechnet Musik, Übergänge, Bett und Effekte mit dem Klang-Baukasten des Spiels
// (Chromium, OfflineAudioContext), mischt taktgenau auf 60,000 s und schreibt trailer.wav (+ Stems, hits.json).
//
//   node trailer/audio/build.mjs [--out DIR] [--sfx DATEI] [--sfx-db N] [--no-verify]
//
// Umgebung: ZT_GAME (Spielcode, nur lesen), ZT_WORK (Ausgabe nach $ZT_WORK/audio/), ZT_FFMPEG (Prüfung).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { GAME_DIR, AUDIO } from '../config.mjs';
import { openBrowser } from './browser.mjs';
import { SR, TOTAL_SAMPLES } from './score.mjs';
import { mixStems, master } from './mix.mjs';
import { writeWav16, writeWavFloat, Meter, truePeakDb } from './dsp.mjs';
import { buildHits } from './hits.mjs';
import { verify } from './verify.mjs';

const args = process.argv.slice(2);
const opt = (name, def = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);

const outDir = resolve(opt('out', AUDIO));
const stemDir = join(outDir, 'stems');
const sfxPath = resolve(opt('sfx', join(AUDIO, 'sfx-track.json')));
mkdirSync(stemDir, { recursive: true });

const t0 = Date.now();
const say = (s) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(5)} s] ${s}`);

// --- sfx-track.json (optional) -----------------------------------------------------------------------------------
let events = null;
if (existsSync(sfxPath)) {
  events = JSON.parse(readFileSync(sfxPath, 'utf8'));
  if (!Array.isArray(events)) events = events.events ?? events.sfx;
  say(`Effekte: ${events.length} Einträge aus ${sfxPath}`);
} else say(`keine Effektdatei (${sfxPath}) – Ebene sfx bleibt leer`);

// --- Rechnen im Browser ----------------------------------------------------------------------------------------------
const browser = await openBrowser(GAME_DIR);
const TASKS = ['jingle', 'titel-intro', 'nacht', 'titel-mid', 'boss', 'morning', 'title', 'trans-drone', 'trans-riser', 'trans-cymbal', 'trans-heart', 'impacts', 'bed-wind', 'bed-fire', 'bed-waves', 'bed-animals'];
const raw = {};
for (const name of TASKS) {
  raw[name] = await browser.render(name);
  say(`${name.padEnd(13)} gerechnet (${raw[name].ms} ms)`);
}
const check = await browser.render('check');
const bad = check.filter((c) => c.bad || !(c.rms > 0));
if (bad.length) throw new Error(`Stück stumm oder ungültig: ${JSON.stringify(bad)}`);
say(`Stücke lauffähig: ${check.map((c) => `${c.id} rms ${c.rms.toFixed(3)} bad ${c.bad}`).join(', ')}`);
let sfxInfo = null;
if (events) {
  raw.sfx = await browser.render('sfx', { events });
  sfxInfo = { played: raw.sfx.played, skipped: raw.sfx.skipped };
  say(`sfx gerechnet: ${raw.sfx.played} gespielt, ${raw.sfx.skipped.length} übersprungen (Entfernung/Mindestabstand)`);
}
if (browser.problems.length) console.warn('Browser-Meldungen:', browser.problems);
await browser.close();

// --- Mischen und Mastern ------------------------------------------------------------------------------------------------------
const sfxDb = opt('sfx-db') !== null ? Number(opt('sfx-db')) : undefined;
const mixed = mixStems(raw, { sfxDb });
mixed.log.forEach(say);
const { out, info } = master(mixed.pre);
say(`Master: Verstärkung ${info.gainDb.toFixed(2)} dB, ${info.clipped} Abtastwerte gesättigt, Begrenzer max ${info.limiter.maxReductionDb.toFixed(2)} dB`);

// Stems: Nach-Fader mit derselben Master-Verstärkung (Summe ≈ Mix vor Sättigung/Begrenzer), 32 Bit Gleitkomma
const g = 10 ** (info.gainDb / 20);
for (const [name, b] of Object.entries(mixed.stems)) {
  const s = { l: Float32Array.from(b.l, (v) => v * g), r: Float32Array.from(b.r, (v) => v * g) };
  writeWavFloat(join(stemDir, `${name}.wav`), s);
}
writeWav16(join(outDir, 'trailer.wav'), out);
say(`geschrieben: ${join(outDir, 'trailer.wav')} (${TOTAL_SAMPLES} Abtastwerte)`);

// hits.json
const hits = buildHits({ masterInfo: info, sfxInfo });
writeFileSync(join(outDir, 'hits.json'), JSON.stringify(hits, null, 1));
say('hits.json geschrieben');

if (!flag('no-verify')) await verify(join(outDir, 'trailer.wav'), out, { say });
