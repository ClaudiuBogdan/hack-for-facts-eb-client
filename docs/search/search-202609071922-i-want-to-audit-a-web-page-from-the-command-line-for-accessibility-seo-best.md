# I want to audit a web page from the command line for **accessibility, SEO, best

<!--
@web-flow begin
kind: prompt
id: prompt-20260907192225974
timestamp: "2026-09-07T19:22:25.974Z"
schema: web-flow/research/v1
version: 1
-->
I want to audit a web page from the command line for **accessibility, SEO, best practices and performance**, and I need current (2025-2026) advice on which tools to actually use. Please be concrete, give runnable commands, and cite sources.

## My stack and constraints

- React 19, **TanStack Start** (server-side rendered with streaming SSR), Vite, Tailwind v4, shadcn/ui.
- The page I want to audit is a local prototype served by `vite dev` at `http://localhost:3311/development/landing/home-refs?v=landing`. It is a long landing page: a hero with a search combobox, a grouped index of links, three large decorative illustrations, animated SVG background lattices, scroll-triggered entrance animations, and a footer with an animated canvas-free "scene" made of CSS-animated background images.
- Romanian-language content (`lang` matters), light and dark themes.
- I have Node and can install dev dependencies or use `npx`. Playwright and its Chromium are already installed.
- macOS.

## Questions

1. **Is the Lighthouse CLI still the right default in 2026?** Is `npm i -g lighthouse` / `npx lighthouse` still maintained and current? What version, and what changed recently — I understand Lighthouse dropped or changed some categories and that PageSpeed Insights and Lighthouse have diverged. Is the "SEO" category still there? Is "Best Practices" still there? Has the performance scoring changed (INP replacing FID, etc.)?

2. **What are the current best CLI alternatives or complements**, and when would I pick each:
   - `@axe-core/cli` (Deque) for accessibility
   - `pa11y` / `pa11y-ci`
   - `unlighthouse` for auditing many routes at once
   - `lighthouse-ci` (`@lhci/cli`) for thresholds/CI
   - Playwright's `@axe-core/playwright` integration, since I already have Playwright
   - anything newer that has displaced these

3. **Accessibility specifically.** Automated tools catch a limited fraction of real issues — what is the current honest figure, and what do the different engines actually cover? Is axe-core still the de-facto engine (and is it what Lighthouse uses internally)? What are the meaningful differences between axe, IBM Equal Access, and Pa11y's HTML_CodeSniffer? Which WCAG version and level should I target in 2026, and is WCAG 2.2 the right baseline?

4. **Auditing a Vite dev server is misleading** — unminified modules, no compression, HMR client, source maps. How should I audit honestly? Should I `vite build` and serve the production output? For TanStack Start specifically, what is the correct way to build and serve a production bundle locally for auditing? Note my `/development/*` routes 404 in a production build by design, so I may not be able to audit this exact page in production mode — how should I handle that, and what parts of a dev-mode audit are still trustworthy (accessibility and SEO markup) versus untrustworthy (performance timings, byte sizes)?

5. **SEO auditing from the CLI.** What does Lighthouse's SEO category actually check, and what does it miss? Are there better dedicated CLI tools for structured data / meta tags / canonical / hreflang / sitemap validation? Anything for validating JSON-LD from the command line?

6. **Practical setup.** Give me a concrete, minimal set of commands to audit one URL for a11y + SEO + best practices, with JSON output I can diff over time, and say how to interpret the output. Include how to point the tool at an already-running server, how to run it headless, and any flags that matter (throttling, form factor, `--only-categories`, screen emulation).

7. **Gotchas** with auditing an SSR React app: hydration timing, animations that never settle (I have CSS animations that run forever — will Lighthouse hang or mis-measure?), `prefers-reduced-motion`, and lazy-loaded images below the fold.

Please flag anything where the widely-repeated advice is now outdated.
<!-- @web-flow end id=prompt-20260907192225974 -->

<!--
@web-flow begin
kind: response
status: completed
provider: chatgpt
url: "https://chatgpt.com/c/6a9f0ef7-7c08-83ed-ba40-1bf9d57b823f"
id: response-20260907192339427-chatgpt
prompt_id: prompt-20260907192225974
timestamp: "2026-09-07T19:36:39.641Z"
schema: web-flow/research/v1
version: 1
-->
Yes. In September 2026, **Lighthouse CLI is still the correct general-purpose baseline**, but I would not use it alone. For your stack, I would use:

