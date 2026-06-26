# Statistics Module Review

Source report: `/tmp/codex-orchestrator/transparenta-ui-module-reviews/reports/statistics.json`

## Summary

The statistics module is well-factored: Zod-validated territory-hub search (`period`), a single mock/live API seam, honest coverage/provenance semantics (no invented sync timestamps), and solid baseline UI states (skeleton, error+retry, not-found, empty tiles). Main gaps are unvalidated `$siruta` route params, period-filter UX that hides controls while a secondary query loads, live vs mock divergence on dataset-request submission (`accepted: false` vs `true`), unused payload validation, and incomplete i18n/a11y polish on a few subcomponents. Test coverage is good for schemas, mocks, landing, territory happy paths, share, and request submit—but not for territory error retry, period-filter loading, or live request rejection.

## Findings

| Severity | Location | Issue | Recommendation |
| --- | --- | --- | --- |
| high | src/features/statistics/pages/statistics-territory-hub-page.tsx:61 | Period filter controls disappear when a historical period is active and the unfiltered source query is still loading | Keep the filter rail mounted during `periodSourceQuery.isLoading` (skeleton or disabled chips), fall back to `hub` sparkline periods until source data arrives, or cache prior period options. |
| medium | src/features/statistics/pages/statistics-territory-hub-page.tsx:61 | No loading or error handling for the secondary `periodSourceQuery` used to populate period options | Surface a lightweight inline error/retry for period-option fetch failures; do not gate the whole period switcher on the secondary query succeeding. |
| medium | src/routes/statistici/teritorii/$siruta.tsx:4 | Territory route param `$siruta` is not validated or normalized at the router boundary | Add a `params` parser (trim, numeric/non-empty SIRUTA pattern) and redirect or render not-found for invalid values before mounting the hub page. |
| medium | src/features/statistics/components/request-dataset-action.tsx:69 | Dataset request UI does not honor `accepted: false` from the live adapter | Branch on `result.accepted`: warning/destructive styling and copy when false; keep submit enabled or explain next steps; add tests for live rejection. |
| medium | src/features/statistics/hooks/use-statistics.ts:108 | `datasetRequestPayloadSchema` is never enforced on the submit path | Parse with `datasetRequestPayloadSchema` in the mutation fn (or adapter) and map Zod errors to field-level form errors before calling the API. |
| medium | src/features/statistics/lib/coverage.ts:51 | Coverage counts can misreport when the catalog page is truncated | When `partial`, omit precise available counts or fetch aggregate availability; label ribbon as estimate-only until full catalog is loaded. |
| medium | src/features/statistics/api/statistics-api.live.ts:45 | Hard-coded catalog limit may outgrow the INS dataset universe | Paginate until `hasNextPage` is false or add a dedicated aggregate coverage endpoint; treat partial catalog as estimate. |
| medium | src/features/statistics/components/indicator-tile.tsx:195 | Source provenance and request actions ignore English locale for dataset titles | Pass the same locale-aware display name used in the tile header to provenance and request components. |
| medium | src/features/statistics/lib/territory.ts:117 | Related cross-domain links never receive UAT/entity/company CUIs from the live hub pipeline | Join territorial identifiers from existing label/entity APIs when available; keep links disabled with explicit reasons when joins are missing. |
| low | src/features/statistics/components/coverage-ribbon.tsx:40 | Coverage ribbon formats `latestDataPeriod` inconsistently with freshness badges | Reuse `buildDataThroughLabel(latestDataPeriod)` in the ribbon for consistent RO phrasing. |
| low | src/features/statistics/components/share-filtered-view.tsx:35 | Share button visible label does not reflect copy success/failure | Temporarily change visible button text or add `aria-live` on the button; optionally expose `aria-describedby` to the status region. |
| low | src/features/statistics/lib/territory.ts:31 | County fallback mapping is limited to Bucharest | Expand fallback map from authoritative SIRUTA↔county reference data or rely solely on live territory metadata with clearer not-found messaging. |
| low | src/features/statistics/lib/period.ts:80 | Period helper logic lacks direct unit tests | Add focused tests for annual/quarterly/monthly labels, stale detection edge cases, and observation fallback ordering. |
| low | src/features/statistics/pages/statistics-territory-hub-page.test.tsx:76 | Territory hub tests omit error/retry and period-filter loading scenarios | Mirror landing error/retry coverage; add a test that period chips remain visible (or show loading) when `search.period` is set and the unfiltered query is pending. |
| low | src/routes/statistici/teritorii/-$siruta.lazy.test.tsx:36 | Route wrapper test bypasses real search parsing | Add an integration-style test that validates parsed search props reach the page (including `latest` → `{}` stripping). |
| low | src/features/statistics/api/statistics-api.live.ts:538 | Live dataset-request adapter comment contradicts implementation | Fix comment to match behavior or implement the real feedback transport and set `accepted` accordingly. |

