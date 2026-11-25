# TEST-003: The entity-search spec types before the page has hydrated

**Status:** fixed in the spec (25 November 2026). **Owner:** client-legislation, at root's request. **Priority:** P2: a
flaky integration test, about 1 run in 20–30. **Related:** `tests/integration/experimental-search.spec.ts`,
`tests/utils/test-helpers.ts` (`waitForPageReady`, `waitForHydration`). Reported by client-dev-polish on `44215a01f`,
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

The spec's `hydratedSearchBox(page)` waits, by polling, until the search box carries React's `__reactProps$` key. React
attaches that key to an element when it hydrates it. Every test that types gets the box from this helper. No timeout
was raised. The national-budget specs already read React's `__reactFiber$` keys the same way.

A/B on the same build, `--repeat-each=20` (200 runs per spec), no retries, one worker:

| Spec | Passed | Failed |
|---|---|---|
| Before | 199 | 1 ("renders results on a narrow viewport") |
| After | 200 | 0 |

The miss rate before was lower on this machine than the 1 in 20–30 client-dev-polish saw. The rate depends on how
soon hydration finishes after the network goes idle. The proof rests on the forced race above, and this table only
shows that the fix holds under the spec's own timing.

## Likely the same elsewhere (not checked)

Any spec that types into a server-rendered input right after `waitForPageReady` or `waitForHydration` has the same
gap. Those helpers wait for the network and the skeletons, not for React. Candidates include the landing page's
search and the companies hub's search. A shared helper in `tests/utils/test-helpers.ts`, for example "wait until this
element is hydrated", would close it for all of them. That is a shared file, so it belongs to whoever owns the test
utilities.
