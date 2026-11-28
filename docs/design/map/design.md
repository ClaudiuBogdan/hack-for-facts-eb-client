# Map page (`/map`) — design record

**Status:** promoted 25 November 2026 (written 2026-11-25 08:15 UTC). Prototype:
`/development/map/page?v=fullscreen` (`src/development/prototypes/map/`, kept).
Code: `src/features/budget-map/` and `src/routes/map.tsx`, `map.lazy.tsx`.

## What changed

`/map` was a thin route over the advanced-map workspace (`MapAnalyticsWorkspace`,
5,000+ lines, shared with the map editor and public maps): a configuration
select, a full filter dialog, map, table and chart tabs, and a yellow-to-red
continuous ramp. It is now the landing's budget map (`docs/design/landing/design.md`
§Budget map) laid out for a page of its own. The workspace, `useMapFilter` and
`MapStateSchema` are untouched; their other users keep them. `MapFilter` and
`standalone-map-state`, which only the old page used, were deleted in the
polish round below.

## Decisions (owner, 25 November 2026)

1. **Built on the landing's map.** Its engine, colours, labels by zoom, tooltip
   and popover, picker and legend scale are reused, not copied. The landing
   component was split so both pages place the engine in their own frames
   (`map-engine.ts`); every option added for `/map` defaults to the landing's
   behaviour, checked by the landing's tests and byte-identical screenshots
   at 1280 and 360 px.
2. **The landing's figures.** Cash execution as reported to ANAF, ordonator
   principal, territorial executives, no exclusions (transfers and financing
   kept), the figures each primărie's own page shows. The page opens on the
   balance. The previous page opened on expenses with the analytics defaults.
3. **Controls kept:** the map (balance, income, expenses), the year
   (2016–2025), totals or per inhabitant, primării or counties, map or table.
   **Dropped:** the filter dialog (the map editor keeps it), the chart tab,
   the local-taxes preset, currency and inflation (lei as reported), the
   camera in the address.
4. **Layout: the map fills the window** under a slim bar (one row on a
   desktop, three on a phone), the legend on the map's lower-left corner; on
   a phone the map takes 62% of the screen height and the legend sits under it.
