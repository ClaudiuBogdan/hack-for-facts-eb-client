# Public Investments Module Review

Source report: `/tmp/codex-orchestrator/transparenta-ui-module-reviews/reports/public-investments.json`

## Summary

Mock-first public investments slice is structurally sound: typed URL search schemas, discriminated API/hook results, trust/privacy boundaries in the adapter, and solid unit coverage for gating, redaction, and filtering. Main gaps are UI/schema drift (landing/search map and program URL state parsed but not wired), a CSS placeholder map with weak accessibility, program filters limited to single-select while schemas support arrays, blocked-state messaging that ignores adapter messageKeys, and search facets computed on the unfiltered corpus. Evidence drawer redaction mostly works via fixture evidenceKey fallback, but layout context and objectiveId are not passed through.

## Findings

| Severity | Location | Issue | Recommendation |
| --- | --- | --- | --- |
| high | src/features/public-investments/pages/PublicInvestmentsLandingPage.tsx:20 | Landing map/search URL state is parsed but never consumed | Pass landing search into the page (or call `Route.useSearch()`), drive program highlight/filter and map mode from URL, and debounce-write camera params per design docs. |
| high | src/features/public-investments/components/PublicInvestmentsMapPanel.tsx:12 | Map panel is a static CSS scatter plot, not an interactive map | Replace or wrap with the project's map stack (e.g. React-Leaflet pattern used elsewhere), wire point click → objective route or `selected` search param, and implement program/stage symbology from landing/search state. |
| high | src/features/public-investments/pages/PublicInvestmentsSearchPage.tsx:37 | Search layout and map-list sync URL params are unused | Implement layout toggle bound to `view`, highlight/scroll list from `selected`, and update map interaction to set `selected` in URL. |
| medium | src/features/public-investments/pages/PublicInvestmentsSearchPage.tsx:96 | Program filter UI is single-select while schema and adapter support multi-program arrays | Use multi-select chips/checkbox group, or explicitly document and enforce single-program URLs; if single-select, normalize URL on load to one canonical program. |
| medium | src/features/public-investments/api/public-investments-api.ts:527 | Search facets are built from the full corpus, not the filtered result set | Compute facets from the same filtered cohort as `fullFiltered.rows`, or expose both global and filtered facet sets with clear labeling. |
| medium | src/features/public-investments/components/BlockedDataState.tsx:12 | Blocked UI ignores adapter `messageKey` and hardcodes copy | Resolve descriptions via Lingui from `blockedMessageKey` + `messageParams`; add catalog messages and run i18n extract/compile. |
| medium | src/features/public-investments/components/BlockedDataState.tsx:15 | Not-found blocked descriptions use wrong messageParams key for evidence | Use `messageKey`-driven templates or normalize params (`code` vs `sourceRowKey`) in `BlockedDataState` or at the adapter boundary. |
| medium | src/features/public-investments/components/SourceProvenanceDrawer.tsx:29 | Evidence drawer does not pass objective context into the evidence query | Thread objectiveId from layout/objective route or evidence ref metadata into `useEvidenceDetail`; pass layout backtrack params when opening evidence from territory/objective pages. |
| medium | src/features/public-investments/components/PublicInvestmentsMapPanel.tsx:45 | Map points are not keyboard-accessible and do not expose actionable semantics | Render points as links/buttons to objective detail (or a roving-tabindex list), add a text legend, and associate the section with `aria-describedby` for the footnote. |
| medium | src/features/public-investments/pages/PublicInvestmentsTerritoryPage.tsx:147 | Territory program/domain breakdown rows do not apply filters | Wire breakdown row clicks to `updateSearch({ programs: [...] })` / domain keys, mirroring spec behavior. |
| medium | src/features/public-investments/pages/PublicInvestmentsSearchPage.tsx:73 | Major search schema filters are not exposed in the UI | Phase filter UI to match schema (facets-driven chips, range inputs, boolean toggles) or trim schema until implemented to avoid dead URL params. |
| low | src/features/public-investments/lib/mock-mode.ts:9 | Mock gating references a catalog id that is not registered | Add a umbrella `public-investments` catalog entry or drop the unused id and document the two program dataset ids as the only scoped keys. |
| low | src/features/public-investments/lib/mock-mode.ts:24 | `getPublicInvestmentsMockStatus` never emits `mock-disabled` | Either implement distinct mock-disabled signaling or remove the unused status from types/helpers. |
| low | src/env.d.ts:24 | Env typing covers global mock flags but not scrapper-root override used by mock-first workflow | Add `VITE_SCRAPPER_REPO_ROOT?: string` for parity with project mock-first docs (optional for PI runtime, but improves discoverability). |
| low | src/features/public-investments/pages/PublicInvestmentsObjectivePage.tsx:148 | Payments tab does not handle blocked or error ledger states | Render `BlockedDataState` / error UI inside the payments tab when the ledger query fails independently. |
| low | src/features/public-investments/api/public-investments-api.ts:48 | Adapter boundary co-locates live contract with direct mock fixture imports | Extract `public-investments-mock-adapter.ts` implementing the same exported functions; keep sanitize/filter utilities shared and mock-free for live swap. |
| low | src/features/public-investments/pages/public-investments-pages.test.tsx:145 | Page tests omit territory route, map URL wiring, and facet behavior | Add territory page tests (program filter URL, blocked not-found), landing search consumption once wired, and adapter facet/filter consistency tests at page level. |
| info | src/features/public-investments/api/public-investments-api.ts:404 | Mock gating and trust boundary behave correctly when mock is enabled | Preserve this discriminated-result pattern when adding live fetch; keep sanitize helpers on the adapter side. |
| info | src/routes/investitii-publice/route.tsx:17 | Evidence deep-link via layout `dovada` search param is correctly wired | When adding objective-scoped redaction, extend URL state without breaking existing deep links. |
| info | src/schemas/public-investments.ts:172 | URL search parsing is permissive and well-tested | Keep schema as the single URL contract; align UI surface area to implemented params to reduce drift. |

