# TEL-001: Keep party codes out of telemetry

**Status:** reopened (2026-11-25): partly fixed, and the rest is approved and not built yet (see *Reopened*). **Priority:** P2, gate: before
the public switch. **Related:** PRJ-HX7G (scrapper docs: personal codes in stored share links). First fixed on 2026-11-20 on `dev`. Found
by the D6 leak reviews (12–14, gpt-6.2-sol xhigh); ruled by root on 19 November 2026. Separate from the direct-acquisitions release so it
can be reviewed and reverted on its own.

## Reopened (25 November 2026)

**What broke.** The contract-award winner list (`/procurement/contract-awards/winners/$cui`, branch
`feat/procurement-ca-awards-20261125`) put a new party path in URLs, and the reviews of that branch tested the scrub hard. Three runs
(gpt-6.2-sol xhigh, local only) found 26 spellings of a party address that kept the code:
- 199be7c4 round 2: an escaped delimiter (`/winners/%23<code>`) ended the code's segment once read;
- confirmation 1 on 199be7c4, 16 inputs: a fourth escape layer, an escaped path word (`supplier%73`), backslashes, doubled slashes,
  `.` and `..` segments, `;` parameters, `[` before `/companies/`, quotes inside the segment;
- confirmation 2 on c2ce1501, 10 inputs (still open):
  - a raw tab, newline or CR inside the address, which browsers strip but the scrub splits words on (`/procurement/suppli<TAB>ers/<code>`);
  - an escaped tab inside a path word (`%2Fprocurement%2Fsuppli%09ers%2F<code>` in a redirect, nested too);
  - an escaped `?` or `#` setting off the hub exception (`/companies/analytics%3F<code>`, `/companies/search%23<code>`, and under
    `/procurement/procedures/companies/`).

A deny-list over raw URLs can only chase encodings (root).

**Interim, shipping with the contract-award push (c2ce1501).** Each word is read through every escape layer (a chain over twelve is
masked whole), with backslashes read as slashes. After its first party marker (`suppliers`, `institutions`, `companies`, `winners` as a
word of their own, or a party filter followed by `=`), every run of letters and digits holding a digit becomes `_`. Numbers after the
marker go too (`?year=2025` → `?year=_`). `/companies/analytics` and `/companies/search` are no marker when only a query or fragment with
no further path follows.

It is no regression: dev at 8f4fc5c1 is weaker on every one of the 26 inputs. It covers every address ordinary navigation produces. The
10 open inputs need a hand-crafted URL with control characters or escaped delimiters.

**The fix (approved by root, 25 November 2026; built by procurement-da-client after the contract-award push, on its own branch off `dev`).**
- One function, `telemetryAddress(url)`, is the only way an address leaves for PostHog or Sentry. It never throws: on any error it returns
  the origin plus `/(error)`.
- A same-origin URL becomes its origin, the router's matched route template (for example `/procurement/suppliers/$cui`; an unmatched path
  is `/(unmatched)`), and an allowlisted query. A foreign URL becomes its origin only. No raw path, fragment or unlisted parameter passes.
- The query allowlist is name plus value shape (for example `year` as four digits). A parameter that doesn't fit is dropped. It starts as
  the smallest list, and names are added when someone asks for one.
- Wiring: PostHog `before_send` and the request guard (`$current_url`, `$pathname`, the referrer, every `$initial_*` and previous-page
  field); Sentry `beforeSend`, `beforeSendTransaction`, `beforeBreadcrumb` and the transport (request URL, navigation from/to, transaction
  names, fetch and xhr breadcrumb URLs).
- The scrubs below stay only as a second layer, for free text (error messages, titles).
- Test: a property test. A party code is placed anywhere in a URL under every encoding class found so far (the 26 inputs, plus generated
  ones), and the output never contains the code's digits.
- Shared files (`src/lib/analytics.ts`, the Sentry setup, `src/lib/privacy`): the file list goes to root and every client session before
  the first commit. At most two Sol rounds.
- It changes what the owner sees in product analytics (route patterns instead of addresses). Root is telling the owner.

Closure: the template function wired into every path above, its property test passing, and deployed to Chronos dev before the public
switch.

