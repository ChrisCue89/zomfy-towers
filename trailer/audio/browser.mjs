// Chromium-Brücke: kleiner statischer Server (Spielcode unter /game/, dieser Ordner unter /) und
// Aufrufe von window.renderTask(name, params) in audio.html. Liefert Stereo-Samples als Float32Array.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

function serve(gameDir) {
  const roots = [['/game/', resolve(gameDir)], ['/', HERE]];
  return new Promise((done) => {
    const server = http.createServer(async (req, res) => {
      try {
        let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        if (path.endsWith('/')) path += 'index.html';
        const [prefix, root] = roots.find(([p]) => path.startsWith(p));
        const file = normalize(join(root, path.slice(prefix.length)));
        if (!file.startsWith(root + sep)) return res.writeHead(403).end('Verboten');
        if (!(await stat(file)).isFile()) throw new Error('keine Datei');
        res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(await readFile(file));
      } catch {
        res.writeHead(404).end('Nicht gefunden');
      }
    });
    server.listen(0, '127.0.0.1', () => done({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}

const decode = (b64) => {
  const buf = Buffer.from(b64, 'base64');
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
};

export async function openBrowser(gameDir) {
  const { chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'));
  const srv = await serve(gameDir);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-gpu', '--mute-audio'] });
  const page = await browser.newPage();
  const problems = [];
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(`${srv.url}audio.html`);
  await page.waitForFunction(() => window.audioReady === true, null, { timeout: 60000 });
  return {
    problems,
    /** Aufgabe rechnen: { l, r, n, … } */
    async render(name, params = {}) {
      const r = await page.evaluate(([n, p]) => window.renderTask(n, p), [name, params]);
      if (r && r.ch) {
        r.l = decode(r.ch[0]);
        r.r = decode(r.ch[1]);
        delete r.ch;
      }
      return r;
    },
    async close() {
      await browser.close();
      srv.server.close();
    },
  };
}
