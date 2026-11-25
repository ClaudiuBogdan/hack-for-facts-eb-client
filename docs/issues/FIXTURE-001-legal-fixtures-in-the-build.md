# FIXTURE-001: Legislation test fixtures ship in the production build

**Status:** fixed (25 November 2026, see "Done" below). **Owner:** client-legislation. **Priority:** P2. **Related:** review
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

## Done

All eight facades now carry the guard: `legal-act-api.ts` (the act-detail fixture), `legal-acts-api.ts`,
`legal-api.ts`, `legal-domain-counts-api.ts`, `legal-outline-api.ts`, `legal-render-api.ts`,
`legal-resolve-document-api.ts` and `legal-status-counts-api.ts`. Every function was already `async`, so no caller
changed. No other production module imports a legislation mock or fixture.

Markers on the production build, before (`8c2a7d2e5`) and after, as files in `.output/public` JS / `.output/server`:

| Fixture | Marker | Before | After |
|---|---|---|---|
| legal-act-detail | „Directiva 2006/112/CE privind sistemul comun” | 1 / 1 | 0 / 0 |
| legislation-overview | „Legea nr. 53/2003” | 1 / 1 | 0 / 0 |
| legislation-status-counts | `194924` | 1 / 1 | 0 / 0 |
| render mock (TLDF rows) | `render-rows-100019` | 1 / 3 | 0 / 0 |
| render mock | `tldf-compiler-v3` | 3 / 3 | 0 / 0 |
| legislation-domain-counts | `109969` | 0 / 0 | 0 / 0 |

The domain counts were already out: no page uses their hook today, so the build drops them; the guard keeps them
out once one does. The outline and resolve-document mocks hold no data of their own (the outline is derived from the
render fixtures).