## Summary

A direct-purchase supplier the API withholds (D6) may be a person. Its fiscal code reached the two third-party
processors the client uses, PostHog and Sentry, in normal operation:

- **PostHog:** the SDK's `$current_url`, `$pathname`, previous-page and referrer properties on every event,
  `$pageleave` included, held `/procurement/suppliers/<cui>`, `/procurement/institutions/<cui>`, `/companies/<cui>`
  and the analytics page's `furnizor` and `cumparator` filters, in any letter case. The page title it sends named
  the code („X SRL (CUI 14837428)", „Firma cu CUI …").
- **Sentry:**
  - error reports: request URL, breadcrumbs, the global error page's stored query, and the minimal no-consent
    event's message;
  - session replay: the replay event's `urls`, request and `Referer`, rrweb's page URL, and link `href`s in DOM
    snapshots;
  - tracing: TanStack's `cui` span attributes and fetch spans' `http.query`. A `JSON.stringify` on circular SDK
    metadata in the transaction hook threw, and the SDK then sent its own internal error with the raw URL, past
    every hook;
  - the feedback widget's `contexts.feedback.url` and `request.url`, which pass no send hook.

## Fix (root's rulings: the justice pattern, fail closed)

- **One scrub** (`src/lib/privacy/procurement-party-codes.ts`), the last pass of the shared telemetry sanitizer
  (`sanitizeJusticeTelemetryString`):
  - masks with `_` the code after `/suppliers/`, `/institutions/` or `/companies/` under `/procurement`, the company
    page's code (`/companies/<cui>`, but not `/companies/analytics` or `/companies/search`), and any `furnizor` or
    `cumparator` query value, with or without its `?`;
  - case-insensitive, after reading up to three layers of URL encoding, word by word so prose and punctuation stay.
    A word that changes is sent decoded. (Superseded on 25 November 2026 by the interim rule in *Reopened*, and to be replaced by the
    route templates.);
  - text naming a code — „CUI", „CIF", „tax ID" or „VAT ID", then digits with an optional country prefix or quotes —
    becomes `_` (`withoutNamedCodes`) in any telemetry string: page titles, and an element's label or title a click
    breadcrumb copies („Copiază CUI …"). The justice title heuristic stays PostHog's alone;
  - the legacy analytics names of the filters (`supplier_cui`, `authority_cui`) too;
  - a `URL` object is scrubbed as its address. Past the depth the sanitizer reads, a string is still scrubbed and an
    object is replaced by the redaction marker.
- **Sentry, at the transport** (`scrubbingTransport`, `scrubEnvelope`), the one point every envelope passes,
  whatever the SDK added after the event hooks (scope breadcrumbs and contexts, its own internal errors, feedback,
  standalone spans such as INP): each item and its headers are read as the serializer writes them (`toJSON`, URLs),
  and every string value in them is scrubbed. Object keys are not; no SDK producer was found putting an address
  in a key. A
  transaction or span touching a justice, procurement or company page is dropped; an item that cannot be read is
  dropped; of binary items only an image attachment (the reader's screenshot) is kept. The transport is part of the
  client's options, so it is in place from the client's creation.
- **Sentry, earlier too:** the client's `preprocessEvent` scrubs each event in place, `beforeBreadcrumb` scrubs each
  breadcrumb as it is recorded, and `beforeSend`/`beforeSendTransaction` keep their passes. These narrow what the
  SDK holds in memory; the transport is what guarantees what is sent.
- **Tracing:**
  - a transaction or span that touches a procurement or company page (not `/companies/search` or
    `/companies/analytics`) is dropped whole, as a justice one is;
  - a party page is read from the event's own route, not from earlier pages' breadcrumbs. A justice mention
    anywhere, breadcrumbs included, still drops it, as before TEL-001.
- **Session replay: off, site-wide** (root, R1). There is no replay integration, and both sample rates are 0.
  - Why: rrweb records a link's resolved address before Sentry's attribute masker runs. It writes the page URL into
    its own records, which no hook reaches. And a session refresh in flight can restart a replay after a stop. Not
    recording is the only sound option.
  - Bringing it back is a decision of its own (the owner's). It needs a Sentry/rrweb version that lets every
    recorded URL and attribute be scrubbed, with a test against the real recorder.
- **PostHog, at the request layer** (`guardPostHogRequests`), the principle of the Sentry transport. `before_send`
  is not enough on its own:
  - its logs, which the project's remote config can turn on, attach `location.href` to each record;
  - its conversations widget sends `current_url`;
  - neither meets `before_send`.

  Every request PostHog makes with page data (events, retries, `sendBeacon`, logs, widget calls; review 17 found no
  other in 1.408) goes through the instance's `_send_request`. Each request is sent `referrerPolicy: strict-origin`
  over `fetch`, so a same-origin proxy is not handed the page's address as `Referer`. XHR and `sendBeacon` follow the
  document's policy. That method is wrapped before `init`, so init's own requests pass through it too. The URL and
  the body go through the shared sanitizer; a body it cannot read is not sent. `_send_request` is posthog-js's
  internal method (1.408): if it is missing, PostHog is not started at all. Checked in posthog-js 1.408: after
  `before_send` the SDK only sets the event's `uuid`. The flags request is off (`advanced_disable_flags`).
- **Outside the guard, carrying no page data:**
  - remote config and extension script loads: token, version or cache-buster in their URLs;
  - product-tour images: configured URLs.
- **Outside the guard, operator-only (P3):** PostHog's toolbar, loaded only from a PostHog user's authorization,
  can send or save the current URL.
- **PostHog, earlier too:** `before_send` uses the same sanitizer, titles included, and `capturePageview` masks its
  own URL.

**Cost** (root, told to the owner): no session replay anywhere; no performance tracing on procurement and company
pages, the trade the justice pages already make.

**Tests and what they prove:** the transport is tested against the real Sentry client (`BrowserClient`, an
in-memory transport): an internal error and a feedback event, with raw breadcrumbs and contexts merged from the
scope, carry no code; without the scrubbing transport the same test sends it. The hooks, PostHog's `before_send`
and the scrub's rules are tested directly. PostHog's own send order was checked by reading posthog-js 1.408 and by
the reviews' in-memory runs. The PostHog guard is tested against the real posthog-js instance with no `before_send`
(`src/lib/analytics-request-guard.test.ts`): what reaches its request layer carries no code; with a pass-through
guard it does.

## Not a D6 leak (root, 19 November 2026)

- **An institution's code on its budget page.** The institution, contract and purchase pages link to the buyer's
  budget page, `/entities/<cui>`. The next page's address (PostHog's `$pathname`, Sentry's navigation `to`) therefore
  names the institution whose `/procurement/institutions/_` was masked.
  - A buyer is a public authority, never a natural person, and its code is public. `/entities/<cui>` is the budget
    product's own page, and it is not masked.
  - Institution codes are masked on procurement paths only for consistency. The case that matters stays masked: an
    analytics `cumparator` value equal to a withheld supplier's code.

## Residuals (P3, accepted by root)

- **Feedback screenshots:** an optional screenshot the reader chooses to attach can show a code.
- **PostHog's local storage:** the SDK writes the raw current URL into the reader's own browser
  (`$initial_person_info`, session props) before `before_send` runs. It is the reader's own address on their own
  device; what is sent is scrubbed.
- **Over-scrubbing:** a `/companies/<x>` path on another host, or a `furnizor` parameter on another page, is
  masked too.

## Tests

`src/lib/privacy/procurement-party-codes.test.ts`, `src/lib/sentry.test.ts` (party transactions dropped, a cyclic or
frozen event never throws, URL objects, depth, titles, every event type scrubbed in place), `src/lib/sentry-replay.test.ts`
(no replay integration and both rates 0 from any entry page, breadcrumbs scrubbed as recorded, the event hook
installed, the scrubbing transport set), `src/lib/sentry-transport.test.ts` (the real client; envelopes: standalone
spans, `toJSON`, attachments, unreadable items, inherited breadcrumbs), `src/lib/analytics.test.ts` (every PostHog URL
and title property), `src/lib/analytics-request-guard.test.ts` (the real posthog-js; URL and body; unreadable
bodies dropped; no request layer, no PostHog).
