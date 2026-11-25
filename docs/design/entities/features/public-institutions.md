# Feature: Public institutions page (`/public-institutions`)

**Status:** built on 2026-11-25, on branch `feat/entity-analytics-20261125` (not pushed) ·
**Prototype:** `/development/entities/analytics` (`yarn dev` only), variant `coloana` ·
**Code:** `src/features/public-institutions/`, routes `src/routes/public-institutions.tsx` and `.lazy.tsx`

Every public institution's expenses or income for a year, ranked, with what the
money was made of under the ranking. It replaces `/entity-analytics` in every
link; the old page stays, unlisted, for the links already out there and for its
full filter panel.

## Decisions (owner, 2026-11-25)

1. **Layout: one column, table first** (`coloana`). The ranking is the page; the
   breakdown (treemap and chapters) sits under it instead of behind a view
   switch; the filters, which few readers use, leave the page's left third for a
   sheet behind one „Filtre” button (right on a wide screen, from the bottom on a
   phone). Rejected: `alaturi` (table and breakdown side by side: the table lost
   the width it lacked, the treemap was cramped) and `panou` (the filter column
   kept, closed to a rail: two-column chrome for something few use, and a
   separate phone design).
2. **A new route, the old page kept.** `/public-institutions` carries the
   design; `/entity-analytics` is untouched in behaviour but unlisted: every link
   and path registry points to the new page (the deep links that carry a
   selection included: the new page reads the same address keys), and the old
   page's canonical points to the new one.
3. **Name: „Instituții publice”**, as the sidebar and the landing already said.
4. **The head** (in `/companies/analytics`'s language): the selection as the
   headline in a room of fixed height (the height measured equal across five
   selections, desktop and 360 px), one topic phrase with its ✕ when the
   selection names one chapter; then expenses or income, the year, total or per
   inhabitant, principal or detailed reports („Ordonator principal | Detaliat”,
   „Principal” on a phone); then „Filtre”, „Întrebări” (ten ready questions,
   kept as proposed), the link. The data's reach at the top right.
5. **The table:** no bars in the rows („keep it clean”); the county under the
   name; the amount it is ordered by always in view, a phone included; the
   change on the year before beside it on a wide screen; one footer line (rows,
   CSV of the whole list, pages).
6. **A figures band** under the pinned bar: the selection's amount, the change on
   the year before, how many institutions, the ten largest's share (per
   inhabitant: the selection's amount per inhabitant and its total).
7. **The breakdown:** one controls row (grouping, level of detail, transfers),
   the shared treemap, then every chapter with its exact amount. The transfers
   choice filters the treemap and the chapters together, so they always add up
   to the same total. It opens on „all” (owner), as the old page did.
8. **The treemap's look** (colours, the „Categorii principale” arrow) is the
   shared component's and is left as it is (owner: „leave it for now”).

## Data rules

- **One selection, two readers.** The route's loader and the page build their
  reads from the same function (`selectionOf`), from the address and the
  reader's preferences read from cookies, so the server's HTML holds the rows and
  the figures and the browser reads nothing twice.
- **Whose money.** `is_uat` returns town halls only (communes, towns,
  municipalities); the territorial executives (`is_territorial_executive`, the
  per-capita default) add the county councils. Checked on Sibiu and Cluj,
  2026-11-25: 145 against 147 rows, the two „JUDETUL” rows only in the second.
  The headline and the ready question say which.
- **Per inhabitant** is the API's own aggregate: the selection's amount over its
  territories' population, not a mean of rates (Cluj 2025: about 745,000 people).
- **A whole year** is one whose December report exists. A year two or more back,
  or the year just ended from April on, is whole without asking; the year just
  ended in January–March reads its December report; the year in progress reads
  its months (the last with an amount is the data's reach). Nothing is compared
  with a year that is not whole. The month reads are slow: they run after the
  ranking, in the browser (see the API request below).
- **Transfers** are the economic titles 51.01 and 51.02 (the entity page's
  rule). The entity page's income codes (functional 36.02.05, 37.02.03, 37.02.04,
  47.02.04) are not in the principal-level reports (all four sum to 0 in 2025),
  so income offers no transfers choice.
- **One kind of report.** With no report type named, the API adds every kind,
  counting a ministry and its subordinates twice; the page reads the principal
  officers' reports then. A secondary-report link reads those, presses neither
  switch option, and the source line names them.
- **Amount thresholds** choose institutions by their own sum. The selection's
  figures would apply them to the whole selection's sum and the breakdown to each
  chapter, so under a threshold the figures are not shown and the breakdown reads
  the same institutions without it, and says so. The breakdown always reads the
  ranking's scope: per inhabitant the API ranks the territorial executives only,
  whatever the address says (`executive = true` in the server's grouped read),
  and the page's words, figures and breakdown follow it.
- **Older links** still open: a period of months or several years hides the
  figures and the comparison; % of GDP presses neither measure, hides the
  figures and orders by its amount when the link asked per inhabitant or by
  population (the API refuses those); a growth flag is dropped (the page shows
  amounts); the euro aliases read in EUR; `view=line-items` opens at the
  breakdown, `treemapDepth=paragraph` at paragraph depth.

## API request (sent to root 2026-11-25, to be filed for the budget API)

How far the execution reports reach is derived today from `executionAnalytics`
with `MONTH` periods over the whole budget: one month took about 2 s and twelve
months 6–6.5 s on Chronos dev (measured 2026-11-25), so the page reads it after
the ranking, in the browser, and only when the calendar leaves it in doubt. A
cheap read would let the server send the data's date with the page, for example:

```graphql
budgetExecutionCoverage(reportType: BudgetReportType!, accountCategory: BudgetAccountCategory!): {
  latestMonth: String!        # "2026-10"
  completeYears: [Int!]!      # years whose December report is published
}
```

or the latest month per report type. Root's answer: no budget-API session is
active today; keep the deferred browser read, which is correct.

## What the new page leaves out (the old page keeps them)

The map and chart jumps of the floating quick nav, the page-size choice beyond
the footer's pages, table density and currency-format menus, column moving and
resizing, the amount-range slider on the treemap. Each can come back if asked.

## Checks

Desktop 1440 px and 360 px, on the dev API: no horizontal scroll, no script
errors; the server HTML holds 25 rows and the four figures; `Cache-Control:
private, no-store` (CACHE-001), also on the old page; English with the
`user-locale=en` cookie. Codex `gpt-6.2-sol` xhigh reviewed the change in two
rounds (2026-11-25).

Known and left: a reader whose saved currency in the browser differs from the
currency cookie gets one extra read after hydration (the old page behaves the
same); a page rendered just before 1 April UTC and hydrated just after can
change its coverage line once; a population bound may choose slightly different
institutions in the breakdown than in the ranking (the API compares the
breakdown with a territory's snapshot population, the ranking with the year's).