**Lighthouse 13.4.1 + `@axe-core/playwright` as the core pair**, run structural audits against your dev prototype and performance audits only against a production-like TanStack Start build. Add Unlighthouse when you want route breadth, IBM Equal Access when you want an independent accessibility engine, and a real SEO crawler such as Screaming Frog or SiteOne when SEO becomes site-wide rather than page-local.

## 1. Lighthouse CLI in 2026

Lighthouse is actively maintained. The current release is **13.4.1**, released July 20, 2026. The npm package is also 13.4.1 and now requires **Node >=22.19**. `npm i -g lighthouse` remains supported, but for reproducible audits I would pin it instead:

```bash
npm i -D lighthouse@13.4.1

# or without installing
npx --yes lighthouse@13.4.1 --version
```

([GitHub][1])

The traditional categories are still present:

* Performance
* Accessibility
* Best Practices
* SEO

There is also a newer experimental-ish `agentic-browsing` category in the current default configuration, but it doesn't replace any of the four above. ([GitHub][2])

### Lighthouse 13 changed audits more than scoring

A common outdated statement is that Lighthouse 13 substantially changed the Performance score. It did **not**. Google explicitly says there were no performance-scoring changes in Lighthouse 13. The major change was retiring many old individual performance audits and replacing them with the newer shared **Performance Insights** infrastructure used by Chrome's Performance panel. ([Chrome for Developers][3])

For example, old audits such as:

```text
layout-shifts
server-response-time
uses-text-compression
dom-size
modern-image-formats
uses-responsive-images
largest-contentful-paint-element
```

have been replaced/consolidated into things such as:

```text
cls-culprits-insight
document-latency-insight
dom-size-insight
image-delivery-insight
lcp-phases-insight
lcp-discovery-insight
```

Lighthouse 13 also removed `offscreen-images`, `font-size`, `no-document-write`, `preload-fonts`, `uses-rel-preload`, and several other old audits. ([Chrome for Developers][3])

### INP did not replace TBT in the Lighthouse score

Another frequently repeated but misleading statement is:

> "Lighthouse switched from FID to INP."

INP **did replace FID as the field Core Web Vital** in March 2024. ([web.dev][4])

But the normal Lighthouse navigation Performance score is still based on:

| Metric      | Weight |
| ----------- | -----: |
| FCP         |    10% |
| Speed Index |    10% |
| LCP         |    25% |
| TBT         |    30% |
| CLS         |    25% |

([Chrome for Developers][5])

TBT remains the lab load-time responsiveness proxy. INP requires actual interactions; Chrome's current INP insight only has data if an interaction happened while the trace was recording. ([Chrome for Developers][6])

So for your hero combobox, a normal Lighthouse navigation run is **not an adequate INP test**.

### Lighthouse vs PageSpeed Insights

They should not be treated as identical products. PSI uses Lighthouse for lab analysis but additionally incorporates **CrUX field data**, and its Lighthouse version/runtime/throttling can lag or differ from the CLI. Google explicitly versions Lighthouse independently inside PSI; for example, PSI moved to Lighthouse 13.0 on October 20, 2025, and has previously changed its own CPU throttling parameters. ([Google for Developers][7])

For a localhost prototype, PSI is irrelevant anyway—the Lighthouse CLI is the right tool.

---

# 2. Which tools I would actually use

| Tool                       | Current state      | Use it for                            | My choice for you                          |
| -------------------------- | ------------------ | ------------------------------------- | ------------------------------------------ |
| **Lighthouse CLI**         | 13.4.1             | Performance + baseline SEO/a11y/BP    | **Yes, primary baseline**                  |
| **`@axe-core/playwright`** | 4.13.0             | Stateful accessibility testing        | **Yes, primary a11y tool**                 |
| `@axe-core/cli`            | 4.13.0             | Quick one-off a11y scan               | Useful, but redundant with your Playwright |
| Pa11y                      | 10.0.0             | Convenient CLI; HTMLCS or axe engines | Optional second opinion                    |
| pa11y-ci                   | 4.1.1              | Many URLs/sitemaps in CI              | Optional                                   |
| Unlighthouse               | 0.18.0             | Lighthouse across many routes         | **Use once site grows**                    |
| Lighthouse CI              | 0.15.1             | Budgets/assertions/regression CI      | Useful, but important version caveat       |
| IBM Equal Access           | 4.0.30             | Independent accessibility engine      | Good second-engine check                   |
| Screaming Frog CLI         | current/maintained | Serious site-wide SEO                 | Excellent once public                      |
| SiteOne Crawler            | active in 2026     | OSS SEO/security/general crawler      | Interesting OSS complement                 |

