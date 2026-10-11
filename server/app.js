'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const config = require('./config');
const Db = require('./db');

const db = new Db(config.dbPath);

/* ---------------------------- passwords ---------------------------- */
// scrypt from node:crypto replaces bcryptjs: no native addon, no npm install,
// and the per-user random salt is stored inside the hash string.
const SCRYPT = { keyLength: 64, cost: 1 << 14, block: 8, parallel: 1 };
const SCRYPT_MAXMEM = 1 << 26;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(
    password, salt, SCRYPT.keyLength, { maxmem: SCRYPT_MAXMEM, cost: SCRYPT.cost, blockSize: SCRYPT.block, parallelization: SCRYPT.parallel }
  );
  return `scrypt$${SCRYPT.cost}$${SCRYPT.block}$${SCRYPT.parallel}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const expected = Buffer.from(parts[5], 'hex');
  const actual = crypto.scryptSync(
    password, Buffer.from(parts[4], 'hex'), expected.length,
    { maxmem: SCRYPT_MAXMEM, cost: Number(parts[1]), blockSize: Number(parts[2]), parallelization: Number(parts[3]) }
  );
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/* ------------------------------ tokens ------------------------------ */
function hmacB64url(data) {
  return crypto.createHmac('sha256', config.secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromB64url(value) {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function signToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + config.tokenExpiresIn }));
  const sig = hmacB64url(`${head}.${body}`);
  return `${head}.${body}.${sig}`;
}

function verifyToken(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const expected = Buffer.from(hmacB64url(`${parts[0]}.${parts[1]}`), 'utf8');
  const given = Buffer.from(parts[2], 'utf8');
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  let payload;
  try {
    payload = JSON.parse(fromB64url(parts[1]).toString());
  } catch (e) {
    return null;
  }
  if (!payload || !payload.id || (payload.exp && payload.exp < Math.floor(Date.now() / 1000))) return null;
  return payload;
}

function bearer(req) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? verifyToken(match[1]) : null;
}

/* --------------------------- static assets --------------------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function walk(dir, prefix) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full, `${prefix}/${name}`));
    } else {
      out.push({ url: `${prefix}/${name}`, full, size: stat.size });
    }
  }
  return out;
}

// Assets are read once at boot and kept in memory: no per-request disk access,
// and text assets are gzipped once instead of on every response.
const assets = {};
for (const entry of walk(config.publicDir, '')) {
  const buffer = fs.readFileSync(entry.full);
  const ext = path.extname(entry.full);
  const gzippable = /\.(html|js|css|json|svg)$/.test(ext) && buffer.length > 512;
  assets[entry.url] = {
    buffer,
    gz: gzippable ? zlib.gzipSync(buffer, 9) : null,
    etag: `W/"${entry.size.toString(16)}-${crypto.hash('sha256', buffer).slice(0, 8)}"`,
    type: MIME[ext] || 'application/octet-stream',
  };
}

/* ---------------------------- responses ---------------------------- */
function sendJson(res, status, value) {
  const body = Buffer.from(JSON.stringify(value));
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', body.length);
  res.end(body);
}

function sendText(res, status, message) {
  sendJson(res, status, { error: message });
}

function notFound(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Not found');
}

// A user row is only ever sent back to the client after the password hash has
// been dropped. verifyPassword() still sees the raw row, but no response body
// carries it.
function safeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

/* ------------------------------ routing ------------------------------ */
const EMAIL_RE = /^[A-Za-z0-9._%+-]{3,64}@[A-Za-z0-9.-]{2,64}$/;
const MAX_NOTES_PER_USER = 500;

function readBody(req) {
  const chunks = [];
  let total = 0;
  return new Promise((resolve, reject) => {
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > config.maxBodyBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseBody(req) {
  return readBody(req).then((buffer) => {
    if (!buffer.length) return {};
    const parsed = JSON.parse(buffer.toString());
    if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected a JSON object');
    return parsed;
  });
}

function register(req, res) {
  return parseBody(req).then((body) => {
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!EMAIL_RE.test(email)) return sendText(res, 400, 'Invalid email');
    if (!name || name.length > 64) return sendText(res, 400, 'Name must be 1-64 characters');
    if (password.length < 1 || password.length > 128) return sendText(res, 400, 'Password must be 1-128 characters');
    if (db.selectByEmail(email)) return sendText(res, 409, 'That email is already registered');
    const user = db.insert(name, email, hashPassword(password), new Date().toISOString());
    sendJson(res, 200, { auth: true, token: signToken({ id: user.id }), user: safeUser(user) });
  });
}

function login(req, res) {
  return parseBody(req).then((body) => {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const user = db.selectByEmail(email);
    if (!user) return sendText(res, 404, 'No user found');
    if (String(user.password).startsWith('$2')) {
      return sendText(res, 400, 'That account uses a legacy bcrypt hash this build cannot verify');
    }
    if (!verifyPassword(password, user.password)) return sendText(res, 401, 'Wrong password');
    sendJson(res, 200, { auth: true, token: signToken({ id: user.id }), user: safeUser(user) });
  });
}

async function me(req, res) {
  const user = bearer(req);
  if (!user) return sendText(res, 401, 'Login required');
  const row = db.selectUserById(user.id);
  if (!row) return sendText(res, 401, 'Login required');
  sendJson(res, 200, safeUser(row));
}

async function listNotes(req, res) {
  const user = bearer(req);
  if (!user) return sendText(res, 401, 'Login required');
  sendJson(res, 200, { notes: db.selectNotes(user.id) });
}

async function createNote(req, res) {
  const user = bearer(req);
  if (!user) return sendText(res, 401, 'Login required');
  return parseBody(req).then((body) => {
    const title = String(body.title || '').trim().slice(0, 200);
    const message = String(body.message || '').trim().slice(0, 4000);
    if (!title && !message) return sendText(res, 400, 'A note needs a title or a message');
    if (db.countNotes(user.id) >= MAX_NOTES_PER_USER) return sendText(res, 409, 'Note limit reached');
    db.insertNote(user.id, title, message, new Date().toISOString());
    sendJson(res, 201, { ok: true });
  });
}

async function deleteNote(req, res, id) {
  const user = bearer(req);
  if (!user) return sendText(res, 401, 'Login required');
  db.deleteNote(user.id, Number(id));
  sendJson(res, 200, { ok: true });
}

function api(method, pathname, req, res) {
  if (method === 'POST' && pathname === '/api/register') return register(req, res);
  if (method === 'POST' && pathname === '/api/login') return login(req, res);
  if (method === 'GET' && pathname === '/api/me') return me(req, res);
  if (method === 'GET' && pathname === '/api/notes') return listNotes(req, res);
  if (method === 'POST' && pathname === '/api/notes') return createNote(req, res);
  if (method === 'DELETE' && pathname.startsWith('/api/notes/')) return deleteNote(req, res, pathname.slice(11));
  return null;
}

/* --------------------------- static files --------------------------- */
function sendAsset(res, asset, req) {
  if (req.headers['if-none-match'] === asset.etag) {
    res.statusCode = 304;
    res.setHeader('ETag', asset.etag);
    res.end();
    return;
  }
  const useGzip = asset.gz && /gzip/i.test(req.headers['accept-encoding'] || '');
  const body = useGzip ? asset.gz : asset.buffer;
  res.statusCode = 200;
  res.setHeader('Content-Type', asset.type);
  res.setHeader('Content-Length', body.length);
  res.setHeader('ETag', asset.etag);
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  if (asset.type === 'text/html; charset=utf-8') {
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'");
  }
  if (useGzip) res.setHeader('Content-Encoding', 'gzip');
  res.end(body);
}

function route(req, res) {
  const pathname = new URL(req.url, 'http://127.0.0.1:3000').pathname;
  try {
    const promise = api(req.method, pathname, req, res);
    if (promise) {
      promise.catch((err) => sendText(res, 500, String(err.message || err)));
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return notFound(res);
    const asset = assets[pathname === '/' ? '/index.html' : pathname];
    if (!asset) return notFound(res);
    return sendAsset(res, asset, req);
  } catch (err) {
    sendText(res, 500, String(err.message || err));
  }
}

const server = http.createServer(route);

server.on('clientError', (err, socket) => {
  if (socket.handshake) socket.close();
});

server.listen(config.port, config.host, () => {
  console.log(`simpleNotes on http://${config.host}:${config.port}/ (db: ${config.dbPath})`);
  if (config.generatedSecret) {
    console.log('signing secret is random per boot - set SECRET=... to keep tokens valid across restarts');
  }
});

process.on('exit', () => db.close());


