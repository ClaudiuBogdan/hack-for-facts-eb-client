# Entity page: what renders on the server, what loads on the client

Decision record for `/entities/$cui` (2026-09-23). `/primarie/$cui` shares
`src/features/entities/page-core/` and the same split, but does not yet have
the deadline below (see "Not done here").

## The split

| Work | Where | Why |
|---|---|---|
| Entity details (`GetEntityMetadata` → `GetEntityBudget`): name, county, population, income/expense/balance totals and trends | **SSR, blocking** | Feeds `<title>`, the meta description, JSON-LD, the `<h1>` and the three KPI cards — the LCP element and everything a crawler or a link preview needs. |
| Everything else (relationships, line items, subordinate ranking, reports, map population, treemap analytics) | **Client** | Below the fold or interactive; none of it appears in the head. It already loads through the page's own hooks behind skeletons. |
| Native INS view (`?view=ins`) identity | **SSR, blocking** | The page needs it before it can render anything; its head is the nameless base today (pre-existing). |

Cost of the blocking part, measured on 2026-09-23 for CUI 4270740:

| Path | `GetEntityMetadata` | `GetEntityBudget` | Page TTFB |
|---|---|---|---|
| Local API on this VM → prod DB (cold, cache empty at boot) | 55ms | 31ms | — |
| Local API (warm) | 20ms | 20ms | — |
| Deployed dev API from this VM (through Cloudflare) | ~340ms | ~70ms | 0.46s (built app) |
| `dev-chronos.transparenta.eu` end to end | — | — | 0.55–1.15s |
| `transparenta.eu` end to end | — | — | 0.53–0.85s |

The database work is a few tens of milliseconds; what the reader waits for is
network hops and rendering. Moving entity details to the client would cost the
head its title and description and push the LCP behind a JS download and two
sequential API calls, for a saving that only exists when the API is slow. So
the split stays, and the slow case is handled by a deadline instead.

## The SSR deadline

TanStack Start sends no bytes until every loader has resolved
(`pendingComponent` is client-only; `ssr: 'data-only'` still awaits the
loader). A slow API therefore froze the tab on the previous page: with a 4s
delay on `GetEntityMetadata` the first byte arrived at 4.5s.

