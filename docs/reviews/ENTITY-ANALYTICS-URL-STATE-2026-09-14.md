# Entity analytics URL state and SSR — 2026-09-14

An explicit EUR URL could be rewritten by the filter panel into a preference-only
state while the page's separate preference hook still read RON. This triggered
extra queries and could display the wrong currency. Explicit settings now remain
in the shareable URL. SSR and the mounted page use the same effective-filter and
query-options functions and a consistent one-minute freshness policy. Hydration
starts from the preferences read for that request. The selector receives resolved
currency/normalization for legacy EUR aliases without rewriting the URL.

Filter/reset actions now set page=1 in the same navigation. The public SSR response
explicitly varies by Cookie, matching Nitro's existing cookie-aware cache key.
No UI redesign, API schema change or persisted-preference abstraction was added.

Astra xhigh approved the code. GLM 5.3 max reviewed security only; the Cookie header
addresses its conditional shared-cache observation. Type/lint checks and 37 focused
regressions pass. Production-built local browser checks disable HTML and API
response caches: one SSR ranking per default page and no duplicate hydration
request; explicit EUR/inflation=true remains correct against RON/false saved
preferences; page-2 filter changes request offset zero. The server optimization
is documented in its `docs/reviews/ENTITY-ANALYTICS-PERFORMANCE-2026-09-14.md`.

Partial-URL default expansion is deferred: merging defaults into every URL object
would undo cleared filters after serialization. Existing clear semantics and
explicit historical selections remain unchanged. No broad URL-state rewrite.

Validation incident: one test command mistakenly invoked pnpm in this Yarn-managed
repo. Its generated pnpm files were removed after backup, and dependencies were
restored from the unchanged frozen Yarn lockfile. Subsequent checks use Yarn;
the production validation checkout has separate dependencies/build caches.
No package.json or yarn.lock change is included.

No push or deployment is part of this commit. Next: reviewed Chronos index
application and server/client dev deployment, then repeat uncached measurements.
Local evidence: `/private/tmp/entity-analytics-fix-20260914/`.
