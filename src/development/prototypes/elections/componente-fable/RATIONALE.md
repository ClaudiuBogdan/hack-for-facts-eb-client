# Componente vizuale — the Fable pass

A polish pass over the `componente` gallery (copied to `componente-fable/`).
Same 24 variants, same five groups, same numbers and grouping (`model.ts` is
untouched); only how each one reads. Everything derived for display (national
swing, folded-party lists, leader counts) is computed in code from the fixtures.

## Shared (kit.tsx)

- **Caveats behind one marker.** `Option` no longer prints a grey paragraph
  under every chart. It takes `foot` (one short line of plain facts: counts,
  scope) and `notes` (an array of caveats) and renders the shared amber
  `CaveatsMarker` from `shared/parts` — the same affordance as the page header.
  Every caveat's content was kept (reworded into one sentence each, some moved
  from the chart body into the notes). Where a variant has no foot, the marker
  sits after „Despre date" so it never floats alone.
- **One tooltip.** `useTip` / `TipBox`: a hover panel of the same shape for the
  hand-drawn charts (100% columns, waffles, county tiles, histograms,
  candidates bars, place-kind bars, county dumbbells). The line chart and the
  map keep their own panels in the same style.
- **Line chart labels.** `earlyLabels: 'point'` labels a line that stops before
  the last year at its last point, on a background box (a 1.5 px halo cannot
  hide a 2.25 px line crossing a label), spread per column so they never
  overlap; lines that reach the last year keep the right-edge stack with short
  leaders. The right margin is sized from the longest edge label; on a phone
  the „(year)" suffix is dropped. The x-axis spaces years from the last year
  _drawn_ (the old filter compared to the previous year, so a dense axis showed
  only 1992). A zero gridline is slightly darker.
- **Percentages.** `usePct` never renders a false zero: a positive value that
  would round to 0 prints as „<1 %" / „<0,1 %". Rule per unit: axes and labels
  inside bars round to whole points; readouts beside a name keep one decimal;
  the vote-gap share in the closest races keeps two (a 1-vote gap is 0,02 %).
- **Maps.** `ClassMap` lays the legend (vertical, titled) and any `aside`
  beside the map from `lg`, so a map is ~610 px tall at 1440 instead of
  ~1,100; on a phone the legend follows the map at full width. A caller can
  pass its own `legend` renderer. The hover panel flips left near the right
  edge.
- **Legend** gained a vertical direction, a title, and a hollow-ring item for
  the „suspect / identified-parties" circle convention.
- Shared constants for axis text, gridlines and figure captions so all charts
  use the same 11 px tabular axis style.

## Evoluția partidelor

- **A (lines).** Early-ending Chamber lines (PDL 2008, ALDE 2016) are labelled
  at their last point; no leader crosses the hatched 2024 gap. The mayors chart
  is split into a main panel (PSD, PNL, UDMR) and a second panel „sub 100 de
  primării, altă scară" for the eight small lines that were crushed near zero
  (threshold is presentation only; lines under 10 mayors stay in B). The gap
  caption now sits above the hatched band instead of inside the plot. A small
  legend explains the hollow 2016 circle and the hatched gap.
- **B (100% columns).** A legend per figure listing every line present; hover
  names each slice with its share (and count for mayors); the column foot
  states the whole (votes / mayors) instead of only for mayors.
- **C (cards).** Correct missing/new semantics: a change when both editions
  are in the data; „prima dată în date" only when the previous is missing and
  the current exists (AUR, PRO); „nu e în date" when the current is missing
  (ALDE Chamber 2020); mayors absent from the reported mandate list read „nu
  apare separat" (they may have run in an alliance), never „nicio primărie".
  Later (owner, 2026-10-19) the cards became three per row with a small bar
  chart per measure and the change moved into a tooltip table.
- **D (gains/losses).** Since the review (2026-10-19) only lines both years
  name are drawn; a line in one year only is listed under the bars with its
  one value, never drawn as a gain or loss from zero.
- **E (rank).** Every node is identifiable: a line's last node names it
  (with the year when it leaves before 2024: „ALDE (2016)", „PMP (2020)"…);
  on a phone the middle-column names sit under the node so they do not run into
  the next column. Dotted rank rows, hover on each circle.

## Mandatele

