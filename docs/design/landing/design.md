# Landing, footer and cookie consent — promotion record

**Status:** promoting, 16 September 2026. Source prototypes:
`/development/landing/home-refs?v=landing` (the page and its footer) and
`/development/privacy/cookies?v=modal` / `?v=page` (consent card and settings
page). Both were settled in the prototype's own notes; the comparisons that
settled them are in [`landing-search-comparison.md`](../landing-search-comparison.md),
[`landing-reveal.md`](../landing-reveal.md) and the module comments carried
over with the code.

## Where the code went

| Prototype | Promoted to |
|---|---|
| `home-refs.refined.tsx` and the bands | `src/features/landing/components/` |
| `home-refs.search*.ts*` | `src/features/landing/components/search/`, `hooks/`, `lib/` |
| `home.data.ts`, `home-refs.national-facts.ts`, `about.people.ts` | `src/features/landing/lib/` |
| `home-refs.mono-label.tsx`, the ruled `Frame`, `home-refs.reveal.tsx` | `src/components/landing-skin/` (shared by landing, footer, cookies) |
| `home-refs.footer-scene.tsx` + the prototype footer | `src/components/footer/` (`AppFooter`, app-wide) |
| `privacy/cookies.*` | `src/features/privacy/` |
| `src/routes/index.tsx` | rewritten as a thin route over `LandingPage` |

Round one (`landing/home`, the information-architecture comparison) is deleted
with this promotion; its winner is what round two onward was built on.

## Decisions taken at promotion

These are the places where the prototype could not decide for production and a
default had to be picked. Each can be revisited; none should be reopened
without reading the reason.