`createEntityPageSsrDeadline()` gives the server loader a budget
(`ENTITY_PAGE_SSR_DEADLINE_MS`, default 2000ms; `0`, a non-integer, or a value
beyond Node's timer range disables it, the last two with a warning). When it
runs out:

1. the loader cancels the blocking queries (the query's `AbortSignal` aborts
   the fetch) and removes them from the server cache, then returns the payload
   without entity data, marked `ssrBootstrapStatus: 'timed-out'`. Removal is
   not optional: the router's query integration dehydrates every query, and a
   pending one travels with its promise, which the client would adopt as its
   first fetch attempt;
2. the response is a **503 with `Retry-After: 5` and `Cache-Control:
   no-store`**. Browsers render the body like any 200, so readers get the
   shell (the page's own loading skeleton, which mirrors the loaded layout
   block for block) and the client fetches the same queries. Crawlers and link unfurlers, which run no
   JavaScript and keep whatever `<title>`/`og:` tags they see, treat a 503 as
   temporary instead of indexing or caching the placeholder head. A 200 with
   `noindex` would be worse: Google drops a page on `noindex` without
   rendering it. Nitro's route cache stores nothing at or above 400, which
   matters because its `/entities/**` rule is only dead by accident (the
   share-image rule collapses onto the same node). The status needs the
   custom server entry in `src/server.ts`: TanStack's stream renderer takes
   the status from the router (200/404/500), not from `setResponseStatus`,
   although it does merge the headers set the same way;
3. the lazy route calls `router.invalidate({ sync: true })` once, which
   re-runs the loader on the client and then `head`, restoring the entity's
   title, description and JSON-LD. `sync` is required: a background
   invalidation re-runs `head` immediately, with the stale payload. The match
   keeps its data during the reload, so there is no pending flash. The native
   INS view skips this: its payload never carries the entity, so a reload
   could not change its head.

Cached data always wins the race, even at zero remaining time. Client-side
navigations never get a deadline: the router's `defaultPendingMs: 200` already
shows the skeleton there. The route's `pendingComponent` renders that same
skeleton inside the page's column (`EntityPagePending`), so a navigation and a
slow query look alike; it has to stay in the eager route file, because the
router only arms the pending timer when the eager options carry a pending
component. The skeletons read their frame classes from
`challenge-entity-analysis-frames.ts` and `entity-financial-frames.ts`, the
same modules the real components use, so their geometry cannot drift.

Because the entity query now consumes its abort signal, the cache cancels an
in-flight fetch when its last observer leaves. A client-side reload joined to
that fetch (the recovery, or a stale-match reload) then rejects with
`CancelledError`; the loader treats that as "give up on the payload", not as
an error, and marks it `ssrBootstrapStatus: 'cancelled'` so that returning to
the page (a cached match, whose background reload never re-runs `head`)
recovers again. A `complete` payload without a name would keep the
placeholder head for good.

Measured on the built app behind the delay proxy with `GetEntityMetadata`
delayed 4s: first byte at 2.05s (was 4.5s), `<h1>` at ~7.8s once the client's
own delayed fetch lands, title and description healed; the normal path is
unchanged at ~0.46s TTFB with no client refetch.

## Reproducing the slow path

```bash
# 1. Delaying proxy in front of the API (control endpoints in the file header)
node scripts/delay-graphql-proxy.mjs                          # :3001 → dev-chronos-api

# 2. Built app. The browser's GraphQL goes through the app's /api/v1/graphql
#    server route, whose target is inlined at BUILD time; server-side fetches
#    follow INTERNAL_API_URL at runtime.
VITE_API_PROXY_TARGET=http://127.0.0.1:3001 yarn build
PORT=3002 INTERNAL_API_URL=http://127.0.0.1:3001 VITE_API_URL=http://127.0.0.1:3002 \
  VITE_API_MODE=redesign VITE_APP_NAME=Transparenta VITE_APP_VERSION=local \
  VITE_APP_ENVIRONMENT=development node .output/server/index.mjs

# 3. Make one operation slow and time the page
curl 'http://127.0.0.1:3001/__delay?op=GetEntityMetadata&ms=4000'
curl -s -o /dev/null -w 'status=%{http_code} ttfb=%{time_starttransfer}s\n' \
  http://127.0.0.1:3002/entities/4270740                       # 503 at ~2.0s
```

## Not done here

- `/primarie/$cui` still awaits entity details and line items with no
  deadline and sends `s-maxage=600` unconditionally. The fix is a page-core
  `loadEntityRouteWithinDeadline` shared by both routes rather than a second
  copy of the entities loader.
- When the deadline fires during the `GetEntityBudget` leg, the metadata
  already fetched (name, county, population) is dropped with the query, so the
  shell's head is still the placeholder. Fetching metadata as its own query
  would keep it.
- `graphqlQuery` rewraps an abort as a `GraphQLRequestError` with no marker;
  callers that want to ignore cancellation re-test `signal.aborted`.

## Related observations (not changed here)

- Cloudflare returns `cf-cache-status: DYNAMIC` for the entity HTML on both
  deployments: the `s-maxage=300` the route sends is ignored without a cache
  rule for HTML. `?year=abc` answers a 500 that still carries the public cache
  headers (pre-existing; the route now sends no-store when there is no loader
  data).
- The legacy `transparenta.eu` build ships a 356KB inline hydration payload
  (478KB HTML) against 12KB (114KB) on `dev-chronos`; the redesign transport
  already fixed it.
- The built client loads 592 JS files / 6.2MB uncompressed on this page
  (entry 858KB, map workspace 525KB, recharts 463KB, two Lingui catalogs
  ~615KB, Sentry 324KB, PostHog 227KB). Bundle work is a separate task.
