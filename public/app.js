'use strict';

const root = document.getElementById('app');
const statusLine = document.getElementById('status');

const store = {
  token: localStorage.getItem('token') || '',
  user: null,
  notes: [],
  mode: 'guest',
};

function esc(value) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, (char) => map[char]);
}

function fieldValue(id) {
  const element = document.getElementById(id);
  return element ? element.value : '';
}

// Short, scannable age for a note card: "just now", "12m", "3h", "2d", then
// the plain date once it is more than a week old.
function timeLabel(iso) {
  if (!iso) return '';
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes + 'm';
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + 'h';
  const days = Math.round(hours / 24);
  if (days < 7) return days + 'd';
  return iso.slice(0, 10);
}

// Same-origin requests: no CORS preflight, no absolute localhost URLs.
// The abort signal means a server that is not there fails fast instead of
// leaving the page waiting for the browser's own timeout.
function api(method, url, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (store.token) headers.Authorization = `Bearer ${store.token}`;
  return fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
    .then((res) => res.json().then((data) => [res.status, data]))
    .catch(() => [0, { error: 'could not reach the server' }]);
}

function status(text, kind) {
  statusLine.textContent = text;
  if (kind) statusLine.setAttribute('data-kind', kind);
  else statusLine.removeAttribute('data-kind');
}

// The logo is 512x512 but is drawn at 2.75rem; the intrinsic size keeps the
// layout stable before the stylesheet has been parsed.
function topbar(buttons) {
  return `
    <header class="topbar">
      <img class="logo" src="/assets/logo.png" alt="simpleNotes logo" width="512" height="512">
      <h1 class="wordmark">simple notes</h1>
      <nav id="nav" class="actions" aria-label="account actions">${buttons}</nav>
    </header>`;
}

function guestHtml() {
  const actions = `
    <button class="link" data-action="register">register</button>
    <button class="link" data-action="login">login</button>`;
  return `
    ${topbar(actions)}
    <p class="lede">register or sign in to see your notes - everything is stored on this little server.</p>
    <form id="auth-form">
      <div class="field">
        <label for="f-name">name</label>
        <input id="f-name" type="text" placeholder="what should we call you">
      </div>
      <div class="field">
        <label for="f-email">e-mail</label>
        <input id="f-email" type="email" placeholder="you@example.com">
      </div>
      <div class="field">
        <label for="f-password">password</label>
        <input id="f-password" type="password" placeholder="at least one character">
      </div>
    </form>`;
}

// A note is one card: title + age on the left, delete button on the right,
// message underneath. Nothing floats any more, the grid does the placement.
function noteCard(note) {
  const title = String(note.title || '').trim();
  const titleText = title ? esc(title) : '<span class="untitled">untitled</span>';
  const created = String(note.created_at || '');
  const age = timeLabel(created);
  const time = age ? `<time datetime="${esc(created)}">${esc(age)}</time>` : '';
  return `
    <article class="note">
      <div class="note-head">
        <h2 class="note-title">${titleText}</h2>
        ${time}
        <button class="remove-note" data-action="delete" data-id="${note.id}" aria-label="delete this note">delete</button>
      </div>
      <p class="note-body">${esc(note.message || '')}</p>
    </article>`;
}

function editorHtml() {
  const actions = '<button class="link" data-action="logout">logout</button>';
  const cards = store.notes.map(noteCard).join('');
  const who = store.user && store.user.name ? esc(store.user.name) : 'you';
  const count = store.notes.length;
  const summary = count === 0
    ? '<p class="empty">no notes yet - write a title and a message, then press enter to save.</p>'
    : `<p class="count">${count} note${count === 1 ? '' : 's'} saved</p>`;
  return `
    ${topbar(actions)}
    <p class="who">signed in as <strong>${who}</strong></p>
    <section class="composer" aria-label="write a note">
      <div class="field field-title">
        <label for="t-title">title</label>
        <textarea id="t-title" class="title"></textarea>
      </div>
      <div class="field field-msg">
        <label for="t-msg">message</label>
        <textarea id="t-msg" class="message"></textarea>
      </div>
      <p class="hint">press enter to save the note</p>
    </section>
    ${summary}
    <div id="notes">${cards}</div>`;
}

function paint() {
  root.innerHTML = store.mode === 'editor' ? editorHtml() : guestHtml();
}

function loadNotes() {
  return api('GET', '/api/notes').then((result) => {
    const [, data] = result;
    store.notes = data.notes || [];
    return paint();
  });
}

function accept(data) {
  store.token = data.token;
  store.user = data.user;
  store.mode = 'editor';
  localStorage.setItem('token', data.token);
  status('');
  return loadNotes();
}

function boot() {
  if (!store.token) return paint();
  return api('GET', '/api/me').then((result) => {
    const [code, data] = result;
    if (code === 200 && data && data.id) {
      store.user = data;
      store.mode = 'editor';
      return loadNotes();
    }
    store.token = '';
    localStorage.removeItem('token');
    status('your session expired, please register again', 'error');
    return paint();
  });
}

// register and login differ only by the endpoint and the name field, so one
// submit covers both.
function doAuth(kind) {
  const data = { email: fieldValue('f-email'), password: fieldValue('f-password') };
  if (kind === 'register') data.name = fieldValue('f-name');
  if (!data.email || !data.password) return status('fill in the e-mail and the password', 'error');
  status(kind === 'register' ? 'saving...' : 'checking...');
  api('POST', `/api/${kind}`, data).then((result) => {
    const [code, resp] = result;
    if (code === 200) return accept(resp);
    status(resp.error || `${kind} failed`, 'error');
  });
}

function doLogout() {
  store.token = '';
  store.user = null;
  store.notes = [];
  store.mode = 'guest';
  localStorage.removeItem('token');
  status('logged out', 'ok');
  return paint();
}

function doDelete(id) {
  status('saving...');
  api('DELETE', '/api/notes/' + encodeURIComponent(id)).then((result) => {
    const [code, resp] = result;
    if (code === 200) return loadNotes();
    status(resp.error || 'delete failed', 'error');
  });
}

function clearComposer() {
  const title = document.getElementById('t-title');
  const message = document.getElementById('t-msg');
  if (title) title.value = '';
  if (message) message.value = '';
}

function saveNote() {
  const title = fieldValue('t-title').trim();
  const message = fieldValue('t-msg').trim();
  if (!title && !message) return;
  status('saving...');
  api('POST', '/api/notes', { title, message }).then((result) => {
    const [code, resp] = result;
    if (code === 200 || code === 201) {
      clearComposer();
      return loadNotes();
    }
    status(resp.error || 'could not save the note', 'error');
  });
}

function action(name, id) {
  if (name === 'register' || name === 'login') return doAuth(name);
  if (name === 'logout') return doLogout();
  if (name === 'delete') return doDelete(id);
}

// One delegated listener instead of one listener per button.
root.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  action(target.dataset.action, target.dataset.id);
});

// Enter submits the note, matching the original app's @keyup.enter behaviour.
// If the keyboard is parked on a button we let the browser activate that
// button instead, so tabbing to "logout" or "delete" still works.
document.addEventListener('keydown', (event) => {
  if (store.mode !== 'editor' || event.key !== 'Enter') return;
  const focus = event.target;
  if (focus && focus.closest('[data-action]')) return;
  event.preventDefault();
  saveNote();
});

boot();
