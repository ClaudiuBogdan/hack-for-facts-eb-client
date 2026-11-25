# NB-002: Serve the population and GDP the national budget page divides by

**Status:** open (25 November 2026). **Priority:** P3. **Related:** `src/features/national-budget/home/lib/per-resident.ts`,
`docs/design/national-budget/design.md` §12.10 and §13. Filed by client-dev-polish on the owner's decision to ship the tables in the
client, labelled, rather than wait for the API.

## What the page needs

The citizens' page (`/national-budget`) shows public money per resident and the deficit as a share of GDP. The national budget API
serves neither denominator:

- **Resident population on 1 January,** 2006–2026 (INS, Tempo POP105A; Eurostat `demo_gind` JAN holds the same figures). Every
  per-resident amount on the page and on its share image is an amount over this population.
- **Annual GDP at current prices,** 2006–2025 (INS, Tempo CON111B; read from Eurostat `nama_10_gdp`, B1GQ, CP_MNAC). The bulletins
  print the deficit's share of GDP from 2019 on, but not in 2023's December bulletin, and print no GDP for the other years. For 2006–2018
  and 2023 the page divides the printed deficit by this GDP, and its note names those years.

## What ships meanwhile

Both series are static tables in `per-resident.ts`, each with its source and read date (population read 25 November 2026, 2026
provisional; GDP read 24 November 2026, 2025 provisional). The page's notes name the sources. A yearly update is a manual edit and a
unit test (`per-resident.test.ts`).

## The ask

Serve both series from the API with their vintage (release date, provisional flags), so the page reads them like the bulletins.
Then remove the tables. Open point recorded in §12.10: whether the share of GDP should use one method for every year. The two methods
differ by about a tenth of a point (2025: 7,65% printed, 7,56% computed).

## Until then: the yearly step

A year without its 1 January population is not offered (the menus skip it; an address asking for it, and its share card, open the default
year with a notice). When the first 2027 bulletin lands, 2027 stays out of the menus until INS publishes its 1 January 2027 population and the
table gets the row; the year-in-progress section is not affected (it doesn't divide by the population).

The row must land before that year's December bulletin: from then on the year is the default, and the bare page would open it without its
figures per resident.
