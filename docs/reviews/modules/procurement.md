# Procurement Module Review

Source report: `/tmp/codex-orchestrator/transparenta-ui-module-reviews/reports/procurement.json`

## Summary

Mock-first procurement is structurally sound (facade, schemas, search parsing, coverage UX), but detail SSR loaders surface unknown IDs as generic errors instead of 404s, mock adapters never signal “not found” for CPV/supplier slices, UI hardcodes mock status despite a unused dynamic helper, and the private-company achizitii tab resolves CUI differently from sibling tabs. Tests cover happy-path UI well but miss loader 404 behavior, supplier-slice integration, and live/mock boundary transitions.

## Findings

| Severity | Location | Issue | Recommendation |
| --- | --- | --- | --- |
| high | src/routes/achizitii/proceduri/$id.tsx:13 | Unknown procedure IDs throw in the loader instead of returning 404 | Catch adapter not-found (return `null` or a typed error) and `throw notFound()`. Mirror the pattern on contract and direct-acquisition detail routes. |
| high | src/routes/achizitii/contracte/$id.tsx:13 | Unknown contract IDs throw in the loader instead of returning 404 | Map missing records to `notFound()` in the loader (or adapter) rather than propagating raw `Error`. |
| high | src/routes/achizitii/achizitii-directe/$id.tsx:13 | Unknown direct-acquisition IDs throw in the loader instead of returning 404 | Same as other detail routes: adapter returns null or signals not-found; loader throws `notFound()`. |
| medium | src/features/private-companies/components/private-company-achizitii-tab.tsx:16 | Achizitii tab uses `profile.cui` while sibling tabs use normalized route `cui` | Pass normalized route `cui` into the tab (same as litigii) and use it for `ProcurementSupplierSlice`, keeping `profile.cui` only as display fallback. |
| medium | src/features/procurement/components/procurement-record-detail.tsx:89 | Data status is hardcoded to mock; dynamic `procurementDataStatus` is never used | Derive badge/ribbon status from `procurementApi.isMock` (or catalog `apiReady`) plus `procurementDataStatus(gate)` so live wiring automatically drops mock labeling while preserving partial/stale signals. |
| medium | src/features/procurement/lib/mock-mode.ts:26 | Mock/live gate is hardcoded and decoupled from catalog `apiReady` | Single source of truth: tie `procurementLiveApiReady()` to catalog `apiReady` (or env) and document that procurement ignores global mock-off until live is wired. |
| medium | src/features/procurement/api/procurement-api.ts:39 | `procurementApi.isMock` is evaluated once at module load | Call `isProcurementMockEnabled()` inside each fetch method (or expose a function) so mock/live selection stays consistent with runtime config. |
| medium | src/features/procurement/mocks/fixtures.ts:738 | Supplier slice mock always returns rich data for any CUI | Return an empty/minimal slice for unknown CUIs (or a dedicated empty state) so private-company integration reflects real “no public procurement” cases. |
| medium | src/features/procurement/mocks/fixtures.ts:707 | CPV category mock never signals unknown codes | For invalid/unknown CPV codes return null and let the route throw `notFound()`, matching live behavior. |
| medium | src/features/procurement/api/procurement-api.live.ts:17 | Live adapter always throws; no path to validate live wiring before UI flip | Implement live fetch + Zod parse to schema types; keep `assertLiveApiAvailable` as safety when mock env is off and API unreachable. |
| low | src/routes/achizitii/index.tsx:18 | Route `<head>` metadata is hardcoded Romanian, not Lingui | Move head copy into Lingui messages or a shared SEO helper keyed by locale, consistent with other public routes. |
| low | src/components/shared/procurement-data/data-status-badge.tsx:27 | DataStatusBadge labels are not internationalized | Wrap labels in Lingui macros or pass translated labels from callers. |
| low | src/features/procurement/components/procurement-record-detail.tsx:233 | Non-i18n copy in party section | Use `<Trans>CUI: {cui}</Trans>` or `t\`CUI: ${cui}\`` for both authority and supplier rows. |
| low | src/features/procurement/components/procurement-record-detail.tsx:268 | Contract kind badge renders raw English enum | Map `ContractKind` to localized labels (same pattern as `grainLabel`). |
| low | src/features/procurement/components/procurement-search-page.tsx:93 | Status filter UI supports only one status while URL schema allows multiples | Either multi-select in UI or document/decode single-status-only v1 and strip extra values on apply. |
| low | src/features/procurement/components/party-ranking-chart.tsx:64 | Primary bar chart is aria-hidden; accessible data only in collapsed `<details>` | Provide visible text summary or default-open table for screen readers; keep chart as enhancement. |
| low | src/features/procurement/components/procurement-supplier-slice.tsx:179 | PNRR cross-domain chip link omits company CUI context | Pass supplier CUI into PNRR route search/filter if that route supports entity scoping. |
| low | src/routes/achizitii/cautare.tsx:16 | validateSearch returns cleaned partial state; navigate merge assumes fuller shape | Normalize through `parseProcurementSearch` inside navigate updaters, or type router search as full state after validation. |
| low | src/features/private-companies/components/private-company-achizitii-tab.test.tsx:12 | Achizitii integration tests mock away real supplier slice behavior | Add integration test with unmocked `ProcurementSupplierSlice` (or hook) covering loading, mock badge, empty slice, and error states. |
| low | src/features/procurement/components/procurement-record-detail.test.tsx:44 | No tests for detail route loaders, 404, or unknown-ID behavior | Add route loader tests asserting `notFound()` for missing IDs and error boundary vs 404 distinction. |
| low | src/schemas/procurement-search.test.ts:7 | Search schema tests omit critical params used by UI and fixtures | Extend schema tests for reserved params, signal enum, and grain-specific filter compatibility. |
| info | src/features/procurement/hooks/use-procurement-data.ts:45 | CPV page double-fetches (SSR loader + client query) | Set `staleTime`/`initialDataUpdatedAt` when `initialPage` is provided from SSR loader. |
| info | src/features/procurement/components/procurement-record-card.tsx:48 | Modifications grain has no dedicated detail route (by design) | Document as intentional v1; ensure search UX sets expectations that modification rows open parent contracts. |