1. **Footer content.** The prototype footer is a skin proposal with two short
   columns. Production keeps what the shipped footer carried that tests, copy
   or provenance depend on, in a third column, `Proiect`: the GitHub
   repository and issues links and the status page; the cookie settings link
   under `Legal` (the cookies page copy promises it is "one click away in the
   footer"); a data-source line naming ANAF and the Ministry of Finance, with
   the PNRR variant on PNRR pages (DESIGN.md §Data Trust applies app-wide);
   and the Sentry feedback control, shown only with consent. The Better Stack
   iframe badge becomes a text link, "back to top" is dropped (both fought the
   scene), and the founder's LinkedIn link moves out of the footer — it is on
   the people band, beside the person it belongs to. One `nav` landmark,
   `Navigare footer`, rather than one per column.
2. **"Despre proiect" link.** The band linked to a prototype URL. The about
   page is a sketch with `[Provizoriu]` copy, so no `/despre` route ships and
   the link is omitted until one does. The people band otherwise ships as
   settled.
3. **Institution count.** The prototype hard-coded `3.295 instituții cu
   execuție 2024` and told promotion to fetch it. Production fetches
   `entityAnalytics.pageInfo.totalCount` with `limit: 1` through the same
   filter the ranking page uses, and omits the figure while loading or on
   error. A stale literal is never rendered as served truth.
4. **`/cookies` redirect.** The shipped page returned to `?redirect=` after any
   decision; the prototype only offered a back button. Production keeps both:
   a safe `redirect` is followed after a decision, and the back button stays.
   `redirect` is validated on the route, not read loosely.
5. **Source language.** Prototype copy is Romanian source text. It is wrapped
   in Lingui macros as-is (the repo already does this in 136 files) and the
   English `msgstr` values are filled in `src/locales/en/messages.po`. Module
   scope constants use `msg` descriptors resolved at render so SSR never bakes
   one request's locale into the next.
6. **About prototype.** Its band variants (`duo`, `bench`, `stage`) are the
   comparison the shipped band won, so they are deleted; the page sketch stays
   under `/development/landing/about` and imports the promoted people data.

## Review outcomes (Codex, 16 September 2026)

- Figures are formatted in the active locale (`formatValue(value, digits, locale)`,
  carried into the count-up through `data-count-locale`); Romanian separators on
  the English page read as a thousandfold error.
- `redirect` on `/cookies` is normalised through URL parsing
  (`src/features/privacy/lib/safe-redirect.ts`), not a prefix check.
- The institution count is dropped whenever the query is in error, including a
  failed refresh over cached data.
- Escape collapsing the consent disclosure returns focus to its trigger.
- The footer throw obeys reduced motion, stops off screen, and is owned by one
  pointer.
- Left as baseline: `doc-type-meta.ts` resolves labels at module scope,
  `useSentryConsent` reads storage during first render, and `SidebarInset`
  nests a `<main>` around the footer.

## Inline `<style>` blocks

The motion files carry their keyframes in `<style>` elements rather than
Tailwind utilities. DESIGN.md §Motion names the landing as its worked example
and the `[data-reveal]` state machine cannot be expressed as utilities without
arbitrary values that would leak literals into full-checkout CSS. Recorded here
as the exception; do not extend the pattern to static styling.

## Underground overscroll artwork — 26 September 2026

`FooterUnderground` extends the mountain into earth and tree roots, rock, and
lava with dark basalt crust. It is 216px tall and translated below the footer
with a 1px overlap. It sits in front of the mountain (z-index 10 versus 1),
because fully covered artwork disappeared during native Chrome overscroll.

The decoration is one background using `src/assets/images/underground.webp`
(72 × 216, 4,938 bytes), encoded with
`cwebp -resize 72 216 -q 75 -m 6 -metadata none`. It loads once when the footer
mounts and repeats horizontally at its native dimensions, preserving proportions.

`contain: layout` keeps the artwork out of document scroll height. There are no
added scrolling handlers, custom bounce, or animations. The decoration ignores
pointer events and is hidden from assistive technology. Native overscroll painting
is browser-dependent: 2px overlap was confirmed in macOS Chrome; the final 1px
setting was requested afterward. The rendering explanation remains a hypothesis;
see [the research note](../../research/footer-native-overscroll-2026-09-26.md).

## Budget map — 16 November 2026

The landing ends with a map of every primărie's budget, inside the page's ruled column (72rem, the 1px rules kept visible beside it) and never taller than 82% of the viewport; the zoom buttons sit on its top-right corner. Prototype:
`/development/landing/budget-map` (`src/development/prototypes/landing/budget-map.*`),
variants `svg`, `canvas` and `maplibre`.

**Renderer: MapLibre** (owner's pick). Measured on a 4× throttled phone in
headless Chromium: SVG and canvas over the INS hub's pre-projected shapes
(~230 KB gz with data) against MapLibre over the raw GeoJSON (~670–800 KB gz).
Redrawing 3,181 shapes per frame stuttered in both SVG (~2 s of raster per
pinch) and canvas (~200 ms a frame); moving the drawing as a GPU picture during
a gesture fixed both, and canvas still froze 130–220 ms at rest. Headless WebGL
is software-emulated, so MapLibre's slower pinch there is not what a phone
sees; its real cost is bytes. Those are paid in the background: the section
prefetches the code, shapes, label points and figures once the reader is within
about three screens of it and the page is idle (not on Save-Data or 2G), and
creates the map within a screen of the view. The prefetch first ran on page
load; Lighthouse on a production build (17 November 2026, mobile, median of 5)
put it at ~0.8 MB and +170 ms of blocking time (TBT 711 → 878 ms, score 63 →
59), so it waits for the reader now.

Decisions taken in the prototype:

1. **What it shows.** One year (2025), the primărie's own budget (ordonator
   principal, territorial executives), from the grouped-series endpoint (one
   request, ~0.1 s, 45 KB). A picker of maps: *Sold bugetar* (income − expenses,
   % of income), *Venituri totale*, *Cheltuieli totale*; grouped once there are
   several groups. The figures are the reported cash execution — see
   *Reported balance* below.
2. **Colours.** The balance diverges on ColorBrewer RdBu (deficit red, surplus
   blue, ±3% neutral). Income and expenses use RdBu's blue and red arms, five
   classes cut at percentiles 50/75/90/97 — half the primării share one light
   tint, the top 3% the arm's deep end, so the tops read at a glance. Seven
   equal classes were too dark (a third of the map at the dark end) or, softened,
   too washed out.
3. **Labels by zoom.** Counties (their code where the name does not fit), then
   UAT names, then names with the figure and unit — switched by the country's
   width on screen (1,400 and 3,600 px), so a phone and a desktop name the same
   things at the same size. Label points are poles of inaccessibility computed
   offline (`yarn map:label-points`, `public/geojson/label-points-<date>.json`).
4. **Under the pointer.** Desktop: tooltip at the pointer, click opens the
   primărie. Touch: a popover at the tapped point with a 44 px link. Touch
   gestures: one finger scrolls the page on the whole country, two move the map;
   zoomed in, one finger pans. MapLibre's gesture hint is restyled from a 40%
   black wash to a small centred pill, in Romanian.
5. **Legend** in the INS map's form: unit in the title, classes named by exactly
   the values they hold (decision log 2026-10-02), the ends of the balance named,
   the UAT under the pointer marked on the bar, a two-column list on a phone, the
   no-data count, one source line with coverage.
6. **Picker.** The trigger names the map at 18 px with a strip of its colours;
   each option carries a one-line description and its strip. shadcn Select under
   a mouse; a bottom sheet of radio rows under a finger (the phone's native
   picker cannot show either, and nothing here types, so Radix's
   keyboard-resize problem does not arise).

**Promoted the same day** (variant `maplibre`) as the landing's last band,
`04 / Harta`, after the people band and the promo cards:

| Prototype | Promoted to |
|---|---|
| `budget-map.data.ts` (figures, measures, formats) | `src/features/landing/api/budget-map.ts`, `lib/budget-map-measures.ts`, `lib/budget-map-format.ts` |
| `budget-map.maplibre-style.ts` | `lib/budget-map-style.ts` |
| `budget-map.maplibre-resources.ts` | `hooks/use-budget-map-data.ts` |
| `budget-map.maplibre-section.tsx`, `.maplibre.tsx`, `.picker.tsx`, `.legend.tsx`, `.uat-info.tsx` | `components/budget-map/` |

What changed on the way: every word is Lingui (`msg` descriptors for the
measures, resolved at render); numbers follow the active locale — `mii`/`mil.`/
`mld.` in Romanian, `K`/`M`/`B` in English (en-US suffixes, en-GB's are „k",
„m", „bn") — and the class labels read „sub 5 mil." / „under 5M". The band's
title and the picker are server-rendered; the picker works before the map
arrives and the map takes the picked measure as a prop. The prototype stays.

Review outcomes at promotion (Opus and Codex, 16 November 2026):

- The figures request had a fresh `createdAt` per call, so every visitor missed
  the server's grouped-series cache (~0.55 s of aggregation instead of ~0.1 s);
  the series now carry a fixed stamp.
- Figures are classified as printed (balance to one decimal, amounts to their
  short form): a primărie printed „−3%" or „14 mil. lei" is never coloured in
  the class its label excludes (decision log, 2026-10-02).
- The capital's own budget has no shape (the map draws its sectors); the
  server reports it (`BUDGET_MAP_COVERAGE`) and the source line says so. The
  coverage line counts the primării on the map.
- Without WebGL 2 the map is not built and says so, without a retry that would
  fail again; a renderer error is logged; a failed read offers a retry; the
  theme and a resize are followed; the picked map is in the address
  (`?harta=venituri|cheltuieli`).
- Open for the owner: individual primării are reachable by pointer only.

**Reported balance (16 November 2026).** The promoted map asked for its
figures with the app's analytics defaults (`withDefaultExcludes`: spending
economic 51.01/51.02, receipts functional 36.02.05/37.02.03/37.02.04/47.02.04),
while the primărie's entity page shows the reported execution, transfers kept.
So the map disagreed with the page it links to. Both series now go without
exclusions; year, report type, territorial-executive scope and normalization are
unchanged. The map shows the cash-execution difference reported to ANAF: each
primărie's colour is (reported receipts − reported payments) / reported
receipts × 100, with no value where either is missing or receipts are not
positive. Transfers and financing flows (FN 40/41, EC 81) stay in, as reported;
the legend's source line says so.

