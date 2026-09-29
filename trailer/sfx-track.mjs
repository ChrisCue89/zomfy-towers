// Effektspur für den Ton: Klangereignisse der aufgenommenen Clips (events.json) werden mit dem
// Schnitt (welche Bilder eines Clips wann laufen) auf die Zeitachse des Trailers gelegt.
//   node sfx-track.mjs          schreibt $ZT_WORK/audio/sfx-track.json
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { start } from './serve.mjs';
import { FRAMES, GAME_DIR, AUDIO, FPS } from './config.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'));
const srv = await start({ '/frames': FRAMES, '/game': GAME_DIR, '/': join(new URL('.', import.meta.url).pathname, 'engine') });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-gpu'] });
const page = await (await browser.newPage());
await page.goto(`${srv.url}index.html`);
await page.waitForFunction(() => window.__ready === true);
const shots = await page.evaluate(() => window.__shots());
await browser.close();
srv.server.close();

// Effekte, die in einem Trailer keinen Sinn haben (Oberfläche, Schritte, Stille)
const SKIP = new Set(['klick', 'tipp', 'schritt', 'schrittHolz', 'aufheben', 'zuhause']);
const MIN_VOLUME = 0.06;
// Zeitfenster, in denen keine Spiel-Effekte einsetzen (Stille vor dem Boss, Stille und Spieluhr-Einsatz nach dem Schlussschlag);
// Effekte, die davor beginnen, klingen sonst in die Stille hinein.
const HUSH = [[40.3, 41.23], [51.75, 52.6]];
const out = [];
for (const s of shots) {
  const dir = join(FRAMES, s.clip);
  const file = join(dir, 'events.json');
  if (!existsSync(file)) continue;
  const events = JSON.parse(readFileSync(file, 'utf8'));
  const f0 = s.from;
  const f1 = s.from + Math.ceil(s.dur * FPS * s.speed);
  for (const e of events) {
    if (e.f < f0 || e.f >= f1 || SKIP.has(e.name)) continue;
    const t = s.at + (e.f - f0) / (FPS * s.speed);
    if (HUSH.some(([a, b]) => t >= a && t < b)) continue;
    const item = { t: +t.toFixed(3), name: e.name };
    for (const k of ['x', 'z', 'lx', 'lz', 'volume', 'rate', 'pitch']) if (e[k] !== undefined && e[k] !== null) item[k] = e[k];
    out.push(item);
  }
}
out.sort((a, b) => a.t - b.t);
mkdirSync(AUDIO, { recursive: true });
writeFileSync(join(AUDIO, 'sfx-track.json'), JSON.stringify(out, null, 1));
const byName = {};
for (const o of out) byName[o.name] = (byName[o.name] || 0) + 1;
console.log(`${out.length} Effekte aus ${shots.length} Einstellungen`, byName);