## Detailed Evidence

### high: Unknown procedure IDs throw in the loader instead of returning 404

- Location: `src/routes/achizitii/proceduri/$id.tsx:13`
- Evidence: Loader calls `procurementApi.fetchProcedureDetail(params.id)` then checks `if (!detail) throw notFound()`, but mock/live adapters always return an object or throw `Error` (fixtures.ts:784–787). Invalid IDs hit `__root` `errorComponent`, not `notFoundComponent`.
- Recommendation: Catch adapter not-found (return `null` or a typed error) and `throw notFound()`. Mirror the pattern on contract and direct-acquisition detail routes.
- Residual risk: SSR and client navigation to bad deep links show a global error page and may be reported to Sentry as unhandled errors.

### high: Unknown contract IDs throw in the loader instead of returning 404

- Location: `src/routes/achizitii/contracte/$id.tsx:13`
- Evidence: Same dead `if (!detail) throw notFound()` guard; mock uses `requireMockDetail` which throws when ID is absent from the fixture map (fixtures.ts:700–703, 790–791).
- Recommendation: Map missing records to `notFound()` in the loader (or adapter) rather than propagating raw `Error`.
- Duplicate of: `src/routes/achizitii/proceduri/$id.tsx:13`
- Residual risk: Broken contract links from search cards and cross-links degrade trust and SEO (non-404 status).

### high: Unknown direct-acquisition IDs throw in the loader instead of returning 404

- Location: `src/routes/achizitii/achizitii-directe/$id.tsx:13`
- Evidence: Identical loader pattern; mock throws for unknown IDs (fixtures.ts:793–798).
- Recommendation: Same as other detail routes: adapter returns null or signals not-found; loader throws `notFound()`.
- Duplicate of: `src/routes/achizitii/proceduri/$id.tsx:13`
- Residual risk: Same as contract/procedure detail routes.