## Detailed Evidence

### high: Period filter controls disappear when a historical period is active and the unfiltered source query is still loading

- Location: `src/features/statistics/pages/statistics-territory-hub-page.tsx:61`
- Evidence: `periodSourceQuery` is enabled when `activePeriod` is set; `periodOptions` is derived from `periodSourceQuery.data` (undefined while loading), so `periodOptions.length > 0` is false and the filter `<div aria-label={t\`Filtru perioadă\`}>` is not rendered—even though the "Filtrat: {activePeriod}" badge remains.
- Recommendation: Keep the filter rail mounted during `periodSourceQuery.isLoading` (skeleton or disabled chips), fall back to `hub` sparkline periods until source data arrives, or cache prior period options.
- Residual risk: Users on shared `?period=` URLs cannot change or clear the filter until the second query completes; deep links feel broken on slow networks.

### medium: No loading or error handling for the secondary `periodSourceQuery` used to populate period options

- Location: `src/features/statistics/pages/statistics-territory-hub-page.tsx:61`
- Evidence: Only `hubQuery.isLoading` / `hubQuery.isError` drive UI; `periodSourceQuery` errors are ignored and loading hides the period switcher (see lines 61–68, 118–152).
- Recommendation: Surface a lightweight inline error/retry for period-option fetch failures; do not gate the whole period switcher on the secondary query succeeding.
- Residual risk: Transient INS failures leave filtered views without a recovery path for period navigation.

### medium: Territory route param `$siruta` is not validated or normalized at the router boundary

- Location: `src/routes/statistici/teritorii/$siruta.tsx:4`
- Evidence: Route only defines `validateSearch: parseStatisticsTerritoryHubSearch`; there is no `params` schema. Any string (including whitespace) is forwarded to `StatisticsTerritoryHubPage`. The hook disables fetch when `siruta.trim()` is empty (`use-statistics.ts` lines 83–94), yielding a page with back/share only and no not-found or error state.
- Recommendation: Add a `params` parser (trim, numeric/non-empty SIRUTA pattern) and redirect or render not-found for invalid values before mounting the hub page.
- Residual risk: Malformed or blank SIRUTA URLs produce silent blank content instead of a clear 404/validation message.

### medium: Dataset request UI does not honor `accepted: false` from the live adapter

- Location: `src/features/statistics/components/request-dataset-action.tsx:69`
- Evidence: `requestMutation.data` always replaces the form with a neutral status box (lines 69–76). Live adapter returns `{ accepted: false, message: t\`Funcționalitatea de trimitere este în pregătire...\` }` (`statistics-api.live.ts` lines 552–556) while mock returns `accepted: true`. Tests only assert the success path with `accepted: true`.
- Recommendation: Branch on `result.accepted`: warning/destructive styling and copy when false; keep submit enabled or explain next steps; add tests for live rejection.
- Residual risk: Production users believe a catalog-only dataset was requested when nothing was persisted server-side.

