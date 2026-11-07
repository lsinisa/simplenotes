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

## Tranche 3 - layout re-arrangement (client-only, live "layout is awful" ask)

- [x] 16. Composer centred as the page's focus column under the who chip
      (justify-self center; status chip already centred -> same centre line).
- [x] 17. Search/sort chips + count chip merged into ONE toolbar row
      directly above the note list (actions left, current state right);
      summary moved inside the filters div in the template.
- [x] 18. Guest join cards paired side-by-side on >=52rem via a .join grid
      (stack in one column on narrow screens; margin-top hack dropped).
- verification: geometry asserted live (:3150) - composer centre gap 0px,
  toolbar left-to-right order proven by bounding rects, join cards same row
  with 2 grid tracks, notes grid computed 3 tracks at 1264px viewport.

## Tranche 4 - full layout rework (measured on live :3150, 1264px viewport)

Diagnosis (measured, not eyeballed):
- notes render as a 3-column mosaic: cards 322px wide, body text 268px
  (~42 chars/line) and two notes share one row (cardTops [538,538]) - a
  reading list read in a Z pattern is wrong; feeds read in one column
- composer island 567px centred above a 1002px-wide notes grid: no visual
  relationship between the focus box and the list
- empty status row costs ~52px of dead band (35px gap + 17px gap around a
  0px-tall element) - every page has a useless band under the composer
- toolbar stretches 1002px while its content is ~half that: long empty rail,
  count chip floats alone far from the controls
- guest join cards are 277x343 - mostly void padding (login card has 2 fields
  but stretches to the register card's 343px)
- page content 1080px inside a 1264px viewport: nothing caps reading width

Plan:
- [x] 19. Two-pane page frame: at >=60rem editor view, #app becomes
        "head head" / "feed rail" (measured tracks 470px + 401px at 1264px
        viewport); data-mode stamped by paint() so guest stays one column
- [x] 20. Single-column note feed: cardWidths [470,470], cardTops [234,503]
        strictly increasing, body 416px (~65-75 chars/line)
- [x] 21. Card anatomy: note-actions row below the body (actionsRowBelowBody
        verified true), time chip right-aligned in the head row
- [x] 22. Toolbar rides the feed width (toolbarW == feedW == 470) directly
        above the list, count chip pushed to the list's right edge
- [x] 23. Status inside the composer card as its last row: statusParent
        "composer", height 0 when empty - no dead band anywhere
- [x] 24. Guest: ONE join card (width min(34rem,100%)), login section 205px
        + register section 307px stacked with hairline; no twin-card void
- [x] 25. Topbar slimmed: logo 2.25rem (1.9rem on phones), wordmark 1.15rem
- verification for the tranche: geometry asserts live (single feed column,
  cardTops strictly increasing, rail/feed pane widths from computed
  gridTemplateColumns of #app, status height 0 -> composer height unchanged
  when empty), plus one screenshot handed to the user for their own eyes.

## Tranche 5 - de-dating pass (what looks 2010s and why)

Diagnosis against the shipped stylesheet (:3160 build):
- EVERY affordance sits in a bordered, shadowed card: composer card, join
  card, each note card all carry border + box-shadow + surface fill. A page
  of boxes is the signature of card-era UI; modern minimal is flat paper
  with hairline separations
- hover raises a shadow (shadow-1 -> shadow-2) plus border-strong: shadow
  lift is skeuomorphic-era behaviour
- every chip/button has a permanent 1px border: hundreds of tiny outlined
  pills read as button chrome; modern controls are borderless text until
  touched
- textarea/input fields are filled rounded boxes with borders: form chrome
  look; modern is a label + underline affordance
- mono timestamp inside the header row still fine, but the whole header
  row feels boxed while inside a bordered card
- two-pane layout itself is fine (not the problem) - the problem is the
  treatment inside it

Plan:
- [x] 26. Notes are rows on paper: computed borderTopWidth [0px, 1px] with
        --line colour on the second, box-shadow none on both; hover tints
        (row-hover rule)
- [x] 27. Composer/join frames dropped: computed borderTopWidth 1px hairline,
        box-shadow none, transparent fill
- [x] 28. Fields are underline inputs: textarea borderTopWidth 0, borderBottom
        2px; transparent; radius 0
- [x] 29. Chips are text buttons: every button computes borderTopWidth 0px,
        transparent background; hover paints surface-2 (danger-soft for the
        delete chip); armed = danger text + tinted row, no outlines
- [x] 30. Shadows only on the logo: computed boxShadow 'none' on composer/
        notes/status; logo keeps shadow-1 as brand anchor
- [x] 31. Radii down: controls at --radius-sm, regions 0, pill only for the
        non-empty status message
- [x] 32. Type pass: title 1.05rem/600, body .98rem line-height 1.6, count
        copy .8rem ink-soft
- [x] 33. Status pill only when it says something: tinted surface-2/accent-
        soft/danger-soft fill, no border, no shadow
- geometry unchanged from tranche 4 (two panes still computed, cardTops
  [233,509] strictly increasing)

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
