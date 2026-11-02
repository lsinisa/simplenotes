'use strict';

const root = document.getElementById('app');

const store = {
  token: localStorage.getItem('token') || '',
  user: null,
  notes: [],
  mode: 'guest',
  // client-only view state: how the note list is shown this session
  sort: 'newest',
  query: '',
  // id of the note currently loaded into the composer for an in-place edit
  editing: null,
  // id of the note whose delete button has been armed but not confirmed
  armed: null,
  // the status chip lives inside the rendered page (just under the composer)
  // so it stays near the action it describes; the templates draw it from
  // these fields and status() also nudges the live element in place.
  statusText: '',
  statusKind: '',
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
  store.statusText = text;
  store.statusKind = kind || '';
  // The chip is part of the rendered page now, so update it in place: a
  // full repaint here would rebuild the form and wipe values the user typed.
  const line = document.getElementById('status');
  if (!line) return;
  line.textContent = text;
  if (kind) line.setAttribute('data-kind', kind);
  else line.removeAttribute('data-kind');
}

function statusChip() {
  const kind = store.statusKind ? ` data-kind="${store.statusKind}"` : '';
  return `<div id="status" class="status" role="status" aria-live="polite" aria-atomic="true"${kind}>${esc(store.statusText)}</div>`;
}

// The theme chip cycles auto -> light -> dark and remembers the choice; the
// stylesheet honours data-theme over the media query, see app.css.
function cycleTheme() {
  const order = ['auto', 'light', 'dark'];
  const current = localStorage.getItem('theme') || 'auto';
  const next = order[(order.indexOf(current) + 1) % order.length];
  if (next === 'auto') {
    localStorage.removeItem('theme');
    delete document.documentElement.dataset.theme;
  } else {
    localStorage.setItem('theme', next);
    document.documentElement.dataset.theme = next;
  }
  return status(`theme: ${next}`, 'ok');
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

// Guest card splits by intent: the log-in card has only what a returning
// visitor needs, the register card adds the name. The buttons are separate,
// so a stray click cannot mix the two flows.
function guestHtml() {
  const actions = `
    <button class="link" data-action="register">register</button>
    <button class="link" data-action="login">log in</button>
    <button class="link" data-action="theme" aria-label="cycle light and dark theme">theme</button>`;
  return `
    ${topbar(actions)}
    <p class="lede">register or sign in to see your notes - everything is stored on this little server.</p>
    ${statusChip()}
    <section class="join">
    <form id="auth-login">
      <div class="field">
        <label for="f-login-email">e-mail</label>
        <input id="f-login-email" type="email" placeholder="you@example.com">
      </div>
      <div class="field">
        <label for="f-login-password">password</label>
        <input id="f-login-password" type="password" placeholder="your password">
      </div>
      <button class="link" data-action="login">log in</button>
    </form>
    <form id="auth-register">
      <div class="field">
        <label for="f-reg-name">name</label>
        <input id="f-reg-name" type="text" placeholder="how you sign in">
      </div>
      <div class="field">
        <label for="f-reg-email">e-mail</label>
        <input id="f-reg-email" type="email" placeholder="you@example.com">
      </div>
      <div class="field">
        <label for="f-reg-password">password</label>
        <input id="f-reg-password" type="password" placeholder="at least one character">
      </div>
      <button class="link" data-action="register">register</button>
    </form>
    </section>`;
}

// A note is one card: title + age on the left, delete/edit chips on the
// right, message underneath. The delete chip is two-step: first click arms
// the card (red outline, "confirm delete"), the second click removes it.
// Clicking another card's delete re-arms that one instead.
function noteCard(note) {
  const title = String(note.title || '').trim();
  const titleText = title ? esc(title) : '<span class="untitled">untitled</span>';
  const created = String(note.created_at || '');
  const age = timeLabel(created);
  const time = age ? `<time datetime="${esc(created)}">${esc(age)}</time>` : '';
  const armed = note.id === store.armed;
  const removeLabel = armed ? 'confirm delete' : 'delete';
  const removeClass = armed ? 'remove-note armed' : 'remove-note';
  return `
    <article class="note${armed ? ' armed' : ''}">
      <div class="note-head">
        <h2 class="note-title">${titleText}</h2>
        ${time}
        <button class="link" data-action="edit" data-id="${note.id}" aria-label="edit this note">edit</button>
        <button class="${removeClass}" data-action="delete" data-id="${note.id}" aria-label="${armed ? 'confirm deleting this note' : title ? `delete note ${titleText}` : 'delete untitled note'}">${removeLabel}</button>
      </div>
      <p class="note-body">${esc(note.message || '')}</p>
    </article>`;
}

// The note list is filtered and ordered client-side from store.query/sort;
// only the saved data round-trips to the server.
function visibleNotes() {
  let list = store.notes;
  if (store.query) {
    list = list.filter((note) =>
      `${note.title || ''} ${note.message || ''}`.toLowerCase().includes(store.query));
  }
  const ordered = list.slice();
  if (store.sort === 'oldest') ordered.reverse();
  else if (store.sort === 'az') {
    ordered.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  }
  return ordered;
}

function editorHtml() {
  const actions = `
    <button class="link" data-action="logout">logout</button>
    <button class="link" data-action="theme" aria-label="cycle light and dark theme">theme</button>`;
  const editing = store.editing != null
    ? store.notes.find((note) => note.id === store.editing)
    : null;
  // When editing, the composer opens with the note's current text so the
  // user sees what they are changing; the save chip PATCHes in place.
  const hint = editing
    ? 'click save updates this note without touching its age - esc cancels the edit'
    : 'press enter over the fields or click the save chip, esc clears the draft';
  const saveLabel = editing ? 'update' : 'save note';
  const cards = visibleNotes().map(noteCard).join('');
  const who = store.user && store.user.name ? esc(store.user.name) : 'you';
  const count = visibleNotes().length;
  const total = store.notes.length;
  let summary;
  if (store.query) {
    summary = `<p class="count">${count} of ${total} note${total === 1 ? '' : 's'} match${store.query ? ` "${store.query}"` : ''}</p>`;
  } else if (count === 0) {
    summary = '<p class="empty">no notes yet - write a title and a message, then press enter to save.</p>';
  } else {
    summary = `<p class="count">${count} note${count === 1 ? '' : 's'} saved</p>`;
  }
  return `
    ${topbar(actions)}
    <p class="who">signed in as <strong>${who}</strong></p>
    <section class="composer" aria-label="write a note">
      <div class="field field-title">
        <label for="t-title">title</label>
        <textarea id="t-title" class="title">${esc(editing ? editing.title : '')}</textarea>
      </div>
      <div class="field field-msg">
        <label for="t-msg">message</label>
        <textarea id="t-msg" class="message">${esc(editing ? editing.message : '')}</textarea>
      </div>
      <p class="hint">${esc(hint)}</p>
      <button class="link save" data-action="save">${esc(saveLabel)}</button>
    </section>
    ${statusChip()}
    <div class="filters">
      <div class="field field-search">
        <label for="f-search">search</label>
        <input id="f-search" spellcheck="false" value="${esc(store.query)}">
      </div>
      <button class="link" data-action="search" aria-label="search or clear search">${store.query ? 'clear search' : 'search'}</button>
      <button class="link" data-action="sort" aria-label="cycle note order">${`sort: ${store.sort}`}</button>
      ${summary}
    </div>
    <div id="notes">${cards}</div>`;
}

function paint() {
  root.innerHTML = store.mode === 'editor' ? editorHtml() : guestHtml();
}

function loadNotes() {
  return api('GET', '/api/notes').then((result) => {
    const [, data] = result;
    store.notes = data.notes || [];
    status('');
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
  // An explicit theme choice survives reloads; absent one follows the OS.
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    document.documentElement.dataset.theme = savedTheme;
  }
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

// register and login differ by endpoint and by which card supplies the
// fields, so one submit covers both.
function doAuth(kind) {
  const data = {
    email: fieldValue(kind === 'login' ? 'f-login-email' : 'f-reg-email'),
    password: fieldValue(kind === 'login' ? 'f-login-password' : 'f-reg-password'),
  };
  if (kind === 'register') data.name = fieldValue('f-reg-name');
  if (!data.email || !data.password) return status('fill in the e-mail and the password', 'error');
  status(kind === 'register' ? 'registering...' : 'checking...');
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
  store.editing = null;
  store.armed = null;
  localStorage.removeItem('token');
  status('logged out', 'ok');
  return paint();
}

// Two-step delete: the first click only arms the card so a mis-click cannot
// drop a note; confirming on the same card is what reaches the server.
function deleteStep(id) {
  if (store.armed !== id) {
    store.armed = id;
    return paint();
  }
  store.armed = null;
  status('removing...');
  api('DELETE', '/api/notes/' + encodeURIComponent(id)).then((result) => {
    const [code, resp] = result;
    if (code === 200) return loadNotes();
    status(resp.error || 'delete failed', 'error');
  });
}

// edit loads a note into the composer; saving then PATCHes the same note
// (its age stays), instead of posting a copy.
function openEdit(id) {
  const note = store.notes.find((note) => note.id === id);
  if (!note) return status('that note is not yours', 'error');
  store.editing = id;
  return paint();
}

function cycleSort() {
  const order = ['newest', 'oldest', 'az'];
  store.sort = order[(order.indexOf(store.sort) + 1) % order.length];
  return paint();
}

function toggleSearch() {
  if (store.query) store.query = '';
  else store.query = fieldValue('f-search').trim().toLowerCase();
  return paint();
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
  if (store.editing != null) {
    const id = store.editing;
    // an empty edit is just a polite way to drop out of edit mode
    if (!title && !message) {
      store.editing = null;
      clearComposer();
      return status('edit cancelled', 'ok');
    }
    status('updating...');
    return api('PATCH', '/api/notes/' + encodeURIComponent(id), { title, message }).then((result) => {
      const [code, resp] = result;
      if (code === 200) {
        store.editing = null;
        clearComposer();
        return loadNotes();
      }
      status(resp.error || 'could not update the note', 'error');
    });
  }
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
  if (name === 'delete') return deleteStep(id);
  if (name === 'save') return saveNote();
  if (name === 'edit') return openEdit(id);
  if (name === 'sort') return cycleSort();
  if (name === 'search') return toggleSearch();
  if (name === 'theme') return cycleTheme();
}

// One delegated listener instead of one listener per button.
root.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  // dataset.id arrives as a string; note ids are numbers, so compare as
  // numbers or edit/arm lookups silently miss.
  action(target.dataset.action, Number(target.dataset.id));
});

// Enter works only while the keyboard sits on a composer field, so a stray
// Enter elsewhere on the page can no longer post a note; Esc throws the draft
// away. Enter on a focused button still activates it via the browser.
document.addEventListener('keydown', (event) => {
  if (store.mode !== 'editor') return;
  const focus = event.target;
  const composer = focus && (focus.id === 't-title' || focus.id === 't-msg');
  if (event.key === 'Enter') {
    if (!composer) return;
    event.preventDefault();
    return saveNote();
  }
  if (event.key === 'Escape') {
    if (!composer) return;
    event.preventDefault();
    const wasEditing = store.editing != null;
    store.editing = null;
    clearComposer();
    return status(wasEditing ? 'edit cancelled' : 'draft cleared', 'ok');
  }
});

// A textarea does not grow on its own: with resize:none anything past
// min-height is invisible and unscrollable, so every keystroke re-measures
// by collapsing the box and reading the wrapped content height back.
function growTextarea(field) {
  const min = parseFloat(getComputedStyle(field).minHeight) || 0;
  field.style.height = '1px';
  const need = field.scrollHeight;
  field.style.height = `${Math.ceil(Math.max(need, min))}px`;
}

root.addEventListener('input', (event) => {
  const target = event.target;
  if (target && (target.id === 't-title' || target.id === 't-msg')) growTextarea(target);
});

boot();
