// Prüfablauf für Zomfy Towers (siehe CLAUDE.md).
//
//   node tools/check.mjs            volle Prüfung im Headless-Browser
//   node tools/check.mjs --syntax   nur Syntax aller Module
//
// Die volle Prüfung startet einen lokalen Server, öffnet das Spiel in
// Headless-Chromium, sammelt alle Konsolenmeldungen, macht Screenshots nach
// screenshots/, prüft Speichern/Laden und misst Bildzeiten.

import { execFileSync, execSync } from 'node:child_process';
import { readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { start } from './serve.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS = join(ROOT, 'screenshots');
const args = new Set(process.argv.slice(2));

function listSources(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...listSources(path));
    else if (/\.(m?js)$/.test(name)) out.push(path);
  }
  return out;
}

function checkSyntax() {
  const files = [...listSources(join(ROOT, 'src')), ...listSources(join(ROOT, 'tools'))];
  let failed = 0;
  for (const file of files) {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } catch (error) {
      failed++;
      console.error(`✗ ${relative(ROOT, file)}\n${error.stderr?.toString() || error.message}`);
    }
  }
  console.log(failed ? `Syntax: ${failed} Datei(en) fehlerhaft` : `Syntax: ${files.length} Dateien in Ordnung`);
  return failed === 0;
}

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    const globalRoot = execSync('npm root -g').toString().trim();
    return require(join(globalRoot, 'playwright'));
  }
}

async function launchBrowser(chromium) {
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  try {
    return await chromium.launch({ args });
  } catch (error) {
    const fallback = '/opt/pw-browsers/chromium';
    if (existsSync(fallback)) return chromium.launch({ args, executablePath: fallback });
    throw error;
  }
}

const problems = [];
const report = [];

function note(line) {
  report.push(line);
  console.log(line);
}

function fail(line) {
  problems.push(line);
  console.log(`✗ ${line}`);
}

/** Seite öffnen und Konsole mitschneiden. */
async function openGame(browser, url, label, { viewport = { width: 1280, height: 720 }, init = null } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const messages = [];
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') messages.push(`${type}: ${msg.text()}`);
  });
  page.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => messages.push(`requestfailed: ${request.url()}`));
  page.on('response', (response) => {
    if (response.status() >= 400) messages.push(`http ${response.status()}: ${response.url()}`);
  });
  if (init) await page.addInitScript(init);
  await page.goto(url);
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  return { context, page, messages, label };
}

function checkMessages(session) {
  if (session.messages.length) fail(`${session.label}: ${session.messages.length} Konsolenmeldung(en):\n  ${session.messages.join('\n  ')}`);
  else note(`✓ ${session.label}: Konsole sauber`);
}

async function settle(page, frames = 40) {
  await page.evaluate((n) => window.zomfy.waitFrames(n), frames);
}

async function shot(page, name, setup) {
  await page.evaluate(setup);
  await settle(page, 45);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
  note(`  Screenshot: screenshots/${name}.png`);
}

