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

// Same-origin requests: no CORS preflight, no absolute localhost URLs.
function api(method, url, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (store.token) headers.Authorization = 'Bearer ' + store.token;
  return fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
    .then((res) => res.json().then((data) => [res.status, data]))
    .catch(() => [0, { error: 'could not reach the server' }]);
}

function status(text) {
  statusLine.textContent = text;
}

function guestHtml() {
  return `
    <img class="logo" src="/assets/logo.png">
    <h1>simple notes</h1>
    <div id="nav">
      <button class="link" data-action="register">register</button>
      <button class="link" data-action="login">login</button>
    </div>
    <p class="lede">register or sign in to see your notes - everything is stored on this little server.</p>
    <form id="auth-form">
      <input id="f-name" type="text" placeholder="name">
      <input id="f-email" type="email" placeholder="e-mail">
      <input id="f-password" type="password" placeholder="password">
    </form>`;
}

function editorHtml() {
  const notes = store.notes.map((note) => `
    <div class="note">
      <h4>${esc(note.title || 'untitled')}</h4>
      <button class="remove-note" data-action="delete" data-id="${note.id}" aria-label="remove this note">&times;</button>
      <p>${esc(note.message)}</p>
    </div>`).join('');
  const who = store.user && store.user.name ? esc(store.user.name) : 'you';
  const count = store.notes.length;
  const summary = count === 0
    ? '<p class="empty">no notes yet - write a title and a message, then press enter to save.</p>'
    : `<p class="count">${count} note${count === 1 ? '' : 's'} saved</p>`;
  return `
    <img class="logo" src="/assets/logo.png">
    <h1>simple notes</h1>
    <p class="who">signed in as <strong>${who}</strong></p>
    <div id="nav">
      <button class="link" data-action="logout">logout</button>
    </div>
    <div class="composer">
      <span class="hint">title</span>
      <textarea id="t-title" class="title"></textarea>
      <span class="hint">message</span>
      <textarea id="t-msg" class="message"></textarea>
      <span class="hint">press enter to save the note</span>
    </div>
    <div id="notes">${summary}${notes}</div>`;
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
    status('your session expired, please register again');
    return paint();
  });
}

function doRegister() {
  const data = {
    name: fieldValue('f-name'),
    email: fieldValue('f-email'),
    password: fieldValue('f-password'),
  };
  if (!data.email || !data.password) return status('fill in the e-mail and the password');
  status('saving...');
  api('POST', '/api/register', data).then((result) => {
    const [code, resp] = result;
    if (code === 200) return accept(resp);
    status(resp.error || 'register failed');
  });
}

function doLogin() {
  const data = { email: fieldValue('f-email'), password: fieldValue('f-password') };
  if (!data.email || !data.password) return status('fill in the e-mail and the password');
  status('checking...');
  api('POST', '/api/login', data).then((result) => {
    const [code, resp] = result;
    if (code === 200) return accept(resp);
    status(resp.error || 'login failed');
  });
}

function doLogout() {
  store.token = '';
  store.user = null;
  store.notes = [];
  store.mode = 'guest';
  localStorage.removeItem('token');
  status('logged out');
  return paint();
}

function doDelete(id) {
  status('saving...');
  api('DELETE', '/api/notes/' + encodeURIComponent(id)).then((result) => {
    const [code, resp] = result;
    if (code === 200) return loadNotes();
    status(resp.error || 'delete failed');
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
    status(resp.error || 'could not save the note');
  });
}

function action(name, id) {
  if (name === 'register') return doRegister();
  if (name === 'login') return doLogin();
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
document.addEventListener('keydown', (event) => {
  if (store.mode !== 'editor' || event.key !== 'Enter') return;
  event.preventDefault();
  saveNote();
});

boot();
