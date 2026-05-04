# PNRR Official Project Data Model

**Status**: Accepted
**Date**: 2026-05-04
**Author**: Codex

## Problem

The PNRR dashboard in this app did not match the official PNRR dashboard for
basic metrics.

The most visible mismatch was the project count:

- Official dashboard for the `20260430` dataset: `21,786` projects.
- This app before the rewrite: `24,967` projects.

The app counted every row in `progres_tehnic_proiecte` as a project. The
official file contains `24,967` rows, but those rows are not all separate
projects. Several rows share the same `id_angajament`. Those repeated rows are
official project slices, usually split by measure, funding source, location, or
other record-level allocation.

This also created confusion around beneficiary totals. A beneficiary can have
multiple rows for the same project, and the app mixed "project count" semantics
with "row allocation" semantics. In some views, this made repeated rows look
like duplicated bad data instead of intentional official slices.

There was a second source-of-truth problem. Earlier plans used several official
or official-derived files together, including `indicatori_total.json` and
`persons.json`. That made it harder to explain which dataset powered which
metric. It also risked mixing project value metrics with payment metrics in the
same dashboard.

## Context

The current official source bundle is served from Cloudflare as gzipped raw
official files:

`https://pnrr-20260403.devostack.workers.dev/`

Relevant files in that bundle:

- `20260430-progres_tehnic_proiecte.json.gz`
- `20260430-indicatori_total.json.gz`
- `20260430-persons.json.gz`

The implemented app treats `20260430-progres_tehnic_proiecte.json.gz` as the
single source for current PNRR project metrics. Dedicated payment metrics use
the official payment files instead of being inferred from project progress:

- `20260430-persons.json.gz` powers beneficiary received amounts.
- `20260430-indicatori_total.json.gz` powers official total paid amount and paid
  beneficiary count metadata.

The official project feed fields used by the app include:

- `id_angajament`
- `titlu_contract`
- `denumire_beneficiar`
- `cui`
- `valoare_fe`
- `progres_fizic`
- `progres_financiar`
- `cod_componenta`
- `cod_masura`
- `sursa_finantare`
- `judet_implementare`
- `localitate_implementare`

The official feed stores `valoare_fe` in RON. The official EUR display for this
feed maps to a fixed conversion of `RON / 5`, so the app keeps the same
conversion for project values.

Progress fields are official fractions, for example `0.8969`. The app displays
them as percentages, rounded to two decimals.

## Decision

The app now models two separate concepts:

- `PnrrProjectRecord`: one official raw row from `progres_tehnic_proiecte`.
- `PnrrProject`: one grouped project keyed by `id_angajament`, containing one
  or more records.

Project grouping rules:

- Primary grouping key: `id_angajament`.
- Fallback grouping key for malformed rows without `id_angajament`: normalized
  project title plus CUI.
- Primary record: the record with the highest `valueEur`; ties keep source
  order.
- Project total value: sum of all grouped record values.
- Project count: grouped project count.
- Project record count: raw official row count.

For the `20260430` official file, this gives:

- `projectCount = 21,786`
- `projectRecordCount = 24,967`

Values remain row-based for totals and analytics. Repeated rows represent
separate official value allocations, so the correct contracted/listed value is
the sum of row-level `valoare_fe / 5`.

Filtering is record-first:

1. Apply filters to `PnrrProjectRecord` rows.
2. Regroup the matching records into `PnrrProject` rows.
3. Display grouped projects for the active filtered set.

This preserves official allocation semantics while keeping the project list at
project granularity.

The SSR proxy is responsible for fetching and caching the raw official files,
then rendering only a compact first-paint snapshot. The browser fetches the
same raw official files through same-origin gzip endpoints and performs full
normalization, grouping, filtering, and aggregation in a Web Worker.

The worker contract for current project metrics is intentionally simple:

- Serve the raw official `progres_tehnic_proiecte` file.
- Do not transform field names in the worker.
- Provide a stable latest path such as
  `latest/progres_tehnic_proiecte.json`.

The overview beneficiary payment leaderboard uses `persons.json`. It also joins
back to project-derived beneficiary totals by CUI or normalized beneficiary
name, so each row can show the official amount received plus the separately
computed listed project budget when a match exists.

## Alternatives Considered

- Count every official row as a project.
  Rejected because it produces `24,967` instead of the official `21,786` and
  mislabels project slices as projects.