The important Lighthouse CI caveat: current `@lhci/cli` is **0.15.1**, but its codebase is still on **Lighthouse 12.6.1**, and an open April 2026 issue asks for Lighthouse 13 support. So installing LHCI does **not** currently give you the same auditing engine as `lighthouse@13.4.1`. ([npm][8])

LHCI remains useful because it provides server startup, multiple runs, assertions, budgets and aggregation—three runs are the default—but if I wanted Lighthouse 13 today I would run `lighthouse@13.4.1` directly and put a small Node/jq assertion layer around its JSON. ([GitHub][9])

Unlighthouse is current: **0.18.0**, and is designed specifically for crawling many URLs with Lighthouse:

```bash
npx unlighthouse --site https://example.com

# CI quality budget
npx unlighthouse-ci --site https://example.com --budget 90
```

([npm][10])

For one URL, however, it adds no real value over Lighthouse itself.

---

# 3. Accessibility: axe, Pa11y, IBM and WCAG 2.2

## Target WCAG 2.2 AA

For a new site in 2026, I would explicitly set your target to:

**WCAG 2.2 Level AA.**

WCAG 2.2 is the current W3C Recommendation and adds criteria including Focus Not Obscured, Dragging Movements, Target Size, Consistent Help, Redundant Entry and Accessible Authentication. WCAG 2.2 retains the 2.0/2.1 requirements except that 4.1.1 Parsing became obsolete and was removed. ([W3C][11])

## "Automated testing finds only 20–30%" is outdated as a universal figure

There is no meaningful universal percentage that W3C endorses. W3C's position remains that **no automated tool can determine accessibility conformance** and knowledgeable human evaluation is required. ([W3C][12])

Deque does make a more specific empirical claim: its current axe-core documentation says axe finds **about 57% of WCAG issues on average**, based on Deque's testing methodology. It also deliberately returns `incomplete` findings where human judgment is needed. ([GitHub][13])

So I would phrase the result as:

> axe claims ~57% average automated detection in its dataset; this is not "57% WCAG compliance" and should not be generalized to every application.

For your site in particular, automated scanners will miss some of the most important issues:

* whether the search combobox's keyboard UX actually makes sense;
* whether screen-reader announcements are understandable;
* whether focus moves/restores appropriately;
* whether the two-stage Escape behavior is usable;
* whether content order remains sensible during responsive changes;
* whether entrance animations are disorienting;
* whether link names make sense in context;
* whether the design works at zoom/reflow;
* whether Romanian screen-reader pronunciation is correct.

### axe-core

axe-core 4.13.0 supports rules tagged for WCAG 2.0, 2.1 and 2.2 A/AA/AAA plus best practices. It is overwhelmingly the ecosystem default in JS testing. ([npm][14])

Lighthouse's Accessibility category is axe-based: current Lighthouse directly depends on `axe-core ^4.12.1`, and the current category configuration uses axe impact/tags to derive its weights. ([GitHub][15])

That means:

**Lighthouse a11y + standalone axe are not two independent opinions.**

Standalone axe is still worthwhile because it gives you much better control over states, rules and reporting.

One subtle WCAG 2.2 issue: axe's current rule documentation says its WCAG 2.2 A/AA rules are disabled by default, currently notably `target-size`, while Deque is actively working toward enabling it by default. ([GitHub][16])

Lighthouse itself currently includes `target-size` as a weighted WCAG 2.2 AA audit, so Lighthouse's configuration is not identical to a naked `axe.run()`. ([GitHub][2])

### IBM Equal Access

IBM Equal Access is genuinely useful if you want a **different accessibility engine**, not another wrapper around axe. It supports Node/browser integrations including Playwright, Puppeteer and Selenium and has an explicit WCAG 2.2 ruleset. It remains actively maintained; the latest release I found is **4.0.30 from August 4, 2026**. ([GitHub][17])

I would run IBM occasionally as a second opinion, not on every local edit.

### Pa11y

Pa11y is better understood as a test runner/orchestrator, not one specific accessibility engine. Pa11y 10.0.0 is current and requires Node >=22.13. Its default runner is **HTML_CodeSniffer**, but it can also invoke axe:

```bash
npx pa11y 'http://localhost:3311/development/landing/home-refs?v=landing'

npx pa11y \
  --runner htmlcs \
  --runner axe \
  --reporter json \
  'http://localhost:3311/development/landing/home-refs?v=landing'
```

([npm][18])

Using Pa11y's axe runner gives you largely the same rule engine again. Its HTML_CodeSniffer runner is useful precisely because it produces a different set of judgments, although I would **not make HTMLCS your authoritative WCAG 2.2 engine**; Pa11y's own standard options are still expressed as `WCAG2A`, `WCAG2AA`, `WCAG2AAA`, and its documented HTMLCS rule extension mechanism refers to WCAG 2.1 guidelines. ([GitHub][19])

---

# 4. Do not performance-audit `vite dev`

Your concern is correct.

Vite explicitly separates the development server from the production build; `vite build` generates the optimized production bundle. `vite preview` can preview static Vite output locally but Vite itself warns that `vite preview` is **not a production server**. ([vitejs][20])

For current TanStack Start + Vite + Nitro, the documented Node deployment shape is:

```json
{
  "scripts": {
    "build": "vite build",
    "start": "node .output/server/index.mjs"
  }
}
```

So locally:

```bash
npm run build
PORT=3311 npm run start
```

Nitro reads `PORT` at runtime. ([TanStack][21])

For TanStack Start SSR, **this is preferable to `vite preview`** because you want to benchmark the actual generated SSR server/client output, not merely Vite's static preview server.

### Your `/development/*` problem

Since `/development/*` deliberately does not exist in production builds, you have three choices.

The best one is to create an **audit build**, using your own build-time flag:

```bash
AUDIT_DEV_ROUTES=1 npm run build
AUDIT_DEV_ROUTES=1 PORT=3311 npm run start
```

`AUDIT_DEV_ROUTES` is not a TanStack feature—I mean a flag you add to your own route-generation/exclusion logic. It should produce the normal optimized production application while retaining that prototype route. Never deploy that artifact.

Alternatively, temporarily expose the same landing component at an audit-only route included in the local production build.

If neither is acceptable, do **not** treat a Vite-dev Lighthouse Performance score as meaningful.

### What remains trustworthy in dev

| Audit area                   | `vite dev` usefulness                      |
| ---------------------------- | ------------------------------------------ |
| DOM/ARIA accessibility       | **High**                                   |
| Keyboard behavior            | **High**                                   |
| Contrast                     | **High**, provided CSS/theme is identical  |
| `<html lang="ro">`           | **High**                                   |
| title/meta markup            | **High**                                   |
| headings/anchors/alts        | **High**                                   |
| canonical/hreflang values    | Useful structurally, environment-sensitive |
| status codes/robots          | Environment-sensitive                      |
| Best Practices               | Mixed                                      |
| console/runtime errors       | Useful                                     |
| HTTPS/CSP/security headers   | Usually meaningless locally                |
| JS transfer size             | **Not trustworthy**                        |
| unused/minified JS/CSS       | **Not trustworthy**                        |
| compression/caching          | **Not trustworthy**                        |
| LCP/TBT/SI score             | **Not trustworthy**                        |
| production network waterfall | **Not trustworthy**                        |

So I would happily run **Accessibility + SEO + Best Practices against your dev prototype**, with caveats, but explicitly omit Performance.

---

# 5. What Lighthouse SEO actually checks

The current Lighthouse 13 configuration makes this unusually easy to answer precisely. Its scored SEO audits are:

```text
is-crawlable
document-title
meta-description
http-status-code
link-text
crawlable-anchors
robots-txt
image-alt
hreflang
canonical
```

Structured data remains a **manual, zero-weight audit**. ([GitHub][2])

Another outdated Lighthouse fact: SEO audits are **not all equally weighted anymore**. Current Lighthouse deliberately gives `is-crawlable` enough weight that failing crawlability causes the category to fail. ([GitHub][2])

Best Practices isn't uniformly weighted either: for example HTTPS, deprecations and third-party cookies currently have larger weights than some other checks. ([GitHub][2])

### Lighthouse SEO misses a lot

A 100 Lighthouse SEO score absolutely does not mean "SEO is done." It does not meaningfully assess:

