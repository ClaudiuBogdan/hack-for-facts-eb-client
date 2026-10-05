# National budget: the advanced analysis page, live (ready for review)

Worktree `.claude/worktrees/national-budget` (branch `national-budget`), client
session `21f83041-c36c-4126-a4f3-e7540e5f03ca`. Written 4 October 2026, after
the server's national budget API went live on Chronos development.

**What the owner asked:** split the national budget into a main page for
citizens (graphical) and a dedicated analytics page that analyses across
years, months and the budget's dimensions; continue on the analytics page.

## URL

https://zeus-agents-01.basa-discus.ts.net:3008/development/national-budget/avansat?v=avansat

| View | Add to the URL |
|---|---|
| Spending by line, January–July 2026 against 2025 | — |
| The budgets and the bridge to the consolidated budget | `&dupa=bugete` |
| The deficit month by month | `&tip=sold&dupa=timp&pas=luna&cumulat=false` |
| VAT by quarter | `&tip=venituri&dupa=timp&pas=trimestru&rand=revenue.vat` |
| Interest, year by year | `&dupa=timp&rand=expenditure.interest` |
| Revenue, the whole tree | `&tip=venituri&nivel=9` |
| The law's funds and forecasts | `&tip=lege` |
| The law's chapters (open one), or titles | `&tip=lege&dupa=capitole` (`&clasificare=titluri`) |
| Law after law | `&tip=lege&dupa=legi` (`&fond=sanatate`, `&linie=venituri`) |
| Ministries in the law; one opened | `&tip=ministere`; `&rand=25` |
| A year with no comparable bulletin | `&perioada=2011` |
| The prototype's states | `&demo=loading`, `&demo=error` |

The ready questions (menu „Întrebări") are links to such views.

## What is real

Everything on the page except the ANAF payments tab is read live from the
national budget API, through the dev proxy:

- the MF bulletins, January 2006 – July 2026, 241 of 247 months;
- the laws 2017–2025, each with its forecasts.

The ANAF payments tab (*Ministere › Plătit*) is the labelled snapshot of 2
October. Nothing is mocked or invented. A missing value says why, with the
server's reason.

## Files (all new, untracked)

- **Live layer:** `src/features/national-budget/analytics/`
  - `api/national-budget-api.ts`, `api/national-budget-queries.ts`: the
    transport and the documents;
  - `hooks/use-national-budget-analytics.ts`: queries keyed by lane snapshot;
  - `lib/series.ts` (the handoff's `toAnalyticsSeries`, periods), `lib/exact.ts`
    (exact decimals), `lib/lines.ts` (the bulletin's tree, for display only);
  - `lib/analytics-lib.test.ts` and `lib/bgc-full-year.fixture.json` (live
    values 2019–2025 for the tree test).
- **Wire schemas:** `src/schemas/national-budget-api.ts`.
- **Prototype:** `src/development/prototypes/national-budget/avansat.*`, with
  its anatomy in `avansat.RATIONALE.md`.
- **Decisions, findings and server asks 9–14:**
  `docs/design/national-budget/design.md` §7.
- **Screenshots:** `screenshots/` here, 12 views at 1440 and 390 px.

Every earlier prototype (`page`, `hub`, `analize`) is unchanged and kept.

## Checks

| Check | Result |
|---|---|
| `yarn run check` | pass (41 s) |
| Vitest `src/features/national-budget` | 106 pass. New: the series adapter (the handoff's worked example; gaps; `[]`), exact decimals, periods, and the tree against live 2019–2025 values (every level and every opened line adds up). |
| SSR (server HTML) | 11/11 views carry their answer, in 0.8–2 s; the law's titles 1.1 s, a ministry's drill ~4 s |
| Interaction (Playwright) | 26/26 pass, no page errors. Covered: level, drill and ✕, evidence by keyboard, a line to its time tab, 36 months, the month alone, a bar by keyboard, a gap with its reason, the period menu (a year without a bulletin disabled), the budgets bridge, the law's funds, chapters, revenue and laws, the law-year menu, a ministry opened and closed, the ANAF tab, the filter sheet, a ready question, a failed band. |
| Accessibility (`scripts/audit-page.mjs`, light and dark) | 0 violations in 8 views |
| Layout | 24 renders at 1440 and 390 px: no horizontal scroll, no console errors |
| Tailnet URL | 200 |

**Not run:**

- The Opus 5.5 and Codex reviews: this is a prototype, with no commit. The
  full gate applies before the live adapter is committed, since it is a new
  API adapter.
- Playwright integration against a mocked API: no route yet.

## Bugs found and fixed on the way

- **Dates order.** The server wants listed dates unique and ascending; the
  transport now sorts them.
- **Credit types on revenue.** A revenue-only totals read refuses credit types;
  the transport now leaves them out.
- **GDP shares.** The share observations carry no catalog item; they are now
  matched by label.
- **Stale band errors.** A band's error outlived its view; the bands are now
  keyed by the view.
- **Covered cells.** A matrix cell passing under the pinned names read as a
  smaller number („14,2" for 114,2). The pinned column now has a rule and a
  shadow.

## Tradeoffs and open points

- **Default period:** the newest months from 1 January (January–July 2026),
  against the same months of 2025. A full year is one click in the period
  menu.
- **Exact decimals:** local helpers with `dev`'s shapes. The fast-forward to
  `dev`, which has `src/lib/exact-decimal.ts`, was blocked in this session, so
  they are swapped at promotion.
- **A ministry's drill takes ~4 s** (three record pages in sequence). Server
  ask 9 (a level filter) would make it one page.
- **Ministries compare within a law only:** codes belong to an edition (ask 13).
- **The citizens' page** (`hub`) is to become graphical next.