- Statically generate a new client dataset.
  Rejected because the app should use the same raw source shape as the official
  app and perform runtime normalization in SSR cache.

- Keep using `indicatori_total.nr_proiecte` as the displayed project count.
  Rejected as the primary mechanism because it hides the model problem. It is
  acceptable as a validation cross-check, but the app should be able to derive
  the same count from distinct `id_angajament`.

- Derive paid amounts from `valoare_fe * progres_financiar`.
  Rejected because financial progress is a ratio, not a payment event field, and
  it does not reproduce official paid totals or beneficiary rankings.

- Use `persons.json` for the top beneficiary payment card.
  Accepted after the project model was stabilized because this is the dedicated
  official source for beneficiary received amounts. The UI must label it
  separately from listed project value.

- Deduplicate repeated `id_angajament` rows by keeping only the largest row.
  Rejected because the repeated rows carry separate official value allocations.
  Dropping rows would undercount totals and distort components, measures,
  locations, and funding source breakdowns.

## Consequences

**Positive**

- The displayed PNRR project count matches the official dashboard: `21,786`.
- The app can still show the raw official row count, `24,967`, but only as
  records or slices.
- Project lists now show one row per grouped project.
- Aggregates, maps, component totals, county totals, and beneficiary totals
  preserve row-level value allocations.
- The model explains why repeated rows exist instead of treating them as bad
  duplicates.
- Project metrics are simpler: one raw official project file.
- Payment metrics are sourced from the dedicated official payment files instead
  of being estimated from progress percentages.
- SSR memory cache centralizes the expensive raw-to-grouped transformation.

**Negative**

- Payment-based beneficiary metrics require the dedicated payment source and do
  not respond to project-level filters in the same way project values do.
- Grouped project rows need compact multi-value UI for fields that differ
  across records, such as component, measure, funding source, county, locality,
  CRI, or progress.
- When filters are active, a grouped project represents only the matching
  record subset, not necessarily every official record for that project.
- The fixed `RON / 5` EUR conversion is source-specific. If the official feed
  changes conversion rules, this needs to be revisited.

## Learnings

- The rows that looked duplicated are intentional official slices. The stable
  project identity is `id_angajament`.
- Project count and value total have different granularities. Count projects by
  distinct `id_angajament`, but sum values by official rows.
- `indicatori_total.nr_proiecte` is useful as a validation check, not as the
  source of truth for the app model.
- The main project feed can power project count, record count, listed value,
  progress, component, measure, location, beneficiary, map, and anomaly views.
- The main project feed cannot honestly power "paid amount" views. Those use
  `persons.json` and separate wording.
- Grouped UIs should keep access to record-level detail. The drawer now shows
  every official record represented by the selected grouped row.
- Record-first filtering is necessary. Project-first filtering can accidentally
  keep non-matching slices in totals or hide matching slices behind a grouped
  project.

## Verification Notes

Checks performed against the official `20260430` source:

- Raw file rows: `24,967`.
- Grouped projects from distinct `id_angajament`: `21,786`.
- Worker model returns `meta.projectCount = 21,786`.
- Worker model returns `meta.projectRecordCount = 24,967`.
- `/api/pnrr/raw/payments` contains 110 beneficiary payment rows.
- Worker model returns `meta.officialPaidTotalEur = 10,447,582,333.31`.
- The overview payment leaderboard shows CNAIR first with `6,199,754,237.01 RON`
  received from `persons.json`.

Commands run during verification:

- `yarn typecheck`
- `yarn vitest run src/features/pnrr src/server/handlers/pnrr-share-image.test.ts`
- `yarn i18n:clean`
- `yarn i18n:compile`
- `yarn run check`

## References

- `src/schemas/pnrr.ts`
- `src/features/pnrr/lib/data-transform.ts`
- `src/server/handlers/pnrr-data-proxy.ts`
- `src/features/pnrr/hooks/usePnrrData.ts`
- `src/features/pnrr/components/table/PnrrProjectTable.tsx`
- `src/features/pnrr/components/table/PnrrProjectDrawer.tsx`
- `src/features/pnrr/components/tabs/PnrrOverview.tsx`
- `https://pnrr-20260403.devostack.workers.dev/20260430-progres_tehnic_proiecte.json.gz`
