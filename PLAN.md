# simplenotes - GUI improvement plan

Repo: connected to https://github.com/lsinisa/simplenotes.git
Constraint kept throughout: no frameworks, no build step, token-driven CSS stays
the single styling surface, client stays one html/css/js trio.

## Tranche 1 - small and safe (client-only, no server change)

Status markers: [ ] todo  [x] done and smoke-checked

- [x] 1. Auto-grow composer textarea (app.js growTextarea on 'input' events;
      fixes invisible overflow from resize:none + fixed min-height)
- [x] 2. Explicit "save note" button in the composer; Enter kept as shortcut but
      restricted to the two composer textareas; Esc clears the composer
- [x] 4. Guest form label/placeholder clarify that name is register-only
      (full per-intent form split deferred to tranche 2)
- [x] 5. Auth card: single-column stack instead of 3 side-by-side fields
- [x] 11. Darken --ink-faint in both themes (was borderline AA at .72rem time
      labels); time chip now uses ink-faint with enough contrast
- [x] 12. Delete button aria-label now includes the note title
- [x] 13. Enter keydown handler no longer fires on the whole document - only on
      composer textarea targets

## Tranche 2 - riskier / bigger (assess after tranche 1 is verified live)

- [x] 3. Edit-in-place: PATCH /api/notes/:id (server/app.js + db.js merge,
      prepared updateNote statement) + an explicit `edit` chip per card that
      loads the note into the composer; save then PATCHes, age preserved.
- [x] 6. Manual theme chip in topbar: cycles auto/light/dark, sets data-theme
      on <html>, remembered via localStorage; CSS restates the dark token
      block under :root[data-theme="dark"] (wins over the media query, which
      now only applies to :root:not([data-theme="light"])).
- [x] 7. Two-step delete (arm on first click - red outline + "confirm delete",
      second click on the same card posts DELETE; arming another card
      re-arms that one). DEVIATION: plan said undo; arm/confirm chosen
      because undo re-POSTs a copy and silently loses the note's age.
- [x] 8. Status chip moved inside the rendered page, directly under the
      composer; templates draw it from store state, status() updates it in
      place so an auth error never repaints (which would wipe typed values).
- [x] 9. Sort chip cycles newest/oldest/A-Z client-side before map().
- [x] 10. Search field + chip; filter of title+message client-side, count
      chip shows "N of M match".
- [x] 4b. Guest form split into two cards by intent (log-in card has no
      name field; register card adds it).

## Verification trail

- `node --check public/app.js` after each client edit; `node --check` on
  server/db.js/server/app.js after the PATCH work
- smoke test extended with two PATCH assertions (accepted + merge keeps the
  untouched field) - `node test/smoke.mjs` against a fresh boot: ALL CHECKS
  PASSED
- live browser pass (:3130): register -> two saves -> edit chip (composer
  opens with the note's text, save label "update") -> PATCH updated in place,
  card count unchanged -> delete armed (red card, "confirm delete") ->
  confirmed, note gone -> sort chip -> oldest -> search "beta" filtered ->
  cleared -> theme chip set data-theme=light and --paper flipped to #fafafc
- one real bug caught live: dataset.id arrives as a string, so store.armed/
  editing comparisons against numeric note ids missed; coerced with Number()
  at the delegated-click dispatch

## Done so far

- 2026-11-02 tranche 1 implemented, committed (8437d50)
- 2026-11-02 tranche 2 implemented, committed (82cf58a); four commits now sit
  unpushed on top of origin - push pending user review
- note: old server instances still hold ports 3000/3100/3120 with stale
  cached assets; static files are read once at boot, so a restart is needed
  after any public/ edit
