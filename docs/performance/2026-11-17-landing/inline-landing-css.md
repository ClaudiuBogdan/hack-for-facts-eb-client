# The landing inlines its stylesheet

Supervised change to the root head (`src/components/app/app-head-content.tsx`), the audit's PERF-002 step 4
(Parked 9). Chosen by the owner on 2026-11-18 after an investigation of what holds the landing's first paint.

## Why

The landing's largest paint is its heading, "Date publice, decizii informate". It is in the server HTML and
waits for one thing: the 73 KB global stylesheet (541 KB raw). With throttling applied in Chrome (mobile
profile), the stylesheet finishes at about 2.4 s and the heading paints right after, before the entry
script and the font finish. With only the stylesheet already cached, the heading paints at 0.94 s instead
of 2.70 s. The stylesheet's delivery, not its size, is the cost: it starts after the HTML's first bytes
and shares the connection with the 236 KB entry and the Inter font.

## What changed

A document that starts on `/` (any query, `/?lang=en` included) carries the global stylesheet inline, where
the `<link>` was. It is a React style resource (`<style href precedence="default">`, rendered as `<style
data-href data-precedence>`), the same group as TanStack's stylesheet link. React never removes a resource
once it is in the document, so the styles survive the root's error page replacing the shell, as the link
did; an ordinary `<style>` would not (`inline-stylesheet.test.tsx` covers both). Nothing else changes:

- **Every other document** links the cacheable file, as before.
- **Navigation:** the choice is made once per document. A visit that starts on the landing keeps the inline
  sheet through every route; it is the whole stylesheet, so every page is styled. A visit that starts
  elsewhere keeps its link when it reaches the landing.
- **The browser never downloads the string in JavaScript.** The server reads `src/index.css?inline`
  through `createIsomorphicFn`; the browser reads back the `<style>` the server rendered, so hydration
  matches.
- **Tailwind:** the inline text is the whole compiled sheet, not a cut. There is no class list to keep up
  to date.

`src/index.css` also drops the prototyping guide's example class `bg-[url(…)]`, whose placeholder relative
URL would resolve against the page once inlined.

### The build guard

The inline text (`?inline`) and the linked file (`?url`) are two compilations of `src/index.css`.
`yarn build:validate` (`scripts/validate-build-output.mjs`) fails the build when:

- the server bundle holds no inlined Tailwind sheet;
- the inlined sheet differs from every emitted stylesheet;
- it has a relative `url()`;
- any browser JavaScript carries it.

Only `.output/server` counts as the server bundle, and each inlined sheet is looked for in all public
JavaScript. `yarn build:validate:test` runs it on minimal outputs, one per failure. It also failed, as
intended, on a tampered copy of a real output and on a build without the change.

**Limits of the guard.** It reads Rolldown's double-quoted string literal and fails when there is none, so a
change in Rolldown's output stops the build rather than skipping the check. It does not decode other
encodings: a second copy written with single quotes or `/` escapes would not be compared. Two of its
checks can fail a valid build:
- **Leak check:** it matches the sheet's first 200 characters, so an unrelated Tailwind sheet with the same
  header would fail the build.
- **Relative-URL check:** it reads `url(` inside CSS strings too (`content:"url(x)"`).

Both fail loudly, not silently. If one ever trips, compare the sheets by hand before loosening the check.

### CSP nonce

React gives a style resource a nonce only when its renderer gets a style nonce, and TanStack passes the
nonce for scripts only. So when `ssr.nonce` is configured, the landing keeps the link. No nonce is
configured today.

## Measurements

Local production builds of `b396c9907`, through the audit's TLS/HTTP/2 front proxy (streamed HTML, zstd).
Lighthouse 12.8.2 mobile; five rounds, HEAD and the candidates interleaved; medians, ranges in brackets.

| Build | Simulated score | Simulated FCP / LCP | Applied score | Applied FCP = LCP |
|---|---|---|---|---|
| HEAD | 75 (73–76) | 2.75 / 3.28 s | 71 (63–72) | 2.73 s |
| Inline + entry preload removed | 76 (75–77) | 2.73 / 3.29 s | 78 (76–79) | 1.36 s |
| **Inline (shipped)** | 77 (74–78) | 2.67 / 3.27 s | 78 (77–79) | 1.41 s |

