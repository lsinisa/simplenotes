'use strict';

// Talks to an ALREADY RUNNING server (default http://127.0.0.1:3000).
// Usage: node test/live.mjs [baseUrl]

const base = process.argv[2] || 'http://127.0.0.1:3000';

async function api(path, method = 'GET', body = null, token = null) {
  const res = await fetch(`${base}/api/${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === null ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const checks = [];
function check(name, cond, detail = '') {
  checks.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`);
}

const email = `smoke-${Date.now()}@example.com`;
const name = 'Smoke Tester';
const password = 'hunter2';

const reg = await api('register', 'POST', { name, email, password });
check('register 200', reg.status === 200, JSON.stringify(reg.body));
const token = reg.body.token;

const dup = await api('register', 'POST', { name, email, password });
check('duplicate email rejected', dup.status === 409, JSON.stringify(dup.body));

const login = await api('login', 'POST', { email, password });
check('login 200', login.status === 200, JSON.stringify(login.body));

const bad = await api('login', 'POST', { email, password: 'wrong-password' });
check('wrong password rejected', bad.status === 401, JSON.stringify(bad.body));

const forged = token.split('.')[0] + '.' + token.split('.')[1] + '.' + 'AAAA';
const forgedRes = await api('me', 'GET', null, forged);
check('forged token rejected', forgedRes.status === 401, JSON.stringify(forgedRes.body));

const noauth = await api('me', 'GET');
check('missing token rejected', noauth.status === 401, JSON.stringify(noauth.body));

const me = await api('me', 'GET', null, token);
check('me returns the user', me.status === 200 && me.body.email === email, JSON.stringify(me.body));

const add = await api('notes', 'POST', { title: 'Live check', message: 'hello from the running server' }, token);
check('create note 201', add.status === 201, JSON.stringify(add.body));

const list = await api('notes', 'GET', null, token);
check('list returns the note', list.status === 200 && list.body.notes.length === 1, JSON.stringify(list.body));

const noteId = list.body.notes[0].id;
const del = await api(`notes/${noteId}`, 'DELETE', null, token);
check('delete note 200', del.status === 200, JSON.stringify(del.body));

const afterDelete = await api('notes', 'GET', null, token);
check('note gone after delete', afterDelete.status === 200 && afterDelete.body.notes.length === 0, JSON.stringify(afterDelete.body));

console.log(checks.join('\n'));
console.log(checks.some((c) => c.startsWith('FAIL')) ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED');
