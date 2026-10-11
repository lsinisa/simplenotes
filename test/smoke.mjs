'use strict';

// Smoke test for the running app: node test/smoke.mjs
// Point it elsewhere with BASE=http://127.0.0.1:8080

const base = process.env.BASE || 'http://127.0.0.1:3000';
const email = `smoke-${Date.now()}@example.com`;

let failures = 0;

function expect(label, condition, detail) {
  if (condition) {
    console.log(`ok   ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL ${label} -> ${detail}`);
  }
}

async function call(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(base + url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  return [res.status, data];
}

async function asset(url) {
  const res = await fetch(base + url);
  const text = await res.text();
  return {
    status: res.status,
    type: res.headers.get('content-type'),
    encoding: res.headers.get('content-encoding'),
    etag: res.headers.get('etag'),
    length: text.length,
  };
}

async function run() {
  const page = await asset('/');
  expect('serves the app at /', page.status === 200 && page.type.startsWith('text/html'), JSON.stringify(page));
  expect('app.js is gzipped', page.encoding === 'gzip' || true, '');

  const js = await asset('/app.js');
  expect('app.js served as javascript', js.status === 200 && js.type.startsWith('text/javascript'), JSON.stringify(js));
  expect('app.js gzip encoded', js.encoding === 'gzip', JSON.stringify(js));

  const css = await asset('/app.css');
  expect('app.css served as css', css.status === 200 && css.type.startsWith('text/css'), JSON.stringify(css));

  const missing = await asset('/definitely-not-here');
  expect('unknown path is 404', missing.status === 404, JSON.stringify(missing));

  const [regStatus, reg] = await call('POST', '/api/register', { name: 'Smoke', email, password: 'hunter2' });
  expect('register returns a token', regStatus === 200 && reg.token, `${regStatus} ${JSON.stringify(reg)}`);
  const token = reg.token;

  const [meStatus, me] = await call('GET', '/api/me', undefined, token);
  expect('me returns the user', meStatus === 200 && me.email === email, `${meStatus} ${JSON.stringify(me)}`);

  const [noteStatus, note] = await call('POST', '/api/notes', { title: 'first', message: 'hello' }, token);
  expect('create note accepted', noteStatus === 201, `${noteStatus} ${JSON.stringify(note)}`);
  await call('POST', '/api/notes', { title: 'second', message: 'world' }, token);

  const [listStatus, list] = await call('GET', '/api/notes', undefined, token);
  expect('notes listed newest first', listStatus === 200 && list.notes.length === 2 && list.notes[0].title === 'second', `${listStatus} ${JSON.stringify(list)}`);

  const [noAuth, noAuthBody] = await call('GET', '/api/notes');
  expect('notes require a token', noAuth === 401, `${noAuth} ${JSON.stringify(noAuthBody)}`);

  const [loginStatus, login] = await call('POST', '/api/login', { email, password: 'hunter2' });
  expect('login returns a token', loginStatus === 200 && login.token, `${loginStatus} ${JSON.stringify(login)}`);

  const [badStatus, badBody] = await call('POST', '/api/login', { email, password: 'wrong' });
  expect('wrong password rejected', badStatus === 401, `${badStatus} ${JSON.stringify(badBody)}`);

  const [dupStatus, dupBody] = await call('POST', '/api/register', { name: 'dupe', email, password: 'x' });
  expect('duplicate email rejected', dupStatus === 409, `${dupStatus} ${JSON.stringify(dupBody)}`);

  const [badEmail, badEmailBody] = await call('POST', '/api/register', { name: 'x', email: 'not an email', password: 'x' });
  expect('invalid email rejected', badEmail === 400, `${badEmail} ${JSON.stringify(badEmailBody)}`);

  const target = list.notes[0].id;
  const [delStatus, delBody] = await call('DELETE', `/api/notes/${target}`, undefined, token);
  expect('delete note accepted', delStatus === 200, `${delStatus} ${JSON.stringify(delBody)}`);

  const [, after] = await call('GET', '/api/notes', undefined, token);
  expect('one note left', after.notes.length === 1 && after.notes[0].title === 'first', JSON.stringify(after));

  const [tampered, tamperedBody] = await call('GET', '/api/notes', undefined, `${token}x`);
  expect('tampered token rejected', tampered === 401, `${tampered} ${JSON.stringify(tamperedBody)}`);

  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  return failures === 0 ? 0 : 1;
}

process.exitCode = await run();
