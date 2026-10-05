# National budget — hub and analysis page (redo, 2 October 2026)

The owner rejected the first pair (`page.prototype.tsx`: „Panoramă" and
„Întrebări și dovezi", kept as a record) as „very bad" and asked for the
language of `/procurement`, `/ins`, `/ngos` and `/procurement/analytics`, with
complex data in a table like the analytics page's, its inner buttons and
components adapted.

## Two pages, as procurement has them

- **`national-budget/hub`, the front door** (`hub.page.tsx`), built like
  `/procurement`:
  - The head: the lattice, the corner ticks, the mono breadcrumb and the
    sample's mark. The headline is „Ce încasează statul / și pe ce cheltuie",
    then a one-sentence lede, the site's search scoped to institutions („Bugete"),
    and the shortcuts. The source line closes the head.
  - The hero panel: „Cine cheltuie cel mai mult, 2025", with a „Plătit | Propus"
    toggle. Plătit is ANAF payments, real, served today. Propus is the March
    2026 draft, marked „proiect". The two lists are never joined.
  - The pinned bar of numbered bands, then four figures: spending, revenue and
    the deficit of all public budgets in 2025 (the MF bulletin), and the state
    budget the 2025 law approved.
  - Four bands, in the hubs' two columns (head and computed lede on the left,
    toggle and rows on the right):
    - Pe ce: the spending titles, for all budgets or the state budget.
    - De unde: the revenue sources.
    - Legea: the law's four budgets, with the paid figure in a ruled note that
      says why the two don't compare.
    - În timp: the state budget year by year, Plătit (ANAF, 2016 to August 2026)
      or Aprobat (each law, with 2026 as a dashed draft).
  - „De aici poți începe": three ways into the analysis page.
- **`national-budget/analize`, the analysis page** (`analize.*.tsx`), built like
  `/procurement/analytics`:
  - The head: the way back, how recent the data is, the period menu, the
    question as the headline (its budget phrase opens the filters; a drilled
    line's phrase carries its ✕), Filtre, Întrebări, the link and the caveats
    marker.
  - The pinned bar of four populations, each with its icon: Cheltuieli,
    Venituri, Legea bugetului, Ministere.
  - Four figures, each within its own source.
  - The answer: tabs, the measure toggle and the level toggle over a table with
    #, name, Lei, % din PIB, and a share bar. A group row opens its lines, and
    every row carries an evidence icon (the cell, the printed token, the file,
    the hash). The law has two tables: its four budgets, and every law's plan
    for every year (one row per law, its own year bold, never merged). The
    ministries are a ranked table, each row linking to its entity page.
  - „Pe ani", the source line, and every filter in a sheet (right on a wide
    screen, bottom on a phone).

## What changed from the first pair

- The language is the hubs': `HomeSectionNav`, `HomeBand`, `HubSectionHead`,
  `HubFiguresBand`, `IndicatorToggle`, the lattice chrome, procurement's
  number formats and `filter-sheet-parts`, all reused rather than imitated.
- No invented values. The authority ranking is ANAF's real payments (55
  authorities, every year 2016 to 2026) or the draft's own list. The 2025
  synthetic list is not shown.
- The two sources stay apart. MF bulletin figures (all budgets and the state
  budget) and ANAF payments (the state budget) carry their own labels and
  data-through dates (July and August 2026).

## Rules kept from the handoff

- Edition and target year stay separate.
- Totals come from the printed total rows; rows are never added together.
- Law amounts are ×1,000 (thousand lei); execution values as declared.
- No rate of execution against the initial law.
- The consolidated budget has execution only.
- Authority codes are not CUIs.
- A blank source cell reads „gol în sursă", never zero.
- A missing year says why.

## Tables at any level add up

A level of the bulletin's tree is the lines at that depth plus the shallower
leaves (`cutRows`), so every table adds up to its total. Tested on both
releases, both budgets and every depth.
