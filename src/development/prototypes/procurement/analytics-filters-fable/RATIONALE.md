# The filters sheet, improved — rationale (Fable, 30 September 2026)

Prototype: `/development/procurement/analytics-filters-fable` — `?v=actual` is the
page's own `FilterSheet`, imported unchanged; `?v=grupat` is the improvement. Both
open on the real hooks (`useAnswer`, `useNamer`, `useCounties`, the map's files, the
site's search), hold the real `Query` in the harness's address (the page's own keys
beside `v`, written as the page writes them), and show the live count in the footer.
The model, the hooks and the text helpers are the feature's; nothing under
`src/features/` changed.

## Problems found in the current sheet

Measured on the live page at 1440×900 and 390×844 (screenshots in the session's
scratchpad, `fable-filters/baseline-*.png`), and on the data behind it.

1. **The place is three widgets in a fixed order.** A region select, a county select,
   and a locality search that exists only once a county is chosen. A reader who knows
   the town must first know its county.
2. **Locality search misses what readers type.** It lowercases and `includes`:
   „salcioara" does not find „Sălcioara" (1 855 of 3 186 UAT names carry diacritics);
   „sector 3" does not find „București Sectorul 3".
3. **Repeated names have no county beside them.** 257 of 2 802 UAT names occur in
   more than one county (Fântânele in seven; Sălcioara in Dâmbovița and Ialomița).
4. **Nothing says the level.** A picked county sits in a select beside „Toate
   regiunile"; widening it means knowing that „Toate județele" returns to the region.
5. **Ten heads for seven ideas.** INSTITUȚIA / LOCUL INSTITUȚIEI / FIRMA / LOCUL FIRMEI
   are two pairs shown as four sections; TITLUL CONȚINE and VALOAREA are two more.
   The panel needs a scroll at 900 px.
6. **The months read in the browser's language.** `<input type="month">` shows
   „June 2025" with a calendar glyph inside a Romanian UI.
7. **Ragged and wrapped controls.** Eleven years in four columns leave a three-cell
   last row; „Contracte atribuite" and „Acorduri-cadru" wrap to two lines.
8. **Two clears for one value.** A section's „✕ Șterge" beside the chip's own ✕.
9. **The 3 MB UAT file loads only after a county is chosen,** and while it loads a
   typed name shows „…", which reads as nothing at all; a failed read shows the same.
10. **Phone:** the result list under a search input can sit beneath the on-screen
    keyboard; nothing brings the input up.

## What changed, and why

Ranked by what it buys the reader.

1. **One place picker per party** (`places.ts`, `PlaceRow` in `sheet.tsx`).
   - One input, „Regiune, județ sau localitate". Typing searches the three levels at
     once, without diacritics and by word prefix („salcioara", „CJ", „sector 3",
     „cluj nap"). Results are lists under their level's head — REGIUNI / JUDEȚE /
     LOCALITĂȚI — with bare names, a kind tag where a locality has one (REȘEDINȚĂ,
     MUNICIPIU, ORAȘ, SECTOR; a commune carries none) and the county beside a
     locality when the search runs wider than one county.
   - Before a word is typed the field offers what the scope holds: the eight regions,
     then a region's counties, as a two-column grid of whole buttons under a REGIUNI /
     JUDEȚE head; a county's ten largest places as a list. Region → county → locality
     is three taps with no typing; a pick keeps the list open on the next level down.
   - **The picked place is its path in the chip**, each name with its kind first:
     `Reg. Centru › Jud. Sibiu › UAT Sibiu`. The crumbs before the last widen the
     filter to themselves; the ✕ removes it. A path the chip cannot hold on one line
     (221 px beside the label column) wraps to a second line with every name whole —
     an ellipsis on three crumbs was tried and read as three unknowns; only a single
     name longer than the line is cut. The full path is the chip's tooltip.
   - Ranking: exact name, then name start, then every typed word a word prefix, then a
     word inside; ties by INS 2021 population, then name.
   - The URL model is untouched: one filter per axis at the finest level, the same six
     keys. The drive script (`fable-filters/drive.mjs`) checks every transition by
     clicks: `regiune=Nord-Vest` → `judet=CJ` → `localitate=54975` → crumb → `judet=CJ`
     → crumb → `regiune=Nord-Vest` → ✕ → none; Enter on „salcioara" → `localitate=68789`.
2. **Five heads for five questions.** ÎNREGISTRĂRI · PERIOADA · CINE CUMPĂRĂ · CINE
   VINDE · CE CUMPĂRĂ — the design doc's own rows (§18.2, who buys / who sells). Each
   row is a label and one control (Instituția / Locul; Firma / Locul; Categoria /
   Procedura / Titlul / Valoarea). The label column is what tells two rows of one
   group apart, so no fact is repeated in a head.
3. **A value set is a chip, a value unset an input** — for every row alike: the
   institution, the place, the category, the title („laptop") and the value range (in
   the headline's own words, `headlineParts`: „între 1.000 lei și 50.000 lei"). Each
   chip has its ✕ (a 40 px target); the per-section „Șterge" is gone. The header
   carries the count the „Filtre" button carries.
4. **Months in the page's language** (`month-field.tsx`): two buttons, „iun. 2025" –
   „mai 2026", each opening a twelve-month grid under a year stepper, clamped to
   2007-01 … the population's cutoff. When the period is a year or the last twelve
   months, the buttons show the resolved months muted. Picking a start after the end
   (or an end before the start) collapses the range to that month.
5. **The recent years first.** Four years (2026 … 2023) in one row of four; „Arată
   mai multe" (the site's `SHOW_MORE_CLASS`) opens the rest, „Arată mai puține" folds
   them. A picked year outside the four keeps the list open. „Ultimele 12 luni" and
   the months row are as they were.
6. **No small buttons.** Every tap target in the sheet is 40 px tall from `sm` and
   44 px on a phone (`TALL`): inputs, chips and their ✕, the toggle's buttons, the
   years, the month buttons and the month grid's cells, the region and county grids,
   every list row, the procedure select, the CPV path's steps, the footer. The toggle
   uses the records' tab words (Achiziții / Contracte / Acorduri-cadru) so the three
   fit one line at 352 px and at 358 px; its own `sm:flex` is overridden to `sm:grid`
   (it left a fourth, empty cell).
7. **Every list says what it is doing** (`Notice`). While a read runs: „Se caută…"
   for the institution, firm and category searches, „Se încarcă localitățile…" for
   the map's file, „Se încarcă regiunile și județele…" for the API's list — each with
   a small spinner and `role="status"`. When a read fails: „Căutarea nu a mers." /
   „Localitățile nu s-au încărcat." / „Regiunile și județele nu s-au încărcat." with
   „Încearcă din nou", `role="alert"`, running the same read again (`refetch`; the
   site's search hook has none, so its query key is refetched through the client). A
   failed map file leaves the regions and counties standing — they come from the API
   read. Nothing matched: „Nimic pentru „xyz"." Under the minimum (three letters for
   the site's search and the categories, two for places) nothing is shown, never a
   list that looks like it is reading. The last answer stays on screen while the next
   is read (the search hook keeps its stale results; the category read is kept in
   the row), so typing does not flicker.
8. **The UAT file loads on focus**, not on a county pick. On a phone a focused search
   field moves to the top of the sheet's scroll area so its list sits above the
   keyboard. The panel adds room below itself while a search is focused (measured: the
   firm's field could only scroll 207 px of the 535 it needed, and its list fell under
   the keyboard). The sheet's own close is a 44 px target on a phone, its focus ring
   for the keyboard only (`closeClassName`, new on `SheetContent`).

Kept as they were: the MonoLabel heads, the square borders, the IndicatorToggle, the
sheet (right at `sm:max-w-sm`, bottom at 90vh on a phone), the footer with „Șterge
tot" and „Arată N", the CPV path with its steps back up, the procedure select, the
site's institution/firm search with the CUI-as-typed row, Enter picking the first hit.

## The owner's decisions (30 September 2026)

- **Full names with the kind as a prefix** — „Reg. Centru", „Jud. Sibiu". A locality
  carries its official kind: „Municipiul Sibiu", „Orașul Miercurea Sibiului", „Comuna
  Poiana Sibiului" (a county seat is a municipality too); a sector under București is
  „Sectorul 3", the path above it naming the city; a kind the map's file does not give
  falls back to „UAT". București at the county level is „Municipiul București". The
  API's „Bucuresti-Ilfov" is shown as „București-Ilfov"; the URL keeps the API's
  spelling.
- **Then, in the lists, no prefix**: „given that we have the label separator, I will
  drop the UAT prefix". Applied to every grouped list and browse grid (REGIUNI, JUDEȚE,
  LOCALITĂȚI heads name the level), and, by the same reasoning, to „Reg." and „Jud."
  in those lists — confirmed by the owner („yes, it's ok"). The prefixes stay in the path chip, where
  nothing else names the level: „Reg. Centru › Jud. Sibiu › Municipiul Sibiu".
- **The county's own code is offered in no list** („exclude county council from the
  list"): picking the county covers those institutions. A link that carries one
  (`localitate=127`) still renders as a chip, „Reg. Nord-Vest › Jud. Cluj › Jud. Cluj
  (instituțiile județului)", with no tag or tooltip.
- **Only the recent years by default**, with a show-more; **no small buttons**, the
  region chips in particular; **the stray `{}`** under the harness's Filtre button is
  gone.
- **Loading and failed states in words**, with retry, for every list that waits on a
  read.
- **The month grid opens on the picked month's year** (as built).
- **Arrow keys in every list** („if we can do it would be great"): each search field
  is a combobox — ArrowDown and ArrowUp move the active row (the field keeps the focus
  and the caret, so Home, End and Space stay the text's), Enter picks it, and with no
  row active Enter still picks the first. The region and county grids take the same
  keys. The site's `useListKeyboardNavigation` was not used: it takes Space as a pick,
  which would eat the space in „sector 3".

## Considered and rejected

- **A drill-in sub-screen for the place** (tap the row, the sheet's content becomes a
  full-height picker with a pinned search and back arrow). Genuinely different, and
  better with a phone keyboard — but it adds a step to every pick, hides the rest of
  the query while choosing, and is a modal inside a modal. The inline combobox with
  the browse grid covers the reader who does not know the name, and the scroll-on-
  focus covers the keyboard. Not built.
- **Three cascading selects** (region, county, a locality select of up to 111 rows).
  The same shape as today with a longer third select; does not solve typing a place.
- **Region buttons always visible** under each place row: ~180 px per party at rest,
  against the goal of a shorter panel. Shown on focus instead.
- **Tight wrapping chips for the regions** (the first cut): too small a target and
  an ellipsis on „Sud-Vest Oltenia". Replaced by the two-column grid of whole buttons
  that wrap to a second line.
- **Four selects for the months** (month + year, twice) and **a 125-row month select**:
  heavy, and the page's own period picker is already a grid.
- **Icons instead of row labels** (a building for the institution, a pin for the
  place): they would have to carry the level, which words do better.
- **A cmdk `Command` list** for keyboard navigation: it brings its own rounded
  styling and a second list vocabulary next to the sheet's plain lists. Enter picks
  the first result today; arrow keys are a follow-up either way.
- **Hiding the place row when an institution is picked** (its seat is one place): a
  filter in the URL would then be invisible. Left visible.
- **A skeleton or the site's pulse for loading lists**: a row of text with a spinner
  says what is read and is announced; a pulse says nothing to a screen reader.

## What would need the API or the model

- **Locality names from the API.** The picker reads 3.2 MB of GeoJSON to search 3 186
  names. A `referenceLocalities` read (SIRUTA, name, kind, county, population) — or a
  search endpoint like `procurementCpvCodes` — would make the field instant
  (design.md §18.6 item 10 already asks for the names).
- **`useLocalities` builds its Map on every render.** The prototype builds its index
  from `useGeoJsonData` directly and memoises on the file's identity; a promoted
  picker should either live next to a memoised `useLocalities` or replace it.
- **A retry for the site's search hook.** `useSearchResults` exposes a status but no
  `refetch`; the sheet refetches its query key through the client. Exposing one would
  be cleaner.
- **A debounce and a placeholder for `useCpvSearch`.** It reads on every keystroke
  from three letters and drops its data between terms; the row keeps the last answer
  itself.
- **Group-by after a filter from the sheet.** `withFilter` keeps the current group-by,
  so a place picked in the sheet writes `dupa=categorie` (the baseline does the same);
  the same URL typed by hand opens „pe instituții". `withTitle` already follows the
  question when the reader has not chosen a grouping — the same rule for filters is a
  model change, not a UI one.

## Open questions for the owner

1. ~~„Reg." and „Jud." dropped inside the lists along with „UAT"?~~ Decided: yes,
   no prefix inside the lists.
2. ~~The chip's last crumb~~ Decided: the official kind, „Municipiul Sibiu",
   „Orașul …", „Comuna …".
3. ~~„Mun." or „Jud. București"~~ Decided: „Municipiul București".
4. Should a place picked in the sheet move the grouping to the filters' own next
   question (as a title does), or keep the reader's current grouping (as today)?
   Asked again, with an example.
5. ~~The month grid's year~~ Decided: the picked month's year, as built.
6. ~~Arrow keys~~ Decided: built.