- Basis ([Law 273/2006](https://legislatie.just.ro/Public/DetaliiDocumentAfis/257231)):
  art. 57 makes actual receipts and payments columns of the annual execution
  account; the map shows their difference, not the year-end surplus carried
  forward, which art. 58 sets after the closing adjustments. Art. 3
  consolidation eliminates paired internal receipts and payments and keeps the
  cash difference of a fixed scope; the old prefix exclusions dropped rows
  without pairing them, so they were not that. Excluding financing was
  considered and is not done.
- Live parity (Chronos dev, 2025, main creditor, map request vs entity page,
  to the ban, after the change): Cluj-Napoca balance 397,218,946.03 →
  308,787,260.04 lei (receipts 2,656,460,197.71, payments 2,347,672,937.67);
  Timișoara +103,080,124.48 → −28,300,755.32; Sector 4 +38,013,363.90 (+1.3%)
  → +4,622,534.95 (+0.2%). Across the map, 185 of 3,186 primării change
  balance class.
- The analytics defaults, the other maps and the prototype are unchanged.
  `api/budget-map.test.ts` fails if either series carries an `exclude`.

**Credits (16 November 2026).** MapLibre's attribution control, bottom right
(folded behind an „i" on a narrow map), credits MapLibre and the boundaries:
„Limite UAT: ANCPI, prin geo-spatial.org, OGL-ROU 1.0", each a link. The UAT
and county shapes in `public/geojson/` are ANCPI's, distributed by
geo-spatial.org under the Romanian Open Government Licence v1.0, which asks
for the source and where it was published.

The SVG zoom engine the prototype produced is shared as
`src/components/maps/svg-zoom/` (`useSvgMapZoom`), off unless enabled; the INS
hub's UAT map opts in with `smoothZoom`.

## Hero copy — 22 November 2026

The owner asked for every line on the landing to be there on purpose, starting
with the hero.

**Title:** „Date publice, pe înțeles" / "Public data, made clear".
**Subtitle:** „Din surse oficiale, pentru decizii informate." / "From official
sources, for informed decisions."
**Page title** (browser, search engines, share cards): „Transparenta.eu – Date
publice, pe înțeles".

Each phrase says one thing, once:

| Phrase | Job |
|---|---|
| Date publice | What we have. The category, not a list, so new datasets (companies, satellite data) need no rewrite. |
| pe înțeles | How we present it: clear at first sight. |
| Din surse oficiale | Why to trust it. |
| pentru decizii informate | What it is for. |

Decisions, all the owner's:

1. **The subject is public data, not public money and not the state.** The
   platform also carries parliament votes, legislation, justice and private
   companies; „Banii publici" and „Statul român" were both too narrow.
2. **The subtitle does not list datasets.** The shortcuts under the search and
   the section list already name them; a list here repeated them and would go
   out of date. Ordered lists („de la bugete și contracte publice până la firme,
   legi și voturi") were considered and dropped for that reason.
3. **Tools are not named in the hero.** Search, charts, analytics, AI summaries
   and campaigns are shown by the page, not announced.
4. **No „toate" / „fiecare".** Some datasets are still being connected.

The previous pair („Date publice, decizii informate" + „Transformăm date
publice în informații clare, pentru a înțelege și decide mai bine.") said the
same thing twice and nothing concrete; the purpose moved into the subtitle.

The second title line is now short enough for a flat 2.75rem on every phone
(widest line 243px against a 280px column at 320px), so the fluid size the
longer line needed is gone. The subtitle is balanced so a phone breaks it after
„oficiale," and not before a lone last word.

## Hero lattice aligned to the frame — 22 November 2026

The owner asked for the background grid to line up with the frame's two side
rules. It was counted from the window's left edge while the frame is centred,
so the nearest grid line sat a few pixels beside each rule (5px at 1440) and
the gap changed with the window's width.

1. **Counted from the frame's left rule.** A major line lies on the left rule
   at every width.
2. **Major module 144px, not 120px.** The frame is 1152px: eight cells of 144,
   so the right rule closes a cell. The minor module stays 24px.
3. **Same line weight.** The lines fill whole pixels now, so their opacity was
   halved to keep the look.
4. **The margin squares follow.** The pixel field (1800px and wider) is offset
   onto the same lines.
5. **Every page head that draws the lattice changes with it** (procurement,
   companies, NGOs, justice, national budget, statistics, public enterprises):
   one component, one grid.

Not done: the horizontal lines are still counted from the top of the hero. At
desktop sizes they now fall above the headline (144px) and under it (288px)
rather than through it, which follows from the 144px module, not from a rule.

## Follow-ups

- A real `/despre` page, and the band link back once it exists.
- Review of the English copy in `en/messages.po` by a native reader.