After the review fixes, under heavier host load, three more interleaved rounds compared HEAD with the final
build. **Simulated:** score 74 (71–76) on HEAD against 73 (72–77); blocking time swings 470–720 ms run to run
on both. **Applied:** score 71–72 against 79; heading paint 2.63–2.74 s against 1.33–1.49 s.

- **Applied throttling** (`--throttling-method=devtools`, the audit's 562.5 ms latency and 1.47 Mbit/s) is
  what a phone sees: the heading paints about 1.3 s earlier.
- **The simulated profile** (PageSpeed Insights) barely moves. Its model counts the entry and the font in
  LCP whatever the CSS does.
- **Removing the landing's entry preload** as well bought nothing measurable, so it was left out. The entry
  keeps starting early, and so does hydration.

### Costs

- **HTML size:** the landing's HTML grows from about 49 KB to 121 KB transferred.
- **Repeat visits:** a visitor who already has the stylesheet cached downloads it again inside the HTML.
  In the investigation's warm-cache probe the heading painted about 0.35 s later: 0.85–0.88 s on HEAD
  against 1.20–1.23 s. This is why only `/` inlines.
- **Growth:** the cost grows with the global stylesheet.

## Checks

- **Style parity:**
  - Full-page screenshots of `/` with JavaScript off and animations stopped, phone (390 × 9,410) and
    desktop (1,350 × 6,297), are byte-identical to HEAD's.
  - Computed styles of every element on `/` and `/?lang=en` match HEAD apart from the drifting cloud
    layer. On desktop, two containers report a different computed auto margin, but their boxes sit at the
    same position.
- **Browser checks, JavaScript on (17/17):**
  - `/`: inline sheet, no request for the CSS file, no hydration error. Inter loaded. Navigation to
    `/procurement` and back keeps the inline sheet.
  - `/?lang=en` is inlined too.
  - `/national-budget`, `/procurement`, `/entity-analytics` and a 404 link the file with no inline sheet.
    The 404 → `/` keeps the link.
- `yarn run check`, the head tests, and `yarn build:validate` on the final build.
- **Two Astra xhigh reviews.**
  - The first found that the root's error page dropped an ordinary `<style>`, and that the guard had false
    passes. Both were fixed: the sheet is now a style resource, and the guard is narrowed to `.output/server`
    and checks every sheet.
  - The second found nothing serious. Its three P3 points are the nonce rule and the guard's limits above.
- **Astra's investigation** (2026-11-18) also compared 34 page, viewport and theme cases against HEAD, on
  the variant with the entry preload removed; no differences.

## Alternatives rejected

- **A stylesheet per route** (a prototype, archived): first paint 1.96 s applied. It needs a build plugin
  that cuts the global sheet to each route's classes, then fetches the full sheet later (73 KB more).
  - An early navigation could show classes the first cut lacks.
  - The class filter treats `:not()` and `:is()` alternatives as required.
- **Inlining only the first screen's CSS:** misses scrolled, dark-mode, focus and future content.
- **TanStack Start's experimental CSS inliner:**
  - it fetched the 73 KB sheet again when the landing's search loaded;
  - its second Lightning CSS pass dropped eight `-webkit-backdrop-filter` declarations.
- **Lowering the entry's priority or dropping the font preload:** the font then finished 3–4 s later.
- **A tiny bootstrap entry:** faster simulated paint, but 1.1 s of blocking time and later hydration.
- **Shrinking the global sheet:** at most 7–21 KB gzip, and only by changing rendering.

## Reproduce

Build with `tools/build-local.sh` (in `../2026-10-27-main-pages/`), serve with `api-proxy.mjs`,
`start-local.mjs` and `front-proxy.mjs`, and run Lighthouse 12.8.2 against `https://127.0.0.1:3013/` with
`--throttling-method=simulate` and `--throttling-method=devtools`.
