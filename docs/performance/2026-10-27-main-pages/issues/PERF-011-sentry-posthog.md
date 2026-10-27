# PERF-011: Sentry (with Replay and Feedback) and PostHog ship to every visitor before hydration, consent or not

## Summary

Sentry and PostHog are initialised only after consent, but their code is imported statically by the client
entry and the app shell. So both chunks are root preloads on every page:

- `sentry-*.js`: 112 KB zstd, including Replay and Feedback;
- `posthog-*.js`: 77 KB zstd.

Evaluating them is cheap. The cost is ≈190 KB in the pre-hydration wave on every first visit.

## Where

- **Domains:** all 16 audited pages.
- **Sentry:** `src/client.tsx:7,34` → `src/lib/sentry.ts:1,9-13,293,331`.
- **PostHog:** `src/components/app/app-shell.tsx:4-5` and `src/lib/analytics.ts:2`.
- **Consent gates:** `src/components/app/app-shell.tsx:65-71` and `src/lib/analytics.ts:108-118`.

## Evidence

- `sentry-*.js` 327 KB raw / 112 KB zstd (Replay 125 KB and Feedback 39 KB raw), and `posthog-*.js` 227 KB raw /
  77 KB zstd. Both are in the 136-link root set on every page (`evidence/home/analysis/root-preload-breakdown.txt`).
- **Evaluation:** ≈5 ms (Sentry) and 27 ms (PostHog) on mobile (`evidence/home/deployed/home-mobile/trace-summary.txt`).
- **Seen by the domain agents:** in the root set of every page, 109–112 KB plus 75–77 KB (all 14 domain
  reports).

## Root cause

The consent check guards `init`, not the import. `getReactRootErrorHandlers` from `src/lib/sentry.ts` is needed
at `hydrateRoot`, so the whole Sentry module, Replay and Feedback included, comes with it.

## Proposed fix

1. Keep a tiny error-handler stub for `hydrateRoot`.
2. Load `@sentry/react` with `import()` after hydration, or once consent exists. Use Sentry's
   `lazyLoadIntegration` for Replay and Feedback.
3. Import `posthog-js` dynamically once analytics consent is given.

## Expected impact

- **Every first visit:** ≈−190 KB zstd before hydration, ≈1 s on the mobile profile.
- **Visitors without consent:** these bytes are never needed.

## How to verify

1. The root preload list should no longer contain `sentry-*` or `posthog-*`.
2. With consent given, Sentry still captures a forced error (`/test-error`).

## Owner

client

## Severity

**P1** under the brief's scale, because it hits every domain. Moderate gain.

Known in `docs/entity-page-ssr-loading.md:138-139` (sizes only).