### medium: `datasetRequestPayloadSchema` is never enforced on the submit path

- Location: `src/features/statistics/hooks/use-statistics.ts:108`
- Evidence: Schema exists in `src/schemas/statistics.ts` (lines 200–205) with email/max-length rules; `useDatasetRequest` calls `submitDatasetRequest` directly with raw form values. Neither mock nor live adapters parse through Zod.
- Recommendation: Parse with `datasetRequestPayloadSchema` in the mutation fn (or adapter) and map Zod errors to field-level form errors before calling the API.
- Residual risk: Invalid optional email or oversized notes reach the adapter/logging layer without user-facing validation.

### medium: Coverage counts can misreport when the catalog page is truncated

- Location: `src/features/statistics/lib/coverage.ts:51`
- Evidence: `availableDatasetCount` counts only `datasets` in the current page; `catalogOnlyDatasetCount` is computed as `totalCount - available` (lines 51–61). If `datasets.length < totalCount`, `partial` is true but the ribbon still shows under/over-counted availability ratios.
- Recommendation: When `partial`, omit precise available counts or fetch aggregate availability; label ribbon as estimate-only until full catalog is loaded.
- Residual risk: Misleading "X din Y seturi" if INS catalog grows beyond `CATALOG_LIMIT` (2000) or the API paginates unexpectedly.

### medium: Hard-coded catalog limit may outgrow the INS dataset universe

- Location: `src/features/statistics/api/statistics-api.live.ts:45`
- Evidence: `CATALOG_LIMIT = 2000` used for landing and hub coverage (`fetchStatisticsLandingLive`, `buildHubCoverage`). Current docs cite 1,898 datasets, but no pagination loop exists.
- Recommendation: Paginate until `hasNextPage` is false or add a dedicated aggregate coverage endpoint; treat partial catalog as estimate.
- Residual risk: Silent coverage drift when catalog size exceeds the single-page fetch window.

### medium: Source provenance and request actions ignore English locale for dataset titles

- Location: `src/features/statistics/components/indicator-tile.tsx:195`
- Evidence: Tile heading picks `datasetNameEn` when locale is not Romanian (lines 149–154), but `SourceProvenanceDrawer` and `RequestDatasetAction` always receive `tile.datasetNameRo` (lines 195–206).
- Recommendation: Pass the same locale-aware display name used in the tile header to provenance and request components.
- Residual risk: English UI shows Romanian-only names in provenance dialogs and request copy.

### medium: Related cross-domain links never receive UAT/entity/company CUIs from the live hub pipeline

- Location: `src/features/statistics/lib/territory.ts:117`
- Evidence: `buildTerritoryRelatedLinks` supports `uatCui`, `entityCui`, `companyCui` (lines 117–190), but `fetchStatisticsTerritoryHubLive` only passes `{ identity }` (`statistics-api.live.ts` line 234). Live users see budget/map links only.
- Recommendation: Join territorial identifiers from existing label/entity APIs when available; keep links disabled with explicit reasons when joins are missing.
- Residual risk: Documented cross-domain story (primărie/instituție) is mock-complete but live-incomplete.

### low: Coverage ribbon formats `latestDataPeriod` inconsistently with freshness badges

- Location: `src/features/statistics/components/coverage-ribbon.tsx:40`
- Evidence: Ribbon renders `<Trans>Date până în</Trans> {latestDataPeriod}` with raw ISO strings (lines 40–43). `FreshnessBadge` uses `buildDataThroughLabel` for quarterly/monthly localization (`freshness-badge.tsx` lines 11–12).
- Recommendation: Reuse `buildDataThroughLabel(latestDataPeriod)` in the ribbon for consistent RO phrasing.
- Residual risk: Quarterly/monthly hubs show less readable provenance in the ribbon than on tiles.

