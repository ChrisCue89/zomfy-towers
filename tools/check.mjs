// Prüfablauf für Zomfy Towers (siehe CLAUDE.md).
//
//   node tools/check.mjs            volle Prüfung im Headless-Browser
//   node tools/check.mjs --syntax   nur Syntax aller Module
//   node tools/check.mjs --nur=nahkampf,naechte
//                                   nur einzelne Abschnitte (rundgang, speichern,
//                                   bauen, wege, naechte, nahkampf, ueberlebende,
//                                   haendler, herbst, nachbesserung, hd)
//
// Die volle Prüfung startet einen lokalen Server, öffnet das Spiel in
// Headless-Chromium, sammelt alle Konsolenmeldungen, macht Screenshots nach
// screenshots/, prüft Speichern/Laden, Sammeln und Bauen, die Wege an der Bucht
// (Meilenstein 9), Türme, Barrikaden, Horde und Nächte und misst Bildzeiten.
// Mit ?test spielt jede Prüfung auf derselben Karte (Startwert 3).

import { execFileSync, execSync } from 'node:child_process';
import { readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { start } from './serve.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS = join(ROOT, 'screenshots');
const args = new Set(process.argv.slice(2));
const only = [...args].find((a) => a.startsWith('--nur='))?.slice(6).split(',') || null;
/** Soll dieser Abschnitt laufen? (ohne --nur: alle) */
const want = (part) => !only || only.includes(part);

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
  await page.screenshot({ path: join(SHOTS, `${name}.png`), timeout: 180000 }); // unter Last braucht der Software-Renderer lange
  note(`  Screenshot: screenshots/${name}.png`);
}

