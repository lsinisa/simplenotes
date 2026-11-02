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

- [ ] 3. Edit-in-place: PATCH /api/notes/:id endpoint + clicking a note card
      swaps it into the composer ("editing mode"). Only tranche-2 item that
      touches server/app.js, db.js and the endpoint table.
- [ ] 6. Manual theme toggle: data-theme attribute + duplicate token block in
      CSS; small button in topbar.
- [ ] 7. Delete undo: first delete fires, status chip offers "undo" which
      re-posts the note. Alternative was two-step arm/confirm; undo chosen.
- [ ] 8. Status chip sits below #app at page bottom - relocate under the
      composer so confirmations are visible without scrolling.
- [ ] 9. Sort control chip (newest/oldest/A-Z), client-side sort before map().
- [ ] 10. Search box, client-side filter of title+message, count chip reflects
      filtered count. Only sane while /api/notes stays unpaged.
- [ ] 4b. Full form split: login form drops the name field entirely; needs a
      small state change in guest flow (intent before submit).

## Verification trail

- `node --check public/app.js` after each client edit
- `node server/app.js` + `node test/smoke.mjs` (server untouched in tranche 1,
  but re-run confirms the API and static serving still line up)
- live browser pass: register -> composer -> save button -> note card

## Done so far

- 2026-11-02 tranche 1 implemented, committed (see git log)
