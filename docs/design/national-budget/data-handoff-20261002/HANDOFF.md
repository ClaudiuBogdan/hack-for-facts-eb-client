# National budget page: data and prototype handoff

Prepared on 2 October 2026 for the existing Zeus client session `national-budget`, UUID `21f83041-c36c-4126-a4f3-e7540e5f03ca`. This package supports mock design; it is not a deployed API contract.

**User decision:** one national budget page, keep the explorer separate, and build both variants. Preserve the prototypes for comparison.

## Available data

### Reviewed approved budgets

A read-only Chronos production check confirmed **2019–2025, with 180,507 lines** in `budget.approved_budget_lines`. The actual 2019 production audit passed with zero failures, 488 negative controls caught and 16 positive controls clean.

`approved-budget-real-sample.json` contains 288 real observations from the accepted seven-edition export. Amounts, tokens and source provenance are copied without aggregation. It includes synthesis revenue anchors, explicit budget-credit totals where the descriptor matches, and the first nine records of one 2025 authority. Coverage counts come from the complete accepted export. This sample is not an API response and not a complete ranking dataset.

Each edition has five forms: state synthesis, state authority detail (f02), social insurance synthesis, health synthesis and unemployment synthesis. At this snapshot, 2018 deployment was in progress. Earlier years remain pending in this reviewed lane. Rows in the legacy facts table do not establish the same admission or audit status.

### Reviewed national execution and BGC

A fresh production query confirmed **241 current selected releases**, ranging from January 2006 to July 2026, with explicit gaps. They are stored in the new `budget.execution_releases`, `execution_release_selections`, `execution_release_inputs` and `execution_release_facts` tables, with seals and series in companion tables.

`execution-real-sample.json` contains 289 real BGC observations from December 2025 and July 2026 for state budget and general consolidated budget. It preserves semantic dimensions, amounts, units, source tokens, release IDs, URLs and hashes. Selection uses the current leaves of the publication chain; historical revisions are not added together.

**Correct design.md §2 and server ask 6:** an empty old `budget.bgc_official_facts` table means the old API reader does not expose the new lane. It does not mean that BGC data is absent from production.

### API boundary

The deployed dev endpoint, `https://dev-chronos-api.transparenta.eu/api/v1/graphql`, answers `budgetApprovedFacts`, but its server reader selects the older `budget.approved_budget_facts`. It does not expose the reviewed edition-line table. A test response returned a 2026 external-grants estimate for 2028, from that older dataset. The tested public `/api/v1/graphql` route returned 404.

The new execution-release API reader is also pending. Your existing ANAF execution queries have their own scope and data-through date. Keep them separate from MF/BGC releases through July 2026.

## Meaning the prototypes must preserve

- **Edition versus target year:** `budget_year` identifies the source edition; `measure_year` identifies its approved or forecast year. Forecasts from each edition remain separate. Suggested labels: “Bugetul 2025: aprobat pentru 2025” and “Estimare pentru 2026 din bugetul 2025”.
- **Publication status:** `law_Y_as_sent_to_monitorul_oficial` is the reviewed source version. It is not proof of the latest rectification. The existing March 2026 static dataset remains a draft until separately qualified.
- **Units:** approved amounts are decimal strings in thousand lei. Convert by ×1000 for lei, or ÷1,000,000 for billion lei. Execution values are already normalized to RON or fraction; use their declared unit. Never apply the approved-budget conversion to execution data.
- **Hierarchy and credits:** totals, subtotals and details coexist. Commitment credits and budget credits are separate. An unfiltered sum double-counts rows. Use an explicit total descriptor and one credit type where justified.
- **Budget scope:** state, social insurance, health and unemployment forms cannot simply be added to manufacture a BGC total; transfers and consolidation matter.
- **Authority identity:** an `authority_code` is an ordonator source code, not a CUI. Do not join by name or guess a CUI. Plan-versus-ANAF ministry comparison needs a reviewed identity mapping.
- **Execution periods:** semantic keys preserve coverage, fiscal/report dates, comparison dates, execution status and finality. July 2026 observations can cover January–July. Do not treat a cumulative release as a monthly flow or derive flows across source gaps.
- **Comparability:** plan and execution must share scope, units, period and accounting basis. State-budget law totals, ANAF principal aggregates and MF consolidated totals are different populations. Show “not comparable” when appropriate instead of inventing percentages or deficits.
- **Gaps:** the range is not complete monthly coverage. Retained historical notes include July 2019 missing, December 2008 and September/November 2012 held, January 2024 missing BGC and May 2025 incompatible source family. Keep unavailable periods visible.

## References to the data work

The usual scraper sibling checkout is absent on Zeus. The `references/` copies let you work without cloning it:

- `execution-notes.md`: domain semantics and decisions.
- `execution-status.md`: historical releases and gaps. Its older approved-edition paragraph is stale; use the attached current coverage.
- `approved-lines-schema.ts`: exact line fields and hierarchy/credit semantics.
- `execution-release-schema.ts`: facts, source inputs, publication chain and provenance.
- `approved-profiles.ts`: reviewed forms, sources and pins.
- `api-readiness.md`: the database/API boundary checked today.

Original evidence lives in the Mac scraper repo at `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-scrapper/`. The actual 2019 audit is `experimental/mfp-approved-2019-deploy-20260930/evidence/live/run/audit-report.json`. The accepted export receipt and line hash are recorded in the approved sample. External paths are provenance references, not client build dependencies.

## Build both page prototypes

Read your existing `docs/design/national-budget/design.md`, `DESIGN.md`, `docs/design/prototyping.md` and mock-first conventions. Build in the existing `/development/*` harness using the same typed fixture adapter and filter semantics. Keep the explorer as a separate power tool.

Two useful directions, adaptable to your existing proposals:

1. **Panorama:** overview first, with explicit scope/status/year, trustworthy totals, independently labelled plan and execution cards, component breakdown, authority drilldown and sources. Make the first exploration path simple.
2. **Questions and evidence:** investigation first, organized around “Ce s-a aprobat?”, “Ce s-a executat?” and “Ce s-a schimbat?”. Use period/edition controls, an explainable table, coverage and comparison-basis panels. Give it a distinct information hierarchy, not just different colours.

Label the prototype “Date pentru machetă — API în lucru”. Distinguish real-source fixture values from invented demonstration scenarios. Defaulting to reviewed 2025 data is supported. If you reuse the 2026 static fixture, show “Proiect, martie 2026”; do not infer adopted-law status from old API facts. The sample is incomplete, so a complete ranking requires a clearly synthetic fixture or a later approved export.

Interactions should cover edition, approved/forecast target year, state versus BGC scope, credit type, authority search/drilldown, sources and coverage. Keep URL state shareable. Include loading, empty, unavailable, error and non-comparable states. Make desktop/mobile layouts and keyboard interactions work.

Keep data access behind a feature API adapter and Zod types so the future API can replace mocks without rewriting the UI. Proposed endpoint names remain proposals. Do not modify server/scraper, production systems, credentials, branches, worktrees or deployments. Do not commit or push. Preserve unrelated work and every prototype; keep real routes unchanged until variant review.

Verify SSR, initial figures, mobile/desktop layout, keyboard use and console output. Run `yarn check` and meaningful adapter tests. Return comparison and single-variant URLs, screenshots, tradeoffs, missing API requirements and the owned file list. Before ending, write `prototype-review-ready.md` in this handoff directory. The primary watcher delivers the completion notification; do not independently queue it.