## Detailed Evidence

### high: Landing map/search URL state is parsed but never consumed

- Location: `src/features/public-investments/pages/PublicInvestmentsLandingPage.tsx:20`
- Evidence: `parseLandingSearch` defines `view`, `program`, `mapLat`, `mapLng`, `mapZoom` (schemas/public-investments.ts:415-441), index route validates search (routes/investitii-publice/index.tsx:5-7), but `PublicInvestmentsLandingPage` takes no search props and never reads `Route.useSearch()`. No program chips, stage toggle, or camera persistence despite schema/tests (public-investments.test.ts:266-287).
- Recommendation: Pass landing search into the page (or call `Route.useSearch()`), drive program highlight/filter and map mode from URL, and debounce-write camera params per design docs.
- Residual risk: Deep links and shared map state silently no-op; users cannot reproduce landing views from URL.

### high: Map panel is a static CSS scatter plot, not an interactive map

- Location: `src/features/public-investments/components/PublicInvestmentsMapPanel.tsx:12`
- Evidence: Points are absolutely positioned `<div>` elements with hard-coded lat/lng projection (lines 39-57); no Leaflet/map library, no click/hover handlers, no link to objectives, no program/stage coloring despite `MAP_VIEW_VALUES` and design spec (docs/design/public-investments/features/objectives-map-landing.md).
- Recommendation: Replace or wrap with the project's map stack (e.g. React-Leaflet pattern used elsewhere), wire point click → objective route or `selected` search param, and implement program/stage symbology from landing/search state.
- Residual risk: Map appears functional but is decorative; list/map sync and territorial exploration remain broken relative to spec.

### high: Search layout and map-list sync URL params are unused

