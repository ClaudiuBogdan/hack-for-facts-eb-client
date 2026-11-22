# DEV-CRAWL-001: Crawlers saturate the Chronos dev ClickHouse through the dev client

**Status:** closed 2026-11-22. The owner put Cloudflare Access in front of the dev client and the dev API, and
the crawler load stopped. This breaks the browser's API calls on dev and client CI's integration job; see
[Closed](#closed-2026-11-22-cloudflare-access). The noindex switch and the UA log line stay on in `chronos-dev`.

## Summary

`dev-chronos.transparenta.eu` served production's allow-all `robots.txt` (with the production sitemap) and no
`noindex`. Crawlers walk the dev client's contract pages, and each page's SSR context reads (`fetchContractContext`)
run statistics against the shared dev ClickHouse. By 2026-11-18 about 40–45% of dev ClickHouse queries were refused
with `TOO_MANY_SIMULTANEOUS_QUERIES`. Client CI reads the live dev API, so it fails too. For example, run
44472048904, integration shard 4, `procurement-analytics.spec.ts`, got no counts on all 3 retries. The API-side cap
is tracked in server issue #79.

## Change

`src/server/crawl-guard/` adds two runtime switches. They are read from the server's environment at startup and
set only in `k8s/overlays/chronos-dev/configmap-patch.yaml`. With either switch on, a Nitro plugin wraps the app's
fetch handler, so it sees every request, `public/` files included:

- `ROBOTS_DISALLOW_ALL="true"`:
  - GET/HEAD `/robots.txt` is answered before `public/` with `User-agent: *` / `Disallow: /` and no sitemap, as are
    the aliases Nitro's static handler would resolve to the file (`/robots.txt/`, `/%72obots.txt`);
  - every response carries `X-Robots-Tag: noindex, nofollow`. This includes responses Node or the adapter writes
    outside the app's handler (Node's 417, a failed stream's 500), through a `ServerResponse.writeHead` wrapper
    that is installed only with this switch on. A rejection that escapes H3 is reported and answered with a tagged
    500. Not covered: the 400 Node's HTTP parser writes straight to the socket for a malformed request, and
    HTTP/2, which this server does not speak.
- `REQUEST_UA_LOG="true"`: one JSON stdout line per request the app's handler answers (method, path, status, ms,
  user agent). Node's own 417 and 400 are not logged. There is no
  IP, query string or cookies. Paths are read decoded, as the router reads them. `/unsubscribe/…` and
  `/share/…` paths, and any segment that could be a token (20+ characters with a digit, or 40+), are redacted.
  The status is the app's response status; a stream that fails after the headers are sent is not reflected.

When both switches are unset (prod and Phoenix dev), the plugin replaces nothing:

- `public/robots.txt` stays the static file, sha256
  `9528fc1d43529f751d66e7bea96c38d8dbd9ea3cecd75bcae8cff98ee528d99a`, which a unit test asserts;
- it keeps the same ETag and conditional 304s, and POST still gets 404;
- no header is added and nothing is logged.

The rendered prod overlay is unchanged.

Robots rules only bind polite crawlers. If the load hasn't dropped within an hour of rollout, after Cloudflare's
4 h cache has expired, the UA log names the caller. The Cloudflare cache is not purged from here; that is an
owner/account action.

## After rollout (2026-11-20)

Both switches went live with image `e25d5f0d` (pin `54f30fcd`); the pods started at 11:49–11:50Z. `/robots.txt`
then answered `Disallow: /`. The eleven pages smoke-checked after the rollout each carried
`X-Robots-Tag: noindex, nofollow`.

From the pods' start to 11:56Z, one user agent made 83% of the requests (2051 of 2464; root counted about 87% over
the first ten minutes):
`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36`.

- **What was logged under it:** 175 page requests (138 distinct paths) and 1876 asset requests, as a browser
  rendering pages would make. The pages were `/procurement` 88, `/entities` 27, `/cookies` 21, `/primarie` 18 and
  `/companies` 18. No request for `/robots.txt` was logged under it in the sample.
- **Who it is:** not known. The string is not the one the Playwright runs send (`HeadlessChrome/151`) nor the
  smoke checks' (`transparenta-smoke`). It reads as an ordinary desktop Chrome on Linux, and any client can send
  it: a person, a browser another session drives, or a crawler. Before proposing a block, check that no session of ours runs Chrome 155 on Linux against
  dev.

## Second sample (2026-11-22)

The UA log over the client pods' first ~10 h, to 08:30Z, with kube-probe left out:

| Agent | Requests, hour to 08:30Z | Over ~10 h |
| --- | --- | --- |
| The Chrome/155 X11 string above | 4422 (69%) | 35,223: 32,237 pages, 2,986 assets |
| `meta-externalagent/1.1` (18 strings, Chrome 144–145 shells) | 1545 (24%) | 16,030 |
| `Bytespider` | 102 (1.6%) | 797 |
| Everyone else | 371 | — |

No `/robots.txt` request from these three reached the origin. A Cloudflare cache hit leaves no log line, so this
does not prove they never asked. The Chrome/155 client's most-requested pages were `/procurement/contracts` (7002),
`/cookies` (6959), `/procurement/direct-acquisitions` (6956) and `/procurement/analytics` (5612).

Over the hour to 08:30Z the two dev API pods sent the shared ClickHouse 50,990 queries as user `readonly`
(~850 a minute), with no errors. In the 30 min to 08:31Z, root counted 22,193 queries:

- 12,081 on `proto.facts_da_v2_b16` (2,622 s in total);
- 9,986 on `proto.facts_contracts_v2_b16` (438 s).

## Closed (2026-11-22): Cloudflare Access

- **The decision:** the owner first chose to block the three agents in the app. A `BLOCK_CRAWLER_UA` crawl-guard
  switch was built and reviewed, but never pushed. The owner then put Cloudflare Access in front of both
  `dev-chronos.transparenta.eu` and `dev-chronos-api.transparenta.eu`, and the app block was dropped.
- **The evidence the load stopped:**
  - Both hosts answer 302 to the devostack Access login, checked around 09:00Z.
  - Dev ClickHouse `readonly` queries went from ~3,900 per 5 min to none after about 08:48Z.
  - Over the ten minutes to about 09:05Z, the client pods logged 4 requests besides kube-probe, all from one
    browser that had passed Access.
- **Known breakage, which the owner leaves in place for now (no proxy, credentials change or token):**
  - **Browser API calls on dev:** the dev client calls `dev-chronos-api` from the browser (`VITE_API_USE_PROXY`
    is `"false"`). The CORS preflight (OPTIONS, `Origin: https://dev-chronos.transparenta.eu`) to `/api/v1/graphql`
    gets a 403 with no `Access-Control-Allow-Origin`, checked around 09:15Z. So every read after the first page
    fails for everyone, people who passed Access included: filters, paging, search and the disclosure status poll.
    The server-rendered first page still loads, because SSR reads the API inside the cluster (`INTERNAL_API_URL`).
  - **Client CI:** the integration job (`.github/workflows/ci.yml`) reads the live dev API from GitHub's runners.
    It will get the 302, so its next run on a push to `dev` is expected to fail. No push to `dev` while this
    stands, unless root asks.
  - **Other outside readers:** anything else that reads the dev API from outside the cluster is cut off too, such
    as other sessions' live checks.
- **Left as they are:** `ROBOTS_DISALLOW_ALL` and `REQUEST_UA_LOG`. Removing the UA log line is the owner's call.
