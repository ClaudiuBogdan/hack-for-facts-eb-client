# PERF-007: `/pnrr`'s overview waits for the whole 3.4 MB (28 MB decoded) dataset in a worker: the full overview lands at 43 s on mobile

## Summary

The PNRR dashboard renders its header and four cards on the server. Everything else waits for a browser Web
Worker to download and process the raw dataset: the rankings, the previews and the map preview. That dataset
is 3.40 MB gzip, 28.2 MB of indented JSON, 24,966 rows, and it is served uncached, gzip-only and with a 60 s
max-age.

On mobile cold the full overview appears at **43.2 s**, 24.7 s after hydration; 19.7 s of that is the download.
On desktop it appears at 2.98 s. What the overview actually needs is a 64 KB model (15 KB gzip), and the server
already holds the processed projects it could build it from. LCP does not show any of this, because LCP is the
server-rendered text at 7.3 s.

## Where

- **Domain:** PNRR. **URL:** `/pnrr`, on the landing page; not in the sidebar.
- **Worker:** `src/features/pnrr/workers/pnrr-data.worker.ts:116-123` downloads every raw file; `query()` at
  `:1429` builds every tab.
- **SSR snapshot:** covers only the header and the cards (`PnrrDashboard.tsx:116-121`, `PnrrOverview.tsx:228-233`).
- **Server data:** `src/server/handlers/pnrr-data-proxy.ts`:
  - `fetchPnrrProjects` (`:632-691`) holds the processed projects;
  - `pnrr-seo.ts:255-320` builds the 2 KB SEO snapshot from them;
  - `fetchPnrrRawFile` (`:333-392`) re-serves the raw file as text;
  - `:567-569` sets `max-age=60, stale-while-revalidate=600`.
- **Snapshot id:** `lib/snapshot.ts:2` (`PNRR_SNAPSHOT_PREFIX = '20260619'`); the file set is frozen and
  versioned.

## Evidence

**Full overview** (the rankings and previews replace the skeleton, from `reactCommitTimes`):

| | mobile cold | after hydration | desktop |
|---|---:|---:|---:|
| deployed | **43.2 s** | 24.7 s | 2.98 s |
| local | 41.5 s | | 2.69 s |

- **Where the 24.7 s goes on mobile:**

  | step | time |
  |---|---:|
  | projects download | 19.7 s |
  | worker bundle | 2.1 s |
  | client chunk | 0.6 s |
  | serial payments fetch | 0.6 s |
  | worker CPU (not throttled, so an under-estimate) | 1.3 s |

- **Reproduced:** one extra deployed mobile run gave 43.2 s again
  (`evidence/pnrr/extra/deployed-mobile-throttled-worker.json`).
- **Sizes:**

  | form | size |
  |---|---:|
  | gzip as served | 3.40 MB |
  | minified gzip | 3.04 MB |
  | minified brotli-5 | 1.94 MB |
  | zstd-19 | 1.61 MB |
  | the overview model, computed with the built worker in Node | 64 KB / 15 KB gzip |
  | the whole query result (all tabs) | 1.1 MB / 190 KB gzip |

- **Local:** zstd-3 through the front proxy (3.06 MB) made the full overview 1.7 s earlier. Size matters.
- **Headers:** `cf-cache-status: DYNAMIC` on every `/api/pnrr/raw/*` response, and no ETag or Last-Modified. A
  visitor returning after 11 min downloads all 3.4 MB again.
- **Harness gap:** the batch's per-page transfer for `/pnrr` misses the worker's 3,566 KB, because worker requests
  are not visible to the page session. The figures above come from `run1.har`. The 4× CPU throttle does not apply
  to worker targets, and every `/pnrr` run hit the time cap.
- **Source:** pnrr-1 and pnrr-5 in `domains/pnrr.md`.

## Root cause

- By design (`docs/PNRR-DASHBOARD-IMPLEMENTATION.md`), the browser worker processes all raw files for every
  view, including the default overview.
- The raw files are re-served by the pod with short-lived headers and no CDN caching.

## Proposed fix

1. **Build the overview model on the server.** It is the same code (`buildOverview` in the worker module).
   Cache it per search key like the SEO snapshot, and dehydrate it in SSR or serve it from a small
   `/api/pnrr/overview`.
2. **Map preview:** render it at county granularity, or fetch its UAT series separately.
3. **Load the raw dataset only when it is needed:** when the visitor opens the projects, map, beneficiaries or
   anomalies tab, filters, or exports. On desktop, it can also load on idle.
4. **Serve the raw files better.** Version the URL with the file-set id and send
   `public, max-age=31536000, immutable` with an ETag. Minify and precompress once per refresh (brotli or zstd).
   Add a Cloudflare cache rule for `/api/pnrr/raw/*`.

## Expected impact

- **Mobile:** full overview at hydration (≈18.6 s, or complete in the SSR HTML) instead of 43.2 s: **≈−24 s**.
- **Desktop:** ≈−1.8 s.
- **Transfer:** −3.4 MB per default-view visit.
- **Fix 4 alone:** −8 to −9 s on mobile while the dataset is still needed, and repeat visits stop re-downloading
  it.

## How to verify

1. In a mobile cold run of `/pnrr`, there is no `/api/pnrr/raw/*` request in the HAR (the worker's requests
   appear there).
2. The rankings are present in the SSR HTML, or at hydration.

## Owner

client; infra for the Cloudflare rule

## Severity

**P1**: the page's main content is blocked for more than 20 s on mobile, although LCP does not show it.
