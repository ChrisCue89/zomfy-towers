// Playtest-Brücke: Testspieler-Agenten bedienen das Spiel wie ein Mensch –
// über Tastatur und Maus in einem echten (Headless-)Browser.
//
//   node tools/playtest.mjs snapshot <ordner>          Spielstand einfrieren (Kopie von index.html, style.css, lib, src)
//   node tools/playtest.mjs start <name> [--root <ordner>] [--params "a&b"]
//   node tools/playtest.mjs do <name> "<befehle>"      Befehle ausführen, Ergebnis als Text
//   node tools/playtest.mjs stop <name>
//
// Befehle (mit ; getrennt):
//   hold <Taste> <ms>       Taste gedrückt halten (z. B. hold KeyW 800)
//   press <Taste> [n]       Taste n-mal tippen (z. B. press KeyE, press Digit1)
//   down <Taste> / up <Taste>
//   move <x> <y>            Maus bewegen (Bildschirm 640×360 = Spielpixel)
//   click <x> <y> [right]   Klicken
//   wheel <dy>              Mausrad (positiv = nach unten)
//   wait <ms>               Spiel laufen lassen, ohne etwas zu drücken
//   shot <name>             Screenshot (Pfad steht im Ergebnis)
//   look                    Lesen, was auf dem Bildschirm steht (Uhr, Vorrat, Dialog, Hinweise …)
//   console                 Neue Konsolenmeldungen (Fehler/Warnungen) seit dem letzten Aufruf
//   reload                  Seite neu laden (wie F5)
//   resize <w> <h>          Fenstergröße ändern
//
// Zwischen den Befehlen ist das Spiel angehalten, damit Nachdenken nichts kostet.
// Tasten heißen wie KeyboardEvent.code: KeyW, KeyE, Space, ShiftLeft, Escape, Tab, Digit1 …

import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SESSIONS = join(ROOT, 'playtests', '.sessions');
const SHOT_ROOT = process.env.ZOMFY_SHOTS || '/tmp/zomfy-playtest';

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    return require(join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
}

function sessionFile(name) {
  return join(SESSIONS, `${name}.json`);
}

function parseArgs(list) {
  const out = { _: [] };
  for (let i = 0; i < list.length; i++) {
    if (list[i].startsWith('--')) out[list[i].slice(2)] = list[i + 1], i++;
    else out._.push(list[i]);
  }
  return out;
}

// --- Schnappschuss -------------------------------------------------------------

function snapshot(dir) {
  const target = resolve(dir);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const part of ['index.html', 'style.css', 'lib', 'src']) cpSync(join(ROOT, part), join(target, part), { recursive: true });
  console.log(`Schnappschuss in ${target}`);
}

// --- Sitzung (läuft im Hintergrund) -------------------------------------------------