- Location: `src/features/public-investments/pages/PublicInvestmentsSearchPage.tsx:37`
- Evidence: Schema supports `view` (`list|map|split`), `selected`, and rich filters (public-investments.ts:526-579). Search page always renders map + list; grep shows no `search.view` or `search.selected` usage in the feature. Design spec requires split/list/map toggle and selected-row map sync.
- Recommendation: Implement layout toggle bound to `view`, highlight/scroll list from `selected`, and update map interaction to set `selected` in URL.
- Residual risk: Shared search URLs omit behavioral state; map and list can diverge with no recovery path.

### medium: Program filter UI is single-select while schema and adapter support multi-program arrays

- Location: `src/features/public-investments/pages/PublicInvestmentsSearchPage.tsx:96`
- Evidence: Filter uses `search.programs?.[0] ?? 'all'` and writes `programs: value === 'all' ? undefined : [value]` (lines 96-102). Territory page mirrors this (PublicInvestmentsTerritoryPage.tsx:122-127). Schema/parser accept comma/JSON arrays (public-investments.test.ts:133-146, 335-343).
- Recommendation: Use multi-select chips/checkbox group, or explicitly document and enforce single-program URLs; if single-select, normalize URL on load to one canonical program.
- Residual risk: URLs with multiple programs filter correctly server-side but UI shows only the first program, causing silent filter skew.

### medium: Search facets are built from the full corpus, not the filtered result set

- Location: `src/features/public-investments/api/public-investments-api.ts:527`
- Evidence: `buildSearchFacets(publicSummaries)` runs on all objectives (line 527) while `rows`/`mapPoints` come from `filterSortPaginateObjectives`. Facets are returned but never rendered; counts would mislead if wired to UI.
- Recommendation: Compute facets from the same filtered cohort as `fullFiltered.rows`, or expose both global and filtered facet sets with clear labeling.
- Residual risk: Future facet UI will show counts inconsistent with visible results.

### medium: Blocked UI ignores adapter `messageKey` and hardcodes copy

- Location: `src/features/public-investments/components/BlockedDataState.tsx:12`
- Evidence: Component only uses `reason` via `availabilityLabel(reason)` and fixed description strings (lines 13-17). Hooks expose `blockedMessageKey` (use-public-investments-data.ts:96, 160) and API returns keys like `publicInvestments.blocked.liveNotConnected` (public-investments-api.ts:101-104), but no catalog entries exist under `src/locales` for `publicInvestments.*`.
- Recommendation: Resolve descriptions via Lingui from `blockedMessageKey` + `messageParams`; add catalog messages and run i18n extract/compile.
- Residual risk: English locale and future live-API errors show Romanian-only, env-specific guidance; adapter message contract is dead code.

### medium: Not-found blocked descriptions use wrong messageParams key for evidence

- Location: `src/features/public-investments/components/BlockedDataState.tsx:15`
- Evidence: Not-found branch interpolates `messageParams?.code` (line 16). Evidence API returns `{ sourceRowKey }` (public-investments-api.ts:668-671). Territory uses `{ code }` correctly. Component test passes `{ code: 'evidence-missing' }` (public-investments-components.test.tsx:104), masking the mismatch.
- Recommendation: Use `messageKey`-driven templates or normalize params (`code` vs `sourceRowKey`) in `BlockedDataState` or at the adapter boundary.
- Residual risk: Evidence not-found states show generic text without the missing row identifier.

### medium: Evidence drawer does not pass objective context into the evidence query

- Location: `src/features/public-investments/components/SourceProvenanceDrawer.tsx:29`
- Evidence: `useEvidenceDetail(sourceRowKey)` omits optional `objectiveId` (line 29). Layout search stores `county`, `siruta`, `from` (route.tsx:21-28, schemas/public-investments.ts:370-375) but they are not used for redaction. Redaction fallback relies on `detail.evidenceKey` matching bundle keys (public-investments-api.ts:682-691); orphan fixture `evidence-unknown-orphan` has `evidenceKey: null` (public-investments-mock-data.ts:678-682).
- Recommendation: Thread objectiveId from layout/objective route or evidence ref metadata into `useEvidenceDetail`; pass layout backtrack params when opening evidence from territory/objective pages.
- Residual risk: Future evidence rows without evidenceKey may skip client fail-safe redaction if fixtures are not pre-scrubbed.

