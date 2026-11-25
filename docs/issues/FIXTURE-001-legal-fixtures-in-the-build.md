# FIXTURE-001: Legislation test fixtures ship in the production build

**Status:** open. **Owner:** client-legislation. **Priority:** P2; not a blocker for the search page push. **Related:** review
`astra-client-7` finding 16 (25 November 2026), the guard pattern in `src/features/legal/api/legal-analytics-api.ts`,
`legal-changes-api.ts`, `legal-gazette-api.ts`, `legal-freshness-api.ts`, and for search and the resolver `21106d2b6`.

## What happens

A legislation API facade that imports its mock module statically puts the mock and its fixture into the production
JavaScript. Production defaults to the live API (an explicit mock override exists, and without the guard below it
would serve these fixtures there). The fixtures name real acts as they were when copied,
so the public bundle carries stale legal data that no page shows, and the server bundle carries it too.

Confirmed on the build of `c6126ce8f` (25 November 2026): `legal-act-api.ts` imports `legalActDetailById` from
`mocks/fixtures/legal-act-detail` at the top. Its markers are in the public chunk `assets/legal-act-api-*.js` (21 KB)
and in the server output:

- „Data adoptării Codului fiscal (Legea nr. 227/2015).”
- „Data publicării legii în Monitorul Oficial nr. 5.”
- „Directiva 2006/112/CE privind sistemul comun al TVA”
- „HOTĂRÂRE nr. 206 din 27 martie 1996”

## Likely the same (static mock imports, not yet checked one by one)

`legal-acts-api.ts`, `legal-api.ts`, `legal-domain-counts-api.ts`, `legal-outline-api.ts` (and its mock's import of
`legal-render-api.mock`), `legal-render-api.ts`, `legal-resolve-document-api.ts`, `legal-status-counts-api.ts`. None has
a chunk of its own, so their fixtures would sit inside other chunks; grep the build for a marker from each fixture.

## Fix

The pattern already used by six legislation facades: `const FIXTURE_BUILD = import.meta.env.DEV ||
import.meta.env.MODE === 'test'`, and the mock loaded with `await import('./…mock')` behind `FIXTURE_BUILD &&
isLegalMockEnabled()`. In production the condition is the constant `false`, so the mock module is never emitted.
A facade whose function is synchronous today becomes `async` (its callers already await a query function). After the
change, grep `.output/public` and `.output/server` for one marker per fixture: zero hits each.

## Who fixes it

client-legislation, in a follow-up after the search page push.
