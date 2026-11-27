# TEST-003: The entity-search spec types before the page has hydrated

**Status:** fixed in the spec (25 November 2026), then for every spec in the shared helpers (27 November 2026).
**Owner:** client-legislation, at root's request; the shared helpers are client-entity-analytics'. **Priority:** P2: a
flaky integration test, about 1 run in 20–30. **Related:** `tests/integration/experimental-search.spec.ts`,
`tests/utils/test-helpers.ts` (`waitForPageReady`, `waitForHydration`, `waitForElementHydration`). Reported by client-dev-polish on `44215a01f`,
through root (refactor-architecture).

## What happens

About one test in 20–30 types its query with `fill()` and never sees the answer, then times out after 15 seconds. It is
a different test each time: the degraded-engine hint, the mobile results, the facet chips. Run on its own, each test
passes in about 2 seconds. The rate is the same with or without the ssr-api harness.

## Why

The page is server-rendered, so the search box is on screen before React has hydrated it. The spec waits with
`waitForPageReady`, and its "hydration" step only waits for the network to go idle (a timeout is swallowed) and for
skeletons to disappear. Neither says React has taken over the box.

When `fill()` lands first, the text stays in the box but never reaches React. React 19.2 hydrates an input without
writing its value (`initInput(..., isHydrating = true)` leaves `element.value` alone) and fires no change event. It also
records the typed text as the input's tracked value. The input's state stays empty, its debounced commit never runs,
`q` never reaches the address, and no search request goes out.

## Proof

On a build with CI's integration env (`342df9183`), served on its own port, one worker, no retries:

1. **Natural timing**, 60 runs of the spec's own sequence (`goto`, `waitForPageReady`, `fill('dedeman')`). An init
   script records when the input first carries React's `__reactProps$` key. 3 runs typed before that moment, and all 3
   missed: the text was in the box, but 0 search requests went out and the address had no `q`. Every run that typed
   after it sent its request.
2. **Forced race**, 20 runs each. Typing as soon as the server-rendered box is visible: 20 misses out of 20, all with
   0 requests and no `q`. Waiting for `__reactProps$` first: 20 passes out of 20, each with 1 request and
   `q=dedeman`.

## Fix

**Now in the shared helpers (27 November 2026).**
- **The page.** `waitForHydration`, which `waitForPageReady` calls, waits until React owns the body and every input,
  textarea, select and button. It counts none inside the map libraries' containers (`.leaflet-container`,
  `.maplibregl-map`), whose zoom buttons React never owns. After 15 s it fails, naming the controls that are not
  React's.
- **One element.** `waitForElementHydration(locator)` waits for a single control.
- **Where it landed.** `cc9689676` and `670514ff5`, on dev in `c07941c31`. CI run 46027690433 passed.
- **The spec.** `hydratedSearchBox` was dropped from it afterwards, in a follow-up. Its tests keep `waitForPageReady`,
  which now covers them.

**How the fix was first proven, in the spec (25 November 2026).** The spec's `hydratedSearchBox(page)` waited, by
polling, until the search box carried React's `__reactProps$` key. React attaches that key to an element when it
hydrates it. Every test that typed got the box from this helper. No timeout was raised. The national-budget specs
already read React's `__reactFiber$` keys the same way.

A/B on the same build, `--repeat-each=20` (200 runs per spec), no retries, one worker:

| Spec | Passed | Failed |
|---|---|---|
| Before | 199 | 1 ("renders results on a narrow viewport") |
| After | 200 | 0 |

The miss rate before was lower on this machine than the 1 in 20–30 client-dev-polish saw. The rate depends on how
soon hydration finishes after the network goes idle. The proof rests on the forced race above, and this table only
shows that the fix holds under the spec's own timing.

## Likely the same elsewhere (not checked)

Any spec that typed into a server-rendered input right after `waitForPageReady` or `waitForHydration` had the same
gap. Those helpers then waited for the network and the skeletons, not for React. Candidates included the landing
page's search and the companies hub's search. Since 27 November the helpers wait for React too (Fix, above), so every
spec that calls them is covered. A spec that types without calling them is not.

