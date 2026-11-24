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
   *Rethought on 23 November 2026: the data-source line and the `Platformă`
   column are gone, see „Footer — 23 November 2026".*
2. **"Despre proiect" link.** The band linked to a prototype URL. The about
   page is a sketch with `[Provizoriu]` copy, so no `/despre` route ships and
   the link is omitted until one does. The people band otherwise ships as
   settled.
3. **Institution count.** The prototype hard-coded `3.295 instituții cu
   execuție 2024` and told promotion to fetch it. Production fetches
   `entityAnalytics.pageInfo.totalCount` with `limit: 1` through the same
   filter the ranking page uses, and omits the figure while loading or on
   error. A stale literal is never rendered as served truth.
   *Superseded on 23 November 2026: the landing no longer shows the count
   (see "What the page stopped saying" below).*
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
  failed refresh over cached data. *Superseded on 23 November 2026: the count
  is gone from the landing.*
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
5. **Legend.** What the map shows in one line (its name and what it is), the
   balance's ends named, the bar with the UAT under the pointer marked on it,
   the boundary values under the joins between colours, the no-data count, one
   source line. Until 23 November 2026 it took the INS map's form, every class
   named by the values it holds, with a second list on a phone („Map legend
   and picker" below).
6. **Picker.** The trigger is a one-line control: a strip of the map's colours,
   its name and a chevron (an 18px name under a „Harta" caption until 23
   November 2026); each option carries a one-line description and its strip. shadcn Select under
   a mouse; a bottom sheet of radio rows under a finger (the phone's native
   picker cannot show either, and nothing here types, so Radix's
   keyboard-resize problem does not arise).

**Promoted the same day** (variant `maplibre`) as the landing's last band,
after the people band and the promo cards. It was labelled `04 / Harta`; the
numbered labels were removed on 23 November 2026 and the band opens on its
heading.

| Prototype | Promoted to |
|---|---|
| `budget-map.data.ts` (figures, measures, formats) | `src/features/landing/api/budget-map.ts`, `lib/budget-map-measures.ts`, `lib/budget-map-format.ts` |
| `budget-map.maplibre-style.ts` | `lib/budget-map-style.ts` |
| `budget-map.maplibre-resources.ts` | `hooks/use-budget-map-data.ts` |
| `budget-map.maplibre-section.tsx`, `.maplibre.tsx`, `.picker.tsx`, `.legend.tsx`, `.uat-info.tsx` | `components/budget-map/` |

What changed on the way: every word is Lingui (`msg` descriptors for the
measures, resolved at render); numbers follow the active locale — `mii`/`mil.`/
`mld.` in Romanian, `K`/`M`/`B` in English (en-US suffixes, en-GB's are „k",
„m", „bn") — and the legend's values read „14 mil." / „14M". The band's
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
  coverage sentence („3.186 din 3.186 primării…") was dropped on 23 November
  2026; the no-data count says it when some are missing.
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

## Search placeholder — 22 November 2026

The hero search's placeholder is **„Caută primării, firme, legi…"** (owner's
choice), replacing „Caută entități, statistici sau identificatori...".

- **Why it changed.** The old wording named categories of the data model
  ("entități", "identificatori"), not things a reader looks for, and at 46
  characters it was cut mid-word on every phone.
- **What it names.** Three things people come to find, each a real result type
  of the search: town halls, companies, laws. It is an example of the reach,
  not a list of it (the search also returns INS statistics, NGOs, state
  companies, MPs); „date INS" was considered and left out because it assumes
  the acronym.
- **Length.** The field's text room is 158px at 320, 188px at 360, 203px at
  375 and 218px at 390 (80px on the right is kept for the spinner and the
  clear button). The Romanian text is 209px: whole from 390px, the last dot of
  its „…" clipped at 375px, cut inside „legi" at 360px. Measure with a span
  that carries the field's letter spacing (0.32px); a canvas `measureText`
  ignores it and reads 9px short. Dropping „Caută" would fit 360px too; the
  owner kept the verb.
- **English.** "Town halls, firms, laws…" (188px, whole from 360px). With
  "Search" in front, or with "companies", no English wording fits a phone, so
  the English drops the verb the magnifier already shows.
- The same string is the default in `landing-search.tsx` and
  `deferred-landing-search.tsx`, so the field reads the same before and after
  the search code loads.

## Hero headline typesetting — 22 November 2026

The headline keeps its extra-bold weight (owner: "I like the bold version of
the title we have"); only its spacing changed. Six treatments were compared in
the real font, including lighter weights (620, 500), which the owner declined.

| | Before | Now |
|---|---|---|
| Weight | 800 | 800 |
| Letter spacing | `-0.05em` | `-0.04em` |
| Word spacing | none | `0.06em` |
| Line height | 0.92 | 0.96 |
| Commas | square | round (`ss03`) |

- **Why.** Tracking that tight also closes the gap between words, so the two
  lines read close to „Datepublice, peînțeles"; the word gap is given back. At
  0.92 the circumflex of „î" nearly touched the descender of „p" above it.
- **Round commas** are Inter's own alternate (`ss03`). They were chosen for the
  headline, which has a comma and a „ț", where the square ones read as slabs at
  72px. The feature is now set on the landing page's root (`landing-page.tsx`),
  not on the headline: every comma and quotation mark on the page is the round
  one, in a figure („19,04"), in a heading, and under each „ș" and „ț". It is in
  the font the page already downloads; a comma keeps its width, and quotation
  marks come out a little wider.
- **Subtitle.** `tracking-normal`: the site's `0.02em` is set for 14px text and
  looked loose at 20px under a tight headline. Colour and size are unchanged
  (no new emphasis level).
- **Not done.** A second typeface (DESIGN.md rules it out, and it would add a
  font download to a page tuned for load), two weights or colours inside the
  headline, and the single-storey „a" (`cv11`), which would appear nowhere else.
- The widest line is 252px in a 280px column at 320px, so it still holds two
  lines on every phone.

## Hero shortcut row — 22 November 2026

The row under the search („Sau mergi direct la" + three links) was polished and
its label rewritten. Four versions were shown on the real page (the row
repaired as it was; the label in plain text; three small buttons; a ruled strip
with arrows); the owner chose the plain-text label, without underlined links.

- **Faults fixed.** The label was centred on the links (`align-middle` on
  both), which left its baseline about 3px above theirs on desktop; the two now
  share a baseline (`sm:items-baseline`).
  The label was 10px mono capitals at about 2.7:1; it is `text-sm
  text-muted-foreground` (4.6:1).
- **One voice.** The label is a sentence that continues into the links, so it is
  set like them, not as a mono caption. This is the first use of the rule now in
  DESIGN.md: mono only where it is necessary.
- **Links.** Medium weight in the foreground colour against the muted label;
  the accent colour on hover. No underline, at rest or on hover (owner).
- **Phone.** Unchanged in structure: the label on its own line, each shortcut a
  44px row.

## Sections menu — 22 November 2026

The hero's shortcut row names three sections. An icon button beside them
(`sections-menu.tsx`, a grid icon, „Toate secțiunile") opens every section the
landing can offer: the same groups as the index further down
(`visibleGroups()`), as icon and title, without the blurbs.

**Placement.** On a wide screen the button closes the row, after the third
shortcut. On a phone the three shortcuts already fill the row (they need 316px
of 342px at 390px), so the button sits at the end of the label's line. It is a
44px target on a phone and 32px on a wide screen; negative margins keep either
line from growing around it (the label's line is 28px on a phone, 8px taller
than before).

**Panel.** 30rem wide on a wide screen, under the button with its end on the
button's end: the search dropdown's outline and header strip, groups flowing
into two columns. A bottom sheet below 640px: each group's links two abreast,
44px tall, so the whole list fits without scrolling at 390 × 844. The panel
closes at the click on a link, since the next page can take a moment to
arrive. The links are a `nav` of links, not a `menu` of items: they can be
opened in a new tab, are read out as links, and the Tab key walks them, straight on from the
button.

**On a wide screen the panel is part of the page, not a floating popover**
(owner, 22 November: the first version, a Radix popover, trailed the page on
scroll). A Radix popover is drawn at the end of the document, pinned to the
window (`position: fixed`), and a script moves it after every scroll event, a
frame behind the page. The panel is instead an absolutely placed child of a
`relative` wrapper around the button, so the browser scrolls it with the hero
like any other content, and no script places it. What that costs:

- **No collision handling.** It always opens below the button. It is 375px
  tall and starts about 455px down the page, so a window shorter than about
  830px shows its lower part only after a scroll. A popover would flip above
  the button, over the headline.
- **It lives in the page's layers.** It works because no ancestor of the row
  clips downwards or forms its own stacking context (the page wrapper clips
  sideways only, and the panel never leaves it: its left edge is at 65px or
  more from 640px up, in both languages). An `overflow: hidden`, a transform
  or a `z-index` added to a hero ancestor later would cut it or put it under
  the next section; `z-30`, as the search dropdown.
- **Its own closing rules**, about twenty lines in the component: Escape (the
  focus back on the button), a press outside, the focus leaving. The focus is
  not moved on opening; the panel follows the button in the document, so Tab
  goes on into the links.

**Phone: the app's bottom sheet** (`sheet.tsx`, Radix Dialog), as the
notification bell's. It is modal, so the page does not scroll under it.

**Size.** No library code the landing did not already download: the sheet,
dialog and focus code come with the app shell. The new download is the
component itself, about 1.5 KB gzip (an esbuild bundle of the file with its
imports external; not a production build), and the window-size hook, 0.3 KB.

**Tried and not kept.** Both were built as a `/development` prototype, removed
on the owner's word once the choice was made:

- *Radix popover through `ResponsivePopover`*: about 3 KB gzip more (the
  popover primitive and the wrapper), and the scroll lag above.
- *Base UI popover and drawer*: its popover scrolls with the page too
  (absolutely placed by default), and its drawer follows the finger and closes
  on a swipe down, the one thing it does better. But Base UI is on the landing
  only inside the search's deferred chunk, and `Popover` and `Drawer` add about
  28 KB gzip on top of it (an esbuild bundle of the search's `Autocomplete`
  with and without them: drawer alone +19 KB, popover alone +11 KB), which
  would need a deferred load of its own.

For scale: the production build of 21 November downloads 203 scripts, 860 KB
gzip, on the landing.

## Institutions panel — 22 November 2026

The hero's list of example institutions (`start-here-panel.tsx`), polished with
the owner. The list itself stays; what changed is how it is captioned, named and
framed.

- **Caption.** „Instituții" on the left and „CUI" on the right, in sentence-case
  sans at `text-xs`, replacing the uppercase mono „Începe de aici"
  (`DESIGN.md`, "Mono only where it is necessary"). The caption names what the
  rows are, as a column heading does. The search dropdown's header
  (`landing-search.tsx`) is set the same way, so the two lists read as one kind
  of thing; that header is shared by every page that uses the search.
- **Full names.** „Municipiul Sibiu", not „Mun. Sibiu". A name that does not
  fit beside its CUI is cut with an ellipsis; none is at 390px.
- **Second line says what the row is.** „Primărie · Jud. Sibiu",
  „Minister · București" — the same form as a search result's second line. The
  panel keeps its own six-row list (`INSTITUTIONS`) with the kind and county
  written in, instead of importing the search's row component, which would pull
  the search's code into the eager bundle.
- **Rows.** No rules between rows: the two-line rhythm separates six rows
  without making a table of them. A row answers the pointer with its background
  and an underline on the name (owner: the underline was removed, then asked
  back the same day; the row separators stay off).
- **Last row.** „Toate instituțiile" with an arrow, to `/entity-analytics`, on
  the caption's tint. The zoom light leads to the same page, but a phone has no
  lights and a desktop reader has to try them to find out.
- **Below `lg`** the panel is a card in the search field's outline (`rounded-lg`,
  the field's border colour) with the caption on a tinted strip, as the search
  dropdown's header has. The square hairline box read as unfinished under the
  rounded field. From `lg` the window chrome and tilt are unchanged.

Measured in the browser: the hero is 916px tall at 390px and 650px at 1440px
(Romanian and English), every row 56px on a phone, no hydration warnings.

Not changed: `PREDEFINED_ENTITIES` (`src/lib/constants/predefined-entities.ts`)
still feeds the budget campaign's badges; the panel no longer reads it.

## Figures band — 22 November 2026

The „România în cifre" band (`national-facts-band.tsx`, figures in
`national-facts.ts`) was brought up to date, and each tile now leads somewhere.

- **Figures, re-checked on 22 November 2026.** GDP 2025 is 1,929,930 million lei
  (INS Tempo CON111B, updated 9 October 2026; Eurostat `nama_10_gdp` has the
  same figure, provisional), replacing 1,916.4 bn: the tile reads „1.930"
  („1,930" in English). Population is 19,041,322 at 1 January 2026, provisional
  (Tempo POP105A, updated 10 September 2026; Eurostat `demo_gind` the same),
  chosen by the owner over the last definitive figure (19,043,151 at 1 January
  2025); the tile still reads 19,04 mil. and its source line now says „INS ·
  1 ian. 2026 · provizoriu". MFin's 2025 consolidated spending (808.7 bn) and
  cash deficit (146.0 bn) are unchanged: published 27 January 2026, no revision
  found.
- **Each tile links to the platform's own page on its data**, because the tile
  is the claim and the page is its evidence: GDP to `/ins/seturi/CON111B`,
  population to `/ins/seturi/POP105A`, spending to
  `/national-budget/analytics?perioada=2025`, the deficit to
  `/national-budget/analytics?tip=sold`. The budget tiles go to the analytics
  page, not the citizens' page (owner). The link is the label, inside the `dt`
  so the list stays a valid `dl`, and its hit area is stretched over the tile
  (`::after`); its accessible name is the label alone. Keyboard focus draws a
  2px ring inside the tile. Hover gives the tile a quiet background
  (`bg-muted/50`, as the institutions panel's rows); no underline under the
  spaced mono capitals, where the background and the arrow already say it.
- **Arrow cue.** A small `ArrowUpRight` in the tile's top-right corner, muted.
  Where a pointer hovers it shows on hover or focus; on touch it is always
  visible (owner).
- **Unchanged on purpose.** The labels stay uppercase mono, the source lines as
  they were (owner); no visible band title, no revenue tile.
- **Hardcoded figures.** They are written in the file, not fetched. INS revised
  the 2025 GDP three times in 2026, so whoever edits the file re-checks all
  four.

Measured in the browser (dev server; 390 × 844 touch, 1440 × 900 in Romanian
and English): the four hrefs are in the server HTML, and a click on each
number lands on its URL. At 390px the arrow is 14px, 8px in from the tile's
top and right edges, 2px above the number's line box (the digits start lower)
and 16px above the unit's, so it touches neither, „1.930 mld. lei" included.
Tile heights are unchanged: 199px and 184px for the two rows on a phone,
162.5px on a wide screen. On a wide screen the arrow is hidden at rest and
shows on hover and on keyboard focus, with the ring. No hydration warnings in
any of the three.

Not checked: the target pages' content. The dev API sits behind an access
login from the dev machine, so `/ins/seturi/*` and `/national-budget/analytics`
open without data here; whether `/ins/seturi/CON111B` opens on its „PIB" row
is unverified.

## Entrances play once per page load — 22 November 2026

Owner: coming back to the landing should not replay its animations; it "could
be too distracting". The page is also put back at the scroll position it was
left at, where a block still fading in looks like a page still loading.

**What is gated.** The page's entrances: blocks fading in as they come into
view (`data-reveal`), the figures counting up (`count-up.tsx`), the group
titles and the figures' source lines unscrambling, the index pictures' reveal, the hero's margin-field wave
at load (`pixel-canvas.tsx`) and the institutions panel's arrival
(`panel-tilt.tsx`, the CSS `tpz-panel-in` and `tpz-shadow-in`). Not gated: the
effects that follow the scroll (the scroll light, the section light, the panel
squaring up as the page scrolls), the margin field's ripple at a click, and
the reduced-motion rule, which still turns the entrances off on its own.

**How a return is detected.** `useFirstVisit()` (`lib/first-visit.ts`) reads a
module-level flag at the component's first render and sets it in an effect
after mount. The first `LandingPage` mounted in a document, whichever page the
reader arrived on, gets yes and keeps it for as long as it stays mounted;
every later mount in the same document gets no. On no, `landing-page.tsx`:

- hands the reveal and picture hooks an empty root (`NO_ROOT`), so nothing is
  armed and every block is shown as rendered; the count-up and the scramble
  start from the reveal, so they do not run either;
- passes `intro: false` to `useCanvasFieldMotion`, so the load wave does not
  play;
- marks its root `data-entrances="played"`, which sets the panel's entrance
  animation to `none`.

**A full reload plays them again.** The flag lives in the module, not in
`sessionStorage`, so it lasts exactly as long as the document: moving around
the app and back skips the entrances, and a reload or a new tab starts with
them. A stored flag could not stop them anyway: the server's HTML starts the
hero's CSS entrance before any script runs. The flag is never set on the
server, where effects do not run, so one request cannot switch the entrances
off for the next, and the first client render agrees with the server's HTML.
Because it is read at render and written at mount, StrictMode's second effect
run still sees the first answer (`first-visit.test.ts` holds yes for the first
mount and its re-renders, no for the next mount).

## What the page stopped saying — 22–23 November 2026

Owner: "Keep only what we really need. The focus and clarity for user is top
priority."

Removed:

- **The statement band** over the index: the label `01 / Ce găsești aici`, the
  heading „Fiecare sursă, într-un singur loc" and its paragraph.
- **Every running number and count in the index**: the tile numbers, the group
  numbers and each group's entry count.
- **The numbered labels** above the people and map headings (`03 / Oameni`,
  `04 / Harta`).
- **The provenance band** (`02 / Proveniență`, „Fiecare cifră își spune
  sursa"): its paragraph on the official sources, and its row of counts
  (institutions with a budget execution for the year, datasets, datasets served
  live, surfaces, domains). With it went `lib/platform-coverage.ts` (the counts,
  from the scraper dataset catalog) and `hooks/use-institution-count.ts` (the
  `entityAnalytics` read behind the institution count; decision 3 above).

**Cost.** The landing no longer prints coverage counts, or the sentence saying
the data comes from official sources and that some datasets are still being
connected. Each figure tile still names its source and date.

**Gain.** One fewer GraphQL request on the landing, and no dataset-catalog
import.

The index keeps a screen-reader-only h2, „Toate secțiunile" (the hero menu's
words), so the heading outline stays h1 → h2 → h3 with the group titles as h3.

Page order now: hero → national figures → index → people → promo cards →
budget map.

## Index text — 23 November 2026

Every tile in the index (`lib/landing-groups.ts`) has a new line, and two names
changed. The rule the owner approved, for these tiles and any added later:

1. **One sentence per tile, in plain words, saying what the reader can find
   out**, not how the data is organised.
2. **No internal vocabulary.** Removed: „grila de încredere" (Achiziții
   publice), „nivel de identitate" (ONG-uri), „valori agregate" (the
   institutions' tile), „acoperirea declarată" (Statistici INS).
3. **A source is named only where the name helps recognition**: SEAP,
   Monitorul Oficial, INS.
4. **No caveats in the tile.** The owner removed „Persoanele nu sunt numite"
   from Justiție; the justice pages say it themselves.

Two blurbs were factually stale and were corrected: Alegeri said there were no
results („Fără rezultate deocamdată"), while the contest pages show votes and
turnout by party; Buget național described spending only, and the budget pages
carry revenue too. Investiții publice and Parlament are unchanged (both are
behind gates, and neither shows on the dev server).

**Names.**

- „Analiza entităților" became **„Instituții publice"** on the landing, in the
  sidebar and in the footer's `Platformă` column, so the three navigations
  agreed (the footer's column went on 23 November). The `/entity-analytics` page itself still opens on „Analiza
  entităților" (its h1, the mobile filter dialog's title and the document
  title „Analiza entităților – Transparenta.eu"); renaming it is open for the
  owner.
- The group „Instrumente" became **„Statistici și instrumente"**, because
  Statistici INS is data, not a tool. The group's key stays `instrumente`.

**English.** The brief's wording, with the catalog's established terms where
they exist: „Monitorul Oficial" is "the Official Gazette" (as on the
legislation pages), „materii" is "matter" (as on the justice pages). „Primării"
is "town halls", as in the search placeholder and the public enterprises tile;
elsewhere the catalog mostly says "city halls", including the budget map's
title, so the landing still uses both.

**Checked against the pages** (the code, 23 November 2026): the company page
shows financial statements year by year, employees and its contracts,
purchases and PNRR money; PNRR has projects and beneficiaries tabs; an NGO's
page shows its financial statements and the Ministry of Labour's licensed
social services; an act's page lists its amendments; `/map` shows spending
(its default) by UAT or by county; an election contest shows votes by party
and turnout; `/entity-analytics` ranks institutions by income or by expenses,
one at a time.

Measured in the browser (dev server; 1440 × 900, and 390 × 844 touch): every
tile shows its new title and line. At 1440 each blurb fits on one line in the
two-column groups; in the three-column group (Hartă, Grafice, Statistici INS)
each takes two, with two or three words on the second. At 390 every blurb
takes two lines except Justiție (one); no line ends on a single word. Nothing
is clipped, the page does not scroll sideways, the group titles stay on one
line, and the hero's sections menu lists „Instituții publice" and „Statistici
și instrumente" in both layouts. No hydration warnings.

## Index polish — 23 November 2026

Two redesigns of the index were built and turned down on the same day: small
statues standing on each group's list with three lists side by side (too
cluttered on a desktop), and a boxless table of contents with the statues at
the end of each row. The owner kept the lattice: it gives each section and
each picture room, and the hero's sections menu already is the short list.
What changed inside it:

1. **„Politică" is gone as a group.** With the parliament gate shut it was a
   heading over one tile beside an empty cell. Parlament and Alegeri now close
   the law group, renamed **„Lege, justiție și alegeri"** (key still `lege`).
   The hero's sections menu follows, since both read `visibleGroups()`.
2. **Justitia has a cell three tiles tall**, as a result: she shows to the
   knees with the scales and the sword whole, where two tiles cut her at the
   thighs.
3. **Group labels are 13px**, up from the mono label's own 10px. Same face,
   at 10px they did not read as headings. (The rule beside them went with
   item 8.)
4. **Tile titles are 18px** (were 16px). Descriptions stay 14px.
5. **Every tile carries an arrow at rest**, top right, on the icon's line. It
   was shown on hover only, so a phone never saw it and a tile did not look
   like a link until the pointer was on it. It darkens and moves 2px on hover.
6. **The lion is a portrait: closer, with the head always whole.** It was a
   fitted picture zoomed 1.2 from its centre (1.39 on a phone), which cut the
   plinth at the bottom on a desktop and the head as well on a phone. Now it
   is cropped from the top with 12px of air above the mane, and brought
   forward 1.12 so the cell's edge crosses the legs (desktop, phone) or runs
   under the paws (tablet) and never along them. A whole lion standing on the
   cell's bottom rule was tried first; the owner asked for it closer, as long
   as the head stays visible.
7. **Every picture zooms from its anchor.** The phone's closer crop and the
   hover zoom grew from the picture's centre; they now grow from its
   `object-position`, so a figure anchored by its head keeps its head.
   Justitia no longer loses the top of her hair on a phone.
8. **A group's title is a tab on its box** (owner's request, later the same
   day). The rule that ran from the title to the right edge is gone: it was a
   second line 16px above the box's own top rule. The title now sits in a
   bordered tab that shares the box's left rule and has no bottom rule, so
   tab and box read as one sheet. Same 13px mono label. The tab is the `h3`
   itself: `w-fit border border-b-0 bg-background px-4 py-2.5`, pulled 1px
   over the box (`-mb-px`, `z-10`) to cover the box's rule under it.
   The tab stands on the picture's side: left for the lion and Justitia,
   right for Atlas (`sm:ml-auto`). On a phone the picture is on top at full
   width, so every tab stays on the left.
9. **Atlas shows the whole globe** (owner's request). The picture is cropped
   from the top with 14px of air above the globe (`50% 14px`, was `50% 15%`,
   which cut the globe's crown flat against the new tab). The cut at the
   bottom moves from the feet to the shin on a desktop; a tablet still shows
   the plinth, a phone the globe and the head.

Measured in the browser (dev server; 1440 × 900, 820 × 1100, 390 × 844): the
index is 1,653 / 1,947 / 2,921px tall, the page does not scroll sideways, and
there are no hydration warnings.

## People band — 23 November 2026

Six changes, approved by the owner; the first was reversed the same day:

1. **The contributors row stays as it was.** It was first replaced by one
   line, „Codul e public. Poți contribui pe GitHub.", and the owner restored
   it the same day: the row is for the people who helped with feedback and
   other contributions, not for GitHub contributors. The owner's own profile
   in it is a demo entry, and the grey seats are placeholders until the
   people are added. The row (label, faces, seats and the dashed „+") is
   unchanged from before.
2. **The founder's line is in the first person**: „Am construit
   Transparenta.eu pentru că datele despre banii publici există, dar în zeci
   de portaluri care nu vorbesc între ele."
3. **The lines under the names are plain text**: 12px, muted, in their own
   casing, where they were the 10px uppercase mono label. The founder's reads
   „Fondator" („· Transparenta.eu" dropped). The supporters' lines are their
   own words and did not change. The „Îngerii păzitori" label keeps the mono
   label. The angels keep their `blurb` (a copy of the line) because the
   about prototype prints it.
4. **The lead follows the heading at every width.** On a phone the order was
   heading, founder, lead, angels; the lead introduces the whole band, so it
   now comes second. The band is one 12-column grid of four blocks. From `md`
   the heading (5 columns) and the lead (6, from column 7) share the first
   row, and the founder and the angels share the second, so the founder's
   portrait and the „Îngerii păzitori" label start on the same line. The
   angels' pictures start 26px lower, under the label.
5. **The portraits are plain pictures**, no longer links to Facebook. The
   icons under each name still link there.
6. **The band closes the page.** Page order now: hero → national figures →
   index → promo cards → budget map → people. This supersedes the order given
   at the end of „What the page stopped saying". The band has no bottom rule
   of its own: the footer's top rule closes it, so that line is not doubled.
7. **The words are about the people who help, not about the founder** (owner,
   same day). The lead was „Platforma e scrisă de un singur om și a rămas în
   picioare pentru că alți câțiva au dat timp, date sau o ușă deschisă atunci
   când conta."; it is now „Transparenta.eu există datorită oamenilor care o
   susțin: cu timp, idei, date sau o ușă deschisă atunci când conta." The
   supporters' label „Îngerii păzitori" is now „Principalii promotori", the
   owner's wording. The name reads „Transparenta.eu" there, as in the founder's
   quote (owner, 23 November).
   The heading „Cine e în spatele platformei" is now „Oamenii din spatele
   platformei": plural, to match. The founder's own line stays in the first
   person, and the layout (his portrait on the left half) is unchanged, by the
   owner's choice.
8. **The promo-card band is hidden for now** (owner, same day). It held the
   campaign card („Provocări") and, with the parliament gate open, a
   parliament card that repeated the index's own tile. With the campaign card
   gone the band would have been an empty strip in production, so the whole
   band is out; both components are kept. Page order now: hero → national
   figures → index → budget map → people.

Measured in the browser (dev server; 1440 × 900, 820 × 1100, 390 × 844): the
band is 1,121 / 991 / 1,807px tall (it was 1,097 / 986 / 1,837). There is one
rule between the map and the people, and one between the people and the
footer. The page does not scroll sideways, and there are no hydration
warnings.

## Map legend and picker — 23 November 2026

Owner: "I don't like the text on the legend. I think it can be improved from
the font to the text itself. On the title and drop-down panel, I think we
need to polish, make sure they are aligned and the design is good."

**The legend has one form at every width.**

1. **The first line says what the map shows**, in words the page already
   has: the map's name and its picker description („Sold bugetar  Venituri
   minus cheltuieli, ca procent din venituri"), at 14px. It replaces the 10px
   uppercase mono title with its unit („SOLD BUGETAR · % DIN VENITURI").
2. **The balance's ends**, „Deficit" and „Excedent", sit above the bar's two
   ends in plain 12px text, without arrows.
3. **Values under the joins.** The n − 1 boundaries are centred under the
   joins between colours, in the page's sans at 12px: „−20%" to „+20%",
   signed as the hover card prints them, and the amounts short without „lei"
   („14 mil.", „22,4 mil.", „44,6 mil.", „178,5 mil."), since the first line
   says „în lei". They replace one mono label per class („−20 – sub −10")
   and, on a phone, a second list of swatches under the bar. Classification
   did not change (DESIGN.md decision log, 23 November 2026). Each map prints
   its own values (`Measure.tick`). The measures' `unit` and `note` went with
   the old labels, and the balance's ends moved from its scale to the
   measure, so the legend can show them before the figures arrive.
4. **The no-data count** is plain 12px text beside its swatch.
5. **The source line is shorter**: „Sursa: Ministerul Finanțelor, execuția
   de casă 2025 a primăriilor (ordonator principal), cu transferurile și
   finanțările incluse." The coverage sentence („3.186 din 3.186 primării de
   pe hartă au date.") is gone, since the no-data count says it when it
   matters. The sentence explaining the balance is gone too, since the first
   line says it. The Bucharest sentence is shorter: „Bugetul propriu al
   Municipiului București nu apare: harta arată cele șase sectoare."

**The title and the picker.**

6. **The trigger is an ordinary one-line control**, 40px tall: the map's
   colour strip, its name at 14px, a chevron. It was a 56px box with a
   „HARTA" caption and the name at 18px semibold, a second headline beside
   the title. It is 224px wide from `sm`, so it keeps its size when the map
   changes („Cheltuieli totale" fits uncut), and full width on a phone.
7. **The row centres the control on the title's line.** It lined up the
   boxes' bottoms, which put the title's text about 8px below the map's
   name. On a phone the control sits under the title.
8. The dropdown and the phone's sheet are unchanged.

The legend's placeholder (`MapPlace`) is the legend itself, rendered unseen
and without figures, so it wraps as the real one does at every width and in
both languages. It first held measured heights per map; the final review
found them 20px off in English on a phone and between 640 and 666px. The
mounted map keeps the capital's sentence on its line while its figures are
still on the way, for the same reason.

Measured in the browser (dev server; 1440 × 900, 820 × 1100, 390 × 844):

- The legend is 141 / 141 / 200px on the balance map (it was 155 at 1440 and
  302 at 390) and 119 / 119 / 178px on the totals.
- The band is 1,096 / 895 / 715px (it was 1,125 at 1440 and 833 at 390).
- The title and the control share one centre line at 1440 and 820.
- At 390 the two closest values are 12.7px apart on the balance and 13px on
  income; in English („14M" to „178.5M") 26px.
- The band is as tall before the map replaces its placeholder as after, on
  both maps at all three widths (measured with the fixed heights; the unseen
  legend that replaced them was re-measured in the final review, below).
- The page does not scroll sideways, and there are no hydration warnings or
  console errors.

The page order stays as the people band entry records it (item 8): hero →
national figures → index → budget map → people.

## Footer — 23 November 2026

The footer was an early version; the owner asked for a rethink and for the
Ministry of Finance line to go. It is app-wide (`AppFooter`), so this applies
to every page.

1. **No data-source line.** „Date din surse oficiale · Transparență bugetară,
   ANAF / Ministerul Finanțelor · mfinante.gov.ro" is removed, by the owner's
   choice: every page names its own source, and one ministry under pages about
   procurement, justice or elections was wrong more often than right. The PNRR
   variant went with it for the same reason (PNRR has `/pnrr/surse`), and so
   did the path check that picked it.
2. **No list of sections.** The `Platformă` column held three links
   (Instituții publice, Hărți, Grafice) out of thirteen sections, with no
   reason for those three. The landing's index and the sidebar are the
   navigation; the footer no longer repeats a part of it.
3. **The tagline is the hero's.** „Date publice din surse oficiale, pe
   înțeles." joins the hero's two lines in one sentence. It replaces „Banii
   publici, deciziile și documentele care le însoțesc — într-un singur loc, cu
   sursa și data lângă fiecare cifră.", an older pitch that promised a source
   and a date beside *every* figure.
4. **Two columns: `Proiect` and `Legal`.** `Proiect` is Contact, LinkedIn,
   Cod sursă pe GitHub, Stare sistem. **Contact is new** (`mailto:` the support address
   the support menu already uses; it opens in place, not in a new tab): the
   footer had no way to write to the project without accepting the feedback
   cookies. It replaces „Raportează o problemă", which sent every reader to
   GitHub issues; the repository link still leads there. `Legal` is unchanged
   (three policies and the cookie settings link the cookies page promises).
5. **The last line is plain text.** „© 2026 Transparenta.eu" in `text-xs`,
   not an uppercase mono caption. The column captions stay mono, now at full
   `text-muted-foreground` instead of 70%.
6. **The two columns sit side by side on a phone**, under the brand. They
   were stacked, each link a 44px row.
7. **„Stare sistem" carries a live dot** (owner's request), after the words:
   green operational, amber degraded, red down, blue maintenance, and grey
   until the status page answers or if it does not. A green dot the page had
   not checked would be a claim. The state comes from the status page's own
   public feed (`status.transparenta.eu/index.json`, `aggregate_state`, open
   to any origin), read in the browser once the footer comes into view and
   again when the reader comes back to the tab, at most every five minutes;
   the server never reads it, so it cannot slow a page. Green needs no word;
   any other state is written out after the name („Stare sistem:
   indisponibil"), so colour is never the only thing that says it, and a
   screen reader hears the state in every case. This is a
   request from the reader's browser to Better Stack, like the announcement
   widget production already loads. `system-status-link.tsx`.
8. **LinkedIn is back** (owner's request): the founder's profile, as a text
   link under `Proiect`. The promotion had moved it to the people band, which
   only the landing shows; the footer is on every page.

Measured in the browser (1440 / 820 / 390): the footer is 608 / 707 / 765px
tall, down from 649 / 819 / 1,245px. No sideways scroll, no console errors.
„Trimite feedback" under the tagline is unchanged (shown only with consent).

## Consent card — 24 November 2026

Owner: polish the type and the words, rethink the cookie as livelier pixel
art, better motion. Prototype `/development/privacy/consent-card-v2`
(`yarn dev` only).

- **Round 1.** Three cookies tied to the platform: a budget pie whose slice
  pulls out, an official stamp, a leu coin that flips. The owner chose
  instead to polish today's cookie with a face.
- **Round 2.** The face, with two endings for „Doar esențiale”: sad with a
  tear (`face-sad`) or calm (`face-calm`). **Chosen: `face-calm`.** A sad
  face for declining would steer people emotionally, and declining is meant
  to be as easy as accepting.
- **The cookie** (`cookie-illustration.tsx`):
  - **Waiting:** it looks at you, with a highlight in each eye, and blinks
    once.
  - **„Acceptă tot”:** it beams, with closed eyes and an open smile, and keeps
    its bite and crumbs.
  - **„Doar esențiale”:** it drops its chips and is content, eyes closed and
    smiling.
  - **Drawing.** The face is 4-unit chocolate pixels, clear of the bite. The
    chips moved to the rim. Faces swap in one frame; pixel faces do not morph.
  - **Motion.** It hops in, in three steps, just after the card arrives, and
    blinks at 1.4s. Both are dropped with reduced motion.
  - **Where.** The settings page uses the same cookie and face, without the hop (`arrive` is the card's alone).
- **The card** (`consent-card.tsx`):
  - **Type.** Inter only: the mono capitals (the „Confidențialitate” eyebrow,
    „01/02/03”, „Mereu”, the footer links) are gone (DESIGN.md: mono is for
    codes, not words).
  - **Text.** The title is „Cookie-uri puține, la vedere”. The body is
    „Folosim doar ce e nevoie ca site-ul să meargă. Statisticile de
    utilizare și rapoartele de erori pornesc numai dacă alegi tu.” The
    disclosure reads „Alege ce pornești” and „Mereu pornite”. The
    confirmations are „Mulțumim!”, „Doar esențialul.” and „Am notat.”
  - **Size.** The cookie is 64px, 72px from `sm` up.
  - **Corner marks gone.** They stuck 1px out of the scrolling card and gave
    it a horizontal scrollbar.
  - **Behaviour is unchanged:** non-modal, Escape, focus return, the ×, the
    timings.

## Follow-ups

- A real `/despre` page, and the band link back once it exists.
- Review of the English copy in `en/messages.po` by a native reader.