### medium: Achizitii tab uses `profile.cui` while sibling tabs use normalized route `cui`

- Location: `src/features/private-companies/components/private-company-achizitii-tab.tsx:16`
- Evidence: `PrivateCompanyAchizitiiTab` reads `profile.cui` and bails when null. `PrivateCompanyTabContent` passes route `cui` to `LitigationSliceSection` but not to achizitii (tab-content.tsx:40–54). Schema allows `cui: z.string().nullable()`.
- Recommendation: Pass normalized route `cui` into the tab (same as litigii) and use it for `ProcurementSupplierSlice`, keeping `profile.cui` only as display fallback.
- Residual risk: False “CUI indisponibil” guardrail or wrong supplier slice if profile CUI is null/mismatched vs URL.

### medium: Data status is hardcoded to mock; dynamic `procurementDataStatus` is never used

- Location: `src/features/procurement/components/procurement-record-detail.tsx:89`
- Evidence: All procurement surfaces pass `status="mock"` / `MockDataStatusBadge` / `dataStatus="mock"`. `procurementDataStatus(gate)` in procurement.ts:539–551 would return `'partial'` for mock gate (amount below threshold, dataAsOf set) but is unused anywhere in `src/`.
- Recommendation: Derive badge/ribbon status from `procurementApi.isMock` (or catalog `apiReady`) plus `procurementDataStatus(gate)` so live wiring automatically drops mock labeling while preserving partial/stale signals.
- Residual risk: When live API is connected, UI may still label real data as mock unless every callsite is manually updated.

### medium: Mock/live gate is hardcoded and decoupled from catalog `apiReady`

- Location: `src/features/procurement/lib/mock-mode.ts:26`
- Evidence: `procurementLiveApiReady()` always returns `false` (line 29). `isProcurementMockEnabled()` therefore always serves mocks even when `VITE_USE_MOCK_DATA` is false. Catalog entry `public-contracts-seap` has `apiReady: false` (catalog.ts:151) but code does not read it.
- Recommendation: Single source of truth: tie `procurementLiveApiReady()` to catalog `apiReady` (or env) and document that procurement ignores global mock-off until live is wired.
- Residual risk: Cannot exercise live adapter in staging without code edits; flipping readiness without UI status updates causes confusing mixed signals.

### medium: `procurementApi.isMock` is evaluated once at module load

- Location: `src/features/procurement/api/procurement-api.ts:39`
- Evidence: `isMock: isProcurementMockEnabled()` is a static property; fetch methods branch on `this.isMock` at call time but the value never refreshes after import/HMR/env change.
- Recommendation: Call `isProcurementMockEnabled()` inside each fetch method (or expose a function) so mock/live selection stays consistent with runtime config.
- Residual risk: Tests, Storybook, or future runtime mock toggles may hit the wrong adapter silently.

### medium: Supplier slice mock always returns rich data for any CUI

- Location: `src/features/procurement/mocks/fixtures.ts:738`
- Evidence: `supplierSlice(cui)` fabricates buyers, revenue, and recent records for every CUI (lines 738–773). `ProcurementSupplierSlice` only shows error on query failure, not empty slice.
- Recommendation: Return an empty/minimal slice for unknown CUIs (or a dedicated empty state) so private-company integration reflects real “no public procurement” cases.
- Residual risk: Every company profile achizitii tab shows plausible but fictitious procurement revenue until live API ships.

### medium: CPV category mock never signals unknown codes

- Location: `src/features/procurement/mocks/fixtures.ts:707`
- Evidence: `cpvPage(code)` always builds a page from fixture categories for any 2–8 digit code (707–735). Route loader `if (!page) throw notFound()` (cpv/$code.tsx:28–30) is unreachable.
- Recommendation: For invalid/unknown CPV codes return null and let the route throw `notFound()`, matching live behavior.
- Residual risk: Invalid CPV deep links show misleading category pages instead of 404.

