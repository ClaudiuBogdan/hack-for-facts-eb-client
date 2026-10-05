# `national-budget/avansat`: the advanced analysis page, live

On 4 October 2026 the owner asked for two national budget pages:

- **the main page,** graphical, for almost every citizen (`hub`, next);
- **an analytics page** that analyses across years, months and the budget's
  dimensions: this one.

It reads the national budget API live (seven roots, Chronos development). It
keeps the procurement analytics page's language: a table of every number,
with that page's inner controls, adapted. The 5 October rounds (navigation,
budgets, layout stability) are in `docs/design/national-budget/design.md`
§8.

## Why each part is there

- **Five populations, because the data has two lanes.**
  - Cheltuieli, Venituri and Deficit read the MF bulletins.
  - Legea and Ministere read the laws.
  - A lane never shares a table with the other: the law is the plan as
    published, not the credits after rectifications, so there is no
    execution rate.
- **The bulletin is a cube: line × budget × period.**
  - Three filters: the line, the budget, the period.
  - Three tabs, each a slice of the cube:
    - *Pe categorii*: lines;
    - *Pe bugete*: budgets;
    - *În timp*: periods.
  - A row narrows its own filter. A budget row goes to its history and keeps
    the line; a line row goes to its history.
- **The lines are the bulletin's tree.**
  - A group is a section row above its lines, and folds in place.
  - Lines are ranked largest first within their group.
  - With the subtotal left out, each group equals the rows under it in the
    workbook years (tested against the live values).
- **The period is the bulletins' own.**
  - A year is the December release.
  - A quarter, or a month alone, is the server's audited difference.
  - A month from 1 January is the release's own figure.
  - One budget is read only as printed, from 1 January: it has no quarters
    and no month alone (server ask 11).
  - The page opens on the newest months, against the same months a year
    earlier: what a reader of the latest bulletin asks.
- **Finding things.**
  - „Caută" (`/`, Ctrl/⌘ K) opens the contents in a side panel, like the
    filters: every line, budget, chapter, ministry and question. The filter
    matches word starts without diacritics, and the current place is marked.
  - Back undoes each choice: every view is a history entry.
- **The page doesn't move under the reader.**
  - The headline fits a box of one height.
  - The figures keep a set number of caption lines.
  - A choice keeps the last answer on screen (dimmed) until the next one is
    read.
  - Each tab's controls sit on one row of one height.
  - Table headers stick under the bar (CSS `sticky`; the period matrix has a
    strip that follows it sideways).
- **Every number at once, with its evidence.**
  - Lei, % of GDP, share, change and the line's years in one table.
  - The active row and column of a table are framed by a blue line, so the
    eye can follow them.
  - Each value's icon reads that one cell: its exact amount, what it covers,
    the release(s) and cell it came from, the file and its SHA-256.
  - A gap stays a gap, with the server's reason.
- **One source line, one caveats marker,** amber when something needs care:
  a PDF year, one budget read from 1 January, the law without
  rectifications.

## Files

- `avansat.prototype.tsx`: the variant.
- `avansat.page.tsx`: the head, the bar, the bands (figures, answer, years,
  source), and how they stay in place.
- `avansat.execution.tsx`: lines, time, the period matrix.
- `avansat.budgets.tsx`: the budgets tab and one budget's lines, time and
  years.
- `avansat.law.tsx`: funds, chapters, laws, authorities.
- `avansat.nav.tsx`: the contents panel and its search.
- `avansat.controls.tsx`: the period menu, the answer bar and its pickers,
  filters, questions, the trail.
- `avansat.chart.tsx`: bars with gaps and negatives.
- `avansat.parts.tsx`: share, change, spark, evidence, sticky headers, active
  edges.
- `avansat.state.ts`: the address.
- `avansat.view.ts`: the words.

The live layer is `src/features/national-budget/analytics/` (`api/`,
`hooks/`, `lib/`), and the wire schemas are in
`src/schemas/national-budget-api.ts`.
