// Statischer Server mit Einhängepunkten: { '/frames': ordner, … }, '/' ist der Rest.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp4': 'video/mp4' };

export function start(mounts, port = 0) {
  const entries = Object.entries(mounts).map(([p, d]) => [p, resolve(d)]).sort((a, b) => b[0].length - a[0].length);
  return new Promise((done) => {
    const server = http.createServer(async (req, res) => {
      try {
        const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        for (const [prefix, dir] of entries) {
          const inside = prefix === '/' ? path : path.startsWith(prefix + '/') ? path.slice(prefix.length) : null;
          if (inside === null) continue;
          let rel = inside.endsWith('/') ? inside + 'index.html' : inside;
          const file = normalize(join(dir, rel));
          if (!file.startsWith(dir + sep)) return res.writeHead(403).end('Verboten');
          try {
            if (!(await stat(file)).isFile()) continue;
          } catch { continue; }
          res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
          return res.end(await readFile(file));
        }
        res.writeHead(404).end('Nicht gefunden');
      } catch (e) {
        res.writeHead(500).end(String(e));
      }
    });
    server.listen(port, '127.0.0.1', () => done({ server, port: server.address().port, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}
