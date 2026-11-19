import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';

const root = resolve('app');
const mime: Record<string, string> = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
const port = Number(process.env.PORT || 8080);
createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  const target = resolve(root, '.' + pathname);
  if (target !== root && !target.startsWith(root + sep)) { res.writeHead(403).end('Forbidden'); return; }
  const file = pathname === '/' || target.endsWith(sep) ? resolve(target, 'index.html') : target;
  if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => process.stdout.write(`Leonida Trophy Atlas at http://127.0.0.1:${port}\n`));
