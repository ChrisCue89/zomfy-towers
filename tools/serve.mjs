// Kleiner statischer Server ohne Abhängigkeiten.
// Aufruf: node tools/serve.mjs [port]   (Standard 8080, 0 = freier Port)

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

export function createServer(root = ROOT) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let path = decodeURIComponent(url.pathname);
      if (path.endsWith('/')) path += 'index.html';
      const file = normalize(join(root, path));
      if (!file.startsWith(root + sep) && file !== root) {
        res.writeHead(403).end('Verboten');
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) throw new Error('keine Datei');
      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Nicht gefunden');
    }
  });
}

/** Server starten und {server, port, url} liefern. */
export function start(port = 0, root = ROOT) {
  return new Promise((resolvePromise) => {
    const server = createServer(resolve(root));
    server.listen(port, '127.0.0.1', () => {
      const actual = server.address().port;
      resolvePromise({ server, port: actual, url: `http://127.0.0.1:${actual}/` });
    });
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 8080);
  start(port).then(({ url }) => console.log(`Zomfy Towers läuft auf ${url}`));
}