### medium: Map points are not keyboard-accessible and do not expose actionable semantics

- Location: `src/features/public-investments/components/PublicInvestmentsMapPanel.tsx:45`
- Evidence: Points are non-focusable `<div>` elements with `aria-label` and `title` only (lines 45-56); no `role`, no `<button>`/`<a>`, no `tabIndex`, no list structure. Screen-reader users get labels but cannot activate or navigate points.
- Recommendation: Render points as links/buttons to objective detail (or a roving-tabindex list), add a text legend, and associate the section with `aria-describedby` for the footnote.
- Residual risk: WCAG 2.x operable-map requirements unmet; map remains pointer-only.

### medium: Territory program/domain breakdown rows do not apply filters

- Location: `src/features/public-investments/pages/PublicInvestmentsTerritoryPage.tsx:147`
- Evidence: Design spec (docs/design/public-investments/features/locality-county-page.md) says breakdown rows filter the list. UI renders `byProgram` rows as static display (lines 147-160) with no click handler; only sidebar program `<Select>` updates `search.programs`.
- Recommendation: Wire breakdown row clicks to `updateSearch({ programs: [...] })` / domain keys, mirroring spec behavior.
- Residual risk: Users expect drill-down filtering; only manual select works.

### medium: Major search schema filters are not exposed in the UI

- Location: `src/features/public-investments/pages/PublicInvestmentsSearchPage.tsx:73`
- Evidence: Schema supports `domains`, `stages` (multi), `amountMin/Max`, `absMin/Max`, `dataQuality`, `identity`, `hasContractorCui`, `hasDesignerCui`, `hasSiruta`, `siruta`, and `view` (public-investments.ts:493-579). UI exposes text, single county, single program, single stage, and sort only.
- Recommendation: Phase filter UI to match schema (facets-driven chips, range inputs, boolean toggles) or trim schema until implemented to avoid dead URL params.
- Residual risk: Power users can craft URLs with filters that have no visible control or feedback.

### low: Mock gating references a catalog id that is not registered

- Location: `src/features/public-investments/lib/mock-mode.ts:9`
- Evidence: `PUBLIC_INVESTMENTS_DATASET_IDS` includes `'public-investments'` (lines 9-13). `catalog.ts` registers `investments-anghel-saligny` and `investments-pndl` only; no `public-investments` dataset entry. Works only via `VITE_MOCK_DATASETS=all` or global flag.
- Recommendation: Add a umbrella `public-investments` catalog entry or drop the unused id and document the two program dataset ids as the only scoped keys.
- Residual risk: Scoped mock enablement via dataset id alone is confusing; docs may reference a non-catalog id.

### low: `getPublicInvestmentsMockStatus` never emits `mock-disabled`

- Location: `src/features/public-investments/lib/mock-mode.ts:24`
- Evidence: Return type includes `'mock-disabled'` (lines 19-22) but function only returns `'mock-enabled' | 'live-not-connected'` (lines 25-28). `DataAvailabilityStatus` includes `'mock-disabled'` (types.ts:342-346) yet API always uses `'live-not-connected'`.
- Recommendation: Either implement distinct mock-disabled signaling or remove the unused status from types/helpers.
- Residual risk: Status badges and blocked reasons cannot distinguish global mock off vs live-not-connected.

### low: Env typing covers global mock flags but not scrapper-root override used by mock-first workflow

- Location: `src/env.d.ts:24`
- Evidence: `VITE_USE_MOCK_DATA` and `VITE_MOCK_DATASETS` are declared (lines 24-25). AGENTS.md documents `VITE_SCRAPPER_REPO_ROOT`; it is absent from `ImportMetaEnv` / `ProcessEnv` in env.d.ts.
- Recommendation: Add `VITE_SCRAPPER_REPO_ROOT?: string` for parity with project mock-first docs (optional for PI runtime, but improves discoverability).
- Residual risk: Typecheck/IDE won't assist env setup for scraper-linked mock workflows.