async function runBrowserChecks() {
  const { chromium } = loadPlaywright();
  mkdirSync(SHOTS, { recursive: true });
  const { server, url } = await start(0);
  const browser = await launchBrowser(chromium);
  let dayStats = null;
  let nightStats = null;
  try {
    if (want('rundgang')) ({ dayStats, nightStats } = await runTour(browser, url));
    if (want('speichern')) await runSaveChecks(browser, url);

    // --- 3. Meilenstein 2: Sammeln, Bauen, Werkbank, Hütte ---------------------------
    if (want('bauen')) await runBuildChecks(browser, url);

    // --- 3b. Meilenstein 9: Bucht, Wege, Barrikaden, Überreste, Karte, Migration v8 ------
    if (want('wege')) await runPathChecks(browser, url);

    // --- 4. Meilenstein 3: Türme, Horde, Loot, Nächte ---------------------------------
    if (want('naechte')) await runNightChecks(browser, url);

    // --- 5. Meilenstein 4: Nahkampf, Waffen, Ausweichen, Perks -------------------------
    if (want('nahkampf')) await runCombatChecks(browser, url);

    // --- 6. Meilenstein 6: Überlebende, Zelte, Einrichten, Funkturm ---------------------
    if (want('ueberlebende')) await runSurvivorChecks(browser, url);

    // --- 6b. Meilenstein 8: Zombieteile, Balduin (seit M9 mit dem Boot), Wrack nur einmal ------
    if (want('haendler')) await runTraderChecks(browser, url);

    // --- 6c. Meilenstein 12: Wetter, Herbstschmuck, Krähen, Gesichter -------------------
    if (want('herbst')) await runAutumnChecks(browser, url);

    // --- 6d. Nachbesserung nach der Testrunde m12-r1 ------------------------------------
    if (want('nachbesserung')) await runFixChecks(browser, url);

    // --- 7. Große Auflösung (Full HD) --------------------------------------------------
    if (want('hd')) {
      const hd = await openGame(browser, `${url}index.html?test&nosave&time=21:15`, 'Full HD', { viewport: { width: 1920, height: 1080 } });
      await shot(hd.page, 'nacht-fullhd', () => {
        window.zomfy.setHorde(false);
        window.zomfy.setFlag('abendHinweis');
        window.zomfy.finishDialog();
        window.zomfy.teleport(3.25, -2.75, 0.5);
        window.zomfy.toggleLantern();
      });
      checkMessages(hd);
      await hd.context.close();
    }

    if (dayStats && nightStats) {
      note('');
      note('Leistung (Headless-Chromium mit Software-WebGL – echte GPUs sind um ein Vielfaches schneller):');
      note(`  Tag:   ${dayStats.frameMs.toFixed(1)} ms/Bild, ${dayStats.calls} Draw-Calls, ${Math.round(dayStats.triangles / 1000)}k Dreiecke, ${dayStats.width}×${dayStats.height} @${dayStats.scale}x`);
      note(`  Nacht: ${nightStats.frameMs.toFixed(1)} ms/Bild, ${nightStats.calls} Draw-Calls, ${Math.round(nightStats.triangles / 1000)}k Dreiecke`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

/** Abschnitte 0 und 1: Spielstart mit Intro, Rundgang mit Bildern, Laufen, Laterne, Ausruhen, Schrift. */
async function runTour(browser, url) {
  {
    // --- 0. Erster Eindruck: neues Spiel mit Einblenden und Intro -----------------
    const intro = await openGame(browser, `${url}index.html?debug&nosave`, 'Spielstart');
    await intro.page.evaluate(() => window.zomfy.setDebug(false));
    // Titelbild (Meilenstein 7): ohne Spielstand ist »Neues Spiel« vorgewählt
    await intro.page.waitForFunction(() => window.zomfy.mode === 'title', null, { timeout: 180000 });
    await settle(intro.page, 60);
    await intro.page.screenshot({ path: join(SHOTS, 'titel.png') });
    note('  Screenshot: screenshots/titel.png');
    const titel = await intro.page.evaluate(() => window.zomfyView().titel);
    await intro.page.keyboard.press('Enter');
    await settle(intro.page, 20);
    // Figur: Mütze mit D weiterschalten, Namen tippen (E am Namen, Enter beendet), dann »Los geht’s!«
    const figurSeite = await intro.page.evaluate(() => window.zomfyView().titel?.seite);
    // Jeder Druck in einem eigenen Bild (gleiche Tasten im selben Bild zählen einmal)
    const tap = async (key) => {
      await intro.page.keyboard.press(key);
      await settle(intro.page, 2);
    };
    for (let k = 0; k < 4; k++) await tap('KeyW');
    await tap('KeyD');
    await tap('KeyW');
    await tap('KeyE');
    for (let k = 0; k < 4; k++) await tap('Backspace');
    await intro.page.keyboard.type('Kira');
    await tap('Enter');
    await settle(intro.page, 30);
    await intro.page.screenshot({ path: join(SHOTS, 'figur.png') });
    note('  Screenshot: screenshots/figur.png');
    const knoepfe = await intro.page.evaluate(() => window.zomfyView().titel?.knoepfe || []);
    for (let k = 0; k < 5; k++) await tap('KeyS');
    await tap('Enter');
    await intro.page.waitForFunction(() => window.zomfy.mode === 'dialog', null, { timeout: 180000 });
    const neu = await intro.page.evaluate(() => window.zomfy.state().player);
    if (titel?.knoepfe?.[0]?.includes('Neues Spiel') && figurSeite === 'figur' && knoepfe[0]?.includes('Kira') && neu.name === 'Kira' && neu.look.hat === 'rot') note('✓ Titelbild: Neues Spiel, Name »Kira« getippt, Mütze rot – dann Intro');
    else fail(`Titelbild: ${JSON.stringify({ titel, figurSeite, knoepfe, name: neu.name, look: neu.look })}`);
    await settle(intro.page, 70);
    await intro.page.screenshot({ path: join(SHOTS, 'start.png') });
    note('  Screenshot: screenshots/start.png');
    checkMessages(intro);
    await intro.context.close();

    // --- 1. Rundgang mit Screenshots (ohne Speichern) ---------------------------
    const tour = await openGame(browser, `${url}index.html?test&nosave`, 'Rundgang');
    const { page } = tour;
    // Einmalige Hinweis-Dialoge würden die Bilder verdecken; die Horde bleibt
    // für diese ruhigen Bilder im Wald (Nächte prüft Abschnitt 4).
    await page.evaluate(() => {
      window.zomfy.setFlag('abendHinweis');
      window.zomfy.setFlag('spaetHinweis');
      window.zomfy.setFlag('abendHorde');
      window.zomfy.setFlag('ruheHinweis');
      window.zomfy.setHorde(false);
    });

    await shot(page, 'morgen', () => {
      window.zomfy.setTime(6, 40);
      window.zomfy.teleport(3.5, -1.5, 0.4);
    });
    await shot(page, 'tag', () => {
      window.zomfy.setTime(12, 0);
      window.zomfy.teleport(-3.0, -4.5, 1.4);
    });
    // Bildzeit bei Tag messen
    await settle(page, 120);
    const dayStats = await page.evaluate(() => window.zomfy.stats());
    await shot(page, 'abend', () => {
      window.zomfy.setTime(19, 35);
      window.zomfy.teleport(5.0, -1.0, 1.2);
    });
    await shot(page, 'nacht', () => {
      window.zomfy.setTime(22, 30);
      window.zomfy.teleport(2.5, -2.5, 0.6);
      window.zomfy.toggleLantern();
    });
    const nightStats = await page.evaluate(() => window.zomfy.stats());
    await shot(page, 'innen-nacht', () => {
      window.zomfy.setTime(22, 45);
      window.zomfy.toggleLantern();
      const e = window.zomfy.interior().entry; // drinnen ist ein eigenes Bild (M11)
      window.zomfy.teleport(e.x - 0.6, e.z - 2.2, 3.1);
    });
    await shot(page, 'waldrand', () => {
      window.zomfy.setTime(20, 5);
      window.zomfy.teleport(-10.0, 1.5, -0.6);
    });
    await shot(page, 'dialog', () => {
      window.zomfy.setTime(9, 30);
      const r = window.zomfy.game.world.interactions.find((i) => i.id === 'radio');
      window.zomfy.teleport(r.x + 0.3, r.z + 0.9, 3.1);
      window.zomfy.interact('radio');
    });
    await settle(page, 90);
    await page.screenshot({ path: join(SHOTS, 'dialog.png') });
    await page.evaluate(() => window.zomfy.finishDialog());
    await shot(page, 'menue', () => {
      window.zomfy.setTime(16, 0);
      window.zomfy.teleport(-2.0, 0.5, 0.8);
      window.zomfy.openMenu();
    });
    await page.evaluate(() => window.zomfy.closeMenu());

    // Laufen mit echter Tastatur: Figur muss sich bewegen und darf nicht durch Wände.
    await page.evaluate(() => {
      window.zomfy.setTime(10, 0);
      window.zomfy.teleport(8.0, -2.0, 0); // vor dem Fenster – vor der Tür führt die Türhilfe ins Haus
    });
    const before = await page.evaluate(() => window.zomfy.state().player);
    // In Bildern statt in Millisekunden – unter Last (langsame Bilder) sonst zu kurz
    await page.keyboard.down('KeyW');
    await settle(page, 45);
    await page.keyboard.up('KeyW');
    await settle(page, 5);
    const after = await page.evaluate(() => window.zomfy.state().player);
    if (after.z < before.z - 0.5) note(`✓ Laufen: Figur von z=${before.z.toFixed(2)} nach z=${after.z.toFixed(2)} bewegt`);
    else fail(`Laufen: Figur hat sich kaum bewegt (${before.z.toFixed(2)} -> ${after.z.toFixed(2)})`);
    if (after.z > -5.45) note('✓ Kollision: Figur bleibt vor der Hauswand');
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
      window.zomfy.teleport(0.5, -0.25, 3.14);
      window.zomfy.interact('feuer');
      window.zomfy.answer(0); // „Bis zum Abend ausruhen“ (vorgewählt ist „Weitermachen“)
    });
    await page.waitForFunction(() => window.zomfy.mode === 'play', null, { timeout: 180000 });
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
              for (const minute of [60, 720, 900]) {
                for (const schrott of [0, 99]) {
                  // Ausbaustufen und Suppe (M11) mit abdecken
                  for (let houseLevel = 1; houseLevel <= 4; houseLevel++) {
                    const world = { houseLevel };
                    const player = { soup: houseLevel % 2 ? day : 0 };
                    collect(d({ flags, time: { day, minute }, inventory: { schrott }, world, player }));
                  }
                }
              }
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
    return { dayStats, nightStats };
  }
}

/** Abschnitt 2: Bett, Schlafen, Speichern und Laden, kaputter Spielstand. */
async function runSaveChecks(browser, url) {
  {
    // --- 2a. Titelbild ohne Spielstand: erst »Los geht’s!« legt einen an (m7-r1) ------
    const t = await openGame(browser, `${url}index.html?debug`, 'Titelbild ohne Stand', { init: () => localStorage.clear() });
    await t.page.evaluate(() => window.zomfy.setDebug(false));
    await t.page.waitForFunction(() => window.zomfy.mode === 'title', null, { timeout: 180000 });
    await settle(t.page, 60); // das Titelbild nimmt erst nach dem Einblenden Tasten an
    await t.page.keyboard.press('Enter'); // Neues Spiel → Figur
    await settle(t.page, 20);
    // Verlassen der Seite in der Figurwahl (wie beim Neuladen): nichts speichern
    const inFigur = await t.page.evaluate(() => {
      window.zomfy.save();
      return { seite: window.zomfyView().titel?.seite, stand: localStorage.getItem('zomfy-towers.spielstand') };
    });
    await t.page.keyboard.press('Enter'); // »Los geht’s!« ist vorgewählt
    await t.page.waitForFunction(() => window.zomfy.mode === 'dialog', null, { timeout: 180000 });
    const gestartet = await t.page.evaluate(() => Boolean(localStorage.getItem('zomfy-towers.spielstand')));
    if (inFigur.seite === 'figur' && inFigur.stand === null && gestartet) note('✓ Titelbild: in der Figurwahl entsteht kein Spielstand, erst »Los geht’s!« legt ihn an');
    else fail(`Titelbild ohne Stand: ${JSON.stringify({ ...inFigur, gestartet })}`);
    checkMessages(t);
    await t.context.close();
  }
  {
    // --- 2. Speichern und Laden -----------------------------------------------------
    const saveUrl = `${url}index.html?test`;
    const first = await openGame(browser, saveUrl, 'Speichern', { init: () => {
      if (!sessionStorage.getItem('zomfy-check-cleared')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-check-cleared', '1');
      }
    } });
    // Meilenstein 11: Drinnen ist ein eigenes Bild. Vor der Haustür führt W hinein
    // (kurz abblenden, doppelter Maßstab), S durch die Türöffnung wieder hinaus.
    await first.page.evaluate(() => {
      window.zomfy.setHorde(false);
      window.zomfy.setTime(15, 30);
      const d = window.zomfy.interior().outsideDoor;
      window.zomfy.teleport(d.x, d.z + 0.2, Math.PI);
    });
    await settle(first.page, 10);
    // Taste halten, bis Mika auf der anderen Seite der Tür ist (dann loslassen)
    const walkThrough = async (key, wantInside) => {
      await first.page.keyboard.down(key);
      for (let k = 0; k < 40; k++) {
        await settle(first.page, 4);
        if ((await first.page.evaluate(() => window.zomfy.interior().inside)) === wantInside) break;
      }
      await first.page.keyboard.up(key);
      await settle(first.page, 30);
    };
    await walkThrough('KeyW', true);
    const drinnen = await first.page.evaluate(() => ({ ...window.zomfy.interior(), figur: window.zomfyView().figur }));
    await first.page.screenshot({ path: join(SHOTS, 'innen.png') });
    note('  Screenshot: screenshots/innen.png');
    await walkThrough('KeyS', false);
    const draussen = await first.page.evaluate(() => ({ ...window.zomfy.interior(), figur: window.zomfyView().figur }));
    if (drinnen.inside && drinnen.zoom === 160 && drinnen.figur.imHaus && !draussen.inside && draussen.zoom === 80 && !draussen.figur.imHaus && Math.hypot(draussen.figur.x - draussen.outsideDoor.x, draussen.figur.z - draussen.outsideDoor.z) < 2) {
      note(`✓ Haustür: W führt hinein (eigenes Bild, ${drinnen.zoom} px/m), S durch die Türöffnung wieder hinaus vor die Tür (${draussen.zoom} px/m)`);
    } else fail(`Haustür: ${JSON.stringify({ drinnen: { inside: drinnen.inside, zoom: drinnen.zoom, figur: drinnen.figur }, draussen: { inside: draussen.inside, zoom: draussen.zoom, figur: draussen.figur } })}`);
    await first.page.evaluate(() => {
      const b = window.zomfy.game.world.interactions.find((i) => i.id === 'bett');
      window.zomfy.teleport(b.x - 0.4, b.z + 0.4, Math.PI / 2);
      window.zomfy.interact('bett'); // vor der Nacht: »Erst muss die Nacht vorbei sein.«
    });
    const vorNacht = await first.page.evaluate(() => ({ mode: window.zomfy.mode, day: window.zomfy.state().time.day }));
    await first.page.evaluate(() => {
      window.zomfy.finishDialog();
      window.zomfy.endNight(true);
      window.zomfy.interact('bett');
    });
    const asleep = await first.page.evaluate(() => window.zomfy.mode);
    if (vorNacht.mode === 'dialog' && asleep === 'sleep') note('✓ Bett: vor der Nacht gesperrt, nach der Nacht schläft Mika');
    else fail(`Bett: vor der Nacht Modus „${vorNacht.mode}“, nach der Nacht „${asleep}“`);
    await first.page.waitForFunction(() => window.zomfy.mode !== 'sleep', null, { timeout: 240000 });
    const saved = await first.page.evaluate(() => JSON.parse(localStorage.getItem('zomfy-towers.spielstand') || 'null'));
    if (saved && saved.time.day === 2 && saved.version === 10 && Number.isFinite(saved.world.mapSeed)) note(`✓ Schlafen: Tag 2 begonnen und gespeichert (v10, Karte ${saved.world.mapSeed})`);
    else fail(`Schlafen: kein gültiger Spielstand nach dem Schlafen (${JSON.stringify(saved)})`);
    const bericht = await first.page.evaluate(() => window.zomfy.mode);
    if (bericht === 'report') note('✓ Morgenbericht: nach dem Aufwachen zeigt er die Nacht');
    else fail(`Morgenbericht: Modus „${bericht}“ statt „report“`);
    await first.page.screenshot({ path: join(SHOTS, 'aufwachen.png') });
    note('  Screenshot: screenshots/aufwachen.png');
    await first.page.reload();
    await first.page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
    const reloaded = await first.page.evaluate(() => window.zomfy.state());
    await settle(first.page, 10);
    const drinnenGeladen = await first.page.evaluate(() => window.zomfy.interior().inside);
    if (reloaded.time.day === 2 && Math.abs(reloaded.time.minute - 30) < 5 && drinnenGeladen) note('✓ Laden: Spielstand nach Neuladen wiederhergestellt (Tag 2, 06:30, Mika drinnen am Bett)');
    else fail(`Laden: falscher Zustand nach Neuladen (Tag ${reloaded.time.day}, Minute ${reloaded.time.minute}, drinnen ${drinnenGeladen})`);
    // Migration v9 → v10: Wer im alten Haus stand, steht jetzt im Innenraum hinter der Tür
    await first.page.evaluate(() => {
      window.zomfy.game.quietSave = () => {}; // beim Neuladen nicht über den alten Stand speichern
      const st = window.zomfy.state();
      localStorage.setItem('zomfy-towers.spielstand', JSON.stringify({ ...st, version: 9, player: { ...st.player, x: 6.5, z: -7.0 } }));
    });
    await first.page.reload();
    await first.page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
    await settle(first.page, 10);
    const v9 = await first.page.evaluate(() => ({ v: window.zomfy.state().version, p: window.zomfy.state().player, i: window.zomfy.interior() }));
    if (v9.v === 10 && v9.i.inside && Math.hypot(v9.p.x - v9.i.entry.x, v9.p.z - v9.i.entry.z) < 0.5) note('✓ Migration: Spielstand v9 wird zu v10 – wer im alten Haus stand, steht jetzt drinnen hinter der Tür');
    else fail(`Migration v9 → v10: ${JSON.stringify(v9)}`);
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
  }
}

/** Meilenstein 2: echte Eingaben (Tasten, Mausklicks) und die Spiellogik dahinter. */
async function runBuildChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave`, 'Sammeln und Bauen');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const state = () => z(() => window.zomfy.state());
  await z(() => {
    window.zomfy.setFlag('abendHinweis');
    window.zomfy.setFlag('spaetHinweis');
    window.zomfy.setFlag('abendHorde');
    window.zomfy.setFlag('ruheHinweis');
    window.zomfy.setHorde(false);
    window.zomfy.setTime(9, 0);
  });

  // Axt vom Hackklotz – mit der Taste E
  await z(() => window.zomfy.teleport(1.75, -5.2, Math.PI));
  await settle(page, 3);
  await page.keyboard.press('KeyE');
  await settle(page, 3);
  await z(() => window.zomfy.finishDialog());
  let st = await state();
  if (st.tools.axt && st.hotbar.slots[0] === 'axt') note('✓ Axt: mit E vom Hackklotz genommen, liegt in der Schnellleiste');
  else fail(`Axt: nicht genommen (${JSON.stringify(st.tools)}, ${JSON.stringify(st.hotbar)})`);

  // Baum fällen: E gedrückt halten, bis er fällt
  await z(() => window.zomfy.teleport(-5.65, 9.5, -Math.PI / 2));
  await settle(page, 3);
  const holzVorher = st.inventory.holz;
  await page.keyboard.down('KeyE');
  await page.waitForFunction(() => window.zomfy.state().world.nodes['jung-1'], null, { timeout: 180000 }).catch(() => {});
  await page.keyboard.up('KeyE');
  st = await state();
  if (st.world.nodes['jung-1'] && st.inventory.holz === holzVorher + 6) note(`✓ Sammeln: E halten fällt den Baum (+6 Holz, wächst bis Tag ${st.world.nodes['jung-1'].until} nach)`);
  else fail(`Sammeln: Baum nicht gefällt oder falscher Ertrag (Holz ${holzVorher} -> ${st.inventory.holz})`);

  // Felsen ohne Spitzhacke: nichts passiert
  await z(() => window.zomfy.teleport(-6.25, -11.1, Math.PI));
  await settle(page, 3);
  const steinVorher = st.inventory.stein;
  await z(() => window.zomfy.interact('felsen-1'));
  await settle(page, 30);
  st = await state();
  if (st.inventory.stein === steinVorher) note('✓ Werkzeug: ohne Spitzhacke gibt der Felsen nichts her');
  else fail('Werkzeug: Felsen ließ sich ohne Spitzhacke abbauen');

  // Schrott durchsuchen: einmal am Tag
  await z(() => window.zomfy.teleport(5.75, 9.75, -Math.PI / 2));
  await settle(page, 3);
  const schrottVorher = st.inventory.schrott;
  await z(() => window.zomfy.interact('schrott-1'));
  await settle(page, 45);
  st = await state();
  const erste = st.inventory.schrott - schrottVorher;
  await z(() => window.zomfy.interact('schrott-1'));
  await settle(page, 45);
  const st2 = await state();
  if (erste >= 2 && st2.inventory.schrott === st.inventory.schrott) note(`✓ Durchsuchen: +${erste} Schrott, zweites Mal am selben Tag leer`);
  else fail(`Durchsuchen: Ertrag ${erste}, danach ${st2.inventory.schrott - st.inventory.schrott}`);

  // Werkbank über die Bauleiste: Tab zweimal (Türme → Figur → Zuhause), Q, dann E setzt vor der Figur
  await z(() => {
    window.zomfy.give({ holz: 20, stein: 10 });
    window.zomfy.teleport(3.5, 2.5, 0);
  });
  await settle(page, 3);
  await page.keyboard.press('Tab');
  await settle(page, 2);
  await page.keyboard.press('Tab');
  await settle(page, 2);
  await page.keyboard.press('KeyQ');
  await settle(page, 3);
  const plan = await z(() => window.zomfy.placement);
  await page.keyboard.press('KeyE');
  await settle(page, 3);
  await z(() => window.zomfy.finishDialog());
  const bauten = await z(() => window.zomfy.buildings());
  if (plan && plan.type === 'werkbank' && bauten.some((b) => b.type === 'werkbank')) note('✓ Bauleiste: Tab wechselt zum Reiter Zuhause, Q wählt die Werkbank, E setzt sie');
  else fail(`Bauleiste: Werkbank nicht gebaut (Plan ${JSON.stringify(plan)}, Bauten ${JSON.stringify(bauten)})`);
  const zweite = await z(() => window.zomfy.build('werkbank', -6, 4));
  if (zweite === 'max') note('✓ Bauleiste: nur eine Werkbank möglich');
  else fail(`Bauleiste: zweite Werkbank ergab „${zweite}“`);

  // Esc bricht das Platzieren ab, ohne das Menü zu öffnen (Tab: zurück zu den Türmen, C = Barrikade)
  await page.keyboard.press('Tab');
  await settle(page, 2);
  await page.keyboard.press('KeyC');
  await settle(page, 3);
  await page.keyboard.press('Escape');
  await settle(page, 3);
  const nachEsc = await z(() => ({ mode: window.zomfy.mode, placement: window.zomfy.placement }));
  if (nachEsc.mode === 'play' && !nachEsc.placement) note('✓ Platzieren: Esc bricht ab, Menü bleibt zu');
  else fail(`Platzieren: nach Esc ${JSON.stringify(nachEsc)}`);

  // Barrikade mit der Maus: Kachel anklicken, dann auf ein Wegfeld klicken (M9: Barrikaden nur auf Wege)
  const spalte = await z(() => window.zomfy.pathColumn(-10));
  const wegJ = spalte[Math.floor(spalte.length / 2)];
  await z((j) => window.zomfy.teleport(-8.5, j - 3.5, 0), wegJ);
  await settle(page, 20);
  const tile = await z(() => {
    const L = window.zomfy.buildbarLayout();
    const t = L.tiles.find((x) => x.id === 'barrikade');
    return t;
  });
  await page.mouse.click(tile.x, tile.y);
  await settle(page, 3);
  const target = await z((j) => window.zomfy.screenOf(-9.5, 0, j + 0.5), wegJ);
  await page.mouse.move(target.x, target.y);
  await settle(page, 3);
  await page.mouse.click(target.x, target.y);
  await settle(page, 3);
  const perMaus = (await z(() => window.zomfy.buildings())).find((b) => b.type === 'barrikade');
  if (perMaus && perMaus.i === -10 && perMaus.j === wegJ) note(`✓ Platzieren mit der Maus: Barrikade landet genau auf dem angeklickten Wegfeld (quer zum Weg, Drehung ${perMaus.turns})`);
  else fail(`Platzieren mit der Maus: ${JSON.stringify(perMaus)} statt Feld (-10, ${wegJ})`);
  await page.mouse.click(target.x, target.y, { button: 'right' });
  await settle(page, 3);

  // Belegte Felder, Wege: Auf den Weg nur Barrikaden, daneben alles andere (M9)
  const aufsHaus = await z(() => window.zomfy.build('laternenpfahl', 6, -7));
  if (aufsHaus === 'belegt') note('✓ Raster: Haus und Hindernisse sind nicht bebaubar');
  else fail(`Raster: Bau auf dem Haus ergab „${aufsHaus}“`);
  const regeln = await z((j) => ({ turm: window.zomfy.placeCheck('bolzen', -11, j).reason, laterne: window.zomfy.placeCheck('laternenpfahl', -11, j).reason, barrikade: window.zomfy.placeCheck('barrikade', 2, 5).reason }), wegJ);
  if (regeln.turm === 'aufWeg' && regeln.laterne === 'aufWeg' && regeln.barrikade === 'nurWeg') note('✓ Wege: Türme und andere Bauten nie auf einem Wegfeld, Barrikaden nur dort');
  else fail(`Wegregeln: ${JSON.stringify(regeln)}`);
  // Abreißen: Barrikaden sind Verteidigung und geben 70 % zurück, gerundet (M9.1: 1 von 1 Holz)
  const holzVorAbriss = (await state()).inventory.holz;
  await z((id) => window.zomfy.demolish(id), perMaus?.id);
  const holzNachAbriss = (await state()).inventory.holz;
  if (holzNachAbriss === holzVorAbriss + 1) note('✓ Abreißen: Barrikade gibt 70 % zurück, gerundet (1 von 1 Holz)');
  else fail(`Abreißen: Holz ${holzVorAbriss} -> ${holzNachAbriss}`);

  // Spitzhacke an der Werkbank, dann Felsen abbauen
  await z(() => window.zomfy.give({ schrott: 2 }));
  const hacke = await z(() => window.zomfy.craft('spitzhacke'));
  st = await state();
  if (hacke && st.tools.spitzhacke && st.hotbar.slots.includes('spitzhacke')) note('✓ Werkbank: Spitzhacke hergestellt');
  else fail('Werkbank: Spitzhacke nicht hergestellt');
  await z(() => window.zomfy.teleport(-6.25, -11.1, Math.PI));
  await settle(page, 3);
  const steinVorFelsen = st.inventory.stein;
  await z(() => window.zomfy.interact('felsen-1'));
  await settle(page, 25);
  st = await state();
  if (st.inventory.stein === steinVorFelsen + 1) note('✓ Werkzeug: mit Spitzhacke gibt der Felsen Stein');
  else fail(`Werkzeug: Felsen gab ${st.inventory.stein - steinVorFelsen} Stein`);

  // Werkbank-Menü: ein kurzer Druck verwertet einmal, gehaltenes E macht gemächlich weiter
  await z(() => {
    window.zomfy.give({ stein: 9 });
    const bank = window.zomfy.buildings().find((b) => b.type === 'werkbank');
    window.zomfy.teleport(bank.i + 1, bank.j + 1.8, Math.PI);
    window.zomfy.interact(`bau-${bank.id}`);
  });
  await settle(page, 45); // gleich nach dem Öffnen stellt E nichts her (OPEN_LOCK)
  const steinVorVerwerten = (await state()).inventory.stein;
  // Mit S bis »Stein zu Schrott verwerten« (die Liste wächst mit den Meilensteinen), dann einmal kurz E
  for (let k = 0; k < 12; k++) {
    const zeilen = (await z(() => window.zomfyView().werkbank)) || [];
    if (zeilen.some((l) => l.startsWith('> Stein zu Schrott'))) break;
    await page.keyboard.press('KeyS');
    await settle(page, 2);
  }
  await page.keyboard.press('KeyE');
  await settle(page, 3);
  const nachTippen = (await state()).inventory.stein;
  await page.keyboard.down('KeyE');
  await settle(page, 60);
  await page.keyboard.up('KeyE');
  await settle(page, 3);
  const nachHalten = (await state()).inventory.stein;
  const verwertet = nachTippen - nachHalten;
  if (steinVorVerwerten - nachTippen === 2 && verwertet >= 2 && verwertet % 2 === 0) note(`✓ Werkbank: kurzer Druck verwertet einmal (2 Stein), gehaltenes E macht weiter (${verwertet} Stein)`);
  else fail(`Werkbank: Stein ${steinVorVerwerten} -> nach kurzem E ${nachTippen} -> nach gehaltenem E ${nachHalten}`);
  await settle(page, 25);
  await page.screenshot({ path: join(SHOTS, 'werkbank.png') });
  note('  Screenshot: screenshots/werkbank.png');
  await page.keyboard.press('Escape');
  await settle(page, 3);

  // Bauvorschau als Bild
  await shot(page, 'bauen', () => {
    const col = window.zomfy.pathColumn(-9);
    window.zomfy.give({ holz: 3 * col.length + 6, schrott: 4, stoff: 2 });
    for (const j of col) window.zomfy.build('barrikade', -9, j, 1);
    window.zomfy.build('laternenpfahl', -8, col[0] - 2);
    window.zomfy.teleport(-6.0, col[0] - 1.5, 0.4);
    window.zomfy.give({ holz: 3 });
    window.zomfy.startPlacement('barrikade');
  });
  await z(() => window.zomfy.cancelBuild());

  // Hausausbau zur Hütte
  await z(() => {
    window.zomfy.give({ holz: 30, stein: 16, stoff: 6, schrott: 8 });
    window.zomfy.upgradeHouse();
  });
  await page.waitForFunction(() => window.zomfy.mode !== 'sleep', null, { timeout: 240000 });
  await z(() => window.zomfy.finishDialog());
  st = await state();
  if (st.world.houseLevel === 2 && st.world.homeHp === 450) note('✓ Zuhause: zur Hütte ausgebaut, Standfestigkeit 450');
  else fail(`Zuhause: Stufe ${st.world.houseLevel}, Standfestigkeit ${st.world.homeHp}`);
  // Laufen gegen die neue Veranda (von Süden her nach Norden)
  await z(() => window.zomfy.teleport(10.75, -2.5, Math.PI));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(900);
  await page.keyboard.up('KeyW');
  await settle(page, 3);
  st = await state();
  if (st.player.z > -4.9) note('✓ Kollision: Anbau der Hütte ist fest');
  else fail(`Kollision: Figur ist bei z=${st.player.z.toFixed(2)} in den Anbau gelaufen`);
  await shot(page, 'huette', () => {
    window.zomfy.setTime(17, 10);
    window.zomfy.teleport(6.5, -2.0, 0.3);
  });
  await shot(page, 'huette-nacht', () => {
    window.zomfy.setTime(22, 40);
    window.zomfy.teleport(7.0, -1.5, 0.8);
    window.zomfy.toggleLantern();
  });

  // Meilenstein 11: jede Ausbaustufe ein Raum – Küche (Suppe), Schlafzimmer (Bett zieht um,
  // Gemütlichkeit +2), Werkstatt (Werkbank drinnen), Lager; dazu das Holzlager draußen
  await z(() => {
    window.zomfy.toggleLantern();
    window.zomfy.setTime(10, 0);
    window.zomfy.give({ holz: 160, stein: 70, stoff: 20, schrott: 60, zahnraeder: 6, fasern: 6 });
  });
  const stufen = [];
  for (let k = 0; k < 3; k++) {
    await z(() => window.zomfy.upgradeHouse());
    await page.waitForFunction(() => window.zomfy.mode !== 'sleep', null, { timeout: 240000 });
    await z(() => window.zomfy.finishDialog());
    stufen.push(await z(() => ({ stufe: window.zomfy.state().world.houseLevel, hp: window.zomfy.state().world.homeHp, raeume: window.zomfy.interior().rooms.map((r) => r.id).join(',') })));
  }
  const raeume = await z(() => {
    const find = (id) => window.zomfy.game.world.interactions.find((i) => i.id === id);
    const bett = find('bett');
    const zimmer = window.zomfy.interior().rooms.find((r) => r.id === 'schlafzimmer');
    return { bettImSchlafzimmer: Boolean(bett && zimmer && bett.x > zimmer.minX - 1 && bett.x < zimmer.maxX), herd: Boolean(find('herd')), werkbank: Boolean(find('werkbank-innen')), lager: Boolean(find('lager')), cozy: window.zomfy.cozy() };
  });
  // Suppe am Herd: E, Antwort »Suppe kochen«
  await z(() => {
    const h = window.zomfy.game.world.interactions.find((i) => i.id === 'herd');
    window.zomfy.teleport(h.x, h.z + 0.5, Math.PI);
  });
  await settle(page, 20);
  const vorSuppe = await z(() => window.zomfy.game.combat.maxHp);
  await page.keyboard.press('KeyE');
  await settle(page, 20);
  await z(() => window.zomfy.answer(0));
  await settle(page, 10);
  const nachSuppe = await z(() => ({ max: window.zomfy.game.combat.maxHp, hp: window.zomfy.state().player.hp, soup: window.zomfy.state().player.soup, day: window.zomfy.state().time.day }));
  await page.screenshot({ path: join(SHOTS, 'kueche.png') });
  note('  Screenshot: screenshots/kueche.png');
  // Werkbank in der Werkstatt öffnet das Werkbank-Fenster
  await z(() => {
    const w = window.zomfy.game.world.interactions.find((i) => i.id === 'werkbank-innen');
    window.zomfy.teleport(w.x, w.z + 0.6, Math.PI);
  });
  await settle(page, 20);
  await page.keyboard.press('KeyE');
  await settle(page, 10);
  const werkbankModus = await z(() => window.zomfy.mode);
  await page.keyboard.press('Escape');
  await settle(page, 10);
  const stufenOk = stufen.map((x) => x.stufe).join() === '3,4,5' && stufen[2].hp === 900 && stufen[2].raeume === 'werkstatt,kueche,wohnraum,schlafzimmer,lager';
  if (stufenOk && raeume.bettImSchlafzimmer && raeume.herd && raeume.werkbank && raeume.lager && raeume.cozy === 2 && nachSuppe.max === vorSuppe + 25 && nachSuppe.hp === nachSuppe.max && nachSuppe.soup === nachSuppe.day && werkbankModus === 'craft') {
    note(`✓ Zuhause: Stufen 3–5 mit Schlafzimmer, Werkstatt und Lager (Standfestigkeit ${stufen[2].hp}); Suppe am Herd (+25 Leben), Werkbank drinnen, das Bett steht im Schlafzimmer (Gemütlichkeit +2)`);
  } else fail(`Zuhause Stufen 3–5: ${JSON.stringify({ stufen, raeume, vorSuppe, nachSuppe, werkbankModus })}`);
  await shot(page, 'schlafzimmer', () => {
    window.zomfy.setTime(21, 30);
    const r = window.zomfy.interior().rooms.find((q) => q.id === 'schlafzimmer');
    window.zomfy.teleport((r.minX + r.maxX) / 2, 3.2, Math.PI);
  });
  // Holzlager draußen: am nächsten Tag 2 Holz zum Mitnehmen
  const holzlager = await z(() => {
    window.zomfy.setTime(10, 0);
    window.zomfy.give({ holz: 6, stein: 2 });
    for (const [i, j] of [[1, 1], [-3, 3], [2, 5], [-4, 1], [4, 6], [-2, 6]]) {
      if (window.zomfy.placeCheck('holzlager', i, j).ok) return window.zomfy.build('holzlager', i, j);
    }
    return 'kein Platz';
  });
  await z(() => {
    window.zomfy.setDay(window.zomfy.state().time.day + 1);
    const it = window.zomfy.game.world.interactions.find((i) => i.use === 'ernten' && window.zomfy.buildings().find((b) => b.id === i.building)?.type === 'holzlager');
    window.zomfy.teleport(it.x, it.z + 1.0, Math.PI);
  });
  await settle(page, 20);
  const holzVor = (await state()).inventory.holz;
  await page.keyboard.press('KeyE');
  // Die Scheite fliegen erst zu Mika – warten, bis sie da sind (langsame Bilder im Headless)
  let holzNach = holzVor;
  for (let k = 0; k < 40 && holzNach < holzVor + 2; k++) {
    await settle(page, 8);
    holzNach = (await state()).inventory.holz;
  }
  if (holzlager === 'ok' && holzNach === holzVor + 2) note(`✓ Holzlager: gebaut, am nächsten Tag gibt E 2 Holz (${holzVor} → ${holzNach})`);
  else fail(`Holzlager: ${JSON.stringify({ holzlager, holzVor, holzNach })}`);
  checkMessages(session);
  await session.context.close();

  // Speichern und Laden der Bauten, Migration eines alten Spielstands
  const saveUrl = `${url}index.html?test`;
  const one = await openGame(browser, saveUrl, 'Bauten speichern', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m2')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m2', '1');
      }
    },
  });
  await one.page.evaluate(() => {
    window.zomfy.setHorde(false);
    window.zomfy.give({ holz: 20, stein: 5, schrott: 45, zahnraeder: 1 });
    window.zomfy.build('werkbank', 3, 5);
    const col = window.zomfy.pathColumn(-11);
    window.zomfy.build('barrikade', -11, col[1], 1);
    window.zomfy.build('bolzen', -7, -4);
    window.zomfy.finishDialog();
    const turm = window.zomfy.buildings().find((b) => b.type === 'bolzen');
    window.zomfy.upgradeTower(turm.id, 2);
    window.zomfy.upgradeTower(turm.id, 3, 'B');
    window.zomfy.teleport(4.5, 2.0, 0);
  });
  await one.page.reload();
  await one.page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await one.page.evaluate(() => window.zomfy.buildings());
  const turmGeladen = geladen.find((b) => b.type === 'bolzen');
  if (geladen.length === 3 && geladen.some((b) => b.type === 'werkbank' && b.i === 3 && b.j === 5) && turmGeladen?.level === 3 && turmGeladen?.spec === 'B') note('✓ Laden: Bauten und Turm (Stufe 3, Spezialisierung B) stehen nach dem Neuladen wieder da');
  else fail(`Laden: Bauten nach dem Neuladen ${JSON.stringify(geladen)}`);
  checkMessages(one);
  await one.context.close();

  const old = await openGame(browser, saveUrl, 'Alter Spielstand (v1)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-v1')) {
        localStorage.setItem(
          'zomfy-towers.spielstand',
          JSON.stringify({
            version: 1,
            time: { day: 3, minute: 200 },
            player: { x: 1, z: 2, facing: 0, lantern: true },
            inventory: { holz: 7, stein: 2, fasern: 3, schrott: 1, stoff: 1, technik: 2 },
            hotbar: { slots: ['laterne', null, null, null, null, null, null, null], selected: 0 },
            flags: { radioGehoert: true },
            stats: { nightsSlept: 2 },
          })
        );
        sessionStorage.setItem('zomfy-v1', '1');
      }
    },
  });
  const migriert = await old.page.evaluate(() => window.zomfy.state());
  if (migriert.version === 10 && migriert.time.day === 3 && migriert.inventory.zahnraeder === 2 && !migriert.hotbar.slots.includes('laterne') && migriert.world.houseLevel === 1 && migriert.world.homeHp === 300) {
    note('✓ Migration: Spielstand v1 wird zu v10 (Technik -> Zahnräder, Laterne auf F, Zuhause 300)');
  } else fail(`Migration: ${JSON.stringify(migriert)}`);
  checkMessages(old);
  await old.context.close();

  const v2 = await openGame(browser, saveUrl, 'Alter Spielstand (v2)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-v2')) {
        localStorage.setItem(
          'zomfy-towers.spielstand',
          JSON.stringify({
            version: 2,
            time: { day: 4, minute: 300 },
            player: { x: 2, z: 3, facing: 0, lantern: false },
            inventory: { holz: 12, stein: 4, fasern: 2, schrott: 9, stoff: 1, zahnraeder: 1 },
            tools: { axt: true, spitzhacke: false },
            hotbar: { slots: ['axt', null, null, null, null, null, null, null], selected: 0 },
            world: { houseLevel: 1, buildings: [{ id: 1, type: 'barrikade', i: 6, j: 2, turns: 0 }], nodes: {} },
            flags: { introGesehen: true },
            stats: { nightsSlept: 3 },
          })
        );
        sessionStorage.setItem('zomfy-v2', '1');
      }
    },
  });
  const v3 = await v2.page.evaluate(() => window.zomfy.state());
  if (v3.version === 10 && v3.time.day === 4 && v3.player.hp === 100 && v3.player.level === 1 && v3.world.homeHp === 300 && v3.world.buildings.length === 0 && v3.inventory.holz === 15 && v3.inventory.schrott === 9) {
    note('✓ Migration: Spielstand v2 wird zu v10 (Leben, Zuhause, Stufe 1; die alte Barrikade gibt es als Holz zurück)');
  } else fail(`Migration v2: ${JSON.stringify(v3)}`);
  checkMessages(v2);
  await v2.context.close();
}

/**
 * Meilenstein 9: die Bucht und die Wege. Drei Spawns am linken Rand, deren
 * Wege vor dem Hof zusammenlaufen; die Horde bleibt auf den Wegen; Barrikaden
 * quer über den Weg halten sie auf und zerbrechen zu Trümmern, die sich
 * tagsüber wieder aufbauen und ausbauen lassen; Überreste halten drei Tage;
 * tagsüber nur einzelne Schlurfer; die Übersichtskarte (M); Speichern v10 mit
 * dem Startwert der Karte und Migration v7 → v8. Feste Simulationsschritte.
 */
async function runPathChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave&playtest`, 'Bucht und Wege');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const view = () => z(() => window.zomfyView());
  const state = () => z(() => window.zomfy.state());
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setTime(9, 0);
    window.zomfy.give({ holz: 80, schrott: 40 });
  });
  await step(100);

  // Karte: drei Spawns am linken Rand, jeder Weg führt bis ans Zuhause
  const karte = await z(() => ({ info: window.zomfy.mapInfo(), traces: window.zomfy.traces() }));
  const spawnsLinks = karte.info.spawns.length === 3 && karte.info.spawns.every((s) => s.x < -50);
  const alleAmHaus = karte.traces.length === 3 && karte.traces.every((t) => t.reach < 1e8 && t.x > 3);
  if (spawnsLinks && alleAmHaus) note(`✓ Karte: Startwert ${karte.info.seed} (${karte.info.topology}), drei Spawns links, Wege ${karte.info.paths.join(', ')} – alle laufen bis ans Zuhause`);
  else fail(`Karte: ${JSON.stringify(karte)}`);
  await z(() => window.zomfy.teleport(-21, 1.0, 0.3));
  await step(900);
  await page.screenshot({ path: join(SHOTS, 'wege.png'), timeout: 180000 });
  note('  Screenshot: screenshots/wege.png');

  // Die Horde bleibt auf den Wegen (Mika steht weit weg auf dem Steg)
  await z(() => {
    window.zomfy.teleport(15, -1, 0);
    window.zomfy.spawnAtEntry('schlurfer', 'mitte', 2);
    window.zomfy.spawnAtEntry('flitzer', 'nord', 1);
    window.zomfy.spawnAtEntry('schlurfer', 'sued', 1);
  });
  let abseits = 0;
  let naechster = 99;
  for (let k = 0; k < 30; k++) {
    await step(1000);
    const r = await z(() => {
      const zs = window.zomfy.zombies().filter((q) => q.state === 'walk');
      return { off: zs.filter((q) => !window.zomfy.onPathOrYard(q.x, q.z)).length, x: Math.max(-99, ...zs.map((q) => q.x)) };
    });
    abseits += r.off;
    naechster = Math.max(-99, r.x);
  }
  if (abseits === 0 && naechster > -40) note(`✓ Horde: bleibt auf den Wegen (nach 30 s vorn bei x ${naechster.toFixed(1)}, kein Schritt abseits)`);
  else fail(`Horde abseits: ${abseits} Schritte abseits, vorderster bei x ${naechster}`);
  await z(() => window.zomfy.killAllZombies());
  await step(1500);

  // Barrikaden quer über den letzten Abschnitt: Die Horde bleibt hängen und schlägt ein
  const reihe = await z(() => {
    const col = window.zomfy.pathColumn(-14);
    const ids = [];
    for (const j of col) {
      if (window.zomfy.build('barrikade', -14, j, 1) === 'ok') ids.push(window.zomfy.buildings().find((b) => b.i === -14 && b.j === j).id);
    }
    const mid = window.zomfy.pathColumn(-19);
    return { col, ids, traces: window.zomfy.traces(), start: mid[Math.floor(mid.length / 2)] };
  });
  const durch = reihe.traces.every((t) => t.reach < 1e8);
  await z((j) => {
    window.zomfy.teleport(-11, j + 5.5, 3.1); // weit genug weg, dass niemand Mika jagt
    window.zomfy.spawnZombie('brummer', -19, j + 0.5);
    window.zomfy.spawnZombie('schlurfer', -20, j - 0.5);
  }, reihe.start);
  let schlaegt = false;
  let bild = false;
  let zerbrochen = null;
  for (let k = 0; k < 40 && !zerbrochen; k++) {
    await step(1000);
    const r = await z(() => ({ zs: window.zomfy.zombies(), bs: window.zomfy.buildings().filter((b) => b.type === 'barrikade') }));
    if (r.zs.some((q) => q.state === 'smash')) schlaegt = true;
    if (schlaegt && !bild) {
      bild = true;
      await step(400);
      await page.screenshot({ path: join(SHOTS, 'barrikaden.png'), timeout: 180000 });
      note('  Screenshot: screenshots/barrikaden.png');
    }
    zerbrochen = r.bs.find((b) => b.broken) || null;
  }
  await step(4000);
  const danach = await z(() => window.zomfy.zombies().map((q) => ({ x: q.x, state: q.state })));
  if (reihe.ids.length >= 3 && durch && schlaegt && zerbrochen && danach.some((q) => q.x > -13.5)) note(`✓ Barrikaden: ${reihe.ids.length} quer über den Weg – die Horde schlägt ein, eine zerbricht zu Trümmern, die Schlurfer ziehen weiter`);
  else fail(`Barrikaden: ${JSON.stringify({ ids: reihe.ids, durch, schlaegt, zerbrochen, danach })}`);
  await z(() => window.zomfy.killAllZombies());
  await step(1500);

  // Tagsüber: Trümmer wieder aufbauen, ausbauen bis Metall, Schaden sichtbar, flicken
  const aufbau = await z((id) => {
    const holz = window.zomfy.state().inventory.holz;
    window.zomfy.rebuildBarricade(id);
    const b1 = window.zomfy.buildings().find((b) => b.id === id);
    const kosten = holz - window.zomfy.state().inventory.holz;
    window.zomfy.give({ holz: 20, schrott: 20 });
    window.zomfy.upgradeBarricade(id);
    window.zomfy.upgradeBarricade(id);
    const b3 = window.zomfy.buildings().find((b) => b.id === id);
    const treffer = window.zomfy.hitBarricade(id, 100);
    window.zomfy.rebuildBarricade(id);
    const geflickt = window.zomfy.buildings().find((b) => b.id === id);
    return { kosten, b1, b3, treffer, geflickt };
  }, zerbrochen?.id);
  if (aufbau.kosten === 1 && !aufbau.b1?.broken && aufbau.b3?.level === 3 && aufbau.treffer?.look === 'kaputt' && Math.round(aufbau.treffer.hp) === 65 && aufbau.geflickt?.hp === undefined) {
    note('✓ Barrikaden: Trümmer für 1 Holz wieder aufgebaut, ausgebaut bis zum Metallkreuz (fängt ein Viertel ab), Schaden sichtbar, geflickt');
  } else fail(`Barrikaden am Tag: ${JSON.stringify(aufbau)}`);

  // Überreste halten drei Tage (auch über das Schlafen hinweg)
  const liegen = await z(() => {
    window.zomfy.dropLoot(-2, 6, 3);
    window.zomfy.teleport(15, -1, 0);
    return window.zomfy.state().time.day;
  });
  await step(1500);
  const vorher = (await z(() => window.zomfy.lootDetails())).length;
  await z((d) => window.zomfy.setDay(d + 2), liegen);
  await step(300);
  const nachZwei = (await z(() => window.zomfy.lootDetails())).length;
  await z((d) => {
    window.zomfy.setDay(d + 3);
    window.zomfy.setTime(23, 0); // später als beim Fallenlassen: drei volle Tage vorbei
  }, liegen);
  await step(300);
  const nachDrei = (await z(() => window.zomfy.lootDetails())).length;
  if (vorher >= 3 && nachZwei === vorher && nachDrei === 0) note(`✓ Überreste: ${vorher} Zombieteile liegen nach zwei Tagen noch, nach drei Tagen sind sie verrottet`);
  else fail(`Überreste: ${JSON.stringify({ vorher, nachZwei, nachDrei })}`);

  // Zombieteile (M9.1): selbst erschlagen – immer; durch Türme etwa jedes zweite Mal; der Anführer immer
  const beute = await z(() => {
    window.zomfy.teleport(15, -1, 0); // Mika auf dem Steg, weit weg vom Magneten
    // Die Abschüsse bringen Erfahrung – danach wie vorher (sonst öffnet sich mittendrin eine Perk-Wahl)
    const st = window.zomfy.game.state;
    const vorher = { xp: st.player.xp, level: st.player.level, choice: st.perkChoice, kills: st.stats.kills };
    const run = (type, source, n) => {
      let mit = 0;
      for (let k = 0; k < n; k++) {
        window.zomfy.game.loot.clear();
        const id = window.zomfy.spawnZombie(type, -20, 0.5);
        window.zomfy.killZombie(id, source);
        if (window.zomfy.lootItems().some((l) => l.res === 'teile')) mit++;
      }
      window.zomfy.game.loot.clear();
      return mit;
    };
    const out = { hand: run('schlurfer', 'spieler', 12), turm: run('schlurfer', 'turm', 40), anfuehrer: run('anfuehrer', 'turm', 3) };
    Object.assign(st.player, { xp: vorher.xp, level: vorher.level });
    st.perkChoice = vorher.choice;
    st.stats.kills = vorher.kills;
    return out;
  });
  await z(() => window.zomfy.killAllZombies());
  await step(500);
  if (beute.hand === 12 && beute.turm >= 10 && beute.turm <= 30 && beute.anfuehrer === 3) note(`✓ Zombieteile: selbst erschlagen 12 von 12, durch Türme ${beute.turm} von 40, Anführer 3 von 3`);
  else fail(`Zombieteile: ${JSON.stringify(beute)}`);

  // Tagsüber nur einzelne Schlurfer – keine Trupps
  const tage = await z(async () => {
    const { planDay } = await import('/src/data/waves.js');
    const out = [];
    for (let d = 1; d <= 10; d++) out.push(planDay(d, 1234, ['nord', 'mitte', 'sued']).map((e) => e.count));
    return out;
  });
  if (tage.every((d) => d.length <= 3 && d.every((n) => n === 1))) note(`✓ Tag: nur einzelne Schlurfer (${tage.map((d) => d.length).join(', ')} je Tag)`);
  else fail(`Tagesschlurfer: ${JSON.stringify(tage)}`);

  // Übersichtskarte mit M: öffnet, zeigt die Wege, M schließt
  await page.keyboard.press('KeyM');
  await step(300);
  const offen = await z(() => window.zomfy.mode);
  await page.screenshot({ path: join(SHOTS, 'karte.png'), timeout: 180000 });
  note('  Screenshot: screenshots/karte.png');
  await page.keyboard.press('KeyM');
  await step(300);
  const zu = await z(() => window.zomfy.mode);
  if (offen === 'karte' && zu === 'play') note('✓ Karte: M öffnet die Übersicht der Wege, M schließt sie');
  else fail(`Karte: offen ${offen}, danach ${zu}`);
  checkMessages(session);
  await session.context.close();

  // Speichern v10: Der Startwert der Karte liegt im Spielstand und gilt nach dem Laden
  const eins = await openGame(browser, `${url}index.html?test&map=123`, 'Karte speichern', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m9')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m9', '1');
      }
    },
  });
  const vorLaden = await eins.page.evaluate(() => {
    window.zomfy.save();
    return window.zomfy.mapInfo();
  });
  checkMessages(eins);
  await eins.page.close(); // die zweite Seite lädt sonst neben der ersten sehr langsam
  const zwei = await eins.context.newPage();
  const meldungen = [];
  zwei.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && meldungen.push(m.text()));
  zwei.on('pageerror', (e) => meldungen.push(e.message));
  await zwei.goto(`${url}index.html?test`, { timeout: 180000 });
  await zwei.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const nachLaden = await zwei.evaluate(() => ({ info: window.zomfy.mapInfo(), v: window.zomfy.state().version, seed: window.zomfy.state().world.mapSeed }));
  if (vorLaden.seed === 123 && nachLaden.seed === 123 && nachLaden.info.seed === 123 && nachLaden.v === 10 && JSON.stringify(nachLaden.info.merge) === JSON.stringify(vorLaden.merge)) note('✓ Speichern v10: Startwert der Karte im Spielstand – nach dem Laden dasselbe Wegenetz');
  else fail(`Speichern v10: ${JSON.stringify({ vorLaden, nachLaden })}`);
  if (meldungen.length) fail(`Karte laden: Konsolenmeldungen ${meldungen.join(' | ')}`);
  await eins.context.close();

  // Migration v7 -> v8: Türme und Barrikaden gibt es zurück, Werkbank und Zelt ziehen in die Bucht
  const alt = await openGame(browser, `${url}index.html?test`, 'Alter Spielstand (v7)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-v7')) {
        localStorage.setItem(
          'zomfy-towers.spielstand',
          JSON.stringify({
            version: 7,
            time: { day: 5, minute: 200 },
            player: { x: 1, z: 2, hp: 90, name: 'Kira' },
            inventory: { holz: 5, schrott: 12, teile: 7 },
            world: {
              houseLevel: 1,
              homeHp: 300,
              buildings: [
                { id: 1, type: 'bolzen', i: 3, j: 4, turns: 0, level: 2 },
                { id: 2, type: 'barrikade', i: 0, j: 5, turns: 0 },
                { id: 3, type: 'werkbank', i: -3, j: -3, turns: 0 },
                { id: 4, type: 'zelt', i: 5, j: 5, turns: 0 },
              ],
              searched: { auto: 2 },
              trader: { day: 0, sold: {} },
              tower: 1,
            },
            survivors: { hilde: { stage: 3, day: 3, tent: 4, errand: 2 } },
            flags: { introGesehen: true, autoLeer: true },
          })
        );
        sessionStorage.setItem('zomfy-v7', '1');
      }
    },
  });
  const m = await alt.page.evaluate(() => ({ st: window.zomfy.state(), meldungen: window.zomfyView().meldungen || [] }));
  const typen = m.st.world.buildings.map((b) => b.type).sort().join(',');
  const zelt = m.st.world.buildings.find((b) => b.type === 'zelt');
  if (m.st.version === 10 && Number.isFinite(m.st.world.mapSeed) && typen === 'werkbank,zelt' && zelt?.id === 4 && m.st.survivors.hilde.tent === 4 && m.st.inventory.holz >= 8 && m.st.inventory.schrott > 12 && m.st.inventory.teile === 7 && m.st.flags.wrackLeer && Math.hypot(m.st.player.x - 5.5, m.st.player.z + 3) < 1 && m.meldungen.some((t) => t.startsWith('Neue Karte'))) {
    note(`✓ Migration: v7 wird zu v10 – neue Karte (${m.st.world.mapSeed}), Turm und Barrikade erstattet (Holz ${m.st.inventory.holz}, Schrott ${m.st.inventory.schrott}), Werkbank und Hildes Zelt in der Bucht neu aufgestellt`);
  } else fail(`Migration v7: ${JSON.stringify({ v: m.st.version, seed: m.st.world.mapSeed, typen, zelt, hilde: m.st.survivors.hilde, inv: m.st.inventory, flags: m.st.flags, p: m.st.player, meldungen: m.meldungen })}`);
  checkMessages(alt);
  await alt.context.close();
}

