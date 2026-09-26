// Prüfablauf für Zomfy Towers (siehe CLAUDE.md).
//
//   node tools/check.mjs            volle Prüfung im Headless-Browser
//   node tools/check.mjs --syntax   nur Syntax aller Module
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
    // Einmalige Hinweis-Dialoge würden die Bilder verdecken; die Horde bleibt
    // für diese ruhigen Bilder im Wald (Nächte prüft Abschnitt 4).
    await page.evaluate(() => {
      window.zomfy.setFlag('abendHinweis');
      window.zomfy.setFlag('spaetHinweis');
      window.zomfy.setFlag('abendHorde');
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
    if (saved && saved.time.day === 2 && saved.version === 3) note('✓ Schlafen: Tag 2 begonnen und gespeichert');
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


    // --- 3. Meilenstein 2: Sammeln, Bauen, Werkbank, Hütte ---------------------------
    await runBuildChecks(browser, url);

    // --- 4. Meilenstein 3: Türme, Horde, Loot, Nächte ---------------------------------
    await runNightChecks(browser, url);

    // --- 5. Große Auflösung (Full HD) --------------------------------------------------
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

    note('');
    note('Leistung (Headless-Chromium mit Software-WebGL – echte GPUs sind um ein Vielfaches schneller):');
    note(`  Tag:   ${dayStats.frameMs.toFixed(1)} ms/Bild, ${dayStats.calls} Draw-Calls, ${Math.round(dayStats.triangles / 1000)}k Dreiecke, ${dayStats.width}×${dayStats.height} @${dayStats.scale}x`);
    note(`  Nacht: ${nightStats.frameMs.toFixed(1)} ms/Bild, ${nightStats.calls} Draw-Calls, ${Math.round(nightStats.triangles / 1000)}k Dreiecke`);
  } finally {
    await browser.close();
    server.close();
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

  // Werkbank-Menü: Verwerten nur mit gehaltenem E (ein kurzer Druck kostet nichts)
  await z(() => {
    window.zomfy.give({ stein: 3 });
    const bank = window.zomfy.buildings().find((b) => b.type === 'werkbank');
    window.zomfy.teleport(bank.i + 1, bank.j + 1.8, Math.PI);
    window.zomfy.interact(`bau-${bank.id}`);
  });
  await settle(page, 5);
  const steinVorVerwerten = (await state()).inventory.stein;
  for (const key of ['KeyS', 'KeyS', 'KeyE']) {
    await page.keyboard.press(key); // runter zu »Stein zu Schrott verwerten«, einmal kurz E
    await settle(page, 3);
  }
  const nachTippen = (await state()).inventory.stein;
  await page.keyboard.down('KeyE');
  await settle(page, 30);
  await page.keyboard.up('KeyE');
  await settle(page, 3);
  const nachHalten = (await state()).inventory.stein;
  const verwertet = steinVorVerwerten - nachHalten;
  if (nachTippen === steinVorVerwerten && verwertet >= 3 && verwertet % 3 === 0) note(`✓ Werkbank: kurzer Druck verwertet nichts, gehaltenes E schon (${verwertet} Stein zu Schrott)`);
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
  if (migriert.version === 3 && migriert.time.day === 3 && migriert.inventory.zahnraeder === 2 && !migriert.hotbar.slots.includes('laterne') && migriert.world.houseLevel === 1 && migriert.world.homeHp === 300) {
    note('✓ Migration: Spielstand v1 wird zu v3 (Technik -> Zahnräder, Laterne auf F, Zuhause 300)');
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
  if (v3.version === 3 && v3.time.day === 4 && v3.player.hp === 100 && v3.world.homeHp === 300 && v3.world.buildings.length === 1 && v3.inventory.schrott === 9) {
    note('✓ Migration: Spielstand v2 wird zu v3 (Leben, Zuhause, Bauten bleiben)');
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
  const step = (ms) => z((t) => window.__zomfyStep(t), ms);
  await z(() => {
    window.__zomfyHold = true;
    for (const f of ['abendHinweis', 'spaetHinweis', 'abendHorde']) window.zomfy.setFlag(f);
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

    // Ausbauen über die Auswahl: Q = Stufe 2, dann Q = Spezialisierung A
    await z((id) => window.zomfy.selectBuilding(id), turm.id);
    await step(100);
    await page.keyboard.press('KeyQ');
    await step(100);
    await page.keyboard.press('KeyQ');
    await step(100);
    const aus = (await z(() => window.zomfy.buildings())).find((b) => b.id === turm.id);
    if (aus?.level === 3 && aus?.spec === 'A') note('✓ Ausbau: Stufe 2, dann Spezialisierung A über die Bauleiste');
    else fail(`Ausbau: Turm steht auf ${JSON.stringify(aus)}`);

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