### low: Payments tab does not handle blocked or error ledger states

- Location: `src/features/public-investments/pages/PublicInvestmentsObjectivePage.tsx:148`
- Evidence: Plăți tab renders loading and empty states (lines 149-154) but never checks `paymentsQuery.isBlocked` or `paymentsQuery.isError`. Bundle blocked state is handled at page level only.
- Recommendation: Render `BlockedDataState` / error UI inside the payments tab when the ledger query fails independently.
- Residual risk: Low today because mock gating blocks at bundle level; live adapter split endpoints could show empty tab silently.

### low: Adapter boundary co-locates live contract with direct mock fixture imports

- Location: `src/features/public-investments/api/public-investments-api.ts:48`
- Evidence: API module documents adapter swap (lines 1-15, 706-718) but imports `MOCK_*` constants throughout and embeds mock-only helpers (`getObjectivePartyContext`, `filterSortPaginateObjectives` usage). Trust/sanitize functions are in-module rather than a dedicated `live/` vs `mock/` split.
- Recommendation: Extract `public-investments-mock-adapter.ts` implementing the same exported functions; keep sanitize/filter utilities shared and mock-free for live swap.
- Residual risk: Live integration may accidentally ship mock imports or miss moving privacy/trust helpers.

### low: Page tests omit territory route, map URL wiring, and facet behavior

- Location: `src/features/public-investments/pages/public-investments-pages.test.tsx:145`
- Evidence: Tests cover landing blocked state, search form navigation, and objective privacy tab (lines 145-264). No `PublicInvestmentsTerritoryPage` tests; no landing search param tests; facets only appear as empty fixture stub (lines 86-106).
- Recommendation: Add territory page tests (program filter URL, blocked not-found), landing search consumption once wired, and adapter facet/filter consistency tests at page level.
- Residual risk: Regressions in territory/map/filter UX can ship despite strong API unit tests.

### info: Mock gating and trust boundary behave correctly when mock is enabled

- Location: `src/features/public-investments/api/public-investments-api.ts:404`
- Evidence: All entry points return `LIVE_NOT_CONNECTED_RESULT` when mock off (lines 405-407, 508-510, etc.). Suspect amounts excluded from totals/map sizing via `buildMapPoints` (lines 137-144) and `computeTrustedMoneyTotal`. Tests verify gating, redaction, excludedSuspectCount, and gated party sanitization (public-investments-api.test.ts).
- Recommendation: Preserve this discriminated-result pattern when adding live fetch; keep sanitize helpers on the adapter side.
- Residual risk: Live backend must re-implement the same trust/privacy rules server-side.

### info: Evidence deep-link via layout `dovada` search param is correctly wired

- Location: `src/routes/investitii-publice/route.tsx:17`
- Evidence: `openEvidence` sets `dovada: evidenceRef.sourceRowKey` (lines 21-28); drawer reads `search.dovada` (lines 76-78). Route test verifies navigation (-route.test.tsx:67-93). Drawer redaction test passes for gated fixture (public-investments-components.test.tsx:73-97).
- Recommendation: When adding objective-scoped redaction, extend URL state without breaking existing deep links.
- Residual risk: Deep links remain stable; privacy context enrichment is the remaining gap.

### info: URL search parsing is permissive and well-tested

- Location: `src/schemas/public-investments.ts:172`
- Evidence: Fail-soft preprocessors, enum normalization, array parsing, layout/landing/objective/territory cleaners, and `parsePublicInvestmentsSearchString` bridge are implemented with broad Vitest coverage (public-investments.test.ts).
- Recommendation: Keep schema as the single URL contract; align UI surface area to implemented params to reduce drift.
- Residual risk: Schema/UI mismatch is the primary consumer of this robust parsing layer.

