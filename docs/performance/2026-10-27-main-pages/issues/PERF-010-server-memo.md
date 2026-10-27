# PERF-010: Server-side data memos expire every 10 minutes with no stale-while-revalidate, so the next visitor waits 1.5–3.2 s for the HTML

## Summary

Several main pages keep their SSR reads in module-level memos inside the Node process. That is why their warm
renders are fast. The shared helper `createServerMemo` deletes an entry when it expires, and the next request
waits for a fresh read. Each pod has its own memo, and no CDN caches the HTML ([PERF-017](PERF-017-html-cache.md)). So on a quiet
site most first visits after a pause pay the whole API fan-out before the server sends a byte. On deployed
`/procurement` that is a TTFB of 1.9–3.2 s instead of 64–149 ms, and FCP and LCP follow.

Some other module-level caches never expire. These carry the opposite risk: data older than the API's.

## Where

- **Helper:** `src/lib/ssr/server-memo.ts:19-48`. On expiry `memo()` deletes the entry and awaits a new read
  (`:35-40`).
- **Users** (all `KEEP_MS` = 10 min), checked by the lead:
  - `src/features/procurement/api/procurement-{home,analytics,buyer,supplier,contract,procedure,direct-purchase}-ssr.ts`;
  - `src/features/justice/api/justice-ssr.ts` and `justice-analysis-ssr.ts`;
  - `src/features/public-enterprises/api/public-enterprise-ssr.ts`.
- **Procurement front door:** `procurement-home-ssr.ts:26-30`, three memos keyed by year. The loader is
  awaited before any HTML (`src/routes/procurement/index.tsx:48-49`).
- **Never-expiring module caches:**
  - procurement: `procurement-api.live.ts:79-80` (CPV divisions; `partyNameCache` grows without bound and is
    cleared only by `resetProcurementLiveCachesForTests`, `:486-490`) and `procurement-reference-api.ts:50`.
    `procurement-cutoff.ts:16,29` does expire, after 10 min, like the memos.
  - parliament: `parliament-api.live.ts:156,446,851` and `api/graphql/vote-summary-cache.ts:19-26`;
  - public enterprises: `authority-portfolio-server.ts:12`;
  - budget: `src/lib/analytics-utils.ts:13-16`.
- **An in-repo example of the fix:** the PNRR caches expire after 1 h.
  - The SEO loader serves stale snapshots while one refresh runs (`pnrr-seo-loader.ts:131-162`). That is the
    stale-while-revalidate that fix 1 asks for.
  - The raw files use stale-on-error only: an expired entry is read again and awaited, and the stale copy is
    served only if upstream fails (`pnrr-data-proxy.ts:333-391`).
- **Per request, for contrast:** the router's QueryClient is created per request (`src/router.tsx:11`).
- **Domains:**
  - procurement: measured on the main page;
  - justice: the court, case and analysis pages use the helper, but the `/justice` hub reads no data (justice
    report);
  - public enterprises: the enterprise page uses the helper; the `/public-enterprises` hub reads no data.

  So of the main pages, only `/procurement` is affected.

## Evidence

- **`/procurement`, deployed:**
  - TTFB 1,891 ms on desktop run1-cold and 3,159 ms on run1-warm (`cfOrigin` 1,728 and 3,129 ms). That fits both
    pods holding an expired memo, but this is inferred: the responses carry no pod id;
  - one curl at 16:58 took 2,603 ms (`x-envoy-upstream-service-time: 2523`), then 23–28 ms for the next two
    (procurement report §2);
  - warm renders 64–149 ms;
  - desktop FCP 2,280 ms against ≈510 ms.

  Source: `evidence/procurement/deployed/procurement-desktop/run1-{cold,warm}.json`
  (`document.headers.server-timing`).
- **`/procurement`, local:**
  - cold render 1,559 ms. The four SSR reads form three parallel branches: National (850 ms) followed by PartyNames (70 ms,
    chained, because the party names need the national CUIs), alongside Categories (959 ms) and Contracts
    (1,500 ms). Contracts, the slowest, sets the TTFB; the chain is off the critical path;
  - warm 25–56 ms.

  Source: `evidence/procurement/local/procurement-desktop/run1-cold.json` (`ssrApiCalls`).
- **Medians hide it:** the batch medians mostly show warm renders, because only a run that lands after expiry,
  or on the other pod, pays.
- **Source:** procurement-1 in `domains/procurement.md`; home-S10 in `domains/home.md`.

## Root cause

- The memo is a plain TTL map without stale-while-revalidate.
- The window (10 min) is far shorter than the data's update rhythm: SEAP loads at most daily.
- Each replica has its own memo: 2 on chronos-dev, up to 8 in production per `k8s/base/hpa.yaml:11-12`.
- No HTML cache sits in front (Cloudflare `DYNAMIC`), so the route's `s-maxage=600` does nothing.

## Proposed fix

1. Make `createServerMemo` serve the expired value while one background read refreshes it, and keep failed
   reads out, as now.
2. Raise the windows to match the data (1–6 h for procurement).
3. Optionally warm the front-door reads on server start.
4. For the never-expiring caches, add a TTL or key them on the API's release marker, and bound `partyNameCache`.
5. Longer term, cache the HTML at the CDN ([PERF-017](PERF-017-html-cache.md)).

## Expected impact

- **Visitors who hit an expired memo:** −1.5 to −3.0 s of TTFB, FCP and LCP. On a low-traffic pod that is most
  first visits after a quiet spell.
- **With a start-up warm-up:** no visitor pays it.
- **The 10 SSR modules:** all gain from the one change.

## How to verify

1. Load `/procurement` twice, more than 10 min apart, on one pod. The second TTFB should be < 200 ms.
2. Check the proxy log: the refresh read happens after the response.

## Owner

client

## Severity

**P1**: 1.9–3.2 s of TTFB for every visit that lands on a pod after its memo has expired. It was seen in 2 of
12 deployed `/procurement` loads (both desktop) and applies equally to mobile. It hits one main page. How often
real visitors hit it depends on traffic, which was not measured.