async function runBrowserChecks() {
  const { chromium } = loadPlaywright();
  mkdirSync(SHOTS, { recursive: true });
  const { server, url } = await start(0);
  const browser = await launchBrowser(chromium);
  try {
    // --- 0. Erster Eindruck: neues Spiel mit Einblenden und Intro -----------------
    const intro = await openGame(browser, `${url}index.html?debug&nosave`, 'Spielstart');
    await intro.page.evaluate(() => window.zomfy.setDebug(false));
    await intro.page.waitForFunction(() => window.zomfy.mode === 'dialog', null, { timeout: 60000 });
    await settle(intro.page, 70);
    await intro.page.screenshot({ path: join(SHOTS, 'start.png') });
    note('  Screenshot: screenshots/start.png');
    checkMessages(intro);
    await intro.context.close();

    // --- 1. Rundgang mit Screenshots (ohne Speichern) ---------------------------
    const tour = await openGame(browser, `${url}index.html?test&nosave`, 'Rundgang');
    const { page } = tour;
    // Einmalige Hinweis-Dialoge würden die Bilder verdecken.
    await page.evaluate(() => {
      window.zomfy.setFlag('abendHinweis');
      window.zomfy.setFlag('spaetHinweis');
    });

    await shot(page, 'morgen', () => {
      window.zomfy.setTime(6, 40);
      window.zomfy.teleport(1.5, 1.0, 0.4);
    });
    await shot(page, 'tag', () => {
      window.zomfy.setTime(12, 0);
      window.zomfy.teleport(-4.75, -4.0, 1.4);
    });
    // Bildzeit bei Tag messen
    await settle(page, 120);
    const dayStats = await page.evaluate(() => window.zomfy.stats());
    await shot(page, 'abend', () => {
      window.zomfy.setTime(19, 35);
      window.zomfy.teleport(3.0, 1.75, 1.2);
    });
    await shot(page, 'nacht', () => {
      window.zomfy.setTime(22, 30);
      window.zomfy.teleport(1.0, 0.0, 0.6);
      window.zomfy.selectSlot(0);
    });
    const nightStats = await page.evaluate(() => window.zomfy.stats());
    await shot(page, 'innen-nacht', () => {
      window.zomfy.setTime(22, 45);
      window.zomfy.selectSlot(1);
      window.zomfy.teleport(-0.5, -3.75, 3.1);
    });
    await shot(page, 'waldrand', () => {
      window.zomfy.setTime(20, 5);
      window.zomfy.teleport(10.5, -4.0, -0.6);
    });
    await shot(page, 'dialog', () => {
      window.zomfy.setTime(9, 30);
      window.zomfy.teleport(-0.25, -5.0, 3.1);
      window.zomfy.interact('radio');
    });
    await settle(page, 90);
    await page.screenshot({ path: join(SHOTS, 'dialog.png') });
    await page.evaluate(() => window.zomfy.finishDialog());
    await shot(page, 'menue', () => {
      window.zomfy.setTime(16, 0);
      window.zomfy.teleport(-7.0, 1.0, 0.8);
      window.zomfy.openMenu();
    });
    await page.evaluate(() => window.zomfy.closeMenu());

    // Laufen mit echter Tastatur: Figur muss sich bewegen und darf nicht durch Wände.
    await page.evaluate(() => {
      window.zomfy.setTime(10, 0);
      window.zomfy.teleport(0, 2, 0);
    });
    const before = await page.evaluate(() => window.zomfy.state().player);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1200);
    await page.keyboard.up('KeyW');
    await settle(page, 5);
    const after = await page.evaluate(() => window.zomfy.state().player);
    if (after.z < before.z - 0.5) note(`✓ Laufen: Figur von z=${before.z.toFixed(2)} nach z=${after.z.toFixed(2)} bewegt`);
    else fail(`Laufen: Figur hat sich kaum bewegt (${before.z.toFixed(2)} -> ${after.z.toFixed(2)})`);
    if (after.z > -2.45) note('✓ Kollision: Figur bleibt vor der Hauswand');
    else fail(`Kollision: Figur steht bei z=${after.z.toFixed(2)} in der Hauswand`);

    // Laterne mit der Taste F an und wieder aus
    await page.keyboard.press('KeyF');
    await settle(page, 3);
    const lanternOn = await page.evaluate(() => window.zomfy.state().player.lantern);
    await page.keyboard.press('KeyF');
    await settle(page, 3);
    const lanternOff = await page.evaluate(() => window.zomfy.state().player.lantern);
    if (lanternOn && !lanternOff) note('✓ Laterne: Taste F schaltet an und aus');
    else fail(`Laterne: Taste F wirkt nicht wie erwartet (an=${lanternOn}, aus=${!lanternOff})`);

    // Am Feuer ausruhen: Uhr springt auf den Abend
    await page.evaluate(() => {
      window.zomfy.setTime(10, 0);
      window.zomfy.teleport(4.5, 2.0, 3.14);
      window.zomfy.interact('feuer');
      window.zomfy.finishDialog();
    });
    await page.waitForFunction(() => window.zomfy.mode === 'play', null, { timeout: 60000 });
    const restMinute = await page.evaluate(() => window.zomfy.state().time.minute);
    if (Math.abs(restMinute - 750) < 10) note('✓ Ausruhen: Am Feuer vergeht die Zeit bis zum Abend (18:30)');
    else fail(`Ausruhen: Uhr steht bei Minute ${restMinute} statt 750`);

    // Schriftabdeckung aller Texte
    const missing = await page.evaluate(async () => {
      const { missingGlyphs } = await import('/src/ui/font.js');
      const { T } = await import('/src/data/texts.js');
      const { DIALOGE, SPRECHER } = await import('/src/data/dialogs.js');
      const texts = [];
      const collect = (v) => {
        if (typeof v === 'string') texts.push(v);
        else if (typeof v === 'function') {
          try {
            collect(v(3));
          } catch {
            /* keine Textfunktion */
          }
        } else if (Array.isArray(v)) v.forEach(collect);
        else if (v && typeof v === 'object') Object.values(v).forEach(collect);
      };
      collect(T);
      collect(SPRECHER);
      for (const d of Object.values(DIALOGE)) {
        if (typeof d === 'function') {
          for (const flags of [{}, { radioGehoert: true, briefkastenGesehen: true, sesselProbiert: true }]) {
            for (let day = 1; day <= 4; day++) {
              for (const minute of [60, 720, 900]) collect(d({ flags, time: { day, minute } }));
            }
          }
        } else collect(d);
      }
      return missingGlyphs(texts.join(''));
    });
    if (missing.length) fail(`Schrift: Zeichen fehlen: ${missing.join(' ')}`);
    else note('✓ Schrift: alle Zeichen aller Texte vorhanden');

    checkMessages(tour);
    await tour.context.close();

    // --- 2. Speichern und Laden -----------------------------------------------------
    const saveUrl = `${url}index.html?test`;
    const first = await openGame(browser, saveUrl, 'Speichern', { init: () => {
      if (!sessionStorage.getItem('zomfy-check-cleared')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-check-cleared', '1');
      }
    } });
    await first.page.evaluate(() => {
      window.zomfy.setTime(15, 30);
      window.zomfy.teleport(-1.375, -4.125, 3.14);
      window.zomfy.interact('bett'); // am Tag: Rückfrage „Jetzt schon schlafen?“
      window.zomfy.finishDialog(); // erste Antwort: „Ja, bis morgen.“
    });
    const asleep = await first.page.evaluate(() => window.zomfy.mode);
    if (asleep === 'sleep') note('✓ Bett: Rückfrage am Tag, Antwort „Ja“ startet den Schlaf');
    else fail(`Bett: nach der Antwort ist der Modus „${asleep}“ statt „sleep“`);
    await first.page.waitForFunction(() => window.zomfy.mode !== 'sleep', null, { timeout: 60000 });
    const saved = await first.page.evaluate(() => JSON.parse(localStorage.getItem('zomfy-towers.spielstand') || 'null'));
    if (saved && saved.time.day === 2 && saved.version === 1) note('✓ Schlafen: Tag 2 begonnen und gespeichert');
    else fail(`Schlafen: kein gültiger Spielstand nach dem Schlafen (${JSON.stringify(saved)})`);
    await first.page.screenshot({ path: join(SHOTS, 'aufwachen.png') });
    note('  Screenshot: screenshots/aufwachen.png');
    await first.page.reload();
    await first.page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
    const reloaded = await first.page.evaluate(() => window.zomfy.state());
    if (reloaded.time.day === 2 && Math.abs(reloaded.time.minute - 30) < 5) note('✓ Laden: Spielstand nach Neuladen wiederhergestellt (Tag 2, 06:30)');
    else fail(`Laden: falscher Zustand nach Neuladen (Tag ${reloaded.time.day}, Minute ${reloaded.time.minute})`);
    checkMessages(first);
    await first.context.close();

    // Beschädigter Spielstand darf nichts kaputt machen.
    const broken = await openGame(browser, saveUrl, 'Kaputter Spielstand', {
      init: () => {
        if (!sessionStorage.getItem('zomfy-broken')) {
          localStorage.setItem('zomfy-towers.spielstand', '{kaputt');
          sessionStorage.setItem('zomfy-broken', '1');
        }
      },
    });
    const brokenState = await broken.page.evaluate(() => ({
      day: window.zomfy.state().time.day,
      backup: localStorage.getItem('zomfy-towers.spielstand.defekt'),
    }));
    if (brokenState.day === 1 && brokenState.backup === '{kaputt') note('✓ Kaputter Spielstand: beiseitegelegt, neues Spiel gestartet');
    else fail(`Kaputter Spielstand falsch behandelt: ${JSON.stringify(brokenState)}`);
    checkMessages(broken);
    await broken.context.close();

    // --- 3. Große Auflösung (Full HD) --------------------------------------------------
    const hd = await openGame(browser, `${url}index.html?test&nosave&time=21:15`, 'Full HD', { viewport: { width: 1920, height: 1080 } });
    await shot(hd.page, 'nacht-fullhd', () => {
      window.zomfy.setFlag('abendHinweis');
      window.zomfy.finishDialog();
      window.zomfy.teleport(2.25, -0.75, 0.5);
      window.zomfy.selectSlot(0);
    });
    checkMessages(hd);
    await hd.context.close();

    note('');
    note('Leistung (Headless-Chromium mit Software-WebGL – echte GPUs sind um ein Vielfaches schneller):');
    note(`  Tag:   ${dayStats.frameMs.toFixed(1)} ms/Bild, ${dayStats.calls} Draw-Calls, ${Math.round(dayStats.triangles / 1000)}k Dreiecke, ${dayStats.width}×${dayStats.height} @${dayStats.scale}x`);
    note(`  Nacht: ${nightStats.frameMs.toFixed(1)} ms/Bild, ${nightStats.calls} Draw-Calls, ${Math.round(nightStats.triangles / 1000)}k Dreiecke`);
  } finally {
    await browser.close();
    server.close();
  }
}

const syntaxOk = checkSyntax();
if (!syntaxOk) process.exit(1);
if (!args.has('--syntax')) {
  await runBrowserChecks();
  console.log('');
  if (problems.length) {
    console.log(`Prüfung fehlgeschlagen: ${problems.length} Problem(e).`);
    process.exit(1);
  }
  console.log('Prüfung bestanden.');
}