* title/description quality;
* search intent;
* content quality;
* duplicate pages across the site;
* internal-link architecture;
* orphan URLs;
* canonical consistency across thousands of URLs;
* hreflang reciprocity and large locale matrices;
* sitemap completeness;
* index coverage;
* Search Console status;
* robots behavior across environments;
* Open Graph/Twitter metadata;
* structured-data eligibility;
* Schema.org semantic correctness;
* Google-specific rich-result requirements.

For those, a crawler is more appropriate.

### JSON-LD validation

Google's current recommendation remains:

**Rich Results Test** for Google's rich-result requirements and **Schema Markup Validator** for generic Schema.org validation. ([Google for Developers][22])

The Schema.org validator understands JSON-LD, RDFa and Microdata, can fetch a URL, and can process JavaScript-injected structured data. ([Schema.org][23])

There still isn't a nice official Google Rich Results Test CLI/API intended for local automation. Google itself describes the browser-based validator workflow. ([Google for Developers][24])

For local CI I would therefore at minimum syntax-check all JSON-LD yourself:

```bash
node - <<'EOF'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(
    'http://localhost:3311/development/landing/home-refs?v=landing'
  );

  const blocks = await page.locator(
    'script[type="application/ld+json"]'
  ).allTextContents();

  for (const [i, text] of blocks.entries()) {
    try {
      JSON.parse(text);
      console.log(`JSON-LD ${i + 1}: OK`);
    } catch (error) {
      console.error(`JSON-LD ${i + 1}: INVALID`);
      console.error(error);
      process.exitCode = 1;
    }
  }

  await browser.close();
})();
EOF
```

That validates JSON syntax, **not Schema.org semantics**.

For serious site-wide SEO, Screaming Frog's headless CLI can crawl canonicals/hreflang and validate JSON-LD/Microdata/RDFa against both Schema.org and Google rich-result requirements. ([Screaming Frog][25])

If you want open source, SiteOne Crawler is an interesting current alternative with JSON reports and SEO/security/a11y/general checks:

```bash
siteone-crawler \
  --url=https://example.com \
  --output=json \
  --output-json-file=audit/siteone.json
```

It is a complement to Lighthouse/axe rather than a replacement for them. ([GitHub][26])

---

# 6. Concrete minimal setup for your page

I would put these commands in your project.

First establish the URL and output directory:

```bash
URL='http://localhost:3311/development/landing/home-refs?v=landing'

mkdir -p artifacts/audit

node --version
npx --yes lighthouse@13.4.1 --version
```

Quote the URL because `?` and `&` can otherwise interact badly with shells.

## Structural Lighthouse audit against your running Vite dev server

You do **not** need Lighthouse to start the server. If Vite is already running, simply point Lighthouse at it:

```bash
npx --yes lighthouse@13.4.1 "$URL" \
  --only-categories=accessibility,seo,best-practices \
  --output=json \
  --output-path=artifacts/audit/lighthouse-mobile.json \
  --chrome-flags="--headless" \
  --quiet
```

The Lighthouse CLI remains the supported flexible CLI interface, and the current CLI still exposes presets/configuration for these use cases. ([GitHub][27])

Run desktop separately:

```bash
npx --yes lighthouse@13.4.1 "$URL" \
  --preset=desktop \
  --only-categories=accessibility,seo,best-practices \
  --output=json \
  --output-path=artifacts/audit/lighthouse-desktop.json \
  --chrome-flags="--headless" \
  --quiet
```

Do both because your long landing page may have different responsive DOM/layout states.

### Throttling flags

For Performance, Lighthouse's normal default is simulated mobile throttling. I would generally leave that alone for comparable synthetic runs.

The choices are conceptually:

```text
simulate   Lighthouse's normalized simulated throttling
devtools   actually throttle Chrome during collection
provided   don't apply Lighthouse throttling
```

For the baseline regression benchmark, use the default `simulate`. Don't use `provided` and then compare runs performed on different Macs or under different load.

For desktop, prefer:

```bash
--preset=desktop
```

rather than old advice involving `--emulated-form-factor=desktop`.

If you truly need a specific custom viewport, Lighthouse exposes lower-level form-factor/screen-emulation settings, but for this page I'd use Playwright for viewport-specific functional/a11y testing and let Lighthouse use its standardized profiles.

## Quick axe CLI scan

For a one-off:

```bash
npx --yes @axe-core/cli@4.13.0 "$URL" \
  --stdout \
  > artifacts/audit/axe.json
```

For a hydration delay if necessary:

```bash
npx --yes @axe-core/cli@4.13.0 "$URL" \
  --load-delay=1500 \
  --stdout \
  > artifacts/audit/axe.json
```