/**
 * Meilenstein 3: Türme, Horde, Loot, Nacht und Morgenbericht. Läuft in festen
 * Simulationsschritten (Playtest-Brücke), damit das Ergebnis nicht von der
 * Rechengeschwindigkeit abhängt.
 */
async function runNightChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave&playtest`, 'Nächte und Türme');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const state = () => z(() => window.zomfy.state());
  // Stufenaufstiege (Meilenstein 4) öffnen die Perk-Wahl und halten das Spiel an:
  // unterwegs einfach die erste Karte nehmen
  const step = async (ms) => {
    await z((t) => window.__zomfyStep(t), ms);
    await z(() => {
      const choice = window.zomfy.state().perkChoice;
      if (window.zomfy.mode === 'perk' && choice) window.zomfy.choosePerk(choice[0]);
    });
  };
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis']) window.zomfy.setFlag(f);
    window.zomfy.setTime(9, 0);
    window.zomfy.teleport(0, 1.5, 0);
    window.zomfy.give({ schrott: 60, zahnraeder: 2, holz: 10 });
  });
  await step(100);

  // Tagsüber nagen Schlurfer das Zuhause höchstens bis auf drei Viertel an (m5-r1)
  await z(() => {
    window.zomfy.setHomeHp(235);
    window.zomfy.spawnZombie('brummer', 6.0, -4.2);
  });
  await step(8000);
  const tagHp = (await state()).world.homeHp;
  await z(() => {
    window.zomfy.setHorde(false); // räumt ohne Abschuss und Loot ab
    window.zomfy.setHorde(true);
    window.zomfy.setHomeHp(300);
    window.zomfy.teleport(0, 1.5, 0);
  });
  await step(1500);
  if (tagHp >= 225 && tagHp < 235) note(`✓ Tagsüber: Schlurfer nagen das Zuhause höchstens bis auf drei Viertel an (${Math.round(tagHp)}/300)`);
  else fail(`Tagsüber: Zuhause ${tagHp}/300 (erwartet 225 bis 234)`);

  // Eine Stunde vor der Horde: Steht am Weg der ersten Welle kein Turm, sagt es Mika (m7-r1)
  await z(() => window.zomfy.setTime(19, 45));
  await step(600);
  const warnung = (await z(() => window.zomfyView())).gedanke || '';
  await z(() => window.zomfy.setTime(9, 0));
  await step(100);
  if (warnung.includes('kein Turm')) note(`✓ Abends: Warnung vor dem Weg ohne Turm („${warnung}“)`);
  else fail(`Abends: keine Warnung vor dem Weg ohne Turm (Gedanke: ${warnung || '–'})`);

  // Turm mit der Tastatur: Q wählt den Bolzenwerfer, E setzt ihn vor die Figur
  await page.keyboard.press('KeyQ');
  await step(100);
  const plan = await z(() => window.zomfy.placement);
  await page.keyboard.press('KeyE');
  await step(100);
  await z(() => window.zomfy.finishDialog());
  const turm = (await z(() => window.zomfy.buildings())).find((b) => b.type === 'bolzen');
  if (plan?.type === 'bolzen' && turm) note(`✓ Türme: Q wählt den Bolzenwerfer, E setzt ihn (Feld ${turm.i}, ${turm.j})`);
  else fail(`Türme: kein Bolzenwerfer gebaut (Plan ${JSON.stringify(plan)})`);
  const musikTag = await z(() => window.zomfy.sound()); // M10d: nach der ersten Taste läuft tagsüber das ruhige Stück

  // Ein Bau, der der Horde den letzten Weg zum Haus abschneidet, wird abgelehnt
  // (M9: nur noch im Hof möglich – Barrikaden schneiden nie ab, die Horde schlägt sich durch)
  const weg = await z(() => {
    const cells = [];
    for (let j = -7; j < 9; j++) cells.push([-6, j]);
    return window.zomfy.pathBlocked(cells);
  });
  if (weg === true) note('✓ Wege: Ein Bau, der den Hof vom Weg abschneiden würde, wird abgelehnt');
  else fail(`Wege: Querriegel im Hof ergab ${weg} statt true`);

  // Der Turm erledigt einen Schlurfer, der Loot fallen lässt
  if (turm) {
    // Mika geht aus dem Sammelradius, sonst fliegt das Loot sofort heran.
    // Turm-Abschüsse lassen nur jedes zweite Mal Teile (M9.1) – hier sicher, die Regel prüft `wege`
    await z((t) => {
      window.zomfy.setPartsChance(1);
      window.zomfy.teleport(t.i + 4, t.j + 0.5, 0);
      window.zomfy.spawnZombie('schlurfer', t.i - 3.5, t.j + 0.5);
    }, turm);
    let kills = 0;
    for (let k = 0; k < 24 && !kills; k++) {
      await step(500);
      kills = (await state()).stats.kills || 0;
    }
    const loot = await z(() => window.zomfy.lootItems());
    await z(() => window.zomfy.setPartsChance(null));
    if (kills === 1 && loot.length) note(`✓ Türme: Bolzenwerfer erledigt einen Schlurfer, Loot liegt am Boden (${loot.map((l) => l.res).join(', ')})`);
    else fail(`Türme: ${kills} Abschüsse, ${loot.length} Loot`);

    // Liegt die Beute außerhalb des Bildes, zeigt eine Raute am Rand hin
    await z((l) => window.zomfy.teleport(l.x + 13, l.z, 0), loot[0] || { x: 0, z: 0 });
    await step(300);
    const marken = (await z(() => window.zomfyView())).randMarken || [];
    if (marken.some((m) => m.startsWith('beute'))) note(`✓ Loot: außerhalb des Bildes zeigt eine Randmarke hin (${marken.join(', ')})`);
    else fail(`Loot: keine Randmarke (${JSON.stringify(marken)})`);

    // Einsammeln: hinlaufen reicht, der Magnet zieht es heran
    // Meilenstein 8: Schlurfer lassen Zombieteile fallen (Schrott gibt es bei Balduin)
    const vorher = (await state()).inventory.teile || 0;
    if (loot.length) await z((l) => window.zomfy.teleport(l.x + 0.8, l.z, 0), loot[0]);
    await step(2000);
    const nachher = (await state()).inventory.teile || 0;
    const liegt = (await z(() => window.zomfy.lootItems())).length;
    if (nachher > vorher && liegt < loot.length) note(`✓ Loot: Zombieteile im Sammelradius eingesammelt (${vorher} → ${nachher})`);
    else fail(`Loot: nicht eingesammelt (Zombieteile ${vorher} → ${nachher}, liegt noch ${liegt})`);

    // Ausbauen über die Auswahl: Q fragt nach, zweites Q kauft Stufe 2 – dann dasselbe für Spezialisierung A
    await z((id) => window.zomfy.selectBuilding(id), turm.id);
    await step(100);
    await page.keyboard.press('KeyQ');
    await step(100);
    const nachEinemQ = (await z(() => window.zomfy.buildings())).find((b) => b.id === turm.id)?.level;
    await page.keyboard.press('KeyQ');
    await step(600);
    await page.keyboard.press('KeyQ');
    await step(100);
    await page.keyboard.press('KeyQ');
    await step(100);
    const aus = (await z(() => window.zomfy.buildings())).find((b) => b.id === turm.id);
    if (nachEinemQ === 1 && aus?.level === 3 && aus?.spec === 'A') note('✓ Ausbau: ein Q fragt nach, zweimal Q kauft – Stufe 2, dann Spezialisierung A');
    else fail(`Ausbau: nach einem Q Stufe ${nachEinemQ}, danach ${JSON.stringify(aus)}`);

    // Abreißen liegt auf V: ein gewohntes R (sonst Katapult) reißt nie einen Turm ab
    for (const key of ['KeyR', 'KeyR', 'KeyV']) {
      await page.keyboard.press(key);
      await step(100);
    }
    const stehtNoch = (await z(() => window.zomfy.buildings())).some((b) => b.id === turm.id);
    const rueckfrage = ((await z(() => window.zomfyView())).meldungen || []).some((m) => m.startsWith('Nochmal'));
    if (stehtNoch && rueckfrage) note('✓ Auswahl: R reißt nichts ab, Abreißen liegt auf V (mit Rückfrage)');
    else fail(`Auswahl: Turm steht noch ${stehtNoch}, Rückfrage ${rueckfrage}`);
    await page.keyboard.press('Escape');
    await step(100);
  }

  // Wegvorschau beim Turmbau als Bild
  await z(() => window.zomfy.teleport(-3.0, -2.5, 0));
  await page.keyboard.press('KeyQ');
  await step(600);
  await page.screenshot({ path: join(SHOTS, 'turm-bauen.png') });
  note('  Screenshot: screenshots/turm-bauen.png');
  await page.keyboard.press('Escape');
  await step(100);

  // Nacht 1: drei Türme ums Haus, die Horde kommt um 20:30 in Wellen
  const staffel = await z(() => {
    const vor = window.zomfy.state().inventory.schrott;
    window.zomfy.build('bolzen', 3, -5);
    const zweiter = vor - window.zomfy.state().inventory.schrott;
    window.zomfy.build('bolzen', 10, -4);
    window.zomfy.teleport(0.5, 1.0, 0);
    window.zomfy.setTime(20, 25);
    return zweiter;
  });
  if (staffel === 10) note('✓ Staffelpreis: der zweite Bolzenwerfer kostet 10 statt 8 Schrott');
  else fail(`Staffelpreis: zweiter Bolzenwerfer kostete ${staffel}`);
  await step(6000);
  const n1 = await z(() => window.zomfy.nightState());
  if (n1.night.n === 1 && n1.night.wave >= 1 && n1.alive + n1.queue > 0) note(`✓ Nacht: um 20:30 kommt Welle 1 (${n1.alive + n1.queue} Schlurfer)`);
  else fail(`Nacht: Welle 1 kam nicht (${JSON.stringify(n1)})`);
  const richtung = (await z(() => window.zomfyView())).nacht?.richtung || '';
  if (richtung.startsWith('Aus: ')) note(`✓ Nachtleiste: zeigt, woher die Welle kommt („${richtung}“)`);
  else fail(`Nachtleiste: keine Richtung („${richtung}“)`);
  const repWelle = await z(() => {
    const hp = window.zomfy.state().world.homeHp;
    window.zomfy.setHomeHp(250);
    const o = window.zomfy.buildOptions().find((x) => x.id === 'reparieren');
    window.zomfy.repairAll();
    const nach = window.zomfy.state().world.homeHp;
    window.zomfy.setHomeHp(hp);
    return { disabled: o?.disabled, nach };
  });
  if (repWelle.disabled && repWelle.nach === 250) note('✓ Reparieren: mitten in der Welle gesperrt');
  else fail(`Reparieren in der Welle: ${JSON.stringify(repWelle)}`);
  // Bild: ein Trupp kommt den letzten Wegabschnitt herauf in den Hof, den Türmen vor die Bolzen
  await z(() => {
    for (let k = 0; k < 5; k++) window.zomfy.spawnZombie(k === 2 ? 'brummer' : 'schlurfer', -7.5 + k * 1.1, 0.8 + (k % 2) * 1.0);
  });
  await step(2200);
  await page.screenshot({ path: join(SHOTS, 'horde.png') });
  note('  Screenshot: screenshots/horde.png');
  let nacht = n1;
  for (let k = 0; k < 60 && !nacht.night.done; k++) {
    await step(5000);
    nacht = await z(() => window.zomfy.nightState());
  }
  const home = (await state()).world.homeHp;
  if (nacht.night.done && nacht.night.won) note(`✓ Nacht 1 überstanden: ${nacht.night.kills} Schlurfer besiegt, Zuhause ${home}/300`);
  else fail(`Nacht 1: nicht geschafft (${JSON.stringify(nacht)}, Zuhause ${home})`);

  // Nach der Nacht: Reparieren geht wieder – reicht der Vorrat nicht, dann anteilig
  const teil = await z(() => {
    const s = window.zomfy.state();
    window.zomfy.setHomeHp(100);
    window.zomfy.give({ holz: 2 - (s.inventory.holz || 0), schrott: 10 - (s.inventory.schrott || 0) });
    window.zomfy.repairAll();
    const n = window.zomfy.state();
    return { hp: n.world.homeHp, holz: n.inventory.holz };
  });
  if (teil.hp > 100 && teil.hp < 300 && teil.holz === 0) note(`✓ Reparieren: Vorrat reicht nur teilweise – Zuhause 100 → ${Math.round(teil.hp)}`);
  else fail(`Teilreparatur: ${JSON.stringify(teil)}`);

  // Schlafen, Morgenbericht, weiter mit E
  await z(() => window.zomfy.interact('bett'));
  for (let k = 0; k < 20 && (await z(() => window.zomfy.mode)) === 'sleep'; k++) await step(1000);
  const view = await z(() => window.zomfyView());
  if (view.modus === 'report' && view.bericht?.length) note(`✓ Morgenbericht: ${view.bericht[0]}`);
  else fail(`Morgenbericht fehlt (Modus ${view.modus})`);
  await step(600);
  await page.screenshot({ path: join(SHOTS, 'bericht.png') });
  note('  Screenshot: screenshots/bericht.png');
  await page.keyboard.press('KeyE');
  await step(200);
  if ((await z(() => window.zomfy.mode)) === 'play') note('✓ Morgenbericht: E schließt ihn');
  else fail('Morgenbericht: E schließt ihn nicht');

  // Nacht 2 verloren: kostet Material, nie den Spielstand
  await z(() => {
    window.zomfy.setTime(20, 28);
    window.zomfy.teleport(6, 4, 0);
  });
  // In kleinen Schritten: Eine offene Perk-Wahl geht erst in Ruhe auf (m12-r1) und hält das Spiel an
  for (let k = 0; k < 6; k++) await step(500);
  const musikNacht = await z(() => window.zomfy.sound()); // M10d: während der Welle das treibende Stück
  await z(() => {
    window.zomfy.setHomeHp(3);
    window.zomfy.spawnZombie('brummer', 5.5, -4.3);
    window.zomfy.spawnZombie('brummer', 8.5, -4.3);
  });
  for (let k = 0; k < 30; k++) {
    await step(1000);
    const m = await z(() => window.zomfy.mode);
    if (m === 'report') break;
  }
  const verloren = await state();
  const bericht2 = (await z(() => window.zomfyView())).bericht || [];
  // Was die Niederlage kostet, steht im Bericht (der Vorrat selbst kann durch Loot derselben Nacht wachsen)
  const verlustZeile = bericht2.find((l) => l.startsWith('Verloren:')) || '';
  if (verloren.stats.nightsLost === 1 && verloren.time.day === 3 && /Schrott/.test(verlustZeile) && verloren.world.homeHp > 0) {
    note(`✓ Verlorene Nacht: ${verlustZeile.replace('Verloren: ', '')} weg, Zuhause wieder ${verloren.world.homeHp}, Tag 3 beginnt (${bericht2[0]})`);
  } else fail(`Verlorene Nacht: ${JSON.stringify({ lost: verloren.stats.nightsLost, day: verloren.time.day, home: verloren.world.homeHp, bericht2 })}`);

  // Soundtrack (M10d): tagsüber gemütlich, bei der Welle treibend; jedes Stück ohne
  // Lautsprecher berechnet – keine Übersteuerung, keine kaputten Samples, nicht stumm
  const pegel = {};
  for (const [id, threat] of [['tag', 0], ['abend', 0], ['nacht', 2]]) pegel[id] = await z(([id, threat]) => window.zomfy.renderMusic(id, 8, threat), [id, threat]);
  const pegelOk = Object.values(pegel).every((p) => p.bad === 0 && p.peak < 0.95 && p.rms > 0.01);
  if (musikTag.music === 'tag' && musikNacht.music === 'nacht' && pegelOk) {
    note(`✓ Musik: tagsüber »Morgen am See«, während der Welle »Die Horde kommt«; Spitzen ${Object.entries(pegel).map(([id, p]) => `${id} ${p.peak.toFixed(2)}`).join(', ')}`);
  } else fail(`Musik: ${JSON.stringify({ tag: musikTag, nacht: musikNacht, pegel })}`);
  checkMessages(session);
  await session.context.close();
}

/**
 * Meilenstein 4: Waffen, Treffer, Betäubung, Ausweichrolle, Erfahrung,
 * Perk-Wahl, Waffen-Aufwertung und Speichern (feste Simulationsschritte).
 */
/**
 * Meilenstein 6: Ankunft, Kennenlernen mit echten Tasten, Zelt und Einzug,
 * Tauschen, Morgengaben, Einrichten mit Gemütlichkeit, Funkturm bis zum
 * Leuchtfeuer, Knopf bellt vor der Welle, Speichern/Laden und Migration v4 → v5.
 */
async function runSurvivorChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Überlebende', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m6')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m6', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const view = () => z(() => window.zomfyView());
  const press = async (key, ms = 60) => {
    await page.keyboard.press(key);
    await step(ms);
  };
  /** Dialog mit E durchblättern, bis Antworten stehen (oder er zu ist). */
  const toAnswers = async () => {
    for (let k = 0; k < 12; k++) {
      const d = (await view()).dialog;
      if (!d) return null;
      if (d.fertigGetippt && d.antworten.length) return d.antworten;
      await press('KeyE', 350);
    }
    return null;
  };
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setTime(10, 0);
    window.zomfy.give({ holz: 40, stein: 10, schrott: 40, fasern: 20, stoff: 20 });
  });
  await step(100);

  // Tag 1: noch niemand da, kein Reiter »Einrichten«
  const tag1 = await z(() => window.zomfy.survivors());
  if (Object.values(tag1).every((s) => s.stage === 0)) note('✓ Überlebende: an Tag 1 ist noch niemand da');
  else fail(`Überlebende an Tag 1: ${JSON.stringify(tag1)}`);

  // Tag 2: Knopf sitzt am Briefkasten
  await z(() => {
    window.zomfy.setDay(2);
    window.zomfy.arrive();
  });
  await step(200);
  const knopf = await z(() => window.zomfy.npcPos('knopf'));
  if (knopf && knopf.visible && Math.hypot(knopf.x + 5.5, knopf.z - 6.0) < 1) note('✓ Ankunft: an Tag 2 sitzt Knopf am Briefkasten');
  else fail(`Ankunft Knopf: ${JSON.stringify(knopf)}`);

  // Kennenlernen mit echten Tasten: hingehen, E, Antwort »Komm her, Knopf!«
  await z(([x, zz]) => window.zomfy.teleport(x, zz + 1.1, Math.PI), [knopf.x, knopf.z]);
  await step(200);
  const hinweis = (await view()).hinweis;
  await press('KeyE', 300);
  const antworten = await toAnswers();
  await press('KeyW', 100);
  await press('KeyE', 300);
  const knopfStufe = (await z(() => window.zomfy.survivors())).knopf.stage;
  if (hinweis === 'Streicheln' && antworten && antworten[0].includes('Komm her') && knopfStufe === 3) note('✓ Knopf: »E Streicheln«, Antwort »Komm her, Knopf!« – er bleibt');
  else fail(`Knopf: Hinweis ${hinweis}, Antworten ${JSON.stringify(antworten)}, Stufe ${knopfStufe}`);

  // Tag 3: Oma Hilde – ansprechen (Gast), Zelt bauen, einziehen, tauschen
  await z(() => {
    window.zomfy.setDay(3);
    window.zomfy.arrive();
    window.zomfy.talkTo('hilde');
    window.zomfy.finishDialog();
  });
  await step(900);
  const gast = (await z(() => window.zomfy.survivors())).hilde.stage;
  const zelt = await z(() => window.zomfy.build('zelt', -4, 6));
  await z(() => window.zomfy.talkTo('hilde'));
  await step(300);
  const hildeAntworten = await toAnswers();
  const einziehen = (hildeAntworten || []).findIndex((a) => a.includes('Zelt'));
  await z((i) => window.zomfy.answer(i), einziehen);
  await step(200);
  // Kaum eingezogen, bittet Hilde um etwas: Der Auftrag steht im Ziel-Feld
  const bitte = (await view()).dialog?.sprecher || null;
  await z(() => window.zomfy.finishDialog());
  await step(100);
  const hildeZiel = (await view()).ziel || '';
  const hilde = (await z(() => window.zomfy.survivors())).hilde;
  const zeltId = (await z(() => window.zomfy.buildings())).find((b) => b.type === 'zelt')?.id;
  if (gast === 2 && zelt === 'ok' && hilde.stage === 3 && hilde.tent === zeltId) note('✓ Einzug: Hilde ist Gast, nach dem Zeltbau zieht sie ein (Zelt gehört ihr)');
  else fail(`Einzug Hilde: Gast ${gast}, Zelt ${zelt}, jetzt ${JSON.stringify(hilde)} (Zelt ${zeltId})`);
  const vorher = (await z(() => window.zomfy.state())).inventory;
  await z(() => window.zomfy.talkTo('hilde'));
  await step(300);
  const tausch = await toAnswers();
  const tauschIndex = (tausch || []).findIndex((a) => a.includes('Tauschen'));
  await z((i) => window.zomfy.answer(i), tauschIndex);
  await step(200);
  const nachher = (await z(() => window.zomfy.state())).inventory;
  // Tag 3: drittes Angebot der Liste (5 Fasern gegen 1 Stoff)
  if (tauschIndex >= 0 && nachher.fasern === vorher.fasern - 5 && nachher.stoff === vorher.stoff + 1) note('✓ Tauschen: Hildes Angebot des Tages (5 Fasern gegen 1 Stoff)');
  else fail(`Tauschen: Antworten ${JSON.stringify(tausch)}, Fasern ${vorher.fasern} -> ${nachher.fasern}, Stoff ${vorher.stoff} -> ${nachher.stoff}`);

  // Aufträge: Hilde will 8 Fasern für einen Schal (+15 Lebenspunkte)
  const lebenVorher = await z(() => window.zomfy.maxHp());
  await z(() => window.zomfy.give({ fasern: 10 }));
  await z(() => window.zomfy.talkTo('hilde'));
  await step(300);
  const abgabe = await toAnswers();
  const abgabeIndex = (abgabe || []).findIndex((a) => a.includes('Hier, bitte'));
  await z((i) => window.zomfy.answer(i), abgabeIndex);
  await step(200);
  const schal = { auftrag: (await z(() => window.zomfy.survivors())).hilde.errand, leben: await z(() => window.zomfy.maxHp()), ziel: (await view()).ziel || '' };
  if (bitte === 'hilde' && hildeZiel.startsWith('Hilde:') && abgabeIndex >= 0 && schal.auftrag === 2 && schal.leben === lebenVorher + 15 && !schal.ziel.startsWith('Hilde:')) note(`✓ Auftrag: Hilde bittet beim Einzug um 8 Fasern (Ziel-Feld), Abgeben im Gespräch – Schal, ${schal.leben} Lebenspunkte`);
  else fail(`Auftrag Hilde: Sprecher ${bitte}, Ziel „${hildeZiel}“, Antworten ${JSON.stringify(abgabe)}, danach ${JSON.stringify(schal)} (vorher ${lebenVorher})`);

  // Bert: eine Laterne neben seinem Zelt
  await z(() => {
    window.zomfy.setSurvivor('bert', 2);
    window.zomfy.give({ holz: 20, stoff: 6, schrott: 10 });
  });
  let bertZelt = 'kein Platz';
  for (const [i, j] of [[0, 6], [2, 6], [-1, 9], [3, 8]]) {
    bertZelt = await z(([a, b]) => window.zomfy.build('zelt', a, b), [i, j]);
    if (bertZelt === 'ok') break;
  }
  await z(() => window.zomfy.moveIn('bert'));
  await step(200);
  await z(() => window.zomfy.finishDialog());
  const bertVorher = await z(() => ({ e: window.zomfy.survivors().bert.errand, zr: window.zomfy.state().inventory.zahnraeder || 0 }));
  const tent = await z(() => {
    const id = window.zomfy.survivors().bert.tent;
    return window.zomfy.buildings().find((b) => b.id === id) || null;
  });
  let laterne = 'kein Zelt';
  if (tent) {
    for (const [di, dj] of [[2, 0], [-1, 0], [0, 2], [0, -1], [2, 1], [-1, 1]]) {
      laterne = await z(([a, b]) => window.zomfy.build('laternenpfahl', a, b), [tent.i + di, tent.j + dj]);
      if (laterne === 'ok') break;
    }
  }
  await step(1500);
  const bertNachher = await z(() => ({ e: window.zomfy.survivors().bert.errand, zr: window.zomfy.state().inventory.zahnraeder || 0 }));
  if (bertZelt === 'ok' && bertVorher.e === 1 && laterne === 'ok' && bertNachher.e === 2 && bertNachher.zr === bertVorher.zr + 2) note('✓ Auftrag: Bert will Licht am Zelt – Laterne daneben, 2 Zahnräder');
  else fail(`Auftrag Bert: Zelt ${bertZelt}, Laterne ${laterne}, vorher ${JSON.stringify(bertVorher)}, nachher ${JSON.stringify(bertNachher)}`);

  // Einrichten: Reiter mit Tab, Möbel kaufen, Gemütlichkeit
  let titel = null;
  for (let k = 0; k < 4; k++) {
    titel = (await view()).bauleiste?.titel;
    if (titel === 'Einrichten') break;
    await press('Tab', 60);
  }
  const optionen = ((await view()).bauleiste?.optionen || []).map((o) => o.name);
  for (const id of ['bild', 'teekanne', 'wimpel', 'lichterkette', 'stehlampe', 'koerbchen']) await z((i) => window.zomfy.buyFurniture(i), id);
  const cozy = await z(() => window.zomfy.cozy());
  if (titel === 'Einrichten' && optionen.includes('Schlafzelt') && cozy === 8) note(`✓ Einrichten: Reiter mit ${optionen.join(', ')} – Gemütlichkeit ${cozy}`);
  else fail(`Einrichten: Titel ${titel}, Optionen ${JSON.stringify(optionen)}, Gemütlichkeit ${cozy}`);

  // Morgen: Gaben der Eingezogenen und Bonus für Gemütlichkeit
  const xpVorher = (await z(() => window.zomfy.state())).player.xp;
  const morgen = await z(() => window.zomfy.morning());
  const nachMorgen = await z(() => window.zomfy.state());
  const gaben = morgen.some((t) => t.startsWith('Knopf')) && morgen.some((t) => t.startsWith('Oma Hilde')) && morgen.some((t) => t.includes('Ausgeschlafen'));
  if (gaben && nachMorgen.player.xp >= xpVorher + 8 && nachMorgen.player.rested === nachMorgen.time.day) note('✓ Morgen: Knopf und Hilde bringen etwas, Gemütlichkeit gibt Erfahrung und »ausgeschlafen«');
  else fail(`Morgen: ${JSON.stringify(morgen)}, Erfahrung ${xpVorher} -> ${nachMorgen.player.xp}`);

  // Funkturm: Juna, erste Stufe mit Abblende, dann das Leuchtfeuer bremst
  await z(() => {
    window.zomfy.setSurvivor('juna', 2);
    window.zomfy.give({ schrott: 30, holz: 20 });
    window.zomfy.buildTowerStage();
  });
  for (let k = 0; k < 40 && (await z(() => window.zomfy.mode)) === 'sleep'; k++) await step(250);
  await step(300);
  const turm = (await z(() => window.zomfy.state())).world.tower;
  const turmDialog = (await view()).dialog?.sprecher;
  await z(() => {
    window.zomfy.finishDialog();
    window.zomfy.setTowerStage(3);
  });
  const bremse = await z(() => window.zomfy.beaconSlow(9.5, -5));
  if (turm === 1 && turmDialog === 'juna' && bremse > 0) note(`✓ Funkturm: Stufe 1 gebaut (Juna freut sich), Leuchtfeuer bremst Schlurfer um ${Math.round(bremse * 100)} %`);
  else fail(`Funkturm: Stufe ${turm}, Dialog ${turmDialog}, Bremse ${bremse}`);

  // Bilder (das Spiel läuft hier nur in festen Schritten – shot() würde auf Bilder warten)
  const snap = async (name, setup) => {
    await z(setup);
    await step(900);
    await page.screenshot({ path: join(SHOTS, `${name}.png`), timeout: 180000 }); // unter Last braucht der Software-Renderer lange
    note(`  Screenshot: screenshots/${name}.png`);
  };
  await snap('ueberlebende', () => {
    window.zomfy.setSurvivor('bert', 2);
    window.zomfy.setSurvivor('yusuf', 2);
    window.zomfy.setTime(11, 0);
    window.zomfy.teleport(1.0, 2.5, 0);
  });
  await snap('einrichten', () => {
    window.zomfy.setTime(21, 30);
    const e = window.zomfy.interior().entry; // die Möbel stehen im Wohnraum (M11)
    window.zomfy.teleport(e.x - 0.6, e.z - 2.4, 0);
  });

  // Knopf bellt vor der Welle
  await z(() => {
    window.zomfy.setHorde(true);
    window.zomfy.setTime(20, 10);
    window.zomfy.teleport(0.5, 2.5, 0);
  });
  let bellt = false;
  let bellText = '';
  for (let k = 0; k < 30 && !bellt; k++) {
    await step(500);
    bellText = ((await view()).meldungen || []).find((m) => m.startsWith('Knopf bellt')) || '';
    bellt = Boolean(bellText);
  }
  // M9 (OFFENE-FRAGEN Nr. 74): Knopf warnt ohne feste Richtung, Juna meldet die Arten der Nacht
  // Den Funkspruch gibt es, sobald Juna eingezogen ist (hier ist sie Gast: kurz Stufe 3)
  const funk =
    (
      await z(() => {
        window.zomfy.setSurvivor('juna', 3);
        const lines = window.zomfy.morning();
        window.zomfy.setSurvivor('juna', 2);
        return lines;
      })
    ).find((t) => t.startsWith('Juna hat am Funk')) || '';
  if (bellt && !/weg/.test(bellText) && /Wellen – /.test(funk)) note(`✓ Knopf bellt kurz vor der ersten Welle („${bellText}“), Juna meldet: „${funk}“`);
  else fail(`Knopf/Juna: Bellen ${bellt} „${bellText}“, Funk „${funk}“`);
  await z(() => window.zomfy.setHorde(false));

  // Speichern und Laden
  await z(() => window.zomfy.save());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  await z(() => {
    window.__zomfyHold = true;
  });
  const geladen = await z(() => window.zomfy.state());
  if (geladen.version === 10 && geladen.survivors.hilde.stage === 3 && geladen.world.furniture.length === 6 && geladen.world.tower === 3) note('✓ Speichern v10: Überlebende, Möbel und Leuchtmast bleiben nach dem Neuladen');
  else fail(`Speichern v10: ${JSON.stringify({ v: geladen.version, s: geladen.survivors, f: geladen.world.furniture, t: geladen.world.tower })}`);
  checkMessages(session);
  await session.context.close();

  // Migration v4 -> v5: Überlebende kommen erst ab dem nächsten Tag
  const saveUrl = `${url}index.html?test`;
  const v4 = await openGame(browser, saveUrl, 'Alter Spielstand (v4)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-v4')) {
        localStorage.setItem(
          'zomfy-towers.spielstand',
          JSON.stringify({ version: 4, time: { day: 7, minute: 60 }, player: { x: 0.5, z: 2, hp: 80, xp: 3, level: 2 }, inventory: { holz: 5, schrott: 12 }, world: { houseLevel: 2, homeHp: 400, buildings: [] }, weapons: { pfanne: 1 }, perks: {} })
        );
        sessionStorage.setItem('zomfy-v4', '1');
      }
    },
  });
  const m = await v4.page.evaluate(() => ({ state: window.zomfy.state(), tabs: window.zomfyView().bauleiste }));
  if (m.state.version === 10 && m.state.world.survivorsStart === 6 && Object.values(m.state.survivors).every((s) => s.stage === 0) && m.state.weapons.pfanne === 1 && m.state.player.name === 'Mika' && m.state.player.look.hat === 'orange') {
    note('✓ Migration: Spielstand v4 wird zu v10 (Überlebende kommen ab dem nächsten Tag, Waffen bleiben)');
  } else fail(`Migration v4: ${JSON.stringify(m.state)}`);
  checkMessages(v4);
  await v4.context.close();
}

/**
 * Meilenstein 8 (seit M9 an der Bucht): Das Bootswrack gibt nur einmal etwas
 * her, Schrotthaufen alle zwei Tage. Balduin kommt ab Tag 2 morgens mit dem Boot
 * an den Steg, handelt bis Mittag Zombieteile gegen Rohstoffe (echte Tasten im
 * Handelsfenster), Vorrat je Tag, Speichern v10 und Migration v6 → v8.
 */
async function runTraderChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Händler', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m8')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m8', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const view = () => z(() => window.zomfyView());
  const state = () => z(() => window.zomfy.state());
  const press = async (key, ms = 60) => {
    await page.keyboard.press(key);
    await step(ms);
  };
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setTime(9, 0);
  });
  await step(100);

  // Bootswrack: einmal Schrott, danach für immer ausgeräumt
  await z(() => window.zomfy.teleport(10.25, 7.9, 0));
  let st = await state();
  await z(() => window.zomfy.interact('wrack'));
  await step(2500);
  const nachAuto = await state();
  const ausAuto = nachAuto.inventory.schrott - st.inventory.schrott;
  await z(() => window.zomfy.setDay(5));
  await step(100);
  const hinweisAuto = (await view()).hinweis;
  await z(() => window.zomfy.interact('wrack'));
  await step(2500);
  const nochmal = (await state()).inventory.schrott - nachAuto.inventory.schrott;
  if (ausAuto >= 5 && nochmal === 0 && nachAuto.flags.wrackLeer && /Ausgeräumt/.test(hinweisAuto || '')) note(`✓ Bootswrack: einmal +${ausAuto} Schrott, Tage später „${hinweisAuto}“`);
  else fail(`Bootswrack: ${JSON.stringify({ ausAuto, nochmal, leer: nachAuto.flags.wrackLeer, hinweisAuto })}`);

  // Schrotthaufen: leer bis übermorgen, dann wieder voll
  await z(() => window.zomfy.teleport(5.75, 9.75, -Math.PI / 2));
  st = await state();
  await z(() => window.zomfy.interact('schrott-1'));
  await step(2500);
  const h1 = (await state()).inventory.schrott - st.inventory.schrott;
  await z(() => window.zomfy.setDay(6));
  await step(100);
  const morgen = (await view()).hinweis;
  await z(() => window.zomfy.setDay(7));
  await step(100);
  const uebermorgen = (await view()).hinweis;
  if (h1 >= 2 && /Leer/.test(morgen || '') && uebermorgen === 'Durchsuchen') note(`✓ Schrotthaufen: +${h1} Schrott, am nächsten Tag „${morgen}“, am übernächsten wieder voll`);
  else fail(`Schrotthaufen: ${JSON.stringify({ h1, morgen, uebermorgen })}`);

  // Tag 1: kein Balduin. Tag 2: um 06:40 taucht sein Boot im Osten auf und legt am Steg an
  await z(() => {
    window.zomfy.setDay(1);
    window.zomfy.setTime(10, 0);
  });
  await step(100);
  const tag1 = await z(() => window.zomfy.trader());
  await z(() => {
    window.zomfy.setDay(2);
    window.zomfy.setTime(6, 38);
    window.zomfy.teleport(12.5, -1.0, 0);
  });
  await step(100);
  const frueh = await z(() => window.zomfy.trader());
  await step(3000); // rund 06:46
  const kommt = await z(() => window.zomfy.trader());
  await step(9000); // rund 07:08
  const steht = await z(() => window.zomfy.trader());
  if (tag1.phase === 'weg' && frueh.phase === 'weg' && kommt.phase === 'kommt' && kommt.boat > steht.boat + 3 && steht.phase === 'steht' && steht.prompt && steht.x < steht.boat && kommt.fanfares === frueh.fanfares + 1 && steht.fanfares === kommt.fanfares) {
    note(`✓ Balduin: nicht an Tag 1, an Tag 2 ab 06:40 mit dem Boot unterwegs (x ${kommt.boat.toFixed(1)}) – mit Fanfare –, dann am Steg (Boot bei ${steht.boat.toFixed(1)}, er auf dem Steg)`);
  } else fail(`Balduin kommt: ${JSON.stringify({ tag1: tag1.phase, frueh: frueh.phase, kommt, steht })}`);

  // Ziel nach der ersten Nacht: bei Balduin tauschen
  await z(() => {
    for (const f of ['ziel_axt', 'ziel_turm', 'ziel_nacht']) window.zomfy.setFlag(f);
  });
  await step(100);
  const ziel = (await view()).ziel || '';

  // Hingehen, E: erstes Treffen (Dialog), »Zeig mal her!« öffnet Balduins Boot
  await z(() => window.zomfy.give({ teile: 20 }));
  await z((p) => window.zomfy.teleport(p.x - 1.0, p.z, Math.PI / 2), steht);
  await step(200);
  const hinweis = (await view()).hinweis;
  const gruss = (await z(() => window.zomfy.trader())).gestures; // M10: Mütze lüften, wenn Mika herankommt
  await press('KeyE', 300);
  let antworten = null;
  for (let k = 0; k < 12 && !antworten; k++) {
    const d = (await view()).dialog;
    if (!d) break;
    if (d.fertigGetippt && d.antworten.length) antworten = d.antworten;
    else await press('KeyE', 350);
  }
  await press('KeyW', 100);
  await press('KeyE', 300);
  const fenster = await view();
  const offen = await z(() => window.zomfy.mode);
  if (hinweis === 'Ansprechen' && antworten?.includes('> Später.') && offen === 'craft' && fenster.handelsfenster?.titel === 'Balduins Boot' && /Tausche Zombieteile/.test(ziel)) {
    note(`✓ Balduin: Ziel „${ziel}“, E spricht ihn an, harmlose Antwort vorgewählt, »Zeig mal her!« öffnet den Handel am Boot`);
  } else fail(`Balduin ansprechen: ${JSON.stringify({ hinweis, antworten, offen, fenster: fenster.handelsfenster, ziel })}`);

  // E tauscht einmal, gehaltenes E tauscht weiter
  await step(700); // gleich nach dem Öffnen nimmt E noch nichts (OPEN_LOCK)
  st = await state();
  await press('KeyE', 100);
  const einmal = await state();
  await page.keyboard.down('KeyE');
  await step(2600);
  await page.keyboard.up('KeyE');
  await step(100);
  const gehalten = await state();
  const zeilen = (await view()).werkbank || [];
  await page.screenshot({ path: join(SHOTS, 'handel.png'), timeout: 180000 });
  note('  Screenshot: screenshots/handel.png');
  if (st.inventory.teile - einmal.inventory.teile === 3 && einmal.inventory.schrott - st.inventory.schrott === 2 && gehalten.inventory.teile < einmal.inventory.teile && gehalten.flags.gehandelt && zeilen[0]?.startsWith('> 2 Schrott')) {
    note(`✓ Handel: E tauscht 3 Zombieteile gegen 2 Schrott, gehalten weiter (Teile ${st.inventory.teile} → ${gehalten.inventory.teile})`);
  } else fail(`Handel: ${JSON.stringify({ vorher: st.inventory, einmal: einmal.inventory, gehalten: gehalten.inventory, zeilen })}`);
  // »Tschüss, Balduin!« (letzte Zeile – W springt von oben dorthin) schließt das Fenster;
  // wer gehandelt hat, dem sagt er Tschüss, und er legt gleich ab (M9.1)
  await press('KeyW', 100);
  const tschuess = ((await view()).werkbank || []).find((l) => l.startsWith('> ')) || '';
  await press('KeyE', 200);
  const zu = await z(() => window.zomfy.mode);
  const zielDanach = (await view()).ziel || '';
  const blase = (await view()).gedanke || '';
  const ankunft = await z(() => window.zomfy.trader());
  await step(3000);
  const legtAb = await z(() => window.zomfy.trader());
  await step(10000);
  const fort = await z(() => window.zomfy.trader());
  if (zu === 'play' && tschuess.includes('Tschüss, Balduin!') && !/Tausche Zombieteile/.test(zielDanach) && blase.startsWith('„') && ankunft.leaving && legtAb.phase === 'geht' && !legtAb.prompt && fort.phase === 'weg') {
    note(`✓ Handel: »Tschüss, Balduin!« schließt das Fenster, das Ziel ist erreicht – er sagt ${blase}, legt ab und ist fort`);
  } else fail(`Handel schließen: ${JSON.stringify({ zu, tschuess, zielDanach, blase, ankunft, legtAb: legtAb.phase, fort: fort.phase })}`);
  // Meilenstein 10: Einfahrt zwischen den Inseln, Leine über den Poller, Gesten
  if (kommt.boatZ < -3 && steht.rope > 0 && gruss.includes('muetze') && ankunft.gestures.join() === 'daumen,winken' && fort.rope === 0) {
    note(`✓ Balduin (M10): Einfahrt von Nordosten zwischen den Inseln (z ${kommt.boatZ.toFixed(1)}), die Leine liegt über dem Poller, er lüftet die Mütze, nach dem Handel Daumen hoch und Winken, abgelegt ist die Leine wieder an Bord`);
  } else fail(`Balduin M10: ${JSON.stringify({ boatZ: kommt.boatZ, rope: steht.rope, gruss, abschied: ankunft.gestures, ropeFort: fort.rope })}`);

  // Nächster Morgen: andere Sonderangebote, Zahnräder nur zweimal am Tag
  await z(() => {
    window.zomfy.setDay(3);
    window.zomfy.setTime(9, 0);
    window.zomfy.give({ teile: 30 });
  });
  await step(100);
  const angebote = (await z(() => window.zomfy.trader())).offers;
  const zahn = await z(() => [window.zomfy.trade('zahnrad'), window.zomfy.trade('zahnrad'), window.zomfy.trade('zahnrad')]);
  if (angebote.join() === 'schrott,stein,zahnrad' && zahn.join() === 'true,true,false') note(`✓ Balduin: Tag 3 bietet ${angebote.join(', ')} – Zahnräder nur zweimal am Tag`);
  else fail(`Angebote/Vorrat: ${JSON.stringify({ angebote, zahn })}`);
  const bericht = await z(() => window.zomfy.morning());
  if (bericht.some((l) => l.startsWith('Balduin liegt bis 12 Uhr am Steg'))) note('✓ Morgenbericht: Balduin liegt bis 12 Uhr am Steg');
  else fail(`Morgenbericht ohne Balduin: ${JSON.stringify(bericht)}`);

  // Bild vom Boot am Steg am Vormittag
  await z(() => window.zomfy.teleport(14.5, -1.0, 1.2));
  await step(1500);
  await page.screenshot({ path: join(SHOTS, 'haendler.png'), timeout: 180000 });
  note('  Screenshot: screenshots/haendler.png');

  // Um 12 Uhr legt er ab und fährt nach Osten davon
  await z(() => window.zomfy.setTime(11, 58));
  await step(1500);
  const geht = await z(() => window.zomfy.trader());
  await step(10000);
  const weg = await z(() => window.zomfy.trader());
  if (geht.phase === 'geht' && weg.phase === 'weg' && !weg.visible) note('✓ Balduin: um 12 Uhr legt er ab, nachmittags ist er fort');
  else fail(`Balduin geht: ${JSON.stringify({ geht: geht.phase, weg })}`);

  // Speichern v10: Vorrat des Tages und Flags bleiben
  await z(() => window.zomfy.save());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  await z(() => {
    window.__zomfyHold = true;
  });
  const geladen = await state();
  if (geladen.version === 10 && geladen.world.trader.day === 3 && geladen.world.trader.sold.zahnrad === 2 && geladen.flags.wrackLeer && geladen.flags.balduinGetroffen) note('✓ Speichern v10: Balduins Vorrat, Bootswrack und Bekanntschaft bleiben nach dem Neuladen');
  else fail(`Speichern v10: ${JSON.stringify({ v: geladen.version, trader: geladen.world.trader, flags: geladen.flags })}`);

  // Meilenstein 10: besondere Turmteile. An Tag 4 bietet Balduin eine Glücksmünze an;
  // eingebaut über die Turm-Auswahl (Taste der Kachel). Abschüsse dieses Turms lassen
  // sicher Zombieteile fallen, und nach dem Neuladen steckt die Münze noch am Turm.
  const kauf = await z(() => {
    window.zomfy.setHorde(false);
    window.zomfy.setHorde(true);
    window.zomfy.setFlag('ersterTurm'); // sonst hält Mikas Satz zum ersten Turm das Spiel an
    window.zomfy.setDay(4);
    window.zomfy.setTime(9, 0);
    window.zomfy.give({ teile: 20, schrott: 30 });
    return { angebote: window.zomfy.trader().offers, gekauft: window.zomfy.trade('gluecksmuenze'), vorrat: window.zomfy.state().towerParts.gluecksmuenze };
  });
  const turmTeil = await z(() => {
    const col = window.zomfy.pathColumn(-12);
    const j = col[0] - 1;
    const res = window.zomfy.build('bolzen', -12, j);
    const b = window.zomfy.buildings().find((q) => q.i === -12 && q.j === j);
    window.zomfy.teleport(-12.5, j - 5, 0); // Mika weit genug weg: kein Schlurfer jagt sie, nichts fliegt ihr zu
    window.zomfy.selectBuilding(b?.id);
    return { res, id: b?.id };
  });
  await step(150);
  const kachel = await z(() => window.zomfy.buildbarLayout().tiles.findIndex((t) => t.id === 'teil-gluecksmuenze'));
  if (kachel >= 0) await press(['KeyQ', 'KeyR', 'KeyT', 'KeyG', 'KeyC', 'KeyV'][kachel], 150);
  const eingebaut = await z((id) => ({ teil: window.zomfy.buildings().find((b) => b.id === id)?.part, vorrat: window.zomfy.state().towerParts.gluecksmuenze }), turmTeil.id);
  // Drei Schlurfer laufen am Münzturm vorbei; jeder, den er erwischt, lässt Teile fallen
  // (gezählt werden nur diese drei – ein Tagesschlurfer kann nebenher unterwegs sein)
  const trio = await z(() => {
    window.zomfy.game.builder.selection = null;
    window.zomfy.game.loot.clear();
    const ids = [];
    for (let k = 0; k < 3; k++) {
      const x = -17 - k * 1.6;
      const col = window.zomfy.pathColumn(Math.floor(x));
      ids.push(window.zomfy.spawnZombie('schlurfer', x, col[Math.floor(col.length / 2)] + 0.5));
    }
    return ids;
  });
  const trioAlive = () => z((ids) => window.zomfy.zombies().filter((q) => ids.includes(q.id) && q.state !== 'dying').length, trio);
  for (let k = 0; k < 50; k++) {
    await step(500);
    if ((await trioAlive()) === 0) break;
  }
  const muenze = await z(() => ({ kills: window.zomfy.state().stats.kills, teile: window.zomfy.lootItems().filter((l) => l.res === 'teile').length }));
  muenze.lebend = await trioAlive();
  await z(() => window.zomfy.save());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  await z(() => {
    window.__zomfyHold = true;
  });
  const nachLaden = await z((id) => ({ v: window.zomfy.state().version, teil: window.zomfy.buildings().find((b) => b.id === id)?.part }), turmTeil.id);
  // Die Glücksmünze passt nicht in den Laternenturm (er schießt nicht), das Fernrohr schon
  const laterne = await z(() => {
    const g = window.zomfy.game;
    g.state.towerParts.gluecksmuenze = 1;
    g.state.towerParts.fernrohr = 1;
    window.zomfy.give({ schrott: 40, holz: 20, stein: 20, zahnraeder: 4 });
    const col = window.zomfy.pathColumn(-8);
    const j = col[0] - 1;
    const res = window.zomfy.build('laternenturm', -8, j);
    const b = window.zomfy.buildings().find((q) => q.i === -8 && q.j === j);
    window.zomfy.selectBuilding(b?.id);
    return { res, id: b?.id };
  });
  await step(100);
  const laterneKacheln = await z(() => window.zomfy.buildbarLayout().tiles.map((t) => t.id));
  if (kauf.angebote.includes('gluecksmuenze') && kauf.gekauft && kauf.vorrat === 1 && turmTeil.res === 'ok' && eingebaut.teil === 'gluecksmuenze' && eingebaut.vorrat === 0 && muenze.lebend === 0 && muenze.teile >= 3 && nachLaden.v === 10 && nachLaden.teil === 'gluecksmuenze' && laterne.res === 'ok' && laterneKacheln.includes('teil-fernrohr') && !laterneKacheln.includes('teil-gluecksmuenze')) {
    note(`✓ Turmteile: Balduin bietet an Tag 4 eine Glücksmünze an, eine Taste baut sie in den Bolzenwerfer ein – ${muenze.teile} Zombieteile von drei Schlurfern, nach dem Neuladen steckt sie noch (v10); der Laternenturm nimmt ein Fernrohr, aber keine Münze`);
  } else fail(`Turmteile: ${JSON.stringify({ kauf, turmTeil: { res: turmTeil.res, id: turmTeil.id }, kachel, eingebaut, muenze, nachLaden, laterne, laterneKacheln })}`);
  checkMessages(session);
  await session.context.close();

  // Migration v6 -> v8: Wer das Autowrack schon durchsucht hat, findet im Bootswrack nichts mehr
  const v6 = await openGame(browser, `${url}index.html?test`, 'Alter Spielstand (v6)', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-v6')) {
        localStorage.setItem(
          'zomfy-towers.spielstand',
          JSON.stringify({ version: 6, time: { day: 4, minute: 120 }, player: { x: 0.5, z: 2, hp: 90, name: 'Kira' }, inventory: { holz: 5, schrott: 12 }, world: { houseLevel: 1, homeHp: 300, buildings: [], searched: { auto: 2, 'schrott-1': 3 } }, flags: { introGesehen: true } })
        );
        sessionStorage.setItem('zomfy-v6', '1');
      }
    },
  });
  const m = await v6.page.evaluate(() => window.zomfy.state());
  if (m.version === 10 && m.flags.wrackLeer && m.inventory.teile === 0 && m.inventory.schrott === 12 && m.world.trader.day === 0 && m.player.name === 'Kira') note('✓ Migration: Spielstand v6 wird zu v10 (Wrack schon ausgeräumt, Zombieteile bei null)');
  else fail(`Migration v6: ${JSON.stringify({ v: m.version, flags: m.flags, inv: m.inventory, trader: m.world.trader })}`);
  checkMessages(v6);
  await v6.context.close();
}

async function runCombatChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&playtest`, 'Nahkampf und Perks', {
    init: () => {
      if (!sessionStorage.getItem('zomfy-m4')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-m4', '1');
      }
    },
  });
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const state = () => z(() => window.zomfy.state());
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const click = async (x, y, zz) => {
    const t = await z(([a, b, c]) => window.zomfy.screenOf(a, b, c), [x, y, zz]);
    await page.mouse.move(t.x, t.y);
    await step(34);
    await page.mouse.down();
    await step(34);
    await page.mouse.up();
  };
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setTime(10, 0);
    window.zomfy.give({ holz: 30, stein: 20, schrott: 60, fasern: 20, stoff: 10, zahnraeder: 2 });
    window.zomfy.teleport(0.5, 2.5, 0);
  });
  await step(100);

  // Waffe an der Werkbank bauen: landet in der Schnellleiste und in der Hand
  const gebaut = await z(() => window.zomfy.craft('schaufel'));
  const hand = await z(() => window.zomfy.combatInfo().weapon);
  if (gebaut && hand === 'schaufel') note('✓ Waffen: Schaufel gebaut, liegt in der Schnellleiste und in der Hand');
  else fail(`Waffen: Schaufel ${gebaut ? 'gebaut' : 'nicht gebaut'}, in der Hand: ${hand}`);

  // Klick in Richtung eines Schlurfers: Schaufel trifft mit 16
  await z(() => window.zomfy.spawnZombie('schlurfer', 0.5, 3.7));
  await click(0.5, 0, 3.7);
  await step(400);
  const getroffen = (await z(() => window.zomfy.zombies()))[0];
  if (getroffen && Math.round(getroffen.hp) === 14) note('✓ Nahkampf: Klick schlägt in Richtung Maus, Schaufel trifft mit 16');
  else fail(`Nahkampf: Schlurfer nach dem Schlag ${JSON.stringify(getroffen)}`);
  await z(() => window.zomfy.killAllZombies());
  await step(900);

  // Bratpfanne betäubt
  await z(() => window.zomfy.craft('pfanne'));
  await z(() => window.zomfy.spawnZombie('brummer', 0.5, 3.8));
  await click(0.5, 0, 3.8);
  await step(450);
  const betaeubt = (await z(() => window.zomfy.zombies()))[0];
  await page.screenshot({ path: join(SHOTS, 'nahkampf.png') });
  note('  Screenshot: screenshots/nahkampf.png');
  if (betaeubt && betaeubt.stun > 0 && betaeubt.hp < 150) note(`✓ Nahkampf: Bratpfanne trifft (${150 - Math.round(betaeubt.hp)} durch die Panzerung) und betäubt`);
  else fail(`Nahkampf: Brummer nach der Pfanne ${JSON.stringify(betaeubt)}`);
  await z(() => window.zomfy.killAllZombies());
  await step(900);

  // Ausweichrolle: Leertaste, kurz unverwundbar, ein gutes Stück weiter
  const vorRolle = await state();
  await page.keyboard.down('KeyD');
  await step(34);
  await page.keyboard.press('Space');
  await step(34);
  const rolle = await z(() => window.zomfy.combatInfo());
  await step(300);
  await page.keyboard.up('KeyD');
  await step(50);
  const nachRolle = await state();
  const weg = nachRolle.player.x - vorRolle.player.x;
  if (rolle.action === 'roll' && rolle.invulnerable > 0 && weg > 1.2) note(`✓ Ausweichen: Leertaste rollt ${weg.toFixed(1)} m, dabei unverwundbar`);
  else fail(`Ausweichen: ${JSON.stringify(rolle)}, Weg ${weg.toFixed(2)} m`);

  // Erfahrung: Nahkampf-Abschuss zählt doppelt; Stufenaufstieg öffnet die Perk-Wahl
  const xpVorher = (await state()).player.xp;
  await z((pl) => window.zomfy.spawnZombie('schwaermer', pl.x, pl.z + 1.1), nachRolle.player);
  await click(nachRolle.player.x, 0, nachRolle.player.z + 1.1);
  await step(700);
  const xpNachher = (await state()).player.xp;
  if (xpNachher - xpVorher >= 1) note(`✓ Erfahrung: Abschuss im Nahkampf gibt ${xpNachher - xpVorher} Erfahrung`);
  else fail(`Erfahrung: ${xpVorher} -> ${xpNachher}`);
  // Neue Stufe mitten im Getümmel: Die Wahl wartet, bis es ruhig ist (m4-r1)
  await z((pl) => window.zomfy.spawnZombie('brummer', pl.x + 2.2, pl.z + 0.5), nachRolle.player);
  await z(() => window.zomfy.giveXp(30));
  await step(1200);
  const imKampf = await z(() => ({ mode: window.zomfy.mode, wartet: window.zomfyView().perkWartet }));
  await z(() => window.zomfy.killAllZombies());
  await step(1500);
  const wahl = await z(() => ({ mode: window.zomfy.mode, view: window.zomfyView().perkWahl }));
  if (imKampf.mode === 'play' && imKampf.wartet && wahl.mode === 'perk') note('✓ Perks: im Getümmel wartet die Wahl (Hinweis), danach öffnet sie');
  else fail(`Perks im Getümmel: ${JSON.stringify(imKampf)}, danach ${wahl.mode}`);
  await page.screenshot({ path: join(SHOTS, 'perks.png') });
  note('  Screenshot: screenshots/perks.png');
  await page.keyboard.press('Digit1');
  await step(100);
  const nachWahl = await state();
  if (wahl.mode === 'perk' && wahl.view?.length === 3 && Object.keys(nachWahl.perks).length === 1) note(`✓ Perks: Stufe ${nachWahl.player.level}, drei Karten, Taste 1 wählt (${Object.keys(nachWahl.perks)[0]})`);
  else fail(`Perks: Wahl ${JSON.stringify(wahl)}, danach ${JSON.stringify(nachWahl.perks)}`);
  // Weitere offene Wahl (mehrere Stufen auf einmal) gleich mit erledigen
  for (let k = 0; k < 4; k++) {
    await step(1200); // die nächste Wahl kommt nach einem ruhigen Augenblick
    if ((await z(() => window.zomfy.mode)) !== 'perk') break;
    await page.keyboard.press('Digit2');
    await step(100);
  }

  // Waffen-Aufwertung über den Reiter »Figur« (C = Waffe in der Hand)
  await page.keyboard.press('Tab');
  await step(100);
  await page.keyboard.press('KeyC');
  await step(100);
  await page.keyboard.press('KeyC'); // Kaufen per Taste braucht einen zweiten Druck
  await step(100);
  const aufgewertet = (await state()).weapons.pfanne;
  if (aufgewertet === 2) note('✓ Waffen: Bratpfanne über die Bauleiste (Figur, C) auf Stufe 2');
  else fail(`Waffen: Bratpfanne auf Stufe ${aufgewertet}`);

  // Ein Schlurfer jagt Mika, eine Werkbank steht dazwischen: Er bleibt nicht ewig
  // davor stehen, sondern gibt die Jagd auf und kommt außen herum (m7-r1)
  const bank = await z(() => {
    window.zomfy.give({ holz: 10, stein: 4 });
    return window.zomfy.build('werkbank', 6, 2);
  });
  await z(() => window.zomfy.finishDialog());
  const jaeger = await z(() => {
    window.zomfy.killAllZombies();
    window.zomfy.teleport(7.0, 3.7, Math.PI);
    return window.zomfy.spawnZombie('schlurfer', 7.0, 1.3);
  });
  let jagdNah = 99;
  for (let k = 0; k < 8; k++) {
    await step(2000);
    const d = await z((id) => {
      const zo = window.zomfy.zombies().find((q) => q.id === id);
      const p = window.zomfyView().figur;
      return zo ? Math.hypot(zo.x - p.x, zo.z - p.z) : 99;
    }, jaeger);
    jagdNah = Math.min(jagdNah, d);
  }
  await z(() => window.zomfy.killAllZombies());
  await step(100);
  if (bank === 'ok' && jagdNah < 1.2) note(`✓ Horde: Ein Schlurfer hinter der Werkbank kommt außen herum zu Mika (${jagdNah.toFixed(2)} m)`);
  else fail(`Horde: Schlurfer hängt hinter der Werkbank fest (Bau ${bank}, nächster Abstand ${jagdNah.toFixed(2)} m)`);

  // Speichern und Laden: Waffen, Stufe und Perks bleiben
  await z(() => window.zomfy.sleepNow());
  await page.waitForFunction(() => window.zomfy.mode !== 'sleep', null, { timeout: 240000 }).catch(() => {});
  for (let k = 0; k < 30 && (await z(() => window.zomfy.mode)) === 'sleep'; k++) await step(1000);
  const gespeichert = await state();
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await state();
  if (geladen.version === 10 && geladen.weapons.pfanne === 2 && geladen.player.level === gespeichert.player.level && Object.keys(geladen.perks).length >= 1) {
    note(`✓ Speichern v10: Waffen, Stufe ${geladen.player.level} und Perks bleiben nach dem Neuladen`);
  } else fail(`Speichern v4: vorher ${JSON.stringify({ w: gespeichert.weapons, l: gespeichert.player.level, p: gespeichert.perks })}, nachher ${JSON.stringify({ v: geladen.version, w: geladen.weapons, l: geladen.player.level, p: geladen.perks })}`);
  checkMessages(session);
  await session.context.close();
}