- **A/B/E (waffles).** Hover on any square names the party with its count and
  share. The legend lists every line with a mandate (not only those ≥0.4 %), so
  a line too small for a square is still accounted for, and the rounding caveat
  says so. B keeps three columns on a phone (small squares) rather than three
  screen-tall blocks.
- **C (hemicycle).** The legend lists every line drawn — the two USR seats
  that produced an unexplained blue dot are now in it („USR 2 · <1 %"). Each
  dot carries a title.
- **D (county tiles).** A side panel from `lg`: a titled legend with the number
  of counties each party leads, the explanation of the bar and the white dot,
  and the list of the nine counties where the first party changed since 2020
  (with swatches, screen-reader text). Hover panel per tile. The note that was
  prose under the grid is now the foot + three caveats.

## Hărți

- **A (strength).** Legend beside the map, titled with party and year.
- **B (swing).** A real diverging scale: losses in a hue the party does not
  own (its rough complement: PSD → steel blue, PNL → indigo, USR → orange,
  UDMR → magenta, PMP → brown), gains in the party colour, both graded in three
  steps (3–10, 10–20, >20 pp) around a neutral ±3 band. A toggle „Față de media
  națională" shows the swing minus the party's votes-weighted swing over the
  same UATs (computed in code from the per-UAT fixture; shown in the side
  panel: PSD −16,5 pp), which is what makes the PSD map readable.
- **C (flips).** A toggle „Doar cele schimbate" (kept mayors become one pale
  neutral class) and a grouped legend: one row per party with „schimbat" and
  „păstrat" counts, instead of 15 flat entries. The headline count moved beside
  the toggle.
- **D (Sankey).** Node titles, a legend for full vs pale bands, narrower label
  gutters on a phone.
- **E (turnout change)** keeps the choropleth blues for the decline but the
  rise is green; **F (margins)** moved to a hot red-orange sequential (tight
  = deep), single candidate in neutral dark — the two no longer share a palette.

## Prezența

- **A (history).** Edge labels no longer clip (margin from the longest label);
  hollow-circle legend.
- **B (dumbbells).** Hover per county with all three values; narrower name
  column on a phone.
- **C (histogram).** Hover per 2.5-point band with both years' counts.
- **D (diaspora).** One-decimal readouts (30,1 % / 3,4 %), totals of each side
  in the header, the growth factor computed. UDMR's abroad value is **not**
  shown as 0 %: the diaspora tally lists the largest parties and folds the
  rest into `~other`, so a line missing there is hatched and labelled „în
  «alte»" with a caveat.
- **E (place kinds).** Legend swatches carry the same opacity as the bars.

## Cursele

- **A (margins).** The „Alte partide" legend entry names what it holds (AUR 30,
  ADU 28, PSD+PNL 27, USR 10, alte 33), computed from the data; the x axis now
  ends at „100 pp"; hover per band lists the parties.
- **B (closest races).** Unchanged apart from a blank gap-share for ties.
- **C (candidates).** Off-palette blue replaced with neutral greys (single
  candidate darker, as the question says); hover with share; axis caption.
- **D (place kinds).** Hover per slice; the mayors legend names the folded
  parties.

## Gallery

- The group nav now links within `componente-fable`.

## Noticed, not fixed

- The dev server's Tailwind JIT did pick up every new arbitrary colour, so
  nothing is pending a restart.
- The hemicycle still draws independents/other in grey at the end of the arc;
  a true parliament picture would order by bloc, but there is no bloc data.
- Sankey nodes under 9 px tall have no text label (title only); a phone-width
  Sankey is still dense.
- The county tile grid's hover tip is the only reading of the top-three bar;
  the bar has no legend of its own beyond the mono note.
- `IndicatorToggle` wraps awkwardly for „PRO România" at 390 px.

## Numbers worth a second look (not changed)

- National PSD swing from the per-UAT rows (votes-weighted, UATs with both
  years) is −16,5 pp, while the national tally in Evoluția D gives −17,1 pp —
  the 2016 „linked parties" basis explains most of it, but worth confirming.
- Cursele A counts PSD+PNL 27 wins while Cursele D (which excludes București
  and ties) counts 24; Mandatele counts 24 PSD+PNL mayors. The three are
  different scopes (all UATs vs. kinds R/M/O/C) — fine if intended.
- Mandatele C: USR has 2 county-council seats in the tally; plausible but
  tiny.
