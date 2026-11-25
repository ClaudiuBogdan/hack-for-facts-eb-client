# TEST-002: A Radix focus timer outlives the unit test file

**Status:** fixed on the branch, waiting for the push (filed 2026-11-25 18:50 UTC). **Priority:** P1: when it fires, the whole unit
job fails, and with it the deploy, although every test passed. **Related:** `src/test/setup.ts` (the `afterEach`),
`src/test/setup-focus-cleanup.test.tsx`, f478bfc55 (an earlier fix for one path of the same class). Reported by root
(refactor-architecture) from client CI run 45674516558.

## What happens

CI run 45674516558 (commit 90bfe0f14), job "Unit Tests (3/4)" (139418360842), 18:26:43Z. All 315 files and 3,360 tests passed, but
Vitest caught one unhandled error and the job failed:

```
TypeError: Failed to execute 'dispatchEvent' on 'EventTarget': parameter 1 is not of type 'Event'.
 ❯ HTMLDivElement.dispatchEvent node_modules/jsdom/lib/generated/idl/EventTarget.js:236:24
 ❯ Timeout._onTimeout node_modules/@radix-ui/react-focus-scope/dist/index.mjs:97:23
This error originated in "src/components/maps/advanced-map-analytics/advanced-map-analytics-data-table.test.tsx"
```

It does not fire on every run: it depends on how fast the worker tears the file down.

## Cause

When a Radix FocusScope unmounts, it hands focus back from a real `setTimeout(0)`. Every menu, popover and dialog has one. The
timer builds a `CustomEvent` and dispatches it on the scope's container.

A synchronous test never yields to a macrotask, so the timer outlives the test that started it. A probe on `setTimeout`, run on
dev at 90bfe0f14, shows this in the data-table file:
- the timer scheduled by the cleanup of "renders bins sections in Filter menu" stays pending through the next five tests;
- the timer from the file's last test, "exposes grouped row view controls", is still pending at `afterAll`, on every run. That test
  closes the View menu by choosing "Groups".

After `afterAll` the worker tears jsdom down, and the global `CustomEvent` is Node's again. (`setup.ts` points it at jsdom's only
while jsdom is up.) If the timer fires after that, jsdom's `dispatchEvent` rejects the Node event, and Vitest reports the error
against the file.

f478bfc55 kept the CSV export test off fake timers, so its timer is no longer lost. That did not cover a file whose last test leaves
a timer pending.

## Fix

`src/test/setup.ts`: the global `afterEach` calls `cleanup()` and then waits one real macrotask. The `setTimeout` it uses is taken
when the setup module loads, before any test can install fake timers. Node runs timers of the same delay in the order they were set,
so every focus timer scheduled during the test or by `cleanup()` runs before the wait ends: inside its own test, while jsdom is up.
This covers every test file, not only the data-table one. It costs about one millisecond per test.

## Test

`src/test/setup-focus-cleanup.test.tsx` runs two tests in order:
1. The first leaves a dropdown menu open, for `cleanup()` to unmount.
2. The second asserts that the menu's `onCloseAutoFocus` (FocusScope's unmount callback) has already run.

Without the fix, the second test fails: "expected to be called 1 times, but got 0 times". With the fix, both pass. With the
fix, the same probe finds nothing pending at the data-table file's `afterAll`.

## Verification

See the commit's gate note: `yarn check`, the full unit suite and both integration steps, each run twice, with the unit suite's wall
time against a dev baseline.