`--stdout`, `--save`, `--rules`, `--tags`, `--exit` and `--load-delay` are all supported by the current CLI. ([GitHub][28])

But because you already have Playwright, I would install:

```bash
npm i -D @axe-core/playwright@4.13.0
```

and make Playwright your real accessibility harness. ([npm][29])

A useful test for your page looks like:

```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const url =
  'http://localhost:3311/development/landing/home-refs?v=landing'

for (const colorScheme of ['light', 'dark'] as const) {
  test(`a11y: ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({
      colorScheme,
      reducedMotion: 'reduce',
    })

    await page.goto(url)

    // Use a real readiness condition, not networkidle.
    await expect(page.getByRole('combobox')).toBeVisible()
    await expect(page.getByRole('combobox')).toBeEnabled()

    const result = await new AxeBuilder({ page }).analyze()

    expect(result.violations).toEqual([])
  })
}
```

Playwright specifically recommends scanning the page in the **state you want to test**, interacting first to reveal menus/dialogs/etc. ([Playwright][30])

For example, also scan your combobox expanded:

```ts
await page.getByRole('combobox').click()

const expanded = await new AxeBuilder({ page }).analyze()

expect(expanded.violations).toEqual([])
```

And separately force the currently-default-disabled WCAG 2.2 target-size rule:

```ts
const targetSize = await new AxeBuilder({ page })
  .withRules(['target-size'])
  .analyze()

