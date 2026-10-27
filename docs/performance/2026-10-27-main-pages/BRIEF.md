# Brief: main page loading, per domain

Requested 2026-10-27 by the owner. Run by the `client-optimization` session. Analysis only: find where the
main page of each domain loses time, prove it with real-browser measurements, and point each problem at code.

## Goal

For every domain's main page on transparenta.eu, measure how it loads in a real browser, find the bottlenecks
(server render, API calls, JavaScript, network, rendering), and rank what to fix first. Deliverables are docs
in this folder; no code changes.

## Setup (already done)

- The main checkout (`~/projects/devostack/hack-for-facts-eb-client`, branch `dev`) was fast-forwarded to
  `9db3bce0` on 2026-10-27: 127 new commits, no dependency changes. Fetch again before you build in case dev moved.
- Zeus: 20 cores, about 42 GiB free, Google Chrome 156, `agent-browser` 0.33.1 (`vitals`, `network har`,
  `trace`, `profiler`, `react renders`), Playwright Chromium. Lighthouse is not installed.

## Two targets, both measured

1. **Deployed: `https://dev-chronos.transparenta.eu`** (API `dev-chronos-api.transparenta.eu`). Real CDN,
   compression and API latency. Record which commit or image it serves; it can lag dev.
2. **Local production build of the latest dev**, served on `127.0.0.1:3013` (the next free port; 3000–3012
   belong to the other sessions' dev servers). Use it to profile and to confirm each finding still applies on
   the latest code. Do not measure the Vite dev server: unbundled modules make its timings meaningless.
   - Mirror how the Dockerfile builds (`yarn build:app`, `yarn build:validate`, `node .output/server/index.mjs`).
   - Point it at the dev-chronos API. `.env.chronos-server.local` relies on Vite's dev proxy
     (`VITE_API_USE_PROXY`), which a production build doesn't have, so browser-side API calls may hit CORS
     from `127.0.0.1:3013`. Solve that without changing app code (build-time env, a local reverse proxy, or
     however the deployed build reaches the API) and write down what you did. Never print the env files.
   - `yarn build --mode …` passes the flag to the last command in the script (`i18n:compile`), not to Vite.
   - Stop the server when the audit is done.

Production `transparenta.eu` is out of scope.

## Prior work to read first

`docs/entity-page-ssr-loading.md`, `docs/reviews/ENTITY-PROGRESSIVE-SSR-2026-09-13.md` and
`docs/research/ssr-performance-optimization-2026.md`. Say in the issue when a finding was already known there.

## Domains

One subagent per domain, in parallel. Confirm each entry URL from the site navigation on dev-chronos. Where an
English and a Romanian route both exist (`/justice` and `/justitie`, `/procurement` and `/achizitii`,
`/public-enterprises` and `/intreprinderi-publice`), test the one the navigation links to and note what the
other does (redirect? duplicate page?).

| Domain | Candidate main page |
|---|---|
| Home | `/` |
| National budget | `/national-budget` |
| Local budgets | `/entities`, plus `/map` and `/budget-explorer` if the navigation treats them as the entry |
| Companies | `/companies` |
| NGOs | `/ngos` |
| Procurement | `/achizitii` or `/procurement` |
| Justice | `/justitie` or `/justice` |
| Public enterprises | `/intreprinderi-publice` or `/public-enterprises` |
| Elections | `/alegeri` |
| Parliament | `/parlament` |
| Statistics (INS) | `/ins` |
| Legislation | `/legislation` |
| PNRR | `/pnrr` |
| Public investments | `/investitii-publice` |
| Town hall | `/primarie` |

Add a domain the navigation shows that's missing here, and drop one that isn't a real entry point.

## What each subagent does

1. **Measure** with a real Chrome (`agent-browser`, or Playwright/CDP when it needs throttling):
   - Both targets, two profiles: desktop unthrottled, and mobile emulation with slow 4G and 4× CPU throttling.
   - Cold load (empty cache) and repeat view; at least 3 runs each, report the median.
   - Record TTFB, FCP, LCP (and the LCP element), CLS, TBT and long tasks, and when hydration ends.
   - Record requests and bytes by type (document, JS, CSS, fonts, images, API); the JS chunks loaded, with sizes.
   - Record every API/GraphQL call: operation, payload size, duration, made during SSR or in the browser, and
     whether calls chain one after another.
   - Record SSR HTML size, cache-control and compression headers, render-blocking resources and console errors.
   - Save HAR, trace and screenshots under `evidence/<domain>/<deployed|local>/`.
2. **Find the cause in code:** route loaders and `beforeLoad`, queries, heavy components, what ends up in the
   page's chunks (from the build's `.output/public/assets` and manifest). Cite `file:line`. When the API is
   slow, say so and mark the owner as `server`; don't analyse or edit the server repo beyond that.
3. **Write `domains/<domain>.md`:** numbers table (target × profile × cold/warm), the load waterfall in a few
   lines, and candidate issues with provisional ids `<domain>-1`, `<domain>-2`, …

### Measurement lock

Timed runs share the CPU and the local server, so parallel runs would distort each other. Wrap every timed
browser run in `flock /tmp/perf-audit-2026-10-27.lock …` so only one runs at a time. Code reading, trace
analysis and writing go on in parallel. Keep at most about 8 browsers open at once.

## Lead's job (the session)

- Dispatch the subagents, then dedupe their candidates: a shared cause (root bundle, fonts, a shared query,
  the shell) becomes **one** issue that lists every domain it hits.
- Assign final ids `PERF-001…` in rank order and write each issue to `issues/PERF-NNN-<slug>.md`.
- Before you finalise, re-measure the top issues yourself, or with a fresh-eyes reviewer subagent, to confirm
  the numbers and that each cause points at the right code.
- Write `README.md`, the main doc.

## Folder layout

```
docs/performance/2026-10-27-main-pages/
  BRIEF.md            this file
  README.md           main doc (lead)
  domains/<domain>.md per-domain report (one subagent each)
  issues/PERF-NNN-<slug>.md
  evidence/<domain>/<deployed|local>/   HAR, traces, screenshots (raw; never commit)
```

**README.md (main doc):**
1. A lead paragraph with the top three findings and their numbers.
2. Environment: date, commits for both targets, Chrome version, profiles.
3. A per-domain results table: medians for both targets.
4. A ranked issue table: id, title, domains, severity, expected gain, owner (client, server or infra), link.
5. Cross-cutting themes in a few lines.
6. Method.
7. Open questions.

**Each issue doc:**
1. Summary.
2. Where: domains, URLs, `file:line`.
3. Evidence: numbers on each target, plus paths into `evidence/`.
4. Root cause.
5. Proposed fix.
6. Expected impact.
7. How to verify.
8. Owner.
9. Severity: **P0** breaks or blocks a main page; **P1** costs more than 1 s of LCP/TTFB on mobile, or hits
   most domains; **P2** a measurable, local cost; **P3** polish.

## Rules

- Analysis only: no source edits, commits, pushes or PRs. Everything in this folder stays uncommitted until
  the owner says otherwise.
- Don't edit the server or the scrapper. Don't touch the other sessions' worktrees or ports 3000–3012.
- Be polite to dev-chronos: no load tests, and only the runs the method needs.
- No secrets in docs or logs. No personal data copied from pages (justice and elections pages show people);
  crop or skip screenshots that show it.
- Use `yarn run check`, never `yarn check`, if you need the checks.
- When done, post a short summary in your session: the top issues and the README path.