async function runSession(name, root, params) {
  const { start } = await import(join(ROOT, 'tools', 'serve.mjs'));
  const { chromium } = loadPlaywright();
  const shotsDir = join(SHOT_ROOT, name);
  mkdirSync(shotsDir, { recursive: true });

  // Statischer Server für den (eingefrorenen) Spielstand
  process.env.ZOMFY_ROOT = root;
  const { server, url } = await start(0, root);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleLog = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') consoleLog.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (e) => consoleLog.push(`pageerror: ${e.message}`));
  const gameUrl = `${url}index.html?playtest${params ? `&${params}` : ''}`;
  await page.goto(gameUrl);
  await page.waitForFunction(() => typeof window.__zomfyStep === 'function' && window.zomfyView, null, { timeout: 120000 });
  await setHold(page, true);
  await page.evaluate(() => window.__zomfyStep(34)); // erstes Bild zeichnen (Shader übersetzen)

  let shotCount = 0;
  // Spielzeit exakt vorspulen (unabhängig davon, wie schnell der Software-Renderer ist).
  const step = (ms) => page.evaluate((m) => window.__zomfyStep(m), ms);

  async function run(commands) {
    const results = [];
    for (const raw of commands) {
      const [cmd, ...a] = raw.trim().split(/\s+/);
      if (!cmd) continue;
      try {
        switch (cmd) {
          case 'hold': {
            await page.keyboard.down(a[0]);
            await step(Number(a[1] || 300));
            await page.keyboard.up(a[0]);
            await step(34);
            results.push(`hold ${a[0]} ${a[1] || 300} ms`);
            break;
          }
          case 'press': {
            const n = Number(a[1] || 1);
            for (let i = 0; i < n; i++) {
              await page.keyboard.down(a[0]);
              await step(67);
              await page.keyboard.up(a[0]);
              await step(67);
            }
            results.push(`press ${a[0]}${n > 1 ? ` ×${n}` : ''}`);
            break;
          }
          case 'down':
            await page.keyboard.down(a[0]);
            results.push(`down ${a[0]}`);
            break;
          case 'up':
            await page.keyboard.up(a[0]);
            results.push(`up ${a[0]}`);
            break;
          case 'move':
            await page.mouse.move(Number(a[0]), Number(a[1]));
            await step(34);
            results.push(`move ${a[0]} ${a[1]}`);
            break;
          case 'click':
            await page.mouse.move(Number(a[0]), Number(a[1]));
            await step(34);
            await page.mouse.down({ button: a[2] === 'right' ? 'right' : 'left' });
            await step(67);
            await page.mouse.up({ button: a[2] === 'right' ? 'right' : 'left' });
            await step(67);
            results.push(`click ${a[0]} ${a[1]}${a[2] === 'right' ? ' rechts' : ''}`);
            break;
          case 'wheel':
            await page.mouse.wheel(0, Number(a[0]));
            await page.waitForTimeout(30);
            await step(67);
            results.push(`wheel ${a[0]}`);
            break;
          case 'wait':
            await step(Number(a[0] || 500));
            results.push(`wait ${a[0] || 500} ms`);
            break;
          case 'shot': {
            shotCount++;
            const file = join(shotsDir, `${String(shotCount).padStart(3, '0')}-${(a[0] || 'bild').replace(/[^\w-]/g, '_')}.png`);
            await page.screenshot({ path: file });
            results.push(`shot ${file}`);
            break;
          }
          case 'look': {
            const view = await page.evaluate(() => window.zomfyView());
            results.push(`look ${JSON.stringify(view)}`);
            break;
          }
          case 'console': {
            results.push(`console ${consoleLog.length ? consoleLog.splice(0).join(' | ') : '(leer)'}`);
            break;
          }
          case 'reload':
            await page.reload();
            await page.waitForFunction(() => typeof window.__zomfyStep === 'function', null, { timeout: 120000 });
            await setHold(page, true);
            await step(34);
            results.push('reload');
            break;
          case 'resize':
            await page.setViewportSize({ width: Number(a[0]), height: Number(a[1]) });
            await page.waitForTimeout(200);
            await step(100);
            results.push(`resize ${a[0]}×${a[1]}`);
            break;
          default:
            results.push(`?? unbekannter Befehl: ${cmd}`);
        }
      } catch (error) {
        results.push(`FEHLER bei ${raw.trim()}: ${error.message}`);
      }
    }
    return results;
  }

  const control = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      if (req.url === '/stop') {
        res.end('gestoppt');
        await browser.close();
        server.close();
        control.close();
        process.exit(0);
      }
      const commands = body.split(';');
      const results = await run(commands);
      res.end(results.join('\n'));
    });
  });
  control.listen(0, '127.0.0.1', () => {
    const port = control.address().port;
    writeFileSync(sessionFile(name), JSON.stringify({ port, pid: process.pid, root, url: gameUrl, shots: shotsDir }));
    console.log(`Sitzung ${name} bereit auf Port ${port}`);
  });
}

async function setHold(page, on) {
  await page.evaluate((v) => {
    window.__zomfyHold = v;
  }, on);
}

// --- Befehlszeile -------------------------------------------------------------------

function request(name, path, body = '') {
  const info = JSON.parse(readFileSync(sessionFile(name), 'utf8'));
  return new Promise((resolvePromise, reject) => {
    const req = http.request({ host: '127.0.0.1', port: info.port, path, method: 'POST' }, (res) => {
      let text = '';
      res.on('data', (c) => (text += c));
      res.on('end', () => resolvePromise(text));
    });
    req.on('error', reject);
    req.end(body);
  });
}

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

if (command === 'snapshot') {
  snapshot(args._[0]);
} else if (command === 'start') {
  const name = args._[0];
  mkdirSync(SESSIONS, { recursive: true });
  if (existsSync(sessionFile(name))) rmSync(sessionFile(name));
  const root = resolve(args.root || ROOT);
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '__session', name, root, args.params || ''], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  const started = Date.now();
  while (!existsSync(sessionFile(name))) {
    if (Date.now() - started > 180000) {
      console.error('Sitzung startet nicht.');
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  const info = JSON.parse(readFileSync(sessionFile(name), 'utf8'));
  console.log(`Sitzung „${name}“ läuft (Spiel: ${info.url}). Screenshots landen in ${info.shots}`);
} else if (command === '__session') {
  await runSession(args._[0], args._[1], args._[2]);
} else if (command === 'do') {
  const text = await request(args._[0], '/do', args._.slice(1).join(' '));
  console.log(text);
} else if (command === 'stop') {
  try {
    await request(args._[0], '/stop');
  } catch {
    /* schon beendet */
  }
  rmSync(sessionFile(args._[0]), { force: true });
  console.log(`Sitzung „${args._[0]}“ beendet.`);
} else {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 30).join('\n'));
}