### low: Share button visible label does not reflect copy success/failure

- Location: `src/features/statistics/components/share-filtered-view.tsx:35`
- Evidence: Button text stays `Copiază link`; only the icon toggles and an `sr-only` status region updates (lines 35–51). Sighted keyboard users get no persistent visual confirmation beyond a brief icon swap.
- Recommendation: Temporarily change visible button text or add `aria-live` on the button; optionally expose `aria-describedby` to the status region.
- Residual risk: Reduced confidence that period-filtered territory URLs were copied, especially without screen-reader feedback.

### low: County fallback mapping is limited to Bucharest

- Location: `src/features/statistics/lib/territory.ts:31`
- Evidence: `KNOWN_COUNTY_SIRUTA_CODES` / `KNOWN_COUNTY_CODE_BY_SIRUTA` only include `179132` → `B` (lines 27–33). `inferFallbackCountyCode` is the only county dashboard fallback when UAT dashboard groups are empty (`statistics-api.live.ts` lines 186–190).
- Recommendation: Expand fallback map from authoritative SIRUTA↔county reference data or rely solely on live territory metadata with clearer not-found messaging.
- Residual risk: County-level SIRUTA codes without UAT observations may 404 outside the Bucharest exception.

### low: Period helper logic lacks direct unit tests

- Location: `src/features/statistics/lib/period.ts:80`
- Evidence: No `period.test.ts`; coverage exists for schemas, coverage, dataset-status, fixtures, and pages, but not `buildDataThroughLabel`, `resolveLatestPeriod`, or `isPeriodStale`.
- Recommendation: Add focused tests for annual/quarterly/monthly labels, stale detection edge cases, and observation fallback ordering.
- Residual risk: Regressions in freshness/provenance copy could ship unnoticed.

### low: Territory hub tests omit error/retry and period-filter loading scenarios

- Location: `src/features/statistics/pages/statistics-territory-hub-page.test.tsx:76`
- Evidence: Landing page tests cover error+refetch (`statistics-landing-page.test.tsx` lines 91–107). Territory tests cover identity, provenance drawer, period links, not-found, and partial coverage—but not `hubQuery.isError` retry or filtered-period option visibility while the secondary query loads.
- Recommendation: Mirror landing error/retry coverage; add a test that period chips remain visible (or show loading) when `search.period` is set and the unfiltered query is pending.
- Residual risk: Regressions in error recovery and period UX will not be caught in CI.

### low: Route wrapper test bypasses real search parsing

- Location: `src/routes/statistici/teritorii/-$siruta.lazy.test.tsx:36`
- Evidence: Mock injects raw `search: { period: '2023' }` without exercising `parseStatisticsTerritoryHubSearch` on the parent route (`$siruta.tsx`). Invalid/degraded search normalization is only tested in `src/schemas/statistics.test.ts`.
- Recommendation: Add an integration-style test that validates parsed search props reach the page (including `latest` → `{}` stripping).
- Residual risk: Router/search wiring bugs between `$siruta.tsx` and `$siruta.lazy.tsx` may slip through.

### low: Live dataset-request adapter comment contradicts implementation

- Location: `src/features/statistics/api/statistics-api.live.ts:538`
- Evidence: Comment says "returns an optimistic accepted result" but function returns `accepted: false` with a not-yet-wired message (lines 538–556).
- Recommendation: Fix comment to match behavior or implement the real feedback transport and set `accepted` accordingly.
- Residual risk: Future implementers may assume submission already works.

## Residual Risk

Overall module is production-viable for mock-first demos and live INS reads when catalog size stays within the 2000-node fetch and users stick to supported SIRUTA examples. Residual product risk concentrates on (1) period-filter UX during secondary fetches, (2) honest handling of non-functional dataset requests in live mode, (3) coverage ratio accuracy if INS catalog pagination changes, and (4) incomplete territorial join enrichment for related links outside mock fixtures.
