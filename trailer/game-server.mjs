// Kleiner statischer Server für die Aufnahme (Spielcode aus ZT_GAME).
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp4': 'video/mp4' };

export function start(port = 0, root) {
  root = resolve(root);
  return new Promise((done) => {
    const server = http.createServer(async (req, res) => {
      try {
        let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        if (path.endsWith('/')) path += 'index.html';
        const file = normalize(join(root, path));
        if (!file.startsWith(root + sep) && file !== root) return res.writeHead(403).end('Verboten');
        if (!(await stat(file)).isFile()) throw new Error('keine Datei');
        res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(await readFile(file));
      } catch {
        res.writeHead(404).end('Nicht gefunden');
      }
    });
    server.listen(port, '127.0.0.1', () => done({ server, port: server.address().port, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}
