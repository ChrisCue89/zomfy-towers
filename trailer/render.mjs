// Bilder des Trailers berechnen.
//   node render.mjs --frames 0-1799 --out dir       Einzelbilder als PNG
//   node render.mjs --at 5,9.5,20 --out dir         einzelne Zeitpunkte (Sekunden)
//   node render.mjs --every 15 --out dir            jedes n-te Bild
//   node render.mjs --video out.mp4 --audio a.wav   ganzer Trailer (H.264 + AAC)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { start } from './serve.mjs';
import { FRAMES, GAME_DIR, WORK, AUDIO, FFMPEG, FPS, DURATION } from './config.mjs';

const args = process.argv.slice(2);
const arg = (k, d = null) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const require = createRequire(import.meta.url);
const { chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'));

let list = [];
if (arg('at')) list = arg('at').split(',').map((s) => Math.round(Number(s) * FPS));
else {
  const [a, b] = (arg('frames', `0-${DURATION * FPS - 1}`)).split('-').map(Number);
  const step = Number(arg('every', 1));
  for (let f = a; f <= b; f += step) list.push(f);
}
const out = arg('out');
const video = arg('video');
if (out) mkdirSync(out, { recursive: true });

const srv = await start({ '/frames': FRAMES, '/game': GAME_DIR, '/audio': AUDIO, '/': join(new URL('.', import.meta.url).pathname, 'engine') });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-gpu', '--force-color-profile=srgb'] });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/Failed to load resource/.test(m.text())) console.log('  [seite]', m.type(), m.text()); });
page.on('pageerror', (e) => console.log('  [seite] Fehler:', e.message));
await page.goto(`${srv.url}index.html`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

let ff = null;
if (video) {
  const a = arg('audio');
  const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-'];
  if (a) ffArgs.push('-i', a);
  ffArgs.push('-c:v', 'libx264', '-preset', arg('preset', 'slow'), '-crf', arg('crf', '17'), '-pix_fmt', 'yuv420p', '-tune', 'animation', '-movflags', '+faststart');
  if (a) ffArgs.push('-c:a', 'aac', '-b:a', '256k', '-shortest');
  ffArgs.push(video);
  ff = spawn(FFMPEG, ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
}
const t0 = Date.now();
for (let n = 0; n < list.length; n++) {
  const f = list[n];
  const b64 = await page.evaluate(async (f) => { await window.renderFrame(f); return window.__png(); }, f);
  const buf = Buffer.from(b64, 'base64');
  if (out) writeFileSync(join(out, `f${String(f).padStart(4, '0')}.png`), buf);
  if (ff) await new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));
  if (n % 30 === 29) console.log(`  ${n + 1}/${list.length} (${((Date.now() - t0) / (n + 1)).toFixed(0)} ms/Bild)`);
}
if (ff) { ff.stdin.end(); await new Promise((r) => ff.on('close', r)); }
await browser.close();
srv.server.close();
process.exit(0);