## Open observation: one run where the box never hydrated (26 November 2026)

In the pre-push gates for this fix (commit `a5d8be236`, the spec run five times with no retries, 50 tests), one test
failed and 49 passed. The same step run again on the same commit passed 50 of 50. So: one failure in 100 runs.

- **The test:** "mobile › renders results on a narrow viewport", the last of the first 50.
- **Where it stopped:** inside `hydratedSearchBox`. React had not attached its props to the search box after 15
  seconds. The page snapshot shows the server-rendered page fully drawn, the box focused, and no hydration. The other
  49 tests each took 2.3 seconds or less.
- **What this is not:** the old failure. No text was typed into a box React did not own; the wait did its job and
  the test failed on the wait, not on a missing answer.
- **Conditions:** load average about 12 on 20 cores. In that last minute another browser was opening a new
  prototype route on the dev preview, a cold compile. This overlap is a candidate cause, not a finding.
- **Not established:** why hydration did not finish. A script chunk that never loaded, a hydration error and plain
  starvation would all look the same in the snapshot. The spec does not record console errors or failed requests.
- **If it shows again:** capture the page's console and failed requests in the helper's failure path before raising
  the timeout. A longer timeout would hide a page that never hydrates.

Root took the push with this open (26 November 2026): one timeout in 100 runs under load against the earlier 1 in
20–30.

**It showed again, and now names its cause (27 November 2026).** The spec ran with only the shared wait, 20 times over
(200 runs each), one worker, no retries.
- **First pass, 16:14 UTC.** 199 passed and 1 failed, while client-legislation's full gates ran on the same host. The
  whole page stayed server HTML: the error listed `body` first among the controls React did not own. There was no
  console or request record.
- **The capture.** The shared helper's failure path now lists what the page reported: its uncaught errors, its
  console errors, and its recent requests that failed or got 400 or more (`whatThePageSaid`). A probe that aborted the
  page's scripts, then one that answered them 404, named the script chunk and its error each time.
- **Second pass, 16:46 UTC.** 193 passed and 7 failed. All 7 fell in one burst of consecutive tests, and every one
  reported `net::ERR_NETWORK_CHANGED`. Chromium raises that when the host's network interfaces change. Docker's veth
  devices coming and going on this host are a likely source, not checked. client-legislation had already seen the
  same signature under load, where a reload hydrated the page.
- **Third pass, 17:08 UTC, with no other heavy run on the host.** 195 passed and 5 failed, again in one burst of
  consecutive tests. The capture now named the requests: the page's script chunks (`/assets/*.js`), each failing with
  `net::ERR_NETWORK_CHANGED`.

So a page that never hydrates on this host is, so far, the host's network, not the page. The capture tells the two
apart from now on. A longer timeout would still hide a real failure.

## Follow-ups

- **A shared helper for the tests: done (27 November 2026).** Root gave it to client-entity-analytics, which owns the
  integration test infrastructure. `waitForHydration`/`waitForPageReady` now wait for React to own the page, and
  `waitForElementHydration` waits for one element (`cc9689676`, `670514ff5`, on dev in `c07941c31`). The spec's own
  `hydratedSearchBox` was dropped afterwards.
  - On a timeout, the shared helper names the controls React does not own and what the page reported (see the open
    observation above, 27 November).
- **A product fix: the same gap hits readers**, filed as SEARCH-001. The proof above is not only about tests. A reader on a slow phone
  who types before the page hydrates gets the same silence: the text stays in the box and no search runs.
  - **What exists now.** On `/legislation/search` the search input has no `name`, so pressing Enter before
    hydration submits the form natively with no `q`. The entity-search box has no form at all.
  - **Fix (1), suggested by the legislation session for later.** Give the search inputs `name="q"`. A pre-hydration
    Enter then submits `GET …?q=…` natively, and the server renders the answer.
  - **Fix (2), same source.** On mount, if the input's DOM value differs from its draft, take the DOM value, so text
    typed before hydration is searched once React takes over.
  - **Owners.** The legislation search is client-legislation's. The entity search belongs to its owner.
