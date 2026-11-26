# SEARCH-001: A search typed before the page hydrates is lost

**Status:** fixed on `/legislation/search` (26 November 2026, not yet on dev); open on `/experimental/search` (filed 25 November 2026). **Owner:** client-legislation for `/legislation/search`; the entity search's
owner for `/experimental/search`. **Priority:** low. It is reader-facing, but nothing waits on it. **Related:**
TEST-003 (the test flake that proved it), `src/features/legal/components/legislation-act-finder.tsx`,
`src/features/entity-search/components/entity-search-input.tsx`. Raised by the legislation session; filed at root's
request.

## What happens

The search pages are server-rendered, so a reader sees the search box before React has hydrated it. On a slow phone
that window can last seconds. Text typed into the box during it stays on screen, but no search runs:

- **Typing does nothing.** React 19 hydrates an input without writing its value and fires no change event. The
  component's draft stays empty, so its debounced search never starts. React also records the typed text as the
  input's tracked value, so typing the same text again triggers nothing either. The reader has to change the text
  for anything to happen.
- **Enter does not help on `/legislation/search`.** The box sits in a `<form role="search">`, but the input has no
  `name`. A pre-hydration Enter submits the form natively, and the browser sends `GET /legislation/search` with no
  `q`: the page reloads empty.
- **The entity search** (`/experimental/search`) has no form, so Enter there does nothing at all before hydration.

TEST-003 measured it in the browser: typing as soon as the server-rendered box was visible lost the search in 20 runs
out of 20, with no request sent and no `q` in the address.

## Fix (suggested, not started)

1. **`name="q"` on the search inputs**, inside a form whose native submit is a GET to the page. A pre-hydration Enter
   then loads `…?q=…`, and the server renders the answer. On `/legislation/search` the form exists; the entity search
   needs one.
2. **On mount, take the DOM value when it differs from the draft.** The search then picks up text typed before
   hydration as soon as React takes over, without a second keystroke.

Both are small and local to each search component. Check each fix with the forced race from TEST-003: type before
hydration, then expect the search, or the `q` after Enter.

## Fixed on `/legislation/search` (26 November 2026)

Both parts are in `legislation-act-finder.tsx`:

1. The form is a native GET to `/legislation/search`: the input is `name="q"`, and the filters the address holds go
   with it as hidden fields. A pre-hydration Enter on `…?tip=lege` asks for `…?tip=lege&q=Codul+civil`.
2. On mount the field takes the box's DOM value when it differs from the draft, so the text is searched after the
   usual typing pause.

Checked two ways. A unit test hydrates the server's markup with text already in the box and expects the search
(`legislation-act-finder.test.tsx`, "before the page hydrates"); it fails with the mount read removed. In a browser on
the preview, with every script held back while typing: the text was searched once the scripts ran, the filter kept;
and Enter before hydration loaded the address with `q`.

Still open: the entity search (`/experimental/search`), which is its owner's.