### medium: Live adapter always throws; no path to validate live wiring before UI flip

- Location: `src/features/procurement/api/procurement-api.live.ts:17`
- Evidence: All live functions call `unavailableLiveApi()` which invokes `assertLiveApiAvailable` then throws (lines 17–59). No GraphQL client integration despite server module existing per schema comments.
- Recommendation: Implement live fetch + Zod parse to schema types; keep `assertLiveApiAvailable` as safety when mock env is off and API unreachable.
- Residual risk: Adapter swap will be a large bang change with no incremental live/mock mix per endpoint.

### low: Route `<head>` metadata is hardcoded Romanian, not Lingui

- Location: `src/routes/achizitii/index.tsx:18`
- Evidence: Title/description strings are literal RO in index.tsx, cautare.tsx, proceduri/$id.tsx, contracte/$id.tsx, cpv/$code.tsx, achizitii-directe/$id.tsx. UI components use `<Trans>`/`t` macros.
- Recommendation: Move head copy into Lingui messages or a shared SEO helper keyed by locale, consistent with other public routes.
- Residual risk: English locale users get Romanian browser titles/OG tags on achizitii routes.

### low: DataStatusBadge labels are not internationalized

- Location: `src/components/shared/procurement-data/data-status-badge.tsx:27`
- Evidence: `STATUS_META` uses hardcoded strings (`'Mock'`, `'Parțial'`, `'Neverificat'`, etc.) without `t` macros, unlike surrounding procurement UI.
- Recommendation: Wrap labels in Lingui macros or pass translated labels from callers.
- Residual risk: Mixed RO/EN UI when locale is English.

### low: Non-i18n copy in party section

- Location: `src/features/procurement/components/procurement-record-detail.tsx:233`
- Evidence: `CUI: {record.authority.cui ?? t\`indisponibil\`}` (lines 233, 246) embeds literal "CUI:" prefix outside `<Trans>`.
- Recommendation: Use `<Trans>CUI: {cui}</Trans>` or `t\`CUI: ${cui}\`` for both authority and supplier rows.
- Residual risk: Minor i18n inconsistency in an otherwise translated detail page.

### low: Contract kind badge renders raw English enum

- Location: `src/features/procurement/components/procurement-record-detail.tsx:268`
- Evidence: `contractKind` badge displays `{contractKind}` directly (`works`, `services`, `supplies`) without translation mapping.
- Recommendation: Map `ContractKind` to localized labels (same pattern as `grainLabel`).
- Residual risk: English domain tokens visible in RO UI.

### low: Status filter UI supports only one status while URL schema allows multiples

- Location: `src/features/procurement/components/procurement-search-page.tsx:93`
- Evidence: Filter draft reads `params.status?.[0]` (line 93, 332) and writes `[draft.status]` (359). Schema `commaListStatus` accepts comma-separated lists (procurement-search.ts:49–61).
- Recommendation: Either multi-select in UI or document/decode single-status-only v1 and strip extra values on apply.
- Residual risk: Shared deep links with multiple statuses show misleading filter state while results reflect all statuses.

### low: Primary bar chart is aria-hidden; accessible data only in collapsed `<details>`

- Location: `src/features/procurement/components/party-ranking-chart.tsx:64`
- Evidence: Bar list has `aria-hidden` (line 64); table fallback is inside closed `<details>` (105–110). Same pattern in spend-over-time.tsx:51.
- Recommendation: Provide visible text summary or default-open table for screen readers; keep chart as enhancement.
- Residual risk: Keyboard/screen-reader users must discover collapsed table to access ranking data.

### low: PNRR cross-domain chip link omits company CUI context

