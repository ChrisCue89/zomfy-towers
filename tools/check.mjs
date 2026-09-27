// Prüfablauf für Zomfy Towers (siehe CLAUDE.md).
//
//   node tools/check.mjs            volle Prüfung im Headless-Browser
//   node tools/check.mjs --syntax   nur Syntax aller Module
//   node tools/check.mjs --nur=nahkampf,naechte
//                                   nur einzelne Abschnitte (rundgang, speichern,
//                                   bauen, naechte, nahkampf, hd)
//
// Die volle Prüfung startet einen lokalen Server, öffnet das Spiel in
// Headless-Chromium, sammelt alle Konsolenmeldungen, macht Screenshots nach
// screenshots/, prüft Speichern/Laden, Sammeln und Bauen, Türme, Horde und
// Nächte und misst Bildzeiten.

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
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
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

    // --- 4. Meilenstein 3: Türme, Horde, Loot, Nächte ---------------------------------
    if (want('naechte')) await runNightChecks(browser, url);

    // --- 5. Meilenstein 4: Nahkampf, Waffen, Ausweichen, Perks -------------------------
    if (want('nahkampf')) await runCombatChecks(browser, url);

    // --- 6. Meilenstein 6: Überlebende, Zelte, Einrichten, Funkturm ---------------------
    if (want('ueberlebende')) await runSurvivorChecks(browser, url);

    // --- 7. Große Auflösung (Full HD) --------------------------------------------------
    if (want('hd')) {
      const hd = await openGame(browser, `${url}index.html?test&nosave&time=21:15`, 'Full HD', { viewport: { width: 1920, height: 1080 } });
      await shot(hd.page, 'nacht-fullhd', () => {
        window.zomfy.setHorde(false);
        window.zomfy.setFlag('abendHinweis');
        window.zomfy.finishDialog();
        window.zomfy.teleport(2.25, -0.75, 0.5);
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
    await intro.page.waitForFunction(() => window.zomfy.mode === 'dialog', null, { timeout: 60000 });
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
      window.zomfy.toggleLantern();
    });
    const nightStats = await page.evaluate(() => window.zomfy.stats());
    await shot(page, 'innen-nacht', () => {
      window.zomfy.setTime(22, 45);
      window.zomfy.toggleLantern();
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
      window.zomfy.teleport(1.5, 2, 0); // vor dem Fenster – bei x = 0 führt die Türhilfe ins Haus
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
      window.zomfy.answer(0); // „Bis zum Abend ausruhen“ (vorgewählt ist „Weitermachen“)
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
              for (const minute of [60, 720, 900]) {
                for (const schrott of [0, 99]) collect(d({ flags, time: { day, minute }, inventory: { schrott } }));
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
    // --- 2. Speichern und Laden -----------------------------------------------------
    const saveUrl = `${url}index.html?test`;
    const first = await openGame(browser, saveUrl, 'Speichern', { init: () => {
      if (!sessionStorage.getItem('zomfy-check-cleared')) {
        localStorage.clear();
        sessionStorage.setItem('zomfy-check-cleared', '1');
      }
    } });
    await first.page.evaluate(() => {
      window.zomfy.setHorde(false);
      window.zomfy.setTime(15, 30);
      window.zomfy.teleport(-1.375, -4.125, 3.14);
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
    await first.page.waitForFunction(() => window.zomfy.mode !== 'sleep', null, { timeout: 60000 });
    const saved = await first.page.evaluate(() => JSON.parse(localStorage.getItem('zomfy-towers.spielstand') || 'null'));
    if (saved && saved.time.day === 2 && saved.version === 5) note('✓ Schlafen: Tag 2 begonnen und gespeichert');
    else fail(`Schlafen: kein gültiger Spielstand nach dem Schlafen (${JSON.stringify(saved)})`);
    const bericht = await first.page.evaluate(() => window.zomfy.mode);
    if (bericht === 'report') note('✓ Morgenbericht: nach dem Aufwachen zeigt er die Nacht');
    else fail(`Morgenbericht: Modus „${bericht}“ statt „report“`);
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
  await z(() => window.zomfy.teleport(-5.25, -0.1, Math.PI));
  await settle(page, 3);
  await page.keyboard.press('KeyE');
  await settle(page, 3);
  await z(() => window.zomfy.finishDialog());
  let st = await state();
  if (st.tools.axt && st.hotbar.slots[0] === 'axt') note('✓ Axt: mit E vom Hackklotz genommen, liegt in der Schnellleiste');
  else fail(`Axt: nicht genommen (${JSON.stringify(st.tools)}, ${JSON.stringify(st.hotbar)})`);

  // Baum fällen: E gedrückt halten, bis er fällt
  await z(() => window.zomfy.teleport(-6.85, -2.75, -Math.PI / 2));
  await settle(page, 3);
  const holzVorher = st.inventory.holz;
  await page.keyboard.down('KeyE');
  await page.waitForFunction(() => window.zomfy.state().world.nodes['jung-1'], null, { timeout: 60000 }).catch(() => {});
  await page.keyboard.up('KeyE');
  st = await state();
  if (st.world.nodes['jung-1'] && st.inventory.holz === holzVorher + 6) note(`✓ Sammeln: E halten fällt den Baum (+6 Holz, wächst bis Tag ${st.world.nodes['jung-1'].until} nach)`);
  else fail(`Sammeln: Baum nicht gefällt oder falscher Ertrag (Holz ${holzVorher} -> ${st.inventory.holz})`);

  // Felsen ohne Spitzhacke: nichts passiert
  await z(() => window.zomfy.teleport(11.2, 2.25, Math.PI / 2));
  await settle(page, 3);
  const steinVorher = st.inventory.stein;
  await z(() => window.zomfy.interact('felsen-1'));
  await settle(page, 30);
  st = await state();
  if (st.inventory.stein === steinVorher) note('✓ Werkzeug: ohne Spitzhacke gibt der Felsen nichts her');
  else fail('Werkzeug: Felsen ließ sich ohne Spitzhacke abbauen');

  // Schrott durchsuchen: einmal am Tag
  await z(() => window.zomfy.teleport(-11.3, 9.0, -Math.PI / 2));
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

  // Barrikade mit der Maus: Kachel anklicken, dann auf ein Feld klicken
  await z(() => window.zomfy.teleport(5.5, 0.5, 0));
  await settle(page, 20);
  const tile = await z(() => {
    const L = window.zomfy.buildbarLayout();
    const t = L.tiles.find((x) => x.id === 'barrikade');
    return t;
  });
  await page.mouse.click(tile.x, tile.y);
  await settle(page, 3);
  const target = await z(() => window.zomfy.screenOf(6.5, 0, 3.5));
  await page.mouse.move(target.x, target.y);
  await settle(page, 3);
  await page.mouse.click(target.x, target.y);
  await settle(page, 3);
  const perMaus = (await z(() => window.zomfy.buildings())).find((b) => b.type === 'barrikade');
  if (perMaus && perMaus.i === 6 && perMaus.j === 3) note('✓ Platzieren mit der Maus: Barrikade landet genau auf dem angeklickten Feld');
  else fail(`Platzieren mit der Maus: ${JSON.stringify(perMaus)} statt Feld (6, 3)`);
  await page.mouse.click(target.x, target.y, { button: 'right' });
  await settle(page, 3);

  // Belegte Felder, Abreißen: Barrikaden sind Verteidigung und geben 70 % zurück
  const aufsHaus = await z(() => window.zomfy.build('barrikade', 0, -4));
  if (aufsHaus === 'belegt') note('✓ Raster: Haus und Hindernisse sind nicht bebaubar');
  else fail(`Raster: Bau auf dem Haus ergab „${aufsHaus}“`);
  const holzVorAbriss = (await state()).inventory.holz;
  await z((id) => window.zomfy.demolish(id), perMaus?.id);
  const holzNachAbriss = (await state()).inventory.holz;
  if (holzNachAbriss === holzVorAbriss + 2) note('✓ Abreißen: Barrikade gibt 70 % zurück (2 von 3 Holz)');
  else fail(`Abreißen: Holz ${holzVorAbriss} -> ${holzNachAbriss}`);

  // Spitzhacke an der Werkbank, dann Felsen abbauen
  await z(() => window.zomfy.give({ schrott: 2 }));
  const hacke = await z(() => window.zomfy.craft('spitzhacke'));
  st = await state();
  if (hacke && st.tools.spitzhacke && st.hotbar.slots.includes('spitzhacke')) note('✓ Werkbank: Spitzhacke hergestellt');
  else fail('Werkbank: Spitzhacke nicht hergestellt');
  await z(() => window.zomfy.teleport(11.2, 2.25, Math.PI / 2));
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
  await settle(page, 5);
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
  if (steinVorVerwerten - nachTippen === 3 && verwertet >= 3 && verwertet % 3 === 0) note(`✓ Werkbank: kurzer Druck verwertet einmal (3 Stein), gehaltenes E macht weiter (${verwertet} Stein)`);
  else fail(`Werkbank: Stein ${steinVorVerwerten} -> nach kurzem E ${nachTippen} -> nach gehaltenem E ${nachHalten}`);
  await settle(page, 25);
  await page.screenshot({ path: join(SHOTS, 'werkbank.png') });
  note('  Screenshot: screenshots/werkbank.png');
  await page.keyboard.press('Escape');
  await settle(page, 3);

  // Bauvorschau als Bild
  await shot(page, 'bauen', () => {
    for (const [i, j] of [[7, 2], [8, 2], [9, 2]]) window.zomfy.build('barrikade', i, j);
    window.zomfy.build('laternenpfahl', 6, 4);
    window.zomfy.teleport(6.0, 0.6, 0.4);
    window.zomfy.give({ holz: 3 });
    window.zomfy.startPlacement('barrikade');
  });
  await z(() => window.zomfy.cancelBuild());

  // Hausausbau zur Hütte
  await z(() => {
    window.zomfy.give({ holz: 30, stein: 16, stoff: 6, schrott: 8 });
    window.zomfy.upgradeHouse();
  });
  await page.waitForFunction(() => window.zomfy.mode !== 'sleep', null, { timeout: 60000 });
  await z(() => window.zomfy.finishDialog());
  st = await state();
  if (st.world.houseLevel === 2 && st.world.homeHp === 450) note('✓ Zuhause: zur Hütte ausgebaut, Standfestigkeit 450');
  else fail(`Zuhause: Stufe ${st.world.houseLevel}, Standfestigkeit ${st.world.homeHp}`);
  // Laufen gegen die neue Anbau-Wand (von der Veranda aus nach Norden)
  await z(() => window.zomfy.teleport(4.0, -1.95, Math.PI));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(900);
  await page.keyboard.up('KeyW');
  await settle(page, 3);
  st = await state();
  if (st.player.z > -2.45) note('✓ Kollision: Anbau der Hütte ist fest');
  else fail(`Kollision: Figur ist bei z=${st.player.z.toFixed(2)} in den Anbau gelaufen`);
  await shot(page, 'huette', () => {
    window.zomfy.setTime(17, 10);
    window.zomfy.teleport(2.6, -0.9, 0.3);
  });
  await shot(page, 'huette-nacht', () => {
    window.zomfy.setTime(22, 40);
    window.zomfy.teleport(4.5, 3.0, 0.8);
    window.zomfy.toggleLantern();
  });
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
    window.zomfy.build('barrikade', 6, 2);
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
  if (migriert.version === 5 && migriert.time.day === 3 && migriert.inventory.zahnraeder === 2 && !migriert.hotbar.slots.includes('laterne') && migriert.world.houseLevel === 1 && migriert.world.homeHp === 300) {
    note('✓ Migration: Spielstand v1 wird zu v5 (Technik -> Zahnräder, Laterne auf F, Zuhause 300)');
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
  if (v3.version === 5 && v3.time.day === 4 && v3.player.hp === 100 && v3.player.level === 1 && v3.world.homeHp === 300 && v3.world.buildings.length === 1 && v3.inventory.schrott === 9) {
    note('✓ Migration: Spielstand v2 wird zu v5 (Leben, Zuhause, Bauten bleiben, Stufe 1)');
  } else fail(`Migration v2: ${JSON.stringify(v3)}`);
  checkMessages(v2);
  await v2.context.close();
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
    window.zomfy.teleport(-3, 1.5, 0);
    window.zomfy.give({ schrott: 60, zahnraeder: 2, holz: 10 });
  });
  await step(100);

  // Tagsüber nagen Schlurfer das Zuhause höchstens bis zur Hälfte an
  await z(() => {
    window.zomfy.setHomeHp(160);
    window.zomfy.spawnZombie('brummer', 3.2, -6.4);
  });
  await step(8000);
  const tagHp = (await state()).world.homeHp;
  await z(() => {
    window.zomfy.setHorde(false); // räumt ohne Abschuss und Loot ab
    window.zomfy.setHorde(true);
    window.zomfy.setHomeHp(300);
    window.zomfy.teleport(-3, 1.5, 0);
  });
  await step(1500);
  if (tagHp >= 150 && tagHp < 160) note(`✓ Tagsüber: Schlurfer nagen das Zuhause höchstens bis zur Hälfte an (${Math.round(tagHp)}/300)`);
  else fail(`Tagsüber: Zuhause ${tagHp}/300 (erwartet 150 bis 159)`);

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

  // Ein Bau, der der Horde den letzten Weg abschneidet, wird abgelehnt
  const weg = await z(() => {
    const e = window.zomfy.debugPath().entries[0];
    return window.zomfy.build('barrikade', Math.floor(e.x), Math.floor(e.z));
  });
  if (weg === 'weg') note('✓ Wege: Bau auf dem letzten Weg der Horde wird abgelehnt');
  else fail(`Wege: Bau auf dem Waldpfad ergab „${weg}“ statt „weg“`);

  // Der Turm erledigt einen Schlurfer, der Loot fallen lässt
  if (turm) {
    // Mika geht aus dem Sammelradius, sonst fliegt das Loot sofort heran
    await z((t) => {
      window.zomfy.teleport(t.i + 4, t.j + 0.5, 0);
      window.zomfy.spawnZombie('schlurfer', t.i - 3.5, t.j + 0.5);
    }, turm);
    let kills = 0;
    for (let k = 0; k < 24 && !kills; k++) {
      await step(500);
      kills = (await state()).stats.kills || 0;
    }
    const loot = await z(() => window.zomfy.lootItems());
    if (kills === 1 && loot.length) note(`✓ Türme: Bolzenwerfer erledigt einen Schlurfer, Loot liegt am Boden (${loot.map((l) => l.res).join(', ')})`);
    else fail(`Türme: ${kills} Abschüsse, ${loot.length} Loot`);

    // Liegt die Beute außerhalb des Bildes, zeigt eine Raute am Rand hin
    await z((l) => window.zomfy.teleport(l.x + 13, l.z, 0), loot[0] || { x: 0, z: 0 });
    await step(300);
    const marken = (await z(() => window.zomfyView())).randMarken || [];
    if (marken.some((m) => m.startsWith('beute'))) note(`✓ Loot: außerhalb des Bildes zeigt eine Randmarke hin (${marken.join(', ')})`);
    else fail(`Loot: keine Randmarke (${JSON.stringify(marken)})`);

    // Einsammeln: hinlaufen reicht, der Magnet zieht es heran
    const vorher = (await state()).inventory.schrott;
    if (loot.length) await z((l) => window.zomfy.teleport(l.x + 0.8, l.z, 0), loot[0]);
    await step(2000);
    const nachher = (await state()).inventory.schrott;
    const liegt = (await z(() => window.zomfy.lootItems())).length;
    if (nachher > vorher && liegt < loot.length) note(`✓ Loot: im Sammelradius eingesammelt (Schrott ${vorher} → ${nachher})`);
    else fail(`Loot: nicht eingesammelt (Schrott ${vorher} → ${nachher}, liegt noch ${liegt})`);

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
  await z(() => window.zomfy.teleport(-4, 0.5, 0));
  await page.keyboard.press('KeyQ');
  await step(600);
  await page.screenshot({ path: join(SHOTS, 'turm-bauen.png') });
  note('  Screenshot: screenshots/turm-bauen.png');
  await page.keyboard.press('Escape');
  await step(100);

  // Nacht 1: drei Türme ums Haus, die Horde kommt um 20:30 in Wellen
  const staffel = await z(() => {
    const vor = window.zomfy.state().inventory.schrott;
    window.zomfy.build('bolzen', -7, -4);
    const zweiter = vor - window.zomfy.state().inventory.schrott;
    window.zomfy.build('bolzen', 1, -9);
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
  // Bild: ein Trupp kommt von Süden aufs Haus zu und läuft den Türmen vor die Bolzen
  await z(() => {
    for (let k = 0; k < 5; k++) window.zomfy.spawnZombie(k === 2 ? 'brummer' : 'schlurfer', -5.5 + k * 1.6, 6.2 + (k % 2) * 0.6);
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
  const vorVerlust = await state();
  await z(() => {
    window.zomfy.setTime(20, 28);
    window.zomfy.teleport(6, 4, 0);
  });
  await step(3000);
  await z(() => {
    window.zomfy.setHomeHp(3);
    window.zomfy.spawnZombie('brummer', -3.2, -6.6);
    window.zomfy.spawnZombie('brummer', 3.2, -6.6);
  });
  for (let k = 0; k < 30; k++) {
    await step(1000);
    const m = await z(() => window.zomfy.mode);
    if (m === 'report') break;
  }
  const verloren = await state();
  const bericht2 = (await z(() => window.zomfyView())).bericht || [];
  const schrottWeg = vorVerlust.inventory.schrott - verloren.inventory.schrott;
  if (verloren.stats.nightsLost === 1 && verloren.time.day === 3 && schrottWeg > 0 && verloren.world.homeHp > 0 && bericht2.length) {
    note(`✓ Verlorene Nacht: ${schrottWeg} Schrott weg, Zuhause wieder ${verloren.world.homeHp}, Tag 3 beginnt (${bericht2[0]})`);
  } else fail(`Verlorene Nacht: ${JSON.stringify({ lost: verloren.stats.nightsLost, day: verloren.time.day, schrottWeg, home: verloren.world.homeHp, bericht2 })}`);
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
  if (knopf && knopf.visible && Math.hypot(knopf.x + 1.2, knopf.z - 8.2) < 1) note('✓ Ankunft: an Tag 2 sitzt Knopf am Briefkasten');
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
  const zelt = await z(() => window.zomfy.build('zelt', -7, 3));
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
  for (const [i, j] of [[-10, 3], [-7, 6], [-10, 6], [4, 6]]) {
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
    await page.screenshot({ path: join(SHOTS, `${name}.png`) });
    note(`  Screenshot: screenshots/${name}.png`);
  };
  await snap('ueberlebende', () => {
    window.zomfy.setSurvivor('bert', 2);
    window.zomfy.setSurvivor('yusuf', 2);
    window.zomfy.setTime(11, 0);
    window.zomfy.teleport(2.4, 4.4, 0);
  });
  await snap('einrichten', () => {
    window.zomfy.setTime(21, 30);
    window.zomfy.teleport(-0.2, -3.2, 0);
  });

  // Knopf bellt vor der Welle
  await z(() => {
    window.zomfy.setHorde(true);
    window.zomfy.setTime(20, 10);
    window.zomfy.teleport(0.5, 2.5, 0);
  });
  let bellt = false;
  for (let k = 0; k < 30 && !bellt; k++) {
    await step(500);
    bellt = ((await view()).meldungen || []).some((m) => m.startsWith('Knopf bellt'));
  }
  if (bellt) note('✓ Knopf bellt kurz vor der ersten Welle und nennt die Richtung');
  else fail('Knopf hat vor der Welle nicht gebellt');
  await z(() => window.zomfy.setHorde(false));

  // Speichern und Laden
  await z(() => window.zomfy.save());
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  await z(() => {
    window.__zomfyHold = true;
  });
  const geladen = await z(() => window.zomfy.state());
  if (geladen.version === 5 && geladen.survivors.hilde.stage === 3 && geladen.world.furniture.length === 6 && geladen.world.tower === 3) note('✓ Speichern v5: Überlebende, Möbel und Funkturm bleiben nach dem Neuladen');
  else fail(`Speichern v5: ${JSON.stringify({ v: geladen.version, s: geladen.survivors, f: geladen.world.furniture, t: geladen.world.tower })}`);
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
  if (m.state.version === 5 && m.state.world.survivorsStart === 6 && Object.values(m.state.survivors).every((s) => s.stage === 0) && m.state.weapons.pfanne === 1) {
    note('✓ Migration: Spielstand v4 wird zu v5 (Überlebende kommen ab dem nächsten Tag, Waffen bleiben)');
  } else fail(`Migration v4: ${JSON.stringify(m.state)}`);
  checkMessages(v4);
  await v4.context.close();
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
  await z(() => window.zomfy.giveXp(30));
  await step(700);
  const wahl = await z(() => ({ mode: window.zomfy.mode, view: window.zomfyView().perkWahl }));
  await page.screenshot({ path: join(SHOTS, 'perks.png') });
  note('  Screenshot: screenshots/perks.png');
  await page.keyboard.press('Digit1');
  await step(100);
  const nachWahl = await state();
  if (wahl.mode === 'perk' && wahl.view?.length === 3 && Object.keys(nachWahl.perks).length === 1) note(`✓ Perks: Stufe ${nachWahl.player.level}, drei Karten, Taste 1 wählt (${Object.keys(nachWahl.perks)[0]})`);
  else fail(`Perks: Wahl ${JSON.stringify(wahl)}, danach ${JSON.stringify(nachWahl.perks)}`);
  // Weitere offene Wahl (mehrere Stufen auf einmal) gleich mit erledigen
  for (let k = 0; k < 4 && (await z(() => window.zomfy.mode)) === 'perk'; k++) {
    await step(600);
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

  // Speichern und Laden: Waffen, Stufe und Perks bleiben
  await z(() => window.zomfy.sleepNow());
  await page.waitForFunction(() => window.zomfy.mode !== 'sleep', null, { timeout: 60000 }).catch(() => {});
  for (let k = 0; k < 30 && (await z(() => window.zomfy.mode)) === 'sleep'; k++) await step(1000);
  const gespeichert = await state();
  await page.reload();
  await page.waitForFunction(() => window.zomfy && window.zomfy.ready, null, { timeout: 120000 });
  const geladen = await state();
  if (geladen.version === 5 && geladen.weapons.pfanne === 2 && geladen.player.level === gespeichert.player.level && Object.keys(geladen.perks).length >= 1) {
    note(`✓ Speichern v5: Waffen, Stufe ${geladen.player.level} und Perks bleiben nach dem Neuladen`);
  } else fail(`Speichern v4: vorher ${JSON.stringify({ w: gespeichert.weapons, l: gespeichert.player.level, p: gespeichert.perks })}, nachher ${JSON.stringify({ v: geladen.version, w: geladen.weapons, l: geladen.player.level, p: geladen.perks })}`);
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
