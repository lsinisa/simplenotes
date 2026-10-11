# simplenotes

Tiny self-hosted note taking app. No framework, no build step, no `npm install`:
the server is plain Node using only built-in modules, and the client is one HTML
page, one stylesheet and one script that talk to a small JSON API.

## Stack

| file | what it is |
| ---- | ---------- |
| `server/app.js` | the whole server: routing, static assets, sessions, API (only `node:http`, `node:crypto`, `node:fs`, `node:path`, `node:zlib`) |
| `server/db.js` | `node:sqlite` (`DatabaseSync`) wrapper, statements prepared once and reused |
| `server/config.js` | every knob, read from the environment |
| `public/index.html` | the page shell |
| `public/app.css` | the styling |
| `public/app.js` | the client: renders guest/editor views, talks to the API |
| `test/smoke.mjs` | end-to-end check of a running server |
| `test/live.mjs` | older variant of the same check, takes the base URL as an argument |

Requires **Node 22+** (`node:sqlite` is built in from Node 22.5; developed on Node 26).

## Running

```bash
node server/app.js          # or npm start
# simpleNotes on http://127.0.0.1:3000/ (db: data/simplenotes.sqlite)
```

Open <http://127.0.0.1:3000/> in a browser. The database lives in `data/` and is
gitignored - delete it to start over.

### Environment variables

| var | default | meaning |
| --- | ------- | ------- |
| `HOST` | `127.0.0.1` | bind address |
| `PORT` | `3000` | bind port |
| `DB_PATH` | `data/simplenotes.sqlite` | sqlite file |
| `PUBLIC_DIR` | `public` | static asset directory |
| `SECRET` | random per boot | token signing key - set it to keep tokens valid across restarts |
| `TOKEN_EXPIRES_IN` | `86400` | token lifetime in seconds |

## API

All endpoints are `application/json`. Everything except `register`/`login` needs
`Authorization: Bearer <token>`.

| method | path | notes |
| ------ | ---- | ----- |
| `POST` | `/api/register` | `{ name, email, password }` -> `{ auth, token, user }` |
| `POST` | `/api/login` | `{ email, password }` -> `{ auth, token, user }` |
| `GET` | `/api/me` | the signed-in user |
| `GET` | `/api/notes` | the user's notes, newest first |
| `POST` | `/api/notes` | `{ title, message }` -> `201` |
| `DELETE` | `/api/notes/:id` | deletes one note |

Passwords are stored as `scrypt$cost$blockSize$parallelization$<salt>$<hash>`
(`node:crypto` scrypt, per-user random salt). The stored hash is **never** sent
back to the client: every user row is passed through `safeUser()` before it is
serialized, so `register`, `login` and `me` only return `id`, `name`, `email` and
`created_at`.

## Testing

Start the server first, then run either check against it:

```bash
node server/app.js                 # leave this running
node test/smoke.mjs                # or npm smoke   (BASE=... to point elsewhere)
node test/live.mjs http://127.0.0.1:3000   # or npm live
```

Both print one line per assertion and finish with `ALL CHECKS PASSED`.