5. **Red–blue colours** (ColorBrewer RdBu, the landing's), not the navy
   choropleth DESIGN.md names for maps. Logged in DESIGN.md's decision log.
6. **No work-in-progress notice on `/map`**, so the map fills the window
   (`page-notice-scope.ts`).
7. **Old links open with what fits, silently.** The previous page's search
   (`filters`, `preset`, `mapViewType`, `activeView`, `mapCenter`, `mapZoom`;
   `entity_cuis` from the learning UAT finder) is read once: a preset or the
   account category picks the map, `per_capita`/`per_capita_euro` the count,
   a single report year the year, `County` the level, `table` the view.
   Everything else is dropped without a note — root had asked for a visible
   note; the owner chose silence. The page's own keys win over old ones, an
   unreadable value is the default, and the first change clears the old keys
   from the address (`lib/map-page-search.ts`).

## The county level

A county's figure is what the API returns at County granularity: every
territorial executive in the county, i.e. its primării **and its county
council**, summed as reported; in București, the six sectors and the capital's
own budget. Measured on the dev API (2025, income): Cluj 6.52 bn lei against
4.97 bn for its 81 primării; București 23.6 bn against 13.3 bn for the six
sectors. The legend's description, the tooltip („Primăriile și consiliul
județean") and the table rows say so.

**County balance classes.** The primării's balance is cut at ±3/±10/±20%. At
county level that left most counties in the neutral class. Measured over
2016–2025 on the dev API (420 county-years, 25 November 2026): the 5th–95th
percentiles of (income − expenses) / income run from −2.9% to +6.5%, the
quartiles −0.9% and +3.1%, the median +1.1%; the ±3% class held 16–39 of the
42 counties each year. The county balance is therefore cut at **±1/±3/±6%**
(`COUNTY_BALANCE_EDGES`, re-validate at full scale), the same seven colours;
the legend prints the edges, so the change of scale is visible. Per year at
the new edges, from <−6 to ≥6:

| Year | <−6 | −6…−3 | −3…−1 | −1…1 | 1…3 | 3…6 | ≥6 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2016 | 0 | 0 | 3 | 8 | 8 | 10 | 13 |
| 2019 | 5 | 6 | 13 | 10 | 6 | 2 | 0 |
| 2022 | 0 | 1 | 3 | 12 | 16 | 8 | 2 |
| 2025 | 0 | 1 | 8 | 21 | 10 | 2 | 0 |

## Per inhabitant

The server divides each year's amounts by a population of **the same year**:
INS's population by domicile on 1 January, a county's population being the sum
of its localities' (checked: Cluj, Timiș, Ilfov, every year). Implied by
total ÷ per-inhabitant on the dev API: Cluj-Napoca 322,007 (2016) → 325,408
(2025), Timișoara 333,360 → 296,936; 3,183 of 3,186 UATs differ between 2016
and 2025. București's own series differs slightly from its sectors' sum for
2016–2022, and a sector repeats a year (carry-forward), as the app's population
methodology note says. The source line says „populația după domiciliu la 1
ianuarie <an>, INS"; „după domiciliu" is why the figures sit above the 2021
census residents. The methodology note is behind the legend's „i".

## Years

The dev API answers 2016–2026; 2015 and earlier answer with no values. 2026 is
a year in progress and is left out of the picker.

## Caching

`/map` is sent `Cache-Control: private, no-store` and `CDN-Cache-Control:
no-store` (root, 25 November 2026), and its Nitro route cache is turned off in
`nitro.config.ts` (a separate change). The route cache stripped the cookie from
the request that rendered the page, so the server never saw the reader's
language or theme; the page's server render is only the bar and the map's
frame, so a shared copy saved little.

## Review (Codex gpt-6.2-sol, xhigh, 25 November 2026)

Round 1 found eight issues; seven were fixed (a malformed `?an=` crashed the
page; a new year's legend sat over the previous year's colours while it loaded
or failed; a label-points failure blocked the table; a failed stylesheet read
as „this browser cannot draw the map", with no retry; a stale tooltip after a
level switch; 0.95% printed „+1%" but coloured neutral; the canvas named
„Harta primăriilor" over the counties). The eighth is a residual below.

Round 2 checked the fixes. It found the half-way rounding fix overshooting
(2.9499…% printed „+2,9%" but coloured from 3): a figure is now classified
through `Intl` itself, on the same one-decimal rounding as the printed figure
(`roundTo` in `landing/lib/budget-map-format.ts`), tested on both sides of a
half-way value; the landing map's screenshots stay byte-identical. The table's
retry now asks again only for what the table reads. Its other two findings: the
Nitro route cache (turned off separately), and the label lag below.

## Polish (owner, 25 November 2026, second round; written 2026-11-25 12:45 UTC)

- **The bar looks like `/public-institutions`' controls:** square, a quiet
  border (`foreground/25`), the chosen option filled in the text's colour
  (`bg-foreground text-background`, inverted in dark), the others muted; the
  year reads „Anul: 2025" (the year alone on a phone, where the map's name
  needs the room). The landing's picker is squared from `/map`'s own frame;
  the landing is untouched.
- **The table sits in the site footer's frame** (`RuledFrame`: centred,
  `max-w-6xl`, its side rules): the search box and the pager keep to the
  frame's padding, the rows run the section's full width from rule to rule,
  their text on the same edges; square like the bar, numbers on one line,
  headers free to wrap. Tried on the way (owner): full width (the figures sat
  too far from their names), then a narrower `max-w-4xl` on the bar's left
  edge, then centred.
- **A „#" column gives each row's place** in the sort shown, among all the
  rows, so a search keeps each place (Cluj-Napoca keeps its rank); a row
  without the sorted figure shows „—". Its numbers start on the search box's
  left edge; the column is fixed to a five-figure place. Hidden on a phone.
- **Loading shows placeholder rows** shaped like the real ones (a name over
  its county, the figures, narrower on a phone), with a hidden status line
  for assistive tech, until both the figures and the level's shapes are in;
  „nothing matches" only after they are.
- **The pager is one quiet line under the table**, as on
  `/public-institutions`: „1–50 din 3.186" on the left, „Pagina 1 din 64" and
  two square arrows on the right (44 px under a finger, 32 px under a mouse);
  a turn that starts below the table's head brings the window, and the
  keyboard's focus, back to it. At 320 px a long range wraps the pager onto
  a second line. The shared `Pagination` card (first/last, numbered pages, „Mergi la") is
  gone from this page.
- **A phone shows two figures beside the name** (the round-1 residual): the
  sorted figure and the balance's percent, or the balance in lei beside the
  percent when the sort is by name, balance or percent.
- **Tried and withdrawn: labels and colours in the same frame** (the round-2
  residual). The attempt made the new fill wait for the labels' layout. Codex
  (round 3, gpt-6.2-sol xhigh) showed why that cannot work: the fill's colour
  is a data-driven `match` on each shape's code, so changing it makes MapLibre
  rebuild the shapes' tiles in its worker too (`Style._updatePaintProperty` →
  `requiresRelayout`), independently of the labels' rebuild; waiting for one
  before starting the other only swapped which one trails. The map stays as
  before. A real fix colours the shapes through feature state (no tile
  rebuild), a change to the shared engine and so to the landing.

## The site-wide rules (owner, 28 November 2026)

The owner asked for the national budget polish's site-wide rules on every page
the landing links to; for the map, only those rules, with its design kept
(relayed by client-dev-polish, `agent-sessions/landing-polish-20261128/SPEC.md`).

- **Round commas:** `[font-feature-settings:'ss03']` on the page's root, so
  the bar, the legend, the hover card and the table take Inter's round commas,
  „ș" and „ț", as on the landing. The picker's and the year's menus are
  portalled out of the page and keep the plain ones, as on the national budget.
- **A plain way home above the title** („Acasă / Hartă", 14 px, muted, the
  page's name in the text's colour; no arrow, no mono, no capitals), copied
  from the national budget's head. „Acasă" goes to `/` keeping only the
  address's `lang`, and is a 44 px target without growing its line. The owner
  chose it over two one-line versions („Acasă /" or „Acasă / Hartă" before the
  title), which kept the desktop bar's height but read less like the rest of the
  site. The bar is 8 px taller (65 → 73 px on a desktop, 161 → 169 px on a
  phone), and the map 8 px shorter.
- **Mono:** none to drop. The table's „#" column keeps its mono digits
  (figures that line up in a column, which DESIGN.md allows). „PROIECT" and
  „LEGAL" are the shared site footer's.
- No headline spacing: the map has no hero.

## Not done / open

- When the year changes while zoomed in, MapLibre may draw the previous
  year's amount labels for a frame or two after the new fill appears, until
  its worker has the new label data (Codex round 2; see the withdrawn attempt
  above).

- Individual primării are reachable by pointer and by the table, not by
  keyboard on the map (as on the landing).
- The landing's „Hartă" blurb (`landing-groups.ts`) still says „Cheltuielile
  fiecărei primării și ale fiecărui județ"; the page now opens on the balance.
- The unused heatmap hooks (`useHeatmapData`, the heatmap documents in
  `dataDiscovery.ts`) are left for a later cleanup, with the components no
  route reached even before the rewrite: `HeatmapDataTable`, the six
  `components/maps/charts/Uat*` charts, the Leaflet renderer and label code,
  and `useMapFilter`, which only they import (about 8,000 lines; the owner
  kept that cleanup out of this round).
- The shared map engine lives under `features/landing/`; moving it to a
  neutral folder is a separate change.