/**
 * Meilenstein 12: Wetter je Tag (die ersten beiden Tage klar, alle vier Arten
 * kommen vor, fest aus Startwert und Tag), Nieselregen im Bild (drinnen nicht),
 * Nebel am Morgen, das Wetter in Uhr und Morgenbericht; Herbstschmuck (Schilf,
 * Kürbislaternen leuchten nachts, Laub stiebt auf, wenn man hindurchläuft);
 * Krähen fliegen vor Mika und vor Schlurfern auf, kommen wieder und ziehen
 * abends in den Wald; Mikas Gesicht (Aua, froh, müde) und das Lächeln der
 * Überlebenden (Bilder: wetter-regen, wetter-nebel, herbst, laternen).
 */
async function runAutumnChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave&playtest`, 'Herbst');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const view = () => z(() => window.zomfyView());
  const picture = async (name) => {
    await page.screenshot({ path: join(SHOTS, `${name}.png`), timeout: 180000 });
    note(`  Screenshot: screenshots/${name}.png`);
  };
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setTime(10, 0);
  });
  await step(100);

  // Wetter je Tag: fest aus Startwert und Tag, die ersten beiden Tage klar, alle Arten kommen vor
  const plan = await z(() => {
    const w = window.zomfy.game.world.weather;
    const a = [];
    const b = [];
    for (let d = 1; d <= 40; d++) a.push(w.forecast(d));
    for (let d = 1; d <= 40; d++) b.push(w.forecast(d));
    return { a, same: a.join() === b.join() };
  });
  const zaehl = {};
  for (const k of plan.a) zaehl[k] = (zaehl[k] || 0) + 1;
  if (plan.a[0] === 'klar' && plan.a[1] === 'klar' && ['klar', 'wind', 'regen', 'nebel'].every((k) => zaehl[k] > 0) && plan.same) {
    note(`✓ Wetter: Tag 1 und 2 klar, in 40 Tagen ${Object.entries(zaehl).map(([k, n]) => `${n}× ${k}`).join(', ')} – fest je Tag`);
  } else fail(`Wetter: ${JSON.stringify({ tage: plan.a.slice(0, 8), zaehl, gleich: plan.same })}`);

  // Nieselregen: Striche im Bild und das Wetter in der Uhr; drinnen regnet es nicht
  await z(() => {
    window.zomfy.setWeather('regen');
    window.zomfy.setTime(14, 0);
    window.zomfy.teleport(2.5, 3.0, 0);
  });
  await step(600);
  const regen = await z(() => window.zomfy.weather());
  const uhr = (await view()).wetter;
  await picture('wetter-regen');
  await z(() => {
    const e = window.zomfy.interior().entry;
    window.zomfy.teleport(e.x, e.z - 1.5, Math.PI);
  });
  await step(600);
  const drinnen = await z(() => window.zomfy.weather());
  if (regen.kind === 'regen' && regen.drops > 40 && drinnen.drops === 0 && uhr === 'Nieselregen') note(`✓ Regen: ${regen.drops} Tropfen im Bild, drinnen keine, die Uhr sagt „${uhr}“`);
  else fail(`Regen: ${JSON.stringify({ regen, drinnen, uhr })}`);

  // Nebel: an Nebeltagen morgens über See und Bucht, an klaren Nachmittagen nicht
  await z(() => {
    window.zomfy.setWeather('nebel');
    window.zomfy.setTime(7, 0);
    window.zomfy.teleport(10.5, 0.5, 0);
  });
  await step(800);
  const nebel = await z(() => window.zomfy.weather());
  await picture('wetter-nebel');
  await z(() => {
    window.zomfy.setWeather('klar');
    window.zomfy.setTime(14, 0);
  });
  await step(800);
  const klar = await z(() => window.zomfy.weather());
  if (nebel.fog && !klar.fog) note('✓ Nebel: am Nebelmorgen über dem Wasser, am klaren Nachmittag weg');
  else fail(`Nebel: morgens ${nebel.fog}, nachmittags ${klar.fog}`);

  // Morgenbericht: das Wetter des neuen Tages steht darin (ohne Nacht als Meldung)
  await z(() => {
    window.zomfy.setWeather('regen', false);
    window.zomfy.game.advanceToMorning();
  });
  await step(100);
  const morgen = (await view()).meldungen || [];
  const satz = await z(() => window.zomfy.game.weatherLine(window.zomfy.state().time.day));
  await z(() => window.zomfy.setWeather(null));
  if (morgen.includes(satz) && /Regen|nieselt|nass/.test(satz)) note(`✓ Wetter am Morgen: „${satz}“`);
  else fail(`Wetter am Morgen fehlt: ${JSON.stringify({ morgen, satz })}`);

  // Herbstschmuck: Schilf am Ufer, Kürbislaternen leuchten nachts, Laub stiebt auf
  const schilf = await z(() => window.zomfy.game.world.stats.reeds);
  const glut = async (h) => {
    await z((hh) => window.zomfy.setTime(hh, 0), h);
    await step(300);
    return z(() => {
      const c = window.zomfy.game.world.materials.pumpkinGlow.color;
      return c.r + c.g + c.b;
    });
  };
  const glutTag = await glut(12);
  const glutNacht = await glut(22);
  await z(() => window.zomfy.teleport(6.0, -2.25, 0));
  await step(400);
  await picture('laternen');
  await z(() => {
    window.zomfy.setTime(10, 0);
    window.zomfy.teleport(-5.25, -12.0, Math.PI / 2);
  });
  await step(200);
  const vorher = await z(() => window.zomfy.game.world.leafKicks);
  await page.keyboard.down('KeyD');
  await step(900);
  await page.keyboard.up('KeyD');
  await step(100);
  const kicks = (await z(() => window.zomfy.game.world.leafKicks)) - vorher;
  if (schilf >= 20 && glutNacht > glutTag * 1.5 && kicks > 0) note(`✓ Herbst: ${schilf} Schilfbüschel am Ufer, Kürbislaternen nachts hell (${glutTag.toFixed(2)} → ${glutNacht.toFixed(2)}), Laub stiebt ${kicks}× auf`);
  else fail(`Herbst: ${JSON.stringify({ schilf, glutTag, glutNacht, kicks })}`);

  // Krähen: sitzen tagsüber, fliegen vor Mika krächzend auf und kommen wieder
  await z(() => {
    window.zomfy.teleport(12.0, 6.5, 0);
    window.zomfy.settleCrows();
  });
  await step(300);
  const k0 = await z(() => window.zomfy.crows());
  const sitzend = k0.list.filter((c) => c.state === 'sitzt');
  const ziel = sitzend.find((c) => c.x > -8 && c.x < 12) || sitzend[0];
  await z(([x, zz]) => window.zomfy.teleport(x + 1.0, zz + 1.0, 0), [ziel.x, ziel.z]);
  await step(300);
  const k1 = await z(() => window.zomfy.crows());
  const aufgeflogen = k1.list.find((c) => c.id === ziel.id).state;
  await z(() => window.zomfy.teleport(12.0, 6.5, 0));
  for (let k = 0; k < 12; k++) await step(10000);
  const k2 = await z(() => window.zomfy.crows());
  const wieder = k2.list.filter((c) => c.state === 'sitzt').length;
  if (sitzend.length >= 3 && aufgeflogen === 'fliegt' && k1.caws > k0.caws && wieder >= 3) note(`✓ Krähen: ${sitzend.length} sitzen, eine fliegt vor Mika krächzend auf, zwei Minuten später sitzen wieder ${wieder}`);
  else fail(`Krähen: ${JSON.stringify({ sitzend: sitzend.length, aufgeflogen, caws: [k0.caws, k1.caws], wieder })}`);

  // … auch vor einem Schlurfer; abends ziehen alle in den Wald
  const k3 = await z(() => window.zomfy.crows());
  const opfer = k3.list.find((c) => c.state === 'sitzt' && Math.hypot(c.x - 12.0, c.z - 6.5) > 4);
  let vorSchlurfer = 'keine Krähe';
  if (opfer) {
    await z(([x, zz]) => {
      window.zomfy.setHorde(true);
      window.zomfy.spawnZombie('schlurfer', x + 1.2, zz + 0.4);
    }, [opfer.x, opfer.z]);
    await step(300);
    vorSchlurfer = (await z(() => window.zomfy.crows())).list.find((c) => c.id === opfer.id).state;
  }
  await z(() => {
    window.zomfy.killAllZombies();
    window.zomfy.setHorde(false);
    window.zomfy.setTime(19, 0);
  });
  await step(8000);
  const abends = (await z(() => window.zomfy.crows())).list.map((c) => c.state);
  if (vorSchlurfer === 'fliegt' && abends.every((s) => s === 'weg')) note('✓ Krähen: fliegen auch vor Schlurfern auf, abends sind alle im Wald');
  else fail(`Krähen: vor dem Schlurfer ${vorSchlurfer}, abends ${abends.join(', ')}`);

  // Bild: Bucht am Vormittag mit Krähen, Pilzen, Kürbissen und Schilf
  await z(() => {
    window.zomfy.setTime(10, 30);
    window.zomfy.teleport(-3.5, 6.5, Math.PI);
    const cr = window.zomfy.game.world.crows;
    for (const c of cr.list) cr.leave(c, true);
    const at = (x, zz) => cr.perches.find((p) => Math.abs(p.x - x) < 0.3 && Math.abs(p.z - zz) < 0.3);
    cr.sit(cr.list[0], at(-6.19, 5.25));
    cr.sit(cr.list[1], at(-2.5, 3.5));
    cr.sit(cr.list[2], at(-0.75, 6.5));
  });
  await step(300);
  await picture('herbst');

  // Gesichter: Aua bei einem Treffer, froh nach einem Fund, müde spät in der Nacht
  const gesicht = () => z(() => window.zomfy.game.player.faceShown);
  await z(() => window.zomfy.game.combat.hurt(1));
  await step(60);
  const aua = await gesicht();
  await step(3000);
  await z(() => {
    const p = window.zomfy.game.player.position;
    window.zomfy.game.collectLoot('holz', p.x, 0.2, p.z);
  });
  await step(60);
  const froh = await gesicht();
  await z(() => window.zomfy.setTime(23, 30));
  await step(2500);
  const muede = await gesicht();
  await z(() => window.zomfy.setTime(10, 0));
  await step(200);
  if (aua === 'aua' && froh === 'froh' && muede === 'muede') note('✓ Gesicht: Aua bei einem Treffer, froh nach einem Fund, müde spät in der Nacht');
  else fail(`Gesicht: ${JSON.stringify({ aua, froh, muede })}`);

  // Überlebende lächeln, wenn Mika bei ihnen steht
  await z(() => window.zomfy.setSurvivor('bert', 2));
  await step(300);
  const bert = await z(() => window.zomfy.npcPos('bert'));
  const lacht = async (dz) => {
    await z(([x, zz]) => window.zomfy.teleport(x + 0.3, zz, Math.PI), [bert.x, bert.z + dz]);
    await step(800);
    return z(() => window.zomfy.game.survivors.npcs.list.get('bert').model.parts.faces.froh.visible);
  };
  const nah = await lacht(2.0);
  const weit = await lacht(6.0);
  if (nah && !weit) note('✓ Überlebende: Bert lächelt, wenn Mika bei ihm steht, sonst nicht');
  else fail(`Überlebende lächeln nicht richtig: nah ${nah}, weit ${weit}`);

  checkMessages(session);
  await session.context.close();
}

/**
 * Nachbesserung nach der Testrunde m12-r1: Ein ungelesener Morgenbericht kommt
 * nach dem Neuladen wieder (und klebt nicht), die Haustür zeigt »Hineingehen«
 * und E geht hinein, fehlt Stein, zeigt das Ziel zu den Kieseln, der erste
 * Turm zählt nur am Weg der Horde, wenig Leben warnt (Herzschlag, Gedanke),
 * das Zuhause warnt nachts groß, die Perk-Wahl wartet auf das Ende der Welle
 * und nimmt keinen Kampf-Klick, die Wege haben Fackeln und leuchten nachts.
 */
async function runFixChecks(browser, url) {
  const session = await openGame(browser, `${url}index.html?test&nosave&playtest`, 'Nachbesserung m12-r1');
  const { page } = session;
  const z = (fn, arg) => page.evaluate(fn, arg);
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  const view = () => z(() => window.zomfyView());
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde', 'ruheHinweis', 'introGesehen', 'ersterTurm']) window.zomfy.setFlag(f);
    window.zomfy.setHorde(false);
    window.zomfy.setTime(10, 0);
  });
  await step(100);

  // Morgenbericht: nach dem Neuladen und »Weiterspielen« wieder offen, nicht nur gezeichnet
  const bericht = await z(() => {
    const g = window.zomfy.game;
    g.state.report = { n: 1, won: true, kills: 3, loot: {}, homeLost: 0, fell: false, homeNow: 300, homeMax: 300, preLoss: 0, losses: null, damaged: null, broken: 0 };
    g.mode = 'title';
    g.title.open(true);
    g.startFromTitle();
    return { mode: g.mode, offen: g.report.isOpen };
  });
  await page.keyboard.press('Enter');
  await step(600);
  await page.keyboard.press('Enter');
  await step(100);
  const nachBericht = await z(() => ({ mode: window.zomfy.mode, offen: window.zomfy.game.report.isOpen, bericht: window.zomfy.state().report }));
  if (bericht.mode === 'report' && bericht.offen && nachBericht.mode === 'play' && !nachBericht.offen && !nachBericht.bericht) note('✓ Morgenbericht: nach dem Neuladen wieder offen, Enter schließt ihn');
  else fail(`Morgenbericht nach dem Neuladen: ${JSON.stringify({ bericht, nachBericht })}`);

  // Haustür: Hinweis und E geht hinein
  await z(() => {
    const d = window.zomfy.interior().outsideDoor;
    window.zomfy.teleport(d.x, d.z + 0.1, Math.PI);
  });
  await step(200);
  const tuer = (await view()).hinweis;
  await page.keyboard.press('KeyE');
  await step(800);
  const drin = await z(() => window.zomfy.interior().inside);
  if (tuer === 'Hineingehen' && drin) note('✓ Haustür: „Hineingehen“ steht dran, E geht hinein');
  else fail(`Haustür: Hinweis „${tuer}“, drinnen ${drin}`);

  // Kein Stein für die Werkbank: Das Ziel zeigt zu den Kieseln
  await z(() => {
    const d = window.zomfy.interior().outsideDoor;
    window.zomfy.teleport(d.x, d.z + 1.5, 0);
    for (const f of ['ziel_axt', 'ziel_turm', 'ziel_nacht', 'ziel_haendler']) window.zomfy.setFlag(f);
    window.zomfy.game.state.inventory.stein = 0;
  });
  await step(300);
  const zielKiesel = await z(() => ({ text: window.zomfy.game.goal?.text, hin: window.zomfy.game.goalTarget(), kiesel: window.zomfy.game.world.resources.nodes.filter((n) => n.kind === 'kiesel').map((n) => [n.x, n.z]) }));
  const zeigtAufKiesel = zielKiesel.hin && zielKiesel.kiesel.some(([x, zz]) => x === zielKiesel.hin.x && zz === zielKiesel.hin.z);
  if (/Kiesel/.test(zielKiesel.text || '') && zeigtAufKiesel) note(`✓ Ziel: ohne Stein „${zielKiesel.text}“, der Pfeil zeigt auf Kiesel`);
  else fail(`Kiesel-Ziel: ${JSON.stringify(zielKiesel)}`);

  // Erster Turm: zählt nur, wenn sein Kreis den Weg der Horde erreicht
  const turmZiel = await z(() => {
    const g = window.zomfy.game;
    delete g.state.flags.ziel_turm;
    window.zomfy.give({ schrott: 40 });
    const weit = window.zomfy.build('bolzen', 11, -2);
    g.updateGoals(true);
    const nachWeit = Boolean(g.state.flags.ziel_turm);
    // Ein freies Feld neben dem letzten Wegstück, von dem aus der Turm die Horde erreicht
    let nah = 'kein Feld';
    for (let i = -12; i <= -2 && nah !== 'ok'; i++) {
      for (let j = -4; j <= 6 && nah !== 'ok'; j++) {
        if (window.zomfy.placeCheck('bolzen', i, j).ok && g.world.pathing.covers(i + 0.5, j + 0.5, 5.5)) nah = window.zomfy.build('bolzen', i, j);
      }
    }
    g.updateGoals(true);
    return { weit, nachWeit, nah, nachNah: Boolean(g.state.flags.ziel_turm) };
  });
  if (turmZiel.weit === 'ok' && !turmZiel.nachWeit && turmZiel.nah === 'ok' && turmZiel.nachNah) note('✓ Turm-Ziel: ein Turm fern der Horde zählt nicht, einer am Weg schon');
  else fail(`Turm-Ziel: ${JSON.stringify(turmZiel)}`);

  // Wenig Leben: Herzschlag und ein Gedanke
  await z(() => {
    window.zomfy.game.state.player.hp = Math.round(window.zomfy.maxHp() * 0.2);
    window.zomfy.game.dizzy = false;
  });
  await step(500);
  const schwach = await z(() => ({ gedanke: window.zomfyView().gedanke, herz: window.zomfy.game.heartT }));
  await z(() => {
    window.zomfy.game.state.player.hp = window.zomfy.maxHp();
  });
  if (/schwindelig/.test(schwach.gedanke || '') && schwach.herz > 0) note('✓ Wenig Leben: Herzschlag und „Mir wird schwindelig …“');
  else fail(`Wenig Leben: ${JSON.stringify(schwach)}`);

  // Zuhause nachts unter der Hälfte: großes Banner
  await z(() => window.zomfy.setTime(21, 0));
  await step(200);
  const banner = await z(() => {
    const g = window.zomfy.game;
    // Die Nacht als laufend markieren (die Horde bleibt aus)
    Object.assign(g.state.night, { n: g.state.time.day, done: false });
    const max = g.state.world.homeHp;
    g.state.world.homeHp = max * 0.45;
    g.onHouseHit(1, { x: -2, z: -4, day: false });
    return { banner: window.zomfyView().banner, aktiv: g.nights.active };
  });
  await z(() => {
    window.zomfy.game.state.night.done = true;
    window.zomfy.setHomeHp(300);
  });
  if (banner.aktiv && /wankt/.test(banner.banner || '')) note(`✓ Zuhause: nachts unter der Hälfte das Banner „${banner.banner}“`);
  else fail(`Zuhause-Warnung: ${JSON.stringify(banner)}`);

  // Fackeln an den Wegen, nachts mit Eigenlicht
  const wege = await z(() => ({ fackeln: window.zomfy.game.world.props.torches.length, glut: window.zomfy.game.world.groundMaterial.emissiveIntensity }));
  if (wege.fackeln >= 4 && wege.glut > 0.1) note(`✓ Wege: ${wege.fackeln} Fackeln, nachts leuchtet der Weg (${wege.glut.toFixed(2)})`);
  else fail(`Wege nachts: ${JSON.stringify(wege)}`);

  // Jäger um eine Barrikadenreihe (Kira): Wer Mika um das Ende der Reihe gejagt hat,
  // kehrt danach vor die Reihe zurück – vorher stand er dahinter auf dem Weg zum Haus
  const umweg = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    for (const t of [...g.world.buildings.towers]) g.builder.demolish(t.id); // Türme schössen die Jäger ab
    Z.setTime(12, 0);
    Z.give({ holz: 30 });
    const col = Z.pathColumn(-14);
    let reihe = 0;
    for (const j of col) if (Z.build('barrikade', -14, j, 1) === 'ok') reihe++;
    // Die Reihe hält während der Prüfung (sonst zählt ein Durchbruch als Umweg)
    for (const b of g.world.buildings.list) if (b.type === 'barrikade') b.hp = 5000;
    const mid = Z.pathColumn(-19);
    return { col, reihe, start: mid[Math.floor(mid.length / 2)] };
  });
  const amEnde = { x: -12.5, z: Math.min(...umweg.col) - 1.2 }; // neben dem Ende der Reihe, auf der Hausseite
  await z((a) => {
    window.zomfy.teleport(a.m.x, a.m.z, -Math.PI / 2);
    for (let k = 0; k < 3; k++) window.zomfy.spawnZombie('schlurfer', -19 - k * 0.6, a.j + 0.5 + (k % 2) * 0.6);
  }, { m: amEnde, j: umweg.start });
  let herum = 0;
  for (let t = 0; t < 10; t++) {
    await z((m) => {
      window.zomfy.setPlayerHp(window.zomfy.maxHp());
      window.zomfy.teleport(m.x, m.z, -Math.PI / 2);
    }, amEnde);
    await step(1000);
    herum = Math.max(herum, await z(() => window.zomfy.zombies().filter((q) => q.x > -13.5).length));
  }
  await z(() => window.zomfy.teleport(5.5, -3, 0)); // Mika geht weg: Die Jagd endet
  let zurueck = 0;
  let weiter = 0; // Richtung Haus an der Reihe vorbei
  let r = null;
  for (let t = 0; t < 16; t++) {
    await step(500);
    r = await z(() => ({ zs: window.zomfy.zombies(), broken: window.zomfy.buildings().filter((b) => b.type === 'barrikade' && b.broken).length }));
    zurueck += r.zs.filter((q) => q.state === 'rejoin').length;
    weiter = Math.max(weiter, r.zs.filter((q) => q.x > -11.5).length);
  }
  const vorn = r.zs.length > 0 && r.zs.every((q) => q.x < -13.2);
  await z(() => window.zomfy.killAllZombies());
  if (umweg.reihe === umweg.col.length && herum > 0 && zurueck > 0 && weiter === 0 && vorn && r.broken === 0) note(`✓ Horde: Jäger laufen um die Barrikadenreihe zu Mika, danach zurück vor die Reihe – keiner zieht dahinter zum Haus weiter`);
  else fail(`Jäger um die Reihe: ${JSON.stringify({ umweg, herum, zurueck, weiter, vorn, danach: r })}`);

  // E-Durchdrücken (Jonas, Kira): Direkt nach einem Dialog öffnet ein schneller Druck
  // nichts Neues – ein bewusster Druck etwas später schon
  await z(() => window.zomfy.teleport(1.75, -5.2, Math.PI)); // am Hackklotz
  await step(300);
  await page.keyboard.press('KeyE');
  await step(100);
  const dialogAuf = await z(() => window.zomfy.mode);
  for (let k = 0; k < 20 && (await z(() => window.zomfy.mode)) === 'dialog'; k++) {
    await page.keyboard.press('KeyE');
    await step(60);
  }
  await page.keyboard.press('KeyE'); // gleich hinterher gehämmert
  await step(60);
  const gehaemmert = await z(() => window.zomfy.mode);
  await step(800);
  await page.keyboard.press('KeyE');
  await step(100);
  const bewusst = await z(() => window.zomfy.mode);
  await z(() => window.zomfy.finishDialog());
  await step(100);
  if (dialogAuf === 'dialog' && gehaemmert === 'play' && bewusst === 'dialog') note('✓ E: nach einem Dialog öffnet schnelles Weiterdrücken nichts, ein bewusster Druck schon');
  else fail(`E nach dem Dialog: ${JSON.stringify({ dialogAuf, gehaemmert, bewusst })}`);

  // Über die eigene Barrikadenreihe klettert Mika (Mira: sie blieb nachts darin hängen),
  // die Horde bleibt weiter davor (siehe oben)
  const klettern = await z((col) => {
    const Z = window.zomfy;
    const j = col[Math.floor(col.length / 2)] + 0.5;
    const ende = Z.probeWalk(-15.5, j, 1, 0, 60);
    const g = Z.game;
    g.player.place(-14.5, j, 0);
    let hoch = 0;
    for (let k = 0; k < 12; k++) {
      g.player.update(1 / 30, { x: 1, z: 0 }, false);
      hoch = Math.max(hoch, g.player.position.y);
    }
    return { x: ende && ende.x, hoch };
  }, umweg.col);
  if (klettern.x > -12.8 && klettern.hoch > 0.15) note(`✓ Barrikaden: Mika klettert über die eigene Reihe (bis x ${klettern.x.toFixed(1)}, ${klettern.hoch.toFixed(2)} m hoch)`);
  else fail(`Klettern: ${JSON.stringify(klettern)}`);

  // Drinnen steckt Mika das Werkzeug weg (Mira: die Axt ragte durch die Wand)
  const werkzeug = await z(() => {
    const Z = window.zomfy;
    const g = Z.game;
    g.player.heldTool = 'axt';
    const vis = () => Object.entries(g.player.character.tools).filter(([, m]) => m.visible).map(([n]) => n);
    g.player.update(1 / 30, { x: 0, z: 0 }, false);
    const draussen = vis();
    const w = Z.wakeSpot();
    Z.teleport(w.x, w.z, 0);
    g.player.update(1 / 30, { x: 0, z: 0 }, false);
    const drinnen = vis();
    const d = Z.interior().outsideDoor;
    Z.teleport(d.x, d.z + 1.2, 0);
    return { draussen, drinnen };
  });
  await step(100);
  if (werkzeug.draussen.includes('axt') && werkzeug.drinnen.length === 0) note('✓ Werkzeug: draußen in der Hand, drinnen weggesteckt');
  else fail(`Werkzeug drinnen: ${JSON.stringify(werkzeug)}`);

  checkMessages(session);
  await session.context.close();
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
