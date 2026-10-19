# Elections front door — rationale (prototype `elections/hub`, 2026-10-14)

Four variants of the area's front door (proposed `/elections`), in the hubs'
language (design note §12.5 G1; worked example `src/features/justice/components/hub/`),
over the catalog the live API served on 2026-10-14 (`shared/catalog.fixture.json`).
Each: hero (lattice, kicker, two-line headline, computed lede, the elections/places
search, shortcuts, a panel suited to the idea, the one source line with the caveats
marker) → `HomeSectionNav` → `CatalogFigures` → numbered bands.

## The reader's questions, ranked

1. What election data exists, and are results in it? (No — said in the lede on every
   variant, computed from the fixture's readiness.)
2. Which elections are there, by year and type; which are missing?
3. What can I ask of one election — which offices, at which level, which rounds?
4. What is there for my locality?
5. Where will results stand when they come, and how will they be qualified?

## The variants

| Key          | Answers | Argues                                                             | Panel                                                                                                                 | Bands                                                                                                                                                                                                                    |
| ------------ | ------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cronologie` | 2       | A reader first wants the map of elections and the gaps             | the six most recent elections of our calendar, the absent ones said as „nu e în date"                                 | An de an (types × years grid; on phones years are rows) · Ce lipsește (calendar gaps and events outside the calendar) · Pe alegeri                                                                                       |
| `acoperire`  | 3       | A reader wants to know what each edition reports before opening it | editions per level / per round (toggle)                                                                               | Pe ediții (per election, per edition: offices, levels L N J S Ț, rounds, rows) · Funcțiile (office presence; source-table labels apart) · Niveluri și tururi (families × levels / rounds, editions counted) · Pe alegeri |
| `localitate` | 4       | A citizen arrives with a place, not an election                    | before a pick: the 6 largest reported places (INS 2021 population); after: the place, its elections, two icon actions | Localitatea (12 largest places, or the place's rows by election and edition) · Acoperirea (today's INS UATs each edition names) · Pe alegeri                                                                             |
| `rezultate`  | 5       | The door should already be shaped for results, honestly            | the API's own readiness, read from the fixture                                                                        | Pe alegeri (live) · Voturile · Prezența · Mandatele pe liste (sample, badge in each head)                                                                                                                                |

Headlines: „Alegerile, an de an" · „Ce e în date, alegere cu alegere" · „Alegerile din
localitatea ta" · „Voturile, prezența și mandatele".

## The data each figure uses, and why it is safe (§12.3)

- Lede: `catalogFacts` — events (platform groupings), editions, first/last year;
  „Rezultatele nu sunt încă publicate" only while `readiness.edition.results !== VERIFIED`.
- Figures band: the shared `CatalogFigures` (events, editions, rows said as „rânduri de
  scrutin", SIRUTA codes with the INS-named count).
- Timeline cell: the number of **editions** of the event in that family-year; a dashed
  cell is a calendar entry with no event („nu e în date", never „no election"); ✱ marks
  an event outside our calendar (1998 partial, „2014" local — E1 note kept in the gaps
  band and the marker) or a calendar entry only partly loaded (2007: 1 of 2 referendums).
  The calendar is `shared/calendar.ts`, said as Transparenta.eu's in the lede, the
  panel's footer, the band and the caveats (ask 12).
- Coverage rows: per **edition**, offices × scope types × rounds from the fixture's
  counts; the row count is the edition's own `contests`. Nothing is added across
  editions of an event; an event head says „n ediții, care nu se adună".
- Office presence: events (not editions) per office label; `officeLabel` null → the key
  verbatim in mono with „(etichetă din sursă)".
- Levels/rounds matrices and the `acoperire` panel: **editions** reporting at a level /
  in a round, per family (an edition counts once per level it reaches).
- Place coverage (`hub/places.coverage.json`, written by
  `scripts/generate-elections-hub-places.mjs` from the shared places fixture + INS
  UAT list): per edition, distinct SIRUTA codes and how many today's INS list names;
  the denominator (3,186) is said to be today's list. Largest places by `insPop2021`
  from `public/assets/geojson/uat.json` — an INS figure, not a hardcoded one.
- A place's rows: `[edition, office, round]` triples from the shared index, grouped by
  the edition's event; a SIRUTA scope is called „loc de raportare", and the note says a
  county president / parliamentary seat reported there is not the locality's race.
- Readiness panel: the five readiness fields of the fixture, with Romanian words
  (HELD → „reținut, de verificat", UNAVAILABLE → „nepublicat").
- Sample bands (`rezultate` only): constants in `hub/model.ts` with placeholder names
  („Partidul A", „Localitatea A", „Lista A"); summary separate from the paged competitor
  list (E17.b), every count with a status (unchecked / dq_suspect / validated, E17.d),
  share with its denominator named, turnout totals not summed across units of different
  status (E8/E9), seats as list allocations with the method named (E10), nobody „ales".

## Findings (new, with evidence)

- The shared places index names the six Bucharest sectors „București Sectorul n" and
  they carry 35 rows each (more than any municipiu: 29) — the sectors get CGMB rows on
  top of mayor/council. Rows for Cluj-Napoca (54975): 29 in 8 elections, 1996–2024.
- `aep-local-2020` and `bec-local-2020` each report 3,186 SIRUTA codes but only 3,185
  are in today's INS list; `aep/bec-parliamentary-2020` 3,181 / 3,179; `bec-local-1996`
  2,954 / 2,948 — codes outside today's list (merged or renamed UATs) exist in every
  pre-2024 edition. Shown as „n coduri în afara listei INS" in the coverage band.
- Only 16 of 50 editions report at locality level; 7 of them name all 3,186 UATs.
- Timeline: 42 calendar elections, 33 in the data, 9 absent (1990 ×2, 1991, 1992 local,
  2007 one referendum, 2009 referendum, 2024 European, 2024 presidential, 2025 rerun);
  2 events outside the calendar (1998 partial, „2014" local).

## Server asks (beyond §12.4)

- Ask 12 is what makes `cronologie` honest without a hand-kept calendar; ask 9 what
  lets `acoperire` and the figures read live instead of a generated snapshot; ask 10
  what makes `localitate` live (contests by `sourceScopeKey`).
- Population per SIRUTA (for „largest places") comes from the INS UAT geojson today;
  a served `insPopulation` on the place would spare the client the join.

## Deviations and notes for the lead

- No shared helper was edited; the shared `shoot.mjs` splits a name on the first `=`,
  which breaks on `?v=`, so a copy with last-`=` parsing sits in my scratch dir.
- The dev server served the new folder's arbitrary utilities
  (`sm:grid-cols-[10.5rem_minmax(0,1fr)_…]`) only some minutes after the files were
  written: the first 1440 screenshots showed the coverage rows in their phone layout
  while a fresh curl of `/src/index.css` already held the rule. A probe of the browser's
  stylesheet confirmed the rule and the computed columns afterwards. If a row looks
  stacked on a wide screen, reload once before blaming the code.
- `localitate` writes `loc` to the address through `useNavigate({ to: '.' })` (as the
  justice prototypes do) and reads it with `useSearch({ strict: false })`; the largest
  places link to `?v=localitate&loc=…` as plain hrefs.
- The `rezultate` sample bands carry `MockBadge` in the band head (the `aside` of
  `HubSectionHead`) once; the dashed frame and placeholder names mark the data itself.

## Open questions for the owner

1. Should the timeline's phone layout (years as rows, 5 short family columns) be kept,
   or should phones get the list form (the recent panel's rows, by year)?
2. In `acoperire`, is the per-edition table too much for the front door (it is the
   analysis page's job), or exactly what the door should show?
3. `localitate`: on a pick, should the page stay (panel + band change) or go straight
   to the locality page? Today it stays, with the icon action to the page.
4. `rezultate`: keep the three sample bands on the door at all, or only the readiness
   panel until results are served?