expect(targetSize.violations).toEqual([])
```

## Inspect failed Lighthouse audits

Useful `jq` command:

```bash
jq -r '
  .audits
  | to_entries[]
  | select(.value.score != null and .value.score < 1)
  | [
      .key,
      (.value.score | tostring),
      .value.title,
      (.value.displayValue // "")
    ]
  | @tsv
' artifacts/audit/lighthouse-mobile.json
```

Category scores:

```bash
jq '
  .categories
  | with_entries({
      key: .key,
      value: ((.value.score // 0) * 100)
    })
' artifacts/audit/lighthouse-mobile.json
```

Do not treat these as failures:

```text
scoreDisplayMode = manual
scoreDisplayMode = informative
scoreDisplayMode = notApplicable
```

### Normalize JSON before diffing

Raw Lighthouse JSON contains volatile run/environment data. I would commit a normalized representation instead:

```bash
jq '
  . as $lhr
  | {
      lighthouseVersion: $lhr.lighthouseVersion,
      finalUrl: $lhr.finalUrl,

      categories: (
        $lhr.categories
        | with_entries(
            .value = {
              score: .value.score
            }
          )
      ),

      audits: (
        [
          $lhr.categories[].auditRefs[]
          | {
              id,
              weight,
              score: $lhr.audits[.id].score,
              numericValue: $lhr.audits[.id].numericValue,
              displayValue: $lhr.audits[.id].displayValue
            }
        ]
        | unique_by(.id)
      )
    }
' artifacts/audit/lighthouse-mobile.json \
  > artifacts/audit/lighthouse-mobile.normalized.json
```

Then:

```bash
git diff -- artifacts/audit/lighthouse-mobile.normalized.json
```

---

# 7. Performance command for the real build

Once you have an audit build that retains your prototype:

```bash
AUDIT_DEV_ROUTES=1 npm run build
AUDIT_DEV_ROUTES=1 PORT=3311 npm run start
```

Then run Lighthouse multiple times:

```bash
URL='http://localhost:3311/development/landing/home-refs?v=landing'

for i in 1 2 3 4 5; do
  npx --yes lighthouse@13.4.1 "$URL" \
    --only-categories=performance \
    --output=json \
    --output-path="artifacts/audit/perf-mobile-$i.json" \
    --chrome-flags="--headless" \
    --quiet
done
```

I would use **5 runs and compare the median**, particularly on your M1 Pro while other development processes may be running. Don't obsess over a 1–3 point change from one run.

Then do desktop if it matters:

```bash
npx --yes lighthouse@13.4.1 "$URL" \
  --preset=desktop \
  --only-categories=performance \
  --output=json \
  --output-path=artifacts/audit/perf-desktop.json \
  --chrome-flags="--headless" \
  --quiet
```

---

# 8. SSR/hydration/animation gotchas specific to your page

### Streaming SSR and hydration

For Lighthouse Performance, don't artificially wait for hydration. Hydration cost is part of what you are trying to measure.

For accessibility tests, however, you usually want the **final interactive state**. Do not use:

```ts
await page.waitForLoadState('networkidle')
```

as a generic hydration detector. Playwright explicitly discourages `networkidle` for determining test readiness; use assertions on application state instead. ([Playwright][31])

For your page, something like:

```ts
await expect(page.getByRole('combobox')).toBeEnabled()
```

is much better.

If you control the app, an explicit test-only readiness marker is even more deterministic:

```html
<html data-hydrated="true">
```

followed by:

```ts
await page.locator('html[data-hydrated="true"]').waitFor()
```

### Infinite CSS animations

A pure CSS animation running forever does **not normally make Lighthouse hang**. Lighthouse doesn't wait for all CSS animations to finish.

It can still hurt the result if the animation continuously causes:

* layout;
* expensive paint;
* filters;
* rasterization;
* large compositing updates.

The current Lighthouse configuration still has `non-composited-animations` as a diagnostic. ([GitHub][2])

Your CSS-background footer scene therefore isn't automatically a problem merely because it is infinite. The important question is whether it's compositor-friendly.

A heavy JS `requestAnimationFrame` loop is more problematic because it can continuously consume the main thread.

### `prefers-reduced-motion`

Test it explicitly. Playwright has first-class:

```ts
reducedMotion: 'reduce'
```

and:

```ts
reducedMotion: 'no-preference'
```

support. ([Playwright][32])

Given your SVG lattices, entrance transforms and animated footer, I would have two accessibility projects:

```text
normal motion
reduced motion
```

Don't globally disable animations only when Lighthouse is detected—that merely games your benchmark.

`prefers-reduced-motion` exists specifically so non-essential motion can be reduced/replaced for users who request it. ([MDN Web Docs][33])

### Light and dark

Run axe against **both themes**. Contrast depends on actual computed colors in the current page state, so one axe run against light mode tells you nothing about dark mode.

Playwright directly supports `colorScheme: 'light' | 'dark'`. ([Playwright][32])

### Scroll-triggered content

A normal axe scan sees the current DOM, regardless of viewport, unless your implementation truly removes/hides content from the accessibility tree.

But because your page changes states on intersection, I would run:

```ts
// initial state
await new AxeBuilder({ page }).analyze()

// bottom-of-page state
await page.locator('footer').scrollIntoViewIfNeeded()

await new AxeBuilder({ page }).analyze()
```

That is particularly useful if the intersection observer changes `aria-*`, `hidden`, `visibility`, focusability or DOM structure.

### Lazy-loaded decorative images

The old Lighthouse advice to look for the `offscreen-images` audit is outdated: **Lighthouse 13 removed it**. ([Chrome for Developers][34])

That doesn't mean lazy loading no longer matters. It means Lighthouse concluded that browser prioritization and the newer performance analysis made that particular audit insufficiently useful.

For your three below-the-fold ~150 KB illustrations, test lazy-loading behavior separately with Playwright/network instrumentation if necessary. A standard navigation Lighthouse run does not scroll through the entire user journey and therefore isn't a substitute for checking what happens when those images enter the viewport.

---

# The setup I would use in this project

If I were adding this to your repository, the dependency footprint would initially be only:

```bash
npm i -D \
  lighthouse@13.4.1 \
  @axe-core/playwright@4.13.0
```

Then I would have these checks:

```text
audit:structure
  Lighthouse accessibility + SEO + Best Practices
  dev server is acceptable
  mobile + desktop

test:a11y
  Playwright + axe
  light + dark
  reduced-motion + normal
  collapsed + expanded combobox
  top + scrolled states

audit:performance
  production/audit TanStack Start build only
  Lighthouse 13
  5 runs
  mobile + optional desktop

audit:seo-site
  later, against staging/production
  Screaming Frog or SiteOne
  sitemap/canonical/hreflang/JSON-LD/indexability
```

I would **not** add Pa11y, pa11y-ci, Unlighthouse and Lighthouse CI immediately just because they exist. With Playwright already in your stack, that would mostly duplicate functionality. Add **IBM Equal Access** when you deliberately want independent-engine a11y coverage, and **Unlighthouse/Screaming Frog** when you move from auditing one landing page to auditing the whole `transparenta.eu` route graph. ([Playwright][30])

The most important outdated advice to discard is: **don't benchmark `vite dev`; don't assume Lighthouse SEO is a comprehensive SEO audit; don't equate INP replacing FID with INP replacing TBT in Lighthouse; don't expect the old `offscreen-images` audit; don't assume LHCI uses current Lighthouse; and don't interpret any automated accessibility score as WCAG conformance.**

[1]: https://github.com/GoogleChrome/lighthouse/releases "https://github.com/GoogleChrome/lighthouse/releases"
[2]: https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js "https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js"
[3]: https://developer.chrome.com/blog/lighthouse-13-0 "https://developer.chrome.com/blog/lighthouse-13-0"
[4]: https://web.dev/blog/inp-cwv-march-12 "https://web.dev/blog/inp-cwv-march-12"
[5]: https://developer.chrome.com/docs/lighthouse/performance/performance-scoring?authuser=5&hl=en "https://developer.chrome.com/docs/lighthouse/performance/performance-scoring?authuser=5&hl=en"
[6]: https://developer.chrome.com/docs/performance/insights/inp-breakdown "https://developer.chrome.com/docs/performance/insights/inp-breakdown"
[7]: https://developers.google.com/speed/docs/insights/release_notes "https://developers.google.com/speed/docs/insights/release_notes"
[8]: https://www.npmjs.com/package/%40lhci/cli?activeTab=dependents "https://www.npmjs.com/package/%40lhci/cli?activeTab=dependents"
[9]: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md "https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md"
[10]: https://www.npmjs.com/package/unlighthouse "https://www.npmjs.com/package/unlighthouse"
[11]: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ "https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/"
[12]: https://www.w3.org/WAI/test-evaluate/ "https://www.w3.org/WAI/test-evaluate/"
[13]: https://github.com/dequelabs/axe-core "https://github.com/dequelabs/axe-core"
[14]: https://www.npmjs.com/package/axe-core?activeTab=versions "https://www.npmjs.com/package/axe-core?activeTab=versions"
[15]: https://github.com/GoogleChrome/lighthouse/blob/main/package.json "https://github.com/GoogleChrome/lighthouse/blob/main/package.json"
[16]: https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md?plain=1 "https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md?plain=1"
[17]: https://github.com/ibma/equal-access "https://github.com/ibma/equal-access"
[18]: https://www.npmjs.com/package/pa11y?activeTab=versions "https://www.npmjs.com/package/pa11y?activeTab=versions"
[19]: https://github.com/pa11y/pa11y "https://github.com/pa11y/pa11y"
[20]: https://vite.dev/guide/build "https://vite.dev/guide/build"
[21]: https://tanstack.com/start/latest/docs/framework/react/guide/hosting "https://tanstack.com/start/latest/docs/framework/react/guide/hosting"
[22]: https://developers.google.com/search/docs/appearance/structured-data "https://developers.google.com/search/docs/appearance/structured-data"
[23]: https://schema.org/docs/validator.html "https://schema.org/docs/validator.html"
[24]: https://developers.google.com/search/docs/appearance/structured-data/generate-structured-data-with-javascript?hl=en "https://developers.google.com/search/docs/appearance/structured-data/generate-structured-data-with-javascript?hl=en"
[25]: https://www.screamingfrog.co.uk/seo-spider/user-guide/general/ "https://www.screamingfrog.co.uk/seo-spider/user-guide/general/"
[26]: https://github.com/janreges/siteone-crawler "https://github.com/janreges/siteone-crawler"
[27]: https://github.com/GoogleChrome/lighthouse "https://github.com/GoogleChrome/lighthouse"
[28]: https://github.com/dequelabs/axe-core-npm/blob/develop/packages/cli/README.md?plain=1 "https://github.com/dequelabs/axe-core-npm/blob/develop/packages/cli/README.md?plain=1"
[29]: https://www.npmjs.com/package/%40axe-core/playwright?activeTab=versions "https://www.npmjs.com/package/%40axe-core/playwright?activeTab=versions"
[30]: https://playwright.dev/docs/accessibility-testing "https://playwright.dev/docs/accessibility-testing"
[31]: https://playwright.dev/docs/api/class-frame "https://playwright.dev/docs/api/class-frame"
[32]: https://playwright.dev/docs/api/class-testoptions "https://playwright.dev/docs/api/class-testoptions"
[33]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion"
[34]: https://developer.chrome.com/docs/lighthouse/performance/offscreen-images/ "https://developer.chrome.com/docs/lighthouse/performance/offscreen-images/"

<!-- @web-flow end id=response-20260907192339427-chatgpt -->
