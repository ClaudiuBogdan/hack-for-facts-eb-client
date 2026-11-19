# DEV-CRAWL-001: Crawlers saturate the Chronos dev ClickHouse through the dev client

**Status:** open. The noindex switch and the UA log line are on in `chronos-dev`. The log line is to be removed
once the caller is named.

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
  - GET/HEAD `/robots.txt` is answered before `public/` with `User-agent: *` / `Disallow: /` and no sitemap;
  - every response carries `X-Robots-Tag: noindex, nofollow`.
- `REQUEST_UA_LOG="true"`: one JSON stdout line per response (method, path, status, ms, user agent). No IP, query
  string or cookies.

When both switches are unset (prod and Phoenix dev), the plugin replaces nothing:

- `public/robots.txt` stays the static file, sha256
  `9528fc1d43529f751d66e7bea96c38d8dbd9ea3cecd75bcae8cff98ee528d99a`, which a unit test asserts;
- it keeps the same ETag and conditional 304s, and POST still gets 404;
- no header is added and nothing is logged.

The rendered prod overlay is unchanged.

Robots rules only bind polite crawlers. If the load hasn't dropped within an hour of rollout, after Cloudflare's
4 h cache has expired, the UA log names the caller. The Cloudflare cache is not purged from here; that is an
owner/account action.

## Follow-ups

- [ ] Name the caller from the UA log, then remove `REQUEST_UA_LOG` from the chronos-dev ConfigMap and record the
      removal here.
