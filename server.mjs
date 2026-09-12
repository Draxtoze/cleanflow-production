import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
const root = process.cwd();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webmanifest': 'application/manifest+json' };
http.createServer(async (request, response) => {
  const url = decodeURIComponent(request.url.split('?')[0]);
  const file = resolve(root, `.${url === '/' ? '/index.html' : url}`);
  if (!file.startsWith(root)) { response.writeHead(403); return response.end('Forbidden'); }
  try { response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); }
  catch { response.writeHead(404); response.end('Not found'); }
}).listen(5173, '127.0.0.1', () => console.log('CleanFlow: http://127.0.0.1:5173'));