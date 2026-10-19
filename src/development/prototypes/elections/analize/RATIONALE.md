# Elections — the analysis page (`analize`, 2026-10-14)

Proposed live path `/elections/analytics`. Prototype `/development/elections/analize?v=clasament|cub|randuri`.
Rules: `docs/design/elections/design.md` §12.3 (data), §12.5 (Guidelines).

## The reader's questions, ranked

1. **What is in the data, and from which source?** Which elections, how many editions each, which offices, at which reporting levels, which rounds — and which calendar elections are missing. (This is what the API serves today: metadata only.)
2. **How much of a given election is reported, and where?** For one election: its editions side by side, the offices, the levels, the rounds; for one office: the counties and localities it is reported in.
3. **Find the rows.** A journalist who needs a contest key or a locality's row for 2024 wants the rows themselves, filtered as the API filters them.
4. _(Not answerable today)_ votes, turnout, winners, seats — nothing on the page pretends to.

## The variants

| Key         | Spine                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Argues                                                                                                                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clasament` | `/procurement/analytics` over the catalog snapshot: the question as the headline, the **scope types in the pinned bar**, three figures (+ places), axis tabs over a `Table` (Alegeri · Ediții · Funcții · Niveluri · Tururi · Județe · Localități · În timp), the years band 1990–2025 with the calendar's gaps, the source line, the sheet.                                                                                                           | The family's analysis page fits a catalog of metadata if the measures are chosen so that nothing adds across editions; the levels belong in the pinned bar because a SIRUTA row, a source-numbering row, a county roll-up and a national roll-up are four rows of maybe one race (§12.3 r3). |
| `cub`       | The same head/bar/figures/sheet; the answer is a **pivot** — one row per election (newest first), one column per office / level / round (`coloane`), each cell the reference edition's rows with a dot where other editions also report there; under it **„Ce acoperă datele"**: families × years against Transparenta.eu's calendar (in data · in the calendar but not in data · in data outside the calendar).                                       | Question 1 is a coverage question; a grid answers „what is there" faster than a ranking. The dot makes the edition overlap visible per cell instead of per note.                                                                                                                             |
| `randuri`   | The **finder**: opens on the newest election's reference edition; the pinned bar is **that election's editions** (the source choice made explicit, each with its own rows, never summed); the first tab lists the **rows themselves from the live API** (`electionContests` with `reportedOffices`, `scopeTypes`, `reportedRounds`, 20 a page, `pagina` in the address), each opening its contest or its place; the other tabs count the same edition. | Question 3; and a page that always stands on one edition can never double count. The election has no ✕ in the headline — it is the page's subject, changed from the menu at the top right.                                                                                                   |

All three share `model.ts`, `text.ts`, `parts.tsx`, `table.tsx`, `filters.tsx`; `cube.tsx` and `records.tsx` are the second and third spines.

## How each measure avoids double counting

The catalog overlaps: 9 elections have several editions describing the same race (local 2024 twice, local 2014 five times…). A sum over an election, a year or a family would count a race once per source. The page has exactly three measures, each defined so this cannot happen silently:

- **Ediții de date** — distinct `electionKey`s among the selected cells. An edition is counted once wherever it appears. On the Funcții/Niveluri/Tururi/Județe axes an edition can sit in several rows (it has several offices), so the page says „o ediție poate apărea pe mai multe rânduri: coloana nu se adună" and shows **no share and no „Restul"** there (`partitioned()` in `model.ts`).
- **Alegeri** — distinct `eventKey`s. Never derived from editions or rows. Share only by year (În timp) and by Alegeri itself.
- **Rânduri de scrutin** — rows counted on **one edition per election, the reference edition**: the edition the address names (`editie`), otherwise the election's edition with the most rows (`eventsOf` sorts them so; `referenceEdition()`). The figures band says which („în ediția bec-local-2024" / „pe ediția de referință a fiecărei alegeri"), the caveats marker lists the references, „Cum am numărat" prints them. Summing across _different_ elections is allowed (different races); summing across editions of one election never happens.
  - The **Ediții axis** is the one place every edition's own rows are shown — each on its row, no total, no share, the reference marked ✱ („rândurile fiecărei ediții, nu se adună").
  - An office that exists only in non-reference editions shows „—" with its reason, not 0.
  - Always „rânduri de scrutin", never races, mayors or localities (§12.3 r3). The one place count is **distinct SIRUTA codes** (a union, not a sum), and it is shown only where the snapshot can compute it exactly: the whole catalog (3,193), or one reference edition with no office/round filter (optionally one county, from `counties.fixture.json`). Elsewhere the figure is absent rather than wrong (the Localități tab computes the union in the browser from the place index; ask 9 would make it a server figure).
- **Județe** join on the **SIRUTA code of the reporting place → today's INS county** (`scripts/generate-elections-analize-counties.mjs`, 14 KB index), never on a source's county numbering (per-edition, §12.2) and never on names. Rows at the other scope types have no county and are left out of the county axis; the headline says „raportate pe localități din județul X" and the Niveluri tab disappears under a county filter. The 28 rows whose code is not in the INS list are a row of their own, not dropped.
- **Tip and an** are the event key's, never the edition's `reportedFamily` (wrong in 7 editions). The filter sheet and „+ Adaugă un filtru" offer only values that select something for the other filters kept (G6); `chamber` (0 rows) is never offered; a null round is the address value `neraportat`.
- **Years band / coverage grid**: a calendar election with no edition is a dashed empty slot „nu e în date", never a zero bar; the calendar is named as Transparenta.eu's (hand-kept, ask 12). The „2014" local editions appear under their reported year with the E1 note in the marker and as „în date, în afara calendarului" in the coverage grid.

## Address

`tip`, `an`, `alegere`, `editie`, `functie`, `nivel`, `tur`, `judet`, `dupa`, `masura`, `pagina` (+ `coloane` in `cub`). A value the catalog does not know is dropped; defaults leave the URL; `repaired()` keeps the set consistent (an edition implies its election, a county forces the locality level). Every control is `navigate()` with `resetScroll: false`; Back restores the previous question (checked with Playwright).

## Data findings (new, with evidence)

- `(edition, office, round, SIRUTA)` is unique over all 91,598 SIRUTA rows (0 duplicates) — a county cell's row count is its distinct places.
- 28 SIRUTA rows carry codes not in today's INS UAT list, 8 codes: `63171` (Băneasa, in 4 editions incl. both 2020 parliamentary), `179132` (all of București under a non-INS code, 2020 parliamentary — which label it „BUCUREŞTI SECTORUL 6", the name of 179196; `bec-local-1996` labels it „Municipiul BUCURESTI"), and in `bec-local-1996`: `10809`, `60605`, `82323`, `139973`, `146986` — probably older SIRUTA codes (merged/renamed UATs).
- Rows on the reference editions total **75,778** of the catalog's 105,340: the other 29,562 are the overlapping editions' rows.
- `bec-local-2024`'s three `tur2` rows are 2 × `local_election` (SIRUTA) + 1 × `mayor` (county roll-up): no mayor row per locality carries `tur2`, so a „mayor runoff" question answers nothing (E23).
- The 2024 ROAEP edition (167 rows) reports `county_council_or_cgmb` / `county_president_or_primar_general` etc. by county (41 each) and 2 `polling_station_results` per SIRUTA — a shape, not offices (ask 6).
- The API cannot filter a null round, nor rows by scope key (ask 10): the finder says so instead of listing a county's rows.

## Server asks this page adds to §12.4

- **Ask 9 (aggregates)**: `electionCatalogStats` filtered by event/family/year/office/scope/round, with a `distinctScopeKeys` count — the places figure would then exist for every question.
- **Ask 5 (grain)**: a canonical race key would let „Rânduri" become races and the reference-edition rule become a source selection.
- **Ask 10**: `sourceScopeKeys` filter on `electionContests`, so the finder can list a county's or a locality's rows.
- **Ask 8**: a stable county key per row (SIRUTA county) beside the edition's numbering.

## Copied from shared (said here as the brief asks)

`NotesMarker` in `parts.tsx` is a copy of `shared/parts.tsx`'s unexported `CaveatsMarker` (the analysis-page language puts the marker in the head's controls row, the source line stays without one).

## Open for the owner

- Which spine: the ranking (procurement's exact shape), the cube (coverage first) or the finder (rows first)? The finder's tabs could join the ranking as its first tab, as procurement's „Achiziții" tab did.
- Is „ediția de referință = cea cu cele mai multe rânduri" the right default until the API selects a source (E3), or should the page refuse a row total when an election has several editions and show rows only per edition?
- Should the Localități tab (browser-only, 1.2 MB index) ship, or wait for ask 10?
- The years band spans 1990–2025 with 36 bars; from `sm` down only every fifth year is labelled.