- Location: `src/features/procurement/components/procurement-supplier-slice.tsx:179`
- Evidence: CrossDomainChips links to `/pnrr` without search params when `chip.cui` is set (179–183); only shows CUI as adjacent text.
- Recommendation: Pass supplier CUI into PNRR route search/filter if that route supports entity scoping.
- Residual risk: Cross-domain navigation from company achizitii tab does not pre-filter PNRR to the supplier.

### low: validateSearch returns cleaned partial state; navigate merge assumes fuller shape

- Location: `src/routes/achizitii/cautare.tsx:16`
- Evidence: Route `validateSearch` returns `cleanProcurementSearch(parsed)` (partial). Lazy route re-parses with defaults (cautare.lazy.tsx:10). Search page navigate uses `(prev as ProcurementSearchState)` spread (search-page.tsx:133).
- Recommendation: Normalize through `parseProcurementSearch` inside navigate updaters, or type router search as full state after validation.
- Residual risk: Latent URL/query-key drift if defaults are stripped from URL during partial merges.

### low: Achizitii integration tests mock away real supplier slice behavior

- Location: `src/features/private-companies/components/private-company-achizitii-tab.test.tsx:12`
- Evidence: Test mocks `ProcurementSupplierSlice` entirely (lines 12–18); only asserts CUI prop passthrough and null-CUI guardrail. No test renders real slice hook/fixtures.
- Recommendation: Add integration test with unmocked `ProcurementSupplierSlice` (or hook) covering loading, mock badge, empty slice, and error states.
- Residual risk: Regressions in procurement supplier UI on company pages go undetected.

### low: No tests for detail route loaders, 404, or unknown-ID behavior

- Location: `src/features/procurement/components/procurement-record-detail.test.tsx:44`
- Evidence: Only component test with valid fixture ID `contract-key-001`. No route-level tests for proceduri/contracte/achizitii-directe loaders. Search/card tests do not cover invalid detail navigation.
- Recommendation: Add route loader tests asserting `notFound()` for missing IDs and error boundary vs 404 distinction.
- Residual risk: 404/error regression in highest-traffic deep links stays untested.

### low: Search schema tests omit critical params used by UI and fixtures

- Location: `src/schemas/procurement-search.test.ts:7`
- Evidence: Tests cover grain/sort/page normalization and cleaning (lines 8–43). No tests for `signal`, `dateFrom`/`dateTo`, `valueMin`/`valueMax`, `from`/`highlight`, or modification grain + `status` interaction (modifications lack `status` field → empty results when status filter present).
- Recommendation: Extend schema tests for reserved params, signal enum, and grain-specific filter compatibility.
- Residual risk: Deep links with advanced params may parse unexpectedly without CI coverage.

### info: CPV page double-fetches (SSR loader + client query)

- Location: `src/features/procurement/hooks/use-procurement-data.ts:45`
- Evidence: Route loader fetches CPV data (cpv/$code.tsx:27–31) and passes `initialPage` to `useProcurementCpvCategory` (cpv/$code.lazy.tsx:11). Hook uses default React Query staleTime (0), triggering client refetch with 120ms mock delay.
- Recommendation: Set `staleTime`/`initialDataUpdatedAt` when `initialPage` is provided from SSR loader.
- Residual risk: Extra mock latency and redundant work on CPV pages; harmless with deterministic mocks.

### info: Modifications grain has no dedicated detail route (by design)

- Location: `src/features/procurement/components/procurement-record-card.tsx:48`
- Evidence: Cards link modifications to parent contract with `#modificari` hash (48–51, 104–107). No `/achizitii/modificari/$id` route exists.
- Recommendation: Document as intentional v1; ensure search UX sets expectations that modification rows open parent contracts.
- Residual risk: Users expecting standalone modification pages may find hash navigation surprising.

## Residual Risk

Module remains mock-first with strong schema/UI alignment; highest production risk is error-page responses for bad detail IDs, fictitious supplier slices on all company profiles, and a manual multi-file flip required when live procurement API connects (adapter, mock-mode gate, and hardcoded mock badges must change together). EN locale and accessibility gaps are secondary but user-visible.
