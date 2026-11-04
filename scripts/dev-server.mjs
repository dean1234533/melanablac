// Local dev/test server that runs the real Pages Functions without workerd (which needs macOS 13.5+).
// Emulates D1 (node:sqlite), R2 (filesystem) and HTMLRewriter. Usage: node scripts/dev-server.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8788);
const dataDir = path.join(root, '.dev-data'); fs.mkdirSync(path.join(dataDir, 'r2'), { recursive: true });
const dbFile = path.join(dataDir, 'db.sqlite');
const fresh = !fs.existsSync(dbFile) || process.argv.includes('--reset');
if (fresh && fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
const sqlite = new DatabaseSync(dbFile);
if (fresh) { sqlite.exec(fs.readFileSync(path.join(root, 'schema.sql'), 'utf8')); sqlite.exec(fs.readFileSync(path.join(root, 'seed.sql'), 'utf8')); }

const norm = (a) => a.map((v) => (v === undefined ? null : typeof v === 'boolean' ? +v : v));
class Stmt {
  constructor(sql, args = []) { this.sql = sql; this.args = args; }
  bind(...a) { return new Stmt(this.sql, norm(a)); }
  async first() { return sqlite.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: sqlite.prepare(this.sql).all(...this.args).map((r) => ({ ...r })) }; }
  async run() { const r = sqlite.prepare(this.sql).run(...this.args); return { success: true, meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; }
}
const DB = {
  prepare: (s) => new Stmt(s),
  async batch(stmts) { sqlite.exec('BEGIN'); try { const out = []; for (const s of stmts) out.push(await s.run()); sqlite.exec('COMMIT'); return out; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } },
};
const MEDIA = {
  async put(key, buf, opts) { fs.writeFileSync(path.join(dataDir, 'r2', key), Buffer.from(buf)); fs.writeFileSync(path.join(dataDir, 'r2', key + '.type'), opts?.httpMetadata?.contentType || ''); },
  async get(key) { const f = path.join(dataDir, 'r2', path.basename(key)); if (!fs.existsSync(f)) return null; return { body: fs.readFileSync(f), httpMetadata: { contentType: fs.readFileSync(f + '.type', 'utf8') } }; },
};
globalThis.HTMLRewriter = class {
  constructor() { this.h = []; } on(sel, h) { this.h.push([sel, h]); return this; }
  transform(res) {
    const hs = this.h;
    const body = new ReadableStream({ async start(ctrl) {
      let html = await res.text();
      for (const [sel, h] of hs) {
        if (sel === 'title') h.element({ setInnerContent: (t) => { html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>`); } });
        if (sel === 'head') h.element({ append: (c) => { html = html.replace('</head>', c + '</head>'); } });
      }
      ctrl.enqueue(new TextEncoder().encode(html)); ctrl.close();
    } });
    const headers = new Headers(res.headers); headers.delete('content-length');
    return new Response(body, { status: res.status, headers });
  }
};
const env = { DB, MEDIA, DEV_MODE: '1', ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'dbs_workouts@yahoo.com', VAPID_PUBLIC_KEY: fs.readFileSync(path.join(root, '.dev-vapid-public'), 'utf8').trim(), VAPID_PRIVATE_JWK: fs.readFileSync(path.join(root, '.dev-vapid-private'), 'utf8').trim().replace(/^'|'$/g, ''), ...(process.env.DEV_ENV ? JSON.parse(process.env.DEV_ENV) : {}) };

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const dist = path.join(root, 'dist');
const staticRes = (p) => {
  let f = path.join(dist, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  let ok = fs.existsSync(f) && fs.statSync(f).isFile();
  if (!ok) f = path.join(dist, 'index.html');
  const h = { 'content-type': mime[path.extname(f)] || 'application/octet-stream' };
  if (f.endsWith('sw.js')) h['service-worker-allowed'] = '/admin/';
  return new Response(fs.readFileSync(f), { headers: h });
};
const load = async (f) => import(pathToFileURL(path.join(root, 'functions', f)).href);
const mw = (await load('_middleware.js')).onRequest;
const apiH = (await load('api/[[path]].js')).onRequest;
const sitemap = (await load('sitemap.xml.js')).onRequest;
const robots = (await load('robots.txt.js')).onRequest;

http.createServer(async (req, res) => {
  try {
    const chunks = []; for await (const c of req) chunks.push(c);
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    let response;
    const next = async () => staticRes(url.pathname);
    if (url.pathname.startsWith('/api/')) response = await apiH({ request, env, params: { path: url.pathname.slice(5).split('/').filter(Boolean) } });
    else if (url.pathname === '/sitemap.xml') response = await sitemap({ request, env });
    else if (url.pathname === '/robots.txt') response = await robots({ request, env });
    else response = await mw({ request, env, next });
    const headers = {}; response.headers.forEach((v, k) => { headers[k] = v; });
    const sc = response.headers.getSetCookie?.(); if (sc?.length) headers['set-cookie'] = sc;
    res.writeHead(response.status, headers); res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) { console.error(e); res.writeHead(500); res.end(String(e)); }
}).listen(PORT, () => console.log(`dev server http://localhost:${PORT}`));
